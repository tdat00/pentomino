# difficulty-v3: clarifications for the plan author

Status: **answered, 2026-11-12** by the plan author (claude-fable-5-2); the disputed rows were decided by the owner on the command line. Summary of the decisions: part E at the end of this file. Questions raised by the two analysts who reviewed `docs/difficulty-v3/plan.md`
against the code (branch `rating-v3`, commit `77e62cb`), for the plan's author (claude-fable-5-2) to check and
answer. The owner confirms the answers before they become decisions.

- Analyst SA2 (gpt-6-astra): `docs/difficulty-v3/gpt-6-astra/1-report.md` (questions in its section 5.2).
- Analyst SA1 (claude-opus-5.5): `docs/difficulty-v3/claude-opus-5.5/1-report.md` (questions in its section 5.2).

Fixed and not open: the decisions of plan section 1.3 (model change `difficulty-v3`; a fully forced puzzle caps
at Normal; several solutions lower the score, uniqueness default stays `any`; band edges frozen), the full scope
P0-P4, and the APPROVAL GATE runs (pre-approved by the owner; the task that needs a gate runs it).

How to answer: under each question, fill **Answer** with the chosen option (or your own) and a short reason.
If a question rests on a wrong reading of the plan or of the code, say so in the answer. The status table below
says which questions are still disputed between the analysts. Part D lists the analysts' corrections to the plan
itself; mark any you disagree with.

---

## Status after the joint report check (2026-11-12 09:50)

The co-signed joint report is `docs/difficulty-v3/report-detailed.md` (lead SA1, checked by SA2 in
`docs/difficulty-v3/gpt-6-astra/4-check-of-joint-report.md`; all 13 required changes applied). Please review it
together with this file. Each PENDING item of the report names its branches and the question below that decides it.
The responses that led here are `docs/difficulty-v3/claude-opus-5.5/3-response-to-review.md` and
`docs/difficulty-v3/gpt-6-astra/3-response-to-review.md`. Answer the **disputed** rows first. For an **agreed** row a
one-word confirmation is enough. Rows marked "for the plan author" are author or implementer contracts rather than
owner policy. New questions are in part C.

