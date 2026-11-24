# T16 / N-V4-17: mechanism reach on the frozen bounded and uncapped arms

SA-Astra; base `44c335a`. 99 arm/cell groups and 1,500 declared rows (S4 1,120 + S4C 380), all read from existing records.
No rating, generation, search, replay, tree build, git or measured command was run.

**Findings: 0.** The full input index is in `t16-reach.json` (12190 files; index hash 733d92fb038c6ce743986a17c5514a1956948adf7abc9d5985204c8769b53f52).
1500 valid rows; 1140 prototype rows with 1140 complete work ledgers, and 360 legacy-context rows.
23220 prototype starts checked: 19190 against the table prior and 4030 against the matching per-set prior (2660 differing from the table).

**Reach observation:** Rescue and tail canonical re-rating were configured but not exercised: neither phase was entered, and starts, completed profiles and terminal rerate counters are all zero. No rescue benefit or exercised-path correctness claim follows from these rows.

## Definitions and limits

- `close/c4` counts terminal `locate.close`/`locate.c4` markers; incomplete calls have no terminal summary. The `close`/`below` phase markers are also checked in every journal.
- `rescue` is the canonical re-rating inside locate rescue; `tail` is phase E (`rerate`). Started/completed counts come from primitive `begin` and `p` records, including completed profiles of later-terminated calls.
- A started re-rating without a completed profile is reported as unfinished. `end.rerates` increments before P5 checks its budget; a blocked attempt before `begin` is listed separately and is not a completed re-rating.
- All prototype starts are checked against the frozen W table, not against the later shipped-class selection: screen arms use 190 M on Nightmare areas 196-324 and 360+, and 760 M elsewhere; no-screen twins use 760 M.
- Legacy context is separate: Master on `fr-frozen` and all `log-link` calls have `W=null` and `priorCount=null`, the canonical/no-prior logger sentinels. Missing v4 primitive/capability logging is not a legacy ledger failure.
- The table prior uses each start's own K. Hell 1 batch starts use the winning set's matching calibration `wc` when available, otherwise the table. Winning call identity, raw rating and batch dispatch are checked. No batch after a legitimate set failure is not a transport mismatch.
- Stored-recipe transport is not observed: request rows do not save `made` records or packs. This audit does not replace the controlled provenance/replay gates, and reach alone does not establish a mechanism's performance benefit.

## Per-arm summary

| Task | Arm | Groups / rows | v4 / legacy calls | Ended / terminated / unclosed | close / c4 | Rescue starts / completed | Tail starts / completed | Unfinished rescue / tail | Budget-blocked rerate attempts | W / table / per-set mismatches | Unattributed Hell 1 batch |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| V4-S4 | fr-frozen | 35 / 460 | 7530 / 1788 | 7102 / 2216 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 | 0 / 0 / 0 | 0 |
| V4-S4 | fr-frozen-none | 19 / 380 | 7852 / 0 | 5999 / 1853 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 | 0 / 0 / 0 | 0 |
| V4-S4C | fr-frozen-uncapped | 3 / 60 | 1198 / 0 | 896 / 302 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 | 0 / 0 / 0 | 0 |
| V4-S4C | fr-frozen-none-uncapped | 16 / 320 | 6640 / 0 | 5089 / 1551 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 | 0 / 0 / 0 | 0 |
| V4-S4 | log-link | 26 / 280 | 0 / 5717 | 4384 / 1333 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 | 0 / 0 / 0 | 0 |

## Observed rating-profile phases

These are actual `p` records, not inferred from enabled options. Histograms include profiles of later-terminated calls.

| Arm | Completed profiles | Profile phase counts | Phase-entry counts | Recorded W counts |
|---|---:|---|---|---|
| fr-frozen | 37374 | {"p1":6719,"beam":4441,"locate":14821,"window":11393} | {"p1":1788,"beam":819,"locate":7528,"window":3354} | {"190000000":4689,"760000000":2841,"null":1788} |
| fr-frozen-none | 26900 | {"locate":13823,"window":10258,"beam":2819} | {"locate":7846,"window":3224,"beam":477} | {"760000000":7852} |
| fr-frozen-uncapped | 5589 | {"locate":3141,"window":1966,"beam":482} | {"locate":1196,"window":542,"beam":104} | {"190000000":1198} |
| fr-frozen-none-uncapped | 23391 | {"locate":11272,"window":9082,"beam":3037} | {"locate":6637,"window":2795,"beam":476} | {"760000000":6640} |
| log-link | 21639 | {"p1":18461,"beam":2297,"p2":881} | {"p1":5717,"beam":557,"p2":132} | {"null":5717} |

## Per-arm / cell reach and W

