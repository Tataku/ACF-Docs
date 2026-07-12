/* ───────────────────────────────────────────────────────────────────────────
 * FrameworkChart — the one reusable ACF exhibit engine.
 *
 * Renders the full Claim → Chart → Explainer → Source loop from a spec:
 *   topline (claim + title + setup line + truth badge)
 *   one primary visual relationship
 *     · layout 'single' / 'dual'    → time-series plot(s)
 *     · layout 'quadrant'           → growth × inflation regime map
 *     · layout 'loop'               → governed flow diagram
 *   concise explainer block
 *   disclosed / verifiable source footer
 *
 * Behavior: desktop hover + click-to-pin, mobile tap single-insight sheet,
 * keyboard-focusable elements, viewport-aware tooltip placement,
 * prefers-reduced-motion, aria summary, bespoke pressure-field shock background.
 * Text always renders above chart geometry. Self-contained dark terminal panel.
 * ─────────────────────────────────────────────────────────────────────────── */
import React from 'react';
import * as Brush from './brush';
import { BrushX, BrushChevron, BrushFrame } from './icons';
import { getPalette, getAccent } from './palette';
import { getChartSpec, footerModel, getDataModeMarker, valueAt, getSimulationIntro, getSimulationNote, getTooltipValueText, readStartingValue, resolveMobileBehavior, resolveTryThis, resolveMotionProfile, resolveMotionTiming } from './chart-specs.mjs';
import { layoutMultiLane } from './chart-core/multilane.mjs';   // shared, framework-agnostic multi-lane model
import { formatIllustrativeMoney } from './chart-core/format.mjs';   // docs illustrative money policy (chart-core facade)

const { useState, useEffect, useRef, useMemo, useCallback, useId } = React;

const SR_ONLY = {
  position: 'absolute', width: 1, height: 1, padding: 0, margin: -1,
  overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0,
};

const TIER_LABEL = {
  series: 'SERIES', band: 'REGIME FIELD', marker: 'INFLECTION', level: 'THRESHOLD',
  waypoint: 'REGIME', node: 'STAGE',
};

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy || 1;
  let t = ((px - ax) * dx + (py - ay) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
function nearPoly(px, py, pts) {
  let best = Infinity, bi = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = segDist(px, py, pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
    if (d < best) { best = d; bi = i; }
  }
  return { d: best, i: bi };
}
function tierColor(tier, pal, accent) {
  switch (tier) {
    case 'primary': return accent;
    case 'secondary': return pal.tierSecondary;
    case 'tertiary': return pal.tierTertiary;
    case 'reference': return pal.tierReference;
    case 'stress': return pal.bandStress;
    default: return pal.tierSecondary;
  }
}
function areaPath(topPx, botPx) {
  if (!topPx.length) return '';
  return 'M' + topPx.map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' L')
    + ' L' + [...botPx].reverse().map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' L') + ' Z';
}

// ── environment hooks (client-only; SSR-safe defaults) ──────────────────────
function useMqFlag(query) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia(query);
    const h = () => setOn(mq.matches);
    h();
    mq.addEventListener ? mq.addEventListener('change', h) : mq.addListener(h);
    return () => (mq.addEventListener ? mq.removeEventListener('change', h) : mq.removeListener(h));
  }, [query]);
  return on;
}
/* Scroll-build trigger: reveal the chart once it scrolls into view, then never
 * retrigger. Drives the engine's existing layered entrance transitions (frame →
 * fields → context → primary → markers). SSR-safe; fires immediately under
 * reduced-motion or where IntersectionObserver is unavailable, so content is
 * never hidden behind animation. */
function useInViewOnce(ref, reduce) {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (seen) return undefined;
    if (reduce || typeof IntersectionObserver === 'undefined') { setSeen(true); return undefined; }
    const el = ref.current;
    if (!el) { setSeen(true); return undefined; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setSeen(true); io.disconnect(); }
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.16 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, reduce, seen]);
  return seen;
}

const halo = (pal, size, color, w = 500) => ({
  fontFamily: pal.mono, fontSize: size, fontWeight: w, letterSpacing: '0.1em',
  paintOrder: 'stroke', stroke: pal.scrim, strokeWidth: 3.4, strokeLinejoin: 'round', fill: color,
});
const haloSans = (pal, size, color, w = 600) => ({
  fontFamily: pal.sans, fontSize: size, fontWeight: w,
  paintOrder: 'stroke', stroke: pal.scrim, strokeWidth: 3.4, strokeLinejoin: 'round', fill: color,
});

// ── reader context (optional, page-level) ───────────────────────────────────
// Coarse money formatting — no cents; illustrative scaling, never precise. Uses the
// shared chart-core facade (was a byte-identical inline copy of formatStartingValue).
const fmtMoney = formatIllustrativeMoney;
// The personalized CALLOUT below the plot — the one computed figure the intro line
// can't carry (e.g. the dollar size of a drawdown, or the multiples at a horizon)
// — is resolved in chart-specs (getSimulationNote), beside the data it scales.

/* ── Shared tooltip ──────────────────────────────────────────────────────────
 * Hover preview is ephemeral; click pins it (links become clickable). Placement
 * is viewport-aware: flips across the anchor and never sits on top of the point. */
// Cursor-follow placement: offset from the point, flip sides near edges with
// hysteresis (so it never oscillates), clamped inside the chart container.
const TIP_OFF_X = 18, TIP_OFF_Y = 14, TIP_FLIP_MARGIN = 28;
function placeTip(px, py, tw, th, cw, ch, st) {
  if (st.right) { if (px + TIP_OFF_X + tw > cw - 2) st.right = false; } else if (px + TIP_OFF_X + tw <= cw - TIP_FLIP_MARGIN) st.right = true;
  if (st.below) { if (py + TIP_OFF_Y + th > ch - 2) st.below = false; } else if (py + TIP_OFF_Y + th <= ch - TIP_FLIP_MARGIN) st.below = true;
  const x = st.right ? px + TIP_OFF_X : px - TIP_OFF_X - tw;
  const y = st.below ? py + TIP_OFF_Y : py - TIP_OFF_Y - th;
  return { x: Math.max(4, Math.min(Math.max(4, cw - tw - 4), x)), y: Math.max(4, Math.min(Math.max(4, ch - th - 4), y)) };
}

