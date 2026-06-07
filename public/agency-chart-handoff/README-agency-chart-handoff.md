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

## 3. The charts (Part 1 + Part 2 + Part 3)

Grouped by where they belong. `chartId` is stable — never rename it. Sets:
**Part 1** (signature + docs landing + Part 1 framework), **Part 2** (lineage &
macro thesis), and **Part 3** (Bitcoin convexity backbone).

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

### Part 2 · lineage & macro thesis
| chartId | Title | Layout | Mode |
|---|---|---|---|
| `p2-method-before-macro` | Method Before Macro | dual | conceptual |
| `p2-ruin-comes-first` | Ruin Comes First | single | conceptual |
| `p2-conviction-needs-exit` | Conviction Needs an Exit | single | conceptual |
| `p2-markets-feed-back` | Markets Feed Back | loop | conceptual |
| `p2-time-changes-prudence` | Time Changes Prudence | single | simulation |
| `p2-capital-finds-bottleneck` | Capital Finds the Bottleneck | flow | conceptual |
| `p2-narrative-not-thesis` | Narrative Is Not Thesis | flow | conceptual |
| `p2-phase-changes-sizing` | Phase Changes Sizing | single | conceptual |
| `p2-liquidity-sets-tide` | Liquidity Sets the Tide | single | representative |

### Part 3 · Bitcoin convexity backbone
| chartId | Title | Layout | Mode |
|---|---|---|---|
| `p3-power-law-holds` | Power Law Holds | single (log) | representative |
| `p3-ten-tests` | One Asset, Ten Tests | scorecard | conceptual |
| `p3-volatility-is-the-toll` | Volatility Is the Toll | single | representative |
| `p3-exposure-not-control` | Exposure Is Not Control | **scenario (interactive)** | simulation |
| `p3-models-must-converge` | Models Must Converge | single | representative |
| `p3-accumulate-dont-trade` | Accumulate, Don’t Trade | heartbeat (price + DCA pulses) | conceptual |
| `p3-cold-storage-to-borrow` | Cold Storage to Borrow | flow | conceptual · **deferred** |
| `p3-reserve-share-evolves` | Reserve Share Evolves | single | simulation · **deferred** |

Part 3 ships **6 active** exhibits; the two deferred specs are kept in the registry (`status: deferred`) but hidden from the handoff page pending redesign.

The machine-readable version of **all** charts (with claims, sources,
disclosures) is in [`chart-inventory.json`](./chart-inventory.json).

## 4. File map

Base (raw, for fetching): `https://raw.githubusercontent.com/Tataku/ACF-Docs/main/`
Base (browse): `https://github.com/Tataku/ACF-Docs/blob/main/`

| File | Role |
|---|---|
| `components/framework-charts/FrameworkChart.jsx` | The chart engine. Data charts (`single`, `dual`, `quadrant`) and bespoke framework diagrams (`systemLoop`, `bridge`, `gate`); hover/tap/keyboard, tooltips, source footer. |
| `components/framework-charts/chart-specs.mjs` | The spec registry — all 11 charts + data generators + disclosure model. Source of truth. |
| `components/framework-charts/brush.js` | Deterministic SVG brush primitives + the bespoke `pressureField` shock background. |
| `components/framework-charts/palette.js` | Locked dark/light palette + accents + fonts. |
| `components/framework-charts/ChartHandoff.jsx` | The review gallery (this preview page). |
| `components/framework-charts/index.js` | Public exports. |
| `styles/framework-charts.css` | Focus rings, reduced-motion safety, print, responsive table. |
| `pages/chart-handoff-export.jsx` | The chrome-free agency preview route. |
| `public/agency-chart-handoff/chart-inventory.json` | Machine-readable inventory. |

### Layout primitives

Two families, one engine:

