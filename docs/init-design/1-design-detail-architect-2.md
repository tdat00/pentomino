# Detailed design — Architect 2

**Independent proposal · 22 October 2026 · Design version 1**

This document turns the authoritative requirements in `docs\local\prompt.txt` into a proposed implementation contract. It is an independent first-phase design, not a consensus document. No competing design was consulted.

Normative terms below describe the proposed v1 product. Numerical product limits and heuristic difficulty thresholds are explicit assumptions, not facts claimed by the original request.

## 1. Goals, invariants, and decisions

### 1.1 Product boundaries

- Two independent static applications: `generator\` and `player\`.
- Shared game rules, algorithms, interchange validation, and reusable browser components in `core\`.
- No server, account, database service, runtime CDN, or mandatory build step.
- Project deployment: `https://tdat00.github.io/pentomino/`.
- Home redirects to the generator; Play transfers to the player.
- English documentation. UI strings are centralized so language can be chosen later.
- This design phase creates documents only; the implementation plan is not permission to create application code now.

### 1.2 Explicit interpretations

| Question or conflict | Proposed v1 decision |
|---|---|
| “Pentomino” versus random pieces of at least three cells | Use **free polyomino** gameplay: square cells joined along edges, with arbitrary allowed sizes. Do not restrict every piece to five cells. |
| Piece count | Hard range **10–18**. Choose the count automatically from feasible counts, biased by the requested level. Never silently relax shape uniqueness or minimum size. |
| Piece size | Hard minimum 3. Proposed browser-performance maximum **10 cells per piece**. This upper bound is an assumption and must be exposed in help. |
| Board limits | Width and height each 1–20; at most 180 active cells and 400 bounding-box cells. A connected mask must also pass area/count feasibility. |
| Disconnected boards | Reject in v1. Active cells must form one four-neighbor-connected region. Holes and concave outlines are allowed. |
| “Not too many small / too few large” | `mixed-v1`: at most `floor(0.40 K)` pieces of size 3–4; at least `ceil(0.20 K)` pieces of size 6–10. Five-cell pieces are medium. |
| Random size and shape | Sample feasible partitions with a seeded PRNG. Sampling is intentionally heuristic, not uniform over all polyomino sets. Constraints may limit size variation. |
| Pairwise distinct pieces | Identify translations, quarter-turns, and reflections. Two mirror-image pieces count as the same shape and cannot coexist. |
| 45° board rotation | A presentation rotation of the entire square lattice. It does not resample cells or permit half-cells. Blocking cells creates new geometry. |
| 90° board rotation | The same view control can rotate by 90°. A separate editor command may rotate the mask exactly by a quarter-turn, swapping dimensions. |
| Pre-placed pieces | Every generated puzzle has at least one locked piece and at least two pieces left to play: `1 <= G <= K - 2`. |
| “Different puzzles” | Different full arrangements, excluding board-wide symmetries; additionally reject identical visible clue configurations. Changing only colors, view angle, or clue selection on one layout does not satisfy a new-layout request. |
| Unique solution | **Not required by default**, because the request does not demand it. Offer “Require one solution”; satisfy that option only with a completed proof. |
| Winning | Accept every legal complete tiling, never only the generator’s witness. This also applies to puzzles requested as unique. |
| Arbitrarily high Hell tiers | Define the tier sequence mathematically, but only offer generation within supported board and search budgets. No claim that every tier is attainable. |

Difficulty labels are calibrated algorithmic estimates. They are not established human-difficulty measurements.

### 1.3 Feasibility: the important 60-cell conflict

There are only **2 free triominoes, 5 free tetrominoes, and 12 free pentominoes** [1]. Therefore the simple inequality `3K <= area` is insufficient.

For `10 <= K <= 18`, the minimum area using pairwise distinct pieces, before balance constraints, is:

```text
minimumDistinctArea(K) = 2×3 + 5×4 + (K - 7)×5 = 5K - 9
```

The proposed balance policy raises several bounds:

| Pieces K | Minimum: distinct shapes only | Minimum: `mixed-v1` |
|---:|---:|---:|
| 10 | 41 | 46 |
| 11 | 46 | 52 |
| 12 | 51 | 57 |
| 13 | 56 | 61 |
| 14 | 61 | 66 |
| 15 | 66 | 70 |
| 16 | 71 | 76 |
| 17 | 76 | 81 |
| 18 | 81 | 85 |

These are **necessary area bounds, not tiling guarantees**. For example, an extremely narrow board may have too few distinct shapes that fit.

A 6×10 or 5×12 board therefore supports at most 13 distinct pieces without the balance policy, and at most **12 under `mixed-v1`**. Eighteen pieces need at least 81 cells, or 85 under this policy.

Implement a small integer dynamic program over sizes 3–10, number of pieces, area, number of small pieces, and number of large pieces. Availability bounds are the free-polyomino counts:

```text
size:    3  4   5   6    7    8     9    10
count:   2  5  12  35  108  369  1285  4655
```

Only counts up to 18 matter, so availability may be capped at 18 in the DP. Also enforce `area <= 10K`. This yields feasible size histograms, not a proof that their shapes tile this mask.

If a preferred count is infeasible, choose the nearest feasible count, breaking ties toward fewer pieces, and show the adjustment. **Do not change the selected difficulty label**: subsequent scoring must still meet its interval. Offer a larger board, a different level, or another attempt if it cannot.

## 2. Application architecture

### 2.1 Proposed layout

```text
pentomino\
  index.html
  redirect.js
  .nojekyll
  package.json                    # type=module; zero-runtime-dependency tests
  core\
    engine\
      types.js                    # JSDoc contracts; no DOM
      geometry.js
      board.js
      canonical.js
      rng.js
      feasibility.js
      placements.js
      exact-cover.js
      difficulty.js
      piece-set.js
      puzzle-generation.js
      rules.js
      exchange.js
      jobs.js
    workers\
      puzzle.worker.js
    browser\
      worker-client.js
      board-view.js
      transfer.js
      storage.js
      common.css
  generator\
    index.html
    app.js
    state.js
    board-editor.js
    puzzle-cards.js
    generator.css
  player\
    index.html
    app.js
    state.js
    interactions.js
    import-panel.js
    player.css
  tests\
    engine\
    exchange\
    fixtures\
  docs\
    init-design\
    tasks\
```

Engine modules import only other engine modules. Browser modules may import the engine. The worker may import the engine but never DOM code. Neither app imports implementation code from the other app.

Use plain JavaScript ES modules with JSDoc types. TypeScript-like signatures below specify contracts; they do not require a TypeScript compiler. Add a framework or bundler only after a demonstrated need.

### 2.2 Data flow and state ownership

```text
Generator controls → validated request → WorkerClient → generation job
                                                      ├ geometry / feasibility
                                                      ├ exact-cover search
                                                      └ shared difficulty
                   ← accepted results + progress ←─────┘
                   → versioned puzzle pack → transfer / download

Player import / transfer → same exchange validator → game state
                                                 → SVG board + piece tray
                                                 → same placement / win rules
                                                 → optional verification worker
```

- Main thread owns controls, immutable view state, storage, and pointer/keyboard events.
- Worker owns expensive search and rating jobs. Witness solutions are internal generation data.
- Each request has a monotonic `requestId` and an immutable board/set revision.
- A result is applied only if both identifiers still match. Editing a board or importing a different pack invalidates obsolete work.
- Keep an existing playable result while a replacement generates. Replace it atomically only after validation.
- Accepted partial results may be kept when the user cancels; unfinished candidates must not be exported as rated puzzles.

### 2.3 Core types