// Shared hover/pin tooltip. On desktop HOVER the position is velocity-aware
// cursor-follow (rAF lerp toward cursor + offset, edge-aware); PINNED and
// REDUCED-MOTION anchor to the data point (stable, calm). It self-positions via
// its offsetParent (the chart's relative wrapper) — no per-chart wiring. Mobile
// never renders this (MobileInsight handles touch).
function TargetTooltip({ meta, kindLabel, accentTitle, xPct, yPct, isPin, pal, accent, reduce, onUnpin, valueText, valueSub }) {
  const tipRef = useRef(null);
  const lineRef = useRef(null);
  const dotRef = useRef(null);
  const st = useRef({ cur: null, cursor: null, right: true, below: true, raf: 0, xPct, yPct, isPin });
  const [shown, setShown] = useState(false);
  const [box, setBox] = useState({ w: 244, h: 0 });                            // measured for the pinned brush frame (no layout shift)
  // connector: a quiet accent hairline from the selected element to the nearest
  // edge of the PINNED card — so the card reads as anchored, not floating UI. Drawn
  // imperatively beside the card transform (no per-frame React re-render); hidden
  // when the card sits over / near the anchor so it never crosses content.
  const drawConnector = (ax, ay, cx, cy, cw, ch) => {
    const ln = lineRef.current, dt = dotRef.current; if (!ln || !dt) return;
    if (!st.current.isPin) { ln.style.opacity = '0'; dt.style.opacity = '0'; return; }
    const px = Math.max(cx, Math.min(ax, cx + cw)), py = Math.max(cy, Math.min(ay, cy + ch)); // closest point on the card
    const show = Math.hypot(ax - px, ay - py) > 16 ? '1' : '0';
    ln.setAttribute('x1', ax); ln.setAttribute('y1', ay); ln.setAttribute('x2', px); ln.setAttribute('y2', py);
    dt.setAttribute('cx', ax); dt.setAttribute('cy', ay);
    ln.style.opacity = show; dt.style.opacity = show;
  };
  useEffect(() => {
    const el = tipRef.current; if (!el || !isPin) return undefined;
    const update = () => setBox({ w: el.clientWidth, h: el.clientHeight });   // padding box — matches the inset:0 overlay 1:1
    update();
    const RO = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    if (RO) RO.observe(el);
    return () => { if (RO) RO.disconnect(); };
  }, [isPin, meta, valueText]);
  st.current.xPct = xPct; st.current.yPct = yPct; st.current.isPin = isPin;   // live values for the rAF loop
  useEffect(() => setShown(true), []);
  useEffect(() => {                                                            // desktop hover: velocity-aware cursor-follow; settles to the anchor when pinned
    if (reduce) return undefined;
    const tip = tipRef.current; const cont = tip && tip.offsetParent; if (!tip || !cont) return undefined;
    const anchorPx = () => ({ x: (st.current.xPct / 100) * cont.clientWidth, y: (st.current.yPct / 100) * cont.clientHeight });
    const desired = () => { const p = (!st.current.isPin && st.current.cursor) ? st.current.cursor : anchorPx(); return placeTip(p.x, p.y, tip.offsetWidth, tip.offsetHeight, cont.clientWidth, cont.clientHeight, st.current); };
    const i = desired(); st.current.cur = { x: i.x, y: i.y }; tip.style.transform = `translate3d(${i.x}px, ${i.y}px, 0)`;
    const onPM = (e) => { const r = cont.getBoundingClientRect(); st.current.cursor = { x: e.clientX - r.left, y: e.clientY - r.top }; };
    cont.addEventListener('pointermove', onPM);
    const loop = () => {
      const d = desired(); const c = st.current.cur;
      const dx = d.x - c.x, dy = d.y - c.y, dist = Math.hypot(dx, dy);
      const k = dist > 160 ? 0.28 : dist > 60 ? 0.20 : 0.14;                   // accelerate when far, decelerate when close; dead-zone kills jitter
      if (dist < 0.5) { c.x = d.x; c.y = d.y; } else { c.x += dx * k; c.y += dy * k; }
      tip.style.transform = `translate3d(${c.x}px, ${c.y}px, 0)`;
      const a = anchorPx(); drawConnector(a.x, a.y, c.x, c.y, tip.offsetWidth, tip.offsetHeight);
      st.current.raf = requestAnimationFrame(loop);
    };
    st.current.raf = requestAnimationFrame(loop);
    return () => { cont.removeEventListener('pointermove', onPM); cancelAnimationFrame(st.current.raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce]);
  useEffect(() => {                                                            // reduced motion: snap to the anchor (calm, no rAF), but track content changes
    if (!reduce) return;
    const tip = tipRef.current; const cont = tip && tip.offsetParent; if (!tip || !cont) return;
    const a = { x: (xPct / 100) * cont.clientWidth, y: (yPct / 100) * cont.clientHeight };
    const d = placeTip(a.x, a.y, tip.offsetWidth, tip.offsetHeight, cont.clientWidth, cont.clientHeight, st.current);
    tip.style.transform = `translate3d(${d.x}px, ${d.y}px, 0)`;
    drawConnector(a.x, a.y, d.x, d.y, tip.offsetWidth, tip.offsetHeight);
  }, [reduce, xPct, yPct, isPin]);
  return (
    <>
      {/* pinned connector — anchors the card to the selected element (same accent green) */}
      {isPin && (
        <svg aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible', zIndex: 7 }}>
          <line ref={lineRef} x1="0" y1="0" x2="0" y2="0" stroke={accent} strokeWidth="1" strokeLinecap="round" style={{ opacity: 0, transition: reduce ? 'none' : 'opacity 220ms ease' }} />
          <circle ref={dotRef} cx="0" cy="0" r="2.4" fill={accent} style={{ opacity: 0, transition: reduce ? 'none' : 'opacity 220ms ease' }} />
        </svg>
      )}
      <div ref={tipRef} role={isPin ? 'dialog' : undefined} aria-label={isPin ? meta.name : undefined} style={{
        position: 'absolute', left: 0, top: 0, zIndex: 8, width: isPin ? 'min(320px, 84vw)' : 244,
        pointerEvents: isPin ? 'auto' : 'none', willChange: 'transform',
        background: pal.cardSolid, border: `1px solid ${isPin ? `${accent}99` : pal.borderHi}`, borderRadius: 6,
        // pinned: clip to the rounded rect so the brush frame's outward waver is trimmed
        // to a clean outer silhouette (architecture outside, brushwork inside). The
        // box-shadow renders outside the box and is unaffected by overflow:hidden.
        overflow: isPin ? 'hidden' : 'visible',
        boxShadow: pal.name === 'light' ? '0 6px 22px rgba(40,36,28,0.16)' : '0 8px 28px rgba(0,0,0,0.5)',
        padding: isPin ? '12px 15px 13px' : '11px 13px 12px', opacity: shown ? 1 : 0,
        transition: reduce ? 'opacity 120ms ease' : 'opacity 120ms cubic-bezier(0.2,0.7,0.2,1), border-color 200ms ease',
      }}>
        {/* pinned = higher-commitment focus → confident brush frame, clipped to the card silhouette (hover stays clean) */}
        {isPin && <BrushFrame w={box.w} h={box.h} color={accent} opacity={pal.name === 'light' ? 0.78 : 0.9} />}
        {/* META · PINNED — quiet curated label */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isPin ? 8 : 7 }}>
          <span style={{ fontFamily: pal.mono, fontSize: 8.5, letterSpacing: '0.16em', color: accentTitle || isPin ? accent : pal.text4 }}>
            {kindLabel}{isPin && <span style={{ color: accent, marginLeft: 6 }}>· PINNED</span>}
          </span>
          {isPin ? (
            <button onClick={onUnpin} aria-label="Unpin" className="acf-fx-focusable acf-icon-btn" style={{ background: 'transparent', border: 'none', color: pal.text3, cursor: 'pointer', padding: 4, margin: -2, lineHeight: 0, borderRadius: 4, display: 'inline-flex' }}><BrushX size={12} /></button>
          ) : meta.concept ? (
            <span style={{ fontFamily: pal.mono, fontSize: 8, letterSpacing: '0.08em', color: pal.text4, border: `1px solid ${pal.cardBorder}`, borderRadius: 3, padding: '2px 5px' }}>↳ {meta.concept}</span>
          ) : null}
        </div>
        {/* Title — the strongest element */}
        <div style={{ fontFamily: pal.sans, fontSize: isPin ? 15 : 13.5, fontWeight: 600, color: pal.text1, marginBottom: valueText ? 3 : (isPin ? 7 : 6), letterSpacing: '-0.012em', lineHeight: 1.2 }}>{meta.name}</div>
        {valueText && (
          <div style={{ marginBottom: isPin ? 8 : 7 }}>
            <div style={{ fontFamily: pal.mono, fontSize: 17, fontWeight: 600, color: accent, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>{valueText}</div>
            {isPin && valueSub && <div style={{ fontFamily: pal.mono, fontSize: 9, letterSpacing: '0.04em', color: pal.text4, marginTop: 3 }}>{valueSub}</div>}
          </div>
        )}
        {/* Explanation — comfortable line-height; card width keeps the measure tight */}
        <p style={{ margin: 0, fontFamily: pal.sans, fontSize: isPin ? 12 : 11.5, lineHeight: isPin ? 1.58 : 1.5, color: pal.text2 }}>{meta.why}</p>
        {/* hover = quick read (a pin hint); pin = principle + raw context + READ action */}
        {isPin ? (
          <div style={{ marginTop: 10, paddingTop: 9, borderTop: `1px solid ${pal.cardBorder}`, display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
            <span style={{ fontFamily: pal.sans, fontSize: 11, color: pal.text3, fontStyle: 'italic', lineHeight: 1.45 }}>{meta.claim}</span>
            {meta.link && <a href={meta.link} className="acf-read-link acf-fx-focusable" style={{ fontFamily: pal.mono, fontSize: 8.5, letterSpacing: '0.1em', color: accent, textDecoration: 'none', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>READ <BrushChevron dir="right" size={9} /></a>}
          </div>
        ) : (
          <div style={{ marginTop: 8, fontFamily: pal.mono, fontSize: 8, letterSpacing: '0.1em', color: pal.text4 }}>{meta.link ? 'CLICK TO PIN FOR MORE →' : 'CLICK TO PIN →'}</div>
        )}
      </div>
    </>
  );
}

// focusable keyboard chip at a viewBox anchor (hover parity)
function FocusChip({ t, anchor, coarse, pinned, onActive, onPin, mkActive }) {
  if (!anchor) return null;
  return (
    <circle
      className="acf-fx-focusable" cx={anchor.x} cy={anchor.y} r={coarse ? 12 : 9}
      fill="transparent" tabIndex={coarse ? -1 : 0} role="button" aria-hidden={coarse ? 'true' : undefined}
      aria-label={`${t.name || t.label}. ${t.why} ${t.claim}`}
      onFocus={() => onActive(mkActive(t), 'focus')}
      onBlur={() => onActive(null, 'focus')}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPin(pinned && pinned.id === t.id ? null : mkActive(t)); } }}
      // coarse: non-interactive so taps fall through to the SVG (no focus-scroll
      // jump, no double handling); the MobileInsight stepper carries a11y instead.
      style={{ cursor: 'pointer', pointerEvents: coarse ? 'none' : undefined }}
    />
  );
}

/* ── PlotSvg — single chart or one dual panel (time-series family) ───────────*/
function PlotSvg({
  panel, xDomain, xTicks, hideX, width, height, pal, accent, reduce, entered, coarse, touch,
  targets, active, pinned, onActive, onPin, showValues = true, valueNote = 'TRUE VALUE', bandReveal = 1, motion, readerContext,
}) {
  const svgRef = useRef(null);
  const dom = { ...xDomain, ...panel.domain };
  const labels = (panel.series || []).filter((s) => s.label).map((s) => s.label);
  const longest = labels.reduce((m, l) => Math.max(m, l.length), 0);
  const pad = { l: 18, r: Math.max(74, longest * 7 + 26), t: 30, b: hideX ? 14 : 40 };
  const x = (v) => pad.l + ((v - dom.xMin) / (dom.xMax - dom.xMin)) * (width - pad.l - pad.r);
  const y = (v) => pad.t + (1 - (v - dom.yMin) / (dom.yMax - dom.yMin)) * (height - pad.t - pad.b);
  const HIT = { line: touch ? 20 : 12, marker: touch ? 32 : 24, level: touch ? 20 : 12 };

  const seriesByKey = {};
  (panel.series || []).forEach((s) => { seriesByKey[s.key] = s; });
  const primary = (panel.series || []).find((s) => s.tier === 'primary') || panel.series[0];

  const geom = useMemo(() => {
    const out = { series: {}, bands: [], areas: [], markers: [], levels: [], guides: [], notes: [] };
    (panel.series || []).forEach((s) => {
      const px = s.pts.map((p) => ({ x: x(p.x), y: y(p.y) }));
      const isStroke = s.tier === 'tertiary' || s.tier === 'reference';
      const w = (s.tier === 'primary' ? 1.3 : s.tier === 'secondary' ? 0.74 : 1) * 0.85;
      out.series[s.key] = {
        s, px, end: px[px.length - 1], isStroke,
        d: isStroke ? Brush.smoothOpen(px) : Brush.brushLine(px, { seed: 21 + s.key.length * 9, weight: w, intensity: s.tier === 'primary' || s.tier === 'stress' ? 0.85 : 0.7 }),
        center: Brush.smoothOpen(px),
      };
    });
    (panel.areas || []).forEach((a) => {
      const top = seriesByKey[a.topKey]; if (!top) return;
      let topPx, botPx;
      if (a.kind === 'peak') { let mx = -Infinity; topPx = top.pts.map((p) => { mx = Math.max(mx, p.y); return { x: x(p.x), y: y(mx) }; }); botPx = top.pts.map((p) => ({ x: x(p.x), y: y(p.y) })); }
      else if (a.kind === 'under') { topPx = top.pts.map((p) => ({ x: x(p.x), y: y(p.y) })); botPx = top.pts.map((p) => ({ x: x(p.x), y: y(dom.yMin) })); }
      else if (a.botKey && seriesByKey[a.botKey]) { topPx = top.pts.map((p) => ({ x: x(p.x), y: y(p.y) })); botPx = seriesByKey[a.botKey].pts.map((p) => ({ x: x(p.x), y: y(p.y) })); }
      else return;
      if (a.xFrom != null) { topPx = topPx.filter((_, i) => top.pts[i].x >= a.xFrom); botPx = botPx.filter((_, i) => top.pts[i].x >= a.xFrom); }
      out.areas.push({ a, d: areaPath(topPx, botPx), labelX: a.labelX != null ? x(a.labelX) : a.xFrom != null ? x((a.xFrom + dom.xMax) / 2) : x((dom.xMin + dom.xMax) * 0.6) });
    });
    (panel.bands || []).forEach((b) => {
      const xc = (x(b.x0) + x(b.x1)) / 2;
      const halfSpan = ((x(b.x1) - x(b.x0)) / 2) * (b.spanScale || 1);
      if (b.render === 'wash') {
        out.bands.push({ b, xc, wash: Brush.washRect(x(b.x0), pad.t, x(b.x1), height - pad.b, { seed: b.seed || 33, intensity: 0.7, soft: 'both' }), x0: x(b.x0), x1: x(b.x1), yTop: pad.t, yBot: height - pad.b });
      } else if (b.render === 'field') {
        out.bands.push({ b, xc, dca: Brush.dcaWindow(x(b.x0), x(b.x1), pad.t, height - pad.b, { seed: b.seed || 29, intensity: 0.7 }), x0: x(b.x0), x1: x(b.x1), yTop: pad.t, yBot: height - pad.b });
      } else {
        const field = Brush.pressureField(xc, pad.t, height - pad.b, halfSpan, { seed: b.seed || 41, intensity: b.intensity ?? 0.78, asymmetric: b.asymmetric ?? 0.16 });
        out.bands.push({ b, xc, field, x0: x(b.x0), x1: x(b.x1), yTop: pad.t, yBot: height - pad.b });
      }
    });
    (panel.markers || []).forEach((m) => {
      const cx = x(m.x), cy = y(m.y);
      out.markers.push({ m, cx, cy, d: m.type === 'enso' ? Brush.enso(cx, cy, m.r || 13, { seed: 97, weight: 0.85, intensity: 0.85, gapAngle: -Math.PI / 3 }) : Brush.inkDot(cx, cy, m.r || 3, { seed: 83, intensity: 0.85 }) });
    });
    (panel.levels || []).forEach((lv) => { out.levels.push({ lv, yPx: y(lv.y), d: Brush.brushSegment(pad.l, y(lv.y), width - pad.r, y(lv.y), { seed: 67, weight: 0.6, intensity: 0.85, waver: 0.5 }) }); });
    (panel.guides || []).forEach((gd) => { out.guides.push({ gd, yPx: y(gd.y) }); });
    (panel.notes || []).forEach((nt) => { out.notes.push({ nt, x: x(nt.x), y: y(nt.y) }); });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panel, width, height, dom.xMin, dom.xMax, dom.yMin, dom.yMax]);

  const anchorOf = useCallback((a) => {
    if (!a) return null;
    if (a.kind === 'series') { const g = geom.series[a.seriesKey]; if (!g) return null; const i = a.dataIdx != null ? Math.min(a.dataIdx, g.px.length - 1) : g.px.length - 1; return { x: g.px[i].x, y: g.px[i].y }; }
    if (a.kind === 'band') { const b = geom.bands[0]; return b ? { x: b.field ? b.field.peakX : b.xc, y: pad.t + 14 } : null; }
    if (a.kind === 'marker') { const m = geom.markers.find((mm) => mm.m.id === a.id); return m ? { x: m.cx, y: m.cy } : null; }
    if (a.kind === 'level') { const lv = geom.levels.find((l) => l.lv.id === a.id); if (lv) return { x: width - pad.r - 24, y: lv.yPx }; const gd = geom.guides.find((g) => g.gd.id === a.id); return gd ? { x: width - pad.r - 24, y: gd.yPx } : null; }
    return null;
  }, [geom, width, pad.r, pad.t]);

  const resolve = useCallback((mx, my) => {
    const mine = targets;
    for (const t of mine) if (t.kind === 'marker') { const m = geom.markers.find((mm) => mm.m.id === t.id); if (m && Math.hypot(mx - m.cx, my - m.cy) < HIT.marker) return { ...t }; }
    for (const t of mine) if (t.kind === 'level') { const lv = geom.levels.find((l) => l.lv.id === t.id) || geom.guides.find((g) => g.gd.id === t.id); if (lv && Math.abs(my - lv.yPx) < HIT.level && mx > pad.l && mx < width - pad.r) return { ...t }; }
    const order = [...mine].filter((t) => t.kind === 'series').sort((a, b) => (a.seriesKey === primary.key ? -1 : b.seriesKey === primary.key ? 1 : 0));
    for (const t of order) { const g = geom.series[t.seriesKey]; if (!g) continue; const dp = nearPoly(mx, my, g.px); if (dp.d < HIT.line) return { ...t, dataIdx: dp.i }; }
    for (const t of mine) if (t.kind === 'band') { const b = geom.bands[0]; if (b && mx >= b.x0 && mx <= b.x1 && my >= b.yTop && my <= b.yBot) return { ...t }; }
    const pg = geom.series[primary.key];
    if (pg) { const idx = Math.max(0, Math.min(pg.px.length - 1, Math.round(((mx - pad.l) / (width - pad.l - pad.r)) * (pg.px.length - 1)))); const pt = targets.find((t) => t.kind === 'series' && t.seriesKey === primary.key); if (pt) return { ...pt, dataIdx: idx, fallback: true }; }
    return null;
  }, [geom, targets, HIT.line, HIT.marker, HIT.level, width, pad.l, pad.r, primary]);

  const toViewBox = (e) => { const r = svgRef.current.getBoundingClientRect(); return [(e.clientX - r.left) * (width / r.width), (e.clientY - r.top) * (height / r.height)]; };
  const onMove = (e) => { if (coarse || pinned) return; const [mx, my] = toViewBox(e); onActive(resolve(mx, my), 'hover'); };
  const onLeave = () => { if (!coarse && !pinned) onActive(null, 'hover'); };
  const onClick = (e) => { const [mx, my] = toViewBox(e); const res = resolve(mx, my); if (coarse) { onActive(res, 'tap'); return; } if (!res || res.fallback) { onPin(null); return; } onPin(res); };
  const mkActive = (t) => ({ ...t, dataIdx: t.kind === 'series' && geom.series[t.seriesKey] ? geom.series[t.seriesKey].px.length - 1 : undefined });

  const isActiveHere = active && targets.some((t) => t.id === active.id);
  const focusId = isActiveHere ? active.id : null;
  const dimOf = (id) => (focusId && focusId !== id ? (coarse ? 0.5 : 0.34) : 1);  // coarse: emphasis is hierarchy, context stays readable (never disappears)
  const trans = (p, ms = 180) => (reduce ? undefined : `${p} ${ms}ms ease`);
  const anchor = isActiveHere ? anchorOf(active) : null;
  // Motion doctrine: a single left→right time-sweep reveals bands, areas and all
  // related series together (data drawn through time); markers and labels resolve
  // after the sweep front reaches their x-position. Slower + calmer than a pop.
  const EASE = 'cubic-bezier(0.22, 0.61, 0.36, 1)';
  const TM = { fast: (motion && motion.fastMs) || 560, medium: (motion && motion.mediumMs) || 1100, path: (motion && motion.sweepMs) || 1900 };
  const plotW = width - pad.l - pad.r;
  const xFrac = (px) => Math.max(0, Math.min(1, (px - pad.l) / (plotW || 1)));
  const sweep = (dur = TM.path, delay = 0) => ({
    clipPath: entered ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)', WebkitClipPath: entered ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)',
    transition: reduce ? 'none' : `clip-path ${dur}ms ${EASE} ${delay}ms, -webkit-clip-path ${dur}ms ${EASE} ${delay}ms`,
  });
  // opacity reveal timed to when the sweep reaches a given x (object exists first).
  const fadeAt = (px, dur = TM.fast, extra = 0) => ({ opacity: entered ? 1 : 0, transition: reduce ? 'opacity 300ms ease' : `opacity ${dur}ms ${EASE} ${Math.round(120 + TM.path * xFrac(px) + extra)}ms` });

  let tooltip = null;
  if (!coarse && isActiveHere && anchor) {
    const meta = targets.find((t) => t.id === active.id);
    if (meta) {
      // seriesByKey[key] IS the raw series object (has .pts directly). Read it
      // defensively so hover never throws for any target kind.
      const sObj = active.kind === 'series' ? seriesByKey[active.seriesKey] : null;
      const raw = sObj && Array.isArray(sObj.pts) && active.dataIdx != null
        ? (sObj.pts[Math.min(active.dataIdx, sObj.pts.length - 1)] || {}).y
        : null;
      const dec = panel.yUnit === '%' || (panel.domain && panel.domain.yMax <= 5) ? 2 : 1;
      const unit = (panel.valueUnit || panel.yUnit || 'val').toUpperCase();
      const vt = showValues && raw != null ? getTooltipValueText(panel, readerContext, { raw, unit, dec, valueNote }) : null;
      tooltip = <TargetTooltip meta={meta} kindLabel={TIER_LABEL[active.kind] || 'ELEMENT'} accentTitle={active.kind === 'series' && active.seriesKey === primary.key} xPct={(anchor.x / width) * 100} yPct={(anchor.y / height) * 100} isPin={!!pinned && active.id === pinned.id} pal={pal} accent={accent} reduce={reduce} onUnpin={() => onPin(null)} valueText={vt && vt.primary} valueSub={vt && vt.secondary} />;
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} width="100%" role="group" aria-label={panel.label ? `${panel.label} panel` : undefined}
        style={{ display: 'block', cursor: coarse ? 'pointer' : 'crosshair', touchAction: 'manipulation' }} onMouseMove={onMove} onMouseLeave={onLeave} onClick={onClick}>
        {/* grid + axes */}
        {(panel.yTicks || []).map((t, i) => <line key={`g${i}`} x1={pad.l} x2={width - pad.r} y1={y(t.v)} y2={y(t.v)} stroke={pal.grid} strokeWidth="1" strokeDasharray="1 7" />)}
        {(panel.yTicks || []).map((t, i) => <text key={`yl${i}`} x={width - pad.r + 9} y={y(t.v) + 3.5} style={{ ...halo(pal, 10, pal.axis, 500), letterSpacing: '0.03em' }}>{t.label != null ? t.label : t.v}</text>)}
        {panel.yUnit ? <text x={pad.l} y={pad.t - 12} style={halo(pal, 9, pal.axis, 500)}>{panel.yUnit.toUpperCase()}</text> : null}
        {!hideX && (xTicks || []).map((t, i) => { const anc = t.v === dom.xMin ? 'start' : t.v === dom.xMax ? 'end' : 'middle'; return <text key={`xl${i}`} x={x(t.v)} y={height - pad.b + 20} textAnchor={anc} style={halo(pal, 9, pal.axis, 500)}>{t.label.toUpperCase()}</text>; })}

        {/* guides — structural thresholds settle early, before the data sweep */}
        {geom.guides.map((g, i) => (
          <g key={`gd${i}`} style={fadeAt(pad.l, TM.medium, -100)}>
            <line x1={pad.l} x2={width - pad.r} y1={g.yPx} y2={g.yPx} stroke={g.gd.kind === 'threshold' ? pal.invalidCharcoal : pal.tierReference} strokeWidth="0.9" strokeDasharray={g.gd.dash ? '5 5' : '1 6'} opacity={focusId === g.gd.id ? 0.95 : 0.6} style={{ transition: trans('opacity') }} />
            {g.gd.label && <text x={g.gd.kind === 'threshold' ? width - pad.r : pad.l + 4} y={g.yPx - 6} textAnchor={g.gd.kind === 'threshold' ? 'end' : 'start'} style={halo(pal, 9, g.gd.kind === 'threshold' ? pal.invalidCharcoal : pal.axis, 500)}>{g.gd.label}</text>}
          </g>
        ))}

        {/* master time-sweep: bands, areas and all related series grow left→right
            together, so related lines move in tandem and areas/backgrounds grow
            with the line fronts rather than popping in afterward. */}
        <g style={sweep(TM.path, 120)}>
          <g style={{ opacity: bandReveal, transition: reduce ? 'none' : 'opacity 220ms ease' }}>
          {geom.bands.map((bg, i) => (
            <g key={`band${i}`} style={{ opacity: entered ? (focusId === bg.b.id ? 1 : 0.85) : 0, transition: reduce ? 'opacity 320ms ease' : `opacity ${TM.medium}ms ${EASE} 120ms` }}>
              {bg.field ? (
                <>
                  <path d={bg.field.plume} fill={pal.bandStress} fillOpacity={focusId === bg.b.id ? (pal.name === 'light' ? 0.20 : 0.18) : (pal.name === 'light' ? 0.13 : 0.12)} style={{ transition: trans('fill-opacity') }} />
                  {bg.field.grains.map((gr, gi) => <circle key={gi} cx={gr.x} cy={gr.y} r={gr.r} fill={pal.bandStress} opacity={gr.op} />)}
                </>
              ) : bg.dca ? (
                <>
                  <path d={bg.dca.wash} fill={pal.bandRegime} fillOpacity={focusId === bg.b.id ? (pal.name === 'light' ? 0.16 : 0.15) : (pal.name === 'light' ? 0.12 : 0.10)} style={{ transition: trans('fill-opacity') }} />
                  {bg.dca.grains.map((gr, gi) => <circle key={gi} cx={gr.x} cy={gr.y} r={gr.r} fill={accent} opacity={gr.op * 0.7} />)}
                </>
              ) : (
                <path d={bg.wash} fill={pal.bandRegime} fillOpacity={focusId === bg.b.id ? (pal.name === 'light' ? 0.16 : 0.16) : (pal.name === 'light' ? 0.10 : 0.09)} style={{ transition: trans('fill-opacity') }} />
              )}
            </g>
          ))}
          </g>
          {geom.areas.map((ar, i) => {
            const toneC = ar.a.tone === 'muted' ? pal.tierSecondary : ar.a.tone === 'accent' ? accent : null;
            const c = toneC || (ar.a.kind === 'peak' ? pal.bandStress : ar.a.kind === 'under' || ar.a.kind === 'edge' ? accent : pal.tierSecondary);
            const op = ar.a.opacity != null ? ar.a.opacity : ar.a.kind === 'under' ? 0.10 : ar.a.kind === 'peak' ? 0.10 : ar.a.kind === 'edge' ? 0.13 : 0.09;
            return <path key={`ar${i}`} d={ar.d} fill={c} opacity={op} />;
          })}
          {(panel.series || []).filter((s) => s.tier !== 'primary' && !s.hidden).map((s) => {
            const g = geom.series[s.key];
            return (
              <g key={`sec${s.key}`} style={{ opacity: dimOf(s.key), transition: trans('opacity') }}>
                {g.isStroke
                  ? <path d={g.d} fill="none" stroke={tierColor(s.tier, pal, accent)} strokeWidth="1.1" strokeDasharray={s.tier === 'tertiary' ? '5 5' : '0'} strokeLinecap="round" opacity="0.7" />
                  : <path d={g.d} fill={tierColor(s.tier, pal, accent)} opacity={s.tier === 'stress' ? 0.9 : 0.82} />}
              </g>
            );
          })}
          {(panel.series || []).filter((s) => s.tier === 'primary' && !s.hidden).map((s) => {
            const g = geom.series[s.key];
            return (
              <g key={`pri${s.key}`} style={{ opacity: dimOf(s.key), transition: trans('opacity') }}>
                <path d={g.d} fill={accent} />
                {focusId === s.key && <path d={g.center} fill="none" stroke={accent} strokeWidth="1" opacity="0.9" />}
              </g>
            );
          })}
          {geom.levels.map((l, i) => <g key={`lv${i}`} opacity={dimOf(l.lv.id)} style={{ transition: trans('opacity') }}><path d={l.d} fill={pal.invalidCharcoal} opacity={focusId === l.lv.id ? 1 : 0.85} /></g>)}
        </g>

        {/* markers — resolve as the sweep front reaches their x-position */}
        {geom.markers.map((m, i) => (
          <g key={`mk${i}`} style={{ opacity: entered ? dimOf(m.m.id) : 0, transformOrigin: `${m.cx}px ${m.cy}px`, transform: entered ? 'none' : 'scale(0.86)', transition: reduce ? 'opacity 240ms ease' : `opacity ${TM.fast}ms ${EASE} ${Math.round(120 + TM.path * xFrac(m.cx))}ms, transform ${TM.fast}ms ${EASE} ${Math.round(120 + TM.path * xFrac(m.cx))}ms` }}>
            <path d={m.d} fill={pal.markInk} />
            {focusId === m.m.id && <circle cx={m.cx} cy={m.cy} r={(m.m.r || 13) + 2} fill="none" stroke={accent} strokeWidth="1.1" opacity="0.9" />}
          </g>
        ))}

        {/* leader lines for upper-left enso callouts */}
        {geom.markers.map((m, i) => (m.m.label && m.m.labelAnchor === 'end') ? <line key={`ld${i}`} x1={m.cx - (m.m.r || 13) - 4} y1={m.cy - (m.m.r || 13) - 2} x2={m.cx - (m.m.r || 13) - 16} y2={m.cy - (m.m.r || 13) - 10} stroke={pal.text4} strokeWidth="0.75" opacity={entered ? 0.55 : 0} style={{ transition: trans('opacity', 400) }} /> : null)}

        {/* text labels — appear after the object they describe exists */}
        {!coarse && geom.bands.map((bg, i) => bg.b.label ? <text key={`bl${i}`} x={bg.b.labelAnchor === 'peak' ? (bg.field ? bg.field.peakX : bg.xc) : bg.x0 + 10} y={pad.t + 14} textAnchor={bg.b.labelAnchor === 'peak' ? 'middle' : 'start'} style={{ ...halo(pal, 9.5, bg.field ? pal.bandStressText : pal.bandRegimeText), ...fadeAt(bg.xc, TM.fast) }}>{bg.b.label}</text> : null)}
        {geom.areas.map((ar, i) => ar.a.label ? <text key={`al${i}`} x={ar.labelX} y={pad.t + 30} textAnchor="middle" style={{ ...halo(pal, 9.5, pal.text3), fontStyle: 'italic', ...fadeAt(ar.labelX, TM.fast) }}>{ar.a.label}</text> : null)}
        {!coarse && geom.markers.map((m, i) => {
          if (!m.m.label) return null;
          const r = m.m.r || 13;
          const anc = m.m.labelAnchor === 'end' ? 'end' : m.m.labelAnchor === 'start' ? 'start' : 'middle';
          const lx = anc === 'end' ? m.cx - r - 6 : anc === 'start' ? m.cx + r + 6 : m.cx;
          return <text key={`ml${i}`} x={lx} y={m.cy + (m.m.labelDy ?? -18)} textAnchor={anc} style={{ ...halo(pal, 9.5, pal.text2), ...fadeAt(m.cx, TM.fast, 220) }}>{m.m.label}</text>;
        })}
        {(panel.series || []).map((s) => {
          const g = geom.series[s.key];
          const c = s.tier === 'primary' ? accent : tierColor(s.tier, pal, accent);
          return s.label && !s.hidden ? <text key={`el${s.key}`} x={g.end.x + 9} y={g.end.y + 3.5 + (s.labelDy || 0)} style={{ ...haloSans(pal, s.tier === 'primary' ? 11.5 : 11, c, s.tier === 'primary' ? 600 : 500), opacity: entered ? dimOf(s.key) : 0, transition: reduce ? 'opacity 300ms ease' : `opacity ${TM.fast}ms ${EASE} ${Math.round(120 + TM.path * xFrac(g.end.x))}ms` }}>{s.label}</text> : null;
        })}
        {geom.notes.map((n, i) => <text key={`nt${i}`} x={n.x} y={n.y} textAnchor={n.nt.anchor || 'middle'} style={{ ...haloSans(pal, 11.5, pal.text3, 500), fontStyle: 'italic', ...fadeAt(n.x, TM.fast, 120) }}>{n.nt.text}</text>)}

        {/* crosshair on series hover */}
        {anchor && isActiveHere && active.kind === 'series' && (
          <g style={{ pointerEvents: 'none' }}>
            <line x1={anchor.x} x2={anchor.x} y1={pad.t} y2={height - pad.b} stroke={accent} strokeWidth="0.6" strokeDasharray="2 3" opacity="0.5" />
            <circle cx={anchor.x} cy={anchor.y} r="4" fill={accent} stroke={pal.scrim} strokeWidth="1.5" />
          </g>
        )}

        {/* keyboard focus chips */}
        {targets.map((t) => <FocusChip key={`hit${t.id}`} t={t} anchor={anchorOf(t.kind === 'series' ? { ...t, dataIdx: null } : t)} coarse={coarse} pinned={pinned} onActive={onActive} onPin={onPin} mkActive={mkActive} />)}
      </svg>
      {tooltip}
    </div>
  );
}

/* ── QuadrantSvg — growth × inflation regime map ─────────────────────────────*/
function QuadrantSvg({ spec, width, height, pal, accent, reduce, entered, coarse, touch, targets, active, pinned, onActive, onPin }) {
  const svgRef = useRef(null);
  const q = spec.quadrant;
  const pad = { l: 80, r: 80, t: 34, b: 40 };
  const x = (v) => pad.l + ((v + 1) / 2) * (width - pad.l - pad.r);
  const y = (v) => pad.t + (1 - (v + 1) / 2) * (height - pad.t - pad.b);     // +1 (high inflation) at top
  const cx = x(0), cy = y(0);
  const wps = q.path.map((id) => ({ id, ...q.waypoints[id] }));
  const geom = useMemo(() => {
    const px = wps.map((w) => ({ x: x(w.x), y: y(w.y), id: w.id }));
    return { px, line: Brush.brushLine(px, { seed: 19, weight: 0.8, intensity: 0.7 }) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);
  const HITR = touch ? 34 : 26;

  const anchorOf = (a) => { const p = geom.px.find((pp) => pp.id === a.id); return p ? { x: p.x, y: p.y } : null; };
  const resolve = (mx, my) => { let best = null, bd = HITR; geom.px.forEach((p) => { const d = Math.hypot(mx - p.x, my - p.y); if (d < bd) { bd = d; best = p; } }); return best ? targets.find((t) => t.id === best.id) : null; };
  const toVB = (e) => { const r = svgRef.current.getBoundingClientRect(); return [(e.clientX - r.left) * (width / r.width), (e.clientY - r.top) * (height / r.height)]; };
  const onMove = (e) => { if (coarse || pinned) return; onActive(resolve(...toVB(e)), 'hover'); };
  const onClick = (e) => { const res = resolve(...toVB(e)); if (coarse) { onActive(res, 'tap'); return; } if (!res) { onPin(null); return; } onPin(res); };

  const isActiveHere = active && targets.some((t) => t.id === active.id);
  const focusId = isActiveHere ? active.id : null;
  const anchor = isActiveHere ? anchorOf(active) : null;
  const trans = (p, ms = 200) => (reduce ? undefined : `${p} ${ms}ms ease`);

  let tooltip = null;
  if (!coarse && isActiveHere && anchor) {
    const meta = targets.find((t) => t.id === active.id);
    if (meta) tooltip = <TargetTooltip meta={meta} kindLabel={TIER_LABEL.waypoint} accentTitle={active.id === spec.primaryKey} xPct={(anchor.x / width) * 100} yPct={(anchor.y / height) * 100} isPin={!!pinned && active.id === pinned.id} pal={pal} accent={accent} reduce={reduce} entered={entered} onUnpin={() => onPin(null)} valueText={null} />;
  }

  return (
    <div style={{ position: 'relative' }}>
      <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} width="100%" role="group" aria-label="Growth versus inflation regime map" style={{ display: 'block', cursor: coarse ? 'pointer' : 'crosshair', touchAction: 'manipulation' }} onMouseMove={onMove} onMouseLeave={() => { if (!coarse && !pinned) onActive(null, 'hover'); }} onClick={onClick}>
        {/* axes */}
        <line x1={pad.l} x2={width - pad.r} y1={cy} y2={cy} stroke={pal.grid} strokeWidth="1" />
        <line x1={cx} x2={cx} y1={pad.t} y2={height - pad.b} stroke={pal.grid} strokeWidth="1" />
        {/* axis labels */}
        <text x={pad.l - 6} y={cy - 6} style={halo(pal, 9, pal.text4)}>{q.xAxis.neg}</text>
        <text x={width - pad.r + 6} y={cy - 6} textAnchor="end" style={halo(pal, 9, pal.text4)}>{q.xAxis.pos}</text>
        <text x={cx + 8} y={pad.t + 4} style={halo(pal, 9, pal.text4)}>{q.yAxis.pos}</text>
        <text x={cx + 8} y={height - pad.b} style={halo(pal, 9, pal.text4)}>{q.yAxis.neg}</text>
        {/* quadrant labels */}
        {q.cells.map((c, i) => (
          <g key={`cell${i}`}>
            <text x={x(c.qx * 0.55)} y={y(c.qy * 0.62)} textAnchor="middle" style={haloSans(pal, 14, pal.text2, 600)}>{c.label}</text>
            <text x={x(c.qx * 0.55)} y={y(c.qy * 0.62) + 16} textAnchor="middle" style={halo(pal, 8.5, pal.text4)}>{c.sub}</text>
          </g>
        ))}
        {/* path — settles slowly through regime space */}
        <g style={{ opacity: entered ? 1 : 0, transition: reduce ? 'opacity 320ms ease' : 'opacity 1500ms ease 160ms' }}>
          <path d={geom.line} fill={accent} opacity="0.5" />
        </g>
        {/* waypoints — resolve in journey order; the current marker lands last */}
        {geom.px.map((p, i) => (
          <g key={`wp${i}`} style={{ opacity: entered ? (focusId && focusId !== p.id ? 0.4 : 1) : 0, transformOrigin: `${p.x}px ${p.y}px`, transform: entered ? 'none' : 'scale(0.7)', transition: reduce ? 'opacity 300ms ease' : `opacity 520ms cubic-bezier(0.22,0.61,0.36,1) ${280 + i * 240}ms, transform 520ms cubic-bezier(0.22,0.61,0.36,1) ${280 + i * 240}ms` }}>
            <path d={Brush.inkDot(p.x, p.y, p.id === spec.primaryKey ? 4.4 : 3.4, { seed: 40 + i * 7, intensity: 0.8 })} fill={p.id === spec.primaryKey ? accent : pal.markInk} />
            {focusId === p.id && <circle cx={p.x} cy={p.y} r="9" fill="none" stroke={accent} strokeWidth="1.1" opacity="0.9" />}
            {(() => {
              // Persistent text must not collide: waypoint labels are hover-only
              // by default; only an explicitly-flagged label (e.g. "Now") stays.
              const tgt = targets.find((t) => t.id === p.id);
              const show = focusId === p.id || (tgt && tgt.persistentLabel);
              return show && tgt ? <text x={p.x} y={p.y - 11} textAnchor="middle" style={halo(pal, 8.5, p.id === spec.primaryKey ? accent : pal.text2)}>{tgt.label}</text> : null;
            })()}
          </g>
        ))}
        {targets.map((t) => <FocusChip key={`hit${t.id}`} t={t} anchor={anchorOf(t)} coarse={coarse} pinned={pinned} onActive={onActive} onPin={onPin} mkActive={(tt) => ({ ...tt })} />)}
      </svg>
      {tooltip}
    </div>
  );
}

/* ── LoopSvg — governed flow diagram ─────────────────────────────────────────*/
function LoopSvg({ spec, width, height, pal, accent, reduce, entered, coarse, touch, targets, active, pinned, onActive, onPin }) {
  const svgRef = useRef(null);
  const nodes = spec.loop.nodes;
  const cx = width / 2, cy = height / 2;
  const rx = Math.min(width * 0.31, 300), ry = height * 0.31;
  const angs = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];            // top, right, bottom, left
  const pos = nodes.map((n, i) => ({ ...n, x: cx + Math.cos(angs[i]) * rx, y: cy + Math.sin(angs[i]) * ry }));
  const geom = useMemo(() => {
    // tangential arrows at diagonal midpoints, clockwise
    const arrows = [];
    for (let i = 0; i < 4; i++) {
      const a = angs[i] + Math.PI / 4;
      const mx = cx + Math.cos(a) * rx * 0.96, my = cy + Math.sin(a) * ry * 0.96;
      const dir = a + Math.PI / 2;                                   // clockwise tangent
      const tx = mx + Math.cos(dir) * 26, ty = my + Math.sin(dir) * 26;
      arrows.push(Brush.brushArrow(tx, ty, 30, dir, { seed: 30 + i * 9, weight: 0.7, intensity: 0.6 }));
    }
    return { arrows };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);
  const HITR = touch ? 60 : 70;

  const anchorOf = (a) => { const p = pos.find((pp) => pp.id === a.id); return p ? { x: p.x, y: p.y } : null; };
  const resolve = (mx, my) => { let best = null, bd = HITR; pos.forEach((p) => { const d = Math.hypot(mx - p.x, my - p.y); if (d < bd) { bd = d; best = p; } }); return best ? targets.find((t) => t.id === best.id) : null; };
  const toVB = (e) => { const r = svgRef.current.getBoundingClientRect(); return [(e.clientX - r.left) * (width / r.width), (e.clientY - r.top) * (height / r.height)]; };
  const onMove = (e) => { if (coarse || pinned) return; onActive(resolve(...toVB(e)), 'hover'); };
  const onClick = (e) => { const res = resolve(...toVB(e)); if (coarse) { onActive(res, 'tap'); return; } if (!res) { onPin(null); return; } onPin(res); };

  const isActiveHere = active && targets.some((t) => t.id === active.id);
  const focusId = isActiveHere ? active.id : null;
  const anchor = isActiveHere ? anchorOf(active) : null;
  const trans = (p, ms = 200) => (reduce ? undefined : `${p} ${ms}ms ease`);
  const NW = 168, NH = 56;

  let tooltip = null;
  if (!coarse && isActiveHere && anchor) {
    const meta = targets.find((t) => t.id === active.id);
    if (meta) tooltip = <TargetTooltip meta={meta} kindLabel={TIER_LABEL.node} accentTitle={active.id === spec.primaryKey} xPct={(anchor.x / width) * 100} yPct={(anchor.y / height) * 100} isPin={!!pinned && active.id === pinned.id} pal={pal} accent={accent} reduce={reduce} entered={entered} onUnpin={() => onPin(null)} valueText={null} />;
  }

  return (
    <div style={{ position: 'relative' }}>
      <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} width="100%" role="group" aria-label="Governed loop diagram" style={{ display: 'block', cursor: coarse ? 'pointer' : 'crosshair', touchAction: 'manipulation' }} onMouseMove={onMove} onMouseLeave={() => { if (!coarse && !pinned) onActive(null, 'hover'); }} onClick={onClick}>
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={pal.grid} strokeWidth="1" strokeDasharray="2 7" />
        <text x={cx} y={cy + 4} textAnchor="middle" style={halo(pal, 9, pal.text4)}>{spec.loop.centerLabel?.toUpperCase()}</text>
        {/* arrows */}
        <g style={{ opacity: entered ? 0.7 : 0, transition: reduce ? 'opacity 320ms ease' : 'opacity 800ms ease 200ms' }}>
          {geom.arrows.map((d, i) => <path key={`ar${i}`} d={d} fill={accent} opacity="0.7" />)}
        </g>
        {/* nodes */}
        {pos.map((n, i) => {
          const on = focusId === n.id;
          const isP = n.id === spec.primaryKey;
          return (
            <g key={n.id} style={{ opacity: entered ? (focusId && !on ? 0.45 : 1) : 0, transformOrigin: `${n.x}px ${n.y}px`, transform: entered ? 'none' : 'scale(0.9)', transition: reduce ? 'opacity 300ms ease' : `opacity 500ms ease ${120 + i * 80}ms, transform 500ms cubic-bezier(0.2,0.7,0.2,1) ${120 + i * 80}ms` }}>
              <rect x={n.x - NW / 2} y={n.y - NH / 2} width={NW} height={NH} rx={8} fill={pal.surface} stroke={on || isP ? accent : pal.borderHi} strokeWidth={on ? 1.6 : 1} style={{ transition: trans('stroke') }} />
              <text x={n.x} y={n.y - 4} textAnchor="middle" style={haloSans(pal, 13.5, isP ? accent : pal.text1, 600)}>{n.label}</text>
              <text x={n.x} y={n.y + 13} textAnchor="middle" style={halo(pal, 8.5, pal.text4)}>{n.sub}</text>
            </g>
          );
        })}
        {targets.map((t) => <FocusChip key={`hit${t.id}`} t={t} anchor={anchorOf(t)} coarse={coarse} pinned={pinned} onActive={onActive} onPin={onPin} mkActive={(tt) => ({ ...tt })} />)}
      </svg>
      {tooltip}
    </div>
  );
}

/* ── FlowSvg — staged directed flow (bottleneck maps, validation gauntlets) ──*/
function FlowSvg({ spec, width, height, pal, accent, reduce, entered, coarse, touch, targets, active, pinned, onActive, onPin }) {
  const svgRef = useRef(null);
  const stages = spec.flow.stages;
  const N = stages.length;
  const pad = { l: 18, r: 18, t: 42, b: 22 };
  const colW = (width - pad.l - pad.r) / N;
  const NW = Math.min(colW - 26, 152), NH = 46;
  const avail = height - pad.t - pad.b;
  const pos = [];
  stages.forEach((st, i) => {
    const cx = pad.l + colW * (i + 0.5);
    const m = st.nodes.length;
    st.nodes.forEach((nd, j) => { pos.push({ ...nd, x: cx, y: pad.t + avail * ((j + 1) / (m + 1)), stageIdx: i }); });
  });
  const byId = (id) => pos.find((p) => p.id === id);
  const connectors = useMemo(() => {
    const out = [];
    for (let i = 0; i < N - 1; i++) {
      stages[i].nodes.forEach((an) => stages[i + 1].nodes.forEach((bn) => {
        const p1 = byId(an.id), p2 = byId(bn.id);
        const x1 = p1.x + NW / 2, x2 = p2.x - NW / 2, dx = (x2 - x1) * 0.45;
        out.push(`M${x1} ${p1.y} C${x1 + dx} ${p1.y} ${x2 - dx} ${p2.y} ${x2} ${p2.y}`);
      }));
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  const anchorOf = (a) => { const p = byId(a.id); return p ? { x: p.x, y: p.y } : null; };
  const resolve = (mx, my) => { let best = null, bd = Math.max(touch ? 40 : 30, NW / 2); pos.forEach((p) => { const d = Math.hypot(mx - p.x, my - p.y); if (d < bd) { bd = d; best = p; } }); return best ? targets.find((t) => t.id === best.id) : null; };
  const toVB = (e) => { const r = svgRef.current.getBoundingClientRect(); return [(e.clientX - r.left) * (width / r.width), (e.clientY - r.top) * (height / r.height)]; };
  const onMove = (e) => { if (coarse || pinned) return; onActive(resolve(...toVB(e)), 'hover'); };
  const onClick = (e) => { const res = resolve(...toVB(e)); if (coarse) { onActive(res, 'tap'); return; } if (!res) { onPin(null); return; } onPin(res); };

  const isActiveHere = active && targets.some((t) => t.id === active.id);
  const focusId = isActiveHere ? active.id : null;
  const anchor = isActiveHere ? anchorOf(active) : null;
  const trans = (p, ms = 200) => (reduce ? undefined : `${p} ${ms}ms ease`);

  let tooltip = null;
  if (!coarse && isActiveHere && anchor) {
    const meta = targets.find((t) => t.id === active.id);
    if (meta) tooltip = <TargetTooltip meta={meta} kindLabel={TIER_LABEL.node} accentTitle={active.id === spec.primaryKey} xPct={(anchor.x / width) * 100} yPct={(anchor.y / height) * 100} isPin={!!pinned && active.id === pinned.id} pal={pal} accent={accent} reduce={reduce} entered={entered} onUnpin={() => onPin(null)} valueText={null} />;
  }

  return (
    <div style={{ position: 'relative' }}>
      <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} width="100%" role="group" aria-label="Staged flow diagram" style={{ display: 'block', cursor: coarse ? 'pointer' : 'crosshair', touchAction: 'manipulation' }} onMouseMove={onMove} onMouseLeave={() => { if (!coarse && !pinned) onActive(null, 'hover'); }} onClick={onClick}>
        {stages.map((st, i) => st.label ? <text key={`sl${i}`} x={pad.l + colW * (i + 0.5)} y={pad.t - 18} textAnchor="middle" style={halo(pal, 8.5, pal.text4)}>{st.label.toUpperCase()}</text> : null)}
        <g style={{ opacity: entered ? 0.5 : 0, transition: reduce ? 'opacity 320ms ease' : 'opacity 800ms ease 200ms' }}>
          {connectors.map((d, i) => <path key={`c${i}`} d={d} fill="none" stroke={accent} strokeWidth="1" opacity="0.5" />)}
        </g>
        {pos.map((n) => {
          const on = focusId === n.id;
          const isP = n.id === spec.primaryKey;
          return (
            <g key={n.id} style={{ opacity: entered ? (focusId && !on ? 0.4 : 1) : 0, transformOrigin: `${n.x}px ${n.y}px`, transform: entered ? 'none' : 'scale(0.92)', transition: reduce ? 'opacity 300ms ease' : `opacity 460ms ease ${100 + n.stageIdx * 90}ms, transform 460ms cubic-bezier(0.2,0.7,0.2,1) ${100 + n.stageIdx * 90}ms` }}>
              <rect x={n.x - NW / 2} y={n.y - NH / 2} width={NW} height={NH} rx={8} fill={pal.surface} stroke={on || isP ? accent : pal.borderHi} strokeWidth={on ? 1.6 : 1} style={{ transition: trans('stroke') }} />
              <text x={n.x} y={n.y - 3} textAnchor="middle" style={haloSans(pal, 12.5, isP ? accent : pal.text1, 600)}>{n.label}</text>
              {n.sub && <text x={n.x} y={n.y + 13} textAnchor="middle" style={halo(pal, 8, pal.text4)}>{n.sub}</text>}
            </g>
          );
        })}
        {targets.map((t) => <FocusChip key={`hit${t.id}`} t={t} anchor={anchorOf(t)} coarse={coarse} pinned={pinned} onActive={onActive} onPin={onPin} mkActive={(tt) => ({ ...tt })} />)}
      </svg>
      {tooltip}
    </div>
  );
}

// Bespoke brush-influenced scorecard glyphs (shape-coded, not colour-only).
function scoreCheckPath(cx, cy, r, seed) {
  return Brush.brushSegment(cx - r, cy + 0.5, cx - r * 0.3, cy + r - 1, { seed, weight: 0.85, intensity: 0.45, taperEnds: true, waver: 0.08 })
    + Brush.brushSegment(cx - r * 0.3, cy + r - 1, cx + r + 1, cy - r, { seed: seed + 4, weight: 0.85, intensity: 0.45, taperEnds: true, waver: 0.08 });
}
function scoreFailPath(cx, cy, r, seed) {
  const k = r * 0.82;
  return Brush.brushSegment(cx - k, cy - k, cx + k, cy + k, { seed, weight: 0.7, intensity: 0.45, taperEnds: true, waver: 0.06 })
    + Brush.brushSegment(cx - k, cy + k, cx + k, cy - k, { seed: seed + 4, weight: 0.7, intensity: 0.45, taperEnds: true, waver: 0.06 });
}
// ScoreHalf — bespoke organic ring with a brush-filled left half (partial credit).
function scoreHalfPaths(cx, cy, r, seed) {
  const ring = Brush.enso(cx, cy, r, { seed, weight: 0.6, intensity: 0.5, gap: 0.04, gapAngle: -Math.PI / 2 });
  const pts = [];
  for (let k = 0; k <= 9; k++) { const a = Math.PI / 2 + Math.PI * (k / 9); pts.push({ x: cx + Math.cos(a) * (r - 0.8), y: cy + Math.sin(a) * (r - 0.8) }); }
  return { ring, fill: Brush.closedBezier(pts) };
}

/* ── ribbonRing — closed ink ribbon of varying thickness (for systemLoop) ────*/
function ribbonRing(pts) {
  const n = pts.length, outer = [], inner = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i], a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
    const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L;
    outer.push({ x: p.x + nx * p.w, y: p.y + ny * p.w });
    inner.push({ x: p.x - nx * p.w, y: p.y - ny * p.w });
  }
  return `${Brush.closedBezier(outer)} ${Brush.closedBezier(inner.reverse())}`;
}

/* ── SystemLoopSvg — reflexive flywheel (reinforcement + reversal) ───────────*
 * An asymmetric momentum ring whose weight, comet trail, and pressure grain
 * ramp clockwise (self-reinforcement building), with a muted counter-arc and a
 * break cue showing the loop can run in reverse. Optional governorId marks the
 * node that forces the reversal (e.g. tripwires). Nodes are stations on the rim. */
function SystemLoopSvg({ spec, width, height, pal, accent, reduce, entered, coarse, touch, targets, active, pinned, onActive, onPin }) {
  const svgRef = useRef(null);
  const sl = spec.systemLoop;
  const nodes = sl.nodes;
  const M = nodes.length;
  const cx = width / 2, cy = height / 2;
  const rx = Math.min(width * 0.29, 290), ry = height * 0.34;
  const A0 = -Math.PI / 2;
  const asymR = (a) => 1 + 0.17 * Math.sin(a * 2 + 0.7) + 0.07 * Math.sin(a * 3 - 0.4); // not an oval
  const at = (a) => ({ x: cx + Math.cos(a) * rx * asymR(a), y: cy + Math.sin(a) * ry * asymR(a) * 0.94 });
  const nodeAng = nodes.map((_, i) => A0 + (i / M) * Math.PI * 2);
  const governorIdx = sl.governorId ? nodes.findIndex((n) => n.id === sl.governorId) : -1;

  const geom = useMemo(() => {
    const rng = Brush.mulberry32(7);
    const S = 140, ring = [];
    for (let i = 0; i <= S; i++) { const a = A0 + (i / S) * Math.PI * 2; const p = at(a); ring.push({ ...p, w: 1.2 + 2.8 * (i / S) * (i / S) }); }
    const comet = [];
    for (let i = 0; i < 56; i++) { const prog = i / 55, a = A0 + prog * Math.PI * 2, p = at(a); comet.push({ x: p.x, y: p.y, r: 0.7 + 2.7 * prog, op: 0.16 + 0.55 * prog }); }
    const grain = [];
    for (let i = 0; i < 64; i++) { const prog = 0.52 + 0.48 * rng(); const a = A0 + prog * Math.PI * 2; const p = at(a); const inset = 5 + rng() * 17; grain.push({ x: p.x - Math.cos(a) * inset + (rng() - 0.5) * 9, y: p.y - Math.sin(a) * inset * 0.94 + (rng() - 0.5) * 9, r: 0.5 + rng() * 1.1, op: 0.05 + 0.13 * prog }); }
    const chev = [];
    for (let k = 0; k < 3; k++) { const prog = 0.28 + k * 0.30, a = A0 + prog * Math.PI * 2, p = at(a), tang = a + Math.PI / 2; chev.push(Brush.brushArrow(p.x, p.y, 12 + k * 4, tang, { seed: 70 + k * 5, weight: 0.48 + k * 0.12, intensity: 0.5 })); }
    const startIdx = governorIdx >= 0 ? governorIdx : M - 1;
    const sa = nodeAng[startIdx];
    const inner = [];
    for (let i = 0; i <= 40; i++) { const a = sa - (i / 40) * Math.PI * 1.05; const p = at(a); inner.push({ x: cx + (p.x - cx) * 0.58, y: cy + (p.y - cy) * 0.58 }); }
    const rmid = inner[Math.round(inner.length * 0.55)];
    const rev = Brush.brushArrow(rmid.x, rmid.y, 11, sa - Math.PI - Math.PI / 2, { seed: 131, weight: 0.45, intensity: 0.45 });
    const gp = at(sa); // break tick across the rim at the governor / last node
    const brk = `M${(gp.x - cx) * 0.9 + cx} ${(gp.y - cy) * 0.9 + cy} L${(gp.x - cx) * 1.12 + cx} ${(gp.y - cy) * 1.12 + cy}`;
    return { ringD: ribbonRing(ring), comet, grain, chev, revArc: Brush.smoothOpen(inner), rev, brk };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  const npos = nodeAng.map((a, i) => ({ ...nodes[i], a, ...at(a) }));
  const anchorOf = (act) => { const p = npos.find((pp) => pp.id === act.id); return p ? { x: p.x, y: p.y } : null; };
  const resolve = (mx, my) => { let best = null, bd = touch ? 40 : 32; npos.forEach((p) => { const d = Math.hypot(mx - p.x, my - p.y); if (d < bd) { bd = d; best = p; } }); return best ? targets.find((t) => t.id === best.id) : null; };
  const toVB = (e) => { const r = svgRef.current.getBoundingClientRect(); return [(e.clientX - r.left) * (width / r.width), (e.clientY - r.top) * (height / r.height)]; };
  const onMove = (e) => { if (coarse || pinned) return; onActive(resolve(...toVB(e)), 'hover'); };
  const onClick = (e) => { const res = resolve(...toVB(e)); if (coarse) { onActive(res, 'tap'); return; } if (!res) { onPin(null); return; } onPin(res); };

  const isActiveHere = active && targets.some((t) => t.id === active.id);
  const focusId = isActiveHere ? active.id : null;
  const anchor = isActiveHere ? anchorOf(active) : null;
  const trans = (p, ms = 200) => (reduce ? undefined : `${p} ${ms}ms ease`);

  let tooltip = null;
  if (!coarse && isActiveHere && anchor) {
    const meta = targets.find((t) => t.id === active.id);
    if (meta) tooltip = <TargetTooltip meta={meta} kindLabel="NODE" accentTitle={active.id === spec.primaryKey} xPct={(anchor.x / width) * 100} yPct={(anchor.y / height) * 100} isPin={!!pinned && active.id === pinned.id} pal={pal} accent={accent} reduce={reduce} entered={entered} onUnpin={() => onPin(null)} valueText={null} />;
  }

  return (
    <div style={{ position: 'relative' }}>
      <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} width="100%" role="group" aria-label="Reflexive feedback flywheel" style={{ display: 'block', cursor: coarse ? 'pointer' : 'crosshair', touchAction: 'manipulation' }} onMouseMove={onMove} onMouseLeave={() => { if (!coarse && !pinned) onActive(null, 'hover'); }} onClick={onClick}>
        <g style={{ opacity: entered ? 1 : 0, transition: reduce ? 'opacity 360ms ease' : 'opacity 900ms ease 80ms' }}>
          {/* pressure grain (reinforcement building) */}
          {geom.grain.map((gr, i) => <circle key={`gr${i}`} cx={gr.x} cy={gr.y} r={gr.r} fill={accent} opacity={gr.op} />)}
          {/* momentum ring + comet trail */}
          <path d={geom.ringD} fill={accent} fillRule="evenodd" opacity={pal.name === 'light' ? 0.16 : 0.14} />
          {geom.comet.map((c, i) => <circle key={`cm${i}`} cx={c.x} cy={c.y} r={c.r} fill={accent} opacity={c.op} />)}
        </g>
        <g style={{ opacity: entered ? 1 : 0, transition: reduce ? 'opacity 320ms ease' : 'opacity 800ms ease 260ms' }}>
          {geom.chev.map((d, i) => <path key={`cv${i}`} d={d} fill={accent} opacity="0.8" />)}
          {/* reversal / break path (the loop can run the other way) */}
          <path d={geom.revArc} fill="none" stroke={pal.bandStress} strokeWidth="1" strokeDasharray="3 5" opacity="0.55" />
          <path d={geom.rev} fill={pal.bandStress} opacity="0.7" />
          <path d={geom.brk} stroke={pal.bandStress} strokeWidth="1.4" opacity="0.8" />
        </g>
        {sl.centerLabel && <text x={cx} y={cy - 2} textAnchor="middle" style={halo(pal, 9, pal.text4)}>{sl.centerLabel.toUpperCase()}</text>}
        {sl.reversalLabel && <text x={cx} y={cy + 14} textAnchor="middle" style={{ ...halo(pal, 8, pal.bandStressText), fontStyle: 'italic' }}>{sl.reversalLabel}</text>}
        {npos.map((n) => {
          const on = focusId === n.id;
          const isP = n.id === spec.primaryKey;
          const isGov = n.id === sl.governorId;
          const outX = Math.cos(n.a), outY = Math.sin(n.a);
          const lAnchor = outX > 0.3 ? 'start' : outX < -0.3 ? 'end' : 'middle';
          return (
            <g key={n.id} style={{ opacity: entered ? (focusId && !on ? 0.4 : 1) : 0, transition: trans('opacity') }}>
              <line x1={cx + (n.x - cx) * 0.9} y1={cy + (n.y - cy) * 0.9} x2={cx + (n.x - cx) * 1.07} y2={cy + (n.y - cy) * 1.07} stroke={pal.cardBorder} strokeWidth="1" />
              <path d={Brush.inkDot(n.x, n.y, on || isP || isGov ? 5 : 4, { seed: 40 + n.id.length * 3, intensity: 0.8 })} fill={isP || on ? accent : isGov ? pal.bandStress : pal.markInk} />
              {(on || isGov) && <circle cx={n.x} cy={n.y} r={on ? 9 : 8} fill="none" stroke={on ? accent : pal.bandStress} strokeWidth="1.1" opacity="0.9" />}
              <text x={n.x + outX * 16} y={n.y + outY * 16 + 3} textAnchor={lAnchor} style={haloSans(pal, 11.5, isP ? accent : pal.text1, 600)}>{n.label}</text>
            </g>
          );
        })}
        {targets.map((t) => <FocusChip key={`hit${t.id}`} t={t} anchor={anchorOf(t)} coarse={coarse} pinned={pinned} onActive={onActive} onPin={onPin} mkActive={(tt) => ({ ...tt })} />)}
      </svg>
      {tooltip}
    </div>
  );
}

/* ── GovernanceLoopSvg — beginner governed path (thesis → … → adjust ↩) ───────*
 * The SMALLEST loop that teaches the mental model: a calm left-to-right path of
 * 4–5 steps with a governing CHECKPOINT (the tripwire — a quiet gate, never an
 * alarm) and a subtle return arc carrying evidence back to the thesis. It reads
 * at a glance WITHOUT interaction; hover / pin / tap only add the "why".
 * Deliberately NOT an orbit — distinct from systemLoop (a reflexive ring). */
function GovernanceLoopSvg({ spec, width, height, pal, accent, reduce, entered, coarse, touch, targets, active, pinned, onActive, onPin }) {
  const svgRef = useRef(null);
  const gl = spec.governanceLoop;
  const nodes = gl.nodes;
  const N = nodes.length;
  const govIdx = gl.governorId ? nodes.findIndex((n) => n.id === gl.governorId) : -1;
  const pad = { l: 24, r: 24, t: 26, b: 24 };
  const innerW = width - pad.l - pad.r;
  const colW = innerW / N;
  const rowY = pad.t + 52;
  const NH = 44, NHg = 54;                       // the checkpoint sits a touch taller
  const NW = Math.min(colW - 16, 128);
  const pos = nodes.map((nd, i) => ({ ...nd, i, x: pad.l + colW * (i + 0.5), y: rowY, gov: i === govIdx, h: i === govIdx ? NHg : NH }));
  const byId = (id) => pos.find((p) => p.id === id);
  const sBottom = rowY + NH / 2 + 3;

  const geom = useMemo(() => {
    const arrows = [];                           // rightward brush arrows in the gaps
    for (let i = 0; i < N - 1; i++) {
      const a = pos[i], b = pos[i + 1];
      const x0 = a.x + NW / 2, tip = b.x - NW / 2 - 4, len = Math.max(10, tip - x0);
      arrows.push(Brush.brushArrow(tip, rowY, len, 0, { seed: 50 + i * 13, weight: 0.66, intensity: 0.5 }));
    }
    // subtle return arc underneath: from the last node back to the first; control
    // points are pushed below the viewBox so the belly is low and round, framing
    // the "evidence updates the thesis" caption inside the loop.
    const sx = pos[N - 1].x, ex = pos[0].x, arcY = height + 36;
    const arc = `M${sx} ${sBottom} C${sx} ${arcY} ${ex} ${arcY} ${ex} ${sBottom}`;
    const ret = Brush.brushArrow(ex, sBottom + 1, 11, -Math.PI / 2, { seed: 131, weight: 0.6, intensity: 0.5 }); // ↑ into thesis
    const bellyY = 0.25 * sBottom + 0.75 * arcY; // cubic midpoint y (lowest visible point)
    return { arrows, arc, ret, labX: (sx + ex) / 2, labY: Math.min(rowY + NH / 2 + 36, (sBottom + bellyY) / 2) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  const anchorOf = (a) => { const p = byId(a.id); return p ? { x: p.x, y: p.y } : null; };
  const resolve = (mx, my) => { let best = null, bd = Math.max(touch ? 40 : 30, NW / 2); pos.forEach((p) => { const d = Math.hypot(mx - p.x, my - p.y); if (d < bd) { bd = d; best = p; } }); return best ? targets.find((t) => t.id === best.id) : null; };
  const toVB = (e) => { const r = svgRef.current.getBoundingClientRect(); return [(e.clientX - r.left) * (width / r.width), (e.clientY - r.top) * (height / r.height)]; };
  const onMove = (e) => { if (coarse || pinned) return; onActive(resolve(...toVB(e)), 'hover'); };
  const onClick = (e) => { const res = resolve(...toVB(e)); if (coarse) { onActive(res, 'tap'); return; } if (!res) { onPin(null); return; } onPin(res); };

  const isActiveHere = active && targets.some((t) => t.id === active.id);
  const focusId = isActiveHere ? active.id : null;
  const anchor = isActiveHere ? anchorOf(active) : null;
  const trans = (p, ms = 200) => (reduce ? undefined : `${p} ${ms}ms ease`);

  let tooltip = null;
  if (!coarse && isActiveHere && anchor) {
    const meta = targets.find((t) => t.id === active.id);
    if (meta) tooltip = <TargetTooltip meta={meta} kindLabel={active.id === gl.governorId ? 'CHECKPOINT' : 'STEP'} accentTitle={active.id === spec.primaryKey} xPct={(anchor.x / width) * 100} yPct={(anchor.y / height) * 100} isPin={!!pinned && active.id === pinned.id} pal={pal} accent={accent} reduce={reduce} entered={entered} onUnpin={() => onPin(null)} valueText={null} />;
  }

  return (
    <div style={{ position: 'relative' }}>
      <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} width="100%" role="group" aria-label="Governed path: a thesis creates exposure and risk; a tripwire checkpoint governs the response, which updates the thesis." style={{ display: 'block', cursor: coarse ? 'pointer' : 'crosshair', touchAction: 'manipulation' }} onMouseMove={onMove} onMouseLeave={() => { if (!coarse && !pinned) onActive(null, 'hover'); }} onClick={onClick}>
        {/* connectors + return arc (quiet; the nodes carry the meaning) */}
        <g style={{ opacity: entered ? 0.7 : 0, transition: reduce ? 'opacity 320ms ease' : 'opacity 800ms ease 220ms' }}>
          {geom.arrows.map((d, i) => <path key={`ar${i}`} d={d} fill={accent} opacity="0.7" />)}
          <path d={geom.arc} fill="none" stroke={pal.tierReference} strokeWidth="1" strokeDasharray="3 5" opacity="0.7" />
          <path d={geom.ret} fill={pal.tierReference} opacity="0.85" />
          <text x={geom.labX} y={geom.labY} textAnchor="middle" style={{ ...halo(pal, 8.5, pal.text4), fontStyle: 'italic' }}>{(gl.returnLabel || 'evidence updates the thesis').toUpperCase()}</text>
        </g>
        {pos.map((n) => {
          const on = focusId === n.id;
          const isP = n.id === spec.primaryKey;
          const stroke = on || isP ? accent : n.gov ? pal.bandRegime : pal.borderHi;
          const top = n.y - n.h / 2, bot = n.y + n.h / 2;
          return (
            <g key={n.id} style={{ opacity: entered ? (focusId && !on ? 0.4 : 1) : 0, transformOrigin: `${n.x}px ${n.y}px`, transform: entered ? 'none' : 'scale(0.92)', transition: reduce ? 'opacity 300ms ease' : `opacity 460ms ease ${110 + n.i * 90}ms, transform 460ms cubic-bezier(0.2,0.7,0.2,1) ${110 + n.i * 90}ms` }}>
              {/* checkpoint gate posts — a quiet guardrail, not an alarm */}
              {n.gov && [-1, 1].map((s) => <line key={s} x1={n.x + s * (NW / 2)} y1={top - 7} x2={n.x + s * (NW / 2)} y2={bot + 7} stroke={pal.bandRegime} strokeWidth="2" strokeLinecap="round" opacity={on ? 0.9 : 0.7} />)}
              <rect x={n.x - NW / 2} y={top} width={NW} height={n.h} rx={8} fill={pal.surface} stroke={stroke} strokeWidth={on ? 1.7 : n.gov ? 1.4 : 1} style={{ transition: trans('stroke') }} />
              <text x={n.x} y={n.y - (n.sub ? 4 : -4)} textAnchor="middle" style={haloSans(pal, 12.5, isP ? accent : pal.text1, 600)}>{n.label}</text>
              {n.sub && <text x={n.x} y={n.y + 13} textAnchor="middle" style={halo(pal, 7.5, n.gov ? pal.bandRegimeText : pal.text4)}>{n.sub}</text>}
            </g>
          );
        })}
        {targets.map((t) => <FocusChip key={`hit${t.id}`} t={t} anchor={anchorOf(t)} coarse={coarse} pinned={pinned} onActive={onActive} onPin={onPin} mkActive={(tt) => ({ ...tt })} />)}
      </svg>
      {tooltip}
    </div>
  );
}

/* ── ReflexivityLoopSvg — authored off-centre figure-eight (single consumer:
 * p2-markets-feed-back). Two brush RIBBONS (Brush.brushLoopPath) are the loops
 * themselves — no cards, no grid, no spine. Reinforcing (accent) + reversing
 * (stress) share ONE filled Price coin at the crossing; integrated brush
 * arrowheads carry the causal direction; <=3 marginal annotations name the
 * transmission points. Materially taller canvas; mobile authors its own tall
 * two-ring geometry. Supersedes the card-grid feedbackLoop for this chart. */
// FINAL best-of-breed: stacked-lobes-v2 base with the Price node upgraded to a
// FILLED blended "coin" (accent top-half + stress bottom-half wedges + outer ring)
// at a clearly-larger radius, so it reads as the shared anchor at the crossing
// (the one weakness of the winning render). Everything else is drop-in verbatim.

function ReflexivityLoopSvg({ spec, width, height, pal, accent, reduce, entered, coarse, touch, targets, active, pinned, onActive, onPin }) {
  const svgRef = useRef(null);
  const rl = spec.reflexivityLoop;
  const M = coarse;
  const VW = width;
  const VH = M ? 1360 : height;                                   // coarse authors its own tall viewBox

  // type + mark scale (viewBox units). Coarse deliberately large so labels stay
  // above the ~9px floor after the phone down-scale; micro-annotations drop on coarse.
  const F = M ? { node: 27, price: 31, lane: 22, note: 18, micro: 0 }
              : { node: 15.5, price: 17, lane: 10.5, note: 9, micro: 10.5 };
  // Price is a prominent filled coin (~1.4x node) so it commands as the crossing
  // anchor; node dots enlarged so both register as confident marks, not specks.
  const R = M ? { node: 15, price: 22, arrow: 36, weight: 12 }
             : { node: 10, price: 14, arrow: 22, weight: 7 };

  // Desktop crossing sits LEFT of the horizontal centre (off-axis, authored — not a
  // machined orbit). Mobile keeps the seam centred between the two stacked rings.
  const PX = VW * (M ? 0.5 : 0.46);
  const PY = VH * 0.5;
  const P = { x: PX, y: PY };

  const fr = (fx, fy) => ({ x: VW * fx, y: VH * fy });
  // Desktop lobes are deliberately ASYMMETRIC: the reinforcing lobe is wider/taller
  // and skews up-right; the reversing lobe is smaller and shifts down-left. Extremes
  // span x 0.135–0.870 (>=70% width). This breaks the mirror-symmetry the earlier
  // pass read as mechanical.
  const POS = M ? {
    rein: { capital: fr(0.80, 0.44), buildout: fr(0.72, 0.205), fundamentals: fr(0.28, 0.205), validation: fr(0.20, 0.44) },
    rev:  { capital: fr(0.20, 0.56), buildout: fr(0.28, 0.795), fundamentals: fr(0.72, 0.795), validation: fr(0.80, 0.56) },
    ctrTop: fr(0.5, 0.31), ctrBot: fr(0.5, 0.69),
  } : {
    rein: { capital: fr(0.870, 0.360), buildout: fr(0.790, 0.095), fundamentals: fr(0.330, 0.125), validation: fr(0.135, 0.355) },
    rev:  { capital: fr(0.160, 0.610), buildout: fr(0.275, 0.855), fundamentals: fr(0.680, 0.835), validation: fr(0.795, 0.605) },
    ctrTop: fr(0.520, 0.235), ctrBot: fr(0.478, 0.730),
  };
  const off = M ? { x: 34, y: 15 } : { x: 26, y: 8 };
  const reinStart = { x: P.x + off.x, y: P.y - off.y }, reinEnd = { x: P.x - off.x, y: P.y - off.y };
  const revStart = { x: P.x - off.x, y: P.y + off.y }, revEnd = { x: P.x + off.x, y: P.y + off.y };

  const reinSats = rl.reinforce, revSats = rl.reverse;
  const order = ['capital', 'buildout', 'fundamentals', 'validation'];
  const seqPts = (map, s, e) => [s, ...order.map((k) => map[k]), e];

  const nodes = [{ stage: rl.shared, label: rl.priceLabel, x: P.x, y: P.y, price: true, lobe: 'shared', ctr: null }];
  reinSats.forEach((sd) => nodes.push({ ...sd, x: POS.rein[sd.stage].x, y: POS.rein[sd.stage].y, tone: 'rein', lobe: 'rein', ctr: POS.ctrTop }));
  revSats.forEach((sd) => nodes.push({ ...sd, x: POS.rev[sd.stage].x, y: POS.rev[sd.stage].y, tone: 'rev', lobe: 'rev', ctr: POS.ctrBot }));
  const byStageRein = {}; nodes.forEach((n) => { if (n.lobe === 'rein') byStageRein[n.stage] = n; });
  const stageAnchor = (id) => (id === rl.shared ? { x: P.x, y: P.y } : (byStageRein[id] ? { x: byStageRein[id].x, y: byStageRein[id].y } : null));

  const toneCol = (t) => (t === 'rev' ? pal.bandStress : accent);
  const toneTxt = (t) => (t === 'rev' ? pal.bandStressText : accent);

  const geom = useMemo(() => {
    const reinChain = [P, POS.rein.capital, POS.rein.buildout, POS.rein.fundamentals, POS.rein.validation, P];
    const revChain = [P, POS.rev.capital, POS.rev.buildout, POS.rev.fundamentals, POS.rev.validation, P];
    const reinRibbon = Brush.brushLoopPath(seqPts(POS.rein, reinStart, reinEnd), { weight: R.weight, taperIn: 0.11, taperOut: 0.11, filaments: 1, intensity: 0.5, seed: 41, step: M ? 8 : 6 });
    const revRibbon = Brush.brushLoopPath(seqPts(POS.rev, revStart, revEnd), { weight: R.weight, taperIn: 0.11, taperOut: 0.11, filaments: 1, intensity: 0.5, seed: 88, step: M ? 8 : 6 });
    const arrowsFor = (chain, tone, seed0) => {
      const out = [];
      for (let i = 1; i < chain.length; i++) {
        const a = chain[i - 1], b = chain[i];
        const dir = Math.atan2(b.y - a.y, b.x - a.x);
        const rB = (i === chain.length - 1) ? R.price : R.node;
        const back = rB + (M ? 15 : 10);
        const tip = { x: b.x - Math.cos(dir) * back, y: b.y - Math.sin(dir) * back };
        out.push({ d: Brush.brushArrow(tip.x, tip.y, R.arrow, dir, { seed: seed0 + i * 7, weight: M ? 1.55 : 1.4, intensity: 0.5, head: 0.48 }), tone });
      }
      return out;
    };
    const arrows = [...arrowsFor(reinChain, 'rein', 60), ...arrowsFor(revChain, 'rev', 130)];
    const anns = M ? [] : (rl.annotations || []).slice(0, 3).map((an) => {
      const a = an.from === rl.shared ? P : POS.rein[an.from];
      const b = an.to === rl.shared ? P : POS.rein[an.to];
      // the return edge (…→price) converges on the crossing, where the ribbon tail
      // would graze the label; park it in the clear gap just left of the waist instead.
      if (an.to === rl.shared) return { text: an.text, x: P.x - VW * 0.19, y: P.y + 2, anchor: 'middle' };
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
      const nx = -dy / L, ny = dx / L;
      const outward = ((mid.x - POS.ctrTop.x) * nx + (mid.y - POS.ctrTop.y) * ny) >= 0 ? 1 : -1;
      const oGap = R.weight + 24;
      // place the note INSIDE the lobe (toward centre) and flow the text toward the
      // open interior — the widened lobe leaves no room outboard, and this keeps wide
      // notes off the outer ribbon shoulder and off the top lane-note row.
      const inx = -nx * outward, iny = -ny * outward;
      const ax = mid.x + inx * oGap, ay = Math.max(58, mid.y + iny * oGap);
      const anchor = inx > 0.4 ? 'start' : inx < -0.4 ? 'end' : 'middle';
      return { text: an.text, x: ax, y: ay, anchor };
    });
    return { reinRibbon, revRibbon, arrows, anns };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, VH, coarse]);

  const anchorOf = (a) => stageAnchor(a.id);
  const resolve = (mx, my) => { let best = null, bd = Math.max(touch ? 46 : 34, R.node * (M ? 2.4 : 3.2)); nodes.forEach((p) => { const d = Math.hypot(mx - p.x, my - p.y); if (d < bd) { bd = d; best = p; } }); return best ? targets.find((t) => t.id === best.stage) : null; };
  const toVB = (e) => { const r = svgRef.current.getBoundingClientRect(); return [(e.clientX - r.left) * (VW / r.width), (e.clientY - r.top) * (VH / r.height)]; };
  const onMove = (e) => { if (coarse || pinned) return; onActive(resolve(...toVB(e)), 'hover'); };
  const onClick = (e) => { const res = resolve(...toVB(e)); if (coarse) { onActive(res, 'tap'); return; } if (!res) { onPin(null); return; } onPin(res); };

  const isActiveHere = active && targets.some((t) => t.id === active.id);
  const focusId = isActiveHere ? active.id : null;
  const anchor = isActiveHere ? anchorOf(active) : null;
  const trans = (p, ms = 220) => (reduce ? undefined : `${p} ${ms}ms ease`);
  const grpIn = (delay) => ({ opacity: entered ? 1 : 0, transition: reduce ? 'opacity 320ms ease' : `opacity 720ms ease ${delay}ms` });

  let tooltip = null;
  if (!coarse && isActiveHere && anchor) {
    const meta = targets.find((t) => t.id === active.id);
    if (meta) tooltip = <TargetTooltip meta={meta} kindLabel="STAGE" accentTitle={active.id === spec.primaryKey} xPct={(anchor.x / VW) * 100} yPct={(anchor.y / VH) * 100} isPin={!!pinned && active.id === pinned.id} pal={pal} accent={accent} reduce={reduce} entered={entered} onUnpin={() => onPin(null)} valueText={null} />;
  }

  const ribbonFill = (tone, on, other) => (other ? (M ? 0.34 : 0.28) : (on ? 1 : 0.9));

  return (
    <div style={{ position: 'relative' }}>
      <svg ref={svgRef} viewBox={`0 0 ${VW} ${VH}`} width="100%" role="group"
        aria-label={spec.ariaSummary || 'Reflexivity drawn as an off-centre figure-eight sharing one Price node at the crossing.'}
        style={{ display: 'block', cursor: coarse ? 'pointer' : 'crosshair', touchAction: 'manipulation' }} onMouseMove={onMove} onMouseLeave={() => { if (!coarse && !pinned) onActive(null, 'hover'); }} onClick={onClick}>

        {/* lobe labels + doctrine sub-notes (subordinate; the ribbons lead) */}
        <g style={grpIn(80)}>
          <text x={M ? VW * 0.5 : 20} y={M ? VH * 0.045 : 26} textAnchor={M ? 'middle' : 'start'} style={halo(pal, F.lane, toneTxt('rein'), 700)}>{rl.reinforceLabel}</text>
          {!M && rl.reinforceNote && <text x={20} y={40} style={{ ...halo(pal, F.note, pal.text4), fontStyle: 'italic' }}>{rl.reinforceNote}</text>}
          <text x={M ? VW * 0.5 : 20} y={M ? VH * 0.972 : VH - 22} textAnchor={M ? 'middle' : 'start'} style={halo(pal, F.lane, toneTxt('rev'), 700)}>{rl.reverseLabel}</text>
          {!M && rl.reverseNote && <text x={20} y={VH - 9} style={{ ...halo(pal, F.note, pal.text4), fontStyle: 'italic' }}>{rl.reverseNote}</text>}
        </g>

        {/* ribbons — the two lobes, EQUAL weight; brush geometry IS the loop */}
        <g style={grpIn(120)}>
          {[['rein', geom.reinRibbon], ['rev', geom.revRibbon]].map(([tone, rb]) => {
            const on = focusId && (focusId === rl.shared || nodes.some((n) => n.lobe === tone && n.stage === focusId));
            const other = focusId && focusId !== rl.shared && !nodes.some((n) => n.lobe === tone && n.stage === focusId);
            return (
              <g key={tone} style={{ opacity: ribbonFill(tone, on, other), transition: trans('opacity') }}>
                {rb.filaments.map((d, i) => <path key={`f${i}`} d={d} fill={toneCol(tone)} opacity={tone === 'rev' ? 0.44 : 0.32} />)}
                <path d={rb.core} fill={toneCol(tone)} opacity={tone === 'rev' ? (pal.name === 'light' ? 0.95 : 1) : (pal.name === 'light' ? 0.88 : 0.85)} />
              </g>
            );
          })}
        </g>

        {/* directional arrowheads between every stage (carry the causal flow) */}
        <g style={grpIn(320)}>
          {geom.arrows.map((a, i) => <path key={`ar${i}`} d={a.d} fill={toneCol(a.tone)} opacity={0.94} />)}
        </g>

        {/* marginal transition annotations (<=3, subordinate; desktop only) */}
        {geom.anns.map((an, i) => (
          <text key={`an${i}`} x={an.x} y={an.y} textAnchor={an.anchor || 'middle'} style={{ ...halo(pal, F.micro, pal.text3), fontStyle: 'italic' }}>{an.text}</text>
        ))}

        {/* satellite nodes (both lobes) — ink dots + halo'd labels, no cards */}
        {nodes.filter((n) => !n.price).map((n) => {
          const on = focusId === n.stage;
          const dim = focusId && focusId !== n.stage && focusId !== rl.shared;
          const col = toneCol(n.tone);
          const outx = (n.x - n.ctr.x), outy = (n.y - n.ctr.y), ol = Math.hypot(outx, outy) || 1;
          const gap = (M ? 30 : 22) + R.node;
          const lx = n.x + (outx / ol) * gap, ly = n.y + (outy / ol) * gap + F.node * 0.34;
          return (
            <g key={`${n.lobe}-${n.stage}`} style={{ opacity: entered ? (dim ? 0.34 : 1) : 0, transformOrigin: `${n.x}px ${n.y}px`, transform: entered ? 'none' : 'scale(0.9)', transition: reduce ? 'opacity 300ms ease' : `opacity 460ms ease ${180 + order.indexOf(n.stage) * 70}ms, transform 460ms cubic-bezier(0.2,0.7,0.2,1) ${180 + order.indexOf(n.stage) * 70}ms` }}>
              <path d={Brush.inkDot(n.x, n.y, on ? R.node * 1.18 : R.node, { seed: 30 + n.stage.length * 9 + (n.tone === 'rev' ? 50 : 0), intensity: 0.8 })} fill={col} style={{ transition: trans('opacity') }} />
              {on && <circle cx={n.x} cy={n.y} r={R.node * 1.8} fill="none" stroke={col} strokeWidth={M ? 2 : 1.2} opacity={0.9} />}
              <text x={lx} y={ly} textAnchor="middle" style={haloSans(pal, F.node, on ? col : pal.text1, on ? 700 : 600)}>{n.label}</text>
            </g>
          );
        })}

        {/* shared PRICE node — FILLED blended coin (accent top / stress bottom) at
            the crossing, 1.25x satellite radius, so it reads as the shared anchor */}
        {(() => {
          const on = focusId === rl.shared;
          const rr = R.price;
          const topWedge = `M${P.x - rr} ${P.y} A${rr} ${rr} 0 0 1 ${P.x + rr} ${P.y} Z`;
          const botWedge = `M${P.x + rr} ${P.y} A${rr} ${rr} 0 0 1 ${P.x - rr} ${P.y} Z`;
          const dim = focusId && !on;
          return (
            <g style={{ opacity: entered ? (dim ? 0.55 : 1) : 0, transition: reduce ? 'opacity 300ms ease' : 'opacity 520ms ease 120ms', transformOrigin: `${P.x}px ${P.y}px`, transform: entered ? 'none' : 'scale(0.9)' }}>
              <path d={topWedge} fill={accent} opacity={0.95} />
              <path d={botWedge} fill={pal.bandStress} opacity={0.95} />
              <circle cx={P.x} cy={P.y} r={rr} fill="none" stroke={pal.cardBorder} strokeWidth={M ? 2 : 1.4} />
              <circle cx={P.x} cy={P.y} r={rr * 0.34} fill={pal.markInk} />
              {on && <circle cx={P.x} cy={P.y} r={rr * 1.7} fill="none" stroke={pal.text2} strokeWidth={M ? 2 : 1.2} opacity={0.8} />}
              <text x={P.x} y={M ? P.y - rr - 14 : P.y - rr - 9} textAnchor="middle" style={haloSans(pal, F.price, pal.text1, 700)}>{rl.priceLabel}</text>
            </g>
          );
        })()}

        {targets.map((t) => <FocusChip key={`hit${t.id}`} t={t} anchor={anchorOf(t)} coarse={coarse} pinned={pinned} onActive={onActive} onPin={onPin} mkActive={(tt) => ({ ...tt })} />)}
      </svg>
      {tooltip}
    </div>
  );
}

/* FeedbackLoopSvg — reflexivity as two loops that share their MECHANISMS (single
 * consumer: p2-markets-feed-back). Left = the REINFORCING loop (price rises ·
 * capital flows in · fundamentals improve · validation confirms). Right = the
 * REVERSING loop, its equal-and-opposite mirror (price falls · capital tightens ·
 * fundamentals weaken · validation breaks). Between them sit the three mechanisms
 * BOTH loops run through — financing conditions, execution capacity, real-world
 * outcomes — dotted to each side, because the same machinery transmits an up-move
 * and a down-move alike. Solid brush arrows carry each loop; dotted ties name the
 * shared terms. The point: price is an input to the mechanism, not just its output. */
function FeedbackLoopSvg({ spec, width, height, pal, accent, reduce, entered, coarse, touch, targets, active, pinned, onActive, onPin }) {
  const svgRef = useRef(null);
  const fl = spec.feedbackLoop;
  const loops = fl.loops;
  const mechs = fl.mechanisms;
  const F = coarse ? 1.3 : 1;
  const W = Math.max(width, 660);                 // fixed design width; scales down on mobile
  const cx = W / 2;
  const pad = { t: 16, b: 12 };
  const legendY = height - pad.b - 4;
  const gridBottom = legendY - 24;
  const NW = 106, NH = 38, CW = 158, CH = 62;
  const yT = pad.t + CH / 2 + 2, yB = gridBottom - CH / 2, yMid = (yT + yB) / 2;
  const xL1 = cx - CW / 2 - 16 - NW / 2, xL2 = xL1 - NW - 16;
  const xR1 = cx + CW / 2 + 16 + NW / 2, xR2 = xR1 + NW + 16;
  const toneCol = (t) => (t === 'stress' ? pal.bandStress : accent);
  const toneTxt = (t) => (t === 'stress' ? pal.bandStressText : accent);

  const statePos = (li, id) => {
    const oX = li === 0 ? xL2 : xR2, iX = li === 0 ? xL1 : xR1;
    if (id === 'price') return { x: oX, y: yMid };
    if (id === 'capital') return { x: iX, y: yT };
    if (id === 'fundamentals') return { x: iX, y: yB };
    return { x: oX, y: yB };                       // validation
  };
  const mechPos = (m) => ({ x: cx, y: m.row === 'top' ? yT : m.row === 'bot' ? yB : yMid });
  const labelPos = (li) => ({ x: li === 0 ? xL1 : xR1, y: yMid });

  const nodes = [];
  loops.forEach((lp, li) => lp.states.forEach((st) => { const p = statePos(li, st.id); nodes.push({ ...st, li, tone: lp.tone, x: p.x, y: p.y }); }));

  const anchorOf = (t) => { const n = nodes.find((x) => x.li === 0 && x.id === t.id) || nodes.find((x) => x.id === t.id); return n ? { x: n.x, y: n.y } : null; };
  const resolve = (mx, my) => { let best = null, bd = Math.max(touch ? 34 : 24, NW / 2 - 8); nodes.forEach((p) => { const d = Math.hypot(mx - p.x, my - p.y); if (d < bd) { bd = d; best = p; } }); return best ? targets.find((t) => t.id === best.id) : null; };
  const toVB = (e) => { const r = svgRef.current.getBoundingClientRect(); return [(e.clientX - r.left) * (W / r.width), (e.clientY - r.top) * (height / r.height)]; };
  const onMove = (e) => { if (coarse || pinned) return; onActive(resolve(...toVB(e)), 'hover'); };
  const onClick = (e) => { const res = resolve(...toVB(e)); if (coarse) { onActive(res, 'tap'); return; } if (!res) { onPin(null); return; } onPin(res); };

  const isActiveHere = active && targets.some((t) => t.id === active.id);
  const focusId = isActiveHere ? active.id : null;
  const anchor = isActiveHere ? anchorOf(active) : null;
  const trans = (p, ms = 200) => (reduce ? undefined : `${p} ${ms}ms ease`);
  let tooltip = null;
  if (!coarse && isActiveHere && anchor) { const meta = targets.find((t) => t.id === active.id); if (meta) tooltip = <TargetTooltip meta={meta} kindLabel="STATE" accentTitle={active.id === spec.primaryKey} xPct={(anchor.x / W) * 100} yPct={(anchor.y / height) * 100} isPin={!!pinned && active.id === pinned.id} pal={pal} accent={accent} reduce={reduce} entered={entered} onUnpin={() => onPin(null)} valueText={null} />; }

  // geometry helpers
  const boxEdge = (p, w, h, dx, dy, padPx) => { const hw = w / 2 + (padPx || 0), hh2 = h / 2 + (padPx || 0); const L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L; const s = Math.min(hw / (Math.abs(ux) || 1e-6), hh2 / (Math.abs(uy) || 1e-6)); return { x: p.x + ux * s, y: p.y + uy * s }; };
  const curvePts = (p0, p1, bow) => { const mx = (p0.x + p1.x) / 2, my = (p0.y + p1.y) / 2, dx = p1.x - p0.x, dy = p1.y - p0.y, L = Math.hypot(dx, dy) || 1; const cxp = mx + (-dy / L) * bow, cyp = my + (dx / L) * bow, out = []; for (let i = 0; i <= 12; i++) { const t = i / 12, u = 1 - t; out.push({ x: u * u * p0.x + 2 * u * t * cxp + t * t * p1.x, y: u * u * p0.y + 2 * u * t * cyp + t * t * p1.y }); } return out; };

  // solid loop arrows: price→capital, fundamentals→validation, validation→price (capital→fundamentals runs through the shared centre)
  const arrows = [];
  loops.forEach((lp, li) => {
    const s = (id) => ({ ...statePos(li, id) });
    const segs = [['price', 'capital', li === 0 ? -20 : 20], ['fundamentals', 'validation', li === 0 ? 20 : -20], ['validation', 'price', li === 0 ? 26 : -26]];
    segs.forEach(([a, b, bow], k) => {
      const pa = s(a), pb = s(b);
      const e0 = boxEdge(pa, NW, NH, pb.x - pa.x, pb.y - pa.y, 3);
      const p1 = boxEdge(pb, NW, NH, pa.x - pb.x, pa.y - pb.y, 3);
      const pts = curvePts(e0, p1, bow);
      const head = { x: p1.x, y: p1.y, dir: Math.atan2(p1.y - pts[pts.length - 2].y, p1.x - pts[pts.length - 2].x) };
      arrows.push({ li, tone: lp.tone, d: Brush.brushLine(pts, { seed: 20 + li * 30 + k * 7, weight: coarse ? 1.35 : 1.55, intensity: 0.5, taper: 0.24, modulate: 0.14, step: 5 }), head, ids: [a, b] });
    });
  });

  // dotted ties from each loop to the shared mechanism at its row
  const ties = [];
  mechs.forEach((m) => {
    const mp = mechPos(m);
    [0, 1].forEach((li) => {
      const target = m.row === 'mid' ? labelPos(li) : statePos(li, m.row === 'top' ? 'capital' : 'fundamentals');
      const from = boxEdge(mp, CW, CH, (li === 0 ? -1 : 1), 0, 2);
      const to = { x: (li === 0 ? target.x + NW / 2 + 4 : target.x - NW / 2 - 4), y: mp.y };
      ties.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y, id: m.id });
    });
  });

  // tiny stage icons
  const Icon = ({ kind, x, y, s, col }) => {
    const st = { stroke: col, strokeWidth: 1.2, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' };
    if (kind === 'up' || kind === 'down') { const dy = kind === 'up' ? -1 : 1; return <g style={st}><path d={`M${x - s} ${y - dy * s * 0.6} L${x + s * 0.5} ${y + dy * s * 0.6}`} /><path d={`M${x + s * 0.5} ${y + dy * s * 0.6} l${-s * 0.55} ${0} m${s * 0.55} ${0} l${0} ${-dy * s * 0.55}`} /></g>; }
    if (kind === 'bank') return <g style={st}><path d={`M${x - s} ${y - s * 0.3} L${x} ${y - s} L${x + s} ${y - s * 0.3}`} /><path d={`M${x - s * 0.8} ${y - s * 0.1} L${x - s * 0.8} ${y + s * 0.7} M${x} ${y - s * 0.1} L${x} ${y + s * 0.7} M${x + s * 0.8} ${y - s * 0.1} L${x + s * 0.8} ${y + s * 0.7}`} /><path d={`M${x - s} ${y + s * 0.8} L${x + s} ${y + s * 0.8}`} /></g>;
    if (kind === 'bars') return <g style={st}><path d={`M${x - s * 0.8} ${y + s * 0.7} L${x - s * 0.8} ${y + s * 0.1} M${x} ${y + s * 0.7} L${x} ${y - s * 0.4} M${x + s * 0.8} ${y + s * 0.7} L${x + s * 0.8} ${y - s}`} /></g>;
    if (kind === 'crane') return <g style={st}><path d={`M${x - s * 0.6} ${y + s * 0.8} L${x - s * 0.6} ${y - s}`} /><path d={`M${x - s * 0.6} ${y - s} L${x + s} ${y - s}`} /><path d={`M${x + s} ${y - s} L${x + s} ${y - s * 0.3}`} /><path d={`M${x - s * 0.6} ${y - s * 0.55} L${x + s * 0.2} ${y - s}`} /></g>;
    return null;
  };

  const wrap2 = (s, cap) => { const wd = s.split(' '); const lines = []; let cur = ''; wd.forEach((w) => { if ((cur + ' ' + w).trim().length <= cap) cur = (cur + ' ' + w).trim(); else { if (cur) lines.push(cur); cur = w; } }); if (cur) lines.push(cur); return lines; };
  const stCol = (n) => (n.id === 'price' ? toneCol(n.tone) : pal.text1);

  return (
    <div style={{ position: 'relative' }}>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${height}`} width="100%" role="group" aria-label={spec.ariaSummary || 'Two reflexive loops sharing their mechanisms'} style={{ display: 'block', cursor: coarse ? 'pointer' : 'crosshair', touchAction: 'manipulation' }} onMouseMove={onMove} onMouseLeave={() => { if (!coarse && !pinned) onActive(null, 'hover'); }} onClick={onClick}>
        {/* dotted shared-mechanism ties */}
        {ties.map((t, i) => <line key={`tie${i}`} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={pal.text4} strokeWidth={1} strokeDasharray="1.5 4" opacity={entered ? (focusId ? 0.3 : 0.6) : 0} style={{ transition: reduce ? 'opacity 400ms ease' : 'opacity 700ms ease 700ms' }} />)}
        {/* solid loop brush arrows */}
        {arrows.map((a, i) => {
          const col = toneCol(a.tone), lit = !focusId || a.ids.includes(focusId);
          return (
            <g key={`ar${i}`} style={{ opacity: entered ? (lit ? 1 : 0.32) : 0, transition: reduce ? 'opacity 420ms ease' : `opacity 760ms ease ${180 + a.li * 120 + i * 40}ms` }}>
              <path d={a.d} fill={col} opacity={a.tone === 'stress' ? 0.85 : 0.92} />
              <path d={Brush.brushArrow(a.head.x, a.head.y, coarse ? 10 : 13, a.head.dir, { seed: 90 + i * 5, weight: coarse ? 1 : 1.2, intensity: 0.5, head: 0.46 })} fill={col} opacity={a.tone === 'stress' ? 0.9 : 0.96} />
            </g>
          );
        })}
        {/* loop identity labels + cycle mark */}
        {loops.map((lp, li) => {
          const p = labelPos(li), col = toneTxt(lp.tone);
          return (
            <g key={`lab${li}`} style={{ opacity: entered ? 1 : 0, transition: reduce ? 'opacity 320ms ease' : `opacity 560ms ease ${560 + li * 120}ms` }}>
              <path d={Brush.enso(p.x, p.y - 20, 8, { seed: 50 + li * 11, weight: 1.1, intensity: 0.6, gap: 0.2, gapAngle: li === 0 ? -Math.PI / 2 : Math.PI / 2 })} fill={col} opacity={0.9} />
              <path d={Brush.brushArrow(p.x + (li === 0 ? 7 : -7), p.y - 27, 6, li === 0 ? 0.6 : Math.PI - 0.6, { seed: 61 + li, weight: 0.7, intensity: 0.5 })} fill={col} opacity={0.9} />
              <text x={p.x} y={p.y + 2} textAnchor="middle" style={halo(pal, 10.5 * F, col, 600)}>{lp.label}</text>
              {lp.dir && <text x={p.x} y={p.y + 14} textAnchor="middle" style={halo(pal, 8 * F, col)}>{`(${lp.dir})`}</text>}
              {lp.sub && <text x={p.x} y={p.y + 27} textAnchor="middle" style={halo(pal, 8 * F, pal.text4)}>{lp.sub}</text>}
            </g>
          );
        })}
        {/* shared mechanism cards (centre) */}
        {mechs.map((m, i) => {
          const p = mechPos(m), tl = wrap2(m.title, 21), sl = wrap2(m.sub, 23);
          return (
            <g key={`mech${m.id}`} style={{ opacity: entered ? 1 : 0, transition: reduce ? 'opacity 340ms ease' : `opacity 640ms ease ${420 + i * 110}ms` }}>
              <rect x={p.x - CW / 2} y={p.y - CH / 2} width={CW} height={CH} rx={8} fill={pal.surface} stroke={pal.borderHi} strokeWidth={1} />
              {m.icon && <Icon kind={m.icon} x={p.x - CW / 2 + 15} y={p.y - CH / 2 + 15} s={6} col={pal.text3} />}
              {tl.map((ln, k) => <text key={`t${k}`} x={p.x - CW / 2 + 28} y={p.y - CH / 2 + 14 + k * 11} style={haloSans(pal, 8.8 * F, pal.text1, 600)}>{ln}</text>)}
              {sl.map((ln, k) => <text key={`s${k}`} x={p.x - CW / 2 + 28} y={p.y - CH / 2 + 14 + tl.length * 11 + 4 + k * 10} style={{ ...halo(pal, 7.4 * F, pal.text3), fontStyle: 'italic' }}>{ln}</text>)}
            </g>
          );
        })}
        {/* loop state cards */}
        {nodes.map((n) => {
          const on = focusId === n.id, col = toneCol(n.tone), lines = wrap2(n.label, 13);
          return (
            <g key={`n${n.li}-${n.id}`} style={{ opacity: entered ? (focusId && !on ? 0.4 : 1) : 0, transformOrigin: `${n.x}px ${n.y}px`, transform: entered ? 'none' : 'scale(0.92)', transition: reduce ? 'opacity 300ms ease' : `opacity 420ms ease ${300 + n.li * 60}ms, transform 420ms cubic-bezier(0.2,0.7,0.2,1) ${300 + n.li * 60}ms` }}>
              <rect x={n.x - NW / 2} y={n.y - NH / 2} width={NW} height={NH} rx={7} fill={pal.surface} stroke={on ? col : n.id === 'price' ? col : pal.borderHi} strokeWidth={on ? 1.9 : n.id === 'price' ? 1.5 : 1} style={{ transition: trans('stroke') }} />
              {n.icon && <Icon kind={n.icon} x={n.x - NW / 2 + 15} y={n.y} s={6.5} col={col} />}
              {lines.map((ln, k) => <text key={k} x={n.x - NW / 2 + 28} y={n.y + (lines.length === 1 ? 3.5 : k === 0 ? -3 : 10)} style={haloSans(pal, (coarse ? 8.6 : 9) * F, stCol(n), n.id === 'price' ? 600 : 500)}>{ln}</text>)}
            </g>
          );
        })}
        {/* legend — two clearly separated entries, one per half */}
        {loops.map((lp, li) => {
          const lx = li === 0 ? Math.max(16, cx - 262) : cx + 22;
          return (
            <g key={`lg${li}`} style={{ opacity: entered ? 1 : 0, transition: reduce ? 'opacity 320ms ease' : `opacity 620ms ease ${900 + li * 90}ms` }}>
              <line x1={lx} y1={legendY - 4} x2={lx + 24} y2={legendY - 4} stroke={toneCol(lp.tone)} strokeWidth={2.6} strokeLinecap="round" />
              <text x={lx + 31} y={legendY - 1} style={halo(pal, 8.5 * F, toneTxt(lp.tone), 600)}>{`${lp.label} LOOP`}</text>
              {lp.legend && <text x={lx + 31} y={legendY + 10} style={halo(pal, 7.4 * F, pal.text4)}>{lp.legend}</text>}
            </g>
          );
        })}
        {targets.map((t) => <FocusChip key={`hit${t.id}`} t={t} anchor={anchorOf(t)} coarse={coarse} pinned={pinned} onActive={onActive} onPin={onPin} mkActive={(tt) => ({ ...tt })} />)}
      </svg>
      {tooltip}
    </div>
  );
}

/* ── BridgeSvg — capital compressed through a constraint (venturi / choke) ────*
 * A flow field of capital streamlines compresses through a dominant bottleneck
 * and re-concentrates into the investable exposure. The constraint is the star:
 * pressure grain builds before it, choke walls pinch at it, flow re-emerges
 * focused after it. Equal-weight process steps are deliberately avoided. */
function BridgeSvg({ spec, width, height, pal, accent, reduce, entered, coarse, touch, targets, active, pinned, onActive, onPin }) {
  const svgRef = useRef(null);
  const stages = spec.bridge.stages;
  const K = stages.length;
  const chokeIdx = Math.floor((K - 1) / 2); // the bottleneck sits at the centre
  const pad = { l: 64, r: 74, t: 52, b: 48 };
  const cy = pad.t + (height - pad.t - pad.b) / 2;
  const X = (i) => pad.l + (i / (K - 1)) * (width - pad.l - pad.r);
  const spreadF = (i) => { const d = Math.abs(i - chokeIdx) / Math.max(1, chokeIdx); return i === K - 1 ? 0.06 : 0.1 + 0.9 * d * d; };
  const SPREAD = (height - pad.t - pad.b) * 0.42;
  const pos = stages.map((s, i) => ({ ...s, x: X(i), y: cy, i, choke: i === chokeIdx, last: i === K - 1 }));

  const geom = useMemo(() => {
    const NS = 9, streams = [];
    for (let j = 0; j < NS; j++) {
      const off = (j - (NS - 1) / 2) / ((NS - 1) / 2); // -1..1
      const pts = stages.map((_, i) => ({ x: X(i), y: cy + off * SPREAD * spreadF(i) }));
      streams.push(Brush.smoothOpen(pts));
    }
    // pressure grain building before the choke
    const rng = Brush.mulberry32(23), grain = [];
    const x0 = X(Math.max(0, chokeIdx - 1)), x1 = X(chokeIdx);
    for (let i = 0; i < 90; i++) { const t = rng(); const gx = x0 + (x1 - x0) * t; const dens = t * t; const gy = cy + (rng() - 0.5) * SPREAD * (0.9 - 0.7 * t); grain.push({ x: gx, y: gy, r: 0.5 + rng() * 1.2, op: 0.04 + 0.13 * dens }); }
    // choke walls pinching at the bottleneck
    const bx = X(chokeIdx), gap = 16, wall = SPREAD * 0.92, ww = (width - pad.l - pad.r) / (K - 1) * 0.42;
    const topWall = `M${bx - ww} ${cy - wall} Q${bx - ww * 0.3} ${cy - wall} ${bx} ${cy - gap} Q${bx + ww * 0.3} ${cy - wall} ${bx + ww} ${cy - wall} Z`;
    const botWall = `M${bx - ww} ${cy + wall} Q${bx - ww * 0.3} ${cy + wall} ${bx} ${cy + gap} Q${bx + ww * 0.3} ${cy + wall} ${bx + ww} ${cy + wall} Z`;
    return { streams, grain, topWall, botWall, bx };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  const anchorOf = (act) => { const p = pos.find((pp) => pp.id === act.id); return p ? { x: p.x, y: cy } : null; };
  const resolve = (mx) => { let best = null, bd = touch ? 60 : 46; pos.forEach((p) => { const d = Math.abs(mx - p.x); if (d < bd) { bd = d; best = p; } }); return best ? targets.find((t) => t.id === best.id) : null; };
  const toVB = (e) => { const r = svgRef.current.getBoundingClientRect(); return [(e.clientX - r.left) * (width / r.width), (e.clientY - r.top) * (height / r.height)]; };
  const onMove = (e) => { if (coarse || pinned) return; onActive(resolve(toVB(e)[0]), 'hover'); };
  const onClick = (e) => { const res = resolve(toVB(e)[0]); if (coarse) { onActive(res, 'tap'); return; } if (!res) { onPin(null); return; } onPin(res); };

  const isActiveHere = active && targets.some((t) => t.id === active.id);
  const focusId = isActiveHere ? active.id : null;
  const anchor = isActiveHere ? anchorOf(active) : null;
  const trans = (p, ms = 200) => (reduce ? undefined : `${p} ${ms}ms ease`);

  let tooltip = null;
  if (!coarse && isActiveHere && anchor) {
    const meta = targets.find((t) => t.id === active.id);
    if (meta) tooltip = <TargetTooltip meta={meta} kindLabel="STAGE" accentTitle={active.id === spec.primaryKey} xPct={(anchor.x / width) * 100} yPct={(anchor.y / height) * 100} isPin={!!pinned && active.id === pinned.id} pal={pal} accent={accent} reduce={reduce} entered={entered} onUnpin={() => onPin(null)} valueText={null} />;
  }

  return (
    <div style={{ position: 'relative' }}>
      <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} width="100%" role="group" aria-label="Capital compressing through a bottleneck into investable exposure" style={{ display: 'block', cursor: coarse ? 'pointer' : 'crosshair', touchAction: 'manipulation' }} onMouseMove={onMove} onMouseLeave={() => { if (!coarse && !pinned) onActive(null, 'hover'); }} onClick={onClick}>
        <g style={{ opacity: entered ? 1 : 0, transition: reduce ? 'opacity 360ms ease' : 'opacity 900ms ease 80ms' }}>
          {geom.grain.map((gr, i) => <circle key={`g${i}`} cx={gr.x} cy={gr.y} r={gr.r} fill={accent} opacity={gr.op} />)}
          <g style={{ clipPath: entered ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)', WebkitClipPath: entered ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)', transition: reduce ? 'none' : 'clip-path 1100ms cubic-bezier(0.7,0,0.2,1) 120ms' }}>
            {geom.streams.map((d, i) => <path key={`s${i}`} d={d} fill="none" stroke={accent} strokeWidth="1" opacity="0.42" strokeLinecap="round" />)}
          </g>
        </g>
        {/* choke walls — the constraint is the dominant element */}
        <g style={{ opacity: entered ? 1 : 0, transition: reduce ? 'opacity 320ms ease' : 'opacity 760ms ease 260ms' }}>
          <path d={geom.topWall} fill={pal.invalidCharcoal} opacity={pal.name === 'light' ? 0.20 : 0.18} />
          <path d={geom.botWall} fill={pal.invalidCharcoal} opacity={pal.name === 'light' ? 0.20 : 0.18} />
        </g>
        {pos.map((n) => {
          const on = focusId === n.id;
          const isP = n.id === spec.primaryKey || n.last;
          const dom = n.choke || n.last; // bottleneck and the investable output read loudest
          return (
            <g key={n.id} style={{ opacity: entered ? (focusId && !on ? 0.4 : 1) : 0, transition: trans('opacity') }}>
              {n.last && <circle cx={n.x} cy={cy} r="11" fill="none" stroke={accent} strokeWidth="1" opacity="0.5" />}
              <path d={Brush.inkDot(n.x, cy, n.choke ? 5.5 : n.last ? 5 : 3, { seed: 30 + n.i * 9, intensity: 0.8 })} fill={isP ? accent : n.choke ? pal.invalidCharcoal : pal.markInk} />
              {on && <circle cx={n.x} cy={cy} r="9" fill="none" stroke={accent} strokeWidth="1.1" opacity="0.9" />}
              <text x={n.x} y={n.choke ? cy - 64 : cy - 26} textAnchor="middle" style={haloSans(pal, dom ? 13.5 : 11, isP ? accent : pal.text1, dom ? 700 : 600)}>{n.label}</text>
              {n.sub && <text x={n.x} y={(n.choke ? cy - 64 : cy - 26) + 14} textAnchor="middle" style={halo(pal, 8, pal.text4)}>{n.sub}</text>}
            </g>
          );
        })}
        {targets.map((t) => <FocusChip key={`hit${t.id}`} t={t} anchor={anchorOf(t)} coarse={coarse} pinned={pinned} onActive={onActive} onPin={onPin} mkActive={(tt) => ({ ...tt })} />)}
      </svg>
      {tooltip}
    </div>
  );
}

/* ── GateSvg — thesis gauntlet (a messy field filtered into one thesis) ──────*
 * A broad scatter of narrative fragments enters from the left; weak fragments
 * fall away at each of four gates while survivors drift toward the centreline,
 * concentrating into a single validated thesis. Transformation, not a funnel. */
function GateSvg({ spec, width, height, pal, accent, reduce, entered, coarse, touch, targets, active, pinned, onActive, onPin }) {
  const svgRef = useRef(null);
  const nodes = spec.gate.nodes; // [entry, gate, gate, gate, gate, exit]
  const K = nodes.length;
  const pad = { l: 64, r: 80, t: 50, b: 52 };
  const cy = pad.t + (height - pad.t - pad.b) / 2;
  const X = (i) => pad.l + (i / (K - 1)) * (width - pad.l - pad.r);
  const SPREAD = (height - pad.t - pad.b) * 0.42;
  const pos = nodes.map((n, i) => ({ ...n, x: X(i), i, gate: n.kind === 'gate', exit: n.kind === 'exit', entry: n.kind === 'entry' }));
  const lastCol = K - 1;

  const geom = useMemo(() => {
    const rng = Brush.mulberry32(29);
    const N = 26, frags = [], survivors = [];
    for (let f = 0; f < N; f++) {
      const startY = cy + (rng() - 0.5) * 2 * SPREAD;
      const r = rng();
      const death = r < 0.34 ? 1 : r < 0.60 ? 2 : r < 0.80 ? 3 : r < 0.90 ? 4 : lastCol; // most die early; a few survive
      const endCol = death;
      const yAt = (i) => cy + (startY - cy) * (1 - (i / lastCol) * 0.62); // drift toward centre as it survives
      const pts = []; for (let i = 0; i <= endCol; i++) pts.push({ x: X(i), y: yAt(i) });
      if (death === lastCol) {
        const sp = []; for (let i = 0; i <= lastCol; i++) sp.push({ x: X(i), y: cy + (startY - cy) * (1 - i / lastCol) });
        survivors.push(Brush.brushLine(sp, { seed: 200 + f * 7, weight: 0.5, intensity: 0.5 }));
      } else {
        const endX = X(endCol), endY = yAt(endCol);
        frags.push({ d: `M${X(0)} ${startY} ${Brush.smoothOpen(pts).slice(1)}`, fall: `M${endX} ${endY} Q${endX + 8} ${endY + 16} ${endX + 14} ${endY + 30 + rng() * 14}`, endCol });
      }
    }
    const gates = pos.filter((p) => p.gate).map((p) => ({ x: p.x, line: Brush.brushSegment(p.x, cy - SPREAD - 8, p.x, cy + SPREAD + 8, { seed: 60 + p.i * 8, weight: 0.7, intensity: 0.6, waver: 0.15 }) }));
    return { frags, survivors, gates };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  const anchorOf = (act) => { const p = pos.find((pp) => pp.id === act.id); return p ? { x: p.x, y: p.gate ? cy - SPREAD - 8 : cy } : null; };
  const resolve = (mx) => { let best = null, bd = touch ? 60 : 46; pos.forEach((p) => { const d = Math.abs(mx - p.x); if (d < bd) { bd = d; best = p; } }); return best ? targets.find((t) => t.id === best.id) : null; };
  const toVB = (e) => { const r = svgRef.current.getBoundingClientRect(); return [(e.clientX - r.left) * (width / r.width), (e.clientY - r.top) * (height / r.height)]; };
  const onMove = (e) => { if (coarse || pinned) return; onActive(resolve(toVB(e)[0]), 'hover'); };
  const onClick = (e) => { const res = resolve(toVB(e)[0]); if (coarse) { onActive(res, 'tap'); return; } if (!res) { onPin(null); return; } onPin(res); };

  const isActiveHere = active && targets.some((t) => t.id === active.id);
  const focusId = isActiveHere ? active.id : null;
  const anchor = isActiveHere ? anchorOf(active) : null;
  const trans = (p, ms = 200) => (reduce ? undefined : `${p} ${ms}ms ease`);
  // selected-thread storytelling: focusing a gate makes the narratives that DIE
  // there jump out (clay), survivors recede; focusing the thesis lifts survivors.
  const focusNode = focusId ? pos.find((p) => p.id === focusId) : null;
  const selGateCol = focusNode && focusNode.gate ? focusNode.i : null;
  const exitSel = !!(focusNode && focusNode.exit);
  const anySel = selGateCol != null || exitSel;
  const emTrans = reduce ? undefined : 'opacity 240ms ease, stroke 240ms ease';

  let tooltip = null;
  if (!coarse && isActiveHere && anchor) {
    const meta = targets.find((t) => t.id === active.id);
    if (meta) tooltip = <TargetTooltip meta={meta} kindLabel="GATE" accentTitle={active.id === spec.primaryKey} xPct={(anchor.x / width) * 100} yPct={(anchor.y / height) * 100} isPin={!!pinned && active.id === pinned.id} pal={pal} accent={accent} reduce={reduce} entered={entered} onUnpin={() => onPin(null)} valueText={null} />;
  }

  return (
    <div style={{ position: 'relative' }}>
      <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} width="100%" role="group" aria-label="Thesis validation gauntlet filtering narratives" style={{ display: 'block', cursor: coarse ? 'pointer' : 'crosshair', touchAction: 'manipulation' }} onMouseMove={onMove} onMouseLeave={() => { if (!coarse && !pinned) onActive(null, 'hover'); }} onClick={onClick}>
        {/* fragments: weak narratives that fall away at a gate */}
        <g style={{ opacity: entered ? 1 : 0, transition: reduce ? 'opacity 360ms ease' : 'opacity 900ms ease 120ms' }}>
          {geom.frags.map((fr, i) => {
            const dieHere = selGateCol != null && fr.endCol === selGateCol;   // this story ends at the selected gate
            const recede = anySel && !dieHere;                                // others stay visible, just quieter
            return (
              <g key={`f${i}`}>
                <path d={fr.d} fill="none" stroke={dieHere ? pal.bandStressText : pal.text3} strokeWidth={dieHere ? 1.5 : 1} opacity={dieHere ? 0.92 : recede ? 0.1 : 0.34} strokeLinecap="round" style={{ transition: emTrans }} />
                <path d={fr.fall} fill="none" stroke={dieHere ? pal.bandStressText : pal.text4} strokeWidth={dieHere ? 1.2 : 0.9} opacity={dieHere ? 0.8 : recede ? 0.06 : 0.2} strokeLinecap="round" style={{ transition: emTrans }} />
              </g>
            );
          })}
        </g>
        {/* survivors: concentrate into the thesis (lift when the thesis is selected) */}
        <g style={{ opacity: entered ? 1 : 0, transition: reduce ? 'opacity 360ms ease' : 'opacity 1000ms ease 320ms' }}>
          {geom.survivors.map((d, i) => <path key={`sv${i}`} d={d} fill={accent} opacity={exitSel ? 1 : anySel ? 0.28 : 0.9} style={{ transition: reduce ? undefined : 'opacity 240ms ease' }} />)}
        </g>
        {/* gates */}
        <g style={{ opacity: entered ? 1 : 0, transition: reduce ? 'opacity 320ms ease' : 'opacity 760ms ease 220ms' }}>
          {geom.gates.map((g, i) => <path key={`g${i}`} d={g.line} fill={pal.invalidCharcoal} opacity="0.75" />)}
        </g>
        {pos.map((n) => {
          const on = focusId === n.id;
          const isP = n.id === spec.primaryKey || n.exit;
          const labelY = n.gate ? cy - SPREAD - 16 : cy - SPREAD - 8;
          return (
            <g key={n.id} style={{ opacity: entered ? (focusId && !on ? 0.4 : 1) : 0, transition: trans('opacity') }}>
              {(n.entry || n.exit) && <path d={Brush.inkDot(n.x, cy, n.exit ? 5.5 : 4, { seed: 20 + n.i * 6, intensity: 0.8 })} fill={isP ? accent : pal.markInk} />}
              {n.exit && <circle cx={n.x} cy={cy} r="11" fill="none" stroke={accent} strokeWidth="1" opacity="0.55" />}
              {on && (n.gate ? <path d={Brush.brushSegment(n.x, cy - SPREAD - 8, n.x, cy + SPREAD + 8, { seed: 60 + n.i * 8, weight: 1.15, intensity: 0.6, waver: 0.18 })} fill={accent} opacity="0.9" /> : <circle cx={n.x} cy={cy} r="9" fill="none" stroke={accent} strokeWidth="1.1" opacity="0.9" />)}
              <text x={n.x} y={labelY} textAnchor="middle" style={haloSans(pal, n.entry || n.exit ? 12.5 : 10.5, isP ? accent : pal.text1, isP ? 700 : 600)}>{n.label}</text>
              {n.sub && <text x={n.x} y={n.exit || n.entry ? cy + 20 : labelY + 13} textAnchor="middle" style={halo(pal, 8, pal.text4)}>{n.sub}</text>}
            </g>
          );
        })}
        {targets.map((t) => <FocusChip key={`hit${t.id}`} t={t} anchor={anchorOf(t)} coarse={coarse} pinned={pinned} onActive={onActive} onPin={onPin} mkActive={(tt) => ({ ...tt })} />)}
      </svg>
      {tooltip}
    </div>
  );
}

/* ── ScorecardSvg — requirement × asset gauntlet ────────────────────────────*
 * Rows are requirements, columns are candidate assets; cells are shape-coded
 * (filled disc = meets, hollow ring = partial, dash = fails — not colour-only).
 * The focus asset's column is quietly emphasised; hovering a row explains it. */
function ScorecardSvg({ spec, width, height, pal, accent, reduce, entered, coarse, targets, active, pinned, onActive, onPin }) {
  const svgRef = useRef(null);
  const sc = spec.scorecard;
  const reqs = sc.requirements, assets = sc.assets;
  const pad = { l: 18, r: 18, t: 64, b: 58 };
  const labelW = Math.min(248, width * 0.30);
  const colW = (width - pad.l - labelW - pad.r) / assets.length;
  const colX = (j) => pad.l + labelW + colW * (j + 0.5);
  const rowH = (height - pad.t - pad.b) / reqs.length;
  const rowY = (i) => pad.t + rowH * (i + 0.5);
  const focusJ = assets.findIndex((a) => a.focus);

  const anchorOf = (act) => { const i = reqs.findIndex((r) => r.id === act.id); return i < 0 ? null : { x: pad.l + labelW * 0.5, y: rowY(i) }; };
  const resolve = (my) => { let best = null, bd = rowH * 0.6; reqs.forEach((r, i) => { const d = Math.abs(my - rowY(i)); if (d < bd) { bd = d; best = r; } }); return best ? targets.find((t) => t.id === best.id) : null; };
  const toVB = (e) => { const r = svgRef.current.getBoundingClientRect(); return [(e.clientX - r.left) * (width / r.width), (e.clientY - r.top) * (height / r.height)]; };
  const onMove = (e) => { if (coarse || pinned) return; onActive(resolve(toVB(e)[1]), 'hover'); };
  const onClick = (e) => { const res = resolve(toVB(e)[1]); if (coarse) { onActive(res, 'tap'); return; } if (!res) { onPin(null); return; } onPin(res); };

  const isActiveHere = active && targets.some((t) => t.id === active.id);
  const focusId = isActiveHere ? active.id : null;
  const anchor = isActiveHere ? anchorOf(active) : null;
  const trans = (p, ms = 200) => (reduce ? undefined : `${p} ${ms}ms ease`);

  const glyph = (score, j, key) => {
    const cx = colX(j), gy = 0, r = 5;
    // ScoreCheck — bespoke brush check
    if (score === 2) return <path key={key} d={scoreCheckPath(cx, gy, r, 12 + j * 6)} fill={j === focusJ ? accent : pal.text2} />;
    // ScoreHalf — bespoke organic ring + brush-filled half
    if (score === 1) { const h = scoreHalfPaths(cx, gy, r, 40 + j * 7); return (<g key={key}><path d={h.fill} fill={pal.text4} opacity="0.6" /><path d={h.ring} fill={pal.text3} opacity="0.9" /></g>); }
    // ScoreFail — bespoke brush X
    return <path key={key} d={scoreFailPath(cx, gy, r, 23 + j * 6)} fill={pal.text4} opacity="0.6" />;
  };

  let tooltip = null;
  if (!coarse && isActiveHere && anchor) {
    const meta = targets.find((t) => t.id === active.id);
    if (meta) tooltip = <TargetTooltip meta={meta} kindLabel="REQUIREMENT" accentTitle={active.id === spec.primaryKey} xPct={(anchor.x / width) * 100} yPct={(anchor.y / height) * 100} isPin={!!pinned && active.id === pinned.id} pal={pal} accent={accent} reduce={reduce} entered={entered} onUnpin={() => onPin(null)} valueText={null} />;
  }

  return (
    <div style={{ position: 'relative' }}>
      <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} width="100%" role="group" aria-label="Backbone requirement scorecard across candidate assets" style={{ display: 'block', cursor: coarse ? 'pointer' : 'crosshair', touchAction: 'manipulation' }} onMouseMove={onMove} onMouseLeave={() => { if (!coarse && !pinned) onActive(null, 'hover'); }} onClick={onClick}>
        {/* focus column — soft ink-wash, not a spreadsheet cell */}
        {focusJ >= 0 && <path d={Brush.washRect(colX(focusJ) - colW * 0.44, pad.t - 26, colX(focusJ) + colW * 0.44, height - pad.b + 6, { seed: 53, intensity: 0.6, soft: 'both' })} fill={accent} fillOpacity={pal.name === 'light' ? 0.08 : 0.07} />}
        {/* score legend — at the top, before the glyphs it explains */}
        <g transform={`translate(${pad.l + 2} ${pad.t - 44})`} style={{ opacity: entered ? 0.95 : 0, transition: trans('opacity', 260) }}>
          {[
            { g: <path d={scoreCheckPath(0, 0, 4, 11)} fill={pal.text2} />, t: 'satisfies' },
            { g: (() => { const h = scoreHalfPaths(0, 0, 4, 40); return <g><path d={h.fill} fill={pal.text4} opacity="0.6" /><path d={h.ring} fill={pal.text3} opacity="0.9" /></g>; })(), t: 'partial' },
            { g: <path d={scoreFailPath(0, 0, 4, 23)} fill={pal.text4} opacity="0.7" />, t: 'does not satisfy' },
          ].map((item, i) => (
            <g key={i} transform={`translate(${i * 96} 0)`}>{item.g}<text x={11} y={3.5} style={halo(pal, 9, pal.text3, 500)}>{item.t}</text></g>
          ))}
        </g>
        {/* asset headers */}
        {assets.map((a, j) => (
          <text key={`h${a.id}`} x={colX(j)} y={pad.t - 32} textAnchor="middle" style={haloSans(pal, a.focus ? 12 : 11, a.focus ? accent : pal.text2, a.focus ? 700 : 600)}>{a.label}</text>
        ))}
        <line x1={pad.l} x2={width - pad.r} y1={pad.t - 18} y2={pad.t - 18} stroke={pal.cardBorder} strokeWidth="1" />
        {/* rows */}
        {reqs.map((r, i) => {
          const on = focusId === r.id;
          return (
            <g key={r.id} style={{ opacity: entered ? (focusId && !on ? (coarse ? 0.55 : 0.42) : 1) : 0, transform: entered ? 'none' : 'translateX(-6px)', transition: reduce ? 'opacity 300ms ease' : `opacity 440ms cubic-bezier(0.22,0.61,0.36,1) ${220 + i * 130}ms, transform 440ms cubic-bezier(0.22,0.61,0.36,1) ${220 + i * 130}ms` }}>
              {on && <rect x={pad.l - 4} y={rowY(i) - rowH / 2 + 2} width={width - pad.l - pad.r + 8} height={rowH - 4} rx={5} fill={pal.text1} opacity={pal.name === 'light' ? 0.04 : 0.05} />}
              <text x={pad.l + 2} y={rowY(i) + 3.5} style={haloSans(pal, 11, on ? pal.text1 : pal.text2, on ? 600 : 500)}>{r.label}</text>
              <g transform={`translate(0 ${rowY(i)})`}>
                {assets.map((a, j) => glyph(r.scores[a.id], j, `${r.id}-${a.id}`))}
              </g>
            </g>
          );
        })}
        {/* aggregate row */}
        <line x1={pad.l} x2={width - pad.r} y1={height - pad.b + 4} y2={height - pad.b + 4} stroke={pal.cardBorder} strokeWidth="1" />
        <text x={pad.l + 2} y={height - pad.b + 24} style={halo(pal, 9, pal.text4)}>AGGREGATE</text>
        {assets.map((a, j) => (
          <text key={`a${a.id}`} x={colX(j)} y={height - pad.b + 24} textAnchor="middle" style={{ ...haloSans(pal, a.focus ? 12 : 10.5, a.focus ? accent : pal.text3, a.focus ? 700 : 600), opacity: entered ? 1 : 0, transition: reduce ? 'opacity 300ms ease' : 'opacity 520ms ease 1420ms' }}>{sc.aggregates[a.id]}</text>
        ))}
        {/* "clears all ten" — integrated column footer, resolves last after the row sweep */}
        {focusJ >= 0 && (
          <g style={{ opacity: entered ? 1 : 0, transition: reduce ? 'opacity 300ms ease' : 'opacity 600ms ease 1640ms' }}>
            <path d={Brush.brushSegment(colX(focusJ) - colW * 0.3, height - pad.b + 32, colX(focusJ) + colW * 0.3, height - pad.b + 32, { seed: 71, weight: 0.7, intensity: 0.5, waver: 0.1 })} fill={accent} opacity="0.7" />
            <text x={colX(focusJ)} y={height - pad.b + 46} textAnchor="middle" style={halo(pal, 8.5, accent, 600)}>clears all ten</text>
          </g>
        )}
        {/* keyboard focus chips (per requirement row) */}
        {targets.map((t) => <FocusChip key={`hit${t.id}`} t={t} anchor={anchorOf(t)} coarse={coarse} pinned={pinned} onActive={onActive} onPin={onPin} mkActive={(tt) => ({ ...tt })} />)}
      </svg>
      {tooltip}
    </div>
  );
}

/* ── ScenarioSvg — Control vs Participation map (NOT a return path) ──────────*
 * The Part 3 headline. The picture IS the claim: exposure and control are
 * different dimensions. x = participation (upside exposure), y = control
 * (followability). A soft governable ZONE sits on the tradeoff frontier. Each
 * strategy is a vertical cluster (participation is per-strategy; the shock sets
 * control); the selected shock is solid, the other shocks are faint dots, so a
 * short cluster = repeatable. The framework sits inside the zone; max exposure
 * far right + low/spread (fragile); stress upper-left (defensive, cash drag).
 * Read-outs lead with control; terminal is a subordinate outcome. Strategy/shock
 * selectors drive it; hover/click a mark to inspect/select. Deterministic. */
function ScenarioSvg({ spec, width, height, pal, accent, reduce, entered, coarse, touch, targets, readerContext }) {
  const sc = spec.scenario;
  const svgRef = useRef(null);
  const [presetId, setPresetId] = useState(sc.defaultPreset);
  const [shockId, setShockId] = useState(sc.defaultShock);
  const [hovered, setHovered] = useState(null);                 // strategy id under pointer/focus
  const [pinned, setPinned] = useState(null);                   // strategy id pinned → premium tooltip (brush frame + connector)
  const PKS = sc.presets.map((p) => p.id);
  const SHK = sc.shocks.map((s) => s.id);
  const byId = (id) => sc.presets.find((p) => p.id === id) || {};
  const targetById = (id) => targets.find((t) => t.id === id);
  const statOf = (pk, sh) => (sc.variants[`${pk}|${sh}`] || {}).stats || {};
  const posture = { max: 'upside, fragile', reserve: 'usable middle', stress: 'defensive, drag' };
  const SHOCK_TAG = { none: 'NO SHOCK', jobloss: 'JOB LOSS', deploy: 'OPPORTUNITY' };

  // ── three-lane stress tunnel ────────────────────────────────────────────────
  // Same shock, three postures enter, one stays usable. Each strategy is a lane;
  // a vertical shock zone sits in the middle. The lane SHAPE comes from the stats:
  // slope before = participation, dip = drawdown, a BREAK if forced, a capacity
  // marker if it still has reserve to act after. (Not value-over-time — posture.)
  const pad = { l: 96, r: 58, t: 30, b: 20 };
  const plotTop = pad.t, plotBot = height - pad.b, plotH = plotBot - plotTop;
  const x0 = pad.l, x1 = width - pad.r, innerW = x1 - x0;
  const sX0 = x0 + innerW * 0.40, sX1 = x0 + innerW * 0.60, sMid = (sX0 + sX1) / 2;   // shock zone
  const laneH = plotH / PKS.length;
  const rowY = (i) => plotTop + laneH * (i + 0.5);
  const lvlY = (yc, lv) => yc + (0.5 - Math.max(0, Math.min(1, lv))) * laneH * 0.74;   // lv 1 = high (top of lane)
  const shockLabel = ((sc.shocks.find((s) => s.id === shockId) || {}).label || '').toUpperCase();

  const lanes = PKS.map((pk, i) => {
    const s = statOf(pk, shockId);
    const yc = rowY(i), partN = (s.participation || 0) / 100, ddN = (s.maxDD || 0) / 100;
    const pre = 0.34 + 0.52 * partN;                            // slope before = participation
    const dip = pre * (1 - 0.82 * ddN);                         // dip = drawdown (deep for max, tiny for stress)
    const end = s.forced ? pre * 0.50 : pk === 'reserve' ? pre + 0.07 : pk === 'stress' ? pre + 0.02 : pre * 0.93;
    const aStart = dip + (end - dip) * 0.35;
    const P = [{ x: x0, y: lvlY(yc, 0.34) }, { x: sX0, y: lvlY(yc, pre) }, { x: sMid, y: lvlY(yc, dip) }, { x: sX1, y: lvlY(yc, aStart) }, { x: x1, y: lvlY(yc, end) }];
    return { pk, i, yc, sel: pk === presetId, forced: !!s.forced, deployed: !!s.deployed, dryPowder: s.dryPowder || 0, s, P, dipPt: P[2], endPt: P[4], capPt: { x: sX1 + (x1 - sX1) * 0.5, y: lvlY(yc, (aStart + end) / 2) } };
  });

  const st = statOf(presetId, shockId);
  // reader-context scaling (optional): the subordinate terminal OUTCOME only.
  const scaleP = spec.personalization && spec.personalization.kind === 'scenario-scale' ? readStartingValue(readerContext) : null;
  const termText = scaleP ? fmtMoney(scaleP * st.terminal / 100) : `${st.terminal}`;
  const partRef = statOf(sc.defaultPreset, 'none').participation || 30;
  const tierOf = (s) => (s.participation >= 60 ? 'High' : s.participation >= partRef - 3 ? 'Adequate' : 'Low');
  const reserveOf = (s) => (s.dryPowder >= 45 ? 'High' : s.dryPowder > 0 ? 'Yes' : 'None');
  const feOf = (s) => (s.forced ? 'High' : (s.strain === 'High' || s.strain === 'Extreme') ? 'Elevated' : 'Low');
  const followOf = (s) => (s.forced || s.strain === 'High' || s.strain === 'Extreme' ? 'Low' : s.participation < partRef - 3 ? 'Medium' : 'High');
  const toneFor = (kind, val) => (kind === 'follow' ? (val === 'High' ? accent : val === 'Low' ? pal.bandStressText : pal.text2)
    : kind === 'fe' ? (val === 'Low' ? accent : val === 'High' ? pal.bandStressText : pal.text1)
      : kind === 'part' ? (val === 'Adequate' ? accent : val === 'Low' ? pal.text3 : pal.text1)
        : kind === 'reserve' ? (val === 'None' ? pal.bandStressText : pal.text1) : pal.text2);
  const note = sc.notes[shockId] || {};

  // interaction: nearest lane by vertical position; click selects, hover previews.
  const toVB = (e) => { const r = svgRef.current.getBoundingClientRect(); return [(e.clientX - r.left) * (width / r.width), (e.clientY - r.top) * (height / r.height)]; };
  const nearestLane = (my) => { let best = null, bd = laneH * 0.6; lanes.forEach((l) => { const d = Math.abs(my - l.yc); if (d < bd) { bd = d; best = l.pk; } }); return best; };
  const onMove = (e) => { if (coarse) return; setHovered(nearestLane(toVB(e)[1])); };
  const onLeave = () => { if (!coarse) setHovered(null); };
  const onClick = (e) => { const pk = nearestLane(toVB(e)[1]); if (pk) { setPresetId(pk); setPinned(pk); } else { setPinned(null); } };
  useEffect(() => {                                             // Escape unpins (parity with the rest of the pin system)
    if (!pinned) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setPinned(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pinned]);

  const seg = (val, label, on, set) => (
    <button key={val} onClick={() => set(val)} aria-pressed={on}
      style={{ fontFamily: pal.mono, fontSize: touch ? 12 : 9.5, letterSpacing: '0.04em', cursor: 'pointer', background: touch && on ? pal.surface : 'transparent', border: 'none', borderRadius: touch ? 6 : 0, padding: touch ? '7px 10px 5px' : '3px 2px 1px', lineHeight: 1.4, color: on ? pal.text1 : pal.text3, fontWeight: on ? 600 : 400, borderBottom: `1.5px solid ${on ? accent : 'transparent'}` }}>{label}</button>
  );
  const dot = (i) => (i > 0 ? <span key={`d${i}`} aria-hidden style={{ color: pal.text4, opacity: 0.4 }}>·</span> : null);
  const ctrlRow = (lbl, items) => (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
      <span style={{ fontFamily: pal.mono, fontSize: 8, letterSpacing: '0.18em', color: pal.text4, width: 56, flexShrink: 0 }}>{lbl}</span>
      <div style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', alignItems: 'baseline' }}>{items}</div>
    </div>
  );
  const stat = (label, value, tone) => (
    <div key={label} style={{ minWidth: 64 }}>
      <div style={{ fontFamily: pal.mono, fontSize: 7.5, letterSpacing: '0.12em', color: pal.text4, marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: pal.mono, fontSize: 13, fontWeight: 600, color: tone || pal.text1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
  const cell = (val, tone) => <td style={{ padding: '5px 8px', fontFamily: pal.mono, fontSize: 9.5, color: tone, fontWeight: 600, textAlign: 'center' }}>{val}</td>;

  const activePk = pinned || hovered;                           // pin wins over hover
  let tooltip = null;
  if (!coarse && activePk) {
    const meta = targetById(activePk); const l = lanes.find((x) => x.pk === activePk);
    if (meta && l) {
      const vt = scaleP && isFinite(l.s.terminal) ? getTooltipValueText(spec, readerContext, { dollars: scaleP * l.s.terminal / 100, rawLabel: `${l.s.terminal} terminal · representative` }) : null;
      tooltip = <TargetTooltip meta={meta} kindLabel="POSTURE" accentTitle={activePk === spec.primaryKey} xPct={(l.endPt.x / width) * 100} yPct={(l.endPt.y / height) * 100} isPin={!!pinned} pal={pal} accent={accent} reduce={reduce} onUnpin={() => setPinned(null)} valueText={vt && vt.primary} valueSub={vt && vt.secondary} />;
    }
  }
  const trans = (p, ms = 200) => (reduce ? undefined : `${p} ${ms}ms ease`);

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {ctrlRow('STRATEGY', sc.presets.flatMap((p, i) => [dot(i), seg(p.id, p.label, presetId === p.id, setPresetId)]))}
        {ctrlRow('SHOCK', sc.shocks.flatMap((s, i) => [dot(i), seg(s.id, s.label, shockId === s.id, setShockId)]))}
      </div>
      <div style={{ fontFamily: pal.mono, fontSize: 8.5, letterSpacing: '0.04em', color: pal.text3, margin: '7px 0 3px' }}>Same shock · three postures enter · one stays usable</div>
      <div style={{ fontFamily: pal.mono, fontSize: 8, letterSpacing: '0.06em', color: pal.text4, margin: '0 0 9px' }}>Representative postures under stress · illustrative, not a forecast · <span style={{ color: pal.text3 }}>selected posture in colour</span></div>

      <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} width="100%" role="group" aria-label={spec.ariaSummary}
        style={{ display: 'block', cursor: coarse ? 'default' : 'pointer', touchAction: 'manipulation' }} onMouseMove={onMove} onMouseLeave={onLeave} onClick={onClick}>
        {/* the shock chamber + phase dividers + labels */}
        <g style={{ opacity: entered ? 1 : 0, transition: trans('opacity', 320) }}>
          {shockId !== 'none'
            ? <path d={Brush.washRect(sX0, plotTop, sX1, plotBot, { seed: 33, intensity: 0.5, soft: 'both' })} fill={pal.bandStress} fillOpacity={pal.name === 'light' ? 0.11 : 0.09} />
            : <rect x={sX0} y={plotTop} width={sX1 - sX0} height={plotH} fill={pal.bandRegime} opacity="0.05" />}
          {[sX0, sX1].map((x) => <line key={x} x1={x} x2={x} y1={plotTop} y2={plotBot} stroke={pal.cardBorder} strokeWidth="1" strokeDasharray="2 5" opacity="0.6" />)}
          <text x={sMid} y={plotTop - 13} textAnchor="middle" style={halo(pal, 8, shockId === 'none' ? pal.text4 : pal.bandStressText)}>{SHOCK_TAG[shockId] || shockLabel}</text>
          <text x={(x0 + sX0) / 2} y={plotTop - 13} textAnchor="middle" style={halo(pal, 7.5, pal.text4)}>BEFORE</text>
          <text x={(sX1 + x1) / 2} y={plotTop - 13} textAnchor="middle" style={halo(pal, 7.5, pal.text4)}>AFTER</text>
        </g>
        {/* selected-lane emphasis band — links to the pinned card's accent */}
        {(() => { const sl = lanes.find((l) => l.sel); return sl ? <rect x={x0 - 2} y={sl.yc - laneH * 0.46} width={innerW + 2} height={laneH * 0.92} rx={7} fill={accent} opacity={pal.name === 'light' ? 0.045 : 0.055} /> : null; })()}
        {/* lanes — draw in left→right through the tunnel as the postures "enter" */}
        <g style={{ clipPath: entered ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)', WebkitClipPath: entered ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)', transition: reduce ? 'none' : 'clip-path 1400ms cubic-bezier(0.22,0.61,0.36,1) 160ms, -webkit-clip-path 1400ms cubic-bezier(0.22,0.61,0.36,1) 160ms' }}>
          {lanes.map((l) => {
            const isHov = hovered === l.pk, col = l.sel ? accent : pal.tierReference;
            const broken = l.forced;
            const main = Brush.smoothOpen(broken ? l.P.slice(0, 3) : l.P);
            const after = broken ? Brush.smoothOpen(l.P.slice(3)) : null;
            return (
              <g key={l.pk} style={{ opacity: l.sel || isHov ? 1 : (pinned ? 0.4 : 0.5), transition: trans('opacity', 240) }}>
                <line x1={x0} x2={x1} y1={l.yc} y2={l.yc} stroke={pal.cardBorder} strokeWidth="1" strokeDasharray="1 6" opacity="0.5" />
                <text x={x0 - 8} y={l.yc - 2} textAnchor="end" style={haloSans(pal, l.sel ? 10.5 : 9.5, l.sel ? accent : pal.text2, l.sel ? 700 : 600)}>{byId(l.pk).short}</text>
                <text x={x0 - 8} y={l.yc + 9} textAnchor="end" style={halo(pal, 7.5, pal.text4)}>{posture[l.pk]}</text>
                <path d={main} fill="none" stroke={col} strokeWidth={l.sel ? 2.2 : 1.4} strokeLinecap="round" style={{ transition: trans('all', 300) }} />
                {after && <path d={after} fill="none" stroke={col} strokeWidth={l.sel ? 2.2 : 1.4} strokeDasharray="4 4" strokeLinecap="round" opacity="0.7" />}
                {l.forced && (
                  <g>
                    <path d={Brush.enso(l.dipPt.x, l.dipPt.y, 8, { seed: 51, weight: 0.9, intensity: 0.85, gapAngle: -Math.PI / 3 })} fill={pal.bandStress} />
                    {(l.sel || isHov) && <text x={l.dipPt.x} y={l.dipPt.y + 20} textAnchor="middle" style={halo(pal, 7.5, pal.bandStressText)}>forced — breaks</text>}
                  </g>
                )}
                {!l.forced && l.dryPowder > 0 && (
                  <g>
                    <path d={Brush.inkDot(l.capPt.x, l.capPt.y, l.deployed ? 4 : 3, { seed: 17, intensity: 0.8 })} fill={l.sel ? accent : pal.markInk} opacity={l.deployed ? 0.95 : 0.6} />
                    {(l.sel || isHov) && <text x={l.capPt.x} y={l.capPt.y - 7} textAnchor="middle" style={halo(pal, 7, l.sel ? accent : pal.text3)}>{l.deployed ? 'acts' : 'can act'}</text>}
                  </g>
                )}
                <path d={Brush.inkDot(l.endPt.x, l.endPt.y, l.sel ? 4.4 : 3, { seed: 9 + l.i, intensity: 0.85 })} fill={col} style={{ transition: trans('all', 300) }} />
              </g>
            );
          })}
        </g>
        {/* focusable lanes (keyboard parity: focus previews, Enter selects + pins) */}
        {lanes.map((l) => (
          <rect key={`fx${l.pk}`} className="acf-fx-focusable" x={x0} y={l.yc - laneH * 0.4} width={innerW} height={laneH * 0.8} fill="transparent" tabIndex={0} role="button"
            aria-label={`${byId(l.pk).label}. ${(targetById(l.pk) || {}).why || ''} Select and pin.`}
            onFocus={() => setHovered(l.pk)} onBlur={() => setHovered(null)}
            onClick={() => { setPresetId(l.pk); setPinned(l.pk); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPresetId(l.pk); setPinned(l.pk); } }} style={{ cursor: 'pointer' }} />
        ))}
      </svg>

      {/* annotation — the story; updates with shock + strategy */}
      <div style={{ display: 'flex', gap: 12, marginTop: 11 }}>
        <div style={{ width: 2, flexShrink: 0, borderRadius: 2, background: accent, opacity: 0.55 }} />
        <p style={{ margin: 0, fontFamily: pal.sans, fontSize: 13, lineHeight: 1.55, color: pal.text2, maxWidth: 700 }}>
          <span style={{ color: pal.text1, fontWeight: 600 }}>{note.lead}</span> {note[presetId]}
        </p>
      </div>

      {/* survival readout — clearer than control scores; updates with the shock */}
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${pal.cardBorder}`, overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 420 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '0 8px 6px 0', fontFamily: pal.mono, fontSize: 7.5, letterSpacing: '0.12em', color: pal.text4, fontWeight: 500 }}>UNDER THIS SHOCK</th>
              {['Participates', 'Has reserve', 'Forced-error risk', 'Followable'].map((h) => <th key={h} style={{ padding: '0 8px 6px', fontFamily: pal.mono, fontSize: 7.5, letterSpacing: '0.08em', color: pal.text4, fontWeight: 500, textAlign: 'center' }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {lanes.map((l) => (
              <tr key={l.pk} style={{ background: l.sel ? (pal.name === 'light' ? 'rgba(20,16,8,0.03)' : 'rgba(255,255,255,0.03)') : 'transparent' }}>
                <td style={{ padding: '5px 8px 5px 0', fontFamily: pal.sans, fontSize: 11, fontWeight: l.sel ? 700 : 600, color: l.sel ? accent : pal.text1, whiteSpace: 'nowrap' }}>{byId(l.pk).short}</td>
                {cell(tierOf(l.s), toneFor('part', tierOf(l.s)))}
                {cell(reserveOf(l.s), toneFor('reserve', reserveOf(l.s)))}
                {cell(feOf(l.s), toneFor('fe', feOf(l.s)))}
                {cell(followOf(l.s), toneFor('follow', followOf(l.s)))}
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 9, alignItems: 'baseline', opacity: 0.72 }}>
          <span style={{ fontFamily: pal.mono, fontSize: 7.5, letterSpacing: '0.14em', color: pal.text4 }}>OUTCOME</span>
          {stat('TERMINAL', termText, pal.text2)}
          <span style={{ fontFamily: pal.mono, fontSize: 8.5, color: pal.text4 }}>one metric — not the goal</span>
        </div>
      </div>

      {/* principle caption */}
      <p style={{ margin: '12px 0 0', fontFamily: pal.sans, fontSize: 11.5, lineHeight: 1.5, color: pal.text2, maxWidth: 760 }}>
        <span style={{ color: pal.text1, fontWeight: 600 }}>Same shock, three postures.</span> Max exposure climbs steepest but breaks under stress; stress-tested barely flinches but climbs slowly (cash drag); the framework bends, stays whole, and keeps its capacity to act. The strategy that survives behaviorally is the one that can compound.
      </p>

      {tooltip}
    </div>
  );
}

/* ── HeartbeatSvg — Bitcoin volatility as a DCA unit-accumulation engine ──────*
 * Upper register: a representative volatile valuation "heartbeat". Lower
 * register: DCA unit pulses whose height = representative units per dollar, so
 * cheap dips buy taller pulses. The accent (framework) pulse stacks above the
 * muted baseline pulse while undervalued (boost) and falls below it when
 * extended (slows, never sells). Representative/conceptual — no historical
 * price, no exact sats. The undervalued window reuses the organic dcaWindow. */
function HeartbeatSvg({ spec, width, height, pal, accent, reduce, entered, coarse, targets, active, pinned, onActive, onPin, readerContext }) {
  const dcaLabel = isFinite(readerContext && readerContext.monthlyDca) && readerContext.monthlyDca > 0 ? fmtMoney(readerContext.monthlyDca) : 'DCA $';
  const svgRef = useRef(null);
  const hb = spec.heartbeat;
  const pad = { l: 18, r: 96, t: 32, b: 46 };
  const x = (v) => pad.l + (v / 100) * (width - pad.l - pad.r);
  const priceTop = pad.t + 10, priceBot = pad.t + (height - pad.t - pad.b) * 0.44;
  const pulseBase = height - pad.b, pulseTop = priceBot + 40;
  const pulseH = pulseBase - pulseTop;
  const priceY = (v) => priceBot - ((v - hb.pmin) / ((hb.pmax - hb.pmin) || 1)) * (priceBot - priceTop);
  const barH = (u) => Math.max(1.5, (u / hb.maxUnit) * pulseH);

  const geom = useMemo(() => {
    const ppx = hb.price.map((p) => ({ x: x(p.x), y: priceY(p.y) }));
    // relational unit-capture field: a lens whose half-height is driven by
    // cheapness (inverse price) — top contour reaches up toward the price dip,
    // bottom contour reaches down toward the tall pulses, so it bulges where BTC
    // is cheapest and pinches shut as the advantage fades.
    const ssf = (u) => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
    const cy = (priceBot + pulseTop) / 2, FN = 44, top = [], bot = [];
    for (let i = 0; i <= FN; i++) {
      const t = (i / FN) * 0.52, xv = t * 100, pv = valueAt(hb.price, xv);
      const cheap = (hb.pmax - pv) / ((hb.pmax - hb.pmin) || 1);
      const opp = Math.max(0, cheap * (1 - ssf((t - 0.3) / 0.18)));
      top.push({ x: x(xv), y: cy + (priceY(pv) - 8 - cy) * opp });
      bot.push({ x: x(xv), y: cy + (pulseBase - 4 - cy) * opp });
    }
    return { ppx, line: Brush.smoothOpen(ppx), field: Brush.unitCaptureField(top, bot, { seed: 29, intensity: 0.7, grainCount: 24 }) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  const troughPulse = hb.pulses.reduce((a, b) => (b.fw > a.fw ? b : a), hb.pulses[0]);
  const rightPulse = hb.pulses.reduce((a, b) => (Math.abs(b.x - 84) < Math.abs(a.x - 84) ? b : a), hb.pulses[0]);
  const anchorOf = (t) => {
    if (!t) return null;
    if (t.id === 'heartbeat') return { x: x(58), y: priceY(valueAt(hb.price, 58)) };
    if (t.id === 'cheap') return { x: x(troughPulse.x), y: pulseBase - barH(troughPulse.fw) - 6 };
    if (t.id === 'slows') return { x: x(rightPulse.x), y: pulseBase - barH(rightPulse.base) - 6 };
    return null;
  };
  const resolve = (mx, my) => (my <= priceBot + 8 ? targets.find((t) => t.id === 'heartbeat') : targets.find((t) => t.id === (mx >= x(62) ? 'slows' : 'cheap')));
  const toVB = (e) => { const r = svgRef.current.getBoundingClientRect(); return [(e.clientX - r.left) * (width / r.width), (e.clientY - r.top) * (height / r.height)]; };
  const onMove = (e) => { if (coarse || pinned) return; onActive(resolve(...toVB(e)), 'hover'); };
  const onClick = (e) => { const res = resolve(...toVB(e)); if (coarse) { onActive(res, 'tap'); return; } if (!res) { onPin(null); return; } onPin(res); };

  const isActiveHere = active && targets.some((t) => t.id === active.id);
  const focusId = isActiveHere ? active.id : null;
  const anchor = isActiveHere ? anchorOf(active) : null;
  const trans = (p, ms = 200) => (reduce ? undefined : `${p} ${ms}ms ease`);
  const dim = (id) => (focusId && focusId !== id ? 0.4 : 1);

  let tooltip = null;
  if (!coarse && isActiveHere && anchor) {
    const meta = targets.find((t) => t.id === active.id);
    if (meta) { const vt = getTooltipValueText(spec, readerContext, {}); tooltip = <TargetTooltip meta={meta} kindLabel={active.id === 'heartbeat' ? 'VALUATION' : 'MECHANISM'} accentTitle={active.id === spec.primaryKey} xPct={(anchor.x / width) * 100} yPct={(anchor.y / height) * 100} isPin={!!pinned && active.id === pinned.id} pal={pal} accent={accent} reduce={reduce} onUnpin={() => onPin(null)} valueText={vt && vt.primary} valueSub={vt && vt.secondary} />; }
  }

  return (
    <div style={{ position: 'relative' }}>
      <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} width="100%" role="group" aria-label={spec.ariaSummary} style={{ display: 'block', cursor: coarse ? 'pointer' : 'crosshair', touchAction: 'manipulation' }} onMouseMove={onMove} onMouseLeave={() => { if (!coarse && !pinned) onActive(null, 'hover'); }} onClick={onClick}>
        {/* relational unit-capture field — opens where BTC is cheap and pulses are
            tall, pinches shut as the advantage fades; reveals with the time sweep */}
        <g style={{ clipPath: entered ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)', WebkitClipPath: entered ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)', opacity: entered ? 1 : 0, transition: reduce ? 'opacity 320ms ease' : 'clip-path 1500ms cubic-bezier(0.22,0.61,0.36,1) 120ms, -webkit-clip-path 1500ms cubic-bezier(0.22,0.61,0.36,1) 120ms, opacity 700ms ease 120ms' }}>
          <path d={geom.field.wash} fill={accent} fillOpacity={pal.name === 'light' ? 0.06 : 0.05} />
          {geom.field.grains.map((gr, gi) => <circle key={gi} cx={gr.x} cy={gr.y} r={gr.r} fill={accent} opacity={gr.op * 0.5} />)}
        </g>
        <text x={pad.l} y={pad.t - 2} style={halo(pal, 8.5, pal.text4)}>BTC PRICE INDEX · REPRESENTATIVE</text>
        {/* math anchor in the transition zone — the conversion that drives bar height */}
        <g style={{ opacity: entered ? 1 : 0, transition: reduce ? 'opacity 300ms ease' : 'opacity 600ms ease 1000ms' }}>
          <text x={(pad.l + width - pad.r) / 2} y={(priceBot + pulseTop) / 2 - 3} textAnchor="middle" style={halo(pal, 10, pal.text2, 600)}>{dcaLabel} ÷ BTC price = units received</text>
          <text x={(pad.l + width - pad.r) / 2} y={(priceBot + pulseTop) / 2 + 10} textAnchor="middle" style={halo(pal, 8, pal.text4)}>lower price → more units</text>
        </g>

        {/* tie line: price trough → tallest pulses */}
        <line x1={x(hb.troughX)} x2={x(hb.troughX)} y1={priceY(valueAt(hb.price, hb.troughX))} y2={pulseBase - barH(troughPulse.fw)} stroke={accent} strokeWidth="0.7" strokeDasharray="2 4" opacity={entered ? 0.4 : 0} style={{ transition: trans('opacity', 600) }} />

        {/* price heartbeat (draws left→right) */}
        <g style={{ opacity: dim('heartbeat'), transition: trans('opacity') }}>
          <g style={{ clipPath: entered ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)', WebkitClipPath: entered ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)', transition: reduce ? 'none' : 'clip-path 1100ms cubic-bezier(0.7,0,0.2,1) 120ms, -webkit-clip-path 1100ms cubic-bezier(0.7,0,0.2,1) 120ms' }}>
            <path d={geom.line} fill="none" stroke={pal.tierSecondary} strokeWidth="1.2" strokeLinecap="round" opacity="0.85" />
          </g>
          <text x={x(58)} y={priceY(valueAt(hb.price, 58)) - 10} textAnchor="middle" style={haloSans(pal, 10.5, pal.tierSecondary, 600)}>BTC price index</text>
        </g>

        {/* DCA unit pulses: muted baseline behind, accent framework in front */}
        {hb.pulses.map((q, i) => {
          const cx = x(q.x), bH = barH(q.base), fH = barH(q.fw);
          return (
            <g key={`p${i}`} style={{ opacity: entered ? 1 : 0, transform: entered ? 'none' : 'translateY(8px)', transition: reduce ? 'opacity 280ms ease' : `opacity 460ms ease ${260 + i * 26}ms, transform 460ms cubic-bezier(0.2,0.7,0.2,1) ${260 + i * 26}ms` }}>
              <rect x={cx - 4.4} y={pulseBase - bH} width={8.8} height={bH} rx={1.4} fill={pal.tierTertiary} opacity="0.5" />
              <rect x={cx - 2.2} y={pulseBase - fH} width={4.4} height={fH} rx={1.2} fill={accent} opacity={q.slow ? 0.7 : 0.95} />
            </g>
          );
        })}
        <line x1={pad.l} x2={width - pad.r} y1={pulseBase} y2={pulseBase} stroke={pal.cardBorder} strokeWidth="1" />

        {/* annotations (appear after the geometry) */}
        {!coarse && (
          <g style={{ opacity: entered ? 1 : 0, transition: reduce ? 'opacity 280ms ease' : 'opacity 500ms ease 980ms' }}>
            <text x={x(troughPulse.x)} y={pulseBase - barH(troughPulse.fw) - 12} textAnchor="middle" style={haloSans(pal, 10.5, accent, 600)}>same dollars buy more units</text>
            <text x={x(rightPulse.x)} y={pulseBase - barH(rightPulse.base) - 12} textAnchor="end" style={{ ...haloSans(pal, 10, pal.text3, 500), fontStyle: 'italic' }}>slows new buying · never sells</text>
          </g>
        )}

        {/* end readout: framework collected more units */}
        <g style={{ opacity: entered ? 1 : 0, transition: reduce ? 'opacity 280ms ease' : 'opacity 500ms ease 1100ms' }}>
          <text x={width - pad.r + 8} y={pulseTop + 6} style={haloSans(pal, 12, accent, 700)}>+{hb.fwPct}%</text>
          <text x={width - pad.r + 8} y={pulseTop + 19} style={halo(pal, 7.5, pal.text4)}>FRAMEWORK</text>
          <text x={width - pad.r + 8} y={pulseTop + 29} style={halo(pal, 7.5, pal.text4)}>UNITS</text>
        </g>

        {/* x ticks */}
        {(spec.xTicks || []).map((t, i) => { const anc = t.v === 0 ? 'start' : t.v >= 100 ? 'end' : 'middle'; return <text key={`xt${i}`} x={x(t.v)} y={height - pad.b + 22} textAnchor={anc} style={halo(pal, 9, pal.axis, 500)}>{t.label.toUpperCase()}</text>; })}

        {targets.map((t) => <FocusChip key={`hit${t.id}`} t={t} anchor={anchorOf(t)} coarse={coarse} pinned={pinned} onActive={onActive} onPin={onPin} mkActive={(tt) => ({ ...tt })} />)}
      </svg>
      {tooltip}
    </div>
  );
}

/* ── Explainer + footer + concepts + mobile sheet ───────────────────────────*/
function ExplainerBlock({ spec, pal, accent }) {
  return (
    <div style={{ display: 'flex', gap: 14 }}>
      <div style={{ width: 2, flexShrink: 0, borderRadius: 2, background: accent, opacity: 0.55 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: pal.sans, fontSize: 14.5, fontWeight: 600, color: pal.text1, letterSpacing: '-0.01em', marginBottom: 6 }}>{spec.explainerHeadline}</div>
        <p style={{ margin: 0, fontFamily: pal.sans, fontSize: 13.5, lineHeight: 1.62, color: pal.text2, maxWidth: 680 }}>
          {spec.explainerBody}
          {spec.explainerConcept && <span style={{ whiteSpace: 'nowrap' }}>{' '}<span style={{ fontFamily: pal.mono, fontSize: 10.5, letterSpacing: '0.04em', color: pal.text3, borderBottom: `1px dotted ${pal.borderHi}`, paddingBottom: 1 }}>↳ {spec.explainerConcept}</span></span>}
        </p>
        {spec.readerTakeaway && <div style={{ marginTop: 9, fontFamily: pal.sans, fontSize: 13, fontStyle: 'italic', color: pal.text3 }}>{spec.readerTakeaway}</div>}
      </div>
    </div>
  );
}

const ROLE_LABEL = { 'verifies-concept': 'SUPPORTS CONCEPT', 'backs-series': 'BACKS SERIES', methodology: 'METHODOLOGY', 'target-source': 'TARGET SERIES' };

function SourceFooter({ spec, pal, accent }) {
  const [open, setOpen] = useState(false);
  const fm = footerModel(spec);
  const mono = { fontFamily: pal.mono, fontSize: 10.5, letterSpacing: '0.04em' };
  const sources = spec.sources || [];
  const glyph = fm.marker === 'square'
    ? <span aria-hidden style={{ width: 6, height: 6, background: pal.text3, flexShrink: 0 }} />
    : fm.marker === 'circle'
      ? <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', border: `1px solid ${pal.text4}`, flexShrink: 0 }} />
      : <span aria-hidden style={{ width: 7, height: 7, transform: 'rotate(45deg)', border: `1px solid ${pal.bandStressText}`, flexShrink: 0 }} />;

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap', ...mono }}>
        {glyph}
        <span style={{ color: pal.text3, maxWidth: 'min(64vw, 560px)' }}>{fm.statement}</span>
        {fm.cta && sources.length > 0 && (
          <button onClick={() => setOpen((o) => !o)} aria-expanded={open} style={{ marginLeft: 2, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontFamily: pal.mono, fontSize: 10.5, letterSpacing: '0.04em', color: accent, borderBottom: `1px dotted ${accent}`, paddingBottom: 1 }}>{fm.cta} ↗</button>
        )}
      </div>
      {open && (
        <div style={{ position: 'absolute', right: 0, bottom: 'calc(100% + 8px)', zIndex: 30, width: 'min(360px, 88vw)', background: pal.cardSolid, border: `1px solid ${pal.borderHi}`, borderRadius: 6, padding: '12px 14px', boxShadow: pal.name === 'light' ? '0 8px 26px rgba(40,36,28,0.18)' : '0 10px 32px rgba(0,0,0,0.55)' }}>
          <div style={{ fontFamily: pal.mono, fontSize: 8.5, letterSpacing: '0.16em', color: pal.text4, marginBottom: 10 }}>{sources.length > 1 ? 'SOURCES' : 'SOURCE'}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sources.map((s, i) => (
              <div key={i} style={{ paddingBottom: i < sources.length - 1 ? 12 : 0, borderBottom: i < sources.length - 1 ? `1px solid ${pal.cardBorder}` : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontFamily: pal.sans, fontSize: 12.5, fontWeight: 600, color: pal.text1 }}>{s.provider}</span>
                  {s.url && <a href={s.url} target="_blank" rel="noreferrer" style={{ fontFamily: pal.mono, fontSize: 10, letterSpacing: '0.04em', color: accent, textDecoration: 'none', borderBottom: `1px dotted ${accent}`, whiteSpace: 'nowrap' }}>Open ↗</a>}
                </div>
                {(s.seriesId || s.label) && <div style={{ fontFamily: pal.sans, fontSize: 11.5, color: pal.text2, marginBottom: 5 }}>{s.seriesId ? `${s.seriesId} · ` : ''}{s.label}</div>}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', alignItems: 'center', fontFamily: pal.mono, fontSize: 9.5, letterSpacing: '0.04em', color: pal.text4 }}>
                  {s.role && <span style={{ color: pal.text3, border: `1px solid ${pal.cardBorder}`, borderRadius: 3, padding: '1px 5px' }}>{ROLE_LABEL[s.role] || s.role}</span>}
                  {s.dateRange && <span>RANGE&nbsp;&nbsp;{s.dateRange}</span>}
                  {s.frequency && <span>FREQ&nbsp;&nbsp;{s.frequency}</span>}
                  {s.transform && <span>TRANSFORM&nbsp;&nbsp;{s.transform}</span>}
                </div>
                {s.notes && <div style={{ fontFamily: pal.sans, fontSize: 11, fontStyle: 'italic', color: pal.text3, marginTop: 6, lineHeight: 1.5 }}>{s.notes}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ConceptLinks({ items, pal, accent }) {
  if (!items || !items.length) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <span style={{ fontFamily: pal.mono, fontSize: 9, letterSpacing: '0.16em', color: pal.text3 }}>CONNECTS TO</span>
      {items.map((c, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span aria-hidden style={{ width: 4, height: 4, borderRadius: '50%', background: pal.text3, opacity: 0.8 }} />
          {c.link ? <a href={c.link} style={{ fontFamily: pal.sans, fontSize: 11.5, color: pal.text3, borderBottom: `1px dotted ${pal.borderHi}`, paddingBottom: 1, textDecoration: 'none' }}>{c.label}</a> : <span style={{ fontFamily: pal.sans, fontSize: 11.5, color: pal.text3 }}>{c.label}</span>}
        </span>
      ))}
    </div>
  );
}

// Mobile detail rail — contained inside the chart card, anchored below the plot
// (never a viewport overlay). Two states: OVERVIEW (active == null) keeps the
// whole chart visible and invites a tap/step; INSPECT shows the tapped element's
// detail with a one-tap return to overview. Dots = the mobileTapTargets order.
function MobileInsight({ spec, pal, accent, active, order, onStep, onPick, onClear }) {
  const targets = spec.hoverTargets;
  const ord = order || targets.map((t) => t.id);
  if (!targets.length) return null; // no targets → render nothing rather than crash
  const idx = active ? Math.max(0, ord.findIndex((id) => id === active.id)) : -1;
  const cur = active ? (targets.find((t) => t.id === ord[idx]) || null) : null;
  const tapBtn = { width: 44, height: 44, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: pal.surface, border: `1px solid ${pal.cardBorder}`, borderRadius: 10, cursor: 'pointer', color: pal.text2, fontSize: 18 };
  return (
    <div style={{ background: pal.cardSolid, borderTop: `1px solid ${pal.borderHi}`, padding: '12px 16px 14px' }}>
      {cur ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6, gap: 10 }}>
            <span style={{ fontFamily: pal.mono, fontSize: 9, letterSpacing: '0.14em', color: cur.kind === 'series' && cur.seriesKey === spec.primaryKey ? accent : pal.text4 }}>{TIER_LABEL[cur.kind] || 'ELEMENT'}{cur.concept ? ` · ↳ ${cur.concept}` : ''}</span>
            <button onClick={onClear} aria-label="Back to full view" className="acf-fx-focusable" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: pal.mono, fontSize: 8.5, letterSpacing: '0.1em', color: pal.text3, background: 'transparent', border: 'none', padding: '3px 2px', cursor: 'pointer', flexShrink: 0 }}><BrushX size={10} /> FULL VIEW</button>
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: pal.text1, letterSpacing: '-0.01em', marginBottom: 5 }}>{cur.name}</div>
          <p style={{ margin: '0 0 6px', fontSize: 13, lineHeight: 1.55, color: pal.text2 }}>{cur.why}</p>
          <div style={{ fontSize: 12, color: pal.text3, fontStyle: 'italic', marginBottom: 12 }}>{cur.claim}</div>
        </>
      ) : (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontFamily: pal.mono, fontSize: 9, letterSpacing: '0.14em', color: accent, marginBottom: 3 }}>FULL VIEW · NOTHING HIDDEN</div>
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.45, color: pal.text2 }}>Tap a point on the chart — or step through below — to inspect each element. The whole chart stays visible.</p>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => onStep(-1)} style={tapBtn} aria-label="Previous element"><BrushChevron size={14} dir="left" /></button>
        <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
          {ord.map((id, i) => <button key={id} onClick={() => onPick(id)} aria-label={`Element ${i + 1}`} style={{ width: i === idx ? 18 : 7, height: 7, padding: 0, border: 'none', borderRadius: 4, cursor: 'pointer', background: i === idx ? accent : pal.cardBorder, transition: 'all .2s ease' }} />)}
        </div>
        <button onClick={() => onStep(1)} style={tapBtn} aria-label="Next element"><BrushChevron size={14} dir="right" /></button>
      </div>
    </div>
  );
}

/* ── SequenceRiskSvg — shared return-set proof for path dependency ───────────*
 * A return DECK (the same representative returns in two orders, shape/tone-coded)
 * sits above two portfolio paths GENERATED from those exact returns, with level-
 * withdrawal ticks on both. Proves "same returns, same withdrawals, different
 * order" instead of asking the reader to trust it. Scales to reader context. */
function SequenceRiskSvg({ spec, width, height, pal, accent, reduce, entered, coarse, targets, active, pinned, onActive, onPin, readerContext }) {
  const svgRef = useRef(null);
  const seq = spec.sequence;
  const N = seq.N;
  const P = readStartingValue(readerContext) || 1e6;
  // Re-simulate BOTH paths from the SAME deck at the reader's withdrawal rate,
  // clamped to a representative band so the exhibit stays on-axis and never NaNs.
  // Default 4% reproduces the spec paths exactly; the domain only expands below 4%.
  const w = Math.max(0.02, Math.min(0.08, isFinite(readerContext && readerContext.withdrawalRate) ? readerContext.withdrawalRate : (seq.withdraw || 0.04)));
  const simPath = (order) => { const out = [{ x: 0, y: seq.start }]; let v = seq.start; order.forEach((r, i) => { v = Math.max(0, v * (1 + r / 100) - w); out.push({ x: i + 1, y: v }); }); return out; };
  const goodPath = simPath(seq.good), badPath = simPath(seq.bad);
  const goodEnd = goodPath[N].y, badEnd = badPath[N].y;
  let trough = { x: 0, y: Infinity }; badPath.forEach((p) => { if (p.y < trough.y) trough = p; });
  const dataMax = Math.max(...goodPath.map((p) => p.y), ...badPath.map((p) => p.y));
  const pad = { l: 18, r: 96, t: 18, b: 36 };
  const X = (p) => pad.l + (p / N) * (width - pad.l - pad.r);
  const dom = { ...spec.domain, yMax: dataMax <= spec.domain.yMax ? spec.domain.yMax : dataMax + 0.15 };
  const deckTop = pad.t + 14, yG = deckTop + 22, yB = deckTop + 66, rowHalf = 15;
  const pathTop = deckTop + 96, pathBot = height - pad.b;
  const Y = (v) => pathBot - ((v - dom.yMin) / (dom.yMax - dom.yMin)) * (pathBot - pathTop);
  const maxAbs = Math.max(...seq.good.map((v) => Math.abs(v)));
  const blockW = (width - pad.l - pad.r) / N;
  const bc = (i) => pad.l + (i + 0.5) * blockW;
  const EZ = 'cubic-bezier(0.22,0.61,0.36,1)';

  const geom = useMemo(() => {
    const gpx = goodPath.map((p) => ({ x: X(p.x), y: Y(p.y) }));
    const bpx = badPath.map((p) => ({ x: X(p.x), y: Y(p.y) }));
    return { gpx, bpx, good: Brush.brushLine(gpx, { seed: 23, weight: 1.2, intensity: 0.85 }), bad: Brush.brushLine(bpx, { seed: 41, weight: 1.05, intensity: 0.8 }) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, w]);

  const troughPx = { x: X(trough.x), y: Y(trough.y) };
  const anchorOf = (t) => {
    if (!t) return null;
    if (t.id === 'deck') return { x: bc(Math.floor(N / 2)), y: yG };
    if (t.id === 'good') return geom.gpx[geom.gpx.length - 1];
    if (t.id === 'bad') return troughPx;
    if (t.id === 'depletion') return { x: width - pad.r - 26, y: Y(seq.depletion) };
    return null;
  };
  const resolve = (mx, my) => {
    if (my <= pathTop - 6) return targets.find((t) => t.id === 'deck');
    if (Math.abs(my - Y(seq.depletion)) < 10 && mx > pad.l && mx < width - pad.r) return targets.find((t) => t.id === 'depletion');
    const dg = nearPoly(mx, my, geom.gpx), db = nearPoly(mx, my, geom.bpx);
    return targets.find((t) => t.id === (dg.d <= db.d ? 'good' : 'bad'));
  };
  const toVB = (e) => { const r = svgRef.current.getBoundingClientRect(); return [(e.clientX - r.left) * (width / r.width), (e.clientY - r.top) * (height / r.height)]; };
  const onMove = (e) => { if (coarse || pinned) return; onActive(resolve(...toVB(e)), 'hover'); };
  const onClick = (e) => { const res = resolve(...toVB(e)); if (coarse) { onActive(res, 'tap'); return; } if (!res) { onPin(null); return; } onPin(res); };

  const isActiveHere = active && targets.some((t) => t.id === active.id);
  const focusId = isActiveHere ? active.id : null;
  const anchor = isActiveHere ? anchorOf(active) : null;
  const trans = (p, ms = 200) => (reduce ? undefined : `${p} ${ms}ms ease`);
  let tooltip = null;
  if (!coarse && isActiveHere && anchor) {
    const meta = targets.find((t) => t.id === active.id);
    if (meta) { const sd = active.id === 'good' ? goodEnd * P : active.id === 'bad' ? badEnd * P : null; const vt = sd != null ? getTooltipValueText(spec, readerContext, { dollars: sd, rawLabel: `${active.id === 'good' ? 'Good' : 'Bad'} sequence · representative simulation` }) : null; tooltip = <TargetTooltip meta={meta} kindLabel={active.id === 'deck' ? 'RETURN SET' : active.id === 'depletion' ? 'THRESHOLD' : 'SEQUENCE'} accentTitle={active.id === spec.primaryKey} xPct={(anchor.x / width) * 100} yPct={(anchor.y / height) * 100} isPin={!!pinned && active.id === pinned.id} pal={pal} accent={accent} reduce={reduce} onUnpin={() => onPin(null)} valueText={vt && vt.primary} valueSub={vt && vt.secondary} />; }
  }

  const block = (val, cx, mid, key, delay) => {
    const h = Math.max(2, (Math.abs(val) / maxAbs) * rowHalf), pos = val >= 0;
    return <rect key={key} x={cx - (blockW - 4) / 2} y={pos ? mid - h : mid} width={blockW - 4} height={h} rx={1.5} fill={pos ? accent : pal.bandStress} opacity={(0.28 + 0.5 * (Math.abs(val) / maxAbs)) * (entered ? 1 : 0)} style={{ transition: reduce ? 'opacity 280ms ease' : `opacity 360ms ${EZ} ${delay}ms` }} />;
  };
  const wTick = (px, i, isBad) => <line key={`w${isBad ? 'b' : 'g'}${i}`} x1={px.x} x2={px.x} y1={px.y + 1.5} y2={px.y + 6} stroke={isBad ? pal.bandStress : accent} strokeWidth="0.9" opacity={entered ? 0.45 : 0} style={{ transition: trans('opacity', 400) }} />;

  return (
    <div style={{ position: 'relative' }}>
      <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} width="100%" role="group" aria-label={spec.ariaSummary} style={{ display: 'block', cursor: coarse ? 'pointer' : 'crosshair', touchAction: 'manipulation' }} onMouseMove={onMove} onMouseLeave={() => { if (!coarse && !pinned) onActive(null, 'hover'); }} onClick={onClick}>
        {/* return deck — same set, opposite order */}
        <text x={pad.l} y={pad.t + 2} style={halo(pal, 8.5, focusId === 'deck' ? accent : pal.text3)}>SAME RETURN SET · OPPOSITE ORDER</text>
        <line x1={pad.l} x2={width - pad.r} y1={yG} y2={yG} stroke={pal.grid} strokeWidth="1" />
        <line x1={pad.l} x2={width - pad.r} y1={yB} y2={yB} stroke={pal.grid} strokeWidth="1" />
        <text x={pad.l} y={yG - rowHalf - 4} style={halo(pal, 8, pal.text4)}>GAINS FIRST →</text>
        <text x={pad.l} y={yB + rowHalf + 10} style={halo(pal, 8, pal.text4)}>LOSSES FIRST →</text>
        <g style={{ opacity: focusId && focusId !== 'deck' ? 0.5 : 1, transition: trans('opacity') }}>
          {seq.good.map((v, i) => block(v, bc(i), yG, `g${i}`, 200 + i * 28))}
          {seq.bad.map((v, i) => block(v, bc(i), yB, `b${i}`, 200 + i * 28))}
        </g>

        {/* depletion threshold */}
        <line x1={pad.l} x2={width - pad.r} y1={Y(seq.depletion)} y2={Y(seq.depletion)} stroke={pal.invalidCharcoal} strokeWidth="0.9" strokeDasharray="5 5" opacity={focusId === 'depletion' ? 0.95 : 0.55} style={{ transition: trans('opacity') }} />
        <text x={width - pad.r} y={Y(seq.depletion) - 5} textAnchor="end" style={halo(pal, 8.5, pal.invalidCharcoal)}>depletion risk</text>

        {/* y ticks */}
        {(spec.yTicks || []).map((t, i) => <text key={`yt${i}`} x={width - pad.r + 8} y={Y(t.v) + 3} style={halo(pal, 9, pal.axis, 500)}>{t.label}</text>)}

        {/* portfolio paths — generated from the deck returns */}
        <g style={{ opacity: focusId === 'bad' ? (coarse ? 0.55 : 0.4) : 1, transition: trans('opacity') }}>
          <g style={{ clipPath: entered ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)', WebkitClipPath: entered ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)', transition: reduce ? 'none' : `clip-path 1500ms ${EZ} 360ms, -webkit-clip-path 1500ms ${EZ} 360ms` }}>
            <path d={geom.good} fill={accent} />
          </g>
          {geom.gpx.slice(1).map((px, i) => wTick(px, i, false))}
          <text x={geom.gpx[geom.gpx.length - 1].x - 6} y={geom.gpx[geom.gpx.length - 1].y - 8} textAnchor="end" style={haloSans(pal, 11, accent, 600)}>Good sequence</text>
          <text x={geom.gpx[geom.gpx.length - 1].x - 6} y={geom.gpx[geom.gpx.length - 1].y + 6} textAnchor="end" style={halo(pal, 9, pal.text3)}>{fmtMoney(goodEnd * P)}</text>
        </g>
        <g style={{ opacity: focusId === 'good' ? (coarse ? 0.55 : 0.4) : 1, transition: trans('opacity') }}>
          <g style={{ clipPath: entered ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)', WebkitClipPath: entered ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)', transition: reduce ? 'none' : `clip-path 1500ms ${EZ} 360ms, -webkit-clip-path 1500ms ${EZ} 360ms` }}>
            <path d={geom.bad} fill={pal.bandStress} opacity="0.9" />
          </g>
          {geom.bpx.slice(1).map((px, i) => wTick(px, i, true))}
          <path d={Brush.enso(troughPx.x, troughPx.y, 10, { seed: 51, weight: 0.85, intensity: 0.8, gapAngle: -Math.PI / 3 })} fill={pal.bandStress} opacity={entered ? 1 : 0} style={{ transition: trans('opacity', 400) }} />
          <text x={geom.bpx[geom.bpx.length - 1].x - 6} y={geom.bpx[geom.bpx.length - 1].y - 8} textAnchor="end" style={haloSans(pal, 11, pal.bandStressText, 600)}>Bad sequence</text>
          <text x={geom.bpx[geom.bpx.length - 1].x - 6} y={geom.bpx[geom.bpx.length - 1].y + 6} textAnchor="end" style={halo(pal, 9, pal.text3)}>{fmtMoney(badEnd * P)}</text>
        </g>

        {/* annotation + start / withdrawal context */}
        {!coarse && <text x={troughPx.x} y={troughPx.y + 24} textAnchor="middle" style={{ ...haloSans(pal, 9.5, pal.bandStressText, 500), fontStyle: 'italic', opacity: entered ? 1 : 0, transition: trans('opacity', 400) }}>early losses shrink the base</text>}
        <text x={pad.l} y={pathBot + 22} style={halo(pal, 8.5, pal.text4)}>{fmtMoney(P)} start · {fmtMoney(w * P)}/yr · same withdrawals both paths</text>
        {(spec.xTicks || []).map((t, i) => { const anc = t.v === 0 ? 'start' : t.v >= N ? 'end' : 'middle'; return <text key={`xt${i}`} x={X(t.v)} y={pathBot + 22} textAnchor={anc} style={halo(pal, 9, pal.axis, 500)}>{t.label.toUpperCase()}</text>; })}

        {targets.map((t) => <FocusChip key={`hit${t.id}`} t={t} anchor={anchorOf(t)} coarse={coarse} pinned={pinned} onActive={onActive} onPin={onPin} mkActive={(tt) => ({ ...tt })} />)}
      </svg>
      {tooltip}
    </div>
  );
}

