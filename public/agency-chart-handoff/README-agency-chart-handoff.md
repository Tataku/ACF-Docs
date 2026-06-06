# ACF Framework Charts — Agency Implementation Handoff

This is the implementation reference for the Adaptive Convexity Framework (ACF)
chart system. Paste this file (and the linked source files) into your AI or
implementation environment and treat it as the source of truth for reproducing
the charts.

> **One line for your AI:** "Use these files and specs as the chart
> implementation reference. The charts are representative/illustrative exhibits
> with honest disclosure footers — do not present them as exact historical data
> unless a `historical` source is wired."

---

## 1. Purpose

A small, reusable React chart system for the ACF docs landing page and Part 1 of
the framework. One component (`FrameworkChart`) renders any exhibit from a spec.
Every exhibit follows the same loop:

**Claim → Chart → Explainer → Source.**

The look is a self-contained **dark terminal** panel (with a light variant):
quiet, authored, bespoke brush-rendered geometry — explicitly *not* a generic
SaaS/AI dashboard.

## 2. Representative-data disclosure model (read this first)

Charts may use art-directed, **representative** data shapes. That is allowed,
*as long as the disclosure is honest*. Each spec declares:

- `visualDataMode`: `representative` | `historical` | `simulation` | `conceptual`
- `sources[].role`: `verifies-concept` | `backs-series` | `methodology` | `target-source`
- `disclosure`: the one-line footer statement

Footer statements (consistent, minimal — shown once per chart):

- **representative** — "Representative framework exhibit · Sources support the underlying concept"
- **simulation** — "Representative simulation · Built to show path dependency, not a historical backtest"
- **conceptual** — "Conceptual diagram · Illustrative framework exhibit, not historical data"
- **historical** (once wired) — "Source: [Provider] · [Series] · [Frequency] · [Transform]"

Rules:
- If plotted points are art-directed, **do not** call them exact historical data.
- Citations may support the *concept/backdrop* rather than the plotted geometry — that is labelled (`verifies-concept`).
- Simulations say simulation. Conceptual diagrams say conceptual.
- Representative value read-outs are labelled `· REPRESENTATIVE`, never `TRUE VALUE`.

## 3. The 11 charts

Grouped by where they belong. `chartId` is stable — never rename it.

### Signature / reusable (the payoff-shape language)
| chartId | Title | Layout | Mode |
|---|---|---|---|
| `sig-payoff` | Shape the Payoff | single | conceptual |
| `sig-shape` | Bend the Tail | single | conceptual |

### Docs landing page
| chartId | Title | Layout | Mode |
|---|---|---|---|
| `dl-convexity-window` | The Window Opens | single | representative |
| `dl-regime-map` | Capital Has Weather | quadrant | representative |
| `dl-tripwire-loop` | Govern the Thesis | loop | conceptual |

### Part 1 framework
| chartId | Title | Layout | Mode |
|---|---|---|---|
| `p1-hedge-broke` | The Hedge Broke | single | representative |
| `p1-correlation` | Correlation Turns | single | representative |
| `p1-cpi-assets` | Inflation Was Bigger | single | representative |
| `p1-policy-constraint` | The Bill Came Due | dual | representative |
| `p1-sequence-risk` | Path Changes Everything | single | simulation |
| `p1-convexity-survival` | Survive the Path | single | representative |

The machine-readable version (with claims, sources, disclosures) is in
[`chart-inventory.json`](./chart-inventory.json).

## 4. File map

Base (raw, for fetching): `https://raw.githubusercontent.com/Tataku/ACF-Docs/main/`
Base (browse): `https://github.com/Tataku/ACF-Docs/blob/main/`

| File | Role |
|---|---|
| `components/framework-charts/FrameworkChart.jsx` | The chart engine (single/dual/quadrant/loop layouts, hover/tap/keyboard, tooltips, source footer). |
| `components/framework-charts/chart-specs.mjs` | The spec registry — all 11 charts + data generators + disclosure model. Source of truth. |
| `components/framework-charts/brush.js` | Deterministic SVG brush primitives + the bespoke `pressureField` shock background. |
| `components/framework-charts/palette.js` | Locked dark/light palette + accents + fonts. |
| `components/framework-charts/ChartHandoff.jsx` | The review gallery (this preview page). |
| `components/framework-charts/index.js` | Public exports. |
| `styles/framework-charts.css` | Focus rings, reduced-motion safety, print, responsive table. |
| `pages/chart-handoff-export.jsx` | The chrome-free agency preview route. |
| `public/agency-chart-handoff/chart-inventory.json` | Machine-readable inventory. |

## 5. How to render one chart

```jsx
import FrameworkChart from "../components/framework-charts";

// by id (looks the spec up from the registry):
<FrameworkChart id="p1-hedge-broke" theme="dark" accent="green" />
```

`theme` is `"dark"` (default) or `"light"`. `accent` is `"green"` (default),
`"gold"`, or `"signal"`.

## 6. How to render the full gallery

```jsx
import ChartHandoff from "../components/framework-charts/ChartHandoff";

// embedded (inside docs shell):
<ChartHandoff />

// chrome-free agency export (full-bleed, dark/light toggle):
<ChartHandoff variant="export" initialTheme="dark" />
```

The export route at `/chart-handoff-export` is a plain page (no docs sidebar,
navbar, or TOC) — best for screenshots, PDF, and review.

## 7. Data honesty rules (do not break)

1. Real-data charts must cite at least one source.
2. Non-real charts (representative/simulation/conceptual) must disclose.
3. Never label representative geometry as exact historical data or `TRUE VALUE`.
4. One chart = one claim.
5. Keep the disclosure to one quiet footer line per chart — do not over-warn.

A validator enforces this: `npm run validate:charts`.

## 8. Styling constraints (the bespoke look)

- Dark terminal foundation; restrained cyan/green thesis line; muted secondary strokes.
- **No** single-edge accent borders, glows, or generic SaaS card tricks.
- Text always renders above geometry (halo/scrim), and text must not collide
  with other text — labels move, shorten, or become hover-only rather than overlap.
- The inflation-shock background is a bespoke `pressureField` (asymmetric ink
  plume + grain), never a rectangle.
- Animations respect `prefers-reduced-motion`; hover has a keyboard/focus
  equivalent; mobile uses tap, never hover.

## 9. Public pages are not auto-wired

The charts live only on `/chart-handoff` (internal) and `/chart-handoff-export`
(agency). They are **not** embedded in the public framework pages
(`pages/part-1-foundation.mdx`, etc.). Placement into public pages is an
explicit, separate decision.

## 10. Historical-data upgrade path

To make a representative chart use exact data later:

1. Wire the real series into that chart's `series[].pts` in `chart-specs.mjs`
   (the target providers are already listed in each spec's `sources`).
2. Set `visualDataMode: "historical"` and `wiredPublic` as appropriate.
3. The footer automatically switches from the representative disclosure to a
   verifiable `Source: …` citation. No engine change required.

---

*Generated for marketing/design handoff. Charts are representative exhibits with
honest disclosure; wire historical data only when you intend exact precision.*
