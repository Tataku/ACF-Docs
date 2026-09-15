/* ============================================================================
   ACF READING SYSTEM — progressive enhancement
   Every enhancement is feature-detected and guarded: a missing DOM node is a
   no-op, so both the cover and the Part pages remain fully functional and
   navigable with this script absent. No dependencies, no build step.
   ============================================================================ */
(function () {
  'use strict';

  var root = document.documentElement;

  // Set by partActions() once its narration engine is built; read by
  // narrationDock() to drive that single engine from the floating-nav rail.
  var NARRATION = null;

  /* ---- Theme toggle (shared by cover + Part pages) ----------------------- *
   * The pre-paint <head> script sets data-theme; this only handles the click.
   *
   * The switch lands inside a View Transition when the browser offers one:
   * the page is snapshotted, the attribute flips, and the two snapshots
   * crossfade as ONE composited animation (timed in reading-system.css under
   * `html.theme-crossfade`). Every surface — paper, ink, rules, the hero
   * field canvas, chart SVG — changes at the same rate, which an attribute
   * swap alone (the previous behaviour: an instant hard cut) and a
   * per-property CSS transition (which eases colours and lets gradients,
   * SVG and canvas snap) both fail to do. Reduced-motion users, and browsers
   * without the API, get the plain swap: a clean cut rather than a partial
   * animation. */
  function theme() {
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    function sync() {
      var dark = root.getAttribute('data-theme') === 'dark';
      btn.setAttribute('aria-pressed', String(dark));
      btn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    }
    function commit(next) {
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('acf-theme', next); } catch (e) {}
      sync();
    }
    sync();
    btn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      var canFade = typeof document.startViewTransition === 'function'
        && !(reduceMotion && reduceMotion.matches);
      if (!canFade) { commit(next); return; }
      root.classList.add('theme-crossfade');
      var settle = function () { root.classList.remove('theme-crossfade'); };
      try {
        var transition = document.startViewTransition(function () { commit(next); });
        transition.finished.then(settle, settle);
      } catch (e) {
        settle();
        commit(next);
      }
    });
  }

  /* ---- Scroll-spy: highlight the in-view section in the sidebar TOC ------- */
  function scrollSpy() {
    var spy = document.querySelector('[data-spy]');
    if (!spy || !('IntersectionObserver' in window)) return;
    var links = Array.prototype.slice.call(spy.querySelectorAll('a[href^="#"]'));
    if (!links.length) return;

    var byId = {};
    links.forEach(function (a) {
      var sec = document.getElementById(a.getAttribute('href').slice(1));
      if (sec) byId[sec.id] = a;
    });

    var current = null;
    function setCurrent(a) {
      if (current === a) return;
      links.forEach(function (l) { l.removeAttribute('aria-current'); });
      if (a) a.setAttribute('aria-current', 'true');
      current = a;
    }

    var visible = {};
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { visible[en.target.id] = en.isIntersecting; });
      var ids = Object.keys(byId).filter(function (id) { return visible[id]; });
      if (!ids.length) return;
      ids.sort(function (a, b) {
        return document.getElementById(a).getBoundingClientRect().top -
               document.getElementById(b).getBoundingClientRect().top;
      });
      setCurrent(byId[ids[0]]);
    }, { rootMargin: '-12% 0px -68% 0px', threshold: 0 });

    Object.keys(byId).forEach(function (id) { obs.observe(document.getElementById(id)); });
  }

  /* ---- Mobile drawer: off-canvas Part-page sidebar ----------------------- */
  function drawer() {
    var toggle = document.querySelector('.drawer-toggle');
    var sidebar = document.getElementById('sidebar');
    if (!toggle || !sidebar) return;
    var backdrop = document.querySelector('.drawer-backdrop');

    function onKey(e) { if (e.key === 'Escape') close(); }
    var hideTimer = 0;
    function open() {
      sidebar.setAttribute('data-open', '');
      toggle.setAttribute('aria-expanded', 'true');
      document.documentElement.classList.add('drawer-lock');   // page holds still behind the drawer
      if (backdrop) {
        clearTimeout(hideTimer);
        backdrop.hidden = false;
        // arm the fade a frame AFTER unhiding so the opacity transition runs
        // (the late-mount lesson: state must change on a painted element)
        requestAnimationFrame(function () { requestAnimationFrame(function () { backdrop.setAttribute('data-show', ''); }); });
      }
      var first = sidebar.querySelector('a, button');
      if (first) first.focus();
      document.addEventListener('keydown', onKey);
    }
    function close() {
      sidebar.removeAttribute('data-open');
      toggle.setAttribute('aria-expanded', 'false');
      document.documentElement.classList.remove('drawer-lock');
      if (backdrop) {
        backdrop.removeAttribute('data-show');                 // fade out with the slide…
        clearTimeout(hideTimer);
        hideTimer = setTimeout(function () { backdrop.hidden = true; }, 360);  // …then release the layer
      }
      document.removeEventListener('keydown', onKey);
      toggle.focus();
    }
    toggle.addEventListener('click', function () {
      if (sidebar.hasAttribute('data-open')) close(); else open();
    });
    if (backdrop) backdrop.addEventListener('click', close);
  }

  /* ---- Progress: mark a part read, then paint cover state ---------------- */
  var STORE = 'acf-progress';
  function readProgress() {
    try { return JSON.parse(localStorage.getItem(STORE) || '{}'); } catch (e) { return {}; }
  }
  function progressWrite() {
    var sentinel = document.querySelector('[data-progress-sentinel]');
    if (!sentinel || !('IntersectionObserver' in window)) return;
    var part = sentinel.getAttribute('data-part');
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var p = readProgress();
        p[part] = true;
        try { localStorage.setItem(STORE, JSON.stringify(p)); } catch (e) {}
        obs.disconnect();
      });
    }, { threshold: 0 });
    obs.observe(sentinel);
  }
  function progressPaint() {
    var rows = document.querySelectorAll('[data-part]');
    if (!rows.length) return;
    var p = readProgress();
    var firstUnread = null;
    var anyRead = false;
    rows.forEach(function (row) {
      if (p[row.getAttribute('data-part')]) { row.setAttribute('data-read', ''); anyRead = true; }
      else if (!firstUnread) firstUnread = row;                 // rows are in reading order
    });

    footDial(rows, firstUnread);

    /* Resume: go where the reader actually stopped.
       This link used to be a static href to Part 1 — the same destination as the
       primary button beside it — so a reader returning mid-book was sent back to
       the start, on a page that was ALREADY marking the parts they had finished
       two elements away. The data was loaded; only this control ignored it.
       It ships hidden and earns its place: shown only when there IS a next
       unfinished part, so a first-time visitor is never offered a "resume" for a
       book they have not begun, and a reader who has finished all six is not
       offered one either. With JS off there is no stored progress, so it stays
       hidden, which is the honest state rather than a broken promise. */
    var resume = document.querySelector('[data-resume]');
    if (!resume) return;
    var href = firstUnread && firstUnread.getAttribute('href');
    if (!anyRead || !firstUnread || !href) { resume.hidden = true; return; }
    resume.setAttribute('href', href);
    var label = resume.querySelector('[data-resume-label]');
    if (label) label.textContent = 'Resume \u00b7 Part ' + firstUnread.getAttribute('data-part');
    resume.hidden = false;
  }

  /* The cover footer's reading dial — the same progress, stated once more at the
     foot of the page, where a reader who has just scrolled the whole cover is
     deciding whether to start or to carry on.

     IT IS PAINTED FROM THE ROWS, not from a second read of the store. A footer
     that re-derived progress could disagree with the cards two screens above it,
     and nothing on the page would tell a reader which of the two was lying —
     the same class of split-source bug the resume link above was written to fix.
     Whenever the dial cannot be trusted to say something true — no dial on this
     page, a strip that does not match the book, or nothing read yet — it is left
     exactly as authored, and the markup's first-visit copy stands. */
  function footDial(rows, firstUnread) {
    var dial = document.querySelector('[data-foot-progress]');
    if (!dial) return;
    var arcs = dial.querySelectorAll('[data-foot-arc]');
    if (arcs.length !== rows.length) return;

    /* Minutes, not parts. Every card states its own reading time, so the book's
       shape is already on the page: Part 5 is a quarter of it and Part 2 an
       eighth, and a count of six equal ticks says neither. The numbers are READ
       BACK OFF THE CARDS rather than restated here — a second copy is a second
       thing to drift, and sync-counts already owns the first. */
    var minutes = [], total = 0, done = 0, read = 0;
    rows.forEach(function (row, i) {
      var m = (row.textContent.match(/(\d+)\s*min read/) || [, 0])[1];
      minutes[i] = Number(m) || 0;
      total += minutes[i];
      if (!row.hasAttribute('data-read')) return;
      arcs[i].setAttribute('data-read', '');
      done += minutes[i];
      read += 1;
    });
    if (!read) return;                       // first visit: the authored copy stands

    var count = dial.querySelector('[data-foot-count]');
    if (count) count.textContent = read + ' of ' + rows.length + ' parts read';

    /* What is LEFT is the number a reader actually wants at the foot of the
       page, and it is only truthful once there is progress to subtract. */
    var meta = dial.querySelector('[data-foot-meta]');
    if (meta && total) {
      meta.textContent = read === rows.length
        ? '\u2248 ' + total + ' min, start to finish'
        : '\u2248 ' + (total - done) + ' min left';
    }

    var go = dial.querySelector('[data-foot-resume]');
    var label = go && go.querySelector('[data-foot-resume-label]');
    if (!go || !label) return;

    var next = firstUnread && firstUnread.getAttribute('href');
    if (next) {
      go.setAttribute('href', next);
      label.textContent = 'Resume \u00b7 Part ' + firstUnread.getAttribute('data-part');
      return;
    }
    // Every part read. The control stops pretending to be a bookmark and becomes
    // the only offer left that is still true.
    var first = rows[0].getAttribute('href');
    if (!first) return;
    go.setAttribute('href', first);
    label.textContent = 'Read it again';
  }

  /* The map and the curve are one instrument -----------------------------------
   * Pointing at a Part in the footer's list lights its arc on the curve; pointing
   * at an arc lights the Part in the list, and the dial's meta line states that
   * Part's own reading time. Nothing here is a control: the six links were
   * already the controls, and this only makes what they refer to visible. So it
   * rides :focus-visible as well as hover — a keyboard reader tabbing the map
   * gets the same reading — and the curve's arcs stay aria-hidden, because a
   * screen reader is served by the link text, not by a highlight.
   */
  function footPeek() {
    var dial = document.querySelector('[data-foot-progress]');
    var footer = document.querySelector('.site-footer');
    if (!dial || !footer) return;
    var links = footer.querySelectorAll('[data-foot-part-link]');
    var arcs = dial.querySelectorAll('[data-foot-arc]');
    var meta = dial.querySelector('[data-foot-meta]');
    if (!links.length || arcs.length !== links.length) return;
    // The line this returns to. Captured now, AFTER footDial has had its say, so
    // a peek can never strand the dial showing one Part's time as if it were the
    // whole book's.
    var rest = meta ? meta.textContent : '';

    function find(list, attr, n) {
      for (var i = 0; i < list.length; i += 1) {
        if (list[i].getAttribute(attr) === n) return list[i];
      }
      return null;
    }
    function peek(n) {
      var link = find(links, 'data-foot-part-link', n);
      var arc = find(arcs, 'data-foot-arc', n);
      if (link) link.setAttribute('data-peek', '');
      if (arc) arc.setAttribute('data-peek', '');
      if (!meta || !arc) return;
      // The arc already carries the minutes sync-counts wrote onto it, so the
      // hover reads the same number the geometry is drawn from.
      var mins = arc.style.getPropertyValue('--arc-len').trim();
      if (!mins) return;
      meta.textContent = 'Part ' + n + ' \u00b7 \u2248 ' + mins + ' min'
        + (arc.hasAttribute('data-read') ? ' \u00b7 read' : '');
      meta.setAttribute('data-peek', '');
    }
    function clear() {
      var i;
      for (i = 0; i < links.length; i += 1) links[i].removeAttribute('data-peek');
      for (i = 0; i < arcs.length; i += 1) arcs[i].removeAttribute('data-peek');
      if (!meta) return;
      meta.removeAttribute('data-peek');
      meta.textContent = rest;
    }

    function wire(el, n) {
      el.addEventListener('mouseenter', function () { peek(n); });
      el.addEventListener('mouseleave', clear);
      el.addEventListener('focus', function () { peek(n); });
      el.addEventListener('blur', clear);
    }
    var k;
    for (k = 0; k < links.length; k += 1) wire(links[k], links[k].getAttribute('data-foot-part-link'));
    for (k = 0; k < arcs.length; k += 1) wire(arcs[k], arcs[k].getAttribute('data-foot-arc'));
  }
  /* ---- Sidebar collapse/expand (desktop), persisted ---------------------- */
  function sidebarCollapse() {
    var btn = document.querySelector('.sidebar-toggle');
    var shell = document.querySelector('.shell');
    if (!btn || !shell) return;
    var KEY = 'acf-sidebar';
    function apply(collapsed) {
      if (collapsed) shell.setAttribute('data-sidebar', 'collapsed');
      else shell.removeAttribute('data-sidebar');
      btn.setAttribute('aria-pressed', String(collapsed));
      btn.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
    }
    var stored = null;
    try { stored = localStorage.getItem(KEY); } catch (e) {}
    apply(stored === 'collapsed');
    btn.addEventListener('click', function () {
      var next = shell.getAttribute('data-sidebar') !== 'collapsed';
      apply(next);
      try { localStorage.setItem(KEY, next ? 'collapsed' : 'expanded'); } catch (e) {}
    });
  }

  /* ---- Floating reading nav — reveal on scroll, tuck away when idle ------- */
  function floatNav() {
    var nav = document.querySelector('.floatnav');
    if (!nav) return;
    nav.hidden = false;
    var threshold = 600, idle;
    function hideSoon() {
      clearTimeout(idle);
      idle = setTimeout(function () {
        if (nav.hasAttribute('data-pinned')) return;            // narration playing: keep transport visible
        if (!nav.matches(':hover') && !nav.contains(document.activeElement)) {
          nav.removeAttribute('data-visible');
        }
      }, 3200);
    }
    function onScroll() {
      if (nav.hasAttribute('data-pinned') || window.scrollY > threshold) {
        nav.setAttribute('data-visible', ''); hideSoon();
      } else { nav.removeAttribute('data-visible'); clearTimeout(idle); }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    nav.addEventListener('mouseenter', function () { clearTimeout(idle); });
    nav.addEventListener('mouseleave', hideSoon);
    nav.addEventListener('focusin', function () { clearTimeout(idle); });
    nav.addEventListener('focusout', hideSoon);

    // Return-to-top: smooth unless the reader prefers reduced motion.
    var toTop = nav.querySelector('.floatnav-top');
    if (toTop) toTop.addEventListener('click', function () {
      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, left: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
  }

  /* ---- Section reveal: fade + rise each [data-reveal] as it scrolls in ---- *
   * Adds `.is-in` once a section enters view. The CSS hides [data-reveal] only
   * when <html class="js"> AND motion is allowed, so JS-off / reduced-motion
   * readers see everything immediately. The signature chart keys its grow-in off
   * `.signature.is-in`, so the chart animates on the same trigger.               */
  function sectionReveal() {
    var els = document.querySelectorAll('[data-reveal]');
    if (!els.length) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); obs.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    els.forEach(function (el) { obs.observe(el); });
  }

  /* ---- Hamburger fade-on-scroll: the floating toggle yields while reading - *
   * Ports the ACF Dashboard AppShell mobile pattern: while the page is
   * actually scrolling the fixed toggle fades to a ghost (and stops eating
   * taps); ~600ms after the last scroll tick it softly re-enters. The button
   * never unmounts and keyboard focus always restores it, so accessibility
   * is untouched. Never fades while the drawer is open.                       */
  function hamburgerFade() {
    var toggle = document.querySelector('.drawer-toggle');
    if (!toggle) return;
    var restoreTimer = null;
    var lastY = window.pageYOffset;
    function onScroll() {
      var y = window.pageYOffset;
      var dy = y - lastY;
      lastY = y;
      if (toggle.getAttribute('aria-expanded') === 'true') return;   // drawer open — stay solid
      if (Math.abs(dy) > 1) toggle.classList.add('is-faded');        // filter spurious ticks
      if (restoreTimer) clearTimeout(restoreTimer);
      restoreTimer = setTimeout(function () {
        toggle.classList.remove('is-faded');
        restoreTimer = null;
      }, 600);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    // opening the drawer always restores the button immediately
    toggle.addEventListener('click', function () { toggle.classList.remove('is-faded'); });
  }

  /* ---- Quote-highlight system: light each .hl phrase as it scrolls into view *
   * The CSS hides the green-bold + underline behind <html class="js"> + motion,
   * so JS-off / reduced-motion readers get the emphasis immediately.            */
  function highlights() {
    var els = document.querySelectorAll('.hl');
    if (!els.length) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('lit'); });
      return;
    }
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('lit'); obs.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -15% 0px', threshold: 0.5 });
    els.forEach(function (el) { obs.observe(el); });
  }

  /* ---- Stepper progress: grow each list's rail fill + flag read/active/ahead *
   * For every [data-stepper] list, a passive rAF-throttled scroll handler finds
   * the step at the reading focus (~42% viewport), marks earlier steps read,
   * later steps ahead (dimmed), and sets --fill-h so the accent rail fills to
   * the focus. Reduced-motion bails entirely — the CSS base state is all-lit
   * with a static rail, so nothing is required for those readers.               */
  function stepperProgress() {
    var lists = document.querySelectorAll('[data-stepper]');
    if (!lists.length) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    var groups = Array.prototype.slice.call(lists).map(function (list) {
      var steps = Array.prototype.slice.call(list.children).filter(function (n) {
        return n.tagName === 'LI';
      });
      return { list: list, steps: steps };
    });

    function update() {
      var focus = window.innerHeight * 0.42;
      groups.forEach(function (g) {
        var rect = g.list.getBoundingClientRect();
        var active = -1;
        g.steps.forEach(function (s, i) {
          if (s.getBoundingClientRect().top <= focus) active = i;
        });
        g.steps.forEach(function (s, i) {
          s.classList.remove('is-read', 'is-active', 'is-ahead');
          if (i < active) s.classList.add('is-read');
          else if (i === active) s.classList.add('is-active');
          else s.classList.add('is-ahead');
        });
        var h = Math.max(0, Math.min(rect.height, focus - rect.top));
        g.list.style.setProperty('--fill-h', h + 'px');
      });
    }

    var ticking = false;
    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(function () { update(); ticking = false; });
        ticking = true;
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  }

  /* ---- Part action bar: Share + Listen --------------------------------------- *
   * Listen plays AI narration (OpenAI TTS via /api/narration) when a provider key
   * is configured, and falls back to the browser's Web Speech voice otherwise.
   * Audio is generated on click only (never on load), one stream at a time.
   * Feature-detected: a no-op when .part-actions is absent (cover + future pages). */
  function partActions() {
    var bar = document.querySelector('.part-actions');
    if (!bar) return;

    var url = location.href; // canonical part URL
    var title = (document.title.split('·')[0] || '').trim() || 'The Adaptive Convexity Framework';
    var status = bar.querySelector('.part-actions-status');
    function announce(msg) { if (status) status.textContent = msg; }

    // Upgrade share links with the live URL
    var x = bar.querySelector('[data-share="x"]');
    if (x) x.href = 'https://x.com/intent/post?text=' + encodeURIComponent(title) + '&url=' + encodeURIComponent(url);
    var mail = bar.querySelector('[data-share="email"]');
    if (mail) mail.href = 'mailto:?subject=' + encodeURIComponent(title) + '&body=' + encodeURIComponent(url);

    // Copy link
    var copyBtn = bar.querySelector('[data-copy-link]');
    var copyLabel = bar.querySelector('[data-copy-label]');
    if (copyBtn && navigator.clipboard) {
      copyBtn.addEventListener('click', function () {
        navigator.clipboard.writeText(url).then(function () {
          if (copyLabel) { var t = copyLabel.textContent; copyLabel.textContent = 'Copied'; setTimeout(function () { copyLabel.textContent = t; }, 2000); }
          announce('Link copied');
        }).catch(function () { announce('Copy failed'); });
      });
    }

    // Native share sheet on supported devices (SMS, email, X, etc. without icon clutter)
    var share = bar.querySelector('.part-share');
    var nativeBtn = bar.querySelector('[data-share-native]');
    if (navigator.share && share && nativeBtn) {
      share.classList.add('has-native');
      nativeBtn.hidden = false;
      nativeBtn.addEventListener('click', function () {
        navigator.share({ title: title, url: url }).catch(function () {});
      });
    }

    // Listen — AI narration (OpenAI TTS) with a Web Speech fallback. The whole
    // upgrade lives here in JS + CSS, so the Part HTML files stay untouched and
    // the change is fully reversible (delete /api/narration -> Web Speech only).
    var listenBtn = bar.querySelector('[data-listen]');
    var listenLabel = bar.querySelector('[data-listen-label]');
    if (listenBtn) {
      var synth = window.speechSynthesis || null;

      // --- startup instrumentation (quiet; behind a debug flag) ---------------
      // Enable via window.ACF_NARRATION_DEBUG = true or localStorage
      // 'acf-narration-debug' = '1'. Marks the click → request → first-audio →
      // playback chain so startup delay is measurable; silent in production.
      var NDEBUG = false;
      try { NDEBUG = (window.ACF_NARRATION_DEBUG === true) || (window.localStorage && localStorage.getItem('acf-narration-debug') === '1'); } catch (e) {}
      var markT0 = 0;
      function mark(label, extra) {
        if (!NDEBUG) return;
        var t = window.performance ? performance.now() : Date.now();
        try { console.debug('[narration] ' + label + (markT0 ? ' +' + Math.round(t - markT0) + 'ms' : '') + (extra != null ? ' · ' + extra : '')); } catch (e) {}
      }
      var SLOW_FALLBACK_MS = 8000;   // if the API hasn't produced first audio by now, fall back to Web Speech (non-sticky; prewarm usually makes this moot)
      var loadTimer = 0;             // the slow-API safety-net timer (cleared on success / stop)

      // --- which voice are we actually hearing? ------------------------------
      // The premium voice can vanish for reasons no reader can see (key removed,
      // model or voice mistyped, origin gate refusing) and every one of them
      // arrives as the same robotic Web Speech fallback. `data-narration-voice`
      // records the truth on the transport, and the reason is warned ONCE so it
      // is recoverable from a console without a debug flag.
      var warnedVoice = false;
      var voiceInfo = null;      // { model, voice, instructions, configWarning } once the API has answered
      function warnVoice(reason) {
        if (warnedVoice) return;
        warnedVoice = true;
        try { console.warn('[narration] premium voice unavailable — using the browser voice · ' + reason); } catch (e) {}
      }
      function setVoiceKind(kind, reason) {
        bar.setAttribute('data-narration-voice', kind);
        if (kind === 'premium' && voiceInfo && voiceInfo.model) {
          bar.setAttribute('data-narration-model', voiceInfo.model);
        }
        if (kind === 'browser' && reason) warnVoice(reason);
      }

      // --- floatnav scrubber: estimated progress clock ------------------------
      // partActions owns the engine; narrationDock() is pure UI that drives it via
      // the NARRATION controller exposed at the end. Progress is a wall-clock
      // estimate (~chars/sec) that runs while STATE==='playing' and re-syncs on
      // seek — one model across both the API (segment) and Web Speech (block)
      // engines, neither of which has a single seekable timeline.
      function nowSec() { return (window.performance ? performance.now() : Date.now()) / 1000; }
      function estDur(t) { return Math.max(1.4, (t ? t.length : 0) / 14.5); }
      var clkBase = 0, clkStart = 0, clkRunning = false, progRaf = 0, onTick = null;
      function units() { return method === 'api' ? buildSegments() : buildBlocks(); }
      function aggDur() { var u = units(), t = 0, i; for (i = 0; i < u.length; i++) t += estDur(u[i]); return t; }
      function clkNow() { return clkRunning ? clkBase + (nowSec() - clkStart) : clkBase; }
      function progressLoop() { if (onTick) onTick(); if (STATE === 'playing') progRaf = requestAnimationFrame(progressLoop); }

      // --- readable text -----------------------------------------------------
      var blocks = null;
      // Normalize a few tokens that read awkwardly aloud — applied ONLY to the
      // narration text (TTS + Web Speech), never to the visible page. Conservative:
      // unambiguous cases only (named ratio, scores, N-times multipliers, ampersand).
      function speakNorm(t) {
        return t
          .replace(/\s*[··•]\s*/g, ', ')            // "Investor A · 100% Bitcoin" → a comma, not silence
          .replace(/(\d)\s*[–—]\s*(\d)/g, '$1 to $2') // "8–10%", "10–100x", "30–60 year" → spoken ranges
          .replace(/~\s*(?=[\d$])/g, 'approximately ')        // "~3.26 BTC" → "approximately 3.26 BTC"
          .replace(/\b60\s*\/\s*40\b/g, 'sixty-forty')        // "the 60/40 portfolio" → not "sixty slash forty"
          .replace(/\b(\d{1,2}(?:\.\d)?)\s*\/\s*(\d{1,2})\b/g, '$1 out of $2') // scores: 8/10, 10/10, 5.5/10
          .replace(/(\d)\s*[x×]\b/g, '$1 times')         // 6x / 10x / 100x → "… times", not "ex"
          .replace(/(\S)\s+\/\s+(\S)/g, '$1, $2')          // "3.26 BTC / $326,000" → a pause, never "slash"
          .replace(/\s*&\s*/g, ' and ')                       // "S&P" → "S and P"

          .replace(/\u21b3/g, ' ')                            // never speak a UI arrow
          .replace(/\s{2,}/g, ' ')
          .trim();
      }
      function speakLine(t) { return speakNorm(speakAcronyms(t)); }

      // How the book's acronyms should SOUND. What each one MEANS is not decided
      // here — `acf-glossary.json` is the authority, and the narration test reads
      // it to check every entry below and to fail on a glossary acronym nothing
      // handles. Letter-by-letter was a guess, and a wrong one: "R O C" for a term
      // the glossary defines as "Return of capital" is strictly worse than saying
      // the words.
      //
      // Two classes, which is what a human narrator actually does:
      //   EXPAND    — short, natural phrases nobody spells out loud.
      //   INTRODUCE — the book's own terms of art: expanded on FIRST use, short
      //               after. CIS appears 122 times and FIS 52, so expanding every
      //               one is exhausting; but leaving both as bare letters makes two
      //               DIFFERENT scores (one per-position, one per-portfolio) sound
      //               nearly identical, which is a comprehension failure, not a
      //               style one.
      var SPOKEN_ACRONYMS = [
        { find: /\bROC-(?=\w)/g,  say: 'return-of-capital ' },   // "ROC-characterized"
        { find: /\bROC\b/g,        say: 'return of capital' },
        { find: /\bTAM\b/g,        say: 'total addressable market' },
        { find: /\bDCA\b/g,        say: 'dollar-cost averaging' },
        { find: /\bNIIT\b/g,       say: 'net investment income tax' },
        { find: /\bRMDs\b/g,       say: 'required minimum distributions' },
        { find: /\bRMD\b/g,        say: 'required minimum distribution' },
        // present in the glossary as aliases but not (yet) in the book's prose —
        // forward cover, each taken from the entry's own sibling alias
        { find: /\bLTCG\b/g,       say: 'long-term capital gains' },
        { find: /\bTLH\b/g,        say: 'tax-loss harvesting' },
        { find: /\bSBLOC\b/g,      say: 'securities-backed lending' },
        { find: /\bCIS\b/g, say: 'C I S', first: 'Convexity Integrity Score, or C I S',
          full: /\bConvexity Integrity Score\b/ },
        { find: /\bFIS\b/g, say: 'F I S', first: 'Framework Integrity Score, or F I S',
          full: /\bFramework Integrity Score\b/ }
      ];
      // Reset per page build, so "first use" means first in reading order.
      var acronymSeen = null;
      function speakAcronyms(t) {
        for (var i = 0; i < SPOKEN_ACRONYMS.length; i++) {
          var a = SPOKEN_ACRONYMS[i];
          a.find.lastIndex = 0;
          if (!a.first) { t = t.replace(a.find, a.say); continue; }
          // The book often spells the term out in its own prose first. When it
          // does, that IS the introduction — saying it again a sentence later is
          // the repetition this pass exists to remove.
          if (acronymSeen && a.full && a.full.test(t)) acronymSeen[a.say] = 1;
          t = t.replace(a.find, function (m, offset, str) {
            if (acronymSeen && !acronymSeen[a.say]) {
              acronymSeen[a.say] = 1;
              // "…, or C I S" opens a parenthetical; close it when the sentence
              // continues, so the narrator takes a breath in the right place
              // instead of running "or C I S quantifies" together.
              var after = String(str).slice(offset + m.length);
              return a.first + (/^\s+[A-Za-z]/.test(after) ? ',' : '');
            }
            return a.say;
          });
        }
        return t;
      }

      // ---------------------------------------------------------------------
      // Humanised block narration
      // ---------------------------------------------------------------------
      // The old extractor was three selectors — `.section-title`, `.prose-lead`,
      // `.prose p` — which reads 55% of the book and silently drops the rest:
      // every bullet list, every numbered requirement, every pull quote, every
      // side-by-side example card, and every paragraph that happens to sit in a
      // `.measure` without the `prose` class. A listener therefore heard the
      // ANALYSIS of the two investors without ever being told who they were.
      //
      // So narration is a per-block decision, not one selector. Each entry below
      // names a structure and how it should SOUND, because structure that the eye
      // reads (a label above bullets, an A-card beside a B-card, 01/02/03 down a
      // rail) carries meaning that verbatim text loses the moment it is spoken.
      //
      // NARRATION_BLOCKS is the coverage contract, and it is the SINGLE source of
      // truth: `scripts/audit-narration-coverage.mjs` parses this array out of
      // this file rather than restating it, so the audit cannot drift from the
      // runtime and new content that no rule claims shows up as a measured gap.
      // Order matters — earlier entries claim their subtree, so a container is
      // spoken as one coherent unit and its children are not re-read loose.
      var NARRATION_BLOCKS = [
        { sel: '.posture-hero',         kind: 'aria' },     // author wrote the spoken form by hand; use it
        { sel: 'figure.exhibit',        kind: 'exhibit' },  // chart caption; the SVG itself is unspeakable
        { sel: '.failure-modes',        kind: 'sidebyside' },// A-vs-B cards: needs a glide between them
        { sel: '.posture-card',         kind: 'card' },
        { sel: 'aside.callout',         kind: 'callout' },  // label + bullets
        { sel: 'ol.architecture-list',  kind: 'steps' },    // 01/02/03 → ordinals
        { sel: 'blockquote.pull-quote', kind: 'quote' },
        { sel: '.next-up-card',         kind: 'nextup' },
        { sel: '.compare table',        kind: 'table' },    // summarised, never cell-by-cell
        { sel: 'h2.section-title',      kind: 'heading' },
        { sel: 'h3.sub-title',          kind: 'heading' },
        { sel: 'p.section-eyebrow',     kind: 'heading' },
        { sel: 'p.prose-lead',          kind: 'para' },
        { sel: 'p',                     kind: 'para' },     // fallback: any unclaimed paragraph
        { sel: 'li',                    kind: 'para' }      // fallback: any unclaimed list item
      ];

      // Deliberately NOT spoken. "Skipped" must be a decision with a reason, not
      // an accident of the selector — a glyph legend read aloud is noise, and the
      // exhibit's own index/mode chips are already carried by the exhibit handler.
      var NARRATION_MUTE = '.compare-key, .ex-idx, .ex-mode, .ex-src, .gloss-panel, .fc-legend, figcaption, .sidebar-nav, .on-this-page, .site-footer';

      // A leading ↳ marks a chart's concept chip — a jump affordance for the eye.
      var UI_GLYPH = /^\s*\u21b3/;

      var ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth',
                      'seventh', 'eighth', 'ninth', 'tenth'];

      // textContent concatenates across block boundaries, so <p>Dual custody</p>
      // <p>holdable in…</p> comes back as "Dual custodyholdable in…". Re-insert
      // the boundary the markup implies.
      var BLOCKISH = /^(P|DIV|LI|UL|OL|H1|H2|H3|H4|H5|SECTION|ASIDE|FIGURE|FIGCAPTION|BLOCKQUOTE|TABLE|THEAD|TBODY|TFOOT|TR|TD|TH|BR|HEADER|FOOTER)$/;
      function raw(el) {
        if (!el) return '';
        var out = '', i, n;
        for (i = 0; i < el.childNodes.length; i++) {
          n = el.childNodes[i];
          if (n.nodeType === 3) out += n.nodeValue;
          else if (n.nodeType === 1) {
            if (n.matches && n.matches(NARRATION_MUTE)) continue;
            if (UI_GLYPH.test(n.textContent || '')) continue;   // chart concept chip: visual affordance, not prose
            out += BLOCKISH.test(n.tagName) ? ' ' + raw(n) + ' ' : raw(n);
          }
        }
        return out.replace(/\s+/g, ' ').trim();
      }
      function one(el, sel) { var n = el.querySelector(sel); return n ? raw(n) : ''; }
      function kids(el, sel) {
        var out = [], list = el.querySelectorAll(sel), i;
        for (i = 0; i < list.length; i++) out.push(list[i]);
        return out;
      }
      // "Accumulate only. Bitcoin is never sold" reads as two unrelated sentences.
      // The bold run is a LABEL for what follows, so give it a label's punctuation.
      function labelled(el, leadSel) {
        var lead = el.querySelector(leadSel);
        if (!lead) return raw(el);
        var head = raw(lead).replace(/[.:—\s]+$/, '');
        var full = raw(el), tail = full;
        if (full.indexOf(raw(lead)) === 0) tail = full.slice(raw(lead).length).trim();
        tail = tail.replace(/^[.:—\s]+/, '');
        return tail ? head + ' — ' + tail : head;
      }
      function sentence(t) {
        if (!t) return '';
        return /[.!?:—]$/.test(t) ? t : t + '.';
      }

      function speakBlock(el, kind) {
        var parts = [], i, name, body, lead, cards, items, cap, rows, cells, bits;

        if (kind === 'aria') {
          return el.getAttribute('aria-label') || raw(el);
        }

        if (kind === 'exhibit') {
          // A listener cannot see the plot, so the caption IS the exhibit.
          var etitle = one(el, '.ex-title'), esub = one(el, '.ex-sub');
          if (!etitle && !esub) return '';
          if (etitle) parts.push(sentence('Exhibit: ' + etitle));
          if (esub) parts.push(sentence(esub));
          ['.ex-claim', '.ex-takeaway'].forEach(function (s) {
            var v = one(el, s); if (v) parts.push(sentence(v));
          });
          return parts.join(' ');
        }

        if (kind === 'sidebyside') {
          // The move the eye makes across two cards has to become an audible one.
          cards = kids(el, ':scope > div');
          if (!cards.length) return raw(el);
          // `.failure-modes` carries anything from 2 to 10 cards. Exactly two is a
          // COMPARISON — the eye moves between them, so the ear needs a hand-off.
          // More than two is a REGISTER, and conversational glue applied down a
          // ten-item list produces "And finally." six times, which is the robotic
          // repetition this pass exists to remove. There, each card's own name is
          // the structure and no synthetic lead-in is added.
          var pair = cards.length === 2;
          var GLIDE2 = ['Take the first.', 'Now the second.'];
          for (i = 0; i < cards.length; i++) {
            name = one(cards[i], '.name');
            body = raw(cards[i]);
            if (name && body.indexOf(name) === 0) body = body.slice(name.length).trim();
            lead = pair ? GLIDE2[i] + ' ' : '';
            parts.push(lead + sentence(name ? name + ': ' + body : body));
          }
          return parts.join(' ');
        }

        if (kind === 'card') {
          bits = ['.posture-card-eyebrow', '.posture-card-name', '.posture-card-role', '.posture-card-def'];
          for (i = 0; i < bits.length; i++) { var v = one(el, bits[i]); if (v) parts.push(sentence(v)); }
          return parts.length ? parts.join(' ') : raw(el);
        }

        if (kind === 'callout') {
          var clabel = one(el, '.callout-label');
          items = kids(el, 'li');
          if (clabel) parts.push(sentence(clabel));
          if (items.length) {
            for (i = 0; i < items.length; i++) parts.push(sentence(labelled(items[i], 'strong, b')));
          } else {
            body = raw(el);
            if (clabel && body.indexOf(clabel) === 0) body = body.slice(clabel.length).trim();
            if (body) parts.push(sentence(body));
          }
          return parts.join(' ');
        }

        if (kind === 'steps') {
          // 01/02/03 is a sequence the eye gets for free. Spoken, it needs ordinals.
          items = kids(el, ':scope > li');
          for (i = 0; i < items.length; i++) {
            var t = labelled(items[i], '.step-title, strong, b');
            if (!t) continue;
            lead = i < ORDINALS.length
              ? ORDINALS[i].charAt(0).toUpperCase() + ORDINALS[i].slice(1)
              : 'Item ' + (i + 1);
            parts.push(sentence(lead + ', ' + t));
          }
          return parts.join(' ');
        }

        if (kind === 'quote') {
          // No synthetic lead-in. Every pull quote in this book is a self-standing
          // declarative that reads as part of the argument, and none repeats body
          // text (checked across all seven). One fixed frame said seven times in a
          // continuous listen is the robotic tell the owner flagged; the beat a
          // pull quote earns visually is already there in audio, because each block
          // is its own utterance and its own API segment.
          return sentence(raw(el));
        }

        if (kind === 'nextup') {
          var ntitle = one(el, '.next-up-title'), nteaser = one(el, '.next-up-teaser'), nbody = one(el, '.next-up-body');
          if (ntitle) parts.push(sentence('Next up: ' + ntitle));
          if (nteaser) parts.push(sentence(nteaser));
          if (nbody) parts.push(sentence(nbody));
          return parts.join(' ');
        }

        if (kind === 'table') {
          // 47 cells read row-by-row is unlistenable. The caption states the
          // question and the footer states the answer; speak those and stop.
          cap = one(el, 'caption');
          if (cap) parts.push(sentence(cap));
          rows = kids(el, 'tfoot tr');
          for (i = 0; i < rows.length; i++) {
            var head2 = one(rows[i], 'th');
            cells = kids(rows[i], 'td').map(function (td) {
              var lbl = td.getAttribute('data-label');
              return (lbl ? lbl + ' ' : '') + raw(td);
            }).filter(Boolean);
            if (cells.length) parts.push(sentence((head2 ? head2 + ': ' : '') + cells.join(', ')));
          }
          if (!parts.length) return '';
          parts.push('The full comparison is in the table on the page.');
          return parts.join(' ');
        }

        return raw(el); // heading / para
      }

      function buildBlocks() {
        if (blocks) return blocks;
        blocks = [];
        acronymSeen = {};                                   // "first use" = first in reading order
        var main = document.querySelector('.shell-main');
        if (!main) return blocks;

        var sel = NARRATION_BLOCKS.map(function (b) { return b.sel; }).join(',');
        var nodes = main.querySelectorAll(sel);
        var claimed = [];
        function isClaimed(el) {
          for (var i = 0; i < claimed.length; i++) if (claimed[i].contains(el)) return true;
          return false;
        }
        for (var i = 0; i < nodes.length; i++) {
          var el = nodes[i];
          if (isClaimed(el)) continue;                       // spoken already, as part of its container
          if (el.matches(NARRATION_MUTE)) continue;
          if (el.closest(NARRATION_MUTE)) continue;
          var kind = 'para';
          for (var k = 0; k < NARRATION_BLOCKS.length; k++) {
            if (el.matches(NARRATION_BLOCKS[k].sel)) { kind = NARRATION_BLOCKS[k].kind; break; }
          }
          var spoken = speakLine(speakBlock(el, kind));
          if (kind !== 'para' && kind !== 'heading') claimed.push(el);
          if (spoken) blocks.push(spoken);
        }
        return blocks;
      }
      // Segment the page for the API path. The first segments are deliberately
      // SMALL and ramp up (SEG_CAPS) so the first audio arrives in ~1-2s instead
      // of waiting on a full 3500-char generation; steady-state caps at API_MAX
      // (OpenAI TTS limit is 4096). Look-ahead generation (playApi) keeps later
      // segments warm, so the small head never creates a gap.
      var SEG_CAPS = [700, 1500, 3000]; // ramp for fast time-to-first-audio
      var API_MAX = 3500;
      var segs = null;
      function buildSegments() {
        if (segs) return segs;
        segs = [];
        var cur = '';
        function cap() { return segs.length < SEG_CAPS.length ? SEG_CAPS[segs.length] : API_MAX; }
        function flush() { if (cur.trim()) segs.push(cur.trim()); cur = ''; }
        buildBlocks().forEach(function (b) {
          if (b.length > cap()) {                         // oversized block: split by sentence
            flush();
            (b.match(/[^.!?]+[.!?]*\s*/g) || [b]).forEach(function (s) {
              if (cur.length + s.length > cap()) flush();
              cur += s;
            });
            flush();
          } else if ((cur ? cur.length + 1 : 0) + b.length > cap()) {
            flush(); cur = b;
          } else {
            cur = cur ? cur + ' ' + b : b;
          }
        });
        flush();
        return segs;
      }

      // --- capability (resolved lazily; no audio, and no load-time ping when
      //     Web Speech already covers us) --------------------------------------
      var method = null; // 'api' | 'browser' | 'unavailable'
      var capabilityPromise = null;
      // A capability verdict reached WITHOUT the server answering (timeout,
      // offline, 5xx on the probe) is a guess made under failure. Remembering
      // it is how one slow cold start pins the whole visit to the browser
      // voice long after the API recovered — so a degraded verdict is thrown
      // away and the next click asks again.
      function resolveCapability() {
        if (capabilityPromise) return capabilityPromise;
        var ctrl = new AbortController();
        var to = setTimeout(function () { ctrl.abort(); }, 5000);
        var degraded = true;
        capabilityPromise = fetch('/api/narration', { method: 'GET', signal: ctrl.signal })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (d) {
            if (d) {
              degraded = false;                 // the server answered; its word is final
              if (d.available) voiceInfo = d;
              if (d.configWarning) warnVoice('server reports: ' + d.configWarning);
            }
            method = (d && d.available) ? 'api' : (synth ? 'browser' : 'unavailable');
          })
          .catch(function () { method = synth ? 'browser' : 'unavailable'; })
          .then(function () {
            clearTimeout(to);
            var m = method;
            if (degraded && m !== 'api') {      // could not ask — do not treat it as an answer
              mark('capability-degraded', m);
              method = null; capabilityPromise = null;
            }
            return m;
          });
        return capabilityPromise;
      }

      // --- state -------------------------------------------------------------
      var STATE = 'idle';
      function setState(s) {
        // progress clock: run only while actually playing; freeze on leave; reset at idle
        if (s === 'playing') { if (!clkRunning) { clkStart = nowSec(); clkRunning = true; requestAnimationFrame(progressLoop); } }
        else if (clkRunning) { clkBase += nowSec() - clkStart; clkRunning = false; }
        if (s === 'idle') clkBase = 0;
        STATE = s;
        bar.setAttribute('data-narration-state', s);
        listenBtn.setAttribute('aria-busy', s === 'loading' ? 'true' : 'false');
        listenBtn.setAttribute('aria-pressed', (s === 'playing' || s === 'paused') ? 'true' : 'false');
        if (listenLabel) {
          listenLabel.textContent =
            s === 'playing' ? 'Pause' : s === 'paused' ? 'Resume' : s === 'loading' ? 'Preparing…' : 'Listen';
        }
        listenBtn.setAttribute('aria-label',
          s === 'playing' ? 'Pause narration' : s === 'paused' ? 'Resume narration' : 'Listen to this part');
        if (onTick) onTick();
      }

      // --- API audio engine --------------------------------------------------
      // cache = finished object URLs (key -> url); pending = in-flight requests
      // (key -> Promise) so prewarm + playback never double-generate the same
      // segment; controllers = every live AbortController, so stop() cancels them.
      var audio = null, runId = 0;
      var cache = new Map();
      var pending = new Map();
      var controllers = new Set();
      function hash(str) { var h = 0; for (var i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; } return h.toString(36); }

      // Fetch (and cache) one segment's AI audio. Transient failures — rate
      // limits, 5xx, timeouts, network blips — are RETRIED on the premium voice
      // (short backoff, bounded) before anyone considers the browser fallback,
      // so a momentary hiccup no longer knocks a reader down to the robotic
      // Web Speech voice. Aborts (Stop) and definitive auth/config failures are
      // not retried. err.code / err.status are surfaced so the caller can tell a
      // dead key (stick to browser) from a transient blip (keep the AI voice).
      function fetchSegment(text) {
        var key = text.length + ':' + hash(text);        // length + hash → stable, collision-resistant
        if (cache.has(key)) { mark('cache-hit', key); return Promise.resolve(cache.get(key)); }
        if (pending.has(key)) return pending.get(key);   // dedup concurrent requests (no double-generate)

        function attempt(n) {
          var ctrl = new AbortController();
          controllers.add(ctrl);
          mark('request-start', key + (n ? ' retry#' + n : ''));
          return fetch('/api/narration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text }),
            signal: ctrl.signal
          }).then(function (r) {
            controllers.delete(ctrl);
            mark('response', r.status);
            if (!r.ok) {
              return r.json().catch(function () { return {}; }).then(function (e) {
                var err = new Error((e && e.message) || ('HTTP ' + r.status));
                err.fallback = e && e.fallback;
                err.code = e && e.error;
                err.configRejected = !!(e && e.configRejected);
                err.quotaExhausted = !!(e && e.quotaExhausted);
                err.status = r.status;
                throw err;
              });
            }
            return r.blob();
          }, function (err) { controllers.delete(ctrl); throw err; })  // network / abort
          .then(function (blob) {
            var u = URL.createObjectURL(blob);
            cache.set(key, u);
            return u;
          }, function (err) {
            var aborted = err && err.name === 'AbortError';
            // configRejected / 403 fail identically on every retry — retrying a
            // mistyped voice or a refused origin just delays the fallback.
            var definitive = err && (
              err.status === 401 || err.status === 403 || err.status === 503 ||
              err.configRejected === true || err.code === 'VALIDATION_FAILED'
            );
            // An exhausted balance is a 429 that a backoff cannot clear, so it
            // is not worth retrying — but it is NOT definitive either: a top-up
            // restores the premium voice without a reload, so capability stays
            // re-probable and only the pointless retries are skipped.
            var noRetry = definitive || (err && err.quotaExhausted === true);
            if (!aborted && !noRetry && n < 2) {                    // retry transient failures on the AI voice
              return new Promise(function (r2) { setTimeout(r2, 350 * (n + 1)); }).then(function () { return attempt(n + 1); });
            }
            throw err;
          });
        }

        var p = attempt(0).then(
          function (u) { pending.delete(key); return u; },
          function (err) { pending.delete(key); throw err; }
        );
        pending.set(key, p);
        return p;
      }

      var LOOKAHEAD = 2; // warm this many upcoming segments while one plays (keeps playback + short seeks gapless)
      function playApi(i, myRun) {
        if (myRun !== runId) { mark('stale-ignored', 'playApi ' + i); return; }
        var list = buildSegments();
        if (i >= list.length) { finish(myRun); return; }
        fetchSegment(list[i]).then(function (url) {
          if (myRun !== runId) { mark('stale-ignored', 'segment ' + i); return; }
          clearTimeout(loadTimer);                // first audio arrived — cancel the slow-API safety net
          audio = new Audio(url);
          audio.onended = function () { if (myRun === runId) playApi(i + 1, myRun); };
          audio.onerror = function () { if (myRun === runId) { setState('error'); announce('Narration error'); } };
          var p = audio.play();
          if (p && p.catch) p.catch(function () { if (myRun === runId) setState('error'); });
          setVoiceKind('premium');
          setState('playing');
          if (i === 0) mark('first-audio-playing');
          // look-ahead: warm upcoming segments so playback stays gapless
          for (var k = 1; k <= LOOKAHEAD; k++) { if (list[i + k]) fetchSegment(list[i + k]).catch(function () {}); }
        }).catch(function (err) {
          if (myRun !== runId || (err && err.name === 'AbortError')) { mark('aborted', 'segment ' + i); return; }
          // The segment already retried transient failures on the AI voice; if we
          // land here it has genuinely failed. Fall back to Web Speech, but only
          // STICK the session to the browser voice for a DEFINITIVE failure — a
          // dead / missing key. A transient failure (rate limit, 5xx, timeout)
          // falls back for THIS attempt only, so the next Listen click retries
          // the premium AI voice instead of reverting for good. (This is the fix
          // for "narration keeps reverting to the in-browser voice.")
          var definitive = err && (
            err.status === 401 || err.status === 403 || err.status === 503 ||
            err.configRejected === true ||
            err.code === 'PROVIDER_NOT_CONFIGURED' || err.code === 'UPSTREAM_AUTH_FAILED' ||
            err.code === 'UPSTREAM_CONFIG_REJECTED' || err.code === 'ORIGIN_NOT_ALLOWED'
          );
          if (synth) {
            if (definitive) { mark('fallback-browser-stick', 'segment ' + i); method = 'browser'; }
            else mark('fallback-browser-transient', 'segment ' + i);
            setVoiceKind('browser', (err && err.quotaExhausted)
              ? 'OpenAI balance exhausted — add credits to restore the premium voice'
              : ((err && (err.code || err.message)) || 'generation failed'));
            startBrowser(myRun);
            return;
          }
          setState('error'); announce('Narration unavailable');
        });
      }

      // --- Web Speech engine (fallback) -------------------------------------
      var bIdx = 0, bList = null;
      function startBrowser(myRun) {
        if (!synth) { setState('error'); return; }
        clearTimeout(loadTimer);
        bList = buildBlocks(); bIdx = 0;
        synth.cancel(); setState('playing'); announce('Playing audio');
        speakNext(myRun);
      }
      function speakNext(myRun) {
        if (myRun !== runId) return;
        if (bIdx >= bList.length) { finish(myRun); return; }
        var u = new SpeechSynthesisUtterance(bList[bIdx]);
        u.rate = 1;
        u.onend = function () { if (myRun === runId) { bIdx++; speakNext(myRun); } };
        synth.speak(u);
      }

      // --- transport ---------------------------------------------------------
      function start() {
        if (STATE === 'loading' || STATE === 'playing' || STATE === 'paused') { mark('dup-suppressed', 'start@' + STATE); return; }   // coalesce repeat clicks
        runId++; var myRun = runId;
        markT0 = window.performance ? performance.now() : Date.now();
        mark('click→start');
        setState('loading'); announce('Preparing narration');
        clearTimeout(loadTimer);
        loadTimer = setTimeout(function () {        // safety net: API too slow → Web Speech (overlap-safe via runId)
          if (myRun !== runId || STATE !== 'loading') return;
          if (method === 'api' && synth) {
            mark('slow-fallback');
            setVoiceKind('browser', 'API did not produce audio within ' + SLOW_FALLBACK_MS + 'ms');
            runId++; var r2 = runId;                // invalidate the in-flight API attempt
            controllers.forEach(function (c) { try { c.abort(); } catch (e) {} });
            controllers.clear(); pending.clear();
            startBrowser(r2);
          }
        }, SLOW_FALLBACK_MS);
        (method ? Promise.resolve(method) : resolveCapability()).then(function (m) {
          if (myRun !== runId) { mark('stale-ignored', 'capability'); return; }   // stopped / fell back while resolving
          mark('method', m);
          if (m === 'api') playApi(0, myRun);
          else if (m === 'browser') {
            clearTimeout(loadTimer);
            setVoiceKind('browser', 'narration API reports no provider configured');
            startBrowser(myRun);
          }
          else { clearTimeout(loadTimer); setState('idle'); announce('Narration unavailable'); }
        });
      }
      function pause() {
        if (STATE !== 'playing') return;
        if (method === 'api' && audio) audio.pause();
        else if (synth) synth.pause();
        setState('paused'); announce('Audio paused');
      }
      function resume() {
        if (STATE !== 'paused') return;
        if (method === 'api' && audio) { var p = audio.play(); if (p && p.catch) p.catch(function () { setState('error'); }); }
        else if (synth) synth.resume();
        setState('playing'); announce('Audio resumed');
      }
      function stop() {
        clearTimeout(loadTimer);                  // cancel the slow-API safety net
        runId++;                                  // invalidate async work + onended/onend + in-flight fetches
        if (audio) { try { audio.pause(); } catch (e) {} audio = null; }
        if (synth) synth.cancel();
        controllers.forEach(function (c) { try { c.abort(); } catch (e) {} });
        controllers.clear(); pending.clear();
        setState('idle'); announce('Audio stopped'); mark('stop');
      }
      function finish(myRun) {
        if (myRun !== runId) return;
        audio = null; setState('idle'); announce('Audio finished');
      }
      // Seek the estimate to time t by restarting at the segment/block covering it.
      function seekTo(t) {
        var dur = aggDur(); if (!(dur > 0)) return;
        t = Math.max(0, Math.min(t, dur));
        var u = units(), before = 0, j = 0, d;
        for (j = 0; j < u.length; j++) { d = estDur(u[j]); if (before + d > t) break; before += d; }
        if (j >= u.length) j = u.length - 1;
        clkBase = before; clkStart = nowSec(); clkRunning = false;   // setState('playing') restarts the clock
        runId++; var myRun = runId;
        if (audio) { try { audio.pause(); } catch (e) {} audio = null; }
        if (method === 'api') { setState('loading'); playApi(j, myRun); }
        else if (synth) { try { synth.cancel(); } catch (e) {} bIdx = j; setState('playing'); speakNext(myRun); }
        else { setState('idle'); }
      }

      // --- prewarm -----------------------------------------------------------
      // On hover/focus (clear intent, before the click) resolve capability and
      // warm just the small first segment, so the first click plays almost
      // instantly. Fire-and-forget, runs once, bounded to one segment — no
      // excessive pre-generation, and a no-op when narration uses Web Speech.
      var prewarmed = false;
      function prewarm() {
        if (prewarmed) return;
        prewarmed = true;
        mark('prewarm-start');
        (method ? Promise.resolve(method) : resolveCapability()).then(function (m) {
          if (m !== 'api') return;
          var list = buildSegments();
          if (!list.length) return;
          // Warm the small head segments (the ramp keeps these tiny) so BOTH the
          // first click and the first gapless hand-off are instant. Sequential +
          // bounded to two — no bulk pre-generation on load, and a no-op under
          // Data Saver (the ambient callers gate on navigator.connection.saveData).
          fetchSegment(list[0]).then(function () {
            mark('prewarm-ready');
            if (list[1]) fetchSegment(list[1]).catch(function () {});
          }).catch(function () {});
        });
      }

      // --- wire-up -----------------------------------------------------------
      // Inject a pause glyph + a dedicated Stop control so the Part HTML stays
      // untouched. Both inherit the existing .part-action styling.
      var label = listenBtn.querySelector('.part-action-label');
      var pauseSvg = '<svg class="pa-icon icon-pause" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="7.5" y="6" width="3.2" height="12" rx="1"></rect><rect x="13.3" y="6" width="3.2" height="12" rx="1"></rect></svg>';
      if (label) label.insertAdjacentHTML('beforebegin', pauseSvg);
      else listenBtn.insertAdjacentHTML('beforeend', pauseSvg);

      var stopBtn = document.createElement('button');
      stopBtn.type = 'button';
      stopBtn.className = 'part-action part-listen-stop';
      stopBtn.setAttribute('data-listen-stop', '');
      stopBtn.setAttribute('aria-label', 'Stop narration');
      stopBtn.innerHTML = '<svg class="pa-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="7" y="7" width="10" height="10" rx="1.5"></rect></svg>';
      listenBtn.insertAdjacentElement('afterend', stopBtn);

      listenBtn.addEventListener('click', function () {
        if (STATE === 'playing') pause();
        else if (STATE === 'paused') resume();
        else if (STATE === 'loading') mark('dup-suppressed', 'listen@loading');  // ignore repeat — Stop cancels
        else start();                             // idle / error
      });
      // Warm the first segment ahead of the click. Hover/focus = explicit intent
      // (always). Ambient triggers (page idle, first scroll, Listen entering the
      // viewport) each fire once and are skipped under Data Saver, so we never
      // pre-generate audio on metered connections without intent.
      listenBtn.addEventListener('mouseenter', prewarm);
      listenBtn.addEventListener('focus', prewarm);
      function autoPrewarm() {
        try { if (navigator.connection && navigator.connection.saveData) return; } catch (e) {}
        prewarm();
      }
      window.addEventListener('scroll', function onceScroll() { window.removeEventListener('scroll', onceScroll); autoPrewarm(); }, { passive: true });
      if (window.requestIdleCallback) requestIdleCallback(autoPrewarm, { timeout: 4000 });
      if ('IntersectionObserver' in window) {
        var pwIo = new IntersectionObserver(function (es) {
          if (es.some(function (e) { return e.isIntersecting; })) { pwIo.disconnect(); autoPrewarm(); }
        }, { rootMargin: '0px 0px 20% 0px' });
        pwIo.observe(listenBtn);
      }
      stopBtn.addEventListener('click', stop);
      window.addEventListener('pagehide', function () {
        stop();
        cache.forEach(function (u) { try { URL.revokeObjectURL(u); } catch (e) {} });
        cache.clear();
      });

      // Expose a minimal controller so the floatnav dock drives this SAME engine
      // (one audio instance). narrationDock() reads state/duration/time and calls
      // playPause / stop / seek; it subscribes for state + progress updates.
      NARRATION = {
        state:       function () { return STATE; },
        duration:    aggDur,
        currentTime: function () { return Math.min(clkNow(), aggDur()); },
        playPause:   function () {
          if (STATE === 'playing') pause();
          else if (STATE === 'paused') resume();
          else if (STATE !== 'loading') start();
        },
        stop:        stop,
        seek:        seekTo,
        subscribe:   function (cb) { onTick = cb; if (cb) cb(); },
        // What the narrator will actually SAY, before any audio is generated.
        // Narration quality is otherwise only checkable by listening to the whole
        // page, which is why half the book could go unread without anyone noticing.
        script:      function () { return buildBlocks().slice(); }
      };
      // Reachable for QA: `ACFNarration.script()` prints what this page will say.
      try { window.ACFNarration = NARRATION; } catch (e) {}

      // Visibility: Web Speech => usable immediately. Otherwise reveal only if
      // the capability check confirms a provider (avoid a dead button).
      setState('idle');
      if (!synth) {
        listenBtn.hidden = true;
        resolveCapability().then(function (m) { if (m === 'api') listenBtn.hidden = false; });
      }
    }
  }

  /* ---- Remembered home: route the Parts' "home" affordances to this site's cover *
   * The cover stamps localStorage 'acf-home'; reading pages rewrite their home links
   * (sidebar brand, breadcrumb, floatnav home) to it. This site ships a single cover,
   * so home resolves to that cover; with JS off, the static href in the markup is used. */
  function homeLinks() {
    var home = null;
    try { home = localStorage.getItem('acf-home'); } catch (e) {}
    if (!home || home === 'cover-docs.html') return;
    if (!/^[\w-]+\.html$/.test(home)) return; // only same-folder pages
    document.querySelectorAll('a[href="cover-docs.html"]').forEach(function (a) {
      a.setAttribute('href', home);
    });
  }

  /* ---- Chart exhibits: scroll build-in ------------------------------------ *
   * Adds `.is-in` to each .exhibit once it enters view; the CSS then draws the
   * thesis line and fades fields/labels in comprehension order. Motion-gated:
   * the hidden start states only exist under html.js + motion-ok, so JS-off and
   * reduced-motion readers always get the finished chart (base state = drawn).  */
  function chartBuild() {
    var exs = document.querySelectorAll('.exhibit');
    if (!exs.length || !('IntersectionObserver' in window)) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.3 });
    exs.forEach(function (x) { io.observe(x); });
  }

  /* ---- Chart exhibits: one delegated hover/pin tooltip over [data-tip] ----- *
   * Hover/focus shows; click pins (Esc or click-away unpins). ≤640px the tip is
   * a fixed bottom sheet (CSS), so tap-to-inspect always lands in-frame.        */
  function chartTips() {
    var plots = document.querySelectorAll('.ex-plot');
    if (!plots.length) return;
    plots.forEach(function (plot) {
      var tip = null, pinned = false;
      function ensureTip() {
        if (tip) return tip;
        tip = document.createElement('div');
        tip.className = 'ex-tip';
        tip.setAttribute('role', 'status');
        plot.appendChild(tip);
        return tip;
      }
      function show(target) {
        var t = ensureTip();
        var name = target.getAttribute('data-tip-name') || '';
        var text = target.getAttribute('data-tip') || '';
        t.innerHTML = (name ? '<span class="tip-name"></span>' : '') + '<span class="tip-text"></span>';
        if (name) t.querySelector('.tip-name').textContent = name;
        t.querySelector('.tip-text').textContent = text;
        var pr = plot.getBoundingClientRect(), tr = target.getBoundingClientRect();
        var x = tr.left - pr.left + tr.width / 2;
        var y = tr.top - pr.top;
        t.style.left = Math.max(8, Math.min(x - 110, pr.width - 240)) + 'px';
        t.style.top = Math.max(4, y - 78) + 'px';
        t.setAttribute('data-show', '');
      }
      function hide() { if (tip && !pinned) tip.removeAttribute('data-show'); }
      function unpin() { pinned = false; if (tip) { tip.removeAttribute('data-pinned'); hide(); } }
      plot.addEventListener('mouseover', function (e) { var h = e.target.closest('.cx-hit'); if (h && !pinned) show(h); });
      plot.addEventListener('mouseout', function (e) { if (!e.target.closest('.cx-hit')) return; hide(); });
      plot.addEventListener('focusin', function (e) { var h = e.target.closest('.cx-hit'); if (h && !pinned) show(h); });
      plot.addEventListener('focusout', hide);
      plot.addEventListener('click', function (e) {
        var h = e.target.closest('.cx-hit');
        if (h) { pinned = true; show(h); tip.setAttribute('data-pinned', ''); }
        else if (pinned) unpin();
      });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && pinned) unpin(); });
    });
  }

  /* ---- Voice narration mini-player ------------------------------------------ *
   * One shared controller, one audio source, one piece of UI: a slim transport
   * (play/pause · scrub slider · time-remaining) docked above the floating-nav
   * pill. Engine-agnostic — it prefers a real <audio> narration source when one
   * is wired (exact timeline + seeking), and otherwise drives the existing Web
   * Speech narration with a derived timeline so the same scrubber still works.
   * The UI appears only once narration is armed, is keyboard-operable, theme-aware,
   * never autoplays, never spawns overlapping playback, and is torn down on unload. */
  /* ---- Voice-narration dock — floating-nav transport for partActions() ------ *
   * partActions() owns the audio engine (OpenAI TTS / Web Speech) and exposes the
   * NARRATION controller. This builds the floatnav lower rail (play/pause · scrub
   * · time-remaining), mirrors the engine state, and drives that ONE engine — no
   * second audio instance. Pure UI: a no-op without a floatnav or controller.     */
  function narrationDock() {
    var nav = document.querySelector('.floatnav');
    var inner = nav && nav.querySelector('.floatnav-inner');
    if (!nav || !inner || !NARRATION) return;

    // Fold the quick-nav controls into a main row, then attach the rail beneath
    // them INSIDE the same dock surface (one pill, two rows).
    var main = document.createElement('div');
    main.className = 'floatnav-main';
    while (inner.firstChild) main.appendChild(inner.firstChild);
    inner.appendChild(main);
    inner.classList.add('is-dock');

    var player = document.createElement('div');
    player.className = 'floatnav-player';
    player.setAttribute('data-state', 'idle');
    player.innerHTML =
      '<button type="button" class="floatnav-play" aria-label="Play narration" aria-pressed="false">' +
        '<svg class="fn-icon fn-ico-play" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M8 5.2v13.6L19 12z"/></svg>' +
        '<svg class="fn-icon fn-ico-pause" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M7 5h3.1v14H7zM13.9 5H17v14h-3.1z"/></svg>' +
      '</button>' +
      '<input type="range" class="floatnav-progress-input" min="0" max="1000" value="0" step="1" aria-label="Narration position" disabled>' +
      '<span class="floatnav-time" aria-hidden="true">-0:00</span>';
    inner.appendChild(player);
    var playBtn = player.querySelector('.floatnav-play');
    var input   = player.querySelector('.floatnav-progress-input');
    var timeEl  = player.querySelector('.floatnav-time');

    var scrubbing = false;
    function fmt(sec) { sec = Math.max(0, Math.floor(sec)); var m = Math.floor(sec / 60), s = sec % 60; return '-' + m + ':' + (s < 10 ? '0' : '') + s; }
    function spoken(sec) { sec = Math.max(0, Math.round(sec)); var m = Math.floor(sec / 60), s = sec % 60; return (m ? m + ' minute' + (m === 1 ? '' : 's') + ' ' : '') + s + ' second' + (s === 1 ? '' : 's') + ' remaining'; }

    function paint() {
      var st = NARRATION.state();
      var dur = NARRATION.duration(), cur = NARRATION.currentTime();
      var active = (st === 'playing' || st === 'paused' || st === 'loading');
      // The rail opens only while narration is active; the dock pins the nav up.
      // Mirror the active state onto the document root (guarded, so <html> styles
      // don't recompute every progress frame) — CSS uses [data-narrating] to add
      // bottom breathing room so the fixed dock doesn't sit over end-of-page content.
      if (active) {
        nav.hidden = false; nav.setAttribute('data-armed', ''); nav.setAttribute('data-visible', ''); nav.setAttribute('data-pinned', '');
        if (!root.hasAttribute('data-narrating')) root.setAttribute('data-narrating', '');
      } else {
        nav.removeAttribute('data-armed'); nav.removeAttribute('data-pinned'); if (window.scrollY <= 600) nav.removeAttribute('data-visible');
        if (root.hasAttribute('data-narrating')) root.removeAttribute('data-narrating');
      }
      player.setAttribute('data-state', st);
      var loading = (st === 'loading');
      playBtn.setAttribute('aria-label', st === 'playing' ? 'Pause narration' : loading ? 'Preparing narration' : 'Play narration');
      playBtn.setAttribute('aria-pressed', st === 'playing' ? 'true' : 'false');
      // Keep the scrubber inert (disabled, no false position) until real playback,
      // and show a quiet "preparing" marker instead of a misleading full duration.
      var hasDur = !loading && isFinite(dur) && dur > 0.1;
      input.disabled = !hasDur;
      if (scrubbing) return;                          // don't fight the user's drag
      if (loading) {
        input.value = '0'; input.style.setProperty('--fnp-fill', '0%');
        input.removeAttribute('aria-valuetext');
        timeEl.textContent = '···';                   // pulses via CSS while [data-state="loading"]
      } else if (hasDur) {
        var frac = Math.min(1, cur / dur);
        input.value = String(Math.round(frac * 1000));
        input.style.setProperty('--fnp-fill', (frac * 100).toFixed(1) + '%');
        input.setAttribute('aria-valuetext', spoken(dur - cur));
        timeEl.textContent = fmt(dur - cur);
      } else {
        input.value = '0'; input.style.setProperty('--fnp-fill', '0%'); timeEl.textContent = '-0:00';
      }
    }

    playBtn.addEventListener('click', function () { NARRATION.playPause(); });
    input.addEventListener('input', function () {
      scrubbing = true;
      var dur = NARRATION.duration(); if (!(dur > 0)) return;
      var frac = Number(input.value) / 1000;
      input.style.setProperty('--fnp-fill', (frac * 100).toFixed(1) + '%');
      input.setAttribute('aria-valuetext', spoken(dur - frac * dur));
      timeEl.textContent = fmt(dur - frac * dur);
    });
    input.addEventListener('change', function () {
      var dur = NARRATION.duration(); scrubbing = false;
      if (dur > 0) NARRATION.seek((Number(input.value) / 1000) * dur);
    });
    input.addEventListener('pointerup', function () { scrubbing = false; });
    input.addEventListener('blur', function () { scrubbing = false; });

    NARRATION.subscribe(paint);                       // initial paint + every state/progress tick
  }

  /* ---- init -------------------------------------------------------------- */
  theme();
  scrollSpy();
  drawer();
  sidebarCollapse();
  floatNav();
  progressWrite();
  progressPaint();
  footPeek();   // after progressPaint: the peek line rests on whatever it decided
  sectionReveal();
  hamburgerFade();
  highlights();
  stepperProgress();
  partActions();
  narrationDock();
  chartBuild();
  chartTips();
  homeLinks();
})();

