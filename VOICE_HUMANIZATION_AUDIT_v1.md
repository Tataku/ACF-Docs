# Voice Humanization Audit & Soften Pass — Parts 1–6 · v1.0

> **Mission (owner, 2026-07-26):** audit the six-part book for humanization — find Dale's
> voice, promote it to primary, soften AI-obvious language — without losing the
> professionalism gained. Identification first; implementation approved with taste calls
> and guardrails (see §5).
> **Branch:** `claude/framework-docs-quality-audit-qh3yp0` (restarted from merged `main`).
> **Evidence base:** the deleted pre-Site-B MDX recovered from git history (`80beff6^`),
> the app-side `Part*_FINAL.html` set, `chaz-automation/SOUL.md`, and the owner's own
> review prose. Stylometry scripts + lost-sentence bank preserved in session records.

## 1. Headline finding — sentence survival of the owner's text

| Part | Kept | Reworked | Gone | Note |
|---|---|---|---|---|
| P1 | 87% | 8% | 5% | The voice benchmark — owner-calibrated text survived conversion |
| P2 | 32% | 30% | 39% | Condensed faithfully; lost lines are informational, not voiced |
| P3 | 5% | 12% | 83% | 8,200 → 2,900 words; competent agency prose, few owner sentences — **separate decision gate (§6)** |
| P4 | 2% | 13% | 85% | Most-altered part; questions 6 → 0, flourishes cut |
| P5 | 22% | 27% | 51% | Humanization rounds helped; second person collapsed 10× |
| P6 | 23% | 33% | 44% | Doubled in length; additions machine-authored (structure owner-endorsed) |

## 2. The voice fingerprint (evidence-derived)

Direct address and Q&A pedagogy · stakes language ("generational wealth") ·
definition-by-negation ("This is not X — it is Y") · compression glyphs (→, =, >,
telegraphic recaps) · concreteness (figures, ages, case studies) · occasional
contractions and asides · epigraph + punchline · imperatives ("Consider the
mathematics."). Heavy em-dashes are native to the owner and were excluded from the
tell list.

## 3. AI-tell census (pre-soften → post-soften)

| Signal | P4 | P5 | P6 |
|---|---|---|---|
| Direct questions | 0 → 3 | 4 → 4 | 3 → 4 |
| you/your per 1k words | 1.11 → 1.36 | 0.17 → 0.88 | 0.28 → 0.28 (not forced) |
| Sentences opening "The " | 21.5% → 20.9% | 18.7% → 16.4% | 25.9% → 22.4%¹ |
| Tour-guide narrator lines | 3 → 2² | 12 → 1³ | 2 → 0 |
| Hedge density per 1k | 10.0 → 9.2 | 3.3 → 3.3 | 2.8 → 2.8 |

¹ Remaining "The-" openers include review-round-locked doctrine strings and deliberate
anaphora (the CIS-pass/FIS-pass pair); not gamed further per the owner guardrail.
² Kept: "That is the map." (telegraph, functional) and "risks worth naming before
leaning on it" (earns its place). ³ Kept: the Part 5 opening exhibit line with "Watch
what climbs" — the one narrator move that teaches.

## 4. What was restored / softened, by slice

**S1 — Part 4 (11 edits):** the ninth-wonder line in the owner's approved formulation
("Compound interest has been called the eighth wonder of the world. Tax-free compound
interest is the ninth.") + "Consider the mathematics." · the engineering question
("once convexity is selected, how do you preserve it?") with its Part 3 link-back ·
"generational wealth" in the two strongest locations only (opening stakes sentence;
closing bookend, with the owner's "mediocre" restored) · "This is not traditional tax
optimization…" negation · the Roth optionality passage with interrogative
parentheticals ("when will capital be needed?") · the compact Roth case study
(callout-insight, calibrated: hypothetical path, illustration-only, no tickers) ·
NIIT/RMD first-use-then-abbreviate policy · hedge-stack tightened ("often 15 to 35
percent or more…").

**S2 — Part 5 (18 edits):** second person restored where it was stripped ("violating
them means **you** are no longer implementing ACF" · "If **you** cannot identify
sustainable business improvement, **it's** Hype" · "hands you a forced choice" · "a
structural shift **you believe** is real, durable, and capital-backed") · the owner's
speculation line restored over the AI elaboration ("The difference between speculation
and gambling is governance: …") · eleven tour-guide narrator lines compressed to their
functional cores ("Three gates decide how much capital a thesis is permitted to
carry.") · "Run the arithmetic once at full scale." imperative · duplicate
"explicitly permitted" clause deduped.

**S3 — Part 6 (11 edits):** five flat "The-" openers rewritten; one earned question
added ("Why clamp at all?") · the owner's telegraph restored ("Fix the penalty →
recover the points.") · the aphorism pair thinned (kept "a score built by subtraction
indicts"; cut the glib setup half) · the End-of-Part recap returned to the owner's
telegraphic structure (What CIS does / What FIS does / What to do weekly) with the
closing operating-system sentence kept · "That settles…" meta-glue trimmed · one
adverb tic removed.

**S4 — P1 (1 edit):** the reconciliation-era sizing clause re-voiced ("wrapper
placement decides how much of it you keep"). The review-round doctrine strings in P1
step 4 are untouched. **P2: verified clean — zero edits** (its lost lines are
informational, not voiced).

Reading-time labels re-synced from one uniform count (main-text words / 235):
18 / 12 / 12 / 13 / 24 / 15.

## 5. Guardrails held (verified)

Doctrine-guard grep green: the band-semantics strings ("The score selects the
posture-specific sizing band", "Sub-core conviction", "a band boundary, not an action
trigger", "CIS below 50 removes allocation eligibility", "18% absolute maximum with
documented override") all present and byte-identical; banned binary vocabulary still
zero. Pull-quotes untouched. Tax/legal hedges and Scope callouts untouched. Glossary
contract, anchors, chart mounts, and specs untouched (no bundle rebuild required).
Navigation audit green (8 pages · 182 anchors · 28 terms · zero warnings). Rendered
verification: every restored string present on the live routes, zero page errors.
Stylometry treated as evidence: P6's residual opener count and P5/P6 hedge densities
left as-is rather than gamed.

## 6. Part 3 decision gate (owner call — no edits made)

P3 lost 83% of the owner's sentences but the compression itself was sanctioned and the
replacement register is low-tell. Four high-leverage restoration options, smallest
first:

1. **The "wins" pair** — restore "Maximum exposure wins in ideal conditions.
   Structured architecture wins across uncertain conditions." as the landing of the
   survivability section (currently a hedged 33-word sentence carries this idea).
2. **The 2024–2025 regime-shift paragraph** — the End-of-Part transition still cites
   "regime-shift validation from the 2024–2025 cycle," but the section delivering it
   was cut. One calibrated paragraph restores the referent (the original is already
   compressed and hedged; near-verbatim restoration is safe).
3. **The models line** — "The models influence accumulation pacing, not exit
   decisions." as a cap to the convergence passage (tighter than the current phrasing).
4. **The conditions caution** — "These percentages describe outcomes under given
   conditions, not rebalanced targets." appended to the reserve-sizing paragraph.

Recommendation: 1 + 2 (highest voice-and-continuity yield), 3 as a tightening, 4
optional. Awaiting selection before any P3 edit.
