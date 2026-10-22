# Review of architect-2's design (by architect-1)

| | |
|---|---|
| Reviewed | `1-design-brief-architect-2.md`, `1-design-detail-architect-2.md` (read in full) |
| Reviewer | architect-1 |
| Date | 2026-10-22 |
| Method | Desk review, plus experiments with my throw-away prototype (session workspace, Node 24, single thread). I re-implemented their difficulty formula with their canonical solver order (§6.2, §8.1), their `mixed-v1` quota (§1.2) and their layout-discovery approach (§9.1). All numbers below come from those runs. |

---

## 1. Summary verdict

architect-2 delivers a rigorous, contract-style design. Its main qualities:

- precise evidence semantics: unique, multiple and inconclusive results are kept apart;
- strict validation, deterministic ordering and request/revision checks;
- honest shortfall messaging.

Several of its decisions are **better than mine** and should go into the unified design (§2).
Its difficulty formula is sound. On identical puzzles its level matches mine or is one level off in
26 of 27 measured (board, pieces-to-place) groups, and matches exactly in 14. It is also about as
sensitive to search order as mine. So the choice between the two formulas is an engineering one,
not a question of which is correct.

Five **major** issues need fixing before unification. None is a strict blocker.

1. A view-only 45° rotation probably misses the stated purpose ("rotate … to create more shapes").
2. The large end of the design is not feasible: 180-cell boards, and rating searches with no node limit plus wall-clock "unrated".
3. The witness solution is never persisted or exported.
4. Layout discovery by plain enumeration produces near-duplicate "different" puzzles.
5. The import validator enforces the *generation policy*, so it rejects valid puzzles such as the classic 12-pentomino set.

---

## 2. Strengths worth adopting (with section references)

1. **At least one clue, at least two pieces to place** (`1 ≤ G ≤ K−2`, §1.2). This reads "pre-place some pieces" more faithfully than my design, which allowed one zero-clue "open board" puzzle per set. Adopting it also removes my special one-open-puzzle rule.
2. **`mixed-v1` size balance and feasibility DP** (§1.2, §1.3). Quotas of ≤ 40 % small pieces and ≥ 20 % large pieces are a literal, testable reading of "not too many small / too few large pieces". This is better than my `±2.5`-around-the-mean rule. I verified their minimum-area table for K = 10…18 (46, 52, 57, 61, 66, 70, 76, 81, 85).
3. **A set is accepted by finding a calibration puzzle in the requested band** (§7.3). This uses the single formula more convincingly than my "open score ≥ band minimum" proxy, and the calibration puzzle can become puzzle #1. Keep my open score only as the informational "reaches up to …".
4. **Explicit layout vs. clue distinctness and honest shortfalls** (§9.1, §9.4). The design separates "not found within budget" from "no further arrangement exists", and never pads a batch with clue variants of the same layout.
5. **Precise uniqueness semantics** (§6.3 table). Counting is raw and coordinate-distinct, not quotiented by symmetry. With `G ≥ 1` this is simpler than my stabilizer-based counting and loses nothing.
6. **Canonical solver order independent of ids, colors and input order** (§6.2). Ratings stay invariant under re-labelling.
7. **Worker protocol with `requestId` + `revision`, atomic replacement, keeping the previous result** (§2.2, §10.1). Mine only correlated request ids.
8. **Exchange envelope details** (§3):
   - a `kind` field (`piece-set` vs `puzzle-pack`), so sets can be saved and re-imported;
   - explicit pose fields `{turn, mirrored}`, which use the same convention as my `t = 4f + r`;
   - provenance;
   - a size limit applied before parsing;
   - labels and titles rendered as text only.
9. **Progress keyed by a SHA-256 fingerprint of semantic content** (§3.3). This is safer than trusting a file's id, as my design did.
10. **Root redirect through an external `redirect.js`** (§14.1). It is CSP-compatible. My inline redirect contradicts the CSP that my own §12.5 requires.
11. **Player details** (§13):
    - select-then-tap-cell placement for phones;
    - a single active pointer (simpler than my second-finger rotate);
    - a command-based undo model;
    - "do not mutate during drag".
12. **Testing** (§15):
    - a brute-force oracle for exact cover;
    - PRNG test vectors;
    - storage and cancellation tests;
    - a browser matrix that includes a `/pentomino/`-prefixed mount.
13. **The example document is correct.** I checked that the ownership map matches all 10 shapes, the shapes are pairwise distinct, and the area is 60. With clues A and J the puzzle has 3 completions. Their formula rates it 73 (Expert).

