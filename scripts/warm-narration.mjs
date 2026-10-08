#!/usr/bin/env node
/**
 * Pre-render the AI narration for every Part, so no reader waits on a live
 * generation and no listen depends on one succeeding.
 *
 * Run:  node scripts/warm-narration.mjs [base-url] [--voice=<name>] [--pages=a,b]
 *       base-url defaults to https://docs.acfdashboard.com
 *
 * HOW IT STAYS RIGHT AFTER THE DOCS CHANGE. Nothing here records which audio
 * exists. /api/narration stores every generated segment under a SHA-256 of its
 * model, voice, delivery instructions and exact text (Vercel Blob). This
 * script opens each page in a real browser, asks the page for the segments it
 * will send (ACFNarration.segments(), the same function a reader's click
 * uses), and requests each one from the deployed route:
 *   - a segment whose text did not change is already stored  -> served, free;
 *   - a segment that was edited has a new key                  -> generated once;
 *   - a model / voice / instructions change re-keys everything -> all regenerated.
 * So after any docs edit, re-running it renders exactly what changed. The CI
 * workflow .github/workflows/narration-warm.yml runs it after each production
 * deploy.
 *
 * Requests go out FROM the page, so the route's same-origin gate sees its own
 * site, and the text is byte-identical to a reader's. Generations are paced
 * under the route's per-IP rate limit; stored segments are not paced.
 *
 * Exits non-zero if any segment could not be produced.
 */
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const base = (args.find((a) => !a.startsWith('--')) || 'https://docs.acfdashboard.com').replace(/\/$/, '');
const opt = (name) => (args.find((a) => a.startsWith(`--${name}=`)) || '').split('=')[1] || null;
const voice = opt('voice');
const only = opt('pages') ? opt('pages').split(',') : null;
const executablePath = process.env.CHROMIUM_PATH || undefined;

const PACE_MS = 2300;          // at most 26 generations a minute, under the route's 30/min/IP
const RATE_WAIT_MS = 61000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pagesFromSitemap() {
  const xml = await (await fetch(`${base}/sitemap.xml`)).text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
}

const browser = await chromium.launch({ executablePath });
const totals = { store: 0, hit: 0, miss: 0, failed: 0, audioSeconds: 0, words: 0 };
let failed = false;

try {
  const paths = (only || await pagesFromSitemap());
  console.log(`\nNarration pre-render against ${base}${voice ? ` (voice ${voice})` : ''}\n`);
  for (const p of paths) {
    const page = await browser.newPage();
    await page.goto(base + p + (voice ? `?voice=${voice}` : ''), { waitUntil: 'load' });
    // reading.js loads the narration core AFTER the page's load event (it tags
    // the glossary first), so wait for the controller rather than reading early.
    // Pages without a Listen control never define one; give up on those quietly.
    // It also waits for the chart islands: their captions are narrated, and a
    // text read before they are drawn is not the text a reader hears.
    const ready = await page.waitForFunction(() => window.ACFNarration && window.ACFNarration.segments
      && (!window.ACFNarration.settled || window.ACFNarration.settled()), null, { timeout: 15000 })
      .then(() => true, () => false);
    const segs = ready ? await page.evaluate(() => window.ACFNarration.segments()) : [];
    if (!segs.length) { await page.close(); continue; }

    const counts = { store: 0, hit: 0, miss: 0, failed: 0 };
    let audioSeconds = 0; let measured = 0;
    const words = segs.join(' ').split(/\s+/).filter(Boolean).length;
    for (let i = 0; i < segs.length; i += 1) {
      let result;
      for (let attempt = 0; attempt < 4; attempt += 1) {
        result = await page.evaluate(async ({ text, voice: v }) => {
          const t0 = performance.now();
          const r = await fetch('/api/narration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(v ? { text, voice: v } : { text }),
          });
          // Measure the audio as well as storing it: the listening times shown
          // on the pages are derived from the voice's measured speaking rate.
          let seconds = null;
          if (r.ok) {
            const buf = await r.arrayBuffer();
            try {
              const ctx = new OfflineAudioContext(1, 1, 24000);
              seconds = (await ctx.decodeAudioData(buf)).duration;
            } catch (e) { seconds = null; }
          }
          let err = null;
          if (!r.ok) { try { err = await r.json(); } catch (e) { err = null; } }
          return { status: r.status, source: r.headers.get('x-narration-cache'), model: r.headers.get('x-narration-model'), err, ms: performance.now() - t0, seconds };
        }, { text: segs[i], voice });
        if (result.status === 429 && !(result.err && result.err.quotaExhausted)) { await sleep(RATE_WAIT_MS); continue; }
        if (result.status >= 500 && result.status !== 502) { await sleep(3000 * (attempt + 1)); continue; }
        break;
      }
      if (result.status === 200 && result.seconds) { audioSeconds += result.seconds; measured += 1; }
      if (result.status === 200) {
        counts[result.source === 'store' ? 'store' : result.source === 'hit' ? 'hit' : 'miss'] += 1;
        // A generation already takes seconds (about 40s for a long segment), so
        // pace only the remainder; a fixed sleep after each one doubled nothing
        // but the run time.
        if (result.source === 'miss' && result.ms < PACE_MS) await sleep(PACE_MS - result.ms);
      } else {
        counts.failed += 1; failed = true;
        console.log(`  FAIL  ${p} segment ${i}: HTTP ${result.status} ${result.err ? (result.err.error || '') + ' ' + (result.err.message || '') : ''}`);
        if (result.err && (result.err.quotaExhausted || result.err.configRejected || result.status === 401 || result.status === 503)) {
          console.log('        definitive failure; stopping'); break;
        }
      }
    }
    for (const k of Object.keys(counts)) totals[k] += counts[k];
    console.log(`  ${p.padEnd(56)} ${segs.length} segments · stored ${counts.store} · memory ${counts.hit} · generated ${counts.miss}${counts.failed ? ` · FAILED ${counts.failed}` : ''}`);
    if (measured === segs.length) {
      const min = audioSeconds / 60;
      console.log(`  ${''.padEnd(56)} audio ${Math.floor(min)}m${String(Math.round(audioSeconds % 60)).padStart(2, '0')}s · ${words} spoken words · ${Math.round(words / min)} wpm`);
      totals.audioSeconds += audioSeconds; totals.words += words;
    }
    await page.close();
    if (failed && counts.failed && counts.failed === segs.length) break;
  }
} finally {
  await browser.close();
}

console.log(`\nTotal: stored ${totals.store} · memory ${totals.hit} · generated ${totals.miss} · failed ${totals.failed}`);
if (totals.audioSeconds) {
  console.log(`Audio: ${(totals.audioSeconds / 60).toFixed(1)} min for ${totals.words} spoken words = ${Math.round(totals.words / (totals.audioSeconds / 60))} wpm`);
}
if (totals.miss && !totals.store && !totals.hit) {
  console.log('Note: nothing came from the store. If this is not the first run, check that a Vercel Blob store is connected (BLOB_READ_WRITE_TOKEN).');
}
process.exit(failed ? 1 : 0);
