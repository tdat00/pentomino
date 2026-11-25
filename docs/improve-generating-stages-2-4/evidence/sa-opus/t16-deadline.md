# T16: B4 and the deadline in stage 4 (V4-S4, the two bounded arms)

freeze.json's deadline: reserve 0.6, set-stage cap 46000 ms, generation stop 115000 ms, response bound 120000 ms.

| Arm | Runs files | Rows | Valid | Deadline violations (response above 120 s) | Latest response (s) | Rows at or after the 115-s stop | By partialReason |
|---|---:|---:|---:|---:|---:|---:|---|
| fr-frozen | 35 | 460 | 460 | 0 | 115.2 (14x14-hell-1~38) | 9 | complete (null) 449; other: layouts-not-found 1; time-limit 9; set:reserve-cut 1 |
| fr-frozen-none | 19 | 380 | 380 | 0 | 115.2 (14x14-hell-1~38) | 9 | complete (null) 370; time-limit 9; set:reserve-cut 1 |

V4-LIVE: receipt pass, 10 rows, responses 5.6 to 41.2 s, set stages at most 18.1 s; coverage 25 of 25; binding live-deadline for fr-frozen, fr-frozen-none, accepted by V4-LIVE.