`v4` rows test the frozen mechanisms. `legacy` rows are context and use canonical null sentinels. All counts include set, batch and any completion calls.

| Task | Arm | Cell | Path | Rows | Calls (ended / terminated) | close / c4 | Rescue starts / completed | Tail starts / completed | Expected W | W mismatches | Findings |
|---|---|---|---|---:|---:|---:|---:|---:|---|---:|---:|
| V4-S4 | fr-frozen | 10x10-master | legacy | 5 | 123 (105 / 18) | 0 / 0 | 0 / 0 | 0 / 0 | canonical (`null`) | 0 | 0 |
| V4-S4 | fr-frozen | 10x10-nightmare | v4 | 20 | 440 (345 / 95) | 0 / 0 | 0 / 0 | 0 / 0 | 760 M | 0 | 0 |
| V4-S4 | fr-frozen | 12x12-master | legacy | 5 | 95 (80 / 15) | 0 / 0 | 0 / 0 | 0 / 0 | canonical (`null`) | 0 | 0 |
| V4-S4 | fr-frozen | 12x12-nightmare | v4 | 20 | 390 (294 / 96) | 0 / 0 | 0 / 0 | 0 / 0 | 760 M | 0 | 0 |
| V4-S4 | fr-frozen | 14x14-hell-1 | v4 | 20 | 395 (285 / 110) | 0 / 0 | 0 / 0 | 0 / 0 | 760 M | 0 | 0 |
| V4-S4 | fr-frozen | 14x14-master | legacy | 5 | 110 (81 / 29) | 0 / 0 | 0 / 0 | 0 / 0 | canonical (`null`) | 0 | 0 |
| V4-S4 | fr-frozen | 14x14-nightmare | v4 | 20 | 364 (264 / 100) | 0 / 0 | 0 / 0 | 0 / 0 | 190 M | 0 | 0 |
| V4-S4 | fr-frozen | 15x15b10-master | legacy | 5 | 159 (136 / 23) | 0 / 0 | 0 / 0 | 0 / 0 | canonical (`null`) | 0 | 0 |
| V4-S4 | fr-frozen | 15x15b10-nightmare | v4 | 20 | 446 (348 / 98) | 0 / 0 | 0 / 0 | 0 / 0 | 190 M | 0 | 0 |
| V4-S4 | fr-frozen | 15x20-master | legacy | 5 | 137 (112 / 25) | 0 / 0 | 0 / 0 | 0 / 0 | canonical (`null`) | 0 | 0 |
| V4-S4 | fr-frozen | 15x20-nightmare | v4 | 20 | 401 (303 / 98) | 0 / 0 | 0 / 0 | 0 / 0 | 190 M | 0 | 0 |
| V4-S4 | fr-frozen | 16x16-master | legacy | 5 | 104 (81 / 23) | 0 / 0 | 0 / 0 | 0 / 0 | canonical (`null`) | 0 | 0 |
| V4-S4 | fr-frozen | 16x16-nightmare | v4 | 20 | 380 (277 / 103) | 0 / 0 | 0 / 0 | 0 / 0 | 190 M | 0 | 0 |
| V4-S4 | fr-frozen | 18x18-master | legacy | 5 | 97 (75 / 22) | 0 / 0 | 0 / 0 | 0 / 0 | canonical (`null`) | 0 | 0 |
| V4-S4 | fr-frozen | 18x18-nightmare | v4 | 20 | 411 (313 / 98) | 0 / 0 | 0 / 0 | 0 / 0 | 190 M | 0 | 0 |
| V4-S4 | fr-frozen | 18x20-master | legacy | 5 | 111 (88 / 23) | 0 / 0 | 0 / 0 | 0 / 0 | canonical (`null`) | 0 | 0 |
| V4-S4 | fr-frozen | 18x20-nightmare | v4 | 20 | 397 (293 / 104) | 0 / 0 | 0 / 0 | 0 / 0 | 190 M | 0 | 0 |
| V4-S4 | fr-frozen | 20x20-hell-1 | v4 | 20 | 401 (307 / 94) | 0 / 0 | 0 / 0 | 0 / 0 | 760 M | 0 | 0 |
| V4-S4 | fr-frozen | 20x20-master | legacy | 5 | 117 (95 / 22) | 0 / 0 | 0 / 0 | 0 / 0 | canonical (`null`) | 0 | 0 |
| V4-S4 | fr-frozen | 20x20-nightmare | v4 | 20 | 390 (291 / 99) | 0 / 0 | 0 / 0 | 0 / 0 | 190 M | 0 | 0 |
| V4-S4 | fr-frozen | 20x21-master | legacy | 5 | 118 (93 / 25) | 0 / 0 | 0 / 0 | 0 / 0 | canonical (`null`) | 0 | 0 |
| V4-S4 | fr-frozen | 20x21-nightmare | v4 | 20 | 369 (274 / 95) | 0 / 0 | 0 / 0 | 0 / 0 | 190 M | 0 | 0 |
| V4-S4 | fr-frozen | 22x22-master | legacy | 5 | 108 (84 / 24) | 0 / 0 | 0 / 0 | 0 / 0 | canonical (`null`) | 0 | 0 |
| V4-S4 | fr-frozen | 22x22-nightmare | v4 | 20 | 379 (284 / 95) | 0 / 0 | 0 / 0 | 0 / 0 | 190 M | 0 | 0 |
| V4-S4 | fr-frozen | 24x24-hell-1 | v4 | 20 | 443 (347 / 96) | 0 / 0 | 0 / 0 | 0 / 0 | 760 M | 0 | 0 |
| V4-S4 | fr-frozen | 24x24-master | legacy | 5 | 96 (72 / 24) | 0 / 0 | 0 / 0 | 0 / 0 | canonical (`null`) | 0 | 0 |
| V4-S4 | fr-frozen | 24x24-nightmare | v4 | 20 | 377 (283 / 94) | 0 / 0 | 0 / 0 | 0 / 0 | 190 M | 0 | 0 |
| V4-S4 | fr-frozen | 26x26-hell-1 | v4 | 20 | 406 (304 / 102) | 0 / 0 | 0 / 0 | 0 / 0 | 760 M | 0 | 0 |
| V4-S4 | fr-frozen | 26x26-master | legacy | 5 | 98 (73 / 25) | 0 / 0 | 0 / 0 | 0 / 0 | canonical (`null`) | 0 | 0 |
| V4-S4 | fr-frozen | 26x26-nightmare | v4 | 20 | 369 (275 / 94) | 0 / 0 | 0 / 0 | 0 / 0 | 190 M | 0 | 0 |
| V4-S4 | fr-frozen | 32x15-master | legacy | 5 | 102 (78 / 24) | 0 / 0 | 0 / 0 | 0 / 0 | canonical (`null`) | 0 | 0 |
| V4-S4 | fr-frozen | 32x15-nightmare | v4 | 20 | 406 (314 / 92) | 0 / 0 | 0 / 0 | 0 / 0 | 190 M | 0 | 0 |
| V4-S4 | fr-frozen | 3x29-master | legacy | 5 | 94 (69 / 25) | 0 / 0 | 0 / 0 | 0 / 0 | canonical (`null`) | 0 | 0 |
| V4-S4 | fr-frozen | 3x29-nightmare | v4 | 20 | 366 (278 / 88) | 0 / 0 | 0 / 0 | 0 / 0 | 760 M | 0 | 0 |
| V4-S4 | fr-frozen | 6x10-master | legacy | 5 | 119 (101 / 18) | 0 / 0 | 0 / 0 | 0 / 0 | canonical (`null`) | 0 | 0 |
| V4-S4 | fr-frozen-none | 10x10-nightmare | v4 | 20 | 442 (349 / 93) | 0 / 0 | 0 / 0 | 0 / 0 | 760 M | 0 | 0 |
| V4-S4 | fr-frozen-none | 12x12-nightmare | v4 | 20 | 389 (293 / 96) | 0 / 0 | 0 / 0 | 0 / 0 | 760 M | 0 | 0 |
| V4-S4 | fr-frozen-none | 14x14-hell-1 | v4 | 20 | 393 (283 / 110) | 0 / 0 | 0 / 0 | 0 / 0 | 760 M | 0 | 0 |
| V4-S4 | fr-frozen-none | 14x14-nightmare | v4 | 20 | 395 (295 / 100) | 0 / 0 | 0 / 0 | 0 / 0 | 760 M | 0 | 0 |
| V4-S4 | fr-frozen-none | 15x15b10-nightmare | v4 | 20 | 455 (357 / 98) | 0 / 0 | 0 / 0 | 0 / 0 | 760 M | 0 | 0 |
| V4-S4 | fr-frozen-none | 15x20-nightmare | v4 | 20 | 448 (349 / 99) | 0 / 0 | 0 / 0 | 0 / 0 | 760 M | 0 | 0 |
| V4-S4 | fr-frozen-none | 16x16-nightmare | v4 | 20 | 417 (312 / 105) | 0 / 0 | 0 / 0 | 0 / 0 | 760 M | 0 | 0 |
| V4-S4 | fr-frozen-none | 18x18-nightmare | v4 | 20 | 421 (323 / 98) | 0 / 0 | 0 / 0 | 0 / 0 | 760 M | 0 | 0 |
| V4-S4 | fr-frozen-none | 18x20-nightmare | v4 | 20 | 406 (304 / 102) | 0 / 0 | 0 / 0 | 0 / 0 | 760 M | 0 | 0 |
| V4-S4 | fr-frozen-none | 20x20-hell-1 | v4 | 20 | 400 (305 / 95) | 0 / 0 | 0 / 0 | 0 / 0 | 760 M | 0 | 0 |
| V4-S4 | fr-frozen-none | 20x20-nightmare | v4 | 20 | 415 (320 / 95) | 0 / 0 | 0 / 0 | 0 / 0 | 760 M | 0 | 0 |
| V4-S4 | fr-frozen-none | 20x21-nightmare | v4 | 20 | 412 (317 / 95) | 0 / 0 | 0 / 0 | 0 / 0 | 760 M | 0 | 0 |
| V4-S4 | fr-frozen-none | 22x22-nightmare | v4 | 20 | 399 (302 / 97) | 0 / 0 | 0 / 0 | 0 / 0 | 760 M | 0 | 0 |
| V4-S4 | fr-frozen-none | 24x24-hell-1 | v4 | 20 | 442 (346 / 96) | 0 / 0 | 0 / 0 | 0 / 0 | 760 M | 0 | 0 |
| V4-S4 | fr-frozen-none | 24x24-nightmare | v4 | 20 | 398 (302 / 96) | 0 / 0 | 0 / 0 | 0 / 0 | 760 M | 0 | 0 |
| V4-S4 | fr-frozen-none | 26x26-hell-1 | v4 | 20 | 412 (305 / 107) | 0 / 0 | 0 / 0 | 0 / 0 | 760 M | 0 | 0 |
| V4-S4 | fr-frozen-none | 26x26-nightmare | v4 | 20 | 405 (310 / 95) | 0 / 0 | 0 / 0 | 0 / 0 | 760 M | 0 | 0 |
| V4-S4 | fr-frozen-none | 32x15-nightmare | v4 | 20 | 441 (350 / 91) | 0 / 0 | 0 / 0 | 0 / 0 | 760 M | 0 | 0 |
| V4-S4 | fr-frozen-none | 3x29-nightmare | v4 | 20 | 362 (277 / 85) | 0 / 0 | 0 / 0 | 0 / 0 | 760 M | 0 | 0 |
| V4-S4C | fr-frozen-uncapped | 14x14-nightmare | v4 | 20 | 367 (265 / 102) | 0 / 0 | 0 / 0 | 0 / 0 | 190 M | 0 | 0 |
| V4-S4C | fr-frozen-uncapped | 15x15b10-nightmare | v4 | 20 | 453 (353 / 100) | 0 / 0 | 0 / 0 | 0 / 0 | 190 M | 0 | 0 |
| V4-S4C | fr-frozen-uncapped | 16x16-nightmare | v4 | 20 | 378 (278 / 100) | 0 / 0 | 0 / 0 | 0 / 0 | 190 M | 0 | 0 |
| V4-S4C | fr-frozen-none-uncapped | 10x10-nightmare | v4 | 20 | 442 (350 / 92) | 0 / 0 | 0 / 0 | 0 / 0 | 760 M | 0 | 0 |
| V4-S4C | fr-frozen-none-uncapped | 12x12-nightmare | v4 | 20 | 389 (292 / 97) | 0 / 0 | 0 / 0 | 0 / 0 | 760 M | 0 | 0 |
| V4-S4C | fr-frozen-none-uncapped | 14x14-hell-1 | v4 | 20 | 445 (335 / 110) | 0 / 0 | 0 / 0 | 0 / 0 | 760 M | 0 | 0 |
| V4-S4C | fr-frozen-none-uncapped | 15x20-nightmare | v4 | 20 | 451 (352 / 99) | 0 / 0 | 0 / 0 | 0 / 0 | 760 M | 0 | 0 |
| V4-S4C | fr-frozen-none-uncapped | 18x18-nightmare | v4 | 20 | 422 (328 / 94) | 0 / 0 | 0 / 0 | 0 / 0 | 760 M | 0 | 0 |
| V4-S4C | fr-frozen-none-uncapped | 18x20-nightmare | v4 | 20 | 407 (303 / 104) | 0 / 0 | 0 / 0 | 0 / 0 | 760 M | 0 | 0 |
| V4-S4C | fr-frozen-none-uncapped | 20x20-hell-1 | v4 | 20 | 403 (305 / 98) | 0 / 0 | 0 / 0 | 0 / 0 | 760 M | 0 | 0 |
| V4-S4C | fr-frozen-none-uncapped | 20x20-nightmare | v4 | 20 | 413 (319 / 94) | 0 / 0 | 0 / 0 | 0 / 0 | 760 M | 0 | 0 |
| V4-S4C | fr-frozen-none-uncapped | 20x21-nightmare | v4 | 20 | 413 (317 / 96) | 0 / 0 | 0 / 0 | 0 / 0 | 760 M | 0 | 0 |
| V4-S4C | fr-frozen-none-uncapped | 22x22-nightmare | v4 | 20 | 399 (302 / 97) | 0 / 0 | 0 / 0 | 0 / 0 | 760 M | 0 | 0 |
| V4-S4C | fr-frozen-none-uncapped | 24x24-hell-1 | v4 | 20 | 442 (345 / 97) | 0 / 0 | 0 / 0 | 0 / 0 | 760 M | 0 | 0 |
| V4-S4C | fr-frozen-none-uncapped | 24x24-nightmare | v4 | 20 | 392 (299 / 93) | 0 / 0 | 0 / 0 | 0 / 0 | 760 M | 0 | 0 |
| V4-S4C | fr-frozen-none-uncapped | 26x26-hell-1 | v4 | 20 | 408 (305 / 103) | 0 / 0 | 0 / 0 | 0 / 0 | 760 M | 0 | 0 |
| V4-S4C | fr-frozen-none-uncapped | 26x26-nightmare | v4 | 20 | 407 (312 / 95) | 0 / 0 | 0 / 0 | 0 / 0 | 760 M | 0 | 0 |
| V4-S4C | fr-frozen-none-uncapped | 32x15-nightmare | v4 | 20 | 440 (347 / 93) | 0 / 0 | 0 / 0 | 0 / 0 | 760 M | 0 | 0 |
| V4-S4C | fr-frozen-none-uncapped | 3x29-nightmare | v4 | 20 | 367 (278 / 89) | 0 / 0 | 0 / 0 | 0 / 0 | 760 M | 0 | 0 |
| V4-S4 | log-link | 10x10-master | legacy | 5 | 120 (102 / 18) | 0 / 0 | 0 / 0 | 0 / 0 | canonical (`null`) | 0 | 0 |
| V4-S4 | log-link | 10x10-nightmare | legacy | 20 | 376 (285 / 91) | 0 / 0 | 0 / 0 | 0 / 0 | canonical (`null`) | 0 | 0 |
| V4-S4 | log-link | 12x12-master | legacy | 5 | 95 (79 / 16) | 0 / 0 | 0 / 0 | 0 / 0 | canonical (`null`) | 0 | 0 |
| V4-S4 | log-link | 14x14-master | legacy | 5 | 108 (82 / 26) | 0 / 0 | 0 / 0 | 0 / 0 | canonical (`null`) | 0 | 0 |
| V4-S4 | log-link | 15x15b10-master | legacy | 5 | 161 (138 / 23) | 0 / 0 | 0 / 0 | 0 / 0 | canonical (`null`) | 0 | 0 |
| V4-S4 | log-link | 15x20-master | legacy | 5 | 138 (112 / 26) | 0 / 0 | 0 / 0 | 0 / 0 | canonical (`null`) | 0 | 0 |
| V4-S4 | log-link | 16x16-master | legacy | 5 | 104 (82 / 22) | 0 / 0 | 0 / 0 | 0 / 0 | canonical (`null`) | 0 | 0 |
| V4-S4 | log-link | 18x18-master | legacy | 5 | 97 (76 / 21) | 0 / 0 | 0 / 0 | 0 / 0 | canonical (`null`) | 0 | 0 |
| V4-S4 | log-link | 18x18-nightmare | legacy | 20 | 391 (288 / 103) | 0 / 0 | 0 / 0 | 0 / 0 | canonical (`null`) | 0 | 0 |
| V4-S4 | log-link | 18x20-master | legacy | 5 | 112 (88 / 24) | 0 / 0 | 0 / 0 | 0 / 0 | canonical (`null`) | 0 | 0 |
| V4-S4 | log-link | 18x20-nightmare | legacy | 20 | 435 (332 / 103) | 0 / 0 | 0 / 0 | 0 / 0 | canonical (`null`) | 0 | 0 |
| V4-S4 | log-link | 20x20-master | legacy | 5 | 118 (94 / 24) | 0 / 0 | 0 / 0 | 0 / 0 | canonical (`null`) | 0 | 0 |
| V4-S4 | log-link | 20x20-nightmare | legacy | 20 | 365 (269 / 96) | 0 / 0 | 0 / 0 | 0 / 0 | canonical (`null`) | 0 | 0 |
| V4-S4 | log-link | 20x21-master | legacy | 5 | 118 (93 / 25) | 0 / 0 | 0 / 0 | 0 / 0 | canonical (`null`) | 0 | 0 |
| V4-S4 | log-link | 20x21-nightmare | legacy | 20 | 381 (283 / 98) | 0 / 0 | 0 / 0 | 0 / 0 | canonical (`null`) | 0 | 0 |
| V4-S4 | log-link | 22x22-master | legacy | 5 | 106 (82 / 24) | 0 / 0 | 0 / 0 | 0 / 0 | canonical (`null`) | 0 | 0 |
| V4-S4 | log-link | 22x22-nightmare | legacy | 20 | 406 (301 / 105) | 0 / 0 | 0 / 0 | 0 / 0 | canonical (`null`) | 0 | 0 |
| V4-S4 | log-link | 24x24-master | legacy | 5 | 100 (76 / 24) | 0 / 0 | 0 / 0 | 0 / 0 | canonical (`null`) | 0 | 0 |
| V4-S4 | log-link | 24x24-nightmare | legacy | 20 | 377 (285 / 92) | 0 / 0 | 0 / 0 | 0 / 0 | canonical (`null`) | 0 | 0 |
| V4-S4 | log-link | 26x26-master | legacy | 5 | 97 (72 / 25) | 0 / 0 | 0 / 0 | 0 / 0 | canonical (`null`) | 0 | 0 |
| V4-S4 | log-link | 26x26-nightmare | legacy | 20 | 410 (311 / 99) | 0 / 0 | 0 / 0 | 0 / 0 | canonical (`null`) | 0 | 0 |
| V4-S4 | log-link | 32x15-master | legacy | 5 | 104 (83 / 21) | 0 / 0 | 0 / 0 | 0 / 0 | canonical (`null`) | 0 | 0 |
| V4-S4 | log-link | 32x15-nightmare | legacy | 20 | 403 (305 / 98) | 0 / 0 | 0 / 0 | 0 / 0 | canonical (`null`) | 0 | 0 |
| V4-S4 | log-link | 3x29-master | legacy | 5 | 93 (71 / 22) | 0 / 0 | 0 / 0 | 0 / 0 | canonical (`null`) | 0 | 0 |
| V4-S4 | log-link | 3x29-nightmare | legacy | 20 | 385 (295 / 90) | 0 / 0 | 0 / 0 | 0 / 0 | canonical (`null`) | 0 | 0 |
| V4-S4 | log-link | 6x10-master | legacy | 5 | 117 (100 / 17) | 0 / 0 | 0 / 0 | 0 / 0 | canonical (`null`) | 0 | 0 |

