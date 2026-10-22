# Benchmark report: BQ-1 (node)

Node screening evidence only. It never replaces browser measurements and enables no BQ limit.

| Field | Value |
| --- | --- |
| Source commit | 59487235a112be6d0f349521392197171cec5faf+uncommitted-changes |
| Source digest | ad96b258e7eb6432f166321a3e37c7c18774ea5a8af69a084193d41902e2bf96 |
| Versions | {"algo":"gen-v2","policy":"mixed-v2","rng":"xoshiro128ss-v1","model":"difficulty-v2","app":"1.0.0"} |
| Platform | win32 10.0.26300 x64 / node v24.21.0 |
| Workers | 4 |
| Pool lifecycle | cold |
| Started | 2026-10-22T17:36:52.349Z |
| Finished | 2026-10-22T17:47:06.493Z |
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
| d24x24-hard | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 378 ms | 1084 ms | 1186 ms | 1186 ms | 1320 ms | 231.9 MiB | 38.1 MiB | node-screening-only |
| d24x24-master | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 394 ms | 883 ms | 1004 ms | 1004 ms | 1149 ms | 287.0 MiB | 77.8 MiB | node-screening-only |
| d24x24-nightmare | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 441 ms | 2127 ms | 6919 ms | 6919 ms | 7075 ms | 397.8 MiB | 134.0 MiB | node-screening-only |
| d24x24-hell-1 | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 4198 ms | 15.5 s | 16.5 s | 16.5 s | 16.7 s | 423.1 MiB | 165.7 MiB | node-screening-only |
| d24x24-hell-2 | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 2132 ms | 6830 ms | 8421 ms | 8421 ms | 8551 ms | 451.7 MiB | 200.3 MiB | node-screening-only |
| d24x24-hell-3 | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 1234 ms | 3812 ms | 4864 ms | 4864 ms | 4981 ms | 552.0 MiB | 244.9 MiB | node-screening-only |
| d32x18-hard | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 302 ms | 806 ms | 818 ms | 818 ms | 991 ms | 252.5 MiB | 32.0 MiB | node-screening-only |
| d32x18-master | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 332 ms | 786 ms | 837 ms | 837 ms | 962 ms | 268.7 MiB | 69.9 MiB | node-screening-only |
| d32x18-nightmare | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 489 ms | 1432 ms | 2976 ms | 2976 ms | 3148 ms | 418.0 MiB | 125.5 MiB | node-screening-only |
| d32x18-hell-1 | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 3460 ms | 16.8 s | 18.1 s | 18.1 s | 18.3 s | 417.2 MiB | 156.2 MiB | node-screening-only |
| d32x18-hell-2 | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 2514 ms | 7351 ms | 9036 ms | 9036 ms | 9210 ms | 501.1 MiB | 209.7 MiB | node-screening-only |
| d32x18-hell-3 | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 1137 ms | 3252 ms | 3425 ms | 3425 ms | 3537 ms | 584.3 MiB | 226.5 MiB | node-screening-only |
| dirr558-hard | 3/3 | 1/3 (33.3%) | 3/3 (100.0%) | 292 ms | 1978 ms | 1978 ms | 1978 ms | 2146 ms | 411.0 MiB | 39.8 MiB | fail |
| dirr558-master | 3/3 | 2/3 (66.7%) | 3/3 (100.0%) | 337 ms | 1887 ms | 1911 ms | 1911 ms | 2037 ms | 407.6 MiB | 77.0 MiB | fail |
| dirr558-nightmare | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 3201 ms | 41.6 s | 91.8 s | 91.8 s | 91.9 s | 409.3 MiB | 128.9 MiB | node-screening-only |
| dirr558-hell-1 | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 3587 ms | 26.5 s | 48.5 s | 48.5 s | 48.7 s | 416.7 MiB | 151.4 MiB | node-screening-only |
| dirr558-hell-2 | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 1559 ms | 6175 ms | 10.1 s | 10.1 s | 10.3 s | 429.2 MiB | 174.1 MiB | node-screening-only |
| dirr558-hell-3 | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 1252 ms | 3620 ms | 3674 ms | 3674 ms | 3809 ms | 504.9 MiB | 197.0 MiB | node-screening-only |

