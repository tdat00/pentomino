# IGP-02 PM4: the screen certificate and the `W_screen` economics

> **Frozen source `3fc65f4`.** Measured on frozen 3fc65f4 (source digest e181df2c…). Re-run: pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\IGP-02.json -Label frozen -SourceLabel <label> -LockHelper <path>.

## Certificate verdict (R14)

**Holds: 0 violations on 862 certified runs** (fixed limits 862, boundary limits 0; every certified screen deep-equals its canonical rating). The certificate "main work at the end <= `W_screen`, every other limit unchanged" gave the canonical rating on every screen run that satisfied it.

Argument: Every main-phase check compares `work` with the same limit (core/engine/deduce.js lines 840, 1102, 1128, 1623) and work never decreases; R7 gives up only when `work > workLimit` and the next check of `branch` then stops with `work-cap`; the census budget is relative. A run whose main work at the end is at most `W` therefore passed no check differently from the canonical run (valid only with `DEDUCE.work` lowered and every other limit unchanged).

### Coverage of the named cases

| Case | Runs | Fixed limits | Boundary limits | Equal to canonical |
|---|---:|---:|---:|---:|
| certified (a rating with main work <= W) | 862 | 862 | 0 | 862 of 862 |
| over (a normal stop after an overshoot) | 399 | 0 | 399 | 399 of 399 (no equality required) |
| scap1 (capped after the first solution) | 812 | 104 | 708 | 0 of 812 (no equality required) |
| scap0 (capped before the first solution) | 1062 | 1062 | 0 | not applicable |
| other (unsatisfiable or error) | 0 | 0 | 0 | same outcome as canonical |
| R7 early NONE in the main search (r7Cut > 0), any class | 484 | 432 | 52 | by class: scap1 76, scap0 408 |

R7 coverage reads `r7Cut` of the main search only. Census-phase cuts (`r7CutCensus`, relative budget) are reported apart: 227 screen runs (by class: certified 66, over 41, scap1 120) and 43 canonical profiles; canonical profiles with a main-search R7 cut: 128.

Named coverage gaps: none.

## Pooled over the cells (call profiles)

| W | profiles | certified | scap0 | scap1 | over | useful lost (of) | clue share lost / all useful, median [p10-p90] | capped, canonical below / in band | main work <= W: complete / useful |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 95 M | 340 | 69 (20 %) | 250 (74 %) | 21 (6 %) | 0 (0 %) | 19 of 47 (40 %) | 0.158 [0.103-0.286] / 0.161 [0.133-0.240] | 3 / 19 of 271 | 57 % / 60 % |
| 190 M | 340 | 83 (24 %) | 234 (69 %) | 23 (7 %) | 0 (0 %) | 13 of 47 (28 %) | 0.158 [0.103-0.286] / 0.161 [0.133-0.240] | 1 / 13 of 257 | 69 % / 72 % |
| 380 M | 340 | 101 (30 %) | 225 (66 %) | 14 (4 %) | 0 (0 %) | 9 of 47 (19 %) | 0.190 [0.100-0.286] / 0.161 [0.133-0.240] | 0 / 9 of 239 | 83 % / 81 % |

| W | canonical ms | screen ms | lost canonical ms | cost ratio | net ratio | P2 saving | per useful rating: canonical / with screen, ms | per useful rating: canonical / with screen, work |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 95 M | 565859 | 108107 | 34275 | 0.191 | 0.252 | 3.97 | 12039.6 / 3029.4 | 4165.9 M / 897.4 M |
| 190 M | 565859 | 185552 | 29455 | 0.328 | 0.380 | 2.63 | 12039.6 / 4574.6 | 4165.9 M / 1427.8 M |
| 380 M | 565859 | 320945 | 23137 | 0.567 | 0.608 | 1.64 | 12039.6 / 7320.9 | 4165.9 M / 2412.3 M |

### Where the losses lie, by offset from the start count

| W | useful lost / of at offset <0 | useful lost / of at offset 0 | useful lost / of at offset 1 | useful lost / of at offset 2 | useful lost / of at offset 3 | useful lost / of at offset 4 | useful lost / of at offset >4 | offset lost / all, median |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 95 M | 1 / 15 | 10 / 19 | 5 / 10 | 0 / 0 | 3 / 3 | 0 / 0 | 0 / 0 | 0.0 / 0.0 |
| 190 M | 1 / 15 | 6 / 19 | 4 / 10 | 0 / 0 | 2 / 3 | 0 / 0 | 0 / 0 | 0.0 / 0.0 |
| 380 M | 1 / 15 | 3 / 19 | 3 / 10 | 0 / 0 | 2 / 3 | 0 / 0 | 0 / 0 | 1.0 / 0.0 |

## 10x10-nightmare

Level nightmare, band [53, 77), area 100; 4 sets: K 20, start 3, 3 call + 12 window profiles; K 20, start 3, 5 call + 12 window profiles; K 18, start 3, 2 call + 12 window profiles; K 20, start 3, 7 call + 12 window profiles.

Canonical call profiles: 17, complete 17, capped 0, in band 6, useful (in band, AR1-eligible) 6. Start-count capped share (R29 cross-check): 0 of 13 (0.0 %). Censored calls: 0 (0 profiles contributed). Boundary screens: 195 runs (certified 0, scap0 0, scap1 128, over 67), R7 cuts 12.

### Call profiles (today's mix)

| W | profiles | certified | scap0 | scap1 | over | useful lost (of) | clue share lost / all useful, median [p10-p90] | capped, canonical below / in band | main work <= W: complete / useful |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 95 M | 17 | 6 (35 %) | 0 (0 %) | 11 (65 %) | 0 (0 %) | 3 of 6 (50 %) | 0.150 [0.150-0.167] / 0.158 [0.150-0.200] | 0 / 3 of 11 | 35 % / 50 % |
| 190 M | 17 | 9 (53 %) | 0 (0 %) | 8 (47 %) | 0 (0 %) | 2 of 6 (33 %) | 0.158 [0.150-0.167] / 0.158 [0.150-0.200] | 0 / 2 of 8 | 53 % / 67 % |
| 380 M | 17 | 17 (100 %) | 0 (0 %) | 0 (0 %) | 0 (0 %) | 0 of 6 (0 %) | - / 0.158 [0.150-0.200] | 0 / 0 of 0 | 100 % / 100 % |

