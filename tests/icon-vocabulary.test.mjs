/**
 * The Zen icon vocabulary cannot drift silently.
 *
 * WHAT THIS GUARDS, AND WHAT IT DELIBERATELY DOES NOT. There are two production
 * representations of one design vocabulary — the sanitized static SVGs in this
 * repo, and the dashboard's procedurally generated `BrushIcon` geometry — and
 * they are NOT the same bytes by design. The dashboard redraws its marks through
 * a brush engine; this repo inlines Figma-derived vector. So a hash or geometry
 * equality test between them would be asserting something nobody intends, and
 * would fail on the first legitimate change to either side.
 *
 * What CAN drift silently is SEMANTICS: a mark losing its asset, two marks
 * claiming one name, an integrated icon being quietly swapped back to a local
 * geometric SVG, or a shipped asset nothing references. Those are what this
 * checks.
 *
 * It also pins the things a reader would otherwise have to re-derive: that the
 * raw Figma export is gone on purpose and recoverable from Git, and that every
 * optimized asset is actually inlined in a page rather than sitting unused.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const VOCAB = JSON.parse(fs.readFileSync(path.join(ROOT, 'design/icon-vocabulary.json'), 'utf8'));
const OPT = path.join(ROOT, 'public/site-b/icons/optimized');
const PAGES = fs.readdirSync(path.join(ROOT, 'public/site-b'))
  .filter((f) => f.endsWith('.html'))
  .map((f) => ({ name: f, body: fs.readFileSync(path.join(ROOT, 'public/site-b', f), 'utf8') }));

test('every mark in the contract has the production asset it names', () => {
  for (const m of VOCAB.marks) {
    assert.ok(fs.existsSync(path.join(OPT, m.docsAsset)),
      `${m.semantic}: ${m.docsAsset} is named in the contract but not present`);
  }
});

test('every shipped asset is registered — no unregistered icon in production', () => {
  const shipped = fs.readdirSync(OPT).filter((f) => f.endsWith('.svg'));
  const named = new Set(VOCAB.marks.map((m) => m.docsAsset));
  const orphans = shipped.filter((f) => !named.has(f));
  assert.deepEqual(orphans, [],
    'a production asset with no entry in design/icon-vocabulary.json — add it with its usage');
});

test('semantic names are unique', () => {
  const names = VOCAB.marks.map((m) => m.semantic);
  assert.equal(new Set(names).size, names.length, 'two marks claim the same semantic name');
});

test('every registered asset is actually inlined in a shipped page', () => {
  // An asset nobody inlines is either a rollout that was reverted without
  // cleaning up, or a file added in anticipation. Both read as "this is in use".
  const unused = [];
  for (const m of VOCAB.marks) {
    const svg = fs.readFileSync(path.join(OPT, m.docsAsset), 'utf8');
    // Match on the glyph's first path, which survives inlining unchanged.
    const firstPath = (svg.match(/<path d="([^"]{40,})"/) || [])[1];
    assert.ok(firstPath, `${m.docsAsset}: no path to fingerprint`);
    if (!PAGES.some((p) => p.body.includes(firstPath))) unused.push(m.semantic);
  }
  assert.deepEqual(unused, [],
    'registered but inlined nowhere — remove the asset or record why it is staged');
});

test('an integrated control has not been swapped back to a local geometric SVG', () => {
  // The regression this exists for: someone edits a page, loses the inlined Zen
  // markup, and drops a 24-viewBox glyph back into the control. The page still
  // renders, nothing errors, and the family quietly splits.
  const CONTROLS = [
    ['icon-collapse', 9], ['icon-expand', 9], ['fn-icon', 18],
  ];
  for (const [cls, expected] of CONTROLS) {
    let zen = 0; let geometric = 0;
    for (const p of PAGES) {
      for (const tag of p.body.match(new RegExp(`<svg[^>]*class="[^"]*\\b${cls}\\b[^"]*"[^>]*>`, 'g')) || []) {
        if (tag.includes('0 0 100 100')) zen++; else geometric++;
      }
    }
    assert.equal(geometric, 0, `${cls}: ${geometric} site(s) reverted to geometric`);
    assert.equal(zen, expected,
      `${cls}: ${zen} Zen sites, expected ${expected} — update this count in the same slice `
      + 'if a page legitimately gained or lost the control');
  }
});

test('the raw Figma export stays out of the tree, and stays recoverable', () => {
  assert.ok(!fs.existsSync(path.join(ROOT, 'design/zen-icons-source')),
    'the raw export is back in the working tree — it is preserved in Git, not here');
  const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'design/zen-source-manifest.json'), 'utf8'));
  assert.equal(man.files, 149, 'the manifest no longer describes the export it stands in for');
  assert.match(man.commit, /^[0-9a-f]{40}$/, 'the provenance commit must be a full sha');
  assert.ok(VOCAB.provenance.retrieve.includes(man.commit.slice(0, 12)),
    'the contract and the manifest disagree about where the export lives');
});

test('the shared cross-repo vocabulary is declared, and it is the small set', () => {
  // Three names, not twenty-five. The dashboard draws 25 marks and this repo
  // ships 6; only these three are the same mark in both, and that is the entire
  // surface where a cross-repo rename could mean two different things.
  const shared = VOCAB.marks.filter((m) => m.shared).map((m) => m.semantic).sort();
  assert.deepEqual(shared, ['collapse-sidebar', 'expand-sidebar', 'framework-docs']);
  for (const m of VOCAB.marks) {
    if (m.shared) assert.equal(m.dashboardMark, m.semantic,
      `${m.semantic}: a shared mark whose dashboard name differs needs that recorded, not implied`);
    else assert.equal(m.dashboardMark, null, `${m.semantic}: not shared, so dashboardMark must be null`);
  }
});
