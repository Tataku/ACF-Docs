/**
 * /api/narration behaviour, with the provider and the store stubbed.
 *
 * Run: node --test tests/narration-route.test.mjs
 *
 * Pins: the default model and voice; the retry on the floating alias when the
 * pinned snapshot is refused; that the persistent store is consulted before
 * any generation and written after one; and that the store key is the content
 * (model, voice, instructions, text), so an unchanged segment is reused after
 * a docs edit and a changed one is not.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const calls = [];
const store = new Map();          // url -> Buffer, standing in for Vercel Blob
const MP3 = Buffer.from('ID3fake-mp3');

function stubFetch(models) {
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    if (u.startsWith('https://api.openai.com/')) {
      const body = JSON.parse(init.body);
      calls.push({ model: body.model, voice: body.voice, instructions: !!body.instructions });
      const status = models[body.model] ?? 200;
      if (status !== 200) return new Response(JSON.stringify({ error: { code: 'model_not_found' } }), { status });
      return new Response(MP3, { status: 200, headers: { 'content-type': 'audio/mpeg' } });
    }
    if (store.has(u)) return new Response(store.get(u), { status: 200 });
    return new Response('not found', { status: 404 });
  };
}

function mockRes() {
  const res = { statusCode: 0, headers: {}, body: null };
  res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v; };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  res.send = (b) => { res.body = b; return res; };
  return res;
}
const req = (text, extra = {}) => ({
  method: 'POST',
  headers: { origin: 'https://docs.example.com', host: 'docs.example.com' },
  body: { text, ...extra },
  socket: { remoteAddress: '127.0.0.1' },
});

process.env.OPENAI_API_KEY = 'test-key';
delete process.env.NARRATION_TTS_MODEL;
delete process.env.NARRATION_TTS_VOICE;
delete process.env.BLOB_READ_WRITE_TOKEN;
const { default: handler, config } = await import('../pages/api/narration.js');

test('defaults: the December 2025 snapshot, the onyx voice, 60s duration', async () => {
  assert.deepEqual(config, { maxDuration: 60 });
  const res = mockRes();
  await handler({ method: 'GET', headers: {} }, res);
  assert.equal(res.body.model, 'gpt-4o-mini-tts-2025-12-15');
  assert.equal(res.body.voice, 'onyx');
  assert.equal(res.body.configWarning, null);
});

test('a refused snapshot retries once on the floating alias, and the reader still gets audio', async () => {
  calls.length = 0;
  stubFetch({ 'gpt-4o-mini-tts-2025-12-15': 400 });
  const res = mockRes();
  await handler(req('A sentence the snapshot refuses.'), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['x-narration-model'], 'gpt-4o-mini-tts');
  assert.deepEqual(calls.map((c) => c.model), ['gpt-4o-mini-tts-2025-12-15', 'gpt-4o-mini-tts']);
  assert.ok(calls.every((c) => c.voice === 'onyx' && c.instructions));
});

test('a voice-level rejection on both models is reported as configuration, not retried forever', async () => {
  calls.length = 0;
  stubFetch({ 'gpt-4o-mini-tts-2025-12-15': 400, 'gpt-4o-mini-tts': 400 });
  const res = mockRes();
  await handler(req('Another refused sentence.'), res);
  assert.equal(res.statusCode, 502);
  assert.equal(res.body.error, 'UPSTREAM_CONFIG_REJECTED');
  assert.equal(calls.length, 2);
});

test('the same segment twice is generated once (memory cache)', async () => {
  calls.length = 0;
  stubFetch({});
  await handler(req('Cached sentence.'), mockRes());
  const res = mockRes();
  await handler(req('Cached sentence.'), res);
  assert.equal(res.headers['x-narration-cache'], 'hit');
  assert.equal(calls.length, 1);
});

test('store: a stored segment is served without generating; a new one is generated and stored', async () => {
  const { _setBlobStoreForTests } = await import('../pages/api/narration.js');
  const blobs = new Map();       // pathname -> url
  _setBlobStoreForTests({
    head: async (p) => { if (!blobs.has(p)) throw Object.assign(new Error('not found'), { name: 'BlobNotFoundError' }); return { url: blobs.get(p) }; },
    put: async (p, buf) => { const url = 'https://blob.test/' + p; blobs.set(p, url); store.set(url, buf); return { url }; },
  });
  calls.length = 0;
  stubFetch({});
  const first = mockRes();
  await handler(req('A paragraph from Part 3, first deploy.'), first);
  assert.equal(first.headers['x-narration-cache'], 'miss');
  assert.equal(blobs.size, 1, 'the generated audio was stored');
  assert.equal(calls.length, 1);

  const [[pathname]] = [...blobs];
  assert.match(pathname, /^narration\/v1\/gpt-4o-mini-tts-2025-12-15\/onyx\/[0-9a-f]{64}\.mp3$/);

  // A segment another instance already generated: in the store, not in this
  // instance's memory. It must be served with no provider call at all.
  const { segmentStorePath } = await import('../pages/api/narration.js');
  const text = 'A paragraph stored by an earlier deploy.';
  const p = await segmentStorePath(text);
  blobs.set(p, 'https://blob.test/' + p); store.set('https://blob.test/' + p, MP3);
  calls.length = 0;
  const hitRes = mockRes();
  await handler(req(text), hitRes);
  assert.equal(hitRes.headers['x-narration-cache'], 'store');
  assert.equal(calls.length, 0, 'served from the store without generating');
  _setBlobStoreForTests(null);
});

test('store keys follow the content: unchanged text reuses audio, an edit does not', async () => {
  const { storePath } = await import('../pages/api/narration.js');
  const m = 'gpt-4o-mini-tts-2025-12-15'; const ins = 'calm';
  const a = await storePath(m, 'cedar', ins, 'The thesis holds.');
  assert.equal(await storePath(m, 'cedar', ins, 'The thesis holds.'), a, 'same words, same audio');
  assert.notEqual(await storePath(m, 'cedar', ins, 'The thesis holds!'), a, 'an edited sentence regenerates');
  assert.notEqual(await storePath(m, 'onyx', ins, 'The thesis holds.'), a, 'a voice change regenerates');
  assert.notEqual(await storePath('gpt-4o-mini-tts', 'cedar', ins, 'The thesis holds.'), a, 'a model change regenerates');
  assert.notEqual(await storePath(m, 'cedar', 'warm', 'The thesis holds.'), a, 'a delivery change regenerates');
});
