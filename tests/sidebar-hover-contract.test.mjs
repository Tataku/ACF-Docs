/**
 * The reading rail's hover follows the dashboard nav pane's contract.
 *
 * Run: node --test tests/sidebar-hover-contract.test.mjs
 *
 * Ported from ACFDashboard src/ui/components/Sidebar/Sidebar.css (.nav-item,
 * .sub-nav-item) and src/ui/runtime/pointerMode.js:
 *   1. The highlight (wash, glow, 2px slide) is INSTANT; only colour eases. A
 *      transitioned background leaves a trail of half-lit rows behind a
 *      cursor swept down a dense list, because each row fades out while the
 *      next fades in.
 *   2. Hover is gated on the pointer in use, read from pointerType, not on a
 *      media query about the hardware. Keyboard focus is never gated.
 *   3. The current section's marker stays on the rail; it takes the wash,
 *      not the slide.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CSS = fs.readFileSync(path.join(ROOT, 'public/site-b/reading-system.css'), 'utf8');
const CORE = fs.readFileSync(path.join(ROOT, 'public/site-b/reading-core.js'), 'utf8');

const ruleBody = (selectorStart) => {
  const i = CSS.indexOf(selectorStart);
  assert.notEqual(i, -1, `${selectorStart} rule exists`);
  const open = CSS.indexOf('{', i);
  return CSS.slice(open, CSS.indexOf('}', open) + 1);
};
const transitioned = (body) => (body.match(/transition:\s*([^;]+);/) || [, ''])[1];

test('rows transition colour only: no background, shadow or transform fade', () => {
  for (const sel of ['.side-part {', '.on-this-page a {']) {
    const t = transitioned(ruleBody(sel));
    assert.ok(t.includes('color'), `${sel} still eases its colour`);
    assert.doesNotMatch(t, /background|box-shadow|transform/, `${sel} must not fade the highlight (ghost rows)`);
  }
});

test('hover is pointer-gated; focus-visible is not', () => {
  assert.ok(CSS.includes('html:not([data-pointer="coarse"]) a.side-part:hover, a.side-part:focus-visible'));
  assert.ok(CSS.includes('html:not([data-pointer="coarse"]) .on-this-page a:hover, .on-this-page a:focus-visible'));
  // Every :hover on these rows must carry the gate immediately before it.
  for (const sel of ['a.side-part:hover', '.on-this-page a:hover', '.on-this-page a[aria-current="true"]:hover']) {
    let i = CSS.indexOf(sel);
    while (i !== -1) {
      assert.ok(CSS.slice(Math.max(0, i - 36), i).endsWith('html:not([data-pointer="coarse"]) '),
        `an ungated ${sel} at offset ${i}`);
      i = CSS.indexOf(sel, i + 1);
    }
  }
});

test('section entries carry the dashboard sub-nav highlight', () => {
  const body = ruleBody('html:not([data-pointer="coarse"]) .on-this-page a:hover');
  assert.match(body, /background-color:\s*var\(--accent-faint\)/);
  assert.match(body, /transform:\s*translateX\(2px\)/);
  assert.match(body, /box-shadow:/);
});

test('the current entry keeps its marker on the rail', () => {
  const body = ruleBody('html:not([data-pointer="coarse"]) .on-this-page a[aria-current="true"]:hover');
  assert.match(body, /transform:\s*none/);
});

test('pointer mode is published from pointerType, touch is coarse, pen hovers', () => {
  assert.match(CORE, /function pointerMode\(\)/);
  assert.match(CORE, /e\.pointerType === 'touch' \? 'coarse' : 'fine'/);
  assert.match(CORE, /addEventListener\('pointerdown', onPointer, opts\)/);
  assert.match(CORE, /addEventListener\('pointermove', onPointer, opts\)/);
  assert.match(CORE, /capture: true, passive: true/);
  assert.match(CORE, /\n  pointerMode\(\);\n/, 'it runs at boot');
});
