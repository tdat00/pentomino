# Benchmark report: BQ-2 (node)

Node screening evidence only. It never replaces browser measurements and enables no BQ limit.

| Field | Value |
| --- | --- |
| Source commit | 59487235a112be6d0f349521392197171cec5faf+uncommitted-changes |
| Source digest | ad96b258e7eb6432f166321a3e37c7c18774ea5a8af69a084193d41902e2bf96 |
| Versions | {"algo":"gen-v2","policy":"mixed-v2","rng":"xoshiro128ss-v1","model":"difficulty-v2","app":"1.0.0"} |
| Platform | win32 10.0.26300 x64 / node v24.21.0 |
| Workers | 4 |
| Pool lifecycle | cold |
| Started | 2026-10-22T17:48:21.714Z |
| Finished | 2026-10-22T17:58:59.277Z |
| Rows recorded / requested | 72 / 72 |
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
| d26x26-hard | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 461 ms | 1267 ms | 1360 ms | 1360 ms | 1516 ms | 315.8 MiB | 58.0 MiB | node-screening-only |
| d26x26-master | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 389 ms | 965 ms | 2409 ms | 2409 ms | 2559 ms | 371.7 MiB | 113.3 MiB | node-screening-only |
| d26x26-nightmare | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 1153 ms | 6810 ms | 12.1 s | 12.1 s | 12.3 s | 463.9 MiB | 178.4 MiB | node-screening-only |
| d26x26-hell-1 | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 5586 ms | 24.0 s | 24.9 s | 24.9 s | 25.0 s | 532.7 MiB | 216.9 MiB | node-screening-only |
| d26x26-hell-2 | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 3992 ms | 11.1 s | 13.8 s | 13.8 s | 13.9 s | 572.1 MiB | 293.2 MiB | node-screening-only |
| d26x26-hell-3 | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 1799 ms | 5487 ms | 7224 ms | 7224 ms | 7383 ms | 511.4 MiB | 328.5 MiB | node-screening-only |
| d32x21-hard | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 505 ms | 1081 ms | 1229 ms | 1229 ms | 1359 ms | 328.2 MiB | 64.7 MiB | node-screening-only |
| d32x21-master | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 372 ms | 902 ms | 1126 ms | 1126 ms | 1302 ms | 321.6 MiB | 91.4 MiB | node-screening-only |
| d32x21-nightmare | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 634 ms | 3033 ms | 3499 ms | 3499 ms | 3620 ms | 442.5 MiB | 164.3 MiB | node-screening-only |
| d32x21-hell-1 | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 1611 ms | 16.1 s | 18.4 s | 18.4 s | 18.6 s | 486.3 MiB | 208.3 MiB | node-screening-only |
| d32x21-hell-2 | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 3385 ms | 11.2 s | 13.2 s | 13.2 s | 13.4 s | 552.9 MiB | 277.2 MiB | node-screening-only |
| d32x21-hell-3 | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 1533 ms | 5196 ms | 5433 ms | 5433 ms | 5589 ms | 506.5 MiB | 321.0 MiB | node-screening-only |
| dirr658-hard | 3/3 | 2/3 (66.7%) | 3/3 (100.0%) | 423 ms | 3172 ms | 3610 ms | 3610 ms | 3789 ms | 524.6 MiB | 65.8 MiB | fail |
| dirr658-master | 3/3 | 2/3 (66.7%) | 3/3 (100.0%) | 556 ms | 2561 ms | 2566 ms | 2566 ms | 2703 ms | 475.1 MiB | 105.6 MiB | fail |
| dirr658-nightmare | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 736 ms | 5618 ms | 7532 ms | 7532 ms | 7714 ms | 526.4 MiB | 156.8 MiB | node-screening-only |
| dirr658-hell-1 | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 5562 ms | 25.8 s | 42.0 s | 42.0 s | 42.1 s | 481.8 MiB | 188.5 MiB | node-screening-only |
| dirr658-hell-2 | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 4306 ms | 12.9 s | 14.5 s | 14.5 s | 14.6 s | 643.5 MiB | 265.9 MiB | node-screening-only |
| dirr658-hell-3 | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 1395 ms | 4673 ms | 5027 ms | 5027 ms | 5211 ms | 572.3 MiB | 291.9 MiB | node-screening-only |

