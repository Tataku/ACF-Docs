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
 * Since 2026-10-01 the same rule covers Part 3's loan-to-value passage and
 * reserve arithmetic, Part 4's Roth case study, the tax-drag figures in Parts 2
 * and 5, and two chart examples (the Tax Wedge against Gross Is Not Net, and
 * the P6-02 FIS example book), which are read from the chart specs.
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
import { FRAMEWORK_CHART_SPECS } from '../components/framework-charts/chart-specs.mjs';

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
const PART2 = readable('public/site-b/part-2-lineage-macro.html');
const PART4 = readable('public/site-b/part-4-tax-architecture.html');
const PART5 = readable('public/site-b/part-5-portfolio-construction.html');

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
    ...MATH.matchAll(/(?:market capitali[sz]ation (?:of|near)|At) (\d+(?:\.\d+)?) trillion(?: dollars)? (?:that is|it is) about (\d+(?:\.\d+)?)×(?: of headroom)?,? scoring roughly (\d+(?:\.\d+)?)/g),
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
  const [, sum, floor] = find(MATH, /[Tt]he (?:five )?caps sum to (\d+), so a valid FIS cannot fall below (\d+)/, 'FIS floor');
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
  const [, at10, cap, atCap, zeroFrom] = find(MATH,
    /At 10 percent it is (\d+), at the (\d+) percent hard maximum (\d+), and it rounds to zero from about (\d+) percent/,
    'size-opportunity continuation');
  assert.equal(num(at10), score(10));
  assert.equal(num(atCap), score(num(cap)));
  // The first whole percent at which the score rounds to zero.
  let firstZero = 0;
  while (score(firstZero) > 0) firstZero += 1;
  assert.equal(num(zeroFrom), firstZero, `the curve first rounds to zero at ${firstZero} percent`);
});


// ----------------------------------------------------------------- Part 3

/** The Investor A sentence, shared by the two case-study checks. */
const INVESTOR_A_CYCLE =
  /position peaks at ~\$([\d,]+) \(Nov 2021, Bitcoin ~\$([\d,]+)\) and troughs at ~\$([\d,]+) \(Nov 2022, Bitcoin ~\$([\d,]+)\), a (\d+)% drawdown/;

test('part 3: the case study prints position values beside the prices that produce them', () => {
  const [, coins, entry] = find(PART3, /(\d+\.\d+) BTC at \$([\d,]+)\./, 'Investor A entry');
  approx(num(coins), 100_000 / num(entry), 'Investor A coins bought with $100,000');
  const [, peak, peakPx, trough, troughPx, dd] = find(PART3, INVESTOR_A_CYCLE, 'Investor A peak and trough');
  approx(num(peak), num(coins) * num(peakPx), 'Investor A peak position');
  approx(num(trough), num(coins) * num(troughPx), 'Investor A trough position');
  // The stated drawdown is the price fall (about 77 percent, 69,000 to 15,500);
  // the rounded position values must agree with it to within a point.
  const priceFall = (1 - num(troughPx) / num(peakPx)) * 100;
  assert.ok(Math.abs(num(dd) - priceFall) < 1, `drawdown ${dd}% against a price fall of ${priceFall.toFixed(1)}%`);
  const positionFall = (1 - num(trough) / num(peak)) * 100;
  assert.ok(Math.abs(num(dd) - positionFall) < 1, `drawdown ${dd}% against the position values' ${positionFall.toFixed(1)}%`);
  const [, endCoins, endValue, close] = find(PART3,
    /ends 2025 at ~(\d+\.\d+) BTC, worth ~\$([\d,]+) at the year-end close of ~\$([\d,]+)/,
    'Investor A 2025 ending value');
  approx(num(endValue), num(endCoins) * num(close), 'Investor A 2025 ending value');
  // The October high can be worth no more than the year-end coin count at the high's price.
  const [, highValue, highPx] = find(PART3, /reaches about \$([\d,]+) at the October 2025 high \(Bitcoin ~\$([\d,]+)\)/, 'Investor A October high');
  assert.ok(num(highValue) <= num(endCoins) * num(highPx) * 1.015,
    `October high ${highValue} exceeds ${endCoins} BTC × ${highPx}`);
});

