# Cross-review round 1: re-checks of SA-Astra's record claims (SA-Opus scratch)

Computed by `x1-recheck.mjs` (independent code over the raw journals, IGP-05 and V4-S2P; no SA-Astra script is run).
Call work = the sum of the call's `p` units (main + census) and `count` units in journal order; it equals the end line's
`locate.spent` on 2567 of 2567 ended calls that carry it. "Before final" = that sum less
the last primitive: P5 checks `spent >= budget` before every rating and count (`ig-select-v4.js:422-426`), so a budget
B stops an uncapped call iff its before-final work is at least B.

Calls: 3410; without an end line 843, of which 839 end on an open primitive (a `begin` without its
completion). Linkage timelines (T06 `timelineProblem`): 165 of 165 rows without a problem.

## 1. Work rule per pool (T09c `workRule`, fr-screen against fr-none, G units per accepted puzzle)

| Pool | screen lo | screen hi | none lo | none hi | verdict | margin none lo / screen hi |
|---|---:|---:|---:|---:|---|---:|
| 196-215 (14x14, 15x15b10) | 0.968309 | 1.925159 | 2.634979 | 3.936347 | pass | 1.369 |
| 196-256 (14x14, 15x15b10, 16x16) | 0.978925 | 2.283682 | 2.512292 | 4.234249 | pass | 1.100 |
| 216-324 piloted (16x16, 15x20) | 0.930118 | 3.470303 | 1.838490 | 4.805319 | unknown | 0.530 |
| 257-324 piloted (15x20) | 0.860079 | 3.939878 | 1.410064 | 4.780585 | unknown | 0.358 |
| 216-256 (16x16) | 1.000157 | 3.000729 | 2.266917 | 4.830053 | unknown | 0.755 |

Per row (pilot reps 0-4), G per puzzle: screen arm hi, no-screen arm lo.

| Cell | screen hi per row | mean / sd | none lo per row | mean / sd |
|---|---|---:|---|---:|
| 14x14-nightmare | 1.55 1.77 1.80 1.75 1.90 | 1.754 / 0.129 | 2.04 2.15 2.77 2.92 3.03 | 2.582 / 0.454 |
| 15x15b10-nightmare | 2.08 1.59 2.11 2.73 1.97 | 2.096 / 0.412 | 2.19 1.66 2.97 3.96 2.66 | 2.688 / 0.864 |
| 16x16-nightmare | 3.24 3.30 2.58 3.35 2.53 | 3.001 / 0.410 | 2.10 3.66 1.78 1.92 1.87 | 2.267 / 0.788 |
| 15x20-nightmare | 3.34 4.45 3.29 3.76 4.86 | 3.940 / 0.692 | 0.74 1.27 2.17 1.96 0.90 | 1.410 / 0.635 |

Pass margin at 20 seeds per cell (normal approximation of the pooled means; z = margin / standard error; the sd of
each cell inflated by k for the thin five-seed tails). Stress "worst row": every validation row of a cell at its worst pilot
row (the screen arm at its highest hi, the no-screen arm at its lowest lo).

| Pool | margin G | z (k=1) | z (k=2) | z (k=3) | worst-row screen hi | worst-row none lo | worst-row verdict |
|---|---:|---:|---:|---:|---:|---:|---|
| 196-215 (14x14, 15x15b10) | 0.710 | 5.9 | 3.0 | 2.0 | 2.316 | 1.853 | unknown |
| 196-256 (14x14, 15x15b10, 16x16) | 0.229 | 2.2 | 1.1 | 0.7 | 2.661 | 1.828 | unknown |

## 2. Hell 1 prior fits