\* conditional on completed runs; n per cell: d26x26-hard 3, d26x26-master 3, d26x26-nightmare 3, d26x26-hell-1 3, d26x26-hell-2 3, d26x26-hell-3 3, d32x21-hard 3, d32x21-master 3, d32x21-nightmare 3, d32x21-hell-1 3, d32x21-hell-2 3, d32x21-hell-3 3, dirr658-hard 2, dirr658-master 2, dirr658-nightmare 3, dirr658-hell-1 3, dirr658-hell-2 3, dirr658-hell-3 3

## Criteria checks

| Case | Check | Status | Value | Limit | Note |
| --- | --- | --- | --- | --- | --- |
| d26x26-hard | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d26x26-hard | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d26x26-hard | T10 median, conditional on complete runs | pass | 1266.518 | <= 60000 ms | n = 3 |
| d26x26-hard | T10 p95 (nearest rank), conditional on complete runs | pass | 1359.573 | <= 115000 ms | n = 3 |
| d26x26-hard | Longest response of any ordinary run | pass | 1515.848 | <= 120000 ms |  |
| d26x26-hard | Real peak memory of the whole process (tab/process plus workers) | pass | 331190272 | <= 1610612736 bytes |  |
| d26x26-hard | Accounted worker and main buffers within the design budgets | pass | 60850295 | <= 1254096896 bytes |  |
| d26x26-hard | No model-too-large error | pass | 0 | 0 |  |
| d26x26-hard | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| d26x26-hard | Cancel settles quickly (separate probe, excluded from statistics) | pass | 28.454 | < 200 ms | 1 probe(s) |
| d26x26-master | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d26x26-master | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d26x26-master | T10 median, conditional on complete runs | pass | 964.548 | <= 60000 ms | n = 3 |
| d26x26-master | T10 p95 (nearest rank), conditional on complete runs | pass | 2408.969 | <= 115000 ms | n = 3 |
| d26x26-master | Longest response of any ordinary run | pass | 2559.394 | <= 120000 ms |  |
| d26x26-master | Real peak memory of the whole process (tab/process plus workers) | pass | 389779456 | <= 1610612736 bytes |  |
| d26x26-master | Accounted worker and main buffers within the design budgets | pass | 118761093 | <= 1254096896 bytes |  |
| d26x26-master | No model-too-large error | pass | 0 | 0 |  |
| d26x26-master | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| d26x26-master | Cancel settles quickly (separate probe, excluded from statistics) | pass | 20.154 | < 200 ms | 1 probe(s) |
| d26x26-nightmare | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d26x26-nightmare | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d26x26-nightmare | T10 median, conditional on complete runs | pass | 6809.985 | <= 60000 ms | n = 3 |
| d26x26-nightmare | T10 p95 (nearest rank), conditional on complete runs | pass | 12140.293 | <= 115000 ms | n = 3 |
| d26x26-nightmare | Longest response of any ordinary run | pass | 12311.299 | <= 120000 ms |  |
| d26x26-nightmare | Real peak memory of the whole process (tab/process plus workers) | pass | 486461440 | <= 1610612736 bytes |  |
| d26x26-nightmare | Accounted worker and main buffers within the design budgets | pass | 187069726 | <= 1254096896 bytes |  |
| d26x26-nightmare | No model-too-large error | pass | 0 | 0 |  |
| d26x26-nightmare | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| d26x26-nightmare | Cancel settles quickly (separate probe, excluded from statistics) | pass | 33.531 | < 200 ms | 1 probe(s) |
| d26x26-hell-1 | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d26x26-hell-1 | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d26x26-hell-1 | T10 median, conditional on complete runs | pass | 23956.611 | <= 60000 ms | n = 3 |
| d26x26-hell-1 | T10 p95 (nearest rank), conditional on complete runs | pass | 24868.071 | <= 115000 ms | n = 3 |
| d26x26-hell-1 | Longest response of any ordinary run | pass | 25034.657 | <= 120000 ms |  |
| d26x26-hell-1 | Real peak memory of the whole process (tab/process plus workers) | pass | 558567424 | <= 1610612736 bytes |  |
| d26x26-hell-1 | Accounted worker and main buffers within the design budgets | pass | 227442361 | <= 1254096896 bytes |  |
| d26x26-hell-1 | No model-too-large error | pass | 0 | 0 |  |
| d26x26-hell-1 | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| d26x26-hell-1 | Cancel settles quickly (separate probe, excluded from statistics) | pass | 30.326 | < 200 ms | 1 probe(s) |
| d26x26-hell-2 | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d26x26-hell-2 | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d26x26-hell-2 | T10 median, conditional on complete runs | pass | 11110.016 | <= 60000 ms | n = 3 |
| d26x26-hell-2 | T10 p95 (nearest rank), conditional on complete runs | pass | 13781.243 | <= 115000 ms | n = 3 |
| d26x26-hell-2 | Longest response of any ordinary run | pass | 13909.366 | <= 120000 ms |  |
| d26x26-hell-2 | Real peak memory of the whole process (tab/process plus workers) | pass | 599916544 | <= 1610612736 bytes |  |
| d26x26-hell-2 | Accounted worker and main buffers within the design budgets | pass | 307408316 | <= 1254096896 bytes |  |
| d26x26-hell-2 | No model-too-large error | pass | 0 | 0 |  |
| d26x26-hell-2 | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| d26x26-hell-2 | Cancel settles quickly (separate probe, excluded from statistics) | pass | 36.071 | < 200 ms | 1 probe(s) |
| d26x26-hell-3 | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d26x26-hell-3 | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d26x26-hell-3 | T10 median, conditional on complete runs | pass | 5486.535 | <= 60000 ms | n = 3 |
| d26x26-hell-3 | T10 p95 (nearest rank), conditional on complete runs | pass | 7224.031 | <= 115000 ms | n = 3 |
| d26x26-hell-3 | Longest response of any ordinary run | pass | 7382.656 | <= 120000 ms |  |
| d26x26-hell-3 | Real peak memory of the whole process (tab/process plus workers) | pass | 536293376 | <= 1610612736 bytes |  |
| d26x26-hell-3 | Accounted worker and main buffers within the design budgets | pass | 344502802 | <= 1254096896 bytes |  |
| d26x26-hell-3 | No model-too-large error | pass | 0 | 0 |  |
| d26x26-hell-3 | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| d26x26-hell-3 | Cancel settles quickly (separate probe, excluded from statistics) | pass | 38.05 | < 200 ms | 1 probe(s) |
| d32x21-hard | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d32x21-hard | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d32x21-hard | T10 median, conditional on complete runs | pass | 1080.513 | <= 60000 ms | n = 3 |
| d32x21-hard | T10 p95 (nearest rank), conditional on complete runs | pass | 1229.149 | <= 115000 ms | n = 3 |
| d32x21-hard | Longest response of any ordinary run | pass | 1358.746 | <= 120000 ms |  |
| d32x21-hard | Real peak memory of the whole process (tab/process plus workers) | pass | 344137728 | <= 1610612736 bytes |  |
| d32x21-hard | Accounted worker and main buffers within the design budgets | pass | 67861200 | <= 1254096896 bytes |  |
| d32x21-hard | No model-too-large error | pass | 0 | 0 |  |
| d32x21-hard | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| d32x21-hard | Cancel settles quickly (separate probe, excluded from statistics) | pass | 28.096 | < 200 ms | 1 probe(s) |
| d32x21-master | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d32x21-master | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d32x21-master | T10 median, conditional on complete runs | pass | 902.106 | <= 60000 ms | n = 3 |
| d32x21-master | T10 p95 (nearest rank), conditional on complete runs | pass | 1125.644 | <= 115000 ms | n = 3 |
| d32x21-master | Longest response of any ordinary run | pass | 1301.95 | <= 120000 ms |  |
| d32x21-master | Real peak memory of the whole process (tab/process plus workers) | pass | 337170432 | <= 1610612736 bytes |  |
| d32x21-master | Accounted worker and main buffers within the design budgets | pass | 95846088 | <= 1254096896 bytes |  |
| d32x21-master | No model-too-large error | pass | 0 | 0 |  |
| d32x21-master | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| d32x21-master | Cancel settles quickly (separate probe, excluded from statistics) | pass | 18.551 | < 200 ms | 1 probe(s) |
| d32x21-nightmare | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d32x21-nightmare | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d32x21-nightmare | T10 median, conditional on complete runs | pass | 3033.137 | <= 60000 ms | n = 3 |
| d32x21-nightmare | T10 p95 (nearest rank), conditional on complete runs | pass | 3498.785 | <= 115000 ms | n = 3 |
| d32x21-nightmare | Longest response of any ordinary run | pass | 3620.233 | <= 120000 ms |  |
| d32x21-nightmare | Real peak memory of the whole process (tab/process plus workers) | pass | 464019456 | <= 1610612736 bytes |  |
| d32x21-nightmare | Accounted worker and main buffers within the design budgets | pass | 172312042 | <= 1254096896 bytes |  |
| d32x21-nightmare | No model-too-large error | pass | 0 | 0 |  |
| d32x21-nightmare | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| d32x21-nightmare | Cancel settles quickly (separate probe, excluded from statistics) | pass | 30.686 | < 200 ms | 1 probe(s) |
| d32x21-hell-1 | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d32x21-hell-1 | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d32x21-hell-1 | T10 median, conditional on complete runs | pass | 16117.4 | <= 60000 ms | n = 3 |
| d32x21-hell-1 | T10 p95 (nearest rank), conditional on complete runs | pass | 18443.122 | <= 115000 ms | n = 3 |
| d32x21-hell-1 | Longest response of any ordinary run | pass | 18603.837 | <= 120000 ms |  |
| d32x21-hell-1 | Real peak memory of the whole process (tab/process plus workers) | pass | 509870080 | <= 1610612736 bytes |  |
| d32x21-hell-1 | Accounted worker and main buffers within the design budgets | pass | 218386391 | <= 1254096896 bytes |  |
| d32x21-hell-1 | No model-too-large error | pass | 0 | 0 |  |
| d32x21-hell-1 | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| d32x21-hell-1 | Cancel settles quickly (separate probe, excluded from statistics) | pass | 23.767 | < 200 ms | 1 probe(s) |
| d32x21-hell-2 | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d32x21-hell-2 | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d32x21-hell-2 | T10 median, conditional on complete runs | pass | 11181.466 | <= 60000 ms | n = 3 |
| d32x21-hell-2 | T10 p95 (nearest rank), conditional on complete runs | pass | 13243.107 | <= 115000 ms | n = 3 |
| d32x21-hell-2 | Longest response of any ordinary run | pass | 13416.118 | <= 120000 ms |  |
| d32x21-hell-2 | Real peak memory of the whole process (tab/process plus workers) | pass | 579727360 | <= 1610612736 bytes |  |
| d32x21-hell-2 | Accounted worker and main buffers within the design budgets | pass | 290650931 | <= 1254096896 bytes |  |
| d32x21-hell-2 | No model-too-large error | pass | 0 | 0 |  |
| d32x21-hell-2 | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| d32x21-hell-2 | Cancel settles quickly (separate probe, excluded from statistics) | pass | 21.504 | < 200 ms | 1 probe(s) |
| d32x21-hell-3 | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d32x21-hell-3 | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d32x21-hell-3 | T10 median, conditional on complete runs | pass | 5196.404 | <= 60000 ms | n = 3 |
| d32x21-hell-3 | T10 p95 (nearest rank), conditional on complete runs | pass | 5432.622 | <= 115000 ms | n = 3 |
| d32x21-hell-3 | Longest response of any ordinary run | pass | 5588.545 | <= 120000 ms |  |
| d32x21-hell-3 | Real peak memory of the whole process (tab/process plus workers) | pass | 531140608 | <= 1610612736 bytes |  |
| d32x21-hell-3 | Accounted worker and main buffers within the design budgets | pass | 336565894 | <= 1254096896 bytes |  |
| d32x21-hell-3 | No model-too-large error | pass | 0 | 0 |  |
| d32x21-hell-3 | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| d32x21-hell-3 | Cancel settles quickly (separate probe, excluded from statistics) | pass | 38.901 | < 200 ms | 1 probe(s) |
| dirr658-hard | Runs with 10 of 10 puzzles (all ordinary runs) | fail | 0.667 | >= 0.9 | 2 of 3 |
| dirr658-hard | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| dirr658-hard | T10 median, conditional on complete runs | pass | 3172.186 | <= 60000 ms | n = 2 |
| dirr658-hard | T10 p95 (nearest rank), conditional on complete runs | pass | 3609.586 | <= 115000 ms | n = 2 |
| dirr658-hard | Longest response of any ordinary run | pass | 3789.495 | <= 120000 ms |  |
| dirr658-hard | Real peak memory of the whole process (tab/process plus workers) | pass | 550039552 | <= 1610612736 bytes |  |
| dirr658-hard | Accounted worker and main buffers within the design budgets | pass | 69036335 | <= 1254096896 bytes |  |
| dirr658-hard | No model-too-large error | pass | 0 | 0 |  |
| dirr658-hard | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| dirr658-hard | Cancel settles quickly (separate probe, excluded from statistics) | pass | 32.479 | < 200 ms | 1 probe(s) |
| dirr658-master | Runs with 10 of 10 puzzles (all ordinary runs) | fail | 0.667 | >= 0.9 | 2 of 3 |
| dirr658-master | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| dirr658-master | T10 median, conditional on complete runs | pass | 2560.9 | <= 60000 ms | n = 2 |
| dirr658-master | T10 p95 (nearest rank), conditional on complete runs | pass | 2566.377 | <= 115000 ms | n = 2 |
| dirr658-master | Longest response of any ordinary run | pass | 2703.262 | <= 120000 ms |  |
| dirr658-master | Real peak memory of the whole process (tab/process plus workers) | pass | 498212864 | <= 1610612736 bytes |  |
| dirr658-master | Accounted worker and main buffers within the design budgets | pass | 110688997 | <= 1254096896 bytes |  |
| dirr658-master | No model-too-large error | pass | 0 | 0 |  |
| dirr658-master | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| dirr658-master | Cancel settles quickly (separate probe, excluded from statistics) | pass | 27.08 | < 200 ms | 1 probe(s) |
| dirr658-nightmare | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| dirr658-nightmare | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| dirr658-nightmare | T10 median, conditional on complete runs | pass | 5618.217 | <= 60000 ms | n = 3 |
| dirr658-nightmare | T10 p95 (nearest rank), conditional on complete runs | pass | 7531.742 | <= 115000 ms | n = 3 |
| dirr658-nightmare | Longest response of any ordinary run | pass | 7714.371 | <= 120000 ms |  |
| dirr658-nightmare | Real peak memory of the whole process (tab/process plus workers) | pass | 551964672 | <= 1610612736 bytes |  |
| dirr658-nightmare | Accounted worker and main buffers within the design budgets | pass | 164452687 | <= 1254096896 bytes |  |
| dirr658-nightmare | No model-too-large error | pass | 0 | 0 |  |
| dirr658-nightmare | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| dirr658-nightmare | Cancel settles quickly (separate probe, excluded from statistics) | pass | 33.051 | < 200 ms | 1 probe(s) |
| dirr658-hell-1 | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| dirr658-hell-1 | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| dirr658-hell-1 | T10 median, conditional on complete runs | pass | 25778.268 | <= 60000 ms | n = 3 |
| dirr658-hell-1 | T10 p95 (nearest rank), conditional on complete runs | pass | 41959.268 | <= 115000 ms | n = 3 |
| dirr658-hell-1 | Longest response of any ordinary run | pass | 42132.628 | <= 120000 ms |  |
| dirr658-hell-1 | Real peak memory of the whole process (tab/process plus workers) | pass | 505225216 | <= 1610612736 bytes |  |
| dirr658-hell-1 | Accounted worker and main buffers within the design budgets | pass | 197612412 | <= 1254096896 bytes |  |
| dirr658-hell-1 | No model-too-large error | pass | 0 | 0 |  |
| dirr658-hell-1 | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| dirr658-hell-1 | Cancel settles quickly (separate probe, excluded from statistics) | pass | 29.003 | < 200 ms | 1 probe(s) |
| dirr658-hell-2 | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| dirr658-hell-2 | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| dirr658-hell-2 | T10 median, conditional on complete runs | pass | 12915.37 | <= 60000 ms | n = 3 |
| dirr658-hell-2 | T10 p95 (nearest rank), conditional on complete runs | pass | 14493.285 | <= 115000 ms | n = 3 |
| dirr658-hell-2 | Longest response of any ordinary run | pass | 14630.739 | <= 120000 ms |  |
| dirr658-hell-2 | Real peak memory of the whole process (tab/process plus workers) | pass | 674807808 | <= 1610612736 bytes |  |
| dirr658-hell-2 | Accounted worker and main buffers within the design budgets | pass | 278766431 | <= 1254096896 bytes |  |
| dirr658-hell-2 | No model-too-large error | pass | 0 | 0 |  |
| dirr658-hell-2 | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| dirr658-hell-2 | Cancel settles quickly (separate probe, excluded from statistics) | pass | 19.595 | < 200 ms | 1 probe(s) |
| dirr658-hell-3 | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| dirr658-hell-3 | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| dirr658-hell-3 | T10 median, conditional on complete runs | pass | 4672.591 | <= 60000 ms | n = 3 |
| dirr658-hell-3 | T10 p95 (nearest rank), conditional on complete runs | pass | 5026.845 | <= 115000 ms | n = 3 |
| dirr658-hell-3 | Longest response of any ordinary run | pass | 5210.589 | <= 120000 ms |  |
| dirr658-hell-3 | Real peak memory of the whole process (tab/process plus workers) | pass | 600117248 | <= 1610612736 bytes |  |
| dirr658-hell-3 | Accounted worker and main buffers within the design budgets | pass | 306099307 | <= 1254096896 bytes |  |
| dirr658-hell-3 | No model-too-large error | pass | 0 | 0 |  |
| dirr658-hell-3 | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| dirr658-hell-3 | Cancel settles quickly (separate probe, excluded from statistics) | pass | 27.785 | < 200 ms | 1 probe(s) |

