import nextra from "nextra";

const withNextra = nextra({
  theme: "nextra-theme-docs",
  themeConfig: "./theme.config.jsx"
});

/* Phase 2 — promote the staged agency Site B docs design (public/site-b/) onto
 * canonical clean routes, preserving the existing production slugs. This is
 * additive routing only: the underlying MDX pages still build and are NOT
 * deleted — they are shadowed by `beforeFiles` rewrites, which take precedence
 * over the pages router. Delete this block (rewrites + headers) to fully revert.
 *
 *   /                                  -> /site-b/cover-docs.html
 *   /part-1-foundation                 -> /site-b/part-1-foundation.html
 *   /part-2-lineage-macro-thesis       -> /site-b/part-2-lineage-macro.html
 *   /part-3-bitcoin-convexity-backbone -> /site-b/part-3-bitcoin-convexity.html
 *   /part-4-tax-architecture-roc-strategy -> /site-b/part-4-tax-architecture.html
 *   /part-1-pictures                   -> /site-b/part-1-pictures.html   (new route)
 *
 * The raw /site-b/* URLs keep working but carry `X-Robots-Tag: noindex`, so the
 * clean routes stay the single indexable surface (no duplicate content). The
 * noindex matches the original request path, so the clean routes are unaffected
 * and remain indexable. Parts 5-6 / 7 are untouched and still render from MDX. */
const siteBRewrites = [
  { source: "/", destination: "/site-b/cover-docs.html" },
  { source: "/part-1-foundation", destination: "/site-b/part-1-foundation.html" },
  { source: "/part-2-lineage-macro-thesis", destination: "/site-b/part-2-lineage-macro.html" },
  { source: "/part-3-bitcoin-convexity-backbone", destination: "/site-b/part-3-bitcoin-convexity.html" },
  { source: "/part-4-tax-architecture-roc-strategy", destination: "/site-b/part-4-tax-architecture.html" },
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
