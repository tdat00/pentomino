# IGP-03h comparison: W variants, no screen and arity 3 against IGP-01

> **Provisional (pre-freeze).** Measured on rating-v3 runtime cd5d17f (worktree 0e1283e) (source digest 34cea386…, equal to MP12b1's source), not on the frozen post-MP17 source. Re-run: pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\IGP-03h.json -Label frozen -SourceLabel <label> -LockHelper <path>.

Provisional (pre-freeze) numbers. "After" values are *Measured*, ratios are *Derived* (before / after on matched seeds), the estimates are the analysts' *Projections* (check-list §5). Matched cohorts only: reps 0-2 on the slow cells (no p95 can be read from three requests), 0-4 and 0-5 on the fast shard. A faster request that delivers fewer puzzles is never read as a gain; completion is always beside a time. IGP-07 gives the descriptive verdicts.

Identity: The before arm agrees with MP12b1 on every seed (puzzle identity or metric-prefix agreement, named per seed).

In this study each pair is "first arm / second arm" on matched seeds only (the seeds both arms ran): the headline tables below give the paired ratios, the study sections after them the per-W, population, split, shift, offset and arity-3 figures. The records of the arms of IGP-01 are read from its published folders.

## Headline: IGP-01/before (log) against w760 (p1p5-w760)

| Cell | Today, MP12b1 20 reps: T10 median / p95 | MP12b1 on these seeds: T10 median, response median | Before: T10 median / p95 | After: T10 median / p95 | Paired T10 ratio (median [min-max]) | Paired response ratio | Ten of n before / after | Opus | Astra |
|---|---|---|---|---|---|---|---|---|---|
| 12x12 Nightmare | 62.14 / 176.07 (ten of 20) | 57.72, 57.87 (ten of 1) | 53.12 / 53.12 (ten of 1) | 19.85 / 19.85 (ten of 1) | 2.68 [2.68-2.68] n 1 | 2.66 [2.66-2.66] n 1 | 1 of 1 / 1 of 1 | about 39-48 s | 44.5 s |
| Hell 1 26x26 | 108.72 / 167.59 (ten of 20) | 167.59, 156.88 (ten of 2) | 179.29 / 179.29 (ten of 2) | 34.24 / 40.37 (ten of 2) | 4.44 [4.44-4.44] n 1 | 4.81 [4.43-5.20] n 2 | 1 of 2 / 2 of 2 | about 28 s (if a window holds) | 50-60 s (if a window holds) |

T1, response and p95 of the response (median, s), before / after:

- 12x12 Nightmare: T1 21.78 / 3.47; response 53.29 / 20.01; p95 of the response 53.29 / 20.01; fewer puzzles in the after arm: none
- Hell 1 26x26: T1 61.14 / 6.21; response 163.24 / 34.41; p95 of the response 179.44 / 40.53; fewer puzzles in the after arm: none

## 12x12-nightmare (IGP-01/before / w760)

MP12b1 report: docs/difficulty-v3/landscape-v3-full/12x12-nightmare-2026-11-13.json; the before arm's response over MP12b1's on the same seeds: median 0.921.

| Seed | MP12b1 acc | MP12b1 T10 | MP12b1 resp | Before acc | Before T1 | Before T10 | Before resp | After acc | After T1 | After T10 | After resp | Identity (before vs MP12b1) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| landscape/12x12-nightmare/2 | 10 | 57.72 | 57.87 | 10 | 21.78 | 53.12 | 53.29 | 10 | 3.47 | 19.85 | 20.01 | puzzle identity (resultDigest equal at equal accepted counts, 10) |

### 12x12-nightmare: before arm, calls per stage

| Stage | Calls | Ok | No-window | Unfinished (profiles seen) | Profiles per call median / p90 / max | ms per call median / p90 | Work per call median / p90 | Outcomes |
|---|---:|---:|---:|---|---|---|---|---|
| set | 4 | 2 | 0 | 2 (17) | 12.0 / 14.0 / 14 | 20596 / 21650 | 6778.5 M / 7632.6 M | above 6, below 4, capped 25, central 2, in 4 |
| batch | 12 | 9 | 0 | 3 (5) | 6.0 / 12.0 / 12 | 12460 / 24587 | 4114.4 M / 8415.6 M | above 7, capped 38, central 9, in 9 |

### 12x12-nightmare: after arm, calls per stage

| Stage | Calls | Ok | No-window | Unfinished (profiles seen) | Profiles per call median / p90 / max | ms per call median / p90 | Work per call median / p90 | Outcomes |
|---|---:|---:|---:|---|---|---|---|---|
| set | 4 | 1 | 0 | 3 (7) | 2.0 / 2.0 / 2 | 3354 / 3354 | 1152.8 M / 1152.8 M | above 1, below 1, capped 2, central 1, in 4 |
| batch | 15 | 12 | 0 | 3 (14) | 2.0 / 4.0 / 8 | 3016 / 7442 | 940.1 M / 2252.2 M | above 3, below 8, capped 13, central 12, in 10 |

### 12x12-nightmare: the multipliers

- Dead-end entries (R10 before, R11 after), batch: 3 of 12 calls (25.0 %), 5 tuples, 8.0 % of the ms / 0 of 15 calls (0.0 %), 0 tuples, 0.0 % of the ms; set: 2 of 4 calls (50.0 %), 10 tuples, 27.7 % of the ms / 0 of 4 calls (0.0 %), 0 tuples, 0.0 % of the ms; both: 5 of 16 calls (31.3 %), 15 tuples, 15.8 % of the ms / 0 of 19 calls (0.0 %), 0 tuples, 0.0 % of the ms.
- Start-count capped share (R29, before arm): 39 of 53 p1 tuples at the start count (0.736) over 15 calls.
- Window profiles per ok call (R12), median / mean: before 6.0 / 7.45 (11 ok calls; all tuples of the call); after 0.0 / 1.15 (13 ok calls; phases window, p2, beam, rerate).
- Waves (proxy, R13), median: before 2.52 (n 1), after 5.43 (n 1). Set-stage share T1 / T10 (median): 0.410 / 0.175.
- Work per accepted puzzle, batch and completion (set stage added), median, M units: before 4152.2 (6831.0), after 1792.4 (2143.7); unfinished calls (unknown tails): 5 / 6 in 1 / 1 requests.
- Locate (R19, after arm): 13 calls; results hit 13; no-window proofs direct 13 (heuristic ends 0, never proofs); rescues in 0 calls, sides -; locate probes per call median 1.0, p90 2.0, max 2.
- Re-ratings (R18, after arm): per finished call mean 0.00, max 0; 0.0 % of the tuple ms, 0.0 % of the work.

## 26x26-hell-1 (IGP-01/before / w760)

MP12b1 report: docs/difficulty-v3/landscape-v3-full/26x26-hell-1-2026-11-14.json; the before arm's response over MP12b1's on the same seeds: median 1.038.

| Seed | MP12b1 acc | MP12b1 T10 | MP12b1 resp | Before acc | Before T1 | Before T10 | Before resp | After acc | After T1 | After T10 | After resp | Identity (before vs MP12b1) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| landscape/26x26-hell-1/0 | 5 | - | 146.01 | 5 | 31.92 | - | 147.05 | 10 | 6.14 | 28.12 | 28.29 | puzzle identity (resultDigest equal at equal accepted counts, 5) |
| landscape/26x26-hell-1/1 | 10 | 167.59 | 167.75 | 10 | 90.35 | 179.29 | 179.44 | 10 | 6.28 | 40.37 | 40.53 | puzzle identity (resultDigest equal at equal accepted counts, 10) |

### 26x26-hell-1: before arm, calls per stage

| Stage | Calls | Ok | No-window | Unfinished (profiles seen) | Profiles per call median / p90 / max | ms per call median / p90 | Work per call median / p90 | Outcomes |
|---|---:|---:|---:|---|---|---|---|---|
| set | 12 | 3 | 0 | 2 (16) | 20.0 / 20.0 / 20 | 43889 / 45076 | 15230.0 M / 15233.1 M | above 5, below 1, capped 180, central 3, in 6 |
| batch | 33 | 24 | 0 | 8 (50) | 10.0 / 26.0 / 41 | 21104 / 52440 | 6158.4 M / 15544.9 M | above 65, capped 236, central 23, in 45 |

### 26x26-hell-1: after arm, calls per stage

| Stage | Calls | Ok | No-window | Unfinished (profiles seen) | Profiles per call median / p90 / max | ms per call median / p90 | Work per call median / p90 | Outcomes |
|---|---:|---:|---:|---|---|---|---|---|
| set | 8 | 3 | 0 | 5 (10) | 3.0 / 4.0 / 4 | 5978 / 6136 | 2103.1 M / 2218.9 M | above 1, below 1, capped 14, central 3, in 1 |
| batch | 29 | 23 | 0 | 6 (21) | 4.0 / 15.0 / 18 | 6165 / 13497 | 2338.7 M / 5798.1 M | above 10, below 50, capped 62, central 22, in 19 |

### 26x26-hell-1: the multipliers

- Dead-end entries (R10 before, R11 after), batch: 13 of 33 calls (39.4 %), 63 tuples, 16.6 % of the ms / 0 of 29 calls (0.0 %), 0 tuples, 0.0 % of the ms; set: 9 of 12 calls (75.0 %), 120 tuples, 60.7 % of the ms / 0 of 8 calls (0.0 %), 0 tuples, 0.0 % of the ms; both: 22 of 45 calls (48.9 %), 183 tuples, 32.0 % of the ms / 0 of 37 calls (0.0 %), 0 tuples, 0.0 % of the ms.
- Start-count capped share (R29, before arm): 145 of 173 p1 tuples at the start count (0.838) over 44 calls.
- Window profiles per ok call (R12), median / mean: before 10.0 / 12.52 (27 ok calls; all tuples of the call); after 0.5 / 2.23 (26 ok calls; phases window, p2, beam, rerate).
- Waves (proxy, R13), median: before 4.09 (n 1), after 4.10 (n 2). Set-stage share T1 / T10 (median): 0.504 / 0.187.
- Work per accepted puzzle, batch and completion (set stage added), median, M units: before 18268.7 (26842.7), after 3712.3 (4380.1); unfinished calls (unknown tails): 10 / 11 in 2 / 2 requests.
- Locate (R19, after arm): 26 calls; results hit 22, window 4; no-window proofs direct 26 (heuristic ends 0, never proofs); rescues in 0 calls, sides -; locate probes per call median 3.0, p90 6.0, max 6.
- Re-ratings (R18, after arm): per finished call mean 0.00, max 0; 0.0 % of the tuple ms, 0.0 % of the work.
## Headline: IGP-01/after (p1p5-main) against w760 (p1p5-w760)

| Cell | Today, MP12b1 20 reps: T10 median / p95 | MP12b1 on these seeds: T10 median, response median | Before: T10 median / p95 | After: T10 median / p95 | Paired T10 ratio (median [min-max]) | Paired response ratio | Ten of n before / after | Opus | Astra |
|---|---|---|---|---|---|---|---|---|---|
| 12x12 Nightmare | 62.14 / 176.07 (ten of 20) | 57.72, 57.87 (ten of 1) | 5.74 / 5.74 (ten of 1) | 19.85 / 19.85 (ten of 1) | 0.29 [0.29-0.29] n 1 | 0.29 [0.29-0.29] n 1 | 1 of 1 / 1 of 1 | about 39-48 s | 44.5 s |
| Hell 1 26x26 | 108.72 / 167.59 (ten of 20) | 167.59, 156.88 (ten of 2) | 39.71 / 42.18 (ten of 2) | 34.24 / 40.37 (ten of 2) | 1.21 [0.92-1.50] n 2 | 1.21 [0.92-1.50] n 2 | 2 of 2 / 2 of 2 | about 28 s (if a window holds) | 50-60 s (if a window holds) |

T1, response and p95 of the response (median, s), before / after:

- 12x12 Nightmare: T1 1.56 / 3.47; response 5.85 / 20.01; p95 of the response 5.85 / 20.01; fewer puzzles in the after arm: none
- Hell 1 26x26: T1 8.55 / 6.21; response 39.89 / 34.41; p95 of the response 42.36 / 40.53; fewer puzzles in the after arm: none

## Study of the W variants, the no-screen arm and arity 3 (IGP-03)

The per-W, split, shift and offset tables rest on the matched seeds of each cell (two seeds on 14x14 and 12x12 Nightmare and on Hell 1 26x26, five on 26x26 Master): **a two-seed indication** (five-seed on Master), not an estimate of a factor or a rate. PM4 (IGP-02) carries the per-W economics. No `W_screen` is recommended here: the least-work W is descriptive, and the choice waits for the answer to IG-P-Q17 and the frozen round.

Journal checks: w760 passes (159 calls, every start line has W 760 M, 0 screen outcomes (scap0, scap1, over), 0 re-rating tuples).


### 12x12 Nightmare: seeds 2, 3, 4, 5

#### Per W (R16, R18)

| Arm | Ten of n | T10 median s | Response median s | Work per accepted puzzle, batch and completion, M units (median) | With the set stage, M units | Profiles per accepted puzzle (median) | Unfinished calls |
|---|---|---:|---:|---:|---:|---:|---:|
| today (before) | 1 of 1 | 53.12 | 53.29 | 4152.2 | 6831.0 | 10.4 | 5 |
| IGP-01 after (W 190 M) | 1 of 1 | 5.74 | 5.85 | 418.0 | 554.8 | 3.5 | 5 |
| no screen (W 760 M) | 4 of 4 | 24.17 | 24.34 | 2210.0 | 2676.0 | 5.8 | 20 |

Least median work per accepted puzzle with the set stage on these seeds (descriptive, R16): IGP-01 after (W 190 M), 554.8 M units. It is not a recommendation.

| Arm | Capped probes: screen / canonical (of probes) | Re-ratings per call: mean (max) | Re-ratings, share of the work | Re-rated probes in band (of re-rated): a lower bound of the useful ratings lost | IGP-02 (PM4) at this W: useful lost (of) | PM4 P2 saving | PM4 time per useful rating, canonical → with the screen, s |
|---|---|---|---|---|---|---|---|
| today (before) | 0 / 63 (104) | - | - | - | - | - | - |
| IGP-01 after (W 190 M) | 18 / 0 (35) | 0.00 (0) | 0.0 % | 0 of 0 | 7 of 9 | 1.97 | 11.18 → 5.69 |
| no screen (W 760 M) | 0 / 62 (216) | 0.00 (0) | 0.0 % | 0 of 0 | - | - | - |

#### Population of the accepted puzzles (R32)

| Arm | Puzzles | Clue share p10 / median / p90 | Median clues (median K) | U median | Score position median (0.5 is the centre) | Central share |
|---|---:|---|---|---:|---:|---:|
| today (before) | 10 | 0.105 / 0.184 / 0.211 | 3.5 (19.0) | 15.5 | 0.65 | 100 % |
| IGP-01 after (W 190 M) | 10 | 0.211 / 0.263 / 0.316 | 5.0 (19.0) | 14.0 | 0.42 | 100 % |
| no screen (W 760 M) | 40 | 0.211 / 0.238 / 0.333 | 5.0 (20.0) | 15.0 | 0.54 | 100 % |
| MP12b1, 20 reps | 185 | 0.158 / 0.211 / 0.250 | 4.0 (19.0) | 16.0 | 0.63 | 98 % |

#### The split (R33): before → no screen → 190 M (a four-seed indication)

| Arm | Ten of n | T10 median s | Response median s | Median clue share |
|---|---|---:|---:|---:|
| today (before) | 1 of 1 | 53.12 | 53.29 | 0.184 |
| no screen (W 760 M) | 4 of 4 | 24.17 | 24.34 | 0.238 |
| IGP-01 after (W 190 M) | 1 of 1 | 5.74 | 5.85 | 0.263 |

| Step (ratio = from / to; above 1 is faster) | T10 ratio, median [min-max] n | Response ratio, median [min-max] n | Ten of n, from / to | Median clue share, to − from |
|---|---|---|---|---:|
| today (before) → no screen (W 760 M) (the search without the screen: P1, P3, P4) | 2.68 [2.68-2.68] n 1 | 2.66 [2.66-2.66] n 1 | 1 / 1 of 1 | 0.054 |
| no screen (W 760 M) → IGP-01 after (W 190 M) (the screen) | 3.46 [3.46-3.46] n 1 | 3.42 [3.42-3.42] n 1 | 1 / 1 of 1 | 0.025 |
| today (before) → IGP-01 after (W 190 M) | 9.26 [9.26-9.26] n 1 | 9.10 [9.10-9.10] n 1 | 1 / 1 of 1 | 0.079 |

#### Which set each request was served on, and the same-set clue shift (a four-seed indication)

| Seed | today (before) | IGP-01 after (W 190 M) | no screen (W 760 M) |
|---|---|---|---|
| 2 | attempt 0 | attempt 0 (same set) | attempt 0 (same set) |
| 3 | - | - | attempt 0 |
| 4 | - | - | attempt 0 |
| 5 | - | - | attempt 0 |

| Arm | Served on an earlier set than the before arm's | On the same set | On a later set | Same-set median clue shift against the before arm, per request (median, n) | Against the no-screen arm, per request (median, n) |
|---|---:|---:|---:|---|---|
| IGP-01 after (W 190 M) | 0 of 1 | 1 | 0 | 2: +1.5 (1.5, n 1) | 2: +0.5 (0.5, n 1) |
| no screen (W 760 M) | 0 of 4 | 4 | 0 | 2: +1.0 (1.0, n 1) | - |

#### Accepted puzzles and probes by clue offset from today's start count (a four-seed indication)

| Offset | today (before): accepted | IGP-01 after (W 190 M): accepted | no screen (W 760 M): accepted | today (before): probes (capped, in band, median ms) | IGP-01 after (W 190 M): probes (capped, in band, median ms) | no screen (W 760 M): probes (capped, in band, median ms) | PM4 canonical (IGP-02): profiles (capped, useful, median ms) |
|---|---:|---:|---:|---|---|---|---|
| <0 | 1 | 0 | 0 | 4 (50 %, 25 %, 2518) | 0 | 0 | 2 (100 %, 0, 2121) |
| 0 | 4 | 0 | 0 | 77 (70 %, 19 %, 2172) | 0 | 0 | 29 (76 %, 2, 2264) |
| 1 | 4 | 2 | 16 | 20 (35 %, 30 %, 2085) | 17 (76 %, 24 %, 641) | 99 (41 %, 42 %, 2115) | 23 (13 %, 7, 2474) |
| 2 | 1 | 4 | 12 | 3 (0 %, 67 %, 1238) | 11 (45 %, 45 %, 591) | 57 (37 %, 49 %, 2255) | 16 (13 %, 6, 955) |
| 3 | 0 | 3 | 4 | 0 | 3 (0 %, 100 %, 471) | 26 (0 %, 27 %, 413) | 16 (0 %, 7, 573) |
| 4 | 0 | 1 | 8 | 0 | 4 (0 %, 25 %, 182) | 34 (0 %, 59 %, 113) | 12 (0 %, 8, 148) |
| >4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

Offset = clue count − today's start count of the request's set (the `startCount` of the journal start lines). Probes are every rating attempt of the cohort's calls except re-ratings; capped = screen-capped (scap0, scap1, over) or canonically capped; in band = a rating inside the score band, not refused by AR1.

### Hell 1 26x26: seeds 0, 1

#### Per W (R16, R18)

| Arm | Ten of n | T10 median s | Response median s | Work per accepted puzzle, batch and completion, M units (median) | With the set stage, M units | Profiles per accepted puzzle (median) | Unfinished calls |
|---|---|---:|---:|---:|---:|---:|---:|
| today (before) | 1 of 2 | 179.29 | 163.24 | 18268.7 | 26842.7 | 39.8 | 10 |
| IGP-01 after (W 380 M) | 2 of 2 | 39.71 | 39.89 | 3777.9 | 4551.5 | 17.1 | 10 |
| no screen (W 760 M) | 2 of 2 | 34.24 | 34.41 | 3712.3 | 4380.1 | 9.2 | 11 |

Least median work per accepted puzzle with the set stage on these seeds (descriptive, R16): no screen (W 760 M), 4380.1 M units. It is not a recommendation.

| Arm | Capped probes: screen / canonical (of probes) | Re-ratings per call: mean (max) | Re-ratings, share of the work | Re-rated probes in band (of re-rated): a lower bound of the useful ratings lost | IGP-02 (PM4) at this W: useful lost (of) | PM4 P2 saving | PM4 time per useful rating, canonical → with the screen, s |
|---|---|---|---|---|---|---|---|
| today (before) | 0 / 416 (564) | - | - | - | - | - | - |
| IGP-01 after (W 380 M) | 120 / 0 (341) | 0.00 (0) | 0.0 % | 0 of 0 | 1 of 2 | 1.77 | 72.12 → 40.67 |
| no screen (W 760 M) | 0 / 76 (183) | 0.00 (0) | 0.0 % | 0 of 0 | - | - | - |

#### Population of the accepted puzzles (R32)

| Arm | Puzzles | Clue share p10 / median / p90 | Median clues (median K) | U median | Score position median (0.5 is the centre) | Central share |
|---|---:|---|---|---:|---:|---:|
| today (before) | 15 | 0.103 / 0.128 / 0.154 | 5.0 (39.0) | 34.0 | 0.54 | 93 % |
| IGP-01 after (W 380 M) | 20 | 0.143 / 0.195 / 0.244 | 8.0 (41.5) | 33.0 | 0.43 | 95 % |
| no screen (W 760 M) | 20 | 0.143 / 0.195 / 0.244 | 8.0 (41.5) | 33.0 | 0.43 | 95 % |
| MP12b1, 20 reps | 134 | 0.100 / 0.128 / 0.154 | 5.0 (39.0) | 34.0 | 0.57 | 96 % |

#### The split (R33): before → no screen → 380 M (a two-seed indication)

| Arm | Ten of n | T10 median s | Response median s | Median clue share |
|---|---|---:|---:|---:|
| today (before) | 1 of 2 | 179.29 | 163.24 | 0.128 |
| no screen (W 760 M) | 2 of 2 | 34.24 | 34.41 | 0.195 |
| IGP-01 after (W 380 M) | 2 of 2 | 39.71 | 39.89 | 0.195 |

| Step (ratio = from / to; above 1 is faster) | T10 ratio, median [min-max] n | Response ratio, median [min-max] n | Ten of n, from / to | Median clue share, to − from |
|---|---|---|---|---:|
| today (before) → no screen (W 760 M) (the search without the screen: P1, P3, P4) | 4.44 [4.44-4.44] n 1 | 4.81 [4.43-5.20] n 2 | 1 / 2 of 2 | 0.067 |
| no screen (W 760 M) → IGP-01 after (W 380 M) (the screen) | 0.88 [0.67-1.08] n 2 | 0.88 [0.67-1.08] n 2 | 2 / 2 of 2 | 0.000 |
| today (before) → IGP-01 after (W 380 M) | 4.81 [4.81-4.81] n 1 | 4.13 [3.47-4.79] n 2 | 1 / 2 of 2 | 0.067 |

#### Which set each request was served on, and the same-set clue shift (a two-seed indication)

| Seed | today (before) | IGP-01 after (W 380 M) | no screen (W 760 M) |
|---|---|---|---|
| 0 | attempt 0 | attempt 0 (same set) | attempt 0 (same set) |
| 1 | attempt 7 | attempt 0 (earlier set) | attempt 0 (earlier set) |

| Arm | Served on an earlier set than the before arm's | On the same set | On a later set | Same-set median clue shift against the before arm, per request (median, n) | Against the no-screen arm, per request (median, n) |
|---|---:|---:|---:|---|---|
| IGP-01 after (W 380 M) | 1 of 2 | 1 | 0 | 0: +2.5 (2.5, n 1) | 0: +1.0, 1: +0.5 (0.8, n 2) |
| no screen (W 760 M) | 1 of 2 | 1 | 0 | 0: +1.5 (1.5, n 1) | - |

#### Accepted puzzles and probes by clue offset from today's start count (a two-seed indication)

| Offset | today (before): accepted | IGP-01 after (W 380 M): accepted | no screen (W 760 M): accepted | today (before): probes (capped, in band, median ms) | IGP-01 after (W 380 M): probes (capped, in band, median ms) | no screen (W 760 M): probes (capped, in band, median ms) | PM4 canonical (IGP-02): profiles (capped, useful, median ms) |
|---|---:|---:|---:|---|---|---|---|
| <0 | 0 | 0 | 0 | 13 (92 %, 0 %, 2278) | 0 | 0 | 1 (100 %, 0, 2245) |
| 0 | 2 | 0 | 0 | 402 (87 %, 4 %, 2205) | 0 | 0 | 65 (98 %, 1, 2108) |
| 1 | 6 | 0 | 1 | 115 (40 %, 35 %, 2048) | 50 (86 %, 6 %, 1186) | 36 (86 %, 6 %, 2107) | 14 (86 %, 1, 2182) |
| 2 | 6 | 4 | 4 | 32 (28 %, 53 %, 1480) | 46 (72 %, 22 %, 1152) | 41 (59 %, 27 %, 1934) | 12 (58 %, 5, 2131) |
| 3 | 1 | 1 | 2 | 2 (0 %, 100 %, 1838) | 6 (33 %, 50 %, 970) | 9 (33 %, 56 %, 1629) | 12 (58 %, 4, 1904) |
| 4 | 0 | 6 | 6 | 0 | 47 (43 %, 38 %, 871) | 21 (38 %, 33 %, 1295) | 12 (33 %, 5, 1752) |
| >4 | 0 | 9 | 7 | 0 | 192 (11 %, 28 %, 607) | 76 (13 %, 26 %, 608) | 0 |

Offset = clue count − today's start count of the request's set (the `startCount` of the journal start lines). Probes are every rating attempt of the cohort's calls except re-ratings; capped = screen-capped (scap0, scap1, over) or canonically capped; in band = a rating inside the score band, not refused by AR1.

### Hell 1 20x20: arm only, no before partner (IGP-03h/w760, a two-request indication)

IGP-01 has no before arm on this cell, so the arm is read by itself, beside MP12b1 prescreen on the same seeds (`docs/difficulty-v3/landscape-v3-full/20x20-hell-1-s3-2026-11-14.json`) and, where given, PM1's windows (IGP-05). Offsets are clue counts less today's start count. "Rating-censored" counts accepted puzzles whose rating is an estimate (a census stopped at its relative budget, R27); "child-limit cut" is a request stopped at the row limit.

| Seed | Accepted | T1 s | T10 s | Response s | Ended | Child-limit cut | Rating-censored | K | Start count | Set attempt | MP12b1 prescreen: accepted / T1 s / T10 s / response s / ended |
|---|---:|---:|---:|---:|---|---|---:|---:|---:|---:|---|
| 0 | 10 | 5.98 | 48.92 | 49.08 | complete | no | 2 of 10 | 42 | 4 | 0 | 0 / - / - / 115.01 / set:time-limit |
| 1 | 10 | 8.32 | 36.86 | 37.02 | complete | no | 5 of 10 | 38 | 4 | 0 | 0 / - / - / 115.02 / set:time-limit |

Ten of n: 2 of 2; MP12b1 prescreen: 0 of 2 on the same seeds (3 requests in the report). T1 median 7.15 s, T10 median 42.89 s, response median 43.05 s. Accepted puzzles 20; rating-censored 7 of 20 (35 %).

| Source | Puzzles | Clue share p10 / median / p90 | Median clues (K) | Offset min / median / max | Score position median (0.5 is the centre) | Central share |
|---|---:|---|---|---|---:|---:|
| IGP-03h/w760: accepted puzzles | 20 | 0.289 / 0.357 / 0.405 | 14.5 (40.0) | 6 / 10.5 / 18 | 0.36 | 95 % |
| PM1 (IGP-05): in-band ratings of the cell | 11 | 0.296 / 0.370 / 0.444 | 15.0 (40.5) | 7 / 11.0 / 14 | 0.49 | 55 % |

PM1's windows on this cell (IGP-05, `ig-pm1` seeds, two sets of K 40.5, today's start count 4, band [77, 112)): 11 in-band ratings (11 eligible) of 44 ratings, 12 capped, in 4 of 4 families; main work above 95 / 190 / 380 M: 7 of 11 / 6 of 11 / 2 of 11 in-band ratings; 3.6 s of rating per in-band rating.