| Question | SA1 final position | SA2 final position | Status |
|---|---|---|---|
| SA1-Q-P1 decisive guesses | B: decisive guesses; an unfinished census publishes a decisive upper estimate | prototype B first (MP05), measure (MP06), then choose B or B' (unfinished census = unrateable) with an explicit policy | **disputed: A / B / B' / C, see the revised question** |
| SA2-Q-P02 cap hit before the first solution | saturated "+" rating; G and information from the current search path at the cap; cap-hit statistics | incomplete and unrateable; the candidate is skipped; any estimate needs its own named contract | **disputed** |
| SA2-Q-P03 / SA1-Q-P6 identical shapes | (c) raw per-piece counts; limitation documented (generated sets never have twins) | (b) interchangeable copies collapsed for difficulty; raw DLX certificates kept | **disputed** |
| SA2-Q-P01 base max | 12 | 12; the forced bound is "≤ 16" (not SA1's "≤ 16.5") | agreed: (a), base + rule ≤ 16 |
| SA2-Q-P13 rule bonus | hardest deduction tier used | the same | agreed: (a) |
| SA2-Q-P12 R4 cell-to-cell | piece / cell R4 and R5 only (changed in response) | the same | agreed: (a) |
| SA2-Q-P04 centre search | real centre, stop in the central half, 48-profile reserve | the same (integer centre withdrawn) | agreed, for the plan author to confirm |
| SA2-Q-P05 / SA1-Q-P5 weighted sampling | skip | uniform | agreed: skip |
| SA2-Q-P06 search orders | one canonical order; probe data decide the plan's median trigger | one canonical order; report the measured column tie spread; no silent median | agreed: (a) |
| SA2-Q-P07 / SA1-Q-P3 codes | summary codes (`model`, `score`, `level`, `saturated`); full metrics in packs | the same, with a coordinated optional-metrics claim schema | agreed: summary codes |
| v3 metrics size | ≤ 4,096 bytes | ≤ 4,096 UTF-8 bytes and depth ≤ 8 (`core/engine/pack.js:40-41, 802-811`) | agreed |
| SA2-Q-P08 / SA1-Q-P2 old v2 ratings | re-rate for display with a note; stored claim untouched | the same, print captions consistent | agreed: (a) |
| SA2-Q-P09 calibration freedoms | knobs, `K60`, `SHARES` and caps may change within the plan's criteria; changes recorded | fit within the stated invariants, ranges recorded; a new estimator, aggregation or carving redesign is not authorised by this | for the plan author |
| PROC-P1 when the knobs are fitted | first fit before activation, locked before P4, final regression after replay | the same | agreed: (a) |
| SA2-Q-P10 / SA1-Q-P4 provenance | `generation.made` map, SA2's record content | the same, with typed internal origin and explicit availability | agreed: `generation.made`; the skip encoding is AUTH-P1 |
| AUTH-P1 (part C) skip encoding | (a) capped integer lists with `'overflow'` | either | **for the plan author** |
| JR-P4 (new, part C) scheduling of display re-rating and replay requests | (a) auxiliary method on the existing client / pool | either, decided before MP10 | **for the plan author** |
| SA2-Q-P11 optional Player hints | leave out | leave out (owner confirms the scope) | agreed: (a) |
| JR-P1 (new, part C) which old claims are re-rated | v2 and v1 | v2 only, as the plan says; adding v1 is a reasonable explicit extension; puzzles without a claim are a separate new branch | **disputed (minor), for the plan author** |
| JR-P2 (new, part C) immutable set origin | new `generation.setOrigin` | the same (existing keys plus immutable set versions could work if specified) | agreed: (a) |
| JR-P3 (new, part C) knob ranges for the fit | ranges in part C | candidate experimental ranges; to be approved before production values are chosen | **for the plan author** |
| Task order | one developer per repository, sequential | the same; timing runs never in parallel on this machine | agreed |

---

## Part A: questions from SA2 (gpt-6-astra)

### SA2-Q-P01: which base formula?

Context: report section 4 "P2.1". The equation in plan P2.1 uses `base(U) = 12 · (1 − e^(−U/6))`, but the
`SCORE_V3` constant proposed in the same step has `base: { max: 16, scale: 6 }`. With max 16, `U = 10`, rule
tier 3, no guess and no penalty score 17 (Hard), which breaks the fixed rule "a fully forced puzzle caps at
Normal".

- (a) Base max 12 plus rule 0 / 2 / 4 (the equation as written; base + rule ≤ 16 < 17).
- (b) Base max 16 plus an explicit clamp of forced (G = 0) scores below the Hard edge.
- (c) Redesign the split between base and rule, keeping forced ≤ 16; needs fresh calibration before coding.

SA2 recommends (a): it carries the proof of P2.1 and needs no special case; (b) compresses the distinctions
between forced puzzles with a high U; (c) needs new calibration first.

**Answer (claude-fable-5-2, 2026-11-12):** (a). Base max 12 and rule 0 / 2 / 4, so base + rule ≤ 16. The constant `base: { max: 16, scale: 6 }` in plan P2.1 is a leftover of the first draft and wrong; the equation is the intended one. The forced bound is "≤ 16" (joint report RES-18).

### SA2-Q-P02: what happens when the deduction search stops before the first solution, and how is its work bounded?

Context: report sections 4 "P0.2" and "P0.2b". A node cap does not bound lookahead or rule work (one node can
run many tentative propagations and region DPs), and a cap hit before the first solution gives no final-path G
at all, so it must not look like a forced puzzle (G = 0).

- (a) Incomplete measurement = unrateable: the candidate consumes clue budget and is skipped.
- (b) Publish a separately labelled conservative estimate.
- (c) Run a second bounded fallback that finds a path before scoring.

SA2 recommends (a), plus deterministic work limits on incidences and probes in addition to `nodes`; the initial
cap numbers come from the P0.3 probe. (a) may lower hit rates but never invents G; (b) needs a new score and
label contract; (c) costs more and can change what "a required guess" means.

**Answer (claude-fable-5-2, 2026-11-12):** Owner decision (asked on the command line, 2026-11-12): **(a), RES-04 branch A.** A path capped before the first solution is unrateable: `rate()` throws `IncompleteRatingError` (`reason: 'path-capped'`), `selectClues` skips the candidate (it costs a profile and is neutral for the count steering), the derived display rating keeps the stored claim with "could not be re-rated". The v3 "+" mark is therefore never produced; `saturated` stays in the claim schema as `false` for v3 and keeps its meaning for stored v2 claims. Work is bounded by deterministic work units as well as nodes (RES-10). MP06 reports the capped share per level and board and sets `DEDUCE.work` so that no path is capped up to master on boards up to 20x18; if hell levels on very large boards become hard to generate, that is reported to the owner with the numbers rather than solved by an estimate. This withdraws the plan's remark that saturation is acceptable at hell levels (plan section 4, P3 step 4).

### SA2-Q-P03: how do interchangeable (identical-shape) pieces affect G and S?

Context: report sections 4 "P0.2" / "P0.2b". Swapping two identical pieces creates "different" solutions and
guess alternatives that a person does not see as different.

- (a) Raw labelled search and count.
- (b) Quotient identical-piece permutations for both difficulty metrics (G and S), keep raw DLX certificates
  for uniqueness.
- (c) Quotient guesses but keep raw S.

SA2 recommends (b), documented: (a) is simplest but identity swaps look hard; (b) needs a multiplicity-aware
solver and separates the rating count from the uniqueness certificate; (c) keeps today's raw count but can
penalise multiplicity that is only identity.

**Answer (claude-fable-5-2, 2026-11-12):** Owner decision (asked on the command line, 2026-11-12): **none of the branches. A piece set must not contain two pieces of the same shape, imported sets included; such a set is an error.** Consequences: (1) `core/engine/pack.js:569-574` turns its warning into an error (issue code such as `duplicate-shape`, with the two piece ids), and every other way in gets the same check: puzzle codes (`core/engine/puzzlecode.js` decode), the Generator import and the Player route; the message exists in English and Vietnamese. Shapes are compared with `canonicalKey` (`core/engine/geometry.js:126`), as `core/engine/carve.js:697-707` does for generated sets. (2) RES-09 is closed without a quotient: `shapeGroup` (RES-02) and task MP04b are dropped; guesses, alternatives and S are counted on labelled pieces, which is exact for every admissible set. (3) The engine functions (`rate`, `measureDeduction`, `selectClues`) stay total on direct inputs with twins and behave as branch A there; tests that build such sets on purpose (for example the 41 I-pentomino strip of `tests/clues.test.js:196-214`) keep working and are not a supported product input. (4) This is a format tightening: a pack or link with twins that opened with a warning before is now refused; document it in design section 5.3, the user guides and the release notes of this change. Put the check in the task that touches the pack reader for v3 (RES-21) and add tests for the pack, the code and both apps.

### SA2-Q-P04: how much search for the band centre (P1)?

Context: report section 4 "P1". Returning the current centre-near candidate is not the same as returning the
best one seen; uniqueness repairs can change scores, fail or produce an excluded clue key.

- (a) Return the best observed final result; stop early once a result is in the central half of the band, or
  after all 64 profiles.
- (b) Stop at profile 48 (`limit − 16`) as drafted.
- (c) Spend all 64 profiles whenever possible.

Also: centre as a real number `(min + max) / 2` or as the integer-score centre?

SA2 recommends (a) with the integer-score centre: it balances cost and quality; (b) leaves budget unused
without a reason; (c) maximises search cost. All three move the deterministic fixtures.

**Answer (claude-fable-5-2, 2026-11-12):** Confirmed as agreed in RES-15: the centre is the real number `(min + max) / 2`; stop early when a final result (after any uniqueness repair) lies in the central half of the band; otherwise return the best final result seen once 48 profiles are spent (`reserve = 16`, kept for repairs and their re-ratings); an unbounded band has no centre and keeps "first in band".

### SA2-Q-P05: placement-weighted clue sampling?

Context: report section 4 "P1" (plan P1 step 2). The direction of the bias (which pieces to clue when ratings
are above or below the band) has no sound argument yet, and the draft mixes canonical free-piece order with
layout order.

- (a) Keep uniform sampling; change acceptance only.
- (b) Adopt the drafted direction.
- (c) Adopt a weighting rule only after a controlled probe validates it.

SA2 recommends (a) first, (c) only with data.

**Answer (claude-fable-5-2, 2026-11-12):** (a). Uniform sampling; only the acceptance changes. The direction I gave in plan P1 step 2 was not validated and, as SA1 shows, argued the wrong way round. A weighting rule may come back only with probe data, as a separate change.

### SA2-Q-P06: one search order or several for the rating?

Context: report sections 4 "P0.3" and "P2.1"; plan section 5 "Order noise". If G turns out to depend on the
MRV tie-break order:

- (a) One canonical order; report the noise.
- (b) Median of three fixed orders (cost about ×3; needs a rule for which run's metrics and trace are kept).
- (c) Report the noise and postpone any aggregation.

SA2 recommends (a), with the noise reported; no automatic switch based on one probe.

**Answer (claude-fable-5-2, 2026-11-12):** (a). One canonical order; the probe reports the spread over the column tie rule. The "median of three orders" of plan section 5 is not triggered automatically; it would need its own decision.

### SA2-Q-P07: what if the largest v3 puzzle code does not fit in a QR code?

Context: report section 4 "P2.4". A v3 claim is written as JSON text in the code (`ratingJsonBytes: 8192`), so
codes grow; the 8 KiB bound alone does not say whether a 676-cell code still fits the Player's URL and QR
limits.

- (a) Keep the existing fallback (no QR when it does not fit).
- (b) Add a compact v3 codec now.
- (c) Omit or reduce claim diagnostics in codes, with an explicit schema.

SA2 recommends (a), unless a QR for every puzzle is a release requirement.

**Answer (claude-fable-5-2, 2026-11-12):** Superseded by the agreed summary claim (see SA1-Q-P3): codes carry `model`, `score`, `level`, `saturated` only, so the largest code stays near today's size class and fits QR version 40. If a code ever does not fit, the existing fallback (no QR) applies; no compact v3 codec in this plan.

### SA2-Q-P08: how is re-rating on load shown (P2.5)?

Context: report section 4 "P2.5". A puzzle that carries a `difficulty-v2` claim is re-rated with v3 on load.

- (a) Show the v3 level with a "re-rated (original: v2 …)" note; the code and export keep the original claim;
  print captions consistent.
- (b) Show v3 silently.
- (c) Re-rate only when the user asks.

SA2 recommends (a): (b) hides a possibly large level change; (c) departs from the automatic re-rating of P2.5.
No option changes the claim stored in the URL.

**Answer (claude-fable-5-2, 2026-11-12):** (a). Show the v3 level with the note "Re-rated with the current scale (original: …)"; the code, the URL, the title and the export keep the stored claim; print captions use the same rating and note.

### SA2-Q-P09: which calibration changes are allowed in P3?

Context: report section 4 "P3"; plan section 5 "Hit rate at Hard on large boards may fall".

- (a) Allow bounded search ranges for `K60` / `SHARES` and the caps, chosen after baseline data.
- (b) Freeze the generation tables and accept more partial batches.
- (c) Redesign large-board carving now.

SA2 recommends (a), keeping the carving architecture out of scope. It also reads "hit rates within ~10 points"
as percentage points of the matched hit rate, not a relative percentage: please confirm.

**Answer (claude-fable-5-2, 2026-11-12):** Owner decision (asked on the command line, 2026-11-12): **branch A.** P3 may change the `SCORE_V3` knobs within the JR-P3 ranges, the `DEDUCE` caps, and `K60` and `SHARES` when that is needed to keep hit rates, each change recorded with its before and after data in the calibration report (a `K60` change bumps `POLICY_ID`). Not allowed without a new decision: a new estimator, multi-order aggregation, dropping a diagnostic, a carving redesign, moving band edges. "Within ~10 points" means percentage points of the matched hit rate: confirmed.

### SA2-Q-P10: replay provenance and fallback contract (P4)?

Context: report section 4 "P4.1". The browser Generator drops the successful set attempt and its export has no
`setAttempt`; the proposed `made` record lacks the candidate's target level and uniqueness setting (they can
differ between batches); a fold can accept an earlier retained candidate, so provenance has to travel with the
candidate from its creation.

- (a) A versioned, compact record of skipped subsets and the exact set / candidate origins; a puzzle from the
  completion pass gets the final-only fallback.
- (b) Also store the completion layout and origin, for a full replay of those puzzles too.
- (c) Store a bounded generation trace instead of recomputing.

SA2 recommends (a), and asks to approve an explicit "steps unavailable" state instead of silently truncating
"every step".

**Answer (claude-fable-5-2, 2026-11-12):** (a). The versioned compact record with typed origins carried by the candidate from its creation; completion-pass puzzles and puzzles without a record get stages 1-3 (when available) and 7, and the dialog states "steps not available for this puzzle" for the missing stages. The explicit unavailable state is approved; a trace is never truncated silently. My draft record lacked the target level and the uniqueness setting: accepted.

### SA2-Q-P11: include the optional explanatory Player hints?

Context: plan P0.2b, last paragraph ("optional, after P3"): the Player's hint would name the rule that places a
piece.

- (a) Exclude from this release.
- (b) Include rule-based hints now.
- (c) Ship them experimentally behind a setting.

SA2 recommends (a): full P0-P4 covers the catalogue and the Generator replay, not this optional extension.

**Answer (claude-fable-5-2, 2026-11-12):** (a). The rule-naming Player hints stay out of this release, as the plan already says ("optional, after P3").

---

## Part B: questions from SA1 (claude-opus-5.5)

Source: `docs/difficulty-v3/claude-opus-5.5/1-report.md` section 5.2 (evidence in sections 2.3 and 4).

How the two sets relate (positions after the cross-review are in the status table at the top):

| SA1 | SA2 | Relation |
|---|---|---|
| SA1-Q-P1 decisive guesses | none | new: only SA1 raises it |
| SA1-Q-P2 old v2 ratings in the apps | SA2-Q-P08 | **conflict**: SA1 recommends showing the stored v2 claim with a note; SA2 recommends re-rating with v3 |
| SA1-Q-P3 code size | SA2-Q-P07 | related: SA1 measured the growth and asks about size; SA2 asks about the QR limit |
| SA1-Q-P4 where provenance lives | SA2-Q-P10 | related: SA1 asks where (format), SA2 asks what is recorded |
| SA1-Q-P5 weighted sampling | SA2-Q-P05 | same question, same recommendation (skip) |
| SA1-Q-P6 identical shapes | SA2-Q-P03 | **conflict**: SA1 recommends raw counts, SA2 recommends collapsing twins |

### SA1-Q-P1: what is a "real choice" when a puzzle has several solutions?

Context: report sections 0 (issue 1) and 4 "P0.2". Sound rules never remove a row of any solution, so a puzzle
with two or more solutions always has at least one guess node (G ≥ 1) on the path to the first solution, and free
choices (every alternative leads to a solution) add guess points although the puzzle gets no harder.

**Corrected 09:45** (`docs/difficulty-v3/report-detailed.md` change log, JC01): with the agreed rule bonus
(SA2-Q-P13 (a), deduction tier only), SA1's re-measured prototype rates the six 10x6 recipes 5, 6, 9, 38, 66, 104,
and today's two-solution 10x6 Easy puzzles rate 15 (Normal) under raw guesses, not 17 (Hard) as first reported.
Guess nodes have 2-28 alternatives. The issue remains (free choices raise the score), but it no longer reaches Hard
in the measured case.

The joint report (RES-05) now states the branches as:

- (A) Raw: every branch node on the path to the first solution counts, free choices included (the plan).
- (B) Decisive: a node counts only when some alternative is proved to fail; information from the proved counts;
  when the census of alternatives cannot finish within its cutoff, the rating publishes a decisive upper estimate
  (from the alternatives proved solvable) (SA1 recommends).
- (B') Decisive, but an unfinished census makes the rating unrateable; the first-path evidence is kept (SA2's
  condition for adopting the decisive model).
- (C) Raw, with the multiple-solution penalty `S ≥ 2 ? weights.info · log2(min(S, 8)) : 0` (cheap, crude).

SA2 recommends prototyping B (task MP05), measuring hit rates, cost and census completeness (MP06), then choosing
between B and B' (or A) with an explicit incomplete-census policy. The answer is needed before MP08 writes the
formula.

**Answer (claude-fable-5-2, 2026-11-12):** Owner decision (asked on the command line, 2026-11-12): **(B), RES-05 branch B.** A guess node counts only when some alternative is proved to fail; `info = Σ log2(c_i / kLow_i)`; when the census cannot finish inside `DEDUCE.census`, the rating is published as a decisive upper estimate (it lies between the true decisive value and the raw value) with `censusComplete: false` and the note "decisive estimate: n alternatives undecided within the work limit". This note is independent of the capped-path policy (SA2-Q-P02 (a)): an incomplete census is rateable, a capped path is not. Author's conditions, taken from SA2: MP05 builds it and MP06 reports hit rate, cost and the share of incomplete censuses per level and board before MP08 writes the formula; if more than a few per cent of accepted puzzles of a level carry an estimate, MP06 raises `DEDUCE.census` or reports to the owner. The fixed few / many penalty of RES-18 stays (branch C's penalty is not used).

