/**
 * The font corpus sees every character the site can render
 *
 * Run: npm run test:font-corpus
 *
 * The shipped faces are subsets. That is only safe while the corpus derivation
 * can SEE every character the pages put on screen, and two notations hide a
 * character behind plain ASCII:
 *
 *   &check;             an HTML entity
 *   content: "\2713"    a CSS escape
 *
 * Both were invisible to the first version of this derivation. `&Sigma;` and
 * `&check;` were missing from the decode table and CSS escapes were not read at
 * all, so U+03A3 and U+2713 — 32 occurrences across the site — were cut from
 * the subsets and fell back to a system font. Nothing failed. The only symptom
 * was two <strong> elements on /framework-in-math measuring 1.47px narrower
 * than they had with the full fonts.
 *
 * What made it expensive is that `npm run audit:fonts` IMPORTS this derivation,
 * so it shared the blind spot exactly: a character the corpus cannot see is a
 * character the audit cannot miss. The proof could not fail.
 *
 * These tests are the second opinion the audit cannot be. They read the shipped
 * pages directly and insist the corpus accounts for what is in them.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { corpus, decodeEntities, decodeCssEscapes } from '../scripts/fonts-corpus.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const SITE_B = path.join(ROOT, 'public', 'site-b');
const read = (f) => fs.readFileSync(path.join(SITE_B, f), 'utf8');
const htmlFiles = fs.readdirSync(SITE_B).filter((f) => f.endsWith('.html'));
const cssFiles = fs.readdirSync(SITE_B).filter((f) => f.endsWith('.css'));
const cp = (ch) => ch.codePointAt(0);

test('every named entity in the shipped HTML decodes to a real character', () => {
  // The regression itself. With the original table this fails on &Sigma;,
  // &check; and &approx;.
  const unknown = new Map();
  for (const file of htmlFiles) {
    // Inline <script> is not markup: minified JS contains `&r;`-shaped text.
    const markup = read(file).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ');
    decodeEntities(markup, (ent) => { if (!unknown.has(ent)) unknown.set(ent, file); });
  }
  assert.deepEqual([...unknown.keys()], [],
    `undecodable entities would be cut from the subsets: ` +
    [...unknown].map(([e, f]) => `${e} (${f})`).join(', '));
});

test('and the characters those entities produce are in the corpus', () => {
  const have = new Set(corpus());
  const missing = [];
  for (const file of htmlFiles) {
    const markup = read(file).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ');
    for (const ch of decodeEntities(markup)) {
      const c = cp(ch);
      if (c >= 0x20 && !have.has(c)) missing.push(`U+${c.toString(16).toUpperCase()} ${ch} (${file})`);
    }
  }
  assert.deepEqual([...new Set(missing)], [], 'characters the pages render but the fonts would not carry');
});

test('CSS escapes are read, not skipped', () => {
  assert.equal(decodeCssEscapes('content: "\\2713"'), 'content: "✓"');
  assert.equal(decodeCssEscapes('content: "\\2192\\00a0"'), 'content: "→\u00a0"', 'consecutive escapes, and the space terminator');
  // A stylesheet really does deliver a glyph this way, so this is not theoretical.
  const anyEscape = cssFiles.some((f) => /content:\s*"[^"]*\\[0-9a-fA-F]{2,6}/.test(read(f)));
  assert.ok(anyEscape, 'the stylesheet still delivers at least one glyph as a CSS escape');
});

test('the derivation itself reads them, at both call sites', () => {
  // The function working proves nothing if corpus() never calls it. Proving the
  // wiring needs a character no other path supplies, or the entity table covers
  // for it: ✓ arrives as `&check;` too, which is exactly how an earlier
  // version of this test stayed green with CSS escapes switched off.
  const asterism = 0x2042;   // ⁂, via a stylesheet
  const reference = 0x203b;  // ※, via an inline <style> block
  assert.ok(!corpus().includes(asterism), 'precondition: nothing else on the site uses ⁂');
  assert.ok(!corpus().includes(reference), 'precondition: nothing else on the site uses ※');

  const css = path.join(SITE_B, '_font-corpus-probe.css');
  const html = path.join(SITE_B, '_font-corpus-probe.html');
  try {
    fs.writeFileSync(css, '.probe::before { content: "\\2042"; }');
    fs.writeFileSync(html, '<!doctype html><style>.p::after{content:"\\203B"}</style>');
    const have = new Set(corpus());
    assert.ok(have.has(asterism), 'a stylesheet escape reaches the corpus');
    assert.ok(have.has(reference), 'and so does one inside an inline <style> block');
  } finally {
    fs.rmSync(css, { force: true });
    fs.rmSync(html, { force: true });
  }
});

test('nothing the stylesheets render is left out', () => {
  const have = new Set(corpus());
  const missing = [];
  for (const file of cssFiles) {
    for (const ch of decodeCssEscapes(read(file))) {
      const c = cp(ch);
      if (c >= 0x20 && !have.has(c)) missing.push(`U+${c.toString(16).toUpperCase()} ${ch} (${file})`);
    }
  }
  assert.deepEqual([...new Set(missing)], [], 'characters the stylesheet renders but the fonts would not carry');
});

test('the two characters the blind spot actually cost are covered', () => {
  const have = new Set(corpus());
  assert.ok(have.has(0x03a3), 'U+03A3 Σ, from &Sigma; in the framework-in-math formulas');
  assert.ok(have.has(0x2713), 'U+2713 ✓, from &check; and from the footer read-marker escape');
});

test('an entity the table does not know stops the build instead of losing a glyph', () => {
  // End to end, against the real derivation: a page using an unknown entity must
  // throw. A silent omission here is the whole defect.
  const decoy = path.join(SITE_B, '_font-corpus-probe.html');
  try {
    fs.writeFileSync(decoy, '<!doctype html><p>&thereexists; &check;</p>');
    assert.throws(() => corpus(), (err) => {
      assert.match(err.message, /&thereexists;/, 'the error names the entity');
      assert.match(err.message, /_font-corpus-probe\.html/, 'and the file it is in');
      assert.match(err.message, /ENTITIES in scripts\/fonts-corpus\.mjs/, 'and how to fix it');
      return true;
    });
  } finally {
    fs.rmSync(decoy, { force: true });
  }
  assert.ok(corpus().length > 0, 'and the derivation is healthy again once it is gone');
});

test('the manifest is a claim about the bytes on disk, not a standalone file', () => {
  // audit:fonts owns coverage. This only pins the binding that makes its verdict
  // mean anything: a proof that cannot outlive the file it describes.
  const audit = fs.readFileSync(path.join(ROOT, 'scripts/audit-fonts.mjs'), 'utf8');
  assert.match(audit, /createHash\('sha256'\)/, 'the audit hashes each face');
  assert.match(audit, /sha !== entry\.sha256/, 'and refuses a manifest that does not describe them');
  assert.match(audit, /from '\.\/fonts-corpus\.mjs'/, 'and re-derives the corpus rather than trusting a stored copy');
});
