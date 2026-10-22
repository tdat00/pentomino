# Pentomino Puzzle Studio — Final Detailed Design

**Phase 7 · 22 October 2026 · Design version 2 (final) · Phase-9 amendment: batch seeds and small clarifications (D41, D42)**

This is the single developer contract for the project. It is `4-design-detail.md` (the Phase-4 unified design) updated with the outcome of the requirement-addendum studies (Phase 5) and their cross-reviews (Phase 6). The companion document `7-design-brief.md` describes the user experience.

This document is self-contained: implement from it alone. Earlier design files are history; where they disagree with this one, this one wins.

---

## 0. How to read this document

- **MUST / SHOULD / MAY** are normative.
- There are no provisional values left. Every number is final for release 1, with two kinds of exceptions:
  - **[BQ]** marks a limit that is designed and implemented now but **enabled only after a browser-qualification test passes** during implementation. The tests and their acceptance criteria are in §8.7. Until a test passes, the stated fallback value applies.
  - **[PT]** marks a label or threshold that later human playtests MAY refine through a new, versioned model (§7.8). It never blocks release.
  - The complete list:

    | Item | Fallback shipped | Validation (acceptance criteria) |
    |---|---|---|
    | Release gate at the default limits | — | BQ-0 (§8.7) must pass before release |
    | Desktop board limit 576 cells | 484 cells | BQ-1 (§8.7) |
    | Large-board switch (577–676 cells) without the "experimental" label | Opt-in, labelled experimental | BQ-2 (§8.7) |
    | Phone board limit 484 cells | 360 cells | BQ-3 (§8.7) |
    | Browser planning factor | 5 s + 4 × Node | Replaced by BQ reports |
    | Level labels vs. human effort; scoring of forced placements; perceived effect of macro carving | `difficulty-v2`, `gen-v2` as specified | Playtests [PT] (§7.8) |

- All tunable values live as data in `core/engine/policy.js` (limits, piece counts, size policy, budgets, score weights and caps) or `core/engine/levels.js` (bands, clue shares, availability). The generated-color and pattern rules live in `palette.js`. Changing a value that affects results requires a new model, policy or algorithm id (§5.4).
- **Board-size notation.** A × B means columns × rows (W × H) unless stated otherwise. For rectangles, orientation never affects policy, scores or test matrices. The UI labels Columns and Rows explicitly (§10.2).
- **Decision-record sources** (§2):

  | Code | Source |
  |---|---|
  | A1 / A2 | Architect-1 / architect-2 Phase-1 designs |
  | P3 | Phase-3 agreement |
  | P5-A1 / P5-A2 | `5-addendum-study-architect-1.md` / `5-addendum-study-architect-2.md` |
  | P6-A1 / P6-A2 | `6-review-of-architect-2.md` (by architect-1) / `6-review-of-architect-1.md` (by architect-2) |
  | Orch | Orchestrator settlement after Phase 6 |
  | P7 | Computed for this document from the settled formulas |
  | P9-A1 | `9-review-of-architect-2-tasks.md` (task-pack review by architect-1) |
  | User | End-user clarification |

**Glossary**

