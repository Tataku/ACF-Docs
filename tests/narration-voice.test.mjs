/**
 * Narration Voice — docs-site guardrail
 *
 * Run: npm run test:narration
 *
 * The docs narrator has one failure mode that matters, and it is silent: the
 * Listen button keeps working, the label still reads "Listen", and the reader
 * hears the browser's robotic Web Speech voice instead of the premium one. Every
 * cause — key removed, model or voice mistyped, origin gate refusing, one slow
 * capability probe — arrives looking identical.
 *
 * These assertions pin the properties that keep that from being silent, and keep
 * this adapter's voice identical to the ACFDashboard one.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const API = read('pages/api/narration.js');
const CLIENT = read('public/site-b/reading-core.js');

// ---------------------------------------------------------------------------
// Cross-repo pin. These three values also live in ACFDashboard
// `api/lib/narrationVoice.js`. They MUST agree — otherwise the docs site and
// the app narrate in different voices, which is the drift that put the app on
// legacy `tts-1` while the improved engine lived only here. Change both or
// neither; this test is the tripwire.
// ---------------------------------------------------------------------------
const CANONICAL_MODEL = 'gpt-4o-mini-tts';
const CANONICAL_VOICE = 'nova';

test('defaults to the current-generation model, never the legacy tts-1 family', () => {
  assert.match(API, new RegExp(`NARRATION_TTS_MODEL \\|\\| '${CANONICAL_MODEL}'`));
  assert.match(API, new RegExp(`NARRATION_TTS_VOICE \\|\\| '${CANONICAL_VOICE}'`));
});

test('sends the delivery steer, and withholds it from models that ignore it', () => {
  assert.match(API, /payload\.instructions = instructions/);
  assert.match(API, /supportsInstructions = \(model\) => !\/\^tts-1\/i\.test/);
});

test('the capability answer carries the resolved voice config', () => {
  // Without this, a caller can only see "narration is available" and still hear
  // the robotic voice, with nothing naming the misconfiguration.
  assert.match(API, /function describeVoice\(\)/);
  assert.match(API, /\.\.\.\(apiKey \? describeVoice\(\) : /);
  assert.match(API, /configWarning/);
});

test('one voice-resolution path — a mistyped env voice is never forwarded', () => {
  assert.match(API, /function resolveVoice\(requested\)/);
  assert.match(API, /const voice = resolveVoice\(body\.voice\)/);
  // the old unchecked form must not come back
  assert.doesNotMatch(API, /ALLOWED_VOICES\.indexOf\(body\.voice\) >= 0 \? body\.voice : DEFAULT_VOICE/);
});

test('a rejected model/voice and a refused origin are reported as config failures', () => {
  assert.match(API, /status === 400 \|\| status === 404/);
  assert.match(API, /UPSTREAM_CONFIG_REJECTED/);
  // both config failures must be marked so the client stops retrying them
  const configRejectedSites = API.match(/configRejected: true/g) || [];
  assert.ok(configRejectedSites.length >= 2, 'origin refusal and provider rejection both set configRejected');
});

test('client: a capability verdict reached without a server answer is not remembered', () => {
  assert.match(CLIENT, /method = null; capabilityPromise = null;/);
  assert.match(CLIENT, /capability-degraded/);
});

test('client: a config rejection is definitive, not retried as a blip', () => {
  assert.match(CLIENT, /err\.configRejected === true/);
  assert.match(CLIENT, /ORIGIN_NOT_ALLOWED/);
});

test('client: every drop to the browser voice is recorded and reported once', () => {
  assert.match(CLIENT, /function setVoiceKind\(kind, reason\)/);
  assert.match(CLIENT, /data-narration-voice/);
  assert.match(CLIENT, /setVoiceKind\('premium'\)/);
  const drops = CLIENT.match(/setVoiceKind\('browser'/g) || [];
  assert.ok(drops.length >= 3, `every fallback path reports itself (found ${drops.length})`);
});
