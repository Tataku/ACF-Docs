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
// Boundary: chart exhibits are empty placeholders in the HTML and are hydrated at
// runtime, so their labels are not counted. This measures prose, which is what a
// reading time is about.
const WPM = 230;
const PART_FILES = [
  [1, 'part-1-foundation.html'],
  [2, 'part-2-lineage-macro.html'],
  [3, 'part-3-bitcoin-convexity.html'],
  [4, 'part-4-tax-architecture.html'],
  [5, 'part-5-portfolio-construction.html'],
  [6, 'part-6-convexity-scoring.html'],
];

function readingMinutes(file) {
  const html = fs.readFileSync(path.join(SITE, file), 'utf8');
  const main = (html.match(/<main class="shell-main">([\s\S]*?)<\/main>/) || [, ''])[1];
  if (!main) throw new Error(`${file}: no <main class="shell-main"> to measure`);
  const words = main
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ')
    .split(/\s+/).filter(Boolean).length;
  const minutes = Math.round(words / WPM);
  if (!Number.isFinite(minutes) || minutes < 1) throw new Error(`${file}: implausible reading time from ${words} words`);
  return minutes;
}

const MINUTES = new Map(PART_FILES.map(([n, file]) => [n, readingMinutes(file)]));

const TERMS = glossary.terms.length;
const EXHIBITS = charts.size;
const perPart = (n) => [...charts.values()].filter((c) => c.part === n).length;

// page → [ {re, build(count)} ]; every rule is anchored on surrounding markup so a
// stray number elsewhere on the page is never touched.
const RULES = [
  ['cover-docs.html', [
    [new RegExp(`(The Framework in Pictures ${DOT} )\\d+( exhibits)`), () => EXHIBITS],
    [new RegExp(`(Glossary ${DOT} )\\d+( terms)`), () => TERMS],
    // One rule per card, anchored on that card's own data-part so a reading time
    // can never be written onto the wrong Part (which is how 1 and 2 were swapped).
    ...PART_FILES.map(([n]) => [new RegExp(`(data-part="${n}"[\\s\\S]*?&approx; )\\d+( min read)`), () => MINUTES.get(n)]),
  ]],
  ['_index.html', [
    [new RegExp(`(generated ${DOT} all )\\d+( exhibits)`), () => EXHIBITS],
    [new RegExp(`(generated ${DOT} )\\d+( terms)`), () => TERMS],
  ]],
  ...PART_FILES.map(([n, file]) => [file, [
    [new RegExp(`(Part ${n} of 6 ${DOT} &approx; )\\d+( min read)`), () => MINUTES.get(n)],
  ]]),
  ['part-1-foundation.html',             [[new RegExp(`(#foundation">In pictures ${DOT} )\\d+( exhibits)`),   () => perPart(1)]]],
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