## Probe rows (excluded from the statistics)

| Probe | Case | Seed | Accepted | Cancel latency | Response | Reason | Valid | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cancel | d26x26-hard | bq2/d26x26-hard/cancel | 1 | 28 ms | 480 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | d26x26-master | bq2/d26x26-master/cancel | 1 | 20 ms | 409 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | d26x26-nightmare | bq2/d26x26-nightmare/cancel | 1 | 34 ms | 545 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | d26x26-hell-1 | bq2/d26x26-hell-1/cancel | 1 | 30 ms | 6715 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | d26x26-hell-2 | bq2/d26x26-hell-2/cancel | 1 | 36 ms | 3868 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | d26x26-hell-3 | bq2/d26x26-hell-3/cancel | 1 | 38 ms | 1413 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | d32x21-hard | bq2/d32x21-hard/cancel | 1 | 28 ms | 584 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | d32x21-master | bq2/d32x21-master/cancel | 1 | 19 ms | 381 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | d32x21-nightmare | bq2/d32x21-nightmare/cancel | 1 | 31 ms | 1217 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | d32x21-hell-1 | bq2/d32x21-hell-1/cancel | 1 | 24 ms | 2130 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | d32x21-hell-2 | bq2/d32x21-hell-2/cancel | 1 | 22 ms | 3252 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | d32x21-hell-3 | bq2/d32x21-hell-3/cancel | 1 | 39 ms | 1759 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | dirr658-hard | bq2/dirr658-hard/cancel | 1 | 32 ms | 484 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | dirr658-master | bq2/dirr658-master/cancel | 1 | 27 ms | 432 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | dirr658-nightmare | bq2/dirr658-nightmare/cancel | 1 | 33 ms | 450 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | dirr658-hell-1 | bq2/dirr658-hell-1/cancel | 1 | 29 ms | 531 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | dirr658-hell-2 | bq2/dirr658-hell-2/cancel | 1 | 20 ms | 2548 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | dirr658-hell-3 | bq2/dirr658-hell-3/cancel | 1 | 28 ms | 1584 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |

## Certificates (accepted puzzles of ordinary runs)

| Case | unique | multiple | not proved | not checked | saturated ratings |
| --- | --- | --- | --- | --- | --- |
| d26x26-hard | 30 | 0 | 0 | 0 | 0/30 |
| d26x26-master | 0 | 30 | 0 | 0 | 0/30 |
| d26x26-nightmare | 0 | 30 | 0 | 0 | 0/30 |
| d26x26-hell-1 | 0 | 1 | 29 | 0 | 29/30 |
| d26x26-hell-2 | 0 | 0 | 30 | 0 | 30/30 |
| d26x26-hell-3 | 0 | 0 | 30 | 0 | 30/30 |
| d32x21-hard | 28 | 2 | 0 | 0 | 0/30 |
| d32x21-master | 1 | 29 | 0 | 0 | 0/30 |
| d32x21-nightmare | 0 | 30 | 0 | 0 | 0/30 |
| d32x21-hell-1 | 0 | 6 | 24 | 0 | 20/30 |
| d32x21-hell-2 | 0 | 0 | 30 | 0 | 30/30 |
| d32x21-hell-3 | 0 | 0 | 30 | 0 | 30/30 |
| dirr658-hard | 19 | 1 | 0 | 4 | 0/24 |
| dirr658-master | 8 | 12 | 0 | 4 | 0/24 |
| dirr658-nightmare | 0 | 30 | 0 | 0 | 0/30 |
| dirr658-hell-1 | 0 | 2 | 28 | 0 | 28/30 |
| dirr658-hell-2 | 0 | 0 | 30 | 0 | 30/30 |
| dirr658-hell-3 | 0 | 0 | 30 | 0 | 30/30 |

