# Production-engine calibration landscape (2026-10-22)

Outcome: **blocked**. Calibration evidence only: it changes no limit, level band or qualification gate. An unmet measured-row criterion is a blocker pending optimisation or an explicitly approved baseline correction.

- Source commit: 785c0730d55e1fad5a0d1588a19c46ba6ef6396b+uncommitted-changes
- Source digest: e651b4730699e0cd8ae2c53c017df757e9d6f7e1ebbb2f2a159fc05599e0962a
- Seeds per cell: 20 (the acceptance sample is 20); Node workers: 4
- Coverage: 12 of 12 selected cells complete (105 cells in the full landscape; 93 NOT RUN) on 2 boards; 240 timed runs; 2962 diagnostic profile samples

## Denominators and conditional statistics

- Request in-band rate = runs with ten strictly distinct, validated, in-band puzzles / all non-interrupted runs of the cell.
- T10 percentiles are conditional on those complete runs; `max T10` uses the response time of runs that never reached ten.
- Sampled-profile in-band rate = diagnostic samples in the level band / all samples (every sample, accepted or not).
- Profile latency is an RPC round trip of the canonical rating task, not worker CPU time.
- Reference numbers are historical prototype measurements or forecasts (n/m); forecasts are not timing bounds.

## Cells

| Cell | Area | Runs | Request in-band | T10 med* | T10 p95* | Max T10 | K obs | Policy K | Sampled in-band | Saturated | Criterion 1 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 6x10-very-easy | 60 | 20/20 | 65% | 0.3 s | 0.6 s | 0.6 s | 6,7 | 6-7 | 34% | 0% | fail |
| 6x10-easy | 60 | 20/20 | 85% | 0.4 s | 0.7 s | 0.7 s | 7,8 | 7-8 | 16% | 0% | fail |
| 6x10-normal | 60 | 20/20 | 95% | 0.3 s | 0.5 s | 0.5 s | 8,9 | 8-9 | 13% | 0% | pass |
| 6x10-hard | 60 | 20/20 | 100% | 0.7 s | 2.7 s | 3.1 s | 9,10,11 | 9-11 | 19% | 0% | pass |
| 6x10-expert | 60 | 20/20 | 100% | 0.6 s | 0.8 s | 0.8 s | 11,12 | 11-12 | 26% | 1% | pass |
| 6x10-master | 60 | 20/20 | 100% | 0.4 s | 0.8 s | 0.8 s | 12,13 | 12-13 | 26% | 0% | pass |
| 10x10-easy | 100 | 20/20 | 100% | 0.4 s | 0.5 s | 0.6 s | 8,9 | 8-9 | 20% | 0% | pass |
| 10x10-normal | 100 | 20/20 | 95% | 0.4 s | 0.5 s | 0.8 s | 9,10,11 | 9-11 | 14% | 0% | pass |
| 10x10-hard | 100 | 20/20 | 100% | 0.3 s | 0.6 s | 0.9 s | 11,12 | 11-12 | 16% | 2% | pass |
| 10x10-expert | 100 | 20/20 | 95% | 0.4 s | 0.8 s | 1.0 s | 12,13,14 | 12-14 | 26% | 8% | pass |
| 10x10-master | 100 | 20/20 | 100% | 0.8 s | 3.6 s | 5.5 s | 14,15,16 | 14-16 | 20% | 19% | pass |
| 10x10-nightmare | 100 | 20/20 | 100% | 1.0 s | 3.8 s | 5.5 s | 17,18,19,20 | 17-20 | 37% | 23% | pass |

## Reference rows (criteria 2 and 3)

