# Pentomino Puzzle Studio — Unified Detailed Design

**Phase 4 · 22 October 2026 · Design version 1 (unified)**

This is the single developer contract for the project. It merges the two independent proposals (architect-1 and architect-2) following their Phase-3 agreements and the end user's clarifications. The companion document `4-design-brief.md` describes the user experience.

This document is self-contained: implement from it alone.

---

## 0. How to read this document

- **MUST / SHOULD / MAY** are normative.
- **[P5]** marks a PROVISIONAL value or rule, to be finalized in Phase 5. Phase 5 studies the requirement addendum (difficulty, piece counts and limits that depend on board size) and benchmarks the performance target (§8.7).
  - Every [P5] value lives as data in `core/engine/policy.js` (limits, piece counts, size policy, budgets, score weights and caps) or `core/engine/levels.js` (bands, clue shares, level windows). The only exception is the generated-color rule in `palette.js`.
  - Phase 5 can then replace values without touching other code.
- **Decision-record sources** (§2):
  - **A1** = architect-1's phase-1 design;
  - **A2** = architect-2's phase-1 design;
  - **P3** = Phase-3 agreement;
  - **User** = end-user clarification.

**Glossary**

| Term | Meaning |
|---|---|
| Board | An axis-aligned grid of W × H cells. Each cell is *active* (playable) or *blocked*. |
| Exterior / hole | A blocked cell that is 4-connected to the outside of the grid is *exterior*; any other blocked cell is a *hole*. Used for rendering only. |
| Piece | An edge-connected set of cells. It may be turned by 90° steps and mirrored, giving 8 orientations (the D4 group). |
| Piece set | The K pieces generated for one board. Together they cover the board exactly. |
| Layout (tiling) | One placement of every piece that covers every active cell exactly once. |
| Witness | A known layout stored with a set or puzzle (the generator's reference solution). |
| Clue | A pre-placed, locked piece of a puzzle. The UI calls it a "pre-placed piece". |
| Puzzle | Board + piece set + clues. The player places the remaining pieces. |
| Pack | A JSON document holding one board, one piece set and 0–100 puzzles. |
| Pose | `{piece, x, y, turn, mirrored}`: a piece's orientation and position. |
| Presentation rotation | A display-only angle of the whole board, in multiples of 45°. |
| Score / level | The output of the single difficulty formula, and the band that score falls in. |
| Certificate | Proven solution-count status: unique / multiple / not proved / unsatisfiable. |

---

## 1. Overview and requirements traceability

### 1.1 Summary

Two static web apps share one DOM-free engine in `core/`.

**Generator** (`/pentomino/generator/`). The user:
1. edits a board: size, blocked cells and display rotation;
2. picks a level;
3. generates a random piece set that provably tiles the board;
4. generates 1–10 distinct puzzles from that set, each with some pieces pre-placed.

One difficulty score rates everything. Puzzles go to the player through a self-contained link or a file.

**Player** (`/pentomino/player/`). The user imports a pack from a link, file, pasted text or the local library. They drag, rotate and flip pieces onto the board, including boards displayed at 45°. Any valid complete tiling wins.

**Runtime.** Heavy computation runs in a pool of up to 4 Web Workers. There is no server, no runtime dependency and no build step.

### 1.2 Traceability

Requirements come from `docs/local/prompt.txt`, including its addendum and the rotation clarification.

| # | Requirement | Design decision | Section |
|---|---|---|---|
| T1 | Two independent static sites `generator/` and `player/`; shared code in `core/` | Native ES modules, relative imports, no build step | 3 |
| T2 | Design and task documents in `docs/` | `docs/init-design/`, `docs/calibration/`, `docs/tasks/` | 3.1 |
| T3 | Deploy to `tdat00.github.io/pentomino`; the home page redirects to `/generator`; "Play" opens the player | Pages via GitHub Actions; `index.html` + `redirect.js`; Play link `../player/#pack=…` | 9, 12 |
| R1 | Pentomino / Puzzlia gameplay | Free-polyomino exact-cover rules `free-polyomino-v1` | 5.2, 6.6 |
| R2 | Levels very easy … nightmare, hell-1, hell-2, … | Level table with an open-ended Hell-n ladder | 7.4 |
| R3 | One shared difficulty score, used to generate sets and puzzles per level | `difficulty-v1`. A set is accepted only with an in-band calibration puzzle; puzzles are accepted only in band. | 6.5, 6.10, 7 |
| R4 | User enters the board size (e.g. 5×12, 6×10) | W × H inputs and presets | 6.2, 10.2 |
| R5 | Block cells; rotate the board 45°/90° (e.g. a Puzzlia-style heart). **Clarified: display only.** | Blocked-cell painting. `presentation.rotation` in 45° steps, ignored by all logic. Heart preset. | 6.2, 6.3 |
| R6 | "Generate Piece Set": random shapes and sizes, each piece ≥ 3 cells | Solution-first carving; sizes ≥ 3 | 6.5 |
| R7 | Not too many small or too few large pieces. The original 10–18 rule is **superseded by the addendum**: the count depends on level AND board size, never too many small pieces. | Size plan with a small-piece cap; count table [P5] | 6.4 |
| R8 | Pieces may be rotated or flipped to fill 100 % of the board without overlap | 8 orientations; exact cover | 6.1, 6.6 |
| R9 | Pieces are pairwise distinct, even when rotated or flipped; distinct colors | Canonical keys; palette plus letter labels | 6.1, 11.9 |
| R10 | More pieces at higher levels | Count table by level × area [P5] | 6.4 |
| R11 | "New Puzzle": 1–10 different puzzles from the same set, changing only the arrangement | LNS and restart layouts; a new layout key AND a new clue key; honest partial batches | 6.7–6.9 |
| R12 | Some pieces pre-placed at random; easy = many, nightmare = few | Clue selection with 1 ≤ G ≤ K−2, guided by the score | 6.10 |
| R13 | Addendum: the highest (and lowest) level depends on board size; boards up to ~360+ cells; Hell-2, Hell-3, … | Level windows by area [P5]; maximum board size [P5] | 6.4, 7.5 |
| R14 | Addendum: generation ≤ 2 min (target 1 min) in the browser with 4 workers and 2 GB RAM | Worker pool, deterministic budgets, watchdog, benchmark protocol | 8 |
| P1 | The player imports generator output | Link, file, paste and library; strict validator | 9 |
| P2 | The player rotates, flips and places pieces to complete the board | Drag, tap and keyboard; D4 algebra; win detection | 11 |

---

## 2. Decision record

Phase 3 settled most items. The rows marked "chosen here" resolve conflicts it left open, using the better-evidenced option.

| # | Decision | Chosen option | Rationale | Source |
|---|---|---|---|---|
| D1 | Meaning of "rotate the board 45°/90°" | Presentation only. The logical board is always W×H plus blocked cells. There is no regridding and no logical "rotate mask" command. | Explicit user clarification | User; A2 |
| D2 | Rotation sign | `presentation.rotation` in degrees **counter-clockwise** on screen, in {0, 45, …, 315}. The Heart preset is stored as 45. | With the top-right region blocked, a 45° counter-clockwise turn puts the notch on top, matching the user's "rotated 45° shows a heart". | A2 (P3). Chosen here over A1's clockwise convention (Heart = 315). |
| D3 | Piece drawing on rotated boards | Tray, drag ghost and board all use the board's frame (WYSIWYG). Labels stay upright. | A piece never jumps visually when picked up. | A1, A2 (P3) |
| D4 | Rotate/flip controls on rotated boards | Screen space. ⟳/⟲ are grid quarter-turns. ⇋/⇵ mirror the piece as seen on screen (§6.3). | Does what the icon shows. Identical to grid semantics at 0°. Verified for 8 angles × 8 orientations. | A1 (P3). Chosen here over A2's grid-axis flip. |
| D5 | Arrow keys on rotated boards | Move along the grid axis closest to the arrow's on-screen direction. At odd multiples of 45°, use the mapping for θ − 45°. Axis hints are shown. | At 90°, 180° and 270°, arrows bound to logical rows/columns would move pieces in a different screen direction than pressed. | A1 (P3). Chosen here over A2. |
| D6 | Board margins | Keep the authored W×H. Analyze symmetry and deduplication on a copy normalized to the active bounding box. Trimming is an explicit button. | Stored coordinates never change silently, yet real symmetries are found. | A2 (R1-08 response). Chosen here over A1's auto-crop. |
| D7 | Board connectivity | Generation requires one 4-connected active region. Import accepts any non-empty board. | Simpler carving; valid files are not rejected. | A2; A1 (P3) |
| D8 | Game rules vs. generation policy | `rules: "free-polyomino-v1"` covers gameplay only. Size ≥ 3, distinct shapes, hole-free pieces and size balance are generator policy, recorded in `generation.policy`. | Import must accept every rules-valid puzzle, e.g. the classic 12 pentominoes or a hand-made piece with a hole. | A1 R1-06; A2 R1-06/R1-10 |
| D9 | Piece count, size balance, level windows, maximum board | Table-driven and PROVISIONAL [P5] | The addendum supersedes 10–18 pieces. Phase 5 benchmarks. | Orchestrator |
| D10 | Difficulty formula | Additive: `round(2U + 0.1R + 4H + 8·log10(1+B))`. B comes from one canonical, node-capped traversal; a capped run gives a censored "≥" score. Weights and bands are [P5]. R is kept until a Phase-5 ablation decides. | One deterministic, device-independent formula with bounded cost | A2 formula + A1 node cap (P3) |
| D11 | Search-effort estimator | A single canonical traversal. Phase 5 compares it with the median of 3 seeded runs. | Simplest deterministic choice; measured score spreads were similar (5–6 vs. 3–6 points). | A2; A1 (P3) |
| D12 | Level bands | Open-ended ladder of 15-point bands; Hell-n continues indefinitely [P5] | Adds Hell-3+ without renumbering existing levels | A2 |
| D13 | Shown level | Always the level of the actual score, worded as an estimate. Censored scores show "≥". | Honest labels | A1, A2 |
| D14 | Uniqueness | Default: any valid completion. Optional "Require one solution" needs an exhaustive raw-coordinate proof. Certificates have 4 states. | The user did not require uniqueness; never claim an unproved fact. | A1, A2 (P3) |
| D15 | Piece-set acceptance | A set is ready only once a target-band calibration puzzle exists; that puzzle becomes puzzle #1. The unclued score is informational only. | The unclued score is not a ceiling (counterexample in A.9). | A2 (R2-02) |
| D16 | Distinct puzzles | Each puzzle needs a new full-layout key AND a new clue key (modulo board symmetry). Preferred distance `max(3, ⌈K/3⌉)`, relaxable to 1. Short batches are returned as partial. | The requirement says the arrangement must change; also avoids near-duplicates. | A2 (R2-01); A1 (R1-04) |
| D17 | Layout discovery | LNS re-tiling plus Luby random restarts | Fast and diverse in measurements (A.4) | A1 |
| D18 | Clue selection | 1 ≤ G ≤ K−2. Count-guided sampling, then a bounded beam over add/remove/swap moves. No monotonicity assumption. | Both P3 positions | A1, A2 |
| D19 | Parallelism | Pool of up to 4 module workers. A deterministic fold accepts the lowest-index success. | Meets the 4-worker budget while keeping seeds reproducible; never "first finisher wins". | New here (addendum); A2 principle |
| D20 | Cancellation | `worker.terminate()` plus lazy respawn. No `setTimeout(0)` slicing. | Instant; avoids the HTML 4 ms timer clamp | A1 (R1-07), accepted by A2 |
| D21 | PRNG and seeds | xoshiro128**. A free-text seed is hashed with SHA-256 to a 128-bit state. | Published reference algorithm; user-friendly seeds | A2 PRNG; A1 seeds (R1-13) |
| D22 | Hashing | One pure-JS, synchronous SHA-256 in `core` for seeds, fingerprints and ids | Identical in pages, workers, Node and non-secure contexts | New here |
| D23 | Exchange format | Envelope `format / version / kind / rules`. Board as row strings. Poses `{piece, x, y, turn, mirrored}`. Strict whitelist plus a free `meta` object. Supported versions {1}. | Merge of both formats | A1, A2 (P3) |
| D24 | Solutions in files | Per-puzzle `solution` and the set `witness` are included by default; an "Omit solutions" export option exists. | O(cells) solvability proof on import; resume after reload | A1 (R1-05), accepted by A2 |
| D25 | Hand-off | Primary: compressed `#pack=` link. Fallback: local-library `#lib=` reference when the link is too long. Plus JSON files. | Portable and self-contained; no token expiry | A1 (R1-12); A2 (P3) |
| D26 | Progress identity | SHA-256 of exact coordinates: board rows, piece cells and clue cells | Symmetry-normalized keys corrupt saved moves (A.9) | A2 (R2-04) |
| D27 | Hints / show solution | Post-MVP, and only proven statements | An unproved culprit misleads (A.9) | A2 (R2-05) |
| D28 | Folder layout | `core/engine`, `core/workers`, `core/browser`; tests in `/tests` | Clear layering; tests are never deployed | A2 layout; A1 tests |
| D29 | Deployment | Actions: test → assemble `_site` → deploy. External `redirect.js`. Cache stamping is guarded until the tool exists. | CSP-compatible; every phase deploys | A1 workflow; A2 (R2-08/R2-09) |
| D30 | Colors | The 20-color palette plus letter labels. Beyond 20 pieces, colors are generated [P5]. | Large boards may have 40+ pieces. | A1; A2 (R2-03) |
| D31 | Rotating a placed piece | Rotate about its handle cell and try 4 one-cell kicks; otherwise reject. | Predictable; the piece stays where it was | A1 |

---

## 3. Architecture

### 3.1 Repository layout

```text
pentomino/                     repository root = site root /pentomino/
├─ index.html                  redirect page: meta refresh + link to ./generator/
├─ redirect.js                 external redirect module (CSP-safe), §12.2
├─ .nojekyll
├─ package.json                {"type":"module","private":true}; scripts only, no dependencies
├─ core/
│  ├─ engine/                  pure ES modules: no DOM, no storage, no clock; run in page, worker and Node
│  │  ├─ hash.js  rng.js  geometry.js  board.js  view.js  policy.js  levels.js
│  │  ├─ dlx.js  tiling.js  carve.js  keys.js  difficulty.js  clues.js  generate.js
│  │  └─ pack.js  sharecode.js  game.js  palette.js  protocol.js
│  ├─ workers/
│  │  └─ engine.worker.js      module worker; runs engine tasks (§8.1)
│  └─ browser/                 DOM helpers shared by both apps
│     └─ worker-pool.js  svg-board.js  pointer.js  storage.js  handoff.js  dom.js  common.css
├─ generator/
│  ├─ index.html  app.js  state.js  strings.js  generator.css
│  └─ ui/  board-editor.js  level-panel.js  set-panel.js  puzzle-panel.js  progress.js
├─ player/
│  ├─ index.html  app.js  state.js  strings.js  player.css
│  ├─ ui/  board-view.js  tray-view.js  toolbar.js  keyboard.js  import-view.js  win-dialog.js
│  └─ samples/sample-pack.json
├─ tests/                      node:test suites and fixtures (never deployed)
├─ tools/                      generate.mjs (CLI), calibrate.mjs, bench/ (browser benchmark),
│                              stamp-version.mjs, check-site.mjs
├─ .github/workflows/pages.yml
└─ docs/                       init-design/, calibration/, tasks/ (docs/local/ is git-ignored)
```

### 3.2 Runtime architecture

```text
Generator page (main thread)                         Worker pool (≤ 4 × core/workers/engine.worker.js)
  UI state ─ request {requestId, revision} ─► scheduler ─► task {kind, payload, seed label, budgets}
           ◄─ progress / accepted / result ◄─────────────── deterministic engine functions
  pack ─► share code ─► ../player/#pack=<code>&i=<k>   (fallback: #lib=<packId>, or a .json file)

Player page (main thread)
  import ─► validatePack ─► game reducer (core/engine/game.js) ─► SVG board + tray
         └► verifyPack task (1 worker)
```

Layering rules (MUST):

1. `core/engine/*` imports only `core/engine/*`. It never uses `window`, `document`, `localStorage`, timers or wall-clock time in any result.
2. `core/workers/engine.worker.js` imports only `core/engine/*`.
3. `core/browser/*` may import the engine.
4. Apps import `core` through relative paths. The generator never imports `player/*`, and vice versa.
5. Results never depend on wall-clock time. Time is used only by the main-thread watchdog (§8.4).

### 3.3 Technology choices

| Topic | Choice |
|---|---|
| Language | ES2022 JavaScript modules with JSDoc types and `// @ts-check`. Optionally `tsc --noEmit` in CI. |
| Build | None. Deployment only copies files (§12). |
| Rendering | SVG with a `viewBox` in cell units |
| Input | Pointer Events plus keyboard |
| Concurrency | Module Web Workers. No `SharedArrayBuffer`, because GitHub Pages cannot send COOP/COEP headers. |
| Compression | Native `CompressionStream` / `DecompressionStream('deflate-raw')` |
| Tests | Node ≥ 22 with `node:test` and `node:assert/strict`; zero dependencies |
| Runtime dependencies | None. Dev-only tools such as Playwright are optional. |

---

## 4. Module APIs

Signatures use TypeScript notation inside JSDoc. Functions are pure unless stated otherwise.

### 4.1 Shared types

```ts
type XY = [x: number, y: number];          // integers; x to the right, y down; origin = top-left
type Turn = 0 | 1 | 2 | 3;                  // clockwise quarter-turns (grid)
type Pose = { piece: string; x: number; y: number; turn: Turn; mirrored: boolean };
type Board = { width: number; height: number; active: Uint8Array };   // row-major, 1 = active
type Piece = { id: string; label: string; color: string; cells: XY[] }; // cells normalized (§5.1)
type PieceSet = { board: Board; pieces: Piece[]; witness: Pose[] | null };
type Metrics = { U: number; R: number; H: number; B: number };
type Rating = { model: 'difficulty-v1'; score: number; level: string; censored: boolean; metrics: Metrics };
type Certificate = { status: 'unique' | 'multiple' | 'not-proved' | 'unsatisfiable';
                     model: 'dlx-v1'; verified: boolean };  // verified = computed by this runtime
type Puzzle = { id: string; title?: string; clues: Pose[]; solution: Pose[] | null;
                rating: Rating | null; certificate: Certificate | null };
type Issue = { code: string; path: string; message: string };
type Result<T> = { ok: true; value: T; warnings: Issue[] } | { ok: false; issues: Issue[] };
```

Internally, an orientation index `t = 4·mirrored + turn` (0..7) is used (§6.1).

### 4.2 Engine modules (`core/engine/`)

**`hash.js`**

```ts
export function sha256Hex(data: string | Uint8Array): string;   // FIPS 180-4; strings are UTF-8 encoded
export function canonicalJson(value: unknown): string;            // sorted keys, no whitespace
```

**`rng.js`** (§8.6)

```ts
export const RNG_ID = 'xoshiro128ss-v1';
export const SEED_SCHEME = 'seed-sha256-v1';
export function normalizeSeedText(text: string): string;        // trim + NFC; 1..64 code points, else throws
export function createRng(seedText: string, label?: string): Rng;
export function randomSeedText(): string;                        // crypto.getRandomValues → "K7Q2-9MXA-3FWD"
type Rng = { nextU32(): number; int(n: number): number; float(): number;
             shuffle<T>(a: T[]): T[]; pick<T>(a: readonly T[]): T; derive(label: string): Rng };
```

**`geometry.js`** (§6.1)

```ts
export const TRANSFORMS: readonly ((p: XY) => XY)[];      // index t = 4f + r
export function transformCells(cells: XY[], t: number): XY[];
export function normalizeCells(cells: XY[]): XY[];         // min x = min y = 0, sorted by (y, x)
export function orientedCells(cells: XY[], t: number): XY[];
export function poseCells(piece: Piece, pose: Pose): XY[]; // absolute board cells
export function canonicalKey(cells: XY[]): string;         // "n:x,y;x,y;…" of the minimal variant
export function distinctOrientations(cells: XY[]): { t: number; cells: XY[] }[]; // 1, 2, 4 or 8 entries
export function canonicalT(cells: XY[], t: number): number; // smallest t giving the same oriented cells
export function compose(a: number, b: number): number;     // index of T_a ∘ T_b
export function rotateCW(t: number): number;
export function rotateCCW(t: number): number;
export function isConnected(cells: XY[]): boolean;
export function hasHole(cells: XY[]): boolean;
export function outlineLoops(cells: XY[]): XY[][];         // boundary polygons for SVG (even-odd fill)
```

**`board.js`** (§6.2)

```ts
export function boardFromRows(rows: string[]): Board;      // '#' active, '.' blocked
export function boardToRows(b: Board): string[];
export function rectangle(w: number, h: number): Board;
export function preset(id: 'rectangle' | 'heart' | 'diamond' | 'cross' | 'ring',
                       p: { n?: number; w?: number; h?: number; roundLobes?: boolean }):
  { board: Board; rotation: number };
export function activeCount(b: Board): number;
export function regions(b: Board): number[][];             // 4-connected active regions (cell indices)
export function classifyBlocked(b: Board): Uint8Array;     // 0 active, 1 exterior, 2 hole
export function normalizedActive(b: Board): { board: Board; dx: number; dy: number };
export function symmetries(b: Board): number[];            // t values that map the normalized active set onto itself
export function trimMargins(b: Board): Board;              // explicit user action only (D6)
export function validateForGeneration(b: Board): { errors: Issue[]; warnings: Issue[] };
```

**`view.js`** (§6.3): presentation math. This is the only module that converts between screen and board frames.

```ts
export const ANGLES: readonly number[];                    // [0, 45, …, 315], counter-clockwise
export function normalizeAngle(deg: number): number;       // throws unless deg is a multiple of 45
export function rotatedExtent(cells: XY[], theta: number): { w: number; h: number; minX: number; minY: number };
export function fitCellSize(ext: { w: number; h: number }, availW: number, availH: number,
                            o?: { min?: number; max?: number; marginCells?: number }): number;
export function screenRotate(t: number, dir: 'cw' | 'ccw'): number;
export function screenFlip(t: number, theta: number, axis: 'horizontal' | 'vertical'): number;
export function arrowToGrid(theta: number, key: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown'): XY;
export function straightenAngle(theta: number): number;    // nearest multiple of 90 (ties → θ − 45)
```

**`policy.js`** (§6.4, §8.3): all [P5] constants.

```ts
export const LIMITS: Readonly<{ minActive: number; maxActive: number; maxSide: number;
                                maxPieces: number; maxBatch: 10 }>;
export function pieceCountRange(levelId: string, area: number): [number, number] | null; // null = not offered
export function sizePolicy(area: number, k: number): { minSize: 3; maxSize: number; smallMaxShare: number;
                                                       largeFrom: number; largeMinShare: number; spread: number };
export function minAreaForCount(k: number): number;        // with the small-piece cap
export function planSizes(area: number, k: number, rng: Rng): number[] | null;
export const SCORE: Readonly<{ weights: { U: number; R: number; H: number; B: number };
                               caps: { branch: number; rows: number } }>;   // §7.2, §7.3
export const BUDGETS: Readonly<Record<string, number>>;
```

**`levels.js`** (§7.4, §7.5)

```ts
export type Level = { id: string; label: string; index: number; min: number; max: number; // [min, max)
                      clueShare: [number, number] };
export function level(id: string): Level;                  // 'hell-7' etc. are generated on demand
export function levelForScore(score: number): Level;
export function offeredLevels(area: number): Level[];      // [P5] level window for this board
```

**`dlx.js`** (§6.6)

```ts
export class ExactCover {
  constructor(numColumns: number, rows: Int32Array[]);     // all columns primary; rows already in canonical order
  solve(o: { maxSolutions?: number; rowTrialLimit?: number; branchTrialLimit?: number; rng?: Rng | null;
             onSolution?: (rowIds: number[]) => void; onProgress?: (rowTrials: number) => void;
             progressEvery?: number }):
    { solutions: number[][]; found: number; rowTrials: number; branchTrials: number; exhausted: boolean;
      stop: 'exhausted' | 'solution-limit' | 'row-limit' | 'branch-limit' };
}
```

The links are fully restored after every `solve`, so one instance can be solved repeatedly.

**`tiling.js`** (§6.6, §6.7)

```ts
export type Model = { cover: ExactCover; rowPose: Pose[]; freePieces: string[]; freeCells: number;
                      placementsPerPiece: number[] };      // = L_i, in canonical piece order
export function buildModel(b: Board, pieces: Piece[], clues: Pose[]): Model;
export function solveFirst(m: Model, o: { rng?: Rng; rowTrialLimit: number; branchTrialLimit?: number }):
  { layout: Pose[] | null; rowTrials: number; branchTrials: number; exhausted: boolean };
export function countSolutions(m: Model, o: { cap: number; rowTrialLimit: number }):
  { found: number; exhausted: boolean; witnesses: Pose[][] };
export function randomTiling(b: Board, pieces: Piece[], rng: Rng,
                             o: { clues?: Pose[]; totalRowTrials: number; restartBase: number }): Pose[] | null;
export function lnsStep(b: Board, pieces: Piece[], layout: Pose[], rng: Rng,
                        o: { k: number; rowTrialLimit: number; maxSolutions: number }): Pose[] | null;
export function lnsWalk(b: Board, pieces: Piece[], start: Pose[], rng: Rng, steps: number): Pose[];
export function isValidLayout(b: Board, pieces: Piece[], layout: Pose[]): boolean;    // O(cells)
```

**`carve.js`** (§6.5)

```ts
export function carve(b: Board, sizes: number[], rng: Rng, o: { stepBudget: number; growthTries: number }):
  { regions: number[][] } | null;                          // disjoint cell-index sets covering the board
export function finalizeSet(b: Board, regions: number[][]): PieceSet;  // ids, labels, colors, witness poses
```

**`keys.js`** (§6.8, §5.6)

```ts
export function layoutKey(b: Board, pieces: Piece[], layout: Pose[]): string;   // modulo board symmetry
export function clueKey(b: Board, pieces: Piece[], clues: Pose[]): string;      // modulo board symmetry
export function layoutDistance(b: Board, pieces: Piece[], a: Pose[], c: Pose[]): number;
export function progressFingerprint(b: Board, pieces: Piece[], clues: Pose[]): string; // exact coordinates
export function packId(pack: Pack): string;                // first 16 hex of SHA-256 over canonical rows, pieces and clues
export function puzzleId(b: Board, pieces: Piece[], clues: Pose[]): string;  // 'p' + first 12 hex of the same hash per puzzle
```

**`difficulty.js`** (§7)

```ts
export const MODEL = 'difficulty-v1';                      // weights and caps come from policy.SCORE [P5]
export function measure(b: Board, pieces: Piece[], clues: Pose[], caps?: { branch: number; rows: number }):
  { metrics: Metrics; censored: boolean; solvableProven: boolean };
export function score(m: Metrics): number;                 // pure formula, no caps
export function rate(b: Board, pieces: Piece[], clues: Pose[]): Rating;
export function inBand(r: Rating, target: Level, isTopOffered: boolean): boolean;  // §7.3
```

**`clues.js`** (§6.10, §6.11)

```ts
export function selectClues(ctx: { board: Board; pieces: Piece[]; layout: Pose[]; target: Level;
                                   topOffered: boolean; rng: Rng; uniqueness: 'any' | 'require';
                                   excludeClueKeys: ReadonlySet<string> }):
  { ok: true; clues: Pose[]; rating: Rating; certificate: Certificate }
  | { ok: false; reason: 'not-in-band' | 'uniqueness-not-proved' };
export function makeUnique(board: Board, pieces: Piece[], layout: Pose[], clues: Pose[], rng: Rng): Pose[] | null;
export function certify(board: Board, pieces: Piece[], clues: Pose[]): Certificate;
```

**`generate.js`** (§6.5, §6.9): pure task functions plus the deterministic fold.

```ts
export function setAttempt(req: SetRequest, attempt: number): SetAttemptResult;
export function puzzleCandidate(ctx: BatchContext, slot: number, attempt: number): PuzzleCandidate | null;
export function foldStart(ctx: BatchContext): FoldState;
export function foldNext(s: FoldState): { slot: number; attempt: number } | null;  // next candidate needed
export function foldAccept(s: FoldState, c: PuzzleCandidate | null): FoldState;    // deterministic acceptance
```

**`pack.js`** (§5)

```ts
export const FORMAT = 'pentomino-pack';
export const SUPPORTED_VERSIONS: readonly number[];        // [1]
export const RULES: readonly string[];                     // ['free-polyomino-v1']
export function createPack(a: { board: Board; rotation: number; pieces: Piece[]; witness?: Pose[];
                                puzzles: Puzzle[]; generation?: object; meta?: object }): Pack;
export function validatePack(input: unknown): Result<Pack>;
export function serializePack(p: Pack, o?: { omitSolutions?: boolean; pretty?: boolean }): string;
export function parsePack(text: string): Result<Pack>;     // size check → JSON.parse → validatePack
```

**`sharecode.js`** (§9.2)

```ts
export async function encodeShareCode(p: Pack): Promise<string>;   // "1z.<b64url>" or "1j.<b64url>"
export async function decodeShareCode(code: string, o?: { maxBytes?: number }): Promise<Result<Pack>>;
export function playerUrl(base: string | URL, code: string, index: number): string;
export function parseLocationHash(hash: string): { pack?: string; lib?: string; index: number } | null;
export function extractCode(text: string): string | null;   // from pasted text or a full link
```

**`game.js`** (§11): DOM-free player rules.

```ts
export function createGame(pack: Pack, puzzleIndex: number, saved?: Progress): GameState;
export function canPlace(s: GameState, pose: Pose, ignorePiece?: string):
  { ok: true } | { ok: false; reason: 'outside' | 'blocked' | 'overlap' | 'clue' };
export function reduce(s: GameState, a: Action): GameState;   // place | move | remove | orient | reset | undo | redo
export function isSolved(s: GameState): boolean;
export function snapshot(s: GameState): Progress;
```

**`palette.js`**

```ts
export const BASE_COLORS: readonly string[];               // 20 entries (§11.9)
export function colorFor(index: number): string;           // generated beyond 20 [P5]
export function labelFor(index: number): string;           // A … Z, AA, AB, …
export function textColorFor(hex: string): '#000000' | '#ffffff';   // WCAG relative luminance
```

**`protocol.js`**: worker message types and their validation (§8.1).

### 4.3 Browser modules (`core/browser/`)

| Module | API and responsibility |
|---|---|
| `worker-pool.js` | `createPool({ size })` returns `{ run(task, onProgress) → Promise<result>, cancelAll(), size }`. Cancelling terminates and lazily respawns workers. Hosts the watchdog (§8.4). |
| `svg-board.js` | `mountBoard(el, opts)` returns `{ render(model), setRotation(theta), cellAt(clientX, clientY) → XY or null, localPoint(clientX, clientY), destroy() }`. Shared by the player, the editor and thumbnails. |
| `pointer.js` | Drag/tap state machine with one active pointer, a drag threshold and a lift offset. Shared by the player and the board editor. |
| `storage.js` | `get`, `set`, `remove` and `list` under `pentomino:v1:`. Wraps every access in try/catch and evicts LRU entries on quota errors (§9.6). |
| `handoff.js` | `openInPlayer(pack, index)`, `readIncoming(location) → Promise<Result<{ pack, index }>>`, `downloadPack(pack, fileName)` |
| `dom.js` | `h()` element helper, toast, clipboard and download helpers |

---

## 5. Data model and exchange format v1

### 5.1 Coordinates and poses

- Cells are integer pairs: x to the right, y down, origin at the top-left of the W × H grid.
- Piece `cells` MUST be normalized: min x = min y = 0, sorted by (y, x).
- A pose `{piece, x, y, turn, mirrored}` is applied in this order:
  1. if `mirrored`, map (x, y) → (−x, y);
  2. apply `turn` clockwise quarter-turns, each (x, y) → (−y, x);
  3. normalize;
  4. translate by (x, y), the top-left of the oriented piece's bounding box.
- This equals `T_t` with `t = 4·mirrored + turn` (§6.1).
- Writers store `canonicalT` for symmetric pieces; readers accept any t.
- **Warning:** pose turns are clockwise, while `presentation.rotation` is counter-clockwise (D2). Only `view.js` converts between screen and board frames.
- Test vectors, piece D = `[[1,0],[0,1],[1,1]]`:

  | turn | mirrored | Result |
  |---|---|---|
  | 1 | false | `[[0,0],[0,1],[1,1]]` |
  | 0 | true | `[[0,0],[0,1],[1,1]]` |
  | 1 | true | `[[0,0],[1,0],[0,1]]` |

### 5.2 Pack document

| Field | Type | Required | Meaning |
|---|---|---|---|
| `format` | `"pentomino-pack"` | yes | Magic string |
| `version` | integer | yes | Must be in `SUPPORTED_VERSIONS` = {1} |
| `kind` | `"puzzle-pack"` or `"piece-set"` | yes | A puzzle pack holds 1–100 puzzles; a piece set has `puzzles: []` |
| `rules` | `"free-polyomino-v1"` | yes | Gameplay rules (below) |
| `board.rows` | string[] | yes | H strings of length W; `#` = active, `.` = blocked |
| `presentation.rotation` | 0, 45, …, 315 | no (default 0) | Counter-clockwise display angle; ignored by all logic |
| `pieces[]` | `{id, label, color, cells}` | yes | `id` matches `[A-Za-z0-9_-]{1,8}` and is unique; `label` ≤ 4 characters; `color` is `#rrggbb`; `cells` normalized |
| `witness` | Pose[] | no | A full layout. The generator always writes it for piece sets. |
| `puzzles[].id` | string | yes | `[A-Za-z0-9_-]{1,64}`, unique in the pack; opaque, never an identity for progress |
| `puzzles[].title` | string | no | ≤ 80 code points; rendered as text only |
| `puzzles[].clues` | Pose[] | yes | Locked pre-placed pieces; 0 ≤ count ≤ K−1. The generator writes 1..K−2. |
| `puzzles[].solution` | Pose[] | no | A full layout that contains every clue; included by default |
| `puzzles[].rating` | Rating | no | A claim; may be recomputed |
| `puzzles[].certificate` | `{status, model}` | no | A claim; may be recomputed |
| `generation` | object | no | Provenance and generation policy (§5.5); type-checked only |
| `meta` | object | no | Free extension, ≤ 4 KiB serialized; preserved, never interpreted |

**Rules `free-polyomino-v1` (normative gameplay):**

1. Each piece is a non-empty, edge-connected set of cells. Holes are allowed.
2. Each piece is used exactly once, in any of its 8 orientations.
3. The pieces cover every active cell exactly once and no blocked cell.
4. Clues are fixed; the player places all other pieces.
5. Every complete placement satisfying 1–4 wins.

**Generation policy `mixed-v1`** (generator only; recorded in `generation.policy`):
- every piece has ≥ 3 cells;
- canonical keys are pairwise distinct;
- pieces are hole-free;
- sizes follow the plan in §6.4 [P5].

Example: a hand-authored, verified 60-cell fixture (a 10 × 6 board).
- It has 10 pieces of sizes 4, 7, 10, 3, 5, 8, 6, 6, 5, 6, all distinct.
- Its solution is the ownership map below; every piece is in its reference orientation.

```json
{
  "format": "pentomino-pack",
  "version": 1,
  "kind": "puzzle-pack",
  "rules": "free-polyomino-v1",
  "board": { "rows": ["##########", "##########", "##########", "##########", "##########", "##########"] },
  "presentation": { "rotation": 0 },
  "pieces": [
    { "id": "A", "label": "A", "color": "#e6194b", "cells": [[0,0],[1,0],[0,1],[0,2]] },
    { "id": "B", "label": "B", "color": "#3cb44b", "cells": [[1,0],[2,0],[0,1],[1,1],[1,2],[2,2],[1,3]] },
    { "id": "C", "label": "C", "color": "#ffe119", "cells": [[1,0],[2,0],[3,0],[0,1],[1,1],[2,1],[1,2],[2,2],[3,2],[3,3]] },
    { "id": "D", "label": "D", "color": "#4363d8", "cells": [[1,0],[0,1],[1,1]] },
    { "id": "E", "label": "E", "color": "#f58231", "cells": [[1,0],[0,1],[1,1],[0,2],[1,2]] },
    { "id": "F", "label": "F", "color": "#911eb4", "cells": [[2,0],[3,0],[4,0],[0,1],[1,1],[2,1],[3,1],[4,1]] },
    { "id": "G", "label": "G", "color": "#42d4f4", "cells": [[0,0],[1,0],[2,0],[2,1],[2,2],[3,2]] },
    { "id": "H", "label": "H", "color": "#f032e6", "cells": [[1,0],[2,0],[0,1],[1,1],[2,1],[1,2]] },
    { "id": "I", "label": "I", "color": "#bfef45", "cells": [[1,0],[2,0],[1,1],[0,2],[1,2]] },
    { "id": "J", "label": "J", "color": "#fabed4", "cells": [[1,0],[1,1],[1,2],[1,3],[0,4],[1,4]] }
  ],
  "puzzles": [
    {
      "id": "example-1",
      "title": "Example",
      "clues": [
        { "piece": "A", "x": 0, "y": 0, "turn": 0, "mirrored": false },
        { "piece": "J", "x": 8, "y": 1, "turn": 0, "mirrored": false }
      ],
      "solution": [
        { "piece": "A", "x": 0, "y": 0, "turn": 0, "mirrored": false },
        { "piece": "B", "x": 1, "y": 0, "turn": 0, "mirrored": false },
        { "piece": "C", "x": 3, "y": 0, "turn": 0, "mirrored": false },
        { "piece": "D", "x": 6, "y": 0, "turn": 0, "mirrored": false },
        { "piece": "E", "x": 0, "y": 2, "turn": 0, "mirrored": false },
        { "piece": "F", "x": 0, "y": 4, "turn": 0, "mirrored": false },
        { "piece": "G", "x": 3, "y": 3, "turn": 0, "mirrored": false },
        { "piece": "H", "x": 6, "y": 3, "turn": 0, "mirrored": false },
        { "piece": "I", "x": 7, "y": 0, "turn": 0, "mirrored": false },
        { "piece": "J", "x": 8, "y": 1, "turn": 0, "mirrored": false }
      ]
    }
  ],
  "generation": { "app": "hand-authored", "policy": "mixed-v1" }
}
```

```text
AABBCCCDII
ABBCCCDDIJ
AEBBCCCIIJ
EEBGGGCHHJ
EEFFFGHHHJ
FFFFFGGHJJ
```

Generated packs also carry a `rating`, a `certificate` and the full `generation` object. Generated piece ids follow the canonical order (§6.5).

### 5.3 Validation: `validatePack`, staged and bounded

1. **Size.** A file is at most 512 KiB. A decoded share code is at most 256 KiB, checked while decompressing (§9.2).
2. **Parse.** `JSON.parse` without a reviver; the top level must be an object.
3. **Envelope.**
   - `format` must match exactly.
   - `version` must be in {1}. Reject 0, negatives, non-integers and unknown versions with "unsupported version".
   - `kind` must be `puzzle-pack` or `piece-set`.
   - `rules` must be `free-polyomino-v1`.
4. **Whitelist.** An unknown field inside a core object is an error reported with its path. `generation` and `meta` may hold any JSON within their size limits; they are copied verbatim and never interpreted.
5. **Board.** 1 ≤ W, H ≤ 64; all rows have the same length and use only `#` or `.`; 1 to 1,024 active cells.
6. **Pieces.**
   - 1 ≤ K ≤ 128, with unique ids.
   - Cells are integer pairs, normalized and unique, 1–128 per piece, and edge-connected.
   - The sizes sum to the active-cell count.
   - Labels and colors match their syntax.
7. **Poses** (clues, solution, witness):
   - the piece exists; `x` and `y` are integers; `turn` is 0..3; `mirrored` is a boolean;
   - every covered cell is inside the grid and active;
   - clues do not overlap, and no piece appears twice among the clues.
8. **Puzzles.**
   - `kind` constraints hold, and ids are unique.
   - A `solution`, if present, is a valid layout containing every clue pose with the same cells.
   - A `witness` must be a valid layout.
9. **Claims.** `rating` and `certificate` are type-checked (finite, non-negative score; known status). The UI shows them as "claimed" until this runtime recomputes them (§9.5).
10. **Policy (warnings only).** Pieces smaller than 3 cells, duplicate shapes or pieces with holes produce warnings; the player shows "non-standard piece set".

Copy only whitelisted fields into newly created objects; this prevents prototype pollution. Render every text field with `textContent`.

### 5.4 Versioning

- `version` changes only for breaking schema changes. Older versions keep explicit, tested migrations (`migrate[n]`). Unknown versions are rejected.
- Independent identifiers version the semantics:
  - `rating.model` (`difficulty-v1`);
  - `certificate.model` (`dlx-v1`);
  - `generation.algo` (generator algorithms; seeds reproduce only within one algo id);
  - `generation.rng` and `generation.seedScheme`.

### 5.5 Generation metadata

```json
{
  "app": "pentomino-generator/1.0.0", "algo": "gen-v1",
  "rng": "xoshiro128ss-v1", "seedScheme": "seed-sha256-v1", "policy": "mixed-v1",
  "setSeed": "K7Q2-9MXA-3FWD", "setLevel": "hard", "setAttempt": 2,
  "batchSeed": "P0ZD-4W2R-H8NA", "batchLevel": "hard", "batchIndex": 1,
  "uniqueness": "any", "budget": "standard", "createdAt": "2026-10-22T03:00:00Z"
}
```

### 5.6 Progress records and fingerprints

- **Key:** `pentomino:v1:progress:<fp>`, where `fp = progressFingerprint(board, pieces, clues)`:

  ```text
  fp = sha256Hex(canonicalJson({
         rows,                                                     // exact board rows
         pieces: [[id, normalizedCells], …] sorted by id,
         clues:  [[pieceId, absoluteCellsSortedByYX], …] sorted by pieceId }))
  ```

- **Value:** `{ v: 1, placements: Pose[], elapsedMs, moves, solved, updatedAt }`.
- The fingerprint uses exact coordinates. It never uses symmetry-normalized keys, because saved poses refer to exact cells (counterexample in A.9).
- Colors, titles, rotation, ratings and ids other than piece ids are excluded.
- **Restore:** re-validate saved placements one by one with `canPlace`. Drop any invalid one and show a notice.

---

## 6. Algorithms

### 6.1 Geometry, D4 transforms and canonical forms

Primitives, in y-down screen coordinates:
- mirror `M(x, y) = (−x, y)`;
- clockwise quarter-turn `R(x, y) = (−y, x)`.

`T_t = R^r ∘ M^f` with `t = 4f + r`: mirror first, then turn.

| t | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| (x, y) → | (x, y) | (−y, x) | (−x, −y) | (y, −x) | (−x, y) | (−y, −x) | (x, −y) | (y, x) |
| turn, mirrored | 0, F | 1, F | 2, F | 3, F | 0, T | 1, T | 2, T | 3, T |

**Grid composition rules** (they follow from `M∘R = R⁻¹∘M`):

| Operation | New r | New f |
|---|---|---|
| rotateCW | (r + 1) mod 4 | f |
| rotateCCW | (r + 3) mod 4 | f |
| Mirror across the vertical grid axis | (4 − r) mod 4 | 1 − f |
| Mirror across the horizontal grid axis | (6 − r) mod 4 | 1 − f |

**Canonical key**
- For each t, compute `normalize(T_t(cells))` as a list of cells sorted by (y, x).
- Choose the variant whose tuple sequence is numerically smallest, comparing y then x element by element. Never compare strings.
- Encode it as `"<n>:" + cells.map(c => c.x + "," + c.y).join(";")`.
- Test vectors:

  | Shape | Key |
  |---|---|
  | L-tromino | `3:0,0;1,0;0,1` |
  | I-tromino | `3:0,0;1,0;2,0` |
  | Fixture piece F (§5.2) | `8:0,0;1,0;2,0;3,0;4,0;0,1;1,1;2,1` |

**`distinctOrientations`** deduplicates the 8 normalized variants and keeps the smallest t for each. Expected counts:

| Shape | O-tetromino | I-tromino | T-tetromino | S-tetromino | L-tetromino | F-pentomino | X-pentomino |
|---|---|---|---|---|---|---|---|
| Orientations | 1 | 2 | 4 | 4 | 8 | 8 | 1 |

**`hasHole`** flood-fills the empty cells of the bounding box padded by one cell, starting from the padding. Any empty cell left unreached is a hole.

**Enumeration self-test.** Growing free polyominoes and canonicalizing them MUST reproduce:
- OEIS A000105 for n = 1..8: 1, 1, 2, 5, 12, 35, 108, 369;
- hole-free counts for n = 7..10 (A000105 − A001419): 107, 363, 1248, 4460.

### 6.2 Board model, presets and rendering classes

- **Board.** W × H plus an active mask; files store it as row strings. W and H are each at most `LIMITS.maxSide` [P5] in the editor and at most 64 on import.
- **`classifyBlocked`.** Flood fill from outside a 1-cell-padded grid through blocked cells. Reached cells are *exterior*; the remaining blocked cells are *holes*.
- **`normalizedActive`.** Crops to the active bounding box and returns the offsets (dx, dy).
- **`symmetries`.** Returns the t values for which `normalize(T_t(activeCells))` equals `normalize(activeCells)`.
  - Expected sizes: non-square rectangle 4, square 8, Heart 2 (identity and the anti-diagonal reflection t = 5), irregular board 1.
  - Margins never hide a symmetry (D6).
- **Validation for generation.**
  - Errors:
    - active cells < `LIMITS.minActive` (12) or > `LIMITS.maxActive` [P5];
    - the active cells are not one 4-connected region;
    - a side exceeds `LIMITS.maxSide` [P5];
    - no level is offered for this area.
  - Warning: more than 120 active cells — "large board: generation may take up to 2 minutes" [P5].
  - Offending cells are highlighted.
- **Presets.** Masks only; the user can then paint cells or change the rotation.

  | Preset | Definition | Default | Rotation |
  |---|---|---|---|
  | Rectangle | W × H, all active | 10 × 6 = 60 cells | 0 |
  | Heart | N × N, N even, with the top-right (N/2) × (N/2) block blocked. "Round lobes" also blocks cells (0, 0) and (N−1, N−1). | N = 10: 75 cells (73 with round lobes) | 45 |
  | Diamond | N × N square | N = 8: 64 cells | 45 |
  | Cross | Union of a horizontal and a vertical bar, thickness ⌈N/3⌉ | N = 9: 45 cells | 0 |
  | Ring | W × H with a centered blocked rectangle (a hole); walls ≥ 2 cells thick | 8 × 8 with a 2 × 2 hole: 60 cells | 0 |

  - The Heart has N²·3/4 cells: N = 8 → 48, N = 12 → 108, N = 14 → 147.
  - At rotation 45, the blocked corner points up (the notch) and the bottom-left corner becomes the tip. Relative to the center, the lobe tops sit at (±0.354·N, −0.354·N).
  - The general form is M × N with an a × b top-right block.

### 6.3 Presentation rotation (display only)

- θ ∈ {0, 45, …, 315}, in degrees **counter-clockwise** on screen.
- θ MUST NOT influence the solver, score, keys, validation, fingerprints or seeds.
- The same rules apply to generator previews, thumbnails and the player.

**Rendering**

- The SVG `viewBox` is in cell units.
  - One board group carries `transform="rotate(−θ, cx, cy)"`, where (cx, cy) is the center of the active bounding box.
  - SVG angles are clockwise on screen, hence the minus sign.
- Everything on the board lives inside that group: cells, holes, pieces, clue hatching, the ghost and focus rings.
  - Labels are counter-rotated with `rotate(θ, lx, ly)` so they stay upright.
- The player does not draw exterior blocked cells, so the outline shows the shape (for example, the heart).
  - Holes are drawn dark and hatched.
  - The editor draws exterior cells as faint dashed guides, so they can be re-activated.
- Tray pieces and the drag layer use the same θ (WYSIWYG). A piece looks identical in the tray, while dragged, and on the board.
  - Tray slots are sized from each piece's rotated bounding box.

**Hit-testing and dragging**

- `local = DOMPoint(clientX, clientY).matrixTransform(boardGroup.getScreenCTM().inverse())`. This stays correct under page scroll and zoom.
- The cell under the pointer is `(floor(local.x), floor(local.y))`. It counts only if it lies inside W × H and is active. The transparent corners of a rotated bounding box are therefore outside.
- **Drag anchor.**
  - Let s be the grabbed source cell (piece-local, before orientation).
  - Under the current t, its position inside `normalize(T_t(cells))` is g.
  - The ghost origin is `floor(local) − g`.
  - Rotating or flipping during a drag recomputes g, so the grabbed cell stays under the pointer.
- **Touch lift.** The dragged piece is drawn 1.25 cells above the finger *on screen*. Apply the screen offset (0, −1.25·cellPx) before the inverse transform.
- **Editor painting.** Uses the same mapping. The "Edit unrotated" toggle temporarily displays θ = 0 for precise painting.

**Screen-space operations** (D4), with `k = (θ / 45) mod 4`:

| Control | Effect on t = 4f + r |
|---|---|
| ⟳ rotate clockwise on screen | r ← (r + 1) mod 4. Quarter-turns commute with the view rotation. |
| ⟲ rotate counter-clockwise on screen | r ← (r + 3) mod 4 |
| ⇋ mirror left ↔ right on screen | r ← (k − r) mod 4, f ← 1 − f |
| ⇵ mirror top ↔ bottom on screen | r ← (k + 2 − r) mod 4, f ← 1 − f |

- Derivation: the new transform is `(R^k ∘ M) ∘ T_t`. Under the view rotation θ, `R^k ∘ M` is the grid reflection that appears as a mirror across the screen's vertical axis.
- At θ = 0 these rules equal the grid rules of §6.1.
- Pieces never get 45° orientations.
- Verified for 8 angles × 8 orientations (A.7).

**Arrow keys**

- With `q = floor(θ / 90)` and the arrow's screen vector a (Right = (1, 0), Down = (0, 1)), the ghost moves by `g = R^q(a)` grid cells.
- This is exact for multiples of 90°.
- At odd multiples of 45° the two nearest axes tie (each 45° off), and the rule picks the mapping for θ − 45°.
- During keyboard moves on a rotated board, small axis arrows are drawn next to the ghost.

**Viewport fit**

- **Extent.** The bounding box of the four corners of every active cell, after rotating by θ.

  | Board | θ | Extent (cells) |
  |---|---|---|
  | 6 × 10 | 45° | 11.31 × 11.31 |
  | Heart N = 10 | 45° | 14.14 × 10.61 |

- **Cell size.** `cell px = clamp(floor(min(availW / (ext.w + 1), availH / (ext.h + 1))), 14, 64)`, which leaves a 0.5-cell margin on each side.
  - Example in a 900 × 500 px area: 6 × 10 at 0° gives 64 px (clamped); at 45° it gives 40 px.
- **Small screens.** Below 14 px the board container scrolls; zoom buttons cover 14–64 px.
  - On touch devices, if the fitted size is under 24 px, the player offers **Straighten view**. It displays the nearest multiple of 90° (ties → θ − 45°); this is display-only and stored per device, never in the pack.

### 6.4 Piece count and size policy [P5]

**Fixed rules (not provisional):**
- every generated piece has ≥ 3 cells, is hole-free and has a unique canonical key;
- K ≥ 3;
- 1 ≤ G ≤ K − 2.

**(a) Count table [P5].** `pieceCountRange(level, A)` returns [Kmin, Kmax], or null when the level is not offered.

The four values marked † are the user's addendum examples (the user marked them unverified); all other values are guesses for Phase 5 to replace.

| Level | 60 cells | 120 cells | 240 cells | 360 cells |
|---|---|---|---|---|
| very-easy | 6–7 | 8–9 | — | — |
| easy | 7–8 † | 9–10 | — | — |
| normal | 8–9 | 10–12 | 13–15 | — |
| hard | 9–10 | 12–14 | 15–17 | 16–18 † (lowest) |
| expert | 10–11 | 14–16 | 18–21 | 21–24 |
| master | 11–13 † (highest) | 16–18 | 22–25 | 27–30 |
| nightmare | — | 18–20 | 26–29 | 33–36 |
| hell-1 | — | — | 30–33 | 40–42 † |
| hell-2 | — | — | — | 46–48 |
| hell-3 | — | — | — | 52–54 |

**Interpolation for area A:**
1. A level is offered iff it is offered at the anchor nearest to A (ties go to the smaller anchor).
2. Between anchors a1 < A < a2 where both define the level: linearly interpolate Kmin and Kmax and round.
3. Otherwise, scale the defining anchor's values by A / anchor. Below 60 cells, scale the 60 column, with a minimum of 3. Above 360, scale the 360 column.
4. Finally clamp Kmax to the feasibility bound (c). If Kmin > Kmax, the level is not offered.

**(b) Size plan [P5]** (`planSizes`).

Target mean `s̄ = A / K`. Start from ⌊s̄⌋ / ⌈s̄⌉ sizes, then apply 3K random pairwise ±1 transfers. A transfer is kept only if every constraint below still holds:

| Constraint | Rule |
|---|---|
| Size bounds | 3 ≤ size ≤ maxSize = max(10, ⌈1.6·s̄⌉) |
| Spread | \|size − s̄\| ≤ max(2.5, 0.35·s̄) |
| Shape availability (hole-free) | at most 2 of size 3, 5 of size 4, 12 of size 5, 35 of size 6, 107 of size 7, 363 of size 8 |
| Small pieces | at most ⌊0.4·K⌋ pieces of 3–4 cells ("never too many small pieces") |
| Large pieces (preference, only when s̄ ≥ 5.5) | at least ⌈0.2·K⌉ pieces of ≥ 6 cells |

The large-piece preference does not apply at s̄ < 5.5, so classic-like 60-cell sets with K = 12–13 remain possible.

**(c) Feasibility.** `minAreaForCount(K)` uses the smallest available sizes under the small-piece cap.

| K | 10 | 11 | 12 | 13 | 17 | 18 | 20 | 41 |
|---|---|---|---|---|---|---|---|---|
| Minimum area | 44 | 49 | 54 | 58 | 77 | 81 | 92 | 218 |

- Without the cap, the minimum is 5K − 9 for 7 ≤ K ≤ 19.
- When possible, the generator keeps at least 3 cells of slack above the minimum: carving at exactly the minimum area was about 10× slower (A.2).

**(d) Maximum board size [P5].** `LIMITS.maxActive = 360` and `LIMITS.maxSide = 40` are placeholders. Phase 5 finds the optimum under the time limits (§8.7).

**Phase-5 evidence so far** (Appendix A):
- carving is cheap even at 360 cells (11–59 ms);
- rating and layout search dominate on big boards: one capped canonical traversal at 360 cells with 41 pieces took 68–88 s for 500,000 row trials.

### 6.5 Piece-set generation (carving + calibration)

Request: `{ board, rotation, levelId, seedText, uniqueness: 'any' | 'require', budget: 'standard' | 'extended' }`.

```text
setAttempt(req, j):                                   // pure; runs in a worker; j = attempt index
  rng ← createRng(req.seedText, 'set/' + j)
  [kmin, kmax] ← pieceCountRange(level, A)            // §6.4 [P5]
  K ← kmin + rng.int(kmax − kmin + 1)
  sizes ← planSizes(A, K, rng);            if null → return fail('sizes')
  regions ← carve(board, sizes, rng, { stepBudget: BUDGETS.carveSteps, growthTries: BUDGETS.carveTries })
  if null → return fail('carve')
  set ← finalizeSet(board, regions)                    // ids, colors, witness poses
  assert isValidLayout(set.witness) and policy holds (independent check)
  cal ← selectClues({ layout: set.witness, target: level, rng: rng.derive('cal'), uniqueness, … })
  if !cal.ok → return fail(cal.reason)
  return { set, calibration: cal }

carve(board, sizes, rng):                             // randomized backtracking
  owner[c] ← empty for every active cell;  used ← ∅ (canonical keys);  remaining ← multiset(sizes)
  step():                                             // ≤ BUDGETS.carveSteps calls per attempt
    if no empty cell: return remaining = ∅
    target ← empty cell with the fewest empty 4-neighbours (ties: rng)   // most constrained first
    repeat ≤ BUDGETS.carveTries times:
      s ← random distinct size in remaining
      shape ← edenGrow(target, s)   // add uniformly random frontier cells, inside empty cells only
      if shape = null or hasHole(shape) or canonicalKey(shape) ∈ used: continue
      commit(shape)
      if residualFeasible() and step(): return true
      undo(shape)
    return false
  residualFeasible(): every empty 4-connected component has size ≥ min(remaining)
                      and is a subset sum of the remaining sizes (bitset DP).
                      Disconnected residues are allowed.
```

**Properties.**
- Every region is connected (it grows from a frontier), disjoint from the others, hole-free and distinct.
- The carve itself is the witness, so every set tiles the board by construction.

**`finalizeSet`.**
- Sort the pieces by (size descending, canonical key ascending).
- Assign `id = label = labelFor(index)` and `color = colorFor(index)`.
- For each region, find `(canonicalT, x, y)` that maps the piece's normalized cells onto the region; these poses form the witness.

**Calibration.**
- It uses exactly the clue selection of New Puzzles (§6.10).
- The set is "ready for <level>" only when the calibration puzzle is in band, and proven unique when required. That puzzle becomes puzzle #1 of the first batch.

**Unclued benchmark (MAY).**
- Rate the set with zero clues if budget remains.
- Show it only as "unclued benchmark", never as a maximum level (A.9).

**Parallel determinism (§8.2).** Attempts j = 0, 1, 2, … run on the pool. The result is the **lowest j that succeeds**.

**Failure.** "Couldn't create a <level> piece set within the time limit" — never "impossible", unless an exhaustive argument exists.

### 6.6 Exact cover and DLX

**Model** for (board, pieces, clues). All columns are primary.

| Element | Contents and order |
|---|---|
| Cell columns | One per free cell (active and not covered by a clue), sorted by (y, x) |
| Piece columns | One per free piece, after the cell columns, sorted by (size, canonical key, id) |
| Rows | For each free piece × each distinct orientation × each translation whose cells are all free: `[cell columns…, piece column]` |
| Row order | Sorted by (piece column, sorted cell-column tuple). Rows are deduplicated by (piece, cell set). |

The number of rows for piece i is L_i (`placementsPerPiece`).

**Search** (Knuth's Algorithm X with Dancing Links):
- **Column choice:** the column with the fewest rows (MRV). Ties go to the first in column order (canonical mode) or are broken uniformly at random (seeded mode). A column with 0 rows is a dead end.
- **Row order** within a column: canonical (insertion order), or shuffled per node in seeded mode.
- **Counters:**
  - `rowTrials` = rows selected;
  - `branchTrials` = rows selected at nodes whose chosen column had ≥ 2 rows, counted before descending (forced single-row choices are excluded).
- **Limits:** `rowTrialLimit`, `branchTrialLimit` and `maxSolutions`. When a limit is hit, the search unwinds (all covers undone) and reports `stop`.
- **Implementation:** `Int32Array` L, R, U, D, C and ROW, plus column sizes S. Iterative or recursive; depth ≤ K.
- **Versioning:** the rating traversal — MRV, zero-column rejection, canonical order — is part of `dlx-v1`. Any change to pruning or ordering requires a new model id.

**Modes and permitted conclusions**

| Mode | Order | Stops at | Allowed conclusion |
|---|---|---|---|
| Rating | canonical | first solution or caps | B, censored if a cap was hit (§7.3) |
| Certificate | canonical | 2 solutions or cap | *unique* = 1 found + exhausted; *multiple* = 2 found; *unsatisfiable* = 0 found + exhausted; otherwise *not proved* |
| Discovery (random tiling, LNS) | seeded | first solution(s) or cap | a new valid layout |
| Import verify | canonical | first solution or cap | *solvable*; *unsatisfiable* if exhausted; otherwise *not verified* |

- Counting uses raw coordinates; there is no symmetry quotient.
- Symmetric orientations are deduplicated as rows, so they never create duplicate solutions.
- **Golden counts** (12 pentominoes, raw solutions):

  | Board | 3 × 20 | 4 × 15 | 5 × 12 | 6 × 10 |
  |---|---|---|---|---|
  | Raw solutions | 8 | 1,472 | 4,040 | 9,356 (= 4 × 2,339) |

### 6.7 Random tilings and LNS re-tiling

Run times of randomized backtracking are heavy-tailed. Restarts with the Luby schedule (Luby et al. 1993; Gomes et al. 1998) and large-neighbourhood search (LNS) avoid long global searches.

```text
randomTiling(board, pieces, rng, clues = [], total = BUDGETS.tilingTotal, base = BUDGETS.restartBase):
  for i = 1, 2, …:                                     // luby(i) = 1, 1, 2, 1, 1, 2, 4, 1, …
    r ← solveFirst(buildModel(board, pieces, clues), { rng: rng.derive('r' + i), rowTrialLimit: base · luby(i) })
    if r.layout: return r.layout
    if Σ rowTrials > total: return null

lnsStep(board, pieces, layout, rng, { k, rowTrialLimit = BUDGETS.lnsRows, maxSolutions = 12 }):
  cluster ← k pieces: a random seed piece, grown by random BFS over piece adjacency in layout
  sub ← solve(buildModel(board, pieces, clues = layout − cluster), seeded, maxSolutions, rowTrialLimit)
  alts ← sub solutions whose cluster placement differs from layout
  return alts ≠ ∅ ? (layout − cluster) + rng.pick(alts) : null

lnsWalk(board, pieces, start, rng, steps):
  cur ← start;  stuck ← 0
  for s in 1..steps:
    frac ← min(0.9, 0.3 + 0.1·⌊stuck / 5⌋)                 // widen the neighbourhood when stuck
    k ← clamp(⌈K · (frac + 0.1·rng.float())⌉, 4, K)
    nxt ← lnsStep(board, pieces, cur, rng, { k })
    if nxt: cur ← nxt; stuck ← 0  else: stuck += 1
  return cur
```

Measured, single-threaded: 10 diverse layouts took 0.03 s (6 × 10) up to 40 s (11 × 11, 18 pieces) (A.4).

### 6.8 Layout keys, clue keys and distance

Let S = `symmetries(board)` (§6.2). Every key is computed in the normalized active frame.

- **`layoutKey`.**
  - For each g ∈ S, transform all layout cells by g in the normalized frame and re-normalize. Because g is a symmetry, the active cells map onto themselves.
  - For every active cell in row-major order, write the *shape rank* of the piece covering it as two base-36 digits. The shape rank is the piece's index in (size, canonical key) order; identical shapes in imported sets share a rank.
  - The key is the lexicographically smallest string over g.
- **`clueKey`.** The same, but only clue cells are written; every other active cell is written as `..`.
- **`layoutDistance(a, b)`.** The minimum over g ∈ S of the number of pieces whose cell sets differ between g(a) and b.
- **Duplicates.** Two layouts are duplicates iff their layout keys are equal.
  - A new puzzle needs a new layout key AND a new clue key. The player sees only the clues, so two different layouts with identical clues would look like the same puzzle.

### 6.9 Batch generation: 1–10 distinct puzzles ("New Puzzles")

**Inputs:**
- set and witness;
- target level and quantity q ∈ 1..10;
- `batchSeed` and uniqueness mode;
- `seen`: the session history of accepted layout keys and clue keys for this set. It holds at most 1,000 keys; when full, the UI asks the user to start a new history.

```text
puzzleCandidate(ctx, i, a):          // pure; slot i ∈ 1..q, attempt a ∈ 0..BUDGETS.slotAttempts − 1
  rng ← createRng(ctx.batchSeed, 'slot/' + i + '/' + a)
  start ← ctx.witness
  if a mod 3 = 2: start ← randomTiling(board, pieces, rng.derive('restart')) ?? ctx.witness
  layout ← lnsWalk(board, pieces, start, rng.derive('walk'), steps = 8·(a + 1))
  sel ← selectClues({ layout, target, rng: rng.derive('clues'), uniqueness, excludeClueKeys: ctx.seenClues })
  return sel.ok ? { layout, layoutKey, clueKey(sel.clues), sel.clues, sel.rating, sel.certificate } : null

fold (deterministic; main thread; consumes candidates strictly in (i, a) order):
  dPref ← max(3, ⌈K / 3⌉);  accepted ← []
  if the set's calibration puzzle matches the level and its keys are unseen: it fills slot 1
  for each unfilled slot i (ascending):
    d ← dPref;  rejected ← 0
    for a in 0..BUDGETS.slotAttempts − 1:
      c ← candidate(i, a)                         // computed speculatively by the pool, or awaited
      ok ← c ≠ null and c.layoutKey ∉ seenLayouts and c.clueKey ∉ seenClues
           and min over p ∈ accepted of layoutDistance(c.layout, p.layout) ≥ d
      if ok: accept c (stream it to the UI); add its keys to seen; break
      rejected += 1;  if rejected mod 4 = 0: d ← max(1, d − 1)    // relax the preference, never to 0
    if slot i is still empty: stop → status 'partial' with a reason
```

**Speculation.**
- The scheduler keeps all workers busy with the next candidates in fold order: first attempt 0 of upcoming slots, then retries of the current slot.
- Speculation changes speed only, never results (§8.2).

**Result statuses:**
- `complete`;
- `partial`, with reason `difficulty-not-found`, `uniqueness-not-proved`, `layouts-not-found` or `time-limit`;
- `cancelled`.

Accepted puzzles are always kept. "No further arrangement exists" may be stated only after an exhaustive enumeration, which v1 never runs.

**Message example:** "Found 3 of 10 different Hard puzzles within the time limit. The piece set was not changed."

**Invariants.**
- New Puzzles never changes the board, the shapes, the colors or K.
- Clue-only variants of an existing layout never count toward the requested quantity.

### 6.10 Clue selection

```text
selectClues({ board, pieces, layout, target, topOffered, rng, uniqueness, excludeClueKeys }):
  K ← |pieces|;  [lo, hi] ← target.clueShare                        // [P5], §7.4
  G ← clamp(round(K · (lo + rng.float() · (hi − lo))), 1, K − 2)
  candidates ← []                                                  // rated subsets, closest first
  // Phase 1: count-guided sampling (≤ 8 count changes × 4 samples)
  for step in 1..8:
    below ← above ← 0
    repeat 4 times:
      F ← G distinct random pieces of layout, at their layout poses
      if F was tried or clueKey(F) ∈ excludeClueKeys: continue
      r ← rate(board, pieces, F)                                   // §7, node-capped
      if inBand(r, target, topOffered): go to finish(F, r)
      add (F, r) to candidates;  count r below or above the band
    if below > 0 and above = 0: G ← G − 1                           // too easy → fewer clues
    elif above > 0 and below = 0: G ← G + 1                         // too hard → more clues
    else: break
    if G ∉ [1, K − 2] or G was already tried: break
  // Phase 2: bounded beam search (beam 4; ≤ BUDGETS.clueSubsets distinct subsets in total)
  moves: add one piece | remove one piece | swap one clue for one non-clue (keeping 1 ≤ G ≤ K − 2)
  keep the 4 subsets closest to the band; stop at the first in-band subset or when the budget is spent
  finish(F, r):
    if uniqueness = 'require':
      F ← makeUnique(board, pieces, layout, F, rng)
      if F = null: resume the search with the next candidate   // final reason: 'uniqueness-not-proved'
      r ← rate(board, pieces, F);  if not inBand(r, target, topOffered): resume the search
      certificate ← { status: 'unique', model: 'dlx-v1', verified: true }
    else: certificate ← certify(board, pieces, F)                 // cap 2, BUDGETS.countRows; display only
    return { ok: true, clues: F, rating: r, certificate }
  fail('not-in-band')
```

- The level's clue share implements "easy = many pre-placed pieces, nightmare = few".
- The score alone decides acceptance; no monotonicity in G is assumed.

```text
makeUnique(board, pieces, layout, F, rng):          // counterexample-guided
  while |F| ≤ K − 2:
    c ← countSolutions(buildModel(board, pieces, F), { cap: 2, rowTrialLimit: BUDGETS.countRows })
    if c.found = 1 and c.exhausted: return F
    if c.found < 2: return null                     // not proved within budget
    S2 ← a found solution ≠ layout
    D ← pieces whose cells differ between S2 and layout, excluding F
    F ← F + layout pose of the smallest piece in D (ties: rng)
  return null
optional: try removing the added clues one by one (random order), keeping uniqueness and the band
```

### 6.11 Certificates and the uniqueness policy

| Status | Evidence | Card / player text |
|---|---|---|
| `unique` | Exhaustive count found exactly 1 raw-coordinate solution | "Unique solution ✓" |
| `multiple` | 2 distinct raw solutions found | "Several solutions" |
| `not-proved` | The count hit its cap with ≤ 1 solution found | "Uniqueness not proved" |
| `unsatisfiable` | Exhaustive count found 0 | Never generated; an import error ("No solution exists") |

- **Default `any`.** Every in-band puzzle is accepted. Its certificate is computed with cap 2 within `BUDGETS.countRows`, for display only.
- **`require`** ("Require one solution", advanced option). Only `unique` puzzles are accepted.
- **Tie-break (MAY).** When several in-band candidates exist for one slot, prefer one already certified `unique`. Never spend extra search on this.
- **Player.** Any valid complete placement wins, whatever the status. Certificates read from files are shown as "claimed" until this runtime recomputes them; recomputed ones are marked "verified".

---

## 7. Difficulty score and levels

### 7.1 Metrics

All metrics are computed for a board, its set and a clue subset.

| Symbol | Definition |
|---|---|
| U | Pieces to place: K − G |
| R | Active cells not covered by clues |
| L_i | Distinct legal placements of free piece i on the free cells: its row count in the model (§6.6). Clues are considered; other free pieces are ignored. |
| H | Mean placement-choice bits: (1 / U) · Σ log2(1 + L_i) |
| B | `branchTrials` of the canonical DLX traversal until its first solution, capped (§7.3) |

### 7.2 Formula: `difficulty-v1` (weights [P5])

```text
D = Math.round(2.00·U + 0.10·R + 4.00·H + 8.00·log10(1 + B))       // rounded once, at the end
U = 0 → D = 0.   Any L_i = 0 → unsolvable: reject before rating.
```

| Term | Weight | Intention |
|---|---|---|
| U | 2.00 per piece | More separate objects to reason about. "Fewer pre-placed pieces = harder." |
| R | 0.10 per cell | Geometric scale. Kept until the Phase-5 ablation decides (it is largely correlated with U). |
| H | 4.00 per bit | More plausible placements per piece means more ambiguity. |
| log10(1 + B) | 8.00 per decade | Trial-and-error effort, without letting it dominate linearly. |

**Worked examples** (unit tests). `score()` is the pure formula; `measure()` applies the caps.

| U | R | L or H | B | H | D | Level |
|---|---|---|---|---|---|---|
| 3 | 15 | L = (1, 2, 3) | 0 | 1.5283 | 14 | very-easy |
| 11 | 55 | H = 5 | 999 | 5 | 72 | expert |
| 17 | 100 | H = 7 | 999,999 | 7 | 120 | hell-1 |
| 12 | 50 | H = 6 | capped (B = 50,000) | 6 | ≥ 91 | ≥ master |

### 7.3 Caps and censoring

- **Caps per rating [P5]:** `BUDGETS.rateBranch = 50,000` branch trials and `BUDGETS.rateRows = 200,000` row trials.
- **Censoring.** If the traversal stops at either cap before its first solution:
  - set `censored = true` and `B = rateBranch`;
  - D is then a **lower bound**, displayed as "≥ D" with level "≥ L" ("L or harder").
- **Acceptance rule** for a target level T = [min, max):

  | Rating | Accepted when |
  |---|---|
  | Uncensored | min ≤ D < max |
  | Censored | T is the highest level offered for this board AND D ≥ min |

- A censored rating proves nothing about solvability. Generated puzzles are solvable by construction (their witness).
- Ratings never use wall-clock time, so the same inputs give the same rating on every device.
- Cost: with these caps, one rating takes ≤ ~5 s on boards up to ~120 cells (single thread). Uncapped, 46.6 s was observed (A.5).

### 7.4 Level table (bands [P5])

| Index | id | Label | Score band | Clue share (initial G / K) |
|---|---|---|---|---|
| 0 | `very-easy` | Very easy | [0, 20) | 70–80 % |
| 1 | `easy` | Easy | [20, 35) | 55–70 % |
| 2 | `normal` | Normal | [35, 50) | 40–55 % |
| 3 | `hard` | Hard | [50, 65) | 25–40 % |
| 4 | `expert` | Expert | [65, 80) | 15–30 % |
| 5 | `master` | Master | [80, 95) | 10–20 % |
| 6 | `nightmare` | Nightmare | [95, 110) | 5–15 % |
| 6 + n | `hell-n` | Hell n | [110 + 15(n−1), 125 + 15(n−1)) | 5–10 % |

- For D ≥ 110: n = ⌊(D − 110) / 15⌋ + 1.
- Labels always reflect the actual score (D13). A puzzle that scores above its board's top band shows its true level; this is rare.

### 7.5 Level windows by board size [P5]

- The offered levels for a board are exactly the levels with a defined count range at its area (§6.4).
  - Example: 60 cells → very-easy … master; 360 cells → hard … hell-3.
- Other levels are shown disabled, with the reason "needs a larger board" or "board too large for this level".

**Known calibration gap (MUST be resolved in Phase 5).** The provisional weights and bands were tuned on boards of ≤ 121 cells. On addendum-scale boards (A.8):
- 18 × 20 with 17 pieces of 20–23 cells and 5 clues scores 84–88 (Master), although the addendum calls this configuration "hard". R and H dominate, while B ≤ 3.
- 18 × 20 with 41 pieces and 3 clues scores ≥ 188 (censored; Hell-6 under these bands). Each capped traversal took 68–88 s.

Phase 5 therefore MUST:
1. recalibrate the weights, possibly normalizing R and H by board size;
2. choose caps per board size;
3. redraw the level windows.

Until then, boards above 120 cells are labeled "experimental", and acceptance tests cover ≤ 120 cells only.

### 7.6 How the score drives generation

1. **Level → K.** The count table gives K (§6.4): more pieces at higher levels and on bigger boards.
2. **Level → initial G.** The clue share sets the initial number of pre-placed pieces (§6.10).
3. **Acceptance.** Only in-band ratings are accepted, for both the set calibration and every puzzle (§7.3).
4. **Labels.** Every card shows `levelForScore(D)`, worded as an estimate.

### 7.7 Determinism and versioning

- D is a pure function of: board rows, piece shapes, clue cells, caps and model id.
  - Ids, colors, piece order in the file and display rotation do not affect it, thanks to the canonical order (§6.6).
- **Bump the model id** (`difficulty-v2`, …) whenever any of these change: a weight, a cap, a band, the traversal order or pruning, or the counter definitions.
- Stored ratings keep their model id. The player shows stored ratings as claims; an optional "Re-rate" action recomputes them with the current model.

### 7.8 Calibration (Phase 5; tool `tools/calibrate.mjs`)

**Sampling:** boards × levels × seeds; all clue counts; random and beam-selected clue subsets.

**Report contents:**
- score distributions by U and by area;
- in-band hit rate per (board, level);
- censored share;
- certificate distribution;
- rating cost;
- ablations: with and without R, and single traversal vs. median of 3 seeded runs.

**Acceptance targets:**
- ≥ 80 % of requests per offered (board, level) produce in-band puzzles within budget;
- censored share < 5 % below the top offered level.

**Output:** `docs/calibration/difficulty-v1.md`. After that, weights, bands, caps and windows are frozen as `difficulty-v1`. Optional human playtests may later justify `difficulty-v2`.

---

## 8. Performance, workers and budgets

### 8.1 Worker pool and protocol

**Pool.**
- Size: `min(4, navigator.hardwareConcurrency || 4)` [P5] module workers, created by:

  ```js
  new Worker(new URL('../workers/engine.worker.js', import.meta.url), { type: 'module' })
  ```

- The pool lives in `core/browser/worker-pool.js`.
- The player uses one worker for verification.

**Messages:**

```ts
// main → worker
{ type: 'task', id: number, kind: 'setAttempt' | 'puzzleCandidate' | 'rate' | 'certify' | 'verifyPack' | 'solveFirst',
  payload: object }                     // JSON-compatible: rows, pieces, poses, seed text, labels, budgets
// worker → main
{ type: 'progress', id: number, stage: string, rowTrials: number }    // every BUDGETS.progressEvery row trials
{ type: 'result',   id: number, value: object }
{ type: 'error',    id: number, code: string, message: string }
```

**Request tracking (main thread).**
- Each user action (Generate Piece Set, New Puzzles, import verification) gets a monotonically increasing `requestId`, plus the `revision` (a hash) of the board and set it was started for.
- Tasks belong to a request. Results whose request is no longer current, or whose revision no longer matches, are discarded, and their workers are terminated.
- Previously accepted results stay on screen until a replacement is validated.

**Inside a worker:** tasks run synchronously to completion. A worker MAY cache models per request (LRU ≤ 32 MB).

### 8.2 Deterministic parallelism

- Every task is a pure function of its payload: inputs, seed text, label and deterministic budgets.
- **Piece set.**
  - `setAttempt(j)` is dispatched for j = 0, 1, 2, …, with at most poolSize in flight.
  - When attempt j* succeeds, in-flight attempts j > j* are terminated, while attempts j < j* run to completion (they are bounded by their budgets).
  - The result is the smallest successful j.
- **Batch.** The fold of §6.9 consumes candidates strictly in (slot, attempt) order.
- **Guarantee.** The same request — inputs, seed, algo id and session history — yields identical sets and puzzles with any pool size (1–4) on any device.
  - A slower device may reach the time limit sooner; it then returns a **prefix** of the same sequence.
- **Never accept "whichever worker finishes first".**

### 8.3 Budgets [P5]

All budgets live in `policy.js` (`BUDGETS`). Node budgets are deterministic; time limits act only through the watchdog.

| Key | Meaning | Provisional value |
|---|---|---|
| `timeStandardMs` | Time limit per action (Generate Piece Set, or New Puzzles) | 60,000 (target 1 min) |
| `timeExtendedMs` | Limit with "Try longer" (hard maximum) | 120,000 (2 min) |
| `carveSteps` / `carveTries` | Recursion calls per carve attempt / growth tries per step | 6,000 / 24 |
| `rateBranch` / `rateRows` | Rating caps (§7.3) | 50,000 / 200,000 |
| `countRows` | Certificate and `makeUnique` count limit (cap 2 solutions) | 200,000 |
| `clueSubsets` | Rated subsets per layout (sampling + beam) | 64 |
| `lnsRows` | Row trials per LNS step (≤ 12 solutions) | 30,000 |
| `restartBase` / `tilingTotal` | Luby base / total row trials per random tiling | 2,000 / 2,000,000 |
| `slotAttempts` | Candidates per batch slot | 12 |
| `verifyRows` | Import verification without a solution | 2,000,000 |
| `progressEvery` | Row trials between progress messages (UI shows ≤ 5 updates/s) | 50,000 |
| `historyKeys` | Session-history layout keys per set | 1,000 |
| `maxNodes` | DLX nodes per model (memory guard, §8.5) | 3,000,000 |

### 8.4 Cancellation, watchdog and progress

- **Cancel.** Terminate every busy worker of the request and respawn lazily. Response is typically < 100 ms. Accepted results are kept.
- **Watchdog.** When the action's time limit is reached, the scheduler:
  1. stops dispatching;
  2. terminates busy workers;
  3. returns the accepted results with reason `time-limit`.
- **No cooperative slicing.** Workers never use `setTimeout(0)` slicing; the HTML Standard clamps nested timers to ≥ 4 ms, including in workers.
- **Progress UI.**
  - It shows the stage ("Carving piece set — attempt 3", "Puzzle 4 of 10 — rating candidates"), the accepted count, elapsed time and a Cancel button.
  - Puzzles stream onto the page as soon as the fold accepts them.
- **Main thread.** It never runs generation work and never has tasks > 50 ms other than rendering.
- **No module-worker support.**
  - The generator shows "This browser cannot run the generator (module workers required)".
  - The player still plays; solvability is shown as "not verified".

### 8.5 Memory [P5]

- **Model size.** Rows ≈ Σ L_i, and nodes ≈ Σ L_i · (|piece_i| + 1). For example, 360 cells with 41 pieces gives ≈ 41 × 8 × 300 ≈ 98k rows and ≈ 1M nodes ≈ 28 MB of `Int32Array`s.
- **Guard.** `buildModel` refuses models above `BUDGETS.maxNodes` with the error `model-too-large`; the UI suggests a smaller board.
- **Budget.** 4 workers × ≤ 300 MB plus the main thread ≤ 300 MB, well under 2 GB.
  - Phase 5 measures peak memory with `performance.measureUserAgentSpecificMemory()` where available, otherwise with the browser's task manager.

### 8.6 Seeds and PRNG

- **PRNG.** xoshiro128** (Blackman & Vigna) on 32-bit operations (`Math.imul`, `>>> 0`).
  - `int(n)` uses rejection sampling: limit = 2³² − (2³² mod n); draw until x < limit; return x mod n.
  - `float()` = nextU32() / 2³².
  - `Math.random` MUST NOT be used in `core/engine`.
- **Seed text.**
  - Visible to and editable by the user: 1–64 Unicode code points after `trim()` and NFC normalization; case-sensitive.
  - Random seeds are 12 Crockford-base32 characters from `crypto.getRandomValues`, shown as `XXXX-XXXX-XXXX`.
- **State.**
  - Take the first 16 bytes of `SHA-256(UTF-8("pentomino-seed-v1:" + seedText + ("\u0000" + labelPath if a label is given)))`.
  - Read them as four big-endian uint32 words.
  - An all-zero state (practically impossible) is replaced by `0x9E3779B9, 0x243F6A88, 0xB7E15162, 0x6A09E667`.
- **Derivation.** `rng.derive(label)` appends `/label` to the label path and hashes again. It does not depend on how much of the parent stream was consumed.
- **Test vectors:**

  | Input | Expected |
  |---|---|
  | State (1, 2, 3, 4) | First outputs 11520, 0, 5927040, 70819200 |
  | Seed `demo`, no label | State `0xac19d7fd 0x1f47dc98 0x444f9bb4 0xbbb91ffa`; first outputs 3504561854, 188375601, 1212981724 |
  | `sha256Hex("abc")` | `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad` |

- **Reproduction.** Packs record seeds, levels, options and algo/rng ids (§5.5). "Reproduce" re-runs a request with those inputs.
  - A later batch also needs its session history. With an empty history, the first batch is reproduced.

### 8.7 Phase-5 benchmark protocol

This protocol finalizes every [P5] value.

- **Harness.** Both harnesses run the same engine code:
  - `tools/bench/index.html`: a browser page with the real pool of 4 module workers, served locally;
  - `tools/calibrate.mjs`: Node with a `worker_threads` pool of 4, for fast iteration.
- **Matrix.**
  - Rectangles 6×10, 8×10, 10×10, 12×12, 15×15 and 18×20, plus intermediate areas up to ~500 cells.
  - Heart N = 10, 14, 20; Diamond; Ring.
  - Every candidate level; ≥ 20 seeds per cell; quantity 10; uniqueness `any` and `require`.
- **Measures per (board, level):**
  - set time and New-Puzzles(10) time, as median, p95 and maximum;
  - complete / partial rates;
  - in-band and censored rates; certificate distribution;
  - model rows and nodes; peak memory.
- **Reference platform.** A documented mid-range 4-core laptop with 2 GB available to the browser, current Chrome and Firefox. A mid-range phone is informative only.
- **Pass criteria per offered (board, level):**
  - each action has a median ≤ 60 s and a p95 ≤ 120 s;
  - ≥ 90 % of New-Puzzles runs return all 10 puzzles;
  - peak memory ≤ 2 GB.
  - Levels or boards that fail are not offered.
- **Outputs:**
  - the count table, level windows, `LIMITS` (`maxActive`, `maxSide`) and size policy;
  - weights, bands and caps (possibly per area);
  - the estimator decision, the R ablation and `BUDGETS`.
  - All are recorded in `docs/calibration/` and frozen with model and algo ids.

---

## 9. Hand-off, import and storage

### 9.1 Mechanisms

| Mechanism | Used for | Notes |
|---|---|---|
| `../player/#pack=<code>&i=<k>` | **Play**, Copy link, sharing | Self-contained and portable; a URL fragment is never sent to a server |
| `../player/#lib=<packId>&i=<k>` | Play when the link would exceed 16,000 characters, or encoding fails | Same browser only; labelled "not shareable" |
| JSON file `*.pentomino.json` | Export / Import, archiving, other devices | Durable; supports "Omit solutions" |
| Local library | Recent packs, progress, generator state | `localStorage`, `pentomino:v1:` namespace (§9.6) |

### 9.2 Share code

- **Format.** `"1z." + base64url(deflate-raw(UTF-8(JSON)))`. When `CompressionStream` is missing, `"1j." + base64url(UTF-8(JSON))`.
  - base64url has no padding. `1` is the format major version; `z` / `j` names the codec.
- **Decoding.**
  1. Check the charset and a length ≤ 350,000 characters.
  2. base64url-decode.
  3. For `1z`, read through `DecompressionStream('deflate-raw')` chunk by chunk, aborting once output exceeds 256 KiB.
  4. Decode UTF-8, then run `parsePack`.
- If `DecompressionStream` is missing: "This browser can't open compressed links — use Import file."
- **Measured sizes** (A.6):

  | Pack | Characters |
  |---|---|
  | 1 puzzle, 60 cells | ≈ 0.7–0.9k |
  | 10 puzzles, 60–121 cells | ≈ 1.6–2.5k |
  | 10 puzzles, 360 cells, 40 pieces | ≈ 4.4–4.6k |

- "Copy link" warns above 4,000 characters, because some chat apps truncate long links; it suggests Export file instead.

### 9.3 Play flow

1. The generator builds a pack with the current batch: all accepted puzzles, solutions included.
2. It saves the pack to the library and saves the generator state (best effort).
3. `code ← encodeShareCode(pack)`, and the URL is built as `new URL('../player/', document.baseURI)` plus `#pack=<code>&i=<k>`.
   - If the URL is ≤ 16,000 characters, navigate there in the same tab.
   - Otherwise, if the library save succeeded, use `#lib=<packId>&i=<k>`.
   - Otherwise, offer **Download** and **Open player**.
4. The player:
   1. parses the hash, then decodes and validates the pack;
   2. adds it to the library;
   3. loads saved progress;
   4. renders puzzle k.
5. The hash stays in the URL, so reloads and bookmarks work. Switching puzzles updates `&i=` with `history.replaceState`.

Card "Play" buttons are real `<a href>` links, so middle-click opens a new tab. Back from the player returns to the restored generator state (§10.6).

### 9.4 Import paths

**Player:**
- the URL hash (`#pack` or `#lib`);
- an **Import file** button, or drag-and-drop (≤ 512 KiB);
- a **paste box**: a share code, a full link or raw JSON. `extractCode` finds `#pack=…` or `1[zj]\.[A-Za-z0-9_-]+` in the surrounding text;
- **Recent** (the library);
- **Sample** (`player/samples/sample-pack.json`).

A `piece-set` file shows: "This file has pieces but no puzzle — open it in the generator."

**Generator — "Import set"** accepts a piece set or a pack:
- It uses the `witness`, or any valid puzzle `solution`, as the reference layout.
- Without one, it first runs a bounded `randomTiling`.
- Imported sets that violate `mixed-v1` remain usable. Keys use shape ranks (§6.8).

### 9.5 Verification on import

The `verifyPack` worker task checks each puzzle:
- **With a valid `solution`:** solvable (verified) in O(cells), with no search.
- **Otherwise:** a bounded `solveFirst` with `verifyRows` gives solvable / unsatisfiable (only if exhausted) / not verified.

Play is allowed while checking, and after an inconclusive check. "Not verified" is never shown as "no solution". Ratings and certificates from files stay "claimed" (§6.11, §7.7).

### 9.6 Storage

| Key | Content | Limit |
|---|---|---|
| `pentomino:v1:gen:state` | Generator state: board, rotation, level, options, seed, set + witness, batch, session-history keys | 1 entry |
| `pentomino:v1:lib:index` | `[{ packId, title, createdAt, lastOpened, puzzles, solved }]` | 30 packs, LRU |
| `pentomino:v1:lib:<packId>` | Pack JSON (`packId` = first 16 hex of SHA-256 of the canonical core content) | — |
| `pentomino:v1:progress:<fp>` | Progress record (§5.6) | 300 entries, LRU |
| `pentomino:v1:prefs` | UI preferences: labels, timer, Straighten view | 1 entry |

- Every access is wrapped in try/catch.
- On a quota error:
  1. evict LRU entries of this namespace only;
  2. retry once;
  3. if it still fails, keep working in memory and show "Progress can't be saved in this browser".
- Never read or delete keys outside `pentomino:v1:`. The origin `tdat00.github.io` is shared by all of the owner's Pages projects.
- With two open tabs, the last write wins. Writes are whole-object JSON, so data is never corrupted.

### 9.7 Security and robustness

- Every input passes `validatePack` before use; nothing is stored on failure.
- Text is rendered with `textContent` only. Colors must match `#rrggbb`. There is no `eval`, no `new Function` and no `innerHTML` with data.
- Every page sets a Content-Security-Policy `<meta>` (§12.4).
- Size limits: file ≤ 512 KiB; share code ≤ 350,000 characters; decoded ≤ 256 KiB; `meta` ≤ 4 KiB.

---

## 10. Generator application

### 10.1 Layout

On desktop the generator shows three columns above a puzzles row. Below 900 px the panels stack as steps 1–4 with a sticky action bar.

```text
┌ Pentomino Puzzle Generator ───────────────────────────────────────────── [Open player] ┐
│ ① Board                            │ ② Level                    │ ③ Piece set            │
│ Cols [10] Rows [6]  Preset [Rect ▾]│ ○ Very easy   ○ Easy       │ ▢A ▢B ▢C ▢D ▢E …       │
│ View ⟲45 ⟳45  ☐ Edit unrotated     │ ○ Normal      ● Hard       │ 9 pieces · 4–9 cells   │
│ Trim margins · Undo · Reset        │ ○ Expert      ○ Master     │ Ready for Hard ✓       │
│ ┌────────────────────────────┐     │ (Nightmare+ need a larger  │ [Show solution]        │
│ │ board (click/drag to block)│     │  board)                    │ ◀ previous set ▶       │
│ └────────────────────────────┘     │ Uses 9–10 pieces here      │ [Export set]           │
│ 60 active cells · connected        │ Advanced ▸ seed, unique…   │                        │
│                                    │ [ Generate Piece Set ]     │                        │
├────────────────────────────────────┴────────────────────────────┴────────────────────────┤
│ ④ Puzzles  quantity [5]  level [Hard ▾]  [ New Puzzles ] [Add more]  ▶ Play all ⬇ Export 🔗│
│ ┌card┐ ┌card┐ ┌card┐ …        ▓▓▓▓░░ "Puzzle 3 of 5 — rating candidates" 0:12  [Cancel]  │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

### 10.2 Board panel

- **Size.** Columns (W) and rows (H), each from 3 to `LIMITS.maxSide` [P5]. Users may think in rows × columns (e.g. "6×10" = 6 rows of 10 cells); the inputs are labeled explicitly.
  - If the board has edits, a resize asks for confirmation first.
  - Cells inside the new bounds keep their state; new cells are active.
- **Presets.** As in §6.2, with an N or W/H parameter. A preset also sets the display rotation (Heart and Diamond: 45).
- **Painting.**
  - Pointer-down on a cell toggles it and fixes the paint mode for the gesture: block or unblock, the new state of the first cell.
  - Dragging applies that mode. One gesture is one undo step (50-step undo).
  - Keyboard: arrows move a cell cursor; Space toggles the cell.
  - Painting is disabled while a job runs.
- **View rotation.** ⟲45 sets `rotation += 45` and ⟳45 sets `rotation −= 45` (mod 360).
  - It never invalidates sets or puzzles.
  - "Edit unrotated" shows θ = 0 while painting.
- **Trim margins.** Removes fully blocked outer rows and columns. It is an explicit board edit (D6).
- **Status line.**
  - Shows the active-cell count, connectivity, offered levels, and errors/warnings from `validateForGeneration`, with offending cells highlighted.
  - Boards over 120 cells are marked "experimental" until Phase 5.
- **Stale results.** The first board edit after a set exists asks for confirmation. After it, the set and its puzzles are greyed out: "Board changed — generate a new piece set". Accepted puzzles can still be played or exported until they are replaced.

### 10.3 Level panel

- **Level list.** Shows the offered levels for the board's area (§7.5). Other levels are disabled, with the reason.
- **Piece count.** A live text such as "Uses 9–10 pieces on this board · about 25–40 % pre-placed" [P5].
- **Advanced** (collapsed):
  - seed text, with 🎲 (new random seed) and 🔒 (keep the seed);
  - "Require one solution" (off by default);
  - "Try longer (up to 2 min)";
  - "Omit solutions in exported files".
- **Generate Piece Set** starts the set job (§6.5, §8.2).

### 10.4 Piece-set panel

- **Thumbnails.** Drawn in the board's display rotation, with label and size, sorted by id.
- **Summary.** For example "9 pieces · sizes 4–9 · Ready for Hard ✓". It may also show "Unclued benchmark 58 (not a limit)".
- **Show solution.** Overlays the witness on the board preview.
- **History.** ◀ ▶ step through the last 5 sets.
- **Export set** writes a `piece-set` file that includes the witness.

### 10.5 Puzzles panel

- **Quantity** is 1–10 (default 5). **Level** defaults to the set's level; any offered level is allowed. The set is kept, and puzzles are calibrated for the chosen level.
- **New Puzzles** replaces the visible batch; earlier puzzles stay in the session history, so they are never repeated. **Add more** appends to the batch.
- **Cards** stream in. Each shows:
  - a rotated thumbnail;
  - a title such as "Hard #3";
  - the score ("57", or "≥ 91" when censored) and the level chip;
  - "4 pre-placed";
  - the certificate badge (§6.11).
- **Card actions:** ▶ **Play** (an `<a href>`), 🔗 Copy link, ⬇ Export, 🗑 Remove.
- **Batch actions:** ▶ Play all, ⬇ Export pack, 🔗 Copy pack link.
- **While running:** progress and Cancel. A partial result shows its reason (§6.9).

### 10.6 States and invalidation

```text
editing ──Generate Piece Set──► generating-set ──ready──► set-ready ──New Puzzles──► generating-puzzles ──► puzzles-ready
   ▲            └─ fail / cancel → editing (message)          ▲            └─ partial / cancel: keep accepted ─┘
   └──────────── board edit: set and puzzles become stale ─────┘
```

- A view-rotation change invalidates nothing.
- A level or uniqueness change keeps the set. Its calibration is then marked "for <previous level>", and New Puzzles calibrates anew. Existing cards keep their own labels.
- Only one job runs at a time. Every action except Cancel and navigation is disabled during a job.
- The state is saved to `pentomino:v1:gen:state` (debounced 300 ms) and restored on load.

### 10.7 Notices (`generator/strings.js`)

| Code | Text |
|---|---|
| N-COUNT | "This board uses {kmin}–{kmax} pieces at {level}." |
| N-LEVELS | "Levels above {highest} need a larger board." / "Levels below {lowest} need a smaller board." |
| N-PARTIAL | "Found {n} of {q} different {level} puzzles within the time limit. The piece set was not changed." |
| N-NOSET | "Couldn't create a {level} piece set for this board within the time limit. Try again, choose another level, or change the board." |
| N-UNIQUE | "No puzzle with exactly one solution was found for {level}. Turn off 'Require one solution' or choose another level." |
| N-LARGE | "Large board (experimental): generation may take up to {limit}." |
| N-STALE | "Board changed — generate a new piece set." |
| N-LONGLINK | "This link is long; some apps may cut it. Use Export file to share." |
| N-NOWORKER | "This browser cannot run the generator (module workers are required)." |

---

## 11. Player application

### 11.1 Layout

```text
┌ ☰ Pack ▾ │ Hard #2 · score 57 │ ⏱ 03:12 │ 17 moves │ ↶ ↷ │ ⟲ Reset │ ⤢ Straighten │ ⤓ Import ┐
├──────────────────────── Board (SVG, display rotation θ) ─────────────┬──── Tray (SVG, θ) ──────┤
│      clues hatched + lock icon; ghost shows the drop position         │  A   B   D   F   …       │
├───────────────────────────────────────────────────────────────────────┴─────────────────────────┤
│ Selected: F   [⟲] [⟳] [⇋] [⇵] [Place] [↩ to tray]                          7 pieces left        │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

- Below 900 px: a compact top bar, then the board, the selection toolbar, and the tray (2 rows, horizontal scroll).
- The cell size follows §6.3.
- The Straighten toggle appears only when needed (touch devices with fitted cells < 24 px).

### 11.2 Game state and rules

```ts
type GameState = {
  pack: Pack; index: number;
  placed: ReadonlyMap<string, Pose>;   // user-placed pieces only; clues are separate and immutable
  tray: ReadonlyMap<string, number>;   // orientation t of each unplaced piece
  selected: string | null; preview: Pose | null;
  history: readonly Move[]; future: readonly Move[];   // Move = { piece, before: Pose|null, after: Pose|null, tBefore, tAfter }
  solved: boolean; elapsedMs: number; moves: number;
};
```

**Committing a move** is transactional:
1. Compute the cells with the shared geometry.
2. Check that every cell is inside the grid and active.
3. Check that there is no overlap with clues or other placed pieces; the moving piece's old cells are excluded.
4. Commit atomically, or leave the state unchanged.
5. Clear the redo stack and run win detection.

The board state is never mutated during a drag or preview.

### 11.3 Drag and drop (Pointer Events)

1. **`pointerdown`** on a movable piece (tray or board):
   - record the piece, the grabbed source cell and the start point;
   - call `setPointerCapture`.
2. **Drag start** after 6 px of movement (mouse or pen) or 10 px (touch).
   - The piece moves to a full-window drag layer, drawn with rotation θ at board scale.
   - A piece lifted from the board leaves its cells empty for the duration of the drag.
3. **`pointermove`** (throttled with `requestAnimationFrame`):
   - map the pointer to board coordinates (§6.3), with the touch lift;
   - snap the ghost to `origin = floor(local) − g`;
   - draw the ghost outline green if `canPlace`, red otherwise. The piece itself follows the pointer smoothly.
4. **Drop:**
   - on a valid ghost: place (from the tray) or move (from the board), as one undo step;
   - over the tray: return the piece to the tray;
   - otherwise: animate back.
   `pointercancel`, Esc, a resize or an orientation change revert the drag.
5. **During a drag:**
   - the mouse wheel rotates (sign of `deltaY`);
   - the rotate/flip keys work (§11.6);
   - the grabbed cell stays under the pointer.
6. **One active manipulation pointer.** Further pointers are ignored while a piece is being manipulated.

### 11.4 Select-then-tap placement

1. Tapping a piece selects it and highlights its **handle cell**: the grabbed cell, or by default the occupied cell nearest the piece centroid (ties broken by (y, x)).
2. Tapping a board cell shows the ghost with the handle on that cell.
3. A second tap on the same cell, the **Place** button or Enter commits. Tapping another cell moves the ghost. Esc, or tapping the tray, cancels.
4. Tapping the already-selected tray piece rotates it ⟳.

### 11.5 Rotate and flip

- The toolbar has ⟲ ⟳ ⇋ ⇵ in screen space (§6.3), plus ↩ to return a piece to the tray.
- **Tray pieces** re-orient in place.
- **Placed pieces** rotate or flip about their handle cell. If the result is invalid, the player tries one-cell grid kicks in the order (0, −1), (−1, 0), (1, 0), (0, 1).
  - If none fits, the piece does not change: a 200 ms shake plus "No room to rotate here".
  - A successful re-orientation is one undo step.

### 11.6 Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | Move focus over tray pieces, then placed movable pieces |
| Enter / Space | Pick up the focused piece (a ghost appears), or drop it if valid |
| Arrow keys (Shift = 3 cells) | Move the ghost; on rotated boards, by the mapping of §6.3 |
| E or R / Q | Rotate ⟳ / ⟲ on screen |
| F / V | Mirror ⇋ / ⇵ on screen |
| Delete / Backspace | Return the selected placed piece to the tray |
| Esc | Cancel the pick-up or close a dialog |
| Ctrl/⌘+Z; Ctrl/⌘+Shift+Z or Ctrl+Y | Undo; redo |
| ? | Show shortcuts |

Shortcuts are ignored while focus is in a text field or a dialog. Visible buttons duplicate every action.

### 11.7 Touch

- `touch-action: none` applies only to the board and tray surfaces, so the page still scrolls elsewhere.
- Hit targets are ≥ 44 × 44 CSS px.
- The lift is 1.25 cells, measured in screen space.
- No long-press gestures.
- Optional `navigator.vibrate(10)` on a successful placement.
- The Straighten view toggle follows §6.3.

### 11.8 Validation and winning

- **`canPlace`.** Every cell must be inside the grid and active, and must not overlap clues or other placed pieces. The moving piece itself is excluded.
- **Win.** After each committed move, the puzzle is solved when every piece is placed (clues plus user pieces) and the occupied count equals the active count.
  - **Any** valid complete placement wins. The player never compares with the stored solution.
- **On solve:**
  1. stop the timer and save the progress as solved;
  2. show a dialog with time, moves, level and score, and the buttons *Next puzzle*, *Replay* and *Back to generator*;
  3. play a short celebration, unless `prefers-reduced-motion` is set.

### 11.9 Rendering and colors

- **Board.**
  - Active cells: light fill with thin grid lines.
  - Holes: dark and hatched.
  - Exterior cells: not drawn (§6.3).
- **Pieces.**
  - One SVG `<path>` per outline (`outlineLoops`, even-odd fill for holes), filled with the piece color.
  - A darker stroke (35 % black mix) and faint inner cell seams.
  - An upright letter label on the cell nearest the centroid, colored with `textColorFor`. Labels are on by default and can be toggled.
- **Clues.** A diagonal-hatch overlay and a lock icon. Clues are neither focusable nor draggable.
- **Palette** (`BASE_COLORS`, Trubetskoy's 20 distinct colors, used in id order):
  `#e6194b #3cb44b #ffe119 #4363d8 #f58231 #911eb4 #42d4f4 #f032e6 #bfef45 #fabed4 #469990 #dcbeff #9a6324 #fffac8 #800000 #aaffc3 #808000 #ffd8b1 #000075 #a9a9a9`.
  - For K > 20 [P5], `colorFor(i)` generates colors: hue = (i · 137.508°) mod 360, saturation 65 %, lightness alternating between 45 % and 65 %.
  - Letter labels guarantee identity even when two colors look alike.

### 11.10 Undo, reset, timer and persistence

- **History.** The action history holds up to 500 entries. Reset asks for confirmation and is itself undoable.
- **Timer.** Optional and shown by default. It starts at the first move and pauses while the tab is hidden.
- **Saving.** Progress is saved by fingerprint (§5.6), debounced 250 ms after each committed action.
- **Reopening.** A puzzle with saved progress offers *Continue* (default) or *Restart*.
- **Storage failures** never block play.

### 11.11 Accessibility (target: WCAG 2.2 AA)

- The board has `role="application"` and instructions linked through `aria-describedby`.
- Pieces are focusable, with labels such as "Piece F, 5 cells, in tray" or "Piece F, on board at row 3, column 5".
- An `aria-live="polite"` region announces placements, rejection reasons and the win.
- Focus rings are always visible, and UI contrast is ≥ 4.5:1. Letters and hatching remove any reliance on color.
- Reduced motion is respected, and the whole game can be completed with the keyboard alone.

### 11.12 Pack navigation and library

- The **☰ Pack** menu lists the pack's puzzles with level, score and status (new / in progress / solved ✓ / revealed), plus previous/next buttons.
- The Import screen lists the library (recent packs). Entries can be deleted or exported again.
- With no hash and an empty library, the player opens the Import screen with the Sample pack.

### 11.13 Post-MVP: hints and show solution

Hints make only proven statements (D27). There are three outcomes:
- **Proven compatible placement.** A solution containing all current placements was found; show one more placement from it.
- **Proven repairing removal.** Removing one specific placed piece makes the position solvable again. Every placed piece is tested, each search exhausted or successful.
- Otherwise: "No repair identified within this check." Never blame a piece without proof.

**Show solution** uses the stored `solution` if it agrees with the current placements; otherwise it runs a solver. It marks the puzzle "revealed", not "solved".

---

## 12. Deployment (GitHub Pages)

### 12.1 Configuration

- Repository `tdat00/pentomino`: Settings → Pages → Source **GitHub Actions**. The site URL is `https://tdat00.github.io/pentomino/`.
- **Published:** `index.html`, `redirect.js`, `core/` (engine, workers, browser), `generator/`, `player/`.
- **Not published:** `docs/`, `tests/`, `tools/`, `.github/`.
- `.nojekyll` stays in the repository only for the branch-deploy fallback (§12.5).
- Pages serves `/pentomino/generator` as a 301 redirect to `/pentomino/generator/`, so relative URLs resolve correctly.

### 12.2 Root redirect

`index.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'">
  <meta http-equiv="refresh" content="0; url=./generator/">
  <title>Pentomino Puzzle Studio</title>
  <script type="module" src="./redirect.js"></script>
</head>
<body><p><a href="./generator/">Open the puzzle generator</a></p></body>
</html>
```

`redirect.js` (an external module, so the CSP stays free of `unsafe-inline`):

```js
const target = new URL('./generator/', import.meta.url);
target.search = location.search;
target.hash = location.hash;
location.replace(target);
```

The meta refresh is the fallback when JavaScript is off; the link is the last resort.

### 12.3 Path rules (MUST)

- Use only relative URLs (`./`, `../`). Never use root-absolute URLs such as `/core/…`, because the site lives under `/pentomino/`.
- Resolve workers and assets with `new URL('./x.js', import.meta.url)`.
- Cross-app links are `../player/` and `../generator/`. Absolute "Copy link" URLs are computed at runtime from `document.baseURI`.

### 12.4 Content Security Policy

Every app page carries:

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; worker-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'">
```

- No inline scripts or `style="…"` attributes in markup. Set styles through the CSSOM (`el.style.x = …`) or classes.
- SVG presentation attributes such as `transform` and `fill` are allowed.

### 12.5 Workflow: `.github/workflows/pages.yml`

```yaml
name: test-and-deploy
on:
  push: { branches: [main] }
  workflow_dispatch:
permissions: { contents: read, pages: write, id-token: write }
concurrency: { group: pages, cancel-in-progress: false }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: node --test "tests/**/*.test.js"
      - name: Assemble site
        run: |
          mkdir -p _site
          cp index.html redirect.js _site/
          cp -r core generator player _site/
          if [ -f tools/stamp-version.mjs ]; then node tools/stamp-version.mjs _site "${GITHUB_SHA::8}"; fi
          if [ -f tools/check-site.mjs ]; then node tools/check-site.mjs _site; fi
      - uses: actions/upload-pages-artifact@v4   # or the latest major; v4+ omits dotfiles (Actions deploys skip Jekyll anyway)
        with: { path: _site }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages, url: "${{ steps.deployment.outputs.page_url }}" }
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- The test command uses a quoted glob, which Node ≥ 21 expands itself. A bare directory argument fails on Node 24.
- **Fallback without Actions:** "Deploy from branch: main / (root)" also works, since all paths are relative. Keep `.nojekyll` at the root for this mode. It publishes `docs/` too, which is harmless.

### 12.6 Caching and site checks

- GitHub Pages sends `Cache-Control: max-age=600`, so for up to 10 minutes after a deploy a browser could mix old and new modules.
- **`tools/stamp-version.mjs`** rewrites **every** relative specifier in the `_site` copy only:
  - HTML `src` and `href`;
  - static `import` / `export … from`, dynamic `import()`;
  - `new URL(…, import.meta.url)`, including worker URLs.
  
  Each gets `?v=<sha8>`. All specifiers are stamped consistently, because a module imported both with and without `?v=` would be instantiated twice. Source files stay clean for development.
- **`tools/check-site.mjs`** resolves every relative reference in `_site` and fails on missing files or root-absolute URLs. This is the `/pentomino/`-prefix smoke test without a browser.
- No service worker in v1.

### 12.7 Local development

- From the repository root, run `python -m http.server 8080` and open `http://localhost:8080/`.
- To reproduce the `/pentomino/` prefix, serve the parent folder and open `/pentomino/`.
- `file://` is not supported, because modules and workers need HTTP.

---

## 13. Testing

### 13.1 Conventions

- **Runner.** Node ≥ 22 with `node:test` and `node:assert/strict`, and zero dependencies. Run `node --test "tests/**/*.test.js"`.
- **Determinism.** Correctness tests rely on deterministic budgets and fixed seeds. They never assert wall-clock times.
- **Speed tags.** Slow golden tests include `(slow)` in their names and run in CI. A quick local run excludes them with `node --test --test-skip-pattern=slow "tests/**/*.test.js"`.
- **Fixtures** live in `tests/fixtures/`. They include the §5.2 pack and the recorded generator seeds with their expected outputs. A "success" fixture MUST fail the test if every attempt fails.

### 13.2 Suites

| Suite | Key cases |
|---|---|
| `hash` | SHA-256 vectors for `""`, `"abc"` and a multi-block input. `canonicalJson` sorts keys. |
| `rng` | xoshiro128** vectors and seed vectors (§8.6). NFC: composed and decomposed "é" give the same state. Trimming and length limits. `derive` independence. `int(n)` range. |
| `geometry` | Transform table. Composition identities: rotateCW⁴ = id; mirror² = id. Orientation counts. Canonical-key vectors and invariance under all 8 t. A000105 for n = 1..8. Hole-free counts 107 and 363 for n = 7, 8 (1248 and 4460 for n = 9, 10 are slow). `hasHole`. `outlineLoops` for the O, L and ring shapes. |
| `board` | Rows round-trip. Regions. Exterior vs. hole classification. Symmetry counts: rectangle 4, square 8, Heart 2 — still 2 with blocked margins. Preset cell counts: Heart N = 10 → 75 (73 with round lobes); Diamond 64; Ring 60. Validation errors. |
| `view` | Screen flips and rotations match a geometric reference for 8 angles × 8 orientations (0 mismatches). Arrow mapping is exact at multiples of 90° and follows the tie rule at 45°. Extents: 6×10 at 45° → 11.31 × 11.31; Heart N = 10 → 14.14 × 10.61. Heart notch on top at 45. Board → screen → board round-trip. Fit clamps. |
| `dlx` | Knuth's small example. Limits unwind and restore (two solves give identical results). `branchTrials` excludes forced rows. Seeded solutions are valid covers. |
| `tiling` | Golden pentomino counts: 3×20 → 8 (fast); 4×15, 5×12, 6×10 (slow). Blocked cells and clues. Certificate statuses, including a cutoff → `not-proved`. Symmetric pieces are not double-counted; mirrored raw solutions count as distinct. A small brute-force oracle agrees on random tiny instances. LNS returns valid, different layouts. |
| `carve` | 50 seeds × (6×10, 8×10, Heart-75, Ring-60): exact partition, distinct keys, sizes ≥ 3, connected, hole-free, small-piece cap respected. The same seed gives the same set. |
| `policy` | Count-table anchors and interpolation; levels not offered return null. `minAreaForCount` values (§6.4). `planSizes` invariants. |
| `keys` | Layout keys are invariant under board symmetries, so reflected layouts are duplicates. A clue-only change is not a new layout. Distance values. `progressFingerprint` differs for reflected clues (A.9 counterexample). |
| `difficulty` | Worked examples (§7.2). Censoring and the acceptance rule. Permuting ids, colors or piece order leaves the rating unchanged. `levelForScore` boundaries, including Hell-n. |
| `clues` | Always 1 ≤ G ≤ K−2. `require` mode returns only exhaustively proven unique puzzles. No in-band subset → failure, never a mislabel. |
| `generate` | Fold determinism: identical output for pool sizes 1 and 4 and shuffled completion orders (simulated). New layout AND clue keys. Partial status and the prefix property. The calibration puzzle is reused as #1. |
| `pack` | The §5.2 fixture validates and round-trips. Rejects: wrong format; version 0, −1, 2 or "1"; unknown fields; bad rows; overlapping clues; an invalid solution; oversized input. Accepts the classic 12 pentominoes on 6×10 and a piece with a hole (warnings only). `omitSolutions` works. |
| `sharecode` | `1z` / `1j` round-trips (Node ≥ 22 has `CompressionStream`). A decompression bomb is aborted at 256 KiB. `extractCode` finds codes in surrounding text. |
| `game` | place / move / remove / orient / undo / redo / reset. `canPlace` reasons. A moving piece's old cells are excluded. A non-witness tiling wins. Clues are immutable. Restoring progress drops invalid moves. |

### 13.3 Browser acceptance checklist

Run on desktop Chromium, Firefox and Safari, on Android Chrome and on iOS Safari. Optional dev-only Playwright smoke tests can come later.

1. `/pentomino/` lands on the generator. Shared modules and workers load under the prefix.
2. Default board → piece set → 5 puzzles → Play: the player shows the same pieces and clues.
3. The Heart preset shows as a heart at 45° in both apps.
4. Drag, tap-place, rotate, flip and the keyboard all work at 0°, 45°, 90° and 315°, including on scrolled and zoomed pages.
5. Export a file, then import it in another browser profile. Paste a link.
6. Complete a puzzle with the keyboard only. Screen-reader smoke test.
7. An invalid drop and `pointercancel` leave the previous state unchanged.
8. Cancel responds during a long job, and accepted puzzles remain.
9. With storage disabled, an oversized link falls back to `#lib` or a file.
10. A valid tiling different from the stored solution wins.
11. No score, uniqueness or solvability claim appears after an inconclusive check.

### 13.4 Performance and calibration

- Performance and calibration are measured by the Phase-5 harness (§8.7) and `tools/calibrate.mjs`, not by CI.
- After Phase 5, a nightly or manual job MAY re-run a small benchmark subset to catch regressions.

---

## 14. Risks and edge cases

### 14.1 Risks

L = likelihood, I = impact.

| Risk | L | I | Mitigation |
|---|---|---|---|
| The provisional formula mis-rates large boards (A.8) | H | H | Phase-5 recalibration (§7.5); boards > 120 cells marked experimental |
| Big boards exceed the 2-minute limit because rating and layout search are expensive | H | H | Phase-5 benchmark sets the maximum size and per-area caps; deterministic budgets; partial results; parallel candidates |
| The score disagrees with human perception | M | M | "Estimate" wording; calibration; versioned model; later playtests |
| Heavy-tailed search times | M | M | Caps, Luby restarts, LNS, witness reuse |
| Display-only rotation confuses users (pieces still turn by 90°) | M | L | WYSIWYG tray, screen-space controls, axis hints, Straighten view |
| Cells too small at 45° on phones | M | M | Fit rule, zoom, Straighten view |
| Long links get truncated | L | L | 16k limit, warning, file export, `#lib` fallback |
| Shared-origin storage and quota | L | L | Namespace, LRU, try/catch |
| Mixed old/new modules after a deploy | M | L | Whole-graph `?v=` stamping; no service worker |
| Seeds stop reproducing after algorithm changes | M | L | `algo`, `rng` and model ids recorded in packs |
| Malicious or corrupt imports | L | M | Staged validation, size limits, `textContent`, CSP |
| Browser lacks module workers or (De)CompressionStream | L | M | Feature detection, clear messages, `1j` codes, file import |

### 14.2 Edge cases

1. A board with < 12 active cells, a disconnected board, or one above the size limits: generation is disabled and the offending cells are highlighted.
2. No level is offered for the board's area: say so and suggest a size.
3. Carving fails within the time limit: show N-NOSET. Never say "impossible".
4. Tight boards with few distinct layouts: return a partial batch. Never pad it with clue-only variants.
5. Symmetric boards: duplicates under symmetry are rejected by key. Uniqueness counts raw coordinates.
6. Symmetric pieces: their rows are deduplicated and `canonicalT` is stored.
7. `require` at high levels may fail: show N-UNIQUE with the partial result.
8. Editing the board after a set exists marks the set stale. Changing the level recalibrates on New Puzzles.
9. Cancelling a batch keeps the accepted puzzles.
10. Imports:
    - without a solution → verify in a worker;
    - proven unsatisfiable → an error state;
    - inconclusive → playable as "not verified".
11. Non-standard imported sets (duplicate shapes, pieces < 3 cells, holes) are playable with a notice. A pack with zero clues is playable too; the generator never produces one.
12. An unknown version or rule set: show "unsupported" and store nothing.
13. Progress saved for a different puzzle with the same id is not applied, because the fingerprints differ.
14. No room to rotate a placed piece: shake and leave it unchanged. A drop partly outside or overlapping reverts.
15. A resize or orientation change during a drag cancels the drag.
16. Two tabs: the last write wins. Storage unavailable: play continues in memory and export is offered.
17. 40+ pieces: generated colors plus labels, and the tray scrolls.
18. Holes are drawn hatched; exterior cells are not drawn, so a heart reads as a heart.

---

## 15. Implementation plan

Implementation phases are numbered **I0–I8** so they are not confused with design Phase 5.

| Phase | Tasks | Acceptance criteria |
|---|---|---|
| **I0 Foundation** | Skeleton folders; `index.html` + `redirect.js`; `package.json`; `pages.yml` with guarded steps; placeholder generator and player pages importing `core/engine/version.js`; a simple `tools/check-site.mjs` | `/pentomino/` redirects to the generator on Pages; both apps load `core` relatively; CI green |
| **I1 Core math** | `hash`, `rng`, `geometry`, `board`, `view`, `palette` | §13.2 suites pass: vectors, A000105, rotation algebra, presets |
| **I2 Solver** | `dlx`; `tiling` (model, `solveFirst`, `countSolutions`, `randomTiling`, `lnsStep`/`lnsWalk`, `isValidLayout`); `keys` | Golden counts; oracle agreement; certificate statuses; key tests |
| **I3 Generation engine** | `policy` and `levels` with [P5] placeholders; `carve`, `difficulty`, `clues`, `generate` (`setAttempt`, `puzzleCandidate`, fold); `tools/generate.mjs` CLI; `tools/calibrate.mjs` (Node pool of 4) | Fixed seeds give identical packs; fold determinism; CLI output passes `validatePack`; the calibration tool runs (this enables Phase 5 on the real engine) |
| **I4 Format and hand-off** | `pack`, `sharecode`, `storage`, `handoff` | Round-trips, rejection cases, decompression-bomb guard, fixture |
| **I5 Generator app** | `engine.worker` and `worker-pool` (pool of 4, cancel, watchdog, revision checks); `svg-board` with rotation; board editor (paint, presets, view rotation, edit-unrotated, trim, undo); level, set and puzzle panels; progress; notices; persistence; Play and Export; `tools/bench/` page | Board → set → 10 puzzles → Play works for 6×10 and Heart; Cancel < 100 ms; reload restores state; no main-thread long tasks |
| **I6 Player app** | Import view (hash, file, paste, recent, sample); `verifyPack`; `game` reducer; board and tray rendering with θ; pointer drag/tap; keyboard; screen-space rotate/flip; undo/redo/reset; win dialog; progress; pack navigation; accessibility | §13.3 items 2–11; alternative tilings win; rotated boards fully playable |
| **I7 Release** | Whole-graph `stamp-version.mjs`; `check-site` in CI; CSP review; browser matrix; replace [P5] values with the Phase-5 outputs and re-verify them on the real engine; README and help | Deployed site passes §13.3; Phase-5 pass criteria re-confirmed (§8.7); no critical axe findings |
| **I8 Post-MVP** | Proven hints and Show solution (§11.13); optional Playwright smoke tests; playtest-driven `difficulty-v2`; optional cooperative scheduling if measurements justify it | Hints never state unproved facts (A.9 regression test) |

**Dependencies and parallel tracks:**
- I1 → I2 → I3 is the engine track.
- I4 needs only I1.
- The I5 UI shell (editor, rendering) can start after I1 using mocked results.
- The I6 shell can start after I1 + I4.
- The **Phase-5 gate:** every [P5] value MUST be replaced by calibrated data before I7 ships. If Phase 5 runs before I3 exists, it uses a prototype, and I7 re-verifies the numbers on the real engine.

---

## Appendix A. Evidence summary

All measurements were taken on the architects' throw-away prototypes (Node 24, single thread, Windows) unless stated otherwise. They are evidence for decisions, not browser guarantees.

**A.1 Solver correctness and speed**
- Classic 12-pentomino raw solution counts were reproduced: 6×10 → 9,356, 5×12 → 4,040, 4×15 → 1,472, 3×20 → 8.
- Throughput: ≈ 54M link updates/s, i.e. 40k–160k row trials/s depending on row density.
- On 360-cell, 41-piece models: ≈ 6–7k row trials/s.

**A.2 Carving**

| Board | Result |
|---|---|
| 6×10 (K 10–13), 5×12, 8×10 (17), 9×9 (17), 10×10 (18), 12×12 (18), heart-67, 8×8 with holes | 100 % success; mean or median times 1–435 ms; worst 3.2 s |
| 81 cells, 18 pieces (exactly the minimum area) | 19/20 success; 4.7 s average, 11 s maximum |
| 360 cells (Phase 4) | 11 ms for K = 17 (20–23-cell pieces); 59 ms for K = 41 |

**A.3 First-solution search from scratch** (18 pieces; 5 random runs per board, each capped at 300k nodes; 15×12 runs allowed up to 2M nodes)

| Board | Result |
|---|---|
| 10×10 | 5/5 runs found a tiling; 0.2 s in total |
| 11×11 | 4/5 runs; 14 s in total |
| 12×11 | 1/5 runs; 50 s in total |
| 12×12 | 0/5 runs; 76 s in total |
| 15×12 (average piece 10 cells) | One run found a tiling after 850k nodes (129 s); another reached 2M nodes without one (321 s) |

Global search grows steeply with average piece size. Witness reuse and LNS avoid it.

**A.4 Layout diversity**
- One seeded enumeration produced layouts differing by only 2 pieces (6×10, K = 12). Independent restarts gave a minimum difference of 9.
- LNS: 10 layouts at distance ≥ max(3, ⌈K/3⌉) took 0.03 s (6×10), 0.1 s (8×10), 1.3 s (10×10, K = 17), 8 s (heart-99, K = 16) and 40 s (11×11, K = 18).
- Global re-tiling took 37 s (10×10) and 147 s (11×11).

**A.5 Rating cost and noise**
- The additive formula with an uncapped canonical traversal on 11×11, K = 18: 5.2 s at U = 15, 26.9 s at U = 16, 46.6 s at U = 17 (B = 1.43M).
- Re-rating one puzzle under 6 search orders spread the score by a median of 5–6 points (additive formula) vs. 3–6 (A1's 0–100 formula).
- The two candidate formulas classified 26 of 27 sample groups at the same level or one level apart.

**A.6 Share-code sizes** (deflate-raw + base64url)

| Pack | Share code |
|---|---|
| 1 puzzle, 60 cells | ≈ 0.7–0.9k characters |
| 10 puzzles, 60–121 cells | ≈ 1.6–2.5k |
| 10 puzzles, 360 cells, 40–42 pieces | ≈ 4.4–4.6k |

Uncompressed base64 would be about 12–16k characters for a 10-puzzle pack of 60–121 cells.

**A.7 Rotation algebra** (Phase 4, counter-clockwise convention)
- The screen-space ⇋ / ⇵ / ⟳ formulas of §6.3 gave 0 mismatches against geometric rotation over 8 angles × 8 orientations.
- The arrow mapping's worst angular error is 45°, and only at the odd-45° ties.
- Heart N = 10 at 45: the blocked corner points up, and the extent is 14.14 × 10.61 cells.

**A.8 Provisional formula on addendum-scale boards** (Phase 4)
- Caps: B ≤ 50,000 branch trials and 500,000 row trials.
- Each case used 3 random clue subsets, with G taken from the §7.4 clue shares.

| Board | K (level intent) | G | Scores | Observation |
|---|---|---|---|---|
| 6×10 | 8 (easy) | 5 | 17, 18, 21 | Very easy / Easy boundary |
| 6×10 | 12 (master) | 2 | 64, 67, 69 | Random clues reach Hard/Expert only; Master needs searched clues |
| 18×20 | 17 (hard), 20–23-cell pieces | 5 | 84, 85, 88 | Master band; B ≤ 3, so R and H dominate |
| 18×20 | 41 (hell-1) | 3 | ≥ 188 ×3 | Censored; 68–88 s per capped traversal |

**A.9 Counterexamples behind decisions**
- **D15.** A 6×10 set with an unclued score of 52 produced 7/10 Master puzzles (≥ 55, A1's old formula). The unclued score is not a ceiling.
- **D26.** Reflecting a puzzle's clues gives the same symmetry-normalized key. Yet the original legal placement of fixture piece I overlaps the reflected clue A at (8, 0) and (9, 0). Normalized ids would corrupt saved progress.
- **D27.** In a fixture state, the player's first move (B) was wrong and the six later moves were correct. Removing any one of the six later pieces does not restore solvability; only removing B does. The old fallback would have blamed the most recent piece, which was correctly placed.
- **D16, G ≥ 1.** An 11×11 Hell-2 batch of zero-clue puzzles produced 10 identical puzzles.

---

## Appendix B. References

1. D. E. Knuth, "Dancing Links", arXiv:cs/0011047 (2000) — Algorithm X, DLX, piece columns for polyomino packing.
2. OEIS A000105 (free polyominoes) and A001419 (polyominoes with holes); E. W. Weisstein, "Polyomino", MathWorld.
3. C. P. Gomes, B. Selman, H. Kautz, "Boosting Combinatorial Search Through Randomization", AAAI-98 — heavy tails and restarts.
4. M. Luby, A. Sinclair, D. Zuckerman, "Optimal speedup of Las Vegas algorithms", *Information Processing Letters* 47 (1993) — the Luby restart sequence.
5. D. Blackman, S. Vigna, xoshiro/xoroshiro generators, <https://prng.di.unimi.it/> — xoshiro128** reference.
6. NIST FIPS 180-4, *Secure Hash Standard* — SHA-256.
7. WHATWG HTML Standard, "Timers" — nested-timer clamping to ≥ 4 ms; MDN "Using Web Workers".
8. MDN, `CompressionStream` / `DecompressionStream` (`deflate-raw`).
9. GitHub Docs, "Using custom workflows with GitHub Pages"; the `actions/upload-pages-artifact` v4 release notes (dotfiles excluded).
10. S. Trubetskoy, "List of 20 Simple, Distinct Colors", <https://sashamaps.net/docs/resources/20-colors/>.
11. *Puzzlia* (App Store) — shaped-board block puzzles such as Heart; SmartGames *IQ Puzzler Pro* (pre-placed challenges); Gigamic *Katamino* (difficulty by number of pieces).
12. Pentomino rectangle solution counts (6×10: 2,339; 5×12: 1,010; 4×15: 368; 3×20: 2 up to symmetry), e.g. Wikipedia "Pentomino".
