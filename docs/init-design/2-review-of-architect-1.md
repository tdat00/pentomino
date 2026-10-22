# Cross-review of Architect 1 — Architect 2

**Phase 2 · 22 October 2026**

Reviewed: `1-design-brief-architect-1.md` (**B1**) and `1-design-detail-architect-1.md` (**D1**). Comparisons refer to my unchanged phase-1 detail, `1-design-detail-architect-2.md` (**D2**).

## 1. Summary verdict

**A strong implementation-oriented proposal, but several contracts need correction before consolidation.** Adopt its solution-first generation, LNS layout diversification, explicit transformation algebra, compressed sharing, and calibration infrastructure. Its empirical investigation is substantially stronger than my unbenchmarked generation defaults.

The main problems are not DLX itself: they are weaker-than-requested batch distinctness, unsupported reachability claims, inconsistent piece-count limits, coordinate-unsafe progress identity, and incorrect fallback evidence in hints. The prototype results are useful preliminary evidence, not yet validation of the final distinct-puzzle pipeline.

## 2. Strengths worth adopting

1. **Measured diversification rather than repeated global solving — D1 §8.5.4, “Random tilings with restarts,” and §8.7.2, “Tiling pool.”** Luby restarts and adjacency-based large-neighbourhood search address heavy tails directly. My proposal relies more heavily on ordinary enumeration. Adopt these as discovery strategies, while keeping scoring traversal independently specified and enforcing strict layout deduplication.

2. **Explicit orientation composition — D1 §8.1, “Coordinates, transforms and canonical forms.”** The eight-transform table and screen-horizontal/vertical flip composition are clearer than my single mirror-toggle interaction. They are immediately useful as cross-platform geometry tests.

3. **Reversible editor provenance — D1 §8.2.3, “Lossless editing rule.”** Keeping a source mask and accumulating an angle avoids repeated rasterization drift. If the user wants 45° rotation to create a new mask, this is more directly responsive than my view-only interpretation. Adopt it with an explicit area-changing operation and preview.

4. **Portable sharing — D1 §12.2, “Share code.”** Versioned compressed/uncompressed codes offer better cross-device convenience than my default local-storage token. Retain file import/export and add explicit encoded-length and decoding limits; representative small links are not universal size guarantees.

5. **Useful verification scaffolding — D1 §15 and Appendix A.** Free-polyomino enumeration, known pentomino solution counts, a headless generator, and a repeatable calibration command are excellent additions to my smaller fixture strategy. Preserve the prototype configurations/seeds when turning these into repository tests; do not claim independent browser performance from Node measurements.

6. **Well-developed player details — D1 §§13.3–13.9.** Grabbed-cell preservation, touch lift, paused timers, undoable actions, outlines, and fixed-piece hatching are concrete and useful. Keep the accessible buttons/keyboard path; defer the riskier hint and multi-gesture complexity until the basic player is reliable.

## 3. Issues and recommendations

### R2-01 — A batch can meet its requested count without new arrangements

- **Severity:** major
- **Section:** D1 A8; §8.7.2, “Tiling pool”; §8.7.3; §16 item 6.
- **Problem:** Different complete arrangements are only a SHOULD. When the pool is short, the algorithm deliberately reuses a tiling with different fixed subsets, although the requirement asks for new puzzles by changing the arrangement of the same pieces.
- **Evidence:** The pool pseudocode explicitly returns a short pool so that “puzzles reuse tilings with different fixed sets”; the batch indexes it modulo its length. With one layout, ten clue subsets can become ten returned puzzles without a second arrangement. N-ARRANGE discloses this, but does not make it satisfy the stronger arrangement requirement.
- **Recommendation:** Count only puzzles whose full-layout key and visible-clue key are both new, modulo board symmetry. Relax the preferred distance threshold to one if needed, never to zero. Return a partial batch when necessary. Clue-only variants can be a separately labeled future feature, not replacements counted toward this request.

### R2-02 — The open score is not an upper bound on achievable difficulty