| W | canonical ms | screen ms | lost canonical ms | cost ratio | net ratio | P2 saving | per useful rating: canonical / with screen, ms | per useful rating: canonical / with screen, work |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 95 M | 15936 | 10209 | 3837 | 0.641 | 0.881 | 1.13 | 2656.0 / 2341.1 | 756.1 M / 623.2 M |
| 190 M | 15936 | 13245 | 2899 | 0.831 | 1.013 | 0.99 | 2656.0 / 2690.7 | 756.1 M / 727.0 M |
| 380 M | 15936 | 16182 | 0 | 1.015 | 1.015 | 0.98 | 2656.0 / 2697.0 | 756.1 M / 756.1 M |

| W | useful lost / of at offset <0 | useful lost / of at offset 0 | useful lost / of at offset 1 | useful lost / of at offset 2 | useful lost / of at offset 3 | useful lost / of at offset 4 | useful lost / of at offset >4 | offset lost / all, median |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 95 M | 0 / 0 | 3 / 4 | 0 / 2 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0.0 / 0.0 |
| 190 M | 0 / 0 | 2 / 4 | 0 / 2 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0.0 / 0.0 |
| 380 M | 0 / 0 | 0 / 4 | 0 / 2 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | - / 0.0 |

### First solution (complete canonical call profiles)

| Quantity (units) | n | min | median | p95 | max |
|---|---:|---:|---:|---:|---:|
| work to the first solution | 17 | 5.6 M | 20.6 M | 73.6 M | 73.6 M |
| main work | 17 | 18.7 M | 187.3 M | 342.3 M | 342.3 M |
| count tail (main work - first solution) | 17 | 12.1 M | 175.8 M | 318.2 M | 318.2 M |
| census work | 17 | 80.0 M | 80.0 M | 80.0 M | 80.0 M |

### Window profiles (apart)

Window profiles: 48, complete 48, capped 0, in band 21, useful 21.

| W | profiles | certified | scap0 | scap1 | over | useful lost (of) | clue share lost / all useful, median [p10-p90] | capped, canonical below / in band | main work <= W: complete / useful |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 95 M | 48 | 36 (75 %) | 3 (6 %) | 9 (19 %) | 0 (0 %) | 7 of 21 (33 %) | 0.250 [0.222-0.350] / 0.250 [0.200-0.300] | 1 / 7 of 12 | 75 % / 67 % |
| 190 M | 48 | 45 (94 %) | 0 (0 %) | 3 (6 %) | 0 (0 %) | 3 of 21 (14 %) | 0.250 [0.222-0.250] / 0.250 [0.200-0.300] | 0 / 3 of 3 | 94 % / 86 % |
| 380 M | 48 | 47 (98 %) | 0 (0 %) | 1 (2 %) | 0 (0 %) | 1 of 21 (5 %) | 0.250 [0.250-0.250] / 0.250 [0.200-0.300] | 0 / 1 of 1 | 98 % / 95 % |

| W | canonical ms | screen ms | lost canonical ms | cost ratio | net ratio | P2 saving | per useful rating: canonical / with screen, ms | per useful rating: canonical / with screen, work |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 95 M | 23266 | 17549 | 8940 | 0.754 | 1.139 | 0.88 | 1107.9 / 1261.4 | 283.2 M / 316.6 M |
| 190 M | 23266 | 20733 | 5873 | 0.891 | 1.144 | 0.87 | 1107.9 / 1267.0 | 283.2 M / 321.8 M |
| 380 M | 23266 | 22223 | 3181 | 0.955 | 1.092 | 0.92 | 1107.9 / 1209.7 | 283.2 M / 305.1 M |

### Canonical cost by clue offset from the start count (call and window profiles)

| Offset | profiles (call / window) | capped | complete | useful | ms median | ms mean | main work median |
|---|---:|---:|---:|---:|---:|---:|---:|
| <0 | 0 (0 / 0) | 0 (-) | 0 | 0 | - | - | - |
| 0 | 13 (13 / 0) | 0 (0 %) | 13 | 4 | 1035.9 | 1066.8 | 228.3 M |
| 1 | 16 (4 / 12) | 0 (0 %) | 16 | 7 | 555.0 | 649.4 | 68.0 M |
| 2 | 12 (0 / 12) | 0 (0 %) | 12 | 9 | 490.3 | 791.8 | 61.5 M |
| 3 | 12 (0 / 12) | 0 (0 %) | 12 | 6 | 269.6 | 279.5 | 22.9 M |
| 4 | 12 (0 / 12) | 0 (0 %) | 12 | 1 | 109.0 | 174.0 | 11.7 M |
| >4 | 0 (0 / 0) | 0 (-) | 0 | 0 | - | - | - |

## 12x12-nightmare

Level nightmare, band [53, 77), area 144; 4 sets: K 19, start 3, 12 call + 12 window profiles; K 21, start 3, 16 call + 12 window profiles; K 21, start 3, 16 call + 12 window profiles; K 19, start 3, 6 call + 12 window profiles.

Canonical call profiles: 50, complete 26, capped 24, in band 9, useful (in band, AR1-eligible) 9. Start-count capped share (R29 cross-check): 13 of 16 (81.3 %). Censored calls: 0 (0 profiles contributed). Boundary screens: 189 runs (certified 0, scap0 0, scap1 138, over 51), R7 cuts 12.

### Call profiles (today's mix)

| W | profiles | certified | scap0 | scap1 | over | useful lost (of) | clue share lost / all useful, median [p10-p90] | capped, canonical below / in band | main work <= W: complete / useful |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 95 M | 50 | 3 (6 %) | 38 (76 %) | 9 (18 %) | 0 (0 %) | 9 of 9 (100 %) | 0.211 [0.158-0.286] / 0.211 [0.158-0.286] | 0 / 9 of 47 | 12 % / 0 % |
| 190 M | 50 | 6 (12 %) | 30 (60 %) | 14 (28 %) | 0 (0 %) | 7 of 9 (78 %) | 0.211 [0.158-0.286] / 0.211 [0.158-0.286] | 0 / 7 of 44 | 23 % / 22 % |
| 380 M | 50 | 9 (18 %) | 27 (54 %) | 14 (28 %) | 0 (0 %) | 7 of 9 (78 %) | 0.211 [0.158-0.286] / 0.211 [0.158-0.286] | 0 / 7 of 41 | 35 % / 22 % |

