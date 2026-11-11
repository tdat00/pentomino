# difficulty-v3 plan: make "Hard" really hard

Status: plan, 2026-11-11. Nothing in this document is implemented yet. It is written for an AI agent (or a
developer) who starts a fresh session with no memory of the audit that produced it. Read `AGENTS.md` at the
repository root first; its rules apply to every step here. `docs/calibration/`, `docs/init-design/`,
`docs/regenerate-puzzle/` and `tasks/` are frozen records: never edit them. This folder (`docs/difficulty-v3/`)
is new and is where the v3 calibration reports go.

Companion document for the other project: `D:\git\tmp\sudoku\docs\difficulty-v3\plan.md`
(independent; the two projects share no code).

---

## 1. Why: the findings

### 1.1 What the generator produces today (probe of 2026-11-11, HEAD of `main`)

`node tools/generate.mjs --board <WxH> --level <id> --count N --seed <text> --workers 4`, metrics read from
`puzzles[i].rating.metrics` of the pack JSON on stdout.

| Board | Level | K (pieces) | Piece sizes | Per puzzle: U (to place), B (branch trials), score |
|---|---|---|---|---|
| 10x6 | easy | 7 | 6..11 | U 3-4, B 1-2, score 8-10 |
| 10x6 | **hard** | 9 | 5..8 | U 6, **B 6, 6, 10, 13, 32**, score 19-24 |
| 20x18 | **hard** | 16 | 19..27 | U 9-10, **B 0, 0, 2**, score 18-24 |
| 20x18 | expert | 18 | 14..24 | U 13, B 7-17, score 33-36 |

Observations:

1. **Hard on a large board is a piece count.** With B = 0 the DLX solver never had to choose between two
   placements: every step was forced. The puzzle is "place ten big pieces, each of which fits in exactly one
   place at the time you look". The score is `2U` and reaches Hard at U ≥ 9 regardless of any search.
2. **B is noisy.** On 10x6 the same level spans B = 6..32 (a 5x spread inside one band). The design's own
   measurement (`docs/design-detail.md` A.5) found that re-rating one puzzle under 6 search orders moves the
   score by 5-6 points; the Hard band is 8 points wide.
3. **Solution count is ignored.** In the BQ-0 calibration (`docs/calibration/bq-0-latest.md` ~223-224) 1,656 of
   4,204 accepted puzzles had several solutions (uniqueness `any` is the default). A puzzle with many solutions
   is easier to finish, but it scores the same.
4. **Clues are random.** `selectClues` draws clue subsets at random and returns the first one whose score falls
   in the band; nothing chooses *which* pieces to pre-place, and the band centre is never aimed at.

### 1.2 Code-level causes (verified at these lines)

| Cause | Where |
|---|---|
| `D = round(2U + 8·log10(1 + B))`, `U = 0 → 0` | `core/engine/difficulty.js` `score()` 37-45; weights `SCORE.weights = { U: 2, B: 8 }`, caps `{ branch: 5000, rows: 50000 }` in `core/engine/policy.js` 48-52 |
| B = branch trials of one canonical-order MRV DLX first-solution search; forced rows (one candidate) are not branches | `difficulty.js` `measure()` 58-100 → `tiling.js` `solveFirst()` 140-157 → `dlx.js` `ExactCover.solve()` 136+ (branch counting ~303-310) |
| R (free cells) and H (mean log2(1 + placements) per free piece) are measured and stored but not scored | `difficulty.js` 70-77, 95-96 |
| Bands `eL = round(10·1.45^(L−1.5))`: hard [17, 25), expert [25, 37); acceptance is `inBand` only | `core/engine/levels.js` `bandEdge()` 42-44, `difficulty.js` `inBand()` 121-123 |
| Starting clue share per level (`SHARES`), initial count `round(share·K)` | `levels.js` 18, `initialClueCount()` 125-127 |
| Clue selection: phase 1 random subsets (`SAMPLES_PER_COUNT` 4 × `COUNT_CHANGES` 8), phase 2 beam (`BEAM_WIDTH` 4, `MOVES_PER_MEMBER` 8), **first in-band hit returned** | `core/engine/clues.js` `selectClues()` 183-368; `accept()` 258; constants 50-53; budget `BUDGETS.clueSubsets = 64` (`policy.js` 66) |
| `ranked()` already sorts by band distance then distance to the band centre, but is only used to order the beam | `clues.js` 170-175 |
| Uniqueness: `makeUnique()` only in `require` mode; `countSolutions()` exists | `clues.js` 111-151, `tiling.js` 170-181 |
| The rating travels in puzzle codes and packs: v2 in a compact rebuildable form, any other model as a JSON text | `core/engine/puzzlecode-v1.js` `RATING` 111-124 (frozen v2 constants), `writeRating()` 958-967, `readRatingField()` 1003-1008 (`ratingJsonBytes: 8192`, line 55); `core/engine/pack.js` `readRating()` 774-838 (`difficulty-v2` strict, others "kept but not used"), `ratingClaim()` 1193-1207, `readMetricsV2()` 734 |
| Player and Generator only display `level`, `score`, `saturated` | `player/app.js` 405, 425; `player/strings.js` 94-99; `generator/ui/puzzle-panel.js` 79, 119, 140; `core/browser/print-dialog.js` 45-62 |
| Hints already use a human-like "most constrained piece" rule that the score ignores | `core/engine/hints.js` 140-183 |