Locate and calls, per stage (locate probes are the rated counts of phase A; the first in-band profile is the first rating of the call inside the band and not refused by AR1):

| Stage | Calls | Ok | No-window | Unfinished | Locate probes per finished call: median / p90 / max | Per ok call: median / max | Profiles per finished call: median / max | Ok calls with an in-band profile | First in-band: probe no. median [range] | Clue count median [range] | Offset median [range] |
|---|---:|---:|---:|---:|---|---|---|---:|---|---|---|
| set | 8 | 4 | 0 | 4 | 7.0 / 7.0 / 7 | 7.0 / 7 | 7.0 / 8 | 4 | 7.0 [6-8] | 15.0 [13-17] | 11.0 [9-13] |
| batch | 36 | 29 | 0 | 7 | 6.0 / 7.0 / 7 | 6.0 / 7 | 7.0 / 28 | 29 | 6.0 [4-13] | 14.0 [10-22] | 10.0 [6-18] |

Every call (rep, call, stage, set attempt, K, start of the locate, result, locate probes, profiles, journaled locate hit, first in-band profile as probe no. / count / offset / score, ms, locate path as count:outcome):

| Rep | Call | Stage | Attempt | K | c0 | Result | Locate probes | Profiles | Locate hit | First in-band | ms | Locate path |
|---:|---|---|---:|---:|---:|---|---:|---:|---:|---|---:|---|
| 0 | 20x20-hell-1~0:18524:1:1 | set | 0 | 42 | 34 | ok | 7 | 7 | 17 | 7 / 17 / +13 / 94 | 5842 | 34:ar1 26:ar1 10:capped 18:below 14:capped 16:capped 17:central |
| 0 | 20x20-hell-1~0:18524:1:2 | batch | - | 42 | 34 | ok | 6 | 6 | 16 | 6 / 16 / +12 / 88 | 7975 | 34:ar1 26:below 10:capped 18:below 14:capped 16:central |
| 0 | 20x20-hell-1~0:18524:1:3 | batch | - | 42 | 34 | ok | 7 | 7 | 17 | 7 / 17 / +13 / 97 | 6533 | 34:ar1 26:ar1 10:capped 18:below 14:capped 16:capped 17:central |
| 0 | 20x20-hell-1~0:18524:1:4 | batch | - | 42 | 34 | ok | 6 | 12 | 16 | 6 / 16 / +12 / 107 | 15386 | 34:ar1 26:below 10:capped 18:below 14:capped 16:in |
| 0 | 20x20-hell-1~0:18524:1:5 | batch | - | 42 | 34 | ok | 7 | 8 | - | 8 / 17 / +13 / 88 | 6109 | 34:ar1 26:ar1 10:capped 18:below 14:capped 16:capped 17:below |
| 0 | 20x20-hell-1~0:18524:1:6 | batch | - | 42 | - | unfinished | 7 | 7 | - | 7 / 13 / +9 / 104 | - | 34:ar1 26:ar1 10:capped 18:ar1 14:below 12:capped 13:in |
| 0 | 20x20-hell-1~0:18524:2:1 | set | 1 | 38 | - | unfinished | 6 | 6 | - | 6 / 12 / +8 / 106 | - | 30:ar1 22:ar1 6:capped 14:below 10:capped 12:in |
| 0 | 20x20-hell-1~0:18524:3:1 | set | 2 | 41 | - | unfinished | 4 | 10 | - | 4 / 17 / +13 / 82 | - | 33:ar1 25:below 9:capped 17:in |
| 0 | 20x20-hell-1~0:18524:4:1 | set | 3 | 39 | - | unfinished | 6 | 6 | - | - | - | 31:ar1 23:below 7:capped 15:below 11:capped 13:capped |
| 0 | 20x20-hell-1~0:18524:5:1 | batch | - | 42 | 34 | ok | 5 | 18 | 22 | 5 / 22 / +18 / 77 | 5097 | 34:ar1 26:below 10:capped 18:capped 22:in |
| 0 | 20x20-hell-1~0:18524:5:2 | batch | - | 42 | 34 | ok | 6 | 25 | 12 | 6 / 12 / +8 / 105 | 37633 | 34:ar1 26:ar1 10:capped 18:below 14:below 12:in |
| 0 | 20x20-hell-1~0:18524:5:3 | batch | - | 42 | - | unfinished | 0 | 0 | - | - | - |  |
| 0 | 20x20-hell-1~0:18524:6:1 | batch | - | 42 | 34 | ok | 7 | 7 | 15 | 7 / 15 / +11 / 99 | 7360 | 34:ar1 26:below 10:capped 18:below 14:capped 16:below 15:central |
| 0 | 20x20-hell-1~0:18524:6:2 | batch | - | 42 | 34 | ok | 6 | 6 | 16 | 6 / 16 / +12 / 95 | 5637 | 34:ar1 26:ar1 10:capped 18:below 14:capped 16:central |
| 0 | 20x20-hell-1~0:18524:6:3 | batch | - | 42 | 34 | ok | 7 | 7 | 15 | 7 / 15 / +11 / 93 | 8058 | 34:ar1 26:ar1 10:capped 18:below 14:capped 16:below 15:central |
| 0 | 20x20-hell-1~0:18524:6:4 | batch | - | 42 | 34 | ok | 5 | 28 | 22 | 5 / 22 / +18 / 77 | 11993 | 34:ar1 26:below 10:capped 18:capped 22:in |
| 0 | 20x20-hell-1~0:18524:6:5 | batch | - | 42 | 34 | ok | 6 | 6 | 16 | 6 / 16 / +12 / 89 | 6082 | 34:ar1 26:below 10:capped 18:below 14:capped 16:central |
| 0 | 20x20-hell-1~0:18524:6:6 | batch | - | 42 | - | unfinished | 4 | 4 | - | - | - | 34:ar1 26:ar1 10:capped 18:below |
| 0 | 20x20-hell-1~0:18524:7:1 | batch | - | 42 | 34 | ok | 7 | 10 | - | 10 / 20 / +16 / 86 | 7625 | 34:ar1 26:ar1 10:capped 18:capped 22:below 20:below 19:capped |
| 0 | 20x20-hell-1~0:18524:7:2 | batch | - | 42 | 34 | ok | 6 | 11 | 16 | 6 / 16 / +12 / 77 | 10103 | 34:ar1 26:ar1 10:capped 18:below 14:capped 16:in |
| 0 | 20x20-hell-1~0:18524:7:3 | batch | - | 42 | 34 | ok | 7 | 7 | 13 | 7 / 13 / +9 / 89 | 7575 | 34:ar1 26:ar1 10:capped 18:below 14:below 12:capped 13:central |
| 0 | 20x20-hell-1~0:18524:7:4 | batch | - | 42 | 34 | ok | 5 | 6 | 14 | 5 / 14 / +10 / 81 | 3884 | 34:ar1 26:below 10:capped 18:below 14:in |
| 0 | 20x20-hell-1~0:18524:7:5 | batch | - | 42 | 34 | ok | 4 | 4 | 18 | 4 / 18 / +14 / 88 | 2054 | 34:ar1 26:below 10:capped 18:central |
| 0 | 20x20-hell-1~0:18524:7:6 | batch | - | 42 | 34 | ok | 6 | 6 | 16 | 6 / 16 / +12 / 86 | 7595 | 34:ar1 26:below 10:capped 18:below 14:capped 16:central |
| 0 | 20x20-hell-1~0:18524:7:7 | batch | - | 42 | - | unfinished | 4 | 4 | - | - | - | 34:ar1 26:below 10:capped 18:below |
| 1 | 20x20-hell-1~1:5032:1:1 | set | 0 | 38 | 30 | ok | 7 | 8 | - | 8 / 15 / +11 / 88 | 8193 | 30:ar1 22:ar1 6:capped 14:capped 18:below 16:below 15:below |
| 1 | 20x20-hell-1~1:5032:1:2 | batch | - | 38 | 30 | ok | 4 | 4 | 14 | 4 / 14 / +10 / 88 | 3056 | 30:ar1 22:below 6:capped 14:central |
| 1 | 20x20-hell-1~1:5032:1:3 | batch | - | 38 | 30 | ok | 6 | 14 | 12 | 6 / 12 / +8 / 84 | 13622 | 30:ar1 22:ar1 6:capped 14:below 10:capped 12:in |
| 1 | 20x20-hell-1~1:5032:1:4 | batch | - | 38 | 30 | ok | 7 | 7 | 11 | 7 / 11 / +7 / 103 | 5543 | 30:ar1 22:ar1 6:capped 14:below 10:capped 12:below 11:central |
| 1 | 20x20-hell-1~1:5032:1:5 | batch | - | 38 | 30 | ok | 4 | 4 | 14 | 4 / 14 / +10 / 103 | 3616 | 30:ar1 22:ar1 6:capped 14:central |
| 1 | 20x20-hell-1~1:5032:1:6 | batch | - | 38 | - | unfinished | 3 | 3 | - | - | - | 30:ar1 22:ar1 6:capped |
| 1 | 20x20-hell-1~1:5032:2:1 | set | 1 | 41 | 33 | ok | 6 | 6 | 15 | 6 / 15 / +11 / 100 | 6810 | 33:ar1 25:ar1 9:capped 17:below 13:capped 15:central |
| 1 | 20x20-hell-1~1:5032:2:2 | batch | - | 38 | 30 | ok | 4 | 4 | 14 | 4 / 14 / +10 / 86 | 3694 | 30:ar1 22:ar1 6:capped 14:central |
| 1 | 20x20-hell-1~1:5032:2:3 | batch | - | 38 | 30 | ok | 5 | 5 | 10 | 5 / 10 / +6 / 87 | 4302 | 30:ar1 22:ar1 6:capped 14:below 10:central |
| 1 | 20x20-hell-1~1:5032:2:4 | batch | - | 38 | 30 | ok | 7 | 13 | - | 13 / 11 / +7 / 97 | 20393 | 30:ar1 22:ar1 6:capped 14:below 10:capped 12:below 11:capped |
| 1 | 20x20-hell-1~1:5032:3:1 | set | 2 | 42 | 34 | ok | 7 | 7 | 13 | 7 / 13 / +9 / 89 | 6792 | 34:ar1 26:ar1 10:capped 18:below 14:below 12:capped 13:central |
| 1 | 20x20-hell-1~1:5032:3:2 | batch | - | 38 | 30 | ok | 6 | 17 | 12 | 6 / 12 / +8 / 79 | 20113 | 30:ar1 22:ar1 6:capped 14:below 10:capped 12:in |
| 1 | 20x20-hell-1~1:5032:3:3 | batch | - | 38 | 30 | ok | 4 | 4 | 14 | 4 / 14 / +10 / 90 | 3591 | 30:ar1 22:below 6:capped 14:central |
| 1 | 20x20-hell-1~1:5032:3:4 | batch | - | 38 | - | unfinished | 5 | 5 | - | - | - | 30:ar1 22:below 6:capped 14:below 10:capped |
| 1 | 20x20-hell-1~1:5032:4:1 | set | 3 | 41 | - | unfinished | 7 | 7 | - | 7 / 14 / +10 / 83 | - | 33:ar1 25:ar1 9:capped 17:below 13:capped 15:below 14:in |
| 1 | 20x20-hell-1~1:5032:5:1 | batch | - | 38 | 30 | ok | 7 | 9 | - | 8 / 13 / +9 / 106 | 8443 | 30:ar1 22:below 6:capped 14:below 10:capped 12:capped 13:below |
| 1 | 20x20-hell-1~1:5032:5:2 | batch | - | 38 | 30 | ok | 7 | 11 | - | 11 / 13 / +9 / 87 | 8718 | 30:ar1 22:ar1 6:capped 14:below 10:capped 12:capped 13:below |
| 1 | 20x20-hell-1~1:5032:5:3 | batch | - | 38 | 30 | ok | 6 | 7 | 12 | 6 / 12 / +8 / 77 | 5921 | 30:ar1 22:below 6:capped 14:below 10:capped 12:in |
| 1 | 20x20-hell-1~1:5032:5:4 | batch | - | 38 | - | unfinished | 4 | 4 | - | - | - | 30:ar1 22:ar1 6:capped 14:below |

