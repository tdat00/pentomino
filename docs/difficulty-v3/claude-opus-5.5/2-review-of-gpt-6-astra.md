# difficulty-v3: review of SA2's report (SA1, claude-opus-5.5)

Status: cross-review, 2026-11-12, of `docs/difficulty-v3/gpt-6-astra/1-report.md` (SA2) against my report
`docs/difficulty-v3/claude-opus-5.5/1-report.md` (SA1), the plan and the code at HEAD `77e62cb` (branch
`rating-v3`). Read-only: no repository file was changed except this one. No test was run in this phase (the quick
set shares `tests/artifacts/` with SA2's runs); every conflict was re-checked by reading the code or by arithmetic.
"SA2 §n" and "SA1 §n" are sections of the two reports; "plan:n" is a line of `docs/difficulty-v3/plan.md`.

---

## 1. Summary

The two reports agree on the diagnosis and on most corrections, and they complement each other: SA1 measured
(deduction prototype, puzzle-code lengths), SA2 went further into contracts (deduction state, P1 state machine,
provenance records, UI and tooling). One finding of SA1 is missing from SA2 and matters most: with sound rules,
several solutions force at least one guess, so the plan's model raises the score of multi-solution puzzles.

### 1.1 Agreement

- The §6 probes reproduce exactly in both reports, including the 10x6 Hard piece sizes 4..9 (plan says 5..8).
- `SCORE_V3.base.max = 16` contradicts the formula's 12 and breaks "G = 0 never reaches Hard" (SA2 #1, SA1 #2;
  same proof: the guarantee holds iff `base.max + rule.max <= 16.5`).
- R9 is unsound without "no live row covers both cells"; the "place" half of R3 is unsound; R7 must treat pieces
  as optional (a subset DP over the pieces that can still go in the region); R8 is sound only on the real residual
  components after a candidate row is removed (SA2 §4 P0.2b, SA1 §4 P0.2b).
