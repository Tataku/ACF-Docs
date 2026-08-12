#!/usr/bin/env node
/**
 * Build public/site-b/framework-in-math.html — the mathematical companion.
 *
 * SOURCE + SCOPE. The quantities here are transcribed from the owner-chartered
 * extraction track in the ACFDashboard repo (`docs/FRAMEWORK_IN_MATH_v1.md`),
 * which reads the live engine first and the specs second. That document is an
 * internal, RIA/PM-defensible reference; this page is its PUBLISHABLE SUBSET.
 *
 * CHAPTER SCOPE (owner decision, 2026-08-11): publish the chapters the book
 * already teaches — 1 CIS, 2 FIS, 3 Allocation & Sizing, 4 Governance, 8 Bitcoin,
 * 9 Tax architecture, 10 Decay & confidence, 11 Next Dollar Score. HELD pending a
 * separate owner call: 5 Projections & parameter estimation (forecast-adjacent),
 * 6 Earnings & forward valuation, 7 Performance accounting & NAV (track-record
 * adjacent), 12 Margin, borrowing & leverage.
 *
 * This page deliberately omits, from every chapter:
 *
 *   - engine file paths and line numbers, branch names, and commit context
 *   - the verification command logs
 *   - the spec-vs-engine divergence registers ("flags, not fixes")
 *   - internal enforcement posture, storage keys, and environment gating
 *
 * Rule of thumb: publish the mathematics, not the audit apparatus. Where the
 * extraction track records a live/spec fork, this page states the live value and
 * says plainly that it is the live one, rather than silently picking a side.
 *
 * The doctrine-vs-live distinction IS published where it describes what the
 * system does and does not do to a portfolio — that boundary is a feature of the
 * framework, not an internal defect note.
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
        <p><a class="part-ref" href="#reading">How to read this</a> <a class="part-ref" href="#cis-math">The position score</a> <a class="part-ref" href="#fis-math">The construction score</a> <a class="part-ref" href="#sizing-math">Score to size</a> <a class="part-ref" href="#governance-math">What fires, and what it does</a> <a class="part-ref" href="#bitcoin-math">The backbone</a> <a class="part-ref" href="#tax-math">Wrappers and basis</a> <a class="part-ref" href="#evidence-math">Evidence and confidence</a> <a class="part-ref" href="#nds-math">The next dollar</a></p>
      </div>
    </header>

    <section class="section" id="reading" aria-labelledby="reading-title">
      <div class="measure">
        <p class="section-eyebrow section-signal" data-glyph-text>Ground Rules</p>
        <h2 class="section-title" id="reading-title">How to read this page.</h2>
      </div>
      <div class="measure prose">
        <p>Three conventions govern everything below.</p>
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

      <div class="measure prose">
        <p><strong>Coded, or written down.</strong> Some of what the framework asserts runs as code against your portfolio. Some of it is doctrine a human follows. Those are not the same claim, and this page separates them wherever the difference could mislead. A threshold is called <em>live</em> only when a running consumer changes state because of it.</p>
      </div>

      <aside class="callout callout-info">
        <p class="callout-label">What this page is not</p>
        <p>It is a description of computation, not advice. Nothing here recommends buying, selling, holding, or sizing any position. Score surfaces in the software carry the same disclaimer, for the same reason.</p>
      </aside>
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
        <p class="sub-meta">Vocabulary &middot; five scores, one name</p>
        <h3 class="sub-title">Which CIS are we talking about?</h3>
      </div>
      <div class="measure prose">
        <p>Five distinct objects travel under the name. Comparing one to another and calling the difference a bug is the most common misreading of the whole system, so they are separated here first.</p>
      </div>

      <div class="compare compare-wrap">
        <table>
          <caption>The five score objects, and which one is <em>the</em> CIS</caption>
          <thead>
            <tr><th scope="col">Object</th><th scope="col">What it is</th><th scope="col">Persists</th></tr>
          </thead>
          <tbody>
            <tr><th scope="row">Neutral</th><td data-label="What it is">The thesis-free weighted sum: raw components against the reference weights. No thesis, no sector scaling, no macro downweight.</td><td data-label="Persists">In the score record</td></tr>
            <tr><th scope="row" class="col-primary">Adjusted</th><td data-label="What it is"><strong>The canonical CIS.</strong> The thesis-adjusted aggregate after the full cascade below.</td><td data-label="Persists">Yes &mdash; as a float, unrounded</td></tr>
            <tr><th scope="row">Effective</th><td data-label="What it is">A portfolio-contextual overlay for evaluating a candidate against what you already hold: Adjusted plus gap fit (0 to +6), minus overlap (0 to &minus;6), plus role demand (0 to +4).</td><td data-label="Persists">Never</td></tr>
            <tr><th scope="row">Rank</th><td data-label="What it is">Ordering mechanics for a list. Not a decision value.</td><td data-label="Persists">No</td></tr>
            <tr><th scope="row">Next Dollar</th><td data-label="What it is">A separate marginal-capital score that <em>consumes</em> Adjusted CIS at weight 0.45. Its own surface, its own bands.</td><td data-label="Persists">Own record</td></tr>
          </tbody>
        </table>
      </div>
      <p class="compare-key">The difference between an Effective value on one screen and an Adjusted value on another is the system working as designed, not a disagreement</p>

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
        <p class="sub-meta">Component C &middot; weight 0.40</p>
        <h3 class="sub-title">Convexity and optionality.</h3>
      </div>
      <div class="measure prose">
        <p>The heaviest component, because asymmetric upside is the framework&rsquo;s object. It is built from four capped sub-scores that sum to 100: headroom 35, optionality 25, catalyst density 20, scarcity 20.</p>
        <p><strong>Headroom (0&ndash;35)</strong> asks how much larger the addressable market is than the company. Let <em>H</em> be that ratio, capped at 30&times;:</p>
        <p><strong>headroom = 35 &times; ln(1 + H) / ln(31)</strong>, where <strong>H = min(TAM &divide; market cap, 30)</strong></p>
        <p>Logarithmic, so the first multiple of headroom counts for far more than the twentieth: 30&times; scores 35, 10&times; scores 27.8, 5&times; scores 22.1, 3&times; scores 17.0, and parity scores zero. The shape is <em>doctrine</em>; the 30&times; cap and the log base are <em>parameters</em>.</p>
        <p><strong>Optionality (0&ndash;25)</strong> is size-convexity plus sector convexity. Size-convexity is a continuous curve over market capitalisation that <em>peaks between three and forty billion dollars</em> and decays in both directions &mdash; the operational form of the claim that capitalisation constrains how far a position can travel. Below 2bn it ramps 14&rarr;16; from 2 to 3bn, 16&rarr;18; it holds flat at 18 through 40bn; decays 18&rarr;10 by 100bn, 10&rarr;4 by 200bn, then tails exponentially toward 2. An unknown capitalisation scores the neutral midpoint rather than a guess. Funds route through the same curve on the weighted-average capitalisation of what they hold, not on their own assets under management.</p>
        <p><strong>Catalyst density (0&ndash;20)</strong> prices identifiable, dated reasons for a re-rating. Each catalyst earns:</p>
        <p><strong>points = impact &times; probability &times; independence &times; confidence &times; time decay</strong></p>
        <p>Impact is tiered (transformational 7, major 5, moderate 3.5, minor 2). Independence discounts catalysts that are really the same catalyst. Time decay is hyperbolic &mdash; <strong>1 &divide; (1 + months out &divide; 12)</strong> &mdash; so a catalyst today counts fully, one at six months two-thirds, one at a year half, one at two years a third. The top four catalysts are summed, with a small bonus for spanning several tiers rather than stacking one.</p>
        <p><strong>Scarcity (0&ndash;20)</strong> prices what cannot be replicated. Each moat signal earns <strong>type weight &times; strength &times; durability &times; confidence</strong>, where type weight ranges from protocol scarcity at 5.0 down through regulatory licence, supply constraint, network effects, patents, capital intensity and data, to switching costs at 3.0; durability multiplies by 1.0 for permanent down to 0.45 for short-lived. Top five signals, plus a bonus for breadth of moat type.</p>
      </div>

      <div class="measure">
        <p class="sub-meta">Component R &middot; weight 0.25</p>
        <h3 class="sub-title">Risk and fragility.</h3>
      </div>
      <div class="measure prose">
        <p>Survivability under stress, not volatility. Higher is <em>less</em> fragile. Four sub-scores sum to 100: balance sheet 30, business model 30, factor correlation 20, tail risk 20. There is no sector bonus &mdash; the component is those four and nothing else.</p>
        <p>The thesis enters risk through exactly one channel, and it is bounded:</p>
        <p><strong>risk penalty factor = clamp(2.0 &minus; thesis volatility multiplier, 0.5, 1.5)</strong></p>
        <p>A thesis with a higher tolerance for volatility softens risk penalties; one with lower tolerance sharpens them. It applies only to factor correlation and tail risk. Balance sheet and business model are untouched by the thesis, deliberately.</p>
        <p>And it stops at insolvency. When a company shows a current ratio below 0.8 <em>and</em> debt-to-equity above 3.0 &mdash; on directly observed data, not a proxy and not a language-model estimate &mdash; the penalty factor is floored at 0.90. <strong>A thesis can soften a volatility penalty. It cannot forgive a balance sheet.</strong></p>
        <p>Factor correlation measures correlation to macro factors only. Overlap with the rest of your portfolio is deliberately excluded here &mdash; that is the construction score&rsquo;s job, and counting it twice would double-penalise a concentrated book.</p>
      </div>

      <div class="measure">
        <p class="sub-meta">Component M &middot; weight 0.25</p>
        <h3 class="sub-title">Macro alignment.</h3>
      </div>
      <div class="measure prose">
        <p>Regime fit, not forecasting. Three sub-scores sum to 100: regime fit 40, carry 30, policy and flow 30.</p>
        <p>Carry has been dividend-neutral since v3.0 &mdash; yield is not scored as quality. It sits at a neutral baseline of 20 for equities and preferreds, with a small bump where a return-of-capital structure genuinely belongs in a taxable account, and a bounded adjustment (&plusmn;2) from live macro conditions.</p>
        <p>Regime fit and policy are written upstream from the sector posture, theme overlap, and the live macro regime, each bounded: regime fit moves at most &plusmn;4, policy at most &plusmn;3. Bounding them is the point &mdash; a macro read is allowed to tilt a score, never to determine it.</p>
      </div>

      <div class="measure">
        <p class="sub-meta">Component E &middot; weight 0.10</p>
        <h3 class="sub-title">Execution and sentiment.</h3>
      </div>
      <div class="measure prose">
        <p>Deliberately the lightest weight: momentum confirms, it never dominates. Two sub-scores of 50: execution quality (momentum) and market acceptance (turnover).</p>
        <p>Momentum is defined precisely, and the definition is enforced: <strong>(price now &minus; price three months ago) &divide; price three months ago</strong>, stored as a ratio, requiring at least 60 observations. Below that minimum, or if a one-month series is substituted for a three-month one, the value is demoted to a proxy and loses weight. A language model may not supply it at all.</p>
        <p>Market acceptance is turnover &mdash; thirty-day dollar volume over market capitalisation, clamped to a sane range and scored on a tier ladder. It asks whether the market is actually transacting in the name, which is a different question from whether the price went up.</p>
        <p>Preferred equity runs an inverted momentum ladder, because for an instrument held for its carry, <em>stability</em> is the good outcome: the flattest tape scores highest.</p>
      </div>

      <div class="measure">
        <p class="sub-meta">Routing &middot; what gets scored how</p>
        <h3 class="sub-title">Asset class decides the scorer, in strict precedence.</h3>
      </div>
      <div class="measure prose">
        <p>Private &rarr; Bitcoin-class &rarr; fund &rarr; crypto &rarr; equity. First match wins, and there is no fallthrough to the equity path. Bitcoin-class means the asset itself or a spot wrapper for it, and it is checked <em>before</em> the fund branch so that a spot Bitcoin fund scores through the monetary model rather than as a generic fund. Cash sentinels are never scored on the market path at all.</p>
        <p>This is the framework&rsquo;s central anti-fabrication control. The historical failure it prevents is scoring an instrument against inputs that do not exist for it &mdash; a preferred share graded on revenue growth, Bitcoin graded on a balance sheet &mdash; and producing a confident number from nothing.</p>
      </div>

      <div class="measure">
        <p class="sub-meta">Boundaries &middot; what a thesis may touch</p>
        <h3 class="sub-title">The thesis is bounded, and the bounds are the doctrine.</h3>
      </div>
      <div class="measure-feature">
        <div class="failure-modes">
          <div><span class="name">Weights</span><p>Moves them, inside the &plusmn;0.10 envelope, renormalized.</p></div>
          <div><span class="name">Sector relevance</span><p>Scales convexity and macro only, within 0.80 to 1.20. If risk is already poor, the uplift is damped in proportion.</p></div>
          <div><span class="name">Volatility tolerance</span><p>Softens or sharpens risk penalties, floored at insolvency.</p></div>
          <div><span class="name">Nothing else</span><p>Execution is thesis-invariant. Headroom, catalysts, balance sheet and margins are thesis-invariant. The posture-preference bonus is computed and displayed but is <em>not</em> applied to the score.</p></div>
        </div>
      </div>
      <div class="measure prose">
        <p>Because the neutral score is emitted alongside the adjusted one, the whole thesis effect on any position is a single subtraction. Nothing about it is hidden. A typical thesis moves a score 3 to 25 points; beyond 30 is worth investigating.</p>
      </div>

      <div class="measure">
        <p class="sub-meta">Movement &middot; how far a score may travel</p>
        <h3 class="sub-title">Delta clamps.</h3>
      </div>
      <div class="measure prose">
        <p>An update is capped by how good the evidence behind it is. Low confidence permits a move of &plusmn;3 points, medium &plusmn;5, high &plusmn;8, and evidence derived through a proxy rather than observed directly &plusmn;6. Two situations warrant wider bounds because a baseline is being set rather than adjusted: initial scoring permits &plusmn;20 and a material thesis change &plusmn;15.</p>
        <p>Two situations bypass the clamp entirely. A change in the scoring model&rsquo;s own version re-bases rather than adjusts, and a divergence larger than 20 points is treated as a model disagreement rather than noise. Both exist so that machinery built to resist mood cannot also suppress a genuine correction.</p>
      </div>

      <div class="measure">
        <p class="sub-meta">Evidence &middot; what the number is made of</p>
        <h3 class="sub-title">Weak data is discounted, not excluded.</h3>
      </div>
      <div class="measure prose">
        <p>Every metric enters carrying a provenance, and provenance carries a weight. A metric is blended toward a neutral baseline in proportion to how much it is trusted:</p>
        <p><strong>contribution = baseline + (raw value &minus; baseline) &times; admission weight</strong></p>
      </div>

      <div class="compare compare-wrap">
        <table>
          <caption>Admission weights by provenance</caption>
          <thead>
            <tr><th scope="col">Provenance</th><th scope="col">Weight</th><th scope="col">Meaning</th></tr>
          </thead>
          <tbody>
            <tr><th scope="row" class="col-primary">Direct</th><td data-label="Weight">1.00</td><td data-label="Meaning">Observed from an authoritative source</td></tr>
            <tr><th scope="row">Derived</th><td data-label="Weight">0.85</td><td data-label="Meaning">Computed from observed inputs</td></tr>
            <tr><th scope="row">Stale</th><td data-label="Weight">0.70</td><td data-label="Meaning">Real but old &mdash; full weight for slow-moving fundamentals</td></tr>
            <tr><th scope="row">Proxy</th><td data-label="Weight">0.60</td><td data-label="Meaning">A stand-in for the quantity actually wanted</td></tr>
            <tr><th scope="row">Estimated</th><td data-label="Weight">0.50</td><td data-label="Meaning">Language-model estimate</td></tr>
            <tr><th scope="row">Rejected</th><td data-label="Weight">0.00</td><td data-label="Meaning">Not admissible for this metric at all</td></tr>
          </tbody>
        </table>
      </div>
      <p class="compare-key">Market metrics &mdash; momentum, realised volatility, volume, drawdown &mdash; reject language-model estimates outright. Slow-moving fundamentals such as margin and leverage treat a stale reading as full-weight, because they are stale by nature</p>

      <div class="measure prose">
        <p>Two further gates sit above the individual metrics. <strong>Coverage</strong> weighs the core fields at 0.70 and the enhancing fields at 0.30; below 70 percent the score is capped at 75, below 50 percent at 68, below 30 percent at 60. <strong>Proxy suppression</strong> caps the score at 85 when more than 40 percent of the sub-scores rest on proxies or heuristics.</p>
        <p>Both encode the same rule: <em>incomplete evidence limits how good a score is allowed to look, and never inflates one.</em> A missing field penalises confidence. It never penalises the economics of the position.</p>
      </div>

      <div class="measure">
        <p class="sub-meta">The cascade &middot; how the emitted number forms</p>
        <h3 class="sub-title">Order of operations.</h3>
      </div>
      <div class="measure prose">
        <p>Each stage is clamped to 0&ndash;100. Precision is preserved end to end; rounding happens only at display.</p>
      </div>
      <div class="measure-feature">
        <ol class="proc-steps">
          <li><span class="step-title">Components</span><p>C, R, M and E computed on their own routes, sub-scores capped.</p></li>
          <li><span class="step-title">Thesis weights</span><p>Applied inside the &plusmn;0.10 envelope, renormalized to sum to 1.0.</p></li>
          <li><span class="step-title">Sector relevance</span><p>Scales convexity and macro only, 0.80 to 1.20, damped when risk is weak.</p></li>
          <li><span class="step-title">Macro downweight</span><p>Low or medium macro confidence reduces the macro weight; the remainder moves to convexity and risk.</p></li>
          <li><span class="step-title">Weighted sum</span><p>The raw aggregate, clamped.</p></li>
          <li><span class="step-title">Delta clamp</span><p>Movement bounded by evidence, with the documented bypasses.</p></li>
          <li><span class="step-title">Research and market-structure deltas</span><p>Bounded adjustments from deeper evidence.</p></li>
          <li><span class="step-title">Coverage cap</span><p>75, 68 or 60, by how complete the evidence is.</p></li>
          <li><span class="step-title">Proxy suppression</span><p>Capped at 85 if the score leans on proxies.</p></li>
          <li><span class="step-title">Filing-intelligence delta</span><p>The last bounded adjustment. The result is the emitted CIS.</p></li>
        </ol>
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

      <div class="measure prose">
        <p>The framework also carries a calibration target for how a healthy universe should distribute: roughly 3 to 5 percent above 88, 15 to 20 percent from 80 to 87, 30 to 40 percent from 70 to 79, 25 to 30 percent from 60 to 69, and 10 to 15 percent below 60. It is <em>illustrative</em> and not enforced anywhere. Its use is diagnostic, and the rule attached to it is worth stating in full: <strong>if the universe cannot reach 88, audit the implementation before questioning the philosophy.</strong></p>
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
        <p>An invalid portfolio returns <em>null</em> &mdash; no positions, no capital, malformed input. It never returns 100. An empty portfolio is not a perfect one, and the engine refuses to say otherwise.</p>
      </div>

      <div class="measure">
        <p class="sub-meta">Severity &middot; the value-weighting primitive</p>
        <h3 class="sub-title">A bad small position is not a bad big one.</h3>
      </div>
      <div class="measure prose">
        <p>Two of the five buckets scale their penalties by how much of the portfolio the offending position actually represents:</p>
        <p><strong>severity = clamp(position value &divide; portfolio total, 0.002, 0.12)</strong></p>
        <p>The clamp does the work at both ends. The floor means a rounding-error position still registers rather than vanishing; the ceiling means one enormous position cannot alone consume a bucket. Governance and dead capital scale this way. Allocation, complexity and concentration use flat penalties.</p>
      </div>

      <div class="compare compare-wrap">
        <table>
          <caption>The five penalty buckets, their caps, and whether position size scales them</caption>
          <thead>
            <tr><th scope="col">Bucket</th><th scope="col">Cap</th><th scope="col">Scales with size</th><th scope="col">What it prices</th></tr>
          </thead>
          <tbody>
            <tr><th scope="row" class="col-primary">Allocation</th><td data-label="Cap">25</td><td data-label="Scales">No</td><td data-label="Prices">Wrapper drift from target, and how the book distributes across score bands</td></tr>
            <tr><th scope="row">Governance</th><td data-label="Cap">15</td><td data-label="Scales">Yes</td><td data-label="Prices">Positions held below the line, and oversized positions in the middle band</td></tr>
            <tr><th scope="row">Dead capital</th><td data-label="Cap">15</td><td data-label="Scales">Yes</td><td data-label="Prices">Undocumented positions and stale scores</td></tr>
            <tr><th scope="row">Complexity</th><td data-label="Cap">10 (hard)</td><td data-label="Scales">No &mdash; counts</td><td data-label="Prices">Unknown distributions, and unexplained sub-band holdings past an allowance of three</td></tr>
            <tr><th scope="row">Concentration</th><td data-label="Cap">15</td><td data-label="Scales">No</td><td data-label="Prices">Single, top-three, and top-five share breaches</td></tr>
          </tbody>
        </table>
      </div>

      <div class="measure prose">
        <p><strong>Governance</strong> applies at most one penalty per position, in strict precedence: below 50 costs 6 points; 60 to 69 <em>and</em> weighing more than 8 percent costs 6; 60 to 69 alone costs 4; a momentum breakdown costs 4. The precedence matters &mdash; a position cannot be charged twice for one condition.</p>
        <p><strong>Dead capital</strong> charges 5 points for a position with no thesis, fit, or written rationale, and 2 points for a score older than 90 days. Both can fire on the same position. A <em>missing</em> timestamp is treated as unknown, not as stale, and is not penalised.</p>
        <p><strong>Concentration</strong> charges 8 points for each position above 15 percent, 6 if the top three exceed 40 percent, and 4 if the top five exceed 60 percent. Bitcoin and its spot wrappers are excluded from all three measures &mdash; the backbone is not a concentration failure. Equities with Bitcoin exposure are <em>not</em> excluded; they are ordinary concentration.</p>
        <p>Acknowledging a concentration breach does not remove it. An override is recorded and displayed so the surface can show that you know &mdash; and the penalty still applies. <strong>The disclosure is the feature. The math does not bend.</strong></p>
      </div>

      <div class="measure">
        <p class="sub-meta">Boundary &middot; where FIS leaves its own domain</p>
        <h3 class="sub-title">Construction quality scales modelled outcomes.</h3>
      </div>
      <div class="measure prose">
        <p>FIS reaches exactly one thing outside itself. When the software models forward outcomes, it scales expected realisation by construction quality:</p>
        <p><strong>multiplier = 0.50 + (FIS &divide; 100) &times; 0.70</strong></p>
        <p>A FIS of 50 yields 0.85, a FIS of 100 yields 1.20. The claim being modelled is narrow and worth stating plainly: a poorly constructed portfolio is assumed to <em>capture less of its own assets&rsquo; upside</em>. FIS never feeds back into CIS, and never into itself.</p>
      </div>
    </section>

    <section class="section" id="sizing-math" aria-labelledby="sizing-math-title">
      <div class="measure">
        <p class="section-eyebrow section-signal" data-glyph-text>Translation</p>
        <h2 class="section-title" id="sizing-math-title">From score to size.</h2>
      </div>
      <div class="measure prose">
        <p>A score is not a position size. The translation is governed, bounded, and posture-dependent &mdash; and every number it produces is a <em>ceiling</em>, never a target.</p>
      </div>

      <div class="compare compare-wrap">
        <table>
          <caption>Position sizing bands by posture and score</caption>
          <thead>
            <tr><th scope="col">Posture</th><th scope="col">Score</th><th scope="col">Weight range</th><th scope="col">Band</th></tr>
          </thead>
          <tbody>
            <tr><th scope="row" class="col-primary">Torque</th><td data-label="Score">70&ndash;100</td><td data-label="Weight">8&ndash;15%</td><td data-label="Band">Core</td></tr>
            <tr><th scope="row">Torque</th><td data-label="Score">60&ndash;69</td><td data-label="Weight">4&ndash;8%</td><td data-label="Band">Standard</td></tr>
            <tr><th scope="row">Torque</th><td data-label="Score">50&ndash;59</td><td data-label="Weight">2&ndash;4%</td><td data-label="Band">Starter</td></tr>
            <tr><th scope="row">Ballast</th><td data-label="Score">70&ndash;100</td><td data-label="Weight">5&ndash;8%</td><td data-label="Band">Core</td></tr>
            <tr><th scope="row">Ballast</th><td data-label="Score">60&ndash;69</td><td data-label="Weight">3&ndash;5%</td><td data-label="Band">Standard</td></tr>
            <tr><th scope="row">Ballast</th><td data-label="Score">50&ndash;59</td><td data-label="Weight">1&ndash;3%</td><td data-label="Band">Marginal</td></tr>
            <tr><th scope="row">Hype</th><td data-label="Score">50&ndash;100</td><td data-label="Weight">2&ndash;5%</td><td data-label="Band">Eligible</td></tr>
            <tr><th scope="row">Any</th><td data-label="Score">below 50</td><td data-label="Weight">0</td><td data-label="Band">Not eligible</td></tr>
          </tbody>
        </table>
      </div>
      <p class="compare-key">Below 50 sizes to zero in every posture &mdash; this is where the framework declines to hold, and it is the one hard gate in the ladder</p>

      <div class="measure prose">
        <p>Within a band the ceiling moves linearly with the score:</p>
        <p><strong>justified weight = min weight + band progress &times; (max weight &minus; min weight)</strong>, capped at 15%</p>
        <p>So a Torque position at 70 justifies 8 percent, at 85 justifies 11.5 percent, at 100 justifies 15. A Hype position at 50 justifies 2 percent, at 100 justifies 5.</p>
        <p><strong>The band&rsquo;s lower bound is not a floor.</strong> It is the low endpoint of that interpolation and nothing else &mdash; no part of the system enforces a minimum position size upward. What exists instead is a drop threshold: a computed weight below 2 percent is discarded rather than raised. The framework will decline to hold something. It will not top you up into it.</p>
        <p>Capital and posture budget then size <em>below</em> the ceiling. The ceiling says how much a score justifies; it never says how much to buy.</p>
      </div>

      <div class="measure">
        <p class="sub-meta">Concentration &middot; three layers, three purposes</p>
        <h3 class="sub-title">The same percentages mean different things.</h3>
      </div>
      <div class="measure prose">
        <p>Concentration appears three times in the framework at three different thresholds, and conflating them is a genuine source of confusion. They are separate systems with separate consumers.</p>
      </div>

      <div class="compare compare-wrap">
        <table>
          <caption>Concentration thresholds by layer</caption>
          <thead>
            <tr><th scope="col">Layer</th><th scope="col">Single</th><th scope="col">Top 3</th><th scope="col">Top 5</th><th scope="col">What happens</th></tr>
          </thead>
          <tbody>
            <tr><th scope="row" class="col-primary">Construction</th><td data-label="Single">15%</td><td data-label="Top 3">35%</td><td data-label="Top 5">50%</td><td data-label="Effect">The 15% cap is actively enforced during a build &mdash; excess is redistributed by headroom, and anything unabsorbable becomes cash rather than being dropped. The top-three and top-five figures warn only.</td></tr>
            <tr><th scope="row">Scoring</th><td data-label="Single">15%</td><td data-label="Top 3">40%</td><td data-label="Top 5">60%</td><td data-label="Effect">FIS penalties: 8 points per breaching position, 6, and 4.</td></tr>
            <tr><th scope="row">Emergency</th><td data-label="Single">&mdash;</td><td data-label="Top 3">&mdash;</td><td data-label="Top 5">65%</td><td data-label="Effect">Doctrine. A written instruction to trim the largest positions &mdash; followed by a human, not executed by the software.</td></tr>
          </tbody>
        </table>
      </div>
      <p class="compare-key">Two of the three rungs are live code; the third is written doctrine. Describing all three as enforcement would be false, so this page does not</p>

      <div class="measure">
        <p class="sub-meta">Breadth &middot; how many positions</p>
        <h3 class="sub-title">Position count is an output, never an input.</h3>
      </div>
      <div class="measure prose">
        <p>You do not tell the framework to hold eighteen names. It tells you how many the available conviction supports. The admitted candidate pool is classified by its own density:</p>
        <p><strong>High</strong> &mdash; average score at least 75, with at least six names above 70. <strong>Moderate</strong> &mdash; average at least 67, with at least ten above 65. <strong>Low</strong> &mdash; average at least 60, with at least eight above 60. <strong>Scarce</strong> &mdash; anything else.</p>
        <p>Density then sets both the target count and how much capital deploys. Denser conviction concentrates into fewer names: High targets 14 down to 10 positions and deploys fully; Moderate targets 18 to 13 and deploys 95 percent; Low and Scarce widen the count and deploy less, on a formula rather than a judgement call. Counts are bounded to between 10 and 25 names.</p>
        <p><strong>The undeployed remainder is an intentional cash reserve, and it is held as cash.</strong> The invariant on every build is that position weights plus cash equal exactly 1.0 &mdash; unallocated capital appears as an explicit position rather than being quietly redistributed into whatever was ranked next.</p>
      </div>

      <aside class="callout callout-insight">
        <p class="callout-label">The admission gate does not widen to fill slots</p>
        <p>When conviction is scarce, the framework returns fewer positions and more cash. It does not lower the bar until the target count is met. A candidate is admitted on its score multiplied by the completeness of the evidence behind it &mdash; and that product, not the raw score, must clear 50.</p>
      </aside>
    </section>

    <section class="section" id="governance-math" aria-labelledby="governance-math-title">
      <div class="measure">
        <p class="section-eyebrow section-signal" data-glyph-text>Governance</p>
        <h2 class="section-title" id="governance-math-title">What fires, and what it does.</h2>
      </div>
      <div class="measure prose">
        <p>The framework watches a defined set of conditions and escalates when they cluster. What it does on escalation is the part most worth being precise about, so the vocabulary comes first &mdash; these terms are not interchangeable.</p>
      </div>

      <div class="measure-feature">
        <div class="failure-modes">
          <div><span class="name">Trigger</span><p>A threshold crossing inside one watched condition.</p></div>
          <div><span class="name">Event</span><p>A logged <em>transition</em> &mdash; a state that changed. An unchanged state logs nothing, so the record is signal rather than noise.</p></div>
          <div><span class="name">Recommendation</span><p>A described action with a priority and a deadline. Displayed. Never executed.</p></div>
          <div><span class="name">Proposal</span><p>A draft change requiring explicit human acceptance &mdash; and acceptance still applies nothing automatically.</p></div>
          <div><span class="name">Acknowledgement</span><p>A record that you saw it. Suppresses no arithmetic.</p></div>
          <div><span class="name">Automated mutation</span><p>Does not exist in this system.</p></div>
        </div>
      </div>

      <div class="measure">
        <p class="sub-meta">Cohort confluence &middot; ten conditions</p>
        <h3 class="sub-title">One signal is noise. Several at once is a regime.</h3>
      </div>
      <div class="measure prose">
        <p>Ten conditions are evaluated against the live cohort &mdash; your own positions, not a generic index. Among them: an equal-weighted one-day advance of 7 percent or more with at least five names up more than 4; four or more names at a two-period relative-strength reading of 98 or higher; a five-day liquidity drain of 100 billion dollars or more across the Fed&rsquo;s balance-sheet components; three or more names gapping up 8 percent then reversing 5 percent from the high on two-and-a-half times median volume; a three-session decline of 4 percent or more with 60 percent of names at five-day lows.</p>
        <p>Escalation is not a raw count. Thresholds &mdash; two signals for level one, three for level two, four for level three &mdash; are <em>normalised by how many signals are actually evaluable</em>, and each firing signal is weighted by how directly it is measured: a fully implemented signal counts 1.0, an approximation built from free data counts 0.6. A level requires both the count and the weighted score to clear the bar.</p>
        <p>That normalisation is the honest part. When a data source is unavailable, the system does not pretend the signal is quiet &mdash; it lowers the denominator and discloses that the reading rests on a proxy.</p>
      </div>

      <aside class="callout callout-info">
        <p class="callout-label">Missing data fails closed</p>
        <p>A condition with missing inputs returns <em>clear, data missing</em> &mdash; it does not fire, and it does not count as zero. Treating an absent reading as a benign one is explicitly forbidden and is tested for.</p>
      </aside>

      <div class="measure prose">
        <p>Seven macro conditions are watched alongside the cohort, each with a three-step ladder of watch, caution and critical: liquidity contraction, volatility regime shift at a VIX of 20, 25 and 35, credit stress at 1.0, 1.5 and 2.5 standard deviations of high-yield spreads, yield-curve inversion, a dollar spike of 2, 3 and 5 percent over ten days, bond-volatility acceleration, and a compound condition requiring both an elevated VIX and a sharp rise in it.</p>
      </div>

      <div class="measure">
        <p class="sub-meta">The boundary &middot; stated plainly</p>
        <h3 class="sub-title">Nothing here touches your positions.</h3>
      </div>
      <div class="measure prose">
        <p>At the highest escalation the framework displays an instruction to trim a quarter of the torque cohort. That instruction is <strong>advisory and displayed</strong>. It is not queued, not proposed for approval, and not executed. No governance path in the system can modify a position, write a trade, alter an allocation weight, trigger a rebalance, or change how CIS or FIS is computed.</p>
        <p>The complete set of things governance writes is: evaluation proofs, transition events, acknowledgements, watch-list selections, override records, and single-day-move flags. That is the entire list.</p>
        <p>This is a design decision rather than an unfinished feature, and it is the reason the distinction between doctrine and code is drawn so carefully throughout this page. Of the twelve emergency conditions the governance doctrine describes, one runs as live code &mdash; a construction score below 60 raises a review recommendation. The other eleven are written instructions for a human. <strong>Saying otherwise would describe a system that does not exist.</strong></p>
      </div>
    </section>

    <section class="section" id="bitcoin-math" aria-labelledby="bitcoin-math-title">
      <div class="measure">
        <p class="section-eyebrow section-signal" data-glyph-text>The Backbone</p>
        <h2 class="section-title" id="bitcoin-math-title">Bitcoin: identity, headroom, accumulation.</h2>
      </div>
      <div class="measure prose">
        <p>Bitcoin is scored by a different model from everything else, so the first question the system answers is what actually counts as Bitcoin. Four categories, and they are not interchangeable.</p>
      </div>

      <div class="measure-feature">
        <div class="failure-modes">
          <div><span class="name">Native</span><p>The asset itself. Quoted on its own lane, valued in Bitcoin units, displayed to eight decimal places.</p></div>
          <div><span class="name">Spot wrapper</span><p>An anchored set of eleven spot funds. Checked <em>before</em> the fund branch so they score through the monetary model rather than as generic funds.</p></div>
          <div><span class="name">Futures product</span><p>Never treated as Bitcoin-class. A futures-based product is a different instrument with a different risk.</p></div>
          <div><span class="name">Proxy equity</span><p>Companies with Bitcoin exposure are ordinary operating equities. There is no proxy archetype, and they are not exempt from anything.</p></div>
        </div>
      </div>

      <div class="measure prose">
        <p>Market capitalisation resolves down a chain, and the last rung is worth seeing: network data, then a quoted figure, then <strong>price &times; 21,000,000</strong>. The protocol cap, not circulating supply, is the denominator &mdash; and a stale fundamental is never substituted for a missing one. Null is preferred to wrong.</p>
      </div>

      <div class="measure">
        <p class="sub-meta">Headroom &middot; the monetary model</p>
        <h3 class="sub-title">What the scoring engine actually uses.</h3>
      </div>
      <div class="measure prose">
        <p>Bitcoin runs through the same logarithmic headroom curve as everything else &mdash; the difference is what goes in the numerator. Absent a live research profile, the baseline is a <em>conservative</em> monetary total of roughly 11.5 trillion dollars, deliberately below the headline figures the doctrine discusses:</p>
        <p><strong>headroom = 35 &times; ln(1 + H) / ln(31)</strong>, where <strong>H = min(TAM &divide; market cap, 30)</strong></p>
        <p>At a market capitalisation near 1.4 trillion that is about 8.2&times; of headroom, scoring roughly 22.6 out of 35 &mdash; a strong reading, not a maximal one. Choosing the conservative pool is the point: the score should not depend on the most optimistic version of the thesis being right.</p>
        <p>Network convexity decays as adoption progresses:</p>
        <p><strong>network convexity = 18 &times; max(0, 1 &minus; penetration<sup>0.6</sup>)</strong>, where <strong>penetration = market cap &divide; TAM</strong></p>
        <p>Separately, the software displays a scenario that builds a total addressable market from three pools &mdash; a share of above-ground gold, a small share of global real estate, and a small share of emerging-market broad money &mdash; and divides by the 21 million cap to imply a price. <strong>That panel is a display scenario, not the scoring input</strong>, it is labelled as such, and its only live input is the gold price.</p>
        <p>The power-law overlay on the price chart is also modelling rather than scoring: a trend of <strong>2.88 &times; (days &divide; 1000)<sup>5.82</sup></strong> and a floor of <strong>1.2828 &times; (days &divide; 1000)<sup>5.928</sup></strong>. The accumulation doctrine built on top of it &mdash; reduce buying above convergence, deploy reserves below it &mdash; is written guidance. No code triggers on it.</p>
      </div>

      <div class="measure">
        <p class="sub-meta">Accumulation &middot; simulated and real</p>
        <h3 class="sub-title">A plan is not a purchase.</h3>
      </div>
      <div class="measure prose">
        <p>Scheduled contributions are simulated as a daily flow. The engine has no concept of weekly or monthly at all:</p>
        <p><strong>daily contribution = monthly amount &times; 12 &divide; 365</strong></p>
        <p>Contributions are added <em>after</em> each day&rsquo;s return, and they consume no randomness &mdash; the same simulation with and without contributions draws identical market paths. That is what makes the two headline numbers separable and honest:</p>
        <p><strong>contribution effect = wealth growth &minus; market gain</strong></p>
        <p>Expected compound return and probability of loss are computed on the <em>market-only</em> path. Money you added is not performance, and the framework refuses to let it flatter a return figure. A simulation with zero market return and active contributions shows wealth rising and market gain at exactly zero.</p>
      </div>

      <aside class="callout callout-insight">
        <p class="callout-label">A projection never becomes a holding</p>
        <p>Configuring a purchase schedule writes a projection setting and nothing else &mdash; no contribution event, no trade, no change to cost basis or net asset value. The only path that creates a real record is a purchase <em>you confirm</em>, which writes exactly one contribution event and one buy, and refuses a fill where the entered price and the received amount disagree by more than one percent. Simulated accumulation is never rendered as Bitcoin you own.</p>
      </aside>

      <div class="measure prose">
        <p>Allocation is measured against the canonical portfolio balance &mdash; <strong>Bitcoin value &divide; total portfolio balance &times; 100</strong> &mdash; counting native holdings only by default. The mode that also counts spot wrappers requires the wrapper set to resolve, and fails closed to native-only if it cannot. Bitcoin is excluded from every concentration measure, and carries its own posture target of 10 percent within a 5 to 15 percent range.</p>
      </div>
    </section>

    <section class="section" id="tax-math" aria-labelledby="tax-math-title">
      <div class="measure">
        <p class="section-eyebrow section-signal" data-glyph-text>Wrappers &amp; Basis</p>
        <h2 class="section-title" id="tax-math-title">What the system computes about tax, and what it does not.</h2>
      </div>
      <div class="measure prose">
        <p>This section is unusual because the most important thing in it is an absence, and stating it plainly is the whole point.</p>
      </div>

      <aside class="callout callout-info">
        <p class="callout-label">There is no tax rate anywhere in this system</p>
        <p>No ordinary rate, no short- or long-term capital-gains rate, no qualified-dividend rate, no net investment income tax, no state or bracket table, no user-entered rate. Nothing computes or displays an estimated tax liability, because there is nothing to compute it from. Every percentage the framework discusses about tax is written doctrine, carried in prose, with no consumer in code.</p>
      </aside>

      <div class="measure prose">
        <p>What <em>is</em> computed is accounting: cost basis, realised gain, holding period, and the effect of a return of capital. Those are facts about your ledger, not statements about your return.</p>
        <p><strong>Wrappers</strong> are Roth, Taxable, Pre-tax, Bitcoin, and Unknown. The last one matters: no normaliser anywhere defaults an unrecognised account to Taxable. An unknown wrapper stays unknown and is reported as such, because guessing the wrapper is guessing the entire tax character of everything in it.</p>
        <p><strong>Cost basis is total dollars</strong> at the position layer, and per-share only inside a lot &mdash; where it is not even stored at purchase but recomputed at disposal from what remains. Fees never enter basis; they are recorded as audit fields and kept out of the arithmetic.</p>
        <p><strong>Lot ordering</strong> is a property of the account, not of the sale: oldest first for first-in-first-out and average cost, newest first for last-in-first-out, highest basis first for highest-in-first-out with ties broken by the older acquisition date.</p>
        <p><strong>Holding period</strong> uses a threshold of 365 days, compared strictly &mdash; day 365 is short, day 366 is long. Where an acquisition date cannot be established the term is reported as unknown rather than assumed. Every surface carrying it says the same thing: this is advisory, and it is not tax advice.</p>
      </div>

      <div class="measure">
        <p class="sub-meta">Return of capital</p>
        <h3 class="sub-title">A distribution that reduces what you paid.</h3>
      </div>
      <div class="measure prose">
        <p>A distribution is split by its return-of-capital fraction <em>p</em>. If <em>p</em> is 1 the entire gross amount is return of capital with no companion dividend. Otherwise:</p>
        <p><strong>return of capital = round(gross &times; p)</strong> and <strong>taxable portion = gross &minus; return of capital</strong></p>
        <p>The two sum to the gross by construction. The return-of-capital portion then reduces basis <em>per share</em> across open lots, floored at zero so a lot can never go negative. Reinvestment runs after the reduction, never before.</p>
        <p>The accounting language here is deliberately flat &mdash; a return of capital <em>reduces cost basis and is not immediately taxable</em>. That is a mechanical statement, and it is as far as the arithmetic goes.</p>
      </div>

      <div class="measure prose">
        <p>Three more absences are worth naming, because their presence is often assumed. <strong>There is no wash-sale engine</strong> &mdash; no substantially-identical matching, no replacement detection, no disallowed-loss carryover. <strong>There is no Roth conversion, rollover, or required-distribution primitive.</strong> And <strong>a transfer between accounts carries no economics at all</strong>: it moves at a price of zero, preserves basis and the original acquisition date, and never realises a gain. A move that may have tax consequences is recorded as accounting motion, and the framework does not classify it.</p>
      </div>
    </section>

    <section class="section" id="evidence-math" aria-labelledby="evidence-math-title">
      <div class="measure">
        <p class="section-eyebrow section-signal" data-glyph-text>Epistemics</p>
        <h2 class="section-title" id="evidence-math-title">Evidence, confidence, and the limits of both.</h2>
      </div>
      <div class="measure prose">
        <p>Four things get called &ldquo;confidence&rdquo; in most systems. Here they are four separate quantities and are never collapsed into one number.</p>
      </div>

      <div class="measure-feature">
        <div class="failure-modes">
          <div><span class="name">Confidence</span><p>The quality of evidence at the moment of scoring.</p></div>
          <div><span class="name">Freshness</span><p>The age of an input against its own time-to-live.</p></div>
          <div><span class="name">Completeness</span><p>What fraction of the expected fields are present.</p></div>
          <div><span class="name">Source quality</span><p>Where each individual input came from.</p></div>
        </div>
      </div>

      <div class="measure prose">
        <p>And a fifth state sits off the ladder entirely. <strong>Unknown is not low.</strong> It is the absence of a rank, and it is carried as such rather than being quietly folded into the bottom tier &mdash; because &ldquo;we do not know&rdquo; and &ldquo;we know it is bad&rdquo; are different claims about the same position.</p>
        <p>Confidence has exactly one channel into the score, and it is the delta clamp: how far a score may move in one update. It does not otherwise raise or lower the number. Two caps illustrate the discipline &mdash; an unclassified over-the-counter venue forces confidence to low, and a market capitalisation under fifty million dollars caps it at medium. <strong>Both change the confidence tier only. Neither touches the score.</strong></p>
      </div>

      <div class="compare compare-wrap">
        <table>
          <caption>How long an input stays fresh</caption>
          <thead>
            <tr><th scope="col">Input</th><th scope="col">Window</th></tr>
          </thead>
          <tbody>
            <tr><th scope="row">Quotes</th><td data-label="Window">5 minutes</td></tr>
            <tr><th scope="row">Macro series</th><td data-label="Window">6 hours</td></tr>
            <tr><th scope="row">Earnings</th><td data-label="Window">12 hours</td></tr>
            <tr><th scope="row">Fundamentals</th><td data-label="Window">7 days</td></tr>
            <tr><th scope="row">Research</th><td data-label="Window">72 hours</td></tr>
            <tr><th scope="row">Model estimates</th><td data-label="Window">30 days</td></tr>
            <tr><th scope="row">Addressable market</th><td data-label="Window">90 days</td></tr>
          </tbody>
        </table>
      </div>
      <p class="compare-key">These are freshness boundaries, not confidence values &mdash; crossing one marks a record stale, and never rewrites a confidence tier</p>

      <div class="measure">
        <p class="sub-meta">Evidence discount</p>
        <h3 class="sub-title">Thin evidence can only subtract.</h3>
      </div>
      <div class="measure prose">
        <p>An evidence-adjusted view of a score discounts each component by how directly its inputs were observed &mdash; nothing for company-specific direct evidence, rising through category-level and proxy evidence to half for missing:</p>
        <p><strong>evidence-adjusted score = max(0, CIS &minus; &Sigma; points &times; weight &times; discount rate)</strong></p>
        <p>The direction is fixed and it is one-way. <strong>The adjustment can only reduce. There is no path by which good-looking evidence inflates a score above what the components produced.</strong></p>
      </div>

      <div class="measure">
        <p class="sub-meta">Model estimates</p>
        <h3 class="sub-title">A language model is never the top of the ladder.</h3>
      </div>
      <div class="measure prose">
        <p>Where a language model contributes, its own stated confidence is one factor among four and never the largest: model self-report 0.30, evidence completeness 0.30, persistence across runs 0.20, agreement with deterministic classification 0.20. The self-report is additionally passed through a compressing curve with a hard ceiling of 0.85 &mdash; <strong>a model, on its own testimony alone, can never reach full confidence.</strong></p>
        <p>Beneath that: a model estimate never counts toward real coverage, is bounds-checked per field and rejected if implausible, expires after 30 days, and is refused outright for market data such as momentum, volatility, and volume. A classification must clear a calibrated score of 50 before it may be written at all.</p>
        <p>Where a research claim becomes a catalyst probability, the mapping is bounded and stated as what it is: <strong>probability = clamp(confidence &divide; 100, 0.20, 0.85)</strong>. That is a heuristic translation. It has never been fitted to outcomes, and it is not a statistical probability.</p>
      </div>

      <aside class="callout callout-info">
        <p class="callout-label">Two things the framework does not claim</p>
        <p>There is <strong>no portfolio-level confidence number</strong>. Confidence exists per position, and no surface manufactures an aggregate where no formula exists. And nothing here is <strong>calibrated, backtested, validated, or proven</strong> in the empirical sense &mdash; the scores are a designed instrument with documented reasoning, not a model fitted to realised outcomes. Where the software says &ldquo;calibrated&rdquo;, it means simulation parameters fitted to historical series, which is a different and narrower claim.</p>
      </aside>
    </section>

    <section class="section" id="nds-math" aria-labelledby="nds-math-title">
      <div class="measure">
        <p class="section-eyebrow section-signal" data-glyph-text>Marginal Capital</p>
        <h2 class="section-title" id="nds-math-title">The next dollar.</h2>
      </div>
      <div class="measure prose">
        <p>The position score asks how good a holding is. The Next Dollar Score asks a narrower question: given what you already own, where would the <em>next</em> dollar do the most work? It is a ranking instrument, and it is separate from CIS by design.</p>
        <p>Six components, weighted:</p>
      </div>

      <div class="compare compare-wrap">
        <table>
          <caption>Next Dollar Score components</caption>
          <thead>
            <tr><th scope="col">Component</th><th scope="col">Weight</th><th scope="col">What it measures</th></tr>
          </thead>
          <tbody>
            <tr><th scope="row" class="col-primary">Position score</th><td data-label="Weight">0.30</td><td data-label="Measures">The quality of the holding itself. A missing score enters as 40, not as zero.</td></tr>
            <tr><th scope="row">Size opportunity</th><td data-label="Weight">0.20</td><td data-label="Measures">How much room is left before the position is already large</td></tr>
            <tr><th scope="row">Expression purity</th><td data-label="Weight">0.15</td><td data-label="Measures">Whether the holding expresses the thesis cleanly or by proxy</td></tr>
            <tr><th scope="row">Posture alignment</th><td data-label="Weight">0.15</td><td data-label="Measures">Distance from the posture budget &mdash; underweight scores higher</td></tr>
            <tr><th scope="row">Momentum context</th><td data-label="Weight">0.10</td><td data-label="Measures">Recent price behaviour, read against whether the thesis still holds</td></tr>
            <tr><th scope="row">P&amp;L context</th><td data-label="Weight">0.10</td><td data-label="Measures">Unrealised position, read the same way</td></tr>
          </tbody>
        </table>
      </div>

      <div class="measure prose">
        <p>Size opportunity decays exponentially with what you already hold:</p>
        <p><strong>size opportunity = clamp(round(90 &times; e<sup>&minus;0.18 &times; allocation%</sup>), 0, 100)</strong></p>
        <p>An untouched name scores 90. At 5 percent it is 37. Past roughly 35 percent it approaches zero. The curve is the arithmetic form of a simple idea: the marginal dollar is worth less to a position that already has plenty.</p>
        <p>Two components are deliberately asymmetric, and both condition on whether the thesis survives. A deep drawdown in a position whose score is still intact <em>raises</em> the next-dollar reading &mdash; that is the averaging-down case. The same drawdown where the score has broken lowers it sharply. Large unrealised gains only reduce urgency; they never make a position more attractive to add to.</p>
        <p>Six bounded modifiers then adjust the composite &mdash; opportunity cost against the best available peer, posture throttles and boosts under a defensive regime, an expression-purity penalty, a score-trend adjustment bounded to &plusmn;8, and a readiness penalty capped at 12. A positive trend bonus requires a score of at least 40, so a weak or missing score can never be lifted by momentum in its own trend line.</p>
      </div>

      <div class="measure">
        <p class="sub-meta">Gates &middot; what they actually do</p>
        <h3 class="sub-title">Advisory, and precisely bounded.</h3>
      </div>
      <div class="measure prose">
        <p>Above 15 percent of the portfolio, the surface stops recommending additions. Between 10 and 15 percent it raises a caution and <em>keeps</em> recommending &mdash; <strong>the 10 percent line is advisory, not a freeze.</strong> A score below 40 blocks additions. Cash blocks. Bitcoin blocks, because it is managed at the wrapper level rather than position by position.</p>
        <p>Trimming is never hard-blocked in any state. The framework will always let you reduce.</p>
        <p>An ineligible position still receives a full score and still appears in the ranking. Gates annotate; they do not erase.</p>
        <p>Bands are 75 and above for strong, 55 for moderate, 35 for weak, below that avoid &mdash; lower-bound inclusive at every edge. They order advisory copy. They size nothing.</p>
        <p>Rotation pairs a bottom-quartile candidate with a top-quartile one, requires a score gap of at least 15, emits at most five pairs, and needs at least four eligible positions to run at all. Cash and Bitcoin are excluded from the exercise.</p>
      </div>

      <aside class="callout callout-insight">
        <p class="callout-label">The next dollar score sizes nothing</p>
        <p>The portfolio builder contains no reference to it. Position sizing, concentration limits, and wrapper placement are decided by the position score and the construction rules, and they remain authoritative. A rotation pair carries two scores, a gap, and a sentence &mdash; no weight, no order, no execution. <strong>Advisory only, and not a trade signal.</strong></p>
      </aside>
    </section>

    <section class="section" id="scope" aria-labelledby="scope-title">
      <div class="measure">
        <p class="section-eyebrow section-signal" data-glyph-text>Scope</p>
        <h2 class="section-title" id="scope-title">What this page does not yet cover.</h2>
      </div>
      <div class="measure prose">
        <p>The extraction this page draws from runs to twelve chapters. Eight are published here: the position score, the construction score, allocation and sizing, governance, the Bitcoin backbone, wrappers and basis, evidence and confidence, and the next dollar.</p>
        <p>Four are deliberately held back &mdash; forward projection and parameter estimation, earnings and forward valuation, performance accounting and net asset value, and margin mechanics. Those are modelling and accounting surfaces where a published formula reads too easily as a forecast or a claim about results. They will not appear here without a specific decision to publish them.</p>
        <p>Within the eight, the same rule applies at a finer grain: this page carries the mathematics, not the audit apparatus that verified it. Engine locations, verification logs, and the register of places where a specification and the running code have drifted apart live in the internal reference, which is where they are useful.</p>
      </div>
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
  '<meta name="description" content="The Adaptive Convexity Framework stated as mathematics: the position score and its four components, the subtractive construction score, the translation from score to position size, and what the governance layer does and does not do.">'
);
html = html.replace(/<a class="skip-link" href="#[^"]*">/, '<a class="skip-link" href="#reading">');

// Sidebar: drop the donor's active state and per-page contents, mark In Math current.
html = html.replace(/\s*<ol class="on-this-page"[\s\S]*?<\/ol>/g, '');
html = html.replace(
  /\s*<p class="side-movement">Reference<\/p>\s*<ul class="side-parts">[\s\S]*?<\/ul>/,
  ''
);
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
const sections = (main.match(/<section class="section"/g) || []).length;
console.log(`Math page built: ${sections} sections -> public/site-b/framework-in-math.html`);
