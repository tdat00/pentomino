# Response to architect-2's review (architect-1)

| | |
|---|---|
| Responds to | `2-review-of-architect-1.md` (items R2-01 … R2-10 and the comparison table) |
| Author / date | architect-1 · 2026-10-22 |
| Settled inputs | **Board rotation:** the user's correction overrides the earlier "Rotate & regrid" choice. Rotation is **presentation-only**. The logical board is always an axis-aligned M×N grid with blocked cells, and `presentation.rotation` (in 45° steps) is ignored by the solver, the score and validation; see §2. **Piece count, board-size caps and difficulty ceiling:** deferred to Phase 5, because the user's addendum replaces the 10–18-piece rule. |

**Consequence for my phase-2 review:** I withdraw R1-01, which argued for regridding. architect-2's view-only
model (D2 §4.2–4.3) is adopted and refined in §2. In D1, the regrid algorithm and lossless-editing
state (§8.2.2–8.2.3, `ShapeState`), the implicit-curve heart and all "Rotate & regrid" wording are dropped.

---

## 1. Responses to review items

| ID | Verdict | Justification and resulting change |
|---|---|---|
| **R2-01** Batch padded with clue-only variants | **Accept** | A batch counts only puzzles whose **full-layout key and clue key are both new**, compared up to board symmetry after cropping. The preferred minimum distance `max(3, ⌈n/3⌉)` may relax to **1, never 0**, with a notice. If the pool is still short, return a partial batch with an honest reason (A2 wording). The "reuse tilings with different fixed subsets" fallback is removed: D1 §8.7.2, §16 item 6, and notice N-ARRANGE. Clue-only variants could become a future feature, labeled separately. |
| **R2-02** Open score is not a ceiling | **Accept** | My own data shows the error: a set with open score 52 produced 7 of 10 Master puzzles (≥ 55, D1 App. A.4). The open score is renamed **"open-board benchmark"** and kept as optional information only. All "reaches at most…" wording is removed: notice N-REACH, D1 §9.6, and brief §3. A set is accepted only when **at least one rated puzzle in the target band** is found; that puzzle is reused as puzzle #1. A failure reads "not found within budget". |
| **R2-03** Conflicting count, palette and format limits | **Deferred to Phase 5** (agree in principle) | This is a piece-count-vs-area question, which the addendum supersedes. Notes for Phase 5: (1) keep three separate notions: hard feasibility (exact `minArea`, no slack), the supported product range, and a fast-path preference (my 3-cell slack is only a performance preference); (2) the addendum's 40–42 pieces on about 360 cells breaks my 20-color palette, my single-letter ids and the 26-piece import limit. Ids need a scheme beyond A–Z, and colors need a scheme beyond 20 entries, with labels always shown. |
| **R2-04** Symmetry-normalized ids used as progress keys | **Accept** | The counterexample is correct. I re-derived it: the reflected A clue covers (8,0) and (9,0), which the reference I occupies. The fix is two keys: (a) a **deduplication key**, quotiented by board symmetry and used by generation only; (b) a **save identity**, the SHA-256 of the exact board rows, piece id → normalized cells, and exact clue placements, as in A2 §3.3. Restored moves are revalidated. The file's `id` is never trusted for progress. |
| **R2-05** Hint fallback can blame a correct piece | **Accept** | Blaming the most recent piece, and falling back to an unverified stored-solution placement, are both unsound. A hint now returns exactly one of three things: (1) a **proven compatible placement**, from a solve of the current state or from the stored solution when every player placement agrees with it; (2) a **proven repairing removal**, testing all player pieces rather than only the last 6; or (3) **"no repair identified within this check"**. Hints move out of the MVP (post-v1), as A2 proposed. |
| **R2-06** No truthful card label for an inconclusive count | **Accept** | Multiplicity becomes a separate certificate with four states: `unique` (exhaustive, raw coordinate-level), `multiple` (≥ 2 found), `not proved` (search cut off), and `unsatisfiable` (exhausted with 0; rejected or flagged). Cards show the state and whether it was verified at runtime or only claimed by the file. Uniqueness counted up to the clue stabilizer is replaced by raw coordinate counting, which is simpler and conservative; with at least one clue the stabilizer is almost always trivial anyway. |
| **R2-07** High-tier, distinct-batch policy not calibrated | **Partially accept** | **Accepted:**<br>• Appendices A.3 and A.4 are preliminary.<br>• The Hell-2 "10/10" result counted identical zero-clue puzzles.<br>• A.3 used 20 k/100 k caps instead of v1's 10 k/25 k.<br>• Their score envelope is arithmetically right: 88 / 85 / 84 / 81, which I recomputed.<br>• Calibration must be re-run on the final pipeline before the bands are frozen: at least one clue, strictly distinct layouts, final caps and fixed seeds. The report must give requested vs. accepted puzzles, in-band rate, not-proved rate and time.<br>**Deferred to Phase 5:** the band and ceiling design itself. The addendum makes the maximum level board-dependent and allows about 40 pieces, which also invalidates my normalization by 18 pieces (`M_REF = 18`). |
| **R2-08** P0 deployment calls a phase-8 tool | **Accept** | The P0 workflow will guard the step (`if [ -f tools/stamp-version.mjs ]`) or ship a minimal stamper. Once stamping is enabled it rewrites **every** relative specifier in every deployed `.js`, `.html` and `.css` file, including worker URLs. A post-deploy smoke test then loads both apps and a worker under `/pentomino/`. |
| **R2-09** Inline redirect conflicts with the CSP | **Accept** | Use an external same-origin `redirect.js` (A2 §14.1), plus meta refresh and a plain link. No `'unsafe-inline'`. |
| **R2-10** Version check admits 0 and negative versions | **Accept** | Accept only an explicit set of supported versions, currently `{1}`. Later versions get named migrations. Anything else is rejected as "unsupported version". |

