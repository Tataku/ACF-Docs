#!/usr/bin/env node
/**
 * Sync the definition-card plates — the picture each `.failure-modes` card opens with.
 *
 * WHY THIS EXISTS. That family is one component used thirteen times across six
 * pages for sixty-one cards, and it was the last reader-facing card family with
 * no picture while the chapter cards, the Resources tiles and the next-up cards
 * all open with one. Flat was the symptom. The problem is that the family is
 * NOT one kind of list: the framework puts seven different things in it — a
 * closed taxonomy, a tunable envelope, an escalation ladder that deliberately
 * terminates, a quality gauge, a failure mechanism, a market state, a dollar
 * magnitude — and every card looked the same whichever it held. Each card now
 * opens with a plate in the same plane vocabulary as the chapter plates (grid,
 * axis, field, a thesis line in accent, a terminal dot), and the plate draws
 * what KIND of thing the card is and how it behaves.
 *
 * THE RULE THE POSTURE RAILS ESTABLISHED, KEPT: a number drawn is a number
 * stated, so nothing in a plate is authored where the card already prints it.
 * The TAM bars are the `~$12T` in the cards' own names, read out here and drawn
 * against each other; the ladder's rung is its own position in the block; the
 * taxonomy's lit cell is its own slot. `--check` refuses a build where any of
 * that disagrees with the markup it was read from.
 *
 * WHAT IS EDITORIAL, AND WHY IT HAS TO BE. Which KIND a block is, and which
 * MECHANISM a failure card draws, cannot be derived — "custody loss" is a
 * seizure and "slow CIS decay" is a decay, and no parser knows that. So they
 * are declared once, below, and reviewed like prose. The script's job is to
 * make the declaration TOTAL: every block has a kind, every card a figure,
 * every figure a scene the stylesheet can draw. A card added tomorrow fails
 * the audit until somebody decides what it means, because the alternative —
 * a blank plate that looks intentional — is the failure worth designing against.
 *
 * The plate is decoration: aria-hidden, no text a reader needs, no character
 * that sync-counts.mjs would count as a word. plates.js draws it in when it is
 * looked at, exactly as it does the chapter plates, because it is a `.dc-art`.
 *
 * Run: npm run sync:card-motifs     (rewrite)
 *      npm run audit:card-motifs    (verify, non-zero exit on drift)
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SITE = path.join(ROOT, 'public', 'site-b');
const CHECK = process.argv.includes('--check');
const fail = (m) => { console.error(`sync-card-motifs: ${m}`); process.exit(1); };

/* ---------------------------------------------------------------------------
   THE EDITORIAL LAYER. Keyed by page + the block's section eyebrow — what a
   reader sees and a writer would name. Each block declares its KIND; each
   card the figure it draws, in the order the cards appear.
   --------------------------------------------------------------------------- */
const DECLARED = {
  'framework-in-math.html': {
    'Ground Rules':     { kind: 'taxonomy', figures: ['fixed', 'tunable', 'derived', 'illustrative'] },
    'Position Quality': { kind: 'envelope', figures: ['band', 'band', 'floor', 'closed'] },
    'Governance':       { kind: 'ladder',   figures: ['rung', 'rung', 'rung', 'rung', 'rung', 'absent'] },
    'The Backbone':     { kind: 'taxonomy', figures: ['fixed', 'tunable', 'excluded', 'excluded'] },
    'Epistemics':       { kind: 'gauge',    figures: ['confidence', 'freshness', 'completeness', 'provenance'] },
  },
  'part-1-foundation.html': {
    'Order of Operations': { kind: 'mechanism',
      figures: ['drift', 'reflexive', 'convergence', 'erosion', 'overload', 'reflexive'] },
  },
  'part-3-bitcoin-convexity.html': {
    'Why Not 100% Bitcoin':  { kind: 'compare',   figures: ['concentrated', 'spread'] },
    'Risk Register':         { kind: 'mechanism',
      figures: ['rupture', 'seizure', 'seizure', 'counterparty', 'liquidity',
                'cascade', 'erosion', 'seizure', 'counterparty', 'displacement'] },
    'Valuation Discipline':  { kind: 'state',     figures: ['clustered', 'converged', 'diverged'] },
    'Addressable Market & Implementation': { kind: 'magnitude', figures: ['share', 'share', 'share', 'share'] },
  },
  'part-4-tax-architecture.html': {
    'Income, Ballast, and Harvesting': { kind: 'mechanism',
      figures: ['counterparty', 'ratesensitivity', 'reclassification', 'convergence', 'openended'] },
  },
  'part-5-portfolio-construction.html': {
    'Disciplined Speculation': { kind: 'mechanism',
      figures: ['reflexive', 'overextension', 'depletion', 'erosion'] },
  },
  'part-6-convexity-scoring.html': {
    'Failure Modes': { kind: 'mechanism',
      figures: ['decay', 'drift', 'accretion', 'convergence', 'reflexive'] },
  },
};

