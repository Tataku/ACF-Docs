/* ───────────────────────────────────────────────────────────────────────────
 * ACF Framework Charts — brush rendering primitives
 *
 * Ported from the locked "ACF Bespoke Chart System" handoff (ACFBrush) plus the
 * bespoke pressureField() from the Part 1 Spec Lock. Everything here is pure and
 * deterministic per `seed`, so server and client renders are byte-identical (no
 * hydration drift) and re-renders are stable.
 *
 * Doctrine: a precise {x,y,w} centerline ("skeleton") is offset perpendicularly
 * into a filled polygon, then lightly Catmull-Rom smoothed so the EDGE breathes
 * like an ink stroke. The CENTERLINE always passes through exact coordinates —
 * the brush effect is a rendering layer of sub-unit tolerance, never a
 * distortion of the data. All geometry is in the chart's user-space (viewBox).
 * ─────────────────────────────────────────────────────────────────────────── */

const f = (n) => (Math.round(n * 1000) / 1000).toString();
const lerp = (a, b, t) => a + (b - a) * t;

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Catmull-Rom through a CLOSED loop of points → cubic bézier `d`.
export function closedBezier(pts) {
  const n = pts.length;
  if (n < 3) return '';
  let d = `M${f(pts[0].x)} ${f(pts[0].y)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i];
    const p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(p2.x)} ${f(p2.y)}`;
  }
  return d + ' Z';
}

// Catmull-Rom through an OPEN run of points → cubic bézier `d` (for wash edges).
export function smoothOpen(pts) {
  const n = pts.length;
  if (n < 3) return 'M' + pts.map((p) => `${f(p.x)} ${f(p.y)}`).join(' L');
  let d = `M${f(pts[0].x)} ${f(pts[0].y)}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i];
    const p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(p2.x)} ${f(p2.y)}`;
  }
  return d;
}

// Offset a {x,y,w} skeleton into a filled brush outline. The centerline stays
// exact (data-faithful); only the OUTLINE wobbles ("organic 5%").
export function strokeToPath(skel, { seed = 1, jitter = 0.06, edge = 0 } = {}) {
  const rng = mulberry32(seed);
  const upper = [], lower = [];
  for (let i = 0; i < skel.length; i++) {
    const p = skel[i];
    const prev = skel[Math.max(0, i - 1)];
    const next = skel[Math.min(skel.length - 1, i + 1)];
    const dx = next.x - prev.x, dy = next.y - prev.y;
    const L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L;
    const j = (rng() - 0.5) * jitter;
    const w = Math.max(0.02, p.w + j);
    const eU = edge ? (rng() - 0.5) * edge : 0;
    const eL = edge ? (rng() - 0.5) * edge : 0;
    upper.push({ x: p.x + nx * (w + eU), y: p.y + ny * (w + eU) });
    lower.push({ x: p.x - nx * (w + eL), y: p.y - ny * (w + eL) });
  }
  return closedBezier([...upper, ...lower.reverse()]);
}

// Resample a polyline at ~step arc-length spacing. Linear interpolation only,
// so every emitted point lies EXACTLY on the original segments (no curve drift).
export function resamplePolyline(pts, step) {
  const seg = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    seg.push(d); total += d;
  }
  const out = [{ x: pts[0].x, y: pts[0].y, s: 0 }];
  let acc = 0, idx = 0;
  for (let target = step; target < total; target += step) {
    while (idx < seg.length && acc + seg[idx] < target) { acc += seg[idx]; idx++; }
    if (idx >= seg.length) break;
    const segLen = seg[idx] || 1;
    const t = (target - acc) / segLen;
    const a = pts[idx], b = pts[idx + 1];
    out.push({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), s: target });
  }
  out.push({ x: pts[pts.length - 1].x, y: pts[pts.length - 1].y, s: total });
  return { pts: out, total };
}

/* ── Data line ──────────────────────────────────────────────────────────────
 * centerPts: precise {x,y} in chart space (already scaled). Returns a filled
 * brush polygon. Endpoints taper; weight breathes; intensity scales the organic
 * edge wobble + width jitter. */
export function brushLine(centerPts, opts = {}) {
  const { seed = 1, weight = 1.25, intensity = 0.6, taper = 0.05, modulate = 0.32, step = 4.5 } = opts;
  const { pts, total } = resamplePolyline(centerPts, step);
  const rng = mulberry32(seed + 99);
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const t = total ? pts[i].s / total : 0;
    const cap = Math.min(t / taper, (1 - t) / taper, 1);
    const capFactor = Math.max(0.18, cap);
    const mod = 1
      + modulate * 0.55 * Math.sin(t * Math.PI * 5 + seed)
      + modulate * 0.30 * Math.sin(t * Math.PI * 12 + seed * 2);
    const j = (rng() - 0.5) * 0.18 * intensity;
    pts[i].w = Math.max(0.06, weight * capFactor * mod + j);
  }
  return strokeToPath(pts, { seed: seed + 3, jitter: 0.05 * intensity, edge: 0.5 * intensity });
}

