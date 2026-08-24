#!/usr/bin/env node
/**
 * Render the 1200x630 social card art for every routed Site B page, in both
 * appearances.
 *
 * WHY BOTH, WHEN ONLY ONE IS EVER SERVED. og:image is a single URL fetched by
 * a crawler with no theme, so exactly one card per page reaches readers — the
 * one CARD_THEME names. Rendering both anyway makes that choice reversible
 * with a one-line edit and no browser: switching appearance is a
 * `build-social-meta` run, not a re-render. Both sets are audited, so neither
 * can quietly rot.
 *
 * WHY THIS IS NOT IN prebuild. It needs a headless browser, and adding
 * Playwright to a site whose entire dependency set is next + react + esbuild
 * would put a ~300MB download in the deploy path for art that changes when a
 * Part is retitled — which is roughly never. So the PNGs are committed, and
 * `npm run audit:social` catches the case where a title moved out from under
 * its card by comparing cards.json against the live <title>. The browser is
 * needed to FIX that drift, never to DETECT it.
 *
 * WHY A PLATE, WHEN THE FAVICON DROPPED ITS PLATE. Opposite problems. A favicon
 * lands on browser chrome whose colour it cannot read, so it has to survive
 * both — transparency plus a theme-aware ink. A social card lands in a feed
 * that composites it onto its own background at a known size, so it must carry
 * its own ground or it dissolves into whichever timeline is showing it. That is
 * also why the light card stays legible in a dark feed and vice versa.
 *
 * Type is the site's own self-hosted Inter and JetBrains Mono, loaded from
 * public/site-b/fonts, so the card is set in the same faces as the page it
 * previews rather than in whatever the renderer defaults to.
 *
 * Run: npm run build:social-cards
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { PAGES, THEMES, CARD_DIR, cardFile } from './social-cards.config.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const SITE = path.join(ROOT, 'public', 'site-b');
const OUT = path.join(ROOT, ...CARD_DIR);
const FONTS = path.join(SITE, 'fonts');

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", middot: '·', mdash: '—', ndash: '–', rsquo: '’', nbsp: ' ' };
const decode = (s) => s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, e) => {
  if (e[0] === '#') {
    const hex = e[1] === 'x' || e[1] === 'X';
    return String.fromCodePoint(parseInt(hex ? e.slice(2) : e.slice(1), hex ? 16 : 10));
  }
  return ENTITIES[e] ?? m;
});
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Split a page title into the eyebrow and the headline the card sets.
 * "Part 3 — Bitcoin: Convexity Backbone · The Adaptive Convexity Framework"
 *   -> eyebrow "Part 3", headline "Bitcoin: Convexity Backbone"
 * The cover has no separators, so it becomes the headline whole.
 */
function split(rawTitle) {
  const title = decode(rawTitle);
  const lead = title.split('·')[0].trim();
  const dash = lead.match(/^(Part\s+\d+)\s*[—–-]\s*(.+)$/);
  if (dash) return { eyebrow: dash[1], headline: dash[2].trim() };
  return { eyebrow: 'Framework Documentation', headline: lead };
}

function read(page) {
  const html = fs.readFileSync(path.join(SITE, `${page}.html`), 'utf8');
  return {
    title: html.match(/<title>([\s\S]*?)<\/title>/)[1].trim(),
    description: html.match(/<meta name="description" content="([^"]*)"/)[1].trim(),
  };
}

const b64 = (f) => fs.readFileSync(path.join(FONTS, f)).toString('base64');
const INTER = b64('InterVariable.woff2');
const MONO = b64('JetBrainsMono-Medium.woff2');

const mark = (ink) => `<svg viewBox="0 0 64 64" width="86" height="86" fill="none" stroke="${ink}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">
  <line x1="32" y1="12" x2="32" y2="22"/><rect x="6" y="22" width="52" height="34" rx="15"/>
  <circle cx="32" cy="7" r="5.5" fill="${ink}" stroke="none"/>
  <circle cx="22" cy="39" r="4.5" fill="${ink}" stroke="none"/>
  <circle cx="42" cy="39" r="4.5" fill="${ink}" stroke="none"/></svg>`;

