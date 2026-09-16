#!/usr/bin/env node
/**
 * Sync the definition-card motifs — the figure each `.failure-modes` card draws.
 *
 * WHY THIS EXISTS. That family is one component used thirteen times across six
 * pages for sixty-one cards, and it was the last reader-facing card family with
 * no visual treatment at all while the posture cards, the doc cards and the
 * architecture list had one. Flat was not the real problem, though. The real
 * problem is that the family is NOT one kind of list: the framework puts seven
 * different things in it, and the cards looked identical whether they held a
 * closed taxonomy, a tunable envelope, an escalation ladder that deliberately
 * terminates, a quality gauge, a failure mechanism, a market state, or a
 * dollar magnitude. The motif says which — so the drawing carries meaning the
 * prose already has, rather than decoration the prose does not.
 *
 * THE RULE THE POSTURE RAILS ESTABLISHED, KEPT HERE: a number drawn is a number
 * stated. Nothing in a motif is authored where the card already prints it. The
 * TAM bars are read from the `~$12T` in the card's own name; the envelope
 * bounds are read from the `±0.10` and `0.80 to 1.20` in the card's own body.
 * `--check` refuses a build where any of that disagrees.
 *
 * WHAT IS EDITORIAL, AND WHY IT HAS TO BE. Which KIND a block is, and which
 * MECHANISM a failure card draws, cannot be derived from the text — "custody
 * loss" is a seizure and "slow CIS decay" is a decay, and no parser knows that.
 * So they are declared below, in one place, reviewed like prose. The script's
 * job is to make the declaration total: every block must have a kind, every
 * card must have a motif, and a card added tomorrow fails the audit until
 * somebody decides what it means. Silence is the failure mode this prevents —
 * an undeclared card would otherwise just render blank and look intentional.
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
   THE EDITORIAL LAYER. Keyed by page + the block's section eyebrow, which is
   what a reader sees and what a writer would name. Each block declares its
   KIND; each card declares the motif it draws, in the order the cards appear.
   --------------------------------------------------------------------------- */
const DECLARED = {
  'framework-in-math.html': {
    // Four kinds of rule. Mutually exclusive: a value is exactly one of them.
    'Ground Rules':     { kind: 'taxonomy', motifs: ['fixed', 'tunable', 'derived', 'illustrative'] },
    // Three levers with documented envelopes, and a fourth card that closes the set.
    'Position Quality': { kind: 'envelope', motifs: ['band', 'band', 'floor', 'closed'] },
    // An escalation that rises and then, deliberately, does not complete.
    'Governance':       { kind: 'ladder',   motifs: ['rung', 'rung', 'rung', 'rung', 'rung', 'absent'] },
    // Four ways an instrument can be classified against one asset.
    'The Backbone':     { kind: 'taxonomy', motifs: ['fixed', 'tunable', 'excluded', 'excluded'] },
    // Four dimensions of evidence quality, each a measure from nothing to full.
    'Epistemics':       { kind: 'gauge',    motifs: ['gauge', 'gauge', 'gauge', 'gauge'] },
  },
  'part-1-foundation.html': {
    'Order of Operations': { kind: 'mechanism',
      motifs: ['drift', 'reflexive', 'convergence', 'erosion', 'overload', 'reflexive'] },
  },
  'part-3-bitcoin-convexity.html': {
    // Two investors, one concentrated and one diversified — a comparison, not a list.
    'Why Not 100% Bitcoin':  { kind: 'compare',   motifs: ['concentrated', 'spread'] },
    'Risk Register':         { kind: 'mechanism',
      motifs: ['rupture', 'seizure', 'seizure', 'counterparty', 'liquidity',
               'cascade', 'erosion', 'seizure', 'counterparty', 'displacement'] },
    // Three states of one signal, with a prescribed response to each.
    'Valuation Discipline':  { kind: 'state',     motifs: ['clustered', 'converged', 'diverged'] },
    // Four components of one addressable market. Magnitudes read from the names.
    'Addressable Market & Implementation': { kind: 'magnitude',
      motifs: ['share', 'share', 'share', 'share'] },
  },
  'part-4-tax-architecture.html': {
    'Income, Ballast, and Harvesting': { kind: 'mechanism',
      motifs: ['counterparty', 'ratesensitivity', 'reclassification', 'convergence', 'openended'] },
  },
  'part-5-portfolio-construction.html': {
    'Disciplined Speculation': { kind: 'mechanism',
      motifs: ['reflexive', 'overextension', 'depletion', 'erosion'] },
  },
  'part-6-convexity-scoring.html': {
    'Failure Modes': { kind: 'mechanism',
      motifs: ['decay', 'drift', 'accretion', 'convergence', 'reflexive'] },
  },
};

