/* ───────────────────────────────────────────────────────────────────────────
 * FrameworkChart — the one reusable Part 1 exhibit engine.
 *
 * Recreates the locked "ACF Part 1 Spec Lock" interaction model in importable
 * React (not the window.* / Babel prototype). A single component renders the
 * full Claim → Chart → Explainer → Source loop from a spec:
 *
 *   topline (claim + title + setup line + truth badge)
 *   one primary visual relationship (single plot, or dual stacked panels)
 *   concise explainer block
 *   verifiable / disclosed source footer
 *
 * Behavior carried here: desktop hover + click-to-pin, mobile tap single-insight
 * sheet, keyboard-focusable data points, viewport-aware tooltip placement,
 * prefers-reduced-motion, aria summary, and the bespoke non-rectangular
 * pressure-field shock background. Text always renders above chart geometry.
 *
 * The chart is a self-contained DARK TERMINAL panel regardless of docs theme.
 * ─────────────────────────────────────────────────────────────────────────── */
import React from 'react';
import * as Brush from './brush';
import { getPalette, getAccent } from './palette';
import { getChartSpec } from './chart-specs.mjs';

const { useState, useEffect, useRef, useMemo, useCallback, useId } = React;

const SR_ONLY = {
  position: 'absolute', width: 1, height: 1, padding: 0, margin: -1,
  overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0,
};

const TIER_LABEL = { series: 'SERIES', band: 'REGIME FIELD', marker: 'INFLECTION', level: 'THRESHOLD' };

// point→segment distance, for nearest-line hit testing
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
    default: return pal.tierSecondary;
  }
}

// ── environment hooks (client-only; SSR-safe defaults) ──────────────────────
function useReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduce(mq.matches);
    on();
    mq.addEventListener ? mq.addEventListener('change', on) : mq.addListener(on);
    return () => (mq.addEventListener ? mq.removeEventListener('change', on) : mq.removeListener(on));
  }, []);
  return reduce;
}
function useCoarsePointer() {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia('(max-width: 700px), (hover: none) and (pointer: coarse)');
    const on = () => setCoarse(mq.matches);
    on();
    mq.addEventListener ? mq.addEventListener('change', on) : mq.addListener(on);
    return () => (mq.addEventListener ? mq.removeEventListener('change', on) : mq.removeListener(on));
  }, []);
  return coarse;
}
function useEntered(reduce) {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    if (reduce) { setEntered(true); return undefined; }
    const a = requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)));
    return () => cancelAnimationFrame(a);
  }, [reduce]);
  return entered;
}

// halo style so text is always legible above geometry
const halo = (pal, size, color, w = 500) => ({
  fontFamily: pal.mono, fontSize: size, fontWeight: w, letterSpacing: '0.1em',
  paintOrder: 'stroke', stroke: pal.scrim, strokeWidth: 3.4, strokeLinejoin: 'round', fill: color,
});
const haloSans = (pal, size, color, w = 600) => ({
  fontFamily: pal.sans, fontSize: size, fontWeight: w,
  paintOrder: 'stroke', stroke: pal.scrim, strokeWidth: 3.4, strokeLinejoin: 'round', fill: color,
});

/* ── PlotSvg ─────────────────────────────────────────────────────────────────
 * Renders ONE plot (single chart, or one panel of a dual chart) and owns its
 * pointer/keyboard interaction + its own tooltip overlay. Active state is lifted
 * so a dual chart shares one active insight across panels. */
