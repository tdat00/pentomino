# Benchmark report: BQ-3 (node)

Node screening evidence only. It never replaces browser measurements and enables no BQ limit.

| Field | Value |
| --- | --- |
| Source commit | 59487235a112be6d0f349521392197171cec5faf+uncommitted-changes |
| Source digest | ad96b258e7eb6432f166321a3e37c7c18774ea5a8af69a084193d41902e2bf96 |
| Versions | {"algo":"gen-v2","policy":"mixed-v2","rng":"xoshiro128ss-v1","model":"difficulty-v2","app":"1.0.0"} |
| Platform | win32 10.0.26300 x64 / node v24.21.0 |
| Workers | 4 |
| Pool lifecycle | cold |
| Started | 2026-10-22T18:01:30.212Z |
| Finished | 2026-10-22T18:08:05.818Z |
| Rows recorded / requested | 56 / 56 |
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
| pheart363-hard | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 214 ms | 706 ms | 890 ms | 890 ms | 1002 ms | 254.2 MiB | 22.3 MiB | node-screening-only |
| pheart363-nightmare | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 1095 ms | 3375 ms | 8415 ms | 8415 ms | 8550 ms | 264.9 MiB | 47.5 MiB | node-screening-only |
| pheart363-hell-1 | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 1080 ms | 4368 ms | 4991 ms | 4991 ms | 5142 ms | 288.1 MiB | 63.9 MiB | node-screening-only |
| pheart363-hell-2 | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 724 ms | 2388 ms | 2488 ms | 2488 ms | 2603 ms | 331.6 MiB | 81.4 MiB | node-screening-only |
| p22x22-hard | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 253 ms | 666 ms | 709 ms | 709 ms | 872 ms | 257.8 MiB | 38.2 MiB | node-screening-only |
| p22x22-nightmare | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 451 ms | 4607 ms | 4796 ms | 4796 ms | 4961 ms | 363.1 MiB | 93.2 MiB | node-screening-only |
| p22x22-hell-1 | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 2894 ms | 9244 ms | 9852 ms | 9852 ms | 9985 ms | 345.6 MiB | 123.9 MiB | node-screening-only |
| p22x22-hell-2 | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 1408 ms | 4692 ms | 5336 ms | 5336 ms | 5468 ms | 449.7 MiB | 154.3 MiB | node-screening-only |
| p22x22-hell-3 | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 10.5 s | 12.6 s | 18.0 s | 18.0 s | 18.1 s | 537.4 MiB | 165.2 MiB | node-screening-only |
| pirr466-hard | 3/3 | 2/3 (66.7%) | 3/3 (100.0%) | 264 ms | 1499 ms | 1534 ms | 1534 ms | 1672 ms | 358.4 MiB | 27.0 MiB | fail |
| pirr466-nightmare | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 344 ms | 17.5 s | 24.2 s | 24.2 s | 24.4 s | 410.0 MiB | 82.8 MiB | node-screening-only |
| pirr466-hell-1 | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 2314 ms | 17.0 s | 30.6 s | 30.6 s | 30.8 s | 361.7 MiB | 104.8 MiB | node-screening-only |
| pirr466-hell-2 | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 1190 ms | 4160 ms | 6841 ms | 6841 ms | 6990 ms | 354.3 MiB | 125.1 MiB | node-screening-only |
| pirr466-hell-3 | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 7861 ms | 17.5 s | 19.6 s | 19.6 s | 19.8 s | 479.6 MiB | 145.4 MiB | node-screening-only |

\* conditional on completed runs; n per cell: pheart363-hard 3, pheart363-nightmare 3, pheart363-hell-1 3, pheart363-hell-2 3, p22x22-hard 3, p22x22-nightmare 3, p22x22-hell-1 3, p22x22-hell-2 3, p22x22-hell-3 3, pirr466-hard 2, pirr466-nightmare 3, pirr466-hell-1 3, pirr466-hell-2 3, pirr466-hell-3 3

## Criteria checks