### Points from the comparison table that were not numbered items

- **"Do not silently delete small regions" and A2's strength 3 (reversible editor provenance): moot.** There is no regrid any more; boards change only through M×N inputs and cell painting (§2).
- **Local token for oversized Play: partially accept.** Prototype measurements (deflate-raw compression, then base64url text):

  | Pack | Share code | Uncompressed base64 |
  |---|---|---|
  | 10 puzzles, 60–121 cells | ≈ 1.6–2.2 k characters | 12–18 k |
  | 1 puzzle, 360 cells, 40–42 pieces | ≈ 1.6 k characters | ≈ 9 k |
  | 10 puzzles, 360 cells, 40–42 pieces | ≈ 4.4–4.6 k characters | 39–41 k |

  Compressed links therefore stay at about 5 k characters or less even at addendum scale. The same-origin storage hand-off remains **only as a fallback**: when the code exceeds 16 k characters, or when (De)CompressionStream is unavailable. The decoder feature-detects `DecompressionStream` and aborts the decompression stream at 256 KB.
- **Estimator choice: accept testing both in Phase-5 calibration**: a single canonical capped traversal vs. the median of 3 seeded capped runs. My phase-2 measurements showed similar order sensitivity: a median spread of 5–6 points with A2's estimator and 3–6 with mine.
- **Disconnected boards:** I now propose **connected boards only for v1**. Validation and UX are simpler; disconnected support can come later.
- **Open-board free play:** accept as a possible future mode, labeled separately and never counted as a generated puzzle.

---

## 2. Board rotation is presentation-only (user correction): design consequences

`presentation.rotation` takes values 0, 45, …, 315, in degrees **clockwise on screen** (the CSS
convention). It is stored once per pack. Generator previews, thumbnails and the player apply it. The
solver, the score, symmetry and deduplication keys, validation and progress fingerprints all ignore it.

**Rendering**
- One SVG board group with `transform="rotate(θ, cx, cy)"` holds the cells, clues, placed pieces and the ghost.
- Piece letters are counter-rotated by −θ so the text stays upright.
- Non-playable cells that connect to the border are **not drawn**. That is how a blocked corner becomes the heart's notch.
- Enclosed non-playable cells are drawn as blocked holes (the D1 §8.2.6 rule).

