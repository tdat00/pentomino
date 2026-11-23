# Cross-review round 1: prices of SA-Astra's projections and of the alternatives (SA-Opus scratch)

Computed by `x1-prices.mjs` with T11g's `stepPrice`, `price`, `parityPass` and T11e's `expandMatrix`, `activation` and
`activationPlans` (pure functions; nothing written outside this folder). Minutes are counted minutes; "cap" = the cumulative
round minutes an approval would ask today, ceil((account 10340.112 s + guard) / 60). Realistic = V4-S2's measured
node seconds of the same steps plus 15 s (idle declaration) or 45 s quiet per invocation; one P-1 pass = 285.6 node s
(the mean of V4-S2's six passing passes).

| Item | rows / items | counted | guard | cap on the account | invocations | realistic (15 s / 45 s quiet) |
|---|---|---:|---:|---:|---:|---|
| V4-S2F (SA-Astra: 5 cells x 2 arms x 5 reps + 2 P-1) | 50 rows + 24 items | 204.50 | 255.63 | 428 | 20 | 52.1 / 58.1 |
| P7 spike, three candidates (SA-Astra's assumption) | 270 items | 15.50 | 19.37 | 192 | 3 | - |
| P7 spike, one candidate | 90 items | 5.17 | 6.46 | 179 | 1 | - |
| V4-S4 (initial + both conditional boards, no S4-6) | 1168 rows/items in 84 locked steps | 1185.49 | 1481.86 | 1655 | 137 | 468.3 / 513.8 |
| V4-S4C (same collection) | 19 cells | 585.62 | 732.02 | 905 | 51 | 169.8 / 182.8 |
| N-V4-18 saving, SA-Astra (n-small, 216-324, 360+, Hell 1 fixed none: 17 cells) | 17 cells | 390.61 | 488.26 | 661 | 35 | 164.9 / 174.9 |
| N-V4-18 saving, SA-Opus cross-review (n-small and Hell 1 fixed none: 7 cells) | 7 cells | 240.37 | 300.46 | 473 | 21 | 90.3 / 94.8 |
| V4-S2B control pilot (fr-none on the 8 unpiloted controls, round 1) | 40 rows | 22.59 | 28.24 | 201 | - | 16.0 / 20.0 |
| Hell 1 composite check, one uncapped candidate arm (4 boards x 5 reps) + its P-1 | 20 rows + 12 items | 85.49 | 106.86 | 280 | 8 | 25.0 / 27.5 |
| Hell 1 composite check, rows only (arm with an accepted binding) | 20 rows | 67.69 | 84.61 | 257 | 6 | 20.0 / 22.0 |
| V4-S3P: the four frozen arms' P-1 passes | 48 items | 71.20 | 89.00 | 262 | 8 | 20.0 / 22.0 |

V4-S4's preview: 1168 rows and items, projected completed 968, censored 200;
V4-S4C: 380 rows, 51 projected invocations. Realistic V4-S4 / V4-S4C are round 1's `s4-cost.json`
(the screen twin at fr-screen's pilot times on 14x14, 15x15b10 and 16x16 Nightmare, at fr-none's elsewhere; a class proposal that
ships 16x16 without the screen adds a few minutes through its twin and its comparator).