---

## 3. Issues

### R1-01: 45° rotation is view-only. Severity: **major** (interpretation; needs a user decision)

- **Section:** §1.2, §4.2, brief "Important expectations".
- **Problem:** The request says to rotate the board 45°/90° "để tạo ra được nhiều hình thái hơn" (*to create more shapes*), citing the Puzzlia heart, which is an axis-aligned pixel board. A view-only tilt creates **no new logical shape**; their own text concedes this. It also adds cost:
  - rotated hit-testing;
  - pieces drawn diagonally on the board but upright in the tray;
  - smaller cells. A 6×10 board shown at 45° needs a (10+6)/√2 ≈ 11.3-cell-square box, so cells are about 1.9× smaller in the same viewport.
- **Evidence:** In my prototype, rotating and re-rasterizing a 6×10 board at 45° gives a 12×12 staircase diamond with 68 cells. Carving and solving work normally on it (10/10 sets, median 32 ms). The 90° rotation is exact in both designs.
- **Recommendation:** Ask the user (Q1).
  - Proposed default: **geometric rotation and re-rasterization in the board editor**, using my "recompute from source until the next edit" rule, plus exact 90° rotation.
  - A2's view tilt MAY come later as a purely cosmetic `presentation.boardRotation`. Scores and validation already ignore that field.

### R1-02: Board limit of 180 cells is not feasible. Severity: **major** (performance)

- **Section:** §1.2 (board limits), §10.2 (budgets).
- **Problem:** With K ≤ 18 and piece size ≤ 10, a 180-cell board forces **every piece to be exactly 10 cells**, so piece sizes are no longer random. Search cost also explodes with average piece size, far beyond the 30 s job budget.
- **Evidence:** Randomized first-solution DLX searches on rectangles with 18 pieces:

  | Board | Cells | Average piece size | Result | Time |
  |---|---|---|---|---|
  | 15×12 | 180 (13,862 rows) | 10 | One run found a tiling after 850 k nodes; another hit 2 M nodes with no solution | 129 s / 321 s (≈ 6 k nodes/s) |
  | 12×12 | 144 | 8 | 0 of 5 runs found a solution within 300 k nodes | 76 s total |
  | 12×11 | 132 | 7.3 | 1 of 5 | 50 s |
  | 11×11 | 121 | 6.7 | 4 of 5 | 14 s |
  | 10×10 | 100 | 5.6 | 5 of 5 | 0.2 s |

- **Recommendation:** Cap v1 at **about 121 active cells**, so 11×11 is the largest square. Warn above 100 cells. This also **corrects my own 144-cell cap**, which the same data shows is too high.

### R1-03: Rating has no node cap and uses wall-clock time. Severity: **major**

- **Section:** §8.1, §8.3, §10.2.
- **Problem:** `B` counts trials up to the first solution with no cap. Cost therefore has no upper bound. Under the 3 s / 2 M row-trial limit, hard candidates become **"unrated"** and are rejected. That outcome depends on the device, and the top tiers become unreachable inside the budget.
- **Evidence:** Their formula, re-implemented with their canonical order, on an 11×11 board with K = 18:

  | Pieces to place (U) | Longest canonical traversal | Unrated candidates |
  |---|---|---|
  | 15 | 5.2 s | 1 of 4 |
  | 16 | 26.9 s | 1 of 4 |
  | 17 | 46.6 s (B = 1.43 M) | 2 of 4 |

  Hell-2 (D ≥ 125) is reached only by candidates that blow the budget. On 10×10 with K = 16 and U = 14, a single rating takes up to 2.5 s. With ≤ 64 subsets per layout, a 30 s job can rate only about 12–60 candidates.
- **Recommendation:**
  - Cap the traversal at a **fixed node budget** (for example 50 k row trials). Saturate `B` at the cap: "≥ cap" still yields a score.
  - Never use wall-clock time in scoring. Keep time only as a job watchdog.
  - Recalibrate the bands after capping.

  This keeps their deterministic, id-independent traversal and adds my "always rated, same on every device" property.

### R1-04: Layout discovery yields near-duplicates. Severity: **major** (user-visible quality)

