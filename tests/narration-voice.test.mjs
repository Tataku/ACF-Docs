/**
 * Narration Voice — docs-site guardrail
 *
 * Run: npm run test:narration
 *
 * The docs narrator has one failure mode that matters, and it is silent: the
 * Listen button keeps working, its label does not change, and the reader
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
// The MODEL is the one deliberate difference: the docs pin the dated snapshot
// (stored audio must not change voice underneath readers) and fall back to the
// dashboard's floating alias if it is ever refused. Voice and delivery match.
const CANONICAL_MODEL = 'gpt-4o-mini-tts';               // the dashboard's floating alias
const DOCS_MODEL = 'gpt-4o-mini-tts-2025-12-15';         // the docs' pinned snapshot of it
const CANONICAL_VOICE = 'cedar';
const CANONICAL_INSTRUCTIONS =
  'Delivery: calm, low-key authority, like an experienced portfolio manager ' +
  'briefing a capable peer. Plain, precise and understated. Measured, unhurried ' +
  'pace with natural sentence rhythm. Clear enunciation of numbers, tickers and ' +
  'dates; light emphasis on key terms. Never hyped, salesy, breathless, ' +
  'theatrical or robotic.';

test('defaults to the current-generation model, never the legacy tts-1 family', () => {
  assert.match(API, new RegExp(`NARRATION_TTS_MODEL \\|\\| '${DOCS_MODEL}'`));
  assert.match(API, new RegExp(`FALLBACK_TTS_MODEL = '${CANONICAL_MODEL}'`));
  assert.ok(DOCS_MODEL.startsWith(CANONICAL_MODEL + '-'), 'the pin is a snapshot OF the shared model');
  assert.match(API, new RegExp(`NARRATION_TTS_VOICE \\|\\| '${CANONICAL_VOICE}'`));
});

test('delivery instructions are the shared ones, and read as description, not speech', () => {
  const decl = API.slice(API.indexOf('const DEFAULT_INSTRUCTIONS'));
  const quoted = [...decl.slice(0, decl.indexOf("';\n") + 2).matchAll(/'([^']*)'/g)].map((m) => m[1]).join('');
  assert.equal(quoted, CANONICAL_INSTRUCTIONS);
  assert.doesNotMatch(CANONICAL_INSTRUCTIONS, /\b(you|your|I|we)\b/i, 'no sentence addressed to anyone that could be spoken aloud');
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

test('client: the browser voice is never used (owner ruling 2026-10-07)', () => {
  // "i NEVER want it to default to the robotic sounding male voice." The old
  // contract reported each drop to Web Speech; the new one has no drop at all.
  assert.doesNotMatch(CLIENT, /speechSynthesis|SpeechSynthesisUtterance/, 'a Web Speech path is back');
  assert.doesNotMatch(CLIENT, /setVoiceKind\('browser'/, 'a fallback to the browser voice is back');
  assert.match(CLIENT, /setVoiceKind\('premium'\)/);
});

test('client: a failed segment stops on Retry and resumes where it failed', () => {
  assert.match(CLIENT, /resumeAt = i;/);
  assert.match(CLIENT, /s === 'error' \? 'Retry'/);
  assert.match(CLIENT, /var from = resumeAt; resumeAt = 0; playApi\(from, myRun\)/);
});

test('client: first audio comes fast, and a slow start is waited for, not replaced', () => {
  const caps = CLIENT.match(/var SEG_CAPS = \[(\d+)/);
  assert.ok(caps && Number(caps[1]) <= 400, 'the first segment stays short so it generates in seconds');
  const dl = CLIENT.match(/var FIRST_AUDIO_DEADLINE_MS = (\d+);/);
  assert.ok(dl && Number(dl[1]) >= 30000, 'the deadline is a ceiling for a stuck request, not a race');
});

test('a segment always fits inside one generation budget', () => {
  // Measured on production 2026-10-07: ~40s for ~3000 characters, and a
  // 3500-character segment timed out on every try, so it could never be heard.
  const max = Number((CLIENT.match(/var API_MAX = (\d+);/) || [])[1]);
  assert.ok(max > 0 && max <= 2000, `API_MAX ${max} must stay <= 2000`);
  const caps = (CLIENT.match(/var SEG_CAPS = \[([^\]]+)\]/) || [, ''])[1].split(',').map(Number);
  assert.ok(caps.length && caps.every((c) => c <= max), 'no ramp step above the ceiling');
  const timeout = Number((API.match(/const TTS_TIMEOUT_MS = (\d+);/) || [])[1]);
  assert.ok(timeout > 45000 && timeout < 60000, 'the provider timeout sits inside the 60s function limit');
});

test('server: the function may run long enough for a full segment', () => {
  // A platform default of 10-15s cut long generations off with Vercel's own 504.
  assert.match(API, /export const config = \{ maxDuration: 60 \};/);
});

test('an exhausted balance is told apart from a throughput rate limit', () => {
  // Both are HTTP 429. Only one of them is a human going to the billing page.
  assert.match(API, /function isQuotaExhausted\(upstreamError\)/);
  assert.match(API, /insufficient_quota/);
  assert.match(API, /UPSTREAM_QUOTA_EXHAUSTED/);
});

test('client: a quota failure skips the retries but is NOT treated as definitive', () => {
  // Reads backwards on purpose. Retrying an empty balance cannot help, so the
  // backoff is skipped — but a top-up restores the premium voice with no
  // reload, so capability must stay re-probable. Making it definitive would
  // leave a reader on the robotic voice after the problem was already fixed.
  assert.match(CLIENT, /var noRetry = definitive \|\| \(err && err\.quotaExhausted === true\)/);
  assert.doesNotMatch(
    CLIENT,
    /var definitive = err && \([^)]*quotaExhausted/s,
  );
});

test('client: the fallback names an empty balance as the reason', () => {
  assert.match(CLIENT, /balance exhausted/);
});

// ---------------------------------------------------------------------------
// Narration COVERAGE and HUMANISATION
//
// The failure these pin is silent by construction: text that is never spoken
// looks identical on the page to text that is. The old extractor was three
// selectors and read 55% of the book — every bullet list, every numbered
// requirement, every pull quote and BOTH cards of every side-by-side example
// were dropped, so a listener heard the analysis of two investors without ever
// being told who they were.
// ---------------------------------------------------------------------------

test('the rule table is the single source of truth, and the audit derives from it', () => {
  assert.match(CLIENT, /var NARRATION_BLOCKS = \[/);
  assert.match(CLIENT, /var NARRATION_MUTE = /);
  const audit = read('scripts/audit-narration-coverage.mjs');
  // The audit must PARSE the rules, never restate them — a second copy is a
  // second thing to rot, and a guard that declares its own coverage set can be
  // narrowed without anything going red.
  assert.match(audit, /block\('NARRATION_BLOCKS'\)/);
  assert.match(audit, /block\('NARRATION_MUTE'\)/);
  assert.doesNotMatch(audit, /sel:\s*'(p|li|aside\.callout)'/);
});

test('every structural block the book actually uses has a rule', () => {
  for (const sel of ['figure.exhibit', '.failure-modes', 'aside.callout',
                     'ol.architecture-list', 'blockquote.pull-quote',
                     '.posture-hero', '.compare table', 'li']) {
    assert.ok(CLIENT.includes(`sel: '${sel}'`), `no narration rule for ${sel}`);
  }
});

test('muted blocks are a decision with a reason, not an accident', () => {
  // A glyph legend ("✓ satisfies (1 pt)"), the site chrome, and the nav rail
  // are unlistenable; they are excluded explicitly rather than missed.
  for (const sel of ['.compare-key', '.sidebar-nav', '.site-footer']) {
    assert.ok(CLIENT.includes(sel), `${sel} should be muted explicitly`);
  }
});

test('side-by-side examples glide between the cards instead of colliding', () => {
  // The owner's report: "cannot be read verbatim to glide into the examples and
  // swap from A to B". Two cards get an explicit hand-off.
  assert.match(CLIENT, /Take the first\./);
  assert.match(CLIENT, /Now the second\./);
  assert.match(CLIENT, /And finally\./);
});

test('a numbered rail becomes ordinals, not silence', () => {
  assert.match(CLIENT, /ORDINALS = \['first', 'second', 'third'/);
  assert.match(CLIENT, /kind === 'steps'/);
});

test('a bold lead-in becomes a label, not a false sentence break', () => {
  // "Accumulate only. Bitcoin is never sold" reads as two unrelated statements.
  assert.match(CLIENT, /function labelled\(el, leadSel\)/);
  assert.match(CLIENT, /head \+ ' \u2014 ' \+ tail/);   // joined by an em dash, not a full stop
});

test('a comparison table is summarised, never read cell by cell', () => {
  assert.match(CLIENT, /kind === 'table'/);
  assert.match(CLIENT, /tfoot tr/);
  assert.match(CLIENT, /The full comparison is in the table on the page\./);
});

test("an author-written aria-label wins over reconstructed markup", () => {
  // .posture-hero carries a hand-written spoken form ("three to fifteen percent
  // per position"); the markup underneath is "<em>3–15%</em>per position".
  assert.match(CLIENT, /kind === 'aria'/);
  assert.match(CLIENT, /getAttribute\('aria-label'\)/);
});

test('spoken-form normalisation covers the tokens this book actually contains', () => {
  assert.match(CLIENT, /·/);                 // "Investor A · 100% Bitcoin" → comma
  assert.match(CLIENT, /' to '|'\$1 to \$2'/);     // en-dash ranges
  assert.match(CLIENT, /approximately /);          // "~3.26 BTC"
  assert.match(CLIENT, /out of/);                  // 10/10 scores
});

test('the narration script is inspectable without listening to the whole page', () => {
  assert.match(CLIENT, /script:\s*function \(\) \{ return buildBlocks\(\)\.slice\(\); \}/);
});

// ---------------------------------------------------------------------------
// Spoken acronyms — resolved from the glossary, never guessed
// ---------------------------------------------------------------------------

const GLOSSARY = JSON.parse(read('public/site-b/acf-glossary.json'));
const GLOSS_ENTRIES = Array.isArray(GLOSSARY) ? GLOSSARY : (GLOSSARY.terms || []);
/** Every all-caps short form the glossary defines, with its canonical term. */
function glossaryAcronyms() {
  const out = new Map();
  for (const e of GLOSS_ENTRIES) {
    const names = [e.term, ...(e.aliases || [])].filter(Boolean);
    const acro = names.find(n => /^[A-Z]{2,5}s?$/.test(n.trim()));
    if (!acro) continue;
    const full = names.find(n => n !== acro && /[a-z]/.test(n)) || (e.definition || '').split(':')[0];
    out.set(acro.trim().replace(/s$/, ''), (full || '').trim());
  }
  return out;
}

