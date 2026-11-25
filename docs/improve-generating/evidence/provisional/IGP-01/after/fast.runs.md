# IGP-01 arm after, shard fast: runs

> **Provisional (pre-freeze).** Measured on rating-v3 runtime cd5d17f (worktree 0e1283e) (source digest 34cea386…, equal to MP12b1's source), not on the frozen post-MP17 source. Re-run: pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\IGP-01.json -Label frozen -SourceLabel <label> -LockHelper <path>.

## 26x26-nightmare

| Row key | Seed | T1 s | T10 s | Response s | Accepted | Partial reason | Censored at R |
|---|---|---:|---:|---:|---:|---|---|
| 26x26-nightmare~0 | landscape/26x26-nightmare/0 | 0.99 | 12.49 | 12.66 | 10 | - | no |
| 26x26-nightmare~1 | landscape/26x26-nightmare/1 | 5.93 | 12.99 | 13.13 | 10 | - | no |
| 26x26-nightmare~2 | landscape/26x26-nightmare/2 | 7.42 | 15.02 | 15.19 | 10 | - | no |
| 26x26-nightmare~3 | landscape/26x26-nightmare/3 | 2.19 | 11.38 | 11.55 | 10 | - | no |
| 26x26-nightmare~4 | landscape/26x26-nightmare/4 | 2.12 | 10.51 | 10.70 | 10 | - | no |
| 26x26-nightmare~5 | landscape/26x26-nightmare/5 | 2.65 | 9.31 | 9.49 | 10 | - | no |

## 14x14-master

| Row key | Seed | T1 s | T10 s | Response s | Accepted | Partial reason | Censored at R |
|---|---|---:|---:|---:|---:|---|---|
| 14x14-master~0 | landscape/14x14-master/0 | 1.08 | 5.12 | 5.29 | 10 | - | no |
| 14x14-master~1 | landscape/14x14-master/1 | 0.27 | 2.15 | 2.29 | 10 | - | no |
| 14x14-master~2 | landscape/14x14-master/2 | 0.36 | 1.45 | 1.61 | 10 | - | no |
| 14x14-master~3 | landscape/14x14-master/3 | 0.94 | 2.66 | 2.80 | 10 | - | no |
| 14x14-master~4 | landscape/14x14-master/4 | 0.94 | 3.17 | 3.32 | 10 | - | no |

## 26x26-master

| Row key | Seed | T1 s | T10 s | Response s | Accepted | Partial reason | Censored at R |
|---|---|---:|---:|---:|---:|---|---|
| 26x26-master~0 | landscape/26x26-master/0 | 1.71 | 5.77 | 5.92 | 10 | - | no |
| 26x26-master~1 | landscape/26x26-master/1 | 2.63 | 13.43 | 13.60 | 10 | - | no |
| 26x26-master~2 | landscape/26x26-master/2 | 10.42 | 16.91 | 17.07 | 10 | - | no |
| 26x26-master~3 | landscape/26x26-master/3 | 2.61 | 9.64 | 9.76 | 10 | - | no |
| 26x26-master~4 | landscape/26x26-master/4 | 0.58 | 15.14 | 15.30 | 10 | - | no |

The journal lines are in `fast.calls.jsonl`.
