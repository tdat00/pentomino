# Benchmark report: BQ-1 (browser)

Browser measurement of one device. It qualifies nothing by itself: gates change only in qualification.js with a linked report.

| Field | Value |
| --- | --- |
| Source commit | 59487235a112be6d0f349521392197171cec5faf |
| Source digest | ad96b258e7eb6432f166321a3e37c7c18774ea5a8af69a084193d41902e2bf96 |
| Versions | {"algo":"gen-v2","policy":"mixed-v2","rng":"xoshiro128ss-v1","model":"difficulty-v2","app":"1.0.0"} |
| Platform | Win32 / Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:158.0) Gecko/20100101 Firefox/158.0 |
| Workers | 4 |
| Pool lifecycle | cold |
| Started | 2026-10-22T18:07:04.415Z |
| Finished | 2026-10-22T18:08:45.711Z |
| Rows recorded / requested | 20 / 20 |
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
| d24x24-hard | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 292 ms | 692 ms | 809 ms | 809 ms | 860 ms | n/a | 39.3 MiB | incomplete-evidence |
| d24x24-hell-1 | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 3266 ms | 13.2 s | 13.3 s | 13.3 s | 13.3 s | n/a | 165.4 MiB | incomplete-evidence |
| d24x24-hell-3 | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 724 ms | 2919 ms | 3577 ms | 3577 ms | 3621 ms | n/a | 244.8 MiB | incomplete-evidence |
| dirr558-hard | 3/3 | 1/3 (33.3%) | 3/3 (100.0%) | 179 ms | 1389 ms | 1389 ms | 1389 ms | 1427 ms | n/a | 40.1 MiB | fail |
| dirr558-hell-2 | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 1288 ms | 4800 ms | 9027 ms | 9027 ms | 9067 ms | n/a | 180.3 MiB | incomplete-evidence |

\* conditional on completed runs; n per cell: d24x24-hard 3, d24x24-hell-1 3, d24x24-hell-3 3, dirr558-hard 1, dirr558-hell-2 3

## Criteria checks