/* ---------------------------------------------------------------------------
   THE SCENES. One per figure, on the chapter plates' canvas conventions: the
   drawing lives between x=24 and x=456, the ground is y=84, the grid is faint,
   the THESIS is the one accent stroke and the dot is where the eye lands.
   Class names are the chapter plates' own (reading-system.css `.dc-art .art-*`),
   so a reader who has met the cover reads these in the same language.
   Animation classes: art-in fades, art-draw draws a pathLength=1 stroke,
   art-grow-y grows a bar from its foot, art-pop lands the dot; art-d1..3 stagger.
   --------------------------------------------------------------------------- */
const GRID = '<path class="art-grid art-in art-d0" d="M24 20H456M24 40H456M24 60H456"/>';
const AXIS = '<path class="art-axis" d="M24 84H456"/>';
const glow = (d) => `<path class="art-glow art-draw art-d2" pathLength="1" d="${d}"/>`;
const thesis = (d, delay = 'art-d2') => `<path class="art-thesis art-draw ${delay}" pathLength="1" d="${d}"/>`;
const dot = (x, y, r = 4) => `<circle class="art-dot art-move art-pop" cx="${x}" cy="${y}" r="${r}"/>`;
const ctx = (d, delay = 'art-d1') => `<path class="art-context art-in ${delay}" d="${d}"/>`;
const ref = (d) => `<path class="art-ref art-in art-d1" d="${d}"/>`;
const ghost = (d) => `<path class="art-ghost art-in art-d3" d="${d}"/>`;
// No <text> in a plate: sync-counts.mjs counts every word in <main>, and a
// decoration is not a word. The posture rails made the same call.

/** Cells across the width for a slot-based kind; the card's own slot is lit. */
function cells(slot, slots, litClass = 'art-cell-lit', extra = '') {
  const gap = 10, w = (432 - gap * (slots - 1)) / slots;
  let out = '<g class="art-in art-d1">';
  for (let i = 1; i <= slots; i += 1) {
    const x = 24 + (i - 1) * (w + gap);
    out += i === slot
      ? `<rect class="art-cell ${litClass} art-move" x="${x}" y="30" width="${w}" height="44" rx="3"/>${extra.replace(/\{x\}/g, x).replace(/\{w\}/g, w)}`
      : `<rect class="art-cell" x="${x}" y="30" width="${w}" height="44" rx="3"/>`;
  }
  return out + '</g>';
}
const cellMid = (slot, slots) => { const gap = 10, w = (432 - gap * (slots - 1)) / slots; return 24 + (slot - 1) * (w + gap) + w / 2; };

