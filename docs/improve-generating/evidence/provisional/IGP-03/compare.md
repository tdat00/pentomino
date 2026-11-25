# IGP-03 comparison: W variants, no screen and arity 3 against IGP-01

> **Provisional (pre-freeze).** Measured on rating-v3 runtime cd5d17f (worktree 0e1283e) (source digest 34cea386…, equal to MP12b1's source), not on the frozen post-MP17 source. Re-run: pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\IGP-03.json -Label frozen -SourceLabel <label> -LockHelper <path>.

Provisional (pre-freeze) numbers. "After" values are *Measured*, ratios are *Derived* (before / after on matched seeds), the estimates are the analysts' *Projections* (check-list §5). Matched cohorts only: reps 0-2 on the slow cells (no p95 can be read from three requests), 0-4 and 0-5 on the fast shard. A faster request that delivers fewer puzzles is never read as a gain; completion is always beside a time. IGP-07 gives the descriptive verdicts.

Identity: The before arm agrees with MP12b1 on every seed (puzzle identity or metric-prefix agreement, named per seed).

In this study each pair is "first arm / second arm" on matched seeds only (the seeds both arms ran): the headline tables below give the paired ratios, the study sections after them the per-W, population, split, shift, offset and arity-3 figures. The records of the arms of IGP-01 are read from its published folders.

## Headline: IGP-01/before (log) against w095 (p1p5-w095)

| Cell | Today, MP12b1 20 reps: T10 median / p95 | MP12b1 on these seeds: T10 median, response median | Before: T10 median / p95 | After: T10 median / p95 | Paired T10 ratio (median [min-max]) | Paired response ratio | Ten of n before / after | Opus | Astra |
|---|---|---|---|---|---|---|---|---|---|
| 14x14 Nightmare | 112.98 / 151.64 (ten of 20) | -, 169.57 (ten of 2) | - / - (ten of 2) | 4.64 / 5.76 (ten of 2) | - | 36.94 [31.21-42.67] n 2 | 0 of 2 / 2 of 2 | 17.7 s | 16.0 s |
| 12x12 Nightmare | 62.14 / 176.07 (ten of 20) | 51.60, 51.74 (ten of 2) | 50.44 / 73.02 (ten of 2) | 6.12 / 9.58 (ten of 2) | 15.12 [2.91-27.32] n 2 | 14.46 [2.88-26.04] n 2 | 2 of 2 / 2 of 2 | about 39-48 s | 44.5 s |

T1, response and p95 of the response (median, s), before / after:

- 14x14 Nightmare: T1 55.72 / 0.97; response 170.75 / 4.80; p95 of the response 185.00 / 5.93; fewer puzzles in the after arm: none
- 12x12 Nightmare: T1 2.74 / 2.08; response 50.55 / 6.26; p95 of the response 73.13 / 9.71; fewer puzzles in the after arm: none

## 14x14-nightmare (IGP-01/before / w095)

MP12b1 report: docs/difficulty-v3/landscape-v3-full/14x14-nightmare-2026-11-13.json; the before arm's response over MP12b1's on the same seeds: median 1.007.

| Seed | MP12b1 acc | MP12b1 T10 | MP12b1 resp | Before acc | Before T1 | Before T10 | Before resp | After acc | After T1 | After T10 | After resp | Identity (before vs MP12b1) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| landscape/14x14-nightmare/0 | 1 | - | 155.84 | 1 | 41.47 | - | 156.50 | 10 | 0.91 | 3.52 | 3.67 | puzzle identity (resultDigest equal at equal accepted counts, 1) |
| landscape/14x14-nightmare/1 | 1 | - | 183.30 | 1 | 69.97 | - | 185.00 | 10 | 1.03 | 5.76 | 5.93 | puzzle identity (resultDigest equal at equal accepted counts, 1) |

### 14x14-nightmare: before arm, calls per stage

| Stage | Calls | Ok | No-window | Unfinished (profiles seen) | Profiles per call median / p90 / max | ms per call median / p90 | Work per call median / p90 | Outcomes |
|---|---:|---:|---:|---|---|---|---|---|
| set | 11 | 3 | 0 | 4 (39) | 20.0 / 32.0 / 32 | 43074 / 69856 | 15202.3 M / 24724.6 M | above 3, capped 154, central 3, in 2 |
| batch | 22 | 3 | 0 | 8 (150) | 20.0 / 21.0 / 48 | 42303 / 44095 | 15202.5 M / 16042.8 M | above 27, capped 391, central 2, in 5 |

### 14x14-nightmare: after arm, calls per stage

| Stage | Calls | Ok | No-window | Unfinished (profiles seen) | Profiles per call median / p90 / max | ms per call median / p90 | Work per call median / p90 | Outcomes |
|---|---:|---:|---:|---|---|---|---|---|
| set | 8 | 2 | 0 | 6 (13) | 3.0 / 3.0 / 3 | 851 / 906 | 231.8 M / 236.2 M | below 1, central 2, in 1, scap0 15 |
| batch | 29 | 23 | 0 | 6 (10) | 4.0 / 7.0 / 10 | 937 / 1412 | 272.3 M / 431.3 M | above 1, ar1 1, below 19, central 23, in 17, scap0 53, scap1 1 |

### 14x14-nightmare: the multipliers

- Dead-end entries (R10 before, R11 after), batch: 18 of 22 calls (81.8 %), 189 tuples, 44.3 % of the ms / 0 of 29 calls (0.0 %), 0 tuples, 0.0 % of the ms; set: 10 of 11 calls (90.9 %), 91 tuples, 56.9 % of the ms / 0 of 8 calls (0.0 %), 0 tuples, 0.0 % of the ms; both: 28 of 33 calls (84.8 %), 280 tuples, 47.8 % of the ms / 0 of 37 calls (0.0 %), 0 tuples, 0.0 % of the ms.
- Start-count capped share (R29, before arm): 122 of 125 p1 tuples at the start count (0.976) over 32 calls.
- Window profiles per ok call (R12), median / mean: before 9.5 / 17.83 (6 ok calls; all tuples of the call); after 0.0 / 1.36 (25 ok calls; phases window, p2, beam, rerate).
- Waves (proxy, R13), median: before - (n 0), after 4.03 (n 2). Set-stage share T1 / T10 (median): - / 0.219.
- Work per accepted puzzle, batch and completion (set stage added), median, M units: before 161829.8 (222783.3), after 396.6 (475.5); unfinished calls (unknown tails): 12 / 12 in 2 / 2 requests.
- Locate (R19, after arm): 25 calls; results hit 21, window 4; no-window proofs direct 25 (heuristic ends 0, never proofs); rescues in 0 calls, sides -; locate probes per call median 3.0, p90 4.0, max 5.
- Re-ratings (R18, after arm): per finished call mean 0.00, max 0; 0.0 % of the tuple ms, 0.0 % of the work.

## 12x12-nightmare (IGP-01/before / w095)

MP12b1 report: docs/difficulty-v3/landscape-v3-full/12x12-nightmare-2026-11-13.json; the before arm's response over MP12b1's on the same seeds: median 0.963.

| Seed | MP12b1 acc | MP12b1 T10 | MP12b1 resp | Before acc | Before T1 | Before T10 | Before resp | After acc | After T1 | After T10 | After resp | Identity (before vs MP12b1) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| landscape/12x12-nightmare/0 | 10 | 73.27 | 73.42 | 10 | 4.66 | 73.02 | 73.13 | 10 | 0.73 | 2.67 | 2.81 | puzzle identity (resultDigest equal at equal accepted counts, 10) |
| landscape/12x12-nightmare/1 | 10 | 29.92 | 30.06 | 10 | 0.82 | 27.85 | 27.96 | 10 | 3.44 | 9.58 | 9.71 | puzzle identity (resultDigest equal at equal accepted counts, 10) |

### 12x12-nightmare: before arm, calls per stage

| Stage | Calls | Ok | No-window | Unfinished (profiles seen) | Profiles per call median / p90 / max | ms per call median / p90 | Work per call median / p90 | Outcomes |
|---|---:|---:|---:|---|---|---|---|---|
| set | 8 | 3 | 0 | 5 (1) | 1.0 / 3.0 / 3 | 2101 / 4538 | 687.8 M / 1490.1 M | above 1, capped 2, central 3 |
| batch | 32 | 26 | 0 | 6 (25) | 4.0 / 9.0 / 28 | 8989 / 19964 | 2827.7 M / 5844.5 M | above 26, capped 104, central 26, in 8 |

### 12x12-nightmare: after arm, calls per stage

| Stage | Calls | Ok | No-window | Unfinished (profiles seen) | Profiles per call median / p90 / max | ms per call median / p90 | Work per call median / p90 | Outcomes |
|---|---:|---:|---:|---|---|---|---|---|
| set | 8 | 4 | 0 | 4 (5) | 2.5 / 9.0 / 9 | 859 / 3334 | 227.2 M / 987.7 M | below 1, central 4, in 2, scap0 12, scap1 1 |
| batch | 27 | 22 | 0 | 5 (3) | 5.0 / 12.0 / 16 | 1171 / 2181 | 307.8 M / 573.6 M | below 49, central 22, in 15, scap0 37, scap1 10 |

### 12x12-nightmare: the multipliers

- Dead-end entries (R10 before, R11 after), batch: 6 of 32 calls (18.8 %), 34 tuples, 22.4 % of the ms / 0 of 27 calls (0.0 %), 0 tuples, 0.0 % of the ms; set: 0 of 8 calls (0.0 %), 0 tuples, 0.0 % of the ms / 0 of 8 calls (0.0 %), 0 tuples, 0.0 % of the ms; both: 6 of 40 calls (15.0 %), 34 tuples, 21.8 % of the ms / 0 of 35 calls (0.0 %), 0 tuples, 0.0 % of the ms.
- Start-count capped share (R29, before arm): 66 of 108 p1 tuples at the start count (0.611) over 34 calls.
- Window profiles per ok call (R12), median / mean: before 4.0 / 4.97 (29 ok calls; all tuples of the call); after 1.0 / 2.85 (26 ok calls; phases window, p2, beam, rerate).
- Waves (proxy, R13), median: before 4.76 (n 2), after 3.08 (n 2). Set-stage share T1 / T10 (median): 0.047 / 0.315.
- Work per accepted puzzle, batch and completion (set stage added), median, M units: before 5702.6 (5861.8), after 396.5 (501.4); unfinished calls (unknown tails): 11 / 9 in 2 / 2 requests.
- Locate (R19, after arm): 26 calls; results hit 19, window 7; no-window proofs direct 26 (heuristic ends 0, never proofs); rescues in 0 calls, sides -; locate probes per call median 2.5, p90 4.0, max 4.
- Re-ratings (R18, after arm): per finished call mean 0.00, max 0; 0.0 % of the tuple ms, 0.0 % of the work.
## Headline: IGP-01/before (log) against w380 (p1p5-w380)

| Cell | Today, MP12b1 20 reps: T10 median / p95 | MP12b1 on these seeds: T10 median, response median | Before: T10 median / p95 | After: T10 median / p95 | Paired T10 ratio (median [min-max]) | Paired response ratio | Ten of n before / after | Opus | Astra |
|---|---|---|---|---|---|---|---|---|---|
| 14x14 Nightmare | 112.98 / 151.64 (ten of 20) | -, 169.57 (ten of 2) | - / - (ten of 2) | 11.22 / 13.36 (ten of 2) | - | 15.32 [13.70-16.94] n 2 | 0 of 2 / 2 of 2 | 17.7 s | 16.0 s |
| 12x12 Nightmare | 62.14 / 176.07 (ten of 20) | 51.60, 51.74 (ten of 2) | 50.44 / 73.02 (ten of 2) | 10.15 / 15.19 (ten of 2) | 8.05 [1.83-14.27] n 2 | 7.88 [1.82-13.94] n 2 | 2 of 2 / 2 of 2 | about 39-48 s | 44.5 s |
| 26x26 Master | 8.36 / 16.64 (ten of 20) | 11.87, 12.04 (ten of 5) | 12.26 / 12.49 (ten of 5) | 11.85 / 15.79 (ten of 5) | 0.79 [0.54-2.24] n 5 | 0.79 [0.55-2.20] n 5 | 5 of 5 / 5 of 5 | unchanged (today 8.36 s) | unchanged |

T1, response and p95 of the response (median, s), before / after:

- 14x14 Nightmare: T1 55.72 / 2.44; response 170.75 / 11.37; p95 of the response 185.00 / 13.50; fewer puzzles in the after arm: none
- 12x12 Nightmare: T1 2.74 / 1.10; response 50.55 / 10.29; p95 of the response 73.13 / 15.33; fewer puzzles in the after arm: none
- 26x26 Master: T1 1.29 / 2.69; response 12.43 / 12.00; p95 of the response 12.62 / 15.92; fewer puzzles in the after arm: none

## 14x14-nightmare (IGP-01/before / w380)

MP12b1 report: docs/difficulty-v3/landscape-v3-full/14x14-nightmare-2026-11-13.json; the before arm's response over MP12b1's on the same seeds: median 1.007.

| Seed | MP12b1 acc | MP12b1 T10 | MP12b1 resp | Before acc | Before T1 | Before T10 | Before resp | After acc | After T1 | After T10 | After resp | Identity (before vs MP12b1) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| landscape/14x14-nightmare/0 | 1 | - | 155.84 | 1 | 41.47 | - | 156.50 | 10 | 2.19 | 9.08 | 9.24 | puzzle identity (resultDigest equal at equal accepted counts, 1) |
| landscape/14x14-nightmare/1 | 1 | - | 183.30 | 1 | 69.97 | - | 185.00 | 10 | 2.70 | 13.36 | 13.50 | puzzle identity (resultDigest equal at equal accepted counts, 1) |

### 14x14-nightmare: before arm, calls per stage

| Stage | Calls | Ok | No-window | Unfinished (profiles seen) | Profiles per call median / p90 / max | ms per call median / p90 | Work per call median / p90 | Outcomes |
|---|---:|---:|---:|---|---|---|---|---|
| set | 11 | 3 | 0 | 4 (39) | 20.0 / 32.0 / 32 | 43074 / 69856 | 15202.3 M / 24724.6 M | above 3, capped 154, central 3, in 2 |
| batch | 22 | 3 | 0 | 8 (150) | 20.0 / 21.0 / 48 | 42303 / 44095 | 15202.5 M / 16042.8 M | above 27, capped 391, central 2, in 5 |

### 14x14-nightmare: after arm, calls per stage

| Stage | Calls | Ok | No-window | Unfinished (profiles seen) | Profiles per call median / p90 / max | ms per call median / p90 | Work per call median / p90 | Outcomes |
|---|---:|---:|---:|---|---|---|---|---|
| set | 8 | 3 | 0 | 5 (7) | 3.0 / 3.0 / 3 | 2145 / 2578 | 797.5 M / 806.1 M | below 1, central 3, in 1, scap0 11 |
| batch | 29 | 23 | 0 | 6 (9) | 3.0 / 6.0 / 10 | 2273 / 3752 | 792.2 M / 1240.2 M | above 2, ar1 1, below 13, central 23, in 12, scap0 43, scap1 1 |

### 14x14-nightmare: the multipliers

- Dead-end entries (R10 before, R11 after), batch: 18 of 22 calls (81.8 %), 189 tuples, 44.3 % of the ms / 0 of 29 calls (0.0 %), 0 tuples, 0.0 % of the ms; set: 10 of 11 calls (90.9 %), 91 tuples, 56.9 % of the ms / 0 of 8 calls (0.0 %), 0 tuples, 0.0 % of the ms; both: 28 of 33 calls (84.8 %), 280 tuples, 47.8 % of the ms / 0 of 37 calls (0.0 %), 0 tuples, 0.0 % of the ms.
- Start-count capped share (R29, before arm): 122 of 125 p1 tuples at the start count (0.976) over 32 calls.
- Window profiles per ok call (R12), median / mean: before 9.5 / 17.83 (6 ok calls; all tuples of the call); after 0.0 / 0.96 (26 ok calls; phases window, p2, beam, rerate).
- Waves (proxy, R13), median: before - (n 0), after 4.20 (n 2). Set-stage share T1 / T10 (median): - / 0.222.
- Work per accepted puzzle, batch and completion (set stage added), median, M units: before 161829.8 (222783.3), after 1070.3 (1292.8); unfinished calls (unknown tails): 12 / 11 in 2 / 2 requests.
- Locate (R19, after arm): 26 calls; results hit 24, window 2; no-window proofs direct 26 (heuristic ends 0, never proofs); rescues in 0 calls, sides -; locate probes per call median 3.0, p90 4.0, max 5.
- Re-ratings (R18, after arm): per finished call mean 0.00, max 0; 0.0 % of the tuple ms, 0.0 % of the work.

## 12x12-nightmare (IGP-01/before / w380)

MP12b1 report: docs/difficulty-v3/landscape-v3-full/12x12-nightmare-2026-11-13.json; the before arm's response over MP12b1's on the same seeds: median 0.963.

| Seed | MP12b1 acc | MP12b1 T10 | MP12b1 resp | Before acc | Before T1 | Before T10 | Before resp | After acc | After T1 | After T10 | After resp | Identity (before vs MP12b1) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| landscape/12x12-nightmare/0 | 10 | 73.27 | 73.42 | 10 | 4.66 | 73.02 | 73.13 | 10 | 0.69 | 5.12 | 5.25 | puzzle identity (resultDigest equal at equal accepted counts, 10) |
| landscape/12x12-nightmare/1 | 10 | 29.92 | 30.06 | 10 | 0.82 | 27.85 | 27.96 | 10 | 1.51 | 15.19 | 15.33 | puzzle identity (resultDigest equal at equal accepted counts, 10) |

### 12x12-nightmare: before arm, calls per stage

| Stage | Calls | Ok | No-window | Unfinished (profiles seen) | Profiles per call median / p90 / max | ms per call median / p90 | Work per call median / p90 | Outcomes |
|---|---:|---:|---:|---|---|---|---|---|
| set | 8 | 3 | 0 | 5 (1) | 1.0 / 3.0 / 3 | 2101 / 4538 | 687.8 M / 1490.1 M | above 1, capped 2, central 3 |
| batch | 32 | 26 | 0 | 6 (25) | 4.0 / 9.0 / 28 | 8989 / 19964 | 2827.7 M / 5844.5 M | above 26, capped 104, central 26, in 8 |

### 12x12-nightmare: after arm, calls per stage

| Stage | Calls | Ok | No-window | Unfinished (profiles seen) | Profiles per call median / p90 / max | ms per call median / p90 | Work per call median / p90 | Outcomes |
|---|---:|---:|---:|---|---|---|---|---|
| set | 8 | 2 | 0 | 6 (2) | 1.5 / 2.0 / 2 | 983 / 1392 | 248.2 M / 396.4 M | below 1, central 2, scap0 1, scap1 1 |
| batch | 27 | 22 | 0 | 5 (16) | 2.0 / 8.0 / 12 | 2131 / 4276 | 597.4 M / 1171.6 M | above 5, below 26, central 22, in 20, scap0 17, scap1 11 |

### 12x12-nightmare: the multipliers

- Dead-end entries (R10 before, R11 after), batch: 6 of 32 calls (18.8 %), 34 tuples, 22.4 % of the ms / 0 of 27 calls (0.0 %), 0 tuples, 0.0 % of the ms; set: 0 of 8 calls (0.0 %), 0 tuples, 0.0 % of the ms / 0 of 8 calls (0.0 %), 0 tuples, 0.0 % of the ms; both: 6 of 40 calls (15.0 %), 34 tuples, 21.8 % of the ms / 0 of 35 calls (0.0 %), 0 tuples, 0.0 % of the ms.
- Start-count capped share (R29, before arm): 66 of 108 p1 tuples at the start count (0.611) over 34 calls.
- Window profiles per ok call (R12), median / mean: before 4.0 / 4.97 (29 ok calls; all tuples of the call); after 0.0 / 1.63 (24 ok calls; phases window, p2, beam, rerate).
- Waves (proxy, R13), median: before 4.76 (n 2), after 4.18 (n 2). Set-stage share T1 / T10 (median): 0.047 / 0.117.
- Work per accepted puzzle, batch and completion (set stage added), median, M units: before 5702.6 (5861.8), after 944.4 (1011.3); unfinished calls (unknown tails): 11 / 11 in 2 / 2 requests.
- Locate (R19, after arm): 24 calls; results hit 24; no-window proofs direct 24 (heuristic ends 0, never proofs); rescues in 0 calls, sides -; locate probes per call median 2.0, p90 4.0, max 4.
- Re-ratings (R18, after arm): per finished call mean 0.00, max 0; 0.0 % of the tuple ms, 0.0 % of the work.

## 26x26-master (IGP-01/before / w380)

MP12b1 report: docs/difficulty-v3/landscape-v3-full/26x26-master-2026-11-14.json; the before arm's response over MP12b1's on the same seeds: median 1.011.

| Seed | MP12b1 acc | MP12b1 T10 | MP12b1 resp | Before acc | Before T1 | Before T10 | Before resp | After acc | After T1 | After T10 | After resp | Identity (before vs MP12b1) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| landscape/26x26-master/0 | 10 | 12.15 | 12.32 | 10 | 2.87 | 12.31 | 12.46 | 10 | 1.72 | 5.50 | 5.66 | puzzle identity (resultDigest equal at equal accepted counts, 10) |
| landscape/26x26-master/1 | 10 | 9.98 | 10.16 | 10 | 1.14 | 10.04 | 10.12 | 10 | 2.75 | 13.11 | 13.30 | puzzle identity (resultDigest equal at equal accepted counts, 10) |
| landscape/26x26-master/2 | 10 | 6.70 | 6.85 | 10 | 0.80 | 6.46 | 6.61 | 10 | 2.87 | 11.85 | 12.00 | puzzle identity (resultDigest equal at equal accepted counts, 10) |
| landscape/26x26-master/3 | 10 | 11.87 | 12.04 | 10 | 1.29 | 12.26 | 12.43 | 10 | 2.69 | 10.26 | 10.38 | puzzle identity (resultDigest equal at equal accepted counts, 10) |
| landscape/26x26-master/4 | 10 | 12.11 | 12.23 | 10 | 5.55 | 12.49 | 12.62 | 10 | 0.53 | 15.79 | 15.92 | puzzle identity (resultDigest equal at equal accepted counts, 10) |

### 26x26-master: before arm, calls per stage

| Stage | Calls | Ok | No-window | Unfinished (profiles seen) | Profiles per call median / p90 / max | ms per call median / p90 | Work per call median / p90 | Outcomes |
|---|---:|---:|---:|---|---|---|---|---|
| set | 20 | 12 | 0 | 8 (35) | 5.0 / 14.0 / 17 | 1072 / 2981 | 286.0 M / 757.7 M | above 4, ar1 4, below 68, central 12, in 32 |
| batch | 84 | 69 | 0 | 15 (71) | 6.0 / 16.0 / 30 | 1463 / 4239 | 431.1 M / 1294.7 M | above 34, ar1 12, below 363, central 69, in 131 |

### 26x26-master: after arm, calls per stage

| Stage | Calls | Ok | No-window | Unfinished (profiles seen) | Profiles per call median / p90 / max | ms per call median / p90 | Work per call median / p90 | Outcomes |
|---|---:|---:|---:|---|---|---|---|---|
| set | 20 | 11 | 0 | 9 (26) | 4.0 / 6.0 / 6 | 1250 / 2561 | 224.7 M / 721.8 M | above 8, ar1 1, below 29, central 11, in 13 |
| batch | 87 | 73 | 0 | 14 (82) | 4.0 / 10.0 / 34 | 1467 / 3704 | 417.2 M / 1148.9 M | above 90, ar1 4, below 164, central 73, in 122, scap0 3, scap1 1 |

### 26x26-master: the multipliers

- Dead-end entries (R10 before, R11 after), batch: 0 of 84 calls (0.0 %), 0 tuples, 0.0 % of the ms / 0 of 87 calls (0.0 %), 0 tuples, 0.0 % of the ms; set: 0 of 20 calls (0.0 %), 0 tuples, 0.0 % of the ms / 0 of 20 calls (0.0 %), 0 tuples, 0.0 % of the ms; both: 0 of 104 calls (0.0 %), 0 tuples, 0.0 % of the ms / 0 of 107 calls (0.0 %), 0 tuples, 0.0 % of the ms.
- Start-count capped share (R29, before arm): 0 of 364 p1 tuples at the start count (0.000) over 102 calls.
- Window profiles per ok call (R12), median / mean: before 6.0 / 7.69 (81 ok calls; all tuples of the call); after 1.0 / 2.71 (84 ok calls; phases window, p2, beam, rerate).
- Waves (proxy, R13), median: before 6.36 (n 5), after 4.81 (n 5). Set-stage share T1 / T10 (median): 0.124 / 0.242.
- Work per accepted puzzle, batch and completion (set stage added), median, M units: before 974.2 (1210.1), after 1032.4 (1132.1); unfinished calls (unknown tails): 23 / 23 in 5 / 5 requests.
- Locate (R19, after arm): 84 calls; results hit 78, window 6; no-window proofs direct 84 (heuristic ends 0, never proofs); rescues in 0 calls, sides -; locate probes per call median 2.0, p90 4.0, max 4.
- Re-ratings (R18, after arm): per finished call mean 0.00, max 0; 0.0 % of the tuple ms, 0.0 % of the work.
## Headline: IGP-01/before (log) against w760 (p1p5-w760)

| Cell | Today, MP12b1 20 reps: T10 median / p95 | MP12b1 on these seeds: T10 median, response median | Before: T10 median / p95 | After: T10 median / p95 | Paired T10 ratio (median [min-max]) | Paired response ratio | Ten of n before / after | Opus | Astra |
|---|---|---|---|---|---|---|---|---|---|
| 14x14 Nightmare | 112.98 / 151.64 (ten of 20) | -, 169.57 (ten of 2) | - / - (ten of 2) | 17.73 / 18.86 (ten of 2) | - | 9.54 [9.35-9.74] n 2 | 0 of 2 / 2 of 2 | 17.7 s | 16.0 s |
| 12x12 Nightmare | 62.14 / 176.07 (ten of 20) | 51.60, 51.74 (ten of 2) | 50.44 / 73.02 (ten of 2) | 9.15 / 13.08 (ten of 2) | 8.06 [2.13-13.99] n 2 | 7.90 [2.12-13.67] n 2 | 2 of 2 / 2 of 2 | about 39-48 s | 44.5 s |

T1, response and p95 of the response (median, s), before / after:

- 14x14 Nightmare: T1 55.72 / 4.13; response 170.75 / 17.87; p95 of the response 185.00 / 19.00; fewer puzzles in the after arm: none
- 12x12 Nightmare: T1 2.74 / 1.07; response 50.55 / 9.27; p95 of the response 73.13 / 13.20; fewer puzzles in the after arm: none

## 14x14-nightmare (IGP-01/before / w760)

MP12b1 report: docs/difficulty-v3/landscape-v3-full/14x14-nightmare-2026-11-13.json; the before arm's response over MP12b1's on the same seeds: median 1.007.

| Seed | MP12b1 acc | MP12b1 T10 | MP12b1 resp | Before acc | Before T1 | Before T10 | Before resp | After acc | After T1 | After T10 | After resp | Identity (before vs MP12b1) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| landscape/14x14-nightmare/0 | 1 | - | 155.84 | 1 | 41.47 | - | 156.50 | 10 | 3.73 | 16.61 | 16.74 | puzzle identity (resultDigest equal at equal accepted counts, 1) |
| landscape/14x14-nightmare/1 | 1 | - | 183.30 | 1 | 69.97 | - | 185.00 | 10 | 4.53 | 18.86 | 19.00 | puzzle identity (resultDigest equal at equal accepted counts, 1) |

### 14x14-nightmare: before arm, calls per stage

| Stage | Calls | Ok | No-window | Unfinished (profiles seen) | Profiles per call median / p90 / max | ms per call median / p90 | Work per call median / p90 | Outcomes |
|---|---:|---:|---:|---|---|---|---|---|
| set | 11 | 3 | 0 | 4 (39) | 20.0 / 32.0 / 32 | 43074 / 69856 | 15202.3 M / 24724.6 M | above 3, capped 154, central 3, in 2 |
| batch | 22 | 3 | 0 | 8 (150) | 20.0 / 21.0 / 48 | 42303 / 44095 | 15202.5 M / 16042.8 M | above 27, capped 391, central 2, in 5 |

### 14x14-nightmare: after arm, calls per stage

| Stage | Calls | Ok | No-window | Unfinished (profiles seen) | Profiles per call median / p90 / max | ms per call median / p90 | Work per call median / p90 | Outcomes |
|---|---:|---:|---:|---|---|---|---|---|
| set | 8 | 3 | 0 | 5 (5) | 3.0 / 3.0 / 3 | 3620 / 4419 | 1557.5 M / 1566.2 M | capped 10, central 3, in 1 |
| batch | 29 | 23 | 0 | 6 (5) | 3.0 / 5.0 / 8 | 3980 / 5758 | 1249.2 M / 1890.0 M | above 5, below 6, capped 34, central 23, in 9 |

### 14x14-nightmare: the multipliers

- Dead-end entries (R10 before, R11 after), batch: 18 of 22 calls (81.8 %), 189 tuples, 44.3 % of the ms / 0 of 29 calls (0.0 %), 0 tuples, 0.0 % of the ms; set: 10 of 11 calls (90.9 %), 91 tuples, 56.9 % of the ms / 0 of 8 calls (0.0 %), 0 tuples, 0.0 % of the ms; both: 28 of 33 calls (84.8 %), 280 tuples, 47.8 % of the ms / 0 of 37 calls (0.0 %), 0 tuples, 0.0 % of the ms.
- Start-count capped share (R29, before arm): 122 of 125 p1 tuples at the start count (0.976) over 32 calls.
- Window profiles per ok call (R12), median / mean: before 9.5 / 17.83 (6 ok calls; all tuples of the call); after 0.0 / 0.62 (26 ok calls; phases window, p2, beam, rerate).
- Waves (proxy, R13), median: before - (n 0), after 3.64 (n 2). Set-stage share T1 / T10 (median): - / 0.233.
- Work per accepted puzzle, batch and completion (set stage added), median, M units: before 161829.8 (222783.3), after 1703.7 (2096.7); unfinished calls (unknown tails): 12 / 11 in 2 / 2 requests.
- Locate (R19, after arm): 26 calls; results hit 24, window 2; no-window proofs direct 26 (heuristic ends 0, never proofs); rescues in 0 calls, sides -; locate probes per call median 2.0, p90 4.0, max 5.
- Re-ratings (R18, after arm): per finished call mean 0.00, max 0; 0.0 % of the tuple ms, 0.0 % of the work.

## 12x12-nightmare (IGP-01/before / w760)

MP12b1 report: docs/difficulty-v3/landscape-v3-full/12x12-nightmare-2026-11-13.json; the before arm's response over MP12b1's on the same seeds: median 0.963.

| Seed | MP12b1 acc | MP12b1 T10 | MP12b1 resp | Before acc | Before T1 | Before T10 | Before resp | After acc | After T1 | After T10 | After resp | Identity (before vs MP12b1) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| landscape/12x12-nightmare/0 | 10 | 73.27 | 73.42 | 10 | 4.66 | 73.02 | 73.13 | 10 | 0.61 | 5.22 | 5.35 | puzzle identity (resultDigest equal at equal accepted counts, 10) |
| landscape/12x12-nightmare/1 | 10 | 29.92 | 30.06 | 10 | 0.82 | 27.85 | 27.96 | 10 | 1.54 | 13.08 | 13.20 | puzzle identity (resultDigest equal at equal accepted counts, 10) |

### 12x12-nightmare: before arm, calls per stage

| Stage | Calls | Ok | No-window | Unfinished (profiles seen) | Profiles per call median / p90 / max | ms per call median / p90 | Work per call median / p90 | Outcomes |
|---|---:|---:|---:|---|---|---|---|---|
| set | 8 | 3 | 0 | 5 (1) | 1.0 / 3.0 / 3 | 2101 / 4538 | 687.8 M / 1490.1 M | above 1, capped 2, central 3 |
| batch | 32 | 26 | 0 | 6 (25) | 4.0 / 9.0 / 28 | 8989 / 19964 | 2827.7 M / 5844.5 M | above 26, capped 104, central 26, in 8 |

### 12x12-nightmare: after arm, calls per stage

| Stage | Calls | Ok | No-window | Unfinished (profiles seen) | Profiles per call median / p90 / max | ms per call median / p90 | Work per call median / p90 | Outcomes |
|---|---:|---:|---:|---|---|---|---|---|
| set | 8 | 2 | 0 | 6 (0) | 1.5 / 2.0 / 2 | 960 / 1416 | 248.2 M / 396.4 M | below 1, central 2 |
| batch | 28 | 23 | 0 | 5 (0) | 1.0 / 4.0 / 7 | 1974 / 4534 | 554.4 M / 1615.8 M | above 5, below 3, capped 5, central 23, in 10 |

### 12x12-nightmare: the multipliers

- Dead-end entries (R10 before, R11 after), batch: 6 of 32 calls (18.8 %), 34 tuples, 22.4 % of the ms / 0 of 28 calls (0.0 %), 0 tuples, 0.0 % of the ms; set: 0 of 8 calls (0.0 %), 0 tuples, 0.0 % of the ms / 0 of 8 calls (0.0 %), 0 tuples, 0.0 % of the ms; both: 6 of 40 calls (15.0 %), 34 tuples, 21.8 % of the ms / 0 of 36 calls (0.0 %), 0 tuples, 0.0 % of the ms.
- Start-count capped share (R29, before arm): 66 of 108 p1 tuples at the start count (0.611) over 34 calls.
- Window profiles per ok call (R12), median / mean: before 4.0 / 4.97 (29 ok calls; all tuples of the call); after 0.0 / 0.48 (25 ok calls; phases window, p2, beam, rerate).
- Waves (proxy, R13), median: before 4.76 (n 2), after 3.94 (n 2). Set-stage share T1 / T10 (median): 0.047 / 0.117.
- Work per accepted puzzle, batch and completion (set stage added), median, M units: before 5702.6 (5861.8), after 862.0 (886.8); unfinished calls (unknown tails): 11 / 11 in 2 / 2 requests.
- Locate (R19, after arm): 25 calls; results hit 25; no-window proofs direct 25 (heuristic ends 0, never proofs); rescues in 0 calls, sides -; locate probes per call median 1.0, p90 2.0, max 4.
- Re-ratings (R18, after arm): per finished call mean 0.00, max 0; 0.0 % of the tuple ms, 0.0 % of the work.
## Headline: IGP-01/after (p1p5-main) against w095 (p1p5-w095)

| Cell | Today, MP12b1 20 reps: T10 median / p95 | MP12b1 on these seeds: T10 median, response median | Before: T10 median / p95 | After: T10 median / p95 | Paired T10 ratio (median [min-max]) | Paired response ratio | Ten of n before / after | Opus | Astra |
|---|---|---|---|---|---|---|---|---|---|
| 14x14 Nightmare | 112.98 / 151.64 (ten of 20) | -, 169.57 (ten of 2) | 7.21 / 8.94 (ten of 2) | 4.64 / 5.76 (ten of 2) | 1.55 [1.55-1.56] n 2 | 1.53 [1.53-1.53] n 2 | 2 of 2 / 2 of 2 | 17.7 s | 16.0 s |
| 12x12 Nightmare | 62.14 / 176.07 (ten of 20) | 51.60, 51.74 (ten of 2) | 7.94 / 11.18 (ten of 2) | 6.12 / 9.58 (ten of 2) | 1.47 [1.17-1.76] n 2 | 1.45 [1.16-1.73] n 2 | 2 of 2 / 2 of 2 | about 39-48 s | 44.5 s |

T1, response and p95 of the response (median, s), before / after:

- 14x14 Nightmare: T1 1.50 / 0.97; response 7.35 / 4.80; p95 of the response 9.09 / 5.93; fewer puzzles in the after arm: none
- 12x12 Nightmare: T1 1.14 / 2.08; response 8.09 / 6.26; p95 of the response 11.32 / 9.71; fewer puzzles in the after arm: none
## Headline: IGP-01/after (p1p5-main) against w380 (p1p5-w380)

| Cell | Today, MP12b1 20 reps: T10 median / p95 | MP12b1 on these seeds: T10 median, response median | Before: T10 median / p95 | After: T10 median / p95 | Paired T10 ratio (median [min-max]) | Paired response ratio | Ten of n before / after | Opus | Astra |
|---|---|---|---|---|---|---|---|---|---|
| 14x14 Nightmare | 112.98 / 151.64 (ten of 20) | -, 169.57 (ten of 2) | 7.21 / 8.94 (ten of 2) | 11.22 / 13.36 (ten of 2) | 0.64 [0.60-0.67] n 2 | 0.64 [0.61-0.67] n 2 | 2 of 2 / 2 of 2 | 17.7 s | 16.0 s |
| 12x12 Nightmare | 62.14 / 176.07 (ten of 20) | 51.60, 51.74 (ten of 2) | 7.94 / 11.18 (ten of 2) | 10.15 / 15.19 (ten of 2) | 0.83 [0.74-0.92] n 2 | 0.83 [0.74-0.93] n 2 | 2 of 2 / 2 of 2 | about 39-48 s | 44.5 s |
| 26x26 Master | 8.36 / 16.64 (ten of 20) | 11.87, 12.04 (ten of 5) | 13.43 / 16.91 (ten of 5) | 11.85 / 15.79 (ten of 5) | 1.02 [0.94-1.43] n 5 | 1.02 [0.94-1.42] n 5 | 5 of 5 / 5 of 5 | unchanged (today 8.36 s) | unchanged |

T1, response and p95 of the response (median, s), before / after:

- 14x14 Nightmare: T1 1.50 / 2.44; response 7.35 / 11.37; p95 of the response 9.09 / 13.50; fewer puzzles in the after arm: none
- 12x12 Nightmare: T1 1.14 / 1.10; response 8.09 / 10.29; p95 of the response 11.32 / 15.33; fewer puzzles in the after arm: none
- 26x26 Master: T1 2.61 / 2.69; response 13.60 / 12.00; p95 of the response 17.07 / 15.92; fewer puzzles in the after arm: none
## Headline: IGP-01/after (p1p5-main) against w760 (p1p5-w760)

| Cell | Today, MP12b1 20 reps: T10 median / p95 | MP12b1 on these seeds: T10 median, response median | Before: T10 median / p95 | After: T10 median / p95 | Paired T10 ratio (median [min-max]) | Paired response ratio | Ten of n before / after | Opus | Astra |
|---|---|---|---|---|---|---|---|---|---|
| 14x14 Nightmare | 112.98 / 151.64 (ten of 20) | -, 169.57 (ten of 2) | 7.21 / 8.94 (ten of 2) | 17.73 / 18.86 (ten of 2) | 0.40 [0.33-0.47] n 2 | 0.41 [0.33-0.48] n 2 | 2 of 2 / 2 of 2 | 17.7 s | 16.0 s |
| 12x12 Nightmare | 62.14 / 176.07 (ten of 20) | 51.60, 51.74 (ten of 2) | 7.94 / 11.18 (ten of 2) | 9.15 / 13.08 (ten of 2) | 0.88 [0.85-0.90] n 2 | 0.88 [0.86-0.91] n 2 | 2 of 2 / 2 of 2 | about 39-48 s | 44.5 s |

T1, response and p95 of the response (median, s), before / after:

- 14x14 Nightmare: T1 1.50 / 4.13; response 7.35 / 17.87; p95 of the response 9.09 / 19.00; fewer puzzles in the after arm: none
- 12x12 Nightmare: T1 1.14 / 1.07; response 8.09 / 9.27; p95 of the response 11.32 / 13.20; fewer puzzles in the after arm: none
## Headline: IGP-01/after (p1p5-main) against a3 (p1p5-main-a3)

| Cell | Today, MP12b1 20 reps: T10 median / p95 | MP12b1 on these seeds: T10 median, response median | Before: T10 median / p95 | After: T10 median / p95 | Paired T10 ratio (median [min-max]) | Paired response ratio | Ten of n before / after | Opus | Astra |
|---|---|---|---|---|---|---|---|---|---|
| 14x14 Nightmare | 112.98 / 151.64 (ten of 20) | -, 169.57 (ten of 2) | 7.21 / 8.94 (ten of 2) | 7.25 / 9.10 (ten of 2) | 1.00 [0.98-1.01] n 2 | 0.99 [0.98-1.00] n 2 | 2 of 2 / 2 of 2 | 17.7 s | 16.0 s |
| Hell 1 26x26 | 108.72 / 167.59 (ten of 20) | 167.59, 156.88 (ten of 2) | 39.71 / 42.18 (ten of 2) | 39.48 / 41.51 (ten of 2) | 1.01 [0.99-1.02] n 2 | 1.01 [0.99-1.02] n 2 | 2 of 2 / 2 of 2 | about 28 s (if a window holds) | 50-60 s (if a window holds) |

T1, response and p95 of the response (median, s), before / after:

- 14x14 Nightmare: T1 1.50 / 1.51; response 7.35 / 7.43; p95 of the response 9.09 / 9.27; fewer puzzles in the after arm: none
- Hell 1 26x26: T1 8.55 / 9.12; response 39.89 / 39.64; p95 of the response 42.36 / 41.66; fewer puzzles in the after arm: none

## 14x14-nightmare (IGP-01/after / a3)

MP12b1 report: docs/difficulty-v3/landscape-v3-full/14x14-nightmare-2026-11-13.json; the before arm's response over MP12b1's on the same seeds: median 0.043.

| Seed | MP12b1 acc | MP12b1 T10 | MP12b1 resp | Before acc | Before T1 | Before T10 | Before resp | After acc | After T1 | After T10 | After resp | Identity (before vs MP12b1) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| landscape/14x14-nightmare/0 | 1 | - | 155.84 | 10 | 1.45 | 5.48 | 5.60 | 10 | 1.34 | 5.41 | 5.58 | - |
| landscape/14x14-nightmare/1 | 1 | - | 183.30 | 10 | 1.56 | 8.94 | 9.09 | 10 | 1.68 | 9.10 | 9.27 | - |

### 14x14-nightmare: before arm, calls per stage

| Stage | Calls | Ok | No-window | Unfinished (profiles seen) | Profiles per call median / p90 / max | ms per call median / p90 | Work per call median / p90 | Outcomes |
|---|---:|---:|---:|---|---|---|---|---|
| set | 8 | 2 | 0 | 6 (11) | 3.0 / 3.0 / 3 | 1383 / 1446 | 421.9 M / 426.2 M | below 1, central 2, in 1, scap0 13 |
| batch | 29 | 23 | 0 | 6 (12) | 3.0 / 7.0 / 10 | 1397 / 2212 | 460.6 M / 716.3 M | above 2, ar1 1, below 16, central 23, in 14, scap0 50 |

### 14x14-nightmare: after arm, calls per stage

| Stage | Calls | Ok | No-window | Unfinished (profiles seen) | Profiles per call median / p90 / max | ms per call median / p90 | Work per call median / p90 | Outcomes |
|---|---:|---:|---:|---|---|---|---|---|
| set | 8 | 2 | 0 | 6 (11) | 3.0 / 3.0 / 3 | 1394 / 1565 | 421.9 M / 426.2 M | below 1, central 2, in 1, scap0 13 |
| batch | 29 | 23 | 0 | 6 (11) | 3.0 / 7.0 / 10 | 1411 / 2207 | 460.6 M / 716.3 M | above 2, ar1 1, below 16, central 23, in 14, scap0 49 |

### 14x14-nightmare: the multipliers

- Dead-end entries (R10 before, R11 after), batch: 0 of 29 calls (0.0 %), 0 tuples, 0.0 % of the ms / 0 of 29 calls (0.0 %), 0 tuples, 0.0 % of the ms; set: 0 of 8 calls (0.0 %), 0 tuples, 0.0 % of the ms / 0 of 8 calls (0.0 %), 0 tuples, 0.0 % of the ms; both: 0 of 37 calls (0.0 %), 0 tuples, 0.0 % of the ms / 0 of 37 calls (0.0 %), 0 tuples, 0.0 % of the ms.
- Start-count capped share (R29, before arm): 0 of 0 p1 tuples at the start count (-) over 0 calls.
- Window profiles per ok call (R12), median / mean: before 0.0 / 1.16 (25 ok calls; phases window, p2, beam, rerate); after 0.0 / 1.16 (25 ok calls; phases window, p2, beam, rerate).
- Waves (proxy, R13), median: before 4.45 (n 2), after 4.41 (n 2). Set-stage share T1 / T10 (median): 0.219 / 0.217.
- Work per accepted puzzle, batch and completion (set stage added), median, M units: before 657.4 (788.6), after 647.9 (779.1); unfinished calls (unknown tails): 12 / 12 in 2 / 2 requests.
- Locate (R19, after arm): 25 calls; results hit 22, window 3; no-window proofs direct 25 (heuristic ends 0, never proofs); rescues in 0 calls, sides -; locate probes per call median 3.0, p90 4.0, max 5.
- Re-ratings (R18, after arm): per finished call mean 0.00, max 0; 0.0 % of the tuple ms, 0.0 % of the work.

## 26x26-hell-1 (IGP-01/after / a3)

MP12b1 report: docs/difficulty-v3/landscape-v3-full/26x26-hell-1-2026-11-14.json; the before arm's response over MP12b1's on the same seeds: median 0.257.

| Seed | MP12b1 acc | MP12b1 T10 | MP12b1 resp | Before acc | Before T1 | Before T10 | Before resp | After acc | After T1 | After T10 | After resp | Identity (before vs MP12b1) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| landscape/26x26-hell-1/0 | 5 | - | 146.01 | 10 | 4.27 | 42.18 | 42.36 | 10 | 4.07 | 41.51 | 41.66 | - |
| landscape/26x26-hell-1/1 | 10 | 167.59 | 167.75 | 10 | 12.84 | 37.25 | 37.43 | 10 | 14.16 | 37.45 | 37.62 | - |

### 26x26-hell-1: before arm, calls per stage

| Stage | Calls | Ok | No-window | Unfinished (profiles seen) | Profiles per call median / p90 / max | ms per call median / p90 | Work per call median / p90 | Outcomes |
|---|---:|---:|---:|---|---|---|---|---|
| set | 8 | 4 | 0 | 4 (25) | 4.5 / 17.0 / 17 | 4180 / 12650 | 1372.8 M / 4951.4 M | below 13, central 4, in 11, scap0 26 |
| batch | 36 | 30 | 0 | 6 (18) | 6.0 / 18.0 / 32 | 6054 / 12372 | 2026.4 M / 4205.0 M | above 11, below 110, central 29, in 43, scap0 93, scap1 1 |

### 26x26-hell-1: after arm, calls per stage

| Stage | Calls | Ok | No-window | Unfinished (profiles seen) | Profiles per call median / p90 / max | ms per call median / p90 | Work per call median / p90 | Outcomes |
|---|---:|---:|---:|---|---|---|---|---|
| set | 8 | 4 | 0 | 4 (27) | 5.5 / 19.0 / 19 | 4551 / 14022 | 1506.6 M / 5435.2 M | below 16, central 5, in 13, scap0 26 |
| batch | 36 | 30 | 0 | 6 (18) | 6.0 / 18.0 / 32 | 5842 / 12112 | 2026.4 M / 4205.0 M | above 11, below 111, central 29, in 43, scap0 92, scap1 1 |

### 26x26-hell-1: the multipliers

- Dead-end entries (R10 before, R11 after), batch: 0 of 36 calls (0.0 %), 0 tuples, 0.0 % of the ms / 0 of 36 calls (0.0 %), 0 tuples, 0.0 % of the ms; set: 0 of 8 calls (0.0 %), 0 tuples, 0.0 % of the ms / 0 of 8 calls (0.0 %), 0 tuples, 0.0 % of the ms; both: 0 of 44 calls (0.0 %), 0 tuples, 0.0 % of the ms / 0 of 44 calls (0.0 %), 0 tuples, 0.0 % of the ms.
- Start-count capped share (R29, before arm): 0 of 0 p1 tuples at the start count (-) over 0 calls.
- Window profiles per ok call (R12), median / mean: before 2.0 / 4.68 (34 ok calls; phases window, p2, beam, rerate); after 2.0 / 4.68 (34 ok calls; phases window, p2, beam, rerate).
- Waves (proxy, R13), median: before 5.11 (n 2), after 5.21 (n 2). Set-stage share T1 / T10 (median): 0.223 / 0.238.
- Work per accepted puzzle, batch and completion (set stage added), median, M units: before 3777.9 (4551.5), after 3768.5 (4595.4); unfinished calls (unknown tails): 10 / 10 in 2 / 2 requests.
- Locate (R19, after arm): 34 calls; results hit 24, window 10; no-window proofs direct 34 (heuristic ends 0, never proofs); rescues in 0 calls, sides -; locate probes per call median 4.0, p90 6.0, max 7.
- Re-ratings (R18, after arm): per finished call mean 0.00, max 0; 0.0 % of the tuple ms, 0.0 % of the work.

## Study of the W variants, the no-screen arm and arity 3 (IGP-03)

The per-W, split, shift and offset tables rest on the matched seeds of each cell (two seeds on 14x14 and 12x12 Nightmare and on Hell 1 26x26, five on 26x26 Master): **a two-seed indication** (five-seed on Master), not an estimate of a factor or a rate. PM4 (IGP-02) carries the per-W economics. No `W_screen` is recommended here: the least-work W is descriptive, and the choice waits for the answer to IG-P-Q17 and the frozen round.

Journal checks: w095 passes (72 calls, every start line has W 95 M); w380 passes (179 calls, every start line has W 380 M); w760 passes (73 calls, every start line has W 760 M, 0 screen outcomes (scap0, scap1, over), 0 re-rating tuples); a3 passes (81 calls, 0 calls outside the set stage with arity-3 probes).


### 14x14 Nightmare: seeds 0, 1

#### Per W (R16, R18)

| Arm | Ten of n | T10 median s | Response median s | Work per accepted puzzle, batch and completion, M units (median) | With the set stage, M units | Profiles per accepted puzzle (median) | Unfinished calls |
|---|---|---:|---:|---:|---:|---:|---:|
| today (before) | 0 of 2 | - | 170.75 | 161829.8 | 222783.3 | 293.5 | 12 |
| W 95 M | 2 of 2 | 4.64 | 4.80 | 396.6 | 475.5 | 6.7 | 12 |
| IGP-01 after (W 190 M) | 2 of 2 | 7.21 | 7.35 | 657.4 | 788.6 | 6.2 | 12 |
| W 380 M | 2 of 2 | 11.22 | 11.37 | 1070.3 | 1292.8 | 5.6 | 11 |
| no screen (W 760 M) | 2 of 2 | 17.73 | 17.87 | 1703.7 | 2096.7 | 4.6 | 11 |

Least median work per accepted puzzle with the set stage on these seeds (descriptive, R16): W 95 M, 475.5 M units. It is not a recommendation.

| Arm | Capped probes: screen / canonical (of probes) | Re-ratings per call: mean (max) | Re-ratings, share of the work | Re-rated probes in band (of re-rated): a lower bound of the useful ratings lost | IGP-02 (PM4) at this W: useful lost (of) | PM4 P2 saving | PM4 time per useful rating, canonical → with the screen, s |
|---|---|---|---|---|---|---|---|
| today (before) | 0 / 545 (587) | - | - | - | - | - | - |
| W 95 M | 69 / 0 (134) | 0.00 (0) | 0.0 % | 0 of 0 | 0 of 0 | 7.79 | - → - |
| IGP-01 after (W 190 M) | 63 / 0 (123) | 0.00 (0) | 0.0 % | 0 of 0 | 0 of 0 | 3.99 | - → - |
| W 380 M | 55 / 0 (111) | 0.00 (0) | 0.0 % | 0 of 0 | 0 of 0 | 2.04 | - → - |
| no screen (W 760 M) | 0 / 44 (91) | 0.00 (0) | 0.0 % | 0 of 0 | - | - | - |

#### Population of the accepted puzzles (R32)

| Arm | Puzzles | Clue share p10 / median / p90 | Median clues (median K) | U median | Score position median (0.5 is the centre) | Central share |
|---|---:|---|---|---:|---:|---:|
| today (before) | 2 | 0.167 / 0.170 / 0.174 | 4.0 (23.5) | 19.5 | 0.73 | 100 % |
| W 95 M | 20 | 0.227 / 0.318 / 0.318 | 7.0 (22.0) | 15.0 | 0.48 | 100 % |
| IGP-01 after (W 190 M) | 20 | 0.227 / 0.318 / 0.318 | 7.0 (22.0) | 15.0 | 0.50 | 100 % |
| W 380 M | 20 | 0.227 / 0.273 / 0.318 | 6.0 (22.0) | 16.0 | 0.50 | 100 % |
| no screen (W 760 M) | 20 | 0.227 / 0.273 / 0.318 | 6.0 (22.0) | 16.0 | 0.50 | 100 % |
| arity 3 (W 190 M) | 20 | 0.227 / 0.318 / 0.318 | 7.0 (22.0) | 15.0 | 0.50 | 100 % |
| MP12b1, 20 reps | 126 | 0.143 / 0.190 / 0.190 | 4.0 (21.0) | 17.0 | 0.56 | 99 % |

#### The split (R33): before → no screen → 190 M (a two-seed indication)

| Arm | Ten of n | T10 median s | Response median s | Median clue share |
|---|---|---:|---:|---:|
| today (before) | 0 of 2 | - | 170.75 | 0.170 |
| no screen (W 760 M) | 2 of 2 | 17.73 | 17.87 | 0.273 |
| W 380 M | 2 of 2 | 11.22 | 11.37 | 0.273 |
| IGP-01 after (W 190 M) | 2 of 2 | 7.21 | 7.35 | 0.318 |
| W 95 M | 2 of 2 | 4.64 | 4.80 | 0.318 |

| Step (ratio = from / to; above 1 is faster) | T10 ratio, median [min-max] n | Response ratio, median [min-max] n | Ten of n, from / to | Median clue share, to − from |
|---|---|---|---|---:|
| today (before) → no screen (W 760 M) (the search without the screen: P1, P3, P4) | - | 9.54 [9.35-9.74] n 2 | 0 / 2 of 2 | 0.102 |
| no screen (W 760 M) → IGP-01 after (W 190 M) (the screen) | 2.57 [2.11-3.03] n 2 | 2.54 [2.09-2.99] n 2 | 2 / 2 of 2 | 0.045 |
| today (before) → IGP-01 after (W 190 M) | - | 24.14 [20.34-27.94] n 2 | 0 / 2 of 2 | 0.148 |
| no screen (W 760 M) → W 380 M | 1.62 [1.41-1.83] n 2 | 1.61 [1.41-1.81] n 2 | 2 / 2 of 2 | 0.000 |
| no screen (W 760 M) → W 95 M | 3.99 [3.28-4.71] n 2 | 3.89 [3.21-4.57] n 2 | 2 / 2 of 2 | 0.045 |

#### Which set each request was served on, and the same-set clue shift (a two-seed indication)

| Seed | today (before) | W 95 M | IGP-01 after (W 190 M) | W 380 M | no screen (W 760 M) |
|---|---|---|---|---|---|
| 0 | attempt 1 | attempt 0 (earlier set) | attempt 0 (earlier set) | attempt 0 (earlier set) | attempt 0 (earlier set) |
| 1 | attempt 3 | attempt 0 (earlier set) | attempt 0 (earlier set) | attempt 0 (earlier set) | attempt 0 (earlier set) |

| Arm | Served on an earlier set than the before arm's | On the same set | On a later set | Same-set median clue shift against the before arm, per request (median, n) | Against the no-screen arm, per request (median, n) |
|---|---:|---:|---:|---|---|
| W 95 M | 2 of 2 | 0 | 0 | none (-, n 0) | 0: +0.0, 1: +0.5 (0.3, n 2) |
| IGP-01 after (W 190 M) | 2 of 2 | 0 | 0 | none (-, n 0) | 0: +0.0, 1: +0.0 (0.0, n 2) |
| W 380 M | 2 of 2 | 0 | 0 | none (-, n 0) | 0: +0.0, 1: +0.0 (0.0, n 2) |
| no screen (W 760 M) | 2 of 2 | 0 | 0 | none (-, n 0) | - |

#### Accepted puzzles and probes by clue offset from today's start count (a two-seed indication)

| Offset | today (before): accepted | W 95 M: accepted | IGP-01 after (W 190 M): accepted | W 380 M: accepted | no screen (W 760 M): accepted | today (before): probes (capped, in band, median ms) | W 95 M: probes (capped, in band, median ms) | IGP-01 after (W 190 M): probes (capped, in band, median ms) | W 380 M: probes (capped, in band, median ms) | no screen (W 760 M): probes (capped, in band, median ms) | PM4 canonical (IGP-02): profiles (capped, useful, median ms) |
|---|---:|---:|---:|---:|---:|---|---|---|---|---|---|
| <0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | 0 | 0 | 0 | 0 | 0 | 452 (96 %, 0 %, 2126) | 0 | 0 | 0 | 0 | 78 (100 %, 0, 2178) |
| 1 | 2 | 0 | 0 | 0 | 0 | 104 (86 %, 5 %, 2109) | 33 (100 %, 0 %, 318) | 39 (92 %, 8 %, 570) | 37 (92 %, 8 %, 1079) | 38 (87 %, 11 %, 2085) | 12 (100 %, 0, 2216) |
| 2 | 0 | 6 | 7 | 8 | 9 | 31 (65 %, 16 %, 2162) | 47 (62 %, 30 %, 299) | 35 (57 %, 37 %, 542) | 37 (49 %, 46 %, 926) | 33 (30 %, 58 %, 1080) | 12 (83 %, 0, 2357) |
| 3 | 0 | 3 | 2 | 3 | 2 | 0 | 15 (33 %, 40 %, 191) | 11 (45 %, 36 %, 263) | 10 (30 %, 50 %, 240) | 4 (25 %, 50 %, 230) | 12 (42 %, 4, 2001) |
| 4 | 0 | 9 | 9 | 8 | 8 | 0 | 34 (6 %, 59 %, 94) | 33 (6 %, 52 %, 110) | 25 (0 %, 52 %, 102) | 14 (0 %, 71 %, 137) | 12 (25 %, 4, 720) |
| >4 | 0 | 2 | 2 | 1 | 1 | 0 | 5 (0 %, 60 %, 25) | 5 (0 %, 60 %, 26) | 2 (0 %, 50 %, 18) | 2 (0 %, 50 %, 18) | 0 |

Offset = clue count − today's start count of the request's set (the `startCount` of the journal start lines). Probes are every rating attempt of the cohort's calls except re-ratings; capped = screen-capped (scap0, scap1, over) or canonically capped; in band = a rating inside the score band, not refused by AR1.

### 12x12 Nightmare: seeds 0, 1

#### Per W (R16, R18)

| Arm | Ten of n | T10 median s | Response median s | Work per accepted puzzle, batch and completion, M units (median) | With the set stage, M units | Profiles per accepted puzzle (median) | Unfinished calls |
|---|---|---:|---:|---:|---:|---:|---:|
| today (before) | 2 of 2 | 50.44 | 50.55 | 5702.6 | 5861.8 | 8.5 | 11 |
| W 95 M | 2 of 2 | 6.12 | 6.26 | 396.5 | 501.4 | 7.7 | 9 |
| IGP-01 after (W 190 M) | 2 of 2 | 7.94 | 8.09 | 661.9 | 744.2 | 6.3 | 10 |
| W 380 M | 2 of 2 | 10.15 | 10.29 | 944.4 | 1011.3 | 5.3 | 11 |
| no screen (W 760 M) | 2 of 2 | 9.15 | 9.27 | 862.0 | 886.8 | 2.5 | 11 |

Least median work per accepted puzzle with the set stage on these seeds (descriptive, R16): W 95 M, 501.4 M units. It is not a recommendation.

| Arm | Capped probes: screen / canonical (of probes) | Re-ratings per call: mean (max) | Re-ratings, share of the work | Re-rated probes in band (of re-rated): a lower bound of the useful ratings lost | IGP-02 (PM4) at this W: useful lost (of) | PM4 P2 saving | PM4 time per useful rating, canonical → with the screen, s |
|---|---|---|---|---|---|---|---|
| today (before) | 0 / 106 (170) | - | - | - | - | - | - |
| W 95 M | 60 / 0 (153) | 0.00 (0) | 0.0 % | 0 of 0 | 9 of 9 | 2.73 | 11.18 → 4.10 |
| IGP-01 after (W 190 M) | 40 / 0 (126) | 0.00 (0) | 0.0 % | 0 of 0 | 7 of 9 | 1.97 | 11.18 → 5.69 |
| W 380 M | 30 / 0 (106) | 0.00 (0) | 0.0 % | 0 of 0 | 7 of 9 | 1.33 | 11.18 → 8.41 |
| no screen (W 760 M) | 0 / 5 (49) | 0.00 (0) | 0.0 % | 0 of 0 | - | - | - |

#### Population of the accepted puzzles (R32)

| Arm | Puzzles | Clue share p10 / median / p90 | Median clues (median K) | U median | Score position median (0.5 is the centre) | Central share |
|---|---:|---|---|---:|---:|---:|
| today (before) | 20 | 0.150 / 0.158 / 0.211 | 3.0 (19.5) | 16.0 | 0.60 | 100 % |
| W 95 M | 20 | 0.200 / 0.263 / 0.316 | 5.0 (19.5) | 14.0 | 0.35 | 100 % |
| IGP-01 after (W 190 M) | 20 | 0.200 / 0.263 / 0.316 | 5.0 (19.5) | 14.0 | 0.38 | 100 % |
| W 380 M | 20 | 0.200 / 0.257 / 0.316 | 5.0 (19.5) | 14.5 | 0.52 | 100 % |
| no screen (W 760 M) | 20 | 0.200 / 0.211 / 0.263 | 4.0 (19.5) | 15.0 | 0.46 | 100 % |
| MP12b1, 20 reps | 185 | 0.158 / 0.211 / 0.250 | 4.0 (19.0) | 16.0 | 0.63 | 98 % |

#### The split (R33): before → no screen → 190 M (a two-seed indication)

| Arm | Ten of n | T10 median s | Response median s | Median clue share |
|---|---|---:|---:|---:|
| today (before) | 2 of 2 | 50.44 | 50.55 | 0.158 |
| no screen (W 760 M) | 2 of 2 | 9.15 | 9.27 | 0.211 |
| W 380 M | 2 of 2 | 10.15 | 10.29 | 0.257 |
| IGP-01 after (W 190 M) | 2 of 2 | 7.94 | 8.09 | 0.263 |
| W 95 M | 2 of 2 | 6.12 | 6.26 | 0.263 |

| Step (ratio = from / to; above 1 is faster) | T10 ratio, median [min-max] n | Response ratio, median [min-max] n | Ten of n, from / to | Median clue share, to − from |
|---|---|---|---|---:|
| today (before) → no screen (W 760 M) (the search without the screen: P1, P3, P4) | 8.06 [2.13-13.99] n 2 | 7.90 [2.12-13.67] n 2 | 2 / 2 of 2 | 0.053 |
| no screen (W 760 M) → IGP-01 after (W 190 M) (the screen) | 1.14 [1.11-1.17] n 2 | 1.13 [1.10-1.17] n 2 | 2 / 2 of 2 | 0.053 |
| today (before) → IGP-01 after (W 190 M) | 8.99 [2.49-15.50] n 2 | 8.77 [2.47-15.07] n 2 | 2 / 2 of 2 | 0.105 |
| no screen (W 760 M) → W 380 M | 0.94 [0.86-1.02] n 2 | 0.94 [0.86-1.02] n 2 | 2 / 2 of 2 | 0.046 |
| no screen (W 760 M) → W 95 M | 1.66 [1.37-1.95] n 2 | 1.63 [1.36-1.90] n 2 | 2 / 2 of 2 | 0.053 |

#### Which set each request was served on, and the same-set clue shift (a two-seed indication)

| Seed | today (before) | W 95 M | IGP-01 after (W 190 M) | W 380 M | no screen (W 760 M) |
|---|---|---|---|---|---|
| 0 | attempt 0 | attempt 0 (same set) | attempt 0 (same set) | attempt 0 (same set) | attempt 0 (same set) |
| 1 | attempt 0 | attempt 0 (same set) | attempt 0 (same set) | attempt 0 (same set) | attempt 0 (same set) |

| Arm | Served on an earlier set than the before arm's | On the same set | On a later set | Same-set median clue shift against the before arm, per request (median, n) | Against the no-screen arm, per request (median, n) |
|---|---:|---:|---:|---|---|
| W 95 M | 0 of 2 | 2 | 0 | 0: +1.0, 1: +2.0 (1.5, n 2) | 0: +1.0, 1: +1.0 (1.0, n 2) |
| IGP-01 after (W 190 M) | 0 of 2 | 2 | 0 | 0: +1.0, 1: +2.0 (1.5, n 2) | 0: +1.0, 1: +1.0 (1.0, n 2) |
| W 380 M | 0 of 2 | 2 | 0 | 0: +0.0, 1: +2.0 (1.0, n 2) | 0: +0.0, 1: +1.0 (0.5, n 2) |
| no screen (W 760 M) | 0 of 2 | 2 | 0 | 0: +0.0, 1: +1.0 (0.5, n 2) | - |

#### Accepted puzzles and probes by clue offset from today's start count (a two-seed indication)

| Offset | today (before): accepted | W 95 M: accepted | IGP-01 after (W 190 M): accepted | W 380 M: accepted | no screen (W 760 M): accepted | today (before): probes (capped, in band, median ms) | W 95 M: probes (capped, in band, median ms) | IGP-01 after (W 190 M): probes (capped, in band, median ms) | W 380 M: probes (capped, in band, median ms) | no screen (W 760 M): probes (capped, in band, median ms) | PM4 canonical (IGP-02): profiles (capped, useful, median ms) |
|---|---:|---:|---:|---:|---:|---|---|---|---|---|---|
| <0 | 0 | 0 | 0 | 0 | 0 | 2 (100 %, 0 %, 2373) | 0 | 0 | 0 | 0 | 2 (100 %, 0, 2121) |
| 0 | 12 | 0 | 1 | 1 | 1 | 144 (68 %, 17 %, 2329) | 1 (100 %, 0 %, 532) | 2 (50 %, 50 %, 765) | 2 (50 %, 50 %, 1060) | 1 (0 %, 100 %, 756) | 29 (76 %, 2, 2264) |
| 1 | 6 | 2 | 5 | 7 | 14 | 22 (27 %, 50 %, 2361) | 39 (85 %, 13 %, 323) | 43 (60 %, 28 %, 636) | 39 (56 %, 28 %, 1108) | 30 (13 %, 70 %, 1153) | 23 (13 %, 7, 2474) |
| 2 | 2 | 10 | 7 | 7 | 3 | 2 (0 %, 100 %, 1244) | 44 (48 %, 41 %, 286) | 36 (36 %, 56 %, 536) | 36 (19 %, 56 %, 597) | 14 (7 %, 79 %, 1059) | 16 (13 %, 6, 955) |
| 3 | 0 | 7 | 6 | 5 | 2 | 0 | 41 (12 %, 37 %, 86) | 25 (0 %, 52 %, 105) | 15 (0 %, 67 %, 99) | 2 (0 %, 100 %, 253) | 16 (0 %, 7, 573) |
| 4 | 0 | 1 | 1 | 0 | 0 | 0 | 27 (0 %, 15 %, 22) | 20 (0 %, 20 %, 23) | 14 (0 %, 14 %, 30) | 2 (0 %, 0 %, 34) | 12 (0 %, 8, 148) |
| >4 | 0 | 0 | 0 | 0 | 0 | 0 | 1 (0 %, 100 %, 84) | 0 | 0 | 0 | 0 |

Offset = clue count − today's start count of the request's set (the `startCount` of the journal start lines). Probes are every rating attempt of the cohort's calls except re-ratings; capped = screen-capped (scap0, scap1, over) or canonically capped; in band = a rating inside the score band, not refused by AR1.

### 26x26 Master: seeds 0, 1, 2, 3, 4

#### Per W (R16, R18)

| Arm | Ten of n | T10 median s | Response median s | Work per accepted puzzle, batch and completion, M units (median) | With the set stage, M units | Profiles per accepted puzzle (median) | Unfinished calls |
|---|---|---:|---:|---:|---:|---:|---:|
| today (before) | 5 of 5 | 12.26 | 12.43 | 974.2 | 1210.1 | 13.9 | 23 |
| IGP-01 after (W 190 M) | 5 of 5 | 13.43 | 13.60 | 763.2 | 1120.7 | 10.3 | 22 |
| W 380 M | 5 of 5 | 11.85 | 12.00 | 1032.4 | 1132.1 | 11.2 | 23 |

Least median work per accepted puzzle with the set stage on these seeds (descriptive, R16): IGP-01 after (W 190 M), 1120.7 M units. It is not a recommendation.

| Arm | Capped probes: screen / canonical (of probes) | Re-ratings per call: mean (max) | Re-ratings, share of the work | Re-rated probes in band (of re-rated): a lower bound of the useful ratings lost | IGP-02 (PM4) at this W: useful lost (of) | PM4 P2 saving | PM4 time per useful rating, canonical → with the screen, s |
|---|---|---|---|---|---|---|---|
| today (before) | 0 / 0 (729) | - | - | - | - | - | - |
| IGP-01 after (W 190 M) | 39 / 0 (550) | 0.00 (0) | 0.0 % | 0 of 0 | 0 of 20 | 0.97 | 0.56 → 0.58 |
| W 380 M | 4 / 0 (519) | 0.00 (0) | 0.0 % | 0 of 0 | 0 of 20 | 0.97 | 0.56 → 0.58 |

#### Population of the accepted puzzles (R32)

| Arm | Puzzles | Clue share p10 / median / p90 | Median clues (median K) | U median | Score position median (0.5 is the centre) | Central share |
|---|---:|---|---|---:|---:|---:|
| today (before) | 50 | 0.120 / 0.185 / 0.240 | 5.0 (25.0) | 21.0 | 0.50 | 100 % |
| IGP-01 after (W 190 M) | 50 | 0.083 / 0.160 / 0.200 | 4.0 (25.0) | 22.0 | 0.50 | 100 % |
| W 380 M | 50 | 0.083 / 0.160 / 0.200 | 4.0 (25.0) | 22.0 | 0.50 | 100 % |
| MP12b1, 20 reps | 200 | 0.125 / 0.189 / 0.231 | 5.0 (25.5) | 21.0 | 0.47 | 100 % |

#### Which set each request was served on, and the same-set clue shift (a five-seed indication)

| Seed | today (before) | IGP-01 after (W 190 M) | W 380 M |
|---|---|---|---|
| 0 | attempt 0 | attempt 0 (same set) | attempt 0 (same set) |
| 1 | attempt 0 | attempt 0 (same set) | attempt 0 (same set) |
| 2 | attempt 0 | attempt 0 (same set) | attempt 0 (same set) |
| 3 | attempt 0 | attempt 0 (same set) | attempt 0 (same set) |
| 4 | attempt 0 | attempt 0 (same set) | attempt 0 (same set) |

| Arm | Served on an earlier set than the before arm's | On the same set | On a later set | Same-set median clue shift against the before arm, per request (median, n) | Against the no-screen arm, per request (median, n) |
|---|---:|---:|---:|---|---|
| IGP-01 after (W 190 M) | 0 of 5 | 5 | 0 | 0: -1.0, 1: -1.0, 2: +0.0, 3: -1.0, 4: +0.0 (-1.0, n 5) | - |
| W 380 M | 0 of 5 | 5 | 0 | 0: -1.0, 1: -1.0, 2: -0.5, 3: -1.0, 4: +0.0 (-1.0, n 5) | - |

#### Accepted puzzles and probes by clue offset from today's start count (a five-seed indication)

| Offset | today (before): accepted | IGP-01 after (W 190 M): accepted | W 380 M: accepted | today (before): probes (capped, in band, median ms) | IGP-01 after (W 190 M): probes (capped, in band, median ms) | W 380 M: probes (capped, in band, median ms) | PM4 canonical (IGP-02): profiles (capped, useful, median ms) |
|---|---:|---:|---:|---|---|---|---|
| <0 | 37 | 45 | 46 | 332 (0 %, 46 %, 284) | 444 (8 %, 40 %, 353) | 428 (1 %, 44 %, 338) | 29 (0 %, 14, 276) |
| 0 | 13 | 3 | 2 | 382 (0 %, 22 %, 151) | 73 (4 %, 33 %, 184) | 76 (0 %, 33 %, 193) | 21 (0 %, 6, 101) |
| 1 | 0 | 2 | 2 | 15 (0 %, 40 %, 151) | 17 (0 %, 29 %, 145) | 12 (0 %, 42 %, 117) | 14 (0 %, 2, 81) |
| 2 | 0 | 0 | 0 | 0 | 9 (11 %, 11 %, 69) | 3 (0 %, 0 %, 67) | 12 (0 %, 0, 31) |
| 3 | 0 | 0 | 0 | 0 | 5 (0 %, 0 %, 50) | 0 | 12 (0 %, 0, 18) |
| 4 | 0 | 0 | 0 | 0 | 1 (0 %, 0 %, 18) | 0 | 12 (0 %, 0, 12) |
| >4 | 0 | 0 | 0 | 0 | 1 (0 %, 0 %, 13) | 0 | 0 |

Offset = clue count − today's start count of the request's set (the `startCount` of the journal start lines). Probes are every rating attempt of the cohort's calls except re-ratings; capped = screen-capped (scap0, scap1, over) or canonically capped; in band = a rating inside the score band, not refused by AR1.

### Hell 1 26x26: seeds 0, 1

#### Per W (R16, R18)

| Arm | Ten of n | T10 median s | Response median s | Work per accepted puzzle, batch and completion, M units (median) | With the set stage, M units | Profiles per accepted puzzle (median) | Unfinished calls |
|---|---|---:|---:|---:|---:|---:|---:|
| today (before) | 1 of 2 | 179.29 | 163.24 | 18268.7 | 26842.7 | 39.8 | 10 |
| IGP-01 after (W 380 M) | 2 of 2 | 39.71 | 39.89 | 3777.9 | 4551.5 | 17.1 | 10 |

Least median work per accepted puzzle with the set stage on these seeds (descriptive, R16): IGP-01 after (W 380 M), 4551.5 M units. It is not a recommendation.

| Arm | Capped probes: screen / canonical (of probes) | Re-ratings per call: mean (max) | Re-ratings, share of the work | Re-rated probes in band (of re-rated): a lower bound of the useful ratings lost | IGP-02 (PM4) at this W: useful lost (of) | PM4 P2 saving | PM4 time per useful rating, canonical → with the screen, s |
|---|---|---|---|---|---|---|---|
| today (before) | 0 / 416 (564) | - | - | - | - | - | - |
| IGP-01 after (W 380 M) | 120 / 0 (341) | 0.00 (0) | 0.0 % | 0 of 0 | 1 of 2 | 1.77 | 72.12 → 40.67 |

#### Population of the accepted puzzles (R32)

| Arm | Puzzles | Clue share p10 / median / p90 | Median clues (median K) | U median | Score position median (0.5 is the centre) | Central share |
|---|---:|---|---|---:|---:|---:|
| today (before) | 15 | 0.103 / 0.128 / 0.154 | 5.0 (39.0) | 34.0 | 0.54 | 93 % |
| IGP-01 after (W 380 M) | 20 | 0.143 / 0.195 / 0.244 | 8.0 (41.5) | 33.0 | 0.43 | 95 % |
| arity 3 (W 380 M) | 20 | 0.143 / 0.195 / 0.244 | 8.0 (41.5) | 33.0 | 0.43 | 95 % |
| MP12b1, 20 reps | 134 | 0.100 / 0.128 / 0.154 | 5.0 (39.0) | 34.0 | 0.57 | 96 % |

#### Which set each request was served on, and the same-set clue shift (a two-seed indication)

| Seed | today (before) | IGP-01 after (W 380 M) |
|---|---|---|
| 0 | attempt 0 | attempt 0 (same set) |
| 1 | attempt 7 | attempt 0 (earlier set) |

| Arm | Served on an earlier set than the before arm's | On the same set | On a later set | Same-set median clue shift against the before arm, per request (median, n) | Against the no-screen arm, per request (median, n) |
|---|---:|---:|---:|---|---|
| IGP-01 after (W 380 M) | 1 of 2 | 1 | 0 | 0: +2.5 (2.5, n 1) | - |

#### Accepted puzzles and probes by clue offset from today's start count (a two-seed indication)

| Offset | today (before): accepted | IGP-01 after (W 380 M): accepted | today (before): probes (capped, in band, median ms) | IGP-01 after (W 380 M): probes (capped, in band, median ms) | PM4 canonical (IGP-02): profiles (capped, useful, median ms) |
|---|---:|---:|---|---|---|
| <0 | 0 | 0 | 13 (92 %, 0 %, 2278) | 0 | 1 (100 %, 0, 2245) |
| 0 | 2 | 0 | 402 (87 %, 4 %, 2205) | 0 | 65 (98 %, 1, 2108) |
| 1 | 6 | 0 | 115 (40 %, 35 %, 2048) | 50 (86 %, 6 %, 1186) | 14 (86 %, 1, 2182) |
| 2 | 6 | 4 | 32 (28 %, 53 %, 1480) | 46 (72 %, 22 %, 1152) | 12 (58 %, 5, 2131) |
| 3 | 1 | 1 | 2 (0 %, 100 %, 1838) | 6 (33 %, 50 %, 970) | 12 (58 %, 4, 1904) |
| 4 | 0 | 6 | 0 | 47 (43 %, 38 %, 871) | 12 (33 %, 5, 1752) |
| >4 | 0 | 9 | 0 | 192 (11 %, 28 %, 607) | 0 |

Offset = clue count − today's start count of the request's set (the `startCount` of the journal start lines). Probes are every rating attempt of the cohort's calls except re-ratings; capped = screen-capped (scap0, scap1, over) or canonically capped; in band = a rating inside the score band, not refused by AR1.

### 26x26 Master at 380 M against IGP-01 (R07)

| Arm | Ten of n | T10 median s | Response median s | Screen-capped probes (of probes) |
|---|---|---:|---:|---|
| today (before) | 5 of 5 | 12.26 | 12.43 | 0 (729; 0.0 %) |
| IGP-01 after (W 190 M) | 5 of 5 | 13.43 | 13.60 | 39 (550; 7.1 %) |
| W 380 M | 5 of 5 | 11.85 | 12.00 | 4 (519; 0.8 %) |

| Seed | T10 before s | T10 190 M s | T10 380 M s | before / 190 M | before / 380 M | 190 M / 380 M |
|---|---:|---:|---:|---:|---:|---:|
| 0 | 12.31 | 5.77 | 5.50 | 2.13 | 2.24 | 1.05 |
| 1 | 10.04 | 13.43 | 13.11 | 0.75 | 0.77 | 1.02 |
| 2 | 6.46 | 16.91 | 11.85 | 0.38 | 0.54 | 1.43 |
| 3 | 12.26 | 9.64 | 10.26 | 1.27 | 1.19 | 0.94 |
| 4 | 12.49 | 15.14 | 15.79 | 0.83 | 0.79 | 0.96 |

Paired T10 ratios (above 1 is faster): before / 190 M: median 0.83, geometric mean 0.91, range 0.38-2.13, n 5; before / 380 M: median 0.79, geometric mean 0.98, range 0.54-2.24, n 5; 190 M / 380 M: median 1.02, geometric mean 1.07, range 0.94-1.43, n 5. IGP-01 found this cell mixed (0.38-2.13 per seed) with 39 screen-capped probes at 190 M. The accepted puzzles by offset follow.

| Offset | today (before): accepted | IGP-01 after (W 190 M): accepted | W 380 M: accepted |
|---|---:|---:|---:|
| <0 | 37 | 45 | 46 |
| 0 | 13 | 3 | 2 |
| 1 | 0 | 2 | 2 |
| 2 | 0 | 0 | 0 |
| 3 | 0 | 0 | 0 |
| 4 | 0 | 0 | 0 |
| >4 | 0 | 0 | 0 |

### Arity-3 set stage on 14x14 Nightmare (R20; a Projection, nothing is adopted)

| Set-stage figure | IGP-01 after (sequential bisection) | Arity 3 |
|---|---:|---:|
| Calls (finished, unfinished) | 8 (2, 6) | 8 (2, 6) |
| Probes per finished call: median / mean / max | 3.0 / 3.00 / 3 | 3.0 / 3.00 / 3 |
| Probes in all finished calls (every probe counted, wasted ones included) | 6 | 6 |
| Arity-3 probes, of them wasted (rated after the probe that ended the call) | - | 0, 0 |
| Rounds; serial ms median; critical ms median | - | 0; -; - |
| Probes of unfinished calls (seen) | 11 | 11 |
| T1 measured, median s | 1.50 | 1.51 |
| T1 with the idealised call-level bound, median s (Projection) | - | 1.51 |

| Seed | T1 arity 3, s | Winning call ms | Rounds | Saving (Σ serial − critical), ms | Idealised T1 bound, s | Other set attempts in flight while the winning call ran |
|---|---:|---:|---:|---:|---:|---:|
| 0 | 1.34 | 1223 | 0 | 0 | 1.34 | 3 |
| 1 | 1.68 | 1565 | 0 | 0 | 1.68 | 3 |

Assumption of the bound: for the call that produced the request's set (the lowest successful attempt), T1 minus the sum over its rounds of (serial − critical ms), as if three lanes were idle for each round; the real set stage already runs attempts in parallel on the pool and consumes them in order, so the figure is a lower bound on T1, not a measured gain. The arms are paired by seed but their puzzles differ (the arity-3 probe order changes the random stream).

### Arity-3 set stage on Hell 1 26x26 (R20; a Projection, nothing is adopted)

| Set-stage figure | IGP-01 after (sequential bisection) | Arity 3 |
|---|---:|---:|
| Calls (finished, unfinished) | 8 (4, 4) | 8 (4, 4) |
| Probes per finished call: median / mean / max | 4.5 / 7.25 / 17 | 5.5 / 8.25 / 19 |
| Probes in all finished calls (every probe counted, wasted ones included) | 29 | 33 |
| Arity-3 probes, of them wasted (rated after the probe that ended the call) | - | 10, 2 |
| Rounds; serial ms median; critical ms median | - | 3; 1427; 712 |
| Probes of unfinished calls (seen) | 25 | 27 |
| T1 measured, median s | 8.55 | 9.12 |
| T1 with the idealised call-level bound, median s (Projection) | - | 8.48 |

| Seed | T1 arity 3, s | Winning call ms | Rounds | Saving (Σ serial − critical), ms | Idealised T1 bound, s | Other set attempts in flight while the winning call ran |
|---|---:|---:|---:|---:|---:|---:|
| 0 | 4.07 | 3926 | 1 | 0 | 4.07 | 3 |
| 1 | 14.16 | 14022 | 1 | 1263 | 12.90 | 3 |

Assumption of the bound: for the call that produced the request's set (the lowest successful attempt), T1 minus the sum over its rounds of (serial − critical ms), as if three lanes were idle for each round; the real set stage already runs attempts in parallel on the pool and consumes them in order, so the figure is a lower bound on T1, not a measured gain. The arms are paired by seed but their puzzles differ (the arity-3 probe order changes the random stream).

## Values of the §5 rows

| Row | Kind | Formula | Value |
|---|---|---|---|
| R16 | Measured; Derived | median work per accepted puzzle (batch and completion; with the set stage) per W and cell; the W with the least median is descriptive | `{"14x14-nightmare":{"least":"w095","perW":[{"role":"before","W":null,"t10":{"n":0,"min":null,"median":null,"p95":null,"max":null},"reached":"0 of 2","workWithSet":222783349621.5,"workWithoutSet":161829828181},{"role":"w095","W":95000000,"t10":{"n":2,"min":3523.3419000000004,"median":4640.29165,"p95":5757.2414,"max":5757.2414},"reached":"2 of 2","workWithSet":475470891.3,"workWithoutSet":396577660.95},{"role":"main","W":190000000,"t10":{"n":2,"min":5480.7047,"median":7211.4098,"p95":8942.1149,"max":8942.1149},"reached":"2 of 2","workWithSet":788573094.15,"workWithoutSet":657436482.95},{"role":"w380","W":380000000,"t10":{"n":2,"min":9079.8426,"median":11217.69735,"p95":13355.5521,"max":13355.5521},"reached":"2 of 2","workWithSet":1292756363.85,"workWithoutSet":1070257266.65},{"role":"w760","W":760000000,"t10":{"n":2,"min":16605.0713,"median":17730.7486,"p95":18856.4259,"max":18856.4259},"reached":"2 of 2","workWithSet":2096675787.3500001,"workWithoutSet":1703715711.8}]},"12x12-nightmare":{"least":"w095","perW":[{"role":"before","W":null,"t10":{"n":2,"min":27854.684500000003,"median":50435.31825,"p95":73015.95199999999,"max":73015.95199999999},"reached":"2 of 2","workWithSet":5861784909.1,"workWithoutSet":5702645080.65},{"role":"w095","W":95000000,"t10":{"n":2,"min":2672.3984,"median":6124.70335,"p95":9577.0083,"max":9577.0083},"reached":"2 of 2","workWithSet":501390195.65,"workWithoutSet":396462945.85},{"role":"main","W":190000000,"t10":{"n":2,"min":4711.4834,"median":7944.4848,"p95":11177.4862,"max":11177.4862},"reached":"2 of 2","workWithSet":744237361.65,"workWithoutSet":661888156.8},{"role":"w380","W":380000000,"t10":{"n":2,"min":5116.3632,"median":10152.7981,"p95":15189.233,"max":15189.233},"reached":"2 of 2","workWithSet":1011257927.6,"workWithoutSet":944431121},{"role":"w760","W":760000000,"t10":{"n":2,"min":5217.601900000001,"median":9149.85415,"p95":13082.106399999999,"max":13082.106399999999},"reached":"2 of 2","workWithSet":886773982.3000001,"workWithoutSet":861953336.8000001}]},"26x26-master":{"least":"main","perW":[{"role":"before","W":null,"t10":{"n":5,"min":6456.677299999999,"median":12263.5049,"p95":12491.9087,"max":12491.9087},"reached":"5 of 5","workWithSet":1210124315.4,"workWithoutSet":974187024.8},{"role":"main","W":190000000,"t10":{"n":5,"min":5773.3247,"median":13429.243499999999,"p95":16914.630999999998,"max":16914.630999999998},"reached":"5 of 5","workWithSet":1120695066,"workWithoutSet":763219522.5},{"role":"w380","W":380000000,"t10":{"n":5,"min":5504.266500000001,"median":11850.7941,"p95":15786.9989,"max":15786.9989},"reached":"5 of 5","workWithSet":1132146085.2,"workWithoutSet":1032368079.2}]},"26x26-hell-1":{"least":"main","perW":[{"role":"before","W":null,"t10":{"n":1,"min":179294.37329999998,"median":179294.37329999998,"p95":179294.37329999998,"max":179294.37329999998},"reached":"1 of 2","workWithSet":26842650840.300003,"workWithoutSet":18268706610.65},{"role":"main","W":380000000,"t10":{"n":2,"min":37245.4423,"median":39710.577900000004,"p95":42175.7135,"max":42175.7135},"reached":"2 of 2","workWithSet":4551535463.35,"workWithoutSet":3777880770.65}]}}` |
| R18 | Derived | re-ratings per call and their share of the work; re-rated probes in band per W and cell | `{"14x14-nightmare":[{"role":"before","rerates":null,"reRated":{"n":0,"inBand":0}},{"role":"w095","rerates":{"callsFinished":25,"perCallMean":0,"perCallMax":0,"msShare":0,"workShare":0},"reRated":{"n":0,"inBand":0}},{"role":"main","rerates":{"callsFinished":25,"perCallMean":0,"perCallMax":0,"msShare":0,"workShare":0},"reRated":{"n":0,"inBand":0}},{"role":"w380","rerates":{"callsFinished":26,"perCallMean":0,"perCallMax":0,"msShare":0,"workShare":0},"reRated":{"n":0,"inBand":0}},{"role":"w760","rerates":{"callsFinished":26,"perCallMean":0,"perCallMax":0,"msShare":0,"workShare":0},"reRated":{"n":0,"inBand":0}}],"12x12-nightmare":[{"role":"before","rerates":null,"reRated":{"n":0,"inBand":0}},{"role":"w095","rerates":{"callsFinished":26,"perCallMean":0,"perCallMax":0,"msShare":0,"workShare":0},"reRated":{"n":0,"inBand":0}},{"role":"main","rerates":{"callsFinished":29,"perCallMean":0,"perCallMax":0,"msShare":0,"workShare":0},"reRated":{"n":0,"inBand":0}},{"role":"w380","rerates":{"callsFinished":24,"perCallMean":0,"perCallMax":0,"msShare":0,"workShare":0},"reRated":{"n":0,"inBand":0}},{"role":"w760","rerates":{"callsFinished":25,"perCallMean":0,"perCallMax":0,"msShare":0,"workShare":0},"reRated":{"n":0,"inBand":0}}],"26x26-master":[{"role":"before","rerates":null,"reRated":{"n":0,"inBand":0}},{"role":"main","rerates":{"callsFinished":77,"perCallMean":0,"perCallMax":0,"msShare":0,"workShare":0},"reRated":{"n":0,"inBand":0}},{"role":"w380","rerates":{"callsFinished":84,"perCallMean":0,"perCallMax":0,"msShare":0,"workShare":0},"reRated":{"n":0,"inBand":0}}],"26x26-hell-1":[{"role":"before","rerates":null,"reRated":{"n":0,"inBand":0}},{"role":"main","rerates":{"callsFinished":34,"perCallMean":0,"perCallMax":0,"msShare":0,"workShare":0},"reRated":{"n":0,"inBand":0}}]}` |
| R32 | Measured; Derived | population of the accepted puzzles per W and cell (clue share p10 / median / p90, position, central share) | `{"14x14-nightmare":{"before":{"puzzles":2,"share":{"n":2,"min":0.16666666666666666,"p10":0.16666666666666666,"p25":0.16666666666666666,"median":0.17028985507246375,"p75":0.17391304347826086,"p90":0.17391304347826086,"max":0.17391304347826086},"position":0.7291666666666667,"central":1},"w095":{"puzzles":20,"share":{"n":20,"min":0.22727272727272727,"p10":0.22727272727272727,"p25":0.22727272727272727,"median":0.3181818181818182,"p75":0.3181818181818182,"p90":0.3181818181818182,"max":0.4090909090909091},"position":0.47916666666666663,"central":1},"main":{"puzzles":20,"share":{"n":20,"min":0.22727272727272727,"p10":0.22727272727272727,"p25":0.22727272727272727,"median":0.3181818181818182,"p75":0.3181818181818182,"p90":0.3181818181818182,"max":0.4090909090909091},"position":0.5,"central":1},"w380":{"puzzles":20,"share":{"n":20,"min":0.22727272727272727,"p10":0.22727272727272727,"p25":0.22727272727272727,"median":0.2727272727272727,"p75":0.3181818181818182,"p90":0.3181818181818182,"max":0.4090909090909091},"position":0.5,"central":1},"w760":{"puzzles":20,"share":{"n":20,"min":0.22727272727272727,"p10":0.22727272727272727,"p25":0.22727272727272727,"median":0.2727272727272727,"p75":0.3181818181818182,"p90":0.3181818181818182,"max":0.4090909090909091},"position":0.5,"central":1},"a3":{"puzzles":20,"share":{"n":20,"min":0.22727272727272727,"p10":0.22727272727272727,"p25":0.22727272727272727,"median":0.3181818181818182,"p75":0.3181818181818182,"p90":0.3181818181818182,"max":0.4090909090909091},"position":0.5,"central":1}},"12x12-nightmare":{"before":{"puzzles":20,"share":{"n":20,"min":0.15,"p10":0.15,"p25":0.15789473684210525,"median":0.15789473684210525,"p75":0.2,"p90":0.21052631578947367,"max":0.25},"position":0.6041666666666667,"central":1},"w095":{"puzzles":20,"share":{"n":20,"min":0.2,"p10":0.2,"p25":0.25,"median":0.2631578947368421,"p75":0.3,"p90":0.3157894736842105,"max":0.35},"position":0.35416666666666663,"central":1},"main":{"puzzles":20,"share":{"n":20,"min":0.15789473684210525,"p10":0.2,"p25":0.2,"median":0.2631578947368421,"p75":0.3,"p90":0.3157894736842105,"max":0.35},"position":0.375,"central":1},"w380":{"puzzles":20,"share":{"n":20,"min":0.15789473684210525,"p10":0.2,"p25":0.2,"median":0.256578947368421,"p75":0.2631578947368421,"p90":0.3157894736842105,"max":0.3157894736842105},"position":0.5208333333333333,"central":1},"w760":{"puzzles":20,"share":{"n":20,"min":0.15789473684210525,"p10":0.2,"p25":0.2,"median":0.21052631578947367,"p75":0.21052631578947367,"p90":0.2631578947368421,"max":0.3},"position":0.4583333333333333,"central":1}},"26x26-master":{"before":{"puzzles":50,"share":{"n":50,"min":0.07407407407407407,"p10":0.12,"p25":0.14814814814814814,"median":0.18518518518518517,"p75":0.20833333333333334,"p90":0.24,"max":0.24},"position":0.5,"central":1},"main":{"puzzles":50,"share":{"n":50,"min":0.07407407407407407,"p10":0.08333333333333333,"p25":0.12,"median":0.16,"p75":0.18518518518518517,"p90":0.2,"max":0.28},"position":0.5,"central":1},"w380":{"puzzles":50,"share":{"n":50,"min":0.07407407407407407,"p10":0.08333333333333333,"p25":0.1111111111111111,"median":0.16,"p75":0.18518518518518517,"p90":0.2,"max":0.28},"position":0.5,"central":1}},"26x26-hell-1":{"before":{"puzzles":15,"share":{"n":15,"min":0.09523809523809523,"p10":0.10256410256410256,"p25":0.11904761904761904,"median":0.1282051282051282,"p75":0.15384615384615385,"p90":0.15384615384615385,"max":0.1794871794871795},"position":0.5428571428571428,"central":0.9333333333333333},"main":{"puzzles":20,"share":{"n":20,"min":0.14285714285714285,"p10":0.14285714285714285,"p25":0.16666666666666666,"median":0.1951219512195122,"p75":0.21951219512195122,"p90":0.24390243902439024,"max":0.2926829268292683},"position":0.42857142857142855,"central":0.95},"a3":{"puzzles":20,"share":{"n":20,"min":0.14285714285714285,"p10":0.14285714285714285,"p25":0.16666666666666666,"median":0.1951219512195122,"p75":0.21951219512195122,"p90":0.24390243902439024,"max":0.2926829268292683},"position":0.42857142857142855,"central":0.95}}}` |
| R33 | Measured; ratios Derived | paired factors before -> no screen -> 190 M with their n, the two parts of the shift | `{"14x14-nightmare":{"factors":[{"from":"before","to":"w760","t10":{"n":0,"median":null,"min":null,"max":null},"response":{"n":2,"median":9.541391133989563,"min":9.347747937285225,"max":9.735034330693901},"completion":{"before":0,"after":2,"of":2},"shareShift":0.10243741765480896},{"from":"w760","to":"main","t10":{"n":2,"median":2.569226969732718,"min":2.1087210476349387,"max":3.0297328918304975},"response":{"n":2,"median":2.5394430462337665,"min":2.089678761880846,"max":2.9892073305866864},"completion":{"before":2,"after":2,"of":2},"shareShift":0.04545454545454547},{"from":"before","to":"main","t10":{"n":0,"median":null,"min":null,"max":null},"response":{"n":2,"median":24.142725572820765,"min":20.343094487031962,"max":27.942356658609572},"completion":{"before":0,"after":2,"of":2},"shareShift":0.14789196310935443},{"from":"w760","to":"w380","t10":{"n":2,"median":1.6203316119375866,"min":1.4118791764512675,"max":1.8287840474239057},"response":{"n":2,"median":1.6100394479153428,"min":1.4073641304160671,"max":1.8127147654146185},"completion":{"before":2,"after":2,"of":2},"shareShift":0},{"from":"w760","to":"w095","t10":{"n":2,"median":3.9940645147853857,"min":3.275253648387924,"max":4.712875381182847},"response":{"n":2,"median":3.885689980103223,"min":3.2061231164499233,"max":4.565256843756523},"completion":{"before":2,"after":2,"of":2},"shareShift":0.04545454545454547}],"shift":{"sets":{"w095":{"requests":2,"earlier":2,"same":0,"later":0},"main":{"requests":2,"earlier":2,"same":0,"later":0},"w380":{"requests":2,"earlier":2,"same":0,"later":0},"w760":{"requests":2,"earlier":2,"same":0,"later":0}},"sameSet":{"w095":{"before":{"n":0,"median":null,"perRequest":[]},"w760":{"n":2,"median":0.25,"perRequest":[{"seed":"landscape/14x14-nightmare/0","delta":0},{"seed":"landscape/14x14-nightmare/1","delta":0.5}]}},"main":{"before":{"n":0,"median":null,"perRequest":[]},"w760":{"n":2,"median":0,"perRequest":[{"seed":"landscape/14x14-nightmare/0","delta":0},{"seed":"landscape/14x14-nightmare/1","delta":0}]}},"w380":{"before":{"n":0,"median":null,"perRequest":[]},"w760":{"n":2,"median":0,"perRequest":[{"seed":"landscape/14x14-nightmare/0","delta":0},{"seed":"landscape/14x14-nightmare/1","delta":0}]}},"w760":{"before":{"n":0,"median":null,"perRequest":[]}}}}},"12x12-nightmare":{"factors":[{"from":"before","to":"w760","t10":{"n":2,"median":8.061689708416473,"min":2.129220146076782,"max":13.994159270756166},"response":{"n":2,"median":7.895991659576586,"min":2.118715513904132,"max":13.67326780524904},"completion":{"before":2,"after":2,"of":2},"shareShift":0.05263157894736842},{"from":"w760","to":"main","t10":{"n":2,"median":1.1389101134753892,"min":1.1074223247820423,"max":1.1703979021687363},"response":{"n":2,"median":1.134024687745651,"min":1.1019502890034314,"max":1.1660990864878706},"completion":{"before":2,"after":2,"of":2},"shareShift":0.05263157894736842},{"from":"before","to":"main","t10":{"n":2,"median":8.994739592607319,"min":2.492034792223676,"max":15.49744439299096},"response":{"n":2,"median":8.76894681745339,"min":2.470632225291288,"max":15.067261409615494},"completion":{"before":2,"after":2,"of":2},"shareShift":0.10526315789473684},{"from":"w760","to":"w380","t10":{"n":2,"median":0.940531111060557,"min":0.8612749834043627,"max":1.0197872387167513},"response":{"n":2,"median":0.9401353085833143,"min":0.8606699319411883,"max":1.0196006852254402},"completion":{"before":2,"after":2,"of":2},"shareShift":0.046052631578947345},{"from":"w760","to":"w095","t10":{"n":2,"median":1.6591975685593734,"min":1.3659909222382107,"max":1.952404214880536},"response":{"n":2,"median":1.6315757009176362,"min":1.3584951101012477,"max":1.9046562917340248},"completion":{"before":2,"after":2,"of":2},"shareShift":0.05263157894736842}],"shift":{"sets":{"w095":{"requests":2,"earlier":0,"same":2,"later":0},"main":{"requests":2,"earlier":0,"same":2,"later":0},"w380":{"requests":2,"earlier":0,"same":2,"later":0},"w760":{"requests":2,"earlier":0,"same":2,"later":0}},"sameSet":{"w095":{"before":{"n":2,"median":1.5,"perRequest":[{"seed":"landscape/12x12-nightmare/0","delta":1},{"seed":"landscape/12x12-nightmare/1","delta":2}]},"w760":{"n":2,"median":1,"perRequest":[{"seed":"landscape/12x12-nightmare/0","delta":1},{"seed":"landscape/12x12-nightmare/1","delta":1}]}},"main":{"before":{"n":2,"median":1.5,"perRequest":[{"seed":"landscape/12x12-nightmare/0","delta":1},{"seed":"landscape/12x12-nightmare/1","delta":2}]},"w760":{"n":2,"median":1,"perRequest":[{"seed":"landscape/12x12-nightmare/0","delta":1},{"seed":"landscape/12x12-nightmare/1","delta":1}]}},"w380":{"before":{"n":2,"median":1,"perRequest":[{"seed":"landscape/12x12-nightmare/0","delta":0},{"seed":"landscape/12x12-nightmare/1","delta":2}]},"w760":{"n":2,"median":0.5,"perRequest":[{"seed":"landscape/12x12-nightmare/0","delta":0},{"seed":"landscape/12x12-nightmare/1","delta":1}]}},"w760":{"before":{"n":2,"median":0.5,"perRequest":[{"seed":"landscape/12x12-nightmare/0","delta":0},{"seed":"landscape/12x12-nightmare/1","delta":1}]}}}}}}` |
| R20 | Measured; the T1 bound is a Projection | set-stage probes per call (wasted included), rounds, serial and critical ms, the idealised call-level T1 bound and the measured T1 | `{"14x14-nightmare":{"setStage":{"main":{"calls":8,"finished":2,"unfinished":6,"unfinishedProbes":11,"probesPerCall":{"n":2,"median":3,"p90":3,"max":3},"probesPerCallMean":3,"probesTotal":6,"a3Probes":0,"rounds":0,"wastedProbes":0,"serialMs":{"n":0,"median":null,"p90":null,"max":null},"criticalMs":{"n":0,"median":null,"p90":null,"max":null}},"a3":{"calls":8,"finished":2,"unfinished":6,"unfinishedProbes":11,"probesPerCall":{"n":2,"median":3,"p90":3,"max":3},"probesPerCallMean":3,"probesTotal":6,"a3Probes":0,"rounds":0,"wastedProbes":0,"serialMs":{"n":0,"median":null,"p90":null,"max":null},"criticalMs":{"n":0,"median":null,"p90":null,"max":null}}},"idealisedT1Bound":{"n":2,"min":1344.1533,"median":1514.24525,"p95":1684.3372000000002,"max":1684.3372000000002},"t1":{"main":{"n":2,"min":1447.3391,"median":1502.92245,"p95":1558.5058,"max":1558.5058},"a3":{"n":2,"min":1344.1533,"median":1514.24525,"p95":1684.3372000000002,"max":1684.3372000000002}}},"26x26-hell-1":{"setStage":{"main":{"calls":8,"finished":4,"unfinished":4,"unfinishedProbes":25,"probesPerCall":{"n":4,"median":4.5,"p90":17,"max":17},"probesPerCallMean":7.25,"probesTotal":29,"a3Probes":0,"rounds":0,"wastedProbes":0,"serialMs":{"n":0,"median":null,"p90":null,"max":null},"criticalMs":{"n":0,"median":null,"p90":null,"max":null}},"a3":{"calls":8,"finished":4,"unfinished":4,"unfinishedProbes":27,"probesPerCall":{"n":4,"median":5.5,"p90":19,"max":19},"probesPerCallMean":8.25,"probesTotal":33,"a3Probes":10,"rounds":3,"wastedProbes":2,"serialMs":{"n":3,"median":1427.004,"p90":1975.859,"max":1975.859},"criticalMs":{"n":3,"median":712.455,"p90":1044.836,"max":1044.836}}},"idealisedT1Bound":{"n":2,"min":4071.1144,"median":8484.918,"p95":12898.7216,"max":12898.7216},"t1":{"main":{"n":2,"min":4265.1867999999995,"median":8552.367,"p95":12839.5472,"max":12839.5472},"a3":{"n":2,"min":4071.1144,"median":9116.62,"p95":14162.125600000001,"max":14162.125600000001}}}}` |
| R07 | Measured; ratio Derived | 26x26 Master reps 0-4: T10 before, IGP-01 after (190 M) and 380 M, per-seed ratios | `{"26x26-master":{"perSeed":[{"seed":"landscape/26x26-master/0","t10":{"before":12306.7961,"main":5773.3247,"w380":5504.266500000001},"beforeOverMain":2.1316653296842976,"beforeOverW380":2.2358648695516465,"mainOverW380":1.0488817538176975},{"seed":"landscape/26x26-master/1","t10":{"before":10042.760199999999,"main":13429.243499999999,"w380":13112.9631},"beforeOverMain":0.7478276940916292,"beforeOverW380":0.7658650545581112,"mainOverW380":1.0241196743701657},{"seed":"landscape/26x26-master/2","t10":{"before":6456.677299999999,"main":16914.630999999998,"w380":11850.7941},"beforeOverMain":0.38172143985878265,"beforeOverW380":0.5448307721420964,"mainOverW380":1.4272993739719095},{"seed":"landscape/26x26-master/3","t10":{"before":12263.5049,"main":9638.046699999999,"w380":10263.8058},"beforeOverMain":1.2724056317344885,"beforeOverW380":1.194830176931056,"mainOverW380":0.9390324493473949},{"seed":"landscape/26x26-master/4","t10":{"before":12491.9087,"main":15137.3326,"w380":15786.9989},"beforeOverMain":0.8252384373188708,"beforeOverW380":0.7912782397166063,"mainOverW380":0.9588480176558446}],"beforeOverMain":{"n":5,"median":0.8252384373188708,"geoMean":0.9143120215251755,"min":0.38172143985878265,"max":2.1316653296842976},"beforeOverW380":{"n":5,"median":0.7912782397166063,"geoMean":0.9752118458638418,"min":0.5448307721420964,"max":2.2358648695516465},"mainOverW380":{"n":5,"median":1.0241196743701657,"geoMean":1.0666072663433632,"min":0.9390324493473949,"max":1.4272993739719095}}}` |

## Journal

Journal lines (appends): IGP-01/before 5706, w095 521, w380 1340, w760 357, IGP-01/after 4124, a3 743. Measured cost of one append (self-test): 0.295 ms; IGP-01/before 1.683 s, w095 0.154 s, w380 0.395 s, w760 0.105 s, IGP-01/after 1.217 s, a3 0.219 s in all (appends x cost), to be read beside the timings. Journal sources: 12x12-nightmare: published journal; 14x14-nightmare: published journal; 15x15b10-nightmare: published journal; 26x26-hell-1: published journal; fast: published journal; fast-master: published journal.
