# IGP-01 comparison: before and after

> **Provisional (pre-freeze).** Measured on rating-v3 runtime cd5d17f (worktree 0e1283e) (source digest 34cea386…, equal to MP12b1's source), not on the frozen post-MP17 source. Re-run: pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\IGP-01.json -Label frozen -SourceLabel <label> -LockHelper <path>.

Provisional (pre-freeze) numbers. "After" values are *Measured*, ratios are *Derived* (before / after on matched seeds), the estimates are the analysts' *Projections* (check-list §5). Matched cohorts only: reps 0-2 on the slow cells (no p95 can be read from three requests), 0-4 and 0-5 on the fast shard. A faster request that delivers fewer puzzles is never read as a gain; completion is always beside a time. IGP-07 gives the descriptive verdicts.

Identity: The before arm agrees with MP12b1 on every seed (puzzle identity or metric-prefix agreement, named per seed).

## Headline: before (log) against after (p1p5-main)

| Cell | Today, MP12b1 20 reps: T10 median / p95 | MP12b1 on these seeds: T10 median, response median | Before: T10 median / p95 | After: T10 median / p95 | Paired T10 ratio (median [min-max]) | Paired response ratio | Ten of n before / after | Opus | Astra |
|---|---|---|---|---|---|---|---|---|---|
| 14x14 Nightmare | 112.98 / 151.64 (ten of 20) | 46.05, 155.84 (ten of 3) | 46.54 / 46.54 (ten of 3) | 8.94 / 12.20 (ten of 3) | 3.82 [3.82-3.82] n 1 | 20.34 [3.78-27.94] n 3 | 1 of 3 / 3 of 3 | 17.7 s | 16.0 s |
| 15x15b10 Nightmare | 86.23 / 141.56 (ten of 20) | 58.78, 71.36 (ten of 3) | 59.52 / 71.78 (ten of 3) | 8.45 / 9.01 (ten of 3) | 8.22 [7.93-8.50] n 2 | 8.38 [7.76-20.50] n 3 | 2 of 3 / 3 of 3 | 13.8 s | 13.7 s |
| 12x12 Nightmare | 62.14 / 176.07 (ten of 20) | 57.72, 57.87 (ten of 3) | 53.12 / 73.02 (ten of 3) | 5.74 / 11.18 (ten of 3) | 9.26 [2.49-15.50] n 3 | 9.10 [2.47-15.07] n 3 | 3 of 3 / 3 of 3 | about 39-48 s | 44.5 s |
| 26x26 Nightmare | 18.61 / 31.38 (ten of 20) | 25.76, 25.92 (ten of 6) | 26.53 / 36.38 (ten of 6) | 11.94 / 15.02 (ten of 6) | 2.01 [0.69-3.91] n 6 | 2.00 [0.69-3.85] n 6 | 6 of 6 / 6 of 6 | 15.5 s | 17.8 s |
| 14x14 Master | 2.57 / 16.28 (ten of 20) | 2.90, 3.06 (ten of 5) | 3.17 / 11.18 (ten of 5) | 2.66 / 5.12 (ten of 5) | 1.25 [0.68-2.18] n 5 | 1.21 [0.69-2.14] n 5 | 5 of 5 / 5 of 5 | unchanged (today 2.57 s) | unchanged |
| 26x26 Master | 8.36 / 16.64 (ten of 20) | 11.87, 12.04 (ten of 5) | 12.26 / 12.49 (ten of 5) | 13.43 / 16.91 (ten of 5) | 0.83 [0.38-2.13] n 5 | 0.83 [0.39-2.11] n 5 | 5 of 5 / 5 of 5 | unchanged (today 8.36 s) | unchanged |
| Hell 1 26x26 | 108.72 / 167.59 (ten of 20) | 143.92, 146.01 (ten of 3) | 149.87 / 179.29 (ten of 3) | 37.25 / 42.18 (ten of 3) | 5.03 [4.81-5.24] n 2 | 4.79 [3.47-5.21] n 3 | 2 of 3 / 3 of 3 | about 28 s (if a window holds) | 50-60 s (if a window holds) |

T1, response and p95 of the response (median, s), before / after:

- 14x14 Nightmare: T1 41.47 / 1.56; response 156.50 / 9.09; p95 of the response 185.00 / 12.35; fewer puzzles in the after arm: none
- 15x15b10 Nightmare: T1 19.02 / 1.91; response 71.92 / 8.58; p95 of the response 187.88 / 9.16; fewer puzzles in the after arm: none
- 12x12 Nightmare: T1 4.66 / 1.56; response 53.29 / 5.85; p95 of the response 73.13 / 11.32; fewer puzzles in the after arm: none
- 26x26 Nightmare: T1 7.12 / 2.42; response 26.69 / 12.10; p95 of the response 36.53 / 15.19; fewer puzzles in the after arm: none
- 14x14 Master: T1 0.40 / 0.94; response 3.31 / 2.80; p95 of the response 11.32 / 5.29; fewer puzzles in the after arm: none
- 26x26 Master: T1 1.29 / 2.61; response 12.43 / 13.60; p95 of the response 12.62 / 17.07; fewer puzzles in the after arm: none
- Hell 1 26x26: T1 85.23 / 4.64; response 147.05 / 37.43; p95 of the response 179.44 / 42.36; fewer puzzles in the after arm: none

## 14x14-nightmare

MP12b1 report: docs/difficulty-v3/landscape-v3-full/14x14-nightmare-2026-11-13.json; the before arm's response over MP12b1's on the same seeds: median 1.009.

| Seed | MP12b1 acc | MP12b1 T10 | MP12b1 resp | Before acc | Before T1 | Before T10 | Before resp | After acc | After T1 | After T10 | After resp | Identity (before vs MP12b1) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| landscape/14x14-nightmare/0 | 1 | - | 155.84 | 1 | 41.47 | - | 156.50 | 10 | 1.45 | 5.48 | 5.60 | puzzle identity (resultDigest equal at equal accepted counts, 1) |
| landscape/14x14-nightmare/1 | 1 | - | 183.30 | 1 | 69.97 | - | 185.00 | 10 | 1.56 | 8.94 | 9.09 | puzzle identity (resultDigest equal at equal accepted counts, 1) |
| landscape/14x14-nightmare/2 | 10 | 46.05 | 46.20 | 10 | 15.73 | 46.54 | 46.66 | 10 | 4.38 | 12.20 | 12.35 | puzzle identity (resultDigest equal at equal accepted counts, 10) |

### 14x14-nightmare: before arm, calls per stage

| Stage | Calls | Ok | No-window | Unfinished (profiles seen) | Profiles per call median / p90 / max | ms per call median / p90 | Work per call median / p90 | Outcomes |
|---|---:|---:|---:|---|---|---|---|---|
| set | 15 | 4 | 0 | 7 (59) | 19.5 / 32.0 / 32 | 42217 / 69856 | 14822.2 M / 24724.6 M | above 3, below 2, capped 179, central 4, in 4 |
| batch | 36 | 14 | 0 | 11 (152) | 14.0 / 20.0 / 48 | 28825 / 44003 | 8874.5 M / 15202.9 M | above 34, below 3, capped 428, central 13, in 13 |

### 14x14-nightmare: after arm, calls per stage

| Stage | Calls | Ok | No-window | Unfinished (profiles seen) | Profiles per call median / p90 / max | ms per call median / p90 | Work per call median / p90 | Outcomes |
|---|---:|---:|---:|---|---|---|---|---|
| set | 12 | 5 | 0 | 7 (15) | 7.0 / 8.0 / 8 | 2732 / 4248 | 607.5 M / 1026.4 M | above 1, below 9, central 5, in 7, scap0 22 |
| batch | 52 | 43 | 0 | 9 (26) | 3.0 / 8.0 / 14 | 1158 / 2633 | 360.9 M / 716.3 M | above 3, ar1 1, below 41, central 43, in 27, scap0 71, scap1 4 |

### 14x14-nightmare: the multipliers

- Dead-end entries (R10 before, R11 after), batch: 19 of 36 calls (52.8 %), 191 tuples, 39.7 % of the ms / 0 of 52 calls (0.0 %), 0 tuples, 0.0 % of the ms; set: 13 of 15 calls (86.7 %), 99 tuples, 53.0 % of the ms / 0 of 12 calls (0.0 %), 0 tuples, 0.0 % of the ms; both: 32 of 51 calls (62.7 %), 290 tuples, 43.5 % of the ms / 0 of 64 calls (0.0 %), 0 tuples, 0.0 % of the ms.
- Start-count capped share (R29, before arm): 163 of 180 p1 tuples at the start count (0.906) over 48 calls.
- Window profiles per ok call (R12), median / mean: before 6.0 / 10.06 (18 ok calls; all tuples of the call); after 0.0 / 1.60 (48 ok calls; phases window, p2, beam, rerate).
- Waves (proxy, R13), median: before 4.11 (n 1), after 6.24 (n 3). Set-stage share T1 / T10 (median): 0.338 / 0.264.
- Work per accepted puzzle, batch and completion (set stage added), median, M units: before 161349.4 (196344.6), after 774.9 (987.4); unfinished calls (unknown tails): 18 / 16 in 3 / 3 requests.
- Locate (R19, after arm): 48 calls; results hit 41, window 7; no-window proofs direct 48 (heuristic ends 0, never proofs); rescues in 0 calls, sides -; locate probes per call median 2.0, p90 4.0, max 5.
- Re-ratings (R18, after arm): per finished call mean 0.00, max 0; 0.0 % of the tuple ms, 0.0 % of the work.

## 15x15b10-nightmare

MP12b1 report: docs/difficulty-v3/landscape-v3-full/15x15b10-nightmare-2026-11-13.json; the before arm's response over MP12b1's on the same seeds: median 1.008.

| Seed | MP12b1 acc | MP12b1 T10 | MP12b1 resp | Before acc | Before T1 | Before T10 | Before resp | After acc | After T1 | After T10 | After resp | Identity (before vs MP12b1) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| landscape/15x15b10-nightmare/0 | 10 | 71.20 | 71.36 | 10 | 19.02 | 71.78 | 71.92 | 10 | 1.35 | 8.45 | 8.58 | puzzle identity (resultDigest equal at equal accepted counts, 10) |
| landscape/15x15b10-nightmare/1 | 10 | 46.37 | 46.53 | 10 | 8.74 | 47.26 | 47.39 | 10 | 2.93 | 5.96 | 6.11 | puzzle identity (resultDigest equal at equal accepted counts, 10) |
| landscape/15x15b10-nightmare/2 | 4 | - | 186.30 | 4 | 72.78 | - | 187.88 | 10 | 1.91 | 9.01 | 9.16 | puzzle identity (resultDigest equal at equal accepted counts, 4) |

### 15x15b10-nightmare: before arm, calls per stage

| Stage | Calls | Ok | No-window | Unfinished (profiles seen) | Profiles per call median / p90 / max | ms per call median / p90 | Work per call median / p90 | Outcomes |
|---|---:|---:|---:|---|---|---|---|---|
| set | 16 | 5 | 0 | 7 (46) | 17.0 / 20.0 / 20 | 31271 / 44850 | 10340.0 M / 15202.9 M | above 2, below 4, capped 164, central 5, in 6 |
| batch | 50 | 37 | 0 | 10 (51) | 8.5 / 17.0 / 20 | 15733 / 35083 | 5077.1 M / 12298.7 M | above 47, below 4, capped 296, central 37, in 17 |

### 15x15b10-nightmare: after arm, calls per stage

| Stage | Calls | Ok | No-window | Unfinished (profiles seen) | Profiles per call median / p90 / max | ms per call median / p90 | Work per call median / p90 | Outcomes |
|---|---:|---:|---:|---|---|---|---|---|
| set | 12 | 5 | 0 | 7 (8) | 3.0 / 5.0 / 5 | 1374 / 2793 | 387.9 M / 655.5 M | below 1, central 5, in 1, scap0 15, scap1 1 |
| batch | 55 | 46 | 0 | 9 (5) | 3.0 / 5.0 / 14 | 1397 / 2396 | 367.7 M / 601.6 M | above 8, below 28, central 46, in 17, scap0 58 |

### 15x15b10-nightmare: the multipliers

- Dead-end entries (R10 before, R11 after), batch: 26 of 50 calls (52.0 %), 139 tuples, 37.1 % of the ms / 0 of 55 calls (0.0 %), 0 tuples, 0.0 % of the ms; set: 15 of 16 calls (93.8 %), 101 tuples, 59.2 % of the ms / 0 of 12 calls (0.0 %), 0 tuples, 0.0 % of the ms; both: 41 of 66 calls (62.1 %), 240 tuples, 44.0 % of the ms / 0 of 67 calls (0.0 %), 0 tuples, 0.0 % of the ms.
- Start-count capped share (R29, before arm): 217 of 244 p1 tuples at the start count (0.889) over 65 calls.
- Window profiles per ok call (R12), median / mean: before 8.0 / 8.24 (42 ok calls; all tuples of the call); after 0.0 / 0.84 (51 ok calls; phases window, p2, beam, rerate).
- Waves (proxy, R13), median: before 4.53 (n 2), after 4.85 (n 3). Set-stage share T1 / T10 (median): 0.225 / 0.212.
- Work per accepted puzzle, batch and completion (set stage added), median, M units: before 6779.7 (9218.2), after 681.3 (791.9); unfinished calls (unknown tails): 17 / 16 in 3 / 3 requests.
- Locate (R19, after arm): 51 calls; results hit 48, window 3; no-window proofs direct 51 (heuristic ends 0, never proofs); rescues in 0 calls, sides -; locate probes per call median 2.0, p90 4.0, max 6.
- Re-ratings (R18, after arm): per finished call mean 0.00, max 0; 0.0 % of the tuple ms, 0.0 % of the work.

## 12x12-nightmare

MP12b1 report: docs/difficulty-v3/landscape-v3-full/12x12-nightmare-2026-11-13.json; the before arm's response over MP12b1's on the same seeds: median 0.930.

| Seed | MP12b1 acc | MP12b1 T10 | MP12b1 resp | Before acc | Before T1 | Before T10 | Before resp | After acc | After T1 | After T10 | After resp | Identity (before vs MP12b1) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| landscape/12x12-nightmare/0 | 10 | 73.27 | 73.42 | 10 | 4.66 | 73.02 | 73.13 | 10 | 0.68 | 4.71 | 4.85 | puzzle identity (resultDigest equal at equal accepted counts, 10) |
| landscape/12x12-nightmare/1 | 10 | 29.92 | 30.06 | 10 | 0.82 | 27.85 | 27.96 | 10 | 1.61 | 11.18 | 11.32 | puzzle identity (resultDigest equal at equal accepted counts, 10) |
| landscape/12x12-nightmare/2 | 10 | 57.72 | 57.87 | 10 | 21.78 | 53.12 | 53.29 | 10 | 1.56 | 5.74 | 5.85 | puzzle identity (resultDigest equal at equal accepted counts, 10) |

### 12x12-nightmare: before arm, calls per stage

| Stage | Calls | Ok | No-window | Unfinished (profiles seen) | Profiles per call median / p90 / max | ms per call median / p90 | Work per call median / p90 | Outcomes |
|---|---:|---:|---:|---|---|---|---|---|
| set | 12 | 5 | 0 | 7 (18) | 3.0 / 14.0 / 14 | 4538 / 21650 | 1490.1 M / 7632.6 M | above 7, below 4, capped 27, central 5, in 4 |
| batch | 44 | 35 | 0 | 9 (30) | 5.0 / 9.0 / 28 | 9105 / 20962 | 2868.4 M / 6640.9 M | above 33, capped 142, central 35, in 17 |

### 12x12-nightmare: after arm, calls per stage

| Stage | Calls | Ok | No-window | Unfinished (profiles seen) | Profiles per call median / p90 / max | ms per call median / p90 | Work per call median / p90 | Outcomes |
|---|---:|---:|---:|---|---|---|---|---|
| set | 12 | 4 | 0 | 8 (8) | 2.0 / 4.0 / 4 | 1441 / 1481 | 407.8 M / 447.4 M | below 2, central 4, in 2, scap0 5, scap1 4 |
| batch | 42 | 35 | 0 | 7 (7) | 3.0 / 8.0 / 12 | 1369 / 3158 | 402.4 M / 810.6 M | above 4, below 34, central 35, in 22, scap0 33, scap1 16 |

### 12x12-nightmare: the multipliers

- Dead-end entries (R10 before, R11 after), batch: 9 of 44 calls (20.5 %), 39 tuples, 18.7 % of the ms / 0 of 42 calls (0.0 %), 0 tuples, 0.0 % of the ms; set: 2 of 12 calls (16.7 %), 10 tuples, 24.8 % of the ms / 0 of 12 calls (0.0 %), 0 tuples, 0.0 % of the ms; both: 11 of 56 calls (19.6 %), 49 tuples, 19.7 % of the ms / 0 of 54 calls (0.0 %), 0 tuples, 0.0 % of the ms.
- Start-count capped share (R29, before arm): 105 of 161 p1 tuples at the start count (0.652) over 49 calls.
- Window profiles per ok call (R12), median / mean: before 5.0 / 5.65 (40 ok calls; all tuples of the call); after 0.0 / 1.49 (39 ok calls; phases window, p2, beam, rerate).
- Waves (proxy, R13), median: before 3.20 (n 3), after 3.38 (n 3). Set-stage share T1 / T10 (median): 0.064 / 0.145.
- Work per accepted puzzle, batch and completion (set stage added), median, M units: before 4152.2 (6831.0), after 418.0 (554.8); unfinished calls (unknown tails): 16 / 15 in 3 / 3 requests.
- Locate (R19, after arm): 39 calls; results hit 37, window 2; no-window proofs direct 39 (heuristic ends 0, never proofs); rescues in 0 calls, sides -; locate probes per call median 2.0, p90 4.0, max 4.
- Re-ratings (R18, after arm): per finished call mean 0.00, max 0; 0.0 % of the tuple ms, 0.0 % of the work.

## 26x26-nightmare

MP12b1 report: docs/difficulty-v3/landscape-v3-full/26x26-nightmare-2026-11-14.json; the before arm's response over MP12b1's on the same seeds: median 1.024.

| Seed | MP12b1 acc | MP12b1 T10 | MP12b1 resp | Before acc | Before T1 | Before T10 | Before resp | After acc | After T1 | After T10 | After resp | Identity (before vs MP12b1) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| landscape/26x26-nightmare/0 | 10 | 8.17 | 8.31 | 10 | 0.94 | 8.61 | 8.79 | 10 | 0.99 | 12.49 | 12.66 | puzzle identity (resultDigest equal at equal accepted counts, 10) |
| landscape/26x26-nightmare/1 | 10 | 27.25 | 27.37 | 10 | 5.73 | 28.13 | 28.29 | 10 | 5.93 | 12.99 | 13.13 | puzzle identity (resultDigest equal at equal accepted counts, 10) |
| landscape/26x26-nightmare/2 | 10 | 27.60 | 27.77 | 10 | 10.31 | 27.96 | 28.11 | 10 | 7.42 | 15.02 | 15.19 | puzzle identity (resultDigest equal at equal accepted counts, 10) |
| landscape/26x26-nightmare/3 | 10 | 24.27 | 24.47 | 10 | 8.51 | 25.09 | 25.27 | 10 | 2.19 | 11.38 | 11.55 | puzzle identity (resultDigest equal at equal accepted counts, 10) |
| landscape/26x26-nightmare/4 | 10 | 18.21 | 18.38 | 10 | 4.74 | 18.20 | 18.38 | 10 | 2.12 | 10.51 | 10.70 | puzzle identity (resultDigest equal at equal accepted counts, 10) |
| landscape/26x26-nightmare/5 | 10 | 35.78 | 35.96 | 10 | 8.68 | 36.38 | 36.53 | 10 | 2.65 | 9.31 | 9.49 | puzzle identity (resultDigest equal at equal accepted counts, 10) |

### 26x26-nightmare: before arm, calls per stage

| Stage | Calls | Ok | No-window | Unfinished (profiles seen) | Profiles per call median / p90 / max | ms per call median / p90 | Work per call median / p90 | Outcomes |
|---|---:|---:|---:|---|---|---|---|---|
| set | 24 | 15 | 0 | 9 (22) | 2.0 / 9.0 / 11 | 2761 / 8515 | 608.8 M / 2258.4 M | above 29, below 9, capped 6, central 15, in 21 |
| batch | 105 | 88 | 0 | 17 (49) | 3.0 / 8.0 / 17 | 3308 / 9383 | 815.7 M / 2417.6 M | above 165, below 31, capped 29, central 88, in 70 |

### 26x26-nightmare: after arm, calls per stage

| Stage | Calls | Ok | No-window | Unfinished (profiles seen) | Profiles per call median / p90 / max | ms per call median / p90 | Work per call median / p90 | Outcomes |
|---|---:|---:|---:|---|---|---|---|---|
| set | 24 | 16 | 0 | 8 (13) | 3.0 / 8.0 / 16 | 1935 / 5779 | 518.5 M / 1499.3 M | above 11, below 11, central 16, in 17, scap0 19, scap1 1 |
| batch | 80 | 61 | 0 | 19 (44) | 3.0 / 8.0 / 21 | 2094 / 5614 | 565.7 M / 1509.5 M | above 56, below 58, central 61, in 50, over 1, scap0 90, scap1 4 |

### 26x26-nightmare: the multipliers

- Dead-end entries (R10 before, R11 after), batch: 0 of 105 calls (0.0 %), 0 tuples, 0.0 % of the ms / 0 of 80 calls (0.0 %), 0 tuples, 0.0 % of the ms; set: 0 of 24 calls (0.0 %), 0 tuples, 0.0 % of the ms / 0 of 24 calls (0.0 %), 0 tuples, 0.0 % of the ms; both: 0 of 129 calls (0.0 %), 0 tuples, 0.0 % of the ms / 0 of 104 calls (0.0 %), 0 tuples, 0.0 % of the ms.
- Start-count capped share (R29, before arm): 26 of 313 p1 tuples at the start count (0.083) over 119 calls.
- Window profiles per ok call (R12), median / mean: before 3.0 / 3.81 (103 ok calls; all tuples of the call); after 0.0 / 2.17 (77 ok calls; phases window, p2, beam, rerate).
- Waves (proxy, R13), median: before 3.61 (n 6), after 4.12 (n 6). Set-stage share T1 / T10 (median): 0.250 / 0.243.
- Work per accepted puzzle, batch and completion (set stage added), median, M units: before 1850.2 (2180.3), after 882.6 (1094.0); unfinished calls (unknown tails): 26 / 27 in 6 / 6 requests.
- Locate (R19, after arm): 77 calls; results hit 68, window 9; no-window proofs direct 77 (heuristic ends 0, never proofs); rescues in 0 calls, sides -; locate probes per call median 2.0, p90 4.0, max 6.
- Re-ratings (R18, after arm): per finished call mean 0.00, max 0; 0.0 % of the tuple ms, 0.0 % of the work.

## 14x14-master

MP12b1 report: docs/difficulty-v3/landscape-v3-full/14x14-master-2026-11-13.json; the before arm's response over MP12b1's on the same seeds: median 1.082.

| Seed | MP12b1 acc | MP12b1 T10 | MP12b1 resp | Before acc | Before T1 | Before T10 | Before resp | After acc | After T1 | After T10 | After resp | Identity (before vs MP12b1) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| landscape/14x14-master/0 | 10 | 11.02 | 11.18 | 10 | 4.31 | 11.18 | 11.32 | 10 | 1.08 | 5.12 | 5.29 | puzzle identity (resultDigest equal at equal accepted counts, 10) |
| landscape/14x14-master/1 | 10 | 3.00 | 3.12 | 10 | 0.37 | 3.18 | 3.31 | 10 | 0.27 | 2.15 | 2.29 | puzzle identity (resultDigest equal at equal accepted counts, 10) |
| landscape/14x14-master/2 | 10 | 1.65 | 1.79 | 10 | 0.40 | 1.81 | 1.94 | 10 | 0.36 | 1.45 | 1.61 | puzzle identity (resultDigest equal at equal accepted counts, 10) |
| landscape/14x14-master/3 | 10 | 1.62 | 1.75 | 10 | 0.39 | 1.80 | 1.94 | 10 | 0.94 | 2.66 | 2.80 | puzzle identity (resultDigest equal at equal accepted counts, 10) |
| landscape/14x14-master/4 | 10 | 2.90 | 3.06 | 10 | 0.83 | 3.17 | 3.31 | 10 | 0.94 | 3.17 | 3.32 | puzzle identity (resultDigest equal at equal accepted counts, 10) |

### 14x14-master: before arm, calls per stage

| Stage | Calls | Ok | No-window | Unfinished (profiles seen) | Profiles per call median / p90 / max | ms per call median / p90 | Work per call median / p90 | Outcomes |
|---|---:|---:|---:|---|---|---|---|---|
| set | 20 | 11 | 0 | 9 (1) | 2.0 / 5.0 / 5 | 253 / 717 | 20.1 M / 117.7 M | above 7, below 4, capped 1, central 11, in 7 |
| batch | 81 | 67 | 0 | 14 (14) | 3.0 / 9.0 / 17 | 299 / 1716 | 55.0 M / 366.4 M | above 90, ar1 4, below 60, capped 3, central 67, in 74 |

### 14x14-master: after arm, calls per stage

| Stage | Calls | Ok | No-window | Unfinished (profiles seen) | Profiles per call median / p90 / max | ms per call median / p90 | Work per call median / p90 | Outcomes |
|---|---:|---:|---:|---|---|---|---|---|
| set | 20 | 9 | 0 | 11 (2) | 2.0 / 9.0 / 9 | 257 / 952 | 20.1 M / 245.4 M | above 4, below 7, central 9, in 10, scap0 2 |
| batch | 78 | 65 | 0 | 13 (39) | 3.0 / 9.0 / 22 | 284 / 1219 | 50.2 M / 286.3 M | above 84, ar1 11, below 72, central 65, in 77, scap0 6 |

### 14x14-master: the multipliers

- Dead-end entries (R10 before, R11 after), batch: 0 of 81 calls (0.0 %), 0 tuples, 0.0 % of the ms / 0 of 78 calls (0.0 %), 0 tuples, 0.0 % of the ms; set: 0 of 20 calls (0.0 %), 0 tuples, 0.0 % of the ms / 0 of 20 calls (0.0 %), 0 tuples, 0.0 % of the ms; both: 0 of 101 calls (0.0 %), 0 tuples, 0.0 % of the ms / 0 of 98 calls (0.0 %), 0 tuples, 0.0 % of the ms.
- Start-count capped share (R29, before arm): 4 of 228 p1 tuples at the start count (0.018) over 84 calls.
- Window profiles per ok call (R12), median / mean: before 3.0 / 4.01 (78 ok calls; all tuples of the call); after 0.0 / 2.45 (74 ok calls; phases window, p2, beam, rerate).
- Waves (proxy, R13), median: before 7.41 (n 5), after 6.18 (n 5). Set-stage share T1 / T10 (median): 0.219 / 0.246.
- Work per accepted puzzle, batch and completion (set stage added), median, M units: before 164.5 (168.2), after 124.0 (134.1); unfinished calls (unknown tails): 23 / 24 in 5 / 5 requests.
- Locate (R19, after arm): 74 calls; results hit 65, window 9; no-window proofs direct 74 (heuristic ends 0, never proofs); rescues in 0 calls, sides -; locate probes per call median 1.0, p90 3.0, max 6.
- Re-ratings (R18, after arm): per finished call mean 0.00, max 0; 0.0 % of the tuple ms, 0.0 % of the work.

## 26x26-master

MP12b1 report: docs/difficulty-v3/landscape-v3-full/26x26-master-2026-11-14.json; the before arm's response over MP12b1's on the same seeds: median 1.011.

| Seed | MP12b1 acc | MP12b1 T10 | MP12b1 resp | Before acc | Before T1 | Before T10 | Before resp | After acc | After T1 | After T10 | After resp | Identity (before vs MP12b1) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| landscape/26x26-master/0 | 10 | 12.15 | 12.32 | 10 | 2.87 | 12.31 | 12.46 | 10 | 1.71 | 5.77 | 5.92 | puzzle identity (resultDigest equal at equal accepted counts, 10) |
| landscape/26x26-master/1 | 10 | 9.98 | 10.16 | 10 | 1.14 | 10.04 | 10.12 | 10 | 2.63 | 13.43 | 13.60 | puzzle identity (resultDigest equal at equal accepted counts, 10) |
| landscape/26x26-master/2 | 10 | 6.70 | 6.85 | 10 | 0.80 | 6.46 | 6.61 | 10 | 10.42 | 16.91 | 17.07 | puzzle identity (resultDigest equal at equal accepted counts, 10) |
| landscape/26x26-master/3 | 10 | 11.87 | 12.04 | 10 | 1.29 | 12.26 | 12.43 | 10 | 2.61 | 9.64 | 9.76 | puzzle identity (resultDigest equal at equal accepted counts, 10) |
| landscape/26x26-master/4 | 10 | 12.11 | 12.23 | 10 | 5.55 | 12.49 | 12.62 | 10 | 0.58 | 15.14 | 15.30 | puzzle identity (resultDigest equal at equal accepted counts, 10) |

### 26x26-master: before arm, calls per stage

| Stage | Calls | Ok | No-window | Unfinished (profiles seen) | Profiles per call median / p90 / max | ms per call median / p90 | Work per call median / p90 | Outcomes |
|---|---:|---:|---:|---|---|---|---|---|
| set | 20 | 12 | 0 | 8 (35) | 5.0 / 14.0 / 17 | 1072 / 2981 | 286.0 M / 757.7 M | above 4, ar1 4, below 68, central 12, in 32 |
| batch | 84 | 69 | 0 | 15 (71) | 6.0 / 16.0 / 30 | 1463 / 4239 | 431.1 M / 1294.7 M | above 34, ar1 12, below 363, central 69, in 131 |

### 26x26-master: after arm, calls per stage

| Stage | Calls | Ok | No-window | Unfinished (profiles seen) | Profiles per call median / p90 / max | ms per call median / p90 | Work per call median / p90 | Outcomes |
|---|---:|---:|---:|---|---|---|---|---|
| set | 20 | 11 | 0 | 9 (25) | 4.0 / 6.0 / 22 | 1239 / 2472 | 224.7 M / 721.8 M | above 15, ar1 1, below 31, central 11, in 14, scap0 1, scap1 6 |
| batch | 79 | 66 | 0 | 13 (66) | 4.0 / 12.0 / 34 | 1580 / 5239 | 454.9 M / 1495.1 M | above 73, ar1 5, below 177, central 66, in 118, over 1, scap0 16, scap1 15 |

### 26x26-master: the multipliers

- Dead-end entries (R10 before, R11 after), batch: 0 of 84 calls (0.0 %), 0 tuples, 0.0 % of the ms / 0 of 79 calls (0.0 %), 0 tuples, 0.0 % of the ms; set: 0 of 20 calls (0.0 %), 0 tuples, 0.0 % of the ms / 0 of 20 calls (0.0 %), 0 tuples, 0.0 % of the ms; both: 0 of 104 calls (0.0 %), 0 tuples, 0.0 % of the ms / 0 of 99 calls (0.0 %), 0 tuples, 0.0 % of the ms.
- Start-count capped share (R29, before arm): 0 of 364 p1 tuples at the start count (0.000) over 102 calls.
- Window profiles per ok call (R12), median / mean: before 6.0 / 7.69 (81 ok calls; all tuples of the call); after 2.0 / 3.62 (77 ok calls; phases window, p2, beam, rerate).
- Waves (proxy, R13), median: before 6.36 (n 5), after 4.97 (n 5). Set-stage share T1 / T10 (median): 0.124 / 0.271.
- Work per accepted puzzle, batch and completion (set stage added), median, M units: before 974.2 (1210.1), after 763.2 (1120.7); unfinished calls (unknown tails): 23 / 22 in 5 / 5 requests.
- Locate (R19, after arm): 77 calls; results hit 67, window 10; no-window proofs direct 77 (heuristic ends 0, never proofs); rescues in 0 calls, sides -; locate probes per call median 2.0, p90 4.0, max 6.
- Re-ratings (R18, after arm): per finished call mean 0.00, max 0; 0.0 % of the tuple ms, 0.0 % of the work.

## 26x26-hell-1

MP12b1 report: docs/difficulty-v3/landscape-v3-full/26x26-hell-1-2026-11-14.json; the before arm's response over MP12b1's on the same seeds: median 1.007.

| Seed | MP12b1 acc | MP12b1 T10 | MP12b1 resp | Before acc | Before T1 | Before T10 | Before resp | After acc | After T1 | After T10 | After resp | Identity (before vs MP12b1) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| landscape/26x26-hell-1/0 | 5 | - | 146.01 | 5 | 31.92 | - | 147.05 | 10 | 4.27 | 42.18 | 42.36 | puzzle identity (resultDigest equal at equal accepted counts, 5) |
| landscape/26x26-hell-1/1 | 10 | 167.59 | 167.75 | 10 | 90.35 | 179.29 | 179.44 | 10 | 12.84 | 37.25 | 37.43 | puzzle identity (resultDigest equal at equal accepted counts, 10) |
| landscape/26x26-hell-1/2 | 10 | 120.25 | 120.40 | 10 | 85.23 | 120.44 | 120.61 | 10 | 4.64 | 22.98 | 23.14 | puzzle identity (resultDigest equal at equal accepted counts, 10) |

### 26x26-hell-1: before arm, calls per stage

| Stage | Calls | Ok | No-window | Unfinished (profiles seen) | Profiles per call median / p90 / max | ms per call median / p90 | Work per call median / p90 | Outcomes |
|---|---:|---:|---:|---|---|---|---|---|
| set | 20 | 4 | 0 | 2 (16) | 20.0 / 20.0 / 20 | 42586 / 45076 | 15230.0 M / 15233.1 M | above 8, below 1, capped 325, central 4, in 6 |
| batch | 45 | 33 | 0 | 11 (57) | 9.0 / 20.0 / 41 | 18369 / 46939 | 5969.4 M / 15228.6 M | above 73, capped 278, central 32, in 49 |

### 26x26-hell-1: after arm, calls per stage

| Stage | Calls | Ok | No-window | Unfinished (profiles seen) | Profiles per call median / p90 / max | ms per call median / p90 | Work per call median / p90 | Outcomes |
|---|---:|---:|---:|---|---|---|---|---|
| set | 12 | 6 | 0 | 6 (33) | 4.5 / 17.0 / 17 | 4180 / 12650 | 1372.8 M / 4951.4 M | above 1, below 16, central 6, in 12, scap0 36 |
| batch | 50 | 41 | 0 | 9 (27) | 6.0 / 18.0 / 32 | 6032 / 11659 | 1753.8 M / 4069.2 M | above 16, below 133, central 40, in 54, scap0 126, scap1 1 |

### 26x26-hell-1: the multipliers

- Dead-end entries (R10 before, R11 after), batch: 16 of 45 calls (35.6 %), 75 tuples, 16.8 % of the ms / 0 of 50 calls (0.0 %), 0 tuples, 0.0 % of the ms; set: 17 of 20 calls (85.0 %), 233 tuples, 67.5 % of the ms / 0 of 12 calls (0.0 %), 0 tuples, 0.0 % of the ms; both: 33 of 65 calls (50.8 %), 308 tuples, 39.2 % of the ms / 0 of 62 calls (0.0 %), 0 tuples, 0.0 % of the ms.
- Start-count capped share (R29, before arm): 203 of 242 p1 tuples at the start count (0.839) over 63 calls.
- Window profiles per ok call (R12), median / mean: before 9.0 / 10.89 (37 ok calls; all tuples of the call); after 1.0 / 4.15 (47 ok calls; phases window, p2, beam, rerate).
- Waves (proxy, R13), median: before 3.72 (n 2), after 3.84 (n 3). Set-stage share T1 / T10 (median): 0.606 / 0.202.
- Work per accepted puzzle, batch and completion (set stage added), median, M units: before 10576.9 (22244.3), after 3124.1 (4217.3); unfinished calls (unknown tails): 13 / 15 in 3 / 3 requests.
- Locate (R19, after arm): 47 calls; results hit 35, window 12; no-window proofs direct 47 (heuristic ends 0, never proofs); rescues in 0 calls, sides -; locate probes per call median 4.0, p90 6.0, max 6.
- Re-ratings (R18, after arm): per finished call mean 0.00, max 0; 0.0 % of the tuple ms, 0.0 % of the work.

## Values of the §5 rows

| Row | Kind | Formula | Value |
|---|---|---|---|
| R01 | Measured; drift Derived | before arm T10 on reps 0-2 beside MP12b1 (20 reps); drift = median of before response / MP12b1 response on the same seeds | `{"14x14-nightmare":{"today":{"n":11,"min":46052.304599999996,"median":112978.63410000001,"p95":151637.2396,"max":151637.2396},"reRunBefore":{"n":1,"min":46543.7433,"median":46543.7433,"p95":46543.7433,"max":46543.7433},"reached":"1 of 3","responseDriftMedian":1.0092791744058127}}` |
| R02 | Measured; ratio Derived | after arm T10 median (n of 3); ratio = before T10 / after T10 per seed, both reached ten | `{"14x14-nightmare":{"afterT10":{"n":3,"min":5480.7047,"median":8942.1149,"p95":12198.9337,"max":12198.9337},"pairedT10Ratio":{"n":1,"median":3.8153943979546345,"min":3.8153943979546345,"max":3.8153943979546345}}}` |
| R03 | Measured | requests that reached ten / requests, reps 0-2 | `{"12x12-nightmare":{"before":"3 of 3","after":"3 of 3","censored":0},"14x14-nightmare":{"before":"1 of 3","after":"3 of 3","censored":0},"15x15b10-nightmare":{"before":"2 of 3","after":"3 of 3","censored":0}}` |
| R04 | Measured; ratio Derived | as R02 | `{"15x15b10-nightmare":{"afterT10":{"n":3,"min":5957.5059,"median":8445.7583,"p95":9006.5432,"max":9006.5432},"pairedT10Ratio":{"n":2,"median":8.215278657596759,"min":7.932069559511472,"max":8.498487755682046}}}` |
| R05 | Measured; ratio Derived | as R02 | `{"12x12-nightmare":{"afterT10":{"n":3,"min":4711.4834,"median":5735.4231,"p95":11177.4862,"max":11177.4862},"pairedT10Ratio":{"n":3,"median":9.26159452822234,"min":2.492034792223676,"max":15.49744439299096}}}` |
| R06 | Measured; ratio Derived | as R02 (reps 0-5) | `{"26x26-nightmare":{"afterT10":{"n":6,"min":9313.527,"median":11937.80255,"p95":15021.119,"max":15021.119},"pairedT10Ratio":{"n":6,"median":2.0137945394355423,"min":0.6896075315311228,"max":3.9058979374838336}}}` |
| R07 | Measured; ratio Derived | before and after T10 medians (reps 0-4) | `{"14x14-master":{"beforeT10":{"n":5,"min":1802.0324999999998,"median":3172.9042,"p95":11176.3014,"max":11176.3014},"afterT10":{"n":5,"min":1452.7441,"median":2663.4998,"p95":5118.8969,"max":5118.8969},"pairedT10Ratio":{"n":5,"median":1.2469649678838828,"min":0.6765656599636313,"max":2.1833417664653494}},"26x26-master":{"beforeT10":{"n":5,"min":6456.677299999999,"median":12263.5049,"p95":12491.9087,"max":12491.9087},"afterT10":{"n":5,"min":5773.3247,"median":13429.243499999999,"p95":16914.630999999998,"max":16914.630999999998},"pairedT10Ratio":{"n":5,"median":0.8252384373188708,"min":0.38172143985878265,"max":2.1316653296842976}}}` |
| R08 | Measured; ratio Derived | as R02, ten of n beside | `{"26x26-hell-1":{"afterT10":{"n":3,"min":22979.864800000003,"median":37245.4423,"p95":42175.7135,"max":42175.7135},"reached":"3 of 3","beforeReached":"2 of 3","pairedT10Ratio":{"n":2,"median":5.027459339247918,"min":4.813860763307407,"max":5.24105791518843}}}` |
| R10 | Derived | calls with a p2 phase entry / calls; sum of the p2 tuples ms / sum of all tuples ms; batch, set and both (before arm) | `{"14x14-nightmare":{"batch":{"calls":36,"callsWithP2":19,"callShare":0.5277777777777778,"p2Tuples":191,"p2Ms":407219,"allMs":1026005,"timeShare":0.39689773814351653},"set":{"calls":15,"callsWithP2":13,"callShare":0.8666666666666667,"p2Tuples":99,"p2Ms":216880,"allMs":409245,"timeShare":0.5299523299080766},"both":{"calls":51,"callsWithP2":32,"callShare":0.6274509803921569,"p2Tuples":290,"p2Ms":624100,"allMs":1435250,"timeShare":0.434836700335667}},"15x15b10-nightmare":{"batch":{"calls":50,"callsWithP2":26,"callShare":0.52,"p2Tuples":139,"p2Ms":301022,"allMs":810914,"timeShare":0.3712139378969347},"set":{"calls":16,"callsWithP2":15,"callShare":0.9375,"p2Tuples":101,"p2Ms":217064,"allMs":366914,"timeShare":0.5915943180028531},"both":{"calls":66,"callsWithP2":41,"callShare":0.6212121212121212,"p2Tuples":240,"p2Ms":518086,"allMs":1177827,"timeShare":0.4398662535099299}},"12x12-nightmare":{"batch":{"calls":44,"callsWithP2":9,"callShare":0.20454545454545456,"p2Tuples":39,"p2Ms":91345,"allMs":487570,"timeShare":0.18734789421214199},"set":{"calls":12,"callsWithP2":2,"callShare":0.16666666666666666,"p2Tuples":10,"p2Ms":22274,"allMs":89679,"timeShare":0.24837179792314495},"both":{"calls":56,"callsWithP2":11,"callShare":0.19642857142857142,"p2Tuples":49,"p2Ms":113619,"allMs":577248,"timeShare":0.19682828779804556}},"26x26-nightmare":{"batch":{"calls":105,"callsWithP2":0,"callShare":0,"p2Tuples":0,"p2Ms":0,"allMs":404309,"timeShare":0},"set":{"calls":24,"callsWithP2":0,"callShare":0,"p2Tuples":0,"p2Ms":0,"allMs":79551,"timeShare":0},"both":{"calls":129,"callsWithP2":0,"callShare":0,"p2Tuples":0,"p2Ms":0,"allMs":483859,"timeShare":0}},"14x14-master":{"batch":{"calls":81,"callsWithP2":0,"callShare":0,"p2Tuples":0,"p2Ms":0,"allMs":48361,"timeShare":0},"set":{"calls":20,"callsWithP2":0,"callShare":0,"p2Tuples":0,"p2Ms":0,"allMs":7705,"timeShare":0},"both":{"calls":101,"callsWithP2":0,"callShare":0,"p2Tuples":0,"p2Ms":0,"allMs":56066,"timeShare":0}},"26x26-master":{"batch":{"calls":84,"callsWithP2":0,"callShare":0,"p2Tuples":0,"p2Ms":0,"allMs":157188,"timeShare":0},"set":{"calls":20,"callsWithP2":0,"callShare":0,"p2Tuples":0,"p2Ms":0,"allMs":30296,"timeShare":0},"both":{"calls":104,"callsWithP2":0,"callShare":0,"p2Tuples":0,"p2Ms":0,"allMs":187484,"timeShare":0}},"26x26-hell-1":{"batch":{"calls":45,"callsWithP2":16,"callShare":0.35555555555555557,"p2Tuples":75,"p2Ms":157101,"allMs":937647,"timeShare":0.16754783238037935},"set":{"calls":20,"callsWithP2":17,"callShare":0.85,"p2Tuples":233,"p2Ms":503959,"allMs":746888,"timeShare":0.6747447676616681},"both":{"calls":65,"callsWithP2":33,"callShare":0.5076923076923077,"p2Tuples":308,"p2Ms":661059,"allMs":1684535,"timeShare":0.3924284152547842}}}` |
| R11 | Derived | the same on the after arm (p2 entries per call) | `{"14x14-nightmare":{"batch":{"calls":52,"callsWithP2":0,"callShare":0,"p2Tuples":0,"p2Ms":0,"allMs":71740,"timeShare":0},"set":{"calls":12,"callsWithP2":0,"callShare":0,"p2Tuples":0,"p2Ms":0,"allMs":21536,"timeShare":0},"both":{"calls":64,"callsWithP2":0,"callShare":0,"p2Tuples":0,"p2Ms":0,"allMs":93276,"timeShare":0}},"15x15b10-nightmare":{"batch":{"calls":55,"callsWithP2":0,"callShare":0,"p2Tuples":0,"p2Ms":0,"allMs":62917,"timeShare":0},"set":{"calls":12,"callsWithP2":0,"callShare":0,"p2Tuples":0,"p2Ms":0,"allMs":13690,"timeShare":0},"both":{"calls":67,"callsWithP2":0,"callShare":0,"p2Tuples":0,"p2Ms":0,"allMs":76607,"timeShare":0}},"12x12-nightmare":{"batch":{"calls":42,"callsWithP2":0,"callShare":0,"p2Tuples":0,"p2Ms":0,"allMs":63738,"timeShare":0},"set":{"calls":12,"callsWithP2":0,"callShare":0,"p2Tuples":0,"p2Ms":0,"allMs":10887,"timeShare":0},"both":{"calls":54,"callsWithP2":0,"callShare":0,"p2Tuples":0,"p2Ms":0,"allMs":74625,"timeShare":0}},"26x26-nightmare":{"batch":{"calls":80,"callsWithP2":0,"callShare":0,"p2Tuples":0,"p2Ms":0,"allMs":190963,"timeShare":0},"set":{"calls":24,"callsWithP2":0,"callShare":0,"p2Tuples":0,"p2Ms":0,"allMs":44150,"timeShare":0},"both":{"calls":104,"callsWithP2":0,"callShare":0,"p2Tuples":0,"p2Ms":0,"allMs":235113,"timeShare":0}},"14x14-master":{"batch":{"calls":78,"callsWithP2":0,"callShare":0,"p2Tuples":0,"p2Ms":0,"allMs":37155,"timeShare":0},"set":{"calls":20,"callsWithP2":0,"callShare":0,"p2Tuples":0,"p2Ms":0,"allMs":4016,"timeShare":0},"both":{"calls":98,"callsWithP2":0,"callShare":0,"p2Tuples":0,"p2Ms":0,"allMs":41171,"timeShare":0}},"26x26-master":{"batch":{"calls":79,"callsWithP2":0,"callShare":0,"p2Tuples":0,"p2Ms":0,"allMs":162784,"timeShare":0},"set":{"calls":20,"callsWithP2":0,"callShare":0,"p2Tuples":0,"p2Ms":0,"allMs":32015,"timeShare":0},"both":{"calls":99,"callsWithP2":0,"callShare":0,"p2Tuples":0,"p2Ms":0,"allMs":194799,"timeShare":0}},"26x26-hell-1":{"batch":{"calls":50,"callsWithP2":0,"callShare":0,"p2Tuples":0,"p2Ms":0,"allMs":314638,"timeShare":0},"set":{"calls":12,"callsWithP2":0,"callShare":0,"p2Tuples":0,"p2Ms":0,"allMs":64028,"timeShare":0},"both":{"calls":62,"callsWithP2":0,"callShare":0,"p2Tuples":0,"p2Ms":0,"allMs":378666,"timeShare":0}}}` |
| R12 | Measured | per ok call: before all tuples, after tuples of phases window, p2, beam, rerate; median | `{"14x14-nightmare":{"before":{"basis":"all tuples of the call","okCalls":18,"n":18,"median":6,"p90":32,"max":48,"mean":10.055555555555555},"after":{"basis":"phases window, p2, beam, rerate","okCalls":48,"n":48,"median":0,"p90":5,"max":12,"mean":1.6041666666666667}},"15x15b10-nightmare":{"before":{"basis":"all tuples of the call","okCalls":42,"n":42,"median":8,"p90":15,"max":17,"mean":8.238095238095237},"after":{"basis":"phases window, p2, beam, rerate","okCalls":51,"n":51,"median":0,"p90":3,"max":10,"mean":0.8431372549019608}},"12x12-nightmare":{"before":{"basis":"all tuples of the call","okCalls":40,"n":40,"median":5,"p90":10,"max":28,"mean":5.65},"after":{"basis":"phases window, p2, beam, rerate","okCalls":39,"n":39,"median":0,"p90":6,"max":9,"mean":1.4871794871794872}},"26x26-nightmare":{"before":{"basis":"all tuples of the call","okCalls":103,"n":103,"median":3,"p90":8,"max":17,"mean":3.8058252427184467},"after":{"basis":"phases window, p2, beam, rerate","okCalls":77,"n":77,"median":0,"p90":7,"max":15,"mean":2.168831168831169}},"14x14-master":{"before":{"basis":"all tuples of the call","okCalls":78,"n":78,"median":3,"p90":9,"max":17,"mean":4.012820512820513},"after":{"basis":"phases window, p2, beam, rerate","okCalls":74,"n":74,"median":0,"p90":7,"max":18,"mean":2.445945945945946}},"26x26-master":{"before":{"basis":"all tuples of the call","okCalls":81,"n":81,"median":6,"p90":14,"max":30,"mean":7.691358024691358},"after":{"basis":"phases window, p2, beam, rerate","okCalls":77,"n":77,"median":2,"p90":10,"max":32,"mean":3.6233766233766236}},"26x26-hell-1":{"before":{"basis":"all tuples of the call","okCalls":37,"n":37,"median":9,"p90":19,"max":41,"mean":10.891891891891891},"after":{"basis":"phases window, p2, beam, rerate","okCalls":47,"n":47,"median":1,"p90":13,"max":27,"mean":4.148936170212766}}}` |
| R13 | Derived (a proxy) | per request that reached ten: (T10 - T1) / median ms of its ok batch calls; median | `{"14x14-nightmare":{"before":{"n":1,"median":4.106695653680254,"p90":4.106695653680254,"max":4.106695653680254},"after":{"n":3,"median":6.244930356121122,"p90":8.9013649165473,"max":8.9013649165473}},"15x15b10-nightmare":{"before":{"n":2,"median":4.525431407530172,"p90":6.002151774446887,"max":6.002151774446887},"after":{"n":3,"median":4.85047236833117,"p90":8.166988334832405,"max":8.166988334832405}},"12x12-nightmare":{"before":{"n":3,"median":3.2014749066029666,"p90":6.3205193028346764,"max":6.3205193028346764},"after":{"n":3,"median":3.3812279008346557,"p90":5.08407075155798,"max":5.08407075155798}},"26x26-nightmare":{"before":{"n":6,"median":3.6072760744201,"p90":10.637667248179252,"max":10.637667248179252},"after":{"n":6,"median":4.120133661174373,"p90":5.600589288156846,"max":5.600589288156846}},"14x14-master":{"before":{"n":5,"median":7.412841561543943,"p90":12.066908161821758,"max":12.066908161821758},"after":{"n":5,"median":6.183917689046895,"p90":10.97463909406736,"max":10.97463909406736}},"26x26-master":{"before":{"n":5,"median":6.356624255024627,"p90":8.488239373348273,"max":8.488239373348273},"after":{"n":5,"median":4.967066389726532,"p90":14.118141063000564,"max":14.118141063000564}},"26x26-hell-1":{"before":{"n":2,"median":3.716995718108155,"p90":4.087732409799644,"max":4.087732409799644},"after":{"n":3,"median":3.8374899663656064,"p90":6.380780484340123,"max":6.380780484340123}}}` |
| R18 | Derived | rescue and rerate tuples per finished call; their share of the summed tuple ms and work | `{"14x14-nightmare":{"callsFinished":48,"perCallMean":0,"perCallMax":0,"msShare":0,"workShare":0},"15x15b10-nightmare":{"callsFinished":51,"perCallMean":0,"perCallMax":0,"msShare":0,"workShare":0},"12x12-nightmare":{"callsFinished":39,"perCallMean":0,"perCallMax":0,"msShare":0,"workShare":0},"26x26-nightmare":{"callsFinished":77,"perCallMean":0,"perCallMax":0,"msShare":0,"workShare":0},"14x14-master":{"callsFinished":74,"perCallMean":0,"perCallMax":0,"msShare":0,"workShare":0},"26x26-master":{"callsFinished":77,"perCallMean":0,"perCallMax":0,"msShare":0,"workShare":0},"26x26-hell-1":{"callsFinished":47,"perCallMean":0,"perCallMax":0,"msShare":0,"workShare":0}}` |
| R19 | Measured | locate probes per finished call (median, p90) and the locate results and no-window proofs | `{"14x14-nightmare":{"calls":48,"results":{"hit":41,"window":7},"proofs":{"direct":48},"callsWithRescue":0,"rescueSides":{},"probes":{"n":48,"median":2,"p90":4,"max":5},"heuristicEnds":0},"15x15b10-nightmare":{"calls":51,"results":{"hit":48,"window":3},"proofs":{"direct":51},"callsWithRescue":0,"rescueSides":{},"probes":{"n":51,"median":2,"p90":4,"max":6},"heuristicEnds":0},"12x12-nightmare":{"calls":39,"results":{"hit":37,"window":2},"proofs":{"direct":39},"callsWithRescue":0,"rescueSides":{},"probes":{"n":39,"median":2,"p90":4,"max":4},"heuristicEnds":0},"26x26-nightmare":{"calls":77,"results":{"hit":68,"window":9},"proofs":{"direct":77},"callsWithRescue":0,"rescueSides":{},"probes":{"n":77,"median":2,"p90":4,"max":6},"heuristicEnds":0},"14x14-master":{"calls":74,"results":{"hit":65,"window":9},"proofs":{"direct":74},"callsWithRescue":0,"rescueSides":{},"probes":{"n":74,"median":1,"p90":3,"max":6},"heuristicEnds":0},"26x26-master":{"calls":77,"results":{"hit":67,"window":10},"proofs":{"direct":77},"callsWithRescue":0,"rescueSides":{},"probes":{"n":77,"median":2,"p90":4,"max":6},"heuristicEnds":0},"26x26-hell-1":{"calls":47,"results":{"hit":35,"window":12},"proofs":{"direct":47},"callsWithRescue":0,"rescueSides":{},"probes":{"n":47,"median":4,"p90":6,"max":6},"heuristicEnds":0}}` |
| R29 | Derived | p1 tuples at the call start count that are capped / all p1 tuples at it (before arm, every stage) | `{"14x14-nightmare":{"tuples":180,"capped":163,"share":0.9055555555555556,"calls":48},"15x15b10-nightmare":{"tuples":244,"capped":217,"share":0.889344262295082,"calls":65},"12x12-nightmare":{"tuples":161,"capped":105,"share":0.6521739130434783,"calls":49},"26x26-nightmare":{"tuples":313,"capped":26,"share":0.08306709265175719,"calls":119},"14x14-master":{"tuples":228,"capped":4,"share":0.017543859649122806,"calls":84},"26x26-master":{"tuples":364,"capped":0,"share":0,"calls":102},"26x26-hell-1":{"tuples":242,"capped":203,"share":0.8388429752066116,"calls":63}}` |

## Journal

Journal lines (appends): before 5706, after 4124. Measured cost of one append (self-test): 0.313 ms; before 1.786 s, after 1.291 s in all (appends x cost), to be read beside the timings. Journal sources: 12x12-nightmare: published journal; 14x14-nightmare: published journal; 15x15b10-nightmare: published journal; 26x26-hell-1: published journal; fast: published journal; 12x12-nightmare: published journal; 14x14-nightmare: published journal; 15x15b10-nightmare: published journal; 26x26-hell-1: published journal; fast: published journal.