| Row | Boards | Node ref max | 2x bound | Max T10 now | Status | Policy K vs table | Note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| very-easy 30-80 | 6x10 | 0.2 s (measured) | 0.4 s | 0.6 s | fail | 5-7 (agrees) |  |
| very-easy 81-87 | n/m | 0.3 s (forecast) | n/a | n/a | forecast-only | 7-7 (agrees) | n/m forecast: not a timing acceptance bound |
| easy 32-80 | 6x10 | 0.1 s (measured) | 0.2 s | 0.7 s | fail | 6-9 (agrees) |  |
| easy 81-130 | 10x10 | 0.3 s (measured) | 0.6 s | 0.6 s | pass | 7-10 (agrees) |  |
| easy 131-200 | 12x12 | 0.3 s (measured) | 0.6 s | n/a | not-run | 9-11 (agrees) |  |
| easy 201-215 | n/m | 0.7 s (forecast) | n/a | n/a | forecast-only | 11-11 (agrees) | n/m forecast: not a timing acceptance bound |
| normal 36-80 | 6x10 | 2.6 s (measured) | 5.2 s | 0.5 s | pass | 7-10 (agrees) |  |
| normal 81-130 | 10x10 | 0.8 s (measured) | 1.6 s | 0.8 s | pass | 8-11 (agrees) |  |
| normal 131-200 | 12x12 | 0.9 s (measured) | 1.8 s | n/a | not-run | 10-13 (agrees) |  |
| normal 201-300 | 16x16 | 0.7 s (measured) | 1.4 s | n/a | not-run | 11-14 (agrees) |  |
| normal 301-348 | 18x18 | 0.7 s (measured) | 1.4 s | n/a | not-run | 14-15 (agrees) |  |
| hard 41-80 | 6x10 | 2.4 s (measured) | 4.8 s | 3.1 s | pass | 8-12 (agrees) |  |
| hard 81-130 | 10x10 | 1 s (measured) | 2.0 s | 0.9 s | pass | 10-13 (agrees) |  |
| hard 131-200 | 12x12 | 1.6 s (measured) | 3.2 s | n/a | not-run | 12-15 (agrees) |  |
| hard 201-300 | n/m | 0.7 s (forecast) | n/a | n/a | forecast-only | 13-17 (agrees) | n/m forecast: not a timing acceptance bound |
| hard 301-420 | 18x20 | 1.8 s (measured) | 3.6 s | n/a | not-run | 15-18 (agrees) |  |
| hard 421-484 | 22x22 | 1.2 s (measured) | 2.4 s | n/a | not-run | 16-19 (agrees) |  |
| hard 485-576 | n/m | 4.7 s (forecast) | n/a | n/a | forecast-only | 17-20 (agrees) | n/m forecast: not a timing acceptance bound |
| hard 577-676 | 26x26 | 4.7 s (measured) | 9.4 s | n/a | not-run | 19-21 (agrees) |  |
| expert 50-80 | 6x10 | 1.1 s (measured) | 2.2 s | 0.8 s | pass | 10-13 (agrees) |  |
| expert 81-130 | 10x10 | 15.1 s (measured) | 30.2 s | 1.0 s | pass | 12-15 (agrees) | flat-carved LNS-heavy outlier (dagger in the design table); macro carving replaces this regime |
| expert 131-200 | 14x14 | 2.8 s (measured) | 5.6 s | n/a | not-run | 13-17 (agrees) |  |
| expert 201-300 | n/m | 0.7 s (forecast) | n/a | n/a | forecast-only | 15-19 (agrees) | n/m forecast: not a timing acceptance bound |
| expert 301-420 | n/m | 1.8 s (forecast) | n/a | n/a | forecast-only | 17-21 (agrees) | n/m forecast: not a timing acceptance bound |
| expert 421-484 | n/m | 1.2 s (forecast) | n/a | n/a | forecast-only | 19-22 (agrees) | n/m forecast: not a timing acceptance bound |
| expert 485-576 | n/m | 4.7 s (forecast) | n/a | n/a | forecast-only | 19-23 (agrees) | n/m forecast: not a timing acceptance bound |
| expert 577-676 | 26x26 | 1.2 s (measured) | 2.4 s | n/a | not-run | 20-24 (agrees) | reference measured with K = 28, outside the current count policy (K 20-24); needs a reviewed new baseline |
| master 59-80 | 6x10 | 0.9 s (measured) | 1.8 s | 0.8 s | pass | 12-15 (agrees) |  |
| master 81-130 | 10x10 | 4 s (measured) | 8.0 s | 5.5 s | pass | 13-17 (agrees) |  |
| master 131-200 | 12x12 | 3.6 s (measured) | 7.2 s | n/a | not-run | 15-19 (agrees) |  |
| master 201-300 | 16x16 | 4.7 s (measured) | 9.4 s | n/a | not-run | 17-22 (agrees) |  |
| master 301-420 | 18x20 | 9.3 s (measured) | 18.6 s | n/a | not-run | 19-24 (agrees) |  |
| master 421-484 | 22x22 | 1.4 s (measured) | 2.8 s | n/a | not-run | 21-25 (agrees) |  |
| master 485-576 | n/m | 3.1 s (forecast) | n/a | n/a | forecast-only | 22-26 (agrees) | n/m forecast: not a timing acceptance bound |
| master 577-676 | 26x26 | 3.1 s (measured) | 6.2 s | n/a | not-run | 23-27 (agrees) |  |
| nightmare 81-130 | 10x10 | 2.5 s (measured) | 5.0 s | 5.5 s | fail | 16-21 (agrees) |  |
| nightmare 131-200 | 12x12 | 29.8 s (measured) | 59.6 s | n/a | not-run | 19-24 (agrees) | flat-carved LNS-heavy outlier (dagger in the design table); macro carving replaces this regime |
| nightmare 201-300 | 16x16 | 11.2 s (measured) | 22.4 s | n/a | not-run | 21-27 (agrees) |  |
| nightmare 301-420 | 18x20 | 10.2 s (measured) | 20.4 s | n/a | not-run | 24-29 (agrees) |  |
| nightmare 421-484 | n/m | 10 s (forecast) | n/a | n/a | forecast-only | 26-30 (agrees) | n/m forecast: not a timing acceptance bound |
| nightmare 485-576 | n/m | 10 s (forecast) | n/a | n/a | forecast-only | 27-32 (agrees) | n/m forecast: not a timing acceptance bound |
| nightmare 577-676 | n/m | 10 s (forecast) | n/a | n/a | forecast-only | 28-33 (agrees) | n/m forecast: not a timing acceptance bound |
| hell-1 164-200 | 14x14 | 8.3 s (measured) | 16.6 s | n/a | not-run | 30-36 (agrees) |  |
| hell-1 201-300 | 16x16 | 17.9 s (measured) | 35.8 s | n/a | not-run | 32-40 (agrees) |  |
| hell-1 301-420 | 18x18 | 12 s (measured) | 24.0 s | n/a | not-run | 35-42 (agrees) | K = 41 replay: 7.6 s |
| hell-1 421-484 | 22x22 | 28.1 s (measured) | 56.2 s | n/a | not-run | 39-42 (agrees) | K = 41 replay: 18.9 s |
| hell-1 485-576 | 24x24 | 38.4 s (measured) | 76.8 s | n/a | not-run | 39-42 (agrees) |  |
| hell-1 577-676 | 26x26 | 48.6 s (measured) | 97.2 s | n/a | not-run | 39-42 (agrees) | historical maximum from one seed |
| hell-2 266-300 | n/m | 11 s (forecast) | n/a | n/a | forecast-only | 46-53 (agrees) | n/m forecast: not a timing acceptance bound |
| hell-2 301-420 | 20x20 | 13.7 s (measured) | 27.4 s | n/a | not-run | 47-58 (agrees) |  |
| hell-2 421-484 | 22x22 | 8.3 s (measured) | 16.6 s | n/a | not-run | 52-61 (agrees) |  |
| hell-2 485-576 | 24x24 | 15.2 s (measured) | 30.4 s | n/a | not-run | 54-62 (agrees) |  |
| hell-2 577-676 | 26x26 | 25.6 s (measured) | 51.2 s | n/a | not-run | 57-62 (agrees) |  |
| hell-3 450-484 | 22x22, 32x15 | 15.9 s (measured) | 31.8 s | n/a | not-run | 71-80 (agrees) | the original also measured 40x12, excluded by the 32-cell side limit and not part of this matrix |
| hell-3 485-576 | 24x24 | 23.6 s (measured) | 47.2 s | n/a | not-run | 73-86 (agrees) |  |
| hell-3 577-676 | 26x26 | 11.5 s (measured) | 23.0 s | n/a | not-run | 76-90 (agrees) |  |

