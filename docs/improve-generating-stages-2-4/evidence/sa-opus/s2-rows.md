# V4-S2: rows per arm and cell (SA-Opus scratch, round 1)

Computed by `s2-rows.mjs` from the published runs of `docs/improve-generating/evidence/frozen/V4-S2/` with the
harness's own `ingestRow`, `reachedTen`, `cappedT10`, `population`, `pairRows`, `ratiosOf`, `matchedSets` and `clueRule`
(`tools/ig-proto/verdicts.mjs`). Times in seconds; capped T10 at 120 s; "ten" = rows that reached ten of 5.

| Arm | Cell | Class | ten | T1 med | T10 med | T10 max | capped T10 geo | batch med | resp max | >120 s | accepted | clues med | share med | score pos | census est | set attempts | partial |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
| fr-base | 12x12-nightmare | n-small | 5 | 1.42 | 12.80 | 28.45 | 13.23 | 11.38 | 28.62 | 0 | 50 | 4.0 | 0.211 | 0.521 | 0.420 | 0 0 0 0 0 | - |
| fr-base | 14x14-hell-1 | hell-1 | 4 | 18.99 | 93.57 | 142.81 | 101.11 | 84.14 | 150.63 | 2 | 42 | 13.0 | 0.382 | 0.429 | 0.738 | 0 0 0 0 0 | 3:time-limit:2 |
| fr-base | 14x14-nightmare | n-mid | 5 | 1.62 | 8.88 | 11.52 | 8.39 | 7.26 | 11.66 | 0 | 50 | 7.0 | 0.292 | 0.479 | 0.100 | 0 0 0 0 0 | - |
| fr-base | 20x20-hell-1 | hell-1 | 5 | 5.89 | 38.38 | 48.59 | 38.61 | 30.53 | 48.75 | 0 | 50 | 14.0 | 0.350 | 0.414 | 0.380 | 0 0 0 0 0 | - |
| fr-base | 24x24-hell-1 | hell-1 | 5 | 8.15 | 37.10 | 42.95 | 34.78 | 22.78 | 43.13 | 0 | 50 | 9.0 | 0.217 | 0.514 | 0.880 | 0 0 0 0 0 | - |
| fr-base | 26x26-hell-1 | hell-1 | 5 | 6.12 | 31.86 | 44.34 | 33.46 | 23.23 | 44.53 | 0 | 50 | 8.0 | 0.200 | 0.443 | 1.000 | 0 0 0 0 0 | - |
| fr-base | 26x26-nightmare | n-large | 5 | 2.11 | 17.53 | 19.31 | 16.97 | 14.63 | 19.49 | 0 | 50 | 5.0 | 0.161 | 0.521 | 0.880 | 0 0 0 0 0 | - |
| fr-c4 | 14x14-nightmare | n-mid | 5 | 2.20 | 10.75 | 11.67 | 10.02 | 7.70 | 11.85 | 0 | 50 | 6.0 | 0.279 | 0.500 | 0.100 | 0 0 0 0 0 | - |
| fr-c4 | 26x26-nightmare | n-large | 5 | 3.37 | 20.30 | 24.31 | 20.43 | 17.88 | 24.50 | 0 | 50 | 5.0 | 0.159 | 0.542 | 0.880 | 0 0 0 0 0 | - |
| fr-close | 12x12-nightmare | n-small | 5 | 1.42 | 12.87 | 28.26 | 13.28 | 11.45 | 28.41 | 0 | 50 | 4.0 | 0.211 | 0.521 | 0.420 | 0 0 0 0 0 | - |
| fr-close | 14x14-nightmare | n-mid | 5 | 1.63 | 8.96 | 15.83 | 9.60 | 7.35 | 15.96 | 0 | 50 | 6.5 | 0.289 | 0.500 | 0.060 | 0 0 0 0 0 | - |
| fr-close | 26x26-hell-1 | hell-1 | 5 | 5.91 | 32.08 | 43.87 | 33.40 | 23.22 | 44.06 | 0 | 50 | 8.0 | 0.200 | 0.443 | 1.000 | 0 0 0 0 0 | - |
| fr-none | 10x10-nightmare | n-small | 5 | 4.26 | 10.64 | 51.43 | 14.36 | 7.88 | 51.60 | 0 | 50 | 3.0 | 0.176 | 0.500 | 0.860 | 0 0 0 0 0 | - |
| fr-none | 12x12-nightmare | n-small | 5 | 1.43 | 12.91 | 28.41 | 13.28 | 11.48 | 28.56 | 0 | 50 | 4.0 | 0.211 | 0.521 | 0.420 | 0 0 0 0 0 | - |
| fr-none | 14x14-nightmare | n-mid | 5 | 4.67 | 24.08 | 30.77 | 22.31 | 15.98 | 30.93 | 0 | 50 | 6.0 | 0.273 | 0.500 | 0.080 | 0 0 0 0 0 | - |
| fr-none | 15x15b10-nightmare | n-mid | 5 | 4.81 | 24.32 | 31.27 | 22.56 | 16.73 | 31.40 | 0 | 50 | 6.0 | 0.261 | 0.438 | 0.140 | 0 0 0 0 0 | - |
| fr-none | 15x20-nightmare | n-mid | 5 | 4.15 | 19.71 | 22.02 | 14.92 | 8.82 | 22.18 | 0 | 50 | 5.0 | 0.200 | 0.500 | 0.300 | 0 0 0 0 0 | - |
| fr-none | 16x16-nightmare | n-mid | 5 | 2.59 | 17.84 | 28.43 | 19.60 | 15.43 | 28.58 | 0 | 50 | 5.0 | 0.217 | 0.500 | 0.400 | 0 0 0 0 0 | - |
| fr-none | 26x26-hell-1 | hell-1 | 5 | 6.01 | 32.30 | 44.28 | 33.59 | 23.37 | 44.48 | 0 | 50 | 8.0 | 0.200 | 0.443 | 1.000 | 0 0 0 0 0 | - |
| fr-none | 26x26-nightmare | n-large | 5 | 2.11 | 17.94 | 19.47 | 17.25 | 14.88 | 19.62 | 0 | 50 | 5.0 | 0.161 | 0.521 | 0.880 | 0 0 0 0 0 | - |
| fr-p5 | 14x14-nightmare | n-mid | 5 | 1.66 | 8.68 | 11.47 | 8.35 | 6.97 | 11.64 | 0 | 50 | 7.0 | 0.292 | 0.479 | 0.100 | 0 0 0 0 0 | - |
| fr-p5 | 20x20-hell-1 | hell-1 | 5 | 5.41 | 42.02 | 48.94 | 35.32 | 34.57 | 49.12 | 0 | 50 | 12.0 | 0.316 | 0.386 | 0.620 | 1 0 0 0 1 | - |
| fr-p5 | 26x26-hell-1 | hell-1 | 5 | 5.99 | 35.13 | 59.88 | 37.44 | 30.37 | 60.07 | 0 | 50 | 8.0 | 0.193 | 0.443 | 1.000 | 0 0 0 0 0 | - |
| fr-ps | 20x20-hell-1 | hell-1 | 5 | 5.89 | 32.51 | 45.79 | 34.88 | 26.95 | 45.97 | 0 | 50 | 13.0 | 0.342 | 0.400 | 0.380 | 0 0 0 0 0 | - |
| fr-ps | 26x26-hell-1 | hell-1 | 5 | 5.90 | 28.03 | 41.81 | 30.96 | 20.27 | 42.00 | 0 | 50 | 8.0 | 0.200 | 0.443 | 1.000 | 0 0 0 0 0 | - |
| fr-screen | 10x10-nightmare | n-small | 5 | 4.13 | 16.28 | 72.81 | 20.90 | 13.34 | 72.98 | 0 | 50 | 4.0 | 0.235 | 0.458 | 0.500 | 0 0 0 0 0 | - |
| fr-screen | 12x12-nightmare | n-small | 5 | 1.43 | 6.76 | 16.12 | 7.80 | 6.04 | 16.29 | 0 | 50 | 5.0 | 0.263 | 0.417 | 0.160 | 0 0 0 0 0 | - |
| fr-screen | 14x14-nightmare | n-mid | 5 | 1.61 | 8.87 | 11.55 | 8.58 | 7.26 | 11.74 | 0 | 50 | 7.0 | 0.292 | 0.479 | 0.100 | 0 0 0 0 0 | - |
| fr-screen | 15x15b10-nightmare | n-mid | 5 | 1.84 | 8.14 | 14.54 | 9.12 | 6.68 | 14.72 | 0 | 50 | 6.0 | 0.267 | 0.458 | 0.040 | 0 0 0 0 0 | - |
| fr-screen | 15x20-nightmare | n-mid | 5 | 1.74 | 10.42 | 11.60 | 9.04 | 7.56 | 11.75 | 0 | 50 | 6.0 | 0.231 | 0.458 | 0.180 | 0 0 0 0 0 | - |
| fr-screen | 16x16-nightmare | n-mid | 5 | 1.47 | 7.88 | 13.25 | 8.76 | 6.82 | 13.42 | 0 | 50 | 6.0 | 0.250 | 0.500 | 0.300 | 0 0 0 0 0 | - |
| fr-screen | 26x26-hell-1 | hell-1 | 5 | 6.99 | 35.81 | 41.23 | 31.26 | 23.21 | 41.39 | 0 | 50 | 8.0 | 0.200 | 0.429 | 0.980 | 0 0 0 0 0 | - |
| fr-screen | 26x26-nightmare | n-large | 5 | 2.08 | 11.71 | 14.54 | 11.83 | 7.92 | 14.73 | 0 | 50 | 5.0 | 0.161 | 0.500 | 0.860 | 0 0 0 0 0 | - |