test('part 3: Investor B\'s Bitcoin drawdown is priced from its own sleeve, and its ending book adds up', () => {
  const [, sleeve] = find(PART3, /\$(\d+)K Bitcoin, \$\d+K regime equities/, 'Investor B Bitcoin sleeve');
  const [, entry] = find(PART3, /\d+\.\d+ BTC at \$([\d,]+)\./, 'entry price');
  const [, , peakPx, , troughPx] = find(PART3, INVESTOR_A_CYCLE, 'cycle prices');
  const [, lost] = find(PART3, /BTC drawdown costs ~\$([\d,]+), under a quarter of the starting portfolio/, 'Investor B drawdown');
  const computed = (num(sleeve) * 1000 / num(entry)) * (num(peakPx) - num(troughPx));
  approx(num(lost), computed, 'Investor B Bitcoin drawdown in dollars');
  assert.ok(computed < 25_000, 'under a quarter of the $100,000 starting portfolio');

  const [, btc, btcValue, rest, total, share] = find(PART3,
    /B ends 2025 with about (\d+\.\d+) BTC \(~\$([\d,]+)\) and about \$([\d,]+) across its other sleeves, rebuilt dry powder included: ~\$([\d,]+) in all, with Bitcoin at (\d+)% of net worth/,
    'Investor B ending book');
  const [, , , close] = find(PART3, /ends 2025 at ~(\d+\.\d+) BTC, worth ~\$([\d,]+) at the year-end close of ~\$([\d,]+)/, 'year-end close');
  approx(num(btcValue), num(btc) * num(close), 'Investor B Bitcoin at the year-end close');
  assert.equal(num(total), num(btcValue) + num(rest), 'Investor B total');
  assert.equal(num(share), Math.round((num(btcValue) / num(total)) * 100), 'Investor B Bitcoin share');
});

test('part 3: the addressable-market arithmetic and the gold scenario follow from their own inputs', () => {
  const [, cap, coins, px, share, gold] = find(PART3,
    /market capitalization at the start of 2026 was ~\$(\d+(?:\.\d+)?) trillion \(about (\d+(?:\.\d+)?) million coins at ~\$([\d,]+)\), roughly (\d+) percent of gold’s ~\$(\d+) trillion/,
    'start-of-2026 market capitalization');
  approx(num(cap), (num(coins) * 1e6 * num(px)) / 1e12, 'start-of-2026 market cap');
  assert.equal(num(share), Math.round((num(cap) / num(gold)) * 100), 'Bitcoin as a share of gold');
  const [, capNow, coinsNow, pxNow, shareNow] = find(PART3,
    /On September 29, 2026 it was about \$(\d+(?:\.\d+)?) trillion \(about (\d+(?:\.\d+)?) million coins at about \$([\d,]+)\), still roughly (\d+) percent/,
    'September 2026 market capitalization');
  approx(num(capNow), (num(coinsNow) * 1e6 * num(pxNow)) / 1e12, 'September 2026 market cap');
  assert.equal(num(shareNow), Math.round((num(capNow) / num(gold)) * 100), 'September 2026 share of gold');

  const pools = [...PART3.matchAll(/(?:Gold coexistence|Real-estate value storage|Offshore wealth|EM currency substitution) · ~\$(\d+)T/g)]
    .map(([, v]) => num(v));
  assert.equal(pools.length, 4, 'expected the four addressable-market pools');
  const [, summed, times] = find(PART3,
    /The four pools add up to about \$(\d+) trillion of addressable monetary premium, the doctrine’s estimate and about (\d+) times Bitcoin’s start-of-2026 market cap/,
    'pool total');
  assert.equal(num(summed), pools.reduce((a, b) => a + b, 0), 'the pools do not sum to the stated total');
  assert.equal(num(times), Math.round(num(summed) / num(cap)), 'pool total as a multiple of the start-of-2026 market cap');

  const [, lo, hi, years] = find(PART3, /Growing to (\d+)–(\d+)% of gold’s ~\$\d+ trillion market value over (\d+) years/, 'gold coexistence range');
  assert.ok(pools[0] >= (num(lo) / 100) * num(gold) && pools[0] <= (num(hi) / 100) * num(gold),
    'the gold-coexistence pool lies outside its own stated share of gold');

  const [, pct, horizon, implied, perCoin, supply, multiple, ref] = find(PART3,
    /If Bitcoin reaches (\d+) percent of gold’s market value over (\d+) years, that is a \$(\d+) trillion market cap: about \$([\d,]+) a coin across the (\d+) million cap, or about (\d+(?:\.\d+)?) times the start-of-2026 price of about \$([\d,]+)/,
    'isolated gold scenario');
  assert.equal(num(horizon), num(years), 'the scenario and the pool card use the same horizon');
  assert.ok(num(pct) >= num(lo) && num(pct) <= num(hi), 'the scenario share sits inside the pool card range');
  assert.equal(num(px), num(ref), 'the scenario multiple is taken against the start-of-2026 price');
  approx(num(implied), (num(pct) / 100) * num(gold), 'scenario market cap');
  const coinPrice = (num(implied) * 1e12) / (num(supply) * 1e6);
  approx(num(perCoin), coinPrice, 'scenario price per coin');
  assert.equal(num(multiple), round1(coinPrice / num(ref)), 'scenario multiple');

  const [, start, end, adds, lift] = find(PART3,
    /a 15 percent allocation \(\$([\d,]+)\) would become about \$([\d,]+), adding about \$([\d,]+), or about (\d+) percent of the starting portfolio/,
    'scenario portfolio effect');
  assert.equal(num(start), 0.15 * 100_000, 'a 15 percent allocation of $100,000');
  approx(num(end), num(start) * (coinPrice / num(ref)), 'scenario allocation growth');
  assert.equal(num(adds), num(end) - num(start), 'scenario gain');
  assert.equal(num(lift), Math.round((num(adds) / 100_000) * 100), 'scenario lift on a $100,000 portfolio');
});