/* ── BeforeAfterRevealSvg — true before/after clipped reveal (one canvas) ─────
 * Two full chart STATES share ONE SVG coordinate space and ONE debt backdrop.
 * BASE = surface view (debt backdrop prominent, the interest cost still faint).
 * OVERLAY = hidden-cost view (the SAME backdrop + the rising interest line, its
 * burden inflection, an interest-burden threshold and a pressure zone), clipped
 * to the RIGHT of a vertical divider. Dragging the divider spatially WIPES the
 * calm surface away to expose the cost beneath — a real reveal, never an opacity
 * toggle. Surface (left) ↔ Hidden cost (right). Drag / keyboard / touch;
 * reduced-motion + print safe. The backdrop is identical in both layers so it
 * reads continuous across the wipe; the difference is the cost it was hiding. */
function BeforeAfterRevealSvg({ spec, width, height, pal, accent, reduce, entered, coarse, touch, targets, active, pinned, onActive, onPin, showValues, valueNote }) {
  const svgRef = useRef(null);
  const clipId = `acf-reveal-${useId().replace(/:/g, '')}`;
  const debtP = spec.panels[0], intP = spec.panels[1];
  const debtPts = debtP.series[0].pts, intPts = intP.series[0].pts;
  const dDom = debtP.domain, iDom = intP.domain, xDom = spec.xDomain;
  const labels = spec.beforeAfterLabels || { before: 'Surface', after: 'Hidden cost' };
  const copy = spec.perspectiveCopy || {};
  const surfaceText = copy.surface || 'rates fell for decades and hid the cost';
  const hiddenText = copy.hidden || 'the cost returns as rates normalize';
  const thr = (intP.guides && intP.guides[0] && intP.guides[0].y) || 3;
  const band = (intP.bands && intP.bands[0]) || { x0: 32, x1: 40 };
  const mark = (intP.markers && intP.markers[0]) || { x: 25, r: 11 };

  const pad = { l: 18, r: 92, t: 26, b: 30 };
  const X = (v) => pad.l + ((v - xDom.xMin) / (xDom.xMax - xDom.xMin)) * (width - pad.l - pad.r);
  const top0 = pad.t, top1 = pad.t + 168;
  const bot0 = top1 + 42, bot1 = height - pad.b - 14;
  const Yd = (v) => top1 - ((v - dDom.yMin) / (dDom.yMax - dDom.yMin)) * (top1 - top0);
  const Yi = (v) => bot1 - ((v - iDom.yMin) / (iDom.yMax - iDom.yMin)) * (bot1 - bot0);
  const midY = (top1 + bot0) / 2;
  const HIT = { line: touch ? 22 : 14, marker: touch ? 30 : 22, level: touch ? 18 : 11 };

  const geom = useMemo(() => {
    const dpx = debtPts.map((p) => ({ x: X(p.x), y: Yd(p.y) }));
    const ipx = intPts.map((p) => ({ x: X(p.x), y: Yi(p.y) }));
    const xc = (X(band.x0) + X(band.x1)) / 2, half = (X(band.x1) - X(band.x0)) / 2;
    return {
      dpx, ipx,
      debtArea: areaPath(dpx, debtPts.map((p) => ({ x: X(p.x), y: Yd(dDom.yMin) }))),
      debtLine: Brush.brushLine(dpx, { seed: 31, weight: 1.0, intensity: 0.6 }),
      intFull: Brush.brushLine(ipx, { seed: 67, weight: 1.25, intensity: 0.85 }),
      intFaint: Brush.smoothOpen(ipx),
      field: Brush.pressureField(xc, bot0, bot1, half, { seed: band.seed || 53, intensity: band.intensity ?? 0.55, asymmetric: band.asymmetric ?? 0.12 }),
      enso: Brush.enso(X(mark.x), Yi(valueAt(intPts, mark.x)), mark.r || 11, { seed: 97, weight: 0.85, intensity: 0.85, gapAngle: -Math.PI / 3 }),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  const def = typeof spec.revealDefault === 'number' ? spec.revealDefault : (typeof spec.perspectiveDefault === 'number' ? spec.perspectiveDefault : 0.5);
  const [reveal, setReveal] = useState(def);
  const [drag, setDrag] = useState(false);
  const c01 = (v) => Math.max(0, Math.min(1, v));
  const dividerX = reveal * width;                             // reveal grows L→R: drag RIGHT sweeps the curtain right, revealing hidden cost behind it (on the left)
  const setFromClientX = (cx) => { const el = svgRef.current; if (!el) return; const r = el.getBoundingClientRect(); setReveal(c01((cx - r.left) / (r.width || 1))); };
  const snap = () => { if (coarse) setReveal((v) => (v < 0.25 ? 0 : v > 0.75 ? 1 : 0.5)); };  // mobile snaps to surface / split / hidden cost
  const onDown = (e) => { setDrag(true); try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) { /* noop */ } setFromClientX(e.clientX); };
  const onHandleMove = (e) => { if (drag) setFromClientX(e.clientX); };
  const onUp = () => { setDrag(false); snap(); };
  const onKey = (e) => {
    let nv = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') nv = c01(reveal + 0.1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') nv = c01(reveal - 0.1);
    else if (e.key === 'Home') nv = 0; else if (e.key === 'End') nv = 1;
    if (nv != null) { e.preventDefault(); setReveal(nv); }
  };

  // Coarse: the WHOLE chart is the reveal control — tap to jump the divider, drag
  // to scrub. touch-action:pan-y lets vertical page-scroll through; a horizontal-
  // intent drag captures the pointer so the page never hijacks the gesture. Element
  // inspection on mobile is the stepper below, so the chart area is solely the slider.
  const gest = useRef(null);
  const trackDown = (e) => { gest.current = { x: e.clientX, y: e.clientY, dragging: false }; };
  const trackMove = (e) => {
    const g = gest.current; if (!g) return;
    const dx = e.clientX - g.x, dy = e.clientY - g.y;
    if (!g.dragging) {
      if (Math.abs(dx) > 6 && Math.abs(dx) >= Math.abs(dy)) { g.dragging = true; setDrag(true); try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) { /* noop */ } setFromClientX(e.clientX); }
      else if (Math.abs(dy) > 10) gest.current = null;          // vertical intent → release to page scroll
    } else setFromClientX(e.clientX);
  };
  const trackUp = (e) => {
    const g = gest.current; gest.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) { /* noop */ }
    if (g && g.dragging) { setDrag(false); snap(); }
    else if (g) { setFromClientX(e.clientX); snap(); }          // tap-to-jump → snap
  };
  const trackCancel = (e) => { gest.current = null; setDrag(false); try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) { /* noop */ } };

  const revealedAt = (vbx) => vbx <= dividerX;                 // hidden cost is shown LEFT of the divider (the swept region); marks live there
  const anchorOf = (t) => {
    if (!t) return null;
    if (t.id === 'debt') return { x: X(34), y: Yd(valueAt(debtPts, 34)) };
    if (t.id === 'int') return { x: X(37), y: Yi(valueAt(intPts, 37)) };
    if (t.id === 'threshold') return { x: width - pad.r - 28, y: Yi(thr) };
    if (t.id === 'burden') return { x: X(mark.x), y: Yi(valueAt(intPts, mark.x)) };
    if (t.id === 'pressure') return { x: geom.field.peakX, y: bot0 + 18 };
    return null;
  };
  const resolve = (mx, my) => {
    if (my <= midY) return targets.find((t) => t.id === 'debt');
    if (revealedAt(mx)) {
      if (Math.abs(my - Yi(thr)) < HIT.level && mx > pad.l && mx < width - pad.r) return targets.find((t) => t.id === 'threshold');
      if (Math.hypot(mx - X(mark.x), my - Yi(valueAt(intPts, mark.x))) < HIT.marker) return targets.find((t) => t.id === 'burden');
      if (mx >= X(band.x0) && mx <= X(band.x1)) return targets.find((t) => t.id === 'pressure');
    }
    return targets.find((t) => t.id === 'int');
  };
  const toVB = (e) => { const r = svgRef.current.getBoundingClientRect(); return [(e.clientX - r.left) * (width / r.width), (e.clientY - r.top) * (height / r.height)]; };
  const onMove = (e) => { if (coarse || pinned || drag) return; onActive(resolve(...toVB(e)), 'hover'); };
  const onClick = (e) => { if (coarse || drag) return; const res = resolve(...toVB(e)); if (!res) { onPin(null); return; } onPin(res); };  // coarse: the track owns taps (inspect via stepper)

  const isActiveHere = active && targets.some((t) => t.id === active.id);
  const focusId = isActiveHere ? active.id : null;
  const anchor = isActiveHere ? anchorOf(active) : null;
  const trans = (p, ms = 200) => (reduce ? undefined : `${p} ${ms}ms ease`);
  const EZ = 'cubic-bezier(0.22,0.61,0.36,1)';
  const fadeIn = (delay) => ({ opacity: entered ? 1 : 0, transition: reduce ? 'opacity 300ms ease' : `opacity 620ms ${EZ} ${delay}ms` });

  let tooltip = null;
  if (!coarse && isActiveHere && anchor) {
    const meta = targets.find((t) => t.id === active.id);
    if (meta) {
      let valueText = null;
      if (showValues && (active.id === 'debt' || active.id === 'int' || active.id === 'threshold')) {
        const v = active.id === 'debt' ? valueAt(debtPts, 34) : active.id === 'int' ? valueAt(intPts, 37) : thr;
        valueText = `${v.toFixed(active.id === 'debt' ? 0 : 1)} % of GDP · ${valueNote}`;
      }
      const kl = { debt: 'BACKDROP', int: 'COST', threshold: 'THRESHOLD', burden: 'TRIPWIRE', pressure: 'PRESSURE' }[active.id] || 'ELEMENT';
      tooltip = <TargetTooltip meta={meta} kindLabel={kl} accentTitle={active.id === spec.primaryKey} xPct={(anchor.x / width) * 100} yPct={(anchor.y / height) * 100} isPin={!!pinned && active.id === pinned.id} pal={pal} accent={accent} reduce={reduce} entered={entered} onUnpin={() => onPin(null)} valueText={valueText} />;
    }
  }

  const lbl = { fontFamily: pal.mono, fontSize: 8.5, letterSpacing: '0.14em' };

  return (
    <div style={{ position: 'relative' }}>
      <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} width="100%" role="group" aria-label={spec.ariaSummary}
        style={{ display: 'block', cursor: coarse ? 'pointer' : 'crosshair', touchAction: 'manipulation' }}
        onMouseMove={onMove} onMouseLeave={() => { if (!coarse && !pinned) onActive(null, 'hover'); }} onClick={onClick}>
        <defs>
          <clipPath id={clipId}><rect x={0} y={0} width={Math.max(0, dividerX)} height={height} /></clipPath>
        </defs>

        {/* BASE — surface view: debt backdrop prominent, the cost still faint */}
        <g style={fadeIn(120)}>
          <path d={geom.debtArea} fill={pal.tierSecondary} opacity={pal.name === 'light' ? 0.12 : 0.1} />
          <path d={geom.debtLine} fill={pal.tierReference} opacity="0.92" />
          <path d={geom.intFaint} fill="none" stroke={pal.tierSecondary} strokeWidth="1.1" opacity="0.32" />
          {!coarse && <text x={width - pad.r - 6} y={bot0 + 16} textAnchor="end" style={{ ...haloSans(pal, 10.5, pal.text3, 500), fontStyle: 'italic' }}>{surfaceText}</text>}
        </g>

        {/* OVERLAY — hidden-cost view, clipped to the LEFT of the divider (the swept region) */}
        <g clipPath={`url(#${clipId})`}>
          <rect x={0} y={0} width={width} height={height} fill={pal.card} />
          <g style={fadeIn(520)}>
            <path d={geom.debtArea} fill={pal.tierSecondary} opacity={pal.name === 'light' ? 0.12 : 0.1} />
            <path d={geom.debtLine} fill={pal.tierReference} opacity="0.92" />
            {/* pressure zone — where the burden compounds */}
            <g style={{ opacity: focusId === 'pressure' ? 1 : 0.9 }}>
              <path d={geom.field.plume} fill={pal.bandStress} fillOpacity={focusId === 'pressure' ? (pal.name === 'light' ? 0.2 : 0.18) : (pal.name === 'light' ? 0.13 : 0.12)} style={{ transition: trans('fill-opacity') }} />
              {geom.field.grains.map((gr, gi) => <circle key={gi} cx={gr.x} cy={gr.y} r={gr.r} fill={pal.bandStress} opacity={gr.op} />)}
            </g>
            {/* interest-burden threshold */}
            <line x1={pad.l} x2={width - pad.r} y1={Yi(thr)} y2={Yi(thr)} stroke={pal.invalidCharcoal} strokeWidth="0.9" strokeDasharray="5 5" opacity={focusId === 'threshold' ? 0.95 : 0.6} style={{ transition: trans('opacity') }} />
            <text x={width - pad.r} y={Yi(thr) - 5} textAnchor="end" style={halo(pal, 8.5, pal.invalidCharcoal)}>interest-burden pressure</text>
            {/* the cost line */}
            <path d={geom.intFull} fill={accent} opacity={focusId && focusId !== 'int' ? 0.5 : 1} style={{ transition: trans('opacity') }} />
            {/* link the panels: the upper debt backdrop drives the lower carrying cost at the inflection (revealed together) */}
            <line x1={X(mark.x)} x2={X(mark.x)} y1={Yd(valueAt(debtPts, mark.x))} y2={Yi(valueAt(intPts, mark.x))} stroke={accent} strokeWidth="0.8" strokeDasharray="2 5" opacity="0.4" />
            {/* burden inflection */}
            <path d={geom.enso} fill={pal.markInk} />
            {focusId === 'burden' && <circle cx={X(mark.x)} cy={Yi(valueAt(intPts, mark.x))} r={(mark.r || 11) + 2} fill="none" stroke={accent} strokeWidth="1.1" />}
            {!coarse && <text x={X(mark.x) + (mark.r || 11) + 6} y={Yi(valueAt(intPts, mark.x)) - 8} style={halo(pal, 9, pal.text2)}>burden inflects</text>}
            {!coarse && <text x={X(31)} y={bot0 + 16} textAnchor="middle" style={{ ...haloSans(pal, 10.5, pal.bandStressText, 500), fontStyle: 'italic' }}>{hiddenText}</text>}
          </g>
        </g>

        {/* shared axes + register labels — drawn on top, continuous across the wipe */}
        <text x={pad.l} y={pad.t - 12} style={halo(pal, 9, pal.text4)}>{(debtP.label || 'Federal debt / GDP').toUpperCase()}</text>
        <text x={pad.l} y={bot0 - 12} style={halo(pal, 9, pal.text4)}>{(intP.label || 'Net interest / GDP').toUpperCase()}</text>
        {(debtP.yTicks || []).map((t, i) => <text key={`dy${i}`} x={width - pad.r + 8} y={Yd(t.v) + 3} style={halo(pal, 9, pal.axis, 500)}>{t.label != null ? t.label : t.v}</text>)}
        {(intP.yTicks || []).map((t, i) => <text key={`iy${i}`} x={width - pad.r + 8} y={Yi(t.v) + 3} style={halo(pal, 9, pal.axis, 500)}>{t.label != null ? t.label : t.v}</text>)}
        {(spec.xTicks || []).map((t, i) => { const anc = t.v === xDom.xMin ? 'start' : t.v === xDom.xMax ? 'end' : 'middle'; return <text key={`xt${i}`} x={X(t.v)} y={height - 8} textAnchor={anc} style={halo(pal, 9, pal.axis, 500)}>{t.label.toUpperCase()}</text>; })}

        {/* divider + handle (the reveal control) */}
        <g style={fadeIn(360)}>
          <line x1={dividerX} x2={dividerX} y1={pad.t - 4} y2={height - pad.b} stroke={accent} strokeWidth="1.1" opacity="0.75" />
          <g role="slider" tabIndex={0} className="acf-fx-focusable"
            aria-label="Reveal hidden debt cost" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(reveal * 100)} aria-valuetext={reveal < 0.5 ? 'mostly surface' : 'mostly hidden cost'}
            onKeyDown={onKey} onPointerDown={onDown} onPointerMove={onHandleMove} onPointerUp={onUp} onPointerCancel={onUp} onClick={(e) => e.stopPropagation()}
            style={{ cursor: 'ew-resize', touchAction: 'none', outlineOffset: 3 }}>
            <circle cx={dividerX} cy={midY} r={touch ? 17 : 13} fill={pal.cardSolid} stroke={accent} strokeWidth="1.5" />
            <path d={`M${dividerX - 3} ${midY - 4.5} L${dividerX - 6.5} ${midY} L${dividerX - 3} ${midY + 4.5}`} fill="none" stroke={accent} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d={`M${dividerX + 3} ${midY - 4.5} L${dividerX + 6.5} ${midY} L${dividerX + 3} ${midY + 4.5}`} fill="none" stroke={accent} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </g>

        {/* hover dot on the backdrop / cost lines */}
        {anchor && isActiveHere && (active.id === 'debt' || active.id === 'int') && (
          <circle cx={anchor.x} cy={anchor.y} r="4" fill={accent} stroke={pal.scrim} strokeWidth="1.5" style={{ pointerEvents: 'none' }} />
        )}

        {/* keyboard focus chips — hidden-only marks become reachable once revealed */}
        {targets.filter((t) => t.id === 'debt' || t.id === 'int' || (anchorOf(t) && revealedAt(anchorOf(t).x))).map((t) => (
          <FocusChip key={`hit${t.id}`} t={t} anchor={anchorOf(t)} coarse={coarse} pinned={pinned} onActive={onActive} onPin={onPin} mkActive={(tt) => ({ ...tt })} />
        ))}
        {/* coarse reveal track — full-area drag + tap-to-jump; pan-y keeps page scroll */}
        {coarse && (
          <rect x={0} y={0} width={width} height={height} fill="transparent" aria-hidden="true"
            onPointerDown={trackDown} onPointerMove={trackMove} onPointerUp={trackUp} onPointerCancel={trackCancel}
            style={{ touchAction: 'pan-y', cursor: 'ew-resize' }} />
        )}
      </svg>

      {/* endpoint labels + microcopy */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '6px 14px 2px' }}>
        <span style={{ ...lbl, color: reveal < 0.5 ? pal.text2 : pal.text4 }}>{(labels.before || 'Surface').toUpperCase()}</span>
        <span style={{ fontFamily: pal.mono, fontSize: 8, letterSpacing: '0.1em', color: pal.text4 }}>{coarse ? 'drag or tap to reveal the hidden cost' : 'drag to reveal the hidden cost'}</span>
        <span style={{ ...lbl, color: reveal >= 0.5 ? accent : pal.text4 }}>{(labels.after || 'Hidden cost').toUpperCase()}</span>
      </div>
      {tooltip}
    </div>
  );
}

