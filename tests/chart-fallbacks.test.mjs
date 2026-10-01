/**
 * Chart fallbacks: what a reader without JavaScript, a crawler or an agent gets
 *
 * Run: node --test tests/chart-fallbacks.test.mjs
 *
 * Every exhibit is a React island mounted into <figure data-fc-chart>. Whatever
 * sits inside that figure before the island mounts is the only version of the
 * chart that HTML readers ever see. Until D-CHART-FALLBACKS that was either
 * nothing (Parts 2 to 6, the cover, the Pictures page) or a hand-drawn Part 1
 * exhibit that disagreed with the live chart. The fallback is now written from
 * the spec by scripts/sync-chart-fallbacks.mjs. These tests hold the wiring,
 * the content contract and the no-JS presentation to that design.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { FRAMEWORK_CHART_SPECS } from '../components/framework-charts/chart-specs.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(ROOT, 'public', 'site-b');
const PKG = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const CSS = fs.readFileSync(path.join(SITE, 'reading-system.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');
const PAGES = fs.readdirSync(SITE).filter((f) => f.endsWith('.html') && !f.startsWith('_'));
const SPECS = new Map(FRAMEWORK_CHART_SPECS.map((s) => [s.chartId, s]));
const FIG = /<figure\b([^>]*\bdata-fc-chart="([^"]+)"[^>]*)>([\s\S]*?)<\/figure>/g;

const figures = () => PAGES.flatMap((page) =>
  [...fs.readFileSync(path.join(SITE, page), 'utf8').matchAll(FIG)].map((m) => ({ page, attrs: m[1], id: m[2], inner: m[3] })));

test('wiring: sync and audit scripts exist, and prebuild writes fallbacks after the generated pages', () => {
  assert.equal(PKG.scripts['sync:chart-fallbacks'], 'node scripts/sync-chart-fallbacks.mjs');
  assert.equal(PKG.scripts['audit:chart-fallbacks'], 'node scripts/sync-chart-fallbacks.mjs --check');
  const steps = PKG.scripts.prebuild.split('&&').map((s) => s.trim());
  const at = (name) => steps.indexOf(`npm run ${name}`);
  assert.ok(at('sync:chart-fallbacks') > at('build:pictures'), 'after the Pictures page is regenerated with empty mounts');
  assert.equal(at('sync:chart-fallbacks'), at('build:math') + 1, 'right after build:math');
  assert.ok(at('sync:chart-fallbacks') < at('build:crawler'), 'before the crawler files read the pages');
  assert.ok(at('sync:chart-fallbacks') < at('sync:counts'), 'before reading times are measured');
  // The bundle is committed and rebuilt by hand after spec edits; prebuild does not build it.
  assert.equal(at('build:site-b-charts'), -1);
});

test('audit: every page is in step with the specs and every data-mode matches (audit:chart-fallbacks)', () => {
  const r = spawnSync(process.execPath, ['scripts/sync-chart-fallbacks.mjs', '--check'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr || r.stdout);
});

test('content: each mount holds one fallback, written from its own spec', () => {
  const all = figures();
  assert.ok(all.length >= SPECS.size, `expected at least one mount per chart, saw ${all.length}`);
  for (const f of all) {
    const spec = SPECS.get(f.id);
    assert.ok(spec, `${f.page}: ${f.id} names no spec`);
    const caps = f.inner.match(/<figcaption class="fc-fallback" data-fc-fallback="([^"]+)">/g) || [];
    assert.equal(caps.length, 1, `${f.page}: ${f.id} has ${caps.length} fallbacks`);
    assert.match(f.inner, new RegExp(`data-fc-fallback="${f.id}"`), `${f.page}: ${f.id} carries another chart's fallback`);
    assert.ok(f.inner.includes(`<strong>${spec.idx} · `), `${f.page}: ${f.id} fallback names its exhibit number`);
    // The hand-drawn Part 1 exhibits are retired: nothing but the fallback lives in a mount.
    assert.doesNotMatch(f.inner, /<svg\b|class="ex-/, `${f.page}: ${f.id} still carries static exhibit markup`);
  }
});

test('content: a figure that states a data mode states its spec’s mode', () => {
  for (const f of figures()) {
    const mode = (f.attrs.match(/\bdata-mode="([^"]*)"/) || [])[1];
    if (mode === undefined) continue;
    assert.equal(mode, SPECS.get(f.id).visualDataMode, `${f.page}: ${f.id}`);
  }
});

test('content: fallback text carries no em dash', () => {
  for (const f of figures()) {
    assert.doesNotMatch(f.inner, /—|&mdash;/, `${f.page}: ${f.id}`);
  }
});

test('presentation: the tall placeholder never applies to a no-JS reader', () => {
  // An :empty placeholder would leave a 44rem hole in front of a no-JS reader
  // once a mount holds text, and a bare one would apply with JS off.
  assert.doesNotMatch(CSS, /\.fc-mount:empty/);
  const placeholder = [...CSS.matchAll(/([^{}]+)\{[^{}]*min-height:\s*44rem[^{}]*\}/g)].map((m) => m[1].trim());
  assert.ok(placeholder.length > 0, 'a pre-hydration placeholder exists');
  for (const sel of placeholder.join(',').split(',').map((s) => s.trim())) {
    assert.match(sel, /^html\.js\b/, `placeholder selector '${sel}' is scoped to JS readers`);
    assert.match(sel, /:not\(\.fc-live\)/, `placeholder selector '${sel}' drops once the chart mounts`);
  }
  assert.match(CSS, /\.fc-fallback\s*\{/, 'the fallback has its own reading style');
});
