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
 * The mark: antenna, head, two eyes, at 7/64. Shared verbatim with
 * ACFDashboard's public/assets/brand/acf-mark.svg and favicon.svg.
 */
const GEOMETRY = [
  'x1="32" y1="12" x2="32" y2="22"',
  'x="6" y="22" width="52" height="34" rx="15"',
  'cx="32" cy="7" r="5.5"',
  'cx="22" cy="39" r="4.5"',
  'cx="42" cy="39" r="4.5"',
  'stroke-width="7"',
];

/**
 * Taller than the art on purpose. `align-items: center` centres the BOX, but
 * the eye centres on the HEAD — the antenna reads as an ascender, not as mass.
 * Head centre is y=39; a square box put it ~13% low and no amount of gap
 * tuning fixed the lockup. Top stays at the antenna (1.5), height 75 puts the
 * centre on 39.
 */
const VIEWBOX = 'viewBox="0 1.5 64 75"';

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
