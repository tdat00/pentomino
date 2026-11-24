# S06: the ten Nightmare controls of V4-S4, per seed (information, never a verdict)

Recipe of `tools/ig-proto/plans/verdicts/V4-S4.verdict-manifest.json`: quantity 10, cap 120000 ms, 10000 resamples, seed 20261116, reps 20-39. Ratio = today's capped T10 over the shipped arm's.

| Cell | Class | Shipped | Geometric mean | Lower bound | Reproduced | Log sd | Mean needed for 0.9 | Chance to pass at parity | p95 today (s) | p95 shipped (s) | Screen arm against today (gm / lower) |
|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|---|
| 3x29-nightmare | n-small | fr-frozen-none | 1.0592 | 0.9473 | true | 0.4026 | 1.0101 | 0.4557 | 8.7766 | 6.4003 | 1.0473 / 0.9375 |
| 10x10-nightmare | n-small | fr-frozen-none | 1.5221 | 1.3173 | true | 0.5031 | 1.0396 | 0.365 | 55.8743 | 29.6598 | 1.5351 / 1.3275 |
| 18x18-nightmare | n-upper | fr-frozen-none | 2.0012 | 1.6984 | true | 0.5923 | 1.0665 | 0.3135 | 120 | 29.8376 | 3.7324 / 3.0955 |
| 18x20-nightmare | n-large | fr-frozen-none | 1.6591 | 1.4374 | true | 0.512 | 1.0422 | 0.3589 | 85.0072 | 34.3729 | 2.8819 / 2.3567 |
| 20x20-nightmare | n-large | fr-frozen-none | 2.0889 | 1.733 | true | 0.6673 | 1.0897 | 0.2825 | 73.6914 | 24.2194 | 3.7928 / 3.0564 |
| 20x21-nightmare | n-large | fr-frozen-none | 1.584 | 1.3793 | true | 0.5083 | 1.0411 | 0.3614 | 96.2293 | 25.3456 | 2.747 / 2.2957 |
| 32x15-nightmare | n-large | fr-frozen-none | 1.054 | 0.9127 | true | 0.5107 | 1.0419 | 0.3598 | 40.0604 | 25.5974 | 1.6934 / 1.4646 |
| 22x22-nightmare | n-large | fr-frozen-none | 1.1554 | 1.0388 | true | 0.3759 | 1.0024 | 0.4887 | 31.6019 | 19.1825 | 1.5904 / 1.4316 |
| 24x24-nightmare | n-large | fr-frozen-none | 1.2434 | 1.1271 | true | 0.3681 | 1.0001 | 0.4995 | 43.5681 | 23.8769 | 1.7759 / 1.5664 |
| 26x26-nightmare | n-large | fr-frozen-none | 1.0006 | 0.8864 | true | 0.4386 | 1.0205 | 0.4179 | 26.3984 | 26.1594 | 1.4666 / 1.293 |

## 26x26 Nightmare per seed (capped T10, s)

| Rep | Today (log-link) | Shipped (fr-frozen-none) | Ratio | Screen (fr-frozen) | Today over screen |
|---:|---:|---:|---:|---:|---:|
| 20 | 15.8239 | 16.8877 | 0.937 | 9.1688 | 1.7259 |
| 21 | 13.9727 | 38.9191 | 0.359 | 18.278 | 0.7645 |
| 22 | 15.248 | 19.0021 | 0.8024 | 7.9394 | 1.9206 |
| 23 | 21.6619 | 23.7751 | 0.9111 | 11.3579 | 1.9072 |
| 24 | 8.7018 | 11.3191 | 0.7688 | 11.0732 | 0.7858 |
| 25 | 10.2429 | 7.0138 | 1.4604 | 9.5392 | 1.0738 |
| 26 | 9.9192 | 13.5926 | 0.7297 | 9.4346 | 1.0514 |
| 27 | 18.1249 | 15.9061 | 1.1395 | 10.5883 | 1.7118 |
| 28 | 9.1168 | 16.6357 | 0.548 | 9.4871 | 0.961 |
| 29 | 8.7121 | 7.1674 | 1.2155 | 5.1539 | 1.6904 |
| 30 | 19.4028 | 16.546 | 1.1727 | 10.8677 | 1.7854 |
| 31 | 16.6438 | 15.6058 | 1.0665 | 8.3611 | 1.9906 |
| 32 | 26.3984 | 9.5255 | 2.7713 | 8.1134 | 3.2537 |
| 33 | 14.8725 | 14.1611 | 1.0502 | 10.1325 | 1.4678 |
| 34 | 26.2785 | 15.3076 | 1.7167 | 14.5484 | 1.8063 |
| 35 | 16.0605 | 13.4136 | 1.1973 | 9.2832 | 1.7301 |
| 36 | 23.2572 | 18.4291 | 1.262 | 14.4018 | 1.6149 |
| 37 | 11.2375 | 18.9901 | 0.5918 | 10.8405 | 1.0366 |
| 38 | 34.6313 | 26.1594 | 1.3239 | 10.2393 | 3.3822 |
| 39 | 10.9091 | 12.1902 | 0.8949 | 18.4326 | 0.5918 |

Below 1: 9 of 20; below 0.8: 5; above 1.2: 6. Without the two slowest seeds (descriptive only) the geometric mean is 1.0953.
