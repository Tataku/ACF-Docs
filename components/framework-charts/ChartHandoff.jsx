/* ───────────────────────────────────────────────────────────────────────────
 * ChartHandoff — internal review surface for the marketing agency.
 *
 * One page showing every chart concept needed for the new docs landing page and
 * Part 1: an inventory table, then the live exhibits grouped by Signature /
 * Docs landing / Part 1. Each exhibit is the real FrameworkChart (so the agency
 * reviews actual behaviour), framed by a small metadata strip: placement,
 * status, data mode, and whether it is already wired into the public page.
 *
 * Editorial single column, dark terminal foundation. Not public navigation.
 * ─────────────────────────────────────────────────────────────────────────── */
import React, { useState, useEffect } from 'react';
import FrameworkChart from './FrameworkChart';
import { BrushChevron } from './icons';
import { FRAMEWORK_CHART_SPECS, HANDOFF_GROUPS, specsByGroup, footerModel, HORIZON_BANDS } from './chart-specs.mjs';
import { getPalette, getAccent } from './palette';

const PLACEMENT = { both: 'Docs + Part 1', 'docs-landing': 'Docs landing', 'part-1': 'Part 1', 'part-2': 'Part 2', 'part-3': 'Part 3' };
const STATUS = {
  implemented: { label: 'Implemented', tone: 'ok' },
  'needs-design-review': { label: 'Needs design review', tone: 'warn' },
  'spec-only': { label: 'Spec only', tone: 'mute' },
  deferred: { label: 'Deferred', tone: 'mute' },
};
const MODE = { representative: 'Representative', historical: 'Historical', simulation: 'Simulation', conceptual: 'Conceptual' };

function Badge({ pal, accent, children, tone }) {
  const color = tone === 'ok' ? accent : tone === 'warn' ? pal.bandStressText : tone === 'live' ? accent : pal.text3;
  const border = tone === 'ok' ? `${accent}66` : tone === 'warn' ? `${pal.bandStressText}55` : tone === 'live' ? accent : pal.cardBorder;
  return (
    <span style={{ fontFamily: pal.mono, fontSize: 8.5, letterSpacing: '0.12em', color, border: `1px solid ${border}`, borderRadius: 3, padding: '2px 7px', whiteSpace: 'nowrap', background: tone === 'live' ? `${accent}11` : 'transparent' }}>{children}</span>
  );
}

function ModeGlyph({ pal, mode }) {
  const m = footerModel({ visualDataMode: mode }).marker;
  if (m === 'square') return <span aria-hidden style={{ width: 6, height: 6, background: pal.text3, display: 'inline-block' }} />;
  if (m === 'circle') return <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', border: `1px solid ${pal.text4}`, display: 'inline-block' }} />;
  return <span aria-hidden style={{ width: 7, height: 7, transform: 'rotate(45deg)', border: `1px solid ${pal.bandStressText}`, display: 'inline-block' }} />;
}

function InventoryTable({ pal, accent, specs }) {
  const cols = '54px 1fr 96px 96px 116px 84px';
  const head = { fontFamily: pal.mono, fontSize: 8.5, letterSpacing: '0.16em', color: pal.text4 };
  return (
    <div style={{ border: `1px solid ${pal.cardBorder}`, borderRadius: 7, overflow: 'hidden', marginBottom: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: cols, gap: '0 14px', padding: '11px 16px', background: pal.surface, borderBottom: `1px solid ${pal.cardBorder}`, ...head }} className="acf-hand-row">
        <span>ID</span><span>TITLE · CLAIM</span><span>PLACEMENT</span><span>MODE</span><span>STATUS</span><span style={{ textAlign: 'right' }}>WIRED</span>
      </div>
      {specs.map((s, i) => (
        <div key={s.chartId} style={{ display: 'grid', gridTemplateColumns: cols, gap: '0 14px', alignItems: 'baseline', padding: '12px 16px', borderBottom: i < specs.length - 1 ? `1px solid ${pal.cardBorder}` : 'none' }} className="acf-hand-row">
          <span style={{ fontFamily: pal.mono, fontSize: 11, color: pal.text3 }}>{s.idx}</span>
          <div style={{ minWidth: 0 }}>
            <a href={`#${s.chartId}`} style={{ fontFamily: pal.sans, fontSize: 13, fontWeight: 600, color: pal.text1, textDecoration: 'none', display: 'block', marginBottom: 2 }}>{s.title}</a>
            <span style={{ fontFamily: pal.sans, fontSize: 11.5, color: pal.text3, lineHeight: 1.45 }}>{s.frameworkClaim}</span>
          </div>
          <span style={{ fontFamily: pal.mono, fontSize: 9, color: pal.text3 }}>{PLACEMENT[s.intendedPlacement]}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: pal.mono, fontSize: 9, color: pal.text3 }}><ModeGlyph pal={pal} mode={s.visualDataMode} />{MODE[s.visualDataMode]}</span>
          <span style={{ fontFamily: pal.mono, fontSize: 9, color: STATUS[s.status].tone === 'ok' ? accent : STATUS[s.status].tone === 'warn' ? pal.bandStressText : pal.text4 }}>{STATUS[s.status].label}</span>
          <span style={{ textAlign: 'right', fontFamily: pal.mono, fontSize: 9, color: s.wiredPublic ? accent : pal.text4 }}>{s.wiredPublic ? 'LIVE' : '—'}</span>
        </div>
      ))}
    </div>
  );
}

