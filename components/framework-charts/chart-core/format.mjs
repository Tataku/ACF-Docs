/* ───────────────────────────────────────────────────────────────────────────
 * Value formatters — HONEST semantic boundary.
 *
 * PURE, framework-agnostic. These are the DOCS ENGINE's ILLUSTRATIVE formatting
 * policy: exhibits scale representative numbers, they never report exact finance.
 * That policy is deliberately lossy and MUST NOT be adopted blindly for real
 * financial values:
 *   · non-positive money collapses to "$0"  → would erase losses / withdrawals /
 *     negative P&L / liabilities / refunds
 *   · values are coarsely rounded            → would drop cents and small amounts
 *   · precision is intentionally suppressed
 *
 * So the functions are named for what they ARE (illustrative), not for a false
 * universal. ACFDashboard KEEPS its own canonical financial formatters
 * (`shared/formatters.ts`) for precise / signed / currency values — this module
 * does not replace them. The eventual shared surface is a set of named PROFILES
 * (below), only two of which are implemented here; the rest stay consumer-owned.
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * The semantic formatting profiles a unified chart layer needs. This is a
 * CONTRACT / documentation surface, not a promise that all are implemented here.
 * Implemented in THIS module: `illustrative`, `illustrativeCompact`,
 * `percentFromFraction`. Everything else is owned by the consuming app's
 * financial formatters (e.g. ACFDashboard) and must not be faked with the
 * illustrative policy.
 */
export const FORMAT_PROFILES = Object.freeze({
  illustrative: 'illustrative',                 // coarse, rounded, non-positive→$0, cents suppressed (DOCS teaching policy — implemented here)
  illustrativeCompact: 'illustrativeCompact',   // compact illustrative ($1.2M/$12k), non-positive→$0 (implemented here)
  preciseCurrency: 'preciseCurrency',           // exact currency incl. cents (consumer-owned)
  signedPnl: 'signedPnl',                        // signed P&L incl. losses / negatives (consumer-owned)
  compactPortfolio: 'compactPortfolio',          // compact portfolio value preserving sign (consumer-owned)
  percentFromFraction: 'percentFromFraction',    // 0.05 → "5%" (implemented here: formatFractionPercent)
  percentFromPoints: 'percentFromPoints',        // 5 → "5%" (percentage-points input; consumer-owned, not implemented here)
});

/** ILLUSTRATIVE money — round to nearest $100 (or $1,000 above $100k); non-positive → "$0".
 *  Lossy on purpose (no cents, no negatives). Do NOT use for real financial values. */
export function formatIllustrativeMoney(n) {
  if (!isFinite(n) || n <= 0) return '$0';
  const r = n >= 100000 ? Math.round(n / 1000) * 1000 : Math.round(n / 100) * 100;
  return '$' + r.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

/** ILLUSTRATIVE compact money — $1.2M / $12k / $340; non-positive → "$0". Lossy on purpose. */
export function formatIllustrativeCompactMoney(n) {
  if (!isFinite(n) || n <= 0) return '$0';
  const abs = Math.abs(n);
  if (abs >= 1e6) return '$' + (Math.round(n / 1e5) / 10).toLocaleString('en-US') + 'M';
  if (abs >= 1e4) return '$' + Math.round(n / 1e3) + 'k';
  return '$' + Math.round(n).toLocaleString('en-US');
}

/** Percent from a FRACTION (0.05 → "5%"); trims trailing zeros. Sign-preserving. */
export function formatFractionPercent(x, digits = 0) {
  if (!isFinite(x)) return '0%';
  return `${(x * 100).toFixed(digits).replace(/\.0+$/, '')}%`;
}

// ── Docs compatibility aliases ───────────────────────────────────────────────
// Kept so existing docs-engine imports keep working; the names above are canonical.
export const formatMoney = formatIllustrativeMoney;
export const formatCompactMoney = formatIllustrativeCompactMoney;
export const formatPercent = formatFractionPercent;

export default {
  FORMAT_PROFILES,
  formatIllustrativeMoney, formatIllustrativeCompactMoney, formatFractionPercent,
  formatMoney, formatCompactMoney, formatPercent,
};
