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

  return (
    <nav aria-label="Chart handoff controls" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '10px 22px', marginBottom: 24 }}>
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
      {group('MODE', [
        navItem('shell', 'Docs shell', variant === 'embedded', shellRoute),
        navItem('export', 'Export', variant === 'export', exportRoute),
      ])}
      {variant === 'export' && <button onClick={copy} style={{ ...base, color: copied ? accent : pal.text4 }}>{copied ? 'Link copied' : 'Copy link ⧉'}</button>}
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
    intro: 'The full exhibit set in one place, for the marketing agency to review before production. Charts use art-directed, representative data shapes where exact historical series are not yet wired — every footer discloses that plainly, and the source links verify the underlying concept and data backdrop.',
  },
  'part-2': {
    groups: ['part-2'],
    shellRoute: '/chart-handoff-part-2', exportRoute: '/chart-handoff-part-2-export',
    eyebrow: 'ACF · PART 2 CHART HANDOFF · INTERNAL REVIEW',
    title: 'Every chart for Part 2',
    intro: 'The Part 2 exhibit set: intellectual lineage, what makes a macro thesis valid, how a structural force becomes capital flow, and how phase separates thesis validity from deployment timing. Representative and conceptual exhibits with honest disclosure — not historical backtests.',
  },
  'part-3': {
    groups: ['part-3'],
    shellRoute: '/chart-handoff-part-3', exportRoute: '/chart-handoff-part-3-export',
    eyebrow: 'ACF · PART 3 CHART HANDOFF · INTERNAL REVIEW',
    title: 'Every chart for Part 3',
    intro: 'The Part 3 exhibit set: Bitcoin as the convexity backbone — power-law valuation discipline, the ten backbone requirements, volatility as the toll for convexity, and the accumulate-to-borrow reserve lifecycle. Representative and conceptual exhibits with honest disclosure, never exact historical Bitcoin data.',
  },
};

// ── page-level simulation context ────────────────────────────────────────────
// One optional input near the top scales representative exhibits to the reader's
// own numbers (startingValue + horizon). Local state only — no persistence, no
// cookies, no forecast. HORIZON_BANDS is shared from chart-specs (single source).
const SIM_CTX_KEY = 'acf-sim-context';
const DEFAULT_SIMULATION_CONTEXT = { startingValue: 100000, horizon: '30y', withdrawalRate: 0.04, btcReserveAllocation: 0.15, monthlyDca: 500 };
const parseMoney = (s) => { const n = Number(String(s).replace(/[^0-9.]/g, '')); return isFinite(n) ? n : NaN; };
const clampMoney = (n) => Math.min(100000000, Math.max(1000, Math.round(n)));
const groupMoney = (n) => (isFinite(n) ? Math.round(n).toLocaleString('en-US') : '');

function SimulationContextBar({ pal, accent, ctx, setCtx }) {
  const [raw, setRaw] = useState(groupMoney(ctx.startingValue));
  const [dcaRaw, setDcaRaw] = useState(groupMoney(ctx.monthlyDca));
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
  return (
    <section aria-label="Simulation context" style={{ borderTop: `1px solid ${pal.cardBorder}`, borderBottom: `1px solid ${pal.cardBorder}`, padding: '14px 2px', margin: '0 0 22px', display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '12px 26px' }}>
      <span style={{ ...lbl, letterSpacing: '0.22em', color: pal.text3 }}>SIMULATION CONTEXT</span>
      {group('STARTING VALUE', money(raw, setRaw, commit, 'Illustrative starting portfolio value in dollars', 96))}
      {group('TIME HORIZON', choice('horizon', HORIZON_BANDS.map((h) => ({ v: h.id, label: h.label }))))}
      {group('WITHDRAWAL / YR', choice('withdrawalRate', [{ v: 0.03, label: '3%' }, { v: 0.04, label: '4%' }, { v: 0.05, label: '5%' }, { v: 0.06, label: '6%' }]))}
      {group('BITCOIN RESERVE', choice('btcReserveAllocation', [{ v: 0.05, label: '5%' }, { v: 0.10, label: '10%' }, { v: 0.15, label: '15%' }, { v: 0.25, label: '25%' }]))}
      {group('MONTHLY DCA', money(dcaRaw, setDcaRaw, commitDca, 'Illustrative monthly DCA amount in dollars', 64))}
      <span style={{ flexBasis: '100%', fontFamily: pal.mono, fontSize: 9, letterSpacing: '0.04em', color: pal.text4 }}>Used only to scale representative exhibits on this page. Each chart discloses the inputs it uses. Not a forecast or recommendation.</span>
    </section>
  );
}

