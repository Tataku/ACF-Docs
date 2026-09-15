/**
 * Shared shell surgery for the GENERATED reference pages.
 *
 * WHY THIS EXISTS. Three pages are built by cloning a live part page's shell
 * (`glossary.html`, `framework-in-pictures.html`, `framework-in-math.html`) so
 * the reference surface can never diverge from the reading surface. The clone
 * is deliberate; what it drags along is not. Part 6 is the donor, so every
 * clone inherits Part 6's place IN THE SERIES:
 *
 *   - the `<nav class="next-up">` band at the foot of the page, and
 *   - the floating dock's prev/next segment, which reads
 *     "← Part 5 · Series complete".
 *
 * A reference page is not Part 7. All three generators stripped the band; only
 * the glossary generator (2026-09-15) stripped the dock, so Pictures and Math
 * advertised a position in a series they are not in for as long as they have
 * existed. That is the shape this module exists to prevent: a rule with no home
 * is re-learned at every call site, and one of them learns it wrong.
 *
 * So the rule lives here, once, and it FAILS CLOSED. If the donor's dock is
 * ever re-authored into a different shape, the replace stops matching and the
 * build stops — rather than silently shipping the chain again on three pages.
 */

/** Matches the dock's prev/next segment: divider + prev link + divider + next. */
const SERIES_CHAIN = /\s*<span class="floatnav-div" aria-hidden="true"><\/span>\s*<a class="floatnav-prev"[\s\S]*?<\/a>\s*<span class="floatnav-div" aria-hidden="true"><\/span>\s*<span class="floatnav-next"[\s\S]*?<\/span>/;

/** Matches the foot-of-page "next up" band. */
const NEXT_UP = /\s*<nav class="next-up"[\s\S]*?<\/nav>/g;

/**
 * Remove every trace of the donor's series position from a cloned shell.
 *
 * The dock keeps its Back-to-top button and its Framework home link — those are
 * navigation, not series furniture, and a reference page wants both.
 *
 * @param {string} html   the cloned shell, after <main> has been swapped
 * @param {string} label  the generator's name, for the failure message
 * @returns {string} the html with the band and the chain removed
 */
export function stripSeriesChain(html, label) {
  let out = html.replace(NEXT_UP, '');
  out = out.replace(SERIES_CHAIN, '');

  // Mark the dock as chainless. The mobile dock rule hides the Framework/home
  // segment because "its room goes to the Part links" — true on a part page,
  // false here, where removing the chain would otherwise leave a phone reader
  // with a lone Back-to-top button and the dangling divider that used to sit
  // before the home link. The attribute is set at the same moment the chain is
  // removed, by the same function, so the markup and the CSS cannot drift.
  out = out.replace(/<nav class="floatnav"/, '<nav class="floatnav" data-no-series');
  if (!/<nav class="floatnav" data-no-series/.test(out)) {
    console.error(`${label} failed: could not mark the dock as chainless.`);
    process.exit(1);
  }

  if (/floatnav-prev|floatnav-next|class="next-up"/.test(out)) {
    console.error(
      `${label} failed: the donor shell's series chain changed shape and was not removed.\n` +
      '  A reference page must not advertise a place in the six-part series.\n' +
      '  Fix the patterns in scripts/site-b-shell.mjs — once, for all three pages.'
    );
    process.exit(1);
  }
  // A dock that lost its own controls is a different bug, and just as silent.
  if (!/floatnav-top/.test(out) || !/floatnav-home/.test(out)) {
    console.error(`${label} failed: the dock lost Back-to-top or the Framework home link.`);
    process.exit(1);
  }
  return out;
}
