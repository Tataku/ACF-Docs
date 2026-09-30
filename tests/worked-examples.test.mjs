/**
 * Worked examples — every published example is recomputed, not re-typed
 *
 * Run: npm run test:worked-examples
 *
 * WHY THIS EXISTS. The Framework in Math promises that "a practitioner, an
 * advisor, or a sceptic can check the arithmetic instead of taking the prose on
 * faith". Until 2026-09-30 a sceptic could, and the page failed: its headroom
 * examples said 10× scores 27.8 and parity scores zero, while the formula printed
 * directly above them gives 24.4 and 7.1. The engine always ran the formula. The
 * examples were copied from the CIS specification's reference table, which was
 * typed by hand and never computed from the formula it sat under, and every copy
 * downstream inherited it.
 *
 * Part 3 failed the same test in a different way. Its case study printed a
 * position value where a reader expects a price ("Peak $197,000 (Nov 2021)"),
 * valued the end of 2025 at a round $100,000 a coin when the year closed near
 * $87,500, and dated a $2.0–2.1 trillion market capitalisation to "early 2026",
 * a figure no day of January 2026 reached.
 *
 * THE RULE THIS ENFORCES. A number printed next to the formula or the inputs that
 * produce it is checked against that formula or those inputs, never against a
 * second hand-typed copy. Each check below finds its sentence, recomputes the
 * number from what the page itself states, and fails with the difference. If a
 * sentence is reworded and a check can no longer find it, the check fails too:
 * re-point it at the new wording. An example nobody recomputes is exactly the
 * defect this file exists to stop.
 *
 * The formulas are restated here on purpose, and each is pinned to the formula
 * the page publishes, so changing a published formula reddens this file until the
 * examples are recomputed against the new one. The headroom formula is the
 * engine's (ACFDashboard `computeEffectiveTAM.js` and `cisScoringV2.js`).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const ENTITIES = {
  '&times;': '×', '&divide;': '÷', '&minus;': '−', '&mdash;': '—', '&ndash;': '–',
  '&rsquo;': '’', '&lsquo;': '‘', '&ldquo;': '“', '&rdquo;': '”', '&approx;': '≈',
  '&middot;': '·', '&plusmn;': '±', '&Sigma;': 'Σ', '&amp;': '&', '&nbsp;': ' ',
  '&lt;': '<', '&gt;': '>',
};

/** The page as a reader sees it: tags removed, entities decoded, whitespace collapsed. */
const readable = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')
  .replace(/<script[\s\S]*?<\/script>/g, ' ')
  .replace(/<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&[a-zA-Z]+;/g, (e) => ENTITIES[e] ?? e)
  .replace(/\s+/g, ' ');

const MATH = readable('public/site-b/framework-in-math.html');
const PART3 = readable('public/site-b/part-3-bitcoin-convexity.html');

const find = (text, re, what) => {
  const m = text.match(re);
  assert.ok(m, `${what}: sentence not found. If it was reworded, re-point this check at the new wording.`);
  return m;
};
const num = (s) => Number(String(s).replace(/,/g, ''));
const round1 = (x) => Math.round(x * 10) / 10;

/** "~$197,000" style figures: equal to the recomputed value within 1.5 percent. */
const approx = (stated, computed, what) => {
  const drift = Math.abs(stated - computed) / Math.abs(computed);
  assert.ok(drift <= 0.015,
    `${what}: the page says ${stated}, its own inputs give ${Math.round(computed * 100) / 100}`);
};

// ---------------------------------------------------------------- headroom

/** The engine's curve: 35 × ln(1 + H) / ln(31), H = min(TAM ÷ market cap, 30), floored at 0. */
const headroom = (h) => 35 * Math.log(1 + Math.min(Math.max(h, 0), 30)) / Math.log(31);

test('math: the headroom formula the examples are checked against is the one the page publishes', () => {
  const published = MATH.match(/headroom = 35 × ln\(1 \+ H\) \/ ln\(31\) , where H = min\(TAM ÷ market cap, 30\)/g) ?? [];
  assert.equal(published.length, 2,
    'the page no longer prints the headroom formula this file checks against, in both places it appears; ' +
    'if the formula changed, update headroom() here and recompute every example below');
});

