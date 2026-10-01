/**
 * Part 1 history: every historical figure Part 1 derives is recomputed from the
 * public data snapshots in data/part1-history/, not re-typed.
 *
 * Run: node --test tests/part1-history.test.mjs
 *
 * WHY THIS EXISTS. Part 1 argues from history: the 60/40's real returns in the
 * falling-rate decades and in the last debt liquidation, 2022's place among the
 * worst years since 1928, the 1946 debt and how it came down, the gap between the
 * policy rate and core inflation since 2023. Its "What would prove us wrong" tests
 * are read from the same data. A sceptic should be able to rerun all of it, so each
 * check below finds its sentence on the page, recomputes the number with
 * scripts/part1-history.mjs and fails with the difference. If a sentence is reworded
 * and a check can no longer find it, re-point the check at the new wording.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readings, fedFunds } from '../scripts/part1-history.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTITIES = { '&rsquo;': '’', '&ldquo;': '“', '&rdquo;': '”', '&ndash;': '–', '&amp;': '&', '&middot;': '·', '&nbsp;': ' ' };
const PART1 = fs.readFileSync(path.join(ROOT, 'public/site-b/part-1-foundation.html'), 'utf8')
  .replace(/<script[\s\S]*?<\/script>/g, ' ')
  .replace(/<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<figure[\s\S]*?<\/figure>/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&[a-zA-Z]+;/g, (e) => ENTITIES[e] ?? e)
  .replace(/\s+/g, ' ');

const R = readings();

const find = (re, what) => {
  const m = PART1.match(re);
  assert.ok(m, `${what}: sentence not found in Part 1. If it was reworded, re-point this check at the new wording.`);
  return m;
};
/** A figure printed to the given number of decimals must equal the computed value at that precision. */
const same = (printed, computed, what) => {
  const decimals = (String(printed).split('.')[1] || '').length;
  const tolerance = 0.5 * 10 ** -decimals + 1e-9;
  assert.ok(Math.abs(Number(printed) - computed) <= tolerance,
    `${what}: the page prints ${printed}, the data give ${computed.toFixed(decimals + 2)}`);
};

test('part 1: the 60/40 real returns in the falling-rate decades and the last liquidation', () => {
  const m = find(/about ([\d.]+) percent a year after inflation from 1982 to 2021, against about ([\d.]+) percent from 1946 to 1974/, 'takeaway 1');
  same(m[1], R.mix.fallingRates1982to2021, '60/40 real, 1982-2021');
  same(m[2], R.mix.liquidation1946to1974, '60/40 real, 1946-1974');
  const lead = find(/10-year Treasuries returned about ([\d.]+) percent a year after inflation from 1982 to 2021/, 'opening paragraph');
  same(lead[1], R.mix.fallingRates1982to2021, 'opening paragraph, 60/40 real 1982-2021');
});

test('part 1: the debt and interest checkpoints follow the OMB series', () => {
  const f = R.fiscal;
  const t = find(/Federal debt held by the public was (\d+) percent of GDP in fiscal 2025, and interest was back at its 1991 peak of ([\d.]+) percent of GDP\. The 1946 record of (\d+) percent/, 'takeaway 2');
  same(t[1], f[2025].debt, 'debt FY2025');
  same(t[2], f[2025].interest, 'interest FY2025');
  same(t[2], f[1991].interest, 'interest FY1991');
  same(t[3], f[1946].debt, 'debt FY1946');
  assert.equal(Math.max(...Object.values(f).map((v) => v.debt)), f[1946].debt, '1946 is the record');
  const peak = Object.entries(f).filter(([y, v]) => v.interest != null && Number(y) < 2025)
    .reduce((a, b) => (b[1].interest > a[1].interest ? b : a));
  assert.equal(peak[0], '1991', 'the 1991 interest bill is the peak before 2025');
  const c = find(/rose from about (\d+) to (\d+) percent of GDP while the interest bill fell from ([\d.]+) to ([\d.]+) percent of GDP/, 'falling-rates sentence');
  same(c[1], f[1991].debt, 'debt FY1991');
  same(c[2], f[2021].debt, 'debt FY2021');
  same(c[3], f[1991].interest, 'interest FY1991');
  same(c[4], f[2021].interest, 'interest FY2021');
  find(/on more than twice the debt/, 'twice the debt');
  assert.ok(f[2025].debt / f[1991].debt > 2, 'FY2025 debt is more than twice FY1991');
  find(/fell below a quarter of GDP by 1974/, '1974 sentence');
  assert.ok(f[1974].debt < 25, 'debt below a quarter of GDP in FY1974');
});

test('part 1: the 1945-1950 price rise and 2026 inflation readings follow CPI-U', () => {
  find(/consumer prices rose by more than a third between the end of 1945 and the end of 1950/, '1945-1950 sentence');
  assert.ok(R.cpi1945to1950 > 100 / 3, `CPI rose ${R.cpi1945to1950.toFixed(1)} percent, not more than a third`);
  const m = find(/went from ([\d.]+) percent in January to above (\d+) percent in May, and was ([\d.]+) percent in August/, '2026 inflation sentence');
  same(m[1], R.cpi2026.january, 'CPI y/y January 2026');
  assert.ok(R.cpi2026.may > Number(m[2]), `CPI y/y May 2026 is ${R.cpi2026.may.toFixed(2)}`);
  same(m[3], R.cpi2026.august, 'CPI y/y August 2026');
  const c = find(/Consumer prices rose about (\d+) percent from the end of 1999 to the end of 2024/, '1999-2024 CPI sentence');
  same(c[1], R.cpi1999to2024, 'CPI rise, end-1999 to end-2024');
});

