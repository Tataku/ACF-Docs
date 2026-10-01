/**
 * Site titles: one spelling everywhere (D-TITLES, D-PART1-PICTURES)
 *
 * Run: node --test tests/site-titles.test.mjs
 *
 * A Part's title was spelled three ways across its h1, <title>, sidebar,
 * footer, next-up card and cover card ("and" against "&", an em dash against a
 * colon), and the share code and the social-card renderer both parsed the em
 * dash. scripts/site-titles.mjs now states every title once. The generators
 * read it; the hand-authored pages cannot, so this file holds each of their
 * surfaces to it, and pins the two parsers to the same rule.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  PAGES, PART_TITLES, SITE_NAME, documentTitle, shareText, splitLabel, decodeEntities, descriptionProblems,
} from '../scripts/site-titles.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const SITE = path.join(ROOT, 'public', 'site-b');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const page = (file) => fs.readFileSync(path.join(SITE, file), 'utf8');
const text = (html) => decodeEntities(html.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
const metaContent = (html, attr, name) => {
  const m = html.match(new RegExp(`<meta ${attr}="${name}" content="([^"]*)">`));
  return m ? m[1] : null;
};
const PART_PAGES = PAGES.filter((p) => p.part >= 1 && p.part <= 6 && p.file !== 'part-1-pictures.html');

test('every page: <title> and h1 are the canonical title', () => {
  for (const p of PAGES) {
    const html = page(p.file);
    const title = html.match(/<title>([\s\S]*?)<\/title>/)[1];
    assert.equal(decodeEntities(title), documentTitle(p.label), `${p.file} <title>`);
    const h1 = html.match(/<h1 class="(?:doc-title|dc-title)"[^>]*>([\s\S]*?)<\/h1>/);
    assert.ok(h1, `${p.file} has an h1`);
    assert.equal(text(h1[1]), p.h1, `${p.file} h1`);
  }
});

test('every page: og and twitter titles and the image alt restate the <title> exactly', () => {
  for (const p of PAGES) {
    const html = page(p.file);
    const title = html.match(/<title>([\s\S]*?)<\/title>/)[1];
    for (const [attr, name] of [['property', 'og:title'], ['property', 'og:image:alt'], ['name', 'twitter:title']]) {
      assert.equal(metaContent(html, attr, name), title, `${p.file} ${name}`);
    }
  }
});

test('every page: the meta description is short, dash-free and says something the title does not', () => {
  for (const p of PAGES) {
    const html = page(p.file);
    const description = metaContent(html, 'name', 'description');
    assert.ok(description, `${p.file} has a meta description`);
    assert.deepEqual(descriptionProblems(decodeEntities(description), p.label), [], p.file);
    assert.equal(metaContent(html, 'property', 'og:description'), description, `${p.file} og:description`);
    assert.equal(metaContent(html, 'name', 'twitter:description'), description, `${p.file} twitter:description`);
  }
  assert.equal(
    decodeEntities(metaContent(page('cover-docs.html'), 'name', 'description')),
    'A tax-aware method for compounding through unstable markets: six Parts, from philosophy to scoring, free to read.',
    'the cover description is the ruled sentence',
  );
});

test('sidebars: every page that has one names the six Parts by their canonical titles, in order', () => {
  for (const p of PAGES) {
    const html = page(p.file);
    const nav = html.match(/<nav class="sidebar"[\s\S]*?<\/nav>/);
    if (!nav) continue;
    const labels = [...nav[0].matchAll(/<span class="spnum">(0[1-6])<\/span><span>([\s\S]*?)<\/span>/g)]
      .map((m) => [Number(m[1]), text(m[2])]);
    assert.deepEqual(labels, Object.entries(PART_TITLES).map(([n, t]) => [Number(n), t]), `${p.file} sidebar`);
  }
});

test('footers, next-up cards and cover cards carry the same titles', () => {
  for (const p of PAGES.filter((x) => x.part >= 1 && x.part <= 6)) {
    const foot = page(p.file).match(/<div class="measure foot-base">\s*<span>[^<]*<\/span>\s*<span>([^<]*)<\/span>/);
    assert.ok(foot, `${p.file} footer`);
    assert.equal(decodeEntities(foot[1]), p.label, `${p.file} footer label`);
  }
  for (const p of PART_PAGES.filter((x) => x.part < 6)) {
    const next = page(p.file).match(/<span class="next-up-title">([\s\S]*?)<\/span>/);
    assert.ok(next, `${p.file} next-up`);
    assert.equal(text(next[1]), PART_TITLES[p.part + 1], `${p.file} next-up title`);
  }
  const cards = [...page('cover-docs.html').matchAll(/<p class="dc-card-title">([\s\S]*?)<\/p>/g)].map((m) => text(m[1]));
  assert.deepEqual(cards, Object.values(PART_TITLES), 'cover cards');
  // D-NEXT-UP: each teaser that introduces a Part is that Part's cover card, word for word.
  const coverDescs = [...page('cover-docs.html').matchAll(/<p class="dc-card-desc">([\s\S]*?)<\/p>/g)].map((m) => text(m[1]));
  assert.equal(coverDescs.length, 6, 'six cover card descriptions');
  for (const p of PART_PAGES.filter((x) => x.part < 6)) {
    const teaser = page(p.file).match(/<span class="next-up-teaser">([\s\S]*?)<\/span>/);
    assert.equal(text(teaser[1]), coverDescs[p.part], `${p.file} teaser equals the Part ${p.part + 1} card`);
  }
  const contents = [...page('cover-docs.html').matchAll(/<span class="foot-title">([\s\S]*?)<\/span>/g)].map((m) => text(m[1]));
  assert.deepEqual(contents, Object.values(PART_TITLES), 'cover contents page');
});

test('registry, glossary source references and social cards use the same titles', () => {
  const registry = JSON.parse(page('navigation-registry.json'));
  assert.deepEqual(
    registry.pages.map((p) => [p.file, p.title]),
    PAGES.map((p) => [p.file, p.label]),
    'registry page titles',
  );

  const glossary = JSON.parse(page('acf-glossary.json'));
  for (const t of glossary.terms) {
    for (const m of String(t.source?.ref || '').matchAll(/\bPart (\d)\b( · )?([^;,()]*)/g)) {
      assert.ok(m[2] && m[3].startsWith(PART_TITLES[m[1]]), `${t.id}: "${m[0]}" is not "Part ${m[1]} · ${PART_TITLES[m[1]]}"`);
    }
  }

  const manifest = JSON.parse(page('brand/social/cards.json'));
  for (const p of PAGES) {
    const html = page(p.file);
    const card = manifest.cards[p.file.replace(/\.html$/, '')];
    assert.ok(card, `${p.file} has card art`);
    assert.equal(card.title, html.match(/<title>([\s\S]*?)<\/title>/)[1], `${p.file} card title`);
    assert.equal(card.description, metaContent(html, 'name', 'description'), `${p.file} card description`);
  }
});

test('share text: strip the site name, split on the first " · " and never parse a dash', () => {
  for (const n of Object.keys(PART_TITLES)) {
    const label = shareText(documentTitle(`Part ${n} · ${PART_TITLES[n]}`));
    assert.equal(label, `Part ${n} · ${PART_TITLES[n]}`);
    assert.deepEqual(splitLabel(label), { eyebrow: `Part ${n}`, headline: PART_TITLES[n] });
  }
  assert.equal(shareText(SITE_NAME), SITE_NAME, 'the cover shares the site name');
  assert.deepEqual(splitLabel(shareText(documentTitle('Part 1 in Pictures'))), { eyebrow: null, headline: 'Part 1 in Pictures' });

  // The browser copies of the rule must behave exactly like shareText.
  for (const file of ['public/site-b/reading-core.js', 'public/site-b/cover-docs.js']) {
    const src = read(file);
    const m = src.match(/var title = document\.title\.replace\((\/[^\n]*?\/), ''\)\.trim\(\) \|\| 'The Adaptive Convexity Framework';/);
    assert.ok(m, `${file} derives its share title by stripping the site name`);
    const re = new Function(`return ${m[1]};`)();
    for (const p of PAGES) {
      const title = documentTitle(p.label);
      assert.equal(title.replace(re, '').trim() || SITE_NAME, shareText(title), `${file} on ${p.file}`);
    }
  }
  const cards = read('scripts/build-social-cards.mjs');
  assert.match(cards, /splitLabel\(shareText\(/, 'the card renderer uses the shared rule');
  assert.doesNotMatch(cards, /\[—–-\]/, 'no em-dash parsing left in the card renderer');
});

test('share links: the static hrefs carry the same text the script would send', () => {
  for (const p of PART_PAGES) {
    const html = page(p.file);
    const canonical = html.match(/<link rel="canonical" href="([^"]*)">/)[1];
    const t = encodeURIComponent(p.label);
    const u = encodeURIComponent(canonical);
    assert.ok(html.includes(`data-share="x" href="https://x.com/intent/post?text=${t}&amp;url=${u}"`), `${p.file} X link`);
    assert.ok(html.includes(`data-share="email" href="mailto:?subject=${t}&amp;body=${u}"`), `${p.file} email link`);
  }
});

test('chrome is free of em dashes: no visible text or attribute on any routed page carries one', () => {
  const visible = (html) => html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');
  for (const p of PAGES) {
    const hits = visible(page(p.file)).split('\n').filter((l) => /—|&mdash;|&#8212;|&#x2014;/i.test(l));
    assert.deepEqual(hits.map((l) => l.trim().slice(0, 120)), [], p.file);
  }
  assert.ok(page('cover-docs.html').includes('Educational and analytical, not investment advice.'), 'cover disclaimer');
});

test('Part 1 in Pictures: one name, and a kicker count that matches its mounts', () => {
  const html = page('part-1-pictures.html');
  const mounts = (html.match(/<figure\b[^>]*\bdata-fc-chart="[^"]+"/g) || []).length;
  assert.ok(mounts > 0);
  assert.ok(html.includes(`<p class="doc-kicker">Part 1 &middot; A visual essay &middot; ${mounts} exhibits</p>`), 'kicker count');
  assert.match(read('scripts/sync-counts.mjs'), /part-1-pictures\.html/, 'sync-counts writes the kicker');
  assert.doesNotMatch(html, /Foundation in Pictures/);
});
