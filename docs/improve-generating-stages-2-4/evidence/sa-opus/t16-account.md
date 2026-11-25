# T16: B6 and the round's account (every frozen-round plan's invocation rows)

| Task | Invocations (steps) | Counted s | Killed | Exit not 0 | Step not finished in that invocation | Max horizon s | Logged after (s) | Account after (min) | Approval | Guard s | Within guard | Cap (min) | Within cap |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|---|---:|---|
| IGP-02 | 7 (6) | 1020.46 | 0 | 0 | 1 | 285 | 1020.46 | 17 | v4 pack | - | - | - | - |
| V4-T04 | 11 (6) | 1353.69 | 0 | 0 | 4 | 285 | 2374.15 | 39.6 | v4 pack | - | - | - | - |
| V4-T05 | 2 (2) | 186.086 | 0 | 0 | 0 | 285 | 2560.236 | 42.7 | v4 pack | - | - | - | - |
| V4-T06 | 2 (2) | 163.493 | 0 | 0 | 0 | 245 | 2723.729 | 45.4 | v4 pack | - | - | - | - |
| V4-T10a | 1 (1) | 69.035 | 0 | 0 | 0 | 285 | 2792.764 | 46.5 | v4 pack | - | - | - | - |
| V4-T10b | 1 (1) | 60.087 | 0 | 0 | 0 | 245 | 2852.851 | 47.5 | v4 pack | - | - | - | - |
| V4-T10c | 1 (1) | 61.059 | 0 | 0 | 0 | 245 | 2913.91 | 48.6 | v4 pack | - | - | - | - |
| V4-S2 | 44 (44) | 7338.802 | 0 | 0 | 0 | 885 | 10252.712 | 172.3 | v4 pack | - | - | - | - |
| V4-S2B | 8 (8) | 833.444 | 0 | 0 | 0 | 885 | 11086.156 | 186.2 | D-S24-26 (Q-S24-4 (a), 2026-11-23) | 1694.624 | true | 201 | true |
| V4-P7 | 3 (3) | 801.167 | 0 | 0 | 0 | 885 | 11887.323 | 199.6 | D-S24-28 (up to 20 min) | 1162.172 | true | 206 | true |
| V4-S3P | 8 (8) | 2298.808 | 0 | 0 | 0 | 885 | 14186.131 | 237.9 | D-S24-27 (rows) and Q-S03 (a) (proofs), 2026-11-24 07:41 | 10416.597 | true | 374 | true |
| V4-LIVE | 2 (2) | 284.917 | 0 | 0 | 0 | 885 | 14471.048 | 242.6 | Q-S04 (a), 2026-11-24 10:09 | 2634.33 | true | 282 | true |
| V4-S4 | 94 (84) | 28043.391 | 0 | 0 | 10 | 885 | 42514.439 | 710 | Q-S06 (a), 2026-11-24 11:16 (grant raised to 1,725) | 88911.486 | true | 1725 | true |
| V4-S4C | 23 (19) | 9670.158 | 0 | 0 | 4 | 885 | 52184.597 | 871.2 | Q-S07 (a), 2026-11-24 20:04 (measurement only) | 43921.283 | true | 1443 | true |

Final account: 52184.597 s logged + 87.4 s off-log = 52271.997 s = 871.2 of 1725 counted minutes.

Steps that took more than one invocation (the runner repeats a step until its shard is done):

- IGP-02: screens x2.
- V4-T04: parity x3, replay x4.
- V4-S4: rows-fr-frozen-val-20x20-hell-1 x2, rows-fr-frozen-none-val-20x20-hell-1 x2, rows-log-link-val-18x18-nightmare x2, rows-log-link-val-18x20-nightmare x2, rows-log-link-val-20x20-nightmare x2, rows-log-link-val-20x21-nightmare x2, rows-fr-frozen-val-14x14-hell-1 x3, rows-fr-frozen-none-val-14x14-hell-1 x3.
- V4-S4C: rows-fr-frozen-none-uncapped-val-20x20-hell-1 x2, rows-fr-frozen-none-uncapped-val-24x24-hell-1 x2, rows-fr-frozen-none-uncapped-val-14x14-hell-1 x3.
