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
   * The pre-paint <head> script sets data-theme; this only handles the click.  */
  function theme() {
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;
    function sync() {
      var dark = root.getAttribute('data-theme') === 'dark';
      btn.setAttribute('aria-pressed', String(dark));
      btn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    }
    sync();
    btn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('acf-theme', next); } catch (e) {}
      sync();
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
    function open() {
      sidebar.setAttribute('data-open', '');
      toggle.setAttribute('aria-expanded', 'true');
      if (backdrop) backdrop.hidden = false;
      var first = sidebar.querySelector('a, button');
      if (first) first.focus();
      document.addEventListener('keydown', onKey);
    }
    function close() {
      sidebar.removeAttribute('data-open');
      toggle.setAttribute('aria-expanded', 'false');
      if (backdrop) backdrop.hidden = true;
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
    var anyRead = false;
    rows.forEach(function (row) {
      if (p[row.getAttribute('data-part')]) { row.setAttribute('data-read', ''); anyRead = true; }
    });
    var resume = document.querySelector('.resume');
    if (resume && anyRead) resume.hidden = false;
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
      function buildBlocks() {
        if (blocks) return blocks;
        blocks = [];
        document.querySelectorAll('.shell-main .section-title, .shell-main .prose-lead, .shell-main .prose p')
          .forEach(function (n) { var t = (n.textContent || '').trim(); if (t) blocks.push(t); });
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
      function resolveCapability() {
        if (capabilityPromise) return capabilityPromise;
        var ctrl = new AbortController();
        var to = setTimeout(function () { ctrl.abort(); }, 5000);
        capabilityPromise = fetch('/api/narration', { method: 'GET', signal: ctrl.signal })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (d) { method = (d && d.available) ? 'api' : (synth ? 'browser' : 'unavailable'); })
          .catch(function () { method = synth ? 'browser' : 'unavailable'; })
          .then(function () { clearTimeout(to); return method; });
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
            s === 'playing' ? 'Pause' : s === 'paused' ? 'Resume' : s === 'loading' ? 'Loading' : 'Listen';
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

      function fetchSegment(text) {
        var key = hash(text);
        if (cache.has(key)) return Promise.resolve(cache.get(key));
        if (pending.has(key)) return pending.get(key);   // dedup concurrent requests
        var ctrl = new AbortController();
        controllers.add(ctrl);
        function done() { controllers.delete(ctrl); pending.delete(key); }
        var p = fetch('/api/narration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: text }),
          signal: ctrl.signal
        }).then(function (r) {
          if (!r.ok) {
            return r.json().catch(function () { return {}; }).then(function (e) {
              var err = new Error((e && e.message) || ('HTTP ' + r.status));
              err.fallback = e && e.fallback;
              throw err;
            });
          }
          return r.blob();
        }).then(function (blob) {
          var u = URL.createObjectURL(blob);
          cache.set(key, u);
          done();
          return u;
        }, function (err) { done(); throw err; });
        pending.set(key, p);
        return p;
      }

      var LOOKAHEAD = 1; // warm this many upcoming segments while one plays
      function playApi(i, myRun) {
        if (myRun !== runId) return;
        var list = buildSegments();
        if (i >= list.length) { finish(myRun); return; }
        fetchSegment(list[i]).then(function (url) {
          if (myRun !== runId) return;
          audio = new Audio(url);
          audio.onended = function () { if (myRun === runId) playApi(i + 1, myRun); };
          audio.onerror = function () { if (myRun === runId) { setState('error'); announce('Narration error'); } };
          var p = audio.play();
          if (p && p.catch) p.catch(function () { if (myRun === runId) setState('error'); });
          setState('playing');
          // look-ahead: warm upcoming segments so playback stays gapless
          for (var k = 1; k <= LOOKAHEAD; k++) { if (list[i + k]) fetchSegment(list[i + k]).catch(function () {}); }
        }).catch(function (err) {
          if (myRun !== runId || (err && err.name === 'AbortError')) return;
          // Provider failed: fall back to Web Speech from the top (once), else quiet error.
          if (synth && ((err && err.fallback === 'browser') || i === 0)) { method = 'browser'; startBrowser(myRun); return; }
          setState('error'); announce('Narration unavailable');
        });
      }

      // --- Web Speech engine (fallback) -------------------------------------
      var bIdx = 0, bList = null;
      function startBrowser(myRun) {
        if (!synth) { setState('error'); return; }
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
        runId++; var myRun = runId;
        setState('loading'); announce('Loading audio');
        (method ? Promise.resolve(method) : resolveCapability()).then(function (m) {
          if (myRun !== runId) return;            // stopped while resolving
          if (m === 'api') playApi(0, myRun);
          else if (m === 'browser') startBrowser(myRun);
          else { setState('idle'); announce('Narration unavailable'); }
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
        runId++;                                  // invalidate async work + onended/onend
        if (audio) { try { audio.pause(); } catch (e) {} audio = null; }
        if (synth) synth.cancel();
        controllers.forEach(function (c) { try { c.abort(); } catch (e) {} });
        controllers.clear(); pending.clear();
        setState('idle'); announce('Audio stopped');
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
        (method ? Promise.resolve(method) : resolveCapability()).then(function (m) {
          if (m !== 'api') return;
          var list = buildSegments();
          if (list.length) fetchSegment(list[0]).catch(function () {});
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
        else if (STATE === 'loading') stop();     // cancel a pending load
        else start();                             // idle / error
      });
      // Warm the first segment ahead of the click on hover/focus intent.
      listenBtn.addEventListener('mouseenter', prewarm);
      listenBtn.addEventListener('focus', prewarm);
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
        subscribe:   function (cb) { onTick = cb; if (cb) cb(); }
      };

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
      if (active) { nav.hidden = false; nav.setAttribute('data-armed', ''); nav.setAttribute('data-visible', ''); nav.setAttribute('data-pinned', ''); }
      else { nav.removeAttribute('data-armed'); nav.removeAttribute('data-pinned'); if (window.scrollY <= 600) nav.removeAttribute('data-visible'); }
      player.setAttribute('data-state', st);
      playBtn.setAttribute('aria-label', st === 'playing' ? 'Pause narration' : 'Play narration');
      playBtn.setAttribute('aria-pressed', st === 'playing' ? 'true' : 'false');
      var hasDur = isFinite(dur) && dur > 0.1;
      input.disabled = !hasDur;
      if (scrubbing) return;                          // don't fight the user's drag
      if (hasDur) {
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
  sectionReveal();
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
  var BUILT_PARTS = { 1: true, 2: true, 3: true }; // flip more true as parts ship

  // chart idx -> built exhibit anchor (mirrors BUILT_PARTS). Ids match the
  // chart-handoff inventory's `idx`; glossary entries reference them via `chart`.
  // Unbuilt chart ids render nothing (current behavior, unchanged).
  var BUILT_CHARTS = {
    'S1': { page: '/part-1-foundation', hash: '#exhibit-s1', label: 'S1 · Shape the Payoff' },
    '01': { page: '/part-1-foundation', hash: '#exhibit-01', label: '01 · The Hedge Broke' },
    '02': { page: '/part-1-pictures', hash: '#exhibit-02', label: '02 · Correlation Turns' },
    '03': { page: '/part-1-pictures', hash: '#exhibit-03', label: '03 · Inflation Was Bigger' },
    '04': { page: '/part-1-pictures', hash: '#exhibit-04', label: '04 · The Bill Came Due' },
    '05': { page: '/part-1-foundation', hash: '#exhibit-05', label: '05 · Path Changes Everything' },
    '06': { page: '/part-1-foundation', hash: '#exhibit-06', label: '06 · Survive the Path' }
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
