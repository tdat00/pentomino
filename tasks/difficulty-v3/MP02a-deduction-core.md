# MP02a — Deduction core: state, R1 and R2, search, statuses, caps, memory

| Header | Value |
|---|---|
| ID | MP02a |
| Depends on | MP01 (accepted and committed) |
| Estimated size | Large: about 800–1,100 changed lines (module about 450–550, tests about 350–450, documents about 80) |
| Owner role | Engine |
| Milestone | M1 — deduction solver |
| Design refs | `docs/difficulty-v3/report-detailed.md` RES-01, RES-03, RES-04, RES-08, RES-09, RES-10, RES-11 (items 1-4, 6, 7), RES-32 row MP02; check-list §4.2 D2-D8, D11-D13 (traceability only) |
| Implementation status | Not started |

## Goal & business context

The owner wants Hard puzzles to be really hard. Today's rating (`difficulty-v2`) counts the branch trials of a
generic exact-cover search, which says little about how a person solves a puzzle: a Hard puzzle can be solved without
a single real choice. The v3 rating measures a puzzle with a **deduction solver** instead: first the placements that
are forced, then small deductions, and a real guess only when nothing else works; it records how many guesses the
solution path needed and how wide they were.

This task builds the solver's core in a new module `core/engine/deduce.js`:

- the state of a partly solved board, with exact undo;
- the two simplest rules: R1, a free cell with only one possible placement, and R2, a piece with only one possible
  placement;
- the guess search with its counters, the first solution's path metrics, and the solution count;
- three independent statuses (the first path, the count, the caps), deterministic work and memory bounds;
- the provisional limits `DEDUCE`.

Later tasks add the other rules (MP02b, MP03, MP04) and the decisive census (MP05). Nothing in generation or rating
calls the solver before MP09c, so no output changes in this task.

## Scope

### In scope

- New `core/engine/deduce.js`: `measureDeduction`, its typedefs, the state, R1, R2, the search, the statuses, the caps,
  the work counter, the memory precheck and the `deduce.*` workspace slots, the `verifyUndo` diagnostic.
- `DEDUCE` in `core/engine/policy.js` and its pin in `tests/policy.test.js`.
- The `SOURCE_FILES` entry `core/engine/deduce.js` in `tools/bench/report.js`.
- New `tests/deduce.test.js`.
- `docs/design-detail.md`: §3.1, §4.2 and the new §7.9.

### Out of scope

- The R3 pocket check and the R6 lookahead (MP02b); R3 place, R4 and R5 (MP03); R7-R9 (MP04).
- The census, `Gproved` and the decisive values (MP05): `census` stays `null` and `first.census` stays `[]`.
- The `tieOrder` diagnostic (MP06a); any caller of `measureDeduction`; `IncompleteRatingError` (MP09c).
- Any change to `tiling.js`, `difficulty.js`, `clues.js`, `generate.js` or a fixture.

## Repository rules

- Read `AGENTS.md` and `tasks/difficulty-v3/check-list.md` §3 first.
- Native ES module, `// @ts-check`, JSDoc types; pure: no DOM, clock, storage, `Math.random` or `Date`; no RNG at all.
- `core/engine/deduce.js` must not contain the words `LIMITS`, `QUALIFICATION`, `enabledMaxActive` or `deriveLimits`,
  not even in a comment (`tests/bq-limits.test.js:116-122`).
- No test name may contain the word `slow` (`npm run test:quick` skips such tests).
- UTF-8 without BOM, CRLF, final newline, no trailing whitespace.
- Run only the commands of the test plan; never `npm test`, the calibration or fixture tools, or a browser page.
- Never stage, commit, stash, reset, push or switch branches; never edit `tasks/difficulty-v3/` or the reports.

## Inputs & context

### What MP01 delivered (`core/engine/tiling.js`)

The `Model` has, besides `cover` (an `ExactCover` with `ws`, `columns`, `rowCount`), `rowPiece` (the canonical
free-piece index of each row), `rowT`, `rowX`, `rowY`, `freePieces`, `freeCells` and `clues`:

- `rowCount`, `columns` (= `freeCells + freePieceCount`), `freePieceCount`, `width`, `height`;
- `rowCols`, `rowStart`: row `r` covers `rowCols[rowStart[r] .. rowStart[r + 1] - 1]`, its cell columns ascending and
  then its piece column `freeCells + rowPiece[r]` last; `rowStart[rowCount]` is the number of nonzeros;
- `cellColumn` (column of board cell `y * width + x`, or -1) and `pieceSizes` (free-piece sizes, canonical order);
- the arrays are views valid while the model is live; `assertLive(model)` and `ModelError` are exported by
  `./tiling.js`.

Cell columns are `0 .. freeCells - 1` (free board cells in row-major order); piece columns are
`freeCells .. columns - 1`, in canonical piece order (size, canonical shape, id). Pieces are edge-connected.

### Public API (new `core/engine/deduce.js`)

