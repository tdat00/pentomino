# IGP-03 arm w380, shard fast-master: runs

> **Provisional (pre-freeze).** Measured on rating-v3 runtime cd5d17f (worktree 0e1283e) (source digest 34cea386…, equal to MP12b1's source), not on the frozen post-MP17 source. Re-run: pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\IGP-03.json -Label frozen -SourceLabel <label> -LockHelper <path>.

## 26x26-master

| Row key | Seed | T1 s | T10 s | Response s | Accepted | Partial reason | Censored at R |
|---|---|---:|---:|---:|---:|---|---|
| 26x26-master~0 | landscape/26x26-master/0 | 1.72 | 5.50 | 5.66 | 10 | - | no |
| 26x26-master~1 | landscape/26x26-master/1 | 2.75 | 13.11 | 13.30 | 10 | - | no |
| 26x26-master~2 | landscape/26x26-master/2 | 2.87 | 11.85 | 12.00 | 10 | - | no |
| 26x26-master~3 | landscape/26x26-master/3 | 2.69 | 10.26 | 10.38 | 10 | - | no |
| 26x26-master~4 | landscape/26x26-master/4 | 0.53 | 15.79 | 15.92 | 10 | - | no |

The journal lines are in `fast-master.calls.jsonl`.
