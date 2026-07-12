/* chart-core multi-lane contract + geometry tests (node:test, zero deps).
 *   node --test components/framework-charts/chart-core/tests/
 * Covers the hardened cross-repo contract: totals, ids, keys, sums, comparison
 * endpoints, deferred overlays, viewport-independent surplus, geometry bounds. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMultiLaneSpec, layoutMultiLane, getMultiLane, multiLaneTolerance } from '../multilane.mjs';

// ── fixtures ──────────────────────────────────────────────────────────────────
const twoLane = () => ({
  total: 100, unit: 'units', compareKey: 'deploy',
  bars: [
    { id: 'roc', label: 'ROC', segments: [{ id: 'roc-deploy', key: 'deploy', label: 'deploys', value: 100 }], deferred: { id: 'roc-defer', value: 24, label: 'deferred' } },
    { id: 'div', label: 'Dividend', segments: [{ id: 'div-deploy', key: 'deploy', label: 'deploys', value: 76 }, { id: 'div-tax', label: 'taxed', value: 24 }] },
  ],
});
const threeLane = () => ({
  total: 100, compareKey: 'keep',
  bars: [
    { id: 'a', label: 'A', segments: [{ id: 'a-k', key: 'keep', label: 'k', value: 100 }] },
    { id: 'b', label: 'B', segments: [{ id: 'b-k', key: 'keep', label: 'k', value: 80 }, { id: 'b-t', label: 't', value: 20 }] },
    { id: 'c', label: 'C', segments: [{ id: 'c-k', key: 'keep', label: 'k', value: 60 }, { id: 'c-t', label: 't', value: 40 }] },
  ],
});
const geom = (barX0 = 0, barX1 = 1000, barH = 40) => ({ barX0, barX1, padTop: 40, titleH: 20, barH, subH: 20, laneGap: 20 });
const passes = (spec) => assert.equal(validateMultiLaneSpec(spec), true);
const rejects = (spec, re) => assert.throws(() => validateMultiLaneSpec(spec), re || /.*/);

// ── valid cases ───────────────────────────────────────────────────────────────
test('valid two-lane spec passes', () => passes(twoLane()));
test('valid three-lane spec passes', () => passes(threeLane()));
test('zero-value segment is allowed (sum still equals total)', () => {
  passes({ total: 100, bars: [
    { id: 'a', label: 'A', segments: [{ id: 'a1', label: 'x', value: 100 }, { id: 'a2', label: 'z', value: 0 }] },
    { id: 'b', label: 'B', segments: [{ id: 'b1', label: 'x', value: 100 }] },
  ] });
});
test('shared semantic key may repeat across lanes (not forced globally unique)', () => {
  // both lanes carry key "deploy" (that IS the comparison) — must be allowed
  passes(twoLane());
  // and a non-compare shared key across lanes is fine too
  passes({ total: 100, bars: [
    { id: 'a', label: 'A', segments: [{ id: 'a-core', key: 'core', label: 'c', value: 100 }] },
    { id: 'b', label: 'B', segments: [{ id: 'b-core', key: 'core', label: 'c', value: 100 }] },
  ] });
});

// ── totals ────────────────────────────────────────────────────────────────────
test('zero total rejected', () => rejects({ ...twoLane(), total: 0 }, /total must be a finite positive/));
test('negative total rejected', () => rejects({ ...twoLane(), total: -100 }, /finite positive/));
test('NaN / non-number total rejected', () => {
  rejects({ ...twoLane(), total: NaN }, /finite positive/);
  rejects({ ...twoLane(), total: '100' }, /finite positive/);
  rejects({ ...twoLane(), total: Infinity }, /finite positive/);
});

// ── segment sum vs total (overflow / underflow) ─────────────────────────────────
test('segment sum over total (overflow) rejected', () => {
  rejects({ total: 100, bars: [
    { id: 'a', label: 'A', segments: [{ id: 'a1', label: 'x', value: 120 }] },   // 120 > 100
    { id: 'b', label: 'B', segments: [{ id: 'b1', label: 'x', value: 100 }] },
  ] }, /sum to 120/);
});
test('segment sum under total (underflow) rejected', () => {
  rejects({ total: 100, bars: [
    { id: 'a', label: 'A', segments: [{ id: 'a1', label: 'x', value: 80 }] },     // 80 < 100
    { id: 'b', label: 'B', segments: [{ id: 'b1', label: 'x', value: 100 }] },
  ] }, /sum to 80/);
});
test('sum within tolerance passes; tolerance defaults to 0.5% of total', () => {
  const spec = twoLane();
  assert.equal(multiLaneTolerance(spec), 0.5);
  passes({ total: 100, bars: [
    { id: 'a', label: 'A', segments: [{ id: 'a1', label: 'x', value: 100.4 }] },  // within 0.5
    { id: 'b', label: 'B', segments: [{ id: 'b1', label: 'x', value: 100 }] },
  ] });
});

