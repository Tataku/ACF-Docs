/**
 * Reading experience — cover truth and cross-page links
 *
 * Run: npm run test:reading-experience
 *
 * Three defects a visitor met on 2026-09-15, each pinned here by the property
 * that was violated rather than by today's values:
 *
 *   1. "Resume reading" was a static link to Part 1 — the same destination as the
 *      primary button beside it — so a reader returning mid-book was sent back to
 *      the start, on a page already marking the parts they had finished.
 *   2. The cover and each part page both stated a reading time for the same prose,
 *      both by hand. They disagreed on all six parts; Parts 1 and 2 were
 *      transposed; one card claimed 22 minutes for a 13-minute part.
 *   3. Three chart exhibits linked a concept chip to the page-relative anchor
 *      `#manifesto`. The charts are re-mounted on /part-1-pictures and
 *      /framework-in-pictures, where no such anchor exists, so the chip was a
 *      dead click on two pages out of three.
 *
 * Every assertion below was first observed in Chromium; these freeze what source
 * can prove so the next edit cannot quietly undo it.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const COVER = read('public/site-b/cover-docs.html');
const CORE = read('public/site-b/reading-core.js');
const SYNC = read('scripts/sync-counts.mjs');
const SPECS = read('components/framework-charts/chart-specs.mjs');
const BUNDLE = read('public/site-b/site-b-charts.js');

const PARTS = [
  [1, 'part-1-foundation.html'],
  [2, 'part-2-lineage-macro.html'],
  [3, 'part-3-bitcoin-convexity.html'],
  [4, 'part-4-tax-architecture.html'],
  [5, 'part-5-portfolio-construction.html'],
  [6, 'part-6-convexity-scoring.html'],
];

// ---------------------------------------------------------------------------
// 1. Resume
// ---------------------------------------------------------------------------
test('resume: the control ships hidden, so a first visit is never offered one', () => {
  // With no stored progress there is nothing to resume, and JS-off readers have
  // no stored progress at all. Hidden is the honest default; the primary
  // "Start with Part 1" button already covers starting.
  const link = COVER.match(/<a class="dc-resume"[^>]*>/);
  assert.ok(link, 'the cover has a resume link');
  assert.match(link[0], /\bhidden\b/, 'it ships hidden');
  assert.match(link[0], /\bdata-resume\b/, 'and is addressable by the painter');
  assert.match(COVER, /<span data-resume-label>/, 'its label is a span the painter can rewrite');
});

test('resume: the painter sends the reader to the first UNFINISHED part', () => {
  const fn = CORE.slice(CORE.indexOf('function progressPaint()'), CORE.indexOf('function sidebarCollapse()'));
  assert.ok(fn.length > 200, 'progressPaint located');
  assert.match(fn, /firstUnread/, 'it tracks the first unfinished part');
  assert.match(fn, /\[data-resume\]/, 'it drives the resume control');
  assert.match(fn, /resume\.setAttribute\('href', href\)/, 'it rewrites the destination');
  assert.match(fn, /resume\.hidden = true/, 'and hides it when there is nothing to resume');
  // The old bug: a selector that matched nothing on this page, so the link kept
  // whatever static href the markup carried.
  assert.doesNotMatch(fn, /querySelector\('\.resume'\)/, 'no orphaned .resume selector');
});

test('resume: the destination is read from the card, not a second route table', () => {
  // Every part card already carries its own href; deriving from it means a route
  // rename cannot leave the resume link pointing at a page that moved.
  const fn = CORE.slice(CORE.indexOf('function progressPaint()'), CORE.indexOf('function sidebarCollapse()'));
  assert.match(fn, /firstUnread\.getAttribute\('href'\)/);
  assert.doesNotMatch(fn, /part-1-foundation/, 'no hard-coded part route in the painter');
  for (const [n] of PARTS) {
    assert.match(COVER, new RegExp(`data-part="${n}"`), `the cover carries a card for Part ${n}`);
  }
});

// ---------------------------------------------------------------------------
// 2. The cover footer's reading curve
// ---------------------------------------------------------------------------
test('curve: the foot of the page ships in the honest first-visit state', () => {
  const dial = COVER.slice(COVER.indexOf('data-foot-progress'), COVER.indexOf('</footer>'));
  assert.ok(dial.length > 200, 'the cover carries a reading curve');
  assert.equal((dial.match(/data-foot-arc=/g) || []).length, PARTS.length, 'one arc per part');
  // A pre-lit arc would be a claim about a reader the page has not met yet —
  // the same lie the static resume href used to tell.
  assert.doesNotMatch(dial, /data-foot-arc[^>]*data-read/, 'no arc ships lit');
  assert.match(dial, /data-foot-count/, 'the count is a node the painter can rewrite');
  assert.match(dial, /data-foot-meta/, 'so is the line under it');
  assert.match(dial, /data-foot-resume-label/, 'and so is the destination label');
});

test('curve: each arc measures its own Part, and the six of them are the book', () => {
  // The claim the whole display rests on: an arc's LENGTH is that Part's reading
  // time. If these fall out of step the curve keeps drawing confidently and
  // silently misstates the shape of the book.
  const arc = (n) => {
    const m = COVER.match(new RegExp(`data-foot-arc="${n}" pathLength="(\\d+)" style="--arc-len: (\\d+); --arc-at: (\\d+)"`));
    assert.ok(m, `Part ${n} has an arc`);
    return { total: Number(m[1]), len: Number(m[2]), at: Number(m[3]) };
  };
  const cardMinutes = (n) => Number(
    (COVER.slice(COVER.indexOf(`data-part="${n}"`)).match(/&approx; (\d+) min read/) || [, NaN])[1]);

  let running = 0;
  for (const [n] of PARTS) {
    const a = arc(n);
    assert.equal(a.len, cardMinutes(n), `Part ${n}: arc is ${a.len}, its card says ${cardMinutes(n)}`);
    assert.equal(a.at, running, `Part ${n}: arc starts at ${a.at}, the parts before it total ${running}`);
    running += a.len;
  }
  assert.equal(arc(1).total, running, `pathLength is ${arc(1).total}, the six arcs total ${running}`);
  for (const [n] of PARTS) assert.equal(arc(n).total, running, `Part ${n} normalises to the same total`);
  assert.match(SYNC, /const MINUTES_BEFORE = /, 'and the offsets are derived, not typed');
});

test('curve: it is painted from the cards, not from a second read of the store', () => {
  const paint = CORE.slice(CORE.indexOf('function progressPaint()'), CORE.indexOf('function footDial('));
  assert.match(paint, /footDial\(rows, firstUnread\)/, 'progressPaint hands the curve the rows it just painted');
  const dial = CORE.slice(CORE.indexOf('function footDial('), CORE.indexOf('function footPeek('));
  assert.ok(dial.length > 200, 'footDial located');
  // Two surfaces reading the same store independently is two surfaces that can
  // disagree, with nothing on the page to say which one is lying.
  assert.doesNotMatch(dial, /readProgress\(\)/, 'the curve never re-reads the store');
  assert.doesNotMatch(dial, /part-1-foundation/, 'no hard-coded part route in the painter');
  assert.match(dial, /arcs\.length !== rows\.length/, 'a curve that does not match the book is left as authored');
  // Minutes are read back off the cards rather than restated in the runtime.
  assert.match(dial, /min read/, 'it reads the per-part minutes off the cards');
  assert.doesNotMatch(dial, /\b95\b/, 'and never carries the total as a literal');
});

// ---------------------------------------------------------------------------
// 3. Reading time
// ---------------------------------------------------------------------------
test('reading time: the footer states the sum of the six cards, not its own count', () => {
  // The running head's book line is the one number in the colophon JS never
  // rewrites (the reader's numbers live beside the figure), so it is anchored on
  // its own hook rather than on the note the painter overwrites.
  const total = Number((COVER.match(/data-foot-total>&approx; (\d+) min end to end/) || [, NaN])[1]);
  const dial = CORE.slice(CORE.indexOf('function footDial('), CORE.indexOf('function footGeometry('));
  assert.doesNotMatch(dial, /data-foot-total/, 'and the painter never touches it');
  assert.ok(Number.isFinite(total), 'the curve states a total');
  let sum = 0;
  for (const [n] of PARTS) {
    const seg = COVER.slice(COVER.indexOf(`data-part="${n}"`));
    sum += Number((seg.match(/&approx; (\d+) min read/) || [, 0])[1]);
  }
  assert.equal(total, sum, `the footer says ${total} min; the cards add to ${sum}`);
  assert.match(SYNC, /const TOTAL_MINUTES = /, 'and the total is derived, not typed');
});

test('reading time: the cover and the page state the same number for every part', () => {
  const coverTimes = {};
  for (const [n] of PARTS) {
    const seg = COVER.slice(COVER.indexOf(`data-part="${n}"`));
    coverTimes[n] = Number((seg.match(/&approx; (\d+) min read/) || [, NaN])[1]);
  }
  for (const [n, file] of PARTS) {
    const page = Number((read(`public/site-b/${file}`).match(/Part \d of 6 &middot; &approx; (\d+) min read/) || [, NaN])[1]);
    assert.ok(Number.isFinite(page), `Part ${n} states a reading time`);
    assert.equal(coverTimes[n], page, `Part ${n}: cover says ${coverTimes[n]}, page says ${page}`);
  }
});

test('reading time: it is derived from the prose, at a rate that is written down', () => {
  assert.match(SYNC, /const WPM = \d{3};/, 'the rate is a named constant');
  assert.match(SYNC, /function readingMinutes\(/, 'minutes come from counting words');
  assert.match(SYNC, /const MINUTES = new Map\(/, 'once per part, shared by both surfaces');
  // Anchored on the card's own data-part, which is what stops a time being
  // written onto the wrong Part — the way 1 and 2 came to be transposed.
  assert.match(SYNC, /data-part="\$\{n\}"/, 'the cover rule is anchored per card');
  assert.match(SYNC, /Part \$\{n\} of 6/, 'the page rule is anchored per page');
});

test('reading time: the audit fails on drift (sync:counts --check)', () => {
  const r = spawnSync(process.execPath, ['scripts/sync-counts.mjs', '--check'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr || r.stdout);
});

test('reading time: every stated value matches the word count at the stated rate', () => {
  const wpm = Number(SYNC.match(/const WPM = (\d+);/)[1]);
  for (const [n, file] of PARTS) {
    const html = read(`public/site-b/${file}`);
    const main = (html.match(/<main class="shell-main">([\s\S]*?)<\/main>/) || [, ''])[1];
    const words = main
      .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;|&#\d+;/gi, ' ')
      .split(/\s+/).filter(Boolean).length;
    const stated = Number(html.match(/Part \d of 6 &middot; &approx; (\d+) min read/)[1]);
    assert.equal(stated, Math.round(words / wpm), `Part ${n}: ${words} words at ${wpm} wpm`);
  }
});

// ---------------------------------------------------------------------------
// 4. Chart concept links
// ---------------------------------------------------------------------------
test('charts: no concept link is page-relative — a chart is mounted on several pages', () => {
  // The whole defect in one property: an exhibit does not know which page it is
  // on, so any link it carries has to name its own destination.
  const bare = SPECS.match(/link: '#[^']+'/g);
  assert.equal(bare, null, `page-relative chart links: ${bare && bare.join(', ')}`);
  assert.match(SPECS, /link: '\/part-1-foundation#manifesto'/, 'the repaired links name their page');
});

test('charts: the built bundle carries the repaired links, not just the spec', () => {
  // A spec edit that never reaches public/site-b/site-b-charts.js changes nothing
  // a visitor can see; the bundle is a committed artifact built separately from
  // prebuild (npm run build:site-b-charts).
  const abs = (BUNDLE.match(/\/part-1-foundation#manifesto/g) || []).length;
  const stale = (BUNDLE.match(/"#manifesto"|'#manifesto'/g) || []).length;
  assert.equal(abs, 6, `bundle carries all six repaired links (found ${abs})`);
  assert.equal(stale, 0, 'and no page-relative survivor');
});

test('charts: the anchor those links point at actually exists', () => {
  assert.match(read('public/site-b/part-1-foundation.html'), /id="manifesto"/);
});
