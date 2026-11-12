# MP01 — Model metadata for the deduction solver

| Header | Value |
|---|---|
| ID | MP01 |
| Depends on | none (the first task after the pack commit) |
| Estimated size | Small: about 150–250 changed lines (code about 40, tests about 120, documents about 30) |
| Owner role | Engine |
| Milestone | M1 — deduction solver |
| Design refs | `docs/difficulty-v3/report-detailed.md` RES-02, RES-10 (slot names), RES-32 row MP01 (traceability only) |
| Implementation status | Not started |

## Goal & business context

The owner wants Hard puzzles to be really hard. The v3 rating will measure a puzzle with a deduction solver
(`core/engine/deduce.js`, from MP02a) that solves it the way a person does: forced placements, small deductions, and
real guesses only when nothing else works. The solver works directly on the exact-cover model that `buildModel`
already builds: the cells of every placement row, the board's shape (to find closed pockets of cells) and the size of
every piece. Today the `Model` returned by `buildModel` keeps most of this hidden inside the workspace.

This task exposes those facts as read-only fields of the `Model`, documents how long they stay valid, and exports the
existing check that refuses a stale model. Nothing that a player or the Generator sees changes, and no buffer is
copied.

## Scope

### In scope

- `core/engine/tiling.js`: nine new `Model` fields (typedef and `buildModel`), the exported `assertLive`, the
  connected-pieces precondition in the typedef.
- `core/engine/workspace.js`: the header comment names the module-prefixed scratch slots.
- New tests in `tests/tiling.test.js`.
- `docs/design-detail.md` §4.2: the `workspace.js` and `tiling.js` blocks.

### Out of scope

- `core/engine/deduce.js` and `DEDUCE` (MP02a).
- Any change to `core/engine/placements.js`, `core/engine/dlx.js`, the rating, clue selection or generation.
- Any copy of arena data; any new workspace API.
- Grouping identical shapes (`shapeGroup`): dropped, because a set with two pieces of the same shape is refused
  (RES-09, RES-34).

## Repository rules

- Read `AGENTS.md` and `tasks/difficulty-v3/check-list.md` §3 first.
- Native ES modules, `// @ts-check`, JSDoc types; the engine stays pure (no DOM, clock, storage or randomness).
- UTF-8 without BOM, CRLF, final newline, no trailing whitespace.
- Run only the commands of the test plan; never `npm test`, the calibration or fixture tools, or a browser page.
- Never stage, commit, stash, reset, push or switch branches; never edit `tasks/difficulty-v3/` or the reports.
- Update `docs/design-detail.md` in this task (the same change as the code).

## Inputs & context

### Contract (RES-02)

`buildModel` (`core/engine/tiling.js:54-74`) also returns, as views without copies, and the `Model` typedef
(`core/engine/tiling.js:23-37`) declares:

| Field | Type | Source | Use |
|---|---|---|---|
| `rowCount` | `number` | `arena.rows` | array sizes |
| `rowCols` | `Int32Array` | `arena.rowCols` | the columns of row `r` are `rowCols[rowStart[r] .. rowStart[r + 1] - 1]`: its cell columns ascending, then its piece column last |
| `rowStart` | `Int32Array` | `arena.rowStart` | length `rowCount + 1`; `rowStart[0] = 0`, `rowStart[rowCount]` = number of nonzeros |
| `columns` | `number` | `arena.columns` | `freeCells + freePieceCount` |
| `cellColumn` | `Int32Array` | `arena.cellColumn` (the workspace's copy of the plan's map) | column of board cell `y * width + x`, or -1 (blocked cell or clue cell) |
| `freePieceCount` | `number` | `plan.freePieceIds.length` | piece column of free piece `i` is `freeCells + i` |
| `width`, `height` | `number` | `plan.width`, `plan.height` | adjacency, parity colour |
| `pieceSizes` | `Int32Array` | `plan.pieceSizes` (canonical free-piece order) | the pocket and parity rules |

- **Lifetime.** The arena views (`rowCols`, `rowStart`, `cellColumn`) are valid only while the model is live: the next
  `buildModel` (or `reserve`) on the same workspace overwrites them. `pieceSizes` is owned by the plan and is not a
  workspace view.
