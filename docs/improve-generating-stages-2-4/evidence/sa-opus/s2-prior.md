# V4-S2: the count prior (SA-Opus scratch, round 1)

Computed by `s2-prior.mjs` from the start and end lines of V4-S2's raw journals. `wc` is the window count of a call
(`end.locate.wc`), K its piece count; the refit share is the median of wc / K over the ended calls (set and batch) of the
arms that start every call from the table prior (fr-base, fr-screen, fr-none, fr-c4, fr-close); fr-ps's batch calls start
from the calibration's wc and fr-p5's are cut by its budget, so neither enters the refit.

| Cell | prior-v1 key | prior-v1 share (n) | K med | table start (priorCount seen) | wc/K med, set | wc/K med, batch | refit share (n calls) | accepted clue share med | locate probes med, batch: base / ps |
|---|---|---:|---:|---|---:|---:|---:|---:|---|
| 12x12-nightmare | nightmare@144 | 0.210526 (97) | 19 | 4, 5 | 0.250 | 0.211 | 0.238 (280) | 0.211 | 1.0 / - |
| 14x14-hell-1 | hell-1@196 | 0.265179 (2) | 32 | 8, 9 | 0.400 | 0.406 | 0.403 (68) | 0.382 | 5.0 / - |
| 14x14-nightmare | nightmare@196 | 0.190476 (57) | 22 | 4, 5 | 0.318 | 0.261 | 0.261 (380) | 0.289 | 3.0 / - |
| 20x20-hell-1 | hell-1@400 | none | 38 | , 17, 15, 11, 12, 14 | 0.367 | 0.368 | 0.368 (75) | 0.350 | 6.0 / 2.0 |
| 24x24-hell-1 | hell-1@576 | 0.141026 (4) | 40 | 6 | 0.222 | 0.220 | 0.220 (70) | 0.217 | 3.0 / - |
| 26x26-hell-1 | hell-1@676 | 0.128205 (50) | 40 | 5, 7, 8, 6 | 0.181 | 0.200 | 0.200 (264) | 0.200 | 3.0 / 2.0 |
| 26x26-nightmare | nightmare@676 | 0.133333 (100) | 31 | 4 | 0.131 | 0.133 | 0.133 (286) | 0.161 | 1.0 / - |
| 10x10-nightmare | nightmare@100 | 0.2 (100) | 17 | 3, 4 | 0.206 | 0.206 | 0.211 (181) | 0.206 | - / - |
| 15x15b10-nightmare | nightmare@215 | 0.181818 (74) | 23 | 4 | 0.227 | 0.250 | 0.261 (164) | 0.264 | - / - |
| 15x20-nightmare | nightmare@300 | 0.192308 (93) | 26 | 5 | 0.200 | 0.215 | 0.200 (161) | 0.215 | - / - |
| 16x16-nightmare | nightmare@256 | 0.173913 (92) | 23 | 4 | 0.200 | 0.234 | 0.217 (161) | 0.234 | - / - |