| Case | Check | Status | Value | Limit | Note |
| --- | --- | --- | --- | --- | --- |
| d24x24-hard | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d24x24-hard | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d24x24-hard | T10 median, conditional on complete runs | pass | 692 | <= 60000 ms | n = 3 |
| d24x24-hard | T10 p95 (nearest rank), conditional on complete runs | pass | 809 | <= 115000 ms | n = 3 |
| d24x24-hard | Longest response of any ordinary run | pass | 860 | <= 120000 ms |  |
| d24x24-hard | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| d24x24-hard | Accounted worker and main buffers within the design budgets | pass | 41195660 | <= 1254096896 bytes |  |
| d24x24-hard | No model-too-large error | pass | 0 | 0 |  |
| d24x24-hard | No main-thread task over 50 ms (rendering excluded) | pass | 37 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| d24x24-hard | Cancel settles quickly (separate probe, excluded from statistics) | pass | 8 | < 200 ms | 1 probe(s) |
| d24x24-hell-1 | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d24x24-hell-1 | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d24x24-hell-1 | T10 median, conditional on complete runs | pass | 13183 | <= 60000 ms | n = 3 |
| d24x24-hell-1 | T10 p95 (nearest rank), conditional on complete runs | pass | 13260 | <= 115000 ms | n = 3 |
| d24x24-hell-1 | Longest response of any ordinary run | pass | 13307 | <= 120000 ms |  |
| d24x24-hell-1 | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| d24x24-hell-1 | Accounted worker and main buffers within the design budgets | pass | 173446192 | <= 1254096896 bytes |  |
| d24x24-hell-1 | No model-too-large error | pass | 0 | 0 |  |
| d24x24-hell-1 | No main-thread task over 50 ms (rendering excluded) | pass | 20 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| d24x24-hell-1 | Cancel settles quickly (separate probe, excluded from statistics) | pass | 7 | < 200 ms | 1 probe(s) |
| d24x24-hell-3 | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d24x24-hell-3 | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d24x24-hell-3 | T10 median, conditional on complete runs | pass | 2919 | <= 60000 ms | n = 3 |
| d24x24-hell-3 | T10 p95 (nearest rank), conditional on complete runs | pass | 3577 | <= 115000 ms | n = 3 |
| d24x24-hell-3 | Longest response of any ordinary run | pass | 3621 | <= 120000 ms |  |
| d24x24-hell-3 | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| d24x24-hell-3 | Accounted worker and main buffers within the design budgets | pass | 256710888 | <= 1254096896 bytes |  |
| d24x24-hell-3 | No model-too-large error | pass | 0 | 0 |  |
| d24x24-hell-3 | No main-thread task over 50 ms (rendering excluded) | pass | 12 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| d24x24-hell-3 | Cancel settles quickly (separate probe, excluded from statistics) | pass | 8 | < 200 ms | 1 probe(s) |
| dirr558-hard | Runs with 10 of 10 puzzles (all ordinary runs) | fail | 0.333 | >= 0.9 | 1 of 3 |
| dirr558-hard | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| dirr558-hard | T10 median, conditional on complete runs | pass | 1389 | <= 60000 ms | n = 1 |
| dirr558-hard | T10 p95 (nearest rank), conditional on complete runs | pass | 1389 | <= 115000 ms | n = 1 |
| dirr558-hard | Longest response of any ordinary run | pass | 1427 | <= 120000 ms |  |
| dirr558-hard | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| dirr558-hard | Accounted worker and main buffers within the design budgets | pass | 42039625 | <= 1254096896 bytes |  |
| dirr558-hard | No model-too-large error | pass | 0 | 0 |  |
| dirr558-hard | No main-thread task over 50 ms (rendering excluded) | pass | 18 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| dirr558-hard | Cancel settles quickly (separate probe, excluded from statistics) | pass | 9 | < 200 ms | 1 probe(s) |
| dirr558-hell-2 | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| dirr558-hell-2 | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| dirr558-hell-2 | T10 median, conditional on complete runs | pass | 4800 | <= 60000 ms | n = 3 |
| dirr558-hell-2 | T10 p95 (nearest rank), conditional on complete runs | pass | 9027 | <= 115000 ms | n = 3 |
| dirr558-hell-2 | Longest response of any ordinary run | pass | 9067 | <= 120000 ms |  |
| dirr558-hell-2 | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| dirr558-hell-2 | Accounted worker and main buffers within the design budgets | pass | 189098548 | <= 1254096896 bytes |  |
| dirr558-hell-2 | No model-too-large error | pass | 0 | 0 |  |
| dirr558-hell-2 | No main-thread task over 50 ms (rendering excluded) | pass | 17 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| dirr558-hell-2 | Cancel settles quickly (separate probe, excluded from statistics) | pass | 9 | < 200 ms | 1 probe(s) |

## Probe rows (excluded from the statistics)

| Probe | Case | Seed | Accepted | Cancel latency | Response | Reason | Valid | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cancel | d24x24-hard | bq1/d24x24-hard/cancel | 1 | 8 ms | 283 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |
| cancel | d24x24-hell-1 | bq1/d24x24-hell-1/cancel | 1 | 7 ms | 3274 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |
| cancel | d24x24-hell-3 | bq1/d24x24-hell-3/cancel | 1 | 8 ms | 838 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |
| cancel | dirr558-hard | bq1/dirr558-hard/cancel | 1 | 9 ms | 251 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |
| cancel | dirr558-hell-2 | bq1/dirr558-hell-2/cancel | 1 | 9 ms | 1489 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |

## Certificates (accepted puzzles of ordinary runs)

| Case | unique | multiple | not proved | not checked | saturated ratings |
| --- | --- | --- | --- | --- | --- |
| d24x24-hard | 23 | 7 | 0 | 0 | 0/30 |
| d24x24-hell-1 | 0 | 0 | 30 | 0 | 30/30 |
| d24x24-hell-3 | 0 | 0 | 30 | 0 | 29/30 |
| dirr558-hard | 10 | 0 | 0 | 8 | 0/18 |
| dirr558-hell-2 | 0 | 0 | 30 | 0 | 30/30 |

Note: thumbnails off (renderingEnabled false); full-preview UX checks belong to the release acceptance task
