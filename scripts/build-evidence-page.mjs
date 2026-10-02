#!/usr/bin/env node
/**
 * Build public/site-b/evidence.html — what these pages can show, and what they
 * cannot yet.
 *
 * WHY THIS IS GENERATED. The page cites numbers that change: how many checks
 * recompute the worked examples, and the readings of Part 1's four tests. Typed
 * by hand, those would go stale on the one page whose job is to be checkable.
 * So the counts are read from the test files and the readings from
 * scripts/part1-history.mjs at build time, and `prebuild` regenerates them.
 * tests/evidence-page.test.mjs holds the page to the same sources.
 *
 * Everything else (the claims ledger, the limits, the forward record and the
 * corrections) is authored here, deliberately. A correction is added by hand,
 * with its date and the commit that made it, never silently edited away.
 *
 * Run: npm run build:evidence
 */
import fs from 'node:fs';
import path from 'node:path';
import { stripSeriesChain } from './site-b-shell.mjs';
import { stampSocialMeta } from './social-meta.mjs';
import { readings } from './part1-history.mjs';
import { readings as correlationReadings } from './stock-bond-correlation.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const SITE = path.join(ROOT, 'public', 'site-b');
const DONOR = path.join(SITE, 'part-6-convexity-scoring.html');
const OUT = path.join(SITE, 'evidence.html');