/* ── radial arc geometry (0° = top, clockwise) ──────────────────────────────*/
function polarTop(cx, cy, r, aDeg) { const a = (aDeg - 90) * Math.PI / 180; return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }; }
function arcPath(cx, cy, r, a0, a1) {
  const p0 = polarTop(cx, cy, r, a0), p1 = polarTop(cx, cy, r, a1);
  const large = ((((a1 - a0) % 360) + 360) % 360) > 180 ? 1 : 0;
  return `M${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A${r} ${r} 0 ${large} 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
}

/* ── RadialSvg — COMPOSITION: one whole, split into shares (donut) ───────────*
 * The angular split IS the claim (you do not own the whole balance). Built on
 * thick STROKED arcs — a clean clockwise draw-in and trivial angular hit-testing,
 * not a chart-library pie. Direct labels + short leaders (never a detached
 * legend). An optional quiet SCALE control (e.g. today / +12 / +25) grows the
 * MAGNITUDE while the SHARE — the arcs — never moves, so an embedded claim is
 * seen compounding in step. Hover/pin/tap a segment for its "why". */
function RadialSvg({ spec, width, height, pal, accent, reduce, entered, coarse, touch, targets, active, pinned, onActive, onPin }) {
  const svgRef = useRef(null);
  const R = spec.radial;
  const segs = R.segments;
  const scales = R.scales || null;
  const [scaleId, setScaleId] = useState(R.defaultScale || (scales ? scales[0].id : null));
  const scale = scales ? (scales.find((s) => s.id === scaleId) || scales[0]) : null;
  const GAP = segs.length > 1 ? 2.4 : 0;                     // small angular gap between segments (deg)
  const START = typeof R.startAngle === 'number' ? R.startAngle : 0;

  const cx = width / 2;
  const cy = Math.round(height * 0.46);
  const rOuter = Math.min(width * 0.165, (height - 96) * 0.52);
  const thick = Math.max(46, rOuter * 0.4);
  const rMid = rOuter - thick / 2;
  const rInner = rOuter - thick;
  const F = coarse ? 1.55 : 1;                                // mobile is not a shrunk desktop SVG — grow the labels
  const FC = coarse ? 1.35 : 1;                               // centre value (tighter — lives inside the hole)

  // resolve each segment's angular span (shares sum ~1; normalize defensively)
  const totalV = segs.reduce((a, s) => a + s.value, 0) || 1;
  let cum = START;
  const arcs = segs.map((s) => {
    const span = (s.value / totalV) * 360;
    const a0 = cum, a1 = cum + span, mid = a0 + span / 2;
    cum = a1;
    return { ...s, a0, a1, mid, span, pct: Math.round((s.value / totalV) * 100) };
  });
  const byId = (id) => arcs.find((a) => a.id === id);
  const anchorOf = (t) => { const a = byId(t.id); if (!a) return null; const p = polarTop(cx, cy, rMid, a.mid); return { x: p.x, y: p.y }; };

  const toVB = (e) => { const r = svgRef.current.getBoundingClientRect(); return [(e.clientX - r.left) * (width / r.width), (e.clientY - r.top) * (height / r.height)]; };
  const resolve = (mx, my) => {
    const dx = mx - cx, dy = my - cy, dist = Math.hypot(dx, dy);
    if (dist < rInner - 14 || dist > rOuter + 14) return null;
    let deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;       // 0 at top, clockwise
    deg = ((deg - START) % 360 + 360) % 360 + START;
    const hit = arcs.find((a) => deg >= a.a0 && deg < a.a1);
    return hit ? targets.find((t) => t.id === hit.id) : null;
  };
  const onMove = (e) => { if (coarse || pinned) return; onActive(resolve(...toVB(e)), 'hover'); };
  const onClick = (e) => { const res = resolve(...toVB(e)); if (coarse) { onActive(res, 'tap'); return; } if (!res) { onPin(null); return; } onPin(res); };

  const isActiveHere = active && targets.some((t) => t.id === active.id);
  const focusId = isActiveHere ? active.id : null;
  const anchor = isActiveHere ? anchorOf(active) : null;
  const trans = (p, ms = 200) => (reduce ? undefined : `${p} ${ms}ms ease`);

  let tooltip = null;
  if (!coarse && isActiveHere && anchor) {
    const meta = targets.find((t) => t.id === active.id);
    if (meta) tooltip = <TargetTooltip meta={meta} kindLabel="SHARE" accentTitle={active.id === spec.primaryKey} xPct={(anchor.x / width) * 100} yPct={(anchor.y / height) * 100} isPin={!!pinned && active.id === pinned.id} pal={pal} accent={accent} reduce={reduce} entered={entered} onUnpin={() => onPin(null)} valueText={null} />;
  }

  const pillBtn = (on) => ({
    fontFamily: pal.mono, fontSize: 10.5, letterSpacing: '0.04em', cursor: 'pointer',
    padding: '6px 12px', minHeight: 32, borderRadius: 5, whiteSpace: 'nowrap',
    background: on ? (pal.name === 'light' ? 'rgba(14,140,102,0.10)' : 'rgba(16,185,129,0.12)') : 'transparent',
    border: `1px solid ${on ? accent : pal.borderHi}`, color: on ? accent : pal.text3,
    transition: reduce ? undefined : 'color 160ms ease, border-color 160ms ease, background 160ms ease',
  });

  return (
    <div style={{ position: 'relative' }}>
      <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} width="100%" role="group" aria-label={spec.ariaSummary || 'Composition donut'}
        style={{ display: 'block', cursor: coarse ? 'pointer' : 'crosshair', touchAction: 'manipulation' }}
        onMouseMove={onMove} onMouseLeave={() => { if (!coarse && !pinned) onActive(null, 'hover'); }} onClick={onClick}>
        {/* faint full ring track — the "whole" the shares divide */}
        <circle cx={cx} cy={cy} r={rMid} fill="none" stroke={pal.cardBorder} strokeWidth={thick} opacity={entered ? 0.5 : 0} style={{ transition: reduce ? undefined : 'opacity 500ms ease' }} />
        {/* segment arcs (thick stroked) — draw in clockwise, staggered */}
        {arcs.map((a, i) => {
          const col = tierColor(a.tier, pal, accent);
          const len = rMid * (Math.max(0, a.span - GAP)) * Math.PI / 180;
          const on = focusId === a.id;
          const dim = focusId && !on ? 0.4 : 1;
          return (
            <path key={a.id} d={arcPath(cx, cy, rMid, a.a0 + GAP / 2, a.a1 - GAP / 2)} fill="none" stroke={col}
              strokeWidth={on ? thick + 3 : thick} strokeLinecap="butt"
              pathLength={len} strokeDasharray={len}
              strokeDashoffset={entered ? 0 : len}
              opacity={entered ? dim : 0}
              style={{ transition: reduce ? 'opacity 300ms ease' : `stroke-dashoffset 760ms cubic-bezier(0.3,0.7,0.2,1) ${140 + i * 240}ms, opacity 300ms ease, stroke-width 180ms ease` }} />
          );
        })}
        {/* centre label — GROSS BALANCE + the (growing) magnitude, still 100% */}
        <g style={{ opacity: entered ? 1 : 0, transition: reduce ? 'opacity 300ms ease' : 'opacity 500ms ease 620ms' }}>
          <text x={cx} y={cy - 16 * FC} textAnchor="middle" style={halo(pal, 10 * FC, pal.text3)}>{(R.centerLabel || 'TOTAL').toUpperCase()}</text>
          <text x={cx} y={cy + 12 * FC} textAnchor="middle" style={haloSans(pal, 30 * FC, pal.text1, 600)}>{scale ? scale.center : (R.centerValue || '100%')}</text>
          {scale && <text x={cx} y={cy + 30 * FC} textAnchor="middle" style={halo(pal, 9 * FC, pal.text4)}>= 100%</text>}
        </g>
        {/* direct labels + short leaders (no detached legend) */}
        {arcs.map((a) => {
          const side = ((a.mid % 360) + 360) % 360 < 180 ? 'r' : 'l';
          const edge = polarTop(cx, cy, rOuter + 4, a.mid);
          const knee = polarTop(cx, cy, rOuter + 20, a.mid);
          const endX = side === 'r' ? Math.min(knee.x + 30, width - 16) : Math.max(knee.x - 30, 16);
          const col = tierColor(a.tier, pal, accent);
          const on = focusId === a.id;
          const mag = scale ? scale.seg[a.id] : null;
          const anchorTxt = side === 'r' ? 'start' : 'end';
          const tx = side === 'r' ? endX : endX;
          return (
            <g key={`lbl${a.id}`} style={{ opacity: entered ? (focusId && !on ? 0.5 : 1) : 0, transition: reduce ? 'opacity 300ms ease' : 'opacity 460ms ease 720ms' }}>
              <path d={`M${edge.x.toFixed(1)} ${edge.y.toFixed(1)} L${knee.x.toFixed(1)} ${knee.y.toFixed(1)} L${endX.toFixed(1)} ${knee.y.toFixed(1)}`} fill="none" stroke={on ? col : pal.borderHi} strokeWidth={on ? 1.3 : 1} style={{ transition: trans('stroke') }} />
              <text x={tx} y={knee.y - 6 * F} textAnchor={anchorTxt} style={haloSans(pal, 12.5 * F, on || a.id === spec.primaryKey ? col : pal.text1, 600)}>{a.label}</text>
              <text x={tx} y={knee.y + 9 * F} textAnchor={anchorTxt} style={halo(pal, 10 * F, col)}>{a.pct}%{mag ? `  ·  ${mag}` : ''}</text>
              {a.sub && !coarse && <text x={tx} y={knee.y + 22} textAnchor={anchorTxt} style={halo(pal, 8.5, pal.text4)}>{a.sub}</text>}
            </g>
          );
        })}
        {R.caption && !coarse && <text x={cx} y={height - 14} textAnchor="middle" style={{ ...haloSans(pal, 12, pal.text2, 500), fontStyle: 'italic', opacity: entered ? 1 : 0, transition: reduce ? undefined : 'opacity 500ms ease 900ms' }}>{R.caption}</text>}
        {targets.map((t) => <FocusChip key={`hit${t.id}`} t={t} anchor={anchorOf(t)} coarse={coarse} pinned={pinned} onActive={onActive} onPin={onPin} mkActive={(tt) => ({ ...tt })} />)}
      </svg>
      {coarse && R.caption && (
        <div style={{ textAlign: 'center', padding: '2px 14px 8px', fontFamily: pal.sans, fontSize: 13, fontStyle: 'italic', color: pal.text2, lineHeight: 1.45 }}>{R.caption}</div>
      )}
      {scales && (
        <div role="group" aria-label="Time horizon — the share holds; the balance grows" style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', padding: '10px 8px 2px' }}>
          <span style={{ fontFamily: pal.mono, fontSize: 9, letterSpacing: '0.12em', color: pal.text4, alignSelf: 'center', marginRight: 2 }}>HORIZON</span>
          {scales.map((s) => (
            <button key={s.id} type="button" className="acf-fx-focusable" aria-pressed={scale && s.id === scale.id} onClick={() => setScaleId(s.id)} style={pillBtn(scale && s.id === scale.id)}>{s.label}</button>
          ))}
        </div>
      )}
      {tooltip}
    </div>
  );
}

/* ── LaneBarSvg — COMPARISON: parallel lanes, one shared scale ───────────────*
 * The seed of the multi-lane family: two (or more) horizontal 100% bars, one per
 * lane, sharing one scale and a common left origin, so the length of the aligned
 * COMPARE segment ("capital back to work") is directly comparable lane-to-lane.
 * A dashed reference line drops at the shortest compare-end; the surplus on the
 * longer lane is the visual claim. A lane may carry a hatched DEFERRED underline —
 * a claim that exists but is not taken now (so the money is not implied to vanish).
 * Direct in-bar labels, no detached legend. Hover/pin/tap a segment for its why. */
function LaneBarSvg({ spec, width, height, pal, accent, reduce, entered, coarse, touch, targets, active, pinned, onActive, onPin }) {
  const svgRef = useRef(null);
  const LB = spec.laneBar;
  const total = LB.total;
  const bars = LB.bars;
  const hatchId = `acf-hatch-${spec.chartId}`;
  const F = coarse ? 1.75 : 1;                                // mobile is not a shrunk desktop SVG — grow the labels
  const pad = { l: 18, r: 18, t: coarse ? 52 : 44, b: 20 };
  const barX0 = pad.l, barX1 = width - pad.r;
  const barW = barX1 - barX0;
  const laneGap = coarse ? 40 : 30, titleH = coarse ? 30 : 22, barH = coarse ? 62 : 46, subH = coarse ? 30 : 22;
  // geometry from the shared, framework-agnostic multi-lane model (chart-core) —
  // lane/segment rects, cross-lane compare stats, and the surplus delta.
  const { lanes, laneH, xOf, minCompare, maxCompare, surplus } = layoutMultiLane(LB, { barX0, barX1, padTop: pad.t, titleH, barH, subH, laneGap });

  // hit map: segment centre + optional deferred-strip centre
  const anchors = {};
  lanes.forEach((l) => {
    l.segs.forEach((s) => { anchors[s.id] = { x: s.cx, y: s.cy }; });
    if (l.deferred) anchors[l.deferred.id || `${l.id}-defer`] = { x: xOf(l.deferred.value) / 1, y: l.barY + barH + 12 };
  });
  const anchorOf = (t) => anchors[t.id] || null;
  const toVB = (e) => { const r = svgRef.current.getBoundingClientRect(); return [(e.clientX - r.left) * (width / r.width), (e.clientY - r.top) * (height / r.height)]; };
  const resolve = (mx, my) => {
    for (const l of lanes) {
      if (my >= l.barY - 6 && my <= l.barY + barH + 6) {
        const hit = l.segs.find((s) => mx >= s.x0 && mx < s.x0 + s.w);
        if (hit) return targets.find((t) => t.id === hit.id) || null;
      }
      if (l.deferred && my > l.barY + barH && my <= l.barY + barH + 22) {
        const dId = l.deferred.id || `${l.id}-defer`;
        const dEnd = xOf(l.deferred.value);
        if (mx >= barX0 && mx <= dEnd + 8) return targets.find((t) => t.id === dId) || null;
      }
    }
    return null;
  };
  const onMove = (e) => { if (coarse || pinned) return; onActive(resolve(...toVB(e)), 'hover'); };
  const onClick = (e) => { const res = resolve(...toVB(e)); if (coarse) { onActive(res, 'tap'); return; } if (!res) { onPin(null); return; } onPin(res); };

  const isActiveHere = active && targets.some((t) => t.id === active.id);
  const focusId = isActiveHere ? active.id : null;
  const anchor = isActiveHere ? anchorOf(active) : null;
  const trans = (p, ms = 200) => (reduce ? undefined : `${p} ${ms}ms ease`);

  let tooltip = null;
  if (!coarse && isActiveHere && anchor) {
    const meta = targets.find((t) => t.id === active.id);
    if (meta) tooltip = <TargetTooltip meta={meta} kindLabel="CAPITAL" accentTitle={active.id === spec.primaryKey} xPct={(anchor.x / width) * 100} yPct={(anchor.y / height) * 100} isPin={!!pinned && active.id === pinned.id} pal={pal} accent={accent} reduce={reduce} entered={entered} onUnpin={() => onPin(null)} valueText={null} />;
  }
  const surplusMid = surplus ? surplus.mid : null;

  return (
    <div style={{ position: 'relative' }}>
      <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} width="100%" role="group" aria-label={spec.ariaSummary || 'Paired comparison bars'}
        style={{ display: 'block', cursor: coarse ? 'pointer' : 'crosshair', touchAction: 'manipulation' }}
        onMouseMove={onMove} onMouseLeave={() => { if (!coarse && !pinned) onActive(null, 'hover'); }} onClick={onClick}>
        <defs>
          <pattern id={hatchId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="none" />
            <line x1="0" y1="0" x2="0" y2="6" stroke={pal.tierSecondary} strokeWidth="1.1" opacity="0.6" />
          </pattern>
        </defs>
        {LB.totalLabel && <text x={barX0} y={pad.t - 20} textAnchor="start" style={halo(pal, 10.5 * F, pal.text3)}>{LB.totalLabel.toUpperCase()}</text>}
        {/* the 0 and total ticks — the shared scale both lanes share */}
        {!coarse && <text x={barX1} y={pad.t - 20} textAnchor="end" style={halo(pal, 9.5, pal.text4)}>{total} {LB.unit || ''} EACH</text>}

        {/* shared compare reference line — dropped at the shortest "capital back to work" */}
        {minCompare != null && (
          <g style={{ opacity: entered ? 1 : 0, transition: reduce ? 'opacity 300ms ease' : 'opacity 500ms ease 900ms' }}>
            <line x1={minCompare} y1={pad.t - 6} x2={minCompare} y2={pad.t + lanes.length * laneH - laneGap + 4} stroke={pal.axis} strokeWidth="1" strokeDasharray="3 4" opacity="0.7" />
          </g>
        )}

        {lanes.map((l) => {
          const laneActive = l.segs.some((s) => s.id === focusId) || (l.deferred && (l.deferred.id || `${l.id}-defer`) === focusId);
          return (
            <g key={l.id}>
              {/* lane title */}
              <text x={barX0} y={l.yTop + 13 * F} textAnchor="start" style={haloSans(pal, 13 * F, pal.text1, 600)}>{l.label}</text>
              {l.sublabel && !coarse && <text x={barX0 + measureLabelShift(l.label)} y={l.yTop + 13} textAnchor="start" style={halo(pal, 9.5, pal.text4)}>· {l.sublabel}</text>}
              {/* faint track */}
              <rect x={barX0} y={l.barY} width={barW} height={barH} rx={5} fill={pal.surface} stroke={pal.cardBorder} strokeWidth="1" opacity={entered ? 1 : 0} style={{ transition: reduce ? undefined : 'opacity 400ms ease' }} />
              {/* segments (grow in left→right, staggered per lane) */}
              {l.segs.map((s, si) => {
                const col = tierColor(s.tier, pal, accent);
                const on = focusId === s.id;
                const dim = focusId && !on && !laneActive ? 0.5 : 1;
                return (
                  <g key={s.id} style={{ opacity: entered ? dim : 0, transition: reduce ? 'opacity 300ms ease' : `opacity 360ms ease ${200 + l.li * 220 + si * 90}ms` }}>
                    <rect x={s.x0} y={l.barY} width={entered ? s.w : 0} height={barH} rx={si === 0 ? 5 : 0} fill={col} opacity={s.tier === 'stress' ? 0.9 : 0.92}
                      style={{ transition: reduce ? undefined : `width 560ms cubic-bezier(0.3,0.7,0.2,1) ${200 + l.li * 220 + si * 90}ms` }} />
                    {s.w > (coarse ? 120 : 78) && (
                      <>
                        <text x={s.cx} y={l.barY + barH / 2 - (coarse ? 6 : 3)} textAnchor="middle" style={haloSans(pal, 12 * F, '#ffffff', 600)}>{s.valueLabel || `${Math.round(s.value)}`}</text>
                        <text x={s.cx} y={l.barY + barH / 2 + (coarse ? 16 : 11)} textAnchor="middle" style={halo(pal, 8.5 * F, 'rgba(255,255,255,0.92)')}>{s.label}</text>
                      </>
                    )}
                  </g>
                );
              })}
              {/* narrow-segment external labels (leadered below) */}
              {l.segs.filter((s) => s.w <= (coarse ? 120 : 78)).map((s) => (
                <text key={`nl${s.id}`} x={s.cx} y={l.barY + barH + 12 * F} textAnchor="middle" style={halo(pal, 8.5 * F, tierColor(s.tier, pal, accent))}>{(s.valueLabel || Math.round(s.value)) + ' ' + s.label}</text>
              ))}
              {/* deferred underline — the claim that still exists, just not taken now */}
              {l.deferred && (
                <g style={{ opacity: entered ? 1 : 0, transition: reduce ? 'opacity 300ms ease' : `opacity 400ms ease ${400 + l.li * 220}ms` }}>
                  <rect x={barX0} y={l.barY + barH + 5} width={xOf(l.deferred.value) - barX0} height={coarse ? 12 : 9} rx={2} fill={`url(#${hatchId})`} stroke={pal.tierSecondary} strokeWidth="1" strokeDasharray="3 3" opacity="0.85" />
                  <text x={barX0 + 3} y={l.barY + barH + (coarse ? 34 : 27)} textAnchor="start" style={halo(pal, 8.5 * F, pal.text3)}>{l.deferred.label}</text>
                </g>
              )}
            </g>
          );
        })}

        {/* surplus callout — the "still working now" gap on the longer lane (clamped in-bounds) */}
        {surplusMid != null && (() => {
          const label = LB.surplusLabel || `+${surplus.deltaValue} still working now`;
          const fs = 10 * F;
          const halfW = Math.min(barW / 2, (label.length * fs * 0.52) / 2);
          const sx = Math.max(barX0 + halfW, Math.min((minCompare + maxCompare) / 2, barX1 - halfW));
          return (
            <g style={{ opacity: entered ? 1 : 0, transition: reduce ? 'opacity 300ms ease' : 'opacity 500ms ease 1000ms' }}>
              <text x={sx} y={pad.t + lanes.length * laneH - laneGap + 20} textAnchor="middle" style={halo(pal, fs, accent)}>{label}</text>
            </g>
          );
        })()}
        {targets.map((t) => <FocusChip key={`hit${t.id}`} t={t} anchor={anchorOf(t)} coarse={coarse} pinned={pinned} onActive={onActive} onPin={onPin} mkActive={(tt) => ({ ...tt })} />)}
      </svg>
      {tooltip}
    </div>
  );
}
// approximate label advance so a lane sublabel sits after the title (viewBox units)
function measureLabelShift(label) { return Math.min(300, 10 + (label ? label.length : 0) * 7.6); }

