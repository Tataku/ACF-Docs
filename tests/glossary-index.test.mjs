/**
 * Glossary index — docs-site guardrail
 *
 * Run: npm run test:glossary
 *
 * The reference index is generated from acf-glossary.json and the surface a
 * reader meets on /glossary is a term-only accordion. These assertions pin the
 * contract between the three parties that have to agree for that page to work:
 * the term file (categories, ids, aliases, copy rules), the generator (one row
 * per term, disclosure semantics, deep-link ids, the page-only script), and the
 * runtime pieces (the stylesheet's closed/open states and the script's
 * behaviours). Every property here was first checked in a real Chromium at
 * 1440 and 390 wide; what can be read from source is frozen here so the next
 * edit cannot regress it silently.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const GLOSSARY = JSON.parse(read('public/site-b/acf-glossary.json'));
const REGISTRY = JSON.parse(read('public/site-b/navigation-registry.json'));
const PAGE = read('public/site-b/glossary.html');
const CSS = read('public/site-b/reading-system.css');
const SCRIPT = read('public/site-b/glossary-index.js');
const READING = read('public/site-b/reading.js');
const BUILD = read('scripts/build-glossary-page.mjs');

const terms = GLOSSARY.terms;
const categories = GLOSSARY.meta.categories;
const main = PAGE.slice(PAGE.indexOf('<main class="shell-main">'), PAGE.indexOf('</main>'));

// ---------------------------------------------------------------------------
// The term file
// ---------------------------------------------------------------------------
test('term file: every term carries a category from the closed registry, in book order', () => {
  assert.ok(Array.isArray(categories) && categories.length === 6, 'six movements');
  const parts = categories.map((c) => c.part);
  assert.deepEqual(parts, [1, 2, 3, 4, 5, 6], 'categories follow the six Parts in reading order');
  const keys = new Set(categories.map((c) => c.key));
  for (const t of terms) assert.ok(keys.has(t.category), `${t.id} has category ${t.category}`);
  for (const c of categories) assert.ok(terms.some((t) => t.category === c.key), `${c.key} is not an empty movement`);
});

test('term file: ids are unique kebab-case and every related id resolves', () => {
  const ids = new Set();
  for (const t of terms) {
    assert.match(t.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, t.id);
    assert.ok(!ids.has(t.id), `duplicate id ${t.id}`);
    ids.add(t.id);
  }
  for (const t of terms) for (const r of t.related) assert.ok(ids.has(r), `${t.id} → ${r}`);
});

test('term file: no alias is claimed by two terms (the tooltip tagger takes the first match)', () => {
  const owner = new Map();
  for (const t of terms) {
    for (const label of [t.term, ...t.aliases]) {
      const key = label.toLowerCase();
      assert.ok(!owner.has(key) || owner.get(key) === t.id, `"${label}" claimed by ${owner.get(key)} and ${t.id}`);
      owner.set(key, t.id);
    }
  }
});

test('term file: user-visible copy carries no em or en dash (calibration standard)', () => {
  for (const t of terms) assert.doesNotMatch(`${t.term} ${t.definition}`, /[\u2014\u2013]/, t.id);
});

test('term file: every chart reference resolves to a live exhibit in the registry', () => {
  for (const t of terms) if (t.chart) assert.ok(REGISTRY.charts[String(t.chart)], `${t.id} → ${t.chart}`);
});

test('term file: every term links to the Part that develops it', () => {
  // A row with no "appears in" link is a definition with no way back into the
  // book; two terms shipped that way before the index was rebuilt.
  for (const t of terms) assert.ok(t.appearsLater && t.appearsLater.part >= 1 && t.appearsLater.part <= 6, `${t.id} appearsLater`);
});

test('term file: the concepts the site names are present (wave 4 is not silently dropped)', () => {
  const ids = new Set(terms.map((t) => t.id));
  for (const id of GLOSSARY.meta.rollout.wave4) assert.ok(ids.has(id), id);
  // A representative from each movement's additions, by name.
  for (const id of ['risk-of-ruin', 'global-liquidity', 'bitcoin-backbone', 'tax-wedge', 'household-aggregate', 'weekly-loop']) {
    assert.ok(ids.has(id), id);
  }
});

// ---------------------------------------------------------------------------
// The generated page
// ---------------------------------------------------------------------------
test('page: is fresh against the term file and the donor shell (audit:glossary)', () => {
  const r = spawnSync(process.execPath, ['scripts/build-glossary-page.mjs', '--check'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr || r.stdout);
});

test('page: one term-only row per term — a button carrying the name, a region parked hidden="until-found"', () => {
  for (const t of terms) {
    const rows = main.split(`<li class="gl-item" id="g-${t.id}"`).length - 1;
    assert.equal(rows, 1, `${t.id} appears exactly once`);
    assert.ok(main.includes(`aria-controls="gd-${t.id}"`), `${t.id} button controls its region`);
    assert.ok(main.includes(`<div class="gl-body" id="gd-${t.id}" role="region" aria-label="`), `${t.id} region`);
  }
  const buttons = main.match(/<button type="button" class="gl-term" aria-expanded="false" aria-controls="gd-/g) || [];
  const parked = main.match(/hidden="until-found"/g) || [];
  assert.equal(buttons.length, terms.length, 'every row starts collapsed');
  assert.equal(parked.length, terms.length, 'every region starts parked for find-in-page');
});

test('page: the collapsed row shows the term alone — no definition text outside the region', () => {
  // The definition lives only inside .gl-body; the button carries only the name.
  for (const t of terms.slice(0, 40)) {
    const idx = main.indexOf(`<li class="gl-item" id="g-${t.id}"`);
    const rowEnd = main.indexOf('</button>', idx);
    const button = main.slice(idx, rowEnd);
    assert.doesNotMatch(button, /gl-def/, `${t.id} button has no definition`);
    assert.ok(button.includes('<span class="gl-term-name">'), `${t.id} button names the term`);
  }
});

test('page: groups follow the category registry in book order, each with its count', () => {
  const order = [...main.matchAll(/<section class="section gl-group" id="([a-z-]+)"/g)].map((m) => m[1]);
  assert.deepEqual(order, categories.map((c) => c.key));
  for (const c of categories) {
    const n = terms.filter((t) => t.category === c.key).length;
    const section = main.slice(main.indexOf(`id="${c.key}"`), main.indexOf('</section>', main.indexOf(`id="${c.key}"`)));
    assert.ok(section.includes(`<span data-gl-group-count>${n}</span> terms`), `${c.key} count ${n}`);
    assert.equal((section.match(/<li class="gl-item"/g) || []).length, n, `${c.key} rows`);
  }
});

test('page: terms are alphabetical within a movement (a reference is scanned by name)', () => {
  for (const c of categories) {
    const section = main.slice(main.indexOf(`id="${c.key}"`), main.indexOf('</section>', main.indexOf(`id="${c.key}"`)));
    const names = [...section.matchAll(/<span class="gl-term-name">([\s\S]*?)<\/span>/g)].map((m) => m[1]);
    const sorted = names.slice().sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base', numeric: true }));
    assert.deepEqual(names, sorted, c.key);
  }
});

test('page: the count in the kicker and the description is derived, never typed', () => {
  assert.ok(PAGE.includes(`<p class="doc-kicker">${terms.length} terms &middot; ${categories.length} movements`), 'kicker');
  assert.ok(PAGE.includes(`glossary: ${terms.length} terms in ${categories.length} movements`), 'meta description');
  assert.ok(PAGE.includes(`data-gl-total="${terms.length}"`), 'live count seed');
});

test('page: carries the filter, the live count, expand/collapse, and the page-only script', () => {
  assert.ok(main.includes('<input class="gl-search" id="gl-search" type="search"'), 'filter box');
  assert.ok(main.includes('<label class="visually-hidden" for="gl-search">'), 'the field has a real label');
  assert.ok(main.includes('aria-live="polite" data-gl-count'), 'live count');
  assert.ok(main.includes('data-gl-expand') && main.includes('data-gl-collapse'), 'expand/collapse all');
  assert.ok(PAGE.includes('<script src="/site-b/glossary-index.js" defer></script>'), 'behaviour script');
  assert.ok(PAGE.indexOf('/site-b/reading.js') < PAGE.indexOf('/site-b/glossary-index.js'), 'after the reading runtime');
});

test('page: the sidebar marks Glossary current and spies the six movements; no part chain in the dock', () => {
  assert.ok(PAGE.includes('<a class="side-part current" href="/glossary" aria-current="page">'));
  const spy = PAGE.slice(PAGE.indexOf('<ol class="on-this-page" data-spy'), PAGE.indexOf('</ol>', PAGE.indexOf('<ol class="on-this-page" data-spy')));
  for (const c of categories) assert.ok(spy.includes(`href="#${c.key}"`), c.key);
  assert.equal((PAGE.match(/aria-current="page"/g) || []).length, 1, 'exactly one current entry');
  assert.doesNotMatch(PAGE, /floatnav-prev|floatnav-next|class="next-up"/, 'a reference page is not in the series');
});

test('page: related chips are in-page anchors to sibling rows that exist', () => {
  const ids = new Set(terms.map((t) => t.id));
  const chips = [...main.matchAll(/<a class="gl-chip" href="#g-([a-z0-9-]+)"/g)].map((m) => m[1]);
  assert.ok(chips.length > 200, `chips rendered (${chips.length})`);
  for (const id of chips) assert.ok(ids.has(id), id);
});

test('page: aliases feed the filter and never render as prose', () => {
  const dca = terms.find((t) => t.id === 'dca');
  assert.ok(main.includes(`id="g-dca" data-gl-item data-gl-aliases="${dca.aliases.map((a) => a.toLowerCase()).join('|')}"`));
  assert.doesNotMatch(main, /Also known as|Also:/);
});

// ---------------------------------------------------------------------------
// Stylesheet and script
// ---------------------------------------------------------------------------
test('css: closed rows stay reachable by find-in-page and open by a grid-rows transition', () => {
  assert.match(CSS, /\.gl-body\[hidden\]\s*\{[^}]*display:\s*block;[^}]*content-visibility:\s*hidden;[^}]*height:\s*0;/);
  assert.match(CSS, /\.gl-body\s*\{[^}]*grid-template-rows:\s*0fr;[^}]*transition:\s*grid-template-rows/);
  assert.match(CSS, /\.gl-body\.is-open\s*\{\s*grid-template-rows:\s*1fr;/);
});

test('css: a row is a full-height tap target, the field never triggers phone zoom, and both fallbacks exist', () => {
  assert.match(CSS, /\.gl-term\s*\{[^}]*min-height:\s*3rem;/, 'row tap target');
  assert.match(CSS, /\.gl-search\s*\{[^}]*font-size:\s*var\(--text-base\);/, '19px field');
  assert.match(CSS, /\.no-js \.gl-body\[hidden\]\s*\{[^}]*content-visibility:\s*visible;/, 'JS-off shows definitions');
  assert.match(CSS, /\.no-js \.gl-toolbar[^{]*\{\s*display:\s*none;/, 'JS-off hides the filter');
  assert.match(CSS, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.gl-body,[^}]*transition:\s*none;/, 'reduced motion');
  assert.match(CSS, /@media print\s*\{\s*\.gl-body\[hidden\]/, 'print opens the reference');
});

test('css: composes the system — tokens only, no raw colours in the glossary block', () => {
  const start = CSS.indexOf('GLOSSARY INDEX (reference page)');
  const end = CSS.indexOf('13 · EXHIBIT', start);
  const block = CSS.slice(start, end);
  assert.ok(block.length > 2000, 'block located');
  assert.doesNotMatch(block, /#[0-9a-f]{3,8}\b|rgba?\(/i, 'no raw colours');
  assert.match(block, /var\(--accent\)/);
  assert.match(block, /var\(--rule\)/);
});

test('script: deep links, chip hops, find-in-page, filter, and expand/collapse are all wired', () => {
  assert.match(SCRIPT, /addEventListener\('hashchange', fromHash\)/);
  assert.match(SCRIPT, /\/\^#g-\(\[a-z0-9-\]\+\)\$\/\.exec\(location\.hash/);
  assert.match(SCRIPT, /closest\('a\.gl-chip'\)/);
  assert.match(SCRIPT, /chip\.hash/, 'reads the resolved hash (reading.js absolutises hrefs)');
  assert.match(SCRIPT, /addEventListener\('beforematch'/);
  assert.match(SCRIPT, /setAttribute\('hidden', 'until-found'\)/);
  assert.match(SCRIPT, /setAttribute\('aria-expanded', 'true'\)/);
  assert.match(SCRIPT, /data-gl-expand/);
  assert.match(SCRIPT, /data-gl-collapse/);
  assert.match(SCRIPT, /e\.key === 'Escape'/);
  assert.match(SCRIPT, /prefers-reduced-motion: reduce/);
  assert.match(SCRIPT, /void r\.body\.offsetHeight;/, 'lays out the closed state before opening, or nothing transitions');
});

test('script: the filter folds case, accents, hyphens, and punctuation', () => {
  assert.match(SCRIPT, /normalize\('NFD'\)/);
  assert.match(SCRIPT, /replace\(\/\[-\\u2010\\u2011\\u2012\\u2013\\u2014\]\/g, ' '\)/);
});

// ---------------------------------------------------------------------------
// The tooltip's door into the index
// ---------------------------------------------------------------------------
test('tooltips: every registry entry carries a glossary-row link and reading.js appends it', () => {
  for (const t of terms) {
    const nav = REGISTRY.glossary[t.id];
    assert.ok(nav && nav.entry && nav.entry.href === `/glossary#g-${t.id}`, t.id);
  }
  assert.match(READING, /appendGlossaryLink\(layer, 'gloss-later gloss-entry', meta\.entry\)/);
});

// ---------------------------------------------------------------------------
// The generator
// ---------------------------------------------------------------------------
test('generator: fails closed on a bad term file rather than rendering a lie', () => {
  assert.match(BUILD, /category .* is not in meta\.categories/);
  assert.match(BUILD, /is claimed by both/);
  assert.match(BUILD, /em\/en dash in user-visible copy/);
  assert.match(BUILD, /related id .* does not exist/);
  assert.match(BUILD, /process\.exit\(1\)/);
});