test('math: every "N× scores X" headroom example comes from the formula', () => {
  const [sentence] = find(MATH, /Logarithmic, so the first multiple of headroom.*?\.(?= [A-Z])/, 'headroom examples');
  const pairs = [...sentence.matchAll(/(\d+(?:\.\d+)?)× scores (\d+(?:\.\d+)?)/g)];
  assert.ok(pairs.length >= 4, `expected at least four "N× scores X" examples, found ${pairs.length}`);
  for (const [, h, stated] of pairs) {
    assert.equal(num(stated), round1(headroom(num(h))),
      `${h}× headroom: the page says ${stated}, the formula gives ${round1(headroom(num(h)))}`);
  }
});

test('math: parity is scored by the formula, not assumed to be zero', () => {
  const [sentence] = find(MATH, /Logarithmic, so the first multiple of headroom.*?\.(?= [A-Z])/, 'headroom examples');
  const [, stated] = find(sentence, /parity[^;.]*?scores (zero|\d+(?:\.\d+)?)/, 'parity example');
  const value = stated === 'zero' ? 0 : num(stated);
  assert.equal(value, round1(headroom(1)),
    `parity (TAM equal to market cap) is H = 1: the page says ${stated}, the formula gives ${round1(headroom(1))}`);
  assert.equal(headroom(0), 0, 'the curve reaches zero only at H = 0');
});

test('math: the Bitcoin headroom examples come from the stated baseline and market caps', () => {
  const [, tam] = find(MATH, /baseline is a conservative monetary total of roughly (\d+(?:\.\d+)?) trillion dollars/, 'Bitcoin baseline');
  const points = [
    ...MATH.matchAll(/(?:market capitalisation (?:of|near)|At) (\d+(?:\.\d+)?) trillion(?: dollars)? (?:that is|it is) about (\d+(?:\.\d+)?)×(?: of headroom)?,? scoring roughly (\d+(?:\.\d+)?)/g),
  ];
  assert.ok(points.length >= 1, 'no Bitcoin headroom example found');
  for (const [, cap, h, stated] of points) {
    const H = num(tam) / num(cap);
    assert.equal(num(h), round1(H), `${cap} trillion: the page says ${h}× headroom, ${tam} ÷ ${cap} is ${round1(H)}`);
    assert.equal(num(stated), round1(headroom(H)),
      `${cap} trillion: the page says ${stated}, the formula gives ${round1(headroom(H))}`);
  }
});

// ------------------------------------------------- the other worked formulas

test('math: catalyst time decay examples come from 1 ÷ (1 + months ÷ 12)', () => {
  find(MATH, /1 ÷ \(1 \+ months out ÷ 12\)/, 'time-decay formula');
  find(MATH, /a catalyst today counts fully, one at six months two-thirds, one at a year half, one at two years a third/, 'time-decay examples');
  const decay = (months) => 1 / (1 + months / 12);
  assert.equal(decay(0), 1);
  assert.equal(decay(6), 2 / 3);
  assert.equal(decay(12), 1 / 2);
  assert.equal(decay(24), 1 / 3);
});

test('math: the FIS floor of 20 is 100 minus the published bucket caps', () => {
  const caps = ['Allocation', 'Governance', 'Dead capital', 'Complexity', 'Concentration'].map((bucket) => {
    const [, cap] = find(MATH, new RegExp(`${bucket} (\\d+)(?: \\(hard\\))? (?:Yes|No)`), `${bucket} cap`);
    return num(cap);
  });
  const [, sum, floor] = find(MATH, /the five caps sum to (\d+), a valid computation can never emit below (\d+)/, 'FIS floor');
  const total = caps.reduce((a, b) => a + b, 0);
  assert.equal(num(sum), total, `the page says the caps sum to ${sum}; the table's caps sum to ${total}`);
  assert.equal(num(floor), 100 - total, `the page says the floor is ${floor}; 100 − ${total} is ${100 - total}`);
});

