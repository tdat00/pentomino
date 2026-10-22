# T06 — Packed placement planning, reusable workspaces, and DLX

**ID:** T06  
**Depends on:** T02, T03, T05  
**Estimated size:** 1,000–1,500 implementation/test lines  
**Owner role:** core  
**Milestone:** MVP
**Design refs:** §6.6, §8.5, §13.2.

## Goal & business context

Search must be correct, bounded and memory-conscious. A cancelled or capped search must never become a false uniqueness or impossibility claim.

## Scope

**In scope:** placement enumeration/counting helper, typed-array workspaces, Algorithm X/DLX, counters and stop semantics.  
**Out of scope:** puzzle-specific public solving wrappers, difficulty, generation orchestration and browser workers.

## Inputs & context

Types: `Board={width,height,active:Uint8Array}`; `Piece={id,label,color,cells:[x,y][]}`; `Pose={piece,x,y,turn:0|1|2|3,mirrored:boolean}`. Cells use x-right/y-down integers. T03 supplies normalized orientations/poses; T05 supplies active cells and board data.

Public contracts:

```ts
type Workspace={bytes():number;capacityBytes:number};
createWorkspace(capacityBytes:number):Workspace;
countModel(b:Board,pieces:Piece[],clues:Pose[]):{rows:number;nodes:number;bytes:number};
class ExactCover {
  constructor(ws:Workspace,numColumns:number,rowCols:Int32Array,
              rowStart:Int32Array,rowCount:number);
  solve(o:{maxSolutions?:number;rowTrialLimit?:number;branchTrialLimit?:number;
    rng?:Rng|null;onSolution?:(rows:Int32Array)=>void;
    onProgress?:(rows:number)=>void;progressEvery?:number}):
    {solutions:Int32Array[];found:number;rowTrials:number;branchTrials:number;
     exhausted:boolean;stop:'exhausted'|'solution-limit'|'row-limit'|'branch-limit'};
}
```

Add internal `placements.js` so T07 does not duplicate counting versus filling:

```ts
preparePlacements(board,pieces,clues):PlacementPlan;
visitPlacements(plan,emit:(pieceIndex:number,t:number,x:number,y:number,
                          cellColumns:Int32Array)=>void):void;
```

`PlacementPlan` owns the canonical free-piece IDs, canonical order of all piece IDs, cell-to-column map, copied valid clues, free-cell/column counts and orientation data. `cellColumns` is a reusable callback view: callers must copy into their arena, not retain it. These are internal engine contracts, not wire objects.

Model rules:

- Validate clues before allocating large buffers; reject unknown/repeated pieces, blocked/out-of-range cells and overlaps.
- Primary columns: free board cells in `(y,x)` order, then remaining pieces sorted by size, numeric canonical shape tuples, then ID.
- Every distinct legal orientation/translation contributes one row: its covered free-cell columns plus exactly one piece column.
- Deduplicate by piece identity plus occupied cell set. Symmetric pose encodings must not create duplicate rows.
- Canonical rows sort by piece column, then sorted absolute cell tuples. Use a typed-index sort, or equivalent enumeration by first occupied board cell and numerically sorted relative orientation offsets; verify equivalence in tests.

Memory contract:

```text
MAX_ROWS=600000; MAX_NONZEROS=5000000
main workspace=160 MiB; scratch=32 MiB; optional cache=32 MiB per worker
N = nonzeros + columnCount + 1
DLX = six Int32Array[N] arrays L,R,U,D,C,ROW + Int32Array[columnCount+1] S
packed rows = Int32Array[nonzeros] + Int32Array[rows+1] offsets
metadata = Int16Array rowPiece, Uint8Array rowT, Int16Array rowX,rowY
```

Count first and include headers, metadata, sort scratch and maps in `bytes`; enforce the workspace’s own byte ceiling as well as row/nonzero caps **before** large allocations. Use error code `model-too-large`. No per-row JS arrays/objects are retained.

Workspace may expose an internal typed `reserve(plan)` arena method for T07; it must retain the public `bytes()`/`capacityBytes` contract. Grow-only reuse means a smaller subsequent model performs no new arena allocation. Account for old+new buffers during growth; do not temporarily exceed the declared capacity while resizing.

DLX procedure:

```text
if no headers: emit a copied row-id solution
choose the active column with minimum S
canonical tie: first header; seeded tie: uniform among minima
if S=0: dead end
choices = S; cover column
iterate candidate rows in insertion order, or per-node seeded shuffle:
  check row/branch budget before selecting another row
  rowTrials++; if choices>=2 then branchTrials++
  select; cover other row columns; descend
  uncover in reverse; deselect
uncover chosen column
```

Use an explicit search stack. A forced row counts as a row trial, not a branch trial. Capture `choices` before descending. Every exit, including either cap and solution limit, restores all links. Canonical mode consumes no RNG. Results/callback row IDs are stable copies, not views into a mutable stack.

Default solution limit is one; omitted work limits mean Infinity for internal callers. `exhausted` is true only when the entire relevant space was searched. Stopping at one solution must not be interpreted as uniqueness. No symmetry reduction belongs in this engine.

## Files to create/modify