test('part 3: the reserve-drawdown arithmetic is the reserve times the fall', () => {
  const [, fall, at15, at10] = find(PART3,
    /a repeat of the (\d+) percent drawdown of 2021 to 2022 costs about (\d+(?:\.\d+)?) percent of the portfolio at a 15 percent reserve and about (\d+(?:\.\d+)?) percent at 10 percent/,
    'reserve drawdown at a fixed weight');
  assert.ok(Math.abs(num(at15) - 0.15 * num(fall)) <= 0.06, `15% × ${fall}% is ${0.15 * num(fall)}`);
  assert.ok(Math.abs(num(at10) - 0.10 * num(fall)) <= 0.06, `10% × ${fall}% is ${0.10 * num(fall)}`);
});

test('part 3: the loan-to-value passage follows from LTV ÷ (1 − fall) and its own call level (D-LTV-RULE)', () => {
  find(PART3, /LTV after a fall equals starting LTV ÷ \(1 − the fall\)/, 'LTV formula');
  const ltvAfter = (start, fall) => start / (1 - fall);
  const [, callText] = find(PART3, /issue a margin call near (\d+) percent LTV/, 'margin-call level');
  const call = num(callText) / 100;

  const [sentence, fallText] = find(PART3, /After a (\d+) percent fall in Bitcoin, a loan opened at[^.]*?before interest/, 'post-fall LTV examples');
  const examples = [...sentence.matchAll(/at (\d+) percent (?:stands )?(?:near|at) (\d+)/g)];
  assert.equal(examples.length, 4, 'the four starting LTVs (20, 25, 30, 35)');
  for (const [, start, stated] of examples) {
    const v = ltvAfter(num(start) / 100, num(fallText) / 100) * 100;
    assert.equal(num(stated), Math.round(v), `a ${start} percent loan after a ${fallText} percent fall is ${v.toFixed(1)} percent`);
  }

  find(PART3, new RegExp(`The fall a loan can absorb before a ${callText} percent call is 1 − starting LTV ÷ 0\\.${callText}`), 'survivable-fall formula');
  const survivable = (start) => (1 - start / call) * 100;
  const [, s20, at20, s35, at35] = find(PART3,
    /about (\d+) percent from a (\d+) percent start and (\d+) percent from (\d+)/, 'survivable-fall examples');
  assert.equal(num(s20), Math.round(survivable(num(at20) / 100)), `from ${at20} percent`);
  assert.equal(num(s35), Math.round(survivable(num(at35) / 100)), `from ${at35} percent`);

  const [, repeat, maxStart] = find(PART3,
    /Riding out a repeat of the (\d+) percent drawdown of 2021 to 2022 without a call means opening at about (\d+) percent or less/,
    'start that survives a repeat of 2021 to 2022');
  assert.equal(num(maxStart), Math.round(call * (1 - num(repeat) / 100) * 100), 'call × (1 − fall)');

  const [, fall2526, start2526, ltv2526] = find(PART3,
    /The 2025–2026 fall of about (\d+) percent would have taken a (\d+) percent loan to about (\d+) percent LTV, past a typical call/,
    '2025 to 2026 example');
  const v2526 = ltvAfter(num(start2526) / 100, num(fall2526) / 100);
  assert.equal(num(ltv2526), Math.round(v2526 * 100), '2025 to 2026 LTV');
  assert.ok(v2526 > call, 'past the call');

  const [, high, calledAt] = find(PART3,
    /allow a start as high as (\d+) percent; a loan opened there is called after a fall of about (\d+) percent/,
    'high starting LTV');
  assert.equal(num(calledAt), Math.round(survivable(num(high) / 100)), `a ${high} percent loan meets the call`);
});