## Score distributions of diagnostic profiles

| Group | Key | n | min | median | p95 | max | in band | saturated |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| U | 2 | 476 | 4 | 4 | 6 | 10 | 9% | 0% |
| U | 3 | 260 | 6 | 6 | 11 | 13 | 15% | 0% |
| U | 4 | 352 | 8 | 10 | 15 | 17 | 19% | 0% |
| U | 5 | 362 | 10 | 15 | 20 | 24 | 16% | 0% |
| U | 6 | 246 | 12 | 19 | 25 | 28 | 11% | 0% |
| U | 7 | 310 | 14 | 24 | 31 | 36 | 23% | 0% |
| U | 8 | 248 | 16 | 28 | 37 | 42 | 28% | 0% |
| U | 9 | 138 | 18 | 33 | 45 | 47 | 34% | 0% |
| U | 10 | 158 | 25 | 40 | 49 | 50 | 27% | 3% |
| U | 11 | 110 | 30 | 43 | 52 | 52 | 37% | 5% |
| U | 12 | 70 | 31 | 50 | 54 | 54 | 50% | 23% |
| U | 13 | 56 | 37 | 56 | 56 | 56 | 20% | 68% |
| U | 14 | 40 | 46 | 58 | 58 | 58 | 43% | 63% |
| U | 15 | 42 | 44 | 60 | 60 | 60 | 45% | 57% |
| U | 16 | 30 | 47 | 62 | 62 | 62 | 93% | 63% |
| U | 17 | 30 | 51 | 62 | 64 | 64 | 93% | 47% |
| U | 18 | 24 | 53 | 64.5 | 66 | 66 | 100% | 46% |
| U | 19 | 10 | 55 | 66.5 | 68 | 68 | 100% | 50% |
| area | 60 | 1362 | 4 | 16 | 42 | 52 | 22% | 0% |
| area | 100 | 1600 | 4 | 21 | 60 | 68 | 23% | 10% |

