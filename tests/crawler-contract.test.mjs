/**
 * Crawler contract — what a search engine may fetch, and what it may index
 *
 * Run: npm run test:crawler-contract
 *
 * The docs are hand-authored HTML under public/site-b/, published on clean
 * routes by `beforeFiles` rewrites. That leaves two URLs for every document,
 * and exactly one mechanism is allowed to resolve the duplicate:
 *
 *   clean route            indexable   canonical declared on the page
 *   /site-b/**.html        fetchable   X-Robots-Tag: noindex  <- owns the dedupe
 *   /site-b/** (assets)    fetchable   no header; needed to render and to share
 *   /api/**                closed      robots.txt disallow
 *
 * WHY THIS FILE EXISTS. robots.txt used to carry `Disallow: /site-b/`, described
 * in its own comment as "belt and braces" alongside the header. It was the
 * reverse. A header is only read by a crawler allowed to fetch the document
 * carrying it, so the disallow did not reinforce the noindex, it stopped the
 * noindex from ever being seen. And the same line covered the stylesheets, the
 * scripts, the fonts, the runtime JSON and the og:image social cards. Rendered
 * as a compliant crawler saw it, framework-in-pictures kept 585 of 9,110 words,
 * a part page lost 30%, every page fell back to Times New Roman, and not one
 * chart exhibit drew.
 *
 * Both halves of that failure were invisible to every existing audit: the site
 * looked perfect in a browser, which does not read robots.txt. So the contract
 * is asserted here rather than left to a reviewer noticing a one-line diff.
 *
 * The header rule is evaluated with the SAME matcher Next.js uses
 * (path-to-regexp, from Next's own compiled copy), so this tests the real
 * routing semantics rather than a re-implementation of them.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

// Next's own compiled copy, so the header rules are evaluated with the exact
// matcher that will run in production rather than a re-implementation of it.
// It is CommonJS, hence createRequire. If a Next upgrade moves it, this throws
// with the reason instead of silently falling back to a weaker approximation.
const require = createRequire(import.meta.url);
let pathToRegexp;
try {
  ({ pathToRegexp } = require('next/dist/compiled/path-to-regexp'));
} catch (err) {
  throw new Error(
    'Cannot load Next\'s path-to-regexp; the header-source matcher moved. ' +
    'Point this test at the new location rather than approximating the match. Cause: ' + err.message
  );
}

const ROOT = path.resolve(import.meta.dirname, '..');
const SITE_B = path.join(ROOT, 'public', 'site-b');
const ROBOTS = fs.readFileSync(path.join(ROOT, 'public', 'robots.txt'), 'utf8');
const SITEMAP = fs.readFileSync(path.join(ROOT, 'public', 'sitemap.xml'), 'utf8');
const CONFIG = (await import(path.join(ROOT, 'next.config.mjs'))).default;
const REWRITES = (await CONFIG.rewrites()).beforeFiles;
const HEADERS = await CONFIG.headers();

const ORIGIN = (SITEMAP.match(/<loc>(https?:\/\/[^/]+)/) || [])[1];
const PAGES = REWRITES.map((r) => ({
  route: r.source,
  file: r.destination,                                   // /site-b/<name>.html
  html: fs.readFileSync(path.join(ROOT, 'public', r.destination.replace(/^\//, '')), 'utf8')
}));

// --- robots.txt, evaluated the way a crawler evaluates it -------------------
// RFC 9309 / Google: the most specific matching rule wins, measured by pattern
// length, and Allow wins a tie. Implemented rather than approximated so that a
// future `Allow:` exception is judged correctly instead of assumed harmless.
function robotsRules(txt) {
  const rules = [];
  let inStar = false;
  for (const raw of txt.split('\n')) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const [k, ...rest] = line.split(':');
    const key = k.trim().toLowerCase();
    const value = rest.join(':').trim();
    if (key === 'user-agent') { inStar = value === '*'; continue; }
    if (!inStar) continue;
    if (key === 'allow' || key === 'disallow') rules.push({ type: key, pattern: value });
  }
  return rules;
}
function patternMatches(pattern, url) {
  if (pattern === '') return false;
  const anchored = pattern.endsWith('$');
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const re = new RegExp(
    '^' + body.split('*').map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + (anchored ? '$' : '')
  );
  return re.test(url);
}
const RULES = robotsRules(ROBOTS);
function crawlerMayFetch(url) {
  let best = null;
  for (const r of RULES) {
    if (!patternMatches(r.pattern, url)) continue;
    if (!best || r.pattern.length > best.pattern.length ||
        (r.pattern.length === best.pattern.length && r.type === 'allow')) best = r;
  }
  return !best || best.type === 'allow';
}

// --- the header rules, via Next's own matcher -------------------------------
function headersFor(urlPath) {
  const out = [];
  for (const rule of HEADERS) if (pathToRegexp(rule.source).test(urlPath)) out.push(...rule.headers);
  return out;
}
const noindexOn = (urlPath) =>
  headersFor(urlPath).some((h) => h.key.toLowerCase() === 'x-robots-tag' && /noindex/i.test(h.value));

// --- what each page needs in order to render and to be shared ---------------
// Derived from the pages and the scripts, never listed by hand: a resource that
// stops being referenced stops being asserted, and a new one is covered the day
// it is added.
function subresourcesOf(html) {
  const out = new Set();
  for (const m of html.matchAll(/(?:href|src)="(\/site-b\/[^"]+)"/g)) out.add(m[1]);
  for (const m of html.matchAll(/content="([^"]*\/site-b\/[^"]+)"/g)) {
    out.add(m[1].replace(ORIGIN, ''));                   // og:image / twitter:image
  }
  return [...out];
}
const RUNTIME_JSON = [...new Set(
  fs.readdirSync(SITE_B).filter((f) => f.endsWith('.js'))
    .flatMap((f) => [...fs.readFileSync(path.join(SITE_B, f), 'utf8')
      .matchAll(/['"`](\/site-b\/[^'"`]+\.json)['"`]/g)].map((m) => m[1]))
)];

// ---------------------------------------------------------------------------
// 1. Clean routes do NOT inherit noindex
// ---------------------------------------------------------------------------
test('clean routes stay indexable: no header rule matches the canonical surface', () => {
  assert.ok(PAGES.length >= 11, `expected the full route table, saw ${PAGES.length}`);
  for (const p of PAGES) {
    assert.equal(headersFor(p.route).length, 0,
      `${p.route} picked up ${JSON.stringify(headersFor(p.route))} — header sources match the ORIGINAL request path, so a rule that reaches a clean route would deindex the site`);
  }
});

// ---------------------------------------------------------------------------
// 2. Raw HTML does carry noindex
// ---------------------------------------------------------------------------
test('raw documents carry the noindex that owns duplicate suppression', () => {
  for (const p of PAGES) {
    assert.ok(noindexOn(p.file), `${p.file} is a second URL for ${p.route} and must be noindex`);
  }
  // Any .html under the prefix, at any depth — including pages added later and
  // the internal scaffolds, which are documents rather than resources.
  for (const extra of ['/site-b/_index.html', '/site-b/_island-test.html', '/site-b/nested/deep.html']) {
    assert.ok(noindexOn(extra), `${extra} is a document under /site-b/ and must be noindex`);
  }
  // And the noindex must be REACHABLE: a header on a document the crawler is
  // forbidden to fetch is the exact failure this contract exists to prevent.
  for (const p of PAGES) {
    assert.ok(crawlerMayFetch(p.file),
      `${p.file} is disallowed in robots.txt, so its noindex can never be read — that is how a URL stays indexable from external links alone`);
  }
});

// ---------------------------------------------------------------------------
// 3. Render and share resources are fetchable
// ---------------------------------------------------------------------------
test('every resource the canonical pages need is fetchable by a compliant crawler', () => {
  let checked = 0;
  for (const p of PAGES) {
    for (const url of subresourcesOf(p.html)) {
      assert.ok(crawlerMayFetch(url), `${p.route} needs ${url}, which robots.txt refuses`);
      checked += 1;
    }
  }
  assert.ok(checked >= 50, `expected the pages' stylesheets, scripts, fonts and cards, saw ${checked}`);
  for (const url of RUNTIME_JSON) {
    assert.ok(crawlerMayFetch(url), `the runtime reads ${url}, which robots.txt refuses`);
  }
  assert.ok(RUNTIME_JSON.length >= 2, `expected the glossary and navigation JSON, saw ${RUNTIME_JSON.join(', ')}`);
  // Assets are resources, not duplicates: a noindex here would take the social
  // cards out of image results and buy nothing.
  for (const url of ['/site-b/reading-system.css', '/site-b/reading-core.js', '/site-b/site-b-charts.js',
    '/site-b/fonts/InterVariable.woff2', '/site-b/acf-glossary.json']) {
    assert.ok(!noindexOn(url), `${url} is a resource, not a document — it should carry no noindex`);
  }
});

test('the server-side API stays closed', () => {
  assert.ok(!crawlerMayFetch('/api/narration'), 'robots.txt must keep /api/ disallowed');
  assert.ok(!crawlerMayFetch('/api/'), 'the whole /api/ prefix, not one route');
});

test('robots.txt never re-acquires a rule that hides the render path', () => {
  // The specific regression, named so a reviewer sees it in the diff.
  assert.doesNotMatch(ROBOTS, /^\s*Disallow:\s*\/site-b\/\s*$/mi,
    'Disallow: /site-b/ blocks the stylesheets, scripts, fonts and social cards, and stops the noindex being read');
  for (const rule of RULES) {
    if (rule.type !== 'disallow') continue;
    assert.ok(!'/site-b/reading-system.css'.startsWith(rule.pattern.replace(/\*.*$/, '')) || rule.pattern.startsWith('/api'),
      `Disallow: ${rule.pattern} reaches the render path`);
  }
});

// ---------------------------------------------------------------------------
// 4. The sitemap stays clean-route-only
// ---------------------------------------------------------------------------
test('the sitemap lists the clean routes and nothing else', () => {
  const locs = [...SITEMAP.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const routes = new Set(PAGES.map((p) => ORIGIN + (p.route === '/' ? '/' : p.route)));
  assert.equal(locs.length, PAGES.length, `one entry per clean route (${locs.length} vs ${PAGES.length})`);
  assert.equal(new Set(locs).size, locs.length, 'no duplicate entries');
  for (const loc of locs) {
    assert.doesNotMatch(loc, /\/site-b\//, `${loc} exposes a raw path`);
    assert.doesNotMatch(loc, /\.html($|\?)/, `${loc} exposes a file rather than a route`);
    assert.ok(routes.has(loc), `${loc} is not one of the rewrite sources`);
  }
});

// ---------------------------------------------------------------------------
// 5. Canonical and duplicate protections intact
// ---------------------------------------------------------------------------
test('every page declares exactly one canonical, and it is that page’s clean route', () => {
  const seen = new Map();
  for (const p of PAGES) {
    const all = [...p.html.matchAll(/<link[^>]+rel="canonical"[^>]*>/g)];
    assert.equal(all.length, 1, `${p.file} has ${all.length} canonical tags`);
    const href = (all[0][0].match(/href="([^"]+)"/) || [])[1];
    const want = ORIGIN + (p.route === '/' ? '/' : p.route);
    assert.equal(href, want, `${p.file} points its canonical at ${href}`);
    assert.ok(!seen.has(href), `${href} is claimed by ${seen.get(href)} and ${p.file}`);
    seen.set(href, p.file);
  }
});

// ---------------------------------------------------------------------------
// 6. Crawler-style rendering keeps the document experience
// ---------------------------------------------------------------------------
test('nothing a page needs is refused, so a compliant crawler renders the real document', () => {
  const refused = [];
  for (const p of PAGES) {
    for (const url of subresourcesOf(p.html)) if (!crawlerMayFetch(url)) refused.push(`${p.route} -> ${url}`);
    for (const url of RUNTIME_JSON) if (!crawlerMayFetch(url)) refused.push(`${p.route} -> ${url}`);
  }
  assert.deepEqual(refused, [],
    'a refused stylesheet strips the page to Times New Roman and a refused chart bundle deletes every exhibit');
  // The two that carried the measured content loss, named explicitly.
  assert.ok(crawlerMayFetch('/site-b/site-b-charts.js'), 'the chart bundle injects the exhibit text');
  assert.ok(crawlerMayFetch('/site-b/reading-system.css'), 'the stylesheet is the document experience');
  // Share surface: every og:image must be fetchable by the preview crawlers,
  // which honour robots.txt before they honour the tag that named the file.
  for (const p of PAGES) {
    const og = (p.html.match(/property="og:image"\s+content="([^"]+)"/) || [])[1];
    assert.ok(og, `${p.file} declares no og:image`);
    assert.ok(crawlerMayFetch(og.replace(ORIGIN, '')), `${p.route} names a social card robots.txt refuses`);
  }
});
