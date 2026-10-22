# Addendum cross-review — Architect 2

**Phase 6 · 22 October 2026**

Reviewed `5-addendum-study-architect-1.md`, the final `4-design-detail.md`, and Architect 1’s subsequent `6-review-of-architect-2.md`. The latter already withdraws several earlier positions; this review distinguishes resolved disagreements from remaining qualification gaps.

## 1. Verdict

**The designs can converge without weakening “different arrangements.”** Adopt constructive macro carving, strict layout/clue deduplication, Architect 1’s simpler bounded score and geometric bands, and lazy certificates.

I accept **576 cells as a provisional standard design ceiling**, with **484 as the initial desktop release limit until the new pipeline is qualified**, and **577–676 opt-in only after browser qualification**. Neither study proves that 576 or 676 meets every browser requirement. My earlier 676-cell recommendation did not adequately test the large-piece, low-clue Hell-1 regime under the newly proposed score.

The strongest disagreement is resolved: large-piece rigidity is a property of the sampled carving distribution, not an area/mean-size impossibility. Both architects have now reproduced genuinely different layouts from structured sets.

## 2. Agreement

- Display rotation is presentation-only; area counts active cells.
- Piece counts and size windows must scale; the old 10–18 and ten-cell-size assumptions are gone.
- One deterministic score; uniqueness is a separate certificate.
- Calibration puzzle #1 establishes that a set supports the requested band.
- Four workers, deterministic acceptance order, stored witnesses, buffer reuse, and worker recycling.
- Any valid completion wins; timeouts and unproved uniqueness remain explicit.
- Browser factors and human difficulty labels still require validation.
- The latest peer review accepts macro carving, strict layouts, and **37–42 pieces for 360-cell Hell-1**, including 41.

## 3. Divergences and reproduction

### Method and completed evidence

I recovered my archived prototype from the persistent session transcript and verified its SHA-256:

`d5ed95201d897551bd833087454ff81efb4d8e436811e41047fdb21dd0208df1`

The controlled replay used Architect 1’s Phase-5 size spread, 40% small-piece cap, score/bands, **5,000 branch / 50,000 row** rating caps, and 5,000-row LNS searches. Each run used a **fresh Node process**, four workers, `--max-old-space-size=2048`, and 256 MiB old-generation limits per worker on the same EPYC host. It retained my carving implementation, xoshiro RNG, reusable buffers, bounded clue sampler, and **strict distinct-layout acceptance**. Certificates were not on the acceptance path.

Thus this is a controlled cross-prototype reproduction, not a replay of Architect 1’s exact seeds or entire implementation. **Nine completed runs were captured** before the experiment was stopped at the orchestrator’s request. The planned 484/676-cell comparisons and a 60-cell Nightmare diagnostic were **not completed**. No new p95 or large-board memory claim is inferred from these runs.

| Configuration | Seeds | Result | Set + ten / return time, Node | Peak RSS | Clues / A1 score |
|---|---:|---|---:|---:|---|
| 60 cells, K=8, flat carving | 2 | One puzzle each; no second layout found within the bounded search | 0.26–1.21 s, partial | 138 MiB | G=4; D=8 |
| 60 cells, K=8, macro carving | 2 | **10 distinct layouts and clue keys in both runs** | **0.082–0.103 s** | 125 MiB | G=4–5; D=8–10 |
| 360 cells, K=17, macro carving | 2 | **10/10 in both runs** | **0.294–0.319 s** | 285 MiB | G=6–9; D=18–24 |
| 360 cells, K=37, macro carving | 2 | **10/10 in both runs** | **4.20–4.60 s** | 369 MiB | G=2; D=100 |
| 360 cells, K=41, macro carving | 1 | **10/10** | **3.58 s** | 391 MiB | G=2; D=108 |

Accepted model sizes in these runs were below 0.70 million nonzeros; the 1.6-million-node guard was retained. Minimum full-layout distances were 2–6 pieces. The results establish feasibility, not broad sampling quality or a production success probability.

### D6-01 — Rigidity and clue-only variants

**Their Phase-5 claim:** 26/28 sampled sets with mean piece size ≥7.5 had one layout class, motivating clue-only variants. Their latest review accepts the macro alternative.

