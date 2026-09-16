# SEO & Publication Ledger v1

**Status of record for `docs.acfdashboard.com` · reconciled 2026-09-16 against `main` at `97261e3`.**

This is a reconciliation, not a fresh audit. It consolidates every publication and
search finding raised across the original sweep, PR #169, the P0 crawler work
(#186), CI enforcement (#187), and the accessibility and performance tranches
(#188, #189, #190, #191) — and re-verifies each against the repository as it
stands today rather than against what a prior report claimed.

Every item is classified **DONE** · **STILL OPEN** · **REJECTED — NOT A DEFECT** ·
**DEFERRED**. A DONE item names the PR that closed it *and* the regression or
audit that now prevents its return; a closed finding with nothing holding it
closed is recorded as DEFERRED instead, because that is what it is.

**A word on method.** Several items below are things an SEO checklist would tell
you to add. A checklist cannot tell you whether a thing is worth its maintenance
cost on *this* property, and some of the most commonly recommended additions are
either inert for documentation or actively become a second source of truth that
rots. Where that is the case it is said plainly, with the reasoning, rather than
scored as a gap.

---

## 1. The property

Eleven hand-authored static pages under `public/site-b/`, served at clean routes
by `beforeFiles` rewrites in `next.config.mjs`. Next.js exists for those rewrites
and for `/api/narration`; there is no framework routing to reason about.

| | |
|---|---|
| Indexable routes | 11 |
| Canonical declared | 11 / 11, each equal to the route that serves it |
| `og:*` + `twitter:*` | 11 / 11 complete, with a per-page social card that exists on disk |
| Internal `href`s | 975 across the 11 routes — **0** expose `.html`, **0** unresolved |
| Structured data | **0 pages** |
| Sitemap | 11 `<loc>`, matching the routes exactly |

---

## 2. DONE — closed, with something holding it closed

### 2.1 The site had no crawler policy at all
**Closed by #169.** Neither `robots.txt` nor `sitemap.xml` existed. Both are now
**derived** from the pages' own canonicals and the rewrite table, never
hand-authored — the sitemap is a list of canonical URLs, and typing that list a
second time is the duplicate-source-of-truth the generator pipeline exists to
prevent.

*Protected by:* `npm run audit:crawler` (`scripts/build-crawler-files.mjs --check`)
in the `prebuild` chain, plus the generator-drift gate in CI. A canonical that
disagrees with the route serving it is a hard error naming both sides; so is a
page routed but absent from the social-card config, in either direction.

### 2.2 `robots.txt` blocked the render path — the highest-impact defect found
**Closed by #186.** `Disallow: /site-b/` was described in the generator as
"belt and braces" alongside the `X-Robots-Tag: noindex` header. It was the
opposite, in two independent ways:

1. A header can only be read by a crawler permitted to fetch the document
   carrying it. Disallowing the path did not reinforce the noindex — it
   guaranteed the noindex would never be seen, which is the case Google
   documents as leaving a URL eligible for indexing from external links alone.
2. The same line covered every resource the canonical pages need: stylesheets,
   scripts, fonts, the JSON the runtime reads, and the social cards named by
   `og:image`.

Measured as a compliant crawler saw it: `/framework-in-pictures` retained **585
of its 9,110 words**, a part page lost **30%**, every page fell back to Times New
Roman, and **no chart exhibit drew at all**.

The clean routes are the indexable surface; duplicate suppression for the raw
`/site-b/**.html` documents is owned by exactly one mechanism, the
`X-Robots-Tag: noindex` header, whose `source` was narrowed to
`/site-b/:path*.html` so it stops covering assets.

*Protected by:* `tests/crawler-contract.test.mjs` — 8 tests that evaluate the
real `robots.txt` under RFC 9309 longest-match rules and match paths through
Next's own route matcher rather than a re-implementation. Named assertions
include *"robots.txt never re-acquires a rule that hides the render path"* and
*"nothing a page needs is refused, so a compliant crawler renders the real
document."*

### 2.3 Social preview images were unreachable
**Closed by #186**, same root cause as 2.2 — `og:image` points under `/site-b/`,
which the old rule disallowed. The cards were being advertised and refused in the
same breath. All 11 now resolve to files that exist and are fetchable, and carry
no noindex, so they stay eligible for image indexing.

*Protected by:* `audit:social` (`build-social-meta.mjs --check`) for generation,
and crawler-contract test 3 for reachability.

### 2.4 None of this was enforced
**Closed by #187.** Before it, nothing ran on a pull request. CI now runs the
full node suite, every `audit:*` script **discovered from `package.json` at run
time** (so a new audit is covered the day it is registered, with no second
hand-maintained list), the generator-drift gate, and the build. The job is named
`Tests, audits, generator drift, build` and is enforced as a required check on
`main`.

### 2.5 The Share control was dead
**Closed by #188.** A visible control that did nothing — a distribution defect as
much as an accessibility one, since sharing is how documentation propagates.

*Protected by:* `tests/hidden-controls.test.mjs`.

### 2.6 Page weight and blocking work on first load
Page experience is a real ranking input and these were large:

| | before | after | PR |
|---|---|---|---|
| Glossary tagger, `/glossary` | 1,060 ms, 314,901 node visits | 20 ms, one pass | #190 |
| Fonts per part page | 1,002,614 B | 296,885 B | #191 |
| Median to `document.fonts.ready` | 3,865 ms | 2,489 ms | #191 |

*Protected by:* `tests/glossary-tagger.test.mjs`, `tests/font-corpus.test.mjs`,
`npm run audit:fonts`.

---

## 3. STILL OPEN

### 3.1 — **Duplicate Framework content served from the dashboard origin**
**The one finding on this list that plausibly costs traffic today.** Filed but not
fixed in #169; re-verified now and materially worse than the earlier note
implies.

`ACFDashboard/vercel.json` rewrites `/part1` … `/part6` to six standalone
documents. They are tracked at the dashboard repo root and copied into `dist/`
by `vite.config.ts`, so they **are** deployed and served.

| | |
|---|---|
| Duplicate documents | 6 |
| Duplicate words | **28,913** |
| `rel=canonical` on them | **none** |
| `<meta name="robots">` on them | **none** |
| Mitigation in place | `Disallow: /part1` … `/part6` in the dashboard's `robots.txt` |

The mitigation has **the exact defect #186 corrected on this side of the fence**.
A `Disallow` does not de-index: Google documents that a disallowed URL remains
eligible for indexing from external links, shown URL-only without a description.
And because the crawler is forbidden to fetch the document, a `rel=canonical` or
`X-Robots-Tag: noindex` added to those files could never be read. The current
arrangement is therefore the one configuration in which the duplicate cannot be
*corrected*, only hidden from the crawler that would have honoured the
correction.

Three fixes, in descending order of merit:

1. **Retire the rewrites.** The app does not read these files — it renders the
   Parts from `frameworkDocsManifest.ts` — so nothing in-product depends on
   them. This deletes the duplicate rather than annotating it.
2. **Allow crawling and serve `X-Robots-Tag: noindex`** on those six paths. The
   header is then actually readable, which is the whole lesson of #186.
3. **Allow crawling and add `rel=canonical` → `docs.acfdashboard.com/part-N-…`.**
   Consolidates any accumulated signal onto this site rather than discarding it.

**This is a change to `Tataku/ACFDashboard`, not this repo,** and lands under
that repo's `preview` branch policy.

### 3.2 — No crawlable link from `acfdashboard.com` to `docs.acfdashboard.com`
The dashboard's only indexable document is its static `index.html`, which
contains **zero** occurrences of `docs.acfdashboard.com`. The link exists only in
`LandingPage.jsx`, which is client-rendered.

So the two properties are not connected for a crawler: docs discovery rests
entirely on the sitemap and on external links, and the dashboard's landing page
passes no signal to the documentation it is the marketing front for. A single
crawlable anchor in the static shell would fix it. Also a dashboard-side change.

### 3.3 — Six titles truncate in results
Rendered length, after entity decoding:

| chars | route |
|---|---|
| 90 | `/part-5-portfolio-construction-position-management` |
| 85 | `/part-6-convexity-framework-integrity-scoring` |
| 77 | `/part-4-tax-architecture-roc-strategy` |
| 71 | `/part-3-bitcoin-convexity-backbone` |
| 67 | `/part-1-foundation` |
| 66 | `/part-2-lineage-macro-thesis` |

Google truncates around 60. The suffix `· The Adaptive Convexity Framework` is 34
of those characters, so on the longest two the brand is all a reader sees past
the fold. This is observable behaviour, not a scoring heuristic. **Editorial
decision, §6.1.**

### 3.4 — Seven descriptions truncate
193, 229, 221, 190, 171, 169 and 232 rendered characters against a display limit
near 160. Descriptions are not a ranking input; they are the copy that earns the
click, and past ~160 characters that copy is simply not shown. Worth correcting
only where the first 155 characters do not already stand alone as a complete
proposition — which is a reading task, not a counting one. **Editorial decision,
§6.1.**

### 3.5 — No structured data anywhere
Zero `application/ld+json` on any page. Treated below with the scepticism the
owner asked for rather than as a single gap; see §4.1–§4.3 for the parts of this
that are **not** worth doing, and §6 for the part that is.

---

## 4. REJECTED — not a defect, or not worth its cost

### 4.1 `Article` / `TechArticle` JSON-LD
**Rejected as currently framed.** Article markup produces no rich result for
ordinary documentation; its visible effect is confined to publisher programmes
this property is not in. Hand-authoring `headline`, `description` and `image`
into JSON-LD would duplicate three fields that already exist in the head, in a
place no test reads, which is the second-source-of-truth failure this repo's
generator discipline exists to prevent.

*Reconsider only if derived.* If it is ever added, it must be generated from the
page's own `<title>`, description and canonical by a `build:*` script with a
`--check` twin, exactly as the sitemap is. That is a real option, not an
objection — but it is not justified by the marginal search benefit alone.

### 4.2 `DefinedTermSet` / `DefinedTerm` for the 109 glossary entries
**Rejected.** There is no rich result for `DefinedTerm` in general web search.
This would add 109 structured records, and a second definition of every term
beside the one in `acf-glossary.json`, for no observable outcome. The glossary
page is already indexable, already carries its definitions as visible prose, and
is already reachable from every part page.

### 4.3 `author`, `datePublished`, `dateModified`
**Rejected as a checklist item; available as an editorial choice.** None of the
three is a ranking input. A visible date on a framework document is an editorial
decision with a real downside — a 2026 date on a page a reader finds in 2027
reads as stale whether or not the content aged — and `dateModified` in
particular is a field that rots silently unless derived from git, which is
machinery for a benefit nobody has stated.

If the owner wants an author byline for credibility, that is a *design* decision
about the page, and the metadata should follow it rather than lead it.

### 4.4 "Internal links leak `.html`"
**Rejected — not a defect.** Raised during the original sweep and disproved on
challenge. Re-verified on `main` today: **975** `href`s across the 11 routes,
**zero** resolving to a `.html` path and **zero** unresolved. Navigation lands on
clean routes.

### 4.5 White chart labels fail contrast
**Rejected — not a defect.** A geometric probe reported ~1.15:1 by measuring the
label against the panel background. Screenshots showed the labels sit on
saturated bars; the probe misattributed them because a two-line label overflows
its bar's box. The light-theme palette defects that *were* real were fixed at the
token authority in #188.

### 4.6 `<lastmod>` in the sitemap
**Rejected as hand-authored**, deliberately, in #169: a hardcoded date rots
silently and a wrong one is worse than an absent one. A *derived* `lastmod` from
git history would not rot and remains available if the owner wants freshness
signalling — but Google treats `lastmod` as a hint it ignores when it proves
unreliable, so the upside is small.

---

## 5. DEFERRED

| Item | Why it is deferred, not rejected |
|---|---|
| `BreadcrumbList` JSON-LD | The only structured data on this list with an *observable* SERP effect: a breadcrumb trail replaces the URL line. The site has a genuine two-level hierarchy. Deferred only because it should be generated from the navigation registry, not typed by hand. See §6. |
| Raw `/site-b/**.html` reachable | Correct by design — the noindex must be readable — but it means the raw documents are fetchable URLs. No evidence of them being indexed; recheck once the property has been crawled for a while. |
| `/part-1-pictures` description at 87 chars | Short rather than truncated. Not wrong; may be under-selling the page. Editorial. |
| Search Console / verification | No verification token in any page head. Not a defect until someone intends to operate the property day to day; it is how the above would be *measured* rather than a change to the site. |

---

## 6. Where this leaves the audit

### 6.1 What is fully closed
The **publication plumbing**. A compliant crawler can fetch every resource the
eleven pages need, renders the real documents, is told exactly which URLs are
canonical, is given a sitemap derived from those same canonicals, and is kept out
of the API. Duplicate suppression for the raw documents sits in one mechanism
that the crawler can actually read. Social cards resolve and are indexable. None
of that can silently regress: eight crawler-contract tests, four `--check`
audits, a generator-drift gate, and a required CI check stand behind it.

Page experience is also closed for now: the two largest blocking costs on first
load — the glossary tagger and the font payload — are down 98% and 70%
respectively.

### 6.2 What genuinely remains
Exactly two things carry real search consequence, and **neither is in this
repository**:

1. **§3.1** — 28,913 words of duplicate Framework content served from
   `acfdashboard.com`, canonicalised nowhere, "protected" by a `Disallow` that
   cannot de-index and that blocks the only fixes that would.
2. **§3.2** — no crawlable link from the dashboard's one indexable page to this
   documentation site.

Everything else remaining is either editorial (§3.3, §3.4) or deliberately
declined (§4).

### 6.3 The smallest coherent tranche that closes this audit
Four items, in this order. This is the whole list — there is no fifth.

1. **Retire or canonicalise `/part1`…`/part6`** in `ACFDashboard` (§3.1).
   Preference: retire the rewrites; the app does not use those files. If they
   are kept, allow crawling and serve `X-Robots-Tag: noindex`, because a
   directive nobody may fetch is not a directive. Needs a cross-repo PR against
   `preview` and a regression in that repo's suite asserting the six paths do
   not serve an uncanonicalised duplicate.
2. **Add one crawlable anchor** to the dashboard's static `index.html` pointing
   at `docs.acfdashboard.com` (§3.2). One line, same PR as item 1.
3. **Shorten the six over-length titles** (§3.3), by trimming or dropping the
   34-character brand suffix on the longest. Mechanical once the owner picks the
   rule; enforceable afterwards by a length assertion in the existing suite.
4. **Generate `BreadcrumbList` JSON-LD** from the navigation registry (§5), with
   a `build:*` / `audit:*` pair like every other generated artefact. The only
   structured data on this list that changes what a reader sees.

Items 1–2 are the ones with traffic consequences. Items 3–4 are polish and can be
dropped without leaving the audit open.

### 6.4 Owner / editorial decisions required
1. **The title rule** (§3.3). Drop the brand suffix on long titles, shorten the
   part names, or accept truncation? Affects six pages and wants one rule, not
   six judgements.
2. **Descriptions** (§3.4). Are the first ~155 characters of the seven long ones
   already complete propositions? If yes, nothing to do. A reading task.
3. **Byline and dates** (§4.3). Not an SEO question. Do these documents want a
   visible author and date for reader credibility? If yes, design first and let
   the metadata follow.
4. **Search Console** (§5). Is this property going to be operated and measured,
   or published and left? Nothing above can be *confirmed* in the wild without
   it.

---

*Reconciled against `main` at `97261e3`. Sources: the original publication sweep;
PR #169 (robots + sitemap, derived); #186 (crawler contract); #187 (blocking CI);
#188 (accessibility, Share control); #190 (glossary runtime); #191 (font
payload). Figures re-measured from the repository on 2026-09-16, not carried
forward from earlier reports.*
