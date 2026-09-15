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
const CSS = read('public/site-b/reading-system.css');
const CHART = read('components/framework-charts/FrameworkChart.jsx');
const BUNDLE = read('public/site-b/site-b-charts.js');

const navLinks = (label) => {
  const open = COVER.indexOf(`<nav class="nav-links" aria-label="${label}">`);
  assert.notEqual(open, -1, `${label} nav exists`);
  const block = COVER.slice(open, COVER.indexOf('</nav>', open));
  return [...block.matchAll(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g)].map((m) => ({ href: m[1], text: m[2].trim() }));
};

// ---------------------------------------------------------------------------
// 1. The cover's two navs
// ---------------------------------------------------------------------------
test('nav: the header offers the same destinations as the footer', () => {
  // The property, not today's list: one nav component, one set of destinations.
  // Pinning the list would go stale the first time a page is added; pinning the
  // agreement is what actually caught this.
  const header = navLinks('Primary').map((a) => a.href);
  const footer = navLinks('Footer').map((a) => a.href);
  assert.deepEqual(header, footer, `header ${JSON.stringify(header)} vs footer ${JSON.stringify(footer)}`);
});

test('nav: the glossary is reachable from the top of the page', () => {
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
