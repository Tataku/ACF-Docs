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

### Chart grammar — choose the FORM from the RELATIONSHIP (read this before picking a layout)

The engine carries `claimStack`, `experienceRole`, `interaction`, `motion`, and
`layout`, but the thing that most often goes wrong is **rendering a claim in a
technically-valid-but-semantically-weak form** — a line for a *composition* claim, a
flowchart for a *magnitude comparison*. So every chart also resolves a
**`visualRelationship`** (`resolveVisualRelationship`, `chart-specs.mjs`): the
semantic relationship it teaches. **Name the relationship first, then pick the form
from this matrix — do not reach for the nearest existing layout.**

`VISUAL_RELATIONSHIPS = trend · comparison · composition · flow · threshold ·
distribution · sequence · matrix · reveal · hierarchy`. The validator hard-checks the
value and emits a **soft advisory** (never a build failure) when a declared
relationship sits outside its layout's `LAYOUT_RELATIONSHIPS` fit — a nudge to
re-pick the form or re-examine the claim.

| Relationship | Reach for | Not | Live example |
|---|---|---|---|
| **composition** — parts of one whole / ownership | **`radial`** donut (share IS the claim); a 100% split bar for 2–3 parts | a line/area (can't show a share); a pie with >5 slivers | `p4-gross-not-net` (donut) |
| **comparison** — magnitude across a few things | **`laneBar`** (parallel lanes, one scale, aligned compare segment); `single` slope; `scenario` | a flow diagram (routing ≠ magnitude); a donut | `p4-roc-yield` (laneBar), `p3-exposure-not-control` |
| **trend** — change through time | `single` / `dual` line·area·stepped | bars for a smooth series; a diagram | `p1-cpi-assets`, `p4-tax-wedge` (scaling divergence) |
| **flow** — causal routing / filtering / feedback | `flow` · `bridge` · `gate` · `governanceLoop` · `feedbackLoop` | a bar/line (loses the routing); a donut | `p2-capital-finds-bottleneck` (bridge) |
| **threshold / capacity** — against a limit | `single` with a guide/level (bullet-like); a gauge | a full time series when only the crossing matters | `p3-reserve-share-evolves` |
| **distribution** — spread / range / density | `single` range·band·histogram | a single mean line (hides the spread) | *(open)* |
| **sequence** — order dependence | `sequenceRisk` (shared deck, two orders) | asserting "same inputs" without showing them | `p1-sequence-risk` |
| **matrix** — tradeoff / requirement × asset / regime | `quadrant` · `scorecard` | prose table; a bar chart of one column | `dl-regime-map` (quadrant); `scorecard` renderer available |
| **reveal** — two truths, before/after | `dual` + `perspectiveSlider` (clipped spatial wipe) | an opacity toggle | `p1-policy-constraint` |
| **hierarchy** — nesting / part-of-part | `radial` concentric (reserved) · (treemap = future) | forcing it into a flat donut | *(future)* |

**The multi-lane family (`laneBar`).** `laneBar` is the first member of a **multi-lane
comparison** family: N parallel lanes over ONE shared scale, aligned at a common
origin so the length of the marked `compare` segment is directly comparable
lane-to-lane. A lane may carry a hatched **deferred** underline — a claim that exists
but is not taken *now* (so the picture never implies money vanished). It is the seed
of a unified multi-lane vocabulary intended to be shared with the dashboard analytics
engine (see the cross-engine note below).

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

**Mobile touch behavior is viewport-scoped, not device-scoped.** Interaction mode keys off `isNarrowViewport` (`max-width: 700px`) alone — a desktop-width view preserves hover + click-to-pin even on touch / hybrid devices (touch laptops, tablets in landscape, responsive emulation). Touch *capability* (`isTouchPrimary` = `hover: none and pointer: coarse`) only widens hit/grab targets (`touch = narrow || touchPrimary`); it never downgrades a wide desktop view into the mobile model.

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

### Tooltip simulation context

If Simulation Context changes a chart, the **tooltip must express the selected point through that context** where mathematically honest — it must not contradict an intro that says `$100,000 start · 30+ years horizon` by reporting only `180.3 × START`. One resolver, `getTooltipValueText(spec, ctx, …)`, returns a two-line `{ primary, secondary }`:

- **Primary = the contextual value:** multiples → dollars (*Time Changes Prudence* `$18M`), re-simulated path / terminal → dollars (*Path Changes Everything* `$116k`, *Exposure* terminal), DCA → the entered amount (*Accumulate* `$500/mo DCA`).
- **Secondary = the raw plotted meaning** (`180.3× start · representative`, `Good sequence · representative simulation`) — kept, never the only value.
- **Honesty:** never fake exact units/sats; charts whose index→$ isn't honest per point (e.g. *Volatility Is the Toll*) keep the raw value and carry the dollar impact in their callout. **Non-personalized / conceptual charts keep raw values** — no forced dollars. Pinned tooltips use the same resolver, so they update live when the reader changes context; no `NaN`/`Infinity`.

### No native browser tooltips — one tooltip system

The chart system has its own layered explanation model: the custom **tooltip** (hover), the **pinned explainer** (click-to-pin), the **MobileInsight** rail (tap-to-inspect / desktop pin), the data-mode **popover** (`.acf-dm-pop`, hover + focus), and the collapsed **Details / sources & methodology**. Native browser `title` tooltips are **banned** inside the chart card: they duplicate that content, cannot be styled, sit in a second unstyled layer, and fire on a delay the reader can't control.

- **Do not use** `title=` for any user-facing hover explanation — not on data-mode icons, chart nodes / marks / targets, SVG elements, disclosure triggers, or controls that already carry visible text or an `aria-label`. Likewise no SVG `<title>` children on interactive nodes (they render as native tooltips).
- **Use instead:** `aria-label` for the accessible name (+ description, when the visible/custom layer already shows it), the custom tooltip/popover for the visual explanation, and Details for durable methodology. Don't pair `aria-label` *and* `aria-describedby` pointing at the same text — that double-announces.
- The data-mode marker is the canonical example: `aria-label={\`${dm.label} exhibit. ${dm.explain}\`}` + the styled `.acf-dm-pop` (revealed on hover **and** keyboard focus). No `title`. Site chrome outside the chart card (e.g. the Nextra navbar's "Change theme" button) is out of this system's scope.

### Reader chrome — selection, sticky controls, framework icons

The reader should never feel the browser default. Selection, navigation, and small controls are all part of the same calm framework system.

- **Theme-aware selection.** Selecting reader text uses the framework accent, not the browser gray/blue. Per-theme CSS vars (`--acf-sel-bg` / `--acf-sel-fg`) are set inline on the `.acf-chart-handoff` root from the palette; `::selection` + `::-moz-selection` consume them. Soft green wash, theme text colour, legibility preserved — visible, not neon.
- **Sticky reader controls = document chrome, not a dashboard toolbar.** The `ControlBar` is `position: sticky; top: 0` so PART / VIEW / THEME / Options / Personalize stay reachable while scrolling. The sticky **wrapper spans the full viewport width** (the surface + hairline reach the edges — no clipped, floating content-width strip); the **inner content is page-aligned** to the same max-width + horizontal padding as the body. It's **quiet**: padding is constant (no layout shift → can't jitter); transparent at rest, with a translucent surface + `backdrop-filter` blur + a 1px hairline that **fade in only after scroll** (rAF-throttled `scrolled` state, reduced-motion aware) and clear again at the top so the hero reads clean. No heavy shadow, no big background block; `z-index` 40, above charts but never covering the below-chart explainer rail.
- **Assumptions reachable while scrolling.** Reader simulation context lives in a **Personalize** dropdown *in* the sticky header (brush-chevron trigger; closes on outside-click + Escape — the affordance native `<details>` lacks; a full-width sheet on mobile so it can't overflow). It and the hero Simulation Context bar are **the same `readerCtx` (one source of truth, same sessionStorage)** — change one, both update live, every disclosing chart re-scales. The hero bar stays as the first-view intro. Caveat copy unchanged: *used only to scale illustrative examples — not forecasts*.
- **Framework-native icons.** Small controls use the brush-stroke icon pack (`icons.jsx`: `BrushX`, `BrushChevron`, `BrushCheck`) — the same `Brush.brushSegment` ink as the in-chart `scoreCheck`/`scoreFail` glyphs, `currentColor`, no icon library or Unicode glyphs. The pinned-tooltip **close** is a **borderless** brush ✕ (`.acf-icon-btn`, quiet opacity hover, `.acf-fx-focusable` ring, `aria-label="Unpin"`, no `title`); disclosure carets (Details, Options, Advanced assumptions) and the mobile/desktop-rail steppers are brush chevrons. Editorial prose arrows (`READ →`, `CLAIM → PICTURE → EXPLORE`) stay as text — icons are for controls, not copy.

### Theme persistence & page continuity — atmosphere, not flash

The reader's **Light/Dark choice is part of the rendered experience, not a client afterthought** — it must apply before first paint, and never flash the default theme on navigation or refresh.

- **Pre-paint bootstrap.** `pages/_document.jsx` runs a tiny guarded script in `<head>` that reads the same key as the component (`acf-chart-handoff:theme`) and sets the document's `color-scheme` + background **before React hydrates** — scoped to the full-bleed `*-export` routes (it never touches the public Nextra docs pages or the embedded handoff cards, which keep their own theming). `applyThemeRoot` keeps the document in sync on hydrate + toggle (one source of truth).
- **Reveal gate.** The handoff root renders at `opacity: 0` and fades in (260ms) once the persisted theme has applied (a `requestAnimationFrame` after the hydrate effects), so the default-theme content frame is **never seen** — and it doubles as a calm page-enter. Reduced motion = no fade (still no flash).
- **Fluid toggle.** A user Light/Dark toggle adds `.acf-theme-transitioning` to `<html>` for ~360ms — a **colour crossfade only** (`background-color · color · border-color · fill · stroke · box-shadow`, `cubic-bezier(.2,.8,.2,1)`), scoped to the `.acf-chart-handoff` subtree, never on the initial paint, never transforms/layout, and off under reduced motion. The sticky header, cards, charts, and pinned tooltips cross-fade together.
- **Motion restraint.** Transitions clarify continuity (theme = atmosphere changing; navigation = turning a page in the same essay) — never spectacle, no overlay wipes, no per-path show.

### Bespoke interaction polish

Interactive **focus** states may use subtle brushwork — variable-width borders, organic highlight strokes — but **only to clarify what is selected**. Brushwork is not background decoration; it marks focus, then gets out of the way.

- **Pinned cards get the premium frame — controlled outer geometry, organic inner ink.** Pinning is a higher-commitment interaction than hover, so the pinned tooltip gets a brush frame (`BrushFrame` in `icons.jsx`). **The outer silhouette stays perfect:** the card is `overflow: hidden` with its real `border-radius`, so the four `Brush.brushSegment` edges hug the card edge and any outward waver is **clipped to the rounded rectangle** — clean architecture outside, brushwork inside. No stroke floats outside the card; no whitespace between the ink and the edge. The frame uses the **exact chart accent green** (`getAccent` — same token as active lines / selected gates) over a soft 1px accent border. It's measured off the padding box (`clientWidth/clientHeight`, no layout shift, `pointer-events:none`), and **inks in** on pin via `.acf-brush-frame` (a quiet opacity reveal — no bounce, no glow, reduced-motion safe). **Hover stays clean**; the frame is reserved for the pinned state and not applied to other cards / popovers / Details. The brush ✕ close stays borderless and clear of the frame.
- **Precision outside, texture inside.** Geometry, spacing, containers and outer silhouettes stay precise; brushwork lives *inside* selected states — paths, gates, the pinned frame. On **pin** the frame is slightly **darker / more confident** (accent at higher alpha + a crisper 1px accent border) but never neon; **hover stays lighter** (no frame).
- **Pinned tooltip = a curated annotation, with hierarchy.** Pin uses a clearer reading order — *META · PINNED* (tiny accent label) → **title** (the strongest element) → key value/claim (accent, only when meaningful) → explanation (comfortable line-height) → principle + **READ**. Pinned cards are a touch wider (`min(320px, 84vw)`) so the measure stays tight (~45–55 chars); hover stays compact. `READ` is framework-native (label + `BrushChevron`, faint accent underline that brightens on hover/focus — `.acf-read-link`), never a button or native `title`.
- **Selected-state continuity — the card is anchored, not floating.** On pin, a quiet accent hairline (same green as the frame / active mark / selected gate) connects the selected element to the card's nearest edge, drawn imperatively beside the card transform and **hidden when the card sits over the anchor** so it never crosses content. Hover gets no connector. The selected mark, the selected gate/path, and the pinned frame are one **selected-state system** in one green token.
- **Selected gate uses a brush line, not a uniform rule** — the active gate in *Narrative Is Not Thesis* is drawn with `brushSegment` (slight variable-width waver) instead of a perfect `<line>`, matching the static gate ink.
- **Brushwork restraint.** Brushwork clarifies *focus* — pinned frame, selected mark/gate/path, the READ chevron — never background decoration. Not on every card, Details block, hover card, or chart container; the charts stay minimalist.
- **Guardrails:** brush emphasis + the connector animate with CSS transitions only, respect `prefers-reduced-motion` (final state shown immediately), never loop, and never reintroduce a native `title`. Close ✕ stays the borderless brush glyph.

### Narrative-thread diagrams (filtering / survival / validation)

When a chart is about **filtering, survival, or validation**, interaction should reveal the *path of the selected thread*: where it survives, where it weakens, where it ends. In *Narrative Is Not Thesis* (`gate` layout) focusing a gate makes the narratives that **die at that gate jump out** (clay, thicker), survivors **recede but stay visible**, and the gate inks brighter; focusing the **thesis** lifts the **survivor** band. The thread→gate mapping is the `endCol` each thread already carries in `geom` — no new spec data, no per-hairline hit targets (gate focus drives it), works with hover / pin / mobile tap, reduced-motion safe.

### Reader comfort (the charts must be easy to read)

These charts are read by non-experts, including older readers. Legibility and calm beat density.

- **Persistent reader preferences.** Reader/Agency and Dark/Light are *preferences* (not simulation data) and persist in `localStorage` (`acf-chart-handoff:viewMode` / `:theme`) across all handoff/export routes **and refresh**. Simulation Context stays in `sessionStorage`. Hydrate after mount (SSR-safe); defaults apply when nothing is saved.
- **Header-first honesty — one marker, mode-coloured.** Exactly **one** data-mode marker per chart: a first-principles icon to the **left of the title** (`getDataModeMarker` → `glyph · label · explain`), tinted by mode (conceptual cyan-gray · representative bronze · simulation violet · historical steel · mixed blend — quiet, dark/light-aware; meaning is still carried by label + aria, never colour alone). Its explanation shows on **hover and keyboard focus** (`.acf-dm` popover) and durably in collapsed Details. **Supporting lines use words, not repeated icons** — the simulation/representative intro and the personalized note are text-only, so honesty is visible once, not as clutter.
- **Progressive learning layers.** First view teaches the **visual story** (plus the always-visible main explainer). **Hover** = a quick, concise interpretation (name · value · why). **Click / pin** = a richer read (the raw context + the principle + a READ link). **Details** = durable sources / methodology. Each layer adds something; the pin must not merely duplicate Details, and the main explainer is never collapsed into them.
- **One-time interaction education.** Do **not** repeat "hover / tab / click" inside every chart. The repeated in-body hint is removed; interaction is taught once by the page-level "How to read these charts" orientation and by the affordances themselves.
- **Older-reader legibility.** Avoid tiny repeated helper text. Title dominates (`clamp(17–22px)`), subtitle is readable (`13.5px`, `text2`), metadata is calm, spacing does the work — no boxes, no louder UI.
- **Reveal direction follows intuition.** For before/after reveal charts, **dragging right reveals the "after" / hidden layer** (the curtain sweeps right; hidden cost fills in behind it; mobile snaps left→Surface, center→Split, right→Hidden cost). Spatial wipe, never an opacity toggle.
- **Relational backgrounds, linked panels.** A background/secondary layer must be visibly *related* to the foreground, never decorative. In the dual-panel reveal the top liability and bottom carrying-cost share one curtain + a connector, so they read as one before/after exhibit.

### Reader hero — welcome, orient, get out of the way

The handoff pages are now a **shareable guided visual essay**, not an internal control panel. The hero should invite the reader into the first chart, not teach the whole system.

- **Audience split.** *Reader* mode optimizes for guided comprehension; *Agency* mode for implementation handoff. The internal framing (inventory link, implementation-package link, glyph legend, "internal review surface" note) is **Agency-only**; Reader gets a public title (`preset.readerTitle` — e.g. *Part 1 · Foundation in Pictures*) and a calm subtitle.
- **Two-column hero (`.acf-hero`).** The title block and the **"How to read this"** callout sit on the left; the optional simulation controls live in their **own subtle bordered container on the right** (faint tint + 1px border, `SimulationContextBar layout="panel"` stacked) — separated from the reading material instead of stretched across it. One column on narrow screens (the panel drops below the title). Agency keeps the full-width bar + inventory.
- **"How to read this" gets quiet emphasis.** A left accent rule + accent label + one-line instruction (*one claim · hover/tap/pin*) and a `CLAIM → PICTURE → EXPLORE` footer — a calm callout, not a four-column training block.
- **Progressive controls.** The control bar keeps VIEW / PART / THEME visible; **Docs-shell / Export + Copy link move behind `Options`** in Reader mode (inline in Agency). Persistence (Reader/Agency, Dark/Light, Simulation Context) is unchanged.
- **Simulation Context is optional + one source of truth.** Reader shows it as **"Personalize examples · optional"** with **Starting value + Horizon** primary; **Withdrawal rate, Bitcoin reserve, monthly DCA** collapse behind **Advanced assumptions ▾** (all still wired + persisted on the same `readerCtx`). The caveat is short; full disclosure stays in each chart's Details.
- **Mobile.** Title → one-line orientation → the Personalize panel (compact Starting value + Horizon, advanced collapsed) → charts. No wide control rows, no horizontal overflow.

### Beginner governance diagrams

For an **introductory** chart, do not show the entire control system. Show the **smallest loop that teaches the mental model**: `thesis → exposure → risk → tripwire → adjustment → updated thesis`. Advanced mechanics (the full watch / hedge / trim / redeploy menu, the tripwire taxonomy, multi-branch decision trees) belong in **details** or later product docs, not in the entry exhibit.

- The `governanceLoop` primitive is the calm, beginner form of this: a left-to-right guarded path with **one governing checkpoint** (the tripwire — a quiet gate, never a red alarm) and a **subtle return arc** carrying evidence back to the thesis. It must read at a glance **without interaction**; hover / pin / tap only add the "why."
- An entry document teaches purpose before machinery — teach the smallest useful loop first.

### Feedback diagrams (don't decorate causal feedback)

When the concept is **causal feedback** — an input changes behaviour, behaviour changes fundamentals, fundamentals validate or reverse the input — do **not** reach for a decorative orbit. Use the smallest structure that teaches `input → behaviour → fundamentals → validation/reversal → feedback`, and if the point is that the *same mechanism runs two ways*, show **two lanes**, not one spinning ring.

- The `feedbackLoop` primitive does exactly this for **Markets Feed Back** (reflexivity): two left-to-right lanes — **reinforcing** (accent, arrows thicken, loops back stronger) and **reversing** (stress, arrows thin/break, loops back weaker) — sharing one labelled mechanism (price → capital → fundamentals → validation), each with a return arc and a quiet "REFLEXIVITY" between them. It reads in ~3s without interaction; hover/pin adds the why per stage.
- **Orbital loops (`systemLoop`) are now reserved** for concepts where *circularity itself* is the whole story. `feedbackLoop` and `governanceLoop` are additive primitives — switching a chart to one **does not touch** `SystemLoopSvg`, so any future true-ring chart still has it.

### Scenario charts — don't reward perfect hindsight

A scenario chart must not collapse into *"which line ends highest?"* It has to distinguish **terminal value** from **control, livability, and repeatability across unknown paths** — because you commit to a strategy *before* the path is known.

- **Show what happens to you, not coordinates.** When the concept is *control*, do **not** lead with a portfolio-value-over-time line (the eye scores it by terminal value) — and a score map (control vs participation) is correct but too abstract / consulting-quadrant to carry emotional force. *Exposure Is Not Control* is a **three-lane stress tunnel**: same shock, three postures enter, one stays usable. Each strategy is a lane through a shock zone; the lane SHAPE is its survival — max exposure climbs steepest then **breaks** (a forced sale drawn as a discontinuity); the framework **bends, stays whole, keeps a capacity marker**; stress-tested barely flinches but climbs slowly (cash drag). The question becomes *"what happens to each posture when reality hits?"*, not *"which line ends highest?"*
- **No perfect bottom-timing.** An "opportunity" shock must not assume the investor deploys all cash at the exact low. The shock is an **Opportunity window** — deploy only **part** of the reserve, **above** the bottom: the value modelled is *"had capacity to act,"* not *"timed it."*
- **A framework path needn't win every metric — it must clearly show the one it optimizes.** The framework does **not** post the highest terminal (max does, on a clean path). It wins on **livability / repeatability**: read-outs lead with control, participation, decision strain, forced-error risk and a deterministic, **illustrative** livability score; terminal value + drawdown are subordinate outcomes. Repeatability is shown **on the map** — each strategy's faint dots are the other shocks, so the tightest cluster (the framework) is the visible winner, not the highest number.

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
| `dl-tripwire-loop` | Govern the Thesis | governanceLoop | conceptual |

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
| `p2-markets-feed-back` | Markets Feed Back | feedbackLoop | conceptual |
| `p2-time-changes-prudence` | Time Changes Prudence | single | simulation |
| `p2-capital-finds-bottleneck` | Capital Finds the Bottleneck | bridge | conceptual |
| `p2-narrative-not-thesis` | Narrative Is Not Thesis | gate | conceptual |
| `p2-phase-changes-sizing` | Phase Changes Sizing | single | conceptual |
| `p2-liquidity-sets-tide` | Liquidity Sets the Tide | single | representative |

### Part 3 · Bitcoin convexity backbone
| chartId | Title | Layout | Mode |
|---|---|---|---|
| `p3-power-law-holds` | Power Law Holds | single (log) | representative |
| `p3-volatility-is-the-toll` | Volatility Is the Toll | single | representative |
| `p3-exposure-not-control` | Exposure Is Not Control | **scenario (interactive)** | simulation |
| `p3-models-must-converge` | Models Must Converge | single | representative |
| `p3-accumulate-dont-trade` | Accumulate, Don’t Trade | heartbeat (price + DCA pulses) | conceptual |
| `p3-cold-storage-to-borrow` | Cold Storage to Borrow | flow | conceptual · **deferred** |
| `p3-reserve-share-evolves` | Reserve Share Evolves | single | simulation · **deferred** |

Part 3 ships **6 active** exhibits; the two deferred specs are kept in the registry (`status: deferred`) but hidden from the handoff page pending redesign.

### Part 4 · tax architecture & return-of-capital strategy

Three intentionally-different forms, one per relationship — the set proves the grammar:

| chartId | Title | Layout | Relationship | Mode |
|---|---|---|---|---|
| `p4-tax-wedge` | The Tax Wedge | single | trend (scaling divergence) | representative |
| `p4-gross-not-net` | Gross Is Not Net | **radial** (donut) | **composition** / ownership | conceptual |
| `p4-roc-yield` | ROC Changes the Yield | **laneBar** | **comparison** (capital back to work) | conceptual |

All three are wired into the live `/part-4-tax-architecture-roc-strategy` page. They read as one system (type, palette, spacing, interaction, disclosures, motion) while their *forms* differ because their *claims* differ: a scaling wedge, an ownership split, a retained-capital comparison.

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
- **Composition & comparison** (the relationship-driven forms — see the Chart Grammar matrix):
  - `radial` — a **composition** donut: the angular split IS the claim (you do not own the whole). Built on thick stroked arcs (clean clockwise draw-in, angular hit-testing) — not a chart-library pie: direct labels + short leaders, never a detached legend. `variant: 'donut'` (single ring). An optional quiet **scale control** (`radial.scales`, e.g. today / +12 / +25) grows the *magnitude* while the arcs — the *share* — never move, so an embedded claim is seen compounding in step. Center label + value in the hole. `concentric` variant reserved (hierarchy / nested growth). Coarse pointers get bigger labels + an HTML caption + the tap-to-inspect rail (not a shrunk desktop SVG). e.g. *Gross Is Not Net*.
  - `laneBar` — the **multi-lane comparison** seed: N parallel 100% bars over ONE shared scale, aligned at a common origin so the marked `compare` segment is directly comparable lane-to-lane. A lane may carry a hatched **deferred** underline (a claim that exists but is not taken now — never implies money vanished). A dashed reference line drops at the shortest compare-end; the surplus on the longer lane is the visual claim. Direct in-bar labels, no detached legend. e.g. *ROC Changes the Yield*.
- **Framework diagrams** (bespoke, brush-influenced, not flowcharts):
  - `systemLoop` — reflexive self-reinforcing **ring** with a reversal cue. **Reserved** for concepts where circularity itself is the story; no spec currently uses it (kept available for a future true-ring chart).
  - `feedbackLoop` — causal feedback as **two lanes**: reinforcing (accent, arrows thicken) and reversing (stress, arrows thin), sharing one labelled mechanism (price → capital → fundamentals → validation), each looping back, with a quiet "REFLEXIVITY" between them (e.g. *Markets Feed Back*). Teaches "same mechanism, two directions" at a glance — not a decorative orbit.
  - `governanceLoop` — beginner governed path: a calm left-to-right `thesis → exposure → risk → tripwire → adjust` with one quiet checkpoint (the tripwire gate) and a subtle return arc (*evidence updates the thesis*). Reads at a glance without interaction (e.g. *Govern the Thesis*). Deliberately **not** an orbit.
  - `bridge` — descending cascade where each stage transforms the prior until the thesis becomes investable (e.g. *Capital Finds the Bottleneck*).
  - `gate` — a sober validation gauntlet; a survivor band thins through four gates into a thesis (e.g. *Narrative Is Not Thesis*).
  - `scorecard` — a requirement × asset matrix with bespoke brush meet/partial/fail glyphs and an emphasised focus column. Renderer available; its reference chart (*One Asset, Ten Tests*) was retired to a native Part 3 comparison table.
  - `scenario` — an interactive **three-lane stress tunnel** (NOT a return path or a score map): *same shock, three postures enter, one stays usable.* Three horizontal lanes (max exposure / framework / stress-tested) pass through a central shock zone; the lane **shape** is its survival, derived from the stats — slope before = participation, dip = drawdown, a **break** (discontinuity + forced-sale mark) when forced, a **capacity marker** when it still has reserve to act after. Max climbs steepest then breaks; the framework bends + stays whole + keeps capacity; stress-tested barely flinches but climbs slowly (cash drag). Below the lanes a compact **survival readout** grades each posture under the current shock (participates · has reserve · forced-error risk · followable); terminal value is a small subordinate outcome. Strategy/shock selectors drive it; the lanes **draw in left→right** through the tunnel on entrance (the postures *enter*; reduced-motion reveals immediately), updates are instant in place; hover previews and **click pins** a lane (the design-system pinned card — brush frame, accent connector to the lane, Escape/✕ to close), with a selected-lane emphasis band in the same green (e.g. *Exposure Is Not Control*). The picture shows *what happens to each posture when reality hits.*
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
