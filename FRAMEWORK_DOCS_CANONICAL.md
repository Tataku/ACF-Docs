# Framework Docs — Canonical Location & Agent Entry Point

> **Canonicality note — established 2026-07-07** (Closed-Loop readiness pre-flight).
> This file resolves a long-standing drift: the ACF framework narrative exists in
> more than one place, on more than one domain. It states which copy is
> authoritative *now* and how agents should treat the others. It is a pointer +
> guardrail, not a rewrite. Reversible by a superseding owner decision.

---

## 1. Canonical source of the framework narrative

**The living, authoritative framework narrative is the published MDX in this repo:**

```
ACF-Docs/pages/part-1-foundation.mdx
ACF-Docs/pages/part-2-lineage-macro-thesis.mdx
ACF-Docs/pages/part-3-bitcoin-convexity-backbone.mdx
ACF-Docs/pages/part-4-tax-architecture-roc-strategy.mdx
ACF-Docs/pages/part-5-portfolio-construction-position-management.mdx
ACF-Docs/pages/part-6-convexity-framework-integrity-scoring.mdx
ACF-Docs/pages/part-7-intro-deck.mdx
```

- Published at **docs.acfdashboard.com** (Nextra site; nav in `pages/_meta.json`).
- These are the **rewrite target** for any framework-content work, including the
  Parts 4–6 rewrite. Edit *here*.

## 2. The other copies — do not treat as canonical, do not break

| Location | What it is | Treatment |
|---|---|---|
| `ACFDashboard/ACF - Framework Documents - Parts 1-6/PartN_*_FINAL.html` | A **separate, production-served** HTML copy on the **app** domain (`acfdashboard.com/part1`–`/part6`). | **Frozen / reference. DO NOT rewrite or rename as part of docs work.** The folder name (with spaces) and each `PartN_*_FINAL.html` filename are a **production routing contract** — `vercel.json:54-65` rewrites `/part1`–`/part6` to them and `vite.config.ts:322-325` copies them into `dist/`. Renaming/moving/deleting silently 404s production (`ACFDashboard/docs/REPO_STRUCTURE.md` §4). |
| `ACFDashboard/ACF - Framework Documents - CIS, FIS, Governance/FRAMEWORK_MASTER_INDEX_v2.md` | A **historical index** (dated Jan 15 2026) that points at the `.html` working versions and says "Parts 1-4 Complete". | **Historical / superseded as a canonicality pointer.** Useful as context for the HTML copy; NOT the current authoritative narrative. Carries a canonicality banner as of 2026-07-07. |
| `ACFDashboard` in-app Framework Doc viewer (`FrameworkDocViewerPage`) | App surface that renders framework content. | Out of scope for the docs rewrite; follows the app's own routing. |

## 3. Unresolved owner decision (soft blocker — does NOT block the rewrite)

Whether the app-domain HTML copy should (a) redirect to docs.acfdashboard.com,
(b) be regenerated *from* this MDX, or (c) continue as an independent parallel
copy is an **open owner decision** (first raised in
`ACFDashboard/docs/ROADMAP_AUDIT.md:192`, still unresolved). Until the owner
decides, **the MDX is canonical for content and the HTML stays frozen and
production-wired.** The rewrite proceeds against the MDX regardless.

---

## 4. Chart system — machine-readable entry point (use FIRST, do not rediscover)

**Do not re-scan the repo to learn chart state.** Read the inventory:

```
ACF-Docs/public/agency-chart-handoff/chart-inventory.json   ← 28 charts, machine-readable
ACF-Docs/public/agency-chart-handoff/README-agency-chart-handoff.md   ← engine doctrine + taste guardrails
ACF-Docs/components/framework-charts/chart-specs.mjs         ← chart specs
```

Each inventory entry carries `chartId · idx · part · group · status · wiredPublic ·
layout · dataMode · primaryClaim · sources · agencyNotes`. Extract the fields you
need (e.g. with a script); **do not read the 2,268-line JSON cover-to-cover.**

**Current coverage (as of 2026-07-07):**

- **28 charts**, covering **Parts 1–3 + landing + signature only.**
  `part-1: 6 · part-2: 9 · part-3: 8 · docs-landing: 4 · signature: 2`.
- **Parts 4, 5, 6 have ZERO charts** → they need **net-new chart design**.
- Status: `needs-design-review: 19 · implemented: 7 · deferred: 2`.
- **`wiredPublic: false` for all 28** — every chart is handoff-only; none is wired
  into a live published page yet.

**Triage taxonomy** for the existing 28 exhibits: **keep · redesign · relocate ·
scrap · defer** — decide each against its `status`, `agencyNotes`, and the engine
doctrine (one chart = one claim; honest disclosure footer; interaction matches
concept). **Public wiring is a separate decision from design approval** — a chart
can be design-approved while staying `wiredPublic: false` until an explicit
wiring slice.

## 5. Token discipline for framework-docs runs

1. Read this note + `chart-inventory.json` (fields only) **first** — that is the map.
2. Then read **only** the specific Part MDX sections in scope — never the whole `pages/` tree.
3. Extract inventory fields with a script; do not read the full JSON.
4. No whole-repo sweep without a stated trigger.
5. Do not touch the app-domain HTML copy or `vercel.json` / `vite.config.ts` routing.
