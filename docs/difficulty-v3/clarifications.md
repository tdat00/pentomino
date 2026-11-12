# difficulty-v3: clarifications for the plan author

Status: open, 2026-11-12. Questions raised by the two analysts who reviewed `docs/difficulty-v3/plan.md`
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

**Answer:**

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

**Answer:**

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

**Answer:**

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

**Answer:**

### SA2-Q-P05: placement-weighted clue sampling?

Context: report section 4 "P1" (plan P1 step 2). The direction of the bias (which pieces to clue when ratings
are above or below the band) has no sound argument yet, and the draft mixes canonical free-piece order with
layout order.

- (a) Keep uniform sampling; change acceptance only.
- (b) Adopt the drafted direction.
- (c) Adopt a weighting rule only after a controlled probe validates it.

SA2 recommends (a) first, (c) only with data.

**Answer:**

### SA2-Q-P06: one search order or several for the rating?

Context: report sections 4 "P0.3" and "P2.1"; plan section 5 "Order noise". If G turns out to depend on the
MRV tie-break order:

- (a) One canonical order; report the noise.
- (b) Median of three fixed orders (cost about ×3; needs a rule for which run's metrics and trace are kept).
- (c) Report the noise and postpone any aggregation.

SA2 recommends (a), with the noise reported; no automatic switch based on one probe.

**Answer:**

### SA2-Q-P07: what if the largest v3 puzzle code does not fit in a QR code?

Context: report section 4 "P2.4". A v3 claim is written as JSON text in the code (`ratingJsonBytes: 8192`), so
codes grow; the 8 KiB bound alone does not say whether a 676-cell code still fits the Player's URL and QR
limits.

- (a) Keep the existing fallback (no QR when it does not fit).
- (b) Add a compact v3 codec now.
- (c) Omit or reduce claim diagnostics in codes, with an explicit schema.

SA2 recommends (a), unless a QR for every puzzle is a release requirement.

**Answer:**

### SA2-Q-P08: how is re-rating on load shown (P2.5)?

Context: report section 4 "P2.5". A puzzle that carries a `difficulty-v2` claim is re-rated with v3 on load.

- (a) Show the v3 level with a "re-rated (original: v2 …)" note; the code and export keep the original claim;
  print captions consistent.
- (b) Show v3 silently.
- (c) Re-rate only when the user asks.

SA2 recommends (a): (b) hides a possibly large level change; (c) departs from the automatic re-rating of P2.5.
No option changes the claim stored in the URL.

**Answer:**

### SA2-Q-P09: which calibration changes are allowed in P3?

Context: report section 4 "P3"; plan section 5 "Hit rate at Hard on large boards may fall".

- (a) Allow bounded search ranges for `K60` / `SHARES` and the caps, chosen after baseline data.
- (b) Freeze the generation tables and accept more partial batches.
- (c) Redesign large-board carving now.

SA2 recommends (a), keeping the carving architecture out of scope. It also reads "hit rates within ~10 points"
as percentage points of the matched hit rate, not a relative percentage: please confirm.

**Answer:**

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

**Answer:**

### SA2-Q-P11: include the optional explanatory Player hints?

Context: plan P0.2b, last paragraph ("optional, after P3"): the Player's hint would name the rule that places a
piece.

- (a) Exclude from this release.
- (b) Include rule-based hints now.
- (c) Ship them experimentally behind a setting.

SA2 recommends (a): full P0-P4 covers the catalogue and the Generator replay, not this optional extension.

**Answer:**

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

**Answer:**

### SA1-Q-P2: how are old (v2) ratings shown by the Player and the Generator (P2.5)?

Context: report section 4 "P2.5". See also SA2-Q-P08 (opposite recommendation).

- (a) As planned: re-rate v2 claims with v3 in a worker on load and show the v3 level with a "re-rated" note; the
  stored claim stays. Costs one rating per opened puzzle (milliseconds to about a second on 26x26); titles such
  as "Hard #3" may sit next to "Normal".
- (b) Show the stored claim with a small "older rating" note: no CPU cost, consistent with the title; levels of
  old links stay v2.
- (c) No change.

SA1 recommends (b).

**Answer:**

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

**Answer:**

### SA1-Q-P4: where does per-puzzle provenance live (P4.1)?

Context: report section 4 "P4". A new per-puzzle field `made` makes packs unreadable for every current version
(`core/engine/pack.js:200`: an unknown field is an error). See also SA2-Q-P10.

- (a) As planned: a new per-puzzle field `made` (a format change).
- (b) `generation.made`: a map from puzzle id to provenance inside the existing free-form `generation` object;
  no format change, older versions keep it untouched.

SA1 recommends (b).

**Answer:**

### SA1-Q-P5: placement-weighted clue sampling (P1 step 2)?

Context: report section 4 "P1": the plan's direction is reasoned the wrong way round. Same question as SA2-Q-P05.

- (a) Skip it; ship the centre-seeking acceptance only.
- (b) Implement with the corrected direction (above the band: clue pieces with many placements; below: few), kept
  only if the probe shows a better hit rate.
- (c) As written.

SA1 recommends (a); revisit in P3 if Hard / Expert hit rates drop.

**Answer:**

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

**Answer:**

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

**Answer:**

### SA2-Q-P13: what feeds the rule bonus of the v3 score?

Context: `docs/difficulty-v3/gpt-6-astra/2-review-of-claude-opus-5.5.md` section 4.3. Plan P2.1 has `rule = tier 1
→ 0, tier 2 → 2, tier ≥ 3 → 4`, and plan P0.2b defines `tier` as 1..3, "or 4 when a guess was needed": it is
ambiguous whether a guess also earns the tier-3 bonus.

- (a) The hardest deduction tier actually used (1..3); guesses are scored only by the guess term.
- (b) The overall tier, so every puzzle with a guess also gets the bonus of 4.
- (c) A separately named first-guess bonus.

SA2 recommends (a); SA1 now agrees. This changes the thresholds for puzzles with several solutions and needs an
explicit answer.

**Answer:**

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

**Answer:**

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

**Answer:**

### JR-P1: which old claims get the derived display rating (P2.5)? (for the plan author)

Context: `docs/difficulty-v3/report-detailed.md` RES-23. Both analysts agree that old claims are re-rated with v3
for display, with a note, and the stored claim stays untouched (SA2-Q-P08 / SA1-Q-P2). The plan names only
`difficulty-v2` claims.

- (a) Claims of `difficulty-v2` and `difficulty-v1` (SA1 recommends).
- (b) `difficulty-v2` only, as the plan says.
- (c) Also puzzles that carry no claim at all.

SA2 (`docs/difficulty-v3/gpt-6-astra/4-check-of-joint-report.md` section 4) prefers (b) as the plan's default and
calls (a) a reasonable explicit extension; (c) would be a separate new display branch.

**Answer:**

### JR-P2: where does the immutable set origin live (P4.1)? (for the plan author)

Context: `docs/difficulty-v3/report-detailed.md` RES-27. A replay needs the set's origin (`setSeed`, `setLevel`,
`setAttempt`) as it was when the set was made, but the existing set keys of `generation` are re-stamped with the
current versions at every export (`generator/state.js:1300-1328`).

