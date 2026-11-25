# SA-Astra: V4-S2 computations (round 1)

**Verified:** unlocked arithmetic only. Inputs are immutable V4-S2 records at `35b401e`; analysis base `5807bd1`.
Command from `Q:\git\pentomino`: `node docs\improve-generating-stages-2-4\evidence\sa-astra\analyze-records.mjs`.
All request seeds are `landscape/<caseId>/<rep>`, reps 0 through 4, uniqueness `any`, four workers.
Times are median [minimum, maximum] seconds, never a five-request p95. Work is consumed selection work, G = 10^9 units.
The ledger uses every raw worker journal and its linkage; independent prefix sums are asserted equal to `rowLedger`.
The bootstrap is the plan recipe (10,000 resamples, seed 20261116), descriptive only on five pilot seeds.

## 1. Completeness, time and consumed work

| Arm | Cell | Rows / valid / ten | Accepted | T1 s | T10 s | Response s | Work G/accepted [lo, hi] | Terminated / open | >120 s |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| fr-base | 12x12-nightmare | 5/5/5 | 50 | 1.42 [0.60, 6.74] | 12.80 [5.09, 28.45] | 12.97 [5.27, 28.62] | [1.664, 2.345] | 27/26 | 0 |
| fr-base | 14x14-hell-1 | 5/5/4 | 42 | 18.99 [6.84, 35.56] | 93.57 [84.35, 142.81] | 101.07 [84.53, 150.63] | [15.134, 16.028] | 27/27 | 2 |
| fr-base | 14x14-nightmare | 5/5/5 | 50 | 1.62 [1.33, 4.03] | 8.88 [5.27, 11.52] | 9.04 [5.43, 11.66] | [0.917, 1.712] | 26/26 | 0 |
| fr-base | 20x20-hell-1 | 5/5/5 | 50 | 5.89 [4.45, 10.91] | 38.38 [31.17, 48.59] | 38.55 [31.36, 48.75] | [5.223, 10.370] | 27/27 | 0 |
| fr-base | 24x24-hell-1 | 5/5/5 | 50 | 8.15 [6.65, 16.11] | 37.10 [27.40, 42.95] | 37.28 [27.52, 43.13] | [4.272, 29.202] | 23/23 | 0 |
| fr-base | 26x26-hell-1 | 5/5/5 | 50 | 6.12 [4.73, 21.11] | 31.86 [27.52, 44.34] | 32.03 [27.64, 44.53] | [4.209, 64.654] | 28/28 | 0 |
| fr-base | 26x26-nightmare | 5/5/5 | 50 | 2.11 [0.88, 5.81] | 17.53 [14.92, 19.31] | 17.68 [15.02, 19.49] | [1.578, 68.953] | 24/24 | 0 |
| fr-screen | 10x10-nightmare | 5/5/5 | 50 | 4.13 [2.95, 20.26] | 16.28 [9.67, 72.81] | 16.42 [9.84, 72.98] | [2.200, 2.374] | 21/21 | 0 |
| fr-screen | 12x12-nightmare | 5/5/5 | 50 | 1.43 [0.64, 3.23] | 6.76 [4.58, 16.12] | 6.93 [4.71, 16.29] | [0.890, 1.241] | 25/25 | 0 |
| fr-screen | 14x14-nightmare | 5/5/5 | 50 | 1.61 [1.31, 4.04] | 8.87 [5.30, 11.55] | 9.05 [5.44, 11.74] | [0.950, 1.754] | 26/26 | 0 |
| fr-screen | 15x15b10-nightmare | 5/5/5 | 50 | 1.84 [1.29, 3.59] | 8.14 [5.66, 14.54] | 8.29 [5.84, 14.72] | [0.987, 2.096] | 26/26 | 0 |
| fr-screen | 15x20-nightmare | 5/5/5 | 50 | 1.74 [0.74, 6.02] | 10.42 [5.09, 11.60] | 10.59 [5.25, 11.75] | [0.860, 3.940] | 24/24 | 0 |
| fr-screen | 16x16-nightmare | 5/5/5 | 50 | 1.47 [0.37, 1.96] | 7.88 [7.48, 13.25] | 8.03 [7.63, 13.42] | [1.000, 3.001] | 26/26 | 0 |
| fr-screen | 26x26-hell-1 | 5/5/5 | 50 | 6.99 [3.98, 15.13] | 35.81 [22.27, 41.23] | 35.95 [22.41, 41.39] | [3.856, 52.552] | 24/24 | 0 |
| fr-screen | 26x26-nightmare | 5/5/5 | 50 | 2.08 [0.86, 7.45] | 11.71 [9.92, 14.54] | 11.86 [10.08, 14.73] | [1.111, 61.646] | 22/22 | 0 |
| fr-none | 10x10-nightmare | 5/5/5 | 50 | 4.26 [1.08, 5.61] | 10.64 [9.77, 51.43] | 10.80 [9.92, 51.60] | [1.642, 2.022] | 19/19 | 0 |
| fr-none | 12x12-nightmare | 5/5/5 | 50 | 1.43 [0.59, 6.73] | 12.91 [5.11, 28.41] | 13.07 [5.29, 28.56] | [1.658, 2.396] | 28/28 | 0 |
| fr-none | 14x14-nightmare | 5/5/5 | 50 | 4.67 [3.79, 14.79] | 24.08 [16.55, 30.77] | 24.23 [16.71, 30.93] | [2.582, 3.730] | 26/26 | 0 |
| fr-none | 15x15b10-nightmare | 5/5/5 | 50 | 4.81 [2.67, 7.59] | 24.32 [15.70, 31.27] | 24.48 [15.85, 31.40] | [2.688, 4.143] | 26/26 | 0 |
| fr-none | 15x20-nightmare | 5/5/5 | 50 | 4.15 [0.73, 11.49] | 19.71 [8.71, 22.02] | 19.88 [8.83, 22.18] | [1.410, 4.781] | 24/23 | 0 |
| fr-none | 16x16-nightmare | 5/5/5 | 50 | 2.59 [0.33, 6.94] | 17.84 [16.63, 28.43] | 18.00 [16.78, 28.58] | [2.267, 4.830] | 27/27 | 0 |
| fr-none | 26x26-hell-1 | 5/5/5 | 50 | 6.01 [4.70, 20.91] | 32.30 [27.37, 44.28] | 32.49 [27.55, 44.48] | [4.239, 64.194] | 28/28 | 0 |
| fr-none | 26x26-nightmare | 5/5/5 | 50 | 2.11 [0.91, 5.89] | 17.94 [14.97, 19.47] | 18.11 [15.14, 19.62] | [1.584, 68.880] | 24/24 | 0 |
| fr-close | 12x12-nightmare | 5/5/5 | 50 | 1.42 [0.65, 6.85] | 12.87 [5.18, 28.26] | 13.02 [5.34, 28.41] | [1.659, 2.394] | 28/28 | 0 |
| fr-close | 14x14-nightmare | 5/5/5 | 50 | 1.63 [1.34, 8.31] | 8.96 [6.82, 15.83] | 9.14 [6.99, 15.96] | [1.009, 1.805] | 25/25 | 0 |
| fr-close | 26x26-hell-1 | 5/5/5 | 50 | 5.91 [4.77, 20.66] | 32.08 [27.05, 43.87] | 32.25 [27.20, 44.06] | [4.209, 64.732] | 28/28 | 0 |
| fr-c4 | 14x14-nightmare | 5/5/5 | 50 | 2.20 [1.78, 4.00] | 10.75 [7.58, 11.67] | 10.91 [7.75, 11.85] | [1.092, 1.839] | 25/25 | 0 |
| fr-c4 | 26x26-nightmare | 5/5/5 | 50 | 3.37 [1.75, 5.35] | 20.30 [15.52, 24.31] | 20.48 [15.70, 24.50] | [2.014, 72.224] | 24/24 | 0 |
| fr-ps | 20x20-hell-1 | 5/5/5 | 50 | 5.89 [4.51, 10.91] | 32.51 [24.48, 45.79] | 32.65 [24.65, 45.97] | [4.751, 9.571] | 28/28 | 0 |
| fr-ps | 26x26-hell-1 | 5/5/5 | 50 | 5.90 [4.64, 20.64] | 28.03 [22.47, 41.81] | 28.20 [22.65, 42.00] | [3.708, 55.172] | 27/26 | 0 |
| fr-p5 | 14x14-nightmare | 5/5/5 | 50 | 1.66 [1.35, 4.00] | 8.68 [5.29, 11.47] | 8.84 [5.45, 11.64] | [0.925, 1.706] | 26/26 | 0 |
| fr-p5 | 20x20-hell-1 | 5/5/5 | 50 | 5.41 [4.45, 7.94] | 42.02 [20.78, 48.94] | 42.19 [20.95, 49.12] | [5.063, 10.722] | 25/24 | 0 |
| fr-p5 | 26x26-hell-1 | 5/5/5 | 50 | 5.99 [4.77, 6.23] | 35.13 [26.52, 59.88] | 35.32 [26.72, 60.07] | [5.022, 70.632] | 29/29 | 0 |

