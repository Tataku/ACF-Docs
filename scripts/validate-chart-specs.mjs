/* ───────────────────────────────────────────────────────────────────────────
 * Framework chart spec validator (zero-dependency, node:assert).
 *
 *   node scripts/validate-chart-specs.mjs   (or: npm run validate:charts)
 *
 * Enforces the representative-data model + handoff metadata:
 *   · stable, unique chartId · intendedPlacement · group · status
 *   · claim + explainer copy + a disclosed footer statement
 *   · visualDataMode is one of the allowed modes and is disclosed truthfully
 *       - historical  → at least one verifiable (url) backing/target source
 *       - representative → discloses; sources support the concept
 *       - simulation  → discloses; carries a methodology source
 *       - conceptual  → discloses; any sources carry a role
 *   · every source has a provider + role
 *   · every hover target has a label + kind; ids unique; mobile taps resolve
 *   · series/waypoints/nodes exist; primaryKey resolves
 * ─────────────────────────────────────────────────────────────────────────── */
import assert from 'node:assert/strict';
import { FRAMEWORK_CHART_SPECS, footerModel } from '../components/framework-charts/chart-specs.mjs';

const PLACEMENTS = new Set(['docs-landing', 'part-1', 'part-2', 'both']);
const GROUPS = new Set(['signature', 'docs-landing', 'part-1', 'part-2']);
const STATUSES = new Set(['implemented', 'needs-design-review', 'spec-only']);
const MODES = new Set(['representative', 'historical', 'simulation', 'conceptual']);
const ROLES = new Set(['verifies-concept', 'backs-series', 'methodology', 'target-source']);

let checks = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); checks++; };

assert.ok(Array.isArray(FRAMEWORK_CHART_SPECS) && FRAMEWORK_CHART_SPECS.length > 0, 'registry is empty');

const ids = FRAMEWORK_CHART_SPECS.map((s) => s.chartId);
ok(new Set(ids).size === ids.length, `duplicate chartId(s): ${ids.join(', ')}`);
ids.forEach((id) => ok(typeof id === 'string' && /^[a-z0-9-]+$/.test(id), `chartId not stable/kebab: ${id}`));

