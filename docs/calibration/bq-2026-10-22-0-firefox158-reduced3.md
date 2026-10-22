# Benchmark report: BQ-0 (browser)

Browser measurement of one device. It qualifies nothing by itself: gates change only in qualification.js with a linked report.

| Field | Value |
| --- | --- |
| Source commit | 6e912637 |
| Source digest | e651b4730699e0cd8ae2c53c017df757e9d6f7e1ebbb2f2a159fc05599e0962a |
| Versions | {"algo":"gen-v2","policy":"mixed-v2","rng":"xoshiro128ss-v1","model":"difficulty-v2","app":"1.0.0"} |
| Platform | Win32 / Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:158.0) Gecko/20100101 Firefox/158.0 |
| Workers | 4 |
| Pool lifecycle | cold |
| Started | 2026-10-22T16:04:02.377Z |
| Finished | 2026-10-22T16:13:06.402Z |
| Rows recorded / requested | 172 / 172 |
| Hardware | {"userAgent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:158.0) Gecko/20100101 Firefox/158.0","logicalCores":16,"deviceMemoryGB":null,"crossOriginIsolated":false} |

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
| d22x22-hard | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 323 ms | 975 ms | 1018 ms | 1018 ms | 1041 ms | n/a | 34.0 MiB | fail |
| d22x22-expert | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 251 ms | 709 ms | 728 ms | 728 ms | 743 ms | n/a | 43.5 MiB | incomplete-evidence |
| d22x22-master | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 297 ms | 723 ms | 761 ms | 761 ms | 774 ms | n/a | 61.7 MiB | fail |
| d22x22-nightmare | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 450 ms | 2854 ms | 5249 ms | 5249 ms | 5261 ms | n/a | 93.3 MiB | fail |
| d22x22-hell-1 | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 2289 ms | 6411 ms | 9001 ms | 9001 ms | 9021 ms | n/a | 118.0 MiB | fail |
| d22x22-hell-2 | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 1107 ms | 4047 ms | 4224 ms | 4224 ms | 4238 ms | n/a | 153.8 MiB | incomplete-evidence |
| d22x22-hell-3 | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 6993 ms | 8308 ms | 8519 ms | 8519 ms | 8534 ms | n/a | 157.5 MiB | incomplete-evidence |
| d32x15-hard | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 274 ms | 669 ms | 738 ms | 738 ms | 754 ms | n/a | 33.4 MiB | fail |
| d32x15-expert | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 255 ms | 592 ms | 673 ms | 673 ms | 687 ms | n/a | 34.7 MiB | incomplete-evidence |
| d32x15-master | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 269 ms | 634 ms | 697 ms | 697 ms | 709 ms | n/a | 56.3 MiB | incomplete-evidence |
| d32x15-nightmare | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 458 ms | 2816 ms | 4999 ms | 4999 ms | 5023 ms | n/a | 89.1 MiB | fail |
| d32x15-hell-1 | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 1944 ms | 7118 ms | 7779 ms | 7779 ms | 7792 ms | n/a | 109.8 MiB | incomplete-evidence |
| d32x15-hell-2 | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 1164 ms | 3737 ms | 3886 ms | 3886 ms | 3903 ms | n/a | 145.1 MiB | incomplete-evidence |
| d32x15-hell-3 | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 8381 ms | 13.7 s | 21.4 s | 21.4 s | 21.4 s | n/a | 156.7 MiB | fail |
| dheart432-hard | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 276 ms | 698 ms | 998 ms | 998 ms | 1010 ms | n/a | 24.6 MiB | incomplete-evidence |
| dheart432-expert | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 253 ms | 779 ms | 1085 ms | 1085 ms | 1096 ms | n/a | 35.3 MiB | incomplete-evidence |
| dheart432-master | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 284 ms | 742 ms | 999 ms | 999 ms | 1007 ms | n/a | 46.5 MiB | incomplete-evidence |
| dheart432-nightmare | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 376 ms | 811 ms | 1144 ms | 1144 ms | 1156 ms | n/a | 62.6 MiB | incomplete-evidence |
| dheart432-hell-1 | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 1375 ms | 5120 ms | 5490 ms | 5490 ms | 5503 ms | n/a | 84.1 MiB | incomplete-evidence |
| dheart432-hell-2 | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 772 ms | 2543 ms | 2877 ms | 2877 ms | 2889 ms | n/a | 108.9 MiB | incomplete-evidence |
| dirr466-hard | 3/3 | 0/3 (0.0%) | 3/3 (100.0%) | 423 ms | n/a | n/a | n/a | 1126 ms | n/a | 26.2 MiB | fail |
| dirr466-expert | 3/3 | 2/3 (66.7%) | 3/3 (100.0%) | 292 ms | 1604 ms | 1690 ms | 1690 ms | 1699 ms | n/a | 36.1 MiB | fail |
| dirr466-master | 3/3 | 2/3 (66.7%) | 3/3 (100.0%) | 283 ms | 1244 ms | 1377 ms | 1377 ms | 1387 ms | n/a | 53.3 MiB | fail |
| dirr466-nightmare | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 639 ms | 9138 ms | 25.8 s | 25.8 s | 25.9 s | n/a | 80.8 MiB | fail |
| dirr466-hell-1 | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 1805 ms | 13.7 s | 29.3 s | 29.3 s | 29.3 s | n/a | 105.8 MiB | incomplete-evidence |
| dirr466-hell-2 | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 1246 ms | 3717 ms | 4194 ms | 4194 ms | 4207 ms | n/a | 131.9 MiB | incomplete-evidence |
| dirr466-hell-3 | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 7130 ms | 10.7 s | 11.7 s | 11.7 s | 11.7 s | n/a | 147.9 MiB | incomplete-evidence |
| d6x10-very-easy | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 214 ms | 414 ms | 438 ms | 438 ms | 440 ms | n/a | 1.7 MiB | incomplete-evidence |
| d6x10-easy | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 212 ms | 433 ms | 434 ms | 434 ms | 438 ms | n/a | 1.3 MiB | incomplete-evidence |
| d6x10-normal | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 212 ms | 405 ms | 438 ms | 438 ms | 441 ms | n/a | 1.8 MiB | incomplete-evidence |
| d6x10-hard | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 218 ms | 742 ms | 947 ms | 947 ms | 951 ms | n/a | 2.0 MiB | incomplete-evidence |
| d6x10-expert | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 237 ms | 623 ms | 913 ms | 913 ms | 917 ms | n/a | 2.5 MiB | incomplete-evidence |
| d6x10-master | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 237 ms | 459 ms | 483 ms | 483 ms | 488 ms | n/a | 2.7 MiB | incomplete-evidence |
| d12x12-easy | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 227 ms | 408 ms | 424 ms | 424 ms | 432 ms | n/a | 8.4 MiB | incomplete-evidence |
| d12x12-normal | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 229 ms | 404 ms | 501 ms | 501 ms | 510 ms | n/a | 7.0 MiB | incomplete-evidence |
| d12x12-hard | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 250 ms | 503 ms | 530 ms | 530 ms | 539 ms | n/a | 11.0 MiB | incomplete-evidence |
| d12x12-expert | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 238 ms | 534 ms | 588 ms | 588 ms | 594 ms | n/a | 14.1 MiB | incomplete-evidence |
| d12x12-master | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 308 ms | 1497 ms | 1990 ms | 1990 ms | 1996 ms | n/a | 14.1 MiB | incomplete-evidence |
| d12x12-nightmare | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 372 ms | 904 ms | 924 ms | 924 ms | 933 ms | n/a | 11.9 MiB | incomplete-evidence |
| p18x20-hard | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 270 ms | 552 ms | 726 ms | 726 ms | 739 ms | n/a | 23.3 MiB | incomplete-evidence |
| p18x20-nightmare | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 1910 ms | 3462 ms | 7847 ms | 7847 ms | 7864 ms | n/a | 52.7 MiB | fail |
| p18x20-hell-1 | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 1109 ms | 3502 ms | 3593 ms | 3593 ms | 3606 ms | n/a | 64.3 MiB | incomplete-evidence |
| p18x20-hell-2 | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 742 ms | 5011 ms | 5763 ms | 5763 ms | 5773 ms | n/a | 83.6 MiB | incomplete-evidence |