## 2. Two-sided population beside the timings

| Arm | Cell | Clues median [min,max] | Clue share median [min,max] | Score position median [min,max] | Census-estimate share |
| --- | --- | --- | --- | --- | --- |
| fr-base | 12x12-nightmare | 4.000 [3.000, 7.000] | 0.211 [0.158, 0.333] | 0.521 [0.250, 0.750] | 0.420 |
| fr-base | 14x14-hell-1 | 13.000 [8.000, 16.000] | 0.382 [0.250, 0.471] | 0.429 [0.057, 0.743] | 0.738 |
| fr-base | 14x14-nightmare | 7.000 [4.000, 10.000] | 0.292 [0.190, 0.417] | 0.479 [0.250, 0.750] | 0.100 |
| fr-base | 20x20-hell-1 | 14.000 [10.000, 22.000] | 0.350 [0.256, 0.524] | 0.414 [0.000, 0.743] | 0.380 |
| fr-base | 24x24-hell-1 | 9.000 [7.000, 13.000] | 0.217 [0.171, 0.310] | 0.514 [0.257, 0.743] | 0.880 |
| fr-base | 26x26-hell-1 | 8.000 [5.000, 12.000] | 0.200 [0.119, 0.293] | 0.443 [0.029, 0.743] | 1.000 |
| fr-base | 26x26-nightmare | 5.000 [3.000, 7.000] | 0.161 [0.097, 0.226] | 0.521 [0.250, 0.750] | 0.880 |
| fr-screen | 10x10-nightmare | 4.000 [2.000, 6.000] | 0.235 [0.118, 0.353] | 0.458 [0.125, 0.750] | 0.500 |
| fr-screen | 12x12-nightmare | 5.000 [3.000, 10.000] | 0.263 [0.158, 0.476] | 0.417 [0.250, 0.750] | 0.160 |
| fr-screen | 14x14-nightmare | 7.000 [4.000, 10.000] | 0.292 [0.190, 0.417] | 0.479 [0.250, 0.750] | 0.100 |
| fr-screen | 15x15b10-nightmare | 6.000 [4.000, 9.000] | 0.267 [0.182, 0.391] | 0.458 [0.250, 0.750] | 0.040 |
| fr-screen | 15x20-nightmare | 6.000 [4.000, 8.000] | 0.231 [0.154, 0.320] | 0.458 [0.250, 0.708] | 0.180 |
| fr-screen | 16x16-nightmare | 6.000 [4.000, 9.000] | 0.250 [0.174, 0.391] | 0.500 [0.250, 0.750] | 0.300 |
| fr-screen | 26x26-hell-1 | 8.000 [6.000, 12.000] | 0.200 [0.143, 0.293] | 0.429 [0.029, 0.743] | 0.980 |
| fr-screen | 26x26-nightmare | 5.000 [3.000, 8.000] | 0.161 [0.097, 0.258] | 0.500 [0.250, 0.750] | 0.860 |
| fr-none | 10x10-nightmare | 3.000 [2.000, 5.000] | 0.176 [0.118, 0.263] | 0.500 [0.250, 0.750] | 0.860 |
| fr-none | 12x12-nightmare | 4.000 [3.000, 7.000] | 0.211 [0.158, 0.333] | 0.521 [0.250, 0.750] | 0.420 |
| fr-none | 14x14-nightmare | 6.000 [4.000, 10.000] | 0.273 [0.190, 0.417] | 0.500 [0.250, 0.750] | 0.080 |
| fr-none | 15x15b10-nightmare | 6.000 [4.000, 9.000] | 0.261 [0.182, 0.391] | 0.438 [0.250, 0.708] | 0.140 |
| fr-none | 15x20-nightmare | 5.000 [4.000, 8.000] | 0.200 [0.154, 0.320] | 0.500 [0.250, 0.750] | 0.300 |
| fr-none | 16x16-nightmare | 5.000 [4.000, 8.000] | 0.217 [0.167, 0.320] | 0.500 [0.250, 0.750] | 0.400 |
| fr-none | 26x26-hell-1 | 8.000 [5.000, 12.000] | 0.200 [0.119, 0.293] | 0.443 [0.029, 0.743] | 1.000 |
| fr-none | 26x26-nightmare | 5.000 [3.000, 7.000] | 0.161 [0.097, 0.226] | 0.521 [0.250, 0.750] | 0.880 |
| fr-close | 12x12-nightmare | 4.000 [3.000, 7.000] | 0.211 [0.158, 0.333] | 0.521 [0.250, 0.750] | 0.420 |
| fr-close | 14x14-nightmare | 6.500 [4.000, 10.000] | 0.289 [0.190, 0.417] | 0.500 [0.250, 0.750] | 0.060 |
| fr-close | 26x26-hell-1 | 8.000 [5.000, 12.000] | 0.200 [0.119, 0.293] | 0.443 [0.029, 0.743] | 1.000 |
| fr-c4 | 14x14-nightmare | 6.000 [4.000, 10.000] | 0.279 [0.190, 0.417] | 0.500 [0.250, 0.750] | 0.100 |
| fr-c4 | 26x26-nightmare | 5.000 [3.000, 7.000] | 0.159 [0.097, 0.226] | 0.542 [0.250, 0.750] | 0.880 |
| fr-ps | 20x20-hell-1 | 13.000 [10.000, 22.000] | 0.342 [0.256, 0.524] | 0.400 [0.000, 0.743] | 0.380 |
| fr-ps | 26x26-hell-1 | 8.000 [5.000, 12.000] | 0.200 [0.125, 0.293] | 0.443 [0.257, 0.743] | 1.000 |
| fr-p5 | 14x14-nightmare | 7.000 [4.000, 10.000] | 0.292 [0.190, 0.417] | 0.479 [0.250, 0.750] | 0.100 |
| fr-p5 | 20x20-hell-1 | 12.000 [10.000, 15.000] | 0.316 [0.256, 0.395] | 0.386 [0.000, 0.829] | 0.620 |
| fr-p5 | 26x26-hell-1 | 8.000 [5.000, 10.000] | 0.193 [0.119, 0.256] | 0.443 [0.000, 0.971] | 1.000 |

