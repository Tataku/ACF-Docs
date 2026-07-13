# Framework Docs Parts 4–6 — Rewrite & Chart System Plan v1.0

> **Historical artifact (superseded 2026-07-13).** The "canonical target: MDX" line below
> reflects the since-corrected v1 of `FRAMEWORK_DOCS_CANONICAL.md`. Parts 4–6 shipped as
> Site B HTML with chart islands (Parts 5–6 via PR #137), and the MDX pages are deleted.
> The content audit + chart concepts here fed that work; kept for lineage only.

> **Mode:** DIAGNOSE → PLAN ONLY. No prose rewritten, no charts built, no HTML touched, no charts wired.
> **Mission-ID:** `mission.framework-docs.parts-4-6-rewrite-and-chart-plan`
> **Canonical target:** ACF-Docs MDX — `pages/part-4-*.mdx`, `part-5-*.mdx`, `part-6-*.mdx` (per `FRAMEWORK_DOCS_CANONICAL.md`).
> **Date:** 2026-07-07 · **Author:** autonomous run (first full closed-loop system test).

**What was inspected (and why) — token log.** Started from the seeded mission + `FRAMEWORK_DOCS_CANONICAL.md`. Read: the chart inventory as **structured fields only** (`chart-inventory.json`, 28 charts — extracted with a script, not read whole); the three subject files in full (`part-4` 466L, `part-5` 431L, `part-6` 244L — the rewrite subject); the engine doctrine (`README-agency-chart-handoff.md`, design-standard region). Targeted drift check: `ACF_CIS_Specification_v2.1.md` + `ACF_FIS_Specification_v1.1.1` component weights vs Part 6; the ledger Decision Log for scoring-model evolution. **No whole-repo sweep.** Total in-scope reads ≈ 1,300 lines + one structured JSON extract.

---

## Table of Contents
- [A. Parts 4–6 Audit](#a-parts-46-audit)
- [B. Parts 4–6 Rewrite Plan](#b-parts-46-rewrite-plan)
- [C. Chart Inventory Triage (existing 28)](#c-chart-inventory-triage-existing-28)
- [D. Net-New Parts 4–6 Chart Plan](#d-net-new-parts-46-chart-plan)
- [E. Chart Legibility Standard](#e-chart-legibility-standard)
- [F. Execution Sequence](#f-execution-sequence)
- [G. System Test Report](#g-system-test-report)

---

## A. Parts 4–6 Audit

**Headline:** Parts 4–6 are **strong, current, well-cited content** — not stale prose. The dominant need across all three is **legibility and teaching-exhibit support**, not rewriting for correctness. Each part is dense, and each contains at least one **plain-text pseudo-diagram** (a decision tree / numbered sequence rendered as loose text) that should be a real exhibit. Parts 4–6 have **zero chart coverage today** — every teaching exhibit is net-new.

### Part 4 — Tax Architecture & ROC Strategy
- **Teaches:** wrapper engineering as a dominant structural return multiplier — route convexity to the lowest-lifetime-friction wrapper (Roth for rotating Torque; taxable for never-sold Bitcoin + STRC ballast + TLH; pre-tax tactical only).
- **Strengths:** thorough, cited to 2026 IRS limits (`Notice 2025-67`), risk-disclosed, advisory-safe, real case studies. **Content is current.**
- **Weaknesses / needs:**
  - **Dense wall-of-text Callouts.** The `$750k` 3-wrapper scenario (L146) and the tax-wedge retention numbers (L152) are crammed into single run-on paragraphs — the single best chart candidates in the part, currently unreadable as prose.
  - **Plain-text pseudo-diagram.** "WRAPPER ROUTING — DECISION TREE" (L78) renders `STEP 1/2/3` with `✓/✗` as loose text — should be a real decision-tree exhibit.
  - **Formatting seam.** "Wrapper Engineering North Star" appears as loose text (L29) then immediately as a bold restatement (L33).
  - **Misplaced subsection.** "Options in Roth Accounts" (L305) sits inside the **Taxable Accounts** section — it is a Roth topic.
  - **Light repetition.** "Roth capacity is scarce → reserve for Torque" is stated ~4× (L33/66/104/166/168) — tighten to one canonical statement + references.

### Part 5 — Portfolio Construction & Position Management
- **Teaches:** the three behavioral postures (Torque / Ballast / Hype), position sizing from CIS bands, and the governance protocols (earnings proximity, momentum tripwires, regime throttling, rebalancing, thesis invalidation, doctrine/parameters/overrides).
- **Strengths:** the most comprehensive part; strong tables (CIS→sizing, momentum alignment, sector limits, earnings protocol). **This is the most chart-hungry part.**
- **Weaknesses / needs:**
  - **Cross-part duplication.** The "wrapper placement dominates" terminal-wealth example (L351: `$875k` vs `$1.745M`) is a near-duplicate of Part 4's tax-wedge scenario (L146). **Consolidate into one canonical exhibit, referenced from both parts.**
  - **Wall-of-text characteristic Callouts.** Torque/Ballast/Hype "Characteristics" Callouts each cram 4 bolded sub-points into one paragraph.
  - **Momentum content split.** Appears in Torque governance (L90) and again in the dedicated Momentum Heuristics section (L229) — minor overlap.
  - **The case study (L419)** is a giant single-paragraph Callout — prime candidate for a structured allocation exhibit + table.

### Part 6 — Convexity & Framework Integrity Scoring
- **Teaches:** the execution kernel — CIS (position quality, 0–100, C40/R25/M25/E10) + FIS (portfolio integrity, subtractive from 100) + the weekly workflow.
- **Strengths / drift check:** **content is ALIGNED with the specs, NOT stale.** CIS weights match `ACF_CIS_Specification_v2.1.md:63-66` exactly; FIS structure matches `ACF_FIS_Specification_v1.1.1`. The CIS/FIS boundary is crisply scoped.
- **Weaknesses / needs:**
  - **Legibility, not correctness.** Part 6 is table-heavy and terse; the concepts (delta clamping, archetype awareness, subtractive FIS) each get one line. As a *teaching* doc it under-explains the mechanisms it tabulates.
  - **Plain-text pseudo-diagram.** The weekly workflow "01/02/03/04" sequence (L143–165) renders as loose numbered text — should be a real step/loop exhibit.
  - **Documented drift (external, already handled):** the **master index overclaims** "Scoring Spec v3.2 / Parts 1-4 Complete" while the real specs are CIS 2.1 / FIS 1.1.1 and Parts 5–6 exist — bannered in the P0 pre-flight.
  - **Open question (owner):** newer app scoring surfaces — the **Framework Fit engine + Doctrine Audit + assetClass evidence dimension** (ledger Decision Log, 2026-07-05) — are not referenced in Part 6. Decide whether they are *framework doctrine* (belong in Part 6) or *product surfaces* (stay out).

---

## B. Parts 4–6 Rewrite Plan

> Section-by-section proposed architecture. **Preserve** = keep verbatim/lightly edited; **Add** = new; **Simplify/Remove** = tighten or cut. Chart placements reference §D IDs.

### Part 4 — Tax Architecture & ROC Strategy
- **Role in doctrine:** capital *routing* once convexity is selected — the "how do you keep it" layer between asset selection (Parts 1–3) and construction (Part 5).
- **Recommended sections:** (1) Why wrapper engineering is a structural edge (the lineage gap) · (2) The Three-Wrapper Architecture **[P4-01]** · (3) Wrapper Routing Decision Tree **[P4-02]** · (4) Roth Prioritization (tax-free convexity) **[P4-03 tax wedge]** · (5) Taxable — STRC ballast, ROC, TLH **[P4-04]** · (6) Pre-Tax — inferiority + tactical use **[P4-05 gross-not-net]** · (7) Legislative resilience.
- **Preserve:** the lineage-gap argument; 2026 IRS figures; STRC risk disclosures; case studies; advisory-safe footers.
- **Add:** exhibits P4-01…P4-05; a one-line canonical "Roth is scarce → reserve for Torque" statement.
- **Simplify/Remove:** dedup the 4× Roth-scarcity refrain to one statement; move "Options in Roth" **out of** Taxable into a Roth subsection; fix the North-Star formatting seam.
- **Open owner decisions:** does the canonical wrapper-comparison exhibit **[P4-03]** live in Part 4 or Part 5 (it is referenced by both)? Recommendation: **build once in Part 4, reference from Part 5.**

### Part 5 — Portfolio Construction & Position Management
- **Role in doctrine:** translate wrapper-optimized architecture into concrete positions + the governance that holds integrity through cycles.
- **Recommended sections:** (1) Why three postures **[P5-01]** · (2) Torque (eligibility, sizing **[P5-02]**, routing, governance) · (3) Ballast (eligibility, sizing, routing, governance) · (4) Hype (Hype-vs-Torque, governance) · (5) Position Management — earnings proximity **[P5-04]**, momentum tripwire **[P5-05→ note: use P5-03]**, regime throttling, rebalancing, invalidation · (6) Doctrine / Parameters / Overrides · (7) Case study **[P5-05]**.
- **Preserve:** the three-posture definitions; all governance tables; the doctrine/parameters/overrides hierarchy; concentration + sector limits.
- **Add:** exhibits P5-01…P5-05; break the characteristic Callouts into scannable sub-blocks.
- **Simplify/Remove:** replace the L351 wrapper example with a **reference to the canonical P4-03 exhibit**; consolidate the two momentum passages into one canonical section referenced from Torque governance.
- **Open owner decisions:** should CIS→sizing charts **[P5-02]** live in Part 5 (application) or Part 6 (definition)? Recommendation: **application view in Part 5, definitional weighting in Part 6.**

### Part 6 — Convexity & Framework Integrity Scoring
- **Role in doctrine:** the measurement + enforcement kernel — quantifies and flags; introduces no new rules.
- **Recommended sections:** (1) Execution-kernel purpose · (2) CIS — scope, components **[P6-01]**, exclusions, mechanics · (3) FIS — subtractive model **[P6-02]**, buckets **[P6-05]**, interpretation · (4) CIS × FIS interaction **[P6-03]** · (5) Weekly workflow **[P6-04]** · (6) Failure modes · (7) Implementation options.
- **Preserve:** CIS weights + definitions (spec-aligned); FIS bucket table; the CIS×FIS 2×2; failure-mode diagnostics.
- **Add:** exhibits P6-01…P6-05; **more explanatory prose** for delta clamping, archetype awareness, and subtractive scoring (the mechanisms are currently one line each).
- **Simplify/Remove:** convert the "01–04" text sequence into the **[P6-04]** loop exhibit.
- **Open owner decisions:** (a) cross-reference Framework Fit / Doctrine Audit here, or keep them product-only? (b) reconcile the "v3.2" master-index label to the real CIS 2.1 / FIS 1.1.1 versions (or ship a genuine unified vX).

---

## C. Chart Inventory Triage (existing 28)

**Finding:** the existing 28 are **largely sound and part-appropriate** — the honest triage is mostly **KEEP + finish design**, not scrap. 19 are `needs-design-review` (finish), 7 `implemented` (keep), 2 `deferred` (keep-deferred). None of the Parts 1–3 charts "relocate" *into* Parts 4–6 (different concepts), with **two Bitcoin-borrow exceptions** that overlap Part 4.

| ID | Chart | Part | Status | Verdict | Why / notes | Priority |
|---|---|---|---|---|---|---|
| S1 | sig-payoff | both | needs-design-review | **Redesign / pick-one** | Payoff-curve signature. `agencyNotes`: marketing to decide payoff vs distribution vs both — S1/S2 are alternates; ship one as the primary signature. | P1 |
| S2 | sig-shape | landing | needs-design-review | **Defer / pick-one** | Distribution-reshape alternate to S1. Defer unless both are wanted. | P2 |
| L1 | dl-convexity-window | landing | implemented | **Keep** | Landing convexity-window; done. | — |
| L2 | dl-regime-map | landing | needs-design-review | **Keep + finish** | Quadrant regime map (Part 2 concept). Finish design. | P1 |
| L3 | dl-tripwire-loop | landing | needs-design-review | **Keep + finish** | Beginner governance loop. Reusable pattern for **[P6-04]**. | P1 |
| 01–06 | p1-hedge-broke … p1-convexity-survival | part-1 | implemented ×6 | **Keep** | Part 1 fully charted; strong set. No action. | — |
| P2-01…P2-09 | part-2 set (9) | part-2 | needs-design-review ×9 | **Keep + finish** | All 9 are part-appropriate; finish design. `feedbackLoop` (P2-04), `bridge` (P2-06), `gate` (P2-07) layouts are reusable for Parts 4–6 exhibits. | P1 |
| P3-01…P3-06 | part-3 set (6) | part-3 | needs-design-review ×6 | **Keep + finish** | Part-appropriate; finish design. | P1 |
| P3-07 | p3-cold-storage-to-borrow | part-3 | deferred | **Keep-deferred + cross-ref Part 4** | Bitcoin borrow-against (SBLOC/PAL) — **overlaps Part 4's borrow-against tax content.** Cross-reference from Part 4; do not duplicate. | P2 |
| P3-08 | p3-reserve-share-evolves | part-3 | deferred | **Keep-deferred + cross-ref Part 4/5** | Reserve 10–15%→30–50% evolution — relates to Part 4 wrapper + Part 5 sizing. Cross-reference. | P2 |

**Scrap:** none recommended. **Relocate:** none (S1/S2 is a pick-one, not a relocate; P3-07/08 are cross-references, not moves).

---

## D. Net-New Parts 4–6 Chart Plan

> Every proposal maps to an **existing engine layout** (matrix / gate / bridge / quadrant / systemLoop / stepped-bar) so it is buildable without new primitives. `dataMode` per engine honesty rules. "Destination": docs = the Nextra pages; dashboard-later = the app already computes this (CIS/FIS/posture), so a live version is a future integration — **not built now**.

### Part 4 (5 proposed)
| ID | Name | Section | Reader question | Inputs | Visual form | Why it teaches | Mode / destination |
|---|---|---|---|---|---|---|---|
| P4-01 | The Three Wrappers | Three-Wrapper Architecture | "Which account holds which kind of asset, and why?" | Roth/Taxable/Pre-tax × payoff-behavior (rotate / never-sell / tactical) | matrix (3×N) | Matches payoff+turnover to tax treatment at a glance | conceptual · docs |
| P4-02 | Routing the Dollar | Wrapper Routing | "Where does new capital go?" | the L78 decision tree (match → Roth → route by type) | `gate`/`bridge` cascade | Replaces the plain-text pseudo-tree with a real branching exhibit | conceptual · docs |
| P4-03 | The Tax Wedge | Roth Prioritization | "How much of a right-tail win do I keep per wrapper?" | Roth ~100% / Taxable 75–85% / Pre-tax 60–80% retained; widens with return | stepped/wedge bars | **The canonical wrapper-comparison** (consolidates Part 4 L146 + Part 5 L351) | representative · docs (+ dashboard-later) |
| P4-04 | ROC Changes the Yield | Taxable / STRC | "Why does an 11% ROC yield beat a taxed dividend?" | STRC 11% ROC vs dividend at 23.8% → effective yield | comparison bars | Shows the basis-reduction mechanism, not just the number | representative · docs |
| P4-05 | Gross Is Not Net | Pre-Tax | "Why is a pre-tax balance a shared claim?" | balance vs embedded tax claim compounding together | single (two-line) | Makes the joint-ownership idea visible | conceptual · docs |

### Part 5 (5 proposed) — the chart-hungry part
| ID | Name | Section | Reader question | Inputs | Visual form | Why it teaches | Mode / destination |
|---|---|---|---|---|---|---|---|
| P5-01 | The Three Postures | Why Three Postures | "How do Torque/Ballast/Hype behave differently?" | posture × (upside, drawdown tolerance, recovery, governance) | matrix / behavioral space | **Signature-quality** core mental model; currently a wall-of-text Callout | conceptual · docs (+ dashboard-later) |
| P5-02 | Conviction Sizes the Position | Torque/Ballast Sizing | "How does CIS map to position size?" | CIS bands (70+/60–69/50–59/<50) → allocation, Torque vs Ballast | stepped-bar (paired) | Shows proportional sizing without manual judgment | representative · docs (+ dashboard-later) |
| P5-03 | The Momentum Tripwire | Momentum Heuristics | "When does momentum override conviction?" | 3 dimensions → sizing action; all-3-negative = exit | scorecard / gate | Makes the "exit even if CIS high" tripwire unmistakable | conceptual · docs |
| P5-04 | The Earnings Window | Earnings Proximity | "What do I do as earnings approach?" | T-21…T+6 protocol timeline | timeline | Converts the protocol table into a scannable time axis | conceptual · docs |
| P5-05 | A Constructed Portfolio | Case Study | "What does a real three-posture book look like?" | 45/30/5 + 20% BTC, per-position CIS | allocation / treemap | Turns the giant case-study Callout into one legible exhibit | representative · docs |

### Part 6 (5 proposed) — scorecard/diagram goldmine
| ID | Name | Section | Reader question | Inputs | Visual form | Why it teaches | Mode / destination |
|---|---|---|---|---|---|---|---|
| P6-01 | What CIS Weighs | CIS Components | "What drives a position's score?" | C40 / R25 / M25 / E10 | donut / weighted-bar | **Signature-quality**; the scoring identity at a glance | conceptual · docs (+ dashboard-later) |
| P6-02 | FIS Deducts | FIS Architecture | "How does a good book lose points?" | 100 − Σ(bucket penalties) | waterfall | Makes subtractive scoring intuitive | conceptual · docs (+ dashboard-later) |
| P6-03 | Two Scores, One Diagnosis | CIS × FIS | "What does high/low CIS × high/low FIS mean?" | the 2×2 diagnosis matrix | quadrant (reuse L2 layout) | Shows the two axes are independent | conceptual · docs |
| P6-04 | The Weekly Loop | Weekly Workflow | "What is the operating cadence?" | CIS → FIS → Governance → Action → (repeat) | systemLoop (reuse L3 pattern) | Replaces the "01–04" text sequence with a real loop | conceptual · docs |
| P6-05 | Where FIS Bleeds | FIS Penalty Buckets | "Which violations cost the most?" | 7 buckets × max penalty | horizontal bar | Ranks remediation priority | conceptual · docs |

**Total net-new: 15 proposals** (5 per part). Recommend building the **4 signature-quality ones first** (P4-03, P5-01, P6-01, P6-04), which also carry the most teaching load and reuse existing layouts.

---

## E. Chart Legibility Standard

> **This codifies the existing engine doctrine** (`README-agency-chart-handoff.md` + `chart-specs.mjs` + `validate:charts`) into a reusable per-chart checklist. It **extends, does not replace** — do not diverge from the engine doctrine.

**The six questions every chart must answer, in order** (from the engine doctrine): *What am I looking at? What changes? Why? What can I touch? What does my input affect? What is the one idea to remember?* If it can't, it isn't finished.

1. **One chart = one claim.** A single `primaryClaim` + its `visualProof`; everything else supports it. If it teaches two things, split it.
2. **Show the mechanism, not just the result.** Visualize the *how* (the shared deck, the units = $÷price, the retained-fraction wedge), never an unshown "identical" input.
3. **Math-backed where math is claimed.** If a formula is asserted, show it or its visual equivalent (e.g. `retained = 1 − effective tax`).
4. **Naming.** `chartId` = `p{N}-{kebab-claim}` (e.g. `p4-tax-wedge`); `title` = a short, active claim ("The Tax Wedge", "The Three Postures"), never a topic label ("Tax chart").
5. **Labels & axes.** Direct end-labels over inline legends; no unexplained axes; conceptual charts carry **no numeric axes** by design; units stated once, honestly.
6. **Color.** Accent reserved for the thesis line / selected path only; structural context low-contrast; **semantic ≠ decorative** — `backgroundRole` must be `regime·pressure·relational·revealLayer`, **never decorative**. Theme-aware (light+dark); meaning never carried by color alone.
7. **Legends.** Prefer no legend (direct labels); when unavoidable, keep it inside the card, quiet, and secondary to the marks.
8. **Data honesty (mandatory, `validate:charts`-enforced).** Declare `dataMode` (`conceptual ◌ · representative/simulation ◇ · historical ▪`); the header marker shows *what kind of exhibit this is*; representative geometry is **never** labeled exact data; simulations say simulation; no promissory/forecast copy.
9. **"What this chart proves" copy.** Every chart carries a `readerTakeaway` (the one remembered idea) and a `visualProof` (what on-screen backs the claim). The takeaway is the last beat; it is not decoration.
10. **Explanatory captions & progressive disclosure.** Story first (header → intro → visual → explainer/takeaway); citation/methodology **one click away** in `Details`. Do not let citation mechanics compete with the visual claim.
11. **Mobile readability.** A mobile chart is a **touch-guided exhibit, not a shrunk hover chart**: full visibility by default, tap emphasizes (never replaces), `tall` layouts get ~20% more height, 44px controls, sliders are touch-first. Interaction taught once at page level, not per chart.
12. **Older-reader legibility.** Title dominates (`clamp(17–22px)`); readable subtitle; calm metadata; spacing does the work — no boxes, no louder UI, no tiny repeated helper text.
13. **No native browser tooltips.** `title=` is banned in the chart card; use `aria-label` + the custom tooltip/popover + `Details`.
14. **Interaction matches concept.** before/after = spatial reveal (not opacity toggle); scenario = alternate path; a "Try this" cue only on interaction-central charts; hover-only charts get none.
15. **When to avoid a chart entirely.** If the idea is a single number, a short list, or a definition, use **type, not a chart** — a chart with no mechanism to show is ornament. Prefer a table when the content is genuinely tabular (the CIS×FIS matrix is a legitimate quadrant *because* the two axes interact; a flat 3-row list is not).

---

## F. Execution Sequence

> Recommended order of operations. Rewrite and chart-design are **separate workstreams** that can run partly in parallel, but prose structure should settle before final exhibit placement.

1. **Owner decisions first (unblock the rest):** (a) canonical home for the shared wrapper-comparison exhibit — recommend **Part 4 [P4-03], referenced from Part 5**; (b) do Framework Fit / Doctrine Audit belong in Part 6? (c) master-index version reconciliation (v3.2 label vs CIS 2.1 / FIS 1.1.1). *(See §B open decisions.)*
2. **Rewrite Part 4 first.** Lowest coupling, clearest defects (dedup Roth-scarcity refrain, move "Options in Roth", fix the North-Star seam, convert the decision tree to a placeholder for [P4-02]). Establishes the canonical wrapper-comparison the other parts reference.
3. **Rewrite Part 5 second.** Depends on Part 4's canonical exhibit (replace the L351 duplicate with a reference); consolidate the two momentum passages; break up the characteristic Callouts.
4. **Rewrite Part 6 third.** Add explanatory prose for the mechanisms; convert the "01–04" sequence to a placeholder for [P6-04].
5. **Design the 4 signature charts first** (in parallel with the rewrites): **P4-03, P5-01, P6-01, P6-04** — highest teaching load, reuse existing layouts, unblock the densest sections.
6. **Then the remaining 11 net-new charts**, part by part, following the settled prose structure.
7. **Finish the 17 `needs-design-review` existing charts** (Parts 2–3 + landing) as a separate, lower-urgency track — they are not blocking Parts 4–6.
8. **Scrap/defer early:** resolve S1-vs-S2 (pick one signature) before investing in both; keep P3-07/P3-08 deferred (cross-reference from Part 4, don't rebuild).
9. **Wait on:** public wiring (all charts are `wiredPublic:false` — wiring is a **separate decision from design approval**, do not wire during design); any dashboard-connected live versions of P4-03/P5-01/P5-02/P6-01/P6-02 (future integration track, not this mission).

**Which decisions need Dale:** the three in step 1, plus final sign-off on the net-new chart list before design begins, plus the S1/S2 pick-one.

---

## G. System Test Report

**Verdict: the closed loop worked for discovery + planning.** Chaz identified the work, distinguished rewrite from chart-design from chart-mapping, triaged the existing exhibits, proposed a grounded net-new set, and produced an execution sequence — **without Dale re-explaining the system.** The P0 pre-flight (canonical note + seeded mission + chart entry point) was the enabling factor.

**What Chaz discovered without Dale:**
- Parts 4–6 are strong/current, not stale — the real need is legibility (grounded in reading all three, not assumed).
- A **systemic legibility defect**: plain-text pseudo-diagrams in Part 4 (decision tree) and Part 6 (weekly sequence).
- **Cross-part duplication**: the wrapper-comparison example in both Part 4 and Part 5 → one canonical exhibit.
- **Concrete doctrine-drift**: Part 6 content is spec-aligned (CIS 2.1 / FIS 1.1.1); the drift is in the master-index version label + un-referenced newer app scoring surfaces.
- The chart inventory made triage trivial — Parts 4–6 = 0 charts made "net-new" unambiguous; all 28 `wiredPublic:false` made the wiring-vs-design distinction clean.

**What still required manual context / owner judgment (not autonomously resolvable):**
- The three §B/§F open decisions (canonical exhibit home; Framework-Fit-in-Part-6; version reconciliation) are genuinely owner calls, not discoverable from repo state.
- Whether the newer app scoring surfaces are *doctrine* or *product* — a product-strategy judgment.

**Where repo state helped:** `FRAMEWORK_DOCS_CANONICAL.md` (canonical target + chart entry point + token rules) removed all rediscovery; `chart-inventory.json` is genuinely machine-readable and part/status-tagged; the engine doctrine README made the legibility standard a distillation, not an invention; the ledger Decision Log surfaced scoring-model evolution.

**Where repo state was missing/stale:** the master index's phantom "v3.2 / Parts 1-4 Complete" (bannered in P0, not yet reconciled to real versions); no per-part "chart placement intent" doc (the inventory says what charts *exist*, not where a part *wants* exhibits — this plan fills that gap); the newer scoring surfaces (Framework Fit / Doctrine Audit) have no doc-side pointer.

**Token efficiency:** disciplined. Chart inventory read as **structured fields only** (not the 2,268-line file); reads scoped to exactly the 3 subject files + the doctrine region + one targeted spec-drift grep; **no whole-repo sweep**; no agent fan-out (inline targeted reads were cheaper and gave coherent cross-part context — a deliberate choice after the prior audit's fan-out burned ~1.4M tokens on a too-strict schema). Total in-scope ≈ 1,300 lines + one JSON extract + a few greps.

**What to improve before the next autonomous run:**
1. **Reporting is still markdown + ledger + PR, not the Admin cockpit** — the cockpit is not agent-writable (per the readiness audit); this plan is committed as a reviewable artifact, not surfaced in Admin. Unchanged limitation; not a blocker.
2. Add a lightweight **per-part "chart intent" field** to the docs (or fold this plan's §D into a durable per-part note) so the *next* run inherits the mapping instead of re-deriving it.
3. Reconcile the master-index version label (a P1 doc cleanup) so future runs don't re-flag the same phantom-version drift.
4. The three owner decisions should be captured as **decision receipts** (ledger) once made, so subsequent implementation runs inherit them.

**Definition of done:** met — a complete, review-ready plan for cleaning up Parts 4–6 and redesigning the chart system, plus this system-test report. **No prose rewritten, no charts built, no charts wired, no HTML touched, no PR, no merge.**
