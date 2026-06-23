/* ============================================================================
   ACF GLYPH-TEXT — institutional "decode / crystallize" document-title effect
   ----------------------------------------------------------------------------
   Progressive enhancement for the framework Part documents. Dependency-free,
   no build step. A faithful static-site port of the SVRN "GlyphText" scramble-
   reveal: the single top-level document title resolves left -> right out of a
   pool of ASCII / hex glyphs over one requestAnimationFrame pass, then settles
   into the page's own static title type. Plays once. No Matrix rain, no looping.

   Scope — the ONE top-level <h1 class="doc-title"> per page. Never body copy,
   section headings, the table of contents, nav, tables, or citations.

   Accessibility
     - aria-label carries the true title text throughout the scramble, so the
       accessible name is always the real heading (never the glyph noise).
     - prefers-reduced-motion (or an explicit data-glyph="off") renders the
       static title immediately, with no animation.
     - The real, readable title is the server-rendered DOM content AND the final
       settled value, so no-JS readers and crawlers see the true heading.

   Per-title hooks (all optional, read off the <h1>):
     - data-glyph="off"                 -> skip the effect, static text.
     - data-glyph-intensity="low|medium|high"  -> scramble duration (default medium).
     - data-glyph-delay="<ms>"          -> stagger the start (default 0).
   ============================================================================ */
(function () {
  'use strict';

  // Hex + operator + structural ASCII glyphs. Reads as an "analytical terminal"
  // decode, not cyberpunk noise. Deliberately restricted to characters the live
  // title font (Inter) is guaranteed to cover, so the scramble animates in the
  // title's OWN type — no tofu, and no font swap to pop back from on settle.
  // (This file is UTF-8, like the rest of /site-b.)
  var GLYPHS = '0123456789ABCDEF/\\<>=+:·#%&'.split('');

  function randGlyph() {
    return GLYPHS[(Math.random() * GLYPHS.length) | 0];
  }

  // One central reveal duration (ms), scaled per intensity. A slow, deliberate
  // "ritual" decode — materially longer than a quick glitch. data-glyph-intensity
  // picks a multiplier; the default is medium (1x).
  var BASE_MS = 2000;
  var INTENSITY = { low: 0.62, medium: 1, high: 1.5 };

  // Un-revealed glyphs re-randomize on this cadence (ms) rather than every frame,
  // so the un-decoded tail mutates at a calm, intentional rate instead of strobing.
  var CHURN_MS = 50;

  function reducedMotion() {
    return !!(window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function decode(el) {
    var text = el.textContent;
    if (!text) return;

    // Accessible name stays the real title, even mid-scramble.
    el.setAttribute('aria-label', text);

    // Static path — honour reduced-motion and an explicit per-title opt-out.
    if (reducedMotion() || el.getAttribute('data-glyph') === 'off') return;

    var duration = Math.round(BASE_MS * (INTENSITY[el.getAttribute('data-glyph-intensity')] || INTENSITY.medium));
    var delay = parseInt(el.getAttribute('data-glyph-delay'), 10);
    if (isNaN(delay)) delay = 0;
    var len = text.length;

    // Reserve the natural height so the reading column never shifts as the line
    // count settles. The font is deliberately NOT changed — the scramble renders
    // in the title's own type, so there is nothing to "pop" back from on settle.
    // Tabular figures keep the hex digits on an even advance during the decode.
    var prevMinHeight = el.style.minHeight;
    var prevNumeric = el.style.fontVariantNumeric;
    var naturalHeight = el.offsetHeight;
    if (naturalHeight) el.style.minHeight = naturalHeight + 'px';
    el.style.fontVariantNumeric = 'tabular-nums';

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
      el.style.minHeight = prevMinHeight;
      el.style.fontVariantNumeric = prevNumeric;
      el.textContent = text; // exact original text is the final value
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
    // Top-level document title only — exactly one per page by design.
    var el = document.querySelector('h1.doc-title');
    if (!el) return; // guarded no-op (e.g. the cover page has no .doc-title)

    if (!('requestAnimationFrame' in window)) {
      // Ancient engine: leave the static title, just ensure the label is set.
      el.setAttribute('aria-label', el.textContent || '');
      return;
    }
    decode(el);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
