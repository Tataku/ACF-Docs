/* Site B chart island — mounts the real React FrameworkChart engine into the
 * static agency docs pages (public/site-b/*.html) as self-contained islands.
 *
 * Hydrates any element with [data-fc-chart="<spec-id>"] by rendering
 * <FrameworkChart id=… theme=… accent=…> into it. Theme follows the agency
 * page's <html data-theme="light|dark"> (the same attribute reading.js toggles),
 * re-rendering on change. Pure browser code; bundled standalone by
 * scripts/build-site-b-charts.mjs into public/site-b/site-b-charts.js.
 *
 * The bundle also CARRIES the chart card stylesheet (styles/framework-charts.css)
 * and injects it once, plus tags each host with `acf-chart-handoff`, so the live
 * cards get the EXACT same data-mode marker/popover, focus, caret and brush
 * styling as the /chart-handoff-export page (those rules live in that file and are
 * not otherwise loaded on the static Site B pages). Without it the data-mode
 * popover renders un-positioned and disrupts the chart header.
 *
 * No Nextra/Next coupling: the static pages stay static; this is an additive,
 * reversible enhancement (remove the <script> + the bundle to fully revert). */
import React from 'react';
import { createRoot } from 'react-dom/client';
import FrameworkChart from './FrameworkChart';
import chartCardCss from '../../styles/framework-charts.css';

let cssInjected = false;
function injectChartCss() {
  if (cssInjected || typeof document === 'undefined') return;
  cssInjected = true;
  const style = document.createElement('style');
  style.setAttribute('data-fc-styles', '');
  style.textContent = chartCardCss;
  document.head.appendChild(style);
}

function currentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

function mountAll() {
  const nodes = Array.prototype.slice.call(document.querySelectorAll('[data-fc-chart]'));
  if (!nodes.length) return;
  injectChartCss();
  const roots = [];
  nodes.forEach((el) => {
    const id = el.getAttribute('data-fc-chart');
    if (!id) return;
    const accent = el.getAttribute('data-fc-accent') || 'green';
    el.textContent = ''; // clear any static fallback before mounting the live chart
    // fc-live: lets the page CSS drop the static card chrome (the engine renders its own).
    // acf-chart-handoff: enables the export page's chart-scoped styles (data-mode popover,
    // disclosure caret, selection) so the card matches /chart-handoff-export exactly.
    el.classList.add('fc-live', 'acf-chart-handoff');
    const root = createRoot(el);
    const render = (theme) => root.render(React.createElement(FrameworkChart, { id, theme, accent }));
    render(currentTheme());
    roots.push(render);
  });
  // Keep chart theme in lock-step with the page's data-theme toggle.
  const mo = new MutationObserver(() => {
    const t = currentTheme();
    roots.forEach((render) => render(t));
  });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAll);
  else mountAll();
}