test('part 1: bondholders in the last liquidation, and the 60/40 alongside them', () => {
  const m = find(/10-year Treasuries lost about (\d+) percent a year after inflation from 1946 to 1974, while a 60\/40 mix still returned about ([\d.]+) percent/, 'liquidation sentence');
  same(`-${m[1]}`, R.bond.liquidation1946to1974, '10-year Treasury real, 1946-1974');
  same(m[2], R.mix.liquidation1946to1974, '60/40 real, 1946-1974');
});

test('part 1: 2022 in Damodaran\'s series, and its rank since 1928', () => {
  const m = find(/the Treasuries lost ([\d.]+) percent, and 2022 is the only year since 1928 in which US stocks and 10-year Treasuries both fell by more than 10 percent\. After inflation the mix lost about (\d+) percent, a loss matched or exceeded only in (\d{4}) and (\d{4})/, '2022 sentence');
  same(`-${m[1]}`, R.y2022.bonds, '10-year Treasury 2022');
  assert.deepEqual(R.y2022.bothBelowMinus10, [2022], 'years since 1928 when both fell more than 10 percent');
  const y2022 = R.mix.worstRealYears.find((w) => w.year === 2022);
  same(`-${m[2]}`, y2022.real, '60/40 real 2022');
  const asBad = R.mix.worstRealYears.filter((w) => Math.round(-w.real) >= Math.round(-y2022.real) && w.year !== 2022).map((w) => w.year).sort();
  assert.deepEqual(asBad, [Number(m[3]), Number(m[4])].sort(), 'the other years with a real loss as large');
  find(/2022 was one of the three worst years since 1928/, 'takeaway 3');
  assert.ok(R.mix.worstRealYears.slice(0, 3).some((w) => w.year === 2022), '2022 ranks in the worst three');
});

test('part 1: the policy-rate gap behind the first test', () => {
  const g = R.policyGap;
  find(/From August 2023 to November 2025 the Federal Reserve held its policy rate at least a point above core inflation/, 'gap sentence');
  assert.equal(g.longestRun.from, '2023-08');
  assert.equal(g.longestRun.to, '2025-11');
  assert.ok(R.fiscal[2024].interest >= 3 && R.fiscal[2025].interest >= 3, 'interest past 3 percent of GDP');
  const t = find(/the gap held for (\d+) months, to November 2025, and core PCE inflation bottomed at ([\d.]+) percent; in August 2026 the gap was ([\d.]+) points/, 'test 1 reading');
  assert.equal(Number(t[1]), g.longestRun.len);
  same(t[2], g.coreLow.value, 'core PCE low in the run');
  assert.equal(g.latest.month, '2026-08', 'latest month in the snapshot');
  same(t[3], g.latest.gap, 'gap in August 2026');
  find(/It then cut three times between September and December 2025, held through the summer of 2026 while core inflation rose back to about 3 percent/, 'after-the-run sentence');
  const ff = fedFunds();
  const fall = ff['2025-08'] - ff['2026-01'];
  assert.ok(fall > 0.6 && fall < 0.8, `the effective rate fell ${fall.toFixed(2)} points from August 2025 to January 2026 (three quarter-point cuts)`);
  const summer = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08'].map((k) => ff[k]);
  assert.ok(Math.max(...summer) - Math.min(...summer) < 0.05, 'the rate held from January to August 2026');
  assert.ok(Math.abs(g.latest.core - 3) < 0.25, `core PCE inflation is ${g.latest.core.toFixed(2)}`);
});

test('part 1: the thresholds of tests 2 and 4 sit where the page says', () => {
  const b = find(/more than ([\d.]+) percent a year after inflation from 2026 through 2035, about their average since 1928\. In the last liquidation, 1946 to 1974, they lost about (\d+) percent a year/, 'test 2');
  same(b[1], R.bond.since1928, '10-year Treasury real since 1928');
  same(`-${b[2]}`, R.bond.liquidation1946to1974, '10-year Treasury real, 1946-1974');
  const p = find(/at least (\d+) percent a year after inflation, before fees and taxes, from 2026 through 2035\. The bar sits between the mix’s ([\d.]+) percent in the last liquidation and its ([\d.]+) percent in the falling-rate decades, and below its ([\d.]+) percent average since 1928/, 'test 4');
  same(p[2], R.mix.liquidation1946to1974, '60/40 real, 1946-1974');
  same(p[3], R.mix.fallingRates1982to2021, '60/40 real, 1982-2021');
  same(p[4], R.mix.since1928, '60/40 real since 1928');
  const bar = Number(p[1]);
  assert.ok(bar > R.mix.liquidation1946to1974 && bar < R.mix.fallingRates1982to2021 && bar < R.mix.since1928,
    'the bar sits between the two regimes and below the long-run record');
});
