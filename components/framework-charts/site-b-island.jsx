/* Site B chart island — mounts the real React FrameworkChart engine into the
 * static agency docs pages (public/site-b/*.html) as self-contained islands.
 *
 * Hydrates any element with [data-fc-chart="<spec-id>"] by rendering
 * <FrameworkChart id=… theme=… accent=…> into it. Theme follows the agency
 * page's <html data-theme="light|dark"> (the same attribute reading.js toggles),
 * re-rendering on change. Pure browser code; bundled standalone by
 * scripts/build-site-b-charts.mjs into public/site-b/site-b-charts.js.
 *
 * No Nextra/Next coupling: the static pages stay static; this is an additive,
 * reversible enhancement (remove the <script> + the bundle to fully revert). */
import React from 'react';
import { createRoot } from 'react-dom/client';
import FrameworkChart from './FrameworkChart';

function currentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

function mountAll() {
  const nodes = Array.prototype.slice.call(document.querySelectorAll('[data-fc-chart]'));
  if (!nodes.length) return;
  const roots = [];
  nodes.forEach((el) => {
    const id = el.getAttribute('data-fc-chart');
    if (!id) return;
    const accent = el.getAttribute('data-fc-accent') || 'green';
    el.textContent = ''; // clear any static fallback before mounting the live chart
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