### 1.3 Decisions already taken with the owner (do not re-open)

- Change the **model** (`difficulty-v3`), not only generation. Scope: difficulty and generation only.
- A fully forced puzzle (no guess needed by the deduction solver) **caps at Normal**, whatever U is. Hard and
  above require at least one real choice.
- Several solutions **lower** the v3 score. The uniqueness default stays `any`; `require` keeps proving uniqueness.
- Band edges in `levels.js` stay frozen (they are also frozen inside the puzzle code format); v3 is fitted to
  them by its weights.

---

## 2. The code you will touch (orientation)

```
core/engine/difficulty.js   MODEL, score(U,B), measure(), rate(), inBand()
core/engine/policy.js       SCORE (weights, caps), BUDGETS (clueSubsets 64, rateBranch, rateRows, countRows*)
core/engine/levels.js       bands (frozen), SHARES, initialClueCount
core/engine/clues.js        selectClues (phase 1 / phase 2), ranked, makeUnique, countRowLimit
core/engine/tiling.js       buildModel (54-74) → Model { cover: ExactCover, rowPiece, rowT, rowX, rowY, freePieces,
                            freeCells, placementsPerPiece, clues, pieceOrder }; solveFirst; countSolutions; isValidLayout
core/engine/dlx.js          ExactCover(ws, numColumns, rowCols, rowStart, rowCount); solve({ maxSolutions,
                            rowTrialLimit, branchTrialLimit, rng, onSolution, onProgress }); views v = { L,R,U,D,C,ROW,S,... }
core/engine/placements.js   preparePlacements → plan { columns = freeCells + freePieceCount, cellColumn[], freePieceIds,
                            freeCells, ... }; visitPlacements(plan, emit(pieceIndex, t, x, y, cellColumns))
core/engine/workspace.js    Workspace.reserve(plan, counts) → arena { columns, rowCols, rowStart, rows, rowPiece, rowT,
                            rowX, rowY, placementsPerPiece }; fillArena
core/engine/types.js        Metrics (57-63), Rating (68-71: model 'difficulty-v2'), RatingClaim
core/engine/pack.js         readRating / readMetricsV2 / ratingClaim (pack JSON ⇄ Rating)
core/engine/puzzlecode-v1.js  compact code: writeRating / readRatingField / rebuildRatingClaim (frozen v2 maths)
core/engine/puzzlecode.js   codec entry; `measure` hook (~560) used to rebuild R/H on decode
core/engine/generate.js     setAttempt / puzzleCandidate / foldAccept: calls selectClues
core/engine/tasks.js        worker task dispatch (kinds: setAttempt, puzzleCandidate, certify, rate, ...)
core/browser/generation-client.js  the batch loop (shared by the Generator, tools/generate.mjs, tools/calibrate.mjs)
tools/generate.mjs          headless generator (flags in its USAGE); tools/calibrate.mjs; tools/record-fixtures.mjs
tests/*.test.js             node --test; `slow` in a test name = skipped by `npm run test:quick`
tests/fixtures/             generated-sample-pack.json, generation-case.json, puzzlecode goldens (re-record only with approval)
docs/design-brief.md, docs/design-detail.md   living spec: §6.10-6.11 clues, §7 difficulty (7.1-7.3 model, 7.6 acceptance,
                            7.7 version bump rule, 7.8 caveats), §14.1 risks
```

---

## 3. Rules for the implementing agent

From `AGENTS.md`, plus specifics of this work:

1. After every step: `npm run test:quick` and `npm run check` (from the repository root). `npm test` (with the
   slow tests) and `tools/calibrate.mjs` runs are **APPROVAL GATE** items: ask first, they take minutes.
2. Never re-record fixtures (`tools/record-fixtures.mjs`, `tests/fixtures/*.json`, puzzle-code goldens) without
   the owner's approval. Steps that need it are marked.
3. Do not edit anything under `docs/calibration/`, `docs/init-design/`, `docs/regenerate-puzzle/`, `tasks/`.
4. Update `docs/design-brief.md` and `docs/design-detail.md` in the same change as the code; update
   `USERGUIDE.md` + `USERGUIDE.vn.md` and `DEVELOPERGUIDE.md` + `DEVELOPERGUIDE.vn.md` where they state the
   formula, the "+" (saturated) mark, or the levels. Keep English and Vietnamese in step.
5. Engine modules (`core/engine/*.js`) are pure: no DOM, clocks, randomness except an injected `Rng`. They are
   `// @ts-check` ES modules with JSDoc types; follow `core/engine/types.js`.
6. `core/engine/tasks.js` + `core/engine/protocol.js` validate every worker message: a new metric field that
   crosses the worker boundary must be added to the protocol reader (`protocol.js` ~495-510 for ratings) or the
   message is rejected.
7. One commit per step, quick tests green at each.

---

## 4. The steps

Order: **P0 → P1 → P2 → P3**. P0 adds measurement without changing any output. P1 changes which clue subsets
are chosen (fixtures move). P2 switches the model (format + fixtures + docs). P3 calibrates and locks it with tests.

### P0.1 — expose the row structure on the model (tiny)

