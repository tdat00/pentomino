# IGP-04 verification of the accepted ratings of arm C

> **Provisional (pre-freeze).** Measured on rating-v3 runtime cd5d17f (worktree 0e1283e) (source digest 34cea386…, equal to MP12b1's source), not on the frozen post-MP17 source. Re-run: pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\IGP-04.json -Label frozen -SourceLabel <label> -LockHelper <path>.

IGP-01-T02 holds: all 356 accepted prototype ratings equal their canonical rating on the base tree (0 mismatches).

| Cell | Stage | Checked | Equal |
|---|---|---:|---:|
| 12x12-nightmare | batch | 51 | 51 |
| 12x12-nightmare | set | 3 | 3 |
| 12x12-nightmare | all | 54 | 54 |
| 14x14-master | batch | 105 | 105 |
| 14x14-master | set | 9 | 9 |
| 14x14-master | all | 114 | 114 |
| 26x26-master | batch | 86 | 86 |
| 26x26-master | set | 13 | 13 |
| 26x26-master | all | 99 | 99 |
| 26x26-nightmare | batch | 76 | 76 |
| 26x26-nightmare | set | 13 | 13 |
| 26x26-nightmare | all | 89 | 89 |