### 12x12 Nightmare: the screen against no screen, by seed, all seeds (R33; 1 seed)

Paired by seed and by variant role, never by tree id. No screen (`p1p5-w760`) from IGP-03h/w760; the screen at 190 M (`p1p5-main`) from IGP-01/after; today is MP12b1's record of the same seeds. Cells are accepted / T10 s / response s (T10 is blank where a request did not reach ten). Ratios above 1 mean the first named arm is slower. A set is "the same" when `igSetKey` is equal.

| Rep | Today (MP12b1) | No screen | Screen | T10 no screen / screen | Response no screen / screen | T10 today / no screen | T10 today / screen | Set attempt: today / no screen / screen | Same set (no screen, screen) | Median clues: today / no screen / screen | Screen − no screen, same set: clues, share |
|---:|---|---|---|---:|---:|---:|---:|---|---|---|---|
| 2 | 10 / 57.72 / 57.87 | 10 / 19.85 / 20.01 | 10 / 5.74 / 5.85 | 3.46 | 3.42 | 2.91 | 10.06 | 0 / 0 / 0 | same | 3.5 / 4.5 / 5.0 | +0.5, +0.026 |

Ten of n: today 1 of 1, no screen 1, screen 1. T10 ratio no screen / screen: median 3.46 [3.46-3.46], geometric mean 3.46, n 1; response ratio: median 3.42 [3.42-3.42], geometric mean 3.42, n 1; today / no screen: median 2.91 [2.91-2.91], geometric mean 2.91, n 1; today / screen: median 10.06 [10.06-10.06], geometric mean 10.06, n 1. On the 1 of 1 seeds served on the same set by both arms, the screen's clue shift (screen − no screen) has median 0.5 clues (n 1) and 0.026 of K.