## 3. Paired pilot diagnostics (reference/changed time)

| Kind | Cell | Time ratio | 90% lower | Same-set n | Clue delta median | Moves >=2 | Same puzzle lists | Work condition |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| screen | 10x10-nightmare | 0.687 | 0.582 | 5 | 1.000 | 0 | 0 | worse |
| screen | 12x12-nightmare | 1.702 | 1.351 | 5 | 1.000 | 0 | 0 | pass |
| screen | 14x14-nightmare | 2.601 | 2.402 | 5 | 0.000 | 0 | 0 | pass |
| screen | 15x15b10-nightmare | 2.474 | 2.248 | 5 | 0.000 | 0 | 0 | pass |
| screen | 15x20-nightmare | 1.651 | 1.363 | 5 | 0.000 | 0 | 0 | unknown |
| screen | 16x16-nightmare | 2.239 | 2.200 | 5 | 0.500 | 0 | 0 | unknown |
| screen | 26x26-hell-1 | 1.074 | 0.919 | 5 | 0.500 | 0 | 0 | unknown |
| screen | 26x26-nightmare | 1.458 | 1.348 | 5 | 0.000 | 0 | 0 | unknown |
| close | 12x12-nightmare | 0.997 | 0.992 | 5 | 0.000 | 0 | 5 | unknown |
| close | 14x14-nightmare | 0.874 | 0.804 | 5 | 0.000 | 0 | 2 | unknown |
| close | 26x26-hell-1 | 1.002 | 0.996 | 5 | 0.000 | 0 | 5 | unknown |
| c4 | 14x14-nightmare | 0.837 | 0.770 | 5 | 0.000 | 0 | 1 | unknown |
| c4 | 26x26-nightmare | 0.831 | 0.778 | 5 | 0.000 | 0 | 0 | unknown |
| per-set | 20x20-hell-1 | 1.107 | 1.000 | 5 | 0.000 | 0 | 1 | unknown |
| per-set | 26x26-hell-1 | 1.081 | 0.922 | 5 | 0.000 | 0 | 1 | unknown |
| P5 | 14x14-nightmare | 1.005 | 0.998 | 5 | 0.000 | 0 | 5 | unknown |
| P5 | 20x20-hell-1 | 1.093 | 0.868 | 3 | 0.000 | 0 | 0 | unknown |
| P5 | 26x26-hell-1 | 0.894 | 0.738 | 5 | 0.000 | 0 | 0 | unknown |