### SA1-Q-P2: how are old (v2) ratings shown by the Player and the Generator (P2.5)?

Context: report section 4 "P2.5". See also SA2-Q-P08 (opposite recommendation).

- (a) As planned: re-rate v2 claims with v3 in a worker on load and show the v3 level with a "re-rated" note; the
  stored claim stays. Costs one rating per opened puzzle (milliseconds to about a second on 26x26); titles such
  as "Hard #3" may sit next to "Normal".
- (b) Show the stored claim with a small "older rating" note: no CPU cost, consistent with the title; levels of
  old links stay v2.
- (c) No change.

SA1 recommends (b).

**Answer (claude-fable-5-2, 2026-11-12):** (a), as both analysts now agree and as the plan says: re-rate for display with a note; the stored claim is untouched.

### SA1-Q-P3: how long may puzzle codes get with v3 claims (P2.4)?

Context: report section 4 "P2.4". Measured: a v3 claim written as JSON text makes a 10x6 code grow from 46 to
410-454 characters and a 20x18 code from 154 to 551-566. It still fits `MAX_CODE_SYMBOLS` (16,000) and QR
version 40. See also SA2-Q-P07.

- (a) As planned: JSON text with all metrics.
- (b) JSON text without metrics, in codes only (10x6: 46 → 170); packs keep the metrics; current Players still
  decode.
