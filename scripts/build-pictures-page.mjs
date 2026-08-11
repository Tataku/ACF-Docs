#!/usr/bin/env node
/**
 * Build public/site-b/framework-in-pictures.html — every implemented exhibit in
 * the framework, grouped by the movement of the book it belongs to.
 *
 * Generated, not hand-authored, for the same reason as the glossary page: an
 * exhibit count in markup is a second source of truth. The chart set is read
 * from navigation-registry.json, which is itself derived from chart-specs.mjs,
 * so this page cannot list a chart that does not exist or miss one that does.
 *
 * Note on markup: exhibits here use the `fc-mount` island pattern that the Part
 * pages use, NOT the richer hand-drawn `exhibit` blocks on /part-1-pictures.
 * Those carry bespoke inline-SVG fallbacks that exist only for the seven Part 1
 * charts and cannot be synthesised for the rest; that curated essay stays as it
 * is. This page is the complete gallery.
 *
 * Run: npm run build:pictures
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SITE = path.join(ROOT, 'public', 'site-b');
const DONOR = path.join(SITE, 'part-6-convexity-scoring.html');
const OUT = path.join(SITE, 'framework-in-pictures.html');

const reg = JSON.parse(fs.readFileSync(path.join(SITE, 'navigation-registry.json'), 'utf8'));

// The registry is dual-keyed (idx + chartId); collapse to one entry per chart.
const charts = new Map();
for (const c of Object.values(reg.charts)) charts.set(c.chartId, c);

const MOVEMENTS = [
  { key: 'opening', eyebrow: 'Opening', title: 'The shape of the whole system.', parts: [0] },
  { key: 'foundation', eyebrow: 'Part 1 · Foundation', title: 'Why the traditional playbook fails.', parts: [1] },
  { key: 'lineage', eyebrow: 'Part 2 · Lineage & Macro', title: 'Method before macro.', parts: [2] },
  { key: 'backbone', eyebrow: 'Part 3 · The Backbone', title: 'Bitcoin as the convexity reserve.', parts: [3] },
  { key: 'tax', eyebrow: 'Part 4 · Tax Architecture', title: 'What the wrapper decides.', parts: [4] },
  { key: 'construction', eyebrow: 'Part 5 · Construction', title: 'Postures, sizing, and governance.', parts: [5] },
  { key: 'scoring', eyebrow: 'Part 6 · Scoring', title: 'The two-score execution kernel.', parts: [6] },
];

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const typo = (s) => esc(s).replace(/'/g, '&rsquo;');

// Sort by idx so exhibits appear in their authored order (01, 02 … P5-10).
const byIdx = (a, b) => String(a.idx).localeCompare(String(b.idx), 'en', { numeric: true });

function exhibit(c) {
  return `        <figure class="fc-mount" id="pic-${esc(c.chartId)}" data-fc-chart="${esc(c.chartId)}"></figure>
        <p class="compare-key"><a class="part-ref" href="${esc(c.href)}">${esc(c.idx)} &middot; ${typo(c.title)} &mdash; read it in context</a></p>`;
}

function section(m) {
  const members = [...charts.values()].filter((c) => m.parts.includes(c.part)).sort(byIdx);
  if (!members.length) return '';
  const count = members.length;
  return `
    <section class="section" id="${m.key}" aria-labelledby="${m.key}-title">
      <div class="measure">
        <p class="section-eyebrow section-signal" data-glyph-text>${esc(m.eyebrow)}</p>
        <h2 class="section-title" id="${m.key}-title">${typo(m.title)}</h2>
        <p class="compare-key">${count} exhibit${count === 1 ? '' : 's'}</p>
      </div>

${members.map(exhibit).join('\n\n')}
    </section>
`;
}

const total = charts.size;
const jump = MOVEMENTS
  .filter((m) => [...charts.values()].some((c) => m.parts.includes(c.part)))
  .map((m) => `<a class="part-ref" href="#${m.key}">${esc(m.eyebrow)}</a>`)
  .join(' ');

const main = `<main class="shell-main">

    <header class="doc-header">
      <div class="measure">
        <p class="doc-eyebrow" data-glyph-text>Framework Documentation</p>
        <p class="doc-kicker">${total} exhibits &middot; every chart in the framework</p>
        <h1 class="doc-title">The Framework in Pictures</h1>
      </div>
      <div class="measure prose">
        <p class="prose-lead">Every exhibit the framework uses, in the order the book presents them. Each chart makes one claim and shows the mechanism behind it. Hover, tap, or pin any exhibit for the deeper explanation; sources and methodology sit behind its Details toggle.</p>
        <p>${jump}</p>
      </div>
    </header>
${MOVEMENTS.map(section).join('')}
    <footer class="site-footer">
      <div class="measure">
        <p>&copy; 2026 Adaptive Convexity Framework</p>
        <p>Reference &middot; The Framework in Pictures</p>
      </div>
    </footer>
  </main>`;

let html = fs.readFileSync(DONOR, 'utf8');
html = html.replace(/<link rel="canonical" href="[^"]*">/, '<link rel="canonical" href="https://docs.acfdashboard.com/framework-in-pictures">');
html = html.replace(/<title>[\s\S]*?<\/title>/, '<title>The Framework in Pictures &middot; The Adaptive Convexity Framework</title>');
html = html.replace(
  /<meta name="description" content="[^"]*">/,
  `<meta name="description" content="All ${total} exhibits of the Adaptive Convexity Framework in one gallery, grouped by the part of the book each belongs to. Every chart makes one claim and shows its mechanism.">`
);
html = html.replace(/<a class="skip-link" href="#[^"]*">/, '<a class="skip-link" href="#opening">');

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
              <span class="spnum">&mdash;</span><span>In Pictures</span>
            </a>
          </li>
          <li><a class="side-part" href="/glossary"><span class="spnum">&mdash;</span><span>Glossary</span></a></li>
        </ul>
      </div>`;
const navEnd = html.indexOf('</nav>', html.indexOf('<nav class="sidebar"'));
const blockEnd = html.lastIndexOf('      </div>', navEnd);
html = html.slice(0, blockEnd) + sidebarInsert + html.slice(blockEnd + '      </div>'.length);

html = html.replace(/<main class="shell-main">[\s\S]*<\/main>/, main);
html = html.replace(/\s*<nav class="next-up"[\s\S]*?<\/nav>/g, '');

fs.writeFileSync(OUT, html);
console.log(`Pictures page built: ${total} exhibits across ${MOVEMENTS.filter((m) => [...charts.values()].some((c) => m.parts.includes(c.part))).length} movements -> public/site-b/framework-in-pictures.html`);