\* conditional on completed runs; n per cell: d24x24-hard 3, d24x24-master 3, d24x24-nightmare 3, d24x24-hell-1 3, d24x24-hell-2 3, d24x24-hell-3 3, d32x18-hard 3, d32x18-master 3, d32x18-nightmare 3, d32x18-hell-1 3, d32x18-hell-2 3, d32x18-hell-3 3, dirr558-hard 1, dirr558-master 2, dirr558-nightmare 3, dirr558-hell-1 3, dirr558-hell-2 3, dirr558-hell-3 3

## Criteria checks

| Case | Check | Status | Value | Limit | Note |
| --- | --- | --- | --- | --- | --- |
| d24x24-hard | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d24x24-hard | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d24x24-hard | T10 median, conditional on complete runs | pass | 1084.178 | <= 60000 ms | n = 3 |
| d24x24-hard | T10 p95 (nearest rank), conditional on complete runs | pass | 1185.883 | <= 115000 ms | n = 3 |
| d24x24-hard | Longest response of any ordinary run | pass | 1320.021 | <= 120000 ms |  |
| d24x24-hard | Real peak memory of the whole process (tab/process plus workers) | pass | 243175424 | <= 1610612736 bytes |  |
| d24x24-hard | Accounted worker and main buffers within the design budgets | pass | 39959436 | <= 1254096896 bytes |  |
| d24x24-hard | No model-too-large error | pass | 0 | 0 |  |
| d24x24-hard | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| d24x24-hard | Cancel settles quickly (separate probe, excluded from statistics) | pass | 45.672 | < 200 ms | 1 probe(s) |
| d24x24-master | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d24x24-master | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d24x24-master | T10 median, conditional on complete runs | pass | 882.699 | <= 60000 ms | n = 3 |
| d24x24-master | T10 p95 (nearest rank), conditional on complete runs | pass | 1004.304 | <= 115000 ms | n = 3 |
| d24x24-master | Longest response of any ordinary run | pass | 1148.729 | <= 120000 ms |  |
| d24x24-master | Real peak memory of the whole process (tab/process plus workers) | pass | 300957696 | <= 1610612736 bytes |  |
| d24x24-master | Accounted worker and main buffers within the design budgets | pass | 81549915 | <= 1254096896 bytes |  |
| d24x24-master | No model-too-large error | pass | 0 | 0 |  |
| d24x24-master | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| d24x24-master | Cancel settles quickly (separate probe, excluded from statistics) | pass | 19.071 | < 200 ms | 1 probe(s) |
| d24x24-nightmare | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d24x24-nightmare | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d24x24-nightmare | T10 median, conditional on complete runs | pass | 2127.423 | <= 60000 ms | n = 3 |
| d24x24-nightmare | T10 p95 (nearest rank), conditional on complete runs | pass | 6918.963 | <= 115000 ms | n = 3 |
| d24x24-nightmare | Longest response of any ordinary run | pass | 7074.508 | <= 120000 ms |  |
| d24x24-nightmare | Real peak memory of the whole process (tab/process plus workers) | pass | 417116160 | <= 1610612736 bytes |  |
| d24x24-nightmare | Accounted worker and main buffers within the design budgets | pass | 140464845 | <= 1254096896 bytes |  |
| d24x24-nightmare | No model-too-large error | pass | 0 | 0 |  |
| d24x24-nightmare | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| d24x24-nightmare | Cancel settles quickly (separate probe, excluded from statistics) | pass | 26.201 | < 200 ms | 1 probe(s) |
| d24x24-hell-1 | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d24x24-hell-1 | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d24x24-hell-1 | T10 median, conditional on complete runs | pass | 15494.865 | <= 60000 ms | n = 3 |
| d24x24-hell-1 | T10 p95 (nearest rank), conditional on complete runs | pass | 16540.95 | <= 115000 ms | n = 3 |
| d24x24-hell-1 | Longest response of any ordinary run | pass | 16688.534 | <= 120000 ms |  |
| d24x24-hell-1 | Real peak memory of the whole process (tab/process plus workers) | pass | 443670528 | <= 1610612736 bytes |  |
| d24x24-hell-1 | Accounted worker and main buffers within the design budgets | pass | 173724882 | <= 1254096896 bytes |  |
| d24x24-hell-1 | No model-too-large error | pass | 0 | 0 |  |
| d24x24-hell-1 | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| d24x24-hell-1 | Cancel settles quickly (separate probe, excluded from statistics) | pass | 22.02 | < 200 ms | 1 probe(s) |
| d24x24-hell-2 | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d24x24-hell-2 | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d24x24-hell-2 | T10 median, conditional on complete runs | pass | 6829.54 | <= 60000 ms | n = 3 |
| d24x24-hell-2 | T10 p95 (nearest rank), conditional on complete runs | pass | 8420.952 | <= 115000 ms | n = 3 |
| d24x24-hell-2 | Longest response of any ordinary run | pass | 8550.565 | <= 120000 ms |  |
| d24x24-hell-2 | Real peak memory of the whole process (tab/process plus workers) | pass | 473591808 | <= 1610612736 bytes |  |
| d24x24-hell-2 | Accounted worker and main buffers within the design budgets | pass | 210029659 | <= 1254096896 bytes |  |
| d24x24-hell-2 | No model-too-large error | pass | 0 | 0 |  |
| d24x24-hell-2 | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| d24x24-hell-2 | Cancel settles quickly (separate probe, excluded from statistics) | pass | 32.955 | < 200 ms | 1 probe(s) |
| d24x24-hell-3 | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d24x24-hell-3 | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d24x24-hell-3 | T10 median, conditional on complete runs | pass | 3811.636 | <= 60000 ms | n = 3 |
| d24x24-hell-3 | T10 p95 (nearest rank), conditional on complete runs | pass | 4864.004 | <= 115000 ms | n = 3 |
| d24x24-hell-3 | Longest response of any ordinary run | pass | 4980.597 | <= 120000 ms |  |
| d24x24-hell-3 | Real peak memory of the whole process (tab/process plus workers) | pass | 578818048 | <= 1610612736 bytes |  |
| d24x24-hell-3 | Accounted worker and main buffers within the design budgets | pass | 256758496 | <= 1254096896 bytes |  |
| d24x24-hell-3 | No model-too-large error | pass | 0 | 0 |  |
| d24x24-hell-3 | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| d24x24-hell-3 | Cancel settles quickly (separate probe, excluded from statistics) | pass | 38.795 | < 200 ms | 1 probe(s) |
| d32x18-hard | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d32x18-hard | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d32x18-hard | T10 median, conditional on complete runs | pass | 806.327 | <= 60000 ms | n = 3 |
| d32x18-hard | T10 p95 (nearest rank), conditional on complete runs | pass | 818.194 | <= 115000 ms | n = 3 |
| d32x18-hard | Longest response of any ordinary run | pass | 990.981 | <= 120000 ms |  |
| d32x18-hard | Real peak memory of the whole process (tab/process plus workers) | pass | 264740864 | <= 1610612736 bytes |  |
| d32x18-hard | Accounted worker and main buffers within the design budgets | pass | 33606531 | <= 1254096896 bytes |  |
| d32x18-hard | No model-too-large error | pass | 0 | 0 |  |
| d32x18-hard | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| d32x18-hard | Cancel settles quickly (separate probe, excluded from statistics) | pass | 25.873 | < 200 ms | 1 probe(s) |
| d32x18-master | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d32x18-master | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d32x18-master | T10 median, conditional on complete runs | pass | 786.408 | <= 60000 ms | n = 3 |
| d32x18-master | T10 p95 (nearest rank), conditional on complete runs | pass | 836.788 | <= 115000 ms | n = 3 |
| d32x18-master | Longest response of any ordinary run | pass | 961.504 | <= 120000 ms |  |
| d32x18-master | Real peak memory of the whole process (tab/process plus workers) | pass | 281780224 | <= 1610612736 bytes |  |
| d32x18-master | Accounted worker and main buffers within the design budgets | pass | 73332480 | <= 1254096896 bytes |  |
| d32x18-master | No model-too-large error | pass | 0 | 0 |  |
| d32x18-master | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| d32x18-master | Cancel settles quickly (separate probe, excluded from statistics) | pass | 21.546 | < 200 ms | 1 probe(s) |
| d32x18-nightmare | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d32x18-nightmare | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d32x18-nightmare | T10 median, conditional on complete runs | pass | 1432.313 | <= 60000 ms | n = 3 |
| d32x18-nightmare | T10 p95 (nearest rank), conditional on complete runs | pass | 2976.111 | <= 115000 ms | n = 3 |
| d32x18-nightmare | Longest response of any ordinary run | pass | 3148.337 | <= 120000 ms |  |
| d32x18-nightmare | Real peak memory of the whole process (tab/process plus workers) | pass | 438353920 | <= 1610612736 bytes |  |
| d32x18-nightmare | Accounted worker and main buffers within the design budgets | pass | 131640023 | <= 1254096896 bytes |  |
| d32x18-nightmare | No model-too-large error | pass | 0 | 0 |  |
| d32x18-nightmare | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| d32x18-nightmare | Cancel settles quickly (separate probe, excluded from statistics) | pass | 40.464 | < 200 ms | 1 probe(s) |
| d32x18-hell-1 | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d32x18-hell-1 | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d32x18-hell-1 | T10 median, conditional on complete runs | pass | 16805.65 | <= 60000 ms | n = 3 |
| d32x18-hell-1 | T10 p95 (nearest rank), conditional on complete runs | pass | 18149.928 | <= 115000 ms | n = 3 |
| d32x18-hell-1 | Longest response of any ordinary run | pass | 18306.536 | <= 120000 ms |  |
| d32x18-hell-1 | Real peak memory of the whole process (tab/process plus workers) | pass | 437428224 | <= 1610612736 bytes |  |
| d32x18-hell-1 | Accounted worker and main buffers within the design budgets | pass | 163839397 | <= 1254096896 bytes |  |
| d32x18-hell-1 | No model-too-large error | pass | 0 | 0 |  |
| d32x18-hell-1 | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| d32x18-hell-1 | Cancel settles quickly (separate probe, excluded from statistics) | pass | 26.578 | < 200 ms | 1 probe(s) |
| d32x18-hell-2 | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d32x18-hell-2 | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d32x18-hell-2 | T10 median, conditional on complete runs | pass | 7350.891 | <= 60000 ms | n = 3 |
| d32x18-hell-2 | T10 p95 (nearest rank), conditional on complete runs | pass | 9036.237 | <= 115000 ms | n = 3 |
| d32x18-hell-2 | Longest response of any ordinary run | pass | 9210.233 | <= 120000 ms |  |
| d32x18-hell-2 | Real peak memory of the whole process (tab/process plus workers) | pass | 525438976 | <= 1610612736 bytes |  |
| d32x18-hell-2 | Accounted worker and main buffers within the design budgets | pass | 219929083 | <= 1254096896 bytes |  |
| d32x18-hell-2 | No model-too-large error | pass | 0 | 0 |  |
| d32x18-hell-2 | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| d32x18-hell-2 | Cancel settles quickly (separate probe, excluded from statistics) | pass | 28.142 | < 200 ms | 1 probe(s) |
| d32x18-hell-3 | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d32x18-hell-3 | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d32x18-hell-3 | T10 median, conditional on complete runs | pass | 3251.994 | <= 60000 ms | n = 3 |
| d32x18-hell-3 | T10 p95 (nearest rank), conditional on complete runs | pass | 3425.149 | <= 115000 ms | n = 3 |
| d32x18-hell-3 | Longest response of any ordinary run | pass | 3536.867 | <= 120000 ms |  |
| d32x18-hell-3 | Real peak memory of the whole process (tab/process plus workers) | pass | 612724736 | <= 1610612736 bytes |  |
| d32x18-hell-3 | Accounted worker and main buffers within the design budgets | pass | 237509385 | <= 1254096896 bytes |  |
| d32x18-hell-3 | No model-too-large error | pass | 0 | 0 |  |
| d32x18-hell-3 | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| d32x18-hell-3 | Cancel settles quickly (separate probe, excluded from statistics) | pass | 23.663 | < 200 ms | 1 probe(s) |
| dirr558-hard | Runs with 10 of 10 puzzles (all ordinary runs) | fail | 0.333 | >= 0.9 | 1 of 3 |
| dirr558-hard | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| dirr558-hard | T10 median, conditional on complete runs | pass | 1978.09 | <= 60000 ms | n = 1 |
| dirr558-hard | T10 p95 (nearest rank), conditional on complete runs | pass | 1978.09 | <= 115000 ms | n = 1 |
| dirr558-hard | Longest response of any ordinary run | pass | 2146.223 | <= 120000 ms |  |
| dirr558-hard | Real peak memory of the whole process (tab/process plus workers) | pass | 430927872 | <= 1610612736 bytes |  |
| dirr558-hard | Accounted worker and main buffers within the design budgets | pass | 41750039 | <= 1254096896 bytes |  |
| dirr558-hard | No model-too-large error | pass | 0 | 0 |  |
| dirr558-hard | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| dirr558-hard | Cancel settles quickly (separate probe, excluded from statistics) | pass | 19.262 | < 200 ms | 1 probe(s) |
| dirr558-master | Runs with 10 of 10 puzzles (all ordinary runs) | fail | 0.667 | >= 0.9 | 2 of 3 |
| dirr558-master | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| dirr558-master | T10 median, conditional on complete runs | pass | 1886.816 | <= 60000 ms | n = 2 |
| dirr558-master | T10 p95 (nearest rank), conditional on complete runs | pass | 1910.73 | <= 115000 ms | n = 2 |
| dirr558-master | Longest response of any ordinary run | pass | 2036.901 | <= 120000 ms |  |
| dirr558-master | Real peak memory of the whole process (tab/process plus workers) | pass | 427450368 | <= 1610612736 bytes |  |
| dirr558-master | Accounted worker and main buffers within the design budgets | pass | 80749302 | <= 1254096896 bytes |  |
| dirr558-master | No model-too-large error | pass | 0 | 0 |  |
| dirr558-master | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| dirr558-master | Cancel settles quickly (separate probe, excluded from statistics) | pass | 28.071 | < 200 ms | 1 probe(s) |
| dirr558-nightmare | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| dirr558-nightmare | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| dirr558-nightmare | T10 median, conditional on complete runs | pass | 41645.975 | <= 60000 ms | n = 3 |
| dirr558-nightmare | T10 p95 (nearest rank), conditional on complete runs | pass | 91775.911 | <= 115000 ms | n = 3 |
| dirr558-nightmare | Longest response of any ordinary run | pass | 91937.751 | <= 120000 ms |  |
| dirr558-nightmare | Real peak memory of the whole process (tab/process plus workers) | pass | 429215744 | <= 1610612736 bytes |  |
| dirr558-nightmare | Accounted worker and main buffers within the design budgets | pass | 135119991 | <= 1254096896 bytes |  |
| dirr558-nightmare | No model-too-large error | pass | 0 | 0 |  |
| dirr558-nightmare | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| dirr558-nightmare | Cancel settles quickly (separate probe, excluded from statistics) | pass | 32.652 | < 200 ms | 1 probe(s) |
| dirr558-hell-1 | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| dirr558-hell-1 | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| dirr558-hell-1 | T10 median, conditional on complete runs | pass | 26491.319 | <= 60000 ms | n = 3 |
| dirr558-hell-1 | T10 p95 (nearest rank), conditional on complete runs | pass | 48542.463 | <= 115000 ms | n = 3 |
| dirr558-hell-1 | Longest response of any ordinary run | pass | 48692.69 | <= 120000 ms |  |
| dirr558-hell-1 | Real peak memory of the whole process (tab/process plus workers) | pass | 436912128 | <= 1610612736 bytes |  |
| dirr558-hell-1 | Accounted worker and main buffers within the design budgets | pass | 158771612 | <= 1254096896 bytes |  |
| dirr558-hell-1 | No model-too-large error | pass | 0 | 0 |  |
| dirr558-hell-1 | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| dirr558-hell-1 | Cancel settles quickly (separate probe, excluded from statistics) | pass | 20.764 | < 200 ms | 1 probe(s) |
| dirr558-hell-2 | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| dirr558-hell-2 | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| dirr558-hell-2 | T10 median, conditional on complete runs | pass | 6175.27 | <= 60000 ms | n = 3 |
| dirr558-hell-2 | T10 p95 (nearest rank), conditional on complete runs | pass | 10130.878 | <= 115000 ms | n = 3 |
| dirr558-hell-2 | Longest response of any ordinary run | pass | 10280.924 | <= 120000 ms |  |
| dirr558-hell-2 | Real peak memory of the whole process (tab/process plus workers) | pass | 450064384 | <= 1610612736 bytes |  |
| dirr558-hell-2 | Accounted worker and main buffers within the design budgets | pass | 182525703 | <= 1254096896 bytes |  |
| dirr558-hell-2 | No model-too-large error | pass | 0 | 0 |  |
| dirr558-hell-2 | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| dirr558-hell-2 | Cancel settles quickly (separate probe, excluded from statistics) | pass | 26.496 | < 200 ms | 1 probe(s) |
| dirr558-hell-3 | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| dirr558-hell-3 | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| dirr558-hell-3 | T10 median, conditional on complete runs | pass | 3619.811 | <= 60000 ms | n = 3 |
| dirr558-hell-3 | T10 p95 (nearest rank), conditional on complete runs | pass | 3674.102 | <= 115000 ms | n = 3 |
| dirr558-hell-3 | Longest response of any ordinary run | pass | 3809.159 | <= 120000 ms |  |
| dirr558-hell-3 | Real peak memory of the whole process (tab/process plus workers) | pass | 529403904 | <= 1610612736 bytes |  |
| dirr558-hell-3 | Accounted worker and main buffers within the design budgets | pass | 206567192 | <= 1254096896 bytes |  |
| dirr558-hell-3 | No model-too-large error | pass | 0 | 0 |  |
| dirr558-hell-3 | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| dirr558-hell-3 | Cancel settles quickly (separate probe, excluded from statistics) | pass | 29.048 | < 200 ms | 1 probe(s) |