## 4. N-V4-14: real class intervals

No class is admitted by these pilots: each has only five independent seeds per cell.

| Class / measured cells | Screen G/accepted | No-screen G/accepted | Widths G/accepted | Open primitives screen/none | Work condition | Time ratio / lower | Clue median / moves / n |
| --- | --- | --- | --- | --- | --- | --- | --- |
| n-small: 10x10-nightmare, 12x12-nightmare | [1.545, 1.807] | [1.650, 2.209] | 0.262 / 0.559 | 46/47 | unknown | 1.081 / 0.921 | 1.000 / 0 / 10 |
| n-mid: 14x14-nightmare, 15x15b10-nightmare, 15x20-nightmare, 16x16-nightmare | [0.949, 2.698] | [2.237, 4.371] | 1.749 / 2.134 | 102/102 | unknown | 2.208 / 2.050 | 0.000 / 0 / 20 |
| n-large: 26x26-nightmare | [1.111, 61.646] | [1.584, 68.880] | 60.535 / 67.296 | 22/24 | unknown | 1.458 / 1.348 | 0.000 / 0 / 5 |
| hell-1: 26x26-hell-1 | [3.856, 52.552] | [4.239, 64.194] | 48.696 / 59.955 | 24/28 | unknown | 1.074 / 0.919 | 0.500 / 0 / 5 |

