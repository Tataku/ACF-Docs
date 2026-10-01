/**
 * Chart concept links and Part source rows (D-CONCEPT-LINKS, D-CHART-DATA-POLICY)
 *
 * Run: node --test tests/chart-concept-links.test.mjs
 *
 * Chips and hovers sent readers to Parts that never discuss the named concept
 * ('Carry posture', convexity windows in Part 6), and one concept linked to two
 * or three Parts. Pinned here: one concept map, every target anchor exists on
 * its page, every Part source row names a real heading in the anchored section,
 * and the renderer opens book links in the same tab.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FRAMEWORK_CHART_SPECS, CONCEPT_LINKS, RETIRED_CONCEPT_LABELS, PART_ROUTES } from '../components/framework-charts/chart-specs.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const REG = JSON.parse(read('public/site-b/navigation-registry.json'));
const FILE_BY_ROUTE = Object.fromEntries(REG.pages.map((p) => [p.route, p.file]));
const html = (route) => read(`public/site-b/${FILE_BY_ROUTE[route]}`);

const decode = (t) => t.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&rsquo;/g, '’')
  .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().replace(/\.$/, '');
// The h2 of a section and the h3 sub-headings inside it (chart figures excluded).
function headings(route, anchor) {
  const page = html(route);
  const secs = [...page.matchAll(/<section\b[^>]*\bid="([^"]+)"/g)];
  const i = secs.findIndex((m) => m[1] === anchor);
  if (i < 0) return null;
  const body = page.slice(secs[i].index, i + 1 < secs.length ? secs[i + 1].index : page.length)
    .replace(/<figure\b[\s\S]*?<\/figure>/g, '');
  return [...body.matchAll(/<h([23])\b[^>]*>([\s\S]*?)<\/h\1>/g)].map((m) => decode(m[2]));
}

test('the concept map points every label at a section that exists', () => {
  const labels = Object.keys(CONCEPT_LINKS);
  assert.ok(labels.length > 40, 'the map is populated');
  for (const [label, href] of Object.entries(CONCEPT_LINKS)) {
    const [route, anchor] = href.split('#');
    assert.ok(Object.values(PART_ROUTES).includes(route), `${label}: ${route} is a Part route`);
    assert.ok(anchor, `${label}: ${href} names a section`);
    assert.ok(headings(route, anchor), `${label}: ${route} has a section #${anchor}`);
  }
  RETIRED_CONCEPT_LABELS.forEach((l) => assert.ok(!(l in CONCEPT_LINKS), `retired label ${l} is not on the map`));
});

test('every chip, hover concept and explainerConcept uses a map label and its target', () => {
  for (const s of FRAMEWORK_CHART_SPECS) {
    assert.ok(s.explainerConcept in CONCEPT_LINKS, `${s.chartId}: explainerConcept ${s.explainerConcept}`);
    for (const c of s.concepts || []) assert.equal(c.link, CONCEPT_LINKS[c.label], `${s.chartId}: chip ${c.label}`);
    const chips = (s.concepts || []).map((c) => c.label);
    assert.equal(new Set(chips).size, chips.length, `${s.chartId}: no chip repeats`);
    for (const h of s.hoverTargets || []) {
      if (h.concept === undefined && h.link === undefined) continue;
      assert.ok(h.concept in CONCEPT_LINKS, `${s.chartId}/${h.id}: concept ${h.concept}`);
      assert.equal(h.link, CONCEPT_LINKS[h.concept], `${s.chartId}/${h.id}: READ link for ${h.concept}`);
    }
  }
});

test('Part source rows read "Rule stated in Part N · <heading>" and the heading is in the anchored section', () => {
  let rows = 0;
  for (const s of FRAMEWORK_CHART_SPECS) {
    const parts = (s.sources || []).filter((r) => /^\/part-\d-/.test(r.url || ''));
    for (const r of parts) {
      rows += 1;
      const [route, anchor] = r.url.split('#');
      const n = Object.entries(PART_ROUTES).find(([, v]) => v === route)?.[0];
      assert.ok(n, `${s.chartId}: ${r.url} is a Part route`);
      const m = (r.label || '').match(new RegExp(`^Rule stated in Part ${n} · (.+)$`));
      assert.ok(m, `${s.chartId}: label '${r.label}'`);
      assert.equal(r.role, 'verifies-concept', `${s.chartId}: ${r.label} role`);
      const found = headings(route, anchor || '');
      assert.ok(found, `${s.chartId}: ${r.url} has a section`);
      assert.ok(found.includes(m[1]), `${s.chartId}: '${m[1]}' is a heading in ${r.url} (${found.join(' | ')})`);
      if (s.visualDataMode === 'representative' || s.visualDataMode === 'historical') {
        assert.notEqual(s.group, `part-${n}`, `${s.chartId}: a ${s.visualDataMode} chart does not cite its own Part as evidence`);
      }
    }
    if (s.group === 'part-1' && (s.sources || []).length) {
      assert.ok(!(s.sources || []).every((r) => /^\/part-1-/.test(r.url || '')), `${s.chartId}: does not cite only Part 1`);
    }
  }
  assert.ok(rows > 0, 'Part source rows exist');
});

test('the renderer opens a book source in the same tab and an external source in a new one', () => {
  const jsx = read('components/framework-charts/FrameworkChart.jsx');
  const i = jsx.indexOf('function SourceFooter');
  const footer = jsx.slice(i, jsx.indexOf('\nfunction ', i + 10));
  const internal = footer.match(/s\.url\.startsWith\('\/'\)\s*\?\s*(<a\b[^>]*>[^<]*<\/a>)\s*:\s*(<a\b[^>]*>[^<]*<\/a>)/);
  assert.ok(internal, 'the source link branches on internal versus external URLs');
  assert.doesNotMatch(internal[1], /_blank|↗/, 'a book source is a same-tab link with no external arrow');
  assert.match(internal[1], />Read</, 'and it reads "Read"');
  assert.match(internal[2], /target="_blank"/, 'an external source opens a new tab');
  assert.match(internal[2], /↗/, 'and keeps the external arrow');
});