- **Liveness.** Export the existing private check (`core/engine/tiling.js:76-83`) as `assertLive(model)`, unchanged:
  it throws `Error('stale model: its workspace has built another model since')` when the model's workspace has built
  another model since. `rowPose`, `solveFirst` and `countSolutions` keep calling it.
- **Precondition**, written in the typedef: every piece is edge-connected (imported sets are checked by
  `core/engine/pack.js:486`, generated sets by `core/engine/carve.js:697`). The pocket rules R3, R7 and R8 of later
  tasks rely on it.
- **Workspace slots** (RES-10): the deduction solver will keep its buffers as named slots `deduce.*` of the model's
  workspace (`model.cover.ws`), allocated with the public `ws.int32` and `ws.uint8`, so that `bytes()` and
  `peakBytes()` count them. No `workspace.js` API change is needed; this task only documents the naming in the header
  comment.
- **No output change.** Every existing test passes unchanged.

### Code at `e73712f`

- `core/engine/tiling.js:23-37`, the typedef that starts with the line
  `* Packed model. The typed arrays are views into the workspace that built it.` and ends with the line
  `* @property {string[]} pieceOrder Canonical order of every piece ID, clued or free.`
- `core/engine/tiling.js:54-74`, `buildModel`: `const plan = preparePlacements(b, pieces, clues);`, then
  `const arena = ws.reserve(plan, counts);`, `fillArena(plan, arena);` and the object literal
  `const model = { cover: new ExactCover(...), rowPiece: arena.rowPiece, ..., pieceOrder: plan.pieceOrder, };`. Append
  the nine new fields at the end of this literal, after `pieceOrder`.
- `core/engine/tiling.js:76-83`, `function assertLive(m)` with the JSDoc `@param {Model} m`: add `export` and a JSDoc
  sentence; keep its body and message.
- `core/engine/tiling.js:39`: `export { ModelError } from './placements.js';` (MP02a imports `assertLive` and
  `ModelError` from `./tiling.js`).
- `core/engine/workspace.js:1-12`, the header comment; its layout lines end with
  `//   maps           Int32 cellColumn [width * height], placementsPerPiece [free pieces]`. `core/engine/dlx.js`
  already keeps one named slot, `dlx.shuffle` (`this.ws.int32('dlx.shuffle', this.rowCount)` in `solve`).
- `core/engine/workspace.js:36-50`, the `Arena` typedef: `rows`, `nonzeros`, `columns`, `rowCols [nonzeros]`,
  `rowStart [rows + 1]`, `rowPiece`, `rowT`, `rowX`, `rowY`, `cellColumn` ("Copy of the plan's cell-to-column map"),
  `placementsPerPiece`. `reserve` returns exact-length views; with an earlier, larger model on the same workspace they
  are `subarray` views of the same buffers (`array()` at lines 182-215).
- `core/engine/workspace.js:322-346`, `fillArena`: "Each row is its ascending cell columns followed by its piece
  column, in canonical row order"; the piece column is `plan.freeCells + piece`.
