/**
 * Analytics tag — every routed page carries the Zenovay tracker exactly once
 *
 * Run: node --test tests/analytics-tag.test.mjs
 *
 * WHY THIS FILE EXISTS. Four pages (glossary, pictures, math, evidence) are not
 * authored: their generators clone Part 6's shell. A tag added by hand to one of
 * those pages is erased by the next build, and a tag left out of the donor never
 * reaches them. Either way the page still renders perfectly, so a page silently
 * dropping out of the stats is invisible to every other check. The route list is
 * read from next.config.mjs, so a new page joins this contract when it is routed.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nextConfig from '../next.config.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TAG = /<script\b[^>]*\bsrc="https:\/\/api\.zenovay\.com\/z\.js"[^>]*>\s*<\/script>/g;
const TRACKING_CODE = 'ZV_ZujEmoTp7ONXlB0hYTgnJk5J';

const { beforeFiles } = await nextConfig.rewrites();
const pages = [...new Set(beforeFiles.map((r) => r.destination))];

test('the route list is non-empty', () => {
  assert.ok(pages.length > 0, 'no beforeFiles rewrites found in next.config.mjs');
});

for (const page of pages) {
  test(`${page}: one deferred, cookieless tracker in <head>`, () => {
    const html = fs.readFileSync(path.join(ROOT, 'public', page), 'utf8');
    const tags = html.match(TAG) ?? [];
    assert.equal(tags.length, 1, `expected exactly one Zenovay tag, found ${tags.length}`);
    const [tag] = tags;
    assert.ok(html.indexOf(tag) < html.indexOf('</head>'), 'tag must sit inside <head>');
    assert.match(tag, /\bdefer\b/, 'tag must be deferred so it never blocks rendering');
    assert.match(tag, /\bdata-cookieless="true"/, 'tag must declare cookieless mode');
    assert.ok(tag.includes(`data-id="${TRACKING_CODE}"`), 'tag carries the wrong tracking code');
  });
}
