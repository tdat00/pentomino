# T13 — Pure player state, legal moves, undo and winning

**ID:** T13  
**Depends on:** T05, T07, T11  
**Estimated size:** 650–1,100 implementation/test lines  
**Owner role:** core
**Milestone:** MVP
**Design refs:** §5.6, §11.2, §11.8, §11.10, §13.2.

## Goal & business context

Dragging, tapping and keyboard play must share identical rules. Invalid moves cannot lose a piece, clues cannot move, and any legal complete tiling must win.

## Scope

**In scope:** immutable game state/reducer, placement checks, history, reset, progress restoration and snapshots.  
**Out of scope:** pointer/keyboard DOM events, elapsed-time measurement, storage writes and hints/reveal.

## Inputs & context

```ts
createGame(pack:Pack,puzzleIndex:number,saved?:Progress):GameState;
canPlace(s:GameState,pose:Pose,ignorePiece?:string):
 {ok:true}|{ok:false;reason:'outside'|'blocked'|'overlap'|'clue'};
reduce(s:GameState,a:Action):GameState;
isSolved(s:GameState):boolean;
snapshot(s:GameState):Progress;
```

Runtime contracts:

```ts
type GameState={
 pack:Pack;index:number;placed:ReadonlyMap<string,Pose>;
 tray:ReadonlyMap<string,number>; // t=4*mirrored+turn
 selected:string|null;preview:Pose|null;
 history:readonly MoveCommand[];future:readonly MoveCommand[];
 solved:boolean;elapsedMs:number;moves:number;updatedAt:string;restoreWarnings:Issue[];
};
type Progress={v:1;placements:Pose[];elapsedMs:number;moves:number;
 solved:boolean;updatedAt:string};
type Action=
 | {type:'place'|'move';pose:Pose}
 | {type:'remove';piece:string}
 | {type:'orient';piece:string;t:number;pose?:Pose}
 | {type:'reset'|'undo'|'redo'};
```

`updatedAt` is a task-pack completion of the snapshot contract: initialize from valid saved metadata, otherwise `1970-01-01T00:00:00.000Z`. The browser stamps the actual save time; the engine must never call a clock. `restoreWarnings` lists discarded saved moves for the app and is never serialized.

Only this Pack subset is needed for rules: `board.rows:string[]`, `pieces:{id,label,color,cells:XY[]}[]`, `puzzles:{id,clues:Pose[],solution?:Pose[]|null,rating?:unknown,certificate?:unknown}[]`, and optional `presentation.rotation`. A Pose is `{piece,x,y,turn:0|1|2|3,mirrored:boolean}`. Metadata/answers never authorize a move.

Clues live separately in `pack.puzzles[index].clues` and are immutable. Runtime Board comes from validated `board.rows`; T03’s `poseCells` applies mirror → clockwise turns → normalize → translate.

Move behavior:

1. Check the piece exists and is movable. Validate transformed cells against bounds, active cells, clues and every other placed piece.
2. For a move/orientation of an existing piece, ignore its previous occupancy only during the check.
3. Commit a new state atomically or return the unchanged state. Preview/selection changes belong to the UI and are not committed moves.
4. `orient` on a tray piece changes t in its tray slot. On a placed piece, the UI must supply the candidate pose matching t; this reducer validates it but does not invent rotation kicks.
5. Successful commits clear redo history. Clue manipulation or an invalid/no-op action adds no history.
6. Undo/redo restores exact poses and tray orientations. Keep at most500 commands.

An undoable reset needs more than a one-piece move. Use a command union:

- piece command: ID, before/after pose (null means tray), tBefore/tAfter;
- reset command: complete before/after movable placement+tray snapshots.

This clarifies the design’s shorthand Move type without changing gameplay. Reset clears user placements and restores tray orientations, not clues. Replay creates a new game. Elapsed time is browser-owned and is never rewound by undo; reset/undo do not secretly read time.

Move-count convention: count committed place/move/remove/orient/reset actions; previews are not moves. Undo/redo changes board history but does not erase the effort counter. Persist the counter. This fills a UI-detail gap consistently for summaries.

Winning requires every piece exactly once, clues unchanged, legal non-overlapping placements, and occupied area equal to active area. Never compare against `solution` or `witness`.

Progress:

- Validate saved moves one by one, including exact piece references and occupancy; drop invalid ones and expose restoration warnings to the app.
- Recompute solved state; never trust a saved `solved:true`.
- Use the exact-coordinate T07 fingerprint in the storage key; this module does not choose a key from public IDs.
- Snapshot emits copied, deterministic-order movable poses only, not clues/preview/history. Storage and metadata clocks remain outside the engine.