const ART = {
  /* ---- Taxonomy: mutually exclusive kinds; the card's slot lit, the set drawn. */
  fixed: ({ slot, slots }) => GRID + AXIS + cells(slot, slots, 'art-cell-lit art-cell-solid') + dot(cellMid(slot, slots), 52),
  tunable: ({ slot, slots }) => GRID + AXIS + cells(slot, slots, 'art-cell-lit art-cell-dashed')
    + thesis(`M${cellMid(slot, slots) - 28} 58C${cellMid(slot, slots) - 14} 58 ${cellMid(slot, slots) - 8} 44 ${cellMid(slot, slots)} 46S${cellMid(slot, slots) + 14} 60 ${cellMid(slot, slots) + 28} 50`)
    + dot(cellMid(slot, slots) + 28, 50),
  derived: ({ slot, slots }) => {
    const m = cellMid(slot, slots); let c = '';
    for (let i = 1; i <= slots; i += 1) if (i !== slot) c += ctx(`M${cellMid(i, slots)} 22C${cellMid(i, slots)} 12 ${m} 12 ${m} 30`);
    return GRID + AXIS + cells(slot, slots, 'art-cell-lit art-cell-thin') + c + dot(m, 30);
  },
  illustrative: ({ slot, slots }) => GRID + AXIS + cells(slot, slots, 'art-cell-lit art-cell-ghost')
    + ghost(`M${cellMid(slot, slots) - 30} 62c10-14 20-22 30-14s20 18 30 6`),
  excluded: ({ slot, slots }) => { const m = cellMid(slot, slots);
    return GRID + AXIS + cells(slot, slots, 'art-cell-struck')
      + `<path class="art-ceiling art-draw art-d2" pathLength="1" d="M${m - 14} 38L${m + 14} 66M${m + 14} 38L${m - 14} 66"/>`; },

  /* ---- Envelope: a tunable inside documented bounds. */
  band: () => GRID + AXIS + ref('M24 34H456') + ref('M24 70H456')
    + '<path class="art-field art-move art-in art-d1" d="M24 34H456V70H24Z"/>'
    + glow('M24 58C90 58 120 40 180 44S260 66 330 52 400 40 456 46') + thesis('M24 58C90 58 120 40 180 44S260 66 330 52 400 40 456 46') + dot(456, 46),
  floor: () => GRID + AXIS + ref('M24 30H456')
    + '<path class="art-ceiling art-in art-d1" d="M24 74H456"/>'
    + '<path class="art-field art-move art-in art-d1" d="M24 30H456V74H24Z"/>'
    + glow('M24 40C80 40 110 72 160 73S230 42 290 44 360 72 400 73 440 60 456 56') + thesis('M24 40C80 40 110 72 160 73S230 42 290 44 360 72 400 73 440 60 456 56') + dot(456, 56),
  closed: () => GRID + AXIS
    + '<path class="art-ceiling art-in art-d1" d="M40 28H24V78H40M440 28H456V78H440"/>'
    + ghost('M60 54H420'),

  /* ---- Ladder: an escalation that rises through the block, and then does not. */
  rung: ({ step, steps }) => {
    const y = (n) => 84 - (n - 0.5) * (68 / steps);
    let r = '';
    for (let n = 1; n <= steps; n += 1) if (n !== step) r += `<path class="art-rung art-in art-d1" d="M120 ${y(n)}H360"/>`;
    // The lit rung casts its light to the floor: that is the one that fired.
    return GRID + AXIS + `<path class="art-field art-move art-in art-d1" d="M120 ${y(step)}H360V84H120Z"/>`
      + `<path class="art-context art-in art-d0" d="M240 84V${y(step)}"/>` + r
      + glow(`M120 ${y(step)}H360`) + thesis(`M120 ${y(step)}H360`) + dot(360, y(step));
  },
  absent: ({ step, steps }) => {
    const y = (n) => 84 - (n - 0.5) * (68 / steps);
    let r = '';
    for (let n = 1; n < step; n += 1) r += `<path class="art-rung art-in art-d1" d="M120 ${y(n)}H360"/>`;
    return GRID + AXIS + `<path class="art-context art-in art-d0" d="M240 84V${y(step - 1)}"/>` + r
      + ghost(`M120 ${y(step)}H360`) + `<path class="art-ghost art-in art-d3" d="M240 ${y(step - 1) - 2}V${y(step) + 6}"/>`;
  },

  /* ---- Gauge: four dimensions of evidence quality, each a measure from nothing to full. */
  confidence: () => GRID + AXIS + '<path class="art-field-ink art-move art-in art-d1" d="M24 60C120 60 180 22 240 22S360 60 456 60Z"/>' + '<rect class="art-cell art-in art-d0" x="24" y="64" width="432" height="10" rx="5"/>'
    + '<rect class="art-cell-lit art-grow-x art-d1" x="24" y="64" width="300" height="10" rx="5"/>'
    + ctx('M24 60C120 60 180 22 240 22S360 60 456 60') + dot(324, 69),
  freshness: () => GRID + AXIS + '<rect class="art-cell art-in art-d0" x="24" y="64" width="432" height="10" rx="5"/>'
    + '<rect class="art-cell-lit art-grow-x art-d1" x="24" y="64" width="240" height="10" rx="5"/>'
    + ref('M264 20V74')
    + glow('M24 26C100 26 160 34 240 46S360 70 456 78') + thesis('M24 26C100 26 160 34 240 46S360 70 456 78') + dot(264, 50),
  completeness: () => { let s = '<g class="art-in art-d1">';
    for (let i = 0; i < 9; i += 1) s += `<rect class="${i < 6 ? 'art-cell-lit' : 'art-cell'}" x="${24 + i * 48}" y="60" width="40" height="14" rx="2"/>`;
    return GRID + AXIS + s + '</g>' + dot(24 + 5 * 48 + 20, 67); },
  provenance: () => GRID + AXIS
    + '<g class="art-in art-d1"><rect class="art-step" x="24" y="66" width="432" height="10"/><rect class="art-step" x="72" y="50" width="336" height="10"/><rect class="art-step" x="120" y="34" width="240" height="10"/></g>'
    + '<rect class="art-step-final art-grow-y art-d2" x="168" y="18" width="144" height="10"/>' + dot(240, 23),

  /* ---- State: three models against one price. */
  clustered: () => GRID + AXIS + '<path class="art-field art-move art-in art-d1" d="M24 50C140 50 300 50 456 50V84H24Z"/>' + ctx('M24 50C120 46 300 52 456 48') + ctx('M24 54C120 58 300 46 456 52') + ctx('M24 46C120 50 300 56 456 50')
    + glow('M24 50C140 50 300 50 456 50') + thesis('M24 50C140 50 300 50 456 50') + dot(456, 50),
  converged: () => GRID + AXIS + ref('M24 40H456') + '<path class="art-field art-move art-in art-d1" d="M24 40H456V84H24Z"/>'
    + ctx('M24 44C120 50 300 66 456 68') + ctx('M24 50C120 56 300 68 456 70') + ctx('M24 56C120 62 300 70 456 72')
    + glow('M24 40H456') + thesis('M24 40H456') + '<path class="art-wedge art-in art-d3" d="M446 46l10 0l-5 20z"/>' + dot(456, 70),
  diverged: () => GRID + AXIS + '<path class="art-field-ink art-move art-in art-d1" d="M24 50C140 40 300 18 456 14L456 84C300 82 140 66 24 54Z"/>' + ctx('M24 50C140 40 300 18 456 14') + ctx('M24 52C140 56 300 60 456 62') + ctx('M24 54C140 66 300 82 456 84')
    + glow('M24 50C140 50 300 50 456 50') + thesis('M24 50C140 50 300 50 456 50') + dot(456, 50),
  share: ({ m, all, index }) => {
    const max = Math.max(...all), w = 72, gap = (432 - w * all.length) / (all.length - 1);
    let bars = '';
    all.forEach((v, i) => {
      const h = Math.max(6, (v / max) * 60), x = 24 + i * (w + gap), y = 84 - h;
      bars += i === index
        ? `<rect class="art-step art-step-final art-move art-grow-y art-d2" x="${x}" y="${y}" width="${w}" height="${h}"/>`
        : `<rect class="art-step art-grow-y art-d1" x="${x}" y="${y}" width="${w}" height="${h}"/>`;
    });
    const x = 24 + index * (w + gap) + w / 2;
    return GRID + AXIS + bars + dot(x, 84 - Math.max(6, (m / max) * 60));
  },

  /* ---- Compare: one holding against many. */
  concentrated: () => GRID + AXIS + '<circle class="art-glow-dot art-pop" cx="240" cy="52" r="30"/>'
    + '<circle class="art-size art-size-top art-pop" cx="240" cy="52" r="30"/>',
  spread: () => GRID + AXIS + '<g class="art-sizes art-move">'
    + [80, 160, 240, 320, 400].map((x, i) => `<circle class="art-size art-grow art-d${i % 4}" cx="${x}" cy="60" r="12"/>`).join('') + '</g>',

  /* ---- Mechanisms: how the thing breaks, as a gesture on the grid. */
  decay: () => GRID + AXIS + ref('M24 30H456')
    + '<path class="art-field art-move art-in art-d1" d="M24 30C140 30 200 34 260 44S380 68 456 74V84H24Z"/>'
    + glow('M24 30C140 30 200 34 260 44S380 68 456 74') + thesis('M24 30C140 30 200 34 260 44S380 68 456 74') + dot(456, 74),
  drift: () => GRID + AXIS + '<path class="art-field art-move art-in art-d1" d="M24 52C140 52 260 44 456 32V72C260 60 140 52 24 52Z"/>' + '<path class="art-zone art-in art-d3" d="M456 32V72"/>'
    + ctx('M24 52C140 52 260 60 456 72')
    + glow('M24 52C140 52 260 44 456 32') + thesis('M24 52C140 52 260 44 456 32') + dot(456, 32) + `<circle class="art-node art-in art-d3" cx="456" cy="72" r="3.5"/>`,
  cascade: () => GRID + AXIS
    + '<g class="art-in art-d1"><rect class="art-step" x="24" y="30" width="96" height="54"/><rect class="art-step" x="132" y="44" width="96" height="40"/><rect class="art-step" x="240" y="58" width="96" height="26"/><rect class="art-step" x="348" y="70" width="108" height="14"/></g>'
    + glow('M24 30H120V44H228V58H336V70H456') + thesis('M24 30H120V44H228V58H336V70H456') + dot(456, 70),
  erosion: () => GRID + AXIS
    + '<path class="art-field-ink art-move art-in art-d1" d="M24 44c30 0 40 12 70 10s40-16 70-8 40 20 70 14 40-18 70-6 40 22 70 12 50-8 82-4V84H24Z"/>'
    + '<path class="art-wave art-in art-d1" d="M24 44c30 0 40 12 70 10s40-16 70-8 40 20 70 14 40-18 70-6 40 22 70 12 50-8 82-4"/>'
    + glow('M24 26H456') + thesis('M24 26H456') + dot(456, 26),
  convergence: () => GRID + AXIS + '<path class="art-field-ink art-move art-in art-d1" d="M24 20C160 20 240 46 320 58C240 62 160 80 24 80Z"/>' + '<path class="art-zone art-in art-d3" d="M300 14V84"/>'
    + ctx('M24 20C160 20 240 46 320 58') + ctx('M24 36C160 36 240 50 320 58') + ctx('M24 68C160 68 240 62 320 58') + ctx('M24 80C160 80 240 66 320 58')
    + glow('M320 58C360 58 400 60 456 62') + thesis('M320 58C360 58 400 60 456 62') + dot(320, 58, 5),
  reflexive: () => GRID + AXIS + '<path class="art-field art-move art-in art-d1" d="M150 52C150 24 200 12 240 24S330 24 330 52S280 82 240 80S150 80 150 52Z"/>'
    + `<circle class="art-node art-in art-d1" cx="150" cy="52" r="3.5"/><circle class="art-node art-in art-d1" cx="240" cy="24" r="3.5"/><circle class="art-node art-in art-d1" cx="330" cy="52" r="3.5"/>`
    + glow('M150 52C150 24 200 12 240 24S330 24 330 52S280 82 240 80S150 80 150 52') + thesis('M150 52C150 24 200 12 240 24S330 24 330 52S280 82 240 80S150 80 150 52')
    + '<path class="art-wedge art-in art-d3" d="M158 44l-8 10l12 2z"/>' + dot(240, 80),
  rupture: () => GRID + AXIS + '<path class="art-field art-move art-in art-d1" d="M24 46C100 46 160 42 220 40V84H24Z"/>' + '<path class="art-field-ink art-move art-in art-d1" d="M256 64C320 66 400 70 456 72V84H256Z"/>'
    + glow('M24 46C100 46 160 42 220 40') + thesis('M24 46C100 46 160 42 220 40')
    + '<path class="art-ceiling art-draw art-d2" pathLength="1" d="M220 40L232 56L244 30L256 64"/>'
    + glow('M256 64C320 66 400 70 456 72') + thesis('M256 64C320 66 400 70 456 72', 'art-d3') + dot(456, 72),
  seizure: () => GRID + AXIS + '<path class="art-field art-move art-in art-d1" d="M24 60C100 60 200 40 300 36V84H24Z"/>'
    + '<path class="art-ceiling art-in art-d1" d="M300 14V84"/><rect class="art-floor art-in art-d1" x="300" y="14" width="156" height="70"/>'
    + glow('M24 60C100 60 200 40 300 36') + thesis('M24 60C100 60 200 40 300 36') + ghost('M300 36C360 34 420 36 456 40') + dot(300, 36),
  counterparty: () => GRID + AXIS
    + '<circle class="art-node art-in art-d0" cx="80" cy="52" r="10"/><circle class="art-node art-in art-d0" cx="400" cy="52" r="10"/>'
    + '<path class="art-flow art-draw art-d1" pathLength="1" d="M92 52H210"/>' + ghost('M270 52H388')
    + '<path class="art-ceiling art-draw art-d3" pathLength="1" d="M226 40L254 64M254 40L226 64"/>' + dot(80, 52),
  liquidity: () => GRID + AXIS + '<rect class="art-dots art-in art-d1" x="24" y="24" width="432" height="60"/>'
    + glow('M24 40C140 42 260 48 340 60S420 80 456 82') + thesis('M24 40C140 42 260 48 340 60S420 80 456 82') + dot(456, 82),
  displacement: () => GRID + AXIS + '<path class="art-field art-move art-in art-d1" d="M24 78C140 76 260 60 456 30V84H24Z"/>'
    + ctx('M24 34C140 36 260 50 456 78') + `<circle class="art-node art-in art-d3" cx="456" cy="78" r="3.5"/>`
    + glow('M24 78C140 76 260 60 456 30') + thesis('M24 78C140 76 260 60 456 30') + dot(456, 30),
  overload: () => { let t = '<g class="art-in art-d1">';
    for (let x = 24; x <= 456; x += 12) t += `<path class="art-tick" d="M${x} ${84 - 8 - ((x * 7) % 34)}V84"/>`;
    return GRID + AXIS + t + '</g>' + glow('M24 52C140 54 260 50 456 52') + thesis('M24 52C140 54 260 50 456 52') + dot(312, 30, 5); },
  overextension: () => GRID + AXIS + ref('M24 64H456') + '<path class="art-field art-move art-in art-d1" d="M24 66C140 66 260 60 360 44S430 26 456 20V64H24Z"/>'
    + '<path class="art-wedge art-in art-d3" d="M420 64V24l12 0z"/>'
    + glow('M24 66C140 66 260 60 360 44S430 26 456 20') + thesis('M24 66C140 66 260 60 360 44S430 26 456 20') + dot(456, 20),
  depletion: () => GRID + AXIS
    + '<g class="art-in art-d1">' + [0, 1, 2, 3, 4, 5, 6].map((i) => `<rect class="art-step" x="${24 + i * 62}" y="${30 + i * 8}" width="50" height="${54 - i * 8}"/>`).join('') + '</g>'
    + glow('M24 30C140 34 300 60 456 84') + thesis('M24 30C140 34 300 60 456 84') + dot(456, 84),
  accretion: () => GRID + AXIS + '<g class="art-in art-d1">'
    + [0, 1, 2, 3, 4, 5].map((i) => `<rect class="art-step art-grow-y art-d${Math.min(i, 3)}" x="${24 + i * 72}" y="${80 - i * 10}" width="60" height="${4 + i * 10}"/>`).join('')
    + '</g><rect class="art-step-final art-grow-y art-d3" x="384" y="24" width="72" height="60"/>' + dot(420, 24),
  ratesensitivity: () => GRID + AXIS + '<path class="art-field art-move art-in art-d1" d="M24 24C140 28 260 60 456 74V84H24Z"/>'
    + ctx('M24 70C140 66 260 30 456 20')
    + glow('M24 24C140 28 260 60 456 74') + thesis('M24 24C140 28 260 60 456 74') + dot(456, 74),
  reclassification: () => GRID + AXIS
    + '<g class="art-in art-d0"><rect class="art-cell" x="24" y="22" width="432" height="22" rx="3"/><rect class="art-cell" x="24" y="56" width="432" height="22" rx="3"/></g>'
    + '<rect class="art-cell-lit art-in art-d2" x="280" y="56" width="176" height="22" rx="3"/>'
    + glow('M24 33H220C250 33 250 67 280 67H456') + thesis('M24 33H220C250 33 250 67 280 67H456') + dot(456, 67),
  openended: () => GRID + AXIS + '<path class="art-field art-move art-in art-d1" d="M24 62C140 60 260 52 400 48V84H24Z"/>'
    + glow('M24 62C140 60 260 52 400 48') + thesis('M24 62C140 60 260 52 400 48') + ghost('M400 48C420 47 440 47 470 47')
    + '<path class="art-tick art-in art-d1" d="M24 78V84M120 78V84M216 78V84M312 78V84"/>',

};

