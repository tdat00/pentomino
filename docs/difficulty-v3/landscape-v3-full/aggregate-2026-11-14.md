# Production-engine calibration landscape (2026-11-14)

Outcome: **blocked**. Calibration evidence only: it changes no limit, level band or qualification gate. An unmet measured-row criterion is a blocker pending optimisation or an explicitly approved baseline correction.

- Source commit: a1b93548863b4a15ae1c6b51dacd20daf89b0470 (9 reports); f33aa7158aec19cbd06b7a788c69b25b0050fafe+uncommitted-changes (18 reports); 917052a946b19de7cc0ac8214dddb1995561d70d (78 reports)
- Source digest: 34cea38645e079478ff3463c67c72d2701a0fe84983fc3bda5dd5d3b33377918
- Seeds per cell: 20 (the acceptance sample is 20); Node workers: 4
- Coverage: 83 of 105 selected cells complete (105 cells in the full landscape; 0 NOT RUN) on 16 boards; 1726 timed runs; 23693 diagnostic profile samples

## Denominators and conditional statistics

- Request in-band rate = runs with ten strictly distinct, validated, in-band puzzles / all non-interrupted runs of the cell.
- T10 percentiles are conditional on those complete runs; `max T10` uses the response time of runs that never reached ten.
- Sampled-profile in-band rate = diagnostic samples in the level band / all samples (every sample, accepted or not).
- Profile latency is an RPC round trip of the canonical rating task, not worker CPU time.
- Reference numbers are historical prototype measurements or forecasts (n/m); forecasts are not timing bounds.

## Cells

| Cell | Area | Runs | Request in-band | T10 med* | T10 p95* | Max T10 | K obs | Policy K | Sampled in-band | Saturated | Criterion 1 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 6x10-very-easy | 60 | 20/20 | 65% | 0.3 s | 0.4 s | 0.7 s | 6,7 | 6-7 | 20% | 0% | fail |
| 6x10-easy | 60 | 20/20 | 85% | 0.3 s | 0.4 s | 0.7 s | 7,8 | 7-8 | 33% | 0% | fail |
| 6x10-normal | 60 | 20/20 | 95% | 0.6 s | 1.2 s | 1.2 s | 8,9 | 8-9 | 9% | 0% | pass |
| 6x10-hard | 60 | 20/20 | 100% | 0.8 s | 2.6 s | 2.9 s | 9,10,11 | 9-11 | 13% | 0% | pass |
| 6x10-expert | 60 | 20/20 | 100% | 0.9 s | 1.3 s | 1.7 s | 11,12 | 11-12 | 16% | 0% | pass |
| 6x10-master | 60 | 20/20 | 100% | 1.2 s | 1.7 s | 1.8 s | 12,13 | 12-13 | 18% | 0% | pass |
| 3x29-very-easy | 87 | 20/20 | 90% | 0.4 s | 0.5 s | 0.7 s | 7 | 7-7 | 19% | 0% | pass |
| 3x29-easy | 87 | 20/20 | 100% | 0.3 s | 0.4 s | 0.4 s | 8,9 | 8-9 | 35% | 0% | pass |
| 3x29-normal | 87 | 20/20 | 100% | 0.7 s | 1.3 s | 1.5 s | 9,10 | 9-10 | 16% | 0% | pass |
| 3x29-hard | 87 | 20/20 | 100% | 0.5 s | 0.8 s | 1.0 s | 10,11,12 | 10-12 | 17% | 0% | pass |
| 3x29-expert | 87 | 20/20 | 100% | 0.7 s | 1.5 s | 1.6 s | 12,13,14 | 12-14 | 12% | 0% | pass |
| 3x29-master | 87 | 20/20 | 100% | 2.0 s | 4.2 s | 14.8 s | 14,15 | 14-15 | 15% | 0% | pass |
| 3x29-nightmare | 87 | 20/20 | 100% | 5.3 s | 7.6 s | 9.8 s | 17,18,19 | 17-19 | 17% | 0% | pass |
| 10x10-easy | 100 | 20/20 | 100% | 0.3 s | 0.4 s | 0.5 s | 8,9 | 8-9 | 35% | 0% | pass |
| 10x10-normal | 100 | 20/20 | 100% | 0.6 s | 1.3 s | 3.6 s | 9,10,11 | 9-11 | 15% | 0% | pass |
| 10x10-hard | 100 | 20/20 | 100% | 0.6 s | 0.9 s | 1.5 s | 11,12 | 11-12 | 12% | 0% | pass |
| 10x10-expert | 100 | 20/20 | 100% | 0.9 s | 2.7 s | 3.0 s | 12,13,14 | 12-14 | 15% | 0% | pass |
| 10x10-master | 100 | 20/20 | 100% | 9.0 s | 16.4 s | 18.3 s | 14,15,16 | 14-16 | 15% | 0% | pass |
| 10x10-nightmare | 100 | 20/20 | 95% | 24.0 s | 68.4 s | 120.6 s | 17,18,19,20 | 17-20 | 14% | 0% | pass |
| 12x12-easy | 144 | 20/20 | 100% | 0.4 s | 0.5 s | 0.5 s | 9,10 | 9-10 | 40% | 0% | pass |
| 12x12-normal | 144 | 20/20 | 100% | 0.9 s | 1.4 s | 1.6 s | 10,11,12 | 10-12 | 23% | 0% | pass |
| 12x12-hard | 144 | 20/20 | 100% | 0.6 s | 1.5 s | 2.4 s | 12,13,14 | 12-14 | 12% | 0% | pass |
| 12x12-expert | 144 | 20/20 | 100% | 0.9 s | 2.5 s | 2.8 s | 14,15,16 | 14-16 | 9% | 0% | pass |
| 12x12-master | 144 | 20/20 | 100% | 6.0 s | 18.4 s | 19.0 s | 16,17,18 | 16-18 | 14% | 0% | pass |
| 12x12-nightmare | 144 | 20/20 | 85% | 62.1 s | 176.1 s | 191.1 s | 19,20,21,22 | 19-22 | 11% | 0% | fail |
| 14x14-easy | 196 | 20/20 | 100% | 0.4 s | 0.5 s | 0.6 s | 11 | 11-11 | 30% | 0% | pass |
| 14x14-normal | 196 | 20/20 | 100% | 0.8 s | 3.9 s | 4.6 s | 11,12,13 | 11-13 | 28% | 0% | pass |
| 14x14-hard | 196 | 20/20 | 100% | 0.7 s | 1.2 s | 1.3 s | 13,14,15 | 13-15 | 13% | 0% | pass |
| 14x14-expert | 196 | 20/20 | 100% | 0.9 s | 1.6 s | 1.8 s | 15,16,17 | 15-17 | 8% | 0% | pass |
| 14x14-master | 196 | 20/20 | 100% | 2.6 s | 16.3 s | 17.9 s | 17,18,19 | 17-19 | 12% | 0% | pass |
| 14x14-nightmare | 196 | 20/20 | 55% | 113.0 s | 151.6 s | 212.6 s | 21,22,23,24 | 21-24 | 12% | 0% | fail |
| 14x14-hell-1 | 196 | 20/20 | 0% | n/a | n/a | 229.1 s | 32,35 | 31-35 | 8% | 0% | fail |
| 15x15b10-easy | 215 | 20/20 | 100% | 0.4 s | 0.5 s | 0.6 s | 11 | 11-11 | 28% | 0% | pass |
| 15x15b10-normal | 215 | 20/20 | 100% | 1.4 s | 2.6 s | 3.4 s | 11,12,13 | 11-13 | 26% | 0% | pass |
| 15x15b10-hard | 215 | 20/20 | 100% | 1.2 s | 2.1 s | 2.9 s | 13,14,15 | 13-15 | 11% | 0% | pass |
| 15x15b10-expert | 215 | 20/20 | 100% | 1.6 s | 2.8 s | 3.3 s | 15,16,17 | 15-17 | 10% | 0% | pass |
| 15x15b10-master | 215 | 20/20 | 100% | 5.1 s | 18.0 s | 28.4 s | 17,18,19,20 | 17-20 | 13% | 0% | pass |
| 15x15b10-nightmare | 215 | 20/20 | 55% | 86.2 s | 141.6 s | 200.6 s | 22,23,24 | 22-24 | 8% | 0% | fail |
| 15x15b10-hell-1 | 215 | 3/20 | 0% | n/a | n/a | 115.0 s | n/a | 32-36 | n/a | n/a | fail |
| 16x16-normal | 256 | 20/20 | 100% | 1.4 s | 3.9 s | 4.9 s | 12,13,14 | 12-14 | 21% | 0% | pass |
| 16x16-hard | 256 | 20/20 | 100% | 0.8 s | 1.3 s | 2.0 s | 14,15,16 | 14-16 | 11% | 0% | pass |
| 16x16-expert | 256 | 20/20 | 100% | 1.2 s | 2.1 s | 3.4 s | 16,17,18 | 16-18 | 8% | 0% | pass |
| 16x16-master | 256 | 20/20 | 100% | 4.6 s | 7.7 s | 9.8 s | 18,19,20,21 | 18-21 | 14% | 0% | pass |
| 16x16-nightmare | 256 | 20/20 | 75% | 79.8 s | 135.4 s | 150.5 s | 23,24,25 | 23-25 | 8% | 0% | fail |
| 16x16-hell-1 | 256 | 3/20 | 0% | n/a | n/a | 115.0 s | n/a | 34-38 | n/a | n/a | fail |
| 15x20-normal | 300 | 20/20 | 100% | 1.1 s | 2.1 s | 2.7 s | 13,14 | 13-14 | 19% | 0% | pass |
| 15x20-hard | 300 | 20/20 | 100% | 0.7 s | 1.2 s | 1.4 s | 15,16,17 | 15-17 | 16% | 0% | pass |
| 15x20-expert | 300 | 20/20 | 100% | 1.3 s | 2.3 s | 6.4 s | 17,18,19 | 17-19 | 9% | 0% | pass |
| 15x20-master | 300 | 20/20 | 100% | 4.0 s | 9.1 s | 13.6 s | 19,20,21,22 | 19-22 | 9% | 0% | pass |
| 15x20-nightmare | 300 | 20/20 | 75% | 40.1 s | 111.2 s | 155.7 s | 24,25,26,27 | 24-27 | 11% | 0% | fail |
| 15x20-hell-1 | 300 | 3/20 | 0% | n/a | n/a | 115.0 s | n/a | 35-40 | n/a | n/a | fail |
| 15x20-hell-2 | 300 | 3/20 | 0% | n/a | n/a | 115.0 s | n/a | 47-53 | n/a | n/a | fail |
| 18x18-normal | 324 | 20/20 | 100% | 1.0 s | 2.8 s | 3.7 s | 14 | 14-14 | 13% | 0% | pass |
| 18x18-hard | 324 | 20/20 | 100% | 0.8 s | 2.0 s | 2.6 s | 15,16,17 | 15-17 | 16% | 0% | pass |
| 18x18-expert | 324 | 20/20 | 100% | 1.5 s | 3.9 s | 6.3 s | 17,18,19,20 | 17-20 | 8% | 0% | pass |
| 18x18-master | 324 | 20/20 | 100% | 3.5 s | 6.8 s | 7.0 s | 20,21,22 | 20-22 | 12% | 0% | pass |
| 18x18-nightmare | 324 | 20/20 | 100% | 37.3 s | 134.5 s | 138.2 s | 24,25,26,27 | 24-27 | 8% | 0% | pass |
| 18x18-hell-1 | 324 | 3/20 | 0% | n/a | n/a | 115.0 s | n/a | 36-41 | n/a | n/a | fail |
| 18x18-hell-2 | 324 | 3/20 | 0% | n/a | n/a | 115.0 s | n/a | 48-54 | n/a | n/a | fail |
| 18x20-hard | 360 | 20/20 | 100% | 0.9 s | 1.7 s | 2.0 s | 16,17,18 | 16-18 | 13% | 0% | pass |
| 18x20-expert | 360 | 20/20 | 100% | 1.5 s | 3.3 s | 4.4 s | 18,19,20 | 18-20 | 8% | 0% | pass |
| 18x20-master | 360 | 20/20 | 100% | 3.4 s | 5.3 s | 9.6 s | 20,21,22,23 | 20-23 | 11% | 0% | pass |
| 18x20-nightmare | 360 | 20/20 | 100% | 16.8 s | 63.1 s | 63.8 s | 25,26,27,28 | 25-28 | 14% | 0% | pass |
| 18x20-hell-1 | 360 | 3/20 | 0% | n/a | n/a | 115.0 s | n/a | 37-42 | n/a | n/a | fail |
| 18x20-hell-2 | 360 | 3/20 | 0% | n/a | n/a | 115.0 s | n/a | 50-56 | n/a | n/a | fail |
| 20x20-hard | 400 | 20/20 | 100% | 0.9 s | 2.0 s | 3.5 s | 16,17,18 | 16-18 | 18% | 0% | pass |
| 20x20-expert | 400 | 20/20 | 100% | 2.1 s | 6.3 s | 6.4 s | 18,19,20,21 | 18-21 | 10% | 0% | pass |
| 20x20-master | 400 | 20/20 | 100% | 4.5 s | 7.2 s | 10.5 s | 21,22,23 | 21-23 | 7% | 0% | pass |
| 20x20-nightmare | 400 | 20/20 | 95% | 20.1 s | 114.0 s | 136.7 s | 26,27,28,29 | 26-29 | 12% | 0% | pass |
| 20x20-hell-1 | 400 | 3/20 | 0% | n/a | n/a | 115.0 s | n/a | 38-42 | n/a | n/a | fail |
| 20x20-hell-2 | 400 | 3/20 | 0% | n/a | n/a | 115.0 s | n/a | 51-58 | n/a | n/a | fail |
| 20x21-hard | 420 | 20/20 | 100% | 1.0 s | 1.7 s | 1.9 s | 16,17,18 | 16-18 | 14% | 0% | pass |
| 20x21-expert | 420 | 20/20 | 100% | 2.4 s | 5.7 s | 8.4 s | 19,20,21 | 19-21 | 9% | 0% | pass |
| 20x21-master | 420 | 20/20 | 100% | 4.0 s | 6.8 s | 7.0 s | 21,22,23,24 | 21-24 | 10% | 0% | pass |
| 20x21-nightmare | 420 | 20/20 | 100% | 24.2 s | 47.9 s | 124.7 s | 26,27,28,29 | 26-29 | 11% | 0% | pass |
| 20x21-hell-1 | 420 | 3/20 | 0% | n/a | n/a | 115.0 s | n/a | 39-42 | n/a | n/a | fail |
| 20x21-hell-2 | 420 | 3/20 | 0% | n/a | n/a | 115.0 s | n/a | 52-58 | n/a | n/a | fail |
| 32x15-hard | 480 | 20/20 | 100% | 1.3 s | 2.5 s | 4.6 s | 17,18,19 | 17-19 | 16% | 0% | pass |
| 32x15-expert | 480 | 20/20 | 100% | 2.6 s | 5.7 s | 6.4 s | 19,20,21,22 | 19-22 | 8% | 0% | pass |
| 32x15-master | 480 | 20/20 | 100% | 4.6 s | 12.4 s | 20.5 s | 22,23,24,25 | 22-25 | 7% | 0% | pass |
| 32x15-nightmare | 480 | 20/20 | 100% | 11.6 s | 37.9 s | 41.2 s | 27,28,29,30 | 27-30 | 11% | 0% | pass |
| 32x15-hell-1 | 480 | 3/20 | 0% | n/a | n/a | 115.0 s | n/a | 39-42 | n/a | n/a | fail |
| 32x15-hell-2 | 480 | 3/20 | 0% | n/a | n/a | 115.0 s | n/a | 54-61 | n/a | n/a | fail |
| 32x15-hell-3 | 480 | 3/20 | 0% | n/a | n/a | 115.0 s | n/a | 72-80 | n/a | n/a | fail |
| 22x22-hard | 484 | 20/20 | 100% | 1.2 s | 3.4 s | 3.7 s | 17,18,19 | 17-19 | 14% | 0% | pass |
| 22x22-expert | 484 | 20/20 | 100% | 2.6 s | 5.8 s | 7.3 s | 19,20,21,22 | 19-22 | 8% | 0% | pass |
| 22x22-master | 484 | 20/20 | 100% | 6.0 s | 13.2 s | 16.2 s | 22,23,24,25 | 22-25 | 9% | 0% | pass |
| 22x22-nightmare | 484 | 20/20 | 100% | 17.3 s | 33.9 s | 35.9 s | 27,28,29,30 | 27-30 | 11% | 0% | pass |
| 22x22-hell-1 | 484 | 3/20 | 0% | n/a | n/a | 115.0 s | n/a | 39-42 | n/a | n/a | fail |
| 22x22-hell-2 | 484 | 3/20 | 0% | n/a | n/a | 115.0 s | n/a | 54-61 | n/a | n/a | fail |
| 22x22-hell-3 | 484 | 3/20 | 0% | n/a | n/a | 115.0 s | n/a | 73-80 | n/a | n/a | fail |
| 24x24-hard | 576 | 20/20 | 100% | 1.7 s | 6.1 s | 15.8 s | 18,19,20 | 18-20 | 15% | 0% | pass |
| 24x24-expert | 576 | 20/20 | 100% | 3.4 s | 8.9 s | 14.8 s | 20,21,22,23 | 20-23 | 8% | 0% | pass |
| 24x24-master | 576 | 20/20 | 100% | 5.9 s | 9.2 s | 11.1 s | 23,24,25,26 | 23-26 | 8% | 0% | pass |
| 24x24-nightmare | 576 | 20/20 | 100% | 18.7 s | 57.3 s | 64.0 s | 28,29,30,31,32 | 28-32 | 9% | 0% | pass |
| 24x24-hell-1 | 576 | 20/20 | 0% | n/a | n/a | 211.4 s | 39,40 | 39-42 | 1% | 0% | fail |
| 24x24-hell-2 | 576 | 3/20 | 0% | n/a | n/a | 115.0 s | n/a | 57-62 | n/a | n/a | fail |
| 24x24-hell-3 | 576 | 3/20 | 0% | n/a | n/a | 115.0 s | n/a | 76-86 | n/a | n/a | fail |
| 26x26-hard | 676 | 20/20 | 100% | 1.4 s | 4.4 s | 4.9 s | 20,21 | 20-21 | 13% | 0% | pass |
| 26x26-expert | 676 | 20/20 | 100% | 3.6 s | 6.5 s | 23.6 s | 21,22,23,24 | 21-24 | 6% | 0% | pass |
| 26x26-master | 676 | 20/20 | 100% | 8.4 s | 16.6 s | 23.3 s | 24,25,26,27 | 24-27 | 7% | 0% | pass |
| 26x26-nightmare | 676 | 20/20 | 100% | 18.6 s | 31.4 s | 35.8 s | 30,31,32,33 | 30-33 | 13% | 0% | pass |
| 26x26-hell-1 | 676 | 20/20 | 45% | 108.7 s | 167.6 s | 206.7 s | 39,40,42 | 39-42 | 6% | 0% | fail |
| 26x26-hell-2 | 676 | 3/20 | 0% | n/a | n/a | 115.0 s | n/a | 58-62 | n/a | n/a | fail |
| 26x26-hell-3 | 676 | 3/20 | 0% | n/a | n/a | 115.0 s | n/a | 80-90 | n/a | n/a | fail |