| Case | Check | Status | Value | Limit | Note |
| --- | --- | --- | --- | --- | --- |
| pheart363-hard | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| pheart363-hard | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| pheart363-hard | T10 median, conditional on complete runs | pass | 706.019 | <= 60000 ms | n = 3 |
| pheart363-hard | T10 p95 (nearest rank), conditional on complete runs | pass | 890.216 | <= 115000 ms | n = 3 |
| pheart363-hard | Longest response of any ordinary run | pass | 1001.531 | <= 120000 ms |  |
| pheart363-hard | Real peak memory of the whole process (tab/process plus workers) | pass | 266551296 | <= 1610612736 bytes |  |
| pheart363-hard | Accounted worker and main buffers within the design budgets | pass | 23361460 | <= 1254096896 bytes |  |
| pheart363-hard | No model-too-large error | pass | 0 | 0 |  |
| pheart363-hard | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| pheart363-hard | Cancel settles quickly (separate probe, excluded from statistics) | pass | 15.533 | < 200 ms | 1 probe(s) |
| pheart363-nightmare | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| pheart363-nightmare | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| pheart363-nightmare | T10 median, conditional on complete runs | pass | 3374.889 | <= 60000 ms | n = 3 |
| pheart363-nightmare | T10 p95 (nearest rank), conditional on complete runs | pass | 8415.075 | <= 115000 ms | n = 3 |
| pheart363-nightmare | Longest response of any ordinary run | pass | 8550.145 | <= 120000 ms |  |
| pheart363-nightmare | Real peak memory of the whole process (tab/process plus workers) | pass | 277794816 | <= 1610612736 bytes |  |
| pheart363-nightmare | Accounted worker and main buffers within the design budgets | pass | 49796269 | <= 1254096896 bytes |  |
| pheart363-nightmare | No model-too-large error | pass | 0 | 0 |  |
| pheart363-nightmare | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| pheart363-nightmare | Cancel settles quickly (separate probe, excluded from statistics) | pass | 31.648 | < 200 ms | 1 probe(s) |
| pheart363-hell-1 | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| pheart363-hell-1 | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| pheart363-hell-1 | T10 median, conditional on complete runs | pass | 4367.821 | <= 60000 ms | n = 3 |
| pheart363-hell-1 | T10 p95 (nearest rank), conditional on complete runs | pass | 4990.795 | <= 115000 ms | n = 3 |
| pheart363-hell-1 | Longest response of any ordinary run | pass | 5141.738 | <= 120000 ms |  |
| pheart363-hell-1 | Real peak memory of the whole process (tab/process plus workers) | pass | 302092288 | <= 1610612736 bytes |  |
| pheart363-hell-1 | Accounted worker and main buffers within the design budgets | pass | 67047815 | <= 1254096896 bytes |  |
| pheart363-hell-1 | No model-too-large error | pass | 0 | 0 |  |
| pheart363-hell-1 | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| pheart363-hell-1 | Cancel settles quickly (separate probe, excluded from statistics) | pass | 17.488 | < 200 ms | 1 probe(s) |
| pheart363-hell-2 | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| pheart363-hell-2 | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| pheart363-hell-2 | T10 median, conditional on complete runs | pass | 2387.958 | <= 60000 ms | n = 3 |
| pheart363-hell-2 | T10 p95 (nearest rank), conditional on complete runs | pass | 2487.625 | <= 115000 ms | n = 3 |
| pheart363-hell-2 | Longest response of any ordinary run | pass | 2603.121 | <= 120000 ms |  |
| pheart363-hell-2 | Real peak memory of the whole process (tab/process plus workers) | pass | 347705344 | <= 1610612736 bytes |  |
| pheart363-hell-2 | Accounted worker and main buffers within the design budgets | pass | 85364126 | <= 1254096896 bytes |  |
| pheart363-hell-2 | No model-too-large error | pass | 0 | 0 |  |
| pheart363-hell-2 | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| pheart363-hell-2 | Cancel settles quickly (separate probe, excluded from statistics) | pass | 30.211 | < 200 ms | 1 probe(s) |
| p22x22-hard | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| p22x22-hard | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| p22x22-hard | T10 median, conditional on complete runs | pass | 666.085 | <= 60000 ms | n = 3 |
| p22x22-hard | T10 p95 (nearest rank), conditional on complete runs | pass | 708.668 | <= 115000 ms | n = 3 |
| p22x22-hard | Longest response of any ordinary run | pass | 871.982 | <= 120000 ms |  |
| p22x22-hard | Real peak memory of the whole process (tab/process plus workers) | pass | 270311424 | <= 1610612736 bytes |  |
| p22x22-hard | Accounted worker and main buffers within the design budgets | pass | 40058766 | <= 1254096896 bytes |  |
| p22x22-hard | No model-too-large error | pass | 0 | 0 |  |
| p22x22-hard | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| p22x22-hard | Cancel settles quickly (separate probe, excluded from statistics) | pass | 20.534 | < 200 ms | 1 probe(s) |
| p22x22-nightmare | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| p22x22-nightmare | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| p22x22-nightmare | T10 median, conditional on complete runs | pass | 4607.214 | <= 60000 ms | n = 3 |
| p22x22-nightmare | T10 p95 (nearest rank), conditional on complete runs | pass | 4795.784 | <= 115000 ms | n = 3 |
| p22x22-nightmare | Longest response of any ordinary run | pass | 4960.808 | <= 120000 ms |  |
| p22x22-nightmare | Real peak memory of the whole process (tab/process plus workers) | pass | 380739584 | <= 1610612736 bytes |  |
| p22x22-nightmare | Accounted worker and main buffers within the design budgets | pass | 97758676 | <= 1254096896 bytes |  |
| p22x22-nightmare | No model-too-large error | pass | 0 | 0 |  |
| p22x22-nightmare | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| p22x22-nightmare | Cancel settles quickly (separate probe, excluded from statistics) | pass | 19.934 | < 200 ms | 1 probe(s) |
| p22x22-hell-1 | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| p22x22-hell-1 | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| p22x22-hell-1 | T10 median, conditional on complete runs | pass | 9243.868 | <= 60000 ms | n = 3 |
| p22x22-hell-1 | T10 p95 (nearest rank), conditional on complete runs | pass | 9851.86 | <= 115000 ms | n = 3 |
| p22x22-hell-1 | Longest response of any ordinary run | pass | 9985.047 | <= 120000 ms |  |
| p22x22-hell-1 | Real peak memory of the whole process (tab/process plus workers) | pass | 362364928 | <= 1610612736 bytes |  |
| p22x22-hell-1 | Accounted worker and main buffers within the design budgets | pass | 129960547 | <= 1254096896 bytes |  |
| p22x22-hell-1 | No model-too-large error | pass | 0 | 0 |  |
| p22x22-hell-1 | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| p22x22-hell-1 | Cancel settles quickly (separate probe, excluded from statistics) | pass | 29.742 | < 200 ms | 1 probe(s) |
| p22x22-hell-2 | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| p22x22-hell-2 | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| p22x22-hell-2 | T10 median, conditional on complete runs | pass | 4692.052 | <= 60000 ms | n = 3 |
| p22x22-hell-2 | T10 p95 (nearest rank), conditional on complete runs | pass | 5335.639 | <= 115000 ms | n = 3 |
| p22x22-hell-2 | Longest response of any ordinary run | pass | 5468.297 | <= 120000 ms |  |
| p22x22-hell-2 | Real peak memory of the whole process (tab/process plus workers) | pass | 471506944 | <= 1610612736 bytes |  |
| p22x22-hell-2 | Accounted worker and main buffers within the design budgets | pass | 161833253 | <= 1254096896 bytes |  |
| p22x22-hell-2 | No model-too-large error | pass | 0 | 0 |  |
| p22x22-hell-2 | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| p22x22-hell-2 | Cancel settles quickly (separate probe, excluded from statistics) | pass | 27.101 | < 200 ms | 1 probe(s) |
| p22x22-hell-3 | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| p22x22-hell-3 | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| p22x22-hell-3 | T10 median, conditional on complete runs | pass | 12558.717 | <= 60000 ms | n = 3 |
| p22x22-hell-3 | T10 p95 (nearest rank), conditional on complete runs | pass | 17987.422 | <= 115000 ms | n = 3 |
| p22x22-hell-3 | Longest response of any ordinary run | pass | 18099.573 | <= 120000 ms |  |
| p22x22-hell-3 | Real peak memory of the whole process (tab/process plus workers) | pass | 563535872 | <= 1610612736 bytes |  |
| p22x22-hell-3 | Accounted worker and main buffers within the design budgets | pass | 173226489 | <= 1254096896 bytes |  |
| p22x22-hell-3 | No model-too-large error | pass | 0 | 0 |  |
| p22x22-hell-3 | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| p22x22-hell-3 | Cancel settles quickly (separate probe, excluded from statistics) | pass | 26.747 | < 200 ms | 1 probe(s) |
| pirr466-hard | Runs with 10 of 10 puzzles (all ordinary runs) | fail | 0.667 | >= 0.9 | 2 of 3 |
| pirr466-hard | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| pirr466-hard | T10 median, conditional on complete runs | pass | 1498.784 | <= 60000 ms | n = 2 |
| pirr466-hard | T10 p95 (nearest rank), conditional on complete runs | pass | 1534.226 | <= 115000 ms | n = 2 |
| pirr466-hard | Longest response of any ordinary run | pass | 1672.065 | <= 120000 ms |  |
| pirr466-hard | Real peak memory of the whole process (tab/process plus workers) | pass | 375853056 | <= 1610612736 bytes |  |
| pirr466-hard | Accounted worker and main buffers within the design budgets | pass | 28311844 | <= 1254096896 bytes |  |
| pirr466-hard | No model-too-large error | pass | 0 | 0 |  |
| pirr466-hard | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| pirr466-hard | Cancel settles quickly (separate probe, excluded from statistics) | pass | 14.08 | < 200 ms | 1 probe(s) |
| pirr466-nightmare | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| pirr466-nightmare | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| pirr466-nightmare | T10 median, conditional on complete runs | pass | 17460.691 | <= 60000 ms | n = 3 |
| pirr466-nightmare | T10 p95 (nearest rank), conditional on complete runs | pass | 24247.791 | <= 115000 ms | n = 3 |
| pirr466-nightmare | Longest response of any ordinary run | pass | 24375.565 | <= 120000 ms |  |
| pirr466-nightmare | Real peak memory of the whole process (tab/process plus workers) | pass | 429887488 | <= 1610612736 bytes |  |
| pirr466-nightmare | Accounted worker and main buffers within the design budgets | pass | 86855829 | <= 1254096896 bytes |  |
| pirr466-nightmare | No model-too-large error | pass | 0 | 0 |  |
| pirr466-nightmare | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| pirr466-nightmare | Cancel settles quickly (separate probe, excluded from statistics) | pass | 17.375 | < 200 ms | 1 probe(s) |
| pirr466-hell-1 | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| pirr466-hell-1 | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| pirr466-hell-1 | T10 median, conditional on complete runs | pass | 17028.598 | <= 60000 ms | n = 3 |
| pirr466-hell-1 | T10 p95 (nearest rank), conditional on complete runs | pass | 30648.969 | <= 115000 ms | n = 3 |
| pirr466-hell-1 | Longest response of any ordinary run | pass | 30823.394 | <= 120000 ms |  |
| pirr466-hell-1 | Real peak memory of the whole process (tab/process plus workers) | pass | 379293696 | <= 1610612736 bytes |  |
| pirr466-hell-1 | Accounted worker and main buffers within the design budgets | pass | 109882442 | <= 1254096896 bytes |  |
| pirr466-hell-1 | No model-too-large error | pass | 0 | 0 |  |
| pirr466-hell-1 | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| pirr466-hell-1 | Cancel settles quickly (separate probe, excluded from statistics) | pass | 22.716 | < 200 ms | 1 probe(s) |
| pirr466-hell-2 | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| pirr466-hell-2 | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| pirr466-hell-2 | T10 median, conditional on complete runs | pass | 4159.667 | <= 60000 ms | n = 3 |
| pirr466-hell-2 | T10 p95 (nearest rank), conditional on complete runs | pass | 6841.197 | <= 115000 ms | n = 3 |
| pirr466-hell-2 | Longest response of any ordinary run | pass | 6989.994 | <= 120000 ms |  |
| pirr466-hell-2 | Real peak memory of the whole process (tab/process plus workers) | pass | 371548160 | <= 1610612736 bytes |  |
| pirr466-hell-2 | Accounted worker and main buffers within the design budgets | pass | 131178490 | <= 1254096896 bytes |  |
| pirr466-hell-2 | No model-too-large error | pass | 0 | 0 |  |
| pirr466-hell-2 | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| pirr466-hell-2 | Cancel settles quickly (separate probe, excluded from statistics) | pass | 28.101 | < 200 ms | 1 probe(s) |
| pirr466-hell-3 | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| pirr466-hell-3 | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| pirr466-hell-3 | T10 median, conditional on complete runs | pass | 17486.289 | <= 60000 ms | n = 3 |
| pirr466-hell-3 | T10 p95 (nearest rank), conditional on complete runs | pass | 19630.406 | <= 115000 ms | n = 3 |
| pirr466-hell-3 | Longest response of any ordinary run | pass | 19771.188 | <= 120000 ms |  |
| pirr466-hell-3 | Real peak memory of the whole process (tab/process plus workers) | pass | 502886400 | <= 1610612736 bytes |  |
| pirr466-hell-3 | Accounted worker and main buffers within the design budgets | pass | 152428147 | <= 1254096896 bytes |  |
| pirr466-hell-3 | No model-too-large error | pass | 0 | 0 |  |
| pirr466-hell-3 | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| pirr466-hell-3 | Cancel settles quickly (separate probe, excluded from statistics) | pass | 21.899 | < 200 ms | 1 probe(s) |