/* ── Enso — circle with a gap, for inflection / breakout marks ─────────────── */
export function enso(cx, cy, r, opts = {}) {
  const { seed = 1, weight = 1.1, intensity = 0.6, gap = 0.16, gapAngle = -Math.PI / 4 } = opts;
  const rng = mulberry32(seed + 9);
  const gapWidth = Math.PI * 2 * gap;
  const a0 = gapAngle + gapWidth / 2;
  const sweep = Math.PI * 2 - gapWidth;
  const phase = rng() * 6.28;
  const skel = [];
  const N = 72;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const a = a0 + sweep * t;
    const rr = r + Math.sin(t * Math.PI * 2 + phase) * r * 0.02 + Math.sin(t * Math.PI * 5) * r * 0.01;
    const w = weight * (0.45 + Math.sin(t * Math.PI) * 0.7 - t * 0.18);
    skel.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr, w: Math.max(0.08, w) });
  }
  return strokeToPath(skel, { seed: seed + 4, jitter: 0.05 * intensity, edge: 0.45 * intensity });
}

/* ── Ink dot — small irregular filled blob, for pivots ─────────────────────── */
export function inkDot(cx, cy, r, opts = {}) {
  const { seed = 1, intensity = 0.6 } = opts;
  const rng = mulberry32(seed + 21);
  const N = 18;
  const pts = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const rr = r * (1 + (rng() - 0.5) * 0.22 * (0.5 + intensity));
    pts.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr });
  }
  return closedBezier(pts);
}

/* ── Straight brush segment (level / threshold lines, underlines) ──────────── */
export function brushSegment(x1, y1, x2, y2, opts = {}) {
  const { seed = 1, weight = 0.8, intensity = 0.6, taperEnds = true, waver = 0.4 } = opts;
  const N = Math.max(8, Math.round(Math.hypot(x2 - x1, y2 - y1) / 6));
  const skel = [];
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const cap = taperEnds ? Math.max(0.22, Math.min(t / 0.08, (1 - t) / 0.08, 1)) : 1;
    const wv = (Math.sin(t * Math.PI * 3 + seed) * 0.5 + Math.sin(t * Math.PI * 7) * 0.3) * waver * intensity;
    const w = weight * cap * (1 + 0.25 * Math.sin(t * Math.PI * 4 + seed));
    skel.push({ x: lerp(x1, x2, t) + nx * wv, y: lerp(y1, y2, t) + ny * wv, w: Math.max(0.05, w) });
  }
  return strokeToPath(skel, { seed: seed + 5, jitter: 0.04 * intensity, edge: 0.35 * intensity });
}

/* ── pressureField — bespoke inflation-shock background ─────────────────────
 * The shock window is NEVER a rectangle. This produces:
 *   plume   — closed Catmull-Rom path used as the soft fill (feathered edges)
 *   grains  — small ink stipples, density follows the pressure curve
 *   peakX   — exact x where pressure peaks (label anchor)
 * Edges are deliberately uneven; the top sags, the bottom rises; asymmetry skews
 * toward the leading shoulder so the wave reads as "pressure entering the system."
 * Implemented once, reused by every shock-window exhibit. */
export function pressureField(xc, yTop, yBot, halfSpan, opts = {}) {
  const { seed = 1, intensity = 0.7, asymmetric = 0.18 } = opts;
  const rng = mulberry32(seed);
  const ymid = (yTop + yBot) / 2;
  const halfH = (yBot - yTop) / 2;
  const N = 56;
  const top = [];
  const bot = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = xc - halfSpan + 2 * halfSpan * t;
    const center = 0.5 + asymmetric;
    const sigma = 0.30 + (rng() - 0.5) * 0.02;
    const u = (t - center) / sigma;
    const pressure = Math.exp(-u * u);                 // 0..1 across the field
    const baseY = halfH * (0.55 + 0.35 * pressure);    // wider in the middle, never collapses outside
    const wobbleT = (rng() - 0.5) * (4 + 8 * pressure) * intensity;
    const wobbleB = (rng() - 0.5) * (4 + 8 * pressure) * intensity;
    top.push({ x, y: ymid - baseY + wobbleT });
    bot.push({ x, y: ymid + baseY + wobbleB });
  }
  const loop = [...top, ...bot.reverse()];
  const plume = closedBezier(loop);

  const grains = [];
  const target = Math.round(120 * intensity);
  let placed = 0;
  let safety = 0;
  while (placed < target && safety++ < target * 8) {
    const t = rng();
    const center = 0.5 + asymmetric;
    const sigma = 0.32;
    const u = (t - center) / sigma;
    const pressure = Math.exp(-u * u);
    if (rng() > pressure * 0.95) continue;
    const x = xc - halfSpan + 2 * halfSpan * t;
    const yJitter = (rng() - 0.5) * (yBot - yTop) * (0.32 + 0.32 * pressure);
    const y = ymid + yJitter;
    const r = 0.55 + rng() * (0.8 + 0.6 * pressure);
    grains.push({ x, y, r, op: 0.06 + 0.10 * pressure });
    placed++;
  }
  return { plume, grains, peakX: xc + 2 * halfSpan * asymmetric };
}

