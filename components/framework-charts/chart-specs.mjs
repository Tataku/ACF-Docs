/* ───────────────────────────────────────────────────────────────────────────
 * ACF Framework Charts — spec registry (docs landing + Part 1 inventory)
 *
 * One chart = one claim. Each spec is the single source of truth for an exhibit:
 * the claim/copy, the data-space series, the disclosure, the citation metadata,
 * and the interaction targets. The FrameworkChart engine renders a spec; page
 * markup never hardcodes chart behavior.
 *
 * Representative-data model (truthful, fast to ship):
 *   visualDataMode  'representative' | 'historical' | 'simulation' | 'conceptual'
 *     - representative : art-directed shape; sources verify the CONCEPT/backdrop
 *     - historical     : exact plotted data wired from a provider (none yet)
 *     - simulation     : computed scenario; method, not a backtest
 *     - conceptual     : illustrative diagram; no historical claim at all
 *   sources[].role  'verifies-concept' | 'backs-series' | 'methodology' | 'target-source'
 *   disclosure      the one-line footer statement (never overdone)
 *
 * Rules honored here:
 *   · representative geometry is never labelled exact historical data
 *   · simulations say simulation; conceptual diagrams say conceptual
 *   · the 'historical' path is allowed for later, not required for this handoff
 *
 * Pure ESM: imported by both the Next.js components and the Node validator.
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
const ss = (t) => t * t * (3 - 2 * t);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const R = (v, p = 1000) => Math.round(v * p) / p;
const softplus = (z) => Math.log(1 + Math.exp(z));

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

// ── disclosure presets (consistent, minimal, truthful) ───────────────────────
export const DISCLOSURE = {
  representative: 'Representative framework exhibit · Sources support the underlying concept',
  simulation: 'Representative simulation · Built to show path dependency, not a historical backtest',
  conceptual: 'Conceptual diagram · Illustrative framework exhibit, not historical data',
};

// ════════════════════════════════════════════════════════════════════════════
// DATA SHAPES (representative / conceptual — deterministic so SSR == CSR)
// ════════════════════════════════════════════════════════════════════════════

// 60/40 stopped cushioning
const hedge = (() => {
  const n = 100;
  const stocks = curve(0, 100, n, (t) => (t < 0.55 ? 100 - 27 * ss(t / 0.55) : 73 + 16 * ss((t - 0.55) / 0.45)), 11, 1.3);
  const bonds = curve(0, 100, n, (t) => 100 - 9 * t - 7 * Math.exp(-Math.pow((t - 0.42) / 0.16, 2)), 23, 0.8);
  const p6040 = stocks.map((p, i) => ({ x: p.x, y: R(0.6 * p.y + 0.4 * bonds[i].y) }));
  return { stocks, bonds, p6040 };
})();

// Correlation regime change
const corr = (() => {
  const N = 132, flipStart = 78, flipEnd = 96;
  const rng = mulberry32(11);
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const x = (i / N) * N;
    let y;
    if (x < flipStart) { const u = x / flipStart; y = -0.46 + 0.08 * Math.sin(u * 8) + 0.18 * u; }
    else if (x < flipEnd) { const u = (x - flipStart) / (flipEnd - flipStart); y = -0.28 + 0.72 * ss(u); }
    else { const u = (x - flipEnd) / (N - flipEnd); y = 0.44 - 0.08 * ss(u) + 0.06 * Math.sin(u * 6); }
    y += (rng() - 0.5) * 0.04;
    pts.push({ x: R(x), y: R(y) });
  }
  const cross = pts.find((p) => p.y > 0) || pts[0];
  return { pts, flipStart, flipEnd, cross };
})();

// CPI vs assets
const cpiAssets = (() => {
  const n = 120;
  const cpi = curve(0, 24, n, (t) => 100 * Math.pow(1.026, 24 * t), 41, 1.0);
  const housing = curve(0, 24, n, (t) => 100 * Math.pow(1.052, 24 * t) - 22 * Math.exp(-Math.pow((t - 0.36) / 0.07, 2)), 47, 1.6);
  const assets = curve(0, 24, n, (t) => 100 * Math.pow(1.072, 24 * t) - 34 * Math.exp(-Math.pow((t - 0.36) / 0.06, 2)) - 28 * Math.exp(-Math.pow((t - 0.83) / 0.04, 2)), 53, 2.4);
  return { cpi, housing, assets };
})();

// Fiscal pressure (dual)
const fiscal = (() => {
  const n = 120;
  const debt = curve(0, 40, n, (t) => 40 + 82 * ss(t) + 6 * Math.sin(t * 7), 61, 1.2);
  const interest = curve(0, 40, n, (t) => (t < 0.62 ? 3.2 - 1.6 * ss(clamp(t / 0.62, 0, 1)) : 1.6 + 2.4 * ss(clamp((t - 0.62) / 0.38, 0, 1))), 67, 0.12);
  return { debt, interest };
})();

// Sequence-of-returns (simulation)
const sequence = (() => {
  const n = 120;
  const good = curve(0, 30, n, (t) => 1.0 + 0.55 * ss(clamp(t / 0.5, 0, 1)) + 0.2 * ss(clamp((t - 0.5) / 0.5, 0, 1)) - 0.18 * t, 71, 0.012);
  const bad = curve(0, 30, n, (t) => Math.max(0.04, (1.0 - 0.5 * ss(clamp(t / 0.34, 0, 1))) + 0.62 * ss(clamp((t - 0.34) / 0.66, 0, 1)) - 0.55 * t), 79, 0.012);
  return { good, bad, divergeX: 7.5 };
})();

// Convexity / survivability (DCA)
const survival = (() => {
  const n = 150;
  const invested = curve(0, 10, n, (t) => 10 + 90 * t, 83, 0);
  const value = curve(0, 10, n, (t) => {
    const trend = 10 * Math.pow(1.78, 10 * t * 0.55);
    const cyc = 1 + 0.55 * Math.sin(t * Math.PI * 3.1 - 0.6);
    const dd = 1 - 0.34 * Math.exp(-Math.pow((t - 0.46) / 0.05, 2)) - 0.3 * Math.exp(-Math.pow((t - 0.84) / 0.045, 2));
    return Math.max(6, trend * cyc * dd * 0.5 + 8 * t);
  }, 89, 3.0);
  // deepest drawdown from running peak
  let peak = -Infinity, trough = { x: 0, dd: 0, y: 0 };
  value.forEach((p) => { peak = Math.max(peak, p.y); const dd = (peak - p.y) / peak; if (dd > trough.dd) trough = { x: p.x, dd, y: p.y }; });
  return { invested, value, trough };
})();

// Signature payoff curve (conceptual)
const payoff = (() => {
  const n = 90;
  const shaped = curve(-1, 1.6, n, (t, x) => 0.9 * softplus(2.3 * x) - 0.62 + 0.35 * Math.pow(Math.max(0, x), 2), 0, 0);
  const linear = curve(-0.7, 1.5, Math.round(n * 0.7), (t, x) => 1.2 * x, 0, 0);
  return { shaped, linear, floor: R(valueAt(shaped, -1)) };
})();

// Signature distribution reshape (conceptual)
const shape = (() => {
  const n = 120;
  const symmetric = curve(-3, 4, n, (t, x) => Math.exp(-(x * x) / (2 * 1.0 * 1.0)), 0, 0);
  const shaped = curve(-3, 4, n, (t, x) => (x < 0
    ? Math.exp(-(x * x) / (2 * 0.5 * 0.5))
    : Math.exp(-(x * x) / (2 * 1.7 * 1.7)) + 0.14 * Math.exp(-Math.pow((x - 2.4) / 0.5, 2))), 0, 0);
  return { symmetric, shaped };
})();

// Convexity window (representative path)
const window_ = (() => {
  const n = 110;
  const value = curve(0, 100, n, (t) => (t < 0.5 ? 100 + 2.4 * Math.sin(t * 70) : 100 + 100 * Math.pow((t - 0.5) / 0.5, 1.8)), 37, 0.6);
  return { value };
})();

// ════════════════════════════════════════════════════════════════════════════
// SPEC REGISTRY
// ════════════════════════════════════════════════════════════════════════════
export const FRAMEWORK_CHART_SPECS = [

  /* ── SIGNATURE / REUSABLE ──────────────────────────────────────────────── */
  {
    chartId: 'sig-payoff', idx: 'S1', group: 'signature', intendedPlacement: 'both',
    status: 'needs-design-review', wiredPublic: false,
    title: 'Defined downside. Asymmetric upside.', setupLine: 'The payoff shape the whole framework is built to produce',
    claimLabel: 'PAYOFF SHAPE · SIGNATURE',
    frameworkClaim: 'ACF shapes exposure: the left side is capped, the right side is left free to run.',
    readerTakeaway: 'Survive the left tail; stay convex on the right tail.',
    chartType: 'Conceptual payoff curve vs a symmetric reference line.',
    visualDataMode: 'conceptual',
    disclosure: DISCLOSURE.conceptual, footerCta: 'View framework basis',
    sources: [
      { provider: 'ACF · Part 1', label: 'Survivable compounding under uncertainty', role: 'verifies-concept', url: '/part-1-foundation', notes: 'The payoff-shape thesis this diagram illustrates.' },
      { provider: 'ACF · Part 6', label: 'Convexity Integrity Score', role: 'verifies-concept', url: '/part-6-convexity-framework-integrity-scoring' },
    ],
    explainerHeadline: 'The framework is a payoff shape, not a prediction.',
    explainerBody: 'A symmetric position gives back on the left what it makes on the right. ACF caps the downside and keeps the upside open, so being roughly right occasionally still compounds. The whole system exists to defend that shape.',
    explainerConcept: 'Convexity',
    concepts: [{ label: 'Survivable compounding', link: '/part-1-foundation' }, { label: 'Convexity', link: '/part-6-convexity-framework-integrity-scoring' }],
    layout: 'single',
    ariaSummary: 'A conceptual payoff curve. A straight symmetric reference line loses on adverse outcomes as much as it gains on favourable ones. The ACF curve flattens to a defined-downside floor on the left and bends upward, accelerating, on the right.',
    domain: { xMin: -1, xMax: 1.6, yMin: -0.85, yMax: 3.8 }, yUnit: '',
    xTicks: [{ v: -1, label: 'adverse outcome' }, { v: 0, label: 'base' }, { v: 1.6, label: 'favourable outcome' }],
    yTicks: [],
    series: [
      { key: 'linear', tier: 'reference', label: 'Symmetric', pts: payoff.linear, labelDy: -2 },
      { key: 'shaped', tier: 'primary', label: 'ACF payoff', pts: payoff.shaped },
    ],
    guides: [{ id: 'breakeven', y: 0, kind: 'zero', label: 'breakeven' }],
    levels: [{ id: 'floor', y: payoff.floor, kind: 'charcoal', label: 'defined downside' }],
    markers: [{ id: 'upside', type: 'enso', x: 1.18, y: R(valueAt(payoff.shaped, 1.18)), r: 13, label: 'asymmetric upside', labelAnchor: 'end', labelDy: -18 }],
    notes: [],
    primaryKey: 'shaped',
    hoverTargets: [
      { id: 'shaped', kind: 'series', seriesKey: 'shaped', label: 'ACF payoff', name: 'ACF payoff', why: 'Flat and floored when outcomes go against you; accelerating when they go your way. That asymmetry is the entire edge.', claim: 'Exposure is shaped, not chased.', concept: 'Convexity', link: '/part-6-convexity-framework-integrity-scoring' },
      { id: 'linear', kind: 'series', seriesKey: 'linear', label: 'Symmetric exposure', name: 'Symmetric exposure', why: 'A naive position: it gives back on the downside exactly what it earns on the upside. No structural edge.', claim: 'The shape ACF is built to beat.', concept: 'Fragility', link: '/part-1-foundation' },
      { id: 'floor', kind: 'level', label: 'Defined downside', name: 'Defined downside', why: 'Sizing, wrappers, and tripwires exist to keep the left tail bounded so a wrong call is survivable.', claim: 'Survival is the precondition for compounding.', concept: 'Invalidation', link: '/part-6-convexity-framework-integrity-scoring' },
      { id: 'upside', kind: 'marker', label: 'Asymmetric upside', name: 'Asymmetric upside', why: 'The right tail is left uncapped. Occasional convex outcomes do the heavy lifting on terminal wealth.', claim: 'Let the winners run.', concept: 'Convexity', link: '/part-3-bitcoin-convexity-backbone' },
    ],
    mobileTapTargets: ['shaped', 'floor', 'upside', 'linear'],
    implementationNotes: 'This replaces the existing "Defined downside. Asymmetric upside." web chart. Belongs on the landing hero AND as the Part 1 opener. Marketing should refine curve character and labels.',
  },

  {
    chartId: 'sig-shape', idx: 'S2', group: 'signature', intendedPlacement: 'docs-landing',
    status: 'needs-design-review', wiredPublic: false,
    title: 'The shape of the strategy', setupLine: 'ACF reshapes the distribution of outcomes, it does not just chase higher returns',
    claimLabel: 'EXPOSURE SHAPING · SIGNATURE',
    frameworkClaim: 'ACF truncates the left tail and extends the right tail of the outcome distribution.',
    readerTakeaway: 'Same center of gravity, deliberately reshaped tails.',
    chartType: 'Conceptual outcome-distribution reshape vs a symmetric reference.',
    visualDataMode: 'conceptual',
    disclosure: DISCLOSURE.conceptual, footerCta: 'View framework basis',
    sources: [
      { provider: 'ACF · Part 1', label: 'Fragility is structural, not statistical', role: 'verifies-concept', url: '/part-1-foundation' },
      { provider: 'ACF · Part 5', label: 'Carry posture and barbell structure', role: 'verifies-concept', url: '/part-5-portfolio-construction-position-management' },
    ],
    explainerHeadline: 'We reshape the outcomes, not the average.',
    explainerBody: 'A symmetric strategy accepts a fat left tail to earn a fat right tail. ACF spends structure to thin the left tail and thicken the right, so the same broad exposure produces a fundamentally different distribution of survival outcomes.',
    explainerConcept: 'Barbell structure',
    concepts: [{ label: 'Fragility', link: '/part-1-foundation' }, { label: 'Carry posture', link: '/part-5-portfolio-construction-position-management' }],
    layout: 'single',
    ariaSummary: 'Two outcome-distribution curves. The symmetric reference is a bell centred on the base case. The ACF distribution is compressed on the loss side and stretched, with a small extra bump, on the gain side.',
    domain: { xMin: -3, xMax: 4, yMin: 0, yMax: 1.16 }, yUnit: '',
    xTicks: [{ v: -3, label: 'loss' }, { v: 0, label: 'base case' }, { v: 4, label: 'gain' }],
    yTicks: [],
    series: [
      { key: 'symmetric', tier: 'reference', label: 'Symmetric', pts: shape.symmetric, labelDy: 14 },
      { key: 'shaped', tier: 'primary', label: 'ACF shaped', pts: shape.shaped, labelDy: -8 },
    ],
    areas: [{ id: 'underShaped', topKey: 'shaped', kind: 'under', label: '' }],
    markers: [
      { id: 'truncated', type: 'dot', x: -1.3, y: R(valueAt(shape.shaped, -1.3)), r: 3.2, label: 'left tail truncated', labelAnchor: 'start', labelDy: -14 },
      { id: 'extended', type: 'dot', x: 2.4, y: R(valueAt(shape.shaped, 2.4)), r: 3.2, label: 'right tail extended', labelAnchor: 'end', labelDy: -14 },
    ],
    notes: [],
    primaryKey: 'shaped',
    hoverTargets: [
      { id: 'shaped', kind: 'series', seriesKey: 'shaped', label: 'ACF shaped', name: 'ACF shaped distribution', why: 'Thin on the loss side, heavy on the gain side. Structure is spent to buy that asymmetry.', claim: 'Outcomes are engineered, not hoped for.', concept: 'Barbell structure', link: '/part-5-portfolio-construction-position-management' },
      { id: 'symmetric', kind: 'series', seriesKey: 'symmetric', label: 'Symmetric', name: 'Symmetric distribution', why: 'The default risk posture: a fat left tail is the price of the right tail.', claim: 'The distribution ACF refuses to accept.', concept: 'Fragility', link: '/part-1-foundation' },
      { id: 'truncated', kind: 'marker', label: 'Left tail truncated', name: 'Left tail truncated', why: 'Wrappers, sizing, and tripwires cut the worst outcomes off the table.', claim: 'Defined downside in distribution form.', concept: 'Invalidation', link: '/part-6-convexity-framework-integrity-scoring' },
      { id: 'extended', kind: 'marker', label: 'Right tail extended', name: 'Right tail extended', why: 'Convex positions keep their uncapped upside, fattening the right side.', claim: 'Asymmetric upside in distribution form.', concept: 'Convexity', link: '/part-3-bitcoin-convexity-backbone' },
    ],
    mobileTapTargets: ['shaped', 'truncated', 'extended', 'symmetric'],
    implementationNotes: 'Companion to sig-payoff. Distribution framing gives the landing page visual variety. Marketing should decide whether to ship payoff-curve, distribution, or both.',
  },

  /* ── DOCS LANDING PAGE ─────────────────────────────────────────────────── */
  {
    chartId: 'dl-convexity-window', idx: 'L1', group: 'docs-landing', intendedPlacement: 'docs-landing',
    status: 'implemented', wiredPublic: false,
    title: 'The convexity window', setupLine: 'Compression, then confirmation, then asymmetric release',
    claimLabel: 'CONVEXITY · WINDOW',
    frameworkClaim: 'ACF waits for setups where downside is defined and upside can accelerate.',
    readerTakeaway: 'Patience through compression; size into confirmation; let the release run.',
    chartType: 'Representative regime/path chart with a compression field and release marker.',
    visualDataMode: 'representative',
    disclosure: DISCLOSURE.representative, footerCta: 'View sources',
    sources: [
      { provider: 'ACF · Part 5', label: 'Position management and entry discipline', role: 'verifies-concept', url: '/part-5-portfolio-construction-position-management' },
      { provider: 'ACF · Part 6', label: 'Convexity windows and CIS', role: 'verifies-concept', url: '/part-6-convexity-framework-integrity-scoring' },
    ],
    explainerHeadline: 'Convexity is a window, not a constant.',
    explainerBody: 'For long stretches a setup compresses: range-bound, downside defined, nothing to do. The framework waits. When the thesis confirms, exposure is added into the break, and the position is allowed to release asymmetrically rather than being trimmed early.',
    explainerConcept: 'Convexity window',
    concepts: [{ label: 'Convexity window', link: '/part-6-convexity-framework-integrity-scoring' }, { label: 'Position sizing', link: '/part-5-portfolio-construction-position-management' }],
    layout: 'single',
    ariaSummary: 'A representative price path. It stays range-bound inside a soft compression field, breaks out at a confirmation marker, then accelerates upward into an asymmetric release.',
    domain: { xMin: 0, xMax: 100, yMin: 90, yMax: 210 }, yUnit: 'idx',
    xTicks: [{ v: 0, label: 'setup' }, { v: 50, label: 'confirmation' }, { v: 100, label: 'release' }],
    yTicks: [{ v: 100, label: 'base' }, { v: 150 }, { v: 200 }],
    series: [{ key: 'v', tier: 'primary', label: 'Path', pts: window_.value }],
    bands: [{ id: 'compression', kind: 'regime', render: 'wash', x0: 0, x1: 50, label: 'compression · downside defined', labelAnchor: 'start' }],
    levels: [{ id: 'floor', y: 96, kind: 'charcoal', label: 'defined downside' }],
    markers: [
      { id: 'confirm', type: 'enso', x: 51, y: R(valueAt(window_.value, 51)), r: 12, label: 'confirmation', labelAnchor: 'end', labelDy: -16 },
      { id: 'release', type: 'dot', x: 92, y: R(valueAt(window_.value, 92)), r: 3.2, label: 'asymmetric release', labelAnchor: 'end', labelDy: -14 },
    ],
    notes: [],
    primaryKey: 'v',
    hoverTargets: [
      { id: 'compression', kind: 'band', label: 'Compression field', name: 'Compression field', why: 'Range-bound, low energy, downside defined. The framework is patient here on purpose.', claim: 'Most of the time there is nothing to do.', concept: 'Convexity window', link: '/part-6-convexity-framework-integrity-scoring' },
      { id: 'confirm', kind: 'marker', label: 'Confirmation', name: 'Confirmation', why: 'Thesis and momentum align. This is where exposure is added, not at the first hope.', claim: 'Size into confirmation, not anticipation.', concept: 'Momentum filter', link: '/part-5-portfolio-construction-position-management' },
      { id: 'release', kind: 'marker', label: 'Asymmetric release', name: 'Asymmetric release', why: 'The convex move the patience was for. The position is allowed to run rather than trimmed early.', claim: 'Let the release express.', concept: 'Convexity', link: '/part-3-bitcoin-convexity-backbone' },
      { id: 'v', kind: 'series', seriesKey: 'v', label: 'Path', name: 'Representative path', why: 'One illustrative journey through a convexity window, from compression to release.', claim: 'Shape over forecast.', concept: 'Convexity window', link: '/part-6-convexity-framework-integrity-scoring' },
    ],
    mobileTapTargets: ['compression', 'confirm', 'release', 'v'],
    implementationNotes: 'Compression uses a feathered ink-wash band (washRect), NOT a pressure field (that treatment is reserved for the inflation shock).',
  },

  {
    chartId: 'dl-regime-map', idx: 'L2', group: 'docs-landing', intendedPlacement: 'docs-landing',
    status: 'needs-design-review', wiredPublic: false,
    title: 'Capital has weather', setupLine: 'Same assets, different regime, different behaviour',
    claimLabel: 'REGIME MAP · CAPITAL WEATHER',
    frameworkClaim: 'Portfolio construction changes with the macro regime.',
    readerTakeaway: 'You are not allocating in a vacuum; you are allocating into weather.',
    chartType: 'Growth × inflation quadrant with a representative regime path.',
    visualDataMode: 'representative',
    disclosure: DISCLOSURE.representative, footerCta: 'View sources',
    sources: [
      { provider: 'ACF · Part 2', label: 'Macro thesis and regime identification', role: 'verifies-concept', url: '/part-2-lineage-macro-thesis' },
      { provider: 'ACF · Part 1', label: 'Regime-agnostic allocation as a failure mode', role: 'verifies-concept', url: '/part-1-foundation' },
    ],
    explainerHeadline: 'The same portfolio behaves differently in different weather.',
    explainerBody: 'Growth and inflation define four broad regimes, and the leadership that wins in one loses in another. ACF reads which quadrant capital is moving through and shapes exposure to fit it, instead of holding one static mix through every season.',
    explainerConcept: 'Macro regime',
    concepts: [{ label: 'Macro regime', link: '/part-2-lineage-macro-thesis' }, { label: 'Regime fit', link: '/part-5-portfolio-construction-position-management' }],
    layout: 'quadrant',
    ariaSummary: 'A four-quadrant map of growth versus inflation. Quadrants are labelled stagflation, reflation, deflation, and goldilocks. A representative path traces capital moving from a disinflation boom through a deflation scare, reflation, an inflation shock, and back toward the centre.',
    quadrant: {
      xAxis: { neg: 'WEAK GROWTH', pos: 'STRONG GROWTH' },
      yAxis: { neg: 'LOW INFLATION', pos: 'HIGH INFLATION' },
      cells: [
        { qx: -1, qy: 1, label: 'Stagflation', sub: 'hard assets · defense' },
        { qx: 1, qy: 1, label: 'Reflation', sub: 'real assets · energy' },
        { qx: -1, qy: -1, label: 'Deflation', sub: 'duration · quality' },
        { qx: 1, qy: -1, label: 'Goldilocks', sub: 'risk-on · growth' },
      ],
      path: ['wp1', 'wp2', 'wp3', 'wp4', 'wp5'],
      waypoints: {
        wp1: { x: 0.62, y: -0.66 }, wp2: { x: -0.28, y: -0.78 }, wp3: { x: 0.7, y: 0.5 }, wp4: { x: -0.55, y: 0.78 }, wp5: { x: 0.18, y: 0.16 },
      },
    },
    primaryKey: 'wp5',
    hoverTargets: [
      { id: 'wp1', kind: 'waypoint', label: 'Disinflation boom', name: 'Disinflation boom', why: 'Strong growth, falling inflation. Growth and risk lead; the easy regime to mistake for permanent.', claim: 'Goldilocks rewards risk-on.', concept: 'Regime fit', link: '/part-2-lineage-macro-thesis' },
      { id: 'wp2', kind: 'waypoint', label: 'Deflation scare', name: 'Deflation scare', why: 'Growth rolls over with low inflation. Duration and quality lead; convexity hides in safety.', claim: 'Different weather, different leaders.', concept: 'Macro regime', link: '/part-2-lineage-macro-thesis' },
      { id: 'wp3', kind: 'waypoint', label: 'Reflation', name: 'Reflation', why: 'Growth and inflation rise together. Real assets and energy lead; bonds stop helping.', claim: 'Real assets earn their keep.', concept: 'Macro regime', link: '/part-2-lineage-macro-thesis' },
      { id: 'wp4', kind: 'waypoint', label: 'Inflation shock', name: 'Inflation shock', why: 'Weak growth, high inflation. The stagflation corner where 60/40 broke and hard assets and defense led.', claim: 'The regime that breaks the old hedge.', concept: 'Fragility', link: '/part-1-foundation' },
      { id: 'wp5', kind: 'waypoint', label: 'Now', name: 'Where capital sits now', why: 'The framework keeps re-reading position on this map rather than assuming last season persists.', claim: 'Position is a live reading, not a constant.', concept: 'Adaptation', link: '/part-2-lineage-macro-thesis' },
    ],
    mobileTapTargets: ['wp1', 'wp2', 'wp3', 'wp4', 'wp5'],
    implementationNotes: 'Bespoke quadrant layout. Waypoint positions and regime copy are representative; marketing should validate the path narrative.',
  },

  {
    chartId: 'dl-tripwire-loop', idx: 'L3', group: 'docs-landing', intendedPlacement: 'docs-landing',
    status: 'needs-design-review', wiredPublic: false,
    title: 'A governed loop, not a static allocation', setupLine: 'Thesis creates exposure · exposure creates risk · tripwires govern behaviour',
    claimLabel: 'SYSTEM · GOVERNED LOOP',
    frameworkClaim: 'ACF is a closed-loop operating system, not a fixed set of weights.',
    readerTakeaway: 'Every position is traceable to a thesis and governed by a tripwire.',
    chartType: 'Minimal flow/loop diagram of the framework control system.',
    visualDataMode: 'conceptual',
    disclosure: DISCLOSURE.conceptual, footerCta: 'View framework basis',
    sources: [
      { provider: 'ACF · Part 1', label: 'Order of operations · the closed loop', role: 'verifies-concept', url: '/part-1-foundation' },
      { provider: 'ACF · Part 6', label: 'CIS governance and tripwires', role: 'verifies-concept', url: '/part-6-convexity-framework-integrity-scoring' },
    ],
    explainerHeadline: 'Structure flows from a thesis and is governed by tripwires.',
    explainerBody: 'A macro thesis defines exposure. Exposure creates fragility. Tripwires monitor that fragility and gate the response: watch, hedge, trim, or redeploy. The output feeds back into the thesis, so the portfolio adapts instead of drifting.',
    explainerConcept: 'Closed-loop system',
    concepts: [{ label: 'Tripwires', link: '/part-5-portfolio-construction-position-management' }, { label: 'CIS governance', link: '/part-6-convexity-framework-integrity-scoring' }],
    layout: 'loop',
    ariaSummary: 'A four-stage governed loop: macro thesis, portfolio exposure, fragility, and tripwires, connected clockwise with the output feeding back into the thesis.',
    loop: {
      centerLabel: 'governed loop',
      nodes: [
        { id: 'thesis', label: 'Macro thesis', sub: 'defines exposure' },
        { id: 'portfolio', label: 'Portfolio', sub: 'expresses the thesis' },
        { id: 'risk', label: 'Fragility', sub: 'exposure creates risk' },
        { id: 'tripwire', label: 'Tripwires', sub: 'govern the response' },
      ],
    },
    primaryKey: 'thesis',
    hoverTargets: [
      { id: 'thesis', kind: 'node', label: 'Macro thesis', name: 'Macro thesis', why: 'The regime read that determines what to own. Everything downstream inherits its conviction.', claim: 'Structure starts with a thesis.', concept: 'Macro thesis', link: '/part-2-lineage-macro-thesis' },
      { id: 'portfolio', kind: 'node', label: 'Portfolio', name: 'Portfolio exposure', why: 'The thesis expressed as carry posture and position sizing across wrappers.', claim: 'Exposure is the thesis made real.', concept: 'Carry posture', link: '/part-5-portfolio-construction-position-management' },
      { id: 'risk', kind: 'node', label: 'Fragility', name: 'Fragility', why: 'Every exposure carries failure modes. Naming them is what makes them monitorable.', claim: 'Risk is structural, so make it visible.', concept: 'Fragility', link: '/part-1-foundation' },
      { id: 'tripwire', kind: 'node', label: 'Tripwires', name: 'Tripwires', why: 'Automated triggers that gate the response — watch, hedge, trim, redeploy — and feed back into the thesis.', claim: 'Behaviour is governed, not improvised.', concept: 'Tripwires', link: '/part-6-convexity-framework-integrity-scoring' },
    ],
    mobileTapTargets: ['thesis', 'portfolio', 'risk', 'tripwire'],
    implementationNotes: 'Bespoke loop layout with brush-arrow connectors. Conceptual diagram; copy is final-ish, geometry open to design review.',
  },

  /* ── PART 1 FRAMEWORK ──────────────────────────────────────────────────── */
  {
    chartId: 'p1-hedge-broke', idx: '01', group: 'part-1', intendedPlacement: 'part-1',
    status: 'implemented', wiredPublic: false,
    title: 'When 60/40 stopped cushioning', setupLine: 'Indexed total return through an inflation shock: stocks, bonds, and the 60/40 blend',
    claimLabel: 'DIVERSIFICATION · FRAGILITY',
    frameworkClaim: 'Stocks and bonds are not always true diversifiers.',
    readerTakeaway: 'When inflation drives the regime, the hedge can fall with the risk.',
    chartType: 'Indexed-return stress chart, 3 series (stocks, bonds, 60/40).',
    visualDataMode: 'representative',
    disclosure: DISCLOSURE.representative, footerCta: 'View sources',
    historicalFooter: 'Source · FRED · SP500TR + Bloomberg US Agg · monthly · 2020 to 2024 · indexed at shock onset',
    sources: [
      { provider: 'FRED', seriesId: 'SP500TR', label: 'S&P 500 total return', role: 'target-source', dateRange: '2020 to 2024', frequency: 'Monthly', transform: 'Indexed to 100 at shock onset', url: 'https://fred.stlouisfed.org/series/SP500TR' },
      { provider: 'FRED', seriesId: 'BAMLCC0A0CMTRIV', label: 'Bloomberg US Aggregate total return (ICE proxy)', role: 'target-source', dateRange: '2020 to 2024', frequency: 'Monthly', transform: 'Indexed to 100 at shock onset', url: 'https://fred.stlouisfed.org/series/BAMLCC0A0CMTRIV' },
      { provider: 'Author calculation', label: '60/40 blend, monthly rebalance', role: 'methodology', transform: '0.6 × equity + 0.4 × aggregate' },
    ],
    explainerHeadline: 'The hedge can fail with the risk.',
    explainerBody: 'Stocks and bonds are not always a true hedge. When inflation drives both sides of the book down together, the old 60/40 cushion can thin out at the exact moment you are counting on it.',
    explainerConcept: 'Correlation regime',
    concepts: [{ label: 'Fragility', link: '#manifesto' }, { label: 'Correlation regime', link: '/part-2-lineage-macro-thesis' }, { label: 'Part 6 CIS', link: '/part-6-convexity-framework-integrity-scoring' }],
    layout: 'single',
    ariaSummary: 'Line chart of indexed total return through an inflation shock. Stocks fall and recover; bonds, the supposed hedge, fall with stocks through the shock window; the 60/40 blend thins to its flagged drawdown rather than cushioning.',
    domain: { xMin: 0, xMax: 100, yMin: 68, yMax: 104 }, yUnit: 'idx',
    xTicks: [{ v: 0, label: 'shock −1' }, { v: 42, label: 'shock' }, { v: 100, label: 'recovery' }],
    yTicks: [{ v: 70 }, { v: 80 }, { v: 90 }, { v: 100 }],
    series: [
      { key: 's', tier: 'secondary', label: 'Stocks', labelDy: 16, pts: hedge.stocks },
      { key: 'b', tier: 'tertiary', label: 'Bonds', labelDy: -4, pts: hedge.bonds },
      { key: 'p', tier: 'primary', label: '60 / 40', pts: hedge.p6040 },
    ],
    bands: [{ id: 'band0', kind: 'shock', x0: 28, x1: 64, render: 'pressureField', seed: 41, intensity: 0.78, asymmetric: 0.16, label: 'inflation shock · pressure enters the system', labelAnchor: 'start' }],
    guides: [{ id: 'base', y: 100, kind: 'base', label: 'base = 100' }],
    markers: [{ id: 'marker0', type: 'enso', x: 42, y: R(valueAt(hedge.bonds, 42)), r: 13, label: 'hedge fails · bonds fall with stocks', labelAnchor: 'end', labelDy: -20 }],
    levels: [{ id: 'invalidation', y: 84, kind: 'charcoal', label: 'drawdown the framework flags' }],
    primaryKey: 'p',
    hoverTargets: [
      { id: 'band0', kind: 'band', label: 'Inflation-shock window', name: 'Inflation-shock window', why: 'Context brushed behind the data. It frames why both legs fell together.', claim: 'Locates the failure in a regime, not an accident.', concept: 'Macro regime', link: '/part-2-lineage-macro-thesis' },
      { id: 'marker0', kind: 'marker', label: 'Hedge-failure inflection', name: 'Hedge-failure inflection', why: 'The exact mechanism of 60/40 fragility: the hedge correlating to the risk it was meant to offset.', claim: 'Identifies the tripwire.', concept: 'Tripwire', link: '/part-5-portfolio-construction-position-management' },
      { id: 'b', kind: 'series', seriesKey: 'b', label: 'Bonds', name: 'Bonds', why: 'The supposed hedge. In this regime it fell alongside stocks instead of offsetting them.', claim: 'The diversifier stopped diversifying.', concept: 'Correlation regime', link: '/part-2-lineage-macro-thesis' },
      { id: 's', kind: 'series', seriesKey: 's', label: 'Stocks', name: 'Stocks', why: 'The risk asset, expected to fall in a shock. No surprise here.', claim: 'Baseline for the drawdown.', concept: 'Risk asset', link: '/part-2-lineage-macro-thesis' },
      { id: 'p', kind: 'series', seriesKey: 'p', label: '60 / 40 blend', name: '60 / 40 blend', why: 'This is the portfolio most investors actually hold. Its drawdown is the lived experience of the regime.', claim: 'Proves the “balanced” cushion thinned.', concept: 'Fragility', link: '/part-6-convexity-framework-integrity-scoring' },
      { id: 'invalidation', kind: 'level', label: 'Flagged drawdown', name: 'Flagged drawdown', why: 'Beyond this line, the balanced label no longer describes the risk being run.', claim: 'Turns a soft worry into a sober threshold.', concept: 'Invalidation', link: '/part-6-convexity-framework-integrity-scoring' },
    ],
    mobileTapTargets: ['band0', 'marker0', 'b', 'p', 'invalidation'],
    implementationNotes: 'Canonical Part 1 hero. Handoff-only for now; unwired from the public page pending explicit placement. Production swaps primary index series behind this spec without touching the engine.',
  },

  {
    chartId: 'p1-correlation', idx: '02', group: 'part-1', intendedPlacement: 'part-1',
    status: 'implemented', wiredPublic: false,
    title: 'The correlation regime changed', setupLine: 'Rolling 24-month stock–bond correlation across an inflation-shock window',
    claimLabel: 'CORRELATION · REGIME',
    frameworkClaim: 'Stock–bond correlation changes when inflation becomes the dominant stress.',
    readerTakeaway: 'The diversifier did not disappear. The regime that produced it did.',
    chartType: 'Rolling 24-month stock–bond correlation with a non-rectangular inflation-shock background.',
    visualDataMode: 'representative',
    disclosure: DISCLOSURE.representative, footerCta: 'View sources',
    historicalFooter: 'Source · FRED · SP500TR + Bloomberg US Agg · monthly returns · 2014 to 2024 · 24-month rolling Pearson',
    sources: [
      { provider: 'FRED', seriesId: 'SP500TR', label: 'S&P 500 total return', role: 'target-source', dateRange: '2014 to 2024', frequency: 'Monthly', url: 'https://fred.stlouisfed.org/series/SP500TR' },
      { provider: 'FRED', seriesId: 'BAMLCC0A0CMTRIV', label: 'Bloomberg US Aggregate total return (ICE proxy)', role: 'target-source', dateRange: '2014 to 2024', frequency: 'Monthly', url: 'https://fred.stlouisfed.org/series/BAMLCC0A0CMTRIV' },
      { provider: 'Author calculation', label: 'Rolling 24-month Pearson correlation', role: 'methodology', transform: 'Pearson ρ of monthly returns, 24-month window' },
    ],
    explainerHeadline: 'When inflation runs the regime, correlations flip.',
    explainerBody: 'Stock–bond correlation was deeply negative for two decades. When inflation became the dominant stress, the correlation flipped positive — and the diversification both sides relied on quietly stopped working together.',
    explainerConcept: 'Macro regime',
    concepts: [{ label: '60/40 failure', link: '#manifesto' }, { label: 'Correlation regime', link: '/part-2-lineage-macro-thesis' }, { label: 'Fragility', link: '/part-6-convexity-framework-integrity-scoring' }],
    layout: 'single',
    ariaSummary: 'Line chart of rolling 24-month stock–bond correlation. The correlation sits deeply negative through the low-inflation regime, then climbs through zero inside a feathered inflation-shock pressure field and settles positive in the high-inflation regime.',
    domain: { xMin: 0, xMax: 132, yMin: -0.65, yMax: 0.65 }, yUnit: 'ρ',
    xTicks: [{ v: 0, label: 'low-inflation regime' }, { v: 132, label: 'high-inflation regime' }],
    yTicks: [{ v: -0.5, label: '−0.5' }, { v: 0, label: '0' }, { v: 0.5, label: '+0.5' }],
    series: [{ key: 'c', tier: 'primary', label: 'ρ', pts: corr.pts }],
    bands: [{ id: 'band0', kind: 'shock', x0: corr.flipStart, x1: corr.flipEnd, render: 'pressureField', spanScale: 0.95, seed: 41, intensity: 0.78, asymmetric: 0.16, label: 'inflation shock · pressure enters the system', labelAnchor: 'peak' }],
    guides: [{ id: 'zero', y: 0, kind: 'zero', label: 'zero correlation' }],
    markers: [{ id: 'marker0', type: 'enso', x: corr.cross.x, y: corr.cross.y, r: 13, label: 'correlation regime flips', labelAnchor: 'end', labelDy: -28 }],
    levels: [],
    primaryKey: 'c',
    hoverTargets: [
      { id: 'band0', kind: 'band', label: 'Inflation-shock pressure field', name: 'Inflation-shock pressure field', why: 'A rendering treatment, not a date range. It marks where inflation became the dominant stress; it never widens or narrows the real window.', claim: 'The regime, not an accident, flipped the sign.', concept: 'Macro regime', link: '/part-2-lineage-macro-thesis' },
      { id: 'marker0', kind: 'marker', label: 'Correlation regime flips', name: 'Correlation regime flips', why: 'The zero-crossing: the point the hedge inverted from offsetting risk to amplifying it.', claim: 'The mechanism that made 60/40 work inverted.', concept: 'Correlation regime', link: '/part-2-lineage-macro-thesis' },
      { id: 'c', kind: 'series', seriesKey: 'c', label: 'Stock–bond ρ', name: 'Stock–bond ρ', why: 'Two decades negative, then sticky-positive. The diversifier did not vanish; the regime that produced it changed.', claim: 'Correlation is regime-dependent.', concept: 'Correlation regime', link: '/part-2-lineage-macro-thesis' },
    ],
    mobileTapTargets: ['band0', 'marker0', 'c'],
    implementationNotes: 'Handoff-only for now; unwired from the public page pending explicit placement. Pressure field is bespoke geometry (brush.pressureField) — never a rectangle, never alters the true stress window.',
  },

  {
    chartId: 'p1-cpi-assets', idx: '03', group: 'part-1', intendedPlacement: 'part-1',
    status: 'implemented', wiredPublic: false,
    title: 'Inflation was bigger than CPI', setupLine: 'CPI, housing, and a broad-asset proxy, each indexed to 100',
    claimLabel: 'INFLATION · MEASUREMENT',
    frameworkClaim: 'CPI alone does not capture the full inflation story.',
    readerTakeaway: 'Consumer prices roughly doubled. The assets that store capital did far more.',
    chartType: 'Three normalized index lines with a gap area between assets and CPI.',
    visualDataMode: 'representative',
    disclosure: DISCLOSURE.representative, footerCta: 'View sources',
    historicalFooter: 'Source · BLS · CPIAUCSL + S&P · CSUSHPISA + author broad-asset blend · monthly · 2000 to 2024 · indexed to 100',
    sources: [
      { provider: 'FRED (BLS)', seriesId: 'CPIAUCSL', label: 'CPI-U, all items', role: 'target-source', dateRange: '2000 to 2024', frequency: 'Monthly', transform: 'Indexed to 100', url: 'https://fred.stlouisfed.org/series/CPIAUCSL' },
      { provider: 'FRED (S&P)', seriesId: 'CSUSHPISA', label: 'S&P/Case-Shiller US National Home Price Index', role: 'target-source', dateRange: '2000 to 2024', frequency: 'Monthly', transform: 'Indexed to 100', url: 'https://fred.stlouisfed.org/series/CSUSHPISA' },
      { provider: 'Author calculation', label: 'Broad-asset blend (equity + housing + gold)', role: 'methodology', transform: 'Equal-weighted, indexed to 100' },
    ],
    explainerHeadline: 'The CPI tells one story; capital saw another.',
    explainerBody: 'Consumer prices roughly doubled over the window. Housing tripled. Broad assets did more. The inflation that matters for whether capital survives was never in the CPI print, and that gap is the whole reason the framework prices inflation in real-asset terms.',
    explainerConcept: 'Survivable compounding',
    concepts: [{ label: 'Survivable compounding', link: '/part-1-foundation' }, { label: 'Wrapper edge', link: '/part-4-tax-architecture-roc-strategy' }, { label: 'Macro thesis', link: '/part-2-lineage-macro-thesis' }],
    layout: 'single',
    ariaSummary: 'Three index lines based at 100. CPI rises gently; housing roughly triples; a broad-asset proxy rises most. A shaded gap between the broad-asset line and CPI is labelled the inflation the CPI misses.',
    domain: { xMin: 0, xMax: 24, yMin: 90, yMax: 470 }, yUnit: 'idx',
    xTicks: [{ v: 0, label: 'yr 0' }, { v: 12, label: 'yr 12' }, { v: 24, label: 'yr 24' }],
    yTicks: [{ v: 100, label: '100' }, { v: 200 }, { v: 300 }, { v: 400 }],
    series: [
      { key: 'cpi', tier: 'secondary', label: 'CPI', pts: cpiAssets.cpi, labelDy: 4 },
      { key: 'housing', tier: 'tertiary', label: 'Housing', pts: cpiAssets.housing, labelDy: 2 },
      { key: 'assets', tier: 'primary', label: 'Broad assets', pts: cpiAssets.assets },
    ],
    areas: [{ id: 'gap', topKey: 'assets', botKey: 'cpi', kind: 'gap', xFrom: 9, label: 'inflation the CPI misses' }],
    guides: [{ id: 'base', y: 100, kind: 'base', label: 'base = 100' }],
    markers: [],
    levels: [],
    notes: [],
    primaryKey: 'assets',
    hoverTargets: [
      { id: 'assets', kind: 'series', seriesKey: 'assets', label: 'Broad assets', name: 'Broad-asset proxy', why: 'Equity, housing, and gold together. This is what capital actually had to outrun, and it left CPI far behind.', claim: 'Asset inflation is the real benchmark.', concept: 'Survivable compounding', link: '/part-1-foundation' },
      { id: 'housing', kind: 'series', seriesKey: 'housing', label: 'Housing', name: 'Housing', why: 'Roughly tripled over the window, dip and all. The largest real asset most households hold.', claim: 'Even housing alone outran CPI.', concept: 'Real assets', link: '/part-2-lineage-macro-thesis' },
      { id: 'cpi', kind: 'series', seriesKey: 'cpi', label: 'CPI', name: 'CPI-U', why: 'The official print. It roughly doubled, which sounds large until you compare it to what stores of capital did.', claim: 'CPI understates the inflation that matters.', concept: 'Macro thesis', link: '/part-2-lineage-macro-thesis' },
    ],
    mobileTapTargets: ['assets', 'housing', 'cpi'],
    implementationNotes: 'Three-line composition; direct end-labels, no inline legend. The gap area between assets and CPI is the visual claim. Broad-asset blend is author calculation, disclosed.',
  },

  {
    chartId: 'p1-policy-constraint', idx: '04', group: 'part-1', intendedPlacement: 'part-1',
    status: 'implemented', wiredPublic: false,
    title: 'Policy is constrained by debt and interest burden', setupLine: 'Federal debt and net interest, both as a share of GDP, on a shared timeline',
    claimLabel: 'POLICY · CONSTRAINT',
    frameworkClaim: 'Debt and interest burden reduce policy freedom.',
    readerTakeaway: 'For decades, debt rose while falling rates hid the cost. The cost is no longer hidden.',
    chartType: 'Stacked dual-panel chart, shared timeline. Top: debt/GDP. Bottom: net interest/GDP.',
    visualDataMode: 'representative',
    disclosure: DISCLOSURE.representative, footerCta: 'View sources',
    historicalFooter: 'Source · FRED · GFDEGDQ188S + BEA net interest / GDP · annual · 1980 to 2024 · share of GDP',
    sources: [
      { provider: 'FRED', seriesId: 'GFDEGDQ188S', label: 'Federal debt held by the public / GDP', role: 'target-source', dateRange: '1980 to 2024', frequency: 'Annual', url: 'https://fred.stlouisfed.org/series/GFDEGDQ188S' },
      { provider: 'BEA (via FRED)', seriesId: 'A091RC1Q027SBEA', label: 'Federal net interest outlays', role: 'target-source', dateRange: '1980 to 2024', frequency: 'Annual', transform: 'Divided by GDP', url: 'https://fred.stlouisfed.org/series/A091RC1Q027SBEA' },
      { provider: 'FRED', seriesId: 'GDP', label: 'Gross domestic product (denominator)', role: 'target-source', url: 'https://fred.stlouisfed.org/series/GDP' },
    ],
    explainerHeadline: 'The cost of debt stopped being free.',
    explainerBody: 'Debt rose for forty years while rates fell, hiding the burden. As rates normalize, that bill compounds — and the room for fiscal support in the next downturn narrows. Policy freedom is no longer a free option.',
    explainerConcept: 'Policy constraint',
    concepts: [{ label: 'Policy constraint', link: '#manifesto' }, { label: 'Macro thesis', link: '/part-2-lineage-macro-thesis' }, { label: 'Fragility', link: '/part-6-convexity-framework-integrity-scoring' }],
    layout: 'dual',
    ariaSummary: 'Two stacked line charts sharing a 1980-to-2024 timeline. The top panel shows federal debt as a share of GDP rising steeply. The bottom panel shows net interest as a share of GDP easing as rates fall, then inflecting upward past an interest-burden pressure threshold as rates normalize.',
    xDomain: { xMin: 0, xMax: 40 },
    xTicks: [{ v: 0, label: 'yr 0' }, { v: 25, label: 'rates trough' }, { v: 40, label: 'now' }],
    connective: 'as rates normalize, the interest burden accelerates → policy constraint tightens',
    panels: [
      { id: 'debtPanel', label: 'Federal debt / GDP', yUnit: '%', domain: { yMin: 30, yMax: 130 }, yTicks: [{ v: 50 }, { v: 90 }, { v: 120 }], series: [{ key: 'debt', tier: 'reference', label: 'Debt / GDP', pts: fiscal.debt }] },
      { id: 'intPanel', label: 'Net interest / GDP', yUnit: '%', domain: { yMin: 1, yMax: 4.4 }, yTicks: [{ v: 2 }, { v: 3 }, { v: 4 }], series: [{ key: 'int', tier: 'primary', label: 'Net interest / GDP', pts: fiscal.interest }], guides: [{ id: 'threshold', y: 3, kind: 'threshold', dash: true, label: 'interest-burden pressure' }], markers: [{ id: 'burden', type: 'dot', x: 25, y: R(valueAt(fiscal.interest, 25)), r: 3, label: 'burden inflects', labelAnchor: 'middle', labelDy: 20 }] },
    ],
    primaryKey: 'int',
    hoverTargets: [
      { id: 'debt', kind: 'series', panel: 'debtPanel', seriesKey: 'debt', label: 'Debt / GDP', name: 'Federal debt / GDP', why: 'Four decades of accumulation. On its own it looks survivable because the cost of carrying it kept falling.', claim: 'The denominator of the constraint.', concept: 'Policy constraint', link: '#manifesto' },
      { id: 'int', kind: 'series', panel: 'intPanel', seriesKey: 'int', label: 'Net interest / GDP', name: 'Net interest / GDP', why: 'The bill. It eased for decades as rates fell; as rates normalize it compounds and crowds out everything else.', claim: 'The cost of debt stopped being free.', concept: 'Policy constraint', link: '#manifesto' },
      { id: 'threshold', kind: 'level', panel: 'intPanel', label: 'Interest-burden pressure', name: 'Interest-burden pressure', why: 'Past this share of GDP, debt service starts competing directly with the room for fiscal support.', claim: 'A sober threshold, not a forecast.', concept: 'Invalidation', link: '/part-6-convexity-framework-integrity-scoring' },
      { id: 'burden', kind: 'marker', panel: 'intPanel', label: 'Burden inflects', name: 'Burden inflects', why: 'The rate trough. From here, normalizing rates turn a falling burden into a rising one.', claim: 'Identifies where the free option expires.', concept: 'Tripwire', link: '/part-5-portfolio-construction-position-management' },
    ],
    mobileTapTargets: ['debt', 'int', 'threshold', 'burden'],
    implementationNotes: 'Handoff-only for now; unwired from the public page pending explicit placement. Dual-panel = two plots sharing the x-domain, one explainer, one footer. Connective caption composed between panels.',
  },

  {
    chartId: 'p1-sequence-risk', idx: '05', group: 'part-1', intendedPlacement: 'part-1',
    status: 'implemented', wiredPublic: false,
    title: 'Path matters more than the average', setupLine: 'Identical return set, opposite order, $1.0M start, $40k annual withdrawals',
    claimLabel: 'PATH DEPENDENCY · WITHDRAWALS',
    frameworkClaim: 'Same average return, opposite sequence, opposite survival outcome.',
    readerTakeaway: 'Withdrawal-phase capital does not care about the average. It cares about the order.',
    chartType: 'Two-path sequence-of-returns simulation.',
    visualDataMode: 'simulation',
    disclosure: DISCLOSURE.simulation, footerCta: 'View methodology',
    sources: [
      { provider: 'Author simulation', label: 'Identical annual return set, opposite order', role: 'methodology', transform: '30-year horizon, $1.0M start, $40k level withdrawals', notes: 'No real-data transform. Pure simulation; method documented in appendix.' },
    ],
    explainerHeadline: 'Same returns. Opposite outcomes.',
    explainerBody: 'Two paths, identical set of annual returns, opposite order. The good path front-loaded the returns; the bad path absorbed losses while withdrawals continued. Average return was identical. The bad path emptied; the good path lasted. Path is the variable retirement plans assume away.',
    explainerConcept: 'Sequence risk',
    concepts: [{ label: 'Sequence risk', link: '/part-1-foundation' }, { label: 'Survivable compounding', link: '/part-1-foundation' }, { label: 'Withdrawal policy', link: '/part-4-tax-architecture-roc-strategy' }],
    layout: 'single',
    ariaSummary: 'Two portfolio-value paths from a $1M start with level withdrawals. The good sequence front-loads returns and lasts the full 30 years; the bad sequence, the same returns in reverse, draws down through early losses and approaches depletion.',
    domain: { xMin: 0, xMax: 30, yMin: 0, yMax: 1.7 }, yUnit: '$M',
    xTicks: [{ v: 0, label: 'retire' }, { v: 15, label: 'yr 15' }, { v: 30, label: 'yr 30' }],
    yTicks: [{ v: 0.5, label: '$0.5M' }, { v: 1.0, label: '$1.0M' }, { v: 1.5, label: '$1.5M' }],
    series: [
      { key: 'good', tier: 'primary', label: 'Good sequence', pts: sequence.good },
      { key: 'bad', tier: 'stress', label: 'Bad sequence', pts: sequence.bad },
    ],
    guides: [{ id: 'depletion', y: 0.15, kind: 'threshold', dash: true, label: 'depletion risk' }],
    markers: [{ id: 'diverge', type: 'dot', x: sequence.divergeX, y: R(valueAt(sequence.good, sequence.divergeX)), r: 3.2, label: 'same average, order differs', labelAnchor: 'start', labelDy: -14 }],
    notes: [{ x: 24, y: R(valueAt(sequence.bad, 24) + 0.16), text: 'path dependency emerges', anchor: 'middle' }],
    levels: [],
    primaryKey: 'good',
    hoverTargets: [
      { id: 'good', kind: 'series', seriesKey: 'good', label: 'Good sequence', name: 'Good sequence', why: 'Front-loaded returns let withdrawals come out of gains. The base is never gutted, so it compounds and lasts.', claim: 'Order, not average, did the work.', concept: 'Sequence risk', link: '/part-1-foundation' },
      { id: 'bad', kind: 'series', seriesKey: 'bad', label: 'Bad sequence', name: 'Bad sequence', why: 'The same returns in reverse. Early losses plus ongoing withdrawals hollow out the base it can never rebuild.', claim: 'Identical average, opposite survival.', concept: 'Sequence risk', link: '/part-1-foundation' },
      { id: 'depletion', kind: 'level', label: 'Depletion risk', name: 'Depletion risk', why: 'Below this line the portfolio cannot sustain the withdrawal. The bad path approaches it; the good path never does.', claim: 'Survival is a floor, not an average.', concept: 'Withdrawal policy', link: '/part-4-tax-architecture-roc-strategy' },
      { id: 'diverge', kind: 'marker', label: 'Divergence', name: 'Divergence point', why: 'Both paths share the same return set, yet they split here and never reconverge. That gap is pure path dependency.', claim: 'The average hid the risk.', concept: 'Path dependency', link: '/part-1-foundation' },
    ],
    mobileTapTargets: ['diverge', 'good', 'bad', 'depletion'],
    implementationNotes: 'SIMULATION — the honesty footer is non-negotiable. This is the chart most likely to be misread as a backtest. Bad path uses the stress tier (muted red).',
  },

  {
    chartId: 'p1-convexity-survival', idx: '06', group: 'part-1', intendedPlacement: 'part-1',
    status: 'implemented', wiredPublic: false,
    title: 'Convexity requires staying alive', setupLine: 'Cumulative invested versus portfolio value, with drawdown-from-peak shaded',
    claimLabel: 'CONVEXITY · ENDURANCE',
    frameworkClaim: 'Upside only matters if sizing lets you survive the path.',
    readerTakeaway: 'Volatile assets can still compound — through, not around, the drawdown.',
    chartType: 'Invested-vs-value representative path with drawdown shading.',
    visualDataMode: 'representative',
    disclosure: DISCLOSURE.representative, footerCta: 'View sources',
    sources: [
      { provider: 'ACF · Part 3', label: 'Bitcoin convexity and multi-cycle drawdowns', role: 'verifies-concept', url: '/part-3-bitcoin-convexity-backbone' },
      { provider: 'Author calculation', label: 'Constant DCA, no rebalancing, no leverage', role: 'methodology', notes: 'Representative path; production would wire a provider price series (e.g., CoinGecko / Nasdaq Data Link).' },
    ],
    explainerHeadline: 'Compounding happens through the drawdown.',
    explainerBody: 'A constant, disciplined position absorbed two drawdowns over fifty percent and still finished well above the contribution line. Survival, not timing, did the work. The framework treats sizing as the gate that lets convexity actually compound.',
    explainerConcept: 'Position sizing',
    concepts: [{ label: 'Convexity', link: '/part-3-bitcoin-convexity-backbone' }, { label: 'Position sizing', link: '/part-5-portfolio-construction-position-management' }, { label: 'Survivable compounding', link: '/part-1-foundation' }],
    layout: 'single',
    ariaSummary: 'Two lines over ten years: a straight cumulative-invested ramp and a volatile portfolio-value line. The value line suffers two deep drawdowns, shaded from its prior peak, but ends well above the invested line.',
    domain: { xMin: 0, xMax: 10, yMin: 0, yMax: 330 }, yUnit: 'idx',
    xTicks: [{ v: 0, label: 'yr 0' }, { v: 5, label: 'yr 5' }, { v: 10, label: 'yr 10' }],
    yTicks: [{ v: 100 }, { v: 200 }, { v: 300 }],
    series: [
      { key: 'invested', tier: 'reference', label: 'Invested', pts: survival.invested },
      { key: 'value', tier: 'primary', label: 'Portfolio value', pts: survival.value },
    ],
    areas: [{ id: 'drawdown', topKey: 'value', kind: 'peak', label: '' }],
    markers: [
      { id: 'survived', type: 'dot', x: survival.trough.x, y: R(survival.trough.y), r: 3.2, label: 'drawdown survived', labelAnchor: 'start', labelDy: 22 },
      { id: 'endpoint', type: 'dot', x: 10, y: R(valueAt(survival.value, 10)), r: 3.4, label: 'compounds through the cycle', labelAnchor: 'end', labelDy: -14 },
    ],
    notes: [],
    levels: [],
    primaryKey: 'value',
    hoverTargets: [
      { id: 'value', kind: 'series', seriesKey: 'value', label: 'Portfolio value', name: 'Portfolio value', why: 'Volatile and convex. It compounds through the cycle precisely because the position was sized to survive the drawdowns.', claim: 'Survival is the precondition for convexity.', concept: 'Convexity', link: '/part-3-bitcoin-convexity-backbone' },
      { id: 'invested', kind: 'series', seriesKey: 'invested', label: 'Invested', name: 'Cumulative invested', why: 'The disciplined contribution line. Finishing above it is the only thing that matters.', claim: 'The baseline survival must beat.', concept: 'Position sizing', link: '/part-5-portfolio-construction-position-management' },
      { id: 'survived', kind: 'marker', label: 'Drawdown survived', name: 'Drawdown survived', why: 'The deepest peak-to-trough decline the position absorbed without being forced out.', claim: 'Sizing is what made this survivable.', concept: 'Position sizing', link: '/part-5-portfolio-construction-position-management' },
      { id: 'endpoint', kind: 'marker', label: 'Compounds through', name: 'Compounds through the cycle', why: 'Two 50%+ drawdowns later, the value line ends well above contributions. Endurance, not timing, did it.', claim: 'Through the drawdown, not around it.', concept: 'Survivable compounding', link: '/part-1-foundation' },
    ],
    mobileTapTargets: ['value', 'survived', 'endpoint', 'invested'],
    implementationNotes: 'Completes the Part 1 arc. Drawdown-from-peak shaded behind the value line. Representative path; production would wire a provider price series.',
  },
];

