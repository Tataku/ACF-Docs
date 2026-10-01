/**
 * Exhibit numbering and chart homes (D-EXHIBIT-NUMBERING)
 *
 * Run: node --test tests/chart-exhibit-numbering.test.mjs
 *
 * Readers met Part 1's exhibits as 03, 04, 02, 01, 05, 06 and Part 3 skipped
 * P3-02, because idx was assigned before the pages were ordered. The rule pinned
 * here: a numbered exhibit's idx is its Part prefix (none for Part 1) plus its
 * two-digit position among that Part's own charts, in mount order on that Part's
 * page, with no gaps. Lens (L) and signature (S) charts keep letters, never a
 * number. Every figure that carries data-chart carries its spec's idx, and the
 * navigation registry homes each chart on the page of its spec group.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FRAMEWORK_CHART_SPECS } from '../components/framework-charts/chart-specs.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(ROOT, 'public/site-b');
const read = (f) => fs.readFileSync(path.join(SITE, f), 'utf8');
const SPEC = new Map(FRAMEWORK_CHART_SPECS.map((s) => [s.chartId, s]));
const REG = JSON.parse(read('navigation-registry.json'));

const PART_PAGES = [
  [1, 'part-1-foundation.html', '/part-1-foundation'],
  [2, 'part-2-lineage-macro.html', '/part-2-lineage-macro-thesis'],
  [3, 'part-3-bitcoin-convexity.html', '/part-3-bitcoin-convexity-backbone'],
  [4, 'part-4-tax-architecture.html', '/part-4-tax-architecture-roc-strategy'],
  [5, 'part-5-portfolio-construction.html', '/part-5-portfolio-construction-position-management'],
  [6, 'part-6-convexity-scoring.html', '/part-6-convexity-framework-integrity-scoring'],
];
const mountOrder = (html) => [...html.matchAll(/<figure\b[^>]*\bdata-fc-chart="([^"]+)"/g)].map((m) => m[1]);
const figures = (html) => [...html.matchAll(/<figure\b([^>]*)>/g)].map((m) => Object.fromEntries([...m[1].matchAll(/([\w-]+)="([^"]*)"/g)].map((a) => [a[1], a[2]])));

for (const [n, file] of PART_PAGES) {
  test(`Part ${n}: idx order equals mount order, numbered from 01 with no gaps`, () => {
    const own = mountOrder(read(file)).filter((id) => SPEC.get(id)?.group === `part-${n}`);
    const specs = FRAMEWORK_CHART_SPECS.filter((s) => s.group === `part-${n}`);
    assert.deepEqual([...own].sort(), specs.map((s) => s.chartId).sort(), `every Part ${n} chart is mounted once on ${file}`);
    const prefix = n === 1 ? '' : `P${n}-`;
    const expected = own.map((_, i) => `${prefix}${String(i + 1).padStart(2, '0')}`);
    assert.deepEqual(own.map((id) => SPEC.get(id).idx), expected, `Part ${n} reads ${expected.join(', ')} in page order`);
  });
}

test('lens and signature charts keep letters: L1 to L3 and S1, S2, in cover order', () => {
  const letters = FRAMEWORK_CHART_SPECS.filter((s) => s.group === 'docs-landing' || s.group === 'signature');
  letters.forEach((s) => assert.match(s.idx, /^[LS]\d$/, `${s.chartId} keeps a letter`));
  const cover = mountOrder(read('cover-docs.html'));
  const lenses = cover.filter((id) => SPEC.get(id)?.group === 'docs-landing').map((id) => SPEC.get(id).idx);
  assert.deepEqual(lenses, lenses.map((_, i) => `L${i + 1}`), `the cover meets its lenses in order (${lenses.join(', ')})`);
  const all = letters.map((s) => s.idx).sort();
  assert.equal(new Set(all).size, all.length, 'no letter is used twice');
});

test('every figure that carries data-chart carries its spec idx', () => {
  const files = fs.readdirSync(SITE).filter((f) => f.endsWith('.html'));
  let seen = 0;
  for (const f of files) for (const fig of figures(read(f))) {
    if (!fig['data-chart'] || !fig['data-fc-chart']) continue;
    seen += 1;
    assert.equal(fig['data-chart'], SPEC.get(fig['data-fc-chart']).idx, `${f}: #${fig.id} (${fig['data-fc-chart']})`);
  }
  assert.ok(seen > 0, 'the Part 1 figures carry data-chart');
});

test('the registry homes each chart on the page of its spec group, never on a copy', () => {
  const homes = new Map();
  for (const c of Object.values(REG.charts)) homes.set(c.chartId, c);
  assert.equal(homes.size, FRAMEWORK_CHART_SPECS.length, 'one home per spec');
  const partRoute = Object.fromEntries(PART_PAGES.map(([n, , route]) => [`part-${n}`, route]));
  const cover = new Set(mountOrder(read('cover-docs.html')));
  for (const s of FRAMEWORK_CHART_SPECS) {
    const home = homes.get(s.chartId);
    assert.equal(home.idx, s.idx, `${s.chartId}: registry idx`);
    if (partRoute[s.group]) assert.equal(home.route, partRoute[s.group], `${s.chartId} lives on its Part page`);
    else if (cover.has(s.chartId)) assert.equal(home.route, '/', `${s.chartId} lives on the cover`);
    else assert.match(home.route, /^\/part-[1-6]-/, `${s.chartId} lives on a Part page`);
    assert.notEqual(home.route, '/part-1-pictures', `${s.chartId}: Part 1 in Pictures is never a home`);
    assert.notEqual(home.route, '/framework-in-pictures', `${s.chartId}: the gallery is never a home`);
    assert.equal(REG.charts[s.idx].chartId, s.chartId, `registry key ${s.idx} names ${s.chartId}`);
  }
});

test('reading-core.js BUILT_CHARTS matches the registry homes and the spec titles', () => {
  const core = read('reading-core.js');
  const block = core.match(/var BUILT_CHARTS = \{([\s\S]*?)\n {2}\};/);
  assert.ok(block, 'BUILT_CHARTS block present');
  const rows = [...block[1].matchAll(/'([^']+)': \{ page: '([^']*)', hash: '([^']*)', label: '((?:[^'\\]|\\.)*)' \}/g)];
  const byKey = new Map(rows.map((m) => [m[1], { page: m[2], hash: m[3], label: m[4].replace(/\\'/g, "'") }]));
  for (const s of FRAMEWORK_CHART_SPECS) {
    const home = REG.charts[s.chartId];
    for (const key of [s.idx, s.chartId]) {
      const row = byKey.get(key);
      assert.ok(row, `BUILT_CHARTS has ${key}`);
      assert.deepEqual(row, { page: home.route, hash: home.hash, label: `${s.idx} · ${s.title}` }, `BUILT_CHARTS ${key}`);
    }
  }
});