## Table-prior reach (prototype cells)

`Different from initial` compares the checked table value with the logger's legacy `startCount`. Per-set overrides are separate, even when they happen to equal the table value.

| Arm | Cell | Table starts checked | Different from initial | Table mismatches | Hell 1 per-set starts checked | Different from table | Per-set mismatches |
|---|---|---:|---:|---:|---:|---:|---:|
| fr-frozen | 10x10-nightmare | 440 | 440 | 0 | 0 | 0 | 0 |
| fr-frozen | 12x12-nightmare | 390 | 390 | 0 | 0 | 0 | 0 |
| fr-frozen | 14x14-hell-1 | 80 | 80 | 0 | 315 | 220 | 0 |
| fr-frozen | 14x14-nightmare | 364 | 364 | 0 | 0 | 0 | 0 |
| fr-frozen | 15x15b10-nightmare | 446 | 446 | 0 | 0 | 0 | 0 |
| fr-frozen | 15x20-nightmare | 401 | 401 | 0 | 0 | 0 | 0 |
| fr-frozen | 16x16-nightmare | 380 | 255 | 0 | 0 | 0 | 0 |
| fr-frozen | 18x18-nightmare | 411 | 140 | 0 | 0 | 0 | 0 |
| fr-frozen | 18x20-nightmare | 397 | 0 | 0 | 0 | 0 | 0 |
| fr-frozen | 20x20-hell-1 | 80 | 80 | 0 | 321 | 275 | 0 |
| fr-frozen | 20x20-nightmare | 390 | 205 | 0 | 0 | 0 | 0 |
| fr-frozen | 20x21-nightmare | 369 | 0 | 0 | 0 | 0 | 0 |
| fr-frozen | 22x22-nightmare | 379 | 0 | 0 | 0 | 0 | 0 |
| fr-frozen | 24x24-hell-1 | 80 | 80 | 0 | 363 | 233 | 0 |
| fr-frozen | 24x24-nightmare | 377 | 0 | 0 | 0 | 0 | 0 |
| fr-frozen | 26x26-hell-1 | 80 | 80 | 0 | 326 | 143 | 0 |
| fr-frozen | 26x26-nightmare | 369 | 161 | 0 | 0 | 0 | 0 |
| fr-frozen | 32x15-nightmare | 406 | 0 | 0 | 0 | 0 | 0 |
| fr-frozen | 3x29-nightmare | 366 | 132 | 0 | 0 | 0 | 0 |
| fr-frozen-none | 10x10-nightmare | 442 | 442 | 0 | 0 | 0 | 0 |
| fr-frozen-none | 12x12-nightmare | 389 | 389 | 0 | 0 | 0 | 0 |
| fr-frozen-none | 14x14-hell-1 | 80 | 80 | 0 | 313 | 218 | 0 |
| fr-frozen-none | 14x14-nightmare | 395 | 395 | 0 | 0 | 0 | 0 |
| fr-frozen-none | 15x15b10-nightmare | 455 | 455 | 0 | 0 | 0 | 0 |
| fr-frozen-none | 15x20-nightmare | 448 | 448 | 0 | 0 | 0 | 0 |
| fr-frozen-none | 16x16-nightmare | 417 | 284 | 0 | 0 | 0 | 0 |
| fr-frozen-none | 18x18-nightmare | 421 | 152 | 0 | 0 | 0 | 0 |
| fr-frozen-none | 18x20-nightmare | 406 | 0 | 0 | 0 | 0 | 0 |
| fr-frozen-none | 20x20-hell-1 | 80 | 80 | 0 | 320 | 274 | 0 |
| fr-frozen-none | 20x20-nightmare | 415 | 230 | 0 | 0 | 0 | 0 |
| fr-frozen-none | 20x21-nightmare | 412 | 0 | 0 | 0 | 0 | 0 |
| fr-frozen-none | 22x22-nightmare | 399 | 0 | 0 | 0 | 0 | 0 |
| fr-frozen-none | 24x24-hell-1 | 80 | 80 | 0 | 362 | 232 | 0 |
| fr-frozen-none | 24x24-nightmare | 398 | 0 | 0 | 0 | 0 | 0 |
| fr-frozen-none | 26x26-hell-1 | 80 | 80 | 0 | 332 | 144 | 0 |
| fr-frozen-none | 26x26-nightmare | 405 | 183 | 0 | 0 | 0 | 0 |
| fr-frozen-none | 32x15-nightmare | 441 | 0 | 0 | 0 | 0 | 0 |
| fr-frozen-none | 3x29-nightmare | 362 | 126 | 0 | 0 | 0 | 0 |
| fr-frozen-uncapped | 14x14-nightmare | 367 | 367 | 0 | 0 | 0 | 0 |
| fr-frozen-uncapped | 15x15b10-nightmare | 453 | 453 | 0 | 0 | 0 | 0 |
| fr-frozen-uncapped | 16x16-nightmare | 378 | 253 | 0 | 0 | 0 | 0 |
| fr-frozen-none-uncapped | 10x10-nightmare | 442 | 442 | 0 | 0 | 0 | 0 |
| fr-frozen-none-uncapped | 12x12-nightmare | 389 | 389 | 0 | 0 | 0 | 0 |
| fr-frozen-none-uncapped | 14x14-hell-1 | 80 | 80 | 0 | 365 | 268 | 0 |
| fr-frozen-none-uncapped | 15x20-nightmare | 451 | 451 | 0 | 0 | 0 | 0 |
| fr-frozen-none-uncapped | 18x18-nightmare | 422 | 151 | 0 | 0 | 0 | 0 |
| fr-frozen-none-uncapped | 18x20-nightmare | 407 | 0 | 0 | 0 | 0 | 0 |
| fr-frozen-none-uncapped | 20x20-hell-1 | 80 | 80 | 0 | 323 | 277 | 0 |
| fr-frozen-none-uncapped | 20x20-nightmare | 413 | 228 | 0 | 0 | 0 | 0 |
| fr-frozen-none-uncapped | 20x21-nightmare | 413 | 0 | 0 | 0 | 0 | 0 |
| fr-frozen-none-uncapped | 22x22-nightmare | 399 | 0 | 0 | 0 | 0 | 0 |
| fr-frozen-none-uncapped | 24x24-hell-1 | 80 | 80 | 0 | 362 | 233 | 0 |
| fr-frozen-none-uncapped | 24x24-nightmare | 392 | 0 | 0 | 0 | 0 | 0 |
| fr-frozen-none-uncapped | 26x26-hell-1 | 80 | 80 | 0 | 328 | 143 | 0 |
| fr-frozen-none-uncapped | 26x26-nightmare | 407 | 183 | 0 | 0 | 0 | 0 |
| fr-frozen-none-uncapped | 32x15-nightmare | 440 | 0 | 0 | 0 | 0 | 0 |
| fr-frozen-none-uncapped | 3x29-nightmare | 367 | 131 | 0 | 0 | 0 | 0 |

