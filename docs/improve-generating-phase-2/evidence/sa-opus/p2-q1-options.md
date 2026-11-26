# The figures of Q-P2-1's options (SA-Opus)

Command: `node docs\improve-generating-phase-2\evidence\sa-opus\p2-q1-options.mjs` (read-only).
Input: SA-Astra's enumerated schedule, `evidence/sa-astra/round1-cross-audit.json`, replayed in her execution order with
her rules (2-s start-up, 885-s horizon, admission while elapsed + row limit + 10 <= 885, 45-s quiet, guard 1.25 x counted,
the browser checks at their ceiling).

| Scenario | Stage | Rows | Invocations | Counted min | Guard min | Stage grant |
|---|---|---:|---:|---:|---:|---:|
| (a) the agreed schedule | A | 318 | 23 | 330.656 | 409.195 | 410 |
| (a) the agreed schedule | B | 695 | 26 | 321.258 | 401.572 | 402 |
| (c) the 140 sentinel rows at their row limits (stress) | A | 318 | 50 | 724.035 | 900.919 | 901 |
| (c) the 140 sentinel rows at their row limits (stress) | B | 695 | 26 | 321.258 | 401.572 | 402 |
| (d) without the 140 sentinel rows | A | 178 | 17 | 264.852 | 326.940 | 327 |
| (d) without the 140 sentinel rows | B | 695 | 26 | 321.258 | 401.572 | 402 |

- (a) the agreed schedule: guard 810.767 minutes; stage grants 410 + 402 = 812.
- (c) the 140 sentinel rows at their row limits (stress): guard 1302.491 minutes; stage grants 901 + 402 = 1303.
- (d) without the 140 sentinel rows: guard 728.512 minutes; stage grants 327 + 402 = 729.
