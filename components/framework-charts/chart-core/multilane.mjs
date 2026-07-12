/* ───────────────────────────────────────────────────────────────────────────
 * Multi-lane comparison — the portable, framework-agnostic model + CONTRACT.
 *
 * The FIRST shared-foundation model of the chart-engine unification (see
 * chart-core/README.md + /CHART_ENGINE_UNIFICATION_PROPOSAL_v1.md). PURE: no
 * React, no palette, no DOM, no charting library. It owns the multi-lane SPEC
 * contract, its (hardened) validation, and the reference layout math — so the docs
 * exhibit engine (bespoke SVG) and the ACFDashboard analytics engine (Recharts /
 * bespoke SVG) can render the SAME spec in their own tech instead of each
 * reinventing "lanes." This is cross-repo API, so the contract is enforced strictly.
 *
 * A multi-lane chart = N parallel lanes over ONE shared scale, aligned at a common
 * origin, so the length of the COMPARE segment is directly comparable lane-to-lane.
 *
 * IDENTITY vs SEMANTICS (kept separate on purpose):
 *   · segment `id`  — a unique INTERACTIVE INSTANCE id, unique WITHIN its lane
 *                     (hit-testing / focus / the consumer's element key).
 *   · segment `key` — an optional SHARED SEMANTIC key. The SAME key may (and for a
 *                     comparison, must) appear once per lane — it is what "the same
 *                     thing, compared across lanes" means. Never forced globally unique.
 *   · spec `compareKey` — the semantic key that drives the cross-lane comparison
 *                     (replaces the old boolean `compare` flag / vestigial `compareSegId`).
 *
 * A lane may carry a `deferred` claim — a magnitude that exists but is NOT taken now
 * and is an OVERLAY, never part of the lane's segment sum — so the picture never
 * implies a quantity vanished, and never double-counts it.
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * @typedef {Object} MultiLaneSegment
 * @property {string} id             unique interactive instance id (unique within the lane)
 * @property {number} value          share of `total` this segment occupies (finite, >= 0)
 * @property {string} label
 * @property {string} [key]          shared semantic key (may repeat across lanes; the compare key lives here)
 * @property {string} [tier]         semantic tier (primary·secondary·tertiary·reference·stress) — the renderer maps it to a colour
 * @property {string} [valueLabel]   override the printed value (else Math.round(value))
 *
 * @typedef {Object} MultiLaneDeferred
 * @property {number} value          magnitude that exists but is not taken now (finite, >= 0, <= total). OVERLAY — not summed.
 * @property {string} label
 * @property {string} [id]
 *
 * @typedef {Object} MultiLaneBar
 * @property {string} id             unique lane id
 * @property {string} label
 * @property {string} [sublabel]
 * @property {MultiLaneSegment[]} segments   sum to `total` within tolerance
 * @property {MultiLaneDeferred} [deferred]
 *
 * @typedef {Object} MultiLaneSpec
 * @property {number} total          the shared scale each lane divides (finite, > 0)
 * @property {string} [unit]
 * @property {string} [totalLabel]
 * @property {string} [surplusLabel]
 * @property {string} [compareKey]   the shared semantic key that drives comparison; each lane must then carry exactly one segment with this key
 * @property {number} [tolerance]    absolute tolerance (in `total` units) for the per-lane segment sum; default max(1e-6, total*0.005)
 * @property {MultiLaneBar[]} bars    >= 2 lanes
 */

const isFiniteNum = (v) => typeof v === 'number' && Number.isFinite(v);

/** Pull the multi-lane block off a chart spec, however it is nested. */
export function getMultiLane(spec) {
  return spec && (spec.laneBar || spec.multiLane || (Array.isArray(spec.bars) ? spec : null));
}

/** Resolve the per-lane segment-sum tolerance (absolute, in `total` units). */
export function multiLaneTolerance(sb) {
  return isFiniteNum(sb.tolerance) ? sb.tolerance : Math.max(1e-6, sb.total * 0.005);
}

/**
 * Validate a multi-lane spec against the hardened cross-repo contract. Returns
 * true, or calls `fail(message)` (default: throw). Both engines' validators call
 * this so the contract is enforced once.
 */