`core/engine/tiling.js` `buildModel()` (54-74): add to the returned object `rowCols: arena.rowCols`,
`rowStart: arena.rowStart`, `columns: arena.columns` (views, no copy), and `cellColumn: plan.cellColumn`,
`freePieceCount: plan.freePieceIds.length`. Update the `Model` typedef at the top of the file. Column layout
(from `placements.js` header): cell columns first (`0 .. freeCells−1`, index = `cellColumn[y*width + x]`),
then one column per free piece (`freeCells + pieceIndex`). Rows are grouped by piece (`rowPiece`), each row's
columns are `rowCols[rowStart[r] .. rowStart[r+1])` in ascending order with the piece column last.

### P0.2 — new module `core/engine/deduce.js`: a human-style deduction solver

Pure ES module; imports only `./policy.js` (caps) and types. It does **not** replace DLX; it measures how much
deduction and how much guessing a puzzle needs, with propagation a person can do by looking at the board.

**Exports**

```js
/** @typedef {{ F: number, E: number, G: number, Gt: number, Cmax: number, Dmax: number, nodes: number,
 *   S: number, solutions: 'unique' | 'few' | 'many' | 'unknown' | 'none', stop: 'solution' | 'node-cap' | 'exhausted' }} DeductionMetrics */
export function measureDeduction(model, limits = DEDUCE): DeductionMetrics
```

| Metric | Meaning |
|---|---|
| F | placements made by propagation: a column (cell or piece) with exactly one live row |
| E | rows removed by one-step lookahead (tentative placement leads to an empty column or an unfillable free region) |
| G | guesses on the path to the first solution (nodes where ≥ 2 live rows remained after propagation and lookahead, counted once per node on the final path) |
| Gt | all guess nodes visited, backtracked ones included |
| Cmax | largest number of alternatives at a guess node on the final path |
| Dmax | deepest guess node on the final path |
| nodes | total nodes visited (work counter; the cap) |
| S | solutions found, up to `limits.solutions` (continue after the first solution while nodes remain) |
| solutions | `unique` (S = 1 and the tree was exhausted), `few` (2 ≤ S < cap), `many` (S ≥ cap), `unknown` (node cap hit before exhaustion with S ≤ 1), `none` (exhausted, S = 0 → the caller throws `UnsatisfiableError`) |

**Algorithm** (self-contained, over `model.rowCols/rowStart`, no dancing links):

1. Build once per call: `colRows` (CSR transpose: rows of each column), `live: Uint8Array(rowCount)` (1 = live),
   `colCount: Int32Array(columns)` (live rows per column), `covered: Uint8Array(columns)`, a trail stack for undo.
2. `propagate()`: repeat until no change: for each uncovered column with `colCount == 0` → contradiction; with
   `colCount == 1` → select its single live row (`F++`): mark its columns covered, kill every other live row
   that touches any of those columns (update `colCount`). Push every change on the trail.
3. `lookahead()`: for each uncovered column with `colCount <= limits.lookaheadWidth` (default 4): for each of
   its live rows, tentatively select it + `propagate()`; if contradiction, or the free-region check fails,
   undo and kill the row (`E++`), else undo. Repeat `propagate()` when something was killed. The free-region
   check: BFS over uncovered cell columns using board adjacency (needs the cell coordinates: invert
   `cellColumn`); every connected region's size must be ≥ the smallest remaining piece size and must be a
   subset sum of the remaining piece sizes (`remaining` = sizes of free pieces whose piece column is uncovered;
   small DP over sizes, cached by multiset key).