| W | canonical ms | screen ms | lost canonical ms | cost ratio | net ratio | P2 saving | per useful rating: canonical / with screen, ms | per useful rating: canonical / with screen, work |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 95 M | 102479 | 17951 | 19207 | 0.175 | 0.363 | 2.76 | 11386.6 / 4128.6 | 3676.5 M / 1270.4 M |
| 190 M | 102479 | 33693 | 17737 | 0.329 | 0.502 | 1.99 | 11386.6 / 5714.5 | 3676.5 M / 1769.9 M |
| 380 M | 102479 | 58421 | 17737 | 0.570 | 0.743 | 1.35 | 11386.6 / 8462.0 | 3676.5 M / 2680.3 M |

| W | useful lost / of at offset <0 | useful lost / of at offset 0 | useful lost / of at offset 1 | useful lost / of at offset 2 | useful lost / of at offset 3 | useful lost / of at offset 4 | useful lost / of at offset >4 | offset lost / all, median |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 95 M | 0 / 0 | 2 / 2 | 4 / 4 | 0 / 0 | 3 / 3 | 0 / 0 | 0 / 0 | 1.0 / 1.0 |
| 190 M | 0 / 0 | 2 / 2 | 3 / 4 | 0 / 0 | 2 / 3 | 0 / 0 | 0 / 0 | 1.0 / 1.0 |
| 380 M | 0 / 0 | 2 / 2 | 3 / 4 | 0 / 0 | 2 / 3 | 0 / 0 | 0 / 0 | 1.0 / 1.0 |

### First solution (complete canonical call profiles)

| Quantity (units) | n | min | median | p95 | max |
|---|---:|---:|---:|---:|---:|
| work to the first solution | 26 | 8.7 M | 100.9 M | 559.7 M | 684.8 M |
| main work | 26 | 13.4 M | 578.7 M | 760.1 M | 760.1 M |
| count tail (main work - first solution) | 26 | 4.7 M | 303.7 M | 726.9 M | 740.3 M |
| census work | 26 | 0.0 M | 80.0 M | 80.1 M | 80.1 M |

### Window profiles (apart)

Window profiles: 48, complete 43, capped 5, in band 21, useful 21.

| W | profiles | certified | scap0 | scap1 | over | useful lost (of) | clue share lost / all useful, median [p10-p90] | capped, canonical below / in band | main work <= W: complete / useful |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 95 M | 48 | 18 (38 %) | 20 (42 %) | 10 (21 %) | 0 (0 %) | 14 of 21 (67 %) | 0.263 [0.211-0.333] / 0.286 [0.211-0.333] | 1 / 14 of 30 | 42 % / 33 % |
| 190 M | 48 | 22 (46 %) | 14 (29 %) | 12 (25 %) | 0 (0 %) | 11 of 21 (52 %) | 0.263 [0.211-0.333] / 0.286 [0.211-0.333] | 1 / 11 of 26 | 51 % / 48 % |
| 380 M | 48 | 32 (67 %) | 7 (15 %) | 9 (19 %) | 0 (0 %) | 2 of 21 (10 %) | 0.274 [0.263-0.286] / 0.286 [0.211-0.333] | 1 / 2 of 16 | 74 % / 90 % |

| W | canonical ms | screen ms | lost canonical ms | cost ratio | net ratio | P2 saving | per useful rating: canonical / with screen, ms | per useful rating: canonical / with screen, work |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 95 M | 56791 | 15597 | 16272 | 0.275 | 0.561 | 1.78 | 2704.3 / 1517.6 | 803.8 M / 414.8 M |
| 190 M | 56791 | 25369 | 14460 | 0.447 | 0.701 | 1.43 | 2704.3 / 1896.6 | 803.8 M / 525.1 M |
| 380 M | 56791 | 38163 | 5287 | 0.672 | 0.765 | 1.31 | 2704.3 / 2069.1 | 803.8 M / 589.1 M |

### Canonical cost by clue offset from the start count (call and window profiles)

| Offset | profiles (call / window) | capped | complete | useful | ms median | ms mean | main work median |
|---|---:|---:|---:|---:|---:|---:|---:|
| <0 | 2 (2 / 0) | 2 (100 %) | 0 | 0 | 2131.1 | 2131.1 | - |
| 0 | 29 (29 / 0) | 22 (76 %) | 7 | 2 | 2343.1 | 2341.7 | 760.0 M |
| 1 | 23 (11 / 12) | 3 (13 %) | 20 | 7 | 2491.5 | 1975.9 | 673.7 M |
| 2 | 16 (4 / 12) | 2 (13 %) | 14 | 6 | 953.0 | 1212.1 | 212.6 M |
| 3 | 16 (4 / 12) | 0 (0 %) | 16 | 7 | 572.2 | 1126.7 | 84.0 M |
| 4 | 12 (0 / 12) | 0 (0 %) | 12 | 8 | 148.8 | 352.9 | 32.1 M |
| >4 | 0 (0 / 0) | 0 (-) | 0 | 0 | - | - | - |

## 14x14-nightmare

Level nightmare, band [53, 77), area 196; 4 sets: K 24, start 3, 19 call + 12 window profiles; K 23, start 3, 19 call + 12 window profiles; K 24, start 3, 20 call + 12 window profiles; K 23, start 3, 20 call + 12 window profiles.

Canonical call profiles: 78, complete 0, capped 78, in band 0, useful (in band, AR1-eligible) 0. Start-count capped share (R29 cross-check): 16 of 16 (100.0 %). Censored calls: 0 (0 profiles contributed). Boundary screens: 54 runs (certified 0, scap0 0, scap1 36, over 18), R7 cuts 0.

### Call profiles (today's mix)

