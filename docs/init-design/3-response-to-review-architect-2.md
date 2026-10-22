# Response to Architect 1’s review — Architect 2

**Phase 3 · 22 October 2026**

Responding to `2-review-of-architect-2.md`. The end user’s latest correction supersedes the earlier orchestrator instruction: **all board rotations are presentation-only; Rotate & regrid is excluded**. The new piece-count/difficulty addendum will be resolved in Phase 5. Neither earlier design’s count rules, size quotas, board caps, nor difficulty ceilings are settled by this response.

## Responses

### R1-01 — Reject

The interpretation objection is superseded by the explicit user clarification, not by a disagreement about the reviewer’s rasterization algorithm. The logical **M×N matrix and blocked cells remain unchanged at every view angle**, including 90°. Remove the proposed regridding operation and the separate logical-mask rotation control from v1.

The presentation contract should explicitly cover:

- **Angle:** `presentation.rotation` is 0–315° in 45° steps, independent of piece poses. Define positive presentation angles as counterclockwise; SVG’s y-down rendering therefore uses the negative angle. Solver input, logical placement validation, scoring, and game identity ignore it; the loader still checks that the presentation value is supported.
- **Heart preset:** store an M×N mask with a blocked top-right region and `rotation: 45`. A symmetric default uses an even square matrix with the top-right quadrant disabled. Counterclockwise 45° moves that notch to the top, producing the intended angular heart. No resampling changes its cells.
- **Hit-testing:** transform client coordinates through the inverse board-group matrix before cell lookup. Ghosts, snapping, and the grabbed-cell anchor use logical coordinates.
- **Tray:** render tray pieces and the placement ghost with the same view angle as the board, keeping labels upright. Picking up a piece must not introduce an apparent extra 45° game rotation.
- **Viewport:** the full-frame rotated extents are `|M cos θ| + |N sin θ|` by `|M sin θ| + |N cos θ|`. Fit visible active-cell bounds more tightly when useful, without changing logical coordinates; provide zoom/pan when cells become too small. In the player, exterior blocked regions are transparent so the Heart outline is visible; the editor may show the matrix as a guide.
- **Keyboard:** arrows move along logical rows/columns; Q/E rotate pieces by logical quarter-turns. F reflects the currently oriented footprint across a board-grid axis, not an unstated screen axis. Label the axis in the controls. Piece poses never acquire 45° orientations.

These rules apply equally to generator previews and player rendering.

### R1-02 — Deferred to Phase 5

The addendum supersedes the assumptions behind both proposed board caps. Do not adopt the reviewer’s approximately 121-cell cap or preserve my 180-cell cap as a settled limit. The measurements remain useful evidence for their tested inventories, not a general limit for the forthcoming board/count policy.

### R1-03 — Partially accept

The claim that my design has **no work cap** is inaccurate: my detail §10.2 specifies 2,000,000 row trials per standard traversal and 10,000,000 for the extended preset. Time is not a score term. However, the criticism of device-dependent completion and expensive rejected profiles is valid.

Adopt a fixed-work-budget profiler with explicit **completed versus budget-censored** metrics; a censored estimate must not masquerade as a completed first-solution measurement or a solvability proof. Keep wall time only as an external job watchdog. Watchdog/cancellation interruptions remain incomplete, so “always rated on every device” is still too strong. The numerical profiling cap, saturation rule, weights, and tier calibration belong to Phase 5.

### R1-04 — Accept

Two-piece differences are genuinely distinct but can feel repetitive. Adopt random restarts and LNS, with the proposed distance target as a **preference that may be visibly relaxed**. Full-layout and clue-key distinctness remain mandatory. Never relax into reusing an arrangement to fill the requested quantity; return a partial batch instead.

### R1-05 — Accept

Persist the generator’s reference tiling and revalidate it on restoration. Allow a witness in standalone piece-set exports and an optional per-puzzle `solution` in puzzle packs, included by default with an explicit **Omit solutions** export option.

A valid full cover agreeing with every clue proves existence without search; it does **not** prove uniqueness. Files without a witness remain supported, with unproved solvability clearly distinguished. Every legal completion still wins. Stored answers do not justify unverified hint fallbacks.

### R1-06 — Partially accept

Accept separating **generation preferences** from **playable puzzle validity**. The classic-set counterexample demonstrates the mistake in enforcing `mixed-v1` quotas on import.

However, gameplay semantics cannot all become ignorable metadata: the player must understand the grid, placement transforms, allowed moves, and schema version. Keep a normative supported game-rules identifier; put generation policy and provenance in separate metadata. Count/size/resource limits and compatibility with the new policy are **deferred to Phase 5**. Hole-free generation is also not automatically a universal import restriction; see R1-10.

### R1-07 — Accept

Replace repeated short `setTimeout(0)` slices with **worker termination as the primary cancellation mechanism**, followed by lazy replacement. This avoids timer-clamping overhead and simplifies cancellation.

Keep deterministic work budgets, progress messages, a main-thread watchdog, request/revision checks, and already accepted results. Cooperative scheduling can be introduced later if measured needs justify it; it should not impose a timer delay after every tiny work slice.

### R1-08 — Partially accept

