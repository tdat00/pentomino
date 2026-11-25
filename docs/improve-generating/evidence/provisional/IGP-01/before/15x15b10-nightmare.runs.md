# IGP-01 arm before, shard 15x15b10-nightmare: runs

> **Provisional (pre-freeze).** Measured on rating-v3 runtime cd5d17f (worktree 0e1283e) (source digest 34cea386…, equal to MP12b1's source), not on the frozen post-MP17 source. Re-run: pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\IGP-01.json -Label frozen -SourceLabel <label> -LockHelper <path>.

## 15x15b10-nightmare

| Row key | Seed | T1 s | T10 s | Response s | Accepted | Partial reason | Censored at R |
|---|---|---:|---:|---:|---:|---|---|
| 15x15b10-nightmare~0 | landscape/15x15b10-nightmare/0 | 19.02 | 71.78 | 71.92 | 10 | - | no |
| 15x15b10-nightmare~1 | landscape/15x15b10-nightmare/1 | 8.74 | 47.26 | 47.39 | 10 | - | no |
| 15x15b10-nightmare~2 | landscape/15x15b10-nightmare/2 | 72.78 | - | 187.88 | 4 | time-limit | no |

The journal lines are in `15x15b10-nightmare.calls.jsonl`.