- **Severity:** major
- **Section:** D1 §8.4.3, “Finalization and set-level acceptance”; §9.6; §11.7 N-REACH; B1 §§3 and 6.
- **Problem:** The design acknowledges non-monotonicity, but still tells users that an open score determines the hardest reachable level and uses it to guide set acceptance.
- **Evidence:** D1 Appendix A.4 reports a 6×10, 12-piece set with **open score 52**, yet **7/10 Master puzzles**, which must score at least 55. Its own data therefore disproves “reaches at most Expert.” The formula also permits a lower piece-count term to be outweighed by increased uniqueness or search effort.
- **Recommendation:** Display the open score as “unclued benchmark,” not a ceiling. Require at least one actually rated target-band clue configuration before advertising that a set supports a requested level, as in D2 §7.3. A failed bounded search means “not found,” not “cannot reach.” Retain stochastic subset exploration rather than relying on monotonicity in clue count.

### R2-03 — Piece-count feasibility, performance preferences, and application limits conflict

- **Severity:** major
- **Section:** D1 A3–A4; §§6.7, 7.3, 8.3; §13.9.
- **Problem:** The fallback range can exceed the proposed format and palette capacities. Separately, a carving-speed allowance is embedded in a function presented as the feasible maximum.
- **Evidence:** Evaluating the published equations:

  | Configuration | Published result | Consequence |
  |---|---|---|
  | 144 active cells, advanced `maxPieceSize = 6` | `kMinHard = 24`, `kMax = 28`; fallback range **24–28** | Auto Hell-2 selects 28 pieces. Import permits at most 26; the palette has 20; IDs require single letters. |
  | 41 active cells | Ten distinct pieces have minimum area 41, but slack-based `kMax = 9` | A mathematically possible count is excluded even from the advanced override. |
  | 81 active cells | Eighteen distinct pieces have minimum area 81, but slack-based `kMax = 17` | Appendix A.2 itself demonstrates 18-piece carving at this area. |

- **Recommendation:** Define separate **hard feasible counts**, **supported product counts**, and **fast preferred counts**. Intersect hard feasibility with one consistent product cap before selecting a count; incompatible maximum-size settings should explain the conflict. Make the three-cell slack a preference, not a mathematical limit. Also state an explicit size-balance policy: clustering around the mean is not a quantified guarantee against too many small pieces. My 40%/20% quotas are one proposal, not a universal mathematical requirement.

### R2-04 — Symmetry-normalized puzzle IDs are unsafe progress keys

- **Severity:** major
- **Section:** D1 §§7.1, 8.6, 12.3 and 13.8.
- **Problem:** `puzzle.id` hashes a clue key that deliberately identifies board-symmetric positions, but saved moves use exact coordinates. Restoring those coordinates into another representative can overlap its clues. This is not merely a possible 32-bit hash collision.
- **Evidence:** Using the valid 10-piece fixture in D2 §3.2:
  - Original clues are A at `(0,0)` and J at `(8,1)`, in their documented orientations.
  - Reflect every clue footprint horizontally across the 10×6 board.
  - Both puzzles have the same D1 symmetry-normalized `puzzleKey`, and therefore the same proposed ID.
  - The original, legal placement of I overlaps the reflected A clue at **`(8,0)` and `(9,0)`**.
  
  An independent in-memory check confirmed key equality and these overlaps.
- **Recommendation:** Separate equivalence keys used for deduplication from save identities. Fingerprint exact board coordinates, piece-ID-to-source-cell mappings, and exact clue footprints; do not quotient these by board symmetry. Alternatively store and apply a rigorously specified coordinate transport, which is unnecessary complexity for v1. Revalidate restored progress before committing it. A wider hash alone does not fix the semantic collision.

### R2-05 — Hint fallback can blame a correctly placed piece

