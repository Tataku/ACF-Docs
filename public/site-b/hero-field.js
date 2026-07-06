/* ============================================================================
   ACF HERO FIELD — shared by both covers (Option A intro-cover, Option B
   cover-docs). INVESTMENT, INCREASING, drawn as accumulation: a dot-matrix
   field of "units" stacks beneath a convex growth envelope; columns fill left
   to right, the frontier shimmers, and new units keep ticking in above it.

   Hooks: the hero container carries [data-hero-field] and contains
   <canvas class="dc-hero-canvas" hidden>; the field fences itself BELOW the
   element marked [data-hero-lede] (the hero's last line of content). An
   optional .dc-hero-art sibling is the static fallback and is hidden when the
   canvas runs. Time-based, so any single frame is a complete image. JS-off and
   prefers-reduced-motion never reveal the canvas. No dependencies.
   ============================================================================ */
(function () {
  'use strict';
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var hero = document.querySelector('[data-hero-field]');
  if (!hero) return;
  var canvas = hero.querySelector('canvas.dc-hero-canvas');
  var art = hero.querySelector('.dc-hero-art');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.hidden = false;
  if (art) art.style.display = 'none';

  var W = 0, H = 0, dpr = 1;
  var accent = '#34d399';
  var mouse = { x: -1e4, y: -1e4 };
  var visible = true;
  var bandTop = 0, bandBot = 0, fieldH = 0;
  var t0 = (window.performance && performance.now) ? performance.now() : Date.now();
  var GAP = 16, R = 2.0;
  var sparks = [];

  function now() { return ((window.performance && performance.now) ? performance.now() : Date.now()) - t0; }

  function readPalette() {
    var cs = getComputedStyle(document.documentElement);
    accent = (cs.getPropertyValue('--accent') || accent).trim();
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = hero.clientWidth;
    H = hero.clientHeight;
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // The field lives strictly BELOW the hero's last content element.
    var last = hero.querySelector('[data-hero-lede]');
    bandTop = H * 0.6;
    if (last) {
      var hb = hero.getBoundingClientRect();
      var lb = last.getBoundingClientRect();
      bandTop = Math.min(Math.max(lb.bottom - hb.top + 30, H * 0.3), H * 0.92);
    }
    bandBot = H - 10;
    fieldH = Math.max(bandBot - bandTop, 48);
  }

  // The growth envelope: how high the stack reaches at horizontal progress p.
  function heightFrac(p) { return 0.05 + 0.95 * Math.pow(Math.min(Math.max(p, 0), 1), 2.2); }
  function ease(u) { u = Math.min(Math.max(u, 0), 1); return 1 - Math.pow(1 - u, 3); }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    var T = now();
    var sweep = ease(T / 2600);                       // the build: columns fill left to right
    var cols = Math.floor(W / GAP);
    ctx.fillStyle = accent;

    for (var ci = 0; ci <= cols; ci++) {
      var x = ci * GAP + GAP / 2;
      var p = x / Math.max(W, 1);
      if (p > sweep) break;
      var colAge = (sweep - p) * 2600;                // ms since the sweep passed this column
      var pop = Math.min(colAge / 260, 1);            // each column eases in
      var top = bandBot - fieldH * heightFrac(p);     // envelope at this column
      for (var y = bandBot; y >= top; y -= GAP) {
        var depth = (y - top) / Math.max(fieldH, 1);  // 0 at the frontier, 1 at the floor
        var a = (0.16 + 0.20 * (1 - depth)) * pop;
        var r = R;
        if (y - GAP < top) {                          // the frontier unit: alive, shimmering
          a = (0.58 + 0.22 * Math.sin(T * 0.0035 + x * 0.045)) * pop;
          r = R + 0.5;
        }
        var dx = x - mouse.x, dy = y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < 8100) { var d = Math.sqrt(d2); a += (1 - d / 90) * 0.30; r += (1 - d / 90) * 0.6; }
        ctx.globalAlpha = Math.min(a, 0.85);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 6.2832);
        ctx.fill();
      }
    }

    // growth ticks: new units keep arriving above the frontier
    if (sweep >= 1 && Math.random() < 0.06) {
      var sc = (0.25 + Math.random() * 0.75) * W;
      sparks.push({ x: Math.round(sc / GAP) * GAP + GAP / 2, born: T });
    }
    for (var i = sparks.length - 1; i >= 0; i--) {
      var s = sparks[i];
      var age = (T - s.born) / 900;
      if (age >= 1) { sparks.splice(i, 1); continue; }
      var sp = s.x / Math.max(W, 1);
      var sy = bandBot - fieldH * heightFrac(sp) - GAP * (1 - age);   // settles onto the stack
      ctx.globalAlpha = 0.65 * (1 - age * 0.4);
      ctx.beginPath();
      ctx.arc(s.x, sy, R + 0.4, 0, 6.2832);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function frame() {
    if (visible && !document.hidden) draw();
    requestAnimationFrame(frame);
  }

  readPalette();
  resize();
  draw();
  requestAnimationFrame(frame);

  // Load-in cascade settle re-measure: the hero band is measured while the
  // page's load-in transforms (translateY) are still animating, so the first
  // getBoundingClientRect can sit low. Re-measure once after the cascade
  // settles. Mirrors the app's landingHeroField.js. Fire-and-forget — this
  // page script has no teardown path, so the bare timeout needs no clearing.
  setTimeout(function () { resize(); draw(); }, 900);

  hero.addEventListener('pointermove', function (e) {
    var r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
  });
  hero.addEventListener('pointerleave', function () { mouse.x = -1e4; mouse.y = -1e4; });

  var rT;
  window.addEventListener('resize', function () {
    clearTimeout(rT);
    rT = setTimeout(function () { resize(); draw(); }, 150);
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { threshold: 0 })
      .observe(hero);
  }
  new MutationObserver(function () { readPalette(); draw(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
