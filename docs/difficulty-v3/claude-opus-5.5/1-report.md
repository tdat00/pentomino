# difficulty-v3 plan: independent analysis (SA1, claude-opus-5.5)

Status: analysis report, 2026-11-12, of `docs/difficulty-v3/plan.md` against the code at HEAD `77e62cb` (branch
`rating-v3`). Read-only: no file of the repository was changed except this report. Probe outputs and throw-away
scripts stayed outside the repository. Paths are relative to the repository root.

Owner decisions received during the analysis and applied here: the scope is the full plan (P0 to P4); every
APPROVAL GATE run named by the plan is pre-approved and is assigned to the task that needs it (§6); every new
design decision is listed as an Owner question (§5.2) and is not treated as adopted.

---

## 0. Summary and verdict

The plan is well researched: its findings reproduce exactly, and almost every line anchor is right (§2, §3). The
direction (a deduction solver, a required real choice for Hard, a v3 model fitted to the frozen bands, centre-seeking
clue selection, recomputed Generation Steps) is sound and implementable. But the v3 model **as specified cannot
satisfy two of the owner's fixed decisions**, the starting knobs are far from real data, and several specifications
are unsound or incomplete. None of this needs a new direction; it needs corrections before P2 and a different order
for calibration.

Top issues (details in §4):

1. **Several solutions raise the v3 score instead of lowering it.** Sound deductions never remove a row of any
   solution, so every puzzle with two or more solutions has at least one guess node (G >= 1) on the path to the
   first solution. With the plan's formula and knobs, every puzzle with 2-7 solutions and U >= 3, or with 8+
   solutions and U >= 5, scores at least 17 (Hard). Measured: 10x6 Easy puzzles of today with two solutions rate
   17 (Hard). This contradicts decision 3 of §1.3. Fix: count only *decisive* guesses (some alternative fails),
   information `log2(c/k)` (Owner question Q-P1).
2. **`SCORE_V3.base.max = 16` contradicts the formula (`12`) and breaks "G = 0 never reaches Hard".** The guarantee
   holds iff `base.max + rule(tier 3) <= 16.5`; with 12 + 4 it holds, with 16 + 4 it does not (§4 P2.1).
3. **The knobs are about 3x too steep for real data.** Guess nodes have 5-28 live alternatives after propagation and
   lookahead, not 2 (prototype, §2.3). With a = 6, b = 4 the six 10x6 recipes rate 5, 6, 7, 40, 68, 106 (very-easy,
   very-easy, very-easy, master, nightmare, hell-1). Calibrate the knobs from the P0.3 probe *before* P2 re-records
   fixtures; otherwise fixtures, recipes and tests are rewritten twice.
4. **The v3 metrics shape is incomplete and ambiguous.** The listed metrics lack `tier`, the information sum and the
   per-rule counts, so neither a pack reader nor `breakdown()` (P4.3) can recompute the score; `stop` is used for
   both the DLX stop and the deduction stop; `saturated = stop === 'node-cap'` also fires when the cap is hit after
   the first solution, during the solution count.
5. **Rule catalogue soundness.** R9 as written is unsound (it needs "no live row covers both cells"); the "place"
   half of R3 is unsound as written; "group duplicate shapes in R4/R5/R9" is ill-defined, and generated sets never
   contain duplicate shapes (`core/engine/carve.js:707`).
6. **P0.1 exposes too little.** The region check and the parity rule need `width`, `height` and the piece sizes;
   duplicate handling needs shape identity; and "`deduce.js` imports only `./policy.js`" contradicts the use of
   `geometry.js` `canonicalKey`.
7. **The protocol claim is wrong.** Worker results are not validated (`core/engine/protocol.js:827-867` passes
   `value` through) and the only rating reader (`protocol.js:491-516`) is for `encodePuzzleCode` snapshots and
   accepts any plain metrics. v3 needs no protocol change; P4's new task kind does.
8. **P2.4 "no change" makes puzzle codes about 9x longer** (measured, §4 P2.4: a 10x6 code grows from 46 to 410-454
   characters, a 20x18 code from 154 to 551-566) (Q-P3).
9. **P2 breaks more than it lists.** `tests/clues.test.js` (v2 recipe scores, band targets 34-36 / 36-38, the
   nightmare/hell-1 "unreachable" test), `tests/fixtures/clue-recipes.js`, `tests/difficulty.test.js:56-66`,
   `tests/worker-pool.test.js:815`, `tests/generate.test.js:50` all pin v2 values.
10. **P4.1 provenance has gaps.** The Generator never stores the set attempt (`generator/state.js:1300-1328` writes
    no `setAttempt`); the accepted candidate can be the slot's `best` from an earlier attempt
    (`core/engine/generate.js:528`), so `(slot, attempt)` must travel inside the candidate; a per-puzzle field
    `made` makes packs unreadable for current versions (`core/engine/pack.js:200`, unknown field = error) (Q-P4).
    Also P1's sampling bias reasons in the wrong direction (Q-P5).

Verdict: **execute, with the corrections of §4 and §5.1 and the owner answers of §5.2**, in the order of §6.

---

## 1. Baseline at HEAD `77e62cb`

Windows, Node v26.13.0, run from the repository root.

| Command | Result | Duration |
|---|---|---|
| `npm run test:quick` | 1,110 tests in 111 suites, 1,110 pass, 0 fail, 0 skipped | 15.9 s (16.7 s wall) |
| `npm run check` | `check-conventions: OK`, `check-site: OK` | 1.1 s |

A first quick run started while SA2 ran its own quick set on the same tree failed once:
`tests/calibration.test.js:284` ("the smoke matrix writes valid reports ... resumes only a matching checkpoint"),
`['fail', 'node-screening-only']` instead of two `node-screening-only`. Both runs share
`tests/artifacts/t21-calibration/node-smoke`; the test passes when run alone. It is an environment collision, not a
code fault, but it matters for the task plan: **never run two Pentomino quick sets at the same time on one working
tree** (one developer per repository, or separate clones).