| Population of the accepted puzzles | Puzzles | Clue share p10 / median / p90 | Median clues (K) | Score position median | Central share |
|---|---:|---|---|---:|---:|
| Today, MP12b1, these seeds | 10 | 0.105 / 0.184 / 0.211 | 3.5 (19.0) | 0.65 | 100 % |
| No screen | 10 | 0.211 / 0.237 / 0.263 | 4.5 (19.0) | 0.52 | 100 % |
| Screen | 10 | 0.211 / 0.263 / 0.316 | 5.0 (19.0) | 0.42 | 100 % |
| MP12b1, all reps | 185 | 0.158 / 0.211 / 0.250 | 4.0 (19.0) | 0.63 | 98 % |

### Hell 1 26x26: the screen against no screen, by seed, all seeds (R33; 2 seeds)

Paired by seed and by variant role, never by tree id. No screen (`p1p5-w760`) from IGP-03h/w760; the screen at 380 M (`p1p5-main`) from IGP-01/after; today is MP12b1's record of the same seeds. Cells are accepted / T10 s / response s (T10 is blank where a request did not reach ten). Ratios above 1 mean the first named arm is slower. A set is "the same" when `igSetKey` is equal.

| Rep | Today (MP12b1) | No screen | Screen | T10 no screen / screen | Response no screen / screen | T10 today / no screen | T10 today / screen | Set attempt: today / no screen / screen | Same set (no screen, screen) | Median clues: today / no screen / screen | Screen − no screen, same set: clues, share |
|---:|---|---|---|---:|---:|---:|---:|---|---|---|---|
| 0 | 5 / - / 146.01 | 10 / 28.12 / 28.29 | 10 / 42.18 / 42.36 | 0.67 | 0.67 | - | - | 0 / 0 / 0 | same | 5.0 / 6.5 / 7.5 | +1.0, +0.024 |
| 1 | 10 / 167.59 / 167.75 | 10 / 40.37 / 40.53 | 10 / 37.25 / 37.43 | 1.08 | 1.08 | 4.15 | 4.50 | 7 / 0 / 0 | same | 6.0 / 8.5 / 9.0 | +0.5, +0.012 |