## 5. N-V4-17: mechanism reach and W

The side maps count ended calls carrying `locate.close` or `locate.c4`; profile counts include all completed profiles, even in later-terminated calls.

| Arm | Cell | Calls / ended | W: calls | W mismatch | close sides | c4 sides | close / below profiles |
| --- | --- | --- | --- | --- | --- | --- | --- |
| fr-base | 12x12-nightmare | 96/69 | {"760000000":96} | 0 | {} | {} | 0/0 |
| fr-base | 14x14-hell-1 | 95/68 | {"760000000":95} | 0 | {} | {} | 0/0 |
| fr-base | 14x14-nightmare | 102/76 | {"190000000":102} | 0 | {} | {} | 0/0 |
| fr-base | 20x20-hell-1 | 102/75 | {"760000000":102} | 0 | {} | {} | 0/0 |
| fr-base | 24x24-hell-1 | 93/70 | {"760000000":93} | 0 | {} | {} | 0/0 |
| fr-base | 26x26-hell-1 | 92/64 | {"760000000":92} | 0 | {} | {} | 0/0 |
| fr-base | 26x26-nightmare | 98/74 | {"760000000":98} | 0 | {} | {} | 0/0 |
| fr-screen | 10x10-nightmare | 114/93 | {"190000000":114} | 0 | {} | {} | 0/0 |
| fr-screen | 12x12-nightmare | 96/71 | {"190000000":96} | 0 | {} | {} | 0/0 |
| fr-screen | 14x14-nightmare | 105/79 | {"190000000":105} | 0 | {} | {} | 0/0 |
| fr-screen | 15x15b10-nightmare | 109/83 | {"190000000":109} | 0 | {} | {} | 0/0 |
| fr-screen | 15x20-nightmare | 100/76 | {"190000000":100} | 0 | {} | {} | 0/0 |
| fr-screen | 16x16-nightmare | 108/82 | {"190000000":108} | 0 | {} | {} | 0/0 |
| fr-screen | 26x26-hell-1 | 96/72 | {"380000000":96} | 0 | {} | {} | 0/0 |
| fr-screen | 26x26-nightmare | 86/64 | {"190000000":86} | 0 | {} | {} | 0/0 |
| fr-none | 10x10-nightmare | 107/88 | {"760000000":107} | 0 | {} | {} | 0/0 |
| fr-none | 12x12-nightmare | 98/70 | {"760000000":98} | 0 | {} | {} | 0/0 |
| fr-none | 14x14-nightmare | 104/78 | {"760000000":104} | 0 | {} | {} | 0/0 |
| fr-none | 15x15b10-nightmare | 107/81 | {"760000000":107} | 0 | {} | {} | 0/0 |
| fr-none | 15x20-nightmare | 109/85 | {"760000000":109} | 0 | {} | {} | 0/0 |
| fr-none | 16x16-nightmare | 106/79 | {"760000000":106} | 0 | {} | {} | 0/0 |
| fr-none | 26x26-hell-1 | 92/64 | {"760000000":92} | 0 | {} | {} | 0/0 |
| fr-none | 26x26-nightmare | 98/74 | {"760000000":98} | 0 | {} | {} | 0/0 |
| fr-close | 12x12-nightmare | 98/70 | {"760000000":98} | 0 | {} | {} | 0/0 |
| fr-close | 14x14-nightmare | 99/74 | {"190000000":99} | 0 | {"above":4,"in":4} | {} | 8/0 |
| fr-close | 26x26-hell-1 | 92/64 | {"760000000":92} | 0 | {} | {} | 0/0 |
| fr-c4 | 14x14-nightmare | 98/73 | {"190000000":98} | 0 | {} | {"above":44,"below":2,"in":15} | 0/64 |
| fr-c4 | 26x26-nightmare | 98/74 | {"760000000":98} | 0 | {} | {"above":41,"below":1,"in":29} | 0/75 |
| fr-ps | 20x20-hell-1 | 113/85 | {"760000000":113} | 0 | {} | {} | 0/0 |
| fr-ps | 26x26-hell-1 | 110/83 | {"760000000":110} | 0 | {} | {} | 0/0 |
| fr-p5 | 14x14-nightmare | 102/76 | {"190000000":102} | 0 | {} | {} | 0/0 |
| fr-p5 | 20x20-hell-1 | 145/120 | {"760000000":145} | 0 | {} | {} | 0/0 |
| fr-p5 | 26x26-hell-1 | 142/113 | {"760000000":142} | 0 | {} | {} | 0/0 |

