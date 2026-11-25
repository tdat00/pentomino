# IGP-03 verification of the accepted ratings of arm w380

> **Provisional (pre-freeze).** Measured on rating-v3 runtime cd5d17f (worktree 0e1283e) (source digest 34cea386…, equal to MP12b1's source), not on the frozen post-MP17 source. Re-run: pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\IGP-03.json -Label frozen -SourceLabel <label> -LockHelper <path>.

IGP-01-T02 holds: all 134 accepted prototype ratings equal their canonical rating on the base tree (0 mismatches).

| Cell | Stage | Checked | Equal |
|---|---|---:|---:|
| 12x12-nightmare | batch | 22 | 22 |
| 12x12-nightmare | set | 2 | 2 |
| 12x12-nightmare | all | 24 | 24 |
| 14x14-nightmare | batch | 23 | 23 |
| 14x14-nightmare | set | 3 | 3 |
| 14x14-nightmare | all | 26 | 26 |
| 26x26-master | batch | 73 | 73 |
| 26x26-master | set | 11 | 11 |
| 26x26-master | all | 84 | 84 |
