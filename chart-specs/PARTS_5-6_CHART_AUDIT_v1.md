# Parts 5–6 Chart Audit & Doctrine Reconciliation — v1.0

> **Mission:** Site B migration of Parts 5–6 with the full teaching-exhibit set.
> **Mode:** AUDIT → RECONCILE → IMPLEMENT (this document is the pre-implementation audit deliverable).
> **Date:** 2026-07-13 · **Branch:** `claude/acf-parts-5-6-audit-haxiqw`
> **Supersedes/extends:** `PARTS_4-6_REWRITE_AND_CHART_PLAN_v1.md` §D (P5-01…05 / P6-01…05) with the owner's
> expanded 15-chart required set (5.1–5.10, 6.1–6.5). `SIGNATURE_CHART_SPECS_SLICE_1.md` design intent for
> P5-01 / P6-01 / P6-04 is honored where the new set covers the same concept.

---

## 1. Doctrine reconciliation (performed BEFORE chart design)

Canonical source hierarchy established: **CIS Spec v2.1 + FIS Spec v1.1.1 (2026-02-07) + the coded engine
(`ACFDashboard/src/core/domain/regimePortfolio/part5AllocationBands.js` v2.1.0)** > Part 5/6 MDX (aligned) >
Governance Protocol v1.0 (2026-01-15) > older wiki/master-index artifacts.

### 1.1 The central finding — the mission premise is inverted

The suspected-stale Part 5 four-band sizing table (**70+ → 8–15% · 60–69 → 4–8% · 50–59 → 2–4% · <50 → 0%**)
is **the CURRENT canonical doctrine**. CIS Spec v2.1 §12 explicitly records the migration *from* the older
six-band granular ladder (90–100 → 12–18% …) *to* these four bands. The coded engine matches the four bands
verbatim.