- (c) A compact v3 form as a new codec version (about today's size; a frozen copy of the final knobs; current
  Players cannot decode new codes; a Medium task after P3).
- (d) No rating in codes.

SA1 recommends (b) in P2, and (c) only if short codes matter.

**Answer (claude-fable-5-2, 2026-11-12):** (b). Summary claims in codes (`model`, `score`, `level`, `saturated`), full metrics in packs (at most 4,096 UTF-8 bytes and depth 8). Current Players still decode the codes. A compact v3 codec is a later, separate change if short codes matter.

### SA1-Q-P4: where does per-puzzle provenance live (P4.1)?

Context: report section 4 "P4". A new per-puzzle field `made` makes packs unreadable for every current version
(`core/engine/pack.js:200`: an unknown field is an error). See also SA2-Q-P10.

- (a) As planned: a new per-puzzle field `made` (a format change).
- (b) `generation.made`: a map from puzzle id to provenance inside the existing free-form `generation` object;
  no format change, older versions keep it untouched.

SA1 recommends (b).

**Answer (claude-fable-5-2, 2026-11-12):** (b). `generation.made`, a map from puzzle id to provenance inside the free-form `generation` object. My per-puzzle `made` field would have made packs unreadable for every current reader (`core/engine/pack.js:200`); withdrawn.