## Probe rows (excluded from the statistics)

| Probe | Case | Seed | Accepted | Cancel latency | Response | Reason | Valid | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cancel | pheart363-hard | bq3/pheart363-hard/cancel | 1 | 16 ms | 244 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | pheart363-nightmare | bq3/pheart363-nightmare/cancel | 1 | 32 ms | 531 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | pheart363-hell-1 | bq3/pheart363-hell-1/cancel | 1 | 17 ms | 1047 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | pheart363-hell-2 | bq3/pheart363-hell-2/cancel | 1 | 30 ms | 871 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | p22x22-hard | bq3/p22x22-hard/cancel | 1 | 21 ms | 302 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | p22x22-nightmare | bq3/p22x22-nightmare/cancel | 1 | 20 ms | 368 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | p22x22-hell-1 | bq3/p22x22-hell-1/cancel | 1 | 30 ms | 1965 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | p22x22-hell-2 | bq3/p22x22-hell-2/cancel | 1 | 27 ms | 1738 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | p22x22-hell-3 | bq3/p22x22-hell-3/cancel | 1 | 27 ms | 6812 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | pirr466-hard | bq3/pirr466-hard/cancel | 1 | 14 ms | 281 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | pirr466-nightmare | bq3/pirr466-nightmare/cancel | 1 | 17 ms | 321 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | pirr466-hell-1 | bq3/pirr466-hell-1/cancel | 1 | 23 ms | 1992 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | pirr466-hell-2 | bq3/pirr466-hell-2/cancel | 1 | 28 ms | 1179 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | pirr466-hell-3 | bq3/pirr466-hell-3/cancel | 1 | 22 ms | 2482 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |

## Certificates (accepted puzzles of ordinary runs)

| Case | unique | multiple | not proved | not checked | saturated ratings |
| --- | --- | --- | --- | --- | --- |
| pheart363-hard | 24 | 6 | 0 | 0 | 0/30 |
| pheart363-nightmare | 0 | 18 | 12 | 0 | 6/30 |
| pheart363-hell-1 | 0 | 0 | 30 | 0 | 30/30 |
| pheart363-hell-2 | 0 | 0 | 30 | 0 | 30/30 |
| p22x22-hard | 17 | 13 | 0 | 0 | 0/30 |
| p22x22-nightmare | 0 | 29 | 1 | 0 | 0/30 |
| p22x22-hell-1 | 0 | 0 | 30 | 0 | 30/30 |
| p22x22-hell-2 | 0 | 0 | 30 | 0 | 30/30 |
| p22x22-hell-3 | 0 | 0 | 30 | 0 | 30/30 |
| pirr466-hard | 18 | 2 | 0 | 1 | 0/21 |
| pirr466-nightmare | 5 | 24 | 1 | 0 | 0/30 |
| pirr466-hell-1 | 0 | 0 | 30 | 0 | 30/30 |
| pirr466-hell-2 | 0 | 0 | 30 | 0 | 30/30 |
| pirr466-hell-3 | 0 | 0 | 30 | 0 | 30/30 |

## Planning estimates (NOT measurements)

planning estimate (D39: 5 s + 4 x Node maximum); not a measurement; never enables a BQ flag

| Case | Node max T10 | Browser plan |
| --- | --- | --- |
| pheart363-hard | 890 ms | 8.6 s |
| pheart363-nightmare | 8415 ms | 38.7 s |
| pheart363-hell-1 | 4991 ms | 25.0 s |
| pheart363-hell-2 | 2488 ms | 15.0 s |
| p22x22-hard | 709 ms | 7.8 s |
| p22x22-nightmare | 4796 ms | 24.2 s |
| p22x22-hell-1 | 9852 ms | 44.4 s |
| p22x22-hell-2 | 5336 ms | 26.3 s |
| p22x22-hell-3 | 18.0 s | 76.9 s |
| pirr466-hard | 1534 ms | 11.1 s |
| pirr466-nightmare | 24.2 s | 102.0 s |
| pirr466-hell-1 | 30.6 s | 127.6 s |
| pirr466-hell-2 | 6841 ms | 32.4 s |
| pirr466-hell-3 | 19.6 s | 83.5 s |

Note: fresh process per row
