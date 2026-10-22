# Addendum study — Architect 2

**Independent study · 22 October 2026**

This study supersedes the earlier fixed 10–18-piece assumption. Area means **unblocked cells**, not the enclosing rectangle. Display rotation changes neither area nor any generation/solver input. No Phase-5 document by the other architect was consulted.

**Recommendation:** launch with a conservative **676-active-cell generation cap**, width/height at most **32**, and an optional, explicitly experimental **784-cell** mode. Use **484 cells as the initial slower-phone preset cap**. These are prototype-based recommendations, not browser-certified limits. The tested pipeline can generate much larger boards quickly, but memory margin, layout quality, and small-sample uncertainty prevent advertising the largest successful Node case as a universal optimum.

## 1. What was actually measured

The prototype executes the complete pipeline: quota-constrained connected carving, independent validation of the planted tiling, DLX with fixed work limits, local-neighbourhood re-tiling, selection of fixed pieces, the shared score, and deduplication of both full layouts and visible clue configurations.

| Item | Measurement setup |
|---|---|
| CPU presented to Windows | AMD EPYC 7763; **8 cores / 16 logical processors**, reported maximum 2,445 MHz |
| Host RAM | 63.95 GiB; this is not the application’s allowed budget |
| Runtime | Node **v24.21.0**, Windows, `node --max-old-space-size=2048 -` |
| Compute concurrency | Exactly **4 `worker_threads`** per measured generation request |
| Worker heap limits | 256 MiB old generation + 32 MiB young generation per worker |
| Whole-process memory observation | RSS sampled every 20 ms, including all four workers; stop at 1,700 MiB |
| Structural guards | 600,000 placement rows; 5,000,000 DLX nonzeros per model |
| Reference score traversal | At most 5,000 row selections |
| One LNS search | At most 3,000 row selections, up to eight solutions |
| Native request watchdog | 28.5 seconds; accepted partial results survive termination |
| Optimized worker-source SHA-256 | `d5ed95201d897551bd833087454ff81efb4d8e436811e41047fdb21dd0208df1` |

The prototype ran from Node stdin and in-memory worker sources, with source archives captured in the session outside the repository. **No standalone scratch `.js` file was created.** This execution-method deviation avoids creating application or scratch files in the repository. Session executions **`a2-source-archive`** and **`a2-benchmark-data`** retain gzip/base64 JSON archives of the complete worker/coordinator source and compact per-attempt measurements.

There were **358 end-to-end attempts across the development and measurement cohorts**. Do not pool their timings: algorithm and orchestration variants are identified separately below. The final resource recommendation uses the five-seed, fresh-worker cohort, including worker replacement costs.

Correctness checks passed before timing:

- Free-polyomino growth/canonicalization reproduced **1, 1, 2, 5, 12** for sizes 1–5.
- The twelve classic pentominoes on 3×20 produced **8 raw solutions**, exhaustively, in 32,643 row selections.
- A tiny distinct-triomino case produced **2 solutions**, matching independent brute force.
- Every returned carving and LNS solution was independently checked for shape identity, exact coverage, and non-overlap. Accepted puzzles have a valid witness and a completed, possibly censored, score profile.
- After introducing reusable buffers, abort/re-solve, repeated construction, and switching between clued and unclued problems still reproduced the **8** classic solutions.

These are real Node measurements, **not browser measurements**. For planning:

```text
mid-range laptop estimate = 5 seconds + 4 × Node time
slower phone estimate     = 5 seconds + 8 × Node time
browser memory allowance = 128 MiB + 1.25 × measured process RSS
```

The five-second reserve covers startup, transport, validation, and rendering after application assets are available; it is not a network-loading guarantee. These factors are explicit conservative assumptions, not measured conversions. A 2 GB working budget is assessed conservatively against approximately **1,900 MiB**, not against the host’s 64 GiB. The Node heap flag alone does not cap native typed arrays or total RSS. The host was shared, not an exclusively reserved consumer-device test machine.

## 2. Feasibility and a concrete balance rule

### 2.1 Distinct shapes

Rotation and reflection identify the same free polyomino. Published counts [1]:

| Cells | Free shapes | Hole-free shapes |
|---:|---:|---:|
| 3 | 2 | 2 |
| 4 | 5 | 5 |
| 5 | 12 | 12 |
| 6 | 35 | 35 |
| 7 | 108 | 107 |
| 8 | 369 | 363 |
| 9 | 1,285 | 1,248 |
| 10 | 4,655 | 4,460 |
| 11 | 17,073 | 16,094 |
| 12 | 63,600 | 58,937 |
| 13 | 238,591 | 217,117 |
| 14 | 901,971 | 805,475 |
| 15 | 3,426,576 | 3,001,127 |

The generator prefers hole-free pieces. It does not enumerate enormous catalogues: it constructs shapes, then rejects repeated canonical keys. Catalogue counts are necessary feasibility checks, never proof that a particular mask can be tiled.

Larger free counts include **13,079,255 at size 16** and **2,870,671,950 at size 20** [3]. Exact huge tables are unnecessary for this inventory range. For any size `s >= 16`, a full `(s−4)`-cell row with four attached squares on one side already gives at least `ceil(binomial(s−4,4)/2) >= 248` distinct hole-free free shapes; only reversal can identify two such patterns. This supplies a conservative catalogue lower bound above the tested inventory counts. It still says nothing about fitting a particular mask.

For area `A`, piece count `K`, and mean piece size `μ = A/K`, propose:

```text
minimum piece size = max(3, floor(0.60 μ))
maximum piece size = ceil(1.50 μ)
number of 3–4-cell pieces <= floor(0.30 K)
```

Each set also respects the available distinct shapes of every size. This prevents a flood of tiny pieces without freezing “large” at six cells regardless of board size. The old maximum of ten cells per piece must go: 360 cells divided among 18 pieces requires an average of 20.

Use an integer histogram feasibility check:

```text
sum(c_s) = K
sum(s × c_s) = A
0 <= c_s <= available distinct shapes of size s
c_3 + c_4 <= floor(0.30 K)
all used sizes lie in the declared size window
```

The usual `3K <= A` check is insufficient. With just the 30% small-piece quota and catalogue availability, minimum areas include **36 for K=8**, **55 for K=12**, and **60 for K=13**. The per-request size window can tighten those bounds.

### 2.2 Proposed piece-count formula

Number levels as Very Easy=0, Easy=1, Normal=2, Hard=3, Expert=4, Master=5, Nightmare=6, Hell-n=`6+n`.

```text
minimum offered level m(A) = max(0, ceil(log2(A/60)))

raw target k(a, L) =
    round(7 × sqrt(a/60) + (a/60) × (L - m(a)))

K(A, L) =
    max k(a, L) over integer 1 <= a <= A for which L >= m(a)
```

The running maximum is inexpensive to precompute. It prevents a count from dropping abruptly when a larger board crosses an availability-band boundary. For supported areas of at least 60 cells, targets increase with difficulty and never decrease with area.

Apply histogram and mask checks **after** this target calculation. An unavailable combination is not repaired by duplicating shapes, reducing the minimum size, or silently changing the difficulty.

The user’s examples become:

| Example | Proposed target | Allowed size window | Interpretation |
|---|---:|---:|---|
| 60 cells, Easy | **8** | 4–12 | Within the suggested 7–8 |
| 60 cells, Master | **12** | 3–8 | Within 11–13; 13 is at the quota-only minimum area and is less forgiving |
| 360 cells, Hard | **18** | 12–30 | Within 16–18; the pieces must be much larger than pentominoes |
| 360 cells, Hell-1 | **41** | 5–14 | Within 40–42, without 3–4-cell pieces |
| 360 cells, Hell-2 | **47** | 4–12 | Higher piece count, subject to measured qualification |
| 360 cells, Hell-3 | **53** | 4–11 | Higher again; not a promise that every seed yields ten matching puzzles |

The minimum offered level is a **supported generation preset**, not a mathematical assertion that a huge, nearly completed board cannot be easy. Imported/custom puzzles retain their actual score. Smaller-than-60-cell generation needs separate calibration; the upper-limit measurements here must not be presented as a study of tiny boards.

## 3. One shared score and an extensible ladder

Retain one additive model:

```text
D = round(2U + 0.10R + 4H + 8 log10(1+B))
H = mean over remaining pieces of log2(1 + legalPlacementCount)
```

- `U`: pieces left to place.
- `R`: unfilled active cells.
- Legal placements consider the board and clues, with symmetric orientations deduplicated.
- `B`: branching row selections actually visited by the canonical DLX traversal before its first solution or its **5,000-row-selection budget**.
- Record `profileCensored` separately. A budget-censored score is a deterministic estimate, not a completed first-solution measurement.
- A watchdog interrupt before the bounded profile completes supplies no new score. A witness proves solvability; the score does not.
- Define the score of an already completed state as zero.

Keeping `R` matters under the addendum. One measured 360-cell, 17-piece pilot had `U=8, R=160, H=4.419, B=0`: **D=50, Hard**. Dropping the area term gives **34, Easy**. This is evidence for meeting the requested scaling, not proof of human-difficulty calibration.

| Level | Proposed score interval |
|---|---|
| Very Easy | `[0,20)` |
| Easy | `[20,35)` |
| Normal | `[35,50)` |
| Hard | `[50,65)` |
| Expert | `[65,75)` |
| Master | `[75,90)` |
| Nightmare | `[90,110)` |
| Hell-1 | `[110,140)` |
| Hell-2 | `[140,200)` |
| Hell-3 | `[200,290)` |
| Hell-4 | `[290,410)` |
| Hell-n | `[110 + 15n(n−1), 110 + 15n(n+1))` |

Widening Hell bands avoids creating ever-higher names merely by splitting a bounded top score. It also avoids treating a large, heavily pre-filled puzzle as equivalent to the sparsely clued upper tier. The formula remains identical across boards; only the offered presets vary.

Clue count is searched, not another score formula. The measured initial proposal was:

```text
extra = [4,16,20,22,28,32,40] for Very Easy through Nightmare;
        58 for Hell tiers
mid   = midpoint of the requested integer score band
u0    = clamp((mid - extra)/(2 + 0.10 A/K), 2, K-1)
g0    = round(K - u0)
```

Four workers initially vary the clue fraction around `g0/K` by −3.75%, −1.25%, +1.25%, and +3.75%, then search bounded changes and random subsets. These numbers merely propose candidates; **only D assigns a level**. Keep **one or more clues and at least two movable pieces**. Larger inventories can have more clues in absolute numbers while leaving a smaller *fraction* pre-placed. Display both counts and fractions.

A set is accepted through a real target-band calibration puzzle, reused as puzzle #1. An optional open-board benchmark is informational only, never a reachability ceiling. Human playtesting remains necessary before treating these labels as calibrated human effort.

## 4. The scalable pipeline is constructive, not global solve-and-hope

The first pilot exposed an important failure: flat carving could create a valid set almost instantly but supply **no second distinct layout**. This occurred even at 60 cells / 8 pieces and at 360 cells / 17 pieces.

The final prototype therefore uses:

1. **Four deterministic carving candidates in parallel.** Check a balanced size plan and grow connected regions, pruning impossible residual areas.
2. **Rearrangement-aware macro carving when average piece size is at least 6.5.** Split the board into compact, unmarked regions containing roughly 3–6 pieces, or 2–3 for small inventories. Reject one/two-cell-wide macro regions. Carve inside each while propagating the *global* set of already-used shape keys.
3. **Flat carving as fallback**, and for dense small-piece sets. Macro boundaries are not blocked cells and are never game rules; the solver and player may cross them.
4. **Parallel clue calibration.** All four workers evaluate independently seeded subsets of the same candidate set. Candidate/index order, not which worker finishes first, chooses the accepted result.
5. **Four LNS walks.** Keep the rest of the tiling fixed and re-tile a complete macro region with capped DLX. One step in eight broadens the released connected group to explore cross-region changes. Flat-carved sets use adjacency-based release groups. This local-first change was important: always releasing a large fraction of the board wasted the budget on another hard global search.
6. **Per-puzzle parallel rating.** Process candidate layouts four at a time, beginning near the successful calibration clue count.
7. **Strict acceptance.** Full-layout and clue keys must both be new modulo board symmetry; accepted scores must be in band. Never pad a batch with a reused layout.

