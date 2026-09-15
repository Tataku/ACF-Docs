#!/usr/bin/env node
/**
 * Narration acceptance — does a DEPLOYED site actually generate audio?
 *
 * Local tests prove the narrator says the right WORDS. They cannot prove the
 * provider is funded, the key is present, or the origin gate lets the page
 * through — and every one of those failures sounds identical to a listener:
 * the robotic browser voice, with nothing saying why.
 *
 * No dependencies, no browser. Run it against any environment:
 *
 *   node scripts/acceptance-narration.mjs https://<preview-or-prod-host>
 *
 * Exits non-zero if the premium voice cannot actually be produced.
 */
const base = (process.argv[2] || '').replace(/\/$/, '');
if (!base) { console.error('usage: node scripts/acceptance-narration.mjs <base-url>'); process.exit(2); }

const SAMPLE = 'Take the first. Investor A, 100% Bitcoin: 2.86 BTC at $35,000, a 77% drawdown. '
             + 'Now the second. Investor B, Framework: the same drawdown is roughly 8 to 10% at the portfolio level.';

let failed = false;
const ok = (m) => console.log('  PASS  ' + m);
const bad = (m) => { failed = true; console.log('  FAIL  ' + m); };

console.log(`\nNarration acceptance against ${base}\n`);

// 1) capability -------------------------------------------------------------
console.log('1. capability check  GET /api/narration');
let cap;
try {
  const r = await fetch(`${base}/api/narration`, { headers: { accept: 'application/json' } });
  cap = await r.json();
  r.ok ? ok(`HTTP ${r.status}`) : bad(`HTTP ${r.status}`);
} catch (e) { bad('unreachable: ' + e.message); }

if (cap) {
  cap.available ? ok('available: true') : bad('available: false — OPENAI_API_KEY is not set on this deployment');
  console.log(`        model=${cap.model} voice=${cap.voice} instructions=${cap.instructions}`);
  if (cap.legacyModel) bad(`model "${cap.model}" is the legacy family and ignores delivery instructions`);
  cap.configWarning ? bad('configWarning: ' + cap.configWarning) : ok('no configWarning');
}

// 2) real generation --------------------------------------------------------
console.log('\n2. generation       POST /api/narration');
try {
  const r = await fetch(`${base}/api/narration`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: base, referer: base + '/' },
    body: JSON.stringify({ text: SAMPLE })
  });
  const ct = r.headers.get('content-type') || '';
  if (r.ok && ct.includes('audio/mpeg')) {
    const bytes = (await r.arrayBuffer()).byteLength;
    ok(`HTTP ${r.status} ${ct} — ${bytes.toLocaleString()} bytes of mp3`);
    console.log(`        cache=${r.headers.get('x-narration-cache')} model=${r.headers.get('x-narration-model')}`);
    if (bytes < 2000) bad('audio is suspiciously small — check it is not an error body');
  } else {
    const body = await r.json().catch(() => ({}));
    bad(`HTTP ${r.status} ${ct}`);
    if (body.quotaExhausted) bad('OpenAI BALANCE EXHAUSTED — top up credits');
    else if (body.configRejected) bad('provider rejected the configured model/voice: ' + (body.message || ''));
    else if (body.error) bad(`${body.error}: ${body.message || ''}`);
  }
} catch (e) { bad('request failed: ' + e.message); }

console.log(failed
  ? '\nRESULT: narration CANNOT be generated on this deployment.\n'
  : '\nRESULT: narration generates successfully — the premium voice is live.\n');
process.exit(failed ? 1 : 0);