```js
// @ts-check
// <header comment: what the module measures, purity, the deduce.* slots, design §7.9>
import { DEDUCE } from './policy.js';
import { assertLive, ModelError } from './tiling.js';

/** @typedef {import('./tiling.js').Model} Model */

/**
 * Exactly the six fields of `DEDUCE`.
 * @typedef {object} DeductionLimits
 * @property {number} lookaheadWidth Integer >= 0; the R6 lookahead width (used from MP02b).
 * @property {number} nodes Integer >= 0 or Infinity; node cap.
 * @property {number} solutions Integer >= 2; the count stops at this many solutions.
 * @property {number} work Integer >= 0 or Infinity; work cap (deterministic work units).
 * @property {number} census Integer >= 0 or Infinity; census work budget (used from MP05).
 * @property {number} memoryBytes Integer >= 0 or Infinity; bytes of all deduce.* slots.
 */

/**
 * Test and probe diagnostics; production callers pass nothing.
 * @typedef {object} DeductionDiagnostics
 * @property {boolean} [verifyUndo] Check after every undo that the state equals the state at the matching mark.
 */

/** @typedef {{ R1: number, R2: number, R3: number, R4: number, R5: number, R6: number, R7: number, R8: number, R9: number }} RuleCounts */
/** @typedef {{ c: number, kLow: number, f: number, u: number }} CensusNode One per final-path guess node (from MP05). */

/**
 * @typedef {object} FirstPath
 * @property {number} F Placements by R1, R2 and R3 on the final path.
 * @property {number} E Rows killed by R6 on the final path.
 * @property {RuleCounts} rules Final-path counts: placements for R1-R3, killed rows for R4-R9.
 * @property {0 | 1 | 2 | 3} deductionTier Highest tier of a rule with a nonzero count; 0 when none.
 * @property {number} G Guess nodes on the final path.
 * @property {number} info Sum of log2(c) over the final-path guess nodes, in path order; 0 when G = 0.
 * @property {number} Cmax Largest c; 0 when G = 0.
 * @property {number} Dmax Rows selected on the path before the deepest guess node; 0 when G = 0.
 * @property {number[]} choices c of each final-path guess node, root first.
 * @property {number[]} rows Selected rows of the first solution in selection order (clues are not rows).
 * @property {CensusNode[]} census Empty until MP05.
 */

/**
 * @typedef {object} DeductionResult
 * @property {'complete' | 'capped' | 'none'} path
 * @property {FirstPath | null} first Non-null iff path === 'complete'.
 * @property {{ Gt: number, nodes: number, work: number,
 *   stop: 'exhausted' | 'solution-limit' | 'node-cap' | 'work-cap' }} search
 * @property {{ S: number, limit: number, exhausted: boolean,
 *   solutions: 'unique' | 'few' | 'many' | 'unknown' | 'none' }} count
 * @property {null} census Until MP05 (then `{ complete, undecided, nodes, work }`).
 */

/**
 * @param {Model} model A live model.
 * @param {DeductionLimits} [limits]
 * @param {DeductionDiagnostics} [diagnostics]
 * @returns {DeductionResult}
 */
export function measureDeduction(model, limits = DEDUCE, diagnostics = {}) { /* ... */ }
```

Key order of the result objects (keep it; probes and records print them): `{ path, first, search, count, census }`;
`first`: `{ F, E, rules, deductionTier, G, info, Cmax, Dmax, choices, rows, census }`; `search`:
`{ Gt, nodes, work, stop }`; `count`: `{ S, limit, exhausted, solutions }`; `rules`: `R1` to `R9`. `choices` and
`rows` are plain arrays owned by the result (copies, never workspace views).

### `DEDUCE` (`core/engine/policy.js`, after `ENUMERATION`)

```js
/**
 * Limits of the deduction solver (design §7.9). `work`, `census` and `memoryBytes` are provisional test defaults
 * until the probe measures them.
 */
export const DEDUCE = Object.freeze({
  lookaheadWidth: 4,
  nodes: 20000,
  solutions: 8,
  work: 50000000,
  census: 10000000,
  memoryBytes: 32 * 1048576,
});
```

`memoryBytes` is 33,554,432. `census` is defined now (check-list D13) and read from MP05.

### Validation and setup

1. `assertLive(model)` first (a stale model throws `/stale/`).
2. Validate `limits`, throwing a `RangeError` that names the field: `lookaheadWidth` an integer >= 0; `solutions` an
   integer >= 2; `nodes`, `work`, `census` and `memoryBytes` each an integer >= 0 or `Infinity`. A missing field is
   invalid (callers spread `DEDUCE`: `{ ...DEDUCE, nodes: 5 }`).
3. Let `R = model.rowCount`, `C = model.columns`, `NC = model.freeCells`, `NP = model.freePieceCount`,
   `NZ = model.rowStart[R]`.
