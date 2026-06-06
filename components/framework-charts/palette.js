/* ───────────────────────────────────────────────────────────────────────────
 * ACF Framework Charts — locked palette + type tokens
 *
 * Taken verbatim from the "ACF Part 1 Spec Lock" handoff. The exhibits are a
 * self-contained DARK TERMINAL FOUNDATION regardless of the surrounding docs
 * theme — quiet, not empty; a restrained cyan/green thesis line over muted
 * secondary strokes. The warm-paper palette is preserved for parity but the
 * locked Part 1 direction is dark.
 * ─────────────────────────────────────────────────────────────────────────── */

export const FONTS = {
  mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
  sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

export const ACCENTS = {
  green: { dark: '#10B981', light: '#0E8C66' }, // framework green · thesis line
  gold: { dark: '#E4A577', light: '#B7733B' },
  signal: { dark: '#6B9AD4', light: '#3F6A99' },
};

const DARK = {
  name: 'dark',
  mono: FONTS.mono, sans: FONTS.sans,
  stage: '#08090b', card: '#0C1219', cardSolid: '#0C1219', surface: '#0E141C',
  cardBorder: '#1F2835', borderHi: '#2E3848', scrim: '#0C1219',
  grid: 'rgba(150,170,200,0.09)', axis: '#86909F',
  tierSecondary: '#9DA9B8', tierTertiary: '#76808F', tierReference: '#76808F',
  bandStress: '#C0837A', bandStressText: '#D29C92',
  bandRegime: '#52607A', bandRegimeText: '#9DB0C6',
  invalidCharcoal: '#8C97A4', markInk: '#B6BFCB',
  text1: '#EEF1F6', text2: '#C8D0DC', text3: '#9DA8B6', text4: '#7E8896',
};

const LIGHT = {
  name: 'light',
  mono: FONTS.mono, sans: FONTS.sans,
  stage: '#E6DFD2', card: '#F3EFE6', cardSolid: '#F6F2EA', surface: '#ECE7DC',
  cardBorder: '#D7D0C1', borderHi: '#C2B9A7', scrim: '#F3EFE6',
  grid: 'rgba(60,55,45,0.12)', axis: '#766F60',
  tierSecondary: '#5F6B7C', tierTertiary: '#8E8676', tierReference: '#8E8676',
  bandStress: '#9A574E', bandStressText: '#834A41',
  bandRegime: '#6E7A8B', bandRegimeText: '#4E5666',
  invalidCharcoal: '#5E584C', markInk: '#33312A',
  text1: '#26241D', text2: '#46433A', text3: '#5C5749', text4: '#6E695C',
};

export const PALETTES = { dark: DARK, light: LIGHT };

export function getPalette(theme = 'dark') {
  return PALETTES[theme] || DARK;
}

export function getAccent(pal, accent = 'green') {
  const a = ACCENTS[accent];
  return a ? a[pal.name] || a.dark : pal.tierSecondary;
}
