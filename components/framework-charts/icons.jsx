/* ACF Framework Charts — brush-stroke UI icons.
 *
 * Small controls (pinned-tooltip close, disclosure carets, mobile steppers) use
 * the SAME ink language as the in-chart glyphs (scoreCheckPath / scoreFailPath in
 * FrameworkChart): two tapered brush strokes, not a generic icon font, Unicode
 * glyph, or SaaS bordered control. One <path> in a 16×16 box; colour is
 * `currentColor`, so theme + hover/focus on the parent button drive it. Each icon
 * is aria-hidden — the control's own aria-label carries the accessible name.
 */
import React from 'react';
import * as Brush from './brush';

function Glyph({ size, d, rotate = 0 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" focusable="false"
      style={{ display: 'block', overflow: 'visible', transform: rotate ? `rotate(${rotate}deg)` : undefined }}>
      <path d={d} fill="currentColor" />
    </svg>
  );
}

// Brush ✕ — close / unpin. Mirrors scoreFailPath.
export function BrushX({ size = 12, seed = 12 }) {
  const c = 8, k = 5;
  const d = Brush.brushSegment(c - k, c - k, c + k, c + k, { seed, weight: 0.85, intensity: 0.4, taperEnds: true, waver: 0.06 })
    + Brush.brushSegment(c - k, c + k, c + k, c - k, { seed: seed + 4, weight: 0.85, intensity: 0.4, taperEnds: true, waver: 0.06 });
  return <Glyph size={size} d={d} />;
}

// Brush ✓ — confirmation (e.g. "copied"). Mirrors scoreCheckPath.
export function BrushCheck({ size = 12, seed = 5 }) {
  const c = 8, r = 5;
  const d = Brush.brushSegment(c - r, c + 0.5, c - r * 0.3, c + r - 1, { seed, weight: 0.85, intensity: 0.4, taperEnds: true, waver: 0.08 })
    + Brush.brushSegment(c - r * 0.3, c + r - 1, c + r + 1, c - r, { seed: seed + 4, weight: 0.85, intensity: 0.4, taperEnds: true, waver: 0.08 });
  return <Glyph size={size} d={d} />;
}

// Brush chevron — points RIGHT by default (a brush '›'). `dir` rotates it:
// right (default) · down (disclosure-open) · left (prev) · up. Disclosure
// toggles that already rotate their wrapper keep dir="right" and rotate the span.
export function BrushChevron({ size = 12, dir = 'right', seed = 7 }) {
  const c = 8, k = 3.4;
  const d = Brush.brushSegment(c - k, c - k - 0.4, c + k, c, { seed, weight: 0.8, intensity: 0.4, taperEnds: true, waver: 0.05 })
    + Brush.brushSegment(c + k, c, c - k, c + k + 0.4, { seed: seed + 4, weight: 0.8, intensity: 0.4, taperEnds: true, waver: 0.05 });
  const rotate = dir === 'down' ? 90 : dir === 'left' ? 180 : dir === 'up' ? -90 : 0;
  return <Glyph size={size} d={d} rotate={rotate} />;
}

// Brush frame — a subtle hand-inked rectangle for an INTERACTIVE FOCUS surface
// (the pinned tooltip). Four tapered brush edges, slightly varied per side, drawn
// just inside the card's rounded corners. Sized in px (the card measures itself),
// pointer-events none, theme colour via `color`. Marks focus — not decoration.
export function BrushFrame({ w, h, color, opacity = 0.7, seed = 17 }) {
  if (!w || !h) return null;
  const m = 2.6, x0 = m, y0 = m, x1 = w - m, y1 = h - m;
  const o = { weight: 0.7, intensity: 0.4, taperEnds: true, waver: 0.05 };
  const d = Brush.brushSegment(x0, y0, x1, y0, { seed, ...o })
    + Brush.brushSegment(x1, y0, x1, y1, { seed: seed + 5, ...o })
    + Brush.brushSegment(x1, y1, x0, y1, { seed: seed + 10, ...o })
    + Brush.brushSegment(x0, y1, x0, y0, { seed: seed + 15, ...o });
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" focusable="false"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}>
      <path d={d} fill={color} opacity={opacity} />
    </svg>
  );
}
