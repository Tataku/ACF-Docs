#!/usr/bin/env node
/**
 * Part 1's test 3 ("the hedge returns"): the 24-month correlation of monthly
 * returns on US stocks and 10-year Treasuries, from public data.
 *
 * Run: node scripts/stock-bond-correlation.mjs   (prints the readings as JSON)
 * Checked by: tests/stock-bond-correlation.test.mjs
 *
 * STOCKS. Robert Shiller's monthly S&P Composite series (ie_data.xls): the
 * price P is the monthly AVERAGE of daily closes, not a month-end close, and
 * the dividend D is an annual rate, interpolated from S&P's quarterly totals.
 * The monthly total return is (P[t] + D[t] / 12) / P[t-1] - 1. A month without
 * a reported dividend has no return: the series stops there rather than
 * estimate one.
 *
 * BONDS. A 10-year Treasury rebuilt from the 10-year constant-maturity yield
 * (Federal Reserve H.15, FRED GS10, monthly average; Shiller's file carries
 * the same series). Each month a par bond is bought at last month's yield
 * y0 and repriced a month later at this month's yield y1, with 9 years and
 * 11 months left, annual compounding:
 *   return = y0 / 12 + y0 / y1 * (1 - (1 + y1)^-n) + (1 + y1)^-n - 1,  n = 119 / 12
 * Shiller's file uses the same construction.
 *
 * APPROXIMATIONS, stated once and carried into the page: both sides use
 * monthly averages, not month-end values, which smooths returns and can move
 * a 24-month correlation; the bond is a constant-maturity proxy, not a traded
 * bond or index. The sign of the correlation, which is what the test reads,
 * is the robust part.
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
const num = (v) => (v === '' || v == null ? null : Number(v));
const prevMonth = (m) => {
  const [y, mo] = m.split('-').map(Number);
  return mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, '0')}`;
};

/** Shiller rows: { month: { price, dividend, gs10 } }. */
export function shiller() {
  return Object.fromEntries(csv('shiller-ie-data-monthly.csv').map((r) => [r.month, {
    price: num(r.price), dividend: num(r.dividend), gs10: num(r.gs10),
  }]));
}

/** 10-year yields in percent: Shiller's column, then FRED GS10 where Shiller's file ends. */
export function yields() {
  const out = Object.fromEntries(Object.entries(shiller()).map(([m, r]) => [m, r.gs10]));
  for (const r of csv('gs10-monthly.csv')) if (out[r.month] == null) out[r.month] = Number(r.value);
  return out;
}

/** One month's return on a 10-year par bond bought at y0 and repriced at y1 (yields in percent). */
export function parBondReturn(y0pct, y1pct) {
  const y0 = y0pct / 100;
  const y1 = y1pct / 100;
  const n = 119 / 12;
  const v = (1 + y1) ** -n;
  return y0 / 12 + (y0 / y1) * (1 - v) + v - 1;
}

/** Monthly returns, as fractions: { month: { stock, bond } } where both exist. */
export function monthlyReturns() {
  const s = shiller();
  const y = yields();
  const out = {};
  for (const m of Object.keys(y).sort()) {
    const p = prevMonth(m);
    const bond = y[p] != null && y[m] != null ? parBondReturn(y[p], y[m]) : null;
    const cur = s[m];
    const prev = s[p];
    const stock = cur && prev && cur.dividend != null && cur.price != null && prev.price != null
      ? (cur.price + cur.dividend / 12) / prev.price - 1
      : null;
    if (stock != null && bond != null) out[m] = { stock, bond };
  }
  return out;
}

const pearson = (a, b) => {
  const n = a.length;
  const ma = a.reduce((x, v) => x + v, 0) / n;
  const mb = b.reduce((x, v) => x + v, 0) / n;
  let sab = 0; let saa = 0; let sbb = 0;
  for (let i = 0; i < n; i += 1) {
    sab += (a[i] - ma) * (b[i] - mb);
    saa += (a[i] - ma) ** 2;
    sbb += (b[i] - mb) ** 2;
  }
  return sab / Math.sqrt(saa * sbb);
};

/** Trailing 24-month correlation at each month-end with 24 consecutive returns: { month: r }. */
export function rollingCorrelation(window = 24) {
  const r = monthlyReturns();
  const months = Object.keys(r).sort();
  const out = {};
  for (let i = window - 1; i < months.length; i += 1) {
    const slice = months.slice(i - window + 1, i + 1);
    const contiguous = slice.every((m, k) => k === 0 || prevMonth(m) === slice[k - 1]);
    if (contiguous) out[months[i]] = pearson(slice.map((m) => r[m].stock), slice.map((m) => r[m].bond));
  }
  return out;
}

/**
 * Test 3 as Part 1 states it: the 24-month correlation is below zero at 12
 * consecutive month-ends, none before `from` (the formal window opens in
 * January 2026; earlier months are history).
 */
export function test3({ from = '2026-01', run = 12 } = {}) {
  const c = rollingCorrelation();
  const all = Object.keys(c).sort();
  const months = all.filter((m) => m >= from);
  let best = { len: 0 };
  let cur = null;
  for (const m of months) {
    if (c[m] < 0) {
      cur = cur && prevMonth(m) === cur.to ? { ...cur, to: m, len: cur.len + 1 } : { from: m, to: m, len: 1 };
      if (cur.len > best.len) best = cur;
    } else cur = null;
  }
  return {
    from,
    met: best.len >= run,
    longestNegativeRun: best.len ? best : null,
    monthsEvaluated: months.length,
    dataThrough: all[all.length - 1] ?? null,
  };
}

/** Sign of the correlation by decade-ish era, and the latest reading available. */
export function readings() {
  const c = rollingCorrelation();
  const months = Object.keys(c).sort();
  const share = (a, b) => {
    const ms = months.filter((m) => m >= a && m <= b);
    return { negativeShare: ms.filter((m) => c[m] < 0).length / ms.length, months: ms.length };
  };
  const lastNegative = months.filter((m) => m >= '2015-01' && c[m] < 0).pop();
  const firstPositiveAfter = lastNegative ? months.find((m) => m > lastNegative && c[m] >= 0) : null;
  const latest = months[months.length - 1];
  return {
    eras: {
      '1970-1999': share('1970-01', '1999-12'),
      '2000-2020': share('2000-01', '2020-12'),
      since2021: share('2021-01', latest),
    },
    lastNegative,
    firstPositiveAfter,
    latest: { month: latest, value: c[latest] },
    formal: test3(),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(readings(), null, 2));
}
