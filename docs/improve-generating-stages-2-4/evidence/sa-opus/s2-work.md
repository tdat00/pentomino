# V4-S2: the work condition of rule (c5) on the pilot journals (SA-Opus scratch, round 1)

Computed by `s2-work.mjs` with T09c's `rowLedger` and `workRule` and T09b's `pairRows`, `ratiosOf`, `matchedSets`,
`clueRule` and `fasterRule` (10,000 resamples, seed 20261116) over the pilot reps 0 to 4 of `fr-screen` (screen arm) and
`fr-none` (no-screen arm). Five fitting seeds: an indication of decidability, never a verdict. Work in G units per accepted puzzle.

| Class (cells) | screen lo | screen hi | no-screen lo | no-screen hi | work rule | screen width | no-screen width | faster geo | lower 10 % | min cell geo | clue n | median d | moved >= 2 |
|---|---:|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|
| n-small (10x10, 12x12) | 1.55 | 1.81 | 1.65 | 2.21 | unknown | 0.26 | 0.56 | 1.081 | 0.921 | 0.687 | 10 | 1.00 | 0 |
| n-mid (14x14, 15x15b10, 16x16, 15x20) | 0.95 | 2.70 | 2.24 | 4.37 | unknown | 1.75 | 2.13 | 2.208 | 2.050 | 1.651 | 20 | 0.00 | 0 |
| n-mid-a (14x14, 15x15b10, 16x16) | 0.98 | 2.28 | 2.51 | 4.23 | pass | 1.30 | 1.72 | 2.433 | 2.349 | 2.239 | 15 | 0.00 | 0 |
| n-mid-b (14x14, 15x15b10) | 0.97 | 1.93 | 2.63 | 3.94 | pass | 0.96 | 1.30 | 2.537 | 2.406 | 2.474 | 10 | 0.00 | 0 |
| n-large (26x26) | 1.11 | 61.65 | 1.58 | 68.88 | unknown | 60.54 | 67.30 | 1.458 | 1.348 | 1.458 | 5 | 0.00 | 0 |
| hell-1 (26x26) | 3.86 | 52.55 | 4.24 | 64.19 | unknown | 48.70 | 59.95 | 1.074 | 0.919 | 1.074 | 5 | 0.50 | 0 |
| cell 10x10-nightmare | 2.20 | 2.37 | 1.64 | 2.02 | worse | 0.17 | 0.38 | 0.687 | 0.582 | 0.687 | 5 | 1.00 | 0 |
| cell 12x12-nightmare | 0.89 | 1.24 | 1.66 | 2.40 | pass | 0.35 | 0.74 | 1.702 | 1.351 | 1.702 | 5 | 1.00 | 0 |
| cell 14x14-nightmare | 0.95 | 1.75 | 2.58 | 3.73 | pass | 0.80 | 1.15 | 2.601 | 2.402 | 2.601 | 5 | 0.00 | 0 |
| cell 15x15b10-nightmare | 0.99 | 2.10 | 2.69 | 4.14 | pass | 1.11 | 1.46 | 2.474 | 2.248 | 2.474 | 5 | 0.00 | 0 |
| cell 16x16-nightmare | 1.00 | 3.00 | 2.27 | 4.83 | unknown | 2.00 | 2.56 | 2.239 | 2.200 | 2.239 | 5 | 0.50 | 0 |
| cell 15x20-nightmare | 0.86 | 3.94 | 1.41 | 4.78 | unknown | 3.08 | 3.37 | 1.651 | 1.363 | 1.651 | 5 | 0.00 | 0 |
| cell 26x26-nightmare | 1.11 | 61.65 | 1.58 | 68.88 | unknown | 60.54 | 67.30 | 1.458 | 1.348 | 1.458 | 5 | 0.00 | 0 |
| cell 26x26-hell-1 | 3.86 | 52.55 | 4.24 | 64.19 | unknown | 48.70 | 59.95 | 1.074 | 0.919 | 1.074 | 5 | 0.50 | 0 |

## Where the width comes from: the open primitives of terminated calls

One line per arm and cell: the open primitives (a `begin` line without its completion in a call closed by a confirmed
worker termination), by kind and stage, their summed bound, and the median completed units of the same kind in the same
arm and cell; "bound / median done" says how loose the proved bound is against what such a primitive usually charges.

