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
 * Measured in Chromium on fresh loads (not resizes, which measure a resize
 * artifact) at 320-1440, desktop mode:
 *
 *                       main        this branch
 *   overflow            769, 800,   none at any width 317+
 *                       and <336
 *   links wrapped       4 at 1000-1030, 8 at 769-950   none at any width
 *   floor               336px       317px
 *
 * The floor IMPROVED while a control was added, because the very-narrow tier
 * gives back more than the search trigger costs.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CSS = fs.readFileSync(path.join(ROOT, 'public/site-b/reading-system.css'), 'utf8');

// The block that turns the header into brand-left / actions-right.
const narrowSwitch = () => {
  const i = CSS.indexOf('.nav-links { display: none; }');
  assert.notEqual(i, -1, 'the narrow-header rule exists');
  const open = CSS.lastIndexOf('@media', i);
  return { query: CSS.slice(open, CSS.indexOf('{', open)), start: open };
};

const bandFor = (needle) => {
  const i = CSS.indexOf(needle);
  assert.notEqual(i, -1, `${needle} exists`);
  const open = CSS.lastIndexOf('@media', i);
  return CSS.slice(open, CSS.indexOf('{', open));
};

test('header: the links are hidden at the width they stop fitting, not 250px later', () => {
  const { query } = narrowSwitch();
  const max = Number((query.match(/max-width:\s*(\d+)px/) || [, NaN])[1]);
  assert.ok(Number.isFinite(max), `unreadable query: ${query}`);
  // Measured: one line down to 1008px, first wrap at 1000. Anything at or below
  // 1000 re-opens the wrapped-and-overflowing band; anything far above hides a
  // nav that still fits. The window is narrow and that is the point.
  assert.ok(max >= 1000 && max <= 1023, `switch at ${max}px is outside the measured window 1000-1023`);
});

test('header: the two nav bands meet, with no width falling between them', () => {
  // THE defect, stated as a property. The old pair was `max-width: 768` and a
  // desktop layout with no lower bound, so 769-1023 got neither.
  const narrow = Number(narrowSwitch().query.match(/max-width:\s*(\d+)px/)[1]);
  const wide = bandFor('.nav-links { gap: var(--space-4); }');
  const min = Number(wide.match(/min-width:\s*(\d+)px/)[1]);
  assert.equal(min, narrow + 1, `narrow ends at ${narrow}, wide starts at ${min} — ${min - narrow - 1}px unclaimed`);
});

test('header: the very-narrow tier exists and only shrinks, never removes', () => {
  const tier = bandFor('.brand-word { display: none; }');
  const max = Number(tier.match(/max-width:\s*(\d+)px/)[1]);
  assert.ok(max >= 390 && max <= 480, `very-narrow tier at ${max}px`);
  const body = CSS.slice(CSS.indexOf(tier), CSS.indexOf('}\n', CSS.indexOf('.nav-search { min-width: 2.5rem; }')) + 2);
  // Every action survives a 320px phone; only the wordmark beside the mark goes.
  for (const gone of ['.nav-search { display: none', '.nav-cta { display: none', '#theme-toggle { display: none']) {
    assert.ok(!body.includes(gone), `the very-narrow tier removes a control: ${gone}`);
  }
  assert.match(body, /\.nav-cta \{ padding-inline:/, 'the pill keeps its label on tighter padding');
});

test('header: the search trigger is never the thing that gets dropped', () => {
  // It is the only entry point to the search panel, so hiding it at a width
  // would make the corpus unreachable there — the exact state this whole line of
  // work existed to end.
  // (?![-\w]) so `.nav-search-label` — which IS legitimately hidden — does not
  // match the button by sharing its prefix.
  assert.doesNotMatch(CSS, /\.nav-search(?![-\w])[^{]*\{[^}]*display:\s*none/, 'nothing hides the trigger');
  assert.match(CSS, /\.nav-search-label, \.nav-search-key \{ display: none; \}/,
    'only its label and key hint are, which is what makes it icon-only');
});
