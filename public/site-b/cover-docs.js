/* ============================================================================
   ACF DOCS COVER (Option B) — page-specific enhancement
   1) ⌘K search over Parts, sections, and the glossary (acf-glossary.json).
   2) GSAP load/scroll choreography. Start states are applied AT RUNTIME, so the
      page ships fully visible: JS-off, reduced-motion, or a blocked CDN all
      degrade to the complete static page. No dependencies beyond GSAP itself.
   ============================================================================ */
(function () {
  'use strict';

  /* ---- Search index ------------------------------------------------------- */
  var PARTS = [
    { t: 'Part 1 · Foundation & Philosophy', s: 'The premise, the operating posture, and the order of operations.', h: '/part-1-foundation' },
    { t: 'Part 2 · Lineage & Macro Thesis', s: 'Intellectual lineage and the regime-shift macro thesis.', h: '/part-2-lineage-macro-thesis' },
    { t: 'Part 3 · Bitcoin: Convexity Backbone', s: 'Why Bitcoin anchors the portfolio’s asymmetric upside.', h: '/part-3-bitcoin-convexity-backbone' },
    { t: 'Part 1 in Pictures', s: 'The Foundation as a visual essay: seven exhibits.', h: '/part-1-pictures' }
  ];
  var SECTIONS = [
    { t: 'Manifesto', s: 'Part 1 · The traditional portfolio playbook is failing quietly.', h: '/part-1-foundation#manifesto' },
    { t: 'Abstract', s: 'Part 1 · A portfolio operating system for unstable regimes.', h: '/part-1-foundation#abstract' },
    { t: 'Order of Operations', s: 'Part 1 · The system at a glance.', h: '/part-1-foundation#order-of-operations' },
    { t: 'Framework Lineage', s: 'Part 2 · The intellectual foundations, thesis-agnostic.', h: '/part-2-lineage-macro-thesis#lineage' },
    { t: 'What It Excludes', s: 'Part 2 · What the framework intentionally excludes.', h: '/part-2-lineage-macro-thesis#excludes' },
    { t: 'Tax as Multiplier', s: 'Part 2 · A dominant structural return multiplier.', h: '/part-2-lineage-macro-thesis#tax' },
    { t: 'Thought Leaders', s: 'Part 2 · How the framework uses thought leaders.', h: '/part-2-lineage-macro-thesis#thought-leaders' },
    { t: 'Macro Thesis Process', s: 'Part 2 · Identification, evaluation, and governance.', h: '/part-2-lineage-macro-thesis#macro-thesis' },
    { t: 'The Backbone', s: 'Part 3 · Bitcoin as the convexity backbone.', h: '/part-3-bitcoin-convexity-backbone#backbone' },
    { t: 'Structural Fit', s: 'Part 3 · Why Bitcoin specifically.', h: '/part-3-bitcoin-convexity-backbone#irreplaceability' },
    { t: 'Multi-Cycle Survivability', s: 'Part 3 · Optimizing for multi-cycle survivability.', h: '/part-3-bitcoin-convexity-backbone#survivability' },
    { t: 'Risk Register', s: 'Part 3 · What can break.', h: '/part-3-bitcoin-convexity-backbone#risks' },
    { t: 'Valuation Models', s: 'Part 3 · Why Bitcoin can be modeled.', h: '/part-3-bitcoin-convexity-backbone#valuation' },
    { t: 'TAM & Implementation', s: 'Part 3 · TAM, custody, and the borrow phase.', h: '/part-3-bitcoin-convexity-backbone#tam' }
  ];
  var WAVE_FILES = { 1: '/part-1-foundation', 2: '/part-2-lineage-macro-thesis', 3: '/part-3-bitcoin-convexity-backbone' };
  var GLOSSARY = [];

  fetch('/site-b/acf-glossary.json')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d || !d.terms) return;
      GLOSSARY = d.terms.map(function (t) {
        return { t: t.term, s: t.definition, h: WAVE_FILES[t.wave] || WAVE_FILES[1] };
      });
    })
    .catch(function () {});

  /* ---- Search panel -------------------------------------------------------- */
  var panel = null, backdrop = null, input = null, results = null;
  var rows = [], active = -1, glossaryOnly = false, lastFocus = null;

  function buildPanel() {
    if (panel) return;
    backdrop = document.createElement('div');
    backdrop.className = 'dc-search-backdrop';
    backdrop.hidden = true;
    backdrop.addEventListener('click', closePanel);

    panel = document.createElement('div');
    panel.className = 'dc-search-panel';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Search the framework');

    input = document.createElement('input');
    input.className = 'dc-search-input';
    input.type = 'text';
    input.placeholder = 'Search Parts, sections, and the glossary…';
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-expanded', 'true');
    input.setAttribute('aria-controls', 'dc-results');

    results = document.createElement('div');
    results.className = 'dc-search-results';
    results.id = 'dc-results';
    results.setAttribute('role', 'listbox');

    panel.appendChild(input);
    panel.appendChild(results);
    document.body.appendChild(backdrop);
    document.body.appendChild(panel);

    input.addEventListener('input', function () { render(input.value); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter' && active >= 0 && rows[active]) { location.href = rows[active].getAttribute('href'); }
    });
  }

  function match(item, q) {
    return (item.t + ' ' + item.s).toLowerCase().indexOf(q) !== -1;
  }

  function group(label, items, q, max) {
    var hits = items.filter(function (i) { return !q || match(i, q); }).slice(0, max);
    if (!hits.length) return '';
    var html = '<p class="dc-sr-group">' + label + '</p>';
    hits.forEach(function (i) {
      html += '<a class="dc-sr" role="option" href="' + i.h + '">' + esc(i.t) +
              '<span class="dc-sr-snippet">' + esc(trim(i.s, 90)) + '</span></a>';
    });
    return html;
  }

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function trim(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }

  function render(query) {
    var q = (query || '').trim().toLowerCase();
    var html = '';
    if (glossaryOnly) {
      html = group('Glossary', GLOSSARY, q, 20);
    } else {
      html = group('Parts', PARTS, q, 4) + group('Sections', SECTIONS, q, 6) + group('Glossary', GLOSSARY, q, 6);
    }
    results.innerHTML = html || '<p class="dc-sr-empty">No matches. Try a Part, a section, or a framework term.</p>';
    rows = Array.prototype.slice.call(results.querySelectorAll('.dc-sr'));
    setActive(rows.length ? 0 : -1);
  }

  function setActive(i) {
    rows.forEach(function (r) { r.classList.remove('is-active'); r.removeAttribute('id'); });
    active = i;
    if (i >= 0 && rows[i]) {
      rows[i].classList.add('is-active');
      rows[i].id = 'dc-active-option';
      input.setAttribute('aria-activedescendant', 'dc-active-option');
      rows[i].scrollIntoView({ block: 'nearest' });
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  }

  function move(dir) {
    if (!rows.length) return;
    setActive((active + dir + rows.length) % rows.length);
  }

  function openPanel(glossaryMode) {
    buildPanel();
    glossaryOnly = !!glossaryMode;
    lastFocus = document.activeElement;
    backdrop.hidden = false;
    panel.hidden = false;
    input.value = '';
    render('');
    input.focus();
  }

  function closePanel() {
    if (!panel || panel.hidden) return;
    panel.hidden = true;
    backdrop.hidden = true;
    glossaryOnly = false;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* The in-flow search bar was removed after a pattern review (references put
     search in persistent chrome, and only at corpus scale). The panel remains
     solely as the Glossary tile's term browser; reintroduce a compact top-nav
     search when Parts 4-6 and the glossary page make the corpus deep enough. */
  var glossTile = document.querySelector('[data-glossary-tile]');
  if (glossTile) {
    glossTile.addEventListener('click', function (e) { e.preventDefault(); openPanel(true); });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closePanel();
  });

  /* Hero field: moved to the shared hero-field.js (loaded by both covers). */

  /* ---- The figure's subjects ------------------------------------------------ *
   * reading-core.js owns the curve's geometry and is loaded after this file, on
   * a promise; it names what the figure should look at with `acf:foot-subject`
   * events (a page point, tagged by who set it; the same tag with no point
   * releases it) and says when the figure has landed with `acf:foot-settled`.
   * shareOffer() speaks the same way, so the eyes have one vocabulary. */
  function footEmit(name, detail) {
    var ev;
    try { ev = new CustomEvent(name, { bubbles: true, detail: detail }); }
    catch (e) { ev = document.createEvent('CustomEvent'); ev.initCustomEvent(name, true, false, detail); }
    document.dispatchEvent(ev);
  }
  /* A duration is read from the token, never typed here. */
  function tokenMs(name) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return /ms$/.test(v) ? parseFloat(v) : parseFloat(v) * 1000;
  }

  /* ---- The share offer ------------------------------------------------------- *
   * "Free to read, free to share" is a claim; this makes the second half of it
   * true. The word is upgraded to a control only when this browser can actually
   * hand the link over — the native sheet where there is one, the clipboard
   * otherwise — so with neither the sentence stays a sentence.
   *
   * WHAT IT HANDS OVER is the page's canonical URL, never location.href:
   * sharing from a Vercel preview would otherwise hand someone a preview link.
   * This control was written to that rule while BACKLOG.md section 3 decision 4
   * was still open; the owner closed it on 2026-09-15 in favour of preferring the
   * canonical ALWAYS, and partActions() now follows the same rule. The invariant
   * over both is pinned in tests/control-reachability.test.mjs section 1b.
   *
   * The word never changes. "Free to read, free to copied" is not a sentence,
   * and a visible label that drifts from the accessible name breaks WCAG 2.5.3.
   * Success is carried by the icon (a cross-fade to a check, where the reader is
   * looking), the figure (which turns to the button, then widens its eyes and
   * transmits), and the live region. */
  function shareOffer() {
    var btn = document.querySelector('[data-foot-share]');
    var plain = document.querySelector('[data-foot-share-plain]');
    if (!btn || !plain) return;

    var canNative = !!navigator.share;
    var canCopy = !!(navigator.clipboard && navigator.clipboard.writeText);
    if (!canNative && !canCopy) return;   // neither API: the sentence stays a sentence

    var canonical = document.querySelector('link[rel="canonical"]');
    var url = (canonical && canonical.href) || location.href;
    var title = (document.title.split('\u00b7')[0] || '').trim() || 'The Adaptive Convexity Framework';
    var status = document.querySelector('[data-foot-share-status]');
    var mark = document.querySelector('[data-foot-figure] .brand-mark');
    var settle = null, unpleased = null;

    btn.hidden = false;
    plain.hidden = true;

    /* Writing the same string into a live region twice is not a mutation, and
       most screen readers stay silent for it — so copying the link, then copying
       it again, announced nothing the second time. Blank first, write on the next
       frame, and every press is heard. */
    function say(msg) {
      if (!status) return;
      status.textContent = '';
      window.requestAnimationFrame(function () { status.textContent = msg; });
    }

    function settleBack(attr) {
      clearTimeout(settle);
      settle = setTimeout(function () {
        btn.removeAttribute('data-shared');
        btn.removeAttribute('data-share-failed');
      }, 2400);
      btn.removeAttribute('data-shared');
      btn.removeAttribute('data-share-failed');
      btn.setAttribute(attr, '');
    }

    function done(msg) {
      // The announcement names the link, not just the act: a reader who cannot
      // see the page has otherwise been told something is on their clipboard
      // without being told what.
      say(msg + ' \u00b7 ' + url.replace(/^https?:\/\//, ''));
      settleBack('data-shared');
      if (!mark) return;
      // The figure turns to the thing that just happened before it reacts to it.
      var r = btn.getBoundingClientRect();
      footEmit('acf:foot-subject', { by: 'share', x: r.left + r.width / 2, y: r.top + r.height / 2 });
      /* Restart, don't re-add. Adding a class that is already there is not a
         change, so a second share inside the reaction window played nothing —
         the same shape of silence as writing identical text into a live region.
         Remove, flush the removal, then add.

         THE FLUSH IS getBoundingClientRect, NOT offsetWidth. `mark` is an
         <svg>, and offsetWidth is an HTMLElement property that SVGElement simply
         does not have — so the usual `void el.offsetWidth` reads undefined,
         forces no layout, and the restart silently does nothing. Measured before
         the fix: three presses, one animationstart. */
      mark.classList.remove('is-pleased');
      void mark.getBoundingClientRect().width;
      mark.classList.add('is-pleased');
      clearTimeout(unpleased);
      unpleased = setTimeout(function () {
        mark.classList.remove('is-pleased');
        footEmit('acf:foot-subject', { by: 'share' });
      }, 900);
    }

    /* A failure needs a VISIBLE end state, not only a live-region one. Without it
       a sighted reader clicks "share", the clipboard rejects, and the word does
       nothing at all — indistinguishable from a dead control. */
    function failed() {
      say('Copy failed');
      settleBack('data-share-failed');
    }

    btn.addEventListener('click', function () {
      if (canNative) {
        // A dismissed share sheet rejects. That is the reader deciding not to,
        // not a failure, so it says nothing rather than reporting an error.
        navigator.share({ title: title, url: url })
          .then(function () { done('Shared'); })
          .catch(function () {});
        return;
      }
      navigator.clipboard.writeText(url).then(function () { done('Link copied'); }).catch(failed);
    });
  }
  shareOffer();

  /* ---- The mascot ----------------------------------------------------------- *
   * A port of ACFDashboard's useMascotGaze
   * (src/features/shared/components/ACFMascot/useMascotGaze.js) to vanilla JS.
   * LERP and REACH are that file's constants: 0.09 so the mark TRAILS the
   * pointer instead of snapping to it — "a snap reads as a security camera" —
   * and 0.42 of the viewport for full deflection.
   *
   * IT HAS A SUBJECT. The pointer is the fallback, not the point: while the
   * figure walks it looks up the road ahead of it; when a Part is peeked it
   * looks at that stretch; when the link is shared it looks at the word that
   * was pressed. Those subjects arrive as events from reading-core.js and
   * shareOffer(), and a subject a few figure-widths away is a full glance
   * (NEAR), where the pointer needs 0.42 of the viewport.
   *
   * IT IS NOT INSIDE motion(). That function returns early when GSAP has not
   * loaded, and whether the figure is alive must not depend on a vendored
   * animation library. Blink is CSS and needs no JS at all; gaze needs this, and
   * carries its own reduced-motion gate because a transform driven from JS is
   * the one place the mark could drift out of a stated preference — so the loop
   * simply never starts. The pointer listener is separately gated on any-hover:
   * a touch device gets no listener rather than a stale frozen stare, but its
   * figure still watches the road while it walks.
   *
   * The observer does double duty: it runs the gaze loop only while the footer
   * is on screen, and it wakes the blink cycle — but not before the figure has
   * landed, so the first blink is the one after the walk, and not before a
   * beat's worth of --motion-draw twice over has passed, so a reading runtime
   * that never arrives cannot leave the figure asleep. */
  function mascot() {
    var brand = document.querySelector('[data-foot-figure]');
    var mark = brand && brand.querySelector('.brand-mark');
    if (!mark) return;

    // Fail closed: with no matchMedia the preference is unreadable, so no gaze
    // loop and no pointer listener rather than a transform running under a
    // preference nobody could state.
    var still = true, pointless = true;
    if (window.matchMedia) {
      still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      // `any-hover`, never `hover`. The bare form asks about the PRIMARY pointer,
      // so a 2-in-1 or a touchscreen laptop reports `hover: none` while its owner
      // is driving a mouse, and the gaze would silently never run for them.
      pointless = !window.matchMedia('(any-hover: hover)').matches;
    }

    var LERP = 0.09, REACH = 0.42, NEAR = 3;
    var targetX = 0, targetY = 0, currentX = 0, currentY = 0, frame = null;
    var onScreen = false, settled = false, subject = null, pointed = false, wakeTimer = null;

    function onMove(e) {
      // The rAF loop was gated on onScreen but this was not, so a rect read — a
      // forced synchronous layout — ran on EVERY pointer move anywhere on the
      // page, for a figure five screens below the fold. The gate belongs here.
      if (!onScreen) return;
      var r = mark.getBoundingClientRect();
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      pointed = true;
      targetX = Math.max(-1, Math.min(1, (e.clientX - cx) / (window.innerWidth * REACH)));
      targetY = Math.max(-1, Math.min(1, (e.clientY - cy) / (window.innerHeight * REACH)));
    }
    function aim() {
      // From the eyes, not the box's centre: the eyes sit a third of the way down.
      var r = mark.getBoundingClientRect();
      var ex = r.left + r.width / 2, ey = r.top + r.height * 0.34, near = r.width * NEAR;
      targetX = Math.max(-1, Math.min(1, (subject.x - ex) / near));
      targetY = Math.max(-1, Math.min(1, (subject.y - ey) / near));
    }
    function step() {
      if (subject) aim();
      else if (!pointed) { targetX = 0; targetY = 0; }
      currentX += (targetX - currentX) * LERP;
      currentY += (targetY - currentY) * LERP;
      mark.style.setProperty('--acf-gaze-x', currentX.toFixed(3));
      mark.style.setProperty('--acf-gaze-y', currentY.toFixed(3));
      frame = window.requestAnimationFrame(step);
    }
    function start() {
      if (still || frame != null || !onScreen || document.hidden) return;
      frame = window.requestAnimationFrame(step);
    }
    function stop() {
      if (frame == null) return;
      window.cancelAnimationFrame(frame);
      frame = null;
    }
    function blink() {
      // Symmetrical: the reason for waking on arrival — not blinking to an
      // empty room — is the same reason for sleeping on departure.
      mark.classList.toggle('is-awake', onScreen && settled);
    }
    function arrive(seen) {
      onScreen = seen;
      blink();
      if (seen) start(); else stop();
      clearTimeout(wakeTimer);
      // The fallback exists for a reading runtime that never arrives. While a
      // walk is OWED (data-pending) the figure must not wake at the origin with
      // its run unlit — the first blink is the one after the walk.
      if (seen && !settled && !document.querySelector('[data-foot-progress][data-pending]')) {
        wakeTimer = setTimeout(function () { settled = true; blink(); }, 2 * (tokenMs('--motion-draw') || 0));
      }
    }

    document.addEventListener('acf:foot-settled', function () { settled = true; blink(); });
    document.addEventListener('acf:foot-subject', function (e) {
      var d = e.detail || {};
      if (d.x == null) { if (subject && subject.by === d.by) subject = null; }
      else subject = d;
    });

    if (window.IntersectionObserver) {
      var io = new IntersectionObserver(function (entries) {
        arrive(entries.some(function (en) { return en.isIntersecting; }));
      }, { threshold: 0.35 });
      io.observe(brand.closest('.foot-stage') || brand.parentNode);   // the stage: the figure walks across it
    } else {
      arrive(true);
    }

    if (!still) {
      if (!pointless) document.addEventListener('mousemove', onMove, { passive: true });
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) stop(); else start();
      });
    }
  }
  mascot();

  /* ---- GSAP choreography ---------------------------------------------------- *
   * Guarded: reduced-motion or a missing GSAP leaves the (visible) static page. */
  function motion() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.gsap) return;
    var g = window.gsap;
    if (window.ScrollTrigger) g.registerPlugin(window.ScrollTrigger);

    g.from(['.dc-kicker', '.dc-title', '.dc-lede', '.dc-hero-actions'], {
      y: 14, opacity: 0, duration: 0.5, ease: 'power2.out', stagger: 0.07, clearProps: 'all'
    });

    if (window.ScrollTrigger) {
      window.ScrollTrigger.batch('.dc-parts-head, .dc-card, .dc-tile', {
        start: 'top 88%',
        once: true,
        onEnter: function (batch) {
          g.from(batch, { y: 16, opacity: 0, duration: 0.5, ease: 'power2.out', stagger: 0.08, clearProps: 'all' });
        }
      });

    }

    // Watchdog: if rAF is throttled (background tab, occluded window), frames
    // never advance and from() states would linger. Snap to the finished page.
    setTimeout(function () {
      if (g.ticker.frame < 30) {
        g.killTweensOf('*');
        if (window.ScrollTrigger) window.ScrollTrigger.getAll().forEach(function (t) { t.kill(); });
        g.set(['.dc-kicker', '.dc-title', '.dc-lede', '.dc-hero-actions', '.dc-parts-head', '.dc-card', '.dc-tile'], { clearProps: 'all' });
      }
    }, 2500);
  }
  // defer scripts execute in order, but GSAP arrives from a CDN — wait for load.
  if (document.readyState === 'complete') motion();
  else window.addEventListener('load', motion);
})();