test('math: FIS multiplier examples come from 0.50 + (FIS ÷ 100) × 0.70', () => {
  find(MATH, /multiplier = 0\.50 \+ \(FIS ÷ 100\) × 0\.70/, 'FIS multiplier formula');
  const pairs = [...MATH.matchAll(/FIS of (\d+) yields (\d+\.\d+)/g)];
  assert.ok(pairs.length >= 2, 'expected the FIS multiplier examples');
  for (const [, fis, stated] of pairs) {
    const m = 0.5 + (num(fis) / 100) * 0.7;
    assert.equal(num(stated), Math.round(m * 100) / 100, `FIS ${fis}: the page says ${stated}, the formula gives ${m}`);
  }
});

test('math: sizing examples interpolate the published score-to-weight bands', () => {
  find(MATH, /justified weight = min weight \+ band progress × \(max weight − min weight\)/, 'sizing formula');
  const band = (posture, lo, hi, wLo, wHi) =>
    find(MATH, new RegExp(`${posture} ${lo}–${hi} ${wLo}–${wHi}%`), `${posture} ${lo}–${hi} band`);
  band('Torque', 70, 100, 8, 15);
  band('Hype', 50, 100, 2, 5);
  const weight = (score, lo, hi, wLo, wHi) => wLo + ((score - lo) / (hi - lo)) * (wHi - wLo);
  const [, t70, t85, t100] = find(MATH,
    /a Torque position at 70 justifies (\d+(?:\.\d+)?) percent, at 85 justifies (\d+(?:\.\d+)?) percent, at 100 justifies (\d+(?:\.\d+)?)/,
    'Torque sizing examples');
  assert.equal(num(t70), weight(70, 70, 100, 8, 15));
  assert.equal(num(t85), weight(85, 70, 100, 8, 15));
  assert.equal(num(t100), weight(100, 70, 100, 8, 15));
  const [, h50, h100] = find(MATH, /A Hype position at 50 justifies (\d+) percent, at 100 justifies (\d+)/, 'Hype sizing examples');
  assert.equal(num(h50), weight(50, 50, 100, 2, 5));
  assert.equal(num(h100), weight(100, 50, 100, 2, 5));
});