| W | profiles | certified | scap0 | scap1 | over | useful lost (of) | clue share lost / all useful, median [p10-p90] | capped, canonical below / in band | main work <= W: complete / useful |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 95 M | 78 | 0 (0 %) | 78 (100 %) | 0 (0 %) | 0 (0 %) | 0 of 0 (-) | - / - | 0 / 0 of 78 | - / - |
| 190 M | 78 | 0 (0 %) | 78 (100 %) | 0 (0 %) | 0 (0 %) | 0 of 0 (-) | - / - | 0 / 0 of 78 | - / - |
| 380 M | 78 | 0 (0 %) | 78 (100 %) | 0 (0 %) | 0 (0 %) | 0 of 0 (-) | - / - | 0 / 0 of 78 | - / - |

| W | canonical ms | screen ms | lost canonical ms | cost ratio | net ratio | P2 saving | per useful rating: canonical / with screen, ms | per useful rating: canonical / with screen, work |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 95 M | 163305 | 21608 | 0 | 0.132 | 0.132 | 7.56 | - / - | - / - |
| 190 M | 163305 | 41927 | 0 | 0.257 | 0.257 | 3.90 | - / - | - / - |
| 380 M | 163305 | 82476 | 0 | 0.505 | 0.505 | 1.98 | - / - | - / - |

| W | useful lost / of at offset <0 | useful lost / of at offset 0 | useful lost / of at offset 1 | useful lost / of at offset 2 | useful lost / of at offset 3 | useful lost / of at offset 4 | useful lost / of at offset >4 | offset lost / all, median |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 95 M | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | - / - |
| 190 M | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | - / - |
| 380 M | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | - / - |

### First solution (complete canonical call profiles)

| Quantity (units) | n | min | median | p95 | max |
|---|---:|---:|---:|---:|---:|
| work to the first solution | 0 | - | - | - | - |
| main work | 0 | - | - | - | - |
| count tail (main work - first solution) | 0 | - | - | - | - |
| census work | 0 | - | - | - | - |

### Window profiles (apart)

Window profiles: 48, complete 18, capped 30, in band 8, useful 8.

| W | profiles | certified | scap0 | scap1 | over | useful lost (of) | clue share lost / all useful, median [p10-p90] | capped, canonical below / in band | main work <= W: complete / useful |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 95 M | 48 | 6 (13 %) | 42 (88 %) | 0 (0 %) | 0 (0 %) | 5 of 8 (63 %) | 0.261 [0.261-0.304] / 0.276 [0.261-0.304] | 1 / 5 of 42 | 33 % / 38 % |
| 190 M | 48 | 12 (25 %) | 35 (73 %) | 1 (2 %) | 0 (0 %) | 3 of 8 (38 %) | 0.292 [0.261-0.304] / 0.276 [0.261-0.304] | 0 / 3 of 36 | 67 % / 63 % |
| 380 M | 48 | 15 (31 %) | 32 (67 %) | 1 (2 %) | 0 (0 %) | 1 of 8 (13 %) | 0.292 [0.292-0.292] / 0.276 [0.261-0.304] | 0 / 1 of 33 | 83 % / 88 % |

| W | canonical ms | screen ms | lost canonical ms | cost ratio | net ratio | P2 saving | per useful rating: canonical / with screen, ms | per useful rating: canonical / with screen, work |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 95 M | 83566 | 13854 | 6269 | 0.166 | 0.241 | 4.15 | 10445.7 / 2515.3 | 3409.4 M / 751.7 M |
| 190 M | 83566 | 27483 | 4886 | 0.329 | 0.387 | 2.58 | 10445.7 / 4046.1 | 3409.4 M / 1228.5 M |
| 380 M | 83566 | 48149 | 2549 | 0.576 | 0.607 | 1.65 | 10445.7 / 6337.3 | 3409.4 M / 1982.7 M |

### Canonical cost by clue offset from the start count (call and window profiles)

| Offset | profiles (call / window) | capped | complete | useful | ms median | ms mean | main work median |
|---|---:|---:|---:|---:|---:|---:|---:|
| <0 | 0 (0 / 0) | 0 (-) | 0 | 0 | - | - | - |
| 0 | 78 (78 / 0) | 78 (100 %) | 0 | 0 | 2123.6 | 2093.7 | - |
| 1 | 12 (0 / 12) | 12 (100 %) | 0 | 0 | 2151.9 | 2118.2 | - |
| 2 | 12 (0 / 12) | 10 (83 %) | 2 | 0 | 2315.3 | 2067.4 | 181.3 M |
| 3 | 12 (0 / 12) | 5 (42 %) | 7 | 4 | 2005.0 | 1727.9 | 326.5 M |
| 4 | 12 (0 / 12) | 3 (25 %) | 9 | 4 | 723.8 | 1050.3 | 67.3 M |
| >4 | 0 (0 / 0) | 0 (-) | 0 | 0 | - | - | - |

## 15x15b10-nightmare

Level nightmare, band [53, 77), area 215; 4 sets: K 23, start 3, 20 call + 12 window profiles; K 22, start 3, 16 call + 12 window profiles; K 23, start 3, 20 call + 12 window profiles; K 22, start 3, 1 call + 12 window profiles.

Canonical call profiles: 57, complete 6, capped 51, in band 2, useful (in band, AR1-eligible) 2. Start-count capped share (R29 cross-check): 12 of 13 (92.3 %). Censored calls: 0 (0 profiles contributed). Boundary screens: 112 runs (certified 0, scap0 0, scap1 74, over 38), R7 cuts 6.

### Call profiles (today's mix)

| W | profiles | certified | scap0 | scap1 | over | useful lost (of) | clue share lost / all useful, median [p10-p90] | capped, canonical below / in band | main work <= W: complete / useful |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 95 M | 57 | 3 (5 %) | 53 (93 %) | 1 (2 %) | 0 (0 %) | 0 of 2 (0 %) | - / 0.159 [0.136-0.182] | 1 / 0 of 54 | 50 % / 100 % |
| 190 M | 57 | 3 (5 %) | 53 (93 %) | 1 (2 %) | 0 (0 %) | 0 of 2 (0 %) | - / 0.159 [0.136-0.182] | 1 / 0 of 54 | 50 % / 100 % |
| 380 M | 57 | 6 (11 %) | 51 (89 %) | 0 (0 %) | 0 (0 %) | 0 of 2 (0 %) | - / 0.159 [0.136-0.182] | 0 / 0 of 51 | 100 % / 100 % |