---

## 2. Findings verified

### 2.1 The probe of §6 (reproduced 2026-11-12, same commands, `--workers 4`)

| Board / level | K | Piece sizes | U | B | v2 score | Plan §1.1 |
|---|---|---|---|---|---|---|
| 10x6 easy (`--seed probe0`, 5) | 7 | 7..11 | 3 | 2, 2, 2, 1, 2 | 10, 10, 10, 8, 10 | same; sizes "6..11" (seed not given) |
| 10x6 hard (`probe1`, 5) | 9 | **4..9** | 6 | 32, 10, 6, 13, 6 | 24, 20, 19, 21, 19 | same, but sizes "5..8" |
| 20x18 hard (`probe2`, 3) | 16 | 19..27 | 9, 10, 10 | 0, 0, 2 | 18, 20, 24 | same |
| 20x18 expert (`probe3`, 3) | 18 | 14..24 | 13 | 17, 8, 7 | 36, 34, 33 | same |

All numbers of §1.1 reproduce exactly except the piece-size range of 10x6 Hard (4..9 measured, 5..8 written).
Every set was macro-carved. Certificates are lazy and absent from the pack JSON of `tools/generate.mjs`.

### 2.2 The code-level causes of §1.2

| Claim | Status | Evidence |
|---|---|---|
| `D = round(2U + 8 log10(1 + B))`, `U = 0 -> 0` | verified | `core/engine/difficulty.js:37-45`; `SCORE` at `core/engine/policy.js:48-52` |
| B = branch trials of one canonical MRV DLX search, forced rows not counted | verified | `difficulty.js:58-100` -> `core/engine/tiling.js:140-157` -> `core/engine/dlx.js:136`, branch count `dlx.js:303-310` (`choices >= 2`) |
| R and H measured, not scored | verified | `difficulty.js:69-77` (bits), `95-96` |
| Bands, `inBand` only | verified | `core/engine/levels.js:42-44`, `difficulty.js:121-123`. Edges: easy 8, normal 12, hard 17, expert 25, master 37, nightmare 53, hell-1 77, hell-2 112 |
| `SHARES`, `initialClueCount` | verified | `levels.js:18`, `levels.js:125-127` |
| `selectClues` two phases, first in-band hit returned | verified | `core/engine/clues.js:183-368`, `accept` 258, constants 50-53, `BUDGETS.clueSubsets` `policy.js:66` |
| `ranked()` prefers the centre, used only for the beam | verified | `clues.js:170-175`, used at 349 and 366 |
| `makeUnique` only in `require`; `countSolutions` exists | verified | `clues.js:111-151`, `tiling.js:170-181` |
| Rating in codes and packs | verified | `core/engine/puzzlecode-v1.js` `RATING` 111-124, `writeRating` 958 (JSON branch 964-967), `readRatingField` 1003-1008, `ratingJsonBytes` 55; `core/engine/pack.js` `readRating` 774-838, `ratingClaim` 1193-1207, `readMetricsV2` 734 |
| UIs show only `level`, `score`, `saturated` | verified | `player/app.js:405, 425`; `player/strings.js:94-99`; `generator/ui/puzzle-panel.js:79, 119, 140`; `core/browser/print-dialog.js:45-62`. No app code filters on `rating.model` |
| Hints use "most constrained piece" | verified | `core/engine/hints.js:140` (`chooseHintPlacement`, to 183) |
| 1,656 of 4,204 accepted puzzles with several solutions | verified | `docs/calibration/bq-0-latest.md:223-224`; the same line also counts 1,445 "not proved" and 1,416 score-saturated puzzles (34 %) |

### 2.3 Prototype of the deduction solver (evidence for §4)