## Comparisons (ratio = capped T10 of b over a, per seed; matched sets by `igSetKey`)

| Kind | a | b | Cell | ratios per rep 0-4 | geo | batch geo | matched | median d (a - b) | moved >= 2 | same set | same keys | problems |
|---|---|---|---|---|---:|---:|---:|---:|---:|---|---|---|
| S2-2 screen vs none | fr-screen | fr-none | 10x10-nightmare | 0.45 0.71 0.71 1.04 0.65 | 0.687 | 0.705 | 5 | 1.00 | 0 | yyyyy | 0 0 0 4 0 | - |
| S2-2 screen vs none | fr-screen | fr-none | 12x12-nightmare | 1.12 1.20 3.54 1.76 1.71 | 1.702 | 1.772 | 5 | 1.00 | 0 | yyyyy | 3 1 0 0 1 | - |
| S2-2 screen vs none | fr-screen | fr-none | 14x14-nightmare | 3.13 2.10 2.66 2.77 2.46 | 2.601 | 2.446 | 5 | 0.00 | 0 | yyyyy | 7 1 0 1 2 | - |
| S2-2 screen vs none | fr-screen | fr-none | 15x15b10-nightmare | 2.35 2.77 3.21 2.15 2.06 | 2.474 | 2.659 | 5 | 0.00 | 0 | yyyyy | 3 0 8 2 0 | - |
| S2-2 screen vs none | fr-screen | fr-none | 16x16-nightmare | 2.26 2.15 2.23 2.34 2.22 | 2.239 | 2.138 | 5 | 0.50 | 0 | yyyyy | 1 6 0 3 1 | - |
| S2-2 screen vs none | fr-screen | fr-none | 15x20-nightmare | 1.71 1.89 2.37 1.77 0.91 | 1.651 | 1.569 | 5 | 0.00 | 0 | yyyyy | 0 4 2 0 1 | - |
| S2-2 screen vs none | fr-screen | fr-none | 26x26-nightmare | 1.28 1.28 1.34 1.66 1.81 | 1.458 | 1.720 | 5 | 0.00 | 0 | yyyyy | 1 1 0 7 6 | - |
| S2-2 screen vs none | fr-screen | fr-none | 26x26-hell-1 | 0.66 1.09 1.45 1.25 1.09 | 1.074 | 1.111 | 5 | 0.50 | 0 | yyyyy | 7 0 0 0 0 | - |
| S2-1 per-set prior vs base | fr-ps | fr-base | 26x26-hell-1 | 0.66 1.46 1.14 1.24 1.09 | 1.081 | 1.109 | 5 | 0.00 | 0 | yyyyy | 3 2 3 7 y | - |
| S2-1 per-set prior vs base | fr-ps | fr-base | 20x20-hell-1 | 1.06 0.79 1.27 1.22 1.27 | 1.107 | 1.139 | 5 | 0.00 | 0 | yyyyy | 6 2 2 3 y | - |
| S2-3 (c4) vs base | fr-c4 | fr-base | 14x14-nightmare | 0.70 0.91 1.06 0.81 0.76 | 0.837 | 0.846 | 5 | 0.00 | 0 | yyyyy | 8 1 2 0 y | - |
| S2-3 (c4) vs base | fr-c4 | fr-base | 26x26-nightmare | 0.75 1.00 0.83 0.88 0.72 | 0.831 | 0.813 | 5 | 0.00 | 0 | yyyyy | 5 0 3 6 0 | - |
| S2-4 close vs base | fr-close | fr-base | 12x12-nightmare | 0.98 0.99 1.00 1.01 1.00 | 0.997 | 1.000 | 5 | 0.00 | 0 | yyyyy | y y y y y | - |
| S2-4 close vs base | fr-close | fr-base | 14x14-nightmare | 0.77 0.99 0.73 0.88 1.04 | 0.874 | 0.913 | 5 | 0.00 | 0 | yyyyy | y 7 0 1 y | - |
| S2-4 close vs base | fr-close | fr-base | 26x26-hell-1 | 1.02 0.99 0.99 1.00 1.01 | 1.002 | 0.998 | 5 | 0.00 | 0 | yyyyy | y y y y y | - |
| S2-6 P5 vs base | fr-p5 | fr-base | 14x14-nightmare | 1.00 0.99 1.00 1.00 1.03 | 1.005 | 1.008 | 5 | 0.00 | 0 | yyyyy | y y y y y | - |
| S2-6 P5 vs base | fr-p5 | fr-base | 26x26-hell-1 | 0.81 0.64 0.91 0.72 1.67 | 0.894 | 0.794 | 5 | 0.00 | 0 | yyyyy | 1 1 1 2 0 | - |
| S2-6 P5 vs base | fr-p5 | fr-base | 20x20-hell-1 | 2.34 1.17 0.74 0.78 0.99 | 1.093 | 1.097 | 3 | 0.00 | 0 | nyyyn | 0 3 1 1 0 | - |
| same configuration (noise) | fr-base | fr-none | 12x12-nightmare | 1.00 1.01 1.00 1.00 1.00 | 1.003 | 1.003 | 5 | 0.00 | 0 | yyyyy | y y y y y | - |
| same configuration (noise) | fr-base | fr-none | 26x26-nightmare | 1.00 1.03 1.01 1.02 1.02 | 1.017 | 1.022 | 5 | 0.00 | 0 | yyyyy | y y y y y | - |
| same configuration (noise) | fr-base | fr-none | 26x26-hell-1 | 0.99 1.01 1.01 1.00 1.00 | 1.004 | 1.008 | 5 | 0.00 | 0 | yyyyy | y y y y y | - |
| same configuration (noise) | fr-base | fr-screen | 14x14-nightmare | 1.00 1.00 1.00 1.00 1.11 | 1.022 | 1.029 | 5 | 0.00 | 0 | yyyyy | y y y y y | - |
