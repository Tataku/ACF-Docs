#!/usr/bin/env node
/**
 * Build public/site-b/framework-in-pictures.html: every implemented exhibit in
 * the framework, grouped by the page that teaches it (the home page, then the
 * six Parts) and shown in the order that page mounts it.
 *
 * Generated, not hand-authored, for the same reason as the glossary page: an
 * exhibit count in markup is a second source of truth. The chart set and each
 * chart's home come from navigation-registry.json; each chart's idx, title and
 * data mode come from chart-specs.mjs, which the registry is itself built from.
 * This page cannot list a chart that does not exist or miss one that does, and
 * a mismatch between the two sources stops the build.
 *
 * Group labels and titles are shared with the glossary: both pages read
 * acf-glossary.json meta.categories (one entry per Part). The home page group
 * ("Opening", part 0) is read from there too if it is ever added; until then
 * the local OPENING entry below stands in. Section ids stay the gallery's own
 * (foundation, lineage, ...), because the Part pages link to them.
 *
 * Order: within a group, exhibits follow the position of their mount
 * (`data-fc-chart`) in the home page's HTML, so "in the order the book presents
 * them" is checked against the book, not against idx strings.
 *
 * Markup: exhibits use the same `fc-mount` island pattern as the Part pages.
 * Their no-JS text is written later by sync-chart-fallbacks.mjs, from the spec.
 *
 * Run: npm run build:pictures
 */
import fs from 'node:fs';
import path from 'node:path';
import { stripSeriesChain } from './site-b-shell.mjs';
import { stampSocialMeta } from './social-meta.mjs';
import { FRAMEWORK_CHART_SPECS } from '../components/framework-charts/chart-specs.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const SITE = path.join(ROOT, 'public', 'site-b');
const DONOR = path.join(SITE, 'part-6-convexity-scoring.html');
const OUT = path.join(SITE, 'framework-in-pictures.html');

const fail = (msg) => {
  console.error(`Pictures build stopped: ${msg}`);
  process.exit(1);
};

const reg = JSON.parse(fs.readFileSync(path.join(SITE, 'navigation-registry.json'), 'utf8'));
const glossary = JSON.parse(fs.readFileSync(path.join(SITE, 'acf-glossary.json'), 'utf8'));

// ---- the chart set: registry for the home, spec for idx / title / data mode ----
const specs = new Map(FRAMEWORK_CHART_SPECS.map((s) => [s.chartId, s]));

// The registry is keyed several ways (chartId, idx, data-chart); collapse to one entry per chart.
const homes = new Map();
for (const c of Object.values(reg.charts)) homes.set(c.chartId, c);

for (const id of specs.keys()) if (!homes.has(id)) fail(`${id} has a spec but no registry entry; run build:navigation first.`);
for (const id of homes.keys()) if (!specs.has(id)) fail(`${id} is in the registry but has no spec.`);

const KNOWN_MODES = ['historical', 'representative', 'simulation', 'conceptual'];
for (const s of specs.values()) {
  if (!KNOWN_MODES.includes(s.visualDataMode)) {
    fail(`${s.chartId} has data mode ${JSON.stringify(s.visualDataMode)}, which the page's marker key does not explain.`);
  }
}

// Position of each mount in its home page's HTML.
const pageFile = new Map(reg.pages.map((p) => [p.route, p.file]));
const pageHtml = new Map();
const mountOffset = (c) => {
  const file = pageFile.get(c.route);
  if (!file) fail(`${c.chartId}: no page file for route ${c.route}.`);
  if (!pageHtml.has(file)) pageHtml.set(file, fs.readFileSync(path.join(SITE, file), 'utf8'));
  const m = new RegExp(`<figure\\b[^>]*\\bdata-fc-chart="${c.chartId}"`).exec(pageHtml.get(file));
  if (!m) fail(`${c.chartId}: no <figure data-fc-chart> mount in ${file}.`);
  return m.index;
};

const charts = [...homes.values()].map((c) => {
  const s = specs.get(c.chartId);
  return { ...c, idx: s.idx, title: s.title, mode: s.visualDataMode, offset: mountOffset(c) };
});