Accept using an active-bounding-box-normalized copy to discover genuine shape symmetries. Do **not** silently crop the user’s stored M×N board or reinterpret existing placements.

Carry offsets between the normalized analysis copy and original coordinates. Deduplication may ignore irrelevant blocked margins; coordinate-specific saved progress must still bind to the exact stored board, source piece cells, IDs, and clues. This resolves the symmetry issue without changing the display-only rotation contract.

### R1-09 — Deferred to Phase 5

The new addendum explicitly makes difficulty depend on board size. Whether remaining area supplies useful information beyond remaining-piece count now needs evaluation with that policy. Correlation alone does not prove redundancy. Neither retaining `0.1R` nor dropping it is settled; perform the ablation during the common formula’s recalibration.

### R1-10 — Partially accept

Accept making the policy explicit and preferring **hole-free generated pieces**. The generator’s catalogue availability and its padded-complement hole test must agree.

Reject treating a hole as intrinsically invalid gameplay: a connected piece surrounding a blocked cell can be a legal exact-cover placement. Compatible imports should be validated against the supported game rules, not rejected solely because the generator would not sample them. Numerical size/balance policy remains for Phase 5.

### R1-11 — Accept

Use a highlighted **occupied handle cell**, not an empty bounding-box corner. Preserve the actual grabbed cell during drag; for tap placement use a deterministic occupied default handle. The first board tap previews its placement, and a second tap, Place button, or Enter commits it.

Apply this after inverse view transformation, so rotated boards behave consistently. Keep one active piece-manipulation pointer and explicit rotation/flip buttons.

### R1-12 — Partially accept

Adopt compressed, self-contained links as the primary Play/share path, with codec feature detection and explicit encoded/decoded limits. Representative 2–2.5k-character packs are not an upper bound, especially under the forthcoming addendum.

Retain JSON files as the durable fallback. An optional **local-library reference** may support oversized same-browser Play, clearly marked nonportable; it need not introduce a separate expiring-token system. Storage is not a prerequisite for normal compressed-link play. Enforce decompression limits while decoding, not only after allocating the result.

### R1-13 — Accept

Accept bounded text seeds and retain both the original text and derived 128-bit canonical seed. Version the text-to-seed mapping, specify Unicode/case handling and zero-state treatment, and test fixed vectors. The PRNG still receives a canonical state; user-friendly input need not weaken reproducibility.

## Proposed unified positions

- **Architecture:** two static ES-module applications sharing DOM-free core rules and algorithms; no mandatory JavaScript build.
- **Board and rotation:** preserve the M×N mask; presentation-only 45° steps in both apps, inverse-transform hit-testing, aligned tray previews, and the blocked-top-right Heart preset described above.
- **Counts, balance, and board limits:** **Phase 5** owns the superseding policy, supported resources, maximum piece sizes, and board-dependent difficulty ceilings; do not freeze legacy limits or quotas.
- **Difficulty and bands:** one versioned, deterministic fixed-work-budget estimate with explicit censoring; formula terms, numerical caps, bands, and reachability are calibrated in Phase 5.
- **Uniqueness:** optional required raw-coordinate proof; unknown is a distinct outcome, not “multiple.” A cheap preference tie-break is acceptable; uniqueness is not itself a difficulty bonus.
- **Piece sets:** construct a tiling first, validate it independently, prefer hole-free generated shapes, and persist the witness.
- **Set acceptance:** demonstrate a target-band calibration puzzle; the open score is only an **unclued benchmark**, never a ceiling. Architect 1’s Appendix A.4 already shows open score 52 with Master puzzles scoring at least 55.
- **Distinct batches:** LNS/restarts plus mandatory new layout and clue keys, a soft distance target, streamed accepted results, and honest partial batches.
- **Pre-placed pieces:** retain at least one locked clue and two movable pieces; begin with count-guided sampling, then bounded swaps/beam search without assuming score monotonicity.
- **Exchange:** versioned `kind` envelope, explicit poses, board row strings, understood gameplay rules, separate generation metadata, optional validated witness, and bounded extensibility.
- **Hand-off:** portable compressed links first; files for durability and oversized transfers; optional nonportable local-library references.
- **Player:** any legal completion wins; transactional drag/preview, handle-cell tap placement, grid-relative controls, one manipulation pointer, and undo/redo. Hints/reveal follow the reliable basic player.
- **Persistence:** validate restored witnesses and moves; use exact-coordinate content fingerprints for progress, separate from symmetry-normalized duplicate keys.
- **Workers:** hard cancellation, main-thread watchdog, bounded work, request/revision checks, and preservation of previously accepted results.
- **Seeds:** text input mapped reproducibly to canonical state; version both seed derivation and PRNG, and preserve request provenance.
- **Deployment:** relative paths under `/pentomino/`, an external CSP-compatible redirect, and test-gated static packaging whose tools exist at the phase that invokes them.
- **Testing:** combine enumeration/golden solver counts with independent oracles, seed vectors, malformed/censored-result tests, all eight display angles, storage/cancellation regressions, and prefixed-host browser checks.

No further user decision is requested in this phase. The rotation clarification is settled; the numerical policy work is explicitly reserved for Phase 5.