```typescript
type Cell = readonly [x: number, y: number];
type QuarterTurn = 0 | 1 | 2 | 3;
type DifficultyLevel =
  | "very-easy" | "easy" | "normal" | "hard"
  | "expert" | "master" | "nightmare" | `hell-${number}`;
type Seed = string; // exactly 32 hexadecimal characters; not all zero

interface Board {
  width: number;
  height: number;
  blocked: readonly Cell[];
}
interface Piece {
  id: string;
  label: string;
  color: string; // #RRGGBB
  cells: readonly Cell[];
}
interface Placement {
  pieceId: string;
  origin: Cell;
  turn: QuarterTurn;
  mirrored: boolean;
}
interface PieceSet {
  id: string;
  board: Board;
  pieces: readonly Piece[];
}
type Solution = readonly Placement[];

interface DifficultyMetrics {
  remainingPieces: number;        // U
  remainingCells: number;         // R
  placementCounts: readonly number[]; // L_i, canonical remaining-piece order
  branchTrials: number;           // B, deterministic first-solution search
}
interface Rating {
  model: "difficulty-v1";
  score: number;
  level: DifficultyLevel;
  metrics: DifficultyMetrics;
}
interface Puzzle {
  id: string;
  givens: readonly Placement[];
  rating: Rating | null;
  solutionPolicy: "any-valid" | "unique-required";
  solutionClaim: "unchecked" | "witness-known" | "unique" | "multiple";
}
interface SearchResult {
  solutions: readonly Solution[]; // at most two retained examples
  solutionsFound: number;         // total emitted before stopping
  exhausted: boolean;
  stopReason: "exhausted" | "solution-limit" | "work-limit"
    | "deadline" | "cancelled";
  rowTrials: number;
  branchTrials: number;
}
type BudgetPreset = "standard" | "extended";
interface PieceSetRequest {
  board: Board;
  level: DifficultyLevel;
  requireUnique: boolean;
  seed: Seed;
  budget: BudgetPreset;
}
interface PuzzleBatchRequest {
  quantity: number; // integer 1..10
  level: DifficultyLevel;
  requireUnique: boolean;
  seed: Seed;
  budget: BudgetPreset;
}
interface PieceSetBuildResult {
  status: "ready" | "none" | "cancelled";
  pieceSet?: PieceSet;
  witness?: Solution;          // internal; never serialized as exchange data
  calibration?: Puzzle;       // satisfies this request's level and uniqueness policy
  uncluedRating?: Rating;     // absent if that optional profile did not complete
  reason?: string;
}
interface ValidationIssue {
  code: string;
  path: string; // e.g. puzzles[0].givens[2].origin
  message: string;
}
type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; issues: readonly ValidationIssue[] };
```

The successful `ready` branch requires `pieceSet`, `witness`, and `calibration`; unsuccessful branches must not expose an unvalidated candidate as a ready set. Implement this as a discriminated union in JSDoc even though the compact sketch above uses optional fields.

Coordinates are integers, origin at the board’s top-left, x rightward, y downward. Piece coordinates are translation-normalized: minimum x and y are zero, with cells sorted by y then x. The minimum-x and minimum-y cells need not be the same cell.

A pose has this exact interpretation:

1. If mirrored, apply `(x, y) -> (-x, y)` in piece-local coordinates.
2. Apply `turn` clockwise quarter-turns; one turn maps `(x, y) -> (-y, x)`.
3. Translation-normalize the transformed cells.
4. Add `origin`, the top-left of the transformed bounding box.

All rendering, solver, import, and interaction code must call the shared transform rather than reimplementing this sequence.

### 2.4 Public module APIs

| Module | Responsibilities and public signatures |
|---|---|
| `geometry.js` | `normalizeCells(cells): Cell[]`; `transformCells(cells, turn, mirrored): Cell[]`; `orientations(cells): Orientation[]`; `isConnected(cells): boolean`. |
| `board.js` | `validateBoard(board): ValidationResult<Board>`; `activeCells(board): Cell[]`; `rotateMask(board, turn): Board`; `boardSymmetries(board): BoardTransform[]`. |
| `canonical.js` | `canonicalShapeKey(cells): string`; `compareShapes(a,b): number`; `layoutKey(set, solution): string`; `clueKey(set, givens): string`; `semanticPuzzleData(set,puzzle): object`. |
| `rng.js` | `createRng(seed): Rng`, with `nextUint32()`, `int(exclusiveMax)`, and `shuffle(array)`. |
| `feasibility.js` | `feasiblePieceCounts(board, policy): number[]`; `sizePlans(area, count, policy): Iterable<SizePlan>`; `checkResidualAreas(mask, remainingSizes): boolean`. |
| `placements.js` | `cellsOf(piece, placement): Cell[]`; `enumeratePlacements(set, givens): PlacementIndex`. Each row has a piece identity, cell indices, and a normalized pose. |
| `exact-cover.js` | `buildExactCover(index): ExactCoverModel`; `createSearch(model, options): SearchSession`. Options include solution limit, canonical/seeded order, and work limit. |
| `difficulty.js` | `scoreDifficulty(metrics): number`; `classifyDifficulty(score): DifficultyLevel`; `targetHints(level): TargetHints`; `createRatingJob(set, givens, limits): Job<RatingResult>`. |
| `piece-set.js` | `createPieceSetJob(request: PieceSetRequest): Job<PieceSetBuildResult>`. Returns a valid set, an internal witness, and a target-band calibration candidate; or a bounded failure. |
| `puzzle-generation.js` | `createPuzzleBatchJob(set, witness, request: PuzzleBatchRequest, seen): Job<PuzzleBatchResult>`. Preserves the supplied set exactly. |
| `rules.js` | `validatePieceSet(set): ValidationResult<PieceSet>`; `validateGivens(set,givens): ValidationResult<Placement[]>`; `canPlace(state, placement): PlacementCheck`; `validateCompletion(state): CompletionCheck`. |
| `exchange.js` | `parseDocument(text): ValidationResult<ExchangeDocument>`; `serializeDocument(doc): string`. Only supported versions and rule sets pass. |
| `jobs.js` | `Job<T>.step(maxWorkUnits): JobUpdate<T>`; `.cancel(): void`. Search sessions have the same bounded-step discipline. No worker or DOM dependency. |
| `worker-client.js` | `startJob(kind, payload, onProgress): { requestId, result: Promise<JobResult>, cancel() }`; ignores obsolete worker messages. |
| `board-view.js` | `mountBoard(element, options): BoardView`; `.render(model)`; `.cellAtClientPoint(x,y): Cell \| null`; `.destroy()`. |
| `transfer.js` | `preparePlayerTransfer(doc, puzzleId): Promise<TransferResult>`; `readTransfer(location): Promise<ValidationResult<ExchangeDocument>>`; `downloadDocument(doc): void`. |
| `storage.js` | `saveProgress(fingerprint, progress): StorageResult`; `loadProgress(fingerprint): ValidationResult<Progress>`; `fingerprint(value): Promise<string>`. Hash canonical semantic data with SHA-256 through Web Crypto. |

`Job.step` stops after its supplied work-unit budget even without finishing. Counts, work limits, seeds, errors, and result status are explicit data; no hidden global RNG or mutable singleton engine state.

## 3. Versioned JSON interchange

### 3.1 Envelope

```typescript
interface ExchangeDocument {
  format: "pentomino";
  version: 1;
  kind: "piece-set" | "puzzle-pack";
  ruleSet: "free-mixed-v1";
  pieceSet: PieceSet;
  puzzles: readonly Puzzle[];
  presentation: {
    boardRotation: 0 | 45 | 90 | 135 | 180 | 225 | 270 | 315;
  };
  provenance?: {
    generatorVersion?: string;
    algorithm?: "partition-v1";
    prng?: "xoshiro128ss-v1";
    setSeed?: Seed;
    puzzleSeed?: Seed;
    setRequest?: {
      level: DifficultyLevel;
      requireUnique: boolean;
      budget: BudgetPreset;
    };
    puzzleRequest?: {
      quantity: number;
      level: DifficultyLevel;
      requireUnique: boolean;
      budget: BudgetPreset;
      history: "empty" | "session";
    };
  };
  title?: string;
}
```

