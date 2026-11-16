# Difficulty v3: independent implementation-plan review

SA2, gpt-6-astra. Reviewed 2026-11-12 against branch `rating-v3`, commit `77e62cb`.
This is the independent analysis, not the cross-review or the joint report. No SA1 report was read.

The scope is the full plan, P0-P4, including Generation Steps. The owner has pre-approved the plans'
APPROVAL GATE runs for implementing developers. Those runs were not run in this analysis. New behavioural
choices below are recommendations for the owner, not decisions already adopted. The four decisions in
`docs/difficulty-v3/plan.md` section 1.3 remain fixed.

## 0. Summary and verdict

The diagnosis is substantially right. The supplied generation probes reproduce the branch counts and
scores, including two large Hard puzzles solved entirely by forced DLX rows. The plan is not safe to
execute literally. It needs a corrected deduction contract, sound rule definitions, a completed rating
schema, and end-to-end provenance before it can become developer task packs.

The ten most important findings are:

1. **The two formula definitions disagree.** The equation uses a base maximum of 12, but `SCORE_V3`
   uses 16. With the latter, `U=10`, rule tier 3, no guesses and no penalty score 17: Hard. This violates
   the owner's fixed requirement (`docs/difficulty-v3/plan.md:294-310`).
2. **R9 is unsound as written.** Two cells supported by the same two pieces need not consume both
   pieces: one piece can cover both cells. A domino and square tetromino on a 3x2 board are an exact
   counterexample. R3 also needs stronger placement preconditions; R7 must consider optional regional
   allocation, not sum every eligible piece as mandatory (`docs/difficulty-v3/plan.md:209-218`).
3. **The score cannot be reconstructed from the proposed metrics.** The formula needs the alternatives
   at every guess and the hardest deduction tier. The P2 metrics omit the alternatives, their logarithmic
   sum, `rules`, and `tier`. `stop` is simultaneously assigned incompatible DLX and deduction meanings
   (`docs/difficulty-v3/plan.md:220-221, 294-319`).
4. **A search-node cap does not bound lookahead or rule work.** One node can scan many placement
   incidences, run many temporary propagations, and perform region DPs. A cap before the first solution
   supplies no final-path G at all. It cannot safely masquerade as a measured, forced puzzle.
5. **The protocol warning is wrong.** `core/engine/protocol.js:490-516` reads arbitrary bounded claim metrics;
   `core/engine/protocol.js:824-861` passes worker result values through. Adding metric names there is not required.
   Adding a replay task does require payload and task-kind changes.
6. **P1 has incomplete acceptance semantics.** Returning the current centre-near candidate is not the
   same as returning the best observed candidate. Uniqueness repairs can change scores, fail, or produce
   an excluded clue key. Retrying stored candidates can consume RNG repeatedly. These cases need one
   explicit algorithm (`core/engine/clues.js:204-258`).
7. **P1's placement-count bias is unproved and its explanatory signs are suspect.** It also confuses
   canonical free-piece order with caller/layout order, and retains workspace-backed counts that later
   ratings overwrite (`core/engine/tiling.js:24-34`; `core/engine/workspace.js:268-284`). Keep the bias a separately measured
   owner choice, not a required implementation guess.
8. **P4 provenance is insufficient in the real Generator.** The browser drops the successful set attempt;
   its exported metadata does not contain `setAttempt`. The proposed per-puzzle record also lacks the
   candidate's target level and uniqueness setting, which can differ between batches
   (`generator/jobs.js:283-296`; `generator/state.js:1300-1328`).
9. **P4 cannot be attached at final acceptance alone.** A fold may accept an earlier retained candidate
   after its final attempted candidate fails. Provenance must travel with the candidate from its creation,
   through calibration reuse, the fold, persistence, and pack writing (`core/engine/generate.js:350-365, 495-541`).
10. **Several validation instructions cannot work literally.** Old v2 recipes are not a monotone v3
    corpus; the landscape command is missing mandatory `--output`; the landscape runner does not save
    the packs P3 proposes to re-rate; and immutable v2 code goldens should remain historical compatibility
    tests, not be rewritten into v3 (`tools/calibrate.mjs:121-123`; `tools/bench/runner.js:682-701`).

## 1. Baseline and reproduced measurements

### 1.1 Test baseline

Environment: Windows, PowerShell, Node `v26.13.0`. Both repository HEAD and branch matched the request.
The tracked worktree was clean before the analysis. Only the requested report is authored by this review.
The permitted quick runner itself creates its normal ignored test artifacts.

| Command from the repository root | Result | Counts | Duration |
|---|---|---|---|
| `npm run test:quick`, first run | One failure caused by concurrent shared-artifact use | 111 suites; 1,110 tests; 1,109 pass; 1 fail; 0 skipped/cancelled | Runner 29.989 s; command 36.294 s |
| `npm run check`, first run | Pass: conventions and site checks | Both checks pass | 1.347 s |
| `npm run test:quick`, isolated rerun | Pass | 111 suites; 1,110 tests; 1,110 pass; 0 fail/skipped/cancelled | Runner 15.295 s; command 16.154 s |
| `npm run check`, isolated rerun | Pass | Both checks pass | 1.131 s |

The first failure was `tests/calibration.test.js:284-319`: expected “resuming 5 recorded rows”, received
“resuming 10 recorded rows”. The test removes and recreates a fixed artifact directory and appends to a
fixed checkpoint. Coordination with SA1 was limited to test scheduling; the isolated rerun passed.
This is not evidence of an engine regression. Do not run two repository quick suites concurrently against
the same checkout. No full test suite, standalone calibration run, fixture recorder, or browser page was run.

### 1.2 Plan section 6 probes

Ran the three supplied `tools/generate.mjs` recipes unchanged, with four workers, JSON held in memory.
Each child had a 120-second timeout. All returned exit 0.

| Board / level / seed / count | K and actual sizes | Ordered `(U, B, score)` results | Wall time |
|---|---|---|---|
| 10x6 / hard / `probe1` / 5 | K=9; 4..9 | `(6,32,24)`, `(6,10,20)`, `(6,6,19)`, `(6,13,21)`, `(6,6,19)` | 0.985 s |
| 20x18 / hard / `probe2` / 3 | K=16; 19..27 | `(9,0,18)`, `(10,0,20)`, `(10,2,24)` | 1.665 s |
| 20x18 / expert / `probe3` / 3 | K=18; 14..24 | `(13,17,36)`, `(13,8,34)`, `(13,7,33)` | 1.330 s |
| Additional 10x6 / easy / `probe-easy` / 1 | K=7; 5..13 | `(3,1,8)` | 0.742 s |

All reported `stop: 'solution'`. The Hard 10x6 sizes in the plan, 5..8, are wrong for its own `probe1`
recipe: the actual sizes are `[9,9,8,8,6,6,6,4,4]`. The easy table's original seed is not supplied, so its
exact size range and frequency cannot be reproduced from the document.

A separate bounded six-order probe of `tests/fixtures/generated-sample-pack.json`, using
`createRng('sa2-order', '#' + i)`, produced:

| Stored title | Canonical B | Seeded B values | Seeded v2 scores |
|---|---:|---|---|
| Easy | 0 | 0, 0, 0, 0, 0, 0 | 8, 8, 8, 8, 8, 8 |
| Normal | 2 | 1, 1, 2, 2, 1, 1 | 12, 12, 14, 14, 12, 12 |
| Hard | 14 | 4, 3, 14, 13, 4, 14 | 18, 17, 21, 21, 18, 21 |

