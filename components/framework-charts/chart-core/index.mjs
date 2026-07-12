/* ───────────────────────────────────────────────────────────────────────────
 * chart-core — the shared, framework-agnostic foundation ("one roof").
 *
 * The single import surface both chart engines are meant to consume so they read
 * as one system instead of reinventing the same concerns. Everything re-exported
 * here is PURE (no React, no charting library) and portable across repos — see
 * chart-core/README.md and /CHART_ENGINE_UNIFICATION_PROPOSAL_v1.md.
 *
 * Contents today:
 *   · visual-relationship grammar (the "choose the form from the claim" layer)
 *   · the multi-lane comparison model (spec contract + validation + reference geometry)
 *
 * Planned (Phase B/C of the unification, owner-gated — cross-repo):
 *   · a shared design-token contract (docs palette ⇄ ACFDashboard `--chart-*`)
 *   · a shared hover / inspect engine (ACFDashboard `chartInteraction` ⇄ docs TargetTooltip)
 *   · shared scales / domains + a single formatter facade
 *   · shared reveal motion (draw-in / wipe-in — comprehension-first)
 * ─────────────────────────────────────────────────────────────────────────── */

// Visual-relationship grammar (definition SSOT stays in chart-specs.mjs; re-exported
// here as the unified surface so a consumer imports the whole foundation from one place).
export {
  VISUAL_RELATIONSHIPS,
  LAYOUT_RELATIONSHIPS,
  resolveVisualRelationship,
} from '../chart-specs.mjs';

// Multi-lane comparison model.
export {
  getMultiLane,
  validateMultiLaneSpec,
  layoutMultiLane,
} from './multilane.mjs';

// Value-formatter facade (money / compact-money / percent).
export {
  formatMoney,
  formatCompactMoney,
  formatPercent,
} from './format.mjs';
