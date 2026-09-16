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
  // The presentation is still chosen by asking the event, not the device. The
  // two branches were folded into one expression when activation began moving
  // focus into the card; the invariant is unchanged and is asserted here and in
  // 'activation moves focus into the card' below.
  assert.match(wire, /open\(btn, null, !hovers\(e\)\)/, 'a click pins the popover, a tap raises the sheet');
  assert.doesNotMatch(wire, /matchMedia|isTouch|isMobile/, 'and nothing in the wiring asks what kind of machine this is');
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
  assert.match(wire, /btn\.addEventListener\('focus', function \(\) \{ if \(!restoringFocus && keyboardFocus\(btn\)\) open\(btn, null, false\); \}\);/,
    'focus opens the popover, never the sheet, except on the restore Escape performs');
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

// ---------------------------------------------------------------------------
// Keyboard reachability of the card's second layer
//
// The card is a role="dialog" appended as the last child of <body>, and it
// carries real controls: the "Appears in Part N" link, the chart link, and the
// related-concept chips. Nothing moved focus into it, and nothing connected it
// to its trigger, so those controls sat at the very end of the document order.
// Measured on part 5: open the card from the first term with Enter, then Tab
// four times — focus went to the next term, the term after that, and then the
// posture cards, while the card stayed open behind. In a full tab walk the
// card's links did not appear until stop 176 of 185, by which point the
// singleton had re-rendered to a different term entirely. Layer two was
// unreachable by keyboard.
//
// The rule that fixes it must not undo the pointer contract above. Focus moves
// on ACTIVATION — a click, a tap, or Enter — and never on hover, which is an
// interaction distinction, not a device one. A hovered card still takes no
// focus and still closes when the pointer leaves.
// ---------------------------------------------------------------------------
test('the card is addressable: it has an id, its triggers point at it, and it can hold focus', () => {
  assert.match(GLOSS, /card\.id = 'gloss-card';/, 'the card needs a stable id to be referenced');
  // The container is deliberately NOT a focus target: a dialog box is not a
  // place in a document. The term at the top of the card is.
  assert.doesNotMatch(GLOSS, /card\.setAttribute\('tabindex', '-1'\)/, 'the box never takes focus itself');
  assert.match(GLOSS, /'<p class="gloss-term" tabindex="-1">'/, 'the term is the intentional beginning, focusable without joining the tab order');
  const wire = GLOSS.slice(GLOSS.indexOf('function wire()'));
  assert.match(wire, /setAttribute\('aria-controls', 'gloss-card'\)/, 'the trigger names what it expands');
  assert.match(wire, /setAttribute\('aria-haspopup', 'dialog'\)/, 'and says what kind of thing it opens');
});

test('activation moves focus into the card; hover never does', () => {
  const wire = GLOSS.slice(GLOSS.indexOf('function wire()'));
  const click = wire.slice(wire.indexOf("btn.addEventListener('click'"), wire.indexOf('});', wire.indexOf("btn.addEventListener('click'")));
  assert.match(click, /focusIntoCard\(\)/, 'a click, a tap or Enter hands the reader the card');
  // ...and hands it over at the BEGINNING. Focusing the first control instead
  // made layer two reachable at the cost of the reading order, dropping the
  // reader past the definition onto "Appears in Part..." or a chip.
  const into = GLOSS.slice(GLOSS.indexOf('function focusIntoCard()'), GLOSS.indexOf('function esc('));
  assert.match(into, /var lead = cardLead\(\);[\s\S]{0,60}lead\.focus\(\); return;/, 'the term takes focus first');
  assert.doesNotMatch(into, /card\.focus\(\)/, 'and the container is never the fallback');
  assert.match(GLOSS, /function cardLead\(\) \{ return card \? card\.querySelector\('\.gloss-term'\) : null; \}/,
    'the beginning of the card is named once and used by both the hand-over and the trap');
  // The pointer contract is untouched: hovers(e) still decides the presentation.
  assert.match(click, /open\(btn, null, !hovers\(e\)\)/, 'a tap still raises the sheet and a click still pins the popover');
  const enter = wire.slice(wire.indexOf('btn.addEventListener(ENTER'), wire.indexOf('btn.addEventListener(LEAVE'));
  assert.doesNotMatch(enter, /focusIntoCard/, 'hovering must never steal focus');
  const focus = wire.slice(wire.indexOf("btn.addEventListener('focus'"), wire.indexOf("btn.addEventListener('blur'"));
  assert.doesNotMatch(focus, /focusIntoCard/, 'arriving on the trigger by keyboard opens the card but stays on the trigger');
});