- `core/engine/placements.js:29-44`, the `PlacementPlan` typedef: `width`, `height`, `freeCells`, `freePieceCount`,
  `columns` ("`freeCells + freePieceCount`; cell columns first"), `cellColumn` ("Column of each board cell
  (`y * width + x`), or -1"), `freePieceIds` (canonical order of the free pieces = piece columns), `freePieceSource`
  (index into the caller's `pieces`), `pieceSizes` (`Int32Array`, cell count of each free piece). Free cell columns are
  numbered in row-major (y, x) order; pieces are ordered by (size, canonical shape, id).
- `tests/tiling.test.js`: imports at lines 1-9 (`boardFromRows`, `canonicalKey`, `poseCells`, `countModel`,
  `createWorkspace`, `MAIN_WORKSPACE_BYTES`, `createRng`, `buildModel`, `countSolutions`, `isValidLayout`, `ModelError`,
  `rowPose`, `solveFirst`, `CLASSIC_PENTOMINOES`); helpers `rect(w, h)` (line 16) and `newWs()` (line 17); shapes
  `MONO`, `DOMINO`, `I3`, `L3`, `TETS` (lines 112-116); the stale-model test at lines 304-316.
- `docs/design-detail.md:383-389`, the `workspace.js` block (`export type Workspace = { bytes(): number;
  capacityBytes: number };   // grow-only buffers, never shrunk`), and `docs/design-detail.md:407-418`, the `tiling.js`
  block whose `Model` type lists `cover`, `rowPiece`, `rowT`, `rowX`, `rowY`, `freePieces`, `freeCells` and
  `placementsPerPiece` (the code also has `clues` and `pieceOrder`, which the document omits today).

### Measured facts for the tests (at `e73712f`)

Board `boardFromRows(['###.', '####', '.###'])` (4 x 3, two blocked cells) with the pieces
`a = [[0, 0], [1, 0], [2, 0]]`, `b = [[0, 0], [1, 0], [0, 1], [1, 1]]`, `c = [[0, 0], [1, 0]]`, `d = [[0, 0]]` (each
`{ id, label: id, color: '#000000', cells }`), no clues:

- `width` 4, `height` 3, `freeCells` 10, `freePieceCount` 4, `columns` 14, `rowCount` 33
  (= `countPlacements(preparePlacements(board, pieces, [])).rows`);
- `Array.from(cellColumn)` = `[0, 1, 2, -1, 3, 4, 5, 6, -1, 7, 8, 9]`;
- `freePieces` = `['d', 'c', 'a', 'b']`; `Array.from(pieceSizes)` = `[1, 2, 3, 4]`.

The same board with the clue `{ piece: 'd', x: 0, y: 0, turn: 0, mirrored: false }`: `Array.from(cellColumn)` =
`[-1, 0, 1, -1, 2, 3, 4, 5, -1, 6, 7, 8]`, `freeCells` 9, `freePieces` = `['c', 'a', 'b']`, `Array.from(pieceSizes)` =
`[2, 3, 4]`, `columns` 12.

The 10 x 6 board with the 12 classic pentominoes and every pose of a `solveFirst` layout as a clue: `rowCount` 0,
`columns` 0, `freeCells` 0, `freePieceCount` 0, every `cellColumn` entry -1.

## Files to create/modify

### Exclusive ownership

- `core/engine/tiling.js` (typedef, `buildModel`, `assertLive` export only).
- `core/engine/workspace.js` (header comment only).
- `tests/tiling.test.js` (new tests only; existing tests unchanged).

`core/engine/placements.js` needs no change (every field exists in the plan). `tests/workspace.test.js` needs no
change.

### Documentation slot

`docs/design-detail.md`, in this task:

- §4.2, the `tiling.js` block (lines 407-418): the `Model` type lists every field, including the existing `clues` and
  `pieceOrder` and the nine new ones, with the view and lifetime notes, and `export function assertLive(m: Model):
  void;`. Suggested text for the type:

  ```ts
  export type Model = { cover: ExactCover; rowPiece: Int16Array; rowT: Uint8Array; rowX: Int16Array; rowY: Int16Array;
                        freePieces: string[]; freeCells: number; placementsPerPiece: Int32Array;  // = L_i, canonical order
                        clues: Pose[]; pieceOrder: string[];
                        rowCount: number; rowCols: Int32Array; rowStart: Int32Array;  // row r: its cell columns ascending, then its piece column
                        columns: number; cellColumn: Int32Array;                      // column of cell y * width + x, or -1
                        freePieceCount: number; width: number; height: number;
                        pieceSizes: Int32Array };                                      // free-piece sizes, canonical order
  export function assertLive(m: Model): void;                // throws 'stale model ...' once the workspace built another model
  ```

  and one sentence after the block: the typed arrays are views into the workspace and valid only while the model is
  live; `pieceSizes` belongs to the placement plan; pieces are edge-connected (checked for imported and generated
  sets).
- §4.2, the `workspace.js` block (lines 383-389): one sentence that other modules keep scratch buffers as named,
  module-prefixed slots of the same workspace (`dlx.shuffle`; the prefix `deduce.` is reserved for the deduction
  solver), counted by `bytes()` like the model arrays.

No other document changes (the change is internal; no guide describes model fields).

## Implementation steps

1. Extend the `Model` typedef with the nine `@property` lines (types and one-line meanings from the contract table),
   the lifetime sentence and the connected-pieces precondition.
2. Append the nine fields to the object literal of `buildModel`, taken from `arena` and `plan` exactly as the contract
   table says (no `slice`, no `new` typed array, no `Array.from`).
3. Export `assertLive` with a JSDoc sentence ("Throws when the model's workspace has built another model since; every
   consumer of a model's arrays calls it first.").
4. Add one line to the header comment of `core/engine/workspace.js`, after the `maps` line, for example
   `//   named slots    module-prefixed scratch buffers of the same workspace: dlx.shuffle; deduce.* (deduction solver)`.
5. Add the tests of the test plan to `tests/tiling.test.js` (import `countPlacements` and `preparePlacements` from
   `../core/engine/placements.js` and `assertLive` from `../core/engine/tiling.js`).
6. Update `docs/design-detail.md` (documentation slot).
7. Run the test plan.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP01-B01 | The deduction solver can read every row, column, cell map and piece size of a model directly, without rebuilding or copying it | `tiling` tests (MP01-T02 to T04, T06) |
| MP01-B02 | Nothing a player or the Generator sees changes: every existing test passes unchanged | `npm run test:quick` |
| MP01-B03 | A model whose workspace has built another model cannot be used by mistake | MP01-T05 |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP01-T01 | The `Model` typedef declares the nine fields with types, the lifetime note and the connected-pieces precondition; `buildModel` returns them from `arena` and `plan` without copies | review |
| MP01-T02 | On the masked 4 x 3 board, with and without the clue, the fields equal the measured values and the plan (`preparePlacements`, `countPlacements`) | `tiling` tests |
| MP01-T03 | Row layout: for every row, the entries before the last are cell columns, strictly ascending and below `freeCells`; the last is `freeCells + rowPiece[r]`; the cell columns equal the cells of `poseCells(piece, rowPose(model, r))` mapped through `cellColumn`, sorted; `rowStart.length === rowCount + 1`, `rowStart[0] === 0`, `rowStart[rowCount] === rowCols.length` | `tiling` tests |
| MP01-T04 | A model with no free piece has `rowCount` 0, `columns` 0, `freeCells` 0, `freePieceCount` 0, `rowStart` equal to `[0]`, an empty `rowCols` and `pieceSizes`, and every `cellColumn` entry -1 | `tiling` tests |
| MP01-T05 | `assertLive` is exported, returns `undefined` for a live model and throws `/stale/` once the same workspace built another model; the existing stale-model test passes unchanged | `tiling` tests |
| MP01-T06 | Views, not copies: two builds of the same inputs on one workspace return `rowCols`, `rowStart` and `cellColumn` on the same `buffer`, and the second build allocates nothing (`ws.allocationCount()` unchanged); `pieceSizes` is an `Int32Array` of length `freePieceCount` | `tiling` tests |
| MP01-T07 | `core/engine/workspace.js` header names the module-prefixed slots; `docs/design-detail.md` §4.2 updated as in the documentation slot | review |
| MP01-T08 | `node --test tests\tiling.test.js`, `npm run test:quick` and `npm run check` pass; no file outside the ownership list changed; CRLF | command output; review |

## Test plan

### Exact commands

```powershell
node --test tests\tiling.test.js
if ($LASTEXITCODE -ne 0) { throw 'tiling tests failed' }
npm run test:quick
if ($LASTEXITCODE -ne 0) { throw 'quick set failed' }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'repository check failed' }
```

### Required test cases (add to `tests/tiling.test.js`)

| Case | Expected result |
|---|---|
| Masked board metadata | the 4 x 3 board of "Measured facts", no clues: `width` 4, `height` 3, `freeCells` 10, `freePieceCount` 4, `columns` 14 (also `model.cover.columns`), `rowCount` 33 (also `model.cover.rowCount` and `countPlacements(plan).rows`), `cellColumn` and `pieceSizes` as measured and equal to the plan's (`Array.from`), `freePieces` `['d', 'c', 'a', 'b']`; `pieceSizes[i]` equals the cell count of the piece whose id is `freePieces[i]` |
| Masked board with a clue | the clue `d` at (0, 0): `cellColumn` `[-1, 0, 1, -1, 2, 3, 4, 5, -1, 6, 7, 8]`, `freeCells` 9, `columns` 12, `freePieces` `['c', 'a', 'b']`, `pieceSizes` `[2, 3, 4]` |
| Free cell numbering | for every board index `i` in row-major order, the non-negative `cellColumn[i]` values are `0, 1, 2, ...` in increasing order (both masked cases) |
| Row layout | MP01-T03 on the masked board and on `rect(10, 6)` with the classic pentominoes and the clues of `CLUE_RECIPES.hard` from `tests/fixtures/clue-recipes.js` (clue the poses of `recipeWitness()` whose piece is in `'LUNFX'`) |
| No free piece | `rect(10, 6)`, the 12 pentominoes, every pose of `solveFirst(buildModel(rect(10, 6), pieces, [], ws), { rowTrialLimit: Infinity }).layout` as clues: MP01-T04 |
| Liveness | `assertLive(model)` returns `undefined`; after `buildModel(rect(2, 1), [domino], [], ws)` on the same workspace, `assertLive(old)` throws `/stale/` |
| Views, not copies | `const ws = newWs(); const m1 = buildModel(board, ps, [], ws); const allocations = ws.allocationCount(); const m2 = buildModel(board, ps, [], ws);` then `m2.rowCols.buffer === m1.rowCols.buffer`, the same for `rowStart` and `cellColumn`, and `ws.allocationCount() === allocations` |

Do not change any existing test. Use the existing helpers (`rect`, `newWs`, `DOMINO`) and `node:assert/strict`.

## Definition of done & handoff

- Every criterion has its evidence; the quick set and the check pass; nothing outside the ownership list changed.
- Handoff to MP02a: the final `Model` field list with types; `assertLive` and `ModelError` importable from
  `./tiling.js`; the slot naming (`deduce.` prefix) in the workspace header; any surprise found in the plan or arena
  layout.

## Execution log

| Field | Value |
|---|---|
| Status | Accepted and committed (`difficulty-v3 MP01: Model metadata for the deduction solver`) |
| Start | 2026-11-12 12:58 (+07:00) |
| End | 2026-11-12 13:01 developer; 13:12 orchestrator review and commit |
| Duration | 3 min developer (194 s); about 6 min review |
| Model | claude-sonnet-5.5 (developer); orchestrator review claude-opus-5.5 |
| Token usage | 23 model calls; 1,895,060 input tokens (1,814,069 cache reads); 17,239 output tokens |
| AI credits | about 56 (developer) |
| Verification | Developer: `node --test tests\tiling.test.js` 21/21 (about 37 s); `npm run test:quick` 1,116/1,116 in 111 suites (about 16 s); `npm run check` OK. Orchestrator re-run: `npm run test:quick` 1,116/1,116 (16.0 s), `npm run check` OK (conventions, site), `node --test tests\tiling.test.js` 21/21 (36.9 s); CRLF/BOM/trailing-whitespace clean |
| Acceptance | MP01-B01..B03 and MP01-T01..T08 met. Diff reviewed: nine fields appended to the `buildModel` literal straight from `arena`/`plan` (no copies), typedef with lifetime note and connected-pieces precondition, `assertLive` exported with body and message unchanged, workspace header names `dlx.shuffle` and `deduce.*`, `docs/design-detail.md` section 4.2 updated; only the `tiling.js` import line of existing test code changed |
| Issues & resolutions | None blocking. All measured facts matched; no anchor discrepancy. Additions beyond the plan, accepted: `assertRowLayout` also checks each row's cell count against `pieceSizes`; the zero-row test reuses the first model's workspace so it exercises `subarray` views; `CLUE_RECIPES.hard.pieces` used instead of the literal `'LUNFX'` |
| Handoff | New fields: `rowCount`, `rowCols`, `rowStart` (length `rowCount + 1`), `columns`, `cellColumn` (length `width * height`, also with zero free pieces), `freePieceCount`, `width`, `height`, `pieceSizes` (plan-owned `Int32Array`). `rowCols`/`rowStart`/`cellColumn` are exact-length workspace views that go stale on the next `buildModel`/`reserve`. `assertLive`, `ModelError`, `buildModel` import from `./tiling.js`. Scratch slots: `model.cover.ws.int32/uint8('deduce.<name>', n)` |
