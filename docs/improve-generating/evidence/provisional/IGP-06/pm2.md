# IGP-06 PM2: where rating time goes on 10x10 and 12x12 Nightmare

> **Provisional (pre-freeze).** Measured on rating-v3 runtime cd5d17f (worktree 0e1283e) (source digest 34cea386…, equal to MP12b1's source), not on the frozen post-MP17 source. Re-run: pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\IGP-06.json -Label frozen -SourceLabel <label> -LockHelper <path>.

Run `main` of IGP-06: 6 set-stage calls of the production call path on the `base` tree (0 censored), every corpus rating rated once more, canonically, in one supervised worker thread under the V8 CPU profiler (sampling interval 1000 us). **Measured:** shares of sampled self time. **Derived and hypothetical:** the P7 sensitivity (kernel = the `search` and `census` phases); it is never a measured improvement. Carving and layout work are outside the denominator: the denominator is the rating time of the profiled corpus (the attributed self time of every recorded rating, `(idle)` samples excluded).

## Corpus and ratings profiled

| Cell | Call profiles | Window subsets | Complete | Capped | Census incomplete (of complete) | Rating ms (attributed) | Samples |
|---|---|---|---|---|---|---|---|
| 10x10-nightmare | 19 | 36 | 53 | 2 | 33 | 55676.6 | 34857 |
| 12x12-nightmare | 22 | 36 | 37 | 21 | 14 | 86869.2 | 54136 |

Call profiles are today's set-stage ratings (the profiles of `selectClues`); window subsets are three clue subsets at each of the start count + 1 to + 4 (the rating mix closest to the prototype's, IGP-03: complete window-subset ratings). Complete = a rating was returned (its census may be incomplete); capped = the deduction path was capped (`IncompleteRatingError`), which ends before the census and the DLX diagnostic.

## Summary

