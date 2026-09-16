/**
 * Cover search — one generated corpus, canonical destinations
 *
 * Run: npm run test:search-index
 *
 * The cover's search panel carried three hand-written arrays and all three had
 * drifted away from the site they described. The visible symptom, and the one a
 * reader met: every glossary hit resolved through a wave-to-route map that knew
 * waves 1, 2 and 3, so each of the 39 wave-4 terms fell back to Part 1 with no
 * anchor. Searching "Torque" put you on the Foundation page with nothing
 * highlighted. The Parts and Sections lists had stopped at Part 3 in the same
 * way — no Parts 4-6, no glossary, no math page.
 *
 * Nothing threw and nothing 404'd, which is the point: a hand-maintained index
 * does not fail, it just stops being true. So the index is generated now, and
 * what this file pins is mostly the SHAPE that keeps it true — no route table in
 * the client, every destination the same one the rest of the site uses for that
 * term, and a builder that refuses to write a link it cannot resolve.
 *
 * Runtime behaviour (the panel opens, a term lands on its own row expanded and
 * in view, all 160 links resolve) was measured in Chromium at 390 and 1440.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const json = (rel) => JSON.parse(read(rel));

const JS = read('public/site-b/cover-docs.js');
const BUILDER = read('scripts/build-search-index.mjs');
const INDEX = json('public/site-b/search-index.json');
const REGISTRY = json('public/site-b/navigation-registry.json');
const GLOSSARY = json('public/site-b/acf-glossary.json');
const PKG = json('package.json');

// ---------------------------------------------------------------------------
// 1. The client holds no index of its own — the shape that caused the drift
// ---------------------------------------------------------------------------
test('client: no hand-written route table survives in cover-docs.js', () => {
  assert.doesNotMatch(JS, /WAVE_FILES/, 'the wave-to-route map is gone');
  // The specific tell: a literal part route written into the search client. A
  // route table here cannot be regenerated, so it drifts the moment a Part ships.
  const routes = JS.match(/'\/part-\d[a-z0-9-]*'/g);
  assert.equal(routes, null, `literal part routes in the client: ${routes && routes.join(', ')}`);
  assert.doesNotMatch(JS, /var (PARTS|SECTIONS) = \[/, 'no hand-written corpus arrays');
  assert.match(JS, /fetch\('\/site-b\/search-index\.json'\)/, 'it reads the generated index');
});

test('client: the Glossary tile stays a link until the panel can answer', () => {
  // It used to preventDefault unconditionally, so a slow or failed fetch turned
  // the tile into a click that did nothing at all.
  const handler = JS.slice(JS.indexOf("var glossTile ="), JS.indexOf('document.addEventListener'));
  assert.match(handler, /if \(!indexReady\) return;[\s\S]*?e\.preventDefault\(\)/,
    'the guard comes before the preventDefault, not after');
});

test('client: the placeholder names the corpus that mode will actually search', () => {
  const open = JS.slice(JS.indexOf('function openPanel('), JS.indexOf('function closePanel('));
  assert.match(open, /input\.placeholder = glossaryOnly/, 'it is set per mode');
  assert.match(open, /glossary terms/, 'glossary mode says so');
  // The old string promised Parts and sections in a mode that searched neither.
  assert.doesNotMatch(JS, /placeholder = 'Search Parts, sections/, 'the over-promising placeholder is gone');
});

// ---------------------------------------------------------------------------
// 2. Destinations
// ---------------------------------------------------------------------------
test('index: every glossary row points at that term’s own entry', () => {
  const ids = new Set(GLOSSARY.terms.map((t) => t.id));
  assert.equal(INDEX.glossary.length, GLOSSARY.terms.length, 'every term is in the index');
  for (const row of INDEX.glossary) {
    const m = /^\/glossary#g-([a-z0-9-]+)$/.exec(row.h);
    assert.ok(m, `${row.t} -> ${row.h} is not a glossary entry link`);
    assert.ok(ids.has(m[1]), `${row.t} -> unknown term id ${m[1]}`);
  }
  // No row may land on a part page again — that IS the original bug.
  assert.equal(INDEX.glossary.filter((r) => r.h.startsWith('/part-')).length, 0);
});

test('index: the destination is the same one the rest of the site uses', () => {
  // The tooltip layer's "view the glossary entry" link and a search result must
  // agree, or a term has two homes and one of them is wrong.
  for (const row of INDEX.glossary) {
    const id = /#g-(.+)$/.exec(row.h)[1];
    const canonical = REGISTRY.glossary[id] && REGISTRY.glossary[id].entry && REGISTRY.glossary[id].entry.href;
    if (canonical) assert.equal(row.h, canonical, `${row.t}: search says ${row.h}, the registry says ${canonical}`);
  }
});

test('index: every page and every section resolves against the registry', () => {
  const routes = new Set(REGISTRY.pages.map((p) => p.route));
  for (const row of [...INDEX.parts, ...INDEX.sections]) {
    const [route, hash] = row.h.split('#');
    assert.ok(routes.has(route), `${row.t} -> unknown page ${route}`);
    if (hash) assert.ok((REGISTRY.sections[route] || []).includes(hash), `${row.t} -> no #${hash} on ${route}`);
  }
});

// ---------------------------------------------------------------------------
// 3. Coverage — the half of the defect that was invisible
// ---------------------------------------------------------------------------
test('index: every page is offered except the cover you are standing on', () => {
  const offered = new Set(INDEX.parts.map((p) => p.h));
  for (const page of REGISTRY.pages) {
    if (page.route === '/') { assert.ok(!offered.has('/'), 'the cover does not list itself'); continue; }
    assert.ok(offered.has(page.route), `missing from search: ${page.route}`);
  }
  assert.equal(INDEX.parts.length, REGISTRY.pages.length - 1);
});

test('index: sections reach every Part, not just the first three', () => {
  const parts = new Set(INDEX.sections.map((s) => (/^\/part-(\d)/.exec(s.h) || [, null])[1]).filter(Boolean));
  assert.deepEqual([...parts].sort(), ['1', '2', '3', '4', '5', '6'], `sections cover parts ${[...parts].sort()}`);
});

test('index: rows carry a title and a snippet, and no raw HTML entity', () => {
  for (const row of [...INDEX.parts, ...INDEX.sections, ...INDEX.glossary]) {
    assert.ok(row.t && row.s && row.h, `incomplete row: ${JSON.stringify(row)}`);
    // The panel escapes what it prints, so an entity here reaches the reader as
    // its literal characters.
    assert.doesNotMatch(`${row.t} ${row.s}`, /&[a-z]+;|&#\d+;/i, `undecoded entity in ${row.t}`);
  }
});

// ---------------------------------------------------------------------------
// 4. The build stays honest
// ---------------------------------------------------------------------------
test('build: the index is regenerated in prebuild, after the registry it reads', () => {
  const chain = PKG.scripts.prebuild;
  assert.ok(chain.includes('build:search'), 'prebuild builds the index');
  assert.ok(chain.indexOf('build:navigation') < chain.indexOf('build:search'),
    'and does it after the registry it derives from');
  assert.equal(PKG.scripts['audit:search'], 'node scripts/build-search-index.mjs --check');
});

test('build: the audit fails on drift (build:search --check)', () => {
  const r = spawnSync(process.execPath, ['scripts/build-search-index.mjs', '--check'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr || r.stdout);
});

test('build: an unresolvable link is an error, not a row', () => {
  // Fail-closed is the property that makes "generated" better than "written by
  // hand" — a generator that emits a dead link is just a faster way to be wrong.
  assert.match(BUILDER, /function resolves\(href, where\)/);
  assert.match(BUILDER, /errors\.push\(`\$\{where\}: \$\{href\} — no such page`\)/);
  assert.match(BUILDER, /errors\.push\(`\$\{where\}: \$\{href\} — no such anchor on \$\{route\}`\)/);
  assert.match(BUILDER, /if \(errors\.length\) \{[\s\S]*?process\.exit\(1\)/, 'and nothing is written when there are any');
});

// ---------------------------------------------------------------------------
// 5. The entry point — the corpus was correct and unreachable
// ---------------------------------------------------------------------------
// Pages and sections were indexed, resolved and audited, and nothing on the site
// could open the panel in the mode that searched them: the Glossary tile was the
// only way in, in glossary-only mode. A pattern review had deferred a persistent
// entry point "until Parts 4-6 and the glossary page make the corpus deep
// enough", and they do — ten pages, 41 sections, 109 terms.
//
// Measured in Chromium at 390 and 1440 before these were written: the trigger
// opens all three groups, Ctrl/Cmd-K and "/" open it, "/" does not steal a
// keystroke from someone typing, Tab does not leave the dialog, and Escape hands
// focus back to the trigger.

const COVER = read('public/site-b/cover-docs.html');
const CSS = read('public/site-b/reading-system.css');

test('entry: the trigger lives in the half of the header that survives a phone', () => {
  const head = COVER.slice(COVER.indexOf('<div class="nav-right">'), COVER.indexOf('</header>'));
  assert.match(head, /class="nav-search"[^>]*data-search-open/, 'the trigger is in .nav-right');
  // .nav-links is display:none below the phone breakpoint, so a trigger placed
  // there would have shipped search to desktop only — which is what the in-page
  // bar it replaces did. Anchored on the rule itself: the file has several
  // 768px blocks and the first one is about pull-quotes.
  const hide = CSS.indexOf('.nav-links { display: none; }');
  assert.notEqual(hide, -1, 'the phone rule exists');
  const phone = CSS.slice(hide, CSS.indexOf('}\n', CSS.indexOf('\n}', hide)) + 2);
  assert.doesNotMatch(phone, /\.nav-search[^{]*\{[^}]*display:\s*none/, 'the trigger is not hidden with it');
  assert.match(phone, /\.nav-search \{ min-width: 2\.75rem; min-height: 2\.75rem; \}/,
    'it is given a touch-sized target instead');
});

test('entry: it is named and typed for assistive tech', () => {
  const btn = COVER.match(/<button[^>]*class="nav-search"[^>]*>/)[0];
  assert.match(btn, /type="button"/, 'not a submit');
  assert.match(btn, /aria-label="Search the framework"/, 'it has a name of its own');
  assert.match(btn, /aria-haspopup="dialog"/, 'and says what it opens');
});

test('entry: the trigger opens the full corpus, the tile keeps term-only', () => {
  assert.match(JS, /\[data-search-open\][\s\S]{0,180}openPanel\(false\)/, 'the header opens all three groups');
  assert.match(JS, /glossTile[\s\S]{0,400}openPanel\(true\)/, 'the tile still opens the glossary alone');
});

test('entry: the shortcuts work, and "/" never steals a keystroke', () => {
  const handler = JS.slice(JS.indexOf('function typingTarget('), JS.length);
  assert.match(handler, /e\.metaKey \|\| e\.ctrlKey/, 'Cmd and Ctrl both open it');
  assert.match(handler, /e\.key === '\/'[\s\S]{0,120}!typingTarget\(e\.target\)/,
    '"/" is guarded against firing while someone is typing');
  assert.match(handler, /tag === 'INPUT' \|\| tag === 'TEXTAREA'/, 'and the guard knows what a field is');
  assert.match(handler, /el\.isContentEditable/, 'including a contenteditable one');
  // Escape has to come before the "already open" bail, or the panel cannot close.
  const body = JS.slice(JS.indexOf("document.addEventListener('keydown'"), JS.length);
  assert.ok(body.indexOf("=== 'Escape'") < body.indexOf('!panel.hidden'),
    'Escape is handled before the open-panel early return');
});

test('entry: the dialog is modal, and Tab stays inside it', () => {
  assert.match(JS, /panel\.setAttribute\('aria-modal', 'true'\)/);
  const trap = JS.slice(JS.indexOf("panel.addEventListener('keydown'"), JS.indexOf("input.addEventListener('input'"));
  assert.match(trap, /e\.key !== 'Tab'/, 'it only intercepts Tab');
  assert.match(trap, /e\.shiftKey && document\.activeElement === first/, 'Shift-Tab wraps backwards');
  assert.match(trap, /!e\.shiftKey && document\.activeElement === last/, 'and Tab wraps forwards');
});

test('entry: one function decides which modifier this keyboard has', () => {
  // The hint, the title and the panel legend must never disagree about whether
  // this reader presses Cmd or Ctrl.
  assert.equal((JS.match(/function shortcutKey\(\)/g) || []).length, 1, 'declared once');
  assert.equal((JS.match(/'Ctrl K'/g) || []).length, 1, 'and the string it returns appears once');
  assert.match(JS, /navigator\.userAgentData/, 'it asks the supported API first');
  assert.match(JS, /navigator\.platform \|\| navigator\.userAgent/, 'with the deprecated one as fallback only');
  for (const use of [/hint\.textContent = shortcutKey\(\)/, /navSearch\.title = 'Search \(' \+ shortcutKey\(\)/, /<kbd>' \+ shortcutKey\(\)/]) {
    assert.match(JS, use, `a consumer does not hardcode the key: ${use}`);
  }
});

test('entry: "no matches" is not claimed before there is a corpus to miss', () => {
  const render = JS.slice(JS.indexOf('function render('), JS.indexOf('function setActive('));
  assert.match(render, /indexReady[\s\S]{0,200}Loading the index/, 'a pending index says so');
  assert.match(render, /No matches\./, 'and a loaded one can say there were none');
});

test('entry: the shortcut legend the header has no room for lives in the panel', () => {
  assert.match(JS, /foot\.className = 'dc-search-foot'/);
  assert.match(CSS, /\.dc-search-foot \{/, 'and it is styled');
  // A legend of keyboard shortcuts on a touch device is furniture.
  assert.match(CSS, /@media \(max-width: 680px\) \{ \.dc-search-foot \{ display: none; \} \}/,
    'hidden on a phone');
});
