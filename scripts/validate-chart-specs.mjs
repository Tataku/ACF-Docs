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
import {
  FRAMEWORK_CHART_SPECS, footerModel,
  DATA_MODES, SOURCE_ROLES, CONTEXT_KEYS, LEGACY_CONTEXT_KEYS, PERSONAL_KINDS,
  INTERACTION_TYPES, GESTURES, MOTION_TYPES, MOTION_DURATIONS, BACKGROUND_ROLES, BANNED_PROMISE_WORDS,
  resolveClaimStack, resolveInteraction, resolveMotionProfile, resolveBackgroundRoles, getSimulationIntro,
} from '../components/framework-charts/chart-specs.mjs';

const PLACEMENTS = new Set(['docs-landing', 'part-1', 'part-2', 'part-3', 'both']);
const GROUPS = new Set(['signature', 'docs-landing', 'part-1', 'part-2', 'part-3']);
const STATUSES = new Set(['implemented', 'needs-design-review', 'spec-only', 'deferred']);
const MODES = new Set(DATA_MODES);
const ROLES = new Set(SOURCE_ROLES);
const CTX = new Set([...CONTEXT_KEYS, ...LEGACY_CONTEXT_KEYS]);
const KINDS = new Set(PERSONAL_KINDS);

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

  // optional reader-context personalization
  if (s.personalization) {
    const pz = s.personalization;
    ok(Array.isArray(pz.uses) && pz.uses.length >= 1, `${w} personalization.uses must be a non-empty array`);
    (pz.uses || []).forEach((u) => ok(CTX.has(u), `${w} personalization uses unknown context key: ${u}`));
    ok(KINDS.has(pz.kind), `${w} personalization has bad kind: ${pz.kind}`);
    ok(typeof pz.note === 'string' && pz.note.trim(), `${w} personalization needs a note string`);
    if (pz.withdrawalRate != null) ok(typeof pz.withdrawalRate === 'number' && pz.withdrawalRate > 0 && pz.withdrawalRate < 1, `${w} personalization.withdrawalRate must be 0..1`);
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
  } else if (['loop', 'flow', 'systemLoop', 'bridge', 'gate', 'scorecard', 'scenario'].includes(s.layout)) {
    // node-based framework diagrams + scorecard matrix + interactive scenario
    const nodeIds = s.layout === 'flow' ? (s.flow.stages || []).flatMap((st) => st.nodes.map((nd) => nd.id))
      : s.layout === 'loop' ? (s.loop.nodes || []).map((n) => n.id)
        : s.layout === 'systemLoop' ? (s.systemLoop.nodes || []).map((n) => n.id)
          : s.layout === 'bridge' ? (s.bridge.stages || []).map((n) => n.id)
            : s.layout === 'gate' ? (s.gate.nodes || []).map((n) => n.id)
              : s.layout === 'scorecard' ? (s.scorecard.requirements || []).map((r) => r.id)
                : (s.scenario.presets || []).map((p) => p.id);
    ok(nodeIds.length >= 3, `${w} ${s.layout} needs at least 3 nodes`);
    ok(new Set(nodeIds).size === nodeIds.length, `${w} ${s.layout} has duplicate node ids`);
    ok(nodeIds.includes(s.primaryKey), `${w} primaryKey ${s.primaryKey} not a ${s.layout} node`);
    if (s.layout === 'scorecard') {
      ok(Array.isArray(s.scorecard.assets) && s.scorecard.assets.length >= 2, `${w} scorecard needs assets`);
      s.scorecard.requirements.forEach((r) => s.scorecard.assets.forEach((a) => ok(typeof r.scores[a.id] === 'number', `${w} scorecard ${r.id} missing score for ${a.id}`)));
    }
    if (s.layout === 'scenario') {
      ok(s.scenario.defaultPreset && nodeIds.includes(s.scenario.defaultPreset), `${w} scenario defaultPreset invalid`);
      ok(s.scenario.variants && Object.keys(s.scenario.variants).length >= 2, `${w} scenario needs variants`);
    }
  } else if (s.layout === 'heartbeat') {
    // representative valuation heartbeat + DCA unit pulses
    ok(s.heartbeat && Array.isArray(s.heartbeat.price) && s.heartbeat.price.length > 2, `${w} heartbeat needs a price path`);
    ok(Array.isArray(s.heartbeat.pulses) && s.heartbeat.pulses.length >= 4, `${w} heartbeat needs pulses`);
    ok(s.hoverTargets.some((t) => t.id === s.primaryKey), `${w} primaryKey ${s.primaryKey} not a hover target`);
  } else if (s.layout === 'sequenceRisk') {
    // one shared return set, two orders, paths generated from it
    const sq = s.sequence;
    ok(sq && Array.isArray(sq.good) && Array.isArray(sq.bad) && sq.good.length === sq.bad.length && sq.good.length >= 4, `${w} sequenceRisk needs equal-length good/bad return sets`);
    ok(Array.isArray(sq.goodPath) && Array.isArray(sq.badPath) && sq.goodPath.length === sq.good.length + 1, `${w} sequenceRisk needs generated paths`);
    ok(s.hoverTargets.some((t) => t.id === s.primaryKey), `${w} primaryKey ${s.primaryKey} not a hover target`);
  } else {
    const seriesList = s.layout === 'dual' ? s.panels.flatMap((p) => p.series) : s.series;
    ok(seriesList && seriesList.length >= 1, `${w} no series`);
    seriesList.forEach((ser) => ok(Array.isArray(ser.pts) && ser.pts.length > 2, `${w} series ${ser.key} has no data`));
    ok(seriesList.some((ser) => ser.key === s.primaryKey), `${w} primaryKey ${s.primaryKey} not found`);
    s.hoverTargets.filter((t) => t.kind === 'series').forEach((t) => ok(seriesList.some((ser) => ser.key === t.seriesKey), `${w} hoverTarget ${t.id} references missing series ${t.seriesKey}`));
    if (s.layout === 'dual') {
      ok(s.xDomain && typeof s.xDomain.xMin === 'number', `${w} dual chart missing shared xDomain`);
      ok(s.panels.length === 2, `${w} dual chart expects 2 panels`);
      if (s.perspectiveSlider) {
        ok(s.perspectiveSlider === true, `${w} perspectiveSlider must be boolean`);
        ok(s.perspectiveDefault == null || (typeof s.perspectiveDefault === 'number' && s.perspectiveDefault >= 0 && s.perspectiveDefault <= 1), `${w} perspectiveDefault must be 0..1`);
      }
    }
  }

  // ── engine doctrine (vNext): claim stack · interaction · motion · honesty ───
  // Every chart resolves a primary claim + a visual proof (one chart = one claim,
  // show the mechanism). Explicit claimStack fields, when present, must be strings.
  const cs = resolveClaimStack(s);
  ok(cs.primaryClaim && cs.primaryClaim.trim(), `${w} no resolvable primaryClaim`);
  ok(cs.visualProof && cs.visualProof.trim(), `${w} no resolvable visualProof (chartType or claimStack.visualProof)`);
  if (s.claimStack) {
    ['primaryClaim', 'visualProof', 'interactionRole', 'readerAction', 'caution'].forEach((k) => {
      if (s.claimStack[k] != null) ok(typeof s.claimStack[k] === 'string' && s.claimStack[k].trim(), `${w} claimStack.${k} must be a non-empty string`);
    });
  }
  // The "done" tier is fully curated: an implemented chart must declare an explicit
  // claimStack (primaryClaim + visualProof + readerAction), not rely on derivation.
  if (s.status === 'implemented') {
    ok(s.claimStack && s.claimStack.primaryClaim && s.claimStack.visualProof && s.claimStack.readerAction, `${w} implemented chart needs an explicit claimStack {primaryClaim, visualProof, readerAction}`);
  }

  // Interaction must match concept. Concept-critical layouts declare it explicitly.
  const it = resolveInteraction(s);
  ok(INTERACTION_TYPES.includes(it.type), `${w} bad interaction type: ${it.type}`);
  ok(GESTURES.includes(it.gesture), `${w} bad interaction gesture: ${it.gesture}`);
  const mustDeclareInteraction = s.layout === 'scenario' || (s.layout === 'dual' && s.perspectiveSlider);
  if (mustDeclareInteraction) {
    ok(s.interaction && s.interaction.type, `${w} ${s.layout} must declare an explicit interaction.type`);
    ok(s.interaction && typeof s.interaction.conceptMatch === 'string' && s.interaction.conceptMatch.trim(), `${w} interaction must declare conceptMatch (gesture ↔ concept)`);
  }
  if (it.type === 'beforeAfterReveal') {
    ok(s.beforeAfterLabels && s.beforeAfterLabels.before && s.beforeAfterLabels.after, `${w} beforeAfterReveal needs beforeAfterLabels {before, after}`);
    ok(s.revealDefault == null || (typeof s.revealDefault === 'number' && s.revealDefault >= 0 && s.revealDefault <= 1), `${w} revealDefault must be 0..1`);
  }
  if (it.type === 'scenario') ok(s.scenario && s.scenario.notes && Object.keys(s.scenario.notes).length >= 1, `${w} scenario interaction needs state-specific notes`);
  if (it.type === 'returnOrder') ok(s.sequence && Array.isArray(s.sequence.good), `${w} returnOrder interaction needs a shared return deck`);
  if (it.type === 'readerContext') ok(!!s.personalization, `${w} readerContext interaction needs a personalization block`);

  // Motion follows comprehension — the profile is valid (explicit or derived).
  const mp = resolveMotionProfile(s);
  ok(MOTION_TYPES.includes(mp.type), `${w} bad motionProfile type: ${mp.type}`);
  if (s.motionProfile) {
    ok(MOTION_TYPES.includes(s.motionProfile.type), `${w} explicit motionProfile.type invalid: ${s.motionProfile.type}`);
    if (s.motionProfile.duration != null) ok(MOTION_DURATIONS.includes(s.motionProfile.duration), `${w} motionProfile.duration invalid: ${s.motionProfile.duration}`);
    if (s.motionProfile.relatedElements != null) ok(Array.isArray(s.motionProfile.relatedElements), `${w} motionProfile.relatedElements must be an array`);
  }

  // A background is allowed only if it explains a relationship — never decorative.
  resolveBackgroundRoles(s).forEach((r) => ok(BACKGROUND_ROLES.includes(r), `${w} background role '${r}' not allowed (decorative backgrounds are forbidden)`));

  // Math-backed where math is claimed: a DCA chart must expose the conversion.
  if (s.layout === 'heartbeat') ok((s.formula && /[÷/=]/.test(s.formula)) || /÷|= units/i.test(cs.visualProof || ''), `${w} DCA chart must declare a visible conversion formula`);

  // Data honesty: no promissory/forecast language in VISIBLE claim copy
  // (disclosure / caution / note legitimately say "not a forecast", so excluded).
  const promiseRaw = [s.title, s.setupLine, s.frameworkClaim, s.readerTakeaway, s.explainerHeadline, s.explainerBody,
    s.claimStack && s.claimStack.primaryClaim, s.claimStack && s.claimStack.visualProof, s.claimStack && s.claimStack.readerAction]
    .filter(Boolean).join('  ').toLowerCase();
  // Honest anti-forecast phrasing ("not a forecast", "never a guarantee") is allowed:
  // neutralize negated forms before scanning for AFFIRMATIVE promissory language.
  const promiseScan = promiseRaw.replace(/\b(?:not|never|no|without|isn't|aren't)\s+(?:a\s+|an\s+|as\s+a\s+|as\s+|the\s+|merely\s+)?(?:forecast|forecasts|prediction|predictions|recommendation|guarantee|guaranteed|backtest|expected return|risk-free|optimized)\b/g, ' ');
  BANNED_PROMISE_WORDS.forEach((bw) => ok(!promiseScan.includes(bw), `${w} promissory/forecast language "${bw}" in visible claim copy`));
  ok(!/heartbeat/.test(promiseScan), `${w} 'heartbeat' must not appear in visible copy (internal layout name only)`);

  // Context visible where it changes interpretation: a personalized chart must be
  // able to produce a chart-level simulation intro from the reader's context.
  if (s.personalization) {
    const intro = getSimulationIntro(s, { startingValue: 250000, horizon: '30y' });
    ok(intro && intro.trim(), `${w} personalized chart must produce a simulation intro`);
  }
}

