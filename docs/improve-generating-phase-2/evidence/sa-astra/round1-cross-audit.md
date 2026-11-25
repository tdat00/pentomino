# Phase-2 cross-review: independently enumerated price (SA-Astra)

Proposal pending joint agreement. No engine, test runner or measurement was executed.

Command: `node docs\improve-generating-phase-2\evidence\sa-astra\round1-cross-audit.mjs`.

| Stage | Planned rows | Row invocations | Row counted min | Item counted min | Total counted min | Total guard min |
|---|---:|---:|---:|---:|---:|---:|
| A | 318 | 23 | 281.924 | 48.732 | 330.656 | 409.195 |
| B | 695 | 26 | 321.258 | 0.000 | 321.258 | 401.572 |

Planned total: 1013 rows, 651.913 counted minutes, 810.767 guard minutes; independently rounded stages 410 + 402 = 812 minutes.
Equivalent old-account cap (only with explicit scope/funding extension): 1684 minutes.
If every non-table row consumes its full row limit: guard 1302.491 minutes, rounded grant 1303. This is a stress case, not an observation.

Prices use matching frozen means +2 s/request; unknown require and five extra trigger slots use their row limits.
The non-table adjacent-cell proxies are assumptions. The schedule batches cells within each stage, sequential fresh processes,
with 885-s horizon, 900-s kill, 45-s quiet and per-row checkpoint; the pure T11g guard is 1.25 x counted.
The eight smoke rows are a separate correctness purpose and are never pooled as additional validation repetitions.
The fifteen conditional slots are a planning allowance, not permission to omit a required twin.

## Frozen calibration

| Task | Actual row counted min | Residual per row s (proofs excluded) | Initial Astra proxy min | Mean+1 min | Mean+2 min |
|---|---:|---:|---:|---:|---:|
| V4-S4 | 444.041 | 0.987 | 480.212 | 447.282 | 465.949 |
| V4-S4C | 161.169 | 1.084 | 187.514 | 160.618 | 167.735 |

Observed four-proof total: 23.349 counted minutes.
Input index: 125 paths; SHA-256 `c8b44c730194b51d0e4d31134b5cf9190c31d7bdb92a392e2fab715019b780b3`; details, exact row schedule and assumptions in round1-cross-audit.json.
