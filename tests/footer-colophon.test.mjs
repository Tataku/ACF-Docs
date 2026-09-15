/**
 * The cover footer's colophon — the curve, the mascot, and the share offer
 *
 * Run: npm run test:footer
 *
 * Three behaviours were added to the foot of the cover, and each has a failure
 * mode that is INVISIBLE rather than broken — which is the only reason they are
 * worth a test file of their own:
 *
 *   1. The mascot's gaze and its blink are both `transform` on the SVG. Put them
 *      on one element and the animation simply wins: the blink keeps working,
 *      the gaze silently stops, and nothing anywhere reports it. The pinned
 *      markup gives two layers for free — the eyes are a <g> of two <circle>s —
 *      and this file holds them apart.
 *   2. The curve's peek highlight and its read state are both "a brighter arc".
 *      The first draft drew an unread peek in --accent-quiet, THICKER than the
 *      finished arcs beside it, so the one Part the reader had not read looked
 *      like the one they had. Emerald means read on that curve and nothing else.
 *   3. The share control is a word inside a sentence. Ship it as a <button> in
 *      the HTML and a reader with JS off gets a dead control mid-sentence; let
 *      the word change to "copied" and the sentence stops being a sentence while
 *      the accessible name drifts from the visible label (WCAG 2.5.3).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const COVER = read('public/site-b/cover-docs.html');
const CSS = read('public/site-b/reading-system.css');
const COVER_JS = read('public/site-b/cover-docs.js');
const CORE = read('public/site-b/reading-core.js');

const FOOTER = COVER.slice(COVER.indexOf('<footer class="site-footer'), COVER.indexOf('</footer>'));

// ---------------------------------------------------------------------------
// 1. The mascot
// ---------------------------------------------------------------------------
test('mascot: gaze and blink are on different elements, so neither cancels the other', () => {
  // The group takes the gaze; the circles inside it take the blink. One element
  // for both means one `animation` property for both, and the gaze loses.
  assert.match(CSS, /\.foot-brand \.brand-mark g\[fill="currentColor"\] \{\s*transform: translate\(/,
    'gaze is a transform on the eyes group');
  assert.match(CSS, /\.foot-brand \.brand-mark\.is-awake g\[fill="currentColor"\] circle \{\s*animation: acf-mascot-blink/,
    'blink is an animation on the eye circles');
  // The failure this file exists for: a blink rule that targets the group.
  assert.doesNotMatch(CSS, /\.brand-mark[^\n]*g\[fill="currentColor"\] \{\s*\n\s*animation: acf-mascot-blink/,
    'no blink animation on the gaze layer');
});

test('mascot: the markup it drives is the pinned mark, untouched', () => {
  // audit-brand-mark pins the geometry byte-wise and the figure is re-emitted
  // from ACFDashboard's shared module, so a class or id added in here would be
  // erased by the next regeneration with nothing reporting the loss. Everything
  // is addressed by the attributes the geometry already carries.
  const marks = COVER.match(/<svg class="brand-mark"[\s\S]*?<\/svg>/g) || [];
  assert.equal(marks.length, 2, 'the cover carries exactly two marks');
  for (const mark of marks) {
    const inner = mark.slice(mark.indexOf('>') + 1);
    assert.doesNotMatch(inner, /\sclass=/, 'no class inside the mark');
    assert.doesNotMatch(inner, /\sid=/, 'no id inside the mark');
  }
});

test('mascot: the blink is the dashboard cycle, not a new one', () => {
  // ACFDashboard's ACFMascot.css: five blinks over 12s, one of them a double,
  // gaps deliberately uneven — "An evenly spaced blink reads as a machine with a
  // fault light." Porting the behaviour and re-timing it is how two surfaces
  // come to disagree about one character.
  assert.match(CSS, /animation: acf-mascot-blink 12s/, 'the cycle is 12s');
  const kf = CSS.slice(CSS.indexOf('@keyframes acf-mascot-blink'));
  const shut = [...kf.slice(0, kf.indexOf('\n}')).matchAll(/([\d.]+)%\s*\{ transform: scaleY\(0\.1\)/g)].map((m) => Number(m[1]));
  assert.equal(shut.length, 5, 'five blinks in the cycle');
  const gaps = shut.slice(1).map((v, i) => Number((v - shut[i]).toFixed(1)));
  assert.equal(new Set(gaps).size, gaps.length, `gaps are uneven, got ${gaps.join(', ')}`);
  // A SQUASH, never a line: a flat bar is that family's BLOCKED reading, so an
  // eye that blinked by drawing one would flash the mark's own worst state.
  assert.doesNotMatch(kf.slice(0, kf.indexOf('\n}')), /scaleY\(0\)/, 'the eye squashes, it never closes to a line');
});

test('mascot: it is alive without GSAP, and still under a stated motion preference', () => {
  // Whether the figure moves must not depend on a vendored animation library.
  const fn = COVER_JS.slice(COVER_JS.indexOf('function mascot()'), COVER_JS.indexOf('function motion()'));
  assert.ok(fn.length > 400, 'mascot() located, and it sits outside motion()');
  assert.doesNotMatch(fn, /window\.gsap|ScrollTrigger/, 'the mascot never asks for GSAP');
  assert.match(fn, /prefers-reduced-motion: reduce/, 'the loop reads the motion preference');
  // `any-hover`, never `hover`: the bare form asks about the PRIMARY pointer, so
  // a 2-in-1 reports `hover: none` while its owner is driving a mouse.
  assert.match(fn, /\(any-hover: hover\)/, 'it asks any-hover');
  assert.doesNotMatch(fn, /matchMedia\('\(hover: hover\)'\)/, 'never the bare hover query');
  assert.match(fn, /requestAnimationFrame/, 'one rAF loop');
  assert.match(fn, /setProperty\('--acf-gaze-x'/, 'which writes custom properties, not layout');
  assert.match(fn, /passive: true/, 'and listens passively');
  // Blink is CSS, so the media query is the whole gate there.
  const gate = CSS.slice(CSS.indexOf('/* ---- The mascot'), CSS.indexOf('@keyframes acf-mascot-pleased'));
  assert.match(gate, /@media \(prefers-reduced-motion: no-preference\)/, 'and the CSS half is gated too');
});

// ---------------------------------------------------------------------------
// 2. The curve's peek
// ---------------------------------------------------------------------------
test('peek: a highlight never borrows the colour that means read', () => {
  const peek = CSS.match(/\.foot-arc\[data-peek\] \{[^}]*\}/);
  assert.ok(peek, 'the peek rule exists');
  assert.doesNotMatch(peek[0], /--accent/, 'an unread peek is ink, never accent');
  const readPeek = CSS.match(/\.foot-arc\[data-read\]\[data-peek\] \{[^}]*\}/);
  assert.ok(readPeek, 'a read arc has its own peek');
  assert.match(readPeek[0], /var\(--accent\)/, 'and that one keeps the accent it earned');
});

test('peek: it rides focus as well as hover, and adds no new controls', () => {
  const fn = CORE.slice(CORE.indexOf('function footPeek()'), CORE.indexOf('  /* ---- Sidebar collapse'));
  assert.ok(fn.length > 400, 'footPeek located');
  assert.match(fn, /'focus'/, 'a keyboard reader gets the same reading');
  assert.match(fn, /'blur'/, 'and it clears');
  // The six links were already the controls. The arcs stay decorative, so they
  // owe no accessible name and no target size.
  assert.match(FOOTER, /<svg viewBox="0 0 400 62"[^>]*aria-hidden="true"/, 'the curve is aria-hidden');
  assert.doesNotMatch(FOOTER, /data-foot-arc[^>]*(tabindex|role=)/, 'no arc pretends to be a control');
});

// ---------------------------------------------------------------------------
// 3. The share offer
// ---------------------------------------------------------------------------
test('share: it ships as prose and is upgraded, so JS-off keeps a sentence', () => {
  const btn = FOOTER.match(/<button[^>]*data-foot-share[^>]*>/);
  assert.ok(btn, 'the control is a <button> — the nav registry rejects an inert <a href="#">');
  assert.match(btn[0], /\shidden\b/, 'it ships hidden');
  assert.match(btn[0], /aria-label="Share[^"]*"/, 'with an accessible name that starts with its visible word');
  assert.match(FOOTER, /data-foot-share-plain/, 'and a plain-text "share" stands in its place until then');
  // `hidden` is a UA `display: none` and the control's own `display: inline-flex`
  // outranks it. This shipped broken once: with JS off the button rendered
  // anyway, beside the word it exists to replace, and the sentence read "free to
  // share share".
  assert.match(CSS, /\.foot-share\[hidden\] \{ display: none; \}/, 'and the author display does not outrank hidden');
  assert.match(FOOTER, /role="status" aria-live="polite" data-foot-share-status/, 'success is announced in a live region');
});

test('share: it hands over the canonical URL, not whatever origin served the page', () => {
  const fn = COVER_JS.slice(COVER_JS.indexOf('function shareOffer()'), COVER_JS.indexOf('function mascot()'));
  assert.ok(fn.length > 400, 'shareOffer located');
  assert.match(fn, /link\[rel="canonical"\]/, 'it reads the page\'s canonical');
  assert.match(fn, /canonical && canonical\.href\) \|\| location\.href/, 'falling back only if there is none');
  // The same ladder partActions() walks, so the site has one share behaviour.
  assert.match(fn, /navigator\.share/, 'native sheet first');
  assert.match(fn, /navigator\.clipboard && navigator\.clipboard\.writeText/, 'then the clipboard');
  assert.match(fn, /if \(!canNative && !canCopy\) return/, 'and with neither, the sentence stays a sentence');
});

test('share: the visible word never changes', () => {
  // "Free to read, free to copied" is not a sentence, and a visible label that
  // drifts from the accessible name breaks WCAG 2.5.3. Success speaks through
  // the icon, the mascot and the live region instead.
  const fn = COVER_JS.slice(COVER_JS.indexOf('function shareOffer()'), COVER_JS.indexOf('function mascot()'));
  assert.doesNotMatch(fn, /textContent = '(copied|shared|Copied|Shared)'/, 'the word is never rewritten');
  assert.match(fn, /setAttribute\('data-shared'/, 'the icon carries the confirmation');
  assert.match(CSS, /\.foot-share\[data-shared\] \.foot-share-icon--go \{ display: none; \}/, 'which swaps for a check');
});