4. `guess()`: choose the uncovered column with the fewest live rows (ties: cell columns before piece columns,
   then lowest index: deterministic, no RNG); for each live row in row order: select, `propagate()`,
   `lookahead()`, recurse. Count `Gt++` on entry to a guess node, record depth and alternatives; when the first
   solution is found, copy the path's guess nodes into G / Cmax / Dmax. Stop at `limits.nodes` (→ `stop:
   'node-cap'`, `saturated` for the caller) or when `S >= limits.solutions`.
5. Return the metrics. The whole thing must be deterministic and must not depend on piece ids, colours or
   input order beyond the canonical model order (test it).

**Caps:** `policy.js` → `export const DEDUCE = Object.freeze({ lookaheadWidth: 4, nodes: 20000, solutions: 8 })`.
Target cost: about one DLX rating on a 10x6 board, bounded on 20x18 by `nodes`. Measure with the probe tool
(P0.3) and tune the constants before P2.

**Tests** `tests/deduce.test.js` (quick):

- A 3x2 board with a P-pentomino and a monomino (same fixture idea as `tests/difficulty.test.js:69-81`): `F = 1`,
  `G = 0`, `solutions = 'unique'`.
- The 12-pentomino 10x6 set used by `tests/clues.test.js` (look for its fixture / recipes): for the recipe clue
  subsets of each level very-easy → master, `G` and `Gt` are non-decreasing with the level index (first
  monotonicity test in the repository; if a recipe breaks monotonicity, record it as a finding, do not weaken
  the test silently).
- Invariance: permuting piece ids, colours and piece order leaves every metric unchanged (mirror
  `difficulty.test.js:127-138`).
- Determinism: two calls, same metrics. Node cap: with `nodes: 5` on a hard fixture `stop === 'node-cap'`.
- A puzzle with two solutions (build one: e.g. two identical pieces that can swap) → `solutions === 'few'`.

### P0.2b — the rule catalogue (human solving techniques)

Audit of 2026-11-12: the engine has **no** named solving technique today. Rating uses raw DLX search;
`hints.js` (140-183) only picks, from a known solution, the piece touching the most borders. The steps of
P0.2 above cover rules R1, R2, R6 and part of R3; the others are missing and are what people actually use.
Implement all of them in `deduce.js` as separate, individually counted rules, applied cheapest first
(restart from R1 after any rule fires, like a Sudoku technique ladder):

| Rule | Tier | Name | Deduction | Implementation over the row / column model |
|---|---|---|---|---|
| R1 | 1 | forced cell | a free cell that only one placement can cover → place it | cell column with one live row |
| R2 | 1 | forced piece | a piece with one legal placement left → place it | piece column with one live row |
| R3 | 1 | pocket | a free region (side-connected) whose size equals one remaining piece, or which only one remaining shape fits → place; a region smaller than the smallest remaining piece, or whose size is not a sum of remaining sizes → contradiction | BFS on uncovered cell columns + subset-sum DP on remaining sizes |
| R4 | 2 | locked cell (piece claims a cell) | every live placement of piece P covers cell c → no other piece may cover c: remove their rows at c | intersect the cell sets of P's live rows |
| R5 | 2 | locked piece (cell claims a piece) | every live row covering cell c belongs to piece P → remove P's rows that do not cover c | all rows of column c share `rowPiece` |
| R6 | 2 | dead placement | a placement that leaves a neighbouring cell uncoverable or an illegal pocket (R3) → remove it | the one-step lookahead of P0.2 step 3; count as E |
| R7 | 3 | checkerboard parity | colour the board like a chessboard; every placement has an imbalance (dark − light) in a known set per piece; a region's imbalance must be reachable by the pieces that can still go there → contradiction or removal of placements with the wrong imbalance | per row precompute `imb[r]`; per region compare its imbalance with the min / max sum over the remaining pieces (interval check; exact DP when few pieces) |
| R8 | 3 | neck / corridor | a region joined to the rest through a width-1 neck: the piece covering the neck cell fixes how many cells it takes from each side; sides whose remaining size is not a sum of remaining piece sizes kill that placement | articulation cells of the free-cell graph; reuse the R3 size check on each side per candidate row at the neck |
| R9 | 3 | pair exclusion | two pieces that are the only ones able to cover two cells (hidden pair analogue): remove their placements that cover neither | pairs of cell columns whose live rows come from the same two pieces |
| — | 4 | guess | none of the above fires: choose the most constrained cell / piece and try (G, Cmax, Dmax of P0.2) | MRV branch |

Metrics added to `DeductionMetrics`: `rules: { R1..R9: count }` and `tier`: the highest tier that was needed
on the path to the first solution (1..3, or 4 when a guess was needed). Shapes repeated in a set (identical
pieces) must be handled as interchangeable in R4 / R5 / R9 (group pieces by canonical shape key,
`core/engine/geometry.js` `canonicalKey`), otherwise the rules under-fire on sets with duplicates.

Tests (`tests/deduce.test.js`, one hand-built board per rule where exactly that rule is needed and the cheaper
ones do not fire): a 2-cell dead end for R6, a mutilated-chessboard style board for R7 (parity proves
unsatisfiable without search), an hourglass board for R8. Each rule must be **sound**: for every fixture with
a known solution, no rule ever removes a row of that solution (generic test over all recipe fixtures).

Use of the catalogue beyond rating (optional, after P3): the Player's hint can say *why* a piece goes
somewhere ("only this piece can cover the corner") by running the ladder on the current position and showing
the first rule that fires, instead of the border-contact heuristic of `chooseHintPlacement`.

### P0.3 — probe tool `tools/rate-probe.mjs`

Node ES module modelled on `tools/generate.mjs` (flag parsing, `boardFromRows`/`preset`, `createWorkspace`).
Inputs: either `--pack <file.json>` (a pack from `tools/generate.mjs`) or the generate flags
`--board/--level/--count/--seed/--workers` (then it generates first by calling the same `createGenerationClient`).
For every puzzle it prints one JSON line: `level, score (v2), U, B, stop, R, H`, the P0.2 metrics, and
`Bk`: B under `k` seeded row orders (`--orders k`, default 5) using `solveFirst(model, { rng:
createRng(seedText + '#order' + i), rowTrialLimit, branchTrialLimit })` from `core/engine/rng.js`
(`createRng(seedText, label)`), reporting min / median / max. k-order averaging stays a tool feature: in
production it would multiply the 64-rating clue budget by k.

Use it to answer, before P2: (a) how noisy G is versus B; (b) the cost of `measureDeduction` on 10x6, 12x12,
20x18 (`nodes` and wall time); (c) the distribution of G, Cmax, solutions per level with today's generator.
Write the answers to `docs/difficulty-v3/probe-<date>.md`.

Verify: `npm run test:quick && npm run check` (add a small `tests/rate-probe.test.js` that runs the tool on
`tests/fixtures/generated-sample-pack.json` and checks the JSON lines parse).

### P1 — deliberate clue selection, aimed at the band centre (fixtures move)

**File:** `core/engine/clues.js` `selectClues()` (183-368). Keep the two-phase structure and the 64-rating
budget; change what is accepted and what is sampled.

1. **Acceptance.** Replace `accept()` (258: first in-band candidate returned) with:
   - collect every in-band candidate in `inBand[]` (phase 1 and phase 2 alike);
   - return immediately only when a candidate lies within `±(target.max − target.min)/4` of the band centre
     (`(min + max)/2`), or when `profiles >= limit − 16` (leave room; tune), or when the beam is exhausted;
   - otherwise return `ranked(target, inBand)[0]` (170-175 already prefers the centre) through `finish()`.
   - `finish()` (230-246) is unchanged: in `require` mode `makeUnique` repairs and re-checks the band.
2. **Which pieces become clues.** Compute once `const free = buildModel(board, pieces, [], ws).placementsPerPiece`
   (placements of each piece on the empty board; cheap) and keep it as an array of `{ index, count }`. In
   `sample(count)` (252) replace the uniform shuffle by a weighted draw: when the last ratings were **above**
   the band, prefer clue-ing pieces with **few** placements (they would be the forced ones anyway, so clue-ing
   them leaves the ambiguous pieces free: the puzzle gets easier); when **below**, prefer clue-ing pieces with
   **many** placements (removing ambiguity makes it harder... check this empirically with the probe: the
   intuition can be wrong for interlocking shapes; if the probe disagrees, keep uniform sampling and only
   change acceptance). Use `rng` only (determinism).
3. Phase-2 `neighbours()` lean (313) unchanged.

**Tests:** all of `tests/clues.test.js` must still pass (in band for every level on the 12-pentomino set,
`require` mode proofs, nightmare/hell-1 fail within 64 ratings, uniqueness repair that leaves the band is
rejected). Add: "when several in-band candidates were rated (observe through `onRate`), the returned clue set is
the one closest to the band centre among them".

**APPROVAL GATE:** `node tools/record-fixtures.mjs --replace --reason "P1: clue selection aims at the band centre"`
re-records `tests/fixtures/generation-case.json` and `generated-sample-pack.json` (read by
`tests/generate.test.js` ~719-754). Then `npm test` once.

**Docs:** `docs/design-detail.md` §6.10 (clue strategy), §6.11, §7.6 (acceptance); `design-brief.md` if it
describes "first in-band".

### P2 — `difficulty-v3`: the model

**P2.1 Formula** (`core/engine/difficulty.js`, weights in `policy.js`):

```
inputs   U   pieces to place (as today)
         G, Cmax, Dmax, solutions, stop   from measureDeduction (P0.2)
         B   kept in metrics for diagnostics, not scored