## Probe rows (excluded from the statistics)

| Probe | Case | Seed | Accepted | Cancel latency | Response | Reason | Valid | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cancel | d24x24-hard | bq1/d24x24-hard/cancel | 1 | 46 ms | 620 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | d24x24-master | bq1/d24x24-master/cancel | 1 | 19 ms | 371 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | d24x24-nightmare | bq1/d24x24-nightmare/cancel | 1 | 26 ms | 472 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | d24x24-hell-1 | bq1/d24x24-hell-1/cancel | 1 | 22 ms | 4229 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | d24x24-hell-2 | bq1/d24x24-hell-2/cancel | 1 | 33 ms | 1536 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | d24x24-hell-3 | bq1/d24x24-hell-3/cancel | 1 | 39 ms | 1471 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | d32x18-hard | bq1/d32x18-hard/cancel | 1 | 26 ms | 306 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | d32x18-master | bq1/d32x18-master/cancel | 1 | 22 ms | 431 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | d32x18-nightmare | bq1/d32x18-nightmare/cancel | 1 | 40 ms | 2928 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | d32x18-hell-1 | bq1/d32x18-hell-1/cancel | 1 | 27 ms | 4368 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | d32x18-hell-2 | bq1/d32x18-hell-2/cancel | 1 | 28 ms | 1667 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | d32x18-hell-3 | bq1/d32x18-hell-3/cancel | 1 | 24 ms | 1472 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | dirr558-hard | bq1/dirr558-hard/cancel | 1 | 19 ms | 324 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | dirr558-master | bq1/dirr558-master/cancel | 1 | 28 ms | 330 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | dirr558-nightmare | bq1/dirr558-nightmare/cancel | 1 | 33 ms | 492 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | dirr558-hell-1 | bq1/dirr558-hell-1/cancel | 1 | 21 ms | 3373 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | dirr558-hell-2 | bq1/dirr558-hell-2/cancel | 1 | 26 ms | 1877 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | dirr558-hell-3 | bq1/dirr558-hell-3/cancel | 1 | 29 ms | 953 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |

## Certificates (accepted puzzles of ordinary runs)

| Case | unique | multiple | not proved | not checked | saturated ratings |
| --- | --- | --- | --- | --- | --- |
| d24x24-hard | 23 | 7 | 0 | 0 | 0/30 |
| d24x24-master | 1 | 29 | 0 | 0 | 0/30 |
| d24x24-nightmare | 0 | 30 | 0 | 0 | 0/30 |
| d24x24-hell-1 | 0 | 0 | 30 | 0 | 30/30 |
| d24x24-hell-2 | 0 | 0 | 30 | 0 | 30/30 |
| d24x24-hell-3 | 0 | 0 | 30 | 0 | 29/30 |
| d32x18-hard | 27 | 3 | 0 | 0 | 0/30 |
| d32x18-master | 0 | 30 | 0 | 0 | 0/30 |
| d32x18-nightmare | 0 | 30 | 0 | 0 | 0/30 |
| d32x18-hell-1 | 0 | 0 | 30 | 0 | 30/30 |
| d32x18-hell-2 | 0 | 0 | 30 | 0 | 30/30 |
| d32x18-hell-3 | 0 | 0 | 30 | 0 | 30/30 |
| dirr558-hard | 10 | 0 | 0 | 8 | 0/18 |
| dirr558-master | 2 | 18 | 0 | 4 | 0/24 |
| dirr558-nightmare | 0 | 30 | 0 | 0 | 0/30 |
| dirr558-hell-1 | 0 | 0 | 30 | 0 | 30/30 |
| dirr558-hell-2 | 0 | 0 | 30 | 0 | 30/30 |
| dirr558-hell-3 | 0 | 0 | 30 | 0 | 30/30 |