function MetaStrip({ pal, accent, spec }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '0 2px 8px' }}>
      <span style={{ fontFamily: pal.mono, fontSize: 9, letterSpacing: '0.14em', color: pal.text4 }}>{spec.idx} · {spec.chartId}</span>
      <Badge pal={pal} accent={accent}>{PLACEMENT[spec.intendedPlacement]}</Badge>
      <Badge pal={pal} accent={accent} tone={STATUS[spec.status].tone}>{STATUS[spec.status].label}</Badge>
      <Badge pal={pal} accent={accent}>{MODE[spec.visualDataMode]}</Badge>
      {spec.wiredPublic && <Badge pal={pal} accent={accent} tone="live">LIVE IN PART 1</Badge>}
    </div>
  );
}

// Central part-nav config — extend for Parts 3–6 by appending entries here.
const HANDOFF_PART_NAV = [
  { key: 'part-1', label: 'Part 1', shortTitle: 'Foundation', embeddedHref: '/chart-handoff', exportHref: '/chart-handoff-export' },
  { key: 'part-2', label: 'Part 2', shortTitle: 'Lineage', embeddedHref: '/chart-handoff-part-2', exportHref: '/chart-handoff-part-2-export' },
  { key: 'part-3', label: 'Part 3', shortTitle: 'Bitcoin', embeddedHref: '/chart-handoff-part-3', exportHref: '/chart-handoff-part-3-export' },
];

// Quiet ACF control bar — editorial, not pills. Groups: VIEW (Reader/Agency),
// THEME (dark/light), PART (mode-preserving), MODE (export/docs-shell), plus a
// muted copy-link on export. Active state = brighter text + a thin accent
// underline (never a filled pill or box). PART scales from HANDOFF_PART_NAV.
function ControlBar({ pal, accent, theme, setTheme, view, setView, variant, part, shellRoute, exportRoute }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {});
    }
  };
  const lbl = { fontFamily: pal.mono, fontSize: 8.5, letterSpacing: '0.18em', color: pal.text4 };
  const base = { fontFamily: pal.mono, fontSize: 10, letterSpacing: '0.04em', textDecoration: 'none', cursor: 'pointer', background: 'transparent', border: 'none', padding: '3px 2px 1px', lineHeight: 1.4 };
  const sty = (active) => ({ ...base, color: active ? pal.text1 : pal.text3, fontWeight: active ? 600 : 400, borderBottom: `1.5px solid ${active ? accent : 'transparent'}` });
  const joinDots = (items) => items.flatMap((it, i) => (i === 0 ? [it] : [<span key={`s${i}`} aria-hidden style={{ color: pal.text4, opacity: 0.4 }}>·</span>, it]));
  const group = (label, items) => (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 9, flexWrap: 'wrap' }}>
      <span style={lbl}>{label}</span>
      <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>{joinDots(items)}</span>
    </span>
  );
  const navItem = (key, label, active, href) => (active
    ? <span key={key} aria-current="page" style={sty(true)}>{label}</span>
    : <a key={key} href={href} style={sty(false)}>{label}</a>);
  const readerView = view === 'reader';                       // reader demotes Docs-shell/Export + Copy link behind Options

  return (
    <nav aria-label="Chart handoff controls" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '10px 22px' }}>
      {group('VIEW', [
        <button key="reader" onClick={() => setView('reader')} aria-pressed={view === 'reader'} style={sty(view === 'reader')}>Reader</button>,
        <button key="agency" onClick={() => setView('agency')} aria-pressed={view === 'agency'} style={sty(view === 'agency')}>Agency</button>,
      ])}
      {group('THEME', [
        <button key="dark" onClick={() => setTheme('dark')} aria-pressed={theme === 'dark'} style={sty(theme === 'dark')}>Dark</button>,
        <button key="light" onClick={() => setTheme('light')} aria-pressed={theme === 'light'} style={sty(theme === 'light')}>Light</button>,
      ])}
      {group('PART', HANDOFF_PART_NAV.map((p) => {
        const active = p.key === part;
        const href = variant === 'export' ? p.exportHref : p.embeddedHref;
        const label = <>{p.label} <span style={{ color: active ? pal.text2 : pal.text4, fontWeight: 400 }}>{p.shortTitle}</span></>;
        return navItem(p.key, label, active, href);
      }))}
      {readerView ? (
        <details style={{ position: 'relative' }}>
          <summary style={{ ...base, color: pal.text3, listStyle: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>Options <span className="acf-cv" style={{ display: 'inline-flex' }}><BrushChevron size={10} /></span></summary>
          <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 30, background: pal.cardSolid, border: `1px solid ${pal.borderHi}`, borderRadius: 7, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12, whiteSpace: 'nowrap', boxShadow: pal.name === 'light' ? '0 6px 22px rgba(40,36,28,0.16)' : '0 8px 28px rgba(0,0,0,0.5)' }}>
            {group('MODE', [
              navItem('shell', 'Docs shell', variant === 'embedded', shellRoute),
              navItem('export', 'Export', variant === 'export', exportRoute),
            ])}
            <button onClick={copy} style={{ ...base, color: copied ? accent : pal.text3, textAlign: 'left' }}>{copied ? 'Link copied' : 'Copy link ⧉'}</button>
          </div>
        </details>
      ) : (
        <>
          {group('MODE', [
            navItem('shell', 'Docs shell', variant === 'embedded', shellRoute),
            navItem('export', 'Export', variant === 'export', exportRoute),
          ])}
          {variant === 'export' && <button onClick={copy} style={{ ...base, color: copied ? accent : pal.text4 }}>{copied ? 'Link copied' : 'Copy link ⧉'}</button>}
        </>
      )}
    </nav>
  );
}

