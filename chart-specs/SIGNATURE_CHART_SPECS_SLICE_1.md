# Signature Chart Specs — Slice 1 (P4-03 · P5-01 · P6-01 · P6-04)

> **Status: SPEC-ONLY.** These are review-ready specifications, **not built or wired**. No
> `chart-inventory.json` / `chart-specs.mjs` entries were added in this slice (registration +
> build is a follow-up once designs are approved). All four conform to the existing engine
> doctrine (`public/agency-chart-handoff/README-agency-chart-handoff.md`) and the
> **Chart Legibility Standard** in `PARTS_4-6_REWRITE_AND_CHART_PLAN_v1.md §E`, and reuse
> **existing engine layouts** so no new primitive is required.
>
> **Mission:** `mission.framework-docs.parts-4-6-rewrite-and-chart-plan` · Slice 1 · 2026-07-07.

**Engine conformance reminder (applies to all four):** one chart = one claim; show the
mechanism, not just the result; declare `dataMode` honestly (marker in the header); no native
`title=` tooltips (use `aria-label` + custom tooltip); accent reserved for the thesis mark;
mobile = touch-guided exhibit (full visibility default, tap emphasizes); title dominates
(`clamp 17–22px`); methodology behind progressive-disclosure `Details`.

---

## P4-03 — "The Tax Wedge"