/** Every figure a kind may declare. A figure outside its kind is a typo, not a design. */
const VOCABULARY = {
  taxonomy:  ['fixed', 'tunable', 'derived', 'illustrative', 'excluded'],
  envelope:  ['band', 'floor', 'closed'],
  ladder:    ['rung', 'absent'],
  gauge:     ['confidence', 'freshness', 'completeness', 'provenance'],
  state:     ['clustered', 'converged', 'diverged'],
  magnitude: ['share'],
  compare:   ['concentrated', 'spread'],
  mechanism: ['decay', 'drift', 'cascade', 'erosion', 'convergence', 'reflexive', 'rupture', 'seizure',
              'counterparty', 'liquidity', 'displacement', 'overload', 'overextension', 'depletion',
              'accretion', 'ratesensitivity', 'reclassification', 'openended'],
};
for (const [kind, figs] of Object.entries(VOCABULARY)) for (const f of figs) if (!ART[f]) fail(`vocabulary names "${f}" (${kind}) but no scene draws it`);

/* The shared gradient defs the plates fill from. The cover carries them; the
   part pages did not, so a `url(#dc-g-…)` fill there resolved to nothing —
   including on the next-up plates that were already there. Injected once per
   page, verbatim from the cover, so there is one definition of each gradient. */