- **Section:** §9.1.
- **Problem:** Consecutive solutions of one seeded DFS enumeration share most placements. Requiring only distinct layout keys accepts "different arrangements" that differ by swapping two pieces.
- **Evidence:** First 10 distinct layouts (up to board symmetry), measured as the number of pieces placed differently:

  | Board / method | Min pairwise difference | Median | Time |
  |---|---|---|---|
  | 6×10, K = 12, one seeded enumeration | **2** (2 of 45 pairs ≤ 2) | 9 | 108 ms |
  | 6×10, K = 12, independent random restarts | 9 | 11 | 40 ms |
  | 10×10, K = 16, one seeded enumeration | 4 | 12 | 1.25 s |
  | 10×10, K = 16, independent random restarts | 13 | 15 | 2.8 s |
  | My local-reshuffle walk (LNS), boards up to 10×10 | ≥ the required minimum, by construction | 9–16 | 0.03–1.3 s |

- **Recommendation:**
  - Keep their mandatory distinct layouts and shortfall reporting.
  - Add a **minimum layout distance** of `max(3, ⌈K/3⌉)` pieces. It can be relaxed with a visible notice.
  - Discover layouts with random restarts and/or my local reshuffling (LNS) instead of a single enumeration.

### R1-05: The witness solution is never persisted or exported. Severity: **major**

- **Section:** §3.1, §7.3, §12.2.
- **Problem:**
  1. After a reload, New Puzzle needs a fresh solution search. Their §7.3 says so. On large sets that can take minutes (see R1-02).
  2. Player import needs a bounded satisfiability check that can end inconclusive.
  3. The `witness-known` claim cannot be verified.
  4. Show-solution and hints have no cheap path.
- **Evidence:** §7.3: "After a reload, a set without a retained witness requires a fresh bounded solution search." First-solution times are in R1-02.
- **Recommendation:**
  - **Persist the reference tiling** in generator storage.
  - Include an **optional per-puzzle `solution`** in exports, on by default, with an "omit solutions" option for spoiler-free files.
  - With a solution present, import proves solvability in O(cells): no search, and never inconclusive.

### R1-06: The import validator enforces the generation policy. Severity: **major**

- **Section:** §3.3, validation step 5.
- **Problem:** Import rejects any set outside 10–18 pieces or outside `mixed-v1`. That excludes legitimate puzzles, such as the classic pentomino 6×10 board in a product named "Pentomino", and small children's sets. Any future policy change would also break old files.
- **Evidence:** In the classic set all 12 pieces have 5 cells, so it has 0 large pieces. `mixed-v1` requires ≥ ⌈0.2·12⌉ = 3, so the set is rejected.
- **Recommendation:**
  - Validate **game rules only**: connected, hole-free, pairwise-distinct pieces of ≥ 3 cells, area equal to the board, valid non-overlapping clues.
  - Keep `ruleSet` / generation policy as metadata. The generator enforces the policy; the player stays tolerant.

### R1-07: Cooperative yielding with `setTimeout(0)` about every 5 ms. Severity: minor

- **Section:** §10.1.
- **Problem:** The HTML Standard clamps nested timers to ≥ 4 ms after nesting level 5, and this applies in workers too. With 5 ms work slices, the worker is idle about 45 % of the time.
- **Evidence:** HTML Standard, *Timers*: "after five such nested timers … at least four milliseconds". MDN, `WorkerGlobalScope.setTimeout`.
- **Recommendation:** Make `terminate()` the cancellation mechanism; their design already uses it as the 250 ms fallback. Post progress messages from synchronous loops. If cooperative yielding stays, yield via `MessageChannel` with slices of ≥ 50 ms.

### R1-08: Symmetry is computed on raw board coordinates. Severity: minor

- **Section:** §5.2.
- **Problem:** A board with asymmetric blocked margins (for example a heart inside a wider frame) loses its real mirror symmetry. Mirror-duplicate puzzles then pass deduplication.
- **Recommendation:** Crop every board to its active bounding box when it is finalized (my `cropBoard`). Their definition and mine then coincide.

### R1-09: The `R` term largely duplicates `U`. Severity: minor

- **Section:** §8.1.
- **Problem:** Remaining area is roughly U × average piece size, so `0.1·R` mostly re-weights `U`. It also makes scores depend on board size without adding a separate signal.
- **Recommendation:** Drop `R`, or justify it with calibration data. Keep `H` (placement-choice bits): it is cheap, deterministic and informative.

### R1-10: Pieces with holes are not addressed. Severity: minor

- **Section:** §1.2, §7.2.
- **Problem:** Their availability counts include holed polyominoes (7: 108, 8: 369, …). Carving around a blocked board cell can produce a ring-shaped piece.
- **Recommendation:** Require hole-free pieces, as in my A5. Use the hole-free counts 107, 363, 1248 and 4460 for sizes 7–10.

