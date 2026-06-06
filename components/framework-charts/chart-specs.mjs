/* ───────────────────────────────────────────────────────────────────────────
 * ACF Part 1 — Framework Chart spec registry
 *
 * One chart = one claim. Each spec is the single source of truth for a Part 1
 * exhibit: the locked claim/copy, the data-space series, the verifiable source
 * metadata, and the interaction targets. The FrameworkChart engine renders a
 * spec; page markup never hardcodes chart behavior.
 *
 * Doctrine (do not relax):
 *   Claim → Chart → Explainer → Source is non-negotiable.
 *   real ≠ representative — the footer makes the distinction visible.
 *   Source metadata + transforms are preserved here even while v0 renders
 *   representative geometry, so production can wire live series behind the spec.
 *
 * dataType is the TARGET provenance (drives "real charts must cite sources").
 * dataStatus is the CURRENT rendered state ('representative' until live-wired),
 * which drives the honesty disclosure in the footer. Pure ESM: imported by both
 * the Next.js component and the Node validation script.
 * ─────────────────────────────────────────────────────────────────────────── */

// ── deterministic helpers (self-contained: no runtime imports) ───────────────
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const ss = (t) => t * t * (3 - 2 * t);                  // smoothstep
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const R = (v, p = 1000) => Math.round(v * p) / p;

// sample fn(t,x) over x∈[x0,x1] with seeded noise
function curve(x0, x1, n, fn, seed = 1, amp = 0) {
  const rng = mulberry32(seed);
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = x0 + (x1 - x0) * t;
    let y = fn(t, x);
    if (amp) y += (rng() - 0.5) * amp;
    out.push({ x: R(x), y: R(y) });
  }
  return out;
}
// linear read of a series at an arbitrary x (for anchoring markers exactly)
export function valueAt(pts, x) {
  if (x <= pts[0].x) return pts[0].y;
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].x >= x) {
      const a = pts[i - 1], b = pts[i];
      const t = (x - a.x) / ((b.x - a.x) || 1);
      return a.y + (b.y - a.y) * t;
    }
  }
  return pts[pts.length - 1].y;
}

/* ── 01 · 60/40 stopped cushioning (the old hedge broke) ────────────────────*/
const hedge = (() => {
  const n = 100;
  const stocks = curve(0, 100, n, (t) => (t < 0.55 ? 100 - 27 * ss(t / 0.55) : 73 + 16 * ss((t - 0.55) / 0.45)), 11, 1.3);
  const bonds = curve(0, 100, n, (t) => {
    const shock = -7 * Math.exp(-Math.pow((t - 0.42) / 0.16, 2)); // the hedge that fails
    return 100 - 9 * t + shock;
  }, 23, 0.8);
  const p6040 = stocks.map((p, i) => ({ x: p.x, y: R(0.6 * p.y + 0.4 * bonds[i].y) }));
  return { stocks, bonds, p6040 };
})();

/* ── 02 · Correlation regime changed (rolling stock–bond ρ) ─────────────────*/
const corr = (() => {
  const N = 132, flipStart = 78, flipEnd = 96;
  const rng = mulberry32(11);
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const x = (i / N) * N;
    let y;
    if (x < flipStart) {
      const u = x / flipStart;
      y = -0.46 + 0.08 * Math.sin(u * 8) + 0.18 * u;        // -0.46 → -0.28, drifting toward zero
    } else if (x < flipEnd) {
      const u = (x - flipStart) / (flipEnd - flipStart);
      y = -0.28 + 0.72 * ss(u);                              // climbs through zero
    } else {
      const u = (x - flipEnd) / (N - flipEnd);
      y = 0.44 - 0.08 * ss(u) + 0.06 * Math.sin(u * 6);      // settles sticky-positive
    }
    y += (rng() - 0.5) * 0.04;
    pts.push({ x: R(x), y: R(y) });
  }
  const cross = pts.find((p) => p.y > 0) || pts[0];
  return { pts, flipStart, flipEnd, cross };
})();

/* ── 04 · Fiscal pressure / policy constraint (dual panel) ──────────────────*/
const fiscal = (() => {
  const n = 120;
  const debt = curve(0, 40, n, (t) => 40 + 82 * ss(t) + 6 * Math.sin(t * 7), 61, 1.2);
  const interest = curve(0, 40, n, (t) => {
    const fall = 3.2 - 1.6 * ss(clamp(t / 0.62, 0, 1));        // rates fall, burden eases
    const rise = 1.6 + 2.4 * ss(clamp((t - 0.62) / 0.38, 0, 1)); // then accelerates
    return t < 0.62 ? fall : rise;
  }, 67, 0.12);
  return { debt, interest };
})();

