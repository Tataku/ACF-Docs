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
 * The mark: antenna with a tip, head, two eyes, and the THREE-LINE NECK that
 * is the figure's signature. Shared verbatim with ACFDashboard's
 * public/assets/brand/acf-mark.svg and favicon.svg, both of which are now
 * generated from one geometry module rather than hand-drawn
 * (ACFDashboard scripts/generate-brand-assets.mjs).
 *
 * The neck used to be absent here. It was dropped from the reduction as
 * unrenderable below ~24px, which was true of the master's proportions and
 * false of a drawing laid out on the device-pixel grid: at 16px one pixel is
 * exactly 4 units of this box, so line/gap/line/gap/line at 4 units each
 * resolves as three lines rather than one grey band. Every number below is a
 * multiple of 4 for that reason and must not be "tidied".
 */
const GEOMETRY = [
  'x="6" y="19" width="52" height="18" rx="8"',
  'x1="32" y1="8" x2="32" y2="16"',
  'x1="22" y1="46" x2="42" y2="46"',
  'x1="22" y1="54" x2="42" y2="54"',
  'x1="22" y1="62" x2="42" y2="62"',
  'cx="32" cy="4" r="4"',
  'cx="20" cy="28" r="4"',
  'cx="44" cy="28" r="4"',
  'stroke-width="6"',
  'stroke-width="4"',
];

/**
 * Square again. The box used to be taller than the art (0 1.5 64 75) to drag
 * the HEAD onto the text's optical centre, because a mark that was head plus
 * antenna carried all its mass at the top and `align-items: center` centres
 * the BOX. The three-line neck put mass back underneath, so the art now
 * balances on its own and the compensation over-corrects — measured in a
 * lockup, the tall box sits the mark visibly high. One square box, no
 * per-surface nudge, nothing to keep in sync across two repositories.
 */
const VIEWBOX = 'viewBox="0 0 64 64"';

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
    if (!mark.includes(VIEWBOX)) problems.push(`${where}: viewBox is not ${VIEWBOX} — the head would sit off the text's optical centre`);
    if (!mark.includes(INK)) problems.push(`${where}: mark is not ${INK} — it would not follow the theme`);
    for (const g of GEOMETRY) {
      if (!mark.includes(g)) problems.push(`${where}: missing \`${g}\` — this forks the mark from ACFDashboard's acf-mark.svg`);
    }
    if (/#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(mark)) problems.push(`${where}: hardcoded colour in the mark`);
  });
}

if (problems.length) {
  console.error(`Brand mark audit failed:\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}
console.log(`Brand mark audit passed: ${total} marks across ${PAGES.length} pages, all on the shared geometry, all theme-bound.`);
