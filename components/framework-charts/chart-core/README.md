# chart-core — the shared chart foundation ("one roof")

This directory is the **first shared-foundation brick** of the chart-engine
unification. It holds the code that both chart systems should consume so they read
as one system instead of reinventing the same concerns:

- the **ACF-Docs exhibit engine** (`components/framework-charts/`, bespoke SVG,
  teaching) — consumes it today;
- the **ACFDashboard analytics engine** (`ACFDashboard/`, Recharts + bespoke SVG,
  real data) — will consume it once the cross-repo sharing mechanism is chosen
  (owner decision — see `/CHART_ENGINE_UNIFICATION_PROPOSAL_v1.md` §6).

Everything here is **pure and portable**: no React, no palette, no DOM, no
charting library. That is the whole point — a Recharts card and a hand-authored
SVG exhibit can share the *model* even though they don't share a *renderer*.

## Contents

| Module | What it owns | Consumed by |
|---|---|---|
| `multilane.mjs` | The **multi-lane comparison** contract (`MultiLaneSpec`) + `validateMultiLaneSpec` + `layoutMultiLane` (reference geometry: lane/segment rects, cross-lane compare stats, surplus delta) | `FrameworkChart.LaneBarSvg` (docs) · *(dashboard: pending adoption)* |
| `format.mjs` | The **value-formatter facade** — `formatMoney` / `formatCompactMoney` / `formatPercent` (one definition; the docs engine's old inline `fmtMoney` + `formatStartingValue` now resolve here) | `chart-specs.mjs` re-exports · `FrameworkChart` · *(dashboard `formatters.ts` + forked Data-page copy: pending consolidation)* |
| `index.mjs` | The unified import surface — re-exports the visual-relationship grammar (defined in `chart-specs.mjs`) + the multi-lane model + the formatter facade | any consumer wanting the whole foundation from one place |

The visual-relationship **grammar** (`VISUAL_RELATIONSHIPS`, `resolveVisualRelationship`,
`LAYOUT_RELATIONSHIPS`) is defined in `chart-specs.mjs` (its SSOT) and re-exported
through `index.mjs`; it is a portable *concept* both engines can adopt.

## Why "share the model, not the renderer"

The two engines are good at different jobs — teaching one idea vs. exploring real
data — and both should keep their renderer (bespoke SVG here; Recharts there). What
they should **not** each reinvent is the layer beneath: the relationship grammar,
the multi-lane model, tokens, the hover/inspect engine, scales, and formatters. A
multi-lane chart is the clearest example: the **spec** (lanes, shared scale, the
aligned compare segment, the honest deferred marker) is identical whether it teaches
the ROC timing edge or shows real realized-gains lanes; only the paint differs.

## How the docs engine uses it today

`FrameworkChart.LaneBarSvg` builds its lane/segment rectangles from
`layoutMultiLane(spec.laneBar, geom)` rather than inline math, and the chart-spec
validator delegates multi-lane integrity to `validateMultiLaneSpec`. So the docs
engine is already on the shared contract; the dashboard adoption is a drop-in of the
same two functions behind its own renderer.

## Roadmap (owner-gated, cross-repo)

Phase B/C of the proposal adds the remaining shared modules here (token contract,
hover/inspect, scales, formatter facade, reveal motion), sourced largely from
ACFDashboard's already-built-but-under-adopted `shared/chartViz` + `chartInteraction`
+ `lib/charts` + `shared/formatters.ts`. Nothing in ACFDashboard is touched until the
sharing mechanism and canonical home are chosen.
