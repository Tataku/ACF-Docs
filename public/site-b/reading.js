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

/* ACF_REFERENCE_INTEGRITY_START */
/* ACF prose-reference integrity: visually linked references become real anchors. */
(function () {
  'use strict';
  var REGISTRY_URL = '/site-b/navigation-registry.json';
  var SELECTOR = '.part-ref, .lineage-ref, [data-nav-target]';
  var FALLBACK = {
    1: '/part-1-foundation',
    2: '/part-2-lineage-macro-thesis',
    3: '/part-3-bitcoin-convexity-backbone',
    4: '/part-4-tax-architecture-roc-strategy',
    5: '/part-5-portfolio-construction-position-management',
    6: '/part-6-convexity-framework-integrity-scoring'
  };
  var registry = null;

  function routeForPart(part) {
    if (registry && Array.isArray(registry.pages)) {
      var page = registry.pages.find(function (item) {
        return Number(item.part) === Number(part) && item.route !== '/part-1-pictures';
      });
      if (page) return page.route;
    }
    return FALLBACK[Number(part)] || null;
  }

  function sectionFor(part, text) {
    var value = String(text || '').toLowerCase();
    if (part === 2) {
      if (/lineage|taleb|druckenmiller|soros|edelman/.test(value)) return '#lineage';
      if (/macro|thesis|regime/.test(value)) return '#macro-thesis';
      if (/tax/.test(value)) return '#tax';
    }
    if (part === 3) {
      if (/risk/.test(value)) return '#risks';
      if (/valuation|model|power-law|power law/.test(value)) return '#valuation';
      if (/tam|implementation/.test(value)) return '#tam';
      if (/surviv|cycle|drawdown/.test(value)) return '#survivability';
      if (/structural|specific|why bitcoin|irreplace/.test(value)) return '#irreplaceability';
      if (/justification|backbone|bitcoin/.test(value)) return '#backbone';
    }
    if (part === 4) {
      if (/wrapper|three-wrapper|architecture/.test(value)) return '#wrappers';
      if (/roth/.test(value)) return '#roth';
      if (/taxable/.test(value)) return '#taxable';
      if (/pre-tax|pretax/.test(value)) return '#pretax';
      if (/legislat|resilien/.test(value)) return '#resilience';
      if (/tax|structural edge|multiplier|roc|return of capital/.test(value)) return '#edge';
    }
    return '';
  }

  function targetFor(node) {
    var explicit = node.getAttribute('data-nav-target');
    if (explicit) return explicit;
    if (node.classList.contains('lineage-ref')) return '/part-2-lineage-macro-thesis#lineage';
    var match = String(node.textContent || '').match(/\bPart\s+([1-9]\d*)\b/i);
    if (!match) return null;
    var part = Number(match[1]);
    var route = routeForPart(part);
    return route ? route + sectionFor(part, node.textContent) : null;
  }

  function targetExists(href) {
    if (!href) return false;
    try {
      var url = new URL(href, location.href);
      if (url.origin !== location.origin && url.hostname !== 'docs.acfdashboard.com') return true;
      if (!registry || !Array.isArray(registry.pages)) return Boolean(FALLBACK);
      var route = (registry.aliases && registry.aliases[url.pathname]) || url.pathname;
      if (!registry.pages.some(function (page) { return page.route === route; })) return false;
      if (!url.hash) return true;
      return registry.sections && Array.isArray(registry.sections[route]) && registry.sections[route].indexOf(url.hash.slice(1)) !== -1;
    } catch (error) { return false; }
  }

  function neutralize(node) {
    node.classList.add('is-pending-reference');
    node.setAttribute('data-reference-state', 'pending');
    node.removeAttribute('role');
    node.removeAttribute('tabindex');
  }

  function upgrade(node) {
    if (!node || node.nodeType !== 1) return;
    if (node.tagName === 'A' && node.getAttribute('href')) {
      node.setAttribute('data-reference-state', 'live');
      return;
    }
    var href = targetFor(node);
    if (!targetExists(href)) { neutralize(node); return; }
    var anchor = document.createElement('a');
    Array.prototype.forEach.call(node.attributes, function (attribute) {
      if (attribute.name !== 'role' && attribute.name !== 'tabindex') anchor.setAttribute(attribute.name, attribute.value);
    });
    while (node.firstChild) anchor.appendChild(node.firstChild);
    anchor.href = href;
    anchor.classList.remove('is-pending-reference');
    anchor.setAttribute('data-reference-state', 'live');
    node.parentNode.replaceChild(anchor, node);
  }

  function scan(root) {
    var scope = root && root.querySelectorAll ? root : document;
    if (scope.matches && scope.matches(SELECTOR)) upgrade(scope);
    scope.querySelectorAll(SELECTOR).forEach(upgrade);
  }

  function install() {
    scan(document);
    if ('MutationObserver' in window) {
      new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
          mutation.addedNodes.forEach(function (node) { if (node.nodeType === 1) scan(node); });
        });
      }).observe(document.body, { childList: true, subtree: true });
    }
  }

  fetch(REGISTRY_URL, { credentials: 'same-origin' })
    .then(function (response) { return response.ok ? response.json() : null; })
    .then(function (value) { registry = value; install(); })
    .catch(install);
})();
/* ACF_REFERENCE_INTEGRITY_END */
