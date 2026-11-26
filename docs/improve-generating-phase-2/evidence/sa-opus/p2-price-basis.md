# Pricing basis from the frozen round (SA-Opus, phase-2 analysis)

Command: `node docs\improve-generating-phase-2\evidence\sa-opus\p2-price-basis.mjs` (read-only).
Rows: `docs/improve-generating/evidence/frozen/{V4-S4,V4-S4C}/<arm>/*.runs.json`; counted seconds:
`tests/artifacts/ig-proto/frozen/<task>/invocations.jsonl` (git-ignored raw logs).

## Per task

| Task | Invocations | Counted s | Counted min |
|---|---:|---:|---:|
| V4-S4 | 94 | 28043.391 | 467.4 |
| V4-S4C | 23 | 9670.158 | 161.2 |

## Per arm

| Task, arm | Rows | Sum of responseMs (s) | Mean per row (s) |
|---|---:|---:|---:|
| V4-S4 fr-frozen | 460 | 7175.0 | 15.60 |
| V4-S4 fr-frozen-none | 380 | 8753.9 | 23.04 |
| V4-S4 log-link | 280 | 5558.1 | 19.85 |
| V4-S4C fr-frozen-none-uncapped | 320 | 7606.0 | 23.77 |
| V4-S4C fr-frozen-uncapped | 60 | 617.1 | 10.28 |

## Per arm and cell

