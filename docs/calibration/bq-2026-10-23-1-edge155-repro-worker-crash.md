# Benchmark report: BQ-1 (browser)

Browser measurement of one device. It qualifies nothing by itself: gates change only in qualification.js with a linked report.

| Field | Value |
| --- | --- |
| Source commit | 59487235a112be6d0f349521392197171cec5faf |
| Source digest | ad96b258e7eb6432f166321a3e37c7c18774ea5a8af69a084193d41902e2bf96 |
| Versions | {"algo":"gen-v2","policy":"mixed-v2","rng":"xoshiro128ss-v1","model":"difficulty-v2","app":"1.0.0"} |
| Platform | Windows / Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/155.0.0.0 Safari/537.36 Edg/155.0.0.0 |
| Workers | 4 |
| Pool lifecycle | cold |
| Started | 2026-10-22T18:06:14.220Z |
| Finished | 2026-10-22T18:06:40.850Z |
| Rows recorded / requested | 21 / 21 |
| Hardware | {"userAgent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/155.0.0.0 Safari/537.36 Edg/155.0.0.0","logicalCores":16,"deviceMemoryGB":32,"crossOriginIsolated":true} |

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
| d24x24-master | 20/20 | 20/20 (100.0%) | 20/20 (100.0%) | 271 ms | 806 ms | 1199 ms | 1215 ms | 1251 ms | 2.9 MiB | 96.2 MiB | incomplete-evidence |

\* conditional on completed runs; n per cell: d24x24-master 20

## Criteria checks

| Case | Check | Status | Value | Limit | Note |
| --- | --- | --- | --- | --- | --- |
| d24x24-master | Runs with 10 of 10 puzzles (all ordinary runs) | pass | 1 | >= 0.9 | 20 of 20 |
| d24x24-master | Runs with at least 1 puzzle (all ordinary runs) | pass | 1 | >= 0.99 | 20 of 20 |
| d24x24-master | T10 median, conditional on complete runs | pass | 805.72 | <= 60000 ms | n = 20 |
| d24x24-master | T10 p95 (nearest rank), conditional on complete runs | pass | 1198.75 | <= 115000 ms | n = 20 |
| d24x24-master | Longest response of any ordinary run | pass | 1251.225 | <= 120000 ms |  |
| d24x24-master | Real peak memory of the whole process (tab/process plus workers) | not-measured | 3055390 | <= 1610612736 bytes | some runs have no whole-process measurement |
| d24x24-master | Accounted worker and main buffers within the design budgets | pass | 100925200 | <= 1254096896 bytes |  |
| d24x24-master | No model-too-large error | pass | 0 | 0 |  |
| d24x24-master | No main-thread task over 50 ms (rendering excluded) | pass | 0 | <= 50 ms | method: longtask-api; thumbnails off |
| d24x24-master | Cancel settles quickly (separate probe, excluded from statistics) | pass | 4.86 | < 200 ms | 1 probe(s) |

## Probe rows (excluded from the statistics)

| Probe | Case | Seed | Accepted | Cancel latency | Response | Reason | Valid | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cancel | d24x24-master | bq1/d24x24-master/cancel | 1 | 5 ms | 240 ms | cancelled | true | cold pool: worker start-up is included; PerformanceObserver longtask: durations of tasks over 50 ms; 0 means none observed; performance.measureUserAgentSpecificMemory polled once per second (agent cluster incl. workers; deduplicated by the browser) |

## Certificates (accepted puzzles of ordinary runs)

| Case | unique | multiple | not proved | not checked | saturated ratings |
| --- | --- | --- | --- | --- | --- |
| d24x24-master | 4 | 196 | 0 | 0 | 0/200 |

Note: thumbnails off (renderingEnabled false); full-preview UX checks belong to the release acceptance task
