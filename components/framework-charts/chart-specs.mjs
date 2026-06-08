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
// ENGINE DOCTRINE (vNext) — canonical enums + derive-with-override resolvers
//
// The chart engine is a guided-learning instrument, not a chart builder. These
// enums are the single source of truth (the Node validator imports them), and
// the resolvers let every chart carry consistent doctrine metadata WITHOUT
// hand-editing each spec: a chart may declare `claimStack` / `interaction` /
// `motionProfile` explicitly, otherwise a sane value is derived from its layout.
// Pure ESM (no React) — safe to import from components and from scripts.
// ════════════════════════════════════════════════════════════════════════════

export const DATA_MODES = ['representative', 'historical', 'simulation', 'conceptual'];
export const SOURCE_ROLES = ['verifies-concept', 'backs-series', 'methodology', 'target-source'];
export const LAYOUTS = ['single', 'dual', 'quadrant', 'loop', 'flow', 'systemLoop', 'bridge', 'gate', 'scorecard', 'scenario', 'sequenceRisk', 'heartbeat'];

// Interaction must MATCH the concept (a reveal reveals; a selector changes the path).
export const INTERACTION_TYPES = ['none', 'hover', 'scenario', 'beforeAfterReveal', 'readerContext', 'returnOrder', 'slider'];
export const GESTURES = ['none', 'hover', 'tap', 'drag', 'choose', 'type'];

// Motion follows comprehension — it draws in the order the idea is understood.
export const MOTION_TYPES = ['timeSweep', 'reveal', 'rowSweep', 'scenarioUpdate', 'diagramBuild'];
export const MOTION_DURATIONS = ['calm', 'slow', 'transformational'];

// Per-family motion tempo (ms). The shared time-series sweep (PlotSvg) reads this;
// bespoke renderers carry matching choreography. Governed, not random — but the
// default family (timeSweep) preserves the current values exactly.
export const MOTION_TIMING = {
  timeSweep: { sweepMs: 1900, fastMs: 560, mediumMs: 1100, staggerMs: 140 },
  reveal: { sweepMs: 1100, fastMs: 620, mediumMs: 900, staggerMs: 200 },
  rowSweep: { sweepMs: 1500, fastMs: 480, mediumMs: 900, staggerMs: 90 },
  scenarioUpdate: { sweepMs: 460, fastMs: 300, mediumMs: 460, staggerMs: 0 },
  diagramBuild: { sweepMs: 1400, fastMs: 520, mediumMs: 1000, staggerMs: 160 },
};

// A background is allowed ONLY if it explains a relationship — never decorative.
export const BACKGROUND_ROLES = ['regime', 'pressure', 'relational', 'revealLayer'];

// Teaching arc (story beats) + the chart's experience role. A non-visible
// contract for inventory / README / future motion choreography. 'takeaway' (the
// remembered idea) is carried by readerTakeaway, so default beats stop at
// consequence and never duplicate it.
export const EXPERIENCE_ROLES = ['evidence', 'comparison', 'mechanism', 'conversion', 'reveal', 'matrix', 'diagram'];
export const BEAT_KINDS = ['context', 'mechanism', 'action', 'consequence', 'takeaway'];
export const BEAT_TIMINGS = ['early', 'middle', 'late'];

// Mobile is not "just shrink." Each layout declares how it adapts on touch and
// how much vertical room it needs — a contract for the orchestrator and a mobile
// QA signal in the inventory.
export const MOBILE_INTERACTIONS = ['tap-cycle', 'snap-slider', 'stacked-controls', 'stacked', 'scroll-x', 'simplified'];
export const CHART_HEIGHTS = ['standard', 'tall', 'auto'];

// Reader simulation-context keys. `startingValue` is canonical; `portfolioValue`
// is the legacy alias kept working until the reader-context migration lands.
export const CONTEXT_KEYS = ['startingValue', 'horizon', 'withdrawalRate', 'btcReserveAllocation', 'monthlyDca'];
export const LEGACY_CONTEXT_KEYS = ['portfolioValue'];
export const PERSONAL_KINDS = ['scenario-scale', 'vol-impact', 'sequence-scale'];

// Promissory / forecast language that must never appear in a chart's VISIBLE
// claim copy (disclosure/caution/note legitimately say "not a forecast", so they
// are excluded from the scan). Representative exhibits scale, they do not predict.
export const BANNED_PROMISE_WORDS = ['forecast', 'guaranteed', 'guarantee', 'expected return', 'will outperform', 'risk-free', 'optimized'];

export const HORIZON_BANDS = [
  { id: '10y', label: '10 years', short: '10y' },
  { id: '20y', label: '20 years', short: '20y' },
  { id: '30y', label: '30+ years', short: '30+ yr' },
  { id: 'legacy', label: 'Legacy', short: 'Legacy' },
];

// ── standardized formatting (no cents, no false precision) ────────────────────
export function formatStartingValue(n) {
  if (!isFinite(n) || n <= 0) return '$0';
  const r = n >= 100000 ? Math.round(n / 1000) * 1000 : Math.round(n / 100) * 100;
  return '$' + r.toLocaleString('en-US', { maximumFractionDigits: 0 });
}
export function formatCompactMoney(n) {
  if (!isFinite(n) || n <= 0) return '$0';
  const abs = Math.abs(n);
  if (abs >= 1e6) return '$' + (Math.round(n / 1e5) / 10).toLocaleString('en-US') + 'M';
  if (abs >= 1e4) return '$' + Math.round(n / 1e3) + 'k';
  return '$' + Math.round(n).toLocaleString('en-US');
}
export function formatPercent(x, digits = 0) {
  if (!isFinite(x)) return '0%';
  return `${(x * 100).toFixed(digits).replace(/\.0+$/, '')}%`;
}
export function formatHorizon(id) {
  const b = HORIZON_BANDS.find((h) => h.id === id);
  return b ? b.label : '30+ years';
}
// Read the reader's starting value from either canonical or legacy key.
export function readStartingValue(ctx) {
  if (!ctx) return null;
  const v = isFinite(ctx.startingValue) ? ctx.startingValue : ctx.portfolioValue;
  return isFinite(v) && v > 0 ? v : null;
}

// ── derive-with-override doctrine resolvers ──────────────────────────────────
// Every chart resolves a primaryClaim; explicit spec.claimStack wins.
export function resolveClaimStack(spec) {
  const cs = spec.claimStack || {};
  return {
    primaryClaim: cs.primaryClaim || spec.frameworkClaim || spec.title,
    visualProof: cs.visualProof || spec.chartType || null,
    interactionRole: cs.interactionRole || null,
    readerAction: cs.readerAction || null,
    caution: cs.caution || spec.disclosure || null,
  };
}
// The PRIMARY interaction; explicit spec.interaction wins, else derived.
export function resolveInteraction(spec) {
  if (spec.interaction && spec.interaction.type) return spec.interaction;
  let type = 'hover', gesture = 'hover';
  if (spec.layout === 'scenario') { type = 'scenario'; gesture = 'choose'; }
  else if (spec.layout === 'sequenceRisk') { type = 'returnOrder'; gesture = 'hover'; }
  else if (spec.layout === 'dual' && spec.perspectiveSlider) { type = 'beforeAfterReveal'; gesture = 'drag'; }
  else if (spec.personalization) { type = 'readerContext'; gesture = 'type'; }
  return { type, gesture, conceptMatch: null };
}
export function resolveMotionProfile(spec) {
  if (spec.motionProfile && spec.motionProfile.type) return spec.motionProfile;
  const diagrams = ['loop', 'flow', 'systemLoop', 'bridge', 'gate', 'quadrant'];
  let type = 'timeSweep';
  if (diagrams.includes(spec.layout)) type = 'diagramBuild';
  else if (spec.layout === 'scenario') type = 'scenarioUpdate';
  else if (spec.layout === 'sequenceRisk' || spec.layout === 'scorecard') type = 'rowSweep';
  else if (spec.layout === 'dual' && spec.perspectiveSlider) type = 'reveal';
  return { type, duration: 'calm', relatedElements: null };
}
// Background roles in use; explicit band/area.backgroundRole passes through so a
// stray 'decorative' surfaces to the validator (BACKGROUND_ROLES excludes it).
export function resolveBackgroundRoles(spec) {
  const roles = new Set();
  const scan = (p) => {
    (p.bands || []).forEach((b) => roles.add(b.backgroundRole || (b.render === 'pressureField' ? 'pressure' : 'regime')));
    (p.areas || []).forEach((a) => roles.add(a.backgroundRole || 'regime'));
  };
  if (spec.layout === 'dual') (spec.panels || []).forEach(scan); else scan(spec);
  if (spec.layout === 'heartbeat') roles.add('relational');           // unitCaptureField
  if (spec.layout === 'scenario') roles.add('regime');                // trough/intervention zone
  if (spec.layout === 'dual' && spec.perspectiveSlider) roles.add('revealLayer');
  return [...roles];
}

// experience role: what KIND of learning experience the chart is (complements
// claimStack = what it claims, interaction = how you touch it).
export function resolveExperienceRole(spec) {
  if (spec.experienceRole) return spec.experienceRole;
  const L = spec.layout;
  if (L === 'scenario') return 'comparison';
  if (L === 'sequenceRisk') return 'mechanism';
  if (L === 'heartbeat') return 'conversion';
  if (L === 'dual' && spec.perspectiveSlider) return 'reveal';
  if (L === 'scorecard') return 'matrix';
  if (['loop', 'flow', 'systemLoop', 'bridge', 'gate', 'quadrant'].includes(L)) return 'diagram';
  return 'evidence';
}
// story beats: the comprehension arc the chart should build in. Explicit wins;
// otherwise derived context → mechanism → (action, if interactive) → consequence.
export function resolveStoryBeats(spec) {
  if (Array.isArray(spec.storyBeats) && spec.storyBeats.length) return spec.storyBeats;
  const it = resolveInteraction(spec);
  const interactive = it.type !== 'hover' && it.type !== 'none';
  const beats = [
    { kind: 'context', label: 'Establish the backdrop', timing: 'early' },
    { kind: 'mechanism', label: 'Reveal the mechanism', timing: 'middle' },
  ];
  if (interactive) beats.push({ kind: 'action', label: it.conceptMatch || 'Invite the reader to act', timing: 'middle' });
  beats.push({ kind: 'consequence', label: 'Resolve the takeaway', timing: 'late' });
  return beats;
}

// mobile behavior: how a layout adapts on touch + the vertical room it needs.
// Explicit spec.mobileBehavior wins; otherwise derived per layout.
export function resolveMobileBehavior(spec) {
  if (spec.mobileBehavior) return spec.mobileBehavior;
  const L = spec.layout;
  if (L === 'dual' && spec.perspectiveSlider) return { interaction: 'snap-slider', chartHeight: 'tall', note: 'Snap the reveal to Surface / Split / Hidden cost on release.' };
  if (L === 'scenario') return { interaction: 'stacked-controls', chartHeight: 'tall', note: 'Stack the strategy + shock controls; keep stat read-outs below the chart.' };
  if (L === 'sequenceRisk') return { interaction: 'stacked', chartHeight: 'tall', note: 'Return deck stacks above the paths; keep withdrawal ticks legible.' };
  if (L === 'heartbeat') return { interaction: 'tap-cycle', chartHeight: 'tall', note: 'Unit bars need vertical room — do not shrink too far.' };
  if (L === 'scorecard') return { interaction: 'scroll-x', chartHeight: 'auto', note: 'Matrix is content-sized; keep the asset header legible, horizontal scroll only if unavoidable.' };
  if (['loop', 'flow', 'systemLoop', 'bridge', 'gate', 'quadrant'].includes(L)) return { interaction: 'tap-cycle', chartHeight: 'standard', note: 'Diagram scales; tap nodes to cycle detail.' };
  return { interaction: 'tap-cycle', chartHeight: 'tall', note: 'Tap to cycle elements; keep the thesis line and labels legible.' };
}

// "Try this" cue: a quiet imperative shown ONLY where interaction is central
// (reveal / scenario / return-order / reader-context). Explicit spec.tryThis
// wins ('' opts out); hover-only charts get no cue (the default already teaches).
export function resolveTryThis(spec) {
  if (typeof spec.tryThis === 'string') return spec.tryThis || null;
  const it = resolveInteraction(spec);
  if (it.type === 'beforeAfterReveal') return 'Drag the divider to reveal the hidden cost';
  if (it.type === 'scenario') return 'Switch the shock and watch the control score';
  if (it.type === 'returnOrder') return 'Compare the same return deck in reverse';
  if (it.type === 'readerContext') return 'Enter your starting value above';
  return null;
}

// motion timing for a chart's family (governed tempo; default = timeSweep).
export function resolveMotionTiming(spec) {
  return MOTION_TIMING[resolveMotionProfile(spec).type] || MOTION_TIMING.timeSweep;
}

// ── simulation-context intro (chart-level data introduction) ─────────────────
// Builds the quiet "scaled example" line for a personalized chart. Returns null
// when the chart does not opt in, or when there is no usable starting value.
export function getSimulationIntro(spec, ctx) {
  const p = spec.personalization;
  if (!p) return null;
  const sv = readStartingValue(ctx);
  if (sv == null) return null;
  const start = formatStartingValue(sv);
  const hz = ctx && ctx.horizon ? ` · ${formatHorizon(ctx.horizon)} horizon` : '';
  if (p.kind === 'sequence-scale') {
    const wr = p.withdrawalRate || 0.04;
    return `Representative withdrawal simulation · ${start} start · ${formatStartingValue(sv * wr)}/yr withdrawals${hz}`;
  }
  if (p.kind === 'scenario-scale') {
    return `Representative total-portfolio paths · ${start} start${hz} · not Bitcoin price`;
  }
  if (p.kind === 'vol-impact') {
    const a = p.assume || { alloc: 0.15 };
    return `Portfolio impact example · ${start} start · ${Math.round(a.alloc * 100)}% Bitcoin reserve assumption`;
  }
  return `Scaled example · ${start} starting value${hz}`;
}
export function buildPersonalizedDisclosure(spec) {
  const p = spec.personalization;
  if (!p) return null;
  return p.disclosure || p.note || 'Scaled representative example · not a forecast or recommendation.';
}

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
  // Representative federal debt / GDP, echoing the real contour (≈34% in 1980 →
  // gradual rise → post-2008 steepening → >120%). Sober line, low chop; the
  // under-area reads it as an accumulating liability. NOT exact FRED data.
  const debt = curve(0, 40, n, (t) => 34 + 58 * ss(clamp(t / 0.72, 0, 1)) + 32 * ss(clamp((t - 0.5) / 0.5, 0, 1)), 61, 0.5);
  const interest = curve(0, 40, n, (t) => (t < 0.62 ? 3.2 - 1.6 * ss(clamp(t / 0.62, 0, 1)) : 1.6 + 2.4 * ss(clamp((t - 0.62) / 0.38, 0, 1))), 67, 0.12);
  return { debt, interest };
})();

