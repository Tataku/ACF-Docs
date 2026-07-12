# Chart Engine Unification — Proposal v1 (multi-lane design system, one foundation)

> **Status: PROPOSAL — owner decision required before any ACFDashboard change.**
> Grounded in a full read of both engines (July 2026). Phase A (below) is already
> shipped in this repo; Phases B–E are a cross-repo initiative that touches the
> governed **ACFDashboard** repo and must not begin without owner authorization.

## 1. The two engines today

| | **Docs exhibit engine** (`ACF-Docs/components/framework-charts/`) | **Dashboard analytics engine** (`ACFDashboard/`) |
|---|---|---|
| Job | **Teach one idea** (guided exhibits, one-claim-per-chart) | **Explore real data** (portfolio analytics) |
| Tech | Bespoke hand-authored SVG, spec-driven (`chart-specs.mjs` → `FrameworkChart.jsx`) | **Recharts `^2.15.0`** + a large bespoke-SVG/CSS periphery |
| Aesthetic | Dark-terminal / warm-paper, ink-brush, editorial | Token-driven `--chart-*` register, app chrome |
| Interaction | Custom tooltip + click-to-pin + `MobileInsight` tap rail + motion-follows-comprehension | Recharts `<Tooltip>` **and** locked `<Tooltip>` (asChild) **and** a new `chartInteraction` inspect layer — *three systems* |
| Data honesty | `visualDataMode` + disclosure + no-forecast validator | (n/a — real data) |
| Governance | Free to edit (this repo) | Charts are **not** locked primitives, but several live in **PROTECTED** paths (Overview / TickerDetail); the design-token + primitive system IS locked |

**Neither engine has a first-class multi-lane / swimlane primitive.** The dashboard's
closest analogs are the TickerPriceChart volume sub-lane, coupled dual-axis
(`src/lib/charts/computeCoupledDomains.js`), stacked bars, and the fragility heatmap.

## 2. Thesis — share the FOUNDATION, don't merge the RENDERERS

Do **not** rebuild the exhibit engine on Recharts, or push Recharts into the exhibit
engine. They serve different jobs (teach vs. explore) and both are good at theirs.
**Unify the layer beneath them** and add **one shared multi-lane family** on top:

```
        ┌─────────────────────────────────────────────────────────────┐
        │  @acf/chart-foundation  (shared, cross-repo)                 │
        │  · tokens  (--chart-* register ⇄ Docs palette contract)      │
        │  · inspect (crosshair + mobile-safe readout + nearest-point) │
        │  · scales / domains  (log, coupled dual-axis, viewport-safe) │
        │  · formatters (currency / pct / price / date — ONE copy)     │
        │  · reveal motion (draw-in / wipe-in, comprehension-first)    │
        │  · visualRelationship grammar + the MULTI-LANE spec          │
        └───────────────┬─────────────────────────────┬───────────────┘
                        │                             │
        ┌───────────────▼──────────┐   ┌──────────────▼───────────────┐
        │  Docs exhibit engine     │   │  Dashboard analytics engine  │
        │  (bespoke SVG, teaching) │   │  (Recharts + bespoke SVG)    │
        └──────────────────────────┘   └──────────────────────────────┘
```

### The reuse seams already exist (from recon)
The dashboard **already built** most of the shared foundation — it is just
**under-adopted** (2 consumers) and gated by
`ACFDashboard/docs/audits/CHART_INTERACTION_AUDIT_AND_UNIFIED_HOVER_PLAN_v1.md`:
- `ACFDashboard/src/features/shared/chartInteraction/` — `ChartInspectCursor`
  (crosshair+dot, works in raw SVG **and** Recharts `<Customized>`, mobile-safe),
  `ChartInspectTooltip` (readout that survives the &lt;768px tooltip suppression),
  `useNearestPointInspect` (headless hit-testing + placement-flip). **Tech-agnostic
  by design** — the ideal shared hover layer for the Docs SVG engine too.
