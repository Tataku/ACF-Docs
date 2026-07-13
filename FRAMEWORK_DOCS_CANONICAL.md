# Framework Docs — Canonical Location & Agent Entry Point

> **Updated 2026-07-13 (v3 — migration complete).** The Framework Docs surface is the
> hand-authored **Site B HTML** (`public/site-b/`) on all clean routes; the legacy MDX part
> pages and the Part 7 intro deck are **deleted**. (v2, 2026-07-07, corrected the v1 error
> that declared the MDX canonical.) See "What changed" at the bottom.

---

## 1. Canonical surface: Site B HTML (`ACF-Docs/public/site-b/`)

The canonical Framework Docs are **hand-authored static HTML** in
`ACF-Docs/public/site-b/`, styled by the agency reading system and enhanced with
**React chart "islands."** All framework authoring happens here.

**Current Site B coverage (2026-07-13 — complete):**

| Route | Site B file | State |
|---|---|---|
| `/` (cover) | `public/site-b/cover-docs.html` | ✅ authored |
| `/part-1-foundation` | `public/site-b/part-1-foundation.html` | ✅ authored |
| `/part-1-pictures` | `public/site-b/part-1-pictures.html` | ✅ authored |
| `/part-2-lineage-macro-thesis` | `public/site-b/part-2-lineage-macro.html` | ✅ authored |
| `/part-3-bitcoin-convexity-backbone` | `public/site-b/part-3-bitcoin-convexity.html` | ✅ authored + routed (8 chart islands, design-final; chart placement repaired 2026-07-11; `p3-cold-storage-to-borrow` lifecycle flow + `p3-reserve-share-evolves` allocation curve wired into the TAM/borrow section 2026-07-12) |
| `/part-4-tax-architecture-roc-strategy` | `public/site-b/part-4-tax-architecture.html` | ✅ authored + routed (3 chart islands, each a distinct visual relationship: `p4-tax-wedge` trend/single · `p4-gross-not-net` composition/**radial donut** · `p4-roc-yield` comparison/**laneBar** — see `CHART_ENGINE_UNIFICATION_PROPOSAL_v1.md` + the Chart Grammar matrix) |
| `/part-5-portfolio-construction-position-management` | `public/site-b/part-5-portfolio-construction.html` | ✅ authored + routed (10 chart islands `p5-*`; doctrine reconciled against CIS v2.1 / FIS v1.1.1 2026-07-13 — see `chart-specs/PARTS_5-6_CHART_AUDIT_v1.md`) |
| `/part-6-convexity-framework-integrity-scoring` | `public/site-b/part-6-convexity-scoring.html` | ✅ authored + routed (5 chart islands `p6-*`; same audit) |
| `/part-7-…` | — | 🗑️ **retired (2026-07-13)** — the "Part 7 intro deck" was a 39-line MDX shell linking a NotebookLM-generated PDF; route, MDX, and `public/deck/` deleted. The landing page + docs site replaced it. A future re-cut deck from system exhibits is an optional owner follow-up. |

> **Chart status (2026-07-11):** every chart on a live reading page (Parts 1–4) is `status: implemented`
> with an explicit `claimStack` and correct in-section placement. Remaining `needs-design-review` charts
> (`sig-shape` S1/S2 alternate, `dl-regime-map`, `dl-tripwire-loop`) are landing/gallery-only, not on a
> live route. Parts 5–6 charts (P5-01…05, P6-01…05) are still net-new — see §6.

## 2. How Site B works (the pattern to replicate for 4–6)

- **Pages:** static `.html` on the Part 3 template — `<head>` theme-before-paint script +
  self-hosted Inter/JetBrains Mono `@font-face` + `tokens.css` + `reading-system.css`;
  `<body>` = `.shell` → `nav.sidebar` (the six parts) + `main.shell-main` (`doc-header` →
  `.section`s → `footer` → `.next-up`) + `nav.floatnav`; scripts `site-b-charts.js` +
  `reading.js` + `glyph-text.js` (all `defer`).
- **Design vocabulary (classes from `reading-system.css`):** `.section` / `.section-eyebrow`
  / `.section-title` / `.measure` / `.prose` / `.prose-lead`; `.gloss` glossary buttons
  (`data-gloss="<id>"` — the 25 ids live in `public/site-b/acf-glossary.json`);
  `aside.callout.callout-info|callout-insight|callout-transition`; `ol.architecture-list`
  / `ol.proc-steps` (`data-stepper`); `.compare` tables + `.compare-key`; `.failure-modes`
  grid; `blockquote.pull-quote` (`.hl`); `.rule-mark` dividers; `.key-term` / `.part-ref`.
- **Charts = islands:** a placeholder `<figure class="fc-mount" id="exhibit-<chartId>"
  data-fc-chart="<chartId>"></figure>` in the HTML is hydrated at runtime by
  `public/site-b/site-b-charts.js` (built from `components/framework-charts/site-b-island.jsx`
  via `scripts/build-site-b-charts.mjs`), which mounts the real `<FrameworkChart>` engine +
  `chart-specs.mjs` spec for that id. **A `data-fc-chart` placeholder only renders a chart
  once its spec exists in `chart-specs.mjs` and `site-b-charts.js` is rebuilt.**
- **Routing:** `next.config.mjs` `beforeFiles` rewrites map every clean route (`/`, part-1
  through part-6, part-1-pictures) → its Site B HTML. These rewrites ARE the routing — the
  MDX they once shadowed is deleted. Raw `/site-b/*` carries `X-Robots-Tag: noindex` so the
  clean routes are the single indexable surface.

## 3. The MDX (`ACF-Docs/pages/part-*.mdx`) — RETIRED (deleted 2026-07-13)

- All seven `pages/part-*.mdx` files (Parts 1–6 + the Part 7 deck shell) and `public/deck/`
  are **deleted**. Site B covers every part, so the migration-sequence step 4 fired.
- What remains under `pages/` is intentionally kept: `index.mdx` (internal Nextra root),
  the hidden `chart-handoff*` pages (agency handoff surface), and `pages/api/` handlers.
- The source/reference lineage lives in git history (`git log -- pages/part-*.mdx`); the
  calibration pipeline in §5a now applies to Site B HTML directly.

## 4. NOT the canonical surface

- `ACFDashboard/ACF - Framework Documents - Parts 1-6/PartN_*_FINAL.html` (production-served at
  the **app** domain `/part1`–`/part6` via that repo's `vercel.json`) and
  `ACFDashboard/docs/framework/part-*.html` are **older/other** HTML surfaces — **not** the
  new Site B target. Do not author framework content there. (They remain production-wired on the
  app side; their fate is a separate owner decision.)

## 5. The migration sequence (owner-defined)

1. ✅ Apply the agency reading system + chart handoff design to **rewrite Parts 4–6** as Site B HTML.
2. ✅ **Create the Parts 4–6 charts** (add specs to `chart-specs.mjs` → rebuild `site-b-charts.js` →
   `validate:charts`) and embed them as `data-fc-chart` islands.
3. ✅ Add the `next.config.mjs` rewrites for `/part-4…/5…/6…` once each Site B page is verified.
4. ✅ **Retire the MDX fully** (2026-07-13 — `pages/part-*.mdx` + `public/deck/` deleted; the
   `next.config.mjs` comment rewritten as permanent-routing documentation; the rewrites stay).
5. ⏳ Figure out **in-app** presentation (ACFDashboard) of the framework docs without MDX — later.

## 5a. Authoring pipeline + "marketing agency notes" (per the Calibration Handoff Brief, 2026-07-06)

- **"Marketing agency notes" = the CALIBRATION standard, not the chart/reading-system design.**
  Tone/register rules: reduce advisory-combative posture → professorial/institutional; scope every
  claim (fiduciary-grade, conditional); reduce rhetorical emphasis while preserving the author's
  voice + manifesto backbone; preserve technical rigor; a normalization standard (no em dashes;
  shorthand → prose; percentages spelled out; headings use colons); tax/leverage claims carry
  "under current law / subject to legislative change / not guaranteed."
- **Pipeline that produced Parts 1–3:** Dale **calibrated the MDX** section-by-section (output =
  MDX + a change log), then **the agency converted MDX → the self-contained Site B HTML**. That
  MDX stage is now complete and the MDX is deleted (2026-07-13): all parts ship as Site B, and
  future calibration edits apply to the Site B HTML directly.
- **Companion rule files (NOT in this repo — held by the owner's calibration workspace):**
  `AGENTS.md` (§5 normalization table · §6–7 locked canonical phrasing + verbatim voiced lines to
  preserve · §8 Bitcoin doctrine), `ACF_Project_State.md` (open flags + the exact Roth-figure fix:
  2026 IRA limit is **$7,500 per person**), `CLAUDE.md` (adapter). **Line-level calibration of a
  Part requires these** — do not calibrate locked phrasing blind.
- **OPEN (owner-pending):** whether an agent should (a) return **calibrated MDX + change log** for
  the agency to convert, or (b) **hand-author the Site B HTML directly**. Resolve before Part 4
  content work.

## 6. Chart plan + specs (format-agnostic, still valid)

The Parts 4–6 **content audit**, the **legibility standard** (it is the agency/engine
doctrine), and the **signature chart specs** survive the format change and feed the Site B
work directly: `PARTS_4-6_REWRITE_AND_CHART_PLAN_v1.md` + `chart-specs/SIGNATURE_CHART_SPECS_SLICE_1.md`
(P4-03 tax wedge · P5-01 three postures · P6-01 two-score architecture · P6-04 weekly loop).
The chart inventory + engine doctrine remain at `public/agency-chart-handoff/` +
`components/framework-charts/`.

---

## What changed from v1 (the correction)

v1 (2026-07-07, superseded) declared the ACF-Docs **MDX** canonical and the ACFDashboard HTML
"frozen." That was wrong on both counts: the live site already serves **Site B HTML** for `/`,
part-1/-2/-3 (MDX shadowed), and the owner's strategy is to retire the MDX as Site B expands to
Parts 4–6/7. The v1 error came from auditing only the MDX + the ACFDashboard HTML + the master
index, and **missing `public/site-b/` and `next.config.mjs`** entirely. Corrected per owner
direction (2026-07-07) + `next.config.mjs` + `public/site-b/`.

**Update 2026-07-13 (v3 — migration complete):** Parts 5–6 shipped as Site B (PR #137), and the
owner authorized full retirement: all seven `pages/part-*.mdx` + the Part 7 deck route +
`public/deck/` deleted; `next.config.mjs` comment rewritten as permanent routing; §1 coverage
table, §2 routing bullet, §3, §5, and §5a updated to the post-migration state. Only step 5
(in-app presentation in ACFDashboard) remains open.