- `kind: "piece-set"` requires `puzzles: []`. It is suitable for saving a set; it is not directly playable.
- `kind: "puzzle-pack"` requires 1–10 puzzles sharing the one declared set.
- Normal generator exports include complete ratings and `witness-known`, `unique`, or `multiple` claims. Hand-authored/imported documents may use `rating: null` and `unchecked`.
- Internal witnesses, solver matrices, candidate pools, and player progress are **not exchange fields**.
- IDs are opaque `[A-Za-z0-9_-]{1,64}` strings. They are not trusted content hashes.
- Colors and labels aid presentation, not shape identity.
- `presentation.boardRotation` does not affect scores, legality, solution counts, or duplicate detection.
- No dependency on generator state, external URLs, or another file is allowed.
- Provenance supports replay of isolated jobs, but is not needed to play. A session-history batch cannot be reproduced from seeds alone without its prior seen-key history; do not export private full-layout keys as a substitute.

The same validator serves both applications. A piece-set file in the player produces “This file contains pieces but no puzzle; create a puzzle in the generator,” rather than inventing clues.

### 3.2 Complete valid example

This 10-piece, 60-cell document is a **structurally valid, known-solvable example**, not a scored production export. `rating: null` avoids claiming a score that was not produced by the specified profiler. The pieces meet `mixed-v1`.

```json
{
  "format": "pentomino",
  "version": 1,
  "kind": "puzzle-pack",
  "ruleSet": "free-mixed-v1",
  "pieceSet": {
    "id": "set-example-60",
    "board": { "width": 10, "height": 6, "blocked": [] },
    "pieces": [
      { "id": "A", "label": "A", "color": "#0072B2", "cells": [[0,0],[1,0],[0,1],[0,2]] },
      { "id": "B", "label": "B", "color": "#D55E00", "cells": [[1,0],[2,0],[0,1],[1,1],[1,2],[2,2],[1,3]] },
      { "id": "C", "label": "C", "color": "#009E73", "cells": [[1,0],[2,0],[3,0],[0,1],[1,1],[2,1],[1,2],[2,2],[3,2],[3,3]] },
      { "id": "D", "label": "D", "color": "#CC79A7", "cells": [[1,0],[0,1],[1,1]] },
      { "id": "E", "label": "E", "color": "#E69F00", "cells": [[1,0],[0,1],[1,1],[0,2],[1,2]] },
      { "id": "F", "label": "F", "color": "#56B4E9", "cells": [[2,0],[3,0],[4,0],[0,1],[1,1],[2,1],[3,1],[4,1]] },
      { "id": "G", "label": "G", "color": "#6A3D9A", "cells": [[0,0],[1,0],[2,0],[2,1],[2,2],[3,2]] },
      { "id": "H", "label": "H", "color": "#8C564B", "cells": [[1,0],[2,0],[0,1],[1,1],[2,1],[1,2]] },
      { "id": "I", "label": "I", "color": "#7A8B00", "cells": [[1,0],[2,0],[1,1],[0,2],[1,2]] },
      { "id": "J", "label": "J", "color": "#B23A48", "cells": [[1,0],[1,1],[1,2],[1,3],[0,4],[1,4]] }
    ]
  },
  "puzzles": [
    {
      "id": "puzzle-example-1",
      "givens": [
        { "pieceId": "A", "origin": [0,0], "turn": 0, "mirrored": false },
        { "pieceId": "J", "origin": [8,1], "turn": 0, "mirrored": false }
      ],
      "rating": null,
      "solutionPolicy": "any-valid",
      "solutionClaim": "unchecked"
    }
  ],
  "presentation": { "boardRotation": 0 },
  "title": "Example mixed-piece puzzle"
}
```

For a future automated fixture, one completion has this cell ownership map:

```text
AABBCCCDII
ABBCCCDDIJ
AEBBCCCIIJ
EEBGGGCHHJ
EEFFFGHHHJ
FFFFFGGHJJ
```

This answer is documented for testing only; the ordinary exchange document does not contain it.

### 3.3 Validation and compatibility

Validation is staged and bounded:

1. Refuse a file over **512 KiB** before reading/parsing it.
2. Parse JSON; require the exact envelope format, version, kind, and rule set.
3. Enforce object/array/scalar types and field whitelist. Reject unknown core fields; optional metadata must be explicitly defined in a later compatible schema.
4. Enforce coordinate integers, dimensions, array limits, unique blocked cells, and a connected nonempty active board.
5. Enforce 10–18 pieces, 3–10 unique cells per piece, edge connectivity, translation normalization, unique IDs, distinct free shapes, total area equality, and `mixed-v1`.
6. Validate each puzzle’s references, pose values, clue count, blocked-cell exclusion, and absence of overlapping clues.
7. For a non-null rating, validate finite nonnegative metrics, integer counts, the model identifier, and consistency of score and label with the formula. Match `U`, `R`, and placement-count-array length to the actual inventory and clues. Recomputing placement counts and search work belongs to background verification; stored metrics alone are not proof.
8. Treat solution and rating claims from any loaded document as **unverified metadata** until this runtime verifies them.

Labels are at most 8 Unicode code points; titles at most 120. Render them as text, never HTML. Colors match a six-digit hexadecimal color pattern. Do not merge untrusted objects into application prototypes; copy whitelisted fields into newly constructed records.

Unknown major versions or rule sets produce an actionable “unsupported version/rules” error. Do not silently reinterpret them. Version 1 needs no migration; a future version adds an explicit migration function and test fixtures.

Structural validity does not prove solvability. On player import, run a bounded background satisfiability check. Allow play while checking or after an inconclusive timeout; report a proven unsatisfiable puzzle clearly. A timeout is never “no solution.”

Store progress separately:

```typescript
interface Progress {
  version: 1;
  puzzleFingerprint: string;
  placements: readonly Placement[]; // movable pieces only
  updatedAt: string;
}
```

Fingerprint a canonical serialization of the **exact** board geometry, the mapping from each piece ID to its normalized source cells, and clue footprints keyed by piece ID. Omit colors, titles, view angle, seeds, and claimed ratings. Unlike layout deduplication, progress fingerprints must not quotient out board symmetries or a piece's source orientation: saved poses refer to those exact coordinates and IDs. Revalidate every restored move. A file using the same public ID but different geometry must not receive another puzzle’s progress.

## 4. Board shaping and coordinate transforms

### 4.1 Editor

- Width × height creates a rectangle; default 6×10.
- Clicking toggles one cell. Pointer painting has an explicit block/unblock mode, so crossing a cell twice does not reverse the operation.
- One paint gesture is one undo action.
- Show active area, connectedness, feasible piece-count range, and why generation is disabled.
- Changing size resets the mask after a discard confirmation; do not silently crop a generated puzzle.
- A heart preset is an original, fixed square-cell mask, not a copied commercial board or artwork.

### 4.2 Rotation contract

Maintain separate values:

```text
board.width, board.height, board.blocked  → logical geometry
presentation.boardRotation              → visual angle
```

A visual 45° turn rotates both occupied and blocked cells together. The squares remain whole; no rasterization, area rounding, diagonal adjacency, or triangular half-cells are introduced.

A logical clockwise mask rotation, available in the editor only, is exact:

```text
newWidth  = oldHeight
newHeight = oldWidth
(x, y)    → (oldHeight - 1 - y, x)
```

Rotate blocked cells by that transform. Four rotations restore the original board. Treat this as an editor revision that invalidates generated results; an optimization to transform every stored layout is unnecessary in v1.

