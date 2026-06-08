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

## 0. Engine doctrine — ACF charts are guided learning instruments

The engine produces **guided learning instruments**, not decorations, generic
visualizations, calculators, or marketing animations. It is built for a visual +
kinesthetic learner: *see the idea, touch the idea.* Every chart must answer, in
order — **What am I looking at? What changes? Why? What can I touch? What does my
input affect? What is the one idea to remember?** If it can't, it isn't finished.

- **Visual + kinesthetic rule.** The visible default teaches the core idea *before*
  hover. Interaction deepens it; it never unlocks the whole meaning. The physical
  gesture must match the concept — a reveal reveals, a scenario selector changes
  the path, a return-order control reorders the deck, a DCA chart shows price→units.
  No decorative or arbitrary interaction.
- **One chart = one claim.** A single primary claim; everything else supports it
  (`claimStack.primaryClaim`, resolved from `frameworkClaim` when not explicit).
- **Show the mechanism, not just the result.** If the claim is "same return set",
  "DCA buys more units", "the debt cost was hidden", or "capacity changes the
  outcome", the visual shows the *mechanism* (the shared deck, the units = $÷price
  bars, the spatial reveal, the all-paths spread) — never an unshown "identical" input.
- **Math-backed where math is claimed.** If a chart uses a formula, the formula or
  its visual equivalent is visible — e.g. `DCA $ ÷ price = units`. A poetic field
  that only *implies* math does not count.
- **Interaction must match concept.** before/after = clipped spatial reveal (not an
  opacity toggle); scenario = alternate path with clear state changes; return order
  = same deck rearranged; reader context = a consistent scale intro. Charts whose
  interaction is *central* carry a quiet **"Try this"** cue above the visual
  (`resolveTryThis`) — reveal/scenario/return-order/reader-context only; hover-only
  charts get none (the default already teaches).
- **Motion follows comprehension.** It draws in the order the idea is understood
  (see *Motion follows comprehension* below). Reduced motion reveals immediately.
- **Context visible where it changes interpretation.** If reader simulation context
  changes a chart, the chart says so *near the visual* (`Scaled example · $250,000
  starting value · 30+ years`), not only in the footer.
- **Data honesty.** Every chart declares its `visualDataMode`; representative
  geometry is never labelled exact data, simulations say simulation, and no visible
  claim copy uses promissory/forecast language. `validate:charts` enforces this.

### Taste guardrails
- **No:** top-edge card highlights, glows, neon, SaaS pills, chart-library defaults,
  random blobs, text collisions, decoration without an explanatory role, oversized
  UI controls inside the plot, ornamental "AI-slop" flourishes.
- **Yes:** quiet editorial type, generous spacing, clear hierarchy, low-contrast
  structural context, accent reserved for the thesis line / selected path, organic
  brush imperfection only where it supports the concept. Human but precise.

### Chart doctrine metadata (resolved, with explicit override)
Carried per spec; **derived from layout when not declared**, so the doctrine holds
across all charts without hand-editing each. Surfaced in `chart-inventory.json`,
enforced by `validate:charts`.

| Field | Purpose | Allowed values |
|---|---|---|
| `claimStack` | one claim + its proof + the reader's role | `{primaryClaim, visualProof, interactionRole, readerAction, caution}` (strings) |
| `interaction` | gesture ↔ concept | type `none·hover·scenario·beforeAfterReveal·readerContext·returnOrder·slider`; gesture `hover·tap·drag·choose·type`; `conceptMatch` |
| `motionProfile` | how it builds | type `timeSweep·reveal·rowSweep·scenarioUpdate·diagramBuild`; duration `calm·slow·transformational` |
| `backgroundRole` | why a field exists | `regime·pressure·relational·revealLayer` — never `decorative` |
| `personalization` | reader-context scaling | `uses[]` ⊂ `startingValue·horizon·withdrawalRate·btcReserveAllocation·monthlyDca`; `kind` ∈ `scenario-scale·vol-impact·sequence-scale·horizon-scale·dca-note` |