- **Data charts** — `single` (time series, payoff, distribution), `dual` (stacked panels), `quadrant` (growth × inflation regime map).
- **Framework diagrams** (bespoke, brush-influenced, not flowcharts):
  - `systemLoop` — reflexive / self-reinforcing feedback ring with a reversal cue (e.g. *Markets Feed Back*, *Govern the Thesis*).
  - `bridge` — descending cascade where each stage transforms the prior until the thesis becomes investable (e.g. *Capital Finds the Bottleneck*).
  - `gate` — a sober validation gauntlet; a survivor band thins through four gates into a thesis (e.g. *Narrative Is Not Thesis*).
  - `scorecard` — a requirement × asset matrix with bespoke brush meet/partial/fail glyphs and an emphasised focus column (e.g. *One Asset, Ten Tests*).
  - `scenario` — an interactive, path-aware comparison: all preset strategies are drawn together under the selected shock (the chosen one emphasised, the others muted context), with a capacity-to-act gauge, a trough/intervention zone, a forced-sale mark, and an annotation that updates with the shock. Stat read-outs are split into UPSIDE vs CONTROL and kept subordinate to the visual (e.g. *Exposure Is Not Control*). Click or focus a path to select it.
  - `heartbeat` — a two-register accumulation exhibit: a representative volatile valuation *heartbeat* above a row of DCA *unit pulses* whose height = representative units per dollar, so a price dip buys taller pulses. The accent (framework) pulse stacks above the muted baseline while undervalued (leans in) and falls below it when extended (slows, never sells); the undervalued window reuses the organic `dcaWindow` field (e.g. *Accumulate, Don't Trade*). Representative/conceptual — no historical price, no exact sats.

Each diagram node is hover/tap/keyboard reachable with the same tooltip + disclosure behaviour as the data charts. Default visible text is minimal; detail reveals on hover/tap.

**Framework-diagram design rules** (what makes these bespoke, not flowcharts):
1. A diagram teaches one mechanism, not a list of steps.
2. Nodes are not equal unless the concept requires it; the dominant idea is visually dominant (e.g. the bottleneck is the star of `bridge`).
3. Flow expresses transformation, pressure, filtering, or feedback — not just direction.
4. Default visible text is minimal and non-duplicative; detail lives on hover/tap.
5. Space is used with structural purpose — no dead zones.
6. The visual metaphor matches the framework concept (flywheel for reflexivity, venturi for a constraint, gauntlet for validation).
7. If it looks like PowerPoint, or the mechanism is not nameable in five seconds, it fails.

**At-a-glance design rule** — *"The visible chart must teach the core mechanism before any hover."*
1. The static chart teaches the mechanism; hover/tap adds nuance, it never carries the whole meaning.
2. If the author cannot understand the chart in five seconds, the reader will not either.
3. Background context lines are kept only when they clarify a comparison (e.g. the muted alternative strategies behind the selected one in `scenario`).
4. Text must never collide; a legend is placed *before* the marks it explains (top of the scorecard, not crammed into the footer) and never competes with the chart.
5. Background regions explain a regime or mechanism — never decoration, and never a generic rectangular block where an organic field reads better (the accumulation window uses an ink-wash `dcaWindow` field with sat stipples, not a rectangle).

**Motion rule** — *"Build the chart in the order the idea should be understood."* Charts reveal once they scroll into view (an `IntersectionObserver`, once — `useInViewOnce`); reduced-motion and print reveal immediately and never hide content behind animation. The layered order is:
1. container settles → 2. frame / axis / structural guide → 3. regime or pressure fields breathe in → 4. context series → 5. primary thesis path draws (clip-path, left→right) → 6. markers and annotations resolve → 7. hover/tap affordances activate → 8. explainer / footer stay readable and stable.

Interaction comes after comprehension; animation creates comprehension. It is native (CSS transitions + clip-path draw, no animation library), never loops, and never shifts layout. On the `scenario` chart a strategy/shock change updates the paths and stats quickly **without replaying the build**. The figure exposes `data-build="idle|in"`, `data-reduced-motion`, the `acf-chart-build` class, and `--build-duration` / `--build-stagger` CSS variables as hook points.

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

// Part 1 set — embedded (docs shell) and chrome-free export:
<ChartHandoff />
<ChartHandoff variant="export" initialTheme="dark" />

// Part 2 set — same component, part="part-2":
<ChartHandoff part="part-2" />
<ChartHandoff part="part-2" variant="export" />
```

Routes (all hidden from nav, reachable by URL):
- Part 1: `/chart-handoff` (docs shell), `/chart-handoff-export` (chrome-free)
- Part 2: `/chart-handoff-part-2` (docs shell), `/chart-handoff-part-2-export` (chrome-free)
- Part 3: `/chart-handoff-part-3` (docs shell), `/chart-handoff-part-3-export` (chrome-free)

The `*-export` routes are plain pages (no docs sidebar, navbar, or TOC) — best
for screenshots, PDF, and review.

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

## 11. Reader context (page-level personalization)

The handoff/export pages carry **one optional input near the top** — a *reader
context* — so a reader can feel the framework in their own numbers without the
charts becoming a calculator:

- **Portfolio value** (default `$100,000`) — accepts `250000`, `250,000`, or
  `$250,000`; formats on blur; clamped `$1,000`–`$100,000,000`; empty/invalid
  never crashes or shows `NaN`.
- **Horizon** — `10 years · 20 years · 30+ years · Legacy` (default `30+ years`).
  Renders for multi-cycle / lifetime / legacy framing; only affects a chart if
  that chart explicitly consumes it (none do yet — reserved for later).

State is **local only**: no persistence, no cookies/localStorage, no backend; it
resets on refresh. The context is passed to every `FrameworkChart` as
`readerContext={{ portfolioValue, horizon }}`.

A chart opts in with a spec field:

```js
personalization: { uses: ['portfolioValue'], kind: 'scenario-scale', note: '…' }
```

Charts consuming context in v1 (Part 3 only):

| chartId | kind | what it scales |
|---|---|---|
| `p3-exposure-not-control` | `scenario-scale` | terminal, max drawdown, and dry powder read-outs shown in **dollars** (· %); a caption notes the starting portfolio |
| `p3-volatility-is-the-toll` | `vol-impact` | a caption: *"At a 15% Bitcoin reserve, a 70% Bitcoin drawdown is roughly a $X hit on a $Y portfolio"* |

**Honesty rule:** personalized values **scale representative exhibits; they do not
make them predictive.** Never say *expected / forecast / recommendation / should /
optimized*. Prefer *illustrative / representative / scaled example / starting
portfolio / portfolio impact*. Captions always carry "illustrative, not a
forecast." The validator enforces that any `personalization` block has allowed
`uses` keys, a known `kind`, and a `note`.

Future expansion: wire `horizon` into horizon-sensitive exhibits (e.g.
*Time Changes Prudence*), and optionally persist reader context across the public
Part pages once the charts are placed there.

---

*Generated for marketing/design handoff. Charts are representative exhibits with
honest disclosure; wire historical data only when you intend exact precision.*
