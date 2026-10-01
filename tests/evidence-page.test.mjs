/**
 * Evidence page — the numbers it cites must be the numbers the repo holds
 *
 * Run: npm run test:evidence-page
 *
 * The Evidence page exists to be checked, so a stale count on it is worse than
 * a stale count anywhere else. scripts/build-evidence-page.mjs reads the check
 * counts from the test files and the readings of Part 1's tests from
 * scripts/part1-history.mjs; these assertions hold the COMMITTED page to the
 * same sources, so a test added without a rebuild reddens here instead of
 * shipping a wrong number.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readings } from '../scripts/part1-history.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const PAGE = read('public/site-b/evidence.html');
const main = PAGE.slice(PAGE.indexOf('<main'), PAGE.indexOf('</main>'));
const count = (rel) => (read(rel).match(/^test\(/gm) || []).length;

test('evidence: the recomputation counts are the counts in the test files', () => {
  for (const rel of ['tests/worked-examples.test.mjs', 'tests/part1-history.test.mjs']) {
    // The page counts top-level test() calls; a nested or describe()d check would
    // run without being counted, and the cited number would understate the suite.
    assert.doesNotMatch(read(rel), /^[ \t]+test\(|\bdescribe\(|\bit\(/m, `${rel} keeps every check at top level`);
  }
  const worked = count('tests/worked-examples.test.mjs');
  const history = count('tests/part1-history.test.mjs');
  assert.ok(worked > 0 && history > 0);
  assert.match(main, new RegExp(`from the inputs its page states \\(${worked} checks\\)`), 'claims ledger cites the worked-example count');
  assert.match(main, new RegExp(`Among the suite&rsquo;s checks, ${worked} recompute the worked examples`), 'open arithmetic cites the worked-example count');
  assert.match(main, new RegExp(`committed public data \\(${history} checks\\)`), 'claims ledger cites the history count');
  assert.match(main, new RegExp(`Another ${history} recompute every figure Part 1 derives`), 'open arithmetic cites the history count');
});

test('evidence: the readings of Part 1’s tests are the computed readings', () => {
  const R = readings();
  const f2 = (x) => x.toFixed(2);
  const neg = (x) => (x < 0 ? `&minus;${f2(-x)}` : f2(x));
  const g = R.policyGap;
  const expected = [
    `1928&ndash;2025: ${f2(R.mix.since1928)} percent a year; at least 4 percent in ${R.mix.decadesAt4.hit} of ${R.mix.decadesAt4.n} rolling ten-year periods`,
    `1946&ndash;1974: ${f2(R.mix.liquidation1946to1974)} percent; 1982&ndash;2021: ${f2(R.mix.fallingRates1982to2021)} percent; 2022&ndash;2025: ${f2(R.mix.known2022to2025)} percent (not counted)`,
    `1928&ndash;2025: ${f2(R.bond.since1928)} percent a year; above 1.5 percent in ${R.bond.decadesAbove1point5.hit} of ${R.bond.decadesAbove1point5.n} rolling ten-year periods`,
    `1946&ndash;1974: ${neg(R.bond.liquidation1946to1974)} percent; 2022&ndash;2025: ${neg(R.bond.known2022to2025)} percent (not counted)`,
    `The gap was 1 point or more for ${g.longestRun.len} months`,
    `core PCE inflation bottomed at ${f2(g.coreLow.value)} percent`,
    `gap ${f2(g.latest.gap)} points, core PCE inflation ${f2(g.latest.core)} percent`,
  ];
  for (const s of expected) assert.ok(main.includes(s), `page carries: ${s}`);
});

test('evidence: every in-page link lands on a section of the page', () => {
  const ids = new Set([...main.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  for (const [, id] of main.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.has(id), `#${id} exists on the page`);
  for (const id of ['ledger', 'limits', 'forward', 'corrections', 'arithmetic', 'tests', 'review', 'disclosures']) {
    assert.ok(ids.has(id), `section #${id} exists`);
  }
});

test('evidence: reachable on its slug, listed in every registry, and linked from Part 1’s tests', () => {
  assert.match(read('next.config.mjs'), /\{ source: "\/evidence", destination: "\/site-b\/evidence\.html" \}/);
  assert.match(read('scripts/site-titles.mjs'), /file: 'evidence\.html'/);
  assert.match(read('scripts/social-cards.config.mjs'), /'evidence'/);
  assert.match(read('scripts/build-navigation-registry.mjs'), /'evidence\.html': '\/evidence'/);
  assert.match(PAGE, /<link rel="canonical" href="https:\/\/docs\.acfdashboard\.com\/evidence">/);

  const part1 = read('public/site-b/part-1-foundation.html');
  assert.match(part1, /href="\/evidence#tests"/, 'Part 1 points readers at the method and readings');
  assert.match(part1, /id="falsifiers"/, 'the Evidence page links back to Part 1#falsifiers, which must exist');

  // The sidebar's Reference block lists Evidence on every page that carries one.
  for (const f of fs.readdirSync(path.join(ROOT, 'public/site-b')).filter((n) => n.endsWith('.html'))) {
    const html = read(`public/site-b/${f}`);
    const at = html.indexOf('<p class="side-movement">Reference</p>');
    if (at === -1) continue;
    const block = html.slice(at, html.indexOf('</ul>', at));
    assert.match(block, /href="\/evidence"/, `${f}: the sidebar's Reference block lists Evidence`);
  }
});

test('evidence: the byline carries the pen name only', () => {
  // The author publishes as Dale Edward. The page must not carry a legal name or
  // a personal contact; corrections go to the public issue tracker.
  assert.match(main, /<p class="doc-byline">By Dale Edward &middot;/);
  assert.match(main, /href="https:\/\/github\.com\/[^/"]+\/ACF-Docs\/issues\/new"/);
  assert.doesNotMatch(PAGE, /mailto:/);
});
