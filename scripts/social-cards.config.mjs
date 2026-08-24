/**
 * Shared configuration for the social card pair and the metadata that points
 * at it. Both build-social-cards.mjs and build-social-meta.mjs read this.
 *
 * It exists because the page list was briefly duplicated across those two
 * scripts, which is the same second-source-of-truth this whole pipeline was
 * built to avoid — a page added to one list and not the other would render art
 * nothing referenced, or reference art nothing rendered.
 */

/** Every page reachable on a clean slug (see next.config.mjs siteBRewrites). */
export const PAGES = Object.freeze([
  'cover-docs', 'part-1-foundation', 'part-1-pictures', 'part-2-lineage-macro',
  'part-3-bitcoin-convexity', 'part-4-tax-architecture', 'part-5-portfolio-construction',
  'part-6-convexity-scoring', 'glossary', 'framework-in-math', 'framework-in-pictures',
]);

/**
 * Card palettes, transcribed from tokens.css `:root` and `[data-theme="dark"]`.
 *
 * Literal because a PNG cannot read a custom property. Kept in one block so a
 * token change has exactly one place to land, and named after the tokens they
 * came from so the correspondence is checkable by eye.
 */
export const THEMES = Object.freeze({
  light: Object.freeze({
    paper: '#f7f4ec',       // --paper
    inkDisplay: '#16130d',  // --ink-display
    inkMuted: '#514b40',    // --ink-muted
    accent: '#0d7d6b',      // --accent  (deep teal, 4.9:1 on paper)
    rule: '#dcd6ca',        // --rule
  }),
  dark: Object.freeze({
    paper: '#14171a',
    inkDisplay: '#f3efe6',
    inkMuted: '#c8cbc6',
    accent: '#34d399',
    rule: '#2a3137',
  }),
});

/**
 * WHICH CARD THE META TAGS POINT AT — and why this is a constant rather than
 * something negotiated at request time.
 *
 * og:image is a single URL fetched by a crawler that has no theme and no
 * viewer. There is no prefers-color-scheme for a social card the way there is
 * for the favicon: whatever is named here is what every reader gets, in every
 * client, in either appearance. So this is a design decision, not a capability.
 *
 * It is 'light' because the site's own default is light — tokens.css puts the
 * warm paper on `:root` and treats dark as the opt-in override. A card should
 * agree with the page it opens; a dark card that lands on cream paper reads as
 * a different site. Readers who have chosen dark get the dark page, which is
 * their explicit override, and the card still reads because it carries its own
 * ground rather than borrowing the feed's.
 *
 * Flipping this to 'dark' re-points all 11 pages on the next
 * `npm run build:social-meta`; both sets are always rendered, so no
 * re-rendering is needed to switch.
 */
export const CARD_THEME = 'light';

export const CARD_DIR = ['public', 'site-b', 'brand', 'social'];

/** Art filename for a page in a given theme. Always suffixed — an unsuffixed
 *  name would make "which theme is this" a thing you had to open the file to
 *  learn. */
export const cardFile = (page, theme) => `${page}-${theme}.png`;