fr-base rows. "Pooled" = the median clue share of all accepted puzzles of the cell (prior-v1's rule, `fit-prior.mjs:36-48`);
"per request" = the median of the per-request medians (SA-Astra's rule); "wc/K" = SA-Opus round 1 (`s2-prior.json`).

| Cell | puzzles | pooled median share | per-request medians | median of them | wc/K (round 1) |
|---|---:|---:|---|---:|---:|
| 14x14-hell-1 | 42 | 0.382353 | 0.375 0.382 0.400 0.359 0.406 | 0.382353 | 0.403125 |
| 20x20-hell-1 | 50 | 0.349624 | 0.381 0.342 0.295 0.329 0.368 | 0.342105 | 0.368421 |
| 24x24-hell-1 | 50 | 0.216899 | 0.231 0.250 0.213 0.218 0.195 | 0.217949 | 0.219512 |
| 26x26-hell-1 | 50 | 0.200000 | 0.155 0.207 0.192 0.200 0.200 | 0.200000 | 0.200000 |

PM1 (IGP-05), Hell 1 families: 52 (0 duplicate case/seed/order keys across the two files).
Share per family = median of count/K over probes with `eligible` and `inBand`; per seed = median over its families; per area =
median over seeds.

| Area | cases | seeds with an eligible window | per-seed shares | area share |
|---:|---|---:|---|---:|
| 196 | 14x14-hell-1 | 4 | 0.4063 0.3529 0.3750 0.4118 | 0.390625 |
| 215 | 15x15b10-hell-1 | 1 | 0.4044 | 0.404412 |
| 256 | 16x16-hell-1 | 1 | 0.3581 | 0.358108 |
| 300 | 15x20-hell-1 | 2 | 0.4125 0.4744 | 0.443429 |
| 324 | 18x18-hell-1 | 2 | 0.3333 0.3611 | 0.347222 |
| 360 | 18x20-hell-1 | 2 | 0.3041 0.3590 | 0.331514 |
| 400 | 20x20-hell-1 | 2 | 0.3438 0.4207 | 0.382241 |
| 420 | 20x21-hell-1 | 1 | 0.3902 | 0.390244 |
| 480 | 32x15-hell-1 | 2 | 0.3205 0.2738 | 0.297161 |
| 484 | 22x22-hell-1 | 2 | 0.3000 0.2750 | 0.287500 |
| 576 | 24x24-hell-1 | 3 | 0.2857 0.1795 0.2440 | 0.244048 |

## 3. Successful calls of the uncapped arms against budget tables

2258 calls ended `ok` in the six uncapped arms. Before-final work in G.

| Class | ok calls | rows | max before-final | max total | q90 | q99 | mean excess over q90 |
|---|---:|---:|---:|---:|---:|---:|---:|
| nightmare | 1613 | 105 | 6.184 | 6.610 | 1.610 | 3.796 | 0.918 |
| hell-1 <=215 | 68 | 5 | 25.560 | 26.168 | 13.599 | 25.560 | 5.443 |
| hell-1 >=216 | 577 | 40 | 13.633 | 13.849 | 4.524 | 7.111 | 1.568 |

Per table: pilot ok calls whose before-final work reaches the budget, and the expected number of successful calls
stopped in V4-S4's two bounded twins (exponential tail above q90; ok calls per pilot request x requests; an indication).

| Table | Nightmare: pilot stops / expected in V4-S4 | Hell 1 <=215 | Hell 1 >=216 |
|---|---|---|---|
| SA-Astra (8 / 32 / 16 G) | 8 G: 0 / 0.87 | 32 G: 0 / 1.63 | 16 G: 0 / 0.11 |
| SA-Opus round 1 (10 / 40 / 40 G) | 10 G: 0 / 0.10 | 40 G: 0 / 0.38 | 40 G: 0 / 0.00 |
| x1.5 rule per class (10 / 40 / 21 G) | 10 G: 0 / 0.10 | 40 G: 0 / 0.38 | 21 G: 0 / 0.00 |

14x14 Hell 1, fr-base: 68 ok calls (59 batch); batch calls with before-final >= 2 G: 48; with total > 2 G: 53; all ok calls with before-final >= 2 G: 55.

Largest before-final work per arm and Hell 1 cell (ok calls), G:

- 14x14-hell-1: fr-base 25.560 (total 26.168, n 68)
- 20x20-hell-1: fr-base 13.548 (total 13.764, n 75); fr-ps 13.633 (total 13.849, n 85)
- 24x24-hell-1: fr-base 6.229 (total 6.510, n 70)
- 26x26-hell-1: fr-base 7.001 (total 7.703, n 64); fr-screen 7.174 (total 7.375, n 72); fr-none 7.001 (total 7.703, n 64); fr-close 7.001 (total 7.703, n 64); fr-ps 8.330 (total 8.531, n 83)

## 4. `require` evidence (V4-S2P; every P-1 item runs `uniqueness: 'require'`: `v4-check.mjs:129`, `lib/lane-worker.mjs` `selectItem`)

- fr-base: generation (12x12 Nightmare, quantity 2, one worker): 1 set starts, 1 batch starts, 2 ends; set ends ok@5.817 (S = budget stop).
  - 12x12-nightmare:ig-v4/parity/12x12-nightmare:charge: ok ok=true; work 10.274 G; 35990 ms
  - 12x12-nightmare:ig-v4/parity/12x12-nightmare:absent: ok ok=true; work 10.274 G; 35996 ms
  - 12x12-nightmare:ig-v4/parity/12x12-nightmare:record: ok ok=true; work 10.274 G; 38181 ms
  - 26x26-hell-1:ig-v4/parity/26x26-hell-1:absent: ok ok=false not-in-band; work 20.608 G; 92560 ms
  - 26x26-hell-1:ig-v4/parity/26x26-hell-1:charge: ok ok=false not-in-band; work 20.608 G; 92638 ms
  - 14x14-master:ig-v4/parity/14x14-master:absent: ok ok=true; work 1.148 G; 5234 ms
  - 14x14-master:ig-v4/parity/14x14-master:charge: ok ok=true; work 1.148 G; 5213 ms
  - 14x14-master:ig-v4/parity/14x14-master:record: ok ok=true; work - G; 5449 ms
  - 26x26-hell-1:ig-v4/parity/26x26-hell-1:record: ok ok=false not-in-band; work 20.608 G; 93544 ms
  - 12x12-nightmare:ig-v4/replay/12x12-nightmare:gen: ok; work - G; 42045 ms
  - 12x12-nightmare:ig-v4/replay/12x12-nightmare:puzzle-0: ok; work 5.817 G; 19162 ms
  - 12x12-nightmare:ig-v4/replay/12x12-nightmare:puzzle-1: ok; work 12.646 G; 41631 ms
- fr-p5: generation (12x12 Nightmare, quantity 2, one worker): 16 set starts, 0 batch starts, 15 ends; set ends not-in-band@2.038S not-in-band@2.019S not-in-band@2.692S not-in-band@2.538S not-in-band@2.179S not-in-band@2.372S not-in-band@2.011S not-in-band@2.391S not-in-band@2.554S not-in-band@2.696S not-in-band@2.235S not-in-band@2.677S not-in-band@2.353S not-in-band@2.079S not-in-band@2.581S (S = budget stop).
  - 12x12-nightmare:ig-v4/parity/12x12-nightmare:charge: ok ok=true; work 2.005 G; 7256 ms
  - 12x12-nightmare:ig-v4/parity/12x12-nightmare:absent: ok ok=true; work 2.005 G; 7279 ms
  - 26x26-hell-1:ig-v4/parity/26x26-hell-1:absent: ok ok=false not-in-band; work 2.166 G; 6423 ms
  - 12x12-nightmare:ig-v4/parity/12x12-nightmare:record: ok ok=true; work 2.005 G; 9489 ms
  - 26x26-hell-1:ig-v4/parity/26x26-hell-1:charge: ok ok=false not-in-band; work 2.166 G; 6339 ms
  - 26x26-hell-1:ig-v4/parity/26x26-hell-1:record: ok ok=false not-in-band; work 2.166 G; 7877 ms
  - 14x14-master:ig-v4/parity/14x14-master:absent: ok ok=true; work 1.148 G; 5266 ms
  - 14x14-master:ig-v4/parity/14x14-master:charge: ok ok=true; work 1.148 G; 5294 ms
  - 14x14-master:ig-v4/parity/14x14-master:record: ok ok=true; work - G; 5601 ms
  - 12x12-nightmare:ig-v4/replay/12x12-nightmare:gen: no-set time-limit; work - G; 115014 ms
  - 12x12-nightmare:ig-v4/replay/12x12-nightmare:puzzle-0: no-record no pack; work - G; 1 ms
  - 12x12-nightmare:ig-v4/replay/12x12-nightmare:puzzle-1: no-record no pack; work - G; 1 ms
- fr-base generation calls (spent, G): ok@5.817 ok@6.829

## 5. Per-set prior transport (fr-ps)

- 20x20-hell-1: 93 batch calls (started), priorCount equal to the wc of the set attempt the run records (`details.setAttempt`) on 93; mean locate profiles per batch call fr-base 5.537, fr-ps 2.591.
- 26x26-hell-1: 90 batch calls (started), priorCount equal to the wc of the set attempt the run records (`details.setAttempt`) on 90; mean locate profiles per batch call fr-base 3.014, fr-ps 1.744.

## 6. Await idle worker time (T06 `linkSummary`, sum over the five rows of an arm and cell)

Idle s per arm and cell: min 0.025, max 0.050, median 0.032 over 33 groups; await s min 32.4, max 458.5.

## 7. Table-prior start counts of the Hell 1 set calls (fr-base `start` lines, `priorCount`)

- 14x14-hell-1: 20 set starts; priorCount 8 x7, 9 x13
- 20x20-hell-1: 20 set starts; priorCount null x20
- 24x24-hell-1: 20 set starts; priorCount 6 x20
- 26x26-hell-1: 20 set starts; priorCount 5 x20

## 8. (c4) `below` and bracket-close `close` profiles

- fr-c4 14x14-nightmare: completed `below` profiles 64 (61 in ended calls, 3 in calls without an end)
- fr-c4 26x26-nightmare: completed `below` profiles 75 (71 in ended calls, 4 in calls without an end)
- fr-close 12x12-nightmare: completed `close` profiles 0 (0 in ended calls, 0 in calls without an end)
- fr-close 14x14-nightmare: completed `close` profiles 8 (8 in ended calls, 0 in calls without an end)
- fr-close 26x26-hell-1: completed `close` profiles 0 (0 in ended calls, 0 in calls without an end)

## 9. fr-p5 set attempts ended `not-in-band` by a budget stop

- 20x20-hell-1~0 attempt 0: 2.298471303 G
- 20x20-hell-1~0 attempt 3: 2.339719457 G
- 20x20-hell-1~2 attempt 3: 2.363961420 G
- 20x20-hell-1~4 attempt 0: 2.421547354 G
