# Kernel probe: R4 counters and the `fewestColumn` profile (V4-S2K)

> **Frozen source `3fc65f4`.** Measured on frozen 3fc65f4 (source digest e181df2c…). Re-run: pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\V4-S2K.json -Label frozen -SourceLabel <label> -LockHelper <path>.

counters: equal

profile: complete

The `r4c` tree counts R4 invocations, piece visits, static and live rows, dirty pieces, live-row count changes and mutations; every item measures the complete deduction in the `r4c` and the `instr` tree on the same model and compares the two complete `DeductionResult`s. A piece is dirty at an R4 visit when its live rows changed since its previous visit (a per-piece epoch, raised by every row removal and restoration; its first visit is dirty); `countChanged` counts only the visits at which the number of live rows changed.

## Items

| item | status | g | same | ms | calls | pieces | dirtyPieces | countChanged |
|---|---|---|---|---|---|---|---|---|
| counters:r4c:10x10-nightmare:ig-v4/kernel/10x10-nightmare:0 | completed | 4 | true | 784.821 | 5417 | 24484 | 22967 | 20940 |
| counters:r4c:10x10-nightmare:ig-v4/kernel/10x10-nightmare:1 | completed | 4 | true | 813.742 | 6131 | 33820 | 29976 | 25569 |
| counters:r4c:10x10-nightmare:ig-v4/kernel/10x10-nightmare:2 | completed | 5 | true | 1091.436 | 6801 | 33466 | 31311 | 28469 |
| counters:r4c:10x10-nightmare:ig-v4/kernel/10x10-nightmare:3 | completed | 5 | true | 1424.421 | 8903 | 46361 | 41980 | 37174 |
| counters:r4c:10x10-nightmare:ig-v4/kernel/10x10-nightmare:4 | completed | 6 | true | 1353.108 | 8443 | 51957 | 42036 | 34191 |
| counters:r4c:10x10-nightmare:ig-v4/kernel/10x10-nightmare:5 | completed | 6 | true | 4124.056 | 26817 | 168038 | 135434 | 109918 |
| counters:r4c:12x12-nightmare:ig-v4/kernel/12x12-nightmare:0 | completed | 4 | true | 4777.133 | 13878 | 81452 | 74499 | 67764 |
| counters:r4c:12x12-nightmare:ig-v4/kernel/12x12-nightmare:1 | completed | 4 | true | 946.813 | 2303 | 17733 | 14271 | 12338 |
| counters:r4c:12x12-nightmare:ig-v4/kernel/12x12-nightmare:2 | completed | 5 | true | 5522.34 | 14652 | 116157 | 95811 | 78822 |
| counters:r4c:12x12-nightmare:ig-v4/kernel/12x12-nightmare:3 | completed | 5 | true | 156.325 | 535 | 3256 | 2723 | 2247 |
| counters:r4c:12x12-nightmare:ig-v4/kernel/12x12-nightmare:4 | completed | 6 | true | 720.729 | 3189 | 17912 | 16170 | 14113 |
| counters:r4c:12x12-nightmare:ig-v4/kernel/12x12-nightmare:5 | completed | 6 | true | 197.608 | 878 | 4781 | 4054 | 3432 |
| counters:r4c:14x14-nightmare:ig-v4/kernel/14x14-nightmare:0 | completed | 4 | true | 4551.482 | 5714 | 51662 | 47364 | 43456 |
| counters:r4c:14x14-nightmare:ig-v4/kernel/14x14-nightmare:1 | completed | 4 | true | 3131.531 | 2703 | 31820 | 24726 | 20649 |
| counters:r4c:14x14-nightmare:ig-v4/kernel/14x14-nightmare:2 | completed | 5 | true | 4327.173 | 9400 | 67758 | 60449 | 54667 |
| counters:r4c:14x14-nightmare:ig-v4/kernel/14x14-nightmare:3 | completed | 5 | true | 3550.994 | 3929 | 41231 | 32077 | 26151 |
| counters:r4c:14x14-nightmare:ig-v4/kernel/14x14-nightmare:4 | completed | 6 | true | 214.203 | 338 | 2641 | 2514 | 2239 |
| counters:r4c:14x14-nightmare:ig-v4/kernel/14x14-nightmare:5 | completed | 6 | true | 3348.241 | 4495 | 41186 | 34725 | 30147 |
| counters:r4c:26x26-nightmare:ig-v4/kernel/26x26-nightmare:0 | completed | 5 | true | 877.137 | 182 | 2070 | 1999 | 1897 |
| counters:r4c:26x26-nightmare:ig-v4/kernel/26x26-nightmare:1 | completed | 5 | true | 990.471 | 140 | 1845 | 1697 | 1624 |
| counters:r4c:26x26-nightmare:ig-v4/kernel/26x26-nightmare:2 | completed | 6 | true | 877.799 | 99 | 1487 | 1403 | 1032 |
| counters:r4c:26x26-nightmare:ig-v4/kernel/26x26-nightmare:3 | completed | 6 | true | 908.281 | 126 | 1605 | 1491 | 1395 |
| counters:r4c:26x26-nightmare:ig-v4/kernel/26x26-nightmare:4 | completed | 7 | true | 989.412 | 177 | 2109 | 1986 | 1971 |
| counters:r4c:26x26-nightmare:ig-v4/kernel/26x26-nightmare:5 | completed | 7 | true | 131.309 | 49 | 324 | 308 | 299 |
| counters:r4c:26x26-hell-1:ig-v4/kernel/26x26-hell-1:0 | completed | 5 | true | 3871.805 | 213 | 4844 | 4086 | 3979 |
| counters:r4c:26x26-hell-1:ig-v4/kernel/26x26-hell-1:1 | completed | 5 | true | 3964.003 | 194 | 5127 | 4728 | 4357 |
| counters:r4c:26x26-hell-1:ig-v4/kernel/26x26-hell-1:2 | completed | 6 | true | 3963.552 | 290 | 6571 | 5678 | 5405 |
| counters:r4c:26x26-hell-1:ig-v4/kernel/26x26-hell-1:3 | completed | 6 | true | 3661.33 | 281 | 5835 | 5198 | 4955 |
| counters:r4c:26x26-hell-1:ig-v4/kernel/26x26-hell-1:4 | completed | 7 | true | 3414.396 | 102 | 2871 | 2507 | 2430 |
| counters:r4c:26x26-hell-1:ig-v4/kernel/26x26-hell-1:5 | completed | 7 | true | 4199.325 | 348 | 7945 | 7262 | 6921 |

