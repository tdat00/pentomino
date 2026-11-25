# Stage 4 at the stage-2 measured times (SA-Opus scratch, round 1)

Computed by `s4-cost.mjs`: T11a's `expandMatrix` (controls by `controlsFrom`, both conditional Hell 1 boards activated) and
T11b's `simulateRows`, with each row's time from the stage-2 pilot mean response of the arm that the freeze proposal
gives the twin (plus the measured per-row overhead) where the cell was piloted, else T11b's `refS` x the stage-1 factor
without the 1.25 projection factor. An estimate beside the formal guard, never a price.

Per-row overhead (median over V4-S2's 33 row steps): 0.94 s. Stage-1 factor: 1.0236.
The four P-1 passes: 1143 node s (the mean of V4-S2's six passing fr-* passes, times four).

| Plan | Rows | Invocations | Node s | Counted min at a 15-s quiet | Counted min at a 45-s quiet |
|---|---:|---:|---:|---:|---:|
| V4-S4 | 1120 | 91 | 26734 | 468.3 | 513.8 |
| V4-S4C | 380 | 26 | 9800 | 169.8 | 182.8 |

The supplementary pilot of question Q3 (fr-none on 8 controls, reps 0 to 4): formal (T11b's projection, a 45-s quiet) 22.6 counted min, guard 28.2; realistic (refS x factor) 16.0 at a 15-s quiet, 20.0 at 45 s, in 8 invocations.

| Group | Collection | Arm (assumed) | Rows | Row limit | Row s | Source | Node s | Invocations |
|---|---|---|---:|---:|---:|---|---:|---:|
| V4-S4/fr-frozen/val-14x14-nightmare | initial | fr-frozen | 20 | 130 | 10.0 | fr-screen pilot mean | 201 | 1 |
| V4-S4/fr-frozen-none/val-14x14-nightmare | initial | fr-frozen-none | 20 | 130 | 24.0 | fr-none pilot mean | 481 | 1 |
| V4-S4/fr-frozen/val-15x15b10-nightmare | initial | fr-frozen | 20 | 130 | 10.7 | fr-screen pilot mean | 217 | 1 |
| V4-S4/fr-frozen-none/val-15x15b10-nightmare | initial | fr-frozen-none | 20 | 130 | 24.3 | fr-none pilot mean | 489 | 1 |
| V4-S4/fr-frozen/val-12x12-nightmare | initial | fr-frozen | 20 | 130 | 16.5 | fr-none pilot mean | 332 | 1 |
| V4-S4/fr-frozen-none/val-12x12-nightmare | initial | fr-frozen-none | 20 | 130 | 16.5 | fr-none pilot mean | 332 | 1 |
| V4-S4/fr-frozen/val-16x16-nightmare | initial | fr-frozen | 20 | 130 | 10.1 | fr-screen pilot mean | 204 | 1 |
| V4-S4/fr-frozen-none/val-16x16-nightmare | initial | fr-frozen-none | 20 | 130 | 21.1 | fr-none pilot mean | 424 | 1 |
| V4-S4/fr-frozen/val-15x20-nightmare | initial | fr-frozen | 20 | 130 | 17.2 | fr-none pilot mean | 346 | 1 |
| V4-S4/fr-frozen-none/val-15x20-nightmare | initial | fr-frozen-none | 20 | 130 | 17.2 | fr-none pilot mean | 346 | 1 |
| V4-S4/fr-frozen/val-26x26-hell-1 | initial | fr-frozen | 20 | 130 | 33.0 | fr-ps pilot mean | 663 | 1 |
| V4-S4/fr-frozen-none/val-26x26-hell-1 | initial | fr-frozen-none | 20 | 130 | 33.0 | fr-ps pilot mean | 663 | 1 |
| V4-S4/fr-frozen/val-20x20-hell-1 | initial | fr-frozen | 20 | 130 | 37.0 | fr-ps pilot mean | 741 | 1 |
| V4-S4/fr-frozen-none/val-20x20-hell-1 | initial | fr-frozen-none | 20 | 130 | 37.0 | fr-ps pilot mean | 741 | 1 |
| V4-S4/fr-frozen/val-3x29-nightmare | initial | fr-frozen | 20 | 130 | 6.5 | MP12b1 refS x factor | 132 | 1 |
| V4-S4/fr-frozen-none/val-3x29-nightmare | initial | fr-frozen-none | 20 | 130 | 6.5 | MP12b1 refS x factor | 132 | 1 |
| V4-S4/log-link/val-3x29-nightmare | initial | log-link | 20 | 260 | 6.5 | MP12b1 refS x factor | 132 | 1 |
| V4-S4/fr-frozen/val-10x10-nightmare | initial | fr-frozen | 20 | 130 | 19.8 | fr-none pilot mean | 397 | 1 |
| V4-S4/fr-frozen-none/val-10x10-nightmare | initial | fr-frozen-none | 20 | 130 | 19.8 | fr-none pilot mean | 397 | 1 |
| V4-S4/log-link/val-10x10-nightmare | initial | log-link | 20 | 260 | 26.0 | MP12b1 refS x factor | 521 | 1 |
| V4-S4/fr-frozen/val-18x18-nightmare | initial | fr-frozen | 20 | 130 | 39.2 | MP12b1 refS x factor | 789 | 2 |
| V4-S4/fr-frozen-none/val-18x18-nightmare | initial | fr-frozen-none | 20 | 130 | 39.2 | MP12b1 refS x factor | 789 | 2 |
| V4-S4/log-link/val-18x18-nightmare | initial | log-link | 20 | 260 | 39.2 | MP12b1 refS x factor | 789 | 2 |
| V4-S4/fr-frozen/val-18x20-nightmare | initial | fr-frozen | 20 | 130 | 18.3 | MP12b1 refS x factor | 368 | 1 |
| V4-S4/fr-frozen-none/val-18x20-nightmare | initial | fr-frozen-none | 20 | 130 | 18.3 | MP12b1 refS x factor | 368 | 1 |
| V4-S4/log-link/val-18x20-nightmare | initial | log-link | 20 | 260 | 18.3 | MP12b1 refS x factor | 368 | 1 |
| V4-S4/fr-frozen/val-20x20-nightmare | initial | fr-frozen | 20 | 130 | 22.5 | MP12b1 refS x factor | 451 | 1 |
| V4-S4/fr-frozen-none/val-20x20-nightmare | initial | fr-frozen-none | 20 | 130 | 22.5 | MP12b1 refS x factor | 451 | 1 |
| V4-S4/log-link/val-20x20-nightmare | initial | log-link | 20 | 260 | 22.5 | MP12b1 refS x factor | 451 | 1 |
| V4-S4/fr-frozen/val-20x21-nightmare | initial | fr-frozen | 20 | 130 | 25.8 | MP12b1 refS x factor | 519 | 1 |
| V4-S4/fr-frozen-none/val-20x21-nightmare | initial | fr-frozen-none | 20 | 130 | 25.8 | MP12b1 refS x factor | 519 | 1 |
| V4-S4/log-link/val-20x21-nightmare | initial | log-link | 20 | 260 | 25.8 | MP12b1 refS x factor | 519 | 1 |
| V4-S4/fr-frozen/val-32x15-nightmare | initial | fr-frozen | 20 | 130 | 13.0 | MP12b1 refS x factor | 261 | 1 |
| V4-S4/fr-frozen-none/val-32x15-nightmare | initial | fr-frozen-none | 20 | 130 | 13.0 | MP12b1 refS x factor | 261 | 1 |
| V4-S4/log-link/val-32x15-nightmare | initial | log-link | 20 | 260 | 13.0 | MP12b1 refS x factor | 261 | 1 |
| V4-S4/fr-frozen/val-22x22-nightmare | initial | fr-frozen | 20 | 130 | 18.8 | MP12b1 refS x factor | 378 | 1 |
| V4-S4/fr-frozen-none/val-22x22-nightmare | initial | fr-frozen-none | 20 | 130 | 18.8 | MP12b1 refS x factor | 378 | 1 |
| V4-S4/log-link/val-22x22-nightmare | initial | log-link | 20 | 260 | 18.8 | MP12b1 refS x factor | 378 | 1 |
| V4-S4/fr-frozen/val-24x24-nightmare | initial | fr-frozen | 20 | 130 | 20.2 | MP12b1 refS x factor | 406 | 1 |
| V4-S4/fr-frozen-none/val-24x24-nightmare | initial | fr-frozen-none | 20 | 130 | 20.2 | MP12b1 refS x factor | 406 | 1 |
| V4-S4/log-link/val-24x24-nightmare | initial | log-link | 20 | 260 | 20.2 | MP12b1 refS x factor | 406 | 1 |
| V4-S4/fr-frozen/val-26x26-nightmare | initial | fr-frozen | 20 | 130 | 18.4 | fr-none pilot mean | 371 | 1 |
| V4-S4/fr-frozen-none/val-26x26-nightmare | initial | fr-frozen-none | 20 | 130 | 18.4 | fr-none pilot mean | 371 | 1 |
| V4-S4/log-link/val-26x26-nightmare | initial | log-link | 20 | 260 | 20.2 | MP12b1 refS x factor | 405 | 1 |
| V4-S4C/shipped-uncapped/val-14x14-nightmare | initial | fr-frozen-uncapped | 20 | 260 | 10.0 | fr-screen pilot mean | 201 | 1 |
| V4-S4C/shipped-uncapped/val-15x15b10-nightmare | initial | fr-frozen-uncapped | 20 | 260 | 10.7 | fr-screen pilot mean | 217 | 1 |
| V4-S4C/shipped-uncapped/val-12x12-nightmare | initial | fr-frozen-none-uncapped | 20 | 260 | 16.5 | fr-none pilot mean | 332 | 1 |
| V4-S4C/shipped-uncapped/val-16x16-nightmare | initial | fr-frozen-uncapped | 20 | 260 | 10.1 | fr-screen pilot mean | 204 | 1 |
| V4-S4C/shipped-uncapped/val-15x20-nightmare | initial | fr-frozen-none-uncapped | 20 | 260 | 17.2 | fr-none pilot mean | 346 | 1 |
| V4-S4C/shipped-uncapped/val-26x26-hell-1 | initial | fr-frozen-none-uncapped | 20 | 260 | 33.0 | fr-ps pilot mean | 665 | 2 |
| V4-S4C/shipped-uncapped/val-20x20-hell-1 | initial | fr-frozen-none-uncapped | 20 | 260 | 37.0 | fr-ps pilot mean | 743 | 2 |
| V4-S4C/shipped-uncapped/val-3x29-nightmare | initial | fr-frozen-none-uncapped | 20 | 260 | 6.5 | MP12b1 refS x factor | 132 | 1 |
| V4-S4C/shipped-uncapped/val-10x10-nightmare | initial | fr-frozen-none-uncapped | 20 | 260 | 19.8 | fr-none pilot mean | 397 | 1 |
| V4-S4C/shipped-uncapped/val-18x18-nightmare | initial | fr-frozen-none-uncapped | 20 | 260 | 39.2 | MP12b1 refS x factor | 789 | 2 |
| V4-S4C/shipped-uncapped/val-18x20-nightmare | initial | fr-frozen-none-uncapped | 20 | 260 | 18.3 | MP12b1 refS x factor | 368 | 1 |
| V4-S4C/shipped-uncapped/val-20x20-nightmare | initial | fr-frozen-none-uncapped | 20 | 260 | 22.5 | MP12b1 refS x factor | 451 | 1 |
| V4-S4C/shipped-uncapped/val-20x21-nightmare | initial | fr-frozen-none-uncapped | 20 | 260 | 25.8 | MP12b1 refS x factor | 519 | 1 |
| V4-S4C/shipped-uncapped/val-32x15-nightmare | initial | fr-frozen-none-uncapped | 20 | 260 | 13.0 | MP12b1 refS x factor | 261 | 1 |
| V4-S4C/shipped-uncapped/val-22x22-nightmare | initial | fr-frozen-none-uncapped | 20 | 260 | 18.8 | MP12b1 refS x factor | 378 | 1 |
| V4-S4C/shipped-uncapped/val-24x24-nightmare | initial | fr-frozen-none-uncapped | 20 | 260 | 20.2 | MP12b1 refS x factor | 406 | 1 |
| V4-S4C/shipped-uncapped/val-26x26-nightmare | initial | fr-frozen-none-uncapped | 20 | 260 | 18.4 | fr-none pilot mean | 371 | 1 |
| V4-S4/fr-frozen/master-6x10-master | initial | fr-frozen | 5 | 130 | 2.3 | MP12b1 refS x factor | 13 | 1 |
| V4-S4/log-link/master-6x10-master | initial | log-link | 5 | 260 | 2.3 | MP12b1 refS x factor | 13 | 1 |
| V4-S4/fr-frozen/master-3x29-master | initial | fr-frozen | 5 | 130 | 3.1 | MP12b1 refS x factor | 17 | 1 |
| V4-S4/log-link/master-3x29-master | initial | log-link | 5 | 260 | 3.1 | MP12b1 refS x factor | 17 | 1 |
| V4-S4/fr-frozen/master-10x10-master | initial | fr-frozen | 5 | 130 | 10.3 | MP12b1 refS x factor | 53 | 1 |
| V4-S4/log-link/master-10x10-master | initial | log-link | 5 | 260 | 10.3 | MP12b1 refS x factor | 53 | 1 |
| V4-S4/fr-frozen/master-12x12-master | initial | fr-frozen | 5 | 130 | 7.2 | MP12b1 refS x factor | 38 | 1 |
| V4-S4/log-link/master-12x12-master | initial | log-link | 5 | 260 | 7.2 | MP12b1 refS x factor | 38 | 1 |
| V4-S4/fr-frozen/master-14x14-master | initial | fr-frozen | 5 | 130 | 3.7 | MP12b1 refS x factor | 21 | 1 |
| V4-S4/log-link/master-14x14-master | initial | log-link | 5 | 260 | 3.7 | MP12b1 refS x factor | 21 | 1 |
| V4-S4/fr-frozen/master-15x15b10-master | initial | fr-frozen | 5 | 130 | 6.4 | MP12b1 refS x factor | 34 | 1 |
| V4-S4/log-link/master-15x15b10-master | initial | log-link | 5 | 260 | 6.4 | MP12b1 refS x factor | 34 | 1 |
| V4-S4/fr-frozen/master-16x16-master | initial | fr-frozen | 5 | 130 | 5.8 | MP12b1 refS x factor | 31 | 1 |
| V4-S4/log-link/master-16x16-master | initial | log-link | 5 | 260 | 5.8 | MP12b1 refS x factor | 31 | 1 |
| V4-S4/fr-frozen/master-15x20-master | initial | fr-frozen | 5 | 130 | 5.2 | MP12b1 refS x factor | 28 | 1 |
| V4-S4/log-link/master-15x20-master | initial | log-link | 5 | 260 | 5.2 | MP12b1 refS x factor | 28 | 1 |
| V4-S4/fr-frozen/master-18x18-master | initial | fr-frozen | 5 | 130 | 4.7 | MP12b1 refS x factor | 26 | 1 |
| V4-S4/log-link/master-18x18-master | initial | log-link | 5 | 260 | 4.7 | MP12b1 refS x factor | 26 | 1 |
| V4-S4/fr-frozen/master-18x20-master | initial | fr-frozen | 5 | 130 | 4.6 | MP12b1 refS x factor | 25 | 1 |
| V4-S4/log-link/master-18x20-master | initial | log-link | 5 | 260 | 4.6 | MP12b1 refS x factor | 25 | 1 |
| V4-S4/fr-frozen/master-20x20-master | initial | fr-frozen | 5 | 130 | 5.7 | MP12b1 refS x factor | 31 | 1 |
| V4-S4/log-link/master-20x20-master | initial | log-link | 5 | 260 | 5.7 | MP12b1 refS x factor | 31 | 1 |
| V4-S4/fr-frozen/master-20x21-master | initial | fr-frozen | 5 | 130 | 5.2 | MP12b1 refS x factor | 28 | 1 |
| V4-S4/log-link/master-20x21-master | initial | log-link | 5 | 260 | 5.2 | MP12b1 refS x factor | 28 | 1 |
| V4-S4/fr-frozen/master-32x15-master | initial | fr-frozen | 5 | 130 | 5.8 | MP12b1 refS x factor | 31 | 1 |
| V4-S4/log-link/master-32x15-master | initial | log-link | 5 | 260 | 5.8 | MP12b1 refS x factor | 31 | 1 |
| V4-S4/fr-frozen/master-22x22-master | initial | fr-frozen | 5 | 130 | 7.3 | MP12b1 refS x factor | 38 | 1 |
| V4-S4/log-link/master-22x22-master | initial | log-link | 5 | 260 | 7.3 | MP12b1 refS x factor | 38 | 1 |
| V4-S4/fr-frozen/master-24x24-master | initial | fr-frozen | 5 | 130 | 7.1 | MP12b1 refS x factor | 38 | 1 |
| V4-S4/log-link/master-24x24-master | initial | log-link | 5 | 260 | 7.1 | MP12b1 refS x factor | 38 | 1 |
| V4-S4/fr-frozen/master-26x26-master | initial | fr-frozen | 5 | 130 | 9.7 | MP12b1 refS x factor | 50 | 1 |
| V4-S4/log-link/master-26x26-master | initial | log-link | 5 | 260 | 9.7 | MP12b1 refS x factor | 50 | 1 |
| V4-S4/fr-frozen/val-24x24-hell-1 | conditional | fr-frozen | 20 | 130 | 36.3 | fr-base pilot mean | 728 | 1 |
| V4-S4/fr-frozen-none/val-24x24-hell-1 | conditional | fr-frozen-none | 20 | 130 | 36.3 | fr-base pilot mean | 728 | 1 |
| V4-S4C/shipped-uncapped/val-24x24-hell-1 | conditional | fr-frozen-none-uncapped | 20 | 260 | 36.3 | fr-base pilot mean | 730 | 2 |
| V4-S4/fr-frozen/val-14x14-hell-1 | conditional | fr-frozen | 20 | 130 | 114.1 | fr-base pilot mean | 2287 | 3 |
| V4-S4/fr-frozen-none/val-14x14-hell-1 | conditional | fr-frozen-none | 20 | 130 | 114.1 | fr-base pilot mean | 2287 | 3 |
| V4-S4C/shipped-uncapped/val-14x14-hell-1 | conditional | fr-frozen-none-uncapped | 20 | 260 | 114.1 | fr-base pilot mean | 2289 | 4 |
