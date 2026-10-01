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
// Value formatters live in the shared chart-core facade (chart-core/format.mjs).
// They are the docs engine's ILLUSTRATIVE policy (coarse, non-positive→$0) — NOT a
// universal financial formatter; re-exported below under the established docs names.
import { formatIllustrativeMoney, formatIllustrativeCompactMoney, formatFractionPercent } from './chart-core/format.mjs';

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
  simulation: 'Representative simulation · Computed from stated inputs, not a forecast or a historical backtest',
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
// 'basis': a published figure or study an illustrative exhibit is drawn through
// or anchored on (D-CHART-DATA-POLICY, D-P1-ASSETS-VS-CPI). It is evidence for
// the marked points, not a plotted series.
export const SOURCE_ROLES = ['verifies-concept', 'backs-series', 'basis', 'methodology', 'target-source'];

// ── concept labels → where the book teaches them (D-CONCEPT-LINKS) ──────────
// One label, one target. Every concept chip, hover concept/READ link and
// explainerConcept uses a label from this map and links to exactly its target.
// The validator and tests/chart-concept-links.test.mjs hold every spec to it.
export const PART_ROUTES = {
  1: '/part-1-foundation',
  2: '/part-2-lineage-macro-thesis',
  3: '/part-3-bitcoin-convexity-backbone',
  4: '/part-4-tax-architecture-roc-strategy',
  5: '/part-5-portfolio-construction-position-management',
  6: '/part-6-convexity-framework-integrity-scoring',
};
const conceptTargets = {
  '1#manifesto': ['60/40 failure', 'Correlation regime', 'Fragility', 'Macro regime', 'Regime fit', 'Policy constraint', 'Sequence risk', 'Survivable compounding', 'Real assets'],
  '1#order-of-operations': ['Adaptation', 'Governed response'],
  '2#lineage': ['Barbell structure', 'Convexity', 'Method vs application', 'Reflexivity', 'Risk of ruin'],
  '2#macro-thesis': ['Capital pathways', 'Falsifiability', 'Valid thesis', 'Macro thesis', 'Macro thesis phase'],
  '2#thought-leaders': ['Liquidity cycle'],
  '3#backbone': ['Bitcoin backbone'],
  '3#survivability': ['Operational control'],
  '3#accumulate': ['Accumulation'],
  '3#valuation': ['Power law', 'Valuation discipline', 'Model convergence'],
  '3#tam': ['Buy-borrow-die', 'Cold storage', 'Reserve governance'],
  '4#edge': ['Tax architecture', 'Wrapper edge'],
  '4#roth': ['Right-tail outcomes'],
  '4#taxable': ['Return of capital', 'Taxable account'],
  '5#postures': ['Exposure', 'Posture'],
  '5#torque': ['Earned sizing', 'Position sizing', 'Concentration limits'],
  '5#ballast': ['Ballast', 'Dry powder', 'Rotation'],
  '5#hype': ['Hype', 'Stop-loss'],
  '5#management': ['Momentum filter', 'Correlation instability', 'Regime throttle', 'Tripwire', 'Earnings protocol', 'Event risk'],
  '5#forces': ['Regime force'],
  '5#governance': ['Change governance', 'Doctrine'],
  '6#cis': ['CIS'],
  '6#fis': ['FIS'],
  '6#interaction': ['Two-score kernel'],
  '6#weekly': ['Weekly loop'],
  '6#failure': ['Failure modes', 'Longitudinal health'],
};
export const CONCEPT_LINKS = Object.freeze(Object.fromEntries(Object.entries(conceptTargets).flatMap(([key, labels]) => {
  const [part, anchor] = key.split('#');
  return labels.map((label) => [label, `${PART_ROUTES[part]}#${anchor}`]);
})));
// Labels the map retired or merged. None may appear on a chart.
export const RETIRED_CONCEPT_LABELS = ['Risk asset', 'Carry posture', 'Convexity window', 'Governance', 'Invalidation', 'Withdrawal policy',
  'Governed loop', 'Barbell', 'Ruin', 'Convexity backbone', 'Model confluence', 'Momentum gate', 'Regime channels', 'Sector limits',
  'Thematic engine', 'CIS governance', 'CIS scoring', 'Part 6 CIS', 'Tripwires'];
export const LAYOUTS = ['single', 'dual', 'quadrant', 'loop', 'flow', 'systemLoop', 'governanceLoop', 'feedbackLoop', 'bridge', 'gate', 'scorecard', 'scenario', 'sequenceRisk', 'heartbeat', 'radial', 'laneBar', 'waterfall', 'rangeSteps'];

// Visual-relationship grammar — DEFINITIONS live in the shared, downward-only
// chart-core/grammar.mjs (leaf); re-exported here under the same names so the
// validator / inventory / renderers keep importing them from chart-specs. The
// dependency runs chart-core/grammar → chart-specs → engine (never upward).
export { VISUAL_RELATIONSHIPS, LAYOUT_RELATIONSHIPS, resolveVisualRelationship } from './chart-core/grammar.mjs';

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
export const PERSONAL_KINDS = ['scenario-scale', 'vol-impact', 'sequence-scale', 'horizon-scale', 'dca-note'];

// Promissory / forecast language that must never appear in a chart's VISIBLE
// claim copy (disclosure/caution/note legitimately say "not a forecast", so they
// are excluded from the scan). Representative exhibits scale, they do not predict.
export const BANNED_PROMISE_WORDS = ['forecast', 'guaranteed', 'guarantee', 'expected return', 'will outperform', 'risk-free', 'optimized'];

export const HORIZON_BANDS = [
  { id: '10y', label: '10 years', short: '10y', years: 10 },
  { id: '20y', label: '20 years', short: '20y', years: 20 },
  { id: '30y', label: '30+ years', short: '30+ yr', years: 30 },
  { id: 'legacy', label: 'Legacy', short: 'Legacy', years: 55 },
];

// ── standardized formatting (no cents, no false precision) ────────────────────
// Canonical definitions live in chart-core/format.mjs; re-exported here under the
// established names so every existing consumer keeps working unchanged.
export const formatStartingValue = formatIllustrativeMoney;   // (was a byte-identical inline copy)
export const formatCompactMoney = formatIllustrativeCompactMoney;
export const formatPercent = formatFractionPercent;
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
  // radial (arcs) and laneBar (bars) build like diagrams — staged reveal of the
  // composition/comparison, not a left→right time sweep.
  const diagrams = ['loop', 'flow', 'systemLoop', 'governanceLoop', 'feedbackLoop', 'bridge', 'gate', 'quadrant', 'radial', 'laneBar', 'waterfall', 'rangeSteps'];
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
  if (L === 'laneBar') return 'comparison';
  if (L === 'radial') return 'evidence';
  if (L === 'waterfall') return 'mechanism';
  if (L === 'rangeSteps') return 'comparison';
  if (['loop', 'flow', 'systemLoop', 'governanceLoop', 'feedbackLoop', 'bridge', 'gate', 'quadrant'].includes(L)) return 'diagram';
  return 'evidence';
}

// (resolveVisualRelationship is defined in chart-core/grammar.mjs and re-exported above.)
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
  if (L === 'heartbeat') return { interaction: 'tap-cycle', chartHeight: 'tall', note: 'Unit bars need vertical room; do not shrink too far.' };
  if (L === 'scorecard') return { interaction: 'scroll-x', chartHeight: 'auto', note: 'Matrix is content-sized; keep the asset header legible, horizontal scroll only if unavoidable.' };
  if (L === 'radial') return { interaction: 'tap-cycle', chartHeight: 'tall', note: 'Keep the donut substantial on touch; tap a segment to inspect its share. Do not shrink the ring into a token.' };
  if (L === 'laneBar') return { interaction: 'tap-cycle', chartHeight: 'tall', note: 'Bars stack full-width; keep the aligned compare segment and the difference callout legible; tap a segment to inspect.' };
  if (L === 'waterfall') return { interaction: 'tap-cycle', chartHeight: 'tall', note: 'Deduction steps need vertical room; tap a step to inspect its bucket and cap.' };
  if (L === 'rangeSteps') return { interaction: 'tap-cycle', chartHeight: 'tall', note: 'Range columns stack tight on touch; tap a band to read its rule. Guardrail labels stay outside the columns.' };
  if (['loop', 'flow', 'systemLoop', 'governanceLoop', 'feedbackLoop', 'bridge', 'gate', 'quadrant'].includes(L)) return { interaction: 'tap-cycle', chartHeight: 'standard', note: 'Diagram scales; tap nodes to cycle detail.' };
  return { interaction: 'tap-cycle', chartHeight: 'tall', note: 'Tap to cycle elements; keep the thesis line and labels legible.' };
}

// "Try this" cue: a quiet imperative shown ONLY where interaction is central
// (reveal / scenario / return-order / reader-context). On a coarse pointer the
// copy becomes touch-direct ("tap"/"drag") — explicit spec.tryThisMobile wins on
// coarse, spec.tryThis wins on desktop ('' opts out); hover-only charts get none.
export function resolveTryThis(spec, coarse = false) {
  if (coarse && typeof spec.tryThisMobile === 'string') return spec.tryThisMobile || null;
  const it = resolveInteraction(spec);
  if (coarse) {
    if (it.type === 'beforeAfterReveal') return 'Drag the divider, or tap the chart, to reveal the hidden cost';
    if (it.type === 'scenario') return 'Tap a strategy or shock, then compare the paths';
    if (it.type === 'returnOrder') return 'Tap a path or the return deck to compare the order';
    if (it.type === 'readerContext') return 'Enter your starting value above';
  }
  if (typeof spec.tryThis === 'string') return spec.tryThis || null;
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
// Chart-level intro line: discloses ONLY the inputs the chart honestly uses
// (spec.personalization.uses), reading their current values from the reader
// context. Updates live; never claims an input the chart does not consume.
export function getSimulationIntro(spec, ctx) {
  const p = spec.personalization;
  if (!p || !ctx) return null;
  const uses = p.uses || [];
  const sv = readStartingValue(ctx);
  const parts = [];
  if (uses.includes('startingValue')) {
    if (sv == null) return null;
    parts.push(`${formatStartingValue(sv)} start`);
  }
  if (uses.includes('monthlyDca') && isFinite(ctx.monthlyDca) && ctx.monthlyDca > 0) parts.push(`${formatStartingValue(ctx.monthlyDca)}/mo DCA`);
  if (uses.includes('withdrawalRate') && isFinite(ctx.withdrawalRate) && ctx.withdrawalRate > 0) parts.push(`${formatPercent(ctx.withdrawalRate)} withdrawals/yr`);
  if (uses.includes('btcReserveAllocation') && isFinite(ctx.btcReserveAllocation) && ctx.btcReserveAllocation > 0) parts.push(`${formatPercent(ctx.btcReserveAllocation)} Bitcoin reserve`);
  if (uses.includes('horizon') && ctx.horizon) parts.push(`${formatHorizon(ctx.horizon)} horizon`);
  if (!parts.length) return null;
  const tail = p.introTail ? ` · ${p.introTail}` : '';
  return `${p.introLead || 'Scaled example'} · ${parts.join(' · ')}${tail}`;
}
export function buildPersonalizedDisclosure(spec) {
  const p = spec.personalization;
  if (!p) return null;
  return p.disclosure || p.note || 'Scaled representative example · not a forecast or recommendation.';
}
// Resolve a horizon band id to a representative number of years (for charts whose
// outcome honestly depends on horizon).
export function horizonYears(id) {
  const b = HORIZON_BANDS.find((h) => h.id === id);
  return b && isFinite(b.years) ? b.years : 30;
}
// Chart-level computed callout (below the plot) — the ONE figure a chart honestly
// derives from the reader context that the intro line can't carry. Returns null
// unless the personalization kind has an honest computation. Never a forecast.
export function getSimulationNote(spec, ctx) {
  const p = spec.personalization;
  if (!p || !ctx) return null;
  const P = readStartingValue(ctx);
  if (p.kind === 'vol-impact') {
    if (P == null) return null;
    const alloc = isFinite(ctx.btcReserveAllocation) && ctx.btcReserveAllocation > 0 ? ctx.btcReserveAllocation : ((p.assume && p.assume.alloc) || 0.15);
    const dd = (p.assume && p.assume.drawdown) || 0.70;
    return `At a ${formatPercent(alloc)} Bitcoin reserve, a ${formatPercent(dd)} Bitcoin drawdown is roughly a ${formatStartingValue(P * alloc * dd)} hit (~${formatPercent(alloc * dd, 1)}) on a ${formatStartingValue(P)} portfolio. Representative, not a forecast.`;
  }
  if (p.kind === 'horizon-scale') {
    if (P == null) return null;
    const yrs = horizonYears(ctx.horizon);
    const cx = (spec.series || []).find((s) => s.key === 'convex') || (spec.series || []).find((s) => s.tier === 'primary');
    const pr = (spec.series || []).find((s) => s.key === 'prudent') || (spec.series || []).find((s) => s.tier === 'reference');
    if (!cx || !pr) return null;
    const cM = valueAt(cx.pts, yrs), pM = valueAt(pr.pts, yrs);
    if (!isFinite(cM) || !isFinite(pM)) return null;
    return `At a ${formatHorizon(ctx.horizon)} horizon on a ${formatStartingValue(P)} start, the convex path reaches ≈${formatStartingValue(P * cM)} versus ≈${formatStartingValue(P * pM)} conventional. Illustrative compounding, not a forecast.`;
  }
  return null;
}
// Tooltip value text: express the selected point THROUGH Simulation Context where
// it is mathematically honest, with the raw plotted value kept as secondary detail.
// Returns { primary, secondary } | null. Renderers pass either a raw plotted value
// (raw/unit/dec/valueNote) or a precomputed `dollars` + `rawLabel` (sequence /
// scenario, whose values are re-simulated at runtime). Non-personalized charts get
// the raw value unchanged.
export function getTooltipValueText(spec, ctx, opts = {}) {
  const P = readStartingValue(ctx);
  // explicit runtime dollars (sequence path end, scenario terminal): $ primary + raw secondary
  if (opts.dollars != null && isFinite(opts.dollars)) return { primary: formatCompactMoney(opts.dollars), secondary: opts.rawLabel || null };
  const p = spec && spec.personalization;
  // multiples (× start) → dollars, e.g. Time Changes Prudence
  if (p && p.kind === 'horizon-scale' && P != null && opts.raw != null && isFinite(opts.raw)) {
    return { primary: formatCompactMoney(P * opts.raw), secondary: `${opts.raw.toFixed(1)}× start · representative` };
  }
  // DCA: name the dollar amount; never fake exact units / sats
  if (p && p.kind === 'dca-note' && ctx && isFinite(ctx.monthlyDca) && ctx.monthlyDca > 0) {
    return { primary: `${formatStartingValue(ctx.monthlyDca)}/mo DCA`, secondary: 'representative units, not exact sats' };
  }
  // default: the raw representative value (unchanged for non-personalized charts)
  if (opts.raw != null && isFinite(opts.raw)) {
    return { primary: `${opts.raw.toFixed(opts.dec != null ? opts.dec : 1)} ${opts.unit || ''} · ${opts.valueNote || 'REPRESENTATIVE'}`.replace(/ {2,}/g, ' ').trim(), secondary: null };
  }
  return null;
}

// ════════════════════════════════════════════════════════════════════════════
// DATA SHAPES (representative / conceptual — deterministic so SSR == CSR)
// ════════════════════════════════════════════════════════════════════════════

// 60/40 in 2022 (representative, anchored). Exact only at the marked points:
// Dec 2021 = 100 for all three; Sep 2022 stocks 76.1, bonds 85.4; Oct 2022 bonds
// 84.3; Dec 2022 stocks 81.9, bonds 87.0. The other month-end knots are
// illustrative (rounded, not the index record), smoothed with a monotone cubic.
// The 60/40 line is a buy-and-hold 60/40 of the two drawn paths (Dec 2022 83.9,
// matching the published -16.1%).
const hedge = (() => {
  const mono = (k, xs) => {
    const n = k.length, dx = [], m = [], t = [];
    for (let i = 0; i < n - 1; i++) { dx[i] = k[i + 1][0] - k[i][0]; m[i] = (k[i + 1][1] - k[i][1]) / dx[i]; }
    t[0] = m[0]; t[n - 1] = m[n - 2];
    for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (dx[i - 1] + dx[i]) * 3 / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i]);
    return xs.map((x) => { let i = 0; while (i < n - 2 && x > k[i + 1][0]) i++; const h = dx[i], s = (x - k[i][0]) / h, s2 = s * s, s3 = s2 * s; return (2 * s3 - 3 * s2 + 1) * k[i][1] + (s3 - 2 * s2 + s) * h * t[i] + (-2 * s3 + 3 * s2) * k[i + 1][1] + (s3 - s2) * h * t[i + 1]; });
  };
  // month 0 = Dec 2021 ... month 12 = Dec 2022
  const sK = [100, 97, 94, 93, 89, 86, 82, 86, 84, 76.1, 80.5, 85, 81.9];
  const bK = [100, 98.5, 96.5, 94.5, 92, 91, 90, 90.5, 88.5, 85.4, 84.3, 86, 87.0];
  const pK = sK.map((s, i) => 0.6 * s + 0.4 * bK[i]);
  const xs = Array.from({ length: 49 }, (_, i) => i / 4);
  const path = (k) => mono(k.map((y, i) => [i, y]), xs).map((y, i) => ({ x: R(xs[i]), y: R(y) }));
  const stocks = path(sK), bonds = path(bK), p6040 = path(pK);
  return { stocks, bonds, p6040, end: { s: sK[12], b: bK[12], p: R(pK[12], 10) } };
})();

// Stock-Treasury correlation, 24-month rolling (representative, anchored). x is
// months from Jan 2014 (0) to Dec 2024 (131). Knots follow the published record:
// negative 2014 to 2021 (deepest 2020, about -0.35 at end-2021), zero crossing in
// early 2022, +0.5 to +0.75 through 2023 and 2024. Smoothed with a monotone cubic.
const corr = (() => {
  const mono = (k, xs) => {
    const n = k.length, dx = [], m = [], t = [];
    for (let i = 0; i < n - 1; i++) { dx[i] = k[i + 1][0] - k[i][0]; m[i] = (k[i + 1][1] - k[i][1]) / dx[i]; }
    t[0] = m[0]; t[n - 1] = m[n - 2];
    for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (dx[i - 1] + dx[i]) * 3 / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i]);
    return xs.map((x) => { let i = 0; while (i < n - 2 && x > k[i + 1][0]) i++; const h = dx[i], s = (x - k[i][0]) / h, s2 = s * s, s3 = s2 * s; return (2 * s3 - 3 * s2 + 1) * k[i][1] + (s3 - 2 * s2 + s) * h * t[i] + (-2 * s3 + 3 * s2) * k[i + 1][1] + (s3 - s2) * h * t[i + 1]; });
  };
  const K = [[0, -0.30], [12, -0.38], [24, -0.25], [36, -0.20], [48, -0.28], [60, -0.30], [71, -0.36], [78, -0.52], [83, -0.50], [90, -0.45], [95, -0.35], [97, 0.0], [99, 0.25], [104, 0.57], [113, 0.65], [119, 0.68], [125, 0.74], [131, 0.72]];
  const N = 131, flipStart = 87, flipEnd = 107;
  const xs = Array.from({ length: N + 1 }, (_, i) => i);
  const pts = mono(K, xs).map((y, i) => ({ x: i, y: R(y) }));
  const cross = pts.find((p) => p.y > 0) || pts[0];
  return { pts, flipStart, flipEnd, cross };
})();

// CPI vs assets, end-1999 = 100 (representative, anchored). x is years after the
// end of 1999 (25 = end of 2024). Drawn through the published checkpoints: CPI 188
// at end-2024; homes 185 at the July 2006 peak, 135 at the February 2012 low, 325
// at end-2024; the equal-weight buy-and-hold mix of US stocks with dividends,
// homes and gold about 617 at end-2024. Year-end knots between them are shaped to
// the record and smoothed with a monotone cubic; they are not plotted data.
const cpiAssets = (() => {
  const mono = (k, xs) => {
    const n = k.length, dx = [], m = [], t = [];
    for (let i = 0; i < n - 1; i++) { dx[i] = k[i + 1][0] - k[i][0]; m[i] = (k[i + 1][1] - k[i][1]) / dx[i]; }
    t[0] = m[0]; t[n - 1] = m[n - 2];
    for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (dx[i - 1] + dx[i]) * 3 / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i]);
    return xs.map((x) => { let i = 0; while (i < n - 2 && x > k[i + 1][0]) i++; const h = dx[i], s = (x - k[i][0]) / h, s2 = s * s, s3 = s2 * s; return (2 * s3 - 3 * s2 + 1) * k[i][1] + (s3 - 2 * s2 + s) * h * t[i] + (-2 * s3 + 3 * s2) * k[i + 1][1] + (s3 - s2) * h * t[i + 1]; });
  };
  const yearly = (arr) => arr.map((y, i) => [i, y]);
  const cpiK = yearly([100, 103.4, 105.1, 107.7, 109.9, 113.6, 117.4, 120.5, 125.2, 125.0, 128.7, 130.6, 134.6, 137.0, 139.0, 140.0, 140.9, 143.7, 146.8, 149.7, 153.4, 155.2, 166.4, 177.0, 182.9, 188]);
  const homeK = [[0, 100], [1, 109], [2, 117], [3, 129], [4, 143], [5, 163], [6, 181], [6.58, 185], [7, 183], [8, 172], [9, 150], [10, 145], [11, 140], [12, 137], [12.17, 135], [13, 145], [14, 161], [15, 169], [16, 177], [17, 186], [18, 197], [19, 206], [20, 214], [21, 239], [22, 283], [22.5, 310], [23, 297], [24, 314], [25, 325]];
  const mixK = yearly([100, 98, 97, 104, 123, 134, 150, 169, 191, 174, 204, 243, 256, 279, 245, 255, 242, 262, 298, 296, 352, 421, 463, 440, 509, 617]);
  const xs = Array.from({ length: 101 }, (_, i) => i / 4);
  const path = (k) => mono(k, xs).map((y, i) => ({ x: R(xs[i]), y: R(y) }));
  return { cpi: path(cpiK), housing: path(homeK), assets: path(mixK), marks: { homePeak: { x: 6.58, y: 185 }, homeLow: { x: 12.17, y: 135 }, end: { cpi: 188, housing: 325, assets: 617 } } };
})();

// Federal debt and interest, fiscal years 1980 to 2025 (historical). Values are
// FRED's published annual series, retrieved 2026-09-30, plotted as published:
//   FYPUGDA188S  Gross Federal Debt Held by the Public as Percent of Gross Domestic Product
//   FYOIGDA188S  Federal Outlays: Interest as Percent of Gross Domestic Product
// Source: U.S. Office of Management and Budget; Federal Reserve Bank of St. Louis.
const fiscal = (() => {
  const debtPct = [24.91507, 24.61459, 27.65127, 31.29577, 32.37061, 34.73859, 38.00743, 38.9231, 39.1793, 38.83132, 40.44175, 43.66586, 46.00536, 47.36272, 47.11114, 47.17956, 46.25348, 43.97875, 41.05898, 37.71504, 33.26325, 31.37046, 32.39423, 34.15892, 35.15946, 35.21843, 34.95328, 34.78666, 39.29014, 52.11124, 59.93034, 64.92547, 69.4052, 70.98469, 72.57951, 71.69547, 75.33989, 74.7773, 76.24519, 77.99774, 98.32245, 93.92368, 93.08678, 94.33358, 96.23144, 98.06613];
  const interestPct = [1.83855, 2.14422, 2.54298, 2.4713, 2.75168, 2.98407, 2.97004, 2.85489, 2.89897, 2.99528, 3.09144, 3.15758, 3.05727, 2.8973, 2.78476, 3.0385, 2.98587, 2.84445, 2.66052, 2.38554, 2.17491, 1.94829, 1.56416, 1.33613, 1.31163, 1.41102, 1.6402, 1.63815, 1.7113, 1.29093, 1.3037, 1.47414, 1.35603, 1.30851, 1.30029, 1.2199, 1.27644, 1.33872, 1.57323, 1.74168, 1.61621, 1.48505, 1.8265, 2.36689, 3.0032, 3.15344];
  const debt = debtPct.map((y, i) => ({ x: 1980 + i, y }));
  const interest = interestPct.map((y, i) => ({ x: 1980 + i, y }));
  return { debt, interest, retrieved: '2026-09-30', peak1991: interestPct[11], low2015: interestPct[35] };
})();

// Sequence of returns (simulation). ONE set of 12 annual returns, plotted in two
// orders; both portfolio paths are computed from it, so the deck and the lines are
// the same math: v(i+1) = v(i) * (1 + r) - w, with w a fixed share of the starting
// balance withdrawn after each year's return. At w = 4%: gains first ends 1.158,
// losses first 0.475. At 6%, losses first reaches zero in year 12.
const sequence = (() => {
  // annual returns, % (good order = gains first / losses last)
  const good = [30, 24, 19, 15, 11, 8, 5, 1, -4, -10, -17, -25];
  const bad = [...good].reverse();                       // same set, opposite order
  const N = good.length;
  const start = 1, withdraw = 0.04;                       // normalized: 1 = starting balance; 4% of it withdrawn each year
  const sim = (order) => { const out = [{ x: 0, y: start }]; let v = start; order.forEach((r, i) => { v = Math.max(0, v * (1 + r / 100) - withdraw); out.push({ x: i + 1, y: R(v, 10000) }); }); return out; };
  const goodPath = sim(good), badPath = sim(bad);
  let trough = { x: 0, y: 9 }; badPath.forEach((p) => { if (p.y < trough.y) trough = p; });
  const avgPct = R(good.reduce((a, b) => a + b, 0) / N, 100);
  // depletion: the renderer's threshold line. 0 puts it on the zero-balance baseline.
  return { good, bad, N, start, withdraw, goodPath, badPath, goodEnd: goodPath[N].y, badEnd: badPath[N].y, trough, avgPct, depletion: 0 };
})();

// Fixed monthly purchase along a drawn price path (representative). 85 month-ends
// over seven years; the drawn price falls 74% and then 73% from its peaks (depths
// like 2018 and 2021-22, not their dates). 84 equal contributions sum to 100.
// units += contribution / price; value = units * price. Value ends near 695 (about
// 7x invested) after falling about 71% from its peak in the second fall.
const survival = (() => {
  const mono = (k, xs) => {
    const n = k.length, dx = [], m = [], t = [];
    for (let i = 0; i < n - 1; i++) { dx[i] = k[i + 1][0] - k[i][0]; m[i] = (k[i + 1][1] - k[i][1]) / dx[i]; }
    t[0] = m[0]; t[n - 1] = m[n - 2];
    for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (dx[i - 1] + dx[i]) * 3 / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i]);
    return xs.map((x) => { let i = 0; while (i < n - 2 && x > k[i + 1][0]) i++; const h = dx[i], s = (x - k[i][0]) / h, s2 = s * s, s3 = s2 * s; return (2 * s3 - 3 * s2 + 1) * k[i][1] + (s3 - 2 * s2 + s) * h * t[i] + (-2 * s3 + 3 * s2) * k[i + 1][1] + (s3 - s2) * h * t[i + 1]; });
  };
  const priceK = [[0, 1], [4, 0.62], [11, 0.26], [17, 0.8], [23, 0.55], [26, 0.48], [32, 0.85], [36, 2.1], [39, 4.3], [42, 2.7], [46, 4.5], [53, 2.4], [59, 1.2], [64, 2.1], [72, 3.1], [76, 5.0], [82, 4.6], [84, 7.0]];
  const months = Array.from({ length: 85 }, (_, i) => i);
  const price = mono(priceK, months);
  const c = 100 / 84;
  let units = 0;
  const invested = [], value = [];
  months.forEach((i) => {
    if (i < 84) units += c / price[i];
    invested.push({ x: R(i / 12), y: R(c * Math.min(i + 1, 84)) });
    value.push({ x: R(i / 12), y: R(units * price[i]) });
  });
  // deepest drawdown from running peak
  let peak = -Infinity, trough = { x: 0, dd: 0, y: 0 };
  value.forEach((p) => { peak = Math.max(peak, p.y); const dd = (peak - p.y) / peak; if (dd > trough.dd) trough = { x: p.x, dd, y: p.y }; });
  return { invested, value, trough };
})();

// Signature payoff curve (conceptual). The shaped curve carries a 0.12 cost term
// (-0.74 rather than -0.62), so it trails the symmetric line between x = -0.33
// and x = 0.46 by at most about 0.12: convexity is paid for near the base case.
// It flattens toward -0.74 on the left (-0.654 at x = -1) and accelerates on the
// right. Both series share one x grid so the cost sliver can be drawn between them.
const payoff = (() => {
  const n = 90;
  const shaped = curve(-1, 1.6, n, (t, x) => 0.9 * softplus(2.3 * x) - 0.74 + 0.35 * Math.pow(Math.max(0, x), 2), 0, 0);
  const linear = curve(-1, 1.6, n, (t, x) => 1.2 * x, 0, 0);
  return { shaped, linear, bound: R(valueAt(shaped, -1)) };
})();

// Signature distribution reshape (conceptual). The ACF curve is area- and
// mean-preserving against the unit normal over [-3, 4] (area 2.501 vs 2.503,
// mean -0.01 vs 0.00): probability is moved, never added. It crosses the
// reference at x = -1.17, 0.19 and 1.91, so it is thinner in the deep-loss tail,
// heavier just below the base case, thinner through moderate gains and longer
// in the far right tail. Peak 1.54 at x = -0.34.
const shape = (() => {
  const n = 120;
  const symmetric = curve(-3, 4, n, (t, x) => Math.exp(-(x * x) / (2 * 1.0 * 1.0)), 0, 0);
  const shaped = curve(-3, 4, n, (t, x) => 1.522 * (Math.exp(-Math.pow(x + 0.35, 2) / (2 * 0.55 * 0.55)) + 0.107 * Math.exp(-Math.pow(x - 1.8, 2) / 2)), 0, 0);
  return { symmetric, shaped };
})();

// Entry-patience path (conceptual, seed 37). Over x <= 50 the path ranges from
// 97.4 to 102.6 and first clears that range at x = 57.3, so the confirmation
// marker sits at x = 60 (about 105.7), after the break rather than inside it.
const window_ = (() => {
  const n = 110;
  const value = curve(0, 100, n, (t) => (t < 0.5 ? 100 + 2.4 * Math.sin(t * 70) : 100 + 100 * Math.pow((t - 0.5) / 0.5, 1.8)), 37, 0.6);
  return { value };
})();

// ── Part 2 · lineage & macro thesis (representative / conceptual) ────────────
const p2Method = (() => {
  const n = 130;
  const spine = 50;                                            // the method is a fixed central axis
  // The macro thesis moves around the method spine: expressed above it in regime A,
  // crossing through it at the transition, below it in regime B, crossing again,
  // and back above it in regime C (and staying above to the end). Two clean
  // crossings near the regime boundaries; small organic waver, never noisy.
  const thesis = curve(0, 100, n, (t) => spine + 27 * Math.cos(t * 2.7 * Math.PI - 1.272) + 3.5 * Math.sin(t * Math.PI * 6), 211, 1.0);
  return { thesis, spine, cross1: 33.5, cross2: 70.5 };
})();
const p2Ruin = (() => {
  const n = 110;
  const robust = curve(0, 100, n, (t) => 100 + 6 * Math.sin(t * 16) - 26 * Math.exp(-Math.pow((t - 0.5) / 0.12, 2)), 221, 1.4);
  const fragile = curve(0, 100, n, (t) => Math.max(12, 100 + 6 * Math.sin(t * 16 + 1) - 88 * ss(clamp((t - 0.52) / 0.12, 0, 1))), 223, 1.4);
  const crossX = (fragile.find((p) => p.y < 30) || fragile[fragile.length - 1]).x;
  return { robust, fragile, crossX };
})();
// x reads as CIS (0 to 100). The framework line traces Part 5's Torque band ceilings
// (0 below CIS 50; 2–4, 4–8 and 8–15 percent, linear within each band), scaled so
// 15 percent sits on the cap level (y = 20). No noise, so it never crosses the cap.
const p2Conviction = (() => {
  const n = 100;
  const torqueCeiling = (c) => (c < 50 ? 0 : c < 60 ? 2 + (c - 50) * 0.2 : c < 70 ? 4 + (c - 60) * 0.4 : 8 + (c - 70) * (7 / 30));
  const disciplined = curve(0, 100, n, (t, x) => (20 / 15) * torqueCeiling(x), 231, 0);
  const reckless = curve(0, 100, n, (t) => 6 + 42 * Math.pow(t, 1.6), 233, 0.5);
  return { disciplined, reckless };
})();
// Part 5's inputs: the same 10 percent a year, tax-free versus taxed every year at a
// 25 percent blended rate on realized gains (7.5 percent net). Deterministic, no noise.
// Checkpoints: year 30 17.4× vs 8.8× (about 2×) · year 70 790× vs 158× (about 5×).
const p2Time = (() => {
  const n = 140;
  const taxed = curve(0, 70, n, (t, x) => Math.pow(1.075, x), 241, 0);
  const taxfree = curve(0, 70, n, (t, x) => Math.pow(1.10, x), 243, 0);
  return { taxed, taxfree };
})();
// Sizing peaks near 70, leaving a clear band (minimum gap about 17) under the flat
// validity line at 88.
const p2Phase = (() => {
  const n = 100;
  const validity = curve(0, 100, n, () => 88, 251, 0.7);
  const sizing = curve(0, 100, n, (t) => 12 + 58 * ss(clamp(t / 0.55, 0, 1)) - 22 * ss(clamp((t - 0.7) / 0.3, 0, 1)), 253, 1.0);
  return { validity, sizing };
})();
// Representative: one liquidity cycle, and an asset moving in phase with it on a wider
// swing plus a faster wiggle that sometimes runs against the tide. No lag is drawn:
// the cited study measures direction, not timing.
const p2Liquidity = (() => {
  const n = 120;
  const liquidity = curve(0, 100, n, (t) => 50 + 14 * Math.sin(t * Math.PI * 2.0), 261, 0.8);
  const asset = curve(0, 100, n, (t) => 55 + 30 * Math.sin(t * Math.PI * 2.0) + 5 * Math.sin(t * Math.PI * 14 + Math.PI), 263, 1.5);
  return { liquidity, asset };
})();

// ── Part 3 · Bitcoin convexity backbone (representative / conceptual) ─────────
const p3Power = (() => {
  const n = 120;
  const central = curve(0, 100, n, (t) => 3.0 + 2.65 * t, 301, 0); // log-scale schematic: one unit = one decade; no price levels claimed
  const upper = central.map((p) => ({ x: p.x, y: R(p.y + 0.55) }));
  const lower = central.map((p) => ({ x: p.x, y: R(p.y - 0.55) }));
  const rng = mulberry32(303);
  const price = central.map((p, i) => {
    const t = i / n;
    let dev = 0.40 * Math.sin(t * Math.PI * 6.2) + 0.15 * Math.sin(t * Math.PI * 12.6);
    dev += 0.30 * Math.exp(-Math.pow((t - 0.34) / 0.028, 2)) + 0.30 * Math.exp(-Math.pow((t - 0.72) / 0.028, 2)); // euphoria
    dev -= 0.65 * Math.exp(-Math.pow((t - 0.52) / 0.03, 2)); // capitulation: deep enough to close below the lower band once
    return { x: p.x, y: R(p.y + dev + (rng() - 0.5) * 0.05) };
  });
  let euph = { x: 0, y: 0, d: -9 }, cap = { x: 0, y: 0, d: -9 };
  price.forEach((p, i) => { const a = p.y - upper[i].y; if (a > euph.d) euph = { x: p.x, y: p.y, d: a }; const b = lower[i].y - p.y; if (b > cap.d) cap = { x: p.x, y: p.y, d: b }; });
  return { central, upper, lower, price, euph, cap, last: price[price.length - 1] };
})();
const p3Vol = (() => {
  // Representative Bitcoin path, indexed to 100 at the start: a rise, a fall of
  // about 77 percent (the depth of 2021 to 2022), a new high, a fall of about
  // 54 percent (the depth of 2025 to 2026), a partial recovery. Not plotted data.
  const n = 120, W = 0.15;
  const btc = curve(0, 100, n, (t) => {
    const rise1 = 100 + 230 * ss(clamp(t / 0.3, 0, 1));
    const fall1 = -258 * ss(clamp((t - 0.3) / 0.16, 0, 1));
    const rise2 = 315 * ss(clamp((t - 0.48) / 0.26, 0, 1));
    const fall2 = -211 * ss(clamp((t - 0.76) / 0.12, 0, 1));
    const rise3 = 70 * ss(clamp((t - 0.9) / 0.1, 0, 1));
    return rise1 + fall1 + rise2 + fall2 + rise3 + 9 * Math.sin(t * Math.PI * 14);
  }, 311, 4);
  // The portfolio is COMPUTED from the Bitcoin line: Bitcoin is set to W (15%) of
  // the portfolio at each new Bitcoin high and left alone through each fall; the
  // other 85% is held flat so the line isolates Bitcoin's effect. A reserve left
  // to grow (the framework never trims) would enter a fall larger, and lose more.
  let bv = W * 100, rv = (1 - W) * 100, peakB = btc[0].y;
  const portfolio = [{ x: btc[0].x, y: 100 }];
  for (let i = 1; i <= n; i++) {
    bv *= btc[i].y / btc[i - 1].y;
    const v = bv + rv;
    if (btc[i].y >= peakB) { peakB = btc[i].y; bv = W * v; rv = (1 - W) * v; }
    portfolio.push({ x: btc[i].x, y: R(v) });
  }
  const worst = (pts) => { let pk = -9, best = { x: 0, y: 0, dd: 0 }; pts.forEach((p) => { pk = Math.max(pk, p.y); const d = (pk - p.y) / pk; if (d > best.dd) best = { x: p.x, y: p.y, dd: d }; }); return best; };
  const trough = worst(btc);
  const portDD = worst(portfolio.filter((p) => p.x <= trough.x + 5));
  const later = worst(btc.filter((p) => p.x >= 60));
  const laterPort = worst(portfolio.filter((p) => p.x >= 60));
  // Printed figures are derived from the drawn data: Bitcoin falls to the nearest
  // percent, portfolio falls to the nearest half percent.
  return { btc, portfolio, trough, W, btcPct: Math.round(trough.dd * 100), portPct: Math.round(portDD.dd * 200) / 2, laterPct: Math.round(later.dd * 100), laterPortPct: Math.round(laterPort.dd * 200) / 2 };
})();
const p3Models = (() => {
  const n = 120;
  const center = (t) => 30 + 52 * t;
  const spread = (t) => 22 - 18 * Math.exp(-Math.pow((t - 0.5) / 0.14, 2)) + 9 * ss(clamp((t - 0.72) / 0.28, 0, 1));
  const modelMax = curve(0, 100, n, (t) => center(t) + spread(t), 331, 0);
  const modelMin = curve(0, 100, n, (t) => center(t) - spread(t), 333, 0);
  // Price swings scale with the spread, so the line stays inside the model range
  // everywhere, including the tight waist where the models converge.
  const price = curve(0, 100, n, (t) => center(t) + 0.6 * spread(t) * Math.sin(t * Math.PI * 5), 335, 1.4);
  return { modelMax, modelMin, price };
})();
const p3Heartbeat = (() => {
  // Representative BTC PRICE / VALUATION INDEX over one cycle: starts below fair
  // value, dips into an undervalued trough, recovers toward fair value, runs
  // extended. Gentle chop: a price index, not a frantic line. NOT historical, NOT a forecast.
  const n = 132;
  const trend = (t) => 0.5 - 0.34 * Math.exp(-Math.pow((t - 0.17) / 0.12, 2)) + 1.18 * ss(clamp((t - 0.3) / 0.7, 0, 1));
  const chop = (t) => 0.05 * Math.sin(t * Math.PI * 6) + 0.03 * Math.sin(t * Math.PI * 13 + 1);
  const priceFn = (t) => clamp(trend(t) + chop(t), 0.12, 1.95);
  const price = curve(0, 100, n, (t) => priceFn(t), 371, 0.008);
  // The mechanism, made explicit: units received = fixed DCA dollars / price.
  // A constant dollar amount buys MORE units when price is lower. The framework
  // leans in (x1.5, Part 3's "raise DCA about 50 percent") only while price is
  // deep in the undervalued zone, returns to baseline nearer fair value, and halves
  // discretionary buying (x0.5) when extended, keeping the difference as dry
  // powder. The multiplier is keyed to price, not to time. It never sells.
  const DCA = 1;                                          // representative fixed dollar amount / interval
  const bars = 26;
  const pulses = [];
  let baseCum = 0, fwCum = 0, baseDollars = 0, fwDollars = 0;
  for (let i = 0; i < bars; i++) {
    const t = (i + 0.5) / bars;
    const p = priceFn(t);
    const baseUnits = DCA / p;                            // units = dollars / price
    const m = p < 0.5 ? 1.5 : p > 1.2 ? 0.5 : 1.0;        // framework accumulation-pacing multiplier, keyed to price
    const fwUnits = (DCA * m) / p;
    baseCum += baseUnits; fwCum += fwUnits; baseDollars += DCA; fwDollars += DCA * m;
    pulses.push({ x: R(t * 100), base: R(baseUnits), fw: R(fwUnits), boost: m > 1, slow: m < 1 });
  }
  const maxUnit = Math.max(...pulses.map((q) => q.fw));
  const pmin = Math.min(...price.map((p) => p.y)), pmax = Math.max(...price.map((p) => p.y));
  // Like for like: the readout (fwPct) is units PER DOLLAR against the baseline,
  // because the framework path spends a slightly different total.
  const fwPct = Math.round(((fwCum / fwDollars) / (baseCum / baseDollars) - 1) * 100);
  const unitsPct = Math.round((fwCum / baseCum - 1) * 100), dollarsPct = Math.round((fwDollars / baseDollars - 1) * 100);
  return { price, pulses, maxUnit, pmin, pmax, windowX0: 2, windowX1: 34, troughX: 17, fwPct, unitsPct, dollarsPct };
})();
const p3Reserve = (() => {
  const n = 100;
  // Illustrative trajectory: share (percent) = 12 + 34 x (year / 20)^2.3, plus small
  // drawn noise. It first reaches the 30 percent mature guide after year 15 and
  // reads about 46 percent at year 20. Reaching about 45 percent in 20 years with
  // no new contributions implies Bitcoin outgrowing the rest of the portfolio by
  // roughly 9 to 10 percent a year on average.
  const reserve = curve(0, 20, n, (t) => 12 + 34 * Math.pow(t, 2.3), 351, 0.5);
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
  // w = share that tracks Bitcoin; dp = dry powder (capacity to act); income = an
  // income sleeve (portfolio income that keeps paying when a paycheck stops).
  // More control trades clean-path upside for a smaller drawdown and more capacity.
  const presets = {
    max: { w: 1.0, dp: 0.0, income: false },                // 100% BTC
    reserve: { w: 0.15, dp: 0.15, income: true },           // framework reserve: matches Part 3's Investor B (15% BTC, 15% dry powder)
    stress: { w: 0.10, dp: 0.50, income: true },            // reserve + deliberate dry powder
  };
  // participation = clean-path upside capture vs the all-in ceiling. Underparticipation
  // (cash drag) shows up as a low score; the framework's balance is the reference.
  const cleanTerm = {};
  ['max', 'reserve', 'stress'].forEach((pk) => { const p = presets[pk]; cleanTerm[pk] = p.w * market[n] + (1 - p.w) * stable(1); });
  const partOf = (pk) => clamp(Math.round(100 * (cleanTerm[pk] - 100) / ((cleanTerm.max - 100) || 1)), 6, 100);
  const participation = { max: partOf('max'), reserve: partOf('reserve'), stress: partOf('stress') };
  const partRef = participation.reserve;                    // the balanced posture is the reference
  const build = (pk, shock) => {
    const p = presets[pk];
    const value = [];
    for (let i = 0; i <= n; i++) {
      const t = T(i);
      let v = p.w * market[i] + (1 - p.w) * stable(t);
      if (i >= troughI) {
        // job loss: no income sleeve + little dry powder forces a sale into the bottom.
        if (shock === 'jobloss') v -= (!p.income && p.dp < 0.2) ? 0.30 * market[i] : 2;
        // OPPORTUNITY WINDOW (not perfect bottom-timing): deploy PART of the reserve
        // during the drawdown, entering ABOVE the low; capture a modest, realistic
        // share of the rebound. The value is "had capacity to act," not "timed it".
        else if (shock === 'deploy') v += p.dp * 0.40 * Math.max(0, market[i] - (market[troughI] + 20));
      }
      value.push({ x: R(t * 100), y: R(Math.max(20, v)) });
    }
    let peak = -9, maxDD = 0; value.forEach((q) => { peak = Math.max(peak, q.y); maxDD = Math.max(maxDD, (peak - q.y) / peak); });
    const forced = shock === 'jobloss' && !p.income && p.dp < 0.2;
    const deployed = shock === 'deploy' && p.dp > 0;
    const dryPowder = Math.round(p.dp * 100);
    const integrity = forced ? 62 : 100;
    // control = operational control / balance; deploying dry powder deliberately is
    // the point, so it is NOT penalized here. Reserves stay strong, max stays fragile.
    const control = Math.max(6, Math.min(100, Math.round(100 - maxDD * 72 + dryPowder * 0.32 - (forced ? 34 : 0) - (p.income ? 0 : 8))));
    // decision strain: deep drawdowns, forced sales, and no income buffer raise the
    // behavioral load where panic-selling happens; capacity and income lower it.
    // Acting in the window takes some nerve: a modest, non-punishing bump.
    const strainN = maxDD * 100 * 0.85 + (forced ? 40 : 0) + (p.income ? 0 : 16) + (shock === 'jobloss' ? 18 : 0) + (deployed ? 14 : 0) - dryPowder * 0.45;
    const strain = strainN >= 95 ? 'Extreme' : strainN >= 55 ? 'High' : strainN >= 26 ? 'Moderate' : 'Low';
    const strainPen = strain === 'Extreme' ? 32 : strain === 'High' ? 16 : strain === 'Moderate' ? 6 : 0;
    const part = participation[pk];
    // LIVABILITY (repeatability): the balanced posture is the reference. Drawdown,
    // forced sale, strain, AND deviation from balanced participation all cost: under
    // = cash drag (defensive), over = fragility (all-in). Deterministic + illustrative.
    const partPen = part < partRef ? (partRef - part) * 1.25 : (part - partRef) * 0.30;
    const livability = Math.max(6, Math.min(100, Math.round(100 - maxDD * 100 * 0.30 - (forced ? 30 : 0) - strainPen - partPen)));
    return { value, stats: { terminal: Math.round(value[value.length - 1].y), maxDD: Math.round(maxDD * 100), dryPowder, forced, deployed, integrity, control, strain, participation: part, livability } };
  };
  const variants = {};
  let yMax = 0, yMin = 1e9;
  ['max', 'reserve', 'stress'].forEach((pk) => ['none', 'jobloss', 'deploy'].forEach((sh) => {
    const r = build(pk, sh); variants[`${pk}|${sh}`] = r; r.value.forEach((q) => { yMax = Math.max(yMax, q.y); yMin = Math.min(yMin, q.y); });
  }));
  // governable corridor: the index range the framework lives in across the cycle.
  // The framework stays inside; max exits both ways (euphoria, then crash); the
  // defensive reserve hugs the lower edge (underparticipation).
  const rc = variants['reserve|none'];
  let rcLo = 1e9; rc.value.forEach((q) => { rcLo = Math.min(rcLo, q.y); });
  const band = { lo: Math.round(rcLo - 8), hi: Math.round(rc.stats.terminal + 25) };
  return {
    variants, troughX: R(T(troughI) * 100),
    peakX: R(T(market.indexOf(Math.max(...market.slice(0, troughI)))) * 100),
    yMax: Math.ceil((yMax + 12) / 10) * 10,
    yMin: Math.max(0, Math.floor((yMin - 14) / 10) * 10),
    band,
  };
})();

// Tax wedge (single): after-tax value kept per dollar inside each account, as a
// winning position scales from 1x to 30x. One set of representative federal rates
// is shared by every Part 4 exhibit. Roth keeps 100% (qualified withdrawal).
// Taxable keeps the principal plus ~76.2% of the gain (23.8% = 20% long-term gains
// rate + 3.8% NIIT, the rate a large one-time sale can reach). Pre-tax keeps ~70%
// of the WHOLE withdrawal, principal included (about 30% blended ordinary rate on
// withdrawals spread over years; a deducted contribution has no basis). Roth and
// taxable start together at (1x, 1x); pre-tax starts at 0.70x. The deduction a
// pre-tax contribution earned going in is not drawn, so the Roth-to-pre-tax gap is
// not a win-size effect: the shaded wedge is Roth against taxable, the gap that
// grows with the size of the win. Illustrative rates, not a specific investor.
const taxWedge = (() => {
  const n = 60, x0 = 1, x1 = 30;
  const roth = curve(x0, x1, n, (t, x) => x);                       // keeps 100%
  const taxable = curve(x0, x1, n, (t, x) => 1 + (x - 1) * 0.762);  // principal + ~76.2% of the gain (100% − 23.8%)
  const pretax = curve(x0, x1, n, (t, x) => x * 0.70);              // ~70% of the whole withdrawal, principal included
  return { roth, taxable, pretax };
})();

// Part 4 · "Gross Is Not Net" is authored as a COMPOSITION donut (radial layout) and
// "ROC Changes the Yield" as a laneBar COMPARISON — both carry their shares/values in
// the spec (radial.segments / laneBar.bars), so neither needs a data generator.

// Part 5 · wrapper compounding: the verified Part 5 arithmetic ($100k · 10% tax-free
// vs 7.5% after a 25% blended rate on gains realized every year · 30y). Deterministic,
// no noise: 1.10^30 ≈ 17.449 → ≈$1,745,000 · 1.075^30 ≈ 8.755 → ≈$875,000 · Δ ≈ $870,000.
const p5Wrapper = (() => {
  const n = 60;
  const roth = curve(0, 30, n, (t, x) => 100000 * Math.pow(1.10, x), 1, 0);
  const taxable = curve(0, 30, n, (t, x) => 100000 * Math.pow(1.075, x), 1, 0);
  return { roth, taxable };
})();

// Part 5 · earnings window: CONCEPTUAL path of a 10% position through the Part 5
// protocol (T-21→T-6 initiation blackout · one-step trim to the 3% cap at T-5, held
// through T+0 · T+1→T+5 assess · T+6+ branch). x = trading days vs the report.
// The x=-4 anchor keeps the Catmull-Rom hover overlay on the cap inside the window.
// Rebuild adds at most 2.5 points (a quarter of the 10% target) per trading week:
// eligible from T+6, 5.5% by T+10, 8% by T+15 (10% would land in week three).
const p5Earnings = (() => {
  const held = [{ x: -21, y: 10 }, { x: -6, y: 10 }, { x: -5, y: 3 }, { x: -4, y: 3 }, { x: 0, y: 3 }, { x: 5, y: 3 }];
  const rebuild = [{ x: 5, y: 3 }, { x: 6, y: 3 }, { x: 10, y: 5.5 }, { x: 15, y: 8 }];
  const hold = [{ x: 5, y: 3 }, { x: 10, y: 3 }, { x: 15, y: 3 }];
  const exit = [{ x: 5, y: 3 }, { x: 6, y: 2.1 }, { x: 7, y: 0.9 }, { x: 8, y: 0 }, { x: 15, y: 0 }];
  return { held, rebuild, hold, exit };
})();

// Part 5 · the posture cycle: CONCEPTUAL behavioral signatures of the three
// postures + the separately governed backbone through ONE stylized market cycle
// (advance → stress → recovery). Indexed shapes (start = 1), not returns: Torque
// climbs, falls ~60% and finishes highest; Ballast barely moves; Hype spikes and
// is stopped at breakeven (the profit ladder raised its last stop to entry);
// Bitcoin runs on its own lower register and falls ~75% in stress (deeper than
// Torque, per the Part 3 planning range). Catmull-Rom through waypoints +
// deterministic micro-noise; endpoints carry no noise, so each path starts and
// ends exactly on its first and last waypoint (the RNG is still drawn at every
// point, so interior noise is unchanged).
const p5Cycle = (() => {
  const shape = (wps, n, seed, amp) => {
    const rng = mulberry32(seed);
    const P = [wps[0], ...wps, wps[wps.length - 1]];
    const segs = wps.length - 1;
    const out = [];
    for (let i = 0; i <= n; i++) {
      const u = (i / n) * segs;
      const k = Math.min(Math.floor(u), segs - 1);
      const t = u - k, t2 = t * t, t3 = t2 * t;
      const cr = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      const p0 = P[k], p1 = P[k + 1], p2 = P[k + 2], p3 = P[k + 3];
      let y = cr(p0[1], p1[1], p2[1], p3[1]);
      const jitter = amp ? (rng() - 0.5) * amp : 0;
      if (i > 0 && i < n) y += jitter;
      out.push({ x: R(cr(p0[0], p1[0], p2[0], p3[0])), y: R(y) });
    }
    return out;
  };
  return {
    // peak 2.12 → trough 0.86 ≈ −59% (inside the stated 50–70% band); ends highest.
    torque: shape([[0, 1], [1.6, 1.3], [3.1, 1.74], [4.2, 2.12], [4.8, 2.0], [5.6, 1.26], [6.1, 0.86], [7, 1.24], [8.2, 1.9], [9.2, 2.5], [10, 2.92]], 80, 31, 0.04),
    ballast: shape([[0, 1], [2, 1.08], [4.2, 1.16], [5.2, 1.1], [6.1, 1.03], [7.2, 1.11], [8.6, 1.21], [10, 1.3]], 64, 37, 0.018),
    // spikes on attention to +150%, collapses early in stress, ENDS at breakeven:
    // the ladder sold a third at +50% and a third at +100% and raised the last stop to entry.
    hype: shape([[0, 1], [1.5, 1.04], [2.5, 1.22], [3.3, 1.75], [4.0, 2.5], [4.35, 2.05], [4.6, 1.5], [4.85, 1]], 48, 41, 0.045),
    // its own lower register (vertical position separates it; it is not a
    // relative-performance claim, stated in the caution and hover): peak 0.72 →
    // trough 0.18 ≈ −75%, deeper than Torque, then recovers.
    bitcoin: shape([[0, 0.35], [2.2, 0.47], [4.2, 0.72], [5.3, 0.36], [6.2, 0.18], [7.6, 0.3], [9, 0.5], [10, 0.62]], 64, 43, 0.014),
  };
})();

// Part 6 · slow framework decay. CONCEPTUAL normalized diagnostics (100 = measured
// health at the last completed review). Five indicators erode at different tempos
// once reviews stop; none is market data. Ease-in power curves (100 − drop·t^bend),
// so every line keeps steepening instead of leveling off; seeded ±0.2 texture,
// clamped so no point rises above the measured 100. Deterministic.
const p6Decay = (() => {
  const mk = (drop, bend, seed) => curve(0, 12, 48, (t) => 100 - drop * Math.pow(t, bend), seed, 0.4)
    .map((p) => ({ x: p.x, y: Math.min(100, p.y) }));
  return {
    freshness: mk(58, 1.2, 11),      // stale conviction: first to slide, largest total fall
    evidence: mk(48, 1.5, 13),       // thesis evidence decay
    correlation: mk(42, 2.2, 17),    // correlation stacking: flat for months, steepest at the end
    posture: mk(34, 1.3, 19),        // silent posture drift: gentle steepening
    wrapper: mk(20, 1.3, 23),        // wrapper leakage: smallest total fall
  };
})();

// ════════════════════════════════════════════════════════════════════════════
// SPEC REGISTRY
// ════════════════════════════════════════════════════════════════════════════
export const FRAMEWORK_CHART_SPECS = [

  /* ── SIGNATURE / REUSABLE ──────────────────────────────────────────────── */
  {
    chartId: 'sig-payoff', idx: 'S1', group: 'signature', intendedPlacement: 'both',
    claimStack: {
      primaryClaim: 'Keep the left tail survivable and let the right tail run, within the concentration limits',
      visualProof: 'The ACF curve runs a little below a straight symmetric line near the base case, flattens on the left toward a level bounded by sizing, and bends upward past breakeven toward the asymmetric-upside mark',
      interactionRole: 'Hover the sizing bound, the cost mark or the upside mark to see what the shape costs and what it buys',
      readerAction: 'Compare the bounded left, the small cost in the middle and the open right',
      caution: 'Conceptual; the framework limits loss through sizing and exits, not a guaranteed floor.',
    },
    interaction: { type: 'hover', gesture: 'hover', conceptMatch: 'Hovering the sizing bound, the cost mark and the upside mark contrasts the bounded loss, the price paid near the base case and the open gain' },
    status: 'implemented', wiredPublic: true,
    title: 'Shape the Payoff', setupLine:'The payoff shape the whole framework is built to produce, and what it costs',
    claimLabel: 'PAYOFF SHAPE · SIGNATURE',
    frameworkClaim: 'ACF sizes exposure so the left tail is survivable and leaves the right tail free to run, within the concentration limits.',
    readerTakeaway: 'Give up a little in the middle to survive the left tail and stay convex on the right.',
    chartType: 'Conceptual payoff curve vs a symmetric reference line.',
    visualDataMode: 'conceptual',
    disclosure: DISCLOSURE.conceptual, footerCta: 'View framework basis',
    sources: [
      { provider: 'ACF · Part 1', label: 'Rule stated in Part 1 · The traditional portfolio playbook is failing quietly', role: 'verifies-concept', url: '/part-1-foundation#manifesto', notes: 'The payoff-shape thesis this diagram illustrates.' },
      { provider: 'ACF · Part 2', label: 'Rule stated in Part 2 · The intellectual foundations, thesis-agnostic', role: 'verifies-concept', url: '/part-2-lineage-macro-thesis#lineage' },
    ],
    explainerHeadline: 'The framework is a payoff shape, not a prediction.',
    explainerBody: 'A plain position loses on the left exactly what it makes on the right. The shaped payoff curves upward: a favorable move earns more than an equal adverse move costs. Sizing and exits keep a wrong call survivable, and the price is paid near the base case, where Ballast reserves and modest sizes give up a little return. In exchange, being roughly right now and then can still compound.',
    explainerConcept: 'Convexity',
    concepts: [{ label: 'Survivable compounding', link: '/part-1-foundation#manifesto' }, { label: 'Convexity', link: '/part-2-lineage-macro-thesis#lineage' }],
    layout: 'single',
    ariaSummary: 'A conceptual payoff curve. A straight symmetric reference line loses on adverse outcomes as much as it gains on favorable ones. The ACF curve runs slightly below that line near the base case, which is the cost of the structure. On the left it flattens toward a level bounded by sizing; on the right it bends upward and accelerates.',
    domain: { xMin: -1, xMax: 1.6, yMin: -1.3, yMax: 3.8 }, yUnit: '',
    xTicks: [{ v: -1, label: 'adverse outcome' }, { v: 0, label: 'base' }, { v: 1.6, label: 'favorable outcome' }],
    yTicks: [],
    series: [
      { key: 'linear', tier: 'reference', label: 'Symmetric', pts: payoff.linear, labelDy: -2 },
      { key: 'shaped', tier: 'primary', label: 'ACF payoff', pts: payoff.shaped },
    ],
    guides: [{ id: 'breakeven', y: 0, kind: 'zero', label: 'breakeven' }],
    // the cost of the shape: the sliver where the ACF curve trails the symmetric line
    areas: [{ id: 'costSliver', topKey: 'linear', botKey: 'shaped', xFrom: -0.327, xTo: 0.456, tone: 'muted', opacity: 0.35, label: '' }],
    levels: [{ id: 'bound', y: payoff.bound, kind: 'charcoal', label: 'bounded by sizing' }],
    markers: [
      { id: 'cost', type: 'dot', x: 0.09, y: R(valueAt(payoff.shaped, 0.09)), r: 3.2, label: 'the cost of the shape', labelAnchor: 'start', labelDy: 18 },
      { id: 'upside', type: 'enso', x: 1.18, y: R(valueAt(payoff.shaped, 1.18)), r: 13, label: 'asymmetric upside', labelAnchor: 'end', labelDy: -18 },
    ],
    notes: [],
    primaryKey: 'shaped',
    hoverTargets: [
      { id: 'shaped', kind: 'series', seriesKey: 'shaped', label: 'ACF payoff', name: 'ACF payoff', why: 'Flatter when outcomes go against you, accelerating when they go your way, and a little behind a plain position in between. That trade is what the framework is built for.', claim: 'Exposure is shaped, not chased.', concept: 'Convexity', link: '/part-2-lineage-macro-thesis#lineage' },
      { id: 'linear', kind: 'series', seriesKey: 'linear', label: 'Symmetric exposure', name: 'Symmetric exposure', why: 'A plain position: it loses on the downside exactly what it earns on the upside.', claim: 'The straight line ACF bends.', concept: 'Fragility', link: '/part-1-foundation#manifesto' },
      { id: 'bound', kind: 'level', label: 'Bounded by sizing', name: 'Bounded by sizing', why: 'Position sizing, exits and tripwires keep a wrong call survivable. The line marks the worst point in this picture, not a guaranteed floor: a single position can still fail outright, and the portfolio is sized to survive it.', claim: 'Survival is the precondition for compounding.', concept: 'Risk of ruin', link: '/part-2-lineage-macro-thesis#lineage' },
      { id: 'cost', kind: 'marker', label: 'The cost of the shape', name: 'The cost of the shape', why: 'Near the base case the shaped position trails a plain one. Ballast reserves, modest position sizes and exits that sometimes fire on noise all cost a little when nothing dramatic happens.', claim: 'Convexity has a price, and this is where it is paid.', concept: 'Ballast', link: '/part-5-portfolio-construction-position-management#ballast' },
      { id: 'upside', kind: 'marker', label: 'Asymmetric upside', name: 'Asymmetric upside', why: 'The right tail is left open, within the concentration limits. Occasional convex outcomes do the heavy lifting on terminal wealth.', claim: 'Let the winners run.', concept: 'Convexity', link: '/part-2-lineage-macro-thesis#lineage' },
    ],
    mobileTapTargets: ['shaped', 'bound', 'cost', 'upside', 'linear'],
    implementationNotes: 'Wired on /part-1-foundation, /part-1-pictures and /framework-in-pictures. Curve 0.9·softplus(2.3x) − 0.74 + 0.35·max(0, x)² against y = 1.2x on one shared grid: it trails the reference between x ≈ −0.33 and 0.46 (by at most about 0.12, the cost of the shape), and the sizing-bound level sits at its value at x = −1 (−0.654). The shaded sliver and the cost marker make that price visible.',
  },

  {
    chartId: 'sig-shape', idx: 'S2', group: 'signature', intendedPlacement: 'docs-landing',
    claimStack: {
      primaryClaim: 'With the average held fixed, ACF is designed to thin the deep-loss tail and lengthen the gain tail, paying for it with more small shortfalls',
      visualProof: 'A symmetric normal bell against an ACF-shaped curve with the same area and the same average: thinner on the far left, piled up just below the base case, thinner through moderate gains and longer on the far right, with the deep-loss difference washed in the stress tone and the right-tail difference in the accent',
      interactionRole: 'Hover the curves or the three markers to read what was traded for what',
      readerAction: 'Compare the two tails, then find where the shape pays for them',
      caution: 'Conceptual outcome distributions with the same area and average; illustrative, not measured returns',
    },
    status: 'implemented', wiredPublic: true,
    title: 'Bend the Tail', setupLine:'Hold the average fixed and see what the framework changes around it',
    claimLabel: 'EXPOSURE SHAPING · SIGNATURE',
    frameworkClaim: 'ACF aims to thin the left tail and lengthen the right without changing the average.',
    readerTakeaway: 'Same average, different tails: fewer deep losses, more small shortfalls, a longer right tail.',
    chartType: 'Conceptual outcome-distribution reshape vs a symmetric normal reference.',
    visualDataMode: 'conceptual',
    disclosure: DISCLOSURE.conceptual, footerCta: 'View framework basis',
    sources: [
      { provider: 'ACF · Part 1', label: 'Rule stated in Part 1 · The traditional portfolio playbook is failing quietly', role: 'verifies-concept', url: '/part-1-foundation#manifesto' },
      { provider: 'ACF · Part 5', label: 'Rule stated in Part 5 · Three behaviors, one portfolio', role: 'verifies-concept', url: '/part-5-portfolio-construction-position-management#postures' }, { provider: 'ACF · Part 2', label: 'Rule stated in Part 2 · The intellectual foundations, thesis-agnostic', role: 'verifies-concept', url: '/part-2-lineage-macro-thesis#lineage' },
    ],
    explainerHeadline: 'We reshape the tails, not the average.',
    explainerBody: 'A symmetric bell puts as much weight in the loss tail as in the gain tail. The framework spends structure to change that: position limits, stops and tripwires thin the deep-loss tail, and convex positions left free to run, within the concentration limits, lengthen the gain tail. The bill arrives in the middle, as more small shortfalls and fewer middling gains. The picture holds the average fixed so the trade is plain to see.',
    explainerConcept: 'Barbell structure',
    concepts: [{ label: 'Fragility', link: '/part-1-foundation#manifesto' }, { label: 'Barbell structure', link: '/part-2-lineage-macro-thesis#lineage' }],
    layout: 'single',
    ariaSummary: 'Two outcome distributions with the same area and the same average. The symmetric reference is a normal bell centered on the base case. The ACF curve is thinner in the deep-loss tail, piles up just below the base case, is thinner through moderate gains, and runs longer into the far right tail.',
    domain: { xMin: -3, xMax: 4, yMin: 0, yMax: 1.7 }, yUnit: '',
    xTicks: [{ v: -3, label: 'loss' }, { v: 0, label: 'base case' }, { v: 4, label: 'gain' }],
    yTicks: [],
    series: [
      { key: 'symmetric', tier: 'reference', label: 'Symmetric (normal)', pts: shape.symmetric, labelDy: 4 },
      { key: 'shaped', tier: 'primary', label: 'ACF shaped', pts: shape.shaped, labelDy: -13 },
    ],
    areas: [
      { id: 'underShaped', topKey: 'shaped', kind: 'under', label: '' },
      // the washes stop at the outer crossings (x = -1.17 and 1.91): stress on the
      // left, where the ACF curve is thinner (fewer deep losses); accent on the
      // right, where it runs longer. Their areas are 0.157 and 0.110; the middle
      // trade (0.496 more small shortfalls, 0.452 fewer middling gains) balances
      // them, and the three markers name all of it.
      { id: 'lossThinned', topKey: 'symmetric', botKey: 'shaped', xTo: -1.168, tone: 'stress', opacity: 0.16, label: '' },
      { id: 'tailLengthened', topKey: 'shaped', botKey: 'symmetric', xFrom: 1.908, tone: 'accent', opacity: 0.15, label: '' },
    ],
    markers: [
      { id: 'leftTail', type: 'dot', x: -1.3, y: R(valueAt(shape.shaped, -1.3)), r: 3.2, label: 'fewer deep losses', labelAnchor: 'end', labelDy: -22 },
      { id: 'middle', type: 'dot', x: -0.35, y: R(valueAt(shape.shaped, -0.35)), r: 3.2, label: 'more small shortfalls', labelAnchor: 'start', labelDy: -8 },
      { id: 'rightTail', type: 'dot', x: 2.4, y: R(valueAt(shape.shaped, 2.4)), r: 3.2, label: 'longer right tail', labelAnchor: 'start', labelDy: -14 },
    ],
    notes: [],
    primaryKey: 'shaped',
    hoverTargets: [
      { id: 'shaped', kind: 'series', seriesKey: 'shaped', label: 'ACF shaped', name: 'ACF shaped distribution', why: 'Same average as the bell. Deep losses are rarer and big gains more common; the price is more small shortfalls and fewer middling gains.', claim: 'Structure buys the asymmetry, and the middle pays for it.', concept: 'Barbell structure', link: '/part-2-lineage-macro-thesis#lineage' },
      { id: 'symmetric', kind: 'series', seriesKey: 'symmetric', label: 'Symmetric (normal) outcomes', name: 'Symmetric (normal) outcomes', why: 'The textbook bell: the left tail is as wide as the right, so a bad outcome can hurt as much as an equally likely good one helps.', claim: 'The shape ACF sets out to change.', concept: 'Fragility', link: '/part-1-foundation#manifesto' },
      { id: 'leftTail', kind: 'marker', label: 'Fewer deep losses', name: 'Fewer deep losses', why: 'Position limits, stops and tripwires make the deepest losses rarer and smaller. They do not make them impossible.', claim: 'Bounded by sizing, in distribution form.', concept: 'Risk of ruin', link: '/part-2-lineage-macro-thesis#lineage' },
      { id: 'middle', kind: 'marker', label: 'More small shortfalls', name: 'More small shortfalls', why: 'The price of the shape. Ballast reserves, modest sizes and exits that sometimes fire on noise leave more outcomes a little below the base case, and fewer middling gains.', claim: 'Convexity is paid for in the middle.', concept: 'Position sizing', link: '/part-5-portfolio-construction-position-management#torque' },
      { id: 'rightTail', kind: 'marker', label: 'Longer right tail', name: 'Longer right tail', why: 'Convex positions left free to run, within the concentration limits, stretch the gain side. Under current law, a Roth keeps all of that upside on a qualified withdrawal.', claim: 'Asymmetric upside, in distribution form.', concept: 'Convexity', link: '/part-2-lineage-macro-thesis#lineage' },
    ],
    mobileTapTargets: ['shaped', 'leftTail', 'middle', 'rightTail', 'symmetric'],
    implementationNotes: 'Companion to sig-payoff. Wired on the cover (#lens) and /framework-in-pictures. The ACF curve is area- and mean-preserving against the unit normal over [-3, 4] (area 2.501 vs 2.503, mean -0.01 vs 0.00) and crosses it at x ≈ -1.17, 0.19 and 1.91; the two washes stop at the outer crossings.',
  },

  /* ── DOCS LANDING PAGE ─────────────────────────────────────────────────── */
  {
    chartId: 'dl-convexity-window', idx: 'L2', group: 'docs-landing', intendedPlacement: 'docs-landing',
    claimStack: {
      primaryClaim: 'A new position earns its full weight only after the market confirms the thesis',
      visualProof: 'An illustrative path for one new position: a flat range inside a compression band, a confirmation marker once the path has cleared that range, then an accelerating run to a release marker',
      interactionRole: 'Hover the compression band, the confirmation mark and the release to see when a position waits, adds and runs',
      readerAction: 'Find where the framework adds size, and where it declines to',
      caution: 'Conceptual path for one new position, with no price levels implied; the Bitcoin backbone and Ballast run on different clocks',
    },
    status: 'implemented', wiredPublic: true,
    title: 'The Window Opens', setupLine:'A new position waits out the range, adds on confirmation, then lets the move run',
    claimLabel: 'ENTRIES · CONFIRMATION',
    frameworkClaim: 'ACF gives a new position its full weight only once momentum confirms its CIS score, then lets it run while conviction holds.',
    readerTakeaway: 'Wait through the range, add on confirmation, then let it run within the caps.',
    chartType: 'Conceptual price path with a compression band, a confirmation marker and a release marker.',
    visualDataMode: 'conceptual',
    disclosure: DISCLOSURE.conceptual, footerCta: 'View framework basis',
    sources: [
      { provider: 'ACF · Part 5', label: 'Rule stated in Part 5 · Momentum: conviction requires confirmation', role: 'verifies-concept', url: '/part-5-portfolio-construction-position-management#management' },
    ],
    explainerHeadline: 'Conviction waits for the market to agree.',
    explainerBody: 'A new position can spend a long time going nowhere, and the framework is happy to wait. Size is added in stages as the evidence arrives, and full weight comes only once momentum confirms the thesis. Two parts of the book keep a different clock: Bitcoin is bought on a schedule, faster when it is cheap, and Ballast is there to buy the drawdown.',
    explainerConcept: 'Momentum filter',
    concepts: [{ label: 'Momentum filter', link: '/part-5-portfolio-construction-position-management#management' }, { label: 'Position sizing', link: '/part-5-portfolio-construction-position-management#torque' }],
    layout: 'single',
    ariaSummary: 'A conceptual price path for one new position. It stays range-bound inside a soft compression band, clears the range and is confirmed, then accelerates upward into an asymmetric release.',
    domain: { xMin: 0, xMax: 100, yMin: 90, yMax: 210 }, yUnit: '',
    xTicks: [{ v: 0, label: 'setup' }, { v: 60, label: 'confirmation' }, { v: 100, label: 'release' }],
    yTicks: [{ v: 100, label: 'base' }],
    series: [{ key: 'v', tier: 'primary', label: 'Path', pts: window_.value }],
    bands: [{ id: 'compression', kind: 'regime', render: 'wash', x0: 0, x1: 50, label: 'compression · waiting for confirmation', labelAnchor: 'start' }],
    markers: [
      { id: 'confirm', type: 'enso', x: 60, y: R(valueAt(window_.value, 60)), r: 12, label: 'confirmation', labelAnchor: 'end', labelDy: -16 },
      { id: 'release', type: 'dot', x: 92, y: R(valueAt(window_.value, 92)), r: 3.2, label: 'asymmetric release', labelAnchor: 'end', labelDy: -14 },
    ],
    notes: [],
    primaryKey: 'v',
    hoverTargets: [
      { id: 'compression', kind: 'band', label: 'Compression', name: 'Compression', why: 'Range-bound and quiet. A new position stays at the size its evidence supports, and nothing is added on hope.', claim: 'A new position waits here; the backbone keeps accumulating.', concept: 'Momentum filter', link: '/part-5-portfolio-construction-position-management#management' },
      { id: 'confirm', kind: 'marker', label: 'Confirmation', name: 'Confirmation', why: 'The path clears its range and momentum turns in the thesis\'s favor. This is where the position earns more weight, in stages, rather than on the first hopeful uptick.', claim: 'Size into confirmation, not anticipation.', concept: 'Momentum filter', link: '/part-5-portfolio-construction-position-management#management' },
      { id: 'release', kind: 'marker', label: 'Asymmetric release', name: 'Asymmetric release', why: 'The move the patience was for. The position runs until its thesis, momentum or the concentration caps say otherwise.', claim: 'The run ends on evidence or the caps, not on a rebalancing schedule.', concept: 'Convexity', link: '/part-2-lineage-macro-thesis#lineage' },
      { id: 'v', kind: 'series', seriesKey: 'v', label: 'Path', name: 'Illustrative path', why: 'One invented path for a single new position: a quiet range, a confirmed break, then a run.', claim: 'Patience first, size second.', concept: 'Momentum filter', link: '/part-5-portfolio-construction-position-management#management' },
    ],
    mobileTapTargets: ['compression', 'confirm', 'release', 'v'],
    implementationNotes: 'Compression uses a feathered ink-wash band (washRect), not a pressure field. The confirmation marker and tick sit at x = 60, after the path first clears its x <= 50 range (97.4 to 102.6) at x = 57.3. No numeric y ticks and no level line: the path is conceptual and its levels carry no meaning.',
  },

  {
    chartId: 'dl-regime-map', idx: 'L1', group: 'docs-landing', intendedPlacement: 'docs-landing',
    claimStack: {
      primaryClaim: 'The same portfolio behaves differently in different macro regimes',
      visualProof: 'A growth × inflation quadrant (stagflation, reflation, deflation, goldilocks), each labeled with the leadership the framework associates with it, crossed by one illustrative path: disinflation boom → deflation scare → reflation → inflation shock → an illustrative “Now” marker near the center',
      interactionRole: 'Hover or tap a waypoint to read that regime\'s weather and which assets tend to lead there',
      readerAction: 'Trace the path quadrant to quadrant and end on the illustrative Now marker',
      caution: 'Illustrative regime path; every waypoint, including “Now”, is placed by hand. Leadership in each quadrant is the framework\'s reading of common market experience, not a measured result. Quadrant names follow common market usage, not any one published model.',
    },
    status: 'implemented', wiredPublic: true,
    title: 'Capital Has Weather', setupLine:'Same assets, different regime, different behavior',
    claimLabel: 'REGIME MAP · CAPITAL WEATHER',
    frameworkClaim: 'The same holdings behave differently as growth and inflation shift, so where you stand gets re-read at every review.',
    readerTakeaway: 'You are not allocating in a vacuum; you are allocating into weather.',
    chartType: 'Growth × inflation quadrant with an illustrative regime path.',
    visualDataMode: 'conceptual',
    disclosure: `${DISCLOSURE.conceptual} · Leadership labels are the framework's judgment`, footerCta: 'View framework basis',
    sources: [
      { provider: 'ACF · Part 2', label: 'Rule stated in Part 2 · Identification, evaluation, and governance', role: 'verifies-concept', url: '/part-2-lineage-macro-thesis#macro-thesis' },
      { provider: 'ACF · Part 1', label: 'Rule stated in Part 1 · The traditional portfolio playbook is failing quietly', role: 'verifies-concept', url: '/part-1-foundation#manifesto' },
      { provider: 'ACF dashboard', label: 'Regime reading from the direction of rates, inflation and unemployment (software behavior as of September 2026)', role: 'verifies-concept', url: '/framework-in-math#cis-math' },
    ],
    explainerHeadline: 'The same portfolio behaves differently in different weather.',
    explainerBody: 'Growth and inflation are one common way to sort the market\'s weather, and leadership rotates across it. Read this map as context for the structural thesis in Part 2. The dashboard\'s own regime reading uses different signals (the direction of rates, inflation and unemployment, as of September 2026).',
    explainerConcept: 'Macro regime',
    concepts: [{ label: 'Macro regime', link: '/part-1-foundation#manifesto' }, { label: 'Regime fit', link: '/part-1-foundation#manifesto' }],
    layout: 'quadrant',
    ariaSummary: 'A conceptual four-quadrant map of growth versus inflation, with quadrants labeled stagflation, reflation, deflation and goldilocks. An illustrative path traces capital from a disinflation boom through a deflation scare, reflation and an inflation shock, and ends at an illustrative “Now” marker near the center.',
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
      { id: 'wp1', kind: 'waypoint', label: 'Disinflation boom', name: 'Disinflation boom', why: 'Strong growth, low inflation. Growth and risk assets tend to lead; it is the easiest regime to mistake for permanent.', claim: 'Goldilocks rewards risk-on.', concept: 'Regime fit', link: '/part-1-foundation#manifesto' },
      { id: 'wp2', kind: 'waypoint', label: 'Deflation scare', name: 'Deflation scare', why: 'Weak growth, low inflation. Long-duration bonds and quality balance sheets tend to lead while riskier assets lag.', claim: 'Different weather, different leaders.', concept: 'Macro regime', link: '/part-1-foundation#manifesto' },
      { id: 'wp3', kind: 'waypoint', label: 'Reflation', name: 'Reflation', why: 'Strong growth, high inflation. Real assets and energy tend to lead, and bonds stop helping.', claim: 'Real assets earn their keep.', concept: 'Macro regime', link: '/part-1-foundation#manifesto' },
      { id: 'wp4', kind: 'waypoint', label: 'Inflation shock', name: 'Inflation shock', why: 'Weak growth, high inflation. Stocks and bonds can fall together here, while hard assets and defense tend to lead.', claim: 'The regime that breaks the old hedge.', concept: 'Fragility', link: '/part-1-foundation#manifesto' },
      { id: 'wp5', kind: 'waypoint', label: 'Now', persistentLabel: true, name: 'Where you stand (illustrative)', why: 'Illustrative position. The habit is to re-read it at every review instead of assuming last season persists.', claim: 'Where you stand gets re-read, not assumed.', concept: 'Adaptation', link: '/part-1-foundation#order-of-operations' },
    ],
    mobileTapTargets: ['wp1', 'wp2', 'wp3', 'wp4', 'wp5'],
    implementationNotes: 'Bespoke quadrant layout. Every waypoint, the "Now" marker included, is a hard-coded illustrative coordinate; nothing on the page reads macro data. Quadrant leadership labels are the framework\'s judgment. The axes are levels (weak or strong growth, low or high inflation), and the waypoint copy uses the same level semantics.',
  },

  {
    chartId: 'dl-tripwire-loop', idx: 'L3', group: 'docs-landing', intendedPlacement: 'docs-landing',
    claimStack: {
      primaryClaim: 'ACF is a closed-loop operating system, not a fixed set of weights',
      visualProof: 'A left-to-right path (thesis, exposure, risk, the tripwire checkpoint, the governed response) closed by one solid return arc that carries evidence back into the thesis',
      interactionRole: 'Hover or tap a step to read what it contributes and what the tripwire governs',
      readerAction: 'Follow the path to the tripwire, then trace the return back to the thesis',
      caution: 'Conceptual governance loop; the operating tripwires are in Part 5, and the signals the dashboard watches are on the Math page (as of September 2026)',
    },
    status: 'implemented', wiredPublic: true,
    title: 'Govern the Thesis', setupLine:'A thesis earns exposure, and tripwires decide when to stop and check',
    claimLabel: 'SYSTEM · GOVERNED LOOP',
    frameworkClaim: 'ACF is a closed-loop operating system, not a fixed set of weights.',
    readerTakeaway: 'Take risk on purpose, then govern it.',
    chartType: 'Beginner governance loop: thesis → exposure → risk → tripwire → adjust, returning to the thesis.',
    visualDataMode: 'conceptual',
    disclosure: DISCLOSURE.conceptual, footerCta: 'View framework basis',
    sources: [
      { provider: 'ACF · Part 1', label: 'Rule stated in Part 1 · The system at a glance', role: 'verifies-concept', url: '/part-1-foundation#order-of-operations' },
      { provider: 'ACF · Part 5', label: 'Rule stated in Part 5 · Governance through the cycle', role: 'verifies-concept', url: '/part-5-portfolio-construction-position-management#management' },
      { provider: 'ACF dashboard', label: 'Tripwire signals the dashboard watches (software behavior as of September 2026)', role: 'verifies-concept', url: '/framework-in-math#governance-math' },
    ],
    explainerHeadline: 'Tripwires keep conviction from drifting.',
    explainerBody: 'A thesis earns exposure, and exposure creates risk. A tripwire marks the moment to stop and check whether a signal is noise or a broken thesis. The answer picks one of four responses, from watching to exiting, before emotion picks one for you.',
    explainerConcept: 'Governed response',
    concepts: [{ label: 'Tripwire', link: '/part-5-portfolio-construction-position-management#management' }, { label: 'CIS', link: '/part-6-convexity-framework-integrity-scoring#cis' }],
    layout: 'governanceLoop',
    ariaSummary: 'A simple left-to-right path: thesis, exposure, risk, a tripwire checkpoint and a governed response, with a return arc showing that evidence updates the thesis. The tripwire triggers a check before any response is chosen.',
    governanceLoop: {
      governorId: 'tripwire',
      returnLabel: 'evidence updates the thesis',
      nodes: [
        { id: 'thesis', label: 'Thesis', sub: 'the view' },
        { id: 'exposure', label: 'Exposure', sub: 'capital placed' },
        { id: 'risk', label: 'Risk', sub: 'fragility created' },
        { id: 'tripwire', label: 'Tripwire', sub: 'the guardrail' },
        { id: 'adjust', label: 'Adjust', sub: 'governed response' },
      ],
    },
    primaryKey: 'thesis',
    hoverTargets: [
      { id: 'thesis', kind: 'node', label: 'Thesis', name: 'Thesis', why: 'The multi-year view of the forces shaping markets, written so that it can be proven wrong.', claim: 'Structure starts with a thesis.', concept: 'Macro thesis', link: '/part-2-lineage-macro-thesis#macro-thesis' },
      { id: 'exposure', kind: 'node', label: 'Exposure', name: 'Exposure', why: 'Capital placed because the thesis has consequences.', claim: 'Exposure is the thesis made real.', concept: 'Exposure', link: '/part-5-portfolio-construction-position-management#postures' },
      { id: 'risk', kind: 'node', label: 'Risk', name: 'Risk', why: 'Every exposure creates fragility that has to be watched.', claim: 'Risk is the price of exposure.', concept: 'Fragility', link: '/part-1-foundation#manifesto' },
      { id: 'tripwire', kind: 'node', label: 'Tripwire', name: 'Tripwire', why: 'A predefined threshold that triggers a review before denial, emotion or information overload can take over. The dashboard flags the ones it has data for; the response is yours.', claim: 'The rule is set before the stress arrives.', concept: 'Tripwire', link: '/part-5-portfolio-construction-position-management#management' },
      { id: 'adjust', kind: 'node', label: 'Adjust', name: 'Adjust', why: 'After verification, the response is one of four: watch, hedge, trim, or exit and redeploy. What it learns goes back to the thesis.', claim: 'The response follows the evidence, then feeds back.', concept: 'Governed response', link: '/part-1-foundation#order-of-operations' },
    ],
    mobileTapTargets: ['thesis', 'exposure', 'risk', 'tripwire', 'adjust'],
    implementationNotes: 'Beginner governanceLoop layout, an additive primitive distinct from the systemLoop ring: a left-to-right path with one governing checkpoint (the tripwire) and a return arc. It teaches the smallest useful loop (thesis → exposure → risk → tripwire → response → updated thesis); tripwire mechanics live in Part 5 and on the Math page. Wired on /part-1-foundation, /part-1-pictures and /framework-in-pictures.',
  },

  /* ── PART 1 FRAMEWORK ──────────────────────────────────────────────────── */
  {
    chartId: 'p1-hedge-broke', idx: '04', group: 'part-1', intendedPlacement: 'part-1',
    claimStack: {
      primaryClaim: 'In 2022 the bonds in a 60/40 portfolio fell with the stocks instead of cushioning them',
      visualProof: 'US stocks, US bonds and a 60/40 mix, indexed to 100 at December 2021, all falling through 2022',
      interactionRole: 'Hover each line, the shaded stretch and the year-end line to see the cushion give way',
      readerAction: 'Watch the bond line fall with the stock line',
      caution: 'Drawn through the published figures at the marked points. The path between them is illustrative, not plotted data.',
    },
    status: 'implemented', wiredPublic: true,
    title: 'The Hedge Broke', setupLine: 'Total return of US stocks, US bonds and a 60/40 mix through 2022, indexed to 100 at December 2021',
    claimLabel: 'DIVERSIFICATION · FRAGILITY',
    frameworkClaim: 'Stocks and bonds are not always diversifiers; in an inflation shock they can fall together.',
    readerTakeaway: 'When inflation drives the market, the hedge can fall with the risk it was bought to offset.',
    chartType: 'Indexed total-return chart, 3 series (stocks, bonds, 60/40), December 2021 to December 2022.',
    visualDataMode: 'representative',
    disclosure: DISCLOSURE.representative, footerCta: 'View sources',
    sources: [
      { provider: 'Janus Henderson Portfolio Construction and Strategy Team', label: 'Reports of the death of 60/40 have been greatly exaggerated (2023). 2022, S&P 500 TR and Bloomberg US Agg TR: 60/40 −16.1%', role: 'basis', url: 'https://cdn.janushenderson.com/webdocs/PCS_whitepaper_death-60-40-greatly-exaggerated_US.pdf' },
      { provider: 'Aswath Damodaran (NYU Stern)', label: 'Historical Returns on Stocks, Bonds and Bills: 1928-2024 (updated January 5, 2026). 2022, S&P 500 with dividends: −18.04%', role: 'basis', url: 'https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/histretSP.html' },
      { provider: 'Bloomberg', label: 'Bloomberg US Agg Total Return Value Unhedged USD (LBUSTRUU)', role: 'basis', url: 'https://www.bloomberg.com/professional/products/indices/quote/LBUSTRUU:IND' },
    ],
    explainerHeadline: 'The cushion fell with the thing it was cushioning.',
    explainerBody: 'In 2022 a 60/40 mix of US stocks and bonds fell about 16 percent: stocks lost about 18 percent with dividends, and bonds, the part meant to cushion them, lost about 13 percent. Inflation peaked above 9 percent in June, the Fed raised rates from March to December, and both halves of the portfolio answered to the same news.',
    explainerConcept: 'Correlation regime',
    concepts: [{ label: 'Fragility', link: '/part-1-foundation#manifesto' }, { label: 'Correlation regime', link: '/part-1-foundation#manifesto' }, { label: 'CIS', link: '/part-6-convexity-framework-integrity-scoring#cis' }],
    layout: 'single',
    ariaSummary: 'Line chart of total return through 2022, indexed to 100 at December 2021. Stocks fall to about 76 at the September low and end the year near 82. Bonds, the supposed hedge, fall alongside them to about 85 in September and 84 in October, and end near 87. The 60/40 mix falls to about 80 and ends near 84, marked by a line for its year-end loss of about 16 percent.',
    domain: { xMin: 0, xMax: 12, yMin: 72, yMax: 104 }, yUnit: 'total return index', valueUnit: 'idx',
    xTicks: [{ v: 0, label: 'Dec 2021 = 100' }, { v: 9, label: 'Sep 2022 low' }, { v: 12, label: 'Dec 2022' }],
    yTicks: [{ v: 80 }, { v: 90 }, { v: 100 }],
    series: [
      { key: 's', tier: 'secondary', label: 'Stocks', labelDy: 4, pts: hedge.stocks },
      { key: 'b', tier: 'tertiary', label: 'Bonds', labelDy: -2, pts: hedge.bonds },
      { key: 'p', tier: 'primary', label: '60 / 40', pts: hedge.p6040 },
    ],
    bands: [{ id: 'band0', kind: 'shock', x0: 2.5, x1: 12, render: 'pressureField', seed: 41, intensity: 0.78, asymmetric: 0.16, label: 'inflation shock · the Fed raises rates', labelAnchor: 'start' }],
    guides: [
      { id: 'base', y: 100, kind: 'base', label: 'base = 100' },
      { id: 'invalidation', y: 84, kind: 'reference', dash: true, label: '60/40 at year-end 2022: down about 16%' },
    ],
    markers: [
      { id: 'marker0', type: 'enso', x: 9, y: R(valueAt(hedge.bonds, 9)), r: 13, label: 'Sep 2022 · bonds fell with stocks', labelAnchor: 'end', labelDy: -20 },
      { id: 'end-s', type: 'dot', x: 12, y: hedge.end.s, r: 3 },
      { id: 'end-b', type: 'dot', x: 12, y: hedge.end.b, r: 3 },
      { id: 'end-p', type: 'dot', x: 12, y: hedge.end.p, r: 3 },
    ],
    levels: [],
    primaryKey: 'p',
    hoverTargets: [
      { id: 'band0', kind: 'band', label: 'The 2022 inflation shock', name: 'The 2022 inflation shock', why: 'Inflation peaked above 9 percent in June 2022 and the Fed raised rates from March to December. Rising rates push bond prices down and weigh on stocks, so both legs fell together.', claim: 'Both halves answered to the same force.', concept: 'Macro regime', link: '/part-1-foundation#manifesto' },
      { id: 'marker0', kind: 'marker', label: 'Where the hedge stopped hedging', name: 'September 2022', why: 'In the path drawn here, by the September month-end stocks are down about a quarter and bonds about 15 percent. The part of the mix meant to rise when stocks fall was falling too.', claim: 'Where the hedge stopped hedging.', concept: 'Correlation regime', link: '/part-1-foundation#manifesto' },
      { id: 'b', kind: 'series', seriesKey: 'b', label: 'Bonds', name: 'Bonds', why: 'The part meant to cushion. US bonds lost about 13 percent in 2022, on the same inflation news that sank stocks.', claim: 'The diversifier stopped diversifying.', concept: 'Correlation regime', link: '/part-1-foundation#manifesto' },
      { id: 's', kind: 'series', seriesKey: 's', label: 'Stocks', name: 'Stocks', why: 'US stocks lost about 18 percent in 2022 with dividends. A fall like that is what the bonds were there for.', claim: 'The loss the bonds were meant to offset.', concept: '60/40 failure', link: '/part-1-foundation#manifesto' },
      { id: 'p', kind: 'series', seriesKey: 'p', label: '60 / 40 mix', name: '60 / 40 mix', why: 'Sixty percent stocks, forty percent bonds: the textbook balanced portfolio. It lost about 16 percent in 2022 because neither half held up.', claim: 'Balanced, and still down about 16 percent.', concept: 'Fragility', link: '/part-1-foundation#manifesto' },
      { id: 'invalidation', kind: 'level', label: 'Year-end 2022', name: 'Year-end 2022', why: 'Where the 60/40 mix finished 2022: down about 16 percent. A dated fact from the record, not a framework threshold.', claim: 'What a balanced year looked like in 2022.', concept: '60/40 failure', link: '/part-1-foundation#manifesto' },
    ],
    mobileTapTargets: ['band0', 'marker0', 'b', 'p', 'invalidation'],
    implementationNotes: 'Wired on /part-1-foundation (#exhibit-01), /part-1-pictures and /framework-in-pictures. Representative, anchored to 2022: the marked points are the published year-end figures (Dec 2021 = 100; Dec 2022 stocks 81.9, bonds 87.0, 60/40 83.9). The September and October knots are rounded month-end index readings (Sep 2022 stocks 76.1, bonds 85.4; Oct 2022 bonds 84.3) that shape the illustrative path, with rounded month-end knots between them, smoothed with a monotone cubic. The 60/40 line is a buy-and-hold 60/40 of the two drawn paths (79.8 in Sep, 83.9 in Dec, matching the published -16.1%). Dots at the right edge; year-end guide at 84. The licensed index records (S&P 500 TR, Bloomberg US Agg) are not plotted month by month.',
  },

  {
    chartId: 'p1-correlation', idx: '03', group: 'part-1', intendedPlacement: 'part-1',
    claimStack: {
      primaryClaim: 'The stock-bond correlation turned positive when inflation became the main stress',
      visualProof: 'A 24-month rolling correlation, below zero from 2014 through 2021, crossing zero in early 2022 and staying positive through 2024',
      interactionRole: 'Hover the line, the shaded stretch and the crossing to see when the sign changed',
      readerAction: 'Find where the line crosses zero',
      caution: 'Drawn through the published figures at the marked points. The path between them is illustrative, not plotted data. Shorter windows turned positive in mid-2021; the 24-month window drawn here crosses in early 2022. The 2023 and 2024 levels are drawn, bracketed by published 12-month and 36-month readings for 2024.',
    },
    status: 'implemented', wiredPublic: true,
    title: 'Correlation Turns', setupLine: 'How US stocks and 10-year Treasuries moved together, 2014 to 2024. Below zero, bonds tended to cushion stocks; above it, they tended to fall together.',
    claimLabel: 'CORRELATION · REGIME',
    frameworkClaim: 'The stock-bond correlation tends to turn positive when inflation becomes the dominant stress.',
    readerTakeaway: 'Bonds cushioned stocks because of the regime they were in. When the regime changed, so did the cushion.',
    chartType: 'Rolling 24-month correlation of monthly stock and 10-year Treasury returns, with a drawn inflation-shock field.',
    visualDataMode: 'representative',
    disclosure: DISCLOSURE.representative, footerCta: 'View sources',
    sources: [
      { provider: 'Brixton, Brooks, Hecht, Ilmanen, Maloney and McQuinn (AQR)', label: 'A Changing Stock–Bond Correlation: Drivers and Implications. The Journal of Portfolio Management 49(4), 64–80 (2023)', role: 'basis', url: 'https://www.aqr.com/Insights/Research/Journal-Article/A-Changing-Stock-Bond-Correlation' },
      { provider: 'Marco Lombardi and Vladyslav Sushko (BIS)', label: 'The correlation of equity and bond returns. BIS Quarterly Review, December 2023, Box A', role: 'basis', url: 'https://www.bis.org/publ/qtrpdf/r_qt2312v.htm' },
      { provider: 'State Street Investment Management', label: 'Mind on the Market, Chart of the Week (October 2, 2025). S&P 500 and Bloomberg US Treasury Index, monthly: the 12-month stock-bond correlation peaked at 0.80 in July 2024, the 36-month at 0.66 in December 2024', role: 'basis', url: 'https://www.ssga.com/library-content/assets/pdf/global/wmu/2025/mom-20251003.pdf' },
    ],
    explainerHeadline: 'When inflation runs the market, the correlation flips.',
    explainerBody: 'For about two decades, from roughly 2000 to 2021, stocks and bonds tended to move in opposite directions, so bonds cushioned equity losses. From about 1970 to the late 1990s the correlation was usually positive, and in 2021 and 2022 it turned positive again. The line here is the most recent turn, measured over a 24-month window.',
    explainerConcept: 'Macro regime',
    concepts: [{ label: '60/40 failure', link: '/part-1-foundation#manifesto' }, { label: 'Correlation regime', link: '/part-1-foundation#manifesto' }, { label: 'Fragility', link: '/part-1-foundation#manifesto' }],
    layout: 'single',
    ariaSummary: 'Line chart of the 24-month rolling correlation of monthly returns on US stocks and 10-year Treasuries, 2014 to 2024. The line stays below zero from 2014 through 2021, between about minus 0.2 and minus 0.55, deepest in 2020 and near minus 0.35 at the end of 2021. It crosses zero in early 2022, inside a shaded inflation-shock stretch, and stays between about plus 0.5 and plus 0.75 through 2023 and 2024.',
    domain: { xMin: 0, xMax: 131, yMin: -0.65, yMax: 0.85 }, yUnit: '24-month rolling correlation of monthly returns, US stocks and 10-year Treasuries', valueUnit: 'ρ',
    xTicks: [{ v: 0, label: '2014' }, { v: 48, label: '2018' }, { v: 96, label: '2022' }, { v: 120, label: '2024' }],
    yTicks: [{ v: -0.5, label: '−0.5' }, { v: 0, label: '0' }, { v: 0.5, label: '+0.5' }],
    series: [{ key: 'c', tier: 'primary', label: 'ρ', pts: corr.pts }],
    bands: [{ id: 'band0', kind: 'shock', x0: corr.flipStart, x1: corr.flipEnd, render: 'pressureField', spanScale: 0.95, seed: 41, intensity: 0.78, asymmetric: 0.16, label: 'inflation shock · 2021 to 2022', labelAnchor: 'peak' }],
    guides: [{ id: 'zero', y: 0, kind: 'zero', label: 'zero correlation' }],
    markers: [{ id: 'marker0', type: 'enso', x: corr.cross.x, y: corr.cross.y, r: 13, label: 'early 2022 · the sign flips', labelAnchor: 'end', labelDy: -28 }],
    levels: [],
    primaryKey: 'c',
    hoverTargets: [
      { id: 'band0', kind: 'band', label: 'Inflation shock, 2021 to 2022', name: 'Inflation shock, 2021 to 2022', why: 'Marks roughly 2021 to 2022, when inflation became the main force moving both stocks and bonds. Shaded for emphasis; the edges are approximate.', claim: 'Inflation, not chance, changed the sign.', concept: 'Macro regime', link: '/part-1-foundation#manifesto' },
      { id: 'marker0', kind: 'marker', label: 'The sign flips', name: 'The sign flips', why: 'The zero crossing. Below it, bonds tended to rise when stocks fell; above it, they tended to fall together.', claim: 'The mechanism that made 60/40 work turned around.', concept: 'Correlation regime', link: '/part-1-foundation#manifesto' },
      { id: 'c', kind: 'series', seriesKey: 'c', label: 'Stock-Treasury correlation', name: '24-month rolling correlation', why: 'Monthly returns on US stocks and 10-year Treasuries, correlated over the trailing 24 months. Negative through 2021, positive from early 2022 through 2024.', claim: 'Correlation depends on the regime.', concept: 'Correlation regime', link: '/part-1-foundation#manifesto' },
    ],
    mobileTapTargets: ['band0', 'marker0', 'c'],
    implementationNotes: 'Wired on /part-1-foundation (#exhibit-02), /part-1-pictures and /framework-in-pictures. Representative, anchored: knots follow the pattern the cited studies report (negative 2014 to 2021, deepest 2020, about -0.35 at end-2021, zero crossing in early 2022); the +0.5 to +0.75 levels in 2023 and 2024 are drawn between State Street’s published 12-month (0.80, July 2024) and 36-month (0.66, December 2024) readings, not plotted from a 24-month series. Smoothed with a monotone cubic. The series end label stays short (the long description is the yUnit) so the right margin does not swell. The pressure field is drawn geometry (brush.pressureField), never a rectangle.',
  },

  {
    chartId: 'p1-cpi-assets', idx: '01', group: 'part-1', intendedPlacement: 'part-1',
    experienceRole: 'comparison',
    claimStack: {
      primaryClaim: 'From the end of 1999 to the end of 2024, US homes and an equal mix of stocks, homes and gold outran consumer prices by a wide margin',
      visualProof: 'CPI, US home prices and an equal mix of stocks, homes and gold, each indexed to 100 at the end of 1999; the shaded gap shows how far the assets outran CPI',
      interactionRole: 'Hover the three lines to compare where each ended',
      readerAction: 'See how far the assets outran CPI',
      caution: 'Drawn through the published figures at the marked points. The path between them is illustrative, not plotted data.',
    },
    status: 'implemented', wiredPublic: true,
    title: 'Assets Outran CPI', setupLine: 'Consumer prices, US home prices and an equal mix of stocks, homes and gold, end of 1999 = 100',
    claimLabel: 'INFLATION · MEASUREMENT',
    frameworkClaim: 'Judged only against CPI, a portfolio can fall far behind the assets it could have owned.',
    readerTakeaway: 'CPI measures what households pay for goods and services. As a yardstick for capital, it sets the bar too low.',
    chartType: 'Three indexed lines (end of 1999 = 100) with a shaded gap between the asset mix and CPI.',
    visualDataMode: 'representative',
    disclosure: DISCLOSURE.representative, footerCta: 'View sources',
    sources: [
      { provider: 'FRED (BLS)', seriesId: 'CPIAUCSL', label: 'Consumer Price Index for All Urban Consumers: All Items in U.S. City Average', role: 'basis', url: 'https://fred.stlouisfed.org/series/CPIAUCSL' },
      { provider: 'FRED (S&P Dow Jones Indices)', seriesId: 'CSUSHPINSA', label: 'S&P Cotality Case-Shiller U.S. National Home Price Index', role: 'basis', url: 'https://fred.stlouisfed.org/series/CSUSHPINSA' },
      { provider: 'Aswath Damodaran (NYU Stern)', label: 'Historical Returns on Stocks, Bonds and Bills: 1928-2024 (updated January 5, 2026): S&P 500 with dividends and gold', role: 'basis', url: 'https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/histretSP.html' },
    ],
    explainerHeadline: 'Prices rose. The assets rose a lot faster.',
    explainerBody: 'Consumer prices rose about 88 percent from the end of 1999 to the end of 2024. Home prices more than tripled. An equal mix of stocks (with dividends), homes, and gold rose about sixfold. Some of that gap is real growth and falling interest rates, so not all of it is inflation. It still shows how far a portfolio judged only against CPI could fall behind the assets it could have owned.',
    explainerConcept: 'Survivable compounding',
    concepts: [{ label: 'Survivable compounding', link: '/part-1-foundation#manifesto' }, { label: 'Wrapper edge', link: '/part-4-tax-architecture-roc-strategy#edge' }, { label: 'Macro thesis', link: '/part-2-lineage-macro-thesis#macro-thesis' }],
    layout: 'single',
    ariaSummary: 'Three lines indexed to 100 at the end of 1999. Consumer prices rise steadily to about 188 by the end of 2024. US home prices climb to about 185 at the July 2006 peak, fall to about 135 at the February 2012 low, and reach about 325. An equal mix of stocks with dividends, homes and gold reaches about 617. The shaded area between that mix and CPI shows how far these assets outran CPI.',
    domain: { xMin: 0, xMax: 25, yMin: 50, yMax: 660 }, yUnit: 'index, end of 1999 = 100', valueUnit: 'idx',
    xTicks: [{ v: 0, label: 'end 1999 = 100' }, { v: 12.17, label: '2012' }, { v: 25, label: '2024' }],
    yTicks: [{ v: 100, label: '100' }, { v: 200 }, { v: 300 }, { v: 400 }, { v: 500 }, { v: 600 }],
    series: [
      { key: 'cpi', tier: 'secondary', label: 'CPI', pts: cpiAssets.cpi, labelDy: 4 },
      { key: 'housing', tier: 'tertiary', label: 'Homes', pts: cpiAssets.housing, labelDy: 2 },
      { key: 'assets', tier: 'primary', label: 'Stocks, homes, gold', pts: cpiAssets.assets },
    ],
    areas: [{ id: 'gap', topKey: 'assets', botKey: 'cpi', kind: 'gap', xFrom: 9, label: 'how far these assets outran CPI' }],
    guides: [{ id: 'base', y: 100, kind: 'base', label: 'base = 100' }],
    markers: [
      { id: 'home-peak', type: 'dot', x: cpiAssets.marks.homePeak.x, y: cpiAssets.marks.homePeak.y, r: 3 },
      { id: 'home-low', type: 'dot', x: cpiAssets.marks.homeLow.x, y: cpiAssets.marks.homeLow.y, r: 3 },
      { id: 'end-cpi', type: 'dot', x: 25, y: cpiAssets.marks.end.cpi, r: 3 },
      { id: 'end-home', type: 'dot', x: 25, y: cpiAssets.marks.end.housing, r: 3 },
      { id: 'end-mix', type: 'dot', x: 25, y: cpiAssets.marks.end.assets, r: 3 },
    ],
    levels: [],
    notes: [],
    primaryKey: 'assets',
    hoverTargets: [
      { id: 'assets', kind: 'series', seriesKey: 'assets', label: 'Stocks, homes, gold', name: 'Equal mix of stocks, homes and gold', why: 'One third each in US stocks with dividends reinvested, US homes and gold, bought at the end of 1999 and held. It ended 2024 at about six times its start.', claim: 'Asset prices, not CPI, set the bar capital had to clear.', concept: 'Survivable compounding', link: '/part-1-foundation#manifesto' },
      { id: 'housing', kind: 'series', seriesKey: 'housing', label: 'Homes', name: 'US home prices', why: 'The Case-Shiller national index. Up to a peak in July 2006, down about 27 percent to February 2012, and more than tripled over the whole stretch.', claim: 'Even homes alone outran CPI.', concept: 'Real assets', link: '/part-1-foundation#manifesto' },
      { id: 'cpi', kind: 'series', seriesKey: 'cpi', label: 'CPI', name: 'Consumer prices (CPI-U)', why: 'Up about 88 percent from the end of 1999 to the end of 2024. CPI tracks what households pay for goods and services, rent included, not the price of owning assets.', claim: 'The lowest bar on the chart.', concept: 'Macro thesis', link: '/part-2-lineage-macro-thesis#macro-thesis' },
    ],
    mobileTapTargets: ['assets', 'housing', 'cpi'],
    implementationNotes: 'Wired on /part-1-foundation (#exhibit-03), /part-1-pictures and /framework-in-pictures. Representative, anchored: year-end knots shaped to the record and smoothed with a monotone cubic, drawn through the checkpoints (CPI 188 at end-2024; homes 185 at the July 2006 peak, 135 at the February 2012 low, 325 at end-2024; the equal-weight buy-and-hold mix about 617 at end-2024), which carry dots. Equity, gold and Case-Shiller data are licensed and are not plotted. yMax 660 keeps every line inside the plot. Three-line composition with direct end labels.',
  },

  {
    chartId: 'p1-policy-constraint', idx: '02', group: 'part-1', intendedPlacement: 'part-1',
    experienceRole: 'evidence',
    storyBeats: [
      { kind: 'context', label: 'Debt held by the public climbs from about 25 to 98 percent of GDP', timing: 'early' },
      { kind: 'mechanism', label: 'Falling rates push the interest bill down to a 2015 low', timing: 'middle' },
      { kind: 'consequence', label: 'By 2025 the bill is back at its 1991 peak, on more than twice the debt', timing: 'late' },
    ],
    claimStack: {
      primaryClaim: 'From 1991 to 2021 federal debt held by the public more than doubled as a share of GDP while falling rates cut the interest bill by more than half. By 2025 the bill was back at its 1991 peak, on more than twice the debt',
      visualProof: 'Two panels on one 1980 to 2025 timeline: federal debt held by the public and federal interest outlays, both as a percent of GDP',
      interactionRole: 'Hover either line for that year\'s value, and the reference line for the 1991 peak',
      readerAction: 'Compare the two lines in 1991, 2015 and 2025',
      caution: 'Fiscal years 1980 to 2025, plotted as published by OMB via FRED (retrieved September 30, 2026). FRED divides each fiscal-year figure by calendar-year GDP.',
    },
    status: 'implemented', wiredPublic: true,
    title: 'The Bill Came Due', setupLine: 'Federal debt held by the public and federal interest outlays, as a percent of GDP, fiscal years 1980 to 2025',
    claimLabel: 'POLICY · CONSTRAINT',
    frameworkClaim: 'Debt and the interest bill on it narrow the room policy has to respond.',
    readerTakeaway: 'For three decades falling rates kept a growing debt cheap to carry. By 2025 they no longer did.',
    chartType: 'Two stacked historical line panels on a shared 1980 to 2025 axis: debt held by the public, and interest outlays, as percent of GDP.',
    visualDataMode: 'historical',
    footerCta: 'View sources',
    historicalFooter: 'Source · FRED (OMB) · FYPUGDA188S and FYOIGDA188S · annual · 1980 to 2025 · percent of GDP',
    sources: [
      { provider: 'FRED (OMB)', seriesId: 'FYPUGDA188S', label: 'Gross Federal Debt Held by the Public as Percent of Gross Domestic Product', role: 'backs-series', dateRange: '1980 to 2025', frequency: 'Annual (fiscal year)', transform: 'None; plotted as published, percent of GDP', units: 'Percent of GDP', retrieved: '2026-09-30', notes: 'U.S. Office of Management and Budget; Federal Reserve Bank of St. Louis. Units: percent of GDP. Retrieved 2026-09-30.', url: 'https://fred.stlouisfed.org/series/FYPUGDA188S' },
      { provider: 'FRED (OMB)', seriesId: 'FYOIGDA188S', label: 'Federal Outlays: Interest as Percent of Gross Domestic Product', role: 'backs-series', dateRange: '1980 to 2025', frequency: 'Annual (fiscal year)', transform: 'None; plotted as published, percent of GDP', units: 'Percent of GDP', retrieved: '2026-09-30', notes: 'U.S. Office of Management and Budget; Federal Reserve Bank of St. Louis. Units: percent of GDP. Retrieved 2026-09-30.', url: 'https://fred.stlouisfed.org/series/FYOIGDA188S' },
    ],
    explainerHeadline: 'The interest bill came back.',
    explainerBody: 'From 1991 to 2021, federal debt held by the public more than doubled as a share of GDP (about 44 to 94 percent) while falling rates cut the interest bill by more than half (3.2 to 1.5 percent of GDP). By 2025 the bill was back at about 3.2 percent of GDP, level with its 1991 peak, on more than twice the debt. The framework reads that as a constraint: the more of the budget that goes to interest, the less room policy has to cushion the next downturn.',
    explainerConcept: 'Policy constraint',
    concepts: [{ label: 'Policy constraint', link: '/part-1-foundation#manifesto' }, { label: 'Macro thesis', link: '/part-2-lineage-macro-thesis#macro-thesis' }, { label: 'Fragility', link: '/part-1-foundation#manifesto' }],
    layout: 'dual',
    ariaSummary: 'Two stacked line charts on a shared timeline, fiscal years 1980 to 2025, both in percent of GDP. Top: federal debt held by the public, about 25 percent in 1980 and 44 percent in 1991, down to about 31 percent in 2001, then up to 98 percent in 2020, 94 percent in 2021 and 98 percent in 2025. Bottom: federal interest outlays, 1.8 percent in 1980, rising to a 3.2 percent peak in 1991, falling to a 1.2 percent low in 2015 and 1.5 percent in 2021, then climbing to 3.0 percent in 2024 and 3.2 percent in 2025, level with the 1991 peak marked by a reference line.',
    xDomain: { xMin: 1980, xMax: 2025 },
    xTicks: [{ v: 1980, label: '1980' }, { v: 1991, label: '1991' }, { v: 2015, label: '2015' }, { v: 2025, label: '2025' }],
    connective: 'the debt rose; the bill fell, then came back',
    panels: [
      { id: 'debtPanel', label: 'Federal debt held by the public', yUnit: 'percent of GDP', valueUnit: '% of GDP', domain: { yMin: 20, yMax: 105 }, yTicks: [{ v: 25, label: '25%' }, { v: 50, label: '50%' }, { v: 75, label: '75%' }, { v: 100, label: '100%' }], series: [{ key: 'debt', tier: 'reference', pts: fiscal.debt }], areas: [{ id: 'debtFill', topKey: 'debt', kind: 'under', tone: 'muted', opacity: 0.12, label: '' }] },
      { id: 'intPanel', label: 'Federal interest outlays', yUnit: 'percent of GDP', valueUnit: '% of GDP', domain: { yMin: 0.5, yMax: 3.6 }, yTicks: [{ v: 1, label: '1%' }, { v: 2, label: '2%' }, { v: 3, label: '3%' }], series: [{ key: 'int', tier: 'primary', pts: fiscal.interest }], guides: [{ id: 'threshold', y: fiscal.peak1991, kind: 'reference', dash: true, label: '1991 peak · 3.2%' }], markers: [{ id: 'burden', type: 'enso', x: 2015, y: fiscal.low2015, r: 11, label: '2015 low · 1.2%', labelAnchor: 'middle', labelDy: 26 }] },
    ],
    primaryKey: 'int',
    hoverTargets: [
      { id: 'debt', kind: 'series', panel: 'debtPanel', seriesKey: 'debt', label: 'Debt held by the public', name: 'Federal debt held by the public', why: 'Debt held outside the government, as a share of GDP: about 44 percent in 1991, 94 percent in 2021 and 98 percent in 2025. It leaves out what the government owes its own trust funds.', claim: 'The stock the bill is charged on.', concept: 'Policy constraint', link: '/part-1-foundation#manifesto' },
      { id: 'int', kind: 'series', panel: 'intPanel', seriesKey: 'int', label: 'Interest outlays', name: 'Federal interest outlays', why: 'What the government paid in interest each fiscal year, as a share of GDP. It peaked at 3.2 percent in 1991, fell to 1.2 percent in 2015 as rates fell, and was back at 3.2 percent in 2025.', claim: 'The bill, back where it was in 1991.', concept: 'Policy constraint', link: '/part-1-foundation#manifesto' },
      { id: 'threshold', kind: 'level', panel: 'intPanel', label: '1991 peak · 3.2%', name: '1991 peak', why: 'The highest interest bill in this record, about 3.2 percent of GDP. In 2025 the bill matched it, this time on more than twice the debt.', claim: 'A reference point from the record, not a forecast.', concept: 'Policy constraint', link: '/part-1-foundation#manifesto' },
      { id: 'burden', kind: 'marker', panel: 'intPanel', label: '2015 low · 1.2%', name: '2015 low', why: 'The cheapest year to carry the debt in this record: 1.2 percent of GDP, with debt at about 72 percent of GDP and short-term rates near zero.', claim: 'Low rates made a large debt look cheap.', concept: 'Policy constraint', link: '/part-1-foundation#manifesto' },
    ],
    mobileTapTargets: ['debt', 'int', 'threshold', 'burden'],
    implementationNotes: 'Wired on /part-1-foundation (#exhibit-04), /part-1-pictures and /framework-in-pictures. Historical: every plotted value is FRED\'s published annual value (FYPUGDA188S, FYOIGDA188S; OMB; fiscal years 1980 to 2025; retrieved 2026-09-30), embedded in the fiscal const. Rendered as two stacked PlotSvg panels (perspectiveSlider off). The before/after reveal was retired here because BeforeAfterRevealSvg hard-codes an "interest-burden pressure" threshold line (default 3%) and a "burden inflects" label that the record does not support. Checkpoints the data reproduces: interest 1980 1.84, 1991 3.16, 2015 1.22, 2021 1.49, 2024 3.00, 2025 3.15; debt 1991 43.7, 2021 93.9, 2025 98.1.',
  },

  {
    chartId: 'p1-sequence-risk', idx: '05', group: 'part-1', intendedPlacement: 'part-1',
    experienceRole: 'mechanism',
    storyBeats: [
      { kind: 'context', label: 'One set of 12 annual returns, shown in two orders', timing: 'early' },
      { kind: 'mechanism', label: 'Both portfolio paths are computed from those returns, with the same withdrawals', timing: 'middle' },
      { kind: 'action', label: 'Compare the two orders of the same returns', timing: 'middle' },
      { kind: 'consequence', label: 'Same average, less than half the ending money', timing: 'late' },
    ],
    claimStack: {
      primaryClaim: 'Same returns, same withdrawals, different order. At a 4 percent withdrawal, the losses-first path ends with less than half as much as the gains-first path; at 6 percent, the losses-first path runs out in year 12.',
      visualProof: 'One set of 12 annual returns, in two orders, drives both portfolio paths',
      interactionRole: 'Hover the returns and the paths to tie the same numbers to different endings',
      readerAction: 'Compare the two orders of the same returns',
      caution: 'A 12-year simulation. The twelve returns are illustrative, not a market record.',
    },
    interaction: { type: 'returnOrder', gesture: 'hover', conceptMatch: 'The same returns are shown in two orders; the paths are computed from those exact returns' },
    motionProfile: { type: 'rowSweep', duration: 'slow', relatedElements: [['good', 'bad']] },
    status: 'implemented', wiredPublic: true,
    title: 'Path Changes Everything', setupLine: 'The same 12 annual returns and the same withdrawals, in two orders: gains first or losses first',
    claimLabel: 'PATH DEPENDENCY · WITHDRAWALS',
    frameworkClaim: 'Same returns, same withdrawals, different order: at a 4 percent withdrawal, the losses-first path ends with less than half as much as the gains-first path.',
    readerTakeaway: 'Withdrawal-phase capital does not care about the average. It cares about the order.',
    chartType: 'Shared return-set proof: one set of 12 annual returns in two orders, with the portfolio paths computed from them.',
    visualDataMode: 'simulation',
    disclosure: DISCLOSURE.simulation, footerCta: 'View methodology',
    sources: [
      { provider: 'Author simulation', label: 'Twelve annual returns in two orders; both paths computed from them', role: 'methodology', transform: 'v(next) = v × (1 + r) − w, where w is a fixed share of the starting balance withdrawn after each year\'s return · $1,000,000 start · 4% default', notes: 'Returns, gains-first order: +30, +24, +19, +15, +11, +8, +5, +1, −4, −10, −17, −25 percent (arithmetic mean 4.75 percent). Losses first is the same list reversed. A deterministic simulation, not historical data.' },
    ],
    personalization: { uses: ['startingValue', 'withdrawalRate'], kind: 'sequence-scale', introLead: 'Withdrawal simulation', note: 'Scales the start and ending values to your starting value and re-runs both paths at your withdrawal rate, held between 2 and 8 percent. A simulation, not a forecast.' },
    explainerHeadline: 'Same returns. Same withdrawals. Different order.',
    explainerBody: 'Both paths take the same 12 annual returns, from +30 percent down to −25 percent, and the same withdrawal every year; the two rows above are the same blocks in opposite order. Early losses force withdrawals from a smaller base, so the later gains compound on less money. At 4 percent of the starting balance a year, losses first ends at about 47 percent of where it began and gains first at about 116 percent. At 6 percent, losses first runs out in year 12.',
    explainerConcept: 'Sequence risk',
    concepts: [{ label: 'Sequence risk', link: '/part-1-foundation#manifesto' }, { label: 'Survivable compounding', link: '/part-1-foundation#manifesto' }],
    layout: 'sequenceRisk',
    ariaSummary: 'A 12-year withdrawal simulation. A row of 12 annual returns is shown twice: gains first, and the same returns reversed, losses first. Below, two portfolio paths are computed from those returns, each starting at $1,000,000 and withdrawing $40,000 at the end of every year. Gains first rises to about $2.39 million in year 7 and ends near $1.16 million. Losses first falls to a low near $321,000 in year 8 and ends near $475,000, less than half as much. A line at zero marks where the money would run out.',
    domain: { xMin: 0, xMax: 12, yMin: 0, yMax: 2.5 },
    xTicks: [{ v: 0, label: 'retire' }, { v: 6, label: 'yr 6' }, { v: 12, label: 'yr 12' }],
    yTicks: [{ v: 0.5, label: '0.5×' }, { v: 1.0, label: '1.0×' }, { v: 2.0, label: '2.0×' }],
    sequence,
    primaryKey: 'good',
    hoverTargets: [
      { id: 'deck', kind: 'deck', label: 'Same return set', name: 'Same returns, opposite order', why: 'Both rows hold the same 12 annual returns: the top in gains-first order, the bottom reversed. The portfolio paths below are computed from exactly these numbers.', claim: 'Same returns, different order.', concept: 'Sequence risk', link: '/part-1-foundation#manifesto' },
      { id: 'good', kind: 'series', seriesKey: 'good', label: 'Good sequence', name: 'Gains first', why: 'Gains arrive first, so withdrawals come out of a growing balance. It takes the same losses later, but from a much larger base.', claim: 'Order, not average, did the work.', concept: 'Sequence risk', link: '/part-1-foundation#manifesto' },
      { id: 'bad', kind: 'series', seriesKey: 'bad', label: 'Bad sequence', name: 'Losses first', why: 'The same returns in reverse. Early losses plus the same withdrawals shrink the base, so the identical later gains compound on far less money.', claim: 'Same average, less than half the ending money.', concept: 'Sequence risk', link: '/part-1-foundation#manifesto' },
      { id: 'depletion', kind: 'level', label: 'Zero balance', name: 'Zero balance', why: 'Where withdrawals would use up the portfolio. At 4 percent neither order gets here. At 6 percent losses first hits zero in year 12, while gains first still ends near its starting value.', claim: 'The order decides who runs out.', concept: 'Sequence risk', link: '/part-1-foundation#manifesto' },
    ],
    mobileTapTargets: ['deck', 'bad', 'good', 'depletion'],
    implementationNotes: 'Wired on /part-1-foundation (#exhibit-05), /part-1-pictures and /framework-in-pictures. Simulation, the exhibit most likely to be misread as a backtest, so its disclosure stays. sequenceRisk layout: a shared return deck above two paths computed from it, with withdrawal ticks on both; the renderer re-simulates at the reader\'s withdrawal rate, clamped to 2 to 8 percent. sequence.depletion is 0, so the renderer\'s threshold line sits on the zero-balance baseline; its visible label text ("depletion risk") is fixed in FrameworkChart.jsx. Checked: at 4% gains first ends 1.158 and losses first 0.475 (trough 0.321 in year 8); at 6% losses first reaches 0 in year 12 and gains first ends 0.982.',
  },

  {
    chartId: 'p1-convexity-survival', idx: '06', group: 'part-1', intendedPlacement: 'part-1',
    claimStack: {
      primaryClaim: 'Buying a fixed amount of Bitcoin every month from January 2018 to December 2024, through two falls of more than 70 percent, still ended at about seven times the money put in',
      visualProof: 'The value of a fixed monthly purchase along a drawn price path with two falls of more than 70 percent, against the straight line of money put in',
      interactionRole: 'Hover the value line, the money-in line and the deepest fall',
      readerAction: 'Follow the value line through both falls',
      caution: 'A drawn price path with two falls of more than 70 percent, like those of 2018 and 2021 to 2022; it is not Bitcoin\'s price history. The dated figures in the explainer come from Coinbase prices and are not plotted.',
    },
    status: 'implemented', wiredPublic: true,
    title: 'Survive the Path', setupLine: 'A fixed monthly purchase over seven years through two deep falls, against the total put in (100 = everything invested)',
    claimLabel: 'CONVEXITY · ENDURANCE',
    frameworkClaim: 'Upside only pays if nothing forces you to sell on the way down.',
    readerTakeaway: 'What made both falls survivable here was that nothing forced a sale. Keeping it that way is the job of position sizing.',
    chartType: 'Value of a fixed monthly purchase along a representative price path, against cumulative money invested, with falls from the running peak shaded.',
    visualDataMode: 'representative',
    disclosure: DISCLOSURE.representative, footerCta: 'View sources',
    sources: [
      { provider: 'ACF · Part 3', label: 'Rule stated in Part 3 · Optimizing for multi-cycle survivability', role: 'verifies-concept', url: '/part-3-bitcoin-convexity-backbone#survivability' },
      { provider: 'FRED (Coinbase)', seriesId: 'CBBTCUSD', label: 'Coinbase Bitcoin. Source of the dated falls and the monthly-purchase multiple in the explainer; not plotted', role: 'verifies-concept', url: 'https://fred.stlouisfed.org/series/CBBTCUSD' },
      { provider: 'Author calculation', label: 'Fixed monthly purchase along the drawn price path', role: 'methodology', transform: 'Each month, units bought = contribution ÷ price; value = units held × price; 84 equal contributions summing to 100', notes: 'The price path is illustrative, not a price history.' },
    ],
    explainerHeadline: 'The gains went to whoever was still holding.',
    explainerBody: 'Bitcoin fell more than 70 percent twice, in 2018 and again in 2021 and 2022. Buying a fixed amount every month from January 2018 to December 2024, through both falls, still ended at about seven times the money put in. That only works for a position small enough that nothing forces a sale at the bottom.',
    explainerConcept: 'Position sizing',
    concepts: [{ label: 'Convexity', link: '/part-2-lineage-macro-thesis#lineage' }, { label: 'Position sizing', link: '/part-5-portfolio-construction-position-management#torque' }, { label: 'Survivable compounding', link: '/part-1-foundation#manifesto' }],
    layout: 'single',
    ariaSummary: 'Two lines over seven years. A straight line climbs to 100, the total put in by a fixed monthly purchase. The value of those purchases, drawn along a price path with two falls of more than 70 percent, starts at the first contribution, rises, drops about 70 percent from its peak in the second fall, and ends near 700, about seven times the money put in. Falls from the running peak are shaded.',
    domain: { xMin: 0, xMax: 7, yMin: 0, yMax: 760 }, yUnit: 'index · total invested = 100', valueUnit: 'idx',
    xTicks: [{ v: 0, label: 'start' }, { v: 7, label: 'year 7' }],
    yTicks: [{ v: 100 }, { v: 300 }, { v: 500 }, { v: 700 }],
    series: [
      { key: 'invested', tier: 'reference', label: 'Money in', pts: survival.invested },
      { key: 'value', tier: 'primary', label: 'Value', pts: survival.value },
    ],
    areas: [{ id: 'drawdown', topKey: 'value', kind: 'peak', label: '' }],
    markers: [
      { id: 'survived', type: 'dot', x: survival.trough.x, y: R(survival.trough.y), r: 3.2, label: 'down about 70% from its peak', labelAnchor: 'start', labelDy: 22 },
      { id: 'endpoint', type: 'dot', x: 7, y: R(valueAt(survival.value, 7)), r: 3.4, label: 'about 7× the money put in', labelAnchor: 'end', labelDy: -14 },
    ],
    notes: [],
    levels: [],
    primaryKey: 'value',
    hoverTargets: [
      { id: 'value', kind: 'series', seriesKey: 'value', label: 'Value', name: 'Value of the purchases', why: 'What the monthly purchases are worth along the drawn path. It falls about 70 percent from its peak in the second fall and ends near seven times the money put in.', claim: 'Both falls hurt. Neither ended it.', concept: 'Convexity', link: '/part-2-lineage-macro-thesis#lineage' },
      { id: 'invested', kind: 'series', seriesKey: 'invested', label: 'Money in', name: 'Money put in', why: 'The same amount every month for seven years, scaled so the total is 100. Ending above it is the test.', claim: 'The line the value has to beat.', concept: 'Position sizing', link: '/part-5-portfolio-construction-position-management#torque' },
      { id: 'survived', kind: 'marker', label: 'Deepest fall', name: 'Deepest fall', why: 'The value line\'s deepest drop, about 70 percent from its peak. A buyer with no loan against the position and no need for the cash is never forced to sell here; an oversized or borrowed-against position can be.', claim: 'Survivable only if nothing forces the sale.', concept: 'Position sizing', link: '/part-5-portfolio-construction-position-management#torque' },
      { id: 'endpoint', kind: 'marker', label: 'Year 7', name: 'Year 7', why: 'After both falls the value ends near 700, about seven times the 100 put in.', claim: 'Through the falls, not around them.', concept: 'Survivable compounding', link: '/part-1-foundation#manifesto' },
    ],
    mobileTapTargets: ['value', 'survived', 'endpoint', 'invested'],
    implementationNotes: 'Wired on /part-1-foundation (#exhibit-06), /part-1-pictures and /framework-in-pictures. Representative: the value line is computed (fixed monthly purchase) along a drawn price path whose two falls are 74% and 73% from their peaks; value starts at the first contribution, falls about 71% from its peak in the second fall and ends near 695 against 100 invested. Coinbase data is not plotted; the dated figures in the explainer (falls of 84% and 77%, about 7.0x for monthly purchases Jan 2018 to Dec 2024) were checked against FRED CBBTCUSD. Falls from the running peak are shaded behind the value line.',
  },

  /* ── PART 2 · LINEAGE & MACRO THESIS ────────────────────────────────────── */
  {
    chartId: 'p2-method-before-macro', idx: 'P2-01', group: 'part-2', intendedPlacement: 'part-2',
    claimStack: {
      primaryClaim: 'The method stays fixed while the macro thesis is revisited as regimes change',
      visualProof: 'A flat method axis through the center, with the macro-thesis line running above it in regime A, crossing at a transition, running below it in regime B and crossing back above in regime C',
      interactionRole: 'Hover the thesis, the axis or a transition to read what moves, what holds and what gets reassessed',
      readerAction: 'Follow the thesis line as it crosses an axis that never moves',
      caution: 'Regimes A, B and C are placeholders, not dated periods, and the line has no scale',
    },
    status: 'implemented', wiredPublic: true,
    title: 'Method Before Macro', setupLine: 'One fixed axis for the method and one moving line for the macro thesis, across three regimes',
    claimLabel: 'LINEAGE · METHOD',
    frameworkClaim: 'The framework’s method persists across regimes; the macro thesis changes with them.',
    readerTakeaway: 'Hold the method still; change the thesis when the evidence does.',
    chartType: 'One field: a fixed central method axis with the macro-thesis line moving above, through and below it across three regimes.',
    visualDataMode: 'conceptual', disclosure: DISCLOSURE.conceptual, footerCta: 'View framework basis',
    sources: [
      { provider: 'ACF · Part 2', label: 'Rule stated in Part 2 · The intellectual foundations, thesis-agnostic', role: 'verifies-concept', url: '/part-2-lineage-macro-thesis#lineage' },
      { provider: 'ACF · Part 1', label: 'Rule stated in Part 1 · The traditional portfolio playbook is failing quietly', role: 'verifies-concept', url: '/part-1-foundation#manifesto' },
    ],
    explainerHeadline: 'The method is the axis; the thesis moves around it.',
    explainerBody: 'The lineage supplies the method: how to think about risk, conviction, sizing and survival. That part stays put. The macro thesis is the application, and it moves: above the axis in one regime, reassessed as it crosses at each transition, below it in the next. Mistake a turn in the thesis for a failure of the method and you abandon a sound process just when you need it.',
    explainerConcept: 'Method vs application',
    concepts: [{ label: 'Macro thesis', link: '/part-2-lineage-macro-thesis#macro-thesis' }, { label: 'Survivable compounding', link: '/part-1-foundation#manifesto' }],
    layout: 'single',
    ariaSummary: 'A single conceptual field. A flat horizontal axis for the method runs through the center. The macro-thesis line runs above it in regime A, crosses it at the first regime transition, runs below it in regime B, and crosses back above it in regime C. The axis never moves; only the thesis does.',
    domain: { xMin: 0, xMax: 100, yMin: 0, yMax: 100 }, yUnit: '', yTicks: [],
    xTicks: [{ v: 15, label: 'regime A' }, { v: 50, label: 'regime B' }, { v: 85, label: 'regime C' }],
    series: [{ key: 'thesis', tier: 'primary', label: 'Macro thesis', pts: p2Method.thesis }],
    guides: [{ id: 'method', y: p2Method.spine, kind: 'reference', label: 'METHOD · LINEAGE' }],
    markers: [
      { id: 'transition', type: 'dot', x: p2Method.cross1, y: p2Method.spine, r: 3.2, label: 'regime transition', labelAnchor: 'middle', labelDy: 16 },
      { id: 'transition2', type: 'dot', x: p2Method.cross2, y: p2Method.spine, r: 3.2 },
    ],
    notes: [{ x: 15, y: 86, text: 'the thesis moves around a fixed method', anchor: 'middle' }],
    primaryKey: 'thesis',
    hoverTargets: [
      { id: 'thesis', kind: 'series', seriesKey: 'thesis', label: 'Macro thesis', name: 'Macro thesis', why: 'The application layer. It changes when the regime does, because a new structural force takes over or the current thesis is falsified. It should not move with every data release.', claim: 'Revise the thesis when the evidence changes.', concept: 'Macro thesis', link: '/part-2-lineage-macro-thesis#macro-thesis' },
      { id: 'method', kind: 'level', label: 'Method · lineage', name: 'The method (the axis)', why: 'Risk, conviction, sizing and survival: the axis the thesis moves around. It stays where it is when the regime changes.', claim: 'The method is the constant.', concept: 'Method vs application', link: '/part-2-lineage-macro-thesis#lineage' },
      { id: 'transition', kind: 'marker', label: 'Regime transition', name: 'Regime transition', why: 'The thesis crosses the axis here and is reassessed for the new regime. The process doing the reassessing does not change.', claim: 'Reassess the thesis, not the method.', concept: 'Method vs application', link: '/part-2-lineage-macro-thesis#lineage' },
    ],
    mobileTapTargets: ['thesis', 'method', 'transition'],
    implementationNotes: 'Conceptual single field (was a stacked dual): the method is a fixed central axis (guide) and the macro thesis moves around it, above in A, crossing at transitions, below in B, above in C. No numeric axes by design.',
  },

  {
    chartId: 'p2-ruin-comes-first', idx: 'P2-02', group: 'part-2', intendedPlacement: 'part-2',
    claimStack: {
      primaryClaim: 'Survival comes before optimization, because ruin cannot be undone',
      visualProof: 'Two paths with similar early volatility: one draws down and recovers; the other falls through a charcoal point-of-no-return line at the ruin mark, is forced out and flatlines',
      interactionRole: 'Hover the ruin mark, the line or either path to read why matched volatility hid one book’s fragility',
      readerAction: 'Follow the path that crosses the line and never recovers',
      caution: 'The paths have no scale; the line marks the idea of a forced exit, not a particular percentage loss',
    },
    status: 'implemented', wiredPublic: true,
    title: 'Ruin Comes First', setupLine: 'Two portfolios with similar volatility and very different worst cases',
    claimLabel: 'FRAGILITY · SURVIVAL',
    frameworkClaim: 'Fragility is nonlinear and ruin is irreversible; survival must precede optimization.',
    readerTakeaway: 'Nothing compounds once you are forced out.',
    chartType: 'Two outcome paths with similar volatility but different left tails: one survives, one is forced out.',
    visualDataMode: 'conceptual', disclosure: DISCLOSURE.conceptual, footerCta: 'View framework basis',
    sources: [
      { provider: 'ACF · Part 1', label: 'Rule stated in Part 1 · The traditional portfolio playbook is failing quietly', role: 'verifies-concept', url: '/part-1-foundation#manifesto' },
      { provider: 'ACF · Part 2', label: 'Rule stated in Part 2 · Nassim Nicholas Taleb: Antifragility & ruin avoidance', role: 'verifies-concept', url: '/part-2-lineage-macro-thesis#lineage' },
    ],
    explainerHeadline: 'Some losses end the game.',
    explainerBody: 'Two books can share the same volatility and look equally lively until one of them crosses a line it cannot come back from: leverage gets called, withdrawals force sales, or the loss is too deep to rebuild. The recovery then happens without it. The framework optimizes only among the paths that survive, and it keeps the whole book away from that line even while single positions draw down hard.',
    explainerConcept: 'Risk of ruin',
    concepts: [{ label: 'Fragility', link: '/part-1-foundation#manifesto' }, { label: 'Survivable compounding', link: '/part-1-foundation#manifesto' }],
    layout: 'single',
    ariaSummary: 'Two value paths with similar early volatility. One draws down and recovers. The other falls through a point-of-no-return line, is forced out, and flatlines well below where it started, never recovering.',
    domain: { xMin: 0, xMax: 100, yMin: 0, yMax: 120 }, yUnit: '',
    xTicks: [{ v: 0, label: 'today' }, { v: 100, label: 'horizon' }], yTicks: [],
    series: [
      { key: 'robust', tier: 'primary', label: 'Survives', pts: p2Ruin.robust },
      { key: 'fragile', tier: 'stress', label: 'Ruined', pts: p2Ruin.fragile, labelDy: 2 },
    ],
    levels: [{ id: 'ruin', y: 30, kind: 'charcoal', label: 'forced out · point of no return' }],
    markers: [{ id: 'cross', type: 'enso', x: p2Ruin.crossX, y: R(valueAt(p2Ruin.fragile, p2Ruin.crossX)), r: 12, label: 'ruin · irreversible', labelAnchor: 'end', labelDy: -16 }],
    primaryKey: 'robust',
    hoverTargets: [
      { id: 'cross', kind: 'marker', label: 'Ruin', name: 'The absorbing barrier', why: 'Once a book is forced out here, it cannot ride the recovery that follows. Compounding stops.', claim: 'Ruin is irreversible.', concept: 'Risk of ruin', link: '/part-2-lineage-macro-thesis#lineage' },
      { id: 'fragile', kind: 'series', seriesKey: 'fragile', label: 'Ruined path', name: 'Ruined path', why: 'Same early volatility as its twin. One shock past the line and it never compounds again.', claim: 'Volatility hid the fragility.', concept: 'Fragility', link: '/part-1-foundation#manifesto' },
      { id: 'robust', kind: 'series', seriesKey: 'robust', label: 'Surviving path', name: 'Surviving path', why: 'It draws down hard and recovers, because nothing forced it to sell at the bottom.', claim: 'Survival keeps the option open.', concept: 'Survivable compounding', link: '/part-1-foundation#manifesto' },
      { id: 'ruin', kind: 'level', label: 'Point of no return', name: 'Point of no return', why: 'Where a portfolio can no longer stay invested: leverage is called, withdrawals force sales, or the loss is too large to rebuild. The framework keeps the whole book away from it; single positions may still fall a long way.', claim: 'Keep the book away from the line.', concept: 'Risk of ruin', link: '/part-2-lineage-macro-thesis#lineage' },
    ],
    mobileTapTargets: ['cross', 'fragile', 'robust', 'ruin'],
    implementationNotes: 'Conceptual; no numeric axes. The two paths share early volatility on purpose, so the difference is only the left tail. The ruined path flatlines at 12 (forced out), not at zero; the barrier is a portfolio-level event, not a position drawdown limit.',
  },

  {
    chartId: 'p2-conviction-needs-exit', idx: 'P2-03', group: 'part-2', intendedPlacement: 'part-2',
    claimStack: {
      primaryClaim: 'Conviction earns a larger position only inside the concentration limits, and only with an exit set in advance',
      visualProof: 'Two size-versus-conviction lines: the framework line sits at zero below CIS 50, climbs through Part 5’s Torque bands and meets the concentration cap only at the top; the conviction-alone line starts above zero, cuts through the cap near the middle and runs on to an unbounded-risk dot',
      interactionRole: 'Hover either line, the cap or the runaway dot to read what sets the ceiling and what the exit adds',
      readerAction: 'Find where conviction alone breaks through the cap',
      caution: 'Sizes follow Part 5’s Torque bands with no scale shown. The cap and the exit are written rules you carry out; the dashboard flags a position above the cap, records every trade and never blocks one (as of September 2026)',
    },
    status: 'implemented', wiredPublic: true,
    title: 'Conviction Needs an Exit', setupLine: 'Size may rise with conviction, but only inside the concentration cap and with an exit written in advance',
    claimLabel: 'CONCENTRATION · DISCIPLINE',
    frameworkClaim: 'Concentration works only when it is paired with close monitoring and exits set in advance.',
    readerTakeaway: 'Size up on conviction, inside the cap, with the exit already written.',
    chartType: 'Position size versus conviction: sized within bands and a cap, versus conviction alone.',
    visualDataMode: 'conceptual', disclosure: DISCLOSURE.conceptual, footerCta: 'View framework basis',
    sources: [
      { provider: 'ACF · Part 2', label: 'Rule stated in Part 2 · Stanley Druckenmiller: Conviction & asymmetric positioning', role: 'verifies-concept', url: '/part-2-lineage-macro-thesis#lineage' },
      { provider: 'ACF · Part 5', label: 'Rule stated in Part 5 · Torque: leverage on regime forces', role: 'verifies-concept', url: '/part-5-portfolio-construction-position-management#torque' },
    ],
    explainerHeadline: 'Conviction earns size inside limits set in advance.',
    explainerBody: 'High conviction earns a larger band, but only inside the concentration limits and only with an exit standard written before the position turns emotional. Those are two separate decisions: the score, its band and the concentration limits decide how big, and posture rules, tripwires and thesis evidence decide when to leave. Skip either one and the concentration that compounds in your favor is the same concentration that can ruin you.',
    explainerConcept: 'Tripwire',
    concepts: [{ label: 'Position sizing', link: '/part-5-portfolio-construction-position-management#torque' }, { label: 'Tripwire', link: '/part-5-portfolio-construction-position-management#management' }],
    layout: 'single',
    ariaSummary: 'Position size against conviction. The framework line stays at zero below a CIS of 50, then rises through the sizing bands and reaches the concentration cap only at the highest conviction. The conviction-alone line starts above zero, crosses the cap near the middle and keeps rising into unbounded risk.',
    domain: { xMin: 0, xMax: 100, yMin: 0, yMax: 50 }, yUnit: '',
    xTicks: [{ v: 0, label: 'low conviction' }, { v: 50, label: 'CIS 50' }, { v: 100, label: 'high conviction' }], yTicks: [],
    series: [
      { key: 'disciplined', tier: 'primary', label: 'Within the cap', pts: p2Conviction.disciplined },
      { key: 'reckless', tier: 'stress', label: 'Conviction alone', pts: p2Conviction.reckless, labelDy: -2 },
    ],
    levels: [{ id: 'cap', y: 20, kind: 'charcoal', label: 'concentration cap · 15% default' }],
    markers: [{ id: 'unbounded', type: 'dot', x: 78, y: R(valueAt(p2Conviction.reckless, 78)), r: 3.2, label: 'no cap, no exit → unbounded risk', labelAnchor: 'end', labelDy: -12 }],
    primaryKey: 'disciplined',
    hoverTargets: [
      { id: 'disciplined', kind: 'series', seriesKey: 'disciplined', label: 'Within the cap', name: 'Sized within the bands', why: 'CIS below 50 removes allocation eligibility, so the line starts at zero. Above that, each score can justify at most the top of its band (drawn for Torque, the only posture that can reach the cap), and the exit standard is defined before the position becomes emotional.', claim: 'Size is earned, and limited.', concept: 'Position sizing', link: '/part-5-portfolio-construction-position-management#torque' },
      { id: 'reckless', kind: 'series', seriesKey: 'reckless', label: 'Conviction alone', name: 'Sized on conviction alone', why: 'Same conviction with no bands, no cap and no exit. Size keeps climbing, and the left tail climbs with it.', claim: 'Conviction without limits is ruin risk.', concept: 'Fragility', link: '/part-1-foundation#manifesto' },
      { id: 'cap', kind: 'level', label: 'Concentration cap', name: 'The concentration cap', why: 'The most one position may carry across the household: 15% by default, with the 18% absolute maximum reachable only under a documented override. Bitcoin sits outside these limits under Part 3’s rules. The exit decides when you leave, not how big you get.', claim: 'The cap is set before conviction runs.', concept: 'Tripwire', link: '/part-5-portfolio-construction-position-management#management' },
      { id: 'unbounded', kind: 'marker', label: 'Unbounded risk', name: 'Unbounded risk', why: 'Past the cap, with no exit, one regime turn can leave the position in a hole it cannot climb out of.', claim: 'This is where conviction becomes danger.', concept: 'Risk of ruin', link: '/part-2-lineage-macro-thesis#lineage' },
    ],
    mobileTapTargets: ['disciplined', 'cap', 'reckless', 'unbounded'],
    implementationNotes: 'Conceptual; x reads as CIS (0 to 100), y is position size with no scale shown. The framework line traces Part 5’s Torque band ceilings (0 below 50; 2–4, 4–8 and 8–15 percent, linear within each band) scaled so 15 percent sits on the cap level, with no noise, so it never crosses the cap. The cap is the concentration limit and does not depend on the exit; the exit governs when a position is closed.',
  },

  {
    chartId: 'p2-markets-feed-back', idx: 'P2-04', group: 'part-2', intendedPlacement: 'part-2',
    claimStack: {
      primaryClaim: 'Price can change the fundamentals it is supposed to reflect',
      visualProof: 'One horizontal row of five shared stage cards (price, capital, buildout, fundamentals, validation), each split into a reinforcing and a reversing state, with a teal ribbon through the top states, a clay ribbon through the bottom states, and two return arcs that close validation back into price above and below the row',
      interactionRole: 'Hover a stage to see why it drives the next, and how the same mechanism runs in either direction',
      readerAction: 'Trace either path back into price',
      caution: 'A diagram of Soros’s reflexivity loop; it says nothing about how fast or how far any loop runs',
    },
    status: 'implemented', wiredPublic: true,
    title: 'Markets Feed Back', setupLine: 'Price changes capital behavior; capital changes fundamentals; fundamentals feed back into price.',
    claimLabel: 'REFLEXIVITY · FEEDBACK',
    frameworkClaim: 'Prices can change the fundamentals they are supposed to reflect.',
    readerTakeaway: 'Price is an input, not just an output.',
    chartType: 'Reflexivity circuit: five shared stages split into reinforcing and reversing states, both paths closing back into price.',
    visualDataMode: 'conceptual', disclosure: DISCLOSURE.conceptual, footerCta: 'View framework basis',
    sources: [{ provider: 'ACF · Part 2', label: 'Rule stated in Part 2 · George Soros: Reflexivity & regime feedback loops', role: 'verifies-concept', url: '/part-2-lineage-macro-thesis#lineage' }],
    explainerHeadline: 'Price can write the fundamentals it claims to read.',
    explainerBody: 'A rising share price lets a company raise money cheaply; the money builds capacity; the capacity shows up as revenue, which seems to justify the price. Run it backward, with capital leaving or results disappointing, and the same loop that built the story takes it apart.',
    explainerConcept: 'Reflexivity',
    concepts: [{ label: 'Reflexivity', link: '/part-2-lineage-macro-thesis#lineage' }, { label: 'Macro thesis', link: '/part-2-lineage-macro-thesis#macro-thesis' }],
    layout: 'feedbackLoop',
    ariaSummary: 'Reflexivity as one mechanism in a single row of five stages: price, capital, buildout, fundamentals and validation. Each stage holds two states. A reinforcing path runs left to right through the top states (price rises, capital flows in, buildout expands, fundamentals improve, validation confirms) and arcs back above the row into price. A reversing path runs through the bottom states (price falls, capital tightens, buildout slows, fundamentals weaken, validation breaks) and arcs back below the row into the same price. Both loops close back into price.',
    feedbackLoop: {
      centerLabel: 'reflexivity',
      returnLabel: 'evidence feeds back into price',
      lanes: [
        { id: 'reinforce', label: 'REINFORCING', note: 'when price rises', tone: 'accent', nodes: [
          { stage: 'price', label: 'rises' }, { stage: 'capital', label: 'flows in' }, { stage: 'buildout', label: 'expands' }, { stage: 'fundamentals', label: 'improve' }, { stage: 'validation', label: 'confirms' },
        ] },
        { id: 'reverse', label: 'REVERSING', note: 'when price falls', tone: 'stress', nodes: [
          { stage: 'price', label: 'falls' }, { stage: 'capital', label: 'tightens' }, { stage: 'buildout', label: 'slows' }, { stage: 'fundamentals', label: 'weaken' }, { stage: 'validation', label: 'breaks' },
        ] },
      ],
      annotations: [
        { from: 'capital', to: 'buildout', text: 'financing changes capacity' },
        { from: 'buildout', to: 'fundamentals', text: 'execution becomes evidence' },
        { from: 'validation', to: 'price', text: 'evidence feeds back into price' },
      ],
    },
    primaryKey: 'price',
    hoverTargets: [
      { id: 'price', kind: 'node', label: 'Price', name: 'Price', why: 'A readout of value, and also a signal that pulls capital in or pushes it away. Both directions of the loop start and end here.', claim: 'Price moves first.', concept: 'Reflexivity', link: '/part-2-lineage-macro-thesis#lineage' },
      { id: 'capital', kind: 'node', label: 'Capital', name: 'Capital', why: 'Follows the price signal: it flows in on the way up and tightens on the way down, funding or starving the buildout.', claim: 'Capital chases the signal.', concept: 'Capital pathways', link: '/part-2-lineage-macro-thesis#macro-thesis' },
      { id: 'buildout', kind: 'node', label: 'Buildout', name: 'Buildout', why: 'Money raised is not yet a fundamental. It has to become rigs, plants, networks and teams. The buildout is where financing turns into real capacity, or stalls.', claim: 'Financing changes capacity.', concept: 'Capital pathways', link: '/part-2-lineage-macro-thesis#macro-thesis' },
      { id: 'fundamentals', kind: 'node', label: 'Fundamentals', name: 'Fundamentals', why: 'They change because the buildout ran, or because it slowed. The story becomes partly true, or hollows out.', claim: 'The narrative funds itself.', concept: 'Reflexivity', link: '/part-2-lineage-macro-thesis#lineage' },
      { id: 'validation', kind: 'node', label: 'Validation', name: 'Validation', why: 'Better fundamentals ratify the price and the loop reinforces. Disappointment breaks it, and the same loop reverses, fast.', claim: 'Confirmation feeds the next move, in either direction.', concept: 'Macro thesis', link: '/part-2-lineage-macro-thesis#macro-thesis' },
    ],
    mobileTapTargets: ['price', 'capital', 'buildout', 'fundamentals', 'validation'],
    implementationNotes: 'feedbackLoop layout: a linear reflexivity circuit (NOT the systemLoop ring, which is reserved for true circular systems). ONE clean horizontal row of five shared stage cards (price · capital · buildout · fundamentals · validation), each vertically split into its reinforcing state (top) and reversing state (bottom). A teal ribbon runs left→right through the top states; a clay ribbon runs through the bottom states; BOTH close from validation back into price, teal return arc above the system and clay below: complete, solid, equally weighted, directionally obvious. No staggered cards, no braiding, no path overlap: the causal structure stays linear; artistry lives in the brush strokes and asymmetric return-arc curvature. Three persistent transition annotations. Desktop-first; mobile adaptation follows visual approval.',
  },

  {
    chartId: 'p2-time-changes-prudence', idx: 'P2-05', group: 'part-2', intendedPlacement: 'part-2',
    claimStack: {
      primaryClaim: 'A long horizon magnifies tax drag',
      visualProof: 'Two compounding lines from the same start, one at 10 percent tax-free and one at 7.5 percent after yearly tax, sit close together for decades on a linear scale and then split: about 2× apart at year 30 and about 5× apart at year 70',
      interactionRole: 'Hover either line or a checkpoint to read the multiples at 30 and 70 years',
      readerAction: 'Compare the gap at year 30 with the gap at year 70',
      caution: 'Tax-free means qualified Roth growth under current law. The taxed line assumes every year’s gain is realized, the costly case; a gain realized once costs less (Part 4)',
    },
    status: 'implemented', wiredPublic: true,
    title: 'Time Changes Prudence', setupLine: 'The same 10 percent a year for 70 years, compounded tax-free or taxed every year',
    claimLabel: 'HORIZON · PRUDENCE',
    frameworkClaim: 'Longer horizons change what counts as prudent: the same return, taxed every year, falls further behind the longer it compounds.',
    readerTakeaway: 'The drag is the same every year; the horizon decides what it costs.',
    chartType: 'Two compounding multiples from the same 10 percent return, tax-free versus taxed every year, over 70 years (simulation).',
    visualDataMode: 'simulation', disclosure: 'Representative simulation · The same 10 percent a year, tax-free versus taxed every year at a 25 percent blended rate; no volatility, fees or withdrawals; not a forecast', footerCta: 'View methodology',
    sources: [
      { provider: 'Author calculation', label: '1.10^t tax-free vs 1.075^t (10% a year less a 25% blended tax on gains realized every year) · year 30: 17.4× vs 8.8× · year 70: 790× vs 158×', role: 'methodology', notes: 'The same inputs as Part 5’s wrapper-compounding example, where $100,000 becomes about $1,745,000 tax-free and about $875,000 taxed every year over 30 years. No volatility, fees or withdrawals.' },
      { provider: 'ACF · Part 2', label: 'Rule stated in Part 2 · Tax as a structural return multiplier', role: 'verifies-concept', url: '/part-2-lineage-macro-thesis#tax' },
    ],
    explainerHeadline: 'The horizon sets the price of tax drag.',
    explainerBody: 'Both lines earn the same 10 percent a year. One compounds tax-free; the other pays a 25 percent blended rate on its gains every year, so it compounds at 7.5 percent. After 30 years the taxed line holds about half of the tax-free result, and after 70 about a fifth. Part 4 works the case of a gain realized once, and Part 5 works this annual case in dollars.',
    explainerConcept: 'Survivable compounding',
    concepts: [{ label: 'Tax architecture', link: '/part-4-tax-architecture-roc-strategy#edge' }, { label: 'Convexity', link: '/part-2-lineage-macro-thesis#lineage' }],
    layout: 'single',
    ariaSummary: 'Two growth multiples over seventy years from the same ten percent annual return. The tax-free line reaches about 17 times its start at year thirty and about 790 times at year seventy. The line taxed every year compounds at seven and a half percent and reaches about 9 times its start at year thirty and about 158 times at year seventy. On this linear scale the two look close for decades, then split wide.',
    domain: { xMin: 0, xMax: 70, yMin: 0, yMax: 880 }, yUnit: '', valueUnit: '× start',
    xTicks: [{ v: 0, label: 'yr 0' }, { v: 30, label: 'yr 30' }, { v: 70, label: 'yr 70' }],
    yTicks: [{ v: 200, label: '200×' }, { v: 400, label: '400×' }, { v: 600, label: '600×' }],
    series: [
      { key: 'taxfree', tier: 'primary', label: 'Tax-free · 10% a year', pts: p2Time.taxfree },
      { key: 'taxed', tier: 'reference', label: 'Taxed yearly · 7.5% net', pts: p2Time.taxed, labelDy: 12 },
    ],
    markers: [
      { id: 'y30', type: 'dot', x: 30, y: R(valueAt(p2Time.taxfree, 30)), r: 3.2, label: '30 yrs · 17.4× vs 8.8×', labelAnchor: 'end', labelDy: -12 },
      { id: 'y70', type: 'dot', x: 70, y: R(valueAt(p2Time.taxfree, 70)), r: 3.2, label: '70 yrs · 790× vs 158×', labelAnchor: 'end', labelDy: -10 },
    ],
    primaryKey: 'taxfree',
    hoverTargets: [
      { id: 'taxfree', kind: 'series', seriesKey: 'taxfree', label: 'Tax-free · 10% a year', name: 'Tax-free path', why: 'Every year compounds the full 10 percent, because nothing is paid along the way. Tax-free here means qualified Roth growth under current law.', claim: 'Nothing leaks, so everything compounds.', concept: 'Wrapper edge', link: '/part-4-tax-architecture-roc-strategy#edge' },
      { id: 'taxed', kind: 'series', seriesKey: 'taxed', label: 'Taxed yearly · 7.5% net', name: 'Taxed every year', why: 'The same 10 percent, less a 25 percent blended tax on gains realized each year, compounds at 7.5 percent. A 2.5-point haircut looks small in any one year.', claim: 'Small annual drag, large lifetime cost.', concept: 'Tax architecture', link: '/part-4-tax-architecture-roc-strategy#edge' },
      { id: 'y30', kind: 'marker', label: 'Year 30', name: 'Year 30 · 17.4× vs 8.8×', why: 'Part 5’s case: $100,000 grows to about $1,745,000 tax-free and about $875,000 taxed every year. The taxed path ends with about half.', claim: 'At 30 years, about 2× apart.', concept: 'Tax architecture', link: '/part-4-tax-architecture-roc-strategy#edge' },
      { id: 'y70', kind: 'marker', label: 'Year 70', name: 'Year 70 · 790× vs 158×', why: 'Forty more years at the same rates and the taxed path ends with about a fifth of the tax-free result. That is the 60-to-80-year horizon of Edelman’s longevity argument in Part 2.', claim: 'At 70 years, about 5× apart.', concept: 'Tax architecture', link: '/part-4-tax-architecture-roc-strategy#edge' },
    ],
    mobileTapTargets: ['taxfree', 'taxed', 'y30', 'y70'],
    implementationNotes: 'SIMULATION: deterministic compounding from Part 5’s inputs (1.10^t vs 1.075^t over 70 years, no noise). Linear y on purpose: the late split is the message. Checkpoint markers at 30 and 70 years reproduce 17.4× vs 8.8× and 790× vs 158×. No personalization block: the site island passes no reader context, so the block only produced a "Try this" cue pointing at an input the page does not have.',
  },

  {
    chartId: 'p2-capital-finds-bottleneck', idx: 'P2-08', group: 'part-2', intendedPlacement: 'part-2',
    claimStack: {
      primaryClaim: 'Capital concentrates where a structural force hits its binding constraint',
      visualProof: 'Five descending stage nodes (force, required buildout, bottleneck, capital pathway, investable exposure), each transforming the one before and narrowing into the emphasized final node',
      interactionRole: 'Hover any stage to read why it matters and the claim it carries, ending where the thesis becomes ownable',
      readerAction: 'Trace the cascade down to the ownable exposure',
      caution: 'A reasoning sequence from Part 2’s thesis-construction steps; it names no assets and measures no flows',
    },
    status: 'implemented', wiredPublic: true,
    title: 'Capital Finds the Bottleneck', setupLine: 'A structural force becomes investable where it runs into a constraint, because that is where capital has to flow',
    claimLabel: 'THESIS · CAPITAL FLOW',
    frameworkClaim: 'A valid thesis must map structural force into capital-flow pathways.',
    readerTakeaway: 'Follow the force to its bottleneck, then to the assets that own it.',
    chartType: 'Flow map: structural force → bottlenecks → where capital lands.',
    visualDataMode: 'conceptual', disclosure: DISCLOSURE.conceptual, footerCta: 'View framework basis',
    sources: [{ provider: 'ACF · Part 2', label: 'Rule stated in Part 2 · Identification, evaluation, and governance', role: 'verifies-concept', url: '/part-2-lineage-macro-thesis#macro-thesis' }],
    explainerHeadline: 'The return collects at the bottleneck.',
    explainerBody: 'Naming the structural force is the start. The edge is mapping it to the constraint it runs into and to the specific assets that own that constraint. In Part 2’s worked example, AI needs data centers, data centers need power, and power generation is one of the places capital has to flow. A thesis that stops at the theme never reaches the pathway where the return accrues.',
    explainerConcept: 'Capital pathways',
    concepts: [{ label: 'Macro thesis', link: '/part-2-lineage-macro-thesis#macro-thesis' }, { label: 'Regime force', link: '/part-5-portfolio-construction-position-management#forces' }],
    layout: 'bridge',
    ariaSummary: 'A five-stage descending cascade: structural force, required buildout, bottleneck, capital pathway and investable exposure. Each stage transforms the one before it until the thesis becomes something you can own.',
    bridge: {
      stages: [
        { id: 'force', label: 'Structural force', sub: 'the driver you can name' },
        { id: 'buildout', label: 'Required buildout', sub: 'what it forces to be built' },
        { id: 'bottleneck', label: 'Bottleneck', sub: 'the binding constraint' },
        { id: 'pathway', label: 'Capital pathway', sub: 'where money must flow' },
        { id: 'exposure', label: 'Investable exposure', sub: 'the thesis, made ownable' },
      ],
    },
    primaryKey: 'exposure',
    hoverTargets: [
      { id: 'force', kind: 'node', label: 'Structural force', name: 'Structural force', why: 'The macro driver. You have to name it, but on its own it is a theme, not a position.', claim: 'Naming the force is step one.', concept: 'Macro thesis', link: '/part-2-lineage-macro-thesis#macro-thesis' },
      { id: 'buildout', kind: 'node', label: 'Required buildout', name: 'Required buildout', why: 'What the force requires to be built: the physical and financial work it demands.', claim: 'Force becomes spending.', concept: 'Capital pathways', link: '/part-2-lineage-macro-thesis#macro-thesis' },
      { id: 'bottleneck', kind: 'node', label: 'Bottleneck', name: 'The bottleneck', why: 'The binding constraint the buildout runs into. Scarcity here is what concentrates the return.', claim: 'Constraints, not themes, pay.', concept: 'Capital pathways', link: '/part-2-lineage-macro-thesis#macro-thesis' },
      { id: 'pathway', kind: 'node', label: 'Capital pathway', name: 'Capital pathway', why: 'The route money must travel to relieve the constraint. A real thesis predicts it.', claim: 'Follow where capital must go.', concept: 'Capital pathways', link: '/part-2-lineage-macro-thesis#macro-thesis' },
      { id: 'exposure', kind: 'node', label: 'Investable exposure', name: 'Investable exposure', why: 'The specific assets that own the constraint. This is where a thesis becomes something you can hold.', claim: 'A thesis is not investable until here.', concept: 'Regime force', link: '/part-5-portfolio-construction-position-management#forces' },
    ],
    mobileTapTargets: ['force', 'buildout', 'bottleneck', 'pathway', 'exposure'],
    implementationNotes: 'Uses the bridge layout: a descending five-stage cascade where each stage transforms the prior and capital concentrates into the emphasized final investable node.',
  },

  {
    chartId: 'p2-narrative-not-thesis', idx: 'P2-07', group: 'part-2', intendedPlacement: 'part-2',
    claimStack: {
      primaryClaim: 'A narrative earns thesis status only by surviving four gates',
      visualProof: 'An entry narrative node feeding four vertical gates (persistence, capital flow, falsifiable, runway), with a survivor band that thins at each into the lone thesis node',
      interactionRole: 'Hover any gate to read what it tests and which threads fall away there',
      readerAction: 'Trace the survivor band as it thins gate by gate',
      caution: 'The gates are Part 2’s four tests for a valid thesis; how many stories fail at each is drawn, not counted',
    },
    status: 'implemented', wiredPublic: true,
    title: 'Narrative Is Not Thesis', setupLine: 'Four tests stand between a good story and a thesis: persistence, a capital-flow path, falsifiability and a multi-year runway',
    claimLabel: 'THESIS · VALIDATION',
    frameworkClaim: 'A valid macro thesis needs persistence, capital-flow implications, falsifiability, and multi-year runway.',
    readerTakeaway: 'Most narratives never make it through the gates.',
    chartType: 'Validation gauntlet: narrative through four gates to a thesis.',
    visualDataMode: 'conceptual', disclosure: DISCLOSURE.conceptual, footerCta: 'View framework basis',
    sources: [{ provider: 'ACF · Part 2', label: 'Rule stated in Part 2 · Identification, evaluation, and governance', role: 'verifies-concept', url: '/part-2-lineage-macro-thesis#macro-thesis' }],
    explainerHeadline: 'A narrative is a candidate, not a conclusion.',
    explainerBody: 'Compelling stories are cheap. A thesis has to outlast the headline, say where capital must flow, be specific enough to be proven wrong, and hold up for years. A story that fails a gate is a trade idea at best, and nothing to build a portfolio on.',
    explainerConcept: 'Valid thesis',
    concepts: [{ label: 'Macro thesis', link: '/part-2-lineage-macro-thesis#macro-thesis' }, { label: 'Falsifiability', link: '/part-2-lineage-macro-thesis#macro-thesis' }],
    layout: 'gate',
    ariaSummary: 'A validation gauntlet. A narrative enters and must pass four gates (structural persistence, a capital-flow implication, falsifiable indicators and a multi-year runway), and only what survives all four emerges as a thesis. A survivor band thins at each gate.',
    gate: {
      nodes: [
        { id: 'narrative', kind: 'entry', label: 'Narrative', sub: 'a compelling story' },
        { id: 'persist', kind: 'gate', label: 'Persistence', sub: 'structural, not a headline' },
        { id: 'flow', kind: 'gate', label: 'Capital flow', sub: 'a real pathway' },
        { id: 'falsify', kind: 'gate', label: 'Falsifiable', sub: 'measurable signals' },
        { id: 'runway', kind: 'gate', label: 'Runway', sub: 'multi-year conviction' },
        { id: 'thesis', kind: 'exit', label: 'Thesis', sub: 'survived all four' },
      ],
    },
    primaryKey: 'thesis',
    hoverTargets: [
      { id: 'narrative', kind: 'node', label: 'Narrative', name: 'Narrative', why: 'Every thesis starts as a story. Stories are abundant, and on their own they are nothing to allocate against.', claim: 'Stories are the raw material.', concept: 'Valid thesis', link: '/part-2-lineage-macro-thesis#macro-thesis' },
      { id: 'persist', kind: 'node', label: 'Persistent?', name: 'Gate 1 · persistence', why: 'Does the story outlast the headline, or fade in a quarter? The threads that end here never had structure.', claim: 'Survive the headline.', concept: 'Macro thesis', link: '/part-2-lineage-macro-thesis#macro-thesis' },
      { id: 'flow', kind: 'node', label: 'Capital flow?', name: 'Gate 2 · capital flow', why: 'Does the thesis say where capital must go? “The world is changing” names no destination, so it stalls here.', claim: 'No pathway, no thesis.', concept: 'Capital pathways', link: '/part-2-lineage-macro-thesis#macro-thesis' },
      { id: 'falsify', kind: 'node', label: 'Falsifiable?', name: 'Gate 3 · falsifiability', why: 'Could a measurable event prove it wrong? A price drawdown does not count; the test is structural. A story nothing could refute gives you nothing to monitor, so it drops out here.', claim: 'If it cannot break, it cannot be governed.', concept: 'Falsifiability', link: '/part-2-lineage-macro-thesis#macro-thesis' },
      { id: 'runway', kind: 'node', label: 'Runway?', name: 'Gate 4 · runway', why: 'Can it hold for years, through the volatility of a transition, without a new story every week? The last weak narratives end here.', claim: 'Theses need years, not weeks.', concept: 'Macro thesis phase', link: '/part-2-lineage-macro-thesis#macro-thesis' },
      { id: 'thesis', kind: 'node', label: 'Thesis', name: 'A thesis', why: 'Only the threads that pass all four gates arrive here. They earn the right to shape the portfolio; each position in it still earns its size through its score.', claim: 'This is what you build on.', concept: 'Valid thesis', link: '/part-2-lineage-macro-thesis#macro-thesis' },
    ],
    mobileTapTargets: ['narrative', 'persist', 'flow', 'falsify', 'runway', 'thesis'],
    implementationNotes: 'Uses the gate layout: a survivor band that thins through four vertical gates into the thesis node. Sober gauntlet, not a marketing funnel.',
  },

  {
    chartId: 'p2-phase-changes-sizing', idx: 'P2-09', group: 'part-2', intendedPlacement: 'part-2',
    claimStack: {
      primaryClaim: 'A thesis can stay valid while the right size for it changes with its phase',
      visualProof: 'A flat, high validity line above a sizing curve that starts small, rises through the mid-cycle buildout and eases in the late phase, with a circled mark where the late phase begins',
      interactionRole: 'Hover the sizing curve, the validity line or the late-phase mark to see why size moves while validity holds',
      readerAction: 'Follow the sizing curve up and down beneath the flat validity line',
      caution: 'Phase is a judgment recorded with the thesis. The dashboard stores it and does not size positions by it (as of September 2026); the curve shows the idea, not a sizing rule',
    },
    status: 'implemented', wiredPublic: true,
    title: 'Phase Changes Sizing', setupLine: 'One valid thesis through three phases: early structural, mid-cycle buildout, late expression',
    claimLabel: 'PHASE · SIZING',
    frameworkClaim: 'A thesis can stay structurally valid while its phase informs sizing, entry and risk controls.',
    readerTakeaway: 'A right thesis can still be sized wrong.',
    chartType: 'Thesis validity held constant while sizing rises, then eases, across phases.',
    visualDataMode: 'conceptual', disclosure: DISCLOSURE.conceptual, footerCta: 'View framework basis',
    sources: [
      { provider: 'ACF · Part 2', label: 'Rule stated in Part 2 · Identification, evaluation, and governance', role: 'verifies-concept', url: '/part-2-lineage-macro-thesis#macro-thesis' },
      { provider: 'ACF · Part 5', label: 'Rule stated in Part 5 · Torque: leverage on regime forces', role: 'verifies-concept', url: '/part-5-portfolio-construction-position-management#torque' },
    ],
    explainerHeadline: 'Validity is not a sizing instruction.',
    explainerBody: 'A thesis can stay valid for a decade and still call for different handling at each stage: small while it is unproven, fuller through the buildout, more guarded once the move is priced. The score still selects the band; the phase, recorded with the thesis, informs how you use it. Keeping validity and phase apart is what stops conviction from turning into complacency.',
    explainerConcept: 'Macro thesis phase',
    concepts: [{ label: 'Macro thesis phase', link: '/part-2-lineage-macro-thesis#macro-thesis' }, { label: 'Position sizing', link: '/part-5-portfolio-construction-position-management#torque' }],
    layout: 'single',
    ariaSummary: 'Across a thesis lifecycle (early structural, mid-cycle buildout, late expression), validity stays high and flat while sizing starts small, rises to a peak through the buildout, then eases into the late phase.',
    domain: { xMin: 0, xMax: 100, yMin: 0, yMax: 100 }, yUnit: '',
    xTicks: [{ v: 0, label: 'early structural' }, { v: 50, label: 'mid-cycle' }, { v: 100, label: 'late expression' }], yTicks: [],
    series: [
      { key: 'sizing', tier: 'primary', label: 'Sizing', pts: p2Phase.sizing },
      { key: 'validity', tier: 'reference', label: 'Thesis validity', pts: p2Phase.validity, labelDy: -4 },
    ],
    markers: [{ id: 'trim', type: 'enso', x: 78, y: R(valueAt(p2Phase.sizing, 78)), r: 12, label: 'late phase · recheck the score', labelAnchor: 'end', labelDy: -16 }],
    primaryKey: 'sizing',
    hoverTargets: [
      { id: 'sizing', kind: 'series', seriesKey: 'sizing', label: 'Sizing', name: 'Sizing', why: 'The score selects the band. The phase informs how you use it: small while the thesis is unproven, fuller through the buildout, more guarded in late expression.', claim: 'Phase informs the size the score allows.', concept: 'Position sizing', link: '/part-5-portfolio-construction-position-management#torque' },
      { id: 'validity', kind: 'series', seriesKey: 'validity', label: 'Thesis validity', name: 'Thesis validity', why: 'Flat and high throughout. The thesis stays valid while the right size changes beneath it.', claim: 'Validity holds; size moves.', concept: 'Macro thesis phase', link: '/part-2-lineage-macro-thesis#macro-thesis' },
      { id: 'trim', kind: 'marker', label: 'Late-phase recheck', name: 'Late phase', why: 'The thesis is still valid here. What has changed is the price: as the move gets priced in, its remaining headroom narrows, and the score with it. Part 5’s rule for a winner that has grown: recalculate the score, let it run if conviction held, and trim if it fell.', claim: 'Recheck the score before you trim.', concept: 'Tripwire', link: '/part-5-portfolio-construction-position-management#management' },
    ],
    mobileTapTargets: ['sizing', 'validity', 'trim'],
    implementationNotes: 'Conceptual; phases on the x-axis. Validity is a flat reference; sizing is the moving primary, peaking near 70 so it stays well clear of the validity line (minimum gap about 17). The late-phase mark sits at x = 78.',
  },

  {
    chartId: 'p2-liquidity-sets-tide', idx: 'P2-06', group: 'part-2', intendedPlacement: 'part-2',
    claimStack: {
      primaryClaim: 'Bitcoin has tended to move in the same direction as global liquidity over multi-month windows',
      visualProof: 'A gently rising and falling liquidity line beside an asset line that moves the same way on a much wider swing, with short wiggles that sometimes run against it, and a dot where the tide turns',
      interactionRole: 'Hover the liquidity line, the asset line or the turning point to read what the relationship does and does not show',
      readerAction: 'Compare the long swings, where the lines agree, with the short wiggles, where they often do not',
      caution: 'Drawn shapes, not plotted liquidity or Bitcoin prices. Swing sizes and wiggles are illustrative; the cited study measures direction, not a fixed multiple',
    },
    status: 'implemented', wiredPublic: true,
    title: 'Liquidity Sets the Tide', setupLine: 'One drawn liquidity cycle, and an asset like Bitcoin moving with it on a wider swing',
    claimLabel: 'LIQUIDITY · SENSITIVITY',
    frameworkClaim: 'In the current thesis, the liquidity cycle is the tide that Bitcoin and other long-duration assets tend to move with.',
    readerTakeaway: 'Read the tide for direction over months, not for next week.',
    chartType: 'Representative liquidity cycle versus a more sensitive long-duration asset.',
    visualDataMode: 'representative', disclosure: DISCLOSURE.representative, footerCta: 'View sources',
    sources: [
      { provider: 'Lyn Alden Investment Strategy', label: 'Bitcoin: A Global Liquidity Barometer (written by Sam Callahan, commissioned by Lyn Alden), September 2024', role: 'verifies-concept', url: 'https://www.lynalden.com/bitcoin-a-global-liquidity-barometer' },
      { provider: 'ACF · Part 3', label: 'Rule stated in Part 3 · Why Bitcoin can be modeled', role: 'verifies-concept', url: '/part-3-bitcoin-convexity-backbone#valuation' },
      { provider: 'Author illustration', label: 'Method the shape illustrates: one liquidity cycle drawn as a smooth wave; the asset moves in the same direction on a wider swing, plus a faster wiggle that sometimes runs against it. No lag is drawn, and heights and widths are drawn, not measured', role: 'methodology' },
    ],
    explainerHeadline: 'Bitcoin tends to move with the tide, not the weather.',
    explainerBody: 'Global liquidity, the supply of money and credit, sets the level of the water. From 2013 to mid-2024 Bitcoin moved in the same direction as global liquidity in 83 percent of 12-month periods and 74 percent of 6-month periods, according to a September 2024 study written by Sam Callahan and commissioned by Lyn Alden. It measures direction, not a fixed multiple; the link weakens over short windows, and it decoupled as prices fell from the bull-market peaks of 2013, 2017 and 2021. The current thesis reads liquidity as the tide: a guide to the regime over months, and no help with next week.',
    explainerConcept: 'Liquidity cycle',
    concepts: [{ label: 'Liquidity cycle', link: '/part-2-lineage-macro-thesis#thought-leaders' }, { label: 'Convexity', link: '/part-2-lineage-macro-thesis#lineage' }],
    layout: 'single',
    ariaSummary: 'Two lines over one drawn cycle. A global-liquidity line rises and falls gently around the middle. An asset line moves the same way on a much wider swing, with short wiggles that sometimes run against the liquidity line. A dot marks where liquidity peaks and turns.',
    domain: { xMin: 0, xMax: 100, yMin: 0, yMax: 100 }, yUnit: '', valueUnit: 'index',
    xTicks: [{ v: 0, label: 'cycle start' }, { v: 100, label: 'cycle end' }], yTicks: [{ v: 25 }, { v: 50 }, { v: 75 }],
    series: [
      { key: 'asset', tier: 'primary', label: 'Bitcoin-like asset', pts: p2Liquidity.asset },
      { key: 'liquidity', tier: 'secondary', label: 'Global liquidity', pts: p2Liquidity.liquidity, labelDy: 14 },
    ],
    markers: [{ id: 'turn', type: 'dot', x: 25, y: R(valueAt(p2Liquidity.liquidity, 25)), r: 3.2, label: 'the tide turns', labelAnchor: 'start', labelDy: -12 }],
    primaryKey: 'asset',
    hoverTargets: [
      { id: 'asset', kind: 'series', seriesKey: 'asset', label: 'Bitcoin-like asset', name: 'Bitcoin-like asset', why: 'Tends to move the same way as the tide over months. The study found Bitcoin more sensitive to liquidity than traditional assets, particularly over longer time frames; the wider swing here is drawn, not measured. Over a few weeks it can wander either way.', claim: 'It tends to move with the tide.', concept: 'Convexity', link: '/part-2-lineage-macro-thesis#lineage' },
      { id: 'liquidity', kind: 'series', seriesKey: 'liquidity', label: 'Global liquidity', name: 'Global liquidity', why: 'The level of the water: money and credit in the system, read through M2 growth and central-bank balance sheets. Over multi-month windows the asset has usually moved with it.', claim: 'Likely a key driver over the long run.', concept: 'Liquidity cycle', link: '/part-2-lineage-macro-thesis#thought-leaders' },
      { id: 'turn', kind: 'marker', label: 'The tide turns', name: 'The tide turns', why: 'Liquidity peaks here and starts to ebb. Over months the asset has tended to turn with it; over weeks it can go either way.', claim: 'Context for risk over months; no timing signal.', concept: 'Macro thesis', link: '/part-2-lineage-macro-thesis#macro-thesis' },
    ],
    mobileTapTargets: ['asset', 'liquidity', 'turn'],
    implementationNotes: 'Representative shapes, not historical series. Liquidity is one sine cycle; the asset is in phase with it at a wider amplitude plus a faster wiggle, so the two agree on direction over most long windows (about 92 to 95 percent of 10-to-30-step windows) and less often over short ones (about 73 to 78 percent of 2-to-5-step windows). No lag is drawn because the cited study measures direction, not timing. Plotting real data would need a public-domain global-liquidity series under the chart data policy.',
  },

  /* ── PART 3 · BITCOIN — CONVEXITY BACKBONE ──────────────────────────────── */
  {
    chartId: 'p3-power-law-holds', idx: 'P3-04', group: 'part-3', intendedPlacement: 'part-3',
    claimStack: {
      primaryClaim: 'On log-log axes, Bitcoin’s price has clustered around a rising power-law trend, with swings above and below it',
      visualProof: 'On log-log axes, a rising corridor around a power-law trend line; a representative price path swings through it, spiking above the upper band twice and closing below the lower band once',
      interactionRole: 'Hover the price, the trend, either band mark or the end dot to read what each excursion means',
      readerAction: 'Trace the price against the corridor bands',
      caution: 'Representative schematic, not plotted prices: the axes carry no price levels or dates, and the path is drawn. The fitted constants move with the data window, and no band is a hard floor: price has spent months below power-law floor lines, most recently in 2026',
    },
    status: 'implemented', wiredPublic: true,
    title: 'Power-Law Corridor', setupLine: 'Price against a log power-law corridor: a trend line with euphoria and capitulation bands',
    claimLabel: 'VALUATION · POWER LAW',
    frameworkClaim: 'The power law gives Bitcoin’s long-run path a regime context; it is a heuristic and makes no prediction.',
    readerTakeaway: 'A rough map of where a cycle stands.',
    chartType: 'Log-log power-law corridor with a representative price path swinging between euphoria and capitulation bands.',
    visualDataMode: 'representative', disclosure: DISCLOSURE.representative, footerCta: 'View sources', suppressValues: true,
    sources: [
      { provider: 'Giovanni Santostasi · Medium, March 2024', label: 'The Bitcoin Power Law Theory: price as a power law of days since the genesis block (first posted on Reddit, 2018)', role: 'verifies-concept', url: 'https://giovannisantostasi.medium.com/the-bitcoin-power-law-theory-962dfaf99ee9' },
      { provider: 'Harold Christopher Burger · Medium, September 2019', label: 'Bitcoin’s natural long-term power-law corridor of growth: the corridor with support and resistance bands', role: 'verifies-concept', url: 'https://medium.com/quantodian-publications/bitcoins-natural-long-term-power-law-corridor-of-growth-649d0e9b3c94' },
      { provider: 'Author illustration', label: 'Method the shape illustrates: a straight power-law trend on log-log axes, with bands a fixed distance above and below it; the price path is drawn, not fitted', role: 'methodology' },
    ],
    explainerHeadline: 'Power-law bands map the regime. They do not call the next move.',
    explainerBody: 'Since 2010 Bitcoin’s price has clustered around a power-law trend, running far above it in manias and below it in capitulations. This sketch draws a representative price path through such a corridor: two spikes above the upper band and one close below the lower band. The fitted constants shift with the data window, and their stability is debated, so the framework reads the corridor as multi-year context for where a cycle stands. Fair value is something else: the estimate the independent valuation models converge on, shown next.',
    explainerConcept: 'Power law',
    concepts: [{ label: 'Power law', link: '/part-3-bitcoin-convexity-backbone#valuation' }, { label: 'Valuation discipline', link: '/part-3-bitcoin-convexity-backbone#valuation' }],
    layout: 'single',
    ariaSummary: 'A log-log schematic with no price levels or dates. A rising power-law trend line runs through a shaded corridor. A representative price path swings through it, spiking above the upper euphoria band twice and closing below the lower capitulation band once, and ends back inside the corridor at a later reading.',
    domain: { xMin: 0, xMax: 100, yMin: 2.4, yMax: 6.4 }, yUnit: 'log scale · ×10 per gridline',
    xTicks: [{ v: 0, label: 'early adoption' }, { v: 100, label: 'later' }],
    yTicks: [{ v: 3, label: '' }, { v: 4, label: '' }, { v: 5, label: '' }, { v: 6, label: '' }],
    series: [
      { key: 'upper', tier: 'reference', hidden: true, pts: p3Power.upper },
      { key: 'lower', tier: 'reference', hidden: true, pts: p3Power.lower },
      { key: 'central', tier: 'reference', label: 'trend', pts: p3Power.central },
      { key: 'price', tier: 'primary', label: 'price', pts: p3Power.price },
    ],
    areas: [{ id: 'corridor', topKey: 'upper', botKey: 'lower', kind: 'gap', label: 'power-law corridor' }],
    markers: [
      { id: 'euphoria', type: 'enso', x: p3Power.euph.x, y: p3Power.euph.y, r: 12, label: 'euphoria · upper band', labelAnchor: 'end', labelDy: -16 },
      { id: 'capitulation', type: 'enso', x: p3Power.cap.x, y: p3Power.cap.y, r: 12, label: 'capitulation · lower band', labelAnchor: 'start', labelDy: 20 },
      { id: 'now', type: 'dot', x: p3Power.last.x, y: p3Power.last.y, r: 3.4, label: 'a later reading', labelAnchor: 'end', labelDy: -12 },
    ],
    primaryKey: 'price',
    hoverTargets: [
      { id: 'price', kind: 'series', seriesKey: 'price', label: 'Price', name: 'Price (representative path)', why: 'Most of the time the path stays inside the corridor. The trips outside it carry the regime signal; the trend itself moves slowly.', claim: 'Read price against the bands, never alone.', concept: 'Power law', link: '/part-3-bitcoin-convexity-backbone#valuation' },
      { id: 'central', kind: 'series', seriesKey: 'central', label: 'Trend', name: 'Power-law trend', why: 'The corridor’s midline. Part 3 treats it as regime context. Fair value is the estimate several independent models agree on, and never this line on its own.', claim: 'A trend, not a target.', concept: 'Valuation discipline', link: '/part-3-bitcoin-convexity-backbone#valuation' },
      { id: 'euphoria', kind: 'marker', label: 'Euphoria', name: 'Euphoria · upper band', why: 'Price stretched above the corridor, which has been rare and brief so far. The framework slows discretionary buying and banks income as dry powder; it makes no attempt to call the top.', claim: 'Above the band: slow down.', concept: 'Valuation discipline', link: '/part-3-bitcoin-convexity-backbone#valuation' },
      { id: 'capitulation', kind: 'marker', label: 'Capitulation', name: 'Capitulation · lower band', why: 'Price below the corridor. Spells below a power-law floor have lasted months, most recently in 2026. If the valuation models agree on a discount of more than 30 percent, the framework raises DCA about 50 percent or deploys dry powder. It never sells.', claim: 'Below the band: lean in, if the models agree.', concept: 'Valuation discipline', link: '/part-3-bitcoin-convexity-backbone#valuation' },
      { id: 'now', kind: 'marker', label: 'A later reading', name: 'A later reading', why: 'The schematic’s last point. Each new price is placed in the corridor and read again; the reading describes the regime and carries no forecast.', claim: 'Read the position again with each new price.', concept: 'Power law', link: '/part-3-bitcoin-convexity-backbone#valuation' },
    ],
    mobileTapTargets: ['now', 'euphoria', 'capitulation', 'price', 'central'],
    implementationNotes: 'Part 3 signature visual: a representative schematic. Baked in log space (y = log10 of a unitless price index; gridlines are decades and carry no price labels) with x read as log time, so the power law draws as a straight trend. The capitulation dip is deep enough that the path closes below the lower band exactly once; it spikes above the upper band twice. The dashboard draws only a trend (2.88 × (days ÷ 1000)^5.82) and a floor (1.2828 × (days ÷ 1000)^5.928) and no euphoria band; the dated reading lives in Part 3 prose, never in this chart. Restrained green thesis line, no orange or neon.',
  },

  {
    chartId: 'p3-volatility-is-the-toll', idx: 'P3-03', group: 'part-3', intendedPlacement: 'part-3',
    claimStack: {
      primaryClaim: `At a 15 percent reserve, a ${p3Vol.btcPct} percent Bitcoin fall costs the portfolio about ${p3Vol.portPct} percent: painful, and survivable`,
      visualProof: `A volatile Bitcoin line with two deep falls, beside a portfolio line computed from it at a 15 percent reserve, which dips about ${p3Vol.portPct} percent at the worst point`,
      interactionRole: 'Hover the toll and portfolio marks; enter a starting value to see the hit in dollars',
      readerAction: 'See the drawdown sized to your portfolio',
      caution: 'Representative Bitcoin path, not historical prices. The portfolio line is computed from it, with Bitcoin reset to 15 percent at each new high and the rest held flat. The reset is a simplification: the framework never trims the reserve, so a reserve left to grow goes into the next fall as a larger share and loses more',
    },
    interaction: { type: 'readerContext', gesture: 'type', conceptMatch: 'Entering a starting value turns the drawn Bitcoin fall into a portfolio-impact figure in dollars' },
    status: 'implemented', wiredPublic: true,
    title: 'Volatility Is the Toll', setupLine: 'What a deep Bitcoin fall costs a portfolio that holds Bitcoin as a sized reserve',
    claimLabel: 'VOLATILITY · SIZING',
    frameworkClaim: 'Bitcoin’s volatility is the cost of its convexity; position size decides whether that cost is survivable.',
    readerTakeaway: 'Plan for falls of 75 to 80 percent, and check what one costs at your reserve size.',
    chartType: 'Representative Bitcoin path with two deep falls, and a portfolio line computed from it at a 15 percent reserve.',
    visualDataMode: 'representative', disclosure: DISCLOSURE.representative, footerCta: 'View sources',
    sources: [
      { provider: 'CNBC · March 5, 2024', label: 'Galaxy Digital’s Alex Thorn: “bitcoin has seen four 75% [plus] drawdowns”; its record before 2024 was $68,982.20 on November 10, 2021', role: 'verifies-concept', url: 'https://www.cnbc.com/2024/03/05/bitcoin-all-time-high.html' },
      { provider: 'Author calculation', label: 'Portfolio line = Bitcoin at 15 percent (reset at each new Bitcoin high, untouched through each fall) + 85 percent held flat; the Bitcoin path is illustrative, drawn to falls of about 77 and 54 percent', role: 'methodology' },
      { provider: 'ACF · Part 1', label: 'Rule stated in Part 1 · The traditional portfolio playbook is failing quietly', role: 'verifies-concept', url: '/part-1-foundation#manifesto' },
    ],
    explainerHeadline: 'Volatility is the toll; size decides whether you can pay it.',
    explainerBody: `Bitcoin charges for its convexity in drawdowns: every completed cycle through 2022 fell at least 77 percent. Held at 15 percent of the portfolio, a ${p3Vol.btcPct} percent fall costs about ${p3Vol.portPct} percent, and the later ${p3Vol.laterPct} percent fall here costs about ${p3Vol.laterPortPct} percent. That hurts, and a portfolio sized for it lives through it. At 100 percent Bitcoin, the same fall takes ${p3Vol.btcPct} percent of everything.`,
    explainerConcept: 'Position sizing',
    concepts: [{ label: 'Position sizing', link: '/part-5-portfolio-construction-position-management#torque' }, { label: 'Convexity', link: '/part-2-lineage-macro-thesis#lineage' }],
    personalization: { uses: ['startingValue', 'btcReserveAllocation'], kind: 'vol-impact', assume: { alloc: 0.15, drawdown: p3Vol.btcPct / 100 }, introLead: 'Portfolio impact example', note: 'Turns the drawn Bitcoin fall into a portfolio-impact figure at the Bitcoin reserve size you choose (15 percent if you leave it blank). Illustrative, not a forecast.' },
    layout: 'single',
    ariaSummary: `Two representative lines, both starting at 100. Bitcoin rises, falls about ${p3Vol.btcPct} percent, climbs to a new high, falls about ${p3Vol.laterPct} percent and partly recovers. The portfolio line, computed from it with Bitcoin at 15 percent, dips about ${p3Vol.portPct} percent in the first fall and about ${p3Vol.laterPortPct} percent in the second.`,
    domain: { xMin: 0, xMax: 100, yMin: 0, yMax: 430 }, yUnit: 'idx',
    xTicks: [{ v: 0, label: 'start' }, { v: 100, label: 'later' }],
    yTicks: [{ v: 100 }, { v: 200 }, { v: 300 }, { v: 400 }],
    series: [
      { key: 'btc', tier: 'primary', label: 'Bitcoin', pts: p3Vol.btc },
      { key: 'portfolio', tier: 'reference', label: 'Portfolio', pts: p3Vol.portfolio },
    ],
    areas: [{ id: 'dd', topKey: 'btc', kind: 'peak', label: '' }],
    markers: [
      { id: 'toll', type: 'enso', x: p3Vol.trough.x, y: R(p3Vol.trough.y), r: 12, label: `the toll · Bitcoin down ${p3Vol.btcPct}%`, labelAnchor: 'start', labelDy: 22 },
      { id: 'calm', type: 'dot', x: p3Vol.trough.x, y: R(valueAt(p3Vol.portfolio, p3Vol.trough.x)), r: 3.2, label: `portfolio down about ${p3Vol.portPct}%`, labelAnchor: 'start', labelDy: -12 },
    ],
    primaryKey: 'btc',
    hoverTargets: [
      { id: 'btc', kind: 'series', seriesKey: 'btc', label: 'Bitcoin', name: 'Bitcoin', why: 'Convex and volatile. The deep falls are what the upside costs, and they recur.', claim: 'Volatility is the toll for convexity.', concept: 'Convexity', link: '/part-2-lineage-macro-thesis#lineage' },
      { id: 'portfolio', kind: 'series', seriesKey: 'portfolio', label: 'Portfolio', name: 'Total portfolio', why: `Computed from the Bitcoin line, with Bitcoin at 15 percent of the portfolio. The ${p3Vol.btcPct} percent fall costs it about ${p3Vol.portPct} percent: a real loss, and one a sized portfolio can carry.`, claim: 'Size turns the toll into a survivable cost.', concept: 'Position sizing', link: '/part-5-portfolio-construction-position-management#torque' },
      { id: 'toll', kind: 'marker', label: 'The toll', name: 'The toll', why: `A ${p3Vol.btcPct} percent Bitcoin fall, about the depth of 2021 to 2022. Expect another; what matters is whether your position size lets you sit through it.`, claim: 'Pay the toll without being ruined by it.', concept: 'Survivable compounding', link: '/part-1-foundation#manifesto' },
      { id: 'calm', kind: 'marker', label: 'Portfolio at the trough', name: 'Portfolio at the trough', why: `At the moment Bitcoin is down ${p3Vol.btcPct} percent, the portfolio is down about ${p3Vol.portPct} percent, and nothing had to be sold.`, claim: 'Size is the shock absorber.', concept: 'Position sizing', link: '/part-5-portfolio-construction-position-management#torque' },
    ],
    mobileTapTargets: ['toll', 'calm', 'btc', 'portfolio'],
    implementationNotes: 'Representative Bitcoin path (not historical) drawn to the record’s depths: a fall of about 77 percent and a later one of about 54 percent. The portfolio line is computed from it (Bitcoin set to 15 percent at each new Bitcoin high, untouched through each fall, the other 85 percent flat), so every printed percent derives from the drawn data. Drawdown from peak shaded behind the Bitcoin line.',
  },

  {
    chartId: 'p3-exposure-not-control', idx: 'P3-01', group: 'part-3', intendedPlacement: 'part-3',
    experienceRole: 'comparison',
    storyBeats: [
      { kind: 'context', label: 'Three allocations enter a shock zone as three lanes', timing: 'early' },
      { kind: 'mechanism', label: 'The same shock hits all three; one lane breaks, one bends, one dips least', timing: 'middle' },
      { kind: 'action', label: 'Choose an allocation, then change the shock and watch what happens to it', timing: 'middle' },
      { kind: 'consequence', label: 'Max exposure breaks, the stress-tested reserve lags, the framework stays usable and keeps participating', timing: 'late' },
    ],
    claimStack: {
      primaryClaim: 'Maximum exposure breaks under a messy path; the framework allocation survives it and still participates',
      visualProof: 'Three allocation lanes pass through one shock zone (one breaks, one bends, one dips least), with a readout grading each',
      interactionRole: 'Choose an allocation, then change the shock and watch each lane',
      readerAction: 'Pick an allocation, then stress it',
      caution: 'Three whole-portfolio allocations on one made-up market path; the control and participation scores are illustrative',
    },
    interaction: { type: 'scenario', gesture: 'choose', conceptMatch: 'Selecting an allocation and a shock reshapes the three lanes through the shock zone and updates the survival readout' },
    motionProfile: { type: 'scenarioUpdate', duration: 'calm' },
    status: 'implemented', wiredPublic: true,
    title: 'Exposure Is Not Control', setupLine: 'Three allocations meet the same shock. The one that counts is the one you can still follow afterward.',
    claimLabel: 'CONTROL · INTERACTIVE',
    tryThis: 'Change the shock and watch which allocation stays usable.',
    frameworkClaim: '100 percent Bitcoin can win one favorable cycle; the framework aims for control it can repeat across many.',
    readerTakeaway: 'A strategy you abandon in the drawdown stops compounding there.',
    chartType: 'Interactive comparison of three representative allocations through a drawdown, with an optional shock.',
    visualDataMode: 'simulation', disclosure: DISCLOSURE.simulation, footerCta: 'View methodology',
    sources: [{ provider: 'Author simulation', label: 'Three allocations on one shared market path: 100% Bitcoin; 15% Bitcoin with 15% dry powder and an income sleeve; 10% Bitcoin with 50% dry powder and an income sleeve', role: 'methodology', notes: 'Shocks: a job loss at the market trough, which forces an allocation with no income sleeve and under 20 percent dry powder to sell into the bottom; and an opportunity window, where dry powder is deployed above the low. Control, strain, participation and livability are illustrative scores computed from each path. No historical claim.' }, { provider: 'ACF · Part 3', label: 'Rule stated in Part 3 · Optimizing for multi-cycle survivability', role: 'verifies-concept', url: '/part-3-bitcoin-convexity-backbone#survivability' }],
    explainerHeadline: 'One shock breaks one allocation, slows another, and leaves the framework usable.',
    explainerBody: 'Maximum exposure wins the clean path, but with no income sleeve and no dry powder, a job loss in the drawdown forces it to sell at the bottom. The stress-tested reserve absorbs every shock and pays for it in cash drag for the rest of the cycle. The framework allocation is Part 3’s Investor B: 15 percent Bitcoin, 15 percent dry powder and an income sleeve. That is enough Bitcoin to matter, and enough cash flow that a lost paycheck does not force a sale.',
    explainerConcept: 'Operational control',
    concepts: [{ label: 'Operational control', link: '/part-3-bitcoin-convexity-backbone#survivability' }, { label: 'Dry powder', link: '/part-5-portfolio-construction-position-management#ballast' }],
    personalization: { uses: ['startingValue'], kind: 'scenario-scale', introLead: 'Representative whole-portfolio allocations', introTail: 'illustrative, not a forecast', note: 'Scales the terminal and drawdown readouts to your starting value. Control and participation are scores, not dollars. Illustrative, not a forecast.' },
    layout: 'scenario',
    ariaSummary: 'An interactive stress test, not a time series. Three allocations run as horizontal lanes through a shock zone in the middle: maximum exposure at 100 percent Bitcoin, the framework reserve at 15 percent Bitcoin with dry powder and an income sleeve, and a stress-tested reserve at 10 percent Bitcoin with half the portfolio in dry powder. The same shock hits all three. Maximum exposure climbs steepest before the shock, then plunges; under a job-loss shock its lane breaks at a forced sale. The framework lane bends, stays whole and keeps capacity to act. The stress-tested lane dips least but climbs slowly. A readout below grades each allocation under the current shock on participation, reserve, forced-error risk and followability, with terminal value as a small secondary figure. In the opportunity window the reserves act during the drawdown, above the exact bottom.',
    scenario: {
      zone: { partLo: 22, partHi: 60, ctrlLo: 66, ctrlHi: 94 },
      defaultPreset: 'reserve', defaultShock: 'none',
      domain: { yMin: p3Scenario.yMin, yMax: p3Scenario.yMax }, troughX: p3Scenario.troughX, peakX: p3Scenario.peakX,
      band: p3Scenario.band,
      tradeoff: 'Framework = balanced, repeatable · stress-tested = defensive, more cash drag · max exposure = high upside, fragile when the path is messy',
      presets: [
        { id: 'max', label: 'Maximum exposure', short: 'Max exposure', sub: '100% BTC', axis: 'upside' },
        { id: 'reserve', label: 'Framework reserve', short: 'Framework', sub: '~15% BTC + income', axis: 'control' },
        { id: 'stress', label: 'Stress-tested reserve', short: 'Stress-tested', sub: '~10% BTC + 50% dry powder', axis: 'control' },
      ],
      shocks: [
        { id: 'none', label: 'Clean path' },
        { id: 'jobloss', label: 'Job loss in the drawdown' },
        { id: 'deploy', label: 'Opportunity window' },
      ],
      // annotation shown under the chart; keyed by shock, with a per-strategy nuance.
      notes: {
        none: { lead: 'A clean bull path rewards exposure.', max: 'Maximum exposure wins the upside, and still rides the full cycle drawdown; the strain shows once the path stops being clean.', reserve: 'The framework gives up some clean-path upside to stay governable, and keeps participating.', stress: 'The most defensive: high control, but it lags in a clean market (cash drag).' },
        jobloss: { lead: 'A messy path rewards control.', max: 'No income sleeve and no dry powder: maximum exposure is forced to sell at the bottom, with the deepest drawdown and the highest strain.', reserve: 'Portfolio income covers the gap, so the framework is never a forced seller and the strain stays bearable.', stress: 'Income plus dry powder: the shock is absorbed, the reserve stays intact, and the strain stays low.' },
        deploy: { lead: 'Opportunity rewards the capacity to act.', max: 'All in and never sold, so it rides the rebound to the highest terminal value, through the deepest drawdown and the highest strain. It works only if no shock forces a sale.', reserve: 'Deploys some dry powder in the window, above the exact bottom, and stays diversified: enough capacity to act without betting the cycle on timing.', stress: 'Deploys the most because it held the most cash, and gave up participation for the rest of the cycle to hold it.' },
      },
      variants: p3Scenario.variants,
    },
    primaryKey: 'reserve',
    hoverTargets: [
      { id: 'max', kind: 'strategy', label: 'Maximum exposure', name: 'Maximum exposure', why: 'The highest terminal value on a clean path; all in, it even rides the rebound. With no income sleeve and no dry powder, though, a drawdown plus a lost paycheck forces a sale at the worst price, and the deepest drawdowns carry the highest strain, which is where panic selling and abandoned theses happen.', claim: 'Highest upside, highest behavior risk.', concept: 'Operational control', link: '/part-3-bitcoin-convexity-backbone#survivability' },
      { id: 'reserve', kind: 'strategy', label: 'Framework reserve', name: 'Framework reserve', why: 'The framework allocation, matching Part 3’s Investor B: 15 percent Bitcoin, 15 percent dry powder and an income sleeve. Enough exposure to participate, enough reserve to act in a drawdown, and never a forced seller. It does not win every scenario; it stays inside the governable band in all of them. Its 15 percent sits at the top of the framework’s normal 10 to 15 percent target.', claim: 'Balanced, repeatable participation.', concept: 'Operational control', link: '/part-3-bitcoin-convexity-backbone#survivability' },
      { id: 'stress', kind: 'strategy', label: 'Stress-tested reserve', name: 'Stress-tested reserve', why: 'The defensive allocation: the most capacity to act in a drawdown, paid for in cash drag for the rest of the cycle. Suited to extreme defense, and not the default. Dry powder it deploys is rebuilt over time, so it is never a one-time timing bet.', claim: 'Maximum defense; lags otherwise.', concept: 'Dry powder', link: '/part-5-portfolio-construction-position-management#ballast' },
    ],
    mobileTapTargets: ['max', 'reserve', 'stress'],
    implementationNotes: 'INTERACTIVE SIMULATION, the headline Part 3 exhibit. All three allocation lanes are drawn together under the selected shock; the chosen one is emphasized and the others stay as muted context. Click a lane to select it. A capacity-to-act marker, the shock zone, a forced-sale break and a shock-specific annotation carry the story; the readout table is secondary. Precomputed, deterministic representative paths; the framework preset (15% BTC, 15% dry powder) matches Part 3’s Investor B. The renderer hard-codes some copy (the "three postures enter · one stays usable" line and the POSTURE tooltip label) in FrameworkChart.jsx. scenario.zone and scenario.tradeoff are not rendered.',
  },

  {
    chartId: 'p3-models-must-converge', idx: 'P3-05', group: 'part-3', intendedPlacement: 'part-3',
    claimStack: {
      primaryClaim: 'The valuation models earn trust where they converge, and the discount to that converged estimate sets the pace of buying',
      visualProof: 'A shaded range between the highest and lowest model estimates starts wide, pinches to a tight waist mid-chart, then fans wide again, with a price line moving inside it and a ring at the narrow point',
      interactionRole: 'Hover the convergence mark or the price line to read what the width says and what the level says',
      readerAction: 'Watch the band pinch tight, then fan apart',
      caution: 'The envelope spans four valuation models. The dashboard computes no model convergence; you read it yourself (as of September 2026)',
    },
    status: 'implemented', wiredPublic: true,
    title: 'Models Must Converge', setupLine: 'The valuation models are most useful where they agree; when they fan apart, caution rises',
    claimLabel: 'VALUATION · CONVERGENCE',
    frameworkClaim: 'Power-law, realized-price, network-adoption and production-cost estimates earn conviction when they converge.',
    readerTakeaway: 'Agreement earns trust; disagreement says wait.',
    chartType: 'Valuation envelope: the spread between model estimates narrows on convergence and widens on divergence.',
    visualDataMode: 'conceptual', disclosure: DISCLOSURE.conceptual, footerCta: 'View framework basis',
    sources: [{ provider: 'ACF · Part 3', label: 'Rule stated in Part 3 · Why Bitcoin can be modeled', role: 'verifies-concept', url: '/part-3-bitcoin-convexity-backbone#valuation' }],
    explainerHeadline: 'Conviction lives where the models agree.',
    explainerBody: 'Power law, realized price, network adoption and production cost each estimate Bitcoin’s value a different way, and the liquidity reading adds a direction without a level. Where their estimates converge, the range is tight and deserves trust; where they fan apart, the framework holds its range and waits. Width tells you how much to trust the estimate. Price against a tight estimate tells you what to do: a discount of more than 30 percent is the cue to raise DCA about 50 percent or deploy dry powder.',
    explainerConcept: 'Model convergence',
    concepts: [{ label: 'Model convergence', link: '/part-3-bitcoin-convexity-backbone#valuation' }, { label: 'Valuation discipline', link: '/part-3-bitcoin-convexity-backbone#valuation' }],
    layout: 'single',
    ariaSummary: 'A conceptual valuation index with a shaded range between the highest and lowest model estimates. The range starts wide, narrows to a tight convergence mid-chart, then widens again into divergence. The price line moves inside the range throughout and sits near its top where the models converge.',
    domain: { xMin: 0, xMax: 100, yMin: 0, yMax: 120 }, yUnit: 'idx',
    xTicks: [{ v: 0, label: 'divergent' }, { v: 50, label: 'convergence' }, { v: 100, label: 'divergent' }],
    yTicks: [{ v: 25 }, { v: 50 }, { v: 75 }, { v: 100 }],
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
      { id: 'price', kind: 'series', seriesKey: 'price', label: 'Price', name: 'Price against the models', why: 'How far price sits below a tight estimate sets the pace of buying: a discount of more than 30 percent to the converged models is the framework’s cue to accumulate faster. A wide range says hold your range and wait.', claim: 'Spread sets confidence; the discount sets the pace.', concept: 'Model convergence', link: '/part-3-bitcoin-convexity-backbone#valuation' },
      { id: 'converge', kind: 'marker', label: 'Convergence', name: 'Convergence', why: 'The four models agree here and the range is tight, so the estimate deserves the most trust. You judge this convergence yourself; the dashboard does not compute it (as of September 2026).', claim: 'Agreement earns conviction.', concept: 'Valuation discipline', link: '/part-3-bitcoin-convexity-backbone#valuation' },
    ],
    mobileTapTargets: ['converge', 'price'],
    implementationNotes: 'Conceptual envelope (min and max of four valuation models: power law, realized price, network adoption, production cost), not historical. The band width is the message; do not draw four spaghetti lines. Price swings scale with the spread, so the line stays inside the range everywhere (minimum margin about one index point). yMax 120 keeps the divergence fan inside the plot.',
  },

  {
    chartId: 'p3-accumulate-dont-trade', idx: 'P3-02', group: 'part-3', intendedPlacement: 'part-3',
    experienceRole: 'conversion',
    storyBeats: [
      { kind: 'context', label: 'A representative BTC price index over a cycle', timing: 'early' },
      { kind: 'mechanism', label: 'Units = fixed dollars ÷ price, so a lower price buys more', timing: 'middle' },
      { kind: 'consequence', label: 'The framework leans in only when deeply undervalued, slows when extended, and never sells', timing: 'late' },
    ],
    claimStack: {
      primaryClaim: 'Fixed-dollar DCA buys more units when price is lower, and the framework leans in further only when Bitcoin is deeply undervalued',
      visualProof: 'Unit bars whose height is dollars ÷ price; the framework bar rises above the baseline in the undervalued window and drops below it when price is extended',
      interactionRole: 'Hover the price index and the bars to see the conversion and the lean-in window',
      readerAction: 'Watch units rise as price falls',
      caution: 'A representative price index, not historical prices, so the bars show relative units only. The readout compares units per dollar, and the reserve is never sold',
    },
    interaction: { type: 'hover', gesture: 'hover', conceptMatch: 'The price index drives the DCA unit bars: units = dollars ÷ price; hover adds the lean-in and slow-down detail' },
    motionProfile: { type: 'timeSweep', duration: 'calm', relatedElements: [['priceIndex', 'unitBars']] },
    formula: 'DCA $ ÷ price = units',
    status: 'implemented', wiredPublic: true,
    title: 'Accumulate, Don’t Trade', setupLine: 'Fixed-dollar DCA buys more units when Bitcoin is lower',
    claimLabel: 'DISCIPLINE · ACCUMULATION',
    frameworkClaim: 'Valuation models set the pace of buying; they never trigger a sale of the reserve.',
    readerTakeaway: 'For an accumulator, drawdowns are when the most units arrive, provided the plan survives them.',
    chartType: 'Representative BTC price index above DCA unit bars (units = dollars ÷ price); the framework leans in when deeply undervalued, slows when extended, and never sells.',
    visualDataMode: 'conceptual', disclosure: DISCLOSURE.conceptual, footerCta: 'View framework basis',
    sources: [{ provider: 'ACF · Part 3', label: 'Rule stated in Part 3 · Accumulate, don’t trade', role: 'verifies-concept', url: '/part-3-bitcoin-convexity-backbone#accumulate' }],
    explainerHeadline: 'Same dollars, more units, when price is lower.',
    explainerBody: `A fixed DCA amount already buys more units when Bitcoin falls, because units received equal dollars divided by price. The framework adds pacing: it buys about 50 percent more while the valuation models agree on a deep discount, the usual amount nearer fair value, and half the discretionary amount once price runs extended, banking the difference as dry powder. On this representative path that pacing collects about ${p3Heartbeat.fwPct} percent more units per dollar than plain DCA, which is what the +${p3Heartbeat.fwPct}% readout measures. Nothing in the reserve is ever sold.`,
    explainerConcept: 'Accumulation',
    concepts: [{ label: 'Accumulation', link: '/part-3-bitcoin-convexity-backbone#accumulate' }, { label: 'Valuation discipline', link: '/part-3-bitcoin-convexity-backbone#valuation' }],
    layout: 'heartbeat',
    ariaSummary: `A representative Bitcoin price index over one cycle, drawn above a row of dollar-cost-averaging unit bars. Price starts below fair value, dips into a deep undervalued trough, recovers toward fair value, then runs extended. Because units received equal fixed dollars divided by price, the bars are taller when price is lower. While price is deeply undervalued the framework buys about 50 percent more, so its accent bars rise above the baseline; nearer fair value it buys the baseline; once price is extended it halves discretionary buying and banks the difference as dry powder. The readout, +${p3Heartbeat.fwPct}%, is the framework's units per dollar against plain DCA (${p3Heartbeat.unitsPct} percent more units for ${p3Heartbeat.dollarsPct} percent more dollars). The reserve is never sold.`,
    domain: { xMin: 0, xMax: 100 },
    xTicks: [{ v: 0, label: 'cycle start' }, { v: 17, label: 'undervalued' }, { v: 100, label: 'extended' }],
    heartbeat: p3Heartbeat,
    primaryKey: 'cheap',
    hoverTargets: [
      { id: 'heartbeat', kind: 'series', label: 'BTC price index', name: 'BTC price index', why: 'A representative Bitcoin valuation path, not historical prices. The lower the price, the more units a fixed-dollar DCA receives: units = dollars ÷ price.', claim: 'Price is the input; units are the output.', concept: 'Valuation discipline', link: '/part-3-bitcoin-convexity-backbone#valuation' },
      { id: 'cheap', kind: 'marker', label: 'Same dollars, more units', name: 'Same dollars, more units', why: 'The same DCA dollars buy more units here because price is lower. While the valuation models agree on a discount of more than 30 percent, the framework raises DCA about 50 percent, so the accent bars rise above the baseline.', claim: 'Lower price, more units captured.', concept: 'Accumulation', link: '/part-3-bitcoin-convexity-backbone#accumulate' },
      { id: 'slows', kind: 'marker', label: 'Slows when extended', name: 'Slows new buying', why: 'When price is extended each dollar buys few units, so the framework halves discretionary buying and banks the difference as dry powder; the accent bars fall below the baseline. The systematic DCA from income continues, and existing holdings are never sold.', claim: 'Slow new buying when dear; never sell.', concept: 'Valuation discipline', link: '/part-3-bitcoin-convexity-backbone#valuation' },
    ],
    mobileTapTargets: ['cheap', 'heartbeat', 'slows'],
    personalization: { uses: ['monthlyDca'], kind: 'dca-note', introLead: 'Representative DCA example', note: 'Names the fixed DCA dollar amount in the units = dollars ÷ price relationship. Representative units on a representative price index, not historical prices.' },
    implementationNotes: 'Accumulation layout (HeartbeatSvg is the internal name): a representative BTC price index above DCA unit bars where bar height = fixed dollars ÷ price, so a lower price draws a taller bar. The framework multiplier is keyed to price, not time (×1.5 below 0.5 on the index, ×0.5 above 1.2, otherwise ×1.0), matching Part 3’s "raise DCA about 50 percent"; the ×0.5 stands for halved discretionary buying with the difference kept as dry powder. The accent bar stacks above the muted baseline bar in the undervalued window and falls below it when extended. The end readout (fwPct) is units per dollar against plain DCA, so it compares like for like; the renderer still labels it FRAMEWORK UNITS. "heartbeat" is not used as visible copy.',
  },

  {
    chartId: 'p3-cold-storage-to-borrow', idx: 'P3-06', group: 'part-3', intendedPlacement: 'part-3',
    claimStack: {
      primaryClaim: 'A mature reserve can supply cash by borrowing against it instead of selling it, if you choose to borrow at all',
      visualProof: 'A five-stage lifecycle read left to right (accumulate, self-custody, mature reserve, collateralized loan) ending in a highlighted liquidity node: cash with no sale while the loan holds',
      interactionRole: 'Hover any stage to see what it adds, and what it risks, on the way to cash without selling the reserve',
      readerAction: 'Follow the lifecycle left to right to the highlighted liquidity node',
      caution: 'Borrowing is optional. A loan supplies cash without a sale, but it adds interest cost and the risk of a forced sale: if the collateral falls far enough, or a payment is missed, the lender sells it, and that sale is a taxable event. Tax treatment can change',
    },
    status: 'implemented', wiredPublic: true,
    title: 'Cold Storage to Borrow', setupLine: 'The reserve lifecycle: accumulate, self-custody, mature, and optionally borrow instead of selling',
    claimLabel: 'LIFECYCLE · RESERVE',
    frameworkClaim: 'A mature reserve can fund income-producing assets by borrowing against it instead of selling it, if you choose to borrow at all.',
    readerTakeaway: 'Borrowing against the reserve avoids a sale and adds leverage risk; it is a choice, never a requirement.',
    chartType: 'Reserve lifecycle flow: accumulate → self-custody → mature → collateralized loan → liquidity.',
    visualDataMode: 'conceptual', disclosure: DISCLOSURE.conceptual, footerCta: 'View framework basis',
    sources: [{ provider: 'ACF · Part 3', label: 'Rule stated in Part 3 · TAM, custody, and the borrow phase', role: 'verifies-concept', url: '/part-3-bitcoin-convexity-backbone#tam' }],
    explainerHeadline: 'Liquidity without selling the reserve, at a price.',
    explainerBody: 'The reserve is accumulated, held in self-custody and left to mature. Once it is large relative to any loan, borrowing against it becomes an option, and the loan funds income-producing assets whose cash flow pays the interest, never living costs. A loan supplies cash without a sale, but it adds interest cost and the risk of a forced sale: if the collateral falls far enough, or a payment is missed, the lender sells it, and that sale is a taxable event. Pledged coins leave your keys for the life of the loan, and every loan stays inside the loan-to-value rules in Part 3.',
    explainerConcept: 'Buy-borrow-die',
    concepts: [{ label: 'Buy-borrow-die', link: '/part-3-bitcoin-convexity-backbone#tam' }, { label: 'Cold storage', link: '/part-3-bitcoin-convexity-backbone#tam' }],
    layout: 'flow',
    ariaSummary: 'A five-stage reserve lifecycle, left to right: accumulate, self-custody, mature reserve, an optional collateralized loan, and liquidity with no sale while the loan holds.',
    flow: {
      stages: [
        { id: 's1', label: 'Accumulate', nodes: [{ id: 'accumulate', label: 'Accumulate', sub: 'paced by valuation' }] },
        { id: 's2', label: 'Custody', nodes: [{ id: 'custody', label: 'Self-custody', sub: 'your own keys' }] },
        { id: 's3', label: 'Mature', nodes: [{ id: 'mature', label: 'Mature reserve', sub: 'long-duration hold' }] },
        { id: 's4', label: 'Collateral', nodes: [{ id: 'loan', label: 'Collateralized loan', sub: 'optional · coins pledged' }] },
        { id: 's5', label: 'Liquidity', nodes: [{ id: 'liquidity', label: 'Liquidity', sub: 'no sale while the loan holds' }] },
      ],
    },
    primaryKey: 'liquidity',
    hoverTargets: [
      { id: 'accumulate', kind: 'node', label: 'Accumulate', name: 'Accumulate', why: 'Build the reserve steadily from income, paced by valuation rather than timing.', claim: 'Start by stacking.', concept: 'Accumulation', link: '/part-3-bitcoin-convexity-backbone#accumulate' },
      { id: 'custody', kind: 'node', label: 'Self-custody', name: 'Self-custody', why: 'Hold it in cold storage under your own keys, with no intermediary between you and the coins.', claim: 'Hold your own keys.', concept: 'Cold storage', link: '/part-3-bitcoin-convexity-backbone#tam' },
      { id: 'mature', kind: 'node', label: 'Mature reserve', name: 'Mature reserve', why: 'Let the position grow, through 15 to 20 years of accumulation and appreciation, into a reserve that is large relative to any loan you might take.', claim: 'Scale first; borrowing stays optional.', concept: 'Bitcoin backbone', link: '/part-3-bitcoin-convexity-backbone#backbone' },
      { id: 'loan', kind: 'node', label: 'Collateralized loan', name: 'Collateralized loan', why: 'Borrow against the reserve instead of selling it, within the loan-to-value rules in Part 3. Pledged coins leave self-custody for the lender’s custody or a shared multisig for the life of the loan, and if the collateral falls far enough the lender sells it.', claim: 'Pledged, not sold, while the loan holds.', concept: 'Buy-borrow-die', link: '/part-3-bitcoin-convexity-backbone#tam' },
      { id: 'liquidity', kind: 'node', label: 'Liquidity', name: 'Liquidity without a sale', why: 'Cash to put into income-producing assets, with no sale while the loan holds and the long-duration exposure kept. A forced sale would be taxable; staying inside the loan-to-value rules lowers the odds of one without removing them.', claim: 'Liquidity while still holding.', concept: 'Buy-borrow-die', link: '/part-3-bitcoin-convexity-backbone#tam' },
    ],
    mobileTapTargets: ['accumulate', 'custody', 'mature', 'loan', 'liquidity'],
    implementationNotes: 'Lifecycle flow (linear stages). Conceptual diagram; the final liquidity node is the emphasized output. The leverage caveat sits in the explainer as well as claimStack.caution, because the caution reaches only the static fallback.',
  },

  {
    chartId: 'p3-reserve-share-evolves', idx: 'P3-07', group: 'part-3', intendedPlacement: 'part-3',
    claimStack: {
      primaryClaim: 'A starting reserve can grow into a share large enough that governing it matters more than building it',
      visualProof: 'A reserve-share line rising over twenty years from about 12 percent, past the 15 percent top of the target range near year 7 and across the 30 percent mature guide just after year 15, to about 46 percent, with a mark where borrowing becomes an option',
      interactionRole: 'Hover the line, the target and mature guides, or the borrowing mark to see why the job changes as the share grows',
      readerAction: 'Trace the line up through the target and mature guides to the borrowing mark',
      caution: 'Illustrative trajectory, not a forecast for any portfolio. These percentages describe outcomes under given conditions, not rebalanced targets.',
    },
    status: 'implemented', wiredPublic: true,
    title: 'Reserve Share Evolves', setupLine: 'A 10–15% reserve can grow into a 30–50% share over 15 to 20 years, and borrowing against it then becomes an option',
    claimLabel: 'ALLOCATION · PHASE',
    frameworkClaim: 'A 10–15% reserve can grow, through accumulation and appreciation, into a 30–50% mature share, where borrowing against it becomes an option.',
    readerTakeaway: 'Success changes the job, from accumulating the reserve to governing it.',
    chartType: 'Reserve share as a percent of net worth, rising through the target range toward a mature share.',
    visualDataMode: 'simulation', disclosure: DISCLOSURE.simulation, footerCta: 'View methodology',
    sources: [{ provider: 'Author calculation', label: 'Illustrative trajectory: share = 12 + 34 × (year ÷ 20)^2.3 percent, with small drawn noise', role: 'methodology', notes: 'Reaching about 45 percent in 20 years with no new contributions implies Bitcoin outgrowing the rest of the portfolio by roughly 9 to 10 percent a year on average; ongoing accumulation lowers that.' }, { provider: 'ACF · Part 3', label: 'Rule stated in Part 3 · TAM, custody, and the borrow phase', role: 'verifies-concept', url: '/part-3-bitcoin-convexity-backbone#tam' }],
    explainerHeadline: 'A reserve that is never sold can outgrow its target.',
    explainerBody: 'A starting reserve of 10 to 15 percent, accumulated and never sold, can grow into 30 to 50 percent of net worth after 15 to 20 years if Bitcoin keeps outgrowing the rest of the portfolio. At that point the job can change from building the reserve to governing it, and borrowing against it becomes an option, within the loan-to-value rules in Part 3.',
    explainerConcept: 'Reserve governance',
    concepts: [{ label: 'Reserve governance', link: '/part-3-bitcoin-convexity-backbone#tam' }, { label: 'Buy-borrow-die', link: '/part-3-bitcoin-convexity-backbone#tam' }],
    layout: 'single',
    ariaSummary: 'Reserve share as a percent of net worth, rising over twenty years from about 12 percent, past the 15 percent top of the target range near year 7, across the 30 percent mature guide just after year 15, to about 46 percent at year 20. A mark at year 17 shows where borrowing against the reserve becomes an option.',
    domain: { xMin: 0, xMax: 20, yMin: 0, yMax: 55 }, yUnit: '', valueUnit: '% of net worth',
    xTicks: [{ v: 0, label: 'yr 0' }, { v: 10, label: 'yr 10' }, { v: 20, label: 'yr 20' }],
    yTicks: [{ v: 15, label: '15%' }, { v: 30, label: '30%' }, { v: 45, label: '45%' }],
    series: [{ key: 'reserve', tier: 'primary', label: 'Reserve share', pts: p3Reserve.reserve }],
    guides: [
      { id: 'target', y: 15, kind: 'base', label: 'target 10–15%' },
      { id: 'mature', y: 30, kind: 'threshold', dash: true, label: 'mature share · 30%+' },
    ],
    markers: [
      { id: 'borrow', type: 'enso', x: 17, y: R(valueAt(p3Reserve.reserve, 17)), r: 12, label: 'borrowing becomes an option', labelAnchor: 'end', labelDy: -16 },
    ],
    primaryKey: 'reserve',
    hoverTargets: [
      { id: 'reserve', kind: 'series', seriesKey: 'reserve', label: 'Reserve share', name: 'Reserve share', why: 'Accumulation plus appreciation can grow the reserve from a modest slice into the largest holding in the portfolio. Nothing rebalances it up; it gets there by not being sold.', claim: 'The share is allowed to grow.', concept: 'Reserve governance', link: '/part-3-bitcoin-convexity-backbone#tam' },
      { id: 'target', kind: 'level', label: 'Target 10–15%', name: 'Target reserve · 10–15%', why: 'The usual starting allocation, enough to matter. At a 10 to 15 percent reserve, a 75 to 80 percent Bitcoin drawdown costs the portfolio about 8 to 12 percent.', claim: 'The usual starting range.', concept: 'Position sizing', link: '/part-5-portfolio-construction-position-management#torque' },
      { id: 'mature', kind: 'level', label: 'Mature share · 30%+', name: 'Mature share', why: 'Past roughly 30 percent, the reserve is usually the largest single holding, and governing it matters more than adding to it.', claim: 'Big enough that governing it is the job.', concept: 'Reserve governance', link: '/part-3-bitcoin-convexity-backbone#tam' },
      { id: 'borrow', kind: 'marker', label: 'Borrowing becomes an option', name: 'Borrowing becomes an option', why: 'Once the reserve is large relative to any loan, you may borrow against it to fund income-producing assets, within the loan-to-value rules in Part 3. Borrowing stays optional; leverage, drawdown and liquidity now matter more than adding coins.', claim: 'The job changes from build to govern.', concept: 'Buy-borrow-die', link: '/part-3-bitcoin-convexity-backbone#tam' },
    ],
    mobileTapTargets: ['borrow', 'mature', 'target', 'reserve'],
    implementationNotes: 'SIMULATION of an illustrative trajectory: share = 12 + 34 × (year ÷ 20)^2.3 plus small noise. As drawn it first reaches the 15 percent guide at year 7 and the 30 percent guide at year 15.2, reads about 35.6 at the year-17 mark and 46 at year 20. Ranges (10–15% target, 30–50% mature) from Part 3 #tam. Phase thresholds shown as guides.',
  },

  /* ── PART 4 · TAX ARCHITECTURE ─────────────────────────────────────────── */
  {
    chartId: 'p4-tax-wedge', idx: 'P4-02', group: 'part-4', intendedPlacement: 'part-4',
    experienceRole: 'comparison',
    claimStack: {
      primaryClaim: 'The after-tax gap between a Roth and a taxable account that sells widens as the win grows',
      visualProof: 'Roth and taxable start together at 1× and pull apart as the gross outcome scales; the shaded gap between them is the tax wedge. Pre-tax starts lower, at 0.70×, because its whole withdrawal is taxed and the deduction it earned going in is not drawn',
      interactionRole: 'Hover a wrapper line to see how much it keeps and why',
      readerAction: 'Follow the shaded gap between Roth and taxable as the outcome scales right',
      caution: 'Per dollar inside each account, at representative federal rates: 23.8 percent on a large one-time sale and about 30 percent blended on pre-tax withdrawals spread over years. The deduction a pre-tax contribution earns going in is not drawn; at the same tax rate going in and coming out, pre-tax and Roth leave the same after-tax money. Illustrative; the numbers depend on income, filing status, state tax and the rules in force',
    },
    interaction: { type: 'hover', gesture: 'hover', conceptMatch: 'Hovering a wrapper line ties its retained share to the tax that produces it' },
    status: 'implemented', wiredPublic: true,
    title: 'The Tax Wedge', setupLine: 'What each account lets you keep of every dollar inside it, as a winning position grows',
    claimLabel: 'WRAPPER · RETENTION',
    frameworkClaim: 'Where a winning position sits decides how much of the win you keep: a Roth keeps all of it, and its lead over a taxable account that sells grows with the size of the win.',
    readerTakeaway: 'Where you hold a position matters most for the winners you may one day sell at many times their cost.',
    chartType: 'Three retained-value lines (Roth, taxable, pre-tax) with the gap between Roth and taxable shaded as the tax wedge.',
    visualDataMode: 'representative',
    disclosure: DISCLOSURE.representative, footerCta: 'View sources',
    sources: [
      { provider: 'IRS · Publication 590-B', label: 'Traditional IRA distributions are taxed as ordinary income; qualified Roth IRA distributions are not taxed', role: 'verifies-concept', url: 'https://www.irs.gov/publications/p590b' },
      { provider: 'IRC · 26 U.S.C. §1(h)', label: 'Long-term capital gains rates (top rate 20 percent)', role: 'verifies-concept', url: 'https://www.law.cornell.edu/uscode/text/26/1' },
      { provider: 'IRC · 26 U.S.C. §1411', label: 'The 3.8 percent net investment income tax', role: 'verifies-concept', url: 'https://www.law.cornell.edu/uscode/text/26/1411' },
      { provider: 'IRS', label: '2026 IRA contribution limit ($7,500; $1,100 catch-up at 50+), shared across traditional and Roth IRAs', role: 'verifies-concept', url: 'https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500' },
      { provider: 'Author calculation', label: 'Roth 100% · taxable keeps the principal plus ~76% of the gain (23.8% on a large one-time sale) · pre-tax ~70% of the whole withdrawal at a representative 30% blended ordinary rate (withdrawals spread over years) · illustrative; depends on income, filing status and state', role: 'methodology' },
    ],
    explainerHeadline: 'The bigger the win, the more wrapper choice decides what you keep.',
    explainerBody: 'A Roth keeps the whole gain. A taxable account that sells pays capital-gains tax on the way out: at 23.8 percent it keeps the principal plus about 76 percent of the gain, so at 10× the Roth ends about 27 percent ahead of it, and never more than about 31 percent ahead however large the win. That shaded gap is small on a modest gain and wide on a right-tail one. Pre-tax pays ordinary-income tax on everything that comes out, which is why its line starts at 0.70×. What the picture leaves out is the deduction a pre-tax contribution earned going in: at the same rate going in and coming out, pre-tax and Roth end even. Convex positions tip toward Roth for three reasons: contribution limits are set in dollars, so a full Roth contribution shelters more after-tax money; required distributions can push a large pre-tax balance into higher brackets; and heirs generally inherit a Roth free of income tax under current law.',
    explainerConcept: 'Wrapper edge',
    concepts: [{ label: 'Wrapper edge', link: '/part-4-tax-architecture-roc-strategy#edge' }, { label: 'Right-tail outcomes', link: '/part-4-tax-architecture-roc-strategy#roth' }, { label: 'Survivable compounding', link: '/part-1-foundation#manifesto' }],
    layout: 'single',
    ariaSummary: 'Three lines show what each account keeps of every dollar inside it as a winning position grows from one times to thirty times. The Roth line keeps the full outcome and reaches thirty times. The taxable line starts with it at one times and rises less steeply, keeping the principal plus about 76 percent of each unit of gain, to about 23 times at the right edge; the widening gap between the Roth and taxable lines is shaded as the tax wedge. The pre-tax line starts lower, at 0.7 times, because its whole withdrawal, principal included, is taxed as ordinary income; it keeps about 70 percent all the way and reaches about 21 times. The chart does not show the deduction a pre-tax contribution earned going in.',
    domain: { xMin: 1, xMax: 30, yMin: 0, yMax: 30 }, yUnit: '×',
    xTicks: [{ v: 1, label: '1×' }, { v: 10, label: '10×' }, { v: 20, label: '20×' }, { v: 30, label: '30× gross' }],
    yTicks: [{ v: 0, label: '0' }, { v: 10, label: '10×' }, { v: 20, label: '20×' }, { v: 30, label: '30× kept' }],
    series: [
      { key: 'pretax', tier: 'tertiary', label: 'Pre-tax · ~70%', pts: taxWedge.pretax, labelDy: 4 },
      { key: 'taxable', tier: 'secondary', label: 'Taxable · ~76%', pts: taxWedge.taxable, labelDy: 2 },
      { key: 'roth', tier: 'primary', label: 'Roth · 100%', pts: taxWedge.roth },
    ],
    areas: [{ id: 'wedge', topKey: 'roth', botKey: 'taxable', kind: 'gap', xFrom: 1, label: 'tax on the sale · widens with the win' }],
    guides: [],
    markers: [],
    levels: [],
    notes: [],
    primaryKey: 'roth',
    hoverTargets: [
      { id: 'roth', kind: 'series', seriesKey: 'roth', label: 'Roth', name: 'Roth · keeps 100%', why: 'Qualified withdrawals are not taxed, so the whole outcome is yours. The other two lines are measured against this one.', claim: 'Roth keeps the whole win.', concept: 'Wrapper edge', link: '/part-4-tax-architecture-roc-strategy#edge' },
      { id: 'taxable', kind: 'series', seriesKey: 'taxable', label: 'Taxable', name: 'Taxable · keeps ~75 to 85% of the gain', why: 'Sell a long-held winner and federal capital-gains tax takes its cut of the gain, not of the principal. The line uses 23.8 percent, the 20 percent top rate plus the 3.8 percent net investment income tax, which a large one-time sale can reach. You keep about 75 to 85 percent of the gain, depending on income (all of it in the 0 percent bracket); state tax comes on top.', claim: 'The wedge is the tax on the sale.', concept: 'Taxable account', link: '/part-4-tax-architecture-roc-strategy#taxable' },
      { id: 'pretax', kind: 'series', seriesKey: 'pretax', label: 'Pre-tax', name: 'Pre-tax · keeps ~60 to 80% of each withdrawal', why: 'The contribution was deducted going in, so every dollar that comes out, principal included, is ordinary income. The line uses a 30 percent blended rate; depending on your rate when the money comes out, you keep roughly 60 to 80 percent. The deduction you took going in is not drawn: at the same rate in and out, pre-tax and Roth end even.', claim: 'Taxed on all of it, after a deduction going in.', concept: 'Wrapper edge', link: '/part-4-tax-architecture-roc-strategy#edge' },
    ],
    mobileTapTargets: ['roth', 'taxable', 'pretax'],
    implementationNotes: 'Signature Part 4 exhibit. Three straight retained-value lines per dollar inside each account: Roth 100%; taxable the principal plus ~76.2% of the gain (23.8% on a large one-time sale); pre-tax ~70% of the whole withdrawal (about 30% blended ordinary rate, zero basis). Roth and taxable start together at (1×, 1×); pre-tax starts at 0.70×. The shaded wedge is Roth against taxable, the gap that grows with the size of the win; the Roth-to-pre-tax gap comes from counting dollars inside the account and leaving out the deduction, which the explainer, caution and pre-tax hover state. Rates are shared with p4-gross-not-net (70/30) and p4-roc-yield (76/24). Restrained green thesis line on Roth; taxable and pre-tax recede.',
  },

  {
    chartId: 'p4-gross-not-net', idx: 'P4-04', group: 'part-4', intendedPlacement: 'part-4',
    experienceRole: 'evidence', visualRelationship: 'composition',
    claimStack: {
      primaryClaim: 'A pre-tax statement shows 100 percent, and part of it is tax you have not paid yet',
      visualProof: 'One donut splits the gross balance into the net you keep and the deferred tax claim; a horizon control grows the balance while the 70/30 split holds at a steady rate, so the claim grows in dollars alongside the net',
      interactionRole: 'Step the horizon to watch both shares grow while the split holds; hover a share for its why',
      readerAction: 'Read the split first, then step the horizon and watch the claim grow in dollars',
      caution: 'Conceptual composition at a representative 30 percent blended rate on withdrawals, with the balance growing about 9 percent a year. The claim’s final size is set by your rate when the money comes out. Tax is deferred, not eliminated, under current law',
    },
    interaction: { type: 'hover', gesture: 'hover', conceptMatch: 'Hovering a share ties the deferred claim to the balance it is a fraction of' },
    status: 'implemented', wiredPublic: true,
    title: 'Gross Is Not Net', setupLine: 'One gross balance, split into the part you keep and the part you owe',
    claimLabel: 'PRE-TAX · OWNERSHIP',
    frameworkClaim: 'A pre-tax balance is shared with the tax authority: the deferred tax grows with the balance, and your rate when the money comes out sets how large its share ends up.',
    readerTakeaway: 'Only the net is yours, and your rate when you withdraw decides how big the rest is.',
    chartType: 'A composition donut splitting one gross pre-tax balance into the retained net (~70%) and the deferred tax claim (~30%), with a horizon control that grows the balance while the share holds at a steady rate.',
    visualDataMode: 'conceptual',
    disclosure: DISCLOSURE.conceptual, footerCta: 'View framework basis',
    sources: [
      { provider: 'ACF · Part 4', label: 'Rule stated in Part 4 · Pre-tax accounts: inferior, occasionally useful', role: 'verifies-concept', url: '/part-4-tax-architecture-roc-strategy#pretax' },
      { provider: 'IRC · 26 U.S.C. §72', label: 'Ordinary-income tax on qualified-plan and annuity withdrawals', role: 'verifies-concept', url: 'https://www.law.cornell.edu/uscode/text/26/72' },
    ],
    explainerHeadline: 'The statement says 100 percent. You do not own 100 percent.',
    explainerBody: 'A pre-tax dollar went in untaxed, so part of the balance is tax you have not paid yet. Step the horizon: at a steady rate the split holds, and the claim grows in dollars right alongside your share. Its final size is set by your rate when the money comes out. A larger balance withdrawn at higher brackets, or forced out by required distributions, owes a bigger share; a conversion in a low-income year owes a smaller one. At the same rate going in and coming out, a Roth, which pays the tax up front, ends even with pre-tax. What tips convex positions toward Roth is the dollar limit on contributions, required distributions and what heirs inherit.',
    explainerConcept: 'Wrapper edge',
    concepts: [{ label: 'Wrapper edge', link: '/part-4-tax-architecture-roc-strategy#edge' }, { label: 'Tax architecture', link: '/part-4-tax-architecture-roc-strategy#edge' }],
    layout: 'radial',
    ariaSummary: 'A donut divides one gross pre-tax balance into two shares: about 70 percent is the net you keep, drawn in the framework accent, and about 30 percent is the deferred tax claim, drawn muted. A horizon control (today, plus 12 years, plus 25 years) grows the balance from one times to about 8.6 times, at about 9 percent a year, while the 70/30 split holds, so the claim grows from 0.3 of a unit to about 2.6 units. The split assumes a steady 30 percent rate; the claim’s final size is set by the rate when the money comes out.',
    radial: {
      variant: 'donut',
      centerLabel: 'Gross balance',
      caption: 'Only the net is yours. At a steady rate, the claim grows with it.',
      segments: [
        { id: 'net', label: 'Net · yours', value: 0.70, tier: 'primary', sub: 'after the tax that comes due' },
        { id: 'claim', label: 'Deferred tax claim', value: 0.30, tier: 'secondary', sub: 'owed at your future rate' },
      ],
      scales: [
        { id: 'today', label: 'Today', center: '1×', seg: { net: '0.70×', claim: '0.30×' } },
        { id: 'y12', label: '+12 yrs', center: '≈ 2.8×', seg: { net: '≈ 2.0×', claim: '≈ 0.8×' } },
        { id: 'y25', label: '+25 yrs', center: '≈ 8.6×', seg: { net: '≈ 6.0×', claim: '≈ 2.6×' } },
      ],
      defaultScale: 'today',
    },
    primaryKey: 'net',
    hoverTargets: [
      { id: 'net', kind: 'segment', label: 'Net', name: 'Net · what you actually own', why: 'What is left after the ordinary-income tax due on withdrawal, at the representative 30 percent rate. It is the part you can spend.', claim: 'Only the net is yours.', concept: 'Wrapper edge', link: '/part-4-tax-architecture-roc-strategy#edge' },
      { id: 'claim', kind: 'segment', label: 'Claim', name: 'The deferred tax claim', why: 'Deferral moves the tax into the future; it does not remove it. At a steady rate the claim keeps its roughly 30 percent share and grows in dollars with the balance. Its final size is set by your rate when the money comes out, which is why the framework converts pre-tax balances to Roth in low-income years.', claim: 'The claim grows with the balance.', concept: 'Tax architecture', link: '/part-4-tax-architecture-roc-strategy#edge' },
    ],
    mobileTapTargets: ['net', 'claim'],
    implementationNotes: 'Conceptual Part 4 exhibit for the "Gross Is Not Net" callout. Composition donut (radial layout): one gross balance split into retained net (accent, ~70%) and the deferred tax claim (muted, ~30%) at the representative 30% blended withdrawal rate shared with p4-tax-wedge. The horizon control (today / +12 / +25 years, at about 9% a year: 1.09^12 ≈ 2.8× and 1.09^25 ≈ 8.6×) grows the center and segment magnitudes while the arcs stay fixed, which holds only at a constant rate; the copy says the final share is set by the rate at withdrawal or conversion. Deferral, not elimination, under current law.',
  },

  {
    chartId: 'p4-roc-yield', idx: 'P4-03', group: 'part-4', intendedPlacement: 'part-4',
    experienceRole: 'comparison', visualRelationship: 'comparison',
    claimStack: {
      primaryClaim: 'Return of capital defers the tax, so more of each distribution goes back to work now',
      visualProof: 'Two aligned bars split the same 100-unit distribution: return of capital sends all 100 back to work now, with its deferred tax shown below the bar, while a qualified dividend taxed at the top federal rate gives up 24 and redeploys 76; the surplus is the visible edge',
      interactionRole: 'Hover a bar segment to see how its tax treatment changes what redeploys',
      readerAction: 'Compare how far each bar’s working segment reaches; the gap is the tax taken now',
      caution: 'Conceptual comparison at the top federal rate on qualified dividends (23.8 percent). Return of capital is not tax-free: it lowers your basis, the deferred gain is taxed when you sell unless a step-up at death resets the basis first, and once basis reaches zero further distributions are taxed as capital gain when received. Under current law; characterization is set each tax year and can change',
    },
    interaction: { type: 'hover', gesture: 'hover', conceptMatch: 'Hovering a segment ties its tax treatment to how much of the distribution redeploys' },
    status: 'implemented', wiredPublic: true,
    title: 'ROC Changes the Yield', setupLine: 'One distribution, two tax treatments, and how much of it goes back to work',
    claimLabel: 'RETURN OF CAPITAL · DEFERRAL',
    frameworkClaim: 'A return-of-capital distribution defers tax by reducing basis, so more of each distribution stays available to redeploy than an equivalent distribution taxed on receipt.',
    readerTakeaway: 'Deferring the tax keeps more of each distribution working during the years you are still deploying.',
    chartType: 'Two aligned 100-unit bars comparing how much of the same distribution redeploys now: return of capital (100, tax deferred below the bar) versus a qualified dividend taxed at the top federal rate (76 redeployed, 24 taxed).',
    visualDataMode: 'conceptual',
    disclosure: DISCLOSURE.conceptual, footerCta: 'View framework basis',
    sources: [
      { provider: 'ACF · Part 4', label: 'Rule stated in Part 4 · The work taxable accounts do', role: 'verifies-concept', url: '/part-4-tax-architecture-roc-strategy#taxable' },
      { provider: 'IRS · Publication 550', label: 'A nondividend distribution (return of capital) reduces basis and is not taxed until basis is fully recovered; after that it is capital gain', role: 'verifies-concept', url: 'https://www.irs.gov/publications/p550' },
      { provider: 'IRC · 26 U.S.C. §301(c)', label: 'The part of a distribution that is not a dividend reduces the stock’s basis; any excess over basis is treated as gain', role: 'verifies-concept', url: 'https://www.law.cornell.edu/uscode/text/26/301' },
      { provider: 'IRC · 26 U.S.C. §1(h)', label: 'Qualified dividends are taxed at the long-term capital gains rates (top rate 20 percent)', role: 'verifies-concept', url: 'https://www.law.cornell.edu/uscode/text/26/1' },
      { provider: 'IRC · 26 U.S.C. §1411', label: 'The 3.8 percent net investment income tax', role: 'verifies-concept', url: 'https://www.law.cornell.edu/uscode/text/26/1411' },
    ],
    explainerHeadline: 'Return of capital defers the tax, so more of the distribution keeps working.',
    explainerBody: 'A return-of-capital distribution is not taxed when you receive it; it lowers your cost basis instead. All of it can go back to work now, and the tax waits, drawn below the bar, until you sell. A qualified dividend taxed at the top federal rate (20 percent plus the 3.8 percent net investment income tax) gives up about 24 of every 100 first. On a 12 percent yield, that is 12 points a year back to work against about 9.1. The tax still comes due: on the deferred gain when you sell, unless a step-up at death resets the basis first, and on receipt once basis reaches zero.',
    explainerConcept: 'Return of capital',
    concepts: [{ label: 'Return of capital', link: '/part-4-tax-architecture-roc-strategy#taxable' }, { label: 'Ballast', link: '/part-5-portfolio-construction-position-management#ballast' }],
    layout: 'laneBar',
    ariaSummary: 'Two aligned bars split the same 100-unit distribution. The return-of-capital bar sends the full 100 back to work now, with a hatched strip below it marking about 24 units of tax deferred into a lower cost basis, due at a later sale. The taxed-dividend bar, taxed at the top federal rate, redeploys about 76 units now and gives up about 24 to tax. A dashed line marks the 76 point; the return-of-capital bar reaches past it to 100, and that surplus of about 24 units is the capital still working now under return of capital.',
    laneBar: {
      total: 100, unit: 'units', totalLabel: 'What goes back to work now',
      surplusLabel: '+24 still working now under ROC',
      compareKey: 'deploy',                                  // the shared "capital back to work" dimension, compared across lanes
      bars: [
        {
          id: 'roc', label: 'Return of capital', sublabel: 'not taxed on receipt',
          segments: [{ id: 'roc-deploy', key: 'deploy', label: 'redeploys now', value: 100, tier: 'primary', valueLabel: '100' }],
          deferred: { id: 'roc-defer', value: 24, label: 'tax deferred into a lower basis · due at a later sale' },
        },
        {
          id: 'div', label: 'Taxed dividend', sublabel: 'qualified, at the top federal rate',
          segments: [
            { id: 'div-deploy', key: 'deploy', label: 'redeploys now', value: 76, tier: 'secondary', valueLabel: '76' },
            { id: 'div-tax', label: 'taxed now', value: 24, tier: 'stress', valueLabel: '24' },
          ],
        },
      ],
    },
    primaryKey: 'roc-deploy',
    hoverTargets: [
      { id: 'roc-deploy', kind: 'segment', label: 'Return of capital', name: 'Return of capital · redeploys now', why: 'Not taxed when received; it lowers your cost basis instead, deferring the tax to a later sale. The full amount goes back to work now.', claim: 'The whole distribution redeploys.', concept: 'Return of capital', link: '/part-4-tax-architecture-roc-strategy#taxable' },
      { id: 'roc-defer', kind: 'segment', label: 'Deferred to basis', name: 'The deferred tax', why: 'Return of capital is not tax-free. Each distribution lowers your basis, so the tax arrives as a larger capital gain when you sell, unless a step-up at death resets the basis first. Once basis reaches zero, further distributions are taxed as capital gain when received.', claim: 'Deferred until you sell.', concept: 'Return of capital', link: '/part-4-tax-architecture-roc-strategy#taxable' },
      { id: 'div-deploy', kind: 'segment', label: 'Taxed dividend', name: 'Taxed dividend · redeploys now', why: 'The tax is owed for the year the dividend is paid, so only about 76 of every 100 can go back to work, and the next distribution is earned on a smaller base.', claim: 'Tax on receipt shrinks what redeploys.', concept: 'Taxable account', link: '/part-4-tax-architecture-roc-strategy#taxable' },
      { id: 'div-tax', kind: 'segment', label: 'Taxed now', name: 'Tax on receipt', why: 'Qualified dividends are taxed at the long-term capital gains rates. At the top federal rate that is 20 percent plus the 3.8 percent net investment income tax, about 24 of every 100; at lower incomes the cut is smaller. This slice never goes back to work.', claim: 'This slice is taken up front.', concept: 'Taxable account', link: '/part-4-tax-architecture-roc-strategy#taxable' },
    ],
    mobileTapTargets: ['roc-deploy', 'div-deploy', 'div-tax', 'roc-defer'],
    implementationNotes: 'Conceptual Part 4 exhibit for the taxable / return-of-capital section, authored as a laneBar comparison: two aligned 100-unit bars over one shared scale. Return of capital redeploys the full 100 now (accent), with ~24 of deferred tax drawn as a hatched strip below the bar (it exists but is not taken now). The taxed dividend redeploys 76 (secondary) and loses 24 to tax now (stress), at 23.8% on qualified dividends, the rate shared with p4-tax-wedge. A dashed reference line at 76 and the surplus callout make the +24 still working the visual claim. The explainer translates it into yield (12% → 12 points working against ~9.1). Caution and explainer state the zero-basis rule, tax at sale and step-up; under current law.',
  },
  {
    chartId: 'p4-wrapper-routing', idx: 'P4-01', group: 'part-4', intendedPlacement: 'part-4',
    experienceRole: 'diagram',
    claimStack: {
      primaryClaim: 'New money is routed by the kind of position it buys, in a set order, with no fixed split between accounts',
      visualProof: 'Six kinds of new money on the left each connect to the wrapper the framework sends them to on the right: Torque that may rotate to Roth; never-sold Bitcoin and return-of-capital Ballast to taxable; ordinary-income payers and the high-income-year deferral to pre-tax. The match draws two lines, because your own contribution can go Roth while the match itself usually lands pre-tax',
      interactionRole: 'Hover a dollar to light its route, or a wrapper to see everything the framework sends there',
      readerAction: 'Find the dollar you are about to deploy and follow its line before you choose the account',
      caution: 'A conceptual map under current US federal rules. The order (match first, Roth IRA next, then by position type) is Part 4’s routing sequence; the diagram shows only where each kind of dollar lands',
    },
    interaction: { type: 'hover', gesture: 'hover', conceptMatch: 'Hovering a node lights only the routes it belongs to, so one dollar can be followed without losing the map' },
    status: 'implemented', wiredPublic: true,
    title: 'Routing the Dollar', setupLine: 'Where each kind of new capital goes, and why that wrapper',
    claimLabel: 'WRAPPER · ROUTING',
    frameworkClaim: 'After the match, each dollar goes to the wrapper that costs its position the least tax over its life: Torque that may rotate to Roth; never-sold Bitcoin, return-of-capital Ballast and harvesting satellites to taxable; a high-income-year deferral and ordinary-income payers to pre-tax.',
    readerTakeaway: 'The wrapper is chosen by the position, not by the contribution limit that happens to be open.',
    chartType: 'Routing diagram: six kinds of new money on the left, each connected to the wrapper the framework assigns it on the right; the match connects to two.',
    visualDataMode: 'conceptual', disclosure: DISCLOSURE.conceptual, footerCta: 'View framework basis',
    sources: [
      { provider: 'ACF · Part 4', label: 'Rule stated in Part 4 · Three wrappers, three roles', role: 'verifies-concept', url: '/part-4-tax-architecture-roc-strategy#wrappers' },
      { provider: 'IRS', label: '2026 IRA contribution limit ($7,500; $1,100 catch-up at 50+), shared across traditional and Roth IRAs', role: 'verifies-concept', url: 'https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500' },
      { provider: 'IRS · Notice 2025-67', label: '2026 traditional IRA deduction phase-outs for workplace-plan participants ($81,000–$91,000 single; $129,000–$149,000 joint when the contributor is covered)', role: 'verifies-concept', url: 'https://www.irs.gov/pub/irs-drop/n-25-67.pdf' },
      { provider: 'IRS · Notice 2024-2', label: 'SECURE 2.0 Roth matching contributions: the plan may permit them, only for fully vested matches, taxable in the year allocated', role: 'verifies-concept', url: 'https://www.irs.gov/pub/irs-drop/n-24-02.pdf' },
    ],
    explainerHeadline: 'Route by what the dollar is. The sequence only decides which question you ask first.',
    explainerBody: 'Start with the match: contribute enough to earn all of it, in a Roth 401(k) bucket if the plan has one (the match itself lands pre-tax unless the plan offers Roth matching). Fund the Roth IRA next, by the backdoor if your income requires it (subject to the pro-rata rule if you hold other pre-tax IRA money). After that the position decides. Torque that may rotate goes to Roth, where selling is tax-free; never-sold Bitcoin sits in taxable cold storage by default; return-of-capital Ballast and harvesting satellites go to taxable; ordinary-income payers go to pre-tax where there is room. Beyond that, pre-tax is tactical: deferrals in an unusually high-income year, converted to Roth in a later low one. The sequence sets no target mix. The dashboard’s Framework Integrity Score (Part 6) does: it measures your split against the FIS wrapper targets of 45 percent Roth, 35 taxable and 20 pre-tax, and charges a small penalty once drift passes 10 points (as of September 2026).',
    explainerConcept: 'Wrapper edge',
    concepts: [{ label: 'Wrapper edge', link: '/part-4-tax-architecture-roc-strategy#edge' }, { label: 'Right-tail outcomes', link: '/part-4-tax-architecture-roc-strategy#roth' }, { label: 'Bitcoin backbone', link: '/part-3-bitcoin-convexity-backbone#backbone' }],
    layout: 'flow', flowHeight: 520,
    ariaSummary: 'A routing diagram. Six nodes on the left name kinds of new money: contributions up to the employer match, Torque that may rotate, never-sold Bitcoin, return-of-capital Ballast with harvesting satellites, ordinary-income payers, and a high-income year. Three nodes on the right name wrappers: Roth, taxable and pre-tax. Torque connects to Roth. Never-sold Bitcoin and return-of-capital Ballast connect to taxable. Ordinary-income payers and the high-income year connect to pre-tax. The match connects to both Roth and pre-tax: your own contribution can go into a Roth 401(k) bucket, and the match itself lands pre-tax unless the plan offers Roth matching.',
    flow: {
      stages: [
        { id: 'dollar', label: 'The dollar', nodes: [
          { id: 'match', label: 'Up to the match', sub: 'first · Roth or pre-tax' },
          { id: 'torque', label: 'Torque', sub: 'may rotate · right tail' },
          { id: 'bitcoin', label: 'Never-sold Bitcoin', sub: 'cold storage · by default' },
          { id: 'ballast', label: 'ROC Ballast', sub: 'and harvesting satellites' },
          { id: 'ordinary', label: 'Ordinary income', sub: 'bonds · REITs · if room' },
          { id: 'highIncome', label: 'High-income year', sub: 'deduct now, convert later' },
        ] },
        { id: 'wrapper', label: 'Its wrapper', nodes: [
          { id: 'roth', label: 'Roth', sub: 'tax-free · frictionless' },
          { id: 'taxable', label: 'Taxable', sub: 'step-up · borrow · harvest' },
          { id: 'pretax', label: 'Pre-tax', sub: 'tactical, not structural' },
        ] },
      ],
      edges: [
        { from: 'match', to: 'roth' },
        { from: 'match', to: 'pretax' },
        { from: 'torque', to: 'roth' },
        { from: 'bitcoin', to: 'taxable' },
        { from: 'ballast', to: 'taxable' },
        { from: 'ordinary', to: 'pretax' },
        { from: 'highIncome', to: 'pretax' },
      ],
    },
    primaryKey: 'roth',
    hoverTargets: [
      { id: 'match', kind: 'node', label: 'Up to the match', name: 'The employer match · captured first', why: 'Once it vests, a match is an immediate return (100 percent on a dollar-for-dollar match) that outranks any wrapper argument, so contribute at least enough to earn all of it before anything else. Your own contribution can go into a Roth 401(k) bucket if the plan has one. The match itself is pre-tax unless the plan lets you elect Roth matching, which SECURE 2.0 permits if the plan adopts it; the match must be fully vested and is taxable income in the year it is made.', claim: 'Free money outranks wrapper purity.', concept: 'Wrapper edge', link: '/part-4-tax-architecture-roc-strategy#edge' },
      { id: 'torque', kind: 'node', label: 'Torque', name: 'Torque that may rotate · to Roth', why: 'A right-tail position you may trim, sell or rotate as theses change. In a Roth each sale is tax-free, so the whole gain keeps compounding; the Tax Wedge shows that advantage growing with the size of the win.', claim: 'Tax-free trading is the reason it lives here, never a reason to trade more.', concept: 'Right-tail outcomes', link: '/part-4-tax-architecture-roc-strategy#roth' },
      { id: 'bitcoin', kind: 'node', label: 'Never-sold Bitcoin', name: 'Never-sold Bitcoin · to taxable', why: 'Bitcoin is held under a never-sell discipline, so it gains nothing from tax-free trading. In taxable cold storage it can pass to heirs with a stepped-up basis under current law, and only a taxable holding can be pledged for a loan without counting as a distribution. Keeping it there leaves scarce Roth space for Torque that may rotate.', claim: 'Never sold, so Roth space would be wasted on it.', concept: 'Bitcoin backbone', link: '/part-3-bitcoin-convexity-backbone#backbone' },
      { id: 'ballast', kind: 'node', label: 'ROC Ballast', name: 'Return-of-capital Ballast and satellites · to taxable', why: 'Return-of-capital distributions defer tax by lowering basis, and harvesting satellites turn losses into tax assets. Neither does anything inside a Roth or pre-tax account. Yield alone never makes a position Ballast; among positions that already qualify, taxable favors those whose distributions are return of capital.', claim: 'The deferral and the harvest only work in taxable.', concept: 'Return of capital', link: '/part-4-tax-architecture-roc-strategy#taxable' },
      { id: 'ordinary', kind: 'node', label: 'Ordinary income', name: 'Ordinary-income payers · to pre-tax', why: 'Bond funds, and REITs whose distributions are not return of capital, pay income taxed at ordinary rates every year in a taxable account. Inside a pre-tax account that tax waits until withdrawal, when the money is ordinary income anyway, so this is where they go when pre-tax space exists.', claim: 'Defer what is taxed at ordinary rates anyway.', concept: 'Wrapper edge', link: '/part-4-tax-architecture-roc-strategy#edge' },
      { id: 'highIncome', kind: 'node', label: 'High-income year', name: 'A high-income year · to pre-tax', why: 'In an unusually high-income year, switching your 401(k) or 403(b) deferrals to pre-tax takes the deduction at a high rate; converting to Roth in a later low-income year pays the tax at a lower one. A traditional IRA usually cannot do this job: if you are covered by a workplace plan, the 2026 deduction phases out at $81,000–$91,000 single or $129,000–$149,000 joint; it shares the $7,500 IRA limit the Roth IRA already used; and a year-end balance brings the pro-rata rule into a backdoor Roth.', claim: 'Pre-tax is a timing move.', concept: 'Wrapper edge', link: '/part-4-tax-architecture-roc-strategy#edge' },
      { id: 'roth', kind: 'node', label: 'Roth', name: 'Roth · the scarce wrapper', why: 'Roth space is capped in dollars each year (the 2026 IRA limit is $7,500, or $8,600 at 50 or older, shared with any traditional IRA), so it goes to what gains most from tax-free selling: Torque that may rotate. A never-sold holding would spend that space on a benefit it never uses.', claim: 'Reserve Roth for Torque.', concept: 'Wrapper edge', link: '/part-4-tax-architecture-roc-strategy#edge' },
      { id: 'taxable', kind: 'node', label: 'Taxable', name: 'Taxable · the never-sold home', why: 'Step-up at death, pledging a holding for a loan, return-of-capital deferral and loss harvesting all work only in a taxable account, under current law. It also takes buy-and-hold positions once Roth space is full.', claim: 'Taxable does the work the other two cannot.', concept: 'Taxable account', link: '/part-4-tax-architecture-roc-strategy#taxable' },
      { id: 'pretax', kind: 'node', label: 'Pre-tax', name: 'Pre-tax · tactical', why: 'The framework uses pre-tax for the match, for deferrals in an unusually high-income year and for ordinary-income payers where there is room, and converts to Roth in low-income years when it can. It is not a home for convex positions.', claim: 'Pre-tax is for the match, timing and ordinary income.', concept: 'Wrapper edge', link: '/part-4-tax-architecture-roc-strategy#edge' },
    ],
    mobileTapTargets: ['torque', 'bitcoin', 'ballast', 'ordinary', 'match', 'highIncome', 'roth', 'taxable', 'pretax'],
    implementationNotes: 'Part 4 routing exhibit beside the three-step routing sequence. Flow layout with explicit flow.edges, so each node connects only where the spec says; hover lights the focused node’s routes and recedes the rest. Roth is the primary node. The match is the one dollar with two routes: the employee’s own contribution can go to a Roth 401(k) bucket, while the employer match lands pre-tax unless the plan offers SECURE 2.0 Roth matching. Ordinary-income payers route to pre-tax where space exists, per the canonical wrapper map. The explainer carries the one-line FIS wrapper-target note (45/35/20, 10-point dead zone, as of September 2026). Conceptual; under current US federal law.',
  },
  /* ── PART 5 · PORTFOLIO CONSTRUCTION & POSITION MANAGEMENT ─────────────── */
  {
    chartId: 'p5-operating-system', idx: 'P5-01', group: 'part-5', intendedPlacement: 'part-5',
    experienceRole: 'mechanism',
    claimStack: {
      primaryClaim: 'Each posture behaves differently through the same market cycle, and that behavior is what the framework classifies',
      primaryClaimNote: 'one stylized cycle: advance, stress, recovery',
      visualProof: 'Four indexed paths through one cycle: Torque climbs hardest, falls about 60 percent in stress and finishes highest; Ballast dips about 12 percent and deploys at the trough; Hype spikes on attention and is stopped at breakeven by rule; Bitcoin, on its own lower register, falls about 75 percent and recovers without ever being sold to fund the others',
      interactionRole: 'Hover a path, the rotation moment or the stop to read the behavior that defines it',
      readerAction: 'Follow each line through the stress phase and watch what it does differently',
      caution: 'Indexed shapes on one stylized cycle, not returns or forecasts. Bitcoin is drawn on a lower register only to keep it visually separate, and its fall of about 75 percent sits at the shallow end of the 75 to 80 percent Part 3 says to plan for',
    },
    status: 'implemented', wiredPublic: true,
    title: 'Three Jobs. One Cycle.', setupLine: 'How each posture behaves when the market advances, breaks, and recovers',
    claimLabel: 'PART 5 · THE THREE POSTURES',
    frameworkClaim: 'Posture is assigned by expected behavior: Torque carries the upside and absorbs the drawdown, Ballast holds steady and funds the buying, Hype is capped and committed to its exits at entry, and Bitcoin sits outside all three under its own Part 3 rules.',
    readerTakeaway: 'Classify a position by how it will behave under stress.',
    chartType: 'Behavioral-signature plot: four indexed paths through one stylized market cycle (advance · stress · recovery), with the rotation moment and the Hype stop marked.',
    visualDataMode: 'conceptual', disclosure: DISCLOSURE.conceptual, footerCta: 'View framework basis',
    sources: [
      { provider: 'ACF · Part 5', label: 'Rule stated in Part 5 · Three behaviors, one portfolio', role: 'verifies-concept', url: '/part-5-portfolio-construction-position-management#postures' },
      { provider: 'ACF · Part 3', label: 'Rule stated in Part 3 · Bitcoin as the convexity backbone', role: 'verifies-concept', url: '/part-3-bitcoin-convexity-backbone#backbone' },
    ],
    explainerHeadline: 'The cycle is the classifier.',
    explainerBody: 'Run any position through a full cycle in your head and its posture declares itself. If it climbs with the thesis, falls hard in stress and recovers to new highs because the force behind it persists, it is Torque. If it holds steady and has cash to spend when Torque is on sale, it is Ballast, and the trough is where it earns its keep. If it spikes on attention and has nothing underneath when the story breaks, it is Hype, and its exits were set on the day it was bought. Bitcoin does none of these jobs. It takes its own deep drawdowns under Part 3’s rules and is never sold to fund the others.',
    explainerConcept: 'Posture',
    concepts: [{ label: 'Posture', link: '/part-5-portfolio-construction-position-management#postures' }, { label: 'Ballast', link: '/part-5-portfolio-construction-position-management#ballast' }, { label: 'Bitcoin backbone', link: '/part-3-bitcoin-convexity-backbone#backbone' }],
    layout: 'single',
    ariaSummary: 'Four indexed value paths cross one stylized market cycle divided into advance, stress and recovery phases. Torque climbs steepest, falls roughly sixty percent through the stress phase and recovers to finish highest. Ballast stays close to flat, dipping about twelve percent in stress; a ring at the trough marks the rotation moment where reserves deploy into Torque. Hype spikes fastest, collapses early in the stress phase and ends at a dot marked stopped at breakeven, with no recovery path. A dashed Bitcoin line on its own lower register falls about seventy-five percent in the stress phase, deeper than Torque, and recovers; a note marks it as never rotation capital.',
    domain: { xMin: 0, xMax: 10, yMin: 0.08, yMax: 3.05 }, yUnit: 'indexed · conceptual',
    xTicks: [{ v: 2.1, label: 'advance' }, { v: 5.5, label: 'stress' }, { v: 8.4, label: 'recovery' }],
    yTicks: [{ v: 1, label: 'start' }],
    bands: [
      { id: 'stress', kind: 'shock', x0: 4.2, x1: 6.8, seed: 47, intensity: 0.72, label: 'liquidity leaves · correlation rises', labelAnchor: 'peak' },
    ],
    markers: [
      { id: 'deploy', type: 'enso', x: 6.1, y: 0.86, r: 11, label: 'Ballast deploys here', labelAnchor: 'start', labelDy: 26 },
      { id: 'stop', type: 'dot', x: 4.85, y: 1, r: 4.5, label: 'Hype · stopped at breakeven', labelAnchor: 'end', labelDy: 20 },
    ],
    notes: [{ x: 8.75, y: 0.72, text: 'backbone · never rotation capital', anchor: 'middle' }],
    series: [
      { key: 'torque', tier: 'primary', label: 'Torque', pts: p5Cycle.torque },
      { key: 'ballast', tier: 'secondary', label: 'Ballast', pts: p5Cycle.ballast, labelDy: -2 },
      { key: 'hype', tier: 'stress', pts: p5Cycle.hype },
      { key: 'bitcoin', tier: 'tertiary', label: 'Bitcoin · Part 3', pts: p5Cycle.bitcoin, labelDy: 2 },
    ],
    primaryKey: 'torque',
    hoverTargets: [
      { id: 'torque', kind: 'series', seriesKey: 'torque', label: 'Torque', name: 'Torque · carries the upside', why: 'Climbs hardest, falls hardest, finishes highest. Torque can fall 50 to 70 percent in liquidity stress; that drawdown is the price of convexity, and sizing and Ballast exist to make it payable.', claim: 'Torque compounds the thesis.', concept: 'Posture', link: '/part-5-portfolio-construction-position-management#postures' },
      { id: 'ballast', kind: 'series', seriesKey: 'ballast', label: 'Ballast', name: 'Ballast · refuses to fall with it', why: 'Built to hold steady while Torque swings: fortress balance sheets, durable cash flow, low correlation to the rest of the book. That steadier line is the reserve that makes holding Torque possible.', claim: 'Ballast preserves the ability to act.', concept: 'Ballast', link: '/part-5-portfolio-construction-position-management#ballast' },
      { id: 'deploy', kind: 'marker', label: 'The rotation moment', name: 'The trough · reserves deploy', why: 'This is where Ballast earns its space. In the drawdown, reserves buy Torque positions whose thesis and momentum still hold, with no forced selling, no outside cash, and Bitcoin untouched.', claim: 'Reserves exist for this moment.', concept: 'Rotation', link: '/part-5-portfolio-construction-position-management#ballast' },
      { id: 'hype', kind: 'series', seriesKey: 'hype', label: 'Hype', name: 'Hype · rides the narrative', why: 'Spikes fastest because attention is reflexive: price drives interest, which drives price. Nothing sits underneath when the loop breaks, which is why Hype is capped at 5 percent a position and 10 percent in aggregate.', claim: 'Hype is never load-bearing.', concept: 'Hype', link: '/part-5-portfolio-construction-position-management#hype' },
      { id: 'stop', kind: 'marker', label: 'The stop', name: 'Stopped at breakeven · by rule', why: 'The profit ladder sold two-thirds on the way up, a third at +50 percent and a third at +100 percent. The last third rode a stop raised to breakeven, and the rule ended it there: no widening, no averaging down, no reclassifying it as Torque.', claim: 'The exit was decided at entry.', concept: 'Stop-loss', link: '/part-5-portfolio-construction-position-management#hype' },
      { id: 'bitcoin', kind: 'series', seriesKey: 'bitcoin', label: 'Bitcoin', name: 'Bitcoin · separately governed', why: 'The backbone runs on Part 3’s rules. It is not a posture, it sits outside rotation and the concentration limits, and it takes its own drawdowns: about 75 percent here, deeper than Torque’s. It is drawn on a lower register only to keep it visually separate.', claim: 'The backbone is never rotation capital.', concept: 'Bitcoin backbone', link: '/part-3-bitcoin-convexity-backbone#backbone' },
    ],
    mobileTapTargets: ['torque', 'ballast', 'deploy', 'hype', 'stop', 'bitcoin'],
    implementationNotes: 'Single-layout behavioral-signature plot (replaced the postureSystem block diagram, owner review 2026-07-13). Four p5Cycle paths through one stylized cycle: Torque (primary) peak-to-trough ≈−59% inside the stated 50–70% band; Ballast (secondary) near-flat with the trough enso marking the rotation moment; Hype (stress tier) spikes to +150% and ends at an ink dot at breakeven (1.0): the ladder sold at +50% and +100% and raised the last stop to entry, so no documented stop fires anywhere else on this path; Bitcoin (tertiary dashed) on a lower register falling ≈−75% peak to trough, deeper than Torque (register rule: a Bitcoin stress path falls 50% or more and never shallower than Torque). The Hype label sits left of and below its dot to clear the Ballast and Torque lines, and the backbone note sits right of the deploy label. Stress phase carries the pressure-field band. Pure PlotSvg reuse, no engine changes.',
  },

  {
    chartId: 'p5-earned-size', idx: 'P5-02', group: 'part-5', intendedPlacement: 'part-5',
    experienceRole: 'diagram',
    claimStack: {
      primaryClaim: 'Position size is earned through evidence: the most a thesis could justify is not what the evidence supports today',
      visualProof: 'Six evidence stages step upward (thesis exposure, commercial validation, initial execution, scale execution, economic proof, exceptional platform quality), an ascending progression that carries no percentages and no score bands on purpose',
      interactionRole: 'Hover a stage to read the evidence that defines it and what advancing past it requires',
      readerAction: 'Climb the ladder stage by stage and name where your position actually sits',
      caution: 'Percentages come from the score, through Part 5’s posture sizing tables and under its concentration caps',
    },
    status: 'implemented', wiredPublic: true,
    title: 'Position Size Must Be Earned', setupLine: 'Six stages of evidence, from an idea worth investigating to a proven platform',
    claimLabel: 'PART 5 · EARNED CONVICTION',
    frameworkClaim: 'Capital should advance only as evidence advances. A large theoretical upside does not earn a maximum position on day one.',
    readerTakeaway: 'Conviction is built through evidence. It is not declared through enthusiasm.',
    chartType: 'Ascending six-stage evidence ladder (the Earned Conviction Ladder) with no numeric axis, no percentages, and no score-band assignments.',
    visualDataMode: 'conceptual', disclosure: 'Conceptual exhibit · The six evidence stages are the framework’s written sizing ladder and carry no sizing numbers', footerCta: 'View framework basis',
    sources: [
      { provider: 'ACF · Part 5', label: 'Rule stated in Part 5 · Torque: leverage on regime forces', role: 'verifies-concept', url: '/part-5-portfolio-construction-position-management#torque' },
      { provider: 'ACF · Part 5', label: 'Rule stated in Part 5 · Adds and freezes: discipline on the way in', role: 'verifies-concept', url: '/part-5-portfolio-construction-position-management#management' },
    ],
    explainerHeadline: 'Evidence moves first. Size follows.',
    explainerBody: 'A position starts as thesis exposure: real enough to research, not yet proven enough to size up. Commercial validation, initial execution, scale execution and economic proof each add a different kind of evidence, and exceptional platform quality is a final stage few positions reach. The ladder shows no percentages on purpose. The percentages come from the score, through the posture sizing tables and under the concentration caps, and scaling in takes weeks, with no more than a quarter of the target added in any one week.',
    explainerConcept: 'Earned sizing',
    concepts: [{ label: 'Position sizing', link: '/part-5-portfolio-construction-position-management#torque' }, { label: 'CIS', link: '/part-6-convexity-framework-integrity-scoring#cis' }],
    layout: 'rangeSteps',
    ariaSummary: 'An ascending ladder of six evidence stages with no numeric axis. Stage one, thesis exposure: the opportunity is real enough to investigate. Stage two, commercial validation: customers, contracts, backlog or adoption begin confirming demand. Stage three, initial execution: management turns opportunity into measurable delivery. Stage four, scale execution: success repeats without breaking the model. Stage five, economic proof: margins, cash generation and operating leverage validate the business. Stage six, exceptional platform quality: durability, scarcity, execution and optionality together, the strongest evidence a position can show. The exhibit carries no percentages and assigns no score bands.',
    rangeSteps: {
      yUnit: '', yMin: 0, yMax: 20, variant: 'stair', hideScale: true,
      columns: [
        { id: 'st1', label: 'Stage 1', sub: 'Thesis exposure', capNote: 'real enough to investigate', steps: [{ id: 's1', from: 0, to: 2.6, tier: 'reference' }] },
        { id: 'st2', label: 'Stage 2', sub: 'Commercial validation', capNote: 'demand begins confirming', steps: [{ id: 's2', from: 2.6, to: 5.8, tier: 'tertiary' }] },
        { id: 'st3', label: 'Stage 3', sub: 'Initial execution', capNote: 'delivery becomes measurable', steps: [{ id: 's3', from: 5.8, to: 9.2, tier: 'tertiary' }] },
        { id: 'st4', label: 'Stage 4', sub: 'Scale execution', capNote: 'repeats without breaking', steps: [{ id: 's4', from: 9.2, to: 12.8, tier: 'secondary' }] },
        { id: 'st5', label: 'Stage 5', sub: 'Economic proof', capNote: 'margins · cash · leverage', steps: [{ id: 's5', from: 12.8, to: 16.4, tier: 'secondary' }] },
        { id: 'st6', label: 'Stage 6', sub: 'Platform quality', capNote: 'durability · optionality', steps: [{ id: 's6', from: 16.4, to: 20, tier: 'primary' }] },
      ],
      rules: [],
    },
    primaryKey: 's6',
    hoverTargets: [
      { id: 's1', kind: 'node', label: 'Thesis exposure', name: 'Stage 1 · Thesis exposure', why: 'The opportunity is real enough to investigate and not yet proven. The work at this stage is research.', claim: 'Research comes first.', concept: 'Earned sizing', link: '/part-5-portfolio-construction-position-management#torque' },
      { id: 's2', kind: 'node', label: 'Commercial validation', name: 'Stage 2 · Commercial validation', why: 'Customers, contracts, backlog or adoption begin confirming demand. The market is starting to agree that the problem is real and that this company is being paid to solve it.', claim: 'Demand evidence arrives first.', concept: 'Earned sizing', link: '/part-5-portfolio-construction-position-management#torque' },
      { id: 's3', kind: 'node', label: 'Initial execution', name: 'Stage 3 · Initial execution', why: 'Management turns opportunity into measurable delivery: shipped product, recognized revenue, kept promises. Demand showed that customers want it; execution shows that this team can deliver it.', claim: 'Delivery is its own proof.', concept: 'Earned sizing', link: '/part-5-portfolio-construction-position-management#torque' },
      { id: 's4', kind: 'node', label: 'Scale execution', name: 'Stage 4 · Scale execution', why: 'The company shows that success can repeat without breaking the model: growth that strengthens its operations instead of straining them.', claim: 'Repetition separates skill from luck.', concept: 'Earned sizing', link: '/part-5-portfolio-construction-position-management#torque' },
      { id: 's5', kind: 'node', label: 'Economic proof', name: 'Stage 5 · Economic proof', why: 'Margins, cash generation and operating leverage validate the business itself. The thesis no longer depends on the future arriving on schedule.', claim: 'The business now pays its own way.', concept: 'Earned sizing', link: '/part-5-portfolio-construction-position-management#torque' },
      { id: 's6', kind: 'node', label: 'Platform quality', name: 'Stage 6 · Exceptional platform quality', why: 'Durability, scarcity, execution and optionality together: the strongest evidence a position can show. Most positions never reach it, and none begins there.', claim: 'The top of the ladder is rare by design.', concept: 'Earned sizing', link: '/part-5-portfolio-construction-position-management#torque' },
    ],
    mobileTapTargets: ['s1', 's2', 's3', 's4', 's5', 's6'],
    implementationNotes: 'rangeSteps stair variant in hideScale mode: six ascending evidence rungs, no y-axis, no value labels, no cap rules. The stages are the framework’s written sizing ladder (Part 5 #torque). The exhibit deliberately asserts no stage-to-percentage or stage-to-CIS-band mapping; all numeric sizing lives in p5-posture-sizing and the Part 5 sizing tables.',
  },

  {
    chartId: 'p5-posture-sizing', idx: 'P5-04', group: 'part-5', intendedPlacement: 'part-5',
    experienceRole: 'comparison',
    claimStack: {
      primaryClaim: 'The same CIS score earns a different position size in each posture',
      visualProof: 'Three aligned columns on one percent scale: Torque bands reaching 8 to 15 percent under its 15 percent ceiling, Ballast bands topping out at 5 to 8 percent with a 10 percent exceptional maximum, and Hype as a single 2 to 5 percent range under its hard 5 percent cap, with the 18 percent portfolio outer bound drawn as a dashed rule above all three',
      interactionRole: 'Hover any band or ceiling mark to read the score that earns it and the cap that binds it first',
      readerAction: 'Compare the 70+ band across the three columns: same score, three different ceilings',
      caution: 'Hype has no score bands: it is eligible from CIS 50 and sized within Part 5’s 2–5% range under hard caps of 5% a position and 10% in aggregate. Each posture’s own ceiling binds before the 18% maximum, and the 15% Ballast floor is Part 5 doctrine',
    },
    status: 'implemented', wiredPublic: true,
    title: 'The Same Score Does Not Create the Same Position', setupLine: 'The score measures quality; the posture decides what that quality is worth in capital',
    claimLabel: 'PART 5 · POSTURE SIZING',
    frameworkClaim: 'CIS measures a position’s quality, and its posture decides what that quality is worth in capital. Torque and Ballast map the same score bands to different ranges; Hype has a single range from CIS 50.',
    readerTakeaway: 'The posture picks the table; the score picks the row.',
    chartType: 'Three aligned posture columns of CIS-band allocation ranges on one shared percent scale, with the single-position cap rules overlaid.',
    visualDataMode: 'conceptual', disclosure: 'Conceptual comparison · Ranges and caps are the framework’s sizing parameters (Part 5 tables)', footerCta: 'View framework basis',
    sources: [
      { provider: 'ACF · Part 5', label: 'Rule stated in Part 5 · Torque: leverage on regime forces', role: 'verifies-concept', url: '/part-5-portfolio-construction-position-management#torque' },
      { provider: 'ACF · Part 5', label: 'Rule stated in Part 5 · Sizing and placement', role: 'verifies-concept', url: '/part-5-portfolio-construction-position-management#ballast' }, { provider: 'ACF · Part 5', label: 'Rule stated in Part 5 · Hype: quarantined, capped, and pre-committed to exit', role: 'verifies-concept', url: '/part-5-portfolio-construction-position-management#hype' },
      { provider: 'ACF dashboard', label: 'The portfolio builder sizes Hype from CIS 50 at no more than 5 percent a position and 10 percent in aggregate; on the book you hold it flags a Hype position above 5 percent or a sleeve above 10 percent (software behavior as of September 2026)', role: 'verifies-concept', url: '/framework-in-math#sizing-math' },
    ],
    explainerHeadline: 'Quality is scored once; capital is assigned by role.',
    explainerBody: 'Torque earns size through convexity, survivability and execution: 8 to 15 percent at a score of 70 or more, under a 15 percent cap that only a documented override can stretch to 18. Ballast earns size through resilience, liquidity and its usefulness in rotation: up to 8 percent ordinarily and 10 percent for one position of exceptional stability, with the sleeve working between 20 and 35 percent of the book, above a 15 percent floor and below a 40 percent ceiling. Hype has no score bands. It is eligible from a CIS of 50 and sized 2 to 5 percent, never more than 5 percent a position or 10 percent in aggregate, because momentum is both its thesis and its exit signal. The top of each band is the most a score in it can justify. Each posture’s own ceiling binds first, so the 18 percent maximum only ever matters for Torque, and across the book the top three positions stay within 35 percent and the top five within 50.',
    explainerConcept: 'Position sizing',
    concepts: [{ label: 'Position sizing', link: '/part-5-portfolio-construction-position-management#torque' }, { label: 'Posture', link: '/part-5-portfolio-construction-position-management#postures' }, { label: 'CIS', link: '/part-6-convexity-framework-integrity-scoring#cis' }],
    layout: 'rangeSteps',
    ariaSummary: 'Three columns on one shared percent scale, each with its own ceiling mark. Torque stacks three ranges, two to four percent for scores in the fifties, four to eight for the sixties and eight to fifteen at seventy and above, under a posture ceiling at fifteen percent that only a documented override extends to eighteen. Ballast stacks one to three, three to five and five to eight percent for the same score bands, under an exceptional single-position maximum of ten percent, with aggregate Ballast working between twenty and thirty-five percent above a fifteen percent floor and below a forty percent ceiling. Hype shows a single two to five percent range under a hard five percent cap, eligible from a CIS of fifty, with a ten percent aggregate cap. A single dashed rule above all three columns marks the eighteen percent portfolio outer bound; each posture ceiling binds before it.',
    rangeSteps: {
      yUnit: '%', yMin: 0, yMax: 20,
      columns: [
        { id: 'torque', label: 'Torque', sub: 'convex upside', capNote: 'top-3 ≤35% · top-5 ≤50%', cap: { id: 'cap-torque', v: 15, label: 'ceiling 15% · override to 18%' }, steps: [
          { id: 't-starter', from: 2, to: 4, tier: 'tertiary', valueLabel: '50s · 2–4%' },
          { id: 't-standard', from: 4, to: 8, tier: 'secondary', valueLabel: '60s · 4–8%' },
          { id: 't-core', from: 8, to: 15, tier: 'primary', valueLabel: '70+ · 8–15%' },
        ] },
        { id: 'ballast', label: 'Ballast', sub: 'strategic reserves', capNote: 'aggregate 20–35% working · 15% floor · 40% ceiling', cap: { id: 'cap-ballast', v: 10, label: 'exceptional max 10%' }, steps: [
          { id: 'b-marginal', from: 1, to: 3, tier: 'tertiary', valueLabel: '50s · 1–3%' },
          { id: 'b-standard', from: 3, to: 5, tier: 'secondary', valueLabel: '60s · 3–5%' },
          { id: 'b-core', from: 5, to: 8, tier: 'primary', valueLabel: '70+ · 5–8%' },
        ] },
        { id: 'hype', label: 'Hype', sub: 'disciplined speculation', capNote: 'CIS ≥50 · aggregate ≤10%', cap: { id: 'cap-hype', v: 5, label: 'hard max 5%' }, steps: [
          { id: 'h-band', from: 2, to: 5, tier: 'stress', valueLabel: '2–5%' },
        ] },
      ],
      rules: [
        { id: 'outer18', v: 18, label: 'outer bound · 18%' },
      ],
    },
    primaryKey: 't-core',
    hoverTargets: [
      { id: 't-starter', kind: 'node', label: 'Torque 50s', name: 'Torque · CIS 50–59 · 2–4%', why: 'A starter position: the thesis is incomplete or fragile, and the size says so.', claim: 'Starters stay small.', concept: 'Position sizing', link: '/part-5-portfolio-construction-position-management#torque' },
      { id: 't-standard', kind: 'node', label: 'Torque 60s', name: 'Torque · CIS 60–69 · 4–8%', why: 'Standard sizing, constrained until conviction strengthens across convexity, risk, macro and execution.', claim: 'The middle band waits for evidence.', concept: 'Position sizing', link: '/part-5-portfolio-construction-position-management#torque' },
      { id: 't-core', kind: 'node', label: 'Torque 70+', name: 'Torque · CIS 70+ · 8–15%', why: 'Core Torque. The top of the band is the most a score of 70 or more can justify, and it still sits under the 15 percent default cap and the top-three and top-five limits.', claim: 'Torque earns the widest range.', concept: 'Position sizing', link: '/part-5-portfolio-construction-position-management#torque' },
      { id: 'b-marginal', kind: 'node', label: 'Ballast 50s', name: 'Ballast · CIS 50–59 · 1–3%', why: 'Marginal Ballast must still pass three of the five Ballast tests and show improving quality, or a stronger candidate replaces it.', claim: 'Weak Ballast gets replaced, not excused.', concept: 'Ballast', link: '/part-5-portfolio-construction-position-management#ballast' },
      { id: 'b-standard', kind: 'node', label: 'Ballast 60s', name: 'Ballast · CIS 60–69 · 3–5%', why: 'Standard reserve sizing, set by capital preservation and usefulness in rotation rather than by upside.', claim: 'Reserves are sized for the job.', concept: 'Ballast', link: '/part-5-portfolio-construction-position-management#ballast' },
      { id: 'b-core', kind: 'node', label: 'Ballast 70+', name: 'Ballast · CIS 70+ · 5–8%', why: 'Core Ballast: survivability and macro alignment strong enough to offset the lower Convexity score that reserve assets tend to carry. One position of exceptional stability may reach 10 percent.', claim: 'Even the best Ballast stays a reserve.', concept: 'Ballast', link: '/part-5-portfolio-construction-position-management#ballast' },
      { id: 'h-band', kind: 'node', label: 'Hype band', name: 'Hype · 2–5% · 10% aggregate', why: 'Eligible from a CIS of 50 and sized 2 to 5 percent. Momentum is both the thesis and the exit signal, so Hype never carries load: the dashboard flags any Hype position above five percent and a Hype sleeve above ten, and its builder never sizes past them (as of September 2026). The 15 to 25 percent stops are yours to set and to execute.', claim: 'Hype is capped because it has no floor.', concept: 'Hype', link: '/part-5-portfolio-construction-position-management#hype' },
      { id: 'cap-torque', kind: 'node', label: 'Torque ceiling', name: 'Torque ceiling · 15%, override to 18%', why: 'No Torque position exceeds 15 percent without a documented override, and 18 percent is the absolute maximum even then. Torque is the only posture that can reach the portfolio-wide cap.', claim: 'The tallest ceiling is still a ceiling.', concept: 'Concentration limits', link: '/part-5-portfolio-construction-position-management#torque' },
      { id: 'cap-ballast', kind: 'node', label: 'Ballast max', name: 'Ballast · exceptional single-position max 10%', why: 'Ordinary Ballast tops out at 8 percent, and one position of exceptional stability may reach 10. The reserve’s role sets this ceiling, which is why Ballast never approaches the 18 percent bound.', claim: 'Reserves are capped by role, not by score.', concept: 'Ballast', link: '/part-5-portfolio-construction-position-management#ballast' },
      { id: 'cap-hype', kind: 'node', label: 'Hype cap', name: 'Hype · hard max 5%', why: 'No Hype position exceeds 5 percent, and no override exists for this cap. A narrative with no floor never carries load.', claim: 'Five percent, no exceptions, no override.', concept: 'Hype', link: '/part-5-portfolio-construction-position-management#hype' },
      { id: 'outer18', kind: 'node', label: 'Outer bound', name: 'Portfolio outer bound · 18% absolute', why: 'The absolute single-position limit across the whole book, reachable only by a Torque position under a documented override. Ballast stops at 10 percent and Hype at 5 long before it.', claim: 'The outer bound backstops; posture ceilings govern.', concept: 'Concentration limits', link: '/part-5-portfolio-construction-position-management#torque' },
    ],
    mobileTapTargets: ['t-core', 'b-core', 'h-band', 'cap-torque', 'cap-hype'],
    implementationNotes: 'rangeSteps columns mode, revised per owner review (2026-07-13): each posture carries its own ceiling mark (Torque 15 with the override note, Ballast exceptional 10, Hype hard 5) drawn at the column so posture ceilings visibly bind first; the 18% absolute is a single dashed full-width rule labeled as the portfolio outer bound. Hype is one 2–5% range from CIS 50 (Part 5’s sizing range; the scoring rules set only the Hype caps). Ballast capNote carries the 20–35% working range, 15% floor and 40% ceiling. The visual claim remains the 70+ row asymmetry.',
  },

  {
    chartId: 'p5-ballast-rotation', idx: 'P5-03', group: 'part-5', intendedPlacement: 'part-5',
    experienceRole: 'diagram',
    claimStack: {
      primaryClaim: 'Ballast is rotation capital: the reserve that turns a drawdown into an allocation decision',
      visualProof: 'A five-station governed cycle (harvest strength, rebuild reserves, wait without urgency, deploy into validated weakness, participate in recovery) closed by a return arc, with the deploy station as the governed checkpoint',
      interactionRole: 'Hover a station to read its rule; the deploy checkpoint carries the eligibility test',
      readerAction: 'Follow the cycle to the deploy checkpoint, then trace the recovery back to the next harvest',
      caution: 'Bitcoin sits outside this loop by rule and never funds it',
    },
    status: 'implemented', wiredPublic: true,
    title: 'Ballast Preserves the Right to Buy', setupLine: 'The reserve that does the buying when Torque goes on sale',
    claimLabel: 'PART 5 · ROTATION',
    frameworkClaim: 'Ballast is the reserve that prevents forced selling and pays for disciplined buying when convex assets are temporarily mispriced.',
    readerTakeaway: 'Without Ballast, every drawdown is a test of endurance. With Ballast, it is a capital-allocation decision.',
    chartType: 'Five-station rotation cycle with a governed deploy checkpoint and a recovery return arc.',
    visualDataMode: 'conceptual', disclosure: DISCLOSURE.conceptual, footerCta: 'View framework basis',
    sources: [
      { provider: 'ACF · Part 5', label: 'Rule stated in Part 5 · Ballast: the reserve that buys the drawdown', role: 'verifies-concept', url: '/part-5-portfolio-construction-position-management#ballast' },
      { provider: 'ACF · Part 3', label: 'Rule stated in Part 3 · Bitcoin as the convexity backbone', role: 'verifies-concept', url: '/part-3-bitcoin-convexity-backbone#backbone' },
    ],
    explainerHeadline: 'The reserve exists to be spent, on the right names at the right moment.',
    explainerBody: 'After Torque runs, a controlled trim refills reserves toward their working range before the next dislocation; deployment never takes aggregate Ballast below the 15 percent floor. Then you wait, and because the reserve is already funded you never have to call the bottom. Deployment passes one checkpoint: capital goes only to positions whose thesis, survivability and momentum still hold, and a position 20 percent or more below cost waits for the confirming signal the freeze requires. Recovery turns the reserve back into upside, and the next run starts the loop again. Bitcoin never funds any of it.',
    explainerConcept: 'Rotation',
    concepts: [{ label: 'Ballast', link: '/part-5-portfolio-construction-position-management#ballast' }, { label: 'Dry powder', link: '/part-5-portfolio-construction-position-management#ballast' }],
    layout: 'governanceLoop',
    ariaSummary: 'A governed cycle of five stations: harvest strength by trimming Torque that has outgrown its limits, rebuild reserves toward their working range, wait without urgency, deploy into validated weakness at a governed checkpoint, and participate in recovery. A return arc closes the cycle back to harvesting the next run.',
    governanceLoop: {
      governorId: 'deploy',
      returnLabel: 'recovery restores convexity · the cycle repeats',
      nodes: [
        { id: 'harvest', label: 'Harvest', sub: 'trim concentration, not conviction' },
        { id: 'rebuild', label: 'Rebuild', sub: 'refill the reserve' },
        { id: 'wait', label: 'Wait', sub: 'no urgency, no prediction' },
        { id: 'deploy', label: 'Deploy', sub: 'the eligibility gate' },
        { id: 'recover', label: 'Participate', sub: 'resilience back to convexity' },
      ],
    },
    primaryKey: 'deploy',
    hoverTargets: [
      { id: 'harvest', kind: 'node', label: 'Harvest strength', name: 'Harvest strength', why: 'After Torque runs, trim any position that has grown past its concentration limit or past the size its score justifies, and move the proceeds into Ballast. The thesis and the core position stay.', claim: 'Trim concentration, not conviction.', concept: 'Rotation', link: '/part-5-portfolio-construction-position-management#ballast' },
      { id: 'rebuild', kind: 'node', label: 'Rebuild reserves', name: 'Rebuild reserves', why: 'Proceeds refill the reserve before the next dislocation. Aggregate Ballast stays at or above 15 percent at all times; deployment spends only what sits above the floor, and the post-run trim rebuilds the reserve toward its working range.', claim: 'Reserves are rebuilt before the storm.', concept: 'Ballast', link: '/part-5-portfolio-construction-position-management#ballast' },
      { id: 'wait', kind: 'node', label: 'Wait without urgency', name: 'Wait without urgency', why: 'With the reserve already funded, you never have to call the bottom. The framework waits for weakness it can validate.', claim: 'Patience is a funded position.', concept: 'Dry powder', link: '/part-5-portfolio-construction-position-management#ballast' },
      { id: 'deploy', kind: 'node', label: 'Deploy', name: 'Deploy into validated weakness', why: 'The checkpoint. Ballast deploys into Torque during drawdowns that momentum and the thesis still support, subject to the −20 percent freeze: a position 20 percent or more below cost gets new capital only after a confirming signal. Deployment spends only what sits above the 15 percent floor.', claim: 'Weakness must be validated before it is bought.', concept: 'Rotation', link: '/part-5-portfolio-construction-position-management#ballast' },
      { id: 'recover', kind: 'node', label: 'Participate in recovery', name: 'Participate in recovery', why: 'The reserve that bought the drawdown now rides the recovery, and the next run sets up the next harvest.', claim: 'The cycle pays in both directions.', concept: 'Rotation', link: '/part-5-portfolio-construction-position-management#ballast' },
    ],
    mobileTapTargets: ['harvest', 'rebuild', 'wait', 'deploy', 'recover'],
    implementationNotes: 'governanceLoop reuse (dl-tripwire-loop pattern) with the deploy station as the governed checkpoint. Rotation runs Torque → Ballast on the harvest and Ballast → Torque on the deploy; the 15% floor is never breached, so the rebuild refills toward the 20–35% working range. Bitcoin deliberately absent from the loop, stated in the caution and explainer, mirroring Part 3.',
  },

  {
    chartId: 'p5-earnings-window', idx: 'P5-05', group: 'part-5', intendedPlacement: 'part-5',
    experienceRole: 'mechanism',
    claimStack: {
      primaryClaim: 'The framework cuts exposure before a binary event, and the position earns its size back afterward',
      primaryClaimNote: 'earnings are idiosyncratic risk, not a verdict on the thesis',
      visualProof: 'A 10 percent position held through the blackout, trimmed to the 3 percent cap in one step at T-5, held there through the report and the assessment days, then splitting into three branches: rebuild, stay reduced, or exit',
      interactionRole: 'Hover the path or a branch to read the rule that governs that segment',
      readerAction: 'Follow the trim at T-5 into the report, then compare the three paths out of the assessment window',
      caution: 'The dashboard flags a position above the 3% cap in the days before its report. It counts calendar days, not trading days, so the flag can arrive a trading day or two after T-5; start the trim from the earnings calendar instead of waiting for the flag. It trims nothing: the trim is yours, and so is the T-21 to T-6 initiation blackout (as of September 2026)',
    },
    status: 'implemented', wiredPublic: true,
    title: 'Conviction Does Not Eliminate Binary Risk', setupLine: 'A 10% position walks the earnings protocol: trim · observe · assess · re-earn',
    claimLabel: 'PART 5 · EARNINGS WINDOW',
    frameworkClaim: 'Earnings can move a position 10–30% without changing the long-term thesis. The framework cuts exposure before the report and lets the position earn its size back after the evidence arrives.',
    readerTakeaway: 'Trim the event risk. Re-underwrite the thesis. Then earn the size again.',
    chartType: 'Event timeline: allocation trimmed to the 3% cap in one step at T-5 and held through T+0, then branching into rebuild, hold-reduced, or exit after the assessment window.',
    visualDataMode: 'conceptual', disclosure: 'Conceptual protocol path · The 3% cap, the window boundaries and the branch rules are Part 5 doctrine; the 10% starting position is illustrative', footerCta: 'View framework basis',
    sources: [
      { provider: 'ACF · Part 5', label: 'Rule stated in Part 5 · Earnings proximity: cap the binary event', role: 'verifies-concept', url: '/part-5-portfolio-construction-position-management#management' },
      { provider: 'ACF dashboard', label: 'Earnings flag on a position above the 3 percent cap as its report nears, counted in calendar days; it trims nothing (software behavior as of September 2026)', role: 'verifies-concept', url: '/framework-in-math#governance-math' },
    ],
    explainerHeadline: 'The calendar sets the trim; the evidence sets the rebuild.',
    explainerBody: 'From T-21 to T-6, no new position opens in a name priced for perfection. At T-5, a position above 3 percent is trimmed to the cap in one step, and the cap holds through the report. T+0 is for watching. T+1 to T+5 is the assessment. From T+6 the position earns its size back: rebuild if the thesis is confirmed, stay at the cap while it is uncertain, exit if the evidence broke. Bitcoin, broad index ETFs, and Ballast at or below 5 percent whose earnings are not thesis-critical are exempt, although the dashboard flags any position above the cap that has a report date on file, exempt or not, and trims none of them (as of September 2026).',
    explainerConcept: 'Event risk',
    concepts: [{ label: 'Earnings protocol', link: '/part-5-portfolio-construction-position-management#management' }, { label: 'Tripwire', link: '/part-5-portfolio-construction-position-management#management' }],
    layout: 'single',
    ariaSummary: 'A timeline from twenty-one trading days before earnings to fifteen days after. The position holds ten percent through the initiation-blackout window, is trimmed to the three percent cap in one step at T-5, and holds the cap through the announcement and the five-day assessment window. From day six it splits into three branches: thesis confirmed rebuilds toward ten percent, adding no more than a quarter of the target a week and reaching eight percent by day fifteen; thesis uncertain stays at three percent; thesis damaged exits to zero. A dashed rule marks the three percent cap.',
    domain: { xMin: -21, xMax: 15, yMin: 0, yMax: 12 }, yUnit: '%',
    xTicks: [{ v: -21, label: 'T−21' }, { v: -5, label: 'T−5' }, { v: 0, label: 'T+0' }, { v: 5, label: 'T+5' }, { v: 15, label: 'T+15' }],
    yTicks: [{ v: 0, label: '0%' }, { v: 3, label: '3%' }, { v: 10, label: '10%' }],
    bands: [
      { id: 'blackout', kind: 'regime', render: 'wash', x0: -21, x1: -6, label: 'initiation blackout · priced for perfection', labelAnchor: 'start' },
      { id: 'compress', kind: 'shock', render: 'pressureField', x0: -5, x1: 0, seed: 47, intensity: 0.55, label: 'cap holds' },
      { id: 'assess', kind: 'regime', render: 'wash', x0: 1, x1: 5, label: 'assess', labelAnchor: 'start' },
    ],
    guides: [{ id: 'cap', y: 3, kind: 'threshold', dash: true, label: '3% earnings cap' }],
    markers: [{ id: 'event', type: 'enso', x: 0, y: 3, r: 11, label: 'results land', labelAnchor: 'middle', labelDy: -16 }],
    series: [
      { key: 'held', tier: 'primary', label: 'Position', pts: p5Earnings.held },
      { key: 'rebuild', tier: 'secondary', label: 'Confirmed · rebuild toward 10%', pts: p5Earnings.rebuild, labelDy: -4 },
      { key: 'hold', tier: 'reference', label: 'Uncertain · stay reduced', pts: p5Earnings.hold, labelDy: 10 },
      { key: 'exit', tier: 'stress', label: 'Damaged · exit', pts: p5Earnings.exit, labelDy: 4 },
    ],
    primaryKey: 'held',
    hoverTargets: [
      { id: 'held', kind: 'series', seriesKey: 'held', label: 'The position', name: 'The governed position', why: 'Ten percent through the blackout window, trimmed to the 3 percent cap in one step at T-5, and held there through the report and the assessment days. Proceeds park in cash or Ballast inside the same account until the rebuild.', claim: 'The trim is on the calendar.', concept: 'Event risk', link: '/part-5-portfolio-construction-position-management#management' },
      { id: 'rebuild', kind: 'series', seriesKey: 'rebuild', label: 'Rebuild', name: 'Thesis confirmed · rebuild', why: 'Results support the thesis, so from T+6 the position earns its size back. Under Part 5’s weekly add cap of a quarter of the target, a rebuild takes two to four weeks for positions sized between about 5 and 15 percent (three weeks for a 10 percent position: 5.5, 8, then 10 percent).', claim: 'A quarter of the target a week.', concept: 'Earnings protocol', link: '/part-5-portfolio-construction-position-management#management' },
      { id: 'hold', kind: 'series', seriesKey: 'hold', label: 'Stay reduced', name: 'Thesis uncertain · stay reduced', why: 'Mixed results keep the position at the cap until the picture clears. Reduced is a position, not a failure.', claim: 'Uncertainty holds the cap.', concept: 'Earnings protocol', link: '/part-5-portfolio-construction-position-management#management' },
      { id: 'exit', kind: 'series', seriesKey: 'exit', label: 'Exit', name: 'Thesis damaged · exit', why: 'The results broke a core assertion of the thesis, so the position goes in full, whatever the loss, with no averaging down. A falling price alone would not trigger this; broken evidence does.', claim: 'Broken evidence ends the position.', concept: 'Tripwire', link: '/part-5-portfolio-construction-position-management#management' },
      { id: 'event', kind: 'marker', label: 'T+0', name: 'T+0 · observe', why: 'No action on the announcement itself. The market needs time to process the news, and a first-day reaction is not yet evidence.', claim: 'Observe, then assess.', concept: 'Event risk', link: '/part-5-portfolio-construction-position-management#management' },
    ],
    mobileTapTargets: ['held', 'rebuild', 'hold', 'exit', 'event'],
    implementationNotes: 'single-layout reuse: a step path with regime/pressure window bands and three post-assessment branch series. The trim to the 3% cap is one step at T-5 (x=-5), with an x=-4 anchor so the smoothed hover overlay stays on the cap. The rebuild adds at most 2.5 points per trading week from T+6 (5.5% at T+10, 8% at T+15). The 3% cap guide and the T-window boundaries are Part 5 doctrine; the Part 5 protocol table stays adjacent as the exact-value companion.',
  },

  {
    chartId: 'p5-momentum-gate', idx: 'P5-06', group: 'part-5', intendedPlacement: 'part-5',
    experienceRole: 'diagram',
    claimStack: {
      primaryClaim: 'Full size needs three momentum confirmations, and losing all three is an exit even at a high score',
      visualProof: 'A high-conviction position enters a gauntlet of three gates (absolute trend, relative performance, breadth), with the surviving band thinning at each break until only fully confirmed positions reach full sizing',
      interactionRole: 'Hover a gate to read its question; hover the entering position to read the count-based action ladder',
      readerAction: 'Trace the band through the three gates, then count the breaks to read the action',
      caution: 'Doctrine gauntlet; the action ladder is the Part 5 protocol. The dashboard does not yet measure the three dimensions; it watches stress across your holdings through a confluence tripwire: flag, hedge, then a displayed 25% Torque-trim playbook it does not execute (as of September 2026)',
    },
    status: 'implemented', wiredPublic: true,
    title: 'Conviction Requires Market Confirmation', setupLine: 'Absolute trend, relative performance, and breadth decide how much size a thesis can carry',
    claimLabel: 'PART 5 · MOMENTUM FILTER',
    frameworkClaim: 'A thesis can be right and still be a poor allocation today. Full size needs the market to confirm it in three places: the position’s own trend, its performance against the alternatives, and the breadth of the names around it.',
    readerTakeaway: 'Re-entry is allowed. Unbounded opportunity cost is not.',
    chartType: 'Three-gate momentum gauntlet: conviction enters, each broken dimension thins eligible sizing, and all three broken is the exit tripwire. The action depends on the count of breaks, not on which gate breaks.',
    visualDataMode: 'conceptual', disclosure: DISCLOSURE.conceptual, footerCta: 'View framework basis',
    sources: [
      { provider: 'ACF · Part 5', label: 'Rule stated in Part 5 · Momentum: conviction requires confirmation', role: 'verifies-concept', url: '/part-5-portfolio-construction-position-management#management' },
      { provider: 'ACF dashboard', label: 'Momentum Death tripwire reports unavailable; the cohort confluence tripwire escalates from a flag to hedging only to a displayed 25 percent Torque-trim playbook it does not execute (software behavior as of September 2026)', role: 'verifies-concept', url: '/framework-in-math#governance-math' },
    ],
    explainerHeadline: 'The exit is the last rung of a ladder.',
    explainerBody: 'None broken: full sizing per the CIS band. One broken: reduce sizing 25 to 30 percent and monitor closely. Two broken: watch status, minimal new exposure. All three broken: exit, even if the CIS score is still high. Gate order is illustrative; the action depends on how many dimensions break. The exit records that the market is not validating the thesis today, and re-entry is permitted once momentum repairs. The dashboard does not yet measure these three dimensions (as of September 2026), so for now the count is yours to keep.',
    explainerConcept: 'Momentum filter',
    concepts: [{ label: 'Momentum filter', link: '/part-5-portfolio-construction-position-management#management' }, { label: 'Tripwire', link: '/part-5-portfolio-construction-position-management#management' }],
    layout: 'gate',
    ariaSummary: 'A validation gauntlet. A high-conviction position enters from the left and passes three gates: absolute momentum, its own trend measured from the fifty-two-week high; relative momentum, its performance against the sector and the market; and breadth, participation across related names. The surviving band thins at each gate, and only a position confirmed on all three reaches full sizing. Gate order is illustrative; the action depends on how many dimensions break: one broken reduces sizing twenty-five to thirty percent, two put the position on watch with minimal new exposure, and all three are an exit even at a high score.',
    gate: {
      nodes: [
        { id: 'conviction', kind: 'entry', label: 'High-CIS position', sub: 'conviction, unconfirmed' },
        { id: 'absolute', kind: 'gate', label: 'Absolute', sub: 'holding its own trend?' },
        { id: 'relative', kind: 'gate', label: 'Relative', sub: 'beating the alternatives?' },
        { id: 'breadth', kind: 'gate', label: 'Breadth', sub: 'related names joining in?' },
        { id: 'confirmed', kind: 'exit', label: 'Full sizing', sub: 'all three confirmed' },
      ],
    },
    primaryKey: 'confirmed',
    hoverTargets: [
      { id: 'conviction', kind: 'node', label: 'The position', name: 'A high-CIS position · the action ladder', why: 'The score has already judged quality; the gates ask whether the market is confirming it today. The action counts broken dimensions, whichever they are. None broken: full sizing per the CIS band. One broken: reduce sizing 25 to 30 percent and monitor closely. Two broken: watch status, minimal new exposure. All three broken: exit, even if the CIS score is still high.', claim: 'Count the breaks.', concept: 'Momentum filter', link: '/part-5-portfolio-construction-position-management#management' },
      { id: 'absolute', kind: 'node', label: 'Absolute', name: 'Gate 1 · absolute momentum', why: 'Is the position holding its own trend? Within 10 percent of its 52-week high is healthy, 25 percent or more below is a correction, and 40 percent or more below is severe distress.', claim: 'Measured from the 52-week high.', concept: 'Momentum filter', link: '/part-5-portfolio-construction-position-management#management' },
      { id: 'relative', kind: 'node', label: 'Relative', name: 'Gate 2 · relative momentum', why: 'Is it keeping up with its sector and with the market? This gate separates a problem with the company from a problem with the tape.', claim: 'Company or tape?', concept: 'Momentum filter', link: '/part-5-portfolio-construction-position-management#management' },
      { id: 'breadth', kind: 'node', label: 'Breadth', name: 'Gate 3 · breadth', why: 'Are related names making new highs too, or is one name carrying the move alone? Broad participation confirms fundamental support; narrowing leadership warns of exhaustion.', claim: 'Narrow leadership is a warning.', concept: 'Tripwire', link: '/part-5-portfolio-construction-position-management#management' },
      { id: 'confirmed', kind: 'node', label: 'Full sizing', name: 'Full eligible sizing', why: 'All three dimensions confirmed: the position carries its full CIS-band allocation. You check the three again at every weekly review, so full size is a state the position keeps earning.', claim: 'Full size is a confirmed state.', concept: 'Momentum filter', link: '/part-5-portfolio-construction-position-management#management' },
    ],
    mobileTapTargets: ['conviction', 'absolute', 'relative', 'breadth', 'confirmed'],
    implementationNotes: 'gate-layout reuse with three gates (renderer generalized from the fixed four-gate death map; the p2 six-node chart is byte-preserved via the legacy branch). The action ladder is count-based, so it rides the entry node’s hover, never a gate; each gate hover carries only its question and thresholds. The renderer draws threads ending at gates, so the explainer and ariaSummary carry the line "Gate order is illustrative; the action depends on how many dimensions break." The Part 5 action-ladder table stays adjacent as the exact-value companion.',
  },

  {
    chartId: 'p5-force-channels', idx: 'P5-08', group: 'part-5', intendedPlacement: 'part-5',
    experienceRole: 'diagram',
    claimStack: {
      primaryClaim: 'High conviction in one regime force can still be diversified, across the force’s distinct economic channels',
      visualProof: 'One structural force fanning into seven channels (compute, memory and networking, power generation, grid equipment, cooling, datacenter owners and builders, physical security), each a different bottleneck with different customers, revenue models and failure modes',
      interactionRole: 'Hover a channel to read the bottleneck it owns and how its failure mode differs',
      readerAction: 'Compare any two channels and name what fails in one but not the other',
      caution: 'The seven channels are examples of how one force can be expressed; the list is illustrative, not exhaustive',
    },
    status: 'implemented', wiredPublic: true,
    title: 'One Regime Force. Multiple Economic Expressions.', setupLine: 'One thesis, seven businesses that fail in different ways',
    claimLabel: 'PART 5 · REGIME FORCE',
    frameworkClaim: 'You can diversify without abandoning the thesis: own different bottlenecks, customers, revenue models and failure modes inside the same regime force.',
    readerTakeaway: 'Diversify the pathway. Preserve the thesis.',
    chartType: 'One-force fan: a single regime force expressed through seven economically distinct channels.',
    visualDataMode: 'conceptual', disclosure: 'Conceptual methodology illustration · AI infrastructure is the example force, not a recommendation', footerCta: 'View framework basis',
    sources: [
      { provider: 'ACF · Part 5', label: 'Rule stated in Part 5 · Allocate by force, not by sector', role: 'verifies-concept', url: '/part-5-portfolio-construction-position-management#forces' },
      { provider: 'ACF · Part 2', label: 'Rule stated in Part 2 · Identification, evaluation, and governance', role: 'verifies-concept', url: '/part-2-lineage-macro-thesis#macro-thesis' },
    ],
    explainerHeadline: 'Seven tickers in one industry is one trade wearing seven names.',
    explainerBody: 'Seven semiconductor names look diversified by ticker and still ride one industry’s cycle. The same thesis expressed through compute, memory and networking, power, grid equipment, cooling, datacenter owners and builders, and security owns different bottlenecks, with different customers, revenue models and ways to fail. Part 5’s sector caps still bind: 30 percent for any one sector, 50 percent for the top two combined.',
    explainerConcept: 'Regime force',
    concepts: [{ label: 'Macro thesis', link: '/part-2-lineage-macro-thesis#macro-thesis' }, { label: 'Regime force', link: '/part-5-portfolio-construction-position-management#forces' }],
    layout: 'flow', flowHeight: 560,
    ariaSummary: 'A fan diagram. One node on the left, an illustrative regime force labeled AI infrastructure, connects to seven channel nodes on the right: compute, memory and networking, power generation, grid equipment, cooling, datacenter owners and builders, and physical security and defense. Each channel is a distinct bottleneck within the same regime force.',
    flow: {
      stages: [
        { id: 'f', label: 'Regime force', nodes: [{ id: 'force', label: 'AI infrastructure', sub: 'illustrative regime force' }] },
        { id: 'c', label: 'Distinct economic channels', nodes: [
          { id: 'compute', label: 'Compute', sub: 'accelerators & fabs' },
          { id: 'memory', label: 'Memory & networking', sub: 'bandwidth bottleneck' },
          { id: 'power', label: 'Power generation', sub: 'electrons as constraint' },
          { id: 'grid', label: 'Grid equipment', sub: 'transmission & transformers' },
          { id: 'cooling', label: 'Cooling', sub: 'thermal density' },
          { id: 'build', label: 'Datacenters', sub: 'REITs & builders' },
          { id: 'security', label: 'Security & defense', sub: 'hardening the buildout' },
        ] },
      ],
    },
    primaryKey: 'force',
    hoverTargets: [
      { id: 'force', kind: 'node', label: 'The force', name: 'The regime force', why: 'One regime force, here the AI infrastructure buildout, used to illustrate the method. You hold the thesis once and spread its expression across businesses that fail in different ways.', claim: 'One thesis, many pathways.', concept: 'Macro thesis', link: '/part-2-lineage-macro-thesis#macro-thesis' },
      { id: 'compute', kind: 'node', label: 'Compute', name: 'Compute', why: 'Accelerators and the fabs behind them: usually the most crowded expression and the first to be priced, with design-cycle and competition risk the other channels do not share.', claim: 'The obvious channel is the crowded one.', concept: 'Regime force', link: '/part-5-portfolio-construction-position-management#forces' },
      { id: 'memory', kind: 'node', label: 'Memory & networking', name: 'Memory & networking', why: 'Moving data between processors is its own bottleneck with its own pricing cycle. Its demand tracks compute; its margins follow a cycle of their own.', claim: 'Adjacent is not identical.', concept: 'Regime force', link: '/part-5-portfolio-construction-position-management#forces' },
      { id: 'power', kind: 'node', label: 'Power generation', name: 'Power generation', why: 'Datacenters run on electricity, and power is increasingly the binding constraint. Generators sell to utilities and hyperscalers, often on multi-year contracts: a different customer and a longer duration than chip buyers.', claim: 'The constraint migrates to power.', concept: 'Regime force', link: '/part-5-portfolio-construction-position-management#forces' },
      { id: 'grid', kind: 'node', label: 'Grid equipment', name: 'Grid equipment', why: 'Transformers and transmission gear sell into utility budgets with long lead times and multi-year backlogs: slower, stickier economics than anything upstream.', claim: 'Backlogs fail differently than benchmarks.', concept: 'Regime force', link: '/part-5-portfolio-construction-position-management#forces' },
      { id: 'cooling', kind: 'node', label: 'Cooling', name: 'Cooling', why: 'Each accelerator generation packs more heat into the same rack, and cooling suppliers win contracts on engineering specification. It is a supplier business with its own customers and its own ways to fail.', claim: 'More heat per rack, more demand for cooling.', concept: 'Regime force', link: '/part-5-portfolio-construction-position-management#forces' },
      { id: 'build', kind: 'node', label: 'Datacenters', name: 'Datacenter owners & builders', why: 'The buildings and the firms that own them: datacenter REITs lease capacity to hyperscalers on multi-year leases, and builders pour the shells. Real-estate and construction-cycle risk rather than silicon-cycle risk.', claim: 'Someone has to own and build the buildings.', concept: 'Regime force', link: '/part-5-portfolio-construction-position-management#forces' },
      { id: 'security', kind: 'node', label: 'Security & defense', name: 'Physical security & defense', why: 'Operators pay to harden what they build, and defense applications of the same technology answer to government budgets with their own cycle.', claim: 'The same force, two different payers.', concept: 'Regime force', link: '/part-5-portfolio-construction-position-management#forces' },
    ],
    mobileTapTargets: ['force', 'compute', 'memory', 'power', 'grid', 'cooling', 'build', 'security'],
    implementationNotes: 'flow-layout reuse (1→7 fan) with a spec-driven flowHeight (560) so seven channel nodes breathe. The build node covers datacenter owners (REITs) and builders, matching the Part 5 prose and the case study’s datacenter REIT. Framed as a methodology illustration; the sector caps stay in the adjacent Part 5 table.',
  },

  {
    chartId: 'p5-wrapper-compounding', idx: 'P5-09', group: 'part-5', intendedPlacement: 'part-5',
    experienceRole: 'comparison',
    claimStack: {
      primaryClaim: 'The same asset earning the same return ends about 2× apart after 30 years, depending only on the wrapper',
      visualProof: 'Two compounding curves from the same $100,000: 10% a year tax-free against 7.5% after gains are realized every year at a 25% blended rate. They separate slowly, then widely: about $875,000 against about $1,745,000 at year 30',
      interactionRole: 'Hover a curve or a checkpoint to read the values at 10, 20, and 30 years',
      readerAction: 'Compare the gap at year 10 with the gap at year 30',
      caution: 'A constant-return illustration of tax drag at federal, illustrative rates: the taxable account realizes every gain every year, and Roth withdrawals are assumed qualified, which makes them tax-free under current law',
    },
    status: 'implemented', wiredPublic: true,
    title: 'Tax Drag Compounds Too', setupLine: 'Identical asset, identical return, different wrapper: $100,000 over 30 years',
    claimLabel: 'PART 5 · WRAPPER FRICTION',
    frameworkClaim: 'Hold the same asset at the same return in two wrappers and the outcomes can end far apart. A 2.5-point annual drag, compounded for thirty years, roughly halves the result.',
    readerTakeaway: 'Wrapper placement is portfolio construction.',
    chartType: 'Two computed compounding curves ($100k at 10% tax-free vs 7.5% after tax) with 10/20/30-year checkpoints and the terminal wedge labeled.',
    visualDataMode: 'simulation',
    disclosure: DISCLOSURE.simulation, footerCta: 'View methodology',
    sources: [
      { provider: 'Author calculation', label: '$100,000 × 1.10^t (tax-free) vs × 1.075^t (10% pre-tax return, all gains realized every year at a 25% blended rate); 10y $259k vs $206k · 20y $673k vs $425k · 30y ≈$1,745k vs ≈$875k', role: 'methodology' },
      { provider: 'ACF · Part 4', label: 'Rule stated in Part 4 · Reserving Roth for Torque', role: 'verifies-concept', url: '/part-4-tax-architecture-roc-strategy#roth' },
    ],
    explainerHeadline: 'A 2.5-point annual haircut becomes an $870,000 wedge.',
    explainerBody: 'Both paths hold the same asset earning 10 percent a year before tax. The taxable path realizes its gains every year at a 25 percent blended rate, so it compounds at 7.5 percent; the Roth path compounds the full 10. The gap is about $53,000 at year 10 and about $248,000 at year 20. At year 30 the taxable path reaches about $875,000 and the Roth about $1,745,000, a difference of roughly $870,000 from wrapper placement alone. Part 4 works the other case, a gain realized once at sale.',
    explainerConcept: 'Wrapper edge',
    concepts: [{ label: 'Wrapper edge', link: '/part-4-tax-architecture-roc-strategy#edge' }, { label: 'Survivable compounding', link: '/part-1-foundation#manifesto' }],
    layout: 'single',
    ariaSummary: 'Two curves start together at one hundred thousand dollars in year zero. The tax-free curve compounds at ten percent and reaches about one point seven four five million dollars by year thirty. The after-tax curve compounds at seven and a half percent and reaches about eight hundred seventy-five thousand dollars. Checkpoints mark both values at years ten and twenty; the shaded gap between the curves is the wrapper drag, roughly eight hundred seventy thousand dollars at year thirty.',
    domain: { xMin: 0, xMax: 30, yMin: 0, yMax: 1850000 }, yUnit: '$',
    xTicks: [{ v: 0, label: 'year 0' }, { v: 10, label: '10y' }, { v: 20, label: '20y' }, { v: 30, label: '30y' }],
    yTicks: [{ v: 0, label: '$0' }, { v: 500000, label: '$0.5M' }, { v: 1000000, label: '$1.0M' }, { v: 1500000, label: '$1.5M' }],
    series: [
      { key: 'taxable', tier: 'secondary', label: 'Taxable · ≈$875k', pts: p5Wrapper.taxable, labelDy: 10 },
      { key: 'roth', tier: 'primary', label: 'Tax-free · ≈$1.745M', pts: p5Wrapper.roth },
    ],
    areas: [{ id: 'drag', topKey: 'roth', botKey: 'taxable', kind: 'gap', xFrom: 0, label: 'wrapper drag · ≈$870,000 by year 30' }],
    markers: [
      { id: 'y10', type: 'enso', x: 10, y: R(valueAt(p5Wrapper.roth, 10)), r: 9, label: '10y · $259k vs $206k', labelAnchor: 'end', labelDy: -12 },
      { id: 'y20', type: 'enso', x: 20, y: R(valueAt(p5Wrapper.roth, 20)), r: 9, label: '20y · $673k vs $425k', labelAnchor: 'start', labelDy: -14 },
    ],
    guides: [], levels: [], notes: [],
    primaryKey: 'roth',
    hoverTargets: [
      { id: 'roth', kind: 'series', seriesKey: 'roth', label: 'Tax-free', name: 'Tax-free (Roth) · full 10% compounds', why: 'Nothing is paid along the way, so every year compounds the full return. With qualified withdrawals, the ≈$1,745,000 at year 30 is all yours: about twice the taxable result from the same asset.', claim: 'Every year compounds in full.', concept: 'Wrapper edge', link: '/part-4-tax-architecture-roc-strategy#edge' },
      { id: 'taxable', kind: 'series', seriesKey: 'taxable', label: 'Taxable', name: 'Taxable · 7.5% after tax on yearly gains', why: 'Paying a 25 percent blended rate on each year’s gains cuts the compounding rate by 2.5 points, from 10 to 7.5 percent. Small in any one year, it costs about $870,000 by year 30, when the taxable account ends near $875,000.', claim: 'The drag compounds against you.', concept: 'Wrapper edge', link: '/part-4-tax-architecture-roc-strategy#edge' },
      { id: 'y10', kind: 'marker', label: '10-year checkpoint', name: 'Year 10 · $259k vs $206k', why: 'A decade in, the gap is real but modest: about $53,000. At this point wrapper placement still looks like housekeeping.', claim: 'Early, the drag hides.', concept: 'Wrapper edge', link: '/part-4-tax-architecture-roc-strategy#edge' },
      { id: 'y20', kind: 'marker', label: '20-year checkpoint', name: 'Year 20 · $673k vs $425k', why: 'Two decades in, the gap is about $248,000 and widening every year; the taxable account now holds about 63 percent of the Roth result.', claim: 'By year 20 the gap is a quarter of a million dollars.', concept: 'Wrapper edge', link: '/part-4-tax-architecture-roc-strategy#edge' },
    ],
    mobileTapTargets: ['roth', 'taxable', 'y10', 'y20'],
    implementationNotes: 'single-layout reuse; deterministic generator (no noise), so the exhibit is a simulation computed from stated inputs (visualDataMode simulation, methodology source states the inputs). Linear axis from $0; the terminal wedge is the gap area label. Cross-referenced to Part 4’s Tax Wedge exhibit (p4-tax-wedge, the gain-realized-once case) rather than duplicating its argument.',
  },

  {
    chartId: 'p5-liquidity-throttle', idx: 'P5-07', group: 'part-5', intendedPlacement: 'part-5',
    experienceRole: 'diagram',
    claimStack: {
      primaryClaim: 'When correlation rises, the framework reduces exposure to the shared failure mode and makes no call on direction',
      visualProof: 'A four-station governed cycle (normal rules, stress recognized, throttle applied, repair confirmed) with the throttle as the governed checkpoint and a return arc that resumes standard positioning only after two or more stable weeks',
      interactionRole: 'Hover a station to read its indicators and the capital response it calls for',
      readerAction: 'Follow the cycle from the stress signals through the throttle to the confirmation-gated return',
      caution: 'Doctrine protocol, not market timing. The dashboard watches the VIX and credit spreads through its macro tripwires and flags average pairwise correlation above 0.7 across all non-cash holdings; the Torque-only reading and the throttle actions are yours (as of September 2026)',
    },
    status: 'implemented', wiredPublic: true,
    title: 'When Correlation Rises, Diversification Shrinks', setupLine: 'Positions that looked independent can become one trade when liquidity drains',
    claimLabel: 'PART 5 · REGIME THROTTLE',
    frameworkClaim: 'When liquidity drains, positions that looked independent can start moving as one trade. The framework responds by reducing exposure to what they share, without calling the market’s next move.',
    readerTakeaway: 'When your positions start moving as one, size them as one.',
    chartType: 'Four-state throttle cycle: normal → stressed → throttle → repair, with a confirmation-gated return to standard rules.',
    visualDataMode: 'conceptual', disclosure: DISCLOSURE.conceptual, footerCta: 'View framework basis',
    sources: [
      { provider: 'ACF · Part 5', label: 'Rule stated in Part 5 · Liquidity and correlation: throttle the regime', role: 'verifies-concept', url: '/part-5-portfolio-construction-position-management#management' },
      { provider: 'ACF dashboard', label: 'Macro tripwires on the VIX (watch 20, caution 25, critical 35) and high-yield credit spreads; the Correlation Spike tripwire flags average pairwise correlation above 0.70 across non-cash holdings and reports unavailable until every holding has 60 daily returns (software behavior as of September 2026)', role: 'verifies-concept', url: '/framework-in-math#governance-math' },
    ],
    explainerHeadline: 'The stress state has thresholds; the return has a waiting period.',
    explainerBody: 'Three indicators mark the stressed state: the VIX sustained above 25, credit spreads widening, and Torque positions correlating above 0.7. In the throttle you pause new Torque adds, hold posture limits strictly and consider cutting gross exposure by 10 to 20 percent. Standard positioning resumes only after the indicators have been normal for two weeks or more; the waiting period is part of the rule. The dashboard watches the VIX and credit spreads and flags average correlation above 0.7 across all your non-cash holdings, a broader reading than Torque alone; the throttle itself is yours to run (as of September 2026).',
    explainerConcept: 'Regime throttle',
    concepts: [{ label: 'Correlation instability', link: '/part-5-portfolio-construction-position-management#management' }, { label: 'Tripwire', link: '/part-5-portfolio-construction-position-management#management' }],
    layout: 'governanceLoop',
    ariaSummary: 'A governed cycle of four stations. Normal: correlations contained, liquidity functioning, standard sizing rules. Stressed: the VIX sustained above twenty-five, credit spreads widening, Torque correlation above zero point seven. Throttle, the governed checkpoint: pause new adds, hold posture limits strictly, and consider cutting gross exposure ten to twenty percent. Repair: indicators normalize. A return arc labeled stable two-plus weeks closes the cycle back to normal rules.',
    governanceLoop: {
      governorId: 'throttle',
      returnLabel: 'stable 2+ weeks → resume standard positioning',
      nodes: [
        { id: 'normal', label: 'Normal', sub: 'standard sizing rules' },
        { id: 'stressed', label: 'Stressed', sub: 'VIX >25 · spreads · corr >0.7' },
        { id: 'throttle', label: 'Throttle', sub: 'pause adds · consider cutting gross 10–20%' },
        { id: 'repair', label: 'Repair', sub: 'indicators normalize' },
      ],
    },
    primaryKey: 'throttle',
    hoverTargets: [
      { id: 'normal', kind: 'node', label: 'Normal', name: 'Normal · standard rules', why: 'Correlations contained, liquidity functioning. Diversification across positions is doing its job, so the standard sizing rules apply unchanged.', claim: 'Normal is a measured state.', concept: 'Regime throttle', link: '/part-5-portfolio-construction-position-management#management' },
      { id: 'stressed', kind: 'node', label: 'Stressed', name: 'Stressed · the indicators fire', why: 'The VIX sustained above 25, credit spreads widening, Torque positions correlating above 0.7. Diversification is failing while every individual thesis still looks intact.', claim: 'Stress is declared by thresholds.', concept: 'Correlation instability', link: '/part-5-portfolio-construction-position-management#management' },
      { id: 'throttle', kind: 'node', label: 'Throttle', name: 'Throttle · the governed response', why: 'Pause new Torque adds, hold posture limits strictly, and consider cutting gross exposure 10 to 20 percent. The response targets the exposure your positions share and makes no call on market direction.', claim: 'Cut the shared exposure; keep the theses.', concept: 'Regime throttle', link: '/part-5-portfolio-construction-position-management#management' },
      { id: 'repair', kind: 'node', label: 'Repair', name: 'Repair · confirmation-gated', why: 'Normal readings are not enough on their own. They must stay normal for two weeks or more before standard positioning resumes.', claim: 'The return waits for confirmation.', concept: 'Regime throttle', link: '/part-5-portfolio-construction-position-management#management' },
    ],
    mobileTapTargets: ['normal', 'stressed', 'throttle', 'repair'],
    implementationNotes: 'governanceLoop reuse with the throttle station as checkpoint and the 2+ week confirmation carried on the return arc label. Thresholds are the Part 5 monitoring protocol. The gross cut is optional in doctrine ("consider"), so the node and hovers say "consider".',
  },

  {
    chartId: 'p5-change-hierarchy', idx: 'P5-10', group: 'part-5', intendedPlacement: 'part-5',
    experienceRole: 'diagram',
    claimStack: {
      primaryClaim: 'Calibrating a parameter, documenting an override and touching doctrine are three different acts with three different meanings',
      visualProof: 'A proposed change routing to exactly one of three levels: doctrine, whose change means the framework is abandoned; parameters, adjustable from their documented defaults for stated reasons; overrides, temporary and time-bounded with reversion conditions',
      interactionRole: 'Hover a level to read what lives there and what changing it means',
      readerAction: 'Route a change you are considering to its level before making it',
      caution: 'The three levels and their examples are stated in Part 5’s change-governance section',
    },
    status: 'implemented', wiredPublic: true,
    title: 'Know What You Are Changing', setupLine: 'Some changes calibrate the system; some suspend a rule; some abandon the framework',
    claimLabel: 'PART 5 · CHANGE GOVERNANCE',
    frameworkClaim: 'A doctrine change means abandoning the framework. A parameter change means calibrating it. An override means a temporary, documented deviation for stated reasons.',
    readerTakeaway: 'Silent drift is not an override.',
    chartType: 'Change-routing diagram: one proposed change classified into doctrine, parameters, or overrides, each with a different meaning.',
    visualDataMode: 'conceptual', disclosure: DISCLOSURE.conceptual, footerCta: 'View framework basis',
    sources: [
      { provider: 'ACF · Part 5', label: 'Rule stated in Part 5 · Doctrine, parameters, overrides', role: 'verifies-concept', url: '/part-5-portfolio-construction-position-management#governance' },
    ],
    explainerHeadline: 'The hierarchy exists so drift has nowhere to hide.',
    explainerBody: 'Doctrine defines what the framework is: three-posture classification, the Bitcoin backbone, momentum overriding conviction. Break it and you are no longer running ACF. Parameters calibrate it: sizing bands, momentum thresholds, the level of the earnings cap, each adjustable from its documented default for a reason you can state. Overrides are deliberate, temporary deviations, written down and time-bounded, with the conditions for reversion stated up front. Anything else is drift.',
    explainerConcept: 'Change governance',
    concepts: [{ label: 'Change governance', link: '/part-5-portfolio-construction-position-management#governance' }, { label: 'Doctrine', link: '/part-5-portfolio-construction-position-management#governance' }],
    layout: 'flow',
    ariaSummary: 'A routing diagram. One node on the left, a proposed change, connects to three levels on the right. Doctrine: defines the framework; changing it means you are no longer implementing ACF. Parameters: calibrate implementation; adjustable from their documented defaults, with a stated reason, without changing what the framework is. Overrides: temporary, explicit, reasoned, time-bounded, with reversion conditions.',
    flow: {
      stages: [
        { id: 's1', label: 'The adjustment', nodes: [{ id: 'change', label: 'A proposed change', sub: 'name what it touches' }] },
        { id: 's2', label: 'Its level and its meaning', nodes: [
          { id: 'doctrine', label: 'Doctrine', sub: 'change = abandonment' },
          { id: 'parameters', label: 'Parameters', sub: 'change = calibration' },
          { id: 'overrides', label: 'Overrides', sub: 'change = documented deviation' },
        ] },
      ],
    },
    primaryKey: 'doctrine',
    hoverTargets: [
      { id: 'change', kind: 'node', label: 'The change', name: 'A proposed change', why: 'Every adjustment routes to exactly one level before it is made. Classifying it first is what separates governance from improvisation.', claim: 'Classify before you change.', concept: 'Change governance', link: '/part-5-portfolio-construction-position-management#governance' },
      { id: 'doctrine', kind: 'node', label: 'Doctrine', name: 'Doctrine · non-negotiable', why: 'Three-posture classification, tax-wrapper placement, the separately governed Bitcoin backbone, momentum overriding conviction, Hype stop-losses that no reclassification can dodge, and hard Ballast criteria. Changing any of these abandons ACF.', claim: 'You are no longer implementing ACF.', concept: 'Doctrine', link: '/part-5-portfolio-construction-position-management#governance' },
      { id: 'parameters', kind: 'node', label: 'Parameters', name: 'Parameters · adjustable with a reason', why: 'CIS component weights, sizing bands, momentum thresholds, the level of the earnings cap (the cap itself is doctrine), concentration limits, the Ballast aggregate ceiling: each adjustable from its documented default, with a stated reason, without changing what the framework is.', claim: 'You are calibrating ACF.', concept: 'Change governance', link: '/part-5-portfolio-construction-position-management#governance' },
      { id: 'overrides', kind: 'node', label: 'Overrides', name: 'Overrides · temporary and documented', why: 'Conscious deviations from default parameters: intentional, documented, time-bounded, consistent with the framework’s objectives, with explicit conditions for reversion. The framework remains the baseline.', claim: 'You are deviating, temporarily and on the record.', concept: 'Change governance', link: '/part-5-portfolio-construction-position-management#governance' },
    ],
    mobileTapTargets: ['change', 'doctrine', 'parameters', 'overrides'],
    implementationNotes: 'flow-layout reuse (1→3 routing). The three levels are peers on the routing stage; meaning is carried in the sub-labels so the distinction survives without hover. Parameters are described as adjustable from documented defaults because Part 5 documents defaults, not ranges, for most of them.',
  },

  /* ── PART 6 · CONVEXITY & FRAMEWORK INTEGRITY SCORING ──────────────────── */
  {
    chartId: 'p6-cis-composition', idx: 'P6-01', group: 'part-6', intendedPlacement: 'part-6',
    experienceRole: 'evidence',
    claimStack: {
      primaryClaim: 'CIS weighs four components, and at the reference weights convexity carries the most because it is what the framework is built to capture',
      visualProof: 'A weighted donut at the reference weights: Convexity & Optionality at 40 percent, Risk & Fragility and Macro Alignment at 25 each, Execution & Sentiment at 10, together making one 0–100 position score',
      interactionRole: 'Hover a segment to read what it measures and, for Risk, which direction is good',
      readerAction: 'Note that the largest slice is upside structure, and that a higher Risk score means lower fragility',
      caution: 'The weights move with the thesis you select: under the Capital Preservation profile, Risk (35 percent) outweighs Convexity (30), and under Conflict Economy the first three tie at 30 (as of September 2026)',
    },
    status: 'implemented', wiredPublic: true,
    title: 'CIS Measures the Position, Not the Portfolio', setupLine: 'One asset, four components, no portfolio context',
    claimLabel: 'PART 6 · CIS COMPOSITION',
    frameworkClaim: 'CIS asks how attractive an asset is as a convex opportunity under radical uncertainty, judged on upside structure, survivability, regime fit and execution, and blind to whatever else you hold.',
    readerTakeaway: 'Quality first. Portfolio construction later.',
    chartType: 'Weighted composition donut of the four CIS components at the reference weights (C 40 · R 25 · M 25 · E 10).',
    visualDataMode: 'conceptual', disclosure: 'Conceptual composition · Drawn at the reference weights. The dashboard’s scores use the active thesis profile’s weights (each within 0.10 of these, renormalized) and move weight from Macro to Convexity and Risk when macro evidence is thin. The four-component structure is doctrine', footerCta: 'View framework basis',
    sources: [
      { provider: 'ACF dashboard', label: 'Reference weights C40/R25/M25/E10; thesis-profile bounds ±0.10, floor 0.05, ceiling 0.50, renormalized; macro weight cut to 60 or 80 percent at low or medium macro confidence (software behavior as of September 2026)', role: 'verifies-concept', url: '/framework-in-math#cis-math' },
      { provider: 'ACF · Part 6', label: 'Rule stated in Part 6 · CIS: scoring the position, not the portfolio', role: 'verifies-concept', url: '/part-6-convexity-framework-integrity-scoring#cis' },
    ],
    explainerHeadline: 'Upside structure carries the score. The other three keep it honest.',
    explainerBody: 'At the reference weights, convexity and optionality take 40 percent, because convexity is what the framework selects for. Risk and fragility score survivability rather than volatility, so a higher score means a sturdier position. Macro alignment reads whether the current regime reinforces or resists the opportunity, against your Part 2 thesis. Execution and sentiment weigh least because execution follows quality. A thesis profile can move each weight by up to 0.10, and when macro evidence is thin the dashboard shifts weight from Macro to Convexity and Risk. Diversification, concentration and correlation with your other holdings are left out on purpose: FIS scores concentration, a portfolio tripwire watches correlation, and Parts 4 and 5 govern the rest.',
    explainerConcept: 'CIS',
    concepts: [{ label: 'CIS', link: '/part-6-convexity-framework-integrity-scoring#cis' }, { label: 'Convexity', link: '/part-2-lineage-macro-thesis#lineage' }],
    layout: 'radial',
    ariaSummary: 'A composition donut of the Convexity Integrity Score at its reference weights. Convexity and optionality fill 40 percent of the ring; risk and fragility 25 percent, where a higher score means greater survivability; macro alignment 25 percent; execution and sentiment 10 percent. The center is labeled CIS, a position-level score from 0 to 100.',
    radial: {
      variant: 'donut', centerLabel: 'CIS · 0–100',
      caption: 'Position quality only. FIS scores the portfolio.',
      segments: [
        { id: 'c', label: 'Convexity & Optionality', value: 0.40, tier: 'primary', sub: 'TAM headroom · optionality · catalysts · scarcity' },
        { id: 'r', label: 'Risk & Fragility', value: 0.25, tier: 'secondary', sub: 'survivability: higher score, lower fragility' },
        { id: 'm', label: 'Macro Alignment', value: 0.25, tier: 'tertiary', sub: 'regime fit · carry · policy, vs your thesis' },
        { id: 'e', label: 'Execution & Sentiment', value: 0.10, tier: 'reference', sub: 'is reality validating the thesis?' },
      ],
    },
    primaryKey: 'c',
    hoverTargets: [
      { id: 'c', kind: 'segment', label: 'Convexity', name: 'Convexity & Optionality · 40%', why: 'How large can the opportunity become, and how many credible paths lead there? Four sub-scores: TAM headroom (35 points, the largest), optionality (25), catalyst density (20) and scarcity (20). It carries the most weight at the reference split because convexity is what the framework is built to capture; across thesis profiles it runs from 30 to 45 percent.', claim: 'The biggest slice is the point of the score.', concept: 'Convexity', link: '/part-2-lineage-macro-thesis#lineage' },
      { id: 'r', kind: 'segment', label: 'Risk & Fragility', name: 'Risk & Fragility · 25%', why: 'Can the business survive long enough for the thesis to matter? Balance sheet (30 points), business-model fragility (30), correlation with macro factors (20) and tail exposure (20). Scored as survivability, so higher is safer.', claim: 'Higher R means lower fragility.', concept: 'Fragility', link: '/part-1-foundation#manifesto' },
      { id: 'm', kind: 'segment', label: 'Macro Alignment', name: 'Macro Alignment · 25%', why: 'Does the current regime reinforce or resist the opportunity? Regime fit (40 points), carry direction (30) and policy and flow (30), read against your Part 2 thesis. The dashboard’s score also applies small bounded adjustments (at most 4 points on regime fit, 3 on policy, 2 on carry) from current trends in rates, inflation and unemployment.', claim: 'The regime is a scored input.', concept: 'Macro regime', link: '/part-1-foundation#manifesto' },
      { id: 'e', kind: 'segment', label: 'Execution', name: 'Execution & Sentiment · 10%', why: 'Is reality starting to validate the thesis? Execution quality, read from three-month price momentum with a volatility adjustment, and market acceptance, read from trading turnover (thirty-day dollar volume over market value), fifty points each. That is the equity route; funds use expense ratio and assets, and Bitcoin and crypto have their own inputs. It carries the least weight because execution follows quality.', claim: 'Execution confirms; it does not lead.', concept: 'CIS', link: '/part-6-convexity-framework-integrity-scoring#cis' },
    ],
    mobileTapTargets: ['c', 'r', 'm', 'e'],
    implementationNotes: 'radial donut reuse (p4-gross-not-net pattern), drawn at the reference weights C40/R25/M25/E10; thesis-profile weights and the macro-confidence downweight are disclosed in the caution, disclosure, explainer and hovers. The R-direction clarification (higher = safer) rides the segment sub and hover. Delta clamps and scoring routes stay in the page prose.',
  },

  {
    chartId: 'p6-fis-waterfall', idx: 'P6-02', group: 'part-6', intendedPlacement: 'part-6',
    experienceRole: 'mechanism',
    claimStack: {
      primaryClaim: 'FIS is subtractive: every point below 100 is a named, repairable violation',
      visualProof: 'A waterfall from 100 down through five bucket deductions for one example book (allocation 4, governance 1, dead capital 1, concentration 10, complexity 1), landing at 83 in the Strong band above the 70 line',
      interactionRole: 'Hover a deduction to read its bucket, its cap and what it charges for',
      readerAction: 'Follow the score down step by step, then read the band it lands in',
      caution: 'The deductions belong to one example book scored under the framework’s FIS rules. The dashboard’s score does not yet see all of its inputs: nothing sets the momentum-breakdown flag, and the thesis, distribution-type, hold-rationale, remediation-plan and override records you keep on a holding are not passed to it, which in the current build bills every position as undocumented and unclassified (as of September 2026)',
    },
    status: 'implemented', wiredPublic: true,
    title: 'FIS Starts at 100', setupLine: 'Five capped penalty buckets, and every deduction names the rule it breaks',
    claimLabel: 'PART 6 · FIS ATTRIBUTION',
    frameworkClaim: 'FIS starts every portfolio at 100 and charges for each departure from the framework’s construction rules, so every lost point has a name and a price.',
    readerTakeaway: 'Fix the violation, and the points come back once the score can see the fix.',
    chartType: 'Subtractive waterfall from 100 through the five FIS bucket penalties to the resulting score and band.',
    visualDataMode: 'conceptual', disclosure: 'Conceptual diagram · Bucket caps, thresholds and bands follow the FIS rules; the deduction sizes belong to this example only', footerCta: 'View framework basis',
    sources: [
      { provider: 'ACF dashboard', label: 'Five FIS buckets capped at 25/15/15/15/10; governance and dead capital weighted by position share between 0.2 and 12 percent; concentration charges 8/6/4 (software behavior as of September 2026)', role: 'verifies-concept', url: '/framework-in-math#fis-math' },
      { provider: 'ACF · worked example', label: 'Author calculation under the FIS rules: 11 positions, 80 percent taxable and 20 percent Roth; top three 41.5 percent and top five 61.5, none above 15; four documented names scoring in the 60s at 6.25 percent each; a fifth of value without a thesis; one unclassified distribution. Allocation 3.85, governance 1.00, dead capital 1.00, concentration 10, complexity 1, FIS 83.15, drawn rounded', role: 'methodology' },
      { provider: 'ACF · Part 6', label: 'Rule stated in Part 6 · Subtractive scoring: every lost point has an owner', role: 'verifies-concept', url: '/part-6-convexity-framework-integrity-scoring#fis' },
    ],
    explainerHeadline: 'Every penalty must be attributable, proportional, repairable and tied to a rule.',
    explainerBody: 'This example book loses 4 points to allocation, because 80 percent of it sits in taxable accounts and more of its positions score in the 60s than the band targets allow. Governance takes 1: a quarter of the book sits in documented names scoring in the 60s. Dead capital takes 1: a fifth of it has no written thesis. Concentration takes 10, the biggest bill, because the top three holdings pass 40 percent and the top five pass 60 even though no single name tops 15. Complexity takes 1, for a distribution nobody classified. The book lands at 83, in the Strong band, with concentration first on the repair list. Governance and dead-capital charges scale with each position’s share of the portfolio, counted between 0.2 and 12 percent; the other three buckets charge flat amounts. The caps sum to 80, so no score can fall below 20, but that floor is only a bound: in any book of fewer than 200 positions, governance and dead capital each stay under 10 points.',
    explainerConcept: 'FIS',
    concepts: [{ label: 'FIS', link: '/part-6-convexity-framework-integrity-scoring#fis' }, { label: 'Posture', link: '/part-5-portfolio-construction-position-management#postures' }],
    layout: 'waterfall',
    ariaSummary: 'A waterfall chart. The score starts at 100 and steps down through five deductions for one example book: allocation minus 4, governance minus 1, dead capital minus 1, concentration minus 10, complexity minus 1. It lands at 83, inside the Strong band. Horizontal guides mark the band boundaries at 70, 60 and 50.',
    waterfall: {
      start: 100, startLabel: 'Start', unit: 'pts',
      steps: [
        { id: 'alloc', label: 'Allocation', value: -4, cap: 25, capLabel: 'cap 25 · account split + score bands' },
        { id: 'gov', label: 'Governance', value: -1, cap: 15, capLabel: 'cap 15 · scores below 70, size-weighted' },
        { id: 'dead', label: 'Dead capital', value: -1, cap: 15, capLabel: 'cap 15 · no thesis · score >90 days old' },
        { id: 'conc', label: 'Concentration', value: -10, cap: 15, capLabel: 'cap 15 · >15% · top 3 >40% · top 5 >60%' },
        { id: 'complex', label: 'Complexity', value: -1, cap: 10, capLabel: 'hard cap 10 · unclassified · undocumented' },
      ],
      result: { id: 'fis', label: 'FIS 83', sub: 'Strong band · repair list ranked' },
      bandGuides: [
        { v: 70, label: '70 · Strong' },
        { v: 60, label: '60 · Moderate' },
        { v: 50, label: '50 · Caution' },
      ],
    },
    primaryKey: 'fis',
    hoverTargets: [
      { id: 'alloc', kind: 'node', label: 'Allocation', name: 'Allocation · −4 of 25 max', why: 'The largest bucket, with two checks: how your capital splits across Roth, taxable and pre-tax accounts against the FIS wrapper targets of 45, 35 and 20 percent (drift under 10 points is ignored), and how many positions sit in each score band. It does not check which asset sits in which account. Here, a book that is 80 percent taxable with a crowded 60s band costs about 4 points.', claim: 'Structure gets the biggest cap.', concept: 'Wrapper edge', link: '/part-4-tax-architecture-roc-strategy#edge' },
      { id: 'gov', kind: 'node', label: 'Governance', name: 'Governance · −1 of 15 max', why: 'One charge per position, first match wins: a score below 60 (6 points), a score of 60 to 69 on a position above 8 percent of the portfolio (6), any other score in the 60s (4). Each charge is multiplied by the position’s share of the portfolio, counted between 0.2 and 12 percent, so a 6-point charge on a 5 percent position costs 0.3. Here a quarter of the book sits in documented 60s names of 8 percent or less: 4 × 0.25 = 1. A momentum-breakdown charge (4 points) is specified too, but nothing in the dashboard sets it yet.', claim: 'Bigger positions, bigger charges.', concept: 'FIS', link: '/part-6-convexity-framework-integrity-scoring#fis' },
      { id: 'dead', kind: 'node', label: 'Dead capital', name: 'Dead capital · −1 of 15 max', why: 'Positions with no documented thesis (5 points) and scores older than 90 days (2), each scaled by position size the way governance is. Here a fifth of the book has no written thesis: 5 × 0.20 = 1. Capital that is neither working nor watched gets billed.', claim: 'Idle capital is a scored failure.', concept: 'FIS', link: '/part-6-convexity-framework-integrity-scoring#fis' },
      { id: 'conc', kind: 'node', label: 'Concentration', name: 'Concentration · −10 of 15 max', why: 'Trips at the Part 5 single-position cap of 15 percent, so a position inside the 15 to 18 percent override band is still billed, and at looser levels than Part 5’s top-three and top-five caps of 35 and 50: the top three past 40 percent, the top five past 60. Bitcoin is excluded by design. The charges are flat (8 for each name above 15 percent, 6 for the top three, 4 for the top five), and a documented override does not waive them. Here the top three hold 41.5 percent and the top five 61.5: 6 + 4 = 10.', claim: 'The score bills breaches, not brushes.', concept: 'Concentration limits', link: '/part-5-portfolio-construction-position-management#torque' },
      { id: 'complex', kind: 'node', label: 'Complexity', name: 'Complexity · −1 · hard cap 10', why: 'Loose ends: 1 point for each distribution nobody has classified, and half a point for each position scoring below 70 with no documented rationale, beyond an allowance of three. Under the FIS rules a documented thesis, hold rationale or remediation plan lifts the low-score charge, though not the unclassified one; the dashboard’s score does not yet read hold rationales or remediation plans. Here, one unclassified distribution.', claim: 'Complexity has a price and a ceiling.', concept: 'FIS', link: '/part-6-convexity-framework-integrity-scoring#fis' },
      { id: 'fis', kind: 'node', label: 'The result', name: 'FIS 83 · Strong', why: '83 sits in the Strong band of the shared four-band register; below 70, remediation begins. Every point of the gap to 100 has a name and a repair path, and for this book the first repair is concentration.', claim: 'The score is a to-do list.', concept: 'FIS', link: '/part-6-convexity-framework-integrity-scoring#fis' },
    ],
    mobileTapTargets: ['alloc', 'gov', 'dead', 'conc', 'complex', 'fis'],
    implementationNotes: 'waterfall layout on the FIS rules the dashboard computes: five buckets capped 25/15/15/15/10, band guides at 70/60/50, concentration flat 8/6/4 at 15/40/60 with Bitcoin excluded, governance and dead capital value-weighted between 0.2% and 12%, caps summing to 80. The example book (11 positions; 80% taxable, 20% Roth; top three 41.5%, top five 61.5%, none above 15%; four documented names scoring 60–69 at 6.25% each; 20% of value without a thesis; one unclassified distribution) computes to allocation 3.85, governance 1.00, dead capital 1.00, concentration 10, complexity 1, FIS 83.15, drawn rounded as −4/−1/−1/−10/−1 = 83. The Part 6 bucket table is the exact-value companion.',
  },

  {
    chartId: 'p6-cis-fis-matrix', idx: 'P6-03', group: 'part-6', intendedPlacement: 'part-6',
    experienceRole: 'matrix',
    claimStack: {
      primaryClaim: 'CIS never reads FIS, and FIS reads CIS only through its four bands; neither score can stand in for the other',
      visualProof: 'A two-by-two of CIS against FIS with an action in every cell, and a repair path that moves a both-below-70 portfolio right first (construction) and then up (conviction)',
      interactionRole: 'Hover a waypoint to read the diagnosis and the action for that cell',
      readerAction: 'Find your quadrant, read its action, and note the order of the repair path',
      caution: 'Conceptual diagnosis matrix. Both axes split at 70, the Strong band’s floor on each score and, on FIS only, the action line. In the dashboard, FIS below 70 produces a fix-the-top-penalty recommendation when you run the Weekly Review (as of September 2026)',
    },
    status: 'implemented', wiredPublic: true,
    title: 'Good Assets Can Still Form a Bad Portfolio', setupLine: 'CIS grades what you own; FIS grades what it becomes when assembled',
    claimLabel: 'PART 6 · TWO-SCORE DIAGNOSIS',
    frameworkClaim: 'CIS never reads FIS, and FIS reads CIS only through its four bands; neither score can stand in for the other.',
    readerTakeaway: 'A portfolio is healthy only when both scores are.',
    chartType: 'CIS × FIS two-by-two diagnosis matrix with the repair path crossing it.',
    visualDataMode: 'conceptual', disclosure: DISCLOSURE.conceptual, footerCta: 'View framework basis',
    sources: [
      { provider: 'ACF · Part 6', label: 'Rule stated in Part 6 · Neither score compensates for the other', role: 'verifies-concept', url: '/part-6-convexity-framework-integrity-scoring#interaction' },
      { provider: 'ACF dashboard', label: 'The shared four-band register (70 is the Strong floor on both scores); FIS below 70 raises a fix-the-top-penalty recommendation in the Weekly Review (software behavior as of September 2026)', role: 'verifies-concept', url: '/framework-in-math#fis-math' },
    ],
    explainerHeadline: 'Two scores, one diagnosis, and a fixed repair order.',
    explainerBody: 'Strong CIS with healthy FIS: maintain. Strong CIS with FIS below 70 is a construction problem: repair wrappers, sizing and concentration, and keep the positions. CIS below Strong with healthy FIS is sub-core conviction: honor each position’s posture-specific band, strengthen the evidence, and resize or replace only where warranted. Both below 70: repair construction first, because construction failures compound faster, then reassess each position and size it by its CIS band. Exits stay reserved for scores below fifty or separately triggered governance. Both scores have to be healthy; neither can carry the other.',
    explainerConcept: 'Two-score kernel',
    concepts: [{ label: 'CIS', link: '/part-6-convexity-framework-integrity-scoring#cis' }, { label: 'FIS', link: '/part-6-convexity-framework-integrity-scoring#fis' }],
    layout: 'quadrant',
    ariaSummary: 'A two-by-two matrix. The horizontal axis is construction integrity, FIS, split at 70, the action line. The vertical axis is position quality, CIS, split at the Strong band’s floor of 70, a band boundary, not an action trigger. Top right: maintain, strong positions well assembled. Top left: repair construction and keep the positions. Bottom right: sub-core conviction; honor the posture-specific sizing bands and strengthen, resize or replace only as warranted. Bottom left: construction first, then reassess and size each position by its CIS band. A path runs from the bottom left through the bottom right to the top right, showing the repair order.',
    quadrant: {
      xAxis: { neg: 'FIS BELOW 70', pos: 'FIS 70+' },
      yAxis: { neg: 'CIS BELOW STRONG', pos: 'CIS STRONG (70+)' },
      cells: [
        { qx: 1, qy: 1, label: 'Maintain', sub: 'strong positions, well assembled' },
        { qx: -1, qy: 1, label: 'Repair construction', sub: 'keep the positions' },
        { qx: 1, qy: -1, label: 'Sub-core conviction', sub: 'honor the sizing bands' },
        { qx: -1, qy: -1, label: 'Construction first', sub: 'then size by CIS band' },
      ],
      path: ['weak', 'construction', 'healthy'],
      waypoints: {
        weak: { x: -0.55, y: -0.42 }, construction: { x: 0.5, y: -0.34 }, healthy: { x: 0.55, y: 0.42 }, positions: { x: -0.55, y: 0.4 },
      },
    },
    primaryKey: 'healthy',
    hoverTargets: [
      { id: 'weak', kind: 'waypoint', label: 'Both below 70', name: 'Below Strong, construction failing', why: 'Comprehensive repair, in a fixed order: construction first, because construction failures compound faster, then reassess each position and size it by its CIS band. Exits stay reserved for scores below fifty or separately triggered governance.', claim: 'Repair has an order.', concept: 'Two-score kernel', link: '/part-6-convexity-framework-integrity-scoring#interaction' },
      { id: 'construction', kind: 'waypoint', label: 'Construction repaired', name: 'CIS below Strong, FIS healthy · sub-core conviction', why: 'Clean assembly of sub-core conviction. Wrappers, sizing and allocation are right, and each position holds its posture-specific band: standard sizing in the 60s, a starter position in the 50s. Strengthen the evidence, and resize or replace only where warranted.', claim: 'Construction cannot add conviction.', concept: 'CIS', link: '/part-6-convexity-framework-integrity-scoring#cis' },
      { id: 'healthy', kind: 'waypoint', label: 'Both healthy', name: 'Strong CIS, healthy FIS · maintain', why: 'Strong positions, well assembled. The only cell where the weekly answer is to hold and keep measuring.', claim: 'Both scores have to be healthy; neither can carry the other.', concept: 'Two-score kernel', link: '/part-6-convexity-framework-integrity-scoring#interaction' },
      { id: 'positions', kind: 'waypoint', label: 'Strong CIS / FIS below 70', name: 'Strong positions, poorly assembled', why: 'Strong positions can still be poorly assembled: accounts out of balance, sizing off, concentration past the caps. Repair wrappers, sizing and concentration, and keep the positions.', claim: 'Great assets do not excuse bad assembly.', concept: 'FIS', link: '/part-6-convexity-framework-integrity-scoring#fis' },
    ],
    mobileTapTargets: ['weak', 'construction', 'healthy', 'positions'],
    implementationNotes: 'quadrant reuse with two small engine extensions: off-path waypoints render as hoverable dots (the High-CIS/Low-FIS cell), and the path carries the repair order (construction first, then quality). The Part 6 interaction table remains adjacent as the exact-wording companion.',
  },

  {
    chartId: 'p6-weekly-loop', idx: 'P6-04', group: 'part-6', intendedPlacement: 'part-6',
    experienceRole: 'diagram',
    claimStack: {
      primaryClaim: 'The framework runs on a weekly evidence loop: measure, check, act or hold, record, repeat',
      visualProof: 'Five stations on one path (update CIS, calculate FIS, run the governance checks, act or deliberately hold, log the evidence), closed by a weekly return arc, with the checks as the checkpoint',
      interactionRole: 'Hover a station to read what it produces; the checks station carries the trigger list',
      readerAction: 'Walk the five stations, then note that the loop closes weekly whether or not anything traded',
      caution: 'The dashboard’s Weekly Review runs the same order when you start it: a budgeted refresh of stale scores, then ingest, read CIS and FIS, governance checks, action determination, decision log. Its governance checks do not yet receive earnings dates, price trends or correlation data, so the earnings flag comes from the Framework Rule Register and the positions table instead (as of September 2026)',
    },
    status: 'implemented', wiredPublic: true,
    title: 'The Weekly Evidence Loop', setupLine: 'Regular measurement, explicit attribution, action only on a governing threshold',
    claimLabel: 'PART 6 · OPERATING CADENCE',
    frameworkClaim: 'The framework asks for regular measurement, explicit attribution, and action only when evidence crosses a governing threshold. Constant trading is not on the list.',
    readerTakeaway: 'No trigger is also a result: when everything checks out, hold.',
    chartType: 'Five-station weekly operating loop: CIS → FIS → governance checks → act or hold → log, returning weekly.',
    visualDataMode: 'conceptual', disclosure: DISCLOSURE.conceptual, footerCta: 'View framework basis',
    sources: [
      { provider: 'ACF · Part 6', label: 'Rule stated in Part 6 · The weekly workflow', role: 'verifies-concept', url: '/part-6-convexity-framework-integrity-scoring#weekly' },
      { provider: 'ACF dashboard', label: 'Weekly Review order and trigger precedence: three-level check, earnings, FIS below 70, CIS drift (software behavior as of September 2026)', role: 'verifies-concept', url: '/framework-in-math#governance-math' },
    ],
    explainerHeadline: 'Decay only shows up week over week.',
    explainerBody: 'Each week: update the evidence behind C, R, M and E, with delta clamps bounding ordinary updates. Calculate FIS and read its attribution. Run the checks: earnings proximity, momentum, tripwires, posture drift. Then act, or deliberately hold: a tripwire demands a response, an earnings window means trimming to the 3 percent cap, FIS below 70 means fixing the top penalty, and a CIS move of 10 points or more means resizing; with no trigger, you hold. Last comes the record of what changed and why. The log is what makes next week’s loop a measurement instead of a memory.',
    explainerConcept: 'Weekly loop',
    concepts: [{ label: 'CIS', link: '/part-6-convexity-framework-integrity-scoring#cis' }, { label: 'Tripwire', link: '/part-5-portfolio-construction-position-management#management' }],
    layout: 'governanceLoop',
    ariaSummary: 'A weekly operating loop of five stations: update CIS for every position, calculate FIS for the portfolio, run the governance checks (earnings, momentum, tripwires, posture drift), then act or deliberately hold, and log what changed and why. A return arc labeled weekly closes the loop back to the first station.',
    governanceLoop: {
      governorId: 'gates',
      returnLabel: 'weekly · the loop is the framework',
      nodes: [
        { id: 'cis', label: 'Update CIS', sub: 'C·R·M·E → clamp → log' },
        { id: 'fis', label: 'Calculate FIS', sub: '100 − Σ penalties' },
        { id: 'gates', label: 'Run the checks', sub: 'earnings · momentum · drift' },
        { id: 'act', label: 'Act or hold', sub: 'no trigger is a result' },
        { id: 'log', label: 'Preserve the record', sub: 'what changed · why' },
      ],
    },
    primaryKey: 'cis',
    hoverTargets: [
      { id: 'cis', kind: 'node', label: 'Update CIS', name: 'Measure position quality', why: 'For each position, refresh the evidence behind convexity, risk, macro and execution, then clamp the change by confidence (±3 low, ±5 medium, ±6 derived, ±8 high), so ordinary updates move a few points at a time; a move of more than 20 points passes through as a model disagreement. In the dashboard the review refreshes at most 10 stale scores per run, older and larger positions first, then reads every current score and records what changed.', claim: 'Every score is re-read weekly; stale ones are re-earned.', concept: 'CIS', link: '/part-6-convexity-framework-integrity-scoring#cis' },
      { id: 'fis', kind: 'node', label: 'Calculate FIS', name: 'Measure portfolio integrity', why: 'Penalties by bucket, with attribution: one hundred minus the sum. Governance and dead-capital charges scale with position size; allocation, concentration and complexity charges are flat. The output is a ranked list of what to fix.', claim: 'Attribution is the deliverable.', concept: 'FIS', link: '/part-6-convexity-framework-integrity-scoring#fis' },
      { id: 'gates', kind: 'node', label: 'The checks', name: 'Run the governance checks', why: 'Earnings proximity (T-5, cap 3%), momentum, tripwires and posture drift: the checkpoint every action passes through. In the dashboard these checks do not yet receive earnings dates, price trends or correlation data, so the three momentum dimensions go unmeasured and the earnings flag comes from the Framework Rule Register and the positions table instead. That flag counts calendar days, so start the trim from the earnings calendar.', claim: 'Every action passes the checks first.', concept: 'Tripwire', link: '/part-5-portfolio-construction-position-management#management' },
      { id: 'act', kind: 'node', label: 'Act or hold', name: 'Act, or deliberately hold', why: 'Tripwire: respond at once. Earnings window: trim to the 3 percent cap. FIS below 70: fix the top penalty. CIS move of 10 points or more: resize. No trigger: hold, because restraint is a decision, and the frequency limits pace the review’s own recommendations. In the dashboard’s Weekly Review a finding from its three-level check comes first; the framework’s tripwires are recorded there but raise no recommendation of their own.', claim: 'Holding is an outcome, not an omission.', concept: 'Weekly loop', link: '/part-6-convexity-framework-integrity-scoring#weekly' },
      { id: 'log', kind: 'node', label: 'The record', name: 'Preserve the record', why: 'What changed and why. The dashboard’s decision log keeps the last 52 reviews, a year at a weekly cadence: the positions whose scores changed, the FIS reading, and the recommendations made or held back, with the reason. Noting what evidence would reverse a decision is good practice, but it is yours to write; the log has no field for it. Longitudinal health is only visible against a written record.', claim: 'Unrecorded decisions decay into stories.', concept: 'Weekly loop', link: '/part-6-convexity-framework-integrity-scoring#weekly' },
    ],
    mobileTapTargets: ['cis', 'fis', 'gates', 'act', 'log'],
    implementationNotes: 'governanceLoop reuse per the approved P6-04 signature spec, extended to five stations with the evidence log as the closing operational step (the page’s weekly pass ends in decision logging). The checks station (node id gates) is the checkpoint. The caution and hovers describe the dashboard’s Weekly Review as of September 2026.',
  },

  {
    chartId: 'p6-decay-drift', idx: 'P6-05', group: 'part-6', intendedPlacement: 'part-6',
    experienceRole: 'mechanism',
    claimStack: {
      primaryClaim: 'Framework failure is usually slow: small tolerable deviations compound while they go unmeasured',
      visualProof: 'Five normalized health indicators eroding at different tempos across twelve unmeasured months, each steepening as it goes (stale conviction falls furthest, wrapper leakage least), while the dashed line of assumed health holds flat at 100',
      interactionRole: 'Hover an indicator to read the failure mode it tracks and how the dashboard flags it',
      readerAction: 'Compare the flat assumed-health line against every eroding indicator beneath it',
      caution: 'The erosion tempos are illustrative; the diagnostic thresholds cited for the lines are the dashboard’s (as of September 2026)',
    },
    status: 'implemented', wiredPublic: true,
    title: 'Failure Rarely Arrives All at Once', setupLine: 'What happens to a healthy portfolio in the twelve months after reviews stop',
    claimLabel: 'PART 6 · LONGITUDINAL DECAY',
    frameworkClaim: 'Most implementation failures begin as small, individually tolerable deviations: a stale score, an oversized winner, a misplaced asset, one more correlated position. Left unmeasured, they compound into real fragility.',
    readerTakeaway: 'Framework health is a trend. What is not remeasured eventually becomes assumed.',
    chartType: 'Five normalized decay indicators over twelve unmeasured months against a flat assumed-health reference.',
    visualDataMode: 'conceptual', disclosure: 'Conceptual diagnostic · Normalized health indicators, no market data', footerCta: 'View framework basis',
    sources: [
      { provider: 'ACF · Part 6', label: 'Rule stated in Part 6 · How implementations decay unnoticed', role: 'verifies-concept', url: '/part-6-convexity-framework-integrity-scoring#failure' },
      { provider: 'ACF dashboard', label: 'Stale-score warning at 60 days and failure past 90; refresh flag at 50 percent above cost on a score older than 60 days; posture drift warning at 10 points and failure at 20; Correlation Spike tripwire above 0.70 average pairwise correlation (software behavior as of September 2026)', role: 'verifies-concept', url: '/framework-in-math#governance-math' },
    ],
    explainerHeadline: 'Each line has a diagnostic. None of them helps if nobody reads it.',
    explainerBody: 'Stale conviction: the position changes while its score stays frozen; the dashboard warns once a score is more than 60 days old and fails it past 90, when the dead-capital bucket starts billing it. Thesis evidence decays as the story stands in for current analysis; a position more than 50 percent above its cost basis whose score is older than 60 days is flagged for a refresh. Correlation stacking arrives late, as different tickers turn into one trade under stress; the Correlation Spike tripwire flags average pairwise correlation above 0.70. Posture drift moves the portfolio without a decision; the dashboard warns at 10 percentage points from target and fails at 20. Wrapper leakage is the slowest, and Parts 4 and 5 work out what it costs. A single audit samples the level; only week-over-week measurement sees the slope.',
    explainerConcept: 'Longitudinal health',
    concepts: [{ label: 'Failure modes', link: '/part-6-convexity-framework-integrity-scoring#failure' }, { label: 'Weekly loop', link: '/part-6-convexity-framework-integrity-scoring#weekly' }],
    layout: 'single',
    ariaSummary: 'A conceptual chart of twelve months without reviews. A dashed reference line holds flat at 100, labeled still assumed healthy. Beneath it five normalized indicators erode, each steepening as the months pass: stale conviction slides first and falls furthest, thesis evidence follows, correlation stacking holds up for months and then drops fastest of all, posture drift steepens gently, and wrapper leakage loses least. An early marker notes that a point-in-time audit two to three months in still looks acceptable.',
    domain: { xMin: 0, xMax: 12, yMin: 0, yMax: 112 }, yUnit: '',
    xTicks: [{ v: 0, label: 'last review' }, { v: 3, label: '+3 mo' }, { v: 6, label: '+6 mo' }, { v: 12, label: '+12 months' }],
    yTicks: [{ v: 100, label: '100 · measured' }, { v: 50, label: '50' }],
    guides: [{ id: 'assumed', y: 100, kind: 'threshold', dash: true, label: 'still assumed healthy' }],
    markers: [{ id: 'audit', type: 'enso', x: 2.5, y: R(valueAt(p6Decay.freshness, 2.5)), r: 10, label: 'a point-in-time audit still looks fine', labelAnchor: 'start', labelDy: -30 }],
    series: [
      { key: 'wrapper', tier: 'reference', label: 'Wrapper leakage', pts: p6Decay.wrapper, labelDy: -4 },
      { key: 'posture', tier: 'tertiary', label: 'Posture drift', pts: p6Decay.posture, labelDy: 2 },
      { key: 'correlation', tier: 'stress', label: 'Correlation stacking', pts: p6Decay.correlation, labelDy: 4 },
      { key: 'evidence', tier: 'secondary', label: 'Thesis evidence', pts: p6Decay.evidence, labelDy: 6 },
      { key: 'freshness', tier: 'primary', label: 'Stale conviction', pts: p6Decay.freshness, labelDy: 8 },
    ],
    primaryKey: 'freshness',
    hoverTargets: [
      { id: 'freshness', kind: 'series', seriesKey: 'freshness', label: 'Stale conviction', name: 'Stale conviction · the first to slide', why: 'The position changes while the score stays frozen, and sizing keeps obeying a number that no longer describes the asset. In the dashboard, a score older than 90 days is stale: the dead-capital bucket charges it 2 base points, value-weighted, and the diagnostics warn once a score is more than 60 days old and fail past 90.', claim: 'A frozen score is a silent resize.', concept: 'Failure modes', link: '/part-6-convexity-framework-integrity-scoring#failure' },
      { id: 'evidence', kind: 'series', seriesKey: 'evidence', label: 'Thesis evidence', name: 'Narrative reinforcement', why: 'Past performance stands in for current evidence, and the thesis may already be realized. In the dashboard, a position more than 50 percent above its cost basis whose score is older than 60 days is flagged for a refresh.', claim: 'Winners need re-scoring most.', concept: 'Failure modes', link: '/part-6-convexity-framework-integrity-scoring#failure' },
      { id: 'correlation', kind: 'series', seriesKey: 'correlation', label: 'Correlation stacking', name: 'Correlation stacking · accelerates late', why: 'Positions scored one at a time converge under regime stress, and different tickers become the same trade. In the dashboard, the Correlation Spike tripwire flags average pairwise correlation above 0.70 across your non-cash holdings, computed from daily closes once every holding has at least 60 daily returns. The flag is informational: no FIS bucket charges for correlation, and CIS never does.', claim: 'Stress is when diversification is audited.', concept: 'Correlation instability', link: '/part-5-portfolio-construction-position-management#management' },
      { id: 'posture', kind: 'series', seriesKey: 'posture', label: 'Posture drift', name: 'Silent posture drift', why: 'Price moves re-weight the portfolio without a single decision: Torque appreciates past its target while Ballast thins. The dashboard warns at 10 percentage points from target and fails at 20, measured against the targets your thesis implies and reported beside the score, never billed as a penalty.', claim: 'Markets rebalance you unless you notice.', concept: 'Posture', link: '/part-5-portfolio-construction-position-management#postures' },
      { id: 'wrapper', kind: 'series', seriesKey: 'wrapper', label: 'Wrapper leakage', name: 'Wrapper leakage · slow and compounding', why: 'Small tax inefficiencies accumulate over long horizons; Parts 4 and 5 work the arithmetic and state their assumptions. In the dashboard, the FIS Allocation bucket bills the account-level split against its targets as one aggregate line; it does not flag a single asset held in the wrong wrapper, so naming misplaced positions stays your job.', claim: 'Small leaks compound over decades.', concept: 'Wrapper edge', link: '/part-4-tax-architecture-roc-strategy#edge' },
      { id: 'audit', kind: 'marker', label: 'Point-in-time audit', name: 'The one-time audit trap', why: 'Two or three months in, every indicator still rounds to healthy. A single audit samples the level; only week-over-week measurement sees the slope.', claim: 'Levels lie; slopes tell.', concept: 'Longitudinal health', link: '/part-6-convexity-framework-integrity-scoring#failure' },
    ],
    mobileTapTargets: ['freshness', 'evidence', 'correlation', 'posture', 'wrapper', 'audit'],
    implementationNotes: 'single-layout reuse; five deterministic normalized decay curves (ease-in power curves 100 − drop·t^bend, seeded ±0.2 texture, clamped at 100) against a dashed assumed-health guide at 100. Explicitly conceptual, with no market data; each hover carries the dashboard’s diagnostic threshold as of September 2026. End values (80/66/58/52/42) are unchanged from the earlier smoothstep version, so the labelDy spacing still holds at narrow widths.',
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
// Compact data-mode marker for the chart HEADER — first-principles honesty up top
// (the full disclosure sentence + sources live behind progressive disclosure).
export function getDataModeMarker(spec) {
  const mode = spec.visualDataMode || 'representative';
  const glyph = mode === 'historical' ? 'square' : mode === 'conceptual' ? 'circle' : 'diamond';
  const label = { conceptual: 'Conceptual', representative: 'Representative', simulation: 'Simulation', historical: 'Historical', mixed: 'Mixed' }[mode] || 'Representative';
  const explain = {
    conceptual: 'Conceptual exhibit: illustrates framework logic, not historical data.',
    representative: 'Representative exhibit: sources support the concept; the shape is illustrative.',
    simulation: 'Simulation: computed from stated inputs, not a forecast or a historical backtest.',
    historical: 'Historical data: plotted from a named public series.',
    mixed: 'Mixed exhibit: combines sourced data with representative framework elements.',
  }[mode] || 'Representative exhibit: sources support the concept; the shape is illustrative.';
  return { mode, glyph, label, explain };
}

export default FRAMEWORK_CHART_SPECS;
