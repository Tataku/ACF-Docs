/* Emit a machine-readable chart inventory for the agency handoff package.
 *   node scripts/build-chart-inventory.mjs   (or: npm run build:inventory)
 * Output: public/agency-chart-handoff/chart-inventory.json (committed). */
import { writeFileSync, mkdirSync } from 'node:fs';
import { FRAMEWORK_CHART_SPECS } from '../components/framework-charts/chart-specs.mjs';

const charts = FRAMEWORK_CHART_SPECS.map((s) => ({
  chartId: s.chartId,
  idx: s.idx,
  title: s.title,
  group: s.group,
  intendedPlacement: s.intendedPlacement,
  status: s.status,
  wiredPublic: s.wiredPublic,
  layout: s.layout,
  visualDataMode: s.visualDataMode,
  claimLabel: s.claimLabel,
  frameworkClaim: s.frameworkClaim,
  readerTakeaway: s.readerTakeaway,
  chartType: s.chartType,
  setupLine: s.setupLine,
  explainerHeadline: s.explainerHeadline,
  disclosure: s.disclosure,
  sources: (s.sources || []).map((src) => ({
    provider: src.provider, label: src.label || null, seriesId: src.seriesId || null,
    role: src.role, url: src.url || null,
  })),
}));

const out = {
  name: 'ACF Framework Charts — handoff inventory',
  note: 'Representative/illustrative exhibits. visualDataMode + disclosure define how each chart is presented. See README-agency-chart-handoff.md.',
  count: charts.length,
  charts,
};

mkdirSync('public/agency-chart-handoff', { recursive: true });
writeFileSync('public/agency-chart-handoff/chart-inventory.json', `${JSON.stringify(out, null, 2)}\n`);
console.log(`✓ wrote public/agency-chart-handoff/chart-inventory.json — ${charts.length} charts`);