## v3 measures per cell

Measures of the accepted puzzles of the timed runs. "-" means the cell has no accepted puzzle rated by `difficulty-v3` (for example records written before v3). "Census estimates" counts the ratings whose census did not finish; "Hard+ with Gproved = 0" counts accepted puzzles of the Hard-or-above levels without a proved real choice (always 0, RES-35).

| Cell | Accepted | Score median | Score p95 | G median | info median | Cmax max | Tier 0/1/2/3 | Solutions unique/few/many/unknown | Census estimates | Hard+ with Gproved = 0 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 6x10-very-easy | 187 | 6 | 6 | 0 | 0 | 0 | 0/187/0/0 | 183/0/4/0 | 0/187 | 0 |
| 6x10-easy | 194 | 10 | 11 | 0 | 0 | 0 | 0/43/84/67 | 96/98/0/0 | 0/194 | 0 |
| 6x10-normal | 198 | 14 | 16 | 1 | 1.32 | 18 | 0/75/79/44 | 31/136/31/0 | 0/198 | 0 |
| 6x10-hard | 200 | 19 | 23 | 1 | 2 | 20 | 0/0/22/178 | 126/54/20/0 | 0/200 | 0 |
| 6x10-expert | 200 | 31 | 33 | 3 | 5.11 | 32 | 0/0/0/200 | 48/78/74/0 | 0/200 | 0 |
| 6x10-master | 200 | 43 | 49 | 5 | 9.41 | 35 | 0/0/0/200 | 5/34/161/0 | 4/200 | 0 |
| 3x29-very-easy | 196 | 6 | 6 | 0 | 0 | 0 | 0/196/0/0 | 196/0/0/0 | 0/196 | 0 |
| 3x29-easy | 200 | 10 | 11 | 0 | 0 | 0 | 0/86/46/68 | 110/79/11/0 | 0/200 | 0 |
| 3x29-normal | 200 | 15 | 16 | 1 | 0.81 | 18 | 0/49/45/106 | 1/99/100/0 | 0/200 | 0 |
| 3x29-hard | 200 | 22 | 23 | 2 | 2 | 30 | 0/5/18/177 | 18/68/114/0 | 0/200 | 0 |
| 3x29-expert | 200 | 30 | 33 | 3 | 4.64 | 25 | 0/0/4/196 | 16/89/95/0 | 0/200 | 0 |
| 3x29-master | 200 | 44 | 49 | 5 | 9.81 | 27 | 0/0/0/200 | 7/52/141/0 | 5/200 | 0 |
| 3x29-nightmare | 200 | 66 | 71 | 9 | 18.63 | 43 | 0/0/0/200 | 0/1/199/0 | 192/200 | 0 |
| 10x10-easy | 200 | 9 | 11 | 0 | 0 | 0 | 0/119/48/33 | 152/43/5/0 | 0/200 | 0 |
| 10x10-normal | 200 | 14 | 15 | 1 | 0.81 | 26 | 0/79/41/80 | 27/134/39/0 | 0/200 | 0 |
| 10x10-hard | 200 | 20 | 23 | 1.5 | 2.32 | 30 | 0/9/32/159 | 41/80/79/0 | 0/200 | 0 |
| 10x10-expert | 200 | 31 | 33 | 3 | 5.32 | 42 | 0/1/7/192 | 33/69/98/0 | 0/200 | 0 |
| 10x10-master | 200 | 45 | 49 | 5 | 10.9 | 53 | 0/0/0/200 | 40/70/90/0 | 14/200 | 0 |
| 10x10-nightmare | 199 | 66 | 71 | 8 | 21.8 | 53 | 0/0/0/199 | 0/26/167/6 | 193/199 | 0 |
| 12x12-easy | 200 | 10 | 11 | 0 | 0 | 0 | 0/144/24/32 | 154/46/0/0 | 0/200 | 0 |
| 12x12-normal | 200 | 14 | 16 | 1 | 0.81 | 20 | 0/85/25/90 | 18/136/46/0 | 0/200 | 0 |
| 12x12-hard | 200 | 20 | 23 | 1 | 2.17 | 33 | 0/11/47/142 | 70/84/46/0 | 0/200 | 0 |
| 12x12-expert | 200 | 31 | 33 | 3 | 5.89 | 37 | 0/0/11/189 | 31/112/57/0 | 0/200 | 0 |
| 12x12-master | 200 | 45 | 49 | 5 | 10.75 | 46 | 0/0/0/200 | 26/99/75/0 | 5/200 | 0 |
| 12x12-nightmare | 185 | 68 | 71 | 9 | 22.17 | 68 | 0/0/0/185 | 2/56/112/15 | 142/185 | 0 |
| 14x14-easy | 200 | 10 | 11 | 0 | 0 | 0 | 0/183/14/3 | 185/11/4/0 | 0/200 | 0 |
| 14x14-normal | 200 | 14 | 15 | 0 | 0 | 20 | 0/89/27/84 | 53/125/22/0 | 0/200 | 0 |
| 14x14-hard | 200 | 19 | 23 | 1 | 2 | 44 | 0/11/73/116 | 30/113/57/0 | 0/200 | 0 |
| 14x14-expert | 200 | 31 | 33 | 3 | 6.32 | 40 | 0/0/21/179 | 21/102/77/0 | 0/200 | 0 |
| 14x14-master | 200 | 45 | 49 | 5 | 11.58 | 45 | 0/0/2/198 | 7/67/126/0 | 4/200 | 0 |
| 14x14-nightmare | 126 | 66.5 | 71 | 8 | 21.5 | 63 | 0/0/0/126 | 3/25/96/2 | 48/126 | 0 |
| 14x14-hell-1 | 5 | 97 | 109 | 13 | 36.92 | 24 | 0/0/0/5 | 0/3/1/1 | 5/5 | 0 |
| 15x15b10-easy | 200 | 10 | 11 | 0 | 0 | 0 | 0/173/21/6 | 174/24/2/0 | 0/200 | 0 |
| 15x15b10-normal | 200 | 14 | 15 | 0 | 0 | 22 | 0/87/35/78 | 63/127/10/0 | 0/200 | 0 |
| 15x15b10-hard | 200 | 19 | 23 | 1 | 2.32 | 34 | 0/17/69/114 | 49/123/28/0 | 0/200 | 0 |
| 15x15b10-expert | 200 | 32 | 34 | 3 | 6.57 | 38 | 0/0/16/184 | 61/95/44/0 | 0/200 | 0 |
| 15x15b10-master | 200 | 45 | 49 | 5 | 11.75 | 60 | 0/0/3/197 | 22/88/90/0 | 6/200 | 0 |
| 15x15b10-nightmare | 141 | 66 | 71 | 8 | 21.65 | 63 | 0/0/0/141 | 4/30/107/0 | 48/141 | 0 |
| 15x15b10-hell-1 | - | - | - | - | - | - | - | - | - | - |
| 16x16-normal | 200 | 15 | 16 | 1 | 0.81 | 20 | 0/110/28/62 | 39/145/16/0 | 0/200 | 0 |
| 16x16-hard | 200 | 19 | 23 | 1 | 2 | 32 | 0/15/77/108 | 11/160/29/0 | 0/200 | 0 |
| 16x16-expert | 200 | 31 | 33 | 3 | 6.34 | 48 | 0/1/23/176 | 7/78/115/0 | 1/200 | 0 |
| 16x16-master | 200 | 45 | 49 | 5 | 12.06 | 52 | 0/0/2/198 | 4/45/151/0 | 7/200 | 0 |
| 16x16-nightmare | 181 | 66 | 71 | 8 | 21.96 | 69 | 0/0/0/181 | 3/18/160/0 | 71/181 | 0 |
| 16x16-hell-1 | - | - | - | - | - | - | - | - | - | - |
| 15x20-normal | 200 | 14 | 16 | 0 | 0 | 18 | 0/75/89/36 | 117/83/0/0 | 0/200 | 0 |
| 15x20-hard | 200 | 19 | 23 | 1 | 1.58 | 38 | 0/6/72/122 | 7/174/19/0 | 0/200 | 0 |
| 15x20-expert | 200 | 31 | 33 | 3 | 6.41 | 48 | 0/2/26/172 | 9/70/121/0 | 3/200 | 0 |
| 15x20-master | 200 | 44 | 49 | 5 | 11.75 | 62 | 0/0/4/196 | 3/33/164/0 | 17/200 | 0 |
| 15x20-nightmare | 181 | 66 | 71 | 8 | 23.2 | 83 | 0/0/0/181 | 1/18/162/0 | 89/181 | 0 |
| 15x20-hell-1 | - | - | - | - | - | - | - | - | - | - |
| 15x20-hell-2 | - | - | - | - | - | - | - | - | - | - |
| 18x18-normal | 200 | 14 | 16 | 0 | 0 | 18 | 0/97/85/18 | 93/101/6/0 | 0/200 | 0 |
| 18x18-hard | 200 | 19 | 23 | 1 | 2 | 32 | 0/17/114/69 | 3/149/48/0 | 0/200 | 0 |
| 18x18-expert | 200 | 31 | 33 | 3 | 6.4 | 52 | 0/1/25/174 | 8/71/121/0 | 2/200 | 0 |
| 18x18-master | 200 | 45 | 49 | 5 | 12.09 | 63 | 0/0/3/197 | 1/19/180/0 | 17/200 | 0 |
| 18x18-nightmare | 200 | 66 | 71 | 8 | 23.28 | 72 | 0/0/0/200 | 1/12/187/0 | 98/200 | 0 |
| 18x18-hell-1 | - | - | - | - | - | - | - | - | - | - |
| 18x18-hell-2 | - | - | - | - | - | - | - | - | - | - |
| 18x20-hard | 200 | 19 | 23 | 1 | 1.91 | 26 | 0/12/96/92 | 8/167/25/0 | 0/200 | 0 |
| 18x20-expert | 200 | 31 | 33 | 3 | 6.58 | 46 | 0/1/32/167 | 3/49/148/0 | 2/200 | 0 |
| 18x20-master | 200 | 44 | 49 | 5 | 12.28 | 64 | 0/0/3/197 | 0/21/179/0 | 22/200 | 0 |
| 18x20-nightmare | 200 | 65 | 71 | 8 | 23.91 | 75 | 0/0/0/200 | 0/5/195/0 | 99/200 | 0 |
| 18x20-hell-1 | - | - | - | - | - | - | - | - | - | - |
| 18x20-hell-2 | - | - | - | - | - | - | - | - | - | - |
| 20x20-hard | 200 | 19 | 23 | 1 | 1.81 | 32 | 0/9/95/96 | 0/150/50/0 | 3/200 | 0 |
| 20x20-expert | 200 | 31 | 33 | 3 | 6.52 | 51 | 0/1/36/163 | 0/46/154/0 | 10/200 | 0 |
| 20x20-master | 200 | 44.5 | 49 | 5 | 12.53 | 62 | 0/0/4/196 | 0/20/180/0 | 19/200 | 0 |
| 20x20-nightmare | 193 | 66 | 71 | 8 | 24.17 | 76 | 0/0/0/193 | 0/2/191/0 | 110/193 | 0 |
| 20x20-hell-1 | - | - | - | - | - | - | - | - | - | - |
| 20x20-hell-2 | - | - | - | - | - | - | - | - | - | - |
| 20x21-hard | 200 | 19 | 23 | 1 | 1.86 | 34 | 0/16/120/64 | 1/148/51/0 | 2/200 | 0 |
| 20x21-expert | 200 | 31 | 33 | 3 | 6.16 | 46 | 0/1/28/171 | 1/44/155/0 | 9/200 | 0 |
| 20x21-master | 200 | 44 | 49 | 5 | 11.99 | 60 | 0/0/2/198 | 3/15/182/0 | 23/200 | 0 |
| 20x21-nightmare | 200 | 66 | 71 | 8 | 23.53 | 76 | 0/0/0/200 | 0/4/196/0 | 108/200 | 0 |
| 20x21-hell-1 | - | - | - | - | - | - | - | - | - | - |
| 20x21-hell-2 | - | - | - | - | - | - | - | - | - | - |
| 32x15-hard | 200 | 19 | 23 | 1 | 1.81 | 34 | 0/13/93/94 | 2/172/26/0 | 7/200 | 0 |
| 32x15-expert | 200 | 31 | 33 | 3 | 6.11 | 45 | 0/2/29/169 | 0/41/159/0 | 5/200 | 0 |
| 32x15-master | 200 | 44 | 48 | 5 | 12.47 | 68 | 0/0/2/198 | 0/6/194/0 | 39/200 | 0 |
| 32x15-nightmare | 200 | 65 | 71 | 8 | 23.74 | 83 | 0/0/0/200 | 0/0/200/0 | 127/200 | 0 |
| 32x15-hell-1 | - | - | - | - | - | - | - | - | - | - |
| 32x15-hell-2 | - | - | - | - | - | - | - | - | - | - |
| 32x15-hell-3 | - | - | - | - | - | - | - | - | - | - |
| 22x22-hard | 200 | 19 | 23 | 1 | 1.81 | 32 | 0/21/103/76 | 1/158/41/0 | 0/200 | 0 |
| 22x22-expert | 200 | 31 | 33 | 3 | 5.97 | 52 | 0/1/27/172 | 0/22/178/0 | 12/200 | 0 |
| 22x22-master | 200 | 44 | 49 | 5 | 12.37 | 72 | 0/0/1/199 | 0/10/190/0 | 28/200 | 0 |
| 22x22-nightmare | 200 | 66 | 71 | 8 | 24.7 | 82 | 0/0/0/200 | 0/0/200/0 | 127/200 | 0 |
| 22x22-hell-1 | - | - | - | - | - | - | - | - | - | - |
| 22x22-hell-2 | - | - | - | - | - | - | - | - | - | - |
| 22x22-hell-3 | - | - | - | - | - | - | - | - | - | - |
| 24x24-hard | 200 | 19 | 23 | 1 | 1.7 | 29 | 0/14/109/77 | 2/147/51/0 | 3/200 | 0 |
| 24x24-expert | 200 | 31 | 33 | 3 | 6.06 | 50 | 0/4/34/162 | 0/12/188/0 | 19/200 | 0 |
| 24x24-master | 200 | 44 | 48 | 5 | 12.62 | 59 | 0/0/6/194 | 0/6/194/0 | 57/200 | 0 |
| 24x24-nightmare | 200 | 67 | 71 | 8 | 25.98 | 89 | 0/0/0/200 | 0/0/200/0 | 169/200 | 0 |
| 24x24-hell-1 | 13 | 97 | 102 | 12 | 44.33 | 94 | 0/0/0/13 | 0/0/13/0 | 13/13 | 0 |
| 24x24-hell-2 | - | - | - | - | - | - | - | - | - | - |
| 24x24-hell-3 | - | - | - | - | - | - | - | - | - | - |
| 26x26-hard | 200 | 19 | 23 | 1 | 1.7 | 29 | 0/15/124/61 | 0/154/46/0 | 3/200 | 0 |
| 26x26-expert | 200 | 31 | 32 | 3 | 6.05 | 52 | 0/0/39/161 | 0/11/189/0 | 22/200 | 0 |
| 26x26-master | 200 | 44.5 | 48 | 5 | 12.92 | 70 | 0/0/5/195 | 0/1/199/0 | 79/200 | 0 |
| 26x26-nightmare | 200 | 65.5 | 71 | 8 | 25.54 | 86 | 0/0/1/199 | 0/0/200/0 | 194/200 | 0 |
| 26x26-hell-1 | 134 | 97 | 103 | 12 | 44.28 | 130 | 0/0/0/134 | 0/2/132/0 | 134/134 | 0 |
| 26x26-hell-2 | - | - | - | - | - | - | - | - | - | - |
| 26x26-hell-3 | - | - | - | - | - | - | - | - | - | - |