Ten of n: today 1 of 2, no screen 2, screen 2. T10 ratio no screen / screen: median 0.88 [0.67-1.08], geometric mean 0.85, n 2; response ratio: median 0.88 [0.67-1.08], geometric mean 0.85, n 2; today / no screen: median 4.15 [4.15-4.15], geometric mean 4.15, n 1; today / screen: median 4.50 [4.50-4.50], geometric mean 4.50, n 1. On the 2 of 2 seeds served on the same set by both arms, the screen's clue shift (screen − no screen) has median 0.8 clues (n 2) and 0.018 of K.

| Population of the accepted puzzles | Puzzles | Clue share p10 / median / p90 | Median clues (K) | Score position median | Central share |
|---|---:|---|---|---:|---:|
| Today, MP12b1, these seeds | 15 | 0.103 / 0.128 / 0.154 | 5.0 (39.0) | 0.54 | 93 % |
| No screen | 20 | 0.143 / 0.195 / 0.244 | 8.0 (41.5) | 0.43 | 95 % |
| Screen | 20 | 0.143 / 0.195 / 0.244 | 8.0 (41.5) | 0.43 | 95 % |
| MP12b1, all reps | 134 | 0.100 / 0.128 / 0.154 | 5.0 (39.0) | 0.57 | 96 % |