This interpretation does **not** claim that rotating a fixed mask creates a combinatorially new shape. Cell editing creates different shapes. If the intended requirement is a true 45° geometric rotation followed by regridding, that is a separate feature requiring a rule for fractional cells and changed area; it is deliberately excluded.

### 4.3 Rendering and hit testing

Use an SVG board with one transformed board-coordinate group:

- Render cells, piece paths, clue locks, and the placement ghost in that group.
- Convert client coordinates using the group’s `getScreenCTM().inverse()`.
- Convert the resulting local coordinates to a cell by `floor(local / cellSize)`.
- Reject points outside the logical bounds, including transparent corners of a rotated board.
- Compute the display bounds using `|W cos θ| + |H sin θ|` and `|W sin θ| + |H cos θ|`, plus padding, to prevent clipping.
- The tray remains upright; the placement ghost is displayed in the board’s orientation.

Pieces always rotate by logical quarter-turns relative to the board. A screen-diagonal square board does not grant a 45° piece orientation.

## 5. Shape identity and board symmetries

### 5.1 Canonical free-polyomino form

For every piece:

```text
variants = []
for mirrored in [false, true]:
    for turn in [0, 1, 2, 3]:
        cells = normalize(transform(original, mirrored, turn))
        sort cells by (y, x)
        variants.add(cells)
canonical = numerically lexicographically smallest cell-tuple sequence
key = encode(cellCount, canonical)
```

The comparison is numeric, not a locale-dependent string comparison. Coordinates used for canonical comparison are normalized and then compared as `(y,x)` tuples. Encoding occurs after choosing the minimum.

Return only distinct transformed cell sets from `orientations`. Symmetric shapes may have fewer than eight orientations. This prevents duplicate solver rows and false multiple-solution counts.

Shape identity excludes ID, label, color, and placement. The generator rejects a completed candidate region as soon as its canonical key duplicates another region in the set.

### 5.2 Layout equivalence

Compute the stabilizer of the **fixed board rectangle and blocked mask**:

- Consider the eight square-grid rotations/reflections.
- Keep only transforms that preserve the board dimensions and map its blocked cells exactly onto themselves.
- A nonsquare rectangle therefore excludes quarter-turns and diagonal reflections.
- Use exact board coordinates, not a translation-normalized active-cell bounding box.

For each retained transform, encode the complete layout as canonical piece identities and their sorted absolute cell sets. Take the minimum encoding as `layoutKey`.

Do the same for the pre-placed pieces to obtain `clueKey`. A clue key includes which shapes are fixed, not only which cells are covered.

Important distinction:

- **Generation deduplication:** quotient full layouts and clue configurations by board symmetries.
- **Unique-solution proof:** count actual coordinate-distinct completions with the clues fixed; do **not** quotient by symmetry.

This intentionally conservative uniqueness definition does not call a puzzle unique when its empty board admits two reflected completions.

## 6. Solver: exact cover with Algorithm X / DLX

### 6.1 Exact-cover model

For a puzzle with fixed clues:

1. Validate clues and remove their pieces from the remaining inventory.
2. Mark clue cells occupied.
3. Create one primary column per remaining active cell.
4. Create one primary column per remaining piece.
5. Enumerate each distinct orientation and every origin fitting the board bounds.
6. Reject placements crossing blocked cells or clues.
7. Create a row containing that piece’s column and all cells it would occupy.

A solution chooses rows covering every column exactly once. Piece-identity columns prevent using a piece twice or omitting a piece; this is the “ghost square” modeling technique described by Knuth [2].

Deduplicate rows by `(canonical piece identity, absolute occupied cell set)`, not by pose alone. Different poses of a symmetric piece must not create different solutions.

### 6.2 Search

Use Algorithm X with the smallest-active-column heuristic and reversible DLX links [2]. An indexed-array implementation avoids many per-node JavaScript allocations:

```text
L[], R[], U[], D[], column[], rowId[], columnSize[]
```

The canonical solver order is part of `dlx-v1`:

- Cell columns precede piece columns in ties.
- Cell columns sort by y then x.
- Piece columns sort by cell count and canonical cell tuples, not public ID.
- Placement rows sort by canonical piece identity, then their absolute cell tuples.
- Choose the column with the fewest active rows, then the above stable column order.
- No randomization or solution-witness preference in rating mode.

```text
search:
    if no columns remain: emit current solution; return
    c = smallest active column, stable tie-break
    if size(c) == 0: return
    choices = size(c)
    cover(c)
    for each row r in configured order:
        rowTrials += 1
        if choices > 1: branchTrials += 1
        select r; cover its other columns
        descend
        uncover its other columns; deselect r
        stop or yield when requested, without corrupting state
    uncover(c)
```

`branchTrials` counts **every tried row at a branching state**, including its first attempted row, but excludes forced single-row choices. Capture `choices` before exploring that state.

Make the implementation an explicit resumable stack, or an equivalently safe resumable iterator. Cover/uncover must be balanced after normal completion, a work-limit return, and cooperative cancellation. Hard worker termination discards the matrix entirely.

Enumeration must stream solutions instead of accumulating an unbounded array. `SearchSession.step(maxWorkUnits)` returns newly emitted solutions and a running/done status; it yields immediately after emitting a solution. The final `SearchResult` retains at most two examples plus `solutionsFound`. The generator validates and consumes each emitted layout, keeping at most **100 full candidate layouts** in memory; accepted-layout deduplication uses the separately bounded key history.

### 6.3 Search modes and evidence

| Purpose | Order / stop condition | Permitted conclusion |
|---|---|---|
| Find a completion | Canonical or seeded; first solution | Satisfiable once a valid completion is found. |
| Difficulty profile | Canonical; first solution | Exact v1 first-solution branch metric only if a solution was reached. |
| Layout discovery | Seeded row order; bounded enumeration | Distinct layouts found so far; completeness only if exhausted. |
| Unique-solution test | Canonical; stop at two solutions | Exactly one only if one found **and search exhausted**. |
| Prove impossible | Any complete correct traversal | Unsatisfiable only if zero found **and exhausted**. |

For counting with a limit of two:

```text
0 solutions + exhausted   → unsatisfiable
1 solution  + exhausted  → unique
2 solutions found        → multiple, even without exhaustion
0 or 1 + stopped early   → inconclusive
```

Do not use symmetry reduction during counting. Do not seed the solution counter with the known witness and then count that same solution again.

Optional residual-component pruning can improve layout discovery: a remaining component must have an area achievable by a subset of the remaining piece sizes. This test is only necessary, because independently satisfying two components might reuse the same pieces. Reject only demonstrably impossible states.

The canonical `dlx-v1` rating traversal uses MRV, zero-column rejection, and ordinary single-row forced choices; **do not add or alter rating-mode pruning without a new rating-model version**.

## 7. Generating a random piece set

### 7.1 Construct a tiling first

Do not generate ten unrelated random shapes and hope that they tile the requested mask. Instead, partition the requested active board into connected regions; these regions become the pieces. The partition is an immediate witness of solvability.

```text
validate board and find feasible counts
K = nearest feasible count to target preference
for each bounded, seeded attempt:
    choose a feasible size histogram
    regions = carveConnectedPartition(board, histogram)
    if no complete partition: retry
    reject repeated canonical shapes
    normalize regions into pieces; retain their original placements as witness
    validate coverage, connectivity, sizes, balance, and distinctness independently
    try target-level clue calibration on witness / a few discovered layouts
    if a fully rated target-band calibration exists:
        return piece set + internal witness + calibration
return explicit bounded failure
```

The generator is allowed to use a heuristic distribution over feasible histograms. Prefer some size variation, but do not claim all sizes are equally likely. At the maximum area, constraints may force all pieces to be large; explain that if it occurs.

### 7.2 Connected partition search

Use randomized backtracking with residual-area pruning:

1. Choose an uncovered anchor with few uncovered neighbors; randomize equivalent ties.
2. Choose a remaining size, weighted toward difficult-to-place sizes.
3. Grow a connected candidate region from the anchor by adding random frontier cells.
4. Try up to **32 distinct candidate regions per size per state** before backing up.
5. Reject duplicate shape keys and candidates whose residual connected components cannot possibly receive the remaining sizes.
6. Recursively partition the residue; undo if it fails.
7. When one region remains, require the exact remaining size, connectivity, and a new shape key.

Because every candidate is grown from a connected frontier, each produced region is connected. Because regions are removed from the remaining mask, they do not overlap. A successful leaf must still pass the general full-coverage validator.

Use an initial cap of **200 partition restarts** and **250,000 candidate-growth expansions per job**, additionally bounded by the shared job limits. These are tuning defaults, not success guarantees.

Area pruning must permit a disconnected *residue* even though the original board must be connected. Each residual component may be tiled separately by the remaining pieces. Rejecting all disconnected residues would incorrectly discard useful partitions.

Local boundary edits may be added later as an optimization: transfer a boundary cell only if donor and recipient remain connected and retain valid sizes. Recheck both canonical keys, all quotas, coverage, and calibration. This is not required for the first correct generator.

### 7.3 Piece count, color, and rating

Assign IDs and labels after accepting the shape set, in canonical shape order, so discovery order does not leak into canonical search. Assign distinct colors from a fixed 18-entry palette. Also use clear outlines and letters A–R because 18 colors cannot be reliably distinguished by everyone.

**Generate Piece Set uses the same difficulty function as New Puzzle:**

- First create at least one clue configuration whose common score lies in the requested interval and whose uniqueness satisfies the selected policy.
- Accept a set as “ready for Easy,” for example, only after that Easy calibration succeeds.
- After accepting the calibration, optionally rate the unclued set within the remaining budget by calling the common evaluator with `givens = []`; call this its **unclued potential**, when profiling completes.
- The unclued potential need not itself be Easy. A full set with no clues is not the same task as an Easy puzzle made from that set.
- If the unclued profile times out but clue calibration completes, display “Unclued potential not rated,” not an invented number.

This avoids a second, incompatible “piece-set difficulty formula,” and avoids the impossible requirement that an easy set with ten unplaced pieces must score like a nearly completed puzzle.

The calibration candidate is internal; it can supply the first requested puzzle later. Keep witnesses in volatile generator memory, not ordinary exports. After a reload, a set without a retained witness requires a fresh bounded solution search before puzzle generation.

## 8. One shared difficulty model

### 8.1 Formula

For a solvable board/set plus its fixed clues:

- `U`: number of unplaced pieces.
- `R`: active cells not occupied by clues.
- `L_i`: number of distinct legal placements of remaining piece `i`, considering the board and clues only.
- `H = (1/U) × sum(log2(1 + L_i))`: mean placement-choice bits.
- `B`: speculative row trials before the **first solution** in the canonical `dlx-v1` traversal.

```text
D = round(2.00 × U + 0.10 × R + 4.00 × H + 8.00 × log10(1 + B))
```

Use JavaScript `Math.round` once at the end. For a completed state, define `D = 0`. A state with no legal completion is invalid, not extremely difficult. If any `L_i` is zero, reject before profiling.

| Term | Weight | Intention |
|---|---:|---|
| Remaining pieces `U` | 2.00 per piece | More separate objects to reason about. |
| Remaining area `R` | 0.10 per cell | Moderate geometric scale contribution. |
| Mean placement-choice bits `H` | 4.00 per bit | More plausible placements create ambiguity. |
| `log10(1+B)` | 8.00 per decade | Search difficulty matters without dominating linearly. |

This is the **only** function producing a difficulty score. Generation heuristics may propose counts or clue subsets, but they do not assign difficulty labels.

### 8.2 Concrete level intervals and generator preferences

All score intervals are half-open.

| Level | Score interval | Preferred K | Initial pre-placed fraction |
|---|---:|---:|---:|
| Very Easy | `[0,20)` | 10 | 70–80% |
| Easy | `[20,35)` | 10 | 55–70% |
| Normal | `[35,50)` | 11 | 40–55% |
| Hard | `[50,65)` | 12 | 25–40% |
| Expert | `[65,80)` | 13 | 15–30% |
| Master | `[80,95)` | 14 | 10–20% |
| Nightmare | `[95,110)` | 16 | 5–15% |
| Hell-1 | `[110,125)` | 18 | 5–10% |
| Hell-2 | `[125,140)` | 18 | 5–10% |
| Hell-n, `n >= 1` | `[110+15(n-1),125+15(n-1))` | 18 | 5–10% |

Compute an initial integer clue-count range with floor/ceiling, then clamp it to `[1,K-2]`. These are **search preferences**, not a second definition of difficulty. Search may move outside the initial fractions if necessary, while preserving the hard clue bounds.

For `D >= 110`, `n = floor((D - 110)/15) + 1`.

Examples using illustrative metrics:

```text
U=3, R=15, L=(1,2,3), B=0:
  H≈1.5283; D=round(6 + 1.5 + 6.1133 + 0)=14 → Very Easy

U=11, R=55, H=5, B=999:
  D=round(22 + 5.5 + 20 + 24)=72 → Expert

U=17, R=100, H=7, B=999999:
  D=round(34 + 10 + 28 + 48)=120 → Hell-1
```

### 8.3 Limits and reproducibility

- Count placements after applying all clues, with symmetric orientations deduplicated.
- Rating uses canonical geometry order, not public IDs, JSON array order, colors, random seeds, or a planted solution.
- Timing is not a feature. The same completed canonical traversal has the same work metrics on a fast or slow device.
- A timeout before reaching the first canonical solution produces **unrated**, not a guessed score.
- Removing a clue does not necessarily raise the score: the first-solution path can change. Do not assume monotonicity or use binary search as a correctness argument.
- Uniqueness-proof work is separate from `B`; it cannot make an otherwise easy puzzle look hard merely because counting a second solution is expensive.
- Preserve the model identifier with every rating. Changes to tie-breaking, search pruning, weights, or thresholds require `difficulty-v2` and explicit re-rating.
- High tiers may be impossible for a particular mask, feasible count, or budget. A coarse upper bound using `B <= rowTrialLimit` can rule out some targets before expensive generation.

Before final release, collect voluntary local playtest observations and compare completion time, restarts, and abandonment against these bands. Do not silently tune v1 after files have been exported; publish a new model.

## 9. Generating 1–10 puzzles from the same set

### 9.1 Find genuinely different layouts

Maintain a pool of full solutions for the current set:

1. Begin with the partition witness and any previously discovered solutions.
2. Enumerate additional exact-cover solutions using seeded row ordering.
3. Canonicalize each under board symmetries.
4. Discard a layout key already used for an accepted puzzle.
5. Attempt clue selection and rating on the remaining layouts.

Keep seen layout and clue keys across New Puzzle requests in the current generator session. Store at most 1,000 accepted-layout keys; if this cap is reached, ask the user to start a new batch history rather than silently recycling layouts. After reload/import, only retained batch history can be guaranteed.

Never change shapes, piece count, board mask, or colors while fulfilling New Puzzle. A request that needs a new set must be a distinct Generate Piece Set action.

### 9.2 Select clues and match the requested band

For each new layout:

1. Draw an initial clue count from the level’s preferred range.
2. Select that many distinct pieces uniformly from the layout’s piece identities.
3. Lock them at their witness placements.
4. Run the shared evaluator.
5. Explore additions, removals, and swaps of clue pieces, using score distance to the requested interval as guidance.
6. Use a small beam of **4 candidates** and at most **64 distinct clue subsets per layout**, subject to job limits.
7. Accept only a completed, target-band rating and a previously unused canonical clue key.

Every subset of a valid witness remains solvable. Still validate the generated public puzzle independently before accepting it.

