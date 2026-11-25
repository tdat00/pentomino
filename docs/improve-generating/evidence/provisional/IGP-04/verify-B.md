# IGP-04 verification of the accepted ratings of arm B

> **Provisional (pre-freeze).** Measured on rating-v3 runtime cd5d17f (worktree 0e1283e) (source digest 34cea386…, equal to MP12b1's source), not on the frozen post-MP17 source. Re-run: pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\IGP-04.json -Label frozen -SourceLabel <label> -LockHelper <path>.

IGP-01-T02 holds: all 190 accepted prototype ratings equal their canonical rating on the base tree (0 mismatches).

| Cell | Stage | Checked | Equal |
|---|---|---:|---:|
| 14x14-master | batch | 56 | 56 |
| 14x14-master | set | 6 | 6 |
| 14x14-master | all | 62 | 62 |
| 26x26-master | batch | 54 | 54 |
| 26x26-master | set | 9 | 9 |
| 26x26-master | all | 63 | 63 |
| 26x26-nightmare | batch | 54 | 54 |
| 26x26-nightmare | set | 11 | 11 |
| 26x26-nightmare | all | 65 | 65 |
