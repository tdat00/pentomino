# IGP-03h verification of the accepted ratings of arm main

> **Provisional (pre-freeze).** Measured on rating-v3 runtime cd5d17f (worktree 0e1283e) (source digest 34cea386…, equal to MP12b1's source), not on the frozen post-MP17 source. Re-run: pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\IGP-03h.json -Label frozen -SourceLabel <label> -LockHelper <path>.

IGP-01-T02 holds: all 58 accepted prototype ratings equal their canonical rating on the base tree (0 mismatches).

| Cell | Stage | Checked | Equal |
|---|---|---:|---:|
| 12x12-nightmare | batch | 49 | 49 |
| 12x12-nightmare | set | 9 | 9 |
| 12x12-nightmare | all | 58 | 58 |