**Tray vs. board: WYSIWYG**
- Tray pieces are drawn in the board's frame (`R_θ ∘ T_t`), so a piece never changes appearance between tray, drag and board.
- On-screen rotate and flip therefore behave the same everywhere. Tray slots are sized from each piece's rotated bounding box.
- A2's upright tray would make a piece jump by θ when it enters the board. Keep that only as an optional preference if playtests ask for it.

**Hit-testing and drag**
- Pointer positions are converted to board-local coordinates with the board group's `getScreenCTM().inverse()` (A2 §4.3), and the cell is found by `floor`. Points in the transparent corners of the rotated box count as outside.
- The anchor is `pointerLocal − grabbedCellCenter`, snapped by rounding in board-local coordinates. The grabbed cell stays under the pointer through rotate and flip.
- The touch lift (1.25 cells up) is defined in screen space and converted by the inverse rotation before snapping.
- Board-editor painting uses the same mapping.

**Rotate/flip semantics**
- Buttons and keys act in **screen space**: they do what the player sees. Pieces still have only the 8 grid orientations; there are no 45° piece poses.
- Rotating 90° clockwise or counter-clockwise on screen equals grid `rotateCW`/`rotateCCW`, because rotations commute.
- A left↔right mirror on screen applies `R^k ∘ M` after the current transform, with `k = (−2θ/90) mod 4`.
- A top↔bottom mirror on screen uses `k = ((180 − 2θ)/90) mod 4`.
- Prototype check: all 8 angles × 8 orientations give 0 mismatches.

**Arrow keys**
- Each arrow moves the ghost one grid cell along the board axis whose on-screen direction is closest to the arrow.
- At odd multiples of 45° two axes tie. Use the mapping for θ − 45°, and show small axis arrows on the board during keyboard moves.

**Viewport fit**
- Fit the rotated bounding box of the **active** cells, with a 0.5-cell margin: cell size = `clamp(min(availW/bboxW, availH/bboxH), 14, 64)` px.
- At 45°, a 6×10 board needs 11.3 × 11.3 cells, so in a 900×500 px area cells shrink from 83 px to 44 px.
- The 10×10 heart needs 14.1 × 10.6 cells, 25 % less height than its full square.
- On touch devices, if the cell side would be under 24 px, the player offers a display-only **Straighten view** toggle (nearest multiple of 90°).

**Presets**
- **Heart:** N×N with N even (default 10, giving 75 cells), the top-right (N/2)×(N/2) block disabled, and `rotation = 315`.
  - 315 means 45° counter-clockwise, so the blocked corner points up and forms the notch. The two lobe tops sit at ±0.354·N.
  - General form: M×N with an a×b top-right block. Optionally block each lobe's outer corner cell to round the lobes.
- **Diamond:** an N×N square with `rotation = 45`.
- Other presets stay plain axis-aligned masks.

**Generator**
- The ⟲45 / ⟳45 buttons only change `presentation.rotation`. They never invalidate sets or puzzles.
- Cells can be painted in the rotated view; an "edit unrotated" toggle helps precision.
- Puzzle cards render rotated.
- No structural rotation command is needed.

**Data and validation**
- `presentation: { rotation }` defaults to 0 and must be a multiple of 45 in [0, 360).
- It is excluded from score, solution counting, deduplication keys and progress fingerprints.

**Tests**
- Pure-math unit tests in `core`:
  - the screen↔grid flip table;
  - the inverse-transform cell mapping for all 8 angles;
  - rotated bounding box and cell-size fit;
  - the heart preset's cell count and orientation.
- Browser smoke tests at 0°, 45°, 90° and 315°: drag, rotate, flip and keyboard moves.

---

## 3. Proposed unified positions

1. **Rules:** pieces are free polyominoes of ≥ 3 cells, hole-free, and pairwise distinct under rotation and reflection. Any valid complete tiling wins. Clues are locked.
2. **Difficulty score:** one versioned additive score combining:
   - pieces to place;
   - placement-choice bits `H`;
   - the log of a **node-capped, deterministic** search effort (saturating at the cap, never "unrated", no wall-clock time).

   There is no area term unless calibration justifies one. Uniqueness is reported as a certificate, not scored. Weights and bands are frozen after Phase-5 calibration.
