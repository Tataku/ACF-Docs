# Framework Docs Quality Reconciliation — Parts 1–6 · v1.0

> **Mission:** cross-document architecture / content / design audit of the six-part
> framework book (`public/site-b/`), followed by verified implementation.
> **Mode:** Class 2 audit → IMPLEMENT (PR requested; no merge).
> **Date:** 2026-07-26 · **Branch:** `claude/framework-docs-quality-audit-qh3yp0`
> **Doctrine authority used:** live ACFDashboard engine code > CIS v2.1 / FIS specs > doc prose
> (owner hierarchy, 2026-07-13). Every doctrine verdict below carries file:line evidence
> gathered from a read-only pass over `ACFDashboard` on 2026-07-26.
> **Constraint noted:** the owner-side calibration companion files (`AGENTS.md` locked-phrasing
> tables) are not present in any session repo (`chaz-automation/AGENTS.md` is empty). The
> calibration standard was therefore derived from the shipped Parts 1–3 themselves plus the
> documented §5a register rules in `FRAMEWORK_DOCS_CANONICAL.md`. No pull-quote or voiced
> manifesto line was reworded anywhere in Parts 1–3.

---

## 1. The quality rubric derived from Parts 1–3

Twelve repeatable characteristics make the early parts institutional-grade. These are the
review standard for every part, stated as testable behaviors:

| # | Rubric trait | Benchmark evidence |
|---|---|---|
| R1 | **Setup sentence → exhibit → consequence.** Every chart is preceded by a one-sentence claim framing exactly what it proves, and prose resumes with the consequence, never a restatement. | P1 "The failure is easiest to see when the hedge is judged by behavior under stress, not by its label." → `p1-hedge-broke` |
| R2 | **Section-opener link-backs.** A section's first sentence connects to the prior section's conclusion. | P2 "Not everything the tradition underweights is a boundary to respect — some of it is an edge to seize." |
| R3 | **Bridge sentences between subsections.** Narrative connective tissue between h3 units. | P2 thinker→thinker bridges ("Survival is the floor, not the strategy…") |
| R4 | **Structured callouts, never walls.** Bold lead-ins, ≤3 beats; the P2 Synthesis template (Failure mode / Principle / Implementation). | P2 lineage; P3 handling-doctrine pairs |
| R5 | **Prose rhythm.** Long analytical paragraph → short declarative landing sentence; paragraphs ≈ ≤110 words. | P1 manifesto throughout |
| R6 | **Vocabulary discipline.** Glossary terms at first meaningful use; product terms exact ("Fourth Turning", "CIS 80", the four component names). | P1 20 first-use tags |
| R7 | **Number register.** `$7,500`-style figures; "percent" in flowing prose, `%` in tables/stat contexts; fiduciary hedging ("can", "tends to", "under current law"). | P1/P3 |
| R8 | **Structural variety.** Named-card `failure-modes` grids for enumerations; `architecture-list` for component breakdowns; `proc-steps` for sequences; `compare` tables for exact values; one pull-quote per part carrying the thesis line. | P1–P3 |
| R9 | **Part endings.** Landing insight or exhibit + Scope callout where tax/legal + End-of-Part transition naming what was established and why the next layer follows. | P2/P3 transitions |
| R10 | **Exhibit discipline.** One claim per chart, placed at the teaching moment; tables carry exact values, charts carry mechanisms; no duplicated argument between parts (cross-reference instead). | P4 wedge ↔ P5 compounding pair |
| R11 | **Header consistency.** Clean H1 (no interactive furniture), coherent part metadata. | P1–P3 headers |
| R12 | **Live-vs-doctrine attribution.** Where the dashboard enforces a rule it is said; where doctrine is practitioner-executed it is said; sub-meta line carries the register. | P5 Protocol sub-metas |

## 2. Per-part scorecard (before → after)

Scored against R1–R12; benchmark = Parts 1–3 average.

