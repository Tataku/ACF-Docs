/**
 * Control reachability — can a reader find it, hit it, and hear what it is
 *
 * Run: npm run test:control-reachability
 *
 * Three findings from the 2026-09-15 visitor read, each about a control that
 * existed and worked but that some readers could not reach or identify:
 *
 *   1. The cover's header nav listed four destinations; its footer nav listed
 *      five. The one missing from the top of the page was the Glossary — the
 *      109-term reference a returning reader is most likely to jump to.
 *
 *      The first fix pinned the two navs as EQUAL lists. That held the header
 *      to the footer, and in doing so held the footer to the header: it was
 *      five links because the bar above it was five links, and the six Parts —
 *      the entire book — were reachable from every surface of the site except
 *      the foot of its front door. The footer is now a map of the whole site,
 *      so the two can no longer be the same list, and each end is pinned to
 *      the thing it is actually answerable to: the FOOTER to the routable
 *      universe (every page reachable from the foot of the cover), the HEADER
 *      to the reference pages (the destinations a reader jumps to rather than
 *      reads through). Both derive from next.config.mjs, so a page that gains
 *      a URL and no link goes red instead of quietly unreachable — which the
 *      equality check could never have caught, because a page missing from
 *      both navs satisfied it perfectly.
 *   2. The "on this page" section list renders at 23px inside the mobile
 *      drawer, under the 24px WCAG 2.2 AA target size and packed tight, and on
 *      a phone that drawer is the only way to jump within a Part.
 *   3. The chart stepper dots were 7x7 and every one of them announced itself
 *      as "Element 3" — in a row whose own prev/next buttons were already a
 *      correct 44x44, and with the element's real name sitting in the spec.
 *
 * Measured in Chromium at 390 and 1440 before these were written.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const COVER = read('public/site-b/cover-docs.html');
const CONFIG = read('next.config.mjs');
const CSS = read('public/site-b/reading-system.css');
const CHART = read('components/framework-charts/FrameworkChart.jsx');
const BUNDLE = read('public/site-b/site-b-charts.js');

const navLinks = (label) => {
  const open = COVER.indexOf(`<nav class="nav-links" aria-label="${label}">`);
  assert.notEqual(open, -1, `${label} nav exists`);
  const block = COVER.slice(open, COVER.indexOf('</nav>', open));
  return [...block.matchAll(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g)].map((m) => ({ href: m[1], text: m[2].trim() }));
};

/**
 * The routable universe is the rewrite table — the same source of truth
 * build-crawler-files.mjs reads, and for the same reason it reads it: a page
 * list kept anywhere else is the second source of truth this repo's generators
 * exist to prevent. Sliced by its own declaration first, because `headers()`
 * declares a `source:` too and a naive scan would pull it in as a twelfth route.
 */
const routableRoutes = () => {
  const open = CONFIG.indexOf('const siteBRewrites = [');
  assert.notEqual(open, -1, 'next.config.mjs declares siteBRewrites');
  const block = CONFIG.slice(open, CONFIG.indexOf('];', open));
  const routes = [...block.matchAll(/source:\s*"([^"]+)"/g)].map((m) => m[1]);
  assert.ok(routes.length > 1, 'the rewrite table parses');
  return routes;
};