## Reference rows (criteria 2 and 3)

| Row | Boards | Node ref max | 2x bound | Max T10 now | Status | Policy K vs table | Note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| very-easy 30-80 | 6x10 | 0.2 s (measured) | 0.4 s | 0.7 s | fail | 5-7 (agrees) |  |
| very-easy 81-87 | n/m | 0.3 s (forecast) | n/a | 0.7 s | forecast-only | 7-7 (agrees) | n/m forecast: not a timing acceptance bound |
| easy 32-80 | 6x10 | 0.1 s (measured) | 0.2 s | 0.7 s | fail | 6-9 (agrees) |  |
| easy 81-130 | 10x10 | 0.3 s (measured) | 0.6 s | 0.5 s | pass | 7-10 (agrees) |  |
| easy 131-200 | 12x12 | 0.3 s (measured) | 0.6 s | 0.5 s | pass | 9-11 (agrees) |  |
| easy 201-215 | n/m | 0.7 s (forecast) | n/a | 0.6 s | forecast-only | 11-11 (agrees) | n/m forecast: not a timing acceptance bound |
| normal 36-80 | 6x10 | 2.6 s (measured) | 5.2 s | 1.2 s | pass | 7-10 (agrees) |  |
| normal 81-130 | 10x10 | 0.8 s (measured) | 1.6 s | 3.6 s | fail | 8-11 (agrees) |  |
| normal 131-200 | 12x12 | 0.9 s (measured) | 1.8 s | 1.6 s | pass | 10-13 (agrees) |  |
| normal 201-300 | 16x16 | 0.7 s (measured) | 1.4 s | 4.9 s | fail | 11-14 (agrees) |  |
| normal 301-348 | 18x18 | 0.7 s (measured) | 1.4 s | 3.7 s | fail | 14-15 (agrees) |  |
| hard 41-80 | 6x10 | 2.4 s (measured) | 4.8 s | 2.9 s | pass | 8-12 (agrees) |  |
| hard 81-130 | 10x10 | 1 s (measured) | 2.0 s | 1.5 s | pass | 10-13 (agrees) |  |
| hard 131-200 | 12x12 | 1.6 s (measured) | 3.2 s | 2.4 s | pass | 12-15 (agrees) |  |
| hard 201-300 | n/m | 0.7 s (forecast) | n/a | 2.9 s | forecast-only | 13-17 (agrees) | n/m forecast: not a timing acceptance bound |
| hard 301-420 | 18x20 | 1.8 s (measured) | 3.6 s | 2.0 s | pass | 15-18 (agrees) |  |
| hard 421-484 | 22x22 | 1.2 s (measured) | 2.4 s | 3.7 s | fail | 16-19 (agrees) |  |
| hard 485-576 | n/m | 4.7 s (forecast) | n/a | 15.8 s | forecast-only | 17-20 (agrees) | n/m forecast: not a timing acceptance bound |
| hard 577-676 | 26x26 | 4.7 s (measured) | 9.4 s | 4.9 s | pass | 19-21 (agrees) |  |
| expert 50-80 | 6x10 | 1.1 s (measured) | 2.2 s | 1.7 s | pass | 10-13 (agrees) |  |
| expert 81-130 | 10x10 | 15.1 s (measured) | 30.2 s | 3.0 s | pass | 12-15 (agrees) | flat-carved LNS-heavy outlier (dagger in the design table); macro carving replaces this regime |
| expert 131-200 | 14x14 | 2.8 s (measured) | 5.6 s | 1.8 s | pass | 13-17 (agrees) |  |
| expert 201-300 | n/m | 0.7 s (forecast) | n/a | 6.4 s | forecast-only | 15-19 (agrees) | n/m forecast: not a timing acceptance bound |
| expert 301-420 | n/m | 1.8 s (forecast) | n/a | 8.4 s | forecast-only | 17-21 (agrees) | n/m forecast: not a timing acceptance bound |
| expert 421-484 | n/m | 1.2 s (forecast) | n/a | 7.3 s | forecast-only | 19-22 (agrees) | n/m forecast: not a timing acceptance bound |
| expert 485-576 | n/m | 4.7 s (forecast) | n/a | 14.8 s | forecast-only | 19-23 (agrees) | n/m forecast: not a timing acceptance bound |
| expert 577-676 | 26x26 | 1.2 s (measured) | 2.4 s | 23.6 s | baseline-review-required | 20-24 (agrees) | reference measured with K = 28, outside the current count policy (K 20-24); needs a reviewed new baseline |
| master 59-80 | 6x10 | 0.9 s (measured) | 1.8 s | 1.8 s | fail | 12-15 (agrees) |  |
| master 81-130 | 10x10 | 4 s (measured) | 8.0 s | 18.3 s | fail | 13-17 (agrees) |  |
| master 131-200 | 12x12 | 3.6 s (measured) | 7.2 s | 19.0 s | fail | 15-19 (agrees) |  |
| master 201-300 | 16x16 | 4.7 s (measured) | 9.4 s | 9.8 s | fail | 17-22 (agrees) |  |
| master 301-420 | 18x20 | 9.3 s (measured) | 18.6 s | 9.6 s | pass | 19-24 (agrees) |  |
| master 421-484 | 22x22 | 1.4 s (measured) | 2.8 s | 16.2 s | fail | 21-25 (agrees) |  |
| master 485-576 | n/m | 3.1 s (forecast) | n/a | 11.1 s | forecast-only | 22-26 (agrees) | n/m forecast: not a timing acceptance bound |
| master 577-676 | 26x26 | 3.1 s (measured) | 6.2 s | 23.3 s | fail | 23-27 (agrees) |  |
| nightmare 81-130 | 10x10 | 2.5 s (measured) | 5.0 s | 120.6 s | fail | 16-21 (agrees) |  |
| nightmare 131-200 | 12x12 | 29.8 s (measured) | 59.6 s | 191.1 s | fail | 19-24 (agrees) | flat-carved LNS-heavy outlier (dagger in the design table); macro carving replaces this regime |
| nightmare 201-300 | 16x16 | 11.2 s (measured) | 22.4 s | 150.5 s | fail | 21-27 (agrees) |  |
| nightmare 301-420 | 18x20 | 10.2 s (measured) | 20.4 s | 63.8 s | fail | 24-29 (agrees) |  |
| nightmare 421-484 | n/m | 10 s (forecast) | n/a | 41.2 s | forecast-only | 26-30 (agrees) | n/m forecast: not a timing acceptance bound |
| nightmare 485-576 | n/m | 10 s (forecast) | n/a | 64.0 s | forecast-only | 27-32 (agrees) | n/m forecast: not a timing acceptance bound |
| nightmare 577-676 | n/m | 10 s (forecast) | n/a | 35.8 s | forecast-only | 28-33 (agrees) | n/m forecast: not a timing acceptance bound |
| hell-1 164-200 | 14x14 | 8.3 s (measured) | 16.6 s | 229.1 s | fail | 30-36 (agrees) |  |
| hell-1 201-300 | 16x16 | 17.9 s (measured) | 35.8 s | 115.0 s | fail | 32-40 (agrees) |  |
| hell-1 301-420 | 18x18 | 12 s (measured) | 24.0 s | 115.0 s | fail | 35-42 (agrees) | K = 41 replay: 7.6 s |
| hell-1 421-484 | 22x22 | 28.1 s (measured) | 56.2 s | 115.0 s | fail | 39-42 (agrees) | K = 41 replay: 18.9 s |
| hell-1 485-576 | 24x24 | 38.4 s (measured) | 76.8 s | 211.4 s | fail | 39-42 (agrees) |  |
| hell-1 577-676 | 26x26 | 48.6 s (measured) | 97.2 s | 206.7 s | fail | 39-42 (agrees) | historical maximum from one seed |
| hell-2 266-300 | n/m | 11 s (forecast) | n/a | 115.0 s | forecast-only | 46-53 (agrees) | n/m forecast: not a timing acceptance bound |
| hell-2 301-420 | 20x20 | 13.7 s (measured) | 27.4 s | 115.0 s | fail | 47-58 (agrees) |  |
| hell-2 421-484 | 22x22 | 8.3 s (measured) | 16.6 s | 115.0 s | fail | 52-61 (agrees) |  |
| hell-2 485-576 | 24x24 | 15.2 s (measured) | 30.4 s | 115.0 s | fail | 54-62 (agrees) |  |
| hell-2 577-676 | 26x26 | 25.6 s (measured) | 51.2 s | 115.0 s | fail | 57-62 (agrees) |  |
| hell-3 450-484 | 22x22, 32x15 | 15.9 s (measured) | 31.8 s | 115.0 s | fail | 71-80 (agrees) | the original also measured 40x12, excluded by the 32-cell side limit and not part of this matrix |
| hell-3 485-576 | 24x24 | 23.6 s (measured) | 47.2 s | 115.0 s | fail | 73-86 (agrees) |  |
| hell-3 577-676 | 26x26 | 11.5 s (measured) | 23.0 s | 115.0 s | fail | 76-90 (agrees) |  |