/* ===========================================================================
   Glossary tooltips — enhance [data-gloss] terms from acf-glossary.json (the
   single source of truth). Definitions are NEVER hard-coded here. Layer one is
   the definition; layer two is the appears-later link + related-concept chips.
   Desktop: positioned popover on hover/focus/click-to-pin. Touch: bottom sheet.
   =========================================================================== */
(function () {
  var triggers = document.querySelectorAll('.gloss[data-gloss]');
  if (!triggers.length) return;

  var desktop = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var GLOSSARY = {}, card = null, backdrop = null;
  var pinned = false, hoverTimer = null, closeTimer = null, lastTrigger = null;

  // id -> part file (the ACTUAL built filenames). Unbuilt parts render layer-two
  // as muted plain text, never a dead link.
  var PART_FILES = {
    1: '/part-1-foundation',
    2: '/part-2-lineage-macro-thesis',
    3: '/part-3-bitcoin-convexity-backbone',
    4: '/part-4-tax-architecture-roc-strategy',
    5: '/part-5-portfolio-construction-position-management',
    6: '/part-6-convexity-framework-integrity-scoring'
  };
  var BUILT_PARTS = { 1: true, 2: true, 3: true, 4: true, 5: true, 6: true }; // all six parts ship as Site B (2026-07)

  // chart -> built exhibit anchor, dual-keyed by inventory `idx` AND `chartId`
  // so glossary `chart` refs in either form resolve. Generated from
  // navigation-registry.json (the runtime patch layer supersedes this map when
  // the registry loads; this is the no-registry fallback). Unknown ids render
  // nothing (unchanged behavior).
  var BUILT_CHARTS = {
    'L1': { page: '/', hash: '#exhibit-dl-convexity-window', label: 'L1 · The Window Opens' },
    'dl-convexity-window': { page: '/', hash: '#exhibit-dl-convexity-window', label: 'L1 · The Window Opens' },
    'L2': { page: '/', hash: '#exhibit-dl-regime-map', label: 'L2 · Capital Has Weather' },
    'dl-regime-map': { page: '/', hash: '#exhibit-dl-regime-map', label: 'L2 · Capital Has Weather' },
    'S2': { page: '/', hash: '#exhibit-sig-shape', label: 'S2 · Bend the Tail' },
    'sig-shape': { page: '/', hash: '#exhibit-sig-shape', label: 'S2 · Bend the Tail' },
    '01': { page: '/part-1-foundation', hash: '#exhibit-01', label: '01 · The Hedge Broke' },
    'p1-hedge-broke': { page: '/part-1-foundation', hash: '#exhibit-01', label: '01 · The Hedge Broke' },
    '02': { page: '/part-1-foundation', hash: '#exhibit-02', label: '02 · Correlation Turns' },
    'p1-correlation': { page: '/part-1-foundation', hash: '#exhibit-02', label: '02 · Correlation Turns' },
    '03': { page: '/part-1-foundation', hash: '#exhibit-03', label: '03 · Inflation Was Bigger' },
    'p1-cpi-assets': { page: '/part-1-foundation', hash: '#exhibit-03', label: '03 · Inflation Was Bigger' },
    '04': { page: '/part-1-foundation', hash: '#exhibit-04', label: '04 · The Bill Came Due' },
    'p1-policy-constraint': { page: '/part-1-foundation', hash: '#exhibit-04', label: '04 · The Bill Came Due' },
    '05': { page: '/part-1-foundation', hash: '#exhibit-05', label: '05 · Path Changes Everything' },
    'p1-sequence-risk': { page: '/part-1-foundation', hash: '#exhibit-05', label: '05 · Path Changes Everything' },
    '06': { page: '/part-1-foundation', hash: '#exhibit-06', label: '06 · Survive the Path' },
    'p1-convexity-survival': { page: '/part-1-foundation', hash: '#exhibit-06', label: '06 · Survive the Path' },
    'L3': { page: '/part-1-foundation', hash: '#exhibit-dl-tripwire-loop', label: 'L3 · Govern the Thesis' },
    'dl-tripwire-loop': { page: '/part-1-foundation', hash: '#exhibit-dl-tripwire-loop', label: 'L3 · Govern the Thesis' },
    'S1': { page: '/part-1-foundation', hash: '#exhibit-s1', label: 'S1 · Shape the Payoff' },
    'sig-payoff': { page: '/part-1-foundation', hash: '#exhibit-s1', label: 'S1 · Shape the Payoff' },
    'P2-01': { page: '/part-2-lineage-macro-thesis', hash: '#exhibit-p2-method-before-macro', label: 'P2-01 · Method Before Macro' },
    'p2-method-before-macro': { page: '/part-2-lineage-macro-thesis', hash: '#exhibit-p2-method-before-macro', label: 'P2-01 · Method Before Macro' },
    'P2-02': { page: '/part-2-lineage-macro-thesis', hash: '#exhibit-p2-ruin-comes-first', label: 'P2-02 · Ruin Comes First' },
    'p2-ruin-comes-first': { page: '/part-2-lineage-macro-thesis', hash: '#exhibit-p2-ruin-comes-first', label: 'P2-02 · Ruin Comes First' },
    'P2-03': { page: '/part-2-lineage-macro-thesis', hash: '#exhibit-p2-conviction-needs-exit', label: 'P2-03 · Conviction Needs an Exit' },
    'p2-conviction-needs-exit': { page: '/part-2-lineage-macro-thesis', hash: '#exhibit-p2-conviction-needs-exit', label: 'P2-03 · Conviction Needs an Exit' },
    'P2-04': { page: '/part-2-lineage-macro-thesis', hash: '#exhibit-p2-markets-feed-back', label: 'P2-04 · Markets Feed Back' },
    'p2-markets-feed-back': { page: '/part-2-lineage-macro-thesis', hash: '#exhibit-p2-markets-feed-back', label: 'P2-04 · Markets Feed Back' },
    'P2-05': { page: '/part-2-lineage-macro-thesis', hash: '#exhibit-p2-time-changes-prudence', label: 'P2-05 · Time Changes Prudence' },
    'p2-time-changes-prudence': { page: '/part-2-lineage-macro-thesis', hash: '#exhibit-p2-time-changes-prudence', label: 'P2-05 · Time Changes Prudence' },
    'P2-06': { page: '/part-2-lineage-macro-thesis', hash: '#exhibit-p2-capital-finds-bottleneck', label: 'P2-06 · Capital Finds the Bottleneck' },
    'p2-capital-finds-bottleneck': { page: '/part-2-lineage-macro-thesis', hash: '#exhibit-p2-capital-finds-bottleneck', label: 'P2-06 · Capital Finds the Bottleneck' },
    'P2-07': { page: '/part-2-lineage-macro-thesis', hash: '#exhibit-p2-narrative-not-thesis', label: 'P2-07 · Narrative Is Not Thesis' },
    'p2-narrative-not-thesis': { page: '/part-2-lineage-macro-thesis', hash: '#exhibit-p2-narrative-not-thesis', label: 'P2-07 · Narrative Is Not Thesis' },
    'P2-08': { page: '/part-2-lineage-macro-thesis', hash: '#exhibit-p2-phase-changes-sizing', label: 'P2-08 · Phase Changes Sizing' },
    'p2-phase-changes-sizing': { page: '/part-2-lineage-macro-thesis', hash: '#exhibit-p2-phase-changes-sizing', label: 'P2-08 · Phase Changes Sizing' },
    'P2-09': { page: '/part-2-lineage-macro-thesis', hash: '#exhibit-p2-liquidity-sets-tide', label: 'P2-09 · Liquidity Sets the Tide' },
    'p2-liquidity-sets-tide': { page: '/part-2-lineage-macro-thesis', hash: '#exhibit-p2-liquidity-sets-tide', label: 'P2-09 · Liquidity Sets the Tide' },
    'P3-01': { page: '/part-3-bitcoin-convexity-backbone', hash: '#exhibit-p3-power-law-holds', label: 'P3-01 · Power Law Holds' },
    'p3-power-law-holds': { page: '/part-3-bitcoin-convexity-backbone', hash: '#exhibit-p3-power-law-holds', label: 'P3-01 · Power Law Holds' },
    'P3-03': { page: '/part-3-bitcoin-convexity-backbone', hash: '#exhibit-p3-volatility-is-the-toll', label: 'P3-03 · Volatility Is the Toll' },
    'p3-volatility-is-the-toll': { page: '/part-3-bitcoin-convexity-backbone', hash: '#exhibit-p3-volatility-is-the-toll', label: 'P3-03 · Volatility Is the Toll' },
    'P3-04': { page: '/part-3-bitcoin-convexity-backbone', hash: '#exhibit-p3-exposure-not-control', label: 'P3-04 · Exposure Is Not Control' },
    'p3-exposure-not-control': { page: '/part-3-bitcoin-convexity-backbone', hash: '#exhibit-p3-exposure-not-control', label: 'P3-04 · Exposure Is Not Control' },
    'P3-05': { page: '/part-3-bitcoin-convexity-backbone', hash: '#exhibit-p3-models-must-converge', label: 'P3-05 · Models Must Converge' },
    'p3-models-must-converge': { page: '/part-3-bitcoin-convexity-backbone', hash: '#exhibit-p3-models-must-converge', label: 'P3-05 · Models Must Converge' },
    'P3-06': { page: '/part-3-bitcoin-convexity-backbone', hash: '#exhibit-p3-accumulate-dont-trade', label: 'P3-06 · Accumulate, Don’t Trade' },
    'p3-accumulate-dont-trade': { page: '/part-3-bitcoin-convexity-backbone', hash: '#exhibit-p3-accumulate-dont-trade', label: 'P3-06 · Accumulate, Don’t Trade' },
    'P3-07': { page: '/part-3-bitcoin-convexity-backbone', hash: '#exhibit-p3-cold-storage-to-borrow', label: 'P3-07 · Cold Storage to Borrow' },
    'p3-cold-storage-to-borrow': { page: '/part-3-bitcoin-convexity-backbone', hash: '#exhibit-p3-cold-storage-to-borrow', label: 'P3-07 · Cold Storage to Borrow' },
    'P3-08': { page: '/part-3-bitcoin-convexity-backbone', hash: '#exhibit-p3-reserve-share-evolves', label: 'P3-08 · Reserve Share Evolves' },
    'p3-reserve-share-evolves': { page: '/part-3-bitcoin-convexity-backbone', hash: '#exhibit-p3-reserve-share-evolves', label: 'P3-08 · Reserve Share Evolves' },
    'P4-01': { page: '/part-4-tax-architecture-roc-strategy', hash: '#exhibit-p4-tax-wedge', label: 'P4-01 · The Tax Wedge' },
    'p4-tax-wedge': { page: '/part-4-tax-architecture-roc-strategy', hash: '#exhibit-p4-tax-wedge', label: 'P4-01 · The Tax Wedge' },
    'P4-02': { page: '/part-4-tax-architecture-roc-strategy', hash: '#exhibit-p4-gross-not-net', label: 'P4-02 · Gross Is Not Net' },
    'p4-gross-not-net': { page: '/part-4-tax-architecture-roc-strategy', hash: '#exhibit-p4-gross-not-net', label: 'P4-02 · Gross Is Not Net' },
    'P4-03': { page: '/part-4-tax-architecture-roc-strategy', hash: '#exhibit-p4-roc-yield', label: 'P4-03 · ROC Changes the Yield' },
    'p4-roc-yield': { page: '/part-4-tax-architecture-roc-strategy', hash: '#exhibit-p4-roc-yield', label: 'P4-03 · ROC Changes the Yield' },
    'P5-01': { page: '/part-5-portfolio-construction-position-management', hash: '#exhibit-p5-operating-system', label: 'P5-01 · Three Jobs. One Cycle.' },
    'p5-operating-system': { page: '/part-5-portfolio-construction-position-management', hash: '#exhibit-p5-operating-system', label: 'P5-01 · Three Jobs. One Cycle.' },
    'P5-02': { page: '/part-5-portfolio-construction-position-management', hash: '#exhibit-p5-earned-size', label: 'P5-02 · Position Size Must Be Earned' },
    'p5-earned-size': { page: '/part-5-portfolio-construction-position-management', hash: '#exhibit-p5-earned-size', label: 'P5-02 · Position Size Must Be Earned' },
    'P5-03': { page: '/part-5-portfolio-construction-position-management', hash: '#exhibit-p5-posture-sizing', label: 'P5-03 · The Same Score Does Not Create the Same Position' },
    'p5-posture-sizing': { page: '/part-5-portfolio-construction-position-management', hash: '#exhibit-p5-posture-sizing', label: 'P5-03 · The Same Score Does Not Create the Same Position' },
    'P5-04': { page: '/part-5-portfolio-construction-position-management', hash: '#exhibit-p5-ballast-rotation', label: 'P5-04 · Ballast Preserves the Right to Buy' },
    'p5-ballast-rotation': { page: '/part-5-portfolio-construction-position-management', hash: '#exhibit-p5-ballast-rotation', label: 'P5-04 · Ballast Preserves the Right to Buy' },
    'P5-05': { page: '/part-5-portfolio-construction-position-management', hash: '#exhibit-p5-earnings-window', label: 'P5-05 · Conviction Does Not Eliminate Binary Risk' },
    'p5-earnings-window': { page: '/part-5-portfolio-construction-position-management', hash: '#exhibit-p5-earnings-window', label: 'P5-05 · Conviction Does Not Eliminate Binary Risk' },
    'P5-06': { page: '/part-5-portfolio-construction-position-management', hash: '#exhibit-p5-momentum-gate', label: 'P5-06 · Conviction Requires Market Confirmation' },
    'p5-momentum-gate': { page: '/part-5-portfolio-construction-position-management', hash: '#exhibit-p5-momentum-gate', label: 'P5-06 · Conviction Requires Market Confirmation' },
    'P5-07': { page: '/part-5-portfolio-construction-position-management', hash: '#exhibit-p5-force-channels', label: 'P5-07 · One Regime Force. Multiple Economic Expressions.' },
    'p5-force-channels': { page: '/part-5-portfolio-construction-position-management', hash: '#exhibit-p5-force-channels', label: 'P5-07 · One Regime Force. Multiple Economic Expressions.' },
    'P5-08': { page: '/part-5-portfolio-construction-position-management', hash: '#exhibit-p5-wrapper-compounding', label: 'P5-08 · Tax Drag Compounds Too' },
    'p5-wrapper-compounding': { page: '/part-5-portfolio-construction-position-management', hash: '#exhibit-p5-wrapper-compounding', label: 'P5-08 · Tax Drag Compounds Too' },
    'P5-09': { page: '/part-5-portfolio-construction-position-management', hash: '#exhibit-p5-liquidity-throttle', label: 'P5-09 · When Correlation Rises, Diversification Shrinks' },
    'p5-liquidity-throttle': { page: '/part-5-portfolio-construction-position-management', hash: '#exhibit-p5-liquidity-throttle', label: 'P5-09 · When Correlation Rises, Diversification Shrinks' },
    'P5-10': { page: '/part-5-portfolio-construction-position-management', hash: '#exhibit-p5-change-hierarchy', label: 'P5-10 · Know What You Are Changing' },
    'p5-change-hierarchy': { page: '/part-5-portfolio-construction-position-management', hash: '#exhibit-p5-change-hierarchy', label: 'P5-10 · Know What You Are Changing' },
    'P6-01': { page: '/part-6-convexity-framework-integrity-scoring', hash: '#exhibit-p6-cis-composition', label: 'P6-01 · CIS Measures the Position, Not the Portfolio' },
    'p6-cis-composition': { page: '/part-6-convexity-framework-integrity-scoring', hash: '#exhibit-p6-cis-composition', label: 'P6-01 · CIS Measures the Position, Not the Portfolio' },
    'P6-02': { page: '/part-6-convexity-framework-integrity-scoring', hash: '#exhibit-p6-fis-waterfall', label: 'P6-02 · FIS Starts at 100' },
    'p6-fis-waterfall': { page: '/part-6-convexity-framework-integrity-scoring', hash: '#exhibit-p6-fis-waterfall', label: 'P6-02 · FIS Starts at 100' },
    'P6-03': { page: '/part-6-convexity-framework-integrity-scoring', hash: '#exhibit-p6-cis-fis-matrix', label: 'P6-03 · Good Assets Can Still Form a Bad Portfolio' },
    'p6-cis-fis-matrix': { page: '/part-6-convexity-framework-integrity-scoring', hash: '#exhibit-p6-cis-fis-matrix', label: 'P6-03 · Good Assets Can Still Form a Bad Portfolio' },
    'P6-04': { page: '/part-6-convexity-framework-integrity-scoring', hash: '#exhibit-p6-weekly-loop', label: 'P6-04 · The Weekly Evidence Loop' },
    'p6-weekly-loop': { page: '/part-6-convexity-framework-integrity-scoring', hash: '#exhibit-p6-weekly-loop', label: 'P6-04 · The Weekly Evidence Loop' },
    'P6-05': { page: '/part-6-convexity-framework-integrity-scoring', hash: '#exhibit-p6-decay-drift', label: 'P6-05 · Failure Rarely Arrives All at Once' },
    'p6-decay-drift': { page: '/part-6-convexity-framework-integrity-scoring', hash: '#exhibit-p6-decay-drift', label: 'P6-05 · Failure Rarely Arrives All at Once' }
  };

  function boot(data) {
    if (!data || !data.terms) return;
    data.terms.forEach(function (t) { GLOSSARY[t.id] = t; });
    wire();
  }
  // Prefer an inlined window.ACF_GLOSSARY if present (file:// preview); else fetch
  // the canonical file. On any failure terms stay readable, just non-interactive.
  if (window.ACF_GLOSSARY && window.ACF_GLOSSARY.terms) {
    boot(window.ACF_GLOSSARY);
  } else {
    fetch('/site-b/acf-glossary.json').then(function (r) { return r.json(); }).then(boot).catch(function () {});
  }

  function ensureCard() {
    if (card) return;
    backdrop = document.createElement('div');
    backdrop.className = 'gloss-backdrop';
    backdrop.hidden = true;
    backdrop.addEventListener('click', closeNow);
    card = document.createElement('div');
    card.className = 'gloss-card';
    card.setAttribute('role', 'dialog');
    card.hidden = true;
    card.addEventListener('mouseenter', function () { clearTimeout(closeTimer); });
    card.addEventListener('mouseleave', function () { if (!pinned) scheduleClose(); });
    document.body.appendChild(backdrop);
    document.body.appendChild(card);
  }

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function partLink(appears) {
    if (!appears) return '';
    var label = 'Appears in Part ' + appears.part + ' · ' + esc(appears.topic);
    if (BUILT_PARTS[appears.part]) {
      return '<a class="gloss-later" href="' + PART_FILES[appears.part] + '">' + label + '</a>';
    }
    return '<span class="gloss-later is-pending">' + label + '</span>';
  }

  function chartLink(entry) {
    var c = entry.chart && BUILT_CHARTS[entry.chart];
    if (!c) return '';
    var here = location.pathname.slice(location.pathname.lastIndexOf('/') + 1) === c.page;
    var href = (here ? '' : c.page) + c.hash;
    return '<a class="gloss-later gloss-chart" href="' + href + '">View the chart &rarr; ' + esc(c.label) + '</a>';
  }

  function relatedChips(entry) {
    if (!entry.related || !entry.related.length) return '';
    var chips = entry.related
      .filter(function (id) { return GLOSSARY[id]; })
      .map(function (id) {
        return '<button type="button" class="gloss-chip" data-hop="' + id + '">' + esc(GLOSSARY[id].term) + '</button>';
      }).join('');
    return chips ? '<div class="gloss-related">' + chips + '</div>' : '';
  }

  function render(entry) {
    ensureCard();
    card.innerHTML =
      '<p class="gloss-term">' + esc(entry.term) + '</p>' +
      '<p class="gloss-def">' + esc(entry.definition) + '</p>' +
      '<div class="gloss-layer2">' + partLink(entry.appearsLater) + chartLink(entry) + relatedChips(entry) + '</div>';
    card.setAttribute('aria-label', entry.term);
    card.querySelectorAll('[data-hop]').forEach(function (chip) {
      chip.addEventListener('click', function () { open(lastTrigger, GLOSSARY[chip.getAttribute('data-hop')]); });
    });
    var cl = card.querySelector('.gloss-chart');
    if (cl) cl.addEventListener('click', closeNow); // same-page anchor: close the card, let the jump happen
  }

  function positionPopover(trigger) {
    card.classList.remove('as-sheet');
    card.style.left = '0px';
    card.style.top = '0px';
    var r = trigger.getBoundingClientRect();
    var cw = card.offsetWidth, ch = card.offsetHeight;
    var gutter = 12, gap = 8;
    var vw = document.documentElement.clientWidth, vh = window.innerHeight;
    var sx = window.scrollX || window.pageXOffset || 0;
    var sy = window.scrollY || window.pageYOffset || 0;
    var left = r.left;                                   // align to the term, clamp in viewport
    if (left + cw > vw - gutter) left = vw - gutter - cw;
    if (left < gutter) left = gutter;
    var top = r.bottom + gap;                            // below the term...
    if (top + ch > vh - gutter && r.top - ch - gap > gutter) top = r.top - ch - gap; // ...flip above on overflow
    card.style.left = (left + sx) + 'px';
    card.style.top = (top + sy) + 'px';
  }

  function open(trigger, entryOverride) {
    if (!trigger) return;
    var entry = entryOverride || GLOSSARY[trigger.getAttribute('data-gloss')];
    if (!entry) return;
    lastTrigger = trigger;
    render(entry);
    triggers.forEach(function (t) { t.setAttribute('aria-expanded', 'false'); });
    trigger.setAttribute('aria-expanded', 'true');
    card.hidden = false;
    if (desktop) {
      positionPopover(trigger);
    } else {
      card.classList.add('as-sheet');
      backdrop.hidden = false;
    }
  }

  function closeNow() {
    if (!card) return;
    card.hidden = true; card.classList.remove('as-sheet');
    if (backdrop) backdrop.hidden = true;
    pinned = false;
    if (lastTrigger) lastTrigger.setAttribute('aria-expanded', 'false');
  }
  function scheduleClose() { clearTimeout(closeTimer); closeTimer = setTimeout(closeNow, 200); }

  function wire() {
    triggers.forEach(function (btn) {
      if (!GLOSSARY[btn.getAttribute('data-gloss')]) return; // unknown id: leave as text
      if (desktop) {
        btn.addEventListener('mouseenter', function () { clearTimeout(closeTimer); hoverTimer = setTimeout(function () { if (!pinned) open(btn); }, 120); });
        btn.addEventListener('mouseleave', function () { clearTimeout(hoverTimer); if (!pinned) scheduleClose(); });
        btn.addEventListener('focus', function () { open(btn); });
        btn.addEventListener('blur', function () { if (!pinned) scheduleClose(); });
        btn.addEventListener('click', function () { pinned = true; open(btn); });
      } else {
        btn.addEventListener('click', function () { open(btn); });
      }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && card && !card.hidden) { closeNow(); if (lastTrigger) lastTrigger.focus(); } });
    if (desktop) document.addEventListener('click', function (e) { if (pinned && card && !card.contains(e.target) && !e.target.classList.contains('gloss')) closeNow(); });
    window.addEventListener('resize', function () { if (card && !card.hidden && desktop && lastTrigger) positionPopover(lastTrigger); });
  }
})();
