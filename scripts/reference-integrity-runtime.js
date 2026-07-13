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