`core\engine\placements.js`, `core\engine\workspace.js`, `core\engine\dlx.js`; `tests\workspace.test.js`, `tests\dlx.test.js`, `tests\placements.test.js`.

## Implementation steps

1. Implement canonical placement planning/visitation and exact preflight counts.
2. Implement arenas and byte accounting; document the shared internal layout for T07.
3. Build/restore the DLX links and explicit stack.
4. Add seeded ordering, limits and progress counters without clocks.
5. Test reused buffers with different column counts and clue masks.

## Acceptance criteria — Business

- **BAC-1:** Small synthetic tiling problems return correct covers; no piece or cell is reused.
- **BAC-2:** Work exhaustion remains distinct from “no solution” and “unique”.
- **BAC-3:** Oversized searches fail safely before a large allocation rather than freezing/crashing the page.

## Acceptance criteria — Technical

- **TAC-1:** `node --test "tests\placements.test.js" "tests\workspace.test.js" "tests\dlx.test.js"` passes.
- **TAC-2:** Abort/re-solve on the same instance returns the same full solution set as a fresh instance.
- **TAC-3:** Exact row/nonzero byte counts match filling; deliberate guard overflow triggers `model-too-large` before allocation.
- **TAC-4:** Forced/branching fixtures verify both counters and all stop reasons; seeded covers remain valid and deterministic.
- **TAC-5:** `node tools\check-conventions.mjs` passes; pure dependency-free modules, typed storage, CRLF/UTF-8, no clock-based decisions.

## Test plan

Use Knuth’s small exact-cover example and exhaustive tiny Boolean matrices checked by a separate subset-enumeration oracle. Test empty exact cover, zero-size columns, limit zero, one solution with an early stop, two found solutions, and full exhaustion. Tiny solver fixtures need not satisfy public generation quotas.

## Definition of done & handoff

Provide the arena/placement-plan contract and tests. T07 builds puzzle-facing models on exactly this enumeration and storage; it must not invent a second row order.

## Execution log

| Field | Value |
| --- | --- |
| Status | Done |
| Start | 2026-10-22 20:03:48 (+07:00) |
| End | 2026-10-22 20:13:29 (+07:00) |
| Duration | 9 min 41 s |
| Model | claude-sonnet-5.5 (sub-agent `T06-dlx`, general-purpose) |
| Token usage | 31 model calls; 2,953,512 input (2,830,336 cache read), 78,209 output |
| AI credits | 137.30 AIU (from orchestrator usage store, keyed by sub-agent id) |

**Verification (orchestrator re-run):** `node --test "tests/**/*.test.js"` → 214 pass / 0 fail in 4.7 s (task tests: 30 pass); `npm run check` OK. Scale smoke (26×26, 91 pieces): 280,264 rows, 1.68M nonzeros, 49 MiB; `ws.bytes()` equals `countModel.bytes`.

**Acceptance:** BAC-1..3 and TAC-1..5 pass. 3×20 pentominoes → exactly 8 covers; tiny matrices match a subset-enumeration oracle (canonical and seeded); `exhausted` true only on full search; row/nonzero/byte guards throw `model-too-large` before any allocation; all stop reasons and throwing callbacks leave links restored; `countModel` equals `fillArena` and `ws.bytes()` exactly; canonical mode draws no RNG.

**Issues & resolutions:**
- File tool emitted LF; converted to CRLF.
- No sort scratch needed: rows are enumerated by first cell in (y, x) order then relative offsets; an independent sorted brute-force oracle confirms equality with sorted-row order.
- Seeded search needs no growth mid-search (candidate rows along one path are disjoint); the shuffle buffer is `rowCount` ints and is counted in `bytes`.
- Deliberate, documented deviation from strict grow-only: when growth would exceed capacity the old buffer is released first; if leftovers from a larger earlier model would break the ceiling, `reserve` recycles all slots, so declared capacity is never exceeded.

**Handoff:** `placements.js` → `preparePlacements(board, pieces, clues)`, `visitPlacements(plan, emit)` with `emit(pieceIndex, t, x, y, cellColumns)` (`t = 4·mirrored + turn`; `cellColumns` is a reused view — copy it; piece column = `freeCells + pieceIndex`), `countPlacements`, `ModelError` (`model-too-large`, `invalid-clue`, `invalid-input`), `MAX_ROWS`, `MAX_NONZEROS`. `workspace.js` → `createWorkspace(cap)` (`bytes`, `capacityBytes`, `peakBytes`, `allocationCount`, typed-array getters, `reserve(plan)` → Arena with `rows`, `nonzeros`, `columns`, `rowCols`, `rowStart`, `rowPiece`, `rowT`, `rowX`, `rowY`, `cellColumn`, `placementsPerPiece`), `fillArena` (single canonical row order — reuse it), `countModel`, `modelBytes`, `dlxViews`, `MAIN_WORKSPACE_BYTES`, `SCRATCH_WORKSPACE_BYTES`. `dlx.js` → `ExactCover(ws, numColumns, rowCols, rowStart, rowCount).solve(opts)` (`maxSolutions` default 1; seeded mode draws RNG only on column ties ≥ 2 plus one shuffle per node; solutions are row ids in selection order). One live model per workspace — LNS must use the scratch workspace. Empty rows ignored; repeated column in a row → RangeError.
