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
const TOKENS = read('public/site-b/tokens.css');
const SYNC = read('scripts/sync-counts.mjs');

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
  // The rect read is a forced layout. Gating only the rAF loop left it running
  // on every pointer move anywhere on the page, for a figure below the fold.
  assert.match(fn, /function onMove\(e\) \{[\s\S]{0,400}?if \(!onScreen\) return;[\s\S]{0,80}getBoundingClientRect/,
    'the rect read is gated on the figure being on screen');
  // And the wake is symmetrical: a cycle that never stops is a cycle running
  // for nobody once the reader has scrolled away.
  assert.match(fn, /classList\.toggle\('is-awake', seen\)/, 'the blink sleeps again when the footer leaves');
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

test('curve: the seam is half at each end, so a stretch is centred on its own minutes', () => {
  // The claim the whole display rests on. The first draft clipped the entire
  // 1.4 seam off the FAR end, so a stretch of 18 was painted across
  // [at, at+16.6] — every arc 0.7 minutes early, while the markup comment
  // asserted the dash simply WAS the minutes. 7.8% false, in the sentence that
  // asserted it. Reverting the offset restores that silently, so it is pinned.
  assert.match(CSS, /stroke-dasharray: calc\(var\(--arc-len\) - 1\.4\) 999;/, 'the seam is 1.4 total');
  assert.match(CSS, /stroke-dashoffset: calc\(-1 \* \(var\(--arc-at\) \+ 0\.7\)\);/, 'and half of it is taken at the near end');
  // And the comment must not go back to overclaiming.
  assert.doesNotMatch(FOOTER, /a dash of \d+ IS \w+ minutes of arc/, 'the markup no longer says the dash is the minutes');
});

test('curve: the readout line reserves a real line, not a number below one', () => {
  // `min-height: 1.4em` reserved nothing: the rule sets no line-height, so it
  // inherited the body's --leading-relaxed (1.7) and one line already stood
  // taller than the floor. A floor under the natural height is a comment, not a
  // guarantee — so the leading is pinned here and the floor matches it.
  const rule = CSS.match(/\.foot-dial-meta \{[\s\S]*?\n\}/);
  assert.ok(rule, 'the readout has a rule');
  assert.match(rule[0], /line-height: var\(--leading-relaxed\);/, 'the leading is declared, not inherited');
  assert.match(rule[0], /min-height: 1\.7em;/, 'and the floor is one line of it');
});

test('map: read state is stated in the list, not only in the curve', () => {
  // Under 768px the header nav is display:none, so this map is the site's only
  // one — and on a phone there is no hover to ask the curve with. The curve
  // carries read in hue plus a 3->4.5 stroke step on a ~2.5px line; the list
  // carries it in a glyph, which survives greyscale and is spoken with the link.
  const fn = CORE.slice(CORE.indexOf('function footDial('), CORE.indexOf('function footPeek('));
  assert.match(fn, /\[data-foot-part-link="' \+ row\.getAttribute\('data-part'\) \+ '"\]/, 'footDial marks the matching row');
  assert.match(CSS, /\.foot-col a\[data-read\]::after \{[\s\S]*?content: " \\2713";/, 'and the row shows a tick');
  // Nothing ships pre-ticked, for the same reason no arc ships lit.
  assert.doesNotMatch(FOOTER, /data-foot-part-link="\d"[^>]*data-read/, 'no row ships read');
});

test('curve: the resume arrow is gated like every other nudge in the footer', () => {
  // The global reduce reset kills the transition but NOT the transform, so an
  // ungated nudge does not slow down under a stated preference — it snaps 4px.
  // .foot-out-arr was already gated; this one was not.
  const gated = CSS.slice(CSS.indexOf('.foot-dial-go .dc-arr'), CSS.indexOf('.foot-dial-go .dc-arr') + 400);
  assert.match(gated, /@media \(prefers-reduced-motion: no-preference\)/, 'the nudge sits inside the gate');
  const bare = CSS.match(/\.foot-dial-go \.dc-arr \{[^}]*\}/);
  assert.doesNotMatch(bare[0], /transition|transform/, 'and nothing moves outside it');
});

// ---------------------------------------------------------------------------
// 2b. The frontier
// ---------------------------------------------------------------------------
test('frontier: it is a dot ON the path, in the units the curve is measured in', () => {
  // A zero-length dash with a round cap cannot drift off the line it marks,
  // however the curve is later retuned — which a positioned <circle> could.
  const rule = CSS.match(/\.foot-head \{[\s\S]*?\n\}/);
  assert.ok(rule, 'the frontier has a rule');
  assert.match(rule[0], /stroke-dasharray: 0\.01 999;/, 'a zero-length dash');
  assert.match(rule[0], /stroke-linecap: round;/, 'with a round cap, so it is a dot');
  assert.match(rule[0], /stroke-dashoffset: calc\(-1 \* var\(--at-min, 0\)\);/, 'placed in minutes');
  assert.match(rule[0], /stroke: none;/, 'and invisible until the painter gives it a position');
  // It rides the same normalisation as the six stretches, and that is derived.
  assert.match(FOOTER, /data-foot-head pathLength="\d+"/, 'it declares a pathLength');
  assert.match(SYNC, /data-foot-head pathLength="/, 'which sync-counts writes');
});

test('frontier: it marks the unbroken run, not the minutes read', () => {
  // The distinction the whole mark exists for. A reader who jumped to Part 5 has
  // BEEN that far, not GOT that far; that stretch lights on its own beyond the
  // dot, and the resume link agrees with the dot because both come from one walk.
  const fn = CORE.slice(CORE.indexOf('function footDial('), CORE.indexOf('function footArrive('));
  assert.match(fn, /if \(!rows\[r\]\.hasAttribute\('data-read'\)\) break;/, 'the run stops at the first gap');
  assert.match(fn, /if \(runAt\) \{/, 'and a run of zero claims no position at all');
  assert.match(fn, /data-complete/, 'a finished book is marked');
  assert.match(CSS, /\[data-foot-progress\]\[data-complete\] \.foot-head \{ stroke: none; \}/,
    'and has no frontier left to mark');
});

test('frontier: the truth is written immediately, only the travel waits for arrival', () => {
  // Gating the FACT on an observer would tell a returning reader they had read
  // nothing. footDial writes --at-target at once; footArrive only decides when
  // the eye is there to watch it move, and falls through to the same value.
  const dial = CORE.slice(CORE.indexOf('function footDial('), CORE.indexOf('function footArrive('));
  assert.match(dial, /setProperty\('--at-target', runAt\)/, 'footDial writes the truth');
  const arrive = CORE.slice(CORE.indexOf('function footArrive('), CORE.indexOf('function footPeek('));
  assert.match(arrive, /if \(!window\.IntersectionObserver\) \{ land\(\); return; \}/, 'no observer still lands it');
  assert.match(arrive, /threshold: 0/, 'and any sliver counts, so a tall card in a short viewport still fires');
  assert.match(arrive, /--at-min/, 'the beat is a second property, not the same one');
});

test('frontier: the travel duration is a token, and the frontier composes it', () => {
  // The whole run hangs on this custom property. If it were renamed the
  // declaration would be invalid at computed-value time and the travel would
  // silently never happen.
  assert.match(TOKENS, /^\s*--motion-draw:\s*\d+ms;/m, 'the duration is a token');
  assert.match(CSS, /transition: stroke-dashoffset var\(--motion-draw\)/, 'and the frontier uses it');
  assert.match(CSS, /html\.js \.foot-head \{ transition/, 'behind html.js, so a JS-off page has no half-run dot');
});

// ---------------------------------------------------------------------------
// 2c. The transmission
// ---------------------------------------------------------------------------
test('transmission: the peak carries MORE ink than rest, not less', () => {
  // The first draft paired a thicker ring with a lower opacity, which cancels:
  // width 15 at 0.45 is 416 ink-units against 517 at rest, so the "pulse" read as
  // a dim. Ink is pi(outer^2 - inner^2) x opacity on a hollow ring.
  const kf = CSS.slice(CSS.indexOf('@keyframes acf-mascot-send'));
  const body = kf.slice(0, kf.indexOf('\n}'));
  const REST_R = 9.8;
  const ink = (w, o) => Math.PI * ((REST_R + w / 2) ** 2 - (REST_R - w / 2) ** 2) * o;
  const stops = [...body.matchAll(/stroke-width: (?:var\(--acf-tip-rest\)|([\d.]+)); stroke-opacity: ([\d.]+)/g)]
    .map((m) => ({ w: m[1] ? Number(m[1]) : null, o: Number(m[2]) }));
  assert.ok(stops.length >= 3, 'the cycle has a rest, a wave and an echo');
  const rest = ink(8.4, 1);
  for (const st of stops) {
    if (st.w === null) continue;                       // the rest stops
    assert.ok(ink(st.w, st.o) > rest, `a pulse at width ${st.w} opacity ${st.o} must outweigh rest`);
  }
});

test('transmission: it is stroke, never fill and never scale', () => {
  // This emitter draws the tip as a hollow RING where the dashboard's component
  // fills it, so a `fill` port would do nothing at all; and a scale would move
  // about one pixel at this render where closing the ring changes the silhouette.
  const kf = CSS.slice(CSS.indexOf('@keyframes acf-mascot-send'));
  const body = kf.slice(0, kf.indexOf('\n}'));
  assert.doesNotMatch(body, /fill|transform|scale/, 'no fill and no transform in the cycle');
  assert.match(CSS, /\.foot-brand \.brand-mark\.is-pleased circle\[cy="14"\]/, 'and it targets the antenna tip');
});

test('transmission: the resting weight it restates is the mark\'s own', () => {
  // `inherit` is ignored inside @keyframes, so the rest stops have to name the
  // weight. If ACFDashboard ever re-emits the figure at a different one, the tip
  // would silently snap to this number on every share and audit:brand would not
  // notice — it pins geometry and the viewBox, never the weight.
  const declared = (CSS.match(/--acf-tip-rest:\s*([\d.]+);/) || [, null])[1];
  assert.ok(declared, 'the resting weight is declared once');
  const markWeight = (COVER.match(/<svg class="brand-mark"[\s\S]*?<g stroke-width="([\d.]+)"/) || [, null])[1];
  assert.equal(declared, markWeight, `the keyframe rests at ${declared}; the mark draws at ${markWeight}`);
});

test('transmission: a second share inside the window replays it', () => {
  // Adding a class that is already there is not a change. The flush must be
  // getBoundingClientRect: `mark` is an <svg>, and offsetWidth is an HTMLElement
  // property SVGElement does not have, so `void el.offsetWidth` forces nothing.
  // Measured before the fix: three presses, one animationstart.
  const fn = COVER_JS.slice(COVER_JS.indexOf('function shareOffer()'), COVER_JS.indexOf('function mascot()'));
  assert.match(fn, /classList\.remove\('is-pleased'\);[\s\S]{0,600}?getBoundingClientRect\(\)[\s\S]{0,80}classList\.add\('is-pleased'\)/,
    'remove, flush with a rect read, add');
  assert.doesNotMatch(fn, /void mark\.offsetWidth/, 'never offsetWidth on an SVG');
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

test('share: a failure is visible, not only audible', () => {
  // Without an end state a sighted reader clicks "share", the clipboard rejects,
  // and the word does nothing at all — indistinguishable from a dead control.
  const fn = COVER_JS.slice(COVER_JS.indexOf('function shareOffer()'), COVER_JS.indexOf('function mascot()'));
  assert.match(fn, /function failed\(\)/, 'there is a failure path');
  assert.match(fn, /settleBack\('data-share-failed'\)/, 'and it sets a visible state');
  assert.match(fn, /\.catch\(failed\)/, 'which the clipboard rejection reaches');
  // No motion in it, so it survives the reduce reset as an end state.
  const rule = CSS.match(/\.foot-share\[data-share-failed\] \{[^}]*\}/);
  assert.ok(rule, 'the failure state has a rule');
  assert.doesNotMatch(rule[0], /transition|animation|transform/, 'and it is an end state, not a tween');
});

test('share: a second press is announced, and the announcement names the link', () => {
  // Writing the same string into a live region twice is not a mutation and most
  // screen readers stay silent — so copy, then copy again, said nothing the
  // second time. Verified in Chromium: the region now mutates write / blank /
  // write across two presses.
  const fn = COVER_JS.slice(COVER_JS.indexOf('function shareOffer()'), COVER_JS.indexOf('function mascot()'));
  assert.match(fn, /status\.textContent = '';[\s\S]{0,160}requestAnimationFrame/, 'the region is blanked first');
  assert.match(fn, /say\(msg \+ ' \\u00b7 ' \+ url\.replace/, 'and the announcement names the URL it shared');
});

test('share: the visible word never changes', () => {
  // "Free to read, free to copied" is not a sentence, and a visible label that
  // drifts from the accessible name breaks WCAG 2.5.3. Success speaks through
  // the icon, the mascot and the live region instead.
  const fn = COVER_JS.slice(COVER_JS.indexOf('function shareOffer()'), COVER_JS.indexOf('function mascot()'));
  assert.doesNotMatch(fn, /textContent = '(copied|shared|Copied|Shared)'/, 'the word is never rewritten');
  assert.match(fn, /settleBack\('data-shared'\)/, 'the icon carries the confirmation');
  assert.match(CSS, /\.foot-share\[data-shared\] \.foot-share-icon--go \{ display: none; \}/, 'which swaps for a check');
});