Concept-critical layouts (`scenario`, `dual + perspectiveSlider`) **must** declare
`interaction` with a `conceptMatch`; `beforeAfterReveal` must declare
`beforeAfterLabels {before, after}`; a DCA / `heartbeat` chart must declare a
`formula`. Resolvers + enums live in `chart-specs.mjs` (single source of truth):
`resolveClaimStack`, `resolveInteraction`, `resolveMotionProfile`,
`resolveBackgroundRoles`, and the simulation-intro helpers `formatStartingValue`,
`formatHorizon`, `getSimulationIntro`, `buildPersonalizedDisclosure`.

### Story beats & experience role (the teaching contract)

Each chart resolves a **comprehension arc** — the order the idea should build in —
and an **experience role** — what kind of learning experience it is. Both are
*non-visible contracts* for the inventory, this README, and (next) per-family
motion choreography; explicit per-spec values win, otherwise they're derived.

- `experienceRole` ∈ `evidence · comparison · mechanism · conversion · reveal · matrix · diagram`.
- `storyBeats[]` — ordered `{ kind, label, timing }`; `kind` ∈ `context · mechanism · action · consequence · takeaway`, `timing` ∈ `early · middle · late` (never goes backwards). The default arc is *context → mechanism → (action, if interactive) → consequence*. The **`takeaway`** (the remembered idea) is the existing `readerTakeaway`, so default beats stop at `consequence` and never duplicate it.

Resolvers: `resolveExperienceRole`, `resolveStoryBeats` (`chart-specs.mjs`). *Example:* `The Bill Came Due` declares `reveal` + `context → mechanism → action → consequence` so the build and the divider gesture follow the same order the reader understands it.

### Mobile behavior (not "just shrink")

Each layout declares how it adapts on touch and how much vertical room it needs, via `mobileBehavior { interaction, chartHeight, note }` (derived per layout; explicit wins):