- The metrics lack the guess alternatives (or their information), `tier` and `rules`; `stop` is used for two
  different things (SA2 #3, SA1 #4).
- The protocol claim is wrong: worker results pass through, `readRatingClaim` copies any plain metrics
  (`core/engine/protocol.js:491-516, 827-867`); the replay task kind does need protocol work (SA2 #5, SA1 #7).
- P0.1 needs `width`, `height`, `pieceSizes`, canonical free-piece order and a liveness guard (SA2 §4 P0.1, SA1 §4).
- The 3x2 P/monomino fixture must clue the monomino, as `tests/difficulty.test.js:72` does.
- P1: return the best observed in-band candidate, defer and memoise the uniqueness repair, never retain
  workspace-backed placement counts; the sampling bias has its directions reversed and should be skipped
  (SA2 #6, #7, Q-P05 a; SA1 §4 P1, Q-P5 a).
- P3: write calibration output under `docs/difficulty-v3/`, never into the frozen `docs/calibration/`.
- P4: the Generator never stores the winning set attempt; provenance must travel with the candidate from its
  creation because the fold can accept an earlier attempt's `best` (`core/engine/generate.js:528`); the record
  needs the target level and the uniqueness setting; versions must be compared before a replay (SA2 #8, #9;
  SA1 #10).
- Never run two quick sets at the same time on one checkout (both baselines hit the same collision).

### 1.2 Disagreements (details in §2.2; owner questions in §3)

| # | Topic | SA2 | SA1 (position after this review) |
|---|---|---|---|
| D1 | Several solutions and G | not addressed | S >= 2 forces G >= 1: free choices must not count (SA1-Q-P1); unchanged |
| D2 | Rule term of a puzzle with guesses | rule from the deduction tier only | literal plan (tier 4 -> 4) in SA1; **changed: SA2's reading is better** |
| D3 | Cap hit before the first solution | incomplete, candidate skipped (SA2-Q-P02 a) | plan's saturated rating with '+' (plan:301, 367-368); owner question |
| D4 | P2.5 re-rating on load | implement, as a derived display rating | SA1 recommended "stored claim + note"; **changed: implement (owner scope = full plan)** |
| D5 | Where per-puzzle provenance lives | in `Puzzle` / `PackPuzzle` and the pack reader/writer | `generation.made` (no format change); unchanged |
| D6 | Identical shapes | quotient twins in G and S (SA2-Q-P03 b) | per-piece rules, raw counts (SA1-Q-P6 c); unchanged |
| D7 | Code size | keep JSON, keep the no-QR fallback (SA2-Q-P07 a) | claims without metrics in codes (SA1-Q-P3 b); unchanged |
| D8 | Order of calibration | final calibration last, after P4 (PV3-14) | fit knobs before activation, lock before P4; unchanged |
| D9 | Owner-question scope | Q-P01, Q-P04, Q-P06 are owner questions | plan-author or implementer matters (§3) |
| D10 | Effort | 88-139 engineering hours | 31-47 agent hours; different units, see §4.4 |

### 1.3 Found by SA2, missed by SA1 (all verified)

- The bench runner names the **clue count** `G` (`tools/bench/runner.js:690`, `initialG` 687): v3's G (guesses)
  collides with it in every calibration record.
- `tools/calibrate.mjs` refuses to run without `--output` (`tools/calibrate.mjs:122-124`); SA1 called it optional.
- Current app versions read a v3 claim as non-current and bound its metrics to 4,096 bytes
  (`core/engine/pack.js:40, 802-811`): a hard compatibility limit for v3 metrics, not a soft one.
- The deduction state needs memory accounting: the model allows 5,000,000 nonzeros
  (`core/engine/placements.js:48`), so a column transpose alone can reach about 20 MB.
- A node cap does not bound the work inside a node (lookahead propagations, region DPs): add work counters.
- A failed restart silently falls back to the witness (`core/engine/generate.js:180-183`): `start` must be the
  observed outcome, not the attempt rule.
- The sample pack uses `sample/<level>/<i>` streams (`tools/record-fixtures.mjs:144`), not slot/attempt streams:
  re-recording it cannot give truthful ordinary provenance; P4 needs a separate generated replay fixture.
- The completion start is contradictory in the plan (`start: 'completion'` at plan:392 versus "steps not
  available" for completion puzzles at plan:398-399).
- Uniqueness repairs are rated outside the 64-rating budget (`core/engine/clues.js:239-241`): a trace or test that
  bounds "all ratings" by 64 is wrong.
- A puzzle with an included solution skips verification (`player/state.js:583-585`): the P2.5 rating request
  cannot hang off the `verifyPack` reply.
- Each puzzle card holds a select button and a remove button side by side (`generator/ui/puzzle-panel.js:293-296`):
  the "How it was made" button must be a third sibling, not nested.
- Replay needs the main **and** the scratch workspace, like generation; "a tampered attempt always mismatches" is
  not a valid property (a different attempt can give the same puzzle).
- The pack reader computes no v2 score (it imports only board, geometry and tiling helpers,
  `core/engine/pack.js:6-8`); keeping `scoreV2` / `measureV2` is for diagnostics and tests, not for the reader.
- The language dictionaries are `generator/locale.en.js`, `generator/locale.vi.js`, `player/locale.en.js`,
  `player/locale.vi.js`; `strings.js` holds formatting helpers. SA1 copied the plan's `strings.js` (erratum E6).
- The hint picks the piece touching the most occupied, blocked or border cells (`core/engine/hints.js:131-140`),
  not a "most constrained" piece; the plan corrects itself at plan:202 (erratum E5).
- The optional "why" hint (plan:230) is a scope question for the owner, not an implementer choice (SA2-Q-P11).
- Pieces must be connected for R3/R7/R8. The planner does not check it, but every input path does: packs
  (`core/engine/pack.js:486`), carving (`core/engine/carve.js:697`), codes (the polyomino catalogue). Document the
  precondition and assert it in `deduce.js` debug builds; no more is needed.

### 1.4 Found by SA1, missed by SA2

- S >= 2 implies G >= 1, so multi-solution puzzles are charged for free choices (§2.2.1; SA1-Q-P1).
- The knobs are about 3 times too steep: guess nodes have 5-28 live alternatives after propagation, so the
  six recipes rate 5, 6, 7, 40, 68, 106 with the plan's knobs; fit the knobs before P2 re-records anything.
- Measured costs: 2-1,059 nodes, at most 5 ms per first pass and 20 ms with the decisive pass on about 6,500 rows.
- G of a unique puzzle does not depend on the row (alternative) order, only on the column tie rule; the order
  study of P0.3 must vary the column tie-break (and, for multi-solution puzzles, the alternative order).
- Measured code lengths: 10x6 46 -> 410-454 characters, 20x18 154 -> 551-566; without metrics 170 and 282.
- The P2 test breakage list (`tests/clues.test.js:58-71, 86-96, 145-177`, `tests/fixtures/clue-recipes.js`,
  `tests/difficulty.test.js:56-66`, `tests/generate.test.js:50`, `tests/pack.test.js:483, 630`,
  `tests/worker-pool.test.js:815`) and the `SCORE` pin at `tests/policy.test.js:371` (keep `SCORE`, add
  `SCORE_V3`).
- Generated sets never contain identical shapes (`core/engine/carve.js:707`); only imported packs can
  (`core/engine/pack.js:574` warns).
- A per-puzzle `made` field makes packs unreadable for every current version (`core/engine/pack.js:55, 200`).
- `carveFlat` has no hooks (`core/engine/carve.js:105`); the full landscape is 105 cells x 20 seeds and only a
  12-cell slice was ever recorded.

---

## 2. Claim-by-claim review of SA2's findings

### 2.1 SA2 §0, the ten top issues

| SA2 # | Claim | Verdict | Evidence and note |
|---|---|---|---|
| 1 | Base maximum 12 versus 16; with 16, U = 10 at tier 3 scores 17 | agree | 16 (1 - e^(-10/6)) = 12.98, + 4 = 16.98 -> 17. Same as SA1 #2 |
| 2 | R9 unsound; R3 needs stronger placement preconditions; R7 must treat pieces as optional | agree | SA2's 3x2 domino/square counterexample and the two 4-cell pockets are good regression tests; adopt both |
| 3 | Score not reconstructible from the metrics; `stop` overloaded | agree | same as SA1 #4; SA2's `deductionTier` separate from guesses is adopted (D2) |
| 4 | A node cap does not bound work; a cap before the first solution supplies no final-path G | agree on both facts | the consequence (skip versus saturate) is an owner question (D3, §2.2.4) |
| 5 | Protocol warning wrong; replay needs task-kind and payload changes | agree | `core/engine/protocol.js:17, 34-37, 491-516, 660, 827-867` |
| 6 | P1 acceptance needs one explicit algorithm (best observed, repairs, exclusions, RNG) | agree | SA2's state machine (SA2 §4 P1) is more complete than SA1's; adopt it, with the plan's stop rule (§3) |
| 7 | P1 bias unproved, signs suspect; piece-order and workspace confusions | agree | same as SA1 §4 P1 and §3 (`countPlacements(preparePlacements(...))`, map by `freePieceSource`) |
| 8 | Generator drops the set attempt; record lacks target level and uniqueness | agree | `generator/jobs.js:296` (no `result.attempt`), `generator/state.js:1300-1328` |
| 9 | Provenance must travel with the candidate from creation | agree | `core/engine/generate.js:350-365, 495-541`; same as SA1 |
| 10 | Old recipes are not a monotone corpus; `--output` missing; runner saves no packs; keep v2 goldens | partly | all true except "not a monotone corpus" in practice: the prototype gives G 0, 0, 0, 2, 3, 6 and Gt 0, 0, 0, 2, 5, 84. Pin the measured values; do not assert monotonicity as a theorem |

### 2.2 Re-checks of the conflicting points

#### 2.2.1 Several solutions force a guess (D1)

Claim (SA1 #1): with sound rules, S >= 2 implies G >= 1 on the path to the first solution. Proof: let X be the
first solution found and Y another. A sound rule never kills a row of any solution, so every row of X and Y stays
live until a branch is taken. A forced placement (R1, R2, R3 place) is the only live row of some column; Y covers
that column with a live row, so the forced row belongs to Y, and likewise to X. Hence every forced row is in
X and Y, and the path to X must contain a branch whose chosen row is not in Y: a guess. No rule of R1-R9 assumes
uniqueness, so this holds for the whole catalogue.

Consequence, for a free binary choice (both alternatives lead to a solution, c = 2, info = 1 bit), relative to a
puzzle with the same U and deduction tier and no guess: `+ a + b - penalty` = `+6 + 4 - 2` = **+8** ('few') or
**+6** ('many'). Several solutions therefore raise the score, against decision 3 of plan §1.3. How far depends on
the reading of the rule term (§2.2.2) and of `base.max`:

| Reading | 'few' puzzles at Hard or above | 'many' puzzles at Hard or above |
|---|---|---|
| base max 12, rule from the deduction tier, tier 1 (SA2's reading) | U >= 8 | U >= 13 |
| base max 12, any guess gives rule 4 (plan literal, SA1 §4) | U >= 3 | U >= 5 |
| base max 16 (knob table), rule from the deduction tier, tier 1 | U >= 5 | U >= 7 |

With SA2's reading, the three 10x6 Easy probe puzzles with two solutions (v2 score 10, U = 3)
rate 13-15 (Normal) instead of SA1's 17; 20x18 puzzles (U = 9-13) with two to seven solutions still reach Hard
by a free choice alone. SA2's Q-P03 describes the same effect for identical pieces ("identity swaps can look
hard") but not for multi-solution puzzles in general, which are 1,656 of 4,204 accepted puzzles
(`docs/calibration/bq-0-latest.md:223-224`).

Fix (unchanged, SA1-Q-P1 b): at guess node i with c_i live alternatives, k_i of which lead to at least one
solution, `info = sum log2(c_i / k_i)` and `G = #{i : k_i < c_i}`. On a unique puzzle k_i = 1 and nothing
changes; a free choice costs nothing; the penalty then lowers the score as decided. Cost: an existence search
per alternative, bounded by the work cap (prototype: at most 20 ms on 20x18).

#### 2.2.2 The rule term of a puzzle that needs a guess (D2)

The plan defines `tier` as "1..3, or 4 when a guess was needed" (plan:220-221) and the rule term as "tier >= 3
-> 4" (plan:295), so literally every guessing puzzle gets the full rule term 4. But its worked example "one binary
guess on a 6-piece puzzle ~ 10 + 6 + 4 = 20" (plan:303) uses base(6) = 10 (that is, base max 16) and a rule term
of 0. SA1 followed the literal text; SA2 defines `deductionTier` without guesses and the rule term from it. SA2's
reading is better: it keeps the rule term informative for guessing puzzles (a guess plus a parity argument is
harder than a guess plus forced moves) and does not push small boards with one guess (U = 3) into Hard. SA1
adopts it. The plan author should confirm it together with base max 12 (merged question M-P2, §3).

#### 2.2.3 Rule soundness (R3, R7, R8, R9)

No conflict. Merged specification for the task packs:

- R3: contradiction when a free region's size is not a sum of distinct remaining piece sizes (pieces are
  connected, so a piece touching the region lies inside it); place only when the size is not a sum of two or
  more remaining sizes and exactly one live row covers exactly the region. Tests: SA2's two 4-cell pockets with
  a square tetromino and two dominoes (no placement), and a 5-cell pocket with one pentomino (placement).
- R7: per region, the reachable (size, imbalance) pairs over subsets of the pieces that have a live row inside it,
  each used at most once; a row is killed when the region's remainder after it is unreachable. SA2's two
  T-shaped regions with two T pieces is the negative test.
- R8: for a live row covering an articulation cell, remove its footprint, recompute the real components and apply
  R3; an undecided DP never kills. With `lookaheadWidth` 4, R6 already covers necks with at most 4 live rows.
- R9: only when the support of both cells is exactly {P, Q} and no live row covers both cells. SA2's 3x2 board
  (domino + square, two solutions) is the regression test.
- Soundness tests enumerate every solution of tiny boards (SA2), not one planted solution (plan).

#### 2.2.4 Cap hit before the first solution (D3)

Both facts of SA2 #4 hold: there is no final path, so the plan's "G, info are whatever was found before the cap"
(plan:301) is not a lower bound of anything. But the plan chose saturation on purpose ("saturation is acceptable
there, as it is for B today", plan:367-368), and SA2's option (a) rejects such candidates, which can remove the
hardest levels on big boards. This is an owner question (SA2-Q-P02 = merged M-P4). SA1's recommendation: keep the
plan's saturated rating with '+', define the published G and info as those of the current DFS path at the cap
(documented as "search budget exhausted", like B at its cap today), and make P0.3 report the cap hits per board
and level; if any offered level below hell-1 hits the cap, raise the cap rather than publish more '+' ratings.
Add SA2's work counters in any case.

#### 2.2.5 Protocol (no conflict)

Verified again: `core/engine/protocol.js:827-867` passes worker results through; `readRatingClaim` (491-516) serves
`encodePuzzleCode` snapshots only. v3 needs no protocol change; `replayPuzzle` needs `TASK_KINDS` (34),
`PAYLOADS`, `PAYLOAD_FIELDS` (660) and a bounded payload reader.

#### 2.2.6 Code length and QR (D7)

SA2 lists the limits; SA1 measured the lengths. Together: URL <= 16,000 characters with a warning above 4,000
(`core/engine/sharecode.js:11-13`), code <= 16,000 symbols (`core/engine/puzzlecode-input.js:12`), rating JSON
<= 8,192 bytes (`core/engine/puzzlecode-v1.js:55`), QR version 40 with at most 4,296 alphanumeric characters
(`core/browser/qr.js:48, 56`). The measured v3 codes (at most about 800 characters on 20x18) fit every limit, so
the question is code size (10x6: 9-10 times longer), not feasibility. 26x26 must still be measured (GC-P2). Both
options remain open for the owner (merged M-P6); SA1 keeps "no metrics in codes" because the Player shows only
level, score and saturation (`player/app.js:405, 425`) and packs keep the metrics.

#### 2.2.7 Per-puzzle provenance location (D5)

SA2 puts the provenance record in `Puzzle` / `PackPuzzle` and the pack reader/writer. `PUZZLE_FIELDS`
(`core/engine/pack.js:55`) is a closed set and an unknown field fails the read (`core/engine/pack.js:200`), so every
current Player and Generator would refuse such packs. `generation` is free-form JSON that current versions keep
(`core/engine/pack.js:978-979`). SA1 keeps `generation.made` (a map from puzzle id to record) and adopts SA2's
record content (versioned, set origin and candidate origin, observed start, bounded skipped set). Owner question
merged M-P8.

#### 2.2.8 Identical shapes (D6)

SA2's option (b) needs a multiplicity-aware solver (remaining counts per shape, quotiented alternatives and
solution counts) for a case that generated sets never produce (`core/engine/carve.js:707`). SA1 keeps (c): per-piece
rules, raw counts as `certify`, the limitation documented. If the owner wants (b), it is a separate Medium task
after the catalogue (merged M-P7).

#### 2.2.9 Order noise (D9)

The plan gives a conditional rule: median of 3 tie-break variants if G varies by more than about 1 at Hard
(plan:461-463). For a unique puzzle G, Cmax, Dmax and info depend only on the column tie rule (the propagation
fixpoint of monotone sound rules does not depend on rule order, and the path to the only solution does not depend
on the order in which alternatives are tried). P0.3 should therefore vary the column tie-break (and the
alternative order for multi-solution puzzles) and report the spread. SA1 agrees with SA2's recommendation (a), one
canonical order, and treats the plan's trigger as a decision to take with the P0.3 data (merged M-P5).

### 2.3 SA2 §1-§4, other claims

| SA2 claim | Verdict | Note |
|---|---|---|
| §1.2 six-order probe of the sample pack: Hard B 3-14, scores 17-21 | agree | confirms the noise argument; SA1's prototype shows two B = 6 puzzles with G = 0 and G = 3 |
| §2 "Hint is most constrained piece: imprecise" | agree | `core/engine/hints.js:131-140` (erratum E5) |
| §2 multiple solutions: 1,656 proved, 1,445 unproved, 94 unchecked | agree | do not call the rest unique |
| §3.1 anchors (`types.js` 55-64 / 66-74, `placements.js:46-47`) | minor drift | `MAX_NONZEROS` is at `core/engine/placements.js:48`; the typedef ranges differ by one line between the reports, immaterial |
| §3.1 completion stream `completion/<layout key>` | agree | relevant for SA2-Q-P10 b |
| §3.2 omitted files (`generator/jobs.js`, `generator/state.js`, `core/engine/version.js`, bench files) | agree | added to the merged ownership lists (§4) |
| §4 P0.2 `DeductionResult` with `first`, `search`, `count` | agree in substance | adopt, with `first.G` and `first.info` per the Q-P1 answer and `deductionTier`; no published G when `first` is null unless M-P4 keeps saturation |
| §4 P0.2 count classes (`few` even if work expires, `unknown` for non-exhaustive 0/1, `solution-limit` stop) | agree | same as SA1 R4 |
| §4 P0.2 no R6 inside R6; R3 check only inside the lookahead | agree | as in SA1's prototype |
| §4 P0.2 Dmax must be defined | agree | define as the guess depth on the final path (equals G on a simple DFS path) or drop it |
| §4 P0.3 JSONL record, timing excluded from semantic comparison, stderr progress | agree | add decisive G/info, cap hits, rule counts, `--knobs` scoring (SA1 §4 P0.3) |
| §4 P1 integer centre `(min + max - 1)/2` | disagree (implementer) | keep the real centre of `ranked()` (`core/engine/clues.js:171`) so the beam and the acceptance agree; a band whose upper edge overflows (`max: bandEdge(index + 1)`, `core/engine/levels.js:66`; first at hell-1899) accepts the first in-band hit, explicitly (SA2's Infinity point, a remote edge case) |
| §4 P2.1 one `breakdownV3` for score and replay table, frozen nested policy | agree | same as SA1 |
| §4 P2.3 bound total metrics; keep v2 goldens | agree | bound: 4,096 bytes (current readers), so `choices` must be bounded or compacted |
| §4 P2.4 measure 676-cell, tails, worst-case metrics | agree | assign to the activation task (GC-P2) |
| §4 P2.5 derived display rating keyed by fingerprint and model version; stale replies dropped | agree | adopted (D4) |
| §4 P3 three validations; runner retention; G naming; bounded shards | agree | `tools/bench/runner.js:684-695`, `tools/bench/calibration-reference.js` |
| §4 P4.1 versioned `SetOrigin` / `Made` records | agree on content | location per M-P8; skipped subsets bounded (SA1: at most 32 keys plus an overflow flag; SA2: bitsets); either is fine |
| §4 P4.2 observers separate from control hooks; bounded steps and bytes; repairs recorded | agree | `core/engine/carve.js:514-523` |
| §4 P4.4 dedicated dialog module, sibling button, `highlightedIds` overlay, no orphan timers | agree | `generator/ui/puzzle-panel.js:293-296`, `core/browser/svg-board.js` |
| §5.1 implementer-level corrections | agree with all ten | |
| §7 risks | agree | add SA1's: knob steepness (levels misplaced until fitted) and multi-solution inflation |

---

## 3. Owner questions

### 3.1 SA2's questions against SA1's

| SA2 question | Overlap with SA1 | SA1 position |
|---|---|---|
| SA2-Q-P01 base formula 12 or 16 | SA1 R1 (implementer: 12) | plan-author question, not owner: the plan's formula says 12 and decision "G = 0 never Hard" excludes 16 without a clamp; answer (a). Merge with the rule-term reading (§2.2.2) as M-P2 |
| SA2-Q-P02 cap before the first solution | SA1 R3 (saturated) | owner question (the plan chose saturation, SA2 proposes a change); SA1 recommends the plan's saturation with a defined proxy and cap-hit statistics (§2.2.4) |
| SA2-Q-P03 interchangeable copies | SA1-Q-P6 | conflict: SA2 (b), SA1 (c); owner |
| SA2-Q-P04 how much centre search | SA1 R11 | not an owner question: the plan fixes the stop rule (plan:259-261, central half, `limit - 16`, beam end); the "tune" is the 16, to be measured at GF-P1 / GA-P1 |
| SA2-Q-P05 placement-weighted sampling | SA1-Q-P5 | same answer (a); keep as owner question (plan marks it optional) |
| SA2-Q-P06 order aggregation | SA1 R12 | the plan has a conditional rule (plan:461-463); decide with the P0.3 data; SA1 agrees (a). Deferred owner question |
| SA2-Q-P07 code does not fit a QR | SA1-Q-P3 | same subject (codes); merge; every measured v3 code fits, so the question is size; conflict on the answer |
| SA2-Q-P08 re-rating presentation | SA1-Q-P2 | now agree: (a), re-rate for display, stored claim and code unchanged, note shown, print consistent |
| SA2-Q-P09 K60 / SHARES ranges | SA1 §4 P3 | the plan already allows knob changes in P3 (plan:364-366, 456); no owner decision needed beyond the plan's criteria; record changes in the calibration report. "~10 points" means percentage points of hit rate (agree with SA2) |
| SA2-Q-P10 replay provenance and fallback | SA1-Q-P4 (location) | complementary: SA2 asks what is stored, SA1 where; agree with SA2 (a) on content; completion puzzles show stages 1-3 and 7 only |
| SA2-Q-P11 optional Player "why" hints | SA1 §4 P0.2b (left out) | agree (a), exclude; a scope question the owner can answer in one word |

### 3.2 Questions missing from SA2's list

- SA1-Q-P1 (decisive guesses): the most important question; SA2 has no counterpart.
- SA1-Q-P4 (provenance location): SA2's records imply a pack format change without asking.

Missing from both reports: none that needs the owner. Implementer-level items both missed are listed as merged
resolutions in §4.3 (metrics byte bound, CRLF of re-recorded fixtures, runner naming).

### 3.3 Merged question list proposed for `clarifications.md`

| Merged id | Sources | Question | SA1 recommendation |
|---|---|---|---|
| M-P1 | SA1-Q-P1 | Do free choices of multi-solution puzzles count as guesses? | no: decisive guesses only, `info = sum log2(c/k)` |
| M-P2 | SA2-Q-P01 + D2 | Formula constants: base max 12 or 16; rule term from the deduction tier or "4 for any guess" | 12; deduction tier (plan author) |
| M-P3 | SA2-Q-P11 | Optional Player "why" hints in this release? | no |
| M-P4 | SA2-Q-P02 | Cap hit before the first solution: saturated '+' or candidate rejected | saturated '+' with a defined proxy and cap statistics |
| M-P5 | SA2-Q-P06 | One canonical order, or median of 3 if P0.3 shows spread | one order; decide with P0.3 data |
| M-P6 | SA1-Q-P3 + SA2-Q-P07 | v3 claims in puzzle codes: full JSON, no metrics, compact codec, none | no metrics in codes (SA2: full JSON) |
| M-P7 | SA1-Q-P6 + SA2-Q-P03 | Identical shapes: raw or quotiented G and S | raw, documented (SA2: quotiented) |
| M-P8 | SA1-Q-P4 + SA2-Q-P10 | Provenance: where (`generation.made` or per-puzzle field) and what (completion, bounded trace) | `generation.made`; SA2's record content; completion shows stages 1-3 and 7 |
| M-P9 | SA1-Q-P2 + SA2-Q-P08 | Old v2 ratings in the apps | re-rate for display with a note (agreed) |
| M-P10 | SA1-Q-P5 + SA2-Q-P05 | Placement-weighted clue sampling | skip (agreed) |

SA2-Q-P04 and SA2-Q-P09 are proposed as implementer resolutions (§4.3), not owner questions.

---

## 4. Task breakdown

### 4.1 Comparison

| Aspect | SA2 (PV3-01..14) | SA1 (PT1..PT11) | Merged |
|---|---|---|---|
| Deduction | three tasks: core, R3-R6, R7-R9 | two: core with R6, catalogue | two after the model task: core with R1, R2, R6 and the R3 check (plan P0.2); catalogue (R3 place, R4/R5, R7-R9), split R7-R9 off if over 1,600 lines |
| Probe and knobs | probe; knobs in the final calibration | probe plus knob fit before activation | probe plus knob fit before activation |
| P1 | after the probe, serial | parallel with the deduction tasks | serial (one checkout; shared `tests/artifacts/`, docs and `policy.js`) |
| v3 model | pure functions, then activation | one task | two tasks (SA2): pure score and types, then activation |
| Calibration | tooling after activation, final run last | after the app follow-ups, before P4 | tooling after activation; run and lock before P4 |
| P4 | provenance, engine, UI | same | same |
| Parallelism | none inside the repository | PT4 beside PT1-PT3, PT6 beside PT7 | none inside the repository; Pentomino and Sudoku run in parallel |

### 4.2 Merged breakdown (one developer, sequential)

Every task ends with `npm run test:quick` and `npm run check` green (never two runs at once) and one commit;
re-recorded files are normalised to CRLF before `git add` (`* text=auto`, `core.safecrlf=true`). "Gate" lists the
pre-approved runs the task's developer performs and records.

| Id | Title and scope | Depends on | Files owned (exclusive while active) | Gate | Size |
|---|---|---|---|---|---|
| P-01 | Model fields and liveness guard (P0.1) | - | `core/engine/tiling.js`, `core/engine/placements.js` (only if a field is missing), `tests/tiling.test.js` | - | S |
| P-02 | Deduction core (P0.2): reversible state, R1, R2, R6 with the R3 contradiction check, MRV guess, decisive G per M-P1, count classes, work counters, memory accounting, `DeductionResult` | P-01; M-P1, M-P4 | `core/engine/deduce.js` (new), `DEDUCE` in `core/engine/policy.js`, `tests/deduce.test.js` (new) | - | L |
| P-03 | Rule catalogue (P0.2b): R3 place, R4/R5 column-subset rule, R7, R8, R9 (sound forms of §2.2.3), `deductionTier`, rule counts, all-solutions soundness oracle | P-02; M-P7 | `core/engine/deduce.js`, `tests/deduce-rules.test.js` (new) | - | L (split R7-R9 into P-03b if over 1,600 lines) |
| P-04 | Probe tool and knob fit (P0.3): JSONL, tie-order diagnostics, cap statistics, `--knobs`, proposed `SCORE_V3` | P-03; M-P2 | `tools/rate-probe.mjs` (new), `tests/rate-probe.test.js` (new), diagnostic seam in `core/engine/deduce.js`, `docs/difficulty-v3/probe-<date>.md` (new) | bounded probes | M |
| P-05 | Centre-seeking clue selection (P1) with SA2's state machine; `ALGO_ID` -> `gen-v3` | P-04; M-P10 | `core/engine/clues.js`, `core/engine/version.js`, `tests/clues.test.js`, `tests/fixtures/generation-case.json`, `tests/fixtures/generated-sample-pack.json`, `docs/design-detail.md` §6.10, §6.11, §7.6 | GF-P1, GA-P1 | M |
| P-06 | v3 score and types (pure): `breakdownV3`, `scoreV3`, `SCORE_V3` (fitted), `MetricsV3`, `RatingV3`; default model stays v2 | P-05; M-P2, M-P5 | `core/engine/difficulty.js` (new exports only), `SCORE_V3` in `core/engine/policy.js`, `core/engine/types.js`, `tests/difficulty-v3.test.js` (new, quick part) | - | M |
| P-07 | Activate v3: `measureV3`, `rate()`, pack v3 strict and v2 legacy, metrics <= 4,096 bytes, codes per M-P6, pinned-test and recipe updates, docs §7 / §14.1, brief, guides | P-06; M-P6 | `core/engine/difficulty.js`, `core/engine/pack.js`, `core/engine/puzzlecode*.js` (if M-P6 needs it), `tests/difficulty.test.js`, `tests/pack.test.js`, `tests/clues.test.js`, `tests/fixtures/clue-recipes.js`, `tests/generate.test.js`, `tests/worker-pool.test.js`, fixtures, `docs/design-detail.md` §7, §14.1, `docs/design-brief.md`, guides | GF-P2, GA-P2, GC-P2 (incl. 26x26) | L |
| P-08 | Old ratings in the apps (P2.5 per M-P9): derived display rating, lazy worker request, stale replies dropped, print/share captions | P-07 | `player/state.js`, `player/app.js`, `player/locale.en.js`, `player/locale.vi.js`, `generator/state.js` (display part), `generator/ui/puzzle-panel.js` (rating line), `generator/locale.en.js`, `generator/locale.vi.js`, `core/browser/print-dialog.js`, their tests | GC-P2 (UI part) | M-L |
| P-09 | Calibration tooling: v3 metrics in runner and report, rename the clue count, bounded pack capture or exact recipes for `rate-probe`, slow test | P-07 | `tools/bench/runner.js`, `tools/bench/report.js`, `tools/bench/calibration-reference.js`, `tests/calibration.test.js`, `tests/difficulty-v3.test.js` (slow part) | - | M |
| P-10 | Calibration run and lock (P3): reduced then full landscape with `--output docs/difficulty-v3/...`, knob, K60 and `SHARES` changes within the plan's criteria, final fixtures | P-08, P-09 | `core/engine/policy.js` (knobs), `core/engine/levels.js` (`SHARES` only), fixtures, `docs/difficulty-v3/calibration-<date>.md` (new), docs facts | GL-P3; GF/GA again if knobs change | M |
| P-11 | Provenance (P4.1 per M-P8): candidate origin from creation, observed start, bounded skips, set origin through jobs, state, saved sets and export; a genuine replay fixture | P-10; M-P8 | `core/engine/generate.js`, `core/engine/clues.js` (`onSkip` only), `core/browser/generation-client.js`, `generator/state.js`, `generator/jobs.js`, `core/engine/types.js`, `core/engine/pack.js` (only for a per-puzzle field), tests, new replay fixture | GF-P4, GA | L |
| P-12 | Recorders and replay task (P4.2, P4.3 data): observers, `core/engine/replay.js`, `replayPuzzle` with main and scratch workspaces, version preflight, exact final-state comparison | P-11 | `core/engine/replay.js` (new), `core/engine/carve.js`, `core/engine/tiling.js`, `core/engine/clues.js`, `core/engine/generate.js`, `core/engine/tasks.js`, `core/engine/protocol.js`, `tests/replay.test.js` (new) | - | L (split into recorders and replay if over 1,600 lines) |
| P-13 | Generation Steps dialog (P4.3 views, P4.4) | P-12 | `generator/ui/replay-dialog.js` (new), `generator/app.js`, `generator/ui/puzzle-panel.js`, `core/browser/svg-board.js` (additive `highlightedIds`), CSS, `generator/locale.*.js`, `tests/browser/replay.*` (new), `docs/design-detail.md` §5.2, §5.5, §6.12, §8.1, §10.5, §11.11, brief, guides, README | GB-P4; final `npm test` | L |

```
P-01 -> P-02 -> P-03 -> P-04 -> P-05 -> P-06 -> P-07 -+-> P-08 -+-> P-10 -> P-11 -> P-12 -> P-13
                                                      +-> P-09 -+
```

Parallelism: none inside the repository (shared `tests/artifacts/`, `core/engine/policy.js`, `docs/design-detail.md`
and fixtures). P-08 and P-09 are file-disjoint and could run in a second clone, but the gain is small. The whole
chain runs in parallel with the Sudoku chain.

### 4.3 Merged implementer resolutions (beyond SA1 §5.1 and SA2 §5.1)

- Metrics byte bound: a v3 claim's metrics stay under 4,096 bytes (current readers); test the largest case.
- Rename the bench runner's clue count (`G` -> `clues`) in new records; keep old records unchanged.
- `tools/calibrate.mjs` always gets `--output docs/difficulty-v3/<name>`.
- Fixtures written by tools are normalised to CRLF before staging.
- The P1 stop rule is the plan's (central half, `limit - 16`, beam end), the centre is `ranked()`'s real centre,
  a band with an infinite upper edge (hell-1899 and above) accepts the first hit (SA2-Q-P04 resolved here).
- K60 and `SHARES` may change in P3 under the plan's criteria; changes and reasons go in the calibration report
  (SA2-Q-P09 resolved here).
- `start` in provenance is the observed outcome; completion puzzles have no stage 4-6 replay.

### 4.4 Effort

SA2 estimates 88-139 hours of engineering effort; SA1 31-47 hours of developer-agent time. They measure different
things. After this review SA1 raises its agent-time estimate to 40-60 hours (work counters, memory accounting,
P1 state machine, P2.5 display rating, provenance through Generator state, replay workspaces), plus the gate
runs (two `npm test` runs, fixture recordings, the landscape, the browser page). The joint report should give
agent hours per task and name the long runs separately.

---

## 5. Errata to SA1's report

| Id | SA1 text | Correction |
|---|---|---|
| E1 | §0 #1, §4 P0.2, SA1-Q-P1: "every puzzle with 2-7 solutions and U >= 3, or 8+ solutions and U >= 5, scores at least 17"; "10x6 Easy puzzles with two solutions rate 17" | true only with the literal rule term (any guess gives 4). With the deduction-tier reading (now preferred) the thresholds are U >= 8 ('few') and U >= 13 ('many'), and those 10x6 puzzles rate 13-15 (Normal). The direction (+6 to +8 for a free binary choice) and the fix are unchanged (§2.2.1) |
| E2 | §4 P2.1 "the plan's examples ... correct"; `SCORE_V3.rule` `[0, 0, 2, 4, 4]` | the plan's "~ 20" example implies base max 16 and rule 0; use the deduction tier for the rule term (`rule: [0, 0, 2, 4]` by `deductionTier`), pending M-P2 |
| E3 | §5.2 SA1-Q-P2 recommendation (b) | (a): re-rate for display, as SA2 specifies (owner scope is the full plan) |
| E4 | §4 P2.3 "a v3 claim is about 400 bytes ... acceptable" | add: current readers bound non-current metrics to 4,096 bytes (`core/engine/pack.js:802-811`); this is a hard limit for v3 metrics |
| E5 | §2.2 "Hints use 'most constrained piece': verified" | imprecise: the hint takes the piece touching the most occupied, blocked or border cells (`core/engine/hints.js:131-140`) |
| E6 | §4 P4 "strings in `generator/strings.js` both languages"; PT7 and PT11 file lists | the dictionaries are `generator/locale.en.js`, `generator/locale.vi.js`, `player/locale.en.js`, `player/locale.vi.js` |
| E7 | §4 P3 "its header suggests `--output`" | `--output` is mandatory (`tools/calibrate.mjs:122-124`) |
| E8 | §6 "PT4 is file-disjoint from PT1-PT3 and can run beside them" | withdrawn: one developer per checkout, sequential (§4.2) |
| E9 | §4 P4 "Gate: fixtures re-recorded once (the sample pack gains provenance)" | the sample pack is built from `sample/<level>/<i>` streams (`tools/record-fixtures.mjs:144`) and cannot carry ordinary provenance; add a separately generated replay fixture |
| E10 | §4 P0.3, R12 "G of a unique puzzle does not depend on the row order" | unchanged, but add: for multi-solution puzzles the alternative order decides which solution is found first, so the order study varies both the column tie-break and the alternative order |