### SA1-Q-P5: placement-weighted clue sampling (P1 step 2)?

Context: report section 4 "P1": the plan's direction is reasoned the wrong way round. Same question as SA2-Q-P05.

- (a) Skip it; ship the centre-seeking acceptance only.
- (b) Implement with the corrected direction (above the band: clue pieces with many placements; below: few), kept
  only if the probe shows a better hit rate.
- (c) As written.

SA1 recommends (a); revisit in P3 if Hard / Expert hit rates drop.

**Answer (claude-fable-5-2, 2026-11-12):** (a). Skip it; same answer as SA2-Q-P05.

### SA1-Q-P6: sets with identical shapes (imported sets only)?

Context: report section 4 "P0.2b". Generated sets never contain twins (`core/engine/carve.js:707` refuses them);
imported sets may (`core/engine/pack.js:574` only warns). Grouping by shape key in R4 / R5 / R9 is ill-defined.
See also SA2-Q-P03 (opposite recommendation).

- (a) As planned: group by shape key in R4 / R5 / R9.
- (b) Per-piece rules; twins collapsed in the guess alternatives and in S (no fake guesses; solutions counted up to
  twin swaps; differs from the raw `certify` counts).
- (c) Per-piece rules only, raw counts like `certify`; such sets rate higher than they should (limitation
  documented).

SA1 recommends (c).

**Answer (claude-fable-5-2, 2026-11-12):** Owner decision (asked on the command line, 2026-11-12): **none of the branches. A piece set must not contain two pieces of the same shape, imported sets included; such a set is an error.** Consequences: (1) `core/engine/pack.js:569-574` turns its warning into an error (issue code such as `duplicate-shape`, with the two piece ids), and every other way in gets the same check: puzzle codes (`core/engine/puzzlecode.js` decode), the Generator import and the Player route; the message exists in English and Vietnamese. Shapes are compared with `canonicalKey` (`core/engine/geometry.js:126`), as `core/engine/carve.js:697-707` does for generated sets. (2) RES-09 is closed without a quotient: `shapeGroup` (RES-02) and task MP04b are dropped; guesses, alternatives and S are counted on labelled pieces, which is exact for every admissible set. (3) The engine functions (`rate`, `measureDeduction`, `selectClues`) stay total on direct inputs with twins and behave as branch A there; tests that build such sets on purpose (for example the 41 I-pentomino strip of `tests/clues.test.js:196-214`) keep working and are not a supported product input. (4) This is a format tightening: a pack or link with twins that opened with a warning before is now refused; document it in design section 5.3, the user guides and the release notes of this change. Put the check in the task that touches the pack reader for v3 (RES-21) and add tests for the pack, the code and both apps.

---

## Part C: new questions from the cross-review

### SA2-Q-P12: does R4 include cell-to-cell locked-column deductions?

Context: `docs/difficulty-v3/gpt-6-astra/2-review-of-claude-opus-5.5.md` sections 2.2 and 4.3. SA1 proposed
implementing R4 and R5 as one column-subset rule with "cell-to-cell included" (`docs/difficulty-v3/claude-opus-5.5/1-report.md`
section 5.1, R6). A cell-to-cell deduction (every live row that covers cell a also covers cell b, so rows covering b
but not a die) is not in the plan's catalogue and changes scores.

- (a) The plan's R4 (piece claims a cell) and R5 (cell claims a piece) only.
- (b) A general column-subset closure, cell-to-cell included, with the rule description, tests and calibration
  updated.

SA2 recommends (a) until (b) is explicitly approved; a generic kernel does not require enabling every pairing of
column types. SA1 agrees in its response.

**Answer (claude-fable-5-2, 2026-11-12):** (a). R4 (piece claims a cell) and R5 (cell claims a piece) only; no cell-to-cell pairing. A shared kernel is fine as an implementation detail.

### SA2-Q-P13: what feeds the rule bonus of the v3 score?

Context: `docs/difficulty-v3/gpt-6-astra/2-review-of-claude-opus-5.5.md` section 4.3. Plan P2.1 has `rule = tier 1
→ 0, tier 2 → 2, tier ≥ 3 → 4`, and plan P0.2b defines `tier` as 1..3, "or 4 when a guess was needed": it is
ambiguous whether a guess also earns the tier-3 bonus.

- (a) The hardest deduction tier actually used (1..3); guesses are scored only by the guess term.
- (b) The overall tier, so every puzzle with a guess also gets the bonus of 4.
- (c) A separately named first-guess bonus.

SA2 recommends (a); SA1 now agrees. This changes the thresholds for puzzles with several solutions and needs an
explicit answer.

**Answer (claude-fable-5-2, 2026-11-12):** (a). The rule bonus uses the hardest **deduction** tier actually used on the final path (1..3); guesses are scored by the guess term only. The plan's "tier 4 when a guess was needed" is a diagnostic label, not a score input; the wording was ambiguous.

### AUTH-P1: the provenance record (P4.1), for the plan author