Prefer a layout distance of `max(3, ceil(K/3))` moved pieces. The prototype progressively relaxes this preference under its work budget; strict distinctness never relaxes. **The measured batches sometimes have a minimum distance of only two pieces.** Thus the measurements qualify ten *distinct* layouts, not ten guaranteed widely separated layouts. Retaining the stronger distance requirement can produce fewer puzzles or take longer.

This structure intentionally biases generation toward sets with rearrangement opportunities. It is not uniform sampling and does not prove uniqueness. The benchmark is for **multiple-solutions-allowed generation**; an opt-in uniqueness proof needs its own budget and can fail.

### Fixed operational budgets

- Four carving candidates; up to 12,000 region-growth attempts per flat candidate.
- Up to four candidate sets tried for target calibration.
- Up to ten clue-subset profiles per worker operation.
- Up to three layout-pool rounds; four walks per round, 32 LNS steps per walk, up to six retained layouts per walk.
- Every exact-cover profile and LNS search has the fixed work limits stated in §1.
- Persist the planted witness. Do not pay for a fresh unconstrained global solve on reload.
- Reuse one DLX typed-array buffer capacity within a worker instead of allocating new link arrays for every profile/LNS step.
- Recycle the four-worker pool when replacing the piece set; retain only small puzzle/set data in the UI. The fresh-worker measurements include that replacement cost.
- Stop the complete request at the wall-clock deadline and terminate its workers. Return only already validated/rated results, with an explicit shortfall reason.

## 5. Reading the measurements correctly

`T1` is time from request start through a validated set and its first rated puzzle; the planted tiling alone is not counted as success. `T10` includes carving, calibration, distinct-layout discovery, clue selection, scoring, and final layout-distance checks.

Report **both** “at least one rated puzzle” and “all ten distinct rated puzzles” success rates. Completion-time percentiles are conditional on that outcome; failed/partial requests are not silently counted as fast completed batches. Report their return times and causes separately.

The screening samples are intentionally small. With three seeds, nearest-rank p95 is simply the maximum. Qualification uses more seeds near the selected boundary; even a perfect small sample is not a production reliability guarantee.

There is no area-only guarantee that ten layouts exist. Nor is there a mathematically universal “optimal maximum” independent of mask, shape distribution, difficulty, hardware, and solver design. The recommendation must be the largest **qualified practical envelope**, not the largest easy case that fits in memory.

## 6. Measured limits and recommended support table

### 6.1 Practical cap, not a universal optimum

The following use **five independent seeds per configuration**, ten requested puzzles, fresh workers, and included replacement time. All six rows returned **5/5 first puzzles and 5/5 complete ten-puzzle packs**. Browser values are **extrapolated**, not measured.

| Active cells / K / level | Node T10 p50 / p95, s | Peak Node RSS, MiB | Forecast browser memory, MiB | Forecast laptop T10 p50 / p95, s |
|---|---:|---:|---:|---:|
| 676 / 91 / Hell-4 | 7.13 / 8.50 | 1,058 | **1,451** | **33.5 / 39.0** |
| 784 / 104 / Hell-4 | 8.06 / 9.39 | 1,366 | **1,835** | **37.2 / 42.5** |
| 800 / 106 / Hell-4 | 9.21 / 9.85 | 1,416 | 1,897 | 41.9 / 44.4 |
| 841 / 110 / Hell-4 | 9.55 / 10.63 | 1,486 | 1,986 | 43.2 / 47.5 |
| 864 / 113 / Hell-4 | 10.15 / 10.55 | 1,574 | 2,095 | 45.6 / 47.2 |
| 900 / 117 / Hell-4 | 11.02 / 11.63 | 1,603 | 2,132 | 49.1 / 51.5 |

**Why 676 for launch:** its forecast leaves about **24%** of the conservative 1,900 MiB allowance unused. At 784 the margin is only about **3.4%**; at 800 it is effectively zero. I would reserve at least approximately 15% forecast memory headroom for an unqualified browser implementation. This is an explicit engineering safety choice, not an observed browser limit.