This independently demonstrates order noise, without claiming to reproduce the historical median of 5-6
points. The seeded DLX changes both MRV column ties and row order, not row order alone
(`core/engine/dlx.js:230-278`).

## 2. Findings verified

The following covers every code-level cause in section 1.2, plus the substantive section 1.1 claims.
“Verified” concerns the present code, not an endorsement of the proposed replacement.

| Claim | Verdict and actual anchor | Evidence / qualification |
|---|---|---|
| Score is `round(2U + 8 log10(1+B))`, solved state 0 | Verified: `core/engine/difficulty.js:37-45`; `core/engine/policy.js:48-52` | Inputs are checked non-negative integers; `score(0,B)` is 0. |
| One canonical MRV first-solution DLX measures B | Verified: `core/engine/difficulty.js:78`; `core/engine/tiling.js:140-157`; `core/engine/dlx.js:136-310` | Forced choices increment row trials but not branch trials; canonical ties select first header. |
| R/H are measured but unscored | Verified: `core/engine/difficulty.js:70-77, 95-96` | H uses per-piece placement counts before propagation. |
| Hard [17,25), Expert [25,37); only band acceptance | Verified: `core/engine/levels.js:42-44`; `core/engine/difficulty.js:121-123` | Additional generation checks concern layout novelty and uniqueness policy, not difficulty tier. |
| Starting clues are rounded share times K | Verified with omitted clamps: `core/engine/levels.js:18, 125-127` | At least one clue and at least two free pieces. |
| Count-guided random sampling then bounded beam; first hit | Verified: `core/engine/clues.js:50-53, 183-368`; `core/engine/policy.js:66` | At most 64 search ratings. Changed uniqueness repairs are separately rated and do not spend this counter. |
| Beam ranks band distance then centre distance | Verified: `core/engine/clues.js:170-175` | Final tie is lexicographic clue key. |
| `makeUnique` is only used for `require`; counting exists | Verified: `core/engine/clues.js:111-151, 230-246`; `core/engine/tiling.js:170-181` | One found solution proves uniqueness only with exhaustive traversal. |
| v2 compact code, other claims JSON | Verified with nuance: `core/engine/puzzlecode-v1.js:928-978, 1003-1025` | A v2 claim is compact only if exactly rebuildable. Non-rebuildable v2 also uses JSON. |
| Strict v2 pack reader; foreign claims preserved | Verified structurally: `core/engine/pack.js:734-838, 1193-1207` | “Strict” means field/type validation, not proof or recomputation of the claimed score. Foreign models warn; v1 does not. |
| UI shows level, score, saturation | Verified: `player/app.js:393-425, 646`; `player/strings.js:94-114`; `generator/ui/puzzle-panel.js:74-140`; `core/browser/print-dialog.js:45-62` | Claims are displayed regardless of model; changing readers alone does not provide a separate computed display rating. |
| Hint is “most constrained piece” | Imprecise: `core/engine/hints.js:140-183` | It maximises contact with occupied/blocked/border neighbours in a known solution; it does not count legal placements or prove a forced placement. |
| Large-board Hard can be fully forced | Verified by the two B=0 results above | More precisely, every selected MRV column had one row. This does not imply every unplaced piece initially had only one placement. |
| B is noisy across orders | Verified by the six-order probe; historical anchor is `docs/design-detail.md:2655` | The historical 5-6-point median is a recorded measurement, not recalculated here. |
| Multiple solutions ignored by score | Verified by formula; historical counts verified at `docs/calibration/bq-0-latest.md:223-224` | 4,204 accepted; 1,656 proved multiple; 1,445 unproved and 94 unchecked. Do not call all remaining puzzles unique. |
| Clues are random and centre is not an acceptance objective | Verified with nuance: `core/engine/clues.js:252-258, 345-364` | The beam already uses the centre. The first accepted result is not necessarily centre-optimal. |

## 3. Anchors, APIs, files and formats

### 3.1 Orientation audit

| Plan reference | Actual contract / correction |
|---|---|
| `core/engine/difficulty.js` | `MODEL:18`, `score(U,B):37`, `measure(board,pieces,clues,ws,limits):58`, `rate(...):109`, `inBand(r,target):121`; names and signatures verified. |
| `core/engine/policy.js`, `core/engine/levels.js` | `SCORE:48`, `BUDGETS:56`, `K60:95`, `SHARES:18`; caps and count tables verified. Freeze existing v2 constants separately before changing current policy. |
| `core/engine/clues.js` | `countRowLimit:61`, `makeUnique:111`, `ranked:170`, `selectClues:183`; `SelectContext` includes optional `onRate` at 24-35. No `onPhase`, skip recorder, or repair callback exists. |
| `core/engine/tiling.js` | `Model:24-36`, `buildModel:54-74`, `solveFirst:140`, `countSolutions:170`, `isValidLayout:213`, `lnsStep:346`, `lnsWalk:473`. Existing model does not expose width, height, piece sizes, row offsets, or cell map. |
| `core/engine/dlx.js` | `ExactCover(ws,numColumns,rowCols,rowStart,rowCount):58`; `solve(options):136`. `cover.rowCount`, `cover.columns`, and `cover.v` exist. Solver restores its structure, so multiple sequential solves of one live model work. |
| `core/engine/placements.js` | `preparePlacements:126`, `visitPlacements:287`; plan includes width/height, `pieceSizes`, `freePieceSource`, `freePieceIds`, `cellColumn` (`28-43, 217-230`). Emitted cell-column arrays are reused, not owned by callbacks. |
| `core/engine/workspace.js` | `reserve:240`, `createWorkspace(capacityBytes):293`, `fillArena:322`. `reserve` returns exact-length views; `arena.cellColumn` already copies the plan's map. Row cells ascend; piece column is last. |
| Canonical shape / RNG | `core/engine/geometry.js:126` exports `canonicalKey(cells)`; `core/engine/rng.js:148` exports `createRng(seedText,label='')`. Piece columns sort by size, canonical geometry, then ID (`core/engine/placements.js:185-192`). |
| `core/engine/types.js` | Metrics are actually `55-64`; Rating `66-74`; Puzzle `86-96`; RatingClaim `98-106`; PackPuzzle `115-125`; PuzzleCandidate `202-211`. These all need review, not only Rating. |
| `core/engine/pack.js` | `readMetricsV2:734`, `readRating:774`, `readPuzzle:894`, `ratingClaim:1193`, `toWire:1232`; both reader and writer whitelist puzzle fields (`65`). `made` otherwise disappears/rejects. |
| `core/engine/puzzlecode-v1.js` | Frozen `RATING:112`, `ratingJsonBytes:55`, count-only `measureFreePlacements:872`, `rebuildRatingClaim:895`, rating write/read anchors correct. This codec does not need the production v2 DLX measurement to rebuild R/H. |
| `core/engine/puzzlecode.js` | `createPuzzleCodec:563` exposes the optional count-only `measure` hook. It already dispatches raw version 1 and DEFLATE version 2 (`47-49, 228-264`). “New codec version” must not overwrite either. |
| `core/engine/generate.js` | `setAttempt:86`, `puzzleCandidate:172`, `completionCandidate:222`, calibration reuse `350-365`, `foldAccept:495`. The completion stream is `completion/<layout key>`, not a slot/attempt stream. |
| `core/engine/tasks.js`, `core/engine/protocol.js` | `executeTask:153`, `rate` case at 193-194; task kinds in `core/engine/protocol.js:17, 34-37`; payload readers at `557+`. Reply metrics are not a whitelist (`824-861`). |
| `core/browser/generation-client.js` | Metadata at `340`; accepted candidate-to-puzzle copy at `854-865`; deterministic fold consumption `1055-1062`. Provenance must also survive the Generator's separate state/export path. |
| Tool names | `tools/generate.mjs`, `tools/calibrate.mjs`, `tools/record-fixtures.mjs` exist. `tools/rate-probe.mjs` is new. `createWorkspace` requires a capacity argument. `calibrate --profile landscape` requires `--output`. |
| Tests / fixtures | `tests/difficulty.test.js:69-81, 127-138`, `tests/clues.test.js`, `tests/fixtures/clue-recipes.js`, `tests/fixtures/polyominoes.js`, `tests/fixtures/generation-case.json`, `tests/fixtures/generated-sample-pack.json` exist. Generation fixture assertions are `tests/generate.test.js:716-754`; scheduling invariance `687`, real 1/4-worker test `tests/generation-client.test.js:836`. |
| Code goldens | `tests/fixtures/puzzlecode-v1.json` and code test families exist. The supplied fixture recorder writes only the generation recipe and sample pack (`tools/record-fixtures.mjs:3-5, 37`). There is no general puzzle-code golden recorder in `tools/`. |
| Locales | Actual files are `generator/locale.en.js`, `generator/locale.vi.js`, `player/locale.en.js`, `player/locale.vi.js`. `generator/strings.js` and `player/strings.js` contain formatting helpers, not the language dictionaries. |
| UI references | Share/settings dialog patterns and `core/browser/svg-board.js` exist. Board view supports a single `selectedId`, clues and placements, not a lifted-group overlay (`core/browser/svg-board.js:34-44`). A new replay overlay requires deliberate UI support. |
| Browser acceptance page | `tests/browser/puzzle-code-acceptance.html` loads its JS at line 14; the HTML itself does not list numeric URL/QR limits. Do not run it during analysis. |
| Living design anchors | `docs/design-detail.md`: 5.2 at 619; 5.5 at 756; 6.10 at 1314; 6.11 at 1364; 7.1/2/3 at 1389/1403/1433; 7.6/7/8 at 1564/1571/1578; 8.1 at 1590; 10.5 at 1996; 11.11 at 2269; 14.1 at 2566. New 6.12 is available. |

