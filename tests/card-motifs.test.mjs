/**
 * Every definition card draws a figure, and the figure means something
 *
 * Run: npm run test:card-motifs
 *
 * `.failure-modes` is one component used thirteen times for sixty-one cards,
 * and it holds seven different KINDS of list — a closed taxonomy, a tunable
 * envelope, an escalation ladder, a quality gauge, a failure mechanism, a
 * market state and a dollar magnitude. Before this, all sixty-one looked
 * identical, so the component said nothing about which of those a card was.
 *
 * The risk a motif system carries is silence: a card added tomorrow with no
 * declaration renders with no figure and looks deliberate. So the contract is
 * TOTALITY — every block has a kind, every card has a motif, every motif is in
 * its kind's vocabulary — and `audit:card-motifs` enforces it on every build.
 * These tests hold the parts of that contract a --check pass cannot: that the
 * stylesheet can actually draw what the markup asks for, that the derived
 * numbers are derived and not typed, and that the figure never becomes content.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SITE = path.join(ROOT, 'public', 'site-b');
const CSS = fs.readFileSync(path.join(SITE, 'reading-system.css'), 'utf8');
/** Just the motif layer. Slicing to end-of-file picks up the posture rails and
 *  the chart palette, which have their own contracts and their own exceptions. */
const MOTIF = (() => {
  const a = CSS.indexOf('Definition-card motifs');
  const b = CSS.indexOf('COMPARISON MATRIX', a);
  assert.ok(a > 0 && b > a, 'the motif section is delimited');
  return CSS.slice(a, b);
})();
const pages = fs.readdirSync(SITE).filter((f) => f.endsWith('.html'));
const html = Object.fromEntries(pages.map((f) => [f, fs.readFileSync(path.join(SITE, f), 'utf8')]));
const all = Object.values(html).join('\n');

test('every card in the family carries a motif', () => {
  // A card without one renders blank and reads as intentional — the failure
  // this whole system is built to make impossible.
  const blocks = [...all.matchAll(/<div class="failure-modes"([^>]*)>([\s\S]*?)\n\s*<\/div>/g)];
  assert.ok(blocks.length > 0, 'the family still exists');
  for (const [, attrs] of blocks) {
    assert.match(attrs, /data-kind="[a-z]+"/, 'each block declares its kind');
  }
  const cards = [...all.matchAll(/<div data-figure="([a-z]+)"/g)].map((m) => m[1]);
  assert.equal(cards.length, 61, `expected 61 motif-bearing cards, found ${cards.length}`);
});

test('the stylesheet can draw every motif the markup asks for', () => {
  // The one way this silently half-ships: markup declares a motif the CSS has
  // no rule for, so that card alone renders an empty spine.
  const asked = [...new Set([...all.matchAll(/data-figure="([a-z]+)"/g)].map((m) => m[1]))].sort();
  assert.ok(asked.length >= 20, `expected a real vocabulary, saw ${asked.length}`);
  // Either the motif has its own rule, or its KIND draws it and the motif only
  // re-weights that drawing. Anything else renders an empty spine.
  const byKind = new Set(['fixed', 'tunable', 'derived', 'illustrative', 'excluded', 'rung',
    'concentrated', 'spread', 'clustered', 'converged', 'diverged']);
  const undrawn = asked.filter((m) => !MOTIF.includes(`[data-figure="${m}"]::after`) && !byKind.has(m));
  assert.deepEqual(undrawn, [], 'motifs the stylesheet cannot draw');
  // The kind-drawn ones still need their kind rule present.
  for (const k of ['taxonomy', 'ladder']) {
    assert.ok(MOTIF.includes(`[data-kind="${k}"] > div::after`), `${k} has a kind-level drawing`);
  }
});