for (const s of FRAMEWORK_CHART_SPECS) {
  const w = `[${s.chartId}]`;

  // handoff metadata
  ok(PLACEMENTS.has(s.intendedPlacement), `${w} bad intendedPlacement: ${s.intendedPlacement}`);
  ok(GROUPS.has(s.group), `${w} bad group: ${s.group}`);
  ok(STATUSES.has(s.status), `${w} bad status: ${s.status}`);
  ok(typeof s.wiredPublic === 'boolean', `${w} wiredPublic must be boolean`);

  // claim + explainer copy
  ok(s.frameworkClaim && s.readerTakeaway, `${w} missing claim/takeaway`);
  ok(s.explainerHeadline && s.explainerHeadline.trim(), `${w} missing explainer headline`);
  ok(s.explainerBody && s.explainerBody.trim().length > 10, `${w} missing explainer body`);

  // data mode + disclosed footer
  ok(MODES.has(s.visualDataMode), `${w} bad visualDataMode: ${s.visualDataMode}`);
  const fm = footerModel(s);
  ok(fm.statement && fm.statement.trim(), `${w} empty footer statement`);
  if (s.visualDataMode !== 'historical') {
    ok(s.disclosure && s.disclosure.trim(), `${w} non-historical chart must disclose`);
  }

  // sources + roles
  const sources = s.sources || [];
  sources.forEach((src, i) => {
    ok(src.provider, `${w} source[${i}] missing provider`);
    ok(ROLES.has(src.role), `${w} source[${i}] bad/missing role: ${src.role}`);
  });
  if (s.visualDataMode === 'historical') {
    ok(sources.some((src) => (src.role === 'backs-series' || src.role === 'target-source') && src.url), `${w} historical chart needs a verifiable backing source (url)`);
  }
  if (s.visualDataMode === 'representative') {
    ok(sources.length >= 1, `${w} representative chart should cite supporting sources`);
  }
  if (s.visualDataMode === 'simulation') {
    ok(sources.some((src) => src.role === 'methodology'), `${w} simulation needs a methodology source`);
  }

  // hover targets
  ok(Array.isArray(s.hoverTargets) && s.hoverTargets.length >= 1, `${w} no hover targets`);
  const tids = s.hoverTargets.map((t) => t.id);
  ok(new Set(tids).size === tids.length, `${w} duplicate hoverTarget id(s)`);
  s.hoverTargets.forEach((t) => {
    ok(t.label && t.label.trim(), `${w} hoverTarget ${t.id} missing label`);
    ok(t.kind, `${w} hoverTarget ${t.id} missing kind`);
  });
  ok(Array.isArray(s.mobileTapTargets) && s.mobileTapTargets.length >= 1, `${w} no mobileTapTargets`);
  s.mobileTapTargets.forEach((id) => ok(tids.includes(id), `${w} mobileTapTarget ${id} has no hoverTarget`));

  // layout-specific data integrity + primaryKey
  if (s.layout === 'quadrant') {
    const wps = Object.keys(s.quadrant.waypoints || {});
    ok(s.quadrant && s.quadrant.path && s.quadrant.path.length >= 2, `${w} quadrant needs a path`);
    s.quadrant.path.forEach((id) => ok(wps.includes(id), `${w} quadrant path references missing waypoint ${id}`));
    ok(wps.includes(s.primaryKey), `${w} primaryKey ${s.primaryKey} not a waypoint`);
  } else if (['loop', 'flow', 'systemLoop', 'bridge', 'gate'].includes(s.layout)) {
    // node-based framework diagrams
    const nodeIds = s.layout === 'flow' ? (s.flow.stages || []).flatMap((st) => st.nodes.map((nd) => nd.id))
      : s.layout === 'loop' ? (s.loop.nodes || []).map((n) => n.id)
        : s.layout === 'systemLoop' ? (s.systemLoop.nodes || []).map((n) => n.id)
          : s.layout === 'bridge' ? (s.bridge.stages || []).map((n) => n.id)
            : (s.gate.nodes || []).map((n) => n.id);
    ok(nodeIds.length >= 3, `${w} ${s.layout} needs at least 3 nodes`);
    ok(new Set(nodeIds).size === nodeIds.length, `${w} ${s.layout} has duplicate node ids`);
    ok(nodeIds.includes(s.primaryKey), `${w} primaryKey ${s.primaryKey} not a ${s.layout} node`);
  } else {
    const seriesList = s.layout === 'dual' ? s.panels.flatMap((p) => p.series) : s.series;
    ok(seriesList && seriesList.length >= 1, `${w} no series`);
    seriesList.forEach((ser) => ok(Array.isArray(ser.pts) && ser.pts.length > 2, `${w} series ${ser.key} has no data`));
    ok(seriesList.some((ser) => ser.key === s.primaryKey), `${w} primaryKey ${s.primaryKey} not found`);
    s.hoverTargets.filter((t) => t.kind === 'series').forEach((t) => ok(seriesList.some((ser) => ser.key === t.seriesKey), `${w} hoverTarget ${t.id} references missing series ${t.seriesKey}`));
    if (s.layout === 'dual') { ok(s.xDomain && typeof s.xDomain.xMin === 'number', `${w} dual chart missing shared xDomain`); ok(s.panels.length === 2, `${w} dual chart expects 2 panels`); }
  }
}

// group coverage (what the agency reviews)
const byGroup = (g) => FRAMEWORK_CHART_SPECS.filter((s) => s.group === g).map((s) => s.chartId);
['signature', 'docs-landing', 'part-1', 'part-2'].forEach((g) => ok(byGroup(g).length >= 1, `group ${g} has no charts`));

console.log(`✓ framework chart specs valid — ${FRAMEWORK_CHART_SPECS.length} charts, ${checks} assertions passed`);
console.log(`  signature   : ${byGroup('signature').join(', ')}`);
console.log(`  docs-landing: ${byGroup('docs-landing').join(', ')}`);
console.log(`  part-1      : ${byGroup('part-1').join(', ')}`);
console.log(`  part-2      : ${byGroup('part-2').join(', ')}`);
console.log(`  wired public: ${FRAMEWORK_CHART_SPECS.filter((s) => s.wiredPublic).map((s) => s.chartId).join(', ') || '(none)'}`);
