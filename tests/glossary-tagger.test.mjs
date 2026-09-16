/**
 * The glossary tagger does the structural work once
 *
 * Run: npm run test:glossary-tagger
 *
 * The tagger places one highlight per glossary term on its first eligible
 * occurrence. It used to do that by building a fresh TreeWalker for every one
 * of the 109 terms and re-asking the DOM the same structural questions about
 * the same text nodes each time: three `closest()` calls and a
 * `querySelectorAll('.gloss')` per node, per term.
 *
 * Measured in Chromium at 4x CPU throttle, before:
 *
 *   route              walkers   node visits   tags placed   tagger ms
 *   /glossary              109       314,901             0        1060
 *   /framework-in-math     109       110,353            44        1166
 *   part 5                 101        83,982            59         546
 *   part 6                 100        65,012            45         506
 *
 * The glossary page is the shape of the problem: a third of a million
 * eligibility questions to place no tags at all. And because the tagger runs
 * before the reading runtime is even requested, that time is spent in front of
 * the theme toggle, the scroll spy, the tooltips and the narration dock.
 *
 * WHAT CHANGED IS THE AMOUNT OF WORK, NOT THE ANSWER. The structure does not
 * move while tagging: a text node's ancestors, its block, and the glossary
 * entry it sits inside are fixed. Only the block's tag count changes, and by
 * exactly one each time. So the structural questions are asked once, in one
 * pass, and every term then scans a plain array in the same document order the
 * walker produced. Every rule is still applied, in the same sequence, to the
 * same nodes.
 *
 * The behavioural proof is not in this file, because it needs a browser: a
 * fingerprint of all 302 tags across all 11 routes — term id, wrapped words,
 * DOM path and containing block — is captured before and after and compared
 * exactly. This file pins the shape that makes the speed-up real, so it cannot
 * quietly regress to a walker per term.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'public/site-b/reading.js'), 'utf8');
// Comments name the old shape on purpose; assertions read the code.
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, ' ').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

test('the DOM is walked once for the whole run, not once per term', () => {
  const walkers = [...CODE.matchAll(/createTreeWalker\(/g)];
  assert.equal(walkers.length, 1, `expected a single TreeWalker construction, found ${walkers.length}`);
  const collect = CODE.slice(CODE.indexOf('function collectCandidates('), CODE.indexOf('function termCandidates('));
  assert.match(collect, /createTreeWalker\(/, 'and it belongs to the collection pass');
  const wrap = CODE.slice(CODE.indexOf('function wrapFirstGlossaryOccurrence('));
  assert.doesNotMatch(wrap.slice(0, wrap.indexOf('\n  }')), /createTreeWalker|closest\(/,
    'the per-term pass asks the DOM nothing structural; that was the cost');
});

test('the structural questions are asked once, from named selectors', () => {
  // One definition per rule, used by the collection pass. Previously these were
  // inline string literals re-parsed on every call.
  for (const name of ['SKIP_SEL', 'FURNITURE_SEL', 'PROSE_SEL', 'BLOCK_SEL']) {
    assert.match(CODE, new RegExp('var ' + name + ' ='), `${name} is named once`);
  }
  const describe = CODE.slice(CODE.indexOf('function describe('), CODE.indexOf('function collectCandidates('));
  assert.match(describe, /closest\(SKIP_SEL\)/, 'controls, code and chrome are still excluded');
  assert.match(describe, /closest\(FURNITURE_SEL\)/, 'titles and labels are still furniture');
  assert.match(describe, /closest\(PROSE_SEL\)/, 'and only running prose is eligible');
  assert.match(describe, /closest\(BLOCK_SEL\) \|\| parent/, 'the block is resolved the same way');
  assert.match(describe, /closest\('\[id\^="g-"\]'\)/, 'and the owning glossary entry is resolved once, not per term');
});

test('every semantic rule survives, in the per-term pass', () => {
  const wrap = CODE.slice(CODE.indexOf('function wrapFirstGlossaryOccurrence('), CODE.indexOf('function wrapAt('));
  assert.match(wrap, /densityOf\(counts, cand\.block\) >= MAX_GLOSS_PER_BLOCK/, 'the density guard still applies');
  assert.match(wrap, /cand\.ownId === ownWanted/, 'a term still never links to itself');
  assert.match(wrap, /inSenseFor && !inSenseFor\(cand\)/, 'the sense guard still applies');
  assert.match(wrap, /pattern\.exec\(value\)/, 'the same boundary-anchored alternation decides the match');
  assert.match(wrap, /return true;/, 'and it still stops at the FIRST occurrence');
  // Candidate order is the walker's order, so "first" means the same thing.
  assert.match(wrap, /for \(var i = 0; i < cands\.length; i \+= 1\)/, 'scanned in document order');
});

test('the density count is seeded from the DOM and then maintained, not re-queried', () => {
  const dens = CODE.slice(CODE.indexOf('function densityOf('), CODE.indexOf('function senseTester('));
  assert.match(dens, /querySelectorAll\('\.gloss'\)\.length/, 'seeded from the real count, so hand-authored tags still count');
  assert.match(dens, /counts\.has\(block\)/, 'and only once per block');
  const at = CODE.slice(CODE.indexOf('function wrapAt('));
  assert.match(at.slice(0, 1400), /var seeded = densityOf\(counts, cand\.block\);/, 'seeded BEFORE the DOM changes');
  assert.match(at.slice(0, 1400), /counts\.set\(cand\.block, seeded \+ 1\)/, 'a wrap moves the count by exactly one');
});

test('a wrapped node gives its place back to the two halves it leaves behind', () => {
  // A fresh walker would have found them on the next term's pass, so the array
  // has to contain them or a later term could not match the remaining text.
  const at = CODE.slice(CODE.indexOf('function wrapAt('));
  assert.match(at.slice(0, 1600), /cands\.splice\.apply\(cands, \[idx, 1\]\.concat\(repl\)\)/, 'spliced in at the same position');
  assert.match(at.slice(0, 1600), /if \(before\.nodeValue\.trim\(\)\) repl\.push/, 'blank halves are dropped, as the walker dropped them');
  assert.match(at.slice(0, 1600), /if \(after\.nodeValue\.trim\(\)\) repl\.push/);
});

test('the reading runtime is fetched alongside the glossary, not behind the tagging', () => {
  // The core script used to be requested only after the walk finished, so every
  // millisecond of tagging was a millisecond before the theme toggle, the
  // scroll spy, the tooltips and the narration dock existed. Preloading does
  // not change the execution order — the tagger must still run first, or the
  // core's static trigger list would miss every auto-tagged term.
  assert.match(CODE, /function preloadCore\(\)/, 'the core is preloaded');
  assert.match(CODE, /rel = 'preload'[\s\S]{0,120}as = 'script'/, 'as a script, so the bytes are warm');
  const boot = CODE.slice(CODE.indexOf('preloadCore();'));
  assert.match(boot, /preloadCore\(\);[\s\S]{0,200}Promise\.all\(\[getJson\(REGISTRY_URL\)/,
    'started before the JSON round trip, so the two overlap');
  assert.match(CODE, /wireGlossaryTerms\(\);[\s\S]{0,80}return loadCore\(\);/,
    'and execution order is unchanged: tag first, then run the core');
});