**My claim:** flat carving often produces rigid sets, but a different constructive distribution can satisfy the original requirement without increasing K.

**Reproduction:** at the same 60-cell/K=8 setting, flat carving returned one puzzle while macro carving returned ten. At 360/K=17, mean size **21.18**, macro carving also returned ten. This agrees with the peer’s independent macro reproduction.

**Unified decision:** use macro carving when mean size ≥6.5, with global shape-key exclusion; use flat carving otherwise or as a bounded fallback. Keep both a new layout key and a new clue key mandatory. Return partial results when necessary.

The Phase-5 exhaustive-count table covers boards only up to 144 cells; a failed bounded LNS search on 360 cells does not prove uniqueness there. Neither author should generalize those samples into an impossibility theorem.

Macro boundaries remain invisible and are not gameplay constraints. Their effect on perceived difficulty needs playtesting. Near-duplicate layouts remain possible; a minimum distance of two is a relaxation, not evidence of wide diversity.

### D6-02 — 360-cell Hell-1: 34–39 versus 41 pieces

**Their earlier claim:** reduce K to 34–39 because 40–42 is too close to the band ceiling and slow. Their latest proposal withdraws this and permits **37–42**.

**My claim:** 41 is feasible; distribution and batch rules, not that count alone, caused the earlier failure.

**Reproduction:** K=37 produced ten strict puzzles in 4.20–4.60 s; K=41 produced ten in 3.58 s. The single K=41 result does **not** establish that it is generally faster, but it disproves a mandatory reduction.

Arithmetic under their score:

| K / G | U | Maximum rounded D | Classification |
|---|---:|---:|---|
| 40 / 1 | 39 | 108 | Hell-1 |
| 41 / 1 | 40 | 110 | Hell-1 |
| 42 / 1 | 41 | 112 | Hell-2 |
| 42 / 2 | 40 | 110 | Hell-1 |

**Unified decision:** accept **37–42**, with **41 preferred** where feasible. Initial Hell-1 clues at 10% are reasonable; search still determines the final subset. The completed replay used the earlier 6% proposal, so the revised share is not newly timed here.

### D6-03 — Score, bands, and saturation

**Their claim:** `round(2U + 8 log10(1+B̂))`, geometric bands, and saturated `B̂`.

**My Phase-5 claim:** also include remaining area and placement-choice entropy.

**Reproduction:** re-scoring exactly the completed A1-profile puzzles with my coefficients gives:

| Generated target | A1 score | My score on the same profile |
|---|---:|---:|
| 60 / K8 Easy | 8–10 | 18–34 |
| 360 / K17 Hard | 18–24 | 58–79 |
| 360 / K37 Hell-1 | 100 | 175–176 |
| 360 / K41 Hell-1 | 108 | 184–185 |

This demonstrates a genuine policy difference: my model needs more clues to keep large-board puzzles in lower bands. It does **not** prove human “over-rating”: these candidates were selected using A1’s score, and neither study contains human solving data.

**Unified decision:** adopt the simpler model and geometric bands for the initial release; retain R, H, actual counters, stop reason, and saturation as diagnostics. This better matches the intended few-clue high-level experience and is easier to explain.

“Exact by definition” means exact output of the chosen bounded estimator, **not** exact human difficulty or completed first-solution cost. At the row cap, actual B may be below 5,000; store actual B separately from the effective saturated value. A wall-clock interruption does not produce a completed profile.

Because even B=0 gives D=2U, many forced placements can receive a high band. Both studies need a forced-placement playtest fixture; this is a workload estimator until human validation says otherwise.

Also correct the “Nightmare is unreachable on 60 cells” wording: **K=13, G=1, saturated B gives D=54**, while Nightmare begins at 53. The menu may deliberately stop at Master; that is a supported-preset policy, not a mathematical score ceiling. The planned executable diagnostic was stopped; this particular result is arithmetic, not a claimed generated example.

### D6-04 — Piece-count windows and size balance

**Their Phase-5 claim:** power-law K centres, 40% small pieces, mean ≥4.5, and a spread around the mean. My proposal used 30%, proportional bounds, and full histogram checks.

**Reproduction:** the old size spread makes **484 cells / K=80 impossible**: mean 6.05 implies minimum size 4, and the smallest 80 distinct eligible pieces need **486 cells**. A catalogue bound computed with minimum size 3 therefore admits an impossible configuration.