| Arm | Cell | open | by kind | by stage | sum of bounds G | median bound G | median done (same kind) G | bound / median done | width G (hi - lo) |
|---|---|---:|---|---|---:|---:|---:|---:|---:|
| fr-screen | 10x10-nightmare | 21 | screen 21 | batch 14, set 7 | 8.7 | 0.42 | 0.133 (screen) | 3.1 | 8.7 |
| fr-screen | 12x12-nightmare | 25 | screen 25 | set 12, batch 13 | 17.6 | 0.72 | 0.134 (screen) | 5.4 | 17.6 |
| fr-screen | 14x14-nightmare | 26 | screen 26 | set 11, batch 15 | 40.2 | 1.55 | 0.173 (screen) | 8.9 | 40.2 |
| fr-screen | 15x15b10-nightmare | 26 | screen 26 | set 11, batch 15 | 55.5 | 2.14 | 0.167 (screen) | 12.8 | 55.5 |
| fr-screen | 15x20-nightmare | 24 | screen 24 | batch 15, set 9 | 154.0 | 6.39 | 0.113 (screen) | 56.3 | 154.0 |
| fr-screen | 16x16-nightmare | 26 | screen 26 | set 11, batch 15 | 100.0 | 4.01 | 0.139 (screen) | 28.8 | 100.0 |
| fr-screen | 26x26-hell-1 | 24 | screen 24 | batch 15, set 9 | 2434.8 | 100.07 | 0.305 (screen) | 328.5 | 2434.8 |
| fr-screen | 26x26-nightmare | 22 | screen 22 | batch 16, set 6 | 3026.8 | 142.08 | 0.182 (screen) | 781.7 | 3026.8 |
| fr-none | 10x10-nightmare | 19 | rate 19 | batch 12, set 7 | 19.0 | 1.00 | 0.300 (rate) | 3.3 | 19.0 |
| fr-none | 12x12-nightmare | 28 | rate 28 | batch 15, set 13 | 36.9 | 1.32 | 0.360 (rate) | 3.7 | 36.9 |
| fr-none | 14x14-nightmare | 26 | rate 26 | set 11, batch 15 | 57.4 | 2.20 | 0.329 (rate) | 6.7 | 57.4 |
| fr-none | 15x15b10-nightmare | 26 | rate 26 | batch 16, set 10 | 72.8 | 2.88 | 0.273 (rate) | 10.6 | 72.8 |
| fr-none | 15x20-nightmare | 23 | rate 23 | set 9, batch 14 | 168.5 | 7.30 | 0.126 (rate) | 57.8 | 168.5 |
| fr-none | 16x16-nightmare | 27 | rate 27 | batch 15, set 12 | 128.2 | 4.74 | 0.179 (rate) | 26.5 | 128.2 |
| fr-none | 26x26-hell-1 | 28 | rate 28 | batch 16, set 12 | 2997.7 | 101.26 | 0.566 (rate) | 178.9 | 2997.7 |
| fr-none | 26x26-nightmare | 24 | rate 24 | batch 16, set 8 | 3364.8 | 144.41 | 0.186 (rate) | 777.5 | 3364.8 |
| fr-base | 12x12-nightmare | 26 | rate 26 | batch 13, set 13 | 34.1 | 1.31 | 0.377 (rate) | 3.5 | 34.1 |
| fr-base | 14x14-hell-1 | 27 | rate 27 | batch 16, set 11 | 37.6 | 1.34 | 0.760 (rate) | 1.8 | 37.6 |
| fr-base | 14x14-nightmare | 26 | screen 26 | set 11, batch 15 | 39.7 | 1.54 | 0.174 (screen) | 8.8 | 39.7 |
| fr-base | 20x20-hell-1 | 27 | rate 27 | batch 15, set 12 | 257.4 | 8.87 | 0.141 (rate) | 63.1 | 257.4 |
| fr-base | 24x24-hell-1 | 23 | rate 23 | batch 15, set 8 | 1246.5 | 57.34 | 0.591 (rate) | 97.0 | 1246.5 |
| fr-base | 26x26-hell-1 | 28 | rate 28 | batch 16, set 12 | 3022.3 | 102.13 | 0.559 (rate) | 182.8 | 3022.3 |
| fr-base | 26x26-nightmare | 24 | rate 24 | batch 16, set 8 | 3368.8 | 144.41 | 0.186 (rate) | 777.8 | 3368.8 |
