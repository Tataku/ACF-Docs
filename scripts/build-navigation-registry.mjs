import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FRAMEWORK_CHART_SPECS } from '../components/framework-charts/chart-specs.mjs';
import { PAGES as SITE_PAGES } from './site-titles.mjs';
import { appearsLaterProblems } from './glossary-anchors.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = path.join(root, 'public/site-b');
const out = path.join(site, 'navigation-registry.json');
const origin = 'https://docs.acfdashboard.com';
const check = process.argv.includes('--check');
// Titles come from scripts/site-titles.mjs, the one place they are spelled
// (D-TITLES); this list adds only the clean route each file is served on.
const routes = {
  'cover-docs.html': '/',
  'part-1-foundation.html': '/part-1-foundation',
  'part-1-pictures.html': '/part-1-pictures',
  'part-2-lineage-macro.html': '/part-2-lineage-macro-thesis',
  'part-3-bitcoin-convexity.html': '/part-3-bitcoin-convexity-backbone',
  'part-4-tax-architecture.html': '/part-4-tax-architecture-roc-strategy',
  'part-5-portfolio-construction.html': '/part-5-portfolio-construction-position-management',
  'part-6-convexity-scoring.html': '/part-6-convexity-framework-integrity-scoring',
  'glossary.html': '/glossary',
  'framework-in-pictures.html': '/framework-in-pictures',
  'framework-in-math.html': '/framework-in-math',
};
const pages = SITE_PAGES.map(({ part, file, label }) => ({ part, route: routes[file], file, title: label }));