### R1-11: Tap-to-place anchors the bounding-box corner. Severity: minor

- **Section:** §13.2.
- **Problem:** For pieces whose bounding-box corner is empty (L, T, …), the piece lands away from the tapped cell.
- **Recommendation:** Put a "handle" cell (the grabbed cell or the central cell) on the tapped cell. Show the ghost first and commit on the second tap, or on Enter.

### R1-12: Hand-off through storage tokens. Severity: minor

- **Section:** §12.1, §12.2.
- **Problem:**
  - Play depends on a localStorage write.
  - `#load=` links cannot be shared.
  - The token expiry and record caps add moving parts.
  - The uncompressed `#data=` fallback (≤ 8,192 characters) fits single puzzles but almost never a 10-puzzle pack.
- **Evidence:** Measured pack sizes: a 10-puzzle pack is 9–12 KB of JSON, which is about 12–16 k characters as base64. With the browser-native `CompressionStream('deflate-raw')` (no library needed), it is **≈ 2.0–2.5 k characters**. A single puzzle is ≈ 0.9–1.05 k characters.
- **Recommendation:** Make a **self-contained, compressed `#pack=` link** the primary Play and share path, with no tokens or expiry. Use storage only for the library and progress. Keep their storage hygiene rules: namespace, never touching other apps' keys, quota-safe writes.

### R1-13: Seeds must be 32 hex characters. Severity: minor

- **Section:** §10.3.
- **Problem:** Seeds are not user-friendly to type or share.
- **Recommendation:** Accept any text and hash it to 128 bits (for example with cyrb128). Store both the user's text and the canonical hex form.

**Shared limitation (not counted against either design): order sensitivity of the score.** The same
puzzle can get different scores depending on search order.

- Re-rating one puzzle under 6 different orders or seeds spread the score by a median of 5–6 points with their formula and 3–6 with mine.
- The level changed in 30–40 % of puzzles with their formula (15-wide bands) and 40–57 % with mine (10-wide bands).

The unified design should label levels as *estimates*, as their brief already does, and make the
canonical order part of the scoring-model version.

---

## 4. Side-by-side comparison