export const FRAMEWORK_CHART_ORDER = FRAMEWORK_CHART_SPECS.map((s) => s.chartId);

export function getChartSpec(id) {
  return FRAMEWORK_CHART_SPECS.find((s) => s.chartId === id) || null;
}

// ── handoff grouping ────────────────────────────────────────────────────────
export const HANDOFF_GROUPS = [
  { id: 'signature', label: 'Signature · reusable', blurb: 'The payoff-shape language. Belongs on the landing hero and as the Part 1 opener. These define the visual vocabulary for everything else.' },
  { id: 'docs-landing', label: 'Docs landing page', blurb: 'Conceptual, punchy, visually iconic. Built to communicate the framework at a glance before a reader commits to Part 1.' },
  { id: 'part-1', label: 'Part 1 framework', blurb: 'The locked six-chart inventory that carries the Part 1 argument. The first, second, and fourth are already wired into the live page.' },
];

export function specsByGroup(groupId) {
  return FRAMEWORK_CHART_SPECS.filter((s) => s.group === groupId);
}

// ── footer model (shared by engine + handoff) ───────────────────────────────
export function footerModel(spec) {
  const mode = spec.visualDataMode;
  const marker = mode === 'historical' ? 'square' : mode === 'conceptual' ? 'circle' : 'diamond';
  const statement = mode === 'historical' ? (spec.historicalFooter || spec.disclosure) : spec.disclosure;
  const hasSources = Array.isArray(spec.sources) && spec.sources.length > 0;
  const cta = spec.footerCta || (hasSources ? (mode === 'simulation' ? 'View methodology' : 'View sources') : null);
  return { mode, marker, statement, cta, hasSources };
}

export default FRAMEWORK_CHART_SPECS;
