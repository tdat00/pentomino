# IGP-03 verification of the accepted ratings of arm a3

> **Provisional (pre-freeze).** Measured on rating-v3 runtime cd5d17f (worktree 0e1283e) (source digest 34cea386…, equal to MP12b1's source), not on the frozen post-MP17 source. Re-run: pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\IGP-03.json -Label frozen -SourceLabel <label> -LockHelper <path>.

IGP-01-T02 holds: all 59 accepted prototype ratings equal their canonical rating on the base tree (0 mismatches).

| Cell | Stage | Checked | Equal |
|---|---|---:|---:|
| 14x14-nightmare | batch | 23 | 23 |
| 14x14-nightmare | set | 2 | 2 |
| 14x14-nightmare | all | 25 | 25 |
| 26x26-hell-1 | batch | 30 | 30 |
| 26x26-hell-1 | set | 4 | 4 |
| 26x26-hell-1 | all | 34 | 34 |