base(U)  = 12 · (1 − e^(−U/6))            bounded: 3 → 4.7, 6 → 7.6, 9 → 9.3, 15 → 11.0, ∞ → 12
rule     = tier 1 → 0, tier 2 → 2, tier ≥ 3 → 4    (hardest deduction rule needed, P0.2b);
                                            base + rule ≤ 16 < 17 = Hard edge, so G = 0 never reaches Hard
guess    = a·G + b·Σ_i log2(c_i)           c_i = alternatives at guess node i on the final path (so Σ log2 c_i is the
                                            information the solver had to supply); starting point a = 6, b = 4
penalty  = solutions === 'few' ? 2 : solutions === 'many' ? 4 : 0
D3       = max(0, round(base(U) + rule + guess − penalty));   U === 0 → 0
saturated = stop === 'node-cap'  (then G, Σ log2 c_i are whatever was found before the cap; the '+' mark as today)
```

Properties this guarantees (write them as tests, P3): G = 0 ⇒ D3 < 17 (never Hard); one binary guess on a
6-piece puzzle ≈ 10 + 6 + 4 = 20 (Hard); two guesses ≈ 30 (Expert); the piece-count term saturates. The exact
`a`, `b`, the `16` and the `6` are **calibration knobs** (P3) in `policy.js`:

```js
export const SCORE_V3 = Object.freeze({ model: 'difficulty-v3', base: { max: 16, scale: 6 },
  weights: { G: 6, info: 4 }, penalty: { few: 2, many: 4 } });