## Values of the §5 rows

| Row | Kind | Formula | Value |
|---|---|---|---|
| R16 | Measured; Derived | median work per accepted puzzle (batch and completion; with the set stage) per W and cell; the W with the least median is descriptive | `{"12x12-nightmare":{"least":"main","perW":[{"role":"before","W":null,"t10":{"n":1,"min":53119.1632,"median":53119.1632,"p95":53119.1632,"max":53119.1632},"reached":"1 of 1","workWithSet":6830969806.6,"workWithoutSet":4152219932},{"role":"main","W":190000000,"t10":{"n":1,"min":5735.4231,"median":5735.4231,"p95":5735.4231,"max":5735.4231},"reached":"1 of 1","workWithSet":554773469.7,"workWithoutSet":418013165.2},{"role":"w760","W":760000000,"t10":{"n":4,"min":11776.681600000002,"median":24167.952100000002,"p95":31448.494199999997,"max":31448.494199999997},"reached":"4 of 4","workWithSet":2676016578.95,"workWithoutSet":2209976689.75}]},"26x26-hell-1":{"least":"w760","perW":[{"role":"before","W":null,"t10":{"n":1,"min":179294.37329999998,"median":179294.37329999998,"p95":179294.37329999998,"max":179294.37329999998},"reached":"1 of 2","workWithSet":26842650840.300003,"workWithoutSet":18268706610.65},{"role":"main","W":380000000,"t10":{"n":2,"min":37245.4423,"median":39710.577900000004,"p95":42175.7135,"max":42175.7135},"reached":"2 of 2","workWithSet":4551535463.35,"workWithoutSet":3777880770.65},{"role":"w760","W":760000000,"t10":{"n":2,"min":28122.7752,"median":34244.015,"p95":40365.2548,"max":40365.2548},"reached":"2 of 2","workWithSet":4380072029.45,"workWithoutSet":3712319501.55}]}}` |
| R18 | Derived | re-ratings per call and their share of the work; re-rated probes in band per W and cell | `{"12x12-nightmare":[{"role":"before","rerates":null,"reRated":{"n":0,"inBand":0}},{"role":"main","rerates":{"callsFinished":10,"perCallMean":0,"perCallMax":0,"msShare":0,"workShare":0},"reRated":{"n":0,"inBand":0}},{"role":"w760","rerates":{"callsFinished":58,"perCallMean":0,"perCallMax":0,"msShare":0,"workShare":0},"reRated":{"n":0,"inBand":0}}],"26x26-hell-1":[{"role":"before","rerates":null,"reRated":{"n":0,"inBand":0}},{"role":"main","rerates":{"callsFinished":34,"perCallMean":0,"perCallMax":0,"msShare":0,"workShare":0},"reRated":{"n":0,"inBand":0}},{"role":"w760","rerates":{"callsFinished":26,"perCallMean":0,"perCallMax":0,"msShare":0,"workShare":0},"reRated":{"n":0,"inBand":0}}]}` |
| R32 | Measured; Derived | population of the accepted puzzles per W and cell (clue share p10 / median / p90, position, central share) | `{"12x12-nightmare":{"before":{"puzzles":10,"share":{"n":10,"min":0.10526315789473684,"p10":0.10526315789473684,"p25":0.15789473684210525,"median":0.18421052631578946,"p75":0.21052631578947367,"p90":0.21052631578947367,"max":0.2631578947368421},"position":0.6458333333333333,"central":1},"main":{"puzzles":10,"share":{"n":10,"min":0.21052631578947367,"p10":0.21052631578947367,"p25":0.2631578947368421,"median":0.2631578947368421,"p75":0.3157894736842105,"p90":0.3157894736842105,"max":0.3684210526315789},"position":0.4166666666666667,"central":1},"w760":{"puzzles":40,"share":{"n":40,"min":0.19047619047619047,"p10":0.21052631578947367,"p25":0.21052631578947367,"median":0.23809523809523808,"p75":0.2857142857142857,"p90":0.3333333333333333,"max":0.3333333333333333},"position":0.5416666666666666,"central":1}},"26x26-hell-1":{"before":{"puzzles":15,"share":{"n":15,"min":0.09523809523809523,"p10":0.10256410256410256,"p25":0.11904761904761904,"median":0.1282051282051282,"p75":0.15384615384615385,"p90":0.15384615384615385,"max":0.1794871794871795},"position":0.5428571428571428,"central":0.9333333333333333},"main":{"puzzles":20,"share":{"n":20,"min":0.14285714285714285,"p10":0.14285714285714285,"p25":0.16666666666666666,"median":0.1951219512195122,"p75":0.21951219512195122,"p90":0.24390243902439024,"max":0.2926829268292683},"position":0.42857142857142855,"central":0.95},"w760":{"puzzles":20,"share":{"n":20,"min":0.11904761904761904,"p10":0.14285714285714285,"p25":0.14285714285714285,"median":0.1951219512195122,"p75":0.21951219512195122,"p90":0.24390243902439024,"max":0.2926829268292683},"position":0.42857142857142855,"central":0.95}}}` |
| R33 | Measured; ratios Derived | paired factors before -> no screen -> 190 M with their n, the two parts of the shift; screenBySeed: no screen / screen by seed over every arm of the two roles | `{"12x12-nightmare":{"factors":[{"from":"before","to":"w760","t10":{"n":1,"median":2.67568930836845,"min":2.67568930836845,"max":2.67568930836845},"response":{"n":1,"median":2.6628815531356063,"min":2.6628815531356063,"max":2.6628815531356063},"completion":{"before":1,"after":1,"of":1},"shareShift":0.05388471177944862},{"from":"w760","to":"main","t10":{"n":1,"median":3.46138637967267,"min":3.46138637967267,"max":3.46138637967267},"response":{"n":1,"median":3.4185541454481476,"min":3.4185541454481476,"max":3.4185541454481476},"completion":{"before":1,"after":1,"of":1},"shareShift":0.02506265664160401},{"from":"before","to":"main","t10":{"n":1,"median":9.26159452822234,"min":9.26159452822234,"max":9.26159452822234},"response":{"n":1,"median":9.103204772309129,"min":9.103204772309129,"max":9.103204772309129},"completion":{"before":1,"after":1,"of":1},"shareShift":0.07894736842105263}],"shift":{"sets":{"main":{"requests":1,"earlier":0,"same":1,"later":0},"w760":{"requests":4,"earlier":0,"same":4,"later":0}},"sameSet":{"main":{"before":{"n":1,"median":1.5,"perRequest":[{"seed":"landscape/12x12-nightmare/2","delta":1.5}]},"w760":{"n":1,"median":0.5,"perRequest":[{"seed":"landscape/12x12-nightmare/2","delta":0.5}]}},"w760":{"before":{"n":1,"median":1,"perRequest":[{"seed":"landscape/12x12-nightmare/2","delta":1}]}}}},"screenBySeed":{"seeds":1,"reached":{"w760":1,"main":1,"today":1},"t10Ratio":{"n":1,"median":3.46138637967267,"min":3.46138637967267,"max":3.46138637967267,"geoMean":3.4613863796726703},"responseRatio":{"n":1,"median":3.4185541454481476,"min":3.4185541454481476,"max":3.4185541454481476,"geoMean":3.418554145448147},"todayOverW760":{"n":1,"median":2.9075308361176235,"min":2.9075308361176235,"max":2.9075308361176235,"geoMean":2.907530836117623},"todayOverMain":{"n":1,"median":10.06408763461583,"min":10.06408763461583,"max":10.06408763461583,"geoMean":10.064087634615829},"shiftClues":{"n":1,"median":0.5},"shiftShare":{"n":1,"median":0.02631578947368421},"sameSet":1,"populations":{"today":{"puzzles":10,"share":{"n":10,"min":0.10526315789473684,"p10":0.10526315789473684,"p25":0.15789473684210525,"median":0.18421052631578946,"p75":0.21052631578947367,"p90":0.21052631578947367,"max":0.2631578947368421},"clues":{"n":10,"min":2,"p10":2,"p25":3,"median":3.5,"p75":4,"p90":4,"max":5},"K":{"n":10,"min":19,"p10":19,"p25":19,"median":19,"p75":19,"p90":19,"max":19},"U":{"n":10,"min":14,"p10":14,"p25":15,"median":15.5,"p75":16,"p90":16,"max":17},"score":{"n":10,"min":61,"p10":61,"p25":67,"median":68.5,"p75":70,"p90":71,"max":71},"position":{"n":10,"min":0.3333333333333333,"p10":0.3333333333333333,"p25":0.5833333333333334,"median":0.6458333333333333,"p75":0.7083333333333334,"p90":0.75,"max":0.75},"centralShare":1},"w760":{"puzzles":10,"share":{"n":10,"min":0.21052631578947367,"p10":0.21052631578947367,"p25":0.21052631578947367,"median":0.23684210526315788,"p75":0.2631578947368421,"p90":0.2631578947368421,"max":0.2631578947368421},"clues":{"n":10,"min":4,"p10":4,"p25":4,"median":4.5,"p75":5,"p90":5,"max":5},"K":{"n":10,"min":19,"p10":19,"p25":19,"median":19,"p75":19,"p90":19,"max":19},"U":{"n":10,"min":14,"p10":14,"p25":14,"median":14.5,"p75":15,"p90":15,"max":15},"score":{"n":10,"min":60,"p10":60,"p25":61,"median":65.5,"p75":68,"p90":70,"max":70},"position":{"n":10,"min":0.2916666666666667,"p10":0.2916666666666667,"p25":0.3333333333333333,"median":0.5208333333333334,"p75":0.625,"p90":0.7083333333333334,"max":0.7083333333333334},"centralShare":1},"main":{"puzzles":10,"share":{"n":10,"min":0.21052631578947367,"p10":0.21052631578947367,"p25":0.2631578947368421,"median":0.2631578947368421,"p75":0.3157894736842105,"p90":0.3157894736842105,"max":0.3684210526315789},"clues":{"n":10,"min":4,"p10":4,"p25":5,"median":5,"p75":6,"p90":6,"max":7},"K":{"n":10,"min":19,"p10":19,"p25":19,"median":19,"p75":19,"p90":19,"max":19},"U":{"n":10,"min":12,"p10":12,"p25":13,"median":14,"p75":14,"p90":15,"max":15},"score":{"n":10,"min":59,"p10":59,"p25":61,"median":63,"p75":67,"p90":68,"max":69},"position":{"n":10,"min":0.25,"p10":0.25,"p25":0.3333333333333333,"median":0.4166666666666667,"p75":0.5833333333333334,"p90":0.625,"max":0.6666666666666666},"centralShare":1},"mp12b1All":{"puzzles":185,"share":{"n":185,"min":0.10526315789473684,"p10":0.15789473684210525,"p25":0.15789473684210525,"median":0.21052631578947367,"p75":0.21052631578947367,"p90":0.25,"max":0.3},"clues":{"n":185,"min":2,"p10":3,"p25":3,"median":4,"p75":4,"p90":5,"max":6},"K":{"n":185,"min":19,"p10":19,"p25":19,"median":19,"p75":21,"p90":22,"max":22},"U":{"n":185,"min":14,"p10":15,"p25":15,"median":16,"p75":16,"p90":17,"max":19},"score":{"n":185,"min":59,"p10":62,"p25":65,"median":68,"p75":70,"p90":71,"max":76},"position":{"n":185,"min":0.25,"p10":0.375,"p25":0.5,"median":0.625,"p75":0.7083333333333334,"p90":0.75,"max":0.9583333333333334},"centralShare":0.9837837837837838}}}},"26x26-hell-1":{"factors":[{"from":"before","to":"w760","t10":{"n":1,"median":4.4417996167337455,"min":4.4417996167337455,"max":4.4417996167337455},"response":{"n":2,"median":4.812399371518286,"min":4.426779360833128,"max":5.198019382203444},"completion":{"before":1,"after":2,"of":2},"shareShift":0.06691682301438401},{"from":"w760","to":"main","t10":{"n":2,"median":0.8752819141649717,"min":0.6668002237828176,"max":1.083763604547126},"response":{"n":2,"median":0.8754504726705759,"min":0.667877712782912,"max":1.0830232325582396},"completion":{"before":2,"after":2,"of":2},"shareShift":0},{"from":"before","to":"main","t10":{"n":1,"median":4.813860763307407,"min":4.813860763307407,"max":4.813860763307407},"response":{"n":2,"median":4.1329730945894365,"min":3.4716412959872813,"max":4.794304893191591},"completion":{"before":1,"after":2,"of":2},"shareShift":0.06691682301438401}],"shift":{"sets":{"main":{"requests":2,"earlier":1,"same":1,"later":0},"w760":{"requests":2,"earlier":1,"same":1,"later":0}},"sameSet":{"main":{"before":{"n":1,"median":2.5,"perRequest":[{"seed":"landscape/26x26-hell-1/0","delta":2.5}]},"w760":{"n":2,"median":0.75,"perRequest":[{"seed":"landscape/26x26-hell-1/0","delta":1},{"seed":"landscape/26x26-hell-1/1","delta":0.5}]}},"w760":{"before":{"n":1,"median":1.5,"perRequest":[{"seed":"landscape/26x26-hell-1/0","delta":1.5}]}}}},"screenBySeed":{"seeds":2,"reached":{"w760":2,"main":2,"today":1},"t10Ratio":{"n":2,"median":0.8752819141649717,"min":0.6668002237828176,"max":1.083763604547126,"geoMean":0.8500904740318507},"responseRatio":{"n":2,"median":0.8754504726705759,"min":0.667877712782912,"max":1.0830232325582396,"geoMean":0.850486378169429},"todayOverW760":{"n":1,"median":4.151825616619171,"min":4.151825616619171,"max":4.151825616619171,"geoMean":4.151825616619171},"todayOverMain":{"n":1,"median":4.499597495718287,"min":4.499597495718287,"max":4.499597495718287,"geoMean":4.499597495718287},"shiftClues":{"n":2,"median":0.75},"shiftShare":{"n":2,"median":0.018002322880371666},"sameSet":2,"populations":{"today":{"puzzles":15,"share":{"n":15,"min":0.09523809523809523,"p10":0.10256410256410256,"p25":0.11904761904761904,"median":0.1282051282051282,"p75":0.15384615384615385,"p90":0.15384615384615385,"max":0.1794871794871795},"clues":{"n":15,"min":4,"p10":4,"p25":5,"median":5,"p75":6,"p90":6,"max":7},"K":{"n":15,"min":39,"p10":39,"p25":39,"median":39,"p75":42,"p90":42,"max":42},"U":{"n":15,"min":32,"p10":33,"p25":33,"median":34,"p75":37,"p90":37,"max":38},"score":{"n":15,"min":86,"p10":87,"p25":94,"median":96,"p75":99,"p90":102,"max":108},"position":{"n":15,"min":0.2571428571428571,"p10":0.2857142857142857,"p25":0.4857142857142857,"median":0.5428571428571428,"p75":0.6285714285714286,"p90":0.7142857142857143,"max":0.8857142857142857},"centralShare":0.9333333333333333},"w760":{"puzzles":20,"share":{"n":20,"min":0.11904761904761904,"p10":0.14285714285714285,"p25":0.14285714285714285,"median":0.1951219512195122,"p75":0.21951219512195122,"p90":0.24390243902439024,"max":0.2926829268292683},"clues":{"n":20,"min":5,"p10":6,"p25":6,"median":8,"p75":9,"p90":10,"max":12},"K":{"n":20,"min":41,"p10":41,"p25":41,"median":41.5,"p75":42,"p90":42,"max":42},"U":{"n":20,"min":29,"p10":30,"p25":32,"median":33,"p75":35,"p90":36,"max":37},"score":{"n":20,"min":78,"p10":86,"p25":87,"median":92,"p75":94,"p90":99,"max":100},"position":{"n":20,"min":0.02857142857142857,"p10":0.2571428571428571,"p25":0.2857142857142857,"median":0.42857142857142855,"p75":0.4857142857142857,"p90":0.6285714285714286,"max":0.6571428571428571},"centralShare":0.95},"main":{"puzzles":20,"share":{"n":20,"min":0.14285714285714285,"p10":0.14285714285714285,"p25":0.16666666666666666,"median":0.1951219512195122,"p75":0.21951219512195122,"p90":0.24390243902439024,"max":0.2926829268292683},"clues":{"n":20,"min":6,"p10":6,"p25":7,"median":8,"p75":9,"p90":10,"max":12},"K":{"n":20,"min":41,"p10":41,"p25":41,"median":41.5,"p75":42,"p90":42,"max":42},"U":{"n":20,"min":29,"p10":30,"p25":32,"median":33,"p75":34,"p90":36,"max":36},"score":{"n":20,"min":78,"p10":87,"p25":89,"median":92,"p75":93,"p90":99,"max":102},"position":{"n":20,"min":0.02857142857142857,"p10":0.2857142857142857,"p25":0.34285714285714286,"median":0.42857142857142855,"p75":0.45714285714285713,"p90":0.6285714285714286,"max":0.7142857142857143},"centralShare":0.95},"mp12b1All":{"puzzles":134,"share":{"n":134,"min":0.09523809523809523,"p10":0.1,"p25":0.10256410256410256,"median":0.1282051282051282,"p75":0.14285714285714285,"p90":0.15384615384615385,"max":0.1794871794871795},"clues":{"n":134,"min":4,"p10":4,"p25":4,"median":5,"p75":6,"p90":6,"max":7},"K":{"n":134,"min":39,"p10":39,"p25":39,"median":39,"p75":40,"p90":40,"max":42},"U":{"n":134,"min":32,"p10":33,"p25":34,"median":34,"p75":35,"p90":36,"max":38},"score":{"n":134,"min":85,"p10":89,"p25":94,"median":97,"p75":100,"p90":102,"max":109},"position":{"n":134,"min":0.22857142857142856,"p10":0.34285714285714286,"p25":0.4857142857142857,"median":0.5714285714285714,"p75":0.6571428571428571,"p90":0.7142857142857143,"max":0.9142857142857143},"centralShare":0.9626865671641791}}}}}` |
| R27 | Measured; Derived | accepted puzzles of an arm-only cell whose rating is an estimate (`ratingCensoredCount`) / accepted puzzles | `{"20x20-hell-1":{"w760":{"accepted":20,"ratingCensored":7,"share":0.35}}}` |

## Journal

Journal lines (appends): IGP-01/before 5706, w760 1268, IGP-01/after 4124. Measured cost of one append (self-test): not measured; IGP-01/before -, w760 -, IGP-01/after - in all (appends x cost), to be read beside the timings. Journal sources: 12x12-nightmare: published journal; 14x14-nightmare: published journal; 15x15b10-nightmare: published journal; 26x26-hell-1: published journal; fast: published journal; 20x20-hell-1: published journal.
