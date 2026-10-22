# Benchmark report: smoke (node)

Node screening evidence only. It never replaces browser measurements and enables no BQ limit.

| Field | Value |
| --- | --- |
| Source commit | 01392d894d1dd711b1f1aae440077298046bc39a+uncommitted-changes |
| Source digest | e651b4730699e0cd8ae2c53c017df757e9d6f7e1ebbb2f2a159fc05599e0962a |
| Versions | {"algo":"gen-v2","policy":"mixed-v2","rng":"xoshiro128ss-v1","model":"difficulty-v2","app":"1.0.0"} |
| Platform | win32 10.0.26300 x64 / node v24.21.0 |
| Workers | 4 |
| Pool lifecycle | cold |
| Started | 2026-10-22T14:49:47.438Z |
| Finished | 2026-10-22T14:49:50.164Z |
| Rows recorded / requested | 5 / 5 |
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
| hard-10x6 | 1/1 | 1/1 (100.0%) | 1/1 (100.0%) | 126 ms | 397 ms | 397 ms | 397 ms | 413 ms | 169.9 MiB | 1.7 MiB | node-screening-only |
| hard-heart10 | 2/2 | 2/2 (100.0%) | 2/2 (100.0%) | 125 ms | 454 ms | 617 ms | 617 ms | 633 ms | 185.9 MiB | 2.9 MiB | node-screening-only |

\* conditional on completed runs; n per cell: hard-10x6 1, hard-heart10 2

## Criteria checks

| Case | Check | Status | Value | Limit | Note |
| --- | --- | --- | --- | --- | --- |
| hard-10x6 | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 1 of 1 |
| hard-10x6 | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 1 of 1 |
| hard-10x6 | T10 median, conditional on complete runs | pass | 396.617 | <= 60000 ms | n = 1 |
| hard-10x6 | T10 p95 (nearest rank), conditional on complete runs | pass | 396.617 | <= 115000 ms | n = 1 |
| hard-10x6 | Longest response of any ordinary run | pass | 413.181 | <= 120000 ms |  |
| hard-10x6 | Real peak memory of the whole process (tab/process plus workers) | pass | 178180096 | <= 1610612736 bytes |  |
| hard-10x6 | Accounted worker and main buffers within the design budgets | pass | 1748872 | <= 1254096896 bytes |  |
| hard-10x6 | No model-too-large error | pass | 0 | 0 |  |
| hard-10x6 | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| hard-10x6 | Cancel settles quickly (separate probe, excluded from statistics) | pass | 4.906 | < 200 ms | 1 probe(s) |
| hard-heart10 | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 2 of 2 |
| hard-heart10 | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 2 of 2 |
| hard-heart10 | T10 median, conditional on complete runs | pass | 453.663 | <= 60000 ms | n = 2 |
| hard-heart10 | T10 p95 (nearest rank), conditional on complete runs | pass | 617.119 | <= 115000 ms | n = 2 |
| hard-heart10 | Longest response of any ordinary run | pass | 633.117 | <= 120000 ms |  |
| hard-heart10 | Real peak memory of the whole process (tab/process plus workers) | pass | 194940928 | <= 1610612736 bytes |  |
| hard-heart10 | Accounted worker and main buffers within the design budgets | pass | 3057674 | <= 1254096896 bytes |  |
| hard-heart10 | No model-too-large error | pass | 0 | 0 |  |
| hard-heart10 | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| hard-heart10 | Cancel settles quickly (separate probe, excluded from statistics) | pass | 6.688 | < 200 ms | 1 probe(s) |

## Probe rows (excluded from the statistics)

| Probe | Case | Seed | Accepted | Cancel latency | Response | Reason | Valid | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cancel | hard-10x6 | fixture-set-0 | 1 | 5 ms | 134 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | hard-heart10 | smoke/hard-heart10/cancel | 1 | 7 ms | 139 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |

## Certificates (accepted puzzles of ordinary runs)

| Case | unique | multiple | not proved | not checked | saturated ratings |
| --- | --- | --- | --- | --- | --- |
| hard-10x6 | 2 | 8 | 0 | 0 | 0/10 |
| hard-heart10 | 8 | 12 | 0 | 0 | 0/20 |

## Planning estimates (NOT measurements)

planning estimate (D39: 5 s + 4 x Node maximum); not a measurement; never enables a BQ flag

| Case | Node max T10 | Browser plan |
| --- | --- | --- |
| hard-10x6 | 397 ms | 6.6 s |
| hard-heart10 | 617 ms | 7.5 s |

Note: fresh process per row
