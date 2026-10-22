# T07 — Tiling models, solver wrappers, and puzzle identities

**ID:** T07  
**Depends on:** T02, T03, T05, T06  
**Estimated size:** 850–1,300 implementation/test lines  
**Owner role:** core  
**Milestone:** MVP
**Design refs:** §5.6, §6.6, §6.8, §13.2.

## Goal & business context

All game operations need one correct cover model. Generation must recognize truly new arrangements, while saved progress must remain attached to exact coordinates rather than a reflected puzzle.

## Scope

**In scope:** packed model construction, full-layout decoding/validation, first solution, counting, layout/clue/distance keys, progress and pack IDs.  
**Out of scope:** random restart/LNS exports added by T10, clue selection, persistence and UI.

## Inputs & context

```ts
type XY=[number,number];
type Board={width:number;height:number;active:Uint8Array};
type Piece={id:string;label:string;color:string;cells:XY[]};
type Pose={piece:string;x:number;y:number;turn:0|1|2|3;mirrored:boolean};
type Model={
 cover:ExactCover;rowPiece:Int16Array;rowT:Uint8Array;rowX:Int16Array;rowY:Int16Array;
 freePieces:string[];freeCells:number;placementsPerPiece:Int32Array;
 clues:Pose[];pieceOrder:string[]; // full canonical ID order, needed to merge decoded witnesses
};
buildModel(b:Board,pieces:Piece[],clues:Pose[],ws:Workspace):Model;
rowPose(m:Model,row:number):Pose;
solveFirst(m:Model,o:{rng?:Rng;rowTrialLimit:number;branchTrialLimit?:number}):
 {layout:Pose[]|null;rowTrials:number;branchTrials:number;exhausted:boolean;
  stop:'exhausted'|'solution-limit'|'row-limit'|'branch-limit'};
countSolutions(m:Model,o:{cap:number;rowTrialLimit:number}):
 {found:number;exhausted:boolean;witnesses:Pose[][]};
isValidLayout(b:Board,pieces:Piece[],layout:Pose[]):boolean;
layoutKey(b:Board,pieces:Piece[],layout:Pose[]):string;
clueKey(b:Board,pieces:Piece[],clues:Pose[]):string;
layoutDistance(b:Board,pieces:Piece[],a:Pose[],c:Pose[]):number;
progressFingerprint(b:Board,pieces:Piece[],clues:Pose[]):string;
packId(pack:Pack):string;
puzzleId(b:Board,pieces:Piece[],clues:Pose[]):string;
```

T06 supplies `preparePlacements`, `visitPlacements`, `countModel`, reusable arenas and `ExactCover`. T03 supplies `poseCells`, normalized orientations and numeric shape identity. A pose mirrors x, turns clockwise, normalizes, then translates; presentation rotation is unrelated.

Model contract:

- Count and guard before fill. Limits: 600,000 rows, 5,000,000 nonzeros, and the supplied arena’s capacity.
- Fill the typed row arrays and metadata in canonical order. `rowPiece` indexes `freePieces`, not caller array order.
- Copy clue poses into model metadata. `solveFirst` and counting witnesses return **complete layouts including those clues**, sorted deterministically by canonical piece order.
- Canonical search orders cell columns `(y,x)`, piece columns `(size,canonical tuples,id)`, rows by absolute footprint tuples. Input ID/color/order changes must not change the rating traversal for generated distinct shapes.
- Validate every complete layout: exactly one pose per ID, transformed footprint within active cells, no overlap, union equals active mask. No comparison with a reference answer.
- Counting is raw coordinate/piece assignment counting; do not quotient by symmetry.

Identity rules:

1. Take `normalizedActive(board)` and remember its raw offsets; consider only transformations that map that active set onto itself.
2. Transform every placement using **the same whole-board translation/transform**. Never independently normalize a placed piece or the clue subset.
3. Encode active cells row-major using two-digit base-36 shape ranks. Ranks follow `(size, numeric canonical shape)` order; identical imported shapes share a rank. Unfilled clue cells encode as `..`.
4. Minimum transformed encoding is `layoutKey` or `clueKey`.
5. Distance is the minimum over board symmetries of the number of piece IDs whose occupied cell sets differ. Different complete generated layouts differ in at least two pieces.

Progress fingerprints deliberately do **not** use those keys:

```text
sha256Hex(canonicalJson({
 rows: exact board rows,
 pieces: [[id, normalized source cells], ...] sorted by id,
 clues: [[pieceId, absolute cells sorted y/x], ...] sorted by pieceId
}))
```

Colors, labels, presentation angle, timestamps and public puzzle IDs are excluded. Source cell orientation and exact board margins remain included. `puzzleId = 'p'+first12Hex(fingerprint)`.

For the otherwise unspecified `packId` core projection, use `{rules,rows,pieces,puzzles}`: the same exact piece projection and each puzzle’s exact clue projection in pack order; no titles/colors/rotation/ratings/provenance/public IDs. Return the first16 digest hex characters. A style-only update replaces the same library entry; it does not corrupt progress. `keys.js` accepts the Pack-shaped data without importing `pack.js`, avoiding an import cycle.

## Files to create/modify

`core\engine\tiling.js`, `core\engine\keys.js`; `tests\tiling.test.js`, `tests\keys.test.js`. Export the Model JSDoc type from `tiling.js`; do not edit shared typedefs concurrently.

## Implementation steps

1. Use the shared placement planner to fill workspace rows/metadata and construct the cover.
2. Decode complete witnesses; add validation independent of the carver.
3. Implement first/count wrappers with conservative evidence flags.
4. Implement symmetry keys and coordinate-specific fingerprints separately.
5. Add tiny-oracle tests and classic pentomino goldens from T03.

## Acceptance criteria — Business

- **BAC-1:** A reflected full layout is not counted as a new generated arrangement.
- **BAC-2:** A different valid completion is accepted; a repeated/symmetric pose of one piece is not double-counted.
- **BAC-3:** Saved moves cannot be applied to reflected clues merely because their public IDs match.

## Acceptance criteria — Technical

- **TAC-1:** `node --test "tests\tiling.test.js" "tests\keys.test.js"` passes.
- **TAC-2:** Classic raw counts are 3×20→8; 4×15→1,472; 5×12→4,040; 6×10→9,356. Tag the larger cases `(slow)`.
- **TAC-3:** One found plus cutoff is not unique; two found proves multiple; zero plus exhaustion proves unsatisfiable.
- **TAC-4:** A separate tiny brute-force tiler agrees with DLX, including blocked cells and clues.
- **TAC-5:** `node tools\check-conventions.mjs` passes. No DOM/storage/clock, per-row retained objects, runtime dependency or prototype reference.

## Test plan

Test asymmetric blocked margins, a board with no symmetry, a symmetric piece with multiple equivalent t values, clue positions differing only by translation, and same public ID with different source cell orientation. Use synthetic identical shapes to ensure raw solver IDs and shape-rank deduplication are intentionally different concepts.

## Definition of done & handoff

T09 relies on full witnesses, accurate L_i, and stop flags. T10 extends this module with discovery functions. T11/T12/T13 rely on exact progress identity. Publish any internal arena metadata changes to T06’s contract before downstream work.