Cache a rating by semantic board/set/clue key plus rating-model version. Neither generation phase may manufacture a score from clue count alone.

### 9.3 Optional unique-solution policy

With “Require one solution” enabled:

1. Count solutions up to two with the current clues.
2. If unique is proved, continue rating.
3. If multiple, choose an alternative solution different from the witness.
4. Find pieces whose occupied cells differ between that alternative and the witness.
5. Randomly add one such witness placement as a clue, eliminating that alternative.
6. Repeat while keeping at least two movable pieces and staying within budget.
7. Accept only if uniqueness and the target score both succeed.

If adding clues makes the puzzle too easy, try another subset/layout; do not mislabel it. A known witness is not a uniqueness proof. If even the maximum allowed clues cannot yield a target-band unique puzzle, return an explicit shortfall.

### 9.4 Batch result contract

```typescript
interface PuzzleBatchResult {
  requested: number;                 // 1..10
  accepted: readonly Puzzle[];
  status: "complete" | "partial" | "none" | "cancelled";
  reason?: "layout-space-exhausted" | "difficulty-not-found"
    | "uniqueness-not-proved" | "work-limit" | "deadline";
  searchExhausted: boolean;
}
```

Show a precise message, for example:

> Found 3 of 10 different Hard puzzles in the standard budget. This set was not changed. Try longer, choose another level, or generate another set.

Say “no further arrangement exists” only after exhaustive search. A partial result after a timeout is “not found within the budget.”

## 10. Performance, workers, cancellation, and seeds

### 10.1 Worker execution

Use one module worker per application tab. Workers provide a separate execution context and message passing, not DOM access [3].

```javascript
new Worker(new URL("../workers/puzzle.worker.js", import.meta.url), {
  type: "module"
});
```

The example is located in `core\browser\worker-client.js`; relative module/worker URLs use URL separators regardless of the developer’s Windows filesystem.

Protocol:

```typescript
type WorkerRequest =
  | { type: "start"; requestId: number; revision: string;
      kind: "piece-set" | "puzzle-batch" | "verify" | "rate"; payload: unknown }
  | { type: "cancel"; requestId: number };

type WorkerReply =
  | { type: "progress"; requestId: number; revision: string;
      stage: string; attempts: number; accepted: number; workUnits: number }
  | { type: "accepted"; requestId: number; revision: string; value: unknown }
  | { type: "result"; requestId: number; revision: string; value: unknown }
  | { type: "error"; requestId: number; revision: string;
      code: string; message: string };
```

Run at most 4,096 search work units or approximately 5 ms before yielding a worker task. Yield with a task-scheduling mechanism such as `setTimeout(resolve, 0)`, **not only `await Promise.resolve()`**; the latter need not allow pending cancel messages to run.

If cancellation has not been acknowledged within **250 ms**, terminate the specific worker and create a replacement for the next job. A long-running synchronous worker cannot process a cancel message until it yields.

### 10.2 Initial budgets

| Resource | Standard | Explicit “Try longer” |
|---|---:|---:|
| Whole Generate Piece Set / New Puzzle job | 30 seconds | 120 seconds |
| One exact-cover traversal | 3 seconds / 2,000,000 row trials | 10 seconds / 10,000,000 row trials |
| Aggregate solver row trials per job | 20,000,000 | 100,000,000 |
| Placement rows per model | 60,000 | Same |
| DLX nonzero nodes | 600,000 | Same |
| Progress messages | At most 5 per second | Same |

Use whichever limit is reached first. Include preprocessing and clue exploration in the whole-job deadline; a “solver timeout” must not leave an unbounded placement or partition phase.

A deterministic work-limit failure may reject a candidate and continue. A wall-clock deadline stops the current job rather than skipping ahead to another candidate; this avoids device speed changing the subsequent randomized traversal. Preserve already accepted results, including a calibrated set whose optional unclued profile timed out.

The dimension limits imply at most `18 × 8 × 180 = 25,920` candidate placements before further restrictions, because each orientation has at most one origin for each possible position of a chosen occupied reference cell. The larger explicit row cap is defensive. Each row has at most 11 nonzero columns.

Benchmark memory and latency rather than assuming those caps guarantee a fast search. Cap worker caches at approximately **32 MiB** using LRU eviction, in addition to active-model memory.

If Worker support is absent, importing and manually playing remain available. Disable expensive generation with an explanation instead of silently freezing the main thread.

### 10.3 Seeded reproducibility

- Use `xoshiro128**`, implemented with unsigned 32-bit operations, identified as `xoshiro128ss-v1`.
- Decode the 32 hexadecimal seed characters into four 32-bit words in a specified, tested order: consecutive groups of eight hex characters, most-significant digit first.
- Reject the all-zero state.
- Obtain new seeds with `crypto.getRandomValues`, never `Math.random` inside core algorithms.
- Generate bounded integers with rejection sampling to avoid modulo bias.
- Use one PRNG stream per job and deterministic iteration order. Set generation and puzzle generation have separate recorded seeds.
- Persist the algorithm version, seeds, request inputs, and work budgets when offering a “reproduce generation” action.
- Cancellation and wall-clock deadlines can truncate different amounts of work on different devices. Promise **identical completed candidates for the same deterministic traversal**, not identical timeout timing or identical batch lengths.
- Reproducing a later batch also requires its prior seen-key history; alternatively reproduce an isolated batch with an empty history.
- Do not run competing generation workers and accept whichever finishes first; that would undermine deterministic candidate ordering.

PRNG behavior needs fixed-vector tests against the published reference algorithm [4].

## 11. Generator screens and state transitions

States:

```text
editing-board → generating-set → set-ready → generating-puzzles → puzzles-ready
                    ↘ failure/cancel ↗           ↘ partial/cancel ↗
```

- **Board panel:** dimensions, presets, paint mode, undo/redo, view angle, logical quarter-turn, active area and feasibility.
- **Difficulty panel:** selected level, short description, optional uniqueness requirement, standard/longer budget, advanced seed.
- **Piece panel:** Generate Piece Set, sorted pieces, size counts, actual K, unclued potential if known, target calibration status.
- **Puzzle panel:** quantity 1–10, New Puzzle, accepted cards, Play selected, download selected/all, progress and Cancel.

A view rotation does not invalidate generated data. A mask change does. A difficulty or uniqueness change retains the set but marks its previous calibration as not applicable; New Puzzle must recalibrate against the new request. Existing puzzle cards keep their original, correctly labeled ratings.

Disable duplicate submissions while a job is active, but permit Cancel and navigation. Do not erase accepted cards simply because a subsequent generation attempt fails.

## 12. Generator-to-player hand-off and storage

### 12.1 Default local hand-off

Both apps have the same origin; no backend transfer is needed.

1. Serialize a self-contained pack containing the selected puzzle, or the whole pack when explicitly requested.
2. Generate a cryptographically random 128-bit transfer token.
3. Store `{version:1, createdAt, expiresAt, document}` under:

```text
pentomino:v1:handoff:<32-hex-token>
```

4. Use a 24-hour expiry and retain at most 5 hand-off records. Clean only this application’s own namespace.
5. Verify the write/read round trip before navigating.
6. Navigate in the same tab to:

```text
../player/#load=<token>&puzzle=<id>
```

Construct URLs with `new URL("../player/", document.baseURI)`, not a root-relative `/player/`.

The player validates the envelope and document, copies it into its validated saved-game record, and can replace the fragment with `#saved=<fingerprint>&puzzle=<id>`. Retain at most 10 saved games with LRU cleanup; progress and full pack belong to that saved record. This supports reload without relying indefinitely on the short-lived transfer record.

If saving is unavailable, keep the current game in memory and clearly offer download. Never delete other applications’ local storage; this Pages origin may host unrelated projects.

### 12.2 Fallbacks and sharing