## Per case

| case | items | measured | calls | pieces | staticRows | liveRows | dirtyPieces | countChanged | r4Kills | kills | undoEntries | dirtyPieces / pieces | countChanged / pieces |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 10x10-nightmare | 6 | 6 | 62512 | 358126 | 49038755 | 12906382 | 303704 | 256261 | 174356 | 19381808 | 20998072 | 0.848 | 0.7156 |
| 12x12-nightmare | 6 | 6 | 35435 | 241291 | 54618964 | 17899427 | 207528 | 178716 | 101482 | 26565884 | 27852820 | 0.8601 | 0.7407 |
| 14x14-nightmare | 6 | 6 | 26579 | 236298 | 84369254 | 28080304 | 201855 | 177309 | 89306 | 32479510 | 33532534 | 0.8542 | 0.7504 |
| 26x26-nightmare | 6 | 6 | 773 | 9440 | 11727022 | 6844640 | 8884 | 8218 | 6977 | 6177208 | 6267959 | 0.9411 | 0.8706 |
| 26x26-hell-1 | 6 | 6 | 1428 | 33193 | 66033001 | 39013802 | 29459 | 28047 | 40359 | 18466486 | 18572738 | 0.8875 | 0.845 |

## The `fewestColumn` profile

reduced-inlining profile, diagnostic only (plan P7)

Each case ran in a child process started with `--cpu-prof --no-turbo-inlining` and rated the six window subsets of its first carved set in the `instr` tree with `rate()` (an incomplete rating counts as a rating); the rating code is not changed. A node's self time is the sum of the sample deltas that name it; `totalMs` sums every node, `deduceMs` the nodes of `core/engine/deduce.js`, `fewestColumnMs` the nodes named `fewestColumn`, and `share` is `fewestColumnMs / deduceMs`. `ratings` and `ms` are the child's own report and `itemMs` the parent's time of the item.

| case | status | ratings | ms | itemMs | file | sha256 | totalMs | deduceMs | fewestColumnMs | share |
|---|---|---|---|---|---|---|---|---|---|---|
| 14x14-nightmare | completed | 6 | 10401.525 | 10710 | tests/artifacts/ig-proto/frozen/V4-S2K/profile/out/14x14-nightmare/CPU.20261123.120251.15284.0.001.cpuprofile | 078e5226038010b0 | 10629.445 | 10099.633 | 4.824 | 0.0005 |
| 26x26-nightmare | completed | 6 | 3388.089 | 3718 | tests/artifacts/ig-proto/frozen/V4-S2K/profile/out/26x26-nightmare/CPU.20261123.120301.7940.0.001.cpuprofile | 4c50e2ee2ca9a9b5 | 3646.224 | 2324.655 | 0 | 0 |
