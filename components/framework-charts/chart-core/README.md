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
| `grammar.mjs` | The **visual-relationship grammar** — `VISUAL_RELATIONSHIPS` + `LAYOUT_RELATIONSHIPS` + `resolveVisualRelationship` (leaf; `chart-specs.mjs` re-exports) | validator · inventory · gallery · README matrix |
| `multilane.mjs` | The **multi-lane comparison** contract (`MultiLaneSpec`) + a hardened `validateMultiLaneSpec` + `layoutMultiLane` (reference geometry: lane/segment rects, cross-lane compare stats, surplus delta) | `FrameworkChart.LaneBarSvg` (docs) · *(dashboard: pending adoption)* |
| `format.mjs` | The **value formatters** — the docs engine's *illustrative* policy (`formatIllustrativeMoney` / `formatIllustrativeCompactMoney` / `formatFractionPercent`) + a `FORMAT_PROFILES` contract. **Deliberately lossy** (non-positive→`$0`, coarse, no cents) — NOT a universal financial formatter | `chart-specs.mjs` + `FrameworkChart` (docs) · *(ACFDashboard keeps its own precise/signed formatters — see note)* |
| `index.mjs` | The unified import surface — re-exports the visual-relationship grammar (defined in `chart-specs.mjs`) + the multi-lane model + the formatter facade | any consumer wanting the whole foundation from one place |

The visual-relationship **grammar** (`VISUAL_RELATIONSHIPS`, `resolveVisualRelationship`,
`LAYOUT_RELATIONSHIPS`) is defined here in `grammar.mjs` (a leaf); `chart-specs.mjs`
re-exports it. It is a portable *concept* both engines can adopt.

### The dependency runs strictly downward

`chart-core/` imports **nothing** from the parent engine. Definitions live here;
`chart-specs.mjs` (and the validator / inventory / renderers) import *from* chart-core,
never the reverse — so the core stays genuinely portable:

```
chart-core/{grammar,multilane,format}.mjs   (leaves — no upward imports)
        ↓
chart-specs.mjs                              (re-exports; spec registry)
        ↓
validator · inventory · renderers
```

### Formatter honesty (why the names say "illustrative")

`format.mjs` is the docs engine's **illustrative** policy: it collapses non-positive
money to `$0` and rounds coarsely, which is right for representative exhibits and
**wrong** for real losses / withdrawals / negative P&L / liabilities / small values.
So the functions are named for what they are, and `FORMAT_PROFILES` documents the
fuller contract (`illustrative`, `preciseCurrency`, `signedPnl`, `compactPortfolio`,
`percentFromFraction`, `percentFromPoints`). Only the illustrative + percent-from-
fraction profiles are implemented here; **ACFDashboard keeps its own canonical
financial formatters** (`shared/formatters.ts`) for precise/signed/currency values —
the pilot must not adopt the illustrative policy for real money.

## Identity vs semantics in `MultiLaneSpec` (a hardened, cross-repo contract)

Because this becomes an API two repos depend on, the contract is enforced strictly
(`validateMultiLaneSpec`) and separates two ideas that are easy to conflate:

- **`segment.id`** — a unique *interactive instance* id, unique **within its lane**
  (hit-testing / focus / element key).
- **`segment.key`** — an optional *shared semantic* key. The **same key may repeat
  across lanes** (it is never forced globally unique) — that repetition is exactly
  what "the same thing, compared across lanes" means.
- **`spec.compareKey`** — the semantic key that drives the cross-lane comparison;
  each lane must then carry **exactly one** segment with that key (replaces the old
  boolean `compare` flag / the vestigial `compareSegId`).

Enforced: finite positive `total`; unique lane ids + labels; finite non-negative
segment values; segment ids unique within a lane; **per-lane segment sum ≈ total**
(tolerance = `max(1e-6, total*0.005)`, overridable); exactly one compare segment per
lane and ≥2 comparison endpoints when `compareKey` is set; `deferred` is a **bounded
overlay** (finite, `≤ total`, **not** part of the sum, so nothing is double-counted).
`layoutMultiLane` additionally throws on non-positive geometry, flags any segment
rectangle that would exceed the lane bounds (`anyOverflow`), and computes the surplus
`deltaValue` from **data values** (`max − min` of the compare segments) — never
reconstructed from rounded pixels. All of the above is covered by `tests/`.

## Tests

`npm run test:chart-core` (Node's built-in `node:test`, zero deps) — 35 assertions
across the multi-lane contract, geometry, grammar, and formatter modules: valid
2-lane and 3-lane cases; malformed / overflow / underflow totals; duplicate lane and
within-lane segment ids; shared semantic keys across lanes (allowed); absent /
multiple compare segments; zero-value segments; deferred-overlay bounds; surplus
independence from viewport width; narrow + wide geometry; invalid-geometry throws.

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