3. **Levels:** a data table with an open-ended Hell-n ladder. The label is always the level of the actual score, worded as an estimate. The maximum level depends on the board (Phase 5).
4. **Piece count, size balance and board-size caps:** **Phase 5** (addendum).
5. **Board editor:**
   - W×H inputs and cell painting, which also works in the rotated view;
   - presets: Rectangle, **Heart** (N×N + blocked top-right quadrant + rotation 315), **Diamond** (square + rotation 45), and other axis-aligned masks;
   - connected boards only, cropped to the active bounding box;
   - **rotation is presentation-only** (`presentation.rotation`, 45° steps). It never changes the grid: there is no regrid and no structural rotation.
6. **Piece-set generation:** solution-first carving. It grows from the most constrained cell, prunes regions whose sizes cannot be filled by the remaining pieces, enforces distinct canonical keys and hole-free pieces, and runs on a seeded RNG with node and attempt budgets.
7. **Set acceptance:** requires at least one rated in-band calibration puzzle, reused as puzzle #1. The open-board benchmark is informational only. Failure is reported as "not found within budget".
8. **Distinct puzzles:** each needs a new full-layout key **and** a new clue key, up to symmetry. The preferred minimum distance is `max(3, ⌈n/3⌉)`, relaxable to 1. Layouts are found by local reshuffling plus random restarts. Partial batches carry honest reasons; batches are never padded with clue-only variants.
9. **Clue selection:** `1 ≤ G ≤ K−2`. Move G up or down from the level's target, then try bounded swap/beam moves. Never assume that score falls monotonically as clues are added. The `require` option adds clues guided by counterexamples.
10. **Uniqueness:** default is any valid completion. Optional "Require one solution" needs an exhaustive raw-coordinate proof. Certificate states: unique / multiple / not proved / unsatisfiable.
11. **Solver:**
    - Algorithm X / DLX with MRV column choice;
    - a canonical, id-independent order for scoring;
    - seeded randomization only for discovery;
    - Luby restarts and node budgets.
12. **Workers:**
    - a shared module worker in `core`;
    - `requestId` plus `revision` checks;
    - cancel = terminate and respawn;
    - progress messages and streamed partial results;
    - results never depend on time; the clock is a watchdog only.
13. **Exchange format:**
    - a versioned envelope: `format`, `version` from the supported set, `kind` (`piece-set` or `puzzle-pack`), and generation policy as metadata;
    - board as row strings and explicit poses `{turn, mirrored, x, y}`;
    - `presentation.rotation`, which is excluded from every logical check;
    - an **optional per-puzzle `solution`** (on by default), plus provenance;
    - the validator checks game rules only and enforces strict limits.
14. **Hand-off:** the primary path is a compressed, self-contained `#pack` link that also works on other devices. A same-origin storage hand-off is the fallback for oversized links or missing (De)CompressionStream. File export/import and a library in namespaced `localStorage` complete the picture.
15. **Saved progress:** keyed by an exact-coordinate SHA-256 fingerprint, never by the symmetry-normalized key. Moves are revalidated on restore.
16. **Player:**
    - drag with a ghost preview, plus select-then-tap with a handle-cell anchor;
    - a full keyboard path and one active pointer;
    - the transform algebra from D1 §8.1;
    - on a rotated board (§2): WYSIWYG tray, screen-space rotate/flip, inverse-transform hit-testing, and a "Straighten view" toggle on touch devices;
    - state unchanged while previewing; undo/redo;
    - winning is decided by rule validation;
    - the timer is optional.
17. **Hints and show solution:** after the MVP, and making only proven statements (R2-05).
18. **Deployment:**
    - GitHub Actions with tests gating the deploy, publishing a `_site` folder;
    - external `redirect.js` and relative paths only;
    - whole-graph cache stamping, guarded until it exists;
    - a `/pentomino/` prefix smoke test;
    - no service worker initially.
19. **Testing:**
    - zero-dependency `node:test`;
    - A000105 enumeration, pentomino golden counts and a brute-force oracle;
    - regressions for cutoff status, raw uniqueness, stale results, strict layouts and progress identity;
    - rotation math tests from §2;
    - a Phase-5 calibration report before the bands are frozen;
    - no wall-clock assertions in correctness tests.