To test the model before reviewing it, a throw-away implementation of P0.2 (R1, R2, the R3 region check inside
the R6 one-step lookahead with width 4, MRV guess with the plan's tie rule, solution count to 8, node cap 20,000)
was run on the probe packs and on the six recipes of `tests/fixtures/clue-recipes.js`. It has none of R4, R5,
R7-R9, so its G is an upper bound of the plan's. "Decisive" counts only guess nodes where some alternative leads to
no solution, with information `log2(c/k)` (k = alternatives that lead to a solution). v3 uses the plan's knobs.

| Puzzle | v2 | U | G | sum log2 c | Cmax | S | decisive G / info | nodes, ms | v3 plan | v3 decisive |
|---|---|---|---|---|---|---|---|---|---|---|
| recipe very-easy / easy / normal | 6 / 8 / 12 | 3 / 4 / 5 | 0 | 0 | 0 | 1 | 0 / 0 | 2, 0 | 5 / 6 / 7 | same |
| recipe hard | 22 | 7 | 2 | 3.91 | 5 | 1 | 2 / 3.91 | 25, 1 | 40 | 40 |
| recipe expert | 25 | 8 | 3 | 9.30 | 10 | 1 | 3 / 9.30 | 116, 1 | 68 | 68 |
| recipe master | 43 | 10 | 6 | 14.11 | 7 | 1 | 6 / 14.11 | 1,059, 17 | 106 | 106 |
| 10x6 easy, 3 of 5 | 10 | 3 | 1 | 1.00 | 2 | 2 | **0 / 0** | 7, 2 | **17** | 3 |
| 10x6 easy, 2 of 5 | 8-10 | 3 | 0 | 0 | 0 | 1 | 0 / 0 | 2, 1 | 5 | 5 |
| 10x6 hard (B 32, 10, 6, 13, 6) | 19-24 | 6 | 3, 1, **0**, 2, 3 | 7.6, 3.5, 0, 4.5, 9.8 | 11-15 | 4, 4, 1, 4, 4 | 3, 1, 0, 2, 3 | 2-220, <= 3 | 58, 29, 8, 39, 67 | 50, 21, 8, 31, 59 |
| 20x18 hard (B 0, 0, 2) | 18-24 | 9-10 | 0, 0, 1 | 0, 0, 4.2 | 18 | 1, 1, 4 | 0, 0, 1 | 2-39, <= 4 | 9, 10, 34 | 9, 10, 26 |
| 20x18 expert (B 17, 8, 7) | 33-36 | 13 | 4, 4, 2 | 12.7, 16.2, 8.1 | 17-28 | 8+ | 4, 4, 2 | 47-152, <= 19 | 85, 99, 55 | 73, 87, 43 |

What it shows: (a) G is monotone over the recipes (0, 0, 0, 2, 3, 6) and Gt too (0, 0, 0, 2, 5, 84), so the
monotonicity test of P0.2 is plausible; (b) the B noise is real: two 10x6 Hard puzzles with B = 6 have G = 0 and G = 3;
(c) the 20x18 Hard puzzles with B = 0 are forced (G = 0) and fall to Easy (9-10), as §5 of the plan expects; (d) the
cost is small (at most 5 ms for the first-solution pass on 6,500 rows, 20 ms with the decisive pass), so
`DEDUCE.nodes = 20000` is generous at these sizes; (e) the plan's knobs put the levels in the wrong bands, and
multi-solution puzzles with free choices jump to Hard.

---

## 3. Anchors and APIs checked

| Plan reference | Status | Note |
|---|---|---|
| §2 `tiling.js` `buildModel (54-74)` and the `Model` fields | verified | typedef `tiling.js:26-38` |
| §2 `dlx.js` `ExactCover(ws, numColumns, rowCols, rowStart, rowCount)`, `solve({...})`, views | verified | also `progressEvery`; `cover.rowCount` and `cover.columns` exist |
| §2 `placements.js` plan fields, `visitPlacements(plan, emit)` | verified | `plan.width`, `height`, `pieceSizes` (`placements.js:41, 227`) exist but are not in `Model` |
| P0.1 column layout: cells first, piece column last, rows grouped by piece | verified | `placements.js:1-9` header; `workspace.js:322-345` writes the piece column last (333) |
| P0.1 canonical piece order | verified, with a nuance | `placements.js:187-189`: size, canonical shape, then **id**; identical shapes are ordered by id |
| §2 `types.js` Metrics 57-63, Rating 68-71 | verified | typedef lines 56-63 and 67-72 |
| §2 `puzzlecode.js` `measure` hook ~560 | verified | `puzzlecode.js:560` |
| §2 `tasks.js` kinds incl. `rate` | verified | `tasks.js:152-208`; `rate` at 192 |
| §3 rule 6 / P2.2 "protocol reader must accept the v3 fields or the message is rejected" | **wrong** | results pass through `protocol.js:827-867`; `readRatingClaim` (491-516) serves only `encodePuzzleCode` snapshots and copies any plain `metrics` |
| P0.3 `createRng(seedText, label)`; `solveFirst(model, { rng, ... })` | verified | `core/engine/rng.js:148`; `tiling.js:140` |
| P1 `free = buildModel(board, pieces, [], ws).placementsPerPiece` | works, but | it overwrites the live model of `ws` and returns a view that the next `buildModel` overwrites; use `countPlacements(preparePlacements(board, pieces, [])).perPiece` (no workspace) and map by `freePieceSource` |
| P1 fixtures read by `tests/generate.test.js` ~719-754 | moved | read at `tests/generate.test.js:47-48`; the 1-4 worker test is at 687 |
| P2.3 `readMetricsV2` 734-749 | moved | 734-764 |
| P2.5 `player/state.js` ~617 `verifyPack` | verified | the `run` typedef at `player/state.js:210` allows only `kind: 'verifyPack'` |
| P3 `tools/calibrate.mjs --profile landscape` | verified | its header suggests `--output docs/calibration`, a frozen folder: use `--output docs/difficulty-v3/...` |
| P4 `tasks.js` progress 64, 104; `clues.js` `onRate` 218 | verified | `onRate` call at 219 |
| P4 `generate.js` 86-139, 172-214; `carve.js` 494 (hooks), 281, 578, 642; `tiling.js` 473 | verified | `carveFlat` (105) has no hooks |
| P4.1 "only the set records `setAttempt`" | **partly wrong** | only `core/browser/generation-client.js:353-355` (CLI and calibration path) writes it; the Generator writes the pack through `generator/state.js:1300-1328`, which has no `setAttempt`, and the state stores no attempt index (`generator/state.js:50`) |
| P4.1 generation-client accept ~821-1064, `foldAccept` ~495-541 | verified | `accept()` at `generation-client.js:854-866`; slot-end `best` at `generate.js:528` |
| P4.2 version ids | verified | `core/engine/version.js:3-4` (`APP_VERSION`, `ALGO_ID 'gen-v2'`), `rng.js:6-7` |
| Docs: design-detail §5.2, 5.5, 6.10, 6.11, 7.1-7.8, 8.1, 10.5, 11.11, 14.1 | verified | lines 619, 756, 1314, 1364, 1389-1578, 1590, 1996, 2269, 2566 |
| Companion path `D:\git\tmp\...` | wrong | the repositories are at their own roots; not a code issue |

---

## 4. Step-by-step review

### P0.1 Expose the row structure

Correct and tiny, but incomplete. Add to the returned `Model` (views, no copies; update the typedef at
`tiling.js:26-38`): `rowCols`, `rowStart`, `columns`, `cellColumn`, `freePieceCount` (as planned), plus `width`,
`height` (from the plan; needed for adjacency and for the parity colour `(x + y) & 1`), `pieceSizes` (the
subset-sum check) and `shapeKeys: string[]` per free piece (only if Q-P6 keeps duplicate handling; computed in
`preparePlacements` from the canonical shape it already builds). `measureDeduction` must run while the model is
live: call it right after `buildModel` in `measureV3`, or export the existing liveness check of `tiling.js:79-83`.
Tests: `tests/tiling.test.js` gains one assertion that the new fields match `preparePlacements`. No output change.

### P0.2 `core/engine/deduce.js`

Algorithm: correct and deterministic as written (MRV over live counts, ties cells first then lowest index, no RNG).
For a unique puzzle, G, Cmax and Dmax do not depend on the order in which alternatives are tried (the path to the
only solution is fixed by the deterministic column choice), only Gt does. Points to fix or specify:

- **G on multi-solution puzzles (Q-P1).** Proof of issue 1: let X and Y be two solutions; every sound rule keeps all
  rows of X and of Y; so the first node on the path to the first solution that excludes Y must be a branch, i.e. a
  guess node. Hence S >= 2 implies G >= 1 and `D3 >= round(base(U) + 4 + 6 + 4 - penalty)`: Hard for U >= 3 with
  'few' (base(3) = 4.72, 16.72 -> 17) and for U >= 5 with 'many' (base(5) = 6.78, 16.78 -> 17). Recommended
  definition: at each guess node i on the path, c_i live alternatives of which k_i lead to at least one solution
  (bounded existence search with the same propagation; on a unique, exhausted tree k_i = 1 without extra work);
  `info = sum log2(c_i / k_i)`, `G = #{i : k_i < c_i}`, `Cmax = max c_i` over decisive nodes. A free choice
  (k_i = c_i) is not a guess, which is the literal meaning of "at least one real choice" in §1.3.
- **Data shape.** Return `{ F, E, G, Gt, Cmax, Dmax, info, tier, rules: { R1..R9 }, nodes, S, solutions, stop }`
  (`info` is needed by the score and by `breakdown`). Inside rating metrics name the deduction stop `dstop` (the
  DLX `stop` keeps its v2 values `solution | branch-cap | row-cap`, `pack.js:47`).
- **`solutions` classes.** Add: node cap with 2 <= S < cap -> `few` (S is a lower bound). `unknown` only when the cap
  hit with S <= 1.
- **Saturation.** `stop: 'node-cap'` only when the cap was hit before the first solution (G and info incomplete);
  a cap hit during the solution count changes `solutions`, not `saturated` (§5.1 R3).
- **Cost.** Uniqueness needs an exhausted tree, so `measureDeduction` on unique puzzles costs a full (small)
  search: measured 2-1,059 nodes, <= 20 ms on these boards. Keep `nodes: 20000`; measure 26x26 and hell levels in
  P0.3.
- **Region check.** Precompute `cellX`, `cellY`, neighbours; cache the subset-sum bitset by the multiset of remaining
  sizes (key: sorted sizes); recompute regions incrementally only where a selection changed cells (or simply per node;
  measured cheap).

Tests (`tests/deduce.test.js`, quick): the 3x2 P + monomino fixture must clue the monomino
(`tests/difficulty.test.js:69-81` does: `{ piece: 'M', x: 0, y: 0 }`); without it the board has 4 solutions. Recipes:
assert the measured values (a pinned table) and monotonicity of G and Gt; the prototype says both hold. Invariance:
mirror `tests/difficulty.test.js:127-138` (rename, recolour, reverse). Node cap: `nodes: 5` on the master recipe
(1,059 nodes). Two solutions: two identical dominoes in a 2x2 board, or the 10x6 Easy probe puzzle above.

### P0.2b Rule catalogue

Implementable, with these corrections (soundness is the acceptance criterion of the plan itself):

| Rule | Verdict | Required specification |
|---|---|---|
| R1, R2 | sound | column with one live row |
| R3 | contradiction half sound; **place half unsound as written** | place only when the region R cannot be written as a sum of 2+ remaining piece sizes (DP that tracks the number of pieces) and exactly one live row has `cells = R`. Otherwise R3 is the region feasibility check (size >= smallest remaining, size reachable) |
| R4, R5 | sound | implement once as the column-subset rule: for an uncovered column A, intersect the column sets of its live rows; every other column B in the intersection has `rows(A) ⊆ rows(B)`: kill `rows(B) \ rows(A)`. A = piece, B = cell is R4; A = cell, B = piece is R5; A = cell, B = cell (a human "whatever covers this corner also covers that cell") is counted as R4 |
| R6 | sound | the one-step lookahead; count kills in `E` and `rules.R6` |
| R7 | sound if done as a 2D DP | per region: reachable `(size, imbalance)` pairs over the remaining pieces that have a live row inside it; kill rows whose remainder `(|R| - size(r), imb(R) - imb(r))` is unreachable |
| R8 | sound, mostly subsumed by R6 | a neck column with <= `lookaheadWidth` live rows is already handled by R6; R8 only adds value for wider necks. Its hand-built test needs a neck cell with more than 4 live rows |
| R9 | **unsound as written** | sound only when no live row covers both cells: then the two cells take both pieces, and their rows covering neither cell can go. If one placement of P covers both cells, Q may lie anywhere |
| duplicate shapes | ill-defined | grouping does not make R4/R5/R9 stronger; the real effect of twin pieces is fake guesses (P1/P2 at the same footprint) and doubled S. Generated sets never have twins (`carve.js:707` refuses them); imported sets may (`pack.js:574` only warns) (Q-P6) |

Order: R1, R2, R3, then R4/R5, R6, then R7, R8, R9, restarting at R1 after any change (as planned). `tier` = highest
tier of a rule that changed the state on the path to the first solution, 4 when a guess was needed.

Tests: one hand-built board per rule (the plan's list), a soundness test (no rule ever removes a row of a known
solution) over the recipes and the generated sample pack, and a "rules never fire on a solved board" test. Put the
rule tests in a new `tests/deduce-rules.test.js` so P0.2 and P0.2b do not edit the same test file.

The "why" hint for the Player (optional, after P3): out of scope of this plan's checklist; leave it out.

### P0.3 `tools/rate-probe.mjs`

Feasible as written (model on `tools/generate.mjs`, which already builds boards and runs the client). Add to the
output: decisive G and info (Q-P1), `rules`, `tier`, the cost per call (nodes, ms) and the board area. Add a mode
`--knobs <json>` that prints v3 scores for given knobs, so P2's knobs can be fitted from one probe file. The test
(`tests/rate-probe.test.js`, quick) runs it on `tests/fixtures/generated-sample-pack.json` with `--orders 2` and checks
that every line parses; keep it under a few seconds. Output report: `docs/difficulty-v3/probe-<date>.md` (a new file;
the folder holds records only).

### P1 Centre-seeking clue selection

Acceptance change: correct and safe with these precisions.

- Collect in-band candidates; return at once when `|score - centre| <= (max - min) / 4` (hard: [19, 23]; easy: [9, 11]),
  otherwise continue until `profiles >= limit - 16` or the beam ends, then return `ranked(target, inBand)[0]`.
- `require` mode: today `finish()` runs `makeUnique` on every in-band hit (`clues.js:230-246`). Keep that per
  candidate but defer it: when choosing, walk `ranked(target, inBand)` and return the first that `finish()` accepts
  (repair can fail or leave the band). The returned rating is then the repaired one.
- Phase 1 counting: an in-band but off-centre sample is neither below nor above, so a round with only such samples
  ends phase 1 (`clues.js:282-291`); that is fine.
- Cost: more ratings per candidate than today (the first hit no longer ends the search). Measure in the P1 gate run
  (`npm test` covers time only coarsely; the calibration gate of P3 measures it).

Sampling bias (step 2): the text reasons both directions backwards ("clue-ing [forced pieces] leaves the ambiguous
pieces free: the puzzle gets easier"; "removing ambiguity makes it harder"). Clue-ing low-placement pieces leaves
the ambiguous ones free (harder); clue-ing high-placement pieces removes ambiguity (easier). Placements on the empty
board are also a weak proxy. Recommendation: ship the acceptance change only (Q-P5).

Test: in `any` mode, among the in-band ratings seen through `onRate`, the returned one has the smallest
`|score - centre|` (ties by clue key). Do not assert it in `require` mode (the repair changes the rating).

Gate: `node tools/record-fixtures.mjs --replace --reason "P1: clue selection aims at the band centre"`, then
`npm test` once. Docs: design-detail §6.10, §6.11, §7.6 (`docs/design-brief.md` does not say "first in-band").

### P2.1 Formula

Arithmetic check of the plan's examples with base 12: base(6) = 7.58, one binary guess 7.58 + 4 + 6 + 4 = 21.6 -> 22
(Hard), two binary guesses 31.6 -> 32 (Expert): correct. The guarantee G = 0 => D3 <= 16 holds iff
`base.max + rule.max <= 16.5` (base(U) < base.max for every finite U, and `Math.round(16.49...) = 16`). Corrections:

```js
export const SCORE_V3 = Object.freeze({
  model: 'difficulty-v3',
  base: Object.freeze({ max: 12, scale: 6 }),
  rule: Object.freeze([0, 0, 2, 4, 4]),            // by tier 0..4 (4 = a guess was needed)
  weights: Object.freeze({ G: 6, info: 4 }),        // calibrate from the P0.3 probe before P2 (issue 3)
  penalty: Object.freeze({ few: 2, many: 4 }),
});
```

- Keep `SCORE` unchanged (it describes v2 and `tests/policy.test.js:371` pins it); `MODEL` becomes v3. The plan's
  "`SCORE.model` likewise" would leave v2 weights under a v3 name.
- `breakdown(metrics)` (needed by P4.3) lives next to `scoreV3` and `scoreV3(m) = round(sum of breakdown terms)`.
  Test the invariant `SCORE_V3.base.max + max(SCORE_V3.rule) <= 16.5`.
- `measureV3`: build the model once, run `measureDeduction`, then `solveFirst` for B (diagnostics, as planned). The DLX
  run roughly doubles the rating cost on boards where it saturates (50,000 row trials); measure in P0.3 and keep it
  only if affordable.
- Throw `UnsatisfiableError` for `solutions === 'none'` and for a piece without placements (as `measure` does,
  `difficulty.js:69-75`).

### P2.2 Types and protocol

`core/engine/types.js`: `Rating.model: 'difficulty-v2' | 'difficulty-v3'`, a `MetricsV3` typedef. `protocol.js`: no
change (§3).

### P2.3 Pack format

As planned (`RATING_V3_FIELDS`, `METRICS_V3_FIELDS`, `readMetricsV3`, v3 strict, v2 like v1 without a warning at
`pack.js:820`). `ratingClaim()` writes v3 metrics in a fixed order (deterministic pack bytes). Keep
`MAX_CLAIM_METRICS_BYTES` (4,096, `pack.js:41`) in mind: a v3 claim is about 400 bytes. Current app versions read v3
claims as "unsupported model, kept but not used" (a warning), which is acceptable.

### P2.4 Puzzle code

Measured with `encodePuzzleCode` on probe puzzles (full code length, raw / deflate):

| Rating in the code | 10x6 Hard | 20x18 Expert |
|---|---|---|
| v2 compact form (today) | 46 | 154 |
| v3 claim with the plan's metric fields | 454 / 410 | 566 / 551 |
| v3 claim with rules and tier as well | 673 / 537 | 787 / 695 |
| v3 claim without metrics (`model, score, level, saturated`) | 170 | 282 |
| no rating | 54 | 166 |

It fits `MAX_CODE_SYMBOLS` (16,000) and QR version 40, but a 10x6 code becomes 9-10 times longer (Q-P3).

### P2.5 Re-rating on load

Feasible (`tasks.js` `rate`; one worker in the Player) but it is a new behaviour with UX cost: puzzle titles like
"Hard #3" (`generation-client.js:857`) would sit next to a different v3 level, and `player/state.js:210` must allow
the `rate` kind. Q-P2.

Gate for P2: re-record `tests/fixtures/generated-sample-pack.json`, `generation-case.json`, the clue recipes
(`tests/fixtures/clue-recipes.js`, not named by the plan) and, only if they change, the puzzle-code goldens
(`tests/fixtures/puzzlecode-*.json`); then `npm test`. Tests that must change with P2: `tests/difficulty.test.js:56-66`
(the deep-equal of a v2 zero rating), `tests/clues.test.js:58-71, 86-96, 145-177` (v2 bands, recipe scores, targets
34-36 and 36-38 that were chosen for v2 scores), `tests/generate.test.js:50`, `tests/pack.test.js:483, 630`,
`tests/worker-pool.test.js:815`. Docs as planned plus DEVELOPERGUIDE (`deduce.js`, `rate-probe.mjs`).

### P3 Calibration and locking

Reorder: fit the knobs from the P0.3 probe (unique and multi-solution puzzles of 10x6, 12x12, 20x18 at every offered
level) before P2 re-records anything; P3 then runs the landscape and locks the tests, changing knobs only if a hit
rate or ordering criterion fails. Precisions:

- Quick test `tests/difficulty-v3.test.js`: the worked-example table of the final knobs, G = 0 => < 17 over a grid of
  (U, tier, solutions), the penalty and saturation branches, and the recipes' v3 levels (pinned).
- Slow test: name starting with `slow:` (the skip pattern is `slow`), seeds fixed, under 10 minutes.
- Landscape gate: the full profile is 105 cells x 20 seeds; the only earlier record covers 12 cells
  (`docs/calibration/landscape-slice-2026-10-22.md`). Run a reduced matrix first (`--cases` / `--seeds 10`: 10x6,
  10x10, 12x12, 20x18 at normal to master), output to `docs/difficulty-v3/`. Expect a long run; it is a tool, not a
  test, but follow the 10-minute rule per test page if the browser profile is used.
- `K60` / `SHARES` (`policy.js:95`, `levels.js:18`) may change in P3 (they are not frozen); any change re-records the
  fixtures again (gate).

### P4 Generation Steps

Feasible: every stage is a pure function of its inputs and named streams (`generate.js:86-139, 172-214, 224-252`).
Corrections and gaps:

- **Where provenance comes from.** Return it from the engine: `puzzleCandidate` and `completionCandidate` add
  `made: { slot, attempt, start: 'witness' | 'restart' | 'completion', skipped: string[] }` to the candidate;
  `selectClues` reports skipped keys through a new `onSkip(key)` (or returns them). `foldAccept` may accept the
  slot's `best` from an earlier attempt (`generate.js:528`), so recording at accept time is wrong. Worker results
  are not validated (§3); `checkOutcome` (`generation-client.js:872`) should check the `made` shape.
- **What it must hold.** The batch seed is already `puzzle.seed`; add `level` (target level id) and `uniqueness`,
  because the Generator mixes batches of different levels and uniqueness in one pack (`generator/state.js:1300-1328`
  takes the batch level of the first puzzle only). Bound `skipped` (e.g. 32 keys; beyond it store
  `skippedOverflow: true` and show "steps not available").
- **Set provenance.** Store the winning set attempt in the Generator state (from `generateSet`'s `attempt`,
  `generation-client.js:697`), persist it in the saved state (written at `generator/state.js:869-871`, read back by
  `readSavedSet`, 885) and write `generation.setAttempt` in `generationOf`. Imported sets have no stages 1-3.
- **Where it lives in the pack (Q-P4).** A per-puzzle field fails `readFields` in every current version
  (`pack.js:200`); `generation` is a free-form JSON object (`pack.js:978-979`) that current versions keep.
- **Versions.** P1 changes the clue search, so bump `ALGO_ID` (`version.js:4`, `'gen-v2'` -> `'gen-v3'`); a replay
  must refuse a pack whose `generation.algo`, `policy`, `rng` or rating model differ.
- **Recorder.** Optional callbacks only; assert "recorder off = recorder on" (identical sets, puzzles, RNG draws).
  `carveFlat` has no hooks yet (`carve.js:105`).
- **Task kind.** `replayPuzzle` in `protocol.js` (`TASK_KINDS` 34, `PAYLOADS`, `PAYLOAD_FIELDS` 660) and
  `tasks.js:152`; payload: set (wire form), puzzle (clues, solution, made), generation (algo, policy, rng, seeds).
- **UI.** Dialog modelled on `core/browser/share-dialog.js`; board with `core/browser/svg-board.js`; strings in
  `generator/strings.js` both languages; keyboard and screen reader as §11.11.

Gate: fixtures re-recorded once (the sample pack gains provenance), `npm test`.

---

## 5. Open decisions

### 5.1 Implementer-level resolutions (keep the plan's intent; to be confirmed in the joint report)

| Id | Plan text | Resolution |
|---|---|---|
| R1 | `SCORE_V3.base.max: 16` | 12 (issue 2); add the `rule` table to `SCORE_V3`; invariant test |
| R2 | metrics list of P2.1 | add `info`, `tier`, `rules`, rename the deduction stop `dstop` |
| R3 | `saturated = stop === 'node-cap'` | saturated iff the node cap was hit before the first solution |
| R4 | `solutions` classes | node cap with 2 <= S < cap is `few` |
| R5 | R3 place, R9 | the sound versions of §4 P0.2b |
| R6 | R4/R5 | one column-subset rule, classified by column types, cell-cell included |
| R7 | P0.1 fields | add `width`, `height`, `pieceSizes` (and `shapeKeys` if Q-P6 = b) |
| R8 | "protocol must accept v3" | no protocol change for v3 |
| R9 | `buildModel` on the empty board in P1 | `countPlacements(preparePlacements(...))` |
| R10 | "check empirically; if the probe disagrees, keep uniform" | decided by Q-P5 |
| R11 | "the 16 and the 6 are knobs" / "tune" (`limit - 16`, `DEDUCE`) | `limit - 16` stays (48 ratings); `DEDUCE = { lookaheadWidth: 4, nodes: 20000, solutions: 8 }` stays unless P0.3 shows a 26x26 or hell-level rating over 200 ms |
| R12 | "median of 3 tie-break variants if G varies by more than about 1" | measure in P0.3 with `--orders`; G of a unique puzzle does not depend on the row order at all (§4 P0.2), only on the column tie rule; adopt the median only if the probe shows the column rule matters |
| R13 | calibration order | knobs fitted in the P0.3 report before P2 |
| R14 | `ALGO_ID` | bump to `gen-v3` with P1 |
| R15 | P1 test in `require` mode | assert centre choice in `any` mode only |

### 5.2 Owner questions

**Q-P1. What is a "real choice" when a puzzle has several solutions?**
(a) Plan: every branch node on the path to the first solution counts (free choices included). Consequence: every
multi-solution puzzle with U >= 3 ('few') or U >= 5 ('many') rates Hard or above; "several solutions lower the
score" cannot hold. (b) Decisive guesses: count a node only when some alternative fails, information
`log2(c/k)`. Consequence: unique puzzles unchanged; multi-solution puzzles cost up to about 2-4 times more search
(bounded by the node cap); free choices never make a puzzle Hard. (c) Plan's G with a larger penalty
`b * log2(min(S, 8))`. Consequence: cheap but crude (at most 3 bits of discount; a puzzle with 100 solutions and
one decisive guess is treated like one with 8). **Recommendation: (b).**

**Q-P2. Old (v2) ratings shown by the Player and the Generator (P2.5).**
(a) Plan: re-rate v2 claims with v3 in a worker on load and show the v3 level with a "re-rated" note; the stored
claim stays. Consequence: one rating per opened puzzle (milliseconds to about a second on 26x26), new strings,
titles such as "Hard #3" may sit next to "Normal". (b) Show the stored claim with a small "older rating" note.
Consequence: no CPU cost, consistent with the title, levels of old links stay v2. (c) No change. **Recommendation:
(b).**

**Q-P3. Puzzle-code size of v3 claims (P2.4).**
(a) Plan: JSON text with all metrics (10x6: 46 -> 410-454 characters). (b) JSON text without metrics in codes only
(46 -> 170; packs keep the metrics; current Players still decode). (c) A compact v3 form as a new codec version
(about today's size; a frozen copy of the final knobs; current Players cannot decode new codes; Medium task after P3).
(d) No rating in codes. **Recommendation: (b) in P2, (c) only if short codes matter.**

**Q-P4. Where does per-puzzle provenance live (P4.1)?**
(a) Plan: a new per-puzzle field `made`. Consequence: packs with it are refused by every current version
(`pack.js:200`), a format change. (b) `generation.made`, a map from puzzle id to provenance, inside the existing
free-form `generation` object. Consequence: no format change, older versions keep it untouched. **Recommendation:
(b).**

**Q-P5. P1 step 2, placement-weighted clue sampling.**
(a) Skip it; ship the centre-seeking acceptance only. (b) Implement with the corrected direction (above the band:
clue pieces with many placements; below: few), kept only if the probe shows a better hit rate. (c) As written
(directions as in the plan). **Recommendation: (a)**; revisit in P3 if Hard/Expert hit rates drop.

**Q-P6. Sets with identical shapes (imported sets only).**
(a) Plan: group by shape key in R4/R5/R9 (ill-defined, see §4). (b) Per-piece rules, and twins collapsed in the
guess alternatives and in S (no fake guesses, solutions counted up to twin swaps; differs from the raw
`certify` counts). (c) Per-piece rules only, raw counts like `certify`; such sets rate higher than they should.
**Recommendation: (c)** (generated sets never have twins), with the limitation documented.

---

## 6. Proposed task breakdown

Sizes: S ~100-300, M ~300-800, L ~800-1,600 changed lines including tests and docs. Every task ends with
`npm run test:quick` and `npm run check` green and one commit; "Gate" lists the pre-approved heavy runs the task's
developer performs and records.

| Id | Title | Scope | Depends on | Files owned (exclusive) | Gate | Size |
|---|---|---|---|---|---|---|
| PT1 | Model fields and deduction core | P0.1; P0.2 with R1, R2, R3 check, R6, guess, decisive G (if Q-P1 = b), metrics, `DEDUCE` | - | `core/engine/tiling.js`, `core/engine/deduce.js` (new), `DEDUCE` in `core/engine/policy.js`, `tests/deduce.test.js` (new), `tests/tiling.test.js` | - | L |
| PT2 | Rule catalogue | P0.2b: R3 place, R4/R5 column-subset, R7, R8, R9, counts, tier, soundness test | PT1 | `core/engine/deduce.js`, `tests/deduce-rules.test.js` (new) | - | L |
| PT3 | Probe tool and knob fit | P0.3 + knob fitting; `docs/difficulty-v3/probe-<date>.md` with proposed `SCORE_V3` | PT2 | `tools/rate-probe.mjs` (new), `tests/rate-probe.test.js` (new), the probe report | - (probe runs are small) | M |
| PT4 | Centre-seeking clue selection | P1 acceptance (and Q-P5 b if chosen), `ALGO_ID` bump | - (parallel with PT1-PT3) | `core/engine/clues.js`, `tests/clues.test.js`, `core/engine/version.js`, design-detail §6.10, §6.11, §7.6 | record fixtures (P1 reason) + `npm test` | M |
| PT5 | difficulty-v3 model | P2.1-P2.3, P3 quick test, recipe and test updates, docs §7, brief, guides | PT3, PT4 | `core/engine/difficulty.js`, `SCORE_V3` in `policy.js`, `core/engine/types.js`, `core/engine/pack.js`, `tests/difficulty*.test.js`, `tests/pack.test.js`, `tests/clues.test.js`, `tests/fixtures/clue-recipes.js`, `tests/worker-pool.test.js`, `tests/generate.test.js`, design-detail §7.1-7.8, §14.1, `docs/design-brief.md`, `USERGUIDE*.md`, `DEVELOPERGUIDE*.md` | record fixtures (P2) incl. clue recipes; `npm test` | L |
| PT6 | v3 claims in puzzle codes | P2.4 per Q-P3, 26x26 measurement | PT5 | `core/engine/puzzlecode*.js`, `tests/puzzlecode*.test.js`, goldens if they change | goldens re-record if changed | S (b) / M (c) |
| PT7 | Old ratings in the apps | P2.5 per Q-P2, strings both languages | PT5 | `player/state.js`, `player/app.js`, `player/strings.js`, Generator import path, their tests | - | S-M |
| PT8 | Calibration run and lock | P3 slow test, reduced landscape, `calibration-<date>.md`, knob or K60/SHARES changes | PT5 (PT6, PT7 may run alongside) | `tests/difficulty-v3.test.js` (slow part), `policy.js` knobs, `levels.js` `SHARES`, the calibration report | calibrate (reduced landscape) + rate-probe; fixtures re-record if knobs change; `npm test` | M |
| PT9 | Provenance | P4.1: candidate `made`, `onSkip`, Generator set attempt, pack placement per Q-P4 | PT8 | `core/engine/generate.js`, `clues.js` (`onSkip` only), `core/browser/generation-client.js`, `generator/state.js`, `generator/jobs.js`, `pack.js` only if Q-P4 = a | record fixtures (sample pack) + `npm test` | M |
| PT10 | Recorder and replay engine | P4.2 recorders, `core/engine/replay.js`, `replayPuzzle` task, P4.3 step data | PT9 | `core/engine/replay.js` (new), `carve.js`, `tiling.js` (`lnsWalk` recorder), `tasks.js`, `protocol.js`, `tests/replay.test.js` (new) | - | L |
| PT11 | Generation Steps dialog | P4.3 views, P4.4 dialog, strings, browser page, docs | PT10 | `generator/ui/*` (new dialog), `generator/strings.js`, `tests/browser/replay.*`, design-detail §5.2, §5.5, §6.12, §8.1, §10.5, brief, guides, README | browser page run (each check < 1 min) | L |

Dependency graph:

```
PT1 -> PT2 -> PT3 --\
                     +-> PT5 -> PT6 --\
PT4 ----------------/       \-> PT7 ---+-> PT8 -> PT9 -> PT10 -> PT11
```

Parallelism: PT4 is file-disjoint from PT1-PT3 (PT1-PT3 must not edit `docs/design-detail.md`; their docs go into PT5)
and can run beside them, but never run two quick sets at once on one tree (§1): use a second clone or serialise the
test runs. PT6 and PT7 are file-disjoint. Everything else is sequential. P4 (PT9-PT11) could start after PT4 instead of
PT8 (it does not need v3), but its replay must match the final clue search and rating model, so starting it after
the model is locked avoids redoing goldens.

---

## 7. Risks

| Risk | Where | Mitigation |
|---|---|---|
| v3 levels misplaced until calibrated (issue 3) | P2 | fit knobs in PT3 before PT5 |
| Hit rate at Hard on large boards (forced puzzles fall to Easy) | P2, P3 | probe per board; `SHARES` / K60 in PT8; centre-seeking acceptance |
| Normal unreachable on small sets: with G = 0 a 10x6 puzzle needs U >= 10 and a tier-2 rule, or a tier-3 rule, to reach 12 | P3 | probe; knobs `rule` and `base` |
| Rating cost (deduction + DLX) x 64 per candidate | P2 | P0.3 cost table; drop DLX B if expensive |
| Tests pinned to v2 numbers | P2 | the list in §4 P2.5 |
| Code length (issue 8) | P2.4 | Q-P3 |
| Old app versions refuse packs with new fields | P4.1 | Q-P4 (b) |
| Replay mismatch across versions | P4 | version check incl. rating model and `ALGO_ID` |
| Concurrent quick runs collide in `tests/artifacts` | all | one test run at a time per tree |
| Long calibration runs | P3 | reduced matrix first, run detached and monitored |

---

## 8. Effort estimate

| Part | Tasks | Changed lines (incl. tests, docs) | Agent time |
|---|---|---|---|
| Deduction solver and probe | PT1-PT3 | 2,000-3,000 | 8-12 h |
| Clue selection | PT4 | 300-600 | 2-3 h + gate |
| v3 model and app follow-ups | PT5-PT7 | 1,800-2,800 | 8-12 h + gates |
| Calibration | PT8 | 300-700 | 3-5 h + long runs |
| Generation Steps | PT9-PT11 | 2,500-3,800 | 10-15 h + gate |
| Total | 11 tasks | 7,000-11,000 | 31-47 h of developer-agent time, plus calibration run time |

With one developer at a time and the gates pre-approved, the critical path is PT1 -> PT2 -> PT3 -> PT5 -> PT8 ->
PT9 -> PT10 -> PT11 (about 80 % of the total).
