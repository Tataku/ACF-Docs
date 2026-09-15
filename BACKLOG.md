# ACF-Docs — Future Backlog

This file tracks scoped future work that is **intentionally not being built yet**.
Each item records context, requirements, activation prerequisites, and the
deliverable expected when it is picked up. Adding an item here is a tracking
action only — it is **not** authorization to implement.

Entries that have since shipped or been superseded are kept rather than deleted,
marked as such in their Status line: the constraints they record usually outlive
the build and become the rules for maintaining what shipped.

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

**Status:** `SHIPPED 2026-08-11` — `/framework-in-math` is live (PR #155). This entry is kept
as the **standing discipline** for maintaining that page, plus the follow-ups it did not close.
**Captured:** 2026-07-26 · **Corrected:** 2026-07-28 · **Shipped:** 2026-08-11

> **Correction (2026-07-28), still binding.** The v1 wording framed this as a net-new idea. It
> is not. **THE FRAMEWORK: In Math** is an owner-chartered track in `ACFDashboard`, running
> since 2026-07-19, with `docs/FRAMEWORK_IN_MATH_MASTER_PLAN_v1.md` (Phase 0 complete:
> feasibility, authority ladder — live V30 engine > specs v2.1 > Parts > synthesis, 3-repo math
> source map, 12-domain wave breakdown, errors/conflicts register) and
> `docs/FRAMEWORK_IN_MATH_v1.md` with **four waves shipped** — Ch.1 CIS core, Ch.2 FIS, Ch.3
> allocation & sizing, Ch.4 governance quantities — carrying 63+ register rows of spec↔engine
> forks, all read-only against the math. **That track remains the source of truth for the
> mathematics.** The docs page is only the **publication surface**. It consumes that track's
> output; it must never re-derive or restate the math independently.

### What shipped (2026-08-11, PR #155)

`/framework-in-math`, rewritten from the earlier stub, covering the scoring kernel in four
sections: **How to read this page** (authority ladder + label legend), **CIS: the position
score** (master formula, thesis-weight table against the 40/25/25/10 reference, the ±0.10
envelope with floor/ceiling and renormalisation, macro-confidence downweighting, the delta
clamp ladder, the four-band register), **FIS: the construction score** (the subtractive
identity, the five-bucket table, the severity formula), and **From score to size**.

Decisions taken at build time, now contract:

- **Authored, not generated.** Unlike `/glossary` and `/framework-in-pictures`, this page has
  no machine source to derive from — the extraction lives in another repo's prose documents.
  It is hand-authored against them and must be re-verified by hand when they move.
- **Every quantity is labelled** `Doctrine · Parameter · Derived · Illustrative`, with the
  authority ladder stated on the page rather than assumed.
- **Publishability scoping — the rule that governs edits.** The page omits engine file paths
  and line numbers, branch names and commit context, verification command logs, and the
  spec↔engine divergence registers. Those belong in the audit artifact and the work queue.
  *Publish the mathematics, not the audit apparatus.*
- **Rendering:** CSS/HTML-native, no KaTeX and no MathML. The forms are simple enough that a
  vendored math renderer was not worth the weight, and the no-CDN rule held without one.
- **Glossary integration** happens through the existing runtime `.gloss` auto-tagger — the
  page needs no bespoke wiring, and inherits the title-exclusion and density rules.

### Still open (not closed by the ship)

- [ ] **Chart-side collateral refresh** (owner note: "the framework in charts needs updated to
      current"): re-audit `public/agency-chart-handoff/` and the chart-handoff pages against
      the current 45-spec registry, and regenerate `chart-inventory.json`
      (`npm run build:inventory`). Independent of this page, still outstanding.
- [ ] **Remaining extraction waves.** The ACFDashboard track's later waves and its Phase 2
      reports-math parking lot are that track's scope. As they land, this page is a
      candidate for extension — each extension is its own owner-authorised slice.
- [ ] **Open spec↔engine forks.** Where the register flags a fork, this page must either omit
      the value or state the fork. It never silently picks a side. Forks resolved upstream
      should be reflected here deliberately, not absorbed by drift.
- [ ] **Per-part math appendices** were considered and not built. The standalone companion
      page was the chosen shape; appendices remain available as a later decision.

### Risks & guardrails (ongoing)

- **Doctrine drift risk** — every published formula is a reconciliation liability. The page
  carries no file:line pointers by publishability rule, so the audit trail lives in
  `FRAMEWORK_IN_MATH_v1.md` and the reconciliation artifact. Verify against those, not
  against the page.
- **Hand-authored means hand-verified.** There is no generator to catch drift here, unlike
  the glossary and pictures pages. Any change to a clamp, weight, cap, or band upstream
  requires an explicit pass over this page.
- **Precision theater** — do not publish more decimal places or tighter bounds than the
  engine actually computes; clamp/weight values quote the engine constants verbatim.
- **Advisory calibration** — worked examples follow the same representative/illustrative
  hedging the prose uses (no promissory arithmetic).

---

## 3. Reader-experience decisions left open by the 2026-09-15 visitor read

**Status:** `OPEN — owner decision, not scoped work` · **Captured:** 2026-09-15
**Type:** Reading-surface UX. Four findings from a full read of the live tree, deliberately
not fixed, because each needs a judgment call rather than a patch.

### Context

The docs site was read end to end as a visitor on 2026-09-15 — all eleven routes, desktop
1440 and phone 390, light and dark — and six defects were found. Three were fixed in PR #174
(the cover's "Resume reading" always going to Part 1; the cover and part pages disagreeing
about reading time on all six parts; three chart concept chips dead on two pages) and three
in PR #175 (the glossary missing from the cover's top nav; 23px drawer section links; 7×7
chart stepper dots announcing themselves as "Element 3").

The four below were the residue. Each is real, each is small, and each has more than one
defensible answer — which is why they are recorded here rather than decided by a session.

> The read also produced a **non-finding worth keeping**: 18 remaining tap-target reports are
> inline links inside prose and metadata lines, which WCAG 2.2 explicitly exempts ("the target
> is in a sentence or its size is otherwise constrained by the line-height of non-target
> text"). Enlarging them would break the reading line to satisfy a rule that does not apply.
> A scanner reports candidates, not verdicts. Do not "fix" these.

### The four decisions

1. **Jump rows on the reference pages are a row of links, not prose.** `/glossary`,
   `/framework-in-pictures` and `/framework-in-math` each open with a row of `.part-ref`
   links to their sections. They are navigation wearing prose clothing: 20–22px tall,
   inline-wrapped, and the WCAG inline exception is arguable at best because they are not in
   a sentence. Making them hittable means deciding **what they become** — chips like the
   glossary's related-term pills, small buttons, or a segmented control — and that is a
   design decision with a visual consequence on three pages. **The highest-value of the four.**

2. **Jump-link labels wrap mid-phrase.** The same rows break "Part 4 ·" onto one line and
   "Tax Architecture" onto the next. `white-space: nowrap` per link is one line of CSS, but
   applied globally to `.part-ref` it risks overflow on a narrow screen for a long label, so
   it wants scoping to the jump rows — which is the same scoping question as (1), and is why
   the two are recorded together. Likely falls out of (1) for free.

3. **The floating dock overlaps body text while scrolling.** On both form factors the dock
   sits over the reading column during an active scroll and fades ~3.2s after the last tick
   (`floatNav`'s `hideSoon`). It is transient and plausibly intended — a thumb-reachable
   control that yields when you stop. The decision is whether "overlaps prose while moving"
   is acceptable or whether the dock should offset the reading column while visible. **No
   change recommended without an owner view; it may be working as designed.**

4. **Share links build their URL from the current origin, not the canonical.** `partActions()`
   composes the X and email share targets from `location.href`. On production that is
   identical to the canonical, so this is latent — but a reader who lands on a Vercel preview
   deployment and shares the page shares the preview URL. Every page already carries
   `<link rel="canonical">`; reading it instead is small. The decision is whether to prefer
   the canonical always, or only when the current origin is not the canonical host.

### Activation prerequisites

- (1) and (2) need an owner call on the jump-row treatment before any CSS is written; they
  should ship as one slice because (2) is a consequence of (1).
- (3) needs an owner view on whether the current behaviour is a defect at all.
- (4) is independently shippable and needs no design input — only a decision on which of the
  two rules to apply.

### Guardrails inherited from the surrounding work

- The reference pages are **generated** (`scripts/build-{glossary,pictures,math}-page.mjs`);
  jump-row markup changes belong in those generators plus `scripts/site-b-shell.mjs`, never
  in the emitted HTML, and `npm run audit:glossary` will catch a page edited by hand.
- Chart changes must be followed by `npm run build:site-b-charts`: `site-b-charts.js` is a
  committed artifact built **outside** `prebuild`, so a source-only fix ships nothing.
- `tests/control-reachability.test.mjs` already pins the target-size and accessible-name
  properties for the controls that were fixed; extend it rather than starting a new file.
