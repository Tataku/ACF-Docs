#!/usr/bin/env node
/**
 * The characters this site can put on screen.
 *
 * ONE derivation, used by both the subsetter and the audit, so the question
 * "what must the fonts cover?" has a single answer. The subsetter shells out to
 * this script; the audit imports it. Neither keeps its own copy.
 *
 * Three sources, in order of how sure we are:
 *
 *   1. EVERY codepoint in every text file shipped under public/site-b, AT ANY
 *      DEPTH — the HTML, the stylesheet, the scripts (the chart bundle included,
 *      which is where the exhibit labels live), the vendored libraries and the
 *      JSON the runtime reads. This is a superset of what can appear, since it
 *      also catches characters inside code and comments — which costs a few
 *      glyphs and removes a whole class of mistake.
 *
 *      Depth matters more than it looks. A root-only scan reads the eleven pages
 *      and misses brand/, vendor/ and anything added later; the contract would
 *      then be enforcing a promise about files it had never opened.
 *
 *      A character only counts if this file can SEE it, and two notations hide
 *      one in plain ASCII: an HTML entity (`&mdash;`) and a CSS escape
 *      (`content: "\2713"`). Both are decoded below. See ESCAPE HAZARD.
 *
 *   2. All printable ASCII, whether or not it currently appears. Text arrives
 *      at runtime from number formatting and from the narration transport, and
 *      a missing bracket is not worth the risk.
 *
 *   3. A deliberate set for what editorial copy and `toLocaleString` can
 *      produce WITHOUT a code change: Latin-1 accented letters for a cited
 *      name, the non-breaking and narrow spaces number formatting inserts, the
 *      typographic quotes and dashes a writer types, and the maths and currency
 *      marks this material already reaches for.
 *
 * ESCAPE HAZARD — why this file throws.
 *
 * An earlier version of this comment claimed a missed entity was harmless,
 * because `npm run audit:fonts` would catch it. That was wrong, and it was
 * wrong in the most expensive way: the audit IMPORTS this derivation, so a
 * character this file cannot see is a character the audit cannot miss. One
 * blind spot, in both the cutter and the proof.
 *
 * It cost real glyphs. `&Sigma;` and `&check;` were not in the decode table, so
 * U+03A3 and U+2713 were absent from the corpus, absent from the subsets, and
 * silently falling back to a system font — 32 occurrences across the site, and
 * visible only as a 1.47px width change in a rendered measurement.
 *
 * So an unrecognised named entity in an HTML page is now a hard failure rather
 * than a quiet omission. Adding one line here is the fix; a wrong glyph shipped
 * to a reader is not. Numeric entities and CSS escapes need no table and are
 * decoded outright.
 *
 * Run: node scripts/fonts-corpus.mjs            (human-readable summary)
 *      node scripts/fonts-corpus.mjs --json     (the codepoints, for tooling)
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SITE_B = path.join(ROOT, 'public', 'site-b');
const TEXT_EXT = new Set(['.html', '.css', '.js', '.json', '.mjs']);

/**
 * Every text file under public/site-b, at any depth, as a path relative to it.
 *
 * EXTENSION decides, never location. fonts/, icons/ and brand/ hold woff2, png
 * and svg, which are not text extensions and so cost nothing to walk past — and
 * naming those directories as exceptions would be the same blind spot in a new
 * shape, since the next directory would not be on the list.
 *
 * Symlinks are not followed: isDirectory() is false for one, so there is no way
 * to walk out of the tree or around a cycle.
 *
 * fonts/subset-manifest.json is written BY this corpus and read back by it,
 * which is stable rather than circular: the manifest carries codepoints as
 * numbers and its prose is ASCII, both of which source 2 already covers, so it
 * can never add a character and can never move its own result.
 */
export function textFiles(dir = SITE_B, prefix = '') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...textFiles(path.join(dir, entry.name), rel));
    else if (TEXT_EXT.has(path.extname(entry.name))) out.push(rel);
  }
  return out.sort();
}

// Every named entity the pages actually use, plus the near neighbours a writer
// is likely to reach for next. Anything outside this table stops the build
// rather than losing a glyph — see ESCAPE HAZARD above.
const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  mdash: '—', ndash: '–', hellip: '…', middot: '·', bull: '•',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', laquo: '«', raquo: '»',
  times: '×', divide: '÷', le: '≤', ge: '≥', ne: '≠', approx: '≈',
  plusmn: '±', minus: '−', sum: '∑', radic: '√', infin: '∞', deg: '°',
  Sigma: 'Σ', sigma: 'σ', alpha: 'α', beta: 'β', Delta: 'Δ', delta: 'δ',
  sect: '§', copy: '©', reg: '®', trade: '™', dagger: '†', para: '¶',
  larr: '←', uarr: '↑', rarr: '→', darr: '↓', harr: '↔',
  check: '✓', cross: '✗', star: '☆', prime: '′', Prime: '″',
  frac12: '½', frac14: '¼', frac34: '¾', hearts: '♥',
  pound: '£', yen: '¥', euro: '€', cent: '¢',
  ensp: ' ', emsp: ' ', thinsp: ' ', shy: '­', zwnj: '‌'
};

/** Named and numeric HTML character references. Unknown NAMES are reported, not guessed. */
export function decodeEntities(s, onUnknown) {
  return s
    .replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-fA-F]+);/g, (m, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (m, n) => {
      if (ENTITIES[n] !== undefined) return ENTITIES[n];
      if (onUnknown) onUnknown(m);
      return m;
    });
}