Context: `docs/difficulty-v3/report-detailed.md` RES-27 (revised 09:45 after SA2's check JC08). Both analysts agree
on the location (`generation.made[puzzleId]`, no new per-puzzle field; the set origin in `generation.setOrigin`,
JR-P2) and on the content:

- typed provenance carried inside the candidate from its creation, with the immutable set origin;
- the skipped subsets defined by what actually executed (skipped `rateSubset` calls and repaired-result
  exclusions), all of which must be consumed on replay;
- explicit availability per stage; a puzzle from the completion pass shows stages 1-3 and 7 only;
- documented limitation: an older Generator may drop `generation.made` when it re-exports a pack.

**Correction:** an earlier version of this question said "each skip is a distinct excluded key", "at most 99" and
"no overflow state". That is wrong: two subsets can share a clue key on sets with repeated shapes, and a
`generation` object above 100,000 JSON nodes or 512 KiB makes the whole pack unreadable in every current reader. The
record must therefore be bounded, and the writer drops `generation.made` near that limit. Choose the skip encoding:

- (a) Integer lists capped at 64 subset ordinals and 16 repair ordinals, otherwise the marker `'overflow'`
  (readable; about 80 KB and 10,000 JSON nodes for 100 puzzles) (SA1 recommends).
- (b) Base64 little-endian bitsets (no overflow state; about 65 KB for 100 puzzles).

SA2 accepts either. Please confirm the record and pick the encoding.

**Answer (claude-fable-5-2, 2026-11-12):** Record confirmed as in RES-27 (`generation.made[puzzleId]`, typed `calibration` / `candidate` / `completion`, origin carried by the candidate, skips defined by execution, explicit stage availability, the writer drops `generation.made` near the 512 KiB limit, the older-Generator limitation documented). Encoding: **(a)**, integer lists capped at 64 subset and 16 repair ordinals, otherwise `'overflow'`. It is readable in a pack, trivially validated (strictly increasing integers within bounds) and skips are rare in practice; an overflow only hides stages 4-6 of that one puzzle.

### JR-P4: how are auxiliary worker requests scheduled (P2.5, P4.2)? (for the plan author)

Context: `docs/difficulty-v3/report-detailed.md` RES-29, raised by SA2's check JC10. Today `beginRequest` aborts every
earlier request as superseded (`core/browser/worker-pool.js:575-588`) and the Generator client's `cancel()` cancels the
whole pool (`core/browser/generation-client.js:1190-1194`), so a display re-rating (P2.5) or a replay (P4) submitted
the ordinary way would cancel a running generation.

- (a) An auxiliary method on the existing client and on the Player's pool wrapper: it waits while generation or
  verification is active, runs as an idle task, is cancelled by its own `AbortSignal` and aborted when a new
  generation or verification begins; no extra worker (SA1 recommends: no extra memory on phones, no second worker
  lifecycle).
- (b) A separate one-worker pool for auxiliary requests, with its own memory budget (a main and a scratch
  workspace, 160 and 32 MiB, `core/engine/policy.js:76-77`), creation, disposal and a no-worker fallback.

SA2 accepts either, provided the choice is made before task MP10.

**Answer (claude-fable-5-2, 2026-11-12):** **(a).** An auxiliary method on the existing client and on the Player's pool wrapper: it waits while a generation or verification is active, runs as an idle task, has its own `AbortSignal`, and is aborted when a new generation or verification begins. No second pool: a second worker with its own 160 + 32 MiB workspaces is not acceptable on phones. The choice is made before MP10, as SA2 asks.

### JR-P1: which old claims get the derived display rating (P2.5)? (for the plan author)

Context: `docs/difficulty-v3/report-detailed.md` RES-23. Both analysts agree that old claims are re-rated with v3
for display, with a note, and the stored claim stays untouched (SA2-Q-P08 / SA1-Q-P2). The plan names only
`difficulty-v2` claims.

- (a) Claims of `difficulty-v2` and `difficulty-v1` (SA1 recommends).
- (b) `difficulty-v2` only, as the plan says.
- (c) Also puzzles that carry no claim at all.

SA2 (`docs/difficulty-v3/gpt-6-astra/4-check-of-joint-report.md` section 4) prefers (b) as the plan's default and
calls (a) a reasonable explicit extension; (c) would be a separate new display branch.

**Answer (claude-fable-5-2, 2026-11-12):** **(a).** Claims of `difficulty-v2` and `difficulty-v1` are re-rated for display: both are older scales of the same quantity and the operation is identical, so showing a v1 level next to v3 levels would be the inconsistency the note is meant to remove. Puzzles without any claim are not rated by this change (branch (c) stays out).

### JR-P2: where does the immutable set origin live (P4.1)? (for the plan author)

Context: `docs/difficulty-v3/report-detailed.md` RES-27. A replay needs the set's origin (`setSeed`, `setLevel`,
`setAttempt`) as it was when the set was made, but the existing set keys of `generation` are re-stamped with the
current versions at every export (`generator/state.js:1300-1328`).

- (a) A new key `generation.setOrigin`, written once when the set is made and never re-stamped (SA1 recommends).
- (b) Reuse the existing set keys and stop re-stamping them.

**Answer (claude-fable-5-2, 2026-11-12):** (a). A new `generation.setOrigin`, written once when the set is made and never re-stamped.

### JR-P3: the knob ranges for the P3 fit (for the plan author)

Context: `docs/difficulty-v3/report-detailed.md` RES-18 and RES-25. The fit of `SCORE_V3` searches inside these
ranges (all invariants of the fixed decisions kept):

- `base.max` 8-12, `base.scale` 3-12, with `base.max + rule[3] ≤ 16` (a forced puzzle never reaches Hard);
- `weights.G` 0-8, `weights.info` 0.5-6;
- `0 ≤ penalty.few ≤ penalty.many ≤ 8`.

Confirm these ranges or set others. SA2 treats them as candidate experimental ranges that you approve before
production values are chosen.

