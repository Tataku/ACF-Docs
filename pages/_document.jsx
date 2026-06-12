/* Custom document — minimal, only to add a PRE-PAINT theme bootstrap for the
 * full-bleed chart-handoff EXPORT routes. These are plain Next pages that own the
 * whole page, so a persisted Light choice must paint before React hydrates or the
 * page flashes the default Dark theme on navigation/refresh.
 *
 * Deliberately scoped to `*-export` routes only: it never touches the public
 * Nextra docs pages or the embedded handoff cards (those keep their own theming).
 * Reads the same localStorage key as ChartHandoff (`acf-chart-handoff:theme`);
 * fully guarded, no-op on failure or off-route. */
import { Html, Head, Main, NextScript } from 'next/document';

const THEME_BOOTSTRAP = "(function(){try{var p=location.pathname;if(p.indexOf('chart-handoff')<0||p.indexOf('export')<0)return;var t=localStorage.getItem('acf-chart-handoff:theme');t=(t==='light'||t==='dark')?t:'dark';var d=document.documentElement;d.setAttribute('data-acf-theme',t);d.style.colorScheme=(t==='light')?'light':'dark';d.style.backgroundColor=(t==='light')?'#E6DFD2':'#08090b';}catch(e){}})();";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