- (a) A new key `generation.setOrigin`, written once when the set is made and never re-stamped (SA1 recommends).
- (b) Reuse the existing set keys and stop re-stamping them.

**Answer:**

### JR-P3: the knob ranges for the P3 fit (for the plan author)

Context: `docs/difficulty-v3/report-detailed.md` RES-18 and RES-25. The fit of `SCORE_V3` searches inside these
ranges (all invariants of the fixed decisions kept):

- `base.max` 8-12, `base.scale` 3-12, with `base.max + rule[3] ≤ 16` (a forced puzzle never reaches Hard);
- `weights.G` 0-8, `weights.info` 0.5-6;
- `0 ≤ penalty.few ≤ penalty.many ≤ 8`.

Confirm these ranges or set others. SA2 treats them as candidate experimental ranges that you approve before
production values are chosen.

**Answer:**

### PROC-P1: when are the v3 knobs fitted?

Context: SA1's review section "D8" (`docs/difficulty-v3/claude-opus-5.5/2-review-of-gpt-6-astra.md`) and SA2's
task PV3-14 (`docs/difficulty-v3/gpt-6-astra/1-report.md` section 6.1).

- (a) Fit `SCORE_V3` from the P0.3 probe before activating v3 (P2), and lock it before P4; fixtures and recipes are
  recorded once (SA1).
- (b) Run the final calibration last, after P4 (SA2's first report).

Both analysts now agree on (a) plus a final regression run after P4.

**Answer:**

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
