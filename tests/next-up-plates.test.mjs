/**
 * Next up — the card at the foot of every part carries the next part's plate
 *
 * Run: npm run test:next-up-plates
 *
 * The cover's chapter cards open with a picture (resource-tiles.test.mjs pins
 * that vocabulary). The "next up" card that ends every part page led to the same
 * chapters with a numeral and two lines of text. It now carries the cover's own
 * plate for the part it links to, so the picture a reader met on the cover is
 * the one that sends them on. Three things have to hold for that to stay true:
 *
 *   1. ONE SOURCE. The picture is never authored on a part page. It is written
 *      there by scripts/sync-plates.mjs from cover-docs.html, and `--check`
 *      refuses a build in which any copy differs from the cover.
 *   2. THE RIGHT CHAPTER. The slot's `data-plate` and the card's must agree with
 *      the card's href — a picture of the wrong part is worse than none.
 *   3. THE SAME LIFE. The plate draws in, lifts and moves exactly as the cover's
 *      does, because the stylesheet names the next-up card as a twin on every
 *      wash and every hover rule the cover's plates have, and the observer that
 *      sets `data-drawn` is one shared script loaded on the cover and every part.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const norm = (s) => s.replace(/\s+/g, ' ').trim();

const COVER = read('public/site-b/cover-docs.html');
const CSS = read('public/site-b/reading-system.css');
const COVER_JS = read('public/site-b/cover-docs.js');
const PLATES_JS = read('public/site-b/plates.js');
const PKG = JSON.parse(read('package.json'));

const PARTS = [
  ['part-1-foundation.html', '/part-2-lineage-macro-thesis', 2],
  ['part-2-lineage-macro.html', '/part-3-bitcoin-convexity-backbone', 3],
  ['part-3-bitcoin-convexity.html', '/part-4-tax-architecture-roc-strategy', 4],
  ['part-4-tax-architecture.html', '/part-5-portfolio-construction-position-management', 5],
  ['part-5-portfolio-construction.html', '/part-6-convexity-framework-integrity-scoring', 6],
  ['part-6-convexity-scoring.html', '/', 1],
];

const coverPlate = (n) => {
  const at = COVER.indexOf(`data-part="${n}"`);
  const start = COVER.indexOf('<svg', COVER.indexOf('<span class="dc-plate dc-art"', at));
  return COVER.slice(start, COVER.indexOf('</svg>', start) + 6);
};

// ---------------------------------------------------------------------------
// 1. One source
// ---------------------------------------------------------------------------
test('sync: the audit passes — every next-up card carries the cover’s plate for the part it leads to', () => {
  const r = spawnSync(process.execPath, ['scripts/sync-plates.mjs', '--check'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr || r.stdout);
});

test('sync: the script is in the prebuild chain, and the audit is a script of its own', () => {
  assert.match(PKG.scripts.prebuild, /npm run sync:plates/);
  assert.equal(PKG.scripts['sync:plates'], 'node scripts/sync-plates.mjs');
  assert.equal(PKG.scripts['audit:plates'], 'node scripts/sync-plates.mjs --check');
});

test('sync: the copy on each part page is the cover’s plate, byte for byte once whitespace is folded', () => {
  for (const [file, , n] of PARTS) {
    const html = read(`public/site-b/${file}`);
    const slot = html.match(/<span class="next-up-plate dc-art" aria-hidden="true" data-plate="(\d)">([\s\S]*?)<\/span>/);
    assert.ok(slot, `${file}: a plate slot`);
    assert.equal(norm(slot[2]), norm(coverPlate(n)), `${file}: the plate is the cover’s plate ${n}`);
  }
});

// ---------------------------------------------------------------------------
// 2. The right chapter
// ---------------------------------------------------------------------------
test('chapter: the card and its slot both name the part the href leads to', () => {
  for (const [file, href, n] of PARTS) {
    const html = read(`public/site-b/${file}`);
    const card = html.match(/<a class="next-up-card" href="([^"]+)" data-plate="(\d)">/);
    assert.ok(card, `${file}: the next-up card carries data-plate`);
    assert.equal(card[1], href, `${file}: leads on to ${href}`);
    assert.equal(card[2], String(n), `${file}: the card names plate ${n}`);
    assert.match(html, new RegExp(`<span class="next-up-plate dc-art" aria-hidden="true" data-plate="${n}">`), `${file}: the slot names plate ${n}`);
    // one slot per page, hidden from the accessibility tree, before the numeral
    assert.equal((html.match(/class="next-up-plate/g) || []).length, 1, `${file}: exactly one slot`);
    assert.ok(html.indexOf('class="next-up-plate') < html.indexOf('class="next-up-num"'), `${file}: the plate sits under the text, first in source`);
  }
});

test('chapter: the sync refuses a slot that disagrees with its card', () => {
  const src = read('scripts/sync-plates.mjs');
  assert.match(src, /the card says plate .* but leads to part/, 'href vs card');
  assert.match(src, /the slot says plate .* but the card says/, 'slot vs card');
  assert.match(src, /process\.exit\(1\)/, 'and fails the build');
});

// ---------------------------------------------------------------------------
// 3. The same life
// ---------------------------------------------------------------------------
test('life: one observer script, loaded on the cover and every part, and no private copy left in cover-docs.js', () => {
  assert.match(PLATES_JS, /new IntersectionObserver\(/);
  assert.match(PLATES_JS, /'IntersectionObserver' in window/, 'draws everything where the observer is missing');
  assert.match(PLATES_JS, /setAttribute\('data-drawn', 'true'\)/);
  assert.match(PLATES_JS, /io\.unobserve\(entry\.target\)/, 'fires once per picture');
  assert.doesNotMatch(COVER_JS, /function plates\(/, 'the cover has no second copy');
  assert.ok(COVER.includes('<script src="/site-b/plates.js" defer></script>'), 'cover loads it');
  assert.ok(COVER.indexOf('/site-b/plates.js') < COVER.indexOf('/site-b/cover-docs.js'), 'before the cover script');
  for (const [file] of PARTS) {
    assert.ok(read(`public/site-b/${file}`).includes('<script src="/site-b/plates.js" defer></script>'), `${file} loads it`);
  }
});

test('life: every wash and every hover move the cover’s plates have names the next-up card as a twin', () => {
  for (let n = 1; n <= 6; n++) {
    assert.match(CSS, new RegExp(`\\.dc-card\\[data-part="${n}"\\] \\.dc-plate::before, \\.next-up-plate\\[data-plate="${n}"\\]::before \\{`), `wash ${n}`);
    const coverMoves = [...CSS.matchAll(new RegExp(`a\\.dc-card\\[data-part="${n}"\\]:hover ([^,{\\n]+),`, 'g'))].map((m) => m[1].trim());
    assert.ok(coverMoves.length >= 3, `part ${n}: the one move and its company (${coverMoves.length})`);
    for (const move of coverMoves) {
      assert.ok(CSS.includes(`.next-up-card[data-plate="${n}"]:hover ${move},`), `part ${n}: ${move} moves on the next-up card`);
      assert.ok(CSS.includes(`.next-up-card[data-plate="${n}"]:focus-visible ${move}`), `part ${n}: ${move} moves for the keyboard`);
    }
  }
});

test('life: the plate rides the card’s right edge, fades under the text, and becomes the opener strip on a phone', () => {
  const rule = CSS.slice(CSS.indexOf('.next-up-plate {'), CSS.indexOf('.next-up-plate::before'));
  assert.match(rule, /position: absolute;/);
  assert.match(rule, /inset: 0 0 0 auto;/, 'right edge');
  assert.match(rule, /aspect-ratio: 480 \/ 120;/, 'the cover plate’s own proportion');
  assert.match(rule, /mask-image: linear-gradient\(to right, transparent 0%, currentColor 48%\);/, 'fades out under the text');
  assert.match(rule, /pointer-events: none;/);
  assert.match(CSS, /\.next-up-card \{ position: relative; overflow: hidden; \}/, 'the card clips it');
  assert.match(CSS, /\.next-up-num, \.next-up-body, \.next-up-arrow \{ position: relative; z-index: 1; \}/, 'the text stays above it');
  const phone = CSS.slice(CSS.indexOf('@media (max-width: 560px) {\n  .next-up-plate {'));
  assert.match(phone, /position: relative;[\s\S]*?mask-image: none;/, 'stacks as a strip, unmasked');
  assert.match(CSS, /\.next-up-card:hover \.next-up-plate, \.next-up-card:focus-visible \.next-up-plate \{ color: var\(--tile-motif-lift\); \}/, 'lifts with the card');
});
