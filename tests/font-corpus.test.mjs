/**
 * The font corpus sees every character the site can render
 *
 * Run: npm run test:font-corpus
 *
 * The shipped faces are subsets. That is only safe while the corpus derivation
 * can SEE every character the pages put on screen, and three things can hide one
 * from it:
 *
 *   &check;             an HTML entity
 *   content: "\2713"    a CSS escape
 *   a nested directory  a file the scan never opens at all
 *
 * The first two were invisible to the first version of this derivation. `&Sigma;`
 * and `&check;` were missing from the decode table and CSS escapes were not read,
 * so U+03A3 and U+2713 — 32 occurrences across the site — were cut from the
 * subsets and fell back to a system font. Nothing failed. The only symptom was
 * two <strong> elements on /framework-in-math measuring 1.47px narrower than the
 * full fonts had drawn them.
 *
 * The third was found on review: the scan read only the top level of
 * public/site-b, while brand/ and vendor/ sit below it. It costs no glyph today,
 * which is precisely why it needed fixing — the contract was enforcing a promise
 * about files it had never opened.
 *
 * What made the first two expensive is that `npm run audit:fonts` IMPORTS the
 * derivation, so it shared the blind spot exactly: a character the corpus cannot
 * see is a character the audit cannot miss. The proof could not fail.
 *
 * These tests are the second opinion the audit cannot be. They walk the shipped
 * tree with their OWN discovery — deliberately not the derivation's, or they
 * would inherit the very blind spot they exist to catch — and insist the corpus
 * accounts for what is in it.
 *
 * The synthetic probes live in a nested directory rather than beside the pages.
 * Other suites enumerate the top level of public/site-b for *.html, and a probe
 * file there could appear in their listing while it exists.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { corpus, decodeEntities, decodeCssEscapes } from '../scripts/fonts-corpus.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const SITE_B = path.join(ROOT, 'public', 'site-b');
const PROBE = path.join(SITE_B, '_corpus-probe');

/** Independent discovery. Importing the derivation's would defeat the point. */
function walk(dir, prefix = '') {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...walk(path.join(dir, e.name), rel));
    else out.push(rel);
  }
  return out;
}
const shipped = (ext) => walk(SITE_B).filter((f) => f.endsWith(ext)).sort();
const read = (rel) => fs.readFileSync(path.join(SITE_B, rel), 'utf8');
const markupOf = (rel) => read(rel).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ');
const cp = (ch) => ch.codePointAt(0);
const u = (c) => `U+${c.toString(16).toUpperCase().padStart(4, '0')}`;

test('discovery reaches every level of the tree, not just the top', () => {
  const all = walk(SITE_B);
  const nested = all.filter((f) => f.includes('/') && /\.(html|css|js|json|mjs)$/.test(f));
  assert.ok(nested.length > 0,
    'precondition: public/site-b really does hold text files below the top level');
  // Extension, not location, is what keeps fonts/ and icons/ cheap to walk past.
  assert.ok(all.some((f) => f.endsWith('.woff2')), 'and binary files that must simply be ignored');
});

test('every named entity in the shipped HTML decodes to a real character', () => {
  // The original regression. With the first decode table this fails on &Sigma;,
  // &check; and &approx;.
  const unknown = new Map();
  for (const file of shipped('.html')) {
    decodeEntities(markupOf(file), (ent) => { if (!unknown.has(ent)) unknown.set(ent, file); });
  }
  assert.deepEqual([...unknown.keys()], [],
    'undecodable entities would be cut from the subsets: ' +
    [...unknown].map(([e, f]) => `${e} (${f})`).join(', '));
});

test('and every character the pages render is in the corpus', () => {
  const have = new Set(corpus());
  const missing = new Set();
  for (const file of shipped('.html')) {
    for (const ch of decodeEntities(markupOf(file))) {
      const c = cp(ch);
      if (c >= 0x20 && !have.has(c)) missing.add(`${u(c)} ${ch} (${file})`);
    }
  }
  assert.deepEqual([...missing], [], 'characters the pages render but the fonts would not carry');
});