| W | canonical ms | screen ms | lost canonical ms | cost ratio | net ratio | P2 saving | per useful rating: canonical / with screen, ms | per useful rating: canonical / with screen, work |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 95 M | 111909 | 16471 | 0 | 0.147 | 0.147 | 6.79 | 55954.3 / 8235.3 | 20009.1 M / 2773.0 M |
| 190 M | 111909 | 31136 | 0 | 0.278 | 0.278 | 3.59 | 55954.3 / 15567.9 | 20009.1 M / 5337.9 M |
| 380 M | 111909 | 58704 | 0 | 0.525 | 0.525 | 1.91 | 55954.3 / 29351.8 | 20009.1 M / 10319.0 M |

| W | useful lost / of at offset <0 | useful lost / of at offset 0 | useful lost / of at offset 1 | useful lost / of at offset 2 | useful lost / of at offset 3 | useful lost / of at offset 4 | useful lost / of at offset >4 | offset lost / all, median |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 95 M | 0 / 0 | 0 / 1 | 0 / 1 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | - / 0.5 |
| 190 M | 0 / 0 | 0 / 1 | 0 / 1 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | - / 0.5 |
| 380 M | 0 / 0 | 0 / 1 | 0 / 1 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | - / 0.5 |

### First solution (complete canonical call profiles)

| Quantity (units) | n | min | median | p95 | max |
|---|---:|---:|---:|---:|---:|
| work to the first solution | 6 | 18.5 M | 51.5 M | 202.2 M | 202.2 M |
| main work | 6 | 19.4 M | 146.9 M | 260.4 M | 260.4 M |
| count tail (main work - first solution) | 6 | 0.9 M | 32.3 M | 169.8 M | 169.8 M |
| census work | 6 | 15.5 M | 80.1 M | 80.1 M | 80.1 M |

### Window profiles (apart)

Window profiles: 48, complete 32, capped 16, in band 16, useful 16.

| W | profiles | certified | scap0 | scap1 | over | useful lost (of) | clue share lost / all useful, median [p10-p90] | capped, canonical below / in band | main work <= W: complete / useful |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 95 M | 48 | 23 (48 %) | 25 (52 %) | 0 (0 %) | 0 (0 %) | 4 of 16 (25 %) | 0.261 [0.182-0.304] / 0.273 [0.217-0.318] | 2 / 4 of 25 | 72 % / 75 % |
| 190 M | 48 | 24 (50 %) | 24 (50 %) | 0 (0 %) | 0 (0 %) | 3 of 16 (19 %) | 0.261 [0.261-0.304] / 0.273 [0.217-0.318] | 2 / 3 of 24 | 75 % / 81 % |
| 380 M | 48 | 27 (56 %) | 21 (44 %) | 0 (0 %) | 0 (0 %) | 3 of 16 (19 %) | 0.261 [0.261-0.304] / 0.273 [0.217-0.318] | 1 / 3 of 21 | 84 % / 81 % |

| W | canonical ms | screen ms | lost canonical ms | cost ratio | net ratio | P2 saving | per useful rating: canonical / with screen, ms | per useful rating: canonical / with screen, work |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 95 M | 52776 | 10218 | 7633 | 0.194 | 0.338 | 2.96 | 3298.5 / 1115.7 | 1085.1 M / 337.9 M |
| 190 M | 52776 | 17040 | 6783 | 0.323 | 0.451 | 2.22 | 3298.5 / 1489.0 | 1085.1 M / 474.5 M |
| 380 M | 52776 | 30569 | 6783 | 0.579 | 0.708 | 1.41 | 3298.5 / 2334.5 | 1085.1 M / 757.7 M |

### Canonical cost by clue offset from the start count (call and window profiles)

| Offset | profiles (call / window) | capped | complete | useful | ms median | ms mean | main work median |
|---|---:|---:|---:|---:|---:|---:|---:|
| <0 | 0 (0 / 0) | 0 (-) | 0 | 0 | - | - | - |
| 0 | 53 (53 / 0) | 51 (96 %) | 2 | 1 | 2049.5 | 2049.8 | 150.4 M |
| 1 | 16 (4 / 12) | 9 (56 %) | 7 | 2 | 2080.3 | 1707.8 | 200.8 M |
| 2 | 12 (0 / 12) | 5 (42 %) | 7 | 3 | 1434.7 | 1203.9 | 71.8 M |
| 3 | 12 (0 / 12) | 2 (17 %) | 10 | 7 | 120.7 | 730.6 | 17.7 M |
| 4 | 12 (0 / 12) | 0 (0 %) | 12 | 5 | 54.8 | 458.9 | 7.1 M |
| >4 | 0 (0 / 0) | 0 (-) | 0 | 0 | - | - | - |

## 26x26-nightmare

Level nightmare, band [53, 77), area 676; 4 sets: K 30, start 4, 3 call + 12 window profiles; K 31, start 4, 6 call + 12 window profiles; K 30, start 4, 8 call + 12 window profiles; K 32, start 4, 1 call + 12 window profiles.

Canonical call profiles: 18, complete 17, capped 1, in band 8, useful (in band, AR1-eligible) 8. Start-count capped share (R29 cross-check): 1 of 12 (8.3 %). Censored calls: 0 (0 profiles contributed). Boundary screens: 195 runs (certified 0, scap0 0, scap1 129, over 66), R7 cuts 4.

### Call profiles (today's mix)

| W | profiles | certified | scap0 | scap1 | over | useful lost (of) | clue share lost / all useful, median [p10-p90] | capped, canonical below / in band | main work <= W: complete / useful |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 95 M | 18 | 6 (33 %) | 12 (67 %) | 0 (0 %) | 0 (0 %) | 4 of 8 (50 %) | 0.129 [0.100-0.133] / 0.133 [0.100-0.161] | 2 / 4 of 12 | 35 % / 50 % |
| 190 M | 18 | 13 (72 %) | 5 (28 %) | 0 (0 %) | 0 (0 %) | 2 of 8 (25 %) | 0.113 [0.100-0.125] / 0.133 [0.100-0.161] | 0 / 2 of 5 | 76 % / 75 % |
| 380 M | 18 | 16 (89 %) | 2 (11 %) | 0 (0 %) | 0 (0 %) | 1 of 8 (13 %) | 0.100 [0.100-0.100] / 0.133 [0.100-0.161] | 0 / 1 of 2 | 94 % / 88 % |

