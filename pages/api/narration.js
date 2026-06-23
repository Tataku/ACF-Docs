// AI narration (text-to-speech) — minimal standalone adapter for the promoted
// Site B docs. Ported as a thin ADAPTER from the ACF Dashboard narration engine:
// the provider, request/response shape, mp3 format, and the { fallback: 'browser' }
// error contract are preserved, but the Dashboard's tier / access-mode / no-leak
// middleware is intentionally NOT ported — this endpoint depends only on a single
// optional env var.
//
//   GET  /api/narration  -> { available, provider }   (capability check; no audio)
//   POST /api/narration  -> audio/mpeg (mp3)           (body: { text, voice? })
//
// Provider: OpenAI TTS (model `tts-1`, default voice `nova`, response_format mp3).
// Requires env OPENAI_API_KEY. With no key the route stays safe and quiet:
//   GET  reports { available: false }  (the client falls back to Web Speech)
//   POST returns 503 { fallback: 'browser' }
//
// The key never reaches the client. Reversible: delete this file to remove the
// API path entirely — the Listen control degrades to the Web Speech fallback.

const OPENAI_TTS_ENDPOINT = 'https://api.openai.com/v1/audio/speech';
const OPENAI_TTS_MODEL = 'tts-1';
const DEFAULT_VOICE = 'nova';
const ALLOWED_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
const MAX_INPUT_LENGTH = 4096; // OpenAI TTS hard limit
const TTS_TIMEOUT_MS = 30000;

// Best-effort in-memory rate limit. Serverless instances are ephemeral, so this
// only dampens a single warm instance — it is a cost guard, not a security
// boundary. Harden with a gateway / auth for high-traffic production use.
const RL_WINDOW_MS = 60000;
const RL_MAX = 20;
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RL_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear(); // crude memory ceiling
  return recent.length > RL_MAX;
}

export default async function handler(req, res) {
  const apiKey = process.env.OPENAI_API_KEY || '';

  // -------------------------------------------------------------------------
  // GET -> capability check (cheap, no audio, no provider call)
  // -------------------------------------------------------------------------
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'private, max-age=30');
    return res.status(200).json({
      available: !!apiKey,
      provider: apiKey ? 'openai' : null,
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  // -------------------------------------------------------------------------
  // POST -> generate audio
  // -------------------------------------------------------------------------
  if (!apiKey) {
    return res.status(503).json({
      error: 'PROVIDER_NOT_CONFIGURED',
      message: 'Narration is not configured',
      fallback: 'browser',
    });
  }

  const fwd = req.headers['x-forwarded-for'];
  const ip =
    (typeof fwd === 'string' && fwd.split(',')[0].trim()) ||
    (req.socket && req.socket.remoteAddress) ||
    'unknown';
  if (rateLimited(ip)) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({
      error: 'RATE_LIMITED',
      message: 'Too many narration requests',
      fallback: 'browser',
    });
  }

  const body = req.body || {};
  const text = typeof body.text === 'string' ? body.text : '';
  if (!text.trim()) {
    return res.status(400).json({ error: 'VALIDATION_FAILED', message: 'text is required' });
  }

  const input = text.slice(0, MAX_INPUT_LENGTH);
  const voice = ALLOWED_VOICES.indexOf(body.voice) >= 0 ? body.voice : DEFAULT_VOICE;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TTS_TIMEOUT_MS);

  try {
    const upstream = await fetch(OPENAI_TTS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_TTS_MODEL,
        input,
        voice,
        response_format: 'mp3',
      }),
      signal: controller.signal,
    });

    if (!upstream.ok) {
      const status = upstream.status;
      if (status === 401 || status === 403) {
        return res.status(401).json({ error: 'UPSTREAM_AUTH_FAILED', fallback: 'browser' });
      }
      if (status === 429) {
        res.setHeader('Retry-After', upstream.headers.get('retry-after') || '60');
        return res.status(429).json({ error: 'UPSTREAM_RATE_LIMITED', fallback: 'browser' });
      }
      return res.status(502).json({
        error: 'UPSTREAM_ERROR',
        message: `OpenAI TTS returned HTTP ${status}`,
        fallback: 'browser',
      });
    }

    const audioBuffer = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.byteLength);
    res.setHeader('Cache-Control', 'private, max-age=300'); // 5 min client cache
    return res.status(200).send(audioBuffer);
  } catch (err) {
    if (err && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
      return res.status(504).json({ error: 'UPSTREAM_TIMEOUT', fallback: 'browser' });
    }
    return res.status(500).json({ error: 'NARRATION_ERROR', fallback: 'browser' });
  } finally {
    clearTimeout(timer);
  }
}