The old offered-level equation also disables Easy at 178–199 cells and re-enables it at 200–215. The latest peer proposal deliberately fills these menu gaps with contiguous windows and adopts my proportional size bounds; these are useful corrections.

**Unified decision:** accept the latest power-law/anchor policy, **40%** small pieces, mean ≥4.5, and sizes `[max(3,floor(0.6μ)), ceil(1.5μ)]`. Run histogram feasibility with **all current constraints** before exposing an integer K. Freeze contiguous menu intervals as policy, but still intersect each requested range with feasible counts.

The 40% choice is reasonable for small inventories and permits the suggested 13-piece Master sets. For large K, distinctness already limits 3–4-cell pieces to seven. Do not retain conflicting old spread rules alongside the new window.

### D6-05 — Area, dimensions, memory, and browser factors

**Their latest claim:** 576 standard, 484 phone, 577–676 conditional opt-in; sides ≤32. Their original claim was 484/40. **My earlier claim:** 676 launch/32, 784 experimental.

**Reproduction status:** the 484/676 cross-prototype cases were queued but stopped before completion. I therefore withdraw any implication that my 676 recommendation is qualified for the new score’s large-piece Hell-1 regime.

Published results remain informative but not directly interchangeable:

- My 676 qualification used K=91 and my old Hell-4 label, not K≈37–42 under the new score.
- The peer’s 676 Hell-1 measurements are much slower; its fresh-process storage representation also consumes more memory.
- The peer’s Phase-5 ten-puzzle timings include many clue-only variants; mine require ten full layouts. Certificate work and lifecycles differ too.
- The latest peer **lazy-certificate times are estimates obtained by subtracting CPU share from wall time**, not actual reruns with that work removed. Parallel critical-path changes need measurement.

One clarification to the latest peer review: **my prototype’s placement rows were still JavaScript objects/arrays**, although its DLX links were typed and reused. A fully compact placement builder is a proposed improvement, not an established explanation of the entire measured RSS difference.

**Unified recommendation:**

| Tier | Recommended policy | Evidence status |
|---|---|---|
| Standard design ceiling | **576 active cells, sides ≤32** | Provisional; requires macro carving, compact placement storage, reused buffers, lazy certificates, and byte guards |
| Initial desktop enablement | **484 until the exact unified pipeline passes** | Safer intersection of existing evidence, not a blanket strict-batch guarantee |
| Phone ceiling | **484 after device qualification** | Not a guaranteed one-minute phone limit; start unqualified phones at 360 |
| Large-board mode | **577–676**, desktop opt-in, disabled until qualified | Must test big-piece Hell-1 as well as dense Hell-3 |
| 677+ | Not initially offered | Withdraw my 784 experimental tier from the initial unified product |

Use **`5 + 4×Node`** consistently for conservative planning of both targets and deadlines; show 2.5× only as an optimistic sensitivity scenario. Neither is measured browser performance. The peer’s 576-cell lazy estimate of 26.1 s projects to **109.4 s**, but this remains an estimate of an estimate. Its measured 38.4 s with certificates projects to **158.6 s**.

The original “4 workers × Node heap cap” is not a browser RAM guarantee. Count typed allocations, placement tables, scratch space, and UI memory together; normalize GB/MiB to bytes. Compact storage is a requirement to verify, not evidence that a larger cap already passes.

### D6-06 — Certificates and performance claims

**Unified decision:** lazy certificates, 10,000 row trials up to 200 cells and 2,000 above, never blocking ordinary acceptance. Keep strict raw-coordinate proof in `require` mode; expose that expensive option conservatively.

Do not inherit “uniqueness comes free.” One layout **class up to board symmetry** may contain several coordinate-distinct solutions when the clues preserve a symmetry. A stored witness proves existence only.

Measure “first ten usable puzzles” separately from “certificates settled.” Likewise, changing RNG, score weights, or clue policy can change search paths and accepted candidates; the Phase-5 statement that such changes do not affect timing is too strong.

## 4. Required edits to `4-design-detail.md`

No earlier file was modified in this review.

