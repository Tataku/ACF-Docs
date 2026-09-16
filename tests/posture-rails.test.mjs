/**
 * Posture rails — the allocation spine on the Part 5 trio
 *
 * Run: npm run test:posture-rails
 *
 * Each posture card carries a vertical 0–100% rail in its left padding — the
 * AGGREGATE band lit where that posture may live in the portfolio, the
 * per-position band as a thin inner marker, Hype's hard cap as a bar — and a
 * belt: the aggregate band continued under the card's text as a faint field
 * that fades out to the right, so the text keeps its width and the overlap
 * reads as a transition. Three things have to hold:
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
  // no label and no text nodes in a rail: the stat line already says the number, and
  // the reading time counts words — a decoration is not one
  for (const p of ['torque', 'ballast', 'hype']) {
    const rail = card(p).match(/<span class="pc-rail"[\s\S]*?<\/span>\n/)[0];
    assert.equal(rail.replace(/<[^>]+>/g, '').trim(), '', `${p}: the rail carries no text`);
    assert.doesNotMatch(rail, /pc-lbl|data-label/, `${p}: no label`);
  }
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
  for (const p of ['torque', 'ballast', 'hype']) assert.match(card(p), /pc-ticks[\s\S]*pc-belt[\s\S]*pc-band/, `${p}: the belt paints under the band core`);
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
  assert.match(CSS, /\.pc-cap::after \{ content: 'cap'; position: absolute; right: 0; bottom: 4px; writing-mode: vertical-rl;/, 'the cap word stands in the gutter, never the text column');
  // one scale for all three: the same --pc-top / --pc-run arithmetic
  const rail = CSS.slice(CSS.indexOf('.pc-rail {'), CSS.indexOf('.pc-scale,'));
  assert.match(rail, /--pc-top: 18px;/);
  assert.match(rail, /--pc-run: calc\(100% - 36px\);/);
  for (const part of ['.pc-belt', '.pc-band', '.pc-pos']) assert.match(CSS, new RegExp(`${part.replace('.', '\\.')} \\{[^}]*top: calc\\(var\\(--pc-top\\) \\+ \\(100 - var\\(--(hi|phi)\\)\\) \\* var\\(--pc-run\\) / 100\\);`));
});

test('overlap: the geometry sits in the card’s own padding, the belt runs under the text and fades, and the text paints above it', () => {
  assert.match(CSS, /\.posture-card \{ position: relative; overflow: hidden; padding-left: calc\(var\(--space-6\) \+ 8px\); \}/, 'eight pixels, not fifty-four');
  assert.match(CSS, /\.posture-card > :not\(\.pc-rail\) \{ position: relative; z-index: 1; \}/, 'text above the rail');
  assert.match(CSS, /\.pc-rail \{[^}]*inset: 0; z-index: 0;/, 'the rail is the whole card');
  const belt = CSS.match(/\n\.pc-belt \{([^}]*)\}/)[1];
  assert.match(belt, /left: 0; right: 0;/);
  assert.match(belt, /background: linear-gradient\(to right,[^;]*transparent 84%\);/, 'fades out before the right edge');
  assert.match(belt, /opacity: \.9; transition: opacity var\(--motion-base\)/);
  assert.match(CSS, /\.posture-card:hover \.pc-belt, \.posture-card:focus-visible \.pc-belt \{ opacity: 1; \}/, 'the field lights with the card');
  // the core geometry lives inside the 32px the text now clears: band 6–21, marker 24–27, scale at 13
  assert.match(CSS, /\.pc-band \{ left: 6px; width: 15px;/);
  assert.match(CSS, /\.pc-pos \{ left: 24px; width: 3px;/);
  assert.match(CSS, /\.pc-scale \{ left: 13px;/);
  // each posture's belt has its character: Torque feathers upward, Ballast's keel line runs on and fades, Hype is thinner
  assert.match(CSS, /\.posture-card\[data-posture="torque"\] \.pc-belt::before \{[^}]*bottom: 100%; height: 70%;/);
  assert.match(CSS, /\.posture-card\[data-posture="ballast"\] \.pc-belt \{ border-bottom: 1px solid[^}]*mask-image: linear-gradient\(to right, currentColor 30%, transparent 88%\);/);
  assert.match(CSS, /\.posture-card\[data-posture="hype"\] \.pc-belt \{\s*background: linear-gradient\(to right, color-mix\(in oklab, currentColor 18%/);
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
  assert.match(block, /\.pc-rail:not\(\[data-drawn="true"\]\) \.pc-belt,/, 'the belt is hidden until drawn too');
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
  assert.match(CSS, /\.pc-rail \{[^}]*pointer-events: none;/);
  assert.match(CSS, /\.pc-rail \{[^}]*color: var\(--pi-c, var\(--posture-unclassified-fg\)\);/, 'the posture token, never a hue of its own');
  const rails = CSS.slice(CSS.indexOf('/* ---- Posture rails'), CSS.indexOf('@keyframes pc-hype-in'));
  assert.doesNotMatch(rails.replace(/\/\*[\s\S]*?\*\//g, ''), /#[0-9a-fA-F]{3,8}\b|rgba?\(/, 'no raw colour in the rail rules');
});

// ---------------------------------------------------------------------------
// Focus indication
//
// The card is a link, so it is a tab stop on every part page that carries the
// trio. Its hover and focus states were authored as one rule ending in
// `outline: none`, which cancelled the site-wide `:focus-visible` indicator for
// these three elements alone. Measured: `:focus-visible` matched, computed
// outline was `none 0px`, and the only remaining cue was a border change at
// 2.01:1 — under the 3:1 a non-text indicator needs — with its companion lift
// suppressed under reduced motion, leaving nothing at all.
//
// The fix is to stop cancelling, not to invent a local ring: the global rule at
// the top of the stylesheet is the authority, and a card that opts out is a card
// a keyboard user cannot locate.
// ---------------------------------------------------------------------------
test('posture cards keep the site-wide focus ring instead of cancelling it', () => {
  const rule = CSS.slice(CSS.indexOf('.posture-card:hover, .posture-card:focus-visible'));
  const body = rule.slice(rule.indexOf('{'), rule.indexOf('}') + 1);
  assert.ok(body.length > 10 && body.length < 400, 'located the combined hover/focus rule');
  assert.doesNotMatch(body, /outline\s*:\s*(none|0)/,
    'this rule covers :focus-visible, so suppressing the outline here removes the only focus indicator the card has');
  // The shared authority it now inherits.
  assert.match(CSS, /:focus-visible \{ outline: 2px solid var\(--accent\)/,
    'the global focus indicator is what the card falls back to');
  // The hover treatment itself is unchanged: colour plus lift, lift dropped
  // under reduced motion.
  assert.match(body, /border-color:/, 'hover still tints the border');
  assert.match(body, /transform: translateY\(-2px\)/, 'hover still lifts');
});