The companion checkout path in the plan is obsolete. All evidence in this report is relative to this
repository. Historical calibration/design/task subfolders remain read-only.

### 3.2 Important omitted files

- `generator/jobs.js`, `generator/state.js`: successful set-attempt provenance, saved-set round trips,
  mixed batches, imported puzzles, derived display ratings.
- `core/engine/version.js`: generation algorithm identity. P1 changes outputs even before the rating-model
  switch. Replay must compare immutable creation versions, not versions stamped during a later export.
- `core/browser/puzzle-snapshot.js`, `core/engine/sharecode.js`, `core/engine/puzzlecode-input.js`: sharing
  and length boundaries, and the distinction between stored claims and computed display ratings.
- `tools/bench/runner.js`, `tools/bench/report.js`, `tools/bench/calibration-reference.js`: v3 measurement
  retention, terminology, and calibration aggregation.
- Existing state/jobs/client/pack/protocol/puzzle-code tests, Generator UI CSS, and both language packs.
  Adding engine ES modules does not require Sudoku-style classic-script lists.

## 4. Step-by-step review and recommended contracts

### P0.1: expose a complete, borrowed model

The proposed row views are correct, but insufficient for R3/R7/R8. Add:

```text
rowCount, rowCols, rowStart, columns, cellColumn,
width, height, freePieceCount, pieceSizes
```

Use `arena.cellColumn`; expose `plan.pieceSizes` in canonical free-piece order. Dimensions cannot be inferred
from the map's length, and `rowPiece` is not an index into the caller's `pieces`. Group metadata, if adopted
for repeated shapes, must also be canonical and carry multiplicity, not just a shape string.

Views remain valid only until the workspace builds another model (`core/engine/tiling.js:6-7, 77-82`). Extend the existing
live-model guard to the deduction entry point; exporting that guard is safer than silently reading stale
arrays. This is a small justified addition to the proposed “policy and types only” import restriction.
Test row/column dimensions, canonical source mapping, a non-square masked board, empty free pieces, and
stale use. Do not copy all rows merely to avoid specifying ownership.

### P0.2: deduction measurement

Keep DLX as the independent existence/counting reference. Before implementation, agree the following
contract; the score/cap choices requiring owner input are listed in section 5.

```text
DeductionResult:
  status: solved | incomplete | unsatisfiable
  first: null | {
    F, E, G, choices: integer[], info: number,
    Cmax, Dmax, deductionTier: 0|1|2|3, rules: {R1..R9: integer}
  }
  search: { Gt, nodes, work, probes, stop: exhausted|solution-limit|work-cap|node-cap }
  count: { found, limit, exhausted, classification: unique|few|many|unknown|none }
```

`G = choices.length`; `info = sum(log2(c))`; each `c >= 2`. The definition of Dmax must say guess depth
(then it equals G on a simple DFS path), or total placement depth; do not imply it is a separate difficulty
signal without defining it. `deductionTier` excludes guessing. If a separate overall `tier` is wanted, it is
4 when G>0 and otherwise the deduction tier.

Implementation details:

- Build a CSR column transpose once. Selecting a row covers its columns and removes *all* rows conflicting
  with them, including the selected row from subsequent eligibility. Uncovered-column counts count only
  eligible rows. A row is killed once; trail killed row IDs and covered columns, not duplicate notifications.
- Undo restores live rows, all affected column counts, covered flags, remaining pieces, and path counters.
  Use fixed-order scans or a deterministic queue. A row forced by several columns is placed and counted
  once. R1 wins attribution over R2 when both explain the same step.
- Speculative propagation is not final-path F/E/rule use. Snapshot the first successful path before undo;
  work on failed branches and later solution enumeration changes only search totals.
- Count every expensive operation class deterministically. At minimum include row-incidence scans, trial
  propagations, component/DP work and graph traversals. `nodes=20000` alone is not a useful upper bound.
- Do not recurse from R6 into R6. Its trial closure should be the explicitly agreed cheap closure, e.g.
  R1/R2 and R3 contradiction checks. Otherwise “one-step lookahead” becomes hidden unbounded search.
- Count classification: exhaustive 0 is `none`; exhaustive 1 is `unique`; 2..limit-1 is `few` even if work
  expires; reaching limit is `many`; non-exhaustive 0/1 is `unknown`. Add `solution-limit` to stop reasons.
  Require a solution limit of at least 2, preferably the planned 8. `stop:'solution'` does not describe
  continuing to enumerate solutions.
- No final solution means no final-path metric. Do not initialise G to zero and publish it as “no guess”.
  The caller must distinguish incomplete measurement from unsatisfiability.
- Allocation must be accounted for. A transpose alone costs roughly 4 bytes per nonzero, up to 20 MB under
  the current 5,000,000-nonzero bound (`core/engine/placements.js:46-47`). Current DLX allocations already consume the
  workspace budget. Add guarded reusable deduction slots or a separately metered bounded arena, with
  allocation-failure tests. Do not allocate an unbounded object per row or trail change.

Test corrections:

- The 3x2 P/monomino test needs the monomino **clued at (0,0)**, exactly as
  `tests/difficulty.test.js:72`. Without that clue, F=1/unique is not the specified puzzle.