## Score distributions of diagnostic profiles

| Group | Key | n | min | median | p95 | max | in band | saturated |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| U | 2 | 3260 | 5 | 6 | 6 | 8 | 3% | 0% |
| U | 3 | 1790 | 7 | 8 | 10 | 15 | 10% | 0% |
| U | 4 | 1504 | 7 | 9 | 11 | 22 | 10% | 0% |
| U | 5 | 1358 | 8 | 10 | 17 | 29 | 17% | 0% |
| U | 6 | 1388 | 9 | 10 | 23 | 37 | 10% | 0% |
| U | 7 | 1480 | 11 | 13 | 29 | 43 | 12% | 0% |
| U | 8 | 1334 | 11 | 13 | 36 | 49 | 12% | 0% |
| U | 9 | 1148 | 10 | 13 | 37 | 55 | 11% | 0% |
| U | 10 | 1268 | 11 | 19 | 45 | 61 | 17% | 0% |
| U | 11 | 1038 | 10 | 18.5 | 51 | 67 | 19% | 0% |
| U | 12 | 889 | 12 | 19 | 55 | 69 | 17% | 0% |
| U | 13 | 1227 | 12 | 24 | 62 | 79 | 17% | 0% |
| U | 14 | 888 | 12 | 27 | 68 | 89 | 19% | 0% |
| U | 15 | 779 | 12 | 33 | 74 | 96 | 23% | 0% |
| U | 16 | 932 | 12 | 37 | 76 | 102 | 24% | 0% |
| U | 17 | 668 | 12 | 39 | 87 | 101 | 14% | 0% |
| U | 18 | 620 | 12 | 45 | 92 | 115 | 13% | 0% |
| U | 19 | 555 | 12 | 47 | 84 | 118 | 18% | 0% |
| U | 20 | 333 | 14 | 55 | 86 | 131 | 12% | 0% |
| U | 21 | 282 | 14 | 59 | 88 | 121 | 21% | 0% |
| U | 22 | 270 | 19 | 60 | 88 | 107 | 22% | 0% |
| U | 23 | 169 | 12 | 60 | 89 | 108 | 24% | 0% |
| U | 24 | 152 | 14 | 66 | 91 | 112 | 25% | 0% |
| U | 25 | 91 | 14 | 80 | 107 | 120 | 18% | 0% |
| U | 26 | 56 | 31 | 78 | 110 | 129 | 39% | 0% |
| U | 27 | 59 | 54 | 81 | 120 | 132 | 34% | 0% |
| U | 28 | 52 | 54 | 82 | 116 | 118 | 35% | 0% |
| U | 29 | 60 | 25 | 67.5 | 105 | 111 | 22% | 0% |
| U | 30 | 28 | 45 | 80.5 | 107 | 116 | 29% | 0% |
| U | 31 | 9 | 31 | 95 | 170 | 170 | 22% | 0% |
| U | 34 | 1 | 211 | 211 | 211 | 211 | 0% | 0% |
| U | 35 | 3 | 84 | 115 | 119 | 119 | 33% | 0% |
| U | 36 | 1 | 113 | 113 | 113 | 113 | 0% | 0% |
| U | 38 | 1 | 112 | 112 | 112 | 112 | 0% | 0% |
| area | 60 | 1362 | 6 | 12 | 48 | 63 | 18% | 0% |
| area | 87 | 1819 | 6 | 12 | 68 | 109 | 18% | 0% |
| area | 100 | 1594 | 5 | 13 | 81 | 118 | 17% | 0% |
| area | 144 | 1568 | 6 | 13 | 69 | 131 | 18% | 0% |
| area | 196 | 1690 | 6 | 13 | 64 | 211 | 17% | 0% |
| area | 215 | 1660 | 6 | 13 | 58 | 101 | 16% | 0% |
| area | 256 | 1438 | 6 | 13 | 62 | 107 | 13% | 0% |
| area | 300 | 1487 | 6 | 13 | 62 | 107 | 13% | 0% |
| area | 324 | 1480 | 6 | 14 | 62 | 106 | 11% | 0% |
| area | 360 | 1300 | 6 | 14 | 71 | 107 | 11% | 0% |
| area | 400 | 1281 | 6 | 14 | 72 | 112 | 12% | 0% |
| area | 420 | 1296 | 6 | 14 | 73 | 111 | 11% | 0% |
| area | 480 | 1363 | 6 | 14 | 73 | 118 | 11% | 0% |
| area | 484 | 1346 | 6 | 14 | 72 | 132 | 10% | 0% |
| area | 576 | 1422 | 6 | 14 | 76 | 120 | 9% | 0% |
| area | 676 | 1587 | 6 | 14 | 77 | 119 | 9% | 0% |

