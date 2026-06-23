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