## Planning estimates (NOT measurements)

planning estimate (D39: 5 s + 4 x Node maximum); not a measurement; never enables a BQ flag

| Case | Node max T10 | Browser plan |
| --- | --- | --- |
| d24x24-hard | 1186 ms | 9.7 s |
| d24x24-master | 1004 ms | 9.0 s |
| d24x24-nightmare | 6919 ms | 32.7 s |
| d24x24-hell-1 | 16.5 s | 71.2 s |
| d24x24-hell-2 | 8421 ms | 38.7 s |
| d24x24-hell-3 | 4864 ms | 24.5 s |
| d32x18-hard | 818 ms | 8.3 s |
| d32x18-master | 837 ms | 8.3 s |
| d32x18-nightmare | 2976 ms | 16.9 s |
| d32x18-hell-1 | 18.1 s | 77.6 s |
| d32x18-hell-2 | 9036 ms | 41.1 s |
| d32x18-hell-3 | 3425 ms | 18.7 s |
| dirr558-hard | 1978 ms | 12.9 s |
| dirr558-master | 1911 ms | 12.6 s |
| dirr558-nightmare | 91.8 s | 372.1 s |
| dirr558-hell-1 | 48.5 s | 199.2 s |
| dirr558-hell-2 | 10.1 s | 45.5 s |
| dirr558-hell-3 | 3674 ms | 19.7 s |

Note: fresh process per row
