# N-V4-14 at validation size: a paired bootstrap of the pilot rows (SA-Opus scratch, round 1)

Each draw takes 20 reps per cell with replacement from the five pilot reps (the same rep for `fr-screen` and `fr-none`),
sums the ledgers' lo and hi and the accepted puzzles per arm over the class, and applies T09c's work rule; the faster
columns apply the point conditions of the faster rule (class geo >= 1.15 and every cell geo >= 1.0) to the same draws.
4,000 draws, `mulberry32(20261123)`. Five pilot rows per cell are thin: an indication of decidability, not a forecast.

| Class (cells) | work pass | work unknown | work worse | faster point conditions met |
|---|---:|---:|---:|---:|
| n-mid 196-324 piloted (14x14, 15x15b10, 16x16, 15x20) | 0.000 | 1.000 | 0.000 | 1.000 |
| n-mid-a 196-256 (14x14, 15x15b10, 16x16) | 1.000 | 0.000 | 0.000 | 1.000 |
| n-mid-b 196-215 (14x14, 15x15b10) | 1.000 | 0.000 | 0.000 | 1.000 |
| 16x16 alone | 0.000 | 1.000 | 0.000 | 1.000 |
| 15x20 alone | 0.000 | 1.000 | 0.000 | 1.000 |
| n-large (26x26 only piloted) | 0.000 | 1.000 | 0.000 | 1.000 |
| n-small (10x10, 12x12) | 0.038 | 0.962 | 0.000 | 0.000 |
| hell-1 (26x26 only piloted, 380 M) | 0.000 | 1.000 | 0.000 | 0.112 |