- **Severity:** major
- **Section:** D1 §13.10, “Hints and Show solution.”
- **Problem:** Failure to find a repairing removal among six recent pieces does not prove the most recent piece is wrong. Likewise, an empty target from the stored solution is not a proved continuation after a solver timeout.
- **Evidence:** An exhaustive small remaining-inventory search on D2 §3.2’s fixture found this concrete state:

  ```text
  Fixed clue: A at its documented reference position.
  First player move: B with t=1, x=1, y=0 (D1 transform convention).
  Next six moves: E, F, G, H, I, J at their reference positions.
  Still unplaced: C and D.
  ```

  All placed pieces are non-overlapping. The state has no completion. Removing **any one of E–J** still leaves no completion; removing B restores a completion. The independent remaining-piece oracle exhausted each failed check in **0–2 row trials**, so this is not a timeout artifact. D1’s six-removal limit therefore reaches the fallback and blames J, although J is reference-correct and removing it does not repair the state.
- **Recommendation:** Return “No repair identified within this check” instead of assigning an unproved culprit. Distinguish a proved compatible placement, a proved repairing removal, and an inconclusive search. Do not offer a timeout fallback as a solution-preserving hint unless it is verified. Deferring hints from MVP, as my proposal does, is preferable to false guidance.

### R2-06 — The cards have no truthful display for inconclusive multiplicity

- **Severity:** major
- **Section:** D1 §§9.2–9.3, 11.5 and §16 item 10.
- **Problem:** The solver explicitly permits an incomplete count with zero or one discovered solution, but cards offer only “unique” or “2+ solutions.”
- **Evidence:** The defined case `exact = false, s <= 1` receives `U = 0.5` and may be accepted in `any` or `prefer` mode. Neither of the two card labels follows from that evidence.
- **Recommendation:** Define explicit `unique`, `multiple`, and `not proved` states, plus a separate unsatisfiable outcome when exhausted with zero solutions. Clarify whether uniqueness is coordinate-level or only up to the clue stabilizer; label the latter explicitly. Keep the score’s bounded estimate separate from a mathematical certificate, and distinguish imported claims from runtime verification.

### R2-07 — The final high-tier, distinct-batch policy has not been calibrated

- **Severity:** major
- **Section:** D1 §§9.4, 9.8–9.9; Appendices A.3–A.4.
- **Problem:** The strongest Hell-2 result comes from a batch the document correctly admits was invalid for distinctness. The replacement policy materially changes the available score range. Some supporting distributions also use different profiling caps.
- **Evidence:**
  - Appendix A.4’s Hell-2 “10/10” has **ten identical zero-clue puzzles**.
  - Appendix A.3 used first/count caps **20,000/100,000**, not v1’s **10,000/25,000**.
  - For a puzzle with at least 20 discovered solution classes, `U=0`. Even granting maximum search contribution `S=1`, the formula gives:

    | Free pieces | Orientation assumption | Maximum rounded score |
    |---:|---|---:|
    | 18 | All have 8 orientations | 88 |
    | 17 | All have 8 orientations | 85 |
    | 17 | Sixteen have 8; one has 4 | 84 |
    | 16 | All have 8 orientations | 81 |

  Thus, with an 18-piece set and at least one clue, a common many-solution case only just reaches Hell-2 if all 17 remaining pieces have eight orientations. This does **not** prove Hell-2 impossible: fewer solutions or inconclusive counting can increase its uniqueness term. It does invalidate treating the old duplicate-batch result as confirmation.
- **Recommendation:** Re-run the final pipeline with final budgets, actual distinctness, and the chosen minimum clue count. Report requested/accepted counts, in-band rate, unknown-count rate, and elapsed time for fixed seeds. Freeze bands only after this exercise. Preserve prototype source/configuration as implementation fixtures; the present review does not independently reproduce its performance claims.

### R2-08 — The first deployment depends on a phase-8 tool

- **Severity:** major
- **Section:** D1 §14.4, “Workflow”; §19 tasks T0.4 and T8.6.
- **Problem:** The foundation milestone promises a green deployed skeleton, but its workflow unconditionally invokes a tool deferred until phase 8.
- **Evidence:** `node tools/stamp-version.mjs _site ...` is unconditional in the proposed workflow; T8.6 introduces that script. Following the listed phases literally leaves the command unavailable at T0.4.
- **Recommendation:** Implement a minimal stamping tool in the foundation phase, or omit/guard that workflow step until the tool exists. Keep a complete deployed-module smoke test when introducing cache stamping; rewriting the entry module alone does not cover the module graph.