| Sections | Required change |
|---|---|
| §0; §1.2 R3/R7/R10/R13–14; D9–D13 | Replace obsolete [P5] anchors and model references with the agreed policy/version; distinguish provisional browser qualification from finalized mathematical definitions. |
| §6.4; APIs in §4.2 | Replace anchor interpolation with the new count policy; add full histogram feasibility, mean ≥4.5, proportional bounds, contiguous menu policy, and separately named generation/import/resource limits. |
| §6.5; D15/D17 | Add macro carving, global shape-key exclusion, independent witness validation, and bounded variety discovery. Preserve calibration-based acceptance and witness persistence. |
| §6.7–§6.9; D16; §10.5/§10.7 | Local-first macro LNS, bounded broadening, preferred distance clamped to 3–10 with floor 2. Keep strict layout **and** clue keys. No automatic clue-variant fallback. Say “found within budget,” not “only N exist.” |
| §6.10–§6.11; D14 | Remove synchronous display-only certificate work from ordinary acceptance. Keep verified uniqueness mandatory when explicitly required; keep unknown status separate. |
| §7.1–§7.8; worked examples | Use `difficulty-v2`, geometric bands, effective saturation plus actual counters. Remove the invalid “capped value is a lower bound” and top-level-only acceptance rule. Regenerate examples and model-version tests. |
| §7.5; §10.3 | Generate one authoritative availability table. Do not copy the earlier inconsistent first/last-area summaries or equate the supported top preset with an absolute score ceiling. |
| §8.1–§8.5 | Specify one reusable active workspace per worker, compact placement storage, complete byte accounting, worker recycling, 115-second dispatch stop, and 120-second response deadline. Separate optional cache limits from active-buffer capacity. |
| §8.7; §13.4; Appendix A | Benchmark the **same final pipeline**, strict layouts, actual lazy-certificate mode, worst low/mid/high regimes, rectangles and irregular masks. Preserve old results as historical evidence, not final acceptance data. |
| §8.5/§8.7 memory tooling | `measureUserAgentSpecificMemory()` is not a portable per-worker limiter and normally needs cross-origin isolation. GitHub Pages deployment cannot depend on it; use allocation accounting and browser diagnostics where available. |
| §5.4/§5.5; §11.9; §13; §15 | Update model/policy IDs, reproducibility fixtures, high-piece-count labels/colors, cutoff/feasibility tests, and implementation acceptance criteria. Keep import compatibility separate from generation quotas. |

Rotation, screen-space controls, exact-coordinate progress identity, stored witnesses, and any-valid-completion winning remain unchanged.

## 5. Proposed unified parameters

### Score, counts, and budgets

```text
D = round(2U + 8 log10(1+B_eff))
B_eff = min(B_actual, 5000) after a completed first-solution profile;
        5000 if the 5000-branch or 50000-row cap stops the profile.
U=0 => D=0.  Record saturation/stop reason; time never enters D.

e0=0; eL=round(10 × 1.45^(L−1.5)) for L>=1
level L occupies [eL,e(L+1)); Hell-n has L=6+n.

Kmid = min(K60[L] × (A/60)^0.28, Kcap[L])
K60  = [6, 7.5, 8.5, 10, 11.5, 13, 16, 24, 32, 43, 58]
Kcap = Hell-1:42, Hell-2:62, Hell-3:92, Hell-4:140
w = max(0.75, 0.06 Kmid)
integer range = [round(Kmid−w), round(Kmid+w)]
                intersect K>=ceil(0.75 sqrt(A)),
                K<=floor(A/4.5), K<=Kcap, and full histogram feasibility.

μ=A/K; sizes in [max(3,floor(0.6μ)), ceil(1.5μ)]
at most floor(0.4K) pieces of size 3–4; distinct, connected, hole-free.

G0=clamp(round(gL K),1,K−2)
gL=0.62−0.08L through Nightmare;
Hell-1=0.10, Hell-2=0.06, Hell-3+=0.04.
```

Retain R/H diagnostics and one versioned canonical traversal. Caps are part of the model. Contiguous menu intervals require a single generated/tested policy table; infeasible individual counts are still removed.

Adopt the peer’s latest **nominal menu anchors**, subject to that feasibility filter: minimum areas for VE/E/N/H/X/M/NM/H1/H2/H3 are **30/32/36/41/50/59/81/164/266/450**. Maximum areas for VE/E/N are **87/215/348**; higher levels use the device’s generation cap. These are **preset-policy/calibration anchors**, not impossibility proofs or newly qualified browser limits.

