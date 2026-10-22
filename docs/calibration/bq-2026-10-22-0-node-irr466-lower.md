# Benchmark report: BQ-0 (node)

Node screening evidence only. It never replaces browser measurements and enables no BQ limit.

| Field | Value |
| --- | --- |
| Source commit | 6e9126377f110fb4ae1d061b228ecfde82da963c+uncommitted-changes |
| Source digest | e651b4730699e0cd8ae2c53c017df757e9d6f7e1ebbb2f2a159fc05599e0962a |
| Versions | {"algo":"gen-v2","policy":"mixed-v2","rng":"xoshiro128ss-v1","model":"difficulty-v2","app":"1.0.0"} |
| Platform | win32 10.0.26300 x64 / node v24.21.0 |
| Workers | 4 |
| Pool lifecycle | cold |
| Started | 2026-10-22T15:24:16.849Z |
| Finished | 2026-10-22T15:25:57.893Z |
| Rows recorded / requested | 63 / 63 |
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
| dirr466-hard | 20/20 | 2/20 (10.0%) | 20/20 (100.0%) | 215 ms | 1416 ms | 1746 ms | 1746 ms | 1768 ms | 417.6 MiB | 30.7 MiB | fail |
| dirr466-expert | 20/20 | 9/20 (45.0%) | 20/20 (100.0%) | 225 ms | 1701 ms | 2359 ms | 2359 ms | 2382 ms | 464.4 MiB | 44.7 MiB | fail |
| dirr466-master | 20/20 | 14/20 (70.0%) | 20/20 (100.0%) | 218 ms | 1782 ms | 2687 ms | 2687 ms | 2708 ms | 459.5 MiB | 61.5 MiB | fail |

\* conditional on completed runs; n per cell: dirr466-hard 2, dirr466-expert 9, dirr466-master 14

## Criteria checks

| Case | Check | Status | Value | Limit | Note |
| --- | --- | --- | --- | --- | --- |
| dirr466-hard | Runs with 10 of 10 puzzles (all ordinary runs) | fail | 0.1 | >= 0.9 | 2 of 20 |
| dirr466-hard | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 20 of 20 |
| dirr466-hard | T10 median, conditional on complete runs | pass | 1415.508 | <= 60000 ms | n = 2 |
| dirr466-hard | T10 p95 (nearest rank), conditional on complete runs | pass | 1746.403 | <= 115000 ms | n = 2 |
| dirr466-hard | Longest response of any ordinary run | pass | 1768.083 | <= 120000 ms |  |
| dirr466-hard | Real peak memory of the whole process (tab/process plus workers) | pass | 437911552 | <= 1610612736 bytes |  |
| dirr466-hard | Accounted worker and main buffers within the design budgets | pass | 32199805 | <= 1254096896 bytes |  |
| dirr466-hard | No model-too-large error | pass | 0 | 0 |  |
| dirr466-hard | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| dirr466-hard | Cancel settles quickly (separate probe, excluded from statistics) | pass | 16.358 | < 200 ms | 1 probe(s) |
| dirr466-expert | Runs with 10 of 10 puzzles (all ordinary runs) | fail | 0.45 | >= 0.9 | 9 of 20 |
| dirr466-expert | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 20 of 20 |
| dirr466-expert | T10 median, conditional on complete runs | pass | 1700.706 | <= 60000 ms | n = 9 |
| dirr466-expert | T10 p95 (nearest rank), conditional on complete runs | pass | 2359.058 | <= 115000 ms | n = 9 |
| dirr466-expert | Longest response of any ordinary run | pass | 2381.597 | <= 120000 ms |  |
| dirr466-expert | Real peak memory of the whole process (tab/process plus workers) | pass | 486936576 | <= 1610612736 bytes |  |
| dirr466-expert | Accounted worker and main buffers within the design budgets | pass | 46820226 | <= 1254096896 bytes |  |
| dirr466-expert | No model-too-large error | pass | 0 | 0 |  |
| dirr466-expert | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| dirr466-expert | Cancel settles quickly (separate probe, excluded from statistics) | pass | 14.287 | < 200 ms | 1 probe(s) |
| dirr466-master | Runs with 10 of 10 puzzles (all ordinary runs) | fail | 0.7 | >= 0.9 | 14 of 20 |
| dirr466-master | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 20 of 20 |
| dirr466-master | T10 median, conditional on complete runs | pass | 1782.471 | <= 60000 ms | n = 14 |
| dirr466-master | T10 p95 (nearest rank), conditional on complete runs | pass | 2686.719 | <= 115000 ms | n = 14 |
| dirr466-master | Longest response of any ordinary run | pass | 2708.352 | <= 120000 ms |  |
| dirr466-master | Real peak memory of the whole process (tab/process plus workers) | pass | 481832960 | <= 1610612736 bytes |  |
| dirr466-master | Accounted worker and main buffers within the design budgets | pass | 64496626 | <= 1254096896 bytes |  |
| dirr466-master | No model-too-large error | pass | 0 | 0 |  |
| dirr466-master | No main-thread task over 50 ms | not-applicable | n/a | <= 50 ms | Node has no browser main thread |
| dirr466-master | Cancel settles quickly (separate probe, excluded from statistics) | pass | 16.097 | < 200 ms | 1 probe(s) |

## Probe rows (excluded from the statistics)

| Probe | Case | Seed | Accepted | Cancel latency | Response | Reason | Valid | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cancel | dirr466-hard | bq0/dirr466-hard/cancel | 1 | 16 ms | 265 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | dirr466-expert | bq0/dirr466-expert/cancel | 1 | 14 ms | 244 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |
| cancel | dirr466-master | bq0/dirr466-master/cancel | 1 | 16 ms | 273 ms | cancelled | true | cold pool: worker start-up is included; whole-process peak working set (maxRSS) of a one-row process, worker threads included |

## Certificates (accepted puzzles of ordinary runs)

| Case | unique | multiple | not proved | not checked | saturated ratings |
| --- | --- | --- | --- | --- | --- |
| dirr466-hard | 20 | 0 | 0 | 92 | 0/112 |
| dirr466-expert | 59 | 31 | 0 | 60 | 0/150 |
| dirr466-master | 48 | 92 | 0 | 24 | 0/164 |

## Planning estimates (NOT measurements)

planning estimate (D39: 5 s + 4 x Node maximum); not a measurement; never enables a BQ flag

| Case | Node max T10 | Browser plan |
| --- | --- | --- |
| dirr466-hard | 1746 ms | 12.0 s |
| dirr466-expert | 2359 ms | 14.4 s |
| dirr466-master | 2687 ms | 15.7 s |

Note: fresh process per row