## Files to create/modify

`core\engine\game.js` with exported GameState/Action/Progress/MoveCommand JSDoc types; `tests\game.test.js`. Keep these local to the owning module instead of concurrently editing the shared types file.

## Implementation steps

1. Build state and occupancy from a validated pack.
2. Implement legal placement checks and transactional commands.
3. Add inverse history operations, reset snapshots and bounded redo.
4. Implement complete-cover winning and safe progress restoration.

## Acceptance criteria — Business

- **BAC-1:** Invalid drops/turns preserve the previous placement; clues cannot be moved or removed.
- **BAC-2:** Undo/redo and undoable Reset recover exact arrangements and tray orientations.
- **BAC-3:** A valid non-witness completion wins; stale/invalid saved moves do not create a false win.

## Acceptance criteria — Technical

- **TAC-1:** `node --test "tests\game.test.js"` passes.
- **TAC-2:** Tests cover each rejection reason, moving over one’s own old cells, full board coverage, partial coverage and repeated IDs.
- **TAC-3:** Inputs/maps/clue arrays are not mutated; invalid/no-op actions preserve state/history.
- **TAC-4:** Restoring valid and invalid moves together keeps valid moves and reports discarded ones; same public ID is not used as identity.
- **TAC-5:** `node tools\check-conventions.mjs` passes. Pure ES modules, CRLF/UTF-8, no DOM, storage, timers or runtime dependencies.

## Test plan

Use T11’s exact fixture and a second valid completion found through T07. Include a symmetric-piece pose, overlap with a locked clue, moving an already placed piece, reset after several moves, redo invalidation, 500-command pruning and forged solved metadata.

## Definition of done & handoff

T19/T20 own clocks, display selection and persistence. They must call this reducer rather than duplicating occupancy rules. Document restoration warnings and the command-union shape for UI tests.

## Execution log

| Field | Value |
| --- | --- |
| Status | Done |
| Start | 2026-10-22 20:34:10 (+07:00) |
| End | 2026-10-22 20:38:23 (+07:00) |
| Duration | 4 min 13 s |
| Model | claude-sonnet-5.5 (sub-agent `T13-game-state`, general-purpose); ran in parallel with T10, T12 |
| Token usage | 16 model calls; 1,003,829 input (941,282 cache read), 35,141 output |
| AI credits | 60.19 AIU (from orchestrator usage store, keyed by sub-agent id) |

**Verification (orchestrator re-run):** `node --test tests\game.test.js` → 16 pass / 0 fail; `npm run test:quick` at agent finish 353 pass / 0 fail; `check-conventions` OK.

**Acceptance:** BAC-1..3 and TAC-1..5 pass. Invalid moves return the identical state object; clue pieces cannot be moved/removed/oriented/covered; undo/redo and undoable reset restore exact poses and tray orientations; a non-witness tiling (found via T07) wins while forged `solved:true` and stale saves do not; deep-frozen inputs never mutate; saved progress restores valid moves with warnings for invalid ones and matches puzzles by clue geometry, not id.

**Issues & resolutions:**
- One test placed a piece onto a clue cell by mistake; test fixed, implementation unchanged.
- Design choices (no owner input needed): `canPlace` reports `outside` for malformed poses/unknown pieces and `clue` for clue pieces; reason priority outside > blocked > clue > overlap; `place` ≡ `move`; removing keeps tray orientation; reset returns tray orientations to 0; undo/redo remain available after a win with `solved` recomputed.

**Handoff:** `game.js` → `createGame` (RangeError for bad puzzle index/invalid clue), `canPlace`, `reduce`, `isSolved`, `snapshot`, `poseT`, `MAX_HISTORY` (500), `EPOCH`; types `GameState`, `Progress`, `Action`, `MoveCommand`, `PieceCommand`, `ResetCommand`, `MovableSnapshot`, `PlaceResult`. History/future are stacks (last = next). Piece command `{kind:'piece', piece, before, after, tBefore, tAfter}` with `t = 4·mirrored + turn`. Orienting a placed piece requires `pose` with matching `piece` and `poseT(pose) === t` (no rotation kicks). Restore warning codes: `placement-malformed`, `placement-unknown-piece`, `placement-duplicate`, `placement-outside`, `placement-blocked`, `placement-clue`, `placement-overlap`, `progress-invalid`, `too-many-warnings` (cap 100). `moves` counts committed place/move/remove/orient/reset only. Selection/preview stay null for the UI to set. Storage keys use `progressFingerprint(board, pieces, clues)`.