// ----------------------------------------------------------------- Part 4

test('part 4: the Roth case study and its taxable gap recompute from the stated inputs', () => {
  const [, contrib] = find(PART4, /puts the full \$([\d,]+) into a Roth IRA every year/, 'annual Roth contribution');
  const [, rate, roth, years] = find(PART4,
    /On a hypothetical return of about (\d+(?:\.\d+)?) percent a year, invested at the start of each year[^.]*?, the Roth reaches roughly \$(\d+(?:\.\d+)?) million after (\d+) years/,
    'Roth terminal value');
  const r = num(rate) / 100, n = num(years), c = num(contrib);
  // Contributions at the start of each year (an annuity due).
  let R = 0;
  for (let y = 0; y < n; y += 1) R = (R + c) * (1 + r);
  assert.equal(num(roth), round1(R / 1e6), `the Roth reaches ${R.toFixed(0)}`);

  const [, fraction, tLo, tHi, gapLo, gapHi, pLo, pHi] = find(PART4,
    /a taxable account that realizes about a (twentieth|tenth) of its accumulated gain each year, taxed at (\d+) to (\d+) percent, and it finishes roughly \$([\d,]+) to \$([\d,]+) behind, about (\d+) to (\d+) percent of terminal wealth/,
    'taxable gap');
  const f = { twentieth: 1 / 20, tenth: 1 / 10 }[fraction];
  // Same contributions and returns; each year a share of the accumulated gain is
  // realized, its tax is paid from the account, and what is realized becomes basis.
  const taxable = (t) => {
    let v = 0, basis = 0;
    for (let y = 0; y < n; y += 1) {
      v += c; basis += c; v *= 1 + r;
      const realized = (v - basis) * f, tax = realized * t;
      v -= tax; basis += realized - tax;
    }
    return { v, basis };
  };
  for (const [t, gap, pct] of [[num(tLo) / 100, gapLo, pLo], [num(tHi) / 100, gapHi, pHi]]) {
    const { v, basis } = taxable(t);
    const g = R - v;
    assert.ok(Math.abs(num(gap) - g) <= 10_000, `at ${t * 100} percent the gap is ${g.toFixed(0)}, the page says ${gap}`);
    assert.equal(num(pct), Math.round((g / R) * 100), `at ${t * 100} percent the gap is ${((g / R) * 100).toFixed(1)} percent`);
    // "pay it and the gap roughly doubles": liquidating the remaining gain.
    const liquidated = R - (v - (v - basis) * t);
    assert.ok(liquidated / g >= 1.75 && liquidated / g <= 2.25, `liquidation multiplies the gap by ${(liquidated / g).toFixed(2)}`);
  }
  find(PART4, /That is before any tax on the gains still unrealized at the end; pay it and the gap roughly doubles/, 'liquidation sentence');
});

// ------------------------------------------------- tax drag (Parts 2 and 5)