```

Keep `score(U, B)` and `measure()` as `scoreV2` / `measureV2` (the puzzle-code reader and the pack reader still
need v2 maths to rebuild old claims; `puzzlecode-v1.js` has its own frozen copy already). New `scoreV3(m)`,
`measureV3(board, pieces, clues, ws, limits)` (buildModel once, run `measureDeduction`, and run the v2 DLX
`solveFirst` too so `B`, `branchTrials`, `rowTrials`, `stop` stay in metrics; throw `UnsatisfiableError` when
`solutions === 'none'`). `rate()` returns `{ model: 'difficulty-v3', score, level: levelForScore(score).id,
saturated, metrics }` with `metrics = { U, B, branchTrials, rowTrials, stop, R, H, F, E, G, Gt, Cmax, Dmax,
nodes, S, solutions }`. `MODEL = 'difficulty-v3'`; `SCORE.model` likewise. `inBand()` unchanged.

**P2.2 Types and protocol:** `core/engine/types.js` `Rating.model: 'difficulty-v2' | 'difficulty-v3'`, extend
`Metrics`; `core/engine/protocol.js` rating reader (~495-510) must accept the v3 metric fields (it validates
worker messages; the quick tests of `protocol` will fail until it does).

**P2.3 Pack format** (`core/engine/pack.js`): add `RATING_V3_FIELDS` and `readMetricsV3()` next to
`readMetricsV2()` (734-749); in `readRating()` (774-838) treat `difficulty-v3` as `current` (strict) and
`difficulty-v2` like `difficulty-v1` today (kept with basic fields + opaque metrics, "not used", no warning).
`ratingClaim()` (1193-1207) writes the v3 metrics. Update `tests/pack.test.js` (v2 fixtures become legacy
claims; add v3 round trips).

**P2.4 Puzzle code** (`core/engine/puzzlecode-v1.js`): **no change**. `writeRating()` (958-967) writes a
non-rebuildable claim as JSON text; a v3 claim therefore round-trips already, at the cost of a longer code.
Measure on a 676-cell puzzle (`tools/generate.mjs --board 26x26 ... --code`) that the JSON stays far under
`ratingJsonBytes: 8192` and that the code still fits the Player's URL and QR limits (`core/browser/qr.js`,
`share-dialog.js`; the puzzle-code acceptance page `tests/browser/puzzle-code-acceptance.html` lists them). If
it does not fit, add a compact v3 form as a new codec version (`puzzlecode.js` dispatch) in a follow-up; do
not change the frozen v1 maths.

**P2.5 Player and Generator:** both already show any claim's `level / score / saturated`. Add re-rating on
load: when a decoded puzzle carries a `difficulty-v2` claim, the Player rates it with v3 in its one-worker pool
(`player/state.js` ~617 uses `verifyPack`; `tasks.js` has a `rate` kind) and shows the v3 level; keep the
stored claim untouched in the URL. Generator: puzzles imported from a `#p=` link likewise. Strings: add the
"re-rated" note to `player/strings.js` / `generator` locales in both languages if you show one.

**APPROVAL GATE:** re-record `generated-sample-pack.json`, `generation-case.json`, puzzle-code goldens that embed
ratings (`tests/fixtures/puzzlecode-*.json`, `tests/puzzlecode*.test.js`), then `npm test`.

**Docs:** `docs/design-detail.md` §7.1-7.3 (replace the v2 formula and the "U and B only" rationale with v3;
keep a short "v2 (historical)" paragraph), §7.7 (the version-bump rule is satisfied: new `model` string), §7.8,
§14.1; `design-brief.md` difficulty paragraph; `USERGUIDE*.md` wherever "+" or the score is explained;
`DEVELOPERGUIDE*.md` code layout (`deduce.js`, `rate-probe.mjs`); `README.md` only if a command changes.

### P3 — calibration and locking tests

1. **Quick test** `tests/difficulty-v3.test.js`: on the 10x6 recipe fixtures, v3 scores strictly increase with
   level; any fixture with `G === 0` rates below Hard; the saturation and penalty branches; the worked-example
   table of the chosen weights (like `tests/difficulty.test.js` does for v2).
2. **Slow test** (name starts with `slow:`): `firstSetAttempt`-style generation per offered level on 10x6 and on
   a 12x12 fixture board (3 puzzles each, fixed seeds); assert the median v3 score increases with the level
   index and that no Hard+ puzzle has `G === 0`. Must finish well inside the 10-minute rule of `AGENTS.md`.
3. **Calibration run** (APPROVAL GATE): `node tools/calibrate.mjs --profile landscape` (hit rates and time per
   cell of the landscape matrix) and `tools/rate-probe.mjs` over the same packs. Write
   `docs/difficulty-v3/calibration-<date>.md` with: per level and board size the distribution of G, Cmax,
   solutions, v3 score, hit rate, time; the order-noise table (B vs G across k orders). Adjust `SCORE_V3`
   knobs until: levels are ordered on every board size; Hard needs G ≥ 1 everywhere; hit rates at hard/expert
   stay ≥ the v2 ones within ~10 points. Re-run the quick and slow tests after each knob change.
4. If `measureDeduction` is too slow on 20x18 at hell levels, lower `DEDUCE.nodes` (saturation is acceptable
   there, as it is for B today) before changing the algorithm.

### P4 — Generation Steps: show how a puzzle was made (like the Sudoku generator)

**Feasibility check (2026-11-12): yes, and cheaper than in Sudoku.** The Sudoku generator keeps a dig log in
every result and a pure module (`sudoku/generator/js/engine/replay.js`) turns it into steps with a score table
each. Pentomino keeps no log: the only hooks are worker progress (`tasks.js` 64, 104) and `onRate` in
`selectClues` (`clues.js` 218). But every stage is a pure function of its inputs and a named RNG stream:

