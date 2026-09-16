/**
 * Glossary tooltips — which pointer gets which presentation
 *
 * Run: npm run test:glossary-pointer
 *
 * A glossary term opens two ways: a positioned popover for a pointer that
 * hovers, a bottom sheet for a finger. Choosing between them is the one thing
 * this feature kept getting wrong, and the failure is worth stating once so it
 * is never re-derived:
 *
 *   `window.matchMedia('(hover: hover) and (pointer: fine)')` was read ONCE at
 *   load, and the event wiring was branched on the result — so when it came back
 *   false the hover listeners were never attached at all. Both halves of that
 *   fail on a 2-in-1. The bare `hover`/`pointer` queries describe the PRIMARY
 *   pointer, so a Surface reports `hover: none` and `pointer: coarse` whenever
 *   Windows calls its touchscreen primary; its owner, driving a trackpad, got
 *   the touch sheet and no tooltip. And a cached answer cannot follow a device
 *   that changes: attach a mouse, fold the keyboard back, and it stays stale
 *   until a reload.
 *
 * The contract that replaces it: nothing is cached, nothing is branched at wire
 * time, both listener families are always attached, and every interaction is
 * asked what it came from — `pointerType` is the only signal that can tell one
 * touch apart from the next trackpad move on the same machine. A device that is
 * both gets both.
 *
 * Rendered proof lives beside this file's logic, not in it: a Chromium run with
 * `hover: none`/`pointer: coarse` emulated and a real mouse scores 10/10 here
 * and 6/10 against the version that shipped, reproducing the reported symptom
 * exactly (hover does nothing, a click raises the sheet).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const CORE = fs.readFileSync(path.join(ROOT, 'public/site-b/reading-core.js'), 'utf8');
// The glossary tooltips are the last IIFE in the file.
const GLOSS = CORE.slice(CORE.indexOf('Glossary tooltips'));

test('no device boolean survives load: the primary-pointer query is gone and nothing is cached', () => {
  assert.ok(GLOSS.length > 2000, 'the glossary tooltip block was located');
  // Asked of the CODE, not the prose: the comment above hovers() quotes the old
  // query on purpose, so the assertion pins what is passed to matchMedia.
  // The leading paren is load-bearing: `(any-hover: hover)` contains the bare
  // query as a substring, and an assertion that cannot tell them apart would
  // pass on the exact line it exists to forbid.
  assert.doesNotMatch(GLOSS, /matchMedia\([\s\S]{0,20}\(hover: hover\)/, 'never the bare hover query — it describes the PRIMARY pointer');
  assert.doesNotMatch(GLOSS, /matchMedia\([\s\S]{0,60}\(pointer: fine\)/, 'never the bare pointer query, for the same reason');
  assert.doesNotMatch(GLOSS, /var desktop\b|const desktop\b|let desktop\b/, 'no cached device boolean');
  // The capability query that IS allowed, and it is read through a function so
  // every call re-reads it rather than freezing the answer.
  assert.match(GLOSS, /matchMedia\('\(any-hover: hover\)'\)/, 'it asks any-hover');
  assert.match(GLOSS, /function hoverCapable\(\) \{ return hoverMedia \? hoverMedia\.matches : true; \}/,
    'capability is read live, and an unreadable one assumes hover rather than costing the mouse its popover');
});

test('each interaction is asked what it came from, and touch is the only thing that is not a hover', () => {
  const fn = GLOSS.slice(GLOSS.indexOf('function hovers('), GLOSS.indexOf('function keyboardFocus('));
  assert.match(fn, /var t = e && e\.pointerType;/, 'it reads the event, not the device');
  assert.match(fn, /if \(t === 'touch'\) return false;/, 'a finger is not a hover');
  assert.match(fn, /if \(t === 'mouse' \|\| t === 'pen'\) return true;/, 'a mouse or a pen is, whatever the media query claims');
  assert.match(fn, /return hoverCapable\(\);/, 'and an unreadable type falls back to the live capability query');
});

test('both listener families are attached unconditionally — no branch decides who gets hover', () => {
  const wire = GLOSS.slice(GLOSS.indexOf('function wire()'));
  assert.doesNotMatch(wire, /if \(desktop\)/, 'the wiring is never branched on a device');
  assert.match(wire, /btn\.addEventListener\(ENTER, function \(e\) \{/, 'every trigger gets the hover-open listener');
  assert.match(wire, /btn\.addEventListener\(LEAVE, function \(e\) \{/, 'and the hover-close listener');
  assert.match(wire, /btn\.addEventListener\('click', function \(e\) \{/, 'and the click listener');
  assert.match(wire, /if \(!hovers\(e\)\) return;\s*\/\/ a finger is not a hover/, 'the hover path declines a touch at the event, not at wire time');
  // The presentation is chosen per interaction: a click pins the popover, a tap
  // raises the sheet, and the same trigger on the same machine can do either.
  assert.match(wire, /if \(hovers\(e\)\) \{ pinned = true; open\(btn, null, false\); \}/, 'a click pins the popover');
  assert.match(wire, /else open\(btn, null, true\);/, 'a tap raises the sheet');
  // Escape, outside-click and reposition used to be desktop-only, which left a
  // "mobile" Surface with no way to dismiss a pinned card.
  assert.match(wire, /document\.addEventListener\('click', function \(e\) \{ if \(pinned/, 'outside-click closes a pinned card everywhere');
  assert.match(wire, /window\.addEventListener\('resize'[\s\S]{0,90}!sheetOpen/, 'a resize repositions the popover, and never a sheet');
});

test('one event family, never two: a touch also emits compatibility mouse events', () => {
  assert.match(GLOSS, /var ENTER = 'PointerEvent' in window \? 'pointerenter' : 'mouseenter';/, 'pointer events where they exist');
  assert.match(GLOSS, /var LEAVE = 'PointerEvent' in window \? 'pointerleave' : 'mouseleave';/, 'and their matching leave');
  const wire = GLOSS.slice(GLOSS.indexOf('function wire()'));
  assert.doesNotMatch(wire, /addEventListener\('mouseenter'/, 'no raw mouseenter beside the pointer listener');
  assert.doesNotMatch(wire, /addEventListener\('mouseover'/, 'and no mouseover either');
});

test('the keyboard takes the popover; focus that merely follows a tap does not', () => {
  assert.match(GLOSS, /function keyboardFocus\(el\) \{\s*try \{ return el\.matches\(':focus-visible'\); \}/,
    'keyboard focus is :focus-visible, so a tap-focus does not fight the sheet');
  assert.match(GLOSS, /catch \(err\) \{ return hoverCapable\(\); \}/, 'and an unsupported :focus-visible falls back to the capability query');
  const wire = GLOSS.slice(GLOSS.indexOf('function wire()'));
  assert.match(wire, /btn\.addEventListener\('focus', function \(\) \{ if \(keyboardFocus\(btn\)\) open\(btn, null, false\); \}\);/,
    'focus opens the popover, never the sheet');
});

test('presentation is an argument, not a device: the sheet is chosen by the caller and tracked for reuse', () => {
  const open = GLOSS.slice(GLOSS.indexOf('function open(trigger'), GLOSS.indexOf('function closeNow('));
  assert.match(open, /function open\(trigger, entryOverride, asSheet\)/, 'open() takes the presentation');
  assert.match(open, /sheetOpen = !!asSheet;/, 'and records it');
  assert.match(open, /if \(sheetOpen\) \{[\s\S]{0,140}backdrop\.hidden = false;/, 'a sheet gets its backdrop');
  assert.match(open, /\} else \{[\s\S]{0,120}backdrop\.hidden = true;[\s\S]{0,120}positionPopover\(trigger\);/,
    'and a popover drops the backdrop the sheet raised');
  assert.match(GLOSS, /pinned = false; sheetOpen = false;/, 'closing clears both');
  // A related-concept chip must not silently change the presentation under the reader.
  assert.match(GLOSS, /open\(lastTrigger, GLOSSARY\[chip\.getAttribute\('data-hop'\)\], sheetOpen\)/,
    'hopping to a related term keeps the presentation the reader opened');
});