test('nothing the stylesheets render is left out either', () => {
  const have = new Set(corpus());
  const missing = new Set();
  for (const file of shipped('.css')) {
    for (const ch of decodeCssEscapes(read(file))) {
      const c = cp(ch);
      if (c >= 0x20 && !have.has(c)) missing.add(`${u(c)} ${ch} (${file})`);
    }
  }
  assert.deepEqual([...missing], [], 'characters the stylesheet renders but the fonts would not carry');
});

test('CSS escapes decode correctly', () => {
  assert.equal(decodeCssEscapes('content: "\\2713"'), 'content: "✓"');
  assert.equal(decodeCssEscapes('content: "\\2192\\00a0"'), 'content: "→\u00a0"',
    'consecutive escapes, and the single-whitespace terminator');
  // A shipped stylesheet really does deliver a glyph this way.
  assert.ok(shipped('.css').some((f) => /content:\s*"[^"]*\\[0-9a-fA-F]{2,6}/.test(read(f))),
    'and the site still relies on it');
});

test('the derivation itself reads them — nested, and at both call sites', () => {
  // A working function proves nothing if corpus() never calls it, and a scan that
  // stops at the top level never opens the file at all. Each probe therefore
  // carries a character NO other path supplies: ✓ arrives via &check; too, which
  // is exactly how an earlier version of this test stayed green with CSS escape
  // decoding switched off.
  const viaCss = 0x2767;     // ❧, from a stylesheet two directories down
  const viaStyle = 0x203b;   // ※, from an inline <style> block, nested
  const before = new Set(corpus());
  assert.ok(!before.has(viaCss) && !before.has(viaStyle),
    'precondition: nothing on the site already supplies ❧ or ※');

  const deep = path.join(PROBE, 'deeper');
  try {
    fs.mkdirSync(deep, { recursive: true });
    fs.writeFileSync(path.join(deep, 'probe.css'), '.p::before{content:"\\2767"}');
    fs.writeFileSync(path.join(deep, 'probe.html'), '<!doctype html><style>.p::after{content:"\\203B"}</style>');
    const have = new Set(corpus());
    assert.ok(have.has(viaCss), 'a stylesheet escape below the top level reaches the corpus');
    assert.ok(have.has(viaStyle), 'and so does one inside a nested inline <style> block');
  } finally {
    fs.rmSync(PROBE, { recursive: true, force: true });
  }
  assert.ok(!new Set(corpus()).has(viaCss), 'and the probe left nothing behind');
});

test('the two characters the blind spot actually cost are covered', () => {
  const have = new Set(corpus());
  assert.ok(have.has(0x03a3), 'U+03A3 Σ, from &Sigma; in the framework-in-math formulas');
  assert.ok(have.has(0x2713), 'U+2713 ✓, from &check; and from the footer read-marker escape');
});

test('an unknown entity stops the build and names the file it is in, path and all', () => {
  // End to end against the real derivation. A silent omission here is the defect.
  const deep = path.join(PROBE, 'deeper');
  try {
    fs.mkdirSync(deep, { recursive: true });
    fs.writeFileSync(path.join(deep, 'probe.html'), '<!doctype html><p>&thereexists; &check;</p>');
    assert.throws(() => corpus(), (err) => {
      assert.match(err.message, /&thereexists;/, 'the error names the entity');
      assert.match(err.message, /_corpus-probe\/deeper\/probe\.html/,
        'and its path relative to site-b, so a nested file is findable');
      assert.match(err.message, /ENTITIES in scripts\/fonts-corpus\.mjs/, 'and how to fix it');
      return true;
    });
  } finally {
    fs.rmSync(PROBE, { recursive: true, force: true });
  }
  assert.ok(corpus().length > 0, 'and the derivation is healthy again once it is gone');
});

test('the manifest is a claim about the bytes on disk, not a standalone file', () => {
  // audit:fonts owns coverage. This pins the binding that makes its verdict mean
  // anything: a proof that cannot outlive the file it describes.
  const audit = fs.readFileSync(path.join(ROOT, 'scripts/audit-fonts.mjs'), 'utf8');
  assert.match(audit, /createHash\('sha256'\)/, 'the audit hashes each face');
  assert.match(audit, /sha !== entry\.sha256/, 'and refuses a manifest that does not describe them');
  assert.match(audit, /from '\.\/fonts-corpus\.mjs'/, 'and re-derives the corpus rather than trusting a stored copy');
});
