/* ============================================================================
   ACF DOCS COVER (Option B) — page-specific enhancement
   1) ⌘K search over pages, sections, and the glossary (search-index.json).
   2) GSAP load/scroll choreography. Start states are applied AT RUNTIME, so the
      page ships fully visible: JS-off, reduced-motion, or a blocked CDN all
      degrade to the complete static page. No dependencies beyond GSAP itself.
   ============================================================================ */
(function () {
  'use strict';

  /* ---- Search index --------------------------------------------------------
     Derived, not written here. Three hand-maintained arrays used to live at this
     spot and all three had gone stale: Parts stopped at Part 3, Sections stopped
     at Part 3, and every glossary hit resolved through a wave-to-route map that
     only knew waves 1-3, so a term from a later wave sent the reader to Part 1
     with nothing highlighted. Nothing errored — the links were simply wrong,
     which is the only failure mode a hand-written index has.

     scripts/build-search-index.mjs now generates search-index.json from the
     navigation registry, each page's own "on this page" list, and the glossary
     term file, and refuses to write a link it cannot resolve. It is also smaller
     than the term file this used to fetch, so the panel costs less than before. */
  var INDEX = { parts: [], sections: [], glossary: [] };
  var indexReady = false;

  var loading = fetch('/site-b/search-index.json')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d || !d.glossary) return;
      INDEX = d;
      indexReady = true;
    })
    .catch(function () {});

  // Show the shortcut this reader's keyboard actually has. userAgentData is the
  // supported way to ask; navigator.platform is deprecated but is still the only
  // answer in some engines, so it stays as the fallback rather than the source.
  function shortcutKey() {
    var ua = navigator.userAgentData;
    var apple = ua && ua.platform
      ? /mac/i.test(ua.platform)
      : /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || '');
    return apple ? '\u2318K' : 'Ctrl K';
  }

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
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Search the framework');

    input = document.createElement('input');
    input.className = 'dc-search-input';
    input.type = 'text';
    input.placeholder = '';   // set per mode in openPanel: the panel has two
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-expanded', 'true');
    input.setAttribute('aria-controls', 'dc-results');

    results = document.createElement('div');
    results.className = 'dc-search-results';
    results.id = 'dc-results';
    results.setAttribute('role', 'listbox');

    var foot = document.createElement('p');
    foot.className = 'dc-search-foot';
    foot.innerHTML = '<span><kbd>' + shortcutKey() + '</kbd>open</span>' +
                     '<span><kbd>\u2191</kbd><kbd>\u2193</kbd>move</span>' +
                     '<span><kbd>\u21b5</kbd>go</span>' +
                     '<span><kbd>esc</kbd>close</span>';

    panel.appendChild(input);
    panel.appendChild(results);
    panel.appendChild(foot);
    document.body.appendChild(backdrop);
    document.body.appendChild(panel);

    // Tab must not walk out of a modal dialog and into the page behind its own
    // backdrop. It did not matter much while one tile opened this; it matters now
    // that the panel is header chrome a keyboard reader will actually reach.
    panel.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var focusable = panel.querySelectorAll('input, a[href], button:not([disabled])');
      if (!focusable.length) return;
      var first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

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
      html = group('Glossary', INDEX.glossary, q, 20);
    } else {
      html = group('Pages', INDEX.parts, q, 4) + group('Sections', INDEX.sections, q, 6) + group('Glossary', INDEX.glossary, q, 6);
    }
    // "No matches" is a claim about the corpus. Before it arrives there is no
    // corpus to have missed, and saying so is the difference between a slow
    // search and a broken one.
    var fallback = indexReady
      ? '<p class="dc-sr-empty">No matches. Try a page, a section, or a framework term.</p>'
      : '<p class="dc-sr-empty">Loading the index\u2026</p>';
    results.innerHTML = html || fallback;
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
    // The panel opens in one of two modes and the placeholder used to promise the
    // wider one in both. Today only the Glossary tile opens it, so every reader
    // who saw "Search Parts, sections..." was being told about a corpus that
    // search was not going to look in.
    input.placeholder = glossaryOnly
      ? 'Search ' + INDEX.glossary.length + ' glossary terms\u2026'
      : 'Search pages, sections, and the glossary\u2026';
    lastFocus = document.activeElement;
    backdrop.hidden = false;
    panel.hidden = false;
    input.value = '';
    render('');
    input.focus();
    loading.then(function () { if (panel && !panel.hidden) render(input.value); });
  }

  function closePanel() {
    if (!panel || panel.hidden) return;
    panel.hidden = true;
    backdrop.hidden = true;
    glossaryOnly = false;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* ---- entry points ---------------------------------------------------------
     A pattern review had put search in persistent chrome "only at corpus scale",
     and deferred it until Parts 4-6 and the glossary page existed. They do: ten
     pages, 41 sections and 109 terms. Until now the only way in was the Glossary
     tile, in a mode that searched the glossary alone, so the pages and sections
     in the index were unreachable.

     The header trigger opens the full corpus. The Glossary tile keeps its own
     term-only mode, because arriving from that tile you are asking about a word,
     not about the book. */
  var navSearch = document.querySelector('[data-search-open]');
  if (navSearch) navSearch.addEventListener('click', function () { openPanel(false); });

  var hint = document.querySelector('[data-search-hint]');
  if (hint) hint.textContent = shortcutKey();
  // The header has no room for a visible legend, so a pointer reader gets the
  // shortcut on hover. The accessible name stays the aria-label, which a title
  // would otherwise quietly override.
  if (navSearch) navSearch.title = 'Search (' + shortcutKey() + ')';

  var glossTile = document.querySelector('[data-glossary-tile]');
  if (glossTile) {
    glossTile.addEventListener('click', function (e) {
      // Only swallow the navigation if the panel can actually answer. Before the
      // index loads — or if it never does — the tile stays what its href says it
      // is, a link to the glossary, instead of a click that does nothing.
      if (!indexReady) return;
      e.preventDefault();
      openPanel(true);
    });
  }
  function typingTarget(el) {
    if (!el) return false;
    if (el.isContentEditable) return true;
    var tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closePanel(); return; }
    if (panel && !panel.hidden) return;
    // Cmd/Ctrl-K is the shortcut the trigger advertises. "/" is the other one
    // readers try; it is only safe because it must never steal a keystroke from
    // someone typing, hence the guard.
    var k = (e.key || '').toLowerCase();
    if (k === 'k' && (e.metaKey || e.ctrlKey) && !e.altKey) { e.preventDefault(); openPanel(false); return; }
    if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !typingTarget(e.target)) {
      e.preventDefault();
      openPanel(false);
    }
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