/** Every href in the cover's footer, whichever tier or column it sits in. */
const footerHrefs = () => {
  const open = COVER.indexOf('<footer class="site-footer');
  assert.notEqual(open, -1, 'the cover has a footer');
  const block = COVER.slice(open, COVER.indexOf('</footer>', open));
  return new Set([...block.matchAll(/href="([^"]+)"/g)].map((m) => m[1]));
};

// ---------------------------------------------------------------------------
// 1. The cover's two navs — each pinned to what it is answerable to
// ---------------------------------------------------------------------------
test('footer: every page of the site is reachable from the foot of the cover', () => {
  // The cover's footer is the site map, and under 768px it is the ONLY one —
  // the header's links are display:none there. So the bar it has to clear is
  // the whole routable universe, not whatever the bar above it happens to show.
  const hrefs = footerHrefs();
  for (const route of routableRoutes()) {
    assert.ok(hrefs.has(route), `the cover footer links ${route}`);
  }
});

test('nav: the header offers every reference destination the site has', () => {
  // The original defect, generalised: a reference page is one a reader JUMPS to
  // rather than reads through, and those belong in the persistent bar. Parts are
  // excluded — the bar offers the book, not its six chapters — and so is the
  // cover itself, which the brand lockup already links.
  const header = new Set(navLinks('Primary').map((a) => a.href));
  const reference = routableRoutes().filter((r) => r !== '/' && !r.startsWith('/part-'));
  assert.ok(reference.length, 'the site has reference pages');
  for (const route of reference) {
    assert.ok(header.has(route), `the primary nav links ${route}`);
  }
});

test('nav: the glossary is reachable from the top of the page', () => {
  // Kept as itself. The rule above subsumes it today; the regression that was
  // actually reported deserves a test that still names it if that rule loosens.
  assert.ok(navLinks('Primary').some((a) => a.href === '/glossary'), 'primary nav links the glossary');
});

// ---------------------------------------------------------------------------
// 2. The drawer's section list
// ---------------------------------------------------------------------------
test('drawer: section links meet the touch target minimum, on touch only', () => {
  const start = CSS.indexOf('.on-this-page a:hover');
  const block = CSS.slice(start, start + 900);
  assert.match(block, /@media \(max-width: 1024px\)/, 'the relief is scoped to the drawer breakpoint');
  assert.match(block, /\.on-this-page a \{[\s\S]*?min-height: 2\.25rem;/, 'and gives each link a real height');
  // The desktop rail is a precise-pointer surface and keeps its density; a
  // blanket change here would have cost information density where it is free.
  const base = CSS.slice(CSS.indexOf('.on-this-page a {'), CSS.indexOf('.on-this-page a:hover'));
  assert.doesNotMatch(base, /min-height/, 'the unscoped rule is untouched');
});

// ---------------------------------------------------------------------------
// 3. The chart stepper dots
// ---------------------------------------------------------------------------
test('stepper: no dot announces itself as a bare ordinal', async () => {
  // The exact defect, in the exact form it shipped: the ordinal as the PRIMARY
  // label rather than a last resort.
  assert.doesNotMatch(CHART, /aria-label=\{`Element \$\{i \+ 1\}`\}/, 'the generic label is no longer the primary');
  assert.match(CHART, /t\.name \|\| t\.label \|\| `Element/, 'it survives only behind the real name, as a never-unlabelled net');

  // And the net is unused: every target the site actually ships carries a name,
  // so no reader hears an ordinal. This is the assertion that reddens when a new
  // target arrives without one — which is how the original defect would recur.
  const { FRAMEWORK_CHART_SPECS } = await import('../components/framework-charts/chart-specs.mjs');
  const nameless = [];
  for (const spec of FRAMEWORK_CHART_SPECS) {
    for (const t of spec.hoverTargets || []) {
      if (!t.name && !t.label) nameless.push(`${spec.chartId}:${t.id}`);
    }
  }
  assert.deepEqual(nameless, [], `targets with no name or label: ${nameless.join(', ')}`);
});

test('stepper: each dot is named from the spec, with its position', () => {
  const fn = CHART.slice(CHART.indexOf('function MobileInsight('), CHART.indexOf('SequenceRiskSvg'));
  assert.ok(fn.length > 500, 'MobileInsight located');
  assert.match(fn, /targets\.find\(\(x\) => x\.id === id\)/, 'it resolves the target for each dot');
  assert.match(fn, /t\.name \|\| t\.label/, 'and prefers the real name');
  assert.match(fn, /\$\{i \+ 1\} of \$\{ord\.length\}/, 'carrying the position for orientation');
  assert.match(fn, /aria-current=\{on \? 'true' : undefined\}/, 'and marking which one is current');
});

test('stepper: the target is the button, the dot is only the picture', () => {
  const fn = CHART.slice(CHART.indexOf('function MobileInsight('), CHART.indexOf('SequenceRiskSvg'));
  // 24px is the WCAG 2.2 AA minimum. The visible dot stays 7px: the fix is a
  // bigger hit area, not a redesign of the pagination.
  assert.match(fn, /width: on \? 30 : 24, height: 24/, 'the button meets 24x24');
  assert.match(fn, /<span aria-hidden style=\{\{ display: 'block', width: on \? 18 : 7, height: 7/, 'the dot is a decorative span inside it');
  assert.match(fn, /background: 'transparent'/, 'so the target itself is invisible');
});

test('stepper: the fix reached the bundle a visitor actually loads', () => {
  // site-b-charts.js is a committed artifact built outside `prebuild`
  // (npm run build:site-b-charts); a source-only fix changes nothing on screen.
  assert.match(BUNDLE, /of \$\{|of "\+/, 'the positional label is in the bundle');
  assert.ok(/aria-current/.test(BUNDLE), 'and so is the current-dot marking');
});

// ---------------------------------------------------------------------------
// 4. The theme toggle, unboxed (owner-directed, 2026-09-15)
// ---------------------------------------------------------------------------
// The toggle shipped inside a hairline square while .sidebar-toggle, which sits
// beside it in the sidebar head, had none; the owner called the box ugly here
// and on the dashboard's landing and tiers pages, which carry a port of this
// same recipe. Removing a border from a <button> has a trap that a plain
// `not.toContain` would not catch, so both directions are pinned: the rule must
// declare `border: none` and NOT a width, because a <button> with no border
// declaration at all falls back to the UA's 2px outset — a worse box than the
// one this removed. The hover and focus affordances are pinned too, since the
// border used to carry one of them.

const themeToggleRule = () => {
  const i = CSS.indexOf('.theme-toggle {');
  assert.notEqual(i, -1, '.theme-toggle rule exists');
  const open = CSS.indexOf('{', i);
  return CSS.slice(open, CSS.indexOf('}', open) + 1);
};

test('theme toggle: no hairline square, and the UA button border stays off', () => {
  const rule = themeToggleRule();
  assert.match(rule, /border:\s*none;/, 'border: none is explicit, not deleted');
  assert.doesNotMatch(rule, /border:\s*\d/, 'no width — that is the box the owner removed');
  assert.doesNotMatch(rule, /border-(color|width|style)\s*:/, 'and no longhand re-introduces one');
});

test('theme toggle: hover still announces the control, without an edge', () => {
  const i = CSS.indexOf('.theme-toggle:hover, .theme-toggle:focus-visible {');
  assert.notEqual(i, -1, 'the hover/focus rule exists');
  const block = CSS.slice(CSS.indexOf('{', i), CSS.indexOf('}', CSS.indexOf('{', i)) + 1);
  assert.match(block, /color:\s*var\(--accent\)/, 'the glyph shifts to accent');
  assert.doesNotMatch(block, /border-color\s*:/, 'nothing paints the border back on');
});

test('theme toggle: keyboard focus is an outline, independent of the border', () => {
  // The global rule — the reason unboxing costs no focus visibility.
  assert.match(CSS, /^:focus-visible \{ outline: 2px solid var\(--accent\)/m,
    'the site-wide :focus-visible outline is intact');
});
