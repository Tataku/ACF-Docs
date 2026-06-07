/* Emit a machine-readable chart inventory for the agency handoff package.
 *   node scripts/build-chart-inventory.mjs   (or: npm run build:inventory)
 * Output: public/agency-chart-handoff/chart-inventory.json (committed).
 *
 * Richer than the spec literal: it resolves engine doctrine (claimStack,
 * interaction, motionProfile, backgroundRoles) so the agency can see one chart =
 * one claim, what the reader can touch, and how it moves — without reading code. */
import { writeFileSync, mkdirSync } from 'node:fs';
import {
  FRAMEWORK_CHART_SPECS, footerModel,
  resolveClaimStack, resolveInteraction, resolveMotionProfile, resolveBackgroundRoles,
  INTERACTION_TYPES, MOTION_TYPES, BACKGROUND_ROLES, DATA_MODES,
} from '../components/framework-charts/chart-specs.mjs';

const charts = FRAMEWORK_CHART_SPECS.map((s) => {
  const fm = footerModel(s);
  const claim = resolveClaimStack(s);
  const interaction = resolveInteraction(s);
  const motion = resolveMotionProfile(s);
  return {
    chartId: s.chartId,
    idx: s.idx,
    title: s.title,
    group: s.group,
    part: s.intendedPlacement,
    status: s.status,
    wiredPublic: s.wiredPublic,
    layout: s.layout,
    dataMode: s.visualDataMode,
    claimLabel: s.claimLabel,
    // one chart = one claim, plus the visual proof + reader action (resolved)
    primaryClaim: claim.primaryClaim,
    visualProof: claim.visualProof,
    readerAction: claim.readerAction,
    readerTakeaway: s.readerTakeaway,
    // interaction must match concept
    interaction: { type: interaction.type, gesture: interaction.gesture, conceptMatch: interaction.conceptMatch || null },
    // motion follows comprehension
    motionProfile: { type: motion.type, duration: motion.duration || null },
    // a background is allowed only if it explains a relationship (never decorative)
    backgroundRoles: resolveBackgroundRoles(s),
    // reader simulation context (null = not personalized)
    readerContext: s.personalization ? { kind: s.personalization.kind, uses: s.personalization.uses } : null,
    // data honesty
    disclosureMode: fm.mode,
    disclosure: fm.statement,
    sources: (s.sources || []).map((src) => ({
      provider: src.provider, label: src.label || null, seriesId: src.seriesId || null,
      role: src.role, url: src.url || null,
    })),
    agencyNotes: s.implementationNotes || null,
  };
});

const out = {
  name: 'ACF Framework Charts — handoff inventory',
  note: 'Representative/illustrative exhibits. dataMode + disclosure define how each chart is presented. claimStack, interaction, motionProfile, and backgroundRoles are resolved engine doctrine — explicit per-spec overrides win. See README-agency-chart-handoff.md.',
  doctrine: {
    interactionTypes: INTERACTION_TYPES,
    motionTypes: MOTION_TYPES,
    backgroundRoles: BACKGROUND_ROLES,
    dataModes: DATA_MODES,
  },
  count: charts.length,
  charts,
};

mkdirSync('public/agency-chart-handoff', { recursive: true });
writeFileSync('public/agency-chart-handoff/chart-inventory.json', `${JSON.stringify(out, null, 2)}\n`);
console.log(`✓ wrote public/agency-chart-handoff/chart-inventory.json — ${charts.length} charts`);
