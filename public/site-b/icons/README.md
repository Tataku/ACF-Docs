# Site B icons — Zen brush set

Bespoke brush-stroke ("zen") icon set used selectively in the promoted Site B UI.

## Layout
- `optimized/` — sanitized, production-ready copies of the icons actually used.
  Each is `currentColor`, `viewBox="0 0 100 100"`, `aria-hidden`, no IDs/cruft.
- The full raw Figma export (149 SVGs) **no longer lives in the tree.** It was
  removed on 2026-09-16 after a reference audit found it imported by nothing —
  no runtime, no build script, no config, no CI, no test. Git preserves it:

      git show 9507332946db:design/zen-icons-source/<name>.svg

  `design/icon-vocabulary.json` records the mapping and the provenance pointer;
  `design/zen-source-manifest.json` keeps the 149 filenames and their sha256 so
  the removed inventory stays checkable without shipping it.

  It went because **a directory of 149 icons reads as canonical whether or not it
  is.** It had already been mistaken for the authoritative set once. The
  authority is the production implementations — these sanitized assets, and the
  dashboard's own `BrushIcon` geometry — with the Figma export as their
  historical ancestor rather than their master.

## How they're applied
The integrated icons are **inlined** so they inherit the theme via
`currentColor`. **Scope corrected 2026-09-16 — this used to say "the three
full-chrome Part pages", and the rollout had already gone further than its own
documentation:**

| control | pages carrying it | all Zen? |
|---|---|---|
| `.sidebar-toggle` collapse / expand | 9 | yes |
| `.floatnav` chevron-up / framework-docs | 9 | yes |
| `.part-actions` copy / share | 6 | yes |

Every page that HAS the chrome carries the Zen version of it; `cover-docs` and
`part-1-pictures` simply do not have that chrome. There is no page where one of
these controls is Zen and the same control elsewhere is not.

Each replaced exactly one existing inline SVG, preserving the surrounding
button/link, its class, `aria-*`, `data-*` hooks, and JS selectors. The optical
size bump for these icons lives in `reading-system.css`
(`svg[viewBox="0 0 100 100"]` scoped to `.part-actions / .floatnav /
.sidebar-toggle`).

## Brand mark

The brand mark is **not** from this set, but it follows the same `currentColor`
rule, and since 2026-08-24 it is bound to the theme rather than fixed.

It used to be a filled emerald plate with a knocked-out triangle, hardcoded to
`#10b981`. A filled plate tolerates low contrast — the shape reads even when the
colour does not — so a fixed brand colour cost nothing. The mark is now the ACF
mascot in line art, and thin strokes do not have that tolerance: `#10b981` is
~2.6:1 on paper. `tokens.css` already says so at the point of definition —
`--brand-emerald` is commented "dashboard brand reference — NOT used as ink on
paper" — and line art is ink.

So the mark is `currentColor` and inherits `.brand-mark { color: var(--accent) }`:
`#0d7d6b` on paper (4.9:1), `#34d399` on dark. That also makes the
`.brand:hover .brand-mark` rule in `reading-system.css` live; it had been inert
for as long as the fill was hardcoded.

The mark is a **reduction**, not the full mascot: the master art
(`ACFDashboard/public/assets/brand/`) has a three-line neck, a three-branch arc
and three feet, which stop being strokes below roughly 40px. At the 1.6rem this
renders at, only antenna, head and eyes survive. The geometry is identical to
the dashboard's own tab icon, so the two cannot drift.

## Icon → UI role mapping (integrated)
| Icon | Role | Control |
|------|------|---------|
| `collapse-sidebar` | collapse sidebar | `.sidebar-toggle .icon-collapse` |
| `expand-sidebar`   | expand sidebar  | `.sidebar-toggle .icon-expand` |
| `chevron-up`       | back to top     | `.floatnav-top .fn-icon` |
| `framework-docs`   | Framework / home | `.floatnav-home .fn-icon` |
| `copy`             | copy link       | `[data-copy-link] .pa-icon` |
| `share`            | native share    | `[data-share-native] .pa-icon` |

## Intentionally NOT replaced (no clean/clearer match in the set)
- **theme toggle** (no sun/moon icon in the set — meaning must stay obvious)
- **Listen play / pause / stop** (no transport glyphs; geometric stays clearest)
- **share-on-X / email** (brand-X and envelope are more specific than the set's
  generic `share`)
- **mobile hamburger** (no menu glyph in the set)
- **callout icons** (`.ci-icon`, 7 sites) — a lightbulb. The set has `info`, which
  is more generic, not clearer.
- **disclosure chevrons** (`.gl-chevron` ×109 on the glossary, `.faq-chevron` ×5 on
  the cover) — **tried, measured, and reverted on 2026-09-16.** The set *does*
  contain `chevron-down`, so this is the one case where a match exists and the
  answer is still no. Built it, rendered it against the geometric original, and
  the brush mark reads as a faint tick rather than a disclosure affordance: its
  ink spans **32% of its box against the geometric chevron's 58%**, so matching
  the old ink needs a **1.81x** box — well past the 1.15x the rest of the set
  carries — and even at 2.0rem it still read lighter, because the difference is
  tapered-hairline character rather than size. A mark that is one-of-one inside a
  labelled button (back-to-top) is doing a different job from a state indicator
  that must read at a glance down 109 rows. There is also a mechanical reason:
  both controls spend `transform` on `rotate(180deg)` when they open, which
  collides with the `transform: scale(1.15)` the optical bump uses.

## Sanitization applied to every integrated icon
- Removed the `<?xml?>` prolog and all Figma `data-fg*` / `data-fgid*` attributes.
- Removed `width`/`height` (size is controlled by CSS); kept `viewBox`.
- Kept `fill="currentColor"` so icons inherit the Site B token colours.
- Rounded path coordinates to 2 decimals (imperceptible at icon scale).
- Added `aria-hidden="true"` + `focusable="false"` (decorative inside labelled
  controls). No `id`s anywhere → safe to inline repeatedly with no collisions.

## Reversibility
Revert the Part HTML files and the `reading-system.css` zen block, and delete
this folder, to fully restore the prior geometric icons. (The raw Figma export
is no longer a deletion target — see Layout above for how to retrieve it.)