// ── lanes / ids ─────────────────────────────────────────────────────────────────
test('fewer than two lanes rejected', () => rejects({ total: 100, bars: [{ id: 'a', label: 'A', segments: [{ id: 'a1', label: 'x', value: 100 }] }] }, />= 2 lanes/));
test('duplicate lane ids rejected', () => {
  rejects({ total: 100, bars: [
    { id: 'dup', label: 'A', segments: [{ id: 'a1', label: 'x', value: 100 }] },
    { id: 'dup', label: 'B', segments: [{ id: 'b1', label: 'x', value: 100 }] },
  ] }, /lane ids must be unique/);
});
test('missing lane label rejected', () => {
  rejects({ total: 100, bars: [
    { id: 'a', segments: [{ id: 'a1', label: 'x', value: 100 }] },
    { id: 'b', label: 'B', segments: [{ id: 'b1', label: 'x', value: 100 }] },
  ] }, /needs a label/);
});
test('duplicate segment ids WITHIN a lane rejected', () => {
  rejects({ total: 100, bars: [
    { id: 'a', label: 'A', segments: [{ id: 'same', label: 'x', value: 50 }, { id: 'same', label: 'y', value: 50 }] },
    { id: 'b', label: 'B', segments: [{ id: 'b1', label: 'x', value: 100 }] },
  ] }, /duplicate segment ids/);
});
test('non-finite / negative segment value rejected', () => {
  rejects({ total: 100, bars: [
    { id: 'a', label: 'A', segments: [{ id: 'a1', label: 'x', value: -5 }] },
    { id: 'b', label: 'B', segments: [{ id: 'b1', label: 'x', value: 100 }] },
  ] }, /finite and >= 0/);
});

// ── comparison endpoints ─────────────────────────────────────────────────────────
test('compareKey with a lane missing the compare segment rejected (0 found)', () => {
  rejects({ total: 100, compareKey: 'deploy', bars: [
    { id: 'a', label: 'A', segments: [{ id: 'a-d', key: 'deploy', label: 'x', value: 100 }] },
    { id: 'b', label: 'B', segments: [{ id: 'b-x', label: 'x', value: 100 }] },        // no key=deploy
  ] }, /exactly one segment with key "deploy" \(found 0\)/);
});
test('compareKey with two compare segments in a lane rejected', () => {
  rejects({ total: 100, compareKey: 'deploy', bars: [
    { id: 'a', label: 'A', segments: [{ id: 'a1', key: 'deploy', label: 'x', value: 60 }, { id: 'a2', key: 'deploy', label: 'y', value: 40 }] },
    { id: 'b', label: 'B', segments: [{ id: 'b1', key: 'deploy', label: 'x', value: 100 }] },
  ] }, /\(found 2\)/);
});
test('no compareKey → comparison simply disabled (spec still valid)', () => {
  passes({ total: 100, bars: [
    { id: 'a', label: 'A', segments: [{ id: 'a1', label: 'x', value: 100 }] },
    { id: 'b', label: 'B', segments: [{ id: 'b1', label: 'x', value: 100 }] },
  ] });
});

// ── deferred overlay ─────────────────────────────────────────────────────────────
test('deferred is an overlay — NOT added to the segment sum', () => {
  // roc lane sums to 100 with a deferred of 24 that is not part of the sum
  passes(twoLane());
});
test('deferred exceeding total rejected (must be bounded)', () => {
  const s = twoLane();
  s.bars[0].deferred = { id: 'd', value: 130, label: 'too big' };
  rejects(s, /deferred value 130 exceeds total/);
});
test('negative / non-finite deferred rejected', () => {
  const s = twoLane();
  s.bars[0].deferred = { id: 'd', value: -1, label: 'bad' };
  rejects(s, /deferred value must be finite and >= 0/);
});

// ── layout geometry ──────────────────────────────────────────────────────────────
test('layout produces lane/segment rects and no overflow for a valid spec', () => {
  const out = layoutMultiLane(twoLane(), geom(0, 1000));
  assert.equal(out.lanes.length, 2);
  assert.equal(out.anyOverflow, false);
  // roc-deploy spans the full width; div-deploy ends at 76% of the width
  assert.equal(out.lanes[0].segs[0].x0, 0);
  assert.equal(out.lanes[0].segs[0].w, 1000);
  assert.equal(Math.round(out.lanes[1].segs[0].w), 760);
  // no segment rectangle exceeds the lane bounds
  for (const l of out.lanes) for (const s of l.segs) assert.ok(s.x0 + s.w <= 1000 + 1e-6);
});
test('surplus.deltaValue comes from DATA values, independent of viewport width', () => {
  const spec = twoLane();
  const wide = layoutMultiLane(spec, geom(0, 1000));
  const narrow = layoutMultiLane(spec, geom(0, 360));
  assert.equal(wide.surplus.deltaValue, 24);     // 100 - 76 (data)
  assert.equal(narrow.surplus.deltaValue, 24);   // same delta at a different pixel width
  assert.notEqual(wide.surplus.mid, narrow.surplus.mid);  // pixel midpoint differs, the data delta does not
});
test('three-lane surplus uses max-min compare values', () => {
  const out = layoutMultiLane(threeLane(), geom(0, 1000));
  assert.equal(out.surplus.deltaValue, 40);      // keep values 100, 80, 60 → 100 - 60
});
test('invalid geometry throws (non-positive width)', () => {
  assert.throws(() => layoutMultiLane(twoLane(), geom(500, 500)), /positive width/);
  assert.throws(() => layoutMultiLane(twoLane(), geom(600, 400)), /positive width/);
});
test('invalid geometry throws (non-positive bar height)', () => {
  assert.throws(() => layoutMultiLane(twoLane(), geom(0, 1000, 0)), /barH must be a positive number/);
});
test('narrow and wide geometry both lay out cleanly', () => {
  for (const w of [200, 360, 768, 1440, 4000]) {
    const out = layoutMultiLane(twoLane(), geom(0, w));
    assert.equal(out.anyOverflow, false);
    assert.equal(out.lanes[1].segs[0].w > 0, true);
  }
});

// ── getMultiLane accessor ────────────────────────────────────────────────────────
test('getMultiLane unwraps laneBar / multiLane / bare bars', () => {
  assert.ok(getMultiLane({ laneBar: { total: 1, bars: [] } }));
  assert.ok(getMultiLane({ multiLane: { total: 1, bars: [] } }));
  assert.ok(getMultiLane({ total: 1, bars: [] }));
  assert.equal(getMultiLane({ nope: true }), null);
});
