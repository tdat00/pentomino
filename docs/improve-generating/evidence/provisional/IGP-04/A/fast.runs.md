# IGP-04 arm A, shard fast: runs

> **Provisional (pre-freeze).** Measured on rating-v3 runtime cd5d17f (worktree 0e1283e) (source digest 34cea386…, equal to MP12b1's source), not on the frozen post-MP17 source. Re-run: pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\IGP-04.json -Label frozen -SourceLabel <label> -LockHelper <path>.

## 26x26-nightmare

| Row key | Seed | T1 s | T10 s | Response s | Accepted | Partial reason | Censored at R |
|---|---|---:|---:|---:|---:|---|---|
| 26x26-nightmare~0 | landscape/26x26-nightmare/0 | 1.07 | 8.79 | 8.92 | 10 | - | no |
| 26x26-nightmare~1 | landscape/26x26-nightmare/1 | 5.72 | 28.38 | 28.54 | 10 | - | no |
| 26x26-nightmare~2 | landscape/26x26-nightmare/2 | 10.01 | 27.51 | 27.64 | 10 | - | no |
| 26x26-nightmare~3 | landscape/26x26-nightmare/3 | 8.18 | 24.04 | 24.20 | 10 | - | no |

## 26x26-master

| Row key | Seed | T1 s | T10 s | Response s | Accepted | Partial reason | Censored at R |
|---|---|---:|---:|---:|---:|---|---|
| 26x26-master~0 | landscape/26x26-master/0 | 2.73 | 11.86 | 12.02 | 10 | - | no |
| 26x26-master~1 | landscape/26x26-master/1 | 1.11 | 9.85 | 10.00 | 10 | - | no |
| 26x26-master~2 | landscape/26x26-master/2 | 0.79 | 6.80 | 6.93 | 10 | - | no |
| 26x26-master~3 | landscape/26x26-master/3 | 1.32 | 12.04 | 12.19 | 10 | - | no |

## 14x14-master

| Row key | Seed | T1 s | T10 s | Response s | Accepted | Partial reason | Censored at R |
|---|---|---:|---:|---:|---:|---|---|
| 14x14-master~0 | landscape/14x14-master/0 | 4.59 | 11.34 | 11.48 | 10 | - | no |
| 14x14-master~1 | landscape/14x14-master/1 | 0.27 | 2.98 | 3.12 | 10 | - | no |
| 14x14-master~2 | landscape/14x14-master/2 | 0.37 | 1.71 | 1.84 | 10 | - | no |
| 14x14-master~3 | landscape/14x14-master/3 | 0.40 | 1.75 | 1.91 | 10 | - | no |

The journal lines are in `fast.calls.jsonl`.