## Blockers

- 6x10-very-easy: 13 of 20 recorded requests completed ten in-band puzzles (65%); 90% of at least 20 cannot be reached
- 6x10-easy: 17 of 20 recorded requests completed ten in-band puzzles (85%); 90% of at least 20 cannot be reached
- 12x12-nightmare: 17 of 20 recorded requests completed ten in-band puzzles (85%); 90% of at least 20 cannot be reached
- 14x14-nightmare: 11 of 20 recorded requests completed ten in-band puzzles (55%); 90% of at least 20 cannot be reached
- 14x14-hell-1: 0 of 20 recorded requests completed ten in-band puzzles (0%); 90% of at least 20 cannot be reached
- 15x15b10-nightmare: 11 of 20 recorded requests completed ten in-band puzzles (55%); 90% of at least 20 cannot be reached
- 15x15b10-hell-1: 0 of 3 recorded requests completed ten in-band puzzles (0%); 90% of at least 20 cannot be reached
- 16x16-nightmare: 15 of 20 recorded requests completed ten in-band puzzles (75%); 90% of at least 20 cannot be reached
- 16x16-hell-1: 0 of 3 recorded requests completed ten in-band puzzles (0%); 90% of at least 20 cannot be reached
- 15x20-nightmare: 15 of 20 recorded requests completed ten in-band puzzles (75%); 90% of at least 20 cannot be reached
- 15x20-hell-1: 0 of 3 recorded requests completed ten in-band puzzles (0%); 90% of at least 20 cannot be reached
- 15x20-hell-2: 0 of 3 recorded requests completed ten in-band puzzles (0%); 90% of at least 20 cannot be reached
- 18x18-hell-1: 0 of 3 recorded requests completed ten in-band puzzles (0%); 90% of at least 20 cannot be reached
- 18x18-hell-2: 0 of 3 recorded requests completed ten in-band puzzles (0%); 90% of at least 20 cannot be reached
- 18x20-hell-1: 0 of 3 recorded requests completed ten in-band puzzles (0%); 90% of at least 20 cannot be reached
- 18x20-hell-2: 0 of 3 recorded requests completed ten in-band puzzles (0%); 90% of at least 20 cannot be reached
- 20x20-hell-1: 0 of 3 recorded requests completed ten in-band puzzles (0%); 90% of at least 20 cannot be reached
- 20x20-hell-2: 0 of 3 recorded requests completed ten in-band puzzles (0%); 90% of at least 20 cannot be reached
- 20x21-hell-1: 0 of 3 recorded requests completed ten in-band puzzles (0%); 90% of at least 20 cannot be reached
- 20x21-hell-2: 0 of 3 recorded requests completed ten in-band puzzles (0%); 90% of at least 20 cannot be reached
- 32x15-hell-1: 0 of 3 recorded requests completed ten in-band puzzles (0%); 90% of at least 20 cannot be reached
- 32x15-hell-2: 0 of 3 recorded requests completed ten in-band puzzles (0%); 90% of at least 20 cannot be reached
- 32x15-hell-3: 0 of 3 recorded requests completed ten in-band puzzles (0%); 90% of at least 20 cannot be reached
- 22x22-hell-1: 0 of 3 recorded requests completed ten in-band puzzles (0%); 90% of at least 20 cannot be reached
- 22x22-hell-2: 0 of 3 recorded requests completed ten in-band puzzles (0%); 90% of at least 20 cannot be reached
- 22x22-hell-3: 0 of 3 recorded requests completed ten in-band puzzles (0%); 90% of at least 20 cannot be reached
- 24x24-hell-1: 0 of 20 recorded requests completed ten in-band puzzles (0%); 90% of at least 20 cannot be reached
- 24x24-hell-2: 0 of 3 recorded requests completed ten in-band puzzles (0%); 90% of at least 20 cannot be reached
- 24x24-hell-3: 0 of 3 recorded requests completed ten in-band puzzles (0%); 90% of at least 20 cannot be reached
- 26x26-hell-1: 9 of 20 recorded requests completed ten in-band puzzles (45%); 90% of at least 20 cannot be reached
- 26x26-hell-2: 0 of 3 recorded requests completed ten in-band puzzles (0%); 90% of at least 20 cannot be reached
- 26x26-hell-3: 0 of 3 recorded requests completed ten in-band puzzles (0%); 90% of at least 20 cannot be reached
- reference very-easy 30-80: maximum Node T10 660.9976 ms exceeds 2 x 0.2 s
- reference easy 32-80: maximum Node T10 678.2396 ms exceeds 2 x 0.1 s
- reference normal 81-130: maximum Node T10 3635.5659 ms exceeds 2 x 0.8 s
- reference normal 201-300: maximum Node T10 4856.6193 ms exceeds 2 x 0.7 s
- reference normal 301-348: maximum Node T10 3683.0086 ms exceeds 2 x 0.7 s
- reference hard 421-484: maximum Node T10 3714.0429 ms exceeds 2 x 1.2 s
- reference expert 577-676: not comparable; a reviewed new baseline is required
- reference master 59-80: maximum Node T10 1811.3067 ms exceeds 2 x 0.9 s
- reference master 81-130: maximum Node T10 18340.526299999998 ms exceeds 2 x 4 s
- reference master 131-200: maximum Node T10 19011.451100000002 ms exceeds 2 x 3.6 s
- reference master 201-300: maximum Node T10 9760.1976 ms exceeds 2 x 4.7 s
- reference master 421-484: maximum Node T10 16166.6986 ms exceeds 2 x 1.4 s
- reference master 577-676: maximum Node T10 23311.3877 ms exceeds 2 x 3.1 s
- reference nightmare 81-130: maximum Node T10 120584.34869999999 ms exceeds 2 x 2.5 s
- reference nightmare 131-200: maximum Node T10 191109.4979 ms exceeds 2 x 29.8 s
- reference nightmare 201-300: maximum Node T10 150494.98260000002 ms exceeds 2 x 11.2 s
- reference nightmare 301-420: maximum Node T10 63828.453 ms exceeds 2 x 10.2 s
- reference hell-1 164-200: maximum Node T10 229097.00710000002 ms exceeds 2 x 8.3 s
- reference hell-1 201-300: maximum Node T10 115017.713 ms exceeds 2 x 17.9 s
- reference hell-1 301-420: maximum Node T10 115011.44930000001 ms exceeds 2 x 12 s
- reference hell-1 421-484: maximum Node T10 115015.98419999999 ms exceeds 2 x 28.1 s
- reference hell-1 485-576: maximum Node T10 211352.93339999998 ms exceeds 2 x 38.4 s
- reference hell-1 577-676: maximum Node T10 206655.6013 ms exceeds 2 x 48.6 s
- reference hell-2 301-420: maximum Node T10 115017.87580000001 ms exceeds 2 x 13.7 s
- reference hell-2 421-484: maximum Node T10 115017.4957 ms exceeds 2 x 8.3 s
- reference hell-2 485-576: maximum Node T10 115020.3666 ms exceeds 2 x 15.2 s
- reference hell-2 577-676: maximum Node T10 115012.5728 ms exceeds 2 x 25.6 s
- reference hell-3 450-484: maximum Node T10 115015.3234 ms exceeds 2 x 15.9 s
- reference hell-3 485-576: maximum Node T10 115017.1805 ms exceeds 2 x 23.6 s
- reference hell-3 577-676: maximum Node T10 115013.582 ms exceeds 2 x 11.5 s