// Sequence-of-returns (simulation) — ONE shared representative return set, plotted
// in two orders. The portfolio paths are generated FROM these returns so the deck
// and the lines are the same math: v(i+1) = v(i) * (1 + r) − withdrawal.
const sequence = (() => {
  // representative annual-ish returns, % (good order = gains first / losses last)
  const good = [30, 24, 19, 15, 11, 8, 5, 1, -4, -10, -17, -25];
  const bad = [...good].reverse();                       // same set, opposite order
  const N = good.length;
  const start = 1, withdraw = 0.04;                       // normalized: $1 start, 4% withdrawal / period
  const sim = (order) => { const out = [{ x: 0, y: start }]; let v = start; order.forEach((r, i) => { v = Math.max(0, v * (1 + r / 100) - withdraw); out.push({ x: i + 1, y: R(v, 10000) }); }); return out; };
  const goodPath = sim(good), badPath = sim(bad);
  let trough = { x: 0, y: 9 }; badPath.forEach((p) => { if (p.y < trough.y) trough = p; });
  const avgPct = R(good.reduce((a, b) => a + b, 0) / N, 100);
  return { good, bad, N, start, withdraw, goodPath, badPath, goodEnd: goodPath[N].y, badEnd: badPath[N].y, trough, avgPct, depletion: 0.35 };
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

// ── Part 2 — lineage & macro thesis (representative / conceptual) ────────────
const p2Method = (() => {
  const n = 100;
  const thesis = curve(0, 100, n, (t) => 50 + 26 * Math.sin(t * Math.PI * 2.2) + 8 * Math.sin(t * Math.PI * 5), 211, 1.2);
  const method = curve(0, 100, n, () => 55, 213, 1.0);
  return { thesis, method };
})();
const p2Ruin = (() => {
  const n = 110;
  const robust = curve(0, 100, n, (t) => 100 + 6 * Math.sin(t * 16) - 26 * Math.exp(-Math.pow((t - 0.5) / 0.12, 2)), 221, 1.4);
  const fragile = curve(0, 100, n, (t) => Math.max(12, 100 + 6 * Math.sin(t * 16 + 1) - 88 * ss(clamp((t - 0.52) / 0.12, 0, 1))), 223, 1.4);
  const crossX = (fragile.find((p) => p.y < 30) || fragile[fragile.length - 1]).x;
  return { robust, fragile, crossX };
})();
const p2Conviction = (() => {
  const n = 100;
  const disciplined = curve(0, 100, n, (t) => 20 * ss(clamp(t / 0.7, 0, 1)), 231, 0.4);
  const reckless = curve(0, 100, n, (t) => 6 + 42 * Math.pow(t, 1.6), 233, 0.5);
  return { disciplined, reckless };
})();
const p2Time = (() => {
  const n = 140;
  const prudent = curve(0, 70, n, (t) => Math.pow(1.05, 70 * t), 241, 0);
  const convex = curve(0, 70, n, (t) => Math.pow(1.08, 70 * t), 243, 0);
  return { prudent, convex };
})();
const p2Phase = (() => {
  const n = 100;
  const validity = curve(0, 100, n, () => 88, 251, 0.7);
  const sizing = curve(0, 100, n, (t) => 15 + 70 * ss(clamp(t / 0.55, 0, 1)) - 30 * ss(clamp((t - 0.7) / 0.3, 0, 1)), 253, 1.0);
  return { validity, sizing };
})();
const p2Liquidity = (() => {
  const n = 120;
  const liquidity = curve(0, 100, n, (t) => 50 + 14 * Math.sin(t * Math.PI * 2.0), 261, 0.8);
  const asset = curve(0, 100, n, (t) => 55 + 34 * Math.sin(t * Math.PI * 2.0 - 0.5), 263, 2.0);
  return { liquidity, asset };
})();

// ── Part 3 — Bitcoin convexity backbone (representative / conceptual) ─────────
const p3Power = (() => {
  const n = 120;
  const central = curve(0, 100, n, (t) => 3.0 + 2.65 * t, 301, 0); // log10 price, ~$1k → ~$450k
  const upper = central.map((p) => ({ x: p.x, y: R(p.y + 0.55) }));
  const lower = central.map((p) => ({ x: p.x, y: R(p.y - 0.55) }));
  const rng = mulberry32(303);
  const price = central.map((p, i) => {
    const t = i / n;
    let dev = 0.40 * Math.sin(t * Math.PI * 6.2) + 0.15 * Math.sin(t * Math.PI * 12.6);
    dev += 0.30 * Math.exp(-Math.pow((t - 0.34) / 0.028, 2)) + 0.30 * Math.exp(-Math.pow((t - 0.72) / 0.028, 2)); // euphoria
    dev -= 0.34 * Math.exp(-Math.pow((t - 0.52) / 0.03, 2)); // capitulation
    return { x: p.x, y: R(p.y + dev + (rng() - 0.5) * 0.05) };
  });
  let euph = { x: 0, y: 0, d: -9 }, cap = { x: 0, y: 0, d: -9 };
  price.forEach((p, i) => { const a = p.y - upper[i].y; if (a > euph.d) euph = { x: p.x, y: p.y, d: a }; const b = lower[i].y - p.y; if (b > cap.d) cap = { x: p.x, y: p.y, d: b }; });
  return { central, upper, lower, price, euph, cap, last: price[price.length - 1] };
})();
const p3Vol = (() => {
  const n = 120;
  const btc = curve(0, 100, n, (t) => Math.max(18, 40 + 150 * ss(t) + 28 * Math.sin(t * Math.PI * 3.4) - 72 * Math.exp(-Math.pow((t - 0.42) / 0.05, 2)) - 84 * Math.exp(-Math.pow((t - 0.8) / 0.05, 2))), 311, 4);
  const portfolio = curve(0, 100, n, (t) => 100 + 24 * ss(t) + 5 * Math.sin(t * Math.PI * 3.4), 313, 0.8);
  let peak = -9, tr = { x: 0, y: 999, dd: 0 }; btc.forEach((p) => { peak = Math.max(peak, p.y); const d = (peak - p.y) / peak; if (d > tr.dd) tr = { x: p.x, y: p.y, dd: d }; });
  return { btc, portfolio, trough: tr };
})();
const p3Exposure = (() => {
  const n = 120;
  const maxE = curve(0, 100, n, (t) => Math.max(20, 50 + 175 * ss(t) + 32 * Math.sin(t * Math.PI * 3) - 96 * Math.exp(-Math.pow((t - 0.7) / 0.05, 2))), 321, 3);
  const framework = curve(0, 100, n, (t) => 60 + 108 * ss(t) + 12 * Math.sin(t * Math.PI * 3) - 30 * Math.exp(-Math.pow((t - 0.7) / 0.07, 2)), 323, 1.6);
  return { maxE, framework };
})();
const p3Models = (() => {
  const n = 120;
  const center = (t) => 30 + 52 * t;
  const spread = (t) => 22 - 18 * Math.exp(-Math.pow((t - 0.5) / 0.14, 2)) + 9 * ss(clamp((t - 0.72) / 0.28, 0, 1));
  const modelMax = curve(0, 100, n, (t) => center(t) + spread(t), 331, 0);
  const modelMin = curve(0, 100, n, (t) => center(t) - spread(t), 333, 0);
  const price = curve(0, 100, n, (t) => center(t) + 5 * Math.sin(t * Math.PI * 5), 335, 1.4);
  return { modelMax, modelMin, price };
})();
const p3Heartbeat = (() => {
  // Representative BTC PRICE / VALUATION INDEX over one cycle — starts mid, dips
  // into an undervalued trough, recovers toward fair value, runs extended. Sober
  // (gentle chop): a price index, not a frantic line. NOT historical, NOT a forecast.
  const n = 132;
  const trend = (t) => 0.5 - 0.34 * Math.exp(-Math.pow((t - 0.17) / 0.12, 2)) + 1.18 * ss(clamp((t - 0.3) / 0.7, 0, 1));
  const chop = (t) => 0.05 * Math.sin(t * Math.PI * 6) + 0.03 * Math.sin(t * Math.PI * 13 + 1);
  const priceFn = (t) => clamp(trend(t) + chop(t), 0.12, 1.95);
  const price = curve(0, 100, n, (t) => priceFn(t), 371, 0.008);
  // The mechanism, made explicit: units received = fixed DCA dollars / price.
  // A constant dollar amount buys MORE units when price is lower. The framework
  // leans in (×1.7) only in the confirmed undervalued window, returns to baseline
  // at fair value, and slows new buying (×0.5) when extended — it never sells.
  const DCA = 1;                                          // representative fixed dollar amount / interval
  const bars = 26;
  const pulses = [];
  let baseCum = 0, fwCum = 0;
  for (let i = 0; i < bars; i++) {
    const t = (i + 0.5) / bars;
    const p = priceFn(t);
    const baseUnits = DCA / p;                            // units = dollars / price
    const m = t < 0.34 ? 1.7 : t > 0.7 ? 0.5 : 1.0;       // framework accumulation-pacing multiplier
    const fwUnits = (DCA * m) / p;
    baseCum += baseUnits; fwCum += fwUnits;
    pulses.push({ x: R(t * 100), base: R(baseUnits), fw: R(fwUnits), boost: m > 1, slow: m < 1 });
  }
  const maxUnit = Math.max(...pulses.map((q) => q.fw));
  const pmin = Math.min(...price.map((p) => p.y)), pmax = Math.max(...price.map((p) => p.y));
  return { price, pulses, maxUnit, pmin, pmax, windowX0: 2, windowX1: 40, troughX: 17, fwPct: Math.round((fwCum / baseCum - 1) * 100) };
})();
const p3Reserve = (() => {
  const n = 100;
  const reserve = curve(0, 20, n, (t) => 12 + 30 * ss(t), 351, 0.5);
  return { reserve };
})();
const p3Scenario = (() => {
  const n = 96;
  const T = (i) => i / n;
  // one shared market path: a long bull, a deep cycle drawdown, then recovery.
  const market = [];
  for (let i = 0; i <= n; i++) {
    const t = T(i);
    const up = 100 + 175 * ss(clamp(t / 0.52, 0, 1));
    const taper = -50 * ss(clamp((t - 0.52) / 0.2, 0, 1));
    const crash = -150 * Math.exp(-Math.pow((t - 0.62) / 0.06, 2));
    const rec = 120 * ss(clamp((t - 0.7) / 0.3, 0, 1));
    market.push(Math.max(45, up + taper + crash + rec));
  }
  let troughI = 0; for (let i = 1; i <= n; i++) if (market[i] < market[troughI]) troughI = i;
  const stable = (t) => 100 + 30 * t;                       // diversified, income-backed sleeve
  // w = share that tracks Bitcoin; dp = dry powder (capacity to act); income = wage buffer.
  // More control trades clean-path upside for a smaller drawdown and more capacity.
  const presets = {
    max: { w: 1.0, dp: 0.0, income: false },                // 100% BTC
    reserve: { w: 0.20, dp: 0.25, income: true },           // framework reserve
    stress: { w: 0.13, dp: 0.50, income: true },            // reserve + deliberate dry powder
  };
  const build = (pk, shock) => {
    const p = presets[pk];
    const value = [];
    for (let i = 0; i <= n; i++) {
      const t = T(i);
      let v = p.w * market[i] + (1 - p.w) * stable(t);
      if (i >= troughI) {
        // job loss: no wage buffer + no dry powder forces a sale into the bottom.
        if (shock === 'jobloss') v -= (!p.income && p.dp < 0.2) ? 0.30 * market[i] : 2;
        // deploy: dry powder buys the trough and rides the recovery.
        else if (shock === 'deploy') v += p.dp * 0.95 * Math.max(0, market[i] - market[troughI]);
      }
      value.push({ x: R(t * 100), y: R(Math.max(20, v)) });
    }
    let peak = -9, maxDD = 0; value.forEach((q) => { peak = Math.max(peak, q.y); maxDD = Math.max(maxDD, (peak - q.y) / peak); });
    const forced = shock === 'jobloss' && !p.income && p.dp < 0.2;
    const deployed = shock === 'deploy' && p.dp > 0;
    const dryPowder = Math.round(p.dp * 100);
    const integrity = forced ? 62 : 100;
    // control = operational control / balance; deploying dry powder deliberately is
    // the point, so it is NOT penalised here. Reserves stay strong, max stays fragile.
    const control = Math.max(6, Math.min(100, Math.round(100 - maxDD * 72 + dryPowder * 0.32 - (forced ? 34 : 0) - (p.income ? 0 : 8))));
    // decision strain: deep drawdowns, forced sales, and no income buffer raise the
    // behavioural load where panic-selling happens; capacity and income lower it.
    // Acting at the trough takes some nerve — a modest, non-punishing bump.
    const strainN = maxDD * 100 * 0.85 + (forced ? 40 : 0) + (p.income ? 0 : 16) + (shock === 'jobloss' ? 18 : 0) + (deployed ? 20 : 0) - dryPowder * 0.45;
    const strain = strainN >= 95 ? 'Extreme' : strainN >= 55 ? 'High' : strainN >= 26 ? 'Moderate' : 'Low';
    return { value, stats: { terminal: Math.round(value[value.length - 1].y), maxDD: Math.round(maxDD * 100), dryPowder, forced, deployed, integrity, control, strain } };
  };
  const variants = {};
  let yMax = 0, yMin = 1e9;
  ['max', 'reserve', 'stress'].forEach((pk) => ['none', 'jobloss', 'deploy'].forEach((sh) => {
    const r = build(pk, sh); variants[`${pk}|${sh}`] = r; r.value.forEach((q) => { yMax = Math.max(yMax, q.y); yMin = Math.min(yMin, q.y); });
  }));
  return {
    variants, troughX: R(T(troughI) * 100),
    peakX: R(T(market.indexOf(Math.max(...market.slice(0, troughI)))) * 100),
    yMax: Math.ceil((yMax + 12) / 10) * 10,
    yMin: Math.max(0, Math.floor((yMin - 14) / 10) * 10),
  };
})();

// ════════════════════════════════════════════════════════════════════════════
// SPEC REGISTRY
// ════════════════════════════════════════════════════════════════════════════
export const FRAMEWORK_CHART_SPECS = [

  /* ── SIGNATURE / REUSABLE ──────────────────────────────────────────────── */
  {
    chartId: 'sig-payoff', idx: 'S1', group: 'signature', intendedPlacement: 'both',
    status: 'needs-design-review', wiredPublic: false,
    title: 'Shape the Payoff', setupLine:'The payoff shape the whole framework is built to produce',
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
    title: 'Bend the Tail', setupLine:'ACF reshapes the distribution of outcomes, it does not just chase higher returns',
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
      { key: 'symmetric', tier: 'reference', label: 'Symmetric', pts: shape.symmetric, labelDy: 16 },
      { key: 'shaped', tier: 'primary', label: 'ACF shaped', pts: shape.shaped, labelDy: -10 },
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
    claimStack: {
      primaryClaim: 'ACF waits for setups where downside is defined and upside can accelerate',
      visualProof: 'A representative path: patient compression, then an accelerating release past a defined-risk marker',
      interactionRole: 'Hover the compression field, confirmation, and release to read the setup',
      readerAction: 'See where convexity actually pays',
      caution: 'Representative exhibit, not historical data',
    },
    status: 'implemented', wiredPublic: false,
    title: 'The Window Opens', setupLine:'Compression, then confirmation, then asymmetric release',
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
    title: 'Capital Has Weather', setupLine:'Same assets, different regime, different behaviour',
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
      { id: 'wp5', kind: 'waypoint', label: 'Now', persistentLabel: true, name: 'Where capital sits now', why: 'The framework keeps re-reading position on this map rather than assuming last season persists.', claim: 'Position is a live reading, not a constant.', concept: 'Adaptation', link: '/part-2-lineage-macro-thesis' },
    ],
    mobileTapTargets: ['wp1', 'wp2', 'wp3', 'wp4', 'wp5'],
    implementationNotes: 'Bespoke quadrant layout. Waypoint positions and regime copy are representative; marketing should validate the path narrative.',
  },

  {
    chartId: 'dl-tripwire-loop', idx: 'L3', group: 'docs-landing', intendedPlacement: 'docs-landing',
    status: 'needs-design-review', wiredPublic: false,
    title: 'Govern the Thesis', setupLine:'Thesis creates exposure · exposure creates risk · tripwires govern behaviour',
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
    layout: 'systemLoop',
    ariaSummary: 'A self-reinforcing governed ring — macro thesis, portfolio exposure, fragility, tripwires — with clockwise flow and a quiet cue that tripwires can force a reversal back into the thesis.',
    systemLoop: {
      centerLabel: 'governed loop',
      reversalLabel: 'tripwires can reverse it',
      governorId: 'tripwire',
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
    claimStack: {
      primaryClaim: 'Stocks and bonds are not always true diversifiers',
      visualProof: 'Stocks, bonds, and the 60/40 blend indexed together through an inflation shock — bonds fall with stocks',
      interactionRole: 'Hover each line and the shock band to watch the hedge fail',
      readerAction: 'Watch the hedge fall with the risk',
      caution: 'Representative indexed paths, not historical data',
    },
    status: 'implemented', wiredPublic: false,
    title: 'The Hedge Broke', setupLine:'Indexed total return through an inflation shock: stocks, bonds, and the 60/40 blend',
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
    claimStack: {
      primaryClaim: 'Stock–bond correlation changes when inflation becomes the dominant stress',
      visualProof: 'A rolling correlation line crossing from negative to positive through an inflation-shock field',
      interactionRole: 'Hover the line and the shock field to see the regime flip',
      readerAction: 'Watch the diversifier sign flip',
      caution: 'Representative rolling correlation, not historical data',
    },
    status: 'implemented', wiredPublic: false,
    title: 'Correlation Turns', setupLine:'Rolling 24-month stock–bond correlation across an inflation-shock window',
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
    experienceRole: 'comparison',
    claimStack: {
      primaryClaim: 'CPI alone does not capture the full inflation story',
      visualProof: 'Assets vs CPI as indexed lines; the widening gap between them is the claim',
      interactionRole: 'Hover the asset, housing, and CPI lines to compare',
      readerAction: 'See how far assets outran CPI',
      caution: 'Representative indexed series, not historical data',
    },
    status: 'implemented', wiredPublic: false,
    title: 'Inflation Was Bigger', setupLine:'CPI, housing, and a broad-asset proxy, each indexed to 100',
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
    experienceRole: 'reveal',
    storyBeats: [
      { kind: 'context', label: 'The debt/GDP backdrop rises in both states', timing: 'early' },
      { kind: 'mechanism', label: 'The interest cost sits hidden beneath the same backdrop', timing: 'middle' },
      { kind: 'action', label: 'Drag the divider to wipe the surface and expose the cost', timing: 'middle' },
      { kind: 'consequence', label: 'The bill surfaces; policy room narrows', timing: 'late' },
    ],
    claimStack: {
      primaryClaim: 'Debt rose for decades while falling rates hid the cost',
      visualProof: 'The same debt/GDP backdrop in both states; the interest-burden cost is revealed beneath it',
      interactionRole: 'Drag the divider to pull back the calm surface and expose the hidden cost',
      readerAction: 'Reveal what the surface was hiding',
      caution: 'Representative exhibit (FRED target series), not exact historical data',
    },
    interaction: { type: 'beforeAfterReveal', gesture: 'drag', conceptMatch: 'Dragging spatially pulls back the surface to reveal the hidden interest cost beneath the same debt backdrop' },
    beforeAfterLabels: { before: 'Surface', after: 'Hidden cost' }, revealDefault: 0.5,
    motionProfile: { type: 'reveal', duration: 'calm', relatedElements: [['debt', 'int']] },
    status: 'implemented', wiredPublic: false,
    title: 'The Bill Came Due', setupLine:'Debt rose for decades. The cost returned when rates normalized.',
    claimLabel: 'POLICY · CONSTRAINT',
    frameworkClaim: 'Debt and interest burden reduce policy freedom.',
    readerTakeaway: 'For decades, debt rose while falling rates hid the cost. The cost is no longer hidden.',
    chartType: 'Before/after clipped reveal on one canvas: a shared debt/GDP backdrop; dragging a divider wipes the calm surface to expose the net-interest cost beneath.',
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
    layout: 'dual', perspectiveSlider: true, perspectiveDefault: 0.25,
    perspectiveCopy: { surface: 'rates fell for decades and hid the cost', hidden: 'the cost returns as rates normalize' },
    ariaSummary: 'A single before/after reveal on a shared 1980-to-2024 timeline. One backdrop — federal debt as a share of GDP, rising steeply past 100 percent with the area beneath it shaded as an accumulating liability — is present in both states. Dragging a vertical divider wipes away the calm surface view, where falling rates kept the interest cost faint, to expose on the same backdrop beneath it the hidden-cost view: net interest as a share of GDP easing as rates fall, troughing at the rate trough, then inflecting upward through an interest-burden threshold into a pressure zone as rates normalize. Surface is on the left, hidden cost on the right; drag the divider, use the arrow keys, or tap to move it.',
    xDomain: { xMin: 0, xMax: 40 },
    xTicks: [{ v: 0, label: '1980' }, { v: 25, label: 'rate trough' }, { v: 40, label: '2024' }],
    connective: 'rates fell for decades and hid the cost',
    panels: [
      { id: 'debtPanel', label: 'Federal debt / GDP · the backdrop', yUnit: '', valueUnit: '% of GDP', domain: { yMin: 30, yMax: 130 }, yTicks: [{ v: 50, label: '50%' }, { v: 90, label: '90%' }, { v: 120, label: '120%' }], series: [{ key: 'debt', tier: 'reference', pts: fiscal.debt }], areas: [{ id: 'debtFill', topKey: 'debt', kind: 'under', tone: 'muted', opacity: 0.12, label: '' }] },
      { id: 'intPanel', label: 'Net interest / GDP · the cost returns', yUnit: '', valueUnit: '% of GDP', domain: { yMin: 1, yMax: 4.4 }, yTicks: [{ v: 2, label: '2%' }, { v: 3, label: '3%' }, { v: 4, label: '4%' }], series: [{ key: 'int', tier: 'primary', pts: fiscal.interest }], guides: [{ id: 'threshold', y: 3, kind: 'threshold', dash: true, label: 'interest-burden pressure' }], bands: [{ id: 'pressure', kind: 'shock', render: 'pressureField', x0: 32, x1: 40, seed: 53, intensity: 0.5, asymmetric: 0.1 }], markers: [{ id: 'burden', type: 'enso', x: 25, y: R(valueAt(fiscal.interest, 25)), r: 11, label: 'burden inflects', labelAnchor: 'middle', labelDy: -16 }] },
    ],
    primaryKey: 'int',
    hoverTargets: [
      { id: 'debt', kind: 'series', panel: 'debtPanel', seriesKey: 'debt', label: 'Debt / GDP', name: 'Federal debt / GDP', why: 'Four decades of accumulation. On its own it looks survivable because the cost of carrying it kept falling.', claim: 'The denominator of the constraint.', concept: 'Policy constraint', link: '#manifesto' },
      { id: 'int', kind: 'series', panel: 'intPanel', seriesKey: 'int', label: 'Net interest / GDP', name: 'Net interest / GDP', why: 'The bill. It eased for decades as rates fell; as rates normalize it compounds and crowds out everything else.', claim: 'The cost of debt stopped being free.', concept: 'Policy constraint', link: '#manifesto' },
      { id: 'threshold', kind: 'level', panel: 'intPanel', label: 'Interest-burden pressure', name: 'Interest-burden pressure', why: 'Past this share of GDP, debt service starts competing directly with the room for fiscal support.', claim: 'A sober threshold, not a forecast.', concept: 'Invalidation', link: '/part-6-convexity-framework-integrity-scoring' },
      { id: 'burden', kind: 'marker', panel: 'intPanel', label: 'Burden inflects', name: 'Burden inflects', why: 'The rate trough. From here, normalizing rates turn a falling burden into a rising one.', claim: 'Identifies where the free option expires.', concept: 'Tripwire', link: '/part-5-portfolio-construction-position-management' },
      { id: 'pressure', kind: 'band', panel: 'intPanel', label: 'Interest-burden pressure', name: 'Pressure zone', why: 'As rates normalize the interest bill rises into this zone, where debt service competes directly with the room for fiscal support.', claim: 'Policy constraint tightens here.', concept: 'Policy constraint', link: '#manifesto' },
    ],
    mobileTapTargets: ['debt', 'int', 'threshold', 'burden', 'pressure'],
    implementationNotes: 'Handoff-only for now; unwired from the public page pending explicit placement. BeforeAfterRevealSvg: ONE canvas, two registers (debt backdrop over net-interest cost), with two full chart STATES layered in the same SVG coordinate space. The surface state (debt prominent, cost faint) is the base; the hidden-cost state (same backdrop + rising interest line, burden inflection, interest-burden threshold, pressure zone) is drawn inside an SVG clipPath revealed to the RIGHT of a draggable vertical divider — a true spatial reveal, never an opacity toggle. Backdrop identical in both layers for continuity. revealDefault 0.5; drag / arrows / Home-End / touch-snap; reduced-motion + print safe.',
  },

  {
    chartId: 'p1-sequence-risk', idx: '05', group: 'part-1', intendedPlacement: 'part-1',
    experienceRole: 'mechanism',
    storyBeats: [
      { kind: 'context', label: 'One shared return deck, shown in two orders', timing: 'early' },
      { kind: 'mechanism', label: 'The same returns generate both portfolio paths', timing: 'middle' },
      { kind: 'action', label: 'Compare the deck in reverse and watch the paths', timing: 'middle' },
      { kind: 'consequence', label: 'Identical average, opposite surviving capital', timing: 'late' },
    ],
    claimStack: {
      primaryClaim: 'Same returns, same withdrawals — different order, opposite survival',
      visualProof: 'A shared return deck (same blocks, two orders) drives both portfolio paths',
      interactionRole: 'Hover the deck and paths to tie the identical returns to opposite outcomes',
      readerAction: 'Compare the two orders of the same deck',
      caution: 'Representative simulation, not a forecast or backtest',
    },
    interaction: { type: 'returnOrder', gesture: 'hover', conceptMatch: 'The same return deck is shown in two orders; the paths are generated from those exact returns' },
    motionProfile: { type: 'rowSweep', duration: 'slow', relatedElements: [['good', 'bad']] },
    status: 'implemented', wiredPublic: false,
    title: 'Path Changes Everything', setupLine:'Same returns, same withdrawals — different order',
    claimLabel: 'PATH DEPENDENCY · WITHDRAWALS',
    frameworkClaim: 'Same average return, opposite sequence, opposite survival outcome.',
    readerTakeaway: 'Withdrawal-phase capital does not care about the average. It cares about the order.',
    chartType: 'Shared return-set proof: one set of returns in two orders, with the portfolio paths generated from them.',
    visualDataMode: 'simulation',
    disclosure: DISCLOSURE.simulation, footerCta: 'View methodology',
    sources: [
      { provider: 'Author simulation', label: 'One return set, opposite order; paths generated from the returns', role: 'methodology', transform: 'v(i+1) = v(i)·(1+r) − withdrawal · $1.0M start · 4% level withdrawal', notes: 'No real-data transform. Pure deterministic simulation; the deck and the paths use the same returns.' },
    ],
    personalization: { uses: ['startingValue'], kind: 'sequence-scale', withdrawalRate: 0.04, note: 'Scales the start, withdrawal, and ending values to the reader simulation context. Representative simulation, not a forecast.' },
    explainerHeadline: 'Same returns. Same withdrawals. Different order.',
    explainerBody: 'Both paths use the same annual returns and the same withdrawals — the deck above proves it, the same blocks in opposite order. The only difference is sequence. Early losses force withdrawals from a smaller capital base, so later gains compound on less money. Average return did not change; surviving capital did.',
    explainerConcept: 'Sequence risk',
    concepts: [{ label: 'Sequence risk', link: '/part-1-foundation' }, { label: 'Survivable compounding', link: '/part-1-foundation' }, { label: 'Withdrawal policy', link: '/part-4-tax-architecture-roc-strategy' }],
    layout: 'sequenceRisk',
    ariaSummary: 'A shared return-set proof. A deck of return blocks is shown twice: a good order (gains first) and a bad order (the same blocks reversed, losses first). Below, two portfolio-value paths are generated from those exact returns, starting from the same value with the same level withdrawals marked as ticks. The good order compounds before withdrawing, ending far higher; the bad order withdraws from a base impaired by early losses, falling through the depletion line at its trough and recovering only partially. Same average return, opposite surviving capital.',
    domain: { xMin: 0, xMax: 12, yMin: 0, yMax: 2.5 }, yUnit: '$M',
    xTicks: [{ v: 0, label: 'retire' }, { v: 6, label: 'yr 15' }, { v: 12, label: 'yr 30' }],
    yTicks: [{ v: 0.5, label: '0.5×' }, { v: 1.0, label: '1.0×' }, { v: 2.0, label: '2.0×' }],
    sequence,
    primaryKey: 'good',
    hoverTargets: [
      { id: 'deck', kind: 'deck', label: 'Same return set', name: 'Same return set, opposite order', why: 'Both rows are the identical set of representative returns — the top in a good order (gains first), the bottom the same blocks reversed (losses first). The portfolio paths below are generated from exactly these returns.', claim: 'Same deck, shuffled differently.', concept: 'Sequence risk', link: '/part-1-foundation' },
      { id: 'good', kind: 'series', seriesKey: 'good', label: 'Good sequence', name: 'Good sequence', why: 'Gains arrive first, so withdrawals come out of a growing base. It still takes the same later losses — but ends far ahead because it compounded first.', claim: 'Order, not average, did the work.', concept: 'Sequence risk', link: '/part-1-foundation' },
      { id: 'bad', kind: 'series', seriesKey: 'bad', label: 'Bad sequence', name: 'Bad sequence', why: 'The same returns in reverse. Early losses plus ongoing withdrawals hollow out the base, so the identical later gains compound on far less money.', claim: 'Identical average, opposite survival.', concept: 'Sequence risk', link: '/part-1-foundation' },
      { id: 'depletion', kind: 'level', label: 'Depletion risk', name: 'Depletion risk', why: 'Below this line the portfolio can no longer sustain the withdrawal. The bad order falls through it at the trough; the good order never approaches it.', claim: 'Survival is a floor, not an average.', concept: 'Withdrawal policy', link: '/part-4-tax-architecture-roc-strategy' },
    ],
    mobileTapTargets: ['deck', 'bad', 'good', 'depletion'],
    implementationNotes: 'SIMULATION — the honesty footer is non-negotiable; most likely to be misread as a backtest. New sequenceRisk layout: a shared return DECK (same blocks, two orders, shape- and tone-coded) above two portfolio paths GENERATED from those returns, with level-withdrawal ticks on both. Bad path uses the stress tier (muted clay). Scales to reader-context portfolio value.',
  },

  {
    chartId: 'p1-convexity-survival', idx: '06', group: 'part-1', intendedPlacement: 'part-1',
    claimStack: {
      primaryClaim: 'Upside only matters if sizing lets you survive the path',
      visualProof: 'A representative portfolio path that compounds through a shaded drawdown rather than around it',
      interactionRole: 'Hover the value / invested lines and the drawdown to see survival',
      readerAction: 'See compounding survive the drawdown',
      caution: 'Representative simulation path, not historical data',
    },
    status: 'implemented', wiredPublic: false,
    title: 'Survive the Path', setupLine:'Cumulative invested versus portfolio value, with drawdown-from-peak shaded',
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

  /* ── PART 2 · LINEAGE & MACRO THESIS ────────────────────────────────────── */
  {
    chartId: 'p2-method-before-macro', idx: 'P2-01', group: 'part-2', intendedPlacement: 'part-2',
    status: 'needs-design-review', wiredPublic: false,
    title: 'Method Before Macro', setupLine: 'The lineage holds steady while the macro thesis rotates with the regime',
    claimLabel: 'LINEAGE · METHOD',
    frameworkClaim: 'The framework’s method persists across regimes; the macro thesis changes with the environment.',
    readerTakeaway: 'Keep the method fixed; let the thesis move.',
    chartType: 'Two stacked panels: a rotating macro-thesis line over a stable method baseline.',
    visualDataMode: 'conceptual', disclosure: DISCLOSURE.conceptual, footerCta: 'View framework basis',
    sources: [
      { provider: 'ACF · Part 2', label: 'Lineage and macro thesis identification', role: 'verifies-concept', url: '/part-2-lineage-macro-thesis' },
      { provider: 'ACF · Part 1', label: 'Survivable compounding doctrine', role: 'verifies-concept', url: '/part-1-foundation' },
    ],
    explainerHeadline: 'The method is constant; the thesis rotates.',
    explainerBody: 'The lineage — survival first, convexity, regime awareness — does not change with the cycle. What changes is the macro thesis it gets pointed at. Confusing the two is how investors abandon a sound method the moment the regime turns.',
    explainerConcept: 'Method vs application',
    concepts: [{ label: 'Macro thesis', link: '/part-2-lineage-macro-thesis' }, { label: 'Survivable compounding', link: '/part-1-foundation' }],
    layout: 'dual',
    ariaSummary: 'Two stacked conceptual panels sharing a regime timeline. The top panel shows the macro thesis swinging from regime to regime; the bottom panel shows the method as a near-flat, persistent baseline.',
    xDomain: { xMin: 0, xMax: 100 },
    xTicks: [{ v: 0, label: 'regime A' }, { v: 50, label: 'regime B' }, { v: 100, label: 'regime C' }],
    connective: 'the thesis above rotates; the method below does not',
    panels: [
      { id: 'thesisPanel', label: 'Macro thesis · rotates with the regime', yUnit: '', domain: { yMin: 0, yMax: 100 }, yTicks: [], series: [{ key: 'thesis', tier: 'primary', pts: p2Method.thesis }] },
      { id: 'methodPanel', label: 'Method · the lineage that persists', yUnit: '', domain: { yMin: 0, yMax: 100 }, yTicks: [], series: [{ key: 'method', tier: 'reference', pts: p2Method.method }] },
    ],
    primaryKey: 'thesis',
    hoverTargets: [
      { id: 'thesis', kind: 'series', panel: 'thesisPanel', seriesKey: 'thesis', label: 'Macro thesis', name: 'Macro thesis', why: 'The application layer. It swings with growth, inflation, and liquidity — it is supposed to.', claim: 'The thesis is meant to change.', concept: 'Macro thesis', link: '/part-2-lineage-macro-thesis' },
      { id: 'method', kind: 'series', panel: 'methodPanel', seriesKey: 'method', label: 'Method', name: 'The method', why: 'Survival first, convexity, regime awareness, governance. It does not rotate when the regime does.', claim: 'The method is the constant.', concept: 'Method vs application', link: '/part-1-foundation' },
    ],
    mobileTapTargets: ['thesis', 'method'],
    implementationNotes: 'Conceptual dual: top rotates, bottom holds. No numeric axes by design. Marketing may prefer a literal two-layer block diagram — flagged for design review.',
  },

  {
    chartId: 'p2-ruin-comes-first', idx: 'P2-02', group: 'part-2', intendedPlacement: 'part-2',
    status: 'needs-design-review', wiredPublic: false,
    title: 'Ruin Comes First', setupLine: 'Two portfolios, similar volatility, very different left tails',
    claimLabel: 'FRAGILITY · SURVIVAL',
    frameworkClaim: 'Fragility is nonlinear and ruin is irreversible; survival must precede optimization.',
    readerTakeaway: 'You cannot compound from zero.',
    chartType: 'Two outcome paths with similar volatility but different left-tail ruin.',
    visualDataMode: 'conceptual', disclosure: DISCLOSURE.conceptual, footerCta: 'View framework basis',
    sources: [
      { provider: 'ACF · Part 1', label: 'Fragility is structural, not statistical', role: 'verifies-concept', url: '/part-1-foundation' },
      { provider: 'ACF · Part 2', label: 'Taleb lineage · ruin and nonlinearity', role: 'verifies-concept', url: '/part-2-lineage-macro-thesis' },
    ],
    explainerHeadline: 'Survival is not one goal among many.',
    explainerBody: 'Two books can share the same volatility and look equally lively — until one crosses the line it cannot come back from. Ruin is absorbing: there is no compounding after zero. The framework optimizes only inside the set of paths that survive.',
    explainerConcept: 'Ruin',
    concepts: [{ label: 'Fragility', link: '/part-1-foundation' }, { label: 'Survivable compounding', link: '/part-1-foundation' }],
    layout: 'single',
    ariaSummary: 'Two value paths with similar early volatility. One oscillates and recovers; the other crosses a point-of-no-return line and flatlines near zero, never recovering.',
    domain: { xMin: 0, xMax: 100, yMin: 0, yMax: 120 }, yUnit: '',
    xTicks: [{ v: 0, label: 'today' }, { v: 100, label: 'horizon' }], yTicks: [],
    series: [
      { key: 'robust', tier: 'primary', label: 'Survives', pts: p2Ruin.robust },
      { key: 'fragile', tier: 'stress', label: 'Ruined', pts: p2Ruin.fragile, labelDy: 2 },
    ],
    levels: [{ id: 'ruin', y: 30, kind: 'charcoal', label: 'point of no return' }],
    markers: [{ id: 'cross', type: 'enso', x: p2Ruin.crossX, y: R(valueAt(p2Ruin.fragile, p2Ruin.crossX)), r: 12, label: 'ruin · irreversible', labelAnchor: 'end', labelDy: -16 }],
    primaryKey: 'robust',
    hoverTargets: [
      { id: 'cross', kind: 'marker', label: 'Ruin', name: 'The absorbing barrier', why: 'Once a path crosses here it does not return. The math of compounding ends at zero.', claim: 'Ruin is irreversible.', concept: 'Ruin', link: '/part-1-foundation' },
      { id: 'fragile', kind: 'series', seriesKey: 'fragile', label: 'Ruined path', name: 'Ruined path', why: 'Same volatility as its twin, but one shock past the line and it never compounds again.', claim: 'Volatility hid the fragility.', concept: 'Fragility', link: '/part-1-foundation' },
      { id: 'robust', kind: 'series', seriesKey: 'robust', label: 'Surviving path', name: 'Surviving path', why: 'It draws down and recovers because it was never allowed near the absorbing barrier.', claim: 'Survival keeps the option open.', concept: 'Survivable compounding', link: '/part-1-foundation' },
      { id: 'ruin', kind: 'level', label: 'Point of no return', name: 'Point of no return', why: 'The threshold the framework refuses to let a position approach, whatever the upside.', claim: 'Bound the left tail first.', concept: 'Invalidation', link: '/part-6-convexity-framework-integrity-scoring' },
    ],
    mobileTapTargets: ['cross', 'fragile', 'robust', 'ruin'],
    implementationNotes: 'Conceptual; no numeric axes. The two paths share early volatility on purpose — the difference is only the left tail.',
  },

  {
    chartId: 'p2-conviction-needs-exit', idx: 'P2-03', group: 'part-2', intendedPlacement: 'part-2',
    status: 'needs-design-review', wiredPublic: false,
    title: 'Conviction Needs an Exit', setupLine: 'Position size can scale with conviction only because an exit caps the downside',
    claimLabel: 'CONCENTRATION · DISCIPLINE',
    frameworkClaim: 'Concentration only works when paired with monitoring and disciplined exits.',
    readerTakeaway: 'Size up on conviction, but keep the exit.',
    chartType: 'Position size versus conviction, with and without an enforced exit cap.',
    visualDataMode: 'conceptual', disclosure: DISCLOSURE.conceptual, footerCta: 'View framework basis',
    sources: [
      { provider: 'ACF · Part 2', label: 'Druckenmiller lineage · concentration with exits', role: 'verifies-concept', url: '/part-2-lineage-macro-thesis' },
      { provider: 'ACF · Part 5', label: 'Position sizing and tripwires', role: 'verifies-concept', url: '/part-5-portfolio-construction-position-management' },
    ],
    explainerHeadline: 'Concentration is earned by the exit.',
    explainerBody: 'High conviction justifies a large position only when a monitored, pre-committed exit bounds the loss. Without that exit, the same concentration that compounds in your favour is the thing that ruins you. Sizing and invalidation are one decision, not two.',
    explainerConcept: 'Tripwire',
    concepts: [{ label: 'Position sizing', link: '/part-5-portfolio-construction-position-management' }, { label: 'Tripwire', link: '/part-5-portfolio-construction-position-management' }],
    layout: 'single',
    ariaSummary: 'Position size rising with conviction. The disciplined line plateaus at a sizing cap enforced by exits; the no-exit line keeps rising without bound into ruin risk.',
    domain: { xMin: 0, xMax: 100, yMin: 0, yMax: 50 }, yUnit: '',
    xTicks: [{ v: 0, label: 'low conviction' }, { v: 100, label: 'high conviction' }], yTicks: [],
    series: [
      { key: 'disciplined', tier: 'primary', label: 'With exits', pts: p2Conviction.disciplined },
      { key: 'reckless', tier: 'stress', label: 'No exit', pts: p2Conviction.reckless, labelDy: -2 },
    ],
    levels: [{ id: 'cap', y: 20, kind: 'charcoal', label: 'sizing cap · exits enforce it' }],
    markers: [{ id: 'unbounded', type: 'dot', x: 78, y: R(valueAt(p2Conviction.reckless, 78)), r: 3.2, label: 'no exit → unbounded risk', labelAnchor: 'end', labelDy: -12 }],
    primaryKey: 'disciplined',
    hoverTargets: [
      { id: 'disciplined', kind: 'series', seriesKey: 'disciplined', label: 'With exits', name: 'Sized with exits', why: 'Conviction scales the position up to a cap. The cap exists because a monitored exit makes the loss bounded.', claim: 'Concentration the framework allows.', concept: 'Position sizing', link: '/part-5-portfolio-construction-position-management' },
      { id: 'reckless', kind: 'series', seriesKey: 'reckless', label: 'No exit', name: 'Sized without exits', why: 'Same conviction, no invalidation. Size keeps climbing and the left tail goes with it.', claim: 'Conviction without an exit is ruin risk.', concept: 'Fragility', link: '/part-1-foundation' },
      { id: 'cap', kind: 'level', label: 'Sizing cap', name: 'The sizing cap', why: 'The maximum the framework will run, set by what the exit can defend, not by how good the story feels.', claim: 'The exit sets the cap.', concept: 'Tripwire', link: '/part-5-portfolio-construction-position-management' },
      { id: 'unbounded', kind: 'marker', label: 'Unbounded risk', name: 'Unbounded risk', why: 'Past the cap, with no exit, the position is one regime turn from a hole it cannot climb out of.', claim: 'This is where conviction becomes danger.', concept: 'Ruin', link: '/part-1-foundation' },
    ],
    mobileTapTargets: ['disciplined', 'cap', 'reckless', 'unbounded'],
    implementationNotes: 'Conceptual; x is conviction, y is position size. The cap (level) is the point — concentration is licensed by the exit.',
  },

  {
    chartId: 'p2-markets-feed-back', idx: 'P2-04', group: 'part-2', intendedPlacement: 'part-2',
    status: 'needs-design-review', wiredPublic: false,
    title: 'Markets Feed Back', setupLine: 'Price → capital → fundamentals → validation, and back to price',
    claimLabel: 'REFLEXIVITY · FEEDBACK',
    frameworkClaim: 'Prices do not only reflect fundamentals; they can change fundamentals.',
    readerTakeaway: 'Price is an input, not just an output.',
    chartType: 'Reflexive loop of price, capital, fundamentals, and validation.',
    visualDataMode: 'conceptual', disclosure: DISCLOSURE.conceptual, footerCta: 'View framework basis',
    sources: [{ provider: 'ACF · Part 2', label: 'Soros lineage · reflexivity', role: 'verifies-concept', url: '/part-2-lineage-macro-thesis' }],
    explainerHeadline: 'Price can write the fundamentals it claims to read.',
    explainerBody: 'A rising price attracts capital; capital funds the buildout; the buildout improves the fundamentals; better fundamentals validate the price. The loop runs in reverse just as easily. Theses that ignore this feedback misjudge both how far trends run and how fast they break.',
    explainerConcept: 'Reflexivity',
    concepts: [{ label: 'Reflexivity', link: '/part-2-lineage-macro-thesis' }, { label: 'Macro thesis', link: '/part-2-lineage-macro-thesis' }],
    layout: 'systemLoop',
    ariaSummary: 'A self-reinforcing feedback ring — price, capital, fundamentals, validation — with clockwise reinforcing flow and a quiet cue that the same loop can run in reverse.',
    systemLoop: {
      centerLabel: 'reflexivity',
      reversalLabel: 'the loop can reverse',
      nodes: [
        { id: 'price', label: 'Price', sub: 'moves first' },
        { id: 'capital', label: 'Capital', sub: 'follows price' },
        { id: 'fundamentals', label: 'Fundamentals', sub: 'reshaped by capital' },
        { id: 'validation', label: 'Validation', sub: 'confirms the price' },
      ],
    },
    primaryKey: 'price',
    hoverTargets: [
      { id: 'price', kind: 'node', label: 'Price', name: 'Price', why: 'Not just a readout of value — a signal that pulls capital toward it.', claim: 'Price moves first.', concept: 'Reflexivity', link: '/part-2-lineage-macro-thesis' },
      { id: 'capital', label: 'Capital', kind: 'node', name: 'Capital', why: 'Flows toward the rising price and funds the thing the price implied.', claim: 'Capital chases the signal.', concept: 'Liquidity cycle', link: '/part-2-lineage-macro-thesis' },
      { id: 'fundamentals', kind: 'node', label: 'Fundamentals', name: 'Fundamentals', why: 'Genuinely change because capital arrived — the story becomes partly true.', claim: 'The narrative funds itself.', concept: 'Reflexivity', link: '/part-2-lineage-macro-thesis' },
      { id: 'validation', kind: 'node', label: 'Validation', name: 'Validation', why: 'Improved fundamentals ratify the price, which moves again. In reverse, the same loop breaks trends fast.', claim: 'Confirmation feeds the next move.', concept: 'Macro thesis', link: '/part-2-lineage-macro-thesis' },
    ],
    mobileTapTargets: ['price', 'capital', 'fundamentals', 'validation'],
    implementationNotes: 'Loop layout, 4 nodes. Reversal path is conceptual (explainer) rather than a second drawn ring, to keep it quiet.',
  },

  {
    chartId: 'p2-time-changes-prudence', idx: 'P2-05', group: 'part-2', intendedPlacement: 'part-2',
    status: 'needs-design-review', wiredPublic: false,
    title: 'Time Changes Prudence', setupLine: 'Conventional versus convex, tax-free compounding over a 70-year horizon',
    claimLabel: 'HORIZON · PRUDENCE',
    frameworkClaim: 'Longer horizons change what counts as prudent; tax-free compounding and convex exposure become more important.',
    readerTakeaway: 'A long horizon rewrites the prudent choice.',
    chartType: 'Two compounding paths diverging at long horizon (simulation).',
    visualDataMode: 'simulation', disclosure: DISCLOSURE.simulation, footerCta: 'View methodology',
    sources: [
      { provider: 'Author simulation', label: 'Constant-rate compounding, conventional vs convex/tax-free', role: 'methodology', transform: '70-year horizon, illustrative rates', notes: 'No real-data transform; illustrative compounding only.' },
      { provider: 'ACF · Part 2', label: 'Edelman / longevity-horizon lineage', role: 'verifies-concept', url: '/part-2-lineage-macro-thesis' },
    ],
    explainerHeadline: 'Prudence is a function of horizon.',
    explainerBody: 'Over ten years the cautious path and the convex path look close enough to call the cautious one prudent. Stretch the horizon toward a lifetime and the gap stops being a gap — it becomes the whole outcome. Longevity makes tax-free convexity the conservative choice.',
    explainerConcept: 'Survivable compounding',
    concepts: [{ label: 'Tax architecture', link: '/part-4-tax-architecture-roc-strategy' }, { label: 'Convexity', link: '/part-3-bitcoin-convexity-backbone' }],
    layout: 'single',
    ariaSummary: 'Two compounding multiples over seventy years. The conventional path grows modestly; the convex, tax-free path hugs it early then pulls dramatically away in the final decades.',
    domain: { xMin: 0, xMax: 70, yMin: 0, yMax: 230 }, yUnit: '', valueUnit: '× start',
    xTicks: [{ v: 0, label: 'yr 0' }, { v: 35, label: 'yr 35' }, { v: 70, label: 'yr 70' }],
    yTicks: [{ v: 50, label: '50×' }, { v: 150, label: '150×' }],
    series: [
      { key: 'convex', tier: 'primary', label: 'Convex · tax-free', pts: p2Time.convex },
      { key: 'prudent', tier: 'reference', label: 'Conventional', pts: p2Time.prudent, labelDy: 12 },
    ],
    markers: [{ id: 'flip', type: 'enso', x: 52, y: R(valueAt(p2Time.convex, 52)), r: 12, label: 'horizon reshapes prudence', labelAnchor: 'end', labelDy: -16 }],
    primaryKey: 'convex',
    hoverTargets: [
      { id: 'convex', kind: 'series', seriesKey: 'convex', label: 'Convex · tax-free', name: 'Convex, tax-free path', why: 'Quiet for years, then the compounding and the tax-free wrapper do the work the horizon was always going to reward.', claim: 'Long horizons favour convexity.', concept: 'Convexity', link: '/part-3-bitcoin-convexity-backbone' },
      { id: 'prudent', kind: 'series', seriesKey: 'prudent', label: 'Conventional', name: 'Conventional path', why: 'The “safe” default. Over a lifetime its caution is what costs the most.', claim: 'Caution has a long-horizon price.', concept: 'Tax architecture', link: '/part-4-tax-architecture-roc-strategy' },
      { id: 'flip', kind: 'marker', label: 'Prudence reshaped', name: 'Where prudence flips', why: 'Past here the convex path is no longer the risky one — the horizon has made it the conservative choice.', claim: 'Time changes the definition.', concept: 'Survivable compounding', link: '/part-1-foundation' },
    ],
    mobileTapTargets: ['convex', 'prudent', 'flip'],
    implementationNotes: 'SIMULATION — illustrative compounding, footer-disclosed. Linear y is bottom-heavy by nature; the late divergence is the message.',
  },

  {
    chartId: 'p2-capital-finds-bottleneck', idx: 'P2-06', group: 'part-2', intendedPlacement: 'part-2',
    status: 'needs-design-review', wiredPublic: false,
    title: 'Capital Finds the Bottleneck', setupLine: 'A structural force only matters where it is constrained — that is where capital lands',
    claimLabel: 'THESIS · CAPITAL FLOW',
    frameworkClaim: 'A valid thesis must map structural force into capital-flow pathways.',
    readerTakeaway: 'Trace the force to its bottleneck to its instruments.',
    chartType: 'Flow map: structural force → bottlenecks → where capital lands.',
    visualDataMode: 'conceptual', disclosure: DISCLOSURE.conceptual, footerCta: 'View framework basis',
    sources: [{ provider: 'ACF · Part 2', label: 'Macro thesis construction', role: 'verifies-concept', url: '/part-2-lineage-macro-thesis' }],
    explainerHeadline: 'Force is not a trade; the bottleneck is.',
    explainerBody: 'Everyone can see the structural force. The edge is mapping it to the constraint it runs into, and the specific assets that own that constraint. A thesis that stops at the theme never reaches the capital-flow pathway where the return actually accrues.',
    explainerConcept: 'Capital pathways',
    concepts: [{ label: 'Macro thesis', link: '/part-2-lineage-macro-thesis' }, { label: 'Thematic engine', link: '/part-5-portfolio-construction-position-management' }],
    layout: 'bridge',
    ariaSummary: 'A five-stage descending cascade: structural force, required buildout, bottleneck, capital pathway, and investable exposure — each stage transforming the previous until the thesis becomes something ownable.',
    bridge: {
      stages: [
        { id: 'force', label: 'Structural force', sub: 'the driver everyone sees' },
        { id: 'buildout', label: 'Required buildout', sub: 'what it forces to be built' },
        { id: 'bottleneck', label: 'Bottleneck', sub: 'the binding constraint' },
        { id: 'pathway', label: 'Capital pathway', sub: 'where money must flow' },
        { id: 'exposure', label: 'Investable exposure', sub: 'the thesis, made ownable' },
      ],
    },
    primaryKey: 'exposure',
    hoverTargets: [
      { id: 'force', kind: 'node', label: 'Structural force', name: 'Structural force', why: 'The macro driver everyone already agrees on. On its own it is a theme, not a position.', claim: 'The force is the easy part.', concept: 'Macro thesis', link: '/part-2-lineage-macro-thesis' },
      { id: 'buildout', kind: 'node', label: 'Required buildout', name: 'Required buildout', why: 'What the force actually forces into existence — the physical and financial work it demands.', claim: 'Force becomes spending.', concept: 'Capital pathways', link: '/part-2-lineage-macro-thesis' },
      { id: 'bottleneck', kind: 'node', label: 'Bottleneck', name: 'The bottleneck', why: 'The binding constraint the buildout runs into. Scarcity here is what concentrates the return.', claim: 'Constraints, not themes, pay.', concept: 'Capital pathways', link: '/part-2-lineage-macro-thesis' },
      { id: 'pathway', kind: 'node', label: 'Capital pathway', name: 'Capital pathway', why: 'The route money must travel to relieve the constraint — the pathway a real thesis predicts.', claim: 'Follow where capital must go.', concept: 'Liquidity cycle', link: '/part-2-lineage-macro-thesis' },
      { id: 'exposure', kind: 'node', label: 'Investable exposure', name: 'Investable exposure', why: 'The specific assets that own the constraint. This is the point a thesis becomes ownable.', claim: 'A thesis is not investable until here.', concept: 'Thematic engine', link: '/part-5-portfolio-construction-position-management' },
    ],
    mobileTapTargets: ['force', 'buildout', 'bottleneck', 'pathway', 'exposure'],
    implementationNotes: 'Uses the bridge layout: a descending five-stage cascade where each stage transforms the prior and capital concentrates into the emphasised final investable node.',
  },

  {
    chartId: 'p2-narrative-not-thesis', idx: 'P2-07', group: 'part-2', intendedPlacement: 'part-2',
    status: 'needs-design-review', wiredPublic: false,
    title: 'Narrative Is Not Thesis', setupLine: 'A story becomes a thesis only after it survives four gates',
    claimLabel: 'THESIS · VALIDATION',
    frameworkClaim: 'A valid macro thesis needs persistence, capital-flow implications, falsifiability, and multi-year runway.',
    readerTakeaway: 'Most narratives never make it through the gates.',
    chartType: 'Validation gauntlet: narrative through four gates to a thesis.',
    visualDataMode: 'conceptual', disclosure: DISCLOSURE.conceptual, footerCta: 'View framework basis',
    sources: [{ provider: 'ACF · Part 2', label: 'Valid macro thesis filter', role: 'verifies-concept', url: '/part-2-lineage-macro-thesis' }],
    explainerHeadline: 'A narrative is a candidate, not a conclusion.',
    explainerBody: 'Compelling stories are cheap. A thesis has to persist beyond the headline, imply a real capital-flow path, be falsifiable enough to break, and run for years. Anything that fails a gate is a trade idea at best — never a structure to build on.',
    explainerConcept: 'Valid thesis',
    concepts: [{ label: 'Macro thesis', link: '/part-2-lineage-macro-thesis' }, { label: 'Falsifiability', link: '/part-6-convexity-framework-integrity-scoring' }],
    layout: 'gate',
    ariaSummary: 'A validation gauntlet. A narrative enters and must pass four gates — structural persistence, capital-flow implication, falsifiable indicators, and multi-year conviction — and only what survives all four emerges as a thesis. A survivor band thins at each gate.',
    gate: {
      nodes: [
        { id: 'narrative', kind: 'entry', label: 'Narrative', sub: 'a compelling story' },
        { id: 'persist', kind: 'gate', label: 'Persistence', sub: 'structural, not a headline' },
        { id: 'flow', kind: 'gate', label: 'Capital flow', sub: 'a real pathway' },
        { id: 'falsify', kind: 'gate', label: 'Falsifiable', sub: 'measurable signals' },
        { id: 'runway', kind: 'gate', label: 'Conviction', sub: 'multi-year runway' },
        { id: 'thesis', kind: 'exit', label: 'Thesis', sub: 'survived all four' },
      ],
    },
    primaryKey: 'thesis',
    hoverTargets: [
      { id: 'narrative', kind: 'node', label: 'Narrative', name: 'Narrative', why: 'A compelling story. Necessary, abundant, and on its own worth nothing to allocate against.', claim: 'Stories are the input, not the output.', concept: 'Valid thesis', link: '/part-2-lineage-macro-thesis' },
      { id: 'persist', kind: 'node', label: 'Persistent?', name: 'Gate 1 · persistence', why: 'Does it outlast the news cycle, or is it a headline that fades in a quarter?', claim: 'Survive the headline.', concept: 'Macro thesis', link: '/part-2-lineage-macro-thesis' },
      { id: 'flow', kind: 'node', label: 'Capital flow?', name: 'Gate 2 · capital flow', why: 'Does it imply a concrete pathway capital must travel, or just a vibe?', claim: 'No pathway, no thesis.', concept: 'Capital pathways', link: '/part-2-lineage-macro-thesis' },
      { id: 'falsify', kind: 'node', label: 'Falsifiable?', name: 'Gate 3 · falsifiability', why: 'Can you state what would prove it wrong? If not, you cannot manage it.', claim: 'If it cannot break, it cannot be governed.', concept: 'Falsifiability', link: '/part-6-convexity-framework-integrity-scoring' },
      { id: 'runway', kind: 'node', label: 'Runway?', name: 'Gate 4 · runway', why: 'Does it have multi-year runway, or is the move already mostly behind it?', claim: 'Theses need years, not weeks.', concept: 'Macro thesis phase', link: '/part-2-lineage-macro-thesis' },
      { id: 'thesis', kind: 'node', label: 'Thesis', name: 'A thesis', why: 'Only what clears all four gates earns the right to shape structure and sizing.', claim: 'This is what you build on.', concept: 'Valid thesis', link: '/part-2-lineage-macro-thesis' },
    ],
    mobileTapTargets: ['narrative', 'persist', 'flow', 'falsify', 'runway', 'thesis'],
    implementationNotes: 'Uses the gate layout: a survivor band that thins through four vertical gates into the thesis node. Sober gauntlet, not a marketing funnel.',
  },

  {
    chartId: 'p2-phase-changes-sizing', idx: 'P2-08', group: 'part-2', intendedPlacement: 'part-2',
    status: 'needs-design-review', wiredPublic: false,
    title: 'Phase Changes Sizing', setupLine: 'The same valid thesis carries different sizing early, mid, and late',
    claimLabel: 'PHASE · SIZING',
    frameworkClaim: 'A thesis can remain structurally valid while its deployment phase changes sizing and risk posture.',
    readerTakeaway: 'Right thesis, wrong size, still a loss.',
    chartType: 'Thesis validity held constant while sizing rises then trims across phases.',
    visualDataMode: 'conceptual', disclosure: DISCLOSURE.conceptual, footerCta: 'View framework basis',
    sources: [
      { provider: 'ACF · Part 2', label: 'Macro thesis phase / governance', role: 'verifies-concept', url: '/part-2-lineage-macro-thesis' },
      { provider: 'ACF · Part 5', label: 'Position management across the cycle', role: 'verifies-concept', url: '/part-5-portfolio-construction-position-management' },
    ],
    explainerHeadline: 'Validity is not a sizing instruction.',
    explainerBody: 'A thesis can be right for a decade and still demand different risk at each stage: small while it is unproven, largest through the buildout, trimmed once it is crowded and priced. Separating thesis validity from deployment phase is what keeps conviction from becoming complacency.',
    explainerConcept: 'Macro thesis phase',
    concepts: [{ label: 'Macro thesis phase', link: '/part-2-lineage-macro-thesis' }, { label: 'Position sizing', link: '/part-5-portfolio-construction-position-management' }],
    layout: 'single',
    ariaSummary: 'Across a thesis lifecycle — early structural, mid-cycle buildout, late expression — validity stays high and flat while sizing starts small, ramps to a peak, then trims into the late phase.',
    domain: { xMin: 0, xMax: 100, yMin: 0, yMax: 100 }, yUnit: '',
    xTicks: [{ v: 0, label: 'early structural' }, { v: 50, label: 'mid-cycle' }, { v: 100, label: 'late expression' }], yTicks: [],
    series: [
      { key: 'sizing', tier: 'primary', label: 'Sizing', pts: p2Phase.sizing },
      { key: 'validity', tier: 'reference', label: 'Thesis validity', pts: p2Phase.validity, labelDy: -4 },
    ],
    markers: [{ id: 'trim', type: 'enso', x: 78, y: R(valueAt(p2Phase.sizing, 78)), r: 12, label: 'trim as it gets crowded', labelAnchor: 'end', labelDy: -16 }],
    primaryKey: 'sizing',
    hoverTargets: [
      { id: 'sizing', kind: 'series', seriesKey: 'sizing', label: 'Sizing', name: 'Sizing', why: 'Small while unproven, largest through the buildout, trimmed once the move is crowded and priced.', claim: 'Size tracks the phase, not the conviction.', concept: 'Position sizing', link: '/part-5-portfolio-construction-position-management' },
      { id: 'validity', kind: 'series', seriesKey: 'validity', label: 'Thesis validity', name: 'Thesis validity', why: 'Flat and high throughout — the thesis stays right even as the correct size changes underneath it.', claim: 'Validity is constant; sizing is not.', concept: 'Macro thesis phase', link: '/part-2-lineage-macro-thesis' },
      { id: 'trim', kind: 'marker', label: 'Late-phase trim', name: 'Late-phase trim', why: 'The thesis is still valid here, but it is crowded and priced — so risk comes down even as conviction stays.', claim: 'Trim a winner that is now consensus.', concept: 'Tripwire', link: '/part-5-portfolio-construction-position-management' },
    ],
    mobileTapTargets: ['sizing', 'validity', 'trim'],
    implementationNotes: 'Conceptual; phases live on the x-axis. Validity is a flat reference; sizing is the moving primary.',
  },

  {
    chartId: 'p2-liquidity-sets-tide', idx: 'P2-09', group: 'part-2', intendedPlacement: 'part-2',
    status: 'needs-design-review', wiredPublic: false,
    title: 'Liquidity Sets the Tide', setupLine: 'A representative liquidity impulse and the convex asset that amplifies it',
    claimLabel: 'LIQUIDITY · SENSITIVITY',
    frameworkClaim: 'In the current thesis, liquidity cycles shape Bitcoin and long-duration asset sensitivity.',
    readerTakeaway: 'Convex assets ride the liquidity tide, magnified.',
    chartType: 'Representative liquidity impulse versus convex-asset sensitivity.',
    visualDataMode: 'representative', disclosure: DISCLOSURE.representative, footerCta: 'View sources',
    sources: [
      { provider: 'ACF · Part 2', label: 'Liquidity-cycle lineage (Alden)', role: 'verifies-concept', url: '/part-2-lineage-macro-thesis' },
      { provider: 'ACF · Part 3', label: 'Bitcoin liquidity sensitivity', role: 'verifies-concept', url: '/part-3-bitcoin-convexity-backbone' },
      { provider: 'Author calculation', label: 'Representative liquidity impulse vs convex sensitivity', role: 'methodology' },
    ],
    explainerHeadline: 'Convex assets trade the tide, not the weather.',
    explainerBody: 'Global liquidity sets the level of the water; long-duration and convex assets like Bitcoin ride it with amplification. Read the liquidity impulse and you read most of the swing — which is why the current thesis treats liquidity as the tide, not background noise.',
    explainerConcept: 'Liquidity cycle',
    concepts: [{ label: 'Liquidity cycle', link: '/part-2-lineage-macro-thesis' }, { label: 'Convexity', link: '/part-3-bitcoin-convexity-backbone' }],
    layout: 'single',
    ariaSummary: 'Two lines over time. A liquidity impulse oscillates gently around mid-range; a convex asset traces the same rhythm with a lag and a much larger amplitude.',
    domain: { xMin: 0, xMax: 100, yMin: 0, yMax: 100 }, yUnit: '', valueUnit: 'index',
    xTicks: [{ v: 0, label: 'tide out' }, { v: 100, label: 'tide in' }], yTicks: [{ v: 25 }, { v: 50 }, { v: 75 }],
    series: [
      { key: 'asset', tier: 'primary', label: 'Convex asset', pts: p2Liquidity.asset },
      { key: 'liquidity', tier: 'secondary', label: 'Liquidity', pts: p2Liquidity.liquidity, labelDy: 14 },
    ],
    markers: [{ id: 'lead', type: 'dot', x: 30, y: R(valueAt(p2Liquidity.liquidity, 30)), r: 3.2, label: 'liquidity turns, asset follows', labelAnchor: 'start', labelDy: -12 }],
    primaryKey: 'asset',
    hoverTargets: [
      { id: 'asset', kind: 'series', seriesKey: 'asset', label: 'Convex asset', name: 'Convex asset', why: 'Long-duration and convex, so it amplifies the liquidity swing rather than merely tracking it.', claim: 'Convexity magnifies the tide.', concept: 'Convexity', link: '/part-3-bitcoin-convexity-backbone' },
      { id: 'liquidity', kind: 'series', seriesKey: 'liquidity', label: 'Liquidity', name: 'Liquidity impulse', why: 'The level of the water. Most of the asset’s swing is just this, magnified and lagged.', claim: 'Liquidity is the driver.', concept: 'Liquidity cycle', link: '/part-2-lineage-macro-thesis' },
      { id: 'lead', kind: 'marker', label: 'Liquidity leads', name: 'Liquidity leads', why: 'The impulse turns first; the convex asset follows and overshoots.', claim: 'Read the tide before the asset.', concept: 'Macro thesis', link: '/part-2-lineage-macro-thesis' },
    ],
    mobileTapTargets: ['asset', 'liquidity', 'lead'],
    implementationNotes: 'Representative shapes (not historical series). Production could wire a real global-liquidity proxy vs BTC behind the same spec.',
  },

  /* ── PART 3 · BITCOIN — CONVEXITY BACKBONE ──────────────────────────────── */
  {
    chartId: 'p3-power-law-holds', idx: 'P3-01', group: 'part-3', intendedPlacement: 'part-3',
    status: 'needs-design-review', wiredPublic: false,
    title: 'Power Law Holds', setupLine: 'Price against a log power-law corridor — central tendency, with euphoria and capitulation bands',
    claimLabel: 'VALUATION · POWER LAW',
    frameworkClaim: 'Bitcoin’s long-term path can be contextualized by power-law behavior — a regime heuristic, not a prediction.',
    readerTakeaway: 'A map of where Bitcoin sits on its adoption curve, not a forecast.',
    chartType: 'Log power-law corridor with price oscillating between euphoria and capitulation bands.',
    visualDataMode: 'representative', disclosure: DISCLOSURE.representative, footerCta: 'View sources', suppressValues: true,
    sources: [
      { provider: 'Santostasi · power-law model', label: 'Bitcoin power-law (log-log regression)', role: 'verifies-concept', url: 'https://giovannisantostasi.medium.com/the-bitcoin-power-law-theory-962dfaf99ee9' },
      { provider: 'ACF · Part 3', label: 'Power-law bands as a regime heuristic', role: 'verifies-concept', url: '/part-3-bitcoin-convexity-backbone' },
    ],
    explainerHeadline: 'Power-law bands map the regime; they do not predict it.',
    explainerBody: 'Plotted on a log scale, Bitcoin has spent most of its history inside a power-law corridor — roughly 80 percent central, with stretches of euphoria above and capitulation below. The framework reads it as a map of where price sits on the adoption curve, never as a forecast.',
    explainerConcept: 'Power law',
    concepts: [{ label: 'Power law', link: '/part-3-bitcoin-convexity-backbone' }, { label: 'Valuation discipline', link: '/part-3-bitcoin-convexity-backbone' }],
    layout: 'single',
    ariaSummary: 'A log-scale chart. A power-law corridor rises across the plot; Bitcoin’s price oscillates inside it, spiking into an upper euphoria band twice and dropping below the lower capitulation band once, currently sitting back inside the corridor.',
    domain: { xMin: 0, xMax: 100, yMin: 2.8, yMax: 6.4 }, yUnit: '',
    xTicks: [{ v: 0, label: 'early adoption' }, { v: 50, label: 'mid cycle' }, { v: 100, label: 'now' }],
    yTicks: [{ v: 3, label: '$1k' }, { v: 4, label: '$10k' }, { v: 5, label: '$100k' }, { v: 6, label: '$1M' }],
    series: [
      { key: 'upper', tier: 'reference', hidden: true, pts: p3Power.upper },
      { key: 'lower', tier: 'reference', hidden: true, pts: p3Power.lower },
      { key: 'central', tier: 'reference', label: 'fair value', pts: p3Power.central },
      { key: 'price', tier: 'primary', label: 'price', pts: p3Power.price },
    ],
    areas: [{ id: 'corridor', topKey: 'upper', botKey: 'lower', kind: 'gap', label: 'power-law corridor' }],
    markers: [
      { id: 'euphoria', type: 'enso', x: p3Power.euph.x, y: p3Power.euph.y, r: 12, label: 'euphoria · upper band', labelAnchor: 'end', labelDy: -16 },
      { id: 'capitulation', type: 'enso', x: p3Power.cap.x, y: p3Power.cap.y, r: 12, label: 'capitulation · lower band', labelAnchor: 'start', labelDy: 20 },
      { id: 'now', type: 'dot', x: p3Power.last.x, y: p3Power.last.y, r: 3.4, label: 'current regime', labelAnchor: 'end', labelDy: -12 },
    ],
    primaryKey: 'price',
    hoverTargets: [
      { id: 'price', kind: 'series', seriesKey: 'price', label: 'Price', name: 'Bitcoin price', why: 'Most of the time it lives inside the corridor; the excursions out are the regime signal, not the trend.', claim: 'Price is read against the band, not in isolation.', concept: 'Power law', link: '/part-3-bitcoin-convexity-backbone' },
      { id: 'central', kind: 'series', seriesKey: 'central', label: 'Fair value', name: 'Power-law central tendency', why: 'The corridor midline — the framework’s rough sense of fair value on the adoption curve.', claim: 'A heuristic centre, not a target.', concept: 'Valuation discipline', link: '/part-3-bitcoin-convexity-backbone' },
      { id: 'euphoria', kind: 'marker', label: 'Euphoria', name: 'Euphoria · upper band', why: 'Price stretched above the corridor. Historically rare and brief — a signal to slow discretionary accumulation, not to predict a top.', claim: 'Above the band: caution.', concept: 'Valuation discipline', link: '/part-3-bitcoin-convexity-backbone' },
      { id: 'capitulation', kind: 'marker', label: 'Capitulation', name: 'Capitulation · lower band', why: 'Price below the corridor. Rare and short — where the framework leans into accumulation.', claim: 'Below the band: opportunity.', concept: 'Valuation discipline', link: '/part-3-bitcoin-convexity-backbone' },
      { id: 'now', kind: 'marker', label: 'Current regime', name: 'Where it sits now', why: 'The map keeps re-reading position in the corridor rather than forecasting the next move.', claim: 'Position is a reading, not a prediction.', concept: 'Power law', link: '/part-3-bitcoin-convexity-backbone' },
    ],
    mobileTapTargets: ['now', 'euphoria', 'capitulation', 'price', 'central'],
    implementationNotes: 'Signature Part 3 visual. Baked in log space (y = log10 price; ticks are decades) so the corridor reads straight and calm. Representative shape — production can wire a real log-log fit behind the same spec. Restrained green thesis line, no orange/neon.',
  },

  {
    chartId: 'p3-ten-tests', idx: 'P3-02', group: 'part-3', intendedPlacement: 'part-3',
    claimStack: {
      primaryClaim: 'Only Bitcoin clears all ten backbone requirements at once',
      visualProof: 'A requirement × asset matrix with shape-coded meet/partial/fail glyphs and a 10/10 column',
      interactionRole: 'Hover a requirement row to see why it matters and how each asset scores',
      readerAction: 'Scan the column that clears every row',
      caution: 'Conceptual scoring from the Part 3 comparison; illustrative, not measured',
    },
    interaction: { type: 'hover', gesture: 'hover', conceptMatch: 'Hovering a requirement row reveals the rationale behind each asset score' },
    status: 'needs-design-review', wiredPublic: false,
    title: 'One Asset, Ten Tests', setupLine: 'The ten backbone requirements, scored across candidate reserve assets',
    claimLabel: 'BACKBONE · REQUIREMENTS',
    frameworkClaim: 'Bitcoin uniquely satisfies the framework’s requirements for a convexity backbone asset.',
    readerTakeaway: 'No alternative clears all ten at once.',
    chartType: 'Requirement × asset scorecard (meets / partial / fails).',
    visualDataMode: 'conceptual', disclosure: DISCLOSURE.conceptual, footerCta: 'View framework basis',
    sources: [{ provider: 'ACF · Part 3', label: 'Backbone requirements and asset comparison', role: 'verifies-concept', url: '/part-3-bitcoin-convexity-backbone' }],
    explainerHeadline: 'Ten requirements, derived from the objective — not reverse-engineered.',
    explainerBody: 'The backbone requirements come from one objective: survivable multi-decade compounding. Scored honestly, gold and the S&P clear many of them, but only Bitcoin clears all ten at once. If another asset did, it would qualify equally.',
    explainerConcept: 'Convexity backbone',
    concepts: [{ label: 'Convexity backbone', link: '/part-3-bitcoin-convexity-backbone' }, { label: 'Survivable compounding', link: '/part-1-foundation' }],
    layout: 'scorecard',
    ariaSummary: 'A scorecard of ten backbone requirements scored across Bitcoin, gold, real estate, commodities, and the S&P 500. Bitcoin meets all ten; gold scores eight, the S&P five and a half, real estate four, commodities three.',
    scorecard: {
      assets: [
        { id: 'btc', label: 'Bitcoin', focus: true }, { id: 'gold', label: 'Gold' }, { id: 're', label: 'Real estate' }, { id: 'cmd', label: 'Commodities' }, { id: 'spx', label: 'S&P 500' },
      ],
      aggregates: { btc: '10/10', gold: '8/10', re: '4/10', cmd: '3/10', spx: '5.5/10' },
      requirements: [
        { id: 'custody', label: 'Dual custody', scores: { btc: 2, gold: 1, re: 0, cmd: 0, spx: 0 } },
        { id: 'collat', label: 'Collateralization', scores: { btc: 2, gold: 2, re: 2, cmd: 0, spx: 2 } },
        { id: 'convex', label: '10–100× convexity', scores: { btc: 2, gold: 0, re: 0, cmd: 0, spx: 0 } },
        { id: 'models', label: 'Quantifiable models', scores: { btc: 2, gold: 1, re: 1, cmd: 1, spx: 1 } },
        { id: 'single', label: 'Single asset', scores: { btc: 2, gold: 2, re: 0, cmd: 1, spx: 0 } },
        { id: 'roth', label: 'Roth viable', scores: { btc: 2, gold: 2, re: 0, cmd: 0, spx: 2 } },
        { id: 'passive', label: 'Passive hold', scores: { btc: 2, gold: 2, re: 0, cmd: 0, spx: 2 } },
        { id: 'regime', label: 'Regime resilience', scores: { btc: 2, gold: 1, re: 1, cmd: 1, spx: 1 } },
        { id: 'survive', label: 'Multi-decade survivability', scores: { btc: 2, gold: 2, re: 1, cmd: 1, spx: 2 } },
        { id: 'liquid', label: 'Instant liquidity', scores: { btc: 2, gold: 2, re: 0, cmd: 2, spx: 2 } },
      ],
    },
    primaryKey: 'convex',
    hoverTargets: [
      { id: 'custody', kind: 'row', label: 'Dual custody', name: 'Dual custody', why: 'Held in sovereign self-custody and in regulated wrappers for borrowing, same underlying exposure. Gold only half-meets; equities and property cannot.', claim: 'Sovereign control and institutional borrowing at once.', concept: 'Custody', link: '/part-3-bitcoin-convexity-backbone' },
      { id: 'collat', kind: 'row', label: 'Collateralization', name: 'Collateralization', why: 'Mature lending markets let you borrow without forced sales — the basis of the accumulate-to-borrow lifecycle.', claim: 'Borrow against it, never sell it.', concept: 'Buy-borrow-die', link: '/part-4-tax-architecture-roc-strategy' },
      { id: 'convex', kind: 'row', label: '10–100× convexity', name: '10–100× convexity', why: 'A measurable adoption TAM supporting multi-decade, order-of-magnitude appreciation — not 2–3× mature growth. This is where only Bitcoin clears.', claim: 'The requirement only Bitcoin meets.', concept: 'Convexity', link: '/part-3-bitcoin-convexity-backbone' },
      { id: 'models', kind: 'row', label: 'Quantifiable models', name: 'Quantifiable models', why: 'Multiple independent valuation frameworks (power-law, realized price, production cost, liquidity) rather than pure narrative.', claim: 'Scoreable, so it can be governed.', concept: 'Valuation discipline', link: '/part-3-bitcoin-convexity-backbone' },
      { id: 'single', kind: 'row', label: 'Single asset', name: 'Single asset', why: 'One unified global thing, not location-specific instances with basis risk.', claim: 'One asset, everywhere.', concept: 'Convexity backbone', link: '/part-3-bitcoin-convexity-backbone' },
      { id: 'roth', kind: 'row', label: 'Roth viable', name: 'Tax optimization', why: 'Borrow-borrow-die plus tax-advantaged wrapper compatibility — a functionally low tax rate on the reserve.', claim: 'Compounds tax-efficiently.', concept: 'Tax architecture', link: '/part-4-tax-architecture-roc-strategy' },
      { id: 'passive', kind: 'row', label: 'Passive hold', name: 'Passive hold-ability', why: 'No active management, storage rotation, or operational attention to hold for decades.', claim: 'Hold, do not tend.', concept: 'Survivable compounding', link: '/part-1-foundation' },
      { id: 'regime', kind: 'row', label: 'Regime resilience', name: 'Regime resilience', why: 'Appreciates during instability rather than merely surviving it.', claim: 'Works because of the regime, not despite it.', concept: 'Macro regime', link: '/part-2-lineage-macro-thesis' },
      { id: 'survive', kind: 'row', label: 'Multi-decade survivability', name: 'Multi-decade survivability', why: 'High probability of 30–60 year persistence — the horizon the reserve is held for.', claim: 'Built to outlast the cycle.', concept: 'Survivable compounding', link: '/part-1-foundation' },
      { id: 'liquid', kind: 'row', label: 'Instant liquidity', name: 'Instant liquidity', why: 'Add positions or borrow against collateral without multi-month timelines or heavy friction.', claim: 'Act now, not in ninety days.', concept: 'Liquidity', link: '/part-3-bitcoin-convexity-backbone' },
    ],
    mobileTapTargets: ['convex', 'custody', 'collat', 'models', 'single', 'roth', 'passive', 'regime', 'survive', 'liquid'],
    implementationNotes: 'New scorecard primitive: requirement rows × asset columns, quiet meet/partial/fail glyphs (shape-coded, not colour-only), Bitcoin column emphasised. Scores and aggregates taken from the Part 3 comparison table.',
  },

  {
    chartId: 'p3-volatility-is-the-toll', idx: 'P3-03', group: 'part-3', intendedPlacement: 'part-3',
    claimStack: {
      primaryClaim: 'Big Bitcoin drawdowns are small portfolio hits at a managed size',
      visualProof: 'A volatile Bitcoin line beside a calm total-portfolio line at a managed reserve',
      interactionRole: 'Hover the toll / calm marks; the intro scales the hit to your starting value',
      readerAction: 'See the drawdown sized to your portfolio',
      caution: 'Representative paths, not historical Bitcoin; illustrative, not a forecast',
    },
    interaction: { type: 'readerContext', gesture: 'type', conceptMatch: 'Entering a starting value scales the representative drawdown into a portfolio-impact figure' },
    status: 'needs-design-review', wiredPublic: false,
    title: 'Volatility Is the Toll', setupLine: 'Large Bitcoin drawdowns, small total-portfolio impact at a managed allocation',
    claimLabel: 'VOLATILITY · SIZING',
    frameworkClaim: 'Bitcoin volatility is the cost of convexity; sizing decides whether it is survivable.',
    readerTakeaway: 'The drawdown is the price of admission, not a reason to avoid it.',
    chartType: 'Representative Bitcoin path with deep drawdowns vs the calmer total-portfolio line at managed size.',
    visualDataMode: 'representative', disclosure: DISCLOSURE.representative, footerCta: 'View sources',
    sources: [
      { provider: 'ACF · Part 3', label: 'Volatility as the cost of convexity; sizing for survivability', role: 'verifies-concept', url: '/part-3-bitcoin-convexity-backbone' },
      { provider: 'ACF · Part 1', label: 'Survivable compounding', role: 'verifies-concept', url: '/part-1-foundation' },
    ],
    explainerHeadline: 'The volatility is the toll, not the risk.',
    explainerBody: 'Bitcoin pays in volatility for its convexity, with repeated drawdowns over fifty percent. Held at a managed reserve size, those drawdowns barely move the total portfolio. Sizing — not avoidance — is what makes the volatility survivable.',
    explainerConcept: 'Position sizing',
    concepts: [{ label: 'Position sizing', link: '/part-5-portfolio-construction-position-management' }, { label: 'Convexity', link: '/part-3-bitcoin-convexity-backbone' }],
    personalization: { uses: ['startingValue'], kind: 'vol-impact', assume: { alloc: 0.15, drawdown: 0.70 }, note: 'Translates the representative drawdown into a portfolio-impact figure at a 15% Bitcoin reserve. Illustrative, not a forecast.' },
    layout: 'single',
    ariaSummary: 'Two lines indexed to 100. A volatile Bitcoin line rises overall but suffers two deep drawdowns; the total-portfolio line, holding Bitcoin at a managed size, rises gently and stays calm through both.',
    domain: { xMin: 0, xMax: 100, yMin: 0, yMax: 230 }, yUnit: 'idx',
    xTicks: [{ v: 0, label: 'start' }, { v: 50, label: 'mid' }, { v: 100, label: 'now' }],
    yTicks: [{ v: 50 }, { v: 100 }, { v: 200 }],
    series: [
      { key: 'btc', tier: 'primary', label: 'Bitcoin', pts: p3Vol.btc },
      { key: 'portfolio', tier: 'reference', label: 'Portfolio', pts: p3Vol.portfolio },
    ],
    areas: [{ id: 'dd', topKey: 'btc', kind: 'peak', label: '' }],
    markers: [
      { id: 'toll', type: 'enso', x: p3Vol.trough.x, y: R(p3Vol.trough.y), r: 12, label: 'the toll · 50%+ drawdown', labelAnchor: 'start', labelDy: 22 },
      { id: 'calm', type: 'dot', x: p3Vol.trough.x, y: R(valueAt(p3Vol.portfolio, p3Vol.trough.x)), r: 3.2, label: 'portfolio barely moves', labelAnchor: 'start', labelDy: -12 },
    ],
    primaryKey: 'btc',
    hoverTargets: [
      { id: 'btc', kind: 'series', seriesKey: 'btc', label: 'Bitcoin', name: 'Bitcoin', why: 'Convex and volatile. The deep drawdowns are the cost of the upside, paid in full, repeatedly.', claim: 'Volatility is the toll for convexity.', concept: 'Convexity', link: '/part-3-bitcoin-convexity-backbone' },
      { id: 'portfolio', kind: 'series', seriesKey: 'portfolio', label: 'Portfolio', name: 'Total portfolio', why: 'Holding Bitcoin at a managed reserve size, the same 50%+ drawdowns barely register at the portfolio level.', claim: 'Sizing converts toll into something survivable.', concept: 'Position sizing', link: '/part-5-portfolio-construction-position-management' },
      { id: 'toll', kind: 'marker', label: 'The toll', name: 'The toll', why: 'A 50%+ Bitcoin drawdown. Unavoidable, and not the thing that ruins you if you are sized for it.', claim: 'Pay the toll; do not get ruined by it.', concept: 'Survivable compounding', link: '/part-1-foundation' },
      { id: 'calm', kind: 'marker', label: 'Portfolio holds', name: 'Portfolio holds', why: 'At the same moment Bitcoin is halved, the total portfolio is nearly flat — because the position was sized to survive it.', claim: 'Size is the shock absorber.', concept: 'Position sizing', link: '/part-5-portfolio-construction-position-management' },
    ],
    mobileTapTargets: ['toll', 'calm', 'btc', 'portfolio'],
    implementationNotes: 'Representative paths, not historical BTC. Drawdown-from-peak shaded behind the Bitcoin line; the portfolio line stays calm at managed size.',
  },

  {
    chartId: 'p3-exposure-not-control', idx: 'P3-04', group: 'part-3', intendedPlacement: 'part-3',
    experienceRole: 'comparison',
    storyBeats: [
      { kind: 'context', label: 'Three strategy paths drawn together through a drawdown', timing: 'early' },
      { kind: 'mechanism', label: 'Capacity and decision strain separate them', timing: 'middle' },
      { kind: 'action', label: 'Choose a strategy, then change the shock', timing: 'middle' },
      { kind: 'consequence', label: 'No line wins every path; the framework holds the tightest band', timing: 'late' },
    ],
    claimStack: {
      primaryClaim: 'Exposure can win one cycle; control is what survives many',
      visualProof: 'All three strategy paths drawn together, plus an across-all-paths robustness strip',
      interactionRole: 'Choose a strategy, then change the shock and watch outcome and decision strain move',
      readerAction: 'Pick a path, then stress it',
      caution: 'Representative simulation of total-portfolio paths (not Bitcoin price); not a forecast',
    },
    interaction: { type: 'scenario', gesture: 'choose', conceptMatch: 'Selecting a strategy and a shock redraws the emphasised path and its control read-outs' },
    motionProfile: { type: 'scenarioUpdate', duration: 'calm' },
    status: 'needs-design-review', wiredPublic: false,
    title: 'Exposure Is Not Control', setupLine: 'Choose the path. Then change the shock.',
    claimLabel: 'CONTROL · INTERACTIVE',
    frameworkClaim: '100% Bitcoin can win one favorable cycle; the framework optimizes for control across many.',
    readerTakeaway: 'Max exposure wins the clean bull case; the framework wins the messy path — balancing upside, capacity, and emotional control.',
    chartType: 'Interactive path-aware comparison of representative portfolio paths through a drawdown, with an optional shock.',
    visualDataMode: 'simulation', disclosure: DISCLOSURE.simulation, footerCta: 'View methodology',
    sources: [{ provider: 'Author simulation', label: 'Max-exposure vs architected reserve across a cycle', role: 'methodology', notes: 'Illustrative representative portfolio paths; no historical claim.' }, { provider: 'ACF · Part 3', label: 'Operational control across cycles and life events', role: 'verifies-concept', url: '/part-3-bitcoin-convexity-backbone' }],
    explainerHeadline: 'Winning a cycle is not the same as staying in control.',
    explainerBody: 'Maximum exposure can win the clean bull case. The framework exists for the path where drawdowns, income shocks, and opportunity arrive together — and for the hidden variable underneath them: decision strain. A portfolio only works if its owner can keep thinking clearly while it is down, hold the thesis, and still act. Framework reserve is the balanced posture; stress-tested reserve is the more defensive one. A strategy that cannot be lived through is not robust.',
    explainerConcept: 'Operational control',
    concepts: [{ label: 'Operational control', link: '/part-3-bitcoin-convexity-backbone' }, { label: 'Dry powder', link: '/part-5-portfolio-construction-position-management' }],
    personalization: { uses: ['startingValue'], kind: 'scenario-scale', note: 'Scales the simulation read-outs (terminal, drawdown, dry powder) to the reader simulation context. Illustrative, not a forecast.' },
    layout: 'scenario',
    ariaSummary: 'An interactive exhibit. Three representative total-portfolio paths, indexed to 100 — maximum exposure, framework reserve, and stress-tested reserve — are drawn together through a market drawdown, with an optional job-loss or deploy-at-trough shock. Maximum exposure peaks highest on a clean path; under a job-loss shock it is forced to sell at the bottom while the reserves absorb it; with dry powder the stress-tested reserve buys the trough, but that deployment spends its capacity, which then has to be rebuilt. Outcome read-outs cover upside (terminal value) and control (drawdown, remaining capacity, forced-sale risk, reserve integrity, control score).',
    scenario: {
      defaultPreset: 'reserve', defaultShock: 'none',
      domain: { yMin: p3Scenario.yMin, yMax: p3Scenario.yMax }, troughX: p3Scenario.troughX, peakX: p3Scenario.peakX,
      tradeoff: 'Framework reserve = balanced base case · stress-tested = defensive · maximum exposure = fragile when messy',
      presets: [
        { id: 'max', label: 'Maximum exposure', short: 'Max exposure', sub: '100% BTC', axis: 'upside' },
        { id: 'reserve', label: 'Framework reserve', short: 'Framework', sub: '~15% BTC + income', axis: 'control' },
        { id: 'stress', label: 'Stress-tested reserve', short: 'Stress-tested', sub: 'reserve + dry powder', axis: 'control' },
      ],
      shocks: [
        { id: 'none', label: 'Clean path' },
        { id: 'jobloss', label: 'Job loss in the drawdown' },
        { id: 'deploy', label: 'Deploy at the trough' },
      ],
      // annotation shown under the chart; keyed by shock, with a per-strategy nuance.
      notes: {
        none: { lead: 'Clean bull case rewards exposure.', max: 'Maximum exposure wins the upside — but it still rides the full cycle drawdown; the strain only shows once the path stops being clean.', reserve: 'The reserve gives up some clean-path upside to stay in control.', stress: 'The most control, the least clean-path upside — by design.' },
        jobloss: { lead: 'Messy path rewards control.', max: 'No wage buffer, no dry powder: maximum exposure is forced to sell at the bottom — the deepest drawdown and the highest decision strain.', reserve: 'Income covers the gap — the reserve is never a forced seller, so the strain stays bearable.', stress: 'Income plus dry powder: the shock is absorbed, the reserve stays intact, and the strain stays low.' },
        deploy: { lead: 'Opportunity rewards capacity.', max: 'Already all-in: no dry powder to buy the trough.', reserve: 'Framework keeps its balance — it deploys some capacity while staying diversified.', stress: 'Stress-tested deploys more because it began more defensive — the most dry powder makes the best entry.' },
      },
      variants: p3Scenario.variants,
    },
    primaryKey: 'reserve',
    hoverTargets: [
      { id: 'max', kind: 'strategy', label: 'Maximum exposure', name: 'Maximum exposure', why: 'Wins the clean bull case and nothing else. No wage buffer and no dry powder, so a drawdown plus an income shock forces a sale at the worst price — and the deepest drawdowns carry the highest decision strain, where panic-selling and abandoned theses happen.', claim: 'Highest upside, highest behaviour risk.', concept: 'Operational control', link: '/part-3-bitcoin-convexity-backbone' },
      { id: 'reserve', kind: 'strategy', label: 'Framework reserve', name: 'Framework reserve', why: 'The balanced posture: it participates in upside while preserving enough capacity and emotional bandwidth to act through a drawdown — without ever becoming a forced seller. This is the framework’s normal target.', claim: 'The balanced base case.', concept: 'Operational control', link: '/part-3-bitcoin-convexity-backbone' },
      { id: 'stress', kind: 'strategy', label: 'Stress-tested reserve', name: 'Stress-tested reserve', why: 'The defensive posture: the most capacity to deploy at a trough, at the cost of more cash drag in a clean bull market. Deployed capacity is governed and rebuilt over time — not a one-time timing bet.', claim: 'Defensive posture; most capacity to act.', concept: 'Dry powder', link: '/part-5-portfolio-construction-position-management' },
    ],
    mobileTapTargets: ['max', 'reserve', 'stress'],
    implementationNotes: 'INTERACTIVE SIMULATION — the headline Part 3 exhibit. All three strategy paths are drawn together under the selected shock; the chosen strategy is emphasised and the others stay as muted context. Click a path to select it. A capacity-to-act gauge, a trough/intervention zone, a forced-sale mark, and an annotation that updates with the shock carry the story; the stat strip (split into UPSIDE and CONTROL) is subordinate. Precomputed, deterministic representative paths — no live calc.',
  },

  {
    chartId: 'p3-models-must-converge', idx: 'P3-05', group: 'part-3', intendedPlacement: 'part-3',
    status: 'needs-design-review', wiredPublic: false,
    title: 'Models Must Converge', setupLine: 'The valuation models are most useful where they agree; divergence signals caution',
    claimLabel: 'VALUATION · CONVERGENCE',
    frameworkClaim: 'Power-law, realized price, production cost, and liquidity models are most useful when they converge.',
    readerTakeaway: 'Agreement strengthens conviction; disagreement is the signal.',
    chartType: 'Valuation envelope — the spread between models narrows on convergence, widens on divergence.',
    visualDataMode: 'representative', disclosure: DISCLOSURE.representative, footerCta: 'View sources',
    sources: [{ provider: 'ACF · Part 3', label: 'Multi-model valuation: power-law, realized price, production cost, liquidity', role: 'verifies-concept', url: '/part-3-bitcoin-convexity-backbone' }],
    explainerHeadline: 'Conviction lives where the models agree.',
    explainerBody: 'Power-law, realized price, production cost, and liquidity-adjusted models each see Bitcoin differently. When their estimates converge, conviction is highest; when they fan apart, the framework reads uncertainty and steps back. The spread itself is the signal.',
    explainerConcept: 'Model confluence',
    concepts: [{ label: 'Model confluence', link: '/part-3-bitcoin-convexity-backbone' }, { label: 'CIS scoring', link: '/part-6-convexity-framework-integrity-scoring' }],
    layout: 'single',
    ariaSummary: 'A valuation index with a shaded envelope between the highest and lowest model estimates. The envelope starts wide, narrows to a tight convergence mid-chart, then widens again into divergence; the price line tracks through the middle.',
    domain: { xMin: 0, xMax: 100, yMin: 0, yMax: 95 }, yUnit: 'idx',
    xTicks: [{ v: 0, label: 'divergent' }, { v: 50, label: 'convergence' }, { v: 100, label: 'divergent' }],
    yTicks: [{ v: 25 }, { v: 50 }, { v: 75 }],
    series: [
      { key: 'modelMax', tier: 'reference', hidden: true, pts: p3Models.modelMax },
      { key: 'modelMin', tier: 'reference', hidden: true, pts: p3Models.modelMin },
      { key: 'price', tier: 'primary', label: 'price', pts: p3Models.price },
    ],
    areas: [{ id: 'envelope', topKey: 'modelMax', botKey: 'modelMin', kind: 'gap', label: 'model range' }],
    markers: [
      { id: 'converge', type: 'enso', x: 50, y: R(valueAt(p3Models.price, 50)), r: 12, label: 'models converge · conviction', labelAnchor: 'middle', labelDy: -22 },
    ],
    notes: [{ x: 86, y: 30, text: 'divergence · caution', anchor: 'middle' }],
    primaryKey: 'price',
    hoverTargets: [
      { id: 'price', kind: 'series', seriesKey: 'price', label: 'Price', name: 'Price vs models', why: 'Where price sits inside the envelope matters less than how wide the envelope is.', claim: 'The spread, not the level, is the signal.', concept: 'Model confluence', link: '/part-3-bitcoin-convexity-backbone' },
      { id: 'converge', kind: 'marker', label: 'Convergence', name: 'Convergence', why: 'The four models agree here — the envelope is tight. This is where the framework holds its highest conviction.', claim: 'Agreement is conviction.', concept: 'CIS scoring', link: '/part-6-convexity-framework-integrity-scoring' },
    ],
    mobileTapTargets: ['converge', 'price'],
    implementationNotes: 'Representative envelope (min–max of four models), not historical. The band width is the message; avoid drawing four spaghetti lines.',
  },

  {
    chartId: 'p3-accumulate-dont-trade', idx: 'P3-06', group: 'part-3', intendedPlacement: 'part-3',
    experienceRole: 'conversion',
    storyBeats: [
      { kind: 'context', label: 'A representative BTC price index over a cycle', timing: 'early' },
      { kind: 'mechanism', label: 'Units = fixed dollars ÷ price, so a lower price buys more', timing: 'middle' },
      { kind: 'consequence', label: 'The framework leans in only when undervalued; never sells', timing: 'late' },
    ],
    claimStack: {
      primaryClaim: 'Fixed-dollar DCA buys more units when price is lower',
      visualProof: 'Unit bars whose height = dollars ÷ price; the framework boost stacks only in the undervalued window',
      interactionRole: 'Hover the price index and bars to see the conversion and the lean-in window',
      readerAction: 'Watch units rise as price falls',
      caution: 'Representative/conceptual — no historical price, no exact units; never sells the reserve',
    },
    interaction: { type: 'hover', gesture: 'hover', conceptMatch: 'The price index drives the DCA unit bars by default: units = dollars ÷ price; hover adds the lean-in / slow detail' },
    motionProfile: { type: 'timeSweep', duration: 'calm', relatedElements: [['priceIndex', 'unitBars']] },
    formula: 'DCA $ ÷ price = units',
    status: 'needs-design-review', wiredPublic: false,
    title: 'Accumulate, Don’t Trade', setupLine: 'Fixed-dollar DCA buys more units when Bitcoin is lower',
    claimLabel: 'DISCIPLINE · ACCUMULATION',
    frameworkClaim: 'Valuation models guide accumulation pacing and conviction, not selling the reserve.',
    readerTakeaway: 'For an accumulator, drawdowns become unit-capture windows — if the plan survives them.',
    chartType: 'Representative BTC price index with DCA unit bars: units = dollars ÷ price; the framework leans in only when undervalued and never sells.',
    visualDataMode: 'conceptual', disclosure: DISCLOSURE.conceptual, footerCta: 'View framework basis',
    sources: [{ provider: 'ACF · Part 3', label: 'Accumulation pacing and the never-sell reserve', role: 'verifies-concept', url: '/part-3-bitcoin-convexity-backbone' }],
    explainerHeadline: 'Same dollars, more units — when price is lower.',
    explainerBody: 'A fixed DCA amount already buys more units when Bitcoin falls — units received = dollars ÷ price. The framework adds discipline: increase accumulation only when valuation confirms an undervalued window, return to baseline at fair value, and slow new buying when extended. The reserve itself is not traded.',
    explainerConcept: 'Valuation discipline',
    concepts: [{ label: 'Valuation discipline', link: '/part-3-bitcoin-convexity-backbone' }, { label: 'Cold storage', link: '/part-3-bitcoin-convexity-backbone' }],
    layout: 'heartbeat',
    ariaSummary: 'A representative Bitcoin price/valuation index over a cycle — starting mid, dipping into an undervalued trough, recovering toward fair value, then running extended — drawn above a row of dollar-cost-averaging unit bars. Because units received equal fixed dollars divided by price, the bars grow taller when price is lower and shorter when it is higher. During the undervalued window the framework adds an accent boost above the baseline bars; at fair value it returns to baseline; when extended it slows new buying. The reserve is never sold.',
    domain: { xMin: 0, xMax: 100 },
    xTicks: [{ v: 0, label: 'cycle start' }, { v: 17, label: 'undervalued' }, { v: 100, label: 'extended' }],
    heartbeat: p3Heartbeat,
    primaryKey: 'cheap',
    hoverTargets: [
      { id: 'heartbeat', kind: 'series', label: 'BTC price index', name: 'BTC price index', why: 'A representative Bitcoin valuation path. A lower price increases the units a fixed-dollar DCA receives — units = dollars ÷ price. Representative, not historical price, not a forecast.', claim: 'Price is the input; units are the output.', concept: 'Valuation discipline', link: '/part-3-bitcoin-convexity-backbone' },
      { id: 'cheap', kind: 'marker', label: 'Same dollars, more units', name: 'Same dollars, more units', why: 'The same DCA dollars buy more representative units here because price is lower; in a confirmed undervalued window the framework leans in further, so the accent bars rise above the baseline bars.', claim: 'Lower price → more units captured.', concept: 'Valuation discipline', link: '/part-3-bitcoin-convexity-backbone' },
      { id: 'slows', kind: 'marker', label: 'Slows when extended', name: 'Slows new buying', why: 'When price is extended each dollar buys few units, so the framework slows discretionary new buying — the accent bars fall below baseline. Existing reserve is held, never sold.', claim: 'Slow new buying when dear; never sell.', concept: 'Valuation discipline', link: '/part-3-bitcoin-convexity-backbone' },
    ],
    mobileTapTargets: ['cheap', 'heartbeat', 'slows'],
    implementationNotes: 'Math-grounded accumulation layout (HeartbeatSvg, internal name): a representative BTC price index above DCA unit bars where bar height = fixed dollars ÷ price, so lower price = taller bars. The accent (framework) bar stacks above the muted baseline bar only in the undervalued window and falls below it when extended (slows, never sells). A small "DCA $ ÷ price = units" formula anchors the conversion; the relational unit-capture field is kept faint/secondary. Representative/conceptual — no historical price, no exact sats; "heartbeat" is not used as visible copy.',
  },

  {
    chartId: 'p3-cold-storage-to-borrow', idx: 'P3-07', group: 'part-3', intendedPlacement: 'part-3',
    status: 'deferred', wiredPublic: false,
    title: 'Cold Storage to Borrow', setupLine: 'The reserve lifecycle: accumulate, self-custody, mature, borrow — without a forced sale',
    claimLabel: 'LIFECYCLE · RESERVE',
    frameworkClaim: 'The Bitcoin reserve moves from accumulation to collateralized borrowing without forced sale.',
    readerTakeaway: 'Liquidity comes from borrowing against the reserve, not selling it.',
    chartType: 'Reserve lifecycle flow: accumulate → self-custody → mature → collateralized loan → liquidity.',
    visualDataMode: 'conceptual', disclosure: DISCLOSURE.conceptual, footerCta: 'View framework basis',
    sources: [{ provider: 'ACF · Part 3', label: 'Accumulation-to-borrowing reserve lifecycle', role: 'verifies-concept', url: '/part-3-bitcoin-convexity-backbone' }, { provider: 'ACF · Part 4', label: 'Buy-borrow-die and collateral', role: 'verifies-concept', url: '/part-4-tax-architecture-roc-strategy' }],
    explainerHeadline: 'Liquidity without selling the reserve.',
    explainerBody: 'The reserve is accumulated, moved to self-custody, and allowed to mature. Once mature, it becomes collateral: a loan against it provides liquidity without a sale, without a taxable event, and without giving up the long-duration exposure. The asset keeps working while it funds life.',
    explainerConcept: 'Buy-borrow-die',
    concepts: [{ label: 'Buy-borrow-die', link: '/part-4-tax-architecture-roc-strategy' }, { label: 'Cold storage', link: '/part-3-bitcoin-convexity-backbone' }],
    layout: 'flow',
    ariaSummary: 'A five-stage reserve lifecycle, left to right: accumulate, self-custody, mature reserve, collateralized loan, and liquidity without a sale.',
    flow: {
      stages: [
        { id: 's1', label: 'Accumulate', nodes: [{ id: 'accumulate', label: 'Accumulate', sub: 'paced by valuation' }] },
        { id: 's2', label: 'Custody', nodes: [{ id: 'custody', label: 'Self-custody', sub: 'sovereign control' }] },
        { id: 's3', label: 'Mature', nodes: [{ id: 'mature', label: 'Mature reserve', sub: 'long-duration hold' }] },
        { id: 's4', label: 'Collateral', nodes: [{ id: 'loan', label: 'Collateralized loan', sub: 'borrow, do not sell' }] },
        { id: 's5', label: 'Liquidity', nodes: [{ id: 'liquidity', label: 'Liquidity', sub: 'no sale, no tax event' }] },
      ],
    },
    primaryKey: 'liquidity',
    hoverTargets: [
      { id: 'accumulate', kind: 'node', label: 'Accumulate', name: 'Accumulate', why: 'Build the reserve steadily, paced by valuation rather than timing.', claim: 'Start by stacking.', concept: 'Valuation discipline', link: '/part-3-bitcoin-convexity-backbone' },
      { id: 'custody', kind: 'node', label: 'Self-custody', name: 'Self-custody', why: 'Move it to sovereign cold storage — bearer control, no intermediary.', claim: 'Hold your own keys.', concept: 'Cold storage', link: '/part-3-bitcoin-convexity-backbone' },
      { id: 'mature', kind: 'node', label: 'Mature reserve', name: 'Mature reserve', why: 'Let the position age into a long-duration reserve large enough to borrow against.', claim: 'Time turns it into collateral.', concept: 'Convexity backbone', link: '/part-3-bitcoin-convexity-backbone' },
      { id: 'loan', kind: 'node', label: 'Collateralized loan', name: 'Collateralized loan', why: 'Borrow against the reserve for liquidity instead of selling it.', claim: 'Borrow, do not sell.', concept: 'Buy-borrow-die', link: '/part-4-tax-architecture-roc-strategy' },
      { id: 'liquidity', kind: 'node', label: 'Liquidity', name: 'Liquidity without sale', why: 'Cash to use, with no taxable event and no loss of the long-duration exposure.', claim: 'Liquidity while still holding.', concept: 'Buy-borrow-die', link: '/part-4-tax-architecture-roc-strategy' },
    ],
    mobileTapTargets: ['accumulate', 'custody', 'mature', 'loan', 'liquidity'],
    implementationNotes: 'Lifecycle flow (linear stages). Conceptual diagram; the final liquidity node is the emphasised output.',
  },

  {
    chartId: 'p3-reserve-share-evolves', idx: 'P3-08', group: 'part-3', intendedPlacement: 'part-3',
    status: 'deferred', wiredPublic: false,
    title: 'Reserve Share Evolves', setupLine: 'A 10–15% reserve can mature into a 30–50% share, where borrow-phase governance begins',
    claimLabel: 'ALLOCATION · PHASE',
    frameworkClaim: 'A 10–15% reserve can evolve into a 30–50% mature share, at which point borrow-phase governance matters.',
    readerTakeaway: 'Success changes the job: from accumulating to governing the reserve.',
    chartType: 'Reserve share as a percent of net worth, rising through target, elevated, and mature phases.',
    visualDataMode: 'simulation', disclosure: DISCLOSURE.simulation, footerCta: 'View methodology',
    sources: [{ provider: 'Author simulation', label: 'Reserve share evolving via accumulation + appreciation', role: 'methodology', notes: 'Illustrative trajectory; ranges from the Part 3 allocation guidance.' }, { provider: 'ACF · Part 3', label: 'Reserve ranges and borrow-phase governance', role: 'verifies-concept', url: '/part-3-bitcoin-convexity-backbone' }],
    explainerHeadline: 'The reserve outgrows its target — on purpose.',
    explainerBody: 'A starting reserve of 10–15 percent, left to accumulate and appreciate, can grow into 30–50 percent of net worth over fifteen to twenty years. At that point the problem changes from building the reserve to governing it: this is where the borrow phase and its discipline begin.',
    explainerConcept: 'Reserve governance',
    concepts: [{ label: 'Reserve governance', link: '/part-3-bitcoin-convexity-backbone' }, { label: 'Buy-borrow-die', link: '/part-4-tax-architecture-roc-strategy' }],
    layout: 'single',
    ariaSummary: 'Reserve share as a percent of net worth rising over twenty years from about twelve percent, through a target ceiling near fifteen percent and an elevated band, into a mature thirty-to-fifty-percent zone where the borrow phase begins.',
    domain: { xMin: 0, xMax: 20, yMin: 0, yMax: 55 }, yUnit: '', valueUnit: '% of net worth',
    xTicks: [{ v: 0, label: 'yr 0' }, { v: 10, label: 'yr 10' }, { v: 20, label: 'yr 20' }],
    yTicks: [{ v: 15, label: '15%' }, { v: 30, label: '30%' }, { v: 45, label: '45%' }],
    series: [{ key: 'reserve', tier: 'primary', label: 'Reserve share', pts: p3Reserve.reserve }],
    guides: [
      { id: 'target', y: 15, kind: 'base', label: 'target 10–15%' },
      { id: 'mature', y: 30, kind: 'threshold', dash: true, label: 'mature · borrow phase' },
    ],
    markers: [
      { id: 'borrow', type: 'enso', x: 17, y: R(valueAt(p3Reserve.reserve, 17)), r: 12, label: 'borrow-phase governance', labelAnchor: 'end', labelDy: -16 },
    ],
    primaryKey: 'reserve',
    hoverTargets: [
      { id: 'reserve', kind: 'series', seriesKey: 'reserve', label: 'Reserve share', name: 'Reserve share', why: 'Accumulation plus appreciation grows the reserve from a target sliver into a dominant share of net worth.', claim: 'The share is meant to grow.', concept: 'Reserve governance', link: '/part-3-bitcoin-convexity-backbone' },
      { id: 'target', kind: 'level', label: 'Target 10–15%', name: 'Target reserve · 10–15%', why: 'The conservative starting allocation: enough to matter, sized to survive a 30–50% drawdown.', claim: 'Where most should begin.', concept: 'Position sizing', link: '/part-5-portfolio-construction-position-management' },
      { id: 'mature', kind: 'level', label: 'Mature · borrow phase', name: 'Mature · borrow phase', why: 'Past roughly 30 percent, the reserve dominates net worth and the discipline shifts to borrow-phase governance.', claim: 'Big enough to govern, not just hold.', concept: 'Reserve governance', link: '/part-3-bitcoin-convexity-backbone' },
      { id: 'borrow', kind: 'marker', label: 'Borrow phase', name: 'Borrow-phase governance', why: 'A mature reserve becomes collateral; managing leverage, drawdown, and liquidity now matters more than adding to it.', claim: 'The job changes from build to govern.', concept: 'Buy-borrow-die', link: '/part-4-tax-architecture-roc-strategy' },
    ],
    mobileTapTargets: ['borrow', 'mature', 'target', 'reserve'],
    implementationNotes: 'SIMULATION — illustrative trajectory; ranges (10–15% / 30–50%) from Part 3 allocation guidance. Phase thresholds shown as guides.',
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
  { id: 'part-2', label: 'Part 2 · lineage & macro thesis', blurb: 'How the framework thinks: intellectual lineage, what makes a macro thesis valid, how a structural force becomes capital flow, and how phase separates thesis validity from deployment timing.' },
  { id: 'part-3', label: 'Part 3 · Bitcoin convexity backbone', blurb: 'Bitcoin as the reserve asset: power-law valuation discipline, the ten backbone requirements, why volatility is the toll for convexity, and the accumulate-to-borrow reserve lifecycle.' },
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
