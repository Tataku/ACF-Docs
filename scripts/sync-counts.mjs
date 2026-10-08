#!/usr/bin/env node
/**
 * Sync every count of a generated set into the hand-authored pages that quote it.
 *
 * WHY THIS EXISTS. A cardinality written into prose is a second source of truth,
 * and it drifts silently — nothing breaks, the page just starts lying. This repo
 * has already been bitten three times: the cover tile said "Glossary · 20 terms"
 * against a 28-term file; the part-page exhibit gates were typed by hand from the
 * gallery; and an "anchored set of eleven spot funds" froze a list that grows
 * every time an issuer launches one.
 *
 * TWO DIFFERENT BUGS, TWO DIFFERENT FIXES.
 *
 *   1. A count of a set THIS REPO OWNS (exhibits, glossary terms) is legitimate
 *      to display — it just must be derived, never typed. That is this script.
 *
 *   2. A count of a set that GROWS OUTSIDE THIS REPO (spot-ETF allowlists,
 *      cohort signal registries, extraction chapters) must not be published as a
 *      number at all. Prose describes the membership rule instead. That is an
 *      editorial rule, enforced by `audit:counts` in check mode below.
 *
 * Run: npm run sync:counts        (rewrite)
 *      npm run audit:counts       (verify, non-zero exit on drift)
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SITE = path.join(ROOT, 'public', 'site-b');
const CHECK = process.argv.includes('--check');

// Authors type either the entity or the literal character. A count rule that only
// matched one of them would silently skip the page instead of syncing it.
const DOT = String.raw`(?:&middot;|\u00b7)`;

const reg = JSON.parse(fs.readFileSync(path.join(SITE, 'navigation-registry.json'), 'utf8'));
const glossary = JSON.parse(fs.readFileSync(path.join(SITE, 'acf-glossary.json'), 'utf8'));

// The registry is dual-keyed (idx + chartId); collapse to one entry per chart.
const charts = new Map();
for (const c of Object.values(reg.charts)) charts.set(c.chartId, c);

// ---- reading time: derived from the prose, never typed -----------------------
// A reading time is a count of the same kind as the two above: it restates a
// fact about content that lives somewhere else. It was stated TWICE by hand —
// once on the cover card, once in the part page's own kicker — so the two drifted
// apart on all six parts. Measured 2026-09-15: the cover claimed 12 minutes for a
// part whose own header said 18, 22 for one that said 13, and Parts 1 and 2 were
// transposed. A reader planning an evening was being told the wrong number before
// they clicked, and a different one after.
//
// WPM is not a guess. It is the rate implied by the six hand-authored page
// headers (226, 237, 226, 227, 234, 232 words per minute), so at 230 the derived
// value reproduces every page's existing number exactly: the prose becomes the
// source without rewriting a single page, and the correction lands where the
// drift actually is.
//
// Boundary: chart exhibits are not prose. Each <figure data-fc-chart> holds a
// fallback generated from its spec (sync-chart-fallbacks) that the live chart
// replaces at runtime, so the contents of those figures are not counted. This
// measures prose, which is what a reading time is about, and regenerating a
// fallback can never move a reading time.
const WPM = 230;
const PART_FILES = [
  [1, 'part-1-foundation.html'],
  [2, 'part-2-lineage-macro.html'],
  [3, 'part-3-bitcoin-convexity.html'],
  [4, 'part-4-tax-architecture.html'],
  [5, 'part-5-portfolio-construction.html'],
  [6, 'part-6-convexity-scoring.html'],
];

const CHART_FIGURE = /<figure\b[^>]*\bdata-fc-chart="[^"]*"[^>]*>[\s\S]*?<\/figure>/g;

function proseWords(file) {
  const html = fs.readFileSync(path.join(SITE, file), 'utf8');
  const main = (html.match(/<main class="shell-main">([\s\S]*?)<\/main>/) || [, ''])[1];
  if (!main) throw new Error(`${file}: no <main class="shell-main"> to measure`);
  const words = main
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(CHART_FIGURE, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ')
    .split(/\s+/).filter(Boolean).length;
  if (!Number.isFinite(words) || words < 230) throw new Error(`${file}: implausible prose length (${words} words)`);
  return words;
}
const WORDS = new Map(PART_FILES.map(([n, file]) => [n, proseWords(file)]));
function readingMinutes(n) {
  return Math.round(WORDS.get(n) / WPM);
}
const MINUTES = new Map(PART_FILES.map(([n]) => [n, readingMinutes(n)]));

// ---- listening time: measured, then scaled with the prose -------------------
// Listening is slower than reading (owner, 2026-10-07: "we say its a 22
// minute read, yet its 40 minutes of audio"), so the pages show both. One flat
// words-per-minute rate predicts the audio badly: the narrator also reads chart
// captions, which the prose count excludes, so the error ran from -8% to +13%
// by Part. Each Part therefore carries its own MEASURED rate: prose words per
// minute of its actual narration. Today that reproduces the recording exactly;
// after an edit the listening time moves with the prose, like the reading time.
// Recalibrate when the voice or the narration rules change: the pre-render log
// (scripts/warm-narration.mjs) prints each Part's audio length.
// Source: production pre-render run 37721876537 (2026-10-08), voice ash,
// gpt-4o-mini-tts-2025-12-15, the first run in which every chart caption is
// narrated on every load (#207). Words = proseWords() at that commit.
const LISTEN_CALIBRATION = new Map([
  [1, { words: 5075, minutes: 40 + 26 / 60 }],
  [2, { words: 3031, minutes: 29 + 19 / 60 }],
  [3, { words: 4709, minutes: 43 + 59 / 60 }],
  [4, { words: 3739, minutes: 33 + 28 / 60 }],
  [5, { words: 6536, minutes: 54 + 43 / 60 }],
  [6, { words: 4586, minutes: 33 + 4 / 60 }],
]);
const LISTEN = new Map(PART_FILES.map(([n]) => {
  const cal = LISTEN_CALIBRATION.get(n);
  return [n, Math.round(WORDS.get(n) * (cal.minutes / cal.words))];
}));
const TOTAL_LISTEN = [...LISTEN.values()].reduce((a, b) => a + b, 0);

// The cover's footer states what the whole book costs a reader. It is the SUM OF
// THE SIX CARD TIMES, not a second measurement of the prose: a reader who adds
// the cards up must land on the number at the foot of the page, and rounding the
// total independently would put the two a minute apart for no reason the reader
// could see.
const TOTAL_MINUTES = [...MINUTES.values()].reduce((a, b) => a + b, 0);

// Minutes BEFORE part n — where its arc starts on the cover footer's reading
// curve. The curve is normalised by `pathLength` to the book's total minutes, so
// an arc of 18 is eighteen minutes of arc and the six of them are the book to
// scale. Those are the same cardinality as every other number in this file: a
// fact about the prose, restated in markup, and therefore derived here rather
// than typed into an SVG where nothing would ever check it again.
const MINUTES_BEFORE = (n) => PART_FILES.slice(0, n - 1).reduce((a, [p]) => a + MINUTES.get(p), 0);

const TERMS = glossary.terms.length;

// Part 1 in Pictures states how many exhibits it carries (D-PART1-PICTURES).
// Its exhibits are its chart mounts, so the count is read off the page itself:
// adding or dropping a mount changes the kicker on the next sync, not by hand.
const P1_PICTURES = (fs.readFileSync(path.join(SITE, 'part-1-pictures.html'), 'utf8')
  .match(/<figure\b[^>]*\bdata-fc-chart="[^"]+"/g) || []).length;
const EXHIBITS = charts.size;
const perPart = (n) => [...charts.values()].filter((c) => c.part === n).length;

// page → [ {re, build(count)} ]; every rule is anchored on surrounding markup so a
// stray number elsewhere on the page is never touched.
const RULES = [
  ['cover-docs.html', [
    // Neither cover tile quotes a count any more (owner, 2026-09-15): each leads
    // to the whole of its thing, so a number on it only ages. Both counts still
    // have a home on _index.html, which is why EXHIBITS and TERMS are still
    // derived and still audited — and why the rules went WITH the markers they
    // matched. A rule left behind does not fail at the edit; it reports drift on
    // every run afterwards, until the audit is noise people learn to skip.
    // One rule per card, anchored on that card's own data-part so a reading time
    // can never be written onto the wrong Part (which is how 1 and 2 were swapped).
    ...PART_FILES.map(([n]) => [new RegExp(`(data-part="${n}"[\\s\\S]*?&approx; )\\d+( min read)`), () => MINUTES.get(n)]),
    ...PART_FILES.map(([n]) => [new RegExp(`(data-part="${n}"[\\s\\S]*? min read ${DOT} &approx; )\\d+( min listen)`), () => LISTEN.get(n)]),
    // The running head states the size of the book, and it is the one number in
    // the colophon that JS never rewrites — so this is its only writer.
    [/(data-foot-total>&approx; )\d+( min end to end)/, () => TOTAL_MINUTES],
    [/(data-foot-listen>&approx; )\d+( min to listen)/, () => TOTAL_LISTEN],
    // The stage normalises the ticks' positions to the same total the arcs use.
    [/(class="foot-stage" style="--total: )\d+(")/, () => TOTAL_MINUTES],
    // The ticks: one per Part, each spanning its own columns. Anchored on the
    // tick's own data-foot-tick for the same reason the arcs and cards are.
    ...PART_FILES.map(([n]) => [new RegExp(`(data-foot-tick="${n}" style="--at: )\\d+(;)`), () => MINUTES_BEFORE(n)]),
    ...PART_FILES.map(([n]) => [new RegExp(`(data-foot-tick="${n}" style="--at: \\d+; --len: )\\d+(")`), () => MINUTES.get(n)]),
    // The axis prints each Part's minutes under its numeral, and the contents
    // page prints them again where a page number would stand. Two more places
    // the same fact is stated, so two more anchored rules; both are anchored on
    // the Part's own ordinal so a time can never land under the wrong stretch.
    ...PART_FILES.map(([n]) => [new RegExp(`(data-foot-tick="${n}"[^>]*><span class="foot-tick-n">0${n}</span><span class="foot-tick-min">)\\d+( min)`), () => MINUTES.get(n)]),
    ...PART_FILES.map(([n]) => [new RegExp(`(data-foot-part-min="${n}">)\\d+( min)`), () => MINUTES.get(n)]),
    // One rule per arc, anchored on that arc's own data-foot-arc, so a length can
    // never be written onto the wrong Part — the failure the per-card rule above
    // was added for after 1 and 2 were transposed.
    ...PART_FILES.map(([n]) => [new RegExp(`(data-foot-arc="${n}" pathLength=")\\d+(")`), () => TOTAL_MINUTES]),
    ...PART_FILES.map(([n]) => [new RegExp(`(data-foot-arc="${n}" pathLength="\\d+" style="--arc-len: )\\d+(;)`), () => MINUTES.get(n)]),
    ...PART_FILES.map(([n]) => [new RegExp(`(data-foot-arc="${n}" pathLength="\\d+" style="--arc-len: \\d+; --arc-at: )\\d+(")`), () => MINUTES_BEFORE(n)]),
  ]],
  ['_index.html', [
    [new RegExp(`(generated ${DOT} all )\\d+( exhibits)`), () => EXHIBITS],
    [new RegExp(`(generated ${DOT} )\\d+( terms)`), () => TERMS],
  ]],
  ...PART_FILES.map(([n, file]) => [file, [
    [new RegExp(`(Part ${n} of 6 ${DOT} &approx; )\\d+( min read)`), () => MINUTES.get(n)],
    [new RegExp(`(Part ${n} of 6 ${DOT} &approx; \\d+ min read ${DOT} &approx; )\\d+( min listen)`), () => LISTEN.get(n)],
  ]]),
  ['part-1-foundation.html',             [[new RegExp(`(#foundation">In pictures ${DOT} )\\d+( exhibits)`),   () => perPart(1)]]],
  ['part-1-pictures.html',               [[new RegExp(`(<p class="doc-kicker">Part 1 ${DOT} A visual essay ${DOT} )\\d+( exhibits</p>)`), () => P1_PICTURES]]],
  ['part-2-lineage-macro.html',          [[new RegExp(`(#lineage">In pictures ${DOT} )\\d+( exhibits)`),      () => perPart(2)]]],
  ['part-3-bitcoin-convexity.html',      [[new RegExp(`(#backbone">In pictures ${DOT} )\\d+( exhibits)`),     () => perPart(3)]]],
  ['part-4-tax-architecture.html',       [[new RegExp(`(#tax">In pictures ${DOT} )\\d+( exhibits)`),          () => perPart(4)]]],
  ['part-5-portfolio-construction.html', [[new RegExp(`(#construction">In pictures ${DOT} )\\d+( exhibits)`), () => perPart(5)]]],
  ['part-6-convexity-scoring.html',      [[new RegExp(`(#scoring">In pictures ${DOT} )\\d+( exhibits)`),      () => perPart(6)]]],
];

const drift = [];
let written = 0;

for (const [file, rules] of RULES) {
  const abs = path.join(SITE, file);
  let html = fs.readFileSync(abs, 'utf8');
  const before = html;

  for (const [re, count] of rules) {
    const n = count();
    if (!re.test(html)) {
      drift.push(`${file}: expected a derived count matching ${re} — marker missing`);
      continue;
    }
    html = html.replace(re, (_m, pre, post) => `${pre}${n}${post}`);
  }

  if (html !== before) {
    if (CHECK) {
      // Report the actual divergence rather than a fixed vocabulary: reading
      // times drift too, and a message that only knows "exhibits|terms" would
      // print two identical strings and explain nothing.
      const shown = [];
      for (let i = 0; i < before.length && shown.length < 4; i += 1) {
        if (before[i] === html[i]) continue;
        shown.push(`"${before.slice(Math.max(0, i - 40), i + 20).replace(/\s+/g, ' ').trim()}" -> "${html.slice(Math.max(0, i - 40), i + 20).replace(/\s+/g, ' ').trim()}"`);
        while (i < before.length && before[i] !== html[i]) i += 1;
      }
      drift.push(`${file}: stale derived value — ${shown.join(' | ')}`);
    } else {
      fs.writeFileSync(abs, html);
      written += 1;
    }
  }
}

// ---- editorial rule: no published count of a set that grows outside this repo --
const FORBIDDEN = [
  [/\b(?:eleven|twelve|ten|nine|eight|seven|six|\d{1,3})[- ](?:spot funds|spot etfs?|spot wrappers)\b/i,
   'spot-fund allowlist grows as issuers launch — describe the membership rule, not the count'],
  [/\b(?:ten|eleven|twelve|nine|eight|\d{1,3})[- ](?:cohort signals|signals are evaluated|conditions are evaluated)\b/i,
   'the cohort signal registry grows — describe the rule, not the count'],
  [/\b(?:twelve|eleven|ten|\d{1,3})[- ]chapters\b/i,
   'the extraction track gains chapters — name what is published instead of counting'],
];
for (const file of fs.readdirSync(SITE).filter((f) => f.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(SITE, file), 'utf8');
  const main = (html.match(/<main class="shell-main">([\s\S]*?)<\/main>/) || [, ''])[1];
  const text = main.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  for (const [re, why] of FORBIDDEN) {
    const hit = text.match(re);
    if (hit) drift.push(`${file}: "${hit[0].trim()}" — ${why}`);
  }
}

if (drift.length) {
  console.error(`Count audit FAILED (${drift.length}):`);
  for (const d of drift) console.error(`  - ${d}`);
  process.exit(1);
}
console.log(
  CHECK
    ? `Count audit passed: ${EXHIBITS} exhibits, ${TERMS} terms — every quoted count matches its source, no growth-set counts published.`
    : `Counts synced: ${EXHIBITS} exhibits, ${TERMS} terms across ${RULES.length} pages (${written} rewritten).`
);
