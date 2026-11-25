# IGP-04 arm C, shard fast: runs

> **Provisional (pre-freeze).** Measured on rating-v3 runtime cd5d17f (worktree 0e1283e) (source digest 34cea386…, equal to MP12b1's source), not on the frozen post-MP17 source. Re-run: pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\IGP-04.json -Label frozen -SourceLabel <label> -LockHelper <path>.

## 26x26-nightmare

| Row key | Seed | T1 s | T10 s | Response s | Accepted | Partial reason | Censored at R |
|---|---|---:|---:|---:|---:|---|---|
| 26x26-nightmare~0 | landscape/26x26-nightmare/0 | 1.20 | 5.72 | 5.87 | 10 | - | no |
| 26x26-nightmare~1 | landscape/26x26-nightmare/1 | 4.64 | 18.55 | 18.69 | 10 | - | no |
| 26x26-nightmare~2 | landscape/26x26-nightmare/2 | 8.32 | 17.68 | 17.83 | 10 | - | no |
| 26x26-nightmare~3 | landscape/26x26-nightmare/3 | 6.34 | 16.66 | 16.78 | 10 | - | no |

## 26x26-master

| Row key | Seed | T1 s | T10 s | Response s | Accepted | Partial reason | Censored at R |
|---|---|---:|---:|---:|---:|---|---|
| 26x26-master~0 | landscape/26x26-master/0 | 2.71 | 9.85 | 10.00 | 10 | - | no |
| 26x26-master~1 | landscape/26x26-master/1 | 1.49 | 9.32 | 9.48 | 10 | - | no |
| 26x26-master~2 | landscape/26x26-master/2 | 1.28 | 6.40 | 6.59 | 10 | - | no |
| 26x26-master~3 | landscape/26x26-master/3 | 1.77 | 10.68 | 10.81 | 10 | - | no |

## 14x14-master

| Row key | Seed | T1 s | T10 s | Response s | Accepted | Partial reason | Censored at R |
|---|---|---:|---:|---:|---:|---|---|
| 14x14-master~0 | landscape/14x14-master/0 | 3.90 | 10.73 | 10.89 | 10 | - | no |
| 14x14-master~1 | landscape/14x14-master/1 | 0.45 | 3.29 | 3.40 | 10 | - | no |
| 14x14-master~2 | landscape/14x14-master/2 | 0.54 | 1.81 | 1.90 | 10 | - | no |
| 14x14-master~3 | landscape/14x14-master/3 | 0.47 | 2.09 | 2.20 | 10 | - | no |

The journal lines are in `fast.calls.jsonl`.