| Stage | Function | RNG stream | What a step shows |
|---|---|---|---|
| 1 piece count | `setAttempt` (`generate.js` 86-139): `pieceCountRange`, `k = ks[rng.int]` | `createRng(seed, 'set/<attempt>')` | the allowed K range for the level and area, the K drawn |
| 2 carving | `carveMacro` (`carve.js` 494, already takes `hooks`) or `carveFlatSet` (281) | `.derive('macro')` / `.derive('flat')` | macro parts (guillotine cuts), then the pieces appearing one by one on the board |
| 3 piece set | `finalizeSet` (578), `validateSet` (642) | — | the finished set with its colours; the carve is the first solution |
| 4 layout change | `puzzleCandidate` (172-214): `randomTiling` on every third attempt, then `lnsWalk` (`tiling.js` 473, 8 steps of `lnsStep`) | `createRng(batchSeed, 'slot/<slot>/<attempt>')` → `'restart'`, `'walk'` | each re-tiling step: the group of pieces lifted, the new arrangement (or "stuck") |
| 5 clue search | `selectClues` (`clues.js` 183-368) | `.derive('clues')` (set: `'cal'`) | every rated clue subset: pieces pre-placed, **score table**, below / in / above the band; count changes (phase 1), beam moves (phase 2) |
| 6 uniqueness | `makeUnique` (111-151), `require` mode only | same | the second solution found, the piece added as a clue, the new rating |
| 7 accepted | — | — | the final puzzle and its score table |

So the steps can be **recomputed** on demand instead of being stored: no trace crosses the worker boundary
during generation, the pack and the puzzle code do not grow, and generation speed and results are unchanged.

**P4.1 Provenance (small format addition).** A replay needs to know which attempt produced the puzzle. Today
only the set records it (`generation.setSeed`, `setLevel`, `setAttempt`, design §5.5); a puzzle does not.
Add an optional per-puzzle object `made: { batchSeed, slot, attempt, start: 'witness' | 'restart' | 'completion',
skipped: string[] }` (the batch seed, the slot and attempt indexes given to `puzzleCandidate`, and the clue
keys that `excludeClueKeys` actually skipped during the search, normally none; they change the path because a
skipped subset is not rated). Write it in `generation-client.js` where a candidate is accepted (~821-1064) and
in `foldAccept` (`generate.js` ~495-541); the calibration puzzle of a set gets `made: { set: true }` (it is
replayed from `setSeed` / `setAttempt`). Carry it in the pack (`pack.js` puzzle reader / writer, optional
field, bounded) but **not** in the puzzle code. A puzzle without `made` (imported from a code, older pack,
completion pass from enumeration) shows "steps not available" for stages 4-6 and still shows stage 7.

**P4.2 Recorder in the engine (pure, opt-in).** Add an optional `record` callback to the stage functions; when
absent nothing changes (same RNG draws, same results; assert this in tests):

- `setAttempt(req, attempt, record?)` → `record({ kind: 'count', range, k })`, `{ kind: 'carve', mode, parts? }`;
  `carveMacro` hooks / `carveFlat` → `{ kind: 'piece', cells }` per region in creation order.
- `lnsWalk(..., record?)` → `{ kind: 'retile', step, cluster: pieceIds, changed: boolean, layout? }`.
- `selectClues(ctx)` already has `onRate(clues, rating)`; add `onPhase({ kind: 'count', from, to, reason })`
  and `{ kind: 'beam', members }`, and report skipped keys.
- `makeUnique` → `{ kind: 'repair', added: pieceId, witness }`.

New pure module `core/engine/replay.js`: `replayPuzzle(set, puzzle, generation, ws) → { steps: Step[], match:
boolean }`. It re-runs stage 1-3 from `(setSeed, setLevel, setAttempt)` and stage 4-6 from `puzzle.made` with a
recorder, then compares the recomputed clues with `puzzle.clues` (`clueKey`); `match === false` → the caller
shows "this puzzle was made by another version; steps not available" (versions: `generation.algo`,
`policy`, `rng`; see `core/engine/version.js`). A `Step` is plain data: `{ stage, kind, board state (poses
placed / lifted / clue set), rating?, band?, note ids }`, no text. New worker task kind `replayPuzzle` in
`tasks.js` + `protocol.js` (`TASK_KINDS`), run in the existing pool; cost ≈ one set attempt + one candidate.

**P4.3 Score table on every step.** For every rated clue subset and for the final puzzle, the table lists the
terms of the score: with `difficulty-v3` (P2) `base(U)`, `rule` (tier and the per-rule counts R1-R9), `guess`
(G and the alternatives at each guess), `penalty` (solutions), total and band; with `difficulty-v2` just
`2U`, `8·log10(1+B)`, total. Add `breakdown(metrics)` next to `scoreV3` returning these terms so the table
and the score can never disagree (Sudoku does the same with `SG.difficulty.breakdown`). Offer two views as
in Sudoku: **compact** (one step per stage, and for the clue search only the subsets that moved closer to the
band) and **every step** (all rated subsets, up to 64).

**P4.4 Generator UI.** In Step 3 ("Create puzzles"), each puzzle card gets a "How it was made" button that
opens a dialog (reuse the dialog pattern of `core/browser/share-dialog.js` / `settings-dialog.js`): a board
drawn with `core/browser/svg-board.js` (pieces placed, lifted group highlighted, clues marked), previous /
next / play controls with a slider, the step sentence, and the score table. Strings in `generator/strings.js`
and both locales (English and Vietnamese; the i18n parity test checks them). Keyboard and screen-reader
behaviour as the existing dialogs (design §11.11). The Player does not need it.