export function validateMultiLaneSpec(spec, fail = (m) => { throw new Error(m); }) {
  const sb = getMultiLane(spec);
  if (!sb) return fail('multi-lane spec missing (expected laneBar / multiLane / bars)');

  // total — finite and strictly positive
  if (!(isFiniteNum(sb.total) && sb.total > 0)) return fail('multi-lane total must be a finite positive number');

  // lanes — at least two, each with a unique non-empty id and a label
  if (!Array.isArray(sb.bars) || sb.bars.length < 2) return fail('multi-lane needs >= 2 lanes');
  const laneIds = sb.bars.map((b) => b && b.id);
  if (laneIds.some((id) => !id || typeof id !== 'string')) return fail('every lane needs a non-empty string id');
  if (new Set(laneIds).size !== laneIds.length) return fail('lane ids must be unique');

  const tol = multiLaneTolerance(sb);
  const compareKey = sb.compareKey != null ? sb.compareKey : null;
  if (compareKey != null && typeof compareKey !== 'string') return fail('compareKey must be a string when present');
  let compareEndpoints = 0;

  for (const bar of sb.bars) {
    if (!bar.label || typeof bar.label !== 'string') return fail(`lane ${bar.id} needs a label`);
    if (!Array.isArray(bar.segments) || bar.segments.length < 1) return fail(`lane ${bar.id} needs >= 1 segment`);

    const segIds = [];
    let sum = 0;
    let compareCount = 0;
    for (const s of bar.segments) {
      if (!s || !s.id || typeof s.id !== 'string') return fail(`lane ${bar.id} has a segment with no string id`);
      if (!(isFiniteNum(s.value) && s.value >= 0)) return fail(`lane ${bar.id} segment ${s.id} value must be finite and >= 0`);
      segIds.push(s.id);
      sum += s.value;
      if (compareKey != null && s.key === compareKey) compareCount++;
    }
    // instance ids unique WITHIN the lane (semantic keys may repeat across lanes — not checked here)
    if (new Set(segIds).size !== segIds.length) return fail(`lane ${bar.id} has duplicate segment ids (instance ids must be unique within a lane)`);
    // segment sum equals total within tolerance
    if (Math.abs(sum - sb.total) > tol) return fail(`lane ${bar.id} segments sum to ${sum}, expected ${sb.total} (±${tol})`);
    // when comparison is enabled: exactly one compare segment per lane (consistent key across lanes)
    if (compareKey != null) {
      if (compareCount !== 1) return fail(`lane ${bar.id} must have exactly one segment with key "${compareKey}" (found ${compareCount})`);
      compareEndpoints++;
    }
    // deferred is an OVERLAY: finite, non-negative, bounded by total, and NOT part of the sum
    if (bar.deferred != null) {
      const d = bar.deferred;
      if (!(isFiniteNum(d.value) && d.value >= 0)) return fail(`lane ${bar.id} deferred value must be finite and >= 0`);
      if (d.value > sb.total + tol) return fail(`lane ${bar.id} deferred value ${d.value} exceeds total ${sb.total} (deferred is a bounded overlay)`);
    }
  }

  // a comparison needs at least two endpoints to compare
  if (compareKey != null && compareEndpoints < 2) return fail(`compareKey "${compareKey}" needs >= 2 lanes carrying a matching segment`);
  return true;
}

/**
 * @typedef {Object} MultiLaneGeom
 * @property {number} barX0   left origin (shared across lanes)
 * @property {number} barX1   right edge (total maps here); must be > barX0
 * @property {number} padTop
 * @property {number} titleH
 * @property {number} barH    must be > 0
 * @property {number} subH
 * @property {number} laneGap
 */

/**
 * Reference layout — pure geometry for a multi-lane spec. Returns lane + segment
 * rectangles, the cross-lane compare stats, and a `surplus` block whose `deltaValue`
 * is computed from the DATA values (not reconstructed from rounded pixels). Also
 * flags `anyOverflow` if any segment rectangle exceeds the lane bounds. Throws on
 * invalid geometry (non-positive width or bar height).
 *
 * @param {MultiLaneSpec} sb
 * @param {MultiLaneGeom} geom
 */
export function layoutMultiLane(sb, geom) {
  const { barX0, barX1, padTop, titleH, barH, subH, laneGap } = geom;
  if (!(isFiniteNum(barX0) && isFiniteNum(barX1) && barX1 > barX0)) throw new Error('layoutMultiLane: need finite barX0 < barX1 (positive width)');
  if (!(isFiniteNum(barH) && barH > 0)) throw new Error('layoutMultiLane: barH must be a positive number');

  const total = sb.total;
  const barW = barX1 - barX0;
  const laneH = titleH + barH + subH + laneGap;
  const xOf = (v) => barX0 + (v / total) * barW;
  const compareKey = sb.compareKey != null ? sb.compareKey : null;
  const EPS = 1e-6;

  const lanes = sb.bars.map((bar, li) => {
    const yTop = padTop + li * laneH;
    const barY = yTop + titleH;
    let cur = barX0;
    const segs = bar.segments.map((s) => {
      const x0 = cur;
      const w = (s.value / total) * barW;
      cur += w;
      return { ...s, x0, w, cx: x0 + w / 2, cy: barY + barH / 2, exceedsLaneBounds: cur > barX1 + EPS };
    });
    const compareSeg = compareKey != null ? segs.find((s) => s.key === compareKey) : null;
    const compareEnd = compareSeg ? compareSeg.x0 + compareSeg.w : null;
    const compareValue = compareSeg ? compareSeg.value : null;   // DATA value — the basis for surplus
    return { ...bar, li, yTop, barY, segs, compareSeg, compareEnd, compareValue, deferred: bar.deferred || null };
  });

  const withCompare = lanes.filter((l) => l.compareValue != null);
  const compareValues = withCompare.map((l) => l.compareValue);
  const compareEnds = withCompare.map((l) => l.compareEnd);
  const minValue = compareValues.length ? Math.min(...compareValues) : null;
  const maxValue = compareValues.length ? Math.max(...compareValues) : null;
  const minCompare = compareEnds.length ? Math.min(...compareEnds) : null;   // pixels (dashed reference line + label placement)
  const maxCompare = compareEnds.length ? Math.max(...compareEnds) : null;

  // SURPLUS from DATA values first — deltaValue is a value delta, never a rounded-pixel reconstruction.
  const surplus = (compareValues.length >= 2 && minValue != null && maxValue != null && maxValue > minValue)
    ? { deltaValue: maxValue - minValue, minValue, maxValue, minCompare, maxCompare, mid: (minCompare + maxCompare) / 2 }
    : null;

  const anyOverflow = lanes.some((l) => l.segs.some((s) => s.exceedsLaneBounds));

  return { lanes, laneH, barW, xOf, minCompare, maxCompare, surplus, anyOverflow };
}

export default { getMultiLane, multiLaneTolerance, validateMultiLaneSpec, layoutMultiLane };
