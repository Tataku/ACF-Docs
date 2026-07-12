/* ───────────────────────────────────────────────────────────────────────────
 * Formatter facade — the shared, framework-agnostic number/currency/percent
 * formatters (chart-engine unification, Phase C seed — see chart-core/README.md).
 *
 * PURE (no React, no palette, no DOM, no charting library). The canonical home for
 * the value formatters both engines print on axes, labels, and readouts, so there
 * is ONE definition instead of a divergent copy per engine (the docs engine's old
 * inline `fmtMoney` was byte-identical to `formatStartingValue` — now both resolve
 * here). ACFDashboard has its own canonical `shared/formatters.ts` PLUS a divergent
 * Data-page copy; consolidating those onto this facade is the owner-gated cross-repo
 * follow-up. No cents, no false precision — illustrative scaling, never exact.
 * ─────────────────────────────────────────────────────────────────────────── */

/** Coarse money — round to the nearest $100 (or $1,000 above $100k), no cents. */
export function formatMoney(n) {
  if (!isFinite(n) || n <= 0) return '$0';
  const r = n >= 100000 ? Math.round(n / 1000) * 1000 : Math.round(n / 100) * 100;
  return '$' + r.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

/** Compact money — $1.2M / $12k / $340 (one significant tail digit at millions). */
export function formatCompactMoney(n) {
  if (!isFinite(n) || n <= 0) return '$0';
  const abs = Math.abs(n);
  if (abs >= 1e6) return '$' + (Math.round(n / 1e5) / 10).toLocaleString('en-US') + 'M';
  if (abs >= 1e4) return '$' + Math.round(n / 1e3) + 'k';
  return '$' + Math.round(n).toLocaleString('en-US');
}

/** Percent from a fraction (0.05 → "5%"); trims trailing zeros. */
export function formatPercent(x, digits = 0) {
  if (!isFinite(x)) return '0%';
  return `${(x * 100).toFixed(digits).replace(/\.0+$/, '')}%`;
}

export default { formatMoney, formatCompactMoney, formatPercent };