function card({ eyebrow, headline, description }, t) {
  // Long headlines step down rather than wrap into the rule below them. The
  // 44 stop is where a headline starts taking a third line at 66px, and three
  // lines plus a two-line description is what crowds the footer rule.
  const size = headline.length > 44 ? 56 : headline.length > 34 ? 66 : 76;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face { font-family: Inter; src: url(data:font/woff2;base64,${INTER}) format('woff2'); font-weight: 100 900; }
    @font-face { font-family: JBMono; src: url(data:font/woff2;base64,${MONO}) format('woff2'); font-weight: 500; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { width: 1200px; height: 630px; background: ${t.paper}; color: ${t.inkDisplay};
           font-family: Inter, sans-serif; display: flex; flex-direction: column;
           justify-content: space-between; padding: 72px 80px; -webkit-font-smoothing: antialiased; }
    .top { display: flex; align-items: center; gap: 22px; }
    .word { font-size: 30px; font-weight: 600; letter-spacing: .16em; }
    .eyebrow { font-family: JBMono, monospace; font-weight: 500; font-size: 22px;
               letter-spacing: .22em; text-transform: uppercase; color: ${t.accent}; margin-bottom: 22px; }
    h1 { font-size: ${size}px; font-weight: 600; line-height: 1.1; letter-spacing: -.02em;
         max-width: 17ch; text-wrap: balance; }
    p { margin-top: 26px; font-size: 25px; line-height: 1.45; color: ${t.inkMuted}; max-width: 46ch;
        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .foot { border-top: 1px solid ${t.rule}; padding-top: 30px; margin-top: 16px; font-family: JBMono, monospace;
            font-weight: 500; font-size: 21px; letter-spacing: .08em; color: ${t.inkMuted}; }
  </style></head><body>
    <div class="top">${mark(t.accent)}<span class="word">ACF</span></div>
    <div><div class="eyebrow">${esc(eyebrow)}</div><h1>${esc(headline)}</h1><p>${esc(description)}</p></div>
    <div class="foot">docs.acfdashboard.com</div>
  </body></html>`;
}

let chromium;
try {
  ({ chromium } = createRequire(import.meta.url)('playwright'));
} catch {
  console.error('Card rendering needs Playwright, which is deliberately not a dependency of this site.\n'
    + 'Install it just for this run:  npm i -D playwright && npx playwright install chromium\n'
    + '`npm run audit:social` detects card drift without it; only fixing drift needs a browser.');
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const cards = {};

for (const page of PAGES) {
  const { title, description } = read(page);
  const parts = { ...split(title), description: decode(description) };
  for (const [theme, palette] of Object.entries(THEMES)) {
    const pg = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
    await pg.setContent(card(parts, palette));
    await pg.evaluate(() => document.fonts.ready);
    await pg.screenshot({ path: path.join(OUT, cardFile(page, theme)) });
    await pg.close();
  }
  // Recorded so audit:social can tell that a retitled page outran its art.
  cards[page] = { title };
  console.log(`  ${page}  ${parts.eyebrow} / ${parts.headline}`);
}

// Fallback art for any future page that has none of its own yet, in both
// appearances so switching CARD_THEME never lands on a missing default.
for (const theme of Object.keys(THEMES)) {
  fs.copyFileSync(path.join(OUT, cardFile('cover-docs', theme)), path.join(OUT, cardFile('default', theme)));
}
await browser.close();

fs.writeFileSync(path.join(OUT, 'cards.json'), `${JSON.stringify({
  note: 'Written by scripts/build-social-cards.mjs. `npm run audit:social` compares these titles to the live <title> to catch art that outran its page.',
  themes: Object.keys(THEMES),
  cards,
}, null, 2)}\n`);
console.log(`Social cards built: ${PAGES.length} pages x ${Object.keys(THEMES).length} appearances + fallbacks -> public/site-b/brand/social/`);
