/**
 * The site's titles, stated once (D-TITLES, 2026-10-01).
 *
 * WHY THIS EXISTS. A Part's title is printed in at least nine places: its h1,
 * its <title>, the og/twitter tags derived from that, the sidebar of every
 * page, the footer, the next-up card that leads to it, the cover card, the
 * navigation registry, the social card and the glossary's source references.
 * They were spelled three ways ("and" versus "&", an em dash versus a colon),
 * and the share code and the social-card renderer parsed the em dash, so a fix
 * on the pages alone would have broken both parsers.
 *
 * The pages are hand-authored HTML, so they cannot import this file. Instead
 * the generators read it (navigation registry, social meta and cards) and
 * tests/site-titles.test.mjs holds every hand-authored surface to it.
 *
 * Plain text here, with a literal "&". HTML writers escape it to &amp;.
 */

export const SITE_NAME = 'The Adaptive Convexity Framework';

/** Separator between a title's parts, on the page and in every parser. */
export const SEP = ' · ';

export const PART_TITLES = Object.freeze({
  1: 'Foundation & Philosophy',
  2: 'Lineage & Macro Thesis',
  3: 'Bitcoin: Convexity Backbone',
  4: 'Tax Architecture & ROC Strategy',
  5: 'Portfolio Construction & Position Management',
  6: 'Convexity & Framework Integrity Scoring',
});

/** The label a page goes by in the registry, on its social card and in share text. */
export const partLabel = (n) => `Part ${n}${SEP}${PART_TITLES[n]}`;

/**
 * Every routed page: file, the h1 it carries, and its label (the <title>
 * without the trailing site name). The cover's <title> is the site name alone.
 */
export const PAGES = Object.freeze([
  { file: 'cover-docs.html', part: 0, h1: SITE_NAME, label: SITE_NAME },
  ...[1, 2, 3, 4, 5, 6].flatMap((n) => {
    const file = {
      1: 'part-1-foundation.html', 2: 'part-2-lineage-macro.html', 3: 'part-3-bitcoin-convexity.html',
      4: 'part-4-tax-architecture.html', 5: 'part-5-portfolio-construction.html', 6: 'part-6-convexity-scoring.html',
    }[n];
    const part = { file, part: n, h1: PART_TITLES[n], label: partLabel(n) };
    return n === 1
      ? [part, { file: 'part-1-pictures.html', part: 1, h1: 'Part 1 in Pictures', label: 'Part 1 in Pictures' }]
      : [part];
  }),
  { file: 'glossary.html', part: 7, h1: 'Glossary', label: 'Glossary' },
  { file: 'framework-in-pictures.html', part: 7, h1: 'The Framework in Pictures', label: 'The Framework in Pictures' },
  { file: 'framework-in-math.html', part: 7, h1: 'The Framework in Math', label: 'The Framework in Math' },
  { file: 'evidence.html', part: 7, h1: 'Evidence', label: 'Evidence' },
].map(Object.freeze));

/** The full <title> text (plain, unescaped) for a page label. */
export const documentTitle = (label) => (label === SITE_NAME ? SITE_NAME : `${label}${SEP}${SITE_NAME}`);

/**
 * Share text and social-card source: the title with the trailing site name
 * stripped. "Part 4 · Tax Architecture & ROC Strategy · The Adaptive Convexity
 * Framework" -> "Part 4 · Tax Architecture & ROC Strategy". reading-core.js
 * carries the same rule in browser code; the test pins the two together.
 */
export const shareText = (title) => {
  const t = String(title).replace(/\s*·\s*The Adaptive Convexity Framework\s*$/, '').trim();
  return t || SITE_NAME;
};

/**
 * Split a share label into a social card's eyebrow and headline on the FIRST
 * " · ". No separator (the cover, "Glossary", "Part 1 in Pictures") means the
 * whole label is the headline.
 */
export const splitLabel = (label) => {
  const at = label.indexOf(SEP);
  return at === -1 ? { eyebrow: null, headline: label } : { eyebrow: label.slice(0, at), headline: label.slice(at + SEP.length) };
};

/** Decode the few entities the page heads use, so rules see what a reader sees. */
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", middot: '·', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', nbsp: '\u00a0' };
export const decodeEntities = (s) => String(s).replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, e) => {
  if (e[0] === '#') {
    const hex = e[1] === 'x' || e[1] === 'X';
    return String.fromCodePoint(parseInt(hex ? e.slice(2) : e.slice(1), hex ? 16 : 10));
  }
  return ENTITIES[e] ?? m;
});

/** Meta description rules (D-TITLES). Returns a list of problems, empty when fine. */
export const MAX_DESCRIPTION = 115;
export function descriptionProblems(description, label) {
  const out = [];
  const text = String(description);
  if ([...text].length > MAX_DESCRIPTION) out.push(`description is ${[...text].length} characters (max ${MAX_DESCRIPTION})`);
  if (/—|&mdash;|&#8212;|&#x2014;/i.test(text)) out.push('description carries an em dash');
  const { headline } = splitLabel(label);
  if (label !== SITE_NAME && text.toLowerCase().includes(headline.toLowerCase())) out.push('description repeats the title');
  return out;
}