test('the numbers a motif draws are read from the card, never typed into it', () => {
  // The posture-rail rule: a number drawn is a number stated. The TAM bars are
  // the ~$NT in each card's own name; if they were authored they would drift
  // from the text under them the first time a component is re-estimated.
  const page = html['part-3-bitcoin-convexity.html'];
  const block = /<div class="failure-modes" data-kind="magnitude">([\s\S]*?)\n\s*<\/div>/.exec(page);
  assert.ok(block, 'the magnitude block is present');
  const pairs = [...block[1].matchAll(/--m:(\d+(?:\.\d+)?)[^>]*>\s*<span class="name">([^<]*)/g)];
  assert.equal(pairs.length, 4, 'four magnitude cards');
  for (const [, m, name] of pairs) {
    const printed = /~?\$(\d+(?:\.\d+)?)\s*T/i.exec(name.replace(/&[a-z]+;/g, '·'));
    assert.ok(printed, `${name} prints a $NT figure`);
    assert.equal(Number(m), Number(printed[1]), `the bar for "${name.trim()}" is its own printed figure`);
  }
  // And the scale is a fixed unit, not a share of the card: cards differ in
  // height, so a percentage would draw $3T taller in a long card than a short one.
  assert.match(CSS, /calc\(var\(--m\) \* 6px\)/, 'magnitude uses a fixed per-trillion unit');
  assert.doesNotMatch(CSS, /var\(--m\) \* 100% \/ 12/, 'and not a share of the card height');
});

test('the escalation ladder ends where the framework says it ends', () => {
  // Governance rises Trigger → Event → Recommendation → Proposal →
  // Acknowledgement and then stops: automated mutation does not exist in this
  // system. The last card draws a BROKEN rung, and that is the block's whole
  // argument. A solid sixth rung would contradict the sentence beside it.
  const page = html['framework-in-math.html'];
  const block = /<div class="failure-modes" data-kind="ladder">([\s\S]*?)\n\s*<\/div>/.exec(page);
  assert.ok(block, 'the ladder block is present');
  const motifs = [...block[1].matchAll(/data-figure="([a-z]+)"/g)].map((m) => m[1]);
  assert.deepEqual(motifs, ['rung', 'rung', 'rung', 'rung', 'rung', 'absent']);
  const last = /data-figure="absent"[\s\S]{0,400}?<\/div>/.exec(block[1])[0];
  assert.match(last, /does not exist/i, 'and the absent rung is the card that says so');
  assert.match(CSS, /\[data-figure="absent"\]::after[\s\S]{0,300}dashed/, 'drawn dashed, not solid');
});

test('the figure is decoration: it adds no text and no reading time', () => {
  // sync-counts.mjs derives each page's reading time from its words. A motif
  // that emitted a character would be counted as one, and the posture rails
  // record that exact failure. Everything here is drawn from CSS backgrounds.
  const contentDecls = [...MOTIF.matchAll(/content:\s*'([^']*)'/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(contentDecls)], [''], 'every ::before/::after content is empty');
  // And no card gained an element — the figure is the two pseudo-elements the
  // card already had, so the markup gained one attribute and nothing else.
  assert.doesNotMatch(all, /<span class="fm-/, 'no motif elements were added to the markup');
});

test('both themes and the phone keep the figure', () => {
  const motifRules = MOTIF;
  // Colour comes through a token, so light/dark is the token's problem, not a
  // second palette that can fall out of step.
  assert.match(motifRules, /color:\s*var\(--accent\)/, 'the spine takes its colour from --accent');
  assert.doesNotMatch(motifRules, /#[0-9a-fA-F]{3,6}\b/, 'no raw hex in the motif layer');
  // A card that loses its figure on a phone loses the one thing that said what
  // kind it was, so the narrow rule narrows the spine rather than removing it.
  const narrow = motifRules.slice(motifRules.indexOf('@media (max-width: 680px)'));
  assert.match(narrow, /\[data-figure\]::after \{ left: \d+px; width: \d+px; \}/, 'the spine narrows, not disappears');
  assert.doesNotMatch(narrow, /display:\s*none/, 'and is never switched off');
});