test('every acronym the glossary defines has a spoken form', () => {
  // The guard derives its coverage from the glossary rather than restating a
  // list, so a term added to the book with no narration rule shows up here.
  const missing = [];
  for (const [acro] of glossaryAcronyms()) {
    const handled = CLIENT.includes('\\b' + acro + '\\b') ||
                    CLIENT.includes('\\b' + acro + 's\\b');
    if (!handled) missing.push(acro);
  }
  assert.deepEqual(missing, [], `glossary acronyms with no spoken form: ${missing.join(', ')}`);
});

test('the spoken form matches what the glossary says the acronym MEANS', () => {
  // "R O C" for a term the glossary defines as "Return of capital" was a guess,
  // and a wrong one. These pin the meaning, not just the presence of a rule.
  const g = glossaryAcronyms();
  assert.match(g.get('ROC') || '', /return of capital/i);
  assert.match(g.get('FIS') || '', /Framework Integrity Score/i);
  assert.match(CLIENT, /say: 'return of capital'/);
  assert.match(CLIENT, /first: 'Framework Integrity Score, or F I S'/);
  assert.match(CLIENT, /say: 'total addressable market'/);
  assert.match(CLIENT, /say: 'dollar-cost averaging'/);
});

test('no acronym in the EXPAND class is left as bare letters', () => {
  for (const bad of ["'R O C'", "'T A M'", "'D C A'"]) {
    assert.ok(!CLIENT.includes(bad), `${bad} should be spoken as words, not letters`);
  }
});