// Reader view: a short "how to read these charts" orientation — the kinesthetic
// contract (one claim · see-then-touch · representative · your numbers once).
const READ_GUIDE = [
  { k: 'ONE CLAIM EACH', t: 'Every chart makes a single point — the title states it, the picture proves it.' },
  { k: 'SEE, THEN TOUCH', t: 'The default view teaches the idea. Hover, tap, or focus an element for the why — some charts invite you to drag or choose.' },
  { k: 'REPRESENTATIVE, NOT PREDICTIVE', t: 'These are shapes that teach the framework — not exact historical data or forecasts. Each footer says which.' },
  { k: 'YOUR NUMBERS, ONCE', t: 'Set a starting value above; charts that use it introduce themselves as scaled examples.' },
];
function ReaderOrientation({ pal, accent }) {
  return (
    <section aria-label="How to read these charts" style={{ margin: '0 0 30px' }}>
      <div style={{ fontFamily: pal.mono, fontSize: 10, letterSpacing: '0.2em', color: accent, marginBottom: 12 }}>HOW TO READ THESE CHARTS</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px 22px' }}>
        {READ_GUIDE.map((g) => (
          <div key={g.k}>
            <div style={{ fontFamily: pal.mono, fontSize: 8.5, letterSpacing: '0.14em', color: pal.text3, marginBottom: 5 }}>{g.k}</div>
            <p style={{ margin: 0, fontFamily: pal.sans, fontSize: 12.5, lineHeight: 1.5, color: pal.text2 }}>{g.t}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function ChartHandoff({ part = 'part-1', initialTheme = 'dark', accent: accentName = 'green', variant = 'embedded' }) {
  const preset = PRESETS[part] || PRESETS['part-1'];
  const [theme, setTheme] = useState(initialTheme);
  const [view, setView] = useState('reader');                 // 'reader' (guided learning) | 'agency' (inventory-first review)
  const [readerCtx, setReaderCtx] = useState(DEFAULT_SIMULATION_CONTEXT);
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
  const pal = getPalette(theme);
  const accent = getAccent(pal, accentName);
  const isExport = variant === 'export';
  const readerView = view === 'reader';
  const galleryGroups = HANDOFF_GROUPS.filter((g) => preset.groups.includes(g.id));
  const specs = FRAMEWORK_CHART_SPECS.filter((s) => preset.groups.includes(s.group) && s.status !== 'deferred');

  const outer = isExport
    ? { background: pal.stage, color: pal.text1, fontFamily: pal.sans, minHeight: '100vh', padding: 'clamp(20px, 4vw, 44px) clamp(16px, 4vw, 32px)', colorScheme: pal.name }
    : { background: pal.stage, color: pal.text1, fontFamily: pal.sans, borderRadius: 10, padding: 'clamp(16px, 3vw, 28px)', margin: '8px 0 32px', colorScheme: pal.name };

  return (
    <div style={outer}>
      <div style={{ maxWidth: isExport ? 1120 : 'none', margin: isExport ? '0 auto' : 0 }}>
      <ControlBar pal={pal} accent={accent} theme={theme} setTheme={setTheme} view={view} setView={setView} variant={variant} part={part} shellRoute={preset.shellRoute} exportRoute={preset.exportRoute} />
      {/* header */}
      <div style={{ fontFamily: pal.mono, fontSize: 10, letterSpacing: '0.22em', color: pal.text3, marginBottom: 10 }}>{readerView ? 'ACF · FRAMEWORK CHARTS · GUIDED READING' : preset.eyebrow}</div>
      <h1 style={{ margin: 0, fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1.1, color: pal.text1, maxWidth: 760 }}>{preset.title}</h1>
      <p style={{ margin: '14px 0 18px', fontSize: 14, lineHeight: 1.62, color: pal.text3, maxWidth: 720 }}>
        {readerView
          ? 'A guided pass through the representative exhibits. Set a starting value once, then read top to bottom — each chart states a claim, shows it, and invites you to explore where it helps.'
          : preset.intro}
      </p>

      {!readerView && (
        <>
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
        </>
      )}

      <SimulationContextBar pal={pal} accent={accent} ctx={readerCtx} setCtx={setReaderCtx} />

      {readerView && <ReaderOrientation pal={pal} accent={accent} />}

      {!readerView && <InventoryTable pal={pal} accent={accent} specs={specs} />}

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