## Blockers

- 6x10-very-easy: 13 of 20 recorded requests completed ten in-band puzzles (65%); 90% of at least 20 cannot be reached
- 6x10-easy: 17 of 20 recorded requests completed ten in-band puzzles (85%); 90% of at least 20 cannot be reached
- reference very-easy 30-80: maximum Node T10 561.9158 ms exceeds 2 x 0.2 s
- reference easy 32-80: maximum Node T10 676.9651 ms exceeds 2 x 0.1 s
- reference nightmare 81-130: maximum Node T10 5483.5719 ms exceeds 2 x 2.5 s

## Incomplete cells (not run, not selected, or below the requested seeds)

3x29-very-easy, 3x29-easy, 3x29-normal, 3x29-hard, 3x29-expert, 3x29-master, 3x29-nightmare, 12x12-easy, 12x12-normal, 12x12-hard, 12x12-expert, 12x12-master, 12x12-nightmare, 14x14-easy, 14x14-normal, 14x14-hard, 14x14-expert, 14x14-master, 14x14-nightmare, 14x14-hell-1, 15x15b10-easy, 15x15b10-normal, 15x15b10-hard, 15x15b10-expert, 15x15b10-master, 15x15b10-nightmare, 15x15b10-hell-1, 16x16-normal, 16x16-hard, 16x16-expert, 16x16-master, 16x16-nightmare, 16x16-hell-1, 15x20-normal, 15x20-hard, 15x20-expert, 15x20-master, 15x20-nightmare, 15x20-hell-1, 15x20-hell-2, 18x18-normal, 18x18-hard, 18x18-expert, 18x18-master, 18x18-nightmare, 18x18-hell-1, 18x18-hell-2, 18x20-hard, 18x20-expert, 18x20-master, 18x20-nightmare, 18x20-hell-1, 18x20-hell-2, 20x20-hard, 20x20-expert, 20x20-master, 20x20-nightmare, 20x20-hell-1, 20x20-hell-2, 20x21-hard, 20x21-expert, 20x21-master, 20x21-nightmare, 20x21-hell-1, 20x21-hell-2, 32x15-hard, 32x15-expert, 32x15-master, 32x15-nightmare, 32x15-hell-1, 32x15-hell-2, 32x15-hell-3, 22x22-hard, 22x22-expert, 22x22-master, 22x22-nightmare, 22x22-hell-1, 22x22-hell-2, 22x22-hell-3, 24x24-hard, 24x24-expert, 24x24-master, 24x24-nightmare, 24x24-hell-1, 24x24-hell-2, 24x24-hell-3, 26x26-hard, 26x26-expert, 26x26-master, 26x26-nightmare, 26x26-hell-1, 26x26-hell-2, 26x26-hell-3