/**
 * CSS character escapes: `content: "\2713"` puts a glyph on screen while the
 * stylesheet holds nothing but ASCII. One to six hex digits, optionally closed
 * by a single whitespace, per CSS Syntax §4.3.7.
 */
export function decodeCssEscapes(s) {
  return s.replace(/\\([0-9a-fA-F]{1,6})[ \t\n]?/g, (m, h) => {
    const c = parseInt(h, 16);
    return c > 0 && c <= 0x10ffff && !(c >= 0xd800 && c <= 0xdfff) ? String.fromCodePoint(c) : m;
  });
}

const STYLE_BLOCK = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
const SCRIPT_BLOCK = /<script\b[^>]*>[\s\S]*?<\/script>/gi;

/**
 * Text as the font engine will meet it. Per extension, because the same
 * backslash means a codepoint in CSS and something else entirely in JavaScript:
 * decoding `\d{4}` in a regex as a character would be nonsense, so CSS escapes
 * are only read where CSS is.
 */
function renderable(file, raw, onUnknown) {
  const ext = path.extname(file);
  if (ext === '.css') return decodeCssEscapes(raw);
  if (ext !== '.html') return raw;
  // Entities are markup, so an inline <script> is not markup for this purpose —
  // minified JS contains `&r;`-shaped text that is not an entity at all.
  decodeEntities(raw.replace(SCRIPT_BLOCK, ' '), onUnknown);
  let text = decodeEntities(raw);
  for (const m of raw.matchAll(STYLE_BLOCK)) text += '\n' + decodeCssEscapes(m[1]);
  return text;
}

// Source 3, written out so a reviewer can argue with each line rather than
// trust a range. Every one of these can appear without anybody editing code.
export const INTENTIONAL = [
  // Spaces number formatting inserts. Intl uses U+00A0 or U+202F as a thousands
  // separator depending on locale, and neither is visible in a diff.
  0x00a0, 0x2009, 0x202f,
  // What a writer types: the curly quotes, the two dashes, the ellipsis, the
  // prime marks used for minutes and feet.
  0x2018, 0x2019, 0x201c, 0x201d, 0x2013, 0x2014, 0x2026, 0x2032, 0x2033,
  0x00ab, 0x00bb, 0x2039, 0x203a,
  // Maths this material already reaches for, plus the near neighbours of the
  // ones it uses, so a new formula does not need a font rebuild.
  0x00b1, 0x00d7, 0x00f7, 0x2212, 0x2248, 0x2260, 0x2264, 0x2265,
  0x221a, 0x2211, 0x221e, 0x00b0,
  // Greek, because the formulas use it. Sigma is already on the page; the rest
  // are the letters this kind of notation reaches for next.
  0x0394, 0x03a3, 0x03b1, 0x03b2, 0x03bc, 0x03c3,
  // Marks and money. The dollar is ASCII; these are the ones that are not.
  0x00a7, 0x00a9, 0x00ae, 0x2122, 0x00b7, 0x2022, 0x00a3, 0x00a5, 0x20ac,
  // Arrows, as used by the navigation and the exhibit captions.
  0x2190, 0x2191, 0x2192, 0x2193, 0x2197, 0x21b3,
  // The read-marker in the footer, which arrives as a CSS escape.
  0x2713
];

export function corpus() {
  const set = new Set();
  const unknown = new Map();
  for (let c = 0x20; c <= 0x7e; c += 1) set.add(c);               // source 2
  for (const c of INTENTIONAL) set.add(c);                        // source 3
  // Latin-1 letters, for a cited name or a loanword. Precomposed, so no
  // combining-mark positioning is involved.
  for (let c = 0x00c0; c <= 0x00ff; c += 1) set.add(c);
  for (const file of textFiles()) {                                // source 1
    const raw = fs.readFileSync(path.join(SITE_B, file), 'utf8');
    const text = renderable(file, raw, (ent) => {
      if (!unknown.has(ent)) unknown.set(ent, file);
    });
    for (const ch of text) {
      const c = ch.codePointAt(0);
      if (c >= 0x20) set.add(c);
    }
  }
  if (unknown.size) {
    throw new Error(
      'Unrecognised HTML entit' + (unknown.size === 1 ? 'y' : 'ies') + ', so the character ' +
      (unknown.size === 1 ? 'it names is' : 'they name are') + ' missing from the font corpus:\n' +
      [...unknown].map(([e, f]) => `  ${e}  (${f})`).join('\n') +
      '\nAdd each one to ENTITIES in scripts/fonts-corpus.mjs, then run `npm run build:fonts`.' +
      '\nLeaving it undecoded would cut the glyph from the subsets and fall back to a system font.');
  }
  return [...set].sort((a, b) => a - b);
}

if (import.meta.filename === process.argv[1]) {
  const cps = corpus();
  if (process.argv.includes('--json')) {
    process.stdout.write(JSON.stringify(cps));
  } else {
    const nonAscii = cps.filter((c) => c > 0x7e);
    console.log(`Font corpus: ${cps.length} codepoints (${cps.length - nonAscii.length} ASCII, ${nonAscii.length} beyond).`);
    console.log('Beyond ASCII: ' + nonAscii.map((c) => String.fromCodePoint(c)).join(' '));
  }
}
