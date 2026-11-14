# Improve generating (Pentomino): speed before and after, summary (SA1, claude-opus-5.5)

Estimates only, from committed evidence at `cd5d17f` (MP12b1's aggregate and reports); no run was made. Details,
formulas and sources: [1-analysis.md](1-analysis.md) §2 and §5. Current = Measured (Node, 4 workers, EPYC 7763).
Projections = likely [best - worst]. Times are seconds: T10 median / p95; "ten" = requests with ten puzzles of 20.

## 1. Area band x level

| Cell (cells) | Now: T1 / T10 med / p95; ten | After P1-P3 | After P1-P5 | After P1-P8 | Node 60 / 115 / 120 after P1-P5 | Browser (5 s + 4 x Node) after P1-P8 | Hell offerability |
|---|---|---|---|---|---|---|---|
| Master 60 - 100 (3 cells) | 0.3 - 1.7 / 1.2 - 9.0 / 1.7 - 16.4; 20 | about the same | about the same | 0.5 - 3.4 / 0.7 - 6.3 | meets | meets (7 - 19 / 8 - 30) | |
| Master 144 - 324 (6 cells) | 0.4 - 1.0 / 2.6 - 6.0 / 6.8 - 18.4; 20 | about the same | about the same | 1.0 - 2.2 / 2.7 - 6.9 | meets | meets (9 - 14 / 16 - 33) | |
| Master 360 - 676 (7 cells) | 0.4 - 1.3 / 3.4 - 8.4 / 5.3 - 16.6; 20 | about the same | about the same | 1.3 - 3.2 / 2.0 - 6.3 | meets | meets (10 - 18 / 13 - 30) | |
| Nightmare 3x29 (87) | 0.9 / 5.3 / 7.6; 20 | 5.3 / 7.6 | 5.3 / 7.6 | 2.5 / 5.4 | meets | meets (15 / 27) | |
| Nightmare 10x10 (100) | 5.1 / 24.0 / 68.4; 19 | 23 / 50 | 19 / 43 [14 - 24] | 9.4 / 21 [4.0 - 17] | meets | meets (42 / 87) | |
| Nightmare 12x12 (144) | 13.9 / 62.1 / 176.1; 17 | 43 / 95 | 39 / 86 [24 - 62] | 19 / 42 [6.8 - 45] | meets (borderline worst case) | fails (82 / 175) | |
| Nightmare 14x14 (196) | 43.1 / 113.0 / 151.6; 11 | 17 / 36 | 14 / 31 [8.5 - 33] | 7.0 / 15 [2.4 - 25] | meets | meets (33 / 67) | |
| Nightmare 15x15b10 (215) | 43.2 / 86.2 / 141.6; 11 | 15 / 32 | 12 / 27 | 6.1 / 13 | meets | meets (30 / 59) | |
| Nightmare 16x16 (256) | 20.0 / 79.8 / 135.4; 15 | 16 / 35 | 14 / 30 | 6.8 / 15 | meets | meets (32 / 65) | |
| Nightmare 15x20 (300) | 15.8 / 40.1 / 111.2; 15 | 17 / 37 | 14 / 31 | 7.2 / 16 | meets | meets (34 / 68) | |
| Nightmare 18x18 (324) | 8.6 / 37.3 / 134.5; 20 | 16 / 34 | 13 / 29 | 6.6 / 14 | meets | meets (31 / 63) | |
| Nightmare 360 - 676 (7 cells) | 3.2 - 5.6 / 11.6 - 24.2 / 31.4 - 114.0; 19 - 20 | 12 - 18 / 26 - 37 | 11 - 16 / 25 - 31 | 5.5 - 7.7 / 12 - 17 | meets | meets (27 - 36 / 53 - 72) | |
| Hell 1 14x14 (196) | 81.8 / none / max 229; 0 (5 puzzles) | 127 [67 - 280] | 111 [59 - 261] | 55 [17 - 195] | fails | fails (about 225) | not offerable (likely) |
| Hell 1 215 - 484 (9 cells) | no set in 3 requests each | unknown | unknown (between the 196 and 576 rows) | unknown | PM1 | | PM1 |
| Hell 1 24x24 (576) | 78.8 / none / max 211; 0 (13 puzzles) | 56 [30 - 127] | 49 [25 - 115] | 24 [7.3 - 86] | median meets, p95 near the stop | fails (about 100); meets only in the best case | likely by D39 (Node) |
| Hell 1 26x26 (676) | 44.8 / 108.7 / 167.6; 9 | 55 [29 - 124] | 48 [25 - 113] | 24 [7.1 - 85] | median meets, p95 near the stop | fails (about 100); meets only in the best case | likely by D39 (Node) |
| Hell 2 (9 cells), Hell 3 (4 cells) | no set; every request at the 115 s stop | unknown | no-window requests end in about 10 - 30 s | unknown | PM1 | | PM1; packs (P10) |

## 2. Plan phases, cumulative (T10 median, likely, Node)

| Cell | Now | Phase 1: P6, P8 (8 workers), P7 | Phase 2: + P1 - P5 |
|---|---|---|---|
| 14x14 Nightmare | 113.0 | about 61 | 7.0 |
| 16x16 Nightmare | 79.8 | about 41 | 6.8 |
| 12x12 Nightmare | 62.1 | about 32 | 19 |
| 26x26 Nightmare | 18.6 | about 9.7 | 7.7 |
| 26x26 Hell 1 | 108.7 (9 / 20 with ten) | about 59 | 24 |
| Master (16 cells) | 1.2 - 9.0 | 0.5 - 3.4 | 0.5 - 3.4 |

## 3. Availability

| Cells | Ten of 20 now | After P1 - P5 (Node) | Offer |
|---|---|---|---|
| Nightmare 12x12, 14x14, 15x15b10, 16x16, 15x20 | 17, 11, 11, 15, 15 | about 19 - 20 | offered today; would meet the bench in Node; browser fails only 12x12 (after P1 - P8) |
| Nightmare, other 10 cells | 19 - 20 | 19 - 20 | unchanged |
| Hell 1 24x24, 26x26 | 0, 9 | about 17 - 19 | likely by D39 in Node; browser needs the best case |
| Hell 1 14x14 | 0 | about 6 - 12 | no |
| Hell 1 215 - 484, Hell 2, Hell 3 | 0 (no set) | unknown | PM1; packs for reachable but slow cells |
| Requests over 120 s | 70 of 1,726 (43 Nightmare, 27 Hell 1) | about none at Nightmare; a few at Hell 1 if offered | |

Main assumptions: per-call cost rebuilt from the measured count curves (in-band ratings at the median accepted work,
0.37 - 0.56 s on 196 - 676 cells, 0.8 / 1.5 s on 10x10 / 12x12, 1.1 s for Hell 1 on 24x24 / 26x26, 2.7 s on 14x14);
4 window profiles and 6 locate profiles (1.5 with the prior); a screen-capped profile 0.6 s (`W_screen` about 190 M); P6
1.1x, P7 1.3x, P8 1.6x on the batch (8 workers on 16 threads). The browser column applies the design's planning rule.