- Use exact tiny solution sets for unique, two, eight-or-more, none, cap-before-first, and cap-after-first.
- Test equal repeated calls, permutation invariance, model reuse, undo after failed lookahead, and that
  every accepted row belongs to a valid exact cover.
- Old v2 recipes are observations, not a required ordering theorem. Even unit propagation alone finishes
  their Very easy and Easy puzzles (3 and 4 forced placements respectively). Adding lookahead may finish
  nominal Hard puzzles without guesses. Neither G nor total search Gt is monotone under arbitrary clue
  changes; the recipe clue sets are not nested (`tests/fixtures/clue-recipes.js:31-38`).

### P0.2b: rule catalogue

All nine rules are in scope. Correct their preconditions rather than implementing the informal table
literally.

| Rule | Sound implementation and required negative case |
|---|---|
| R1 forced cell | One eligible row in an uncovered **cell** column. Empty column is contradiction. Test two columns forcing the same row: one placement, not two. |
| R2 forced piece | One eligible row in an uncovered **piece** column. Test canonical piece indexing rather than source indexing. |
| R3 pocket | Every remaining connected piece lies within one free connected component. A component area must be achievable by a subset of remaining piece sizes. “Equals a piece size” is not enough to place that piece: smaller pieces might tile it. Place only a uniquely supported full-component row/allocation. Two 4-cell pockets, one square tetromino and two dominoes disprove unconditional placement of the square in either pocket. |
| R4 locked cell | For one identity-constrained piece, intersect cells of **all** its live rows; remove other pieces' rows through each common cell. Empty row set is contradiction, not an intersection of every cell. |
| R5 locked piece | If every live row through cell c belongs to the same identity-constrained piece P, remove P rows avoiding c. A group of two interchangeable copies is not one piece for this rule. |
| R6 dead placement | Select one row temporarily, apply the cheap closure, and reject only on a proved empty column/illegal residual component. Interrupted or unsupported checks mean “not disproved”, never “dead”. Count the permanent rejected row once as E. |
| R7 checkerboard | For a component, compute reachable `(area, dark-minus-light)` states using **optional** remaining pieces and their eligible regional row imbalances. A piece can be used at most once. Interval checks must over-approximate this set; an exact DP can strengthen them. Two separated equal-colour T-shaped regions with two T pieces disprove summing both eligible pieces as mandatory in either region. To remove a row, apply the necessary condition after tentatively selecting that row. |
| R8 neck/corridor | Find articulation cells of the current free-cell graph; for a candidate covering a neck, remove its entire footprint, recompute actual residual components and apply sound R3 feasibility. Do not treat pre-placement “left/right” sizes as isolated if other cells still connect them. A component check with an undecided DP budget cannot reject. |
| R9 pair exclusion | Require the two cells' support-piece union to be exactly `{P,Q}` **and no eligible row of either piece to cover both cells**. Then the two cells require two distinct pieces, so each piece must cover one of them. Only under that extra condition may rows covering neither be removed. Generalising to shape groups requires multiplicity-aware capacity constraints. |

The reproduced R9 counterexample is especially useful as a regression test:

```text
Board: ### / ###
Pieces: D = vertical domino, O = 2x2 square (rotations/reflections allowed)
Cells under consideration: (0,0), (0,1)
Both columns have support-piece set {D,O}.
Valid solution: D occupies the left column; O occupies the right 2x2 square.
O covers neither selected cell. The proposed R9 removes this valid row.
DLX independently counts exactly two solutions.
```

R3/R7/R8 rely on connected piece geometry. The low-level placement planner does not itself enforce every
pack-level shape invariant (`core/engine/placements.js:138-148`). Either validate this precondition for deduction inputs
or disable component deductions for disconnected pieces; do not infer it from row data alone.

Repeated shapes are a design issue, not a one-line `canonicalKey` optimisation. R4/R5 are sound for labelled
pieces today. Merging copies into one exact-one column loses multiplicity and can make R5 unsound. A
human-facing interchangeable model needs explicit remaining counts and a definition of whether solution
counts quotient identity swaps. See Q-P03.

Tests need both positive rule-specific witnesses and negative near-misses. For non-unique tiny boards,
enumerate **every** solution and check that no solution row is removed. Checking one planted solution,
as the plan suggests, is a useful smoke test but cannot establish rule soundness. Include rectangular,
masked, duplicated-shape, nonzero-clue and parity-sensitive boards.

### P0.3: rate probe

The tool is worthwhile before changing generation. Keep it read-only by default and reuse the headless
client/parser contracts of `tools/generate.mjs:29-72`. A pack input must be parsed/validated, not blindly
cast from JSON.

Recommended JSONL record:

```text
{ puzzleId, board:{width,height,active}, sourceModel, storedScore,
  v2:{score,metrics}, deduction:{first,search,count},
  orders:{seed,policy,count,B:[...],G:[...],summary:{...}},
  timing:{buildMs,dlxMs,deduceMs}, modelSize:{rows,nonzeros,bytes} }
```

Omit timing from deterministic semantic comparisons. Define median for an even order count. Keep progress
on stderr. Handle all-clued and incomplete puzzles explicitly.

The present deduction proposal has no order-control input, so it cannot produce the requested G-versus-B
noise table. Add a diagnostic-only deterministic tie-order option, with the canonical production policy as
the default. Do not silently run three production orders merely because a noisy example is found.
Measurements should include 10x6, 12x12 and 20x18, several levels, both uniqueness modes, and allocation
peaks. Report distributions and sample counts, not one “typical” puzzle.

### P1: centre-seeking clue selection

Use an explicit finite candidate state machine:

1. `rateSubset` records each distinct, non-excluded raw subset at most once and increments the existing
   64-rating counter. Retain all in-band candidates in deterministic rank order.
2. Define stopping separately from choice: centre window, search budget, or exhausted neighbourhood.
   When stopping, select the best **observed eligible result**, not necessarily the latest candidate.
3. In `require` mode memoise each `finish` attempt by raw subset. A repair is performed once; record its
   final key/rating/certificate. Reject repaired keys in `excludeClueKeys`, and deduplicate repairs that
   converge on the same final subset. Rank on the repaired score, not the pre-repair score.
4. If the preferred candidate fails repair or leaves the band, try the next retained candidate. If the
   search is not exhausted and no retained result survives, continue searching. A failed `finish` must not
   discard another known valid result.
5. Count/record repair ratings separately from the 64 search ratings. The trace and tests must not assert
   that *all* ratings, including repairs and set calibration, total at most 64.
6. For a finite band use an integer-score centre consistently, e.g. `(min + max - 1)/2`, or preserve the
   existing real centre. The choice changes ties and must be fixed in the task contract. Avoid Infinity
   arithmetic for very high dynamic `hell-n` bands.

The planned “profiles >= limit-16” stop is not self-explanatory: repair ratings do not use that budget.
Q-P04 requests the intended centre/search trade-off. The proposed new test should compare eligible final
candidates under the same uniqueness policy; comparing raw `onRate` candidates to a repaired result is wrong.

For weighted sampling, first copy counts immediately and associate them by `model.freePieces[i]`, then
map by piece ID to layout indices. Do not retain `placementsPerPiece` across another build. Building an
empty-board model is not necessarily cheap: it can be much larger than a clued model and fail the model cap.
Use placement counting without building DLX if this experiment is approved. A failure to collect optional
bias data must not prevent ordinary generation.