test('math: size-opportunity examples come from round(90 × e^(−0.18 × allocation%))', () => {
  find(MATH, /size opportunity = clamp\(round\(90 × e −0\.18 × allocation%/, 'size-opportunity formula');
  const score = (pct) => Math.min(100, Math.max(0, Math.round(90 * Math.exp(-0.18 * pct))));
  const [, untouched, at5] = find(MATH, /An untouched name scores (\d+)\. At 5 percent it is (\d+)\./, 'size-opportunity examples');
  assert.equal(num(untouched), score(0));
  assert.equal(num(at5), score(5));
  assert.ok(score(35) <= 1, 'the page says the curve approaches zero past roughly 35 percent');
});

// ----------------------------------------------------------------- Part 3

test('part 3: the case study prints position values beside the prices that produce them', () => {
  const [, coins, entry] = find(PART3, /(\d+\.\d+) BTC at \$([\d,]+)\./, 'Investor A entry');
  approx(num(coins), 100_000 / num(entry), 'Investor A coins bought with $100,000');
  const [, peak, peakPx, trough, troughPx, dd] = find(PART3,
    /position peaks at ~\$([\d,]+) \(Nov 2021, Bitcoin ~\$([\d,]+)\) and troughs at ~\$([\d,]+) \(Dec 2022, Bitcoin ~\$([\d,]+)\), a (\d+)% drawdown/,
    'Investor A peak and trough');
  approx(num(peak), num(coins) * num(peakPx), 'Investor A peak position');
  approx(num(trough), num(coins) * num(troughPx), 'Investor A trough position');
  assert.equal(num(dd), Math.round((1 - num(trough) / num(peak)) * 100), 'Investor A drawdown');
  const [, endCoins, endValue, close] = find(PART3,
    /ends 2025 at ~(\d+\.\d+) BTC, worth ~\$([\d,]+) at the year-end close of ~\$([\d,]+)/,
    'Investor A 2025 ending value');
  approx(num(endValue), num(endCoins) * num(close), 'Investor A 2025 ending value');
});

test('part 3: Investor B\'s Bitcoin drawdown is priced from its own sleeve', () => {
  const [, sleeve] = find(PART3, /\$(\d+)K Bitcoin, \$\d+K regime equities/, 'Investor B Bitcoin sleeve');
  const [, entry] = find(PART3, /\d+\.\d+ BTC at \$([\d,]+)\./, 'entry price');
  const [, , peakPx, , troughPx] = find(PART3,
    /position peaks at ~\$([\d,]+) \(Nov 2021, Bitcoin ~\$([\d,]+)\) and troughs at ~\$([\d,]+) \(Dec 2022, Bitcoin ~\$([\d,]+)\)/,
    'cycle prices');
  const [, lost] = find(PART3, /BTC drawdown costs ~\$([\d,]+), under a quarter of the starting portfolio/, 'Investor B drawdown');
  const computed = (num(sleeve) * 1000 / num(entry)) * (num(peakPx) - num(troughPx));
  approx(num(lost), computed, 'Investor B Bitcoin drawdown in dollars');
  assert.ok(computed < 25_000, 'under a quarter of the $100,000 starting portfolio');
});

test('part 3: the addressable-market arithmetic follows from its own inputs', () => {
  const [, cap, coins, px, share, gold] = find(PART3,
    /market capitalization at the start of 2026 was ~\$(\d+(?:\.\d+)?) trillion \(about (\d+(?:\.\d+)?) million coins at ~\$([\d,]+)\), roughly (\d+) percent of gold’s ~\$(\d+) trillion/,
    'start-of-2026 market capitalization');
  approx(num(cap), (num(coins) * 1e6 * num(px)) / 1e12, 'start-of-2026 market cap');
  assert.equal(num(share), Math.round((num(cap) / num(gold)) * 100), 'Bitcoin as a share of gold');

  const pools = [...PART3.matchAll(/(?:Gold coexistence|Real-estate value storage|Offshore wealth|EM currency substitution) · ~\$(\d+)T/g)]
    .map(([, v]) => num(v));
  assert.equal(pools.length, 4, 'expected the four addressable-market pools');
  const [, summed] = find(PART3, /Summed conservatively, ~\$(\d+) trillion/, 'pool total');
  assert.equal(num(summed), pools.reduce((a, b) => a + b, 0), 'the pools do not sum to the stated total');

  const [, lo, hi] = find(PART3, /Growing to (\d+)–(\d+)% of gold’s ~\$\d+ trillion market value/, 'gold coexistence range');
  assert.ok(pools[0] >= (num(lo) / 100) * num(gold) && pools[0] <= (num(hi) / 100) * num(gold),
    'the gold-coexistence pool lies outside its own stated share of gold');

  const [, pct, implied, perCoin, supply, multiple, ref] = find(PART3,
    /reaching (\d+) percent of gold’s market value over \d+ years implies a \$(\d+) trillion market cap, ~\$([\d,]+) per coin across roughly (\d+) million coins, (\d+)x a \$([\d,]+) reference price/,
    'isolated gold scenario');
  approx(num(implied), (num(pct) / 100) * num(gold), 'scenario market cap');
  approx(num(perCoin), (num(implied) * 1e12) / (num(supply) * 1e6), 'scenario price per coin');
  assert.equal(num(multiple), num(perCoin) / num(ref), 'scenario multiple');

  const [, start, end, lift] = find(PART3,
    /a 15 percent allocation would grow from \$([\d,]+) to \$([\d,]+), lifting total value ~(\d+) percent/,
    'scenario portfolio effect');
  assert.equal(num(end), num(start) * num(multiple), 'scenario allocation growth');
  assert.equal(num(lift), ((num(end) - num(start)) / 100_000) * 100, 'scenario lift on a $100,000 portfolio');
});
