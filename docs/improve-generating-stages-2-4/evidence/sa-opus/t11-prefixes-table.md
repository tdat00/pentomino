# T11: the call prefixes of V4-S3P against the proposed bounded configuration

From `docs/improve-generating/evidence/frozen/V4-S3P/fit-read-prefixes-fr-frozen-none-uncapped.json` (budget hell-1 40000000000 units, bound 4); the largest calls recomputed from the same raw journals with the reader's `callPrefixes` (117 files read).

| Cell | rows | valid | complete | calls | affected | potentially affected | ambiguous | max call spent (G) | bound firings |
|---|---|---|---|---|---|---|---|---|---|
| 14x14-hell-1 | 5 | 5 | 5 | 101 | 0 | 0 | 0 | 22.396 | 0 |
| 20x20-hell-1 | 5 | 5 | 5 | 114 | 0 | 0 | 0 | 13.849 | 0 |
| 24x24-hell-1 | 5 | 5 | 5 | 109 | 0 | 0 | 0 | 5.796 | 0 |
| 26x26-hell-1 | 5 | 5 | 5 | 108 | 0 | 0 | 0 | 8.531 | 0 |

| Cell | calls ended / terminated (with an open primitive) | largest ended batch call (G) | largest terminated call (G) | largest set call (G) | set calls ended (results) / terminated | the three largest calls |
|---|---|---|---|---|---|---|
| 14x14-hell-1 | 78 / 23 (23) | 22.396 | 20.774 | 10.979 | 13 (hit 7, window 6) / 7 | 14x14-hell-1~0 batch 2/0 ended 22.396; 14x14-hell-1~3 batch 3/1 terminated 20.774; 14x14-hell-1~0 batch 3/0 ended 20.643 |
| 20x20-hell-1 | 90 / 24 (24) | 13.849 | 5.119 | 1.936 | 10 (hit 8, window 2) / 10 | 20x20-hell-1~0 batch 6/0 ended 13.849; 20x20-hell-1~1 batch 7/0 ended 7.53; 20x20-hell-1~2 batch 8/0 ended 7.012 |
| 24x24-hell-1 | 86 / 23 (23) | 4.989 | 2.13 | 5.796 | 12 (hit 12) / 8 | 24x24-hell-1~4 set 0 ended 5.796; 24x24-hell-1~3 batch 6/1 ended 4.989; 24x24-hell-1~4 batch 8/0 ended 4.845 |
| 26x26-hell-1 | 83 / 25 (25) | 8.531 | 3.79 | 6.181 | 9 (hit 9) / 11 | 26x26-hell-1~0 batch 8/0 ended 8.531; 26x26-hell-1~0 batch 8/6 ended 6.802; 26x26-hell-1~4 set 0 ended 6.181 |

Largest call over the 20 rows: 22.396 G, so the budget is 1.786 times the largest observed call.
