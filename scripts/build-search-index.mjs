/**
 * Build public/site-b/search-index.json — the corpus behind the cover's search
 * panel (cover-docs.js).
 *
 * WHY THIS EXISTS. The panel used to carry three hand-written arrays. They went
 * stale the way hand-written arrays do, and quietly: the Parts list stopped at
 * Part 3 plus a Part 1 side page, the Sections list stopped at Part 3, and — the
 * one that actually misled readers — every glossary hit resolved to a PART PAGE
 * via a wave→route map that only knew waves 1-3, so all 39 wave-4 terms landed
 * on Part 1 with no anchor. Searching "Torque" put you on the Foundation page
 * with nothing highlighted. Nothing failed; the links just pointed at the wrong
 * place, which is the failure mode a hand-maintained index always has.
 *
 * So the index is derived, from the sources that already exist and are already
 * audited:
 *
 *   pages + canonical glossary hrefs  ← navigation-registry.json
 *   per-page one-line summary         ← that page's own <meta name="description">
 *   section titles                    ← that page's own `.on-this-page` list, so
 *                                       search and the reading drawer cannot
 *                                       disagree about what a section is called
 *   terms + definitions               ← acf-glossary.json
 *
 * FAIL-CLOSED. Every href this emits is resolved against the registry before it
 * is written: a route that is not a known page, or a #anchor that is not a known
 * id on that page, is an error and nothing is written. A search index that ships
 * a dead link is worse than one that fails the build.
 *
 * Run: node scripts/build-search-index.mjs [--check]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = path.join(root, 'public/site-b');
const out = path.join(site, 'search-index.json');
const check = process.argv.includes('--check');

const read = (f) => fs.readFileSync(path.join(site, f), 'utf8');
const registry = JSON.parse(read('navigation-registry.json'));
const glossary = JSON.parse(read('acf-glossary.json'));

const errors = [];
const SNIPPET = 150;

// Entities are decoded here rather than at render time: the panel escapes what it
// prints, so a raw `&mdash;` would reach the reader as those eight characters.
const decode = (s) => String(s)
  .replace(/&mdash;/g, '—').replace(/&ndash;/g, '–')
  .replace(/&middot;/g, '·').replace(/&approx;/g, '≈')
  .replace(/&rsquo;/g, '’').replace(/&lsquo;/g, '‘')
  .replace(/&ldquo;/g, '“').replace(/&rdquo;/g, '”')
  .replace(/&hellip;/g, '…').replace(/&nbsp;/g, ' ')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'").replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ').trim();

const trim = (s, n = SNIPPET) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

// --- the guard every emitted row goes through -------------------------------
const routes = new Set(registry.pages.map((p) => p.route));
const anchors = registry.sections;
function resolves(href, where) {
  const [route, hash] = href.split('#');
  if (!routes.has(route)) { errors.push(`${where}: ${href} — no such page`); return false; }
  if (hash && !(anchors[route] || []).includes(hash)) { errors.push(`${where}: ${href} — no such anchor on ${route}`); return false; }
  return true;
}

// --- parts: every page except the cover you are standing on ------------------
const parts = [];
for (const page of registry.pages) {
  if (page.route === '/') continue;
  const html = read(page.file);
  const desc = (html.match(/<meta\s+name="description"\s+content="([^"]*)"/i) || [, ''])[1];
  if (!desc) errors.push(`${page.file}: no <meta name="description"> to summarise the page`);
  if (resolves(page.route, `page ${page.route}`)) {
    parts.push({ t: decode(page.title), s: trim(decode(desc)), h: page.route });
  }
}

// --- sections: each page's own authored "on this page" list ------------------
const sections = [];
for (const page of registry.pages) {
  if (page.route === '/') continue;
  const html = read(page.file);
  // Three pages (the two galleries and the visual essay) carry no section list;
  // that is a legitimate shape, not a failure. Say so explicitly rather than
  // leaning on what indexOf(-1) happens to do inside a slice.
  const open = html.indexOf('<ol class="on-this-page"');
  if (open === -1) continue;
  const close = html.indexOf('</ol>', open);
  if (close === -1) { errors.push(`${page.file}: unterminated on-this-page list`); continue; }
  const list = html.slice(open, close);
  for (const m of list.matchAll(/<a href="(#[^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
    const href = `${page.route}${m[1]}`;
    if (!resolves(href, `section on ${page.route}`)) continue;
    sections.push({ t: decode(m[2].replace(/<[^>]+>/g, '')), s: decode(page.title), h: href });
  }
}

// --- glossary: the canonical entry row, never a part page --------------------
const terms = [];
for (const term of glossary.terms) {
  // The registry already computes this href for the tooltip layer's "view the
  // glossary entry" link. Using the same value is the whole point: one term, one
  // destination, wherever a reader meets it.
  const href = (registry.glossary[term.id] && registry.glossary[term.id].entry && registry.glossary[term.id].entry.href)
    || `/glossary#g-${term.id}`;
  if (!resolves(href, `term ${term.id}`)) continue;
  terms.push({ t: decode(term.term), s: trim(decode(term.definition)), h: href });
}

if (terms.length !== glossary.terms.length) errors.push(`only ${terms.length} of ${glossary.terms.length} terms resolved`);
if (parts.length !== registry.pages.length - 1) errors.push(`only ${parts.length} of ${registry.pages.length - 1} pages resolved`);

if (errors.length) {
  console.error('Search index build failed:');
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

const payload = `${JSON.stringify({ version: '1.0.0', parts, sections, glossary: terms }, null, 1)}\n`;
const summary = `${parts.length} pages · ${sections.length} sections · ${terms.length} terms`;

if (check) {
  const current = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
  if (current !== payload) { console.error('search-index.json is stale — run `npm run build:search`'); process.exit(1); }
  console.log(`Search index audit passed: ${summary}, every link resolved.`);
} else {
  fs.writeFileSync(out, payload);
  console.log(`Search index built: ${summary}.`);
}