- **Launch recommendation:** active area ≤ **676**, each dimension ≤ **32**, connected masks, four workers, ordinary resource guards.
- **Experimental extension:** active area ≤ **784**, after actual browser qualification or explicit opt-in. The measured time fits comfortably; the memory margin is thin.
- **Initial slower-phone preset:** ≤ **484** active cells. The optimized 484-cell Hell-3 sample projects to about **37.6 / 41.4 seconds** at the ×8 factor. At 676 the corresponding estimate is about **62.1 / 73.0 seconds**: below the hard deadline, but over the one-minute median target.
- **Do not advertise 800–900 cells yet.** Their fast Node timings alone do not establish the required browser-memory margin.

The dimension cap is a conservative preprocessing/UI bound, not a mathematical result; dense rectangles up to 32×27 were exercised. Arbitrary holes, narrow corridors, and Heart masks were **not performance-qualified**. A 30×30 Heart with its top-right 15×15 block disabled has 675 active cells and fits the counting cap, but that is a geometry example, **not a timed Heart result**.

This is the largest tested comfortable launch point, not an exhaustive search of every intervening area or algorithm. In particular, the fresh-worker cohort did not densely sample 677–783. Packed placement storage, further allocation work, or better browser results could move the practical boundary.

### 6.2 Offered levels and count ranges

These are proposed **preset availability bands**, not proofs that a higher-scoring custom puzzle is impossible below a cutoff. Every generated puzzle must still pass actual target-band calibration.

| Area band | Minimum preset | Maximum preset | K range across the offered levels/areas |
|---|---|---|---:|
| 60 | Very Easy | Master | 7–12 |
| 61–99 | Easy | Master | 8–16 |
| 100–120 | Easy | Nightmare | 9–20 |
| 121–143 | Normal | Nightmare | 12–20 |
| 144–195 | Normal | Hell-1 | 12–29 |
| 196–240 | Normal | Hell-2 | 13–38 |
| 241–359 | Hard | Hell-2 | 18–47 |
| 360–480 | Hard | Hell-3 | 18–68 |
| 481–599 | Expert | Hell-3 | 28–72 |
| 600–676 | Expert | Hell-4 | 28–91 |
| 677–784, experimental | Expert | Hell-4 | 28–104 |

The formula in §2 determines the exact target for each area and level; the table does not mean every count in a row is freely interchangeable. Menu transition points and the human meaning of the labels remain **unverified by playtesting**.

### 6.3 Reference profiles: pieces, clues, and expected time

Allowed sizes are calculated from the common size-window rule. Clue counts are **observed ranges**, not fixed promises. Time is the **extrapolated laptop p50/p95 for a complete ten-pack**, conditional on success. S = initial full-pipeline screen; O = optimized engine; F = fresh-worker cohort. Intermediate menu combinations have not all been timed.

| Area | Level | K | Allowed piece sizes | Pre-placed, observed | Laptop T10 estimate, s | Evidence |
|---:|---|---:|---:|---:|---:|---|
| 60 | Easy | 8 | 4–12 | 4–6 | 5.1 / 5.4 | S |
| 60 | Master | 12 | 3–8 | 1 | 5.6 / 5.9 | S |
| 100 | Nightmare | 17 | 3–9 | 1 | 8.7 / 8.8 | S |
| 144 | Hell-1 | 23 | 3–10 | 1 | 12.1 / 13.6 | S |
| 196 | Hell-2 | 32 | 3–10 | 1 | 22.7 / 28.5 | S |
| 256 | Hell-2 | 38 | 4–11 | 1 | 20.4 / 21.7 | S |
| 324 | Hell-2 | 43 | 4–12 | 1 | 44.9 / 47.9 | S |
| 360 | Hard | 18 | 12–30 | 9–11 | 6.0 / 6.0 | S |
| 360 | Hell-1 | 41 | 5–14 | 16 | 33.0 / 34.4 | S |
| 360 | Hell-2 | 47 | 4–12 | 5 | 45.7 / 49.9 | S |
| 360 | Hell-3 | 53 | 4–11 | 1 | 15.4 / 16.8 | O |
| 400 | Hell-3 | 58 | 4–11 | 1 | 16.7 / 18.4 | O |
| 484 | Hell-3 | 68 | 4–11 | 1 | 21.3 / 23.2 | O |
| 576 | Hell-3 | 70 | 4–13 | 1 | 36.6 / 39.4 | O |
| 676 | Expert | 28 | 14–37 | 17–18 | 9.4 / 9.7 | S |
| 676 | Hell-4 | 91 | 4–12 | 1 | 33.5 / 39.0 | F |
| 784, experimental | Hell-4 | 104 | 4–12 | 1 | 37.2 / 42.5 | F |