## Planning estimates (NOT measurements)

planning estimate (D39: 5 s + 4 x Node maximum); not a measurement; never enables a BQ flag

| Case | Node max T10 | Browser plan |
| --- | --- | --- |
| d26x26-hard | 1360 ms | 10.4 s |
| d26x26-master | 2409 ms | 14.6 s |
| d26x26-nightmare | 12.1 s | 53.6 s |
| d26x26-hell-1 | 24.9 s | 104.5 s |
| d26x26-hell-2 | 13.8 s | 60.1 s |
| d26x26-hell-3 | 7224 ms | 33.9 s |
| d32x21-hard | 1229 ms | 9.9 s |
| d32x21-master | 1126 ms | 9.5 s |
| d32x21-nightmare | 3499 ms | 19.0 s |
| d32x21-hell-1 | 18.4 s | 78.8 s |
| d32x21-hell-2 | 13.2 s | 58.0 s |
| d32x21-hell-3 | 5433 ms | 26.7 s |
| dirr658-hard | 3610 ms | 19.4 s |
| dirr658-master | 2566 ms | 15.3 s |
| dirr658-nightmare | 7532 ms | 35.1 s |
| dirr658-hell-1 | 42.0 s | 172.8 s |
| dirr658-hell-2 | 14.5 s | 63.0 s |
| dirr658-hell-3 | 5027 ms | 25.1 s |

Note: fresh process per row
