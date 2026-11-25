# IGP-01 comparison, corrected (r2)

> **Provisional (pre-freeze).** Measured on rating-v3 runtime cd5d17f (worktree 0e1283e) (source digest 34cea386…, equal to MP12b1's source), not on the frozen post-MP17 source. Re-run: pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\IGP-01.json -Label frozen -SourceLabel <label> -LockHelper <path>.

This record supersedes the reading of the headline table in `compare.md`; `compare.json` and `compare.md` stay as written. It is an analysis of the published runs and journals only (no generation, no rating). "After" values are *Measured*, ratios are *Derived*, the estimates are the analysts' *Projections*.

## What the headline does and does not show

- **The after arm produces different puzzles.** The after arm produces different puzzles from today: on Nightmare and Hell 1 about 1 to 3 more clues per puzzle at a similar score, so part of the speed-up comes from a different puzzle population, not only from a faster search of the same puzzles.
- **Estimate column.** The estimate column holds the analysts' P1 to P5 rows at four workers (R02 to R08), not the after-all-phases values (R31); the R31 values are shown apart.
- **Samples.** The estimates were applied to MP12b1's 20-seed T10 medians, while the measurements use 3 to 6 seeds, including seeds that today never finishes (a request that does not reach ten has no T10).
- **Puzzles.** The estimates assumed today's puzzles (the same clue counts and scores); the after arm's puzzles differ (population section).

| Cell | Today, MP12b1 20 reps: T10 median / p95 (ten of 20) | Before: T10 median (ten of n) | After: T10 median (ten of n) | Paired T10 ratio (n) | Paired response ratio (n) | P1-P5 estimate, Opus / Astra (R02-R08) | After all phases, Opus / Astra (R31, not compared) |
|---|---|---|---|---|---|---|---|
| 12x12 Nightmare | 62.14 / 176.07 (17) | 53.12 (3 of 3) | 5.74 (3 of 3) | 9.26 (3) | 9.10 (3) | about 39-48 s / 44.5 s | 16 s / 21.7 s |
| 14x14 Nightmare | 112.98 / 151.64 (11) | 46.54 (1 of 3) | 8.94 (3 of 3) | 3.82 (1) | 20.34 (3) | 17.7 s / 16.0 s | 8.0 s / 7.94 s |
| 15x15b10 Nightmare | 86.23 / 141.56 (11) | 59.52 (2 of 3) | 8.45 (3 of 3) | 8.22 (2) | 8.38 (3) | 13.8 s / 13.7 s | 6.3 s / 7.22 s |
| Hell 1 26x26 | 108.72 / 167.59 (9) | 149.87 (2 of 3) | 37.25 (3 of 3) | 5.03 (2) | 4.79 (3) | about 28 s (if a window holds) / 50-60 s (if a window holds) | 15 s / 25-30 s |
| 26x26 Nightmare | 18.61 / 31.38 (20) | 26.53 (6 of 6) | 11.94 (6 of 6) | 2.01 (6) | 2.00 (6) | 15.5 s / 17.8 s | 7.0 s / 8.84 s |
| 14x14 Master | 2.57 / 16.28 (20) | 3.17 (5 of 5) | 2.66 (5 of 5) | 1.25 (5) | 1.21 (5) | unchanged / unchanged | not stated / not stated |
| 26x26 Master | 8.36 / 16.64 (20) | 12.26 (5 of 5) | 13.43 (5 of 5) | 0.83 (5) | 0.83 (5) | unchanged / unchanged | not stated / not stated |

## Population of the accepted puzzles

Clue share is clues / K of each accepted puzzle; spread is `median [p25-p75] (min-max)` (nearest-rank percentiles). MP12b1 is all 20 reps of the cell; "MP12b1 matched" the seeds of the measured cohort; the before and after arms are the measured seeds.

| Cell | Median clue share: MP12b1 | Before | After | After - MP12b1 | Median clues: MP12b1 / before / after | Median score: MP12b1 / before / after |
|---|---:|---:|---:|---:|---|---|
| 12x12 Nightmare | 0.211 | 0.158 | 0.263 | +0.053 | 4.0 / 3.0 / 5.0 | 68.0 / 68.0 / 62.5 |
| 14x14 Nightmare | 0.190 | 0.143 | 0.255 | +0.065 | 4.0 / 3.0 / 5.5 | 66.5 / 65.5 / 65.0 |
| 15x15b10 Nightmare | 0.182 | 0.182 | 0.227 | +0.045 | 4.0 / 4.0 / 5.0 | 66.0 / 66.0 / 64.5 |
| Hell 1 26x26 | 0.128 | 0.125 | 0.205 | +0.077 | 5.0 / 5.0 / 8.0 | 97.0 / 96.0 / 92.0 |
| 26x26 Nightmare | 0.133 | 0.133 | 0.167 | +0.033 | 4.0 / 4.0 / 5.0 | 65.5 / 64.5 / 65.0 |
| 14x14 Master | 0.222 | 0.235 | 0.235 | +0.013 | 4.0 / 4.0 / 4.0 | 45.0 / 45.0 / 45.0 |
| 26x26 Master | 0.189 | 0.185 | 0.160 | -0.029 | 5.0 / 5.0 / 4.0 | 44.5 / 45.0 / 45.0 |

### 12x12 Nightmare

| Source | Puzzles | K | Clues | Clue share | Score |
|---|---:|---|---|---|---|
| MP12b1, 20 reps (docs/difficulty-v3/landscape-v3-full/12x12-nightmare-2026-11-13.json) | 185 | 19.0 [19.0-21.0] (19.0-22.0) | 4.0 [3.0-4.0] (2.0-6.0) | 0.211 [0.158-0.211] (0.105-0.300) | 68.0 [65.0-70.0] (59.0-76.0) |
| MP12b1, the seeds of the measured cohort | 30 | 19.0 [19.0-20.0] (19.0-20.0) | 3.0 [3.0-4.0] (2.0-5.0) | 0.158 [0.158-0.211] (0.105-0.263) | 68.0 [65.0-70.0] (61.0-71.0) |
| before arm, 3 seeds | 30 | 19.0 [19.0-20.0] (19.0-20.0) | 3.0 [3.0-4.0] (2.0-5.0) | 0.158 [0.158-0.211] (0.105-0.263) | 68.0 [65.0-70.0] (61.0-71.0) |
| after arm, 3 seeds | 30 | 19.0 [19.0-20.0] (19.0-20.0) | 5.0 [4.0-6.0] (3.0-7.0) | 0.263 [0.211-0.316] (0.158-0.368) | 62.5 [61.0-68.0] (59.0-69.0) |

### 14x14 Nightmare

| Source | Puzzles | K | Clues | Clue share | Score |
|---|---:|---|---|---|---|
| MP12b1, 20 reps (docs/difficulty-v3/landscape-v3-full/14x14-nightmare-2026-11-13.json) | 126 | 21.0 [21.0-21.0] (21.0-24.0) | 4.0 [3.0-4.0] (3.0-6.0) | 0.190 [0.143-0.190] (0.130-0.250) | 66.5 [63.0-69.0] (59.0-72.0) |
| MP12b1, the seeds of the measured cohort | 12 | 21.0 [21.0-21.0] (21.0-24.0) | 3.0 [3.0-4.0] (3.0-4.0) | 0.143 [0.143-0.167] (0.143-0.190) | 65.5 [63.0-69.0] (62.0-71.0) |
| before arm, 3 seeds | 12 | 21.0 [21.0-21.0] (21.0-24.0) | 3.0 [3.0-4.0] (3.0-4.0) | 0.143 [0.143-0.167] (0.143-0.190) | 65.5 [63.0-69.0] (62.0-71.0) |
| after arm, 3 seeds | 30 | 22.0 [21.0-22.0] (21.0-22.0) | 5.5 [5.0-7.0] (4.0-9.0) | 0.255 [0.227-0.318] (0.190-0.409) | 65.0 [62.0-70.0] (59.0-71.0) |

### 15x15b10 Nightmare

| Source | Puzzles | K | Clues | Clue share | Score |
|---|---:|---|---|---|---|
| MP12b1, 20 reps (docs/difficulty-v3/landscape-v3-full/15x15b10-nightmare-2026-11-13.json) | 141 | 22.0 [22.0-22.0] (22.0-24.0) | 4.0 [4.0-4.0] (3.0-6.0) | 0.182 [0.182-0.182] (0.130-0.273) | 66.0 [63.0-69.0] (59.0-71.0) |
| MP12b1, the seeds of the measured cohort | 24 | 22.0 [22.0-22.0] (22.0-22.0) | 4.0 [3.0-4.0] (3.0-5.0) | 0.182 [0.136-0.182] (0.136-0.227) | 66.0 [62.0-68.0] (59.0-71.0) |
| before arm, 3 seeds | 24 | 22.0 [22.0-22.0] (22.0-22.0) | 4.0 [3.0-4.0] (3.0-5.0) | 0.182 [0.136-0.182] (0.136-0.227) | 66.0 [62.0-68.0] (59.0-71.0) |
| after arm, 3 seeds | 30 | 22.0 [22.0-23.0] (22.0-23.0) | 5.0 [5.0-7.0] (4.0-7.0) | 0.227 [0.227-0.304] (0.182-0.318) | 64.5 [61.0-69.0] (59.0-71.0) |

### Hell 1 26x26

| Source | Puzzles | K | Clues | Clue share | Score |
|---|---:|---|---|---|---|
| MP12b1, 20 reps (docs/difficulty-v3/landscape-v3-full/26x26-hell-1-2026-11-14.json) | 134 | 39.0 [39.0-40.0] (39.0-42.0) | 5.0 [4.0-6.0] (4.0-7.0) | 0.128 [0.103-0.143] (0.095-0.179) | 97.0 [94.0-100.0] (85.0-109.0) |
| MP12b1, the seeds of the measured cohort | 25 | 40.0 [39.0-40.0] (39.0-42.0) | 5.0 [4.0-6.0] (4.0-7.0) | 0.125 [0.100-0.143] (0.095-0.179) | 96.0 [91.0-99.0] (86.0-108.0) |
| before arm, 3 seeds | 25 | 40.0 [39.0-40.0] (39.0-42.0) | 5.0 [4.0-6.0] (4.0-7.0) | 0.125 [0.100-0.143] (0.095-0.179) | 96.0 [91.0-99.0] (86.0-108.0) |
| after arm, 3 seeds | 30 | 41.0 [39.0-42.0] (39.0-42.0) | 8.0 [7.0-10.0] (6.0-12.0) | 0.205 [0.179-0.238] (0.143-0.293) | 92.0 [89.0-99.0] (78.0-103.0) |

### 26x26 Nightmare

| Source | Puzzles | K | Clues | Clue share | Score |
|---|---:|---|---|---|---|
| MP12b1, 20 reps (docs/difficulty-v3/landscape-v3-full/26x26-nightmare-2026-11-14.json) | 200 | 31.5 [31.0-32.0] (30.0-33.0) | 4.0 [4.0-5.0] (3.0-7.0) | 0.133 [0.125-0.152] (0.094-0.212) | 65.5 [62.0-68.0] (59.0-71.0) |
| MP12b1, the seeds of the measured cohort | 60 | 31.5 [31.0-32.0] (30.0-33.0) | 4.0 [4.0-5.0] (3.0-7.0) | 0.133 [0.129-0.156] (0.097-0.212) | 64.5 [61.0-67.0] (59.0-71.0) |
| before arm, 6 seeds | 60 | 31.5 [31.0-32.0] (30.0-33.0) | 4.0 [4.0-5.0] (3.0-7.0) | 0.133 [0.129-0.156] (0.097-0.212) | 64.5 [61.0-67.0] (59.0-71.0) |
| after arm, 6 seeds | 60 | 31.5 [31.0-32.0] (30.0-33.0) | 5.0 [4.0-7.0] (3.0-11.0) | 0.167 [0.133-0.212] (0.097-0.333) | 65.0 [62.0-67.0] (59.0-71.0) |

### 14x14 Master

| Source | Puzzles | K | Clues | Clue share | Score |
|---|---:|---|---|---|---|
| MP12b1, 20 reps (docs/difficulty-v3/landscape-v3-full/14x14-master-2026-11-13.json) | 200 | 18.0 [17.0-19.0] (17.0-19.0) | 4.0 [4.0-4.0] (2.0-6.0) | 0.222 [0.211-0.235] (0.118-0.353) | 45.0 [44.0-46.0] (41.0-49.0) |
| MP12b1, the seeds of the measured cohort | 50 | 18.0 [17.0-18.0] (17.0-19.0) | 4.0 [4.0-5.0] (3.0-6.0) | 0.235 [0.222-0.263] (0.167-0.353) | 45.0 [44.0-46.0] (42.0-49.0) |
| before arm, 5 seeds | 50 | 18.0 [17.0-18.0] (17.0-19.0) | 4.0 [4.0-5.0] (3.0-6.0) | 0.235 [0.222-0.263] (0.167-0.353) | 45.0 [44.0-46.0] (42.0-49.0) |
| after arm, 5 seeds | 50 | 18.0 [17.0-18.0] (17.0-19.0) | 4.0 [4.0-5.0] (3.0-8.0) | 0.235 [0.222-0.278] (0.167-0.421) | 45.0 [44.0-46.0] (41.0-49.0) |

### 26x26 Master

| Source | Puzzles | K | Clues | Clue share | Score |
|---|---:|---|---|---|---|
| MP12b1, 20 reps (docs/difficulty-v3/landscape-v3-full/26x26-master-2026-11-14.json) | 200 | 25.5 [25.0-27.0] (24.0-27.0) | 5.0 [4.0-6.0] (2.0-7.0) | 0.189 [0.160-0.222] (0.074-0.259) | 44.5 [44.0-46.0] (41.0-49.0) |
| MP12b1, the seeds of the measured cohort | 50 | 25.0 [25.0-27.0] (24.0-27.0) | 5.0 [4.0-5.0] (2.0-6.0) | 0.185 [0.148-0.208] (0.074-0.240) | 45.0 [44.0-46.0] (41.0-49.0) |
| before arm, 5 seeds | 50 | 25.0 [25.0-27.0] (24.0-27.0) | 5.0 [4.0-5.0] (2.0-6.0) | 0.185 [0.148-0.208] (0.074-0.240) | 45.0 [44.0-46.0] (41.0-49.0) |
| after arm, 5 seeds | 50 | 25.0 [25.0-27.0] (24.0-27.0) | 4.0 [3.0-5.0] (2.0-7.0) | 0.160 [0.120-0.185] (0.074-0.280) | 45.0 [43.0-46.0] (41.0-49.0) |

**Reading.** The before arm's population equals MP12b1's on the same seeds (the same puzzles, as the identity check says). On the Nightmare cells and Hell 1 the after arm's median clue share is higher than MP12b1's by 0.033 to 0.077, that is 1.0 to 3.0 clues at the median, at a similar score (the after arm's median score differs from MP12b1's by -5.5 to -0.5 points). The after arm's puzzles are therefore not today's puzzles: part of the speed-up comes from a different puzzle population, and this record does not separate the two effects. On 14x14 Master the shares agree with the before arm; on 26x26 Master the after arm's share is lower (-0.029).

## 14x14 Nightmare: the paired factor rests on one seed

Today reaches ten on 1 of 3 seeds, so only 1 seed has a T10 on both sides: landscape/14x14-nightmare/2 (46.54 s before, 12.20 s after, factor 3.82). The paired T10 factor 3.82 (n 1) is not an estimate of anything. The comparison is carried by the paired response ratio 20.3 (min 3.78, max 27.94, n 3; a request that never reaches ten is counted at its response time) and by completion (1 of 3 to 3 of 3). A better factor needs the frozen round with ten or more seeds.

## 26x26 Master: a mixed result

Paired T10 ratios per seed (before / after; above 1 is faster): 0: 2.13, 1: 0.75, 2: 0.38, 3: 1.27, 4: 0.83. They range from 0.38 to 2.13: 2 seeds faster and 3 slower, geometric mean 0.91. The median 0.83 and the T10 medians (12.26 s before, 13.43 s after) cannot be told apart from "unchanged" at n = 5.

What the journals show: the after arm screen-capped 39 of 550 probes (7.1 %; outcomes above 88, ar1 6, below 208, central 77, in 132, over 1, scap0 17, scap1 21), where the before arm never capped (0 canonical caps of 729 probes). So `W` = 190 M is below the main work of some 26x26 Master ratings (each screen-capped probe spends up to 190 M units of main work and gives no rating). IGP-02 and IGP-03 measure this (the screen's economics and the `W` variants).
