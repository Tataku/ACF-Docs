#!/usr/bin/env node
/**
 * Pin the brand mark's geometry across every page that draws it.
 *
 * WHY A TEST AND NOT A COMMENT. The mark is inlined per page — the house
 * convention for icons here, so they inherit theme via currentColor — and it is
 * also drawn by the ACFDashboard repo, which cannot see this one. "They are
 * identical, keep them that way" written in a comment is a wish. This makes a
 * fork fail: change a number here and this check goes red; change it there and
 * tests/gate/brand-identity.test.js goes red on the same numbers.
 *
 * The two repositories therefore agree by construction rather than by anyone
 * remembering. If the mark genuinely needs to change, it changes in both, and
 * both checks are updated in the same breath — which is the point.
 *
 * Run: npm run audit:brand
 */
import fs from 'node:fs';
import path from 'node:path';
import { PAGES } from './social-cards.config.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const SITE = path.join(ROOT, 'public', 'site-b');

/**
 * The mark: the WHOLE ACF figure — antenna with its tip, head, two eyes, the
 * three-line neck, the three-branch convexity arc and three planted feet.
 * Shared verbatim with ACFDashboard's public/assets/brand/acf-mark.svg and
 * favicon.svg, all generated from one geometry module
 * (ACFDashboard src/features/shared/components/ACFMascot/mascotGeometry.js via
 * scripts/lib/brandMark.mjs). These pages are re-emitted from that same module,
 * so a fork here is a fork there.
 *
 * IT USED TO BE A HEAD-AND-NECK REDUCTION, on the premise that the legs were
 * unrenderable at chrome size. Owner ruling 2026-09-15 retired that: measured in
 * Chromium, the FEET resolve as three at every size down to 16px and it is the
 * NECK that merges, so the reduction had dropped the durable feature to protect
 * the fragile one. Below 32px the strokes thicken (×1.4) — `.brand-mark` renders
 * at 1.6rem, so the marks on these pages carry that weight. The COORDINATES
 * below are weight-independent, which is exactly why they are what gets pinned.
 */
const GEOMETRY = [
  'x="50" y="38" width="156" height="74" rx="32"',   // head
  'x1="128" y1="20" x2="128" y2="38"',               // antenna stem
  'cx="128" cy="14"',                                // antenna tip
  'x1="116" y1="124" x2="140" y2="124"',             // neck 1
  'x1="116" y1="132" x2="140" y2="132"',             // neck 2
  'x1="116" y1="140" x2="140" y2="140"',             // neck 3
  'd="M128 146 C128 158 82 157 68 204"',             // left convexity arc
  'd="M128 146 L128 204"',                           // centre strut
  'd="M128 146 C128 158 174 157 188 204"',           // right convexity arc
  'cx="66" cy="214"', 'cx="128" cy="214"', 'cx="190" cy="214"',  // three feet
  'cx="96" cy="76"', 'cx="160" cy="76"',             // eyes
];

/**
 * The window, not the master box. The figure occupies 162×219 of its 256 box at
 * master weight and sits high in it; drawn into a 1.6rem slot that renders the
 * art at ~21px, floating above the wordmark's optical centre. So the mark
 * declares the figure's own painted bounds at the weight it is drawn at — the
 * same string ACFDashboard's chrome mask and favicons declare. Nothing is
 * cropped, and there is no per-surface nudge to keep in sync across two repos.
 */
const VIEWBOX = 'viewBox="45.8 0 164.4 226.6"';

/** Theme-bound ink. A hardcoded fill is what made the pre-mascot mark #10b981
 *  on paper, against a token register that says that value is not ink here. */
const INK = 'stroke="currentColor"';

// cover-docs carries the mark twice: nav and footer.
const EXPECTED = Object.fromEntries(PAGES.map((p) => [p, p === 'cover-docs' ? 2 : 1]));
EXPECTED['part-1-pictures'] = 0; // no brand chrome on the pictures page

const problems = [];
let total = 0;

for (const page of PAGES) {
  const file = path.join(SITE, `${page}.html`);
  const html = fs.readFileSync(file, 'utf8');
  const marks = html.match(/<svg class="brand-mark"[\s\S]*?<\/svg>/g) || [];

  if (marks.length !== EXPECTED[page]) {
    problems.push(`${page}: ${marks.length} brand marks, expected ${EXPECTED[page]}`);
    continue;
  }
  total += marks.length;

  marks.forEach((mark, i) => {
    const where = marks.length > 1 ? `${page} (mark ${i + 1})` : page;
    if (!mark.includes(VIEWBOX)) problems.push(`${where}: viewBox is not ${VIEWBOX} — the figure would sit off the text's optical centre`);
    if (!mark.includes(INK)) problems.push(`${where}: mark is not ${INK} — it would not follow the theme`);
    for (const g of GEOMETRY) {
      if (!mark.includes(g)) problems.push(`${where}: missing \`${g}\` — this forks the mark from ACFDashboard's acf-mark.svg`);
    }
    if (/#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(mark)) problems.push(`${where}: hardcoded colour in the mark`);
  });
}

// The social-card builder draws the SAME figure from a re-typed literal — it
// renders into a PNG, so it cannot inline the page marks' markup. That copy was
// never scanned by this audit, which made it the one place the mark could fork
// silently: a link preview is the first thing a stranger sees of the product,
// and nothing would have said it had drifted. Its coordinates are pinned here,
// and only its coordinates — it renders at 86px and so carries the MASTER
// stroke weight while the pages carry x1.4, which is a weight difference, not
// a geometry one.
{
  const builder = fs.readFileSync(path.join(ROOT, 'scripts', 'build-social-cards.mjs'), 'utf8');
  const card = (builder.match(/const mark = \(ink\) => `([\s\S]*?)`;/) || [])[1];
  if (!card) {
    problems.push('build-social-cards.mjs: no `mark` template found — the social-card mark is unpinned');
  } else {
    for (const g of GEOMETRY) {
      if (!card.includes(g)) problems.push(`build-social-cards.mjs: missing \`${g}\` — this forks the social card from the page marks`);
    }
    if (!card.includes(VIEWBOX.replace('45.8 0 164.4 226.6', '47 4 162 219'))) {
      problems.push('build-social-cards.mjs: viewBox is not the master-weight window `viewBox="47 4 162 219"`');
    }
    total += 1;
  }
}

if (problems.length) {
  console.error(`Brand mark audit failed:\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}
console.log(`Brand mark audit passed: ${total} marks across ${PAGES.length} pages, all on the shared geometry, all theme-bound.`);
