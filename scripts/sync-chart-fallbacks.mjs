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
 *
 * It also fails when a figure's data-mode attribute names a different mode from
 * its spec's visualDataMode (D-CHART-DATA-POLICY). Figures with no data-mode
 * attribute take the spec's mode from the live chart's marker.
 */
import fs from 'node:fs';
import path from 'node:path';
import { FRAMEWORK_CHART_SPECS, getDataModeMarker } from '../components/framework-charts/chart-specs.mjs';

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

// A disclosure is written as a chart footer: a short mode label, then clauses
// joined by middle dots. Read as prose, each clause becomes its own sentence.
// A chart with no disclosure (historical charts carry none) states its mode
// with the same words its live data-mode marker uses.
function modeNote(spec) {
  if (!spec.disclosure) return getDataModeMarker(spec).explain;
  return String(spec.disclosure).split(/\s+·\s+/).map(sentence).join(' ');
}

// An internal row is written 'ACF · Part N' + 'Rule stated in Part N · <heading>'.
// The label already names the Part, so the provider is not repeated in prose.
function sourceLabel(s) {
  const internal = /^ACF · Part \d$/.test(s.provider || '') && /^Rule stated in Part \d\b/.test(s.label || '');
  return (internal ? [s.label] : [s.provider, s.seriesId, s.label]).filter(Boolean).join(' · ');
}

function fallbackFor(spec, indent) {
  const i1 = `${indent}  `;
  const claim = spec.claimStack?.primaryClaim;
  const head = spec.idx ? `${spec.idx} · ${spec.title}` : spec.title;
  // A title that already ends a sentence ('Three Jobs. One Cycle.') takes the
  // setup line as the next sentence, not after a colon.
  const join = /[.!?]$/.test(String(spec.title || '').trim()) ? ' ' : ': ';
  const lines = [
    `<figcaption class="fc-fallback" data-fc-fallback="${esc(spec.chartId)}">`,
    `  <p class="fc-fallback-title"><strong>${esc(head)}</strong>${spec.setupLine ? `${join}${esc(spec.setupLine)}` : ''}</p>`,
  ];
  if (claim) lines.push(`  <p class="fc-fallback-claim">${esc(sentence(claim))}</p>`);
  if (spec.ariaSummary) lines.push(`  <p class="fc-fallback-body">${esc(sentence(spec.ariaSummary))}</p>`);
  const note = [sentence(spec.claimStack?.caution), modeNote(spec)].filter(Boolean).join(' ');
  if (note) lines.push(`  <p class="fc-fallback-note">${esc(note)}</p>`);
  const srcs = (spec.sources || []).map((s) => {
    const label = esc(sourceLabel(s));
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
// D-CHART-DATA-POLICY: a figure that states a data mode must state its chart's.
// The marker a reader sees comes from the spec, so a figure attribute that says
// otherwise is a second, contradicting label. Checked on write and on --check.
const modeMismatch = [];
for (const page of pages) {
  const file = path.join(SITE, page);
  const before = fs.readFileSync(file, 'utf8');
  const after = before.replace(FIG, (m, indent, open, id, _inner, close) => {
    mounts++;
    const spec = byId.get(id);
    if (!spec) { unknown.push(`${page}: ${id}`); return m; }
    const mode = (open.match(/\bdata-mode="([^"]*)"/) || [])[1];
    const want = spec.visualDataMode || 'representative';
    if (mode !== undefined && mode !== want) modeMismatch.push(`${page}: ${id} has data-mode="${mode}", its spec says '${want}'`);
    return `${indent}${open}\n${fallbackFor(spec, indent)}\n${indent}${close}`;
  });
  if (after !== before) {
    if (CHECK) { stale++; console.error(`stale chart fallbacks: ${page}`); }
    else { fs.writeFileSync(file, after); written++; }
  }
}
if (modeMismatch.length) {
  console.error(`figure data-mode differs from the spec:\n  ${modeMismatch.join('\n  ')}`);
  process.exit(1);
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
