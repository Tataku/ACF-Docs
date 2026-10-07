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
//   GET  reports { available: false }  (the client shows narration unavailable)
//   POST returns 503 { fallback: 'browser' }  (field kept for the shared error
//        contract; the docs client no longer plays any browser voice)
//
// The key never reaches the client. Reversible: delete this file to remove the
// API path entirely — the Listen control degrades to the Web Speech fallback.

// Vercel cuts a function off at the project's default duration (as little as
// 10-15s on older project settings), which a 2000-3000-character generation
// can exceed. The platform then returns its own 504 before TTS_TIMEOUT_MS
// below ever fires, and the reader's segment fails. Declared here so it does
// not depend on a dashboard setting. 60s is within every plan's ceiling.
export const config = { maxDuration: 60 };

// Overridable only so the route can be exercised end-to-end against a stub
// (scripts/warm-narration.mjs was verified that way) or sent through a proxy.
const OPENAI_TTS_ENDPOINT = process.env.NARRATION_TTS_ENDPOINT || 'https://api.openai.com/v1/audio/speech';
// The dated December 2025 snapshot, OpenAI's newest speech model at the time
// of writing (reported ~35% lower word error rate than the original release).
// Pinned rather than the floating alias so the voice does not change under the
// stored audio without a deliberate edit. Overridable by env.
const OPENAI_TTS_MODEL = process.env.NARRATION_TTS_MODEL || 'gpt-4o-mini-tts-2025-12-15';
// If the provider refuses the configured model (a retired snapshot, a typo),
// generation retries once on the floating alias instead of failing every
// segment. The reader keeps the AI voice; X-Narration-Model says which ran.
const FALLBACK_TTS_MODEL = 'gpt-4o-mini-tts';
// cedar: male, and with marin the voice OpenAI recommends for best quality.
// Chosen for the readership (owner, 2026-10-07): a calm, intelligent male
// narrator for self-directed investors. Overridable by env.
const DEFAULT_VOICE = process.env.NARRATION_TTS_VOICE || 'cedar';
// gpt-4o-mini-tts voice set (superset of the legacy six). Any of these may be
// requested per-call via body.voice; unknown values resolve via resolveVoice().
const ALLOWED_VOICES = [
  'alloy', 'ash', 'ballad', 'coral', 'echo', 'fable',
  'onyx', 'nova', 'sage', 'shimmer', 'verse', 'marin', 'cedar',
];
// Delivery steering — how to say it, not just what to say. Honoured by gpt-4o
// speech models; silently ignored by (and so withheld from) the legacy tts-1
// family. This is where the "human, not robotic" quality comes from.
// Kept to a DESCRIPTION of delivery, in fragments, never a sentence the
// narrator could say: the provider has a known failure mode where instruction
// prose leaks into the audio. Mirrors DEFAULT_NARRATION_INSTRUCTIONS in
// ACFDashboard api/lib/narrationVoice.js; the two must stay identical.
const DEFAULT_INSTRUCTIONS =
  process.env.NARRATION_TTS_INSTRUCTIONS ||
  'Delivery: calm, low-key authority, like an experienced portfolio manager ' +
  'briefing a capable peer. Plain, precise and understated. Measured, unhurried ' +
  'pace with natural sentence rhythm. Clear enunciation of numbers, tickers and ' +
  'dates; light emphasis on key terms. Never hyped, salesy, breathless, ' +
  'theatrical or robotic.';
// Instructions are a gpt-4o-era feature: send them for anything that is not the
// known-legacy tts-1 family (forward-compatible with future gpt models).
const supportsInstructions = (model) => !/^tts-1/i.test(model || '');
const MAX_INPUT_LENGTH = 4096; // OpenAI TTS hard limit
// Inside the 60s function limit (config.maxDuration) with room to answer. The
// client caps segments at 2000 characters so a generation fits; see API_MAX
// in reading-core.js for the measurement behind both numbers.
const TTS_TIMEOUT_MS = 55000;

// The ONE place a voice name is resolved, for both the capability answer and the
// generation call. It must be one path: a mistyped NARRATION_TTS_VOICE used to
// flow straight through to the provider, which rejected every request, and the
// reader simply heard the browser voice from then on.
function resolveVoice(requested) {
  if (requested && ALLOWED_VOICES.indexOf(requested) >= 0) return requested;
  if (ALLOWED_VOICES.indexOf(DEFAULT_VOICE) >= 0) return DEFAULT_VOICE;
  return 'cedar'; // env holds a voice the provider does not know — do not forward it
}

