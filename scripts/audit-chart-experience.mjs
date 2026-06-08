/* ───────────────────────────────────────────────────────────────────────────
 * ACF chart EXPERIENCE audit — design QA, advisory only (NOT a gate).
 *
 *   node scripts/audit-chart-experience.mjs   (or: npm run audit:chart-experience)
 *
 * `validate:charts` is the contract that fails the build. THIS is the coaching
 * layer: a chart can be structurally valid yet experientially weak. It surfaces
 * soft, taste-level signals so the engine keeps improving without turning the
 * validator into a design prison. It ALWAYS exits 0.
 *
 * Two registers, deliberately separated so the real signal isn't buried:
 *   RISKS    — actionable experience smells (hover-only density, unarticulated
 *              mechanism, label crowding, relational background to verify).
 *   CONTEXT  — status + which charts lean on DERIVED doctrine metadata. Derivation
 *              is by design (derive-with-override), so this is informational, not
 *              a defect — it just shows where curating an override could help.
 * ─────────────────────────────────────────────────────────────────────────── */
import {
  FRAMEWORK_CHART_SPECS as SPECS,
  resolveInteraction, resolveBackgroundRoles,
} from '../components/framework-charts/chart-specs.mjs';

const risks = [];                                   // { id, code, note } — actionable
const add = (id, code, note) => risks.push({ id, code, note });

// estimate persistent (always-on) text labels across panels — collision risk.
const labelCount = (s) => {
  let n = 0;
  const scan = (p) => {
    (p.series || []).forEach((x) => { if (x.label && !x.hidden) n++; });
    (p.markers || []).forEach((m) => { if (m.label) n++; });
    (p.guides || []).forEach((g) => { if (g.label) n++; });
    (p.bands || []).forEach((b) => { if (b.label) n++; });
    (p.areas || []).forEach((a) => { if (a.label) n++; });
    (p.notes || []).forEach(() => { n++; });
  };
  if (s.layout === 'dual') (s.panels || []).forEach(scan); else scan(s);
  return n;
};

const DIAGRAMISH = new Set(['scorecard', 'quadrant', 'systemLoop', 'bridge', 'gate', 'flow', 'loop']);
const active = SPECS.filter((s) => s.status !== 'deferred');     // deferred = intentionally parked
const derived = { claimStack: [], storyBeats: [], experienceRole: [], mobileBehavior: [] };
const needsReview = [];

for (const s of active) {
  const id = s.chartId;

  // ── RISKS (actionable) ──
  const it = resolveInteraction(s);
  const dense = (s.hoverTargets || []).length;
  if (it.type === 'hover' && dense >= 6 && !DIAGRAMISH.has(s.layout)) add(id, 'hover-only-dense', `hover-only with ${dense} targets — would a central interaction aid comprehension?`);
  if ((s.visualDataMode === 'representative' || s.visualDataMode === 'simulation') && !(s.claimStack && s.claimStack.visualProof)) add(id, 'proof-not-explicit', 'representative/simulation but the visible mechanism (claimStack.visualProof) is derived, not articulated.');
  const lc = labelCount(s);
  if (lc >= 7) add(id, 'label-density', `${lc} persistent labels — verify no collisions at the coarse-pointer (tall) height.`);
  if (resolveBackgroundRoles(s).includes('relational')) add(id, 'relational-bg', 'relational background — confirm its shape is data-driven, not decorative.');

  // ── CONTEXT (informational) ──
  if (!s.claimStack) derived.claimStack.push(id);
  if (!s.storyBeats) derived.storyBeats.push(id);
  if (!s.experienceRole) derived.experienceRole.push(id);
  if (!s.mobileBehavior) derived.mobileBehavior.push(id);
  if (s.status === 'needs-design-review') needsReview.push(id);
}

const byCode = {};
risks.forEach((a) => { (byCode[a.code] ||= []).push(a); });
const RISK_ORDER = [
  ['proof-not-explicit', 'Mechanism not articulated (representative/sim)'],
  ['hover-only-dense', 'Dense, but hover-only'],
  ['label-density', 'Many persistent labels (collision risk)'],
  ['relational-bg', 'Relational background — verify it is data-shaped'],
];

console.log('\nACF chart EXPERIENCE audit — advisory only (validate:charts is the gate; this is coaching)\n');
console.log('RISKS — actionable experience smells\n');
let anyRisk = false;
for (const [code, title] of RISK_ORDER) {
  const list = byCode[code] || [];
  if (!list.length) continue;
  anyRisk = true;
  console.log(`  ▸ ${title} — ${list.length}`);
  list.forEach((a) => console.log(`      ${a.id.padEnd(26)} ${a.note}`));
  console.log('');
}
if (!anyRisk) console.log('  (none) ✓\n');

console.log('CONTEXT — status + derived metadata (informational; derivation is by design)\n');
if (needsReview.length) console.log(`  ▸ needs-design-review (${needsReview.length}): ${needsReview.join(', ')}`);
console.log(`  ▸ leaning on derived doctrine (override only where the default doesn't fit):`);
console.log(`      claimStack ${derived.claimStack.length} · storyBeats ${derived.storyBeats.length} · experienceRole ${derived.experienceRole.length} · mobileBehavior ${derived.mobileBehavior.length}  (of ${active.length})`);

const perChart = active.map((s) => ({ id: s.chartId, n: risks.filter((a) => a.id === s.chartId).length })).sort((a, b) => b.n - a.n);
const clean = perChart.filter((c) => c.n === 0).map((c) => c.id);
const top = perChart.filter((c) => c.n > 0).slice(0, 6);

console.log(`\nSummary: ${active.length} active charts · ${risks.length} risk advisories · ${clean.length} with no risks`);
if (top.length) console.log(`  most to polish: ${top.map((c) => `${c.id}(${c.n})`).join(', ')}`);
console.log('\n(advisory only — exits 0; run `npm run validate:charts` for the gate)\n');

process.exit(0);