\* conditional on completed runs; n per cell: d22x22-hard 3, d22x22-expert 3, d22x22-master 3, d22x22-nightmare 3, d22x22-hell-1 3, d22x22-hell-2 3, d22x22-hell-3 3, d32x15-hard 3, d32x15-expert 3, d32x15-master 3, d32x15-nightmare 3, d32x15-hell-1 3, d32x15-hell-2 3, d32x15-hell-3 3, dheart432-hard 3, dheart432-expert 3, dheart432-master 3, dheart432-nightmare 3, dheart432-hell-1 3, dheart432-hell-2 3, dirr466-hard 0, dirr466-expert 2, dirr466-master 2, dirr466-nightmare 3, dirr466-hell-1 3, dirr466-hell-2 3, dirr466-hell-3 3, d6x10-very-easy 3, d6x10-easy 3, d6x10-normal 3, d6x10-hard 3, d6x10-expert 3, d6x10-master 3, d12x12-easy 3, d12x12-normal 3, d12x12-hard 3, d12x12-expert 3, d12x12-master 3, d12x12-nightmare 3, p18x20-hard 3, p18x20-nightmare 3, p18x20-hell-1 3, p18x20-hell-2 3

## Criteria checks

| Case | Check | Status | Value | Limit | Note |
| --- | --- | --- | --- | --- | --- |
| d22x22-hard | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d22x22-hard | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d22x22-hard | T10 median, conditional on complete runs | pass | 975 | <= 60000 ms | n = 3 |
| d22x22-hard | T10 p95 (nearest rank), conditional on complete runs | pass | 1018 | <= 115000 ms | n = 3 |
| d22x22-hard | Longest response of any ordinary run | pass | 1041 | <= 120000 ms |  |
| d22x22-hard | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| d22x22-hard | Accounted worker and main buffers within the design budgets | pass | 35628454 | <= 1254096896 bytes |  |
| d22x22-hard | No model-too-large error | pass | 0 | 0 |  |
| d22x22-hard | No main-thread task over 50 ms (rendering excluded) | fail | 81 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| d22x22-hard | Cancel settles quickly (separate probe, excluded from statistics) | pass | 6 | < 200 ms | 1 probe(s) |
| d22x22-expert | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d22x22-expert | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d22x22-expert | T10 median, conditional on complete runs | pass | 709 | <= 60000 ms | n = 3 |
| d22x22-expert | T10 p95 (nearest rank), conditional on complete runs | pass | 728 | <= 115000 ms | n = 3 |
| d22x22-expert | Longest response of any ordinary run | pass | 743 | <= 120000 ms |  |
| d22x22-expert | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| d22x22-expert | Accounted worker and main buffers within the design budgets | pass | 45611920 | <= 1254096896 bytes |  |
| d22x22-expert | No model-too-large error | pass | 0 | 0 |  |
| d22x22-expert | No main-thread task over 50 ms (rendering excluded) | pass | 49 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| d22x22-expert | Cancel settles quickly (separate probe, excluded from statistics) | pass | 4 | < 200 ms | 1 probe(s) |
| d22x22-master | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d22x22-master | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d22x22-master | T10 median, conditional on complete runs | pass | 723 | <= 60000 ms | n = 3 |
| d22x22-master | T10 p95 (nearest rank), conditional on complete runs | pass | 761 | <= 115000 ms | n = 3 |
| d22x22-master | Longest response of any ordinary run | pass | 774 | <= 120000 ms |  |
| d22x22-master | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| d22x22-master | Accounted worker and main buffers within the design budgets | pass | 64654357 | <= 1254096896 bytes |  |
| d22x22-master | No model-too-large error | pass | 0 | 0 |  |
| d22x22-master | No main-thread task over 50 ms (rendering excluded) | fail | 74 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| d22x22-master | Cancel settles quickly (separate probe, excluded from statistics) | pass | 4 | < 200 ms | 1 probe(s) |
| d22x22-nightmare | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d22x22-nightmare | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d22x22-nightmare | T10 median, conditional on complete runs | pass | 2854 | <= 60000 ms | n = 3 |
| d22x22-nightmare | T10 p95 (nearest rank), conditional on complete runs | pass | 5249 | <= 115000 ms | n = 3 |
| d22x22-nightmare | Longest response of any ordinary run | pass | 5261 | <= 120000 ms |  |
| d22x22-nightmare | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| d22x22-nightmare | Accounted worker and main buffers within the design budgets | pass | 97787305 | <= 1254096896 bytes |  |
| d22x22-nightmare | No model-too-large error | pass | 0 | 0 |  |
| d22x22-nightmare | No main-thread task over 50 ms (rendering excluded) | fail | 51 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| d22x22-nightmare | Cancel settles quickly (separate probe, excluded from statistics) | pass | 5 | < 200 ms | 1 probe(s) |
| d22x22-hell-1 | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d22x22-hell-1 | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d22x22-hell-1 | T10 median, conditional on complete runs | pass | 6411 | <= 60000 ms | n = 3 |
| d22x22-hell-1 | T10 p95 (nearest rank), conditional on complete runs | pass | 9001 | <= 115000 ms | n = 3 |
| d22x22-hell-1 | Longest response of any ordinary run | pass | 9021 | <= 120000 ms |  |
| d22x22-hell-1 | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| d22x22-hell-1 | Accounted worker and main buffers within the design budgets | pass | 123719386 | <= 1254096896 bytes |  |
| d22x22-hell-1 | No model-too-large error | pass | 0 | 0 |  |
| d22x22-hell-1 | No main-thread task over 50 ms (rendering excluded) | fail | 70 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| d22x22-hell-1 | Cancel settles quickly (separate probe, excluded from statistics) | pass | 4 | < 200 ms | 1 probe(s) |
| d22x22-hell-2 | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d22x22-hell-2 | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d22x22-hell-2 | T10 median, conditional on complete runs | pass | 4047 | <= 60000 ms | n = 3 |
| d22x22-hell-2 | T10 p95 (nearest rank), conditional on complete runs | pass | 4224 | <= 115000 ms | n = 3 |
| d22x22-hell-2 | Longest response of any ordinary run | pass | 4238 | <= 120000 ms |  |
| d22x22-hell-2 | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| d22x22-hell-2 | Accounted worker and main buffers within the design budgets | pass | 161299023 | <= 1254096896 bytes |  |
| d22x22-hell-2 | No model-too-large error | pass | 0 | 0 |  |
| d22x22-hell-2 | No main-thread task over 50 ms (rendering excluded) | pass | 44 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| d22x22-hell-2 | Cancel settles quickly (separate probe, excluded from statistics) | pass | 4 | < 200 ms | 1 probe(s) |
| d22x22-hell-3 | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d22x22-hell-3 | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d22x22-hell-3 | T10 median, conditional on complete runs | pass | 8308 | <= 60000 ms | n = 3 |
| d22x22-hell-3 | T10 p95 (nearest rank), conditional on complete runs | pass | 8519 | <= 115000 ms | n = 3 |
| d22x22-hell-3 | Longest response of any ordinary run | pass | 8534 | <= 120000 ms |  |
| d22x22-hell-3 | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| d22x22-hell-3 | Accounted worker and main buffers within the design budgets | pass | 165124042 | <= 1254096896 bytes |  |
| d22x22-hell-3 | No model-too-large error | pass | 0 | 0 |  |
| d22x22-hell-3 | No main-thread task over 50 ms (rendering excluded) | pass | 36 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| d22x22-hell-3 | Cancel settles quickly (separate probe, excluded from statistics) | pass | 5 | < 200 ms | 1 probe(s) |
| d32x15-hard | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d32x15-hard | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d32x15-hard | T10 median, conditional on complete runs | pass | 669 | <= 60000 ms | n = 3 |
| d32x15-hard | T10 p95 (nearest rank), conditional on complete runs | pass | 738 | <= 115000 ms | n = 3 |
| d32x15-hard | Longest response of any ordinary run | pass | 754 | <= 120000 ms |  |
| d32x15-hard | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| d32x15-hard | Accounted worker and main buffers within the design budgets | pass | 34973444 | <= 1254096896 bytes |  |
| d32x15-hard | No model-too-large error | pass | 0 | 0 |  |
| d32x15-hard | No main-thread task over 50 ms (rendering excluded) | fail | 65 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| d32x15-hard | Cancel settles quickly (separate probe, excluded from statistics) | pass | 3 | < 200 ms | 1 probe(s) |
| d32x15-expert | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d32x15-expert | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d32x15-expert | T10 median, conditional on complete runs | pass | 592 | <= 60000 ms | n = 3 |
| d32x15-expert | T10 p95 (nearest rank), conditional on complete runs | pass | 673 | <= 115000 ms | n = 3 |
| d32x15-expert | Longest response of any ordinary run | pass | 687 | <= 120000 ms |  |
| d32x15-expert | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| d32x15-expert | Accounted worker and main buffers within the design budgets | pass | 36382407 | <= 1254096896 bytes |  |
| d32x15-expert | No model-too-large error | pass | 0 | 0 |  |
| d32x15-expert | No main-thread task over 50 ms (rendering excluded) | pass | 45 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| d32x15-expert | Cancel settles quickly (separate probe, excluded from statistics) | pass | 4 | < 200 ms | 1 probe(s) |
| d32x15-master | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d32x15-master | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d32x15-master | T10 median, conditional on complete runs | pass | 634 | <= 60000 ms | n = 3 |
| d32x15-master | T10 p95 (nearest rank), conditional on complete runs | pass | 697 | <= 115000 ms | n = 3 |
| d32x15-master | Longest response of any ordinary run | pass | 709 | <= 120000 ms |  |
| d32x15-master | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| d32x15-master | Accounted worker and main buffers within the design budgets | pass | 59040189 | <= 1254096896 bytes |  |
| d32x15-master | No model-too-large error | pass | 0 | 0 |  |
| d32x15-master | No main-thread task over 50 ms (rendering excluded) | pass | 31 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| d32x15-master | Cancel settles quickly (separate probe, excluded from statistics) | pass | 4 | < 200 ms | 1 probe(s) |
| d32x15-nightmare | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d32x15-nightmare | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d32x15-nightmare | T10 median, conditional on complete runs | pass | 2816 | <= 60000 ms | n = 3 |
| d32x15-nightmare | T10 p95 (nearest rank), conditional on complete runs | pass | 4999 | <= 115000 ms | n = 3 |
| d32x15-nightmare | Longest response of any ordinary run | pass | 5023 | <= 120000 ms |  |
| d32x15-nightmare | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| d32x15-nightmare | Accounted worker and main buffers within the design budgets | pass | 93409537 | <= 1254096896 bytes |  |
| d32x15-nightmare | No model-too-large error | pass | 0 | 0 |  |
| d32x15-nightmare | No main-thread task over 50 ms (rendering excluded) | fail | 79 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| d32x15-nightmare | Cancel settles quickly (separate probe, excluded from statistics) | pass | 3 | < 200 ms | 1 probe(s) |
| d32x15-hell-1 | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d32x15-hell-1 | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d32x15-hell-1 | T10 median, conditional on complete runs | pass | 7118 | <= 60000 ms | n = 3 |
| d32x15-hell-1 | T10 p95 (nearest rank), conditional on complete runs | pass | 7779 | <= 115000 ms | n = 3 |
| d32x15-hell-1 | Longest response of any ordinary run | pass | 7792 | <= 120000 ms |  |
| d32x15-hell-1 | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| d32x15-hell-1 | Accounted worker and main buffers within the design budgets | pass | 115127504 | <= 1254096896 bytes |  |
| d32x15-hell-1 | No model-too-large error | pass | 0 | 0 |  |
| d32x15-hell-1 | No main-thread task over 50 ms (rendering excluded) | pass | 30 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| d32x15-hell-1 | Cancel settles quickly (separate probe, excluded from statistics) | pass | 5 | < 200 ms | 1 probe(s) |
| d32x15-hell-2 | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d32x15-hell-2 | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d32x15-hell-2 | T10 median, conditional on complete runs | pass | 3737 | <= 60000 ms | n = 3 |
| d32x15-hell-2 | T10 p95 (nearest rank), conditional on complete runs | pass | 3886 | <= 115000 ms | n = 3 |
| d32x15-hell-2 | Longest response of any ordinary run | pass | 3903 | <= 120000 ms |  |
| d32x15-hell-2 | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| d32x15-hell-2 | Accounted worker and main buffers within the design budgets | pass | 152200392 | <= 1254096896 bytes |  |
| d32x15-hell-2 | No model-too-large error | pass | 0 | 0 |  |
| d32x15-hell-2 | No main-thread task over 50 ms (rendering excluded) | pass | 29 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| d32x15-hell-2 | Cancel settles quickly (separate probe, excluded from statistics) | pass | 5 | < 200 ms | 1 probe(s) |
| d32x15-hell-3 | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d32x15-hell-3 | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d32x15-hell-3 | T10 median, conditional on complete runs | pass | 13692 | <= 60000 ms | n = 3 |
| d32x15-hell-3 | T10 p95 (nearest rank), conditional on complete runs | pass | 21421 | <= 115000 ms | n = 3 |
| d32x15-hell-3 | Longest response of any ordinary run | pass | 21434 | <= 120000 ms |  |
| d32x15-hell-3 | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| d32x15-hell-3 | Accounted worker and main buffers within the design budgets | pass | 164291633 | <= 1254096896 bytes |  |
| d32x15-hell-3 | No model-too-large error | pass | 0 | 0 |  |
| d32x15-hell-3 | No main-thread task over 50 ms (rendering excluded) | fail | 57 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| d32x15-hell-3 | Cancel settles quickly (separate probe, excluded from statistics) | pass | 5 | < 200 ms | 1 probe(s) |
| dheart432-hard | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| dheart432-hard | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| dheart432-hard | T10 median, conditional on complete runs | pass | 698 | <= 60000 ms | n = 3 |
| dheart432-hard | T10 p95 (nearest rank), conditional on complete runs | pass | 998 | <= 115000 ms | n = 3 |
| dheart432-hard | Longest response of any ordinary run | pass | 1010 | <= 120000 ms |  |
| dheart432-hard | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| dheart432-hard | Accounted worker and main buffers within the design budgets | pass | 25758627 | <= 1254096896 bytes |  |
| dheart432-hard | No model-too-large error | pass | 0 | 0 |  |
| dheart432-hard | No main-thread task over 50 ms (rendering excluded) | pass | 31 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| dheart432-hard | Cancel settles quickly (separate probe, excluded from statistics) | pass | 3 | < 200 ms | 1 probe(s) |
| dheart432-expert | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| dheart432-expert | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| dheart432-expert | T10 median, conditional on complete runs | pass | 779 | <= 60000 ms | n = 3 |
| dheart432-expert | T10 p95 (nearest rank), conditional on complete runs | pass | 1085 | <= 115000 ms | n = 3 |
| dheart432-expert | Longest response of any ordinary run | pass | 1096 | <= 120000 ms |  |
| dheart432-expert | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| dheart432-expert | Accounted worker and main buffers within the design budgets | pass | 37066431 | <= 1254096896 bytes |  |
| dheart432-expert | No model-too-large error | pass | 0 | 0 |  |
| dheart432-expert | No main-thread task over 50 ms (rendering excluded) | pass | 35 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| dheart432-expert | Cancel settles quickly (separate probe, excluded from statistics) | pass | 3 | < 200 ms | 1 probe(s) |
| dheart432-master | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| dheart432-master | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| dheart432-master | T10 median, conditional on complete runs | pass | 742 | <= 60000 ms | n = 3 |
| dheart432-master | T10 p95 (nearest rank), conditional on complete runs | pass | 999 | <= 115000 ms | n = 3 |
| dheart432-master | Longest response of any ordinary run | pass | 1007 | <= 120000 ms |  |
| dheart432-master | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| dheart432-master | Accounted worker and main buffers within the design budgets | pass | 48773564 | <= 1254096896 bytes |  |
| dheart432-master | No model-too-large error | pass | 0 | 0 |  |
| dheart432-master | No main-thread task over 50 ms (rendering excluded) | pass | 42 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| dheart432-master | Cancel settles quickly (separate probe, excluded from statistics) | pass | 4 | < 200 ms | 1 probe(s) |
| dheart432-nightmare | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| dheart432-nightmare | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| dheart432-nightmare | T10 median, conditional on complete runs | pass | 811 | <= 60000 ms | n = 3 |
| dheart432-nightmare | T10 p95 (nearest rank), conditional on complete runs | pass | 1144 | <= 115000 ms | n = 3 |
| dheart432-nightmare | Longest response of any ordinary run | pass | 1156 | <= 120000 ms |  |
| dheart432-nightmare | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| dheart432-nightmare | Accounted worker and main buffers within the design budgets | pass | 65636280 | <= 1254096896 bytes |  |
| dheart432-nightmare | No model-too-large error | pass | 0 | 0 |  |
| dheart432-nightmare | No main-thread task over 50 ms (rendering excluded) | pass | 26 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| dheart432-nightmare | Cancel settles quickly (separate probe, excluded from statistics) | pass | 4 | < 200 ms | 1 probe(s) |
| dheart432-hell-1 | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| dheart432-hell-1 | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| dheart432-hell-1 | T10 median, conditional on complete runs | pass | 5120 | <= 60000 ms | n = 3 |
| dheart432-hell-1 | T10 p95 (nearest rank), conditional on complete runs | pass | 5490 | <= 115000 ms | n = 3 |
| dheart432-hell-1 | Longest response of any ordinary run | pass | 5503 | <= 120000 ms |  |
| dheart432-hell-1 | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| dheart432-hell-1 | Accounted worker and main buffers within the design budgets | pass | 88212755 | <= 1254096896 bytes |  |
| dheart432-hell-1 | No model-too-large error | pass | 0 | 0 |  |
| dheart432-hell-1 | No main-thread task over 50 ms (rendering excluded) | pass | 23 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| dheart432-hell-1 | Cancel settles quickly (separate probe, excluded from statistics) | pass | 3 | < 200 ms | 1 probe(s) |
| dheart432-hell-2 | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| dheart432-hell-2 | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| dheart432-hell-2 | T10 median, conditional on complete runs | pass | 2543 | <= 60000 ms | n = 3 |
| dheart432-hell-2 | T10 p95 (nearest rank), conditional on complete runs | pass | 2877 | <= 115000 ms | n = 3 |
| dheart432-hell-2 | Longest response of any ordinary run | pass | 2889 | <= 120000 ms |  |
| dheart432-hell-2 | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| dheart432-hell-2 | Accounted worker and main buffers within the design budgets | pass | 114200344 | <= 1254096896 bytes |  |
| dheart432-hell-2 | No model-too-large error | pass | 0 | 0 |  |
| dheart432-hell-2 | No main-thread task over 50 ms (rendering excluded) | pass | 43 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| dheart432-hell-2 | Cancel settles quickly (separate probe, excluded from statistics) | pass | 3 | < 200 ms | 1 probe(s) |
| dirr466-hard | Runs with 10 of 10 puzzles (all ordinary runs) | fail | 0 | >= 0.9 | 0 of 3 |
| dirr466-hard | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| dirr466-hard | T10 median, conditional on complete runs | not-measured | n/a | <= 60000 ms | n = 0 |
| dirr466-hard | T10 p95 (nearest rank), conditional on complete runs | not-measured | n/a | <= 115000 ms | n = 0 |
| dirr466-hard | Longest response of any ordinary run | pass | 1126 | <= 120000 ms |  |
| dirr466-hard | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| dirr466-hard | Accounted worker and main buffers within the design budgets | pass | 27452149 | <= 1254096896 bytes |  |
| dirr466-hard | No model-too-large error | pass | 0 | 0 |  |
| dirr466-hard | No main-thread task over 50 ms (rendering excluded) | pass | 10 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| dirr466-hard | Cancel settles quickly (separate probe, excluded from statistics) | pass | 3 | < 200 ms | 1 probe(s) |
| dirr466-expert | Runs with 10 of 10 puzzles (all ordinary runs) | fail | 0.667 | >= 0.9 | 2 of 3 |
| dirr466-expert | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| dirr466-expert | T10 median, conditional on complete runs | pass | 1604 | <= 60000 ms | n = 2 |
| dirr466-expert | T10 p95 (nearest rank), conditional on complete runs | pass | 1690 | <= 115000 ms | n = 2 |
| dirr466-expert | Longest response of any ordinary run | pass | 1699 | <= 120000 ms |  |
| dirr466-expert | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| dirr466-expert | Accounted worker and main buffers within the design budgets | pass | 37806635 | <= 1254096896 bytes |  |
| dirr466-expert | No model-too-large error | pass | 0 | 0 |  |
| dirr466-expert | No main-thread task over 50 ms (rendering excluded) | pass | 19 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| dirr466-expert | Cancel settles quickly (separate probe, excluded from statistics) | pass | 3 | < 200 ms | 1 probe(s) |
| dirr466-master | Runs with 10 of 10 puzzles (all ordinary runs) | fail | 0.667 | >= 0.9 | 2 of 3 |
| dirr466-master | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| dirr466-master | T10 median, conditional on complete runs | pass | 1244 | <= 60000 ms | n = 2 |
| dirr466-master | T10 p95 (nearest rank), conditional on complete runs | pass | 1377 | <= 115000 ms | n = 2 |
| dirr466-master | Longest response of any ordinary run | pass | 1387 | <= 120000 ms |  |
| dirr466-master | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| dirr466-master | Accounted worker and main buffers within the design budgets | pass | 55851960 | <= 1254096896 bytes |  |
| dirr466-master | No model-too-large error | pass | 0 | 0 |  |
| dirr466-master | No main-thread task over 50 ms (rendering excluded) | pass | 35 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| dirr466-master | Cancel settles quickly (separate probe, excluded from statistics) | pass | 4 | < 200 ms | 1 probe(s) |
| dirr466-nightmare | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| dirr466-nightmare | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| dirr466-nightmare | T10 median, conditional on complete runs | pass | 9138 | <= 60000 ms | n = 3 |
| dirr466-nightmare | T10 p95 (nearest rank), conditional on complete runs | pass | 25835 | <= 115000 ms | n = 3 |
| dirr466-nightmare | Longest response of any ordinary run | pass | 25850 | <= 120000 ms |  |
| dirr466-nightmare | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| dirr466-nightmare | Accounted worker and main buffers within the design budgets | pass | 84711186 | <= 1254096896 bytes |  |
| dirr466-nightmare | No model-too-large error | pass | 0 | 0 |  |
| dirr466-nightmare | No main-thread task over 50 ms (rendering excluded) | fail | 107 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| dirr466-nightmare | Cancel settles quickly (separate probe, excluded from statistics) | pass | 3 | < 200 ms | 1 probe(s) |
| dirr466-hell-1 | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| dirr466-hell-1 | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| dirr466-hell-1 | T10 median, conditional on complete runs | pass | 13708 | <= 60000 ms | n = 3 |
| dirr466-hell-1 | T10 p95 (nearest rank), conditional on complete runs | pass | 29271 | <= 115000 ms | n = 3 |
| dirr466-hell-1 | Longest response of any ordinary run | pass | 29291 | <= 120000 ms |  |
| dirr466-hell-1 | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| dirr466-hell-1 | Accounted worker and main buffers within the design budgets | pass | 110913201 | <= 1254096896 bytes |  |
| dirr466-hell-1 | No model-too-large error | pass | 0 | 0 |  |
| dirr466-hell-1 | No main-thread task over 50 ms (rendering excluded) | pass | 48 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| dirr466-hell-1 | Cancel settles quickly (separate probe, excluded from statistics) | pass | 4 | < 200 ms | 1 probe(s) |
| dirr466-hell-2 | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| dirr466-hell-2 | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| dirr466-hell-2 | T10 median, conditional on complete runs | pass | 3717 | <= 60000 ms | n = 3 |
| dirr466-hell-2 | T10 p95 (nearest rank), conditional on complete runs | pass | 4194 | <= 115000 ms | n = 3 |
| dirr466-hell-2 | Longest response of any ordinary run | pass | 4207 | <= 120000 ms |  |
| dirr466-hell-2 | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| dirr466-hell-2 | Accounted worker and main buffers within the design budgets | pass | 138334831 | <= 1254096896 bytes |  |
| dirr466-hell-2 | No model-too-large error | pass | 0 | 0 |  |
| dirr466-hell-2 | No main-thread task over 50 ms (rendering excluded) | pass | 21 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| dirr466-hell-2 | Cancel settles quickly (separate probe, excluded from statistics) | pass | 4 | < 200 ms | 1 probe(s) |
| dirr466-hell-3 | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| dirr466-hell-3 | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| dirr466-hell-3 | T10 median, conditional on complete runs | pass | 10698 | <= 60000 ms | n = 3 |
| dirr466-hell-3 | T10 p95 (nearest rank), conditional on complete runs | pass | 11715 | <= 115000 ms | n = 3 |
| dirr466-hell-3 | Longest response of any ordinary run | pass | 11736 | <= 120000 ms |  |
| dirr466-hell-3 | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| dirr466-hell-3 | Accounted worker and main buffers within the design budgets | pass | 155078709 | <= 1254096896 bytes |  |
| dirr466-hell-3 | No model-too-large error | pass | 0 | 0 |  |
| dirr466-hell-3 | No main-thread task over 50 ms (rendering excluded) | pass | 29 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| dirr466-hell-3 | Cancel settles quickly (separate probe, excluded from statistics) | pass | 5 | < 200 ms | 1 probe(s) |
| d6x10-very-easy | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d6x10-very-easy | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d6x10-very-easy | T10 median, conditional on complete runs | pass | 414 | <= 60000 ms | n = 3 |
| d6x10-very-easy | T10 p95 (nearest rank), conditional on complete runs | pass | 438 | <= 115000 ms | n = 3 |
| d6x10-very-easy | Longest response of any ordinary run | pass | 440 | <= 120000 ms |  |
| d6x10-very-easy | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| d6x10-very-easy | Accounted worker and main buffers within the design budgets | pass | 1776406 | <= 1254096896 bytes |  |
| d6x10-very-easy | No model-too-large error | pass | 0 | 0 |  |
| d6x10-very-easy | No main-thread task over 50 ms (rendering excluded) | pass | 12 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| d6x10-very-easy | Cancel settles quickly (separate probe, excluded from statistics) | pass | 2 | < 200 ms | 1 probe(s) |
| d6x10-easy | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d6x10-easy | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d6x10-easy | T10 median, conditional on complete runs | pass | 433 | <= 60000 ms | n = 3 |
| d6x10-easy | T10 p95 (nearest rank), conditional on complete runs | pass | 434 | <= 115000 ms | n = 3 |
| d6x10-easy | Longest response of any ordinary run | pass | 438 | <= 120000 ms |  |
| d6x10-easy | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| d6x10-easy | Accounted worker and main buffers within the design budgets | pass | 1390858 | <= 1254096896 bytes |  |
| d6x10-easy | No model-too-large error | pass | 0 | 0 |  |
| d6x10-easy | No main-thread task over 50 ms (rendering excluded) | pass | 13 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| d6x10-easy | Cancel settles quickly (separate probe, excluded from statistics) | pass | 1 | < 200 ms | 1 probe(s) |
| d6x10-normal | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d6x10-normal | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d6x10-normal | T10 median, conditional on complete runs | pass | 405 | <= 60000 ms | n = 3 |
| d6x10-normal | T10 p95 (nearest rank), conditional on complete runs | pass | 438 | <= 115000 ms | n = 3 |
| d6x10-normal | Longest response of any ordinary run | pass | 441 | <= 120000 ms |  |
| d6x10-normal | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| d6x10-normal | Accounted worker and main buffers within the design budgets | pass | 1846353 | <= 1254096896 bytes |  |
| d6x10-normal | No model-too-large error | pass | 0 | 0 |  |
| d6x10-normal | No main-thread task over 50 ms (rendering excluded) | pass | 14 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| d6x10-normal | Cancel settles quickly (separate probe, excluded from statistics) | pass | 1 | < 200 ms | 1 probe(s) |
| d6x10-hard | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d6x10-hard | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d6x10-hard | T10 median, conditional on complete runs | pass | 742 | <= 60000 ms | n = 3 |
| d6x10-hard | T10 p95 (nearest rank), conditional on complete runs | pass | 947 | <= 115000 ms | n = 3 |
| d6x10-hard | Longest response of any ordinary run | pass | 951 | <= 120000 ms |  |
| d6x10-hard | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| d6x10-hard | Accounted worker and main buffers within the design budgets | pass | 2047581 | <= 1254096896 bytes |  |
| d6x10-hard | No model-too-large error | pass | 0 | 0 |  |
| d6x10-hard | No main-thread task over 50 ms (rendering excluded) | pass | 10 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| d6x10-hard | Cancel settles quickly (separate probe, excluded from statistics) | pass | 3 | < 200 ms | 1 probe(s) |
| d6x10-expert | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d6x10-expert | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d6x10-expert | T10 median, conditional on complete runs | pass | 623 | <= 60000 ms | n = 3 |
| d6x10-expert | T10 p95 (nearest rank), conditional on complete runs | pass | 913 | <= 115000 ms | n = 3 |
| d6x10-expert | Longest response of any ordinary run | pass | 917 | <= 120000 ms |  |
| d6x10-expert | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| d6x10-expert | Accounted worker and main buffers within the design budgets | pass | 2652160 | <= 1254096896 bytes |  |
| d6x10-expert | No model-too-large error | pass | 0 | 0 |  |
| d6x10-expert | No main-thread task over 50 ms (rendering excluded) | pass | 10 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| d6x10-expert | Cancel settles quickly (separate probe, excluded from statistics) | pass | 2 | < 200 ms | 1 probe(s) |
| d6x10-master | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d6x10-master | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d6x10-master | T10 median, conditional on complete runs | pass | 459 | <= 60000 ms | n = 3 |
| d6x10-master | T10 p95 (nearest rank), conditional on complete runs | pass | 483 | <= 115000 ms | n = 3 |
| d6x10-master | Longest response of any ordinary run | pass | 488 | <= 120000 ms |  |
| d6x10-master | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| d6x10-master | Accounted worker and main buffers within the design budgets | pass | 2848182 | <= 1254096896 bytes |  |
| d6x10-master | No model-too-large error | pass | 0 | 0 |  |
| d6x10-master | No main-thread task over 50 ms (rendering excluded) | pass | 14 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| d6x10-master | Cancel settles quickly (separate probe, excluded from statistics) | pass | 2 | < 200 ms | 1 probe(s) |
| d12x12-easy | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d12x12-easy | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d12x12-easy | T10 median, conditional on complete runs | pass | 408 | <= 60000 ms | n = 3 |
| d12x12-easy | T10 p95 (nearest rank), conditional on complete runs | pass | 424 | <= 115000 ms | n = 3 |
| d12x12-easy | Longest response of any ordinary run | pass | 432 | <= 120000 ms |  |
| d12x12-easy | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| d12x12-easy | Accounted worker and main buffers within the design budgets | pass | 8850949 | <= 1254096896 bytes |  |
| d12x12-easy | No model-too-large error | pass | 0 | 0 |  |
| d12x12-easy | No main-thread task over 50 ms (rendering excluded) | pass | 25 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| d12x12-easy | Cancel settles quickly (separate probe, excluded from statistics) | pass | 1 | < 200 ms | 1 probe(s) |
| d12x12-normal | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d12x12-normal | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d12x12-normal | T10 median, conditional on complete runs | pass | 404 | <= 60000 ms | n = 3 |
| d12x12-normal | T10 p95 (nearest rank), conditional on complete runs | pass | 501 | <= 115000 ms | n = 3 |
| d12x12-normal | Longest response of any ordinary run | pass | 510 | <= 120000 ms |  |
| d12x12-normal | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| d12x12-normal | Accounted worker and main buffers within the design budgets | pass | 7344702 | <= 1254096896 bytes |  |
| d12x12-normal | No model-too-large error | pass | 0 | 0 |  |
| d12x12-normal | No main-thread task over 50 ms (rendering excluded) | pass | 30 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| d12x12-normal | Cancel settles quickly (separate probe, excluded from statistics) | pass | 2 | < 200 ms | 1 probe(s) |
| d12x12-hard | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d12x12-hard | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d12x12-hard | T10 median, conditional on complete runs | pass | 503 | <= 60000 ms | n = 3 |
| d12x12-hard | T10 p95 (nearest rank), conditional on complete runs | pass | 530 | <= 115000 ms | n = 3 |
| d12x12-hard | Longest response of any ordinary run | pass | 539 | <= 120000 ms |  |
| d12x12-hard | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| d12x12-hard | Accounted worker and main buffers within the design budgets | pass | 11567739 | <= 1254096896 bytes |  |
| d12x12-hard | No model-too-large error | pass | 0 | 0 |  |
| d12x12-hard | No main-thread task over 50 ms (rendering excluded) | pass | 21 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| d12x12-hard | Cancel settles quickly (separate probe, excluded from statistics) | pass | 2 | < 200 ms | 1 probe(s) |
| d12x12-expert | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d12x12-expert | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d12x12-expert | T10 median, conditional on complete runs | pass | 534 | <= 60000 ms | n = 3 |
| d12x12-expert | T10 p95 (nearest rank), conditional on complete runs | pass | 588 | <= 115000 ms | n = 3 |
| d12x12-expert | Longest response of any ordinary run | pass | 594 | <= 120000 ms |  |
| d12x12-expert | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| d12x12-expert | Accounted worker and main buffers within the design budgets | pass | 14779231 | <= 1254096896 bytes |  |
| d12x12-expert | No model-too-large error | pass | 0 | 0 |  |
| d12x12-expert | No main-thread task over 50 ms (rendering excluded) | pass | 25 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| d12x12-expert | Cancel settles quickly (separate probe, excluded from statistics) | pass | 2 | < 200 ms | 1 probe(s) |
| d12x12-master | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d12x12-master | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d12x12-master | T10 median, conditional on complete runs | pass | 1497 | <= 60000 ms | n = 3 |
| d12x12-master | T10 p95 (nearest rank), conditional on complete runs | pass | 1990 | <= 115000 ms | n = 3 |
| d12x12-master | Longest response of any ordinary run | pass | 1996 | <= 120000 ms |  |
| d12x12-master | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| d12x12-master | Accounted worker and main buffers within the design budgets | pass | 14807996 | <= 1254096896 bytes |  |
| d12x12-master | No model-too-large error | pass | 0 | 0 |  |
| d12x12-master | No main-thread task over 50 ms (rendering excluded) | pass | 13 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| d12x12-master | Cancel settles quickly (separate probe, excluded from statistics) | pass | 2 | < 200 ms | 1 probe(s) |
| d12x12-nightmare | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d12x12-nightmare | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d12x12-nightmare | T10 median, conditional on complete runs | pass | 904 | <= 60000 ms | n = 3 |
| d12x12-nightmare | T10 p95 (nearest rank), conditional on complete runs | pass | 924 | <= 115000 ms | n = 3 |
| d12x12-nightmare | Longest response of any ordinary run | pass | 933 | <= 120000 ms |  |
| d12x12-nightmare | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| d12x12-nightmare | Accounted worker and main buffers within the design budgets | pass | 12434866 | <= 1254096896 bytes |  |
| d12x12-nightmare | No model-too-large error | pass | 0 | 0 |  |
| d12x12-nightmare | No main-thread task over 50 ms (rendering excluded) | pass | 34 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| d12x12-nightmare | Cancel settles quickly (separate probe, excluded from statistics) | pass | 3 | < 200 ms | 1 probe(s) |
| p18x20-hard | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| p18x20-hard | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| p18x20-hard | T10 median, conditional on complete runs | pass | 552 | <= 60000 ms | n = 3 |
| p18x20-hard | T10 p95 (nearest rank), conditional on complete runs | pass | 726 | <= 115000 ms | n = 3 |
| p18x20-hard | Longest response of any ordinary run | pass | 739 | <= 120000 ms |  |
| p18x20-hard | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| p18x20-hard | Accounted worker and main buffers within the design budgets | pass | 24444393 | <= 1254096896 bytes |  |
| p18x20-hard | No model-too-large error | pass | 0 | 0 |  |
| p18x20-hard | No main-thread task over 50 ms (rendering excluded) | pass | 49 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| p18x20-hard | Cancel settles quickly (separate probe, excluded from statistics) | pass | 3 | < 200 ms | 1 probe(s) |
| p18x20-nightmare | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| p18x20-nightmare | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| p18x20-nightmare | T10 median, conditional on complete runs | pass | 3462 | <= 60000 ms | n = 3 |
| p18x20-nightmare | T10 p95 (nearest rank), conditional on complete runs | pass | 7847 | <= 115000 ms | n = 3 |
| p18x20-nightmare | Longest response of any ordinary run | pass | 7864 | <= 120000 ms |  |
| p18x20-nightmare | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| p18x20-nightmare | Accounted worker and main buffers within the design budgets | pass | 55306017 | <= 1254096896 bytes |  |
| p18x20-nightmare | No model-too-large error | pass | 0 | 0 |  |
| p18x20-nightmare | No main-thread task over 50 ms (rendering excluded) | fail | 61 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| p18x20-nightmare | Cancel settles quickly (separate probe, excluded from statistics) | pass | 4 | < 200 ms | 1 probe(s) |
| p18x20-hell-1 | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| p18x20-hell-1 | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| p18x20-hell-1 | T10 median, conditional on complete runs | pass | 3502 | <= 60000 ms | n = 3 |
| p18x20-hell-1 | T10 p95 (nearest rank), conditional on complete runs | pass | 3593 | <= 115000 ms | n = 3 |
| p18x20-hell-1 | Longest response of any ordinary run | pass | 3606 | <= 120000 ms |  |
| p18x20-hell-1 | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| p18x20-hell-1 | Accounted worker and main buffers within the design budgets | pass | 67406081 | <= 1254096896 bytes |  |
| p18x20-hell-1 | No model-too-large error | pass | 0 | 0 |  |
| p18x20-hell-1 | No main-thread task over 50 ms (rendering excluded) | pass | 21 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| p18x20-hell-1 | Cancel settles quickly (separate probe, excluded from statistics) | pass | 3 | < 200 ms | 1 probe(s) |
| p18x20-hell-2 | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| p18x20-hell-2 | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| p18x20-hell-2 | T10 median, conditional on complete runs | pass | 5011 | <= 60000 ms | n = 3 |
| p18x20-hell-2 | T10 p95 (nearest rank), conditional on complete runs | pass | 5763 | <= 115000 ms | n = 3 |
| p18x20-hell-2 | Longest response of any ordinary run | pass | 5773 | <= 120000 ms |  |
| p18x20-hell-2 | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| p18x20-hell-2 | Accounted worker and main buffers within the design budgets | pass | 87685690 | <= 1254096896 bytes |  |
| p18x20-hell-2 | No model-too-large error | pass | 0 | 0 |  |
| p18x20-hell-2 | No main-thread task over 50 ms (rendering excluded) | pass | 40 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| p18x20-hell-2 | Cancel settles quickly (separate probe, excluded from statistics) | pass | 4 | < 200 ms | 1 probe(s) |