/* ── Ink-wash region — soft rect with organically displaced edges ──────────── *
 * For NON-shock contextual bands (compression windows, calm regime fields).
 * Top/bottom edges waver gently; left/right are straight. Render at low opacity.
 * The inflation-shock window must use pressureField, never this. */
export function washRect(x0, y0, x1, y1, opts = {}) {
  const { seed = 1, intensity = 0.6, soft = 'both' } = opts;
  const rng = mulberry32(seed + 41);
  const N = 14;
  const ampT = (soft === 'both' || soft === 'top') ? (y1 - y0) * 0.02 + 2 * intensity : 0;
  const ampB = (soft === 'both' || soft === 'bottom') ? (y1 - y0) * 0.02 + 2 * intensity : 0;
  const top = [], bot = [];
  for (let i = 0; i <= N; i++) { const t = i / N; top.push({ x: lerp(x0, x1, t), y: y0 + (ampT ? (rng() - 0.5) * ampT * 2 : 0) }); }
  for (let i = 0; i <= N; i++) { const t = i / N; bot.push({ x: lerp(x1, x0, t), y: y1 + (ampB ? (rng() - 0.5) * ampB * 2 : 0) }); }
  return closedBezier([...top, ...bot]);
}

/* ── Brush arrow — chevron + stem, tip at (tx,ty), pointing `dir` ──────────── *
 * dir in radians (0 = +x / right). Used for the governed-loop connectors. */
export function brushArrow(tx, ty, len, dir, opts = {}) {
  const { seed = 1, weight = 0.85, intensity = 0.6, head = 0.34 } = opts;
  const ux = Math.cos(dir), uy = Math.sin(dir);
  const bx = tx - ux * len, by = ty - uy * len;
  const headLen = len * head;
  const px = -uy, py = ux;
  const N = 16, skel = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    skel.push({ x: lerp(bx, tx, t), y: lerp(by, ty, t), w: weight * (0.45 + t * 0.5) });
  }
  const stem = strokeToPath(skel, { seed: seed + 6, jitter: 0.04 * intensity, edge: 0.3 * intensity });
  const footL = brushSegment(tx, ty, tx - ux * headLen + px * headLen * 0.7, ty - uy * headLen + py * headLen * 0.7, { seed: seed + 12, weight: weight * 1.05, intensity, waver: 0.15 });
  const footR = brushSegment(tx, ty, tx - ux * headLen - px * headLen * 0.7, ty - uy * headLen - py * headLen * 0.7, { seed: seed + 18, weight: weight * 1.05, intensity, waver: 0.15 });
  return stem + footL + footR;
}

/* ── dcaWindow — organic "accumulation window" field (NOT a rectangle) ───────
 * A soft vertical field that is full-height at x0 and pinches/dissolves toward
 * x1, with ink stipples ("sats") biased toward x0. Marks a valuation window
 * where accumulation is richest, fading as price rises to fair value. Distinct
 * from pressureField (which is reserved, stress-coloured, for the shock). */
export function dcaWindow(x0, x1, yTop, yBot, opts = {}) {
  const { seed = 1, intensity = 0.7, grainCount = 24 } = opts;
  const rng = mulberry32(seed + 17);
  const H = yBot - yTop, N = 20;
  const top = [], bot = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, x = lerp(x0, x1, t);
    const fade = t < 0.5 ? 0 : (t - 0.5) / 0.5;          // right half pinches closed
    const inset = fade * fade * H * 0.5;
    top.push({ x, y: yTop + inset + (rng() - 0.5) * 3.4 * intensity });
    bot.push({ x, y: yBot - inset + (rng() - 0.5) * 3.4 * intensity });
  }
  const wash = closedBezier([...top, ...bot.reverse()]);
  const grains = [];
  let placed = 0, safety = 0;
  while (placed < grainCount && safety++ < grainCount * 8) {
    const t = Math.pow(rng(), 1.7);                       // bias toward x0 (cheapest)
    const fade = t < 0.5 ? 0 : (t - 0.5) / 0.5;
    const inset = fade * fade * H * 0.5;
    const x = lerp(x0, x1, t);
    const y = yTop + inset + rng() * Math.max(2, H - 2 * inset);
    grains.push({ x, y, r: 0.55 + rng() * 0.95, op: (0.12 + 0.30 * (1 - t)) * intensity });
    placed++;
  }
  return { wash, grains };
}

export default {
  mulberry32, closedBezier, smoothOpen, strokeToPath, resamplePolyline,
  brushLine, enso, inkDot, brushSegment, pressureField, washRect, brushArrow, dcaWindow,
};
