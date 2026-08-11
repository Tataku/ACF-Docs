#!/usr/bin/env node
/**
 * Build public/site-b/glossary.html from acf-glossary.json.
 *
 * The page is GENERATED, never hand-authored, for one reason: a term count that
 * lives in markup is a second source of truth, and it drifts. (The cover tile
 * said "20 terms" against a 28-term file before this script existed.)
 *
 * The shell — head, theme bootstrap, fonts, sidebar, floatnav, scripts — is
 * cloned from a live part page so the reference surface can never diverge from
 * the reading surface. Only <main> is authored here, and it reuses existing
 * design-system classes (.section / .failure-modes / .part-ref); no new CSS.
 *
 * Run: npm run build:glossary
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SITE = path.join(ROOT, 'public', 'site-b');
const DONOR = path.join(SITE, 'part-6-convexity-scoring.html');
const OUT = path.join(SITE, 'glossary.html');

const glossary = JSON.parse(fs.readFileSync(path.join(SITE, 'acf-glossary.json'), 'utf8'));
const terms = glossary.terms.slice();

const PART_ROUTES = {
  1: '/part-1-foundation',
  2: '/part-2-lineage-macro-thesis',
  3: '/part-3-bitcoin-convexity-backbone',
  4: '/part-4-tax-architecture-roc-strategy',
  5: '/part-5-portfolio-construction-position-management',
  6: '/part-6-convexity-framework-integrity-scoring',
};

// Groups mirror the book's own movements, so the reference reads in the same
// order the reader met the vocabulary.
const GROUPS = [
  { key: 'foundations', eyebrow: 'Foundations', title: 'The vocabulary of the thesis.', parts: [1] },
  { key: 'macro', eyebrow: 'Lineage & Macro', title: 'Method, regime, and the macro thesis.', parts: [2] },
  { key: 'bitcoin', eyebrow: 'The Backbone', title: 'Bitcoin, valuation, and accumulation.', parts: [3] },
  { key: 'tax', eyebrow: 'Tax Architecture', title: 'Wrappers, basis, and what you keep.', parts: [4] },
  { key: 'construction', eyebrow: 'Construction', title: 'Postures, sizing, and governance.', parts: [5] },
  { key: 'scoring', eyebrow: 'Scoring', title: 'The two-score execution kernel.', parts: [6] },
];

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// Reuse the book's typographic register: real dashes and curly quotes.
const typo = (s) => esc(s).replace(/ - /g, ' &mdash; ').replace(/'/g, '&rsquo;');

const chartHref = (chartId) => {
  const registryPath = path.join(SITE, 'navigation-registry.json');
  if (!fs.existsSync(registryPath)) return null;
  const reg = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  const entry = reg.charts && reg.charts[chartId];
  return entry ? { href: entry.href, label: `${entry.idx} &middot; ${esc(entry.title)}` } : null;
};

function groupFor(term) {
  const part = term.appearsLater && term.appearsLater.part;
  const found = GROUPS.find((g) => g.parts.includes(part));
  return found ? found.key : 'foundations';
}

function card(term) {
  const bits = [];
  bits.push(`            <div id="g-${esc(term.id)}">`);
  bits.push(`              <span class="name">${typo(term.term)}</span>`);
  bits.push(`              <p>${typo(term.definition)}</p>`);

  const links = [];
  const later = term.appearsLater;
  if (later && PART_ROUTES[later.part]) {
    links.push(`<a class="part-ref" href="${PART_ROUTES[later.part]}">Part ${later.part} &middot; ${typo(later.topic)}</a>`);
  }
  const chart = term.chart ? chartHref(term.chart) : null;
  if (chart) links.push(`<a class="part-ref" href="${chart.href}">Exhibit ${chart.label}</a>`);
  if (links.length) bits.push(`              <p class="gloss-page-links">${links.join(' ')}</p>`);

  bits.push('            </div>');
  return bits.join('\n');
}

function section(group) {
  const members = terms.filter((t) => groupFor(t) === group.key)
    .sort((a, b) => a.term.localeCompare(b.term, 'en'));
  if (!members.length) return '';
  return `
    <section class="section" id="${group.key}" aria-labelledby="${group.key}-title">
      <div class="measure">
        <p class="section-eyebrow section-signal" data-glyph-text>${esc(group.eyebrow)}</p>
        <h2 class="section-title" id="${group.key}-title">${typo(group.title)}</h2>
      </div>

      <div class="measure-feature">
        <div class="failure-modes">
${members.map(card).join('\n')}
        </div>
      </div>
    </section>
`;
}

const total = terms.length;
const jump = GROUPS
  .filter((g) => terms.some((t) => groupFor(t) === g.key))
  .map((g) => `<a class="part-ref" href="#${g.key}">${esc(g.eyebrow)}</a>`)
  .join(' ');

const main = `<main class="shell-main">

    <header class="doc-header">
      <div class="measure">
        <p class="doc-eyebrow" data-glyph-text>Framework Reference</p>
        <p class="doc-kicker">${total} terms &middot; defined where they are taught</p>
        <h1 class="doc-title">Glossary</h1>
      </div>
      <div class="measure prose">
        <p class="prose-lead">Every term the framework defines for itself, in the order the book teaches them. Each entry links back to the Part where the idea is developed and, where one exists, to the exhibit that shows it.</p>
        <p>${jump}</p>
      </div>
    </header>
${GROUPS.map(section).join('')}
    <footer class="site-footer">
      <div class="measure">
        <p>&copy; 2026 Adaptive Convexity Framework</p>
        <p>Reference &middot; Glossary</p>
      </div>
    </footer>
  </main>`;

// ---- clone the shell from the donor page -------------------------------------
let html = fs.readFileSync(DONOR, 'utf8');

html = html.replace(
  /<link rel="canonical" href="[^"]*">/,
  '<link rel="canonical" href="https://docs.acfdashboard.com/glossary">'
);
html = html.replace(
  /<title>[\s\S]*?<\/title>/,
  '<title>Glossary &middot; The Adaptive Convexity Framework</title>'
);
html = html.replace(
  /<meta name="description" content="[^"]*">/,
  `<meta name="description" content="The Adaptive Convexity Framework glossary: ${total} terms defined where they are taught, each linked to the Part that develops it and the exhibit that shows it.">`
);
html = html.replace(/<a class="skip-link" href="#[^"]*">/, '<a class="skip-link" href="#foundations">');

// Sidebar: clear the donor's active state and its on-this-page list, then add
// the Glossary as its own movement, marked current. The donor carries a plain
// Glossary link like every part page; strip it first so re-running this script
// is idempotent rather than additive.
html = html.replace(/\s*<ol class="on-this-page"[\s\S]*?<\/ol>/g, '');
html = html.replace(
  /\s*<p class="side-movement">Reference<\/p>\s*<ul class="side-parts">[\s\S]*?<\/ul>/,
  ''
);
html = html.replace(/ class="side-part current"/g, ' class="side-part"');
html = html.replace(/\s*aria-current="page"/g, '');

const sidebarInsert = `
        <p class="side-movement">Reference</p>
        <ul class="side-parts">
          <li>
            <a class="side-part current" href="/glossary" aria-current="page">
              <span class="spnum">&mdash;</span><span>Glossary</span>
            </a>
          </li>
        </ul>
      </div>`;
// Close out the sidebar's last movement block by appending ours before its end.
const sidebarTailIdx = html.indexOf('</nav>', html.indexOf('<nav class="sidebar"'));
const blockEnd = html.lastIndexOf('      </div>', sidebarTailIdx);
html = html.slice(0, blockEnd) + sidebarInsert + html.slice(blockEnd + '      </div>'.length);

// Swap the body content.
html = html.replace(/<main class="shell-main">[\s\S]*<\/main>/, main);

// The reference page has no previous/next part chain.
html = html.replace(/\s*<nav class="next-up"[\s\S]*?<\/nav>/g, '');

fs.writeFileSync(OUT, html);
console.log(`Glossary page built: ${total} terms across ${GROUPS.filter((g) => terms.some((t) => groupFor(t) === g.key)).length} groups -> public/site-b/glossary.html`);
