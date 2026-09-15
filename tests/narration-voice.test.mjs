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