## 6. N-V4-16 and N-V4-21: P5 and per-set prior

| Cell | P5 known / lost / false stops | Same-side first-four eligible / glue defects | Budget stops: set / batch | Budget-stopped set failures without side |
| --- | --- | --- | --- | --- |
| 14x14-nightmare | 5/0/0 | 0/0 | 0/0 | 0 |
| 20x20-hell-1 | 5/0/0 | 0/0 | 7/52 | 4 |
| 26x26-hell-1 | 5/0/0 | 0/0 | 1/58 | 0 |

| Per-set row | Calibration wc | Batch calls | Observed batch priors | Mismatches |
| --- | --- | --- | --- | --- |
| 20x20-hell-1~0 | 17 | 26 | {"17":26} | 0 |
| 20x20-hell-1~1 | 15 | 18 | {"15":18} | 0 |
| 20x20-hell-1~2 | 11 | 14 | {"11":14} | 0 |
| 20x20-hell-1~3 | 12 | 16 | {"12":16} | 0 |
| 20x20-hell-1~4 | 14 | 19 | {"14":19} | 0 |
| 26x26-hell-1~0 | 7 | 21 | {"7":21} | 0 |
| 26x26-hell-1~1 | 8 | 23 | {"8":23} | 0 |
| 26x26-hell-1~2 | 6 | 13 | {"6":13} | 0 |
| 26x26-hell-1~3 | 8 | 16 | {"8":16} | 0 |
| 26x26-hell-1~4 | 8 | 17 | {"8":17} | 0 |

## 7. Linkage and locate

| Arm | Cell | Dispatch / complete / accepted | Discard done / inflight | Await s | Idle worker s in awaits | Locate profiles | Locate / all profile ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| fr-base | 12x12-nightmare | 82/82/45 | 13/20 | 63.92 | 0.03 | 130 | 190586.7 / 260035.0 |
| fr-base | 14x14-hell-1 | 79/79/37 | 19/20 | 458.53 | 0.03 | 428 | 845154.9 / 2082170.9 |
| fr-base | 14x14-nightmare | 87/87/45 | 20/20 | 32.70 | 0.03 | 243 | 110489.4 / 152203.2 |
| fr-base | 20x20-hell-1 | 87/87/45 | 20/20 | 160.43 | 0.03 | 569 | 509637.0 / 740664.7 |
| fr-base | 24x24-hell-1 | 78/78/45 | 12/20 | 130.05 | 0.03 | 278 | 463835.4 / 634030.4 |
| fr-base | 26x26-hell-1 | 76/76/45 | 9/20 | 126.48 | 0.03 | 262 | 424767.6 / 601415.7 |
| fr-base | 26x26-nightmare | 82/82/45 | 17/20 | 69.51 | 0.03 | 156 | 151859.4 / 289871.9 |
| fr-screen | 10x10-nightmare | 107/107/45 | 33/20 | 100.10 | 0.04 | 247 | 135463.2 / 411561.2 |
| fr-screen | 12x12-nightmare | 83/83/45 | 14/20 | 35.93 | 0.03 | 211 | 106848.6 / 153452.7 |
| fr-screen | 14x14-nightmare | 90/90/45 | 23/20 | 33.77 | 0.03 | 253 | 113710.3 / 156261.3 |
| fr-screen | 15x15b10-nightmare | 94/94/45 | 24/20 | 36.84 | 0.04 | 268 | 117891.4 / 163224.0 |
| fr-screen | 15x20-nightmare | 85/85/45 | 17/20 | 33.96 | 0.03 | 191 | 83613.8 / 150490.0 |
| fr-screen | 16x16-nightmare | 94/94/45 | 22/20 | 38.46 | 0.04 | 275 | 121678.2 / 160812.5 |
| fr-screen | 26x26-hell-1 | 81/81/45 | 14/20 | 119.06 | 0.03 | 344 | 321052.4 / 579787.3 |
| fr-screen | 26x26-nightmare | 70/70/45 | 5/20 | 41.29 | 0.03 | 161 | 95207.7 / 190615.3 |
| fr-none | 10x10-nightmare | 100/100/45 | 26/20 | 75.76 | 0.04 | 119 | 161657.7 / 288464.1 |
| fr-none | 12x12-nightmare | 83/83/45 | 14/20 | 64.09 | 0.03 | 129 | 190754.9 / 260539.7 |
| fr-none | 14x14-nightmare | 89/89/45 | 22/20 | 81.45 | 0.03 | 214 | 305699.8 / 391680.2 |
| fr-none | 15x15b10-nightmare | 91/91/45 | 21/20 | 91.55 | 0.04 | 236 | 300416.9 / 411881.1 |
| fr-none | 15x20-nightmare | 93/93/45 | 25/20 | 56.09 | 0.04 | 167 | 157657.4 / 246027.0 |
| fr-none | 16x16-nightmare | 91/91/45 | 19/20 | 83.19 | 0.04 | 213 | 271469.4 / 346947.0 |
| fr-none | 26x26-hell-1 | 76/76/45 | 9/20 | 127.63 | 0.03 | 264 | 431358.4 / 609090.5 |
| fr-none | 26x26-nightmare | 82/82/45 | 17/20 | 71.00 | 0.03 | 156 | 153166.4 / 294516.0 |
| fr-close | 12x12-nightmare | 83/83/45 | 14/20 | 63.69 | 0.03 | 130 | 190635.3 / 259862.1 |
| fr-close | 14x14-nightmare | 84/84/45 | 17/20 | 35.18 | 0.03 | 246 | 111651.4 / 166858.1 |
| fr-close | 26x26-hell-1 | 76/76/45 | 9/20 | 126.87 | 0.03 | 262 | 426138.7 / 602641.3 |
| fr-c4 | 14x14-nightmare | 84/84/45 | 17/20 | 38.21 | 0.03 | 255 | 115729.9 / 181011.9 |
| fr-c4 | 26x26-nightmare | 83/83/45 | 18/20 | 85.87 | 0.03 | 163 | 156628.7 / 374115.2 |
| fr-ps | 20x20-hell-1 | 97/97/45 | 30/20 | 144.46 | 0.04 | 356 | 352835.5 / 678599.7 |
| fr-ps | 26x26-hell-1 | 95/95/45 | 28/20 | 116.63 | 0.04 | 202 | 293182.4 / 557975.4 |
| fr-p5 | 14x14-nightmare | 87/87/45 | 20/20 | 32.41 | 0.03 | 245 | 111023.6 / 152185.6 |
| fr-p5 | 20x20-hell-1 | 127/127/45 | 39/20 | 153.80 | 0.05 | 760 | 624118.6 / 697406.4 |
| fr-p5 | 26x26-hell-1 | 126/126/45 | 40/20 | 165.69 | 0.05 | 357 | 650094.1 / 726411.8 |

