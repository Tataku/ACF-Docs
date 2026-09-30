#!/usr/bin/env node
/**
 * Write each chart's readable fallback into its mount, from the chart's own spec.
 *
 * Run: npm run sync:chart-fallbacks        (writes)
 *      npm run audit:chart-fallbacks       (--check: fails if any page is stale)
 *
 * WHY THIS EXISTS. Every exhibit on the site is a React island: a
 * <figure data-fc-chart="<id>"> that site-b-charts.js clears and fills with the
 * live chart. Whatever sits inside the figure before that is what a reader
 * without JavaScript, a crawler, and an AI agent reading the HTML actually get.
 * Until 2026-09-30 that was one of two things, and both were wrong in their own
 * way:
 *
 *   - Parts 2 to 6, the cover and the Pictures page shipped EMPTY mounts, so
 *     every exhibit was invisible to anything that reads HTML rather than runs
 *     it. An agent auditing Part 5 saw no charts at all.
 *   - Part 1 shipped hand-drawn static exhibits that disagreed with the live
 *     charts that replace them: different series, different simulations,
 *     different labels. A reader with JS saw one exhibit and an agent saw
 *     another.
 *
 * Both are the same defect: a second, hand-maintained description of a chart
 * that nothing kept in step with the chart. The fix is to stop maintaining it
 * by hand. This script writes one fallback per mount, derived from the spec the
 * live chart renders from, so the two cannot disagree. The fallback is a
 * <figcaption>, which the narration system mutes (the live DOM is what gets
 * narrated) and which the island clears on mount.
 *
 * What a fallback says: the exhibit title, the one-line setup, the chart's
 * primary claim, a prose description of what is drawn (the spec's
 * ariaSummary), the caution, the data-mode disclosure, and the linked sources.
 * It never restates data points by hand.
 */
import fs from 'node:fs';
import path from 'node:path';
import { FRAMEWORK_CHART_SPECS } from '../components/framework-charts/chart-specs.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const SITE = path.join(ROOT, 'public', 'site-b');
const CHECK = process.argv.includes('--check');

const byId = new Map(FRAMEWORK_CHART_SPECS.map((s) => [s.chartId, s]));

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const sentence = (s) => {
  const t = String(s ?? '').trim();
  return !t ? '' : /[.!?]$/.test(t) ? t : `${t}.`;
};

function fallbackFor(spec, indent) {
  const i1 = `${indent}  `;
  const claim = spec.claimStack?.primaryClaim;
  const lines = [
    `<figcaption class="fc-fallback" data-fc-fallback="${esc(spec.chartId)}">`,
    `  <p class="fc-fallback-title"><strong>${esc(spec.idx ? `${spec.idx} · ${spec.title}` : spec.title)}</strong>${spec.setupLine ? `: ${esc(spec.setupLine)}` : ''}</p>`,
  ];
  if (claim) lines.push(`  <p class="fc-fallback-claim">${esc(sentence(claim))}</p>`);
  if (spec.ariaSummary) lines.push(`  <p class="fc-fallback-body">${esc(sentence(spec.ariaSummary))}</p>`);
  const note = [spec.claimStack?.caution, spec.disclosure].filter(Boolean).map(sentence).join(' ');
  if (note) lines.push(`  <p class="fc-fallback-note">${esc(note)}</p>`);
  const srcs = (spec.sources || []).map((s) => {
    const label = esc([s.provider, s.seriesId, s.label].filter(Boolean).join(' · '));
    return s.url ? `<a href="${esc(s.url)}">${label}</a>` : label;
  });
  if (srcs.length) lines.push(`  <p class="fc-fallback-src">Sources: ${srcs.join('; ')}.</p>`);
  lines.push('</figcaption>');
  return lines.map((l) => i1 + l).join('\n');
}

const FIG = /(^[ \t]*)(<figure\b[^>]*\bdata-fc-chart="([^"]+)"[^>]*>)([\s\S]*?)(<\/figure>)/gm;

const pages = fs.readdirSync(SITE).filter((f) => f.endsWith('.html') && !f.startsWith('_'));
let stale = 0, written = 0, mounts = 0;
const unknown = [];
for (const page of pages) {
  const file = path.join(SITE, page);
  const before = fs.readFileSync(file, 'utf8');
  const after = before.replace(FIG, (m, indent, open, id, _inner, close) => {
    mounts++;
    const spec = byId.get(id);
    if (!spec) { unknown.push(`${page}: ${id}`); return m; }
    return `${indent}${open}\n${fallbackFor(spec, indent)}\n${indent}${close}`;
  });
  if (after !== before) {
    if (CHECK) { stale++; console.error(`stale chart fallbacks: ${page}`); }
    else { fs.writeFileSync(file, after); written++; }
  }
}
if (unknown.length) {
  console.error(`mounts naming no spec:\n  ${unknown.join('\n  ')}`);
  process.exit(1);
}
if (CHECK && stale) {
  console.error(`${stale} page(s) stale. Run: npm run sync:chart-fallbacks`);
  process.exit(1);
}
console.log(CHECK
  ? `Chart fallbacks in step: ${mounts} mounts across ${pages.length} pages.`
  : `Chart fallbacks synced: ${mounts} mounts, ${written} page(s) rewritten.`);