**Tests.** `tests/replay.test.js`: (a) recorder off vs on gives identical sets and puzzles for the recipe
fixture `tests/fixtures/generation-case.json`; (b) `replayPuzzle` of every puzzle of a freshly generated
10x6 pack has `match === true` and its last step equals the puzzle; (c) a tampered `made.attempt` gives
`match === false`; (d) steps are plain JSON (structured-clone safe) and deterministic. A browser page
`tests/browser/replay.html` in the style of the existing pages (each check under one minute).

**Docs.** `docs/design-detail.md`: new §6.12 "Generation Steps (replay)", §5.2 (the `made` field), §5.5,
§8.1 (task kind), §10.5 (the button and dialog); `design-brief.md`; `USERGUIDE.md` + `.vn.md` (feature);
`DEVELOPERGUIDE.md` + `.vn.md` (module). README feature list: one line.

**Order.** P4.1 and P4.2 do not depend on v3 and can ship first with the v2 table; P4.3 gains its value after
P2. **APPROVAL GATE:** fixtures re-recorded once because packs gain `made` (`generated-sample-pack.json`).

---

## 5. Risks and open points

- **Cost of the deduction solver** on 20x18 with 16-18 pieces of 20+ cells (100k+ rows): the lookahead must be
  bounded (`lookaheadWidth`, `nodes`). Measure first (P0.3), then set caps; never add clocks.
- **Hit rate at Hard on large boards may fall:** today's 20x18 Hard puzzles (B = 0) become Normal under v3. The
  clue search then needs subsets with a real guess; macro-carved sets have many solutions (`docs/design-detail.md`
  §6.11), so `solutions = many` plus the penalty pushes scores down further. Expect `difficulty-not-found`
  partials on big boards until the clue bias (P1 step 2) and `K60` / `SHARES` (`policy.js` 95, `levels.js` 18)
  are revisited for the new model. Those tables are not frozen; changing them is part of P3 calibration.
- **Puzzle-code length** grows for v3 claims (JSON text instead of the compact v2 form); see P2.4.
- **Determinism across worker counts** (`tests/generate.test.js` "1-4 workers") must hold: `measureDeduction`
  uses no RNG; `selectClues` keeps using only the injected `rng`.
- **Order noise is reduced, not removed:** G still depends on the deterministic MRV tie-break. If the probe
  shows G varying across tie-break orders by more than ~1 at Hard, rate with the median of 3 deterministic
  tie-break variants (cost ×3) and record that choice in the calibration report.

## 6. Reproduce the findings

```text
node tools/generate.mjs --board 10x6  --level hard   --count 5 --seed probe1 --workers 4 > p1.json
node tools/generate.mjs --board 20x18 --level hard   --count 3 --seed probe2 --workers 4 > p2.json
node tools/generate.mjs --board 20x18 --level expert --count 3 --seed probe3 --workers 4 > p3.json
node -e "for (const f of ['p1.json','p2.json','p3.json']) { const j = JSON.parse(require('fs').readFileSync(f,'utf8'));
  console.log(f, 'K', j.pieces.length); for (const p of j.puzzles) { const m = p.rating.metrics;
  console.log(' ', p.rating.level, p.rating.score, 'U', m.U, 'B', m.B, m.stop, 'clues', p.clues.length); } }"
```

2026-11-11 result: see §1.1 (20x18 Hard: U 9-10, B 0, 0, 2).

## 7. Checklist for the implementing agent

- [ ] P0.1 `buildModel` exposes `rowCols`, `rowStart`, `columns`, `cellColumn`, `freePieceCount`; typedef updated
- [ ] P0.2 `core/engine/deduce.js` + `DEDUCE` caps + `tests/deduce.test.js` (forced fixture, monotone recipes, invariance, determinism, cap, two solutions)
- [ ] P0.2b rule catalogue R1-R9 with per-rule counts, `tier`, duplicate-shape handling, one fixture per rule, generic soundness test
- [ ] P0.3 `tools/rate-probe.mjs` + test; `docs/difficulty-v3/probe-<date>.md` with cost and noise answers
- [ ] P1 `selectClues`: centre-seeking acceptance, (optionally) placement-weighted sampling; `clues.test.js` addition; APPROVAL GATE fixtures; design §6.10/6.11/7.6
- [ ] P2.1 `scoreV3` / `measureV3` / `rate()` → `difficulty-v3`; `SCORE_V3`; P2.2 types + protocol; P2.3 pack v3 strict, v2 legacy; P2.4 code-length check; P2.5 re-rate on load
- [ ] APPROVAL GATE: re-record fixtures and goldens; `npm test`
- [ ] Docs: design-detail §7.1-7.3, 7.7, 7.8, 14.1; design-brief; USERGUIDE / DEVELOPERGUIDE both languages
- [ ] P3 `tests/difficulty-v3.test.js` (quick + slow); APPROVAL GATE calibration run; `docs/difficulty-v3/calibration-<date>.md`; knobs locked
- [ ] P4 Generation Steps: `made` provenance per puzzle, opt-in recorders, `core/engine/replay.js` + `replayPuzzle` task, `breakdown()` score table, Generator dialog, tests, docs
- [ ] Final: §6 probe shows no Hard+ puzzle with G = 0, levels ordered on 10x6 and 20x18; `npm run test:quick && npm run check` green
