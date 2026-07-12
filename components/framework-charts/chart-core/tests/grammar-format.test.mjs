/* chart-core grammar + formatter tests (node:test). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { VISUAL_RELATIONSHIPS, LAYOUT_RELATIONSHIPS, resolveVisualRelationship } from '../grammar.mjs';
import { formatIllustrativeMoney, formatIllustrativeCompactMoney, formatFractionPercent, FORMAT_PROFILES, formatMoney } from '../format.mjs';

test('grammar: explicit visualRelationship wins over derivation', () => {
  assert.equal(resolveVisualRelationship({ layout: 'single', visualRelationship: 'threshold' }), 'threshold');
});
test('grammar: derives relationship from layout', () => {
  assert.equal(resolveVisualRelationship({ layout: 'radial' }), 'composition');
  assert.equal(resolveVisualRelationship({ layout: 'laneBar' }), 'comparison');
  assert.equal(resolveVisualRelationship({ layout: 'quadrant' }), 'matrix');
  assert.equal(resolveVisualRelationship({ layout: 'flow' }), 'flow');
  assert.equal(resolveVisualRelationship({ layout: 'dual', perspectiveSlider: true }), 'reveal');
  assert.equal(resolveVisualRelationship({ layout: 'single' }), 'trend');
});
test('grammar: every LAYOUT_RELATIONSHIPS value is a known relationship', () => {
  for (const rels of Object.values(LAYOUT_RELATIONSHIPS)) {
    for (const r of rels) assert.ok(VISUAL_RELATIONSHIPS.includes(r), `${r} not in VISUAL_RELATIONSHIPS`);
  }
});

test('format: illustrative money is coarse and collapses non-positive to $0 (docs policy)', () => {
  assert.equal(formatIllustrativeMoney(250000), '$250,000');
  assert.equal(formatIllustrativeMoney(1234), '$1,200');       // coarse
  assert.equal(formatIllustrativeMoney(-500), '$0');           // non-positive collapses — WRONG for real losses (hence the name)
  assert.equal(formatIllustrativeMoney(0), '$0');
  assert.equal(formatMoney, formatIllustrativeMoney);          // compat alias
});
test('format: illustrative compact money', () => {
  assert.equal(formatIllustrativeCompactMoney(1200000), '$1.2M');
  assert.equal(formatIllustrativeCompactMoney(12000), '$12k');
});
test('format: fraction percent (0.05 → 5%), sign preserved', () => {
  assert.equal(formatFractionPercent(0.05), '5%');
  assert.equal(formatFractionPercent(-0.05), '-5%');           // sign preserved (unlike money policy)
  assert.equal(formatFractionPercent(0.1234, 1), '12.3%');
});
test('format: FORMAT_PROFILES names the contract; illustrative + percentFromFraction are the only implemented ones', () => {
  assert.equal(FORMAT_PROFILES.illustrative, 'illustrative');
  assert.equal(FORMAT_PROFILES.preciseCurrency, 'preciseCurrency');   // documented but consumer-owned (not implemented here)
  assert.ok(Object.isFrozen(FORMAT_PROFILES));
});