## Probe rows (excluded from the statistics)

| Probe | Case | Seed | Accepted | Cancel latency | Response | Reason | Valid | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cancel | d22x22-hard | bq0/d22x22-hard/0 | 1 | 6 ms | 276 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |
| cancel | d22x22-expert | bq0/d22x22-expert/0 | 1 | 4 ms | 267 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |
| cancel | d22x22-master | bq0/d22x22-master/0 | 1 | 4 ms | 280 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |
| cancel | d22x22-nightmare | bq0/d22x22-nightmare/0 | 1 | 5 ms | 589 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |
| cancel | d22x22-hell-1 | bq0/d22x22-hell-1/0 | 1 | 4 ms | 2465 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |
| cancel | d22x22-hell-2 | bq0/d22x22-hell-2/0 | 1 | 4 ms | 1049 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |
| cancel | d22x22-hell-3 | bq0/d22x22-hell-3/0 | 1 | 5 ms | 7034 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |
| cancel | d32x15-hard | bq0/d32x15-hard/0 | 1 | 3 ms | 265 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |
| cancel | d32x15-expert | bq0/d32x15-expert/0 | 1 | 4 ms | 258 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |
| cancel | d32x15-master | bq0/d32x15-master/0 | 1 | 4 ms | 299 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |
| cancel | d32x15-nightmare | bq0/d32x15-nightmare/0 | 1 | 3 ms | 734 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |
| cancel | d32x15-hell-1 | bq0/d32x15-hell-1/0 | 1 | 5 ms | 1841 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |
| cancel | d32x15-hell-2 | bq0/d32x15-hell-2/0 | 1 | 5 ms | 861 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |
| cancel | d32x15-hell-3 | bq0/d32x15-hell-3/0 | 1 | 5 ms | 13.7 s | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |
| cancel | dheart432-hard | bq0/dheart432-hard/0 | 1 | 3 ms | 244 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |
| cancel | dheart432-expert | bq0/dheart432-expert/0 | 1 | 3 ms | 245 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |
| cancel | dheart432-master | bq0/dheart432-master/0 | 1 | 4 ms | 272 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |
| cancel | dheart432-nightmare | bq0/dheart432-nightmare/0 | 1 | 4 ms | 332 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |
| cancel | dheart432-hell-1 | bq0/dheart432-hell-1/0 | 1 | 3 ms | 1415 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |
| cancel | dheart432-hell-2 | bq0/dheart432-hell-2/0 | 1 | 3 ms | 959 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |
| cancel | dirr466-hard | bq0/dirr466-hard/0 | 1 | 3 ms | 486 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |
| cancel | dirr466-expert | bq0/dirr466-expert/0 | 1 | 3 ms | 469 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |
| cancel | dirr466-master | bq0/dirr466-master/0 | 1 | 4 ms | 314 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |
| cancel | dirr466-nightmare | bq0/dirr466-nightmare/0 | 1 | 3 ms | 605 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |
| cancel | dirr466-hell-1 | bq0/dirr466-hell-1/0 | 1 | 4 ms | 1590 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |
| cancel | dirr466-hell-2 | bq0/dirr466-hell-2/0 | 1 | 4 ms | 1057 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |
| cancel | dirr466-hell-3 | bq0/dirr466-hell-3/0 | 1 | 5 ms | 7219 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |
| cancel | d6x10-very-easy | bq0/d6x10-very-easy/0 | 1 | 2 ms | 236 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |
| cancel | d6x10-easy | bq0/d6x10-easy/0 | 1 | 1 ms | 209 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |
| cancel | d6x10-normal | bq0/d6x10-normal/0 | 1 | 1 ms | 202 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |
| cancel | d6x10-hard | bq0/d6x10-hard/0 | 1 | 3 ms | 220 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |
| cancel | d6x10-expert | bq0/d6x10-expert/0 | 1 | 2 ms | 211 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |
| cancel | d6x10-master | bq0/d6x10-master/0 | 1 | 2 ms | 235 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |
| cancel | d12x12-easy | bq0/d12x12-easy/0 | 1 | 1 ms | 243 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |
| cancel | d12x12-normal | bq0/d12x12-normal/0 | 1 | 2 ms | 217 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |
| cancel | d12x12-hard | bq0/d12x12-hard/0 | 1 | 2 ms | 221 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |
| cancel | d12x12-expert | bq0/d12x12-expert/0 | 1 | 2 ms | 265 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |
| cancel | d12x12-master | bq0/d12x12-master/0 | 1 | 2 ms | 244 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |
| cancel | d12x12-nightmare | bq0/d12x12-nightmare/0 | 1 | 3 ms | 314 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |
| cancel | p18x20-hard | bq0/p18x20-hard/0 | 1 | 3 ms | 260 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |
| cancel | p18x20-nightmare | bq0/p18x20-nightmare/0 | 1 | 4 ms | 2157 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |
| cancel | p18x20-hell-1 | bq0/p18x20-hell-1/0 | 1 | 3 ms | 1122 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |
| cancel | p18x20-hell-2 | bq0/p18x20-hell-2/0 | 1 | 4 ms | 630 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |

## Certificates (accepted puzzles of ordinary runs)

| Case | unique | multiple | not proved | not checked | saturated ratings |
| --- | --- | --- | --- | --- | --- |
| d22x22-hard | 24 | 6 | 0 | 0 | 0/30 |
| d22x22-expert | 12 | 18 | 0 | 0 | 0/30 |
| d22x22-master | 2 | 28 | 0 | 0 | 0/30 |
| d22x22-nightmare | 0 | 30 | 0 | 0 | 0/30 |
| d22x22-hell-1 | 0 | 0 | 30 | 0 | 30/30 |
| d22x22-hell-2 | 0 | 0 | 30 | 0 | 30/30 |
| d22x22-hell-3 | 0 | 0 | 30 | 0 | 29/30 |
| d32x15-hard | 30 | 0 | 0 | 0 | 0/30 |
| d32x15-expert | 10 | 20 | 0 | 0 | 0/30 |
| d32x15-master | 1 | 29 | 0 | 0 | 0/30 |
| d32x15-nightmare | 0 | 30 | 0 | 0 | 0/30 |
| d32x15-hell-1 | 0 | 0 | 30 | 0 | 30/30 |
| d32x15-hell-2 | 0 | 0 | 30 | 0 | 30/30 |
| d32x15-hell-3 | 0 | 0 | 30 | 0 | 30/30 |
| dheart432-hard | 24 | 6 | 0 | 0 | 0/30 |
| dheart432-expert | 19 | 11 | 0 | 0 | 0/30 |
| dheart432-master | 3 | 27 | 0 | 0 | 0/30 |
| dheart432-nightmare | 0 | 30 | 0 | 0 | 0/30 |
| dheart432-hell-1 | 0 | 0 | 30 | 0 | 30/30 |
| dheart432-hell-2 | 0 | 0 | 30 | 0 | 30/30 |
| dirr466-hard | 0 | 0 | 0 | 12 | 0/12 |
| dirr466-expert | 19 | 1 | 0 | 4 | 0/24 |
| dirr466-master | 7 | 13 | 0 | 1 | 0/21 |
| dirr466-nightmare | 1 | 27 | 2 | 0 | 0/30 |
| dirr466-hell-1 | 0 | 0 | 30 | 0 | 30/30 |
| dirr466-hell-2 | 0 | 0 | 30 | 0 | 30/30 |
| dirr466-hell-3 | 0 | 0 | 30 | 0 | 30/30 |
| d6x10-very-easy | 30 | 0 | 0 | 0 | 0/30 |
| d6x10-easy | 16 | 14 | 0 | 0 | 0/30 |
| d6x10-normal | 12 | 18 | 0 | 0 | 0/30 |
| d6x10-hard | 12 | 18 | 0 | 0 | 0/30 |
| d6x10-expert | 5 | 25 | 0 | 0 | 0/30 |
| d6x10-master | 0 | 30 | 0 | 0 | 0/30 |
| d12x12-easy | 28 | 2 | 0 | 0 | 0/30 |
| d12x12-normal | 10 | 20 | 0 | 0 | 0/30 |
| d12x12-hard | 16 | 14 | 0 | 0 | 0/30 |
| d12x12-expert | 9 | 21 | 0 | 0 | 0/30 |
| d12x12-master | 1 | 29 | 0 | 0 | 0/30 |
| d12x12-nightmare | 0 | 5 | 25 | 0 | 25/30 |
| p18x20-hard | 28 | 2 | 0 | 0 | 0/30 |
| p18x20-nightmare | 0 | 20 | 10 | 0 | 4/30 |
| p18x20-hell-1 | 0 | 0 | 30 | 0 | 30/30 |
| p18x20-hell-2 | 0 | 0 | 30 | 0 | 30/30 |

Note: thumbnails off (renderingEnabled false); full-preview UX checks belong to the release acceptance task
