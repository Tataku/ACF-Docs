/* Bundle the React FrameworkChart engine into a standalone browser island that
 * the static agency docs pages (public/site-b/*.html) load via <script>.
 *
 *   node scripts/build-site-b-charts.mjs   ->   public/site-b/site-b-charts.js
 *
 * IIFE, minified, React + ReactDOM inlined, classic JSX (the engine imports
 * React explicitly). NODE_ENV=production so React ships its production build. */
import esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['components/framework-charts/site-b-island.jsx'],
  bundle: true,
  format: 'iife',
  minify: true,
  sourcemap: false,
  target: ['es2019'],
  jsx: 'transform',
  loader: { '.css': 'text' },   // framework-charts.css is imported as a string and injected at runtime
  define: { 'process.env.NODE_ENV': '"production"' },
  outfile: 'public/site-b/site-b-charts.js',
  legalComments: 'none',
  logLevel: 'info',
});

console.log('✓ built public/site-b/site-b-charts.js');
