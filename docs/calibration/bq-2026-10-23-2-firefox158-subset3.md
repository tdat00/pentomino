# Benchmark report: BQ-2 (browser)

Browser measurement of one device. It qualifies nothing by itself: gates change only in qualification.js with a linked report.

| Field | Value |
| --- | --- |
| Source commit | 59487235a112be6d0f349521392197171cec5faf |
| Source digest | ad96b258e7eb6432f166321a3e37c7c18774ea5a8af69a084193d41902e2bf96 |
| Versions | {"algo":"gen-v2","policy":"mixed-v2","rng":"xoshiro128ss-v1","model":"difficulty-v2","app":"1.0.0"} |
| Platform | Win32 / Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:158.0) Gecko/20100101 Firefox/158.0 |
| Workers | 4 |
| Pool lifecycle | cold |
| Started | 2026-10-22T18:11:00.312Z |
| Finished | 2026-10-22T18:12:43.789Z |
| Rows recorded / requested | 12 / 12 |
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
| d26x26-hell-1 | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 4503 ms | 18.0 s | 18.5 s | 18.5 s | 18.5 s | n/a | 219.8 MiB | incomplete-evidence |
| d26x26-hell-3 | 3/3 | 3/3 (100.0%) | 3/3 (100.0%) | 1318 ms | 4059 ms | 5292 ms | 5292 ms | 5337 ms | n/a | 332.2 MiB | incomplete-evidence |
| dirr658-hard | 3/3 | 2/3 (66.7%) | 3/3 (100.0%) | 260 ms | 2210 ms | 2396 ms | 2396 ms | 2435 ms | n/a | 65.7 MiB | fail |

\* conditional on completed runs; n per cell: d26x26-hell-1 3, d26x26-hell-3 3, dirr658-hard 2

## Criteria checks

| Case | Check | Status | Value | Limit | Note |
| --- | --- | --- | --- | --- | --- |
| d26x26-hell-1 | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d26x26-hell-1 | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d26x26-hell-1 | T10 median, conditional on complete runs | pass | 17998 | <= 60000 ms | n = 3 |
| d26x26-hell-1 | T10 p95 (nearest rank), conditional on complete runs | pass | 18458 | <= 115000 ms | n = 3 |
| d26x26-hell-1 | Longest response of any ordinary run | pass | 18503 | <= 120000 ms |  |
| d26x26-hell-1 | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| d26x26-hell-1 | Accounted worker and main buffers within the design budgets | pass | 230463132 | <= 1254096896 bytes |  |
| d26x26-hell-1 | No model-too-large error | pass | 0 | 0 |  |
| d26x26-hell-1 | No main-thread task over 50 ms (rendering excluded) | pass | 22 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| d26x26-hell-1 | Cancel settles quickly (separate probe, excluded from statistics) | pass | 10 | < 200 ms | 1 probe(s) |
| d26x26-hell-3 | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 3 of 3 |
| d26x26-hell-3 | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| d26x26-hell-3 | T10 median, conditional on complete runs | pass | 4059 | <= 60000 ms | n = 3 |
| d26x26-hell-3 | T10 p95 (nearest rank), conditional on complete runs | pass | 5292 | <= 115000 ms | n = 3 |
| d26x26-hell-3 | Longest response of any ordinary run | pass | 5337 | <= 120000 ms |  |
| d26x26-hell-3 | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| d26x26-hell-3 | Accounted worker and main buffers within the design budgets | pass | 348388774 | <= 1254096896 bytes |  |
| d26x26-hell-3 | No model-too-large error | pass | 0 | 0 |  |
| d26x26-hell-3 | No main-thread task over 50 ms (rendering excluded) | pass | 9 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| d26x26-hell-3 | Cancel settles quickly (separate probe, excluded from statistics) | pass | 8 | < 200 ms | 1 probe(s) |
| dirr658-hard | Runs with 10 of 10 puzzles (all ordinary runs) | fail | 0.667 | >= 0.9 | 2 of 3 |
| dirr658-hard | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 3 of 3 |
| dirr658-hard | T10 median, conditional on complete runs | pass | 2209.5 | <= 60000 ms | n = 2 |
| dirr658-hard | T10 p95 (nearest rank), conditional on complete runs | pass | 2396 | <= 115000 ms | n = 2 |
| dirr658-hard | Longest response of any ordinary run | pass | 2435 | <= 120000 ms |  |
| dirr658-hard | Real peak memory of the whole process (tab/process plus workers) | not-measured | n/a | <= 1610612736 bytes | some runs have no whole-process measurement |
| dirr658-hard | Accounted worker and main buffers within the design budgets | pass | 68854086 | <= 1254096896 bytes |  |
| dirr658-hard | No model-too-large error | pass | 0 | 0 |  |
| dirr658-hard | No main-thread task over 50 ms (rendering excluded) | pass | 15 | <= 50 ms | method: heartbeat; heartbeat delay is a proxy, not a measured task duration; thumbnails off |
| dirr658-hard | Cancel settles quickly (separate probe, excluded from statistics) | pass | 8 | < 200 ms | 1 probe(s) |

## Probe rows (excluded from the statistics)

| Probe | Case | Seed | Accepted | Cancel latency | Response | Reason | Valid | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cancel | d26x26-hell-1 | bq2/d26x26-hell-1/cancel | 1 | 10 ms | 4926 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |
| cancel | d26x26-hell-3 | bq2/d26x26-hell-3/cancel | 1 | 8 ms | 986 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |
| cancel | dirr658-hard | bq2/dirr658-hard/cancel | 1 | 8 ms | 203 ms | cancelled | true | cold pool: worker start-up is included; heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration; browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand |

## Certificates (accepted puzzles of ordinary runs)

| Case | unique | multiple | not proved | not checked | saturated ratings |
| --- | --- | --- | --- | --- | --- |
| d26x26-hell-1 | 0 | 1 | 29 | 0 | 29/30 |
| d26x26-hell-3 | 0 | 0 | 30 | 0 | 30/30 |
| dirr658-hard | 19 | 1 | 0 | 4 | 0/24 |

Note: thumbnails off (renderingEnabled false); full-preview UX checks belong to the release acceptance task
