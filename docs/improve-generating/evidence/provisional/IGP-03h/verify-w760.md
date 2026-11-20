# IGP-03h verification of the accepted ratings of arm w760

> **Provisional (pre-freeze).** Measured on rating-v3 runtime cd5d17f (worktree 0e1283e) (source digest 34cea386…, equal to MP12b1's source), not on the frozen post-MP17 source. Re-run: pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\IGP-03h.json -Label frozen -SourceLabel <label> -LockHelper <path>.

IGP-01-T02 holds: all 117 accepted prototype ratings equal their canonical rating on the base tree (0 mismatches).

| Cell | Stage | Checked | Equal |
|---|---|---:|---:|
| 12x12-nightmare | batch | 50 | 50 |
| 12x12-nightmare | set | 8 | 8 |
| 12x12-nightmare | all | 58 | 58 |
| 20x20-hell-1 | batch | 29 | 29 |
| 20x20-hell-1 | set | 4 | 4 |
| 20x20-hell-1 | all | 33 | 33 |
| 26x26-hell-1 | batch | 23 | 23 |
| 26x26-hell-1 | set | 3 | 3 |
| 26x26-hell-1 | all | 26 | 26 |