test('Tab stays inside an activated card, and Escape is the way out', () => {
  assert.match(GLOSS, /function focusables\(\)/, 'the card knows what it contains');
  assert.match(GLOSS, /querySelectorAll\('a\[href\], button:not\(\[disabled\]\)'\)/, 'links and chips, in document order');
  const trap = GLOSS.slice(GLOSS.indexOf("card.addEventListener('keydown'"));
  assert.match(trap, /e\.key !== 'Tab'/, 'only Tab is intercepted');
  assert.match(trap, /e\.shiftKey && \(document\.activeElement === first \|\| document\.activeElement === cardLead\(\)\)[\s\S]{0,60}last\.focus\(\)/,
    'Shift+Tab wraps to the last control from the first control AND from the term, which is where activation puts the reader');
  assert.match(trap, /document\.activeElement === last[\s\S]{0,80}first\.focus\(\)/, 'Tab off the last control wraps to the first');
  // Escape already closed the card and returned focus; that is the documented exit.
  assert.match(GLOSS, /e\.key !== 'Escape'[\s\S]{0,400}closeNow\(\);[\s\S]{0,400}lastTrigger\.focus\(\)/, 'Escape closes and hands focus back to the term');
});

test('a card held open by activation is not closed by the trigger losing focus', () => {
  const wire = GLOSS.slice(GLOSS.indexOf('function wire()'));
  const blur = wire.slice(wire.indexOf("btn.addEventListener('blur'"), wire.indexOf("btn.addEventListener('click'"));
  assert.match(blur, /if \(!pinned\)/, 'blur only schedules a close for a card nothing is holding open');
  // Activation sets that flag for BOTH presentations, so moving focus into a
  // sheet does not dismiss the sheet on the way in.
  const click = wire.slice(wire.indexOf("btn.addEventListener('click'"), wire.indexOf('});', wire.indexOf("btn.addEventListener('click'")));
  assert.match(click, /pinned = true;/, 'an activation holds the card open');
  assert.doesNotMatch(click, /if \(hovers\(e\)\) \{ pinned = true/,
    'setting it only on the popover branch left a tapped sheet unheld, so moving focus into it dismissed it on the way in');
});

test('hopping to a related term keeps the reader in the card', () => {
  assert.match(GLOSS, /open\(lastTrigger, GLOSSARY\[chip\.getAttribute\('data-hop'\)\], sheetOpen\);[\s\S]{0,80}focusIntoCard\(\)/,
    're-rendering the card destroys the focused chip, so focus has to be re-placed');
});

test('Escape closes for good: the focus it restores does not re-open the card', () => {
  // Two correct behaviours that combine into a wrong one. Escape returns focus
  // to the trigger, and a trigger taking keyboard focus opens the card. While
  // focus never left the trigger this was invisible, because focusing an
  // already-focused element fires nothing. Once activation could put focus
  // inside the card, the restore became a real focus change and Escape stopped
  // closing anything. Found by rendering it, not by reading it.
  assert.match(GLOSS, /var restoringFocus = false;/, 'the restore is marked');
  assert.match(GLOSS, /if \(!restoringFocus && keyboardFocus\(btn\)\)/, 'and the focus-opens-popover rule stands down for it');
  const esc = GLOSS.slice(GLOSS.indexOf("if (e.key !== 'Escape'"));
  assert.match(esc.slice(0, 600), /restoringFocus = true;[\s\S]{0,200}lastTrigger\.focus\(\);[\s\S]{0,200}restoringFocus = false/,
    'the flag brackets the restore and is cleared asynchronously, so it holds whether or not focus dispatches synchronously');
});
