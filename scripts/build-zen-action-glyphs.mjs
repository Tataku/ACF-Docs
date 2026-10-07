#!/usr/bin/env node
/**
 * Draw the Part action bar's Zen glyphs that the Figma pack does not include:
 * play, stop, share-on-X and email.
 *
 * Run: node scripts/build-zen-action-glyphs.mjs   (writes public/site-b/icons/optimized/)
 *
 * WHY DRAWN HERE. The pack (149 exports, design/zen-source-manifest.json) has
 * no play, stop, mail or X mark, so the Listen button and two share links
 * carried 24-unit geometric line icons beside the pack's brush marks. These
 * four use the pack's own stroke construction, read off its exports
 * (share.svg, copy.svg, close.svg), so they belong to the same family:
 *
 *   - one tapered stroke per segment, on the 100-unit box;
 *   - end half-width 1.58;
 *   - ONE side bowed by a quadratic, on the +n side (n = (-t.y, t.x), t the
 *     direction of travel), the other side straight;
 *   - mid half-width on the bowed side = 2.7 + 0.015 * length. That fits the
 *     pack's own strokes: lengths 10 / 21 / 45 / 50 give 2.85 / 3.02 / 3.38 /
 *     3.45 against the pack's 2.86 / 3.00 / 3.38 / 3.45;
 *   - caps are 1.58-radius arcs with the pack's sweep flag (1);
 *   - rectangle edges overshoot their corners by 1.5, as copy.svg's do.
 *
 * SIZE. The geometric icons were 24-unit glyphs drawn at the box size; Zen
 * marks get the 1.15x optical bump (reading-system.css). So the coordinates
 * below are the geometric ones mapped b = 50 + (g - 12) * (100/24) / 1.15,
 * which keeps each glyph the exact size it had on screen.
 *
 * Deterministic: no randomness, so a rerun rewrites identical bytes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public', 'site-b', 'icons', 'optimized');

const H = 1.58;
const r2 = (v) => {
  const x = Math.round(v * 100) / 100;
  return Object.is(x, -0) ? '0' : String(x);
};
const g = (v) => 50 + ((v - 12) * (100 / 24)) / 1.15;   // geometric 24-box -> Zen box
const G = ([x, y]) => [g(x), g(y)];

/** One pack-style tapered stroke from a to b. */
function stroke(a, b) {
  const [ax, ay] = a; const [bx, by] = b;
  const len = Math.hypot(bx - ax, by - ay);
  const tx = (bx - ax) / len; const ty = (by - ay) / len;
  const nx = -ty; const ny = tx;
  const hm = 2.7 + 0.015 * len;
  const mx = (ax + bx) / 2; const my = (by + ay) / 2;
  const k = 2 * hm - H;                       // control offset that puts the bow's midpoint at hm
  const p = (x, y) => `${r2(x)} ${r2(y)}`;
  return `M ${p(ax + H * nx, ay + H * ny)} Q ${p(mx + k * nx, my + k * ny)} ${p(bx + H * nx, by + H * ny)} `
    + `A ${H} ${H} 0 0 1 ${p(bx - H * nx, by - H * ny)} Q ${p(mx - H * nx, my - H * ny)} ${p(ax - H * nx, ay - H * ny)} `
    + `A ${H} ${H} 0 0 1 ${p(ax + H * nx, ay + H * ny)} Z`;
}

/** A closed polyline's edges, each overshooting its corners by `over`. */
function edges(points, over = 0) {
  return points.map((a, i) => {
    const b = points[(i + 1) % points.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ux = ((b[0] - a[0]) / len) * over; const uy = ((b[1] - a[1]) / len) * over;
    return stroke([a[0] - ux, a[1] - uy], [b[0] + ux, b[1] + uy]);
  });
}

const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(G);

// Geometric originals (24 box): play M8 5.5 v13 l11 -6.5 z; stop rect 7..17;
// X M4 4 l16 16 M20 4 L4 20; mail rect 3,5 18x14 + chevron 4,7 12,13 20,7.
export const GLYPHS = {
  play: edges([[8, 5.5], [8, 18.5], [19, 12]].map(G)),
  stop: edges(rect(7, 7, 17, 17), 1.5),
  'share-x': [stroke(G([4, 4]), G([20, 20])), stroke(G([20, 4]), G([4, 20]))],
  mail: [
    ...edges(rect(3, 5, 21, 19), 1.5),
    stroke(G([4, 7]), G([12, 13])),
    stroke(G([12, 13]), G([20, 7])),
  ],
};

export function svg(paths) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="currentColor" aria-hidden="true" focusable="false">`
    + paths.map((d) => `<path d="${d}" fill-rule="evenodd"></path>`).join('')
    + '</svg>\n';
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const [name, paths] of Object.entries(GLYPHS)) {
    fs.writeFileSync(path.join(OUT, `${name}.svg`), svg(paths));
    console.log(`  ${name}.svg  ${paths.length} strokes`);
  }
}