| W | canonical ms | screen ms | lost canonical ms | cost ratio | net ratio | P2 saving | per useful rating: canonical / with screen, ms | per useful rating: canonical / with screen, work |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 95 M | 16702 | 6122 | 5072 | 0.367 | 0.670 | 1.49 | 2087.8 / 1399.2 | 587.1 M / 402.3 M |
| 190 M | 16702 | 11001 | 3580 | 0.659 | 0.873 | 1.15 | 2087.8 / 1822.6 | 587.1 M / 515.4 M |
| 380 M | 16702 | 15142 | 2108 | 0.907 | 1.033 | 0.97 | 2087.8 / 2156.2 | 587.1 M / 587.3 M |

| W | useful lost / of at offset <0 | useful lost / of at offset 0 | useful lost / of at offset 1 | useful lost / of at offset 2 | useful lost / of at offset 3 | useful lost / of at offset 4 | useful lost / of at offset >4 | offset lost / all, median |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 95 M | 1 / 1 | 3 / 5 | 0 / 2 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0.0 / 0.0 |
| 190 M | 1 / 1 | 1 / 5 | 0 / 2 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | -0.5 / 0.0 |
| 380 M | 1 / 1 | 0 / 5 | 0 / 2 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | -1.0 / 0.0 |

### First solution (complete canonical call profiles)

| Quantity (units) | n | min | median | p95 | max |
|---|---:|---:|---:|---:|---:|
| work to the first solution | 17 | 26.3 M | 133.8 M | 383.7 M | 383.7 M |
| main work | 17 | 33.4 M | 138.0 M | 388.3 M | 388.3 M |
| count tail (main work - first solution) | 17 | 3.9 M | 5.6 M | 11.6 M | 11.6 M |
| census work | 17 | 50.2 M | 81.0 M | 81.9 M | 81.9 M |

### Window profiles (apart)

Window profiles: 48, complete 48, capped 0, in band 10, useful 10.

| W | profiles | certified | scap0 | scap1 | over | useful lost (of) | clue share lost / all useful, median [p10-p90] | capped, canonical below / in band | main work <= W: complete / useful |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 95 M | 48 | 46 (96 %) | 2 (4 %) | 0 (0 %) | 0 (0 %) | 0 of 10 (0 %) | - / 0.167 [0.156-0.226] | 0 / 0 of 2 | 96 % / 100 % |
| 190 M | 48 | 48 (100 %) | 0 (0 %) | 0 (0 %) | 0 (0 %) | 0 of 10 (0 %) | - / 0.167 [0.156-0.226] | 0 / 0 of 0 | 100 % / 100 % |
| 380 M | 48 | 48 (100 %) | 0 (0 %) | 0 (0 %) | 0 (0 %) | 0 of 10 (0 %) | - / 0.167 [0.156-0.226] | 0 / 0 of 0 | 100 % / 100 % |

| W | canonical ms | screen ms | lost canonical ms | cost ratio | net ratio | P2 saving | per useful rating: canonical / with screen, ms | per useful rating: canonical / with screen, work |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 95 M | 13724 | 13045 | 0 | 0.950 | 0.950 | 1.05 | 1372.4 / 1304.5 | 409.4 M / 383.8 M |
| 190 M | 13724 | 14084 | 0 | 1.026 | 1.026 | 0.97 | 1372.4 / 1408.4 | 409.4 M / 409.4 M |
| 380 M | 13724 | 14215 | 0 | 1.036 | 1.036 | 0.97 | 1372.4 / 1421.5 | 409.4 M / 409.4 M |

### Canonical cost by clue offset from the start count (call and window profiles)

| Offset | profiles (call / window) | capped | complete | useful | ms median | ms mean | main work median |
|---|---:|---:|---:|---:|---:|---:|---:|
| <0 | 1 (1 / 0) | 0 (0 %) | 1 | 1 | 2108.0 | 2108.0 | 388.3 M |
| 0 | 15 (15 / 0) | 1 (7 %) | 14 | 5 | 798.4 | 922.5 | 140.3 M |
| 1 | 14 (2 / 12) | 0 (0 %) | 14 | 8 | 441.2 | 437.8 | 59.4 M |
| 2 | 12 (0 / 12) | 0 (0 %) | 12 | 2 | 319.6 | 340.2 | 46.0 M |
| 3 | 12 (0 / 12) | 0 (0 %) | 12 | 1 | 168.3 | 175.0 | 21.3 M |
| 4 | 12 (0 / 12) | 0 (0 %) | 12 | 1 | 182.6 | 180.8 | 21.2 M |
| >4 | 0 (0 / 0) | 0 (-) | 0 | 0 | - | - | - |

## 26x26-hell-1

Level hell-1, band [77, 112), area 676; 4 sets: K 41, start 4, 20 call + 12 window profiles; K 42, start 4, 20 call + 12 window profiles; K 41, start 4, 20 call + 12 window profiles; K 39, start 4, 8 call + 12 window profiles.

Canonical call profiles: 68, complete 3, capped 65, in band 2, useful (in band, AR1-eligible) 2. Start-count capped share (R29 cross-check): 16 of 16 (100.0 %). Censored calls: 0 (0 profiles contributed). Boundary screens: 62 runs (certified 0, scap0 0, scap1 42, over 20), R7 cuts 4.

### Call profiles (today's mix)

| W | profiles | certified | scap0 | scap1 | over | useful lost (of) | clue share lost / all useful, median [p10-p90] | capped, canonical below / in band | main work <= W: complete / useful |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 95 M | 68 | 0 (0 %) | 68 (100 %) | 0 (0 %) | 0 (0 %) | 2 of 2 (100 %) | 0.115 [0.103-0.128] / 0.115 [0.103-0.128] | 0 / 2 of 68 | 0 % / 0 % |
| 190 M | 68 | 0 (0 %) | 68 (100 %) | 0 (0 %) | 0 (0 %) | 2 of 2 (100 %) | 0.115 [0.103-0.128] / 0.115 [0.103-0.128] | 0 / 2 of 68 | 0 % / 0 % |
| 380 M | 68 | 1 (1 %) | 67 (99 %) | 0 (0 %) | 0 (0 %) | 1 of 2 (50 %) | 0.103 [0.103-0.103] / 0.115 [0.103-0.128] | 0 / 1 of 67 | 33 % / 50 % |

