/**
 * Cover header — the breakpoints, and the widths between them
 *
 * Run: npm run test:header-layout
 *
 * The header hid its nav links below 768px. The links stop fitting at 1000px.
 * Between those two numbers it was simply broken, and had been: all four links
 * wrapped onto two lines from 1000 down, and from 800 down the grid's
 * min-content (brand + wrapped links + actions = 847px) exceeded the viewport,
 * so the whole PAGE scrolled sideways. The rule was not wrong; it was asked the
 * wrong question, and nothing checked the answer.
 *
 * What is pinned here is therefore not a list of numbers but the property that
 * was missing: the bands must MEET. A one-pixel gap between two media queries is
 * the same defect as a 255-pixel one, and the 255-pixel one shipped.
 *
 * Re-measured after the search control was removed (owner, 2026-09-16), with the
 * grid forced on so the question was asked of the layout it is about: the links
 * still hold one line at 1024, still wrap four at 1000, and the grid still
 * overflows at 800 and below. Removing the control did not move the threshold,
 * so the switch stays where the measurement put it.
 *
 *                       main        this branch
 *   overflow            769, 800,   none at any width 274+
 *                       and <336
 *   links wrapped       4 at 1000-1030, 8 at 769-950   none at any width
 *   floor               336px       274px, and no longer set by the header
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const CSS = read('public/site-b/reading-system.css');

// The block that turns the header into brand-left / actions-right.
const narrowSwitch = () => {
  const i = CSS.indexOf('.nav-links { display: none; }');
  assert.notEqual(i, -1, 'the narrow-header rule exists');
  const open = CSS.lastIndexOf('@media', i);
  return CSS.slice(open, CSS.indexOf('{', open));
};

const bandFor = (needle) => {
  const i = CSS.indexOf(needle);
  assert.notEqual(i, -1, `${needle} exists`);
  const open = CSS.lastIndexOf('@media', i);
  return CSS.slice(open, CSS.indexOf('{', open));
};

test('header: the links are hidden at the width they stop fitting, not 250px later', () => {
  const max = Number((narrowSwitch().match(/max-width:\s*(\d+)px/) || [, NaN])[1]);
  assert.ok(Number.isFinite(max), `unreadable query: ${narrowSwitch()}`);
  // Measured: one line down to 1008px, first wrap at 1000. Anything at or below
  // 1000 re-opens the wrapped-and-overflowing band; anything far above hides a
  // nav that still fits. The window is narrow and that is the point.
  assert.ok(max >= 1000 && max <= 1023, `switch at ${max}px is outside the measured window 1000-1023`);
});

test('header: the two nav bands meet, with no width falling between them', () => {
  // THE defect, stated as a property. The old pair was `max-width: 768` and a
  // desktop layout with no lower bound, so 769-1023 got neither.
  const narrow = Number(narrowSwitch().match(/max-width:\s*(\d+)px/)[1]);
  const min = Number(bandFor('.nav-links { gap: var(--space-4); }').match(/min-width:\s*(\d+)px/)[1]);
  assert.equal(min, narrow + 1, `narrow ends at ${narrow}, wide starts at ${min} — ${min - narrow - 1}px unclaimed`);
});

test('header: the very-narrow tier exists and only shrinks, never removes', () => {
  const tier = bandFor('.brand-word { display: none; }');
  const max = Number(tier.match(/max-width:\s*(\d+)px/)[1]);
  assert.ok(max >= 390 && max <= 480, `very-narrow tier at ${max}px`);
  const open = CSS.indexOf(tier);
  const body = CSS.slice(open, CSS.indexOf('\n}', open) + 2);
  // Every action survives a 320px phone; only the wordmark beside the mark goes.
  for (const gone of ['.nav-cta { display: none', '#theme-toggle { display: none']) {
    assert.ok(!body.includes(gone), `the very-narrow tier removes a control: ${gone}`);
  }
  assert.match(body, /\.nav-cta \{ padding-inline:/, 'the pill keeps its label on tighter padding');
});

test('header: the search control and its panel are gone, not merely hidden', () => {
  // Owner, 2026-09-16: "Completely unnecessary, remove it." A modal listing the
  // same 109 terms as /glossary was a worse copy of a page that already exists,
  // and the header control was its only remaining entrance.
  //
  // This asserts the removal was a DELETION. Dead CSS for a feature nobody can
  // reach is exactly how the PREVIOUS in-flow search bar survived its own
  // removal — .dc-search and .dc-kbd were still in this stylesheet with no
  // markup anywhere to style, on main, long before any of this.
  for (const ghost of ['nav-search', 'dc-search', 'dc-sr', 'dc-kbd']) {
    assert.doesNotMatch(CSS, new RegExp(`\\.${ghost}`), `${ghost} styles survive with nothing to style`);
  }
  const js = read('public/site-b/cover-docs.js');
  assert.doesNotMatch(js, /openPanel|search-index|buildPanel/, 'the panel script is gone');
  assert.ok(!fs.existsSync(path.join(ROOT, 'public/site-b/search-index.json')), 'the corpus it fetched is gone');
  assert.ok(!fs.existsSync(path.join(ROOT, 'scripts/build-search-index.mjs')), 'and the builder that wrote it');
  const pkg = JSON.parse(read('package.json'));
  for (const script of ['build:search', 'audit:search', 'test:search-index']) {
    assert.ok(!(script in pkg.scripts), `${script} still registered`);
  }
  assert.doesNotMatch(pkg.scripts.prebuild, /build:search/, 'prebuild no longer builds it');
});

test('header: the Glossary tile is a plain link to the glossary page', () => {
  // Owner: "It needs to link to our new glossary page, not a lightbox." The href
  // was always /glossary — a click handler swallowed it and opened the modal
  // instead, so the tile looked like a link and behaved like a button.
  const cover = read('public/site-b/cover-docs.html');
  assert.match(cover, /<a class="dc-tile" href="\/glossary" data-motif="glossary">/,
    'the tile carries no handler hook');
  assert.doesNotMatch(cover, /data-glossary-tile|data-search-open|data-search-hint/,
    'no hooks remain for a script to bind to');
});
