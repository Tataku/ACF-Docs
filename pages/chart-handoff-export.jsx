/* Agency export route — a plain Next.js page (NOT a Nextra docs page), so it
 * renders with no sidebar, navbar, or TOC. Full-bleed, theme-toggle preview
 * surface suitable for screenshots / PDF / marketing review.
 *
 * Kept deliberately outside the Nextra MDX pipeline: the internal docs-shell
 * route lives at /chart-handoff; this one is the clean export surface. */
import Head from "next/head";
import ChartHandoff from "../components/framework-charts/ChartHandoff";

export default function ChartHandoffExport() {
  return (
    <>
      <Head>
        <title>ACF Framework Charts — Agency Export</title>
        <meta name="robots" content="noindex" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <ChartHandoff variant="export" />
    </>
  );
}
