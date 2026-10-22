# T03 — Polyomino geometry, canonical forms, and outlines

**ID:** T03  
**Depends on:** T01  
**Estimated size:** 650–1,100 implementation/test lines  
**Owner role:** core  
**Milestone:** MVP
**Design refs:** §5.1, §6.1, §13.2.

## Goal & business context

A piece must mean the same shape in generation, imported files, the solver and the player. Rotated/reflected copies must never sneak into a generated set as supposedly different pieces.

## Scope

**In scope:** square-cell geometry, D4 transformations/composition, normalized poses, shape identity, connectivity, holes and SVG-ready boundary loops.  
**Out of scope:** screen/display angles, board presets, SVG DOM construction and puzzle solving.

## Inputs & context

```ts
type XY = [number,number]; // x right, y down
type Piece = {id:string;label:string;color:string;cells:XY[]};
type Pose = {piece:string;x:number;y:number;turn:0|1|2|3;mirrored:boolean};
export const TRANSFORMS: readonly ((p:XY)=>XY)[];
export function transformCells(cells:XY[],t:number):XY[];
export function normalizeCells(cells:XY[]):XY[];
export function orientedCells(cells:XY[],t:number):XY[];
export function poseCells(piece:Piece,pose:Pose):XY[];
export function canonicalKey(cells:XY[]):string;
export function distinctOrientations(cells:XY[]):{t:number;cells:XY[]}[];
export function canonicalT(cells:XY[],t:number):number;
export function compose(a:number,b:number):number;
export function rotateCW(t:number):number;
export function rotateCCW(t:number):number;
export function isConnected(cells:XY[]):boolean;
export function hasHole(cells:XY[]):boolean;
export function outlineLoops(cells:XY[]):XY[][];
```

Use `t=4f+r`, `T=R^r∘M^f`, mirror first. `M(x,y)=(-x,y)`, `R(x,y)=(-y,x)`:

| t | Transformed point |
|---:|---|
| 0 | `(x,y)` |
| 1 | `(-y,x)` |
| 2 | `(-x,-y)` |
| 3 | `(y,-x)` |
| 4 | `(-x,y)` |
| 5 | `(-y,-x)` |
| 6 | `(x,-y)` |
| 7 | `(y,x)` |

- Normalization subtracts minimum x/y and sorts cells numerically by `(y,x)`. It never mutates inputs.
- A pose transforms, normalizes, then translates by its x/y. Its bounding-box corner can be empty.
- `compose(a,b)` applies b then a. CW changes r to `(r+1)%4`; CCW to `(r+3)%4`. Use positive modulo.
- Canonical identity is the **numeric minimum tuple sequence** over all eight normalized variants, not lexicographic comparison of coordinate strings.
- Encode only after choosing the minimum: `"<cell-count>:x,y;x,y;..."`.
- `distinctOrientations` retains the smallest t for each different normalized cell set, in ascending t. `canonicalT` returns that representative.
- Connectivity uses complete shared sides, not diagonal contact.
- Hole detection flood-fills the padded complement using four neighbors. Unreached empty cells are holes.
- Outlines cancel shared cell edges, trace every remaining boundary loop deterministically, and merge collinear vertices. Return outer and hole loops, suitable for SVG `fill-rule="evenodd"`. Keep loops separate at corner contacts; do not join unrelated contours.
- Primitive geometry handles nonempty connected/nonconnected test inputs without enforcing the generator’s ≥3-cell rule. Public pack validation owns input constraints.

Vectors:

```text
L3 key: 3:0,0;1,0;0,1
I3 key: 3:0,0;1,0;2,0
F fixture key: 8:0,0;1,0;2,0;3,0;4,0;0,1;1,1;2,1
F input: [[2,0],[3,0],[4,0],[0,1],[1,1],[2,1],[3,1],[4,1]]
D = [[1,0],[0,1],[1,1]]:
 turn=1, mirrored=false -> [[0,0],[0,1],[1,1]]
 turn=0, mirrored=true  -> [[0,0],[0,1],[1,1]]
 turn=1, mirrored=true  -> [[0,0],[1,0],[0,1]]
```

Orientation counts: O4=1, I3=2, T4=4, S4=4, L4=8, F5=8, X5=1. Grow-and-canonicalize enumeration must produce free counts for sizes 1–8: `1,1,2,5,12,35,108,369`. Hole-free counts: sizes 7/8 are 107/363; 9/10 are 1248/4460, tagged slow.

## Files to create/modify

`core\engine\geometry.js`, `tests\geometry.test.js`, `tests\fixtures\polyominoes.js`.

## Implementation steps

1. Implement transforms and immutable normalization; derive composition from the eight matrices.
2. Implement numeric comparison, canonical keys, representative transforms, and poses.
3. Implement connectivity and padded-complement flood fill.
4. Implement edge cancellation and loop tracing, including holes and touching corners.
5. Add an independent small growth enumerator in tests; export canonical classic pentomino cells as a test fixture for later solver goldens.

## Acceptance criteria — Business

- **BAC-1:** Turning or flipping a piece never changes which shape it is.
- **BAC-2:** A generated-set validator can identify all rotated/reflected duplicates.
- **BAC-3:** Holed imported pieces and concave outlines can be rendered without filling the wrong cells.

## Acceptance criteria — Technical

- **TAC-1:** `node --test "tests\geometry.test.js"` passes vectors, enumeration and outline tests.
- **TAC-2:** Composition identities hold: CW⁴=id, mirror²=id, and `M∘R=R⁻¹∘M`; all eight transformations preserve area.
- **TAC-3:** Canonical keys handle coordinates above 9 without string-order errors; translation invariance and reflection equality are tested.
- **TAC-4:** Outline raster coverage agrees with input cells for O, L, concave and ring fixtures.
- **TAC-5:** `node tools\check-conventions.mjs` passes. Pure, dependency-free ES modules; no DOM, clocks, randomness or mutation of supplied cells.

## Test plan

Use a one-cell piece for boundary tracing, diagonal-only cells for disconnectedness, a padded ring for holes, symmetric and chiral shapes for deduplication, and translated/negative intermediate coordinates. Mark expensive n=9/10 enumeration tests `(slow)`; do not use wall-clock assertions.

## Definition of done & handoff

The classic-piece fixture and numeric identity convention are frozen. T05 uses these transforms for board/view math, T06/T07 for placements, and T16/T20 for drawing/input. Report commands and any unresolved numerical edge case.
