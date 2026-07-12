// AI narration (text-to-speech) — minimal standalone adapter for the promoted
// Site B docs. Ported as a thin ADAPTER from the ACF Dashboard narration engine:
// the provider, request/response shape, mp3 format, and the { fallback: 'browser' }
// error contract are preserved, but the Dashboard's tier / access-mode / no-leak
// middleware is intentionally NOT ported — this endpoint depends only on a single
// optional env var.
//
//   GET  /api/narration  -> { available, provider, model, voice }  (capability; no audio)
//   POST /api/narration  -> audio/mpeg (mp3)                        (body: { text, voice? })
//
// Provider: OpenAI TTS. Default model is `gpt-4o-mini-tts` — OpenAI's newest and
// most natural (human-sounding) speech model, which uniquely honours an
// `instructions` steer to shape delivery. The legacy `tts-1` family sounded
// robotic and ignores `instructions`; we no longer default to it. Model, voice,
// and the delivery instructions are all env-overridable so ops can retune (or
// adopt a still-newer model) with zero code change.
//
// Requires env OPENAI_API_KEY. With no key the route stays safe and quiet:
//   GET  reports { available: false }  (the client falls back to Web Speech)
//   POST returns 503 { fallback: 'browser' }
//
// The key never reaches the client. Reversible: delete this file to remove the
// API path entirely — the Listen control degrades to the Web Speech fallback.

const OPENAI_TTS_ENDPOINT = 'https://api.openai.com/v1/audio/speech';
// Newest, most human OpenAI speech model (gpt-4o-mini-tts, 2025). Overridable so
// ops can bump to a still-newer model without touching code.
const OPENAI_TTS_MODEL = process.env.NARRATION_TTS_MODEL || 'gpt-4o-mini-tts';
const DEFAULT_VOICE = process.env.NARRATION_TTS_VOICE || 'nova';
// gpt-4o-mini-tts voice set (superset of the legacy six). Any of these may be
// requested per-call via body.voice; unknown values fall back to DEFAULT_VOICE.
const ALLOWED_VOICES = [
  'alloy', 'ash', 'ballad', 'coral', 'echo', 'fable',
  'onyx', 'nova', 'sage', 'shimmer', 'verse', 'marin', 'cedar',
];
// Delivery steering — how to say it, not just what to say. Honoured by gpt-4o
// speech models; silently ignored by (and so withheld from) the legacy tts-1
// family. This is where the "human, not robotic" quality comes from.
const DEFAULT_INSTRUCTIONS =
  process.env.NARRATION_TTS_INSTRUCTIONS ||
  'Read as a calm, warm, and authoritative narrator for a serious long-form ' +
  'investing framework. Measured, articulate pace with natural sentence rhythm; ' +
  'clear enunciation; subtle emphasis on key terms; confident but unhurried, ' +
  'and never robotic, breathless, or sing-song.';
// Instructions are a gpt-4o-era feature: send them for anything that is not the
// known-legacy tts-1 family (forward-compatible with future gpt models).
const supportsInstructions = (model) => !/^tts-1/i.test(model || '');
const MAX_INPUT_LENGTH = 4096; // OpenAI TTS hard limit
const TTS_TIMEOUT_MS = 45000;  // gpt-4o-mini-tts can take a beat longer than tts-1

// Best-effort in-memory rate limit. Serverless instances are ephemeral, so this
// only dampens a single warm instance — it is a cost guard, not a security
// boundary. Harden with a gateway / auth for high-traffic production use.
// Cache hits (below) do NOT count against this, so warmed readers are never
// throttled — the limit only bounds genuine, key-spending generations.
const RL_WINDOW_MS = 60000;
const RL_MAX = 30;
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RL_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear(); // crude memory ceiling
  return recent.length > RL_MAX;
}

