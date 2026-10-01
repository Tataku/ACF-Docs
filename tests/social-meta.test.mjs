// The cloned reference pages must never carry Part 6's social identity.
//
// glossary, framework-in-math and framework-in-pictures are built by cloning
// Part 6's shell. Each generator stamps its own og/twitter block and share
// links (scripts/social-meta.mjs) before it writes, so a generator run on its
// own, outside prebuild, cannot leave a page that shares as Part 6.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { stampSocialMeta } from '../scripts/social-meta.mjs';

const SITE = path.resolve(import.meta.dirname, '..', 'public', 'site-b');
const donor = fs.readFileSync(path.join(SITE, 'part-6-convexity-scoring.html'), 'utf8');

test('stamping a cloned Part 6 shell replaces the donor identity', () => {
  const clone = donor
    .replace(/<link rel="canonical" href="[^"]*">/, '<link rel="canonical" href="https://docs.acfdashboard.com/glossary">')
    .replace(/<title>[\s\S]*?<\/title>/, '<title>Glossary &middot; The Adaptive Convexity Framework</title>');
  const out = stampSocialMeta(clone, 'glossary');
  assert.match(out, /<meta property="og:url" content="https:\/\/docs\.acfdashboard\.com\/glossary">/);
  assert.match(out, /<meta property="og:title" content="Glossary &middot; The Adaptive Convexity Framework">/);
  assert.doesNotMatch(out, /og:[^>]*part-6|twitter:[^>]*Part 6|data-share="x" href="[^"]*Part%206/);
  assert.equal((out.match(/BEGIN generated social meta/g) || []).length, 1, 'exactly one social block');
});

test('stamping is idempotent', () => {
  const once = stampSocialMeta(donor, 'part-6-convexity-scoring');
  assert.equal(stampSocialMeta(once, 'part-6-convexity-scoring'), once);
});

for (const page of ['glossary', 'framework-in-math', 'framework-in-pictures']) {
  test(`${page}.html shares as itself`, () => {
    const html = fs.readFileSync(path.join(SITE, `${page}.html`), 'utf8');
    const canonical = html.match(/<link rel="canonical" href="([^"]*)">/)[1];
    assert.match(html, new RegExp(`<meta property="og:url" content="${canonical.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}">`));
    assert.doesNotMatch(html, /og:(?:title|url)" content="[^"]*(?:Part 6|part-6)/);
  });
}
