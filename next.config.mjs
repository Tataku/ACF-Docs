/* Canonical routing — the Framework Docs are hand-authored Site B HTML in
 * public/site-b/, served on the clean production slugs via `beforeFiles`
 * rewrites. The legacy MDX part pages are fully retired (deleted 2026-07-13);
 * these rewrites ARE the site's routing, not a temporary shadow. Nextra was
 * removed (2026-08-11) once the agency chart-handoff pages it existed to serve
 * were retired: it rendered exactly one page, and that page was itself shadowed
 * by the `/` rewrite below. Next.js stays because it owns these rewrites and
 * /api/narration (Site B's text-to-speech endpoint) — this is a Next app with
 * no page routes, only an API route and static HTML.
 *
 *   /                                  -> /site-b/cover-docs.html
 *   /part-1-foundation                 -> /site-b/part-1-foundation.html
 *   /part-2-lineage-macro-thesis       -> /site-b/part-2-lineage-macro.html
 *   /part-3-bitcoin-convexity-backbone -> /site-b/part-3-bitcoin-convexity.html
 *   /part-4-tax-architecture-roc-strategy -> /site-b/part-4-tax-architecture.html
 *   /part-5-portfolio-construction-position-management -> /site-b/part-5-portfolio-construction.html
 *   /part-6-convexity-framework-integrity-scoring -> /site-b/part-6-convexity-scoring.html
 *   /part-1-pictures                   -> /site-b/part-1-pictures.html
 *
 * CRAWLER CONTRACT (see tests/crawler-contract.test.mjs, which enforces it):
 *
 *   1. The clean routes above are the indexable surface. Each declares its own
 *      canonical, and no header rule matches them, so they never inherit a
 *      noindex. Header sources match the ORIGINAL request path, which is what
 *      keeps the two apart.
 *   2. The raw /site-b/**.html documents that back them stay fetchable and
 *      carry `X-Robots-Tag: noindex`. THAT header is what suppresses the
 *      duplicate, and it only works on a document a crawler is allowed to
 *      fetch — which is why robots.txt no longer disallows this prefix.
 *   3. Everything else under /site-b/ is a resource the canonical pages need in
 *      order to render or to be shared: the stylesheets, the scripts, the
 *      fonts, the JSON the runtime reads, and the social cards named by
 *      og:image. Those carry no noindex, so the cards stay eligible for image
 *      results and no compliant crawler has a reason to skip them.
 *
 * The header is therefore scoped to `.html` rather than the whole prefix. The
 * earlier `/site-b/:path*` form put a noindex on every stylesheet, font and
 * social card as well, which bought nothing and cost the cards their image
 * indexing. */
const siteBRewrites = [
  { source: "/", destination: "/site-b/cover-docs.html" },
  { source: "/part-1-foundation", destination: "/site-b/part-1-foundation.html" },
  { source: "/part-2-lineage-macro-thesis", destination: "/site-b/part-2-lineage-macro.html" },
  { source: "/part-3-bitcoin-convexity-backbone", destination: "/site-b/part-3-bitcoin-convexity.html" },
  { source: "/part-4-tax-architecture-roc-strategy", destination: "/site-b/part-4-tax-architecture.html" },
  { source: "/part-5-portfolio-construction-position-management", destination: "/site-b/part-5-portfolio-construction.html" },
  { source: "/part-6-convexity-framework-integrity-scoring", destination: "/site-b/part-6-convexity-scoring.html" },
  { source: "/part-1-pictures", destination: "/site-b/part-1-pictures.html" },
  { source: "/glossary", destination: "/site-b/glossary.html" },
  { source: "/framework-in-pictures", destination: "/site-b/framework-in-pictures.html" },
  { source: "/framework-in-math", destination: "/site-b/framework-in-math.html" }
];

export default {
  reactStrictMode: true,
  async rewrites() {
    return { beforeFiles: siteBRewrites };
  },
  async headers() {
    return [
      {
        // Raw documents only, at any depth. Assets under /site-b/ are resources
        // the canonical pages need, not duplicates of them (see the contract above).
        source: "/site-b/:path*.html",
        headers: [{ key: "X-Robots-Tag", value: "noindex" }]
      }
    ];
  }
};
