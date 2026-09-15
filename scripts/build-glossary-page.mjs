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
 * the reading surface. Only <main> is authored here.
 *
 * THE INDEX IS TERM-ONLY (owner directive, 2026-09-15). Each movement of the
 * book is one group; each term is one row showing the name alone; the row
 * expands on click/tap to the definition, the Part that develops it, the
 * exhibit that shows it, and its related concepts. The grouping is the term
 * file's explicit `category` (closed, from meta.categories) — never derived
 * from `appearsLater`, which is "where it becomes operational", not "what it
 * is about", and which misfiled a third of the file when it was the proxy.
 *
 * Behaviour lives in glossary-index.js (page-only, dependency-free); the
 * markup here is the whole contract that script and the CSS rely on:
 *   li.gl-item#g-<id>  >  button.gl-term[aria-expanded][aria-controls]
 *                       + div.gl-body#gd-<id>[hidden="until-found"]
 * JS-off readers see every definition (reading-system.css .no-js rules).
 *
 * Auto-tagging is deliberately inert inside the rows: reading.js only wraps
 * glossary terms found under .prose/.callout/... and the rows use neither, so
 * a definition never sprouts a tooltip for a term that is one tap away on the
 * same page. Cross-reference on this page is the related chips.
 *
 * Run:   npm run build:glossary          (write)
 *        npm run audit:glossary          (--check: fail if the page is stale)
 */
import fs from 'node:fs';
import path from 'node:path';
import { stripSeriesChain } from './site-b-shell.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const SITE = path.join(ROOT, 'public', 'site-b');
const DONOR = path.join(SITE, 'part-6-convexity-scoring.html');
const OUT = path.join(SITE, 'glossary.html');
const CHECK = process.argv.includes('--check');

const glossary = JSON.parse(fs.readFileSync(path.join(SITE, 'acf-glossary.json'), 'utf8'));
const terms = glossary.terms.slice();
const CATEGORIES = glossary.meta && Array.isArray(glossary.meta.categories) ? glossary.meta.categories : null;

const PART_ROUTES = {
  1: '/part-1-foundation',
  2: '/part-2-lineage-macro-thesis',
  3: '/part-3-bitcoin-convexity-backbone',
  4: '/part-4-tax-architecture-roc-strategy',
  5: '/part-5-portfolio-construction-position-management',
  6: '/part-6-convexity-framework-integrity-scoring',
};