| Part | Before | Main deficits found | After |
|---|---|---|---|
| P1 Foundation | 9/10 | Two doctrine contradictions in the order-of-operations (see §5); span-authored cross-refs; wrong reading time; "carry vectors" promised but never defined anywhere | 10/10 (surgical only) |
| P2 Lineage | 10/10 | Span cross-refs; wrong reading time | 10/10 (benchmark; untouched otherwise) |
| P3 Bitcoin | 9.5/10 | Span cross-refs; wrong reading time | 10/10 (surgical only) |
| P4 Tax | 7.5/10 | Mangled setup sentence before the signature exhibit; "7,500 dollars" prose register vs the book's `$` register; zero h3 structure (two kt-chains); wrapper table clipped on desktop; missing pull-quote; missing planned P3 cross-reference; unnamed ballast instrument inconsistent with P5 | 9/10 |
| P5 Construction | 8.5/10 (post round-3) | 15%/18%/CIS-80 override rule restated 4× with near-identical clauses; wrapper-fit engine overclaimed as live routing; "4th Turning" vs "Fourth Turning"; "dollars" prose register in five spots; four doctrine-dense tables clipped at 1280px (worst: sizing table 2,140px wide in a 957px column) | 9.5/10 |
| P6 Scoring | 6.5/10 | The regression core: zero h3 subsections; eight raw key-term chains (the exact pattern P5's round 3 fixed); 200+-word wall paragraphs (delta clamping, archetype, subtractive scoring); components crammed into one paragraph; H1 rendering a glossary button ("Convexity"); live-vs-doctrine conflation in the weekly loop; checklisty end transition; Framework Fit claim refuted by code | 9.5/10 |
| Global | — | **Fonts 404 on every clean route** (relative `fonts/` paths → the entire book rendered in fallback system fonts on the canonical URLs); reading-time labels with no consistent basis (12/18/22/20/25/18 against 4,042/2,877/2,886/2,715/5,860/3,328 words); `.compare` nowrap register breaking on prose cells; glossary layer-two fallback maps frozen at the Parts 1–3 era | fixed |

## 3. Section-level findings matrix (disposition per finding)

Abbreviations: **F** fixed in this PR · **K** kept deliberately (reason given) · **O** owner decision (see §8).

| ID | Location | Finding | Disp. |
|---|---|---|---|
| G1 | all 8 pages | `@font-face`/preload used relative `fonts/…` → 404 on clean routes; Inter + JetBrains Mono absent on the entire canonical surface (verified `document.fonts.check` false everywhere before; true everywhere after) | **F** → `/site-b/fonts/…` |
| G2 | reading-system.css | `.compare td { white-space: nowrap }` is right for the P1–P3 short-cell matrices, wrong for prose cells; six tables clipped at 1280px | **F** new `compare-wrap` opt-in variant, desktop-scoped (≥561px) so the 560px stacked-card mobile mode is untouched; applied to P4 wrappers, P5 Torque sizing / Torque routing / Ballast sizing / earnings, P6 CIS×FIS |
| G3 | all parts | Reading-time labels inconsistent (P1 was the longest part labeled the shortest read) | **F** normalized to round(words/235): 17 / 12 / 12 / 12 / 25 / 14 |
| G4 | P1×4, P2×2, P3×3 | `.part-ref` / `.lineage-ref` authored as `<span>` (runtime-upgraded; dead without JS; flagged by the registry audit) | **F** real anchors; registry warnings now `[]` |
| G5 | reading.js | Glossary auto-tagger eligibility included `.doc-header` and headings → P6's H1 rendered "Convexity" as an accent glossary button (screenshot-confirmed) | **F** doc-header + h1–h4 excluded; pattern-hunted: P3/P4 titles were one hand-tag removal away from the same defect — fix is structural, not per-page |
| G6 | reading-core.js | Fallback maps frozen pre-migration: `BUILT_PARTS={1,2,3}` (Parts 4–6 "appears later" links rendered dead pending spans in the no-registry path), `BUILT_CHARTS` covered 8 of 45 charts | **F** all six parts true; complete dual-keyed (idx + chartId) 45-chart map generated from the registry |
| P1-1 | order-of-ops step 3 | "sized in the 15 to 20 percent range [Roth] … 8 to 10 percent [taxable]" contradicts canonical sizing (15% default / 18% absolute cap; bands by CIS × posture; caps bind at the household aggregate — CIS v2.1 §10.3, `part5AllocationBands.js:48-53,121`) | **F** rewritten: bands by conviction+posture, caps at the aggregate, wrapper decides what a size is worth |
| P1-2 | order-of-ops step 4 | "Scores below 50 trigger trim protocols" misstated the band structure | **F** (corrected twice — the first rewrite introduced a "below 70 trim-or-exit" claim that itself contradicted the bands; see §11.1) now: the score selects the posture-specific sizing band (70+/60–69/50–59/<50), material change triggers resizing review, exits governed by posture rules + tripwires + thesis evidence |
| P1-3 | order-of-ops step 5 | "broken momentum" parenthetical mixed live gates with doctrine dimensions | **F** aligned to the three doctrine dimensions |
| P1-4 | abstract | CIS four dimensions paraphrased ("convexity potential, fragility exposure…") vs the canonical component names | **F** canonical names in both abstract and step 4 |
| P1-5 | abstract | "carry vectors (long carry, short carry, barbell)" promised, never defined in any part — the glossary's own `harmonizeBeforeLocking` flag, unresolved since v1.0.0 | **F** glossary entry + hand-tag at first use + auto-link at P6's "carry direction" (see §6) |
| P4-1 | roth | Setup sentence before the signature tax-wedge exhibit was mangled ("decides the most exactly where") | **F** |
| P4-2 | roth/taxable | "7,500 dollars / 75,000 dollar Roth / 3,750 dollars / 3,000 dollars" | **F** `$` register |
| P4-3 | roth/taxable | kt-chains instead of h3s ("Options within the Roth", "Tax-loss harvesting") | **F** h3 + sub-meta idiom |
| P4-4 | edge | Part-thesis line buried in a Key Insight callout; P4 was the only part with no pull-quote; its second sentence duplicated the resilience bookend | **F** promoted to pull-quote; duplicate sentence dropped |
| P4-5 | wrappers | Planned routing exhibit [P4-02] never shipped | **K** deliberate: the proc-steps stepper already renders the cascade; a gate chart would restate adjacent structure (legibility standard §15). Documented, not silently dropped |
| P4-6 | wrappers | Planned Part 3 borrow-lifecycle cross-reference missing | **F** part-ref to `#exhibit-p3-cold-storage-to-borrow` |
| P4-7 | taxable | Ballast instrument anonymous in P4, named (STRC) with caveats in P5 | **F** named once in P4 with the same as-of + verification caveats |
| P5-1 | torque/hype/mgmt | 15/18 override rule stated 4× | **F** canonical at the sizing-table footnote; other three compressed to references. §11.2: the CIS-80 condition was removed from the book entirely — it exists only in the ETF-route validator and is not general doctrine |
| P5-2 | torque | "The dashboard operationalizes the routing" — **refuted**: `wrapperFitScoring.js` has zero production consumers; module header says informational/ranking-only, not displayed | **F** reframed as an informational ranking lane |
| P5-3 | torque/forces | "4th Turning" ×2 vs "Fourth Turning" (P1/P2) | **F** |
| P5-4 | four sections | "dollars"-prose register ×5 | **F** `$` register |
| P5-5 | mgmt | "cohort confluence tripwire… ten signals, seven of them live" — **verified correct** (`cohortTripwireConfig.js:198-352`: 10 defined, 7 implemented; ladder flag→hedge→trim, `trimPercent: 25`, `trimScope: 'TORQUE_COHORT'`) | **K** (the older audit's "6 of 9" was the stale claim, not the page) |
| P6-1 | cis | Four components in one 200-word paragraph with four kt spans | **F** numbered architecture-list (P3 model-list pattern) + short weights paragraph |
| P6-2 | cis | "Continuous scoring / Delta clamping / Archetype awareness / Reading the number" kt-chains fronting wall paragraphs (delta clamping ≈230 words) | **F** four h3 subsections with Mechanics 01–04 sub-metas; walls split at their natural seams (mechanics / rationale / confidence; labeling / lanes / no-floors) |
| P6-3 | fis | "Subtractive scoring." kt-chain + value-weighting fused into one block | **F** h3 ("every lost point has an owner") + split |
| P6-4 | fis | Floor + two accounting notes fused | **F** split |
| P6-5 | interaction | "How CIS feeds decisions." kt-chain | **F** h3 + sub-meta ("The 10-point drift trigger is live" — verified `actionDetermination.js:47,262-263`) |
| P6-6 | weekly | Claimed the live gates check "the three momentum dimensions" — **refuted**: `governanceChecks.js:138-194` codes MA-200 / MA-50 / RSI 30–70; the doctrine dimensions are uncoded (P5 attributes this correctly; P6 conflated it) | **F** page prose + `p6-weekly-loop` spec explainer/hover realigned; loop pass split into two h3-led blocks |
| P6-7 | completion | Three implementation paths in one 120-word block | **F** architecture-list |
| P6-8 | completion | "Framework Fit runs on synthetic sample books, never on live portfolio data" — **partially refuted**: the page is synthetic-only, but the engine powers Doctrine Audit which intakes the current portfolio on explicit request (`DoctrineAuditPage.jsx:64,80-87`) | **F** scoped truthfully |
| P6-9 | end | Checklisty transition ("What CIS does: … What FIS does: …") | **F** flowing prose matching P2–P5 register |
| P6-10 | kernel | FIS — a title concept of the part — had no glossary entry and no tag at first use | **F** entry + hand-tag |

## 4. Cross-part continuity findings

1. **The sizing story now agrees end-to-end.** P1 (order of operations) → P5 (bands + caps) → P6 (CIS feeds sizing) previously disagreed on both thresholds and mechanism (P1-1/P1-2). Fixed at the P1 end; P5/P6 verified against the engine.
2. **The momentum story now attributes consistently.** P5 established the doctrine-target vs live-gates distinction; P6's weekly loop (page + chart) now uses the same attribution instead of collapsing it.
3. **Carry vectors: promise now kept.** P1 abstract introduces the term (glossed); P6's macro component carries "carry direction" (auto-linked to the same entry); definition sourced to the product's closed structure enum (Long Carry | Short Carry | Barbell — `structureRegistry.js:4,16-32`).
4. **The wedge pair holds.** P4 tax-wedge (single realization) ↔ P5 wrapper-compounding (through time) cross-reference each other and never duplicate the argument — the one place the older plan's feared duplication was already resolved correctly.
5. **STRC specificity aligned** (P4 now names what P5 names, caveats intact).
6. **Part transitions:** every part ends with an End-of-Part callout that names what was established and why the next layer follows; P6's now lands the series instead of summarizing it like minutes.
7. **Parts 4–6 read as continuation, not appendix:** the h3 rhythm, sub-meta attribution register, exhibit cadence, and callout discipline now match the Parts 1–3 system.

## 5. Doctrine discrepancies (verified against live code, 2026-07-26)

Verified-correct claims retained (evidence): FIS five buckets 25/15/15/15/10, caps sum 80, floor 20 (`frameworkDocService.js:131-137`, `fisCalculator.js:794-795`); wrapper targets .45/.35/.20 (`frameworkDocService.js:161-165`); governance precedence 6/6/4/4 (`fisCalculator.js:346-372`); dead capital 5/2 at >90d; concentration 8/6/4 beyond 15/40/60 with Bitcoin archetype-excluded and override billed; complexity 1 / 0.5-beyond-3, hard cap 10; value-weighting scope + 0.2%/12% clamp; CIS weights 40/25/25/10 ±0.10 renormalized; clamps ±3/5/8, derived ±6, init ±20, thesis ±15, two legal bypasses; derived confidence with OTC-low / microcap-medium caps; four archetypes, six lanes, no floors, no cash archetype; four-band register at 70 with the exact band colors; weekly sequence + trigger precedence + 52-entry (~1yr) decision log; frequency limits 7/3/5/unlimited; >5%-single-day interrupt; T-5→3% live, T-21→T-6 blackout doctrine-only; posture drift warn 10 / fail 20 as diagnostics-not-FIS; correlation 0.7 informational; +50%-on-stale recalc flag.

Corrections applied to the docs: P6 weekly momentum gates (P6-6), Framework Fit scoping (P6-8), wrapper-fit live status (P5-2), P1 sizing/threshold claims (P1-1/2), and — in review round 1 (§11) — the CIS action-language and CIS-80 override corrections.

## 6. Glossary reconciliation

- **SSOT:** `acf-glossary.json` v1.0.0 → **v1.1.0**, 26 → **28 terms**. No orphans (every term used or auto-taggable on ≥1 page); every `data-gloss` in HTML resolves; registry `unresolvedGlossaryCharts: []`.
- **Added:** `fis` (wave 1, chart → `p6-fis-waterfall`), `carry-vector` (wave 2, appears-later → Part 6 carry direction). The meta's `harmonizeBeforeLocking: ["carry vectors"]` debt is resolved and recorded in `harmonizeNote`.
- **Corrected definitions:** `posture` (was "the portfolio's stance toward risk" — off-doctrine; now the per-position behavioral classification of every **non-Bitcoin** position, Bitcoin explicitly outside the three per Part 5 and the product contract — §11.3), `cis` (canonical component names), `convexity` source (defined in Part 1, scored in Part 6). `carry-vector`'s definition was re-scoped in §11.4 to what its sources establish (closed enum + CIS §5.2 regime-benefit meaning).
- **Chart cross-graph re-pointed** now that Parts 2–6 have exhibits (13 entries): cis→`p6-cis-composition`, posture/torque→`p5-operating-system`, ballast→`p5-ballast-rotation`, hype→`p5-posture-sizing`, momentum-filter→`p5-momentum-gate`, tax-wrapper + right-tail-outcomes→`p4-tax-wedge`, return-of-capital→`p4-roc-yield`, buy-borrow-die→`p3-cold-storage-to-borrow`, dca→`p3-accumulate-dont-trade` (was P1 "Survive the Path"), power-law-corridor→`p3-power-law-holds`, policy-reflexivity→`p2-markets-feed-back`. P1-era refs that were already the best exhibit kept (fragility→01, sequence→05, etc.).
- **Placement rule (documented + mechanically enforced):** hand-tags control placement at first meaningful use; the runtime auto-tagger wraps at most one occurrence per page for untagged terms; titles/headings are now ineligible (G5). No separate glossary page — the inline system stays.

## 7. Chart reconciliation

- All 45 specs `implemented` + `wiredPublic`; every mount resolves; every exhibit retains a setup sentence (R1) — verified per part.
- **No moves, no removals.** Placement audited part-by-part against the teaching moment; the two audited weak placements from the July plan were already repaired in earlier waves. The plan's unbuilt P4-01/P4-02 are dispositioned as deliberate (table + stepper are the honest forms — §3 P4-5); the P3-07 cross-reference from Part 4 now exists (P4-6).
- **Spec copy corrected:** `p6-weekly-loop` explainer + gates hover (momentum attribution). Bundle rebuilt (`site-b-charts.js`), `validate:charts` green (45 specs), `test:chart-core` green.
- Duplication audit: the only near-pair (P4 wedge / P5 compounding) is an intentional cross-referenced pair (§4.4).

## 8. Remaining owner decisions (none block this PR)

1. **ACFDashboard-side comment drift:** `cohortConfluenceAggregator.js:10,114-123` still says "6/9 signals" in comments (runtime derives counts correctly). One-line cleanup in the app repo.
2. **Defined-but-unwired FIS inputs:** `momentumBreakdown` (4 pts) and `hasGovernanceOverride` are adapter-defaulted to `false` (`fisCanonical.js:106-107`) — the penalties can't fire from live data. Docs describe the kernel's register (correct); wiring is an app decision.
3. **Dead diagnostic:** `failureDiagnostics.detectWrapperInefficiency` filters on the retired `taxArchitecture` category and can never emit (`failureDiagnostics.js:194-196`). Docs already describe wrapper leakage correctly (bills through Allocation).
4. **15% minimum Ballast reserve + single-Ballast 10%:** spec/doctrine values with no engine enforcement (reserve is conviction-density-driven, `convictionDensityEngine.js:390-437`). The docs state them as doctrine, not as live behavior — decide whether the engine should enforce them or the spec should note they are practitioner-executed.
5. **18% override path** is live only in the ETF portfolio-level validator (`part5AllocationBands.js:303-310,346`); the general validator flags >15% CRITICAL with no override lane. Per review round 1 the book now states only the spec rule (15% default · documented override · 18% absolute) with no CIS-80 condition anywhere; whether to adopt CIS-80 as universal governance and wire it beyond the ETF route is an owner call.
6. **App-side hype color registers** still diverge from the docs' declared pink (pre-existing note from the July audit; unchanged).

## 9. Verification record

- `npm run validate:charts` ✓ (45 specs) · `npm run test:chart-core` ✓ · `npm run build:site-b-charts` ✓ (552.9kb) · `npm run build:navigation` ✓ — **registry audit: 8 pages · 182 anchors · 52/45 mounts/specs · 28 glossary terms · zero warnings** (nine span-ref warnings before).
- Custom checks: every internal href resolves to a clean route; next/previous chains verified P1→…→P6→cover; zero duplicate HTML ids; every `data-gloss` resolves; zero relative font refs.
- Rendered verification (Playwright/Chromium, dev server on the real rewrites): all 7 routes × {1280 dark, 390 dark, 1280 light} — Inter + JetBrains Mono now load on every clean route (`document.fonts.check` true; before: false everywhere, five woff2 404s per page); zero page errors; all mounts hydrate; no gloss buttons in any header (before: P6 H1); table clipping 0 remaining (before: 6 tables, worst 2,140px in a 957px column).
- Interaction: glossary card opens by keyboard (Enter) with working layer-two links for the new `fis` and `carry-vector` entries; chart hover targets respond; Escape closes.
- Before/after full-page and section-level screenshots captured for P1–P6 (dark/light, desktop/mobile) — attached to the PR description as evidence summaries.
- Parts 1–3 regression check: only intended surgical diffs present (verified by diff review + rendered pass).

## 10. What changed, by file

- `public/site-b/part-1-foundation.html` — 10 surgical edits (§3 P1-1…5, G1/G3/G4)
- `public/site-b/part-2-lineage-macro.html` — 3 (G1/G3/G4)
- `public/site-b/part-3-bitcoin-convexity.html` — 4 (G1/G3/G4)
- `public/site-b/part-4-tax-architecture.html` — 11 (§3 P4-*)
- `public/site-b/part-5-portfolio-construction.html` — 16 (§3 P5-*)
- `public/site-b/part-6-convexity-scoring.html` — 12 structural + content (§3 P6-*)
- `public/site-b/part-1-pictures.html`, `cover-docs.html` — font-path fix only
- `public/site-b/acf-glossary.json` — v1.1.0 (§6)
- `public/site-b/reading.js` — auto-tagger heading exclusion (G5)
- `public/site-b/reading-core.js` — fallback maps regenerated (G6)
- `public/site-b/reading-system.css` — `compare-wrap` variant (G2)
- `components/framework-charts/chart-specs.mjs` — `p6-weekly-loop` copy (§7)
- `public/site-b/site-b-charts.js`, `public/site-b/navigation-registry.json` — rebuilt artifacts
- `chart-specs/PARTS_5-6_CHART_AUDIT_v1.md` — addendum correcting its stale "6 of 9" signal count

---

## 11. Review round 1 (2026-07-26, owner review of PR #150) — doctrine corrections

The initial pass shipped two material doctrine errors of its own; both corrected in this round.

1. **"Below 70 means trim or exit" was wrong — including in my own P1 rewrite.** The canonical
   structure keeps 50–69 allocation-worthy (Torque 60–69 → 4–8%, 50–59 → 2–4%; Ballast likewise),
   the CIS spec separates scoring from downstream governance, and the live engine acts on a
   10-point CIS change — not on crossing 70 (absolute triggers: tripwires, earnings proximity,
   FIS < 70). The initial pass replaced P1's stale "below 50 trigger trim" with "below 70
   trigger trim-or-exit review", generalizing Part 6's pre-existing "below 70 means trim or
   exit" drift instead of catching it. Corrected across P1 step 4, P6 §interaction (the
   feeds-decisions paragraph and the Demotion signal), and the P6 shared-register sentences
   ("70 is the compliance line on both scores" → on FIS the action line, on CIS the Strong
   band's floor — a band boundary, not an action trigger). Canonical language now: CIS selects
   the posture-specific sizing band; a material score change triggers resizing review; exits
   are governed by posture rules, tripwires, and thesis evidence rather than the score band alone.
2. **The CIS-80 condition on the 18% override was overgeneralized.** The general spec states
   only 15% default · documented override · 18% absolute; CIS-80 exists in code solely inside
   the ETF-route validator. Removed from the book everywhere (P5 canonical footnote, P1 step 4,
   and the two `p5-posture-sizing` hover targets), leaving the spec rule only, until a universal
   governance rule is formally adopted (§8.5).
3. **`posture` glossary:** scoped to every **non-Bitcoin** position (Part 5 places Bitcoin
   outside all three; the product contract carries Bitcoin as a separate posture value).
4. **`carry-vector` glossary:** the economic gloss ("earns steadily / pays a running cost") was
   not substantiated by the cited registry, which proves only the closed enum. Re-worded to what
   the sources establish — the closed enum plus CIS Spec v2.1 §5.2's carry-direction meaning
   (benefits from or suffers under the current rate/inflation regime) — and re-sourced
   accordingly (Part 1 abstract, after Park's carry framework · CIS §5.2 · structure registry).
5. Chart bundle rebuilt; `validate:charts` and chart-core tests green after the spec-hover edits.

CI note: this repo has no GitHub Actions workflows, so the validation record in §9 is
local-only by design (Vercel deploy is the only external check).

---

## 12. Review round 2 (2026-07-26) — the matrix cluster

Round 1 corrected the prose but left the CIS × FIS matrix itself encoding the old binary
interpretation — in the companion table ("Compliant (70+)" / "Below the line" / "Quality
issue → Upgrade positions") and, more extensively, in the `p6-cis-fis-matrix` chart spec
("70 and above is the compliant band on both scores", "weak positions", "upgrade the
holdings", "Tidy mediocrity is still mediocrity"), which the rebuilt bundle renders
interactively. Corrected to band semantics while keeping the 70 split:

- **Axes:** CIS `Strong (70+)` / `Below Strong` (a band boundary); FIS `Action line met
  (70+)` / `Remediation required (<70)` (the action threshold).
- **Sub-70-CIS × healthy-FIS cell:** diagnosis "Sub-core conviction"; action "honor the
  posture-specific band; strengthen evidence, resize, or replace only as warranted."
- **Both-below-70 cell:** "repair FIS first (compounds faster), then reassess and size
  each position by its CIS band."
- "Not allocation-worthy" / exit / replace language is reserved for CIS below 50 or
  separately triggered governance, in the table key, the explainer, and the hover copy.
- 13 spec strings rewritten (caution, source label, explainer, aria summary, y-axis,
  three cells, four hover targets, visual proof); bundle rebuilt; validators green.
- Nearby remnants: the band-strip accessibility label no longer calls 70+ "compliant";
  the FIS interpretation-table key now says "on FIS, 70 is the action line"; Part 1's
  "Low CIS at any momentum reading triggers exit" is now "CIS below 50 removes allocation
  eligibility at any momentum reading; otherwise momentum shapes sizing and review
  urgency, while exits remain governed by posture rules, tripwires, and thesis evidence."
- Rendered verification: the hydrated exhibit's cells and hovers carry the new language;
  a full-surface sweep finds zero instances of the binary vocabulary outside the engine's
  own "score-band compliance" Allocation term (which is live vocabulary and kept).
