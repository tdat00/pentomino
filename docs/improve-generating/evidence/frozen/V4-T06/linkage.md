# V4-T06 batch linkage

> **Frozen source `3fc65f4`.** Measured on frozen 3fc65f4 (source digest e181df2c…). Re-run: pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\V4-T06.json -Label frozen -SourceLabel <label> -LockHelper <path>.

**linkage: pass**

Pool width 4. Times are in ms; `idleWorkerMs` sums `(pool - inflight) x dt` over the await periods.

## Batches

| Arm | Row | Dispatched | Completed | Accepted | Rejected | Failed | Discarded (done / in flight) | Awaits | Await ms | Idle worker ms | Set s | Accepted puzzles | Attempts matched | Timeline |
|---|---|---:|---:|---:|---:|---|---|---:|---:|---:|---:|---:|---|---|
| log-link | 26x26-nightmare~0 | 14 | 14 | 9 | 0 | - | 1 / 4 | 9 | 7779.634 | 5.974 | 1.05 | 10 | yes | valid |
| log-link | 26x26-nightmare~1 | 27 | 27 | 9 | 0 | - | 14 / 4 | 9 | 22637.235 | 12.95 | 5.94 | 10 | yes | valid |
| v4-link | 26x26-nightmare~0 | 15 | 15 | 9 | 0 | - | 2 / 4 | 9 | 13140.333 | 15.015 | 0.99 | 10 | yes | valid |
| v4-link | 26x26-nightmare~1 | 14 | 14 | 9 | 0 | - | 1 / 4 | 9 | 6982.69 | 6.56 | 6.84 | 10 | yes | valid |

## Result identity against V4-T04's log arm (T06a-T01)

| Arm | Seed | resultDigest | Reference resultDigest | |
|---|---|---|---|---|
| log-link | landscape/26x26-nightmare/0 | 2c9671fcd9a9561cce05fce2d7ccc500d659e47da1a9ddea497deff9408f3588 | 2c9671fcd9a9561cce05fce2d7ccc500d659e47da1a9ddea497deff9408f3588 | equal |
| log-link | landscape/26x26-nightmare/1 | 7d594bd68183adfc7fb55a55153cb86dd2347130a7b843cb66d1af7e2ed29a83 | 7d594bd68183adfc7fb55a55153cb86dd2347130a7b843cb66d1af7e2ed29a83 | equal |
