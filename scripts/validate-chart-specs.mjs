/* ───────────────────────────────────────────────────────────────────────────
 * Framework chart spec validator (zero-dependency, node:assert).
 *
 *   node scripts/validate-chart-specs.mjs   (or: npm run validate:charts)
 *
 * Enforces the locked doctrine at build/check time:
 *   · real-data charts must carry at least one verifiable source
 *   · non-real / representative charts must disclose (truthDisclosure)
 *   · every chart has explainer copy + a citation footer
 *   · every hover target has a label
 *   · chart IDs are stable and unique
 * ─────────────────────────────────────────────────────────────────────────── */
import assert from 'node:assert/strict';
import { FRAMEWORK_CHART_SPECS } from '../components/framework-charts/chart-specs.mjs';

const REAL_TYPES = new Set(['real']);
let checks = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); checks++; };

assert.ok(Array.isArray(FRAMEWORK_CHART_SPECS) && FRAMEWORK_CHART_SPECS.length > 0, 'registry is empty');

// chart IDs are stable and unique
const ids = FRAMEWORK_CHART_SPECS.map((s) => s.chartId);
ok(new Set(ids).size === ids.length, `duplicate chartId(s): ${ids.join(', ')}`);
ids.forEach((id) => ok(typeof id === 'string' && /^[a-z0-9-]+$/.test(id), `chartId not stable/kebab: ${id}`));

for (const s of FRAMEWORK_CHART_SPECS) {
  const where = `[${s.chartId}]`;

  // claim + takeaway + explainer copy
  ok(s.frameworkClaim && s.readerTakeaway, `${where} missing claim/takeaway`);
  ok(s.explainerHeadline && s.explainerHeadline.trim().length > 0, `${where} missing explainer headline`);
  ok(s.explainerBody && s.explainerBody.trim().length > 10, `${where} missing explainer body`);

  // citation footer present
  ok(s.citationFooter && s.citationFooter.trim().length > 0, `${where} missing citationFooter`);

  // real-data charts must have >= 1 source
  if (REAL_TYPES.has(s.dataType)) {
    ok(Array.isArray(s.sources) && s.sources.length >= 1, `${where} real-data chart has no source`);
    s.sources.forEach((src, i) => ok(src.provider, `${where} source[${i}] missing provider`));
    // at least one source must be externally verifiable (has a url) OR be an explicit author calculation
    ok(s.sources.some((src) => src.url || src.role === 'author-calculation'), `${where} no verifiable/declared source`);
  }

  // non-real OR representative-status charts must disclose
  const mustDisclose = !REAL_TYPES.has(s.dataType) || s.dataStatus !== 'live';
  if (mustDisclose) {
    ok(s.truthDisclosure && s.truthDisclosure.trim().length > 0, `${where} undisclosed non-real/representative data`);
  }

  // hover targets all have labels; ids unique
  ok(Array.isArray(s.hoverTargets) && s.hoverTargets.length >= 1, `${where} no hover targets`);
  const tids = s.hoverTargets.map((t) => t.id);
  ok(new Set(tids).size === tids.length, `${where} duplicate hoverTarget id(s)`);
  s.hoverTargets.forEach((t) => {
    ok(t.label && t.label.trim().length > 0, `${where} hoverTarget ${t.id} missing label`);
    ok(t.kind, `${where} hoverTarget ${t.id} missing kind`);
  });

  // mobile tap targets must reference real hover targets, and not rely on hover
  ok(Array.isArray(s.mobileTapTargets) && s.mobileTapTargets.length >= 1, `${where} no mobileTapTargets`);
  s.mobileTapTargets.forEach((id) => ok(tids.includes(id), `${where} mobileTapTarget ${id} has no hoverTarget`));

  // series integrity: every plotted series has points; primary exists
  const seriesList = s.layout === 'dual' ? s.panels.flatMap((p) => p.series) : s.series;
  ok(seriesList.length >= 1, `${where} no series`);
  seriesList.forEach((ser) => ok(Array.isArray(ser.pts) && ser.pts.length > 2, `${where} series ${ser.key} has no data`));
  ok(seriesList.some((ser) => ser.key === s.primaryKey), `${where} primaryKey ${s.primaryKey} not found`);

  // every series-kind hover target references an existing series key
  s.hoverTargets.filter((t) => t.kind === 'series').forEach((t) => {
    ok(seriesList.some((ser) => ser.key === t.seriesKey), `${where} hoverTarget ${t.id} references missing series ${t.seriesKey}`);
  });

  // dual charts share an x-domain across panels (one chart = one claim)
  if (s.layout === 'dual') {
    ok(s.xDomain && typeof s.xDomain.xMin === 'number', `${where} dual chart missing shared xDomain`);
    ok(s.panels.length === 2, `${where} dual chart expects 2 panels`);
  }
}

console.log(`✓ framework chart specs valid — ${FRAMEWORK_CHART_SPECS.length} charts, ${checks} assertions passed`);
console.log(`  charts: ${ids.join(', ')}`);
