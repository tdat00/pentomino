# IGP-04 arm B, shard fast: runs

> **Provisional (pre-freeze).** Measured on rating-v3 runtime cd5d17f (worktree 0e1283e) (source digest 34cea386…, equal to MP12b1's source), not on the frozen post-MP17 source. Re-run: pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\IGP-04.json -Label frozen -SourceLabel <label> -LockHelper <path>.

## 26x26-nightmare

| Row key | Seed | T1 s | T10 s | Response s | Accepted | Partial reason | Censored at R |
|---|---|---:|---:|---:|---:|---|---|
| 26x26-nightmare~0 | landscape/26x26-nightmare/0 | 1.05 | 7.01 | 7.17 | 10 | - | no |
| 26x26-nightmare~1 | landscape/26x26-nightmare/1 | 4.40 | 20.43 | 20.58 | 10 | - | no |
| 26x26-nightmare~2 | landscape/26x26-nightmare/2 | 7.74 | 20.45 | 20.61 | 10 | - | no |
| 26x26-nightmare~3 | landscape/26x26-nightmare/3 | 6.15 | 18.50 | 18.64 | 10 | - | no |

## 26x26-master

| Row key | Seed | T1 s | T10 s | Response s | Accepted | Partial reason | Censored at R |
|---|---|---:|---:|---:|---:|---|---|
| 26x26-master~0 | landscape/26x26-master/0 | 2.64 | 11.07 | 11.23 | 10 | - | no |
| 26x26-master~1 | landscape/26x26-master/1 | 1.23 | 8.69 | 8.87 | 10 | - | no |
| 26x26-master~2 | landscape/26x26-master/2 | 0.81 | 6.17 | 6.35 | 10 | - | no |
| 26x26-master~3 | landscape/26x26-master/3 | 1.39 | 10.35 | 10.50 | 10 | - | no |

## 14x14-master

| Row key | Seed | T1 s | T10 s | Response s | Accepted | Partial reason | Censored at R |
|---|---|---:|---:|---:|---:|---|---|
| 14x14-master~0 | landscape/14x14-master/0 | 3.63 | 10.04 | 10.17 | 10 | - | no |
| 14x14-master~1 | landscape/14x14-master/1 | 0.29 | 2.54 | 2.69 | 10 | - | no |
| 14x14-master~2 | landscape/14x14-master/2 | 0.36 | 1.41 | 1.58 | 10 | - | no |
| 14x14-master~3 | landscape/14x14-master/3 | 0.31 | 1.48 | 1.61 | 10 | - | no |

The journal lines are in `fast.calls.jsonl`.