Local browser storage can be denied or full:

- If a selected-puzzle document fits in an **8,192-character total URL**, use `#data=<base64url(UTF8(document))>` as the direct Play fallback.
- Validate the fragment’s length and alphabet before decoding; apply the same document validator afterward.
- For larger documents, offer **Download puzzle** and **Open player to import**. Do not navigate away claiming transfer succeeded.
- Missing, expired, or malformed tokens produce an import screen with an explanation.

A local `#load` or `#saved` link is **not a portable share link**. Label it accordingly. Download/upload JSON is the supported durable and cross-device exchange. Compact data links may be copied explicitly when they meet the size limit; no compression library or remote link-shortening service is required.

No witness solution is serialized by either path. This is answer minimization, not anti-cheat security: any client-side puzzle can ultimately be solved by client-side code.

## 13. Player behavior

### 13.1 State and move rules

```typescript
interface GameState {
  pieceSet: PieceSet;
  puzzle: Puzzle;
  placed: ReadonlyMap<string, Placement>; // user pieces only
  selectedPieceId: string | null;
  preview: Placement | null;
  history: readonly MoveCommand[];
  future: readonly MoveCommand[];
  completed: boolean;
}
```

Clues are separate immutable placements. A move command stores the old and new placement; returning a piece to the tray uses `newPlacement = null`.

On every drop/commit:

1. Transform with shared geometry.
2. Check all cells are in bounds and active.
3. Check against clues and every other placed piece.
4. When moving an existing piece, exclude its old occupancy from that check.
5. Commit atomically, or leave the old state untouched.
6. Clear the redo stack after a new move; re-run win detection.

Do not mutate the board during a drag. A rejected drop, Escape, `pointercancel`, or lost pointer capture returns to the prior state.

### 13.2 Mouse, keyboard, and touch

| Input | Action |
|---|---|
| Drag | Move tray or already placed piece with a live valid/invalid ghost. |
| Select piece, click/tap cell | Place without dragging. |
| Q / E | Quarter-turn left / right. |
| R | Half-turn. |
| F | Toggle the mirror flag in the documented pose convention. |
| Arrow keys | Move the preview one logical board cell. |
| Enter / Space | Commit preview, when focus is in game interaction mode. |
| Escape | Cancel preview or drag; preserve previous placement. |
| Delete / Backspace | Return selected movable piece to tray; suppress browser navigation only when handled. |
| Ctrl/Cmd+Z | Undo; Ctrl/Cmd+Shift+Z redo. |

Visible buttons duplicate all rotation, flip, undo, and reset actions. Ignore shortcuts while focus is in text inputs or dialogs.

Use Pointer Events with capture. Support one active manipulation pointer; do not interpret a second finger as a second piece move. Restrict `touch-action: none` to the active interaction surface, not the entire page. Buttons target at least 44×44 CSS pixels.

The click/tap placement anchor is the transformed bounding-box origin. For a drag, preserve the grabbed physical cell:

- Record which original local cell was grabbed.
- Transform that same cell under the current turn/mirror, including normalization.
- Set the origin to `hoveredBoardCell - transformedGrabbedCell`.

This prevents a piece from jumping when it is rotated during a drag, including when its bounding-box corner is empty.

Provide focusable piece controls with label and size, an announced preview position, and an `aria-live` region for invalid placement reasons and completion. Color alone must not communicate validity or identity.

### 13.3 Validation and winning

Run the shared completion validator, which requires:

- Every piece appears exactly once, either as a clue or a user placement.
- All placements are legal and non-overlapping.
- The occupied-cell union equals the active board mask.
- Clue placements have not changed.

Do not compare the player’s board to an exported or internal answer. A success banner offers replay, next puzzle, download, or return to generator. Respect reduced-motion preferences.

“Reset” clears only user moves after confirmation. Switching puzzles saves progress if possible. Storage failures are nonfatal to play.

An optional later “Check whether this can still be solved” action can use the worker; an inconclusive search must not mark a legal move wrong. Hints and timers are not MVP requirements.

## 14. Static hosting and GitHub Pages

### 14.1 Root redirect

Root `index.html` contains an ordinary link to `./generator/` and a meta-refresh fallback. A tiny external module `redirect.js` performs a history-replacing redirect:

```javascript
location.replace(new URL("./generator/", import.meta.url));
```

GitHub Pages serves the project directory at `/pentomino/`; visiting `/pentomino` is normalized to that directory. The intended destination is `/pentomino/generator/`.

### 14.2 Relative references

In either app:

```html
<link rel="stylesheet" href="../core/browser/common.css">
<script type="module" src="./app.js"></script>
```

In an app module:

```javascript
import { parseDocument } from "../core/engine/exchange.js";
```

No `/core/...`, `/generator/...`, or `/player/...` root-absolute paths. No absolute URL hardcoded to the production domain. No SPA router or server rewrite is needed; generator and player each have an actual `index.html`.

`.nojekyll` avoids Jekyll processing. Publish the root entry files and `core\`, `generator\`, `player\` through Pages. A GitHub Actions deployment may copy these into a site artifact; copying is packaging, not a JavaScript build step. Do not publish `docs\local\`, test artifacts, or private notes.

Local development requires HTTP because module and worker loading are not reliably supported through `file://`. For example, a developer can run `python -m http.server 8000` from the repository root. Node tests require no browser or server.

Test both root-hosted development and a `/pentomino/` prefixed static mount. Verify MIME types and same-origin worker loading. Do not add a service worker initially; stale cached engine/schema combinations are an avoidable risk.

## 15. Verification strategy

Use Node 22 or newer, `node:test`, and `node:assert/strict`; set `"type": "module"` in the future package manifest. Initial test command: `node --test`. No third-party packages are needed for engine tests.

### 15.1 Focused automated tests

| Area | Required cases |
|---|---|
| Geometry | Translation invariance; all eight transforms share a free-shape key; chiral mirrors merge; symmetric orientations deduplicate; four turns restore cells. |
| Board | Blocked-cell validation, connectivity, holes, rectangular dimension swapping, four logical turns restore the mask; view angle never changes active area. |
| Feasibility | The minimum-area table; 60 cells cannot support 18 distinct pieces; `mixed-v1` excludes 13 on 60; size limits and narrow impossible masks are not falsely promised solvable. |
| Partitioning | Fixed successful seeds give repeatable sets; every accepted region is connected; exact coverage, size quotas, and free-shape uniqueness; bounded failure leaves no invalid result. |
| Exact cover | Tiny known-solvable, impossible, and multiple-solution cases; compare against an independent simple brute-force oracle. Synthetic tiny inventories may bypass public 10-piece validation. |
| Uniqueness | One found plus cutoff remains inconclusive; two found proves multiple; mirrored coordinate-distinct solutions remain multiple; symmetric poses do not double-count. |
| Difficulty | Hand-computed formula examples; every interval boundary; canonical ordering independent of IDs/colors/input order; timeouts never yield a target-band rating. |
| Batch generation | Same set unchanged; duplicate layout under reflection rejected; new clues on the same layout do not count as a new arrangement; partial batches are accurately reported. |
| Exchange | Complete example round-trip; malformed versions, repeated IDs/cells, unknown pieces, overlaps, bad coordinates, oversized files, and unsupported rule sets. |
| Player rules | Collision/blocked/out-of-bounds moves; moving a piece excludes its previous cells; undo restores occupancy; legal non-witness completion wins; clues remain immutable. |
| Jobs | Cooperative and hard cancellation; no stale results after a revision change; whole-job budget covers preprocessing; accepted partials remain valid. |
| Storage | Quota denial, expired/missing hand-off, bad fragment encoding, and reused IDs with different shapes/source orientations cannot corrupt current progress; symmetric clue configurations do not share coordinate-specific saves accidentally. |

