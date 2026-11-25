# Pool probe: one rating's time at 1, 2, 4 and 8 concurrent workers (V4-T10c)

> **Frozen source `3fc65f4`.** Measured on frozen 3fc65f4 (source digest e181df2c…). Re-run: pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\V4-T10c.json -Label frozen -SourceLabel <label> -LockHelper <path>.

width: complete

Context: R23 measured one rating 9 to 28 % longer at eight workers than at four. The probe decides whether P8 is worth more work (plan P8); every gate stays at four workers.

## Machine

16 logical CPUs (`os.cpus().length`), first CPU `AMD EPYC 7763 64-Core Processor`, 68665831424 bytes of memory (`os.totalmem()`).

## Widths

Each item starts `width` worker threads together in the `base` tree (the frozen source unchanged); every worker loads the engine, says `ready`, waits for the parent's `go` (sent once every worker is ready) and then rates each of the six window subsets of the case's first carved set (T10a's corpus) 1 time, timing each rating. `expected` is rounds x 6 x width ratings and `observed` the ratings timed; `medianMs` and `p90Ms` are over all of them (the 90th percentile is the value at index `ceil(0.9 n) - 1` of the ascending list); `slowdown` is `medianMs` of the width over `medianMs` of width 1. The numbers are measurements: the probe judges nothing, and a partial width is `censored`, never a pass.

| case | width | rounds | status | expected | observed | medianMs | p90Ms | slowdown | itemMs |
|---|---|---|---|---|---|---|---|---|---|
| 26x26-nightmare | 1 | 1 | completed | 6 | 6 | 557.3985 | 851.114 | 1 | 3522 |
| 26x26-nightmare | 2 | 1 | completed | 12 | 12 | 587.0625 | 893.259 | 1.0532 | 3539 |
| 26x26-nightmare | 4 | 1 | completed | 24 | 24 | 654.62 | 873.796 | 1.1744 | 3850 |
| 26x26-nightmare | 8 | 1 | completed | 48 | 48 | 853.515 | 1134.288 | 1.5312 | 4807 |
