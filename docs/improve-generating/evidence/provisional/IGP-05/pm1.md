# IGP-05 PM1 tranche 1, reduced first slice

> **Provisional (pre-freeze).** Measured on rating-v3 runtime cd5d17f (worktree 0e1283e) (source digest 34cea386…, equal to MP12b1's source), not on the frozen post-MP17 source. Re-run: pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\IGP-05.json -Label frozen -SourceLabel <label> -LockHelper <path>.

Observations of a reduced diagnostic (two sets x two nested orders per cell): "none observed" is never "no window".

| Part | Status |
|---|---|
| windows | complete |
| scan | complete |
| failed-sets | complete |

## Part 1: windows of the cells without curves (Hell 1 on 215-484 cells, Hell 2, Hell 3)

Score-in-band ratings and AR1-eligible in-band ratings (Gproved >= 1) are counted apart.

| Cell | band | K (sets) | start counts | families | results | boundary counts (last complete / capped) | max score (gap to band) | in-band: ratings / families | eligible: ratings / families | ms per rating / per in-band | verdict |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 15x15b10-hell-1 | [77, 112) | 34, 34 | 3, 3 | 4 of 4 | boundary 4 | 12/11, 15/14, 13/12, 2/1 | 179.0 (-102.0) | 3 / 2 | 3 / 2 | 1227 / 16365 | in-band ratings observed: 3 (3 eligible) in 2 of 4 families |
| 16x16-hell-1 | [77, 112) | 34, 37 | 3, 4 | 4 of 4 | boundary 4 | 17/16, 13/12, 13/12, 13/12 | 106.0 (-29.0) | 3 / 2 | 3 / 2 | 1076 / 16138 | in-band ratings observed: 3 (3 eligible) in 2 of 4 families |
| 15x20-hell-1 | [77, 112) | 40, 39 | 4, 4 | 4 of 4 | boundary 4 | 16/15, 19/18, 16/15, 16/15 | 115.0 (-38.0) | 4 / 2 | 4 / 2 | 1064 / 11173 | in-band ratings observed: 4 (4 eligible) in 2 of 4 families |
| 18x18-hell-1 | [77, 112) | 39, 36 | 4, 4 | 4 of 4 | boundary 4 | 12/11, 17/16, 12/11, 12/11 | 107.0 (-30.0) | 6 / 2 | 6 / 2 | 881 / 6609 | in-band ratings observed: 6 (6 eligible) in 2 of 4 families |
| 18x20-hell-1 | [77, 112) | 37, 39 | 4, 4 | 4 of 4 | boundary 4 | 11/10, 11/10, 15/14, 13/12 | 95.0 (-18.0) | 6 / 3 | 6 / 3 | 802 / 6016 | in-band ratings observed: 6 (6 eligible) in 3 of 4 families |
| 20x20-hell-1 | [77, 112) | 40, 41 | 4, 4 | 4 of 4 | boundary 4 | 11/10, 14/13, 17/16, 16/15 | 108.0 (-31.0) | 11 / 4 | 11 / 4 | 903 / 3613 | in-band ratings observed: 11 (11 eligible) in 4 of 4 families |
| 20x21-hell-1 | [77, 112) | 40, 41 | 4, 4 | 4 of 4 | boundary 4 | 14/13, 17/16, 15/14, 15/14 | 88.0 (-11.0) | 3 / 1 | 3 / 1 | 658 / 9437 | in-band ratings observed: 3 (3 eligible) in 1 of 4 families |
| 32x15-hell-1 | [77, 112) | 39, 42 | 4, 4 | 4 of 4 | boundary 4 | 13/12, 11/10, 11/10, 12/11 | 102.0 (-25.0) | 6 / 3 | 6 / 3 | 911 / 6530 | in-band ratings observed: 6 (6 eligible) in 3 of 4 families |
| 22x22-hell-1 | [77, 112) | 40, 40 | 4, 4 | 4 of 4 | boundary 4 | 10/9, 13/12, 12/11, 11/10 | 92.0 (-15.0) | 5 / 3 | 5 / 3 | 651 / 5466 | in-band ratings observed: 5 (5 eligible) in 3 of 4 families |
| 15x20-hell-2 | [112, 162) | 52, 49 | 3, 3 | 4 of 4 | boundary 4 | 26/25, 27/26, 24/23, 23/22 | 103.0 (9.0) | 0 / 0 | 0 / 0 | 963 / - | none observed in 4 families |
| 18x18-hell-2 | [112, 162) | 52, 54 | 3, 3 | 4 of 4 | boundary 4 | 28/27, 24/23, 25/24, 27/26 | 106.0 (6.0) | 0 / 0 | 0 / 0 | 927 / - | none observed in 4 families |
| 18x20-hell-2 | [112, 162) | 55, 52 | 3, 3 | 4 of 4 | boundary 4 | 27/26, 26/25, 26/25, 29/28 | 115.0 (-3.0) | 1 / 1 | 1 / 1 | 979 / 41125 | in-band ratings observed: 1 (1 eligible) in 1 of 4 families |
| 20x20-hell-2 | [112, 162) | 55, 54 | 3, 3 | 4 of 4 | boundary 4 | 26/25, 26/25, 33/32, 28/27 | 110.0 (2.0) | 0 / 0 | 0 / 0 | 775 / - | none observed in 4 families |
| 20x21-hell-2 | [112, 162) | 58, 54 | 3, 3 | 4 of 4 | boundary 4 | 32/31, 33/32, 22/21, 28/27 | 116.0 (-4.0) | 1 / 1 | 1 / 1 | 1135 / 53336 | in-band ratings observed: 1 (1 eligible) in 1 of 4 families |
| 32x15-hell-2 | [112, 162) | 61, 59 | 4, 4 | 4 of 4 | boundary 4 | 32/31, 28/27, 29/28, 29/28 | 113.0 (-1.0) | 2 / 1 | 2 / 1 | 766 / 17232 | in-band ratings observed: 2 (2 eligible) in 1 of 4 families |
| 22x22-hell-2 | [112, 162) | 60, 57 | 4, 3 | 4 of 4 | boundary 4 | 35/34, 32/31, 30/29, 30/29 | 112.0 (0.0) | 1 / 1 | 1 / 1 | 652 / 27386 | in-band ratings observed: 1 (1 eligible) in 1 of 4 families |
| 24x24-hell-2 | [112, 162) | 59, 62 | 4, 4 | 4 of 4 | boundary 4 | 30/29, 24/23, 27/26, 30/29 | 119.0 (-7.0) | 1 / 1 | 1 / 1 | 1056 / 50682 | in-band ratings observed: 1 (1 eligible) in 1 of 4 families |
| 26x26-hell-2 | [112, 162) | 58, 62 | 3, 4 | 4 of 4 | boundary 4 | 19/18, 23/22, 28/27, 20/19 | 118.0 (-6.0) | 2 / 2 | 2 / 2 | 1042 / 27090 | in-band ratings observed: 2 (2 eligible) in 2 of 4 families |
| 32x15-hell-3 | [162, 235) | 74, 77 | 3, 3 | 4 of 4 | boundary 4 | 38/37, 43/42, 45/44, 45/44 | 78.0 (84.0) | 0 / 0 | 0 / 0 | 748 / - | none observed in 4 families |
| 22x22-hell-3 | [162, 235) | 74, 74 | 3, 3 | 4 of 4 | boundary 4 | 45/44, 42/41, 45/44, 41/40 | 115.0 (47.0) | 0 / 0 | 0 / 0 | 993 / - | none observed in 4 families |
| 24x24-hell-3 | [162, 235) | 83, 86 | 3, 3 | 4 of 4 | boundary 4 | 49/48, 49/48, 51/50, 45/44 | 103.0 (59.0) | 0 / 0 | 0 / 0 | 1068 / - | none observed in 4 families |
| 26x26-hell-3 | [162, 235) | 87, 80 | 3, 3 | 4 of 4 | boundary 4 | 54/53, 53/52, 48/47, 43/42 | 94.0 (68.0) | 0 / 0 | 0 / 0 | 956 / - | none observed in 4 families |

The gap is the band's lower edge less the highest score of a complete rating (positive: no score reached the band). A boundary pair is the lowest complete count and the capped count right below it.

### Pooled by level (first screen-limit inputs)

| Level | cells | families | ratings | in-band | eligible | in-band by offset (in band / eligible) | in-band main work above 95 / 190 / 380 M | eligible main work above 95 / 190 / 380 M |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| hell-1 | 9 | 36 | 389 | 47 | 47 | <0: 0/0, 0: 0/0, 1: 0/0, 2: 0/0, 3: 0/0, 4: 0/0, >4: 47/47 | 95 M: 39/47, 190 M: 30/47, 380 M: 16/47 | 95 M: 39/47, 190 M: 30/47, 380 M: 16/47 |
| hell-2 | 9 | 36 | 404 | 8 | 8 | <0: 0/0, 0: 0/0, 1: 0/0, 2: 0/0, 3: 0/0, 4: 0/0, >4: 8/8 | 95 M: 8/8, 190 M: 8/8, 380 M: 7/8 | 95 M: 8/8, 190 M: 8/8, 380 M: 7/8 |
| hell-3 | 4 | 16 | 201 | 0 | 0 | <0: 0/0, 0: 0/0, 1: 0/0, 2: 0/0, 3: 0/0, 4: 0/0, >4: 0/0 | 95 M: 0/0, 190 M: 0/0, 380 M: 0/0 | 95 M: 0/0, 190 M: 0/0, 380 M: 0/0 |

### Cells with in-band ratings: by offset from today's start count and main work above W

| Cell | ratings by offset: in band / eligible per bucket | in-band main work above 95 / 190 / 380 M (of n) | eligible main work above 95 / 190 / 380 M (of n) | in-band ratings: count (offset, score, eligible) |
|---|---:|---:|---:|---:|
| 15x15b10-hell-1 | <0: 0/0, 0: 0/0, 1: 0/0, 2: 0/0, 3: 0/0, 4: 0/0, >4: 3/3 | 95 M: 3/3, 190 M: 1/3, 380 M: 0/3 | 95 M: 3/3, 190 M: 1/3, 380 M: 0/3 | 12 (+9, 79.0, yes); 16 (+13, 79.0, yes); 15 (+12, 79.0, yes) |
| 16x16-hell-1 | <0: 0/0, 0: 0/0, 1: 0/0, 2: 0/0, 3: 0/0, 4: 0/0, >4: 3/3 | 95 M: 3/3, 190 M: 3/3, 380 M: 2/3 | 95 M: 3/3, 190 M: 3/3, 380 M: 2/3 | 13 (+9, 99.0, yes); 14 (+10, 92.0, yes); 13 (+9, 106.0, yes) |
| 15x20-hell-1 | <0: 0/0, 0: 0/0, 1: 0/0, 2: 0/0, 3: 0/0, 4: 0/0, >4: 4/4 | 95 M: 4/4, 190 M: 3/4, 380 M: 2/4 | 95 M: 4/4, 190 M: 3/4, 380 M: 2/4 | 16 (+12, 94.0, yes); 17 (+13, 82.0, yes); 19 (+15, 91.0, yes); 18 (+14, 109.0, yes) |
| 18x18-hell-1 | <0: 0/0, 0: 0/0, 1: 0/0, 2: 0/0, 3: 0/0, 4: 0/0, >4: 6/6 | 95 M: 5/6, 190 M: 3/6, 380 M: 3/6 | 95 M: 5/6, 190 M: 3/6, 380 M: 3/6 | 13 (+9, 87.0, yes); 12 (+8, 87.0, yes); 14 (+10, 80.0, yes); 12 (+8, 107.0, yes); 13 (+9, 83.0, yes); 14 (+10, 78.0, yes) |
| 18x20-hell-1 | <0: 0/0, 0: 0/0, 1: 0/0, 2: 0/0, 3: 0/0, 4: 0/0, >4: 6/6 | 95 M: 4/6, 190 M: 3/6, 380 M: 0/6 | 95 M: 4/6, 190 M: 3/6, 380 M: 0/6 | 11 (+7, 95.0, yes); 11 (+7, 84.0, yes); 12 (+8, 78.0, yes); 15 (+11, 78.0, yes); 13 (+9, 87.0, yes); 14 (+10, 78.0, yes) |
| 20x20-hell-1 | <0: 0/0, 0: 0/0, 1: 0/0, 2: 0/0, 3: 0/0, 4: 0/0, >4: 11/11 | 95 M: 7/11, 190 M: 6/11, 380 M: 2/11 | 95 M: 7/11, 190 M: 6/11, 380 M: 2/11 | 12 (+8, 99.0, yes); 11 (+7, 108.0, yes); 13 (+9, 99.0, yes); 14 (+10, 91.0, yes); 15 (+11, 77.0, yes); 14 (+10, 94.0, yes); 15 (+11, 81.0, yes); 17 (+13, 97.0, yes); 18 (+14, 83.0, yes); 16 (+12, 100.0, yes); 18 (+14, 78.0, yes) |
| 20x21-hell-1 | <0: 0/0, 0: 0/0, 1: 0/0, 2: 0/0, 3: 0/0, 4: 0/0, >4: 3/3 | 95 M: 2/3, 190 M: 2/3, 380 M: 2/3 | 95 M: 2/3, 190 M: 2/3, 380 M: 2/3 | 17 (+13, 86.0, yes); 15 (+11, 88.0, yes); 16 (+12, 88.0, yes) |
| 32x15-hell-1 | <0: 0/0, 0: 0/0, 1: 0/0, 2: 0/0, 3: 0/0, 4: 0/0, >4: 6/6 | 95 M: 6/6, 190 M: 4/6, 380 M: 3/6 | 95 M: 6/6, 190 M: 4/6, 380 M: 3/6 | 11 (+7, 99.0, yes); 12 (+8, 99.0, yes); 13 (+9, 90.0, yes); 14 (+10, 90.0, yes); 11 (+7, 102.0, yes); 12 (+8, 89.0, yes) |
| 22x22-hell-1 | <0: 0/0, 0: 0/0, 1: 0/0, 2: 0/0, 3: 0/0, 4: 0/0, >4: 5/5 | 95 M: 5/5, 190 M: 5/5, 380 M: 2/5 | 95 M: 5/5, 190 M: 5/5, 380 M: 2/5 | 10 (+6, 92.0, yes); 11 (+7, 92.0, yes); 14 (+10, 91.0, yes); 13 (+9, 91.0, yes); 11 (+7, 83.0, yes) |
| 18x20-hell-2 | <0: 0/0, 0: 0/0, 1: 0/0, 2: 0/0, 3: 0/0, 4: 0/0, >4: 1/1 | 95 M: 1/1, 190 M: 1/1, 380 M: 1/1 | 95 M: 1/1, 190 M: 1/1, 380 M: 1/1 | 27 (+24, 115.0, yes) |
| 20x21-hell-2 | <0: 0/0, 0: 0/0, 1: 0/0, 2: 0/0, 3: 0/0, 4: 0/0, >4: 1/1 | 95 M: 1/1, 190 M: 1/1, 380 M: 0/1 | 95 M: 1/1, 190 M: 1/1, 380 M: 0/1 | 22 (+19, 116.0, yes) |
| 32x15-hell-2 | <0: 0/0, 0: 0/0, 1: 0/0, 2: 0/0, 3: 0/0, 4: 0/0, >4: 2/2 | 95 M: 2/2, 190 M: 2/2, 380 M: 2/2 | 95 M: 2/2, 190 M: 2/2, 380 M: 2/2 | 33 (+29, 113.0, yes); 32 (+28, 113.0, yes) |
| 22x22-hell-2 | <0: 0/0, 0: 0/0, 1: 0/0, 2: 0/0, 3: 0/0, 4: 0/0, >4: 1/1 | 95 M: 1/1, 190 M: 1/1, 380 M: 1/1 | 95 M: 1/1, 190 M: 1/1, 380 M: 1/1 | 32 (+28, 112.0, yes) |
| 24x24-hell-2 | <0: 0/0, 0: 0/0, 1: 0/0, 2: 0/0, 3: 0/0, 4: 0/0, >4: 1/1 | 95 M: 1/1, 190 M: 1/1, 380 M: 1/1 | 95 M: 1/1, 190 M: 1/1, 380 M: 1/1 | 24 (+20, 119.0, yes) |
| 26x26-hell-2 | <0: 0/0, 0: 0/0, 1: 0/0, 2: 0/0, 3: 0/0, 4: 0/0, >4: 2/2 | 95 M: 2/2, 190 M: 2/2, 380 M: 2/2 | 95 M: 2/2, 190 M: 2/2, 380 M: 2/2 | 19 (+16, 112.0, yes); 23 (+20, 118.0, yes) |

## Part 2: fine counts with nested orders (three Nightmare cells)

### 14x14-nightmare

Level nightmare, band [53, 77); families 4 of 4 (results: three-capped 4); sets K 21, 24, start counts 3.

**Start-count capped share (R29):** 2 of 2 families that rated their start count (100 %), MP12b1 89 %. 2 families stopped after three consecutive capped counts above their start count (not rated, not inferred; if all were capped the share would be 100 %); 0 had a start count above K - 8 (outside the scanned counts).

In-band ratings 5 (5 eligible) of 50. Window counts (in-band share above zero): 5 (offset 2, in band 50 %, eligible 50 %); 7 (offset 4, in band 25 %, eligible 25 %); 8 (offset 5, in band 50 %, eligible 50 %).

| count | offset | n | score median [min-max] | capped | in band | eligible | work to first solution (median) | count tail (median) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | -2 | 1 | - | 100 % | 0 % | 0 % | - | - |
| 2 | -1 | 2 | - | 100 % | 0 % | 0 % | - | - |
| 3 | 0 | 2 | - | 100 % | 0 % | 0 % | - | - |
| 4 | 1 | 3 | 81.0 [81.0-81.0] | 67 % | 0 % | 0 % | 23.6 M | 1.1 M |
| 5 | 2 | 4 | 63.5 [63.0-64.0] | 50 % | 50 % | 50 % | 89.4 M | 1.0 M |
| 6 | 3 | 4 | 50.0 [49.0-51.0] | 50 % | 0 % | 0 % | 18.6 M | 5.2 M |
| 7 | 4 | 4 | 44.0 [36.0-75.0] | 25 % | 25 % | 25 % | 3.0 M | 0.2 M |
| 8 | 5 | 4 | 49.5 [30.0-68.0] | 0 % | 50 % | 50 % | 9.6 M | 0.2 M |
| 9 | 6 | 4 | 35.5 [15.0-49.0] | 0 % | 0 % | 0 % | 1.3 M | 0.2 M |
| 10 | 7 | 4 | 27.0 [15.0-49.0] | 0 % | 0 % | 0 % | 1.0 M | 0.1 M |
| 11 | 8 | 4 | 19.0 [12.0-37.0] | 0 % | 0 % | 0 % | 1.1 M | 0.1 M |
| 12 | 9 | 4 | 15.5 [11.0-24.0] | 0 % | 0 % | 0 % | 0.5 M | 0.1 M |
| 13 | 10 | 4 | 13.5 [12.0-14.0] | 0 % | 0 % | 0 % | 0.1 M | 0.0 M |
| 14 | 11 | 2 | 14.0 [14.0-14.0] | 0 % | 0 % | 0 % | 0.0 M | 0.0 M |
| 15 | 12 | 2 | 13.0 [13.0-13.0] | 0 % | 0 % | 0 % | 0.0 M | 0.0 M |
| 16 | 13 | 2 | 12.0 [11.0-13.0] | 0 % | 0 % | 0 % | 0.0 M | 0.0 M |

Ratings by offset from today's start count, beside PM4's profiles of the same cell (IGP-02: today's call profiles and window subsets):

| Offset | PM1 ratings | PM1 in band | PM1 eligible | PM1 eligible share | PM4 profiles | PM4 useful | PM4 useful share |
|---|---:|---:|---:|---:|---:|---:|---:|
| <0 | 3 | 0 | 0 | 0 % | 0 | 0 | - |
| 0 | 2 | 0 | 0 | 0 % | 78 | 0 | 0 % |
| 1 | 3 | 0 | 0 | 0 % | 12 | 0 | 0 % |
| 2 | 4 | 2 | 2 | 50 % | 12 | 0 | 0 % |
| 3 | 4 | 0 | 0 | 0 % | 12 | 4 | 33 % |
| 4 | 4 | 1 | 1 | 25 % | 12 | 4 | 33 % |
| >4 | 30 | 2 | 2 | 7 % | 0 | 0 | - |

In-band main work above 95 / 190 / 380 M: 95 M: 1/5, 190 M: 0/5, 380 M: 0/5; eligible: 95 M: 1/5, 190 M: 0/5, 380 M: 0/5.

### 12x12-nightmare

Level nightmare, band [53, 77); families 4 of 4 (results: three-capped 3, all-counts 1); sets K 20, 22, start counts 3.

**Start-count capped share (R29):** 4 of 4 families that rated their start count (100 %), MP12b1 53 %. 0 families stopped after three consecutive capped counts above their start count (not rated, not inferred; if all were capped the share would be 100 %); 0 had a start count above K - 8 (outside the scanned counts).

In-band ratings 7 (7 eligible) of 49. Window counts (in-band share above zero): 5 (offset 2, in band 25 %, eligible 25 %); 6 (offset 3, in band 25 %, eligible 25 %); 8 (offset 5, in band 50 %, eligible 50 %); 9 (offset 6, in band 50 %, eligible 50 %); 10 (offset 7, in band 25 %, eligible 25 %).

| count | offset | n | score median [min-max] | capped | in band | eligible | work to first solution (median) | count tail (median) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | -2 | 2 | 129.0 [129.0-129.0] | 50 % | 0 % | 0 % | 483.6 M | 276.5 M |
| 2 | -1 | 3 | 97.0 [97.0-97.0] | 67 % | 0 % | 0 % | 525.1 M | 235.0 M |
| 3 | 0 | 4 | - | 100 % | 0 % | 0 % | - | - |
| 4 | 1 | 4 | 95.5 [86.0-105.0] | 50 % | 0 % | 0 % | 208.8 M | 316.7 M |
| 5 | 2 | 4 | 83.0 [63.0-90.0] | 25 % | 25 % | 25 % | 118.5 M | 133.7 M |
| 6 | 3 | 4 | 83.0 [63.0-97.0] | 25 % | 25 % | 25 % | 212.7 M | 19.4 M |
| 7 | 4 | 4 | 46.5 [43.0-50.0] | 50 % | 0 % | 0 % | 25.0 M | 0.6 M |
| 8 | 5 | 4 | 50.5 [30.0-69.0] | 0 % | 50 % | 50 % | 26.4 M | 0.6 M |
| 9 | 6 | 4 | 46.5 [20.0-64.0] | 0 % | 50 % | 50 % | 8.5 M | 0.1 M |
| 10 | 7 | 4 | 43.0 [20.0-62.0] | 0 % | 25 % | 25 % | 4.0 M | 0.1 M |
| 11 | 8 | 4 | 22.5 [14.0-35.0] | 0 % | 0 % | 0 % | 0.4 M | 0.0 M |
| 12 | 9 | 4 | 22.5 [13.0-35.0] | 0 % | 0 % | 0 % | 0.4 M | 0.0 M |
| 13 | 10 | 2 | 27.0 [25.0-29.0] | 0 % | 0 % | 0 % | 0.5 M | 0.3 M |
| 14 | 11 | 2 | 18.5 [18.0-19.0] | 0 % | 0 % | 0 % | 0.1 M | 0.0 M |

Ratings by offset from today's start count, beside PM4's profiles of the same cell (IGP-02: today's call profiles and window subsets):

| Offset | PM1 ratings | PM1 in band | PM1 eligible | PM1 eligible share | PM4 profiles | PM4 useful | PM4 useful share |
|---|---:|---:|---:|---:|---:|---:|---:|
| <0 | 5 | 0 | 0 | 0 % | 2 | 0 | 0 % |
| 0 | 4 | 0 | 0 | 0 % | 29 | 2 | 7 % |
| 1 | 4 | 0 | 0 | 0 % | 23 | 7 | 30 % |
| 2 | 4 | 1 | 1 | 25 % | 16 | 6 | 38 % |
| 3 | 4 | 1 | 1 | 25 % | 16 | 7 | 44 % |
| 4 | 4 | 0 | 0 | 0 % | 12 | 8 | 67 % |
| >4 | 24 | 5 | 5 | 21 % | 0 | 0 | - |

In-band main work above 95 / 190 / 380 M: 95 M: 4/7, 190 M: 4/7, 380 M: 1/7; eligible: 95 M: 4/7, 190 M: 4/7, 380 M: 1/7.

### 26x26-nightmare

Level nightmare, band [53, 77); families 4 of 4 (results: all-counts 4); sets K 31, 31, start counts 4.

**Start-count capped share (R29):** 0 of 4 families that rated their start count (0 %), MP12b1 10 %. 0 families stopped after three consecutive capped counts above their start count (not rated, not inferred; if all were capped the share would be 0 %); 0 had a start count above K - 8 (outside the scanned counts).

In-band ratings 11 (11 eligible) of 92. Window counts (in-band share above zero): 4 (offset 0, in band 25 %, eligible 25 %); 5 (offset 1, in band 75 %, eligible 75 %); 6 (offset 2, in band 100 %, eligible 100 %); 7 (offset 3, in band 50 %, eligible 50 %); 8 (offset 4, in band 25 %, eligible 25 %).

| count | offset | n | score median [min-max] | capped | in band | eligible | work to first solution (median) | count tail (median) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | -3 | 4 | 106.0 [100.0-112.0] | 50 % | 0 % | 0 % | 653.5 M | 4.8 M |
| 2 | -2 | 4 | 97.5 [82.0-100.0] | 0 % | 0 % | 0 % | 493.5 M | 13.8 M |
| 3 | -1 | 4 | 94.5 [82.0-101.0] | 0 % | 0 % | 0 % | 360.5 M | 13.2 M |
| 4 | 0 | 4 | 87.0 [74.0-101.0] | 0 % | 25 % | 25 % | 210.4 M | 18.8 M |
| 5 | 1 | 4 | 74.0 [58.0-84.0] | 0 % | 75 % | 75 % | 64.3 M | 7.3 M |
| 6 | 2 | 4 | 60.5 [58.0-69.0] | 0 % | 100 % | 100 % | 79.9 M | 5.7 M |
| 7 | 3 | 4 | 54.5 [27.0-64.0] | 0 % | 50 % | 50 % | 50.5 M | 3.3 M |
| 8 | 4 | 4 | 32.5 [27.0-57.0] | 0 % | 25 % | 25 % | 26.6 M | 2.3 M |
| 9 | 5 | 4 | 26.0 [21.0-43.0] | 0 % | 0 % | 0 % | 15.9 M | 1.9 M |
| 10 | 6 | 4 | 24.5 [21.0-27.0] | 0 % | 0 % | 0 % | 9.9 M | 1.6 M |
| 11 | 7 | 4 | 23.0 [18.0-27.0] | 0 % | 0 % | 0 % | 6.3 M | 1.1 M |
| 12 | 8 | 4 | 17.0 [14.0-27.0] | 0 % | 0 % | 0 % | 2.3 M | 0.7 M |
| 13 | 9 | 4 | 17.0 [12.0-27.0] | 0 % | 0 % | 0 % | 1.5 M | 0.6 M |
| 14 | 10 | 4 | 16.0 [12.0-27.0] | 0 % | 0 % | 0 % | 0.9 M | 0.5 M |
| 15 | 11 | 4 | 16.0 [12.0-27.0] | 0 % | 0 % | 0 % | 0.6 M | 0.5 M |
| 16 | 12 | 4 | 16.0 [12.0-20.0] | 0 % | 0 % | 0 % | 0.3 M | 0.3 M |
| 17 | 13 | 4 | 16.0 [12.0-20.0] | 0 % | 0 % | 0 % | 0.2 M | 0.3 M |
| 18 | 14 | 4 | 12.0 [12.0-20.0] | 0 % | 0 % | 0 % | 0.0 M | 0.0 M |
| 19 | 15 | 4 | 12.0 [12.0-20.0] | 0 % | 0 % | 0 % | 0.0 M | 0.0 M |
| 20 | 16 | 4 | 12.0 [12.0-12.0] | 0 % | 0 % | 0 % | 0.0 M | 0.0 M |
| 21 | 17 | 4 | 12.0 [12.0-12.0] | 0 % | 0 % | 0 % | 0.0 M | 0.0 M |
| 22 | 18 | 4 | 11.0 [11.0-11.0] | 0 % | 0 % | 0 % | 0.0 M | 0.0 M |
| 23 | 19 | 4 | 11.0 [11.0-11.0] | 0 % | 0 % | 0 % | 0.0 M | 0.0 M |

Ratings by offset from today's start count, beside PM4's profiles of the same cell (IGP-02: today's call profiles and window subsets):

| Offset | PM1 ratings | PM1 in band | PM1 eligible | PM1 eligible share | PM4 profiles | PM4 useful | PM4 useful share |
|---|---:|---:|---:|---:|---:|---:|---:|
| <0 | 12 | 0 | 0 | 0 % | 1 | 1 | 100 % |
| 0 | 4 | 1 | 1 | 25 % | 15 | 5 | 33 % |
| 1 | 4 | 3 | 3 | 75 % | 14 | 8 | 57 % |
| 2 | 4 | 4 | 4 | 100 % | 12 | 2 | 17 % |
| 3 | 4 | 2 | 2 | 50 % | 12 | 1 | 8 % |
| 4 | 4 | 1 | 1 | 25 % | 12 | 1 | 8 % |
| >4 | 60 | 0 | 0 | 0 % | 0 | 0 | - |

In-band main work above 95 / 190 / 380 M: 95 M: 4/11, 190 M: 0/11, 380 M: 0/11; eligible: 95 M: 4/11, 190 M: 0/11, 380 M: 0/11.

## Part 3: failed-set populations of Hell 1

### 14x14-hell-1

Calls that made a puzzle: 0 of 4. Failure classes: dead-end 4. Families of the failed sets: 87 ratings, in band 7 (7 eligible).

| Set | K | start | call | profiles | start-count profiles (n / capped / refused) | in-band profiles (eligible) | failure class | families | family results | in-band offsets of its families (order: count, offset, eligible) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0 | 32 | 3 | no puzzle (not-in-band) | 20 | 20 / 20 / 0 | 0 (0) | dead-end | 2 | boundary, boundary | o0: 11 (+8, yes); o0: 13 (+10, yes); o0: 14 (+11, yes) |
| 1 | 34 | 3 | no puzzle (not-in-band) | 20 | 20 / 20 / 0 | 0 (0) | dead-end | 2 | boundary, boundary | o0: 12 (+9, yes) |
| 2 | 32 | 3 | no puzzle (not-in-band) | 20 | 20 / 20 / 0 | 0 (0) | dead-end | 2 | boundary, boundary | o0: 12 (+9, yes) |
| 3 | 34 | 3 | no puzzle (not-in-band) | 20 | 20 / 20 / 0 | 0 (0) | dead-end | 2 | boundary, boundary | o0: 14 (+11, yes); o1: 14 (+11, yes) |

Family ratings by offset (in band / eligible): <0: 0/0, 0: 0/0, 1: 0/0, 2: 0/0, 3: 0/0, 4: 0/0, >4: 7/7. Main work above 95 / 190 / 380 M: in band 95 M: 7/7, 190 M: 6/7, 380 M: 6/7; eligible 95 M: 7/7, 190 M: 6/7, 380 M: 6/7.

### 24x24-hell-1

Calls that made a puzzle: 0 of 4. Failure classes: dead-end 4. Families of the failed sets: 90 ratings, in band 8 (8 eligible).

| Set | K | start | call | profiles | start-count profiles (n / capped / refused) | in-band profiles (eligible) | failure class | families | family results | in-band offsets of its families (order: count, offset, eligible) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0 | 42 | 4 | no puzzle (not-in-band) | 20 | 20 / 20 / 0 | 0 (0) | dead-end | 2 | boundary, boundary | o0: 11 (+7, yes); o0: 12 (+8, yes); o0: 13 (+9, yes) |
| 1 | 42 | 4 | no puzzle (not-in-band) | 20 | 20 / 20 / 0 | 0 (0) | dead-end | 2 | boundary, boundary | none observed |
| 2 | 39 | 4 | no puzzle (not-in-band) | 20 | 20 / 20 / 0 | 0 (0) | dead-end | 2 | boundary, boundary | o0: 8 (+4, yes); o1: 6 (+2, yes) |
| 3 | 42 | 4 | no puzzle (not-in-band) | 20 | 20 / 20 / 0 | 0 (0) | dead-end | 2 | boundary, boundary | o0: 12 (+8, yes); o0: 11 (+7, yes); o1: 9 (+5, yes) |

Family ratings by offset (in band / eligible): <0: 0/0, 0: 0/0, 1: 0/0, 2: 1/1, 3: 0/0, 4: 1/1, >4: 6/6. Main work above 95 / 190 / 380 M: in band 95 M: 8/8, 190 M: 6/8, 380 M: 5/8; eligible 95 M: 8/8, 190 M: 6/8, 380 M: 5/8.

## Discoveries

In-band ratings saved with their full inputs (`discoveries.jsonl`): 93 (part 1: 55, part 2: 23, part 3: 15).

## Not reached (budget)

Nothing: every family and call of the three parts ran.

## Limitations

- Part 1 is a reduced diagnostic: per cell two sets and two nested orders, one boundary search from the cheap side and a short scan next to the cap. Non-monotone windows (a window below a capped count, or between two complete counts that are far apart) can be missed, so a cell without an in-band rating is "none observed", never "no window".
- A family whose cheap-side counts K - 8, K - 4 and K - 2 were all capped ("capped-at-cheap-side") shows nothing about the counts below them; the cap there is recorded as a limitation of the diagnostic.
- A family that ended "no-cap" rated every count its doubling reached as complete down to count 1 or to the clamp; its scan next to the cap is not run.
- Part 2 stops a family after three consecutive capped counts, so counts below the stop (the start count of 14x14 and 12x12 Nightmare among them) are not rated; the start-count capped share is given for the families that rated it, and the families whose scan stopped above it are counted apart, never inferred capped.
- Part 3 uses four sets per cell and two orders per failed set; a call cut at the invocation deadline is recorded as censored with its profiles.
- Every number is provisional (pre-freeze): the rating-v3 runtime of this worktree on the instr tree (diagnostic offers, D-IG13), not the frozen post-MP17 source.
- Times (ms per rating) come from four concurrent lanes on a 16-logical-core machine, shared with difficulty-v3 only by the lock protocol.

## The later round (D-IG10)

The rest of tranche 1 (D-IG10): per cell 10 sets x 3 layouts (the witness and two walked layouts) x 2 orders in part 1, with full count scans; the same scope on the three Nightmare cells of part 2; 20 sets per cell in part 3. Tranche 2 (walked layouts on further cells, the held-out window audit) comes after it if tranche 1 leaves P4 or P1 undecided. About 9 worker-hours, 2.5 hours on four lanes; it needs the owner's approval.
