/**
 * The og/twitter block and the share bar's static hrefs, derived from a page's
 * own <title>, meta description and canonical link.
 *
 * WHY THIS IS A MODULE. build-social-meta.mjs stamps every routed page, but
 * three pages (glossary, framework-in-math, framework-in-pictures) are made by
 * cloning Part 6's shell, and a clone carries Part 6's social block and share
 * links with it. When a generator ran on its own, without the rest of
 * prebuild, the page it wrote shared as Part 6 until build:social-meta caught
 * up. The generators now stamp their own page with this same function before
 * they write, so a clone can never leave the generator carrying the donor's
 * identity, and build:social-meta, which runs after them, finds nothing to
 * change on those pages.
 */
import fs from 'node:fs';
import path from 'node:path';
import { CARD_THEME, CARD_DIR, cardFile } from './social-cards.config.mjs';
import { decodeEntities, shareText } from './site-titles.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const CARDS = path.join(ROOT, ...CARD_DIR);

export const BEGIN = '  <!-- BEGIN generated social meta — build-social-meta.mjs. Do not edit by hand. -->';
export const END = '  <!-- END generated social meta -->';
export const BLOCK = new RegExp(`\\n${escapeRe(BEGIN)}[\\s\\S]*?${escapeRe(END)}`, 'g');

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/** Attribute-safe. Input is already HTML-escaped in the source head, so this
 *  only has to survive re-embedding, not re-escape from scratch. */
const attr = (s) => s.replace(/"/g, '&quot;');

function field(html, re, what, page) {
  const m = html.match(re);
  if (!m) throw new Error(`${page}: no ${what} in <head> — social meta cannot be derived from it`);
  return m[1].trim();
}

/** The three head fields the social block restates. */
export function headFields(html, page) {
  return {
    page,
    title: field(html, /<title>([\s\S]*?)<\/title>/, '<title>', page),
    description: field(html, /<meta name="description" content="([^"]*)"/, 'meta description', page),
    url: field(html, /<link rel="canonical" href="([^"]*)"/, 'canonical link', page),
  };
}

/**
 * The card this page's tags point at.
 *
 * Only ONE appearance is ever served — og:image is a single URL fetched by a
 * crawler with no theme, so there is no prefers-color-scheme here the way
 * there is for the favicon. CARD_THEME (social-cards.config.mjs) is that
 * choice; both appearances are rendered so flipping it needs no browser.
 *
 * Cards are optional: a page without art falls back to the site card, so a new
 * page previews correctly the moment it exists rather than after someone
 * remembers to render for it.
 */
function cardFor(page) {
  const own = cardFile(page, CARD_THEME);
  const name = fs.existsSync(path.join(CARDS, own)) ? own : cardFile('default', CARD_THEME);
  return `/site-b/brand/social/${name}`;
}

function render({ title, description, url, page }) {
  const image = cardFor(page);
  return `
${BEGIN}
  <meta property="og:type" content="${page === 'cover-docs' ? 'website' : 'article'}">
  <meta property="og:site_name" content="The Adaptive Convexity Framework">
  <meta property="og:title" content="${attr(title)}">
  <meta property="og:description" content="${attr(description)}">
  <meta property="og:url" content="${attr(url)}">
  <meta property="og:image" content="https://docs.acfdashboard.com${image}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${attr(title)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${attr(title)}">
  <meta name="twitter:description" content="${attr(description)}">
  <meta name="twitter:image" content="https://docs.acfdashboard.com${image}">
${END}`;
}

/**
 * The share bar's static hrefs (D-TITLES). With JS on, reading-core.js rewrites
 * them from document.title and the canonical; with JS off, these are what a
 * reader gets. They are written here, from the same two fields and the same
 * rule (shareText), so the two can never send different text, and nobody types
 * a share link by hand.
 */
function shareLinks(html, { title, url }) {
  const text = encodeURIComponent(shareText(decodeEntities(title)));
  const link = encodeURIComponent(decodeEntities(url));
  return html
    .replace(/(<a class="part-action" data-share="x" href=")[^"]*(")/, `$1https://x.com/intent/post?text=${text}&amp;url=${link}$2`)
    .replace(/(<a class="part-action" data-share="email" href=")[^"]*(")/, `$1mailto:?subject=${text}&amp;body=${link}$2`);
}

/**
 * Return `html` with its social block and share links rewritten from its own
 * head. Any block already present (a donor's included) is removed first, so the
 * result never carries another page's identity, and stamping twice is a no-op.
 * Throws when the page has no title, description or canonical link to derive
 * from, or no canonical link to anchor the block after.
 */
export function stampSocialMeta(html, page) {
  const meta = headFields(html, page);
  const stripped = shareLinks(html.replace(BLOCK, ''), meta);
  // Anchor after the canonical link: the og:url derives from it, so keeping
  // them adjacent makes a mismatch visible in review rather than 40 lines apart.
  const anchor = stripped.match(/  <link rel="canonical" href="[^"]*">/);
  if (!anchor) throw new Error(`${page}: no canonical anchor to insert after`);
  const at = anchor.index + anchor[0].length;
  return stripped.slice(0, at) + render(meta) + stripped.slice(at);
}
