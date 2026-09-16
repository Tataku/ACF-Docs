#!/usr/bin/env node
/**
 * Sync the Part 5 posture cards' allocation rails from the stats the cards print.
 *
 * WHY THIS EXISTS. Each posture card in the trio now carries a vertical 0–100%
 * rail on its left edge with the posture's AGGREGATE band lit, its per-position
 * band as a thin inner marker, and (for Hype) its hard cap drawn as a bar. Those
 * are numbers, and a number drawn is a number stated: if the rail carried its
 * own copy of "40–60%", the copy would drift from the stat line under it the
 * day someone re-tunes a band (sync-counts.mjs has the history of exactly that
 * failure). So the rail is never authored. This script reads the card's own
 * `.posture-card-stats` — the one place the bands are typed — and writes the
 * rail's custom properties and label from them; `--check` refuses a build in
 * which any rail disagrees with its stats.
 *
 * Stats grammar it reads (already the cards' markup):
 *   <em>3&ndash;15%</em>per position   → --plo:3  --phi:15
 *   <em>40&ndash;60%</em>aggregate     → --lo:40  --hi:60   label "Aggregate 40–60%"
 *   <em>&le;10%</em>hard cap           → --lo:0   --hi:10  --cap:10  label "Hard cap ≤10%"
 * The label and the scale's ends are attributes drawn by CSS (content: attr()),
 * never text nodes: the reading time derived by sync-counts.mjs counts words.
 *
 * Run: npm run sync:posture-rails     (rewrite)
 *      npm run audit:posture-rails    (verify, non-zero exit on drift)
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PAGE = path.join(ROOT, 'public', 'site-b', 'part-5-portfolio-construction.html');
const CHECK = process.argv.includes('--check');
const fail = (msg) => { console.error(`sync-posture-rails: ${msg}`); process.exit(1); };

const RANGE = /<em>(\d+)&ndash;(\d+)%<\/em>(per position|aggregate)/g;
const CAP = /<em>&le;(\d+)%<\/em>hard cap/;

/** Parse one card's stats into the rail's numbers. */
function bands(stats, posture) {
  const out = {};
  for (const m of stats.matchAll(RANGE)) {
    const [, lo, hi, kind] = m;
    if (kind === 'per position') { out.plo = +lo; out.phi = +hi; }
    else { out.lo = +lo; out.hi = +hi; out.label = `Aggregate ${lo}–${hi}%`; }
  }
  const cap = stats.match(CAP);
  if (cap) { out.lo = 0; out.hi = +cap[1]; out.cap = +cap[1]; out.label = `Hard cap ≤${cap[1]}%`; }
  for (const k of ['plo', 'phi', 'lo', 'hi', 'label']) if (out[k] === undefined) fail(`${posture}: could not read ${k} from its stats`);
  if (!(out.plo < out.phi && out.lo < out.hi && out.hi <= 100)) fail(`${posture}: bands out of order (${JSON.stringify(out)})`);
  return out;
}

/** The rail markup for one posture — geometry in custom properties, character parts by posture. */
function rail(posture, b, indent) {
  const vars = [`--lo:${b.lo}`, `--hi:${b.hi}`, `--plo:${b.plo}`, `--phi:${b.phi}`];
  if (b.cap !== undefined) vars.push(`--cap:${b.cap}`);
  const parts = ['<span class="pc-scale"></span><span class="pc-ticks"></span>'];
  if (posture === 'torque') parts.push('<span class="pc-thrust"></span>');
  parts.push('<span class="pc-band"></span>');
  if (posture === 'torque') parts.push('<span class="pc-tip"></span>');
  if (posture === 'ballast') parts.push('<span class="pc-keel"></span>');
  if (b.cap !== undefined) parts.push('<span class="pc-cap"></span><span class="pc-ghost"></span>');
  parts.push('<span class="pc-pos"></span>');
  // No text nodes: the label and the scale's ends are drawn by CSS from attributes,
  // so the rail adds nothing to the page's prose — the reading time derived by
  // sync-counts.mjs counts words, and a decoration must not be one.
  parts.push(`<span class="pc-lbl" data-label="${b.label}"></span>`);
  parts.push('<span class="pc-end pc-end--top"></span><span class="pc-end pc-end--bot"></span>');
  return `${indent}<span class="pc-rail" aria-hidden="true" style="${vars.join(';')}">${parts.join('')}</span>`;
}

let html = fs.readFileSync(PAGE, 'utf8');
const cards = [...html.matchAll(/^(\s*)<a class="posture-card" href="#(\w+)" data-posture="(\w+)">\n/gm)];
if (cards.length !== 3) fail(`expected the trio's three cards, found ${cards.length}`);
let drift = 0;
// Last card first: an insertion moves every offset after it, never one before it,
// so the matches taken from the original page stay valid for the cards still to do.
for (const card of cards.reverse()) {
  const [open, indent, href, posture] = card;
  if (href !== posture) fail(`${posture}: href #${href} does not name the posture`);
  const start = card.index + open.length;
  const end = html.indexOf('</a>', start);
  const body = html.slice(start, end);
  const stats = body.match(/<span class="posture-card-stats">[\s\S]*?<\/span><\/span>/);
  if (!stats) fail(`${posture}: no stats line`);
  const want = rail(posture, bands(stats[0], posture), indent + '  ') + '\n';
  const have = body.match(/^\s*<span class="pc-rail"[^\n]*\n/m);
  if (have && have[0] === want) continue;
  drift++;
  if (CHECK) { console.error(`sync-posture-rails: ${posture} — the rail ${have ? 'disagrees with' : 'is missing;'} the card's stats`); continue; }
  const next = have ? body.replace(have[0], want) : want + body;
  html = html.slice(0, start) + next + html.slice(end);
  console.log(`sync-posture-rails: ${posture} ← ${want.trim().match(/style="([^"]+)"/)[1]}`);
}
if (CHECK) {
  if (drift) { console.error(`sync-posture-rails: ${drift} rail(s) out of sync — run npm run sync:posture-rails`); process.exit(1); }
  console.log('sync-posture-rails: every posture rail states exactly what its card\'s stats state');
} else if (drift) {
  fs.writeFileSync(PAGE, html);
} else {
  console.log('sync-posture-rails: nothing to do');
}