test('part 5: the wrapper-compounding example is 1.10^30 against 1.075^30', () => {
  const [, principal, ret, years, blended] = find(PART5,
    /Take \$([\d,]+) earning (\d+) percent a year before tax for (\d+) years, with each year’s gains realized and taxed at a (\d+) percent blended rate/,
    'wrapper-compounding inputs');
  const [, after] = find(PART5, /Taxed every year, it compounds at (\d+(?:\.\d+)?) percent/, 'after-tax rate');
  const r = num(ret) / 100, n = num(years), P = num(principal);
  const rAfter = r * (1 - num(blended) / 100);
  assert.equal(num(after) / 100, Math.round(rAfter * 1000) / 1000, 'after-tax rate is the return less the blended tax');
  const roth = P * (1 + r) ** n, taxed = P * (1 + rAfter) ** n;
  const [, taxedText, rothText, gapText] = find(PART5,
    /The terminal values are about \$([\d,]+) in the account taxed every year and about \$([\d,]+) in the Roth: a gap of roughly \$([\d,]+), so the Roth ends with about twice the wealth/,
    'wrapper-compounding terminal values');
  approx(num(rothText), roth, 'Roth terminal value');
  approx(num(taxedText), taxed, 'taxed terminal value');
  approx(num(gapText), roth - taxed, 'gap');
  assert.equal(Math.round(roth / taxed), 2, 'about twice');
  // The exhibit's own source row prints the 10, 20 and 30-year waypoints.
  const [, r10, t10, r20, t20] = find(PART5, /10y \$(\d+)k vs \$(\d+)k · 20y \$(\d+)k vs \$(\d+)k/, 'P5-09 waypoints');
  for (const [y, rk, tk] of [[10, r10, t10], [20, r20, t20]]) {
    assert.equal(num(rk), Math.round((P * (1 + r) ** y) / 1000), `${y}-year tax-free value`);
    assert.equal(num(tk), Math.round((P * (1 + rAfter) ** y) / 1000), `${y}-year taxed value`);
  }
});

test('part 2: the tax-drag multiples are 1.10^t against 1.075^t', () => {
  const [, free, taxedBase, ret, blended] = find(PART2,
    /(\d\.\d+)\^t tax-free vs (\d\.\d+)\^t \((\d+)% a year less a (\d+)% blended tax on gains realized every year\)/, 'P2-05 inputs');
  const r = num(ret) / 100, rAfter = r * (1 - num(blended) / 100);
  assert.equal(num(free), 1 + r, 'tax-free growth factor');
  assert.equal(num(taxedBase), Math.round((1 + rAfter) * 1000) / 1000, 'taxed growth factor is the return less the blended tax');
  const [, r30, t30, r70, t70] = find(PART2,
    /year 30: (\d+(?:\.\d+)?)× vs (\d+(?:\.\d+)?)× · year 70: (\d+)× vs (\d+)×/, 'P2-05 multiples');
  assert.equal(num(r30), round1((1 + r) ** 30));
  assert.equal(num(t30), round1((1 + rAfter) ** 30));
  assert.equal(num(r70), Math.round((1 + r) ** 70));
  assert.equal(num(t70), Math.round((1 + rAfter) ** 70));
});

// ------------------------------------------------- chart examples (specs)

const spec = (id) => FRAMEWORK_CHART_SPECS.find((s) => s.chartId === id);

test('charts: the Tax Wedge and Gross Is Not Net use one pre-tax share and the published sale rate', () => {
  const wedge = spec('p4-tax-wedge'), donut = spec('p4-gross-not-net');
  const at = (key, x) => {
    const pts = wedge.series.find((s) => s.key === key).pts;
    const p = pts.reduce((best, q) => (Math.abs(q.x - x) < Math.abs(best.x - x) ? q : best));
    return p.y / p.x;
  };
  const net = donut.radial.segments.find((s) => s.id === 'net').value;
  const claim = donut.radial.segments.find((s) => s.id === 'claim').value;
  assert.ok(Math.abs(at('pretax', 1) - net) < 1e-9, `the Tax Wedge pre-tax line starts at ${at('pretax', 1)}, the donut nets ${net}`);
  assert.ok(Math.abs(net + claim - 1) < 1e-9, 'net and claim make the whole balance');
  // The donut's horizon steps hold the split.
  for (const step of donut.radial.steps || []) {
    const centre = num(String(step.center).replace(/[^\d.]/g, ''));
    const n = num(String(step.seg.net).replace(/[^\d.]/g, ''));
    const k = num(String(step.seg.claim).replace(/[^\d.]/g, ''));
    assert.ok(Math.abs(n - centre * net) <= 0.05 && Math.abs(k - centre * claim) <= 0.05, `${step.label}: ${n} + ${k} of ${centre}`);
  }
  // Taxable keeps the principal plus (1 − 23.8%) of the gain; the explainer's
  // "about 27 percent ahead at 10×" and "never more than about 31" follow.
  const keep = 1 - 0.238;
  const taxableAt10 = 1 + 9 * keep;
  assert.ok(Math.abs(at('taxable', 10) * 10 - taxableAt10) < 0.05, 'the taxable line is 1 + (x − 1) × 0.762');
  const [, ahead10] = find(wedge.explainerBody, /at 10× the Roth ends about (\d+) percent ahead/, 'Tax Wedge 10× gap');
  const [, ceiling] = find(wedge.explainerBody, /never more than about (\d+) percent ahead/, 'Tax Wedge ceiling');
  assert.equal(num(ahead10), Math.round((10 / taxableAt10 - 1) * 100));
  assert.equal(num(ceiling), Math.round((1 / keep - 1) * 100));
});

