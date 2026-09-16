# SEO & Publication Ledger v1

**Status of record for `docs.acfdashboard.com` · reconciled 2026-09-16 against `main` at `97261e3`.**
**Revision 3** — §8 adds the post-promotion verification obligation and the
distinction it turns on: implementation landing on `preview` is not the audit
closing. **Revision 2** corrected three findings on owner review; see §7,
including one of my own conclusions that was reasoned wrongly rather than merely
stated too strongly.

This is a reconciliation, not a fresh audit. It consolidates every publication and
search finding raised across the original sweep, PR #169, the P0 crawler work
(#186), CI enforcement (#187), and the accessibility and performance tranches
(#188, #189, #190, #191) — and re-verifies each against the repository as it
stands today rather than against what a prior report claimed.

Every item is classified **DONE** · **STILL OPEN** · **REJECTED — NOT A DEFECT** ·
**OPTIONAL**. A DONE item names the PR that closed it *and* the regression or
audit that now prevents its return; a closed finding with nothing holding it
closed is not recorded as closed.

A finding is only STILL OPEN if it is a **technical defect with a search
consequence**. Something that merely departs from a widely-repeated SEO
convention, with no duplication, omission or measured harm behind it, is
OPTIONAL — it does not hold closure open. Exactly one item survives that test.

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

**The only technical SEO blocker on this list, and after revision 2 the only item
in this section at all.** Filed but not fixed in #169; re-verified now and
materially worse than that note implies.

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

**Nothing requires these URLs to serve HTML.** Verified, not assumed:

| check | result |
|---|---|
| In-app links to `/part1`…`/part6` | **none** in `src/`, `api/`, or `index.html` |
| References to `Part{N}_*_FINAL.html` | **none** outside `vercel.json` and the repo's own docs |
| Tests asserting the routes | **none** |
| What the app actually renders | `frameworkDocsManifest.ts` → `docs/framework/part-{1..6}.html` — **a different set of files** |

So the duplicate documents exist to serve six public URLs and nothing else.

#### The fix: permanent redirect, and remove the `Disallow`

```
acfdashboard.com/part1 → permanent redirect → docs.acfdashboard.com/part-1-foundation
             …/part2 → permanent redirect → …/part-2-lineage-macro-thesis
             …/part3 → permanent redirect → …/part-3-bitcoin-convexity-backbone
             …/part4 → permanent redirect → …/part-4-tax-architecture-roc-strategy
             …/part5 → permanent redirect → …/part-5-portfolio-construction-position-management
             …/part6 → permanent redirect → …/part-6-convexity-framework-integrity-scoring
```

The requirement is **semantic: a permanent server-side redirect to the final Docs
canonical.** It is deliberately not written as `301`. Vercel's native contract is
`"permanent": true`, which emits **308**, and Google treats 301 and 308 alike as
permanent redirects for canonicalization — so forcing `statusCode: 301` would pin
a transport code the platform does not need and the search engine does not
distinguish. Where an example status helps: **308 on Vercel**.

…and delete the six `Disallow` lines from the dashboard's `robots.txt`, because a
redirect a crawler is forbidden to fetch is not a redirect. `vercel.json` already
carries a `redirects` array, so this is an entry in existing machinery, not new
machinery. The source folder and the `vite.config.ts:322` copy step go with them.

This **eliminates** the duplicate and forwards any accumulated signal to the
canonical page, rather than maintaining two documents and asking crawlers to
reconcile them.

#### Deleting the rewrites without redirecting would be worse than doing nothing

The SPA fallback is:

```
/((?!api|assets|ACF|dist|_next|legacy|data|design-system\.html|favicon\.ico|robots\.txt|manifest\.json).*)  →  /index.html
```

`part1` is **not** in that exclusion list. Remove the six rewrites and `/part1`
matches the fallback and returns `index.html` with **HTTP 200** — a soft 404, the
worst of the three outcomes: no content, no redirect, and no error for anything
to act on. The repo's own `docs/REPO_STRUCTURE.md:141` already warns that the SPA
fallback masks these routes' 404s. **The redirect is what makes retirement safe.**

#### Cross-domain `rel=canonical` — only if the documents must keep being served

If some compatibility requirement not found here means those six documents must
continue to exist at those URLs, then the fix is a cross-domain `rel=canonical`
pointing at the Docs route **plus** removing the `Disallow`. No such requirement
was found, so this is the fallback, not the plan.

#### What must not be done

Do **not** pair `Disallow` with a `rel=canonical` or `X-Robots-Tag: noindex` on
those paths. Every one of those directives lives inside a document the crawler
would first have to fetch, and the `Disallow` forbids the fetch. That is the exact
error class #186 fixed on the Docs side, and it is the reason the current
arrangement cannot work.

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

### 4.4 "No crawlable link from `acfdashboard.com` to the Docs"
**Rejected — not a defect. This was my error, and the reasoning was wrong, not
just the conclusion.** Revision 1 classified the link as non-crawlable because it
is created by React. That is not a valid test: Google renders JavaScript, and an
anchor the framework produced is an anchor.

The correct test is the element's semantics. Inspected, at source and in the
shipped bundle:

| authority | finding |
|---|---|
| `LandingChrome.jsx:42`, `LandingPage.jsx:78` | `const DOCS_URL = 'https://docs.acfdashboard.com'` — a module constant, resolved at build time |
| `LandingChrome.jsx:339`, `:380` | `<a className="landing-nav-link" href={DOCS_URL} target="_blank" rel="noopener noreferrer">` |
| `LandingPage.jsx:1323`, `:1855`, `:1878` | three further `<a href={DOCS_URL}>` — hero, CTA and footer |
| `dist/assets/LandingChrome-*.js` | compiles to `jsxs("a",{className:"landing-nav-link",href:N,target:"_blank",rel:"noopener noreferrer","data-testid":"landing-nav-docs",…})` |
| Bundle scan | **2** compiled `<a>` carrying the docs wording, **0** `<button>`, **0** `nofollow` anywhere |
| `AuthGate.jsx:404` | `LandingPage` is the `!isAuthenticated` branch |

Real anchors, static resolvable `href`, no `nofollow`, no `onClick`-only
navigation, no href created after interaction. **Removed from the tranche.**

*What was not verified here, so this stays falsifiable:* the live anonymous DOM.
This sandbox has no auth backend, so rendering `dist/` produced
`EarlyAccessRequiredScreen` — an authenticated-but-unentitled state — rather than
the landing page. One `view-source` or Rich Result test on the live page settles
it; the bundle evidence above is what this conclusion rests on.

### 4.5 Title and meta-description length
**Rejected as a defect; recorded in §5 as optional editorial work.** Revision 1
scored six titles and seven descriptions against ~60 and ~155 characters. Those
numbers are folklore, not specification: Google states no length limit for
indexing, truncation is query- and device-dependent, and Google rewrites titles
in a large share of results regardless of length.

The defects that *would* be real were tested for, and none is present:

| test | result |
|---|---|
| Duplicate titles | **none** — 11 distinct |
| Duplicate descriptions | **none** — 11 distinct |
| Missing title or description | **none** |
| Non-descriptive titles | none — every unique segment names its own subject (`Part 4 — Tax Architecture and ROC Strategy`, `The Framework in Math`) |
| Long descriptions that break mid-thought at ~155 | **none of the seven** — each reads as a complete proposition, with only a trailing sub-clause beyond the cut |

Example, `/part-6` at 190 characters: *"The two-score execution kernel of the
framework: CIS quantifies position quality, FIS validates construction integrity,
and a weekly workflow turns both me…"* — complete before it is cut.

With no duplication, no omission, no vagueness and no truncation mid-thought,
there is no evidence of a problem to fix. **These do not hold technical SEO
closure open.**

### 4.6 "Internal links leak `.html`"
**Rejected — not a defect.** Raised during the original sweep and disproved on
challenge. Re-verified on `main` today: **975** `href`s across the 11 routes,
**zero** resolving to a `.html` path and **zero** unresolved. Navigation lands on
clean routes.

### 4.7 White chart labels fail contrast
**Rejected — not a defect.** A geometric probe reported ~1.15:1 by measuring the
label against the panel background. Screenshots showed the labels sit on
saturated bars; the probe misattributed them because a two-line label overflows
its bar's box. The light-theme palette defects that *were* real were fixed at the
token authority in #188.

### 4.8 `<lastmod>` in the sitemap
**Rejected as hand-authored**, deliberately, in #169: a hardcoded date rots
silently and a wrong one is worse than an absent one. A *derived* `lastmod` from
git history would not rot and remains available if the owner wants freshness
signalling — but Google treats `lastmod` as a hint it ignores when it proves
unreliable, so the upside is small.

---

## 5. OPTIONAL — editorial, operational, or deferred

**Nothing in this section blocks technical SEO closure.** Each is a choice about
craft or operations, not a defect, and the audit closes whether or not any of
them is ever done.

### 5.1 Editorial
| Item | Note |
|---|---|
| Six titles run 66–90 characters | Not a defect (§4.5). If the owner prefers tighter SERP display, the lever is the shared 34-character suffix `· The Adaptive Convexity Framework`, and one rule should govern all six rather than six judgements. |
| Seven descriptions run 169–232 characters | Not a defect (§4.5). All seven already stand alone at 155 characters. Rewriting is a style preference. |
| `/part-1-pictures` description at 87 characters | Short, not truncated. May be under-selling the page. |
| Byline and dates | §4.3 — a *design* question about reader credibility. If the pages should show an author, design that first and let metadata follow. Never the reverse. |

### 5.2 Structured data
| Item | Note |
|---|---|
| `BreadcrumbList` | The only schema here that visibly changes a result — a breadcrumb trail in place of the URL line. Worth doing **if** generated from the navigation registry with a `--check` twin, like every other generated artefact. Optional. |
| `Article` / `TechArticle` | §4.1 — declined unless derived. |
| `DefinedTerm` ×109 | §4.2 — declined outright. |

### 5.3 Operational
| Item | Note |
|---|---|
| Search Console verification | No token in any page head. Not a change to the site; it is the instrument by which any of the above could be *measured* rather than argued. If this property is to be run rather than merely published, this is the first thing to do — and it is what would turn §5.1 from opinion into evidence. |
| Raw `/site-b/**.html` fetchable | Correct by design: the noindex must be readable. No evidence of them being indexed. Recheck once the property has been crawled for a while — which requires §5.3 above. |

---

## 6. Where this leaves the audit

### 6.1 What is closed in the repositories

> Repository-closed, not production-verified. See **§8** — the redirect retirement
> still owes a production smoke test before the audit itself closes.
The **publication plumbing**. A compliant crawler can fetch every resource the
eleven pages need, renders the real documents, is told exactly which URLs are
canonical, is given a sitemap derived from those same canonicals, and is kept out
of the API. Duplicate suppression for the raw documents sits in one mechanism the
crawler can actually read. Social cards resolve and are indexable. Metadata is
complete, unique and descriptive on all eleven routes. Internal linking is clean:
975 `href`s, zero exposing `.html`, zero unresolved. The dashboard's links to
this site are genuine crawlable anchors.

None of it can silently regress: eight crawler-contract tests, four `--check`
audits, a generator-drift gate, and a required CI check stand behind it.

Page experience is closed too — the two largest blocking costs on first load are
down 98% and 70%.

### 6.2 The minimum material SEO tranche

**One item.**

> **Retire `/part1`…`/part6` on `acfdashboard.com` by permanent redirect to the
> corresponding Docs route, and delete the six `Disallow` lines that would
> otherwise prevent the redirect from being followed.**

That is the whole of the remaining technical work. It is a cross-repo change
against `ACFDashboard`'s `preview`, touching `vercel.json` (six `redirects`
entries), `public/robots.txt` (remove six lines), the root document folder, and
the `vite.config.ts:322` copy step — with a regression asserting the six paths
redirect rather than serving a document or a soft 200.

Revision 1 listed four items. Two were not defects (§4.4, §4.5) and one is
optional polish (§5.2). **`docs.acfdashboard.com` itself needs no further SEO
work**; the one remaining item is in the other repository.

### 6.3 Decisions that are the owner's, not mine
1. **Do the redirects now, or after beta?** It is the only material item, and it
   touches production routing on the dashboard.
2. **Search Console** (§5.3) — run the property, or publish and leave it? Nothing
   in §5.1 can be settled by argument; only measurement settles it.
3. **Breadcrumb schema** (§5.2) — worth the generator, or not?
4. **Byline and dates** (§4.3) — a design question about credibility, not SEO.

---

## 7. Revision history

**Revision 2 — 2026-09-16, on owner review.** Three corrections, all of which
*reduced* the remaining work:

1. **§4.4 — the Dashboard→Docs link was wrongly classified.** I called it
   non-crawlable because React renders it. That is not a valid test; Google
   renders JavaScript. Re-inspected at source and in the shipped bundle: five
   genuine `<a href>` elements with a static module-constant URL, no `nofollow`,
   no button impersonation. Moved to REJECTED and removed from the tranche. The
   exact markup and bundle string are recorded so the reversal is checkable.
2. **§4.5 — character counts were treated as thresholds.** ~60 for titles and
   ~155 for descriptions are folklore, not specification. Re-tested against the
   defects that would be real — duplication, omission, vagueness, mid-thought
   truncation — and found none. Moved to OPTIONAL EDITORIAL.
3. **§3.1 — the recommendation was not sharp enough.** Established that nothing
   requires those six URLs to serve HTML, so the answer is a **permanent
   server-side redirect** that eliminates the duplicate, not a canonical that
   maintains it. Also found
   that deleting the rewrites *without* redirecting would return HTTP 200 via the
   SPA fallback — a soft 404, worse than either alternative.

Net effect: the remaining tranche went from four items to one, and the one that
remains is not in this repository.

**Revision 3 — 2026-09-16, after the dashboard change landed.** One status line
in §8: [#5421](https://github.com/Tataku/ACFDashboard/pull/5421) merged to
`preview` as `39a4828`. Nothing else changed — the obligation stands and the
audit is still not closed.

---

## 8. Post-promotion verification obligation — **OPEN**

**The audit is NOT closed.** `ACFDashboard` [#5421](https://github.com/Tataku/ACFDashboard/pull/5421)
retires `/part1`…`/part6` by permanent redirect, and landing it closes the SEO
**implementation on `preview`**. Production SEO is not operationally closed until
the normal promotion lane deploys that change and the redirects are smoke-tested
**on production**.

**Status 2026-09-16 — #5421 has landed on `preview`.** Merged as
[`39a4828`](https://github.com/Tataku/ACFDashboard/commit/39a48288143981941819694aaa38ad41c7428cec)
by owner instruction; the dashboard queue's Backlog line for the duplicates is
retired. **Not promoted, and none of the checks below has run** — the status of
this section is unchanged.

The distinction is not pedantry: the change is routing configuration, and nothing
in this repository or that one observes what the production edge actually serves.
Every check below was impossible to run before merge — Vercel produced no Preview
deployment for #5421 (`Ignored`, by that project's cost-control policy), so there
was no runtime surface to test. That is an environment limitation, not a defect
in the change, and it is the reason this obligation exists rather than a test.

**Required on production, after promotion:**

| # | check |
|---|---|
| 1 | each of the six legacy routes returns a **permanent** redirect (308 on Vercel; 301 equally acceptable) |
| 2 | the `Location` is exactly the target below — no trailing-slash or case drift |
| 3 | no avoidable intermediate hop (one redirect, not a chain) |
| 4 | each destination Docs route returns successfully |
| 5 | `/`, the auth entry, and one authenticated app route are unaffected — the point is proving this routing change did not disturb the broad SPA fallback |

```
/part1 → https://docs.acfdashboard.com/part-1-foundation
/part2 → https://docs.acfdashboard.com/part-2-lineage-macro-thesis
/part3 → https://docs.acfdashboard.com/part-3-bitcoin-convexity-backbone
/part4 → https://docs.acfdashboard.com/part-4-tax-architecture-roc-strategy
/part5 → https://docs.acfdashboard.com/part-5-portfolio-construction-position-management
/part6 → https://docs.acfdashboard.com/part-6-convexity-framework-integrity-scoring
```

```bash
# 1-3: status, Location, and hop count for each legacy route
for n in 1 2 3 4 5 6; do
  curl -sSI "https://acfdashboard.com/part$n" | awk 'NR==1 || /^[Ll]ocation:/'
  curl -sS -o /dev/null -w "  hops=%{num_redirects} final=%{http_code}\n" -L "https://acfdashboard.com/part$n"
done

# 4: the destinations themselves
for s in part-1-foundation part-2-lineage-macro-thesis part-3-bitcoin-convexity-backbone \
         part-4-tax-architecture-roc-strategy part-5-portfolio-construction-position-management \
         part-6-convexity-framework-integrity-scoring; do
  curl -sS -o /dev/null -w "$s %{http_code}\n" "https://docs.acfdashboard.com/$s"
done

# 5: the SPA was not disturbed
curl -sS -o /dev/null -w "/ %{http_code}\n" https://acfdashboard.com/
```

**When all five pass, the technical SEO audit is CLOSED** and this section is
replaced by the date and the result. Until then its status is
**implementation complete, verification outstanding** — which is not the same
thing, and the ledger should not be read as if it were.

---

*Reconciled against `main` at `97261e3`. Sources: the original publication sweep;
PR #169 (robots + sitemap, derived); #186 (crawler contract); #187 (blocking CI);
#188 (accessibility, Share control); #190 (glossary runtime); #191 (font
payload). Figures re-measured from the repositories on 2026-09-16, not carried
forward from earlier reports.*
