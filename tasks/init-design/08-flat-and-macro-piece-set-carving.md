# T08 — Quota-constrained flat and macro carving

**ID:** T08  
**Depends on:** T02, T03, T04, T05, T07  
**Estimated size:** 1,000–1,500 implementation/test lines  
**Owner role:** core  
**Milestone:** MVP
**Design refs:** §6.4–§6.5, §13.2.

## Goal & business context

Generate random, distinct pieces that already have a valid tiling. For larger pieces, preserve opportunities for genuinely different later arrangements rather than producing only clue variants of a rigid set.

## Scope

**In scope:** carving, macro partitioning, finalization and independent policy validation.  
**Out of scope:** difficulty calibration, selecting which attempt wins, browser concurrency and batch generation.

## Inputs & context

```ts
type Board={width:number;height:number;active:Uint8Array};
type Piece={id:string;label:string;color:string;cells:[number,number][]};
type Pose={piece:string;x:number;y:number;turn:0|1|2|3;mirrored:boolean};
type PieceSet={board:Board;pieces:Piece[];witness:Pose[]|null;
 carving:'macro'|'flat'|'imported';macroRegion:number[]|null};
carveFlat(mask:Board,sizes:number[],rng:Rng,
 o:{stepBudget:number;growthTries:number;used:Set<string>}):
 {regions:number[][]}|null;
carveFlatSet(board:Board,k:number,rng:Rng,budgets:object):
 {regions:number[][]}|null;
macroPartition(b:Board,mu:number,piecesPerPart:[number,number],rng:Rng):number[][]|null;
carveMacro(b:Board,k:number,rng:Rng,budgets:object):
 {regions:number[][];regionOf:number[]}|null;
finalizeSet(b:Board,regions:number[][],regionOf:number[]|null):PieceSet;
validateSet(set:PieceSet):Issue[];
```

Consume T04’s `planSizes`, `sizeWindow`, availability and BUDGETS, T03’s canonical/connectivity/hole functions, T05’s labels/colors, and T07’s independent `isValidLayout`.

Policy: sizes ≥3, hole-free, distinct under all eight rotations/reflections; sizes in `[max(3,floor(.6A/K)),ceil(1.5A/K)]`; at most `floor(.4K)` pieces of 3–4 cells. Size counts respect `{3:2,4:5,5:12,6:35,7:107,8:363,9:1248,10:4460}`. No fixed 10–18-piece or ten-cell maximum.

Budgets: flat recursion calls 6,000; growth tries per call24; six size plans per flat/part attempt; macro partitions30; recursion calls per macro-part carve3,000. RNG is injected, never `Math.random`.

`carveFlatSet` tries at most `budgets.sizePlans` (6) plans: call `planSizes(A,k,rng)`, then `carveFlat` with a fresh empty used-key set, stepBudget6000 and growthTries24. Return the first successful regions, or null; every failed carve rolls back its keys/occupancy. T10 calls it with the `set/j/flat` derived stream.

Flat procedure:

```text
owner=empty on active cells; remaining=multiset(sizes)
step:
  if no empty cells: success iff remaining empty
  stop cleanly when recursion-call budget is spent
  choose an empty cell with the fewest empty four-neighbors; seeded tie
  up to growthTries:
    choose a distinct remaining size
    grow connected region from target by uniformly random frontier additions
    reject failed growth, holes, or canonical key already in used
    commit cells/key/size
    if every residual component area is a possible subset sum of remaining sizes:
       recurse
    undo cells/key/size on failure
```

Residues may be disconnected. Independent per-component subset sums are a necessary pruning test, not proof that the same remaining pieces can be allocated to every component simultaneously. A failed call leaves all caller-provided `used` keys unchanged; a successful call adds its new keys.

Macro procedure, preferred by T10 when μ≥6.5:

```text
piecesPerPart = K<=12 ? [2,3] : [3,6]
global [lo,hi] = sizeWindow(A,K)
for each of at most30 partition attempts:
  used=empty; pieces=[]; smallLeft=floor(.4K); allOk=true
  partition active bounding box by seeded guillotine cuts
  allocate total K by largest remainders of partArea/μ, every k_r>=2
  for each part:
    try <=6 plans with global window, remaining shape availability, smallLeft
    carveFlat(part,plan,...used, stepBudget=3000)
    on failure: discard whole partition, including quotas/keys/pieces
    on success: append pieces; decrement smallLeft
  if all parts succeed: return regions and regionOf
return null
```

Partition details: leaf target area ≤pHi·μ; otherwise cut the longer side at a seeded uniformly chosen position leaving at least3 cells thickness and pLo·μ active cells on each side. If no cut exists, retain a leaf. Split each leaf into connected active components; merge parts smaller than `2*ceil(μ)` into the neighboring part sharing the longest border. Stable tie: part’s first row-major cell. Return null if merging/allocation cannot work. The pLo/pHi range guides partitioning; the public minimum is two pieces per part. Do not add hidden blocked borders or force player pieces to remain in their original macro regions.

Finalization:

- Normalize region cells; sort pieces by size **descending**, then numeric canonical shape key.
- Assign `id=label=labelFor(index)` and `colorFor(index)`.
- Find a canonical pose reproducing each original cell set; preserve a complete witness.
- Remap `regionOf` alongside the piece sort; `macroRegion[i]` always belongs to `pieces[i]`.
- Independently validate exact coverage, connectivity, holes, free-shape uniqueness and size quotas.

## Files to create/modify

`core\engine\carve.js`; `tests\carve.test.js`, `tests\fixtures\carving-recipes.json`.

## Implementation steps

1. Implement flat growth/backtracking with explicit rollback and operation budgets.
2. Implement compact connected partitioning and deterministic allocation.
3. Propagate global shape availability, used keys and small-piece budget through parts.
4. Finalize IDs/poses/macro mapping and run an independently written validator.
5. Record successful seeded fixtures; do not write tests that pass when every attempt fails.

## Acceptance criteria — Business

- **BAC-1:** Every accepted set visibly fills its requested board with no gaps/overlaps.
- **BAC-2:** Pieces are distinct even under flipping/turning, with a balanced size distribution.
- **BAC-3:** Macro boundaries are invisible optimization data, never restrictions on later play.

## Acceptance criteria — Technical

- **TAC-1:** `node --test "tests\carve.test.js"` passes 50 deterministic seeds across 10×6, 10×8, Heart-75, Ring-60 and 20×18/Hard.
- **TAC-2:** Tests validate every returned set and require recorded successful cases; bounded failures are legitimate but cannot make all-success tests vacuous.
- **TAC-3:** Injected failures between macro parts prove that the next partition starts with full quotas, no keys and no pieces.
- **TAC-4:** `validateSet` independently catches overlap, missing cells, holes, duplicate shapes and wrong sizes.
- **TAC-5:** `node tools\check-conventions.mjs` passes; all randomness is seeded, all limits deterministic, UTF-8/CRLF and no dependencies/clocks/DOM.

## Test plan

Exercise a residual split into valid components, an impossible subset-sum residue, unavailable small shapes, a ring-shaped candidate around a blocked cell, odd K allocations and failure after an earlier part succeeded. The ≥90% “macro sets have at least two layout keys” integration check is completed in T10 once LNS exists.

## Definition of done & handoff

T10 receives complete witnesses and deterministic set finalization. Record the recipe schema `{boardRows,levelId,k?,seedText}` and expected successful geometry; never rely on prototype output or wall-clock thresholds.
