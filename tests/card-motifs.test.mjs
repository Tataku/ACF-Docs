/**
 * Every definition card opens with a plate, and the plate means something
 *
 * Run: npm run test:card-motifs
 *
 * `.failure-modes` is one component used thirteen times for sixty-one cards,
 * and it holds seven different KINDS of list — a closed taxonomy, a tunable
 * envelope, an escalation ladder, a quality gauge, a failure mechanism, a
 * market state and a dollar magnitude. Before this, all sixty-one looked
 * identical, so the component said nothing about which of those a card was.
 * Each now opens with a plate in the chapter plates' own plane vocabulary.
 *
 * The risk a generated picture carries is silence: a card added tomorrow with
 * no declaration renders with no plate and looks deliberate. So the contract is
 * TOTALITY — every block has a kind, every card a figure, every figure a scene —
 * and `audit:card-motifs` enforces it on every build. These tests hold the
 * parts of that contract a --check pass cannot: that the numbers a plate draws
 * are read from the card rather than typed, that the ladder still ends where
 * the framework says it ends, that the plate never becomes content, and that
 * the gradients the plates fill from are actually defined on the pages that use
 * them.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SITE = path.join(ROOT, 'public', 'site-b');
const CSS = fs.readFileSync(path.join(SITE, 'reading-system.css'), 'utf8');
const pages = fs.readdirSync(SITE).filter((f) => f.endsWith('.html'));
const html = Object.fromEntries(pages.map((f) => [f, fs.readFileSync(path.join(SITE, f), 'utf8')]));
const withPlates = pages.filter((f) => html[f].includes('class="fm-plate dc-art"'));
const PLATE = /<span class="fm-plate dc-art" aria-hidden="true" data-kind="([a-z]+)" data-figure="([a-z]+)">(<svg[\s\S]*?<\/svg>)<\/span>/g;

/** Just the plate layer of the stylesheet. */
const MOTIF = (() => {
  const a = CSS.indexOf('Definition-card plates');
  const b = CSS.indexOf('COMPARISON MATRIX', a);
  assert.ok(a > 0 && b > a, 'the plate section is delimited');
  return CSS.slice(a, b);
})();

test('every card in the family opens with a plate, and nothing else does', () => {
  let cards = 0, plates = 0;
  for (const f of pages) {
    const blocks = [...html[f].matchAll(/<div class="failure-modes"([^>]*)>/g)];
    for (const [, attrs] of blocks) assert.match(attrs, /data-kind="[a-z]+"/, `${f}: each block declares its kind`);
    cards += (html[f].match(/<span class="name">/g) || []).filter((_, i, all) => all).length;
    plates += [...html[f].matchAll(PLATE)].length;
  }
  // 61 is the family today. The audit enforces totality; this pins the count so
  // a card that silently drops out of the family is noticed.
  assert.equal(plates, 61, `61 plates expected, found ${plates}`);
  assert.ok(cards >= plates, 'every plate belongs to a named card');
  for (const f of pages) {
    // A plate is the FIRST child of its card, before the name — it opens the card.
    for (const m of html[f].matchAll(/<div><span class="fm-plate dc-art"[^>]*>[\s\S]*?<\/span>\s*<span class="name">/g)) plates -= 1;
  }
  assert.equal(plates, 0, 'every plate sits directly before its card\'s name');
});

test('the gradients the plates fill from are defined on every page that uses them', () => {
  // `.dc-art .art-field { fill: url(#dc-g-accent-down) }` resolves against the
  // current document. The cover carried the defs; the part pages did not, so a
  // field there filled with nothing. Each page with a plate must carry them once.
  for (const f of withPlates) {
    const defs = (html[f].match(/class="dc-art-defs"/g) || []).length;
    assert.equal(defs, 1, `${f}: the art defs are present exactly once (found ${defs})`);
    for (const id of ['dc-g-accent-down', 'dc-g-accent-up', 'dc-g-ink-right', 'dc-p-dots']) {
      assert.ok(html[f].includes(`id="${id}"`), `${f}: defines #${id}`);
    }
  }
});

test('the numbers a plate draws are read from the card, never typed into it', () => {
  // The posture-rail rule: a number drawn is a number stated. The TAM bars are
  // the ~$NT in each card's own name, drawn against each other at one scale.
  const page = html['part-3-bitcoin-convexity.html'];
  const block = /<div class="failure-modes" data-kind="magnitude">([\s\S]*?)\n\s*<\/div>/.exec(page);
  assert.ok(block, 'the magnitude block is present');
  const cards = [...block[1].matchAll(/data-figure="share">(<svg[\s\S]*?<\/svg>)<\/span>\s*<span class="name">([^<]*)/g)];
  assert.equal(cards.length, 4, 'four magnitude cards');
  const printed = cards.map(([, , name]) => Number(/~?\$(\d+(?:\.\d+)?)\s*T/i.exec(name.replace(/&[a-z]+;/g, '·'))[1]));
  const max = Math.max(...printed);
  cards.forEach(([, svg, name], i) => {
    // The lit bar's height is this card's figure over the block's largest, on a 60px scale.
    const lit = /class="art-step art-step-final[^"]*" x="[\d.]+" y="([\d.]+)" width="[\d.]+" height="([\d.]+)"/.exec(svg);
    assert.ok(lit, `${name.trim()}: has a lit bar`);
    const expected = Math.max(6, (printed[i] / max) * 60);
    assert.ok(Math.abs(Number(lit[2]) - expected) < 0.01, `${name.trim()}: bar ${lit[2]} is its own printed ${printed[i]}T over ${max}T`);
    // …and every other card's figure is drawn beside it, so the bars are comparable.
    assert.equal((svg.match(/class="art-step[ "]/g) || []).length, 4, `${name.trim()}: draws all four components`);
  });
});