Do not compare S and O rows as if a harder level must generate faster or slower: they use different discovery/memory implementations. The retained S rows document all required area anchors, while O/F establish the optimized large-board direction and limit.

### 6.4 Runtime and release policy

1. Treat **60 seconds as a target**, not a promise of ten matching layouts. Show phase, elapsed time, accepted count, and Cancel.
2. In the browser, stop new work before **115 seconds**, terminate unfinished workers, and use the remaining five seconds to validate/package the accepted results. Never derive a score from elapsed time.
3. Preflight placement/model byte budgets before allocation. Browser JavaScript has no portable whole-process RSS limiter; Node’s heap/resource-limit APIs cannot simply be copied into a web page.
4. On exhaustion, keep the current piece set and all valid accepted puzzles. Return fewer, or explain that no target-band puzzle was found. Do not reuse a layout, silently reduce difficulty, or invent uniqueness.
5. Store arbitrary piece IDs and visible labels beyond A–Z; a 20-color or 26-piece hard limit is incompatible with this proposal. Labels/patterns must supplement color.
6. These are **generation limits**, not intrinsic player rules. Validate compatible imported puzzles separately from the generator’s quota policy; do not automatically launch an oversized solve on import.

Before advertising a browser-qualified cap, test actual Chromium, Firefox, and Safari workers on representative hardware and irregular masks, with at least roughly 60 independent seeds per key configuration. The present five-seed tail estimates are insufficient to certify a true p95 or a 95%-reliable full batch. Upper-tier labels also need human playtests: many high-tier profiles are censored at the work cap, and constructive macro structure may affect perceived difficulty.

No additional user decision blocks this recommendation. The two material assumptions are explicit: large-board low-piece-count presets allow pieces larger than ten cells, and the default benchmark permits multiple valid completions.

## Appendix A — Raw measurements

### A.1 Initial full-pipeline screen

Engine `study-v1`, **n=3 per row**, seed indices 3000–3002. No local-first LNS/buffer-lifecycle optimization yet. “One / ten” gives successful outcomes separately. T1/T10 are **seconds, p50 / nearest-rank p95**; with n=3, p95 is the maximum. A dash means no completed ten-pack. RSS includes the entire live process and retained allocator/history state.

