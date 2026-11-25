# Joint report round 1: new numbers (SA-Opus scratch)

Computed by `j1-numbers.mjs` (read-only, unlocked).

## 1. Hell 1 table prior on the piloted boards (fr-base, V4-S2 reps 0-4)

| Board (area) | per-seed median wc/K | seed-balanced wc/K | median accepted share (pooled) | start at the median K |
|---|---|---:|---:|---|
| 14x14-hell-1 | 0.4063 0.3943 0.4000 0.4063 0.3750 | 0.400000 | 0.382353 | K 32: 13 against 12 |
| 20x20-hell-1 | 0.3810 0.3421 0.3205 0.3684 0.3684 | 0.368421 | 0.349624 | K 38: 14 against 13 |
| 24x24-hell-1 | 0.2308 0.2195 0.2000 0.2308 0.1951 | 0.219512 | 0.216899 | K 40: 9 against 9 |
| 26x26-hell-1 | 0.1548 0.2098 0.1923 0.2000 0.2000 | 0.200000 | 0.200000 | K 40: 8 against 8 |

## 2. The P7 spike's timing probe (a timing-proxy scenario)

Per candidate composite: 90 paired items; V4-S2K's item times sum to 69310 ms per pass. T11g's schedule
(`price`, with its per-invocation startup and group start) at the measured durations: 638.79 node s for three candidates
in 3 invocations, so 11.3965 to 12.8965 counted minutes (15 s or 45 s quiet);
the formal price at 1.25 x the durations stays 15.495625 projected / 19.369531 guard.

## 3. The round's account to each owner stop (counted minutes; grant 749, runs pass 747)

Account now 172.3352. "Minimum cap": the account at the assumed spend plus the stop's guard, rounded up; a minimum quote
for that scope, not a grant. "Guard chain": every earlier plan spends its whole guard.

| Stop | guard | minimum cap at the proxy spend | cap if every earlier guard is spent | proxy minutes |
|---|---:|---|---:|---|
| V4-S2B control pilot | 28.243734 | 201 to 201 | 201 | 15.9590 to 19.9590 |
| V4-P7 timing probe (three candidates) | 19.369531 | 208 to 212 | 220 | 11.3965 to 12.8965 |
| V4-S3P: proofs plus the 20 Hell 1 rows | 173.609948 | 374 to 379 | 394 | 40.0160 to 44.0160 |
| V4-LIVE | 43.905504 | 284 to 294 | 438 | 4.0000 to 5.0000 |
| V4-S4 | 1481.858106 | 1726 to 1737 | 1920 | 464.2767 to 509.7767 |
| V4-S4C | 732.021379 | 1441 to 1497 | 2652 | 169.8334 to 182.8334 |

End of the round: 877.817 to 946.817 counted minutes at the proxy spend; 2651.343 if every guard were spent.