### R2-09 — Root redirect conflicts with the stated CSP

- **Severity:** minor
- **Section:** D1 §12.5, “Security and robustness,” and §14.2, “Root redirect.”
- **Problem:** The “each HTML page” CSP uses `script-src 'self'`, while the root redirect is an inline script.
- **Evidence:** That policy does not authorize inline scripts. Meta refresh still provides a basic redirect, but the advertised history-replacing, query/hash-preserving JavaScript path would be blocked.
- **Recommendation:** Use an external same-origin redirect module, as in D2 §14.1. Do not loosen the site policy to `unsafe-inline` for this convenience.

### R2-10 — Version validation admits undefined formats

- **Severity:** minor
- **Section:** D1 §7.3 item 1 and §7.4.
- **Problem:** “Integer ≤ FORMAT_VERSION” accepts zero and negative versions, although no such schema or migration is defined.
- **Evidence:** Both `version = 0` and `version = -1` satisfy the proposed predicate for version 1.
- **Recommendation:** Accept only the explicitly supported version set, currently `{1}`. Later add named migrations for specific known older versions; reject undefined versions rather than interpreting them as v1.

## 4. Side-by-side comparison and proposed direction

| Decision | Architect 2: my phase-1 design | Architect 1 | Recommendation for unification |
|---|---|---|---|
| Difficulty formula | `round(2u + 0.1a + 4h + 8log10(1+b))`: remaining pieces, cells, placement-choice bits, canonical branching trials; complete profile required. | `round(100(0.50P + 0.30S + P(0.12U + 0.08F)))`: free-piece fraction, three-run median capped search, uniqueness estimate, orientation freedom. | Keep one versioned formula. My geometric-choice terms avoid conflating uniqueness with difficulty; their bounded multi-run estimator is less vulnerable to one lucky traversal and merits testing. Select final weights from final-pipeline calibration, not either proposal’s assertions. Capped evidence must be explicitly marked. |
| Level bands | Very Easy `<20`; then 15-point intervals through Nightmare; Hell-1 starts at 110, with a continuing 15-point ladder. | 0–14, 15–24, …, 75–84; Hell-2 85–100. Further tiers split the top interval. | Prefer stable additive tiers over relabeling existing bands. Offer only demonstrably supported tiers; version any score/band change. Neither proposed calibration is sufficient to freeze the final numbers. |
| Piece count versus area | Hard 10–18; explicit 40% small / 20% large quotas; 60 cells permit at most 12 under those quotas; connected masks, ≤180 cells. | Recommended 10–18 with smaller/larger fallbacks; mean-based size planning; 60 cells permit 13; disconnected masks allowed, ≤144 cells. | Separate mathematical feasibility, balance policy, supported range, and performance preference. Use a shared histogram DP and consistent caps. Their support for disconnected regions is a useful extension if globally validated; my area bounds must not be mistaken for universal limits independent of quotas. |
| Uniqueness | Off by default; optional required raw coordinate-unique proof; any legal completion wins. | Prefer from Normal upward; optional require; uniqueness modulo the fixed-clue stabilizer. | Default any-valid, optional proven unique. Prefer raw-coordinate uniqueness for the plain “unique” label; explicitly name symmetry-class uniqueness if retained. Always represent unknown. |
| Piece-set generation | Connected partition-first; accept after a target-band clue calibration; optional unclued benchmark. | Solution-first carving with residual-area pruning, size clustering, hole-free pieces, four rerolls favoring open score. | Combine their carving/pruning detail with actual target-band calibration. Hole-free generation is a reasonable usability default, provided the rule is explicit. Do not use open score as a maximum. |
| 1–10 distinct puzzles | Different full-layout keys **and** clue keys; return fewer rather than reuse arrangements. | LNS and restart pool; large preferred distance; reuse layouts with new clues if short. | Adopt LNS/restarts, retain strict new-layout acceptance and partial results. Large distance is a preference, never a reason to fabricate quantity. |
| Pre-placed selection | At least one fixed and two movable pieces; bounded beam over additions/removals/swaps; optional counterexample-guided uniqueness. | Clue-count adjustment with four random subsets per count; zero-clue puzzle allowed once; smallest-disagreement clue first for uniqueness. | Start with their inexpensive sampling, then bounded swaps/beam when needed. Default to at least one clue; an open-board free-play option should be separately labeled. Never infer score monotonicity. |
| 45° rotation | View-only lattice rotation; exact optional 90° mask rotation. | Rotate and resample the mask; source-plus-angle history; edit bakes the result. | Their approach better creates genuinely new logical masks. Recommend an explicitly named **Rotate & regrid** editor operation with preview, changed-area notice, and undo. Do not silently delete small regions. Keep exact 90° geometry and distinguish any cosmetic rotation. User confirmation of this interpretation is needed. |
| Hand-off | Local token; short uncompressed fragment fallback; portable JSON files. | Compressed self-contained links by default, uncompressed fallback, shared library, files. | Prefer bounded portable links when supported, local tokens for oversized same-browser Play, and file export for durable sharing. Feature-detect decoding as well as encoding; enforce limits during decompression. |
| Player UX | Transactional preview/commit, keyboard and select-then-tap, immutable clues, undo; hints deferred. | Rich drag/keyboard/touch interactions, pivot kicks, timer, hints, reveal, recent packs. | Adopt their transform algebra and rendering/accessibility detail. Keep committed state unchanged during preview. Deliver basic play first; fix R2-05 before adding diagnostic hints. |
| Saved progress | Exact-coordinate content fingerprint with source-cell/ID binding and move revalidation. | 32-bit hash of symmetry-normalized puzzle key; progress loaded by public ID. | Use the exact-coordinate identity. Deduplication equivalence is not persistence identity. |
| Deployment | Relative native modules, external redirect, no build, optional Actions packaging; no initial service worker. | Relative native modules, explicit Actions workflow, deploy-copy cache stamping. | Adopt explicit packaging and eventual graph-wide cache stamping, fixing the phase dependency and CSP mismatch. Test the `/pentomino/` prefix. |
| Testing | Exact fixture, invariant/property loops, small independent solver oracle, deterministic limits, malformed/partial-state tests. | Adds full polyomino enumeration, classic pentomino golden counts, headless CLI, calibration/throughput evidence. | Combine both. Their mathematical goldens and calibration tooling are better; add my cutoff-status, raw-uniqueness, stale-result, strict-layout, and progress-identity regressions. Keep wall-clock smoke tests out of correctness assertions. |

