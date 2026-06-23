# ACF-Docs — Future Backlog

This file tracks scoped future work that is **intentionally not being built yet**.
Each item records context, requirements, activation prerequisites, and the
deliverable expected when it is picked up. Adding an item here is a tracking
action only — it is **not** authorization to implement.

> Publishing note: this file lives at the repo root, outside `pages/`, so it is
> never served as a Nextra docs page.

---

## 1. Interactive Framework Reading Layer

**Status:** `deferred` — do **not** implement until explicitly authorized **and**
all activation prerequisites below are met.
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
