# Set-stage durations of the frozen rows and the 46-s cut (SA-Opus, phase-2 cross-review)

Command: `node docs\improve-generating-phase-2\evidence\sa-opus\p2-xr-setstage.mjs` (read-only).
Rows: `docs/improve-generating/evidence/frozen/{V4-S4,V4-S4C}/<arm>/*.runs.json`, Nightmare and Hell 1 cells; `igSetMs` is the
set stage's duration (the request's start to the set), absent where a row has no set time. The uncapped twins (V4-S4C) run
without the live deadline, so their set stages show what a 46-s cut would meet.

Rows 1340; with a set time 1338; set stage above 46 s: 1 rows, of which 0 reached ten.
Cells with a set stage above 46 s: V4-S4C fr-frozen-none-uncapped 14x14-hell-1.
Rows ended by the 46-s reserve cut (`set:reserve-cut`, no set, so no set time): V4-S4 fr-frozen 14x14-hell-1 rep 33 (46.0 s, 0 puzzles); V4-S4 fr-frozen-none 14x14-hell-1 rep 33 (46.0 s, 0 puzzles).

| Task | Arm | Cell | Rows | With set time | Median set (s) | p95 set (s) | Max set (s) | Above 46 s | Of those, reached ten | Partial reasons |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| V4-S4 | fr-frozen | 10x10-nightmare | 20 | 20 | 1.4 | 7.2 | 10.5 | 0 | 0 | - |
| V4-S4 | fr-frozen | 12x12-nightmare | 20 | 20 | 3.2 | 10.5 | 12.3 | 0 | 0 | - |
| V4-S4 | fr-frozen | 14x14-hell-1 | 20 | 19 | 18.0 | 44.9 | 44.9 | 0 | 0 | time-limit, set:reserve-cut |
| V4-S4 | fr-frozen | 14x14-nightmare | 20 | 20 | 2.1 | 3.5 | 5.0 | 0 | 0 | - |
| V4-S4 | fr-frozen | 15x15b10-nightmare | 20 | 20 | 1.7 | 3.9 | 4.5 | 0 | 0 | - |
| V4-S4 | fr-frozen | 15x20-nightmare | 20 | 20 | 2.1 | 5.7 | 7.2 | 0 | 0 | - |
| V4-S4 | fr-frozen | 16x16-nightmare | 20 | 20 | 1.4 | 4.8 | 6.0 | 0 | 0 | - |
| V4-S4 | fr-frozen | 18x18-nightmare | 20 | 20 | 1.5 | 5.4 | 5.7 | 0 | 0 | - |
| V4-S4 | fr-frozen | 18x20-nightmare | 20 | 20 | 1.5 | 4.2 | 8.1 | 0 | 0 | - |
| V4-S4 | fr-frozen | 20x20-hell-1 | 20 | 20 | 6.6 | 25.2 | 26.3 | 0 | 0 | - |
| V4-S4 | fr-frozen | 20x20-nightmare | 20 | 20 | 1.7 | 3.9 | 4.9 | 0 | 0 | - |
| V4-S4 | fr-frozen | 20x21-nightmare | 20 | 20 | 3.2 | 5.8 | 6.2 | 0 | 0 | - |
| V4-S4 | fr-frozen | 22x22-nightmare | 20 | 20 | 1.9 | 4.7 | 7.6 | 0 | 0 | - |
| V4-S4 | fr-frozen | 24x24-hell-1 | 20 | 20 | 6.9 | 20.5 | 20.8 | 0 | 0 | - |
| V4-S4 | fr-frozen | 24x24-nightmare | 20 | 20 | 2.4 | 6.7 | 6.7 | 0 | 0 | - |
| V4-S4 | fr-frozen | 26x26-hell-1 | 20 | 20 | 4.4 | 20.9 | 21.5 | 0 | 0 | - |
| V4-S4 | fr-frozen | 26x26-nightmare | 20 | 20 | 2.3 | 5.9 | 10.6 | 0 | 0 | - |
| V4-S4 | fr-frozen | 32x15-nightmare | 20 | 20 | 1.6 | 4.1 | 4.8 | 0 | 0 | - |
| V4-S4 | fr-frozen | 3x29-nightmare | 20 | 20 | 1.1 | 2.2 | 4.1 | 0 | 0 | - |
| V4-S4 | fr-frozen-none | 10x10-nightmare | 20 | 20 | 1.4 | 7.4 | 10.4 | 0 | 0 | - |
| V4-S4 | fr-frozen-none | 12x12-nightmare | 20 | 20 | 3.2 | 10.5 | 12.3 | 0 | 0 | - |
| V4-S4 | fr-frozen-none | 14x14-hell-1 | 20 | 19 | 18.0 | 44.8 | 44.8 | 0 | 0 | time-limit, set:reserve-cut |
| V4-S4 | fr-frozen-none | 14x14-nightmare | 20 | 20 | 4.8 | 11.5 | 12.1 | 0 | 0 | - |
| V4-S4 | fr-frozen-none | 15x15b10-nightmare | 20 | 20 | 5.1 | 11.8 | 15.1 | 0 | 0 | - |
| V4-S4 | fr-frozen-none | 15x20-nightmare | 20 | 20 | 3.2 | 7.9 | 8.0 | 0 | 0 | - |
| V4-S4 | fr-frozen-none | 16x16-nightmare | 20 | 20 | 2.4 | 9.2 | 15.7 | 0 | 0 | - |
| V4-S4 | fr-frozen-none | 18x18-nightmare | 20 | 20 | 3.4 | 7.1 | 8.6 | 0 | 0 | - |
| V4-S4 | fr-frozen-none | 18x20-nightmare | 20 | 20 | 3.5 | 8.3 | 13.2 | 0 | 0 | - |
| V4-S4 | fr-frozen-none | 20x20-hell-1 | 20 | 20 | 6.5 | 25.2 | 26.4 | 0 | 0 | - |
| V4-S4 | fr-frozen-none | 20x20-nightmare | 20 | 20 | 3.5 | 7.9 | 8.4 | 0 | 0 | - |
| V4-S4 | fr-frozen-none | 20x21-nightmare | 20 | 20 | 3.9 | 9.9 | 11.5 | 0 | 0 | - |
| V4-S4 | fr-frozen-none | 22x22-nightmare | 20 | 20 | 2.0 | 4.6 | 16.1 | 0 | 0 | - |
| V4-S4 | fr-frozen-none | 24x24-hell-1 | 20 | 20 | 6.9 | 20.3 | 20.8 | 0 | 0 | - |
| V4-S4 | fr-frozen-none | 24x24-nightmare | 20 | 20 | 3.7 | 11.0 | 16.5 | 0 | 0 | - |
| V4-S4 | fr-frozen-none | 26x26-hell-1 | 20 | 20 | 4.4 | 20.9 | 21.4 | 0 | 0 | - |
| V4-S4 | fr-frozen-none | 26x26-nightmare | 20 | 20 | 3.3 | 7.9 | 25.4 | 0 | 0 | - |
| V4-S4 | fr-frozen-none | 32x15-nightmare | 20 | 20 | 2.2 | 5.0 | 7.8 | 0 | 0 | - |
| V4-S4 | fr-frozen-none | 3x29-nightmare | 20 | 20 | 1.1 | 2.1 | 4.1 | 0 | 0 | - |
| V4-S4 | log-link | 10x10-nightmare | 20 | 20 | 4.7 | 14.9 | 16.9 | 0 | 0 | - |
| V4-S4 | log-link | 18x18-nightmare | 20 | 20 | 7.2 | 26.3 | 37.3 | 0 | 0 | time-limit |
| V4-S4 | log-link | 18x20-nightmare | 20 | 20 | 3.9 | 13.8 | 21.2 | 0 | 0 | time-limit |
| V4-S4 | log-link | 20x20-nightmare | 20 | 20 | 9.3 | 26.8 | 34.6 | 0 | 0 | - |
| V4-S4 | log-link | 20x21-nightmare | 20 | 20 | 7.2 | 20.9 | 36.2 | 0 | 0 | time-limit |
| V4-S4 | log-link | 22x22-nightmare | 20 | 20 | 1.5 | 8.6 | 14.9 | 0 | 0 | - |
| V4-S4 | log-link | 24x24-nightmare | 20 | 20 | 5.4 | 10.9 | 16.0 | 0 | 0 | - |
| V4-S4 | log-link | 26x26-nightmare | 20 | 20 | 3.4 | 8.0 | 8.7 | 0 | 0 | - |
| V4-S4 | log-link | 32x15-nightmare | 20 | 20 | 1.9 | 16.7 | 23.5 | 0 | 0 | - |
| V4-S4 | log-link | 3x29-nightmare | 20 | 20 | 0.9 | 3.1 | 4.2 | 0 | 0 | - |
| V4-S4C | fr-frozen-uncapped | 14x14-nightmare | 20 | 20 | 2.1 | 3.6 | 5.1 | 0 | 0 | - |
| V4-S4C | fr-frozen-uncapped | 15x15b10-nightmare | 20 | 20 | 1.7 | 4.0 | 4.5 | 0 | 0 | - |
| V4-S4C | fr-frozen-uncapped | 16x16-nightmare | 20 | 20 | 1.4 | 4.8 | 6.0 | 0 | 0 | - |
| V4-S4C | fr-frozen-none-uncapped | 10x10-nightmare | 20 | 20 | 1.4 | 7.2 | 10.3 | 0 | 0 | - |
| V4-S4C | fr-frozen-none-uncapped | 12x12-nightmare | 20 | 20 | 3.4 | 10.6 | 12.3 | 0 | 0 | - |
| V4-S4C | fr-frozen-none-uncapped | 14x14-hell-1 | 20 | 20 | 18.0 | 44.8 | 52.0 | 1 | 0 | time-limit |
| V4-S4C | fr-frozen-none-uncapped | 15x20-nightmare | 20 | 20 | 3.3 | 7.9 | 8.0 | 0 | 0 | - |
| V4-S4C | fr-frozen-none-uncapped | 18x18-nightmare | 20 | 20 | 3.3 | 7.2 | 8.6 | 0 | 0 | - |
| V4-S4C | fr-frozen-none-uncapped | 18x20-nightmare | 20 | 20 | 3.5 | 8.1 | 13.2 | 0 | 0 | - |
| V4-S4C | fr-frozen-none-uncapped | 20x20-hell-1 | 20 | 20 | 6.6 | 25.2 | 26.5 | 0 | 0 | - |
| V4-S4C | fr-frozen-none-uncapped | 20x20-nightmare | 20 | 20 | 3.5 | 7.9 | 8.5 | 0 | 0 | - |
| V4-S4C | fr-frozen-none-uncapped | 20x21-nightmare | 20 | 20 | 3.9 | 10.0 | 11.7 | 0 | 0 | - |
| V4-S4C | fr-frozen-none-uncapped | 22x22-nightmare | 20 | 20 | 2.0 | 4.6 | 16.1 | 0 | 0 | - |
| V4-S4C | fr-frozen-none-uncapped | 24x24-hell-1 | 20 | 20 | 6.9 | 20.4 | 20.6 | 0 | 0 | - |
| V4-S4C | fr-frozen-none-uncapped | 24x24-nightmare | 20 | 20 | 3.7 | 10.7 | 15.8 | 0 | 0 | - |
| V4-S4C | fr-frozen-none-uncapped | 26x26-hell-1 | 20 | 20 | 4.4 | 21.1 | 21.5 | 0 | 0 | - |
| V4-S4C | fr-frozen-none-uncapped | 26x26-nightmare | 20 | 20 | 3.4 | 7.7 | 25.6 | 0 | 0 | - |
| V4-S4C | fr-frozen-none-uncapped | 32x15-nightmare | 20 | 20 | 2.2 | 5.0 | 7.7 | 0 | 0 | - |
| V4-S4C | fr-frozen-none-uncapped | 3x29-nightmare | 20 | 20 | 1.0 | 2.2 | 3.9 | 0 | 0 | - |