test('charts: the P6-02 example book charges what the FIS rules say it should', () => {
  const s = spec('p6-fis-waterfall');
  const why = (id) => s.hoverTargets.find((h) => h.id === id).why;
  const method = s.sources.find((r) => r.role === 'methodology').label;
  const steps = Object.fromEntries(s.waterfall.steps.map((x) => [x.id, x]));

  // Governance: the 60s charge times the share of the book in those names.
  const [, govCharge] = find(why('gov'), /any other score in the 60s \((\d+)\)/, 'governance 60s charge');
  const [, names, each] = find(method, /(\w+) documented names scoring in the 60s at (\d+(?:\.\d+)?) percent each/, 'governance inputs');
  const count = { two: 2, three: 3, four: 4, five: 5 }[names];
  const gov = num(govCharge) * (count * num(each)) / 100;
  // Dead capital: the no-thesis charge times the share without a thesis.
  const [, deadCharge] = find(why('dead'), /no documented thesis \((\d+) points\)/, 'dead-capital charge');
  find(method, /a fifth of value without a thesis/, 'dead-capital input');
  const dead = num(deadCharge) * 0.2;
  // Concentration: flat charges at the published thresholds.
  const [, c1, c3, c5] = find(why('conc'), /\((\d+) for each name above 15 percent, (\d+) for the top three, (\d+) for the top five\)/, 'concentration charges');
  const [, top3Cap, top5Cap] = find(why('conc'), /the top three past (\d+) percent, the top five past (\d+)/, 'concentration thresholds');
  const [, top3, top5, maxName] = find(method, /top three (\d+(?:\.\d+)?) percent and top five (\d+(?:\.\d+)?), none above (\d+)/, 'concentration inputs');
  const conc = (num(top3) > num(top3Cap) ? num(c3) : 0) + (num(top5) > num(top5Cap) ? num(c5) : 0) + (num(maxName) > 15 ? num(c1) : 0);
  // Complexity: one point per unclassified distribution.
  find(why('complex'), /1 point for each distribution nobody has classified/, 'complexity charge');
  find(method, /one unclassified distribution/, 'complexity input');
  const complex = 1;

  const [, a, g, d, k, x, fis] = find(method,
    /Allocation (\d+(?:\.\d+)?), governance (\d+(?:\.\d+)?), dead capital (\d+(?:\.\d+)?), concentration (\d+), complexity (\d+), FIS (\d+(?:\.\d+)?)/,
    'stated bucket charges');
  assert.equal(num(g), gov, 'governance');
  assert.equal(num(d), dead, 'dead capital');
  assert.equal(num(k), conc, 'concentration');
  assert.equal(num(x), complex, 'complexity');
  // Each stated charge is rounded to a tenth, so the stated FIS may differ by rounding.
  assert.ok(Math.abs(num(fis) - (100 - num(a) - gov - dead - conc - complex)) <= 0.15, 'FIS is 100 less the charges');
  // The drawn waterfall is the rounded charges and lands on the rounded score.
  assert.deepEqual([steps.alloc.value, steps.gov.value, steps.dead.value, steps.conc.value, steps.complex.value],
    [-Math.round(num(a)), -gov, -dead, -conc, -complex]);
  const landed = s.waterfall.start + s.waterfall.steps.reduce((t, x2) => t + x2.value, 0);
  assert.equal(s.waterfall.result.label, `FIS ${landed}`);
  assert.equal(landed, Math.round(num(fis)));
  for (const st of s.waterfall.steps) assert.ok(-st.value <= st.cap, `${st.id} within its cap`);
});
