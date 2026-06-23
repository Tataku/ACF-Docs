/* ============================================================================
   ACF GLYPH-TEXT — institutional "decode / crystallize" document-title effect
   ----------------------------------------------------------------------------
   Progressive enhancement for the framework Part documents. Dependency-free,
   no build step. A faithful static-site port of the SVRN "GlyphText" scramble-
   reveal: the single top-level document title resolves left -> right out of a
   pool of block / hex glyphs over one requestAnimationFrame pass, then settles
   to clean static serif text. Plays once. No Matrix rain, no looping.

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

  // Block + box-drawing + structural + hex glyphs. Reads as "analytical
  // terminal", not cyberpunk noise. Identical pool to the reference effect.
  // (This file is UTF-8, like the rest of /site-b.)
  var GLYPHS = '▚▞▙▟▘▝▖▗░▒▓█/\\<>=+:·0123456789ABCDEF'.split('');

  function randGlyph() {
    return GLYPHS[(Math.random() * GLYPHS.length) | 0];
  }

  // intensity -> total scramble duration (ms). Higher = longer, more "computed".
  var INTENSITY_MS = { low: 420, medium: 620, high: 900 };

  // Monospace is applied ONLY during the scramble. It guarantees coverage of the
  // block/hex glyphs and an equal advance per character, so the large serif
  // display title neither renders tofu nor reflows its balanced line breaks
  // mid-decode. The settled title restores the editorial serif (font cleared).
  var MONO = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';

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

    var duration = INTENSITY_MS[el.getAttribute('data-glyph-intensity')] || INTENSITY_MS.medium;
    var delay = parseInt(el.getAttribute('data-glyph-delay'), 10);
    if (isNaN(delay)) delay = 0;
    var len = text.length;

    // Reserve the natural (serif) height + switch to monospace for the pass, so
    // the surrounding reading column never shifts. Both are cleared on settle.
    var prevFont = el.style.fontFamily;
    var prevMinHeight = el.style.minHeight;
    var naturalHeight = el.offsetHeight;
    el.style.fontFamily = MONO;
    if (naturalHeight) el.style.minHeight = naturalHeight + 'px';

    var begin = null;
    var raf = null;

    function settle() {
      el.style.fontFamily = prevFont;
      el.style.minHeight = prevMinHeight;
      el.textContent = text; // exact original text is the final value
    }

    function tick(now) {
      if (begin === null) begin = now + delay; // anchor to the rAF clock
      var p = now < begin ? 0 : Math.min(1, (now - begin) / duration);
      var locked = Math.floor(p * len); // chars resolved so far, left -> right
      var s = '';
      for (var i = 0; i < len; i++) {
        if (text.charAt(i) === ' ') s += ' '; // spaces preserved (word shape)
        else s += i < locked ? text.charAt(i) : randGlyph();
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