- **chartId (proposed):** `p4-tax-wedge` · **group/part:** `part-4` · **experienceRole:** `comparison`
- **Purpose.** Show, in one picture, how much of a right-tail outcome each wrapper *keeps* after tax friction — establishing wrapper choice as a dominant, arithmetic return multiplier. **Canonical home = Part 4** (Part 5 references it; approved decision 1).
- **Reader question answered.** "If a position wins big, how much do I actually keep in each account type — and why does the gap widen the bigger the win?"
- **Target doc section.** Part 4 → *Roth Prioritization – Capturing Tax-Free Convexity* (at the MDX comment placeholder already inserted before the "Scenario / Comparison" callout).
- **Data / concept inputs.** Retained-fraction of gains by wrapper (from the doc): **Roth ~100%** · **Taxable ~75–85%** (15–23.8% LTCG+NIIT) · **Pre-Tax ~60–80%** (ordinary income on withdrawal). Secondary axis: the wedge *widens* as gross return rises (the $7,500 → $750,000 100× illustration). `dataMode: representative` (the retention bands are rule-of-thumb ranges, not a specific investor's return).
- **Visual layout.** Reuse the **stepped/comparison-bar** layout (same family as `p3-volatility-is-the-toll` bar + `p1-cpi-assets` gap composition). Three horizontal retained-value bars (Roth / Taxable / Pre-Tax), each filled to its retained fraction against a common 100% reference rule; the **un-retained tail (the "wedge")** is the shaded gap that grows toward the right as the gross outcome scales. Roth's bar is the accent (thesis) mark; the other two recede.
- **Labels & legend.** Direct end-labels per bar ("Roth · keeps ~100%", "Taxable · ~75–85%", "Pre-Tax · ~60–80%"); the 100% reference is a dashed rule labeled "gross gain"; **no separate legend** (direct labels only). The wedge shading is labeled once ("tax friction — widens with the size of the win").
- **Caption ("what this chart proves").** *"Roth eliminates tax leakage entirely; taxable and pre-tax each surrender a slice of the win — and the slice grows the bigger the win. Wrapper placement is arithmetic, not opinion."*
- **Mobile readability.** `chartHeight: standard`; horizontal bars stack naturally; `interaction: tap-cycle` (tap a wrapper to emphasize its retained bar + wedge; others dim to ~0.5, never disappear). No horizontal overflow. The detailed $750k borrow-against methodology stays in the callout below the exhibit (progressive disclosure), never on the exhibit face.
- **Implementation complexity.** **Low–moderate.** Reuses the existing bar layout + wedge/gap shading pattern already proven in `p1-cpi-assets`. No new interaction type.
- **Nature.** **Static / representative today; dashboard-connected later** (the app computes real per-position after-tax outcomes — a live version is a future numeric-integration track, not this slice).

---

## P5-01 — "The Three Postures"

- **chartId (proposed):** `p5-three-postures` · **group/part:** `part-5` · **experienceRole:** `matrix`
- **Purpose.** Make the core Part 5 mental model legible: Torque / Ballast / Hype are **behavioral** classes with distinct upside, drawdown tolerance, recovery expectation, governance, and CIS-sizing — not asset types. Signature-quality (replaces a wall-of-text Callout).
- **Reader question answered.** "How do Torque, Ballast, and Hype actually behave differently — and how does that change how I size and govern each?"
- **Target doc section.** Part 5 → *Why Three Postures?* (opening the posture block, before the per-posture sections).
- **Data / concept inputs.** Per posture (from the doc): **upside shape** (nonlinear / capital-preserving / narrative-driven), **drawdown tolerance** (50–70% / low / 15–25% stop), **recovery expectation** (regime-backed / stable / none), **CIS→sizing band** (Torque 3–15%, Ballast 2–8%, Hype 1–5% with 10% aggregate cap), **governance signature** (momentum tripwire / rotation reserve / hard stop). `dataMode: conceptual` (behavioral space, no numeric axes).
- **Visual layout.** Reuse the **matrix** layout (rows = the three postures; columns = the behavioral dimensions upside · drawdown · recovery · sizing band · governance). Each cell is a compact glyph/mini-bar, not text. The **sizing-band column** carries a small stepped bar per posture (the CIS→allocation link — this is the "sizing" half of the "posture/sizing map"). Accent marks the *distinguishing* trait per row (Torque's convex upside; Ballast's flat-through-stress; Hype's no-floor).
- **Labels & legend.** Row labels = posture names (color-coded once); column headers = the five dimensions; a single quiet legend maps the three posture accents. Direct in-cell labels for the sizing bands ("3–15%", etc.).
- **Caption ("what this chart proves").** *"Every position is exactly one posture. Posture — not asset type — sets its upside, its drawdown tolerance, whether it can recover, and how much it earns. Torque without Ballast is fragile; Hype without governance is ruin."*
- **Mobile readability.** `chartHeight: auto` (matrix is content-sized); on narrow viewport the matrix reflows to **one posture card per row** (`interaction: tap-cycle` — tap a posture to expand its five dimensions). Keep cell labels legible; never a shrunk desktop grid.
- **Implementation complexity.** **Moderate.** The matrix layout exists conceptually (the `scorecard` renderer — formerly *One Asset, Ten Tests*, since retired to a native Part 3 comparison table) but a 3×5 posture matrix with embedded mini-bars is a new composition — the richest of the four. Consider shipping a v1 as posture rows + a companion CIS-sizing stepped bar (P5-02) if the combined matrix proves heavy.
- **Nature.** **Conceptual today; dashboard-connected later** (the app already classifies positions by posture + sizes from CIS — a live "your portfolio's posture map" is a future integration).

---

## P6-01 — "The Two-Score Architecture" (CIS × FIS)

- **chartId (proposed):** `p6-scoring-architecture` · **group/part:** `part-6` · **experienceRole:** `diagram`
- **Purpose.** Show the execution kernel's architecture in one exhibit: **CIS** measures *position quality* (weighted components) and **FIS** measures *construction integrity* (subtractive penalties), and they are **independent** — neither compensates for the other.
- **Reader question answered.** "What are the two scores, what feeds each, and why do I need both to be healthy?"
- **Target doc section.** Part 6 → *CIS × FIS Interaction* (as the section's anchor exhibit; the CIS-components and FIS-buckets detail sit in their own sections as P6-01's supporting sub-exhibits P6-02/P6-05).
- **Data / concept inputs.**
  - **CIS side (additive to 100):** Convexity 40% · Risk 25% · Macro 25% · Execution 10% (spec-aligned, `ACF_CIS_Specification_v2.1.md`).
  - **FIS side (subtractive from 100):** starts at 100, deducts bucket penalties (Allocation Drift 25 · Tax 20 · Governance 15 · Dead Capital 15 · Concentration 15 · Posture Drift 10 · Complexity 10-cap) (`ACF_FIS_Specification_v1.1.1`).
  - **Independence:** the 2×2 diagnosis (High/High healthy · High-CIS/Low-FIS = construction issue · Low-CIS/High-FIS = quality issue · Low/Low = comprehensive).
  - `dataMode: conceptual`.
- **Visual layout.** A **two-panel diagram**: left panel = CIS as a **weighted composition** (donut or stacked-weight bar, C dominant); right panel = FIS as a **subtractive gauge** (100 minus stacked bucket deductions — a compact waterfall). A connective spine shows the two are separate inputs feeding one **independence quadrant** (reuse the `quadrant` layout from `dl-regime-map` L2) — the CIS×FIS 2×2. One exhibit, three linked registers (compose · deduct · diagnose).
- **Labels & legend.** CIS slices direct-labeled with weights (C 40% etc.); FIS deductions labeled by bucket + max points; the quadrant axes labeled "Position quality (CIS)" × "Construction integrity (FIS)". Accent reserved for the "both healthy" quadrant cell.
- **Caption ("what this chart proves").** *"Two scores, one system: CIS grades the positions you picked; FIS grades how you assembled them. They don't trade off — a great position in the wrong wrapper still costs FIS points, and a tidy portfolio of mediocre positions is still mediocre. Both must be healthy."*
- **Mobile readability.** `chartHeight: tall`; the three registers **stack vertically** on narrow viewport (compose → deduct → diagnose), each tap-to-inspect. Keep the quadrant square and labels legible; don't crush the three panels side-by-side on mobile.
- **Implementation complexity.** **Moderate–high.** Composes three sub-registers (donut/weight-bar + waterfall + quadrant). If heavy, ship the **quadrant** as P6-01 v1 (reusing L2's layout) and land the CIS-donut (P6-02) + FIS-waterfall (P6-05) as its companions.
- **Nature.** **Conceptual today; dashboard-connected later** (the app computes live CIS + FIS — a live "your two scores" architecture view is a strong future integration).

---

## P6-04 — "The Weekly Loop"

- **chartId (proposed):** `p6-weekly-loop` · **group/part:** `part-6` · **experienceRole:** `diagram`
- **Purpose.** Turn the plain-text "01/02/03/04" weekly sequence into a real operating loop, teaching the smallest governing cycle: **CIS → FIS → Governance checks → Action → (repeat).**
- **Reader question answered.** "What do I actually do each week to keep the framework alive?"
- **Target doc section.** Part 6 → *Weekly Workflow* (replacing the loose numbered "01–04" text render).
- **Data / concept inputs.** The four stations (from the doc): **① CIS updates** (C/R/M/E → archetype mods → delta-clamp → log) · **② FIS calculation** (penalties by bucket → value-weight → 100 − Σ) · **③ Governance checks** (earnings T-5 · momentum 3-dimensions · tripwires · posture drift) · **④ Action determination** (tripwire → immediate · earnings → trim to 3% · FIS <70 → fix top penalty · CIS drift >10 → resize · else hold), returning to ①. `dataMode: conceptual`.
- **Visual layout.** Reuse the **governanceLoop** layout already built for `dl-tripwire-loop` (L3) — a calm left-to-right path with a return arc, four labeled stations, one governing checkpoint (the Governance-checks gate). This is the *engine's beginner-governance-diagram pattern* ("show the smallest loop that teaches the mental model," README §Beginner governance diagrams) applied to the weekly cadence. Advanced branch logic (the full action tree) stays in the doc prose / `Details`, not on the loop face.
- **Labels & legend.** Four station labels (CIS · FIS · Governance · Action) with a one-line sub-label each; the return arc labeled "weekly"; the Governance station marked as the gate. No legend needed.
- **Caption ("what this chart proves").** *"The framework is a loop, not a checklist: score the positions, score the portfolio, run the governance gates, then act — or hold — and do it again next week. Decay only shows up week over week."*
- **Mobile readability.** `chartHeight: standard`; the loop scales as a diagram; on narrow viewport the four stations become a **vertical flow with the return arc** (`interaction: tap-cycle` — tap a station to reveal its sub-steps). Diagram, not a shrunk ring.
- **Implementation complexity.** **Low.** Directly reuses the shipped `governanceLoop` layout (L3) with new station copy — the cheapest of the four to build.
- **Nature.** **Conceptual, docs-only** (a teaching diagram; no live-data dependency).

---

## Build-order note (for the follow-up slice)

Recommended construction order when design is approved: **P6-04** (cheapest — reuses `governanceLoop`) → **P4-03** (reuses bar/gap layout) → **P6-01** (compose from quadrant + donut + waterfall; ship quadrant first if heavy) → **P5-01** (richest — the 3×5 posture matrix). Registration into `chart-inventory.json` + `chart-specs.mjs` and `validate:charts` conformance happens **in that build slice**, not here.
