# IGP-03h comparison: W variants, no screen and arity 3 against IGP-01

> **Provisional (pre-freeze).** Measured on rating-v3 runtime cd5d17f (worktree 0e1283e) (source digest 34cea386…, equal to MP12b1's source), not on the frozen post-MP17 source. Re-run: pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\IGP-03h.json -Label frozen -SourceLabel <label> -LockHelper <path>.

Provisional (pre-freeze) numbers. "After" values are *Measured*, ratios are *Derived* (before / after on matched seeds), the estimates are the analysts' *Projections* (check-list §5). Matched cohorts only: reps 0-2 on the slow cells (no p95 can be read from three requests), 0-4 and 0-5 on the fast shard. A faster request that delivers fewer puzzles is never read as a gain; completion is always beside a time. IGP-07 gives the descriptive verdicts.

Identity: The before arm agrees with MP12b1 on every seed (puzzle identity or metric-prefix agreement, named per seed).

In this study each pair is "first arm / second arm" on matched seeds only (the seeds both arms ran): the headline tables below give the paired ratios, the study sections after them the per-W, population, split, shift, offset and arity-3 figures. The records of the arms of IGP-01 are read from its published folders.

## Headline: main (p1p5-main) against w760 (p1p5-w760)

| Cell | Today, MP12b1 20 reps: T10 median / p95 | MP12b1 on these seeds: T10 median, response median | Before: T10 median / p95 | After: T10 median / p95 | Paired T10 ratio (median [min-max]) | Paired response ratio | Ten of n before / after | Opus | Astra |
|---|---|---|---|---|---|---|---|---|---|
| 12x12 Nightmare | 62.14 / 176.07 (ten of 20) | 57.72, 65.08 (ten of 4) | 11.42 / 22.50 (ten of 4) | 24.17 / 31.45 (ten of 4) | 0.57 [0.27-0.72] n 4 | 0.57 [0.28-0.72] n 4 | 4 of 4 / 4 of 4 | about 39-48 s | 44.5 s |

T1, response and p95 of the response (median, s), before / after:

- 12x12 Nightmare: T1 2.38 / 3.30; response 11.56 / 24.34; p95 of the response 22.65 / 31.61; fewer puzzles in the after arm: none

## 12x12-nightmare (main / w760)

MP12b1 report: docs/difficulty-v3/landscape-v3-full/12x12-nightmare-2026-11-13.json; the before arm's response over MP12b1's on the same seeds: median 0.186.

| Seed | MP12b1 acc | MP12b1 T10 | MP12b1 resp | Before acc | Before T1 | Before T10 | Before resp | After acc | After T1 | After T10 | After resp | Identity (before vs MP12b1) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| landscape/12x12-nightmare/2 | 10 | 57.72 | 57.87 | 10 | 1.54 | 5.43 | 5.55 | 10 | 3.47 | 19.85 | 20.01 | - |
| landscape/12x12-nightmare/3 | 10 | 72.17 | 72.28 | 10 | 3.23 | 16.01 | 16.16 | 10 | 6.85 | 28.48 | 28.66 | - |
| landscape/12x12-nightmare/4 | 10 | 35.89 | 36.06 | 10 | 0.68 | 6.82 | 6.97 | 10 | 0.73 | 11.78 | 11.95 | - |
| landscape/12x12-nightmare/5 | 5 | - | 126.50 | 10 | 6.04 | 22.50 | 22.65 | 10 | 3.14 | 31.45 | 31.61 | - |

### 12x12-nightmare: before arm, calls per stage

| Stage | Calls | Ok | No-window | Unfinished (profiles seen) | Profiles per call median / p90 / max | ms per call median / p90 | Work per call median / p90 | Outcomes |
|---|---:|---:|---:|---|---|---|---|---|
| set | 16 | 9 | 0 | 7 (5) | 3.0 / 13.0 / 13 | 1438 / 5900 | 447.4 M / 1733.5 M | above 1, ar1 1, below 9, central 9, in 1, scap0 17, scap1 7 |
| batch | 59 | 49 | 0 | 10 (22) | 5.0 / 16.0 / 35 | 2485 / 5035 | 741.7 M / 1280.5 M | above 4, ar1 3, below 115, central 49, in 46, scap0 115, scap1 36 |

### 12x12-nightmare: after arm, calls per stage

| Stage | Calls | Ok | No-window | Unfinished (profiles seen) | Profiles per call median / p90 / max | ms per call median / p90 | Work per call median / p90 | Outcomes |
|---|---:|---:|---:|---|---|---|---|---|
| set | 16 | 8 | 0 | 8 (9) | 2.0 / 7.0 / 7 | 2685 / 6709 | 1039.7 M / 2146.7 M | above 4, below 6, capped 7, central 8, in 5 |
| batch | 62 | 50 | 0 | 12 (32) | 2.0 / 5.0 / 15 | 4348 / 9301 | 1326.7 M / 2804.5 M | above 19, below 28, capped 55, central 50, in 34 |

### 12x12-nightmare: the multipliers

- Dead-end entries (R10 before, R11 after), batch: 0 of 59 calls (0.0 %), 0 tuples, 0.0 % of the ms / 0 of 62 calls (0.0 %), 0 tuples, 0.0 % of the ms; set: 0 of 16 calls (0.0 %), 0 tuples, 0.0 % of the ms / 0 of 16 calls (0.0 %), 0 tuples, 0.0 % of the ms; both: 0 of 75 calls (0.0 %), 0 tuples, 0.0 % of the ms / 0 of 78 calls (0.0 %), 0 tuples, 0.0 % of the ms.
- Start-count capped share (R29, before arm): 0 of 0 p1 tuples at the start count (-) over 0 calls.
- Window profiles per ok call (R12), median / mean: before 1.0 / 3.50 (58 ok calls; phases window, p2, beam, rerate); after 0.0 / 1.12 (58 ok calls; phases window, p2, beam, rerate).
- Waves (proxy, R13), median: before 4.93 (n 4), after 5.32 (n 4). Set-stage share T1 / T10 (median): 0.235 / 0.137.
- Work per accepted puzzle, batch and completion (set stage added), median, M units: before 1049.3 (1182.4), after 2210.0 (2676.0); unfinished calls (unknown tails): 17 / 20 in 4 / 4 requests.
- Locate (R19, after arm): 58 calls; results hit 55, window 3; no-window proofs direct 58 (heuristic ends 0, never proofs); rescues in 0 calls, sides -; locate probes per call median 2.0, p90 3.0, max 4.
- Re-ratings (R18, after arm): per finished call mean 0.00, max 0; 0.0 % of the tuple ms, 0.0 % of the work.
## Headline: IGP-01/after (p1p5-main) against IGP-03/w760 (p1p5-w760)

| Cell | Today, MP12b1 20 reps: T10 median / p95 | MP12b1 on these seeds: T10 median, response median | Before: T10 median / p95 | After: T10 median / p95 | Paired T10 ratio (median [min-max]) | Paired response ratio | Ten of n before / after | Opus | Astra |
|---|---|---|---|---|---|---|---|---|---|
| 14x14 Nightmare | 112.98 / 151.64 (ten of 20) | -, 169.57 (ten of 2) | 7.21 / 8.94 (ten of 2) | 17.73 / 18.86 (ten of 2) | 0.40 [0.33-0.47] n 2 | 0.41 [0.33-0.48] n 2 | 2 of 2 / 2 of 2 | 17.7 s | 16.0 s |
| 12x12 Nightmare | 62.14 / 176.07 (ten of 20) | 51.60, 51.74 (ten of 2) | 7.94 / 11.18 (ten of 2) | 9.15 / 13.08 (ten of 2) | 0.88 [0.85-0.90] n 2 | 0.88 [0.86-0.91] n 2 | 2 of 2 / 2 of 2 | about 39-48 s | 44.5 s |

T1, response and p95 of the response (median, s), before / after:

- 14x14 Nightmare: T1 1.50 / 4.13; response 7.35 / 17.87; p95 of the response 9.09 / 19.00; fewer puzzles in the after arm: none
- 12x12 Nightmare: T1 1.14 / 1.07; response 8.09 / 9.27; p95 of the response 11.32 / 13.20; fewer puzzles in the after arm: none

## 14x14-nightmare (IGP-01/after / IGP-03/w760)

MP12b1 report: docs/difficulty-v3/landscape-v3-full/14x14-nightmare-2026-11-13.json; the before arm's response over MP12b1's on the same seeds: median 0.043.

| Seed | MP12b1 acc | MP12b1 T10 | MP12b1 resp | Before acc | Before T1 | Before T10 | Before resp | After acc | After T1 | After T10 | After resp | Identity (before vs MP12b1) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| landscape/14x14-nightmare/0 | 1 | - | 155.84 | 10 | 1.45 | 5.48 | 5.60 | 10 | 3.73 | 16.61 | 16.74 | - |
| landscape/14x14-nightmare/1 | 1 | - | 183.30 | 10 | 1.56 | 8.94 | 9.09 | 10 | 4.53 | 18.86 | 19.00 | - |

### 14x14-nightmare: before arm, calls per stage

| Stage | Calls | Ok | No-window | Unfinished (profiles seen) | Profiles per call median / p90 / max | ms per call median / p90 | Work per call median / p90 | Outcomes |
|---|---:|---:|---:|---|---|---|---|---|
| set | 8 | 2 | 0 | 6 (11) | 3.0 / 3.0 / 3 | 1383 / 1446 | 421.9 M / 426.2 M | below 1, central 2, in 1, scap0 13 |
| batch | 29 | 23 | 0 | 6 (12) | 3.0 / 7.0 / 10 | 1397 / 2212 | 460.6 M / 716.3 M | above 2, ar1 1, below 16, central 23, in 14, scap0 50 |

### 14x14-nightmare: after arm, calls per stage

| Stage | Calls | Ok | No-window | Unfinished (profiles seen) | Profiles per call median / p90 / max | ms per call median / p90 | Work per call median / p90 | Outcomes |
|---|---:|---:|---:|---|---|---|---|---|
| set | 8 | 3 | 0 | 5 (5) | 3.0 / 3.0 / 3 | 3620 / 4419 | 1557.5 M / 1566.2 M | capped 10, central 3, in 1 |
| batch | 29 | 23 | 0 | 6 (5) | 3.0 / 5.0 / 8 | 3980 / 5758 | 1249.2 M / 1890.0 M | above 5, below 6, capped 34, central 23, in 9 |

### 14x14-nightmare: the multipliers

- Dead-end entries (R10 before, R11 after), batch: 0 of 29 calls (0.0 %), 0 tuples, 0.0 % of the ms / 0 of 29 calls (0.0 %), 0 tuples, 0.0 % of the ms; set: 0 of 8 calls (0.0 %), 0 tuples, 0.0 % of the ms / 0 of 8 calls (0.0 %), 0 tuples, 0.0 % of the ms; both: 0 of 37 calls (0.0 %), 0 tuples, 0.0 % of the ms / 0 of 37 calls (0.0 %), 0 tuples, 0.0 % of the ms.
- Start-count capped share (R29, before arm): 0 of 0 p1 tuples at the start count (-) over 0 calls.
- Window profiles per ok call (R12), median / mean: before 0.0 / 1.16 (25 ok calls; phases window, p2, beam, rerate); after 0.0 / 0.62 (26 ok calls; phases window, p2, beam, rerate).
- Waves (proxy, R13), median: before 4.45 (n 2), after 3.64 (n 2). Set-stage share T1 / T10 (median): 0.219 / 0.233.
- Work per accepted puzzle, batch and completion (set stage added), median, M units: before 657.4 (788.6), after 1703.7 (2096.7); unfinished calls (unknown tails): 12 / 11 in 2 / 2 requests.
- Locate (R19, after arm): 26 calls; results hit 24, window 2; no-window proofs direct 26 (heuristic ends 0, never proofs); rescues in 0 calls, sides -; locate probes per call median 2.0, p90 4.0, max 5.
- Re-ratings (R18, after arm): per finished call mean 0.00, max 0; 0.0 % of the tuple ms, 0.0 % of the work.

## 12x12-nightmare (IGP-01/after / IGP-03/w760)

MP12b1 report: docs/difficulty-v3/landscape-v3-full/12x12-nightmare-2026-11-13.json; the before arm's response over MP12b1's on the same seeds: median 0.221.

| Seed | MP12b1 acc | MP12b1 T10 | MP12b1 resp | Before acc | Before T1 | Before T10 | Before resp | After acc | After T1 | After T10 | After resp | Identity (before vs MP12b1) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| landscape/12x12-nightmare/0 | 10 | 73.27 | 73.42 | 10 | 0.68 | 4.71 | 4.85 | 10 | 0.61 | 5.22 | 5.35 | - |
| landscape/12x12-nightmare/1 | 10 | 29.92 | 30.06 | 10 | 1.61 | 11.18 | 11.32 | 10 | 1.54 | 13.08 | 13.20 | - |

### 12x12-nightmare: before arm, calls per stage

| Stage | Calls | Ok | No-window | Unfinished (profiles seen) | Profiles per call median / p90 / max | ms per call median / p90 | Work per call median / p90 | Outcomes |
|---|---:|---:|---:|---|---|---|---|---|
| set | 8 | 3 | 0 | 5 (4) | 2.0 / 2.0 / 2 | 1436 / 1481 | 396.4 M / 419.2 M | below 1, central 3, in 2, scap0 1, scap1 2 |
| batch | 31 | 26 | 0 | 5 (7) | 3.5 / 8.0 / 12 | 1451 / 3158 | 424.9 M / 810.6 M | above 3, below 32, central 26, in 19, scap0 24, scap1 13 |

### 12x12-nightmare: after arm, calls per stage

| Stage | Calls | Ok | No-window | Unfinished (profiles seen) | Profiles per call median / p90 / max | ms per call median / p90 | Work per call median / p90 | Outcomes |
|---|---:|---:|---:|---|---|---|---|---|
| set | 8 | 2 | 0 | 6 (0) | 1.5 / 2.0 / 2 | 960 / 1416 | 248.2 M / 396.4 M | below 1, central 2 |
| batch | 28 | 23 | 0 | 5 (0) | 1.0 / 4.0 / 7 | 1974 / 4534 | 554.4 M / 1615.8 M | above 5, below 3, capped 5, central 23, in 10 |

### 12x12-nightmare: the multipliers

- Dead-end entries (R10 before, R11 after), batch: 0 of 31 calls (0.0 %), 0 tuples, 0.0 % of the ms / 0 of 28 calls (0.0 %), 0 tuples, 0.0 % of the ms; set: 0 of 8 calls (0.0 %), 0 tuples, 0.0 % of the ms / 0 of 8 calls (0.0 %), 0 tuples, 0.0 % of the ms; both: 0 of 39 calls (0.0 %), 0 tuples, 0.0 % of the ms / 0 of 36 calls (0.0 %), 0 tuples, 0.0 % of the ms.
- Start-count capped share (R29, before arm): 0 of 0 p1 tuples at the start count (-) over 0 calls.
- Window profiles per ok call (R12), median / mean: before 0.0 / 1.76 (29 ok calls; phases window, p2, beam, rerate); after 0.0 / 0.48 (25 ok calls; phases window, p2, beam, rerate).
- Waves (proxy, R13), median: before 4.23 (n 2), after 3.94 (n 2). Set-stage share T1 / T10 (median): 0.144 / 0.117.
- Work per accepted puzzle, batch and completion (set stage added), median, M units: before 661.9 (744.2), after 862.0 (886.8); unfinished calls (unknown tails): 10 / 11 in 2 / 2 requests.
- Locate (R19, after arm): 25 calls; results hit 25; no-window proofs direct 25 (heuristic ends 0, never proofs); rescues in 0 calls, sides -; locate probes per call median 1.0, p90 2.0, max 4.
- Re-ratings (R18, after arm): per finished call mean 0.00, max 0; 0.0 % of the tuple ms, 0.0 % of the work.

## Study of the W variants, the no-screen arm and arity 3 (IGP-03)

The per-W, split, shift and offset tables rest on the matched seeds of each cell (two seeds on 14x14 and 12x12 Nightmare and on Hell 1 26x26, five on 26x26 Master): **a two-seed indication** (five-seed on Master), not an estimate of a factor or a rate. PM4 (IGP-02) carries the per-W economics. No `W_screen` is recommended here: the least-work W is descriptive, and the choice waits for the answer to IG-P-Q17 and the frozen round.

Journal checks: w760 passes (159 calls, every start line has W 760 M, 0 screen outcomes (scap0, scap1, over), 0 re-rating tuples).


### 12x12 Nightmare: seeds 2, 3, 4, 5

#### Per W (R16, R18)

| Arm | Ten of n | T10 median s | Response median s | Work per accepted puzzle, batch and completion, M units (median) | With the set stage, M units | Profiles per accepted puzzle (median) | Unfinished calls |
|---|---|---:|---:|---:|---:|---:|---:|
| IGP-01 after (W 190 M) | 4 of 4 | 11.42 | 11.56 | 1049.3 | 1182.4 | 10.7 | 17 |
| no screen (W 760 M) | 4 of 4 | 24.17 | 24.34 | 2210.0 | 2676.0 | 5.8 | 20 |

Least median work per accepted puzzle with the set stage on these seeds (descriptive, R16): IGP-01 after (W 190 M), 1182.4 M units. It is not a recommendation.

| Arm | Capped probes: screen / canonical (of probes) | Re-ratings per call: mean (max) | Re-ratings, share of the work | Re-rated probes in band (of re-rated): a lower bound of the useful ratings lost | IGP-02 (PM4) at this W: useful lost (of) | PM4 P2 saving | PM4 time per useful rating, canonical → with the screen, s |
|---|---|---|---|---|---|---|---|
| IGP-01 after (W 190 M) | 175 / 0 (413) | 0.00 (0) | 0.0 % | 0 of 0 | - | - | - |
| no screen (W 760 M) | 0 / 62 (216) | 0.00 (0) | 0.0 % | 0 of 0 | - | - | - |

#### Population of the accepted puzzles (R32)

| Arm | Puzzles | Clue share p10 / median / p90 | Median clues (median K) | U median | Score position median (0.5 is the centre) | Central share |
|---|---:|---|---|---:|---:|---:|
| IGP-01 after (W 190 M) | 40 | 0.211 / 0.286 / 0.333 | 6.0 (20.0) | 14.0 | 0.46 | 100 % |
| no screen (W 760 M) | 40 | 0.211 / 0.238 / 0.333 | 5.0 (20.0) | 15.0 | 0.54 | 100 % |
| MP12b1, 20 reps | 185 | 0.158 / 0.211 / 0.250 | 4.0 (19.0) | 16.0 | 0.63 | 98 % |

#### Accepted puzzles and probes by clue offset from today's start count (a four-seed indication)

| Offset | IGP-01 after (W 190 M): accepted | no screen (W 760 M): accepted | IGP-01 after (W 190 M): probes (capped, in band, median ms) | no screen (W 760 M): probes (capped, in band, median ms) | PM4 canonical (IGP-02): profiles (capped, useful, median ms) |
|---|---:|---:|---|---|---|
| <0 | 0 | 0 | 0 | 0 | 0 |
| 0 | 0 | 0 | 0 | 0 | 0 |
| 1 | 7 | 16 | 82 (80 %, 18 %, 573) | 99 (41 %, 42 %, 2115) | 0 |
| 2 | 9 | 12 | 79 (70 %, 23 %, 590) | 57 (37 %, 49 %, 2255) | 0 |
| 3 | 12 | 4 | 77 (43 %, 30 %, 528) | 26 (0 %, 27 %, 413) | 0 |
| 4 | 10 | 8 | 115 (16 %, 36 %, 121) | 34 (0 %, 59 %, 113) | 0 |
| >4 | 2 | 0 | 60 (5 %, 13 %, 23) | 0 | 0 |

Offset = clue count − today's start count of the request's set (the `startCount` of the journal start lines). Probes are every rating attempt of the cohort's calls except re-ratings; capped = screen-capped (scap0, scap1, over) or canonically capped; in band = a rating inside the score band, not refused by AR1.

### Hell 1 26x26: seeds 0, 1

#### Per W (R16, R18)

| Arm | Ten of n | T10 median s | Response median s | Work per accepted puzzle, batch and completion, M units (median) | With the set stage, M units | Profiles per accepted puzzle (median) | Unfinished calls |
|---|---|---:|---:|---:|---:|---:|---:|
| no screen (W 760 M) | 2 of 2 | 34.24 | 34.41 | 3712.3 | 4380.1 | 9.2 | 11 |

Least median work per accepted puzzle with the set stage on these seeds (descriptive, R16): no screen (W 760 M), 4380.1 M units. It is not a recommendation.

| Arm | Capped probes: screen / canonical (of probes) | Re-ratings per call: mean (max) | Re-ratings, share of the work | Re-rated probes in band (of re-rated): a lower bound of the useful ratings lost | IGP-02 (PM4) at this W: useful lost (of) | PM4 P2 saving | PM4 time per useful rating, canonical → with the screen, s |
|---|---|---|---|---|---|---|---|
| no screen (W 760 M) | 0 / 76 (183) | 0.00 (0) | 0.0 % | 0 of 0 | - | - | - |

#### Population of the accepted puzzles (R32)

| Arm | Puzzles | Clue share p10 / median / p90 | Median clues (median K) | U median | Score position median (0.5 is the centre) | Central share |
|---|---:|---|---|---:|---:|---:|
| no screen (W 760 M) | 20 | 0.143 / 0.195 / 0.244 | 8.0 (41.5) | 33.0 | 0.43 | 95 % |
| MP12b1, 20 reps | 134 | 0.100 / 0.128 / 0.154 | 5.0 (39.0) | 34.0 | 0.57 | 96 % |

#### Accepted puzzles and probes by clue offset from today's start count (a two-seed indication)

| Offset | no screen (W 760 M): accepted | no screen (W 760 M): probes (capped, in band, median ms) | PM4 canonical (IGP-02): profiles (capped, useful, median ms) |
|---|---:|---|---|
| <0 | 0 | 0 | 0 |
| 0 | 0 | 0 | 0 |
| 1 | 1 | 36 (86 %, 6 %, 2107) | 0 |
| 2 | 4 | 41 (59 %, 27 %, 1934) | 0 |
| 3 | 2 | 9 (33 %, 56 %, 1629) | 0 |
| 4 | 6 | 21 (38 %, 33 %, 1295) | 0 |
| >4 | 7 | 76 (13 %, 26 %, 608) | 0 |

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

### 12x12 Nightmare: the screen against no screen, by seed, all seeds (R33; 6 seeds)

Paired by seed and by variant role, never by tree id. No screen (`p1p5-w760`) from IGP-03/w760, IGP-03h/w760; the screen at 190 M (`p1p5-main`) from IGP-01/after, IGP-03h/main; today is MP12b1's record of the same seeds. Cells are accepted / T10 s / response s (T10 is blank where a request did not reach ten). Ratios above 1 mean the first named arm is slower. A set is "the same" when `igSetKey` is equal.

| Rep | Today (MP12b1) | No screen | Screen | T10 no screen / screen | Response no screen / screen | T10 today / no screen | T10 today / screen | Set attempt: today / no screen / screen | Same set (no screen, screen) | Median clues: today / no screen / screen | Screen − no screen, same set: clues, share |
|---:|---|---|---|---:|---:|---:|---:|---|---|---|---|
| 0 | 10 / 73.27 / 73.42 | 10 / 5.22 / 5.35 | 10 / 4.71 / 4.85 | 1.11 | 1.10 | 14.04 | 15.55 | 0 / 0 / 0 | same | 4.0 / 4.0 / 5.0 | +1.0, +0.050 |
| 1 | 10 / 29.92 / 30.06 | 10 / 13.08 / 13.20 | 10 / 11.18 / 11.32 | 1.17 | 1.17 | 2.29 | 2.68 | 0 / 0 / 0 | same | 3.0 / 4.0 / 5.0 | +1.0, +0.053 |
| 2 | 10 / 57.72 / 57.87 | 10 / 19.85 / 20.01 | 10 / 5.43 / 5.55 (also IGP-01/after: digest equal) | 3.65 | 3.60 | 2.91 | 10.62 | 0 / 0 / 0 | same | 3.5 / 4.5 / 5.0 | +0.5, +0.026 |
| 3 | 10 / 72.17 / 72.28 | 10 / 28.48 / 28.66 | 10 / 16.01 / 16.16 | 1.78 | 1.77 | 2.53 | 4.51 | 0 / 0 / 0 | same | 5.0 / 5.5 / 7.0 | +1.5, +0.071 |
| 4 | 10 / 35.89 / 36.06 | 10 / 11.78 / 11.95 | 10 / 6.82 / 6.97 | 1.73 | 1.71 | 3.05 | 5.26 | 0 / 0 / 0 | same | 3.5 / 4.0 / 4.5 | +0.5, +0.026 |
| 5 | 5 / - / 126.50 | 10 / 31.45 / 31.61 | 10 / 22.50 / 22.65 | 1.40 | 1.40 | - | - | 0 / 0 / 0 | same | 5.0 / 6.0 / 6.0 | +0.0, +0.000 |

Ten of n: today 5 of 6, no screen 6, screen 6. T10 ratio no screen / screen: median 1.56 [1.11-3.65], geometric mean 1.65, n 6; response ratio: median 1.56 [1.10-3.60], geometric mean 1.64, n 6; today / no screen: median 2.91 [2.29-14.04], geometric mean 3.73, n 5; today / screen: median 5.26 [2.68-15.55], geometric mean 6.37, n 5. On the 6 of 6 seeds served on the same set by both arms, the screen's clue shift (screen − no screen) has median 0.8 clues (n 6) and 0.038 of K.

| Population of the accepted puzzles | Puzzles | Clue share p10 / median / p90 | Median clues (K) | Score position median | Central share |
|---|---:|---|---|---:|---:|
| Today, MP12b1, these seeds | 55 | 0.158 / 0.200 / 0.238 | 4.0 (19.0) | - | - |
| No screen | 60 | 0.200 / 0.211 / 0.333 | 4.0 (19.5) | - | - |
| Screen | 60 | 0.211 / 0.286 / 0.333 | 6.0 (19.5) | - | - |
| MP12b1, all reps | 185 | 0.158 / 0.211 / 0.250 | 4.0 (19.0) | - | - |

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
| R16 | Measured; Derived | median work per accepted puzzle (batch and completion; with the set stage) per W and cell; the W with the least median is descriptive | `{"12x12-nightmare":{"least":"main","perW":[{"role":"main","W":190000000,"t10":{"n":4,"min":5432.6622,"median":11417.4003,"p95":22503.0204,"max":22503.0204},"reached":"4 of 4","workWithSet":1182393046.9499998,"workWithoutSet":1049309536},{"role":"w760","W":760000000,"t10":{"n":4,"min":11776.681600000002,"median":24167.952100000002,"p95":31448.494199999997,"max":31448.494199999997},"reached":"4 of 4","workWithSet":2676016578.95,"workWithoutSet":2209976689.75}]},"26x26-hell-1":{"least":"w760","perW":[{"role":"w760","W":760000000,"t10":{"n":2,"min":28122.7752,"median":34244.015,"p95":40365.2548,"max":40365.2548},"reached":"2 of 2","workWithSet":4380072029.45,"workWithoutSet":3712319501.55}]}}` |
| R18 | Derived | re-ratings per call and their share of the work; re-rated probes in band per W and cell | `{"12x12-nightmare":[{"role":"main","rerates":{"callsFinished":58,"perCallMean":0,"perCallMax":0,"msShare":0,"workShare":0},"reRated":{"n":0,"inBand":0}},{"role":"w760","rerates":{"callsFinished":58,"perCallMean":0,"perCallMax":0,"msShare":0,"workShare":0},"reRated":{"n":0,"inBand":0}}],"26x26-hell-1":[{"role":"w760","rerates":{"callsFinished":26,"perCallMean":0,"perCallMax":0,"msShare":0,"workShare":0},"reRated":{"n":0,"inBand":0}}]}` |
| R32 | Measured; Derived | population of the accepted puzzles per W and cell (clue share p10 / median / p90, position, central share) | `{"12x12-nightmare":{"main":{"puzzles":40,"share":{"n":40,"min":0.21052631578947367,"p10":0.21052631578947367,"p25":0.2631578947368421,"median":0.2857142857142857,"p75":0.3333333333333333,"p90":0.3333333333333333,"max":0.47619047619047616},"position":0.4583333333333333,"central":1},"w760":{"puzzles":40,"share":{"n":40,"min":0.19047619047619047,"p10":0.21052631578947367,"p25":0.21052631578947367,"median":0.23809523809523808,"p75":0.2857142857142857,"p90":0.3333333333333333,"max":0.3333333333333333},"position":0.5416666666666666,"central":1}},"26x26-hell-1":{"w760":{"puzzles":20,"share":{"n":20,"min":0.11904761904761904,"p10":0.14285714285714285,"p25":0.14285714285714285,"median":0.1951219512195122,"p75":0.21951219512195122,"p90":0.24390243902439024,"max":0.2926829268292683},"position":0.42857142857142855,"central":0.95}}}` |
| R27 | Measured; Derived | accepted puzzles of an arm-only cell whose rating is an estimate (`ratingCensoredCount`) / accepted puzzles | `{"20x20-hell-1":{"w760":{"accepted":20,"ratingCensored":7,"share":0.35}}}` |
| R33 | Measured; ratios Derived | paired factors before -> no screen -> 190 M with their n, the two parts of the shift; screenBySeed: no screen / screen by seed over every arm of the two roles | `{"12x12-nightmare":{"screenBySeed":{"seeds":6,"reached":{"w760":6,"main":6,"today":5},"t10Ratio":{"n":6,"median":1.5617776091241788,"min":1.1074223247820423,"max":3.6542885732891697,"geoMean":1.6519671668519968},"responseRatio":{"n":6,"median":1.55522961522059,"min":1.1019502890034314,"max":3.604885652765905,"geoMean":1.6428395307082808},"todayOverW760":{"n":5,"median":2.9075308361176235,"min":2.287422153973614,"max":14.042285652341546,"geoMean":3.729057648125448},"todayOverMain":{"n":5,"median":5.260044936376772,"min":2.6771940903850098,"max":15.55074062236959,"geoMean":6.3698467301608295},"shiftClues":{"n":6,"median":0.75},"shiftShare":{"n":6,"median":0.0381578947368421},"sameSet":6,"populations":{"today":{"puzzles":55,"share":{"n":55,"min":0.10526315789473684,"p10":0.15789473684210525,"p25":0.15789473684210525,"median":0.2,"p75":0.21052631578947367,"p90":0.23809523809523808,"max":0.2857142857142857},"clues":{"n":55,"min":2,"p10":3,"p25":3,"median":4,"p75":4,"p90":5,"max":6},"K":{"n":55,"min":19,"p10":19,"p25":19,"median":19,"p75":21,"p90":21,"max":21},"U":{"n":55,"min":14,"p10":15,"p25":15,"median":16,"p75":16,"p90":17,"max":18},"score":{"n":55,"min":59,"p10":62,"p25":64,"median":67,"p75":70,"p90":71,"max":71},"position":{"n":0,"min":null,"p10":null,"p25":null,"median":null,"p75":null,"p90":null,"max":null},"centralShare":null},"w760":{"puzzles":60,"share":{"n":60,"min":0.15789473684210525,"p10":0.2,"p25":0.21052631578947367,"median":0.21052631578947367,"p75":0.2631578947368421,"p90":0.3333333333333333,"max":0.3333333333333333},"clues":{"n":60,"min":3,"p10":4,"p25":4,"median":4,"p75":5,"p90":7,"max":7},"K":{"n":60,"min":19,"p10":19,"p25":19,"median":19.5,"p75":21,"p90":21,"max":21},"U":{"n":60,"min":13,"p10":14,"p25":14,"median":15,"p75":16,"p90":16,"max":17},"score":{"n":60,"min":59,"p10":61,"p25":62,"median":66,"p75":68,"p90":70,"max":71},"position":{"n":0,"min":null,"p10":null,"p25":null,"median":null,"p75":null,"p90":null,"max":null},"centralShare":null},"main":{"puzzles":60,"share":{"n":60,"min":0.15789473684210525,"p10":0.21052631578947367,"p25":0.25,"median":0.2857142857142857,"p75":0.3157894736842105,"p90":0.3333333333333333,"max":0.47619047619047616},"clues":{"n":60,"min":3,"p10":4,"p25":5,"median":6,"p75":6,"p90":7,"max":10},"K":{"n":60,"min":19,"p10":19,"p25":19,"median":19.5,"p75":21,"p90":21,"max":21},"U":{"n":60,"min":11,"p10":13,"p25":14,"median":14,"p75":15,"p90":15,"max":16},"score":{"n":60,"min":59,"p10":60,"p25":61,"median":63,"p75":68,"p90":69,"max":71},"position":{"n":0,"min":null,"p10":null,"p25":null,"median":null,"p75":null,"p90":null,"max":null},"centralShare":null},"mp12b1All":{"puzzles":185,"share":{"n":185,"min":0.10526315789473684,"p10":0.15789473684210525,"p25":0.15789473684210525,"median":0.21052631578947367,"p75":0.21052631578947367,"p90":0.25,"max":0.3},"clues":{"n":185,"min":2,"p10":3,"p25":3,"median":4,"p75":4,"p90":5,"max":6},"K":{"n":185,"min":19,"p10":19,"p25":19,"median":19,"p75":21,"p90":22,"max":22},"U":{"n":185,"min":14,"p10":15,"p25":15,"median":16,"p75":16,"p90":17,"max":19},"score":{"n":185,"min":59,"p10":62,"p25":65,"median":68,"p75":70,"p90":71,"max":76},"position":{"n":0,"min":null,"p10":null,"p25":null,"median":null,"p75":null,"p90":null,"max":null},"centralShare":null}}}},"26x26-hell-1":{"screenBySeed":{"seeds":2,"reached":{"w760":2,"main":2,"today":1},"t10Ratio":{"n":2,"median":0.8752819141649717,"min":0.6668002237828176,"max":1.083763604547126,"geoMean":0.8500904740318507},"responseRatio":{"n":2,"median":0.8754504726705759,"min":0.667877712782912,"max":1.0830232325582396,"geoMean":0.850486378169429},"todayOverW760":{"n":1,"median":4.151825616619171,"min":4.151825616619171,"max":4.151825616619171,"geoMean":4.151825616619171},"todayOverMain":{"n":1,"median":4.499597495718287,"min":4.499597495718287,"max":4.499597495718287,"geoMean":4.499597495718287},"shiftClues":{"n":2,"median":0.75},"shiftShare":{"n":2,"median":0.018002322880371666},"sameSet":2,"populations":{"today":{"puzzles":15,"share":{"n":15,"min":0.09523809523809523,"p10":0.10256410256410256,"p25":0.11904761904761904,"median":0.1282051282051282,"p75":0.15384615384615385,"p90":0.15384615384615385,"max":0.1794871794871795},"clues":{"n":15,"min":4,"p10":4,"p25":5,"median":5,"p75":6,"p90":6,"max":7},"K":{"n":15,"min":39,"p10":39,"p25":39,"median":39,"p75":42,"p90":42,"max":42},"U":{"n":15,"min":32,"p10":33,"p25":33,"median":34,"p75":37,"p90":37,"max":38},"score":{"n":15,"min":86,"p10":87,"p25":94,"median":96,"p75":99,"p90":102,"max":108},"position":{"n":15,"min":0.2571428571428571,"p10":0.2857142857142857,"p25":0.4857142857142857,"median":0.5428571428571428,"p75":0.6285714285714286,"p90":0.7142857142857143,"max":0.8857142857142857},"centralShare":0.9333333333333333},"w760":{"puzzles":20,"share":{"n":20,"min":0.11904761904761904,"p10":0.14285714285714285,"p25":0.14285714285714285,"median":0.1951219512195122,"p75":0.21951219512195122,"p90":0.24390243902439024,"max":0.2926829268292683},"clues":{"n":20,"min":5,"p10":6,"p25":6,"median":8,"p75":9,"p90":10,"max":12},"K":{"n":20,"min":41,"p10":41,"p25":41,"median":41.5,"p75":42,"p90":42,"max":42},"U":{"n":20,"min":29,"p10":30,"p25":32,"median":33,"p75":35,"p90":36,"max":37},"score":{"n":20,"min":78,"p10":86,"p25":87,"median":92,"p75":94,"p90":99,"max":100},"position":{"n":20,"min":0.02857142857142857,"p10":0.2571428571428571,"p25":0.2857142857142857,"median":0.42857142857142855,"p75":0.4857142857142857,"p90":0.6285714285714286,"max":0.6571428571428571},"centralShare":0.95},"main":{"puzzles":20,"share":{"n":20,"min":0.14285714285714285,"p10":0.14285714285714285,"p25":0.16666666666666666,"median":0.1951219512195122,"p75":0.21951219512195122,"p90":0.24390243902439024,"max":0.2926829268292683},"clues":{"n":20,"min":6,"p10":6,"p25":7,"median":8,"p75":9,"p90":10,"max":12},"K":{"n":20,"min":41,"p10":41,"p25":41,"median":41.5,"p75":42,"p90":42,"max":42},"U":{"n":20,"min":29,"p10":30,"p25":32,"median":33,"p75":34,"p90":36,"max":36},"score":{"n":20,"min":78,"p10":87,"p25":89,"median":92,"p75":93,"p90":99,"max":102},"position":{"n":20,"min":0.02857142857142857,"p10":0.2857142857142857,"p25":0.34285714285714286,"median":0.42857142857142855,"p75":0.45714285714285713,"p90":0.6285714285714286,"max":0.7142857142857143},"centralShare":0.95},"mp12b1All":{"puzzles":134,"share":{"n":134,"min":0.09523809523809523,"p10":0.1,"p25":0.10256410256410256,"median":0.1282051282051282,"p75":0.14285714285714285,"p90":0.15384615384615385,"max":0.1794871794871795},"clues":{"n":134,"min":4,"p10":4,"p25":4,"median":5,"p75":6,"p90":6,"max":7},"K":{"n":134,"min":39,"p10":39,"p25":39,"median":39,"p75":40,"p90":40,"max":42},"U":{"n":134,"min":32,"p10":33,"p25":34,"median":34,"p75":35,"p90":36,"max":38},"score":{"n":134,"min":85,"p10":89,"p25":94,"median":97,"p75":100,"p90":102,"max":109},"position":{"n":134,"min":0.22857142857142856,"p10":0.34285714285714286,"p25":0.4857142857142857,"median":0.5714285714285714,"p75":0.6571428571428571,"p90":0.7142857142857143,"max":0.9142857142857143},"centralShare":0.9626865671641791}}}}}` |

## Journal

Journal lines (appends): main 667, w760 1268, IGP-01/after 4124, IGP-03/w760 357. Measured cost of one append (self-test): not measured; main -, w760 -, IGP-01/after -, IGP-03/w760 - in all (appends x cost), to be read beside the timings. Journal sources: 12x12-nightmare: published journal; 20x20-hell-1: published journal; 26x26-hell-1: published journal; 14x14-nightmare: published journal; 15x15b10-nightmare: published journal; fast: published journal.
