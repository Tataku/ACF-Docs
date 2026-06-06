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
import { getPalette, getAccent } from './palette';
import { getChartSpec, footerModel } from './chart-specs.mjs';

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
function useEntered(reduce) {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    if (reduce) { setEntered(true); return undefined; }
    const a = requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)));
    return () => cancelAnimationFrame(a);
  }, [reduce]);
  return entered;
}

const halo = (pal, size, color, w = 500) => ({
  fontFamily: pal.mono, fontSize: size, fontWeight: w, letterSpacing: '0.1em',
  paintOrder: 'stroke', stroke: pal.scrim, strokeWidth: 3.4, strokeLinejoin: 'round', fill: color,
});
const haloSans = (pal, size, color, w = 600) => ({
  fontFamily: pal.sans, fontSize: size, fontWeight: w,
  paintOrder: 'stroke', stroke: pal.scrim, strokeWidth: 3.4, strokeLinejoin: 'round', fill: color,
});

/* ── Shared tooltip ──────────────────────────────────────────────────────────
 * Hover preview is ephemeral; click pins it (links become clickable). Placement
 * is viewport-aware: flips across the anchor and never sits on top of the point. */
function TargetTooltip({ meta, kindLabel, accentTitle, xPct, yPct, isPin, pal, accent, reduce, entered, onUnpin, valueText }) {
  const flipX = xPct > 58, flipY = yPct > 64;
  const tx = `${flipX ? 'translateX(calc(-100% - 16px))' : 'translateX(16px)'} ${flipY ? 'translateY(calc(-100% - 12px))' : 'translateY(-12px)'}`;
  return (
    <div role={isPin ? 'dialog' : undefined} aria-label={isPin ? meta.name : undefined} style={{
      position: 'absolute', left: `${xPct}%`, top: `${yPct}%`, zIndex: 8,
      transform: tx, width: 244, pointerEvents: isPin ? 'auto' : 'none',
      background: pal.cardSolid, border: `1px solid ${isPin ? accent : pal.borderHi}`, borderRadius: 6,
      boxShadow: pal.name === 'light' ? '0 6px 22px rgba(40,36,28,0.16)' : '0 8px 28px rgba(0,0,0,0.5)',
      padding: '11px 13px 12px', opacity: entered ? 1 : 0,
      transition: reduce ? 'opacity 160ms ease' : 'opacity 200ms cubic-bezier(0.2,0.7,0.2,1), border-color 220ms ease',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
        <span style={{ fontFamily: pal.mono, fontSize: 8.5, letterSpacing: '0.16em', color: accentTitle ? accent : pal.text4 }}>
          {kindLabel}{isPin && <span style={{ color: accent, marginLeft: 6 }}>· PINNED</span>}
        </span>
        {isPin ? (
          <button onClick={onUnpin} aria-label="Unpin" style={{ background: 'transparent', border: `1px solid ${pal.cardBorder}`, color: pal.text3, cursor: 'pointer', padding: '1px 5px 2px', fontFamily: pal.mono, fontSize: 11, lineHeight: 1, borderRadius: 3 }}>✕</button>
        ) : meta.concept ? (
          <span style={{ fontFamily: pal.mono, fontSize: 8, letterSpacing: '0.08em', color: pal.text4, border: `1px solid ${pal.cardBorder}`, borderRadius: 3, padding: '2px 5px' }}>↳ {meta.concept}</span>
        ) : null}
      </div>
      <div style={{ fontFamily: pal.sans, fontSize: 13.5, fontWeight: 600, color: pal.text1, marginBottom: valueText ? 2 : 6, letterSpacing: '-0.01em' }}>{meta.name}</div>
      {valueText && (
        <div style={{ fontFamily: pal.mono, fontSize: 17, fontWeight: 600, color: accent, marginBottom: 7, fontVariantNumeric: 'tabular-nums' }}>{valueText}</div>
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
}

// focusable keyboard chip at a viewBox anchor (hover parity)
function FocusChip({ t, anchor, coarse, pinned, onActive, onPin, mkActive }) {
  if (!anchor) return null;
  return (
    <circle
      className="acf-fx-focusable" cx={anchor.x} cy={anchor.y} r={coarse ? 12 : 9}
      fill="transparent" tabIndex={0} role="button"
      aria-label={`${t.name || t.label}. ${t.why} ${t.claim}`}
      onFocus={() => onActive(mkActive(t), 'focus')}
      onBlur={() => onActive(null, 'focus')}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPin(pinned && pinned.id === t.id ? null : mkActive(t)); } }}
      style={{ cursor: 'pointer' }}
    />
  );
}

/* ── PlotSvg — single chart or one dual panel (time-series family) ───────────*/
function PlotSvg({
  panel, xDomain, xTicks, hideX, width, height, pal, accent, reduce, entered, coarse,
  targets, active, pinned, onActive, onPin, showValues = true, valueNote = 'TRUE VALUE',
}) {
  const svgRef = useRef(null);
  const dom = { ...xDomain, ...panel.domain };
  const labels = (panel.series || []).filter((s) => s.label).map((s) => s.label);
  const longest = labels.reduce((m, l) => Math.max(m, l.length), 0);
  const pad = { l: 18, r: Math.max(74, longest * 7 + 26), t: 30, b: hideX ? 14 : 40 };
  const x = (v) => pad.l + ((v - dom.xMin) / (dom.xMax - dom.xMin)) * (width - pad.l - pad.r);
  const y = (v) => pad.t + (1 - (v - dom.yMin) / (dom.yMax - dom.yMin)) * (height - pad.t - pad.b);
  const HIT = { line: coarse ? 20 : 12, marker: coarse ? 32 : 24, level: coarse ? 20 : 12 };

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
      out.areas.push({ a, d: areaPath(topPx, botPx), labelX: a.xFrom != null ? x((a.xFrom + dom.xMax) / 2) : x((dom.xMin + dom.xMax) * 0.6) });
    });
    (panel.bands || []).forEach((b) => {
      const xc = (x(b.x0) + x(b.x1)) / 2;
      const halfSpan = ((x(b.x1) - x(b.x0)) / 2) * (b.spanScale || 1);
      if (b.render === 'wash') {
        out.bands.push({ b, xc, wash: Brush.washRect(x(b.x0), pad.t, x(b.x1), height - pad.b, { seed: b.seed || 33, intensity: 0.7, soft: 'both' }), x0: x(b.x0), x1: x(b.x1), yTop: pad.t, yBot: height - pad.b });
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
  const dimOf = (id) => (focusId && focusId !== id ? 0.34 : 1);
  const trans = (p, ms = 180) => (reduce ? undefined : `${p} ${ms}ms ease`);
  const anchor = isActiveHere ? anchorOf(active) : null;
  const drawIn = (delay) => ({
    clipPath: entered ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)', WebkitClipPath: entered ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)',
    transition: reduce ? 'none' : `clip-path 1000ms cubic-bezier(0.7,0,0.2,1) ${delay}ms, -webkit-clip-path 1000ms cubic-bezier(0.7,0,0.2,1) ${delay}ms`,
  });

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
      const valueText = showValues && raw != null ? `${raw.toFixed(dec)} ${unit} · ${valueNote}` : null;
      tooltip = <TargetTooltip meta={meta} kindLabel={TIER_LABEL[active.kind] || 'ELEMENT'} accentTitle={active.kind === 'series' && active.seriesKey === primary.key} xPct={(anchor.x / width) * 100} yPct={(anchor.y / height) * 100} isPin={!!pinned && active.id === pinned.id} pal={pal} accent={accent} reduce={reduce} entered={entered} onUnpin={() => onPin(null)} valueText={valueText} />;
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

        {/* bands — pressure field (shock) or feathered wash (regime/compression) */}
        {geom.bands.map((bg, i) => (
          <g key={`band${i}`} style={{ opacity: entered ? (focusId === bg.b.id ? 1 : 0.85) : 0, transformOrigin: `${bg.xc}px ${(bg.yTop + bg.yBot) / 2}px`, transform: entered ? 'none' : 'scale(0.94)', transition: reduce ? 'opacity 320ms ease' : 'opacity 900ms cubic-bezier(0.2,0.7,0.2,1) 80ms, transform 900ms cubic-bezier(0.2,0.7,0.2,1) 80ms' }}>
            {bg.field ? (
              <>
                <path d={bg.field.plume} fill={pal.bandStress} fillOpacity={focusId === bg.b.id ? (pal.name === 'light' ? 0.20 : 0.18) : (pal.name === 'light' ? 0.13 : 0.12)} style={{ transition: trans('fill-opacity') }} />
                {bg.field.grains.map((gr, gi) => <circle key={gi} cx={gr.x} cy={gr.y} r={gr.r} fill={pal.bandStress} opacity={gr.op} />)}
              </>
            ) : (
              <path d={bg.wash} fill={pal.bandRegime} fillOpacity={focusId === bg.b.id ? (pal.name === 'light' ? 0.16 : 0.16) : (pal.name === 'light' ? 0.10 : 0.09)} style={{ transition: trans('fill-opacity') }} />
            )}
          </g>
        ))}

        {/* areas (gap / drawdown / under / edge) */}
        {geom.areas.map((ar, i) => {
          const c = ar.a.kind === 'peak' ? pal.bandStress : ar.a.kind === 'under' || ar.a.kind === 'edge' ? accent : pal.tierSecondary;
          const op = ar.a.kind === 'under' ? 0.10 : ar.a.kind === 'peak' ? 0.10 : ar.a.kind === 'edge' ? 0.13 : 0.09;
          return (
            <g key={`ar${i}`} style={{ opacity: entered ? 1 : 0, transition: reduce ? 'opacity 320ms ease' : 'opacity 760ms ease 360ms' }}>
              <path d={ar.d} fill={c} opacity={op} />
              {ar.a.label && <text x={ar.labelX} y={pad.t + 30} textAnchor="middle" style={{ ...halo(pal, 9.5, pal.text3), fontStyle: 'italic' }}>{ar.a.label}</text>}
            </g>
          );
        })}

        {/* guides */}
        {geom.guides.map((g, i) => (
          <g key={`gd${i}`}>
            <line x1={pad.l} x2={width - pad.r} y1={g.yPx} y2={g.yPx} stroke={g.gd.kind === 'threshold' ? pal.invalidCharcoal : pal.tierReference} strokeWidth="0.9" strokeDasharray={g.gd.dash ? '5 5' : '1 6'} opacity={focusId === g.gd.id ? 0.95 : 0.6} style={{ transition: trans('opacity') }} />
            {g.gd.label && <text x={g.gd.kind === 'threshold' ? width - pad.r : pad.l + 4} y={g.yPx - 6} textAnchor={g.gd.kind === 'threshold' ? 'end' : 'start'} style={halo(pal, 9, g.gd.kind === 'threshold' ? pal.invalidCharcoal : pal.axis, 500)}>{g.gd.label}</text>}
          </g>
        ))}

        {/* secondary / tertiary series */}
        {(panel.series || []).filter((s) => s.tier !== 'primary').map((s) => {
          const g = geom.series[s.key];
          return (
            <g key={`sec${s.key}`} style={{ opacity: dimOf(s.key), transition: trans('opacity') }}>
              <g style={drawIn(320)}>
                {g.isStroke
                  ? <path d={g.d} fill="none" stroke={tierColor(s.tier, pal, accent)} strokeWidth="1.1" strokeDasharray={s.tier === 'tertiary' ? '5 5' : '0'} strokeLinecap="round" opacity="0.7" />
                  : <path d={g.d} fill={tierColor(s.tier, pal, accent)} opacity={s.tier === 'stress' ? 0.9 : 0.82} />}
              </g>
            </g>
          );
        })}

        {/* primary series */}
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

        {/* levels */}
        {geom.levels.map((l, i) => <g key={`lv${i}`} opacity={dimOf(l.lv.id)} style={{ transition: trans('opacity') }}><path d={l.d} fill={pal.invalidCharcoal} opacity={focusId === l.lv.id ? 1 : 0.85} /></g>)}

        {/* markers */}
        {geom.markers.map((m, i) => (
          <g key={`mk${i}`} style={{ opacity: entered ? dimOf(m.m.id) : 0, transformOrigin: `${m.cx}px ${m.cy}px`, transform: entered ? 'none' : 'scale(0.86)', transition: reduce ? 'opacity 240ms ease 460ms' : 'opacity 360ms cubic-bezier(0.2,0.7,0.2,1) 620ms, transform 480ms cubic-bezier(0.2,0.7,0.2,1) 620ms' }}>
            <path d={m.d} fill={pal.markInk} />
            {focusId === m.m.id && <circle cx={m.cx} cy={m.cy} r={(m.m.r || 13) + 2} fill="none" stroke={accent} strokeWidth="1.1" opacity="0.9" />}
          </g>
        ))}

        {/* leader lines for upper-left enso callouts */}
        {geom.markers.map((m, i) => (m.m.label && m.m.labelAnchor === 'end') ? <line key={`ld${i}`} x1={m.cx - (m.m.r || 13) - 4} y1={m.cy - (m.m.r || 13) - 2} x2={m.cx - (m.m.r || 13) - 16} y2={m.cy - (m.m.r || 13) - 10} stroke={pal.text4} strokeWidth="0.75" opacity={entered ? 0.55 : 0} style={{ transition: trans('opacity', 400) }} /> : null)}

        {/* text labels (always above geometry) */}
        {!coarse && geom.bands.map((bg, i) => bg.b.label ? <text key={`bl${i}`} x={bg.b.labelAnchor === 'peak' ? (bg.field ? bg.field.peakX : bg.xc) : bg.x0 + 10} y={pad.t + 14} textAnchor={bg.b.labelAnchor === 'peak' ? 'middle' : 'start'} style={halo(pal, 9.5, bg.field ? pal.bandStressText : pal.bandRegimeText)}>{bg.b.label}</text> : null)}
        {!coarse && geom.markers.map((m, i) => {
          if (!m.m.label) return null;
          const r = m.m.r || 13;
          const anc = m.m.labelAnchor === 'end' ? 'end' : m.m.labelAnchor === 'start' ? 'start' : 'middle';
          const lx = anc === 'end' ? m.cx - r - 6 : anc === 'start' ? m.cx + r + 6 : m.cx;
          return <text key={`ml${i}`} x={lx} y={m.cy + (m.m.labelDy ?? -18)} textAnchor={anc} style={halo(pal, 9.5, pal.text2)}>{m.m.label}</text>;
        })}
        {(panel.series || []).map((s) => {
          const g = geom.series[s.key];
          const c = s.tier === 'primary' ? accent : tierColor(s.tier, pal, accent);
          return s.label ? <text key={`el${s.key}`} x={g.end.x + 9} y={g.end.y + 3.5 + (s.labelDy || 0)} style={{ ...haloSans(pal, s.tier === 'primary' ? 11.5 : 11, c, s.tier === 'primary' ? 600 : 500), opacity: dimOf(s.key) }}>{s.label}</text> : null;
        })}
        {geom.notes.map((n, i) => <text key={`nt${i}`} x={n.x} y={n.y} textAnchor={n.nt.anchor || 'middle'} style={{ ...haloSans(pal, 11.5, pal.text3, 500), fontStyle: 'italic' }}>{n.nt.text}</text>)}

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
function QuadrantSvg({ spec, width, height, pal, accent, reduce, entered, coarse, targets, active, pinned, onActive, onPin }) {
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
  const HITR = coarse ? 34 : 26;

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
        {/* path */}
        <g style={{ opacity: entered ? 1 : 0, transition: reduce ? 'opacity 320ms ease' : 'opacity 900ms ease 120ms' }}>
          <path d={geom.line} fill={accent} opacity="0.5" />
        </g>
        {/* waypoints */}
        {geom.px.map((p, i) => (
          <g key={`wp${i}`} style={{ opacity: entered ? (focusId && focusId !== p.id ? 0.4 : 1) : 0, transition: trans('opacity') }}>
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
function LoopSvg({ spec, width, height, pal, accent, reduce, entered, coarse, targets, active, pinned, onActive, onPin }) {
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
  const HITR = coarse ? 60 : 70;

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
function FlowSvg({ spec, width, height, pal, accent, reduce, entered, coarse, targets, active, pinned, onActive, onPin }) {
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
  const resolve = (mx, my) => { let best = null, bd = Math.max(coarse ? 40 : 30, NW / 2); pos.forEach((p) => { const d = Math.hypot(mx - p.x, my - p.y); if (d < bd) { bd = d; best = p; } }); return best ? targets.find((t) => t.id === best.id) : null; };
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
function SystemLoopSvg({ spec, width, height, pal, accent, reduce, entered, coarse, targets, active, pinned, onActive, onPin }) {
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
  const resolve = (mx, my) => { let best = null, bd = coarse ? 40 : 32; npos.forEach((p) => { const d = Math.hypot(mx - p.x, my - p.y); if (d < bd) { bd = d; best = p; } }); return best ? targets.find((t) => t.id === best.id) : null; };
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

/* ── BridgeSvg — capital compressed through a constraint (venturi / choke) ────*
 * A flow field of capital streamlines compresses through a dominant bottleneck
 * and re-concentrates into the investable exposure. The constraint is the star:
 * pressure grain builds before it, choke walls pinch at it, flow re-emerges
 * focused after it. Equal-weight process steps are deliberately avoided. */
function BridgeSvg({ spec, width, height, pal, accent, reduce, entered, coarse, targets, active, pinned, onActive, onPin }) {
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
  const resolve = (mx) => { let best = null, bd = coarse ? 60 : 46; pos.forEach((p) => { const d = Math.abs(mx - p.x); if (d < bd) { bd = d; best = p; } }); return best ? targets.find((t) => t.id === best.id) : null; };
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
function GateSvg({ spec, width, height, pal, accent, reduce, entered, coarse, targets, active, pinned, onActive, onPin }) {
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
        frags.push({ d: `M${X(0)} ${startY} ${Brush.smoothOpen(pts).slice(1)}`, fall: `M${endX} ${endY} Q${endX + 8} ${endY + 16} ${endX + 14} ${endY + 30 + rng() * 14}` });
      }
    }
    const gates = pos.filter((p) => p.gate).map((p) => ({ x: p.x, line: Brush.brushSegment(p.x, cy - SPREAD - 8, p.x, cy + SPREAD + 8, { seed: 60 + p.i * 8, weight: 0.7, intensity: 0.6, waver: 0.15 }) }));
    return { frags, survivors, gates };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  const anchorOf = (act) => { const p = pos.find((pp) => pp.id === act.id); return p ? { x: p.x, y: p.gate ? cy - SPREAD - 8 : cy } : null; };
  const resolve = (mx) => { let best = null, bd = coarse ? 60 : 46; pos.forEach((p) => { const d = Math.abs(mx - p.x); if (d < bd) { bd = d; best = p; } }); return best ? targets.find((t) => t.id === best.id) : null; };
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
    if (meta) tooltip = <TargetTooltip meta={meta} kindLabel="GATE" accentTitle={active.id === spec.primaryKey} xPct={(anchor.x / width) * 100} yPct={(anchor.y / height) * 100} isPin={!!pinned && active.id === pinned.id} pal={pal} accent={accent} reduce={reduce} entered={entered} onUnpin={() => onPin(null)} valueText={null} />;
  }

  return (
    <div style={{ position: 'relative' }}>
      <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} width="100%" role="group" aria-label="Thesis validation gauntlet filtering narratives" style={{ display: 'block', cursor: coarse ? 'pointer' : 'crosshair', touchAction: 'manipulation' }} onMouseMove={onMove} onMouseLeave={() => { if (!coarse && !pinned) onActive(null, 'hover'); }} onClick={onClick}>
        {/* fragments: weak narratives that fall away at a gate */}
        <g style={{ opacity: entered ? 1 : 0, transition: reduce ? 'opacity 360ms ease' : 'opacity 900ms ease 120ms' }}>
          {geom.frags.map((fr, i) => (
            <g key={`f${i}`}>
              <path d={fr.d} fill="none" stroke={pal.text3} strokeWidth="1" opacity="0.34" strokeLinecap="round" />
              <path d={fr.fall} fill="none" stroke={pal.text4} strokeWidth="0.9" opacity="0.2" strokeLinecap="round" />
            </g>
          ))}
        </g>
        {/* survivors: concentrate into the thesis */}
        <g style={{ opacity: entered ? 1 : 0, transition: reduce ? 'opacity 360ms ease' : 'opacity 1000ms ease 320ms' }}>
          {geom.survivors.map((d, i) => <path key={`sv${i}`} d={d} fill={accent} opacity="0.9" />)}
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
              {on && (n.gate ? <line x1={n.x} x2={n.x} y1={cy - SPREAD - 8} y2={cy + SPREAD + 8} stroke={accent} strokeWidth="1.5" opacity="0.9" /> : <circle cx={n.x} cy={cy} r="9" fill="none" stroke={accent} strokeWidth="1.1" opacity="0.9" />)}
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

function MobileInsight({ spec, pal, accent, active, onStep, onPick }) {
  const order = spec.mobileTapTargets || spec.hoverTargets.map((t) => t.id);
  const targets = spec.hoverTargets;
  const idx = Math.max(0, order.findIndex((id) => active && id === active.id));
  const cur = targets.find((t) => t.id === order[idx]) || targets[0];
  if (!cur) return null; // no targets → render nothing rather than crash
  const tapBtn = { width: 44, height: 44, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: pal.surface, border: `1px solid ${pal.cardBorder}`, borderRadius: 10, cursor: 'pointer', color: pal.text2, fontSize: 18 };
  return (
    <div style={{ background: pal.cardSolid, borderTop: `1px solid ${pal.borderHi}`, padding: '12px 16px 14px' }}>
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
          {order.map((id, i) => <button key={id} onClick={() => onPick(id)} aria-label={`Insight ${i + 1}`} style={{ width: i === idx ? 18 : 7, height: 7, padding: 0, border: 'none', borderRadius: 4, cursor: 'pointer', background: i === idx ? accent : pal.cardBorder, transition: 'all .2s ease' }} />)}
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
  const reduce = useMqFlag('(prefers-reduced-motion: reduce)');
  const coarse = useMqFlag('(max-width: 700px), (hover: none) and (pointer: coarse)');
  const entered = useEntered(reduce);
  const reactId = useId();

  const [hover, setHover] = useState(null);
  const [pin, setPin] = useState(null);
  const [mobileActive, setMobileActive] = useState(null);

  useEffect(() => {
    if (coarse) return undefined;
    const k = (e) => { if (e.key === 'Escape') setPin(null); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [coarse]);

  const onActive = useCallback((res, src) => {
    if (src === 'tap') { if (res && !res.fallback) setMobileActive(res); return; }
    setHover(res);
  }, []);
  const onPin = useCallback((res) => { setPin(res); if (res) setHover(res); }, []);

  if (!spec) return <div role="alert" style={{ fontFamily: 'monospace', color: '#C0837A', padding: 12 }}>FrameworkChart: unknown chart id “{id}”.</div>;

  const firstMobile = (spec.mobileTapTargets || spec.hoverTargets.map((t) => t.id))[0];
  const mobileTarget = spec.hoverTargets.find((t) => t.id === (mobileActive ? mobileActive.id : firstMobile)) || spec.hoverTargets[0];
  const active = coarse ? mobileTarget : (pin || hover);
  const pinned = coarse ? null : pin;

  const stepMobile = (d) => {
    const order = spec.mobileTapTargets || spec.hoverTargets.map((t) => t.id);
    const i = Math.max(0, order.findIndex((idv) => idv === (mobileTarget && mobileTarget.id)));
    setMobileActive(spec.hoverTargets.find((t) => t.id === order[(i + d + order.length) % order.length]));
  };
  const pickMobile = (idv) => setMobileActive(spec.hoverTargets.find((t) => t.id === idv));

  const padX = 'clamp(14px, 3vw, 22px)';
  const badge = coarse ? 'TAP TO EXPLORE' : 'LIVE · HOVER';
  const showValues = spec.visualDataMode !== 'conceptual';
  const W = 1000;
  // Representative/simulation values are art-directed: never label them "TRUE VALUE".
  const valueNote = spec.visualDataMode === 'historical' ? 'TRUE VALUE' : 'REPRESENTATIVE';
  const cp = { width: W, pal, accent, reduce, entered, coarse, active, pinned, onActive, onPin, valueNote };

  return (
    <figure className={className} aria-label={`${spec.title}. ${spec.frameworkClaim}`} aria-describedby={`${reactId}-summary`}
      style={{ margin: '34px 0', background: pal.card, border: `1px solid ${pal.cardBorder}`, borderRadius: 7, overflow: 'visible', colorScheme: pal.name, fontFamily: pal.sans, color: pal.text1 }}>
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

      {/* plot region */}
      <div style={{ padding: `2px clamp(8px, 2vw, 14px) 8px` }}>
        {spec.layout === 'quadrant' && <QuadrantSvg spec={spec} height={560} targets={spec.hoverTargets} {...cp} />}
        {spec.layout === 'loop' && <LoopSvg spec={spec} height={420} targets={spec.hoverTargets} {...cp} />}
        {spec.layout === 'flow' && <FlowSvg spec={spec} height={400} targets={spec.hoverTargets} {...cp} />}
        {spec.layout === 'systemLoop' && <SystemLoopSvg spec={spec} height={440} targets={spec.hoverTargets} {...cp} />}
        {spec.layout === 'bridge' && <BridgeSvg spec={spec} height={420} targets={spec.hoverTargets} {...cp} />}
        {spec.layout === 'gate' && <GateSvg spec={spec} height={380} targets={spec.hoverTargets} {...cp} />}
        {(spec.layout === 'single' || !spec.layout) && (
          <PlotSvg panel={{ ...spec, label: undefined }} xDomain={spec.domain} xTicks={spec.xTicks} width={W} height={426} targets={spec.hoverTargets} showValues={showValues} {...cp} />
        )}
        {spec.layout === 'dual' && spec.panels.map((p, i) => (
          <React.Fragment key={p.id}>
            <div style={{ fontFamily: pal.mono, fontSize: 9.5, letterSpacing: '0.12em', color: pal.text4, padding: '4px 0 2px 10px' }}>{p.label.toUpperCase()}</div>
            <PlotSvg panel={p} xDomain={spec.xDomain} xTicks={spec.xTicks} hideX={i === 0} width={W} height={i === 0 ? 188 : 212} targets={spec.hoverTargets.filter((t) => t.panel === p.id)} showValues={showValues} {...cp} />
            {i === 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 14px' }}>
                <span aria-hidden style={{ flex: 1, height: 1, background: pal.cardBorder }} />
                <span style={{ fontFamily: pal.sans, fontSize: 10.5, fontStyle: 'italic', color: pal.text3, textAlign: 'center' }}>{spec.connective}</span>
                <span aria-hidden style={{ flex: 1, height: 1, background: pal.cardBorder }} />
              </div>
            )}
          </React.Fragment>
        ))}
        {!coarse && (
          <div style={{ textAlign: 'center', fontFamily: pal.mono, fontSize: 8.5, letterSpacing: '0.1em', color: pal.text4, marginTop: 2 }}>HOVER OR TAB AN ELEMENT · CLICK TO PIN</div>
        )}
      </div>

      {coarse && <MobileInsight spec={spec} pal={pal} accent={accent} active={mobileTarget} onStep={stepMobile} onPick={pickMobile} />}

      {/* explainer */}
      <div style={{ height: 1, background: pal.cardBorder }} />
      <div style={{ padding: `16px ${padX}` }}><ExplainerBlock spec={spec} pal={pal} accent={accent} /></div>

      {/* source footer + concepts */}
      <div style={{ height: 1, background: pal.cardBorder }} />
      <figcaption style={{ padding: `12px ${padX} 14px`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <SourceFooter spec={spec} pal={pal} accent={accent} />
        <ConceptLinks items={spec.concepts} pal={pal} accent={accent} />
      </figcaption>
    </figure>
  );
}