// ── representative disclosure shared across the v0 real-data charts ──────────
const REP = 'Representative shape pending live data wiring. Target series, providers, and transforms are listed under the source — this is illustrative geometry, not a backtest.';

export const FRAMEWORK_CHART_SPECS = [
  {
    /* identity + claim ----------------------------------------------------- */
    chartId: 'p1-hedge-broke',
    idx: '01',
    title: 'When 60/40 stopped cushioning',
    setupLine: 'Indexed total return through an inflation shock: stocks, bonds, and the 60/40 blend',
    claimLabel: 'DIVERSIFICATION · FRAGILITY',
    frameworkClaim: 'Stocks and bonds are not always true diversifiers.',
    readerTakeaway: 'When inflation drives the regime, the hedge can fall with the risk.',
    chartType: 'Indexed-return stress chart, 3 series (stocks, bonds, 60/40).',

    /* data provenance ------------------------------------------------------ */
    dataType: 'real',
    dataStatus: 'representative',
    transform: 'Indexed to 100 at shock onset · monthly · drawdown from prior peak shown for the blend.',
    sources: [
      { provider: 'FRED', seriesId: 'SP500TR', label: 'S&P 500 total return', dateRange: '2020 to 2024', frequency: 'Monthly', transform: 'Indexed to 100 at shock onset', url: 'https://fred.stlouisfed.org/series/SP500TR', role: 'series' },
      { provider: 'FRED', seriesId: 'BAMLCC0A0CMTRIV', label: 'Bloomberg US Aggregate total return (ICE proxy)', dateRange: '2020 to 2024', frequency: 'Monthly', transform: 'Indexed to 100 at shock onset', url: 'https://fred.stlouisfed.org/series/BAMLCC0A0CMTRIV', role: 'series' },
      { provider: 'Author calculation', label: '60/40 blend, monthly rebalance', transform: '0.6 × equity + 0.4 × aggregate', role: 'author-calculation', notes: 'Method documented in appendix.' },
    ],
    citationFooter: 'Source · FRED · SP500TR + Bloomberg US Agg · monthly · 2020 to 2024 · indexed at shock onset',
    truthDisclosure: REP,

    /* trust layer (locked copy) ------------------------------------------- */
    explainerHeadline: 'The hedge can fail with the risk.',
    explainerBody: 'Stocks and bonds are not always a true hedge. When inflation drives both sides of the book down together, the old 60/40 cushion can thin out at the exact moment you are counting on it.',
    explainerConcept: 'Correlation regime',
    concepts: [
      { label: 'Fragility', link: '#manifesto' },
      { label: 'Correlation regime', link: '/part-2-lineage-macro-thesis' },
      { label: 'Part 6 CIS', link: '/part-6-convexity-framework-integrity-scoring' },
    ],

    /* rendering ------------------------------------------------------------ */
    layout: 'single',
    ariaSummary: 'Line chart of indexed total return through an inflation shock. Stocks fall and recover; bonds, the supposed hedge, fall with stocks through the shock window; the 60/40 blend thins to its flagged drawdown rather than cushioning.',
    domain: { xMin: 0, xMax: 100, yMin: 68, yMax: 104 },
    yUnit: 'idx',
    xTicks: [{ v: 0, label: 'shock −1' }, { v: 42, label: 'shock' }, { v: 100, label: 'recovery' }],
    yTicks: [{ v: 70 }, { v: 80 }, { v: 90 }, { v: 100 }],
    series: [
      { key: 's', tier: 'secondary', label: 'Stocks', labelDy: 16, pts: hedge.stocks },
      { key: 'b', tier: 'tertiary', label: 'Bonds', labelDy: -4, pts: hedge.bonds },
      { key: 'p', tier: 'primary', label: '60 / 40', pts: hedge.p6040 },
    ],
    bands: [{ id: 'band0', kind: 'shock', x0: 28, x1: 64, render: 'pressureField', seed: 41, intensity: 0.78, asymmetric: 0.16, label: 'inflation shock · pressure enters the system', labelAnchor: 'start' }],
    guides: [{ y: 100, kind: 'base', label: 'base = 100' }],
    markers: [{ id: 'marker0', type: 'enso', x: 42, y: R(valueAt(hedge.bonds, 42)), r: 13, label: 'hedge fails · bonds fall with stocks', labelAnchor: 'end', labelDy: -20 }],
    levels: [{ id: 'invalidation', y: 84, kind: 'charcoal', label: 'drawdown the framework flags' }],
    primaryKey: 'p',

    /* interaction ---------------------------------------------------------- */
    hoverTargets: [
      { id: 'band0', kind: 'band', label: 'Inflation-shock window', name: 'Inflation-shock window', why: 'Context brushed behind the data. It frames why both legs fell together.', claim: 'Locates the failure in a regime, not an accident.', concept: 'Macro regime', link: '/part-2-lineage-macro-thesis' },
      { id: 'marker0', kind: 'marker', label: 'Hedge-failure inflection', name: 'Hedge-failure inflection', why: 'The exact mechanism of 60/40 fragility: the hedge correlating to the risk it was meant to offset.', claim: 'Identifies the tripwire.', concept: 'Tripwire', link: '/part-5-portfolio-construction-position-management' },
      { id: 'b', kind: 'series', seriesKey: 'b', label: 'Bonds', name: 'Bonds', why: 'The supposed hedge. In this regime it fell alongside stocks instead of offsetting them.', claim: 'The diversifier stopped diversifying.', concept: 'Correlation regime', link: '/part-2-lineage-macro-thesis' },
      { id: 's', kind: 'series', seriesKey: 's', label: 'Stocks', name: 'Stocks', why: 'The risk asset, expected to fall in a shock. No surprise here.', claim: 'Baseline for the drawdown.', concept: 'Risk asset', link: '/part-2-lineage-macro-thesis' },
      { id: 'p', kind: 'series', seriesKey: 'p', label: '60 / 40 blend', name: '60 / 40 blend', why: 'This is the portfolio most investors actually hold. Its drawdown is the lived experience of the regime.', claim: 'Proves the “balanced” cushion thinned.', concept: 'Fragility', link: '/part-6-convexity-framework-integrity-scoring' },
      { id: 'invalidation', kind: 'level', label: 'Flagged drawdown', name: 'Flagged drawdown', why: 'Beyond this line, the balanced label no longer describes the risk being run.', claim: 'Turns a soft worry into a sober threshold.', concept: 'Invalidation', link: '/part-6-convexity-framework-integrity-scoring' },
    ],
    mobileTapTargets: ['band0', 'marker0', 'b', 'p', 'invalidation'],
    implementationNotes: 'Canonical Part 1 hero. Render-layer order strict; live hover required; mobile single-insight sheet required. Production swaps primary index series behind this spec without touching the engine.',
  },

  {
    chartId: 'p1-correlation',
    idx: '02',
    title: 'The correlation regime changed',
    setupLine: 'Rolling 24-month stock–bond correlation across an inflation-shock window',
    claimLabel: 'CORRELATION · REGIME',
    frameworkClaim: 'Stock–bond correlation changes when inflation becomes the dominant stress.',
    readerTakeaway: 'The diversifier did not disappear. The regime that produced it did.',
    chartType: 'Rolling 24-month stock–bond correlation with a non-rectangular inflation-shock background.',

    dataType: 'real',
    dataStatus: 'representative',
    transform: '24-month rolling Pearson correlation of monthly total returns, stepped monthly.',
    sources: [
      { provider: 'FRED', seriesId: 'SP500TR', label: 'S&P 500 total return', dateRange: '2014 to 2024', frequency: 'Monthly', url: 'https://fred.stlouisfed.org/series/SP500TR', role: 'series' },
      { provider: 'FRED', seriesId: 'BAMLCC0A0CMTRIV', label: 'Bloomberg US Aggregate total return (ICE proxy)', dateRange: '2014 to 2024', frequency: 'Monthly', url: 'https://fred.stlouisfed.org/series/BAMLCC0A0CMTRIV', role: 'series' },
      { provider: 'Author calculation', label: 'Rolling 24-month Pearson correlation', transform: 'Pearson ρ of monthly returns, 24-month window', role: 'author-calculation' },
    ],
    citationFooter: 'Source · FRED · SP500TR + Bloomberg US Agg · monthly returns · 2014 to 2024 · 24-month rolling Pearson',
    truthDisclosure: REP,

    explainerHeadline: 'When inflation runs the regime, correlations flip.',
    explainerBody: 'Stock–bond correlation was deeply negative for two decades. When inflation became the dominant stress, the correlation flipped positive — and the diversification both sides relied on quietly stopped working together.',
    explainerConcept: 'Macro regime',
    concepts: [
      { label: '60/40 failure', link: '#manifesto' },
      { label: 'Correlation regime', link: '/part-2-lineage-macro-thesis' },
      { label: 'Fragility', link: '/part-6-convexity-framework-integrity-scoring' },
    ],

    layout: 'single',
    ariaSummary: 'Line chart of rolling 24-month stock–bond correlation. The correlation sits deeply negative through the low-inflation regime, then climbs through zero inside a feathered inflation-shock pressure field and settles positive in the high-inflation regime.',
    domain: { xMin: 0, xMax: 132, yMin: -0.65, yMax: 0.65 },
    yUnit: 'ρ',
    xTicks: [{ v: 0, label: 'low-inflation regime' }, { v: 132, label: 'high-inflation regime' }],
    yTicks: [{ v: -0.5, label: '−0.5' }, { v: 0, label: '0' }, { v: 0.5, label: '+0.5' }],
    series: [{ key: 'c', tier: 'primary', label: 'ρ', pts: corr.pts }],
    bands: [{
      id: 'band0', kind: 'shock', x0: corr.flipStart, x1: corr.flipEnd, render: 'pressureField',
      spanScale: 0.95, seed: 41, intensity: 0.78, asymmetric: 0.16,
      label: 'inflation shock · pressure enters the system', labelAnchor: 'peak',
    }],
    guides: [{ y: 0, kind: 'zero', label: 'zero correlation' }],
    markers: [{ id: 'marker0', type: 'enso', x: corr.cross.x, y: corr.cross.y, r: 13, label: 'correlation regime flips', labelAnchor: 'end', labelDy: -28 }],
    levels: [],
    primaryKey: 'c',

    hoverTargets: [
      { id: 'band0', kind: 'band', label: 'Inflation-shock pressure field', name: 'Inflation-shock pressure field', why: 'A rendering treatment, not a date range. It marks where inflation became the dominant stress; it never widens or narrows the real window.', claim: 'The regime, not an accident, flipped the sign.', concept: 'Macro regime', link: '/part-2-lineage-macro-thesis' },
      { id: 'marker0', kind: 'marker', label: 'Correlation regime flips', name: 'Correlation regime flips', why: 'The zero-crossing: the point the hedge inverted from offsetting risk to amplifying it.', claim: 'The mechanism that made 60/40 work inverted.', concept: 'Correlation regime', link: '/part-2-lineage-macro-thesis' },
      { id: 'c', kind: 'series', seriesKey: 'c', label: 'Stock–bond ρ', name: 'Stock–bond ρ', why: 'Two decades negative, then sticky-positive. The diversifier did not vanish; the regime that produced it changed.', claim: 'Correlation is regime-dependent.', concept: 'Correlation regime', link: '/part-2-lineage-macro-thesis' },
    ],
    mobileTapTargets: ['band0', 'marker0', 'c'],
    implementationNotes: 'Pressure field is bespoke geometry (brush.pressureField) — never a rectangle. It must be a rendering treatment only and never alter the true stress window. Reuse for any future shock-window exhibit.',
  },

  {
    chartId: 'p1-policy-constraint',
    idx: '04',
    title: 'Policy is constrained by debt and interest burden',
    setupLine: 'Federal debt and net interest, both as a share of GDP, on a shared timeline',
    claimLabel: 'POLICY · CONSTRAINT',
    frameworkClaim: 'Debt and interest burden reduce policy freedom.',
    readerTakeaway: 'For decades, debt rose while falling rates hid the cost. The cost is no longer hidden.',
    chartType: 'Stacked dual-panel chart, shared timeline. Top: debt/GDP. Bottom: net interest/GDP.',

    dataType: 'real',
    dataStatus: 'representative',
    transform: 'Annual, expressed as % of GDP. No smoothing.',
    sources: [
      { provider: 'FRED', seriesId: 'GFDEGDQ188S', label: 'Federal debt held by the public / GDP', dateRange: '1980 to 2024', frequency: 'Annual', url: 'https://fred.stlouisfed.org/series/GFDEGDQ188S', role: 'series' },
      { provider: 'BEA (via FRED)', seriesId: 'A091RC1Q027SBEA', label: 'Federal net interest outlays', dateRange: '1980 to 2024', frequency: 'Annual', transform: 'Divided by GDP', url: 'https://fred.stlouisfed.org/series/A091RC1Q027SBEA', role: 'series' },
      { provider: 'FRED', seriesId: 'GDP', label: 'Gross domestic product (denominator)', url: 'https://fred.stlouisfed.org/series/GDP', role: 'series' },
    ],
    citationFooter: 'Source · FRED · GFDEGDQ188S + BEA net interest / GDP · annual · 1980 to 2024 · share of GDP',
    truthDisclosure: REP,

    explainerHeadline: 'The cost of debt stopped being free.',
    explainerBody: 'Debt rose for forty years while rates fell, hiding the burden. As rates normalize, that bill compounds — and the room for fiscal support in the next downturn narrows. Policy freedom is no longer a free option.',
    explainerConcept: 'Policy constraint',
    concepts: [
      { label: 'Policy constraint', link: '#manifesto' },
      { label: 'Macro thesis', link: '/part-2-lineage-macro-thesis' },
      { label: 'Fragility', link: '/part-6-convexity-framework-integrity-scoring' },
    ],

    layout: 'dual',
    ariaSummary: 'Two stacked line charts sharing a 1980-to-2024 timeline. The top panel shows federal debt as a share of GDP rising steeply. The bottom panel shows net interest as a share of GDP easing as rates fall, then inflecting upward past an interest-burden pressure threshold as rates normalize.',
    xDomain: { xMin: 0, xMax: 40 },
    xTicks: [{ v: 0, label: 'yr 0' }, { v: 25, label: 'rates trough' }, { v: 40, label: 'now' }],
    connective: 'as rates normalize, the interest burden accelerates → policy constraint tightens',
    panels: [
      {
        id: 'debtPanel', label: 'Federal debt / GDP', yUnit: '%',
        domain: { yMin: 30, yMax: 130 }, yTicks: [{ v: 50 }, { v: 90 }, { v: 120 }],
        series: [{ key: 'debt', tier: 'reference', label: 'Debt / GDP', pts: fiscal.debt }],
      },
      {
        id: 'intPanel', label: 'Net interest / GDP', yUnit: '%',
        domain: { yMin: 1, yMax: 4.4 }, yTicks: [{ v: 2 }, { v: 3 }, { v: 4 }],
        series: [{ key: 'int', tier: 'primary', label: 'Net interest / GDP', pts: fiscal.interest }],
        guides: [{ id: 'threshold', y: 3, kind: 'threshold', dash: true, label: 'interest-burden pressure' }],
        markers: [{ id: 'burden', type: 'dot', x: 25, y: R(valueAt(fiscal.interest, 25)), r: 3, label: 'burden inflects', labelAnchor: 'middle', labelDy: 20 }],
      },
    ],
    primaryKey: 'int',

    hoverTargets: [
      { id: 'debt', kind: 'series', panel: 'debtPanel', seriesKey: 'debt', label: 'Debt / GDP', name: 'Federal debt / GDP', why: 'Four decades of accumulation. On its own it looks survivable because the cost of carrying it kept falling.', claim: 'The denominator of the constraint.', concept: 'Policy constraint', link: '#manifesto' },
      { id: 'int', kind: 'series', panel: 'intPanel', seriesKey: 'int', label: 'Net interest / GDP', name: 'Net interest / GDP', why: 'The bill. It eased for decades as rates fell; as rates normalize it compounds and crowds out everything else.', claim: 'The cost of debt stopped being free.', concept: 'Policy constraint', link: '#manifesto' },
      { id: 'threshold', kind: 'level', panel: 'intPanel', label: 'Interest-burden pressure', name: 'Interest-burden pressure', why: 'Past this share of GDP, debt service starts competing directly with the room for fiscal support.', claim: 'A sober threshold, not a forecast.', concept: 'Invalidation', link: '/part-6-convexity-framework-integrity-scoring' },
      { id: 'burden', kind: 'marker', panel: 'intPanel', label: 'Burden inflects', name: 'Burden inflects', why: 'The rate trough. From here, normalizing rates turn a falling burden into a rising one.', claim: 'Identifies where the free option expires.', concept: 'Tripwire', link: '/part-5-portfolio-construction-position-management' },
    ],
    mobileTapTargets: ['debt', 'int', 'threshold', 'burden'],
    implementationNotes: 'Dual-panel = two plots sharing the x-domain, one explainer, one footer (one chart = one claim). Do not invent a dual-axis primitive. Connective caption composed between panels.',
  },
];

export const FRAMEWORK_CHART_ORDER = FRAMEWORK_CHART_SPECS.map((s) => s.chartId);

export function getChartSpec(id) {
  return FRAMEWORK_CHART_SPECS.find((s) => s.chartId === id) || null;
}

export default FRAMEWORK_CHART_SPECS;