**Answer (claude-fable-5-2, 2026-11-12):** (a), as experimental ranges for the fit: `base.max` 8-12 (start 12), `base.scale` 3-12, `rule[2] ≤ rule[3]` with `base.max + rule[3] ≤ 16`, `weights.G` 0-8, `weights.info` 0.5-6, `0 ≤ penalty.few ≤ penalty.many ≤ 8`. The invariants are hard; the ranges bound the search. MP08 writes the production values from the MP06 fit and records them with the evidence; MP12 locks them. A value outside a range needs a new answer.

### PROC-P1: when are the v3 knobs fitted?

Context: SA1's review section "D8" (`docs/difficulty-v3/claude-opus-5.5/2-review-of-gpt-6-astra.md`) and SA2's
task PV3-14 (`docs/difficulty-v3/gpt-6-astra/1-report.md` section 6.1).

- (a) Fit `SCORE_V3` from the P0.3 probe before activating v3 (P2), and lock it before P4; fixtures and recipes are
  recorded once (SA1).
- (b) Run the final calibration last, after P4 (SA2's first report).

Both analysts now agree on (a) plus a final regression run after P4.

**Answer (claude-fable-5-2, 2026-11-12):** (a), confirmed: first fit from the P0.3 probe before v3 is activated, lock before P4, a final regression run after P4. This also answers part D item 8.

---

## Part D: corrections to the plan found by the analysts (for confirmation)

These are not choices; they are places where the analysts found the plan wrong or incomplete. Mark any you
disagree with.

From SA2 (report section 0 and 5.1):

1. R9 (pair exclusion) is unsound as written: one piece can cover both cells (a domino and a square tetromino
   on a 3x2 board are a counterexample). R3 needs stronger placement preconditions; R7 must treat regional
   allocation as optional, not sum every eligible piece as mandatory.
2. The P2 metrics cannot rebuild the score: they lack the alternatives at each guess (or their `Σ log2 c_i`),
   `rules` and `tier`; `stop` would carry both the DLX and the deduction meaning.
3. The protocol warning of plan section 3 rule 6 is wrong: `core/engine/protocol.js:490-516` reads arbitrary
   bounded claim metrics and `824-861` passes worker result values through; new metric names need no protocol
   change (a new replay task kind does).
4. The calibration command `node tools/calibrate.mjs --profile landscape` lacks the mandatory `--output`, and
   the landscape runner does not save the packs P3 wants to re-rate (`tools/calibrate.mjs:121-123`,
   `tools/bench/runner.js:682-701`).
5. Old v2 recipes are not a monotone v3 corpus: the "G and Gt non-decreasing with level" test should become a
   fixed-puzzle characterisation plus independent generation tests.
6. The v2 puzzle-code goldens should stay as historical compatibility tests; add v3 cases instead of
   re-recording them.
7. `placementsPerPiece` is a workspace-backed view in canonical free-piece order; P1 must copy it before the
   next workspace build and must not mix it with layout order (`core/engine/tiling.js:24-34`,
   `core/engine/workspace.js:268-284`).

From SA1 (report sections 0 and 5.1):

8. The knobs are too steep for real data: after propagation and lookahead, guess nodes have 2-28 live
   alternatives, not 2 (SA1's prototype). With `a = 6, b = 4` and the agreed rule bonus the six 10x6 recipes rate
   5, 6, 9, 38, 66, 104 (re-measured 09:45; first reported as 5, 6, 7, 40, 68, 106). Fit the knobs from the P0.3
   probe before P2 re-records the fixtures, otherwise fixtures, recipes and tests are rewritten twice.
9. `saturated = stop === 'node-cap'` also fires when the cap is hit after the first solution (during the solution
   count); it should mean "cap hit before the first solution". A node cap with 2 ≤ S < cap is `few`.
10. The "place" half of R3 is unsound as written. R4 and R5 can share one column-subset kernel, but only the
    piece / cell pairings of the plan are enabled (no cell-to-cell deductions; agreed, SA2-Q-P12 (a)).
11. P0.1 exposes too little: the region and parity rules need `width`, `height` and the piece sizes; "`deduce.js`
    imports only `./policy.js`" contradicts the use of `geometry.js` `canonicalKey`.
12. P2 breaks more tests than it lists: `tests/clues.test.js` (v2 recipe scores, band targets, the nightmare /
    hell-1 "unreachable" test), `tests/fixtures/clue-recipes.js`, `tests/difficulty.test.js:56-66`,
    `tests/worker-pool.test.js:815`, `tests/generate.test.js:50`.
13. P1 should build the empty-board placement counts with `countPlacements(preparePlacements(...))`, not
    `buildModel`; `ALGO_ID` is bumped to `gen-v3` with P1.
14. G of a unique puzzle does not depend on the row order, only on the column tie rule: the "median of three
    tie-break orders" option of plan section 5 is needed only if the probe shows the column rule matters.

---

## Part D: author's response (claude-fable-5-2, 2026-11-12)

All fourteen corrections are accepted; none is disputed. Notes:

- Items 1 and 10: R9 and the "place" half of R3 were unsound as I wrote them; the sound forms of RES-06 and RES-07
  replace them. R7's optional allocation is accepted.
- Item 3: my rule 6 about the protocol was wrong; new metric names need no protocol change, the replay task kind does.
- Item 5: accepted; the old v2 recipes become a characterisation, monotonicity is tested on generated puzzles.
- Item 8: accepted; the knobs `a = 6, b = 4` were never fitted. See JR-P3 and PROC-P1.
- Item 9: with SA2-Q-P02 (a) a capped path is unrateable, so v3 never sets `saturated`; a cap during the count only
  changes `solutions`.
- Items 11 and 13: accepted (`deduce.js` needs the board dimensions and piece sizes; P1 uses
  `countPlacements(preparePlacements(...))`; `ALGO_ID` becomes `gen-v3` with P1). With the owner's decision on
  identical shapes, `deduce.js` no longer needs `canonicalKey`.

## Part E: decisions in one place

| Topic | Decision | By |
|---|---|---|
| Guess measure (SA1-Q-P1) | decisive guesses; an unfinished census publishes a labelled upper estimate (RES-05 branch B) | owner |
| Cap before the first solution (SA2-Q-P02) | unrateable, candidate skipped (RES-04 branch A); v3 has no "+" mark | owner |
| Identical shapes (SA2-Q-P03 / SA1-Q-P6) | forbidden everywhere, imported sets included: an error; RES-09's quotient and MP04b dropped | owner |
| Calibration freedoms (SA2-Q-P09) | knobs, caps, K60 and SHARES may change in P3, every change recorded (RES-25 branch A) | owner |
| Base formula, rule bonus (SA2-Q-P01, SA2-Q-P13) | base max 12, rule 0 / 2 / 4 by deduction tier | author |
| Clue search (SA2-Q-P04, P05) | real centre, central-half stop, reserve 16; uniform sampling | author |
| Codes and packs (SA2-Q-P07, SA1-Q-P3) | summary claims in codes, full metrics in packs | author |
| Old ratings (SA2-Q-P08, SA1-Q-P2, JR-P1) | v2 and v1 claims re-rated for display with a note; stored claim untouched | author |
| Provenance (SA2-Q-P10, SA1-Q-P4, AUTH-P1, JR-P2) | `generation.made` + `generation.setOrigin`; capped integer skip lists | author |
| Auxiliary requests (JR-P4) | a method on the existing client and pool; no second pool | author |
| Knob ranges, fit timing (JR-P3, PROC-P1) | the RES-18 ranges; fit before activation, lock before P4 | author |
| Everything marked "agreed" in the status table | confirmed as agreed | author |

No PENDING item of `docs/difficulty-v3/report-detailed.md` remains open: RES-04 → A; RES-05 → B; RES-09 → closed
by the new constraint; RES-18 ranges → accepted; RES-23 scope → v2 and v1; RES-25 → A; RES-27 → encoding a;
RES-29 → a.

---

## Part F: remaining concerns after the answers were applied (for acceptance)

Raised by the lead analyst while applying the answers to `docs/difficulty-v3/report-detailed.md` (section 8.2). None of
the answers is impossible or contradicts another; C1-C5 need a confirmation or a different choice. The report applies
option (a) of each. C6 is information only.

### C1: the estimate note is lost in puzzle codes (SA1-Q-P1 with SA1-Q-P3)

An unfinished census is published "with `censusComplete: false` and the note", but a code carries the summary claim
`{ model, score, level, saturated }` (RES-22), so a puzzle opened from a code shows the estimated score without the
note. The claim schema already has an optional `censored` boolean, accepted by current readers on non-v2 claims
(`core/engine/pack.js:57, 793-797, 829-833`; written by `ratingClaim`, 1199-1200).

- (a) Accept the gap (applied in the report).
- (b) Write `censored: true` on v3 claims, full and summary, when `censusComplete` is false (cross-field check:
  `censored` if and only if not `censusComplete`), so a code shows "decisive estimate" without n; about 1 hour in
  MP09 and MP10 (SA1 recommends).

**Answer:**

### C2: centre search wording (SA2-Q-P04)

The answer stops on "a final result (after any uniqueness repair)" in the central half and returns "the best final
result seen"; the joint draft stopped on a central raw rating whose repair stayed in band and ranked raw ratings. RES-15
now follows the answer (lazy best-first over final results; the same as the draft in `any` mode, more repairs possible
in `require` mode). The answer also calls the reserve of 16 "kept for repairs and their re-ratings", but repair ratings
are not search profiles (`core/engine/clues.js:239-241`); RES-15 keeps that accounting and bounds repairs by
memoisation (each in-band candidate is repaired at most once).

- (a) RES-15 as written (applied; SA1 recommends).
- (b) The draft's raw-rating rule.
- (c) Count repair ratings as profiles within the 64 (a budget change).

**Answer:**

### C3: where the release notes go

The duplicate-shape refusal is to be documented "in the release notes of this change", but the repository has no
release-notes file (no `CHANGELOG`, `RELEASE` or `NEWS`; `README.md` has no such section).

- (a) A "Release notes" section of `docs/difficulty-v3/final-<date>.md`, written by MP17 (applied; SA1 recommends).
- (b) A new root `CHANGELOG.md`, a new living document written by MP09 and MP17.
- (c) Another place you name.

**Answer:**

### C4: saved Generator sets with two pieces of the same shape

Such a set could be imported before (a warning only) and saved; after MP09 `readSavedSet` refuses it and the restore
drops it without a word (`generator/state.js:885-899`; callers 404-409, 1022-1027, 1048), as it does today for any
invalid saved set.

- (a) Accept the silent drop (applied).
- (b) MP09 shows a one-time notice in both languages that a saved set with two pieces of the same shape was removed
  (about 1 hour: a restore flag and a message) (SA1 recommends, so that no saved work disappears unexplained).

**Answer:**

### C5: "a few per cent" of estimated ratings

The answer to SA1-Q-P1 says: "if more than a few per cent of accepted puzzles of a level carry an estimate, MP06 raises
`DEDUCE.census` or reports to the owner". MP06 needs a number for its acceptance; the report uses **5 %** (RES-05,
RES-10). Confirm or name the number.

**Answer:**

### C6: information only, tests and format parts retired by the duplicate-shape error

1. `tests/clues.test.js:196-214` keeps its twin input (answer point 3), but its `any` request targets hell-1, a level
   chosen for v2 scores; under decisive guesses a swap of twins is a free choice and adds nothing, so v3 may rate the
   strip lower; MP09 re-evaluates the target and keeps the `require` assertion (RES-24).
2. The frozen code format's repeated-shape grammar (`docs/design-detail.md:1867-1869`) can no longer occur in a valid
   code: the puzzle-code property test loses its twin coverage (`tests/puzzlecode.test.js:2174-2209`) and the round
   trips that used `repeatedShapes` are rebuilt (RES-34).
3. Three pack tests that pass twin sets through the reader are rebuilt (`tests/pack.test.js:683-706`).

No decision is needed unless you object.
