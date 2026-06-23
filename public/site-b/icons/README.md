# Site B icons — Zen brush set

Bespoke brush-stroke ("zen") icon set used selectively in the promoted Site B UI.

## Layout
- `optimized/` — sanitized, production-ready copies of the icons actually used.
  Each is `currentColor`, `viewBox="0 0 100 100"`, `aria-hidden`, no IDs/cruft.
- Full raw Figma export (149 SVGs) is preserved for provenance in
  `/design/zen-icons-source/` at the repo root — **deliberately outside the web
  root** so the raw exports are not served, and not built into the app.

## How they're applied
The integrated icons are **inlined** into the three full-chrome Part pages
(`part-1-foundation.html`, `part-2-lineage-macro.html`,
`part-3-bitcoin-convexity.html`) so they inherit the theme via `currentColor`.
Each replaced exactly one existing inline SVG, preserving the surrounding
button/link, its class, `aria-*`, `data-*` hooks, and JS selectors. The optical
size bump for these icons lives in `reading-system.css`
(`svg[viewBox="0 0 100 100"]` scoped to `.part-actions / .floatnav /
.sidebar-toggle`).

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
- **brand mark** (the green ACF logo is a fixed-colour identity mark, not a UI
  icon)

## Sanitization applied to every integrated icon
- Removed the `<?xml?>` prolog and all Figma `data-fg*` / `data-fgid*` attributes.
- Removed `width`/`height` (size is controlled by CSS); kept `viewBox`.
- Kept `fill="currentColor"` so icons inherit the Site B token colours.
- Rounded path coordinates to 2 decimals (imperceptible at icon scale).
- Added `aria-hidden="true"` + `focusable="false"` (decorative inside labelled
  controls). No `id`s anywhere → safe to inline repeatedly with no collisions.

## Reversibility
Revert the three Part HTML files and the `reading-system.css` zen block, and
delete this folder + `/design/zen-icons-source/`, to fully restore the prior
geometric icons.