## Incomplete cells (not run, not selected, or below the requested seeds)

15x15b10-hell-1, 16x16-hell-1, 15x20-hell-1, 15x20-hell-2, 18x18-hell-1, 18x18-hell-2, 18x20-hell-1, 18x20-hell-2, 20x20-hell-1, 20x20-hell-2, 20x21-hell-1, 20x21-hell-2, 32x15-hell-1, 32x15-hell-2, 32x15-hell-3, 22x22-hell-1, 22x22-hell-2, 22x22-hell-3, 24x24-hell-2, 24x24-hell-3, 26x26-hell-2, 26x26-hell-3

## Protocol coverage (owner decision P-OD9)

Every case of the landscape matrix with the protocol derived from the Hell prescreens: 20 requests for a case that is not Hell and for a Hell case whose prescreen accepted a puzzle (status `measured`), else its 3-request prescreen stays its evidence (status `reduced (P-OD9)`: 22 cases, labelled "reduced (P-OD9): no puzzle observed in 3 requests", not offered). "Runs recorded / requested" are the tools' own counts of the aggregate, which keeps the 20-request criteria of every cell: they stay 3 / 20 for a reduced case, so the tools count it as an unfinished cell (the "selected cells complete" line above) and their criterion 1, their Blockers list and their Outcome line judge its 3 requests against the 20-request sample. Read that outcome as the tools' verdict on the criteria of the earlier calibration (the request completion rate of every cell and the reference-row timing bounds), and the findings of this task in the three lists below. "Reps" is the number of completed distinct requests of the case in the selected report. The reports of the 18 GV2 cases come from the slice folder.