const COVER = fs.readFileSync(path.join(SITE, 'cover-docs.html'), 'utf8');
const DEFS = (COVER.match(/<svg class="dc-art-defs"[\s\S]*?<\/svg>/) || [])[0];
if (!DEFS) fail('the cover carries no dc-art-defs block to share');

const DECODE = [['&amp;', '&'], ['&middot;', '·'], ['&rsquo;', '’'], ['&mdash;', '—'], ['&ndash;', '–'],
                ['&plusmn;', '±'], ['&times;', '×'], ['&gt;', '>'], ['&lt;', '<']];
const text = (s) => DECODE.reduce((a, [x, y]) => a.split(x).join(y), s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
const norm = (s) => s.replace(/\s+/g, ' ').trim();

/** Balanced-div scan — the blocks are pretty-printed on some pages, inline on others. */
function scanDivs(html, from) {
  let depth = 1; const re = /<div\b[^>]*>|<\/div>/g; re.lastIndex = from;
  for (let m; (m = re.exec(html));) {
    depth += m[0] === '</div>' ? -1 : 1;
    if (depth === 0) return { inner: html.slice(from, m.index), end: re.lastIndex };
  }
  fail(`unbalanced <div> after offset ${from}`);
}
function blocksOf(html) {
  const out = [];
  for (const m of html.matchAll(/<div class="failure-modes"(?:\s+data-kind="[^"]*")?>/g)) {
    const { inner, end } = scanDivs(html, m.index + m[0].length);
    const eyebrow = [...html.slice(0, m.index).matchAll(/section-eyebrow[^>]*>([^<]{2,80})/g)].pop();
    out.push({ start: m.index, inner, end, section: eyebrow ? text(eyebrow[1]) : '?' });
  }
  return out;
}
function cardsOf(inner) {
  const out = []; const re = /<div\b([^>]*)>/g;
  for (let m; (m = re.exec(inner));) {
    const { inner: seg, end } = scanDivs(inner, m.index + m[0].length);
    const name = /<span class="name">([\s\S]*?)<\/span>/.exec(seg);
    if (name) out.push({ start: m.index, openLen: m[0].length, seg, name: text(name[1]),
      // Whatever plate a previous run wrote, so it can be replaced rather than stacked.
      body: seg.replace(/^\s*<span class="fm-plate dc-art"[\s\S]*?<\/span>\s*/, '') });
    re.lastIndex = end;
  }
  return out;
}

/** `~$12T` in a magnitude card's own name — the one place it is typed. */
function magnitude(name) {
  const m = /~?\$(\d+(?:\.\d+)?)\s*T/i.exec(name);
  if (!m) fail(`magnitude card "${name}" prints no $NT figure to draw`);
  return Number(m[1]);
}

const plate = (kind, figure, svgInner, indent) =>
  `<span class="fm-plate dc-art" aria-hidden="true" data-kind="${kind}" data-figure="${figure}">` +
  `<svg viewBox="0 0 480 100" fill="none" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">` +
  svgInner + `</svg></span>`;

let changed = 0, cards = 0; const problems = [];

for (const file of fs.readdirSync(SITE).filter((f) => f.endsWith('.html'))) {
  const full = path.join(SITE, file);
  const before = fs.readFileSync(full, 'utf8');
  let html = before;
  const blocks = blocksOf(html);
  if (!blocks.length) continue;
  const declaredPage = DECLARED[file];
  if (!declaredPage) { problems.push(`${file}: has ${blocks.length} card block(s) and no declaration`); continue; }

  for (const b of [...blocks].reverse()) {
    const spec = declaredPage[b.section];
    if (!spec) { problems.push(`${file}: block "${b.section}" is not declared`); continue; }
    const vocab = VOCABULARY[spec.kind];
    if (!vocab) { problems.push(`${file}/${b.section}: unknown kind "${spec.kind}"`); continue; }
    const cs = cardsOf(b.inner);
    if (cs.length !== spec.figures.length) {
      problems.push(`${file}/${b.section}: ${cs.length} card(s) but ${spec.figures.length} figure(s) declared`); continue;
    }
    const mags = spec.kind === 'magnitude' ? cs.map((c) => magnitude(c.name)) : null;

    let inner = b.inner;
    for (let i = cs.length - 1; i >= 0; i -= 1) {
      const c = cs[i]; const figure = spec.figures[i]; cards += 1;
      if (!vocab.includes(figure)) { problems.push(`${file}/${b.section}: "${figure}" is not in the ${spec.kind} vocabulary`); continue; }
      const params = { slot: i + 1, slots: cs.length, step: i + 1, steps: cs.length,
                       m: mags ? mags[i] : undefined, all: mags, index: i };
      const svg = ART[figure](params);
      const rebuilt = `<div>` + plate(spec.kind, figure, svg) + c.body.trimStart();
      inner = inner.slice(0, c.start) + rebuilt + inner.slice(c.start + c.openLen + c.seg.length);
    }
    html = html.slice(0, b.start) + `<div class="failure-modes" data-kind="${spec.kind}">` + inner + '</div>' + html.slice(b.end);
  }

  // The gradient defs, once per page, directly before its first block — inside
  // <main>, beside what uses them. NOT at <body>: the glossary and pictures pages
  // clone a part page's shell, and a defs block in the shell would ride along
  // into pages that draw no plate. Kept where the plates are, it does not.
  if (!html.includes('class="dc-art-defs"')) {
    const at = html.indexOf('<div class="failure-modes"');
    const lineStart = html.lastIndexOf('\n', at) + 1;
    const indent = html.slice(lineStart, at);
    html = html.slice(0, lineStart) + indent + DEFS.replace(/\n\s*/g, '\n' + indent) + '\n' + html.slice(lineStart);
  }

  if (norm(html) !== norm(before)) {
    changed += 1;
    if (CHECK) problems.push(`${file}: card plates are stale — run \`npm run sync:card-motifs\``);
    else fs.writeFileSync(full, html);
  }
}

if (problems.length) fail(problems.join('\n  '));
const blocks = Object.values(DECLARED).reduce((a, p) => a + Object.keys(p).length, 0);
console.log(CHECK
  ? `Card plates verified: ${cards} cards across ${blocks} blocks, every figure declared and drawable.`
  : `Card plates synced: ${cards} cards across ${blocks} blocks, ${changed} page(s) rewritten.`);