// Warm-instance audio cache (MRU-ordered, bounded). Every reader hears the SAME
// segments, so caching generated mp3 by (model|voice|instructions|text) turns
// most repeat requests into instant, zero-cost hits and sharply cuts provider
// spend. Ephemeral per serverless instance — a real CDN / object store would
// share it across instances, but even per-instance this removes the dominant
// duplicate-generation cost for a docs site.
const AUDIO_CACHE_MAX = 256;
const audioCache = new Map(); // key -> Buffer
function djb2(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
function cacheKey(model, voice, instructions, text) {
  return model + '|' + voice + '|' + djb2(instructions || '') + '|' + text.length + ':' + djb2(text);
}
function cacheGet(key) {
  if (!audioCache.has(key)) return null;
  const buf = audioCache.get(key);
  audioCache.delete(key);
  audioCache.set(key, buf); // re-insert as most-recently-used
  return buf;
}
function cacheSet(key, buf) {
  audioCache.set(key, buf);
  while (audioCache.size > AUDIO_CACHE_MAX) {
    audioCache.delete(audioCache.keys().next().value); // evict least-recently-used
  }
}

// Same-origin gate (POST only). The funded key must not be drivable by arbitrary
// cross-site or scripted callers, so a generation request is accepted only when it
// looks like it came from one of our own pages: the request's Origin/Referer host
// must equal the host the request arrived on (zero-config, works on every domain /
// preview URL), or match NARRATION_ALLOWED_ORIGINS (comma-separated hosts/origins,
// for when the docs and the API live on different domains). Browsers always send
// Origin on POST; we fall back to Referer. This is not unspoofable, but it blocks
// the realistic abuse vectors — other sites' JS and header-less scripts — and any
// mis-fire degrades gracefully (the client falls back to the browser voice).
function hostOf(value) {
  try {
    return new URL(value).host;
  } catch (e) {
    return '';
  }
}
function requestAllowed(req) {
  const callerHost =
    hostOf(req.headers['origin'] || '') ||
    hostOf(req.headers['referer'] || req.headers['referrer'] || '');
  if (!callerHost) return false; // no browser Origin/Referer -> not a page request

  const selfHost = req.headers['x-forwarded-host'] || req.headers['host'] || '';
  if (selfHost && callerHost === selfHost) return true; // same-origin

  return (process.env.NARRATION_ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .some((allowed) => callerHost === (hostOf(allowed) || allowed));
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
      model: apiKey ? OPENAI_TTS_MODEL : null,
      voice: apiKey ? DEFAULT_VOICE : null,
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  // -------------------------------------------------------------------------
  // POST -> generate audio
  // -------------------------------------------------------------------------
  // Reject anything that doesn't look like a request from our own pages before
  // spending a provider call. fallback:'browser' keeps a rare mis-fire graceful.
  if (!requestAllowed(req)) {
    return res.status(403).json({ error: 'ORIGIN_NOT_ALLOWED', fallback: 'browser' });
  }

  if (!apiKey) {
    return res.status(503).json({
      error: 'PROVIDER_NOT_CONFIGURED',
      message: 'Narration is not configured',
      fallback: 'browser',
    });
  }

  // Parse + validate the request up front so a cache hit can be served without
  // touching the rate limiter or the funded provider at all.
  const body = req.body || {};
  const text = typeof body.text === 'string' ? body.text : '';
  if (!text.trim()) {
    return res.status(400).json({ error: 'VALIDATION_FAILED', message: 'text is required' });
  }

  const input = text.slice(0, MAX_INPUT_LENGTH);
  const voice = ALLOWED_VOICES.indexOf(body.voice) >= 0 ? body.voice : DEFAULT_VOICE;
  const instructions = supportsInstructions(OPENAI_TTS_MODEL) ? DEFAULT_INSTRUCTIONS : '';
  const ckey = cacheKey(OPENAI_TTS_MODEL, voice, instructions, input);

  // Cache hit → instant, free, identical audio. Served before the rate limiter,
  // so a warmed reader is never throttled.
  const hit = cacheGet(ckey);
  if (hit) {
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', hit.byteLength);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('X-Narration-Cache', 'hit');
    res.setHeader('X-Narration-Model', OPENAI_TTS_MODEL);
    return res.status(200).send(hit);
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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TTS_TIMEOUT_MS);

  try {
    const payload = {
      model: OPENAI_TTS_MODEL,
      input,
      voice,
      response_format: 'mp3',
    };
    if (instructions) payload.instructions = instructions; // steer delivery (gpt-4o family)

    const upstream = await fetch(OPENAI_TTS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
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
    cacheSet(ckey, audioBuffer);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.byteLength);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('X-Narration-Cache', 'miss');
    res.setHeader('X-Narration-Model', OPENAI_TTS_MODEL);
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