| Case | Active cells | Required N | Reps | Report | Status | Runs recorded / requested |
| --- | --- | --- | --- | --- | --- | --- |
| 6x10-very-easy | 60 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/6x10-very-easy-2026-11-13.json` | measured | 20 / 20 |
| 6x10-easy | 60 | 20 | 20 | `docs/difficulty-v3/landscape-v3/r2/6x10-easy-2026-11-13.json` | measured | 20 / 20 |
| 6x10-normal | 60 | 20 | 20 | `docs/difficulty-v3/landscape-v3/r2/6x10-normal-2026-11-13.json` | measured | 20 / 20 |
| 6x10-hard | 60 | 20 | 20 | `docs/difficulty-v3/landscape-v3/r2/6x10-hard-2026-11-13.json` | measured | 20 / 20 |
| 6x10-expert | 60 | 20 | 20 | `docs/difficulty-v3/landscape-v3/r2/6x10-expert-2026-11-13.json` | measured | 20 / 20 |
| 6x10-master | 60 | 20 | 20 | `docs/difficulty-v3/landscape-v3/r2/6x10-master-2026-11-13.json` | measured | 20 / 20 |
| 3x29-very-easy | 87 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/3x29-very-easy-2026-11-13.json` | measured | 20 / 20 |
| 3x29-easy | 87 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/3x29-easy-2026-11-13.json` | measured | 20 / 20 |
| 3x29-normal | 87 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/3x29-normal-2026-11-13.json` | measured | 20 / 20 |
| 3x29-hard | 87 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/3x29-hard-2026-11-13.json` | measured | 20 / 20 |
| 3x29-expert | 87 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/3x29-expert-2026-11-13.json` | measured | 20 / 20 |
| 3x29-master | 87 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/3x29-master-2026-11-13.json` | measured | 20 / 20 |
| 3x29-nightmare | 87 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/3x29-nightmare-2026-11-13.json` | measured | 20 / 20 |
| 10x10-easy | 100 | 20 | 20 | `docs/difficulty-v3/landscape-v3/r2/10x10-easy-2026-11-13.json` | measured | 20 / 20 |
| 10x10-normal | 100 | 20 | 20 | `docs/difficulty-v3/landscape-v3/r2/10x10-normal-2026-11-13.json` | measured | 20 / 20 |
| 10x10-hard | 100 | 20 | 20 | `docs/difficulty-v3/landscape-v3/r2/10x10-hard-2026-11-13.json` | measured | 20 / 20 |
| 10x10-expert | 100 | 20 | 20 | `docs/difficulty-v3/landscape-v3/r2/10x10-expert-2026-11-13.json` | measured | 20 / 20 |
| 10x10-master | 100 | 20 | 20 | `docs/difficulty-v3/landscape-v3/r2/10x10-master-2026-11-13.json` | measured | 20 / 20 |
| 10x10-nightmare | 100 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/10x10-nightmare-2026-11-13.json` | measured | 20 / 20 |
| 12x12-easy | 144 | 20 | 20 | `docs/difficulty-v3/landscape-v3/r2/12x12-easy-2026-11-13.json` | measured | 20 / 20 |
| 12x12-normal | 144 | 20 | 20 | `docs/difficulty-v3/landscape-v3/r2/12x12-normal-2026-11-13.json` | measured | 20 / 20 |
| 12x12-hard | 144 | 20 | 20 | `docs/difficulty-v3/landscape-v3/r2/12x12-hard-2026-11-13.json` | measured | 20 / 20 |
| 12x12-expert | 144 | 20 | 20 | `docs/difficulty-v3/landscape-v3/r2/12x12-expert-2026-11-13.json` | measured | 20 / 20 |
| 12x12-master | 144 | 20 | 20 | `docs/difficulty-v3/landscape-v3/r2/12x12-master-2026-11-13.json` | measured | 20 / 20 |
| 12x12-nightmare | 144 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/12x12-nightmare-2026-11-13.json` | measured | 20 / 20 |
| 14x14-easy | 196 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/14x14-easy-2026-11-13.json` | measured | 20 / 20 |
| 14x14-normal | 196 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/14x14-normal-2026-11-13.json` | measured | 20 / 20 |
| 14x14-hard | 196 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/14x14-hard-2026-11-13.json` | measured | 20 / 20 |
| 14x14-expert | 196 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/14x14-expert-2026-11-13.json` | measured | 20 / 20 |
| 14x14-master | 196 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/14x14-master-2026-11-13.json` | measured | 20 / 20 |
| 14x14-nightmare | 196 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/14x14-nightmare-2026-11-13.json` | measured | 20 / 20 |
| 14x14-hell-1 | 196 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/14x14-hell-1-2026-11-14.json` | measured | 20 / 20 |
| 15x15b10-easy | 215 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/15x15b10-easy-2026-11-13.json` | measured | 20 / 20 |
| 15x15b10-normal | 215 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/15x15b10-normal-2026-11-13.json` | measured | 20 / 20 |
| 15x15b10-hard | 215 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/15x15b10-hard-2026-11-13.json` | measured | 20 / 20 |
| 15x15b10-expert | 215 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/15x15b10-expert-2026-11-13.json` | measured | 20 / 20 |
| 15x15b10-master | 215 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/15x15b10-master-2026-11-13.json` | measured | 20 / 20 |
| 15x15b10-nightmare | 215 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/15x15b10-nightmare-2026-11-13.json` | measured | 20 / 20 |
| 15x15b10-hell-1 | 215 | 3 | 3 | `docs/difficulty-v3/landscape-v3-full/15x15b10-hell-1-s3-2026-11-14.json` | reduced (P-OD9) | 3 / 20 |
| 16x16-normal | 256 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/16x16-normal-2026-11-14.json` | measured | 20 / 20 |
| 16x16-hard | 256 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/16x16-hard-2026-11-14.json` | measured | 20 / 20 |
| 16x16-expert | 256 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/16x16-expert-2026-11-14.json` | measured | 20 / 20 |
| 16x16-master | 256 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/16x16-master-2026-11-14.json` | measured | 20 / 20 |
| 16x16-nightmare | 256 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/16x16-nightmare-2026-11-14.json` | measured | 20 / 20 |
| 16x16-hell-1 | 256 | 3 | 3 | `docs/difficulty-v3/landscape-v3-full/16x16-hell-1-s3-2026-11-14.json` | reduced (P-OD9) | 3 / 20 |
| 15x20-normal | 300 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/15x20-normal-2026-11-14.json` | measured | 20 / 20 |
| 15x20-hard | 300 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/15x20-hard-2026-11-14.json` | measured | 20 / 20 |
| 15x20-expert | 300 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/15x20-expert-2026-11-14.json` | measured | 20 / 20 |
| 15x20-master | 300 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/15x20-master-2026-11-14.json` | measured | 20 / 20 |
| 15x20-nightmare | 300 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/15x20-nightmare-2026-11-14.json` | measured | 20 / 20 |
| 15x20-hell-1 | 300 | 3 | 3 | `docs/difficulty-v3/landscape-v3-full/15x20-hell-1-s3-2026-11-14.json` | reduced (P-OD9) | 3 / 20 |
| 15x20-hell-2 | 300 | 3 | 3 | `docs/difficulty-v3/landscape-v3-full/15x20-hell-2-s3-2026-11-14.json` | reduced (P-OD9) | 3 / 20 |
| 18x18-normal | 324 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/18x18-normal-2026-11-14.json` | measured | 20 / 20 |
| 18x18-hard | 324 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/18x18-hard-2026-11-14.json` | measured | 20 / 20 |
| 18x18-expert | 324 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/18x18-expert-2026-11-14.json` | measured | 20 / 20 |
| 18x18-master | 324 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/18x18-master-2026-11-14.json` | measured | 20 / 20 |
| 18x18-nightmare | 324 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/18x18-nightmare-2026-11-14.json` | measured | 20 / 20 |
| 18x18-hell-1 | 324 | 3 | 3 | `docs/difficulty-v3/landscape-v3-full/18x18-hell-1-s3-2026-11-14.json` | reduced (P-OD9) | 3 / 20 |
| 18x18-hell-2 | 324 | 3 | 3 | `docs/difficulty-v3/landscape-v3-full/18x18-hell-2-s3-2026-11-14.json` | reduced (P-OD9) | 3 / 20 |
| 18x20-hard | 360 | 20 | 20 | `docs/difficulty-v3/landscape-v3/r2/18x20-hard-2026-11-13.json` | measured | 20 / 20 |
| 18x20-expert | 360 | 20 | 20 | `docs/difficulty-v3/landscape-v3/r2/18x20-expert-2026-11-13.json` | measured | 20 / 20 |
| 18x20-master | 360 | 20 | 20 | `docs/difficulty-v3/landscape-v3/r2/18x20-master-2026-11-13.json` | measured | 20 / 20 |
| 18x20-nightmare | 360 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/18x20-nightmare-2026-11-14.json` | measured | 20 / 20 |
| 18x20-hell-1 | 360 | 3 | 3 | `docs/difficulty-v3/landscape-v3-full/18x20-hell-1-s3-2026-11-14.json` | reduced (P-OD9) | 3 / 20 |
| 18x20-hell-2 | 360 | 3 | 3 | `docs/difficulty-v3/landscape-v3-full/18x20-hell-2-s3-2026-11-14.json` | reduced (P-OD9) | 3 / 20 |
| 20x20-hard | 400 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/20x20-hard-2026-11-14.json` | measured | 20 / 20 |
| 20x20-expert | 400 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/20x20-expert-2026-11-14.json` | measured | 20 / 20 |
| 20x20-master | 400 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/20x20-master-2026-11-14.json` | measured | 20 / 20 |
| 20x20-nightmare | 400 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/20x20-nightmare-2026-11-14.json` | measured | 20 / 20 |
| 20x20-hell-1 | 400 | 3 | 3 | `docs/difficulty-v3/landscape-v3-full/20x20-hell-1-s3-2026-11-14.json` | reduced (P-OD9) | 3 / 20 |
| 20x20-hell-2 | 400 | 3 | 3 | `docs/difficulty-v3/landscape-v3-full/20x20-hell-2-s3-2026-11-14.json` | reduced (P-OD9) | 3 / 20 |
| 20x21-hard | 420 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/20x21-hard-2026-11-14.json` | measured | 20 / 20 |
| 20x21-expert | 420 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/20x21-expert-2026-11-14.json` | measured | 20 / 20 |
| 20x21-master | 420 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/20x21-master-2026-11-14.json` | measured | 20 / 20 |
| 20x21-nightmare | 420 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/20x21-nightmare-2026-11-14.json` | measured | 20 / 20 |
| 20x21-hell-1 | 420 | 3 | 3 | `docs/difficulty-v3/landscape-v3-full/20x21-hell-1-s3-2026-11-14.json` | reduced (P-OD9) | 3 / 20 |
| 20x21-hell-2 | 420 | 3 | 3 | `docs/difficulty-v3/landscape-v3-full/20x21-hell-2-s3-2026-11-14.json` | reduced (P-OD9) | 3 / 20 |
| 32x15-hard | 480 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/32x15-hard-2026-11-14.json` | measured | 20 / 20 |
| 32x15-expert | 480 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/32x15-expert-2026-11-14.json` | measured | 20 / 20 |
| 32x15-master | 480 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/32x15-master-2026-11-14.json` | measured | 20 / 20 |
| 32x15-nightmare | 480 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/32x15-nightmare-2026-11-14.json` | measured | 20 / 20 |
| 32x15-hell-1 | 480 | 3 | 3 | `docs/difficulty-v3/landscape-v3-full/32x15-hell-1-s3-2026-11-14.json` | reduced (P-OD9) | 3 / 20 |
| 32x15-hell-2 | 480 | 3 | 3 | `docs/difficulty-v3/landscape-v3-full/32x15-hell-2-s3-2026-11-14.json` | reduced (P-OD9) | 3 / 20 |
| 32x15-hell-3 | 480 | 3 | 3 | `docs/difficulty-v3/landscape-v3-full/32x15-hell-3-s3-2026-11-14.json` | reduced (P-OD9) | 3 / 20 |
| 22x22-hard | 484 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/22x22-hard-2026-11-14.json` | measured | 20 / 20 |
| 22x22-expert | 484 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/22x22-expert-2026-11-14.json` | measured | 20 / 20 |
| 22x22-master | 484 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/22x22-master-2026-11-14.json` | measured | 20 / 20 |
| 22x22-nightmare | 484 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/22x22-nightmare-2026-11-14.json` | measured | 20 / 20 |
| 22x22-hell-1 | 484 | 3 | 3 | `docs/difficulty-v3/landscape-v3-full/22x22-hell-1-s3-2026-11-14.json` | reduced (P-OD9) | 3 / 20 |
| 22x22-hell-2 | 484 | 3 | 3 | `docs/difficulty-v3/landscape-v3-full/22x22-hell-2-s3-2026-11-14.json` | reduced (P-OD9) | 3 / 20 |
| 22x22-hell-3 | 484 | 3 | 3 | `docs/difficulty-v3/landscape-v3-full/22x22-hell-3-s3-2026-11-14.json` | reduced (P-OD9) | 3 / 20 |
| 24x24-hard | 576 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/24x24-hard-2026-11-14.json` | measured | 20 / 20 |
| 24x24-expert | 576 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/24x24-expert-2026-11-14.json` | measured | 20 / 20 |
| 24x24-master | 576 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/24x24-master-2026-11-14.json` | measured | 20 / 20 |
| 24x24-nightmare | 576 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/24x24-nightmare-2026-11-14.json` | measured | 20 / 20 |
| 24x24-hell-1 | 576 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/24x24-hell-1-2026-11-14.json` | measured | 20 / 20 |
| 24x24-hell-2 | 576 | 3 | 3 | `docs/difficulty-v3/landscape-v3-full/24x24-hell-2-s3-2026-11-14.json` | reduced (P-OD9) | 3 / 20 |
| 24x24-hell-3 | 576 | 3 | 3 | `docs/difficulty-v3/landscape-v3-full/24x24-hell-3-s3-2026-11-14.json` | reduced (P-OD9) | 3 / 20 |
| 26x26-hard | 676 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/26x26-hard-2026-11-14.json` | measured | 20 / 20 |
| 26x26-expert | 676 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/26x26-expert-2026-11-14.json` | measured | 20 / 20 |
| 26x26-master | 676 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/26x26-master-2026-11-14.json` | measured | 20 / 20 |
| 26x26-nightmare | 676 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/26x26-nightmare-2026-11-14.json` | measured | 20 / 20 |
| 26x26-hell-1 | 676 | 20 | 20 | `docs/difficulty-v3/landscape-v3-full/26x26-hell-1-2026-11-14.json` | measured | 20 / 20 |
| 26x26-hell-2 | 676 | 3 | 3 | `docs/difficulty-v3/landscape-v3-full/26x26-hell-2-s3-2026-11-14.json` | reduced (P-OD9) | 3 / 20 |
| 26x26-hell-3 | 676 | 3 | 3 | `docs/difficulty-v3/landscape-v3-full/26x26-hell-3-s3-2026-11-14.json` | reduced (P-OD9) | 3 / 20 |

## Lists

Measures of MP12a: "Request completion rate" is the share of the recorded requests that completed ten in-band puzzles and "Yield" the accepted puzzles over ten per recorded request. A missing value is `n/a` or `unavailable`.

### 1. Cells without a puzzle (22)

No selected request of the case accepted a puzzle. This says what was observed, never that the cell cannot be made. It is the input of the Hell availability record of MP12b2.

