/* ───────────────────────────────────────────────────────────────────────────
 * Multi-lane comparison — the portable, framework-agnostic model.
 *
 * This is the FIRST shared-foundation module of the chart-engine unification
 * (see chart-core/README.md + /CHART_ENGINE_UNIFICATION_PROPOSAL_v1.md). It is
 * deliberately PURE: no React, no palette, no DOM, no charting library. It owns
 * the multi-lane SPEC contract, its validation, and the reference layout math —
 * so both the docs exhibit engine (bespoke SVG) and the ACFDashboard analytics
 * engine (Recharts / bespoke SVG) can render the SAME spec in their own tech
 * instead of each reinventing "lanes."
 *
 * A multi-lane chart = N parallel lanes over ONE shared scale, aligned at a
 * common origin, so the length of the marked `compare` segment is directly
 * comparable lane-to-lane. A lane may carry a `deferred` claim — one that exists
 * but is not taken *now* — so the picture never implies a quantity vanished.
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * @typedef {Object} MultiLaneSegment
 * @property {string} id
 * @property {string} label
 * @property {number} value            share of `total` this segment occupies
 * @property {string} [tier]           semantic tier (primary·secondary·tertiary·reference·stress) — the renderer maps it to a colour
 * @property {string} [valueLabel]     override the printed value (else Math.round(value))
 * @property {boolean} [compare]       mark the segment aligned + compared across lanes ("capital back to work")
 *
 * @typedef {Object} MultiLaneDeferred
 * @property {string} [id]
 * @property {number} value            magnitude that exists but is not taken now
 * @property {string} label
 *
 * @typedef {Object} MultiLaneBar
 * @property {string} id
 * @property {string} label
 * @property {string} [sublabel]
 * @property {MultiLaneSegment[]} segments
 * @property {MultiLaneDeferred} [deferred]
 *
 * @typedef {Object} MultiLaneSpec
 * @property {number} total            the shared scale each lane divides (e.g. 100)
 * @property {string} [unit]
 * @property {string} [totalLabel]
 * @property {string} [surplusLabel]
 * @property {string} [compareSegId]   optional logical compare dimension (must be a segment id)
 * @property {MultiLaneBar[]} bars      >= 2 lanes
 */

/** Pull the multi-lane block off a chart spec, however it is nested. */
export function getMultiLane(spec) {
  return spec && (spec.laneBar || spec.multiLane || (Array.isArray(spec.bars) ? spec : null));
}

/**
 * Validate a multi-lane spec. Returns true, or calls `fail(message)` (default:
 * throw). Both engines' validators can call this so the contract is enforced once.
 */
export function validateMultiLaneSpec(spec, fail = (m) => { throw new Error(m); }) {
  const sb = getMultiLane(spec);
  if (!sb) return fail('multi-lane spec missing (expected laneBar / multiLane / bars)');
  if (!Array.isArray(sb.bars) || sb.bars.length < 2) return fail('multi-lane needs >= 2 bars');
  if (!(typeof sb.total === 'number' && sb.total > 0)) return fail('multi-lane needs a positive total');
  const ids = [];
  for (const bar of sb.bars) {
    if (!bar.id || !bar.label) return fail(`multi-lane bar ${bar && bar.id} needs id + label`);
    if (!Array.isArray(bar.segments) || !bar.segments.length) return fail(`multi-lane bar ${bar.id} needs segments`);
    for (const s of bar.segments) {
      if (!(typeof s.value === 'number' && s.value >= 0)) return fail(`multi-lane segment ${s.id} needs value >= 0`);
      ids.push(s.id);
    }
    if (bar.deferred && !(typeof bar.deferred.value === 'number' && bar.deferred.value >= 0)) return fail(`multi-lane bar ${bar.id} deferred needs value >= 0`);
  }
  if (new Set(ids).size !== ids.length) return fail('multi-lane has duplicate segment ids');
  if (sb.compareSegId != null && !ids.includes(sb.compareSegId)) return fail(`multi-lane compareSegId ${sb.compareSegId} is not a segment id`);
  return true;
}

/**
 * @typedef {Object} MultiLaneGeom
 * @property {number} barX0            left origin (shared across lanes)
 * @property {number} barX1            right edge (total maps here)
 * @property {number} padTop
 * @property {number} titleH
 * @property {number} barH
 * @property {number} subH
 * @property {number} laneGap
 */

/**
 * Reference layout — pure geometry for a multi-lane spec. Returns lane + segment
 * rectangles, the cross-lane compare stats, and a `surplus` block (the delta on
 * the longer lane past the shortest compare-end). Renderer-agnostic: an SVG
 * engine reads the rects directly; a Recharts engine can feed them to a
 * <Customized> layer or map them to its own bar geometry.
 *
 * @param {MultiLaneSpec} sb
 * @param {MultiLaneGeom} geom
 */
export function layoutMultiLane(sb, geom) {
  const { barX0, barX1, padTop, titleH, barH, subH, laneGap } = geom;
  const total = sb.total || 1;
  const barW = barX1 - barX0;
  const laneH = titleH + barH + subH + laneGap;
  const xOf = (v) => barX0 + (v / total) * barW;

  const lanes = sb.bars.map((bar, li) => {
    const yTop = padTop + li * laneH;
    const barY = yTop + titleH;
    let cur = barX0;
    const segs = bar.segments.map((s) => {
      const x0 = cur;
      const w = (s.value / total) * barW;
      cur += w;
      return { ...s, x0, w, cx: x0 + w / 2, cy: barY + barH / 2 };
    });
    const compareSeg = segs.find((s) => s.compare);
    const compareEnd = compareSeg ? compareSeg.x0 + compareSeg.w : null;
    return { ...bar, li, yTop, barY, segs, compareEnd, deferred: bar.deferred || null };
  });

  const compareEnds = lanes.map((l) => l.compareEnd).filter((v) => v != null);
  const minCompare = compareEnds.length ? Math.min(...compareEnds) : null;
  const maxCompare = compareEnds.length ? Math.max(...compareEnds) : null;
  const surplus = (minCompare != null && maxCompare != null && maxCompare > minCompare)
    ? { minCompare, maxCompare, mid: (minCompare + maxCompare) / 2, deltaValue: Math.round(((maxCompare - minCompare) / barW) * total) }
    : null;

  return { lanes, laneH, barW, xOf, minCompare, maxCompare, surplus };
}

export default { getMultiLane, validateMultiLaneSpec, layoutMultiLane };
