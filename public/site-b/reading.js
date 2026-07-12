/* ============================================================================
   ACF READING SYSTEM — canonical navigation bootstrap

   The historical reading runtime is preserved verbatim at reading-core.js.
   This bootstrap builds the live cross-reference layer first, then loads the
   core so every glossary trigger, chart source, and internal link is wired from
   the generated navigation registry rather than a hand-maintained subset.
   ============================================================================ */
(function () {
  'use strict';

  var CORE_URL = '/site-b/reading-core.js';
  var GLOSSARY_URL = '/site-b/acf-glossary.json';
  var REGISTRY_URL = '/site-b/navigation-registry.json';
  var registry = null;
  var glossary = null;
  var lastGlossaryTrigger = null;

  function getJson(url) {
    return fetch(url, { credentials: 'same-origin' })
      .then(function (response) {
        if (!response.ok) throw new Error(url + ' returned ' + response.status);
        return response.json();
      })
      .catch(function () { return null; });
  }

  function loadCore() {
    return new Promise(function (resolve) {
      var script = document.createElement('script');
      script.src = CORE_URL;
      script.async = false;
      script.onload = resolve;
      script.onerror = resolve; // Static HTML remains navigable even if enhancement fails.
      document.head.appendChild(script);
    });
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function glossaryRoots() {
    var main = document.querySelector('main');
    return main ? [main] : [document.body];
  }

  function isEligibleTextNode(node) {
    var parent = node.parentElement;
    if (!parent || !node.nodeValue || !node.nodeValue.trim()) return false;
    if (parent.closest('a, button, code, pre, script, style, svg, .fc-mount, .part-actions, nav, footer')) return false;
    return Boolean(parent.closest('.prose, .callout, .compare, .failure-modes, .architecture-list, .proc-steps, .doc-header, .next-up'));
  }

  function termCandidates(entry) {
    var values = [entry.term].concat(entry.aliases || []);
    var seen = {};
    return values.filter(function (value) {
      var key = String(value || '').trim().toLowerCase();
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    }).sort(function (a, b) { return b.length - a.length; });
  }

  function wrapFirstGlossaryOccurrence(entry) {
    var rootList = glossaryRoots();
    var candidates = termCandidates(entry);
    if (!candidates.length) return false;
    var pattern = new RegExp('(^|[^A-Za-z0-9])(' + candidates.map(escapeRegExp).join('|') + ')(?=$|[^A-Za-z0-9])', 'i');

    for (var r = 0; r < rootList.length; r += 1) {
      var walker = document.createTreeWalker(rootList[r], NodeFilter.SHOW_TEXT, {
        acceptNode: function (node) {
          return isEligibleTextNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      });
      var node;
      while ((node = walker.nextNode())) {
        var match = pattern.exec(node.nodeValue);
        if (!match) continue;
        var start = match.index + match[1].length;
        var end = start + match[2].length;
        var fragment = document.createDocumentFragment();
        fragment.appendChild(document.createTextNode(node.nodeValue.slice(0, start)));
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'gloss';
        button.setAttribute('data-gloss', entry.id);
        button.setAttribute('aria-expanded', 'false');
        button.textContent = node.nodeValue.slice(start, end);
        fragment.appendChild(button);
        fragment.appendChild(document.createTextNode(node.nodeValue.slice(end)));
        node.parentNode.replaceChild(fragment, node);
        return true;
      }
    }
    return false;
  }

  function wireGlossaryTerms() {
    if (!glossary || !Array.isArray(glossary.terms)) return;
    var existing = {};
    document.querySelectorAll('.gloss[data-gloss]').forEach(function (trigger) {
      existing[trigger.getAttribute('data-gloss')] = true;
    });
    glossary.terms.forEach(function (entry) {
      if (!entry || !entry.id || existing[entry.id]) return;
      if (wrapFirstGlossaryOccurrence(entry)) existing[entry.id] = true;
    });
  }

  function desiredHrefMatches(anchor, href) {
    if (!anchor || !href) return false;
    try {
      var actual = new URL(anchor.getAttribute('href'), location.href);
      var desired = new URL(href, location.href);
      return actual.pathname === desired.pathname && actual.hash === desired.hash;
    } catch (error) {
      return anchor.getAttribute('href') === href;
    }
  }

  function appendGlossaryLink(layer, className, meta) {
    if (!layer || !meta || !meta.href) return;
    var found = Array.prototype.some.call(layer.querySelectorAll('a.' + className.split(' ').join('.')), function (anchor) {
      return desiredHrefMatches(anchor, meta.href);
    });
    if (found) return;
    var anchor = document.createElement('a');
    anchor.className = className;
    anchor.href = meta.href;
    anchor.textContent = meta.label;
    layer.appendChild(anchor);
  }

  function glossaryIdFromCard(card) {
    if (!card || !glossary || !Array.isArray(glossary.terms)) return null;
    var label = card.querySelector('.gloss-term');
    var text = label ? label.textContent.trim().toLowerCase() : '';
    var match = glossary.terms.find(function (entry) {
      return String(entry.term || '').trim().toLowerCase() === text;
    });
    return match ? match.id : null;
  }

  function patchGlossaryCard() {
    if (!registry || !registry.glossary) return;
    var card = document.querySelector('.gloss-card:not([hidden])');
    if (!card) return;
    var id = lastGlossaryTrigger && lastGlossaryTrigger.getAttribute('data-gloss');
    if (!id || !registry.glossary[id]) id = glossaryIdFromCard(card);
    var meta = id && registry.glossary[id];
    if (!meta) return;
    var layer = card.querySelector('.gloss-layer2');
    if (!layer) return;

    if (meta.later && meta.later.href) {
      layer.querySelectorAll('.gloss-later.is-pending').forEach(function (node) { node.remove(); });
      appendGlossaryLink(layer, 'gloss-later', meta.later);
    }
    if (meta.chart && meta.chart.href) {
      layer.querySelectorAll('a.gloss-chart').forEach(function (anchor) {
        if (!desiredHrefMatches(anchor, meta.chart.href)) anchor.remove();
      });
      appendGlossaryLink(layer, 'gloss-later gloss-chart', meta.chart);
    }
    normalizeLinks(layer);
  }

  function canonicalAlias(raw) {
    if (!registry || !registry.aliases || !raw) return raw;
    return registry.aliases[raw] || raw;
  }

  function normalizeAnchor(anchor) {
    var raw = anchor.getAttribute('href');
    if (!raw) return;
    var canonical = canonicalAlias(raw);
    if (canonical !== raw) {
      anchor.setAttribute('href', canonical);
      raw = canonical;
    }
    if (/^(mailto:|tel:)/i.test(raw)) {
      anchor.removeAttribute('target');
      anchor.removeAttribute('rel');
      return;
    }
    if (/^javascript:/i.test(raw) || raw === '#') return;

    try {
      var url = new URL(raw, location.href);
      var docsHost = url.hostname === 'docs.acfdashboard.com';
      if (url.origin === location.origin || docsHost) {
        var relative = canonicalAlias(url.pathname) + url.search + url.hash;
        anchor.setAttribute('href', relative || '/');
        anchor.removeAttribute('target');
        anchor.removeAttribute('rel');
      } else if (/^https?:$/i.test(url.protocol)) {
        anchor.setAttribute('target', '_blank');
        anchor.setAttribute('rel', 'noopener noreferrer');
      }
    } catch (error) {
      // The build-time audit rejects malformed hrefs; preserve readable markup here.
    }
  }

  function normalizeLinks(root) {
    var scope = root || document;
    scope.querySelectorAll('a[href]').forEach(normalizeAnchor);
  }

  function scheduleGlossaryPatch(trigger) {
    if (trigger) lastGlossaryTrigger = trigger;
    window.setTimeout(patchGlossaryCard, 0);
    window.setTimeout(patchGlossaryCard, 180);
  }

  function installRuntimeNavigation() {
    normalizeLinks(document);

    ['pointerover', 'focusin', 'click'].forEach(function (eventName) {
      document.addEventListener(eventName, function (event) {
        var trigger = event.target && event.target.closest && event.target.closest('.gloss[data-gloss]');
        if (trigger) scheduleGlossaryPatch(trigger);
      }, true);
    });

    if ('MutationObserver' in window) {
      var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
          mutation.addedNodes.forEach(function (node) {
            if (node.nodeType !== 1) return;
            if (node.matches && node.matches('a[href]')) normalizeAnchor(node);
            normalizeLinks(node);
          });
        });
        patchGlossaryCard();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  Promise.all([getJson(REGISTRY_URL), getJson(GLOSSARY_URL)])
    .then(function (values) {
      registry = values[0];
      glossary = values[1];
      window.ACF_NAVIGATION_REGISTRY = registry;
      wireGlossaryTerms();
      return loadCore();
    })
    .then(installRuntimeNavigation)
    .catch(function () { loadCore().then(installRuntimeNavigation); });
})();
