#!/usr/bin/env python3
"""
Cut the shipped fonts down to the characters this site can actually put on
screen, and record what the result covers so the claim can be re-checked
without this script.

MAINTAINER TOOL, not part of the build. It needs fontTools and brotli, which CI
does not have and does not need: the subsets are committed like any other built
asset, and `npm run audit:fonts` re-proves their coverage on every pull request
using only Node. Run this when the fonts change, or when audit:fonts says the
corpus has outgrown them.

    npm run build:fonts

WHY SUBSET AT ALL. The six faces ship 1,115,264 bytes and every page pulls at
least four of them, most of them five or six. The corpus is 212 characters.
Inter alone carries 2,852, so a reader downloads roughly fourteen glyphs for
every one they can see. A part page goes from ~1,002 KB of fonts to ~297 KB.

WHAT IS PRESERVED, DELIBERATELY:

  * every layout feature (`--layout-features='*'`). A targeted set saved a
    further 31 KB and would have meant reasoning about which of Inter's 40-odd
    features the stylesheet might reach for. It reaches for `tnum` through
    `font-variant-numeric: tabular-nums` and for the `opsz` axis through
    `font-optical-sizing: auto`; keeping everything means that list never has to
    be right.
  * both variable axes at their full declared ranges. The @font-face rules say
    `font-weight: 100 900`, and the pages render 300 through 700.
  * every name-table record (`--name-IDs='*'`), so the licence and attribution
    travel with the subset. The upstream licences stay beside them.
  * hinting, which pyftsubset keeps by default.

Features that DO disappear from the output — ccmp, mark, mkmk, and a couple of
character-variant sets — go because the glyphs they act on were subset away, not
because shaping changed for anything that remains. There are no combining marks
in the corpus.
"""
import hashlib
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_DIR = os.path.join(ROOT, 'public', 'site-b', 'fonts')
MANIFEST = os.path.join(FONT_DIR, 'subset-manifest.json')
# The full upstream faces live OUTSIDE public/, so they are versioned but never
# deployed. Shipping them beside the subsets would have put 1.1 MB of unused
# bytes on the origin for every release.
SOURCES = os.path.join(ROOT, 'assets', 'fonts-upstream')

FACES = [
    'InterVariable', 'InterVariable-Italic',
    'JetBrainsMono-Regular', 'JetBrainsMono-Medium',
    'JetBrainsMono-SemiBold', 'JetBrainsMono-Bold',
]


def corpus():
    """The one derivation, from scripts/fonts-corpus.mjs. Never a second copy."""
    out = subprocess.run(
        ['node', os.path.join(ROOT, 'scripts', 'fonts-corpus.mjs'), '--json'],
        capture_output=True, text=True, check=True)
    return sorted(json.loads(out.stdout))


def ranges(codepoints):
    """Compact [start, end] pairs, so the manifest stays readable."""
    out, start, prev = [], None, None
    for c in codepoints:
        if start is None:
            start = prev = c
        elif c == prev + 1:
            prev = c
        else:
            out.append([start, prev])
            start = prev = c
    if start is not None:
        out.append([start, prev])
    return out


def main():
    from fontTools.ttLib import TTFont

    want = corpus()
    spec = ','.join('U+%04X' % c for c in want)
    print('Corpus: %d codepoints.' % len(want))

    if not os.path.isdir(SOURCES):
        sys.exit('Missing %s. The full upstream faces belong there, outside public/, '
                 'so they are versioned but never deployed.' % SOURCES)

    manifest = {
        'why': 'Proof that the shipped subsets cover every character the site can render. '
               'Verified on every pull request by scripts/audit-fonts.mjs. Rebuild with npm run build:fonts.',
        'corpusSize': len(want),
        'fonts': {}
    }
    total_before = total_after = 0

    for face in FACES:
        src = os.path.join(SOURCES, face + '.woff2')
        dst = os.path.join(FONT_DIR, face + '.woff2')
        before = os.path.getsize(src)

        subprocess.run([
            'pyftsubset', src,
            '--unicodes=' + spec,
            "--layout-features=*",
            "--name-IDs=*",
            '--flavor=woff2',
            '--output-file=' + dst,
        ], check=True)

        after = os.path.getsize(dst)
        total_before += before
        total_after += after

        source_cmap = set(TTFont(src, lazy=True).getBestCmap())
        subset_cmap = set(TTFont(dst, lazy=True).getBestCmap())

        lost = sorted((set(want) & source_cmap) - subset_cmap)
        if lost:
            sys.exit('%s dropped %d characters it used to have: %s'
                     % (face, len(lost), ' '.join('U+%04X' % c for c in lost)))

        manifest['fonts'][face + '.woff2'] = {
            'bytes': after,
            'sha256': hashlib.sha256(open(dst, 'rb').read()).hexdigest(),
            # What this subset can draw, of the corpus.
            'covers': ranges(sorted(set(want) & subset_cmap)),
            # Corpus characters this face never had, even before subsetting, so
            # they fall back to a system font today exactly as they did before.
            # Recorded so the audit can tell "never had it" from "lost it".
            'absentFromSource': sorted(set(want) - source_cmap),
        }
        print('  %-24s %8d -> %8d  (%d%% smaller)' % (face, before, after, 100 - after * 100 // before))

    with open(MANIFEST, 'w') as fh:
        json.dump(manifest, fh, indent=2)
        fh.write('\n')

    print('\nTotal %d -> %d bytes, %d%% smaller. Manifest written.'
          % (total_before, total_after, 100 - total_after * 100 // total_before))


if __name__ == '__main__':
    main()
