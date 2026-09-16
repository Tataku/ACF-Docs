/**
 * Posture rails — the allocation spine on the Part 5 trio
 *
 * Run: npm run test:posture-rails
 *
 * Each posture card carries a vertical 0–100% rail: the AGGREGATE band lit
 * where that posture may live in the portfolio, the per-position band as a thin
 * inner marker, Hype's hard cap as a bar. Three things have to hold:
 *
 *   1. ONE SOURCE. The rail restates the numbers on the card's own stat line,
 *      so it is never authored: scripts/sync-posture-rails.mjs derives it from
 *      that line, and `--check` refuses a build in which any rail disagrees.
 *   2. CHARACTER, SUBTLY. Torque (the driving force) has a plume and a chevron
 *      and grows from the foot; Ballast (stability) sits on a keel and does not
 *      move — no hover rule touches it, and it fades in rather than grows; Hype
 *      (speculation) is dashed and translucent under its cap, overshoots on the
 *      way in, and its ghost past the cap shows only under the pointer. The
 *      keyboard gets every pointer move.
 *   3. DECORATIVE. The rail is aria-hidden, identity stays colour PLUS name, and
 *      the hidden pre-state lives inside the no-preference gate so reduced
 *      motion paints the finished rail.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const PAGE = read('public/site-b/part-5-portfolio-construction.html');
const CSS = read('public/site-b/reading-system.css');
const PLATES_JS = read('public/site-b/plates.js');
const PKG = JSON.parse(read('package.json'));

const card = (posture) => {
  const i = PAGE.indexOf(`<a class="posture-card" href="#${posture}" data-posture="${posture}">`);
  assert.ok(i > -1, `${posture} card`);
  return PAGE.slice(i, PAGE.indexOf('</a>', i));
};
const vars = (posture) => Object.fromEntries([...card(posture).match(/<span class="pc-rail" aria-hidden="true" style="([^"]+)">/)[1].matchAll(/--(\w+):(\d+)/g)].map((m) => [m[1], +m[2]]));

// ---------------------------------------------------------------------------
// 1. One source
// ---------------------------------------------------------------------------
test('sync: the audit passes — every rail states exactly what its card’s stats state', () => {
  const r = spawnSync(process.execPath, ['scripts/sync-posture-rails.mjs', '--check'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr || r.stdout);
});

test('sync: in the prebuild chain, with its own audit script', () => {
  assert.match(PKG.scripts.prebuild, /npm run sync:posture-rails/);
  assert.equal(PKG.scripts['audit:posture-rails'], 'node scripts/sync-posture-rails.mjs --check');
});

test('source: the rail’s numbers are the stat line’s numbers, read from the same markup', () => {
  const torque = vars('torque'), ballast = vars('ballast'), hype = vars('hype');
  assert.deepEqual(torque, { lo: 40, hi: 60, plo: 3, phi: 15 });
  assert.deepEqual(ballast, { lo: 20, hi: 35, plo: 2, phi: 8 });
  assert.deepEqual(hype, { lo: 0, hi: 10, plo: 2, phi: 5, cap: 10 });
  assert.match(card('torque'), /<em>40&ndash;60%<\/em>aggregate/);
  assert.match(card('hype'), /<em>&le;10%<\/em>hard cap/);
  assert.match(card('torque'), /<span class="pc-lbl" data-label="Aggregate 40–60%"><\/span>/);
  assert.match(card('hype'), /<span class="pc-lbl" data-label="Hard cap ≤10%"><\/span>/);
  // no text nodes in a rail: the reading time counts words, and a decoration is not one
  for (const p of ['torque', 'ballast', 'hype']) {
    const rail = card(p).match(/<span class="pc-rail"[\s\S]*?<\/span>\n/)[0];
    assert.equal(rail.replace(/<[^>]+>/g, '').trim(), '', `${p}: the rail carries no text`);
  }
  assert.match(CSS, /\.pc-lbl::before \{ content: attr\(data-label\); \}/);
  assert.match(CSS, /\.pc-end--top::before \{ content: '100'; \}/);
  // no rail is typed: the sync refuses stats it cannot read and bands out of order
  const src = read('scripts/sync-posture-rails.mjs');
  assert.match(src, /could not read/);
  assert.match(src, /bands out of order/);
});

// ---------------------------------------------------------------------------
// 2. Character, subtly
// ---------------------------------------------------------------------------
test('character: Torque drives, Ballast holds, Hype is capped — each in the parts its rail carries', () => {
  assert.match(card('torque'), /pc-thrust[\s\S]*pc-band[\s\S]*pc-tip/, 'Torque: plume below the band in source, chevron after');
  assert.doesNotMatch(card('torque'), /pc-keel|pc-cap|pc-ghost/);
  assert.match(card('ballast'), /pc-band[\s\S]*pc-keel/, 'Ballast: a keel under the band');
  assert.doesNotMatch(card('ballast'), /pc-thrust|pc-tip|pc-cap|pc-ghost/);
  assert.match(card('hype'), /pc-band[\s\S]*pc-cap[\s\S]*pc-ghost/, 'Hype: the cap and the ghost past it');
  assert.doesNotMatch(card('hype'), /pc-thrust|pc-tip|pc-keel/);
});

test('character: the drawing of the band differs, the scale does not', () => {
  assert.match(CSS, /\.posture-card\[data-posture="torque"\] \.pc-band \{\s*background: linear-gradient\(to top/, 'Torque: brightest at its head');
  assert.match(CSS, /\.posture-card\[data-posture="ballast"\] \.pc-band \{[^}]*box-shadow: none;/, 'Ballast: flat, no glow');
  assert.match(CSS, /\.posture-card\[data-posture="hype"\] \.pc-band \{[^}]*outline: 1px dashed/, 'Hype: a dashed edge');
  assert.match(CSS, /\.pc-cap::after \{ content: 'cap';/);
  // one scale for all three: the same --pc-top / --pc-run arithmetic
  const rail = CSS.slice(CSS.indexOf('.pc-rail {'), CSS.indexOf('.pc-scale,'));
  assert.match(rail, /--pc-top: 18px;/);
  assert.match(rail, /--pc-run: calc\(100% - 36px\);/);
  for (const part of ['.pc-band', '.pc-pos']) assert.match(CSS, new RegExp(`${part.replace('.', '\\.')} \\{[^}]*top: calc\\(var\\(--pc-top\\) \\+ \\(100 - var\\(--(hi|phi)\\)\\) \\* var\\(--pc-run\\) / 100\\);`));
});

test('character: under the pointer Torque lifts and Hype confesses; Ballast is left alone, and the keyboard gets every move', () => {
  const hovers = [...CSS.matchAll(/^\.posture-card\[data-posture="(\w+)"\]:hover (\.pc-\w+),\s*\.posture-card\[data-posture="\1"\]:focus-visible \2\s*\{([^}]*)\}/gm)];
  const byPosture = {};
  for (const [, posture, part, body] of hovers) (byPosture[posture] ||= []).push({ part, body: body.trim() });
  assert.deepEqual(byPosture.torque.map((h) => h.part).sort(), ['.pc-thrust', '.pc-tip']);
  assert.match(byPosture.torque.find((h) => h.part === '.pc-tip').body, /transform: translateY\(-3px\) rotate\(45deg\);/);
  assert.deepEqual(byPosture.hype.map((h) => h.part), ['.pc-ghost']);
  assert.equal(byPosture.ballast, undefined, 'stability: no hover rule moves anything on Ballast');
  // every posture hover on the rail is paired with focus-visible — the regex above only matched pairs; make sure no unpaired one exists
  const unpaired = [...CSS.matchAll(/^\.posture-card\[data-posture="\w+"\]:hover \.pc-\w+\s*\{/gm)];
  assert.equal(unpaired.length, 0, 'a rail hover without its focus-visible twin');
  // transform / opacity only
  for (const h of hovers) for (const prop of h[3].matchAll(/([\w-]+)\s*:/g)) assert.ok(['transform', 'opacity'].includes(prop[1]), `${prop[1]} on hover`);
});

test('character: the draw-in grows Torque and Hype from the foot, fades Ballast in, and overshoots only Hype', () => {
  const gate = CSS.slice(CSS.indexOf('@media (prefers-reduced-motion: no-preference) {\n  .pc-band, .pc-pos { transform-origin: 50% 100%; }'));
  const block = gate.slice(0, gate.indexOf('\n}') + 2);
  assert.match(block, /\.pc-rail:not\(\[data-drawn="true"\]\) \.pc-band, \.pc-rail:not\(\[data-drawn="true"\]\) \.pc-pos \{ transform: scaleY\(0\); \}/, 'hidden pre-state inside the gate');
  assert.match(block, /\.pc-rail\[data-drawn="true"\] \.pc-band \{ animation: dc-art-grow-y calc\(var\(--motion-draw\) \* \.55\)/);
  assert.match(block, /\.posture-card\[data-posture="ballast"\] \.pc-rail\[data-drawn="true"\] \.pc-band \{ animation-name: pc-fade; \}/);
  assert.match(block, /\.posture-card\[data-posture="hype"\] \.pc-rail\[data-drawn="true"\] \.pc-band \{ animation-name: pc-hype-in; \}/);
  assert.match(CSS, /@keyframes pc-hype-in \{ from \{ transform: scaleY\(0\); \} 70% \{ transform: scaleY\(1\.14\); \} \}/);
  assert.doesNotMatch(block, /\d+ms/, 'durations derive from --motion-draw');
  assert.match(PLATES_JS, /querySelectorAll\('\.dc-art, \.pc-rail'\)/, 'plates.js sets data-drawn on the rails');
});

// ---------------------------------------------------------------------------
// 3. Decorative
// ---------------------------------------------------------------------------
test('decorative: the rail is hidden from the accessibility tree, sits under the text, and the card still says its name', () => {
  for (const p of ['torque', 'ballast', 'hype']) {
    const c = card(p);
    assert.equal((c.match(/class="pc-rail"/g) || []).length, 1, `${p}: one rail`);
    assert.match(c, /<span class="pc-rail" aria-hidden="true"/);
    assert.ok(c.indexOf('pc-rail') < c.indexOf('posture-card-eyebrow'), `${p}: the rail is first in source`);
    assert.match(c, new RegExp(`<span class="posture-card-name">${p[0].toUpperCase() + p.slice(1)}</span>`), `${p}: identity is colour plus name`);
  }
  assert.match(CSS, /\.posture-card \{ position: relative; overflow: hidden; padding-left: calc\(var\(--space-6\) \+ 54px\); \}/);
  assert.match(CSS, /\.pc-rail \{[^}]*pointer-events: none;/);
  assert.match(CSS, /\.pc-rail \{[^}]*color: var\(--pi-c, var\(--posture-unclassified-fg\)\);/, 'the posture token, never a hue of its own');
  const rails = CSS.slice(CSS.indexOf('/* ---- Posture rails'), CSS.indexOf('@keyframes pc-hype-in'));
  assert.doesNotMatch(rails.replace(/\/\*[\s\S]*?\*\//g, ''), /#[0-9a-fA-F]{3,8}\b|rgba?\(/, 'no raw colour in the rail rules');
});
