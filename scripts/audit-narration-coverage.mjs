#!/usr/bin/env node
/**
 * Narration coverage audit.
 *
 * The narrator used to read three selectors and silently drop everything else —
 * 44.5% of the book, including every bullet list, every numbered requirement,
 * every pull quote, and both cards of every side-by-side example. Nothing went
 * red, because unread text looks exactly like read text on the page.
 *
 * This measures that gap and keeps it measured. It does NOT restate the rules:
 * it PARSES `NARRATION_BLOCKS` and `NARRATION_MUTE` out of reading-core.js, so
 * the audit cannot drift from the runtime it audits. A coverage set is
 * discovered, never declared twice.
 *
 *   node scripts/audit-narration-coverage.mjs           report
 *   node scripts/audit-narration-coverage.mjs --check   non-zero if anything
 *                                                       carries text and no rule claims it
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(ROOT, 'public/site-b');
const CORE = path.join(SITE, 'reading-core.js');
const MIN_TEXT = 25;   // ignore micro-labels and single glyphs

// ---- read the contract out of the runtime ---------------------------------
const core = fs.readFileSync(CORE, 'utf8');
function block(name) {
  const m = core.match(new RegExp(`var ${name}\\s*=\\s*([\\s\\S]*?);\\n`));
  if (!m) throw new Error(`${name} not found in reading-core.js — the audit cannot derive its rules`);
  return m[1];
}
const RULES = [...block('NARRATION_BLOCKS').matchAll(/sel:\s*'([^']+)'\s*,\s*kind:\s*'([^']+)'/g)]
  .map(([, sel, kind]) => ({ sel, kind }));
const MUTE = block('NARRATION_MUTE').replace(/^\s*'|'\s*$/g, '').split(',').map(s => s.trim()).filter(Boolean);
if (!RULES.length) throw new Error('NARRATION_BLOCKS parsed empty');

// ---- minimal DOM ----------------------------------------------------------
const VOID = new Set(['br','img','input','hr','meta','link','source','use','path','circle','rect','i','area','col','embed','track','wbr']);
function parse(html) {
  html = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)\b[\s\S]*?<\/\1>/g, '');
  const root = { tag: '#root', cls: [], kids: [], text: [], parent: null };
  let cur = root;
  const re = /<\/?([a-zA-Z][\w:-]*)([^>]*)>|([^<]+)/g;
  let m;
  while ((m = re.exec(html))) {
    if (m[3] !== undefined) { if (m[3].trim()) cur.text.push(m[3]); continue; }
    const tag = m[1].toLowerCase(), attrs = m[2] || '', closing = m[0][1] === '/';
    if (closing) {
      if (VOID.has(tag)) continue;
      let n = cur;
      while (n !== root && n.tag !== tag) n = n.parent;
      if (n !== root && n.parent) cur = n.parent;
      continue;
    }
    if (VOID.has(tag) || /\/>$/.test(m[0])) continue;
    const cm = attrs.match(/class="([^"]*)"/);
    const node = { tag, cls: cm ? cm[1].split(/\s+/).filter(Boolean) : [], kids: [], text: [], parent: cur };
    cur.kids.push(node); cur = node;
  }
  return root;
}
/** Supports exactly the selector shapes the rule table uses: tag, .cls, tag.cls, "a b". */
function matches(node, sel) {
  const parts = sel.trim().split(/\s+/);
  const own = parts[parts.length - 1];
  const m = own.match(/^([a-z0-9]+)?((?:\.[\w-]+)*)$/i);
  if (!m) return false;
  if (m[1] && node.tag !== m[1].toLowerCase()) return false;
  const need = (m[2].match(/\.[\w-]+/g) || []).map(c => c.slice(1));
  if (!need.every(c => node.cls.includes(c))) return false;
  for (let i = parts.length - 2; i >= 0; i--) {     // ancestor terms
    let p = node.parent, ok = false;
    while (p) { if (matches(p, parts[i])) { ok = true; break; } p = p.parent; }
    if (!ok) return false;
  }
  return true;
}
const anyMatch = (n, sels) => sels.some(s => matches(n, s));
function ancestorMuted(n) { let p = n; while (p) { if (anyMatch(p, MUTE)) return true; p = p.parent; } return false; }
function inShellMain(n) { let p = n.parent; while (p) { if (p.cls.includes('shell-main')) return true; p = p.parent; } return false; }
const BLOCKISH = new Set(['p','div','li','ul','ol','h1','h2','h3','h4','section','aside','figure','blockquote','table','thead','tbody','tfoot','tr','td','th','header','footer','figcaption']);
function ownText(n) {
  let out = n.text.join(' ');
  for (const k of n.kids) if (!BLOCKISH.has(k.tag)) out += ' ' + ownText(k);
  return out.replace(/&[a-z]+;|&#\d+;/gi, ' ').replace(/\s+/g, ' ').trim();
}
function all(n, acc = []) { acc.push(n); for (const k of n.kids) all(k, acc); return acc; }

// ---- audit ----------------------------------------------------------------
const TEXTY = new Set(['p','li','h2','h3','h4','blockquote','span','dt','dd','td','th','figcaption']);
const files = fs.readdirSync(SITE).filter(f => /^part-.*\.html$/.test(f)).sort();
let claimedChars = 0, orphanChars = 0;
const orphans = new Map();
const rows = [];

for (const f of files) {
  const root = parse(fs.readFileSync(path.join(SITE, f), 'utf8'));
  let c = 0, o = 0;
  for (const n of all(root)) {
    if (!TEXTY.has(n.tag) || !inShellMain(n)) continue;
    const t = ownText(n);
    if (t.length < MIN_TEXT) continue;
    if (ancestorMuted(n)) continue;                       // muted on purpose
    // claimed if this element, or any ancestor, is named by a rule
    let p = n, claimed = false;
    while (p) { if (RULES.some(r => matches(p, r.sel))) { claimed = true; break; } p = p.parent; }
    if (claimed) { c += t.length; }
    else {
      o += t.length;
      const key = n.tag + (n.cls.length ? '.' + n.cls.join('.') : '');
      orphans.set(key, (orphans.get(key) || 0) + t.length);
    }
  }
  claimedChars += c; orphanChars += o;
  rows.push([f.replace(/\.html$/, ''), c, o]);
}

const total = claimedChars + orphanChars;
const pct = total ? (claimedChars / total * 100) : 100;
console.log(`Narration coverage — ${RULES.length} rules, ${MUTE.length} muted selectors\n`);
console.log(`${'part'.padEnd(32)}${'narrated'.padStart(10)}${'orphan'.padStart(9)}`);
console.log('-'.repeat(51));
for (const [n, c, o] of rows) console.log(`${n.padEnd(32)}${c.toLocaleString().padStart(10)}${o.toLocaleString().padStart(9)}`);
console.log('-'.repeat(51));
console.log(`${'TOTAL'.padEnd(32)}${claimedChars.toLocaleString().padStart(10)}${orphanChars.toLocaleString().padStart(9)}`);
console.log(`\nCoverage: ${pct.toFixed(1)}%`);

if (orphans.size) {
  console.log('\nText no rule claims (add a rule, or mute it with a reason):');
  for (const [k, v] of [...orphans].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
    console.log(`  ${k.padEnd(40)} ${v.toLocaleString()} chars`);
  }
}

if (process.argv.includes('--check')) {
  if (orphanChars > 0) {
    console.error(`\nFAIL: ${orphanChars.toLocaleString()} chars carry text that no narration rule claims.`);
    process.exit(1);
  }
  console.log('\nOK: every text-bearing block is either narrated or muted on purpose.');
}