| Decision | architect-1 | architect-2 | Recommendation for unified design |
|---|---|---|---|
| **Difficulty formula** | `100·(0.5P + 0.3S + P(0.12U + 0.08F))`. S is the median of 3 seeded DLX runs, each capped at 10 k nodes. Solutions counted up to 20. Scale 0–100. | `2U + 0.1R + 4H + 8·log10(1+B)`. One canonical traversal, no node cap, 3 s / 2 M limit, otherwise "unrated". Open-ended scale. | **Hybrid.** A2's additive structure (U, H, log B) with one canonical traversal (simpler and cheaper; noise is comparable). Add A1's **node cap with saturation**: always rated, no wall-clock. Drop R. Uniqueness is a policy, not a score term. Recalibrate on reference boards. On identical puzzles the levels agree or are one apart in 26 of 27 groups, so either is defensible. |
| **Level bands** | 9 data-driven bands of 10 points. Hell-3 by splitting the top band. | Half-open bands 15 wide, plus a Hell-n formula. | Data table plus A2's Hell-n rule. Show each level's *recommended minimum board* (A1 `minCells`). |
| **Piece count vs. area** | 10–18 ∩ feasible range. Outside 10–18 allowed with a notice (small boards). 3-cell slack. | Hard 10–18. Feasibility DP. Nearest feasible count. | A2's DP and nearest-feasible rule with A1's slack. Generated sets use 10–18 (boards ≥ 46 cells). The player accepts any valid set (R1-06). |
| **Size balance** | Within ±2.5 of the mean size. | `mixed-v1` quotas. | **Adopt `mixed-v1`.** |
| **Board limits** | 3–20 per side. 12–144 cells. Disconnected boards allowed. | 1–20 per side. ≤ 180 cells. Connected only. | 3–20 per side. **≤ about 121 active cells** (R1-02). Connected only (A2). Crop to the active bounding box (R1-08). |
| **Uniqueness** | `prefer` by default from Normal up. `require` opt-in. Counted up to the stabilizer symmetry. | Optional, off by default. `require` opt-in. Raw count. | `require` opt-in. A cheap `prefer` tie-break among in-band candidates (A1). Raw counting (A2). |
| **Piece-set generation** | Carving: most-constrained cell, random growth. Measured budgets (6 k steps, 20 attempts). | Carving: 32 candidates per size, 200 restarts, 250 k expansions, quotas. | One algorithm (both agree). A1's measured budgets plus A2's quotas. Hole-free pieces (R1-10). |
| **Set acceptance** | Open score ≥ band minimum (≤ 4 re-rolls). | A calibration puzzle in the target band must be found. | **A2's calibration**, reused as puzzle #1. A1's open score shown as "reaches up to". |
| **1–10 distinct puzzles** | LNS pool with minimum distance. Falls back to reusing a layout with other clues. | Seeded enumeration. Distinct keys only. Shortfall instead of reuse. | Distinct layouts mandatory with shortfall (A2), **plus a minimum distance and restarts/LNS** (A1, R1-04). |
| **Pre-placed selection** | Move p up or down from a target, 4 random subsets per p, ≤ 32 ratings. `p = 0` allowed once. | Beam of 4 with add/remove/swap moves, ≤ 64 subsets. `1 ≤ G ≤ K−2`. | `1 ≤ G ≤ K−2` (A2). Move p up or down first, then swap moves. ≤ 32–64 ratings with capped cost. |
| **45° rotation** | Geometric rotation plus re-rasterization (new shapes). Lossless editing rule. Exact 90°. | View-only tilt. Exact logical 90°. | **User decision (Q1).** Default: A1 reshape. A2 tilt as optional cosmetic later. |
| **Hand-off** | Compressed self-contained `#pack=` link, plus localStorage library, plus file. | localStorage token `#load=`, uncompressed `#data=` fallback, plus file. | A1 compressed link as primary. A2 storage hygiene and revision checks. Files for archiving. |
| **Exchange format** | `pentomino-pack` v1. Board as row strings. Pose index `t`. Solution included. Unknown fields ignored. | `pentomino` v1. `kind`, `ruleSet`, blocked-cell list, `{turn, mirrored}`, provenance. No witness. Strict whitelist. | A2 envelope (`kind`, explicit pose, provenance, strict core fields plus an extensible `meta` object) with A1 board row strings and an **optional `solution`** (R1-05). Validate game rules only (R1-06). |
| **Player UX** | Drag with ghost. Tap selects, tap again rotates. Keyboard drag. Hints and show-solution in a later phase. Timer. | Drag with ghost. Select-then-tap-cell. Q/E/R/F keys. One pointer. No hints or timer in v1. | Drag plus **select-then-tap** with a handle-cell anchor (R1-11). One pointer. Hints and solution after v1, which the stored solution makes cheap. Timer optional. |
| **Workers and cancellation** | One worker. Cancel = `terminate()`. Node budgets. Watchdog. | Resumable jobs, `setTimeout` yielding, request id + revision, wall-clock deadlines, 250 ms terminate fallback. | Shared worker module in `core` (A2). Cancel = terminate (A1). **Revision checks** (A2). Node budgets with no time-dependent results (A1). |
| **Deployment** | Actions: test → assemble → deploy. Inline redirect. Deploy-time cache busting. | `redirect.js` + meta refresh + `.nojekyll`. Actions copy optional. | Actions with tests gating deploy (A1) plus **external `redirect.js`** (A2). |
| **Testing** | `node:test`. Golden pentomino counts. A000105 enumeration. Calibration script. Performance smoke tests. | `node:test`. Brute-force oracle. PRNG vectors. Storage and job tests. `/pentomino/` prefix browser matrix. | Union of both. Calibration report required before freezing the bands. |

---

## 5. Questions for the end user (genuinely blocking)

1. **What does "rotate the board 45°" mean?**
   - (a) **Reshape:** the board outline is rotated and redrawn on the same square grid. This creates new shapes such as diamonds. *Recommended.*
   - (b) **View tilt:** the whole board, cells and pieces are displayed at 45°, but the puzzle stays the same.
   - (c) Both.
2. **Difficulty ceiling on classic boards.** With pieces that are all different, a 6×10 or 5×12 board holds at most 12–13 pieces. Both designs therefore top out around **Expert/Master** on those boards; Nightmare and Hell need about 72–121 open cells. Is that acceptable? The alternative is to scale levels to each board, so that "Hell" on 6×10 means "hardest possible on 6×10" and is not comparable across board sizes.

---

*Measurement scripts (re-runnable, outside the repo): `…\files\proto\r2_a2score.mjs` (their formula,
reachability and rating cost), `r3_noise.mjs` (order sensitivity), `r4_layouts.mjs` / `r4b_layouts.mjs`
(layout diversity), `r5_example.mjs` (their example), `r6_big.mjs` / `r7_big2.mjs` (large boards).*