// group coverage (what the agency reviews)
const byGroup = (g) => FRAMEWORK_CHART_SPECS.filter((s) => s.group === g).map((s) => s.chartId);
['signature', 'docs-landing', 'part-1', 'part-2', 'part-3'].forEach((g) => ok(byGroup(g).length >= 1, `group ${g} has no charts`));

console.log(`✓ framework chart specs valid — ${FRAMEWORK_CHART_SPECS.length} charts, ${checks} assertions passed`);
console.log(`  signature   : ${byGroup('signature').join(', ')}`);
console.log(`  docs-landing: ${byGroup('docs-landing').join(', ')}`);
console.log(`  part-1      : ${byGroup('part-1').join(', ')}`);
console.log(`  part-2      : ${byGroup('part-2').join(', ')}`);
console.log(`  part-3      : ${byGroup('part-3').join(', ')}`);
console.log(`  wired public: ${FRAMEWORK_CHART_SPECS.filter((s) => s.wiredPublic).map((s) => s.chartId).join(', ') || '(none)'}`);

// engine doctrine coverage (vNext)
const tally = (fn) => { const m = {}; FRAMEWORK_CHART_SPECS.forEach((s) => { const k = fn(s); m[k] = (m[k] || 0) + 1; }); return Object.entries(m).map(([k, v]) => `${k}×${v}`).join(' · '); };
console.log(`  data modes  : ${tally((s) => s.visualDataMode)}`);
console.log(`  interaction : ${tally((s) => resolveInteraction(s).type)}`);
console.log(`  motion      : ${tally((s) => resolveMotionProfile(s).type)}`);
console.log(`  personalized: ${FRAMEWORK_CHART_SPECS.filter((s) => s.personalization).map((s) => s.chartId).join(', ') || '(none)'}`);