# Benchmark report: landscape (node)

Node screening evidence only. It never replaces browser measurements and enables no BQ limit.

| Field | Value |
| --- | --- |
| Source commit | 785c0730d55e1fad5a0d1588a19c46ba6ef6396b+uncommitted-changes |
| Source digest | e651b4730699e0cd8ae2c53c017df757e9d6f7e1ebbb2f2a159fc05599e0962a |
| Versions | {"algo":"gen-v2","policy":"mixed-v2","rng":"xoshiro128ss-v1","model":"difficulty-v2","app":"1.0.0"} |
| Platform | win32 10.0.26300 x64 / node v24.21.0 |
| Workers | 4 |
| Pool lifecycle | cold |
| Started | 2026-10-22T14:50:24.973Z |
| Finished | 2026-10-22T14:54:56.301Z |
| Rows recorded / requested | 240 / 240 |
| Hardware | {"cpu":"AMD EPYC 7763 64-Core Processor                ","logicalCores":16,"totalMemoryBytes":68665831424,"node":"v24.21.0","execArgv":["--max-old-space-size=2048"]} |

## Reading guide

- Rates use every ordinary run of the cell as denominator; interrupted runs are counted separately and excluded.
- T1 = click to validated piece set plus calibration puzzle. T10 = click to the tenth accepted puzzle, including set carving, pool start-up and the immediate New Puzzles (10).
- T10 median/p95/max are CONDITIONAL: they use only runs that completed ten puzzles (n shown); read them with the completion rates.
- Median = middle value (mean of the two middle values when even); p95 = nearest rank ceil(0.95 n); empty samples show n/a.
- Lazy certificates do not delay T10; their settling time is separate. Cancel and watchdog probes are separate rows.
- "not-measured" means the evidence is missing; it never counts as a pass.

## Cells

