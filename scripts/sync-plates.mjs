#!/usr/bin/env node
/**
 * Sync the cover's chapter plates into the part pages' "next up" cards.
 *
 * WHY THIS EXISTS. Every part page ends on a card that leads to the next part,
 * and that card now carries the next part's picture — the same plate the reader
 * met on the cover. A picture copied by hand into six pages is six places for it
 * to drift from the one that defines it, so it is never copied by hand: the
 * cover is the source, this script writes the copies, and `--check` refuses a
 * build in which any copy has wandered.
 *
 * The slot is `<span class="next-up-plate dc-art" aria-hidden="true"
 * data-plate="N">…</span>` inside `.next-up-card`, where N is the part the card
 * links to (Part 6 leads back to the cover and carries Part 1's plate — the
 * series' signature curve). The `data-plate` on the slot and on the card must
 * agree with the card's href; a mismatch fails the build rather than shipping a
 * picture of the wrong chapter.
 *
 * Run: npm run sync:plates        (rewrite)
 *      npm run audit:plates       (verify, non-zero exit on drift)
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SITE = path.join(ROOT, 'public', 'site-b');
const CHECK = process.argv.includes('--check');

const PART_FILES = [
  [1, 'part-1-foundation.html'],
  [2, 'part-2-lineage-macro.html'],
  [3, 'part-3-bitcoin-convexity.html'],
  [4, 'part-4-tax-architecture.html'],
  [5, 'part-5-portfolio-construction.html'],
  [6, 'part-6-convexity-scoring.html'],
];
/** The part a next-up href leads to. The cover is the series' start. */
const ROUTE_PART = {
  '/': 1,
  '/part-1-foundation': 1,
  '/part-2-lineage-macro-thesis': 2,
  '/part-3-bitcoin-convexity-backbone': 3,
  '/part-4-tax-architecture-roc-strategy': 4,
  '/part-5-portfolio-construction-position-management': 5,
  '/part-6-convexity-framework-integrity-scoring': 6,
};

const fail = (msg) => { console.error(`sync-plates: ${msg}`); process.exit(1); };
const norm = (s) => s.replace(/\s+/g, ' ').trim();

const COVER = fs.readFileSync(path.join(SITE, 'cover-docs.html'), 'utf8');

/** The cover's plate SVG for part n — the one inside its `.dc-card[data-part="n"]`. */
function coverPlate(n) {
  const card = COVER.indexOf(`<a class="dc-card" href="`);
  let at = COVER.indexOf(`data-part="${n}"`, card);
  if (at < 0) fail(`the cover has no card for part ${n}`);
  const nextCard = COVER.indexOf('<a class="dc-card"', at + 1);
  const plate = COVER.indexOf('<span class="dc-plate dc-art"', at);
  if (plate < 0 || (nextCard > -1 && plate > nextCard)) fail(`the cover card for part ${n} carries no plate`);
  const start = COVER.indexOf('<svg', plate);
  const end = COVER.indexOf('</svg>', start);
  if (start < 0 || end < 0) fail(`the plate for part ${n} is not an inline svg`);
  return COVER.slice(start, end + '</svg>'.length);
}

/** Re-indent a multi-line block so its first line starts at `indent`. */
function reindent(block, indent) {
  const lines = block.split('\n');
  const lead = Math.min(...lines.slice(1).filter((l) => l.trim()).map((l) => l.match(/^\s*/)[0].length));
  return lines.map((l, i) => (i === 0 ? indent + l.trim() : indent + l.slice(Math.min(lead, l.match(/^\s*/)[0].length)))).join('\n');
}

let drift = 0;
for (const [part, file] of PART_FILES) {
  const p = path.join(SITE, file);
  const html = fs.readFileSync(p, 'utf8');
  const card = html.match(/<a class="next-up-card" href="([^"]+)" data-plate="(\d)">/);
  if (!card) fail(`${file}: no next-up card with a data-plate`);
  const [, href, cardPlate] = card;
  const target = ROUTE_PART[href];
  if (!target) fail(`${file}: next-up href ${href} is not a part route`);
  if (String(target) !== cardPlate) fail(`${file}: the card says plate ${cardPlate} but leads to part ${target}`);
  const slot = html.match(/^(\s*)<span class="next-up-plate dc-art" aria-hidden="true" data-plate="(\d)">([\s\S]*?)<\/span>/m);
  if (!slot) fail(`${file}: no next-up plate slot`);
  const [whole, indent, slotPlate, inner] = slot;
  if (slotPlate !== cardPlate) fail(`${file}: the slot says plate ${slotPlate} but the card says ${cardPlate}`);
  const want = coverPlate(target);
  const current = norm(inner);
  if (current === norm(want)) continue;
  drift++;
  if (CHECK) {
    console.error(`sync-plates: ${file} — the next-up plate for part ${target} ${current ? 'has drifted from' : 'is missing;'} the cover's`);
    continue;
  }
  const replacement = `${indent}<span class="next-up-plate dc-art" aria-hidden="true" data-plate="${slotPlate}">\n${reindent(want, indent + '  ')}\n${indent}</span>`;
  fs.writeFileSync(p, html.replace(whole, replacement));
  console.log(`sync-plates: ${file} ← cover plate ${target} (part ${part} leads on to ${href})`);
}

if (CHECK) {
  if (drift) { console.error(`sync-plates: ${drift} next-up plate(s) out of sync — run npm run sync:plates`); process.exit(1); }
  console.log('sync-plates: every next-up card carries the cover\'s plate for the part it leads to');
} else if (!drift) {
  console.log('sync-plates: nothing to do');
}