// ---- validate the term file before rendering anything -------------------------
// Every failure here is a page that would have lied quietly: a term filed under
// no movement, a chip pointing at nothing, an alias two terms both claim (so the
// tooltip tagger's first match decides which meaning the reader gets), or a dash
// the calibration standard forbids in user-visible copy.
const problems = [];
if (!CATEGORIES || !CATEGORIES.length) problems.push('meta.categories is missing — the index has nothing to group by');
const catKeys = new Set((CATEGORIES || []).map((c) => c.key));
const ids = new Set();
const names = new Map();
for (const t of terms) {
  if (!t.id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(t.id)) problems.push(`invalid id ${JSON.stringify(t.id)}`);
  if (ids.has(t.id)) problems.push(`duplicate id ${t.id}`);
  ids.add(t.id);
  if (!catKeys.has(t.category)) problems.push(`${t.id}: category ${JSON.stringify(t.category)} is not in meta.categories`);
  if (!t.term || !t.definition) problems.push(`${t.id}: term and definition are required`);
  if (/[\u2014\u2013]/.test(`${t.term} ${t.definition}`)) problems.push(`${t.id}: em/en dash in user-visible copy`);
  for (const label of [t.term, ...(t.aliases || [])]) {
    const key = String(label).trim().toLowerCase();
    if (names.has(key) && names.get(key) !== t.id) problems.push(`"${label}" is claimed by both ${names.get(key)} and ${t.id}`);
    names.set(key, t.id);
  }
}
for (const t of terms) {
  for (const r of t.related || []) if (!ids.has(r)) problems.push(`${t.id}: related id ${r} does not exist`);
  const p = t.appearsLater && t.appearsLater.part;
  if (p != null && !PART_ROUTES[p]) problems.push(`${t.id}: appearsLater.part ${p} has no route`);
}
if (problems.length) {
  console.error(`Glossary term file rejected (${problems.length}):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// Reuse the book's typographic register: real dashes and curly quotes.
const typo = (s) => esc(s).replace(/ - /g, ' &mdash; ').replace(/'/g, '&rsquo;');

const registryPath = path.join(SITE, 'navigation-registry.json');
const registry = fs.existsSync(registryPath) ? JSON.parse(fs.readFileSync(registryPath, 'utf8')) : null;
const chartHref = (chartId) => {
  const entry = registry && registry.charts && registry.charts[chartId];
  return entry ? { href: entry.href, label: `${entry.idx} &middot; ${esc(entry.title)}` } : null;
};

const byId = new Map(terms.map((t) => [t.id, t]));
const sortByName = (a, b) => a.term.localeCompare(b.term, 'en', { sensitivity: 'base', numeric: true });

const CHEVRON = '<svg class="gl-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6 9l6 6 6-6"></path></svg>';

function row(term) {
  const links = [];
  const later = term.appearsLater;
  if (later && PART_ROUTES[later.part]) {
    links.push(`<a class="part-ref" href="${PART_ROUTES[later.part]}">Part ${later.part} &middot; ${typo(later.topic)}</a>`);
  }
  const chart = term.chart ? chartHref(term.chart) : null;
  if (chart) links.push(`<a class="part-ref" href="${chart.href}">Exhibit ${chart.label}</a>`);

  const related = (term.related || []).filter((id) => byId.has(id))
    .map((id) => `<a class="gl-chip" href="#g-${esc(id)}">${typo(byId.get(id).term)}</a>`);

  // Aliases are for finding, not for reading: they feed the filter box (so
  // "ROC" finds Return of capital) and never render as prose.
  const aliases = (term.aliases || []).map((a) => String(a).toLowerCase()).join('|');

  return [
    `          <li class="gl-item" id="g-${esc(term.id)}" data-gl-item${aliases ? ` data-gl-aliases="${esc(aliases)}"` : ''}>`,
    `            <button type="button" class="gl-term" aria-expanded="false" aria-controls="gd-${esc(term.id)}">`,
    `              <span class="gl-term-name">${typo(term.term)}</span>`,
    `              ${CHEVRON}`,
    '            </button>',
    `            <div class="gl-body" id="gd-${esc(term.id)}" role="region" aria-label="${esc(term.term)}" hidden="until-found">`,
    '              <div class="gl-body-inner">',
    `                <p class="gl-def">${typo(term.definition)}</p>`,
    links.length ? `                <p class="gl-links">${links.join(' ')}</p>` : null,
    related.length ? `                <p class="gl-related"><span class="gl-related-label">Related</span> ${related.join(' ')}</p>` : null,
    '              </div>',
    '            </div>',
    '          </li>',
  ].filter(Boolean).join('\n');
}

const membersOf = (cat) => terms.filter((t) => t.category === cat.key).sort(sortByName);

function group(cat) {
  const members = membersOf(cat);
  if (!members.length) return '';
  const partLabel = cat.part && PART_ROUTES[cat.part]
    ? `<a class="part-ref" href="${PART_ROUTES[cat.part]}">Part ${cat.part}</a> &middot; `
    : '';
  return `
    <section class="section gl-group" id="${esc(cat.key)}" aria-labelledby="${esc(cat.key)}-title" data-gl-group>
      <div class="measure">
        <p class="section-eyebrow section-signal" data-glyph-text>${esc(cat.label)}</p>
        <h2 class="section-title" id="${esc(cat.key)}-title">${typo(cat.title)}</h2>
        <p class="gl-group-meta">${partLabel}<span data-gl-group-count>${members.length}</span> terms</p>
      </div>
      <div class="measure">
        <ol class="gl-list">
${members.map(row).join('\n')}
        </ol>
      </div>
    </section>
`;
}

const total = terms.length;
const liveGroups = CATEGORIES.filter((c) => membersOf(c).length);
const jump = liveGroups
  .map((c) => `<a class="part-ref" href="#${esc(c.key)}">${esc(c.label)}</a>`)
  .join(' ');

const main = `<main class="shell-main">

    <header class="doc-header">
      <div class="measure">
        <p class="doc-eyebrow" data-glyph-text>Framework Reference</p>
        <p class="doc-kicker">${total} terms &middot; ${liveGroups.length} movements &middot; defined where they are taught</p>
        <h1 class="doc-title">Glossary</h1>
      </div>
      <div class="measure prose">
        <p class="prose-lead">Every term the framework defines for itself, grouped by the movement of the book that teaches it. Open a term for its definition, the Part that develops it, the exhibit that shows it, and the concepts it touches.</p>
      </div>
      <div class="measure gl-toolbar" data-gl-toolbar>
        <label class="visually-hidden" for="gl-search">Filter terms</label>
        <input class="gl-search" id="gl-search" type="search" placeholder="Filter terms" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-describedby="gl-count">
        <p class="gl-count" id="gl-count" aria-live="polite" data-gl-count data-gl-total="${total}">${total} terms</p>
        <p class="gl-actions">
          <button type="button" class="gl-action" data-gl-expand>Expand all</button>
          <button type="button" class="gl-action" data-gl-collapse>Collapse all</button>
        </p>
      </div>
      <p class="measure gl-jump">${jump}</p>
      <p class="measure gl-empty" data-gl-empty hidden>No term matches. Try a shorter word, or clear the filter.</p>
    </header>
${liveGroups.map(group).join('')}
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
  `<meta name="description" content="The Adaptive Convexity Framework glossary: ${total} terms in ${liveGroups.length} movements, each defined where it is taught and linked to the Part that develops it and the exhibit that shows it.">`
);
html = html.replace(/<a class="skip-link" href="#[^"]*">/, `<a class="skip-link" href="#${esc(liveGroups[0].key)}">`);

// Sidebar: clear the donor's active state and its on-this-page list, then add
// the Glossary as its own movement, marked current, carrying its own
// on-this-page list (the six groups) so the reading shell's scroll-spy works
// here exactly as it does on a part page. The donor carries a plain Glossary
// link like every part page; strip it first so re-running this script is
// idempotent rather than additive.
html = html.replace(/\s*<ol class="on-this-page"[\s\S]*?<\/ol>/g, '');
html = html.replace(
  /\s*<p class="side-movement">Reference<\/p>\s*<ul class="side-parts">[\s\S]*?<\/ul>/,
  ''
);
html = html.replace(/ class="side-part current"/g, ' class="side-part"');
html = html.replace(/\s*aria-current="page"/g, '');

const onThisPage = liveGroups
  .map((c) => `              <li><a href="#${esc(c.key)}">${esc(c.label)}</a></li>`)
  .join('\n');
const sidebarInsert = `
        <p class="side-movement">Reference</p>
        <ul class="side-parts">
          <li><a class="side-part" href="/framework-in-pictures"><span class="spnum">&mdash;</span><span>In Pictures</span></a></li>
          <li><a class="side-part" href="/framework-in-math"><span class="spnum">&mdash;</span><span>In Math</span></a></li>
          <li>
            <a class="side-part current" href="/glossary" aria-current="page">
              <span class="spnum">&mdash;</span><span>Glossary</span>
            </a>
            <ol class="on-this-page" data-spy aria-label="On this page">
${onThisPage}
            </ol>
          </li>
        </ul>
      </div>`;
// Close out the sidebar's last movement block by appending ours before its end.
const sidebarTailIdx = html.indexOf('</nav>', html.indexOf('<nav class="sidebar"'));
const blockEnd = html.lastIndexOf('      </div>', sidebarTailIdx);
html = html.slice(0, blockEnd) + sidebarInsert + html.slice(blockEnd + '      </div>'.length);

// Swap the body content.
html = html.replace(/<main class="shell-main">[\s\S]*<\/main>/, main);

// A reference page is not in the six-part series: drop the donor's next-up band
// and the dock's "← Part 5 · Series complete" chain. Shared, and fails closed.
html = stripSeriesChain(html, 'Glossary build');

// The index's behaviour is page-only: load it after the shared reading runtime.
if (!/glossary-index\.js/.test(html)) {
  html = html.replace(
    /(<script src="\/site-b\/glyph-text\.js" defer><\/script>)/,
    '$1\n  <script src="/site-b/glossary-index.js" defer></script>'
  );
}
if (!/glossary-index\.js/.test(html)) {
  console.error('Glossary build failed: could not place glossary-index.js after glyph-text.js in the donor shell.');
  process.exit(1);
}

// ---- write, or verify -----------------------------------------------------------
// build:social-meta rewrites the og/twitter block AFTER this script runs, so in
// check mode that block is nobody's drift; compare everything else.
const withoutSocial = (s) => s.replace(/<!-- BEGIN generated social meta[\s\S]*?<!-- END generated social meta -->/, '');
const summary = `${total} terms across ${liveGroups.length} groups`;
if (CHECK) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (withoutSocial(current) !== withoutSocial(html)) {
    console.error(`Glossary audit FAILED: public/site-b/glossary.html is stale against acf-glossary.json / the donor shell (${summary}). Run: npm run build:glossary`);
    process.exit(1);
  }
  console.log(`Glossary audit passed: page is fresh (${summary}).`);
} else {
  fs.writeFileSync(OUT, html);
  console.log(`Glossary page built: ${summary} -> public/site-b/glossary.html`);
}