Tests should cover ties, best observed versus last observed, failed best repair, duplicate repaired keys,
all exclusions, no candidate, cap exhaustion, and identical results with 1-4 worker schedules. Existing
output fixtures necessarily move: the successful **set** attempt may change because set calibration also
calls `selectClues`.

### P2.1: formula and production rating

With the equation's constants:

```text
base = 12 * (1 - exp(-U/6))
rule = [0,0,2,4][deductionTier]
guess = 6*G + 4*info
penalty = few ? 2 : many ? 4 : 0
score = U === 0 ? 0 : max(0, round(base + rule + guess - penalty))
```

For finite U, `base < 12`; rule <=4 and penalty >=0. Therefore G=0 implies the rounded result <=16.
This is the correct proof. With base maximum 16 it is false: U=10 gives round(12.978+4)=17; U=15 gives 19.
The one-binary-guess U=6 example is **18/20/22** for deduction tiers 1/2/3 respectively, before penalties,
not universally 20. Two binary guesses give 28/30/32. Ask Q-P01 rather than letting a developer choose
between contradictory constants.

Use one `breakdownV3(metrics)` implementation as the source for both score and replay table, implemented
now rather than duplicating the equation until P4.3. Freeze nested policy objects as current `SCORE` does.
Separate:

- `MetricsV2` and frozen `SCORE_V2`, `scoreV2`, `measureV2`;
- `MetricsV3`, containing all scoring inputs and separately named `dlxStop` / `deductionStop`;
- `RatingV2` / `RatingV3` as a discriminated union.

Do not change v2 score rebuilding when current caps/weights change. The codec already has frozen v2 maths
and a count-only R/H rebuild (`core/engine/puzzlecode-v1.js:112-153, 872-915`); the pack reader does not calculate v2
scores at all. Keeping v2 measurement serves diagnostics and regression tests, not an invented decoder
dependency.

Build the model once for an unsolved puzzle, snapshot first-path deduction data, then run DLX on the same
live model. Keep diagnostic B's old effective-cap meaning inside a v2 diagnostic block, or explicitly
document any different meaning; do not let an unscored DLX cap decide v3 saturation accidentally.
An exhaustive no-solution result throws `UnsatisfiableError`. A cutoff before any solution is a different
outcome (Q-P02).

### P2.2: types and protocol

Change the types above and worker-task tests. Do **not** add an unnecessary second strict metrics schema
to `core/engine/protocol.js:490-516`; it already recursively copies bounded JSON. Its worker result parser explicitly
passes results through. Add v3 claim and worker round-trip tests through the current generic boundary.

For replay, add the task kind, payload field table and bounded input reader, then dispatch. That is a real
protocol change. Include `made` in any set/puzzle DTO that needs it, not in code snapshots that intentionally
omit provenance.

### P2.3: pack reading and writing

Implement `readMetricsV3`, model-specific required fields, finite/non-negative counts, choices >=2,
bounded arrays/rule keys, enum validation, and explicit optional/legacy handling. Preserve v2 metrics
opaquely without an unsupported-model warning, as the plan directs. Preserve v1 and foreign-claim behaviour.

Do not call a stored v3 claim a verified measurement merely because its schema passes. Bound the total
metrics size as well as each field; existing foreign metrics have a 4-KiB limit (`core/engine/pack.js:40-41`), while the
codec's complete rating JSON limit is 8 KiB. A long guess vector must fit both or have a deliberate compact
representation.

`ratingClaim`, `readPuzzle`, `toWire`, `createPack`, and state reconstruction all need compatible types.
Test unknown/missing fields, negative/non-finite counters, impossible enum combinations, limits, legacy
round trips, and `omitSolutions`. Keep old v2 golden claims unchanged as backward-compatibility evidence.

### P2.4: code length

No frozen-v1 grammar change is presently required: foreign rating JSON already round-trips and the
current codec can DEFLATE it. However a one-board, one-rating check is insufficient:

- `ratingJsonBytes = 8192` (`core/engine/puzzlecode-v1.js:55`);
- normalized code symbols <=16,000 (`core/engine/puzzlecode-input.js:12`);
- URL length <=16,000, warning above 4,000 (`core/engine/sharecode.js:11-13`);
- QR max version 40; absolute alphanumeric ceiling 4,296, reduced by URL prefix/error correction
  (`core/browser/qr.js:47-56, 111-145`).

Measure raw and auto-compressed codes, with/without answer tails, 676-cell production samples, and a
worst-case permitted metrics/choice vector. Check QR M and the existing L fallback with the real share
preparer, not a rough character estimate. Preserve graceful “link/code available, QR too large” behaviour.
The pre-approved browser acceptance gate belongs to the integration task, not this analysis.
If the requirement is “every supported puzzle must fit one QR”, Q-P07 must settle whether a new compact
codec belongs to this release; the plan's optional follow-up otherwise leaves that requirement unfulfilled.

### P2.5: re-rating on load

Implement a **derived display rating**, keyed by puzzle fingerprint plus current rating-model version.
Leave the pack/code claim, code text, URL and gameplay identity untouched. Re-rate the selected legacy
puzzle lazily in the existing worker pool and discard stale replies by revision/fingerprint. A completed
stored layout bypasses current verification (`player/state.js:584-587`), so rating cannot be inserted only
after `verifyPack` replies.

Extend `player/state.js`'s `PoolLike` kind contract (`210`) and scheduling carefully: `beginRequest` for a new
job can cancel previous work. Coordinate rating with verification/hints rather than creating races.
Generator imports and restored saved puzzles need the same claim/display distinction
(`generator/state.js:838-847`). Test a late result after navigation, cancellation, unavailable workers,
unmeasurable/invalid legacy puzzles, and no mutation of original codes.

Q-P08 covers the optional re-rated marker and print/share display consistency. Update both apps' real
locale files; changing only `generator/strings.js` or `player/strings.js` is not a translation change.

### P3: calibration and locking

Separate three validations:

1. **Mathematical invariants:** forced cap, one-rounding breakdown equality, penalties, input validation,
   caps/unknown status, and enum consistency. These are tiny quick tests.
2. **Fixed-puzzle characterisation:** measure the old recipes under v3, retain their historical v2 expected
   scores, and create independently justified v3 fixtures. Strictly increasing old v2 scores are not an
   algorithmic guarantee. Monotonic generation medians conditioned on “accepted in the requested disjoint
   bands” are nearly tautological; also assert hit/miss counts and actual G/tier distributions.
3. **Generation qualification:** compare matched seeds/board/level/quantity/uniqueness/worker configuration
   against v2; include 10x6, 12x12, 20x18 and the 676-cell length/performance case. Report incomplete
   measurements, repaired candidates and no-puzzle/partial outcomes, not just accepted scores.

The prescribed command must include an output base, for example:

```text
node tools\calibrate.mjs --profile landscape --workers 4 --fresh-process --output docs\difficulty-v3\landscape
```

It is a large gate, not a quick probe. Schedule bounded case/seed shards and record sample sizes, machine
load and cumulative elapsed time. The existing landscape defaults to 20 seeds per case
(`tools/bench/calibration-reference.js:16, 214-232`).

The runner currently stores only score/level/saturation for accepted puzzles and calls the **clue count G**
(`tools/bench/runner.js:689-695`). Add nested deduction metrics or rename the diagnostic clue field
explicitly; do not accidentally interpret old G as guesses. It does not emit replayable packs. Either add
approved pack capture with bounded output or re-generate selected exact recipes in `rate-probe`. Assign
this missing tooling work to a developer.

