# V4-S4 arm log-link, shard master-10x10-master: runs

> **Frozen source `3fc65f4`.** Measured on frozen 3fc65f4 (source digest e181df2c…). Re-run: pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\V4-S4.json -Label frozen -SourceLabel <label> -LockHelper <path>.

## 10x10-master

| Row key | Seed | T1 s | T10 s | Response s | Accepted | Partial reason | Censored at R |
|---|---|---:|---:|---:|---:|---|---|
| 10x10-master~20 | landscape/10x10-master/20 | 0.90 | 3.09 | 3.26 | 10 | - | no |
| 10x10-master~21 | landscape/10x10-master/21 | 0.55 | 15.88 | 16.06 | 10 | - | no |
| 10x10-master~22 | landscape/10x10-master/22 | 4.71 | 10.76 | 10.92 | 10 | - | no |
| 10x10-master~23 | landscape/10x10-master/23 | 4.36 | 10.02 | 10.18 | 10 | - | no |
| 10x10-master~24 | landscape/10x10-master/24 | 3.37 | - | 21.72 | 4 | layouts-not-found | no |

The journal lines are in `master-10x10-master.calls.jsonl`.
