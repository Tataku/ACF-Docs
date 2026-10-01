#!/usr/bin/env node
/**
 * Part 1 history — the readings behind Part 1's figures and its four tests,
 * computed from the public data snapshots in data/part1-history/.
 *
 * Run: node scripts/part1-history.mjs   (prints the readings as JSON)
 * Checked by: tests/part1-history.test.mjs
 *
 * 60/40 means 60 percent S&P 500 with dividends and 40 percent 10-year Treasuries
 * (Damodaran's annual series), rebalanced each January. "After inflation" divides by
 * the December-to-December change in CPI-U. Rolling periods overlap.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data', 'part1-history');

const csv = (name) => {
  const [head, ...lines] = fs.readFileSync(path.join(DATA, name), 'utf8').trim().split('\n');
  const keys = head.split(',');
  return lines.map((l) => Object.fromEntries(l.split(',').map((v, i) => [keys[i], v])));
};

const pct = (x) => x * 100;

/** Annual real returns by year: { [year]: { mix, bond } } as fractions. */
export function realReturns() {
  const cpi = Object.fromEntries(csv('cpi-u-nsa-december.csv').map((r) => [Number(r.year), Number(r.december_index)]));
  const out = {};
  for (const r of csv('damodaran-annual-returns.csv')) {
    const y = Number(r.year);
    const stocks = Number(r.sp500_total_return_pct) / 100;
    const bonds = Number(r.us_tbond_10y_return_pct) / 100;
    const inflation = cpi[y] / cpi[y - 1] - 1;
    out[y] = {
      stocks, bonds, inflation,
      mix: (1 + 0.6 * stocks + 0.4 * bonds) / (1 + inflation) - 1,
      bond: (1 + bonds) / (1 + inflation) - 1,
    };
  }
  return out;
}

/** Compound annual rate over [from, to] inclusive, as a fraction. */
export function cagr(series, key, from, to) {
  let g = 1;
  for (let y = from; y <= to; y += 1) g *= 1 + series[y][key];
  return g ** (1 / (to - from + 1)) - 1;
}

/** Overlapping windows of `len` years: how many clear `threshold` (a fraction), and how many there are. */
export function rolling(series, key, len, threshold) {
  const years = Object.keys(series).map(Number).sort((a, b) => a - b);
  let n = 0;
  let hit = 0;
  for (let s = years[0]; s + len - 1 <= years[years.length - 1]; s += 1) {
    n += 1;
    if (cagr(series, key, s, s + len - 1) >= threshold) hit += 1;
  }
  return { hit, n };
}

/** Federal funds rate less 12-month core PCE inflation, by month (percentage points). */
export function policyGap() {
  const ff = Object.fromEntries(csv('fedfunds-monthly.csv').map((r) => [r.month, Number(r.value)]));
  const pce = Object.fromEntries(csv('core-pce-index-monthly.csv').map((r) => [r.month, Number(r.value)]));
  const back = (m) => `${Number(m.slice(0, 4)) - 1}${m.slice(4)}`;
  const months = Object.keys(ff).filter((m) => pce[m] && pce[back(m)]).sort();
  const core = Object.fromEntries(months.map((m) => [m, pct(pce[m] / pce[back(m)] - 1)]));
  const gap = Object.fromEntries(months.map((m) => [m, ff[m] - core[m]]));
  let best = { len: 0 };
  let start = null;
  let len = 0;
  for (const m of months) {
    if (gap[m] >= 1) {
      if (len === 0) start = m;
      len += 1;
      if (len > best.len) best = { len, from: start, to: m };
    } else len = 0;
  }
  const inRun = months.filter((m) => m >= best.from && m <= best.to);
  const low = inRun.reduce((a, m) => (core[m] < core[a] ? m : a), inRun[0]);
  const latest = months[months.length - 1];
  return { longestRun: best, coreLow: { month: low, value: core[low] }, latest: { month: latest, gap: gap[latest], core: core[latest] } };
}

export function fiscal() {
  return Object.fromEntries(csv('federal-debt-and-interest.csv').map((r) => [Number(r.fiscal_year), {
    debt: Number(r.debt_held_by_public_pct_gdp),
    interest: r.interest_outlays_pct_gdp === '' ? null : Number(r.interest_outlays_pct_gdp),
  }]));
}

export function cpiYearOverYear(month) {
  const m = Object.fromEntries(csv('cpi-u-nsa-monthly-2025-2026.csv').map((r) => [r.month, Number(r.index)]));
  const prior = `${Number(month.slice(0, 4)) - 1}${month.slice(4)}`;
  return pct(m[month] / m[prior] - 1);
}

export function readings() {
  const r = realReturns();
  const cpi = Object.fromEntries(csv('cpi-u-nsa-december.csv').map((x) => [Number(x.year), Number(x.december_index)]));
  const worst = Object.entries(r).map(([y, v]) => [Number(y), v.mix]).sort((a, b) => a[1] - b[1]);
  return {
    mix: {
      since1928: pct(cagr(r, 'mix', 1928, 2025)),
      liquidation1946to1974: pct(cagr(r, 'mix', 1946, 1974)),
      fallingRates1982to2021: pct(cagr(r, 'mix', 1982, 2021)),
      known2022to2025: pct(cagr(r, 'mix', 2022, 2025)),
      decadesAt4: rolling(r, 'mix', 10, 0.04),
      worstRealYears: worst.slice(0, 4).map(([y, v]) => ({ year: y, real: pct(v) })),
    },
    bond: {
      since1928: pct(cagr(r, 'bond', 1928, 2025)),
      liquidation1946to1974: pct(cagr(r, 'bond', 1946, 1974)),
      known2022to2025: pct(cagr(r, 'bond', 2022, 2025)),
      decadesAbove1point5: rolling(r, 'bond', 10, 0.015),
    },
    y2022: {
      stocks: pct(r[2022].stocks),
      bonds: pct(r[2022].bonds),
      bothBelowMinus10: Object.entries(r).filter(([, v]) => v.stocks < -0.1 && v.bonds < -0.1).map(([y]) => Number(y)),
    },
    cpi1945to1950: pct(cpi[1950] / cpi[1945] - 1),
    cpi2026: { january: cpiYearOverYear('2026-01'), may: cpiYearOverYear('2026-05') },
    policyGap: policyGap(),
    fiscal: fiscal(),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(readings(), null, 2));
}