const REPO_RAW = 'https://raw.githubusercontent.com/Tataku/ACF-Docs/main';
const REPO_BLOB = 'https://github.com/Tataku/ACF-Docs/blob/main';
const PKG_README = '/agency-chart-handoff/README-agency-chart-handoff.md';
const PKG_INVENTORY = '/agency-chart-handoff/chart-inventory.json';
const PKG_FILES = [
  'components/framework-charts/FrameworkChart.jsx',
  'components/framework-charts/chart-specs.mjs',
  'components/framework-charts/brush.js',
  'components/framework-charts/palette.js',
  'components/framework-charts/icons.jsx',
  'components/framework-charts/ChartHandoff.jsx',
  'components/framework-charts/index.js',
  'styles/framework-charts.css',
  'pages/chart-handoff-export.jsx',
  'public/agency-chart-handoff/README-agency-chart-handoff.md',
  'public/agency-chart-handoff/chart-inventory.json',
];
const PASTE_TEXT = [
  'Use the ACF Framework Charts as the chart implementation reference.',
  'Start with public/agency-chart-handoff/README-agency-chart-handoff.md, then components/framework-charts/chart-specs.mjs (the spec registry) and components/framework-charts/FrameworkChart.jsx (the engine).',
  "Charts are representative/illustrative with honest disclosure footers — do not present them as exact historical data unless a 'historical' source is wired. One chart = one claim. Keep the dark-terminal look; no SaaS card borders or glows.",
].join('\n');

