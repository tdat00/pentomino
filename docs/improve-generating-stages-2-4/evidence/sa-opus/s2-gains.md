# V4-S2: mechanism gains under the plan's resampling recipe (SA-Opus scratch, round 1)

Ratio per seed = capped T10 of the reference arm over the mechanism arm (above 1: the mechanism is faster). `geo` and
`lower 10 %` are T09b's `fasterRule` over every (cell, seed) pair with 10,000 resamples (seed 20261116); five fitting
seeds per cell, a reading only.

| Comparison | Cells | geo | lower 10 % | cell geos |
|---|---|---:|---:|---|
| per-set prior (fr-ps against fr-base) | 26x26-hell-1, 20x20-hell-1 | 1.094 | 1.008 | 26x26-hell-1 1.081; 20x20-hell-1 1.107 |
| (c4) (fr-c4 against fr-base) | 14x14-nightmare, 26x26-nightmare | 0.834 | 0.776 | 14x14-nightmare 0.837; 26x26-nightmare 0.831 |
| bracket close where it can act (fr-close against fr-base) | 14x14-nightmare | 0.874 | 0.804 | 14x14-nightmare 0.874 |
| bracket close, all three cells | 12x12-nightmare, 14x14-nightmare, 26x26-hell-1 | 0.956 | 0.931 | 12x12-nightmare 0.997; 14x14-nightmare 0.874; 26x26-hell-1 1.002 |
| P5 at 2 G (fr-p5 against fr-base) | 14x14-nightmare, 26x26-hell-1, 20x20-hell-1 | 0.994 | 0.907 | 14x14-nightmare 1.005; 26x26-hell-1 0.894; 20x20-hell-1 1.093 |
| P5 at 2 G, Hell 1 only | 26x26-hell-1, 20x20-hell-1 | 0.988 | 0.863 | 26x26-hell-1 0.894; 20x20-hell-1 1.093 |
| same configuration (fr-none against fr-base) | 12x12-nightmare, 26x26-nightmare, 26x26-hell-1 | 0.992 | 0.989 | 12x12-nightmare 0.997; 26x26-nightmare 0.983; 26x26-hell-1 0.996 |