## 8. Kernel and width

| Cell | Equal/items | R4 calls | Piece visits | Static / live rows | Dirty / visits | Count-changed / visits | Kill / undo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 10x10-nightmare | 6/6 | 62512 | 358126 | 49038755/12906382 | 0.848037 | 0.715561 | 19381808/20998072 |
| 12x12-nightmare | 6/6 | 35435 | 241291 | 54618964/17899427 | 0.860074 | 0.740666 | 26565884/27852820 |
| 14x14-nightmare | 6/6 | 26579 | 236298 | 84369254/28080304 | 0.854239 | 0.750362 | 32479510/33532534 |
| 26x26-nightmare | 6/6 | 773 | 9440 | 11727022/6844640 | 0.941102 | 0.870551 | 6177208/6267959 |
| 26x26-hell-1 | 6/6 | 1428 | 33193 | 66033001/39013802 | 0.887506 | 0.844967 | 18466486/18572738 |

### 14x14-nightmare: reduced-inlining profile, diagnostic only

Total 10629.445 ms; deduction 10099.633 ms; fewestColumn 4.824 ms (0.0478% of deduction).

| Function | Self ms | % total | % deduction when in deduce.js |
| --- | --- | --- | --- |
| reachable | 1899.111 | 17.867 | 18.804 |
| ruleR4 | 1761.088 | 16.568 | 17.437 |
| select | 1408.824 | 13.254 | 13.949 |
| gather | 1171.921 | 11.025 | 11.604 |
| neighbourCell | 741.927 | 6.980 | 7.346 |
| ruleR8 | 675.978 | 6.359 | 6.693 |
| undo | 629.274 | 5.920 | 6.231 |
| kill | 567.948 | 5.343 | 5.623 |
| ruleR5 | 460.238 | 4.330 | 4.557 |
| ruleR9 | 227.276 | 2.138 | 2.250 |
| cover | 136.411 | 1.283 | - |
| uncover | 113.442 | 1.067 | - |
| ruleR3 | 107.470 | 1.011 | 1.064 |
| fillSums | 91.444 | 0.860 | 0.905 |
| labelPockets | 85.225 | 0.802 | 0.844 |
| findNecks | 53.001 | 0.499 | 0.525 |
| open | 49.044 | 0.461 | - |
| queueCell | 48.701 | 0.458 | 0.482 |

### 26x26-nightmare: reduced-inlining profile, diagnostic only

