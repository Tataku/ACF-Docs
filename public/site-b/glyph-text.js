/* ============================================================================
   ACF GLYPH-TEXT — contained "decode / crystallize" system-label effect
   ----------------------------------------------------------------------------
   Progressive enhancement for a small, FIXED-DIMENSION label surface — the
   framework "signal" stamp above each Part title. Dependency-free, no build
   step. The label resolves left -> right out of a pool of monospace glyphs over
   a single requestAnimationFrame pass, then settles to clean static text. Plays
   once. No Matrix rain, no looping.

   WHY a dedicated surface (and NOT the <h1>): the document title is large,
   proportional display type sitting in live layout — scrambling it resized the
   heading and reflowed the page (title re-wrap, hero resize, viewport jitter).
   This effect now runs ONLY inside elements marked [data-glyph-text], which are
   styled (see .doc-signal in reading-system.css) as a monospace, single-line,
   overflow-clipped block. That box's height is its fixed line-box and its width
   is the column — both independent of the text it holds — so the decode can
   never cause layout shift, title resize, or viewport jitter. The live
   <h1.doc-title> is never selected here and is never mutated.

   Scope — elements carrying [data-glyph-text]. Nothing else.

   Accessibility
     - aria-label carries the true label text throughout the scramble, so the
       accessible name is always the real label (never the glyph noise).
     - prefers-reduced-motion (or an explicit data-glyph="off") renders the
       static label immediately, with no animation.
     - The real, readable label is the server-rendered DOM content AND the final
       settled value, so no-JS readers and crawlers see the true text.

   Per-label hooks (all optional, read off each [data-glyph-text]):
     - data-glyph="off"                        -> skip the effect, static text.
     - data-glyph-intensity="low|medium|high"  -> reveal-duration multiplier.
     - data-glyph-delay="<ms>"                 -> stagger the start (default 0).
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

  function reducedMotion() {
    return !!(window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function decode(el) {
    var text = el.textContent;
    if (!text) return;

    // Accessible name stays the real label, even mid-scramble.
    el.setAttribute('aria-label', text);

    // Static path — honour reduced-motion and an explicit per-label opt-out.
    if (reducedMotion() || el.getAttribute('data-glyph') === 'off') {
      el.setAttribute('data-glyph-done', '');
      return;
    }

    var duration = Math.round(BASE_MS * (INTENSITY[el.getAttribute('data-glyph-intensity')] || INTENSITY.medium));
    var delay = parseInt(el.getAttribute('data-glyph-delay'), 10);
    if (isNaN(delay)) delay = 0;
    var len = text.length;

    // No font swap and no measurement: the [data-glyph-text] surface already
    // reserves a fixed line-box and monospace columns in CSS, so the text can be
    // rewritten every frame without touching layout.
    var begin = null;
    var raf = null;
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
      if (p < 1) raf = requestAnimationFrame(tick);
      else settle();
    }

    raf = requestAnimationFrame(tick);
  }

  function init() {
    var els = document.querySelectorAll('[data-glyph-text]');
    if (!els.length) return; // guarded no-op (e.g. the cover page has no signal)

    var supported = ('requestAnimationFrame' in window);
    for (var i = 0; i < els.length; i++) {
      if (supported) {
        decode(els[i]);
      } else {
        // Ancient engine: leave the static label, just ensure the label is set.
        els[i].setAttribute('aria-label', els[i].textContent || '');
        els[i].setAttribute('data-glyph-done', '');
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
