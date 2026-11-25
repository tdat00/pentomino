# Fitting reader: preview of fr-none (V4-SX)

> **Frozen source `3fc65f4`.** Measured on frozen 3fc65f4 (source digest e181df2c…). Re-run: pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\V4-SX.json -Label frozen -SourceLabel <label> -LockHelper <path>.

Five fitting seeds and a different time: a fitting warning, never the stage-4 no-regression verdict.

| Cell | today ten (of 5) | after ten (of 5) | ratios rep 0-4 | geo | lower | lower >= 0.9 | problems |
|---|---|---|---|---|---|---|---|
| 10x10-nightmare | 4 | 5 | 1.384, 1.583, 2.333, 0.929, 2.504 | 1.641 | 1.329 | yes |  |
| 12x12-nightmare | 5 | 5 | 14.342, 2.319, 3.031, 2.541, 3.103 | 3.802 | 2.644 | yes |  |
| 14x14-nightmare | 3 | 5 | 7.250, 6.446, 1.497, 3.270, 4.957 | 4.082 | 2.825 | yes |  |
| 15x15b10-nightmare | 3 | 5 | 3.801, 2.954, 4.587, 3.838, 3.307 | 3.657 | 3.348 | yes |  |
| 16x16-nightmare | 3 | 5 | 6.739, 4.220, 3.151, 2.625, 7.216 | 4.425 | 3.485 | yes |  |
| 15x20-nightmare | 5 | 5 | 1.424, 0.424, 3.667, 4.225, 2.617 | 1.896 | 1.119 | yes |  |
| 26x26-nightmare | 5 | 5 | 0.546, 1.707, 1.418, 1.325, 1.015 | 1.122 | 0.881 | no |  |
| 26x26-hell-1 | 3 | 5 | 4.385, 3.077, 3.715, 4.288, 2.455 | 3.503 | 3.082 | yes |  |

## Missing rows

None.

## Unexpected rows

None.

## Unreadable runs files

None.