// Quiet implementation/export package: download links + file map + a paste-ready
// instruction so the agency / Carlo can hand the exact code to their own AI.
function ImplementationPackage({ pal, accent }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(PASTE_TEXT).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600); }).catch(() => {});
    }
  };
  const dl = { fontFamily: pal.mono, fontSize: 10, letterSpacing: '0.06em', color: accent, textDecoration: 'none', border: `1px solid ${accent}66`, borderRadius: 5, padding: '7px 12px', whiteSpace: 'nowrap' };
  return (
    <section id="implementation-package" style={{ scrollMarginTop: 24, marginTop: 44, borderTop: `1px solid ${pal.cardBorder}`, paddingTop: 24 }}>
      <div style={{ fontFamily: pal.mono, fontSize: 10, letterSpacing: '0.2em', color: accent, marginBottom: 8 }}>IMPLEMENTATION PACKAGE</div>
      <h2 style={{ margin: 0, fontSize: 'clamp(18px, 2.6vw, 22px)', fontWeight: 600, letterSpacing: '-0.02em', color: pal.text1 }}>Take the exact chart code &amp; specs</h2>
      <p style={{ margin: '12px 0 16px', fontSize: 13.5, lineHeight: 1.6, color: pal.text3, maxWidth: 720 }}>
        Everything needed to reproduce these charts, ready to hand to an AI or build environment. The README is the entry point; it links every source file and documents the representative-data model, honesty rules, and the historical-data upgrade path.
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
        <a href={PKG_README} download style={dl}>Download handoff README ↗</a>
        <a href={PKG_INVENTORY} download style={{ ...dl, color: pal.text2, borderColor: pal.borderHi }}>Chart inventory (JSON) ↗</a>
      </div>

      {/* paste-to-AI block */}
      <div style={{ border: `1px solid ${pal.cardBorder}`, borderRadius: 7, background: pal.surface, padding: '12px 14px', marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontFamily: pal.mono, fontSize: 8.5, letterSpacing: '0.16em', color: pal.text4 }}>PASTE INTO YOUR AI</span>
          <button onClick={copy} style={{ fontFamily: pal.mono, fontSize: 9, letterSpacing: '0.08em', color: copied ? accent : pal.text3, background: 'transparent', border: `1px solid ${copied ? accent : pal.cardBorder}`, borderRadius: 4, padding: '3px 9px', cursor: 'pointer' }}>{copied ? 'COPIED ✓' : 'COPY'}</button>
        </div>
        <p style={{ margin: 0, fontFamily: pal.mono, fontSize: 11, lineHeight: 1.6, color: pal.text2, whiteSpace: 'pre-wrap' }}>{PASTE_TEXT}</p>
      </div>

      {/* file map */}
      <div style={{ fontFamily: pal.mono, fontSize: 8.5, letterSpacing: '0.16em', color: pal.text4, marginBottom: 10 }}>FILES</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {PKG_FILES.map((f) => (
          <div key={f} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: pal.mono, fontSize: 11, color: pal.text2, wordBreak: 'break-all' }}>{f}</span>
            <span style={{ display: 'inline-flex', gap: 12, flexShrink: 0 }}>
              <a href={`${REPO_BLOB}/${f}`} target="_blank" rel="noreferrer" style={{ fontFamily: pal.mono, fontSize: 9, letterSpacing: '0.06em', color: pal.text3, textDecoration: 'none', borderBottom: `1px dotted ${pal.borderHi}` }}>view</a>
              <a href={`${REPO_RAW}/${f}`} target="_blank" rel="noreferrer" style={{ fontFamily: pal.mono, fontSize: 9, letterSpacing: '0.06em', color: accent, textDecoration: 'none', borderBottom: `1px dotted ${accent}` }}>raw</a>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

const PRESETS = {
  'part-1': {
    groups: ['signature', 'docs-landing', 'part-1'],
    shellRoute: '/chart-handoff', exportRoute: '/chart-handoff-export',
    eyebrow: 'ACF · FRAMEWORK CHART HANDOFF · INTERNAL REVIEW',
    title: 'Every chart for the docs landing page and Part 1',
    readerTitle: 'Part 1 · Foundation in Pictures',
    readerSubtitle: 'A guided visual pass through the core ideas behind the Adaptive Convexity Framework. Each chart makes one claim — read top to bottom, and explore where a chart invites you.',
    intro: 'The full exhibit set in one place, for the marketing agency to review before production. Charts use art-directed, representative data shapes where exact historical series are not yet wired — every footer discloses that plainly, and the source links verify the underlying concept and data backdrop.',
  },
  'part-2': {
    groups: ['part-2'],
    shellRoute: '/chart-handoff-part-2', exportRoute: '/chart-handoff-part-2-export',
    eyebrow: 'ACF · PART 2 CHART HANDOFF · INTERNAL REVIEW',
    title: 'Every chart for Part 2',
    readerTitle: 'Part 2 · Lineage in Pictures',
    readerSubtitle: 'A guided visual pass through the framework’s intellectual lineage and macro-thesis logic. Each chart makes one claim — read top to bottom, and explore where a chart invites you.',
    intro: 'The Part 2 exhibit set: intellectual lineage, what makes a macro thesis valid, how a structural force becomes capital flow, and how phase separates thesis validity from deployment timing. Representative and conceptual exhibits with honest disclosure — not historical backtests.',
  },
  'part-3': {
    groups: ['part-3'],
    shellRoute: '/chart-handoff-part-3', exportRoute: '/chart-handoff-part-3-export',
    eyebrow: 'ACF · PART 3 CHART HANDOFF · INTERNAL REVIEW',
    title: 'Every chart for Part 3',
    readerTitle: 'Part 3 · Bitcoin Backbone in Pictures',
    readerSubtitle: 'A guided visual pass through Bitcoin as the convexity backbone. Each chart makes one claim — read top to bottom, and explore where a chart invites you.',
    intro: 'The Part 3 exhibit set: Bitcoin as the convexity backbone — power-law valuation discipline, the ten backbone requirements, volatility as the toll for convexity, and the accumulate-to-borrow reserve lifecycle. Representative and conceptual exhibits with honest disclosure, never exact historical Bitcoin data.',
  },
};

// ── page-level simulation context ────────────────────────────────────────────
// One optional input near the top scales representative exhibits to the reader's
// own numbers (startingValue + horizon). Local state only — no persistence, no
// cookies, no forecast. HORIZON_BANDS is shared from chart-specs (single source).
const SIM_CTX_KEY = 'acf-sim-context';
const THEME_KEY = 'acf-chart-handoff:theme';                 // user preference → localStorage
const VIEW_KEY = 'acf-chart-handoff:viewMode';
const DEFAULT_SIMULATION_CONTEXT = { startingValue: 100000, horizon: '30y', withdrawalRate: 0.04, btcReserveAllocation: 0.15, monthlyDca: 500 };
const parseMoney = (s) => { const n = Number(String(s).replace(/[^0-9.]/g, '')); return isFinite(n) ? n : NaN; };
const clampMoney = (n) => Math.min(100000000, Math.max(1000, Math.round(n)));
const groupMoney = (n) => (isFinite(n) ? Math.round(n).toLocaleString('en-US') : '');

function SimulationContextBar({ pal, accent, ctx, setCtx, compact, layout = 'bar' }) {
  const [raw, setRaw] = useState(groupMoney(ctx.startingValue));
  const [dcaRaw, setDcaRaw] = useState(groupMoney(ctx.monthlyDca));
  const [advOpen, setAdvOpen] = useState(false);
  // keep inputs in sync when the context hydrates from sessionStorage / another page
  useEffect(() => { setRaw(groupMoney(ctx.startingValue)); }, [ctx.startingValue]);
  useEffect(() => { setDcaRaw(groupMoney(ctx.monthlyDca)); }, [ctx.monthlyDca]);
  const lbl = { fontFamily: pal.mono, fontSize: 8.5, letterSpacing: '0.18em', color: pal.text4 };
  const base = { fontFamily: pal.mono, fontSize: 10, letterSpacing: '0.04em', cursor: 'pointer', background: 'transparent', border: 'none', padding: '3px 2px 1px', lineHeight: 1.4 };
  const sty = (active) => ({ ...base, color: active ? pal.text1 : pal.text3, fontWeight: active ? 600 : 400, borderBottom: `1.5px solid ${active ? accent : 'transparent'}` });
  const commit = () => { const n = parseMoney(raw); const v = isFinite(n) ? clampMoney(n) : DEFAULT_SIMULATION_CONTEXT.startingValue; setCtx((c) => ({ ...c, startingValue: v })); setRaw(groupMoney(v)); };
  const commitDca = () => { const n = parseMoney(dcaRaw); const v = isFinite(n) ? Math.min(100000, Math.max(0, Math.round(n))) : DEFAULT_SIMULATION_CONTEXT.monthlyDca; setCtx((c) => ({ ...c, monthlyDca: v })); setDcaRaw(groupMoney(v)); };
  const dots = (nodes, key) => nodes.flatMap((n, i) => (i === 0 ? [n] : [<span key={`d${key}${i}`} aria-hidden style={{ color: pal.text4, opacity: 0.4 }}>·</span>, n]));
  const choice = (key, opts) => dots(opts.map((o) => <button key={String(o.v)} onClick={() => setCtx((c) => ({ ...c, [key]: o.v }))} aria-pressed={ctx[key] === o.v} style={sty(ctx[key] === o.v)}>{o.label}</button>), key);
  const money = (value, onChange, onCommit, aria, w) => (
    <span style={{ display: 'inline-flex', alignItems: 'baseline' }}>
      <span aria-hidden style={{ color: pal.text3, fontFamily: pal.mono, fontSize: 13 }}>$</span>
      <input inputMode="numeric" aria-label={aria} value={value} onChange={(e) => onChange(e.target.value)} onBlur={onCommit}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        style={{ width: w, background: 'transparent', border: 'none', borderBottom: `1.5px solid ${pal.borderHi}`, color: pal.text1, fontFamily: pal.mono, fontSize: 13, padding: '2px 0 2px 2px', outline: 'none' }} />
    </span>
  );
  const group = (label, child) => (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 9, flexWrap: 'wrap' }}>
      <span style={lbl}>{label}</span>
      <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>{child}</span>
    </span>
  );
  const advWithdrawal = group('WITHDRAWAL / YR', choice('withdrawalRate', [{ v: 0.03, label: '3%' }, { v: 0.04, label: '4%' }, { v: 0.05, label: '5%' }, { v: 0.06, label: '6%' }]));
  const advReserve = group('BITCOIN RESERVE', choice('btcReserveAllocation', [{ v: 0.05, label: '5%' }, { v: 0.10, label: '10%' }, { v: 0.15, label: '15%' }, { v: 0.25, label: '25%' }]));
  const advDca = group('MONTHLY DCA', money(dcaRaw, setDcaRaw, commitDca, 'Illustrative monthly DCA amount in dollars', 64));
  const shortCaveat = 'These values only scale illustrative examples — not forecasts.';
  const fullCaveat = 'Used only to scale representative exhibits on this page. Each chart discloses the inputs it uses. Not a forecast or recommendation.';
  const isPanel = layout === 'panel';
  const sectionStyle = isPanel
    ? { display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 13, padding: 0, margin: 0 }
    : { borderTop: `1px solid ${pal.cardBorder}`, borderBottom: `1px solid ${pal.cardBorder}`, padding: '14px 2px', margin: '0 0 22px', display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '12px 26px' };
  return (
    <section aria-label={compact ? 'Personalize examples' : 'Simulation context'} style={sectionStyle}>
      <span style={{ ...lbl, letterSpacing: '0.22em', color: pal.text3 }}>{compact ? 'PERSONALIZE EXAMPLES' : 'SIMULATION CONTEXT'}{compact && <span style={{ marginLeft: 8, fontWeight: 400, letterSpacing: '0.08em', color: pal.text4 }}>optional</span>}</span>
      {group('STARTING VALUE', money(raw, setRaw, commit, 'Illustrative starting portfolio value in dollars', 96))}
      {group('TIME HORIZON', choice('horizon', HORIZON_BANDS.map((h) => ({ v: h.id, label: h.label }))))}
      {compact ? (
        <>
          <button onClick={() => setAdvOpen((o) => !o)} aria-expanded={advOpen} style={{ ...base, color: pal.text3, display: 'inline-flex', alignItems: 'center', gap: 5 }}>Advanced assumptions <span className="acf-cv" style={{ display: 'inline-flex', transform: advOpen ? 'rotate(90deg)' : undefined }}><BrushChevron size={10} /></span></button>
          {advOpen && <>{advWithdrawal}{advReserve}{advDca}</>}
          <span style={{ flexBasis: '100%', fontFamily: pal.mono, fontSize: 9, letterSpacing: '0.04em', color: pal.text4 }}>{advOpen ? `Withdrawal rate, Bitcoin reserve and monthly DCA scale only the few charts that use them. ${shortCaveat}` : shortCaveat}</span>
        </>
      ) : (
        <>
          {advWithdrawal}{advReserve}{advDca}
          <span style={{ flexBasis: '100%', fontFamily: pal.mono, fontSize: 9, letterSpacing: '0.04em', color: pal.text4 }}>{fullCaveat}</span>
        </>
      )}
    </section>
  );
}

