#!/usr/bin/env node
/**
 * The shipped font subsets still cover everything the site can render.
 *
 * Run: npm run audit:fonts
 *
 * The faces under public/site-b/fonts are subsets, cut to the characters this
 * site actually puts on screen. That is only safe if it stays true, and it
 * stops being true the moment somebody writes a character the subset lacks —
 * which in a browser looks like nothing at all, because the glyph quietly
 * arrives from a system font in the wrong shape.
 *
 * So the corpus is re-derived here from the current content and checked against
 * what the subsets actually contain. Node only: no fontTools, no Python. The
 * coverage comes from the manifest the subsetter wrote, and the manifest is
 * bound to the files by hash, so it cannot drift from them.
 *
 * A character is acceptable in one of two ways:
 *   it is covered by the subset; or
 *   the ORIGINAL face never had it either, in which case it falls back to a
 *   system font exactly as it did before subsetting and nothing changed.
 *
 * Anything else fails, and the fix is `npm run build:fonts`.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { corpus } from './fonts-corpus.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const FONT_DIR = path.join(ROOT, 'public', 'site-b', 'fonts');
const MANIFEST = path.join(FONT_DIR, 'subset-manifest.json');

const fail = (msg) => { console.error('Font audit failed:\n  ' + msg); process.exit(1); };

if (!fs.existsSync(MANIFEST)) {
  fail('No subset-manifest.json. Run `npm run build:fonts` to produce the subsets and their proof.');
}
const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const want = corpus();
const covered = (ranges, cp) => ranges.some(([a, b]) => cp >= a && cp <= b);

const problems = [];
const shipped = fs.readdirSync(FONT_DIR).filter((f) => f.endsWith('.woff2')).sort();
const listed = Object.keys(manifest.fonts || {}).sort();

if (shipped.join() !== listed.join()) {
  fail(`the manifest describes [${listed.join(', ')}] but the directory ships [${shipped.join(', ')}]`);
}

for (const [file, entry] of Object.entries(manifest.fonts)) {
  const full = path.join(FONT_DIR, file);
  if (!fs.existsSync(full)) { problems.push(`${file} is in the manifest but not on disk`); continue; }

  // The manifest is a claim about THESE bytes. Bind the two, or the coverage
  // proof could outlive the file it describes.
  const sha = crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex');
  if (sha !== entry.sha256) {
    problems.push(`${file} does not match its manifest entry (the file changed without a rebuild). ` +
      `Run \`npm run build:fonts\`.`);
    continue;
  }
  if (fs.statSync(full).size !== entry.bytes) {
    problems.push(`${file} is ${fs.statSync(full).size} bytes, manifest says ${entry.bytes}`);
  }

  const absent = new Set(entry.absentFromSource || []);
  const missing = want.filter((cp) => !covered(entry.covers || [], cp) && !absent.has(cp));
  if (missing.length) {
    problems.push(`${file} cannot draw ${missing.length} character(s) the site can render: ` +
      missing.slice(0, 12).map((c) => `U+${c.toString(16).toUpperCase().padStart(4, '0')} ${String.fromCodePoint(c)}`).join('  ') +
      (missing.length > 12 ? ' ...' : '') +
      '\n    Run `npm run build:fonts` to re-cut the subsets against the current content.');
  }
}

if (problems.length) fail(problems.join('\n  '));

const bytes = Object.values(manifest.fonts).reduce((a, f) => a + f.bytes, 0);
console.log(`Font audit passed: ${listed.length} subsets, ${bytes} bytes, covering all ${want.length} characters the site can render.`);