/** Checks in a test file: top-level test() calls, counted from the source. */
export const countChecks = (rel) => (fs.readFileSync(path.join(ROOT, rel), 'utf8').match(/^test\(/gm) || []).length;
const WORKED = countChecks('tests/worked-examples.test.mjs');
const HISTORY = countChecks('tests/part1-history.test.mjs');
const CORRELATION = countChecks('tests/stock-bond-correlation.test.mjs');

const R = readings();
const f1 = (x) => x.toFixed(1);
const f2 = (x) => x.toFixed(2);
const neg = (x) => (x < 0 ? `&minus;${f2(-x)}` : f2(x));
const g = R.policyGap;
const T1 = R.test1;
const SB = correlationReadings();
const pctOf = (x) => `${Math.round(x * 100)} percent`;
const SBnow = SB.runs[SB.runs.length - 1];
const SBprev = SB.runs[SB.runs.length - 2];
if (SBnow.sign !== 'negative' || SBprev.sign !== 'positive' || SB.formal.met || !SB.formal.longestNegativeRun) throw new Error('Evidence build: test 3 readings changed shape; rewrite the test 3 row before rebuilding.');
if (T1.formal.met || T1.formal.pending || !T1.at2point6.met) throw new Error('Evidence build: test 1 readings changed; rewrite the test 1 row before rebuilding.');
const monthName = (m) => new Date(`${m}-01T00:00:00Z`).toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

const row = (cells, labels) => `<tr>${cells.map((c, i) => (i === 0 ? `<th scope="row">${c}</th>` : `<td data-label="${labels[i]}">${c}</td>`)).join('')}</tr>`;
const table = (caption, labels, rows) => `
      <div class="compare compare-wrap compare-prose">
        <table>
          <caption>${caption}</caption>
          <thead>
            <tr>${labels.map((l) => `<th scope="col">${l}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${rows.map((r) => row(r, labels)).join('\n            ')}
          </tbody>
        </table>
      </div>`;
const section = (id, eyebrow, title, body) => `
    <section class="section" id="${id}" aria-labelledby="${id}-title">
      <div class="measure">
        <p class="section-eyebrow section-signal" data-glyph-text>${eyebrow}</p>
        <h2 class="section-title" id="${id}-title">${title}</h2>
      </div>
${body}
    </section>`;
const prose = (...ps) => `      <div class="measure prose">\n${ps.map((p) => `        <p>${p}</p>`).join('\n')}\n      </div>`;
const ref = (href, text) => `<a class="part-ref" href="${href}">${text}</a>`;
const ext = (href, text) => `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
const REPO = 'https://github.com/Tataku/ACF-Docs';
const P1 = '/part-1-foundation';
const P3 = '/part-3-bitcoin-convexity-backbone';

const ledger = section('ledger', 'The Claims', 'Ordered by how well they can be proved.', [
  prose('Not every claim in these pages carries the same weight. This table sorts them from the most provable to the least, and says where each can be checked.'),
  table('The book&rsquo;s claims, by the kind of evidence behind them', ['Kind of claim', 'What it covers', 'How to check it', 'Where it stands'], [
    ['Arithmetic', 'The worked examples: tax drag and wrapper compounding, the Roth case, loan-to-value after a fall, the addressable-market scenario, the sizing and scoring formulas.', `A public test suite recomputes each example from the inputs its page states (${WORKED} checks), on every pull request and every change to the main branch. It shows that each example follows from the formula these pages state; it does not show that the dashboard runs that formula (see the limits below), or that the inputs are right.`, 'Checkable today'],
    ['Historical record', 'Debt, interest and inflation data; market returns; Bitcoin&rsquo;s cycles; 2022.', `Every chart names its sources and says whether it is plotted, drawn through published figures, simulated or conceptual. One chart, Part 1&rsquo;s debt and interest exhibit, is plotted from named public series. The figures Part 1 derives are recomputed from committed public data (${HISTORY} checks).`, 'Checkable today'],
    ['Published research', 'Fragility (Taleb; Taleb and Douady, 2013), the stock-bond correlation (AQR; BIS), the liquidation of government debt (Reinhart and Sbrancia; Acalin and Ball), fiscal dominance (Sargent and Wallace), and the other works the Parts cite.', 'Each citation names its source. The findings are theirs; how the framework applies them is ours.', 'Checkable today'],
    ['Design judgment', 'Postures, sizing bands, the CIS reference weights (40/25/25/10), tripwire thresholds, the thresholds of Part 1&rsquo;s tests.', 'These are choices, argued in the Parts. None was fitted to past returns. The test thresholds were set with the history in view, and the readings below show that history.', 'Argued, not proved'],
    ['The regime thesis', 'That fiscal dominance is a governing constraint of this regime, and that the traditional playbook was built for one that has ended.', `Part 1&rsquo;s ${ref(`${P1}#falsifiers`, 'four tests')}, read each February on public data.`, 'Open; the evidence accumulates forward'],
    ['The framework as a whole', 'Whether following it does better than a simple portfolio after costs and taxes.', 'No backtest and no real-money track record. The forward record below logs decisions, not performance.', 'Unproven'],
  ]),
].join('\n'));

const limits = section('limits', 'The Limits', 'What we cannot show yet.', prose(
  '<strong>The dashboard&rsquo;s code is private.</strong> The ' + ref('/framework-in-math', 'Math page') + ' transcribes the formulas the dashboard runs, but a reader cannot check that transcription against the code. Publishing the scoring module, or a public harness that reproduces the published examples from the same code, would close the gap.',
  '<strong>Scores are structured judgment.</strong> Where reported data is missing, sub-scores use AI-generated estimates, at a discount, where they exist, and otherwise defaults set by posture and sector. The score is capped as usable coverage thins (AI estimates count toward it): at 75 below 70 percent coverage, 68 below 50 percent and 60 below 30 percent. The lowest cap still falls in the standard sizing band (60 to 69), so a holding with under 30 percent coverage can be sized as standard. A capped score means &ldquo;not enough data,&rdquo; not &ldquo;average.&rdquo;',
  '<strong>No backtest and no track record.</strong> The rules were designed, not fitted to past returns, and they have not been tested against a benchmark or run with real money in public.',
  '<strong>We grade our own tests.</strong> Part 1&rsquo;s tests are scored by us. The data and the script are public so that anyone can rerun them and disagree.',
  '<strong>No independent review yet.</strong> These pages are published under a pen name. The 2026 review was internal: an AI model checked the claims against primary sources, and the author decided each finding. The corrections below are what it found.',
));

const forward = section('forward', 'The Record', 'Every change, and every decision not to change.', [
  prose(`This record logs, with date and reason: every change to a rule, weight or threshold published in these pages; every change to a named instrument; each February&rsquo;s readings of Part 1&rsquo;s tests; and every event that tests a named instrument&rsquo;s qualifying criteria (a monthly price move of more than 20 percent; a missed, deferred or reduced distribution; a rating action; a public regulatory investigation or enforcement action involving the issuer or named instrument; a lawsuit filed against the issuer). Each &ldquo;no change&rdquo; entry says what would have changed it. Entries dated before October 2026 were written after the fact, and say so. The record is kept in the ${ext(REPO, 'public repository')}, where every change carries its date.`),
  table('The forward record, newest first', ['Date', 'Event', 'Decision', 'Reason'], [
    ['Release date (stamped at release)', `Part 1&rsquo;s four tests published with their first readings (${ref('#tests', 'below')}).`, 'None.', 'Baseline.'],
    ['<span class="pilot-ph">[date]</span>', 'The ticker-symbol offset removed from the dashboard&rsquo;s scores (engine version 3.2).', 'Removed. Equal inputs now give equal scores, and each holding&rsquo;s score moved once, on its next recalculation.', 'Found by the documentation audit (October 2026): the dashboard added a fixed offset computed from each holding&rsquo;s ticker symbol, at 40 places in its scoring code and up to 20 percent of a sub-score&rsquo;s maximum. In the audit&rsquo;s tests, holdings with identical data scored up to 4.5 points apart on CIS and up to 35 points apart on one component for that reason alone; on the convexity component it could only raise a stock&rsquo;s score. It carried no information about the asset. On the audit&rsquo;s test cases, removing it moved final scores by between &minus;3.8 and +1.9 points and components by up to 17.5. The owner ruled it a model defect.'],
    ['October 2, 2026', 'STRC&rsquo;s slot given a binding exit rule, before publication.', 'Adopted: the &ldquo;stronger candidate&rdquo; test and the logging rule in the STRC entry below.', 'An exit criterion loose enough to protect a favored holding is not a criterion.'],
    ['October 2, 2026', 'Final red-team review tightened named-instrument governance before publication.', 'Quarterly STRC reassessments now require a defined comparison set, and the forward-event triggers now include public regulatory investigations and enforcement actions.', 'A replacement rule cannot depend on an input nobody is required to produce, and event logging should not imply an unproved cause.'],
    ['October 2, 2026', 'Tests 1 and 3 given a prospective window, before publication.', 'Every test now counts only from January 1, 2026; earlier observations are history.', 'Test 1&rsquo;s 2.5 percent bar was set after the 2023&ndash;2025 low of 2.56 percent was known, and test 3 read over history would already be met. Neither should be judged on data seen when it was written.'],
    ['October 1, 2026', 'Documentation review published, with the corrections below.', 'Corrections published. Where a stated rule&rsquo;s own arithmetic was wrong, the rule was restated (Part 3&rsquo;s loan-to-value guidance); the structure of the method did not change.', 'Published errors are corrected in public, with dates.'],
    ['June 26, 2026 (written October 2026)', 'STRC closed at $74.57 (intraday low $71.25). It was back above $84 by June 30 and closed at $99.56 on September 29, close to its 52-week high of $100.42. Distributions were paid throughout. On June 29 Strategy raised the rate from 11.5 to 12 percent a year, paid semi-monthly from July 1.', 'No change to STRC&rsquo;s role as the framework&rsquo;s named income Ballast.', `STRC qualifies as Ballast under the three-of-five rule on durable cash generation (for a preferred, its distribution record: paid in every period since issuance), low factor correlation (the monthly rate reset is designed to hold its price near its $100 stated amount) and a liquidity-resilient valuation (its $100 stated amount and rate-reset support). It carries no agency credit rating as a new instrument; the framework reads the issuer&rsquo;s Bitcoin asset coverage as its measure of balance-sheet strength. What would change it: the commitment is to the slot, not the name. The 12 percent income and deployment slot is a documented exception to the ordinary 10 percent single-Ballast maximum (${ref('/part-5-portfolio-construction-position-management#ballast', 'Part 5')}), reviewed at each quarterly Ballast reassessment and sooner on material deterioration; STRC holds it today. It gives up the slot if it stops meeting three of the five Ballast criteria (a missed, deferred or reduced distribution would end the distribution record that counts as its cash generation), or if a stronger candidate appears. At each quarterly reassessment, STRC is compared with every cash-distributing Ballast candidate in the dashboard&rsquo;s current discovery universe that meets at least three eligibility criteria. A candidate is stronger if it meets more of the five criteria than STRC, or meets as many and has a CIS at least 5 points higher at two consecutive reassessments. The full comparison set and result are logged here, including &ldquo;no eligible alternative&rdquo; when the set is empty.`],
  ]),
].join('\n'));

const C = (date, where, what, commit) => [date, where, what, ext(`${REPO}/commit/${commit}`, commit)];
const corrections = section('corrections', 'Corrections', 'What was wrong, and what it says now.', [
  prose('The substantive errors found in published versions of these pages, with the date each fix was published and the change that made it. Wording fixes are not listed. If you set up a Bitcoin-backed loan using the earlier Part 3 text, recheck its liquidation level against the arithmetic now in ' + ref(P3, 'Part 3') + '.'),
  table('Corrections, newest first', ['Published', 'Where', 'What was wrong, and what it says now', 'Change'], [
    C('October 1, 2026', 'Part 3', 'Said a 20 to 35 percent loan-to-value range (50 percent maximum) lets the position &ldquo;withstand the 70%+ drawdowns Bitcoin has historically experienced without a margin call.&rdquo; It does not. Loan-to-value after a fall is the starting ratio divided by one minus the fall, so a 70 percent fall takes 35 percent to about 117 percent. The passage now gives the arithmetic and dated lender terms.', '7eb514c'),
    C('October 1, 2026', 'Part 3 chart', 'The power-law chart put a &ldquo;now&rdquo; point near $1.1 million while Bitcoin traded near $84,000. It is now a schematic with no price claims; dated readings are in the prose.', '7eb514c'),
    C('October 1, 2026', 'Part 4 chart', 'The pre-tax line taxed only the gain. A deducted contribution has no basis, so the whole withdrawal is taxed. Fixed, and the chart now states that at equal tax rates Roth and pre-tax end even.', '7eb514c'),
    C('October 1, 2026', 'Parts 5, 6, charts', 'Momentum gates were described as running in the software. They are written rules the reader carries out; the dashboard does not yet measure the three momentum dimensions.', '7eb514c'),
    C('October 1, 2026', 'Parts 1, 5, 6, Math page', 'The dashboard was described as enforcing or blocking actions, and Part 1 spoke of automated tripwires. The dashboard records every trade and never blocks one; it flags and displays, and the response is the reader&rsquo;s.', '7eb514c'),
    C('October 1, 2026', 'Part 1 charts', 'Exhibits cited data series that do not exist or were mislabeled, and one drew federal interest at 3.26 percent of GDP in 1980 against an actual 1.84. Debt and interest are now plotted from FRED/OMB data.', '7eb514c'),
    C('October 1, 2026', 'Parts 1, 3, 5, glossary, Math page', 'Bitcoin figures (drawdowns, market caps, addressable-market horizons, reserve ranges) disagreed between pages. One dated set is now used everywhere.', '7eb514c'),
    C('October 1, 2026', 'Parts 3, 4', 'Tax limits and rules were undated or wrong, and an unsourced &ldquo;5 to 8 percent annual tax alpha&rdquo; appeared. Limits are dated to 2026 with statute citations; the figure is gone.', '7eb514c'),
    C('October 1, 2026', 'Part 2 and others', 'A Druckenmiller quotation joined two separate statements; Edelman&rsquo;s crypto guidance was years out of date; a &ldquo;3 to 5 times&rdquo; liquidity multiple had no source; Dalio&rsquo;s cycle lengths came from two different publications. Each is restored to its source or removed.', '7eb514c'),
    C('October 1, 2026', 'Part 6, Math page', 'The 40/25/25/10 weights were called the default (they are reference weights), an FIS example could not occur under the rules, and the Math page said one of twelve emergency conditions runs as live code when five are detected. Each is corrected, and the example is recomputed.', '7eb514c'),
    C('October 1, 2026', 'Cover, Part 1', '&ldquo;Fiduciary-grade&rdquo; and &ldquo;survives being wrong&rdquo; were stated as facts, and winners picked in hindsight were offered as evidence. They are now stated as design goals, with a scope note.', '7eb514c'),
    C('September 30, 2026', 'Math page', 'Worked examples of the headroom formula did not follow from the formula: 10&times; was printed as scoring 27.8 (the formula gives 24.4) and parity as zero (7.1). They were recomputed from the unchanged formula, and a test now recomputes them.', '3604b5f'),
    C('September 30, 2026', 'Part 3', 'The case study printed position values where prices belonged, valued the end of 2025 at $100,000 a coin (the year closed near $87,500), said a 77 percent fall cost one portfolio only 8 to 10 percent when its own Bitcoin sleeve gives about a quarter, and dated a $2.0 to $2.1 trillion market cap to early 2026, a level January 2026 never reached. Each now follows from its inputs.', '3604b5f'),
    C('September 30, 2026', 'Parts 4, 5', 'STRC figures from January 2026 were presented as current. They are now dated.', '3604b5f'),
  ]),
].join('\n'));

const arithmetic = section('arithmetic', 'Open Arithmetic', 'Rerun it yourself.', prose(
  `The documentation is public: ${ext(REPO, 'github.com/Tataku/ACF-Docs')}. Clone it and run <code>npm test</code>. Among the suite&rsquo;s checks, ${WORKED} recompute the worked examples from the inputs each page states: the headroom formula and its examples, the Bitcoin headroom and network-convexity examples, catalyst decay, the FIS floor and multiplier, the sizing bands, the size-opportunity curve, the FIS example book, Part 3&rsquo;s case study, drawdowns, addressable-market and gold scenarios, reserve arithmetic and loan-to-value passage, Part 4&rsquo;s Roth case and tax-wedge charts, Part 5&rsquo;s wrapper compounding (1.10<sup>30</sup> against 1.075<sup>30</sup>) and Part 2&rsquo;s tax-drag multiples.`,
  `Another ${HISTORY} recompute every figure Part 1 derives from committed public data (<code>data/part1-history/</code>, read by <code>scripts/part1-history.mjs</code>): the 60/40 and Treasury returns after inflation, the debt and interest checkpoints, the inflation figures, 2022&rsquo;s rank since 1928, and the readings behind Part 1&rsquo;s tests. Part 1&rsquo;s Bitcoin, yield and sequence-of-returns figures are checked against their cited sources, not yet by a test.`,
  `A further ${CORRELATION} rebuild the stock-bond correlation behind test 3 from Robert Shiller&rsquo;s monthly S&amp;P Composite series and the 10-year Treasury yield (<code>scripts/stock-bond-correlation.mjs</code>): they check the data against its sources, the bond reconstruction, the method and the history the pages state.`,
  'The same suite confirms that each of the 46 charts declares its data mode and names its sources, and that a chart labeled as plotted data names each series, its range and its retrieval date. It does not compare a drawn line with its sources; the source links are there for that.',
));

const testsTable = section('tests', 'The Tests', 'Part 1&rsquo;s tests: method and readings.', [
  prose(`Read each February. Every test counts only from January 1, 2026: earlier observations are shown as history and do not count toward meeting a test. About nine months of that window had passed when the tests were set. 60/40 means 60 percent US stocks (S&amp;P 500 with dividends) and 40 percent 10-year Treasuries, rebalanced each January; returns after inflation are compounded from Aswath Damodaran&rsquo;s annual series (NYU Stern) and the December-to-December change in the BLS consumer price index. The readings below are computed from the committed data when this page is built.`),
  table('The four tests that would prove Part 1&rsquo;s thesis wrong', ['Test', 'Wrong if', 'Data and method', 'History behind the threshold', 'Reading'], [
    ['1. The central bank stays in charge', 'From January 2026, the policy rate stays at least 1 point above core PCE inflation for at least 24 consecutive months, and within that stretch core PCE inflation reaches 2.5 percent or below, while federal interest outlays are at least 3 percent of GDP in each month&rsquo;s fiscal year.', 'Monthly effective federal funds rate (FRED FEDFUNDS) less the 12-month change in the core PCE price index (PCEPILFE); interest outlays from FYOIGDA188S. Computed by <code>test1()</code> in <code>scripts/part1-history.mjs</code>.', `Interest outlays were ${f1(R.fiscal[2023].interest)} percent of GDP in fiscal 2023, ${f1(R.fiscal[2024].interest)} in 2024 and ${f1(R.fiscal[2025].interest)} in 2025. The 2023&ndash;2025 episode does not count, and it is evidence against our reading: the gap was 1 point or more for ${g.longestRun.len} months, ${monthName(g.longestRun.from)} to ${monthName(g.longestRun.to)}, and core PCE inflation bottomed at ${f2(g.coreLow.value)} percent (${monthName(g.coreLow.month)}). At a 2.6 percent bar, ${monthName(T1.at2point6.longestRun.from)} to ${monthName(T1.at2point6.longestRun.to)} (${T1.at2point6.longestRun.len} months, all in fiscal years with interest at 3 percent of GDP or more) would have met the test. We set the 2.5 percent bar after that low was known.`, `Not met. From January to ${monthName(T1.formal.lastMonth)} the gap was below 1 point in every month (largest ${f2(T1.formal.gapMax.value)}, ${monthName(T1.formal.gapMax.month)}); ${monthName(g.latest.month)}: gap ${f2(g.latest.gap)} points, core PCE inflation ${f2(g.latest.core)} percent. On September 16, 2026 the Federal Reserve raised its target range to 3.75&ndash;4.00 percent, its first increase since 2023.`],
    ['2. Bondholders are not paying', '10-year Treasuries return more than 1.5 percent a year after inflation over 2026&ndash;2035.', 'Damodaran&rsquo;s 10-year Treasury series; CPI-U December to December.', `1928&ndash;2025: ${f2(R.bond.since1928)} percent a year; above 1.5 percent in ${R.bond.decadesAbove1point5.hit} of ${R.bond.decadesAbove1point5.n} rolling ten-year periods; 1946&ndash;1974: ${neg(R.bond.liquidation1946to1974)} percent; 2022&ndash;2025: ${neg(R.bond.known2022to2025)} percent (not counted).`, 'First reading February 2027.'],
    ['3. The hedge returns', 'From January 2026, the 24-month correlation of monthly returns on US stocks and 10-year Treasuries is below zero at 12 consecutive month-ends.', 'Stocks: Robert Shiller&rsquo;s monthly S&amp;P Composite series (ie_data.xls, retrieved through a public GitHub mirror and pinned by commit and file hash), price plus one-twelfth of the annual dividend; the price is the monthly average of daily closes, not a month-end close. Bonds: a 10-year par bond repriced each month from the 10-year Treasury yield (Federal Reserve H.15, FRED GS10, monthly average). Pearson correlation of simple monthly returns over the trailing 24 months. Monthly averages smooth returns and can move the level of the correlation; the test reads its sign. Computed by <code>scripts/stock-bond-correlation.mjs</code>.', `In this series the correlation was negative at ${pctOf(SB.eras['1970-1999'].negativeShare)} of month-ends from 1970 to 1999 and ${pctOf(SB.eras['2000-2020'].negativeShare)} from 2000 to 2020. It was positive from ${monthName(SBprev.from)} to ${monthName(SBprev.to)}, and has been negative since ${monthName(SBnow.from)}.`, `Not met. Below zero at ${SB.formal.longestNegativeRun.len} consecutive month-ends, ${monthName(SB.formal.longestNegativeRun.from)} to ${monthName(SB.formal.longestNegativeRun.to)}; the test needs 12. ${monthName(SB.latest.month)}: ${neg(SB.latest.value)}. Data through ${monthName(SB.formal.dataThrough)}, the last month for which Shiller reports a dividend; later months are not estimated.`],
    ['4. The old portfolio delivers', 'The 60/40 returns at least 4 percent a year after inflation, before fees and taxes, over 2026&ndash;2035.', 'Damodaran&rsquo;s annual returns; CPI-U December to December.', `1928&ndash;2025: ${f2(R.mix.since1928)} percent a year; at least 4 percent in ${R.mix.decadesAt4.hit} of ${R.mix.decadesAt4.n} rolling ten-year periods; 1946&ndash;1974: ${f2(R.mix.liquidation1946to1974)} percent; 1982&ndash;2021: ${f2(R.mix.fallingRates1982to2021)} percent; 2022&ndash;2025: ${f2(R.mix.known2022to2025)} percent (not counted).`, 'First reading February 2027.'],
  ]),
].join('\n'));

const review = section('review', 'The Review', 'The questions a model review asks.', [
  prose('US bank supervisors ask four questions of any model a bank relies on. They were set out in SR 11-7 (2011), which the Federal Reserve, the OCC and the FDIC replaced in April 2026 with SR 26-2, keeping them. That guidance is written for banks. We use its questions because they apply to any model people act on; we do not claim to meet it, and no regulator has reviewed these pages.'),
  table('Where these pages stand on each question', ['Question', 'Where these pages answer it', 'Where we stand'], [
    ['Conceptual soundness: is the design sound, and are its assumptions stated?', 'The Parts state each rule and its reasoning; the Math page states the formulas; the scope notes state the assumptions.', 'Partial: the formulas cannot be checked against the private code'],
    ['Ongoing monitoring: is it still working as intended?', 'The forward record, the February readings and the corrections.', 'Starts with the first readings'],
    ['Outcomes analysis: do its outputs match what happened?', 'Not yet possible: no backtest and no real-money record.', 'Open'],
    ['Effective challenge: has someone objective and informed tried to break it?', `The 2026 review was internal. Corrections and challenges are invited as ${ext(`${REPO}/issues/new`, 'public GitHub issues')}.`, 'Open'],
  ]),
].join('\n'));

// PM directive 5955923209 / execution order 5958817633 and adjudication
// 5958972502 (2026-10-02): general conflict, product-status and AI disclosures;
// no position sizes, account details or trading policy. Wording is held to the
// sourced fact packet where the two differ.
//
// A LITERAL date, deliberately, and only on the two statements that depend on
// state that can change: the author's holdings and the dashboard's status. A
// person sets it after re-checking both; a build-time date would re-certify
// facts nobody checked.
const DISCLOSURES_AS_OF = 'October 2, 2026';
const disclosures = section('disclosures', 'Disclosures', 'Conflicts, the dashboard, and AI assistance.', prose(
  `<strong>Conflicts.</strong> As of ${DISCLOSURES_AS_OF}, the author may have financial interests in assets and securities discussed in these pages. Those interests can create conflicts of interest. Position sizes and account details are not published. Evaluate any instrument named in these pages independently.`,
  `<strong>The dashboard.</strong> The author also leads the ACF Dashboard, the portfolio software these pages describe. As of ${DISCLOSURES_AS_OF}, it is a private, pre-commercial beta: its public beta phase is paused, and the infrastructure for a paid public launch is not complete. These pages are published separately, as public material that is free to read.`,
  '<strong>AI assistance.</strong> AI systems materially assisted with research, drafting, rewriting, source checking, arithmetic and its tests, consistency review and adversarial review. The author made the final decisions on the framework, its thresholds, its named instruments and its corrections, and remains responsible for what these pages publish. The author has delegated the publication of routine documentation changes to AI agents under standing rules, so not every such change is reviewed by the author before it appears. The AI review is not independent third-party, legal, regulatory, tax or investment-professional validation.',
  '<strong>Status.</strong> The framework has not published a benchmarked backtest or a public real-money track record. The dashboard&rsquo;s source code is private. The tests and evidence calculations are published so that readers can inspect and challenge them. Nothing in these pages is individualized legal, tax or investment advice.',
));

const main = `<main class="shell-main">

    <header class="doc-header">
      <div class="measure">
        <p class="doc-eyebrow" data-glyph-text>Framework Reference</p>
        <p class="doc-kicker">What can be checked, and how</p>
        <h1 class="doc-title">Evidence</h1>
        <p class="doc-byline">By Dale Edward &middot; Corrections and challenges: ${ext(`${REPO}/issues/new`, 'open an issue on GitHub')}</p>
      </div>
      <div class="measure prose">
        <p class="prose-lead">Because readers may use these pages when making decisions about their own money, they should be able to inspect the evidence behind them. Two gaps come first. The dashboard&rsquo;s code is private, so the formulas these pages describe cannot yet be checked against the software that runs them. And nothing here has a track record: the rules were designed, not fitted, and they have not been tested against a benchmark or run with real money in public. This page sorts the main claims by the kind of evidence behind them, says where each can be checked, lists what cannot be checked yet, and keeps a dated record of every correction and every decision.</p>
        <p>${ref('#ledger', 'The claims')} ${ref('#limits', 'The limits')} ${ref('#forward', 'The record')} ${ref('#corrections', 'Corrections')} ${ref('#arithmetic', 'Open arithmetic')} ${ref('#tests', 'Part 1&rsquo;s tests')} ${ref('#review', 'The review questions')}</p>
      </div>
    </header>
${ledger}
${limits}
${forward}
${corrections}
${arithmetic}
${testsTable}
${review}
${disclosures}

  </main>`;

let html = fs.readFileSync(DONOR, 'utf8');
html = html.replace(/<link rel="canonical" href="[^"]*">/, '<link rel="canonical" href="https://docs.acfdashboard.com/evidence">');
html = html.replace(/<title>[\s\S]*?<\/title>/, '<title>Evidence &middot; The Adaptive Convexity Framework</title>');
html = html.replace(
  /<meta name="description" content="[^"]*">/,
  '<meta name="description" content="What these pages can and cannot yet show, every correction, and the tests that would prove the thesis wrong.">',
);
html = html.replace(/<a class="skip-link" href="#[^"]*">/, '<a class="skip-link" href="#ledger">');

// Sidebar: drop the donor's active state and per-page contents, mark Evidence current.
html = html.replace(/\s*<ol class="on-this-page"[\s\S]*?<\/ol>/g, '');
html = html.replace(/\s*<p class="side-movement">Reference<\/p>\s*<ul class="side-parts">[\s\S]*?<\/ul>/, '');
html = html.replace(/ class="side-part current"/g, ' class="side-part"');
html = html.replace(/\s*aria-current="page"/g, '');
const sidebarInsert = `
        <p class="side-movement">Reference</p>
        <ul class="side-parts">
          <li><a class="side-part" href="/framework-in-pictures"><span class="spnum">&middot;</span><span>In Pictures</span></a></li>
          <li><a class="side-part" href="/framework-in-math"><span class="spnum">&middot;</span><span>In Math</span></a></li>
          <li><a class="side-part" href="/glossary"><span class="spnum">&middot;</span><span>Glossary</span></a></li>
          <li>
            <a class="side-part current" href="/evidence" aria-current="page">
              <span class="spnum">&middot;</span><span>Evidence</span>
            </a>
          </li>
        </ul>
      </div>`;
const navEnd = html.indexOf('</nav>', html.indexOf('<nav class="sidebar"'));
const blockEnd = html.lastIndexOf('      </div>', navEnd);
html = html.slice(0, blockEnd) + sidebarInsert + html.slice(blockEnd + '      </div>'.length);

html = html.replace(/<main class="shell-main">[\s\S]*<\/main>/, main);
html = stripSeriesChain(html, 'Evidence build');
html = stampSocialMeta(html, 'evidence');

fs.writeFileSync(OUT, html);
const sections = (main.match(/<section class="section"/g) || []).length;
console.log(`Evidence page built: ${sections} sections, ${WORKED} + ${HISTORY} recomputation checks cited -> public/site-b/evidence.html`);
