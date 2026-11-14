# IGP-04 verification of the accepted ratings of arm F

> **Provisional (pre-freeze).** Measured on rating-v3 runtime cd5d17f (worktree 0e1283e) (source digest 34cea386…, equal to MP12b1's source), not on the frozen post-MP17 source. Re-run: pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\IGP-04.json -Label frozen -SourceLabel <label> -LockHelper <path>.

IGP-01-T02 holds: all 37 accepted prototype ratings equal their canonical rating on the base tree (0 mismatches).

| Cell | Stage | Checked | Equal |
|---|---|---:|---:|
| 14x14-nightmare | batch | 34 | 34 |
| 14x14-nightmare | set | 3 | 3 |
| 14x14-nightmare | all | 37 | 37 |