test('terms of art are introduced once, then shortened', () => {
  assert.match(CLIENT, /var acronymSeen = null;/);
  assert.match(CLIENT, /acronymSeen\[a\.say\] = 1;/);
  assert.match(CLIENT, /acronymSeen = \{\};/);          // reset per page build
  assert.match(CLIENT, /a\.first \+ \(\/\^\\s\+\[A-Za-z\]\/\.test\(after\) \? ',' : ''\)/);
});

test("the book's own prose outranks the synthetic introduction", () => {
  // Part 6 spells out "Convexity Integrity Score" in its own text before any
  // "CIS" appears; saying it again a sentence later is the repetition this pass
  // exists to remove.
  assert.match(CLIENT, /full: \/\\bConvexity Integrity Score\\b\//);
  assert.match(CLIENT, /if \(acronymSeen && a\.full && a\.full\.test\(t\)\) acronymSeen\[a\.say\] = 1;/);
});

test('pull quotes carry no synthetic lead-in', () => {
  // Seven identical frames in a continuous listen is the robotic tell. Each
  // quote is a self-standing declarative and none repeats body text.
  assert.ok(!CLIENT.includes('Put plainly'), 'the fixed quote frame should be gone');
  assert.match(CLIENT, /kind === 'quote'/);
  assert.match(CLIENT, /return sentence\(raw\(el\)\);/);
});

test('no blanket lowercase rule can damage a proper noun', () => {
  // Deliberately NOT implemented: capitalisation does not change TTS
  // pronunciation, and the obvious heuristic would lowercase "Bitcoin".
  assert.ok(!/toLowerCase\(\)/.test(CLIENT.split('function labelled')[1]?.slice(0, 400) || ''),
    'labelled() must not lowercase the tail');
});

test('conversational glue is reserved for a genuine two-card comparison', () => {
  // `.failure-modes` carries 2 to 10 cards. Applying an A/B hand-off down a
  // ten-item risk register produced "And finally." six times in one segment —
  // the same robotic repetition the pull-quote frame was removed for.
  assert.match(CLIENT, /var pair = cards\.length === 2;/);
  assert.match(CLIENT, /lead = pair \? GLIDE2\[i\] \+ ' ' : '';/);
  assert.ok(!CLIENT.includes("'After that.'"), 'the N>2 glide ladder should be gone');
});

test('chart UI affordances never reach the narrator', () => {
  // The chart islands render a "↳ Concept" jump chip with inline styles and no
  // class, so the glyph itself is the only reliable handle.
  assert.match(CLIENT, /var UI_GLYPH = /);
  assert.match(CLIENT, /UI_GLYPH\.test\(n\.textContent \|\| ''\)/);
  assert.match(CLIENT, /u21b3\/g, ' '\)/);   // belt and braces: never spoken even if it slips through
});