// ---- groups: shared labels and titles, the gallery's own anchors ---------------
const OPENING = { key: 'opening', label: 'Opening', title: 'The shape of the whole system.', part: 0 };
const ANCHORS = { 0: 'opening', 1: 'foundation', 2: 'lineage', 3: 'backbone', 4: 'tax', 5: 'construction', 6: 'scoring' };

const categories = Array.isArray(glossary.meta && glossary.meta.categories) ? glossary.meta.categories : [];
if (!categories.length) fail('acf-glossary.json meta.categories is missing; the page has nothing to group by.');
const groupDefs = [
  categories.find((c) => c.part === 0) || OPENING,
  ...categories.filter((c) => c.part !== 0),
].sort((a, b) => a.part - b.part);

const GROUPS = groupDefs.map((cat) => {
  if (!ANCHORS[cat.part]) fail(`category ${cat.key} has part ${cat.part}, which has no section anchor.`);
  const members = charts.filter((c) => c.part === cat.part).sort((a, b) => a.offset - b.offset);
  const routes = new Set(members.map((c) => c.route));
  if (routes.size > 1) fail(`Part ${cat.part} exhibits have more than one home page: ${[...routes].join(', ')}.`);
  return { ...cat, anchor: ANCHORS[cat.part], route: members.length ? members[0].route : null, members };
});

for (const c of charts) {
  if (!GROUPS.some((g) => g.part === c.part)) fail(`${c.chartId} belongs to part ${c.part}, which has no group.`);
}