| W | canonical ms | screen ms | lost canonical ms | cost ratio | net ratio | P2 saving | per useful rating: canonical / with screen, ms | per useful rating: canonical / with screen, work |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 95 M | 144066 | 24608 | 5239 | 0.171 | 0.207 | 4.83 | 72032.8 / 14923.5 | 25414.3 M / 3693.2 M |
| 190 M | 144066 | 42627 | 5239 | 0.296 | 0.332 | 3.01 | 72032.8 / 23933.0 | 25414.3 M / 6925.4 M |
| 380 M | 144066 | 78197 | 3292 | 0.543 | 0.566 | 1.77 | 72032.8 / 40744.4 | 25414.3 M / 13197.1 M |

| W | useful lost / of at offset <0 | useful lost / of at offset 0 | useful lost / of at offset 1 | useful lost / of at offset 2 | useful lost / of at offset 3 | useful lost / of at offset 4 | useful lost / of at offset >4 | offset lost / all, median |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 95 M | 0 / 0 | 1 / 1 | 1 / 1 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0.5 / 0.5 |
| 190 M | 0 / 0 | 1 / 1 | 1 / 1 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0.5 / 0.5 |
| 380 M | 0 / 0 | 1 / 1 | 0 / 1 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0.0 / 0.5 |

### First solution (complete canonical call profiles)

| Quantity (units) | n | min | median | p95 | max |
|---|---:|---:|---:|---:|---:|
| work to the first solution | 3 | 242.1 M | 407.0 M | 410.6 M | 410.6 M |
| main work | 3 | 248.2 M | 415.8 M | 419.9 M | 419.9 M |
| count tail (main work - first solution) | 3 | 6.1 M | 8.8 M | 9.3 M | 9.3 M |
| census work | 3 | 81.0 M | 81.7 M | 81.9 M | 81.9 M |

### Window profiles (apart)

Window profiles: 48, complete 18, capped 30, in band 14, useful 14.

| W | profiles | certified | scap0 | scap1 | over | useful lost (of) | clue share lost / all useful, median [p10-p90] | capped, canonical below / in band | main work <= W: complete / useful |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 95 M | 48 | 3 (6 %) | 45 (94 %) | 0 (0 %) | 0 (0 %) | 14 of 14 (100 %) | 0.175 [0.146-0.195] / 0.175 [0.146-0.195] | 0 / 14 of 45 | 17 % / 0 % |
| 190 M | 48 | 4 (8 %) | 44 (92 %) | 0 (0 %) | 0 (0 %) | 13 of 14 (93 %) | 0.179 [0.154-0.195] / 0.175 [0.146-0.195] | 0 / 13 of 44 | 22 % / 7 % |
| 380 M | 48 | 9 (19 %) | 39 (81 %) | 0 (0 %) | 0 (0 %) | 8 of 14 (57 %) | 0.175 [0.146-0.195] / 0.175 [0.146-0.195] | 0 / 8 of 39 | 50 % / 43 % |

| W | canonical ms | screen ms | lost canonical ms | cost ratio | net ratio | P2 saving | per useful rating: canonical / with screen, ms | per useful rating: canonical / with screen, work |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 95 M | 99052 | 16846 | 35207 | 0.170 | 0.526 | 1.90 | 7075.1 / 3718.1 | 2247.4 M / 882.9 M |
| 190 M | 99052 | 28545 | 33838 | 0.288 | 0.630 | 1.59 | 7075.1 / 4456.0 | 2247.4 M / 1174.5 M |
| 380 M | 99052 | 52957 | 25519 | 0.535 | 0.792 | 1.26 | 7075.1 / 5605.4 | 2247.4 M / 1635.8 M |

### Canonical cost by clue offset from the start count (call and window profiles)

| Offset | profiles (call / window) | capped | complete | useful | ms median | ms mean | main work median |
|---|---:|---:|---:|---:|---:|---:|---:|
| <0 | 1 (1 / 0) | 1 (100 %) | 0 | 0 | 2154.8 | 2154.8 | - |
| 0 | 65 (65 / 0) | 64 (98 %) | 1 | 1 | 2097.1 | 2107.4 | 419.9 M |
| 1 | 14 (2 / 12) | 12 (86 %) | 2 | 1 | 2182.6 | 2210.8 | 332.0 M |
| 2 | 12 (0 / 12) | 7 (58 %) | 5 | 5 | 2140.1 | 2287.4 | 435.9 M |
| 3 | 12 (0 / 12) | 7 (58 %) | 5 | 4 | 1897.9 | 2189.7 | 508.6 M |
| 4 | 12 (0 / 12) | 4 (33 %) | 8 | 5 | 1751.5 | 1608.7 | 236.1 M |
| >4 | 0 (0 / 0) | 0 (-) | 0 | 0 | - | - | - |

## 26x26-master

Level master, band [37, 53), area 676; 4 sets: K 27, start 6, 2 call + 12 window profiles; K 25, start 6, 20 call + 12 window profiles; K 27, start 6, 21 call + 12 window profiles; K 26, start 6, 9 call + 12 window profiles.

Canonical call profiles: 52, complete 52, capped 0, in band 20, useful (in band, AR1-eligible) 20. Start-count capped share (R29 cross-check): 0 of 14 (0.0 %). Censored calls: 0 (0 profiles contributed). Boundary screens: 300 runs (certified 0, scap0 0, scap1 161, over 139), R7 cuts 14.

### Call profiles (today's mix)

| W | profiles | certified | scap0 | scap1 | over | useful lost (of) | clue share lost / all useful, median [p10-p90] | capped, canonical below / in band | main work <= W: complete / useful |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 95 M | 52 | 51 (98 %) | 1 (2 %) | 0 (0 %) | 0 (0 %) | 1 of 20 (5 %) | 0.222 [0.222-0.222] / 0.193 [0.148-0.231] | 0 / 1 of 1 | 98 % / 95 % |
| 190 M | 52 | 52 (100 %) | 0 (0 %) | 0 (0 %) | 0 (0 %) | 0 of 20 (0 %) | - / 0.193 [0.148-0.231] | 0 / 0 of 0 | 100 % / 100 % |
| 380 M | 52 | 52 (100 %) | 0 (0 %) | 0 (0 %) | 0 (0 %) | 0 of 20 (0 %) | - / 0.193 [0.148-0.231] | 0 / 0 of 0 | 100 % / 100 % |

