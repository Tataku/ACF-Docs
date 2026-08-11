#!/usr/bin/env node
/**
 * Build public/site-b/framework-in-math.html — the mathematical companion.
 *
 * SOURCE + SCOPE. The quantities here are transcribed from the owner-chartered
 * extraction track in the ACFDashboard repo (`docs/FRAMEWORK_IN_MATH_v1.md`,
 * Chapters 1-4), which reads the live engine first and the specs second. That
 * document is an internal, RIA/PM-defensible reference; this page is its
 * PUBLISHABLE SUBSET and deliberately omits:
 *
 *   - engine file paths and line numbers, branch names, and commit context
 *   - the verification command logs
 *   - the spec-vs-engine divergence registers ("flags, not fixes")
 *
 * Rule of thumb: publish the mathematics, not the audit apparatus. Where the
 * extraction track records a live/spec fork, this page states the live value and
 * says plainly that it is the live one, rather than silently picking a side.
 *
 * Content here is authored, not derived, so it does not auto-update: when the
 * extraction track ships a new chapter, this page is edited deliberately.
 *
 * Run: npm run build:math
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SITE = path.join(ROOT, 'public', 'site-b');
const DONOR = path.join(SITE, 'part-6-convexity-scoring.html');
const OUT = path.join(SITE, 'framework-in-math.html');

const main = `<main class="shell-main">

    <header class="doc-header">
      <div class="measure">
        <p class="doc-eyebrow" data-glyph-text>Framework Reference</p>
        <p class="doc-kicker">The mathematical companion &middot; for readers who want the arithmetic</p>
        <h1 class="doc-title">The Framework in Math</h1>
      </div>
      <div class="measure prose">
        <p class="prose-lead">The Parts explain what the framework believes and why. This page states what it computes. Every quantity below is the value the live engine actually uses, expressed as a formula rather than a paragraph, so that a practitioner, an advisor, or a sceptic can check the arithmetic instead of taking the prose on faith.</p>
        <p><a class="part-ref" href="#reading">How to read this</a> <a class="part-ref" href="#cis-math">The position score</a> <a class="part-ref" href="#fis-math">The construction score</a> <a class="part-ref" href="#sizing-math">Score to size</a></p>
      </div>
    </header>

    <section class="section" id="reading" aria-labelledby="reading-title">
      <div class="measure">
        <p class="section-eyebrow section-signal" data-glyph-text>Ground Rules</p>
        <h2 class="section-title" id="reading-title">How to read this page.</h2>
      </div>
      <div class="measure prose">
        <p>Two conventions govern everything below.</p>
        <p><strong>Authority.</strong> Where a shipped specification and the running engine disagree, the engine is quoted, because the engine is what scores your portfolio. Where the two have genuinely forked, the fork is stated rather than resolved silently.</p>
        <p><strong>Classification.</strong> Not every number carries the same weight. A quantity is one of four things, and the difference matters more than the value.</p>
      </div>

      <div class="measure-feature">
        <div class="failure-modes">
          <div><span class="name">Doctrine</span><p>Structural. Changing it means you are running a different framework, not a tuned one.</p></div>
          <div><span class="name">Parameter</span><p>Tunable inside a documented envelope, with the reasoning written down.</p></div>
          <div><span class="name">Derived</span><p>An accounting identity. It follows from the others and cannot be set independently.</p></div>
          <div><span class="name">Illustrative</span><p>Representative of the shape, not a forecast and not a promise.</p></div>
        </div>
      </div>
    </section>

    <section class="section" id="cis-math" aria-labelledby="cis-math-title">
      <div class="measure">
        <p class="section-eyebrow section-signal" data-glyph-text>Position Quality</p>
        <h2 class="section-title" id="cis-math-title">CIS: the position score.</h2>
      </div>
      <div class="measure prose">
        <p>The Convexity Integrity Score is a weighted sum of four components, each scored 0 to 100, producing a 0 to 100 result. In its reference form:</p>
        <p><strong>CIS = (C &times; 0.40) + (R &times; 0.25) + (M &times; 0.25) + (E &times; 0.10)</strong></p>
        <p>The four-component structure is <em>doctrine</em>. The weights are <em>parameters</em>: they are read from the framework&rsquo;s source of truth rather than asserted per session, and an operating thesis may shift them.</p>
      </div>

      <div class="measure">
        <p class="sub-meta">Weights &middot; reference and live</p>
        <h3 class="sub-title">The thesis moves the weights, inside an envelope.</h3>
      </div>
      <div class="measure prose">
        <p>The 40/25/25/10 split above is the reference weighting the framework is described by. In production each thesis profile carries its own weighting, which is why a position can score differently under two theses without either score being wrong.</p>
      </div>

      <div class="compare compare-wrap">
        <table>
          <caption>Component weights by operating thesis</caption>
          <thead>
            <tr><th scope="col">Thesis profile</th><th scope="col">C</th><th scope="col">R</th><th scope="col">M</th><th scope="col">E</th></tr>
          </thead>
          <tbody>
            <tr><th scope="row" class="col-primary">Reference weighting</th><td data-label="C">0.40</td><td data-label="R">0.25</td><td data-label="M">0.25</td><td data-label="E">0.10</td></tr>
            <tr><th scope="row">Fourth Turning (default)</th><td data-label="C">0.35</td><td data-label="R">0.30</td><td data-label="M">0.25</td><td data-label="E">0.10</td></tr>
            <tr><th scope="row">Singularity</th><td data-label="C">0.45</td><td data-label="R">0.20</td><td data-label="M">0.25</td><td data-label="E">0.10</td></tr>
            <tr><th scope="row">Monetary Debasement</th><td data-label="C">0.35</td><td data-label="R">0.25</td><td data-label="M">0.30</td><td data-label="E">0.10</td></tr>
            <tr><th scope="row">Capital Preservation</th><td data-label="C">0.30</td><td data-label="R">0.35</td><td data-label="M">0.20</td><td data-label="E">0.15</td></tr>
          </tbody>
        </table>
      </div>
      <p class="compare-key">Every profile stays inside the envelope: no component moves more than 0.10 from its reference weight, none falls below 0.05 or rises above 0.50, and the four are renormalized so they always sum to 1.0</p>

      <div class="measure prose">
        <p>One further adjustment is automatic rather than chosen. When the macro read itself is low or medium confidence, the macro weight is reduced (to 60 or 80 percent of its value) and the reduction is redistributed evenly to convexity and risk. A weakly-evidenced macro view is not permitted to carry full weight.</p>
      </div>

      <div class="measure">
        <p class="sub-meta">Movement &middot; how far a score may travel</p>
        <h3 class="sub-title">Delta clamps.</h3>
      </div>
      <div class="measure prose">
        <p>An update is capped by how good the evidence behind it is. Low confidence permits a move of &plusmn;3 points, medium &plusmn;5, high &plusmn;8, and evidence derived through a proxy rather than observed directly &plusmn;6. Two situations warrant wider bounds because a baseline is being set rather than adjusted: initial scoring permits &plusmn;20 and a material thesis change &plusmn;15. A change in the scoring model&rsquo;s own version may bypass the clamp, so that a genuine re-basing is never suppressed by machinery built to resist mood.</p>
      </div>

      <div class="measure">
        <p class="sub-meta">Bands &middot; where a score lands</p>
        <h3 class="sub-title">Reading the number.</h3>
      </div>
      <div class="measure prose">
        <p>Scores are floats and are never bucketed until display. The bands are half-open and matched from the top: 70.0 lands in Strong, 69.999 in Moderate.</p>
      </div>

      <div class="measure">
        <div class="di-bands" role="img" aria-label="The four-band register: seventy and above Strong, sixty to sixty-nine Moderate, fifty to fifty-nine Caution, below fifty Weak."><span class="di-band" data-band="red"><i>&lt;50</i>Weak</span><span class="di-band" data-band="orange"><i>50&ndash;59</i>Caution</span><span class="di-band" data-band="yellow"><i>60&ndash;69</i>Moderate</span><span class="di-band" data-band="green"><i>70+</i>Strong</span></div>
      </div>
    </section>

    <section class="section" id="fis-math" aria-labelledby="fis-math-title">
      <div class="measure">
        <p class="section-eyebrow section-signal" data-glyph-text>Construction Integrity</p>
        <h2 class="section-title" id="fis-math-title">FIS: the construction score.</h2>
      </div>
      <div class="measure prose">
        <p>The Framework Integrity Score is subtractive. It starts the assembled portfolio at 100 and deducts a capped penalty per bucket:</p>
        <p><strong>FIS = max(0, 100 &minus; &Sigma; min(bucket penalty, bucket cap))</strong></p>
        <p>Because the five caps sum to 80, a valid computation can never emit below 20. That floor is <em>derived</em>, not declared: it falls out of the caps. It also means a FIS of zero is structurally impossible from a real portfolio, so a zero on a screen is a broken input, not a terrible portfolio.</p>
      </div>

      <div class="compare compare-wrap">
        <table>
          <caption>The five penalty buckets, their caps, and whether position size scales them</caption>
          <thead>
            <tr><th scope="col">Bucket</th><th scope="col">Cap</th><th scope="col">Scales with position size</th></tr>
          </thead>
          <tbody>
            <tr><th scope="row" class="col-primary">Allocation</th><td data-label="Cap">25</td><td data-label="Scales with position size">No &middot; flat</td></tr>
            <tr><th scope="row">Governance</th><td data-label="Cap">15</td><td data-label="Scales with position size">Yes</td></tr>
            <tr><th scope="row">Dead capital</th><td data-label="Cap">15</td><td data-label="Scales with position size">Yes</td></tr>
            <tr><th scope="row">Concentration</th><td data-label="Cap">15</td><td data-label="Scales with position size">No &middot; flat</td></tr>
            <tr><th scope="row">Complexity</th><td data-label="Cap">10 (hard)</td><td data-label="Scales with position size">No &middot; count-based</td></tr>
          </tbody>
        </table>
      </div>
      <p class="compare-key">Caps sum to 80, so the score floors at 20 &middot; only governance and dead capital are value-weighted, which is narrower than the specification&rsquo;s label suggests</p>

      <div class="measure prose">
        <p>Where value-weighting does apply, it is a clamped share of the portfolio:</p>
        <p><strong>severity = clamp(position value &divide; portfolio total, 0.002, 0.12)</strong></p>
        <p>A larger position generates a proportionally larger charge, but the 12 percent ceiling stops any single holding from dominating the score, and the 0.2 percent floor stops a rounding-error position from escaping it entirely.</p>
        <p>Two behaviours are worth stating because they are easy to get wrong. An invalid portfolio does not score 100 and does not throw; it returns no score at all, marked invalid. And an empty portfolio is not a perfect one.</p>
      </div>
    </section>

    <section class="section" id="sizing-math" aria-labelledby="sizing-math-title">
      <div class="measure">
        <p class="section-eyebrow section-signal" data-glyph-text>Translation</p>
        <h2 class="section-title" id="sizing-math-title">From score to size.</h2>
      </div>
      <div class="measure prose">
        <p>The score does not set the size on its own. It selects a band, and the band carries a different range for each posture, because the same evidence is worth a different amount of capital depending on the job the position does.</p>
      </div>

      <div class="compare compare-wrap">
        <table>
          <caption>Band to target allocation, by posture</caption>
          <thead>
            <tr><th scope="col">Band</th><th scope="col">Torque</th><th scope="col">Ballast</th><th scope="col">Hype</th></tr>
          </thead>
          <tbody>
            <tr><th scope="row" class="col-primary">70+ Strong</th><td data-label="Torque">8&ndash;15%</td><td data-label="Ballast">5&ndash;8%</td><td data-label="Hype">0&ndash;5%</td></tr>
            <tr><th scope="row">60&ndash;69 Moderate</th><td data-label="Torque">4&ndash;8%</td><td data-label="Ballast">3&ndash;5%</td><td data-label="Hype">0&ndash;5%</td></tr>
            <tr><th scope="row">50&ndash;59 Caution</th><td data-label="Torque">2&ndash;4%</td><td data-label="Ballast">1&ndash;3%</td><td data-label="Hype">0&ndash;5%</td></tr>
            <tr><th scope="row">&lt;50 Weak</th><td data-label="Torque">0</td><td data-label="Ballast">0</td><td data-label="Hype">0</td></tr>
          </tbody>
        </table>
      </div>
      <p class="compare-key">Hype is governed by its own caps rather than by the score gradient &middot; Bitcoin is separately governed and sits outside this table &middot; concentration limits bind on top of every row</p>

      <div class="measure prose">
        <p>The framework draws a hard line here, and it is worth stating as arithmetic rather than as prose: <strong>the score produces a number; sizing is downstream governance.</strong> A score below 50 removes allocation eligibility. Everything above that selects a band, and the exit decision belongs to posture rules, tripwires, and thesis evidence, not to the score alone. Full sizing doctrine is developed in <a class="part-ref" href="/part-5-portfolio-construction-position-management">Part 5</a>; the scores themselves are developed in <a class="part-ref" href="/part-6-convexity-framework-integrity-scoring">Part 6</a>.</p>
      </div>

      <aside class="callout callout-info" aria-label="Scope">
        <p class="callout-label">Scope</p>
        <p>These are the framework&rsquo;s computed quantities, not investment advice. Values reflect the current engine and are subject to revision as the framework is calibrated. This page states mathematics; it does not constitute investment, tax, or legal advice. Consult qualified professionals for your specific situation.</p>
      </aside>
    </section>

    <footer class="site-footer">
      <div class="measure">
        <p>&copy; 2026 Adaptive Convexity Framework</p>
        <p>Reference &middot; The Framework in Math</p>
      </div>
    </footer>
  </main>`;

let html = fs.readFileSync(DONOR, 'utf8');
html = html.replace(/<link rel="canonical" href="[^"]*">/, '<link rel="canonical" href="https://docs.acfdashboard.com/framework-in-math">');
html = html.replace(/<title>[\s\S]*?<\/title>/, '<title>The Framework in Math &middot; The Adaptive Convexity Framework</title>');
html = html.replace(
  /<meta name="description" content="[^"]*">/,
  '<meta name="description" content="The mathematical companion to the Adaptive Convexity Framework: the CIS weighting and clamps, the subtractive FIS identity and its five capped buckets, and the band-to-size translation, stated as formulas.">'
);
html = html.replace(/<a class="skip-link" href="#[^"]*">/, '<a class="skip-link" href="#reading">');

html = html.replace(/\s*<ol class="on-this-page"[\s\S]*?<\/ol>/g, '');
html = html.replace(/\s*<p class="side-movement">Reference<\/p>\s*<ul class="side-parts">[\s\S]*?<\/ul>/, '');
html = html.replace(/ class="side-part current"/g, ' class="side-part"');
html = html.replace(/\s*aria-current="page"/g, '');

const sidebarInsert = `
        <p class="side-movement">Reference</p>
        <ul class="side-parts">
          <li><a class="side-part" href="/framework-in-pictures"><span class="spnum">&mdash;</span><span>In Pictures</span></a></li>
          <li>
            <a class="side-part current" href="/framework-in-math" aria-current="page">
              <span class="spnum">&mdash;</span><span>In Math</span>
            </a>
          </li>
          <li><a class="side-part" href="/glossary"><span class="spnum">&mdash;</span><span>Glossary</span></a></li>
        </ul>
      </div>`;
const navEnd = html.indexOf('</nav>', html.indexOf('<nav class="sidebar"'));
const blockEnd = html.lastIndexOf('      </div>', navEnd);
html = html.slice(0, blockEnd) + sidebarInsert + html.slice(blockEnd + '      </div>'.length);

html = html.replace(/<main class="shell-main">[\s\S]*<\/main>/, main);
html = html.replace(/\s*<nav class="next-up"[\s\S]*?<\/nav>/g, '');

fs.writeFileSync(OUT, html);
console.log('Math page built -> public/site-b/framework-in-math.html');