test('the escalation ladder ends where the framework says it ends', () => {
  // Governance rises Trigger → Event → Recommendation → Proposal →
  // Acknowledgement and then stops: automated mutation does not exist in this
  // system. The last card draws a BROKEN rung and no lit stroke — that is the
  // block's whole argument. A solid sixth rung would contradict the sentence.
  const page = html['framework-in-math.html'];
  const block = /<div class="failure-modes" data-kind="ladder">([\s\S]*?)\n\s*<\/div>/.exec(page);
  assert.ok(block, 'the ladder block is present');
  const figs = [...block[1].matchAll(/data-figure="([a-z]+)">(<svg[\s\S]*?<\/svg>)/g)];
  assert.deepEqual(figs.map((m) => m[1]), ['rung', 'rung', 'rung', 'rung', 'rung', 'absent']);
  const last = figs[5][2];
  assert.doesNotMatch(last, /art-thesis/, 'the absent rung has no lit stroke');
  assert.doesNotMatch(last, /art-dot/, 'and no terminal dot — nothing arrives there');
  assert.match(last, /art-ghost/, 'it is drawn as a ghost');
  assert.match(block[1].slice(block[1].indexOf('data-figure="absent"')), /does not exist/i, 'and it is the card that says so');
  // The five lit rungs climb: each rung's y is above the previous one's.
  const ys = figs.slice(0, 5).map((m) => Number(/art-thesis[^>]*d="M120 ([\d.]+)H360"/.exec(m[2])[1]));
  for (let i = 1; i < ys.length; i += 1) assert.ok(ys[i] < ys[i - 1], `rung ${i + 1} sits above rung ${i}`);
});

test('the plate is decoration: it adds no text and no reading time', () => {
  // sync-counts.mjs derives each page's reading time from every word in <main>.
  // A plate that emitted a character would be counted as one, and the posture
  // rails record exactly that failure — so a plate carries no <text> at all.
  for (const f of withPlates) {
    for (const [, kind, figure, svg] of html[f].matchAll(PLATE)) {
      assert.doesNotMatch(svg, /<text\b/, `${f}: ${kind}/${figure} draws no text`);
      assert.match(svg, /aria-hidden="true"/, 'and is hidden from assistive technology');
    }
  }
});

test('every figure the markup asks for is a scene the stylesheet can draw', () => {
  // The plates use the chapter plates' classes; a class the CSS does not define
  // renders as nothing, silently. Every art-* class in any plate must have a rule.
  const used = new Set();
  for (const f of withPlates) for (const [, , , svg] of html[f].matchAll(PLATE)) {
    for (const cls of svg.matchAll(/class="([^"]+)"/g)) for (const c of cls[1].split(/\s+/)) if (c.startsWith('art-')) used.add(c);
  }
  const animation = new Set(['art-in', 'art-draw', 'art-move', 'art-pop', 'art-grow', 'art-grow-y', 'art-grow-x', 'art-d0', 'art-d1', 'art-d2', 'art-d3']);
  const undefinedClasses = [...used].filter((c) => !animation.has(c) && !new RegExp(`\\.dc-art \\.${c}\\b`).test(CSS) && !new RegExp(`\\.${c}\\b`).test(CSS));
  assert.deepEqual(undefinedClasses, [], 'plate classes with no stylesheet rule');
  assert.ok(used.size >= 20, `a real vocabulary is in use (${used.size} classes)`);
});

test('both themes and the phone keep the plate', () => {
  // Colour comes through the tile tokens, so light/dark is the token's problem,
  // not a second palette that can fall out of step.
  assert.match(MOTIF, /color:\s*var\(--tile-motif\)/, 'the plate draws in --tile-motif');
  assert.doesNotMatch(MOTIF, /#[0-9a-fA-F]{3,6}\b/, 'no raw hex in the plate layer');
  // Bleeds to the card's own padding, so the picture reads as a plate, not a thumbnail.
  assert.match(MOTIF, /margin: calc\(-1 \* var\(--space-5\)\) calc\(-1 \* var\(--space-6\)\)/, 'bleeds to the card edge');
  const narrow = MOTIF.slice(MOTIF.indexOf('@media (max-width: 680px)'));
  assert.match(narrow, /\.fm-plate \{ width: calc\(100% \+ 2 \* var\(--space-5\)\)/, 'and follows the phone padding');
  assert.doesNotMatch(narrow, /display:\s*none/, 'never switched off — a card that loses its plate loses what said what kind it was');
});
