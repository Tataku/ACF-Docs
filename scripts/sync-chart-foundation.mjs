#!/usr/bin/env node
/* ───────────────────────────────────────────────────────────────────────────
 * sync-chart-foundation.mjs — the copy-with-sync sharing mechanism for the
 * shared chart foundation ("@acf/chart-foundation").
 *
 * Canonical home: ACF-Docs `components/framework-charts/chart-core/` (owner
 * decision, July 2026 — sharing mechanism (c) "copy-with-a-sync-script" per
 * CHART_ENGINE_UNIFICATION_PROPOSAL_v1.md §6). This script copies the portable
 * bricks (grammar · multilane · format · index + tests + README) into a
 * consuming repo, stamping each module with a DO-NOT-EDIT banner and writing a
 * manifest recording the source commit and content hashes.
 *
 * The consumer is passed EXPLICITLY — nothing is hardcoded and no repo is
 * touched unless the operator points the script at it. Wiring the sync into
 * ACFDashboard remains an owner-gated slice in that repo.
 *
 * Usage:
 *   node scripts/sync-chart-foundation.mjs --dest <target-dir>           # sync
 *   node scripts/sync-chart-foundation.mjs --dest <target-dir> --check   # drift check
 *
 * --check recomputes what a fresh sync WOULD write from the current source and
 * compares it byte-for-byte with the destination: any difference — a manual
 * edit on the consumer side OR the canonical source having moved forward —
 * reports as drift and exits 1 (usable as a consumer-side CI guard).
 * ─────────────────────────────────────────────────────────────────────────── */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'components', 'framework-charts', 'chart-core');

const args = process.argv.slice(2);
const destIx = args.indexOf('--dest');
const CHECK = args.includes('--check');
if (destIx < 0 || !args[destIx + 1]) {
  console.error('usage: node scripts/sync-chart-foundation.mjs --dest <target-dir> [--check]');
  process.exit(2);
}
const DEST = resolve(args[destIx + 1]);
if (resolve(DEST) === resolve(SRC)) { console.error('refusing: --dest is the canonical source'); process.exit(2); }

let sourceCommit = 'unknown';
try { sourceCommit = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim(); } catch { /* not a git checkout */ }

// The portable surface: every module + test + the contract README. Discovered,
// not hardcoded, so new chart-core bricks ship automatically.
const files = [];
for (const f of readdirSync(SRC, { withFileTypes: true })) {
  if (f.isFile()) files.push(f.name);
  else if (f.isDirectory() && f.name === 'tests') {
    for (const t of readdirSync(join(SRC, 'tests'))) files.push(join('tests', t));
  }
}
files.sort();

const banner = (rel) => `/* AUTO-SYNCED from ACF-Docs components/framework-charts/chart-core/${rel} @ ${sourceCommit}
 * DO NOT EDIT HERE — the canonical home is ACF-Docs (owner decision: copy-with-sync,
 * CHART_ENGINE_UNIFICATION_PROPOSAL_v1.md §6). Edit there, then re-run:
 *   node scripts/sync-chart-foundation.mjs --dest <this directory>
 */
`;

// What a fresh sync would write for each file (banner on .mjs modules; other
// files — README.md — copied verbatim).
const render = (rel) => {
  const raw = readFileSync(join(SRC, rel), 'utf8');
  return rel.endsWith('.mjs') ? banner(rel) + raw : raw;
};

const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);

if (CHECK) {
  const drift = [];
  for (const rel of files) {
    const target = join(DEST, rel);
    if (!existsSync(target)) { drift.push(`${rel}: missing in dest`); continue; }
    // compare source content only (ignore the banner line's commit stamp so a
    // no-op re-sync after an unrelated commit does not read as drift)
    const strip = (s) => s.replace(/^\/\* AUTO-SYNCED[\s\S]*?\*\/\n/, '');
    if (strip(readFileSync(target, 'utf8')) !== strip(render(rel))) drift.push(`${rel}: content differs from canonical source`);
  }
  if (drift.length) {
    console.error(`✗ chart-foundation drift (${drift.length} file${drift.length > 1 ? 's' : ''}):`);
    drift.forEach((d) => console.error(`  · ${d}`));
    console.error('  → re-run the sync from ACF-Docs (canonical), or upstream your local change first.');
    process.exit(1);
  }
  console.log(`✓ chart-foundation in sync — ${files.length} files match the canonical source`);
  process.exit(0);
}

const manifest = { source: 'ACF-Docs components/framework-charts/chart-core', sourceCommit, syncedAt: new Date().toISOString(), files: {} };
for (const rel of files) {
  const out = render(rel);
  const target = join(DEST, rel);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, out);
  manifest.files[rel] = sha(out);
}
writeFileSync(join(DEST, 'chart-foundation.manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`✓ synced ${files.length} chart-foundation files → ${DEST} (source @ ${sourceCommit})`);
console.log('  manifest: chart-foundation.manifest.json · verify later with --check');
