/**
 * Cover resource tiles — four destinations, four drawings, one accent
 *
 * Run: npm run test:resource-tiles
 *
 * The Resources row shipped as five identical boxes: same fill, same hairline,
 * same silhouette, so nothing on a card said whether it led to a chart gallery
 * or a dictionary. Three changes, and the reasons they have to hold:
 *
 *   1. Five tiles became four. "Part 1 in Pictures" was a subset of "The
 *      Framework in Pictures", which now covers every part — two entries to the
 *      same idea, the narrower one listed first. The page itself still exists
 *      and is still linked from the gallery it belongs to, so removing the tile
 *      orphaned nothing.
 *   2. The Pictures tile stopped quoting an exhibit count. It leads to the whole
 *      gallery; a number on it only ages. sync-counts.mjs lost that rule in the
 *      same edit — a rule with no marker to match reports drift forever.
 *   3. Each tile gained a faded line drawing and a gradient whose GEOMETRY says
 *      which tile it is. Hue deliberately does not vary: tokens.css keeps one
 *      chromatic line for the whole document, so four coloured cards would break
 *      the system they sit in. That constraint is the interesting one to pin,
 *      because "give each card its own colour" is the obvious next edit.
 *
 * Rendered geometry (drawing size, text never crossing it, the hover moves, the
 * reduced-motion kill) was measured in Chromium at 390 and 1440, both themes.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const COVER = read('public/site-b/cover-docs.html');
const CSS = read('public/site-b/reading-system.css');
const TOKENS = read('public/site-b/tokens.css');
const SYNC = read('scripts/sync-counts.mjs');

const SECTION = COVER.slice(
  COVER.indexOf('<section class="dc-resources"'),
  COVER.indexOf('</section>', COVER.indexOf('<section class="dc-resources"')),
);
const tiles = [...SECTION.matchAll(/<a class="dc-tile" href="([^"]+)" data-motif="([^"]+)"/g)]
  .map((m) => ({ href: m[1], motif: m[2] }));

// ---------------------------------------------------------------------------
// 1. What the row offers
// ---------------------------------------------------------------------------
test('tiles: four destinations, each declaring which drawing it carries', () => {
  assert.equal(tiles.length, 4, `tiles: ${JSON.stringify(tiles)}`);
  assert.equal((SECTION.match(/class="dc-tile"/g) || []).length, 4, 'no tile without a motif');
  assert.equal(new Set(tiles.map((t) => t.motif)).size, 4, 'no two tiles share a drawing');
});

test('tiles: the Part 1 subset is gone, the framework-wide gallery is not', () => {
  assert.doesNotMatch(SECTION, /part-1-pictures/, 'the narrower duplicate is not offered here');
  assert.ok(tiles.some((t) => t.href === '/framework-in-pictures'), 'the gallery that superseded it is');
  // It was removed as a DUPLICATE, not retired: the page is still reachable from
  // the gallery page, which is what makes dropping the tile safe.
  assert.match(read('scripts/build-pictures-page.mjs'), /href="\/part-1-pictures"/,
    'the page is still linked from the gallery it belongs to');
});

test('tiles: no tile quotes a count, and no rule still hunts for one', () => {
  // Both counts went, one owner request at a time: the exhibit count first, the
  // term count after. Each tile leads to the whole of its thing, so a number on
  // it only ages.
  assert.doesNotMatch(SECTION, /\d+ exhibits/, 'no exhibit count on the cover tiles');
  assert.doesNotMatch(SECTION, /\d+ terms/, 'and no term count');
  // The paired half of each edit. A sync-counts rule whose marker no longer
  // exists does not fail loudly at the edit — it reports drift on every run
  // afterwards, which is how a count audit becomes noise people learn to skip.
  assert.doesNotMatch(SYNC, /The Framework in Pictures \$\{DOT\} \)\\\\d\+\( exhibits/,
    'the cover exhibits rule is gone with the marker it matched');
  assert.doesNotMatch(SYNC, /\(Glossary \$\{DOT\} \)\\\\d\+\( terms\)/,
    'and so is the cover terms rule');
  // Both counts are still derived and still audited where they are still
  // published, which is why EXHIBITS and TERMS have not become dead code.
  assert.match(SYNC, /generated \$\{DOT\} all \)\\\\d\+\( exhibits/);
  assert.match(SYNC, /generated \$\{DOT\} \)\\\\d\+\( terms/);
});

test('tiles: the count audit passes against the edited cover', () => {
  const r = spawnSync(process.execPath, ['scripts/sync-counts.mjs', '--check'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr || r.stdout);
});

// ---------------------------------------------------------------------------
// 2. The drawings
// ---------------------------------------------------------------------------
test('art: every tile carries an inline SVG, hidden from the accessibility tree', () => {
  for (const t of tiles) {
    const block = SECTION.slice(SECTION.indexOf(`data-motif="${t.motif}"`));
    const art = block.slice(0, block.indexOf('</a>'));
    assert.match(art, /<span class="dc-tile-art" aria-hidden="true">/, `${t.motif} has a drawing`);
    assert.match(art, /<svg[^>]*aria-hidden="true"[^>]*focusable="false"/, `${t.motif}: svg is inert`);
    // currentColor is what makes one drawing work in both themes and lets the
    // hover brighten it with a single colour transition.
    assert.doesNotMatch(art, /#[0-9a-fA-F]{3,8}\b|rgba?\(/, `${t.motif}: no raw colour in the drawing`);
  }
});

test('art: the drawing is sized from the card height, never the card width', () => {
  // A width-driven square grew taller than a short card and clipped its own top
  // row; a bled square clipped its right column. Both looked like render faults.
  const rule = CSS.slice(CSS.indexOf('.dc-tile-art {'), CSS.indexOf('.dc-tile-art svg'));
  assert.match(rule, /height: min\(100%, \d+px\);/, 'height drives the box');
  assert.match(rule, /width: auto;/, 'and width follows the aspect ratio');
  assert.match(rule, /right: 0;[\s\S]*bottom: 0;/, 'flush to the corner, not bled past it');
});

// ---------------------------------------------------------------------------
// 2b. The pictures (owner, 2026-09-16: "Create better imagery")
// ---------------------------------------------------------------------------
// The first drawings were outline icons: one flat opacity, one register,
// generic enough for any features row. These are built the way the site's own
// exhibits are — three tonal planes with the chart doctrine's hierarchy: field
// and structure in ink tones, exactly one line in the accent. What is pinned is
// the construction, since that is what the next edit would quietly flatten.

const artFor = (motif) => {
  const block = SECTION.slice(SECTION.indexOf(`data-motif="${motif}"`));
  return block.slice(block.indexOf('<svg'), block.indexOf('</svg>') + 6);
};

test('pictures: every colour is a class the stylesheet resolves, never an attribute', () => {
  for (const t of tiles) {
    const art = artFor(t.motif);
    // The old drawings coloured themselves with fill="currentColor" and opacity
    // attributes; a picture with planes needs its tones in one place.
    assert.doesNotMatch(art, /\s(fill|stroke)="(?!none")[^"]*"/, `${t.motif}: a colour attribute in the markup`);
    assert.doesNotMatch(art, /\sopacity="/, `${t.motif}: an opacity attribute in the markup`);
    assert.match(art, /class="art-/, `${t.motif}: styled by art-* classes`);
  }
  // And the stylesheet gives the accent to exactly the elements that carry the
  // idea — never to a frame, a grid or a label.
  for (const cls of ['art-thesis', 'art-dot', 'art-tab-lit', 'art-size-top']) {
    assert.match(CSS, new RegExp(`\\.dc-tile-art \\.${cls}\\s*\\{[^}]*var\\(--accent\\)`), `${cls} is the accent`);
  }
  for (const cls of ['art-frame', 'art-grid', 'art-ref', 'art-ghost', 'art-tab', 'art-entry rect']) {
    assert.match(CSS, new RegExp(`\\.dc-tile-art \\.${cls}\\s*\\{[^}]*currentColor`), `${cls} rides currentColor`);
  }
});

test('pictures: each one carries the idea of its page', () => {
  const gallery = artFor('exhibits');
  assert.equal((gallery.match(/class="art-print /g) || []).length, 3, 'three prints in the stack');
  assert.match(gallery, /art-print-front[\s\S]*art-thesis/, 'the framework’s own curve is on the front print');
  const math = artFor('math');
  assert.match(math, /art-ceiling/, 'the clamp is drawn');
  assert.match(math, /art-ghost/, 'and so is the score it clamped away');
  assert.equal((math.match(/art-size/g) || []).length, 5, 'four rungs map a score to a size (one of them lit)');
  const glossary = artFor('glossary');
  assert.equal((glossary.match(/art-tab-letter/g) || []).length, 5, 'four thumb tabs, one of them lit');
  assert.match(glossary, /art-tab-pulled/, 'the lit tab is the one that pulls');
  const software = artFor('software');
  assert.match(software, /art-panel/, 'the product’s own dark panel');
  assert.match(software, /<path class="art-live" pathLength="1"/, 'the live line is drawable (pathLength, not a measured length)');
});

test('pictures: the software card wears the exhibit surface, in both themes', () => {
  // These tokens are fixed by design — the panel is dark on the light page too —
  // which is what makes this card read as a screen rather than a diagram.
  assert.match(CSS, /\.dc-tile-art \.art-panel\s*\{[^}]*var\(--feature-bg\)/);
  assert.match(CSS, /\.dc-tile-art \.art-live\s*\{[^}]*var\(--chart-thesis\)/);
  assert.match(CSS, /\.dc-tile-art \.art-live-field\s*\{[^}]*var\(--chart-field\)/);
  assert.match(CSS, /\[data-motif="software"\] \.dc-tile-art \.art-context\s*\{[^}]*var\(--chart-context\)/,
    'the grey context series is the exhibits’ own grey');
});

test('pictures: each card has one hover move, and focus gets it too', () => {
  const moves = {
    exhibits: /\.art-print-back \{ transform: rotate\(-11deg\)/,
    math: /\.art-ghost \{ opacity: \.95; \}/,
    glossary: /\.art-tab-pulled \{ transform: translateX\(4px\); \}/,
    software: /\.art-live \{ animation: art-draw/,
  };
  for (const [motif, re] of Object.entries(moves)) {
    const hover = CSS.match(new RegExp(`\\.dc-tile\\[data-motif="${motif}"\\]:hover [^,{]+,\\n\\.dc-tile\\[data-motif="${motif}"\\]:focus-visible [^{]+\\{[^}]*\\}`));
    assert.ok(hover, `${motif}: a hover rule paired with focus-visible`);
    assert.match(hover[0], re, `${motif}: the move is the one the picture is about`);
  }
  // The fan's rest state is CSS, not an SVG attribute, so it is still fanned
  // under reduced motion (which only removes the transition, not the pose) and
  // the hover opens it on the same property.
  assert.match(CSS, /\.dc-tile-art \.art-print-back \{ transform: rotate\(-7deg\); \}/);
  assert.doesNotMatch(artFor('exhibits'), /transform="rotate/, 'no attribute transform to fight the CSS one');
});

// ---------------------------------------------------------------------------
// 3. One accent — the constraint that makes this a system and not decoration
// ---------------------------------------------------------------------------
test('wash: four geometries, and not one of them introduces a second hue', () => {
  const rules = [...CSS.matchAll(/\.dc-tile\[data-motif="([a-z]+)"\]::before \{([\s\S]*?)\n\}/g)];
  assert.equal(rules.length, 4, 'one wash per tile');
  const shapes = new Set();
  for (const [, motif, body] of rules) {
    assert.doesNotMatch(body, /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/, `${motif}: no raw colour`);
    // Every colour stop is one of the two shared tokens. This is the line that
    // reddens when someone gives a card its own hue.
    const colours = [...body.matchAll(/var\((--[a-z-]+)/g)].map((m) => m[1]);
    assert.ok(colours.length > 0, `${motif}: the wash names a token`);
    for (const c of colours) {
      assert.ok(['--tile-wash', '--tile-wash-lift'].includes(c), `${motif}: unexpected token ${c}`);
    }
    shapes.add(body.replace(/\s+/g, ' ').trim());
  }
  assert.equal(shapes.size, 4, 'and the four are genuinely different shapes');
});

test('tokens: the tile values live in tokens.css, for both themes, derived from --accent', () => {
  // reading-system.css says in its own header that it defines no tokens.
  assert.doesNotMatch(CSS, /^\s*--tile-[a-z-]+:/m, 'the consuming file defines none');
  for (const name of ['--tile-wash', '--tile-wash-lift', '--tile-motif', '--tile-motif-lift']) {
    const defs = [...TOKENS.matchAll(new RegExp(`${name}:\\s*([^;]+);`, 'g'))].map((m) => m[1].trim());
    assert.equal(defs.length, 2, `${name} is defined once per theme`);
    for (const d of defs) {
      assert.match(d, /color-mix\(in oklab, var\(--accent\)/, `${name} follows the accent, so it themes for free`);
    }
  }
});

// ---------------------------------------------------------------------------
// 4. Hover
// ---------------------------------------------------------------------------
test('hover: focus gets everything hover gets', () => {
  // A keyboard reader should not be the one who never sees the card respond.
  const hovers = [...CSS.matchAll(/^\.dc-tile:hover([^{]*)\{/gm)].map((m) => m[1]);
  assert.ok(hovers.length >= 4, `expected the hover set, found ${hovers.length}`);
  for (const rest of hovers) {
    assert.match(rest, /\.dc-tile:focus-visible/, `focus-visible is missing from: .dc-tile:hover${rest}`);
  }
});

test('hover: the pulse animates transform and opacity, not the SVG geometry', () => {
  // Animating `r` via CSS is not portable across engines; scale is.
  const kf = CSS.slice(CSS.indexOf('@keyframes dc-pulse'), CSS.indexOf('@keyframes dc-pulse') + 220);
  assert.match(kf, /transform: scale\(/, 'it scales');
  assert.doesNotMatch(kf, /\br:\s*\d/, 'it does not animate the radius attribute');
  assert.match(CSS, /transform-box: fill-box;/, 'with a fill-box origin so the scale is centred on the ring');
  // And it runs only under the pointer — a cover that pulses at rest is a tic.
  // Stated as the property: any rule that animates the ring must be gated on an
  // interaction state. (An unanchored `.dc-pulse-ring {` regex matches the tail
  // of the gated selector itself, and passes or fails for the wrong reason.)
  for (const [, selector, body] of CSS.matchAll(/([^{}]*\.dc-pulse-ring[^{}]*)\{([^}]*)\}/g)) {
    if (!/animation:/.test(body)) continue;
    assert.match(selector, /:hover|:focus-visible/, `the ring animates outside an interaction state: ${selector.trim()}`);
  }
});

test('hover: motion is transform/opacity/colour only, so the global reduce rule kills it', () => {
  const block = CSS.slice(CSS.indexOf('.dc-tile:hover, .dc-tile:focus-visible {'), CSS.indexOf('/* ---- Per-tile wash geometry'));
  assert.match(block, /transform: translateY\(-2px\)/, 'the card lifts');
  assert.match(block, /transform: scale\(1\.06\)/, 'the drawing steps forward');
  assert.match(CSS, /@media \(prefers-reduced-motion: reduce\)[\s\S]{0,200}transition: none !important/,
    'and the site-wide reduce rule disables all of it');
});
