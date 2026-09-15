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

  /* ---- The share offer ------------------------------------------------------ *
   * The base rule offers the framework "free to read, free to share"; this makes
   * the second half true. It is the SAME ladder partActions() walks on the part
   * pages — native sheet, else clipboard, else nothing — so the site has one
   * share behaviour rather than two that drift apart.
   *
   * IT SHARES THE CANONICAL URL, NOT location.href. Every page here declares a
   * <link rel="canonical">, and on a preview deployment the two differ: a reader
   * sharing from a Vercel preview would otherwise hand someone a preview link.
   * This control was written to that rule while BACKLOG.md section 3 decision 4
   * was still open; the owner closed it on 2026-09-15 in favour of preferring the
   * canonical ALWAYS, and partActions() now follows the same rule. The invariant
   * over both is pinned in tests/control-reachability.test.mjs section 1b.
   *
   * The word never changes. "Free to read, free to copied" is not a sentence,
   * and a visible label that drifts from the accessible name breaks WCAG 2.5.3.
   * Success is carried by the icon, the mascot, and the live region instead. */
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
    var mark = document.querySelector('.foot-brand .brand-mark');
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
      unpleased = setTimeout(function () { mark.classList.remove('is-pleased'); }, 900);
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
   * IT IS NOT INSIDE motion(). That function returns early when GSAP has not
   * loaded, and whether the figure is alive must not depend on a vendored
   * animation library. Blink is CSS and needs no JS at all; gaze needs this, and
   * carries its own reduced-motion gate because a transform driven from JS is
   * the one place the mark could drift out of a stated preference — so the loop
   * simply never starts.
   *
   * The observer does double duty: it starts the blink cycle when the reader
   * actually reaches the colophon (rather than leaving the figure blinking to an
   * empty room five screens below the fold), and it runs the gaze loop ONLY
   * while the footer is on screen. */
  function mascot() {
    var brand = document.querySelector('.foot-brand');
    var mark = brand && brand.querySelector('.brand-mark');
    if (!mark) return;

    var still = true;
    if (window.matchMedia) {
      // `any-hover`, never `hover`. The bare form asks about the PRIMARY pointer,
      // so a 2-in-1 or a touchscreen laptop reports `hover: none` while its owner
      // is driving a mouse, and the gaze would silently never run for them.
      still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        || !window.matchMedia('(any-hover: hover)').matches;
    }

    var LERP = 0.09, REACH = 0.42;
    var targetX = 0, targetY = 0, currentX = 0, currentY = 0, frame = null, onScreen = false;

    function onMove(e) {
      // The rAF loop was gated on onScreen but this was not, so a rect read — a
      // forced synchronous layout — ran on EVERY pointer move anywhere on the
      // page, for a figure five screens below the fold. The gate belongs here.
      if (!onScreen) return;
      var r = mark.getBoundingClientRect();
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      targetX = Math.max(-1, Math.min(1, (e.clientX - cx) / (window.innerWidth * REACH)));
      targetY = Math.max(-1, Math.min(1, (e.clientY - cy) / (window.innerHeight * REACH)));
    }
    function step() {
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

    function arrive(seen) {
      onScreen = seen;
      // Symmetrical, which the first version was not: it added the class and
      // never took it back, so the 12s cycle went on running once the reader had
      // scrolled away. The reason for waking on arrival — not blinking to an
      // empty room — is the same reason for sleeping on departure.
      mark.classList.toggle('is-awake', seen);
      if (seen) start(); else stop();
    }

    if (window.IntersectionObserver) {
      var io = new IntersectionObserver(function (entries) {
        arrive(entries.some(function (en) { return en.isIntersecting; }));
      }, { threshold: 0.35 });
      io.observe(brand);
    } else {
      arrive(true);
    }

    if (!still) {
      document.addEventListener('mousemove', onMove, { passive: true });
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

      /* The page lands on the curve it opened with: the footer's signature draws
         itself once as the colophon arrives. Inside this function's
         reduced-motion and no-GSAP guards, so the static footer — already a
         finished curve — is what every other reader gets. The mascot is
         deliberately NOT here: see mascot() below. */
      var sig = document.querySelector('.foot-sig-curve');
      if (sig) {
        g.fromTo(sig, { strokeDashoffset: 1 }, {
          strokeDashoffset: 0, duration: 1.2, ease: 'power2.out',
          scrollTrigger: { trigger: '.site-footer', start: 'top 92%', once: true }
        });
      }
    }

    // Watchdog: if rAF is throttled (background tab, occluded window), frames
    // never advance and from() states would linger. Snap to the finished page.
    setTimeout(function () {
      if (g.ticker.frame < 30) {
        g.killTweensOf('*');
        if (window.ScrollTrigger) window.ScrollTrigger.getAll().forEach(function (t) { t.kill(); });
        g.set(['.dc-kicker', '.dc-title', '.dc-lede', '.dc-hero-actions', '.dc-parts-head', '.dc-card', '.dc-tile', '.foot-sig-curve'], { clearProps: 'all' });
      }
    }, 2500);
  }
  // defer scripts execute in order, but GSAP arrives from a CDN — wait for load.
  if (document.readyState === 'complete') motion();
  else window.addEventListener('load', motion);
})();