| Case | Runs | 10 of 10 | >= 1 | T1 median | T10 median* | T10 p95* | T10 max* | Max response | Peak process | Peak accounted | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 6x10-very-easy | 20/20 | 13/20 (65.0%) | 20/20 (100.0%) | 113 ms | 304 ms | 562 ms | 562 ms | 578 ms | 194.5 MiB | 1.8 MiB | fail |
| 6x10-easy | 20/20 | 17/20 (85.0%) | 20/20 (100.0%) | 132 ms | 360 ms | 677 ms | 677 ms | 709 ms | 200.1 MiB | 1.8 MiB | fail |
| 6x10-normal | 20/20 | 19/20 (95.0%) | 20/20 (100.0%) | 118 ms | 328 ms | 493 ms | 493 ms | 514 ms | 193.9 MiB | 2.0 MiB | node-screening-only |
| 6x10-hard | 20/20 | 20/20 (100.0%) | 20/20 (100.0%) | 122 ms | 729 ms | 2667 ms | 3095 ms | 3108 ms | 188.1 MiB | 2.3 MiB | node-screening-only |
| 6x10-expert | 20/20 | 20/20 (100.0%) | 20/20 (100.0%) | 121 ms | 587 ms | 755 ms | 841 ms | 853 ms | 173.9 MiB | 2.3 MiB | node-screening-only |
| 6x10-master | 20/20 | 20/20 (100.0%) | 20/20 (100.0%) | 142 ms | 437 ms | 761 ms | 778 ms | 792 ms | 190.5 MiB | 2.7 MiB | node-screening-only |
| 10x10-easy | 20/20 | 20/20 (100.0%) | 20/20 (100.0%) | 123 ms | 367 ms | 501 ms | 558 ms | 586 ms | 225.0 MiB | 5.1 MiB | node-screening-only |
| 10x10-normal | 20/20 | 19/20 (95.0%) | 19/20 (95.0%) | 135 ms | 367 ms | 467 ms | 467 ms | 815 ms | 235.1 MiB | 5.0 MiB | fail |
| 10x10-hard | 20/20 | 20/20 (100.0%) | 20/20 (100.0%) | 131 ms | 344 ms | 645 ms | 932 ms | 941 ms | 213.6 MiB | 6.8 MiB | node-screening-only |
| 10x10-expert | 20/20 | 19/20 (95.0%) | 19/20 (95.0%) | 139 ms | 442 ms | 766 ms | 766 ms | 953 ms | 194.6 MiB | 6.5 MiB | fail |
| 10x10-master | 20/20 | 20/20 (100.0%) | 20/20 (100.0%) | 185 ms | 756 ms | 3588 ms | 5522 ms | 5539 ms | 203.1 MiB | 8.2 MiB | node-screening-only |
| 10x10-nightmare | 20/20 | 20/20 (100.0%) | 20/20 (100.0%) | 237 ms | 984 ms | 3809 ms | 5484 ms | 5500 ms | 186.6 MiB | 9.8 MiB | node-screening-only |

\* conditional on completed runs; n per cell: 6x10-very-easy 13, 6x10-easy 17, 6x10-normal 19, 6x10-hard 20, 6x10-expert 20, 6x10-master 20, 10x10-easy 20, 10x10-normal 19, 10x10-hard 20, 10x10-expert 19, 10x10-master 20, 10x10-nightmare 20


## Planning estimates (NOT measurements)

planning estimate (D39: 5 s + 4 x Node maximum); not a measurement; never enables a BQ flag

| Case | Node max T10 | Browser plan |
| --- | --- | --- |
| 6x10-very-easy | 562 ms | 7.2 s |
| 6x10-easy | 677 ms | 7.7 s |
| 6x10-normal | 493 ms | 7.0 s |
| 6x10-hard | 3095 ms | 17.4 s |
| 6x10-expert | 841 ms | 8.4 s |
| 6x10-master | 778 ms | 8.1 s |
| 10x10-easy | 558 ms | 7.2 s |
| 10x10-normal | 467 ms | 6.9 s |
| 10x10-hard | 932 ms | 8.7 s |
| 10x10-expert | 766 ms | 8.1 s |
| 10x10-master | 5522 ms | 27.1 s |
| 10x10-nightmare | 5484 ms | 26.9 s |

## Errors

- generation 10x10-normal seed landscape/10x10-normal/14: host/child-exit: the row process ended with code 3221225477 signal none
- generation 10x10-expert seed landscape/10x10-expert/11: host/child-exit: the row process ended with code 3221225477 signal none

Note: fresh process per row