| Term | Meaning |
|---|---|
| Board | An axis-aligned grid of W × H cells. Each cell is *active* (playable) or *blocked*. |
| Area A | The number of active cells. Display rotation never changes it. |
| Exterior / hole | A blocked cell that is 4-connected to the outside of the grid is *exterior*; any other blocked cell is a *hole*. Used for rendering only. |
| Piece | An edge-connected set of cells. It may be turned by 90° steps and mirrored, giving 8 orientations (the D4 group). |
| Piece set | The K pieces generated for one board. Together they cover the board exactly. μ = A / K is the mean piece size. |
| Macro region | A compact part of the board that the generator carves into 2–6 pieces (§6.5). Invisible to players; never a game rule. |
| Layout (tiling) | One placement of every piece that covers every active cell exactly once. |
| Witness | A known layout stored with a set or puzzle (the generator's reference solution). |
| Clue | A pre-placed, locked piece of a puzzle. The UI calls it a "pre-placed piece". G = number of clues. |
| Puzzle | Board + piece set + clues. The player places the remaining U = K − G pieces. |
| Pack | A JSON document holding one board, one piece set and 0–100 puzzles. |
| Pose | `{piece, x, y, turn, mirrored}`: a piece's orientation and position. |
| Presentation rotation | A display-only angle of the whole board, in multiples of 45°, counter-clockwise. |
| Score / level | The output of the single difficulty formula (`difficulty-v2`), and the band that score falls in. |
| Saturated rating | A rating whose search-effort term hit its cap; the score is still exact by definition (§7.3). |
| Certificate | Proven solution-count status: unique / multiple / not proved / unsatisfiable; computed lazily (§6.11). |

---

## 1. Overview and requirements traceability

### 1.1 Summary

Two static web apps share one DOM-free engine in `core/`.

**Generator** (`/pentomino/generator/`). The user:
1. edits a board: size, blocked cells and display rotation;
2. picks a level among those offered for the board's area;
3. generates a random piece set that provably tiles the board and supports the level;
4. generates 1–10 puzzles from that set, each with a genuinely different arrangement and some pieces pre-placed.

One difficulty score rates everything. Puzzles go to the player through a self-contained link or a file.

**Player** (`/pentomino/player/`). The user imports a pack from a link, file, pasted text or the local library. They drag, rotate and flip pieces onto the board, including boards displayed at 45°. Any valid complete tiling wins.

**Runtime.** Heavy computation runs in a pool of up to 4 Web Workers within 2 GB. There is no server, no runtime dependency and no build step.

**Limits.**
- Boards have 30 to 576 active cells and sides ≤ 32. Until browser qualification passes, release 1 enables 484 cells (360 on phones) [BQ]. An opt-in desktop switch allows up to 676 cells, labelled experimental until qualified.
- Each action (Generate Piece Set, New Puzzles) targets 60 s and always answers within 120 s, keeping every accepted result.

### 1.2 Traceability

Requirements come from `docs/local/prompt.txt`, including its addendum and the rotation clarification.

| # | Requirement | Design decision | Section |
|---|---|---|---|
| T1 | Two independent static sites `generator/` and `player/`; shared code in `core/` | Native ES modules, relative imports, no build step | 3 |
| T2 | Design and task documents in `docs/` | `docs/init-design/`, `docs/calibration/`, `docs/tasks/` | 3.1 |
| T3 | Deploy to `tdat00.github.io/pentomino`; the home page redirects to `/generator`; "Play" opens the player | Pages via GitHub Actions; `index.html` + `redirect.js`; Play link `../player/#pack=…` | 9, 12 |
| R1 | Pentomino / Puzzlia gameplay | Free-polyomino exact-cover rules `free-polyomino-v1` | 5.2, 6.6 |
| R2 | Levels very easy … nightmare, hell-1, hell-2, … | Geometric level ladder; Hell-n continues indefinitely | 7.4 |
| R3 | One shared difficulty score, used to generate sets and puzzles per level | `difficulty-v2`. A set is accepted only with an in-band calibration puzzle; puzzles are accepted only in band. | 6.5, 6.10, 7 |
| R4 | User enters the board size (e.g. 5×12, 6×10) | W × H inputs and presets | 6.2, 10.2 |
| R5 | Block cells; rotate the board 45°/90° (e.g. a Puzzlia-style heart). **Clarified: display only.** | Blocked-cell painting. `presentation.rotation` in 45° steps, counter-clockwise, ignored by all logic. Heart preset = square with the top-right quarter blocked, shown at 45°. | 6.2, 6.3 |
| R6 | "Generate Piece Set": random shapes and sizes, each piece ≥ 3 cells | Macro or flat carving; sizes ≥ 3 | 6.4, 6.5 |
| R7 | Not too many small or too few large pieces. The original 10–18 rule is **superseded by the addendum**. | Size window around μ; ≤ 40 % pieces of 3–4 cells; μ ≥ 4.5; K ≥ ⌈0.75·√A⌉ | 6.4 |
| R8 | Pieces may be rotated or flipped to fill 100 % of the board without overlap | 8 orientations; exact cover | 6.1, 6.6 |
| R9 | Pieces are pairwise distinct, even when rotated or flipped; distinct colors | Canonical keys; palette, generated colors, labels beyond A–Z, patterns | 6.1, 11.9 |
| R10 | More pieces at higher levels | K grows with level and area | 6.4, 7.5 |
| R11 | "New Puzzle": 1–10 different puzzles from the same set, changing only the arrangement | Macro carving + local re-tiling; a new layout key AND a new clue key; never clue-only variants; honest partial batches | 6.5, 6.7–6.9 |
| R12 | Some pieces pre-placed at random; easy = many, nightmare = few | Initial share per level, then a score-guided clue search; 1 ≤ G ≤ K−2 | 6.10, 7.4 |
| R13 | Addendum 1–2: the highest (and lowest) level depends on board size; large boards with Hell-2, Hell-3, … | Contiguous availability per level; open ladder | 7.4, 7.5 |
| R14 | Addendum 3: piece count follows level AND board size; never too many small pieces (examples: 60 cells easy 7–8 / master 11–13; 360 cells hard 16–18 lowest / hell-1 40–42) | K(level, area) formula and final table: 60 → easy 7–8, master 12–13; 360 → hard 16–18 (lowest), hell-1 37–42 | 6.4, 7.5 |
| R15 | Addendum 4: find the optimal maximum board size so that generation finishes within 2 min (target 1 min) on the web, with 4 workers and 2 GB | Design ceiling 576 cells, release 484 until qualified; 115 s dispatch stop, 120 s answer; compact memory; qualification tests | 6.2, 8, 8.7, A.10 |
| P1 | The player imports generator output | Link, file, paste and library; strict validator | 9 |
| P2 | The player rotates, flips and places pieces to complete the board | Drag, tap and keyboard; D4 algebra; win detection | 11 |

---

## 2. Decision record

Rows D1–D31 come from Phase 4. Rows marked **(P5/6)** were changed or added by the addendum studies, their cross-reviews and the orchestrator's settlement. Rows marked **(P9)** were added by the Phase-9 task-pack review.

| # | Decision | Chosen option | Rationale | Source |
|---|---|---|---|---|
| D1 | Meaning of "rotate the board 45°/90°" | Presentation only. The logical board is always W×H plus blocked cells. There is no regridding and no logical "rotate mask" command. | Explicit user clarification | User; A2 |
| D2 | Rotation sign | `presentation.rotation` in degrees **counter-clockwise** on screen, in {0, 45, …, 315}. The Heart preset is stored as 45. | With the top-right quarter blocked, a 45° counter-clockwise turn puts the notch on top. | A2 (P3); Orch |
| D3 | Piece drawing on rotated boards | Tray, drag ghost and board all use the board's frame (WYSIWYG). Labels stay upright. | A piece never jumps visually when picked up. | A1, A2 (P3) |
| D4 | Rotate/flip controls on rotated boards | Screen space. ⟳/⟲ are grid quarter-turns. ⇋/⇵ mirror the piece as seen on screen (§6.3). | Does what the icon shows. Verified for 8 angles × 8 orientations. | A1 (P3) |
| D5 | Arrow keys on rotated boards | Move along the grid axis closest to the arrow's on-screen direction. At odd multiples of 45°, use the mapping for θ − 45°. Axis hints are shown. | Arrows bound to logical rows/columns would move pieces in a different screen direction than pressed. | A1 (P3) |
| D6 | Board margins | Keep the authored W×H. Analyze symmetry on a copy normalized to the active bounding box. Trimming is an explicit button. | Stored coordinates never change silently. | A2 (P3) |
| D7 | Board connectivity | Generation requires one 4-connected active region. Import accepts any non-empty board. | Simpler carving; valid files are not rejected. | A2; A1 (P3) |
| D8 | Game rules vs. generation policy | `rules: "free-polyomino-v1"` covers gameplay only. Size rules, distinct and hole-free shapes are generator policy `mixed-v2`, recorded in `generation.policy`. | Import must accept every rules-valid puzzle. | A1; A2 |
| D9 **(P5/6)** | Piece count | K_mid = min(K60[L]·(A/60)^0.28, Kcap[L]); window ±max(0.75, 6 %); clamped to [⌈0.75·√A⌉, Kmax(A)]; integer counts filtered by histogram feasibility (§6.4). 360-cell hell-1 = 37–42. | Fits all four user examples; area-neutral at hell levels; monotone in A | P5-A1 §4; P6-A1 D2; P6-A2 D6-02/04; Orch |
| D10 **(P5/6)** | Difficulty formula | `difficulty-v2`: D = round(2U + 8·log10(1 + B_eff)), B_eff = min(B, 5,000). R and H are stored as diagnostics only. | R and H grow with area and over-rated large boards; the simpler score keeps "few clues = hard" on every board size. | P5-A1 §3; P6-A1 D1; P6-A2 D6-03; Orch |
| D11 **(P5/6)** | Search-effort estimator | One canonical DLX traversal, saturating at 5,000 branch trials or 50,000 row trials. Actual counters and the stop reason are stored. | Deterministic, bounded cost (≤ ~4 s at 484 cells) | A2; A1 (P3); P5-A1 §3.2 |
| D12 **(P5/6)** | Level bands | Geometric: e_L = round(10·1.45^(L−1.5)); Hell-n = level 6 + n, open-ended | Bands scale with the saturating score; ratio fitted to the user's examples | P5-A1 §3.3; Orch |
| D13 **(P5/6)** | Shown level | Always the level of the actual score, worded as an estimate. Saturated scores are exact; no "≥" display. | Honest labels | A1, A2; P5-A1 |
| D14 **(P5/6)** | Uniqueness | Default: any valid completion. "Require one solution" needs an exhaustive raw-coordinate proof; standard for A ≤ 200 or below Hell, experimental otherwise. Certificates are lazy (§6.11). | The user did not require uniqueness; never claim an unproved fact. Certificates took ≈ 35 % of batch CPU at hell levels and were almost never conclusive above 200 cells. | A1, A2 (P3); P5-A1 §7.2; P6-A2 D6-06 |
| D15 | Piece-set acceptance | A set is ready only once a target-band calibration puzzle exists; that puzzle becomes puzzle #1. | The unclued score is not a ceiling (A.9). | A2 (R2-02) |
| D16 **(P5/6)** | Distinct puzzles | Strict: each puzzle needs a new full-layout key AND a new clue key. Preferred distance clamp(⌈K/4⌉, 3, 10), relaxed to a floor of 2, with a best-distance fallback. No clue-only variants; fewer puzzles are returned with an explanation. | The requirement says the arrangement must change. The user may later ask for optional variants. | A2; A1; P6-A1 D6; P6-A2 §6; Orch |
| D17 **(P5/6)** | Layout discovery | Local LNS: one macro region (broadened every 8th step) or a 6–13-piece cluster; random restarts only up to 150 cells | Global re-tiling fails on large boards; local re-tiling of macro regions found 10 layouts in < 1 s at 360 cells. | A1; P5-A1 §5; P5-A2 §4; P6 |
| D18 | Clue selection | 1 ≤ G ≤ K−2. Count-guided sampling, then a bounded beam over add/remove/swap moves. No monotonicity assumption. | Both P3 positions | A1, A2 |
| D19 | Parallelism | Pool of up to 4 module workers. A deterministic fold accepts the lowest-index success. | Reproducible with any pool size; never "first finisher wins" | A2 principle |
| D20 | Cancellation | `worker.terminate()` plus lazy respawn. No `setTimeout(0)` slicing. | Instant; avoids the 4 ms timer clamp | A1, A2 |
| D21 | PRNG and seeds | xoshiro128**. A free-text seed is hashed with SHA-256 to a 128-bit state. | Published reference algorithm; user-friendly seeds | A2; A1 |
| D22 | Hashing | One pure-JS, synchronous SHA-256 in `core` | Identical in pages, workers and Node | Phase 4 |
| D23 | Exchange format | Envelope `format / version / kind / rules`. Board as row strings. Poses `{piece, x, y, turn, mirrored}`. Strict whitelist plus a free `meta` object. Supported versions {1}. | Merge of both formats | A1, A2 (P3) |
| D24 | Solutions in files | Per-puzzle `solution` and the set `witness` are included by default; "Omit solutions" exists. | O(cells) solvability proof on import | A1, A2 |
| D25 | Hand-off | Primary: compressed `#pack=` link. Fallback: `#lib=` reference. Plus JSON files. | Portable and self-contained | A1; A2 (P3) |
| D26 | Progress identity | SHA-256 of exact coordinates: board rows, piece cells and clue cells | Symmetry-normalized keys corrupt saved moves (A.9). | A2 |
| D27 | Hints / show solution | Post-MVP, and only proven statements | An unproved culprit misleads (A.9). | A2 |
| D28 | Folder layout | `core/engine`, `core/workers`, `core/browser`; tests in `/tests` | Clear layering; tests are never deployed | A2; A1 |
| D29 | Deployment | Actions: test → assemble `_site` → deploy. External `redirect.js`. | CSP-compatible | A1; A2 |
| D30 **(P5/6)** | Colors and labels | 20-color palette, generated colors beyond 20, labels A…Z, AA, AB, …, and fill patterns when K > 20. Labels and patterns have independent display toggles, both on by default (§11.9). | Sets reach ~90 pieces on large boards. | A1; A2; P5-A2 §6.4; Orch; P7 sign-off S7-06 |
| D31 | Rotating a placed piece | Rotate about its handle cell and try 4 one-cell kicks; otherwise reject. | Predictable | A1 |
| D32 **(P5/6)** | Size balance | Sizes in [max(3, ⌊0.6μ⌋), ⌈1.5μ⌉]; ≤ ⌊0.4K⌋ pieces of 3–4 cells; μ ≥ 4.5; exact histogram feasibility. The Phase-4 spread and large-piece rules are removed. | Scales with μ (360-cell hard needs 12–34-cell pieces); 40 % keeps the user's 13-piece 60-cell master set possible. | P5-A2 §2.1; P5-A1 §2.2; P6-A1 D4; P6-A2 D6-04; Orch |
| D33 **(P5/6)** | Set construction | Macro carving when μ ≥ 6.5 (regions of 3–6 pieces; 2–3 when K ≤ 12) with global shape-key exclusion; flat carving otherwise or as a fallback; independent validation of every witness | Flat-carved big-piece sets usually have one arrangement; macro sets gave 10 distinct layouts in both reproductions. | P5-A2 §4; P6-A1 D6; P6-A2 D6-01; Orch |
| D34 **(P5/6)** | Initial pre-placed count | G0 = clamp(round(g_L·K), 1, K−2); g_L = 0.62 − 0.08·L up to nightmare, hell-1 0.10, hell-2 0.06, hell-3+ 0.04; then searched. Count and fraction are both shown. | Monotone "many → few"; centres hell-1 at D ≈ 100 | P5-A1 §3.3; P6-A1 D3; P6-A2 D6-02 |
| D35 **(P5/6)** | Level availability | Each level is offered on one contiguous area interval, frozen from the formula (§7.5). It is a preset policy, not a score ceiling. | Removes gaps caused by rounding; one authoritative table | P6-A1 §5.2; P6-A2 D6-04 |
| D36 **(P5/6)** | Board limits | 30 ≤ A ≤ 576, sides ≤ 32. Release default 484 until BQ-1 passes; phones 360 until BQ-3 passes; 577–676 only through an opt-in desktop switch, labelled experimental until BQ-2 passes; 677+ not offered. | 576 meets the 2-minute limit under the conservative factor only with lazy certificates and compact memory; 676 does not (A.10). | P5-A1 §6.3; P5-A2 §6.1; P6-A1 D5; P6-A2 D6-05; Orch |
| D37 **(P5/6)** | Time policy | One budget per action: target 60 s (a qualification criterion), stop dispatching at 115 s, answer by 120 s with all accepted results. No "Try longer" option. | Matches the addendum's 2-minute hard limit | P5-A2 §6.4; Orch |
| D38 **(P5/6)** | Memory engineering | Compact model storage (flat typed arrays, no per-row objects), one reusable workspace per worker plus a scratch workspace, worker recycling when the set changes, pre-flight guards (≤ 600,000 rows, ≤ 5,000,000 nodes) and byte accounting | Per-row JS objects, not DLX links, dominated memory (A.10). | P5-A2 §1; P6-A1 R3–R5; P6-A2 D6-05 |
| D39 **(P5/6)** | Planning factor | Browser time = 5 s + 4 × Node time for planning; 2.5× is an optimistic sensitivity only. Browser qualification replaces both. | Neither factor was measured. | P5-A2 §1; P5-A1 §1.2; P6-A2 D6-05 |
| D40 **(P5/6)** | Minimum board | 30 active cells for generation; any non-empty board on import | Below ~30 cells the formula offers only very-easy, with gaps; such puzzles are trivial. | P7 |
| D41 **(P9)** | Batch seeds and "Keep seed" | `batchSeed = setSeed + "#" + batchIndex`. `batchIndex` counts the New Puzzles / Add more requests on the current set (1 = first). It is stored with the set. With 🔒 Keep seed on, the seed text is reused, so the set and every batch seed (#1, #2, …) recur, and each batch is reproduced given the same history. With it off, each Generate Piece Set draws a new random seed. (§8.6) | The batch seed was undefined. Reusing one seed for every batch would replay already-seen layouts, because the session history only grows (D16). | P9-A1 T9-02; Orch |
| D42 **(P9)** | Module file extension | Every module loaded by a browser page or worker uses `.js`. `.mjs` is only for Node tools. (§12.3) | Some static servers send `.mjs` as `text/plain`, and browsers then refuse to load the module. Python 3.14 `http.server` on Windows does this (verified). | P9-A1 T9-03 |

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
│  │  ├─ workspace.js  dlx.js  tiling.js  carve.js  keys.js  difficulty.js  clues.js  generate.js
│  │  └─ pack.js  sharecode.js  game.js  palette.js  protocol.js  version.js
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
                                                            (each worker: main + scratch workspace, §8.5)
  watchdog: stop dispatch at 115 s, answer by 120 s     idle pool: lazy certificate tasks (§6.11)
  new piece set ─► recycle workers (§8.1)
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
type PieceSet = { board: Board; pieces: Piece[]; witness: Pose[] | null;
                  carving: 'macro' | 'flat' | 'imported';
                  macroRegion: number[] | null };  // macro-region index per piece (canonical order), §6.5
type Metrics = { U: number; B: number;              // B = effective (saturated) value used by the score
                 branchTrials: number; rowTrials: number;     // actual counters of the rating traversal
                 stop: 'solution' | 'branch-cap' | 'row-cap'; // why the traversal ended
                 R: number; H: number };                      // diagnostics only (§7.1)
type Rating = { model: 'difficulty-v2'; score: number; level: string; saturated: boolean; metrics: Metrics };
type Certificate = { status: 'unique' | 'multiple' | 'not-proved' | 'unsatisfiable';
                     model: 'dlx-v1'; rowLimit: number; verified: boolean };  // verified = computed by this runtime
type Puzzle = { id: string; title?: string; clues: Pose[]; solution: Pose[] | null;
                rating: Rating | null; certificate: Certificate | null };   // null certificate = not computed yet
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
export function validateForGeneration(b: Board, cap: number): { errors: Issue[]; warnings: Issue[] }; // cap = enabled maxActive (§6.2)
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

**`policy.js`** (§6.4, §8.3): limits, counts, sizes, score constants and budgets (data plus pure functions).

```ts
export const POLICY_ID = 'mixed-v2';
export const LIMITS: Readonly<{
  minActive: 30; maxSide: 32;
  designMaxActive: 576;        // standard ceiling, enabled when BQ-1 passes (§8.7)
  releaseMaxActive: 484 | 576; // shipped value: 484 until BQ-1 passes [BQ]
  phoneMaxActive: 360 | 484;   // phones: 360 until BQ-3 passes [BQ]
  largeBoardMaxActive: 676;    // opt-in desktop switch (§10.2); labelled experimental until BQ-2 passes
  maxBatch: 10 }>;
export function enabledMaxActive(device: { phone: boolean; largeBoards: boolean }): number;  // §6.2
export function kMin(area: number): number;                 // ⌈0.75·√A⌉
export function kMax(area: number): number;                 // §6.4(a)
export function minAreaForCount(k: number): number;         // smallest area for k distinct pieces under the small cap
export function sizeWindow(area: number, k: number): [lo: number, hi: number];   // §6.4(b)
export function histogramFeasible(area: number, k: number,
                                  o?: { window?: [number, number]; avail?: (s: number) => number; smallCap?: number }): boolean;
export function pieceCountRange(levelId: string, area: number): number[] | null; // feasible K values; null = not offered
export function planSizes(area: number, k: number, rng: Rng,
                          o?: { window?: [number, number]; avail?: (s: number) => number; smallCap?: number }): number[] | null;
export const SCORE: Readonly<{ model: 'difficulty-v2'; weights: { U: 2; B: 8 };
                               caps: { branch: 5000; rows: 50000 } }>;   // §7.2, §7.3
export const BUDGETS: Readonly<Record<string, number>>;     // §8.3
export const TIME: Readonly<{ targetMs: 60000; dispatchStopMs: 115000; responseMs: 120000 }>;
```

**`levels.js`** (§7.4, §7.5)

```ts
export type Level = { id: string; label: string; index: number; min: number; max: number; // band [min, max)
                      share: number;                       // initial clue share g_L
                      areas: [number, number] };           // contiguous offered area interval (max may be Infinity)
export function level(id: string): Level;                  // 'hell-7' etc. are generated on demand
export function levelForScore(score: number): Level;
export function offeredLevels(area: number): Level[];      // §7.5; ascending
```

**`workspace.js`** (§6.6, §8.5): reusable typed-array storage, one per worker role.

```ts
export type Workspace = { bytes(): number; capacityBytes: number };   // grow-only buffers, never shrunk
export function createWorkspace(capacityBytes: number): Workspace;
export function countModel(b: Board, pieces: Piece[], clues: Pose[]): { rows: number; nodes: number; bytes: number };
```

**`dlx.js`** (§6.6)

```ts
export class ExactCover {
  // rows are given as one flat Int32Array of column indices plus offsets; no per-row objects
  constructor(ws: Workspace, numColumns: number, rowCols: Int32Array, rowStart: Int32Array, rowCount: number);
  solve(o: { maxSolutions?: number; rowTrialLimit?: number; branchTrialLimit?: number; rng?: Rng | null;
             onSolution?: (rowIds: Int32Array) => void; onProgress?: (rowTrials: number) => void;
             progressEvery?: number }):
    { solutions: Int32Array[]; found: number; rowTrials: number; branchTrials: number; exhausted: boolean;
      stop: 'exhausted' | 'solution-limit' | 'row-limit' | 'branch-limit' };
}
```

The links are fully restored after every `solve`, so one instance can be solved repeatedly.

**`tiling.js`** (§6.6, §6.7)

```ts
export type Model = { cover: ExactCover; rowPiece: Int16Array; rowT: Uint8Array; rowX: Int16Array; rowY: Int16Array;
                      freePieces: string[]; freeCells: number; placementsPerPiece: Int32Array }; // = L_i, canonical order
export function buildModel(b: Board, pieces: Piece[], clues: Pose[], ws: Workspace): Model;   // throws 'model-too-large' (§6.6)
export function rowPose(m: Model, row: number): Pose;
export function solveFirst(m: Model, o: { rng?: Rng; rowTrialLimit: number; branchTrialLimit?: number }):
  { layout: Pose[] | null; rowTrials: number; branchTrials: number; exhausted: boolean;
    stop: 'exhausted' | 'solution-limit' | 'row-limit' | 'branch-limit' };
export function countSolutions(m: Model, o: { cap: number; rowTrialLimit: number }):
  { found: number; exhausted: boolean; witnesses: Pose[][] };
export function randomTiling(b: Board, pieces: Piece[], rng: Rng, ws: Workspace,
                             o: { clues?: Pose[]; totalRowTrials: number; restartBase: number }): Pose[] | null;
export function lnsStep(b: Board, pieces: Piece[], layout: Pose[], cluster: number[], rng: Rng, ws: Workspace,
                        o: { rowTrialLimit: number; maxSolutions: number }): Pose[] | null;
export function lnsWalk(set: PieceSet, start: Pose[], rng: Rng, ws: Workspace, steps: number): Pose[];  // §6.7
export function isValidLayout(b: Board, pieces: Piece[], layout: Pose[]): boolean;    // O(cells)
```

**`carve.js`** (§6.5)

```ts
export function carveFlat(mask: Board, sizes: number[], rng: Rng,
                          o: { stepBudget: number; growthTries: number; used: Set<string> }):
  { regions: number[][] } | null;                          // disjoint cell-index sets covering the mask
export function macroPartition(b: Board, mu: number, piecesPerPart: [lo: number, hi: number], rng: Rng):
  number[][] | null;                                       // compact connected parts of the active cells (§6.5)
export function carveMacro(b: Board, k: number, rng: Rng, budgets: object):
  { regions: number[][]; regionOf: number[] } | null;      // §6.5
export function finalizeSet(b: Board, regions: number[][], regionOf: number[] | null): PieceSet;  // ids, labels, colors, witness
export function validateSet(set: PieceSet): Issue[];       // independent of the carver: cover, shapes, policy (§6.5)
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
export const MODEL = 'difficulty-v2';
export function measure(b: Board, pieces: Piece[], clues: Pose[], ws: Workspace): { metrics: Metrics; saturated: boolean };
export function score(U: number, B: number): number;       // pure formula (§7.2); B is the effective value
export function rate(b: Board, pieces: Piece[], clues: Pose[], ws: Workspace): Rating;
export function inBand(r: Rating, target: Level): boolean; // target.min ≤ score < target.max
```

**`clues.js`** (§6.10, §6.11)

```ts
export function selectClues(ctx: { board: Board; pieces: Piece[]; layout: Pose[]; target: Level; rng: Rng;
                                   uniqueness: 'any' | 'require'; excludeClueKeys: ReadonlySet<string>;
                                   ws: Workspace }):
  { ok: true; clues: Pose[]; rating: Rating; certificate: Certificate | null }   // certificate only in 'require' mode
  | { ok: false; reason: 'not-in-band' | 'uniqueness-not-proved' };
export function makeUnique(board: Board, pieces: Piece[], layout: Pose[], clues: Pose[], rng: Rng, ws: Workspace,
                           rowLimit: number): Pose[] | null;
export function certify(board: Board, pieces: Piece[], clues: Pose[], ws: Workspace, rowLimit: number): Certificate;
```

**`generate.js`** (§6.5, §6.9): pure task functions plus the deterministic fold.

```ts
export function setAttempt(req: SetRequest, attempt: number): SetAttemptResult;
export function puzzleCandidate(ctx: BatchContext, slot: number, attempt: number):
  PuzzleCandidate | { fail: 'layout' | 'not-in-band' | 'uniqueness-not-proved' };   // failure kind feeds the partial reason (§6.9)
export function certifyTask(ctx: BatchContext, clues: Pose[]): Certificate;      // lazy certificate (§6.11)
export function foldStart(ctx: BatchContext): FoldState;
export function foldNext(s: FoldState): { slot: number; attempt: number } | null;  // next candidate needed
export function foldAccept(s: FoldState, c: PuzzleCandidate | { fail: string }): FoldState;   // deterministic acceptance
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

**`palette.js`** (§11.9)

```ts
export const BASE_COLORS: readonly string[];               // 20 entries
export function colorFor(index: number): string;           // BASE_COLORS, then generated (golden-angle hues)
export function labelFor(index: number): string;           // A … Z, AA, AB, … (≤ 4 characters)
export function patternFor(index: number, k: number): 'none' | 'dots' | 'hlines' | 'vlines';  // 'none' when k ≤ 20
export function textColorFor(hex: string): '#000000' | '#ffffff';   // WCAG relative luminance
```

**`protocol.js`**: worker message types and their validation (§8.1).

### 4.3 Browser modules (`core/browser/`)

| Module | API and responsibility |
|---|---|
| `worker-pool.js` | `createPool({ size })` returns `{ run(task, onProgress) → Promise<result>, runIdle(task) → Promise<result>, cancelAll(), recycle(), size }`. Cancelling terminates and lazily respawns workers; `recycle()` does the same between piece sets (§8.1). `runIdle` queues lazy certificate tasks at the lowest priority. Hosts the watchdog (115 s dispatch stop, 120 s answer, §8.4) and sums byte accounting (§8.5). |
| `svg-board.js` | `mountBoard(el, opts)` returns `{ render(model), setRotation(theta), setZoom(cellPx), panTo(x, y), cellAt(clientX, clientY, o?: { includeBlocked?: boolean }) → XY or null, localPoint(clientX, clientY), destroy() }`. `cellAt` returns only active cells by default (play mode); the editor passes `includeBlocked: true` (§6.3). Shared by the player, the editor and thumbnails. |
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
| `puzzles[].certificate` | `{status, model, rowLimit?}` | no | A claim; may be recomputed. Absent when uniqueness was not checked (lazy certificates, §6.11). |
| `generation` | object | no | Provenance and generation policy (§5.5); type-checked only |
| `meta` | object | no | Free extension, ≤ 4 KiB serialized; preserved, never interpreted |

**Rules `free-polyomino-v1` (normative gameplay):**

1. Each piece is a non-empty, edge-connected set of cells. Holes are allowed.
2. Each piece is used exactly once, in any of its 8 orientations.
3. The pieces cover every active cell exactly once and no blocked cell.
4. Clues are fixed; the player places all other pieces.
5. Every complete placement satisfying 1–4 wins.

**Generation policy `mixed-v2`** (generator only; recorded in `generation.policy`):
- every piece has ≥ 3 cells;
- canonical keys are pairwise distinct;
- pieces are hole-free;
- the piece count, size window and small-piece cap follow §6.4, and level availability follows §7.5.

Example: a hand-authored, verified 60-cell fixture (a 10 × 6 board). Hand-authored packs need not follow the generation policy; this one has a 10-cell piece, outside the `mixed-v2` window for K = 10.
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
  "generation": { "app": "hand-authored" }
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
  - `rating.model` (`difficulty-v2`; files carrying `difficulty-v1` ratings are accepted and shown as claims);
  - `certificate.model` (`dlx-v1`);
  - `generation.algo` (`gen-v2`: macro/flat carving, local LNS, strict batch fold; seeds reproduce only within one algo id);
  - `generation.policy` (`mixed-v2`: size window, small-piece cap, count formula and availability of §6.4 and §7.5);
  - `generation.rng` and `generation.seedScheme`.
- Any change to a weight, cap, band, share, count parameter, availability interval, budget that alters results, traversal order or pruning requires a new id.

### 5.5 Generation metadata

```json
{
  "app": "pentomino-generator/1.0.0", "algo": "gen-v2", "policy": "mixed-v2",
  "rng": "xoshiro128ss-v1", "seedScheme": "seed-sha256-v1",
  "setSeed": "K7Q2-9MXA-3FWD", "setLevel": "hard", "setAttempt": 2,
  "carving": "macro", "macroRegion": [0, 0, 1, 1, 1, 2, 2, 3, 3, 3],
  "batchSeed": "K7Q2-9MXA-3FWD#1", "batchLevel": "hard", "batchIndex": 1,
  "uniqueness": "any", "createdAt": "2026-10-22T03:00:00Z"
}
```

- `macroRegion` lists the macro-region index of each piece in piece order; it lets a later session continue New Puzzles with macro-region re-tiling (§6.7). It is absent for flat and imported sets.
- `batchSeed` is always `setSeed + "#" + batchIndex`. `batchIndex` is the 1-based number of the batch request on this set (§8.6, D41).
- `generation` is type-checked only on import (§5.3); a missing or foreign object never blocks play.

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

- **Board.** W × H plus an active mask; files store it as row strings. W and H are each at most `LIMITS.maxSide` = 32 in the editor and at most 64 on import.
- **`classifyBlocked`.** Flood fill from outside a 1-cell-padded grid through blocked cells. Reached cells are *exterior*; the remaining blocked cells are *holes*.
- **`normalizedActive`.** Crops to the active bounding box and returns the offsets (dx, dy).
- **`symmetries`.** Returns the t values for which `normalize(T_t(activeCells))` equals `normalize(activeCells)`.
  - Expected sizes: non-square rectangle 4, square 8, Heart 2 (identity and the anti-diagonal reflection t = 5), irregular board 1.
  - Margins never hide a symmetry (D6).
- **Area limits** (D36, D40). `enabledMaxActive(device)` returns the largest area the generator accepts on this device:

  | Device class | Enabled maximum | Becomes |
  |---|---|---|
  | Desktop / laptop (default) | `releaseMaxActive` = 484 | 576 when BQ-1 passes [BQ] |
  | Desktop with "Large boards" switched on | 676 | Always opt-in; labelled experimental until BQ-2 passes [BQ] |
  | Phone: `matchMedia('(pointer: coarse)')` and (`navigator.deviceMemory` ≤ 4, or unknown, or `hardwareConcurrency` ≤ 4) | `phoneMaxActive` = 360 | 484 when BQ-3 passes [BQ] |

  - The design ceiling without the experimental switch is `designMaxActive` = 576. Boards above 676 cells are never generated.
  - Import, play and verification have no generation limit (§5.3 limits apply).
- **Validation for generation** (`validateForGeneration(board, enabledMaxActive(device))`).
  - Errors:
    - active cells < `LIMITS.minActive` (30) or above the enabled maximum;
    - the active cells are not one 4-connected region;
    - a side exceeds `LIMITS.maxSide` (32).
  - Warning: more than 360 active cells — "Large board: generation can take up to 2 minutes".
  - Offending cells are highlighted.
- **Presets.** Masks only; the user can then paint cells or change the rotation.

  | Preset | Definition | Default | Rotation |
  |---|---|---|---|
  | Rectangle | W × H, all active | 10 × 6 = 60 cells | 0 |
  | Heart | N × N, N even, with the top-right (N/2) × (N/2) quarter blocked. Optional "Round lobes" also blocks cells (0, 0) and (N−1, N−1). | N = 10: 75 cells (73 with round lobes) | 45 |
  | Diamond | N × N square | N = 8: 64 cells | 45 |
  | Cross | Union of a horizontal and a vertical bar, thickness ⌈N/3⌉ | N = 9: 45 cells | 0 |
  | Ring | W × H with a centered blocked rectangle (a hole); walls ≥ 2 cells thick | 8 × 8 with a 2 × 2 hole: 60 cells | 0 |

  - The Heart has N²·3/4 cells: N = 8 → 48, N = 12 → 108, N = 14 → 147, N = 22 → 363, N = 24 → 432, N = 26 → 507.
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
- The cell under the pointer is `(floor(local.x), floor(local.y))`. It must lie inside W × H; what else counts depends on the mode (`cellAt(…, { includeBlocked })`, §4.3):
  - **Play mode** (player placement, drag ghost, tap-to-place): only active cells count. The transparent corners of a rotated bounding box and blocked cells are therefore outside.
  - **Edit mode** (board-editor painting): every cell inside W × H counts, active or blocked, including exterior cells (drawn as dashed guides). Otherwise a blocked cell could never be unblocked.
- **Drag anchor.**
  - Let s be the grabbed source cell (piece-local, before orientation).
  - Under the current t, its position inside `normalize(T_t(cells))` is g.
  - The ghost origin is `floor(local) − g`.
  - Rotating or flipping during a drag recomputes g, so the grabbed cell stays under the pointer.
- **Touch lift.** The dragged piece is drawn 1.25 cells above the finger *on screen*. Apply the screen offset (0, −1.25·cellPx) before the inverse transform.
- **Editor painting.** Uses the same mapping in edit mode (`includeBlocked: true`). The "Edit unrotated" toggle temporarily displays θ = 0 for precise painting.

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

### 6.4 Piece count and size policy (`mixed-v2`)

**Fixed rules:**
- every generated piece has ≥ 3 cells, is edge-connected and hole-free, and has a unique canonical key;
- 1 ≤ G ≤ K − 2 (§6.10).

Level index L: very-easy 0, easy 1, normal 2, hard 3, expert 4, master 5, nightmare 6, hell-n 6 + n.

**(a) Count range** — `pieceCountRange(level, A)`.

```text
K_mid(L, A) = min(K60[L] · (A / 60)^0.28, Kcap[L])
  K60  (very-easy … hell-5) = 6, 7.5, 8.5, 10, 11.5, 13, 16, 24, 32, 43, 58, 78
  Kcap: hell-1 42, hell-2 62, hell-3 92, hell-4 140, hell-5 210; no cap below hell-1
w        = max(0.75, 0.06 · K_mid)
Kmin(A)  = ⌈0.75 · √A⌉                                   // "not too few large pieces"
Kmax(A)  = largest K ≤ ⌊A / 4.5⌋ with minAreaForCount(K) ≤ A   // mean size ≥ 4.5; enough distinct shapes
window   = [round(K_mid − w), round(K_mid + w)], clamped into [Kmin(A), min(Kmax(A), Kcap[L])]
           (if the clamped window is empty: the single value clamp(round(K_mid), Kmin(A), min(Kmax(A), Kcap[L])))
pieceCountRange(L, A) = null if L is not offered at A (§7.5),
                        else [K ∈ window : histogramFeasible(A, K)]
```

- **Exponent 0.28.** Fitted to the measured score landscape (P5-A1, A.10): smaller pieces on smaller boards cause more search, so a level needs fewer pieces there.
- **Kcap.** Beyond about 25 pieces to place, the score is ≈ 2U + 30 on any board (§7.2), so the count a Hell band needs no longer grows with area.
- **Checks against the user's examples:** 60 cells → easy 7–8, master 12–13; 360 cells → hard 16–18 (the lowest level offered there), hell-1 37–42.
- The histogram filter removed no value in the offered windows (P7 check over all areas 30–676).

**(b) Size window and small pieces** — `sizeWindow`, `histogramFeasible`, `planSizes`.

```text
μ = A / K
sizes ∈ [lo, hi] = [max(3, ⌊0.6·μ⌋), ⌈1.5·μ⌉]
at most ⌊0.4·K⌋ pieces of 3–4 cells (never more than 7: only 7 such shapes exist)
at most avail(s) pieces of size s (hole-free free polyominoes):
  s       3  4  5   6    7    8      9     10     ≥ 11
  avail   2  5  12  35   107  363  1,248  4,460   unbounded in practice
```

- **`histogramFeasible(A, K)`.** True iff integer counts c_s exist with Σ c_s = K, Σ s·c_s = A, lo ≤ s ≤ hi, c_s ≤ avail(s) and c_3 + c_4 ≤ ⌊0.4·K⌋.
  - Exact method: enumerate c_3 ≤ 2, c_4 ≤ 5, c_5 ≤ 12 and c_6 ≤ 35 within the window and the small cap. For each combination, the r remaining pieces must have sizes in [max(lo, 7), hi]: feasible iff r·max(lo, 7) ≤ rest ≤ r·hi. Sizes ≥ 7 have ≥ 107 shapes, more than any K used here.
- **`minAreaForCount(K)`** takes the smallest sizes first under the small cap and `avail`:

  | K | 6 | 8 | 10 | 12 | 13 | 16 | 18 | 20 | 24 | 30 | 36 | 42 | 48 | 54 | 60 | 66 | 80 | 90 |
  |---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
  | Minimum area | 26 | 35 | 44 | 54 | 58 | 72 | 81 | 92 | 116 | 152 | 188 | 224 | 260 | 296 | 338 | 380 | 478 | 548 |

  | A | 36 | 60 | 100 | 144 | 196 | 256 | 324 | 360 | 400 | 484 | 576 | 676 |
  |---|---|---|---|---|---|---|---|---|---|---|---|---|
  | Kmin–Kmax | 5–8 | 6–13 | 8–21 | 9–28 | 11–37 | 12–47 | 14–58 | 15–63 | 15–68 | 17–80 | 18–94 | 20–108 |

- **`planSizes(A, K, rng, o)`** (o overrides the window, availability and small cap for macro regions, §6.5):

  ```text
  if not histogramFeasible: return null
  sizes ← the minimum histogram: K smallest sizes ≥ lo, respecting avail and the small cap
  while Σ sizes < A:                                   // grow one piece at a time
    candidates ← pieces i with sizes[i] < hi, count(sizes[i] + 1) < avail(sizes[i] + 1),
                 and the small cap still respected
    i ← a random candidate among those with the smallest size        // keeps the histogram balanced
    sizes[i] += 1
  repeat 3K times:                                     // variety without leaving the constraints
    pick i ≠ j at random; try sizes[i] += 1, sizes[j] −= 1; keep it only if every constraint holds
  return rng.shuffle(sizes)
  ```

- The Phase-4 spread rule, the "≥ 20 % pieces of ≥ 6 cells" preference and the 3-cell slack rule are removed (D32). The slack rule would have removed the 13-piece master set on 60 cells.

**(c) Choosing K.** A set attempt draws K uniformly from `pieceCountRange` with its own RNG (§6.5).

**(d) Limits.** Board limits are in §6.2; the full table of K ranges, piece sizes, initial pre-placed counts and expected times per area band and level is in §7.5.

### 6.5 Piece-set generation (macro or flat carving + calibration)

Request: `{ board, rotation, levelId, seedText, uniqueness: 'any' | 'require' }`.

```text
setAttempt(req, j):                                   // pure; runs in a worker; j = attempt index
  rng ← createRng(req.seedText, 'set/' + j)
  ks ← pieceCountRange(level, A);  K ← ks[rng.int(ks.length)]          // §6.4
  μ ← A / K
  if μ ≥ 6.5:
    c ← carveMacro(board, K, rng.derive('macro'), BUDGETS)            // preferred for large pieces
    carving ← 'macro'
    if c = null: c ← carveFlatSet(board, K, rng.derive('flat')); carving ← 'flat'   // bounded fallback
  else:
    c ← carveFlatSet(board, K, rng.derive('flat')); carving ← 'flat'
  if c = null → return fail('carve')
  set ← finalizeSet(board, c.regions, c.regionOf ?? null)             // ids, colors, witness poses
  if validateSet(set) has issues → return fail('internal')            // independent check, see below
  cal ← selectClues({ layout: set.witness, target: level, rng: rng.derive('cal'), uniqueness, … })
  if !cal.ok → return fail(cal.reason)
  return { set, carving, calibration: cal }

carveFlatSet(board, K, rng):
  repeat ≤ BUDGETS.sizePlans (6) times:
    sizes ← planSizes(A, K, rng);  if null → return null
    r ← carveFlat(board, sizes, rng, { stepBudget: BUDGETS.carveSteps, growthTries: BUDGETS.carveTries, used: ∅ })
    if r → return r
  return null
```

**Flat carving** (`carveFlat`, randomized backtracking):

```text
carveFlat(mask, sizes, rng, { stepBudget, growthTries, used }):
  owner[c] ← empty for every active cell of mask;  remaining ← multiset(sizes)
  step():                                             // ≤ stepBudget calls per attempt
    if no empty cell: return remaining = ∅
    target ← empty cell with the fewest empty 4-neighbours (ties: rng)   // most constrained first
    repeat ≤ growthTries times:
      s ← random distinct size in remaining
      shape ← edenGrow(target, s)   // add uniformly random frontier cells, inside empty cells only
      if shape = null or hasHole(shape) or canonicalKey(shape) ∈ used: continue
      commit(shape); used.add(key)
      if residualFeasible() and step(): return true
      undo(shape); used.delete(key)
    return false
  residualFeasible(): every empty 4-connected component has size ≥ min(remaining)
                      and is a subset sum of the remaining sizes (bitset DP).
```

**Macro carving** (`carveMacro`, D33). It builds sets that can be re-arranged: each macro region is a small sub-puzzle with several tilings.

```text
carveMacro(board, K, rng, budgets):
  μ ← A / K;  [pLo, pHi] ← K ≤ 12 ? [2, 3] : [3, 6]        // pieces per macro region
  [lo, hi] ← sizeWindow(A, K)
  repeat ≤ budgets.macroPartitions (30) times:
    smallLeft ← ⌊0.4·K⌋;  used ← ∅;  pieces ← [];  allOk ← true   // fresh global state for every partition
    P ← macroPartition(board, μ, pLo, pHi, rng);  if P = null: continue
    k_r ← allocate K over the parts by largest remainder of |part| / μ, each k_r ≥ 2; if impossible: continue
    for each part r, in partition order:
      ok ← false
      repeat ≤ budgets.sizePlans (6) times:
        sizes ← planSizes(|part|, k_r, rng, { window: [lo, hi], smallCap: smallLeft,
                                              avail: s ↦ avail(s) − (pieces of size s already in pieces) })
        if sizes and carveFlat(part, sizes, rng, { stepBudget: budgets.macroSteps (3,000),
                                                  growthTries: budgets.carveTries, used }): ok ← true; break
      if not ok: allOk ← false; break        // discard the whole partition; the next one starts from fresh state
      append part r's pieces to pieces;  smallLeft −= small pieces used in part r
    if allOk: return { regions: pieces, regionOf: part index of each piece }
  return null

macroPartition(board, μ, pLo, pHi, rng):              // compact, connected parts of the active cells
  split the active bounding box by recursive guillotine cuts:
    a box whose active cells number ≤ pHi·μ is a leaf;
    otherwise cut across its longer side at a uniformly random position that leaves
    ≥ 3 cells of thickness and ≥ pLo·μ active cells on each side; no such position → leaf
  parts ← the 4-connected components of each leaf's active cells
  merge every part smaller than 2·⌈μ⌉ cells into the neighbouring part sharing the longest border
  return parts, or null if a part still has fewer than 2·⌈μ⌉ cells
```

- Macro boundaries are invisible and are not game rules: solvers, keys, scores and the player ignore them. The set stores `macroRegion` (piece → part index) for re-tiling (§6.7, §5.5).
- Macro carving was measured on rectangles. Heart and irregular masks use the same partition rule; BQ-0 covers them (§8.7).

**Independent validation** (`validateSet`), written separately from the carvers:
- the witness is a valid layout (`isValidLayout`);
- every piece is connected, hole-free, within [lo, hi] and of size ≥ 3;
- canonical keys are pairwise distinct;
- at most ⌊0.4·K⌋ pieces have 3–4 cells.

**Properties.**
- Every region is connected (it grows from a frontier), disjoint from the others, hole-free and distinct.
- The carve itself is the witness, so every set tiles the board by construction.

**`finalizeSet`.**
- Sort the pieces by (size descending, canonical key ascending).
- Assign `id = label = labelFor(index)` and `color = colorFor(index)`.
- For each region, find `(canonicalT, x, y)` that maps the piece's normalized cells onto the region; these poses form the witness.
- Carry `regionOf` into `macroRegion` in the same piece order.

**Calibration.**
- It uses exactly the clue selection of New Puzzles (§6.10).
- The set is "ready for <level>" only when the calibration puzzle is in band, and proven unique when required. That puzzle becomes puzzle #1 of the first batch.

**Unclued benchmark (MAY).**
- Rate the set with zero clues if budget remains.
- Show it only as "unclued benchmark", never as a maximum level (A.9).

**Parallel determinism (§8.2).** Attempts j = 0, 1, 2, … run 4 at a time on the pool. The result is the **lowest j that succeeds**.

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

**Compact storage and guards** (D38). `buildModel` never creates per-row objects:
1. **Count first.** `countModel` enumerates placements per piece and returns rows, nodes (Σ over rows of |piece| + 1) and bytes.
2. **Guard.** If rows > `BUDGETS.maxRows` (600,000), nodes > `BUDGETS.maxNodes` (5,000,000) or bytes exceed the workspace capacity, throw `model-too-large`. The UI suggests a smaller board or a lower level.
3. **Fill.** Write rows piece by piece into the workspace (§8.5): a flat `Int32Array` of column indices with `rowStart` offsets, plus `rowPiece`, `rowT`, `rowX`, `rowY`. Sort each piece's rows with an index sort on the typed arrays.
4. **Link.** Build the DLX links in the same workspace.

Measured sizes: 676 cells with 91 pieces → 348k rows and 2.97 M nodes; 676 cells with 37 pieces → 2.48 M nodes; 784 cells with 104 pieces → 4.17 M nodes (A.10).

**Search** (Knuth's Algorithm X with Dancing Links):
- **Column choice:** the column with the fewest rows (MRV). Ties go to the first in column order (canonical mode) or are broken uniformly at random (seeded mode). A column with 0 rows is a dead end.
- **Row order** within a column: canonical (insertion order), or shuffled per node in seeded mode.
- **Counters:**
  - `rowTrials` = rows selected;
  - `branchTrials` = rows selected at nodes whose chosen column had ≥ 2 rows, counted before descending (forced single-row choices are excluded).
- **Limits:** `rowTrialLimit`, `branchTrialLimit` and `maxSolutions`. When a limit is hit, the search unwinds (all covers undone) and reports `stop`.
- **Implementation:** `Int32Array` L, R, U, D, C and ROW, plus column sizes S, all from the workspace. Iterative; depth ≤ K.
- **Versioning:** the rating traversal — MRV, zero-column rejection, canonical order — is part of `dlx-v1`. Any change to pruning or ordering requires a new model id.

**Modes and permitted conclusions**

| Mode | Order | Stops at | Allowed conclusion |
|---|---|---|---|
| Rating | canonical | first solution, 5,000 branch trials or 50,000 row trials | B and the stop reason (§7.3) |
| Certificate | canonical | 2 solutions or the row limit | *unique* = 1 found + exhausted; *multiple* = 2 found; *unsatisfiable* = 0 found + exhausted; otherwise *not proved* |
| Discovery (random tiling, LNS) | seeded | first solution(s) or cap | a new valid layout |
| Import verify | canonical | first solution or cap | *solvable*; *unsatisfiable* if exhausted; otherwise *not verified* |

- Counting uses raw coordinates; there is no symmetry quotient. One layout class up to board symmetry can therefore hold several raw solutions.
- Symmetric orientations are deduplicated as rows, so they never create duplicate solutions.
- **Golden counts** (12 pentominoes, raw solutions):

  | Board | 3 × 20 | 4 × 15 | 5 × 12 | 6 × 10 |
  |---|---|---|---|---|
  | Raw solutions | 8 | 1,472 | 4,040 | 9,356 (= 4 × 2,339) |

### 6.7 Local re-tiling (LNS) and random tilings

Global re-tiling of a whole board fails on large boards: run times are heavy-tailed, and flat-carved big-piece sets usually have a single arrangement (A.10). New layouts are therefore found **locally**: release a small group of pieces, keep every other piece fixed, and re-tile the released cells with a capped seeded search.

```text
lnsStep(board, pieces, layout, cluster, rng, ws, { rowTrialLimit, maxSolutions = 8 }):
  sub ← buildModel(board, pieces, clues = layout − cluster, ws)   // only the cluster's cells are free
  r ← seeded solve(sub, maxSolutions, rowTrialLimit)
  alts ← solutions whose cluster placement differs from layout
  return alts ≠ ∅ ? (layout − cluster) + rng.pick(alts) : null

clusterFor(set, layout, s, stuck, rng):
  if set.macroRegion:                                   // macro set (§6.5)
    r ← rng.int(number of macro regions)
    cluster ← the pieces with macroRegion = r
    if s mod 8 = 7:                                     // broaden one step in eight
      add pieces adjacent to the cluster in the current layout, in random order, up to 9 pieces in total
    rows ← BUDGETS.lnsRowsMacro (3,000)
  else:                                                 // flat or imported set
    k ← min(K, 6 + rng.int(8) + 2·⌊stuck / 4⌋)           // 6–13 pieces, widened when stuck
    cluster ← BFS over piece adjacency in the current layout from a random piece, k pieces
    rows ← BUDGETS.lnsRowsFlat (5,000)
  return cluster, rows

lnsWalk(set, start, rng, ws, steps = BUDGETS.lnsSteps (8)):
  cur ← start;  stuck ← 0
  for s in 0..steps − 1:
    (cluster, rows) ← clusterFor(set, cur, s, stuck, rng)
    nxt ← lnsStep(board, pieces, cur, cluster, rng, ws, { rowTrialLimit: rows })
    if nxt: cur ← nxt; stuck ← 0  else: stuck += 1
  return cur
```

- A macro region's pieces always re-tile the cells they currently cover, so the union stays valid after broadened steps.
- Each step uses the worker's **scratch** workspace, so the set's main model stays cached (§8.5).
- **Random restarts** (Luby schedule; Luby et al. 1993, Gomes et al. 1998) are used only for boards of ≤ 150 cells:

  ```text
  randomTiling(board, pieces, rng, ws, { totalRowTrials = BUDGETS.tilingTotal (100,000), restartBase = BUDGETS.restartBase (2,000) }):
    for i = 1, 2, …:                                   // luby(i) = 1, 1, 2, 1, 1, 2, 4, 1, …
      r ← solveFirst(buildModel(board, pieces, [], ws), { rng: rng.derive('r' + i), rowTrialLimit: restartBase · luby(i) })
      if r.layout: return r.layout
      if Σ rowTrials > totalRowTrials: return null
  ```

Measured (A.10), for 10 accepted puzzles including clue search and rating:
- macro sets: ≤ 0.1 s (60 cells, K = 8) and 0.5–0.9 s (360 cells, K = 18–21), single-threaded; 360 cells with K = 37–41 took 3.6–4.6 s on 4 workers (architect-2's prototype) and 31–34 s single-threaded (architect-1's);
- flat sets with μ ≥ 7.5: usually no second layout at all.

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
- set (with witness and `macroRegion`);
- target level and quantity q ∈ 1..10;
- `batchSeed` = `setSeed + "#" + batchIndex` (§8.6), and uniqueness mode;
- `seen`: the session history of accepted layout keys and clue keys for this set. It holds at most 1,000 keys; when full, the UI asks the user to start a new history.

```text
puzzleCandidate(ctx, i, a):          // pure; slot i ∈ 1..q, attempt a ∈ 0..BUDGETS.slotAttempts − 1
  rng ← createRng(ctx.batchSeed, 'slot/' + i + '/' + a)
  start ← ctx.witness
  if A ≤ 150 and a mod 3 = 2: start ← randomTiling(board, pieces, rng.derive('restart'), ws) ?? ctx.witness
  layout ← lnsWalk(set, start, rng.derive('walk'), ws, BUDGETS.lnsSteps)          // §6.7
  if layoutKey(layout) ∈ ctx.seenLayouts: return { fail: 'layout' }               // cheap early exit
  sel ← selectClues({ layout, target, rng: rng.derive('clues'), uniqueness, excludeClueKeys: ctx.seenClues, ws })
  return sel.ok ? { layout, layoutKey, clueKey(sel.clues), sel.clues, sel.rating, sel.certificate }
                : { fail: sel.reason }                                          // 'not-in-band' | 'uniqueness-not-proved'

fold (deterministic; main thread; consumes candidates strictly in (i, a) order):
  dPref ← clamp(⌈K / 4⌉, 3, 10);  accepted ← []
  if the set's calibration puzzle matches the level and its keys are unseen: it fills slot 1
  for each unfilled slot i (ascending):
    d ← dPref;  rejected ← 0;  best ← none;  bestDistance ← −∞;  fails ← {}
    for a in 0..BUDGETS.slotAttempts − 1:
      c ← candidate(i, a)                         // computed speculatively by the pool, or awaited
      valid ← c.fail = none and c.layoutKey ∉ seenLayouts and c.clueKey ∉ seenClues
      if not valid: fails[c.fail ?? 'layout'] += 1      // a key taken meanwhile counts as 'layout'
      if valid:
        dist ← accepted = [] ? +∞ : min over p ∈ accepted of layoutDistance(c.layout, p.layout)
        if dist ≥ d: accept c (stream it to the UI); add its keys to seen; break
        if dist > bestDistance: best ← c; bestDistance ← dist   // farthest valid candidate; ties keep the earlier one
      rejected += 1;  if rejected mod 4 = 0: d ← max(2, d − 1)   // relax the preference, never below 2
    if slot i is still empty and best ≠ none: accept best; add its keys to seen   // distance is a preference, not a rule
    if slot i is still empty: stop → status 'partial', reason ← the most frequent entry of fails:
        'layout' → layouts-not-found, 'not-in-band' → difficulty-not-found,
        'uniqueness-not-proved' → uniqueness-not-proved (ties resolve in this order)
  (the watchdog stop of §8.4 ends the fold early with reason time-limit)
```

- Two different layouts always differ in at least 2 pieces, so the floor of 2 adds no rule beyond distinctness.
- `best` and `bestDistance` hold the farthest valid candidate of the current slot; they are reset for every slot, and ties keep the earliest attempt, so the fold stays deterministic. Because `best` is accepted when no candidate reaches `d`, a slot stays empty only when no new valid layout was found at all: the distance preference changes which layout is chosen, never whether one is.

**Speculation.**
- The scheduler keeps up to poolSize candidates in flight, in this priority:
  1. the next attempt of the slot the fold is waiting on;
  2. attempt 0 of each later unfilled slot, in ascending order;
  3. further attempts of the current slot;
  4. further attempts of later slots.
- Results are cached by (slot, attempt) and consumed only in fold order.
- Candidates of later slots stay valid: every candidate sees the history frozen when the request starts (`ctx.seenLayouts` / `ctx.seenClues`, taken after calibration reuse), while the fold checks its own growing seen sets.
- Lexicographic (slot, attempt) speculation is not acceptable. When most slots succeed at attempt 0, it wastes 3 of 4 workers.
- Speculation changes speed only, never results (§8.2).

**Result statuses:**
- `complete`;
- `partial`, with reason `layouts-not-found` (N-FEWLAYOUTS), `difficulty-not-found` (N-SETLEVEL), `uniqueness-not-proved` (N-UNIQUE) or `time-limit` (N-PARTIAL), see §10.7;
- `cancelled`.

Accepted puzzles are always kept. "No further arrangement exists" may be stated only after an exhaustive enumeration, which v1 never runs; messages say "found within the time limit".

**Message examples** (§10.7):
- "Found 3 of 10 different Hard puzzles within the time limit. This piece set may allow only a few different arrangements — generate a new piece set for more."
- "Found 7 of 10 different Hell-1 puzzles before the 2-minute limit. The piece set was not changed."

**Invariants** (D16):
- New Puzzles never changes the board, the shapes, the colors or K.
- Every accepted puzzle has a new layout key and a new clue key. Clue-only variants of an existing layout are never generated and never count toward q.

### 6.10 Clue selection

```text
selectClues({ board, pieces, layout, target, rng, uniqueness, excludeClueKeys, ws }):
  K ← |pieces|
  G ← clamp(round(target.share · K), 1, K − 2)                      // initial count, §7.4
  candidates ← []                                                  // rated subsets, closest first
  // Phase 1: count-guided sampling (≤ 8 count changes × 4 samples)
  for step in 1..8:
    below ← above ← 0
    repeat 4 times:
      F ← G distinct random pieces of layout, at their layout poses
      if F was tried or clueKey(F) ∈ excludeClueKeys: continue
      r ← rate(board, pieces, F, ws)                               // §7, capped and saturating
      if inBand(r, target): go to finish(F, r)
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
      F ← makeUnique(board, pieces, layout, F, rng, ws, countRows(A))
      if F = null: resume the search with the next candidate   // final reason: 'uniqueness-not-proved'
      r ← rate(board, pieces, F, ws);  if not inBand(r, target): resume the search
      return { ok: true, clues: F, rating: r, certificate: { status: 'unique', model: 'dlx-v1', rowLimit, verified: true } }
    return { ok: true, clues: F, rating: r, certificate: null }     // 'any': certified lazily (§6.11)
  fail('not-in-band')
```

- The level's initial share implements "easy = many pre-placed pieces, nightmare = few"; the score alone decides acceptance, and no monotonicity in G is assumed.
- At most `BUDGETS.clueSubsets` (64) ratings per layout. A saturated rating at 484 cells costs ≤ ~4 s single-threaded (A.10).
- The card shows both the count and the fraction of pre-placed pieces (e.g. "4 pre-placed · 10 %").

```text
makeUnique(board, pieces, layout, F, rng, ws, rowLimit):     // counterexample-guided
  while |F| ≤ K − 2:
    c ← countSolutions(buildModel(board, pieces, F, ws), { cap: 2, rowTrialLimit: rowLimit })
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
| (none yet) | Certificate not computed yet | "Checking…" |
| `unique` | Exhaustive count found exactly 1 raw-coordinate solution | "Unique solution ✓" |
| `multiple` | 2 distinct raw solutions found | "Several solutions" |
| `not-proved` | The count hit its row limit with ≤ 1 solution found | "Uniqueness not proved" |
| `unsatisfiable` | Exhaustive count found 0 | Never generated; an import error ("No solution exists") |

- **Default `any`: lazy certificates** (D14). Every in-band puzzle is accepted without a certificate. After the batch's last accepted puzzle (or when the pool is idle), the scheduler runs `certifyTask` per puzzle, lowest slot first:
  - row limit `countRows(A)` = 10,000 for A ≤ 200 and 2,000 above (cap 2 solutions);
  - results update the cards as they arrive and are stored in the pack;
  - certificates never delay or change acceptance, and they are excluded from the action's time measurements ("first ten usable puzzles" and "certificates settled" are reported separately);
  - an action started by the user (Cancel, new job, Play) terminates pending certificate tasks; their puzzles keep `certificate: null`, shown as "Uniqueness not checked".
- **`require`** ("Require one solution", advanced option). Only puzzles proven `unique` by `makeUnique` are accepted.
  - It is a standard option for A ≤ 200 or levels below Hell. Elsewhere it is offered as "experimental — usually fails on large Hell puzzles": above 200 cells, 639 of 670 Hell-level certificates were "not proved" (A.10).
  - Macro-carved sets make multiple solutions common at some levels (e.g. 10 of 10 at 360-cell master, A.10), so `require` rejects more candidates there.
- **Tie-break (MAY).** When several in-band candidates exist for one slot, prefer one already certified `unique`. Never spend extra search on this.
- **Player.** Any valid complete placement wins, whatever the status. Certificates read from files are shown as "claimed" until this runtime recomputes them; recomputed ones are marked "verified".

---

## 7. Difficulty score and levels

### 7.1 Metrics

All metrics are computed for a board, its set and a clue subset.

| Symbol | Definition | Role |
|---|---|---|
| U | Pieces to place: K − G | Score |
| B | `branchTrials` of the canonical DLX traversal until its first solution, saturating (§7.3) | Score |
| R | Active cells not covered by clues | Diagnostic only |
| L_i | Distinct legal placements of free piece i on the free cells: its row count in the model (§6.6). Clues are considered; other free pieces are ignored. | Diagnostic only |
| H | Mean placement-choice bits: (1 / U) · Σ log2(1 + L_i) | Diagnostic only |

R and H grow with the board area for the same task, which made the Phase-4 formula over-rate large boards (A.10). They are stored in `rating.metrics` for a future, playtest-calibrated model [PT].

### 7.2 Formula: `difficulty-v2`

```text
D = Math.round(2·U + 8·log10(1 + B))           // B = effective value, ≤ 5,000; rounded once, at the end
U = 0 → D = 0.   Any L_i = 0 → unsolvable: reject before rating.
```

| Term | Weight | Intention |
|---|---|---|
| U | 2 per piece | More separate objects to reason about: "fewer pre-placed pieces = harder". |
| log10(1 + B) | 8 per decade | Trial-and-error effort, at most 29.6 points. It carries the ambiguity of small pieces with many placements. |

- With many pieces left (U ≳ 25) B is almost always saturated, so D ≈ 2U + 30 on every board size. Hell levels are then defined by the number of pieces to place.
- The score is a workload estimate, not a promise of human solving time [PT]. Forced placements (B = 0) still score 2U; the playtest fixture of §13.2 tracks this.

**Worked examples** (unit tests):

| U | B (actual → effective) | D | Level |
|---|---|---|---|
| 0 | — | 0 | very-easy (solved state) |
| 3 | 0 | 6 | very-easy |
| 4 | 3 | 13 | normal |
| 5 | 10 | 18 | hard |
| 8 | 0 | 16 | normal |
| 11 | 999 | 46 | master |
| 12 | saturated → 5,000 | 54 | nightmare |
| 40 | saturated → 5,000 | 110 | hell-1 |
| 41 | saturated → 5,000 | 112 | hell-2 |
| 66 | saturated → 5,000 | 162 | hell-3 |

### 7.3 Caps and saturation

- **Caps per rating:** `SCORE.caps.branch` = 5,000 branch trials and `SCORE.caps.rows` = 50,000 row trials.
- **Effective B.** If the traversal finds its first solution, B = min(branchTrials, 5,000). If it stops at either cap first, B = 5,000 and `saturated = true`.
  - Actual `branchTrials`, `rowTrials` and the stop reason are stored separately in `rating.metrics`; at the row cap the actual branch count may be below 5,000.
  - D is exact by definition of this bounded estimator. There is no "≥ D" display and no special acceptance rule: a rating is in band iff min ≤ D < max.
- A saturated rating proves nothing about solvability. Generated puzzles are solvable by construction (their witness).
- A watchdog interruption never produces a rating; the candidate is simply lost.
- Ratings never use wall-clock time, so the same inputs give the same rating on every device.
- Cost, single thread: unsaturated ratings ≤ 32 ms median on every board; saturated ratings 0.06 s (60 cells), 0.5 s median / 1.3 s p90 (360 cells), 0.8 / 2.7 s (484 cells), ≤ 4.2 s worst at 484 and ≈ 3.7–4.2 s per candidate at 676 (A.10).

### 7.4 Level table

Band edges: e_0 = 0 and e_L = round(10 · 1.45^(L − 1.5)) for L ≥ 1. Level L covers [e_L, e_(L+1)); `levelForScore(D)` = max{L : e_L ≤ D}.

| L | id | Label | Score band | Initial clue share g_L |
|---|---|---|---|---|
| 0 | `very-easy` | Very easy | [0, 8) | 62 % |
| 1 | `easy` | Easy | [8, 12) | 54 % |
| 2 | `normal` | Normal | [12, 17) | 46 % |
| 3 | `hard` | Hard | [17, 25) | 38 % |
| 4 | `expert` | Expert | [25, 37) | 30 % |
| 5 | `master` | Master | [37, 53) | 22 % |
| 6 | `nightmare` | Nightmare | [53, 77) | 14 % |
| 7 | `hell-1` | Hell 1 | [77, 112) | 10 % |
| 8 | `hell-2` | Hell 2 | [112, 162) | 6 % |
| 9 | `hell-3` | Hell 3 | [162, 235) | 4 % |
| 10 | `hell-4` | Hell 4 | [235, 341) | 4 % |
| 6 + n | `hell-n` | Hell n | [e_(6+n), e_(7+n)), each band ≈ 1.45 × the previous | 4 % |

- The ratio 1.45 is bounded by the user's examples to 1.38–1.50: 60-cell master must be reachable, 360-cell hard must sit about two levels below it, and 360-cell hell-1 must hold K ≈ 37–42.
- Labels always reflect the actual score (D13). A puzzle that scores outside the offered levels of its board shows its true level; this is rare.

### 7.5 Level availability and the final parameter table

**Availability** (D35). Level L is offered for a board of area A iff A lies in its frozen interval `levels.js: areas`:

| Level | very-easy | easy | normal | hard | expert | master | nightmare | hell-1 | hell-2 | hell-3 | hell-4 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Offered for A in | 30–87 | 32–215 | 36–348 | 41+ | 50+ | 59+ | 81+ | 164+ | 266+ | 450+ | 744+ (never ≤ 676) |

- Each interval runs from the first to the last area (scanned from A = 30, the minimum board) where Kmin(A) − 0.5 ≤ K_mid ≤ Kmax(A) and 2·(Kmax(A) − 1) + 30 ≥ e_L + 8 (the band is reachable with margin). Inside the interval, `pieceCountRange` always returns at least one K (§6.4).
- Resulting range of levels:

  | Area | Lowest level | Highest level |
  |---|---|---|
  | 30–31 | very-easy | very-easy |
  | 32–35 / 36–40 / 41–49 / 50–58 | very-easy | easy / normal / hard / expert |
  | 59–80 | very-easy | master |
  | 81–87 | very-easy | nightmare |
  | 88–163 | easy | nightmare |
  | 164–215 | easy | hell-1 |
  | 216–265 | normal | hell-1 |
  | 266–348 | normal | hell-2 |
  | 349–449 | hard | hell-2 |
  | 450–676 | hard | hell-3 |

- Availability is a preset policy, not a score ceiling. For example, a 60-cell set with K = 13 and one clue can score 54 (nightmare) with a saturated B, but nightmare is not offered at 60 cells.
- Levels outside a board's interval are shown disabled with the reason "needs a larger board" or "needs a smaller board".

**Final parameter table.** One row per level and area band where the level is offered:
- **K** is the union of `pieceCountRange` over the band;
- **Piece sizes** is the union of the size windows;
- **G0** is the initial pre-placed count (the clue search may change it);
- **Node** is the measured maximum set + 10 time on the Phase-5/6 prototypes (Node, 4 worker threads; board in brackets; n/m = not measured, with the expected value from neighbouring cells);
- **Browser plan** = 5 s + 4 × Node (D39).

| Level | Areas (cells) | K | Piece sizes | G0 | Node set + 10, max (s) | Browser plan (s) |
|---|---|---|---|---|---|---|
| very-easy | 30–80 | 5–7 | 3–18 | 3–4 | 0.2 (6×10) | 6 |
| very-easy | 81–87 | 7 | 6–19 | 4 | n/m (≈ 0.3) | ≈ 6 |
| easy | 32–80 | 6–9 | 3–18 | 3–5 | 0.1 (6×10) | 5 |
| easy | 81–130 | 7–10 | 5–22 | 4–5 | 0.3 (10×10) | 6 |
| easy | 131–200 | 9–11 | 7–28 | 5–6 | 0.3 (12×12) | 6 |
| easy | 201–215 | 11 | 10–30 | 6 | n/m (≈ 0.7) | ≈ 8 |
| normal | 36–80 | 7–10 | 3–15 | 3–5 | 2.6 (6×10) | 15 |
| normal | 81–130 | 8–11 | 4–20 | 4–5 | 0.8 (10×10) | 8 |
| normal | 131–200 | 10–13 | 6–28 | 5–6 | 0.9 (12×12) | 9 |
| normal | 201–300 | 11–14 | 9–35 | 5–6 | 0.7 (16×16) | 8 |
| normal | 301–348 | 14–15 | 12–38 | 6–7 | 0.7 (18×18) | 8 |
| hard | 41–80 | 8–12 | 3–12 | 3–5 | 2.4 (6×10) | 15 |
| hard | 81–130 | 10–13 | 4–17 | 4–5 | 1.0 (10×10) | 9 |
| hard | 131–200 | 12–15 | 6–24 | 5–6 | 1.6 (12×12) | 11 |
| hard | 201–300 | 13–17 | 8–31 | 5–6 | n/m (≈ 0.7) | ≈ 8 |
| hard | 301–420 | 15–18 | 10–40 | 6–7 | 1.8 (18×20) | 12 |
| hard | 421–484 | 16–19 | 13–43 | 6–7 | 1.2 (22×22) | 10 |
| hard | 485–576 | 17–20 | 15–48 | 6–8 | n/m (≈ 4.7) | ≈ 24 |
| hard | 577–676 | 19–21 | 17–51 | 7–8 | 4.7 (26×26) | 24 |
| expert | 50–80 | 10–13 | 3–11 | 3–4 | 1.1 (6×10) | 9 |
| expert | 81–130 | 12–15 | 3–15 | 4–5 | 15.1 (10×10) † | 65 † |
| expert | 131–200 | 13–17 | 5–20 | 4–5 | 2.8 (14×14) | 16 |
| expert | 201–300 | 15–19 | 7–27 | 5–6 | n/m (≈ 0.7) | ≈ 8 |
| expert | 301–420 | 17–21 | 9–34 | 5–6 | n/m (≈ 1.8) | ≈ 12 |
| expert | 421–484 | 19–22 | 12–39 | 6–7 | n/m (≈ 1.2) | ≈ 10 |
| expert | 485–576 | 19–23 | 13–44 | 6–7 | n/m (≈ 4.7) | ≈ 24 |
| expert | 577–676 | 20–24 | 15–49 | 6–7 | 1.2 (26×26, K = 28, A2) | 10 |
| master | 59–80 | 12–15 | 3–10 | 3 | 0.9 (6×10) | 9 |
| master | 81–130 | 13–17 | 3–13 | 3–4 | 4.0 (10×10) | 21 |
| master | 131–200 | 15–19 | 4–18 | 3–4 | 3.6 (12×12) | 19 |
| master | 201–300 | 17–22 | 6–24 | 4–5 | 4.7 (16×16) | 24 |
| master | 301–420 | 19–24 | 8–30 | 4–5 | 9.3 (18×20) | 42 |
| master | 421–484 | 21–25 | 10–33 | 5 | 1.4 (22×22) | 11 |
| master | 485–576 | 22–26 | 11–38 | 5–6 | n/m (≈ 3.1) | ≈ 17 |
| master | 577–676 | 23–27 | 13–43 | 5–6 | 3.1 (26×26) | 17 |
| nightmare | 81–130 | 16–21 | 3–11 | 2–3 | 2.5 (10×10) | 15 |
| nightmare | 131–200 | 19–24 | 3–15 | 3 | 29.8 (12×12) † | 124 † |
| nightmare | 201–300 | 21–27 | 5–20 | 3–4 | 11.2 (16×16) | 50 |
| nightmare | 301–420 | 24–29 | 6–25 | 3–4 | 10.2 (18×20) | 46 |
| nightmare | 421–484 | 26–30 | 8–27 | 4 | n/m (≈ 10) | ≈ 45 |
| nightmare | 485–576 | 27–32 | 9–31 | 4 | n/m (≈ 10) | ≈ 45 |
| nightmare | 577–676 | 28–33 | 10–35 | 4–5 | n/m (≈ 10) | ≈ 45 |
| hell-1 | 164–200 | 30–36 | 3–10 | 3–4 | 8.3 (14×14) | 38 |
| hell-1 | 201–300 | 32–40 | 3–13 | 3–4 | 17.9 (16×16) | 77 |
| hell-1 | 301–420 | 35–42 | 4–17 | 4 | 12.0 (18×18); K = 41: 7.6 | 53 |
| hell-1 | 421–484 | 39–42 | 6–19 | 4 | 28.1 (22×22); K = 41: 18.9 | 87 ‡ |
| hell-1 | 485–576 | 39–42 | 6–23 | 4 | 38.4 (24×24) | 109 ‡ |
| hell-1 | 577–676 | 39–42 | 8–26 | 4 | 48.6 (26×26, one seed) | 153 ‡ |
| hell-2 | 266–300 | 46–53 | 3–10 | 3 | n/m (≈ 11) | ≈ 49 |
| hell-2 | 301–420 | 47–58 | 3–13 | 3 | 13.7 (20×20) | 60 |
| hell-2 | 421–484 | 52–61 | 4–14 | 3–4 | 8.3 (22×22) | 38 |
| hell-2 | 485–576 | 54–62 | 4–16 | 3–4 | 15.2 (24×24) | 66 |
| hell-2 | 577–676 | 57–62 | 5–18 | 3–4 | 25.6 (26×26) | 107 |
| hell-3 | 450–484 | 71–80 | 3–11 | 3 | 15.9 (22×22, 32×15; also a 40×12 stress shape, not offered) | 69 |
| hell-3 | 485–576 | 73–86 | 3–12 | 3 | 23.6 (24×24) | 99 |
| hell-3 | 577–676 | 76–90 | 4–13 | 3–4 | 11.5 (26×26) | 51 |

- **Evidence status.** The Node times were measured on prototypes with eager certificates and, for big-piece sets, flat carving with clue variants (A.10). The final pipeline (macro carving, strict layouts, lazy certificates, compact memory) MUST be re-measured by §8.7 before any [BQ] limit is raised. Where both exist, the final pipeline was faster: 360-cell hard 0.3 s and hell-1 3.6–4.6 s (strict macro, 4 workers).
- † Flat-carved, LNS-heavy outliers (μ ≈ 7). Macro carving (μ ≥ 6.5) replaces this regime.
- ‡ With lazy certificates (estimate: set time + batch time × (1 − certificate share of batch CPU)); with eager certificates 117, 159 and 199 s. Hell-1 is the slowest level at ≥ 421 cells, which is why 576 needs BQ-1 and 577–676 stays experimental.
- Piece sizes on large boards at low levels reach 40–51 cells; the player's tray and labels handle this (§11.9).

### 7.6 How the score drives generation

1. **Level → K.** The count formula gives K (§6.4): more pieces at higher levels and on bigger boards.
2. **Level → initial G.** The initial share g_L sets the first number of pre-placed pieces (§6.10).
3. **Acceptance.** Only in-band ratings are accepted, for both the set calibration and every puzzle (§7.3).
4. **Labels.** Every card shows `levelForScore(D)`, worded as an estimate.

### 7.7 Determinism and versioning

- D is a pure function of: board rows, piece shapes, clue cells, caps and model id.
  - Ids, colors, piece order in the file and display rotation do not affect it, thanks to the canonical order (§6.6).
- **Bump the model id** (`difficulty-v3`, …) whenever any of these change: a weight, a cap, a band, the traversal order or pruning, or the counter definitions.
- Stored ratings keep their model id. The player shows stored ratings as claims; an optional "Re-rate" action recomputes them with the current model.

### 7.8 Calibration and playtests

- `difficulty-v2`, its bands and the availability table are **final for release 1**. They were fitted to the user's four examples and to 3,458 measured ratings (A.10).
- `tools/calibrate.mjs` (Node, 4 worker threads) re-runs the score landscape and the table above on the real engine:
  - report score distributions by U and area, the in-band hit rate per (board, level), the saturated share, rating cost and certificate outcomes;
  - acceptance: ≥ 90 % of New-Puzzles requests per offered (board, level) complete with 10 in-band puzzles within the budget of §8.3; output in `docs/calibration/`.
- **Playtests [PT]** (optional, post-release): time and success of human solvers per level, plus a forced-placement fixture (many B = 0 placements). Results MAY justify `difficulty-v3`, using the stored R, H and counters. A new model never relabels stored puzzles.

---

## 8. Performance, workers and budgets

### 8.1 Worker pool and protocol

**Pool.**
- Size: `min(4, navigator.hardwareConcurrency || 4)` module workers, created by:

  ```js
  new Worker(new URL('../workers/engine.worker.js', import.meta.url), { type: 'module' })
  ```

- The pool lives in `core/browser/worker-pool.js`.
- **Recycling** (D38). When the piece set changes (a new set is accepted, imported or restored), the pool terminates and respawns its workers lazily before the next job. This releases allocator pages that a finished set's models leave behind.
- The player uses one worker for verification.

**Messages:**

```ts
// main → worker
{ type: 'task', id: number,
  kind: 'setAttempt' | 'puzzleCandidate' | 'certify' | 'rate' | 'verifyPack' | 'solveFirst',
  payload: object }                     // JSON-compatible: rows, pieces, poses, seed text, labels, budgets
// worker → main
{ type: 'progress', id: number, stage: string, rowTrials: number, bytes: number }  // every BUDGETS.progressEvery row trials
{ type: 'result',   id: number, value: object }
{ type: 'error',    id: number, code: string, message: string }   // e.g. 'model-too-large'
```

**Request tracking (main thread).**
- Each user action (Generate Piece Set, New Puzzles, import verification) gets a monotonically increasing `requestId`, plus the `revision` (a hash) of the board and set it was started for.
- Tasks belong to a request. Results whose request is no longer current, or whose revision no longer matches, are discarded, and their workers are terminated.
- Previously accepted results stay on screen until a replacement is validated.
- Lazy certificate tasks (§6.11) have the lowest priority; any new user action cancels them.

**Inside a worker:** tasks run synchronously to completion, using the worker's workspaces (§8.5).

### 8.2 Deterministic parallelism

- Every task is a pure function of its payload: inputs, seed text, label and deterministic budgets.
- **Piece set.**
  - `setAttempt(j)` is dispatched for j = 0, 1, 2, …, with at most poolSize in flight.
  - When attempt j* succeeds, in-flight attempts j > j* are terminated, while attempts j < j* run to completion (they are bounded by their budgets).
  - The result is the smallest successful j.
- **Batch.** The fold of §6.9 consumes candidates strictly in (slot, attempt) order.
- **Guarantee.** The same request — inputs, seed, algo and policy ids and session history — yields identical sets and puzzles with any pool size (1–4) on any device.
  - A slower device may reach the time limit sooner; it then returns a **prefix** of the same sequence.
- **Never accept "whichever worker finishes first".**

### 8.3 Budgets

All budgets live in `policy.js` (`BUDGETS`, `TIME`). Node budgets are deterministic; time limits act only through the watchdog.

| Key | Meaning | Value |
|---|---|---|
| `TIME.targetMs` | Design target per action (a qualification criterion, not a cutoff) | 60,000 |
| `TIME.dispatchStopMs` | Stop dispatching new tasks; terminate busy workers | 115,000 |
| `TIME.responseMs` | Accepted results are validated, packaged and shown | 120,000 |
| `carveSteps` / `carveTries` | Flat carving: recursion calls per attempt / growth tries per step | 6,000 / 24 |
| `macroPartitions` / `macroSteps` / `sizePlans` | Macro carving: partitions per attempt / recursion calls per part / size plans per part or flat attempt | 30 / 3,000 / 6 |
| `rateBranch` / `rateRows` | Rating caps (§7.3) | 5,000 / 50,000 |
| `countRowsSmall` / `countRowsLarge` | Certificate and `makeUnique` row limit (cap 2 solutions), for A ≤ 200 / A > 200 | 10,000 / 2,000 |
| `clueSubsets` | Rated subsets per layout (sampling + beam) | 64 |
| `lnsSteps` | LNS steps per candidate | 8 |
| `lnsRowsMacro` / `lnsRowsFlat` | Row trials per LNS step (≤ 8 solutions) | 3,000 / 5,000 |
| `restartMaxArea` / `restartBase` / `tilingTotal` | Random restarts: largest area / Luby base / total row trials | 150 / 2,000 / 100,000 |
| `slotAttempts` | Candidates per batch slot | 12 |
| `maxRows` / `maxNodes` | Pre-flight model guards (§6.6) | 600,000 / 5,000,000 |
| `workspaceBytes` / `scratchBytes` / `cacheBytes` | Per worker: main workspace / LNS scratch / optional model cache | 160 MiB / 32 MiB / 32 MiB |
| `verifyRows` | Import verification without a solution | 2,000,000 |
| `progressEvery` | Row trials between progress messages (UI shows ≤ 5 updates/s) | 50,000 |
| `historyKeys` | Session-history layout keys per set | 1,000 |

### 8.4 Cancellation, watchdog and progress

- **Cancel.** Terminate every busy worker of the request and respawn lazily. Response is typically < 100 ms. Accepted results are kept.
- **Watchdog** (D37). Every action has one budget:
  1. at `TIME.dispatchStopMs` (115 s) the scheduler stops dispatching and terminates busy workers;
  2. it validates and packages the accepted results within the remaining 5 s;
  3. it returns them with reason `time-limit` no later than `TIME.responseMs` (120 s).
- **No cooperative slicing.** Workers never use `setTimeout(0)` slicing; the HTML Standard clamps nested timers to ≥ 4 ms, including in workers.
- **Progress UI.**
  - It shows the stage ("Carving piece set — attempt 3", "Puzzle 4 of 10 — rating candidates", "Checking uniqueness"), the accepted count, elapsed time and a Cancel button.
  - Puzzles stream onto the page as soon as the fold accepts them.
- **Main thread.** It never runs generation work and never has tasks > 50 ms other than rendering.
- **No module-worker support.**
  - The generator shows N-NOWORKER (§10.7).
  - The player still plays; solvability is shown as "not verified".

### 8.5 Memory

**Budget** (2 GB per the addendum): planned peak ≤ 1.2 GiB for the page, leaving browser overhead.

| Component | Allowance |
|---|---|
| Main thread (UI, packs, thumbnails) | ≤ 300 MiB |
| Per worker: main workspace (set model, ratings, certificates) | ≤ 160 MiB |
| Per worker: scratch workspace (LNS sub-models) | ≤ 32 MiB |
| Per worker: optional model cache (separate from active buffers) | ≤ 32 MiB |
| 4 workers in total | ≤ 896 MiB |

- **Workspaces** (`workspace.js`). Grow-only typed arrays reused by successive models; never per-row objects (D38). DLX links need 6 `Int32Array`s per node (24 B); row storage adds ≈ 4 B per node and ≈ 12 B per row. A 676-cell, 91-piece model therefore needs ≈ 90 MiB; the guards of §6.6 cap a model at ≈ 150 MiB.
- **Byte accounting.** Each workspace reports its allocated bytes in progress messages. The pool sums them with the main thread's known buffers, and the bench page logs the peak (§8.7).
- **Recycling.** Workers are respawned when the set changes (§8.1).
- **Evidence.** A prototype with per-row JS arrays and maps used 1.6–2.25 GB RSS at 576–676 cells; buffer reuse and recycling alone saved only 0–12 %. A single 676-cell model needed 71 MB of DLX arrays but left 395 MB of process RSS. Architect-2's engine, with typed reusable DLX links (placement rows still JS arrays), measured 1,058 MiB at 676 cells with 91 pieces (A.10).
- **Measurement.** `performance.measureUserAgentSpecificMemory()` needs cross-origin isolation, which GitHub Pages cannot provide. Production code MUST NOT depend on it. The bench harness MAY serve COOP/COEP headers locally to use it; otherwise use the engine's byte accounting plus the browser's task manager (Chrome) or `about:memory` (Firefox).

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
- **Set and batch seeds** (D41).
  - **Generate Piece Set.** The seed text in the field is the set seed (`setSeed`).
    - With 🔒 Keep seed off (the default), every click first draws a new random seed into the field and then uses it.
    - With 🔒 on, the field's seed is reused unchanged.
    - Typing a seed turns 🔒 on. 🎲 draws a new random seed into the field at once.
    - The field therefore always shows the current set's seed.
  - **Batch seeds.** Every New Puzzles or Add more request on a set increments that set's `batchIndex` and uses `batchSeed = setSeed + "#" + batchIndex`.
    - `batchIndex` is 1 for the first batch. It is stored with the set (generator state, §9.6) and restarts at 0 for each new set.
    - The batch seed is internal. It is not editable and not subject to the 64-code-point limit.
    - It needs no extra label: candidates use the labels `slot/<i>/<a>` (§6.9).
- **Test vectors:**

  | Input | Expected |
  |---|---|
  | State (1, 2, 3, 4) | First outputs 11520, 0, 5927040, 70819200 |
  | Seed `demo`, no label | State `0xac19d7fd 0x1f47dc98 0x444f9bb4 0xbbb91ffa`; first outputs 3504561854, 188375601, 1212981724 |
  | `sha256Hex("abc")` | `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad` |

- **Reproduction.** Packs record seeds, levels, options and algo/policy/rng ids (§5.5). "Reproduce" re-runs a request with those inputs.
  - A later batch also needs its session history. With an empty history, the first batch is reproduced.
  - With Keep seed on, the same seed text, board and level reproduce the set. The k-th batch request after it, with the same history, reproduces batch k. A fresh session therefore replays the whole sequence.
  - The same works within one session: Generate Piece Set again with Keep seed on starts a fresh set (`batchIndex` 0, empty session history), so the next New Puzzles reuses `setSeed#1` and reproduces batch 1.
  - Re-running one batch seed against the grown history of the same set cannot repeat that batch: its layouts are already seen (D16). This is why `batchIndex` always increments.

### 8.7 Browser qualification (BQ)

The [BQ] limits ship disabled and are enabled by changing `LIMITS` in `policy.js` once the matching test passes. Every test runs the **final pipeline** (macro carving, strict layouts, lazy certificates, compact workspaces, recycling) with uniqueness `any` and q = 10.

**Harnesses.**
- `tools/bench/index.html`: the real generator engine with a pool of 4 module workers, served over HTTP (locally or from Pages). It runs a seed matrix unattended, records per-run timings, accepted counts, byte accounting and errors, and downloads a JSON report.
- `tools/calibrate.mjs`: the same matrix in Node with 4 `worker_threads`, for fast pre-screening. Node results never replace browser results.

**Measures per run.**
- T1: from the Generate Piece Set click to "ready" (set + calibration puzzle #1);
- T10: from the click to the 10th accepted puzzle (set + New Puzzles); lazy certificates are excluded and reported separately;
- accepted count, partial reason, peak byte accounting, browser task-manager peak (tab + workers);
- certificate outcomes, including "not checked";
- longest main-thread task and the number of tasks > 50 ms. Use `PerformanceObserver` with type `longtask` where supported (Chromium). Elsewhere, use a `MessageChannel` heartbeat every 10 ms and report its maximum delay as a labelled proxy. Thumbnails stay off during runs, so rendering does not count;
- Cancel latency: one extra probe run per matrix cell, excluded from the completion statistics. It clicks Cancel when the first puzzle is accepted and is timed from the click handler to the settled state (workers terminated, UI idle).

**Tests and acceptance criteria.**

| Test | Enables | Platforms | Matrix (≥ 20 seeds per cell; ≥ 60 for hell-1 at the largest area) |
|---|---|---|---|
| BQ-0 | Release 1 at the default limits (484 desktop, 360 phones). Must pass before release. | Desktop: Chromium, Firefox and Safari on the reference machines; phones: the BQ-3 phones for boards ≤ 360 cells | Desktop: 22×22, 32×15, Heart N = 24 at 45° (432 cells) and an irregular 450–484-cell mask with holes × every offered level from hard upward; 6×10 and 12×12 at every offered level. Phones: 18×20 × hard, nightmare, hell-1, hell-2 |
| BQ-1 | `releaseMaxActive` = 576 | Desktop only (the BQ-0 desktop browsers) | 24×24, 32×18 and an irregular 540–576-cell mask × hard, master, nightmare, hell-1, hell-2, hell-3 |
| BQ-2 | Removes the "experimental" label from the large-board switch (577–676 cells; still opt-in, desktop only) | Desktop only (the BQ-0 desktop browsers) | 26×26, 32×21 and an irregular 640–676-cell mask × hard, master, nightmare, hell-1, hell-2, hell-3 |
| BQ-3 | `phoneMaxActive` = 484 | Mid-range Android phone (Chrome) and a 2–3-year-old iPhone (Safari) | Heart N = 22 at 45° (363 cells) × hard, nightmare, hell-1, hell-2; 22×22 and an irregular 450–484-cell mask × hard, nightmare, hell-1, hell-2, hell-3 |

- **Matrix rules.** Every board has 30 to (the limit being enabled) active cells and sides ≤ 32, and is tested only at levels offered at its area (§7.5). For example, hell-3 needs ≥ 450 cells, so it is never requested at 360 or 363 cells; "every offered level from hard upward" means hard–hell-2 at 432 cells and hard–hell-3 at 450–484 cells. Boards ≤ 360 cells on phones are covered by BQ-0.

Pass criteria, for **every** cell of the matrix and every listed browser:
1. T10 median ≤ 60 s and p95 ≤ 115 s; no run answers later than 120 s;
2. ≥ 90 % of runs return 10 of 10 puzzles, and ≥ 99 % return at least 1;
3. peak memory ≤ 1.5 GiB (task manager), byte accounting within §8.5, no `model-too-large` error at an offered level;
4. no main-thread task > 50 ms other than rendering, and Cancel settles in < 200 ms.

- **Reference machines:** a mid-range 4-core (8-thread) laptop with 8–16 GB of RAM for Chromium and Firefox, and a Mac of comparable class for Safari; battery saver off and current browser versions. Record the models, CPUs and browser versions in the report.
- **Partial pass.** If a test fails only at its largest areas, the limit MAY be raised to the largest area whose cells all pass, searched in steps of about 25 cells. A level that fails at an area is never offered there; record the change in `levels.js` with a new policy id.
- **Output.** Reports are stored in `docs/calibration/bq-<date>.md` together with the commit id. Changing a limit or availability requires a passing report.
- **Planning only.** Until reports exist, plans use browser time = 5 s + 4 × Node time; 2.5 × Node is an optimistic sensitivity case (D39).

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
  | 10 puzzles, 676 cells, ~90 pieces | ≈ 9–10k (estimated from the above; within the 16,000-character rule) |

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
- Imported sets that violate `mixed-v2` remain usable. Keys use shape ranks (§6.8). Without `generation.macroRegion`, New Puzzles uses flat-cluster LNS (§6.7).
- The set seed is `generation.setSeed`, or a new random seed when absent. `batchIndex` continues after `generation.batchIndex` (0 when absent), so batch seeds of the source pack are not replayed (§8.6).

### 9.5 Verification on import

The `verifyPack` worker task checks each puzzle:
- **With a valid `solution`:** solvable (verified) in O(cells), with no search.
- **Otherwise:** a bounded `solveFirst` with `verifyRows` gives solvable / unsatisfiable (only if exhausted) / not verified.

Play is allowed while checking, and after an inconclusive check. "Not verified" is never shown as "no solution". Ratings and certificates from files stay "claimed" (§6.11, §7.7).

### 9.6 Storage

| Key | Content | Limit |
|---|---|---|
| `pentomino:v1:gen:state` | Generator state: board, rotation, level, options, seed and Keep-seed flag, set + witness + `batchIndex`, batch, session-history keys | 1 entry |
| `pentomino:v1:lib:index` | `[{ packId, title, createdAt, lastOpened, puzzles, solved }]` | 30 packs, LRU |
| `pentomino:v1:lib:<packId>` | Pack JSON (`packId` = first 16 hex of SHA-256 of the canonical core content) | — |
| `pentomino:v1:progress:<fp>` | Progress record (§5.6) | 300 entries, LRU |
| `pentomino:v1:prefs` | UI preferences: labels, patterns, timer, Straighten view, "Large boards (experimental)" | 1 entry |

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
│ └────────────────────────────┘     │ Uses 9–11 pieces here      │ [Export set]           │
│ 60 active cells · connected        │ Advanced ▸ seed, unique…   │                        │
│                                    │ [ Generate Piece Set ]     │                        │
├────────────────────────────────────┴────────────────────────────┴────────────────────────┤
│ ④ Puzzles  quantity [5]  level [Hard ▾]  [ New Puzzles ] [Add more]  ▶ Play all ⬇ Export 🔗│
│ ┌card┐ ┌card┐ ┌card┐ …        ▓▓▓▓░░ "Puzzle 3 of 5 — rating candidates" 0:12  [Cancel]  │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

### 10.2 Board panel

- **Size.** Columns (W) and rows (H), each from 3 to `LIMITS.maxSide` (32). Users may think in rows × columns (e.g. "6×10" = 6 rows of 10 cells); the inputs are labeled explicitly.
  - If the board has edits, a resize asks for confirmation first.
  - Cells inside the new bounds keep their state; new cells are active.
- **Presets.** As in §6.2, with an N or W/H parameter. A preset also sets the display rotation (Heart and Diamond: 45).
- **Painting.**
  - Pointer-down on a cell toggles it and fixes the paint mode for the gesture: block or unblock, the new state of the first cell. Hit-testing uses edit mode (§6.3), so blocked cells (holes and exterior guides) can be hit and unblocked at any display rotation.
  - Dragging applies that mode. One gesture is one undo step (50-step undo).
  - Keyboard: arrows move a cell cursor; Space toggles the cell.
  - Painting is disabled while a job runs.
- **View rotation.** ⟲45 sets `rotation += 45` and ⟳45 sets `rotation −= 45` (mod 360).
  - It never invalidates sets or puzzles.
  - "Edit unrotated" shows θ = 0 while painting.
- **Trim margins.** Removes fully blocked outer rows and columns. It is an explicit board edit (D6).
- **Status line.**
  - Shows the active-cell count against the enabled maximum (e.g. "412 / 484 playable squares"), connectivity, the offered levels, and errors/warnings from `validateForGeneration`, with offending cells highlighted.
  - Above 360 cells: "Large board: generation can take up to 2 minutes" (N-LARGE).
- **Large boards (experimental)** (Advanced, desktop only). Off by default. When on, the enabled maximum becomes 676 cells; boards above the normal desktop limit (484, or 576 after BQ-1) show N-EXPERIMENTAL in the status line. The switch is stored in `pentomino:v1:prefs`. When BQ-2 passes, the "experimental" label and N-EXPERIMENTAL are removed; the switch stays opt-in.
- **Stale results.** The first board edit after a set exists asks for confirmation. After it, the set and its puzzles are greyed out: "Board changed — generate a new piece set". Accepted puzzles can still be played or exported until they are replaced.

### 10.3 Level panel

- **Level list.** Shows the offered levels for the board's area (§7.5). Other levels are disabled, with the reason ("needs a larger board" / "needs a smaller board").
- **Piece count.** A live text from `pieceCountRange` and g_L, such as "Uses 16–18 pieces of 12–34 squares · about 38 % pre-placed".
- **Advanced** (collapsed):
  - seed text (the set seed), with 🎲 (new random seed now) and 🔒 Keep seed. With 🔒 off (default), every Generate Piece Set first draws a new random seed. With 🔒 on, the seed is reused. Typing a seed turns 🔒 on (§8.6);
  - "Require one solution" (off by default). Outside A ≤ 200 or below-Hell levels it carries the note "experimental — usually fails on large Hell puzzles" (§6.11);
  - "Large boards (experimental)" (§10.2);
  - "Omit solutions in exported files".
- **Generate Piece Set** starts the set job (§6.5, §8.2).

### 10.4 Piece-set panel

- **Thumbnails.** Drawn in the board's display rotation, with label and size, sorted by id.
- **Summary.** For example "9 pieces · sizes 4–9 · Ready for Hard ✓". It may also show "Unclued benchmark 43 (not a limit)", the score of the set with no pre-placed pieces (for 9 pieces at most 2·9 + 8·log10(5001) ≈ 48).
- **Show solution.** Overlays the witness on the board preview.
- **History.** ◀ ▶ step through the last 5 sets.
- **Export set** writes a `piece-set` file that includes the witness.

### 10.5 Puzzles panel

- **Quantity** is 1–10 (default 5). **Level** defaults to the set's level; any offered level is allowed. The set is kept, and puzzles are calibrated for the chosen level. A level far from the set's own level may be unreachable with this set's piece count; the batch then ends with N-SETLEVEL and offers a new piece set.
- **New Puzzles** replaces the visible batch; earlier puzzles stay in the session history, so they are never repeated. **Add more** appends to the batch. Each such request increments the set's `batchIndex` and uses `batchSeed = setSeed + "#" + batchIndex` (§8.6).
- **Cards** stream in. Each shows:
  - a rotated thumbnail;
  - a title "<level> #n", where n is the card's position in the visible batch, e.g. "Hard #3". Add more continues the numbering;
  - the score ("20", inside the hard band [17, 25)) and the level chip;
  - "3 pre-placed · 33 %" (3 of the 9 pieces);
  - the certificate badge (§6.11), first "Checking…", then the lazy result.
- **Card actions:** ▶ **Play** (an `<a href>`), 🔗 Copy link, ⬇ Export, 🗑 Remove.
- **Batch actions:** ▶ Play all, ⬇ Export pack, 🔗 Copy pack link. Pending certificates do not block them; exported packs carry whatever certificates are known.
- **While running:** progress and Cancel. A partial result shows its reason (§6.9, §10.7) and, for `layouts-not-found` and `difficulty-not-found`, a **Generate new piece set** button.

### 10.6 States and invalidation

```text
editing ──Generate Piece Set──► generating-set ──ready──► set-ready ──New Puzzles──► generating-puzzles ──► puzzles-ready
   ▲            └─ fail / cancel → editing (message)          ▲            └─ partial / cancel: keep accepted ─┘
   └──────────── board edit: set and puzzles become stale ─────┘
```

- A view-rotation change invalidates nothing.
- A level or uniqueness change keeps the set. Its calibration is then marked "for <previous level>", and New Puzzles calibrates anew. Existing cards keep their own labels.
- Only one job runs at a time. Every action except Cancel and navigation is disabled during a job. Lazy certificate checks are not a job: they run in the background and stop when a new job starts.
- The state is saved to `pentomino:v1:gen:state` (debounced 300 ms) and restored on load.

### 10.7 Notices (`generator/strings.js`)

| Code | Text |
|---|---|
| N-COUNT | "This board uses {kmin}–{kmax} pieces at {level}, about {share} % pre-placed." |
| N-LEVELS | "Levels above {highest} need a larger board." / "Levels below {lowest} need a smaller board." |
| N-PARTIAL | "Found {n} of {q} different {level} puzzles within the time limit. The piece set was not changed." |
| N-FEWLAYOUTS | "Found {n} of {q} different {level} puzzles. This piece set may allow only a few different arrangements — generate a new piece set for more." |
| N-SETLEVEL | "Found {n} of {q} {level} puzzles: other arrangements of this piece set did not reach {level} difficulty. Try again, or generate a new piece set for {level}." (`difficulty-not-found`; typical after choosing a level far from the set's own level) |
| N-NOSET | "Couldn't create a {level} piece set for this board within the time limit. Try again, choose another level, or change the board." |
| N-UNIQUE | "Found {n} of {q} {level} puzzles with exactly one solution. Turn off 'Require one solution' or choose another level." |
| N-UNIQUE-EXP | "On large Hell puzzles, 'Require one solution' is experimental and usually fails." |
| N-LARGE | "Large board: generation can take up to 2 minutes." |
| N-EXPERIMENTAL | "Experimental: boards above {limit} squares may not finish all {q} puzzles within 2 minutes." |
| N-CAP | "This board has {area} playable squares; the limit on this device is {max}." |
| N-SMALL | "A board needs at least 30 playable squares to generate puzzles." |
| N-TOOLARGE | "This board and level need more memory than allowed. Choose a smaller board or a lower level." (`model-too-large`) |
| N-STALE | "Board changed — generate a new piece set." |
| N-LONGLINK | "This link is long; some apps may cut it. Use Export file to share." |
| N-NOWORKER | "This browser cannot run the generator (module workers are required)." |

---

## 11. Player application

### 11.1 Layout

```text
┌ ☰ Pack ▾ │ Hard #2 · score 20 │ ⏱ 03:12 │ 17 moves │ ↶ ↷ │ ⟲ Reset │ ⤢ Straighten │ ⤓ Import ┐
├──────────────────────── Board (SVG, display rotation θ) ─────────────┬──── Tray (SVG, θ) ──────┤
│      clues hatched + lock icon; ghost shows the drop position         │  A   B   D   F   …       │
├───────────────────────────────────────────────────────────────────────┴─────────────────────────┤
│ Selected: F   [⟲] [⟳] [⇋] [⇵] [Place] [↩ to tray]                          7 pieces left        │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

- Below 900 px: a compact top bar, then the board, the selection toolbar, and the tray (2 rows, horizontal scroll).
- Large boards (hundreds of cells, up to ~90 pieces): the board supports zoom and pan (drag on empty board area or two-finger pan), and the tray scrolls.
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
  - An upright label on the cell nearest the centroid, colored with `textColorFor`, subject to the Labels toggle (see **Display toggles** below).
- **Clues.** A diagonal-hatch overlay and a lock icon. Clues are neither focusable nor draggable.
- **Palette** (`BASE_COLORS`, Trubetskoy's 20 distinct colors, used in id order):
  `#e6194b #3cb44b #ffe119 #4363d8 #f58231 #911eb4 #42d4f4 #f032e6 #bfef45 #fabed4 #469990 #dcbeff #9a6324 #fffac8 #800000 #aaffc3 #808000 #ffd8b1 #000075 #a9a9a9`.
  - For index ≥ 20, `colorFor(i)` generates colors: hue = (i · 137.508°) mod 360, saturation 65 %, lightness alternating between 45 % and 65 %.
- **Labels.** `labelFor(i)`: A … Z, then AA, AB, …, AZ, BA, … (spreadsheet-style, ≤ 4 characters). Sets reach about 90 pieces on 676-cell boards.
- **Patterns** (D30). When K > 20, every piece with index ≥ 20 also gets a fill pattern: `patternFor(i)` cycles dots, horizontal lines and vertical lines by ⌊i / 20⌋. Patterns are drawn at low contrast in the stroke color, never as diagonal hatching (reserved for clues), at every zoom level, subject only to the Patterns toggle.
- **Display toggles.** Two independent switches in the player's ☰ menu (View section). Both are stored in `pentomino:v1:prefs` (§9.6), and the generator's previews follow the same values.
  - **Labels** (default on) shows letters on pieces on the board and in the tray. When on, a label is drawn only where its cell is ≥ 10 CSS px at the current zoom; smaller ones appear once the user zooms in. Accessible names (§11.11) always include the label.
  - **Patterns** (default on; the switch is shown only when K > 20) shows the fill patterns above.
  - Neither switch affects the other: hiding labels never hides patterns, and hiding patterns never hides labels.
  - Letters guarantee identity even when two colors look alike. Patterns keep pieces with index ≥ 20 apart when labels are off or too small to draw.
- **Large boards.** Pieces of up to ~50 cells and trays of up to ~90 pieces are normal on large boards. The tray scrolls. Labels follow the size rule of the Labels toggle.

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
- Focus rings are always visible, and UI contrast is ≥ 4.5:1. Letters (on by default) and hatching remove any reliance on color.
- Reduced motion is respected, and the whole game can be completed with the keyboard alone.

### 11.12 Pack navigation and library

- The **☰ Pack** menu lists the pack's puzzles with level, score and status (new / in progress / solved ✓ / revealed), plus previous/next buttons. Its **View** section holds the Labels, Patterns and Timer switches (§11.9, §11.10).
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
- Every module loaded by a browser page or worker uses the `.js` extension (D42). This covers the apps, `core/`, `tests/browser/` and `tools/bench/`. `.mjs` is reserved for Node-only tools, because some static servers send `.mjs` as `text/plain`, which browsers refuse for module scripts.
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
| `board` | Rows round-trip. Regions. Exterior vs. hole classification. Symmetry counts: rectangle 4, square 8, Heart 2 — still 2 with blocked margins. Preset cell counts: Heart N = 10 → 75 (73 with round lobes); Diamond 64; Ring 60. Validation errors: < 30 cells, above the enabled cap, disconnected, side > 32. `enabledMaxActive` for the device classes of §6.2. |
| `view` | Screen flips and rotations match a geometric reference for 8 angles × 8 orientations (0 mismatches). Arrow mapping is exact at multiples of 90° and follows the tie rule at 45°. Extents: 6×10 at 45° → 11.31 × 11.31; Heart N = 10 → 14.14 × 10.61. Heart notch on top at 45. Board → screen → board round-trip. Fit clamps. |
| `workspace` | Buffers grow and are reused (no reallocation for a smaller model). `countModel` equals the built model's rows and nodes. The guards throw `model-too-large` above 600,000 rows or 5,000,000 nodes, before any large allocation. |
| `dlx` | Knuth's small example. Limits unwind and restore (two solves give identical results). `branchTrials` excludes forced rows. Seeded solutions are valid covers. Results are identical with a fresh and a reused workspace. |
| `tiling` | Golden pentomino counts: 3×20 → 8 (fast); 4×15, 5×12, 6×10 (slow). Blocked cells and clues. Certificate statuses, including a cutoff → `not-proved`. Symmetric pieces are not double-counted; mirrored raw solutions count as distinct. A small brute-force oracle agrees on random tiny instances. `lnsStep` returns a valid, different layout that changes only the cluster. |
| `policy` | `kMin`/`kMax` and `minAreaForCount` tables (§6.4). `pieceCountRange` reproduces the anchor rows: 60 → very-easy 6–7, easy 7–8, normal 8–9, hard 9–11, expert 11–12, master 12–13; 360 → hard 16–18, expert 18–20, master 20–23, nightmare 25–28, hell-1 37–42, hell-2 50–56; 484 → hell-3 73–80; 676 → hell-3 80–90. Not-offered levels return null. `histogramFeasible` agrees with a brute-force DP on random (A, K). `planSizes` output always satisfies the window, availability and small cap, and sums to A. |
| `levels` | Band edges 0, 8, 12, 17, 25, 37, 53, 77, 112, 162, 235, 341. `levelForScore` boundaries, including generated Hell-n. Availability intervals (§7.5) and their contiguity for A = 30..676; `pieceCountRange` is non-empty everywhere inside them. |
| `carve` | 50 seeds × (6×10, 8×10, Heart-75, Ring-60, 18×20 at hard): exact partition, distinct keys, sizes inside the window, connected, hole-free, small-piece cap respected. Macro carving at μ ≥ 6.5 on 6×10 (K = 8) and 18×20 (K = 18) yields sets with ≥ 2 layout keys in ≥ 90 % of seeds. After a macro partition fails, the next one starts with no pieces, no shape keys and the full small-piece budget ⌊0.4·K⌋. `validateSet` rejects each injected defect (overlap, hole, duplicate shape, size outside the window). The same seed gives the same set. |
| `keys` | Layout keys are invariant under board symmetries, so reflected layouts are duplicates. A clue-only change is not a new layout. Distance values. `progressFingerprint` differs for reflected clues (A.9 counterexample). |
| `difficulty` | Worked examples of §7.2. Saturation at 5,000 branch trials and at 50,000 row trials (effective B = 5,000, actual counters stored). Permuting ids, colors or piece order leaves the rating unchanged. Forced-placement fixture: a puzzle solvable without branching scores 2U [PT]. |
| `clues` | Always 1 ≤ G ≤ K−2. Initial G follows g_L. `require` mode returns only exhaustively proven unique puzzles. No in-band subset → failure, never a mislabel. 'any' mode returns `certificate: null`. |
| `generate` | Fold determinism: identical output for pool sizes 1 and 4 and shuffled completion orders (simulated). New layout AND clue keys; no clue-only variant is ever accepted. The best-distance fallback fills a slot whose candidates were all "too close" with the farthest valid one (`bestDistance`; ties keep the earliest attempt). Partial status, its reason and the prefix property. The calibration puzzle is reused as #1. Lazy `certifyTask` results do not change accepted puzzles. Speculation priority: with a simulated pool of 4 where every attempt 0 is accepted, q = 10 needs 3 dispatch rounds. Batch seeds follow `setSeed#batchIndex`; two consecutive batches on one set use different seeds and both return new layouts; a fresh session with the same seed reproduces batch 1. |
| `palette` | `labelFor`: 0 → A, 25 → Z, 26 → AA, 701 → ZZ, 702 → AAA. `patternFor` is 'none' for K ≤ 20. Generated colors are valid `#rrggbb`. |
| `pack` | The §5.2 fixture validates and round-trips. Rejects: wrong format; version 0, −1, 2 or "1"; unknown fields; bad rows; overlapping clues; an invalid solution; oversized input. Accepts the classic 12 pentominoes on 6×10, a piece with a hole (warnings only), `difficulty-v1` ratings (as claims) and a 90-piece pack. `omitSolutions` works. |
| `sharecode` | `1z` / `1j` round-trips (Node ≥ 22 has `CompressionStream`). A decompression bomb is aborted at 256 KiB. `extractCode` finds codes in surrounding text. |
| `game` | place / move / remove / orient / undo / redo / reset. `canPlace` reasons. A moving piece's old cells are excluded. A non-witness tiling wins. Clues are immutable. Restoring progress drops invalid moves. |

### 13.3 Browser acceptance checklist

Run on desktop Chromium, Firefox and Safari, on Android Chrome and on iOS Safari. Optional dev-only Playwright smoke tests can come later.

1. `/pentomino/` lands on the generator. Shared modules and workers load under the prefix.
2. Default board → piece set → 5 puzzles → Play: the player shows the same pieces and clues.
3. The Heart preset shows as a heart at 45° in both apps. In the editor, clicking a blocked cell of the notch (at 45° and at 0°) unblocks it, and dragging re-blocks cells.
4. Drag, tap-place, rotate, flip and the keyboard all work at 0°, 45°, 90° and 315°, including on scrolled and zoomed pages.
5. Export a file, then import it in another browser profile. Paste a link.
6. Complete a puzzle with the keyboard only. Screen-reader smoke test.
7. An invalid drop and `pointercancel` leave the previous state unchanged.
8. Cancel responds during a long job, and accepted puzzles remain.
9. With storage disabled, an oversized link falls back to `#lib` or a file.
10. A valid tiling different from the stored solution wins.
11. No score, uniqueness or solvability claim appears after an inconclusive check.
12. A 22×22 Hell-3 pack (≈ 75 pieces) shows labels beyond Z, patterns, a scrolling tray, and stays playable with zoom and pan. Turning Labels off keeps the patterns; turning Patterns off keeps the labels.
13. The area cap and N-CAP follow the device class (§6.2); the experimental switch raises it to 676 on desktop only.
14. A job that reaches 115 s returns its accepted puzzles by 120 s with reason `time-limit`.

### 13.4 Performance and calibration

- Performance is qualified by the browser tests of §8.7 (BQ-0 before release; BQ-1 to BQ-3 to raise limits), not by CI.
- `tools/calibrate.mjs` re-checks the score landscape and the §7.5 table on the real engine (§7.8).
- A nightly or manual job MAY re-run a small Node benchmark subset (60, 360 and 484 cells at hard and hell-1) to catch regressions of more than 25 %.

---

## 14. Risks and edge cases

### 14.1 Risks

L = likelihood, I = impact.

| Risk | L | I | Mitigation |
|---|---|---|---|
| Browsers are slower than planned, so a [BQ] limit never qualifies | M | M | Release at 484 / 360; raise limits only on passing reports (§8.7); partial-pass rule; the watchdog always answers by 120 s |
| Big-piece Hell-1 on ≥ 484 cells is the slowest regime (up to 48.6 s Node at 676 cells) | H | M | Lazy certificates, compact memory, macro LNS; 577–676 stays experimental until BQ-2 |
| Memory exceeds the budget on large boards | M | H | Compact workspaces, pre-flight guards, byte accounting, recycling; BQ memory criterion |
| Macro carving behaves worse on Hearts and irregular masks than on the measured rectangles | M | M | BQ-0 matrix includes Heart and irregular masks; flat carving fallback; `validateSet` |
| Macro structure is noticeable or makes puzzles feel easier [PT] | M | L | Invisible boundaries; broadened LNS steps; playtests may tune `macroPartition` under a new algo id |
| Near-duplicate puzzles (distance 2) | M | L | Distance preference clamp(⌈K/4⌉, 3, 10); fallback only when nothing farther was found |
| A piece set allows few arrangements, so batches are partial | M | L | Macro carving; honest N-FEWLAYOUTS message with a "new piece set" button |
| The score disagrees with human perception, e.g. forced placements on large boards [PT] | M | M | "Estimate" wording; diagnostics stored; playtests; versioned model |
| Heavy-tailed search times | M | M | Caps, local LNS, restarts only on small boards, witness reuse, deterministic budgets |
| Display-only rotation confuses users (pieces still turn by 90°) | M | L | WYSIWYG tray, screen-space controls, axis hints, Straighten view |
| Cells too small at 45° on phones or large boards | M | M | Fit rule, zoom, pan, Straighten view, phone area cap |
| Many pieces are hard to tell apart | M | L | Labels beyond Z, patterns, generated colors, scrolling tray |
| Long links get truncated | L | L | 16k limit, warning, file export, `#lib` fallback |
| Shared-origin storage and quota | L | L | Namespace, LRU, try/catch |
| Mixed old/new modules after a deploy | M | L | Whole-graph `?v=` stamping; no service worker |
| Seeds stop reproducing after algorithm changes | M | L | `algo`, `policy`, `rng` and model ids recorded in packs |
| Malicious or corrupt imports | L | M | Staged validation, size limits, `textContent`, CSP |
| Browser lacks module workers or (De)CompressionStream | L | M | Feature detection, clear messages, `1j` codes, file import |

### 14.2 Edge cases

1. A board with < 30 active cells, a disconnected board, or one above the enabled limit or 32 cells per side: generation is disabled and the offending cells are highlighted (N-SMALL, N-CAP).
2. Every board of 30–676 cells offers at least one level (§7.5).
3. Carving fails within the time limit: show N-NOSET. Never say "impossible".
4. Tight boards with few distinct layouts: return a partial batch with N-FEWLAYOUTS. Never pad it with clue-only variants.
5. Symmetric boards: duplicates under symmetry are rejected by key. Uniqueness counts raw coordinates.
6. Symmetric pieces: their rows are deduplicated and `canonicalT` is stored.
7. `require` at Hell levels on large boards usually fails: N-UNIQUE-EXP before, N-UNIQUE with the partial result after.
8. Editing the board after a set exists marks the set stale. Changing the level recalibrates on New Puzzles; if the kept set cannot reach the new level, the batch ends as `difficulty-not-found` with N-SETLEVEL.
9. Cancelling a batch keeps the accepted puzzles; pending certificates stay "not checked".
10. Imports:
    - without a solution → verify in a worker;
    - proven unsatisfiable → an error state;
    - inconclusive → playable as "not verified";
    - sets without `macroRegion` use flat-cluster LNS for New Puzzles.
11. Non-standard imported sets (duplicate shapes, pieces < 3 cells, holes) are playable with a notice. A pack with zero clues is playable too; the generator never produces one.
12. An unknown version or rule set: show "unsupported" and store nothing.
13. Progress saved for a different puzzle with the same id is not applied, because the fingerprints differ.
14. No room to rotate a placed piece: shake and leave it unchanged. A drop partly outside or overlapping reverts.
15. A resize or orientation change during a drag cancels the drag.
16. Two tabs: the last write wins. Storage unavailable: play continues in memory and export is offered.
17. 21–90 pieces: generated colors, labels beyond Z and patterns; the tray scrolls.
18. Holes are drawn hatched; exterior cells are not drawn, so a heart reads as a heart.
19. A model exceeds the guards (`model-too-large`): N-TOOLARGE; the job ends with the accepted results.

---

## 15. Implementation plan

Implementation phases are numbered **I0–I8**. Every value in this document is final except the [BQ] limits (§8.7), which ship at their fallback values.

| Phase | Tasks | Acceptance criteria |
|---|---|---|
| **I0 Foundation** | Skeleton folders; `index.html` + `redirect.js`; `package.json`; `pages.yml` with guarded steps; placeholder generator and player pages importing `core/engine/version.js`; a simple `tools/check-site.mjs` | `/pentomino/` redirects to the generator on Pages; both apps load `core` relatively; CI green |
| **I1 Core math** | `hash`, `rng`, `geometry`, `board` (presets, `enabledMaxActive`), `view`, `palette` (labels beyond Z, patterns) | §13.2 suites pass: vectors, A000105, rotation algebra, presets, labels |
| **I2 Solver** | `workspace` (grow-only buffers, `countModel`, guards); `dlx` on flat typed rows; `tiling` (model, `solveFirst`, `countSolutions`, `randomTiling`, `lnsStep`/`lnsWalk` with macro and flat clusters, `isValidLayout`); `keys` | Golden counts; oracle agreement; certificate statuses; workspace reuse gives identical results; guards fire before allocation |
| **I3 Generation engine** | `policy` (`mixed-v2`: counts, window, histogram feasibility, `planSizes`, budgets, time) and `levels` (bands, shares, availability); `carve` (flat, `macroPartition`, `carveMacro`, `validateSet`); `difficulty` (`difficulty-v2`, saturation); `clues`; `generate` (`setAttempt`, `puzzleCandidate`, strict fold with best-distance fallback, `certifyTask`); `tools/generate.mjs` CLI; `tools/calibrate.mjs` (Node pool of 4) | Fixed seeds give identical packs; fold determinism; policy anchor rows of §13.2; CLI output passes `validatePack`; `calibrate.mjs` reproduces the §7.5 table within ± 1 piece and its Node times within 2× |
| **I4 Format and hand-off** | `pack` (policy `mixed-v2`, `difficulty-v1` claims accepted), `sharecode`, `storage`, `handoff` | Round-trips, rejection cases, decompression-bomb guard, fixture, 90-piece pack |
| **I5 Generator app** | `engine.worker` and `worker-pool` (pool of 4, recycling on set change, cancel, watchdog 115 s / 120 s, revision checks, lazy certificate queue, byte accounting); `svg-board` with rotation, zoom and pan; board editor (paint, presets, view rotation, edit-unrotated, trim, undo, device caps, experimental switch); level, set and puzzle panels; progress; notices; persistence; Play and Export; `tools/bench/` page | Board → set → 10 puzzles → Play works for 6×10, Heart N = 10 and 22×22 Hell-3; Cancel < 200 ms (§8.7); a 115 s stop answers by 120 s; reload restores state; no main-thread long tasks |
| **I6 Player app** | Import view (hash, file, paste, recent, sample); `verifyPack`; `game` reducer; board and tray rendering with θ; pointer drag/tap; keyboard; screen-space rotate/flip; undo/redo/reset; win dialog; progress; pack navigation; patterns and long labels; accessibility | §13.3 items 2–12; alternative tilings win; rotated boards fully playable |
| **I7 Release** | Whole-graph `stamp-version.mjs`; `check-site` in CI; CSP review; browser matrix; **BQ-0** on the reference machines and phones; README and help | Deployed site passes §13.3; BQ-0 report in `docs/calibration/`; no critical axe findings |
| **I7b Limit qualification** (after release, independent) | **BQ-1**, **BQ-2**, **BQ-3** runs; raise `releaseMaxActive`, graduate large-board mode or `phoneMaxActive` only on passing reports | Reports per §8.7; limit changes reference them |
| **I8 Post-MVP** | Proven hints and Show solution (§11.13); optional Playwright smoke tests; playtests and a possible `difficulty-v3` [PT]; optional "same arrangement, different clues" activity only if the user asks for it (never inside New Puzzles) | Hints never state unproved facts (A.9 regression test) |

**Dependencies and parallel tracks:**
- I1 → I2 → I3 is the engine track.
- I4 needs only I1.
- The I5 UI shell (editor, rendering) can start after I1 using mocked results.
- The I6 shell can start after I1 + I4.
- `tools/bench/` (I5) is needed for BQ-0 (I7); BQ-1 to BQ-3 do not block release.

---

## Appendix A. Evidence summary

All measurements were taken on the architects' throw-away prototypes (Node 24, Windows) unless stated otherwise; A.1–A.9 are single-threaded. They are evidence for decisions, not browser guarantees. A.1–A.9 are Phase-1–4 evidence (A.8 motivated `difficulty-v2`); A.10 summarizes the Phase-5/6 studies.

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

**A.8 Phase-4 formula on addendum-scale boards** (historical; superseded by `difficulty-v2`, §7)
- Caps: B ≤ 50,000 branch trials and 500,000 row trials.
- Each case used 3 random clue subsets, with G taken from the Phase-4 clue shares.

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

**A.10 Phase-5/6 evidence (addendum studies and cross-reviews)**

Sources: `5-addendum-study-architect-1.md` (P5-A1), `5-addendum-study-architect-2.md` (P5-A2), `6-review-of-architect-2.md` (P6-A1), `6-review-of-architect-1.md` (P6-A2). Both prototypes ran outside the repository on the same host: AMD EPYC 7763 VM (8 cores / 16 threads), Windows, Node 24.21.0, 4 `worker_threads`, `--max-old-space-size=2048`. These are Node measurements, not browser measurements.

| Topic | Evidence | Used for |
|---|---|---|
| Score over-rating | Phase-4 formula: 360 cells, K 15–18, G 5–8 (the user's "hard") scored expert; K 40–45 scored hell-5. With `difficulty-v2`: hard and hell-1. Architect-2's formula with R and H rated an 18-piece, 360-cell set with 1–2 clues as hell-1 and needed 13–17 clues (33–43 %) for 40-piece hell-1; their own data had more clues at 360-cell hell-1 (16) than at hard (9–11). 3,458 Stage-A ratings. | D10, D12 (P5-A1 §3; P6-A1 D1) |
| User examples | 60 cells: easy K 7–8 (G 3–4, D 8–11); master K 12–13 (D 37–45, 10/10 puzzles). 360 cells: hard K 17 (G 6–7, D 20–24), normal not offered; hell-1 K = 41 reproduced by both prototypes: 10/10 puzzles in 5.8–7.6 s (P6-A1) and 3.58 s (P6-A2). | D9, §7.5 |
| Feasibility | Only 7 shapes of 3–4 cells exist; minimum areas of §6.4; with a 30 % cap, 13 pieces need exactly 60 cells, so the 40 % cap was kept; the old spread rule made 484 cells / K = 80 infeasible (486 cells needed). | D32 (P5-A1 §2; P5-A2 §2.1; P6-A2 D6-04) |
| Single arrangement | Flat-carved sets with μ ≥ 7.5: 26 of 28 had exactly one arrangement. LNS from such witnesses succeeded in 0 % of steps. | D33 (P5-A1 §5) |
| Macro carving | Both prototypes, same settings: 60 cells K = 8 → 10/10 distinct puzzles in ≤ 0.1 s (flat: 1–2 puzzles); 360 cells K = 17–21 → 10/10 in 0.3–0.9 s; 360 cells K = 37–41 → 10/10 (3.6–4.6 s on 4 workers; 31–34 s single-threaded). Minimum layout distance 2–8 (14–18 at hell-1); proved multiple solutions in 5–8 of 10 (60-cell easy) and 10 of 10 (360-cell master). | D16, D17, D33 (P5-A2 §4; P6-A1 D6; P6-A2 D6-01) |
| Time by area | Worst set + 10, Node, eager 2,000-row certificates: 484 cells hell-1 24.6 / 28.1 s (median / max); 576 cells hell-1 29.3 / 38.4 s; 676 cells hell-1 44.2–48.6 s (one seed); hell-2/3 ≤ 25.6 s. Certificates were 33–53 % of hell-1 batch CPU; lazy-certificate estimates: 484 → 20.4 s, 576 → 26.1 s, 676 → 36.9 s (max). Browser plan (5 s + 4×): 87, 109, 153 s. Architect-2's hell-4 runs (K = 91, μ = 7.4): 676 cells 7.1 / 8.5 s with 1,058 MiB RSS. | D36, D37, §7.5 (P5-A1 §6; P5-A2 §6.1; P6-A1 D5; P6-A2 D6-05) |
| Memory | Prototype with per-row JS arrays: 1.6–2.25 GB RSS at 576–676 cells; buffer reuse + recycling saved 0–12 %; a smaller worker heap changed nothing. One 676-cell, 91-piece model: 348k rows, 2.97 M nodes, 71 MB of DLX arrays, 137 MB JS heap, 395 MB RSS after GC. | D38, §8.5 (P6-A1 R3–R5) |
| Certificates | Above 200 cells, Hell-level certificates were "not proved" in 639 of 670 checks (0.5–2.3 s each); other levels were mostly "unique" because flat sets had one arrangement — no longer true with macro carving. | D14 (P5-A1 A.2) |
| Distance rule | `dPref` = max(3, ⌈K/3⌉) caused 38 rejections at K = 75; a 676-cell run stopped at 4 of 10 because every candidate was "too close" — fixed by clamp(⌈K/4⌉, 3, 10) and the best-distance fallback. | D16 (P5-A1 §7.2; P6-A1 R2) |
| Rating cost | Saturated ratings: 0.06 s (60 cells), 0.5 / 1.3 s median / p90 (360), 0.8 / 2.7 s (484), ≤ 4.2 s; ≈ 3.7–4.2 s per candidate at 676 cells. | §7.3, §8.3 |

Superseded Phase-4 statements: the [P5] count table, the 15-point bands, the "≥ D" censored acceptance rule, `maxActive` = 360 and `maxNodes` = 3,000,000 (A.8 shows why).

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
13. MDN, `Performance.measureUserAgentSpecificMemory()` — available only in cross-origin-isolated contexts.
14. Phase-5/6 design studies in `docs/init-design/`: `5-addendum-study-architect-1.md`, `5-addendum-study-architect-2.md`, `6-review-of-architect-2.md`, `6-review-of-architect-1.md`.