### Reference configurations within the area bands

Size ranges below are unions over the listed K range. G is the **initial** count; search may change it. This table defines recommendations, not a newly qualified performance matrix.

| Area / band reference | Level | K range | Piece-size range | G0 | Timing evidence / expectation |
|---|---|---:|---:|---:|---|
| 60, small boards | Easy | 7–8 | 4–13 | 4 | K8 strict macro: **0.082–0.103 s Node**, two runs |
| 60 | Master | 12–13 | 3–8 | 3 | Peer measured roughly 0.8–0.9 s Node; not re-run here |
| 360, 301–420 band | Hard | 16–18 | 12–34 | 6–7 | K17 strict macro: **0.294–0.319 s Node**, two runs |
| 360 | Hell-1 | **37–42** | 5–15 | 4 | K37/41 strict: **3.58–4.60 s Node** with G2; new G0 not timed |
| 360 | Hell-2 | 50–56 | 3–11 | 3 | Peer 9.1–9.3 s; its variant-capable pipeline is not a strict-batch qualification |
| 484, 421–484 band | Hell-1 | 39–42 | 6–19 | 4 | Peer K41: 18.8–18.9 s Node; strict unified pipeline not re-run |
| 484 | Hell-3 | 73–80, feasible counts only | 3–10 | 3 | Peer 8.3–15.0 s; same caveat |
| 576, conditional standard ceiling | Hell-1 | 39–42 | 8–23 | 4 | **13.8–26.1 s Node is an estimated lazy-certificate range, not measured** |
| 576 | Hell-3 | 76–86 | 4–12 | 3 | Peer 19.6–23.6 s with old policy; final strict pipeline unqualified |
| 676, opt-in only | Hell-1 | 39–42 | 9–26 | 4 | Peer K37 lazy estimate 33.4–36.9 s exceeds the conservative browser deadline |
| 676 | Hell-3 | 80–90 | 4–13 | 3–4 | No new completed reproduction; must be qualified before enabling |

The full interval policy follows the formulas, not interpolation of runtime values. Do not infer timings for unmeasured intermediate combinations.

| Operational parameter | Proposed value |
|---|---|
| Area / dimensions | 576 provisional standard ceiling; initial desktop 484 until qualification; phone ceiling 484 with device gate; 577–676 opt-in after qualification; sides ≤32 |
| Parallelism | Up to four workers, deterministic fold and indexed seeds |
| Construction | Macro when μ≥6.5; global distinctness; flat fallback; retained witness |
| Rating | 5,000 branch trials / 50,000 row trials; ≤64 candidate profiles per layout |
| LNS | Local macro region; broaden periodically; flat sets use 6–13 pieces; 3,000–5,000 rows per search |
| Distinctness | Both keys new; preferred distance `clamp(ceil(K/4),3,10)`, relaxable to **2**, never layout reuse |
| Certificates | Lazy; 10,000 rows at A≤200, otherwise 2,000; strict proof in require mode. Standard require presets: A≤200 or below Hell; other cases experimental, not declared impossible. |
| Memory | Compact typed placement storage; one reusable workspace per worker; structural guards ≤600k rows / ≤5M nonzeros **plus a total byte budget** |
| Time | Target 60 s; stop dispatching at 115 s; hard completed/partial response by 120 s while running in the foreground |
| Planning factor | `5 + 4×Node`; 2.5× is sensitivity only; actual browser/phone tests decide enablement |

The 576 ceiling is therefore a **conditional engineering target**, not a declaration that current evidence already passes `4-design-detail` §8.7.

## 6. User decision

**Should explicitly labeled same-layout clue variants be available as a separate optional activity?**

**Recommended default: no fallback inside New Puzzle.** Prefer structured sets with verified different layouts; return fewer puzzles and offer Generate Piece Set when needed. An optional “Different clues, same arrangement” activity can be added only with explicit approval and must not count toward the distinct-layout batch.

No separate approval is needed to reduce 360-cell Hell-1 to 34–39: that proposal has been withdrawn, and 41 is independently reproduced. Cap enablement, browser factors, and score calibration are validation tasks, not questions to delegate to the user.