// Describe the RESOLVED voice configuration. Returned with every capability
// check and with every config rejection, because the failure this endpoint
// actually suffers in the field is silent: the key is fine, the route is up,
// `available` says true, and every generation is rejected for a model or voice
// ops mistyped — which reaches the reader as "the robotic voice is back" with
// nothing anywhere saying why. Contains no secrets.
//
// Mirrors `api/lib/narrationVoice.js` in the ACFDashboard repo — the two must
// agree, or the docs and the app narrate in different voices.
// An exhausted balance and a throughput limit are both HTTP 429, and they need
// opposite handling: a throughput limit clears by waiting, an empty balance does
// not ("retrying a billing, spending, or quota error does not restore access").
// It is still NOT definitive — a top-up restores it with no deploy and no
// reload — so the client must stop RETRYING it without giving up on the voice.
function isQuotaExhausted(upstreamError) {
  if (!upstreamError) return false;
  return upstreamError.type === 'insufficient_quota' || upstreamError.code === 'insufficient_quota';
}

function describeVoice() {
  const model = OPENAI_TTS_MODEL;
  const configuredVoice = process.env.NARRATION_TTS_VOICE || '';
  const legacyModel = !supportsInstructions(model);
  const voice = resolveVoice();

  let configWarning = null;
  if (configuredVoice && ALLOWED_VOICES.indexOf(configuredVoice) < 0) {
    configWarning = 'NARRATION_TTS_VOICE="' + configuredVoice + '" is not a known voice; using "' + voice + '"';
  } else if (legacyModel) {
    configWarning = 'NARRATION_TTS_MODEL="' + model + '" is a legacy model that ignores delivery instructions';
  }

  return {
    model, voice, instructions: !legacyModel, legacyModel, configWarning,
    fallbackModel: FALLBACK_TTS_MODEL,
    store: process.env.BLOB_READ_WRITE_TOKEN ? 'blob' : 'memory',
  };
}

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

