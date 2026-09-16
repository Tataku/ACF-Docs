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
  assert.match(CSS, /\.foot-figure \.brand-mark g\[fill="currentColor"\] \{\s*transform: translate\(/,
    'gaze is a transform on the eyes group');
  assert.match(CSS, /\.foot-figure \.brand-mark\.is-awake g\[fill="currentColor"\] circle \{\s*animation: acf-mascot-blink/,
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
  assert.match(fn, /classList\.toggle\('is-awake', onScreen && settled\)/, 'the blink sleeps again when the footer leaves, and never wakes before the figure has landed');
  // The figure has SUBJECTS, and they arrive from reading-core.js — which is
  // loaded later, on a promise — as events, so neither file depends on the
  // other's load order. A runtime that never arrives still wakes the blink
  // after two beats of the walk token, never a typed number.
  assert.match(fn, /addEventListener\('acf:foot-settled'/, 'it hears the landing');
  assert.match(fn, /addEventListener\('acf:foot-subject'/, 'and the subjects');
  assert.match(fn, /2 \* \(tokenMs\('--motion-draw'\)/, 'with a fallback wake read off the token');
  assert.doesNotMatch(fn, /setTimeout\([^)]*, \d{3,}\)/, 'and no typed millisecond literal in the mascot');
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
  assert.match(FOOTER, /<svg class="foot-stage-svg" viewBox="0 0 1200 156"[^>]*aria-hidden="true"/, 'the curve is aria-hidden');
  assert.doesNotMatch(FOOTER, /data-foot-tick[^>]*(tabindex|role=|href=)/, 'no tick pretends to be a control');
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

test('note: the reader\'s own line is never rewritten under the cursor', () => {
  // A peek used to overwrite "≈ 52 min left" with the hovered Part's time, 600px
  // from where the reader was looking. The minutes are printed in the row under
  // the cursor and on the axis under the stretch; the note keeps saying what is
  // true about the reader.
  const fn = CORE.slice(CORE.indexOf('function footPeek()'), CORE.indexOf('  /* ---- Sidebar collapse'));
  assert.doesNotMatch(fn, /textContent/, 'footPeek writes no text');
  assert.match(fn, /acf:foot-subject/, 'it hands the figure a subject instead');
  // And a first visit has nothing to count: the two fact lines ship hidden and
  // empty, so JS-off is the finished first-visit page, not a stale claim.
  assert.match(FOOTER, /<p class="foot-note-count" data-foot-count hidden><\/p>/, 'the count ships hidden and empty');
  assert.match(FOOTER, /<p class="foot-note-meta" data-foot-meta hidden><\/p>/, 'so does the minutes line');
  assert.match(CSS, /\.foot-note-count\[hidden\], \.foot-note-meta\[hidden\] \{ display: none; \}/, 'and hidden wins over the author display');
  // The one control beside the figure has a real box: the shipped 23px link was
  // one pixel under the floor for no reason.
  const go = CSS.match(/\.foot-note-go \{[\s\S]*?\n\}/);
  assert.match(go[0], /padding-block: var\(--space-1\);/, 'the resume link has vertical padding to stand on');
});

test('map: read state is stated in the list, not only in the curve', () => {
  // Under 768px the header nav is display:none, so this map is the site's only
  // one — and on a phone there is no hover to ask the curve with. The curve
  // carries read in hue plus a 3->4.5 stroke step on a ~2.5px line; the list
  // carries it in a glyph, which survives greyscale and is spoken with the link.
  const fn = CORE.slice(CORE.indexOf('function footDial('), CORE.indexOf('function footPeek('));
  assert.match(fn, /\[data-foot-part-link="' \+ n \+ '"\]/, 'footDial marks the matching row');
  assert.match(fn, /\[data-foot-tick="' \+ n \+ '"\]/, 'and the matching tick under the curve');
  // The glyph is a COLUMN, so the eye can run down it, and it is silent to
  // assistive tech (the alt-text form, with the plain form first for engines
  // that lack it) — footDial writes the WORD into the visually-hidden span, so a
  // screen reader hears "read" and never "check mark".
  assert.match(CSS, /\.foot-col--parts a\[data-read\] \.foot-read::before \{ content: "\\2713"; content: "\\2713" \/ ""; \}/, 'and the row shows a tick in its own column');
  assert.match(fn, /word\.textContent = ', read'/, 'and says the word');
  assert.equal((FOOTER.match(/data-foot-read-word/g) || []).length, 6, 'one word slot per row');
  // A finished Part keeps its minutes: the one fact the curve exists to show is
  // never deleted by finishing.
  assert.doesNotMatch(fn, /data-foot-part-min/, 'footDial never touches the minutes column');
  // Nothing ships pre-ticked, for the same reason no arc ships lit.
  assert.doesNotMatch(FOOTER, /data-foot-part-link="\d"[^>]*data-read/, 'no row ships read');
});

test('curve: the resume arrow is gated like every other nudge in the footer', () => {
  // The global reduce reset kills the transition but NOT the transform, so an
  // ungated nudge does not slow down under a stated preference — it snaps 4px.
  // .foot-out-arr was already gated; this one was not.
  const gated = CSS.slice(CSS.indexOf('.foot-note-go .dc-arr'), CSS.indexOf('.foot-note-go .dc-arr') + 400);
  assert.match(gated, /@media \(prefers-reduced-motion: no-preference\)/, 'the nudge sits inside the gate');
  const bare = CSS.match(/\.foot-note-go \.dc-arr \{[^}]*\}/);
  assert.doesNotMatch(bare[0], /transition|transform/, 'and nothing moves outside it');
});

// ---------------------------------------------------------------------------
// 2b. The frontier
// ---------------------------------------------------------------------------
test('figure: it rests at the curve\'s origin, written to match the path', () => {
  // The figure's resting place is CSS (so JS off and first visits put it at the
  // foot of the climb) and the curve's origin is the `d` attribute. Two sources
  // for one point, so they are held equal here: retune the curve and this goes
  // red instead of the figure floating beside the line it should stand on.
  const d = (FOOTER.match(/data-foot-arc="1"[^>]*d="M([\d.]+) ([\d.]+) /) || [, null, null]);
  assert.ok(d[1] !== null, 'the curve starts with an M');
  const vb = (FOOTER.match(/class="foot-stage-svg" viewBox="0 0 (\d+) (\d+)"/) || [, null, null]);
  assert.ok(vb[2], 'the stage declares its viewBox');
  // The resting point is declared ONCE, on the stage, as --fx/--fy: the figure
  // stands there and the read wash is clipped to the same --fx, so the ground
  // the reader has covered ends exactly under the figure's feet.
  const stage = CSS.match(/\.foot-stage \{[\s\S]*?\n\}/);
  assert.ok(stage, 'the stage has a rule');
  assert.match(stage[0], new RegExp(`--fx: ${Number(d[1])}%;`), `it rests at x=${d[1]}`);
  assert.match(stage[0], new RegExp(`--fy: calc\\(${d[2]} / ${vb[2]} \\* 100%\\);`), `and at y=${d[2]} of ${vb[2]}`);
  const rule = CSS.match(/\.foot-figure \{[\s\S]*?\n\}/);
  assert.ok(rule, 'the figure has a rule');
  // The x is CLAMPED, not bare, at BOTH ends: the figure is centred on the
  // measure's edge at the origin and again at the terminus, and on a phone the
  // gutter is narrower than half the figure, so a foot touched the screen. The
  // inset is declared ONCE on the stage and pinned in full, so a widening of it
  // (a fixed inset, a second term) is a deliberate change; the figure's rule
  // only names it.
  assert.match(stage[0], /--foot-inset: calc\(0\.5 \* var\(--fig\) - var\(--page-gutter\) \+ var\(--space-1\)\);/, 'the inset is half the figure past the gutter, plus a step');
  assert.match(rule[0], /left: clamp\(var\(--foot-inset\), var\(--fx\), calc\(100% - var\(--foot-inset\)\)\);\s*top: var\(--fy\);/, 'and the figure stands at that point, its feet kept inside the page at either end');
  assert.match(rule[0], /transform: translate\(-50%, -100%\);/, 'standing on the line, not centred over it');
  assert.match(CSS, /\.foot-ground-read \{[\s\S]*?clip-path: inset\(0 calc\(100% - var\(--fx\)\) 0 0\);/, 'and the wash ends under its feet');
  // The wash bands that carry the curve past the measure are the path's two end
  // heights, and the terminus is the last number in the same `d`.
  const end = (FOOTER.match(/data-foot-arc="1"[^>]*d="[^"]* ([\d.]+)"/) || [, null])[1];
  assert.match(CSS, new RegExp(`\\.foot-stage-inner::before \\{ right: 100%; height: calc\\(${vb[2] - d[2]} / ${vb[2]} \\* 100%\\); \\}`), 'the left band is the wash height at the origin');
  assert.match(CSS, new RegExp(`\\.foot-stage-inner::after  \\{ left: 100%;  height: calc\\(${vb[2] - end} / ${vb[2]} \\* 100%\\); \\}`), 'the right band is the wash height at the terminus');
});

test('figure: clamped at the page\'s edge, its feet stay on the line', () => {
  // The origin clamp was fixed first and alone; the terminus is the same
  // mechanism mirrored, with one difference that CSS cannot absorb: the path
  // is flat at the origin and steep at the end, so a figure moved a few px
  // along x at 6 of 6 floated above the line. So the inset is registered as a
  // length (its computed value is px), footArrive() reads it, and re-samples
  // the ground under the clamped x. The frontier (--fx) is the wash's edge and
  // is never moved; only the feet are.
  assert.match(CSS, /@property --foot-inset \{ syntax: '<length>'; inherits: true; initial-value: 0px; \}/, 'the inset is registered as a length, so JS reads px');
  const arrive = CORE.slice(CORE.indexOf('function footArrive('), CORE.indexOf('function footPeek('));
  assert.match(arrive, /function standAt\(min\)/, 'the runtime has one notion of where the figure stands');
  assert.match(arrive, /getPropertyValue\('--foot-inset'\)/, 'read from the same inset the CSS clamps by, not a second number');
  assert.match(arrive, /if \(!\/px\$\/\.test\(inset\)/, 'and only where it resolved to px (unregistered, it is the calc it was written as)');
  assert.match(arrive, /return \{ x: x, y: g\.curveYAt\(x \/ 100\), fx: p\.x \};/, 'the ground is re-sampled under the clamped x; the frontier is kept as written');
  const figureFn = arrive.slice(arrive.indexOf('function placeFigure('), arrive.indexOf('function placeNote('));
  assert.match(figureFn, /var s = standAt\(min\);\s*stage\.style\.setProperty\('--fx', s\.fx\.toFixed\(3\)/, '--fx is the frontier: the wash ends there');
  assert.match(figureFn, /setProperty\('--fy', s\.y\.toFixed\(3\)/, 'and --fy is the ground under the feet');
  const noteFn = arrive.slice(arrive.indexOf('function placeNote('), arrive.indexOf('function land('));
  assert.match(noteFn, /var p = standAt\(min\);/, 'the note sits beside where the figure STANDS');
  assert.doesNotMatch(noteFn, /g\.pointAt\(/, 'never beside the unclamped point, a gap-width away from the figure');
  assert.match(CSS, /\.foot-ground-read \{[\s\S]*?clip-path: inset\(0 calc\(100% - var\(--fx\)\) 0 0\);/, 'the wash is clipped to the frontier, so at 6 of 6 it reaches the end');
});

test('figure: it stands where the unbroken run ends, and the walk is sampled from the path', () => {
  // The distinction the whole mark exists for: a reader who jumped to Part 5 has
  // BEEN that far, not GOT that far; that stretch lights on its own beyond the
  // figure, and the resume link agrees with the figure because both come from
  // one walk. Zero is a real answer — read only Part 3 and there is no position.
  const dial = CORE.slice(CORE.indexOf('function footDial('), CORE.indexOf('function footArrive('));
  assert.match(dial, /if \(!rows\[r\]\.hasAttribute\('data-read'\)\) break;/, 'the run stops at the first gap');
  assert.match(dial, /if \(runAt\) \{/, 'and a run of zero claims no position');
  assert.match(dial, /setProperty\('--at-target', runAt\)/, 'the truth is written immediately');
  // ONE sampler for the walk, the note and the peek, so the figure, the words
  // and the gaze can never disagree about where a minute is. Sampled from the
  // SAME path the stretches are drawn on, in minute units, then expressed as
  // viewBox fractions so it survives non-uniform scaling. Never from x alone:
  // pathLength normalises by arc length and the climb is steeper.
  const geo = CORE.slice(CORE.indexOf('function footGeometry('), CORE.indexOf('function footEmit('));
  assert.match(geo, /getPointAtLength\(path\.getTotalLength\(\) \* Math\.max\(0, Math\.min\(min, total\)\) \/ total\)/, 'the position is sampled from the curve');
  assert.match(geo, /pt\.x \/ vb\.width \* 100/, 'as a fraction of the viewBox');
  const arrive = CORE.slice(CORE.indexOf('function footArrive('), CORE.indexOf('function footPeek('));
  assert.match(arrive, /if \(reduce \|\| !window\.IntersectionObserver\) \{ land\(\); return; \}/, 'no observer, or a motion preference, still places it at once');
  assert.match(arrive, /threshold: 0\.5/, 'and the walk waits until half the stage is on screen — the audience seated');
  // Truth before beat: a walk is OWED, not assumed. The pending gate is set only
  // when a walk will actually happen, and lifted the moment it lands.
  assert.match(arrive, /if \(target\) section\.setAttribute\('data-pending', ''\);/, 'pending only when there is somewhere to walk to');
  assert.match(arrive, /section\.removeAttribute\('data-pending'\)/, 'and cleared on landing');
  assert.match(arrive, /arcAt\(arcs\[k\]\) >= target\) arcs\[k\]\.setAttribute\('data-lit', ''\)/, 'stretches beyond the run are lit from the start');
});

test('figure: the walk is a token in both duration AND ease, and the ground lights on the walker\'s own clock', () => {
  assert.match(TOKENS, /^\s*--motion-draw:\s*\d+ms;/m, 'the walk duration is a token');
  // The clock is a registered custom property transitioned by CSS, so the
  // duration and the ease are the tokens themselves — never four bezier
  // coefficients copied into JS, where the token could change and the walk
  // would not. Where @property is unsupported the value simply arrives and the
  // figure stands at the frontier: the truth without the travel.
  assert.match(CSS, /@property --foot-walk \{ syntax: '<number>'; inherits: false; initial-value: 0; \}/, 'the clock is a registered number');
  assert.match(CSS, /html\.js \.foot-stage \{ transition: --foot-walk var\(--motion-draw\) var\(--ease-standard\); \}/, 'transitioned with the tokens, behind html.js');
  assert.match(CSS, /\.foot-stage\[data-walking\] \{ --foot-walk: var\(--at-target, 0\); \}/, 'toward the truth footDial wrote');
  const arrive = CORE.slice(CORE.indexOf('function footArrive('), CORE.indexOf('function footPeek('));
  assert.match(arrive, /getPropertyValue\('--foot-walk'\)/, 'and the walk samples that clock each frame');
  assert.doesNotMatch(arrive, /cubic-bezier|function bez\(/, 'with no ease coefficients in JS');
  assert.doesNotMatch(CORE, /transition: left|transition: top/, 'and no chord-cutting left/top transition on the figure');
  // ONE CLOCK. A read stretch inside the run lights when the sampled position
  // passes its own --arc-at — the same number that moves the figure and the
  // wash — never from a delay computed against an eased traveller, which is how
  // the wash edge and the strokes came to step apart.
  assert.match(arrive, /arcAt\(arcs\[i\]\) <= min \+ 0\.01\) arcs\[i\]\.setAttribute\('data-lit', ''\)/, 'lit by the sampled position');
  assert.doesNotMatch(CSS, /@keyframes foot-arrive|--at-min/, 'no delayed arrival keyframe');
  assert.match(CSS, /html\.js \[data-foot-progress\]\[data-pending\] \.foot-arc\[data-read\]:not\(\[data-lit\]\) \{ stroke: var\(--ink-disabled\)/, 'held unread only while a walk is owed');
  const arcRule = CSS.match(/\.foot-arc \{[\s\S]*?\n\}/);
  assert.doesNotMatch(arcRule[0], /transition-delay/, 'and no delay rides the peek transition');
});

test('note: where it goes is decided by numbers alone, and never on the line it describes', () => {
  // The layout is a pure function of measured widths, so the envelope that
  // broke two prototypes (a caption struck through by the curve at 880 and on a
  // first-visit phone) is testable without a browser. LEFT is over the ground
  // the reader has covered — always lower than the figure on a monotonic
  // climb; RIGHT is over what is next, lifted when the line would reach it.
  const src = CORE.slice(CORE.indexOf('function footNoteLayout('), CORE.indexOf('  /* The figure walks the curve'));
  const footNoteLayout = new Function(src + '; return footNoteLayout;')();
  const flat = () => 150, rising = () => 60;
  const base = { fy: 150, fig: 64, noteW: 170, noteH: 98, gap: 13, topMin: -100, lockupRight: -Infinity, lockupBottom: -Infinity };
  assert.equal(footNoteLayout({ ...base, fx: 540, curveYAt: flat }).side, 'left', 'mid-book: over the read run');
  assert.equal(footNoteLayout({ ...base, fx: 0, curveYAt: flat }).side, 'right', 'first visit: over what is next');
  const lifted = footNoteLayout({ ...base, fx: 0, curveYAt: rising });
  assert.ok(lifted.top + base.noteH <= 150 - 64, 'a rising line lifts the note above the head');
  const clamped = footNoteLayout({ ...base, fx: 1178, fy: 6, curveYAt: () => 90 });
  assert.equal(clamped.side, 'left'); assert.equal(clamped.top, -100, 'at the summit it stops at the plate\'s top, never in the running head');
  const under = footNoteLayout({ ...base, fx: 540, fy: 200, curveYAt: () => 200, lockupRight: 480, lockupBottom: 30 });
  assert.equal(under.side, 'left'); assert.ok(under.top >= 30 + 13, 'and it steps below the lockup rather than into it');
  const squeezed = footNoteLayout({ ...base, fx: 540, curveYAt: flat, lockupRight: 480, lockupBottom: 30 });
  assert.equal(squeezed.side, 'right', 'and when stepping down would touch the line, it gives way to the right');
});

test('stage: the dash maths survive the non-uniform scale', () => {
  // `preserveAspectRatio: none` lets the curve keep its height on a phone. The
  // dash pattern survives that because it lives in path space — PROVIDED nothing
  // asks for non-scaling-stroke, which moves it to screen space. Measured at
  // 390px with that property on: the unread stretches painted accent.
  assert.match(FOOTER, /class="foot-stage-svg" viewBox="0 0 1200 156" preserveAspectRatio="none"/, 'the stage stretches');
  assert.doesNotMatch(CSS.slice(CSS.indexOf('.foot-arc {'), CSS.indexOf('.foot-tick {')), /non-scaling-stroke/, 'and nothing asks for non-scaling-stroke');
  // The ticks and the arcs are two derived copies of one geometry; they must add up.
  const ticks = [...FOOTER.matchAll(/data-foot-tick="(\d)" style="--at: (\d+); --len: (\d+)"/g)].map((m) => ({ n: +m[1], at: +m[2], len: +m[3] }));
  const arcs = [...FOOTER.matchAll(/data-foot-arc="(\d)" pathLength="(\d+)" style="--arc-len: (\d+); --arc-at: (\d+)"/g)].map((m) => ({ n: +m[1], total: +m[2], len: +m[3], at: +m[4] }));
  const total = Number((FOOTER.match(/foot-stage" style="--total: (\d+)"/) || [, NaN])[1]);
  assert.equal(ticks.length, 6); assert.equal(arcs.length, 6);
  for (let k = 0; k < 6; k += 1) {
    assert.equal(ticks[k].at, arcs[k].at, `Part ${k + 1}: tick and arc start together`);
    assert.equal(ticks[k].len, arcs[k].len, `Part ${k + 1}: tick and arc are the same length`);
    assert.equal(arcs[k].total, total, `Part ${k + 1}: normalised to the stage total`);
  }
  assert.equal(ticks.reduce((a, t) => a + t.len, 0), total, 'and the six ticks are the book');
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
  assert.match(CSS, /\.foot-figure \.brand-mark\.is-pleased circle\[cy="14"\]/, 'and it targets the antenna tip');
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
  // A CROSS-FADE, not a display cut: the reader who pressed is looking at the
  // word they pressed, and a cut there read as a glitch. The failed state keeps
  // a visible end too.
  assert.match(CSS, /\.foot-share\[data-shared\] \.foot-share-icon--go \{ opacity: 0; transform: translateY\(-4px\); \}/, 'which fades to a check');
  assert.match(CSS, /\.foot-share\[data-shared\] \.foot-share-icon--done \{ opacity: 1; transform: none; \}/, 'and the check fades in');
  assert.match(CSS, /\.foot-share\[data-share-failed\] \.foot-share-icon--go \{ opacity: 0\.4; \}/, 'while a failure dims the glyph rather than hiding it');
  assert.match(FOOTER, /<span data-foot-share-plain>share\.<\/span>/, 'the plain word carries the full stop; the control\'s sentence ends on its icon');
});

// ---------------------------------------------------------------------------
// 4. The plate
// ---------------------------------------------------------------------------
test('plate: the running head states the book, the note states the reader, and JS never confuses the two', () => {
  const dial = CORE.slice(CORE.indexOf('function footDial('), CORE.indexOf('function footGeometry('));
  assert.match(FOOTER, /<h2 class="foot-rh-title" id="foot-curve-title">The reading curve<\/h2>/, 'the section has a real heading');
  assert.match(FOOTER, /<span data-foot-total>&approx; \d+ min end to end<\/span>/, 'the book line is authored, derived by sync-counts');
  assert.doesNotMatch(dial, /data-foot-total|data-foot-book/, 'and footDial never rewrites it');
  assert.match(dial, /count\.hidden = false/, 'the reader\'s count is revealed only once there is one');
  // The stage is decoration to assistive tech; the running head, the note and
  // the contents carry every fact it draws.
  assert.match(FOOTER, /<div class="foot-stage" style="--total: \d+" aria-hidden="true">/, 'the stage is aria-hidden as a whole');
});

test('plate: the minutes reach the axis and the contents, derived like everything else', () => {
  const cardMinutes = (n) => Number((COVER.slice(COVER.indexOf(`data-part="${n}"`)).match(/&approx; (\d+) min read/) || [, NaN])[1]);
  for (let n = 1; n <= 6; n += 1) {
    const axis = Number((FOOTER.match(new RegExp(`data-foot-tick="${n}"[^>]*><span class="foot-tick-n">0${n}</span><span class="foot-tick-min">(\\d+) min`)) || [, NaN])[1]);
    const row = Number((FOOTER.match(new RegExp(`data-foot-part-min="${n}">(\\d+) min`)) || [, NaN])[1]);
    assert.equal(axis, cardMinutes(n), `Part ${n}: the axis says ${axis}, its card says ${cardMinutes(n)}`);
    assert.equal(row, cardMinutes(n), `Part ${n}: the contents says ${row}, its card says ${cardMinutes(n)}`);
  }
  assert.match(SYNC, /data-foot-part-min="\$\{n\}">/, 'the contents minutes have a sync-counts rule');
  assert.match(SYNC, /class="foot-tick-min">/, 'so do the axis minutes');
  assert.match(SYNC, /data-foot-total>&approx; /, 'and the book line');
  // The numerals sit under the MIDDLE of their stretch, so six stretches count as six.
  const tick = CSS.match(/\.foot-tick \{[\s\S]*?\n\}/);
  assert.match(tick[0], /align-items: center;/, 'centred under their minutes');
});

test('peek: it never makes a stretch heavier than the read run, and the row answers under the cursor', () => {
  // In greyscale a heavier peeked stretch was the loudest stroke on the curve,
  // inverting the one signal it carries. The answer is also printed in the row
  // the cursor is on: the minutes lift to ink with the title.
  const read = CSS.match(/\.foot-arc\[data-read\] \{ stroke: var\(--accent\); stroke-width: ([\d.]+); \}/);
  const peek = CSS.match(/\.foot-arc\[data-peek\] \{ stroke: var\(--ink\); stroke-width: ([\d.]+); \}/);
  assert.ok(read && peek, 'both rules exist');
  assert.ok(Number(peek[1]) <= Number(read[1]), `a peek at ${peek[1]} is never heavier than read at ${read[1]}`);
  assert.match(CSS, /\.foot-col--parts a\[data-peek\] \.foot-min \{ color: var\(--ink\); \}/, 'the row\'s minutes lift with it');
  assert.doesNotMatch(CSS, /\.foot-col a:hover, \.foot-col a:focus-visible \{ color: var\(--accent\); \}/, 'and a hovered row is ink, never the colour that means read');
});
