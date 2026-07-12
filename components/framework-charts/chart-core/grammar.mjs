/* ───────────────────────────────────────────────────────────────────────────
 * Visual-relationship grammar — the semantic layer above `layout`.
 *
 * PURE, framework-agnostic, and a LEAF: this module imports nothing from the
 * parent chart engine (chart-specs / renderers / validator). chart-specs.mjs
 * imports + re-exports from here, so the dependency runs strictly downward:
 *
 *     chart-core/grammar.mjs   (definitions live here)
 *            ↓
 *     chart-specs.mjs          (re-exports; the spec registry)
 *            ↓
 *     validator / inventory / renderers
 *
 * `layout` says which RENDERER draws a chart; `visualRelationship` says which
 * RELATIONSHIP it teaches. Encoding the relationship explicitly stops an agent
 * from picking a technically-valid-but-semantically-weak form (a line for a
 * composition claim, a flowchart for a magnitude comparison). See the "Chart
 * Grammar" matrix in public/agency-chart-handoff/README-agency-chart-handoff.md.
 * ─────────────────────────────────────────────────────────────────────────── */

export const VISUAL_RELATIONSHIPS = ['trend', 'comparison', 'composition', 'flow', 'threshold', 'distribution', 'sequence', 'matrix', 'reveal', 'hierarchy'];

// Which relationships each layout can HONESTLY express. Used for the validator's
// advisory (a declared relationship outside its layout's set is a soft warning,
// never a hard failure — legacy charts keep validating). The relationship→form
// SELECTION guidance (which form to REACH FOR per relationship) lives in the
// agency handoff README's "Chart Grammar" matrix; this is the inverse check.
export const LAYOUT_RELATIONSHIPS = {
  single: ['trend', 'comparison', 'threshold', 'distribution'],
  dual: ['trend', 'comparison', 'reveal'],
  quadrant: ['matrix'],
  radial: ['composition', 'hierarchy'],
  laneBar: ['comparison', 'composition'],
  scorecard: ['matrix'],
  scenario: ['comparison'],
  sequenceRisk: ['sequence'],
  heartbeat: ['trend', 'comparison'],
  flow: ['flow'], bridge: ['flow'], gate: ['flow'], loop: ['flow'],
  systemLoop: ['flow'], governanceLoop: ['flow'], feedbackLoop: ['flow'],
};

/**
 * The SEMANTIC form a chart teaches. Explicit `spec.visualRelationship` wins;
 * otherwise derived from `spec.layout` so the doctrine holds across the whole
 * registry without hand-editing every legacy spec. Reads only `spec.layout` +
 * `spec.visualRelationship` + `spec.perspectiveSlider` — no engine coupling.
 */
export function resolveVisualRelationship(spec) {
  if (spec.visualRelationship) return spec.visualRelationship;
  const L = spec.layout;
  if (L === 'radial') return 'composition';
  if (L === 'laneBar') return 'comparison';
  if (L === 'quadrant' || L === 'scorecard') return 'matrix';
  if (L === 'scenario') return 'comparison';
  if (L === 'sequenceRisk') return 'sequence';
  if (L === 'dual' && spec.perspectiveSlider) return 'reveal';
  if (L === 'dual') return 'comparison';
  if (['loop', 'flow', 'systemLoop', 'governanceLoop', 'feedbackLoop', 'bridge', 'gate'].includes(L)) return 'flow';
  return 'trend';                                                      // single / heartbeat default
}

export default { VISUAL_RELATIONSHIPS, LAYOUT_RELATIONSHIPS, resolveVisualRelationship };