/* ── FrameworkChart (orchestrator) ──────────────────────────────────────────*/
export default function FrameworkChart({ id, spec: specProp, theme = 'dark', accent: accentName = 'green', className, readerContext }) {
  const spec = specProp || getChartSpec(id);
  const pal = getPalette(theme);
  const accent = getAccent(pal, accentName);
  const reduce = useMqFlag('(prefers-reduced-motion: reduce)');
  // Interaction mode is VIEWPORT-scoped, not device-scoped. A desktop-width
  // session keeps hover + click-to-pin (the tooltip) even on touch / hybrid
  // devices (touch laptops, tablets in landscape, responsive emulation, preview
  // envs); only a narrow viewport switches to the mobile tap-to-inspect model
  // (the MobileInsight explainer rail below the chart). Touch CAPABILITY alone
  // must never downgrade a wide desktop view. Both models are kept — routed by
  // viewport, not by whether the device can be touched.
  const isNarrowViewport = useMqFlag('(max-width: 700px)');
  const isTouchPrimary = useMqFlag('(hover: none) and (pointer: coarse)');
  const coarse = isNarrowViewport;                            // mobile INTERACTION + layout mode (tooltip → MobileInsight rail, badge, declutter)
  const touch = isNarrowViewport || isTouchPrimary;          // touch AFFORDANCES only (larger hit / grab targets) — never gates interaction
  const figRef = useRef(null);
  const entered = useInViewOnce(figRef, reduce);
  const reactId = useId();

  const [hover, setHover] = useState(null);
  const [pin, setPin] = useState(null);
  const [mobileActive, setMobileActive] = useState(null);
  const [showDetails, setShowDetails] = useState(false);     // progressive disclosure: sources / methodology / connects-to collapsed by default

  useEffect(() => {
    if (coarse) return undefined;
    const k = (e) => { if (e.key === 'Escape') setPin(null); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [coarse]);

  const onActive = useCallback((res, src) => {
    // tap an element ⇒ inspect it; tap the background (no/Fallback target) ⇒ back
    // to overview (full visibility). Never leaves the chart in a dimmed default.
    if (src === 'tap') { setMobileActive(res && !res.fallback ? res : null); return; }
    setHover(res);
  }, []);
  const onPin = useCallback((res) => { setPin(res); if (res) setHover(res); }, []);

  if (!spec) return <div role="alert" style={{ fontFamily: 'monospace', color: '#C0837A', padding: 12 }}>FrameworkChart: unknown chart id “{id}”.</div>;

  // Mobile DEFAULT is full visibility: nothing is emphasized until the reader taps
  // or steps. mobileActive === null ⇒ "overview" (no focusId ⇒ nothing dimmed),
  // matching desktop's null-by-default. Tapping/stepping enters "inspect".
  const mobileTarget = mobileActive ? (spec.hoverTargets.find((t) => t.id === mobileActive.id) || null) : null;
  const active = coarse ? mobileTarget : (pin || hover);
  const pinned = coarse ? null : pin;
  const mobileOrder = spec.mobileTapTargets || spec.hoverTargets.map((t) => t.id);

  const stepMobile = (d) => {
    const cur = mobileTarget ? mobileOrder.findIndex((idv) => idv === mobileTarget.id) : -1;
    const next = cur < 0 ? (d > 0 ? 0 : mobileOrder.length - 1) : (cur + d + mobileOrder.length) % mobileOrder.length;
    setMobileActive(spec.hoverTargets.find((t) => t.id === mobileOrder[next]) || null);
  };
  const pickMobile = (idv) => setMobileActive(idv == null ? null : (spec.hoverTargets.find((t) => t.id === idv) || null));
  // Desktop/web ALSO surfaces the explainer rail (the same MobileInsight window) when
  // an element is PINNED — driven by `pin`, shown alongside the floating pinned tooltip.
  const pinById = (idv) => { const t = idv == null ? null : spec.hoverTargets.find((x) => x.id === idv); onPin(t ? { ...t } : null); };
  const stepPin = (d) => {
    const cur = pin ? mobileOrder.findIndex((idv) => idv === pin.id) : -1;
    const next = cur < 0 ? (d > 0 ? 0 : mobileOrder.length - 1) : (cur + d + mobileOrder.length) % mobileOrder.length;
    pinById(mobileOrder[next]);
  };

  const padX = 'clamp(14px, 3vw, 22px)';
  const badge = coarse ? 'TAP TO EXPLORE' : 'LIVE · HOVER';
  const dm = getDataModeMarker(spec);                         // ONE primary data-mode marker, in the title row (not repeated down the chart)
  // distinct, quiet tone per mode (dark/light); meaning is carried by label + aria, never colour alone
  const dmColor = ({
    conceptual: { dark: '#7fb0c8', light: '#3f7a93' },        // cool blue / cyan-gray
    representative: { dark: '#c8a36a', light: '#8f6c32' },    // muted amber / bronze
    simulation: { dark: '#b79ad6', light: '#7a5ca6' },        // soft violet
    historical: { dark: '#9aa6b2', light: '#566676' },        // slate / steel
    mixed: { dark: '#9bb89a', light: '#5c7d5b' },             // blend
  }[dm.mode] || { dark: '#c8a36a', light: '#8f6c32' })[pal.name === 'light' ? 'light' : 'dark'];
  const dmGlyph = dm.glyph === 'circle' ? { width: 13, height: 13, borderRadius: '50%', border: `1.6px solid ${dmColor}`, flexShrink: 0 }
    : dm.glyph === 'square' ? { width: 11, height: 11, border: `1.6px solid ${dmColor}`, flexShrink: 0 }
    : { width: 12, height: 12, transform: 'rotate(45deg)', border: `1.6px solid ${dmColor}`, flexShrink: 0 };
  const showValues = spec.visualDataMode !== 'conceptual' && !spec.suppressValues;
  const W = 1000;
  // Representative/simulation values are art-directed: never label them "TRUE VALUE".
  const valueNote = spec.visualDataMode === 'historical' ? 'TRUE VALUE' : 'REPRESENTATIVE';
  const pNote = getSimulationNote(spec, readerContext);
  const simIntro = getSimulationIntro(spec, readerContext);   // chart-level "scaled example · …" line, above the visual
  const tryThis = resolveTryThis(spec, coarse);               // quiet interaction cue (touch-direct copy on coarse)
  const cp = { width: W, pal, accent, reduce, entered, coarse, touch, active, pinned, onActive, onPin, valueNote, readerContext, motion: resolveMotionTiming(spec) };
  const mob = resolveMobileBehavior(spec);                    // mobile is not "just shrink": tall layouts get vertical room on touch
  const hh = (base) => (coarse && mob.chartHeight === 'tall' ? Math.round(base * 1.2) : base);
  const motionType = resolveMotionProfile(spec).type;        // motion-family hook (data-motion) for the governed tempo

  return (
    <figure ref={figRef} className={`acf-chart-build${className ? ` ${className}` : ''}`} data-build={entered ? 'in' : 'idle'} data-reduced-motion={reduce ? 'true' : 'false'} data-motion={motionType} aria-label={`${spec.title}. ${spec.frameworkClaim}`} aria-describedby={`${reactId}-summary`}
      style={{ margin: '34px 0', background: pal.card, border: `1px solid ${pal.cardBorder}`, borderRadius: 7, overflow: 'visible', colorScheme: pal.name, fontFamily: pal.sans, color: pal.text1, '--build-duration': '900ms', '--build-stagger': '110ms' }}>
      <span id={`${reactId}-summary`} style={SR_ONLY}>{spec.ariaSummary}</span>

      {/* topline */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: `16px ${padX} 8px`, gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: pal.mono, fontSize: 9.5, letterSpacing: '0.18em', color: pal.text3, marginBottom: 8 }}>{spec.idx} · {spec.claimLabel}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            {/* data-mode honesty marker — at-a-glance, with hover/focus explanation (durable copy also in Details).
                No native `title` — the styled .acf-dm-pop popover (hover + focus) is the only explanation layer;
                aria-label carries the accessible name + description so screen readers need no duplicate. */}
            <span className={`acf-dm acf-data-mode--${dm.mode} acf-fx-focusable`} tabIndex={0} role="img" aria-label={`${dm.label} exhibit. ${dm.explain}`}
              style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0, cursor: 'help', borderRadius: 4, padding: '3px 2px' }}>
              <span aria-hidden style={dmGlyph} />
              <span className="acf-dm-pop" role="tooltip" style={{ background: pal.cardSolid, border: `1px solid ${pal.borderHi}`, borderRadius: 6, padding: '9px 12px', width: 'max-content', maxWidth: 264, boxShadow: pal.name === 'light' ? '0 6px 22px rgba(40,36,28,0.16)' : '0 8px 28px rgba(0,0,0,0.5)' }}>
                <span style={{ display: 'block', fontFamily: pal.mono, fontSize: 8.5, letterSpacing: '0.14em', color: pal.text4, marginBottom: 4 }}>{dm.label.toUpperCase()}</span>
                <span style={{ fontFamily: pal.sans, fontSize: 12, lineHeight: 1.5, color: pal.text2 }}>{dm.explain}</span>
              </span>
            </span>
            <h3 style={{ margin: 0, minWidth: 0, fontSize: 'clamp(17px, 2.8vw, 22px)', fontWeight: 600, color: pal.text1, letterSpacing: '-0.015em', lineHeight: 1.22 }}>{spec.title}</h3>
          </div>
          {spec.setupLine && <p style={{ margin: '7px 0 0', fontSize: 13.5, color: pal.text2, lineHeight: 1.5 }}>{spec.setupLine}</p>}
        </div>
        <span style={{ flexShrink: 0, fontFamily: pal.mono, fontSize: 8.5, letterSpacing: '0.14em', color: pal.text3, border: `1px solid ${pal.borderHi}`, borderRadius: 3, padding: '3px 7px', whiteSpace: 'nowrap' }}>{badge}</span>
      </div>

      {/* chart-level simulation intro — context visible where it changes interpretation */}
      {simIntro && (
        <div style={{ padding: `0 ${padX} 2px` }}>
          <span style={{ fontFamily: pal.mono, fontSize: 10, letterSpacing: '0.03em', color: pal.text3, lineHeight: 1.5 }}>{simIntro}</span>
        </div>
      )}

      {/* try-this cue — invites the central interaction (kinesthetic affordance) */}
      {tryThis && (
        <div style={{ padding: `2px ${padX} 4px` }}>
          <span style={{ fontFamily: pal.mono, fontSize: 9, letterSpacing: '0.14em', color: accent }}>TRY THIS</span>
          <span style={{ fontFamily: pal.sans, fontSize: 12, fontStyle: 'italic', color: pal.text3, marginLeft: 9 }}>{tryThis}</span>
        </div>
      )}

      {/* plot region */}
      <div style={{ padding: `2px clamp(8px, 2vw, 14px) 8px` }}>
        {spec.layout === 'quadrant' && <QuadrantSvg spec={spec} height={hh(560)} targets={spec.hoverTargets} {...cp} />}
        {spec.layout === 'loop' && <LoopSvg spec={spec} height={hh(420)} targets={spec.hoverTargets} {...cp} />}
        {spec.layout === 'flow' && <FlowSvg spec={spec} height={hh(400)} targets={spec.hoverTargets} {...cp} />}
        {spec.layout === 'systemLoop' && <SystemLoopSvg spec={spec} height={hh(440)} targets={spec.hoverTargets} {...cp} />}
        {spec.layout === 'governanceLoop' && <GovernanceLoopSvg spec={spec} height={hh(300)} targets={spec.hoverTargets} {...cp} />}
        {spec.layout === 'feedbackLoop' && <FeedbackLoopSvg spec={spec} height={hh(360)} targets={spec.hoverTargets} {...cp} />}
        {spec.layout === 'reflexivityLoop' && <ReflexivityLoopSvg spec={spec} height={hh(600)} targets={spec.hoverTargets} {...cp} />}
        {spec.layout === 'bridge' && <BridgeSvg spec={spec} height={hh(420)} targets={spec.hoverTargets} {...cp} />}
        {spec.layout === 'gate' && <GateSvg spec={spec} height={hh(380)} targets={spec.hoverTargets} {...cp} />}
        {spec.layout === 'scorecard' && <ScorecardSvg spec={spec} height={hh(150 + (spec.scorecard?.requirements.length || 8) * 32)} targets={spec.hoverTargets} {...cp} />}
        {spec.layout === 'scenario' && <ScenarioSvg spec={spec} height={hh(360)} targets={spec.hoverTargets} {...cp} />}
        {spec.layout === 'heartbeat' && <HeartbeatSvg spec={spec} height={hh(440)} targets={spec.hoverTargets} {...cp} />}
        {spec.layout === 'sequenceRisk' && <SequenceRiskSvg spec={spec} height={hh(440)} targets={spec.hoverTargets} {...cp} />}
        {spec.layout === 'radial' && <RadialSvg spec={spec} height={hh(430)} targets={spec.hoverTargets} {...cp} />}
        {spec.layout === 'laneBar' && <LaneBarSvg spec={spec} height={hh(390)} targets={spec.hoverTargets} {...cp} />}
        {(spec.layout === 'single' || !spec.layout) && (
          <PlotSvg panel={{ ...spec, label: undefined }} xDomain={spec.domain} xTicks={spec.xTicks} width={W} height={hh(426)} targets={spec.hoverTargets} showValues={showValues} {...cp} />
        )}
        {spec.layout === 'dual' && spec.perspectiveSlider && <BeforeAfterRevealSvg spec={spec} height={hh(460)} targets={spec.hoverTargets} showValues={showValues} {...cp} />}
        {spec.layout === 'dual' && !spec.perspectiveSlider && spec.panels.map((p, i) => (
          <React.Fragment key={p.id}>
            <div style={{ fontFamily: pal.mono, fontSize: 9.5, letterSpacing: '0.12em', color: pal.text4, padding: '4px 0 2px 10px' }}>{p.label.toUpperCase()}</div>
            <PlotSvg panel={p} xDomain={spec.xDomain} xTicks={spec.xTicks} hideX={i === 0} width={W} height={hh(i === 0 ? 188 : 212)} targets={spec.hoverTargets.filter((t) => t.panel === p.id)} showValues={showValues} {...cp} />
            {i === 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 14px' }}>
                <span aria-hidden style={{ flex: 1, height: 1, background: pal.cardBorder }} />
                <span style={{ fontFamily: pal.sans, fontSize: 10.5, fontStyle: 'italic', color: pal.text3, textAlign: 'center' }}>{spec.connective}</span>
                <span aria-hidden style={{ flex: 1, height: 1, background: pal.cardBorder }} />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {pNote && (
        <div style={{ padding: `0 ${padX} 2px` }}>
          <span style={{ fontFamily: pal.mono, fontSize: 10, letterSpacing: '0.03em', color: pal.text3, lineHeight: 1.5 }}>{pNote}</span>
        </div>
      )}

      {/* explainer rail (same window mobile uses): always on coarse; on desktop when an element is pinned (alongside the tooltip) */}
      {spec.layout !== 'scenario' && (coarse || pin) && (
        <MobileInsight spec={spec} pal={pal} accent={accent}
          active={coarse ? mobileTarget : pin}
          order={mobileOrder}
          onStep={coarse ? stepMobile : stepPin}
          onPick={coarse ? pickMobile : pinById}
          onClear={coarse ? () => setMobileActive(null) : () => onPin(null)} />
      )}

      {/* explainer */}
      <div style={{ height: 1, background: pal.cardBorder }} />
      <div style={{ padding: `16px ${padX}` }}><ExplainerBlock spec={spec} pal={pal} accent={accent} /></div>

      {/* progressive disclosure — the citation machinery is one intentional click away */}
      <div style={{ height: 1, background: pal.cardBorder }} />
      <div style={{ padding: `8px ${padX}` }}>
        <button onClick={() => setShowDetails((v) => !v)} aria-expanded={showDetails} aria-controls={`${reactId}-details`}
          aria-label={`${showDetails ? 'Hide' : 'Show'} details, sources, and methodology for ${spec.title}`}
          className="acf-fx-focusable" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 32, background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 0', fontFamily: pal.mono, fontSize: 9.5, letterSpacing: '0.1em', color: pal.text3 }}>
          <span aria-hidden style={{ display: 'inline-flex', transform: showDetails ? 'rotate(90deg)' : 'none', transition: reduce ? 'none' : 'transform 160ms ease', color: pal.text4 }}><BrushChevron size={11} /></span>
          DETAILS, SOURCES &amp; METHODOLOGY
        </button>
      </div>
      <figcaption id={`${reactId}-details`} style={{ display: showDetails ? 'flex' : 'none', padding: `0 ${padX} 14px`, justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <SourceFooter spec={spec} pal={pal} accent={accent} />
        <ConceptLinks items={spec.concepts} pal={pal} accent={accent} />
      </figcaption>
    </figure>
  );
}