Total 3646.224 ms; deduction 2324.655 ms; fewestColumn 0.000 ms (0.0000% of deduction).

| Function | Self ms | % total | % deduction when in deduce.js |
| --- | --- | --- | --- |
| ruleR4 | 691.245 | 18.958 | 29.735 |
| uncover | 428.787 | 11.760 | - |
| cover | 415.712 | 11.401 | - |
| select | 382.767 | 10.498 | 16.466 |
| undo | 208.365 | 5.715 | 8.963 |
| neighbourCell | 201.546 | 5.528 | 8.670 |
| kill | 194.013 | 5.321 | 8.346 |
| ruleR8 | 193.620 | 5.310 | 8.329 |
| walk | 95.402 | 2.616 | - |
| ruleR5 | 89.377 | 2.451 | 3.845 |
| gather | 83.233 | 2.283 | 3.580 |
| ruleR9 | 66.924 | 1.835 | 2.879 |
| ExactCover | 64.027 | 1.756 | - |
| measureDeduction | 54.255 | 1.488 | 2.334 |
| reachable | 40.031 | 1.098 | 1.722 |
| open | 39.209 | 1.075 | - |
| (garbage collector) | 27.455 | 0.753 | - |
| colour | 25.842 | 0.709 | 1.112 |

| Cell | Width | Ratings | Median ms | p90 ms | Median / width-4 median |
| --- | --- | --- | --- | --- | --- |
| 26x26-nightmare | 1 | 18 | 548.1855 | 791.868 | 0.980564 |
| 26x26-nightmare | 2 | 36 | 552.6475 | 789.503 | 0.988546 |
| 26x26-nightmare | 4 | 72 | 559.0510 | 796.546 | 1.000000 |
| 26x26-nightmare | 8 | 144 | 606.6870 | 827.451 | 1.085209 |
| 14x14-nightmare | 1 | 18 | 1780.6980 | 2246.164 | 0.993395 |
| 14x14-nightmare | 2 | 36 | 1796.5770 | 2247.534 | 1.002254 |
| 14x14-nightmare | 4 | 72 | 1792.5370 | 2242.519 | 1.000000 |
| 14x14-nightmare | 8 | 144 | 1831.4410 | 2270.539 | 1.021703 |

## 9. Round account and activation preview

```json
{
  "account": {
    "s2Invocations": 44,
    "s2CountedS": 7338.801999999999,
    "s2Killed": 0,
    "s2ExitCodes": {
      "0": 44
    },
    "loggedS": 10252.712000000001,
    "offLogS": 87.4,
    "totalS": 10340.112000000001,
    "minutes": 172.33520000000001,
    "grantedMinutes": 749,
    "runnerMinutes": 747,
    "remainingMinutes": 576.6648,
    "liveGuardS": 2634.330247546194,
    "currentLiveAccountCeilingMinutes": 217,
    "note": "The current arithmetic is not an approval: V4-LIVE still needs the owner; the historical sequential quote was 793 on the account."
  },
  "activationSummary": {
    "conditional": [
      {
        "cell": "24x24-hell-1",
        "activated": true,
        "valid": 5,
        "reachingTen": 5,
        "pilotRuns": 5
      },
      {
        "cell": "14x14-hell-1",
        "activated": true,
        "valid": 5,
        "reachingTen": 4,
        "pilotRuns": 5
      }
    ],
    "groups": 80,
    "declaredRows": 1120,
    "comparatorCells": [
      "14x14-nightmare",
      "15x15b10-nightmare",
      "12x12-nightmare",
      "16x16-nightmare",
      "15x20-nightmare",
      "26x26-hell-1",
      "20x20-hell-1",
      "3x29-nightmare",
      "10x10-nightmare",
      "18x18-nightmare",
      "18x20-nightmare",
      "20x20-nightmare",
      "20x21-nightmare",
      "32x15-nightmare",
      "22x22-nightmare",
      "24x24-nightmare",
      "26x26-nightmare",
      "24x24-hell-1",
      "14x14-hell-1"
    ],
    "optional": {
      "approved": [],
      "notApproved": [
        "S4-6"
      ]
    },
    "note": "Pure preview, not authorization or an activation record."
  }
}
```

## 10. Verification and reproducibility

Rows 165; accepted 1642; complete ledgers 165; calls 3410; issues 0.
`rows-computed.json` is the row index with source line anchors; `calls-computed.json` gives the starts, ends and termination anchors.
`stage2-computed.json` retains full-precision values, budget prefix-risk tables, reserve projections and receipt checks.
`input-index.json` records every explicitly parsed evidence file and its LF-normalized SHA-256. Imported harness code is pinned by the analysis base commit. No historical report, receipt, state or journal was rewritten.
