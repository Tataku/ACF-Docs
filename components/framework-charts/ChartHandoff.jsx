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
import React, { useState } from 'react';
import FrameworkChart from './FrameworkChart';
import { FRAMEWORK_CHART_SPECS, HANDOFF_GROUPS, specsByGroup, footerModel } from './chart-specs.mjs';
import { getPalette, getAccent } from './palette';

const PLACEMENT = { both: 'Docs + Part 1', 'docs-landing': 'Docs landing', 'part-1': 'Part 1' };
const STATUS = {
  implemented: { label: 'Implemented', tone: 'ok' },
  'needs-design-review': { label: 'Needs design review', tone: 'warn' },
  'spec-only': { label: 'Spec only', tone: 'mute' },
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

function InventoryTable({ pal, accent }) {
  const cols = '54px 1fr 96px 96px 116px 84px';
  const head = { fontFamily: pal.mono, fontSize: 8.5, letterSpacing: '0.16em', color: pal.text4 };
  return (
    <div style={{ border: `1px solid ${pal.cardBorder}`, borderRadius: 7, overflow: 'hidden', marginBottom: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: cols, gap: '0 14px', padding: '11px 16px', background: pal.surface, borderBottom: `1px solid ${pal.cardBorder}`, ...head }} className="acf-hand-row">
        <span>ID</span><span>TITLE · CLAIM</span><span>PLACEMENT</span><span>MODE</span><span>STATUS</span><span style={{ textAlign: 'right' }}>WIRED</span>
      </div>
      {FRAMEWORK_CHART_SPECS.map((s, i) => (
        <div key={s.chartId} style={{ display: 'grid', gridTemplateColumns: cols, gap: '0 14px', alignItems: 'baseline', padding: '12px 16px', borderBottom: i < FRAMEWORK_CHART_SPECS.length - 1 ? `1px solid ${pal.cardBorder}` : 'none' }} className="acf-hand-row">
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

// Quiet local theme toggle for agency preview (Dark / Light) + route switch.
function ViewToggle({ pal, accent, theme, setTheme, variant }) {
  const seg = (val, label) => (
    <button key={val} onClick={() => setTheme(val)} aria-pressed={theme === val} style={{
      fontFamily: pal.mono, fontSize: 9.5, letterSpacing: '0.12em', cursor: 'pointer',
      padding: '5px 13px', border: 'none', borderRadius: 5,
      background: theme === val ? accent : 'transparent',
      color: theme === val ? '#fff' : pal.text3,
      transition: 'background .15s ease, color .15s ease',
    }}>{label}</button>
  );
  const to = variant === 'export' ? '/chart-handoff' : '/chart-handoff-export';
  const toLabel = variant === 'export' ? 'Docs shell ↗' : 'Export view ↗';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 22 }}>
      <span style={{ fontFamily: pal.mono, fontSize: 9, letterSpacing: '0.16em', color: pal.text4 }}>VIEW</span>
      <div style={{ display: 'inline-flex', gap: 3, padding: 3, border: `1px solid ${pal.cardBorder}`, borderRadius: 7, background: pal.surface }}>
        {seg('dark', 'Dark')}
        {seg('light', 'Light')}
      </div>
      <a href={to} style={{ fontFamily: pal.mono, fontSize: 9, letterSpacing: '0.1em', color: pal.text3, textDecoration: 'none', borderBottom: `1px dotted ${pal.borderHi}`, paddingBottom: 1 }}>{toLabel}</a>
    </div>
  );
}

export default function ChartHandoff({ initialTheme = 'dark', accent: accentName = 'green', variant = 'embedded' }) {
  const [theme, setTheme] = useState(initialTheme);
  const pal = getPalette(theme);
  const accent = getAccent(pal, accentName);
  const isExport = variant === 'export';

  const outer = isExport
    ? { background: pal.stage, color: pal.text1, fontFamily: pal.sans, minHeight: '100vh', padding: 'clamp(20px, 4vw, 44px) clamp(16px, 4vw, 32px)', colorScheme: pal.name }
    : { background: pal.stage, color: pal.text1, fontFamily: pal.sans, borderRadius: 10, padding: 'clamp(16px, 3vw, 28px)', margin: '8px 0 32px', colorScheme: pal.name };

  return (
    <div style={outer}>
      <div style={{ maxWidth: isExport ? 1120 : 'none', margin: isExport ? '0 auto' : 0 }}>
      <ViewToggle pal={pal} accent={accent} theme={theme} setTheme={setTheme} variant={variant} />
      {/* header */}
      <div style={{ fontFamily: pal.mono, fontSize: 10, letterSpacing: '0.22em', color: pal.text3, marginBottom: 10 }}>ACF · FRAMEWORK CHART HANDOFF · INTERNAL REVIEW</div>
      <h1 style={{ margin: 0, fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1.1, color: pal.text1, maxWidth: 760 }}>Every chart for the docs landing page and Part 1</h1>
      <p style={{ margin: '14px 0 18px', fontSize: 14, lineHeight: 1.62, color: pal.text3, maxWidth: 720 }}>
        The full exhibit set in one place, for the marketing agency to review before production. Charts use art-directed, representative data shapes where exact historical series are not yet wired — every footer discloses that plainly, and the source links verify the underlying concept and data backdrop.
      </p>
      <div style={{ fontFamily: pal.mono, fontSize: 9.5, letterSpacing: '0.06em', color: pal.text4, lineHeight: 1.6, marginBottom: 20, maxWidth: 720 }}>
        Internal chart review surface for marketing / design handoff. Charts are not automatically placed in public framework pages; placement is chosen explicitly.
      </div>

      {/* legend */}
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center', padding: '12px 16px', border: `1px solid ${pal.cardBorder}`, borderRadius: 7, marginBottom: 22, fontFamily: pal.mono, fontSize: 9, letterSpacing: '0.08em', color: pal.text3 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><span style={{ width: 7, height: 7, transform: 'rotate(45deg)', border: `1px solid ${pal.bandStressText}` }} /> REPRESENTATIVE / SIMULATION</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><span style={{ width: 7, height: 7, borderRadius: '50%', border: `1px solid ${pal.text4}` }} /> CONCEPTUAL</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><span style={{ width: 6, height: 6, background: pal.text3 }} /> HISTORICAL (WHEN WIRED)</span>
      </div>

      <InventoryTable pal={pal} accent={accent} />

      {/* grouped gallery */}
      {HANDOFF_GROUPS.map((g) => {
        const specs = specsByGroup(g.id);
        if (!specs.length) return null;
        return (
          <section key={g.id} style={{ marginTop: 40 }}>
            <div style={{ borderTop: `1px solid ${pal.cardBorder}`, paddingTop: 22, marginBottom: 6 }}>
              <div style={{ fontFamily: pal.mono, fontSize: 10, letterSpacing: '0.2em', color: accent, marginBottom: 8 }}>{g.label.toUpperCase()}</div>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: pal.text3, maxWidth: 720 }}>{g.blurb}</p>
            </div>
            {specs.map((spec) => (
              <div key={spec.chartId} id={spec.chartId} style={{ scrollMarginTop: 80, marginTop: 24 }}>
                <MetaStrip pal={pal} accent={accent} spec={spec} />
                <FrameworkChart spec={spec} theme={theme} accent={accentName} />
              </div>
            ))}
          </section>
        );
      })}

      <div style={{ marginTop: 36, paddingTop: 16, borderTop: `1px solid ${pal.cardBorder}`, fontFamily: pal.mono, fontSize: 9, letterSpacing: '0.1em', color: pal.text4, display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <span>ACF FRAMEWORK CHARTS · REPRESENTATIVE EXHIBIT SET · INTERNAL HANDOFF</span>
        <span>REVIEW → APPROVE SHAPES → WIRE HISTORICAL DATA</span>
      </div>
      </div>
    </div>
  );
}