## Hell 1 calibration-to-batch transport

| Arm | Cell | Rows with per-set calibration | Rows differing from table | Set calls | Batch calls | Per-set starts | Differing from table | Table fallback starts | No-batch rows | Unattributed | Prior delta histogram |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| fr-frozen | 14x14-hell-1 | 19 | 13 | 80 | 315 | 315 | 220 | 0 | 1 | 0 | {"0":95,"1":127,"3":16,"-1":77} |
| fr-frozen | 20x20-hell-1 | 20 | 17 | 80 | 321 | 321 | 275 | 0 | 0 | 0 | {"0":46,"1":72,"2":14,"3":26,"4":12,"6":14,"-1":43,"-5":18,"-3":50,"-4":14,"-2":12} |
| fr-frozen | 24x24-hell-1 | 20 | 13 | 80 | 363 | 363 | 233 | 0 | 0 | 0 | {"0":130,"1":97,"2":16,"3":66,"5":18,"-1":36} |
| fr-frozen | 26x26-hell-1 | 20 | 9 | 80 | 326 | 326 | 143 | 0 | 0 | 0 | {"0":183,"1":43,"2":19,"3":34,"-1":47} |
| fr-frozen-none | 14x14-hell-1 | 19 | 13 | 80 | 313 | 313 | 218 | 0 | 1 | 0 | {"0":95,"1":125,"3":16,"-1":77} |
| fr-frozen-none | 20x20-hell-1 | 20 | 17 | 80 | 320 | 320 | 274 | 0 | 0 | 0 | {"0":46,"1":72,"2":14,"3":25,"4":12,"6":14,"-1":43,"-5":18,"-3":50,"-4":14,"-2":12} |
| fr-frozen-none | 24x24-hell-1 | 20 | 13 | 80 | 362 | 362 | 232 | 0 | 0 | 0 | {"0":130,"1":97,"2":16,"3":66,"5":17,"-1":36} |
| fr-frozen-none | 26x26-hell-1 | 20 | 9 | 80 | 332 | 332 | 144 | 0 | 0 | 0 | {"0":188,"1":43,"2":19,"3":34,"-1":48} |
| fr-frozen-none-uncapped | 14x14-hell-1 | 20 | 14 | 80 | 365 | 365 | 268 | 0 | 0 | 0 | {"0":97,"1":138,"3":21,"-1":87,"-2":22} |
| fr-frozen-none-uncapped | 20x20-hell-1 | 20 | 17 | 80 | 323 | 323 | 277 | 0 | 0 | 0 | {"0":46,"1":72,"2":14,"3":25,"4":12,"6":16,"-1":44,"-5":18,"-3":50,"-4":14,"-2":12} |
| fr-frozen-none-uncapped | 24x24-hell-1 | 20 | 13 | 80 | 362 | 362 | 233 | 0 | 0 | 0 | {"0":129,"1":97,"2":16,"3":68,"5":16,"-1":36} |
| fr-frozen-none-uncapped | 26x26-hell-1 | 20 | 9 | 80 | 328 | 328 | 143 | 0 | 0 | 0 | {"0":185,"1":43,"2":19,"3":34,"-1":47} |

## Findings

None. No W/prior mismatch, unattributed batch, disabled-mechanism reach or invalid evidence was found.

## Reproduction and source contracts

```powershell
node docs\improve-generating-stages-2-4\evidence\sa-astra\t16-reach.mjs --label frozen
npm run check
```

- `docs/improve-generating/evidence/frozen/V4-S3/freeze.json`: class boundaries, W values, table id, per-set levels and variant identities.
- `tools/ig-proto/variants/files/log/core/engine/ig-log.js:61-89,91-102,181-198,228-235`: start/phase/profile/end journal schema.
- `tools/ig-proto/variants/files/v4/core/engine/ig-select-v4.js:199-205,473-479,898-925,1099-1107,1129-1140,1289-1296`: table prior, primitive budget check, re-rating counter, close/rescue/tail paths.
- `tools/ig-proto/variants/v4-ps.json` (`ps-7`) and `tools/ig-proto/variants/ps-levels.json`: matching-calibration rule and Hell-1-only transport.
- `tools/ig-proto/fit-read.mjs` and `tools/ig-proto/verdicts.mjs`: declared/raw identity checks and complete interval ledgers for prototype rows.