4. **Memory precheck**, before any allocation: the bytes of every slot below (length times bytes per element). If the
   sum exceeds `limits.memoryBytes`, throw `new ModelError('model-too-large', 'deduction buffers need <bytes> bytes,
   the limit is <limit>', { bytes, limit })`. Keep the slots in one table (name, type, length) that drives both the
   precheck and the allocation, so that they cannot drift apart; MP02b and MP03 add rows to it.

   | Slot | Type | Length | Holds |
   |---|---|---|---|
   | `deduce.colStart` | Int32 | C + 1 | CSR transpose: start of each column's rows |
   | `deduce.colRows` | Int32 | NZ | CSR transpose: rows of each column, ascending |
   | `deduce.colCount` | Int32 | C | live rows of each column |
   | `deduce.live` | Uint8 | R | 1 while the row is eligible |
   | `deduce.covered` | Uint8 | C | 1 once the column is covered |
   | `deduce.trail` | Int32 | R + C | killed rows `r` and covered columns `-(c + 1)` |
   | `deduce.alt` | Int32 | R | alternatives of the guess nodes of the current path |
   | `deduce.altBase` | Int32 | NP + 2 | start of each depth's alternatives in `alt` |
   | `deduce.picked` | Int32 | NP + 2 | rows selected on the current path, in order |
   | `deduce.guessC` | Int32 | NP + 2 | c of each guess node of the current path |
   | `deduce.guessPlaced` | Int32 | NP + 2 | `picked` length at each guess node of the current path |

   Bounds: on any path a row dies at most once and a column is covered at most once, so the trail never holds more
   than R + C entries; the alternatives of nested guess nodes are pairwise disjoint (selecting an alternative of a
   node kills every other row of that node's column), so `alt` never needs more than R entries; every selected row
   covers a different piece column, so the path depth and `picked` stay below NP + 1.
5. Get each slot from the model's workspace: `const ws = model.cover.ws; ws.int32('deduce.colStart', C + 1)` and so
   on (`ws.uint8` for the two Uint8 slots). The workspace reuses a slot of sufficient size and checks its own capacity
   (`core/engine/workspace.js:182-215`); its `ModelError` propagates unchanged. Contents of a reused slot are
   unspecified: initialise everything you read.
6. Build the CSR transpose: count the entries of each column, prefix sums into `colStart`, then fill `colRows` row by
   row in ascending row order (so each column's rows are ascending). Work += 2 * NZ.
7. `live[r] = 1` for every row; `colCount[c] = colStart[c + 1] - colStart[c]`; `covered[c] = 0`. Work += R + C.
8. If `work > limits.work`: return `path: 'capped'`, `stop: 'work-cap'`, `nodes: 0`, `Gt: 0`, `S: 0`.
9. If `limits.nodes === 0`: return `path: 'capped'`, `stop: 'node-cap'`, `nodes: 0`, `Gt: 0`, `S: 0`.
10. Otherwise enter the root (`nodes = 1`) and search.

### Select, kill, mark and undo

```text
select(r):  for each column c of r: covered[c] = 1; push -(c + 1) on the trail; work += 1
            for each column c of r: for each row r2 in colRows[colStart[c] .. colStart[c + 1] - 1]:
                work += 1; if live[r2]: kill(r2)          // kills r itself too
            picked[pickedLength++] = r
kill(r):    live[r] = 0; for each column c of r: colCount[c] -= 1; work += 1
            push r on the trail
mark():     the pair (trail length, pickedLength)
undo(m):    while trail length > m.trail: pop x; work += 1
                if x >= 0: live[x] = 1; for each column c of x: colCount[c] += 1; work += 1
                else: covered[-x - 1] = 0
            pickedLength = m.picked
```

Remaining pieces are the uncovered piece columns; no other structure is needed.

### The ladder (this task: R1 and R2)

```text
ladder(counting):                          // returns FIXPOINT, CONTRADICTION or STOPPED
  loop:
    if work > limits.work: stop = 'work-cap'; return STOPPED
    R1: for c = 0 .. NC - 1:  work += 1; if covered[c]: continue
          if colCount[c] === 0: return CONTRADICTION
          if colCount[c] === 1: select(the live row of c); if counting: R1 += 1; continue loop
    R2: for c = NC .. C - 1:  the same, counting R2
    return FIXPOINT
```

"The live row of c" scans `colRows` of c (work += 1 per entry) for the entry with `live = 1`. Scanning cell columns
first credits R1 when one row is forced through both a cell and a piece (RES-06). MP02b inserts the R3 check and R6
after R2; later tasks insert R3 place, R4, R5 and R7-R9 at their places (R1, R2, R3, R4, R5, R6, R7, R8, R9).

### The search

```text
search():                                   // the node has been counted; returns STOP or CONTINUE
  m = mark(); saved = copy of the nine rule counters
  res = ladder(true)
  if res === STOPPED:       undo(m); counters = saved; return STOP
  if res === CONTRADICTION: undo(m); counters = saved; return CONTINUE
  best = -1; bc = +infinity
  for c = 0 .. C - 1: work += 1; if !covered[c] and colCount[c] < bc: best = c; bc = colCount[c]
  if best === -1:                           // every column covered: a solution
    S += 1; if S === 1: take the first-path snapshot
    if S >= limits.solutions: stop = 'solution-limit'; undo(m); counters = saved; return STOP
    undo(m); counters = saved; return CONTINUE
  Gt += 1                                   // a guess node (bc >= 2: R1 or R2 would have fired)
  copy the live rows of colRows[best], ascending, to alt[altBase[depth] ..]; work += 1 per entry scanned
  guessC[depth] = bc; guessPlaced[depth] = pickedLength; altBase[depth + 1] = altBase[depth] + bc; depth += 1
  result = CONTINUE
  for each alternative a, in ascending row order:
    if nodes === limits.nodes: stop = 'node-cap'; result = STOP; break
    nodes += 1
    if work > limits.work: stop = 'work-cap'; result = STOP; break
    m2 = mark(); select(a); out = search(); undo(m2)
    if out === STOP: result = STOP; break
  depth -= 1; undo(m); counters = saved; return result
```

`altBase[0] = 0` is set before the root is entered.

- **Column choice (MRV).** The uncovered column with the fewest live rows; ties go to the lowest column index, so cell
  columns before piece columns. No RNG. The alternatives are that column's live rows in ascending row index; their
  number is the node's `c`.
- **Final path only** (RES-03). The rule counters are restored when a node returns, so at a solution they hold the
  counts of the path from the root to that solution; abandoned branches change only `Gt`, `nodes` and `work`.
- **Count.** After the first solution the same search goes on until `S >= limits.solutions`, exhaustion or a cap.
- The recursion depth is at most NP + 1; recursion is fine, an explicit stack is equally acceptable. The search always
  unwinds through `undo`, so the final state equals the state after the setup.

### The first-path snapshot (at the first solution)

- `rules`: a copy of the nine counters; `F = R1 + R2 + R3`; `E = R6`.
- `deductionTier`: 3 if `R7 + R8 + R9 > 0`, else 2 if `R4 + R5 + R6 > 0`, else 1 if `R1 + R2 + R3 > 0`, else 0
  (RES-08; in this task only R1 and R2 can be nonzero).
- `G` = the current depth; `choices` = `guessC[0 .. G - 1]` as a plain array.
- `info` = `choices.reduce((s, c) => s + Math.log2(c), 0)` (summed in path order from 0; exactly 0 when G = 0).
- `Cmax` = the largest entry of `choices`, 0 when G = 0; `Dmax` = `guessPlaced[G - 1]`, 0 when G = 0 (the placement
  depth before the deepest guess node; diagnostic only).
- `rows` = `picked[0 .. pickedLength - 1]` as a plain array; `census` = `[]`.

Hence the valid metric domain (RES-04): G = 0 implies info = 0, Cmax = 0 and Dmax = 0.

### Statuses (RES-04; three independent statuses)

- `search.stop`: the stop value set by the search, or `'exhausted'` when the search finished.
- `path`: `'complete'` when S >= 1; otherwise `'capped'` when `stop` is `'node-cap'` or `'work-cap'`; otherwise
  `'none'` (exhausted without a solution).
- `count`: `S`; `limit = limits.solutions`; `exhausted = stop === 'exhausted'`; `solutions` = `'none'` when exhausted
  with S = 0, `'unique'` when exhausted with S = 1, `'many'` when S >= limit, `'few'` when S >= 2 (also when a cap
  stopped the count: S is then a lower bound), otherwise `'unknown'`. A cap never proves uniqueness.
- `first`: the snapshot when `path` is `'complete'`, else `null`; `census`: `null`.

### Caps and work (RES-10; check-list D5, D6)

- Node cap: before entering a node, if `nodes === limits.nodes` stop with `'node-cap'`, otherwise `nodes += 1`. The
  root is node 1; `nodes: 0` stops before the root; `nodes` never exceeds the cap.
- Work cap: `work > limits.work` stops with `'work-cap'`; checked after the setup, at the start of every ladder pass
  and before every child node. Work units: one per row-column incidence visited (select, kill, undo, the CSR build),
  per column examined by R1, R2 and the column choice, per `colRows` entry scanned, per trail entry popped, plus
  `R + C` for the initialisation. Tests never pin an exact `work` value.
- No clock: the caps are the only bound.

### `verifyUndo` (tests only)

With `diagnostics.verifyUndo === true`: at every `mark()`, keep plain-array copies of `live`, `colCount`, `covered`
and `pickedLength` on a stack; after the matching `undo`, compare and throw `new Error('deduce: undo mismatch')` on
any difference; at the end compare the whole state with the state after the setup. These copies are not workspace
slots. When the flag is absent nothing is copied.

### Test vectors (verified with the reference implementation; check-list D11)

Pieces: `const pc = (id, cells) => ({ id, label: id, color: '#000000', cells })`; `M = pc('M', [[0, 0]])`,
`D = pc('D', [[0, 0], [1, 0]])`, `D2 = pc('D2', [[0, 0], [1, 0]])` (the same shape as D), `I3 = pc('I3', [[0, 0],
[1, 0], [2, 0]])`, `L3 = pc('L3', [[0, 0], [1, 0], [0, 1]])`, `I4 = pc('I4', [[0, 0], [1, 0], [2, 0], [3, 0]])`, and `P`
from `CLASSIC_PENTOMINOES`. `rect(w, h) = boardFromRows(Array(h).fill('#'.repeat(w)))`. Poses are shown as
`piece@(x, y)` of `rowPose(model, r)` for the entries of `first.rows`. Every case uses `DEDUCE` unless it says
otherwise.

| # | Board, pieces, clues | Expected |
|---|---|---|
| V1 | `rect(3, 2)`; P, M; clue `{ piece: 'M', x: 0, y: 0, turn: 0, mirrored: false }` | complete; S 1, unique, exhausted, stop `exhausted`; Gt 0, nodes 1; F 1 (R1 1), E 0, tier 1; G 0, info 0, Cmax 0, Dmax 0, choices `[]`; one row (P) |
| V2 | `rect(3, 1)`; M, D | complete; S 2, few, exhausted; Gt 1, nodes 3; F 1 (R1 1), E 0, tier 1; G 1, choices `[2]`, info 1, Cmax 2, Dmax 0; rows M@(0, 0), D@(1, 0) |
| V3 | `rect(10, 1)`; M, D, I3, I4 (DLX count 24) | complete; S 8, many, not exhausted, stop `solution-limit`; Gt 7, nodes 15; F 1 (R1 1), tier 1; G 3, choices `[4, 3, 2]`, info = log2 4 + log2 3 + log2 2 (about 4.5850), Cmax 4, Dmax 2; rows M@(0, 0), D@(1, 0), I3@(3, 0), I4@(6, 0) |
| V4 | `rect(2, 2)`; D, D2 (two pieces of the same shape) | complete; S 4, few, exhausted; Gt 1, nodes 5; F 1, tier 1; G 1, choices `[4]`, info 2, Cmax 4 (labelled pieces, RES-09) |
| V5 | `rect(3, 2)`; I3, L3 | path `none`; S 0, solutions `none`, exhausted, stop `exhausted`, first null; Gt 1, nodes 3 |
| V6 | `boardFromRows(['#...#', '#...#', '##.##'])`; D, I3, L3 | path `none`, solutions `none`; Gt 1, nodes 3 (MP02b proves it at the root) |
| V7 | `boardFromRows(RECIPE_BOARD_ROWS)`; the 12 classic pentominoes; every pose of `recipeWitness()` as a clue | complete; S 1, unique; Gt 0, nodes 1; every rule count 0, F 0, E 0, tier 0; G 0; rows `[]` |

Caps (`{ ...DEDUCE, <field>: <value> }`):

| # | Case | Expected |
|---|---|---|
| C1 | V2, `nodes: 0` | capped; stop `node-cap`; nodes 0, Gt 0; S 0, `unknown`, not exhausted; first null |
| C2 | V2, `nodes: 1` | capped; `node-cap`; nodes 1, Gt 1 |
| C3 | V2, `nodes: 2` | complete; S 1, `unknown`; stop `node-cap`; nodes 2; `first` equal to V2's |
| C4 | V2, `nodes: 3` | equal to V2 (few, exhausted) |
| C5 | V2, `work: 1` | capped; `work-cap`; nodes 0, Gt 0; `search.work > 1` |
| C6 | V3, `nodes: 1`, `2` and `3` | capped; `node-cap` |
| C7 | V3, `nodes: 4` | complete; S 1, `unknown`; `node-cap` |
| C8 | V3, `nodes: 5` | complete; S 2, `few`; `node-cap` (a cap never gives `unique`) |
| C9 | V3, `solutions: 2` | complete; S 2, `many`; `solution-limit`; nodes 5, Gt 3 |
| C10 | V3, `solutions: 30` | complete; S 24, `few`; exhausted; nodes 41, Gt 17 |

The six recipes (`boardFromRows(RECIPE_BOARD_ROWS)`, the 12 classic pentominoes, clues = the poses of
`recipeWitness()` whose piece is in `CLUE_RECIPES[level].pieces`): every one is complete, S 1, unique, exhausted,
stop `exhausted`, E 0, tier 1, and F = R1 (R2 = 0). Pinned as a characterisation of this ladder version (not a
monotonicity theorem; MP02b re-pins it, check-list D8):

| Recipe | U | F | G | choices | info (4 decimals) | Cmax | Dmax | Gt | nodes |
|---|---:|---:|---:|---|---:|---:|---:|---:|---:|
| very-easy | 3 | 3 | 0 | `[]` | 0 | 0 | 0 | 0 | 1 |
| easy | 4 | 4 | 0 | `[]` | 0 | 0 | 0 | 0 | 1 |
| normal | 5 | 4 | 1 | `[2]` | 1.0000 | 2 | 3 | 1 | 3 |
| hard | 7 | 4 | 3 | `[4, 5, 3]` | 5.9069 | 5 | 4 | 8 | 27 |
| expert | 8 | 3 | 5 | `[7, 10, 9, 4, 2]` | 12.2992 | 10 | 6 | 14 | 66 |
| master | 10 | 3 | 7 | `[6, 2, 7, 5, 7, 6, 3]` | 15.6915 | 7 | 7 | 203 | 770 |

Random oracle (reference run): 300 trials of the generator in the test plan used 274 boards, of which 64 have a
solution, 33 have two or more, 16 have a clue and 77 repeat a shape; on every one the deduction count equals the DLX
count.

## Files to create/modify

### Exclusive ownership

- `core/engine/deduce.js` (new).
- `core/engine/policy.js`: the `DEDUCE` constant only.
- `tests/deduce.test.js` (new).
- `tests/policy.test.js`: `DEDUCE` in the import list and one new test next to the `ENUMERATION` test (lines 386-389).
- `tools/bench/report.js`: the entry `'core/engine/deduce.js'` in `SOURCE_FILES` (lines 37-48), between
  `'core/engine/clues.js'` and `'core/engine/difficulty.js'`; `tests/benchmark-report.test.js:281-283` fails without
  it.

### Documentation slot

`docs/design-detail.md`, in this task:

- §3.1 (the tree at lines 156-200): add `deduce.js` to the `core/engine/` file list.
- §4.2: in the `policy.js` block (lines 345-370) one line
  `export const DEDUCE: Readonly<{ lookaheadWidth: 4; nodes: 20000; solutions: 8; work: 50000000; census: 10000000;
  memoryBytes: 33554432 }>;   // §7.9; work, census and memoryBytes provisional`; after the `tiling.js` block a new
  `deduce.js` block with the `measureDeduction` signature, the `DeductionResult` and `FirstPath` shapes in outline and
  a pointer to §7.9; in the `workspace.js` block, point the `deduce.` prefix to §7.9.
- New **§7.9 "Deduction solver (`deduce.js`)"** after §7.8 (line 1578; §8 starts at line 1588), describing what the
  code does now: purpose (the measure behind the v3 rating; not yet called by rating or generation, so §7.1-§7.3 still
  describe `difficulty-v2`); input and `DEDUCE`; the state and exact undo; the rule ladder with a table of the rules
  implemented so far (R1 forced cell, R2 forced piece; tier 1; counted as placements; later rules are added by the
  tasks that implement them); the guess rule (MRV, ties, alternatives); the final path and its metrics; the count and
  the three statuses; caps and work units; memory (the `deduce.*` slots and the precheck); determinism and labelled
  pieces (two pieces of the same shape are counted per piece when a caller passes them directly).

No guide changes (the developer guides gain `deduce.js` in MP06b, RES-32).

## Implementation steps

1. Add `DEDUCE` to `core/engine/policy.js` and its pin to `tests/policy.test.js`.
2. Create `core/engine/deduce.js` with the header comment, the typedefs and `measureDeduction`: validation, the slot
   table and memory precheck, setup, select/kill/mark/undo, the ladder, the search, the snapshot, the statuses,
   `verifyUndo`. Keep the rule steps as separate small functions (MP02b, MP03 and MP04 insert more).
3. Add the `SOURCE_FILES` entry.
4. Write `tests/deduce.test.js` (test plan) and make it pass; then the documents; then the quick set and the check.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP02a-B01 | A placement forced by a cell or by a piece is made without a guess and counted (F, R1, R2) | V1, V2, V7; recipes |
| MP02a-B02 | Real guesses are counted on the path to the first solution only, with their widths (G, choices, info, Cmax, Dmax), never on abandoned branches | V2, V3, recipes |
| MP02a-B03 | The solver tells unique, few, many, none and unknown apart, and a cap never claims uniqueness | V2-V6, C1-C10 |
| MP02a-B04 | A set given directly with two pieces of the same shape is counted per labelled piece (it is refused at every product entry from MP09a) | V4 |
| MP02a-B05 | Nothing a player or the Generator sees changes: no caller uses the solver yet and every existing test passes | `npm run test:quick` |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP02a-T01 | `measureDeduction(model, limits = DEDUCE, diagnostics = {})` is exported with the typedefs and the key order above; `census` is `null` and `first.census` is `[]`; `rules` has the nine keys | review; tests |
| MP02a-T02 | V1-V7 reproduce exactly, including `rows` mapped with `rowPose` | `deduce` tests |
| MP02a-T03 | The recipe table reproduces exactly; `info` equals the sum of `Math.log2` over `choices` and the 4-decimal value | `deduce` tests |
| MP02a-T04 | Random oracle: on every generated board the count equals the DLX count, `exhausted` is true, the statuses match the count, and the first path forms a valid layout with the clues (`isValidLayout`) | `deduce` tests |
| MP02a-T05 | Caps C1-C10 reproduce; `path: 'capped'` has `first: null`; `nodes` never exceeds the cap; a cap never gives `unique` | `deduce` tests |
| MP02a-T06 | Invariance: renamed ids, recoloured pieces and reversed piece order give a deep-equal result (hard recipe); two calls on one model and a rebuild on a fresh workspace give equal results | `deduce` tests |
| MP02a-T07 | A stale model throws `/stale/`; invalid limits throw `RangeError` | `deduce` tests |
| MP02a-T08 | Memory: after a measurement `ws.bytes()` is larger than before; a second measurement of the same model allocates nothing (`ws.allocationCount()` unchanged); `memoryBytes: 64` throws `ModelError` with code `model-too-large` and allocates nothing | `deduce` tests |
| MP02a-T09 | `verifyUndo: true` gives the same results as without and never throws on the vectors, the recipes and the oracle boards | `deduce` tests |
| MP02a-T10 | Metric domain: every complete result in the suite has `G === choices.length`, and G = 0 implies info = 0, Cmax = 0, Dmax = 0 | `deduce` tests |
| MP02a-T11 | `DEDUCE` pinned (`deepEqual` and `Object.isFrozen`); `SOURCE_FILES` lists `deduce.js`; `tests/bq-limits.test.js` and `tests/benchmark-report.test.js` pass | `policy`, `benchmark-report`, `bq-limits` tests |
| MP02a-T12 | Documents: design §3.1, §4.2 and §7.9 describe the code as it is; CRLF; `npm run test:quick` and `npm run check` pass; no file outside the ownership list changed | review; command output |

## Test plan

### Exact commands

```powershell
node --test tests\deduce.test.js tests\policy.test.js tests\benchmark-report.test.js tests\bq-limits.test.js
if ($LASTEXITCODE -ne 0) { throw 'targeted tests failed' }
npm run test:quick
if ($LASTEXITCODE -ne 0) { throw 'quick set failed' }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'repository check failed' }
```

`tests/deduce.test.js` must run in a few seconds (the reference needs about 50 ms for all recipes).

### Required test cases (`tests/deduce.test.js`)

Imports: `boardFromRows` (`../core/engine/board.js`), `measureDeduction` (`../core/engine/deduce.js`), `DEDUCE`
(`../core/engine/policy.js`), `buildModel`, `countSolutions`, `isValidLayout`, `ModelError`, `rowPose`
(`../core/engine/tiling.js`), `createWorkspace`, `MAIN_WORKSPACE_BYTES` (`../core/engine/workspace.js`), `createRng`
(`../core/engine/rng.js`), `poseCells` (`../core/engine/geometry.js`), `CLASSIC_PENTOMINOES`
(`./fixtures/polyominoes.js`), `CLUE_RECIPES`, `RECIPE_BOARD_ROWS`, `recipeWitness` (`./fixtures/clue-recipes.js`).
Build each model on a fresh `createWorkspace(MAIN_WORKSPACE_BYTES)` unless the case shares one on purpose. Keep the
expected values in data tables that MP02b, MP03, MP04 and MP05 can re-pin in one place.

| Case | Expected result |
|---|---|
| Vectors V1-V7 | the table above, every field; `rows` mapped with `rowPose` where the table names poses |
| Valid layout | for V1-V4, V7 and every recipe: `isValidLayout(board, pieces, [...clues, ...first.rows.map((r) => rowPose(model, r))])` is true |
| Caps C1-C10 | the table above |
| Recipes | the recipe table, every column, plus `S 1`, `unique`, `exhausted`, E 0, tier 1 |
| Random oracle | `const SHAPES = [[[0, 0]], [[0, 0], [1, 0]], [[0, 0], [1, 0], [2, 0]], [[0, 0], [1, 0], [0, 1]], [[0, 0], [1, 0], [2, 0], [3, 0]], [[0, 0], [1, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [2, 0], [0, 1]]]`; `rng = createRng('deduce-oracle')`; 300 trials of the generator of `tests/tiling.test.js:124-152`, in the same order of `rng` calls (1 + `rng.int(4)` pieces `p0, p1, ...` with `SHAPES[rng.int(SHAPES.length)]`; `w = 3 + rng.int(3)`, `h = 3 + rng.int(2)`; skip when the area exceeds `w * h`; block random cells until the active area equals the pieces' area; with `rng.int(2) === 0` one random pose of a random piece as a clue when it fits on active cells), one shared workspace; `expected = countSolutions(model, { cap: Infinity, rowTrialLimit: Infinity }).found`; `measureDeduction(model, { ...DEDUCE, solutions: Math.max(2, expected + 1) }, { verifyUndo: true })` gives `count.S === expected`, `count.exhausted`, `solutions` `none` / `unique` / `few` for 0 / 1 / more, `path` `complete` iff expected > 0, a valid layout for the first path, and the metric domain; the sample is not weak: at least 40 boards with a solution, 20 with two or more and 10 with a clue (reference: 64, 33, 16) |
| Invariance | the hard recipe; a renamed set (`id` → `piece-${id.toLowerCase()}`, new labels and colours as `tests/difficulty.test.js:127-138` does), reversed, with renamed clues reversed: `assert.deepEqual` with the base result |
| Determinism | two calls on one model are deep-equal; the same inputs on a fresh workspace are deep-equal |
| Stale model | build A, then another model on the same workspace: `measureDeduction(A)` throws `/stale/` |
| Limits validation | `RangeError` for `{ ...DEDUCE, solutions: 1 }`, `{ ...DEDUCE, nodes: -1 }`, `{ ...DEDUCE, work: 1.5 }`, `{ ...DEDUCE, lookaheadWidth: Infinity }` and `{ nodes: 5 }` (missing fields) |
| Buffer accounting | fresh workspace, V3 model: `bytes()` grows after the first measurement; `allocationCount()` and `bytes()` unchanged after the second |
| Memory limit | fresh workspace, V3 model: `measureDeduction(model, { ...DEDUCE, memoryBytes: 64 })` throws `ModelError` with `code === 'model-too-large'`; `allocationCount()` and `bytes()` unchanged |
| verifyUndo | V1-V7 and the recipes with `{ verifyUndo: true }` are deep-equal to the results without it |

`tests/policy.test.js`: import `DEDUCE`; new test "the deduction solver has its own frozen limits (difficulty-v3)":
`assert.deepEqual({ ...DEDUCE }, { lookaheadWidth: 4, nodes: 20000, solutions: 8, work: 50000000, census: 10000000,
memoryBytes: 33554432 })` and `assert.ok(Object.isFrozen(DEDUCE))`.

## Definition of done & handoff

- Every criterion has its evidence; the quick set and the check pass; nothing outside the ownership list changed; no
  vector was changed to match the implementation (a disagreement is reported, check-list D11).
- Handoff to MP02b: the module layout (where the ladder steps live, how a new rule is inserted, the slot table), the
  work accounting as implemented, the test-data tables to re-pin, any deviation from this specification.

## Execution log

| Field | Value |
|---|---|
| Status | Accepted and committed (`difficulty-v3 MP02a: Deduction core`) |
| Start | 2026-11-12 13:04 (+07:00) |
| End | 2026-11-12 13:15 developer; 13:19 orchestrator review and commit |
| Duration | 11 min developer (646 s); about 5 min review |
| Model | claude-sonnet-5.5 (developer); orchestrator review claude-opus-5.5 |
| Token usage | 53 model calls; 7,046,859 input tokens (6,863,247 cache reads); 84,630 output tokens |
| AI credits | about 199 (developer) |
| Verification | Developer: `node --test tests\deduce.test.js tests\policy.test.js tests\benchmark-report.test.js tests\bq-limits.test.js` 76/76 (2.9 s); `npm run test:quick` 1,127/1,127 (16.9 s); `npm run check` OK; `git diff --check` clean; three deliberately broken copies (no cover undo, no picked restore, no counter restore) were caught by `verifyUndo` or the recipe values, then deleted. Orchestrator re-run: targeted 76/76, `npm run test:quick` 1,127/1,127 (17 s), `npm run check` OK |
| Acceptance | MP02a-B01..B05 and MP02a-T01..T12 met; every vector V1-V7, cap C1-C10 and recipe value matched without dispute; the oracle sample reproduces the reference (274 boards: 64 solvable, 33 with two or more solutions, 16 with a clue, 77 repeating a shape). Diff reviewed: one `slotTable` drives precheck and allocation, engine guard words absent, `DEDUCE` frozen and pinned |
| Issues & resolutions | Accepted deviations: the per-node rule-counter save area is a local `Int32Array(9 * (NP + 2))` outside the slot table (the slot table stays as specified); `colCount` doubles as the transpose fill cursor; following the pseudocode, `nodes` is incremented before the child's work check, so a `work-cap` stop may count one node not entered; unknown extra keys in `limits` are not rejected (not required); `verifyUndo` also compares the trail length. Anchor drift: `docs/design-detail.md` section 7.8 at 1588 and section 8 at 1598 (task said 1578/1588); `tests/policy.test.js` `ENUMERATION` test one line off |
| Handoff | Export `measureDeduction(model, limits = DEDUCE, diagnostics = {})` only, plus typedefs. `DEDUCE = { lookaheadWidth: 4, nodes: 20000, solutions: 8, work: 50000000, census: 10000000, memoryBytes: 33554432 }` (frozen). Rules are closures `(counting) => NONE / APPLIED / CONTRADICTION`; R1/R2 use `forcedColumn(from, to, ruleIndex, counting)`; add the R3 check and R6 after R2 in `ladder(counting)` as `if (step === NONE) step = ruleXX(counting)`. `rules` is an `Int32Array(9)` (R1..R9) saved per node; `snapshot()` already derives tier and E. New slots are one row in `slotTable(R, C, NZ, NP)`. Re-pin tables in `tests/deduce.test.js`: `VECTORS`, `CAPS`, `RECIPE_TABLE`. Invariant `rows.length === F + G` asserted |