// Persistent audio store (Vercel Blob), content-addressed. The key is a SHA-256
// of everything that shapes the audio: model, voice, delivery instructions and
// the exact text of the segment. Consequences, all intended:
//   - an edit to the docs changes only the edited segments' keys, so only
//     those are regenerated; every unchanged segment is served from the store;
//   - a model, voice or instructions change re-keys everything, so old audio
//     can never play under a new configuration;
//   - nothing has to be invalidated by hand, ever.
// Active only when BLOB_READ_WRITE_TOKEN is set (a Vercel Blob store connected
// to the project). Without it the route behaves exactly as before: generate,
// with the per-instance memory cache above.
let blobApi = null;
async function blobStore() {
  if (blobApi) return blobApi;
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  blobApi = await import('@vercel/blob');
  return blobApi;
}
// Test seam: tests/narration-route.test.mjs substitutes an in-memory store.
export function _setBlobStoreForTests(api) { blobApi = api; }
async function sha256(str) {
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(str).digest('hex');
}
export async function storePath(model, voice, instructions, text) {
  return 'narration/v1/' + model + '/' + voice + '/' +
    (await sha256(model + '\u0000' + voice + '\u0000' + (instructions || '') + '\u0000' + text)) + '.mp3';
}
// The store path a segment is served from under the CURRENT configuration.
// Exported so tests and tooling compute keys exactly as the route does.
export async function segmentStorePath(text, requestedVoice) {
  const voice = resolveVoice(requestedVoice);
  const instructions = supportsInstructions(OPENAI_TTS_MODEL) ? DEFAULT_INSTRUCTIONS : '';
  return storePath(OPENAI_TTS_MODEL, voice, instructions, String(text).slice(0, MAX_INPUT_LENGTH));
}
async function storeGet(pathname) {
  const blob = await blobStore();
  if (!blob) return null;
  try {
    const meta = await blob.head(pathname);
    const r = await fetch(meta.url);
    if (!r.ok) return null;
    return Buffer.from(await r.arrayBuffer());
  } catch (e) {
    return null; // not stored yet (BlobNotFoundError) or the store is unreachable: generate
  }
}
async function storePut(pathname, buf) {
  const blob = await blobStore();
  if (!blob) return;
  try {
    await blob.put(pathname, buf, {
      access: 'public',
      contentType: 'audio/mpeg',
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 31536000,
    });
  } catch (e) {
    // A failed write costs a regeneration next time, never this reader's audio.
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
      ...(apiKey ? describeVoice() : { model: null, voice: null }),
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
    return res.status(403).json({
      error: 'ORIGIN_NOT_ALLOWED',
      message: 'Narration requests are only accepted from this site\'s own pages',
      configRejected: true,
      fallback: 'browser',
    });
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
  const voice = resolveVoice(body.voice);
  const instructions = supportsInstructions(OPENAI_TTS_MODEL) ? DEFAULT_INSTRUCTIONS : '';
  const ckey = cacheKey(OPENAI_TTS_MODEL, voice, instructions, input);

  // Cache hit → instant, free, identical audio. Served before the rate limiter,
  // so a warmed reader is never throttled.
  const hit = cacheGet(ckey);
  if (hit) return sendAudio(res, hit, 'hit', OPENAI_TTS_MODEL);

  // Persistent store: every segment any reader has ever heard, under its
  // content key. Served before the rate limiter, like the memory cache.
  const primaryPath = await storePath(OPENAI_TTS_MODEL, voice, instructions, input);
  const stored = await storeGet(primaryPath);
  if (stored) {
    cacheSet(ckey, stored);
    return sendAudio(res, stored, 'store', OPENAI_TTS_MODEL);
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
    let model = OPENAI_TTS_MODEL;
    let upstream = await callProvider(apiKey, model, voice, instructions, input, controller.signal);

    // The configured model refused (400/404): retry once on the floating alias,
    // checking the store first, so a retired snapshot never silences the voice.
    if ((upstream.status === 400 || upstream.status === 404) && model !== FALLBACK_TTS_MODEL) {
      model = FALLBACK_TTS_MODEL;
      const fbInstructions = supportsInstructions(model) ? DEFAULT_INSTRUCTIONS : '';
      const fbStored = await storeGet(await storePath(model, voice, fbInstructions, input));
      if (fbStored) {
        cacheSet(ckey, fbStored);
        return sendAudio(res, fbStored, 'store', model);
      }
      upstream = await callProvider(apiKey, model, voice, fbInstructions, input, controller.signal);
    }

    if (!upstream.ok) {
      const status = upstream.status;
      if (status === 401 || status === 403) {
        return res.status(401).json({ error: 'UPSTREAM_AUTH_FAILED', fallback: 'browser' });
      }
      if (status === 429) {
        let upstreamError = null;
        try { upstreamError = (await upstream.json()).error || null; } catch (e) {}
        const quotaExhausted = isQuotaExhausted(upstreamError);
        res.setHeader('Retry-After', upstream.headers.get('retry-after') || '60');
        return res.status(429).json({
          error: quotaExhausted ? 'UPSTREAM_QUOTA_EXHAUSTED' : 'UPSTREAM_RATE_LIMITED',
          message: quotaExhausted
            ? 'OpenAI balance exhausted — check billing and credits'
            : 'OpenAI TTS rate limited',
          quotaExhausted,
          fallback: 'browser',
        });
      }
      if (status === 400 || status === 404) {
        // Fails identically on every retry — a deployment misconfiguration,
        // not a transient blip. Naming it here is what stops it presenting as
        // an unexplained silence.
        return res.status(502).json({
          error: 'UPSTREAM_CONFIG_REJECTED',
          message: `OpenAI TTS rejected the configured model/voice (HTTP ${status})`,
          configRejected: true,
          voiceConfig: describeVoice(),
          fallback: 'browser',
        });
      }
      return res.status(502).json({
        error: 'UPSTREAM_ERROR',
        message: `OpenAI TTS returned HTTP ${status}`,
        fallback: 'browser',
      });
    }

    const audioBuffer = Buffer.from(await upstream.arrayBuffer());
    cacheSet(ckey, audioBuffer);
    const usedInstructions = supportsInstructions(model) ? DEFAULT_INSTRUCTIONS : '';
    await storePut(await storePath(model, voice, usedInstructions, input), audioBuffer);
    return sendAudio(res, audioBuffer, 'miss', model);
  } catch (err) {
    if (err && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
      return res.status(504).json({ error: 'UPSTREAM_TIMEOUT', fallback: 'browser' });
    }
    return res.status(500).json({ error: 'NARRATION_ERROR', fallback: 'browser' });
  } finally {
    clearTimeout(timer);
  }
}

function callProvider(apiKey, model, voice, instructions, input, signal) {
  const payload = { model, input, voice, response_format: 'mp3' };
  if (instructions) payload.instructions = instructions; // steer delivery (gpt-4o family)
  return fetch(OPENAI_TTS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
    signal,
  });
}

function sendAudio(res, buf, source, model) {
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Content-Length', buf.byteLength);
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.setHeader('X-Narration-Cache', source);   // hit (memory) | store (Blob) | miss (generated)
  res.setHeader('X-Narration-Model', model);
  return res.status(200).send(buf);
}