| A | Level | K | One / ten | T1 p50/p95 | T10 p50/p95 | Peak RSS MiB |
|---:|---|---:|---|---:|---:|---:|
| 60 | Very Easy | 7 | 3/3 / 3/3 | 0.02/0.03 | 0.05/0.07 | 148 |
| 60 | Easy | 8 | 3/3 / 3/3 | 0.01/0.06 | 0.03/0.09 | 1,044 |
| 60 | Master | 12 | 3/3 / 3/3 | 0.04/0.05 | 0.15/0.22 | 163 |
| 100 | Easy | 9 | 3/3 / 3/3 | 0.02/0.02 | 0.04/0.05 | 197 |
| 100 | Nightmare | 17 | 3/3 / 3/3 | 0.15/0.16 | 0.92/0.95 | 272 |
| 144 | Normal | 12 | 3/3 / 3/3 | 0.02/0.02 | 0.07/0.08 | 281 |
| 144 | Hell-1 | 23 | 3/3 / 3/3 | 0.29/0.33 | 1.77/2.14 | 307 |
| 196 | Normal | 13 | 3/3 / 3/3 | 0.03/0.04 | 0.15/0.16 | 307 |
| 196 | Hell-2 | 32 | 3/3 / 3/3 | 0.34/0.47 | 4.42/5.88 | 346 |
| 256 | Hard | 18 | 3/3 / 3/3 | 0.05/0.06 | 0.20/0.28 | 332 |
| 256 | Hell-2 | 38 | 3/3 / 3/3 | 0.54/0.99 | 3.86/4.17 | 476 |
| 324 | Hard | 18 | 3/3 / 3/3 | 0.07/0.08 | 0.23/0.27 | 434 |
| 324 | Hell-2 | 43 | 3/3 / 3/3 | 0.82/0.91 | 9.98/10.72 | 662 |
| 360 | Hard | 18 | 3/3 / 3/3 | 0.09/0.10 | 0.25/0.25 | 594 |
| 360 | Hell-1 | 41 | 3/3 / 3/3 | 0.46/0.55 | 7.00/7.35 | 1,131 |
| 360 | Hell-2 | 47 | 3/3 / 3/3 | 0.68/0.82 | 10.17/11.23 | 767 |
| 360 | Hell-3 | 53 | 3/3 / 3/3 | 0.82/0.98 | 7.85/8.33 | 764 |
| 400 | Hard | 18 | 3/3 / 3/3 | 0.08/0.09 | 0.32/0.35 | 748 |
| 400 | Hell-3 | 58 | 3/3 / 3/3 | 0.85/0.91 | 9.45/12.00 | 825 |
| 484 | Expert | 28 | 3/3 / 3/3 | 0.13/0.16 | 0.56/0.68 | 695 |
| 484 | Hell-3 | 68 | 3/3 / 0/3 | 1.23/1.49 | — | 1,083 |
| 576 | Expert | 28 | 3/3 / 3/3 | 0.21/0.22 | 0.83/0.90 | 898 |
| 576 | Hell-3 | 70 | 3/3 / 0/3 | 1.91/1.92 | — | 1,341 |
| 600 | Expert | 28 | 3/3 / 3/3 | 0.21/0.32 | 0.79/1.04 | 653 |
| 600 | Hell-4 | 82 | 3/3 / 0/3 | 2.28/3.02 | — | 1,181 |
| 625 | Expert | 28 | 3/3 / 3/3 | 0.20/0.25 | 0.77/1.04 | 945 |
| 625 | Hell-4 | 85 | 3/3 / 0/3 | 1.78/1.79 | — | 1,338 |
| 676 | Expert | 28 | 3/3 / 3/3 | 0.28/0.31 | 1.09/1.16 | 1,251 |
| 676 | Hell-4 | 91 | 3/3 / 0/3 | 3.20/4.02 | — | 1,703 |
| 720 | Expert | 28 | 3/3 / 3/3 | 0.29/0.44 | 1.04/1.25 | 1,293 |
| 720 | Hell-4 | 96 | 0/3 / 0/3 | — | — | 1,748 |
| 900 | Expert | 28 | 3/3 / 1/3 | 0.51/0.54 | 1.63/1.63 | 1,701 |
| 900 | Hell-4 | 117 | 1/3 / 0/3 | 3.04/3.04 | — | 1,659 |

Failures were not all slow searches: they included partial layout pools, the RSS guard, and the row guard. The 576-cell upper-tier attempts returned within 28.58 seconds against the 28.5-second watchdog. Such returns are **not** counted as completed ten-packs.

### A.2 Optimized engine, retained-worker boundary scan

Engine `study-v2`, **n=5**, seeds 4000–4004. Local-first LNS and reused DLX buffers; pool retained across requests. These RSS figures motivated the fresh-worker policy and must not be read as an isolated per-board memory requirement.