## 5. End-user decisions genuinely needed

1. **What should the 45° board button mean?** A cosmetic rotation preserving every cell, or a new stair-stepped mask whose area can change? I now favor Architect 1’s operation when explicitly labeled **Rotate & regrid**, with preview and undo. For example, the specified 6×10 operation changes **60 to 68 active cells**; it must not be presented as area-preserving.

2. **May small boards use fewer than ten pieces?** Architect 1 explicitly relaxes the recommended range; my proposal rejects such boards. Recommend a strict 10–18 default, with a separately approved small-board mode if desired. Counts above 18 should not appear merely because an advanced size cap makes the normal range infeasible.

Uniqueness defaults, hints, palette details, and exact search budgets can take the engineering defaults above; they do not need to block consolidation with more questions.

## Evidence scope

Independent checks ran **in memory**, without creating application code or modifying either phase-1 document:

- Recomputed D1’s three worked scores: **12, 28, 81** — all correct.
- Reproduced the 45° rectangle example: **12×12 bounding box, 68 active cells** — correct.
- Evaluated the count-policy counterexamples and high-tier score envelopes.
- Verified the progress-key overlap and the hint counterexample with exhaustive remaining-piece searches using D2’s published valid fixture.

Fixture letters are retained from D2 for readability. Applying D1’s size/canonical-order ID renaming preserves these counterexamples; all fixture pieces are also hole-free.

No browser benchmark, full generation benchmark, or execution of Architect 1’s unpublished prototype is claimed.
