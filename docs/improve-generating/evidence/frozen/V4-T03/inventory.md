# PM1 data-only inventory (V4-T03, IG-P-Q24)

> **Frozen source `3fc65f4`.** Measured on frozen 3fc65f4 (source digest e181df2c…). Re-run: node tools\ig-proto\pm1-inventory.mjs --label frozen --source-label "frozen 3fc65f4".

Data-only inventory of the provisional PM1 records (IG-P-Q24 (b)). It rates nothing and opens no route: Hell 2 and Hell 3 stay closed for this feature as a scope and resource decision (IG-P-D6); no generation, pack claim or offer follows from these census-estimated witnesses. Hell levels are not offered on any board at the frozen source (`offeredAtFrozen` is false on every row).

## Totals

| Item | Value |
|---|---:|
| Families | 116 |
| Probes | 1362 |
| Rated probes (score is not null) | 987 |
| Alternate rows (a rated Hell level other than the family's level) | 113 |
| Alternate rows offered at the frozen source (`offeredAtFrozen` true) | 0 |

## The facts quoted in IG-P-Q24

| Case | Clues | Score | Rated level | Found |
|---|---:|---:|---|---|
| 15x15b10-hell-1 | 2 | 179 | hell-3 | yes |
| 15x15b10-hell-1 | 3 | 165 | hell-3 | yes |
| 15x15b10-hell-1 | 6 | 146 | hell-2 | yes |
| 12x12-nightmare | 1 | 129 | hell-2 | yes |

## Populations

One row per rated level and case, over the alternate rows. Counts are clue counts; main work in millions of units.

| Rated level | Case | Family level | Area | n | Not refused | Censored | Solutions u/f/m/? | Counts | Scores | Main work median / max (M) |
|---|---|---|---:|---:|---:|---:|---|---|---|---|
| hell-3 | 15x15b10-hell-1 | hell-1 | 215 | 2 | 2 | 2 | 0/1/0/1 | 2-3 | 165-179 | 760.2 / 760.2 |
| hell-2 | 12x12-nightmare | nightmare | 144 | 1 | 1 | 1 | 0/1/0/0 | 1-1 | 129-129 | 760.1 / 760.1 |
| hell-2 | 14x14-hell-1 | hell-1 | 196 | 1 | 1 | 1 | 0/0/1/0 | 10-10 | 117-117 | 490.4 / 490.4 |
| hell-2 | 15x15b10-hell-1 | hell-1 | 215 | 1 | 1 | 1 | 0/1/0/0 | 6-6 | 146-146 | 760.2 / 760.2 |
| hell-2 | 15x20-hell-1 | hell-1 | 300 | 2 | 2 | 2 | 0/0/2/0 | 16-17 | 115-115 | 358.1 / 365.7 |
| hell-2 | 22x22-hell-3 | hell-3 | 484 | 3 | 3 | 1 | 0/0/3/0 | 41-46 | 115-115 | 584.3 / 741.7 |
| hell-2 | 24x24-hell-1 | hell-1 | 576 | 2 | 2 | 2 | 0/0/2/0 | 7-10 | 113-113 | 445.3 / 555.8 |
| hell-2 | 26x26-nightmare | nightmare | 676 | 1 | 1 | 1 | 0/0/1/0 | 1-1 | 112-112 | 720.9 / 720.9 |
| hell-1 | 12x12-nightmare | nightmare | 144 | 7 | 7 | 6 | 0/4/3/0 | 2-6 | 83-105 | 638.2 / 760.1 |
| hell-1 | 14x14-nightmare | nightmare | 196 | 1 | 1 | 0 | 0/0/1/0 | 4-4 | 81-81 | 24.8 / 24.8 |
| hell-1 | 15x20-hell-2 | hell-2 | 300 | 6 | 6 | 1 | 2/3/0/1 | 23-29 | 77-103 | 279.7 / 760.0 |
| hell-1 | 18x18-hell-2 | hell-2 | 324 | 2 | 2 | 2 | 0/0/0/2 | 24-27 | 81-106 | 760.0 / 760.1 |
| hell-1 | 18x20-hell-2 | hell-2 | 360 | 10 | 10 | 5 | 0/1/9/0 | 26-31 | 84-108 | 352.9 / 760.0 |
| hell-1 | 20x20-hell-2 | hell-2 | 400 | 3 | 3 | 3 | 0/3/0/0 | 26-28 | 98-110 | 760.1 / 760.1 |
| hell-1 | 20x21-hell-2 | hell-2 | 420 | 8 | 8 | 1 | 3/2/3/0 | 23-35 | 77-110 | 124.6 / 519.8 |
| hell-1 | 22x22-hell-2 | hell-2 | 484 | 11 | 11 | 11 | 0/0/11/0 | 30-37 | 77-99 | 341.1 / 458.2 |
| hell-1 | 22x22-hell-3 | hell-3 | 484 | 11 | 11 | 8 | 0/9/2/0 | 42-49 | 77-109 | 760.0 / 760.1 |
| hell-1 | 24x24-hell-2 | hell-2 | 576 | 6 | 6 | 6 | 0/0/6/0 | 25-31 | 80-98 | 291.5 / 639.8 |
| hell-1 | 24x24-hell-3 | hell-3 | 576 | 4 | 4 | 4 | 0/1/3/0 | 49-51 | 77-103 | 345.1 / 760.1 |
| hell-1 | 26x26-hell-2 | hell-2 | 676 | 7 | 7 | 5 | 0/2/5/0 | 20-28 | 83-94 | 365.5 / 732.8 |
| hell-1 | 26x26-hell-3 | hell-3 | 676 | 4 | 4 | 4 | 0/0/4/0 | 48-54 | 78-94 | 490.5 / 616.4 |
| hell-1 | 26x26-nightmare | nightmare | 676 | 13 | 13 | 12 | 0/0/13/0 | 1-5 | 82-101 | 416.4 / 697.5 |
| hell-1 | 32x15-hell-2 | hell-2 | 480 | 6 | 6 | 6 | 0/0/6/0 | 28-35 | 78-106 | 208.5 / 720.9 |
| hell-1 | 32x15-hell-3 | hell-3 | 480 | 1 | 1 | 0 | 1/0/0/0 | 38-38 | 78-78 | 653.5 / 653.5 |

## Alternate rows

### Rated hell-3 (2 rows)

| Part | Case | Family level | Area | K | Clues | Offset | Score | Censored | AR1 refused | Solutions | Main work (M) | Census work (M) |
|---|---|---|---:|---:|---:|---:|---:|---|---|---|---:|---:|
| windows | 15x15b10-hell-1 | hell-1 | 215 | 34 | 2 | -1 | 179 | yes | no | unknown | 760.2 | 80.3 |
| windows | 15x15b10-hell-1 | hell-1 | 215 | 34 | 3 | 0 | 165 | yes | no | few | 760.2 | 80.2 |

### Rated hell-2 (11 rows)

| Part | Case | Family level | Area | K | Clues | Offset | Score | Censored | AR1 refused | Solutions | Main work (M) | Census work (M) |
|---|---|---|---:|---:|---:|---:|---:|---|---|---|---:|---:|
| failed-sets | 14x14-hell-1 | hell-1 | 196 | 32 | 10 | 7 | 117 | yes | no | many | 490.4 | 80.0 |
| failed-sets | 24x24-hell-1 | hell-1 | 576 | 42 | 10 | 6 | 113 | yes | no | many | 555.8 | 80.4 |
| failed-sets | 24x24-hell-1 | hell-1 | 576 | 39 | 7 | 3 | 113 | yes | no | many | 445.3 | 80.7 |
| scan | 12x12-nightmare | nightmare | 144 | 22 | 1 | -2 | 129 | yes | no | few | 760.1 | 80.1 |
| scan | 26x26-nightmare | nightmare | 676 | 31 | 1 | -3 | 112 | yes | no | many | 720.9 | 81.0 |
| windows | 15x15b10-hell-1 | hell-1 | 215 | 34 | 6 | 3 | 146 | yes | no | few | 760.2 | 80.2 |
| windows | 15x20-hell-1 | hell-1 | 300 | 39 | 17 | 13 | 115 | yes | no | many | 358.1 | 80.1 |
| windows | 15x20-hell-1 | hell-1 | 300 | 39 | 16 | 12 | 115 | yes | no | many | 365.7 | 80.1 |
| windows | 22x22-hell-3 | hell-3 | 484 | 74 | 46 | 43 | 115 | no | no | many | 582.2 | 0.0 |
| windows | 22x22-hell-3 | hell-3 | 484 | 74 | 45 | 42 | 115 | no | no | many | 584.3 | 0.0 |
| windows | 22x22-hell-3 | hell-3 | 484 | 74 | 41 | 38 | 115 | yes | no | many | 741.7 | 80.1 |

### Rated hell-1 (100 rows)

| Part | Case | Family level | Area | K | Clues | Offset | Score | Censored | AR1 refused | Solutions | Main work (M) | Census work (M) |
|---|---|---|---:|---:|---:|---:|---:|---|---|---|---:|---:|
| scan | 14x14-nightmare | nightmare | 196 | 21 | 4 | 1 | 81 | no | no | many | 24.8 | 64.2 |
| scan | 12x12-nightmare | nightmare | 144 | 20 | 6 | 3 | 83 | no | no | few | 409.4 | 0.0 |
| scan | 12x12-nightmare | nightmare | 144 | 22 | 6 | 3 | 97 | yes | no | few | 760.0 | 80.0 |
| scan | 12x12-nightmare | nightmare | 144 | 22 | 5 | 2 | 83 | yes | no | many | 252.3 | 80.0 |
| scan | 12x12-nightmare | nightmare | 144 | 22 | 4 | 1 | 86 | yes | no | many | 412.8 | 80.1 |
| scan | 12x12-nightmare | nightmare | 144 | 22 | 5 | 2 | 90 | yes | no | few | 760.0 | 80.0 |
| scan | 12x12-nightmare | nightmare | 144 | 22 | 4 | 1 | 105 | yes | no | many | 638.2 | 80.0 |
| scan | 12x12-nightmare | nightmare | 144 | 22 | 2 | -1 | 97 | yes | no | few | 760.1 | 80.1 |
| scan | 26x26-nightmare | nightmare | 676 | 31 | 4 | 0 | 91 | yes | no | many | 306.2 | 82.2 |
| scan | 26x26-nightmare | nightmare | 676 | 31 | 3 | -1 | 96 | yes | no | many | 331.8 | 81.3 |
| scan | 26x26-nightmare | nightmare | 676 | 31 | 2 | -2 | 99 | yes | no | many | 473.4 | 82.1 |
| scan | 26x26-nightmare | nightmare | 676 | 31 | 4 | 0 | 83 | yes | no | many | 135.2 | 80.8 |
| scan | 26x26-nightmare | nightmare | 676 | 31 | 3 | -1 | 93 | yes | no | many | 265.0 | 80.3 |
| scan | 26x26-nightmare | nightmare | 676 | 31 | 2 | -2 | 100 | yes | no | many | 697.5 | 81.2 |
| scan | 26x26-nightmare | nightmare | 676 | 31 | 1 | -3 | 100 | yes | no | many | 595.8 | 83.3 |
| scan | 26x26-nightmare | nightmare | 676 | 31 | 3 | -1 | 82 | yes | no | many | 492.1 | 81.0 |
| scan | 26x26-nightmare | nightmare | 676 | 31 | 2 | -2 | 82 | yes | no | many | 509.0 | 82.3 |
| scan | 26x26-nightmare | nightmare | 676 | 31 | 5 | 1 | 84 | no | no | many | 74.3 | 59.9 |
| scan | 26x26-nightmare | nightmare | 676 | 31 | 4 | 0 | 101 | yes | no | many | 405.3 | 80.8 |
| scan | 26x26-nightmare | nightmare | 676 | 31 | 3 | -1 | 101 | yes | no | many | 416.4 | 81.1 |
| scan | 26x26-nightmare | nightmare | 676 | 31 | 2 | -2 | 96 | yes | no | many | 525.1 | 81.7 |
| windows | 15x20-hell-2 | hell-2 | 300 | 52 | 26 | 23 | 95 | no | no | few | 279.7 | 0.0 |
| windows | 15x20-hell-2 | hell-2 | 300 | 52 | 28 | 25 | 88 | no | no | unique | 550.7 | 0.0 |
| windows | 15x20-hell-2 | hell-2 | 300 | 52 | 27 | 24 | 89 | yes | no | unknown | 760.0 | 80.0 |
| windows | 15x20-hell-2 | hell-2 | 300 | 52 | 29 | 26 | 77 | no | no | unique | 253.8 | 0.0 |
| windows | 15x20-hell-2 | hell-2 | 300 | 49 | 23 | 20 | 103 | no | no | few | 513.7 | 0.0 |
| windows | 15x20-hell-2 | hell-2 | 300 | 49 | 24 | 21 | 97 | no | no | few | 180.8 | 0.0 |
| windows | 18x18-hell-2 | hell-2 | 324 | 52 | 24 | 21 | 106 | yes | no | unknown | 760.1 | 80.1 |
| windows | 18x18-hell-2 | hell-2 | 324 | 52 | 27 | 24 | 81 | yes | no | unknown | 760.0 | 80.0 |
| windows | 18x20-hell-2 | hell-2 | 360 | 55 | 27 | 24 | 99 | yes | no | many | 586.9 | 80.1 |
| windows | 18x20-hell-2 | hell-2 | 360 | 55 | 28 | 25 | 94 | yes | no | many | 357.3 | 80.1 |
| windows | 18x20-hell-2 | hell-2 | 360 | 55 | 31 | 28 | 89 | no | no | many | 96.0 | 25.1 |
| windows | 18x20-hell-2 | hell-2 | 360 | 55 | 26 | 23 | 101 | yes | no | many | 516.6 | 80.1 |
| windows | 18x20-hell-2 | hell-2 | 360 | 55 | 28 | 25 | 108 | yes | no | many | 696.2 | 80.1 |
| windows | 18x20-hell-2 | hell-2 | 360 | 55 | 29 | 26 | 101 | no | no | many | 134.4 | 47.6 |
| windows | 18x20-hell-2 | hell-2 | 360 | 55 | 30 | 27 | 101 | no | no | many | 133.2 | 47.5 |
| windows | 18x20-hell-2 | hell-2 | 360 | 52 | 26 | 23 | 84 | yes | no | few | 760.0 | 80.0 |
| windows | 18x20-hell-2 | hell-2 | 360 | 52 | 30 | 27 | 91 | no | no | many | 213.4 | 40.7 |
| windows | 18x20-hell-2 | hell-2 | 360 | 52 | 29 | 26 | 97 | no | no | many | 352.9 | 60.7 |
| windows | 20x20-hell-2 | hell-2 | 400 | 55 | 27 | 24 | 105 | yes | no | few | 760.1 | 80.1 |
| windows | 20x20-hell-2 | hell-2 | 400 | 55 | 26 | 23 | 110 | yes | no | few | 760.1 | 80.1 |
| windows | 20x20-hell-2 | hell-2 | 400 | 55 | 28 | 25 | 98 | yes | no | few | 760.1 | 80.0 |
| windows | 20x21-hell-2 | hell-2 | 420 | 58 | 32 | 29 | 79 | no | no | few | 519.8 | 0.0 |
| windows | 20x21-hell-2 | hell-2 | 420 | 58 | 33 | 30 | 86 | no | no | unique | 124.6 | 0.0 |
| windows | 20x21-hell-2 | hell-2 | 420 | 58 | 34 | 31 | 87 | no | no | unique | 125.6 | 0.0 |
| windows | 20x21-hell-2 | hell-2 | 420 | 58 | 33 | 30 | 93 | no | no | few | 392.7 | 0.0 |
| windows | 20x21-hell-2 | hell-2 | 420 | 58 | 35 | 32 | 82 | no | no | unique | 88.1 | 0.0 |
| windows | 20x21-hell-2 | hell-2 | 420 | 54 | 23 | 20 | 110 | yes | no | many | 362.2 | 80.1 |
| windows | 20x21-hell-2 | hell-2 | 420 | 54 | 24 | 21 | 105 | no | no | many | 112.3 | 76.3 |
| windows | 20x21-hell-2 | hell-2 | 420 | 54 | 25 | 22 | 77 | no | no | many | 57.2 | 26.8 |
| windows | 32x15-hell-2 | hell-2 | 480 | 61 | 34 | 30 | 106 | yes | no | many | 166.4 | 80.1 |
| windows | 32x15-hell-2 | hell-2 | 480 | 61 | 35 | 31 | 99 | yes | no | many | 104.9 | 80.1 |
| windows | 32x15-hell-2 | hell-2 | 480 | 61 | 29 | 25 | 83 | yes | no | many | 263.6 | 80.2 |
| windows | 32x15-hell-2 | hell-2 | 480 | 61 | 28 | 24 | 83 | yes | no | many | 265.6 | 80.1 |
| windows | 32x15-hell-2 | hell-2 | 480 | 61 | 30 | 26 | 78 | yes | no | many | 208.5 | 80.1 |
| windows | 32x15-hell-2 | hell-2 | 480 | 59 | 29 | 25 | 88 | yes | no | many | 720.9 | 80.1 |
| windows | 22x22-hell-2 | hell-2 | 484 | 60 | 36 | 32 | 93 | yes | no | many | 431.4 | 80.0 |
| windows | 22x22-hell-2 | hell-2 | 484 | 60 | 35 | 31 | 93 | yes | no | many | 432.7 | 80.0 |
| windows | 22x22-hell-2 | hell-2 | 484 | 60 | 37 | 33 | 87 | yes | no | many | 341.1 | 80.1 |
| windows | 22x22-hell-2 | hell-2 | 484 | 60 | 33 | 29 | 93 | yes | no | many | 232.2 | 80.0 |
| windows | 22x22-hell-2 | hell-2 | 484 | 60 | 34 | 30 | 86 | yes | no | many | 214.2 | 80.1 |
| windows | 22x22-hell-2 | hell-2 | 484 | 57 | 33 | 30 | 77 | yes | no | many | 74.4 | 80.1 |
| windows | 22x22-hell-2 | hell-2 | 484 | 57 | 31 | 28 | 85 | yes | no | many | 445.3 | 80.1 |
| windows | 22x22-hell-2 | hell-2 | 484 | 57 | 30 | 27 | 85 | yes | no | many | 458.2 | 80.1 |
| windows | 22x22-hell-2 | hell-2 | 484 | 57 | 32 | 29 | 85 | yes | no | many | 443.1 | 80.1 |
| windows | 22x22-hell-2 | hell-2 | 484 | 57 | 34 | 31 | 77 | yes | no | many | 74.3 | 80.1 |
| windows | 22x22-hell-2 | hell-2 | 484 | 57 | 30 | 27 | 99 | yes | no | many | 188.7 | 80.1 |
| windows | 24x24-hell-2 | hell-2 | 576 | 59 | 27 | 23 | 86 | yes | no | many | 201.1 | 80.3 |
| windows | 24x24-hell-2 | hell-2 | 576 | 59 | 25 | 21 | 98 | yes | no | many | 339.3 | 80.4 |
| windows | 24x24-hell-2 | hell-2 | 576 | 59 | 26 | 22 | 98 | yes | no | many | 291.5 | 80.1 |
| windows | 24x24-hell-2 | hell-2 | 576 | 59 | 28 | 24 | 80 | yes | no | many | 133.4 | 80.2 |
| windows | 24x24-hell-2 | hell-2 | 576 | 62 | 30 | 26 | 87 | yes | no | many | 639.8 | 80.3 |
| windows | 24x24-hell-2 | hell-2 | 576 | 62 | 31 | 27 | 86 | yes | no | many | 322.7 | 80.1 |
| windows | 26x26-hell-2 | hell-2 | 676 | 58 | 20 | 17 | 91 | yes | no | many | 98.3 | 80.3 |
| windows | 26x26-hell-2 | hell-2 | 676 | 58 | 24 | 21 | 93 | no | no | few | 379.1 | 0.0 |
| windows | 26x26-hell-2 | hell-2 | 676 | 58 | 25 | 22 | 87 | no | no | few | 185.5 | 0.0 |
| windows | 26x26-hell-2 | hell-2 | 676 | 62 | 28 | 24 | 94 | yes | no | many | 365.5 | 80.3 |
| windows | 26x26-hell-2 | hell-2 | 676 | 62 | 22 | 18 | 83 | yes | no | many | 243.2 | 80.4 |
| windows | 26x26-hell-2 | hell-2 | 676 | 62 | 20 | 16 | 94 | yes | no | many | 732.8 | 80.4 |
| windows | 26x26-hell-2 | hell-2 | 676 | 62 | 21 | 17 | 94 | yes | no | many | 562.8 | 80.3 |
| windows | 32x15-hell-3 | hell-3 | 480 | 74 | 38 | 35 | 78 | no | no | unique | 653.5 | 0.0 |
| windows | 22x22-hell-3 | hell-3 | 484 | 74 | 45 | 42 | 77 | yes | no | many | 129.4 | 80.1 |
| windows | 22x22-hell-3 | hell-3 | 484 | 74 | 42 | 39 | 108 | yes | no | few | 760.0 | 80.1 |
| windows | 22x22-hell-3 | hell-3 | 484 | 74 | 43 | 40 | 96 | yes | no | few | 760.0 | 80.1 |
| windows | 22x22-hell-3 | hell-3 | 484 | 74 | 44 | 41 | 85 | yes | no | few | 760.0 | 80.0 |
| windows | 22x22-hell-3 | hell-3 | 484 | 74 | 45 | 42 | 85 | yes | no | few | 760.0 | 80.0 |
| windows | 22x22-hell-3 | hell-3 | 484 | 74 | 46 | 43 | 85 | yes | no | few | 760.0 | 80.0 |
| windows | 22x22-hell-3 | hell-3 | 484 | 74 | 47 | 44 | 87 | no | no | few | 292.9 | 0.0 |
| windows | 22x22-hell-3 | hell-3 | 484 | 74 | 48 | 45 | 87 | no | no | few | 292.6 | 0.0 |
| windows | 22x22-hell-3 | hell-3 | 484 | 74 | 49 | 46 | 81 | no | no | few | 243.5 | 0.0 |
| windows | 22x22-hell-3 | hell-3 | 484 | 74 | 42 | 39 | 109 | yes | no | few | 760.1 | 80.1 |
| windows | 22x22-hell-3 | hell-3 | 484 | 74 | 43 | 40 | 80 | yes | no | many | 231.4 | 80.1 |
| windows | 24x24-hell-3 | hell-3 | 576 | 83 | 51 | 48 | 91 | yes | no | many | 275.3 | 80.1 |
| windows | 24x24-hell-3 | hell-3 | 576 | 83 | 49 | 46 | 99 | yes | no | many | 714.7 | 80.1 |
| windows | 24x24-hell-3 | hell-3 | 576 | 83 | 50 | 47 | 103 | yes | no | many | 345.1 | 80.1 |
| windows | 24x24-hell-3 | hell-3 | 576 | 86 | 51 | 48 | 77 | yes | no | few | 760.1 | 80.2 |
| windows | 26x26-hell-3 | hell-3 | 676 | 87 | 54 | 51 | 78 | yes | no | many | 303.3 | 80.1 |
| windows | 26x26-hell-3 | hell-3 | 676 | 80 | 48 | 45 | 94 | yes | no | many | 616.4 | 80.1 |
| windows | 26x26-hell-3 | hell-3 | 676 | 80 | 49 | 46 | 88 | yes | no | many | 493.5 | 80.1 |
| windows | 26x26-hell-3 | hell-3 | 676 | 80 | 50 | 47 | 88 | yes | no | many | 490.5 | 80.1 |

## Inputs

| Part | File | SHA-256 (LF line ends) |
|---|---|---|
| failed-sets | docs/improve-generating/evidence/provisional/IGP-05/families-failed-sets.jsonl | 01e0e8286c9d2ac5b89c4166a460f75855db4b89365eb05dec7eabf62f1cb666 |
| scan | docs/improve-generating/evidence/provisional/IGP-05/families-scan.jsonl | 83e5b6e32dc5126dedbe5851b1010a788e1cd63ff537b0cd992731821a82d7b7 |
| windows | docs/improve-generating/evidence/provisional/IGP-05/families-windows.jsonl | 469fb5094a7d366b191ae457d4d48d555a4288403f1623ff5c8a46adaabad552 |
