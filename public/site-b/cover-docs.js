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
    input.placeholder = '';   // set per mode in openPanel: the panel has two
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
      html = group('Glossary', INDEX.glossary, q, 20);
    } else {
      html = group('Pages', INDEX.parts, q, 4) + group('Sections', INDEX.sections, q, 6) + group('Glossary', INDEX.glossary, q, 6);
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

  /* The in-flow search bar was removed after a pattern review (references put
     search in persistent chrome, and only at corpus scale). The panel remains
     solely as the Glossary tile's term browser; reintroduce a compact top-nav
     search when Parts 4-6 and the glossary page make the corpus deep enough. */
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
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closePanel();
  });

  /* Hero field: moved to the shared hero-field.js (loaded by both covers). */

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
