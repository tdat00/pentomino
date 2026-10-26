# Pentomino Puzzle Studio — Detailed Design

> **Living document:** kept in sync with the current code. The original design (Phase 7) and the design process are in `docs/init-design/`.

This is the developer specification of the project. The companion document `design-brief.md` describes the user experience. Where this document and the code disagree, the document is updated.

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
    | Large-board switch (577–676 cells) without the "experimental" label | Not offered: the generator page has no large-board switch; 577–676 cells only through `tools/generate.mjs` | BQ-2 (§8.7) |
    | Phone board limit 484 cells | 360 cells | BQ-3 (§8.7) |
    | Browser planning factor | 5 s + 4 × Node | Replaced by BQ reports |
    | Level labels vs. human effort; scoring of forced placements; perceived effect of macro carving | `difficulty-v2`, `gen-v2` as specified | Playtests [PT] (§7.8) |

- All tunable values live as data in `core/engine/policy.js` (limits, piece counts, size policy, budgets, score weights and caps) or `core/engine/levels.js` (bands, clue shares, availability). The generated-color and pattern rules live in `palette.js`. Changing a value that affects results requires a new model, policy or algorithm id (§5.4).
- **Board-size notation.** A × B means columns × rows (W × H) unless stated otherwise. For rectangles, orientation never affects policy, scores or test matrices. The UI labels Columns and Rows explicitly (§10.2).
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
| Puzzle code | A short text that rebuilds one puzzle directly: a checked *core* (board, piece set, clues and claims) and an optional checked *tail* (the stored solution), written `C` or `C.T` (§9.8). |

---

## 1. Overview and requirements traceability

### 1.1 Summary

Two static web apps share one DOM-free engine in `core/`.

**Generator** (`/pentomino/generator/`), a three-step wizard (§10). The user:
1. creates a board: size, blocked cells and display rotation;
2. picks a level among those offered for the board's area and generates a random piece set that provably tiles the board and supports the level (New piece set);
3. generates puzzles from that set, one per New puzzle press, each with a genuinely different arrangement and some pieces pre-placed.

One difficulty score rates everything. Puzzles go to the player through a self-contained link, opened in a new tab by Play.

**Player** (`/pentomino/player/`). The user opens a pack from its link: a `#p=` link with one puzzle code or several separated by `;` (§9.9); or types, pastes or corrects a puzzle code in the entry dialog (§11.16). They drag, rotate and flip pieces onto the board, including boards displayed at 45°. Any valid complete tiling wins.

**Runtime.** Heavy computation runs in a pool of up to 4 Web Workers within 2 GB. There is no server, no runtime dependency and no build step.

**Limits.**
- Boards have 30 to 576 active cells and sides ≤ 32. Until browser qualification passes, release 1 enables 484 cells (360 on phones) [BQ]. The generator page offers nothing above that limit; `tools/generate.mjs` accepts up to 676 cells.
- Each action (New piece set, New puzzle) targets 60 s and always answers within 120 s, keeping every accepted result.

### 1.2 Traceability

Requirements come from the original product brief, including its addendum and the rotation clarification (see `docs/init-design/`).

| # | Requirement | Design decision | Section |
|---|---|---|---|
| T1 | Two independent static sites `generator/` and `player/`; shared code in `core/` | Native ES modules, relative imports, no build step | 3 |
| T2 | Design and task documents | Living spec `docs/design-brief.md` and `docs/design-detail.md`; original design `docs/init-design/`; measurements `docs/calibration/`; original task pack `tasks/init-design/` | 3.1 |
| T3 | Deploy to `tdat00.github.io/pentomino`; the home page redirects to `/generator`; "Play" opens the player | Pages via GitHub Actions; `index.html` + `redirect.js`; Play link `../player/#p=<code>;<code>…` | 9, 12 |
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
| R11 | "New puzzle": 1–10 different puzzles from the same set, changing only the arrangement | Macro carving + local re-tiling; a new layout key AND a new clue key; never clue-only variants; honest partial batches | 6.5, 6.7–6.9 |
| R12 | Some pieces pre-placed at random; easy = many, nightmare = few | Initial share per level, then a score-guided clue search; 1 ≤ G ≤ K−2 | 6.10, 7.4 |
| R13 | Addendum 1–2: the highest (and lowest) level depends on board size; large boards with Hell-2, Hell-3, … | Contiguous availability per level; open ladder | 7.4, 7.5 |
| R14 | Addendum 3: piece count follows level AND board size; never too many small pieces (examples: 60 cells easy 7–8 / master 11–13; 360 cells hard 16–18 lowest / hell-1 40–42) | K(level, area) formula and final table: 60 → easy 7–8, master 12–13; 360 → hard 16–18 (lowest), hell-1 37–42 | 6.4, 7.5 |
| R15 | Addendum 4: find the optimal maximum board size so that generation finishes within 2 min (target 1 min) on the web, with 4 workers and 2 GB | Design ceiling 576 cells, release 484 until qualified; 115 s dispatch stop, 120 s answer; compact memory; qualification tests | 6.2, 8, 8.7, A.10 |
| P1 | The player imports generator output | Links (`#p=<code>;<code>…`); strict validator. No file import or export. | 9 |
| P2 | The player rotates, flips and places pieces to complete the board | Drag, tap and keyboard; D4 algebra; win detection | 11 |

---

## 2. Decision record

The main design decisions and why they were taken.

| # | Decision | Chosen option | Rationale |
|---|---|---|---|
| D1 | Meaning of "rotate the board 45°/90°" | Presentation only. The logical board is always W×H plus blocked cells. There is no regridding and no logical "rotate mask" command. | Explicit user clarification |
| D2 | Rotation sign | `presentation.rotation` in degrees **counter-clockwise** on screen, in {0, 45, …, 315}. The Heart preset is stored as 45. | With the top-right quarter blocked, a 45° counter-clockwise turn puts the notch on top. |
| D3 | Piece drawing on rotated boards | Tray, drag ghost and board all use the board's frame (WYSIWYG). Labels stay upright. | A piece never jumps visually when picked up. |
| D4 | Rotate/flip controls on rotated boards | Screen space. ⟳/⟲ are grid quarter-turns. ⇋/⇵ mirror the piece as seen on screen (§6.3). | Does what the icon shows. Verified for 8 angles × 8 orientations. |
| D5 | Arrow keys on rotated boards | Move along the grid axis closest to the arrow's on-screen direction. At odd multiples of 45°, use the mapping for θ − 45°. Axis hints are shown. | Arrows bound to logical rows/columns would move pieces in a different screen direction than pressed. |
| D6 | Board margins | Keep the authored W×H. Analyze symmetry on a copy normalized to the active bounding box. The editor never trims margins. | Stored coordinates never change silently. |
| D7 | Board connectivity | Generation requires one 4-connected active region. The player accepts any non-empty board. | Simpler carving; valid packs are not rejected. |
| D8 | Game rules vs. generation policy | `rules: "free-polyomino-v1"` covers gameplay only. Size rules, distinct and hole-free shapes are generator policy `mixed-v2`, recorded in `generation.policy`. | The player must accept every rules-valid puzzle. |
| D9 | Piece count | K_mid = min(K60[L]·(A/60)^0.28, Kcap[L]); window ±max(0.75, 6 %); clamped to [⌈0.75·√A⌉, Kmax(A)]; integer counts filtered by histogram feasibility (§6.4). 360-cell hell-1 = 37–42. | Fits all four user examples; area-neutral at hell levels; monotone in A |
| D10 | Difficulty formula | `difficulty-v2`: D = round(2U + 8·log10(1 + B_eff)), B_eff = min(B, 5,000). R and H are stored as diagnostics only. | R and H grow with area and over-rated large boards; the simpler score keeps "few clues = hard" on every board size. |
| D11 | Search-effort estimator | One canonical DLX traversal, saturating at 5,000 branch trials or 50,000 row trials. Actual counters and the stop reason are stored. | Deterministic, bounded cost (≤ ~4 s at 484 cells) |
| D12 | Level bands | Geometric: e_L = round(10·1.45^(L−1.5)); Hell-n = level 6 + n, open-ended | Bands scale with the saturating score; ratio fitted to the user's examples |
| D13 | Shown level | Always the level of the actual score, worded as an estimate. Saturated scores are exact; no "≥" display. | Honest labels |
| D14 | Uniqueness | Default: any valid completion. "Require unique solution" needs an exhaustive raw-coordinate proof; standard for A ≤ 200 or below Hell, experimental otherwise. Certificates are lazy (§6.11). | The user did not require uniqueness; never claim an unproved fact. Certificates took ≈ 35 % of batch CPU at hell levels and were almost never conclusive above 200 cells. |
| D15 | Piece-set acceptance | A set is ready only once a target-band calibration puzzle exists. The generator page stores only the level and uniqueness the set was made for (`calibrationFor`), not the calibration puzzle. | The unclued score is not a ceiling (A.9). |
| D16 | Distinct puzzles | Strict: each puzzle needs a new full-layout key AND a new clue key. Preferred distance clamp(⌈K/4⌉, 3, 10), relaxed to a floor of 2, with a best-distance fallback. No clue-only variants; fewer puzzles are returned with an explanation. | The requirement says the arrangement must change. |
| D17 | Layout discovery | Local LNS: one macro region (broadened every 8th step) or a 6–13-piece cluster; random restarts only up to 150 cells | Global re-tiling fails on large boards; local re-tiling of macro regions found 10 layouts in < 1 s at 360 cells. |
| D18 | Clue selection | 1 ≤ G ≤ K−2. Count-guided sampling, then a bounded beam over add/remove/swap moves. No monotonicity assumption. | A count-only rule misses the band; a pure search is too slow. |
| D19 | Parallelism | Pool of up to 4 module workers. A deterministic fold accepts the lowest-index success. | Reproducible with any pool size; never "first finisher wins" |
| D20 | Cancellation | `worker.terminate()` plus lazy respawn. No `setTimeout(0)` slicing. | Instant; avoids the 4 ms timer clamp |
| D21 | PRNG and seeds | xoshiro128**. A free-text seed is hashed with SHA-256 to a 128-bit state. | Published reference algorithm; user-friendly seeds |
| D22 | Hashing | One pure-JS, synchronous SHA-256 in `core` | Identical in pages, workers and Node |
| D23 | Exchange format | Envelope `format / version / kind / rules`. Board as row strings. Poses `{piece, x, y, turn, mirrored}`. Strict whitelist plus a free `meta` object. Supported versions {1}. | Self-describing, strictly validated, extensible through `meta` |
| D24 | Solutions in packs | Per-puzzle `solution` and the set `witness` are included by default; the format allows omitting them (`omitSolutions`). | O(cells) solvability proof when a pack opens |
| D25 | Hand-off | Primary: a `#p=` link with the code of every puzzle (`<code>;<code>;…`, `&i=` for the puzzle to open), opened by the generator's Play in a new tab; when the whole list does not fit a link (over 16,000 characters, or more than 100 puzzles) only the puzzle to open goes. Neither app reads or writes pack files, and nothing is stored for a pack: the player's address is how a puzzle is kept (bookmark) and shared. | Portable and self-contained; the same codes as Print and Share |
| D26 | Progress identity | SHA-256 of exact coordinates: board rows, piece cells and clue cells | Symmetry-normalized keys corrupt saved moves (A.9). |
| D27 | Hints / show solution | Only proven statements | An unproved culprit misleads (A.9). |
| D28 | Folder layout | `core/engine`, `core/workers`, `core/browser`; tests in `/tests` | Clear layering; tests are never deployed |
| D29 | Deployment | Actions: test → assemble `_site` → deploy. External `redirect.js`. | CSP-compatible |
| D30 | Colors and labels | 20-color palette, generated colors beyond 20, labels A…Z, AA, AB, …, and fill patterns when K > 20. Labels and patterns are always drawn; there are no display toggles. Drawn as one character with a mark past Z, in print-safe drawn colors (§11.9). | Sets reach ~90 pieces on large boards. |
| D31 | Rotating a placed piece | Rotate about its handle cell and try 4 one-cell kicks; otherwise reject. | Predictable |
| D32 | Size balance | Sizes in [max(3, ⌊0.6μ⌋), ⌈1.5μ⌉]; ≤ ⌊0.4K⌋ pieces of 3–4 cells; μ ≥ 4.5; exact histogram feasibility. There is no spread or large-piece rule. | Scales with μ (360-cell hard needs 12–34-cell pieces); 40 % keeps the user's 13-piece 60-cell master set possible. |
| D33 | Set construction | Macro carving when μ ≥ 6.5 (regions of 3–6 pieces; 2–3 when K ≤ 12) with global shape-key exclusion; flat carving otherwise or as a fallback; independent validation of every witness | Flat-carved big-piece sets usually have one arrangement; macro sets gave 10 distinct layouts in both reproductions. |
| D34 | Initial pre-placed count | G0 = clamp(round(g_L·K), 1, K−2); g_L = 0.62 − 0.08·L up to nightmare, hell-1 0.10, hell-2 0.06, hell-3+ 0.04; then searched. Count and fraction are both shown. | Monotone "many → few"; centres hell-1 at D ≈ 100 |
| D35 | Level availability | Each level is offered on one contiguous area interval, frozen from the formula (§7.5). It is a preset policy, not a score ceiling. | Removes gaps caused by rounding; one authoritative table |
| D36 | Board limits | 30 ≤ A ≤ 576, sides ≤ 32. Release default 484 until BQ-1 passes; phones 360 until BQ-3 passes; 577–676 only through `tools/generate.mjs` (the generator page has no large-board option); 677+ never. | 576 meets the 2-minute limit under the conservative factor only with lazy certificates and compact memory; 676 does not (A.10). |
| D37 | Time policy | One budget per action: target 60 s (a qualification criterion), stop dispatching at 115 s, answer by 120 s with all accepted results. No "Try longer" option. | Matches the addendum's 2-minute hard limit |
| D38 | Memory engineering | Compact model storage (flat typed arrays, no per-row objects), one reusable workspace per worker plus a scratch workspace, worker recycling when the set changes, pre-flight guards (≤ 600,000 rows, ≤ 5,000,000 nodes) and byte accounting | Per-row JS objects, not DLX links, dominated memory (A.10). |
| D39 | Planning factor | Browser time = 5 s + 4 × Node time for planning; 2.5× is an optimistic sensitivity only. Browser qualification replaces both. | Neither factor was measured. |
| D40 | Minimum board | 30 active cells for generation; any non-empty board in an incoming pack | Below ~30 cells the formula offers only very-easy, with gaps; such puzzles are trivial. |
| D41 | Set and batch seeds | A set seed typed or rolled (🎲) is reused by every New piece set; an empty seed field draws a new random seed per press. Every puzzle request increments the set's `batchIndex` (stored with the set). The generator page uses a fresh random whole number as the batch seed of each New puzzle press and shows it on the puzzle card; `tools/generate.mjs` uses `batchSeed = setSeed + "#" + batchIndex`. (§8.6) | Re-running one batch seed would replay already-seen layouts, because the history of a set only grows (D16). |
| D42 | Module file extension | Every module loaded by a browser page or worker uses `.js`. `.mjs` is only for Node tools. (§12.3) | Some static servers send `.mjs` as `text/plain`, and browsers then refuse to load the module. Python 3.14 `http.server` on Windows does this (verified). |
| D43 | Puzzle code | One selected puzzle is rebuilt directly from a self-checking text (`puzzlecode.js`, §9.8), not by replaying seeds: a core with the geometry, piece set, clues and claims, and an optional tail with the stored solution. The codec keeps frozen copies of the data it needs (catalogue, palette, rating tables), decodes to an unchanged pack, bounds every field before reading it, and treats a correction only as a candidate. The Player opens a `#p=` address, or a code typed into its entry dialog (§11.16), from it in a dedicated worker and atomically (§9.9). The Print dialog of both apps makes a puzzle's code in the same kind of worker and prints it with a QR code (§11.15), and the Player's **Share** dialog shows and copies the address of that same preparation (§11.17). `tools/generate.mjs --code` prints the same code for every accepted puzzle without a browser (§9.8). | A seed alone cannot rebuild a puzzle, because a result depends on the history of its set (D16, D41); the code needs no seed, calibration or search, and a later change of the live engine cannot change how an old code reads. |

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
│  │  ├─ hash.js  rng.js  geometry.js  board.js  view.js  policy.js  levels.js  qualification.js
│  │  ├─ workspace.js  placements.js  dlx.js  tiling.js  enumerate.js  carve.js  keys.js  difficulty.js
│  │  ├─ clues.js  generate.js  tasks.js  hints.js
│  │  ├─ puzzlecode.js  puzzlecode-input.js  puzzlecode-v1.js
│  │  └─ pack.js  sharecode.js  game.js  palette.js  protocol.js  types.js  version.js
│  ├─ workers/
│  │  └─ engine.worker.js      module worker; runs engine tasks (§8.1)
│  └─ browser/                 DOM helpers shared by both apps
│     └─ worker-pool.js  generation-client.js  puzzle-code-client.js  puzzle-code-dialog.js  svg-board.js  pointer.js  storage.js  handoff.js
│        print-layout.js  print-sheet.js  print-dialog.js  print-texts.js  print.css  puzzle-title.js  puzzle-snapshot.js
│        dom.js  i18n.js  theme.js  theme-init.js  theme.css  common.css  favicon.svg
│        qr.js  vendor/qrcodegen.js  vendor/qrcodegen.LICENSE
├─ generator/
│  ├─ index.html  app.js  state.js  jobs.js  strings.js  i18n.js
│  ├─ locale.en.js  locale.vi.js  generator.css
│  └─ ui/  wizard.js  board-editor.js  board-summary.js  level-panel.js  level-help.js
│          set-panel.js  set-summary.js  puzzle-panel.js  elapsed.js  i18n-dom.js
├─ player/
│  ├─ index.html  app.js  state.js  play.js  hints.js  puzzle-title.js  strings.js  i18n.js
│  ├─ locale.en.js  locale.vi.js  player.css
│  ├─ ui/  header.js  puzzle-list.js  board-view.js  tray-view.js  drag-layer.js  gestures.js  toolbar.js
│  │       context-menu.js  keyboard.js  start-view.js  hint-panel.js  dialogs.js  win-dialog.js
│  │       rating-dom.js  i18n-dom.js
│  └─ samples/sample-pack.json
├─ tests/                      node:test suites, browser regression pages, fixtures and vendor/jsqr.cjs
│                              (the test-only QR decoder, §3.3); never deployed
├─ tools/                      generate.mjs (CLI), calibrate.mjs, bench/ (browser benchmark), serve.mjs,
│                              stamp-version.mjs, check-site.mjs, site-scan.mjs, check-conventions.mjs,
│                              node-worker.mjs, record-fixtures.mjs
├─ .github/workflows/pages.yml
├─ docs/                       design-brief.md, design-detail.md (living spec); init-design/ (original design),
│                              calibration/ (measurement reports); docs/local/ is git-ignored
└─ tasks/                      init-design/ (original task pack)
```

### 3.2 Runtime architecture

```text
Generator page (main thread)                         Worker pool (≤ 4 × core/workers/engine.worker.js)
  UI state ─ request {requestId, revision} ─► scheduler ─► task {kind, payload, seed label, budgets}
           ◄─ progress / accepted / result ◄─────────────── deterministic engine functions
                                                            (each worker: main + scratch workspace, §8.5)
  watchdog: stop dispatch at 115 s, answer by 120 s     idle pool: lazy certificate tasks (§6.11)
  new piece set ─► recycle workers (§8.1)
  Play: pack ─► one puzzle code per puzzle ─► new tab ../player/#p=<code>;<code>;…&i=<k>   (too long: only the puzzle to open)

Player page (main thread)
  #p= link ─► decodePuzzleCode task per code (the code client's own 1 worker, §9.9) ─► validated pack
              ─► game reducer (core/engine/game.js) ─► SVG board + tray
              └► verifyPack task (1 worker)
              ─► the same commit, progress restore and verification
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
| Compression | Native `CompressionStream` / `DecompressionStream('deflate-raw')` (the version-2 puzzle code, §9.8) |
| Tests | Node ≥ 22 with `node:test` and `node:assert/strict`; zero dependencies |
| Runtime dependencies | None. Dev-only tools such as Playwright are optional. |
| Bundled third-party code | Source files copied into the repository, not npm dependencies. Runtime: the QR encoder `core/browser/vendor/qrcodegen.js` (Nayuki, MIT, pinned; its notice and provenance are in `qrcodegen.LICENSE`). Tests only: the QR decoder `tests/vendor/jsqr.cjs` (jsQR 1.4.0, Apache-2.0, with `jsqr.LICENSE`), loaded by Node tests as an independent reader; no page, `core/`, `generator/` or `player/` file imports it and it is never deployed. `tests/qr.test.js` pins both by SHA-256 after CRLF-to-LF normalisation. |

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
export function trimMargins(b: Board): Board;              // not used by the editor (D6)
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

**`sharecode.js`** (§9.9): the `#p=` address helpers (the compressed `#pack=` share code and the `#lib=` reference no longer exist)

```ts
type IncomingHash = { p: string; index: number };                                // p: the raw value, one code or codes joined by ';'
export function parseLocationHashResult(hash: string): Result<IncomingHash>;     // failures: no-incoming, invalid-hash, invalid-index
export function parseLocationHash(hash: string): IncomingHash | null;           // the nullable convenience wrapper
export function isPuzzleHash(hash: string): boolean;                             // the address has a `p` key at all
export function puzzleCodeUrl(playerTarget: string | URL, code: string): string; // target + '#p=' + canonical code
export function puzzleListHash(codes: string[], index?: number): string;         // '#p=' + canonical codes joined by ';' (+ '&i=' for a later puzzle)
export function puzzleListUrl(pageBase: string | URL, codes: string[], index?: number): string; // the page's own ../player/ + that hash
export const MAX_URL_CHARS: number;  export const WARN_URL_CHARS: number;         // 16,000; 4,000
```

**`puzzlecode.js`, `puzzlecode-input.js`, `puzzlecode-v1.js`** (§9.8): the single-puzzle code. `encodePuzzleCode` and `decodePuzzleCode` are async (native compression streams); the input functions are synchronous.

```ts
type PuzzleCodeSnapshot = { rows: string[];                 // board rows with the blocked margins, '#' active, '.' blocked
                            rotation: number;               // display angle, 0, 45, … 315 (not a paper-fit rotation)
                            pieces: Piece[]; clues: Pose[]; solution: Pose[] | null;
                            rating: RatingClaim | null; certificate: CertificateClaim | null;
                            title: string | null };         // the title the caller resolved; the codec reads no app state
type EncodedPuzzleCode = { C: string; T: string | null; F: string; version: 1 | 2 };   // F = C, or C + '.' + T; upper case, ungrouped
type CodeCandidate = { component: 'core' | 'tail'; group: number; position: number;    // one-based group of four, position in it
                       expected: string; typed: string; correctedCode: string };
type DecodedPuzzleCode = { pack: Pack; hasTail: boolean;
                           tailError: null | 'tail-check' | 'tail-tag' | 'tail-invalid'; candidate?: CodeCandidate };
export async function encodePuzzleCode(s: PuzzleCodeSnapshot, o?: { compression?: 'auto' | 'raw' }): Promise<EncodedPuzzleCode>;
export async function decodePuzzleCode(text: string): Promise<DecodedPuzzleCode>;   // a code, a grouped code or a link with #p=
export class PuzzleCodeError extends Error {   // code: 'empty' | 'bad-char' | 'dots' | 'too-long' | 'core-check' | 'version' | 'no-deflate' | 'invalid' | 'index'
  code: string; params?: Record<string, string | number>; candidate?: CodeCandidate }
export function parsePuzzleHash(hash: string):
  { ok: true; value: { p: string; index: 0 } } | { ok: false; code: 'index' | 'invalid'; message: string };
export function normalizePuzzleCodeInput(text: string): string;    // a link (text with '#') or a bare code → symbols and at most one '.'
export function normalizePuzzleCodeValue(value: string): string;   // a bare code only
export const ALPHABET: string;  export const MAX_INPUT_CHARS: number;  export const MAX_CODE_SYMBOLS: number;   // 32768, 16000
export function createPuzzleCodec(deps?: { measure?: Function; allowDeflate?: boolean }): { encodePuzzleCode; decodePuzzleCode };
```

- `puzzlecode-input.js` imports no other module (no catalogue, no compression, no `sharecode.js`), so any host can use the parser and normalizers cheaply; it owns `PuzzleCodeError`, which `puzzlecode.js` re-exports.
- `puzzlecode-v1.js` holds the frozen data and the payload grammar: `CODE_BOUNDS` (the decoder bounds, named apart from the generation limits of `policy.js`), `CRC20`, the rating tables, the default colours and labels, the lazily built catalogue (`catalogueShapes(n)`, `catalogueCount(n)`, `catalogueStats`) and the payload functions. Pages use `puzzlecode.js`; the other two files are for it and for the tests.
- `createPuzzleCodec` is a test-only seam: `measure` replaces the count-only rating rebuild, and `allowDeflate` lets `compression: 'deflate'` force version 2. The public functions use the default codec; the worker never receives a function. An unknown `compression` value throws `TypeError`.
- The input snapshot is never mutated, and a decoded pack shares nothing with it.

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