| W | canonical ms | screen ms | lost canonical ms | cost ratio | net ratio | P2 saving | per useful rating: canonical / with screen, ms | per useful rating: canonical / with screen, work |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 95 M | 11462 | 11137 | 921 | 0.972 | 1.052 | 0.95 | 573.1 / 602.9 | 166.9 M / 171.7 M |
| 190 M | 11462 | 11923 | 0 | 1.040 | 1.040 | 0.96 | 573.1 / 596.1 | 166.9 M / 166.9 M |
| 380 M | 11462 | 11824 | 0 | 1.032 | 1.032 | 0.97 | 573.1 / 591.2 | 166.9 M / 166.9 M |

| W | useful lost / of at offset <0 | useful lost / of at offset 0 | useful lost / of at offset 1 | useful lost / of at offset 2 | useful lost / of at offset 3 | useful lost / of at offset 4 | useful lost / of at offset >4 | offset lost / all, median |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 95 M | 0 / 14 | 1 / 6 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0.0 / -1.0 |
| 190 M | 0 / 14 | 0 / 6 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | - / -1.0 |
| 380 M | 0 / 14 | 0 / 6 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | - / -1.0 |

### First solution (complete canonical call profiles)

| Quantity (units) | n | min | median | p95 | max |
|---|---:|---:|---:|---:|---:|
| work to the first solution | 52 | 5.3 M | 17.1 M | 57.2 M | 133.6 M |
| main work | 52 | 7.2 M | 25.5 M | 70.7 M | 135.8 M |
| count tail (main work - first solution) | 52 | 1.0 M | 4.8 M | 22.2 M | 23.0 M |
| census work | 52 | 0.0 M | 22.8 M | 81.4 M | 81.7 M |

### Window profiles (apart)

Window profiles: 48, complete 48, capped 0, in band 2, useful 2.

| W | profiles | certified | scap0 | scap1 | over | useful lost (of) | clue share lost / all useful, median [p10-p90] | capped, canonical below / in band | main work <= W: complete / useful |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 95 M | 48 | 48 (100 %) | 0 (0 %) | 0 (0 %) | 0 (0 %) | 0 of 2 (0 %) | - / 0.270 [0.259-0.280] | 0 / 0 of 0 | 100 % / 100 % |
| 190 M | 48 | 48 (100 %) | 0 (0 %) | 0 (0 %) | 0 (0 %) | 0 of 2 (0 %) | - / 0.270 [0.259-0.280] | 0 / 0 of 0 | 100 % / 100 % |
| 380 M | 48 | 48 (100 %) | 0 (0 %) | 0 (0 %) | 0 (0 %) | 0 of 2 (0 %) | - / 0.270 [0.259-0.280] | 0 / 0 of 0 | 100 % / 100 % |

| W | canonical ms | screen ms | lost canonical ms | cost ratio | net ratio | P2 saving | per useful rating: canonical / with screen, ms | per useful rating: canonical / with screen, work |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 95 M | 2114 | 2142 | 0 | 1.013 | 1.013 | 0.99 | 1056.9 / 1071.0 | 223.3 M / 223.3 M |
| 190 M | 2114 | 2211 | 0 | 1.046 | 1.046 | 0.96 | 1056.9 / 1105.3 | 223.3 M / 223.3 M |
| 380 M | 2114 | 2195 | 0 | 1.039 | 1.039 | 0.96 | 1056.9 / 1097.7 | 223.3 M / 223.3 M |

### Canonical cost by clue offset from the start count (call and window profiles)

| Offset | profiles (call / window) | capped | complete | useful | ms median | ms mean | main work median |
|---|---:|---:|---:|---:|---:|---:|---:|
| <0 | 29 (29 / 0) | 0 (0 %) | 29 | 14 | 277.0 | 271.8 | 31.9 M |
| 0 | 21 (21 / 0) | 0 (0 %) | 21 | 6 | 104.6 | 160.6 | 14.2 M |
| 1 | 14 (2 / 12) | 0 (0 %) | 14 | 2 | 84.8 | 95.4 | 14.5 M |
| 2 | 12 (0 / 12) | 0 (0 %) | 12 | 0 | 32.3 | 39.8 | 4.5 M |
| 3 | 12 (0 / 12) | 0 (0 %) | 12 | 0 | 20.4 | 26.8 | 1.7 M |
| 4 | 12 (0 / 12) | 0 (0 %) | 12 | 0 | 13.0 | 15.4 | 0.7 M |
| >4 | 0 (0 / 0) | 0 (-) | 0 | 0 | - | - | - |

## Notes

- Today's mix: the call profiles are the ratings of today's set-stage search (`selectClues` of the unchanged source, `calibration` stream of each set), not the prototype's probe mix; PM3 (IGP-01, IGP-03) measures the real one. Window profiles are reported apart.
- Screen-capped means not certified: `scap0`, `scap1` and `over`. A useful rating is a complete canonical rating in band and not refused by AR1; it is lost at W when its screen is screen-capped.
- Misdirected: a screen-capped profile whose canonical rating is below the band is read as "too few clues" by P3, the wrong direction; one in band is a lost rating; one above the band, or a canonical cap, is not counted as misdirected (the direction is right or unknown).
- Cost ratio = sum of screen ms / sum of canonical ms over the profiles; net ratio = (sum of screen ms + sum of canonical ms of the lost useful ratings, each re-rated once) / sum of canonical ms; P2 saving = 1 / net ratio. Per useful rating: the same sums over the number of useful ratings (work = main + census work). Times come from the calls and screens invocations (four concurrent lanes), so ratios of sums carry timing noise.
- Where the losses lie: clue share = clues / K of the useful ratings lost against all useful ratings; the offset is the clue count less the set's start count (the share of K of `initialClueCount`).
- A boundary limit coinciding with another limit keeps both kinds and is rated once; a boundary limit at or above the canonical limit is dropped.
- Frozen: measured on the frozen source `3fc65f4` (task pack v4, V4-T04): the certificate re-proved on the cases of R14; the plan's `W` list (95, 190, 380 M) is unchanged.
