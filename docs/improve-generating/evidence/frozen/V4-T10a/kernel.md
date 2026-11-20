# Kernel probe: R4 visit and mutation counters (V4-T10a)

> **Frozen source `3fc65f4`.** Measured on frozen 3fc65f4 (source digest e181df2c…). Re-run: pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\V4-T10a.json -Label frozen -SourceLabel <label> -LockHelper <path>.

counters: equal

The `r4c` tree counts R4 invocations, piece visits, static and live rows, dirty pieces, live-row count changes and mutations; every item measures the complete deduction in the `r4c` and the `instr` tree on the same model and compares the two complete `DeductionResult`s. A piece is dirty at an R4 visit when its live rows changed since its previous visit (a per-piece epoch, raised by every row removal and restoration; its first visit is dirty); `countChanged` counts only the visits at which the number of live rows changed.

## Items

| item | status | g | same | ms | calls | pieces | dirtyPieces | countChanged |
|---|---|---|---|---|---|---|---|---|
| counters:r4c:14x14-nightmare:ig-v4/kernel/14x14-nightmare:0 | completed | 4 | true | 3871.713 | 5714 | 51662 | 47364 | 43456 |
| counters:r4c:14x14-nightmare:ig-v4/kernel/14x14-nightmare:1 | completed | 4 | true | 3094.721 | 2703 | 31820 | 24726 | 20649 |
| counters:r4c:14x14-nightmare:ig-v4/kernel/14x14-nightmare:2 | completed | 5 | true | 4371.779 | 9400 | 67758 | 60449 | 54667 |
| counters:r4c:14x14-nightmare:ig-v4/kernel/14x14-nightmare:3 | completed | 5 | true | 3506.981 | 3929 | 41231 | 32077 | 26151 |
| counters:r4c:14x14-nightmare:ig-v4/kernel/14x14-nightmare:4 | completed | 6 | true | 168.203 | 338 | 2641 | 2514 | 2239 |
| counters:r4c:14x14-nightmare:ig-v4/kernel/14x14-nightmare:5 | completed | 6 | true | 3353.191 | 4495 | 41186 | 34725 | 30147 |
| counters:r4c:26x26-nightmare:ig-v4/kernel/26x26-nightmare:0 | completed | 5 | true | 925.97 | 182 | 2070 | 1999 | 1897 |
| counters:r4c:26x26-nightmare:ig-v4/kernel/26x26-nightmare:1 | completed | 5 | true | 1062.566 | 140 | 1845 | 1697 | 1624 |
| counters:r4c:26x26-nightmare:ig-v4/kernel/26x26-nightmare:2 | completed | 6 | true | 826.998 | 99 | 1487 | 1403 | 1032 |
| counters:r4c:26x26-nightmare:ig-v4/kernel/26x26-nightmare:3 | completed | 6 | true | 903.563 | 126 | 1605 | 1491 | 1395 |
| counters:r4c:26x26-nightmare:ig-v4/kernel/26x26-nightmare:4 | completed | 7 | true | 996.971 | 177 | 2109 | 1986 | 1971 |
| counters:r4c:26x26-nightmare:ig-v4/kernel/26x26-nightmare:5 | completed | 7 | true | 133.184 | 49 | 324 | 308 | 299 |

## Per case

| case | items | measured | calls | pieces | staticRows | liveRows | dirtyPieces | countChanged | r4Kills | kills | undoEntries | dirtyPieces / pieces | countChanged / pieces |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 14x14-nightmare | 6 | 6 | 26579 | 236298 | 84369254 | 28080304 | 201855 | 177309 | 89306 | 32479510 | 33532534 | 0.8542 | 0.7504 |
| 26x26-nightmare | 6 | 6 | 773 | 9440 | 11727022 | 6844640 | 8884 | 8218 | 6977 | 6177208 | 6267959 | 0.9411 | 0.8706 |
