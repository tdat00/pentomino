# Pool probe: one rating's time at 1, 2, 4 and 8 concurrent workers (V4-S2W)

> **Frozen source `3fc65f4`.** Measured on frozen 3fc65f4 (source digest e181df2c…). Re-run: pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\V4-S2W.json -Label frozen -SourceLabel <label> -LockHelper <path>.

width: complete

Context: R23 measured one rating 9 to 28 % longer at eight workers than at four. The probe decides whether P8 is worth more work (plan P8); every gate stays at four workers.

## Machine

16 logical CPUs (`os.cpus().length`), first CPU `AMD EPYC 7763 64-Core Processor`, 68665831424 bytes of memory (`os.totalmem()`).

## Widths

Each item starts `width` worker threads together in the `base` tree (the frozen source unchanged); every worker loads the engine, says `ready`, waits for the parent's `go` (sent once every worker is ready) and then rates each of the six window subsets of the case's first carved set (T10a's corpus) 3 times, timing each rating. `expected` is rounds x 6 x width ratings and `observed` the ratings timed; `medianMs` and `p90Ms` are over all of them (the 90th percentile is the value at index `ceil(0.9 n) - 1` of the ascending list); `slowdown` is `medianMs` of the width over `medianMs` of width 1. The numbers are measurements: the probe judges nothing, and a partial width is `censored`, never a pass.

| case | width | rounds | status | expected | observed | medianMs | p90Ms | slowdown | itemMs |
|---|---|---|---|---|---|---|---|---|---|
| 26x26-nightmare | 1 | 3 | completed | 18 | 18 | 548.1855 | 791.868 | 1 | 9469 |
| 26x26-nightmare | 2 | 3 | completed | 36 | 36 | 552.6475 | 789.503 | 1.0081 | 9371 |
| 26x26-nightmare | 4 | 3 | completed | 72 | 72 | 559.051 | 796.546 | 1.0198 | 9659 |
| 26x26-nightmare | 8 | 3 | completed | 144 | 144 | 606.687 | 827.451 | 1.1067 | 10491 |
| 14x14-nightmare | 1 | 3 | completed | 18 | 18 | 1780.698 | 2246.164 | 1 | 28860 |
| 14x14-nightmare | 2 | 3 | completed | 36 | 36 | 1796.577 | 2247.534 | 1.0089 | 29344 |
| 14x14-nightmare | 4 | 3 | completed | 72 | 72 | 1792.537 | 2242.519 | 1.0066 | 28887 |
| 14x14-nightmare | 8 | 3 | completed | 144 | 144 | 1831.441 | 2270.539 | 1.0285 | 29889 |