- **10x10-nightmare** (55 ratings, 2 capped): search 78.5 %, census 17.8 %, model 0.2 %, dlx 3.3 %, other 0.2 %.
  - whole corpus: kernel share k 96.3 %, DLX diagnostic 3.3 %; kernel speed-up needed for a rating-time factor of 1.87 / 1.91: x 1.93 / x 1.98.
  - call profiles: kernel share k 95.9 %, DLX diagnostic 3.8 %; kernel speed-up needed for a rating-time factor of 1.87 / 1.91: x 1.94 / x 1.99.
  - complete window subsets (closest to the prototype's mix): kernel share k 96.0 %, DLX diagnostic 3.6 %; kernel speed-up needed for a rating-time factor of 1.87 / 1.91: x 1.94 / x 1.99.
- **12x12-nightmare** (58 ratings, 21 capped): search 91.3 %, census 4.4 %, model 0.1 %, dlx 4.0 %, other 0.1 %.
  - whole corpus: kernel share k 95.7 %, DLX diagnostic 4.0 %; kernel speed-up needed for a rating-time factor of 1.87 / 1.91: x 1.95 / x 1.99.
  - call profiles: kernel share k 97.7 %, DLX diagnostic 2.1 %; kernel speed-up needed for a rating-time factor of 1.87 / 1.91: x 1.91 / x 1.95.
  - complete window subsets (closest to the prototype's mix): kernel share k 89.4 %, DLX diagnostic 10.2 %; kernel speed-up needed for a rating-time factor of 1.87 / 1.91: x 2.09 / x 2.14.
- Factors "not reachable" by the kernel alone (1 / (1 - k) at or below the factor): none.

## 10x10-nightmare

### Phases (by stack ancestry)

| Phase | ms | Share |
|---|---|---|
| search | 43693.8 | 78.5 % |
| census | 9929.5 | 17.8 % |
| model | 91.2 | 0.2 % |
| dlx | 1843.3 | 3.3 % |
| other | 118.8 | 0.2 % |

The phase of a sample is the first marker among the frame and its ancestors: `census` (`runProbes`, `settleCensus`, `probe`, `replayLadder`), else `dlx` (`solveFirst`), else `model` (`buildModel`), else `search` (`measureDeduction`, `search`, `branch`), else `other` (scoring, the harness, `(program)`, GC). The ladder rules, `select` and `undo` are thus charged to the phase they ran in. Unplaced engine time (a `deduce.js` function that no marker could place, kept in `other`): 0.0 % of this cell's rating time; see the notes.

### Categories

| Category | ms | Share |
|---|---|---|
| ladder | 33789.6 | 60.7 % |
| state | 19681.6 | 35.3 % |
| control | 155.2 | 0.3 % |
| model | 71.2 | 0.1 % |
| dlx | 1843.3 | 3.3 % |
| gc | 9.7 | 0.0 % |
| other | 125.8 | 0.2 % |

### Phase x category (ms, share of rating time)

| Phase | ladder | state | control | model | dlx | gc | other |
|---|---|---|---|---|---|---|---|
| search | 27425.2 (49.3 %) | 16131.0 (29.0 %) | 137.5 (0.2 %) | - | - | - | - |
| census | 6361.3 (11.4 %) | 3550.6 (6.4 %) | 17.7 (0.0 %) | - | - | - | - |
| model | - | - | - | 71.2 (0.1 %) | - | - | 19.9 (0.0 %) |
| dlx | - | - | - | - | 1843.3 (3.3 %) | - | - |
| other | 3.2 (0.0 %) | - | - | - | - | 9.7 (0.0 %) | 105.9 (0.2 %) |

### Top 30 functions by self time

| # | Function | File | Category | ms | Share | search ms | census ms | model ms | dlx ms | other ms |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `select` | `core/engine/deduce.js` | state | 11153.4 | 20.0 % | 9102.8 | 2050.6 | - | - | - |
| 2 | `ruleR4` | `core/engine/deduce.js` | ladder | 9268.1 | 16.6 % | 7508.2 | 1759.9 | - | - | - |
| 3 | `neighbourCell` | `core/engine/deduce.js` | ladder | 5857.6 | 10.5 % | 4716.4 | 1138.0 | - | - | 3.2 |
| 4 | `undo` | `core/engine/deduce.js` | state | 4388.4 | 7.9 % | 3606.8 | 781.6 | - | - | - |
| 5 | `kill` | `core/engine/deduce.js` | state | 4131.7 | 7.4 % | 3413.3 | 718.4 | - | - | - |
| 6 | `ruleR5` | `core/engine/deduce.js` | ladder | 3786.1 | 6.8 % | 3111.3 | 674.8 | - | - | - |
| 7 | `ruleR8` | `core/engine/deduce.js` | ladder | 3144.7 | 5.6 % | 2539.6 | 605.1 | - | - | - |
| 8 | `gather` | `core/engine/deduce.js` | ladder | 2903.8 | 5.2 % | 2355.7 | 548.1 | - | - | - |
| 9 | `reachable` | `core/engine/deduce.js` | ladder | 2194.1 | 3.9 % | 1834.1 | 360.0 | - | - | - |
| 10 | `ruleR9` | `core/engine/deduce.js` | ladder | 1387.7 | 2.5 % | 1085.5 | 302.2 | - | - | - |
| 11 | `fillSums` | `core/engine/deduce.js` | ladder | 1098.8 | 2.0 % | 892.6 | 206.3 | - | - | - |
| 12 | `ruleR3` | `core/engine/deduce.js` | ladder | 931.3 | 1.7 % | 772.4 | 158.9 | - | - | - |
| 13 | `cover` | `core/engine/dlx.js` | dlx | 820.8 | 1.5 % | - | - | - | 820.8 | - |
| 14 | `uncover` | `core/engine/dlx.js` | dlx | 781.4 | 1.4 % | - | - | - | 781.4 | - |
| 15 | `queueCell` | `core/engine/deduce.js` | ladder | 653.5 | 1.2 % | 537.1 | 116.4 | - | - | - |
| 16 | `forcedColumn` | `core/engine/deduce.js` | ladder | 580.9 | 1.0 % | 484.5 | 96.4 | - | - | - |
| 17 | `labelPockets` | `core/engine/deduce.js` | ladder | 564.5 | 1.0 % | 447.1 | 117.4 | - | - | - |
| 18 | `ruleR6` | `core/engine/deduce.js` | ladder | 468.4 | 0.8 % | 386.5 | 81.8 | - | - | - |
| 19 | `findNecks` | `core/engine/deduce.js` | ladder | 296.1 | 0.5 % | 233.2 | 62.9 | - | - | - |
| 20 | `colour` | `core/engine/deduce.js` | ladder | 252.0 | 0.5 % | 208.5 | 43.5 | - | - | - |
| 21 | `ruleR7` | `core/engine/deduce.js` | ladder | 147.3 | 0.3 % | 108.8 | 38.5 | - | - | - |
| 22 | `solveFirst` | `core/engine/tiling.js` | dlx | 123.3 | 0.2 % | - | - | - | 123.3 | - |
| 23 | `liveRowOf` | `core/engine/deduce.js` | ladder | 106.5 | 0.2 % | 82.2 | 24.3 | - | - | - |
| 24 | `ladder` | `core/engine/deduce.js` | ladder | 77.2 | 0.1 % | 56.7 | 20.5 | - | - | - |
| 25 | `post` | `node:inspector` | other | 76.9 | 0.1 % | - | - | - | - | 76.9 |
| 26 | `deselect` | `core/engine/dlx.js` | dlx | 49.6 | 0.1 % | - | - | - | 49.6 | - |
| 27 | `select` | `core/engine/dlx.js` | dlx | 49.5 | 0.1 % | - | - | - | 49.5 | - |
| 28 | `fewestColumn` | `core/engine/deduce.js` | control | 45.2 | 0.1 % | 38.7 | 6.4 | - | - | - |
| 29 | `branch` | `core/engine/deduce.js` | control | 43.2 | 0.1 % | 43.2 | - | - | - | - |
| 30 | `walk` | `core/engine/placements.js` | model | 40.6 | 0.1 % | - | - | 40.6 | - | - |

## 12x12-nightmare

### Phases (by stack ancestry)

| Phase | ms | Share |
|---|---|---|
| search | 79286.8 | 91.3 % |
| census | 3855.1 | 4.4 % |
| model | 124.4 | 0.1 % |
| dlx | 3475.4 | 4.0 % |
| other | 127.4 | 0.1 % |

The phase of a sample is the first marker among the frame and its ancestors: `census` (`runProbes`, `settleCensus`, `probe`, `replayLadder`), else `dlx` (`solveFirst`), else `model` (`buildModel`), else `search` (`measureDeduction`, `search`, `branch`), else `other` (scoring, the harness, `(program)`, GC). The ladder rules, `select` and `undo` are thus charged to the phase they ran in. Unplaced engine time (a `deduce.js` function that no marker could place, kept in `other`): 0.0 % of this cell's rating time; see the notes.

### Categories

| Category | ms | Share |
|---|---|---|
| ladder | 43350.3 | 49.9 % |
| state | 27125.8 | 31.2 % |
| control | 12675.4 | 14.6 % |
| model | 114.7 | 0.1 % |
| dlx | 3475.4 | 4.0 % |
| gc | 14.5 | 0.0 % |
| other | 113.1 | 0.1 % |

### Phase x category (ms, share of rating time)

| Phase | ladder | state | control | model | dlx | gc | other |
|---|---|---|---|---|---|---|---|
| search | 41445.1 (47.7 %) | 26129.4 (30.1 %) | 11712.3 (13.5 %) | - | - | - | - |
| census | 1895.6 (2.2 %) | 996.4 (1.1 %) | 963.2 (1.1 %) | - | - | - | - |
| model | - | - | - | 114.7 (0.1 %) | - | - | 9.8 (0.0 %) |
| dlx | - | - | - | - | 3475.4 (4.0 %) | - | - |
| other | 9.6 (0.0 %) | - | - | - | - | 14.5 (0.0 %) | 103.3 (0.1 %) |

### Top 30 functions by self time

| # | Function | File | Category | ms | Share | search ms | census ms | model ms | dlx ms | other ms |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `select` | `core/engine/deduce.js` | state | 15216.4 | 17.5 % | 14630.4 | 586.0 | - | - | - |
| 2 | `ruleR4` | `core/engine/deduce.js` | ladder | 14364.5 | 16.5 % | 13734.5 | 630.1 | - | - | - |
| 3 | `measureDeduction` | `core/engine/deduce.js` | control | 11572.1 | 13.3 % | 11572.1 | - | - | - | - |
| 4 | `neighbourCell` | `core/engine/deduce.js` | ladder | 6892.2 | 7.9 % | 6585.1 | 297.6 | - | - | 9.6 |
| 5 | `undo` | `core/engine/deduce.js` | state | 6115.6 | 7.0 % | 5890.3 | 225.3 | - | - | - |
| 6 | `kill` | `core/engine/deduce.js` | state | 5787.4 | 6.7 % | 5602.4 | 185.1 | - | - | - |
| 7 | `ruleR5` | `core/engine/deduce.js` | ladder | 5769.2 | 6.6 % | 5547.2 | 222.0 | - | - | - |
| 8 | `gather` | `core/engine/deduce.js` | ladder | 3910.9 | 4.5 % | 3744.2 | 166.8 | - | - | - |
| 9 | `ruleR8` | `core/engine/deduce.js` | ladder | 3486.3 | 4.0 % | 3341.4 | 144.8 | - | - | - |
| 10 | `reachable` | `core/engine/deduce.js` | ladder | 2454.9 | 2.8 % | 2299.5 | 155.4 | - | - | - |
| 11 | `ruleR9` | `core/engine/deduce.js` | ladder | 2200.5 | 2.5 % | 2126.5 | 74.0 | - | - | - |
| 12 | `uncover` | `core/engine/dlx.js` | dlx | 1791.6 | 2.1 % | - | - | - | 1791.6 | - |
| 13 | `cover` | `core/engine/dlx.js` | dlx | 1654.8 | 1.9 % | - | - | - | 1654.8 | - |
| 14 | `fillSums` | `core/engine/deduce.js` | ladder | 1009.8 | 1.2 % | 962.8 | 47.0 | - | - | - |
| 15 | `runProbes` | `core/engine/deduce.js` | control | 935.7 | 1.1 % | - | 935.7 | - | - | - |
| 16 | `ruleR3` | `core/engine/deduce.js` | ladder | 642.3 | 0.7 % | 614.9 | 27.4 | - | - | - |
| 17 | `labelPockets` | `core/engine/deduce.js` | ladder | 512.2 | 0.6 % | 499.3 | 12.9 | - | - | - |
| 18 | `queueCell` | `core/engine/deduce.js` | ladder | 478.9 | 0.6 % | 451.3 | 27.6 | - | - | - |
| 19 | `forcedColumn` | `core/engine/deduce.js` | ladder | 418.9 | 0.5 % | 402.7 | 16.2 | - | - | - |
| 20 | `ruleR6` | `core/engine/deduce.js` | ladder | 386.3 | 0.4 % | 370.2 | 16.1 | - | - | - |
| 21 | `findNecks` | `core/engine/deduce.js` | ladder | 246.0 | 0.3 % | 242.8 | 3.2 | - | - | - |
| 22 | `colour` | `core/engine/deduce.js` | ladder | 212.5 | 0.2 % | 199.6 | 12.9 | - | - | - |
| 23 | `ruleR7` | `core/engine/deduce.js` | ladder | 141.4 | 0.2 % | 136.6 | 4.8 | - | - | - |
| 24 | `liveRowOf` | `core/engine/deduce.js` | ladder | 95.5 | 0.1 % | 93.8 | 1.7 | - | - | - |
| 25 | `post` | `node:inspector` | other | 88.0 | 0.1 % | - | - | - | - | 88.0 |
| 26 | `ladder` | `core/engine/deduce.js` | ladder | 71.6 | 0.1 % | 39.5 | 32.1 | - | - | - |
| 27 | `walk` | `core/engine/placements.js` | model | 56.7 | 0.1 % | - | - | 56.7 | - | - |
| 28 | `listRows` | `core/engine/deduce.js` | control | 43.4 | 0.0 % | 40.2 | 3.2 | - | - | - |
| 29 | `fewestColumn` | `core/engine/deduce.js` | control | 40.3 | 0.0 % | 37.1 | 3.2 | - | - | - |
| 30 | `search` | `core/engine/deduce.js` | control | 32.3 | 0.0 % | 32.3 | - | - | - | - |

## Kernel share and the P7 sensitivity by profile class (hypothetical)

kernel = the `search` and `census` phases. A kernel s times faster in the same units divides rating time by 1 / (1 - k + k / s) (Derived, hypothetical: P7 is not prototyped). The needed speed-up for a factor F is k / (k - (1 - 1 / F)); it is "not reachable" when 1 / (1 - k) is at or below F. The factors 1.87 (the prototype, divided by 1.9 after P6 and eight workers give about 1.0) and 1.91 (today's 12x12 Nightmare, divided by 1.9) are the rating-time factors P7 would have to reach alone; 1.1, 1.3 and 1.8 are the report's P7 range and likely value.

### 10x10-nightmare: phase shares and kernel share

| Class | Ratings | Rating ms | search | census | model | dlx | other | k (kernel) | Max factor 1/(1-k) | Unplaced engine time |
|---|---|---|---|---|---|---|---|---|---|---|
| whole corpus | 55 | 55676.6 | 78.5 % | 17.8 % | 0.2 % | 3.3 % | 0.2 % | 96.3 % | x 27.11 | 0.0 % |
| call profiles, all | 19 | 26845.6 | 78.0 % | 17.9 % | 0.2 % | 3.8 % | 0.2 % | 95.9 % | x 24.29 | 0.0 % |
| call profiles, complete | 19 | 26845.6 | 78.0 % | 17.9 % | 0.2 % | 3.8 % | 0.2 % | 95.9 % | x 24.29 | 0.0 % |
| window subsets, all | 36 | 28831.0 | 78.9 % | 17.8 % | 0.2 % | 2.9 % | 0.2 % | 96.7 % | x 30.41 | 0.0 % |
| window subsets, complete | 34 | 23365.2 | 74.0 % | 21.9 % | 0.2 % | 3.6 % | 0.3 % | 96.0 % | x 24.81 | 0.0 % |
| window subsets, capped | 2 | 5465.8 | 99.9 % | 0.0 % | 0.1 % | 0.0 % | 0.1 % | 99.9 % | x 837.93 | 0.0 % |

### 10x10-nightmare: P7 sensitivity (hypothetical) and the kernel speed-up needed

| Class | kernel x 1.25 | kernel x 1.5 | kernel x 2 | kernel x 3 | needed for x 1.1 | needed for x 1.3 | needed for x 1.8 | needed for x 1.87 | needed for x 1.91 |
|---|---|---|---|---|---|---|---|---|---|
| whole corpus | x 1.24 | x 1.47 | x 1.93 | x 2.79 | x 1.10 | x 1.31 | x 1.86 | x 1.93 | x 1.98 |
| call profiles, all | x 1.24 | x 1.47 | x 1.92 | x 2.77 | x 1.10 | x 1.32 | x 1.86 | x 1.94 | x 1.99 |
| call profiles, complete | x 1.24 | x 1.47 | x 1.92 | x 2.77 | x 1.10 | x 1.32 | x 1.86 | x 1.94 | x 1.99 |
| window subsets, all | x 1.24 | x 1.48 | x 1.94 | x 2.81 | x 1.10 | x 1.31 | x 1.85 | x 1.93 | x 1.97 |
| window subsets, complete | x 1.24 | x 1.47 | x 1.92 | x 2.78 | x 1.10 | x 1.32 | x 1.86 | x 1.94 | x 1.99 |
| window subsets, capped | x 1.25 | x 1.50 | x 2.00 | x 2.99 | x 1.10 | x 1.30 | x 1.80 | x 1.87 | x 1.91 |

### 12x12-nightmare: phase shares and kernel share

| Class | Ratings | Rating ms | search | census | model | dlx | other | k (kernel) | Max factor 1/(1-k) | Unplaced engine time |
|---|---|---|---|---|---|---|---|---|---|---|
| whole corpus | 58 | 86869.2 | 91.3 % | 4.4 % | 0.1 % | 4.0 % | 0.1 % | 95.7 % | x 23.31 | 0.0 % |
| call profiles, all | 22 | 50212.9 | 94.7 % | 3.0 % | 0.1 % | 2.1 % | 0.1 % | 97.7 % | x 42.79 | 0.0 % |
| call profiles, complete | 6 | 13522.6 | 81.0 % | 11.0 % | 0.1 % | 7.8 % | 0.1 % | 92.0 % | x 12.44 | 0.0 % |
| call profiles, capped | 16 | 36690.3 | 99.8 % | 0.0 % | 0.1 % | 0.0 % | 0.1 % | 99.8 % | x 422.45 | 0.0 % |
| window subsets, all | 36 | 36656.4 | 86.6 % | 6.5 % | 0.2 % | 6.6 % | 0.2 % | 93.0 % | x 14.35 | 0.0 % |
| window subsets, complete | 31 | 23761.2 | 79.4 % | 10.0 % | 0.2 % | 10.2 % | 0.3 % | 89.4 % | x 9.39 | 0.0 % |
| window subsets, capped | 5 | 12895.2 | 99.8 % | 0.0 % | 0.1 % | 0.0 % | 0.1 % | 99.8 % | x 538.22 | 0.0 % |

### 12x12-nightmare: P7 sensitivity (hypothetical) and the kernel speed-up needed

| Class | kernel x 1.25 | kernel x 1.5 | kernel x 2 | kernel x 3 | needed for x 1.1 | needed for x 1.3 | needed for x 1.8 | needed for x 1.87 | needed for x 1.91 |
|---|---|---|---|---|---|---|---|---|---|
| whole corpus | x 1.24 | x 1.47 | x 1.92 | x 2.76 | x 1.10 | x 1.32 | x 1.87 | x 1.95 | x 1.99 |
| call profiles, all | x 1.24 | x 1.48 | x 1.95 | x 2.87 | x 1.10 | x 1.31 | x 1.83 | x 1.91 | x 1.95 |
| call profiles, complete | x 1.23 | x 1.44 | x 1.85 | x 2.58 | x 1.11 | x 1.33 | x 1.94 | x 2.02 | x 2.08 |
| call profiles, capped | x 1.25 | x 1.50 | x 2.00 | x 2.99 | x 1.10 | x 1.30 | x 1.80 | x 1.87 | x 1.91 |
| window subsets, all | x 1.23 | x 1.45 | x 1.87 | x 2.63 | x 1.11 | x 1.33 | x 1.92 | x 2.00 | x 2.05 |
| window subsets, complete | x 1.22 | x 1.42 | x 1.81 | x 2.47 | x 1.11 | x 1.35 | x 1.99 | x 2.09 | x 2.14 |
| window subsets, capped | x 1.25 | x 1.50 | x 2.00 | x 2.99 | x 1.10 | x 1.30 | x 1.80 | x 1.87 | x 1.91 |

## The DLX diagnostic beside IGP-04's P6 figures

The `dlx` phase is the time under `solveFirst`, the diagnostic that P6 skips during the search; it is a gross share of rating time. P6 saves it less one recomputed diagnostic per ok call (IGP-04 "net"), so its saving is a little below this share.

| Cell | Class | DLX share of rating time |
|---|---|---|
| 10x10-nightmare | whole corpus | 3.3 % |
| 10x10-nightmare | call profiles, all | 3.8 % |
| 10x10-nightmare | call profiles, complete | 3.8 % |
| 10x10-nightmare | window subsets, all | 2.9 % |
| 10x10-nightmare | window subsets, complete | 3.6 % |
| 10x10-nightmare | window subsets, capped | 0.0 % |
| 12x12-nightmare | whole corpus | 4.0 % |
| 12x12-nightmare | call profiles, all | 2.1 % |
| 12x12-nightmare | call profiles, complete | 7.8 % |
| 12x12-nightmare | call profiles, capped | 0.0 % |
| 12x12-nightmare | window subsets, all | 6.6 % |
| 12x12-nightmare | window subsets, complete | 10.2 % |
| 12x12-nightmare | window subsets, capped | 0.0 % |

IGP-04's P6 (share of rating ms saved, net, on today's search, A:B; 10 to 23 %): 26x26 Nightmare 22.8 %, 14x14 Master 15.4 %, 26x26 Master 9.9 %. On the prototype about 0 to 7 % (Derived in the IGP-04 review: E:F's twin-call rating ratio 0.86 divided by the eight-worker slowdown of B:C's twin calls, 0.80 to 0.92). 10x10 and 12x12 Nightmare are not IGP-04 cells; read the DLX share of the call profiles against today's figure and the complete window subsets against the prototype's.

## Checks

- Phases, categories, phase x category and functions each add up to the rating time within 1 % (largest difference over every aggregate 0.0 %).
- The host-side reduction (a top-down walk) of the 10 kept raw profiles (the first 5 of each cell, `raw-<index>.cpuprofile`) equals the worker's attribution.
- Every profiled rating equals its corpus rating (class, score, main and census work), ran in the supervised worker under the 30 s cut, and has a `started` and a `recorded` line.
- Profiling overhead: 12 ratings (every 10th of a cell, alternately before and after the profiled run) were also rated without the profiler: profiled 15882.8 ms against 15555.0 ms plain, ratio 1.021 (median of the pair ratios 1.037). The attributed time is 100.1 % of the ratings' wall time.
- Note: harness hash at the run's start 00f7f23bc0166707b51b69a3139f91c6293a4b471eee9b7387fbf111bcc89060, at the summary 9aa81ce5351ad12b066d05f5c21a1e8a896c1515565e3f2a66cf9acc4aeef3a5 (a report-only change).

## Notes

- The sampling profiler adds a little time (the ratio above) and attributes inlined functions to their callers; a share is a share of sampled self time, so a function inlined into `ladder` or `search` shows there.
- Categories: `ladder` (the rules, `colour`, `liveRowOf`, `overWork`), `state` (`select`, `kill`, `mark`, `undo` of `deduce.js`), `control` (the rest of `deduce.js`: `fewestColumn`, `listRows`, `branch`, `search`, `snapshot`, `keepPath`, `measureDeduction`, `result`, the census drivers and its helpers), `model` (`buildModel`, `placements.js`, `workspace.js` and the `ExactCover` constructor), `dlx` (the rest of `dlx.js` and `tiling.js`), `gc` (`(garbage collector)`, charged to phase `other`), `other`.
- The census includes the ladder and state work done inside it (stack ancestry, not flat self time). Repeated exact states inside a rating are not counted here (a later round).
- **Inlining and the markers.** The profiler does not report inlined frames, and V8 inlines `measureDeduction` into `measureV3` once the latter is hot: the search's `search` frames then hang directly under `measureV3`. Read literally, "an ancestor is `measureDeduction`" would charge that time to `other` (a dev run put 99.9 % of a capped rating and 20.8 % of a 10x10 corpus there). The marker set therefore also holds the recursion of the main search (`search`, `branch`; the census recurses through `probe`, a census marker) and, for the model and DLX phases, every function of the `model` and `dlx` categories (the files of the model build and of the diagnostic). The "Unplaced engine time" column is the time in a `deduce.js` function that no marker among its ancestors could place (for example a sample whose stack the profiler could not walk, or a census replay under an inlined `runProbes`); it stays in `other`, so the kernel share is a lower bound by that amount. Functions and categories are never affected (the innermost frame is always kept).
- **Function-level shares depend on V8's inlining.** An inlined callee's time is charged to its caller, and which functions are inlined changes with the JIT state: for example the `control` category (mostly the own time of `measureDeduction`) is 0.3 % of 10x10-nightmare and 14.6 % of 12x12-nightmare. Read the phase and category tables first when ranking P7's items, and the function table as a guide.
- Complete and capped ratings differ in kind: a capped rating stops at the work cap and has no census and no DLX diagnostic. The whole-corpus figures mix both; the class tables separate them.