- `interaction` ∈ `tap-cycle · snap-slider · stacked-controls · stacked · scroll-x · simplified`.
- `chartHeight` ∈ `standard · tall · auto`. On a coarse pointer the engine gives **`tall`** layouts ~20% more vertical room (so line charts, unit bars, reveal and paths don't render as a short strip); `auto` (scorecard) is content-sized; `standard` (diagrams) scales as-is.

Already native on touch: the before/after reveal **snaps** to Surface / Split / Hidden cost on release; every chart is tap-to-explore (`MobileInsight`) with enlarged hit targets. The `note` records the per-layout target (e.g. *stack scenario controls; deck above paths*) as the QA signal for deeper per-layout reflow. Resolver: `resolveMobileBehavior` (`chart-specs.mjs`).

#### Mobile charts are touch-guided exhibits

A mobile chart is **not** a hover chart squeezed onto a phone. The reader sees the whole idea first, then taps or drags to focus the lesson:

- **Default is full visibility.** On a coarse pointer no element is emphasized until the reader acts (`active` is `null` by default, exactly like desktop) — nothing loads dimmed or "under-hydrated".
- **Interaction emphasizes; it never replaces.** A tapped element brightens; the rest stays readable as context (dim floor ~0.5 on coarse — hierarchy, never disappearance). Tapping the background returns to full view.
- **No accidental flashes.** `-webkit-tap-highlight-color` is cleared on every chart surface and the in-chart focus chips are inert on touch (no focus-scroll), so a tap never flashes or jumps the viewport.
- **Detail is contained.** The `MobileInsight` rail lives inside the card below the plot (overview ↔ inspect, 44px controls) — never a viewport overlay.
- **Sliders are touch-first.** The before/after reveal makes the whole chart the control: tap to jump the divider, drag to scrub (pointer-captured; `touch-action: pan-y` so vertical page-scroll still works), snapping to Surface / Split / Hidden cost on release.
- **Copy is touch-direct.** `resolveTryThis(spec, coarse)` swaps in tap/drag language on mobile (override with `tryThisMobile`).

### Progressive disclosure

The reader should see the chart **story** first; the citation/methodology machinery is one intentional click away.

- **The chart story comes first** — header → simulation intro (if any) → visual → explainer / takeaway. The explainer stays visible; it is the guided story, not detail.
- **Data-mode honesty is visible in the header** — a compact first-principles marker (`getDataModeMarker`: ◌ Conceptual · ◇ Representative / Simulation · ▪ Historical) sits in the title meta row, so the reader sees *what kind of exhibit this is* immediately.
- **Source / methodology detail is preserved behind disclosure** — the full disclosure sentence, `View sources / methodology` (+ source popover), source roles, and *connects-to* tags collapse into a quiet `Details, sources & methodology` toggle (a real `<button>` with `aria-expanded` / `aria-controls`), collapsed by default in Reader **and** Agency (local per-card state; the agency inventory remains available separately). Nothing is removed — `chart-inventory.json` and the specs keep every source.
- **Expandable detail is for verification, not first-pass comprehension.** **Do not make citation mechanics compete with the visual claim.**

### Tooltip motion

The tooltip should feel like it understands the reader's attention — follow the cursor with grace, not jitter with every pixel.

- **Tooltips follow attention, not raw pointer noise.** Desktop **hover** uses velocity-aware smoothing: pointer events update a target only; a `requestAnimationFrame` loop eases the tooltip toward `cursor + offset` (accelerate when far, decelerate when near, a dead-zone that ignores sub-pixel tremor). No layout thrash — position is a `translate3d` transform.
- **Pinned tooltips are stable anchors, not cursor followers.** Click pins to the element's anchor; pointer movement no longer moves it; Escape unpins; clicking another target re-pins. Links inside a pinned tooltip stay clickable (`pointer-events: auto`; hover tooltip is `pointer-events: none`).
- **Edge-aware placement.** Offset from the point, flip sides near edges with hysteresis (no oscillation), clamped inside the chart container (`placeTip`). The tooltip self-positions via its `offsetParent` — no per-chart wiring.
- **Motion improves legibility** — calm and precise, never bouncy/overshoot. **Reduced motion** removes the follow animation: the tooltip anchors to the data point (the prior calm behavior). **Mobile** uses tap-to-inspect (`MobileInsight`), never hover emulation.

### How to add a new chart safely
1. Add a spec with a stable kebab `chartId`, `group`, `intendedPlacement`,
   `status`, `visualDataMode` + `disclosure`, `sources[]`, `frameworkClaim` +
   `readerTakeaway`, `explainer*`, and `hoverTargets`.
2. Pick the closest existing `layout`; reuse a primitive before inventing one.
3. Make the **default state teach the claim**; add hover/tap detail second.
4. Override `claimStack` / `interaction` / `motionProfile` only if the derived
   defaults don't fit; add `personalization` only when scaling has honest meaning.
5. `npm run validate:charts` → `npm run build:inventory` → `next build`.
6. `npm run audit:chart-experience` — the **non-failing** coaching report (design QA, not a gate): actionable RISKS (hover-only density, unarticulated mechanism, label crowding, relational backgrounds to verify) + CONTEXT (status + which charts lean on derived doctrine). `validate:charts` is the gate; this keeps the validator from becoming a design prison.
7. Charts stay handoff-only; placement into public pages is a separate decision.

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
| `dl-tripwire-loop` | Govern the Thesis | systemLoop | conceptual |

### Part 1 framework
| chartId | Title | Layout | Mode |
|---|---|---|---|
| `p1-hedge-broke` | The Hedge Broke | single | representative |
| `p1-correlation` | Correlation Turns | single | representative |
| `p1-cpi-assets` | Inflation Was Bigger | single | representative |
| `p1-policy-constraint` | The Bill Came Due | dual + before/after reveal | representative |
| `p1-sequence-risk` | Path Changes Everything | sequenceRisk (shared return deck) | simulation |
| `p1-convexity-survival` | Survive the Path | single | representative |

### Part 2 · lineage & macro thesis
| chartId | Title | Layout | Mode |
|---|---|---|---|
| `p2-method-before-macro` | Method Before Macro | dual | conceptual |
| `p2-ruin-comes-first` | Ruin Comes First | single | conceptual |
| `p2-conviction-needs-exit` | Conviction Needs an Exit | single | conceptual |
| `p2-markets-feed-back` | Markets Feed Back | systemLoop | conceptual |
| `p2-time-changes-prudence` | Time Changes Prudence | single | simulation |
| `p2-capital-finds-bottleneck` | Capital Finds the Bottleneck | bridge | conceptual |
| `p2-narrative-not-thesis` | Narrative Is Not Thesis | gate | conceptual |
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
| `components/framework-charts/chart-specs.mjs` | The spec registry — all 28 charts + data generators + disclosure model + engine-doctrine enums/resolvers. Source of truth. |
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
  - `scenario` — an interactive, path-aware comparison: all preset strategies are drawn together under the selected shock (the chosen one emphasised, the others muted context), with a capacity-to-act gauge, a trough/intervention zone, a forced-sale mark, and an annotation that updates with the shock. Stat read-outs are split into UPSIDE vs CONTROL and a **decision-strain** behavioural signal, kept subordinate to the visual. Below them an **across-all-paths** strip plots every strategy's outcome under all shocks (x = terminal, dot = whether you stay in control) — because you commit to a strategy *before* the shock is known, so the honest test is the spread/floor across paths, not winning one cell. No strategy is best on every path; the framework holds the tightest in-control band (e.g. *Exposure Is Not Control*). Click or focus a path to select it.
  - `sequenceRisk` — a *proof* layout for path dependency: a shared **return deck** (the same representative returns shown in two orders, shape- and tone-coded so the reversal is visible) above two portfolio paths **generated from those exact returns**, with level-withdrawal ticks on both and a depletion line (e.g. *Path Changes Everything*). The deck and the paths are the same math — the chart proves "same returns, same withdrawals, different order" rather than asserting it. **Design rule — prove, don't assert:** when a chart's claim is "identical inputs, different outcome," show the shared inputs as a visible factor tied to the output math; never ask the reader to trust an unshown "identical" set.
  - `heartbeat` *(internal layout name; "heartbeat" is never visible copy)* — a math-grounded, two-register accumulation exhibit: a representative **BTC price index** above a row of **DCA unit bars** whose height = **fixed dollars ÷ price**, so a lower price buys taller bars (the conversion is shown as a small "DCA $ ÷ price = units" anchor in the transition zone). The accent (framework) bar stacks above the muted baseline only in the confirmed undervalued window (leans in) and falls below it when extended (slows new buying, never sells); a faint, secondary relational `unitCaptureField` backs the undervalued region without dominating (e.g. *Accumulate, Don't Trade*). Representative/conceptual — no historical price, no exact sats.

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
5. Background regions explain a regime or mechanism — never decoration, and never a generic rectangular block where an organic field reads better (the accumulation window uses an ink-wash field with sat stipples, not a rectangle).

**Relational background fields** — when a background highlight has meaning *in relation to* the data, its shape must be derived from that relationship, not placed as static decoration. A relational field should: align with the elements it explains; **grow where the mechanism strengthens and narrow where it fades**; visually connect cause and effect; never obscure primary data; and grow/fade in sync with the build. *Bad:* a static shaded block behind the undervalued period. *Good:* `unitCaptureField` in *Accumulate, Don't Trade* — a lens whose contours are driven by price weakness (top) and pulse height (bottom), so it bulges where BTC is cheapest and the DCA pulses are tallest and pinches shut as the advantage fades.

**Before/after reveal** — when the *same* chart has two valid readings and the reader needs to move between them, render a true **clipped spatial reveal**, never an opacity / emphasis toggle. Rules: two full chart STATES share ONE SVG coordinate space; a draggable vertical divider clips one state over the other, so dragging spatially **wipes** one view to expose the other; **both states must be truthful** and share their structural backdrop so it reads continuous across the wipe; endpoint labels name each side; the default invites interaction while showing both (`revealDefault` ≈ `0.5`); drag / arrow keys / `Home`–`End` / touch-snap, keyboard-accessible, no dependency; reduced-motion + print reveal safely. Declared with `interaction.type: 'beforeAfterReveal'` + `beforeAfterLabels {before, after}` + `revealDefault`. *Example:* `BeforeAfterRevealSvg` in *The Bill Came Due* — one debt/GDP backdrop is present in both states; the surface state keeps the interest cost faint, and dragging the divider wipes it away to expose, beneath the *same* backdrop, the rising interest line, its burden inflection, an interest-burden threshold and a pressure zone. The cost was never separate from the debt — it was hidden beneath it.

**Motion rule** — *"Build the chart in the order the idea should be understood."* Charts reveal once they scroll into view (an `IntersectionObserver`, once — `useInViewOnce`); reduced-motion and print reveal immediately and never hide content behind animation. The layered order is:
1. container settles → 2. frame / axis / structural guide → 3. regime or pressure fields breathe in → 4. context series → 5. primary thesis path draws (clip-path, left→right) → 6. markers and annotations resolve → 7. hover/tap affordances activate → 8. explainer / footer stay readable and stable.

Interaction comes after comprehension; animation creates comprehension. It is native (CSS transitions + clip-path draw, no animation library), never loops, and never shifts layout. The figure exposes `data-build="idle|in"`, `data-reduced-motion`, the `acf-chart-build` class, and `--build-fast / --build-medium / --build-path / --build-long / --build-stagger-* / --build-ease` CSS variables as hook points.

**Motion follows comprehension** (the human-paced doctrine):
- The build is **slow enough to read** — main paths draw over ~1.4–2s, full charts ~2.2–3.6s, with a calm ease (`--build-ease`), never bouncy or abrupt.
- **Time-series move left→right.** A single master *time-sweep* reveals bands, areas and all series together, so the data is drawn through time as one motion.
- **Mechanically related lines move together** (baseline + framework, invested + portfolio, band + price, model envelope + price) — never one full line then another.
- **Backgrounds grow and fade with their data window** — regime/shock/accumulation fields reveal in sync with the time span they cover, not as a popped rectangle.
- **Markers appear when the sweep reaches them**; **labels appear after the object they describe exists** (opacity + tiny translate only — never at the cost of readability).
- **Interaction is a quick update, not a replay** — a `scenario` strategy/shock change re-draws paths/stats in place (~250–500ms) and never re-runs the scroll-build.
- **Reduced motion reveals immediately** — no path drawing, no staged transforms, no blank below-fold charts in print/export.
- **Motion is split into families** — `timeSweep` (the shared sweep, default), `reveal` (layer wipe), `rowSweep` (deck / scorecard rows), `scenarioUpdate` (quick in-place), `diagramBuild` (staged nodes). Each family's tempo is **governed** by `MOTION_TIMING` / `resolveMotionTiming` (`chart-specs.mjs`) and exposed on the figure as `data-motion`. The shared `PlotSvg` sweep consumes it; bespoke renderers carry matching choreography. `timeSweep` preserves the prior values exactly, so this standardizes the tempo without changing what ships today.

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

## 11. Simulation context (page-level personalization)

The handoff/export pages carry **one optional input panel near the top** — the
**SIMULATION CONTEXT** — so a reader can feel the framework in their own numbers
without the charts becoming a calculator. The reader sets five assumptions:

- **Starting value** — default `$100,000`, clamped `$1,000`–`$100,000,000`.
- **Time horizon** — `10 · 20 · 30+ · Legacy` (default `30+ years`).
- **Withdrawal / yr** — `3 · 4 · 5 · 6%` (default `4%`).
- **Bitcoin reserve** — `5 · 10 · 15 · 25%` (default `15%`).
- **Monthly DCA** — dollar amount (default `$500`, clamped `$0`–`$100,000`).

Inputs accept `250000`, `250,000`, or `$250,000`; format on blur; empty/invalid
never crashes or shows `NaN`. Canonical keys: `startingValue · horizon ·
withdrawalRate · btcReserveAllocation · monthlyDca` (`portfolioValue` is a legacy
alias normalized by `readStartingValue`).

**Single local source of truth across pages.** The context is **persisted in
`sessionStorage` only** (key `acf-sim-context`) — no cookies, no `localStorage`,
no backend, no account. Changing a value on the Part 1 page carries it to Part 2
and Part 3 for the session; it resets when the tab closes. It is passed to every
`FrameworkChart` as `readerContext`, and charts update **immediately**.

**Doctrine — honest wiring only.** If a reader enters an input, every chart that
*honestly* uses it discloses it and updates; every chart that cannot use it
ignores it. A chart opts in with `personalization: { uses, kind, introLead, note }`
and discloses **exactly** the inputs in `uses` via `getSimulationIntro(spec, ctx)`
(a quiet line **above** the visual) — never an input it doesn't consume. The one
computed figure the intro can't carry (a dollar drawdown, multiples at a horizon)
is `getSimulationNote(spec, ctx)`, a quiet callout **below** the visual.

Charts consuming context (every other chart stays conceptual and ignores it, by design):

| chartId · part | uses | what it does |
|---|---|---|
| `p1-sequence-risk` · 1 | `startingValue`, `withdrawalRate` | **re-simulates both paths** from the shared deck at the chosen withdrawal rate (clamped to a 2–8% representative band, dynamic y-domain; default 4% = the current paths); start / withdrawal / ending values in dollars |
| `p2-time-changes-prudence` · 2 | `startingValue`, `horizon` | reads the convex vs conventional multiples **at the chosen horizon** and scales them to dollars — the one Part 2 chart the horizon honestly drives |
| `p3-exposure-not-control` · 3 | `startingValue` | terminal / max-drawdown / dry-powder read-outs in dollars |
| `p3-volatility-is-the-toll` · 3 | `startingValue`, `btcReserveAllocation` | a callout: *"At a 15% Bitcoin reserve, a 70% drawdown is ≈ $X on a $Y portfolio"* — the reserve size is the reader's |
| `p3-accumulate-dont-trade` · 3 | `monthlyDca` | makes the conversion concrete: *"$500 ÷ price = units received"* — representative units on a representative index, no fake totals |

`kind` ∈ `scenario-scale · vol-impact · sequence-scale · horizon-scale · dca-note`.
Helpers (`chart-specs.mjs`): `formatStartingValue`, `formatPercent`,
`formatHorizon`, `horizonYears`, `getSimulationIntro`, `getSimulationNote`,
`buildPersonalizedDisclosure`.

**Honesty rule:** personalized values **scale representative exhibits; they do not
make them predictive.** Never say *expected / forecast / recommendation / should /
optimized*. Prefer *illustrative / representative / scaled example / portfolio
impact*. Every personalized chart carries "illustrative/representative, not a
forecast." Conceptual / macro charts (regime maps, loops, scorecards, ruin, payoff
shapes, correlation, CPI, power-law, liquidity) **do not** personalize — scaling
them would be fake. The validator enforces allowed `uses`, a known `kind`, a
`note`, and that every personalized chart produces an intro.

---

*Generated for marketing/design handoff. Charts are representative exhibits with
honest disclosure; wire historical data only when you intend exact precision.*
