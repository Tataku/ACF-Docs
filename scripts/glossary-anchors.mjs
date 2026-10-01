/**
 * Where a glossary term "appears later" (D-GLOSSARY-APPEARS-LATER, 2026-10-01).
 *
 * WHY THIS EXISTS. Each term's second-layer link ("Appears in Part N · topic")
 * used to land at the top of a Part that can run past 25 minutes, and many
 * topics named a heading the Part did not have. Now each `appearsLater` carries
 * an `anchor` (a section id on that Part) and a `topic` that must be a real
 * heading in that section: its h2, or an h3 or callout title inside it.
 *
 * One rule, three callers: build-glossary-page.mjs and
 * build-navigation-registry.mjs refuse to build on a broken entry, and
 * tests/glossary-index.test.mjs pins the same check.
 *
 * Matching ignores case, HTML entities, curly apostrophes and a trailing
 * period, so the topic can be written in plain text and in sentence case.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PAGES } from './site-titles.mjs';

const SITE = path.resolve(import.meta.dirname, '..', 'public', 'site-b');

/** Part number -> the Part's own page (never Part 1 in Pictures). */
export const PART_FILES = Object.freeze(Object.fromEntries(
  PAGES.filter((p) => p.part >= 1 && p.part <= 6 && p.file !== 'part-1-pictures.html').map((p) => [p.part, p.file]),
));

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: "'", lsquo: "'",
  ldquo: '"', rdquo: '"', middot: '·', mdash: '—', ndash: '–', hellip: '…', approx: '≈', times: '×',
};
const decode = (s) => String(s)
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);

/** The comparison form of a heading or topic. */
export const normalizeHeading = (s) => decode(String(s).replace(/<[^>]+>/g, ''))
  .replace(/[‘’ʼ]/g, "'")
  .replace(/\s+/g, ' ')
  .trim()
  .replace(/\.$/, '')
  .toLowerCase();

/**
 * The headings of one section: its h2, the h3s inside it and its callout
 * titles (p.callout-label), as the page reads them. Chart figures are left
 * out. Returns null when the page has no <section id="anchor">.
 */
export function sectionHeadings(html, anchor) {
  const secs = [...html.matchAll(/<section\b[^>]*\bid="([^"]+)"/g)];
  const i = secs.findIndex((m) => m[1] === anchor);
  if (i < 0) return null;
  const body = html.slice(secs[i].index, i + 1 < secs.length ? secs[i + 1].index : html.length)
    .replace(/<figure\b[\s\S]*?<\/figure>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '');
  return [...body.matchAll(/<h([23])\b[^>]*>([\s\S]*?)<\/h\1>|<p\b[^>]*\bclass="callout-label"[^>]*>([\s\S]*?)<\/p>/g)]
    .map((m) => decode((m[2] ?? m[3]).replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim());
}

const pageCache = new Map();
const readPart = (n) => {
  if (!pageCache.has(n)) pageCache.set(n, fs.readFileSync(path.join(SITE, PART_FILES[n]), 'utf8'));
  return pageCache.get(n);
};

/** Every broken appearsLater entry in a term list, as readable problems. */
export function appearsLaterProblems(terms, read = readPart) {
  const problems = [];
  for (const t of terms) {
    const later = t.appearsLater;
    if (!later) continue;
    if (!PART_FILES[later.part]) { problems.push(`${t.id}: appearsLater.part ${later.part} has no Part page`); continue; }
    if (!later.anchor) { problems.push(`${t.id}: appearsLater has no anchor`); continue; }
    if (!later.topic) { problems.push(`${t.id}: appearsLater has no topic`); continue; }
    const found = sectionHeadings(read(later.part), later.anchor);
    if (!found) { problems.push(`${t.id}: Part ${later.part} has no section #${later.anchor}`); continue; }
    if (!found.some((h) => normalizeHeading(h) === normalizeHeading(later.topic))) {
      problems.push(`${t.id}: topic "${later.topic}" is not a heading in Part ${later.part} #${later.anchor} (${found.join(' | ')})`);
    }
  }
  return problems;
}
