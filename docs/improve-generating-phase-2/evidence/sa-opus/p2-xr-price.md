# The converged price of the production validation (SA-Opus, phase-2 cross-review)

Command: `node docs\improve-generating-phase-2\evidence\sa-opus\p2-xr-price.mjs` (read-only; no engine run).
Pricing: the pure pricing section of `tools/ig-proto/manifest.mjs` (T11g), evaluated in memory as in
`evidence/sa-astra/round1-audit.mjs`; per-row basis SA-Astra's proxy, 1.25 x the median response of the matching frozen
arm and cell (`docs/improve-generating/evidence/frozen/{V4-S4,V4-S4C}/<arm>/*.runs.json`); guard = 1.25 x counted.

## 1. Calibration on the frozen round's own row steps

Each basis prices the frozen row steps from their own published rows; the actual is the counted seconds of the `rows-*`
steps in `tests/artifacts/ig-proto/frozen/<task>/invocations.jsonl` (the four parity steps of V4-S4 excluded).

| Task | Actual counted (min) | 1.25 x median: counted (min) | ratio | guard (min) | mean + 1.0 s: counted (min) | ratio |
|---|---:|---:|---:|---:|---:|---:|
| V4-S4 | 444.0 | 480.2 | 1.081 | 600.3 | 447.3 | 1.007 |
| V4-S4C | 161.2 | 187.5 | 1.163 | 234.4 | 160.6 | 0.997 |

## 2. The converged matrix (round-1-cross-review.md section 8)

| Component | Rows | Invocations | Counted (min) | Guard (min) |
|---|---:|---:|---:|---:|
| core: gen-v4 shipped on the 19 frozen Nightmare and Hell 1 cells x 20 (26x26 by the legacy route) | 380 | 22 | 175.1 | 218.8 |
| core: gen-v4 on the 16 Master cells x 5 | 80 | 16 | 20.2 | 25.2 |
| core: today (6b94ffb) on the 10 controls x 20 | 200 | 14 | 96.6 | 120.8 |
| core: today on the 16 Master cells x 5 | 80 | 16 | 20.2 | 25.2 |
| core: n-mid without the screen (measurement copy) x 20 | 60 | 3 | 30.6 | 38.2 |
| boards without a prior cell, both arms x 20 (11x11, 18x19, 21x21; proxies 10x10, 18x18, 20x21) | 120 | 8 | 59.4 | 74.2 |
| board without a prior cell, gen-v4 only x 20 (15x15; proxy 15x15b10 with the screen) | 20 | 1 | 5.5 | 6.9 |
| port smoke: 8 representative requests before the timed matrix (frozen reps 20; one mixed step) | 8 | 1 | 3.4 | 4.2 |
| N-V4-15: require x 5, Nightmare 22x22 and 32x15 (today, gen-v4, uncapped), Hell 1 22x22 and 32x15 (gen-v4, uncapped), at the row limits | 50 | 16 | 185.9 | 232.3 |
| predeclared conditional uncapped twins: 15 main-matrix rows (frozen: 10 rows, all 14x14 Hell 1) at that twin's proxy | 15 | 3 | 38.8 | 48.5 |
| four proof bundles (observers, certificate, prior, legacy route), at the measured cost of V4-S4's parity steps | - | - | 23.3 | 29.2 |
| resource replays (SA-Astra's 8 items) | - | - | 8.9 | 11.1 |
| browser functional checks (SA-Astra's 6, ceiling) | - | - | 16.5 | 16.5 |
| **Total** | **1013** | | **684.3** | **851.2** |

Proposed grant on this basis: the guard rounded up to whole minutes, 852 counted minutes. SA-Astra computes the final enumerated schedule (mean response + 2 s per row, 45-s quiet, the measured proof timings, explicit reserves).

Stage A (the port smoke, the proof bundles, N-V4-15, the boards without a prior cell, the controls 3x29, 32x15 and 22x22): counted 305.6 min, guard 382.0 min. Stage B (the rest): counted 378.7 min, guard 469.2 min.
