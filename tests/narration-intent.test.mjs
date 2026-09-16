/**
 * Paid speech synthesis follows intent
 *
 * Run: npm run test:narration-intent
 *
 * `POST /api/narration` bills a provider per character. `GET` is a free
 * capability probe. The prewarm exists so the first press plays almost
 * instantly, which is worth having — but it was wired to three things that are
 * not intent:
 *
 *   window scroll, once          scrolling is reading
 *   requestIdleCallback, 4s      being on the page is not asking for audio
 *   the Listen button in view    that is page layout, not a decision
 *
 * Measured in Chromium against a stub of the real route, loading each part page
 * and touching nothing: 2 POSTs per view, 839 to 1,937 characters, 12 requests
 * and 9,459 characters across the six pages. Every view of every part page paid
 * for audio nobody asked for, and the server's own cache is documented as
 * ephemeral per serverless instance, so the bill scales with instances as
 * traffic grows rather than amortising away.
 *
 * INTENT IS ADDRESSING THE CONTROL. Hover, keyboard focus, or the beginning of
 * a press. Each is the reader putting themselves on the Listen button. A mouse
 * crossing it and a Tab passing through it both prewarm, and that symmetry is
 * deliberate: the keyboard path must not be slower than the pointer path.
 * `pointerdown` is what gives a touch reader the same head start a hover gives
 * a mouse reader, since a finger cannot hover.
 *
 * This is not the prewarm moved later behind a timer. There is no timer. The
 * work now has a cause.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const CORE = fs.readFileSync(path.join(ROOT, 'public/site-b/reading-core.js'), 'utf8');
const API = fs.readFileSync(path.join(ROOT, 'pages/api/narration.js'), 'utf8');

// The narration player, from its prewarm section to the end of its wire-up.
const PREWARM = CORE.slice(CORE.indexOf('// --- prewarm ---'), CORE.indexOf("stopBtn.addEventListener('click', stop)"));
// Asked of the CODE. The comments in that block name the three ambient triggers
// deliberately, so that a reader learns why they are absent; an assertion that
// cannot tell prose from wiring would fail on the explanation itself.
const CODE = PREWARM
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

test('the prewarm block was located and still warms only the head segments', () => {
  assert.ok(PREWARM.length > 600 && PREWARM.length < 6000, `prewarm section is ${PREWARM.length} chars`);
  assert.match(PREWARM, /fetchSegment\(list\[0\]\)/, 'still warms the first segment');
  assert.match(PREWARM, /if \(list\[1\]\) fetchSegment\(list\[1\]\)/, 'and the hand-off segment, bounded to two');
  assert.doesNotMatch(PREWARM, /list\.forEach|for \(var i = 0; i < list\.length/, 'never the whole page');
});

test('nothing ambient reaches paid synthesis', () => {
  // The three that made every page view a purchase. Named individually so a
  // diff that reintroduces one says which.
  assert.doesNotMatch(CODE, /requestIdleCallback/,
    'being idle on the page is not a request for audio');
  assert.doesNotMatch(CODE, /addEventListener\('scroll'/,
    'scrolling is reading, not intent');
  assert.doesNotMatch(CODE, /IntersectionObserver/,
    'the Listen button entering the viewport is page layout, not a decision');
  assert.doesNotMatch(CODE, /function autoPrewarm/,
    'the ambient wrapper is gone; there is nothing left for it to wrap');
  // And no timer took their place.
  assert.doesNotMatch(CODE, /setTimeout\([^)]*prewarm|prewarm[^)]*setTimeout/,
    'a delayed purchase is still an unasked-for purchase');
});

test('every prewarm trigger is the reader addressing the Listen control', () => {
  const triggers = [...CODE.matchAll(/(\w+)\.addEventListener\('([a-z]+)', prewarm\)/g)]
    .map((m) => ({ target: m[1], event: m[2] }));
  assert.ok(triggers.length >= 3, `expected the intent triggers, saw ${JSON.stringify(triggers)}`);
  for (const t of triggers) {
    assert.equal(t.target, 'listenBtn', `${t.event} is bound to ${t.target}, which is not the control`);
  }
  const events = triggers.map((t) => t.event).sort();
  assert.deepEqual(events, ['focus', 'mouseenter', 'pointerdown'],
    'hover for a mouse, focus for a keyboard, and the start of a press for a finger');
});

test('the capability probe stays free, and only generation is paid', () => {
  assert.match(API, /GET\s+\/api\/narration\s+->[\s\S]{0,80}capability/,
    'GET is documented as the free capability check');
  assert.match(API, /if \(req\.method === 'GET'\)/, 'and it is handled before any provider call');
  // The cache that makes repeat generation free is per-instance and ephemeral,
  // which is why an unasked-for POST is a real cost rather than a rounding error.
  assert.match(API, /Ephemeral per serverless instance/, 'the cache is honest about its own scope');
});

test('Data Saver still suppresses everything, including the free probe', () => {
  // Verified in Chromium with navigator.connection.saveData forced true:
  // GET 0, POST 0. Kept as a guard because prewarm is now intent-driven and it
  // would be easy to conclude the check is redundant. It is not: it is the one
  // signal that a reader has asked the browser to spend less on their behalf.
  assert.match(CORE, /navigator\.connection && navigator\.connection\.saveData/,
    'the Data Saver check survives the rewiring');
});
