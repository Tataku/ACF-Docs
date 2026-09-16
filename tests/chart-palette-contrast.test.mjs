/**
 * Chart palette — the light theme has to be readable, not just warm
 *
 * Run: npm run test:chart-palette-contrast
 *
 * The exhibits draw their own type, so the reading system's contrast tokens do
 * not reach them. Three light-theme entries carried chart text below AA, and
 * because they are tokens rather than local styles the failure repeated
 * wherever the token went: measured across five pages in Chromium, 329 text
 * nodes were under 4.5:1 — the axis colour 223 times at 4.34:1, the framework
 * green 79 times at 3.69:1, and the tertiary tier 27 times at 3.14:1. The dark
 * theme was clean throughout.
 *
 * The background is not assumed here, it was measured: every piece of chart
 * text on every page renders on `card` (#F3EFE6) or lighter. So that is the bar.
 *
 * WHY THE BOTTOM OF THE LADDER IS TIGHT NOW. On this paper tone there is no
 * room for two quiet rungs below AA: the lightest grey that still passes sits
 * just under text4. The fix keeps the ladder's ORDER — text4 darker than axis,
 * axis darker than the tertiary tier — and lifts the floor under all of it,
 * rather than inventing per-chart overrides for 329 pieces of text. Any future
 * warming of the paper tone breaks several rungs at once, which is what this
 * test is for.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(import.meta.dirname, '..');
const { PALETTES, ACCENTS } = await import(pathToFileURL(path.join(ROOT, 'components/framework-charts/palette.js')).href);

const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = (c) => {
  const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const l1 = lum(rgb(a)), l2 = lum(rgb(b));
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

// Tokens that carry TEXT in a rendered exhibit. Not derivable from the palette
// file, so it is recorded here with the run that produced it: a Chromium sweep
// of /, part 1, part 5, part 6 and framework-in-pictures collecting the
// computed fill of every <text> node in every chart.
const TEXT_TOKENS = ['text1', 'text2', 'text3', 'text4', 'axis', 'tierTertiary', 'tierReference',
  'bandStressText', 'bandRegimeText', 'invalidCharcoal', 'markInk'];
const TEXT_ACCENTS = ['green', 'signal'];       // gold appears on marks, never on type
const AA = 4.5;

test('light-theme chart text clears AA on the background it actually renders against', () => {
  const light = PALETTES.light;
  const bg = light.card;
  assert.equal(bg, '#F3EFE6', 'the measured backdrop for chart text');
  const fails = [];
  for (const key of TEXT_TOKENS) {
    const value = light[key];
    assert.ok(value, `light.${key} is missing`);
    const r = contrast(value, bg);
    if (r < AA) fails.push(`light.${key} ${value} is ${r.toFixed(2)}:1 on ${bg}`);
  }
  for (const key of TEXT_ACCENTS) {
    const r = contrast(ACCENTS[key].light, bg);
    if (r < AA) fails.push(`ACCENTS.${key}.light ${ACCENTS[key].light} is ${r.toFixed(2)}:1 on ${bg}`);
  }
  assert.deepEqual(fails, [], 'chart type is 7 to 12px; below 4.5:1 it stops being readable:\n  ' + fails.join('\n  '));
});

test('dark-theme chart text stays clear too', () => {
  const dark = PALETTES.dark;
  const fails = [];
  for (const key of TEXT_TOKENS) {
    const r = contrast(dark[key], dark.card);
    if (r < AA) fails.push(`dark.${key} ${dark[key]} is ${r.toFixed(2)}:1`);
  }
  for (const key of TEXT_ACCENTS) {
    const r = contrast(ACCENTS[key].dark, dark.card);
    if (r < AA) fails.push(`ACCENTS.${key}.dark ${ACCENTS[key].dark} is ${r.toFixed(2)}:1`);
  }
  assert.deepEqual(fails, [], fails.join('\n  '));
});

test('the light tonal ladder keeps its order after being lifted to AA', () => {
  const light = PALETTES.light;
  const bg = light.card;
  const rung = (k) => contrast(light[k], bg);
  // Quieter means lower contrast. The order is the design; AA is the floor.
  assert.ok(rung('text1') > rung('text2'), 'text1 is the loudest');
  assert.ok(rung('text2') > rung('text3'));
  assert.ok(rung('text3') > rung('text4'));
  assert.ok(rung('text4') > rung('axis'), 'the axis stays quieter than body type');
  assert.ok(rung('axis') > rung('tierTertiary'), 'the tertiary tier stays the quietest rung');
  assert.equal(light.tierReference, light.tierTertiary, 'reference and tertiary are one tone, as authored');
});

test('gold is not held to the text bar, because it never carries text', () => {
  // Recorded so a future reader does not "fix" it: the sweep found zero <text>
  // nodes filled with gold. It draws marks, where the 3:1 non-text floor applies.
  const r = contrast(ACCENTS.gold.light, PALETTES.light.card);
  assert.ok(r >= 3, `ACCENTS.gold.light is ${r.toFixed(2)}:1, under the 3:1 floor for a non-text mark`);
});
