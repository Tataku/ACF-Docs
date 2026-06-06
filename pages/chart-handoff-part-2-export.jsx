/* Part 2 agency export route — a plain Next.js page (NOT a Nextra docs page),
 * so it renders with no sidebar, navbar, or TOC. Full-bleed, theme-toggle
 * preview surface for the lineage & macro-thesis chart set. */
import Head from "next/head";
import ChartHandoff from "../components/framework-charts/ChartHandoff";

export default function ChartHandoffPart2Export() {
  return (
    <>
      <Head>
        <title>ACF Framework Charts — Part 2 Agency Export</title>
        <meta name="robots" content="noindex" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <ChartHandoff part="part-2" variant="export" />
    </>
  );
}
