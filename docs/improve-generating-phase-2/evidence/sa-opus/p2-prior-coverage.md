# Prior-table and screen-class coverage of the offered Nightmare rectangles (SA-Opus)

Command: `node docs\improve-generating-phase-2\evidence\sa-opus\p2-prior-coverage.mjs` (read-only).

Nightmare areas with a `prior-s3-v1` cell: 87, 100, 144, 196, 215, 256, 300, 324, 360, 400, 420, 480, 484, 576, 676 (15).
A board whose active-cell count has no cell starts its locate at K - 8 with step 8 (frozen `priorCount`,
`tools/ig-proto/variants/files/v4/core/engine/ig-select-v4.js:199-205`).

## Rectangles offered on a desktop (484 cells)

295 rectangles (W <= H), 29 with a prior cell (9.8 %).

| Screen class (freeze bounds) | Shipped W | Rectangles | With a prior cell | Examples without one |
|---|---|---:|---:|---|
| n-small | none (760 M) | 75 | 8 | 9x9, 11x11, 11x12, 10x11, 9x10, 11x13 |
| unlisted | none (760 M) | 63 | 0 | 13x13, 18x19, 13x14, 12x13, 13x15, 12x14 |
| n-mid | 190 M | 50 | 4 | 15x15, 15x16, 14x15, 15x17, 14x16, 14x17 |
| n-upper | none (760 M) | 45 | 5 | 17x17, 17x18, 16x17, 17x19, 16x18, 16x19 |
| n-large | none (760 M) | 62 | 12 | 19x19, 21x21, 21x22, 19x20, 21x23, 20x22 |

## Rectangles offered on a phone (360 cells)

236 rectangles (W <= H), 20 with a prior cell (8.5 %).

| Screen class (freeze bounds) | Shipped W | Rectangles | With a prior cell | Examples without one |
|---|---|---:|---:|---|
| n-small | none (760 M) | 75 | 8 | 9x9, 11x11, 11x12, 10x11, 9x10, 11x13 |
| unlisted | none (760 M) | 63 | 0 | 13x13, 18x19, 13x14, 12x13, 13x15, 12x14 |
| n-mid | 190 M | 50 | 4 | 15x15, 15x16, 14x15, 15x17, 14x16, 14x17 |
| n-upper | none (760 M) | 45 | 5 | 17x17, 17x18, 16x17, 17x19, 16x18, 16x19 |
| n-large | none (760 M) | 3 | 3 |  |

"Shipped W" is the V4-S4F selection (`docs/improve-generating/evidence/frozen/V4-S4F/verdicts.md`): only `n-mid`
ships the screen. "unlisted" are the areas 145-195 and 325-359, which no class lists (no screen).