| Task | Arm | Cell | Rows | Reached ten | Mean response (s) | Max response (s) |
|---|---|---|---:|---:|---:|---:|
| V4-S4C | fr-frozen-none-uncapped | 10x10-nightmare | 20 | 20 | 15.94 | 64.5 |
| V4-S4C | fr-frozen-none-uncapped | 12x12-nightmare | 20 | 20 | 23.02 | 38.0 |
| V4-S4C | fr-frozen-none-uncapped | 14x14-hell-1 | 20 | 12 | 100.07 | 167.1 |
| V4-S4C | fr-frozen-none-uncapped | 15x20-nightmare | 20 | 20 | 15.42 | 24.6 |
| V4-S4C | fr-frozen-none-uncapped | 18x18-nightmare | 20 | 20 | 17.58 | 44.5 |
| V4-S4C | fr-frozen-none-uncapped | 18x20-nightmare | 20 | 20 | 17.46 | 35.5 |
| V4-S4C | fr-frozen-none-uncapped | 20x20-hell-1 | 20 | 20 | 39.16 | 75.1 |
| V4-S4C | fr-frozen-none-uncapped | 20x20-nightmare | 20 | 20 | 15.58 | 27.7 |
| V4-S4C | fr-frozen-none-uncapped | 20x21-nightmare | 20 | 20 | 17.90 | 26.9 |
| V4-S4C | fr-frozen-none-uncapped | 22x22-nightmare | 20 | 20 | 11.55 | 24.8 |
| V4-S4C | fr-frozen-none-uncapped | 24x24-hell-1 | 20 | 20 | 31.16 | 68.4 |
| V4-S4C | fr-frozen-none-uncapped | 24x24-nightmare | 20 | 20 | 14.96 | 28.7 |
| V4-S4C | fr-frozen-none-uncapped | 26x26-hell-1 | 20 | 20 | 24.62 | 53.8 |
| V4-S4C | fr-frozen-none-uncapped | 26x26-nightmare | 20 | 20 | 16.49 | 39.1 |
| V4-S4C | fr-frozen-none-uncapped | 32x15-nightmare | 20 | 20 | 14.68 | 32.8 |
| V4-S4C | fr-frozen-none-uncapped | 3x29-nightmare | 20 | 20 | 4.71 | 6.7 |
| V4-S4C | fr-frozen-uncapped | 14x14-nightmare | 20 | 20 | 9.19 | 13.0 |
| V4-S4C | fr-frozen-uncapped | 15x15b10-nightmare | 20 | 20 | 12.90 | 25.1 |
| V4-S4C | fr-frozen-uncapped | 16x16-nightmare | 20 | 20 | 8.77 | 16.0 |
| V4-S4 | fr-frozen-none | 10x10-nightmare | 20 | 20 | 16.13 | 64.6 |
| V4-S4 | fr-frozen-none | 12x12-nightmare | 20 | 20 | 22.98 | 38.0 |
| V4-S4 | fr-frozen-none | 14x14-hell-1 | 20 | 10 | 84.33 | 115.2 |
| V4-S4 | fr-frozen-none | 14x14-nightmare | 20 | 20 | 24.26 | 39.8 |
| V4-S4 | fr-frozen-none | 15x15b10-nightmare | 20 | 20 | 30.15 | 60.7 |
| V4-S4 | fr-frozen-none | 15x20-nightmare | 20 | 20 | 15.37 | 24.4 |
| V4-S4 | fr-frozen-none | 16x16-nightmare | 20 | 20 | 17.73 | 34.9 |
| V4-S4 | fr-frozen-none | 18x18-nightmare | 20 | 20 | 17.45 | 44.1 |
| V4-S4 | fr-frozen-none | 18x20-nightmare | 20 | 20 | 17.58 | 35.7 |
| V4-S4 | fr-frozen-none | 20x20-hell-1 | 20 | 20 | 39.11 | 74.8 |
| V4-S4 | fr-frozen-none | 20x20-nightmare | 20 | 20 | 15.60 | 27.5 |
| V4-S4 | fr-frozen-none | 20x21-nightmare | 20 | 20 | 17.77 | 27.0 |
| V4-S4 | fr-frozen-none | 22x22-nightmare | 20 | 20 | 11.77 | 24.8 |
| V4-S4 | fr-frozen-none | 24x24-hell-1 | 20 | 20 | 31.23 | 68.5 |
| V4-S4 | fr-frozen-none | 24x24-nightmare | 20 | 20 | 15.26 | 28.8 |
| V4-S4 | fr-frozen-none | 26x26-hell-1 | 20 | 20 | 24.58 | 53.6 |
| V4-S4 | fr-frozen-none | 26x26-nightmare | 20 | 20 | 16.70 | 39.1 |
| V4-S4 | fr-frozen-none | 32x15-nightmare | 20 | 20 | 14.95 | 33.3 |
| V4-S4 | fr-frozen-none | 3x29-nightmare | 20 | 20 | 4.76 | 6.7 |
| V4-S4 | fr-frozen | 10x10-master | 5 | 4 | 12.67 | 21.0 |
| V4-S4 | fr-frozen | 10x10-nightmare | 20 | 20 | 16.01 | 64.2 |
| V4-S4 | fr-frozen | 12x12-master | 5 | 5 | 7.91 | 16.4 |
| V4-S4 | fr-frozen | 12x12-nightmare | 20 | 20 | 22.99 | 37.9 |
| V4-S4 | fr-frozen | 14x14-hell-1 | 20 | 10 | 84.46 | 115.2 |
| V4-S4 | fr-frozen | 14x14-master | 5 | 5 | 2.72 | 3.5 |
| V4-S4 | fr-frozen | 14x14-nightmare | 20 | 20 | 9.14 | 13.0 |
| V4-S4 | fr-frozen | 15x15b10-master | 5 | 5 | 6.34 | 13.1 |
| V4-S4 | fr-frozen | 15x15b10-nightmare | 20 | 20 | 12.74 | 23.9 |
| V4-S4 | fr-frozen | 15x20-master | 5 | 5 | 5.09 | 8.5 |
| V4-S4 | fr-frozen | 15x20-nightmare | 20 | 20 | 8.69 | 17.3 |
| V4-S4 | fr-frozen | 16x16-master | 5 | 5 | 2.61 | 5.3 |
| V4-S4 | fr-frozen | 16x16-nightmare | 20 | 20 | 8.74 | 15.9 |
| V4-S4 | fr-frozen | 18x18-master | 5 | 5 | 3.36 | 6.8 |
| V4-S4 | fr-frozen | 18x18-nightmare | 20 | 20 | 8.97 | 16.3 |
| V4-S4 | fr-frozen | 18x20-master | 5 | 5 | 4.22 | 6.4 |
| V4-S4 | fr-frozen | 18x20-nightmare | 20 | 20 | 9.41 | 14.2 |
| V4-S4 | fr-frozen | 20x20-hell-1 | 20 | 20 | 39.05 | 74.9 |
| V4-S4 | fr-frozen | 20x20-master | 5 | 5 | 4.06 | 5.5 |
| V4-S4 | fr-frozen | 20x20-nightmare | 20 | 20 | 8.39 | 15.2 |
| V4-S4 | fr-frozen | 20x21-master | 5 | 5 | 5.55 | 9.1 |
| V4-S4 | fr-frozen | 20x21-nightmare | 20 | 20 | 9.97 | 14.6 |
| V4-S4 | fr-frozen | 22x22-master | 5 | 5 | 5.03 | 8.7 |
| V4-S4 | fr-frozen | 22x22-nightmare | 20 | 20 | 8.26 | 13.2 |
| V4-S4 | fr-frozen | 24x24-hell-1 | 20 | 20 | 31.36 | 69.4 |
| V4-S4 | fr-frozen | 24x24-master | 5 | 5 | 6.84 | 14.2 |
| V4-S4 | fr-frozen | 24x24-nightmare | 20 | 20 | 10.15 | 15.2 |
| V4-S4 | fr-frozen | 26x26-hell-1 | 20 | 20 | 24.49 | 53.4 |
| V4-S4 | fr-frozen | 26x26-master | 5 | 5 | 10.14 | 16.3 |
| V4-S4 | fr-frozen | 26x26-nightmare | 20 | 20 | 11.03 | 18.6 |
| V4-S4 | fr-frozen | 32x15-master | 5 | 5 | 4.83 | 5.8 |
| V4-S4 | fr-frozen | 32x15-nightmare | 20 | 20 | 8.78 | 14.0 |
| V4-S4 | fr-frozen | 3x29-master | 5 | 5 | 1.89 | 2.7 |
| V4-S4 | fr-frozen | 3x29-nightmare | 20 | 20 | 4.80 | 6.8 |
| V4-S4 | fr-frozen | 6x10-master | 5 | 5 | 2.05 | 4.2 |
| V4-S4 | log-link | 10x10-master | 5 | 4 | 12.43 | 21.7 |
| V4-S4 | log-link | 10x10-nightmare | 20 | 20 | 26.12 | 104.9 |
| V4-S4 | log-link | 12x12-master | 5 | 5 | 7.98 | 16.4 |
| V4-S4 | log-link | 14x14-master | 5 | 5 | 2.74 | 3.5 |
| V4-S4 | log-link | 15x15b10-master | 5 | 5 | 6.29 | 13.1 |
| V4-S4 | log-link | 15x20-master | 5 | 5 | 5.25 | 8.7 |
| V4-S4 | log-link | 16x16-master | 5 | 5 | 2.58 | 5.3 |
| V4-S4 | log-link | 18x18-master | 5 | 5 | 3.22 | 6.7 |
| V4-S4 | log-link | 18x18-nightmare | 20 | 18 | 43.76 | 152.4 |
| V4-S4 | log-link | 18x20-master | 5 | 5 | 4.20 | 6.4 |
| V4-S4 | log-link | 18x20-nightmare | 20 | 19 | 35.20 | 128.9 |
| V4-S4 | log-link | 20x20-master | 5 | 5 | 4.05 | 5.5 |
| V4-S4 | log-link | 20x20-nightmare | 20 | 20 | 41.44 | 120.2 |
| V4-S4 | log-link | 20x21-master | 5 | 5 | 5.56 | 9.0 |
| V4-S4 | log-link | 20x21-nightmare | 20 | 19 | 35.35 | 132.1 |
| V4-S4 | log-link | 22x22-master | 5 | 5 | 4.99 | 8.5 |
| V4-S4 | log-link | 22x22-nightmare | 20 | 20 | 14.13 | 32.1 |
| V4-S4 | log-link | 24x24-master | 5 | 5 | 6.99 | 14.8 |
| V4-S4 | log-link | 24x24-nightmare | 20 | 20 | 20.70 | 59.6 |
| V4-S4 | log-link | 26x26-master | 5 | 5 | 10.16 | 16.4 |
| V4-S4 | log-link | 26x26-nightmare | 20 | 20 | 16.74 | 34.8 |
| V4-S4 | log-link | 32x15-master | 5 | 5 | 5.18 | 6.3 |
| V4-S4 | log-link | 32x15-nightmare | 20 | 20 | 17.67 | 65.4 |
| V4-S4 | log-link | 3x29-master | 5 | 5 | 1.84 | 2.7 |
| V4-S4 | log-link | 3x29-nightmare | 20 | 20 | 5.43 | 13.9 |
| V4-S4 | log-link | 6x10-master | 5 | 5 | 2.01 | 4.1 |
