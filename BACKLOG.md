# ACF-Docs — Future Backlog

This file tracks scoped future work that is **intentionally not being built yet**.
Each item records context, requirements, activation prerequisites, and the
deliverable expected when it is picked up. Adding an item here is a tracking
action only — it is **not** authorization to implement.

> Publishing note: this file lives at the repo root, outside `pages/`, so it is
> never served as a Nextra docs page.

---

## 1. Interactive Framework Reading Layer

**Status:** `largely superseded (2026-07-13)` — the Site B reading system delivered the
substance of this item on a different architecture: all six parts are hand-authored HTML
(`public/site-b/`) with embedded chart islands (`data-fc-chart`), a glossary layer
(`.gloss` + `acf-glossary.json`), sidebar + floatnav navigation, guided-focus/reveal
behavior, and reduced-motion safety. The MDX pages this item targeted were deleted
2026-07-13 (see `FRAMEWORK_DOCS_CANONICAL.md`). Remaining live sub-scope: **citations**
(still open) and any future glossary/nav expansion — those would now be scoped against
Site B, not MDX. The original text is preserved below for lineage.
**Added:** 2026-06-23
**Type:** Reading-experience feature (docs UX), building on the existing chart system.

### Context

ACF-Docs will eventually fold in the chart handoff/export system, currently
documented and demoed at:

- https://docs.acfdashboard.com/chart-handoff-export
- In-repo today: `pages/chart-handoff*.{mdx,jsx}`,
  `components/framework-charts/`, `public/agency-chart-handoff/`.

Per `public/agency-chart-handoff/README-agency-chart-handoff.md` §9, the charts
currently live **only** on the internal `/chart-handoff*` and chrome-free
`/chart-handoff-export*` routes. They are deliberately **not** embedded in the
public framework pages (`pages/part-1-foundation.mdx`, etc.) — "placement into
public pages is an explicit, separate decision." This backlog item *is* that
future decision, scaled up into a full reading layer.

### Goal

Create an interactive framework-docs **reading layer** that helps readers
understand the ACF framework through embedded charts, glossary tooltips,
contextual links, improved navigation, and subtle guided-focus UI — applied to
the public Parts 1–6 pages, not just the handoff routes.

### Future requirements

1. Let the LLM read the **full** framework docs and recommend where each chart
   belongs.
2. Map charts to specific framework sections, concepts, and **Parts 1–6**.
3. Identify glossary-worthy ACF terms (initial list — to be audited for actual
   occurrence and expanded/pruned at activation):
   - CIS
   - FIS
   - Torque
   - Ballast
   - Hype
   - Convexity
   - Fragility
   - Optionality
   - Barbell
   - Long Global Carry
   - Short Global Carry
   - Bitcoin Backbone
   - Wrapper Engineering
   - ROC
   - Governance
   - Tripwire
   - Macro Thesis
   - Thesis Phase
   - Source Drift
4. Add highlight / tooltip behavior for glossary terms.
5. Ensure glossary behavior is useful but **not noisy** (first-occurrence-only,
   opt-in reveal, no per-paragraph repetition).
6. Add lazy-loaded internal links and chart embeds (performance-preserving).
7. Improve navigation across:
   - Parts 1–6
   - Glossary
   - Charts
   - Citations
   - Related framework concepts
8. Add subtle animation / guided-focus improvements for dense sections.
9. Preserve performance and readability.
10. Keep all styling aligned with the final ACF-Docs design system.

### Design alignment (existing doctrine to inherit)

When activated, this layer must obey the chart-system doctrine already
documented in `public/agency-chart-handoff/README-agency-chart-handoff.md`, in
particular:

- **One tooltip system / no native browser tooltips** (README "No native browser
  tooltips") — glossary tooltips must use the existing custom tooltip/popover +
  `aria-*` model, never `title=`.
- **Useful-not-noisy / progressive disclosure** (README "Progressive
  disclosure", "Reader comfort") — the term definition is one intentional reveal,
  not always-on clutter.
- **Motion follows comprehension** and `prefers-reduced-motion` safety (README
  "Motion rule", "Motion follows comprehension") — guided-focus animation must be
  calm, non-looping, reduced-motion-safe, and never shift layout.
- **Theme/atmosphere continuity** and pre-paint theme bootstrap (README "Theme
  persistence & page continuity").
- **Performance & readability first** — lazy-load embeds; do not regress
  first-paint or scroll on the public pages.

### Activation prerequisites (do this only after ALL of these)

- [ ] Parts 4–6 are rewritten
      (`pages/part-4-tax-architecture-roc-strategy.mdx`,
      `pages/part-5-portfolio-construction-position-management.mdx`,
      `pages/part-6-convexity-framework-integrity-scoring.mdx`).
- [ ] Charts for Parts 4–6 are complete (new specs in
      `components/framework-charts/chart-specs.mjs`; today the registry covers
      Parts 1–3 only).
- [ ] Citations are complete.
- [ ] The updated ACF-Docs design system is live or nearly final.

### Deliverable when activated

A **scoped implementation plan** (not code on first pass) that identifies:

- chart placement map (chart → Part/section/concept)
- glossary term map (term → canonical definition, first-occurrence anchors,
  related terms/links)
- tooltip / highlight UX rules (trigger, frequency, dismissal, a11y, mobile)
- lazy-load / linking architecture (how embeds and internal links load without
  hurting first paint)
- navigation improvements (Parts 1–6 ↔ Glossary ↔ Charts ↔ Citations ↔ related
  concepts)
- animation / guided-focus rules (for dense sections; reduced-motion behavior)
- files likely affected
- implementation order
- risks and guardrails

### Files likely affected (preliminary — confirm at activation)

- `pages/part-1-foundation.mdx` … `pages/part-6-convexity-framework-integrity-scoring.mdx`
- New glossary surface (e.g. `pages/glossary.mdx`) + `pages/_meta.json` nav entry
- `components/framework-charts/` (reuse `FrameworkChart`/`ChartHandoff`; possibly
  a new lightweight in-page embed + a glossary-tooltip component)
- `components/framework-charts/chart-specs.mjs` (`intendedPlacement` per spec;
  Parts 4–6 charts must exist first)
- `styles/globals.css`, `styles/framework-charts.css`
- `theme.config.jsx` (navigation / TOC)
- Citations source (location TBD once citations work lands)

### Risks & guardrails (preliminary)

- **Noise risk** — glossary highlighting on every occurrence becomes visual
  clutter; default to first-occurrence-per-page and a quiet affordance.
- **Performance risk** — embedding interactive charts into long public pages can
  regress first paint/scroll; embeds must be lazy-loaded and reduced-motion-safe.
- **Tooltip-system conflict** — must extend the existing one-tooltip-system model,
  not introduce a second (or native) tooltip layer.
- **Design-system churn** — building before the design system is final risks
  rework; gated by the prerequisite above.
- **Content coupling** — chart placement depends on the rewritten Parts 4–6 and
  completed citations; building against draft content invites churn.

---

## 2. Framework in Math (companion derivation surface)

**Status:** `captured (2026-07-26)` · **corrected 2026-07-28 — this is a DOCS-SIDE PRESENTATION
item that depends on an existing, already-shipping extraction track.** Not authorized to build.
**Added:** 2026-07-26
**Type:** Reading-experience feature (docs), third teaching register alongside prose and charts.

> **Correction (2026-07-28).** The v1 wording framed this as a net-new idea. It is not.
> **THE FRAMEWORK: In Math** is an owner-chartered track in `ACFDashboard`, running since
> 2026-07-19, with `docs/FRAMEWORK_IN_MATH_MASTER_PLAN_v1.md` (Phase 0 complete: feasibility,
> authority ladder — live V30 engine > specs v2.1 > Parts > synthesis, 3-repo math source map,
> 12-domain wave breakdown, errors/conflicts register) and `docs/FRAMEWORK_IN_MATH_v1.md` with
> **four waves already shipped** — Ch.1 CIS core, Ch.2 FIS, Ch.3 allocation & sizing, Ch.4
> governance quantities — carrying 63+ register rows of spec↔engine forks, all read-only
> against the math. That track is the **source of truth for the mathematics**. This backlog
> item is only the **docs-side publication surface**: how the extracted math is presented to a
> reader on Site B. It must consume that track's output; it must never re-derive or restate the
> math independently, and it cannot start before the owner decides what is publishable
> (the extraction is RIA/PM-defensible internal reference, not automatically public copy).

### Context

The book currently teaches in three registers: calibrated prose (Parts 1–6), teaching
exhibits (45 chart islands plus the Part 1 visual essay at `/part-1-pictures`), and the
inline glossary. The mathematics underneath the framework — the CIS weighted sum with
delta clamps and confidence weighting, FIS subtraction with value-weighted severity, the
band arithmetic, the tax-wedge and wrapper-compounding arithmetic (1.10^t vs 1.075^t),
the power-law regression form Price = A × Days^B, and the sizing-band structure — exists
only embedded in prose, specs, and chart methodology notes. A "Framework in Math"
companion (the analogue of "Part 1 in Pictures" for equations) would present each
canonical formula with a worked derivation, cross-linked to its Part, its exhibit, and
its glossary terms.

### Future requirements (first cut)

1. One page (or per-part appendix blocks) on the Site B template: each formula gets a
   derivation card — statement, variables, worked example, and a "where this lives"
   line (Part + chart + engine location).
2. **Doctrine sourcing discipline:** every formula is sourced from `FRAMEWORK_IN_MATH_v1.md`
   (which already carries file:line citations against the live engines) — never re-derived
   here. Same live-vs-doctrine attribution register the prose now carries. No invented
   formulas; anything illustrative is marked the way `dataMode` marks charts (definitional ▪
   vs illustrative ◇). Where that track's register flags a spec↔engine fork, the docs surface
   either omits the value or states the fork — it never silently picks a side.
3. Self-hosted math rendering decision (KaTeX vendored like the fonts, or CSS/HTML-native
   layout for the mostly-simple forms — no CDN loads on the canonical routes).
4. Glossary integration: formula variables link to existing terms (cis, fis,
   carry-vector, power-law-corridor…) through the same `.gloss` layer; the navigation
   registry gains the new anchors automatically via `build:navigation`.
5. Mobile typography for equations (wrap/scroll rules mirroring `compare-wrap`).

### Activation prerequisites

- [ ] **Refresh the chart-side collateral to current first** (owner note: "the framework
      in charts needs updated to current"): re-audit `public/agency-chart-handoff/` and the
      chart-handoff pages against the current 45-spec registry, and regenerate
      `chart-inventory.json` at activation (`npm run build:inventory` — clean as of
      2026-07-26). A third register should not be added on top of a stale second one.
- [ ] **The extraction track reaches a publishable state** and the owner says which chapters
      are publishable — it is an internal RIA/PM-defensible reference by charter, not public
      copy by default. Remaining waves + the Phase 2 reports-math parking lot are that track's
      scope, not this one's.
- [ ] Owner picks the surface shape: standalone `/framework-in-math` companion page vs
      per-part math appendices vs both (recommendation at activation time).
- [ ] The register's open spec↔engine forks are resolved or explicitly dispositioned, so the
      docs surface is not publishing a contested number.

### Deliverable when activated

A scoped implementation plan first (formula inventory with per-formula source of truth
file:line, page structure, rendering approach, cross-link map), then the build.

### Risks & guardrails

- **Doctrine drift risk** — every published formula is a future reconciliation liability;
  each card must carry its source pointer so the quality-reconciliation loop can verify it
  the way chart specs are verified today.
- **Precision theater** — do not publish more decimal places or tighter bounds than the
  engine actually computes; clamp/weight values quote the engine constants verbatim.
- **Advisory calibration** — worked examples follow the same representative/illustrative
  hedging the prose uses (no promissory arithmetic).