| A | Level | K | One / ten | T1 p50/p95, s | T10 p50/p95, s | Peak RSS MiB |
|---:|---|---:|---|---:|---:|---:|
| 360 | Hell-3 | 53 | 5/5 / 5/5 | 0.84/1.08 | 2.59/2.96 | 779 |
| 400 | Hell-3 | 58 | 5/5 / 5/5 | 0.83/1.01 | 2.92/3.34 | 1,033 |
| 484 | Hell-3 | 68 | 5/5 / 5/5 | 1.33/1.56 | 4.08/4.55 | 1,057 |
| 576 | Hell-3 | 70 | 5/5 / 5/5 | 1.80/2.28 | 7.91/8.59 | 1,404 |
| 600 | Hell-4 | 82 | 5/5 / 5/5 | 2.29/2.47 | 5.90/7.14 | 1,630 |
| 625 | Hell-4 | 85 | 5/5 / 4/5 | 1.80/3.44 | 6.99/7.63 | 1,701 |
| 676 | Hell-4 | 91 | 5/5 / 5/5 | 2.26/2.77 | 8.97/9.54 | 1,430 |
| 720 | Hell-4 | 96 | 5/5 / 5/5 | 2.30/2.67 | 8.03/8.52 | 1,650 |
| 784 | Hell-4 | 104 | 3/5 / 2/5 | 2.45/2.70 | 8.25/8.48 | 1,725 |
| 841 | Hell-4 | 110 | 3/5 / 2/5 | 2.75/3.81 | 10.92/11.29 | 1,723 |
| 900 | Hell-4 | 117 | 1/5 / 1/5 | 2.60/2.60 | 10.72/10.72 | 1,726 |

### A.3 Fresh-worker raw summary

Same optimized engine, **n=5**, seeds 5000–5004. Worker cleanup/replacement time is included; the complete request’s process RSS is reported without subtracting a baseline.

| A | Level | K | One / ten | T1 p50/p95, s | T10 p50/p95, s | Peak RSS MiB | Minimum layout distance |
|---:|---|---:|---|---:|---:|---:|---:|
| 676 | Hell-4 | 91 | 5/5 / 5/5 | 2.16/3.54 | 7.13/8.50 | 1,058.2 | 2 |
| 784 | Hell-4 | 104 | 5/5 / 5/5 | 2.29/2.59 | 8.06/9.39 | 1,365.5 | 2 |
| 800 | Hell-4 | 106 | 5/5 / 5/5 | 2.58/3.02 | 9.21/9.85 | 1,415.5 | 2 |
| 841 | Hell-4 | 110 | 5/5 / 5/5 | 2.46/5.36 | 9.55/10.63 | 1,486.4 | 2 |
| 864 | Hell-4 | 113 | 5/5 / 5/5 | 3.27/3.77 | 10.15/10.55 | 1,573.8 | 2 |
| 900 | Hell-4 | 117 | 5/5 / 5/5 | 2.57/3.63 | 11.02/11.63 | 1,603.0 | 2 |

All pieces in these six fresh-worker samples were 5–12 cells, all accepted score profiles were budget-censored, and each pack contained ten different full-layout keys and ten different clue keys. Pre-placed counts were one except at 864 cells (three) and 900 cells (seven). Censoring does not negate their independently validated witnesses.

### A.4 Reproduction and limitations

- The source archive is gzip/base64 JSON containing `engineSource`, `poolSource`, `runCaseSource`, `batchSource`, and `seedSource`. The compact data archive contains **184 per-attempt rows** for the two reported engines, their exact request configurations, seeds, outcomes, and cleanup adjustments.
- Seed derivation in the prototype takes the low 32-bit word of SHA-256 over the serialized request plus repetition index, then expands it into the xoshiro state. The archive records the actual seed; production can retain the agreed 128-bit seed interface.
- Early prototypes account for the remaining attempts; their timings are deliberately not pooled with the final tables.
- Fresh-worker runs improved observed reliability but do not prove that worker recycling releases every allocator page immediately. The memory forecast deliberately retains observed whole-process RSS.
- No timed browser run, phone run, irregular-mask qualification, uniqueness-required benchmark, or human-difficulty study is claimed.
- No universal optimum or guaranteed ten-puzzle outcome follows from these samples. The strict guarantee to implement is **bounded resource use and an honest completed/partial/failed response**, not success on every mask.

## References

1. Eric W. Weisstein, “Polyomino,” MathWorld — free and holed-polyomino counts: <https://mathworld.wolfram.com/Polyomino.html>, accessed 22 October 2026.
2. Donald E. Knuth, “Dancing Links” — exact-cover formulation and reversible search: <https://arxiv.org/abs/cs/0011047>.
3. OEIS A000105, free-polyomino count table: <https://oeis.org/A000105/b000105.txt>, accessed 22 October 2026.
