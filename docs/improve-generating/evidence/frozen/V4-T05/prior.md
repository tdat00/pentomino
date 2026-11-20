# Per-set prior (V4-T05)

> **Frozen source `3fc65f4`.** Measured on frozen 3fc65f4 (source digest e181df2c…). Re-run: pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\V4-T05.json -Label frozen -SourceLabel <label> -LockHelper <path>.

prior: pass

Calibration window count 7; 2 batch start lines.

## Rows

| item | status | detail |
|---|---|---|
| prior-gen:v4-ps:14x14-nightmare:ig-v4/prior/14x14-nightmare:gen | completed | ok, 3 puzzles |
| prior-replay:v4-ps:14x14-nightmare:ig-v4/prior/14x14-nightmare:puzzle-0 | completed | calibration matched |
| prior-replay:v4-ps:14x14-nightmare:ig-v4/prior/14x14-nightmare:puzzle-1 | completed | candidate matched |
| prior-replay:v4-ps:14x14-nightmare:ig-v4/prior/14x14-nightmare:puzzle-2 | completed | candidate matched |

## Candidate records

| igPrior | algo |
|---|---|
| 7 | gen-v4-proto:v4-ps |
| 7 | gen-v4-proto:v4-ps |

## Batch start lines

| K | priorCount | expected |
|---|---|---|
| 22 | 7 | 7 |
| 22 | 7 | 7 |