const errors = [], warnings = [], byRoute = new Map(), aliases = {};
const specById = new Map(FRAMEWORK_CHART_SPECS.map(s => [s.chartId, s]));
const specByRef = new Map();
FRAMEWORK_CHART_SPECS.forEach(s => [s.chartId, s.idx].filter(Boolean).forEach(k => specByRef.set(String(k), s)));
const read = f => fs.readFileSync(f, 'utf8');
const attr = src => Object.fromEntries([...src.matchAll(/([:\w-]+)\s*=\s*(["'])(.*?)\2/gms)].map(m => [m[1], m[3]]));
const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b([^>]*)>`, 'gims'))].map(m => attr(m[1]));
const ids = html => new Set([...html.matchAll(/\sid\s*=\s*(["'])(.*?)\1/gms)].map(m => m[2]));
const canonical = html => { const m = html.match(/<link\b([^>]*\brel\s*=\s*(["'])canonical\2[^>]*)>/ims); return m ? attr(m[1]).href : null; };
const clean = p => p.length > 1 ? p.replace(/\/$/, '') : p;
const visualReferenceClasses = ['part-ref', 'lineage-ref'];

const runtimeSourceFile = path.join(root, 'scripts', 'reference-integrity-runtime.js');
const readingRuntimeFile = path.join(site, 'reading.js');
const runtimeStart = '/* ACF_REFERENCE_INTEGRITY_START */';
const runtimeEnd = '/* ACF_REFERENCE_INTEGRITY_END */';
const fallbackStyle = '<style id="acf-reference-integrity-fallback">.part-ref.is-pending-reference,.lineage-ref.is-pending-reference{color:inherit!important;border:0!important;background:none!important;text-decoration:none!important;cursor:default!important}.part-ref.is-pending-reference::before,.part-ref.is-pending-reference::after,.lineage-ref.is-pending-reference::before,.lineage-ref.is-pending-reference::after{content:none!important}</style>';

function installReferenceRuntime() {
  if (!fs.existsSync(runtimeSourceFile) || !fs.existsSync(readingRuntimeFile)) {
    errors.push('reference integrity runtime or reading.js is missing');
    return;
  }
  const payload = read(runtimeSourceFile).trim();
  let reading = read(readingRuntimeFile);
  const block = `${runtimeStart}\n${payload}\n${runtimeEnd}\n`;
  const existingStart = reading.indexOf(runtimeStart);
  const existingEnd = reading.indexOf(runtimeEnd);
  if (existingStart !== -1 && existingEnd > existingStart) {
    const after = existingEnd + runtimeEnd.length;
    reading = reading.slice(0, existingStart) + block + reading.slice(after).replace(/^\n?/, '');
  } else {
    reading = `${reading.trimEnd()}\n\n${block}`;
  }
  if (!check) fs.writeFileSync(readingRuntimeFile, reading);
  else if (read(readingRuntimeFile) !== reading) errors.push('reading.js is missing the generated reference integrity runtime');

  for (const page of pages) {
    const file = path.join(site, page.file);
    if (!fs.existsSync(file)) continue;
    let html = read(file);
    if (!html.includes('acf-reference-integrity-fallback')) html = html.replace('</head>', `  ${fallbackStyle}\n</head>`);
    if (!check) fs.writeFileSync(file, html);
    else if (read(file) !== html) errors.push(`${page.route}: missing reference-integrity fallback style`);
  }
}

installReferenceRuntime();

for (const p of pages) {
  const file = path.join(site, p.file);
  if (!fs.existsSync(file)) { errors.push(`${p.route}: missing ${p.file}`); continue; }
  const html = read(file), pageIds = ids(html), seen = new Set();
  [...html.matchAll(/\sid\s*=\s*(["'])(.*?)\1/gms)].forEach(m => { if (seen.has(m[2])) errors.push(`${p.route}: duplicate id #${m[2]}`); seen.add(m[2]); });
  const record = {
    ...p,
    html,
    ids: pageIds,
    anchors: tags(html, 'a'),
    figures: tags(html, 'figure').filter(x => x['data-fc-chart']),
    glossary: [...html.matchAll(/\bdata-gloss\s*=\s*(["'])(.*?)\1/gims)].map(m => m[2]),
  };
  byRoute.set(p.route, record);
  const raw = `/site-b/${p.file}`;
  [p.route, raw, p.file, `/${p.file}`].forEach(v => aliases[v] = p.route);
  aliases[`${origin}${p.route}`] = p.route; aliases[`${origin}${raw}`] = p.route;
  if (p.file === 'cover-docs.html') aliases['cover-docs.html'] = '/';
  if (canonical(html) !== `${origin}${p.route}`) errors.push(`${p.route}: incorrect or missing canonical URL`);

  for (const className of visualReferenceClasses) {
    const openTags = [...html.matchAll(new RegExp(`<([a-z][\\w:-]*)\\b([^>]*\\bclass\\s*=\\s*(["'])[^"']*\\b${className}\\b[^"']*\\3[^>]*)>`, 'gims'))];
    for (const match of openTags) {
      const tagName = match[1].toLowerCase();
      const attrs = attr(match[2]);
      if (tagName === 'a' && (!attrs.href || attrs.href === '#' || /^javascript:/i.test(attrs.href))) errors.push(`${p.route}: .${className} anchor has inert href`);
      if (tagName !== 'a') warnings.push(`${p.route}: runtime-upgraded .${className} found as <${tagName}>`);
    }
  }
  const navTargets = tags(html, 'a').filter(a => a['data-nav-target']);
  navTargets.forEach(a => {
    if (!a.href) errors.push(`${p.route}: [data-nav-target] anchor missing href`);
    if (a.href && a['data-nav-target'] !== a.href) errors.push(`${p.route}: data-nav-target ${a['data-nav-target']} does not match href ${a.href}`);
  });
  const nonAnchorNavTargets = [...html.matchAll(/<([a-z][\w:-]*)\b([^>]*\bdata-nav-target\s*=\s*(["'])(.*?)\3[^>]*)>/gims)]
    .filter(m => m[1].toLowerCase() !== 'a');
  nonAnchorNavTargets.forEach(m => warnings.push(`${p.route}: runtime-upgraded [data-nav-target] found as <${m[1].toLowerCase()}>`));
}

let anchorCount = 0;
for (const p of byRoute.values()) for (const a of p.anchors) {
  anchorCount += 1; const href = a.href;
  if (!href || href === '#' || /^javascript:/i.test(href)) { errors.push(`${p.route}: inert or empty href`); continue; }
  if (!/^https?:\/\//i.test(href) && (/\.html(?:[?#]|$)/i.test(href) || href.startsWith('/site-b/'))) errors.push(`${p.route}: raw HTML route ${href}`);
  if (/^(mailto:|tel:)/i.test(href)) continue;
  let u; try { u = new URL(href, `${origin}${p.route}`); } catch { errors.push(`${p.route}: malformed href ${href}`); continue; }
  if (u.origin !== origin) continue;
  const route = aliases[clean(u.pathname)] || clean(u.pathname), target = byRoute.get(route);
  if (!target) { errors.push(`${p.route}: ${href} targets unknown canonical route ${route}`); continue; }
  if (u.hash && !target.ids.has(u.hash.slice(1))) errors.push(`${p.route}: ${href} targets missing ${u.hash}`);
}

// A chart's home is the page of its spec group, never the order pages are
// scanned in: a Part chart lives on its Part page, a lens or signature chart on
// the cover. A lens or signature chart the cover does not mount lives on the
// first Part page that does (Part 1 today). Part 1 in Pictures and the
// reference pages mount copies; they are never a home (D-EXHIBIT-NUMBERING).
const partRoute = n => pages.find(p => p.part === n && /^\/part-\d-/.test(p.route) && p.route !== '/part-1-pictures')?.route;
const groupHome = group => /^part-[1-6]$/.test(group) ? partRoute(Number(group.slice(5))) : (group === 'signature' || group === 'docs-landing') ? '/' : null;
const isPartPage = route => /^\/part-[1-6]-/.test(route) && route !== '/part-1-pictures';
const mounts = [], charts = {}, mountsById = new Map();
for (const p of byRoute.values()) for (const f of p.figures) {
  const id = f['data-fc-chart'], spec = specById.get(id);
  if (!f.id) errors.push(`${p.route}: chart ${id} has no figure id`);
  if (!spec) { errors.push(`${p.route}: chart ${id} has no spec`); continue; }
  if (f['data-chart'] && spec.idx && f['data-chart'] !== spec.idx) errors.push(`${p.route}: figure #${f.id} data-chart="${f['data-chart']}" but ${id} has idx ${spec.idx}`);
  const item = { chartId: id, idx: spec.idx || null, title: spec.title, part: p.part, route: p.route, hash: f.id ? `#${f.id}` : '', href: `${p.route}${f.id ? `#${f.id}` : ''}` };
  mounts.push(item);
  if (!mountsById.has(id)) mountsById.set(id, []);
  mountsById.get(id).push(item);
}
for (const [id, list] of mountsById) {
  const spec = specById.get(id), want = groupHome(spec.group);
  if (!want) { errors.push(`${id}: spec group ${spec.group} has no home page`); continue; }
  const home = list.find(m => m.route === want)
    || (/^part-/.test(spec.group) ? null : list.find(m => isPartPage(m.route)));
  if (!home) { errors.push(`${id}: not mounted on its home page ${want} (spec group ${spec.group})`); continue; }
  [id, spec.idx].filter(Boolean).map(String).forEach(k => { specByRef.set(k, spec); if (charts[k] && charts[k].chartId !== id) errors.push(`chart key ${k} names both ${charts[k].chartId} and ${id}`); charts[k] = home; });
}

for (const spec of FRAMEWORK_CHART_SPECS) {
  (spec.sources || []).forEach(s => { if (s.url && (!/^(https?:\/\/|\/|#)/.test(s.url) || s.url === '#')) errors.push(`${spec.chartId}: invalid source URL ${s.url}`); });
  if (spec.wiredPublic === true && !mounts.some(m => m.chartId === spec.chartId)) errors.push(`${spec.chartId}: wiredPublic but not mounted`);
}

const glossaryFile = path.join(site, 'acf-glossary.json');
const glossary = fs.existsSync(glossaryFile) ? JSON.parse(read(glossaryFile)) : { terms: [] };
const terms = Array.isArray(glossary.terms) ? glossary.terms : [], termIds = new Set(), tagged = new Set();
terms.forEach(t => { if (!t.id || termIds.has(t.id)) errors.push(`invalid or duplicate glossary id ${t.id || '(missing)'}`); termIds.add(t.id); });
for (const p of byRoute.values()) p.glossary.forEach(id => { tagged.add(id); if (!termIds.has(id)) errors.push(`${p.route}: unknown glossary id ${id}`); });
const routeByPart = new Map(); pages.forEach(p => { if (p.part && !routeByPart.has(p.part)) routeByPart.set(p.part, p.route); });
// "Appears in Part N · topic" lands on the section that develops the term, and
// the topic is a heading in it (D-GLOSSARY-APPEARS-LATER).
appearsLaterProblems(terms).forEach(e => errors.push(`glossary ${e}`));
const glossaryNav = {}, unresolvedGlossaryCharts = [];
for (const t of terms) {
  const laterRoute = t.appearsLater && routeByPart.get(t.appearsLater.part);
  const later = laterRoute ? { href: `${laterRoute}#${t.appearsLater.anchor}`, label: `Appears in Part ${t.appearsLater.part} · ${t.appearsLater.topic}` } : null;
  const live = t.chart && charts[String(t.chart)];
  const chart = live ? { href: live.href, label: `View the chart → ${live.idx || live.chartId} · ${live.title}` } : null;
  if (t.chart && !live) { const known = specByRef.has(String(t.chart)); unresolvedGlossaryCharts.push({ term: t.id, ref: String(t.chart), knownSpec: known }); if (!known) warnings.push(`${t.id}: unknown chart ref ${t.chart}`); }
  const entry = { href: `/glossary#g-${t.id}`, label: `View the glossary entry → ${t.term}` };
  glossaryNav[t.id] = { later, chart, entry };
}

const sections = Object.fromEntries([...byRoute].map(([route, page]) => [route, [...page.ids].sort()]));
const registry = {
  version: 2,
  canonicalOrigin: origin,
  pages: pages.map(({ part, route, file, title }) => ({ part, route, file, title })),
  aliases,
  sections,
  charts,
  glossary: glossaryNav,
  audit: {
    pages: byRoute.size,
    anchors: anchorCount,
    chartSpecs: FRAMEWORK_CHART_SPECS.length,
    liveChartMounts: mounts.length,
    glossaryTerms: terms.length,
    glossaryTermsAlreadyTagged: tagged.size,
    glossaryTermsAutoTagEligible: terms.filter(t => !tagged.has(t.id)).length,
    unresolvedGlossaryCharts,
    warnings,
  },
};
const serialized = `${JSON.stringify(registry, null, 2)}\n`;

// reading-core.js carries a no-registry fallback copy of the chart map
// (BUILT_CHARTS). It is written here, from the same homes, so its labels and
// anchors cannot drift from the specs: '<idx> · <title>', keyed by idx and chartId.
const coreFile = path.join(site, 'reading-core.js');
const builtChartsBlock = () => {
  const q = s => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  const seen = new Set(), lines = [];
  for (const home of Object.values(charts)) {
    if (seen.has(home.chartId)) continue;
    seen.add(home.chartId);
    const val = `{ page: ${q(home.route)}, hash: ${q(home.hash)}, label: ${q(`${home.idx || home.chartId} · ${home.title}`)} }`;
    [home.idx, home.chartId].filter(Boolean).forEach(k => lines.push(`    ${q(k)}: ${val}`));
  }
  return `var BUILT_CHARTS = {\n${lines.join(',\n')}\n  };`;
};
if (fs.existsSync(coreFile)) {
  const core = read(coreFile), re = /var BUILT_CHARTS = \{[\s\S]*?\n  \};/;
  if (!re.test(core)) errors.push('reading-core.js: BUILT_CHARTS block not found');
  else {
    const next = core.replace(re, builtChartsBlock());
    if (check) { if (next !== core) errors.push('reading-core.js BUILT_CHARTS is stale'); }
    else if (!errors.length) fs.writeFileSync(coreFile, next);
  }
}

if (errors.length) { console.error(`Navigation audit failed (${errors.length})`); errors.forEach(e => console.error(`- ${e}`)); process.exit(1); }
if (check) { if (!fs.existsSync(out) || read(out) !== serialized) { console.error('navigation-registry.json is stale'); process.exit(1); } }
else fs.writeFileSync(out, serialized);
console.log(`Navigation audit passed: ${registry.audit.pages} pages · ${registry.audit.anchors} anchors · ${registry.audit.liveChartMounts}/${registry.audit.chartSpecs} chart mounts/specs · ${registry.audit.glossaryTerms} glossary terms.`);
warnings.forEach(w => console.warn(`Warning: ${w}`));
