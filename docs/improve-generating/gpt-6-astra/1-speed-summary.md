| Pentomino speed summary: seconds/request, median/p95 | Basis and reading rule |
|---|---|
| Current = Derived from Measured MP12b1/MP12a; after = Projection, likely | `1-analysis.md` section 4 gives formulas and low/high parameters. T10 is conditional on reaching ten. Area-band ranges are ranges of cell statistics, not pooled percentiles |
| Budgets and availability | 60 s median /115 s p95 /120 s maximum response. Node projections are not BQ passes; `5+4*Node` is only a browser planning sensitivity. New completion rates remain unmeasured |

| Area band / level | Current D | P1-P3 P | P1-P5 P | P1-P8 P | Timing / availability verdict |
|---|---:|---:|---:|---:|---|
| 60-100 Master | 1.16-9.00 /1.69-16.44 | unchanged | unchanged | 0.65-3.88 /0.87-6.94 | Already20/20; retain |
| 144-324 Master | 2.57-5.96 /6.83-18.41 | unchanged | unchanged | 1.23-2.63 /2.99-7.75 | Already20/20; retain |
| 360-484 Master | 3.39-6.04 /5.26-13.23 | unchanged | unchanged | 1.57-2.66 /2.34-5.62 | Already20/20; retain |
| 576-676 Master | 5.91-8.36 /9.17-16.64 | unchanged | unchanged | 2.61-3.62 /3.95-7.03 | Already20/20; census estimates unchanged |
| 87 Nightmare | 5.31/7.64 | 3.64/5.20 | 2.53/3.57 | 1.30/1.77 | Likely4.1x; current20/20 |
| 100 Nightmare | 24.04/68.44 | 18.30/51.97 | 12.30/34.74 | 5.69/15.76 | Likely4.2x; current19/20 |
| 144 Nightmare | 62.14/176.07 | 34.74/98.19 | 23.26/65.56 | 10.61/29.60 | Likely5.9x; current17/20; browser p95/max still miss |
| 196-324 Nightmare | 37.25-112.98 /111.21-151.64 | 11.73-33.18 /35.32-44.46 | 7.92-22.22 /23.64-29.74 | 3.72-10.14 /10.78-13.52 | Likely10-12x; current55-100%, new completion must be measured |
| 360-420 Nightmare | 16.80-24.17 /47.92-113.97 | 6.60-9.87 /19.40-43.97 | 4.50-6.68 /13.03-29.41 | 2.19-3.17 /6.02-13.37 | Likely7.6-7.8x; current95-100% |
| 480-484 Nightmare | 11.57-17.28 /33.93-37.87 | 5.92-7.68 /14.91-19.03 | 4.04-5.22 /10.04-12.79 | 1.98-2.51 /4.67-5.91 | Likely5.8-6.9x; current20/20 |
| 576-676 Nightmare | 18.61-18.65 /31.38-57.29 | 7.70-9.25 /15.49-23.27 | 5.23-6.27 /10.43-15.62 | 2.51-2.98 /4.85-7.18 | Likely6.2-7.4x; current20/20 |

| Hell: conditional construction median/tail, not predicted statistical p95 | Current M/D | P1-P3 P | P1-P5 P | P1-P8 P | Offerability |
|---|---|---:|---:|---:|---|
| 196 Hell 1 | 0/20 ten; response max229.1 | 75.2/149.4 | 43.4/85.8 | 22.4/43.8 | Requires a repeatable window; browser timing still poor |
| 576 Hell 1 | 0/20 ten; response max211.4 | 31.5/88.6 | 18.5/51.1 | 9.8/26.3 | Timing candidate only; D39/maximum response unproved |
| 676 Hell 1 | 9/20; T10 108.72/167.59 | 30.8/142.3 | 18.0/81.7 | 9.6/41.8 | Median plausible; browser tail still poor |
| Other nine Hell 1 cells,215-484 | 0/3 each, no T10; response approximately115 | Conditional30.8-75.2 | Conditional18.0-43.4 | Conditional9.6-22.4 | No measured window, no offer justified |
| Hell 2,300-676; Hell 3,480-676 | 0/3 each; no timed in-band rating | `1+28*c` | `1+16*c` | `1+8.081*c` | `c` and window unknown; packs need genuinely distinct exact entries |

| Low / likely / high benefit examples, final median P | Before D | Low | Likely | High |
|---|---:|---:|---:|---:|
| 12x12 Nightmare | 62.14 | 62.14 | 10.61 | 4.12 |
| 14x14 Nightmare | 112.98 | 112.98 | 10.14 | 3.40 |
| 26x26 Nightmare | 18.61 | 18.61 | 2.98 | 1.19 |
| 576 Hell 1, after P1-P5 conditional | No completed T10 | 71.5 | 18.5 | 7.2 |