| Board | Area | Level | Requests | Accepted puzzles | Request completion rate | Yield | v3 score min / median / p95 / max | Observation | Failure reasons (requests) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 15x15b10 | 215 | hell-1 | 3 | 0 | 0.0 % | 0.0 % | unavailable | no puzzle observed in 3 requests; reduced (P-OD9) | set:time-limit x3 |
| 16x16 | 256 | hell-1 | 3 | 0 | 0.0 % | 0.0 % | unavailable | no puzzle observed in 3 requests; reduced (P-OD9) | set:time-limit x3 |
| 15x20 | 300 | hell-1 | 3 | 0 | 0.0 % | 0.0 % | unavailable | no puzzle observed in 3 requests; reduced (P-OD9) | set:time-limit x3 |
| 15x20 | 300 | hell-2 | 3 | 0 | 0.0 % | 0.0 % | unavailable | no puzzle observed in 3 requests; reduced (P-OD9) | set:time-limit x3 |
| 18x18 | 324 | hell-1 | 3 | 0 | 0.0 % | 0.0 % | unavailable | no puzzle observed in 3 requests; reduced (P-OD9) | set:time-limit x3 |
| 18x18 | 324 | hell-2 | 3 | 0 | 0.0 % | 0.0 % | unavailable | no puzzle observed in 3 requests; reduced (P-OD9) | set:time-limit x3 |
| 18x20 | 360 | hell-1 | 3 | 0 | 0.0 % | 0.0 % | unavailable | no puzzle observed in 3 requests; reduced (P-OD9) | set:time-limit x3 |
| 18x20 | 360 | hell-2 | 3 | 0 | 0.0 % | 0.0 % | unavailable | no puzzle observed in 3 requests; reduced (P-OD9) | set:time-limit x3 |
| 20x20 | 400 | hell-1 | 3 | 0 | 0.0 % | 0.0 % | unavailable | no puzzle observed in 3 requests; reduced (P-OD9) | set:time-limit x3 |
| 20x20 | 400 | hell-2 | 3 | 0 | 0.0 % | 0.0 % | unavailable | no puzzle observed in 3 requests; reduced (P-OD9) | set:time-limit x3 |
| 20x21 | 420 | hell-1 | 3 | 0 | 0.0 % | 0.0 % | unavailable | no puzzle observed in 3 requests; reduced (P-OD9) | set:time-limit x3 |
| 20x21 | 420 | hell-2 | 3 | 0 | 0.0 % | 0.0 % | unavailable | no puzzle observed in 3 requests; reduced (P-OD9) | set:time-limit x3 |
| 32x15 | 480 | hell-1 | 3 | 0 | 0.0 % | 0.0 % | unavailable | no puzzle observed in 3 requests; reduced (P-OD9) | set:time-limit x3 |
| 32x15 | 480 | hell-2 | 3 | 0 | 0.0 % | 0.0 % | unavailable | no puzzle observed in 3 requests; reduced (P-OD9) | set:time-limit x3 |
| 32x15 | 480 | hell-3 | 3 | 0 | 0.0 % | 0.0 % | unavailable | no puzzle observed in 3 requests; reduced (P-OD9) | set:time-limit x3 |
| 22x22 | 484 | hell-1 | 3 | 0 | 0.0 % | 0.0 % | unavailable | no puzzle observed in 3 requests; reduced (P-OD9) | set:time-limit x3 |
| 22x22 | 484 | hell-2 | 3 | 0 | 0.0 % | 0.0 % | unavailable | no puzzle observed in 3 requests; reduced (P-OD9) | set:time-limit x3 |
| 22x22 | 484 | hell-3 | 3 | 0 | 0.0 % | 0.0 % | unavailable | no puzzle observed in 3 requests; reduced (P-OD9) | set:time-limit x3 |
| 24x24 | 576 | hell-2 | 3 | 0 | 0.0 % | 0.0 % | unavailable | no puzzle observed in 3 requests; reduced (P-OD9) | set:time-limit x3 |
| 24x24 | 576 | hell-3 | 3 | 0 | 0.0 % | 0.0 % | unavailable | no puzzle observed in 3 requests; reduced (P-OD9) | set:time-limit x3 |
| 26x26 | 676 | hell-2 | 3 | 0 | 0.0 % | 0.0 % | unavailable | no puzzle observed in 3 requests; reduced (P-OD9) | set:time-limit x3 |
| 26x26 | 676 | hell-3 | 3 | 0 | 0.0 % | 0.0 % | unavailable | no puzzle observed in 3 requests; reduced (P-OD9) | set:time-limit x3 |

### 2. Cells whose scores never reach the central half of their band (0)

A finite band, at least one accepted v3 score, and every accepted score on one side of the central half of the band [min + (max - min) / 4, max - (max - min) / 4].

| Board | Area | Level | Requests | Accepted puzzles | Request completion rate | Yield | v3 score min / median / p95 / max | Band [min, max) | Central half | Scores lie |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

### 3. Cells with too many census estimates (31)

More than 5 % of the accepted puzzles carry a census estimate (`censored`); a share above 25 % is marked "above 25 %" (MP12b2 puts that cell to the owner).

| Board | Area | Level | Requests | Accepted puzzles | Request completion rate | Yield | v3 score min / median / p95 / max | Census estimates | Share |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 3x29 | 87 | nightmare | 20 | 200 | 100.0 % | 100.0 % | 59 / 66 / 71 / 71 | 192 of 200 | 96.0 % (above 25 %) |
| 10x10 | 100 | master | 20 | 200 | 100.0 % | 100.0 % | 41 / 45 / 49 / 49 | 14 of 200 | 7.0 % |
| 10x10 | 100 | nightmare | 20 | 199 | 95.0 % | 99.5 % | 59 / 66 / 71 / 71 | 193 of 199 | 97.0 % (above 25 %) |
| 12x12 | 144 | nightmare | 20 | 185 | 85.0 % | 92.5 % | 59 / 68 / 71 / 76 | 142 of 185 | 76.8 % (above 25 %) |
| 14x14 | 196 | nightmare | 20 | 126 | 55.0 % | 63.0 % | 59 / 66.5 / 71 / 72 | 48 of 126 | 38.1 % (above 25 %) |
| 14x14 | 196 | hell-1 | 20 | 5 | 0.0 % | 2.5 % | 87 / 97 / 109 / 109 | 5 of 5 | 100.0 % (above 25 %) |
| 15x15b10 | 215 | nightmare | 20 | 141 | 55.0 % | 70.5 % | 59 / 66 / 71 / 71 | 48 of 141 | 34.0 % (above 25 %) |
| 16x16 | 256 | nightmare | 20 | 181 | 75.0 % | 90.5 % | 59 / 66 / 71 / 71 | 71 of 181 | 39.2 % (above 25 %) |
| 15x20 | 300 | master | 20 | 200 | 100.0 % | 100.0 % | 41 / 44 / 49 / 49 | 17 of 200 | 8.5 % |
| 15x20 | 300 | nightmare | 20 | 181 | 75.0 % | 90.5 % | 59 / 66 / 71 / 74 | 89 of 181 | 49.2 % (above 25 %) |
| 18x18 | 324 | master | 20 | 200 | 100.0 % | 100.0 % | 41 / 45 / 49 / 49 | 17 of 200 | 8.5 % |
| 18x18 | 324 | nightmare | 20 | 200 | 100.0 % | 100.0 % | 59 / 66 / 71 / 71 | 98 of 200 | 49.0 % (above 25 %) |
| 18x20 | 360 | master | 20 | 200 | 100.0 % | 100.0 % | 41 / 44 / 49 / 49 | 22 of 200 | 11.0 % |
| 18x20 | 360 | nightmare | 20 | 200 | 100.0 % | 100.0 % | 59 / 65 / 71 / 71 | 99 of 200 | 49.5 % (above 25 %) |
| 20x20 | 400 | master | 20 | 200 | 100.0 % | 100.0 % | 41 / 44.5 / 49 / 49 | 19 of 200 | 9.5 % |
| 20x20 | 400 | nightmare | 20 | 193 | 95.0 % | 96.5 % | 59 / 66 / 71 / 71 | 110 of 193 | 57.0 % (above 25 %) |
| 20x21 | 420 | master | 20 | 200 | 100.0 % | 100.0 % | 41 / 44 / 49 / 49 | 23 of 200 | 11.5 % |
| 20x21 | 420 | nightmare | 20 | 200 | 100.0 % | 100.0 % | 59 / 66 / 71 / 71 | 108 of 200 | 54.0 % (above 25 %) |
| 32x15 | 480 | master | 20 | 200 | 100.0 % | 100.0 % | 41 / 44 / 48 / 49 | 39 of 200 | 19.5 % |
| 32x15 | 480 | nightmare | 20 | 200 | 100.0 % | 100.0 % | 59 / 65 / 71 / 71 | 127 of 200 | 63.5 % (above 25 %) |
| 22x22 | 484 | expert | 20 | 200 | 100.0 % | 100.0 % | 25 / 31 / 33 / 34 | 12 of 200 | 6.0 % |
| 22x22 | 484 | master | 20 | 200 | 100.0 % | 100.0 % | 41 / 44 / 49 / 49 | 28 of 200 | 14.0 % |
| 22x22 | 484 | nightmare | 20 | 200 | 100.0 % | 100.0 % | 59 / 66 / 71 / 71 | 127 of 200 | 63.5 % (above 25 %) |
| 24x24 | 576 | expert | 20 | 200 | 100.0 % | 100.0 % | 27 / 31 / 33 / 34 | 19 of 200 | 9.5 % |
| 24x24 | 576 | master | 20 | 200 | 100.0 % | 100.0 % | 41 / 44 / 48 / 49 | 57 of 200 | 28.5 % (above 25 %) |
| 24x24 | 576 | nightmare | 20 | 200 | 100.0 % | 100.0 % | 59 / 67 / 71 / 71 | 169 of 200 | 84.5 % (above 25 %) |
| 24x24 | 576 | hell-1 | 20 | 13 | 0.0 % | 6.5 % | 91 / 97 / 102 / 102 | 13 of 13 | 100.0 % (above 25 %) |
| 26x26 | 676 | expert | 20 | 200 | 100.0 % | 100.0 % | 25 / 31 / 32 / 34 | 22 of 200 | 11.0 % |
| 26x26 | 676 | master | 20 | 200 | 100.0 % | 100.0 % | 41 / 44.5 / 48 / 49 | 79 of 200 | 39.5 % (above 25 %) |
| 26x26 | 676 | nightmare | 20 | 200 | 100.0 % | 100.0 % | 59 / 65.5 / 71 / 71 | 194 of 200 | 97.0 % (above 25 %) |
| 26x26 | 676 | hell-1 | 20 | 134 | 45.0 % | 67.0 % | 85 / 97 / 103 / 109 | 134 of 134 | 100.0 % (above 25 %) |