function PlotSvg({
  panel, xDomain, xTicks, hideX, width, height, pal, accent, reduce, entered, coarse,
  targets, active, pinned, onActive, onPin, idPrefix, showXAxisLabels = true,
}) {
  const svgRef = useRef(null);
  const dom = { ...xDomain, ...panel.domain };
  const labels = (panel.series || []).filter((s) => s.label).map((s) => s.label);
  const longest = labels.reduce((m, l) => Math.max(m, l.length), 0);
  const pad = {
    l: 18, r: Math.max(72, longest * 7 + 26),
    t: 30, b: hideX ? 14 : 40,
  };
  const x = (v) => pad.l + ((v - dom.xMin) / (dom.xMax - dom.xMin)) * (width - pad.l - pad.r);
  const y = (v) => pad.t + (1 - (v - dom.yMin) / (dom.yMax - dom.yMin)) * (height - pad.t - pad.b);
  const HIT = { line: coarse ? 20 : 12, marker: coarse ? 32 : 24, level: coarse ? 20 : 12 };

  const seriesByKey = {};
  (panel.series || []).forEach((s) => { seriesByKey[s.key] = s; });
  const primary = (panel.series || []).find((s) => s.tier === 'primary') || panel.series[0];

  const geom = useMemo(() => {
    const out = { series: {}, bands: [], markers: [], levels: [], guides: [] };
    (panel.series || []).forEach((s) => {
      const px = s.pts.map((p) => ({ x: x(p.x), y: y(p.y) }));
      const isStroke = s.tier === 'tertiary' || s.tier === 'reference';
      const w = (s.tier === 'primary' ? 1.3 : s.tier === 'secondary' ? 0.74 : 1) * 0.85;
      out.series[s.key] = {
        s, px, end: px[px.length - 1], isStroke,
        d: isStroke ? Brush.smoothOpen(px) : Brush.brushLine(px, { seed: 21 + s.key.length * 9, weight: w, intensity: s.tier === 'primary' ? 0.85 : 0.7 }),
        center: Brush.smoothOpen(px),
      };
    });
    (panel.bands || []).forEach((b) => {
      const xc = (x(b.x0) + x(b.x1)) / 2;
      const halfSpan = ((x(b.x1) - x(b.x0)) / 2) * (b.spanScale || 1);
      const field = Brush.pressureField(xc, pad.t, height - pad.b, halfSpan, { seed: b.seed || 41, intensity: b.intensity ?? 0.78, asymmetric: b.asymmetric ?? 0.16 });
      out.bands.push({ b, xc, field, x0: x(b.x0), x1: x(b.x1), yTop: pad.t, yBot: height - pad.b });
    });
    (panel.markers || []).forEach((m) => {
      const cx = x(m.x), cy = y(m.y);
      out.markers.push({ m, cx, cy, d: m.type === 'enso' ? Brush.enso(cx, cy, m.r || 13, { seed: 97, weight: 0.85, intensity: 0.85, gapAngle: -Math.PI / 3 }) : Brush.inkDot(cx, cy, m.r || 3, { seed: 83, intensity: 0.85 }) });
    });
    (panel.levels || []).forEach((lv) => {
      out.levels.push({ lv, yPx: y(lv.y), d: Brush.brushSegment(pad.l, y(lv.y), width - pad.r, y(lv.y), { seed: 67, weight: 0.6, intensity: 0.85, waver: 0.5 }) });
    });
    (panel.guides || []).forEach((gd) => { out.guides.push({ gd, yPx: y(gd.y) }); });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panel, width, height, dom.xMin, dom.xMax, dom.yMin, dom.yMax]);

  // anchor (viewBox coords) for a given active descriptor, for tooltip + ring
  const anchorOf = useCallback((a) => {
    if (!a) return null;
    if (a.kind === 'series') {
      const g = geom.series[a.seriesKey];
      if (!g) return null;
      const i = a.dataIdx != null ? Math.min(a.dataIdx, g.px.length - 1) : g.px.length - 1;
      return { x: g.px[i].x, y: g.px[i].y };
    }
    if (a.kind === 'band') { const b = geom.bands[0]; return b ? { x: b.field.peakX, y: pad.t + 14 } : null; }
    if (a.kind === 'marker') { const m = geom.markers.find((mm) => mm.m.id === a.id); return m ? { x: m.cx, y: m.cy } : null; }
    if (a.kind === 'level') {
      const lv = geom.levels.find((l) => l.lv.id === a.id);
      if (lv) return { x: width - pad.r - 24, y: lv.yPx };
      const gd = geom.guides.find((g) => g.gd.id === a.id);
      return gd ? { x: width - pad.r - 24, y: gd.yPx } : null;
    }
    return null;
  }, [geom, width, pad.r, pad.t]);

  // pointer hit resolution (desktop hover + tap)
  const resolve = useCallback((mx, my) => {
    const mine = targets;
    for (const t of mine) {
      if (t.kind === 'marker') {
        const m = geom.markers.find((mm) => mm.m.id === t.id);
        if (m && Math.hypot(mx - m.cx, my - m.cy) < HIT.marker) return { ...t };
      }
    }
    for (const t of mine) {
      if (t.kind === 'level') {
        const lv = geom.levels.find((l) => l.lv.id === t.id) || geom.guides.find((g) => g.gd.id === t.id);
        const yp = lv ? (lv.yPx) : null;
        if (yp != null && Math.abs(my - yp) < HIT.level && mx > pad.l && mx < width - pad.r) return { ...t };
      }
    }
    // primary series first, then others
    const order = [...mine].filter((t) => t.kind === 'series').sort((a, b) => (a.seriesKey === primary.key ? -1 : b.seriesKey === primary.key ? 1 : 0));
    for (const t of order) {
      const g = geom.series[t.seriesKey];
      if (!g) continue;
      const dp = nearPoly(mx, my, g.px);
      if (dp.d < HIT.line) return { ...t, dataIdx: dp.i };
    }
    for (const t of mine) {
      if (t.kind === 'band') {
        const b = geom.bands[0];
        if (b && mx >= b.x0 && mx <= b.x1 && my >= b.yTop && my <= b.yBot) return { ...t };
      }
    }
    // fallback preview: primary at pointer x (does not pin)
    const pg = geom.series[primary.key];
    if (pg) {
      const idx = Math.max(0, Math.min(pg.px.length - 1, Math.round(((mx - pad.l) / (width - pad.l - pad.r)) * (pg.px.length - 1))));
      const pt = targets.find((t) => t.kind === 'series' && t.seriesKey === primary.key);
      if (pt) return { ...pt, dataIdx: idx, fallback: true };
    }
    return null;
  }, [geom, targets, HIT.line, HIT.marker, HIT.level, width, pad.l, pad.r, primary]);

  const toViewBox = (e) => {
    const r = svgRef.current.getBoundingClientRect();
    return [(e.clientX - r.left) * (width / r.width), (e.clientY - r.top) * (height / r.height)];
  };
  const onMove = (e) => {
    if (coarse || pinned) return;
    const [mx, my] = toViewBox(e);
    onActive(resolve(mx, my), 'hover');
  };
  const onLeave = () => { if (!coarse && !pinned) onActive(null, 'hover'); };
  const onClick = (e) => {
    const [mx, my] = toViewBox(e);
    const res = resolve(mx, my);
    if (coarse) { onActive(res, 'tap'); return; }
    if (!res || res.fallback) { onPin(null); return; }
    onPin(res);
  };

  // Series hover-target ids equal their series key, so one focusId drives both
  // series dimming and element dimming (focusing the field dims the lines, etc.).
  const isActiveHere = active && targets.some((t) => t.id === active.id);
  const focusId = isActiveHere ? active.id : null;
  const dimOf = (id) => (focusId && focusId !== id ? 0.34 : 1);
  const trans = (p, ms = 180) => (reduce ? undefined : `${p} ${ms}ms ease`);
  const anchor = isActiveHere ? anchorOf(active) : null;

  const drawIn = (delay) => ({
    clipPath: entered ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)',
    WebkitClipPath: entered ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)',
    transition: reduce ? 'none' : `clip-path 1000ms cubic-bezier(0.7,0,0.2,1) ${delay}ms, -webkit-clip-path 1000ms cubic-bezier(0.7,0,0.2,1) ${delay}ms`,
  });

  // tooltip card (HTML overlay, viewport-aware) — desktop only
  const tooltip = (() => {
    if (coarse || !isActiveHere || !anchor || active.kind === 'citation') return null;
    const meta = targets.find((t) => t.id === active.id);
    if (!meta) return null;
    const leftPct = (anchor.x / width) * 100;
    const topPct = (anchor.y / height) * 100;
    const flipX = leftPct > 58;
    const flipY = topPct > 64;
    const val = active.kind === 'series' && active.dataIdx != null
      ? seriesByKey[active.seriesKey]?.s.pts[Math.min(active.dataIdx, seriesByKey[active.seriesKey].s.pts.length - 1)]?.y
      : null;
    const isPin = pinned && active.id === pinned.id;
    const tx = `${flipX ? 'translateX(calc(-100% - 16px))' : 'translateX(16px)'} ${flipY ? 'translateY(calc(-100% - 12px))' : 'translateY(-12px)'}`;
    return (
      <div role={isPin ? 'dialog' : undefined} aria-label={isPin ? meta.name : undefined} style={{
        position: 'absolute', left: `${leftPct}%`, top: `${topPct}%`, zIndex: 8,
        transform: tx, width: 244, pointerEvents: isPin ? 'auto' : 'none',
        background: pal.cardSolid, border: `1px solid ${isPin ? accent : pal.borderHi}`, borderRadius: 6,
        boxShadow: pal.name === 'light' ? '0 6px 22px rgba(40,36,28,0.16)' : '0 8px 28px rgba(0,0,0,0.5)',
        padding: '11px 13px 12px', opacity: entered ? 1 : 0,
        transition: reduce ? 'opacity 160ms ease' : 'opacity 200ms cubic-bezier(0.2,0.7,0.2,1), border-color 220ms ease',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
          <span style={{ fontFamily: pal.mono, fontSize: 8.5, letterSpacing: '0.16em', color: active.kind === 'series' && active.seriesKey === primary.key ? accent : pal.text4 }}>
            {TIER_LABEL[active.kind] || 'ELEMENT'}{isPin && <span style={{ color: accent, marginLeft: 6 }}>· PINNED</span>}
          </span>
          {isPin ? (
            <button onClick={() => onPin(null)} aria-label="Unpin" style={{ background: 'transparent', border: `1px solid ${pal.cardBorder}`, color: pal.text3, cursor: 'pointer', padding: '1px 5px 2px', fontFamily: pal.mono, fontSize: 11, lineHeight: 1, borderRadius: 3 }}>✕</button>
          ) : meta.concept ? (
            <span style={{ fontFamily: pal.mono, fontSize: 8, letterSpacing: '0.08em', color: pal.text4, border: `1px solid ${pal.cardBorder}`, borderRadius: 3, padding: '2px 5px' }}>↳ {meta.concept}</span>
          ) : null}
        </div>
        <div style={{ fontFamily: pal.sans, fontSize: 13.5, fontWeight: 600, color: pal.text1, marginBottom: val != null ? 2 : 6, letterSpacing: '-0.01em' }}>{meta.name}</div>
        {val != null && (
          <div style={{ fontFamily: pal.mono, fontSize: 17, fontWeight: 600, color: accent, marginBottom: 7, fontVariantNumeric: 'tabular-nums' }}>
            {val.toFixed(panel.yUnit === '%' || panel.domain.yMax <= 5 ? 2 : 1)}
            <span style={{ fontSize: 9, color: pal.text4, marginLeft: 5, letterSpacing: '0.1em' }}>{(panel.yUnit || 'val').toUpperCase()} · TRUE VALUE</span>
          </div>
        )}
        <p style={{ margin: 0, fontFamily: pal.sans, fontSize: 11.5, lineHeight: 1.5, color: pal.text2 }}>{meta.why}</p>
        <div style={{ marginTop: 9, paddingTop: 8, borderTop: `1px solid ${pal.cardBorder}`, display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
          <span style={{ fontFamily: pal.sans, fontSize: 10, color: pal.text4, fontStyle: 'italic' }}>{meta.claim}</span>
          {meta.link ? (
            isPin
              ? <a href={meta.link} style={{ fontFamily: pal.mono, fontSize: 8.5, letterSpacing: '0.1em', color: accent, textDecoration: 'none', borderBottom: `1px solid ${accent}77`, paddingBottom: 1, whiteSpace: 'nowrap' }}>READ →</a>
              : <span style={{ fontFamily: pal.mono, fontSize: 8, color: pal.text4, letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>CLICK TO PIN</span>
          ) : null}
        </div>
      </div>
    );
  })();

  return (
    <div style={{ position: 'relative' }}>
      <svg
        ref={svgRef} viewBox={`0 0 ${width} ${height}`} width="100%" role="group"
        aria-label={panel.label ? `${panel.label} panel` : undefined}
        style={{ display: 'block', cursor: coarse ? 'pointer' : 'crosshair', touchAction: 'manipulation' }}
        onMouseMove={onMove} onMouseLeave={onLeave} onClick={onClick}
      >
        {/* 1 · grid */}
        {(panel.yTicks || []).map((t, i) => (
          <line key={`g${i}`} x1={pad.l} x2={width - pad.r} y1={y(t.v)} y2={y(t.v)} stroke={pal.grid} strokeWidth="1" strokeDasharray="1 7" />
        ))}
        {(panel.yTicks || []).map((t, i) => (
          <text key={`yl${i}`} x={width - pad.r + 9} y={y(t.v) + 3.5} style={{ ...halo(pal, 10, pal.axis, 500), letterSpacing: '0.03em' }}>{t.label != null ? t.label : t.v}</text>
        ))}
        {panel.yUnit ? <text x={pad.l} y={pad.t - 12} style={halo(pal, 9, pal.axis, 500)}>{panel.yUnit.toUpperCase()}</text> : null}
        {!hideX && showXAxisLabels && (xTicks || []).map((t, i) => {
          const anc = t.v === dom.xMin ? 'start' : t.v === dom.xMax ? 'end' : 'middle';
          return <text key={`xl${i}`} x={x(t.v)} y={height - pad.b + 20} textAnchor={anc} style={halo(pal, 9, pal.axis, 500)}>{t.label.toUpperCase()}</text>;
        })}

        {/* 2 · bands — bespoke pressure field (never a rectangle) */}
        {geom.bands.map((bg, i) => (
          <g key={`band${i}`} style={{
            opacity: entered ? (focusId === bg.b.id ? 1 : 0.85) : 0,
            transformOrigin: `${bg.xc}px ${(bg.yTop + bg.yBot) / 2}px`,
            transform: entered ? 'none' : 'scale(0.94)',
            transition: reduce ? 'opacity 320ms ease' : 'opacity 900ms cubic-bezier(0.2,0.7,0.2,1) 80ms, transform 900ms cubic-bezier(0.2,0.7,0.2,1) 80ms',
          }}>
            <path d={bg.field.plume} fill={pal.bandStress} fillOpacity={focusId === bg.b.id ? (pal.name === 'light' ? 0.20 : 0.18) : (pal.name === 'light' ? 0.13 : 0.12)} style={{ transition: trans('fill-opacity') }} />
            {bg.field.grains.map((gr, gi) => <circle key={gi} cx={gr.x} cy={gr.y} r={gr.r} fill={pal.bandStress} opacity={gr.op} />)}
          </g>
        ))}

        {/* 3 · guides */}
        {geom.guides.map((g, i) => (
          <g key={`gd${i}`}>
            <line x1={pad.l} x2={width - pad.r} y1={g.yPx} y2={g.yPx}
              stroke={g.gd.kind === 'threshold' ? pal.invalidCharcoal : g.gd.kind === 'zero' ? pal.tierReference : pal.tierReference}
              strokeWidth={g.gd.kind === 'zero' ? 0.9 : 0.9}
              strokeDasharray={g.gd.dash ? '5 5' : g.gd.kind === 'zero' ? '1 6' : '1 6'}
              opacity={focusId === g.gd.id ? 0.95 : 0.6} style={{ transition: trans('opacity') }} />
            {g.gd.label && <text x={g.gd.kind === 'threshold' ? width - pad.r : pad.l + 4} y={g.yPx - 6} textAnchor={g.gd.kind === 'threshold' ? 'end' : 'start'} style={halo(pal, 9, g.gd.kind === 'threshold' ? pal.invalidCharcoal : pal.axis, 500)}>{g.gd.label}</text>}
          </g>
        ))}

        {/* 4 · secondary / tertiary series */}
        {(panel.series || []).filter((s) => s.tier !== 'primary').map((s) => {
          const g = geom.series[s.key];
          return (
            <g key={`sec${s.key}`} style={{ opacity: dimOf(s.key), transition: trans('opacity') }}>
              <g style={drawIn(320)}>
                {g.isStroke
                  ? <path d={g.d} fill="none" stroke={tierColor(s.tier, pal, accent)} strokeWidth="1.1" strokeDasharray={s.tier === 'tertiary' ? '5 5' : '0'} strokeLinecap="round" opacity="0.7" />
                  : <path d={g.d} fill={tierColor(s.tier, pal, accent)} opacity="0.82" />}
              </g>
            </g>
          );
        })}

        {/* 5 · primary series */}
        {(panel.series || []).filter((s) => s.tier === 'primary').map((s) => {
          const g = geom.series[s.key];
          return (
            <g key={`pri${s.key}`} style={{ opacity: dimOf(s.key), transition: trans('opacity') }}>
              <g style={drawIn(120)}>
                <path d={g.d} fill={accent} />
                {focusId === s.key && <path d={g.center} fill="none" stroke={accent} strokeWidth="1" opacity="0.9" />}
              </g>
            </g>
          );
        })}

        {/* 6 · levels (threshold) */}
        {geom.levels.map((l, i) => (
          <g key={`lv${i}`} opacity={dimOf(l.lv.id)} style={{ transition: trans('opacity') }}>
            <path d={l.d} fill={pal.invalidCharcoal} opacity={focusId === l.lv.id ? 1 : 0.85} />
          </g>
        ))}

        {/* 7 · markers (enso / dot) */}
        {geom.markers.map((m, i) => (
          <g key={`mk${i}`} style={{
            opacity: entered ? dimOf(m.m.id) : 0,
            transformOrigin: `${m.cx}px ${m.cy}px`, transform: entered ? 'none' : 'scale(0.86)',
            transition: reduce ? 'opacity 240ms ease 460ms' : 'opacity 360ms cubic-bezier(0.2,0.7,0.2,1) 620ms, transform 480ms cubic-bezier(0.2,0.7,0.2,1) 620ms',
          }}>
            <path d={m.d} fill={pal.markInk} />
            {focusId === m.m.id && <circle cx={m.cx} cy={m.cy} r={(m.m.r || 13) + 2} fill="none" stroke={accent} strokeWidth="1.1" opacity="0.9" />}
          </g>
        ))}

        {/* 8 · leader lines (only for the upper-left enso callouts) */}
        {geom.markers.map((m, i) => (m.m.label && m.m.labelAnchor === 'end') ? (
          <line key={`ld${i}`} x1={m.cx - (m.m.r || 13) - 4} y1={m.cy - (m.m.r || 13) - 2} x2={m.cx - (m.m.r || 13) - 16} y2={m.cy - (m.m.r || 13) - 10} stroke={pal.text4} strokeWidth="0.75" opacity={entered ? 0.55 : 0} style={{ transition: trans('opacity', 400) }} />
        ) : null)}

        {/* 9 · text labels (always above geometry) */}
        {!coarse && geom.bands.map((bg, i) => bg.b.label ? (
          <text key={`bl${i}`} x={bg.b.labelAnchor === 'peak' ? bg.field.peakX : bg.x0 + 10} y={pad.t + 14} textAnchor={bg.b.labelAnchor === 'peak' ? 'middle' : 'start'} style={halo(pal, 9.5, pal.bandStressText)}>{bg.b.label}</text>
        ) : null)}
        {!coarse && geom.markers.map((m, i) => {
          if (!m.m.label) return null;
          const r = m.m.r || 13;
          const anc = m.m.labelAnchor === 'end' ? 'end' : m.m.labelAnchor === 'start' ? 'start' : 'middle';
          const lx = anc === 'end' ? m.cx - r - 6 : anc === 'start' ? m.cx + r + 6 : m.cx;
          return <text key={`ml${i}`} x={lx} y={m.cy + (m.m.labelDy ?? -18)} textAnchor={anc} style={halo(pal, 9.5, pal.text2)}>{m.m.label}</text>;
        })}
        {/* direct end-of-line labels (color is never the only channel) */}
        {(panel.series || []).map((s) => {
          const g = geom.series[s.key];
          const c = s.tier === 'primary' ? accent : tierColor(s.tier, pal, accent);
          return s.label ? (
            <text key={`el${s.key}`} x={g.end.x + 9} y={g.end.y + 3.5 + (s.labelDy || 0)} style={{ ...haloSans(pal, s.tier === 'primary' ? 11.5 : 11, c, s.tier === 'primary' ? 600 : 500), opacity: dimOf(s.key) }}>{s.label}</text>
          ) : null;
        })}

        {/* 10 · crosshair on series hover */}
        {anchor && isActiveHere && active.kind === 'series' && (
          <g style={{ pointerEvents: 'none' }}>
            <line x1={anchor.x} x2={anchor.x} y1={pad.t} y2={height - pad.b} stroke={accent} strokeWidth="0.6" strokeDasharray="2 3" opacity="0.5" />
            <circle cx={anchor.x} cy={anchor.y} r="4" fill={accent} stroke={pal.scrim} strokeWidth="1.5" />
          </g>
        )}

        {/* 11 · keyboard focus chips (one per target in this panel) */}
        {targets.map((t) => {
          const a = anchorOf(t.kind === 'series' ? { ...t, dataIdx: null } : t);
          if (!a) return null;
          return (
            <circle
              key={`hit${t.id}`} className="acf-fx-focusable" cx={a.x} cy={a.y} r={coarse ? 12 : 9}
              fill="transparent" tabIndex={0} role="button"
              aria-label={`${meta_label(t)}. ${t.why} ${t.claim}`}
              onFocus={() => onActive({ ...t, dataIdx: t.kind === 'series' ? geom.series[t.seriesKey].px.length - 1 : undefined }, 'focus')}
              onBlur={() => onActive(null, 'focus')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPin(pinned && pinned.id === t.id ? null : { ...t, dataIdx: t.kind === 'series' ? geom.series[t.seriesKey].px.length - 1 : undefined }); }
              }}
              style={{ cursor: 'pointer' }}
            />
          );
        })}
      </svg>
      {tooltip}
    </div>
  );
}

function meta_label(t) { return t.name || t.label; }

/* ── Explainer block ─────────────────────────────────────────────────────── */
function ExplainerBlock({ spec, pal, accent }) {
  return (
    <div style={{ display: 'flex', gap: 14 }}>
      <div style={{ width: 2, flexShrink: 0, borderRadius: 2, background: accent, opacity: 0.55 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: pal.sans, fontSize: 14.5, fontWeight: 600, color: pal.text1, letterSpacing: '-0.01em', marginBottom: 6 }}>{spec.explainerHeadline}</div>
        <p style={{ margin: 0, fontFamily: pal.sans, fontSize: 13.5, lineHeight: 1.62, color: pal.text2, maxWidth: 660 }}>
          {spec.explainerBody}
          {spec.explainerConcept && (
            <span style={{ whiteSpace: 'nowrap' }}>{' '}
              <span style={{ fontFamily: pal.mono, fontSize: 10.5, letterSpacing: '0.04em', color: pal.text3, borderBottom: `1px dotted ${pal.borderHi}`, paddingBottom: 1 }}>↳ {spec.explainerConcept}</span>
            </span>
          )}
        </p>
        {spec.readerTakeaway && <div style={{ marginTop: 9, fontFamily: pal.sans, fontSize: 13, fontStyle: 'italic', color: pal.text3 }}>{spec.readerTakeaway}</div>}
      </div>
    </div>
  );
}

/* ── Source footer — verifiable when live, clearly disclosed when representative */
function SourceFooter({ spec, pal, accent }) {
  const [open, setOpen] = useState(false);
  const representative = spec.dataStatus !== 'live';
  const mono = { fontFamily: pal.mono, fontSize: 10.5, letterSpacing: '0.04em' };
  const sources = spec.sources || [];

  if (!representative && sources.length === 0) {
    return <div style={{ ...mono, color: pal.bandStress, letterSpacing: '0.08em' }}>⚠ SOURCE REQUIRED · empirical chart without a citation</div>;
  }

  const Rows = (
    <div>
      <div style={{ fontFamily: pal.mono, fontSize: 8.5, letterSpacing: '0.16em', color: pal.text4, marginBottom: 10 }}>{representative ? 'TARGET SOURCES · PRODUCTION' : (sources.length > 1 ? 'SOURCES' : 'SOURCE')}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sources.map((s, i) => (
          <div key={i} style={{ paddingBottom: i < sources.length - 1 ? 12 : 0, borderBottom: i < sources.length - 1 ? `1px solid ${pal.cardBorder}` : 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
              <span style={{ fontFamily: pal.sans, fontSize: 12.5, fontWeight: 600, color: pal.text1 }}>{s.provider}{s.role === 'author-calculation' ? ' · author calc' : ''}</span>
              {s.url && <a href={s.url} target="_blank" rel="noreferrer" style={{ fontFamily: pal.mono, fontSize: 10, letterSpacing: '0.04em', color: accent, textDecoration: 'none', borderBottom: `1px dotted ${accent}`, whiteSpace: 'nowrap' }}>Open ↗</a>}
            </div>
            {(s.seriesId || s.label) && <div style={{ fontFamily: pal.sans, fontSize: 11.5, color: pal.text2, marginBottom: 5 }}>{s.seriesId ? `${s.seriesId} · ` : ''}{s.label}</div>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 12px', fontFamily: pal.mono, fontSize: 9.5, letterSpacing: '0.04em', color: pal.text4 }}>
              {s.dateRange && <span>RANGE&nbsp;&nbsp;{s.dateRange}</span>}
              {s.frequency && <span>FREQ&nbsp;&nbsp;{s.frequency}</span>}
              {s.transform && <span>TRANSFORM&nbsp;&nbsp;{s.transform}</span>}
            </div>
            {s.notes && <div style={{ fontFamily: pal.sans, fontSize: 11, fontStyle: 'italic', color: pal.text3, marginTop: 6, lineHeight: 1.5 }}>{s.notes}</div>}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap', ...mono }}>
        {representative ? (
          <>
            <span aria-hidden style={{ width: 7, height: 7, transform: 'rotate(45deg)', border: `1px solid ${pal.bandStressText}`, flexShrink: 0 }} />
            <span style={{ color: pal.bandStressText, letterSpacing: '0.12em', fontStyle: 'italic' }}>REPRESENTATIVE SHAPE</span>
            <span style={{ color: pal.text3, maxWidth: 'min(58vw, 520px)' }}>{spec.truthDisclosure}</span>
          </>
        ) : (
          <>
            <span aria-hidden style={{ width: 6, height: 6, background: pal.text3, flexShrink: 0 }} />
            <span style={{ color: pal.text3, letterSpacing: '0.1em' }}>{sources.length > 1 ? 'SOURCES' : 'SOURCE'}</span>
            <span style={{ color: pal.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 'min(56vw, 520px)' }}>{spec.citationFooter}</span>
          </>
        )}
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} style={{ marginLeft: 4, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontFamily: pal.mono, fontSize: 10.5, letterSpacing: '0.04em', color: accent, borderBottom: `1px dotted ${accent}`, paddingBottom: 1 }}>
          {representative ? 'View target sources' : (sources.length > 1 ? 'View sources' : 'View data')} ↗
        </button>
      </div>
      {open && (
        <div style={{ position: 'absolute', right: 0, bottom: 'calc(100% + 8px)', zIndex: 30, width: 'min(340px, 86vw)', background: pal.cardSolid, border: `1px solid ${pal.borderHi}`, borderRadius: 6, padding: '12px 14px', boxShadow: pal.name === 'light' ? '0 8px 26px rgba(40,36,28,0.18)' : '0 10px 32px rgba(0,0,0,0.55)' }}>
          {Rows}
        </div>
      )}
    </div>
  );
}

/* ── Concept links ───────────────────────────────────────────────────────── */
function ConceptLinks({ items, pal, accent }) {
  if (!items || !items.length) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <span style={{ fontFamily: pal.mono, fontSize: 9, letterSpacing: '0.16em', color: pal.text3 }}>CONNECTS TO</span>
      {items.map((c, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span aria-hidden style={{ width: 4, height: 4, borderRadius: '50%', background: pal.text3, opacity: 0.8 }} />
          {c.link
            ? <a href={c.link} style={{ fontFamily: pal.sans, fontSize: 11.5, color: pal.text3, borderBottom: `1px dotted ${pal.borderHi}`, paddingBottom: 1, textDecoration: 'none' }}>{c.label}</a>
            : <span style={{ fontFamily: pal.sans, fontSize: 11.5, color: pal.text3 }}>{c.label}</span>}
        </span>
      ))}
    </div>
  );
}

/* ── Mobile single-insight stepper (tap, never hover) ────────────────────────*/
function MobileInsight({ spec, pal, accent, active, onStep, onPick }) {
  const order = spec.mobileTapTargets || spec.hoverTargets.map((t) => t.id);
  const targets = spec.hoverTargets;
  const idx = Math.max(0, order.findIndex((id) => active && id === active.id));
  const cur = targets.find((t) => t.id === order[idx]) || targets[0];
  const tapBtn = { width: 44, height: 44, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: pal.surface, border: `1px solid ${pal.cardBorder}`, borderRadius: 10, cursor: 'pointer', color: pal.text2, fontSize: 18 };
  return (
    <div style={{ background: pal.cardSolid, borderTop: `1px solid ${pal.borderHi}`, borderRadius: '0 0 6px 6px', padding: '12px 16px 14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontFamily: pal.mono, fontSize: 9, letterSpacing: '0.14em', color: cur.kind === 'series' && cur.seriesKey === spec.primaryKey ? accent : pal.text4 }}>{TIER_LABEL[cur.kind] || 'ELEMENT'}</span>
        {cur.concept && <span style={{ fontFamily: pal.mono, fontSize: 8.5, letterSpacing: '0.06em', color: pal.text4, border: `1px solid ${pal.cardBorder}`, borderRadius: 3, padding: '2px 6px' }}>↳ {cur.concept}</span>}
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color: pal.text1, letterSpacing: '-0.01em', marginBottom: 5 }}>{cur.name}</div>
      <p style={{ margin: '0 0 6px', fontSize: 13, lineHeight: 1.55, color: pal.text2 }}>{cur.why}</p>
      <div style={{ fontSize: 12, color: pal.text3, fontStyle: 'italic', marginBottom: 12 }}>{cur.claim}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => onStep(-1)} style={tapBtn} aria-label="Previous insight">‹</button>
        <div style={{ display: 'flex', gap: 7 }}>
          {order.map((id, i) => (
            <button key={id} onClick={() => onPick(id)} aria-label={`Insight ${i + 1}`} style={{ width: i === idx ? 18 : 7, height: 7, padding: 0, border: 'none', borderRadius: 4, cursor: 'pointer', background: i === idx ? accent : pal.cardBorder, transition: 'all .2s ease' }} />
          ))}
        </div>
        <button onClick={() => onStep(1)} style={tapBtn} aria-label="Next insight">›</button>
      </div>
    </div>
  );
}

/* ── FrameworkChart (orchestrator) ──────────────────────────────────────────*/
export default function FrameworkChart({ id, spec: specProp, theme = 'dark', accent: accentName = 'green', className }) {
  const spec = specProp || getChartSpec(id);
  const pal = getPalette(theme);
  const accent = getAccent(pal, accentName);
  const reduce = useReducedMotion();
  const coarse = useCoarsePointer();
  const entered = useEntered(reduce);
  const reactId = useId();

  const [hover, setHover] = useState(null);   // pointer/keyboard ephemeral
  const [pin, setPin] = useState(null);       // pinned (desktop)
  const [mobileActive, setMobileActive] = useState(null);

  // ESC unpins
  useEffect(() => {
    if (coarse) return undefined;
    const k = (e) => { if (e.key === 'Escape') setPin(null); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [coarse]);

  if (!spec) {
    return <div role="alert" style={{ fontFamily: 'monospace', color: '#C0837A', padding: 12 }}>FrameworkChart: unknown chart id “{id}”.</div>;
  }

  // default mobile insight = first tap target
  const firstMobile = (spec.mobileTapTargets || spec.hoverTargets.map((t) => t.id))[0];
  const mobileTarget = spec.hoverTargets.find((t) => t.id === (mobileActive ? mobileActive.id : firstMobile)) || spec.hoverTargets[0];
  const active = coarse ? mobileTarget : (pin || hover);
  const pinned = coarse ? null : pin;

  const onActive = useCallback((res, src) => {
    if (src === 'tap') { if (res && !res.fallback) setMobileActive(res); return; }
    if (src === 'focus') { setHover(res); return; }
    setHover(res); // hover
  }, []);
  const onPin = useCallback((res) => { setPin(res); if (res) setHover(res); }, []);

  const stepMobile = (d) => {
    const order = spec.mobileTapTargets || spec.hoverTargets.map((t) => t.id);
    const i = Math.max(0, order.findIndex((idv) => idv === (mobileTarget && mobileTarget.id)));
    const next = (i + d + order.length) % order.length;
    setMobileActive(spec.hoverTargets.find((t) => t.id === order[next]));
  };
  const pickMobile = (idv) => setMobileActive(spec.hoverTargets.find((t) => t.id === idv));

  const padX = 'clamp(14px, 3vw, 22px)';
  const badge = coarse ? 'TAP TO EXPLORE' : 'LIVE · HOVER';

  // build plots (single → one; dual → per panel)
  const plots = spec.layout === 'dual'
    ? spec.panels.map((p) => ({ panel: p, targets: spec.hoverTargets.filter((t) => t.panel === p.id) }))
    : [{ panel: { ...spec, label: undefined }, targets: spec.hoverTargets }];

  const singleW = 1000;
  const heightFor = (i) => (spec.layout === 'dual' ? (i === 0 ? 188 : 212) : 426);

  return (
    <figure
      className={className}
      aria-label={`${spec.title}. ${spec.frameworkClaim}`}
      aria-describedby={`${reactId}-summary`}
      style={{
        margin: '34px 0', background: pal.card, border: `1px solid ${pal.cardBorder}`,
        borderTop: `2px solid ${accent}`, borderRadius: 7, overflow: 'visible', colorScheme: pal.name,
        fontFamily: pal.sans, color: pal.text1,
      }}
    >
      <span id={`${reactId}-summary`} style={SR_ONLY}>{spec.ariaSummary}</span>

      {/* topline */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: `16px ${padX} 8px`, gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: pal.mono, fontSize: 9.5, letterSpacing: '0.18em', color: pal.text3, marginBottom: 6 }}>{spec.idx} · {spec.claimLabel}</div>
          <h3 style={{ margin: 0, fontSize: 'clamp(16px, 2.6vw, 20px)', fontWeight: 600, color: pal.text1, letterSpacing: '-0.015em', lineHeight: 1.2 }}>{spec.title}</h3>
          {spec.setupLine && <p style={{ margin: '6px 0 0', fontSize: 12.5, color: pal.text3, lineHeight: 1.45 }}>{spec.setupLine}</p>}
        </div>
        <span style={{ flexShrink: 0, fontFamily: pal.mono, fontSize: 8.5, letterSpacing: '0.14em', color: pal.text3, border: `1px solid ${pal.borderHi}`, borderRadius: 3, padding: '3px 7px', whiteSpace: 'nowrap' }}>{badge}</span>
      </div>

      {/* plot(s) */}
      <div style={{ padding: `2px clamp(8px, 2vw, 14px) 8px` }}>
        {plots.map((pl, i) => (
          <React.Fragment key={pl.panel.id || 'single'}>
            {spec.layout === 'dual' && <div style={{ fontFamily: pal.mono, fontSize: 9.5, letterSpacing: '0.12em', color: pal.text4, padding: '4px 0 2px 10px' }}>{pl.panel.label.toUpperCase()}</div>}
            <PlotSvg
              panel={pl.panel} xDomain={spec.layout === 'dual' ? spec.xDomain : spec.domain} xTicks={spec.xTicks}
              hideX={spec.layout === 'dual' && i === 0} width={singleW} height={heightFor(i)}
              pal={pal} accent={accent} reduce={reduce} entered={entered} coarse={coarse}
              targets={pl.targets} active={active} pinned={pinned} onActive={onActive} onPin={onPin}
              idPrefix={`${reactId}-${i}`}
            />
            {spec.layout === 'dual' && i === 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 14px' }}>
                <span aria-hidden style={{ flex: 1, height: 1, background: pal.cardBorder }} />
                <span style={{ fontFamily: pal.sans, fontSize: 10.5, fontStyle: 'italic', color: pal.text3, textAlign: 'center' }}>{spec.connective}</span>
                <span aria-hidden style={{ flex: 1, height: 1, background: pal.cardBorder }} />
              </div>
            )}
          </React.Fragment>
        ))}
        {!coarse && (
          <div style={{ textAlign: 'center', fontFamily: pal.mono, fontSize: 8.5, letterSpacing: '0.1em', color: pal.text4, marginTop: 2 }}>
            HOVER OR TAB A LINE, FIELD, OR MARKER · CLICK TO PIN
          </div>
        )}
      </div>

      {/* mobile single-insight sheet */}
      {coarse && <MobileInsight spec={spec} pal={pal} accent={accent} active={mobileTarget} onStep={stepMobile} onPick={pickMobile} />}

      {/* explainer */}
      <div style={{ height: 1, background: pal.cardBorder }} />
      <div style={{ padding: `16px ${padX}` }}>
        <ExplainerBlock spec={spec} pal={pal} accent={accent} />
      </div>

      {/* source footer + concepts */}
      <div style={{ height: 1, background: pal.cardBorder }} />
      <figcaption style={{ padding: `12px ${padX} 14px`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <SourceFooter spec={spec} pal={pal} accent={accent} />
        <ConceptLinks items={spec.concepts} pal={pal} accent={accent} />
      </figcaption>
    </figure>
  );
}
