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

const TERMS = glossary.terms.length;
const EXHIBITS = charts.size;
const perPart = (n) => [...charts.values()].filter((c) => c.part === n).length;

// page → [ {re, build(count)} ]; every rule is anchored on surrounding markup so a
// stray number elsewhere on the page is never touched.
const RULES = [
  ['cover-docs.html', [
    [new RegExp(`(The Framework in Pictures ${DOT} )\\d+( exhibits)`), () => EXHIBITS],
    [new RegExp(`(Glossary ${DOT} )\\d+( terms)`), () => TERMS],
  ]],
  ['_index.html', [
    [new RegExp(`(generated ${DOT} all )\\d+( exhibits)`), () => EXHIBITS],
    [new RegExp(`(generated ${DOT} )\\d+( terms)`), () => TERMS],
  ]],
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
      const was = [...before.matchAll(/&middot; (\d+) (exhibits|terms)/g)].map((m) => m[0]).join(', ');
      const now = [...html.matchAll(/&middot; (\d+) (exhibits|terms)/g)].map((m) => m[0]).join(', ');
      drift.push(`${file}: stale count — page says [${was}], sources say [${now}]`);
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