**The "Earned Conviction Ladder" is OWNER-DEFINED DOCTRINE awaiting repository canonicalization** — it does
not yet exist as a canonical repo artifact (searched ACFDashboard, chaz-automation, ACF-Docs under every
plausible phrasing including the six stage names), which is different from not existing as doctrine. The
owner principle stands: *maximum justified size is not the same as currently earned size*, expressed through
the intentional six-stage evidence progression. Ruling for Chart 5.2 (revised per owner review of PR #137):

- Chart 5.2 is a **pure six-stage evidence progression** (Thesis exposure → Commercial validation → Initial
  execution → Scale execution → Economic proof → Exceptional platform quality), `dataMode: conceptual`,
  sourced as owner doctrine awaiting canonical spec.
- It carries **no percentages and no CIS-band assignments** — an earlier draft's hover copy implicitly mapped
  stages onto bands, which contradicted its own no-mapping caveat; that mapping has been removed entirely.
- **All numeric sizing lives in Chart 5.3** and the adjacent canonical tables, preserving the separation
  between earned evidence and the maximum CIS-justified ceiling.

### 1.2 Canonical values encoded in the charts (with sources)

> **Superseded in part by §6 (live-app continuity pass, 2026-07-13).** Rows below reflect the spec-level
> reconciliation of the first pass; where the LIVE engine diverges (FIS buckets/bands, archetypes, clamp
> tiers, confidence derivation, momentum/throttle implementation status), **§6 governs** and the shipped
> pages/exhibits follow §6.

| Rule | Canonical value | Source |
|---|---|---|
| Torque sizing | 70+ → 8–15% · 60–69 → 4–8% · 50–59 → 2–4% · <50 → 0% | CIS v2.1 §10.2 · `part5AllocationBands.js` |
| Ballast sizing | 70+ → 5–8% · 60–69 → 3–5% · 50–59 → 1–3% · <50 → 0%; single max 10%; aggregate ≤40%; minimum reserve 15% | CIS v2.1 §10.2–10.3 |
| Hype | eligible from CIS ≥50 · 2–5% per position (5% hard max, no override) · 10% aggregate cap · stops 15–25% · time limit 3–6 months | coded `part5AllocationBands.js` HYPE_BANDS · CIS v2.1 §10.2 |
| Single position | 15% default max · 18% absolute with documented override | CIS v2.1 §10.3 |
| Concentration | Top-3 ≤35% · Top-5 ≤50% (portfolio aggregate, ex-Bitcoin) | CIS v2.1 §10.3 |
| Sector limits | Single sector ≤30% (ex-BTC) · top-2 sectors ≤50% · regime-challenged ≤10% | Part 5 §Sector Allocation |
| Earnings proximity | T-21→T-6 initiation blackout (priced-for-perfection) · T-5→T-1 cap position at 3% · T+0 observe · T+1→T+5 assess · T+6+ rebuild if confirmed; exempt: Bitcoin, broad ETFs, Ballast ≤5% non-thesis-critical | Governance v1 §3 · Part 5 |
| Momentum gate | Absolute (52-wk-high distance: within 10% healthy · 25%+ correction · 40%+ severe) · Relative (vs sector/market) · Breadth (participation). Ladder: 3 positive → full CIS sizing · 1 breaks → reduce 25–30% · 2 break → watch, minimal new exposure · 0 positive → exit tripwire (re-entry permitted on repair) | Part 5 (current); Governance v1 §4.4 has older 30–50% single-break band — Part 5 v2.1-aligned value used |
| Liquidity throttle | Stressed: VIX sustained >25 · credit spreads widening · Torque correlation >0.7 → pause new adds, enforce limits, reduce gross 10–20%. Repair/resume: indicators normal 2+ weeks | Part 5 §Liquidity & Correlation |
| Wrapper example | $100k · 10% tax-free vs ~7.5% after-tax (25% blended) · 30y → ≈$1,745,000 vs ≈$875,000 · Δ≈$870,000. Checkpoints: 10y $259k vs $206k · 20y $673k vs $425k (1.10^t vs 1.075^t, verified) | Part 5 (canonical home); consolidation with P4-03 noted |
| CIS components | C 40% · R 25% · M 25% · E 10% (weights are Parameters, tunable C 35–45 / R 20–30; four-component structure is Doctrine). Higher R sub-score = greater survivability / lower fragility | CIS v2.1 §3–4 |
| CIS delta clamps | Low confidence ±3 · medium ±5 · high ±8 per update; initialization ±20 · material thesis change ±15 | CIS v2.1 §7 |
| FIS buckets | Allocation Drift 25 · Tax Architecture 20 · Governance 15 · Dead Capital 15 · Concentration 15 · Posture Drift 10 · Complexity 10 (hard cap); value-weighted severity 0.2% floor / 12% cap | FIS v1.1.1 §5–6 |
| FIS bands | 90–100 Excellent · 80–89 Good · 70–79 Acceptable · 60–69 Concerning · <60 Critical | FIS v1.1.1 §9.1 |
| CIS × FIS matrix | High >80 · Low <70; Maintain / fix construction / upgrade holdings / fix FIS first | Part 6 · FIS v1.1.1 |
| Weekly loop | CIS update (C/R/M/E → archetype → clamp → **log**) → FIS → governance gates → act-or-hold → record. Evidence logging is present in canonical step 01 | Part 6 §Weekly Workflow |
| Failure diagnostics | CIS stale >90 days · posture drift >10% from target · wrapper leakage 15–25% of terminal wealth over 20y · avg correlation >0.7 · recalc required after >50% appreciation | Part 6 §Failure Modes |
| Posture aggregates | Thesis-conditional Parameters (FIS v1.1.1 §11: e.g. 4T+AI Torque 60% (52–68) / Ballast 25% / Hype 5% / BTC 10%; Part 5 prose 40–60 / 20–35 / ≤10). Charts avoid hard-coding a single Bitcoin % | FIS v1.1.1 §11 · Part 5 |
| Bitcoin | Separately governed convexity backbone (Part 3): excluded from all concentration + sector limits, not rebalanced, never a rotation funding source | Part 3 · Governance v1 §8.1 |

### 1.3 Drift found OUTSIDE the target pages (reported, not silently fixed)

1. `chaz-automation/second-brain/wiki/framework/acf-portfolio-construction.md:228` still narrates the
   superseded six-band granular ladder — **stale vs CIS v2.1** (separate repo; flagged for owner).
2. FIS spec §7.5 concentration *penalty* thresholds (40%/60%) lag the canonical 35%/50% caps (documented as
   "penalty fires beyond cap"; CIS v2.1 §12 lists 40/60 as superseded) — spec-side reconciliation debt.
3. Governance Protocol v1.0 carries older posture bands (Torque 20–40%) and a Top-5 65% tripwire; its
   single-momentum-break reduction (30–50%) differs from Part 5's 25–30%. Part 5 (v2.1-aligned) used.
4. `FRAMEWORK_MASTER_INDEX_v2` still marks Parts 5/6 "IN PROGRESS / NOT YET CREATED" — stale status metadata.

### 1.4 Doctrine corrections applied in THIS PR

The Part 5/6 numeric doctrine was verified current; **no numeric corrections were required in the target
copy**. The corrections applied are structural: (a) the Site B pages state the four-band structure explicitly
as the current calibration (so the superseded granular ladder cannot be read back in); (b) the wrapper
compounding exhibit is built once from the verified assumptions and Part 5 references Part 4's canonical
tax-wedge exhibit rather than duplicating its argument; (c) momentum single-break reduction standardized on
25–30% with the Governance-v1 divergence recorded here.

**Review round (owner review of PR #137, 2026-07-13) — corrections applied:** (d) Hype sizing corrected
everywhere from 1–5% to the **coded 2–5% eligible range** (CIS ≥50 eligibility, 5% per-position hard max with
no override, 10% aggregate) — spec data, hover copy, aria summaries, page prose, and the MDX
typical-allocation line that contradicted its own 2–5% governance callout; (e) Chart 5.2 stripped of all
percentages and implicit stage→band mapping (see §1.1 revised ruling); (f) Chart 5.3's shared 15/18 rules
replaced with per-posture ceiling marks (Torque 15/override-18 · Ballast exceptional 10 · Hype hard 5) so
posture ceilings visibly bind first, with 18% redrawn as a secondary portfolio outer bound.

---

## 2. Chart-by-chart audit record

Legend — **Primitive:** engine layout used (NEW = added this slice). **Mode:** `conceptual ◌ · representative ◇`.
All charts: theme-aware, mobile tap-cycle or stacked behavior per engine defaults, `aria` summary, direct labels,
no hover-required meaning, no numeric axis on conceptual diagrams.

| # | chartId | Section (placement) | Existing visual | Communication gap | Why chart > prose/table | Canonical rules | Primitive | Mode | Responsive risk |
|---|---|---|---|---|---|---|---|---|---|
| 5.1 | `p5-operating-system` | Why Three Postures (after posture definitions) | none | Postures read as three unrelated buckets; rotation + capped Hype + separate BTC backbone invisible | The *system* (flows between roles) is spatial; prose forces sequential reading of simultaneous relationships | Posture roles; Hype ≤5%/10%; Ballast⇄Torque rotation; BTC separate (no % asserted) | `postureSystem` (NEW) | ◌ | Block layout must stack vertically at narrow width; labels inside blocks |
| 5.2 | `p5-earned-size` | Torque Position Sizing (first sizing section) | four-band table | Table shows score→size but not *why* size must be earned over time | The evidence ladder makes "capital advances only as evidence advances" one glance | Owner doctrine (Earned Conviction Ladder, awaiting canonicalization) — **no percentages, no band assignments on the exhibit** (§1.1 ruling, revised per owner review) | `rangeSteps` (NEW, stair + hideScale) | ◌ | Six stage labels at 390px — ordinal labels + stage names in subs |
| 5.3 | `p5-posture-sizing` | After the sizing tables (Torque+Ballast+Hype read together) | three tables | Same CIS ≠ same size across postures is stated but never *seen*; ceilings scattered across prose | Aligned vertical ranges expose the posture asymmetry; **per-posture ceiling marks bind first** (Torque 15/override-18 · Ballast exceptional 10 · Hype hard 5), the 18% portfolio outer bound drawn secondary | Band sets · Hype 2–5 (CIS ≥50) · posture ceilings 15/10/5 · outer bound 18 · 35/50 top-N · aggregates 15–40 / ≤10 | `rangeSteps` (NEW, columns + caps) | ◌ | Three columns fit 390px if compact; ceiling labels above columns |
| 5.4 | `p5-ballast-rotation` | Ballast §Rotation Function | none | "Ballast = dead weight" misread; the cycle is described in prose fragments | A cycle is a loop; the return arc IS the claim | Rotation triggers; min reserve 15%; BTC never a funding source (excluded from loop) | `governanceLoop` | ◌ | 5 stations vertical-flow on mobile (engine default) |
| 5.5 | `p5-earnings-window` | Earnings Proximity Protocol (top) | protocol table | T-rules are a timeline forced into a table; shrink-then-rebuild shape invisible | Time axis + step line shows compression → observation → conditional rebuild as one shape | T-21→T-6 · T-5→T-1 3% cap · T+0 · T+1–5 · T+6+; three post-event branches | `single` (step series + window bands + branches) | ◌ | Bands + 3 branch labels at narrow width; keep branch labels short |
| 5.6 | `p5-momentum-gate` | After Momentum Dimensions | alignment table | Table gives states; gauntlet-thinning (conviction requires confirmation) is the mechanism | Gate shows eligible sizing surviving/thinning through three checks to four actions | 3 dimensions · full / −25–30% / watch / exit · re-entry permitted | `gate` | ◌ | Node sublabels truncate — keep ≤3 words |
| 5.7 | `p5-force-channels` | Sector Allocation Through Regime Forces | limits table | "Diversify within the force" is the least-understood idea; ticker-diversification fallacy | One force fanning into channels with different failure modes is inherently diagrammatic | Methodology illustration (AI infra channels); sector caps 30/50/10 stay in the adjacent table | `flow` | ◌ | 7 channel nodes — two ranks or wrap on mobile |
| 5.8 | `p5-wrapper-compounding` | Tax-Aware Rebalancing (at the compounding example) | prose arithmetic callout | Exponential divergence and terminal Δ unreadable as inline math | Two verified compounding lines; checkpoints at 10/20/30y; honest axis from $100k | Verified: 1.10^t vs 1.075^t · $875k vs $1.745M · Δ≈$870k | `single` (two series, markers) | ◇ | y-axis $ labels compact ($0.5M form); terminal labels stacked |
| 5.9 | `p5-liquidity-throttle` | Liquidity & Correlation Regime Monitoring | bullet list | Three-state throttle with confirmation-gated return reads as a loop, not a list | Loop with checkpoint = "this is governed throttling, not prediction" | VIX>25 · spreads · corr>0.7 · pause/enforce/reduce 10–20% · repair 2+ weeks | `governanceLoop` | ◌ | Station sublabels dense — trim to signals only |
| 5.10 | `p5-change-hierarchy` | Framework Parameterization & Overrides | prose + callout | Doctrine/parameter/override distinction is the governance keystone; currently a wall of bullets | Descending cascade shows narrowing scope of legitimate change | Doctrine = identity · Parameters = calibration in documented ranges · Overrides = temporary, reasoned, time-bounded, reversion conditions | `bridge` | ◌ | Three stages — low risk |
| 6.1 | `p6-cis-composition` | CIS Components (immediately after) | callout text | Weights stated but hierarchy + "R scores survivability, not risk-taking" not visible | Weighted donut shows C-dominance instantly; center = the question CIS answers | C40/R25/M25/E10 · weights = Parameters (C 35–45 / R 20–30) · position-level only | `radial` (donut) | ◌ | Engine-proven at mobile (p4-gross-not-net) |
| 6.2 | `p6-fis-waterfall` | After FIS Penalty Buckets table | buckets table | Subtractive attribution ("every deduction has an owner") never visualized | Waterfall from 100 → illustrative deductions → resulting band makes attribution + repairability visible | ~~Spec caps 25/20/15/15/15/10/10~~ → **superseded by §6: live five-bucket kernel 25/15/15/15/10, shared four-band register** | `waterfall` (NEW) | ◌ | 5 steps at 390px — short labels |
| 6.3 | `p6-cis-fis-matrix` | CIS × FIS Interaction (supplements the table) | interaction table | Independence of the two axes is the claim; a table reads as four rows, not two dimensions | 2×2 with axis semantics shows non-compensation spatially | High >80 · Low <70 · four actions | `quadrant` (cells variant) | ◌ | Quadrant stays square; cell copy ≤2 lines |
| 6.4 | `p6-weekly-loop` | Weekly Workflow (top) | "01–04" plain-text sequence | The op cadence is the framework's heartbeat; loose numbered text | Loop with governance checkpoint + return arc; "no trigger is also a result" | 5 stations: CIS → FIS → gates → act-or-hold → log (log supported by canonical step 01) · weekly return | `governanceLoop` | ◌ | Engine-proven (dl-tripwire-loop) |
| 6.5 | `p6-decay-drift` | Failure Modes (top) | five error callouts | Failure modes presented as separate events; the longitudinal compounding is the real lesson | Slow multi-indicator drift over unmeasured months; marked conceptual, normalized axis | 5 diagnostics (stale >90d · drift >10% · wrapper leakage · corr stacking · narrative substitution); **no invented market data — normalized conceptual series** | `single` (multi-series, normalized) | ◌ | 5 series → direct end-labels, thin context lines |

**Charts rejected / not added beyond the required set:** a Part 5 case-study allocation treemap (plan's P5-05)
— the case study is per-practitioner illustration, not doctrine; a treemap primitive is not justified for a
non-doctrinal example and the constructed-portfolio table remains the honest form. A dedicated posture-behavior
matrix (plan's P5-01 3×5 matrix) — its teaching load is now covered by 5.1 (system) + 5.3 (sizing asymmetry)
without a third overlapping posture exhibit.

## 3. Engine extensions (clean, reusable)

| New layout | Justification (no existing primitive) | Reused by |
|---|---|---|
| `waterfall` | Subtractive attribution; anticipated by SIGNATURE_CHART_SPECS (P6-01 "compact waterfall") and plan §D (P6-02) | 6.2 (future: dashboard-later FIS live view) |
| `rangeSteps` | Vertical range-band columns on a shared % scale + guardrail rules + ascending stair mode; no staircase/range primitive exists | 5.2, 5.3 |
| `postureSystem` | Block-role architecture with rotation flows + capped side-cell + backbone base; flow/feedbackLoop cannot express bidirectional rotation + cap + base | 5.1 |

Each lands with: `LAYOUTS` enum entry, `LAYOUT_RELATIONSHIPS` grammar entry, renderer in `FrameworkChart.jsx`,
validator branch in `validate-chart-specs.mjs`, derived motion/experience/mobile defaults.

## 4. Tables — keep / simplify / companion decisions

| Table | Decision |
|---|---|
| Torque + Ballast CIS→size tables | **Keep** (exact-value reference) as `.compare` tables adjacent to 5.2/5.3 |
| Earnings protocol table | **Keep**, placed after 5.5 as the exact-value companion |
| Momentum alignment table | **Simplify into 5.6's gate labels** + keep one-line compare-key; full ladder is on the chart face |
| Sector limits table | **Keep** (5.7 deliberately excludes caps from the diagram) |
| FIS buckets table | **Keep** as data companion beneath 6.2 (caps are reference values; waterfall is illustrative) |
| FIS interpretation bands | **Keep** (compact compare table) |
| CIS×FIS interaction table | **Companion** beneath 6.3 quadrant (actions in exact words) |
| Action-frequency limits (Part 6) | **Keep** as-is (genuinely tabular; no chart) |
| Doctrine/Parameters/Overrides bullets | Restructure as callout + 5.10 cascade |

## 5. Implementation status

Tracked in `chart-specs.mjs` (`status` field) + this table at PR time. Target: all 15 `implemented`,
`wiredPublic: true`, embedded in `public/site-b/part-5-portfolio-construction.html` and
`part-6-convexity-scoring.html`, routed via `next.config.mjs`, validated by `validate:charts`, screenshot QA
at 1280 / 768 / 390 px.


---

## 6. Live-app continuity pass (owner directive, 2026-07-13): live math trumps everything

Source hierarchy revised per owner: **live dashboard code > specs > doc prose.** Three code audits (CIS engine,
FIS kernel, governance surfaces) established the following; Parts 5–6 pages + exhibits were realigned.

### 6.1 Live truths adopted into the docs

| Area | Live behavior (file evidence in PR discussion) | Doc action |
|---|---|---|
| FIS kernel | **v2.1, five buckets** (Allocation 25 · Governance 15 · Dead capital 15 · Concentration 15 · Complexity 10 hard cap); caps sum to 80 → floor 20; wrapper drift + CIS-band compliance live INSIDE Allocation (targets Roth .45/taxable .35/pretax .20); Tax-Architecture + Posture-Drift buckets are NOT scored | Chart 6.2 + §fis tables rebuilt on the five-bucket kernel; wrapper continuity sentence added |
| FIS bands | Shared four-band register (70+ Strong · 60–69 Moderate · 50–59 Caution · <50 Weak) — not 90/80/70/60 | Interpretation table + waterfall band guides + 6.3 matrix thresholds realigned to the 70 line |
| FIS value-weighting | Only governance + dead-capital scale by position size (0.2%–12% clamp); other buckets flat | Copy scoped truthfully |
| **FIS §7.5 re-determination** | Live concentration penalties fire **beyond the caps** (single >15 · top-3 >40 · top-5 >60, BTC excluded by archetype, override acknowledged-but-billed) while live sizing caps are 15/35/50 — the beyond-cap penalty design is REAL in the v2.1 kernel. **The earlier recommendation to change spec §7.5 to 35/50 is retracted**; the lagging artifact is spec v1.1.1's framing, not the thresholds | Docs describe caps (sizing) and beyond-cap penalties (FIS) as two live layers |
| CIS weights | 40/25/25/10 live; SSOT-driven, thesis-adaptive within ±0.10, renormalized | 6.1 caution + §cis copy updated |
| CIS clamps | ±3/±5/±8 + **±6 derived-proxy** + init ±20 / thesis ±15 + legal bypasses (structural rescore, model divergence) | §cis + 6.4 hover updated |
| CIS confidence | Derived in-engine from evidence-source quality (venue/size caps), not practitioner-asserted | §cis corrected |
| Archetypes | BITCOIN / ETF / LEVERED_ETF / OPERATING_EQUITY; lens + labeling only — **floors removed**; no cash-like archetype | §cis corrected |
| 18% override | Live gate: CIS ≥80 + documentation | 5.3 hover + Part 5 copy |
| Earnings | T-5 → 3% trim is a live engine action; T-21 blackout doctrine-only | 5.5 caution + copy attribution |
| Action frequency | 7d recalc / 3d adds / 5d trims / exits unlimited-on-tripwire — live verbatim | Kept; attributed |
| Weekly loop | Live engine runs ingest → CIS → FIS → governance → action → **decision logging** (rolling ~1yr log); trigger precedence tripwire > earnings > FIS<70 > CIS-drift(10) | 6.4 caution upgraded to live truth; §weekly copy |
| Failure diagnostics | All five live: stale >90d (billed), drift warn 10 / fail 20, corr >0.7 flagged (informational), +50%-on-stale flagged, wrapper inside Allocation | 6.5 hovers + §failure copy |
| Momentum | Doctrine ladder (10/25/40, full/−25–30%/watch/exit) NOT coded; live gates = 200MA/50MA/RSI + cohort confluence tripwire (flag → hedge → trim 25% of torque cohort; 6 of 9 signals live) | 5.6 caution reframed doctrine-vs-live; Part 5 "in the dashboard today" passage |
| Regime throttle | VIX-25 / gross 10–20% / 2-week resumption NOT coded (live stress bands differ; cohort reset 5 trading days); corr 0.7 diagnostic live | 5.9 caution reframed; copy attribution |
| Add/freeze · Hype stops | −20% freeze, ≤25%/wk cadence, 15–25% stops, 3–6mo limits: doctrine-only (caps 5/10 + frequency limits are live) | Copy attribution |
| Wrapper routing | Live wrapper-fit engine scores candidates 0–100 per wrapper; Bitcoin exempt | One-line addition |

### 6.2 New data-ink register (owner-requested visual elements beyond the chart engine)

Added to `reading-system.css` (namespaced `.di-*`, tokens-only, light/dark automatic, reduced-motion safe):
**score chip** (band-tinted meter under mono numerals), **posture badge** (posture-token marks),
**band register** (the shared four-band strip CIS and FIS both read), **allocation bar** (the case-study
composition strip on posture tokens — the honest CSS-native treemap). Applied across Parts 5–6; never inside
dark insight callouts (contrast), meaning never color-alone.

---

## 7. P5-01 rework + Part 5 humanization pass (2026-07-13, owner review round 2)

Owner findings: (a) Part 5 voice read less humanized than Parts 1–4; (b) the first-time
introduction of Torque/Ballast/Hype carried no visual emphasis; (c) the P5-01 postureSystem
block diagram "labelled the postures without showing them" — terrible as a first exhibit.

**P5-01 reworked** — same `chartId` (`p5-operating-system`), new proposition: a `single`-layout
**behavioral-signature plot**. Four `p5Cycle` indexed paths (Catmull-Rom waypoint curves,
deterministic micro-noise) through ONE stylized cycle (advance · stress · recovery): Torque
(primary) peak-to-trough ≈ −59% inside the stated 50–70% band, recovers highest; Ballast
(secondary) near-flat with a trough **enso marking the rotation moment** ("Ballast deploys
here"); Hype (stress tier) spike-and-collapse **terminating at an ink-dot stop-out** — the
absent recovery path IS the claim; Bitcoin (tertiary dashed) as a quiet low register with the
never-rotation-capital note (caution states the low placement is registral, not a
relative-performance claim). Zero engine changes — pure PlotSvg reuse. The now-dead
`postureSystem` layout (renderer + validator branch + LAYOUTS/grammar entries) was **removed
engine-wide**; its only consumer was P5-01 v1.

**Posture-introduction register** — two new components in `reading-system.css` on the same
`--posture-*-fg` tokens as the `.di-*` register (tokens-only, both themes, reduced-motion
safe, identity never color-alone): `.posture-trio`/`.posture-card` (three linked definition
cards at the postures' first appearance — name, role, one behavioral sentence, sizing stats)
and `.posture-hero`/`.ph-stat` (at-a-glance identity strip opening each posture section:
Torque 3–15% · 40–60% · 50–70% dd; Ballast 2–8% · 20–35% · 15% min reserve; Hype 2–5% ·
≤10% cap · 15–25% stop).

**Humanization pass** — full-page prose rewrite toward the Parts 1–4 register (shorter
declaratives, explain-then-name, narrative connective tissue) with every numeric value and
every live-vs-doctrine attribution from §6.1 preserved verbatim. Tables, steppers,
callouts, gloss ids, di-* elements, anchors, and the chart set (10 islands) unchanged.