Changing K60/SHARES, work caps, multi-order aggregation or score weights changes behaviour. Record owner
approval of the choice/range separately from permission to run calibration (Q-P02/Q-P05/Q-P06/Q-P09).
Do not lower a cap to make a slow test pass without measuring the changed rating distribution.

### P4.1: provenance

Use a versioned discriminated record, not a union with undocumented `{set:true}`:

```text
SetOrigin = { schema:1, seed, level, attempt, uniqueness,
              versions:{algo,policy,rng,seedScheme,ratingModel} }
Made =
  { schema:1, kind:'calibration' }
  | { schema:1, kind:'candidate', batchSeed, targetLevel, uniqueness,
      slot, attempt, skippedSubsets, versions:{algo,policy,rng,seedScheme,ratingModel} }
```

This is the recommended shape pending Q-P10. Store SetOrigin with the set and preserve it through reload,
saved sets and export. Per-candidate fields belong on `PuzzleCandidate` from `puzzleCandidate`, not inferred
from the consuming fold's final attempt. Include them in calibration reuse, `withAccepted`, `runFold`,
browser `accept`, `Puzzle`/`PackPuzzle`, pack reader/writer, and `puzzlesFromPack`.

Important details:

- `generator/jobs.js:283-296` currently ignores `result.attempt`; `generator/state.js:1300-1328` stamps current
  versions and omits the original set attempt. Fix these before relying on replay.
- The set's level and uniqueness are not necessarily the current batch's level and uniqueness.
- Set-creation and candidate-creation versions can also differ: a new batch may use a restored older or
  imported set. Preserve both origins. Missing/incompatible set provenance can disable stages 1-3 without
  inventing them; replay of stages 4-6 is possible when the actual set and candidate origin are available.
  Report stage availability explicitly under Q-P10 rather than stamping every stage with current versions.
- “Restart” is a deterministic attempt to find a random tiling; it may fail and fall back to the witness
  (`core/engine/generate.js:178-189`). Derive/re-record the actual start outcome rather than trusting a supplied flag.
- Capturing only keys actually skipped is sufficient if every exclusion decision is recorded, because
  re-execution follows the same prefix. Include `rateSubset` skips and the repaired-result exclusion check
  added by P1; observing sampling alone would miss a replay input. Full symmetry keys can be large:
  1,000 histories times up to two
  characters per board cell can exceed the pack limit. Prefer bounded bitsets of candidate-layout indices,
  or a similarly compact exact representation, not an unbounded `string[]`.
- Completion candidates have a different stream and need their source layout to replay. The plan both
  lists `start:'completion'` and declares completion replay unavailable. Q-P10 must resolve this.
- Existing `buildSample` uses `sample/<level>/<i>` streams, not ordinary candidate streams
  (`tools/record-fixtures.mjs:132-165`). Simply re-recording that fixture will not give it truthful ordinary
  `made` provenance. Keep it a legacy/import fixture or add a separately generated replay fixture.

Pack/code provenance is not an authenticity certificate. Bounds and version checks must prevent malformed
imports from initiating excessive replay work.

### P4.2: recorders and replay task

`replayPuzzle` needs the same **main and scratch execution workspaces** as generation, not one unspecified
`ws`; scratch capacity affects original restart/LNS behaviour. Proposed signature:

```text
replayPuzzle(set, puzzle, origin, execution, options?)
  -> { status:'matched'|'unavailable'|'mismatch'|'incomplete',
       reason?, steps, finalRating? }
```

Preflight origin/engine version compatibility before expensive work. Verify regenerated canonical piece
shapes, witness/layout, and exact final clue footprints, not only the symmetry-quotiented `clueKey`.
Compare the correct rating model and scoring inputs as well. A changed attempt can coincidentally produce
the same puzzle; the proposed “tamper attempt always means mismatch” test is not a valid general property.
Use an invalid version or a known differing replay as the mismatch fixture.

Recorder events should be plain owned JSON, with explicit stage and branch:

```text
{ stage:'clues', kind:'rated', source:'candidate', phase:'beam',
  sequence, clueIds, rating, band, accepted:false }
{ stage:'layout', kind:'retile', step, liftedIds, changed, layout }
{ stage:'unique', kind:'repair', addedId, alternateLayout, clues, rating }
```

Do not pass reused typed-array views, mutable carve sets, RNG instances or functions. Existing macro hooks
can abort or observe mutable state (`core/engine/carve.js:514-523`); add a separate observer rather than making replay
depend on those control hooks. Record accepted construction regions, not every abandoned growth node,
unless the UI explicitly calls that an exhaustive search trace.

Record every uniqueness repair and its changed rating: current `onRate` does not see those. “Every step,
up to 64” applies only to one clue-search profile budget, not set calibration + candidate + repairs.
Bound step count and payload bytes independently from generation budgets, with an explicit incomplete
trace result if exceeded. Replay cancellation must not cancel an unrelated generation job.

Tests: recorder off/on identical semantic result and RNG sequence; 1/4 workers; best-earlier-candidate
provenance; calibration reuse; exclusions; uniqueness repair; mixed target levels; saved-set reload;
completion/import fallback; version mismatch; malformed provenance; structured cloning; final exact board
equality. These are more valuable than one fresh 10x6 happy path.

### P4.3: score tables

Use the P2 breakdown helper. Include base, deduction tier/rule counts, per-guess alternatives/information,
penalty, rounded total, saturation/unknown-count explanation and band. Retain a v2 breakdown using frozen
v2 constants for legacy final claims. An unrated carving/retile state has `rating:null`, not the final puzzle's
rating relabelled as its own.

Compact view retains stage boundaries, final result, repairs, and strict best-so-far improvements under the
same P1 comparator. Every-step view includes all recorded rated candidates, including failed repairs and
below/above-band outcomes. Tie handling must be deterministic and documented.

### P4.4: Generator dialog

Add a dedicated `generator/ui/replay-dialog.js` and tests, wired through the app/controller and puzzle panel.
A puzzle card is currently itself a select button (`generator/ui/puzzle-panel.js:290-311`); do not nest the new replay
button inside another button. Follow existing dialog focus trapping, Escape, focus restoration, scrolling,
labels and theme patterns.

The existing SVG view has no lifted-group highlight contract. Prefer a replay-specific noninteractive
overlay or an additive `highlightedIds` option with renderer tests. Supply previous/next/play, a labelled
slider, textual stage/step status, and a live region that does not announce every animation tick.
Stop playback and cancel or detach only the replay request on close/navigation; no orphan timers.
Keyboard and screen-reader testing belongs to the pre-approved browser gate; each browser check remains
under one minute, the whole test run under ten.

### Documentation work by step

Every code-bearing task updates its touched facts in `docs/design-brief.md` and `docs/design-detail.md`,
with paired English/Vietnamese guides when applicable:

- P0: model layout, named deductions, work limits, tool layout/commands.
- P1: 6.10/6.11/7.6, centre selection, repair budget and exclusion rules.
- P2: 7.1-7.3/7.7/7.8/14.1; claim versus display rating; “+” semantics; historical v2 paragraph.
- P3: measured v3 availability/parameters/cost, without rewriting historical calibration records.
- P4: 5.2/5.5, new 6.12, 8.1, 10.5/11.11; saved-set persistence; replay availability and fallback;
  root README feature line and paired guides.

## 5. Open decisions

### 5.1 Implementer-level resolutions

These are corrections necessary to implement the stated behaviour, not discretionary product choices:

