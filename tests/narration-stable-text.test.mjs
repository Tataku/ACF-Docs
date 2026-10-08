/**
 * Narration text is the same on every load.
 *
 * Run: npm run test:narration
 *
 * Every stored narration segment is keyed by a hash of its exact text, and the
 * listening times are calibrated from the recorded audio. Both assume a Part
 * says the same words on every load. It did not: the chart islands render
 * asynchronously, the narration reads their caption paragraphs from the live
 * DOM, and it kept the first text it built. Measured 2026-10-08: Part 2's
 * narration held 5 of its 9 charts on one load and more on another, so two
 * production pre-render runs of an unchanged page produced different segments,
 * and a reader could get a text nothing had pre-recorded.
 *
 * The three properties below close that, and the last keeps the shipped chart
 * bundle built from the island source that states the first one.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const ISLAND = read('components/framework-charts/site-b-island.jsx');
const CLIENT = read('public/site-b/reading-core.js');
const WARM = read('scripts/warm-narration.mjs');

test('the chart island draws every chart synchronously on its first render', () => {
  assert.match(ISLAND, /import \{ flushSync \} from 'react-dom';/);
  assert.match(ISLAND, /flushSync\(\(\) => render\(currentTheme\(\)\)\);/,
    'the first render must not be scheduled: the narration reads the charts it draws');
});

test('the narration never keeps a text built before the charts are drawn', () => {
  assert.match(CLIENT, /function chartsSettled\(\)/);
  assert.match(CLIENT, /if \(!chartsSettled\(\)\) \{ var partial = blocks; blocks = null; return partial; \}/);
  assert.match(CLIENT, /if \(!chartsSettled\(\)\) \{ var partialSegs = segs; segs = null; return partialSegs; \}/);
  assert.match(CLIENT, /settled:\s+chartsSettled/, 'the pre-render needs to ask whether the text is final');
});

test('the pre-render reads a Part only once its text is final', () => {
  assert.match(WARM, /window\.ACFNarration\.settled\(\)/);
});

test('the shipped chart bundle is built from the current island source', async () => {
  const shipped = read('public/site-b/site-b-charts.js');
  // The same options as scripts/build-site-b-charts.mjs, read from it so the
  // two cannot drift; only the output is kept in memory instead of written.
  const script = read('scripts/build-site-b-charts.mjs');
  const opts = script.match(/esbuild\.build\((\{[\s\S]*?\n\})\);/);
  assert.ok(opts, 'build-site-b-charts.mjs no longer has the expected esbuild.build({...}) call');
  const config = new Function(`return (${opts[1]});`)();
  const out = await esbuild.build({ ...config, absWorkingDir: ROOT, write: false, logLevel: 'silent' });
  // assert.ok, not assert.equal: a diff of a 1 MB minified bundle is noise.
  assert.ok(out.outputFiles[0].text === shipped,
    'public/site-b/site-b-charts.js is stale: run npm run build:site-b-charts');
});
