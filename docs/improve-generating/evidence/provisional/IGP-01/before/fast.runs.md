# IGP-01 arm before, shard fast: runs

> **Provisional (pre-freeze).** Measured on rating-v3 runtime cd5d17f (worktree 0e1283e) (source digest 34cea386…, equal to MP12b1's source), not on the frozen post-MP17 source. Re-run: pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\IGP-01.json -Label frozen -SourceLabel <label> -LockHelper <path>.

## 26x26-nightmare

| Row key | Seed | T1 s | T10 s | Response s | Accepted | Partial reason | Censored at R |
|---|---|---:|---:|---:|---:|---|---|
| 26x26-nightmare~0 | landscape/26x26-nightmare/0 | 0.94 | 8.61 | 8.79 | 10 | - | no |
| 26x26-nightmare~1 | landscape/26x26-nightmare/1 | 5.73 | 28.13 | 28.29 | 10 | - | no |
| 26x26-nightmare~2 | landscape/26x26-nightmare/2 | 10.31 | 27.96 | 28.11 | 10 | - | no |
| 26x26-nightmare~3 | landscape/26x26-nightmare/3 | 8.51 | 25.09 | 25.27 | 10 | - | no |
| 26x26-nightmare~4 | landscape/26x26-nightmare/4 | 4.74 | 18.20 | 18.38 | 10 | - | no |
| 26x26-nightmare~5 | landscape/26x26-nightmare/5 | 8.68 | 36.38 | 36.53 | 10 | - | no |

## 14x14-master

| Row key | Seed | T1 s | T10 s | Response s | Accepted | Partial reason | Censored at R |
|---|---|---:|---:|---:|---:|---|---|
| 14x14-master~0 | landscape/14x14-master/0 | 4.31 | 11.18 | 11.32 | 10 | - | no |
| 14x14-master~1 | landscape/14x14-master/1 | 0.37 | 3.18 | 3.31 | 10 | - | no |
| 14x14-master~2 | landscape/14x14-master/2 | 0.40 | 1.81 | 1.94 | 10 | - | no |
| 14x14-master~3 | landscape/14x14-master/3 | 0.39 | 1.80 | 1.94 | 10 | - | no |
| 14x14-master~4 | landscape/14x14-master/4 | 0.83 | 3.17 | 3.31 | 10 | - | no |

## 26x26-master

| Row key | Seed | T1 s | T10 s | Response s | Accepted | Partial reason | Censored at R |
|---|---|---:|---:|---:|---:|---|---|
| 26x26-master~0 | landscape/26x26-master/0 | 2.87 | 12.31 | 12.46 | 10 | - | no |
| 26x26-master~1 | landscape/26x26-master/1 | 1.14 | 10.04 | 10.12 | 10 | - | no |
| 26x26-master~2 | landscape/26x26-master/2 | 0.80 | 6.46 | 6.61 | 10 | - | no |
| 26x26-master~3 | landscape/26x26-master/3 | 1.29 | 12.26 | 12.43 | 10 | - | no |
| 26x26-master~4 | landscape/26x26-master/4 | 5.55 | 12.49 | 12.62 | 10 | - | no |

The journal lines are in `fast.calls.jsonl`.