- Use canonical free-piece indexing and copy borrowed counts before another workspace build.
- Supply dimensions/sizes to region rules; guard stale models.
- Separate diagnostic and deduction stop reasons; retain all scoring inputs.
- Preserve frozen v2 code goldens and v2 maths; add v3 cases rather than overwriting compatibility evidence.
- Repair R3/R7/R8/R9 soundness as described; never accept an interrupted deduction as a proof.
- Memoise uniqueness repairs and check their final exclusion keys.
- Carry provenance on candidates from creation and through every persistence/serialization copy.
- Add `--output` to calibration; retain v3 metrics in benchmark output and distinguish clue count from G.
- Add actual locale files and state/jobs/renderer tests to the touch lists.
- Replace unsupported universal monotonicity assertions with explicit fixed-puzzle characterisation and
  independent generation acceptance tests. Report any changed historical classification.

### 5.2 Owner questions

These are **unadopted recommendations**. None reopens the fixed forced cap, multiple-solution penalty,
unchanged bands or default uniqueness policy.

| ID | Question and options | Recommendation | Consequences |
|---|---|---|---|
| Q-P01 | Which contradictory base formula? (a) base max 12 plus rule 0/2/4; (b) base max 16 plus explicit forced-score clamp; (c) redesign base/rule allocation while preserving forced <=16. | a | a has the proof in P2.1 and least special casing; b compresses high-U forced distinctions; c needs fresh calibration before coding. |
| Q-P02 | What happens when deduction work expires before the first solution, and how is work bounded? (a) incomplete/unrateable, consume candidate budget and skip; (b) publish a separately labelled conservative estimate; (c) a second bounded fallback finds a path before scoring. | a; add deterministic incidence/probe work limits as well as nodes | a may reduce hit rates but never fabricates G; b needs a new score/label contract; c increases cost and can change the meaning of “required guess”. Initial cap numbers must be selected from P0.3 evidence. |
| Q-P03 | How do interchangeable copies affect G and S? (a) raw labelled search/count; (b) quotient identical-piece permutations for both difficulty metrics, retaining raw DLX certificates; (c) quotient guesses but keep raw S. | b for human difficulty, explicitly documented | a is simplest but identity swaps can look hard; b needs a multiplicity-aware solver and distinguishes rating count from uniqueness certificate; c preserves existing raw count semantics but can penalise identity-only multiplicity. |
| Q-P04 | How much centre search? (a) best observed final result, stop in central half or at all 64 profiles; (b) stop at profile 48 as drafted; (c) spend all 64 whenever possible. Also choose real centre versus integer-score centre. | a, integer-score centre | a balances cost and quality; b leaves unexplained unused budget and weakens best-hit chances; c maximises search cost. All change deterministic fixtures. |
| Q-P05 | Placement-weighted clue sampling? (a) keep uniform sampling and change acceptance only; (b) adopt the drafted direction; (c) adopt an empirically validated weighting rule after a controlled probe. | a initially; c only after data | a isolates the centre change; b has no sound directional argument; c requires a precise weighting law, fallback and additional calibration. |
| Q-P06 | If G is order-sensitive, use (a) one canonical order; (b) median of three fixed orders; (c) report noise but postpone aggregation. | a with noise reported | b roughly triples deduction cost and needs a rule selecting the representative metrics/trace; c is operationally a until a later model revision. No automatic switch based on one probe. |
| Q-P07 | If the largest v3 code does not fit a QR, (a) retain existing no-QR fallback; (b) add compact v3 codec now; (c) omit/reduce claim diagnostics in codes with an explicit schema. | a unless universal QR is a release requirement | b adds substantial codec compatibility/testing work; c can keep codes short but limits offline score explanations. The 8-KiB JSON bound alone does not answer this. |
| Q-P08 | Re-rating presentation: (a) visible v3 display plus a re-rated/original-model note, original code/export claim intact; (b) silently show v3; (c) require a user action for display re-rating. | a, including consistent print captions | b hides a potentially large level change; c departs from automatic P2.5 load behaviour. No option mutates the original URL claim. |
| Q-P09 | Calibration may alter K60/SHARES and caps: (a) approve bounded search ranges after baseline data; (b) freeze generation tables and accept more partials; (c) redesign large-board carving now. | a, keep carving architecture out | a needs a declared comparison matrix and thresholds; b can make offered Hard levels impractical; c materially expands the plan. “Within ~10 points” should mean percentage points of matched hit rate, not relative percent. |
| Q-P10 | Replay provenance/fallback: (a) versioned compact skipped-subset record, exact set/candidate origins; completion has final-only fallback; (b) also store completion layout/origin for full replay; (c) store a bounded generation trace instead of recomputing. | a | b is more complete but costs provenance bytes; c makes results larger and changes the no-trace design. Also approve the bounded-trace unavailable state rather than silently truncating “every step”. |
| Q-P11 | Optional explanatory Player hints after P3: (a) exclude from this rating/replay release; (b) include rule-based hints now; (c) expose them experimentally behind an explicit setting. | a | b needs a current-position deduction API, explanations and hint-specific tests; c still adds UI/state scope. Full P0-P4 includes the catalogue and Generator replay, not automatically this explicitly optional extension. |

The full P4 feature and the gate runs themselves are already approved; they are not owner questions.

## 6. Proposed task breakdown, ownership and gates

### 6.1 Task-packing rule

Use one implementing developer in this repository at a time. Several tasks touch the same engine, types,
tests and living documentation; exclusive ownership is a **serial lease**, transferred only after the
predecessor is verified. Do not launch those tasks together merely because their feature labels differ.
The other repository can execute independently in parallel.

All rows include the relevant living-spec/paired-guide edits described above. Sizes include tests and
documentation: Small about 100-300 changed lines, Medium 300-800, Large 800-1,600. Split a row if its
implementation exceeds Large; do not omit negative tests to stay inside the estimate.

