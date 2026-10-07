#!/usr/bin/env node
/**
 * Snapshot the ACF Dashboard's LIVE brush marks for the docs controls that
 * have an exact dashboard counterpart: the theme toggle's sun and moon, the
 * mobile menu button, and the footer's "copied" check.
 *
 * Run: node scripts/snapshot-dashboard-brush-glyphs.mjs <path-to-ACFDashboard-checkout>
 *
 * WHY A SNAPSHOT, NOT A DEPENDENCY. design/icon-vocabulary.json records the
 * decision that the two repos keep separate representations and share no
 * runtime source. So this reads the dashboard's engine once, at a recorded
 * commit, and writes static SVG with the same paths, seeds and filter the
 * dashboard renders. Nothing here imports the dashboard at build or run time.
 * Re-run it against a newer checkout to refresh; the provenance file names the
 * commit each asset came from.
 *
 *   light-mode, dark-mode, open-navigation
 *       src/ui/config/railIcons.js glyph -> BrushGlyph's engine,
 *       buildBrushGlyphPaths(`rail:<key>`, glyph, hashSeed(`rail:<key>`)),
 *       100-unit box, BRUSH_ICON_FILTER. Exactly what GlobalRail /
 *       MobileRailControlsSheet draw.
 *   check
 *       BrushGlyphIcon type="check": BrushMarker buildBrushGlyphPaths('check',
 *       hashSeed('brush-glyph-check')), the ±9 box, V3_FILTER. The app-wide
 *       check mark.
 *
 * Each filter id is fixed per asset (`acf-brush-<name>`) because every page
 * inlines each mark at most once; the dashboard's rule against sharing one
 * filter through <use> is kept, since each copy carries its own <filter>.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public', 'site-b', 'icons', 'optimized');
const PROV = path.join(ROOT, 'design', 'dashboard-brush-snapshot.json');

const dash = process.argv[2];
if (!dash) {
  console.error('usage: node scripts/snapshot-dashboard-brush-glyphs.mjs <path-to-ACFDashboard-checkout>');
  process.exit(1);
}
const imp = (rel) => import(pathToFileURL(path.join(dash, rel)).href);
const commit = execFileSync('git', ['-C', dash, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

const glyphT = await imp('src/features/shared/ui/BrushIcon/brushGlyphTranslate.js');
const icon = await imp('src/features/shared/ui/BrushIcon/brushIconPaths.js');
const marker = await imp('src/features/shared/ui/BrushMarker/brushPaths.js');
const { RAIL_ICONS } = await imp('src/ui/config/railIcons.js');

const filter = (id, f, seed, region) => `<defs><filter id="${id}" ${region} color-interpolation-filters="sRGB">`
  + `<feTurbulence type="fractalNoise" baseFrequency="${f.baseFrequency}" numOctaves="${f.numOctaves}" seed="${seed}" result="n"></feTurbulence>`
  + `<feDisplacementMap in="SourceGraphic" in2="n" scale="${f.displacementScale}" xChannelSelector="R" yChannelSelector="G"></feDisplacementMap>`
  + '</filter></defs>';
const svg = (viewBox, defs, id, paths) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="currentColor" fill-rule="evenodd" aria-hidden="true" focusable="false">`
  + `${defs}<g filter="url(#${id})">${paths.map((d) => `<path d="${d}"></path>`).join('')}</g></svg>\n`;

const assets = {};
for (const key of ['light-mode', 'dark-mode', 'open-navigation']) {
  const name = `rail:${key}`;
  const seed = icon.hashSeed(name);
  const paths = glyphT.buildBrushGlyphPaths(name, RAIL_ICONS[key], seed);
  const id = `acf-brush-${key}`;
  const box = icon.BRUSH_ICON_VIEWBOX.size;
  assets[key] = { file: `${key}.svg`, source: `railIcons.js '${key}' via BrushGlyph (name '${name}')`, seed: (seed | 0) >>> 0,
    body: svg(`0 0 ${box} ${box}`, filter(id, icon.BRUSH_ICON_FILTER, (seed | 0) >>> 0, 'x="-25%" y="-25%" width="150%" height="150%"'), id, paths) };
}
{
  const seed = marker.hashSeed('brush-glyph-check');
  const paths = marker.buildBrushGlyphPaths('check', seed);
  const { halfW, halfH } = marker.BRUSH_GLYPH_VIEWBOX;
  const id = 'acf-brush-check';
  assets.check = { file: 'check.svg', source: "BrushGlyphIcon type='check' (seed 'brush-glyph-check')", seed: (seed | 0) >>> 0,
    body: svg(`-${halfW} -${halfH} ${halfW * 2} ${halfH * 2}`, filter(id, marker.V3_FILTER, (seed | 0) >>> 0, 'x="-20%" y="-20%" width="140%" height="140%"'), id, paths) };
}

for (const a of Object.values(assets)) fs.writeFileSync(path.join(OUT, a.file), a.body);
fs.writeFileSync(PROV, `${JSON.stringify({
  note: 'Static snapshots of the ACF Dashboard brush engine. Written by scripts/snapshot-dashboard-brush-glyphs.mjs; refresh by re-running it against a newer dashboard checkout.',
  dashboardCommit: commit,
  assets: Object.fromEntries(Object.entries(assets).map(([k, a]) => [k, { file: a.file, source: a.source, seed: a.seed }])),
}, null, 2)}\n`);
console.log(`dashboard ${commit.slice(0, 12)}: ${Object.values(assets).map((a) => a.file).join(', ')}`);