**`protocol.js`**: worker message types and their validation (§8.1). Besides the solver and generation kinds it validates the two puzzle-code kinds, `encodePuzzleCode` (`{ snapshot }`) and `decodePuzzleCode` (`{ text }`), and error replies that carry a code error's `params` and `candidate` (§9.9).

**`tasks.js`**: `executeTask` and the worker-side `createTaskHandler` (§8.1). The solver and generation kinds return synchronously; the two puzzle-code kinds return a Promise, which the handler awaits before it posts one reply (§9.9).

### 4.3 Browser modules (`core/browser/`)

| Module | API and responsibility |
|---|---|
| `worker-pool.js` | `createPool({ size })` returns `{ run(task, onProgress) → Promise<result>, runIdle(task) → Promise<result>, cancelAll(), recycle(), size }`. Cancelling terminates and lazily respawns workers; `recycle()` does the same between piece sets (§8.1). `runIdle` queues lazy certificate tasks at the lowest priority. Hosts the watchdog (115 s dispatch stop, 120 s answer, §8.4) and sums byte accounting (§8.5). |
| `generation-client.js` | `createGenerationClient(pool)` returns `{ generateSet(request, { onProgress }), generateBatch(request, { onProgress, onAccepted, onCertificate }), cancel() }`. Runs New piece set and New puzzle requests on the pool: speculation and the deterministic fold (§6.9), the arrangement count and completion pass, lazy certificates (§6.11) and the action watchdog. Failures carry the accepted results in a `GenerationError`. |
| `svg-board.js` | `mountBoard(el, opts)` returns `{ render(model), setRotation(theta), setZoom(cellPx), panTo(x, y), cellAt(clientX, clientY, o?: { includeBlocked?: boolean }) → XY or null, localPoint(clientX, clientY), destroy() }`. `cellAt` returns only active cells by default (play mode); the editor passes `includeBlocked: true` (§6.3). Shared by the player, the editor and thumbnails. |
| `pointer.js` | Drag/tap state machine with one active pointer, a drag threshold and a lift offset. Shared by the player and the board editor. |
| `storage.js` | `get`, `set`, `remove` and `list` under `pentomino:v1:`, the progress, preference and generator-state records. Wraps every access in try/catch and evicts LRU entries on quota errors (§9.6). |
| `handoff.js` | `preparePlayerLink(pack, index, env?)` (the `#p=<code>;<code>;…[&i=k]` link with one puzzle code per puzzle, made in the worker as Print and Share make them (`env.encodePuzzle` is the injectable encoder, `env.untitled` the sender's "Puzzle #n" label); when that is over 16,000 characters or has more than 100 puzzles, a link with only the puzzle to open and `only: true`; else none with a warning), `puzzleCodesOf(pack, env, indexes?)` (the codes of puzzles, one after the other), `openInPlayerTab(pack, index)` (the generator's Play: opens the player in a new tab; resolves `{ only }`), `readIncoming(location, env?) → Promise<Result<{ pack, index }>>` (the one loader of `#p=` addresses; `env.decodePuzzle` is the injectable worker decoder, §9.9; a `p` value with `;` opens all its codes as one pack), `readPuzzleCode(text, env?)` (opens typed, pasted or scanned code text, one code or a list, through the same decoder), `readPack(text)` (pack JSON shipped with the page: the sample) |
| `puzzle-code-client.js` | `createPuzzleCodeClient({ pool?, createPool? }) → { encode(snapshot), decode(text), repair(text), cancel(), dispose() }`: the worker-backed puzzle-code service of the Player, the print producer and the Share dialog. Results are `{ ok, value, warnings }` or a failure with typed issues, a core-only `recovery` and a correction `candidate`; the pool is dedicated, lazy and has one worker (§9.9). `failureFromCodeError(error)` makes the typed failure of a `PuzzleCodeError`. |
| `puzzle-code-dialog.js` | The Player's code entry (§11.16). `createCodeEntryMachine({ submit, cancel, openRecovery })` is a DOM-free state machine (`getState`, `subscribe`, `open`, `edit`, `submit`, `useCorrection`, `openCore`, `close`, `dispose`) and `createPuzzleCodeDialog({ host, t, submit, cancel, openRecovery, fallbackFocus? }) → { open({ text?, failure?, opener? }), close(), refresh(), isOpen(), element(), dispose() }` shows it in a native `<dialog>` that it creates on the first `open`. `describeProblem` gives the text key of every failure code, `provisionalCount` the count under the field. It imports only `puzzlecode-input.js` (the text normalizer) and `dom.js`: no codec, catalogue or search. |
| `dom.js` | `h()` element helper, toast, clipboard and download helpers (the download helpers serve the benchmark page's reports) |
| `i18n.js` | `createI18n({ en, vi })` returns the text lookup of one app: `t(key, args)` (`{name}` placeholders; plural keys `_one` / `_other` chosen by `args.count`; a missing key falls back to English, then to the key), `setLocale(code, doc)` (sets `<html lang>`, translates every `data-i18n` / `data-i18n-attr` element, tells the listeners of `onChange`), `applyTo(root)`, `detect` and `choose` (`?lang=`, saved choice, browser languages, English), `has`, `raw`, `formatNumber`. Each app keeps its own packs (`generator/locale.*.js`, `player/locale.*.js`) and calls it through `generator/i18n.js` and `player/i18n.js`. `LANGUAGE_KEY` is the storage key shared by both pages (§9.6). |
| `theme.js`, `theme-init.js`, `theme.css` | The theme of both apps: `THEMES`, `normalizeTheme`, `effectiveTheme`, `applyTheme`; the early script that sets the stored theme before the first paint; and the three palettes with the base styles of buttons, inputs and board cells (`tests/theme.test.js` checks their contrast). |
| `print-layout.js` | Pure paper geometry of a printout in millimetres (§11.15): `planPrint(job, options)` returns the sheets, the pages and the `band` of the first sheet and `planPrintMany(jobs, options)` the same for several puzzles with `perPage` of them on a sheet (`framesFor`, `FRAME_GAP_MM`, `PER_PAGE_CHOICES`); `orientModel`, `cellSizeFor`, `layoutPieceSheets`, `layoutBoard`, `layoutPreview(model, top)`, `layoutSolution`, `mirrorX`, `mirrorCells`, and for the heading and QR band `titleBlock`, `wrapTitle`, `fitText` and `layoutBand`, with the constants (the text sizes, pitches and the QR column gap and end). A job may carry `share` (the prepared code and QR) and `measure` (the width of a text in the page's font; the layout's own estimate when absent). It lives here, not in `core/engine/`, because it is part of the printing feature rather than of generation (the benchmark source digest covers the engine only). |
| `print-sheet.js` | `buildPrintPages(plan, heading, text)` draws the plan as one 210 × 297 mm SVG per page (`.pm-print-page`), reusing `drawPiece` and `createDefs` of `svg-board.js`: the first sheet with the QR group at the left, its "Play online" caption and the heading to its right, then the solution, piece and board sheets. `createTextMeasure(doc)` measures texts with a canvas of the page (a 2 % margin added). |
| `print-dialog.js`, `print-texts.js`, `print.css` | `createPrintDialog({ host, t, getJob, solutionOption?, win?, pageBase?, createClient?, watch? })`: the Print dialog both apps use, with the asynchronous preparation of the code (§11.15), and `printPages(doc, win, pages)`, which shows the pages for the browser's print function; `dialog.prepared()` returns the current preparation for harnesses. `puzzleDetails(t, rating, set)` makes the detail lines of the heading (the rating, then the piece set; never a puzzle seed). `print-texts.js` holds the English and Vietnamese texts (`print.*` keys) that both apps' locale packs spread in. `print.css` styles the dialog and, in `@media print`, shows only the pages. |
| `puzzle-title.js` | The one heading rule of the Player and the printout, with no dependency: `puzzleDisplayName(title, index, untitled?)`, `puzzleCodeTitle(title, index, untitled?)` and `MAX_NUMBERED_TITLE_CODE_POINTS` (75); the label of an untitled puzzle is passed in (English by default). |
| `puzzle-snapshot.js` | Node-importable, no DOM: the one prepared description of a puzzle that Print and Share use. `puzzleSnapshot(source) → { data, heading, key }` (frozen), `puzzlePlayerTarget(pageBase) → string`, `PUBLIC_PLAYER_URL`, `preparePuzzleShare(snapshot, { target, client }) → { code, url, carried, qr, notices }` and `preparePuzzleListShare(snapshots, { target, client, index }) → { codes, url, carried, qr, notices }` with the capacity ladder, and `PuzzleShareError`. The code is made by the injected client, so the module never builds a catalogue (§11.15). |
| `share-dialog.js` | The Player's Share dialog (§11.17). `createShareController({ getSource, prepare, writeClipboard, onChange }) → { getState, open, close, setAll, refresh, retry, copy, dispose }` is the DOM-free logic: revisions, the stale guards, the per-selection cache, the URL bounds and the copy state. `prepareShareLink(source, all, { target, client })` prepares one puzzle or the list through `puzzle-snapshot.js`. `createShareDialog({ host, t, getSource, closeKey, pageBase?, createClient?, writeClipboard? }) → { element, controller, open(from), close(), isOpen(), refresh(), refreshTexts(), dispose() }` builds the native `<dialog>` with its QR and its own puzzle-code client; `shareIcon()` draws the icon. |
| `qr.js`, `vendor/qrcodegen.js` | The local QR code of a printed puzzle link. It is pure: no DOM, storage, clipboard or network, and no application state. `makePuzzleQr({ urlPrefix, code, ec? })` returns `{ ok: true, value }` or `{ ok: false, code, message }`. `urlPrefix` is used verbatim (UTF-8 bytes are measured) and must end with `#p=`; the standard one is `https://tdat00.github.io/pentomino/player/#p=` (45 bytes, path case untouched). `code` is the canonical output code, upper case and ungrouped: the core, or core + `.` + tail, treated as opaque (never parsed, repaired or shortened). Input the transfer producer must not send is `qr-invalid-input`; a valid payload that does not fit version 40 is `qr-too-long`. The symbol has two explicit segments, a byte segment for the prefix and an alphanumeric segment for the code, at the requested error correction `ec` (`'M'` by default, `'L'` only when the caller's oversize policy asks for it, never raised to Q or H), automatic mask and the smallest version 1–40. `value` holds `url`, `code`, `urlPrefix`, `ec`, `version`, `modules` (17 + 4 × version), `quietModules` (4), `outerModules` (`modules` + 8), `outerMm`, `moduleMm` and `rows` (one `Uint8Array` of 0/1 per row, data modules only). `qrGeometry(version)` gives the size: `outerMm` = max(25, `outerModules` × 0.5) and `moduleMm` = `outerMm` / `outerModules`, so a module is never under 0.5 mm and a small symbol is enlarged to 25 mm (version 5: 25 mm, 11: 34.5 mm, 40: 92.5 mm). `qrRowRunPath(rows)` returns the SVG path of the black modules in module units, one `M{x} {y}h{w}v1h-{w}z` rectangle per horizontal run in row-major order (an empty string for an all-white matrix; `RangeError` for an empty, non-square or non-0/1 matrix). The symbol is drawn as an opaque white `rect` of `outerModules` square and that path shifted by the quiet zone, with no stroke. `vendor/qrcodegen.js` is the pinned Nayuki encoder, changed only in line endings, trailing blanks and a final `export { qrcodegen };` (§3.3). The first sheet of a printout draws it (§11.15); `puzzle-snapshot.js` chooses its error correction. |

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
| `puzzles[].seed` | string | no | 1–256 code points; the batch seed the puzzle was generated with (§8.6). Kept in the pack for reference; the Player does not show it; absent in older packs. |
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

1. **Size.** A pack is at most 512 KiB of JSON (the generator keeps its puzzle list within it, §10.5).
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
9. **Claims.** `rating` and `certificate` are type-checked (finite, non-negative score; known status). The UI shows them with the generator's wording, without a "claimed" prefix; the rating's level is bold (§6.11).
10. **Policy (warnings only).** Pieces smaller than 3 cells, duplicate shapes or pieces with holes produce warnings; the player shows "non-standard piece set".

Copy only whitelisted fields into newly created objects; this prevents prototype pollution. Render every text field with `textContent`.

### 5.4 Versioning

- `version` changes only for breaking schema changes. Older versions keep explicit, tested migrations (`migrate[n]`). Unknown versions are rejected.
- Independent identifiers version the semantics:
  - `rating.model` (`difficulty-v2`; packs carrying `difficulty-v1` ratings are accepted and shown as claims);
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

- `macroRegion` lists the macro-region index of each piece in piece order; it lets a later session continue generating puzzles with macro-region re-tiling (§6.7). It is absent for flat and imported sets.
- `batchSeed` is the seed of the last batch request: in packs written by `tools/generate.mjs` it is `setSeed + "#" + batchIndex`; in packs from the generator page it is the random whole number drawn for the newest puzzle's New puzzle press (§8.6). `batchIndex` is the 1-based number of the batch request on this set (§8.6, D41).
- `generation` is type-checked only when a pack is read (§5.3); a missing or foreign object never blocks play.

### 5.6 Progress records and fingerprints

- **Key:** `pentomino:v1:progress:<fp>`, where `fp = progressFingerprint(board, pieces, clues)`:

  ```text
  fp = sha256Hex(canonicalJson({
         rows,                                                     // exact board rows
         pieces: [[id, normalizedCells], …] sorted by id,
         clues:  [[pieceId, absoluteCellsSortedByYX], …] sorted by pieceId }))
  ```

- **Value:** `{ v: 2, placements: Pose[], elapsedMs, moves, solved, revealed, hintsUsed }`. `solved` is geometry only; a revealed game is complete but not earned (§11.13).
  - Version 1 records (written before hints) have no `revealed` or `hintsUsed`; they are read as `false` and `0`, and the next save writes version 2.
  - Older records may carry `updatedAt`; it is ignored and dropped by the next save. The save time lives only in the LRU list `pentomino:v1:progress-index` (§9.6).
  - **Replay** removes the record and its LRU entry; an untouched game is never written.
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

- **Board.** W × H plus an active mask; packs store it as row strings. W and H are each at most `LIMITS.maxSide` = 32 in the editor and at most 64 in an incoming pack.
- **`classifyBlocked`.** Flood fill from outside a 1-cell-padded grid through blocked cells. Reached cells are *exterior*; the remaining blocked cells are *holes*.
- **`normalizedActive`.** Crops to the active bounding box and returns the offsets (dx, dy).
- **`symmetries`.** Returns the t values for which `normalize(T_t(activeCells))` equals `normalize(activeCells)`.
  - Expected sizes: non-square rectangle 4, square 8, Heart 2 (identity and the anti-diagonal reflection t = 5), irregular board 1.
  - Margins never hide a symmetry (D6).
- **Area limits** (D36, D40). `enabledMaxActive(device)` returns the largest area the generator accepts on this device:

  | Device class | Enabled maximum | Becomes |
  |---|---|---|
  | Desktop / laptop (default) | `releaseMaxActive` = 484 | 576 when BQ-1 passes [BQ] |
  | Large-board setting of `enabledMaxActive` (`largeBoards: true`; not offered by the generator page) | 676 | Opt-in only; labelled experimental until BQ-2 passes [BQ] |
  | Phone: `matchMedia('(pointer: coarse)')` and (`navigator.deviceMemory` ≤ 4, or unknown, or `hardwareConcurrency` ≤ 4) | `phoneMaxActive` = 360 | 484 when BQ-3 passes [BQ] |

  - The design ceiling without the large-board setting is `designMaxActive` = 576. Boards above 676 cells are never generated; `tools/generate.mjs` takes its own `--max-active` (default 676).
  - Opening a pack, play and verification have no generation limit (§5.3 limits apply).
- **Validation for generation** (`validateForGeneration(board, enabledMaxActive(device))`).
  - Errors:
    - active cells < `LIMITS.minActive` (30) or above the enabled maximum;
    - the active cells are not one 4-connected region;
    - a side exceeds `LIMITS.maxSide` (32).
  - Warning: more than 360 active cells — "Large board: generation can take up to 2 minutes".
  - Offending cells are highlighted.
- **Presets.** Masks only; the user can then paint cells or change the rotation. The editor's preset menu applies the defaults below (Rectangle keeps the current Columns and Rows) and does not offer "Round lobes".

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
  - Holes (blocked cells inside the board) are drawn grey with a cross in the middle (`blockedCell`, themed through `.pm-blocked`).
  - The editor draws every blocked cell, exterior ones included, the same way, so they can be re-activated.
- Tray pieces and the drag layer use the same θ (WYSIWYG). A piece looks identical in the tray, while dragged, and on the board.
  - Tray slots are sized from each piece's rotated bounding box.

**Hit-testing and dragging**

- `local = DOMPoint(clientX, clientY).matrixTransform(boardGroup.getScreenCTM().inverse())`. This stays correct under page scroll and zoom.
- The cell under the pointer is `(floor(local.x), floor(local.y))`. It must lie inside W × H; what else counts depends on the mode (`cellAt(…, { includeBlocked })`, §4.3):
  - **Play mode** (player placement, drag ghost, tap-to-place): only active cells count. The transparent corners of a rotated bounding box and blocked cells are therefore outside.
  - **Edit mode** (board-editor painting): every cell inside W × H counts, active or blocked, including exterior cells (drawn grey with a cross). Otherwise a blocked cell could never be unblocked.
- **Drag anchor.**
  - Let s be the grabbed source cell (piece-local, before orientation): the cell pressed, or, for a press on the frame of a tray slot around the piece (`trayPiece` in `player/ui/gestures.js`), the cell of the piece nearest to the press. On the board only the piece's own cells grab it.
  - Under the current t, its position inside `normalize(T_t(cells))` is g.
  - The ghost origin is `floor(local) − g`.
  - Rotating or flipping during a drag recomputes g, so the grabbed cell stays under the pointer.
- **Touch lift.** The dragged piece is drawn 1.25 cells above the finger *on screen*. Apply the screen offset (0, −1.25·cellPx) before the inverse transform.
- **Editor painting.** Uses the same mapping in edit mode (`includeBlocked: true`), so the user paints directly in the displayed rotation; zoom, fit and a move (pan) tool help with small cells.

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

- **Exponent 0.28.** Fitted to the measured score landscape (A.10): smaller pieces on smaller boards cause more search, so a level needs fewer pieces there.
- **Kcap.** Beyond about 25 pieces to place, the score is ≈ 2U + 30 on any board (§7.2), so the count a Hell band needs no longer grows with area.
- **Checks against the user's examples:** 60 cells → easy 7–8, master 12–13; 360 cells → hard 16–18 (the lowest level offered there), hell-1 37–42.
- The histogram filter removed no value in the offered windows (checked over all areas 30–676).

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

- There is no spread rule, no "≥ 20 % pieces of ≥ 6 cells" preference and no 3-cell slack rule (D32). The slack rule would have removed the 13-piece master set on 60 cells.

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
- It uses exactly the clue selection of New puzzle (§6.10).
- The set is "ready for <level>" only when the calibration puzzle is in band, and proven unique when required. In the session that made the set, that puzzle is reused as the first puzzle of the first request when the level and uniqueness still match. It is not stored, so after a reload the first puzzle is generated afresh.

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
| Player verify | canonical | first solution or cap | *solvable*; *unsatisfiable* if exhausted; otherwise *not verified* |

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
- macro sets: ≤ 0.1 s (60 cells, K = 8) and 0.5–0.9 s (360 cells, K = 18–21), single-threaded; 360 cells with K = 37–41 took 3.6–4.6 s on 4 workers and 31–34 s single-threaded on two prototypes;
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

### 6.9 Batch generation: 1–10 distinct puzzles ("New puzzle")

**Inputs:**
- set (with witness and `macroRegion`);
- target level and quantity q ∈ 1..10. The generator page asks for q = 1 on every New puzzle press (§10.5); `tools/generate.mjs` and the harnesses ask for up to 10;
- `batchSeed` (§8.6): `setSeed + "#" + batchIndex` in `tools/generate.mjs`, a fresh random whole number per press on the generator page; and the uniqueness mode;
- `seen`: the session history of accepted layout keys and clue keys for this set. It holds at most 1,000 keys; when full, the UI asks the user to reset the history (M-HISTORY-FULL).

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
- `partial`, with reason `layouts-not-found` (N-ARRANGEMENTS when the count finished, else N-LAYOUTS-UNUSED, N-LAYOUTS-LEFT or N-FEWLAYOUTS), `difficulty-not-found` (N-SETLEVEL), `uniqueness-not-proved` (N-UNIQUE) or `time-limit` (N-PARTIAL), see §10.7;
- `cancelled`.

Accepted puzzles are always kept. "No further arrangement exists" may be stated only after an exhaustive enumeration. When a request stops with `layouts-not-found`, the arrangements of the set are counted exhaustively within the fixed `ENUMERATION` work limits (symmetric images count once). A finished count makes the outcome complete ("Found 6/6 arrangements", N-ARRANGEMENTS), and a completion pass first turns up to `ENUMERATION.collect` (32) unused arrangements, in layout-key order, into candidates through the same clue selection, band and distinctness rules (seed label `completion/<layout key>`). A count that does not finish never claims a maximum; messages then say "found within the time limit" or name the arrangements that were tried (§10.7).

The generator page also rejects any streamed or final puzzle whose id, clue key or layout key equals a puzzle already in its list (a backstop to the engine's history); the request then ends with M-DUPLICATE.

**Message examples** (§10.7):
- "Found 0 of 1 different Hard puzzles within the time limit. The piece set was not changed."
- "Found 6/6 arrangements, the most this piece set allows. Generate a new piece set for more Hard puzzles."

**Invariants** (D16):
- New puzzle never changes the board, the shapes, the colors or K.
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
- The generator's step 2 table shows the pre-placed range per level, and each puzzle card shows the number of pieces still to place (K − G).

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

| Status | Evidence | Generator card text | Player text |
|---|---|---|---|
| (none yet) | Certificate pending, or not computed | "Checking…" while pending, else "Uniqueness not checked" | "At least 1 solution" once a solution is known (§9.5), else nothing |
| `unique` | Exhaustive count found exactly 1 raw-coordinate solution | "Unique solution ✓" | "Unique solution ✓" |
| `multiple` | 2 distinct raw solutions found | "Multiple solutions" | "Multiple solutions" |
| `not-proved` | The count hit its row limit with ≤ 1 solution found | "At least 1 solution" (the witness exists) | "At least 1 solution" |
| `unsatisfiable` | Exhaustive count found 0 | "No solution exists" (never generated) | "No solution exists" for a claim in a pack (an error when the Player's own check proves it) |

- **Default `any`: lazy certificates** (D14). Every in-band puzzle is accepted without a certificate. After the batch's last accepted puzzle (or when the pool is idle), the scheduler runs `certifyTask` per puzzle, lowest slot first:
  - row limit `countRows(A)` = 10,000 for A ≤ 200 and 2,000 above (cap 2 solutions);
  - results update the cards as they arrive and are stored in the pack;
  - certificates never delay or change acceptance, and they are excluded from the action's time measurements ("first ten usable puzzles" and "certificates settled" are reported separately);
  - a new job or Cancel terminates pending certificate tasks (Play does not); their puzzles keep `certificate: null`, shown as "Uniqueness not checked".
- **`require`** (the "Require unique solution" switch of step 3; it also applies to New piece set). Only puzzles proven `unique` by `makeUnique` are accepted.
  - It is a standard option for A ≤ 200 or levels below Hell. Elsewhere step 2 shows N-UNIQUE-EXP ("experimental and usually fails"): above 200 cells, 639 of 670 Hell-level certificates were "not proved" (A.10).
  - Macro-carved sets make multiple solutions common at some levels (e.g. 10 of 10 at 360-cell master, A.10), so `require` rejects more candidates there.
- **Tie-break (MAY).** When several in-band candidates exist for one slot, prefer one already certified `unique`. Never spend extra search on this.
- **Player.** Any valid complete placement wins, whatever the status. Certificates carried by a pack are shown with the generator's wording, without a "claimed" prefix; the Player does not recompute them.

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

R and H grow with the board area for the same task, which made an earlier formula over-rate large boards (A.10). They are stored in `rating.metrics` for a future, playtest-calibrated model [PT].

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
- **Node** is the measured maximum set + 10 time on the design-phase prototypes (Node, 4 worker threads; board in brackets; n/m = not measured, with the expected value from neighbouring cells);
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
- **Recycling** (D38). When the piece set changes (a new set is accepted or restored), the pool terminates and respawns its workers lazily before the next job. This releases allocator pages that a finished set's models leave behind.
- The player uses one worker for verification. Puzzle-code work has its own dedicated one-worker pool (§9.9), so it never borrows or cancels the Generator's pool or the player's verification pool.

**Messages:**

```ts
// main → worker
{ type: 'task', id: number,
  kind: 'setAttempt' | 'puzzleCandidate' | 'certify' | 'rate' | 'verifyPack' | 'solveFirst'
      | 'enumerateLayouts' | 'completionCandidate' | 'encodePuzzleCode' | 'decodePuzzleCode',
  payload: object }                     // JSON-compatible: rows, pieces, poses, seed text, labels, budgets; a puzzle snapshot or code text
// worker → main
{ type: 'progress', id: number, stage: string, rowTrials: number, bytes: number }  // every BUDGETS.progressEvery row trials
{ type: 'result',   id: number, value: object }
{ type: 'error',    id: number, code: string, message: string,
  issues?: { code: string, path: string, message: string, params?: object, candidate?: object }[] }   // e.g. 'model-too-large'
```

**Request tracking (main thread).**
- Each user action (New piece set and New puzzle in the generator, verification in the player) gets a monotonically increasing `requestId`, plus the `revision` (a hash) of the board and set it was started for.
- Tasks belong to a request. Results whose request is no longer current, or whose revision no longer matches, are discarded, and their workers are terminated.
- Previously accepted results stay on screen until a replacement is validated.
- Lazy certificate tasks (§6.11) have the lowest priority; any new user action cancels them.

**Inside a worker:** the solver and generation tasks run synchronously to completion, using the worker's workspaces (§8.5). The two puzzle-code tasks may await native compression: `createTaskHandler` keeps the worker's current task set until the returned Promise has settled, posts one result or one error then, and starts any message that arrived meanwhile only after that. Memory progress during the wait belongs to that task, and a Promise is never posted. Synchronous tasks keep replying before `handle` returns.

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
| `verifyRows` | Player verification without a solution | 2,000,000 |
| `progressEvery` | Row trials between progress messages (UI shows ≤ 5 updates/s) | 50,000 |
| `historyKeys` | Session-history layout keys per set | 1,000 |

### 8.4 Cancellation, watchdog and progress

- **Cancel.** Terminate every busy worker of the request and respawn lazily. Response is typically < 100 ms. Accepted results are kept.
- **Watchdog** (D37). Every action has one budget:
  1. at `TIME.dispatchStopMs` (115 s) the scheduler stops dispatching and terminates busy workers;
  2. it validates and packages the accepted results within the remaining 5 s;
  3. it returns them with reason `time-limit` no later than `TIME.responseMs` (120 s).
- **No cooperative slicing.** Workers never use `setTimeout(0)` slicing; the HTML Standard clamps nested timers to ≥ 4 ms, including in workers.
- **Progress UI** (generator, §10.6).
  - The button that started the job shows a spinner and "Elapsed: m:ss" under it; after 30 s it turns into Cancel. The page shows no stage text or progress count.
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
- **Evidence.** A prototype with per-row JS arrays and maps used 1.6–2.25 GB RSS at 576–676 cells; buffer reuse and recycling alone saved only 0–12 %. A single 676-cell model needed 71 MB of DLX arrays but left 395 MB of process RSS. A prototype engine with typed reusable DLX links (placement rows still JS arrays), measured 1,058 MiB at 676 cells with 91 pieces (A.10).
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
  - **New piece set.** The seed text used is the set seed (`setSeed`). The generator page has no Keep-seed switch; an internal `keepSeed` flag decides:
    - typing a seed turns it on, and clearing the field (✕ or deleting the text) turns it off;
    - 🎲 draws a new random seed into the field at once and turns it on;
    - with it on, every press reuses the field's seed unchanged (trimmed and NFC-normalized); with it off, every press first draws a new random seed into the field and uses it.
    - The field therefore always shows the seed of the latest set request, and the set summary shows the seed of the set on show.
  - **Batch seeds.** Every New puzzle press increments the set's `batchIndex` (1 for the first request; stored with the set, §9.6, and restarting at 0 for each new set). The generator page draws a fresh random whole number (`crypto.getRandomValues`, a uint32 written in decimal) as the batch seed of each press, keeps it with each puzzle (its `seed`, §10.6) and shows it next to the puzzle name in the main panel (not on the cards). `tools/generate.mjs` keeps `batchSeed = setSeed + "#" + batchIndex`.
    - The batch seed is internal. It is not editable and not subject to the 64-code-point limit.
    - It needs no extra label: candidates use the labels `slot/<i>/<a>` (§6.9).
- **Test vectors:**

  | Input | Expected |
  |---|---|
  | State (1, 2, 3, 4) | First outputs 11520, 0, 5927040, 70819200 |
  | Seed `demo`, no label | State `0xac19d7fd 0x1f47dc98 0x444f9bb4 0xbbb91ffa`; first outputs 3504561854, 188375601, 1212981724 |
  | `sha256Hex("abc")` | `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad` |

- **Reproduction.** Packs record seeds, levels, options and algo/policy/rng ids (§5.5). "Reproduce" re-runs a request with those inputs.
  - A set is reproduced by the same seed text, board, level and uniqueness mode (the headless generator takes the same seed).
  - A later batch also needs its session history. With an empty history, the first batch is reproduced.
  - `tools/generate.mjs` always generates its one batch with an empty history: `--batch-index N` only selects the batch seed `<seed>#N`, and nothing replays batches 1 to N − 1, so batch N of a fresh run is not the N-th batch of a session. `--code` changes only how the result is printed (§9.8). On the generator page each puzzle is reproduced by its own batch seed (shown on its card) together with the history at the time it was made.
  - Re-running one batch seed against the grown history of the same set cannot repeat that batch: its layouts are already seen (D16). This is why `batchIndex` always increments.

### 8.7 Browser qualification (BQ)

The [BQ] limits ship disabled and are enabled by changing `LIMITS` in `policy.js` once the matching test passes. Every test runs the **final pipeline** (macro carving, strict layouts, lazy certificates, compact workspaces, recycling) with uniqueness `any` and q = 10.

**Harnesses.**
- `tools/bench/index.html`: the real generator engine with a pool of 4 module workers, served over HTTP (locally or from Pages). It runs a seed matrix unattended, records per-run timings, accepted counts, byte accounting and errors, and downloads a JSON report.
- `tools/calibrate.mjs`: the same matrix in Node with 4 `worker_threads`, for fast pre-screening. Node results never replace browser results.

**Measures per run.**
- T1: from the set request to "ready" (set + calibration puzzle #1);
- T10: from the set request to the 10th accepted puzzle (set + one batch of 10); lazy certificates are excluded and reported separately;
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

## 9. Hand-off, links and storage

Puzzles travel only by link: neither app imports or exports files. The player's address always holds the open pack and puzzle, so a bookmark keeps a puzzle and sending the address shares it.

### 9.1 Mechanisms

| Mechanism | Used for | Notes |
|---|---|---|
| `../player/#p=<code>;<code>;…&i=<k>` | Generator **Play** (opened in a new tab): one puzzle code per puzzle of the list, `&i=` only when the puzzle to open is not the first; the player's address, to bookmark or share. The Player also gives this address to a pack that did not arrive by a link (the sample, or a pack after a puzzle was removed) | Self-contained and portable; a URL fragment is never sent to a server |
| `../player/#p=<core>[.<tail>]` | The one-puzzle code link (§9.9); the player opens it and never rewrites it. A code typed or pasted in the entry dialog (§11.16) becomes this address | Portable and self-contained for one puzzle |
| Local storage | Progress (player) and generator state; no pack | `localStorage`, `pentomino:v1:` namespace (§9.6) |

The Player reads the `#p=` route and decodes it in a worker (§9.9), and its entry dialog takes the code as text (§11.16). The Generator's **Import puzzle** and a `#p=` hash in its address read the same links.

### 9.2 Link sizes

The old compressed `#pack=` share code and the same-browser `#lib=` reference are gone: nothing opens them and nothing stores a pack.

- Links above 4,000 characters may be cut by some chat apps; `preparePlayerLink` returns a warning for them. The limit of a link is 16,000 characters (`MAX_URL_CHARS`).

### 9.3 Play flow

1. **Play** in the main panel of step 3 acts on the selected puzzle. The generator builds a pack of the set on show with every puzzle of the list, solutions included; k is the index of the selected puzzle.
2. It saves the generator state at once (best effort) and opens a blank tab in the click's own turn, so pop-up blockers let it through.
3. `codes ← one puzzle code per puzzle` (`puzzleSnapshot` of each puzzle of the pack at the pack's angle, encoded in the puzzle-code worker one after the other, so the codes are those of Print and Share), and the URL is built as `new URL('../player/', document.baseURI)` plus `#p=<code>;<code>;…`, with `&i=<k>` when k > 0 (`puzzleListUrl`).
   - If the URL is ≤ 16,000 characters, the new tab goes there. Nothing is saved for it: the link holds the pack.
   - Otherwise (the URL is too long, or the pack has more than 100 puzzles), a link with only the puzzle k goes, and the generator shows the notice M-PLAYER-ONLY.
   - If a code cannot be made, or even the one puzzle does not fit, the tab is closed and the generator shows M-PLAYER-UNAVAILABLE. A refused tab shows M-PLAYER-BLOCKED.
4. The player:
   1. parses the hash, then decodes and validates the pack;
   2. loads saved progress;
   3. renders puzzle k.
5. The hash stays in the URL, so reloads and bookmarks work. Switching puzzles updates `&i=` with `history.replaceState`.

The generator tab stays as it was: nothing is cancelled and background certificate checks continue. Play is disabled while a job runs.

### 9.4 Ways in

**Player:**
- the URL hash (`#p`); a later change of the hash (a link pasted into the address bar, Back or Forward) opens that puzzle too;
- **Try the sample** (`player/samples/sample-pack.json`) on the start screen.

There is no file input, drop target or paste box. A pack that did not arrive by a link — the sample, or a pack after a puzzle was removed (§11.12) — gets a `#p=<code>;<code>…` address as soon as the codes of its puzzles are made (`history.replaceState`), if the address is at most 16,000 characters. If another address was opened meanwhile (a link being loaded), it is left alone. The old `#pack=` and `#lib=` addresses open nothing.

A `piece-set` pack shows: "This link has pieces but no puzzle — open it in the Generator."

**Generator.** The generator page has no import: piece sets and puzzles come only from its own generation, and its saved state (§9.6) is read back through `validatePack`. Rules that still apply to sets read back from storage:
- Stored ratings and certificates are shown as stored and are not recomputed (§6.11, §7.7).
- A stored set without `macroRegion` (carving `imported`) uses flat-cluster LNS for New puzzle (§6.7).

### 9.5 Verification when a pack opens

The `verifyPack` worker task checks each puzzle:
- **With a valid `solution`:** solvable (verified) in O(cells), with no search. A `#p=` code with a valid tail has one, so it takes this path without any worker request.
- **Otherwise:** a bounded `solveFirst` with `verifyRows` gives solvable / unsatisfiable (only if exhausted) / not verified. A `#p=` core alone has no solution and takes this path, in the verification pool; the code itself was decoded in the separate code worker (§9.9).

Play is allowed while checking, and after an inconclusive check. "Not verified" is never shown as "no solution". Certificates and ratings carried by the pack are shown with the generator's wording; the rating's level is bold (§6.11, §7.7). A puzzle without a certificate reads "At least 1 solution" once a solution is known (a valid included `solution`, or a "solvable" result of this check), as a new puzzle does in the generator; until then, and after an inconclusive or unsatisfiable check, no uniqueness text is shown.

### 9.6 Storage

| Key | Content | Limit |
|---|---|---|
| `pentomino:v1:gen:state` | Generator state (§10.6): board, rotation, preset, level, seed text and its keep flag, uniqueness, the saved sets of each board and the set on show with its puzzles | 1 entry; ≤ 50 sets per board, 10 boards |
| `pentomino:v1:progress:<fp>` | Progress record (§5.6) | 300 entries, LRU |
| `pentomino:v1:progress-index` | LRU list of the progress records, `[{ fp, at }]` with `at` the save time in ms, oldest first; rebuilt from the key names when it is lost | 1 entry |
| `pentomino:v1:lang` | Interface language of both apps, which share it: `en` or `vi` (`?lang=` overrides it for one load) | 1 entry |
| `pentomino:v1:theme` | Theme of both apps: `light`, `dark` or `high-contrast`; absent = follow the system's light or dark setting | 1 entry |

- Every access is wrapped in try/catch.
- Retired keys: `pentomino:v1:prefs` (the Player's old Straighten view and display switches) is no longer read; `storage.dropRetired()` removes it, and the Player calls it when it starts.
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
- QR codes are made on the device (`core/browser/qr.js`, §4.3); no puzzle, code or link is sent to a QR service.
- Size limits: pack ≤ 512 KiB; `meta` ≤ 4 KiB. A puzzle code has its own bounds, all checked before the content is read (§9.8). A complete `#p=` address is a separate bound from the code's: the code is at most 16,000 symbols, and the address a producer builds with `puzzleCodeUrl` is checked by that producer against `MAX_URL_CHARS` (16,000 characters), with the 4,000-character long-link warning where it applies; `puzzleCodeUrl` itself checks neither (§9.9).

### 9.8 Puzzle code (`puzzlecode.js`)

The single-puzzle code turns one puzzle into text and back (`encodePuzzleCode`, `decodePuzzleCode`, §4.2). The codec itself is engine code; the worker tasks, the browser client and the Player's `#p=` route that use it are in §9.9, the Player's code-entry dialog is in §11.16, the print sheet that carries a code is in §11.15, the Share dialog is in §11.17, and the headless `--code` output is the last item below. It needs no seed, calibration or search; a seed alone cannot rebuild a puzzle, because a result depends on the history of its set (§8.6).

- **Frame.** `F = C` (no stored solution) or `F = C "." T`. The **core** `C` is base32(`Pc`) plus 4 check symbols, where `Pc` is a 5-bit version symbol, the payload and zero bits up to a multiple of 5. The optional **tail** `T` is base32(`Pt`) plus 4 check symbols, where `Pt` is a 5-bit tail tag, the steps and the same fill. A core alone is a complete, playable puzzle; a tail only adds the stored solution.
- **Check.** CRC-20: generator 0x6C1BD, initial value and final xor 0xFFFFF, no reflection, the 20 bits written as 4 symbols, most significant first; `CRC20("123456789")` = 0xC80C0. The core check covers `Pc`. The tail check covers `Pc + Pt`, not the core's own check symbols (a complete component run through the CRC gives 0x6CDCE), so a tail taken from another puzzle is refused. All checks run before anything is parsed.
- **Alphabet.** `0123456789ABCDEFGHJKMNPQRSTVWXYZ`: no I, L, O or U. Output is upper case and ungrouped; grouping for paper is a presentation matter.
- **Version symbol and compression.** 1 is the raw payload. 2 is `EG8(m)` followed by `m` bytes of `deflate-raw` data of the same payload; the inflated data must be exactly ⌈bits / 8⌉ bytes with zero fill. Another value is `version`. Tail tag 1 is the raw solution path; another tag is `tail-tag`. The encoder keeps the shorter complete core and raw wins a tie (raw wins for the sample puzzles; DEFLATE pays only for very repetitive content or a long full-claim rating); without `CompressionStream` it writes raw. Version-2 strings depend on the compressor, so tests compare decoded content, never the string. A version-2 code without `DecompressionStream` is `no-deflate`; a raw code never needs it.
- **Payload (version 1), in order.**
  1. Options: a repeated-shape flag, the rating, the title, the certificate.
  2. `W − 1` and `H − 1` (6 bits each), the board mask, the display angle ÷ 45 (3 bits).
  3. `EG3(K − 1)`, three flags (canonical piece order, canonical orientation, default identity), and, with the repeated flag, one "same shape as the previous piece" bit per piece.
  4. The piece sizes, then the shapes: up to 10 cells by catalogue index (or by the colex rank of the indices of one size when the order is canonical), larger pieces by a bounded breadth-first listing of their cells.
  5. The orientation of each stored piece (3 bits) unless all are canonical; per-piece id, label and RGB overrides unless the identity is the default (`id = label = labelFor(i)`, colour `colorFor(i)`).
  6. The clues: their count, which pieces, their order, and for each the index of its pose among the legal placements of its shape.

  The tail steps cover the free cells in raster order: at each first free cell, the index of the placement among the candidates (unused pieces in index order, each distinct orientation anchored on that cell). Primitives: `EGk` (Exp-Golomb of order k, exact up to 2^53 − 1 with BigInt), truncated binary, colex subset rank, and `text(s)` (UTF-8, or UTF-16 for a string with a lone surrogate).
- **Board mask.** `tb(mode, 5)` then: 0 full; 1 blocked-cell gaps (`EG2` count, `k`, gaps); 2 row-major runs starting with an active run (`k`, `EG2` count of stored runs, the runs; the last is implied); 3 greedy blocked rectangles in raster order; 4 bitmap. The encoder writes the shortest, counting the mode selector; a tie goes to the lowest mode and, in modes 1 and 2, to the smallest `k` of 0 to 7.
- **Rating.** The compact form stores only `stop`, `branchTrials` and `rowTrials`. The decoder rebuilds U = K − G; B (5,000 when saturated, else the trials capped at 5,000); the score, an integer (2U plus the number of thresholds ≤ B); the level from the frozen bands; R, the free cells; and H, from count-only placement counting in the plan's order (size, canonical shape, id), with no exact-cover model and so no workspace limit. The encoder uses the compact form only when the rebuilt claim equals the stored one exactly (`difficulty-v2`, known stop, counters in range); otherwise, or if the rebuild fails, it stores the whole claim as JSON text, so foreign models, `censored`, opaque metrics, fractional scores and inconsistent levels survive. Rating never makes an encode fail. H is exact within one JavaScript engine; score and level do not depend on it.
- **Title.** Kind 0 none; 1 the label of the decoded rating's level; 2 that label + " #n" (written as `EG2(n − 1)`, n ≤ 2,147,483,647, judged on the digit string before any number conversion); 3 literal text. The label is looked up only for kinds 1 and 2, and needs a known level id (the named levels and `hell-1` … `hell-999`). Resolving the displayed title is the caller's job; the codec stores the title it is given (the printout gives it the title of the heading rule, §11.15).
- **Certificate.** A present flag; `tb(status, 4)`; model `dlx-v1` or text; an optional row limit as `EG10`, exact up to 2^53 − 1 (2^53 is `invalid`).
- **Bounds.** Every count, rank and size prefix is checked before a loop or an allocation, and a correct check does not make a payload trusted.

  | Item | Bound (`CODE_BOUNDS` and the input constants) |
  |---|---|
  | Input text; normalised code | ≤ 32,768 characters; ≤ 16,000 symbols (the dot is not a symbol) |
  | Board | sides ≤ 64; 1 to 1,024 active cells |
  | Pieces | K 1 to 128; 1 to 128 cells each; catalogue indices, subset ranks and placement indices inside their lists; a breadth-first shape ends within 4n + 8 steps |
  | Text | id ≤ 8, label ≤ 4, title ≤ 80, model ≤ 64 code points, the size prefix checked at 4× before reading; a whole rating as JSON ≤ 8,192 bytes |
  | Numbers | `EG` prefixes ≤ 53 − k zeros, values ≤ 2^53 − 1 |
  | DEFLATE | compressed length within the remaining bits; inflated output ≤ 64 KiB, enforced while streaming in 256-byte writes |
  | Correction | a covered word ≤ 5,732 symbols |

- **Decoded pack.** An ordinary `pentomino-pack` version 1 document (§5) with one puzzle: `presentation.rotation` carries the display angle, there is no `witness`, `generation` or `meta`, and the puzzle `id` is recomputed by `puzzleId` from the decoded board, pieces and clues. There is no schema change. `validatePack` runs last, so G = K, a layout that does not cover the board and a solution that moves a clue are `invalid`. The only normalisations are: colours lower case, an empty title absent, poses of symmetric pieces in their smallest equivalent orientation, and a solution (present only with a valid tail) in piece order. Stored claims stay claims; no `verified` flag is written. `progressFingerprint` and `puzzleId` equal those of the original geometry and piece ids.
- **Errors.** `PuzzleCodeError.code` is `empty`, `bad-char` (with `params.char`), `dots`, `too-long`, `core-check` (also for a core shorter than 5 symbols or an empty core before a dot), `version`, `no-deflate`, `invalid` (structure, bounds, expansion, ill-formed UTF-8, `validatePack`) or `index` (a `#p=` link with `i` other than 0). A bad core throws; the first fault from left to right wins in normalisation; anything unexpected inside the decoder becomes `invalid`, so ordinary malformed input never produces another kind of error. Messages are developer-facing English; the apps show their own texts by `code`. `encodePuzzleCode` throws `invalid` for a snapshot that is not a valid puzzle (it passes `createPack` and `validatePack`) and `too-long` when `C`, or `C` plus `T`, exceeds 16,000 symbols.
- **Tail errors.** A valid core with a bad tail does not throw: `decodePuzzleCode` resolves with the core's pack, `hasTail: false` and `tailError` of `tail-check` (the check fails, or the tail is empty), `tail-tag` (unknown tag) or `tail-invalid` (it decodes but is not a valid layout of this core). Opening the core alone is an explicit user choice, never automatic. A valid tail sets `hasTail: true` and is a validated stored answer.
- **Correction candidate.** Computed only after a failed check of a core, or of the tail of a valid core; never for a checksum-valid unsupported version or a structure error. The CRC syndrome of the received word is matched with the 31 single-symbol differences at every position (five basis syndromes clocked back one symbol at a time, with no decode per character). The candidate is offered only when exactly one position and difference match and the corrected component then passes its check and a complete bounded decode (for a tail, against its core). `group` and `position` are one-based and counted in the normalised component (a tail from the symbol after the dot, aliases and grouping removed first); `correctedCode` is the whole normalised code with the change, so a UI can confirm it against the input still on screen. Single-symbol syndromes are distinct for words up to 5,732 symbols (177,692 of them; the first collision is at 5,733), so nothing is offered beyond that: the word is the whole core, or for a tail `Pc` plus the tail. Within the bound, two substituted symbols, an adjacent swap and bursts of up to four symbols are always detected; one missing or extra symbol is not corrected. The engine never applies a candidate, opens a puzzle or touches state, storage or navigation.
- **Frozen data and lazy catalogue.** `puzzlecode-v1.js` keeps its own copies, so a change of the live engine never changes how an old code reads: the CRC constants; the catalogue of free polyominoes of 1 to 10 cells (6,473 shapes, counts 1, 1, 2, 5, 12, 35, 108, 369, 1285, 4655, in canonical form ordered by size then cells, pinned by SHA-256 `049504c2…` in `tests/fixtures/puzzlecode-v1.json`); the 128 default piece colours and labels; and the `difficulty-v2` score thresholds, level bands and caps (5,000 branch trials, 50,000 rows). A test compares the integer score and level tables with `difficulty.js` and `levels.js` for all 640,128 pairs of U 1 to 128 and B 0 to 5,000 as an oracle, never as a dependency. Importing the codec builds nothing: one size of the catalogue is built the first time a piece of that size is encoded or decoded and then cached (all ten sizes take about 0.1 s), and pieces above 10 cells never use it. A host therefore runs the codec, and so its candidate search, in a worker.
- **`#p=` parser and input.** `parsePuzzleHash(hash)` is the single owner of the structure of the `p` route; the host address parser (`parseLocationHashResult`, §9.9) delegates to it. It reads the text after the first `#` (or the whole text), splits it on `&` and looks at `p`, `pack`, `lib` and `i` (case-sensitive; other keys are ignored). It returns `invalid` for a repeated known key, a missing or empty `p`, or `p` together with `pack` or `lib`; then, for `i`, nothing or `0` is fine, another value of one to six digits without a leading zero is `index` unless the raw `p` can hold several codes (it has a `;` or an encoded `%3B`), and anything else (`00`, a sign, whitespace, longer, percent-escaped) is `invalid`; last, `p` is URI-decoded exactly once (a `+` stays `+`, `%2520` is not decoded twice) and an invalid escape or an empty result is `invalid`, and a nonzero `i` that names none of the codes of the decoded `p` (`splitPuzzleCodes`: the pieces between `;`, trimmed, empty ones dropped) is `index`. Success is `{ ok: true, value: { p, index } }` with `p` not yet normalised (it may hold several codes separated by `;`; `index` is the `i` value, 0 when absent and always 0 for one code). `splitPuzzleCodes`, `isPuzzleCodeList`, `isPuzzleListHash` (an address that carries several codes) and `normalizePuzzleCodeList` (every code normalised; at most `MAX_PUZZLE_CODES` = 100 and `MAX_INPUT_CHARS` of text, else `too-long`; none is `empty`) read such a value, and `normalizePuzzleCodeText(text) → { codes, index }` does so for a link or a bare text. `normalizePuzzleCodeInput` sends text containing `#` through the parser and normalises its decoded `p` as one code (a `;` is `bad-char`); any other text is a bare code. Normalising (`normalizePuzzleCodeValue`) removes spaces, tabs, line breaks and `-`, upper-cases ASCII letters, maps O to 0 and I and L to 1, and keeps at most one `.`: another character is `bad-char`, a second dot `dots`, nothing left `empty`, and too much text `too-long`. The structural cases are the table `tests/fixtures/puzzlecode-hashes.json`.
- **Command-line output (`tools/generate.mjs --code`).** An optional boolean flag, off by default and without a value: a repeated `--code` and `--code=…` are refused. A recipe may accompany it, as it may `--workers`, `--max-active` and `--output`, because it changes the output and no semantic input; it is never part of a generation payload, so seeds, histories, ratings and the exit codes are as without it. With it, stdout holds exactly one `F` per accepted puzzle, in pack order (the first line is puzzle index 0), each ending in a line feed, ungrouped and upper case, with no index, label, quote or progress; stderr keeps the progress and every error. `--output` still receives the unchanged pack JSON (and the "wrote" note on stderr); without `--output` no file is made, and the lines replace the pack JSON on stdout. Without `--code` the output is unchanged: the pack JSON on stdout, or in `--output` with nothing on stdout. Each line comes from the same `puzzleSnapshot` as Print (§11.15: displayed heading, effective angle, stored answer; the untitled label is "Puzzle #n") and the same `encodePuzzleCode` with its shortest-form choice, so the CLI prints the same `F` as the browser for the same pack; DEFLATE bytes may differ between engines, never the decoded puzzle. The pack is not modified: no title is written back. A puzzle with a stored answer gives `C.T`, one without gives `C` alone; `encodePuzzleCode` is not forced to raw (only the golden tests do, through the optional `encode` of the output helper).
  - **Output helper.** `emitGeneratedResult(pack, { code, output }, io)` receives an accepted, validated pack and chooses no exit code. It makes every line before anything is written and checks each is a canonical code, then writes `--output` and the "wrote" note, then all the lines in one stdout write, so no partial list is ever printed. A failure of the snapshot, the encoder, the line check, the file or stdout rejects; `run` reports `generate: …` on stderr (for a code, `no code for puzzle N: …`), never calls it written or copied, and exits 1 (an output failure is not exit 2, even for a partial pack).
  - **Exit codes.** Unchanged: 0 complete (including a proven complete smaller arrangement set), 2 a valid partial or cancelled pack (with the codes of its accepted puzzles and no placeholder for the missing ones), 1 no usable result, invalid input or an output failure. `--help` prints the usage, which describes the flag, and generates nothing. As before, `--batch-index N` starts with an empty history and nothing replays earlier batches (§8.6).

### 9.9 Opening a puzzle code (worker service and Player route)

The Player opens a `#p=` address, and a code typed in its entry dialog (§11.16), through a worker-backed service. Nothing here reads application state to invent a title or an angle, and no page decodes a code on its own thread.

- **Worker tasks.** `encodePuzzleCode` (payload `{ snapshot }`) and `decodePuzzleCode` (payload `{ text }`) travel in the ordinary task envelope of §8.1; the protocol has no new version. `protocol.js` checks the payload before the codec runs. A snapshot is a strict plain-data copy: `rows`, `rotation`, `pieces` and `clues` are required, `title`, `solution`, `rating` and `certificate` are optional and become `null`, and an unknown field, a function, a class instance or an `AbortSignal` is refused; a rating's free-form `metrics` must be plain JSON at most 8 levels deep with at most 4,096 values. The text is a string of at most 32,768 UTF-16 code units (an empty one is the codec's own `empty`). The codec then judges the puzzle (`invalid`) and the normalised code. The task takes no options, so encoding picks the shortest form, as `compression: 'auto'` does. `executeTask` returns a Promise for these two kinds only; the solver kinds stay synchronous (§8.1).
- **Replies.** A success value is `{ C, T, F, version }` or `{ pack, hasTail, tailError, candidate? }`. A core error (`empty`, `bad-char`, `dots`, `too-long`, `core-check`, `version`, `no-deflate`, `invalid`, `index`) is the existing error reply with that code and one issue `{ code, path: '$', message, params?, candidate? }`; `params` and the correction candidate are validated by `parseWorkerMessage` and so travel through the pool's `WorkerTaskError.issues` unchanged. A bad tail on a valid core is a successful reply with `tailError`, never an error. An unexpected exception is the sanitised `internal` error.
- **Client (`createPuzzleCodeClient`).** Nothing exists before the first operation: the default pool, with one module worker, is created then, and is owned and closed by the client (a pool passed in is caller-owned and must be dedicated to it; `createPool` makes an owned one). Importing it builds no catalogue. Each `encode`, `decode` or `repair` begins one pool request with a new increasing ID (shared by every client of the page) and a revision, sends one task, awaits it and ends the request in `finally`. `decode` first normalises the typed text on the page (structure only: a link goes through `parsePuzzleHash` with its index and mixed-key rules, a bare code through the input normaliser), so a malformed input fails at once without a worker, and the worker gets the normalised code. Results are `{ ok: true, value, warnings }` or a failure `{ ok: false, issues, recovery?, candidate? }`: codec errors keep their code, `params` and message; a valid core with a damaged tail is a failure with `issues[0].code` of `tail-check`, `tail-tag` or `tail-invalid` and `recovery = { kind: 'core-only', code, pack }`, so existing callers cannot commit it by mistake; the client adds `normalizedCode` and `offset = 4 × (group − 1) + position − 1` to a worker candidate, and a successful decode carries `code`, the normalised request. `repair(text)` is the same decode: its value is the candidate, or `null` when none exists (ambiguous or beyond the 5,732-symbol bound), and malformed text or a service failure stays a failure. Service failures are `worker-unavailable` (no module workers; nothing is decoded on the page) and `worker-error` (a worker crash, a protocol or transport fault, an unreadable reply, or the pool's 115-second watchdog with `params.reason` `deadline`, which is never reported as an invalid puzzle). `cancel()`, `dispose()` and a newer operation stop the running one: its promise rejects with the pool's `PoolAbortError` (`cancelled`, `closed`, `superseded`) and its late reply is ignored; a cancellation uses the operation's own abort signal, so no other pool or request is touched. `dispose` is idempotent and later calls reject as `closed`.
- **Route.** `parseLocationHashResult` is the host adapter, not a second parser: when a `p` key is present (`isPuzzleHash`) the whole hash goes to `parsePuzzleHash`, whose `index` failure becomes `invalid-index` and `invalid` failure `invalid-hash`, and success is `{ p, index }` (`index` 0 for one code; the `i` value for a list); without a `p` key the result is `no-incoming` (the old `#pack=` and `#lib=` addresses are not routes). The table `tests/fixtures/puzzlecode-hashes.json` drives both this adapter and the code input. The code entry names these failures `index` and `invalid` again (the controller maps them for its failure callback). A pasted link goes through the same parser and so obeys the same index and mixed-key rules; it is never fetched.
- **Atomic loading.** `readIncoming` handles a `p` value with one code by normalising it as a bare code (`normalizePuzzleCodeValue`: a literal `+` is `bad-char`, an encoded `#` is not a nested route, nothing is decoded twice) and passing it to `env.decodePuzzle`, the worker decoder; a success is `{ pack, index: 0 }` with the decoder's warnings, a failure keeps its issues, `recovery` and `candidate`. It changes no application or storage state. A recovery is data, not a decision: nothing opens it until the user chooses. **A list** (`p` with `;`, from an address or from typed text) takes the same path through `readPuzzleCodeList`: the codes are normalised first (`normalizePuzzleCodeList`) and the index is checked against their number, so a bad text or number fails before any worker work; then the codes go to the decoder one after the other (one temporary client for all of them when no decoder is injected, disposed at the end), the first failure stops the rest and is returned with its issues named by place (`path` `$.p[k]`, zero-based) and without `recovery` or `candidate`; the one-puzzle packs must have the same board and pieces (`JSON` of both, else `invalid` with "Puzzle k is for another board or piece set than puzzle 1.") and distinct puzzle ids (else `invalid`, "Puzzle k repeats puzzle j."); the result is the first pack with every puzzle, in order, and `index` the `i` value. A failure of the entry shows "Puzzle k:" before its text (`code.error.puzzle`).
- **Player controller.** `openHash` and `start` load `#p=` addresses through the controller's own client (made on first use; a client passed in as `puzzleCodeClient` is cancelled but never disposed). A load commits only a successful pack (one puzzle for a one-code address, all of a list's), through the commit that restores saved progress by fingerprint and starts verification as for any pack. A one-code `#p=` address is never rewritten (no lower-casing, grouping or `&i=0`, not on puzzle changes either); an address with several codes (`isPuzzleListHash`) follows the open puzzle (`hashWithIndex`: only `i` changes, the codes stay). The pack has source `hash`. A failure leaves the open pack, game, moves, timer, address and saved progress as they were; `onPuzzleCodeFailure({ text, failure })` receives the address as received and the failure with `recovery` and `candidate`, and then the store's `error` stays empty (without the callback the failure is the store's `error`). `loadPuzzleCode(text, { commitAddress? })` opens typed text the same way and returns the `CodeResult`; with `commitAddress: true` the normalised code(s) become `#p=<code>[;<code>…]` (and `&i=<n>` when a link named a later puzzle) by `history.replaceState`, otherwise the address is not touched, and a failure never touches history. `cancelPuzzleCodeLoad()` moves the load revision first, so a late success cannot commit, and then cancels the client's operation; a superseded or cancelled load resolves as the `cancelled` issue (an `{ ok: false, stale: true }` result for `openHash`).
- **`puzzleCodeUrl(playerTarget, code)`.** The address of a puzzle for a Player the caller already chose: the target without its query and fragment, then `#p=` and the canonical code (the input is normalised as a bare code). The target is the selected Player address, never the page the caller is on (so a public fork target is not replaced by the upstream site). It must be `http:`, `https:` or, for a page opened from a file, `file:`; `javascript:`, `data:` and any other scheme, credentials and unparsable targets are a `RangeError`. No `i` key is added. The result is checked by the caller against `MAX_URL_CHARS`; the 4,000-character long-link warning stays the caller's.

---

## 10. Generator application

### 10.1 Layout

The generator is a three-step wizard (`generator/ui/wizard.js`): **1 Create board**, **2 Create piece set**, **3 Create puzzles**. The page has a header and three panels:

- **Header.** Title, the **Import puzzle** button (§10.6), the **EN | VI** language buttons and three theme buttons (light, dark, high contrast), then a **Settings** button that only a phone shows. Below 768 px the header is one row: the title, an **Import puzzle** icon and the **Settings** icon (`data-action="settings"`, the gear of the page sprite; the texts stay for screen readers). The language and theme switches are hidden there; **Settings** opens `core/browser/settings-dialog.js`, a modal dialog (`dialog.pm-settings-dialog`, the head of the other dialogs, Escape, the ✕ and a click on the backdrop close it) with the same buttons (`[data-lang]`, `[data-theme-value]`) in two rows, **Language** and **Theme**. The page's own wiring finds them with the buttons of the wide header, so one choice sets every copy (`aria-pressed`), is saved under the same keys and is shared with the Player.
- **Steps panel** (right). One frame per step with its number and name; clicking the name opens the step.
  - The frame of the current step is highlighted and holds that step's settings and action button (§10.2–§10.5).
  - A step that cannot be opened yet has a dashed frame and is disabled, with the reason as its tooltip. A finished step shows its number in green.
  - Under a step the user has moved past, the frame shows a summary that opens the step when clicked (or Enter/Space): under step 1 one line with the preset and the size, columns×rows ("Heart 8×15"), on the first line and the board thumbnail, centered, under it; three lines under step 2, e.g. `Set 4/6`, `Expert | ABCD-EFGH-JKLM`, `14 pieces | Piece sizes 5–13`.
- **Main panel** (middle). The section of the current step, headed "Step N - name", with a one-line hint.
  - At its top right, the navigator buttons "‹ Step N−1 - name" and "Step N+1 - name ›", each shown only when that step exists. The forward one is disabled, with the reason as its tooltip, until the next step can open.
  - Above the sections, one outcome area (`role="status"`) shows the notice of the last action (§10.7), with its action buttons.
- **Puzzles panel** (left). Header "Puzzles of set n/total" ("Puzzles" without a set) with **Remove all**, then the puzzle cards (§10.5).

Breakpoints: from 1360 px the panels are three columns (Puzzles | Main | Steps). From 768 px to 1359 px, Main sits above Puzzles on the left and the steps panel is a sticky column on the right. Below 768 px the page is one column of three frames, one per step, styled as the frames of the steps panel (the header, the summary of a finished step under it, the highlight and the dashed border as in the wide layout). The nav and its list give up their boxes (`display: contents`) so that the frames and Main are siblings of the page's flex column, and `order` interleaves them (frame n is 10n, and Main of the current step 10n + 1, chosen with `:has()` on the current header): Main comes under the frame of the current step. Main's own heading is then only for screen readers, and its **‹ Step N−1** button is hidden (the frame above is one tap away). The settings and the action button of the current step (`[data-step-body]`) are a bar fixed to the bottom of the window (`position: fixed`, one or two rows of compact fields): `app.js` writes its height to `--gen-bar-space` on `body` (a `ResizeObserver`), which becomes the page's bottom padding. The Puzzles panel is not shown: `puzzle-nav.js` (§11.1) at the top of the selected puzzle's section steps through the puzzles of the set in creation order (◀ older, ▶ newer, "Puzzle n of N") with **Remove** (the puzzle on show) and **Remove all** on a row of their own at the right, and sets the selection as a click on a card does. In step 2 the level table has smaller text, and the piece set's ◀ ▶ are smaller, with **Remove** and **Remove all** on their own row.

```text
┌ Pentomino Generator ───────────────────────────────────────────────────────────────────────────────── [EN|VI] [☀|☾|◐] ┐
│Puzzles of set 2/2 Remove all│ Step 3 - Create puzzles  [‹ Step 2 - Create piece set]  │ ① Create board                │
│ ┌────────────────────────┐  │ Choose a level, then generate puzzles one at a time.    │   ▦ board thumbnail           │
│ │ Puzzle #2           ✕  │  │ Puzzle #2  Seed: 2846513907                  [ Play ]   │ ② Create piece set            │
│ │ Hard: score 20   ▦▦▦   │  │ ┌──────────────────────────────┐                        │   Set 2/2                     │
│ │ 6 pieces to place▦▦▦   │  │ │ board with the clues placed  │                        │   Hard | K7Q2-9MXA-3FWD       │
│ │ Unique solution ✓      │  │ └──────────────────────────────┘                        │   9 pieces | Piece sizes 4–9  │
│ └────────────────────────┘  │ Pieces to place                                         │ ③ Create puzzles              │
│ ┌ Puzzle #1 … ┐             │ ▢B ▢D ▢E ▢G ▢H ▢I                                       │   Difficulty level [Hard ▾]   │
│                             │                                                         │   ☐ Require unique solution   │
│                             │                                                         │   [       New puzzle      ]   │
│                             │                                                         │   Elapsed: 0:07 (while busy)  │
└─────────────────────────────┴─────────────────────────────────────────────────────────┴───────────────────────────────┘
```

**Step availability.** Step 2 opens once the board can get a piece set (`describeBoard(...).valid`); step 3 opens once a piece set is on show. A requested step beyond that falls back to the furthest open step. Without `?step=`, a visit starts at step 3 when the set on show has puzzles, at step 2 when there is a set, else at step 1. Opening a step pushes a history entry (`?step=N`), so the browser's Back and Forward walk through the steps.

### 10.2 Step 1: Create board

- **Settings (step frame).** Preset (Rectangle, Heart, Diamond, Cross, Ring), Rows and Columns.
  - Rows and Columns are whole numbers from 3 to `LIMITS.maxSide` (32); other values are refused with a message and the field is reset. Cells inside the new bounds keep their state; new cells are active.
  - Choosing a preset applies it at once (§6.2): Rectangle with the current Columns and Rows, the others at their default size, with their rotation (Heart and Diamond: 45).
- **Board (main panel).** The editor (`mountBoard` in edit mode) with a toolbar on the board: ✥ move tool (while on, a drag moves the view instead of painting), − / + zoom, ⤢ fit, ⟲ / ⟳ view rotation. The wheel or a pinch also zooms.
- **Painting.**
  - Pointer-down on a cell toggles it and fixes the paint mode for the gesture: block or unblock, the new state of the first cell. Hit-testing uses edit mode (§6.3), so blocked cells can be hit and unblocked at any display rotation. Blocked cells are grey with a cross.
  - Dragging applies that mode. One gesture is one undo step; `Ctrl`/`Cmd`+`Z` undoes up to 50 board changes (size, preset and painting).
  - Keyboard: the arrow keys move a cell cursor (in the on-screen direction, D5) and Space toggles the cell.
  - Size, preset and painting are disabled while a job runs.
- **View rotation.** ⟲ sets `rotation += 45` and ⟳ sets `rotation −= 45` (mod 360). It never invalidates sets or puzzles; it is stored and kept in the address.
- **Status.** A status line "60 / 60 playable squares · connected" (playable / all cells), or the playable count plus the error (N-SMALL, N-CAP, disconnected regions). Below it: why the board cannot get a piece set, N-LARGE above 360 cells, and N-COUNT for the selected level.
- **Board edits never discard work.** The set on show always belongs to the board on show (`withBoard`). When the board changes, the set on show is saved under its own board, and the newest set saved for the new board is shown with its puzzles; without one, step 2 and step 3 show empty lists. Going back to an earlier board brings its sets back. A selected level that the new area does not offer moves to the nearest offered one.

### 10.3 Step 2: Create piece set — level and seed

- **Level table (main panel).** One row per listed level, Very easy … Hell 3, with the columns Level, Pieces, Piece size and Pre-placed for the current area: `pieceCountRange`, the size window and the initial pre-placed count g_L (§6.4, §7.4), as ranges such as "16–18".
  - Each number has a **?** button whose tooltip (`level-help.js`) shows the worked calculation, for example the piece-count target K60·(A/60)^0.28, its cap, spread and feasibility limits.
  - Levels not offered at this area stay listed, disabled, with "needs a larger board" or "needs a smaller board" (§7.5).
  - Clicking anywhere on an offered row selects its level. The table is disabled while a job runs.
  - Under the table: N-UNIQUE-EXP when uniqueness is required at a Hell level above 200 cells, and the reason when the board cannot get a set.
- **Settings (step frame).**
  - **Seed** text field (placeholder "Leave empty for a random seed") with ✕ to clear it and 🎲 to draw a random seed into it (§8.6). An invalid seed (more than 64 code points) shows "Enter a seed of 1–64 characters, or clear the field for a random seed."
  - **New piece set** starts the set job (§6.5, §8.2) with the board, the selected level, the uniqueness switch of step 3 and the seed. It is disabled while a job runs, while the board cannot get a set or the level is not offered, and when the board already has 50 sets (a warning then asks to remove a set first).
- **Outcome.**
  - Success: the new set becomes the newest set of the board ("Set total/total") and is shown with no puzzles; the set shown before is saved in the list.
  - A set equal to one already in the board's list (same board rows and the same shapes up to rotation and reflection, `setKey`) is not added: that set is shown instead, with N-DUPSET.
  - No set within the time limit: N-NOSET. Cancel: M-CANCELLED-SET. Both leave the set on show unchanged.
- Changing the level or the uniqueness switch keeps the set on show. The set keeps the level and uniqueness it was made for (`calibrationFor`), which its summary shows; the next New piece set uses the new choice.

### 10.4 Step 2: Create piece set — the set list

Under the level table, the heading "Piece sets" and the set panel:

- **Navigator row**, shown while a set is on show: ◀ "Set n of total" ▶ centred, with the small **Remove** and **Remove all** buttons on the right.
  - The list holds the sets made for the board of step 1, newest first; sets are numbered oldest first, so the newest is "Set total of total". ◀ goes to an older set and ▶ to a newer one; the navigator is hidden while the board has a single set. Stepping brings the stored rotation of that set back.
  - **Remove** drops the set on show and its puzzles; the next older set takes its place, else the next newer one, else no set.
  - **Remove all** (shown with two or more sets) asks for confirmation, then drops every set of this board with their puzzles. Sets of other boards stay.
  - All of them are disabled while a job runs.
- **Summary line**, e.g. "Hard | 13 pieces | Piece sizes 7–12 | Seed ABCD-EFGH-JKLM" (the seed part is left out when the set has none).
- **Pieces.** Thumbnails in the board's display rotation, sorted by id, each with its label and size ("C · 5"), laid out in balanced rows (10 pieces on rows of at most 4 give 4, 3, 3).
- **Select this piece set** (primary, under the pieces at the right, shown while a set is on show): opens step 3 with that set, like the step 3 header.
- Without a set: "No piece set yet. Generate one first."

### 10.5 Step 3: Create puzzles

- **Settings (step frame).**
  - **Difficulty level**: the levels offered for the set's board, defaulting to the level the set was made for. Another choice applies to the next puzzles only; the set is kept. A level far from the set's own level may be unreachable with this set; the request then ends with N-SETLEVEL.
  - **Require unique solution** (off by default). Puzzles must then be proven unique (§6.11). The switch also applies to the next New piece set and is kept in the address.
  - **New puzzle** adds one puzzle to the list per press: q = 1, a fresh random batch seed, `batchIndex + 1` (§6.9, §8.6). Puzzles stream into the list as they are accepted. It is disabled while a job runs and when the set cannot make puzzles (fewer than 3 pieces, no witness, a board outside the limits, or a level not offered); the reason is shown in the main panel.
- **Limits of the list.** At most 100 puzzles (M-PACK-FULL). The seen-history of a set holds at most 1,000 layout and clue keys; when it is full, M-HISTORY-FULL offers **Reset history** (earlier arrangements may then reappear). Play opens the whole list as one pack, so the list also ends where that pack would pass 512 KiB: New puzzle is refused with M-PACK-SIZE when one more puzzle about the size of the newest would not fit (`roomForAnotherPuzzle`), and a new puzzle that turns out larger and does not fit is dropped, with the same message, which then replaces the batch's cancel or shortfall message. The generator has no file export.
- **Puzzle cards (left panel)**, newest on top; the number counts in creation order and follows removals. Each card is one button that selects the puzzle, with a ✕ in its corner:
  - "Puzzle #n";
  - the level in bold and the score: "**Hard**: score 20" (a saturated score gets "+");
  - "6 pieces to place" (K − G);
  - the solution status (§6.11): "Checking…" while it streams in or its lazy certificate is pending, then "Unique solution ✓", "Multiple solutions", "At least 1 solution" or "No solution exists"; "Uniqueness not checked" when no certificate was computed;
  - a thumbnail in the display rotation.
  - ✕ removes the puzzle; **Remove all** in the panel header removes every puzzle of the set. Removing never shrinks the seen-history, so removed arrangements are not generated again. Both are disabled while a job runs.
- **Selected puzzle (main panel).** The newest puzzle, until a card is clicked; then that puzzle until it is removed. It shows "Puzzle #n" and, next to it, "Seed: 2846513907" (the batch seed of its press; the cards do not show it, as in the Player), with **Play** (§9.3) and, on its right, **Print** (an icon, a printer, named by its `aria-label` and tooltip; §11.15) at the top right, the board with the pre-placed pieces and, at its top right, the board tools of step 1 (− / + zoom, ⤢ fit = back to the fitted size, which is the width of the frame (at most 560 px, so a phone gets a smaller board) divided by the board's longest side after any turn; until the cells are zoomed by hand, the board and the pieces follow the frame when its width changes, as when the step is shown or the screen turns, ⟲ / ⟳ turn the view by 45°; the view angle is the one of step 1, and a zoomed board scrolls inside its frame), under the board at its right **Show solution** (a borderless toggle, `aria-pressed`; it draws the stored solution on the board around the pre-placed pieces and becomes **Hide solution**; it is off again for every other puzzle shown, and disabled with a tooltip when the puzzle has no stored solution), and "Pieces to place": the remaining pieces at 60 % of the board's cell size. Play is disabled while a job runs.
- **Repeated puzzles.** A puzzle with the id, clue key or layout key of a puzzle already in the list is never added; the request then ends with M-DUPLICATE, which suggests a new piece set.
- **Shortfalls** show their notice (§6.9, §10.7). For `layouts-not-found` and `difficulty-not-found` the notice offers **Generate new piece set**, which runs New piece set with the current settings.

### 10.6 Jobs, states and storage

- **Jobs.** New piece set (`set`) and New puzzle (`batch`) are the only jobs; one runs at a time. While it runs, its button shows a spinner (`aria-busy`) and "Elapsed: m:ss" under it (`elapsed.js`, not a live region). After 30 s the same button turns into **Cancel**. Every control that changes the board, the settings, the sets or the puzzles is disabled during a job; the wizard navigation stays available. Accepted puzzles stay after Cancel or a time-limit stop.
- **Background work.** Lazy certificate checks (§6.11) are not a job: they run on idle workers, update the cards as they finish and stop when a new job starts.
- **Import puzzle.** Not a job either (it never blocks the controls): the **Import puzzle** button of the header (`data-action="import-puzzle"`, left of the language switch) opens the puzzle-code entry dialog of the Player (`core/browser/puzzle-code-dialog.js`, with the Generator's own title, field label, hint and button texts `import.*`; the other texts, the correction offer and the messages `code.*` are copies of the Player's) in `document.body`. The text, a puzzle link (`…#p=…`) or a bare or grouped code, is read by `controller.importPuzzleCode(text)`: the code is decoded by a puzzle-code client of its own in the module worker (`readPuzzleCode`, so the Player's rules apply: normalisation, checksum, typo candidate, damaged tail with **Import without the solution part**), a newer import or `cancelImport()` drops an older answer, and only a decoded one-puzzle pack reaches `importPuzzle(state, pack)` of `state.js`. A failure changes nothing and is explained in the dialog. A link with several puzzles (a Play link) brings all of them, each through `importPuzzle` in turn: the first makes the set and the others join it; the status shown is `new-set` when one made a set, else `added`, else the first refusal (`sets-full`, `pack-full`) or `exists`. `importPuzzle` returns a status: `new-set`, `added`, `exists`, `sets-full` or `pack-full`; the controller adds `busy` while a job runs (nothing is imported then). A success closes the dialog, shows the toast `import.done.<status>` (a warning for a refusal) and, for `new-set` and `added`, opens step 3.
  - **New set.** The board of the code becomes the board on show, at the angle of the code, and the piece set of the code becomes the set on show (`carving: 'imported'`, shown as "Imported", no `calibrationFor`, a fresh random seed, batch index 0); the set that was on show joins the saved sets of its own board, as when a set is generated. The set's **witness** (the solution that New puzzle needs; without one New puzzle is blocked with M-NOWITNESS) is the puzzle's stored answer when the code carried a valid one; otherwise `jobs.findWitness()` finds one in the background (`generationClient.solveWitness`, a `solveFirst` task with `BUDGETS.verifyRows`, best effort: any failure leaves the witness null and New puzzle stays disabled with its reason) and stores it in the set, so it survives a reload. The puzzle is the code's puzzle with its title, rating and certificate claim as decoded and its stored answer when the code carried a valid tail, with the id `imported-n` and its clue key in the seen-history, so a later New puzzle does not repeat it. Its certificate is not checked in the background.
  - **Same set.** When the set on show has the same board and the same pieces (ids, order and cells), the puzzle joins it instead (`added`; a set with no witness takes the one of the code's answer); a puzzle whose clue key is already in the list is not added again (`exists`) and the state stays the same object.
  - **Limits.** `sets-full` when the list of the code's board already holds 50 sets (the saved ones plus the set on show when it is of that board), `pack-full` at 100 puzzles or when the pack would pass 512 KiB; the state is then unchanged.
- **State.** The board on show, its display rotation, the preset of the menu, the level, the seed text and its keep flag, the uniqueness mode, the set on show with its puzzles and history, and the saved sets of every board. The set on show always belongs to the board on show (§10.2).
- **Storage** (`pentomino:v1:gen:state`, §9.6), written 300 ms after a change and at once on `pagehide`, when the page is hidden and before Play:

  ```text
  { v: 1, boardRows, rotation, presetId, levelId, seedText, keepSeed, uniqueness,
    setsByBoard: { "<board key>": [SavedSet, …] },        // newest first; the set on show is not in it
    setPack, puzzles, setSeed, batchIndex,                 // the set on show (SavedSet fields), if any
    history: { layouts, clues }, calibrationFor }
  SavedSet = { setPack, puzzles, setSeed, batchIndex, history, calibrationFor }
  ```

  - `setPack` is a `piece-set` pack (§5.2) of the set's board, rotation, pieces and witness, with the carving and `macroRegion` in `meta`. `puzzles` holds the set's puzzles in pack form without a second copy of the board and pieces; each puzzle carries its batch seed in `seed`, from which the in-memory `puzzleSeeds` map is rebuilt, and a `solution`, `rating` or `certificate` that is null is left out (read back as null). `history` holds the seen layout and clue keys (§6.9). `calibrationFor` is `{ levelId, uniqueness }` the set was made for, left out when unknown (an imported set); the calibration puzzle itself is not stored.
  - The board key is `boardKey(board)`: `<W>x<H>:` plus base64url digits, 6 cells per digit in row-major order (first cell in the highest bit, zero-padded), 1 = playable. It keys the saved sets of each board.
  - At most 50 sets per board (49 saved plus the one on show) and the sets of the 10 most recently used boards are kept.
- **Restore.** Only `v: 1` is read. Every part passes its validator and falls back on its own: the board must have sides 3–32, the rotation must be a multiple of 45, packs must pass `validatePack` and their puzzles must fit the set. A saved set goes under the key of its own board (a stored key is never trusted). Older storage is migrated on load: a single `setHistory` list is split by board, and a set's puzzles stored in a second full pack (`batchPack`) move to `puzzles`; a separate `puzzleSeeds` map fills in the seeds of puzzles stored without one; a stored `calibrationPack` or `largeBoards` is ignored. Restored ratings and certificates are shown as stored and are not recomputed (§6.11).
- **Quota.** A failed write is retried with less: the oldest saved sets of every board are dropped in halving steps, then all saved sets, then the puzzles on show. If even that fails, the page shows once that the work cannot be saved and keeps working in memory.
- The address settings win over the stored ones on load (§10.8).

### 10.7 Notices and messages

Texts live in `generator/locale.en.js` (every key) and `generator/locale.vi.js` (the same keys and placeholders); `generator/strings.js` fills them in (`formatNotice`, `formatMessage`), and a shown notice is re-rendered after a language switch. The English texts:

| Code | Where | Text |
|---|---|---|
| N-COUNT | Step 1 status | "This board uses {kmin}–{kmax} pieces at {level}, about {share}% pre-placed." |
| N-LARGE | Step 1 status | "Large board: generation can take up to 2 minutes." |
| N-SMALL | Step 1 status, step 3 | "A board needs at least 30 playable squares to generate puzzles." |
| N-CAP | Step 1 status, step 3 | "This board has {area} playable squares; the limit on this device is {max}." |
| N-UNIQUE-EXP | Step 2 | "On large Hell puzzles, “Require unique solution” is experimental and usually fails." |
| N-NOSET | Outcome | "Couldn't create a {level} piece set for this board within the time limit. Try again, choose another level, or change the board." |
| N-DUPSET | Outcome | "This piece set is the same as Set {n} in the list, so it was not added. Showing Set {n}." |
| N-PARTIAL | Outcome (`time-limit`) | "Found {n} of {q} different {level} puzzles within the time limit. The piece set was not changed." |
| N-ARRANGEMENTS | Outcome (`layouts-not-found`, count finished) | "Found {n}/{total} arrangements, the most this piece set allows. Generate a new piece set for more {level} puzzles." Variants: "Found {n}/{n} remaining arrangements ({total} in total), …" and "This piece set has no arrangements left: all {total} have been used. …" |
| N-LAYOUTS-UNUSED | Outcome (`layouts-not-found`, unused arrangements tried) | "Found {n} of {q} different {level} puzzles. Every other arrangement of this piece set ({count}) was tried, and none has a {clueset}. …" (or, when the search did not cover every arrangement, "The other arrangements tried ({count}) have no {clueset}, …") |
| N-LAYOUTS-LEFT | Outcome (`layouts-not-found`, more arrangements exist) | "Found {n} of {q} different {level} puzzles. This piece set has more arrangements, but none gave another {level} puzzle in the search. Try again, or generate a new piece set for more." |
| N-FEWLAYOUTS | Outcome (`layouts-not-found`, count not finished) | "Found {n} of {q} different {level} puzzles; no more were found. This piece set may allow only a few different arrangements — generate a new piece set for more." |
| N-SETLEVEL | Outcome (`difficulty-not-found`) | "Found {n} of {q} {level} puzzles: other arrangements of this piece set did not reach {level} difficulty. Try again, or generate a new piece set for {level}." |
| N-UNIQUE | Outcome (`uniqueness-not-proved`) | "Found {n} of {q} {level} puzzles with exactly one solution. Turn off “Require unique solution” or choose another level." |
| N-TOOLARGE | Outcome (`model-too-large`) | "This board and level need more memory than allowed. Choose a smaller board or a lower level." |
| N-NOWORKER | Outcome | "This browser cannot run the generator (module workers are required)." |
| M-CANCELLED-SET | Outcome | "Cancelled. No new piece set was created; the current piece set was not changed." |
| M-CANCELLED-BATCH | Outcome | "Cancelled. Kept {n} of {q} {level} puzzles. The piece set was not changed." |
| M-FAILED | Outcome | "Generation stopped: {message}" |
| M-HISTORY-FULL | Outcome | "This piece set remembers {used} of {max} arrangements, the most it can keep, so no more puzzles can be generated. Reset the history to go on (earlier puzzles may then appear again)." Offers **Reset history**. |
| M-PACK-FULL | Outcome | "The list holds at most {max} puzzles. Remove some puzzles to add more." |
| M-DUPLICATE | Outcome | "The new puzzle is the same as one already in the list, so it was not added. No more new puzzles can be generated for this piece set. Create a new piece set." |
| M-PACK-SIZE | Outcome | "The list is full: Play opens all its puzzles as one pack, which holds at most {kib} KiB. Remove some puzzles to add more." |
| M-FEWPIECES | Step 3 | "This set has fewer than 3 pieces, so new puzzles cannot be generated (one clue plus two movable pieces are needed). You can still view it." |
| M-NOWITNESS | Step 3 | "No arrangement of this set was found within the search limit, so new puzzles cannot be generated. You can still view it." |
| M-LEVEL-NOT-OFFERED | Step 3 | "{level} is not offered for a board of {area} playable squares." |
| M-NEEDS-SET | Step 3, step buttons | "Generate a piece set first." (also the tooltip of a locked step 3) |
| M-PLAYER-BLOCKED | Outcome | "The browser blocked the new tab. Allow pop-ups for this page and press Play again." |
| M-PLAYER-UNAVAILABLE | Outcome | "This puzzle is too large to open by link." |
| M-PLAYER-ONLY | Outcome | "The puzzle list is too long for one link, so only this puzzle was opened in the Player." |

The outcome notices of `layouts-not-found` and `difficulty-not-found` carry the **Generate new piece set** button; M-HISTORY-FULL carries **Reset history**. When New puzzle is pressed while the set cannot make puzzles (M-FEWPIECES, M-NOWITNESS, M-LEVEL-NOT-OFFERED, N-SMALL, N-CAP), that reason is shown as the outcome (code M-BLOCKED).

### 10.8 Address

The address holds the wizard step in the query string, so a reload returns to it; `ui/wizard.js` reads and writes it:

```text
?step=2
```

| Parameter | Meaning | Accepted values |
|---|---|---|
| `step` | Wizard step (`wizard.js`) | 1–3; beyond the furthest open step it falls back (§10.1) |

- **Writing.** A step change adds a history entry (`history.pushState`); other parameters and the hash are kept.
- **Reading.** On load the step is read and falls back to the furthest open step. `?lang=en|vi` is read but never written (§9.6).
- **Hash.** A `#p=<code>;<code>…` hash (§9.9) is read once on load: it is cleared first (`history.replaceState`, so a reload does not bring a removed puzzle back) and its puzzles are imported as **Import puzzle** imports them (the dialog opens with the text and the reason when it cannot be read).
- **Not in the address:** the board, the settings, the seed and the sets. They are the saved state of this browser (§10.6). Puzzles are shared through the player link that Play opens (§9.3).

---

## 11. Player application

### 11.1 Layout

The player has a header and three panels, laid out like the generator's (§10.1):

```text
┌ Pentomino Player ──────────────────────────────────────────────────────────────────────── [? Help] [EN|VI] [☀|☾|◐] ┐
│ Puzzles   [ Remove all ] │ Hard #2                                                  │ Pieces to place  4 left    │
│ ┌────────────────────┐    │ **Hard**: score 20 · 6 pieces to place                       │                            │
│ │ Hard #2         ▦▦ │    │ [Solvable ✓] [At least 1 solution]                       │ [⟲][⟳][⇋][⇵]               │
│ │ **Hard**…       ▦▦ │    │ 3:12   17 moves                [Undo] [Redo] [💡] [↻]     │ ┌────┐ ┌────┐ right-click: │
│ │ 6 pieces to place  │    │ hint message in small text, with [Place it] [Dismiss]    │ │ B  │ │ D  │ piece menu   │
│ │ Playing            │    │ ┌────────────────────────────────────────────────────┐   │ └────┘ └────┘              │
│ └────────────────────┘    │ │ board (SVG, display rotation θ)   [− + ⤢ ⟲ ⟳]  │   │ ┌──┐                       │
│ ┌ Hard #3 … ┐             │ └────────────────────────────────────────────────────┘   │ │ G│                       │
│                           │                                                          │ └──┘                       │
└────────────────────────────┴───────────────────────────────────────────────────────────┴─────────────────────────────┘
```

- **Header.** Logo, the title (**Pentomino Player** / **Trình chơi Pentomino**), the **EN | VI** buttons and the three theme buttons, then **Help** (an icon and text; opens the keyboard shortcuts dialog), with the markup and styles of the generator's header (§11.14). `header.js` builds the Help button and the **Settings** button of the narrow layout (§10.1); there is no button for the code entry.
- **Puzzles panel** (left). Header "Puzzles" with **Remove all**; then one card per puzzle of the open pack, newest (the last of the pack) on top as in the generator, in the card layout of the generator: the status badge (New, Playing, Solved ✓, Revealed) to the left of the name (the heading rule of §11.15: an untitled puzzle is "Puzzle #2" in English and "Đề #2" in Vietnamese; a title that does not end in "#" and digits gets " #n" added, so a generated title such as "Expert" is shown as "Expert #2"; one that already ends so, or has more than 75 code points, is shown as it is; the open puzzle's badge follows its live game, since the saved statuses lag behind a pause in play), the rating with its level in bold (**Expert**: score 123; "+" after a capped score), "N pieces to place", the certificate text (§6.11; "At least 1 solution" without a certificate once a solution is known, §9.5), and a preview of the board with its locked pieces, drawn at the presentation angle, level with the name and set back from the ✕. The seed is not shown. The open puzzle is highlighted (`aria-current`). A card opens its puzzle; the card of the puzzle already open does nothing. A ✕ in the corner of a card removes that puzzle from the pack; the shorter pack gets its own address (§11.12); the puzzle that was open stays open, or its neighbour opens when it was the one removed. **Remove all**, and removing the last puzzle, close the pack, clear the address and show the start screen; saved progress is kept. Without a pack the panel says so and Remove all is disabled. There is no Import button and no drop target.
- **Main panel** (middle). The **game** screen shows:
  - the name of the puzzle, and under it the rating (level in bold, no "claimed" prefix) and the number of pieces to place; **Share** (an icon, three joined nodes; §11.17) and **Print** (an icon, a printer; §11.15) sit on the same row as the name, at its right (`.step-head > .step-actions`; the row wraps on a narrow screen), and are disabled while no puzzle is open; there are no Previous / Next buttons: the puzzle list opens the puzzles, and the win dialog offers *Next puzzle*;
  - the notices (error, restoration warning) and the badges (solvability check, uniqueness claim, storage warning); a notice is a quiet line: small text without a border, with a smaller borderless **Dismiss** button;
  - the **game bar**: the timer, the move count, and the buttons **Undo**, **Redo**, **Hint** (an icon, a light bulb), **Replay** (an icon, a circular arrow) ; the icon buttons are named by their `aria-label` and tooltip. **Replay** asks first, then starts a brand-new game of the puzzle: every piece back in the tray, timer and moves at zero, history empty and the saved progress removed (§5.6); it cannot be undone and is disabled while the puzzle is untouched. The buttons are as big as the generator's **Play** button;
  - under the game bar, the hint message: small regular text over the whole width of the panel, with what matters in bold (the piece's name and the name of the button to press; the locale texts mark it with `**…**`, `richSegments` in `strings.js` splits them and the hint state keeps the marked text in `rich` beside the plain `message` that is announced), and under it, on a row of its own, at the right, the **Place it** / **Remove it**, **Cancel** and **Dismiss** buttons, smaller than the game bar's; the solvability and uniqueness badges above the game bar are set a little apart from it; the shortcut dialog of **Help** has its **Close** button at the right, and below 768 px it and the Print dialog use smaller text and tighter spacing;
  - the board with its zoom, fit and view-rotation buttons at its top right (as in the generator's board editor: small 28 px buttons; the view angle is local to the open pack and never saved). The selection toolbar (§11.5) is not here but in the Pieces panel. There are no Place, To tray or Show solution buttons: a ghost is committed with a second tap on its cell or Enter, a piece goes back to the tray with Delete or the piece menu, and the reveal action has no button. The keyboard shortcuts list is the **Help** button of the page header (with `?` on the keyboard).

  The **start** screen (§11.12) takes the place of the game screen in this panel while no puzzle is open.
- **Pieces panel** (right). Header "Pieces to place" with "N pieces left"; under it the selection toolbar (⟲ ⟳ ⇋ ⇵ for the selected piece, and **Results** after an earned win; shown while a puzzle is open) and then the pieces still to place, each drawn at its current orientation and the display angle. There is no View box: labels, patterns and the timer always show (§11.9). Without a game it says that the pieces of the open puzzle appear here. Letting go of a dragged piece anywhere over this panel returns it to the tray (§11.3). **Right-click** on a piece opens the piece menu (§11.5).
- Breakpoints, as in the generator: from 1360 px the three panels are columns (Puzzles | Game | Pieces); from 768 px the Game and Pieces panels are columns and the Puzzles panel goes under the game; below 768 px the header keeps only the icons of **Settings** and **Help** (§10.1), the buttons and fields are 36 px (`--pm-target` is 2.25 rem; the 44 px target of coarse pointers applies from 768 px), the game and the puzzles stack, and the board is shorter. The Puzzles panel is not shown: the Game panel starts with the previous / next navigator of `core/browser/puzzle-nav.js` (◀, "Puzzle n of N", ▶, and **Remove** and **Remove all** on a row of their own at the right; texts `puzzles.older`, `puzzles.newer`, `puzzles.position`, `puzzles.remove`), which opens the puzzle before or after the open one (`goToPuzzle`) and removes the open one or all of them. The **Pieces panel** is then a bar fixed to the bottom of the window (`position: fixed`, above the page, hidden on the start screen): its header on one line, the selection toolbar hidden (**Results** still shows after an earned win) and the pieces in one row that scrolls sideways (`flex-wrap: nowrap`; the tray cell is sized for 72 px). The page leaves the room of the bar: a `ResizeObserver` writes its height to `--pm-tray-space` on the page root, which becomes the root's bottom padding. A touch on a tray piece has `touch-action: pan-x`: a swipe along the bar scrolls it (the tracker's `scrollAxis: 'x'` keeps such a move from becoming a drag), and a swipe across it, up, lifts the piece as a drag does (§11.3). The board takes the height of the window up to the toolbar (at least 18 rem from 768 px). From 768 px the Pieces panel has no scroll bar of its own: it grows with its pieces and the page scrolls. From 1360 px the Puzzles panel is sticky and scrolls inside itself.
- The page order is the focus order: pieces, game, puzzles (§11.6). The grid places the panels.
- Large boards (hundreds of cells, up to ~90 pieces): the board supports zoom and pan (drag on empty board area or two-finger pan), and many pieces lengthen the pieces panel, which scrolls with the page.
- The cell size follows §6.3.

### 11.2 Game state and rules

```ts
type GameState = {
  pack: Pack; index: number;
  placed: ReadonlyMap<string, Pose>;   // user-placed pieces only; clues are separate and immutable
  tray: ReadonlyMap<string, number>;   // orientation t of each unplaced piece
  selected: string | null; preview: Pose | null;
  history: readonly MoveCommand[]; future: readonly MoveCommand[];
  // MoveCommand = { kind: 'piece', piece, before: Pose|null, after: Pose|null, tBefore, tAfter }
  //             | { kind: 'reset', before, after }   (every movable placement and tray orientation)
  solved: boolean;                     // geometry only: a complete cover
  revealed: boolean; hintsUsed: number;   // §11.13
  elapsedMs: number; moves: number;
  restoreWarnings: Issue[];            // saved moves dropped on restore; never saved
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
3. A second tap on the same cell or Enter commits. Tapping another cell moves the ghost. Esc, or tapping the tray, cancels.
4. Tapping the already-selected tray piece rotates it ⟳.

### 11.5 Rotate and flip

- The toolbar has ⟲ ⟳ ⇋ ⇵ in screen space (§6.3). A piece returns to the tray with Delete or Backspace, the piece menu, or a drop over the pieces panel; there is no button for it.
- **Piece menu.** Right-click on a piece of the pieces panel or on a movable piece of the board opens a small menu at the pointer: **Rotate clockwise** (E), **Rotate counter-clockwise** (Q), **Flip left-right** (F), **Flip top-bottom** (V) and, for a placed piece, **Return to tray** (Delete) followed by the two puzzle actions below. The Menu key or Shift+F10 on a focused piece opens it under the piece. A touch held still on a tray piece or a movable board piece for 450 ms opens it at the finger (`longPressMs` of the pointer tracker; the gesture ends there, so the release is neither a tap nor a drag, and a `contextmenu` event that follows within 900 ms is its echo and is ignored). Without the toolbar of the narrow layout, this is how a touch screen turns and flips a piece.
- **Board menu.** Right-click anywhere else on the board (empty cells, outside the board shape, a locked clue) opens the same kind of menu with only the puzzle actions: **Return all pieces to the tray** (every placed piece goes back to the tray, and every turned tray piece to its first orientation, as one undoable action; disabled when there is nothing to return) and **Replay the puzzle** (asks first; clears the board, the timer, the moves and the saved progress of this puzzle, which cannot be undone; disabled while the puzzle is untouched).
  - Opening it selects the piece, and every entry does what the toolbar button does, so the rules below apply unchanged.
  - The first entry has the focus. The arrow keys, Home and End walk the entries (the page's shortcuts stay quiet), Enter or Space runs one, and Escape, Tab, a press elsewhere, a scroll or a resize closes it; the focus goes back to the piece when the menu closes by Escape or by choosing an entry.
  - The menu is a `role="menu"` of buttons (`role="menuitem"`), kept inside the window.
- **Tray pieces** re-orient in place.
- **Placed pieces** rotate or flip about their handle cell. If the result is invalid, the player tries one-cell grid kicks in the order (0, −1), (−1, 0), (1, 0), (0, 1).
  - If none fits, the piece does not change: a 200 ms shake plus "No room to rotate here".
  - A successful re-orientation is one undo step.

### 11.6 Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | Move focus over the pieces to place, then the controls and placed movable pieces of the game, then the puzzles |
| Enter / Space | Pick up the focused piece (a ghost appears), or drop it if valid |
| Arrow keys (Shift = 3 cells) | Move the ghost; on rotated boards, by the mapping of §6.3 |
| E or R / Q | Rotate ⟳ / ⟲ on screen |
| F / V | Flip ⇋ / ⇵ on screen |
| Delete / Backspace | Return the selected placed piece to the tray |
| Esc | Cancel the pick-up or close a dialog or the piece menu |
| Ctrl/⌘+Z; Ctrl/⌘+Shift+Z or Ctrl+Y | Undo; redo |
| Right-click, Menu key or Shift+F10 on a piece | Open the piece menu (§11.5) |
| ? | Show shortcuts |

Shortcuts are ignored while focus is in a text field, a dialog or the piece menu. The buttons of the selection toolbar also rotate and flip, and the piece menu also returns a piece to the tray. The **Help** dialog lists the rows of this table in the interface language.

### 11.7 Touch

- `touch-action: none` applies only to the board and tray surfaces, so the page still scrolls elsewhere.
- Hit targets are ≥ 44 × 44 CSS px, except the board tools, which are 28 px as in the generator's board editor (still above the 24 px of WCAG 2.2 AA), and, below 768 px, the buttons and fields, which are 36 px (2.25 rem; `--pm-target`, set in `common.css`) to leave room on a phone.
- The lift is 1.25 cells, measured in screen space.
- A touch sends its events to the node it began on, and a browser cancels the touch when that node leaves the page. Lifting a placed piece redraws the board without it, so the board keeps the piece under a finger in the page (hidden while the model does not draw it, `renderPieces`) until the finger is up, and then draws the pieces again.
- No long-press gestures.
- Optional `navigator.vibrate(10)` on a successful placement.

### 11.8 Validation and winning

- **`canPlace`.** Every cell must be inside the grid and active, and must not overlap clues or other placed pieces. The moving piece itself is excluded.
- **Win.** After each committed move, the puzzle is solved when every piece is placed (clues plus user pieces) and the occupied count equals the active count.
  - **Any** valid complete placement wins. The player never compares with the stored solution.
- **On solve:**
  1. stop the timer and save the progress as solved;
  2. show the victory dialog: a trophy badge in sparkles (popping in and twinkling unless reduced motion is asked for), "Puzzle solved!", "Well done! Every piece is in its place.", the time, the moves and, when used, the hints as tiles, and small *Next puzzle* (only when there is a next puzzle), *Replay* and *Close* (primary, with the strong background) buttons, in that order, at the bottom right; there is no level and no link back to the generator;
  3. play a short celebration, unless `prefers-reduced-motion` is set.

### 11.9 Rendering and colors

- **Board.**
  - Active cells: light fill with thin grid lines.
  - Holes: grey with a cross in the middle.
  - Exterior cells: not drawn (§6.3).
- **Pieces.**
  - One SVG `<path>` per outline (`outlineLoops`, even-odd fill for holes), filled with the piece's drawn color (see **Drawn colors** below).
  - A darker stroke (35 % black mix) and faint inner cell seams. On paper every piece also gets a 0.6 mm black outline.
  - An upright label on the cell nearest the centroid, drawn when its cell is large enough (see **Labels** below): one bold character, black on a light fill and white on a dark one (`inkFor`, by the grey level a printer gives the fill), with a halo of the other color, so it reads on any color and on a black-and-white print.
- **Clues.** A diagonal-hatch overlay and a lock icon. Clues are neither focusable nor draggable.
- **Palette** (`BASE_COLORS`, Trubetskoy's 20 distinct colors, used in id order and stored with each piece):
  `#e6194b #3cb44b #ffe119 #4363d8 #f58231 #911eb4 #42d4f4 #f032e6 #bfef45 #fabed4 #469990 #dcbeff #9a6324 #fffac8 #800000 #aaffc3 #808000 #ffd8b1 #000075 #a9a9a9`.
  - For index ≥ 20, `colorFor(i)` generates colors: hue = (i · 137.508°) mod 360, saturation 65 %, lightness alternating between 45 % and 65 %.
- **Drawn colors** (`core/browser/piece-look.js`, display only: the stored colors do not change). Each base color is drawn as a color of the same family whose grey level (luma 0.299 R + 0.587 G + 0.114 B) goes light, dark, middle in turn, so pieces with neighbouring letters differ on a black-and-white print: `#ff8a80 #1b7a2f #b38f00 #90b4ff #943a00 #9b59d0 #7fe3f7 #9c1a8f #7fae1e #ffc2d6 #1f6b64 #9479cc #e0b88a #3d4f63 #c25467 #b6f5cf #555f00 #cf7d3c #1a237e #8c8c8c`. Any other stored color is drawn as it is.
- **Labels.** `labelFor(i)` stores A … Z, then AA, AB, …, AZ, BA, … (spreadsheet-style, ≤ 4 characters). They are always drawn as one character (`pieceGlyph`): A … Z as they are; AA … AZ as the letter in a circle; BA … BZ in a square; CA … CZ white on a black disc (104 distinct looks; a hand-written label such as a pentomino letter is drawn as it is). Text (hints, announcements, accessible names, the generator's piece list) uses the matching characters `pieceLabelText`: Ⓐ, 🄰, 🅐. Sets reach about 90 pieces on 676-cell boards. A label is drawn only where its cell is ≥ 10 CSS px at the current zoom; smaller ones appear once the user zooms in. Accessible names (§11.11) always include the label. Letters guarantee identity even when two colors look alike.
- **Patterns** (D30). When K > 20, every piece with index ≥ 20 also gets a fill pattern: `patternFor(i)` cycles dots, horizontal lines and vertical lines by ⌊i / 20⌋. Patterns are drawn at low contrast in the stroke color, never as diagonal hatching (reserved for clues), at every zoom level. They keep pieces with index ≥ 20 apart where labels are too small to draw.
- **No display toggles.** Labels, patterns and the timer always show, in both apps. Older versions stored Labels, Patterns and Timer switches in `pentomino:v1:prefs`; that key is removed (§9.6).
- **Large boards.** Pieces of up to ~50 cells and trays of up to ~90 pieces are normal on large boards. The tray scrolls. Labels follow the size rule above.

### 11.10 Undo, reset, timer and persistence

- **History.** The action history holds up to 500 entries. **Return all pieces to the tray** (board menu) is undoable; **Replay** asks for confirmation and clears the history.
- **Timer.** Always shown. It starts at the first move and pauses while the tab is hidden.
- **Saving.** Progress is saved by fingerprint (§5.6), debounced 250 ms after each committed action, at once on a win, when the page is hidden and before another puzzle opens. An untouched game is not written; **Replay** removes the record.
- **Reopening.** A puzzle with saved progress opens with its pieces, time and moves restored, without a question; **Replay the puzzle** (board menu, §11.5) starts it again.
- **Storage failures** never block play.

### 11.11 Accessibility (target: WCAG 2.2 AA)

- The board has `role="application"` and instructions linked through `aria-describedby`.
- Pieces are focusable, with labels such as "Piece F, 5 cells, in tray" or "Piece F, on board at row 3, column 5". These names come from `core/browser/svg-board.js` and stay English in both languages.
- An `aria-live="polite"` region announces placements, rejection reasons and the win, in the interface language.
- The document language (`<html lang>`) follows the interface language.
- Focus rings are always visible, and UI contrast is ≥ 4.5:1. Letters and hatching remove any reliance on color.
- Reduced motion is respected, and the whole game can be completed with the keyboard alone.

### 11.12 Pack navigation and the address

- The **Puzzles panel** (§11.1) lists the pack's puzzles, newest on top, with ✕ on each card and **Remove all** in its header; a card opens its puzzle. There are no Previous / Next buttons in the game panel.
- The address is the only way to keep or share a puzzle: it always names the open pack and puzzle (`#p=<code>;<code>…&i=k`). Switching puzzles changes only `i` (not for a one-code `#p=` address, §9.9). A pack that did not come from a link (the sample, or the shorter pack after ✕) gets that address as soon as the codes of its puzzles are made (`makePortable`, in the controller's code worker) and the URL fits 16,000 characters; until then, and for a pack too large for a link, it has no address and lives in memory (§9.4). Nothing is stored for a pack.
- The **start** screen (`player/ui/start-view.js`) shows in the main panel while no pack is open (start-up without a link, a link that failed on arrival, **Remove all**, or the last puzzle removed): the heading "No puzzle is open", a line on how puzzles open, the reason a link failed (`role="alert"`), **Try the sample**, a link **Open the Generator** (`../generator/`), and a line saying that a bookmark keeps a puzzle and sending the address shares it. Nothing opens by itself.
- A link that fails while a pack is open shows its message in the game panel and leaves the open game as it was.
- A one-puzzle `#p=<code>` address (§9.9) opens exactly one puzzle at index 0 and is the address as received: it is never rewritten (no `&i=0`, no normalised or grouped form), also when the puzzle is reopened. An address with several codes (`#p=<code>;<code>…`) opens them as one pack at `i` and follows the open puzzle with `&i=`. A `#p=` link that cannot be opened leaves the open game, its moves, timer and saved progress untouched; the Player passes the controller an `onPuzzleCodeFailure` callback, so the failure opens the code entry with the address as its text instead of being shown as the generic message (§11.16). A code entered there becomes the address `#p=<normalised code>`. Saved moves of a puzzle opened from such an address or from the entry come back without a notice.

### 11.13 Hints and show solution

Hints make only proven statements (D27). There are three outcomes:
- **Proven compatible placement.** A solution containing all current placements was found; show one more placement from it.
- **Proven repairing removal.** Removing one specific placed piece makes the position solvable again. Every placed piece is tested, each search exhausted or successful.
- Otherwise: "No repair identified within this check." Never blame a piece without proof.

**Show solution** (no button in the page since the toolbar was reduced; the logic stays in `hints.js` and `hint-panel.js`) uses the stored `solution` if it agrees with the current placements; otherwise it runs a solver. It marks the puzzle "revealed", not "solved".

### 11.14 Language and theme

- **Header.** The same switches as the generator's: **EN | VI** (`aria-pressed` marks the language in use) and the light, dark and high-contrast theme buttons (`core/browser/theme.css`; without a choice the page follows the system's light or dark setting). A choice is kept in `pentomino:v1:lang` and `pentomino:v1:theme` (§9.6), which both apps share. The page start language is `?lang=`, then the saved choice, then the browser languages, then English. `theme-init.js` sets a stored theme before the first paint.
- **Footer.** Both pages end with a centred footer (`footer.app-footer`, styled in `core/browser/common.css`): "© 2026 Dat Le. Released under the MIT License." and a link "Source code on GitHub" to the page's folder in the repository (`https://github.com/tdat00/pentomino/tree/main/generator` or `.../player`; new tab, `rel="noopener noreferrer"`). The texts are the keys `shell.footer.*` of each locale pack. The generator's footer is in `generator/index.html`; the player builds its own in `player/app.js`.
- **Texts.** `player/locale.en.js` is the base pack (every key) and `player/locale.vi.js` has the same keys and `{placeholders}`; plural forms are `_one` / `_other` keys, and Vietnamese needs only the plain key. A new user-visible text needs a key in both packs (`tests/player-i18n.test.js` checks the keys and placeholders, and that every key used by the code exists).
- **How texts are read.** `player/strings.js` exposes `LABELS`, `PLAY_TEXT`, `HINT_TEXT`, the verification, certificate and rating labels and the loader messages. Each read looks the text up in the current language, so `state.js`, `play.js` and `hints.js` use them unchanged. Fixed texts of the page are built with `loc()` / `locAttrs()` (`player/ui/i18n-dom.js`), which mark the element with `data-i18n`, so `setLocale` rewrites them; texts that the page computes (the puzzle list, the counters, the badges) are drawn again after a switch. The messages the controllers keep as strings (an error, a notice, a hint message) stay in the language they were made in until the next one.
- **Not translated.** Text that comes from the data (puzzle titles), from the engine (the issue text of a rejected pack), and the accessible names of pieces ("Piece F, 5 cells, in tray", from `core/browser/svg-board.js`) stay English.

### 11.15 Printing a puzzle (both apps)

Both apps have a **Print** button with the same dialog and result: the generator's is the printer icon right of **Play** above the selected puzzle (§10.5); the player's is the printer icon right of **Replay** in the game bar (§11.1). The code is shared (`core/browser/print-*.js`, `puzzle-title.js`, `puzzle-snapshot.js`); each app only supplies the puzzle (`getJob()`: the board, the whole piece set, the clues, the display angle, the printed `title`, the detail line made by `puzzleDetails(t, rating)` and a `snapshot` of the puzzle for its code; the generator also its `solution` for the optional sheet) and its text lookup `t`; with more than one puzzle in its list, also the list (`getPuzzles()`, see **Several puzzles**). A job without a `snapshot` prints no code band (it is ready at once). The Player's job is `printJob()` of `player/app.js`, the Generator's `printJobOf(state, selectedId)` of `generator/ui/puzzle-panel.js`.

- **Dialog** (native `<dialog>`, opened with `showModal`). Options, in this order: **Include piece set** (on by default), **Include board** (on), **Print on both sides** (off), **Print solution** (only in the generator, which passes `solutionOption: true`; off; disabled with a tooltip when the puzzle has no stored solution) and **Board size**: a `<fieldset>` with a table (columns Size, Cell size and A4 sheets; rows Small 10 mm, Medium 15 mm (default), Large 20 mm, Fit to page "Largest that fits on one sheet"; the sheets are worked out with `planPrint` for the open puzzle and the other choices, and change with them), one radio button per row, in the look of the generator's level table (full width, row lines only, the chosen row shaded in the accent colour and bold); a click anywhere in a row picks it. The choices are kept while the page lives (not stored). The paper is said only in the table; a line under it explains the board when needed: "The board is printed on 2 sheets to cut out and join." and "The board is rotated 90° to save paper." (empty and hidden otherwise), with the warning about reduced cells. **Print** is enabled when the codes are ready (see **Preparing the code**); it builds the pages, closes the dialog and calls `window.print()`; **Cancel** prints nothing. The **Puzzle code** section (`div.pm-print-code-box[data-role="print-code"]`, hidden for a job without a snapshot) sits between the options and the summary.
- **Several puzzles (second column).** The dialog is given `getPuzzles(): { current, items }` besides `getJob` (the Player's `printList()`, the Generator's `printListOf(state, selectedId)`): every puzzle of the list as `{ id, title, detail, order, job }` (`title` the card's name "Puzzle #n", `detail` the rating line, `job()` the `PrintJob`, read only for the chosen puzzles). The items are in the order of the cards, newest first (both apps' panels show `reverse()` of creation order); `order` is the creation index, so the chosen puzzles are printed in ascending order. With one item (or without `getPuzzles`) the dialog is the one-column dialog above; with more, `dialog[data-layout="two"]` is 58 rem wide and `.pm-print-body` has two grid columns (one under 44 rem) and the right one (`div.pm-print-side[data-role="print-side"]`) holds, in this order: **Puzzles per page** (`div[data-role="print-per-page"]`: a label and a `role="radiogroup"` of the choices 1, 2 and 4 as buttons, `input[data-field="print-per-page"]`, the chosen one filled with the accent colour, and a hint line) and **Puzzles to print** (`fieldset[data-role="print-puzzles"]`: a bar with the count "n of m selected" and the borderless small buttons **Select all** and **Select none**, then `ul[data-role="print-list"]` of `li > label.pm-print-puzzle > input[data-field="print-puzzle"]` and "**Puzzle #n** · Level: score n"). The look of these two parts follows the Print dialog of the sudoku generator. The column has `contain: size` so that the fieldset fills the height of the options column and the list scrolls inside it, never making the dialog taller. The chosen puzzles start as `{ current }` at every opening; nothing of the selection is stored. With nothing chosen **Print** is disabled and the summary says "Select at least one puzzle to print."; "Print solution" is disabled when none of the chosen puzzles has a stored solution.
- **How it reaches paper.** `printPages` appends a hidden `div.pm-print-root` holding one `div.pm-print-page` (an SVG of 210 × 297 user units, 1 unit = 1 mm, shown at 210 mm × 297 mm) per page, adds `pm-printing` to `<html>` and calls `print()`; `print.css` then hides everything else (`@media print`, `@page { size: A4 portrait; margin: 0 }`, each page 296.5 mm high so that rounding never adds a blank page). On `afterprint` the class and the pages are removed. Nothing leaves the browser and no inline style is used (the CSP of §12.4 is unchanged).
- **Orientation.** Paper cannot turn by 45°, so the display angle is cut down to a multiple of 90 (a 45° step is dropped: the Heart is printed as its square with a blocked quarter). The board, the pre-placed pieces, the pieces to place and the piece set all turn by that angle. With the board included, the whole printout is turned one more quarter when that needs fewer board parts (or, for Fit to page, gives bigger cells); the summary then says so.
- **Cell size.** Small, Medium and Large are cells of 10, 15 and 20 mm; Fit to page is the largest cell, in 0.1 mm steps and at most 25 mm, that puts the whole board on one sheet. The pieces always use the same cell size as the board, whether or not the board is printed, so a printed piece covers exactly one printed board cell. If the largest piece does not fit a sheet at that size (even turned a quarter), the cell is made smaller for both and the dialog says so. The usable area is the sheet minus a 10 mm margin (190 × 277 mm).
- **First sheet (always).** From the top: the QR box at the left with the heading to its right (the band), the preview and the foot. The sheet prints no code text, no address, no set line and no seed.
- **Heading.** The title in 8 mm bold with baselines at 19, 28 and 37 mm (at most three lines, wrapped at spaces by the measured width of the page's font, an unbroken word broken by code point, never inside a surrogate pair; a title that still does not fit ends in "…" on the third line), then one detail line (4 mm, 7.5 mm below the last title baseline): "**Nightmare**: score 123" with the level name in bold (`puzzleDetails(t, rating)`; a part that is not known is left out). The heading starts at `x = 10 + box + 6` mm, to the right of the QR box, and is `190 − 6 − box` mm wide (the full 190 mm and `x = 10` when there is no QR box). The puzzle's own seed and the set's level and seed are not printed: a seed alone does not rebuild a puzzle, and the QR code does.
- **QR box.** `g.pm-print-qr` at the top left of the content area: its left edge at 10 mm and its top at 10 mm; a square of the symbol's `outerMm` (at least 25 mm, modules at least 0.5 mm: version 5 is 25 mm, version 11 34.5 mm, version 40 92.5 mm), an opaque white rect that includes the 4-module quiet zone, and the black row-run path in `translate(4 4)` and `scale(moduleMm)` with `shape-rendering="crispEdges"` (`data-qr-version`, `data-qr-ec`, and `data-qr-code` with the code the QR carries, a hook for the tests). Under the box the caption "Play online" ("Chơi trực tuyến"; text `print.sheet.scan`, 3.2 mm, baseline 4.5 mm below the box); the column ends 7 mm below the box. No address or host is printed under it. The code is not printed as text.
- **Band height.** The band ends at the larger of the last heading baseline + 2 mm and the end of the QR column; the preview starts 4 mm under it (at 40 mm at the earliest, as without a band) and ends at 273 mm. With a 25 mm box and one detail line the band ends at 42 mm and the preview starts at 46 mm; the largest box (92.5 mm) puts the heading at x = 108.5 mm, 91.5 mm wide.
- **No QR.** When no QR can be made (the `none` step below) the band prints "This puzzle is too large for a puzzle code." under the heading, no QR; the preview keeps its room, and the dialog says so before printing.
- **One sheet only.** The code never continues on extra sheets: there are no continuation sheets and no code lines. The first sheet is followed, as before, by the solution, pieces and board sheets; the cell size, the cut-out sheets and their mirrored backs are those of a printout without a code, and a mirrored back never carries the QR.
- **Puzzles per sheet** (`planPrintMany(jobs, options)`; `planPrint(job, options)` is `planPrintMany([job], …)`). `options.perPage` is 1, 2 or 4. `framesFor(perPage)` gives the frame of one puzzle and the places of the frames: 1 is the whole content area (190 × 263 mm above the foot, as before), 2 are two frames 190 × 128.5 mm one above the other, 4 are two by two of 92 × 128.5 mm, always 6 mm apart (`FRAME_GAP_MM`) with dashed guides (`path.pm-print-guide`) in the gaps. Each puzzle is laid out in its own frame with the same functions (`layoutBand`, `layoutPreview`, `layoutSolution` take a `frame = { width, bottom }`) in coordinates as if the frame were the page; the sheet moves it by the frame's translation (`g.pm-print-frame`, none for the first frame of a sheet). In a frame smaller than the page a QR box wider than 45 % of the frame's width or height is drawn smaller (`band.qr.size`; the modules then print below 0.5 mm), and the legend is set from 3 mm down to 2.4 mm to fit the width. The scale bar and the cell size are drawn once per page. Sheets in order, per group of `perPage` puzzles: the puzzle sheet (`{ kind: 'preview', items: [{ puzzle, dx, dy }] }`) and, with Print solution, the solution sheet of the puzzles of that group that have one (`{ kind: 'solution', layout, items }`; one-sided it is a sheet of its own, two-sided it is the back of the puzzle sheet, with the columns mirrored in the 2 × 2 arrangement so that a solution is behind its puzzle; a group with no solution has a blank back); then the piece sheets and the board sheets, once, made from the first puzzle (their captions carry no puzzle name when more than one puzzle is printed). `plan.puzzles[i]` holds each puzzle's `model`, `band`, `share`, `preview` and `solution`; `plan.band`, `plan.share` and `plan.preview` are the first one's. `plan.paper` counts the leaves: the puzzle sheets, the solution sheets when one-sided, the piece sheets and the board parts.
- **Preview and foot.** The preview shows the board with its pre-placed pieces in the locked style (hatching and padlock) and a 0.6 mm black outline, so the pieces stay apart on a black-and-white print, with the legend, and "Pieces to place (n)" with those pieces at the same scale (60 % of the largest the page allows, up to 6 mm cells, smaller when the page is crowded). The preview is for reading the puzzle, not for cutting. The foot has a 50 mm bar and the cell size, so the reader can check that the printer did not scale the page.
- **Heading rule** (`core/browser/puzzle-title.js`). `puzzleDisplayName(title, index, untitled)`: an absent or empty title is `untitled(index + 1)`, "Puzzle #n" in English and "Đề #n" in Vietnamese (`ui.puzzleNumber` of the Player's packs); a title that ends in "#" and digits ("Hard #3"), or has more than 75 code points (counted by code point), is shown as it is; any other title gets " #n" (n the one-based position in its list). The Player's game heading and the puzzle re-created from a code use it. The code carries the stored title of the first puzzle and the displayed heading of any other (`puzzleCodeTitle`), because the re-created puzzle is the first one of its own pack: its heading is then the same at every position. **The printed sheet uses the name of the puzzle's card instead**, `job.title`: `cardHeading(title, index)` of `player/puzzle-title.js` in the Player (a generated title such as "Easy #1" shows as "Puzzle #1"; a title somebody wrote stays) and `card.heading` ("Puzzle #n") in the Generator (`printJobOf`). The dialog prints `job.title`, never `snapshot.heading`, which only the code carries.
- **Snapshot** (`puzzleSnapshot(source) → { data, heading, key }`). `data` is the plain object `encode` takes: the board rows with their blocked margins, the display `rotation`, the whole `pieces` in set order, the `clues`, the stored `solution` or null, `rating`, `certificate` and `title`; it is written by `createPack`, the writer of the Play link, so the Player and the Generator give the same code for the same puzzle at the same angle, and it is a deep, frozen copy that cannot change under a pending preparation. The angle is the one the puzzle is shown at (the Player's view angle, which can differ from the pack's presentation), never the quarter turns the sheet may add. The Player passes the stored puzzle, not the moves, so the code carries the stored answer without a "Print solution" option: carrying an answer is not printing a spoiler sheet, which stays the generator's separate option. `key` is the JSON text of `data`; `heading` the printed heading; a preparation is current while both are unchanged. Progress, timers, hints and other puzzles are not in it.
- **Target of the QR code** (`puzzlePlayerTarget(pageBase) → string`). The page's own Player, `../player/` of its address, for every http, https and `file:` page: a public page, a fork (which keeps its case-sensitive path), `localhost`, a LAN address or a file alike. Only a page with no usable address (another scheme, such as `about:blank`) uses the configured `PUBLIC_PLAYER_URL`, `https://tdat00.github.io/pentomino/player/`; a page address that is not a URL throws `RangeError` and the dialog then uses `PUBLIC_PLAYER_URL` too. There is no developer override, no local-page notice and no host classification. The address is `puzzleCodeUrl(target, code)`, at most `MAX_URL_CHARS` characters.
- **Capacity ladder** (`preparePuzzleShare(snapshot, { target, client, targetNotice }) → { code, url, carried, qr, notices }`). The client makes the code; the address and a QR at level M are tried with the whole code. If that does not fit (version 40, or an address over `MAX_URL_CHARS`) the tail is left out of text and QR (`noTail`, `carried: 'C'`); if the core still does not fit at M, level L is used (`lowEc`); if it does not fit at L either there is no QR (`none`, `qr: null`). With the standard 45-byte prefix, version 40 holds 3,322 code characters at M and 4,227 at L. Nothing is shortened, retried with another library or sent anywhere. `notices` lists the steps in that order, then the target's. An encoder, worker or QR failure is a `PuzzleShareError` (`encode-failed`, `target-invalid`, `qr-failed`, `internal`), never an oversize puzzle.
- **Preparing the code.** Opening the dialog prepares the snapshot of every puzzle to print, one after the other, for the page's target (the client comes from `createClient`, `createPuzzleCodeClient` by default, so the codes are made in the worker and never on the page; the Player passes `env.createPuzzleCodeClient`). A client runs one operation at a time, so the preparations are sequential; each prepared share is kept by its snapshot (`shareKey`: heading and content) while the dialog is open, so a change of the chosen puzzles prepares only what is new, and the running work is kept while it covers what is missing. The section shows its state in `data-state`: `preparing` ("Preparing the puzzle code…", with "k / n" when more than one is being prepared; `role="status"`), `ready` (the notices as `li[data-notice]`: `noTail`, `lowEc`, `none`, each prefixed by the puzzle's name when several puzzles are printed; the address the QR leads to is not shown, only kept in `data-target` of the section for the checks) or `error` ("The puzzle code could not be prepared." and **Try again**, `data-action="print-retry"`). **Print** is disabled until `ready`; the sheet counts of the size table show "…" meanwhile; a press then does nothing and nothing prints by itself afterwards. The dialog re-reads the puzzles when the app's state changes (`watch`: the `store.subscribe` of the Player and of the Generator; it draws again only when the list, the chosen puzzles' snapshots, titles or solutions differ), on a language switch (`refresh()`, called by both apps) and when **Print** is pressed. A snapshot that differs (another puzzle, a turned view, a changed heading, including one that only the language changes) cancels the running work and prepares what is missing, and a **Print** press on a stale code starts it without printing; progress and elapsed time never do. The options (sheets, sizes, two sides, solution, puzzles per page) only lay the prepared codes out again. An answer counts only if its preparation is still the running one: a late answer for an earlier choice, or a closed dialog, is ignored. Closing the dialog, by Cancel, Escape or Print, cancels the work and forgets the prepared codes; reopening prepares again.
- **Piece set.** Every piece of the set, the pre-placed ones too, in the style of an unlocked piece in the game (colour, letter, fill pattern of sets above 20 pieces), packed in rows of tall pieces first with 4 mm of paper between them; a piece wider than the paper is turned a quarter. A caption in the top margin names the sheet (shortened with "…" when the title makes it too long).
- **Board.** The playable cells with a light fill, a grid and a cut line along the outline; holes (blocked cells inside the board) are grey with a cross, as on screen (a grey dark enough to stand out on a black-and-white print), and exterior blocked cells are not drawn. A board that does not fit a sheet at the chosen size is cut along cell edges into the fewest, evenly sized parts that fit (a part without a playable cell is left out). Each part sits where it would be in the whole region, centred on its sheet, and the caption names it: "Board, part 2 of 6 (row 1, column 2)". Where two parts meet, each run of cells that are playable on both sides of the cut gets a mark in its middle on both parts: a dark triangle on the edge with the neighbour's part number, inside the cut line so it stays after cutting; a line in the bottom margin says to match each mark with the mark of the part it names. The reader cuts the parts and joins them edge to edge, mark to mark.
- **Solution (generator, optional).** Right after the puzzle sheet (after the code sheets when printed one-sided; with two sides it is printed on the back of the puzzle sheet, so neither has a blank back and no sheet is added). It holds the heading "<heading> · Solution" in one line (shortened with "…" when long, so its board keeps the top at 40 mm) with the same detail lines, then the board with every piece of the stored solution (`layoutSolution`: the angle of the rest of the printout, cells as large as the page allows up to 10 mm), the pre-placed pieces in their locked style, each piece with the 0.6 mm black outline of the preview. It carries no code and no QR.
- **Two sides.** The back of every sheet follows its front in the page order (the back of the first sheet is blank, or holds the solution when it is printed; every code sheet has a blank back). It shows the same pieces and board parts **mirrored left to right** about the middle of the sheet (`mirrorX`, `mirrorCells`), at the mirrored place, with letters upright. With the printer set to two-sided printing flipped on the long edge, the two prints of a piece or board part then coincide, so a cut-out piece shows its shape on both sides. A board part is centred, so its back lies on its front. No code or QR is ever on a back.
- **Texts.** The keys `print.*` of `print-texts.js`, in both languages, are spread into each app's locale pack; the dialog is marked with `data-i18n` (with `data-i18n-args` for texts with a parameter), so a language switch updates it. The sheet's code texts are `print.sheet.code`, `.codeTail`, `.scan`, `.codeContinued`, `.codeMore` and `.noCode`; the dialog's are `print.code.preparing`, `.error`, `.retry`, `.target`, `.noTail`, `.lowEc` and `.none`. `print.sheet.seed` and `print.sheet.rating` no longer exist: the rating line is `print.sheet.ratingOnly`. `ui.puzzleNumber` of the Player's packs is "Puzzle #{n}" and "Đề #{n}".

### 11.16 Entering a puzzle code

The Player takes a puzzle code as text and opens the puzzle it describes, through the controller that already opens a `#p=` address (§9.9). `core/browser/puzzle-code-dialog.js` is the component and `player/app.js` wires it; nothing in it decodes, repairs or searches.

- **Where.** There is no button for the entry, neither on the start screen nor in the header. A `#p=` address that cannot be opened, when the page opens or later, opens the dialog by itself with the address as its text and the reason shown; a startup error then also has the focus in the field (`player.codeDialog.open()` is how the app, and the tests, open it). With no opener, closing it returns the focus to the puzzle title while a game is open and nowhere on the start screen. The dialog lives in `div.code-host` directly under the page root, because the dialogs of the game screen sit inside a section that the start screen hides; its elements are created on the first opening, so a page without a code entry has no code field.
- **The dialog.** A native `<dialog class="pm-dialog pm-code">` (`showModal`, so focus is trapped and the page is inert) named by its title. A visible `<label>` is tied to a monospace `<textarea>` with spell-check, automatic capitalisation and correction off (16 px text, so touch browsers do not zoom). The text stays as typed: it is normalised only for counting and checking, never rewritten on blur, and never truncated (more than 32,768 characters is the error "too long"). Under the field a note says what is accepted, then "N characters" (`code.count`, singular "1 character"): the length of the normalised code (a pasted link counts its `p` value, not its prefix; the dot counts when there is a tail). Text that is not a code yet gets a neutral count (grouping not counted, a wrong character counted) and no error while typing. Buttons: **Open puzzle** (disabled while the text is blank and while a request is in flight) and **Cancel** (always enabled). Enter in the field is a line break; there is no shortcut of its own, and letters typed in the field never reach the game, because the page's key handler ignores dialogs and text fields (§11.6).
- **Accepted input.** What `normalizePuzzleCodeInput` accepts (§9.8): the core `C` or `C.T`; grouped or not; any case; spaces, tabs, line breaks and hyphens ignored; O as 0, I and L as 1; or a whole link containing `#`, read by the same `parsePuzzleHash` as navigation, so `&i=1`, a repeated key and `p` with `pack` or `lib` are refused and the link is never fetched. The dialog calls `controller.loadPuzzleCode(text, { commitAddress: true })` and has no private parser or loader. A success closes the dialog and the address becomes `#p=<normalised code>`.
- **State machine.** `createCodeEntryMachine` holds `phase` (`closed`, `editing`, `submitting`, `invalid`, `candidate`, `tail-recovery`), the text, the problem on show, the candidate and whether the core can be opened, and a UI `revision` that every opening, edit, submission and closing increases. A reply is used only when its revision is still current: editing during a request calls `cancel` and returns to `editing`; closing keeps the text, shows no failure and cancels; `open` starts from a clean state (no stale error, candidate or core offer) and keeps the text unless it is given one; `dispose` cancels and ignores everything after. A request that rejects or returns an unreadable result is a `worker-error`. Blank text is answered locally (`empty`) and never starts a request. `submit` is refused while a request is in flight.
- **Failures.** The first issue of the failure picks the text (`describeProblem`; the host names `invalid-index` and `invalid-hash`, and a pack that fails to open, are read as `index` and `invalid`). It is shown in a `role="alert"` box that the field's `aria-describedby` includes; the field is `aria-invalid="true"` only when the text is at fault (not for `worker-unavailable`, `worker-error`, `no-deflate` or `cancelled`) and has a heavier border as well as the colour. The field, the open game, its moves and saved progress, and the address stay as they were. An unknown character is quoted, or named by its code point when it is invisible (`U+00A0`). Codes and keys: `empty` (`code.error.empty`), `bad-char` (`.char`), `dots`, `too-long` (`.long`), `core-check` (`.check`), `version`, `no-deflate` (`.deflate`), `invalid`, `index`, `tail-check` (`.tail`), `tail-tag` (`.tailVersion`), `tail-invalid` (`.tailInvalid`), `worker-unavailable` (`.worker`), `worker-error` (`.service`, also for the 115-second deadline) and `cancelled` (`.cancelled`: another load replaced this one). An unknown code reads as `worker-error`.
- **Correction.** A candidate is shown only when the worker's failure carries one for a checksum failure (`core-check` with a core candidate, `tail-check` with a tail one), for the same normalised text (`candidate.normalizedCode`), and it is not offered beside a checksum-valid unknown version or an invalid structure. The dialog states group, character position, expected and typed symbols ("Possible correction: in group 2, character 2 may be "9" instead of "0". Compare with the printout.") and offers **Use this correction** (`data-action="use-correction"`). Nothing changes on arrival. The button acts only if the revision it was drawn for is still current and the normalised text still equals the candidate's source; then the field takes `correctedCode` and the corrected text goes through the controller again, so it is decoded again; if that fails the corrected text stays with its own error. After any edit the offer is withdrawn and a click on a stale offer does nothing.
- **Damaged solution part.** A `tail-check`, `tail-tag` or `tail-invalid` failure whose `recovery` came back validated shows its message and **Open without the solution part** (`data-action="open-core"`), together with a tail candidate when there is one. The field keeps the full input. The action submits only the core, the part of the normalised input before the dot, through the same loader: the address carries the core and the puzzle has no stored answer, so verification searches in the background. A bad core, a code without a dot or an edited text never offers it.
- **Progress.** Saved moves for the geometric fingerprint (§5.6) come back through the commit that every pack uses, even if the puzzle was played from another pack, silently: opening a puzzle from a puzzle code (the entry, or a `#p=` address on page load or on a hash change) shows no notice about restored moves; only a restoration warning of the commit itself (moves that no longer fit) is shown. Nothing is erased to make the board look like the paper; **Replay** is the explicit way back to the printed clues. A code with a stored answer is known solvable at once and starts no search; a core starts the background verification, whose "not verified" is never "no solution", and the puzzle is playable while it runs.
- **Focus and keyboard.** The field has the focus when the dialog opens (by a click, Enter or Space, or by a startup error). Tab and Shift+Tab stay in the dialog (the native trap; at its ends focus goes to the browser's own controls and back). Escape or Cancel closes it, invalidates a request in flight and returns the focus to the opener if it is still connected and shown; otherwise to the puzzle heading (`tabindex="-1"`) when a game is open, or to the start screen's action. A late `close` event of an earlier closing is ignored when the dialog has been opened again. When a request starts or an offer disappears while a button had the focus, the focus moves to the field. A language switch while the dialog is open rewrites its texts (`refresh()`).
- **Layout.** The dialog is `min(34rem, 94vw)` wide and scrolls inside itself when the screen is short; at 390 px there is no sideways scrolling and every button is at least 36 × 36 CSS px (`.pm-dialog .pm-btn`; 44 px from 768 px). Motion is not used. Light, dark and high-contrast themes use the theme tokens; the harness measures every text and button at 4.5:1 and the invalid border at 3:1.
- **Texts.** `player/locale.en.js` and `player/locale.vi.js` hold the keys `code.enter`, `code.field`, `code.hint`, `code.count`, `code.open`, `code.correction.use`, `code.recovery.open` and `code.error.*` listed above, plus `code.error.candidate` with `{group}`, `{position}`, `{expected}` and `{typed}`. Cancel and the busy line reuse `ui.cancel` and `ui.loading`. The messages say nothing of a file import, which the Player does not have.

### 11.17 Sharing a puzzle link (Player)

The Player has a **Share** dialog that shows, and copies, the Player address of the selected puzzle, `…/player/#p=<code>` (§9.8, §9.9), or of the whole list, `…/player/#p=<code>;<code>…[&i=<n>]`, beside its QR code. A puzzle's code is the one the printed QR code of the same puzzle carries (§11.15), at the Player of the current page. It is not the generator's **Play** link (§9.3), and the Generator has no Share button. `core/browser/share-dialog.js` holds the logic: `createShareController` is the DOM-free part, `createShareDialog` builds the dialog, and the app only wires a button, its snapshot provider and the host of the dialog.

- **Where.** An icon-only button (`data-action="share"`, class `share-btn`, named "Share" by its `aria-label` and tooltip) in the Player's puzzle title row, left of **Print**, at the right end of the row (`.step-head > .step-actions`, §11.1), disabled while no puzzle is open. At 390 px the buttons are at least 36 × 36 CSS px (§11.1) and nothing scrolls sideways.
- **The dialog.** A modal `<dialog class="pm-share-dialog" data-role="share-dialog">`, `min(45rem, 94vw)` wide, in a page-level host (`div.code-host`, so a hidden screen cannot hide it). A header with the share icon, the title "Share" and a subtitle (the selected puzzle's name, or "All N puzzles in the list"), and a close button (`data-action="share-x"`); the QR card on the left (`.pm-share-qr`, the symbol drawn as an SVG with `data-qr-code`, captioned "Scan with a phone to play"; a placeholder while preparing, "No QR code: the link is too long for one." when none fits); on the right a visible label "Link" tied to a read-only `<textarea class="pm-share-field" data-field="share-url">` holding the address as a text value (never markup), the switch **Share all puzzles in the list** (`data-field="share-all"`, `role="switch"`, shown only when the list has more than one puzzle) with its hint, and the notes (`[data-role="share-notes"]`, `role="status"`). Under them **Try again** (`share-retry`, only after an error), **Close** (`share-close`, the app's `ui.close`) and **Copy link** (`share-copy`, primary). On a narrow screen the QR card wraps above the link. Opening puts the focus on **Copy link** as soon as the link is ready (unless the focus moved meanwhile); Escape, **Close** or the header's ✕ close it and return the focus to the opener when it is still connected.
- **One preparation.** The provider gives every puzzle of the open pack as a `puzzleSnapshot` (§11.15, at the pack's angle, with the stored solution) and the selected index; it is rebuilt only when the pack, the angle or the untitled label changes. The Player target is that of the current page (`puzzlePlayerTarget(document.baseURI)`: `../player/` of the page's address, on a public page, a fork or a local page alike; only a page with no usable address falls back to `PUBLIC_PLAYER_URL`). One puzzle goes through `preparePuzzleShare`, the list through `preparePuzzleListShare`; both use the capacity ladder of §11.15 (full codes, then the cores only, then QR level L, then no QR), so for the same puzzle, angle, language and page the one-puzzle link equals the address of the printed QR code. The address is not built anywhere else. The dialog always opens for the selected puzzle only, with the switch off.
- **The client.** The codes are made in the puzzle-code worker, never on the page. The dialog creates its own client on first use (`createClient`, `createPuzzleCodeClient` by default), separate from the Print dialog's and the code entry's, because a client runs one operation at a time and a new one supersedes the old. Closing the dialog cancels its client's work; the client is disposed with the page.
- **Stale answers.** Each preparation has a revision; its answer is used only while that revision and the selection it was made for (the snapshot keys, the index and the switch) are still current, and the same is checked after the clipboard write, so a link is never shown or announced for another puzzle. A finished clipboard write is not undone. While the dialog is open the app calls `refresh()` on each render: another puzzle, a removed puzzle, a new pack or a turned view prepares again (a language switch alone, which changes only the heading, does not). Prepared links are cached per selection while the dialog lives.
- **Feedback.** While preparing, the field says "Preparing the link…" and **Copy link** is disabled. **Copy link** writes with `copyText` of `dom.js` (`navigator.clipboard.writeText`, then the `execCommand` fallback); only when the browser took the text does the button turn into "Copied" with a check mark and the notes say "Link copied". When it refuses, the notes say "Could not copy the link. Select and copy it manually." and the field takes the focus with the link selected; nothing says "copied". Notes of the ladder: "The stored solutions are left out of the link so that it fits a QR code." (`noTail`), "The QR code uses low error correction because the link is long." (`lowEc`), "The link is too long for a QR code; copy it instead." (`none`). A link over 4,000 characters (`WARN_URL_CHARS`) adds "This link is N characters long; some chat apps cut long links." A link over 16,000 characters (`MAX_URL_CHARS`), or a list of more than 100 puzzles, is not made: "This puzzle is too large to share as a link.", or for the list "The list is too large to share as one link. Uncheck "Share all puzzles in the list" to share only the selected puzzle." A failed preparation says "The link could not be prepared." with **Try again**; an abort says nothing.
- **Limits and bounds.** The link is at most `MAX_URL_CHARS` characters and the code's own limits are those of §9.8. Raw or compressed code strings may differ between encoders, for example the browser's and the headless `--code` output (§9.8); the puzzle they decode to is the same.
- **Texts.** In the Player, in both languages: `share.button`, `share.title`, `share.link`, `share.all`, `share.all.hint`, `share.subtitle.all`, `share.copy`, `share.copied`, `share.retry`, `share.preparing`, `share.qr`, `share.qr.caption`, `share.noQr.short`, `share.error`, `share.tooLarge`, `share.tooLarge.all`, `share.notice.noTail`, `share.notice.lowEc`, `share.notice.none`, `share.long` (with `{count}`), `code.copied` and `code.copyFailed`; it reuses `ui.close`. Fixed texts carry `data-i18n`, so a language switch rewrites them, and `refreshTexts()` draws the notes again.

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
- Cross-app links are `../player/` and `../generator/`. Absolute player URLs (Play) are computed at runtime from `document.baseURI`.

### 12.4 Content Security Policy

Every app page carries:

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; worker-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'">
```

- No inline scripts or `style="…"` attributes in markup. Set styles through the CSSOM (`el.style.x = …`) or classes.
- SVG presentation attributes such as `transform` and `fill` are allowed.
- A QR symbol (§4.3) is plain SVG with `fill` and `transform` attributes, so it needs no change to the policy; the encoder is a local module and `connect-src 'self'` leaves no way to a QR service.

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

- From the repository root, run `node tools/serve.mjs --port 8080 --prefix /pentomino/` (`npm run serve`; on Windows also `run.cmd [port]`) and open `http://localhost:8080/pentomino/`. The bundled server sends explicit MIME types; third-party servers may serve `.mjs` as `text/plain` (D42).
- `--prefix /` serves the site at the root; `--root DIR` serves another folder (e.g. a staged `_site`).
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
| `sharecode` | The `#p=` route: every `p`-bearing case of `tests/fixtures/puzzlecode-hashes.json` through the host parser (`index` → `invalid-index`, `invalid` → `invalid-hash`) and through the pasted-link normaliser, any hash without `p` (the old `pack` / `lib` included) as `no-incoming`, `p` mixed with another route key refused, `puzzleCodeUrl` (clears query and fragment, canonical code, no `i`, only http, https and file, no credentials, no length check) and `puzzleListHash` / `puzzleListUrl` (the canonical codes joined by `;`, `&i=` after the first, the page's own Player). |
| `protocol`, `tasks` | The two puzzle-code kinds: strict snapshot and text validation, error replies with `params` and `candidate`. Solver tasks stay synchronous; code tasks return a Promise that the handler awaits: one reply after it settled, nothing cloned that is not data, deferred resolve and reject, memory progress owned by the pending task, later messages waiting their turn; the sample encodes to its frozen golden and decodes with and without the tail; codec errors keep their code, `params` and candidate through structured cloning; the module worker entry settles a code task. |
| `handoff` | `#p=` through an injected decoder: index 0, nothing saved, the normalised value handed on, a literal `+` and an encoded `#` as `bad-char`, structural failures with the host names, recovery and candidate kept, `#pack=` and `#lib=` no longer routes (`no-incoming`). Several codes: opened as one pack in order and at `i` (lower case, grouping, an encoded `;`, a trailing `;`), refused before any decoding for a number or text that is wrong, a failing code named by place (`$.p[k]`) with no recovery and the others never decoded, a different board or piece set and a repeated puzzle refused, typed and pasted lists through `readPuzzleCode` while one code stays the decoder's. Play links: `preparePlayerLink` builds `#p=<code>;<code>…` with an injected encoder (one code per puzzle, `&i=` only after the first, a warning above 4,000 characters, only the puzzle to open (`only`) above 16,000 or for more than 100 puzzles, no link for a code that cannot be made or a puzzle too long for any link) and `openInPlayerTab` reports `only`; the real codec reads its own link back with the stored answers. |
| `puzzle-code-client` | Real Node worker: the frozen golden, decode with and without the tail, candidates with `offset` (core and tail), core-only recovery, `repair`, typed codec failures, bad snapshots, pasted links with no worker work on failure, no main-thread catalogue. Pool doubles: lazy owned worker, one request per operation and always ended, `worker-unavailable`, `worker-error`, the watchdog, cancel, supersede, dispose (twice), a late reply ignored, two clients with distinct request IDs. |
| `puzzle-code-dialog` | The code-entry state machine with an injected controller whose replies the test resolves by hand: submit A, edit to B, late A; close then late reply; a late failure; success; a rejected request; dispose while awaiting; the candidate offered only for a checksum failure of the same normalised text (not for other text, another component, a future version, an invalid structure or no change), applied only by its own action while the revision and the text still match, and then submitted again, with its own error kept; a link's candidate; the core offered only for a damaged tail with a returned core, submitted alone through the recovery path, never for a bad core, a code without a dot or an edited text; blank input never reaching the controller; `worker-unavailable` as a service failure; a failure given to `open`; a second opening replacing stale state; refused actions; a revision that only grows. Every failure code has its own key in both languages; the host loader names are aliased; an invisible character is named by its code point; the count; the module imports only the text normalizer and `dom.js`, builds no markup and no style; every `code.*` key used exists in both packs. |
| `player-puzzle-code-route` | The controller with a real worker client: `#p=` with a full code (stored answer, verification fast path) and with a core (verification pool only), the address and history never rewritten, reload, saved progress restored, bad links changing nothing and named as the code entry names them, damaged tail as recovery data that opens nothing, `worker-unavailable` with the sample still opening, `loadPuzzleCode` with and without `commitAddress`, `cancelPuzzleCodeLoad` and a late success, client ownership, no use of the verification pool by code work; several codes (opened at `i`, the address following the open puzzle, reload, one code of an address never rewritten, a wrong second code named and changing nothing, typed lists and `commitAddress`). |
| `puzzlecode` | The sample and hand-authored goldens reproduce exactly (raw), with the edge vectors (title kinds 2 and 3, certificates 2^50 − 1 and 2^53 − 1, a failed rating rebuild kept whole, a version-2 decode-only code). CRC-20 vectors and residue; exact Exp-Golomb, truncated binary, colex rank and bit I/O; the catalogue count and SHA-256; the 128 default colours and labels; the integer score and level tables against the live functions for all 640,128 pairs. The negative vectors and about 40 crafted payloads with a valid check, each just inside and just outside its bound; a truncation sweep and a mutation fuzz give typed errors only; inflation stops at 64 KiB while streaming. Tails: a core alone is playable, and a bad, spliced or foreign tail never replaces the core. Correction: every one-symbol substitution of a short golden has one unique candidate that is never applied; none for two errors, swaps, bursts or appended symbols; the 5,732-symbol bound (slow: syndromes distinct to 5,732 with the first collision at 5,733, every two-symbol substitution detected). Every board-mask mode against an independent size count. The 1,024-cell, 128-piece count-only stress pack and the 24 × 24 oracle. 150 seeded random puzzles round-trip raw, automatic and DEFLATE and re-encode identically. Inputs are never mutated; importing the module builds no catalogue. |
| `puzzlecode-input` | The `#p=` parser against `tests/fixtures/puzzlecode-hashes.json` and for lists (`;`, `i` naming a code, an encoded `;`); `splitPuzzleCodes`, `isPuzzleListHash`, `normalizePuzzleCodeList` (at most 100 codes) and `normalizePuzzleCodeText`; the normalizers (grouping, aliases, `bad-char`, `dots`, `empty`, `too-long`) and their bounds; `PuzzleCodeError`; no import of `sharecode.js`, a host module or the codec implementation. |
| `game` | place / move / remove / orient / undo / redo / reset. `canPlace` reasons. A moving piece's old cells are excluded. A non-witness tiling wins. Clues are immutable. Restoring progress drops invalid moves. |
| `print-layout` | The paper layout of §11.15: 45° steps dropped, the board, clues and pieces turn together, the cell sizes (10, 15, 20 mm, Fit to page ≤ 25 mm), pieces packed once inside the margins and apart, a too-wide piece turned and the cells shrunk when nothing fits, a big board cut into parts that cover every playable cell once, blocked parts left out, the quarter turn that saves paper, the page list with the backs, the preview fitting the page, the heading and the QR band (title wrapping and ellipsis, the QR at the left and the heading's x and width beside 25, 34.5 and 92.5 mm boxes, the band bottom and the preview top, one-sided and two-sided order and paper counts, the no-QR sheet, one puzzle equal through `planPrintMany`, the frames of 2 and 4 inside the page and apart, puzzles grouped by the page with their solutions and the pieces and board once, every puzzle inside its frame with the QR box in proportion, the mirrored solution sheet on the back and the blank back of a group with none), and equal English and Vietnamese `print.*` texts. |
| `puzzle-title` | The heading rule at its boundaries: absent, empty, ordinary, numbered and long titles; positions 1, 2 and 100; 75, 76 and 80 code points, astral characters counted once; the English and Vietnamese untitled labels; the title the code carries; a re-created puzzle shows the printed heading. |
| `puzzle-snapshot` | The snapshot is detached, frozen and canonical, and its key holds every code-relevant field but no progress; the target matrix (public, fork with its case, localhost, a LAN address, IPv6 loopback, `file:`, and the schemes with no usable address that use the public Player); the capacity ladder at the version 40 boundaries (3,322 and 4,227 characters), the URL budget and a worker failure that is not an oversize puzzle; the Generator's job (`printJobOf`) and the Player's give the same code for the same puzzle; the detail line holds the rating alone; and the QR of a prepared share read back by jsQR. |
| `generator-import` | Import puzzle (§10.6): a decoded one-puzzle pack becomes the board (at its angle), an `imported` set with the pieces' ids and order, a fresh seed and the puzzle with its answer, and the set survives `serializeState` / `restoreState`; a puzzle of the set on show joins it, the same clues are `exists` and leave the state the same object; another piece set is a new set and the one on show is saved under its own board; a full list of the board (50) is `sets-full` and unchanged; the controller with a real Node worker reads a link with grouped lower-case text and a bare code, a Play link with several puzzles imports all of them (and the same link again is `exists`, a partly present list is `added`), a bad code and a typo fail without changing anything, a running job answers `busy`, and `cancelImport` drops a pending read. |
| `share` | The Share dialog's logic (§11.17) with injected collaborators: `makeListQr` carries the prefix, every code and the puzzle number and a scanner (the test-only jsQR) reads exactly that address, and refuses what no producer may send; a list link holds the code of every puzzle in order with the number to open; the list ladder (stored answers first, then level L, then no QR, no link above 16,000 characters); a list needs puzzles, a valid number and a target, and an encoder failure is not an oversize puzzle; `prepareShareLink` gives the selected puzzle's address or the list's; the controller prepares the selected puzzle on open, offers the list only with more than one puzzle, reuses what it made when the switch goes back, ignores a late answer for an earlier choice or selection, handles too large, failed (with a retry) and cancelled preparations and nothing after close, and copies the link of the current choice, saying whether the browser took it. |
| `puzzlecode-cli` | The optional `--code` of `tools/generate.mjs` (§9.8): the flag is boolean (a repeat, `--code=…` and `--code true` are refused), works with a recipe and with invalid boards still refused, and `--help` names it and starts no generation; with sinks and fixture packs, the default stdout and `--output` bytes are unchanged, `--code` prints the frozen raw golden of each sample and hand-authored puzzle in order in one write, `--output` still gets the original pack beside the lines, an untitled, an 80-code-point and a foreign-claim puzzle, a core-only puzzle, a DEFLATE line, an angle and the 24 × 24 oracle all decode, with the real decoder, to the snapshot of their own puzzle (rows, ordered identities, clue cells, angle, answer, claims, printed heading, equal fingerprint with and without the tail), a deeply frozen pack is never modified, and an encoder, snapshot, malformed-line, file or stdout failure rejects with nothing partial on stdout; through `run` with real generations, ten, one and several codes in pack order, the same worker messages and the same pack with and without the flag, equal lines for 1 and 4 workers (slow), a valid partial result at exit 2 with its seven codes and the unchanged stderr, output failures at exit 1, and one real child process (slow) with ASCII-only stdout, the pack in `--output` and no file without it. |
| `qr` | The five golden payloads give the exact matrix hashes (versions 5, 5, 5, 6, 11) and a second implementation (jsQR, test-only) reads each URL back with a byte and an alphanumeric chunk. Mixed-case and fork prefixes are kept verbatim and capacity follows UTF-8 bytes. Version boundaries: with the standard prefix, version 5 holds 55 code symbols at M and 87 at L, version 40 holds 3322 at M and 4227 at L. `qr-invalid-input` for an empty core, trailing or double dot, lower case, grouping, U/I/O/L, a prefix not ending in `#p=` and an unsupported level; `qr-too-long` beyond version 40. M stays M (the format information is read back: a tiny payload that a boosting encoder would raise to H stays M) and L stays L. The dimension formula for versions 1–40. Row-run path examples, malformed matrices rejected, and an independent rasterization of the path equal to the matrix. Both vendored files match their SHA-256 after CRLF-to-LF normalisation (encoder 45,368 bytes `68453133…`, jsQR `bc40c8a1…`) with their licences; the decoder is absent from every browser import graph; no npm dependency or lockfile; no unsafe DOM or string execution. |
| `puzzlecode-acceptance` | The Node side of the cross-app acceptance (§13.3 items 23 and 24), over the real module worker through `createPuzzleCodeClient` (`nodeWorkerFactory`) and a value oracle written apart from the production snapshot (rows, ordered identities, labels and RGB, clues, angle, answer, claims, heading, progress fingerprint). `tests/fixtures/puzzlecode-acceptance.json` lists the scenarios BA01–BA30 and where each is evidenced; a traceability test fails when a scenario is named by no test or harness check, and BA30 (a physical print and phone scan) is evidenced by neither. The three samples, the hand-authored puzzle, a custom pack (holes, a padded border, Unicode labels, RGB, a 135° view) and the 243-character oracle go from the Print job through the QR group's `data-qr-code` (the printed sheet shows no code text), to a QR rasterised at four pixels per module with its quiet zone and read by the test-only jsQR to the exact address the Share dialog copies, to a fresh decode with the same view, with and without the tail; a typo is never applied silently, a damaged tail opens nothing by itself, and bad addresses (`i`, repeated, mixed, empty) leave the game alone; the print options change the layout and never the code; the target rules (the page's own Player on every http, https and file page, a fork's case kept, the public Player only for a page with no usable address); the capacity ladder (tail first, then level L, then no code and no QR); the heading rule at 75, 76 and 80 code points; `#pack` and `#lib` no longer addresses and file imports unchanged and never touching the code service; `worker-unavailable` without a main-thread fallback; and the lines of `tools/generate.mjs --code` equal to what Print and Share carry. |

### 13.3 Browser acceptance checklist

Run on desktop Chromium, Firefox and Safari, on Android Chrome and on iOS Safari. Optional dev-only Playwright smoke tests can come later.

1. `/pentomino/` lands on the generator. Shared modules and workers load under the prefix.
2. Default board → New piece set → New puzzle (several presses) → Play: the player opens in a new tab and shows the same pieces and clues.
3. The Heart preset shows as a heart at 45° in both apps. In the editor, clicking a blocked cell of the notch (at 45° and at 0°) unblocks it, and dragging re-blocks cells.
4. Drag, tap-place, rotate, flip and the keyboard all work at 0°, 45°, 90° and 315°, including on scrolled and zoomed pages.
5. A Play link opens in another browser profile. A bookmarked player address reopens the same puzzle, and a link pasted into the address bar of an open player opens its puzzle.
6. Complete a puzzle with the keyboard only. Screen-reader smoke test.
7. An invalid drop and `pointercancel` leave the previous state unchanged.
8. Cancel responds during a long job, and accepted puzzles remain.
9. Play of a list too long for one link opens only the chosen puzzle and shows M-PLAYER-ONLY; a puzzle too large for any link shows M-PLAYER-UNAVAILABLE.
10. A valid tiling different from the stored solution wins.
11. No score, uniqueness or solvability claim appears after an inconclusive check.
12. A 22×22 Hell-3 pack (≈ 75 pieces) shows labels beyond Z and patterns together, a scrolling tray, and stays playable with zoom and pan.
13. The area cap and N-CAP follow the device class (§6.2).
14. A job that reaches 115 s returns its accepted puzzles by 120 s with reason `time-limit`.
15. The player's **EN | VI** switch changes every text of the page and survives a reload; the theme buttons change the palette (also on the generator, which shares both choices).
16. Right-click on a piece of the pieces panel opens the piece menu: rotate both ways, flip both ways. On a placed piece it also offers Return to tray. Escape closes it and the focus returns to the piece.
17. Print (generator's Play row and player's game bar) opens the dialog; the print preview of the browser shows an A4 first sheet, the piece set and the board at the chosen size, with no other part of the page. On paper at 100 %, the 50 mm bar measures 50 mm and a cut-out piece covers exactly one board cell. With two-sided printing flipped on the long edge, the two sides of a piece or board part coincide. `tests/browser/print.html` checks the geometry in millimetres; `tests/browser/puzzle-code-print.html` (item 21) checks the QR band and the Print dialog's preparation.
18. `tests/browser/puzzle-qr.html` (strict policy) checks the five golden matrix hashes, then renders symbols of versions 5, 11 and 40 on light, dark and high-contrast surroundings and measures them in millimetres: an opaque white box with the quiet zone of 4 modules on every edge, black modules at 0.5 mm or more, a box of at least 25 mm, and a path that paints exactly the matrix. It is not a phone scan; reading a printed code with real phones stays a physical check.
19. `tests/browser/puzzle-code-worker.html` (strict policy) runs the puzzle-code client over its real module worker, with no mock: the frozen golden from `encode`, `decode` with and without the tail, links and grouped text, a correction candidate and core-only recovery, typed failures, cancel, supersede, two independent clients, `worker-unavailable` and idempotent dispose. It counts the page's `Worker` constructions (one worker per client at a time, none left running) and asserts that the page never builds the cold catalogue and that no policy violation or uncaught error occurs.
20. `tests/browser/puzzle-code-entry.html` (strict policy) mounts the real Player with the real code worker, and with a deferred client where timing matters (`env.createPuzzleCodeClient`). It checks that nothing exists before the entry is opened; that there is no start-screen or header button for it, that the dialog opens through `codeDialog.open()`, the label, field attributes and focus; the core, the full code, grouped, lower-case, hyphenated and O/I/L forms opening the first sample puzzle exactly (board, rotation, ordered pieces, clues, tray and clue counts), the address, the verification path with and without a tail and the focus on the heading; a pasted link that is never requested and the refused `&i=1`, repeated, `pack` and `lib` forms; every failure message with the text, the game and the address untouched and the field marked invalid; a candidate that changes nothing until confirmed, a grouped one, and a withdrawn one; a damaged tail with the core opened alone (address `#p=<core>`), the corrected tail, and no offer for a bad core; bad `#p=` addresses at start-up and later; saved moves from the entry, from a `#p=` address on load (core and full code, grouped lower case) and on a hash change, each silently (no notice, no announcement), with Replay and a restoration warning kept for moves that no longer fit, and nothing said with nothing saved or for a bad code; Cancel, an edit and a superseding load against late replies, and `destroy`; missing module workers; letters, Delete, arrows and shortcuts typed in the field; the count and text-only output; Vietnamese, including a language switch with the dialog open; every text and button at 4.5:1 and the invalid border at 3:1 in the light, dark and high-contrast themes; the real Player page in a 390 px frame (no sideways scroll, 36 px buttons, an icon-only header action); and that the page built no catalogue, left no worker running and had no policy violation or uncaught error. A page cannot press trusted keys: Tab traversal, Escape and typed text, a real paste and a coarse pointer were checked over CDP on the real Player page when the dialog was written.
21. `tests/browser/puzzle-code-print.html` (strict policy) runs the real Print dialog with the real puzzle-code worker and QR adapter and measures the pages in millimetres from the SVG DOM. It checks: Print disabled with "Preparing the puzzle code…", then ready with the target and the notices, and nothing printed by itself; the `data-qr-code` of the QR group equal to the prepared code, which an independent worker encoding reproduces, and the page's QR rasterised and compared module by module with its matrix (the runner also decodes the rasterised QR with the test-only jsQR to the prepared address); every first-sheet case of versions 5, 11 and 40 by 0 and 1 detail lines by five titles (short, long, 80 wide letters, astral, unbroken) with no overlap, the heading clear of the QR column, the QR at the top left and its size, the "Play online" caption and no code, host or set text, and the preview below the band; every size, the eight 45° angles and the sheet choices, one-sided and two-sided, with the cell size, the cut-out sheets and the paper of a printout without a code and no QR on a back; a solution sheet whose board stays at 40 mm; the sheet without a QR; the Vietnamese texts; the dialog's lifecycle with a deferred client (a click while preparing, a stale answer in either order, a changed puzzle, angle or heading, progress that changes nothing, options that reuse the code, close and reopen, a puzzle changed before the Print press, an error with **Try again**); the capacity ladder in the dialog and on the sheet; the target (this page's own Player on every page, no override, no local notice, nothing stored); the real Player (stored answer carried, no solution option, a turned view or a language switch preparing again, progress not) and the Generator's job ("Hard #3", its solution option, the code only on the first sheet); and that the page built no catalogue and had no policy violation or uncaught error. It is not a physical print or a phone scan.
22. `tests/browser/puzzle-code-cli-parity.html` (strict policy) decodes, in the real puzzle-code worker, the codes that `tools/generate.mjs --code` prints for the sample and hand-authored puzzles (the frozen raw lines, as captured, never regenerated), one DEFLATE line and the 24 × 24 oracle. It compares each decoded puzzle with the one the line was made from: rows with their margins, ordered identities and RGB, clue pieces and cells, angle, stored answer, rating and certificate claims, the printed heading and the progress fingerprint, with and without the tail, and requires no tail error. The browser's own encoder then runs on the same shared snapshot and must give a line that decodes to the same puzzle (byte equality is recorded, not required). It asserts that the page built no catalogue and had no policy violation or uncaught error.
23. `tests/browser/puzzle-code-acceptance.html` (strict policy; `?phase=narrow` for a 390 px touch viewport, `?phase=keys` for the checks that need trusted keys, `?shots=1` for the screenshots it asks the runner for, `?only=<text>` for one check) runs both real apps end to end with the real puzzle-code worker and no catalogue on the page. The real Player prints (the page's `window.print` is replaced by a recorder), the sheets are read back from the SVG, the Share dialog copies its link through a controllable clipboard and fresh Players with fresh storage open the code through the entry dialog; the real Generator (real engine workers, a 10 × 6 Normal set of five puzzles, the third selected, the solution sheet chosen) is printed and re-created (it has no Share control). The checks are: the second puzzle of the sample (golden code, QR matrix hash, shared link, the core typed grouped in lower case, the full code), a view at 45°, the 24 × 24 oracle (its link length computed from the page's own Player address), a custom pack (ids, Unicode labels, RGB, a padded border, holes, a 135° view), sixteen option combinations of the oracle, the capacity ladder with two-sided printing and the Share dialog's notes (no QR, a long link, a link too large), the target (this page's Player for Print and Share, and the shared link opening in the real Player page), saved moves, Replay and failed entries, stale and cancelled operations with gated clients (a delayed answer for one puzzle printing, copying or opening nothing for another, the puzzle chosen in the Print dialog's own list), a refused clipboard (the exact link selected in the share field, nothing said to be copied) and an untitled later puzzle whose heading is that of the language the link was made in, the real browser clipboard under a granted permission, Share and Print disabled without a puzzle, `#pack`, `#lib` (no longer addresses) and the sample with no code client, a page without `Worker` (Share says the link could not be prepared), and the matrix English and Vietnamese × light, dark and high-contrast: the Print dialog, sheet and QR (computed fills black on an opaque white box, nothing that fades, filters or blends it), the entry with a typo (alert, candidate with its values, field marked invalid and described by the alert, focus returning to the puzzle title), the Share dialog with its QR, every text with its values (no placeholder, no raw key) and 4.5:1 contrast. The phone phase checks the controls and dialogs at 390 px with a coarse pointer: 36 px targets (2.25 rem, the size of the controls below 768 px; the Share dialog's ✕ included), nothing of the code section wider than its dialog, no sideways scroll and a 16 px entry field; the size table of the Print dialog is wider than a 390 px dialog and scrolls inside it, which the harness records as a note. The keys phase presses trusted keys over CDP: Tab from Share to Print and back, Enter opening the Share dialog with the focus on **Copy link** once the link is ready, Enter copying (refused: the whole link selected in the field), and Escape closing it with the focus back on Share. The page exposes `window.__acceptance` (the QR rasters as grey bytes, the journeys' codes, addresses and fingerprints, notes), so the runner decodes every raster with the test-only jsQR, which is never served to a browser, and compares the text with the shared link. It asserts that every worker the page started has ended, that the page built no catalogue and that there was no policy violation, uncaught error or request outside the page's origin.
24. Real-browser journeys and the release gates. Over CDP, with trusted mouse and key input in a freshly allocated Edge profile (check-list §7), the real `/player/` page is given the printed core (typed key by key, lower case, grouped) and the full code through the entry dialog, then the address that the printed QR decodes to, and each opens the puzzle the source shows (title, level line, board markup, ordered tray, badges), with one puzzle in the list and the address `#p=<code>`; a piece moved by taps leaves one progress record under the independently computed fingerprint that holds no code; the core and the full code restore it, a failed entry changes nothing and Replay erases it; one wrong symbol is a candidate that opens only on its button; a damaged tail offers the core; the 243-character oracle opens with its 36 pieces to place; a link with a puzzle number opens nothing and `#pack=` opens nothing either; and the codes printed by `tools/generate.mjs --code` open the puzzles of the pack they came from. This is emulation and automation: it is not evidence of a printed sheet or a phone. A release also needs what no harness can give, done by the owner: A4 prints at 100 % on two printers with the 50 mm bar measured, the printed QR scanned with real Android and iPhone cameras from a build the phone can reach, a printed QR scanned with a phone, a puzzle opened on a phone with a deliberate typo, the clipboard of a real user, a Vietnamese reader's review of the texts, and a smoke test of the deployed build. The header Help button is an icon of 36 × 36 px below 768 px.

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
| Display-only rotation confuses users (pieces still turn by 90°) | M | L | WYSIWYG tray, screen-space controls, axis hints |
| Cells too small at 45° on phones or large boards | M | M | Fit rule, zoom, pan, phone area cap |
| Many pieces are hard to tell apart | M | L | Labels beyond Z, patterns, generated colors, scrolling tray |
| Long links get truncated | L | L | 16k limit, warning, only the puzzle to open when the list is too long |
| Shared-origin storage and quota | L | L | Namespace, LRU, try/catch |
| Mixed old/new modules after a deploy | M | L | Whole-graph `?v=` stamping; no service worker |
| Seeds stop reproducing after algorithm changes | M | L | `algo`, `policy`, `rng` and model ids recorded in packs |
| Malicious or corrupt links | L | M | Staged validation, size limits, `textContent`, CSP |
| Browser lacks module workers or (De)CompressionStream | L | M | Feature detection, clear messages, `1j` codes |

### 14.2 Edge cases

1. A board with < 30 active cells, a disconnected board, or one above the enabled limit or 32 cells per side: generation is disabled and the offending cells are highlighted (N-SMALL, N-CAP).
2. Every board of 30–676 cells offers at least one level (§7.5).
3. Carving fails within the time limit: show N-NOSET. Never say "impossible".
4. Tight boards with few distinct layouts: return a partial batch, with N-ARRANGEMENTS when the arrangements were counted to the end, else N-LAYOUTS-UNUSED, N-LAYOUTS-LEFT or N-FEWLAYOUTS. Never pad it with clue-only variants.
5. Symmetric boards: duplicates under symmetry are rejected by key. Uniqueness counts raw coordinates.
6. Symmetric pieces: their rows are deduplicated and `canonicalT` is stored.
7. `require` at Hell levels on large boards usually fails: N-UNIQUE-EXP before, N-UNIQUE with the partial result after.
8. Editing the board after a set exists switches to the sets of the new board (§10.2); nothing is discarded. Choosing another puzzle level in step 3 keeps the set; if it cannot reach that level, the request ends as `difficulty-not-found` with N-SETLEVEL.
9. Cancelling a batch keeps the accepted puzzles; pending certificates stay "not checked".
10. Packs from links:
    - without a solution → verify in a worker;
    - proven unsatisfiable → an error state;
    - inconclusive → playable as "not verified";
    - sets without `macroRegion` use flat-cluster LNS when new puzzles are generated.
11. Non-standard sets in a link (duplicate shapes, pieces < 3 cells, holes) are playable with a notice. A pack with zero clues is playable too; the generator never produces one.
12. An unknown version or rule set: show "unsupported" and store nothing.
13. Progress saved for a different puzzle with the same id is not applied, because the fingerprints differ.
14. No room to rotate a placed piece: shake and leave it unchanged. A drop partly outside or overlapping reverts.
15. A resize or orientation change during a drag cancels the drag.
16. Two tabs: the last write wins. Storage unavailable: play and generation continue in memory, and the page says the work cannot be saved.
17. 21–90 pieces: generated colors, labels beyond Z and patterns; the tray scrolls.
18. Holes are drawn grey with a cross; exterior cells are not drawn, so a heart reads as a heart.
19. A model exceeds the guards (`model-too-large`): N-TOOLARGE; the job ends with the accepted results.

---

## Appendix A. Evidence summary

All measurements were taken on throw-away prototypes during the original design (Node 24, Windows) unless stated otherwise; A.1–A.9 are single-threaded. They are evidence for decisions, not browser guarantees (A.8 motivated `difficulty-v2`). The full studies are in `docs/init-design/`.

**A.1 Solver correctness and speed**
- Classic 12-pentomino raw solution counts were reproduced: 6×10 → 9,356, 5×12 → 4,040, 4×15 → 1,472, 3×20 → 8.
- Throughput: ≈ 54M link updates/s, i.e. 40k–160k row trials/s depending on row density.
- On 360-cell, 41-piece models: ≈ 6–7k row trials/s.

**A.2 Carving**

| Board | Result |
|---|---|
| 6×10 (K 10–13), 5×12, 8×10 (17), 9×9 (17), 10×10 (18), 12×12 (18), heart-67, 8×8 with holes | 100 % success; mean or median times 1–435 ms; worst 3.2 s |
| 81 cells, 18 pieces (exactly the minimum area) | 19/20 success; 4.7 s average, 11 s maximum |
| 360 cells (earlier policy) | 11 ms for K = 17 (20–23-cell pieces); 59 ms for K = 41 |

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

**A.6 Share-code sizes** (deflate-raw + base64url; a measurement of the `#pack=` link, which no longer exists)

| Pack | Share code |
|---|---|
| 1 puzzle, 60 cells | ≈ 0.7–0.9k characters |
| 10 puzzles, 60–121 cells | ≈ 1.6–2.5k |
| 10 puzzles, 360 cells, 40–42 pieces | ≈ 4.4–4.6k |

Uncompressed base64 would be about 12–16k characters for a 10-puzzle pack of 60–121 cells.

**A.7 Rotation algebra** (counter-clockwise convention)
- The screen-space ⇋ / ⇵ / ⟳ formulas of §6.3 gave 0 mismatches against geometric rotation over 8 angles × 8 orientations.
- The arrow mapping's worst angular error is 45°, and only at the odd-45° ties.
- Heart N = 10 at 45: the blocked corner points up, and the extent is 14.14 × 10.61 cells.

**A.8 The earlier difficulty formula on large boards** (historical; superseded by `difficulty-v2`, §7)
- Caps: B ≤ 50,000 branch trials and 500,000 row trials.
- Each case used 3 random clue subsets, with G taken from the earlier clue shares.

| Board | K (level intent) | G | Scores | Observation |
|---|---|---|---|---|
| 6×10 | 8 (easy) | 5 | 17, 18, 21 | Very easy / Easy boundary |
| 6×10 | 12 (master) | 2 | 64, 67, 69 | Random clues reach Hard/Expert only; Master needs searched clues |
| 18×20 | 17 (hard), 20–23-cell pieces | 5 | 84, 85, 88 | Master band; B ≤ 3, so R and H dominate |
| 18×20 | 41 (hell-1) | 3 | ≥ 188 ×3 | Censored; 68–88 s per capped traversal |

**A.9 Counterexamples behind decisions**
- **D15.** A 6×10 set with an unclued score of 52 produced 7/10 Master puzzles (≥ 55 under an earlier formula). The unclued score is not a ceiling.
- **D26.** Reflecting a puzzle's clues gives the same symmetry-normalized key. Yet the original legal placement of fixture piece I overlaps the reflected clue A at (8, 0) and (9, 0). Normalized ids would corrupt saved progress.
- **D27.** In a fixture state, the player's first move (B) was wrong and the six later moves were correct. Removing any one of the six later pieces does not restore solvability; only removing B does. The old fallback would have blamed the most recent piece, which was correctly placed.
- **D16, G ≥ 1.** An 11×11 Hell-2 batch of zero-clue puzzles produced 10 identical puzzles.

**A.10 Large-board evidence**

Sources: the large-board studies of the original design (`docs/init-design/`). Both prototypes ran outside the repository on the same host: AMD EPYC 7763 VM (8 cores / 16 threads), Windows, Node 24.21.0, 4 `worker_threads`, `--max-old-space-size=2048`. These are Node measurements, not browser measurements.

| Topic | Evidence | Used for |
|---|---|---|
| Score over-rating | Earlier formula: 360 cells, K 15–18, G 5–8 (the user's "hard") scored expert; K 40–45 scored hell-5. With `difficulty-v2`: hard and hell-1. A formula with R and H rated an 18-piece, 360-cell set with 1–2 clues as hell-1 and needed 13–17 clues (33–43 %) for 40-piece hell-1, with more clues at 360-cell hell-1 (16) than at hard (9–11). 3,458 Stage-A ratings. | D10, D12 |
| User examples | 60 cells: easy K 7–8 (G 3–4, D 8–11); master K 12–13 (D 37–45, 10/10 puzzles). 360 cells: hard K 17 (G 6–7, D 20–24), normal not offered; hell-1 K = 41 reproduced by both prototypes: 10/10 puzzles in 5.8–7.6 s and 3.58 s. | D9, §7.5 |
| Feasibility | Only 7 shapes of 3–4 cells exist; minimum areas of §6.4; with a 30 % cap, 13 pieces need exactly 60 cells, so the 40 % cap was kept; the old spread rule made 484 cells / K = 80 infeasible (486 cells needed). | D32 |
| Single arrangement | Flat-carved sets with μ ≥ 7.5: 26 of 28 had exactly one arrangement. LNS from such witnesses succeeded in 0 % of steps. | D33 |
| Macro carving | Both prototypes, same settings: 60 cells K = 8 → 10/10 distinct puzzles in ≤ 0.1 s (flat: 1–2 puzzles); 360 cells K = 17–21 → 10/10 in 0.3–0.9 s; 360 cells K = 37–41 → 10/10 (3.6–4.6 s on 4 workers; 31–34 s single-threaded). Minimum layout distance 2–8 (14–18 at hell-1); proved multiple solutions in 5–8 of 10 (60-cell easy) and 10 of 10 (360-cell master). | D16, D17, D33 |
| Time by area | Worst set + 10, Node, eager 2,000-row certificates: 484 cells hell-1 24.6 / 28.1 s (median / max); 576 cells hell-1 29.3 / 38.4 s; 676 cells hell-1 44.2–48.6 s (one seed); hell-2/3 ≤ 25.6 s. Certificates were 33–53 % of hell-1 batch CPU; lazy-certificate estimates: 484 → 20.4 s, 576 → 26.1 s, 676 → 36.9 s (max). Browser plan (5 s + 4×): 87, 109, 153 s. Hell-4 runs with typed DLX links (K = 91, μ = 7.4): 676 cells 7.1 / 8.5 s with 1,058 MiB RSS. | D36, D37, §7.5 |
| Memory | Prototype with per-row JS arrays: 1.6–2.25 GB RSS at 576–676 cells; buffer reuse + recycling saved 0–12 %; a smaller worker heap changed nothing. One 676-cell, 91-piece model: 348k rows, 2.97 M nodes, 71 MB of DLX arrays, 137 MB JS heap, 395 MB RSS after GC. | D38, §8.5 |
| Certificates | Above 200 cells, Hell-level certificates were "not proved" in 639 of 670 checks (0.5–2.3 s each); other levels were mostly "unique" because flat sets had one arrangement — no longer true with macro carving. | D14 |
| Distance rule | `dPref` = max(3, ⌈K/3⌉) caused 38 rejections at K = 75; a 676-cell run stopped at 4 of 10 because every candidate was "too close" — fixed by clamp(⌈K/4⌉, 3, 10) and the best-distance fallback. | D16 |
| Rating cost | Saturated ratings: 0.06 s (60 cells), 0.5 / 1.3 s median / p90 (360), 0.8 / 2.7 s (484), ≤ 4.2 s; ≈ 3.7–4.2 s per candidate at 676 cells. | §7.3, §8.3 |

Superseded earlier statements: an earlier count table, the 15-point bands, the "≥ D" censored acceptance rule, `maxActive` = 360 and `maxNodes` = 3,000,000 (A.8 shows why).

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
14. The original design and its studies: `docs/init-design/`.