| ID | Title / scope | Depends on | Exclusive files while active | Size | Gates owned |
|---|---|---|---|---|---|
| PV3-01 | Complete borrowed model and lifetime contract; P0.1 | Owner answers affecting model/count semantics | `core/engine/tiling.js`, `core/engine/placements.js`, `core/engine/workspace.js`, `tests/tiling.test.js`, `tests/workspace.test.js` | Small-Medium | Quick + check |
| PV3-02 | CSR state, trail, R1/R2, bounded DFS, first-path/count contract; P0.2 | PV3-01, Q-P02/Q-P03 | New `core/engine/deduce.js`, `core/engine/policy.js`, new `tests/deduce.test.js`, model/type edits as required | Large | Quick + check |
| PV3-03 | R3/R4/R5/R6, deterministic work accounting, rollback/soundness fixtures | PV3-02 | `core/engine/deduce.js`, `core/engine/policy.js`, `tests/deduce.test.js` | Large | Quick + check |
| PV3-04 | R7/R8/corrected R9 and multiplicity handling | PV3-03 | `core/engine/deduce.js`, canonical/group metadata if needed, `tests/deduce.test.js` | Large | Quick + check |
| PV3-05 | P0.3 JSONL probe, tie-order diagnostics and cost report | PV3-04 | New `tools/rate-probe.mjs`, `tests/rate-probe.test.js`, diagnostic seam in `core/engine/deduce.js`, new dated probe report | Medium | Quick + check; bounded probes |
| PV3-06 | P1 centre search and memoised uniqueness finishes | PV3-05, Q-P04/Q-P05 | `core/engine/clues.js`, `core/engine/version.js`, `tests/clues.test.js`, generation fixtures/tests | Large | GF-P1, GA-P1 |
| PV3-07 | Pure v3 breakdown and legacy/current measurement APIs | PV3-05, Q-P01/Q-P02/Q-P03/Q-P06 | `core/engine/difficulty.js`, `core/engine/policy.js`, `core/engine/types.js`, difficulty tests; keep default model v2 until integration | Medium-Large | Quick + check |
| PV3-08 | Activate v3; pack/type integration and code-bound checks | PV3-06, PV3-07 | `core/engine/difficulty.js`, `core/engine/types.js`, `core/engine/pack.js`, protocol round-trip tests, pack/code tests and new v3 fixtures | Large | GF-P2, GA-P2, GC-P2 |
| PV3-09 | P2.5 legacy display re-rating in both apps | PV3-08, Q-P08 | `player/state.js`, `player/app.js`, `player/strings.js`, `generator/state.js`, jobs/import integration, rating DOM/panel, four locales, related state/UI tests | Large | Quick + check; GC-P2 |
| PV3-10 | P3 benchmark retention and qualification-ready tests | PV3-08 | `tools/bench/runner.js`, `tools/bench/report.js`, `tools/bench/calibration-reference.js`, `tests/calibration.test.js`, v3 quick/slow tests | Medium-Large | Quick + check |
| PV3-11 | P4.1 creation provenance through generation, storage and packs | PV3-08, Q-P10 | `core/engine/generate.js`, `core/engine/types.js`, `core/engine/pack.js`, `core/browser/generation-client.js`, `generator/state.js`, `generator/jobs.js`, their tests | Large | GF-P4; quick + check |
| PV3-12 | P4.2 engine observers and replay worker task | PV3-11 | `core/engine/carve.js`, `core/engine/tiling.js`, `core/engine/clues.js`, `core/engine/generate.js`, new `core/engine/replay.js`, `core/engine/tasks.js`, `core/engine/protocol.js`, replay/task tests | Large; split recorder and replay if needed | Quick + check |
| PV3-13 | P4.3/4.4 replay views, score table and accessible dialog | PV3-09, PV3-12 | New Generator replay dialog/controller tests, `generator/app.js`, puzzle panel, SVG overlay/CSS, Generator strings/locales, browser replay page | Large | GB-P4; quick + check |
| PV3-14 | P3 final calibration, chosen knobs, final fixtures and release evidence | PV3-10, PV3-13, Q-P09 and recorded knob decisions | `core/engine/policy.js`, allowed `core/engine/levels.js` count/share edits only, current v3 tests/fixtures, living docs and new v3 calibration records | Medium-Large excluding generated data | GL-P3, final GF/GA/GC/GB verification |

PV3-06 and PV3-07 are logically separate after probing, but both own policy/version/docs surfaces; serialize
them. P4 provenance does not mathematically require v3; the chosen schedule follows model integration to
avoid competing edits and extra fixture cycles. PV3-10 and early UI mock work can be prepared separately
only with an explicit file-disjoint handoff; no extra parallel developer is needed.

```text
Owner decisions -> 01 -> 02 -> 03 -> 04 -> 05 -> 06 --+
                                      05 -> 07 -----+-> 08 -> 09 --------+
                                                       08 -> 10 --------+-> 14
                                                       08 -> 11 -> 12 -> 13
```

### 6.2 Gate ledger: pre-approved, developer-owned

| Gate | Exact purpose / command | Owner task and result to record |
|---|---|---|
| Routine | `npm run test:quick`; `npm run check` | Every task; counts, failures, duration, changed facts. Never concurrently on one checkout. |
| GF-P1 | `node tools\record-fixtures.mjs --replace --reason "P1: clue selection aims at the band centre"` | PV3-06; record old/new versions and why piece/layout/clue keys moved. |
| GA-P1 | `npm test` | PV3-06 after fixture change; ten-minute limit. |
| GF-P2 | Re-record generation recipe/sample with explicit v3 reason; add justified v3 code fixtures while retaining old v2 goldens | PV3-08; no blanket replacement of historical codec data. |
| GA-P2 | `npm test` | PV3-08 after activation; rerun after calibration changes in PV3-14. |
| GC-P2 | 676-cell raw/auto/tail/URL/QR checks and the planned puzzle-code browser acceptance | PV3-08 owns codec result; PV3-09 repeats UI re-rating/share assertions; PV3-14 records final status. |
| GL-P3 | Corrected landscape command with output under `docs/difficulty-v3/`, bounded shards; `rate-probe` matched samples/order study | PV3-14; distributions, caps, hit rates, times, memory, final chosen constants. No old calibration record overwritten. |
| GF-P4 | Re-record/add provenance-bearing generated fixture after pack shape changes | PV3-11; do not fabricate provenance for `buildSample`'s special streams. |
| GB-P4 | New replay browser page and relevant existing dialog/share checks | PV3-13; focus/keyboard/slider/play/cancel/theme/locale checks; final rerun PV3-14 if behaviour changed. |

The plan's requirement for quick-green commits means a semantic change and its approved fixture updates
must land together. A future task must not leave the checkout red while waiting for a gate that the owner
has already authorised.

## 7. Risks

| Risk | Severity | Mitigation / release evidence |
|---|---|---|
| Unsound deduction silently inflates/deflates ratings or claims no solution | Critical | Per-rule proofs, complete tiny-solution oracle, negative near-misses, independent DLX comparison. |
| G=0 after an incomplete search interpreted as forced | Critical | Explicit missing first-path state; owner-approved incomplete policy; no fabricated metrics. |
| Large-board Hard hit rate collapses | High | Probe before activation; matched generation matrix; report partials; adjust only approved knobs. |
| Rule enumeration exceeds time/memory despite node cap | High | Deterministic work counters, reusable guarded buffers, per-size timings/peaks, cancellation tests. |
| Duplicate copies create fake guesses or raw-count mismatch | High | Resolve Q-P03 before implementation and explain rating versus certificate semantics. |
| Replay is incorrect after reload, mixed batches or retained-best acceptance | High | Immutable origin metadata end to end; exact final-state comparison; fallback rather than plausible fiction. |
| Old code compatibility changes | High | Frozen v2 constants and goldens; current/legacy discriminated types; no URL-claim mutation. |
| Worker scheduling changes accepted results near deadlines | Medium-High | Separate deterministic semantic tests from wall-time qualification; injected clocks; 1-4-worker tests. |
| Test artifacts collide between agents | Medium | One validation process per checkout, as the baseline demonstrated. |
| Calibration appears successful because only accepted bands are counted | High | Include all attempts, incomplete ratings, repair failures, partial batches and sample sizes. |

## 8. Effort estimate

Estimate after owner answers and a corrected task contract, not including approval waiting:

| Work | Engineering effort |
|---|---:|
| Model, reversible deduction state and R1-R9 with soundness tests | 30-45 hours |
| Probe, centre selection, v3 formula/types/pack/code integration | 18-28 hours |
| Legacy re-rating and Generator replay/provenance/UI | 24-38 hours |
| Calibration tooling, approved gates, documentation and fixes from measurements | 16-28 hours |
| **Total** | **88-139 hours, roughly 11-18 developer days** |

The largest uncertainty is the deduction cost and repeated-shape contract, not the arithmetic. A compact
new codec, if Q-P07 requires it, adds roughly 8-16 hours. Full-history completion replay adds roughly
4-8 hours. These are engineering estimates; Sonnet task execution time is not reliably inferred from
changed-line counts. Both repositories can proceed concurrently, but one developer per repository is the
safe default. Full implementation is a multi-day effort, not a sequence of tiny edits.
