#!/usr/bin/env node
/**
 * Import Robert Shiller's monthly series into data/part1-history/ from a
 * checkout of the adambnash-afk/shiller-data feed.
 *
 * WHY A MIRROR. Shiller publishes ie_data.xls on shillerdata.com, behind a
 * rotating download URL. The feed's pipeline (scripts/build_data.py in that
 * repository) scrapes the current link, downloads the workbook, maps columns
 * by header and refuses to publish on anomalies. Shiller is the source; the
 * feed is only the retrieval path, so this import pins both: the feed commit
 * and the SHA-256 of the file read.
 *
 * WHAT IT WRITES
 *   shiller-ie-data-monthly.csv          month, price, dividend, gs10; January
 *                                        1960 to the last month with a reported
 *                                        dividend. Nothing is estimated or
 *                                        carried forward: later months, which
 *                                        Shiller has not yet filled, are left out.
 *   shiller-ie-data-monthly.source.json  where it came from and the cutoff.
 *
 * Run: node scripts/import-shiller-mirror.mjs <path-to-shiller-data-checkout>
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'data', 'part1-history');
const START = '1960-01';

const mirror = process.argv[2];
if (!mirror) {
  console.error('usage: node scripts/import-shiller-mirror.mjs <path-to-shiller-data-checkout>');
  process.exit(1);
}
const file = path.join(mirror, 'data', 'stock_market_data.json');
const bytes = fs.readFileSync(file);
const feed = JSON.parse(bytes.toString('utf8'));
const commit = execFileSync('git', ['-C', mirror, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const origin = execFileSync('git', ['-C', mirror, 'remote', 'get-url', 'origin'], { encoding: 'utf8' }).trim();

const rows = feed.data
  .map((r) => ({ month: `${r.year}-${String(r.month).padStart(2, '0')}`, price: r.sp500, dividend: r.dividend, gs10: r.long_interest_rate }))
  .filter((r) => r.month >= START)
  .sort((a, b) => (a.month < b.month ? -1 : 1));
const withDividend = rows.filter((r) => r.dividend != null);
const cutoff = withDividend[withDividend.length - 1].month;
const kept = rows.filter((r) => r.month <= cutoff);
for (const r of kept) {
  if (![r.price, r.dividend, r.gs10].every((v) => typeof v === 'number' && Number.isFinite(v))) {
    throw new Error(`incomplete row before the cutoff: ${JSON.stringify(r)}`);
  }
}

const round = (v, d) => Number(v.toFixed(d));
fs.writeFileSync(path.join(OUT, 'shiller-ie-data-monthly.csv'),
  `month,price,dividend,gs10\n${kept.map((r) => `${r.month},${round(r.price, 4)},${round(r.dividend, 4)},${r.gs10}`).join('\n')}\n`);
fs.writeFileSync(path.join(OUT, 'shiller-ie-data-monthly.source.json'), `${JSON.stringify({
  upstream: 'Robert J. Shiller, ie_data.xls, https://shillerdata.com/',
  retrievalPath: origin,
  feedCommit: commit,
  feedFile: 'data/stock_market_data.json',
  feedFileSha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  feedLastUpdated: feed.metadata?.last_updated ?? null,
  feedLatestMonth: rows[rows.length - 1].month,
  cutoff,
  cutoffRule: 'last month with a reported dividend; later months are left out, never estimated',
  firstMonth: kept[0].month,
  months: kept.length,
}, null, 2)}\n`);
console.log(`Shiller snapshot: ${kept[0].month} to ${cutoff} (${kept.length} months); feed ${commit.slice(0, 12)}, latest month ${rows[rows.length - 1].month}`);
