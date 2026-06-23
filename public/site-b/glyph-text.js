/* ============================================================================
   ACF GLYPH-TEXT — contained "decode / crystallize" system-activation effect
   ----------------------------------------------------------------------------
   Progressive enhancement for small, FIXED-DIMENSION label surfaces — the
   framework "signal" stamp near the top of each live Part page. Dependency-free,
   no build step. A signal resolves left -> right out of a pool of monospace
   glyphs over a single requestAnimationFrame pass, then settles to clean static
   text. Plays once per element. No Matrix rain, no looping.

   This is a RARE "system activation" treatment, not a heading style. It is used
   ONLY on elements explicitly marked [data-glyph-text]. It is never applied to
   the live <h1>/<h2>/<h3> headings, chart/exhibit titles, the table of contents,
   body copy, citations, table labels, or any analytics/data surface.

   WHY a dedicated surface (and NOT the live headings): titles are large,
   proportional display type in live layout — scrambling them resized the
   heading and reflowed the page. Each [data-glyph-text] surface is styled (see
   .doc-signal in reading-system.css) as a monospace, single-line, overflow-
   clipped block: its HEIGHT is a fixed line-box and its WIDTH is the column,
   both independent of the text it holds, so the decode can never cause layout
   shift, title resize, or viewport jitter. No font swapping, no measurement.

   Activation
     - Each signal arms an IntersectionObserver and decodes ONCE, only when it
       scrolls into view — never blindly on page load for off-screen elements.
     - A short delay (TRIGGER_DELAY) follows intersection so the user actually
       sees the activation begin rather than catching only the settled text.
     - After a signal animates it is unobserved; it never replays on later scroll.

   Accessibility
     - aria-label carries the true label text from first paint and throughout the
       scramble, so the accessible name is always the real label.
     - prefers-reduced-motion renders the static label immediately: no observer,
       no delay, no scramble, no pulse.
     - The real, readable label is the server-rendered DOM content AND the final
       settled value, so no-JS readers and crawlers see the true text.

   Per-label hooks (all optional, read off each [data-glyph-text]):
     - data-glyph="off"                        -> skip the effect, static text.
     - data-glyph-intensity="low|medium|high"  -> reveal-duration multiplier.
     - data-glyph-delay="<ms>"                 -> extra per-label stagger.
   ============================================================================ */
(function () {
  'use strict';

  // Uppercase + digit + light operator glyphs. The surface renders in --font-mono,
  // so every glyph shares one advance and the decode reads as a calm "terminal"
  // resolve, not cyberpunk noise. (This file is UTF-8, like the rest of /site-b.)
  var GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789·/=+<>'.split('');

  function randGlyph() {
    return GLYPHS[(Math.random() * GLYPHS.length) | 0];
  }

  // One central reveal duration (ms), scaled per intensity. A slow, deliberate
  // "ritual" decode — materially longer than a quick glitch. data-glyph-intensity
  // picks a multiplier; the default is medium (1x).
  var BASE_MS = 1800;
  var INTENSITY = { low: 0.62, medium: 1, high: 1.5 };

  // Un-revealed glyphs re-randomize on this cadence (ms) rather than every frame,
  // so the un-decoded tail mutates at a calm, intentional rate instead of strobing.
  var CHURN_MS = 55;

  // Viewport activation. The decode fires only once the signal is in view, after a
  // short beat so the user sees it begin. rootMargin arms it a touch before centred
  // (but well on-screen, never at the very edge); threshold keeps it to "any part".
  var TRIGGER_DELAY = 220;                  // ms from "in view" to "begin decode"
  var IO_ROOT_MARGIN = '0px 0px -15% 0px';
  var IO_THRESHOLD = 0.01;

  function reducedMotion() {
    return !!(window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function decode(el) {
    var text = el.textContent;
    if (!text) { el.setAttribute('data-glyph-done', ''); return; }

    var duration = Math.round(BASE_MS * (INTENSITY[el.getAttribute('data-glyph-intensity')] || INTENSITY.medium));
    var delay = parseInt(el.getAttribute('data-glyph-delay'), 10);
    if (isNaN(delay)) delay = 0;
    var len = text.length;

    // No font swap and no measurement: the [data-glyph-text] surface already
    // reserves a fixed line-box and monospace columns in CSS, so the text can be
    // rewritten every frame without touching layout.
    var begin = null;
    var lastChurn = -1;
    var pool = new Array(len); // cached glyph per position, refreshed on churn

    function refreshPool() {
      for (var i = 0; i < len; i++) {
        if (text.charAt(i) !== ' ') pool[i] = randGlyph();
      }
    }

    function settle() {
      el.textContent = text;                  // exact original text is the final value
      el.setAttribute('data-glyph-done', ''); // hand off to the CSS ambient marker
    }

    function tick(now) {
      if (begin === null) begin = now + delay; // anchor to the rAF clock
      var p = now < begin ? 0 : Math.min(1, (now - begin) / duration);
      var locked = Math.floor(p * len); // chars resolved so far, left -> right
      if (now - lastChurn >= CHURN_MS) { refreshPool(); lastChurn = now; } // calm cadence
      var s = '';
      for (var i = 0; i < len; i++) {
        if (text.charAt(i) === ' ') s += ' '; // spaces preserved (word shape)
        else s += i < locked ? text.charAt(i) : pool[i];
      }
      el.textContent = s;
      if (p < 1) requestAnimationFrame(tick);
      else settle();
    }

    requestAnimationFrame(tick);
  }

  // Arm the activation delay, then decode. A named helper so the element binding is
  // captured per-signal (not shared across the observer loop).
  function scheduleDecode(el) {
    window.setTimeout(function () { decode(el); }, TRIGGER_DELAY);
  }

  function init() {
    var els = document.querySelectorAll('[data-glyph-text]');
    if (!els.length) return; // guarded no-op (e.g. the cover page has no signal)

    var i;
    // The accessible name is the real label for every signal, from first paint and
    // on every path below — screen readers never read the glyph noise.
    for (i = 0; i < els.length; i++) {
      els[i].setAttribute('aria-label', els[i].textContent || '');
    }

    // Static path — reduced-motion, or an engine without IntersectionObserver /
    // requestAnimationFrame: show the real label immediately, with no animation.
    if (reducedMotion() ||
        !('IntersectionObserver' in window) ||
        !('requestAnimationFrame' in window)) {
      for (i = 0; i < els.length; i++) els[i].setAttribute('data-glyph-done', '');
      return;
    }

    // Otherwise arm each signal to decode once, the first time it enters view.
    var io = new IntersectionObserver(function (entries, obs) {
      for (var j = 0; j < entries.length; j++) {
        if (!entries[j].isIntersecting) continue;
        var el = entries[j].target;
        obs.unobserve(el); // once per element — never re-arm on later scrolls
        if (el.getAttribute('data-glyph') === 'off') {
          el.setAttribute('data-glyph-done', ''); // honoured opt-out, static text
        } else {
          scheduleDecode(el);
        }
      }
    }, { root: null, rootMargin: IO_ROOT_MARGIN, threshold: IO_THRESHOLD });

    for (i = 0; i < els.length; i++) io.observe(els[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