// Reader view: ONE compact orientation cue (Claim → Picture → Explore) — not a
// four-column training block. Interaction is taught once, then the charts begin.
function ReaderOrientation({ pal, accent }) {
  return (
    <section aria-label="How to read this" style={{ margin: '20px 0 2px', borderLeft: `2px solid ${accent}`, padding: '3px 0 4px 14px', maxWidth: 600 }}>
      <div style={{ fontFamily: pal.mono, fontSize: 9.5, letterSpacing: '0.2em', color: accent, marginBottom: 6 }}>HOW TO READ THIS</div>
      <p style={{ margin: 0, fontFamily: pal.sans, fontSize: 14, lineHeight: 1.55, color: pal.text1 }}>
        Each chart makes <strong style={{ fontWeight: 600 }}>one claim</strong> and shows the mechanism. Hover, tap, or pin when you want the deeper explanation.
      </p>
      <div style={{ marginTop: 9, fontFamily: pal.mono, fontSize: 9.5, letterSpacing: '0.16em', color: pal.text4 }}>CLAIM&nbsp;→&nbsp;PICTURE&nbsp;→&nbsp;EXPLORE</div>
    </section>
  );
}

export default function ChartHandoff({ part = 'part-1', initialTheme = 'dark', accent: accentName = 'green', variant = 'embedded' }) {
  const preset = PRESETS[part] || PRESETS['part-1'];
  const [theme, setTheme] = useState(initialTheme);
  const [view, setView] = useState('reader');                 // 'reader' (guided learning) | 'agency' (inventory-first review)
  const [readerCtx, setReaderCtx] = useState(DEFAULT_SIMULATION_CONTEXT);
  const [scrolled, setScrolled] = useState(false);            // sticky control bar gains a quiet surface only after scroll
  const [reduce, setReduce] = useState(false);
  // Reader/Agency + Dark/Light are user PREFERENCES (not simulation data), so they
  // persist in localStorage across all handoff/export routes and refresh. Hydrate
  // after mount (SSR-safe; brief one-frame default before the stored choice applies).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const t = window.localStorage.getItem(THEME_KEY); if (t === 'dark' || t === 'light') setTheme(t);
      const v = window.localStorage.getItem(VIEW_KEY); if (v === 'reader' || v === 'agency') setView(v);
    } catch (_) { /* noop */ }
  }, []);
  useEffect(() => { if (typeof window !== 'undefined') { try { window.localStorage.setItem(THEME_KEY, theme); } catch (_) { /* noop */ } } }, [theme]);
  useEffect(() => { if (typeof window !== 'undefined') { try { window.localStorage.setItem(VIEW_KEY, view); } catch (_) { /* noop */ } } }, [view]);
  // Single local source of truth across the Part 1/2/3 handoff pages: hydrate from
  // and persist to sessionStorage only — no cookies, no server, no account.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { const s = window.sessionStorage.getItem(SIM_CTX_KEY); if (s) setReaderCtx((c) => ({ ...c, ...JSON.parse(s) })); } catch (_) { /* noop */ }
  }, []);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { window.sessionStorage.setItem(SIM_CTX_KEY, JSON.stringify(readerCtx)); } catch (_) { /* noop */ }
  }, [readerCtx]);
  // Sticky control bar: a quiet translucent surface fades in only once the hero
  // scrolls under it (rAF-throttled). Padding never changes, so it can't jitter.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let raf = 0;
    const onScroll = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; setScrolled(window.scrollY > 8); }); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => { window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    const f = () => setReduce(m.matches); f();
    m.addEventListener ? m.addEventListener('change', f) : m.addListener(f);
    return () => { m.removeEventListener ? m.removeEventListener('change', f) : m.removeListener(f); };
  }, []);
  const pal = getPalette(theme);
  const accent = getAccent(pal, accentName);
  const selBg = pal.name === 'light' ? 'rgba(14,140,102,0.20)' : 'rgba(16,185,129,0.32)';
  const stickyBg = pal.name === 'light' ? 'rgba(243,239,230,0.82)' : 'rgba(8,9,11,0.78)';
  const isExport = variant === 'export';
  const readerView = view === 'reader';
  const galleryGroups = HANDOFF_GROUPS.filter((g) => preset.groups.includes(g.id));
  const specs = FRAMEWORK_CHART_SPECS.filter((s) => preset.groups.includes(s.group) && s.status !== 'deferred');

  const selVars = { '--acf-sel-bg': selBg, '--acf-sel-fg': pal.text1 };
  const outer = isExport
    ? { ...selVars, background: pal.stage, color: pal.text1, fontFamily: pal.sans, minHeight: '100vh', padding: 'clamp(20px, 4vw, 44px) clamp(16px, 4vw, 32px)', colorScheme: pal.name }
    : { ...selVars, background: pal.stage, color: pal.text1, fontFamily: pal.sans, borderRadius: 10, padding: 'clamp(16px, 3vw, 28px)', margin: '8px 0 32px', colorScheme: pal.name };

  return (
    <div className="acf-chart-handoff" style={outer}>
      <div style={{ maxWidth: isExport ? 1120 : 'none', margin: isExport ? '0 auto' : 0 }}>
      {/* sticky reader controls — quiet, compact, non-obstructive; surface fades in on scroll */}
      <div style={{ position: 'sticky', top: 0, zIndex: 40, marginBottom: 24, padding: '10px 0', background: scrolled ? stickyBg : 'transparent', backdropFilter: scrolled ? 'saturate(140%) blur(10px)' : 'none', WebkitBackdropFilter: scrolled ? 'saturate(140%) blur(10px)' : 'none', borderBottom: `1px solid ${scrolled ? pal.cardBorder : 'transparent'}`, transition: reduce ? 'none' : 'background 220ms ease, border-color 220ms ease' }}>
        <ControlBar pal={pal} accent={accent} theme={theme} setTheme={setTheme} view={view} setView={setView} variant={variant} part={part} shellRoute={preset.shellRoute} exportRoute={preset.exportRoute} />
      </div>
      {/* header */}
      <div style={{ fontFamily: pal.mono, fontSize: 10, letterSpacing: '0.22em', color: pal.text3, marginBottom: 10 }}>{readerView ? 'ADAPTIVE CONVEXITY FRAMEWORK · A VISUAL ESSAY' : preset.eyebrow}</div>
      <h1 style={{ margin: 0, fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1.1, color: pal.text1, maxWidth: 760 }}>{readerView ? (preset.readerTitle || preset.title) : preset.title}</h1>
      {readerView ? (
        /* reader hero: title block + "how to read" on the left; the optional
           simulation controls live in their own subtle container on the right. */
        <div className="acf-hero">
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: '14px 0 0', fontSize: 14, lineHeight: 1.62, color: pal.text3, maxWidth: 600 }}>{preset.readerSubtitle || preset.intro}</p>
            <ReaderOrientation pal={pal} accent={accent} />
          </div>
          <aside style={{ border: `1px solid ${pal.cardBorder}`, borderRadius: 9, padding: '14px 16px 15px', background: pal.name === 'light' ? 'rgba(20,16,8,0.02)' : 'rgba(255,255,255,0.022)' }}>
            <SimulationContextBar pal={pal} accent={accent} ctx={readerCtx} setCtx={setReaderCtx} compact layout="panel" />
          </aside>
        </div>
      ) : (
        <>
          <p style={{ margin: '14px 0 18px', fontSize: 14, lineHeight: 1.62, color: pal.text3, maxWidth: 720 }}>{preset.intro}</p>

          <div style={{ fontFamily: pal.mono, fontSize: 9.5, letterSpacing: '0.06em', color: pal.text4, lineHeight: 1.6, marginBottom: 20, maxWidth: 720 }}>
            Internal chart review surface for marketing / design handoff. Charts are not automatically placed in public framework pages; placement is chosen explicitly.
          </div>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 22, fontFamily: pal.mono, fontSize: 9.5, letterSpacing: '0.08em' }}>
            <a href="#implementation-package" style={{ color: accent, textDecoration: 'none', borderBottom: `1px dotted ${accent}`, paddingBottom: 1 }}>↓ Implementation package</a>
            <a href="/agency-chart-handoff/README-agency-chart-handoff.md" download style={{ color: pal.text3, textDecoration: 'none', borderBottom: `1px dotted ${pal.borderHi}`, paddingBottom: 1 }}>Download handoff README ↗</a>
          </div>

          {/* legend */}
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center', padding: '12px 16px', border: `1px solid ${pal.cardBorder}`, borderRadius: 7, marginBottom: 22, fontFamily: pal.mono, fontSize: 9, letterSpacing: '0.08em', color: pal.text3 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><span style={{ width: 7, height: 7, transform: 'rotate(45deg)', border: `1px solid ${pal.bandStressText}` }} /> REPRESENTATIVE / SIMULATION</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><span style={{ width: 7, height: 7, borderRadius: '50%', border: `1px solid ${pal.text4}` }} /> CONCEPTUAL</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><span style={{ width: 6, height: 6, background: pal.text3 }} /> HISTORICAL (WHEN WIRED)</span>
          </div>

          <SimulationContextBar pal={pal} accent={accent} ctx={readerCtx} setCtx={setReaderCtx} compact={false} />
          <InventoryTable pal={pal} accent={accent} specs={specs} />
        </>
      )}

      {/* grouped gallery — guided sequence (reader) or full review set (agency) */}
      {galleryGroups.map((g) => {
        const gspecs = specsByGroup(g.id).filter((s) => s.status !== 'deferred');
        if (!gspecs.length) return null;
        return (
          <section key={g.id} style={{ marginTop: readerView ? 56 : 40 }}>
            <div style={{ borderTop: `1px solid ${pal.cardBorder}`, paddingTop: 22, marginBottom: 6 }}>
              <div style={{ fontFamily: pal.mono, fontSize: 10, letterSpacing: '0.2em', color: accent, marginBottom: 8 }}>{g.label.toUpperCase()}</div>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: pal.text3, maxWidth: 720 }}>{g.blurb}</p>
            </div>
            {gspecs.map((spec) => (
              <div key={spec.chartId} id={spec.chartId} style={{ scrollMarginTop: 80, marginTop: readerView ? 30 : 24 }}>
                {!readerView && <MetaStrip pal={pal} accent={accent} spec={spec} />}
                <FrameworkChart spec={spec} theme={theme} accent={accentName} readerContext={readerCtx} />
              </div>
            ))}
          </section>
        );
      })}

      {readerView ? (
        <details style={{ marginTop: 44, borderTop: `1px solid ${pal.cardBorder}`, paddingTop: 18 }}>
          <summary style={{ cursor: 'pointer', fontFamily: pal.mono, fontSize: 10, letterSpacing: '0.16em', color: pal.text3 }}>AGENCY REFERENCE · inventory &amp; implementation package</summary>
          <div style={{ marginTop: 18 }}>
            <InventoryTable pal={pal} accent={accent} specs={specs} />
            <ImplementationPackage pal={pal} accent={accent} />
          </div>
        </details>
      ) : (
        <ImplementationPackage pal={pal} accent={accent} />
      )}

      <div style={{ marginTop: 36, paddingTop: 16, borderTop: `1px solid ${pal.cardBorder}`, fontFamily: pal.mono, fontSize: 9, letterSpacing: '0.1em', color: pal.text4, display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <span>ACF FRAMEWORK CHARTS · REPRESENTATIVE EXHIBIT SET · INTERNAL HANDOFF</span>
        <span>REVIEW → APPROVE SHAPES → WIRE HISTORICAL DATA</span>
      </div>
      </div>
    </div>
  );
}