Use deterministic work limits in automated tests, not fragile assertions about milliseconds. Separate fast unit tests from bounded generation fixtures. Record a small set of successful generator seeds as regression fixtures; a “success” assertion must not accept every randomized attempt failing.

Property-style loops can use the project PRNG without an external property-testing library. Exercise a few hundred geometry transformations and a bounded collection of masks. Keep the independent brute-force oracle small enough to audit.

### 15.2 Browser acceptance

Manual minimum matrix: current Chromium, Firefox, Safari; Android Chrome and iOS Safari for touch.

Verify:

1. Root redirect, shared module requests, and module worker load under `/pentomino/`.
2. Default board → set → multiple puzzles → Play with unchanged pieces and clues.
3. Download then import in a separate browser profile.
4. Keyboard-only completion and labeled high-contrast controls.
5. Drag/rotate/flip at 0°, 45°, 90°, and 315° board views, including scrolled and scaled pages.
6. Invalid drop and `pointercancel` preserve the previous placement.
7. Cancel remains responsive while a difficult generation job runs.
8. Storage-disabled mode, data-fragment fallback, and oversized-file fallback.
9. A legal alternative completion triggers success.
10. No promise of ten puzzles, a score, or uniqueness after inconclusive search.

Browser automation may be introduced as a development-only dependency if maintaining this matrix manually becomes costly. Do not add runtime packages merely to automate tests.

### 15.3 Performance acceptance

On a documented mid-range reference laptop and phone:

- No generation/search work should create a main-thread long task over 50 ms.
- Target visible cancellation response within 250 ms, including hard termination.
- Keep pointer interaction responsive at approximately 60 fps on supported typical boards.
- Record median and 95th-percentile set/batch times over fixed seeds for 60-cell rectangles and one irregular mask.
- Treat 30 seconds as a bounded standard attempt, **not** a guarantee of successful generation.
- Track memory under repeated Generate/Cancel/import cycles to detect retained DLX arrays and event listeners.

## 16. Edge cases, risks, and unresolved product choices

| Risk or edge case | Resolution / current assumption |
|---|---|
| User requests 18 pieces on 60 cells | Explain the mathematical lower bound; adjust count visibly or suggest a larger board. Never create duplicate shapes. |
| Mask passes area tests but cannot be partitioned | Bounded search and clear “not found” versus proven-impossible language. |
| Thin corridors / isolated cells after painting | Preflight connectivity and residual-area checks; editor highlights errors. |
| Only one layout up to board symmetry | Return at most one new-layout puzzle; do not substitute different clue masks to meet quantity. |
| High difficulty conflicts with unique solution and few clues | Keep all constraints; return a shortfall rather than a misclassified or unproved result. |
| Small pieces repeat often during partitioning | Immediate canonical-key rejection; use availability-aware histograms and backtracking. |
| Search score differs from human experience | Label as an estimate; playtest; version any recalibration. |
| Removing a clue unexpectedly lowers the score | Bounded subset search, not a monotonic assumption. |
| Piece has an empty bounding-box corner | Anchor semantics and grabbed-cell preservation are explicit. |
| Imported metadata lies about difficulty/uniqueness | Claims remain unverified until checked; safe gameplay depends on geometry, not claims. |
| Import is structurally valid but unsatisfiable | Worker may prove failure; timeout stays inconclusive and never becomes proof. |
| Two tabs or stale worker responses | Transfer tokens, content fingerprints, request IDs, and revision checks. |
| Storage is cleared, denied, or full | Current in-memory game survives; file export/import is the durable fallback. |
| Browser lacks module workers | Player still works; generator reports unsupported expensive operations. |
| Different engine versions coexist after deployment | Version all wire/scoring formats; avoid an initial service worker; treat stale incompatible records explicitly. |
| “45°” actually means another tiling lattice | Requires a new geometry/rules design; do not approximate silently. |

Questions to settle during consolidation or early implementation, with defaults already specified:

1. Is view-only 45° rotation the desired square-grid interpretation?
2. Are `mixed-v1`’s 40% small / 20% large quotas and the ten-cell cap acceptable?
3. Should uniqueness remain optional and off by default? This proposal says yes.
4. Is rejecting disconnected boards acceptable for v1?
5. Which UI language should ship first? Documentation remains English.
6. How many Hell levels should the UI expose after actual budget benchmarks? Start with Hell-1 and Hell-2, disabling requests that exceed known limits.
7. Is standalone piece-set re-import needed immediately? The format supports it; generator import must find a witness before New Puzzle, whereas the player should explain that clues are missing.

These questions do not justify silently violating the explicit defaults while coding.

## 17. Phased implementation tasks

| Phase | Tasks | Prerequisites | Exit criteria |
|---|---|---|---|
| P0 — Contracts | Confirm interpretations; freeze versioned model, pose convention, score v1, and example fixture. Write implementation tasks under `docs\`. | Consolidated design approval. | No ambiguity about 45°, count/area conflict, uniqueness, or score semantics. |
| P1 — Pure rules and exchange | Geometry, masks, canonical forms, feasibility DP, piece/given/move validation, JSON parsing/serialization. | P0 | Unit tests cover invariants; the complete example validates and round-trips. |
| P2 — Search and runtime | Placement enumeration, DLX, reference-count tests, PRNG vectors, resumable jobs, worker protocol, cancellation. | P1 | Correct solution counts and evidence statuses; no main-thread solver work. |
| P3 — Generation and rating | Connected partitioning, calibration, the single scorer, layout deduplication, clue search, optional uniqueness, partial results. | P2 | Fixed-seed end-to-end engine fixtures meet constraints and honest result statuses. |
| P4 — Generator UX | Board editor, presets, feasibility feedback, set panel, puzzle cards, progress/cancel, JSON downloads. | P1 for editor; P3 for generation integration. | A user can create a valid set and 1–10 bounded-attempt puzzles without developer tools. |
| P5 — Player and hand-off | Import, SVG board, pointer/keyboard/touch controls, undo/redo, win detection, progress storage, token/data/file transfer. | P1 for player shell; P4 for integrated Play flow. | Alternative legal completions win; import and storage fallbacks work. |
| P6 — Release hardening | Accessibility and browser matrix, performance fixtures, bounded import checks, root redirect, Pages packaging and prefix smoke test. | P3–P5 | Deployed project paths and worker imports work; no unsupported success/uniqueness claims. |
| P7 — Calibration follow-up | Observe human playtests; adjust generation biases or propose difficulty-v2; consider hints, disconnected boards, richer sharing. | P6 plus evidence | Improvements are measured and versioned, not silent rule changes. |

P4’s editor and P5’s player shell can proceed independently after P1; search correctness remains a prerequisite for truthful generation and verification.

## 18. Sources and design-validation notes

1. Eric W. Weisstein, **“Polyomino,” MathWorld** — definition of free polyominoes and counts used in the feasibility lower bounds: <https://mathworld.wolfram.com/Polyomino.html>. Accessed 22 October 2026.
2. Donald E. Knuth, **“Dancing links”** — reversible exact-cover search and piece-identity/“ghost square” columns for polyomino tiling: <https://arxiv.org/abs/cs/0011047>. Accessed 22 October 2026.
3. MDN, **“Using Web Workers”** — isolated worker context, module-relative construction, and message passing: <https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers>. Accessed 22 October 2026.
4. David Blackman and Sebastiano Vigna, **xoshiro / xoroshiro generators** — reference algorithm to consult when implementing and testing `xoshiro128**`: <https://prng.di.unimi.it/>. Accessed 22 October 2026; no generator source code is reproduced here.

The minimum-area table and the complete 10-piece example were independently checked with an in-memory script during design. The example’s pieces are connected, total 60 cells, obey the size quotas, have distinct free-shape keys, and admit the documented full tiling. No application code, implementation benchmark, production difficulty rating, or uniqueness proof is claimed by those checks.