/** Every motif the stylesheet can draw, by kind. A motif outside its kind is a typo. */
const VOCABULARY = {
  taxonomy:  ['fixed', 'tunable', 'derived', 'illustrative', 'excluded'],
  envelope:  ['band', 'floor', 'closed'],
  ladder:    ['rung', 'absent'],
  gauge:     ['gauge'],
  state:     ['clustered', 'converged', 'diverged'],
  magnitude: ['share'],
  compare:   ['concentrated', 'spread'],
  mechanism: ['decay', 'drift', 'cascade', 'erosion', 'convergence', 'reflexive', 'rupture',
              'seizure', 'counterparty', 'liquidity', 'displacement', 'overload',
              'overextension', 'depletion', 'accretion', 'ratesensitivity',
              'reclassification', 'openended'],
};

const DECODE = [['&amp;', '&'], ['&middot;', '·'], ['&rsquo;', '’'], ['&mdash;', '—'],
                ['&ndash;', '–'], ['&plusmn;', '±'], ['&times;', '×'], ['&gt;', '>'], ['&lt;', '<']];
const text = (s) => DECODE.reduce((a, [x, y]) => a.split(x).join(y), s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

/** Balanced-div scan: the blocks are pretty-printed on some pages and inline on others. */
function scanDivs(html, from, open) {
  let depth = 1;
  const re = /<div\b[^>]*>|<\/div>/g;
  re.lastIndex = from;
  for (let m; (m = re.exec(html));) {
    depth += m[0] === '</div>' ? -1 : 1;
    if (depth === 0) return { inner: html.slice(from, m.index), end: re.lastIndex };
  }
  fail(`unbalanced <div> after offset ${open}`);
}

function blocksOf(html) {
  const out = [];
  for (const m of html.matchAll(/<div class="failure-modes"(?:\s+data-kind="[^"]*")?>/g)) {
    const { inner, end } = scanDivs(html, m.index + m[0].length, m.index);
    const pre = html.slice(0, m.index);
    const eyebrow = [...pre.matchAll(/section-eyebrow[^>]*>([^<]{2,80})/g)].pop();
    out.push({ start: m.index, open: m[0], inner, end, section: eyebrow ? text(eyebrow[1]) : '?' });
  }
  return out;
}

function cardsOf(inner) {
  const out = [];
  const re = /<div\b([^>]*)>/g;
  for (let m; (m = re.exec(inner));) {
    const { inner: seg, end } = scanDivs(inner, m.index + m[0].length, m.index);
    const name = /<span class="name">([\s\S]*?)<\/span>/.exec(seg);
    if (name) out.push({ start: m.index, openLen: m[0].length, attrs: m[1], seg, name: text(name[1]) });
    re.lastIndex = end;
  }
  return out;
}

/* --- Derivations. Read from what the card already prints, never authored. --- */

/** `~$12T` in a magnitude card's own name. */
function magnitude(name) {
  const m = /~?\$(\d+(?:\.\d+)?)\s*T/i.exec(name);
  if (!m) fail(`magnitude card "${name}" prints no $NT figure to draw`);
  return Number(m[1]);
}

/** `±0.10`, `0.80 to 1.20` in an envelope card's own body. */
function envelope(body) {
  const pm = /±\s*(\d*\.?\d+)/.exec(body);
  if (pm) return { span: Number(pm[1]) * 2, sym: 1 };
  const to = /(\d*\.?\d+)\s*to\s*(\d*\.?\d+)/.exec(body);
  if (to) return { span: Number(to[2]) - Number(to[1]), sym: 0 };
  return null;
}

let changed = 0, cards = 0, problems = [];

for (const file of fs.readdirSync(SITE).filter((f) => f.endsWith('.html'))) {
  const full = path.join(SITE, file);
  let html = fs.readFileSync(full, 'utf8');
  const blocks = blocksOf(html);
  if (!blocks.length) continue;
  const declaredPage = DECLARED[file];
  if (!declaredPage) { problems.push(`${file}: has ${blocks.length} card block(s) and no declaration`); continue; }

  // Rebuild from the end so earlier offsets stay valid.
  for (const b of [...blocks].reverse()) {
    const spec = declaredPage[b.section];
    if (!spec) { problems.push(`${file}: block "${b.section}" is not declared`); continue; }
    if (!VOCABULARY[spec.kind]) { problems.push(`${file}/${b.section}: unknown kind "${spec.kind}"`); continue; }
    const cs = cardsOf(b.inner);
    if (cs.length !== spec.motifs.length) {
      problems.push(`${file}/${b.section}: ${cs.length} card(s) but ${spec.motifs.length} motif(s) declared`);
      continue;
    }

    let inner = b.inner;
    for (let i = cs.length - 1; i >= 0; i -= 1) {
      const c = cs[i];
      const motif = spec.motifs[i];
      cards += 1;
      if (!VOCABULARY[spec.kind].includes(motif)) {
        problems.push(`${file}/${b.section}: motif "${motif}" is not in the ${spec.kind} vocabulary`);
        continue;
      }
      const vars = [];
      if (spec.kind === 'magnitude') vars.push(`--m:${magnitude(c.name)}`);
      if (spec.kind === 'ladder') vars.push(`--step:${i + 1}`, `--steps:${cs.length}`);
      if (spec.kind === 'taxonomy' || spec.kind === 'state' || spec.kind === 'compare') {
        vars.push(`--slot:${i + 1}`, `--slots:${cs.length}`);
      }
      if (spec.kind === 'envelope') {
        const body = text(/<p>([\s\S]*?)<\/p>/.exec(c.seg)?.[1] ?? '');
        const e = envelope(body);
        if (e) vars.push(`--sym:${e.sym}`);
      }
      const attr = ` data-figure="${motif}"${vars.length ? ` style="${vars.join(';')}"` : ''}`;
      const open = `<div${attr}>`;
      inner = inner.slice(0, c.start) + open + inner.slice(c.start + c.openLen);
    }

    // The figure is decoration: it states nothing the card does not, so it is
    // hidden from assistive technology exactly as the posture rail is.
    const openTag = `<div class="failure-modes" data-kind="${spec.kind}">`;
    const rebuilt = html.slice(0, b.start) + openTag + inner + '</div>' + html.slice(b.end);
    if (rebuilt !== html) { html = rebuilt; }
  }

  // Normalise the TAM total if the section prints one, so the bars and the sum agree.
  const before = fs.readFileSync(full, 'utf8');
  if (html !== before) {
    changed += 1;
    if (!CHECK) fs.writeFileSync(full, html);
    else problems.push(`${file}: motifs are stale — run \`npm run sync:card-motifs\``);
  }
}

if (problems.length) fail(problems.join('\n  '));
console.log(CHECK
  ? `Card motifs verified: ${cards} cards across ${Object.values(DECLARED).reduce((a, p) => a + Object.keys(p).length, 0)} blocks, all declared and in vocabulary.`
  : `Card motifs synced: ${cards} cards, ${changed} page(s) rewritten.`);