// ---- copy helpers --------------------------------------------------------------
const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const typo = (s) => esc(s).replace(/'/g, '&rsquo;');

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const word = (n) => (n < WORDS.length ? WORDS[n] : String(n));
const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const listOf = (items) => (items.length < 2 ? items.join('')
  : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`);

const where = (part) => (part === 0 ? 'on the home page' : `in Part ${part}`);

function exhibit(c) {
  return `        <figure class="fc-mount" id="pic-${esc(c.chartId)}" data-fc-chart="${esc(c.chartId)}"></figure>
        <p class="compare-key"><a class="part-ref" href="${esc(c.href)}">Read ${esc(c.idx)} ${where(c.part)}</a></p>`;
}

// Part 1 also runs as its own single page of exhibits, /part-1-pictures. The
// count is read from that page so the sentence cannot go stale.
const P1_PICTURES = path.join(SITE, 'part-1-pictures.html');
const essayCount = (fs.readFileSync(P1_PICTURES, 'utf8').match(/<figure\b[^>]*\bdata-fc-chart="/g) || []).length;
if (!essayCount) fail('part-1-pictures.html mounts no exhibits.');
const ESSAY_NOTE = {
  1: `Part 1 also runs as a single page of its ${word(essayCount)} exhibits, in reading order: <a class="part-ref" href="/part-1-pictures">Part 1 in Pictures</a>.`,
};

function section(g) {
  if (!g.members.length) return '';
  const count = g.members.length;
  const home = g.part === 0
    ? `<a class="part-ref" href="/">Home page</a>`
    : `<a class="part-ref" href="${esc(g.route)}">Part ${g.part}</a>`;
  const note = ESSAY_NOTE[g.part]
    ? `\n      <div class="measure prose">\n        <p>${ESSAY_NOTE[g.part]}</p>\n      </div>`
    : '';
  return `
    <section class="section" id="${g.anchor}" aria-labelledby="${g.anchor}-title">
      <div class="measure">
        <p class="section-eyebrow section-signal" data-glyph-text>${esc(g.label)}</p>
        <h2 class="section-title" id="${g.anchor}-title">${typo(g.title)}</h2>
        <p class="gl-group-meta">${home} &middot; ${count} exhibit${count === 1 ? '' : 's'}</p>
      </div>${note}

${g.members.map(exhibit).join('\n\n')}
    </section>
`;
}

// ---- header ----------------------------------------------------------------------
const total = charts.length;
const liveGroups = GROUPS.filter((g) => g.members.length);
const jump = liveGroups
  .map((g) => `<a class="part-ref" href="#${g.anchor}">${esc(g.label)}</a>`)
  .join(' ');

const plotted = charts.filter((c) => c.mode === 'historical')
  .sort((a, b) => GROUPS.findIndex((g) => g.part === a.part) - GROUPS.findIndex((g) => g.part === b.part) || a.offset - b.offset);
const plottedLinks = plotted.map((c) => `<a class="part-ref" href="#pic-${esc(c.chartId)}">${esc(c.idx)} &middot; ${typo(c.title)}</a>`);
const plottedSentence = plotted.length
  ? `${capital(word(plotted.length))} of the ${total} ${plotted.length === 1 ? 'is' : 'are'} plotted from public data: ${listOf(plottedLinks)}.`
  : `None of the ${total} is plotted from public data.`;

const main = `<main class="shell-main">

    <header class="doc-header">
      <div class="measure">
        <p class="doc-eyebrow" data-glyph-text>Framework Reference</p>
        <p class="doc-kicker">${total} exhibits &middot; every chart in the framework</p>
        <h1 class="doc-title">The Framework in Pictures</h1>
      </div>
      <div class="measure prose">
        <p class="prose-lead">All of the framework&rsquo;s exhibits, grouped by the page that teaches them and shown in the order the book presents them. Each chart makes one claim and shows the mechanism behind it. Hover over or tap any part of a chart for its explanation (on a desktop, a click pins it in place), and open Details at the foot of the chart for its sources and methodology.</p>
        <p>The marker beside each title tells you what you are looking at: a square is plotted from a public data series, a diamond is a representative exhibit (an illustrative shape) or a simulation (computed from stated inputs), and a circle is a conceptual diagram of framework logic. ${plottedSentence}</p>
        <p>L marks the framework&rsquo;s three lenses and S its two signature shapes; they appear on the home page and in Part 1. Numbered exhibits belong to their Part.</p>
      </div>
      <p class="measure gl-jump">${jump}</p>
    </header>
${GROUPS.map(section).join('')}
    <footer class="site-footer">
      <div class="measure">
        <p>&copy; 2026 Adaptive Convexity Framework</p>
        <p>Reference &middot; The Framework in Pictures</p>
      </div>
    </footer>
  </main>`;

// Everything this generator writes for the reader stays free of em dashes.
if (/\u2014|&mdash;|&#8212;|&#x2014;/i.test(main)) fail('an em dash reached the reader-facing copy in <main>.');

// ---- shell: clone the donor, then swap its contents --------------------------------
let html = fs.readFileSync(DONOR, 'utf8');
html = html.replace(/<link rel="canonical" href="[^"]*">/, '<link rel="canonical" href="https://docs.acfdashboard.com/framework-in-pictures">');
html = html.replace(/<title>[\s\S]*?<\/title>/, '<title>The Framework in Pictures &middot; The Adaptive Convexity Framework</title>');
html = html.replace(
  /<meta name="description" content="[^"]*">/,
  `<meta name="description" content="All ${total} charts in book order, grouped by Part, each marked as public data, representative, simulated or a diagram.">`
);
html = html.replace(/<a class="skip-link" href="#[^"]*">/, `<a class="skip-link" href="#${liveGroups[0].anchor}">`);

// Sidebar: drop the donor's active state and per-page contents, mark Pictures current.
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
            <a class="side-part current" href="/framework-in-pictures" aria-current="page">
              <span class="spnum">&middot;</span><span>In Pictures</span>
            </a>
          </li>
          <li><a class="side-part" href="/framework-in-math"><span class="spnum">&middot;</span><span>In Math</span></a></li>
          <li><a class="side-part" href="/glossary"><span class="spnum">&middot;</span><span>Glossary</span></a></li>
        </ul>
      </div>`;
const navEnd = html.indexOf('</nav>', html.indexOf('<nav class="sidebar"'));
const blockEnd = html.lastIndexOf('      </div>', navEnd);
html = html.slice(0, blockEnd) + sidebarInsert + html.slice(blockEnd + '      </div>'.length);

html = html.replace(/<main class="shell-main">[\s\S]*<\/main>/, () => main);
// A reference page is not in the six-part series: drop the donor's next-up band
// and the dock's "← Part 5 · Series complete" chain. Shared, and fails closed.
html = stripSeriesChain(html, 'Pictures build');
// The donor's og/twitter block and share links say Part 6; stamp this page's own.
html = stampSocialMeta(html, 'framework-in-pictures');

fs.writeFileSync(OUT, html);
console.log(`Pictures page built: ${total} exhibits across ${liveGroups.length} groups (${plotted.length} plotted from public data) -> public/site-b/framework-in-pictures.html`);
