/**
 * A control that is hidden must actually be hidden
 *
 * Run: npm run test:hidden-controls
 *
 * `hidden` is a UA `display: none`, which is the weakest declaration in the
 * cascade: any author rule that sets `display` on the same element beats it.
 * So a component styled `display: inline-flex` and marked `hidden` in the
 * markup paints anyway, takes a tab stop, and is announced by a screen reader,
 * while every other signal in the codebase says it is not there.
 *
 * That is not hypothetical. The native Share control on all six part pages was
 * authored `hidden` and enabled by JS only where `navigator.share` exists
 * (reading-core.js), but `.part-action { display: inline-flex }` outranked the
 * UA rule. Measured on a desktop browser with no Web Share API: the attribute
 * was set, the computed display was `flex`, the button rendered 52x52, it was
 * keyboard-focusable, it announced as "Share, button", and clicking it did
 * nothing, because no handler is ever attached.
 *
 * The stylesheet already knew the answer. `.foot-share[hidden]`,
 * `.floatnav[hidden]`, `.gl-empty[hidden]` and the footnote counters all carry
 * the guard. This test generalises those from habit into a rule, so the next
 * component that grows a `display` does not quietly resurrect a dead control.
 *
 * It is derived, not listed: the classes come from the shipped HTML and the
 * rules from the shipped stylesheet, so a new hidden-by-default component is
 * covered the day it is authored.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SITE_B = path.join(ROOT, 'public', 'site-b');
const CSS = fs.readFileSync(path.join(SITE_B, 'reading-system.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');

// Flat rule list. Nested at-rules leave their inner rules visible to this
// scan, which is what we want: a display set inside a media query hides a
// control just as effectively as one set at the top level.
const RULES = [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .map((m) => ({ sel: m[1].trim().replace(/\s+/g, ' '), body: m[2] }))
  .filter((r) => r.sel && !r.sel.startsWith('@'));

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Only the SUBJECT of a selector styles the element. In `.dc-resume .dc-arr`
// the display lands on .dc-arr, so .dc-resume is not made visible by it.
function subjects(selectorList) {
  return selectorList.split(',').map((s) => s.trim().split(/\s*[>+~]\s*|\s+/).pop() || '');
}
const stylesClass = (r, cls) => subjects(r.sel).some((sub) => new RegExp('\\.' + escape(cls) + '(?![\\w-])').test(sub));
const declares = (body) => /(^|;|\s)display\s*:/.test(body);
const declaresNone = (body) => /(^|;|\s)display\s*:\s*none/.test(body);

// Every class that appears on an element carrying a bare `hidden` attribute.
function hiddenClasses() {
  const out = new Map();
  for (const file of fs.readdirSync(SITE_B).filter((f) => f.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(SITE_B, file), 'utf8');
    for (const tag of html.matchAll(/<[a-z][^>]*?\shidden(?=[\s>/])[^>]*>/gi)) {
      const cls = (tag[0].match(/class="([^"]+)"/) || [])[1];
      if (!cls) continue;
      for (const c of cls.trim().split(/\s+/)) {
        if (!out.has(c)) out.set(c, new Set());
        out.get(c).add(file);
      }
    }
  }
  return out;
}

test('a class used on a [hidden] element never keeps a visible display without a guard', () => {
  const found = hiddenClasses();
  assert.ok(found.size >= 5, `expected the hidden-by-default components, saw ${found.size}`);

  const gaps = [];
  for (const [cls, files] of found) {
    const styled = RULES.filter((r) => stylesClass(r, cls) && declares(r.body));
    const makesVisible = styled.filter((r) => !/\[hidden\]/.test(r.sel) && !declaresNone(r.body));
    if (!makesVisible.length) continue;                       // never given a display: nothing to defeat
    const guarded = styled.some((r) => /\[hidden\]/.test(r.sel) && declaresNone(r.body));
    if (!guarded) {
      gaps.push(`.${cls} is set to ${makesVisible.map((r) => (r.body.match(/display\s*:\s*([^;]+)/) || [])[1].trim()).join('/')} ` +
        `by {${makesVisible.map((r) => r.sel).join(', ')}} and is used on a [hidden] element in ` +
        `${[...files].sort().join(', ')}, but no .${cls}[hidden] rule restores display: none`);
    }
  }
  assert.deepEqual(gaps, [],
    'a hidden control that still paints takes a tab stop and is announced while doing nothing:\n  ' + gaps.join('\n  '));
});

test('the native Share control cannot paint where the Web Share API is absent', () => {
  // The instance that prompted the rule above, pinned by name so the diff says
  // what it protects. The button is authored hidden on every part page and is
  // only ever un-hidden by reading-core.js when navigator.share exists.
  const pages = fs.readdirSync(SITE_B)
    .filter((f) => f.endsWith('.html'))
    .filter((f) => fs.readFileSync(path.join(SITE_B, f), 'utf8').includes('part-share-native'));
  assert.ok(pages.length >= 6, `expected the six part pages to carry it, saw ${pages.length}`);
  for (const file of pages) {
    const html = fs.readFileSync(path.join(SITE_B, file), 'utf8');
    assert.match(html, /<button[^>]*class="[^"]*part-share-native[^"]*"[^>]*\shidden(?=[\s>/])/,
      `${file}: the Share button must ship hidden`);
  }
  const guard = RULES.find((r) => /\.part-action\[hidden\]/.test(r.sel) && declaresNone(r.body));
  assert.ok(guard, '.part-action[hidden] { display: none } is missing, so `hidden` loses to .part-action’s own display');

  const core = fs.readFileSync(path.join(SITE_B, 'reading-core.js'), 'utf8');
  assert.match(core, /if \(navigator\.share/, 'the control is still gated on the capability it needs');
});
