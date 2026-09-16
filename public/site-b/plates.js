/* ============================================================================
   ACF DOCS — the pictures draw themselves in
   Shared by the cover (its chapter plates and Resources tiles), every part
   page (the plate on its "next up" card) and Part 5's posture rails. reading-system.css holds each
   picture's strokes back until `data-drawn` lands on its `.dc-art`, then runs
   the draw-in on --motion-draw. It is set here from an IntersectionObserver, so
   a picture below the fold draws when it is looked at rather than when the page
   loads — and independently of any other script, so a blocked CDN still draws.
   Reduced motion never meets the hidden state: those rules live inside the
   no-preference gate. Without IntersectionObserver every picture is simply
   drawn. Fires once per picture.
   ============================================================================ */
(function () {
  'use strict';

  function plates() {
    // The cover's pictures, the part pages' next-up plates, and Part 5's posture rails.
    var arts = document.querySelectorAll('.dc-art, .pc-rail');
    if (!arts.length) return;
    var draw = function (el) { el.setAttribute('data-drawn', 'true'); };
    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(arts, draw);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        draw(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.35 });
    Array.prototype.forEach.call(arts, function (el) { io.observe(el); });
  }

  if (document.readyState !== 'loading') plates();
  else document.addEventListener('DOMContentLoaded', plates);
})();
