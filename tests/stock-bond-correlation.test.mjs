/**
 * Part 1's test 3 — the stock-bond correlation, recomputed from public data.
 *
 * Run: node --test tests/stock-bond-correlation.test.mjs
 *
 * Holds scripts/stock-bond-correlation.mjs to its stated method, its data to
 * its sources, and Part 1 and the Evidence page to what the data give.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  shiller, yields, parBondReturn, monthlyReturns, rollingCorrelation, test3, readings,
} from '../scripts/stock-bond-correlation.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&rsquo;/g, '’').replace(/&ndash;/g, '–').replace(/\s+/g, ' ');

test('data: the Shiller snapshot is monthly and gap-free, and carries no estimated dividends', () => {
  const s = shiller();
  const months = Object.keys(s).sort();
  for (let i = 1; i < months.length; i += 1) {
    const [y, m] = months[i - 1].split('-').map(Number);
    const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
    assert.equal(months[i], next, `gap after ${months[i - 1]}`);
  }
  // Dividends stop where Shiller's file stops reporting them; nothing after is filled in.
  const withDividend = months.filter((m) => s[m].dividend != null);
  const lastDividend = withDividend[withDividend.length - 1];
  assert.ok(months.filter((m) => m > lastDividend).every((m) => s[m].dividend == null));
  assert.ok(withDividend.every((m) => s[m].dividend > 0 && s[m].price > 0));
});

test('data: Shiller’s 10-year yield and FRED GS10 agree wherever both exist', () => {
  const s = shiller();
  const fred = Object.fromEntries(read('data/part1-history/gs10-monthly.csv').trim().split('\n').slice(1)
    .map((l) => l.split(',')).map(([m, v]) => [m, Number(v)]));
  const both = Object.keys(fred).filter((m) => s[m]?.gs10 != null);
  assert.ok(both.length >= 50, `overlap of ${both.length} months`);
  for (const m of both) assert.ok(Math.abs(s[m].gs10 - fred[m]) < 0.006, `${m}: Shiller ${s[m].gs10}, FRED ${fred[m]}`);
  const y = yields();
  assert.equal(y['2026-08'], fred['2026-08'], 'FRED extends the yield series past Shiller’s file');
});

test('bonds: the par-bond reconstruction behaves like a 10-year bond', () => {
  // Unchanged yield: the bond earns one month of coupon and its price stays at par.
  assert.ok(Math.abs(parBondReturn(4, 4) - 0.04 / 12) < 1e-12);
  // A one-point rise costs roughly its duration (about 8 years at 4 percent).
  const up = parBondReturn(4, 5);
  assert.ok(up < -0.07 && up > -0.085, `+1 point: ${(up * 100).toFixed(2)} percent`);
  assert.ok(parBondReturn(5, 4) > -up, 'convexity: a fall gains more than a rise loses');
});

test('stocks: total return is price plus a twelfth of the annual dividend, over last month’s price', () => {
  const s = shiller();
  const r = monthlyReturns();
  const m = '2020-03';
  assert.ok(Math.abs(r[m].stock - ((s[m].price + s[m].dividend / 12) / s['2020-02'].price - 1)) < 1e-12);
});

test('history: positive through the 1970s to 1990s, negative 2000 to 2021, positive since March 2022', () => {
  const R = readings();
  assert.ok(R.eras['1970-1999'].negativeShare < 0.1, 'mostly positive, 1970-1999');
  assert.ok(R.eras['2000-2020'].negativeShare > 0.75, 'mostly negative, 2000-2020');
  assert.equal(R.lastNegative, '2022-02');
  assert.equal(R.firstPositiveAfter, '2022-03');
  const c = rollingCorrelation();
  const y2021 = Object.keys(c).filter((m) => m.startsWith('2021-'));
  assert.equal(y2021.length, 12);
  assert.ok(y2021.every((m) => c[m] < 0), 'negative at every month-end of 2021');
  assert.ok(Object.keys(c).filter((m) => m >= '2022-03').every((m) => c[m] > 0), 'positive at every month-end since');
});

test('test 3: the formal window opens in January 2026, and history does not count', () => {
  const formal = test3();
  assert.equal(formal.from, '2026-01');
  assert.equal(formal.met, false);
  // The same rule run over history would be met many times over, which is why
  // the window is prospective.
  assert.equal(test3({ from: '2000-01' }).met, true);
});

test('pages: Part 1 and the Evidence page say what the data give', () => {
  const R = readings();
  const part1 = text(read('public/site-b/part-1-foundation.html'));
  assert.match(part1, /if, from January 2026, the 24-month correlation of monthly returns on US stocks and 10-year Treasuries is below zero at 12 consecutive month-ends\. It was negative for most of 2000 to 2021 and has been positive since early 2022\./);
  const evidence = text(read('public/site-b/evidence.html'));
  const pct = (x) => `${Math.round(x * 100)} percent`;
  assert.ok(evidence.includes(`negative at ${pct(R.eras['1970-1999'].negativeShare)} of month-ends from 1970 to 1999 and ${pct(R.eras['2000-2020'].negativeShare)} from 2000 to 2020`));
  assert.ok(evidence.includes(`it was +${R.latest.value.toFixed(2)} in`));
});