- `ACFDashboard/src/features/shared/chartViz/` — `--chart-*` chrome tokens +
  `chartMotion.css` (draw-in / wipe-in reveal, comprehension-first — the same
  doctrine as the Docs engine's motion).
- `ACFDashboard/src/lib/charts/` — log / coupled-dual-axis / viewport-safe domain math.
- `ACFDashboard/src/core/colorTokens/tagColors.js` — categorical color SSOT.
- `ACFDashboard/src/features/shared/formatters.ts` — canonical money/pct/price/date
  (the Data page currently keeps a **divergent local copy** — a unification win on its own).

The Docs engine's counterparts (`TargetTooltip`, `MobileInsight`, `palette.js`,
motion vars, `brush.js`) map onto the same concerns.

## 3. The multi-lane flagship (already seeded here)

`laneBar` (shipped in this repo, Phase A) is the first **multi-lane comparison** form:
N parallel lanes over one shared scale, aligned at a common origin, with an honest
hatched **deferred** underline and a surplus callout. The unified foundation would
lift this into a shared multi-lane spec both engines render — the dashboard for real
multi-series comparisons (e.g. realized-gains lanes, capital-at-risk lanes,
posture/sector lanes), the docs engine for teaching exhibits. Same grammar, same
tokens, same inspect layer, two renderers.

## 4. Phasing

- **Phase A — visual-relationship grammar + composition/comparison forms (SHIPPED, this PR).**
  `VISUAL_RELATIONSHIPS` + `resolveVisualRelationship` + `LAYOUT_RELATIONSHIPS`
  advisory in the Docs engine; `radial` (composition) and `laneBar` (multi-lane
  comparison) renderers; Part 4 redesign. This establishes the **shared vocabulary**.
- **Phase B — align the contracts (design only, no cross-repo code).** Map the Docs
  `palette.js` ⇄ dashboard `--chart-*` tokens; agree the inspect/hover contract
  (adopt the dashboard's `chartInteraction` shape); agree the multi-lane spec schema.
- **Phase C — extract `@acf/chart-foundation`.** Decide the sharing mechanism (see §6),
  move tokens + inspect + scales + formatters + reveal into it. Both engines import it.
- **Phase D — shared multi-lane primitive** on the foundation; adopt in both engines
  (dashboard first for a real multi-series card; docs for the next teaching exhibit).
- **Phase E — retire duplicates.** Collapse the dashboard's three hover systems toward
  one; delete the Data page's forked formatters; single categorical-color SSOT.

## 5. What NOT to do (guardrails)

- Do **not** merge the two renderers or introduce a second charting dependency in the
  Docs engine (no Recharts/D3/Chart.js — the SVG engine stays).
- Do **not** edit ACFDashboard **locked primitives** or **PROTECTED** chart paths
  (Overview `OverviewPerformanceChart`/`SnapshotPanel`/`ChartSection`, TickerDetail
  `TickerPriceChart`/`HistoricalEarningsChart`) without a separate owner-authorized,
  audit-first slice. Charts themselves are not locked, but those consumers are protected.
- Do **not** create a divergent *third* system. Unification means fewer systems, not more.
- Respect the existing `CHART_INTERACTION_AUDIT_AND_UNIFIED_HOVER_PLAN_v1.md` — build on it.

## 6. Owner decisions required (the gate before Phase B+)

1. **Sharing mechanism** for `@acf/chart-foundation`: (a) a published/private npm
   package both repos depend on; (b) a git submodule / subtree; (c) copy-with-a-sync-
   script; (d) defer (keep parallel, align contracts only). Recommendation: **(a)** if
   a private registry is acceptable, else **(c)** to start.
2. **Canonical home** for the shared core (which repo owns it) and who reviews changes.
3. **Scope / priority**: unify the hover/inspect layer first (highest duplication), or
   the multi-lane primitive first (highest new-capability value)? Recommendation:
   **hover/inspect + tokens first** (Phase B/C), multi-lane second (Phase D).

Until these are answered, work stays in the Docs repo (Phase A) and no ACFDashboard
files are touched.
