import nextra from "nextra";

const withNextra = nextra({
  theme: "nextra-theme-docs",
  themeConfig: "./theme.config.jsx"
});

/* Canonical routing — the Framework Docs are hand-authored Site B HTML in
 * public/site-b/, served on the clean production slugs via `beforeFiles`
 * rewrites. The legacy MDX part pages are fully retired (deleted 2026-07-13);
 * these rewrites ARE the site's routing, not a temporary shadow. Nextra still
 * builds the internal chart-handoff pages and /api only.
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
 * The raw /site-b/* URLs keep working but carry `X-Robots-Tag: noindex`, so the
 * clean routes stay the single indexable surface (no duplicate content). The
 * noindex matches the original request path, so the clean routes are unaffected
 * and remain indexable. */
const siteBRewrites = [
  { source: "/", destination: "/site-b/cover-docs.html" },
  { source: "/part-1-foundation", destination: "/site-b/part-1-foundation.html" },
  { source: "/part-2-lineage-macro-thesis", destination: "/site-b/part-2-lineage-macro.html" },
  { source: "/part-3-bitcoin-convexity-backbone", destination: "/site-b/part-3-bitcoin-convexity.html" },
  { source: "/part-4-tax-architecture-roc-strategy", destination: "/site-b/part-4-tax-architecture.html" },
  { source: "/part-5-portfolio-construction-position-management", destination: "/site-b/part-5-portfolio-construction.html" },
  { source: "/part-6-convexity-framework-integrity-scoring", destination: "/site-b/part-6-convexity-scoring.html" },
  { source: "/part-1-pictures", destination: "/site-b/part-1-pictures.html" }
];

export default withNextra({
  reactStrictMode: true,
  async rewrites() {
    return { beforeFiles: siteBRewrites };
  },
  async headers() {
    return [
      {
        source: "/site-b/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex" }]
      }
    ];
  }
});
