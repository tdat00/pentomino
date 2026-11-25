# V4-S2K: self time per function (SA-Opus scratch, round 1)

From the raw `.cpuprofile` files of V4-S2K (`--cpu-prof --no-turbo-inlining`, six window ratings of the first carved set
of each case in the `instr` tree). Self time = the sum of the sample deltas naming the node (T10b's rule).

## 14x14-nightmare

Total 10629.4 ms; deduce.js 10099.6 ms (95.0 %); dlx.js 264.8 ms (2.5 %).

| Function [file] | Self ms | % of total | % of deduce.js |
|---|---:|---:|---:|
| reachable [deduce.js] | 1899.1 | 17.9 | 18.8 |
| ruleR4 [deduce.js] | 1761.1 | 16.6 | 17.4 |
| select [deduce.js] | 1408.8 | 13.3 | 13.9 |
| gather [deduce.js] | 1171.9 | 11.0 | 11.6 |
| neighbourCell [deduce.js] | 741.9 | 7.0 | 7.3 |
| ruleR8 [deduce.js] | 676.0 | 6.4 | 6.7 |
| undo [deduce.js] | 629.3 | 5.9 | 6.2 |
| kill [deduce.js] | 567.9 | 5.3 | 5.6 |
| ruleR5 [deduce.js] | 460.2 | 4.3 | 4.6 |
| ruleR9 [deduce.js] | 227.3 | 2.1 | 2.3 |
| cover [dlx.js] | 136.4 | 1.3 | - |
| uncover [dlx.js] | 113.4 | 1.1 | - |
| ruleR3 [deduce.js] | 107.5 | 1.0 | 1.1 |
| fillSums [deduce.js] | 91.4 | 0.9 | 0.9 |
| labelPockets [deduce.js] | 85.2 | 0.8 | 0.8 |

## 26x26-nightmare

Total 3646.2 ms; deduce.js 2324.7 ms (63.8 %); dlx.js 917.5 ms (25.2 %).

| Function [file] | Self ms | % of total | % of deduce.js |
|---|---:|---:|---:|
| ruleR4 [deduce.js] | 691.2 | 19.0 | 29.7 |
| uncover [dlx.js] | 428.8 | 11.8 | - |
| cover [dlx.js] | 415.7 | 11.4 | - |
| select [deduce.js] | 382.8 | 10.5 | 16.5 |
| undo [deduce.js] | 208.4 | 5.7 | 9.0 |
| neighbourCell [deduce.js] | 201.5 | 5.5 | 8.7 |
| kill [deduce.js] | 194.0 | 5.3 | 8.3 |
| ruleR8 [deduce.js] | 193.6 | 5.3 | 8.3 |
| walk [placements.js] | 95.4 | 2.6 | - |
| ruleR5 [deduce.js] | 89.4 | 2.5 | 3.8 |
| gather [deduce.js] | 83.2 | 2.3 | 3.6 |
| ruleR9 [deduce.js] | 66.9 | 1.8 | 2.9 |
| ExactCover [dlx.js] | 64.0 | 1.8 | - |
| measureDeduction [deduce.js] | 54.3 | 1.5 | 2.3 |
| reachable [deduce.js] | 40.0 | 1.1 | 1.7 |
