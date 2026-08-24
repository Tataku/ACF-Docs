#!/usr/bin/env node
/**
 * Render the 1200x630 social card art for every routed Site B page.
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
 * its own ground or it dissolves into whichever timeline is showing it.
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

const ROOT = path.resolve(import.meta.dirname, '..');
const SITE = path.join(ROOT, 'public', 'site-b');
const OUT = path.join(SITE, 'brand', 'social');
const FONTS = path.join(SITE, 'fonts');

const PAGES = [
  'cover-docs', 'part-1-foundation', 'part-1-pictures', 'part-2-lineage-macro',
  'part-3-bitcoin-convexity', 'part-4-tax-architecture', 'part-5-portfolio-construction',
  'part-6-convexity-scoring', 'glossary', 'framework-in-math', 'framework-in-pictures',
];

// Dark theme values from tokens.css. Literal because a PNG cannot read a
// custom property; kept in one block so a token change has one place to land.
const IN = {
  paper: '#14171a',
  inkDisplay: '#f3efe6',
  inkMuted: '#c8cbc6',
  accent: '#34d399',
  rule: '#2a3137',
};

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", middot: '·', mdash: '—', ndash: '–', rsquo: '’', nbsp: ' ' };
const decode = (s) => s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, e) => {
  if (e[0] === '#') return String.fromCodePoint(parseInt(e[1] === 'x' || e[1] === 'X' ? e.slice(2) : e.slice(1), e[1] === 'x' || e[1] === 'X' ? 16 : 10));
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
  if (lead !== title) return { eyebrow: 'Framework Documentation', headline: lead };
  return { eyebrow: 'Framework Documentation', headline: lead };
}

function read(page) {
  const html = fs.readFileSync(path.join(SITE, `${page}.html`), 'utf8');
  const title = html.match(/<title>([\s\S]*?)<\/title>/)[1].trim();
  const description = html.match(/<meta name="description" content="([^"]*)"/)[1].trim();
  return { title, description };
}

const b64 = (f) => fs.readFileSync(path.join(FONTS, f)).toString('base64');
const MARK = `<svg viewBox="0 0 64 64" width="86" height="86" fill="none" stroke="${IN.accent}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">
  <line x1="32" y1="12" x2="32" y2="22"/><rect x="6" y="22" width="52" height="34" rx="15"/>
  <circle cx="32" cy="7" r="5.5" fill="${IN.accent}" stroke="none"/>
  <circle cx="22" cy="39" r="4.5" fill="${IN.accent}" stroke="none"/>
  <circle cx="42" cy="39" r="4.5" fill="${IN.accent}" stroke="none"/></svg>`;

function card({ eyebrow, headline, description }) {
  // Long headlines step down rather than wrap into the rule below them. The
  // 44 stop is where a headline starts taking a third line at 66px, and three
  // lines plus a two-line description is what crowds the footer rule.
  const size = headline.length > 44 ? 56 : headline.length > 34 ? 66 : 76;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face { font-family: Inter; src: url(data:font/woff2;base64,${b64('InterVariable.woff2')}) format('woff2'); font-weight: 100 900; }
    @font-face { font-family: JBMono; src: url(data:font/woff2;base64,${b64('JetBrainsMono-Medium.woff2')}) format('woff2'); font-weight: 500; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { width: 1200px; height: 630px; background: ${IN.paper}; color: ${IN.inkDisplay};
           font-family: Inter, sans-serif; display: flex; flex-direction: column;
           justify-content: space-between; padding: 72px 80px; -webkit-font-smoothing: antialiased; }
    .top { display: flex; align-items: center; gap: 22px; }
    .word { font-size: 30px; font-weight: 600; letter-spacing: .16em; }
    .eyebrow { font-family: JBMono, monospace; font-weight: 500; font-size: 22px;
               letter-spacing: .22em; text-transform: uppercase; color: ${IN.accent}; margin-bottom: 22px; }
    h1 { font-size: ${size}px; font-weight: 600; line-height: 1.1; letter-spacing: -.02em;
         max-width: 17ch; text-wrap: balance; }
    p { margin-top: 26px; font-size: 25px; line-height: 1.45; color: ${IN.inkMuted}; max-width: 46ch;
        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .foot { border-top: 1px solid ${IN.rule}; padding-top: 30px; margin-top: 16px; font-family: JBMono, monospace;
            font-weight: 500; font-size: 21px; letter-spacing: .08em; color: ${IN.inkMuted}; }
  </style></head><body>
    <div class="top">${MARK}<span class="word">ACF</span></div>
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
const launch = process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {};
const browser = await chromium.launch(launch);
const cards = {};

for (const page of PAGES) {
  const { title, description } = read(page);
  const { eyebrow, headline } = split(title);
  const pg = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await pg.setContent(card({ eyebrow, headline, description: decode(description) }));
  await pg.evaluate(() => document.fonts.ready);
  await pg.screenshot({ path: path.join(OUT, `${page}.png`) });
  await pg.close();
  // Recorded so audit:social can tell that a retitled page outran its art.
  cards[page] = { title };
  console.log(`  ${page}.png  ${eyebrow} / ${headline}`);
}

// The fallback for any future page that has no art of its own yet.
fs.copyFileSync(path.join(OUT, 'cover-docs.png'), path.join(OUT, 'default.png'));
await browser.close();

fs.writeFileSync(path.join(OUT, 'cards.json'), `${JSON.stringify({
  note: 'Written by scripts/build-social-cards.mjs. `npm run audit:social` compares these titles to the live <title> to catch art that outran its page.',
  cards,
}, null, 2)}\n`);
console.log(`Social cards built: ${PAGES.length} cards + default.png -> public/site-b/brand/social/`);
