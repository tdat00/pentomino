# Stage 1 receipt (V4-T04)

> **Frozen source `3fc65f4`.** Measured on frozen 3fc65f4 (source digest e181df2c…). Re-run: pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\V4-T04.json -Label frozen -SourceLabel <label> -LockHelper <path>.

Stage 1: INCOMPLETE (replay: no record obtained for 26x26-nightmare (v4) (no-set))

Receipt verdict `incomplete`; coverage: 41 of 41 expected ids observed, 0 missing, 0 censored.

## source: pass

| check | result |
|---|---|
| the snapshot matches its manifest | true |
| the source digest is the frozen digest | true |
| variants whose edits plan on the frozen sources | 18 of 18 |

## identity: pass

| seed | mp12b1~base | base~log |
|---|---|---|
| landscape/26x26-nightmare/0 | true | puzzle-identity |
| landscape/26x26-nightmare/1 | true | puzzle-identity |
| landscape/14x14-master/0 | true | puzzle-identity |
| landscape/14x14-master/1 | true | puzzle-identity |

## pm4: pass

| check | value |
|---|---|
| run | main |
| instr tree | d51da656c64f |
| certificate violations | 0 |
| certified runs | 862 |
| certified runs equal to their canonical rating | 862 of 862 |
| coverage gaps | 0 |

## self-test: pass

| task | verdict | done | cases | passed |
|---|---|---|---|---|
| V4-T04 | pass | true | 9 | 9 |
| V4-T04v4 | pass | true | 15 | 15 |
| V4-T04f | pass | true | 10 | 10 |
| V4-T04i | pass | true | 26 | 26 |

## parity: pass

| item | status | detail |
|---|---|---|
| parity:v4:14x14-master:ig-v4/parity/14x14-master:absent | completed | ok, total work 1148088666 |
| parity:v4:14x14-master:ig-v4/parity/14x14-master:charge | completed | ok, total work 1148088666 |
| parity:v4:14x14-master:ig-v4/parity/14x14-master:record | completed | ok, total work null |
| parity:v4:12x12-nightmare:ig-v4/parity/12x12-nightmare:absent | completed | ok, total work 4038718747 |
| parity:v4:12x12-nightmare:ig-v4/parity/12x12-nightmare:charge | completed | ok, total work 4038718747 |
| parity:v4:12x12-nightmare:ig-v4/parity/12x12-nightmare:record | completed | ok, total work 4038718747 |
| parity:v4:26x26-nightmare:ig-v4/parity/26x26-nightmare:absent | completed | ok, total work 12032500397 |
| parity:v4:26x26-nightmare:ig-v4/parity/26x26-nightmare:charge | completed | ok, total work 12032500397 |
| parity:v4:26x26-nightmare:ig-v4/parity/26x26-nightmare:record | completed | ok, total work 12032500397 |
| parity:v4:26x26-hell-1:ig-v4/parity/26x26-hell-1:absent | completed | ok, total work 14823027328 |
| parity:v4:26x26-hell-1:ig-v4/parity/26x26-hell-1:charge | completed | ok, total work 14823027328 |
| parity:v4:26x26-hell-1:ig-v4/parity/26x26-hell-1:record | completed | ok, total work 14823027328 |
| parity:base:14x14-master:ig-v4/parity/14x14-master:absent | completed | ok |
| parity:base:14x14-master:ig-v4/parity/14x14-master:record | completed | ok |
| parity:v4-w760:12x12-nightmare:ig-v4/parity/12x12-nightmare:absent | completed | ok, total work 10273954138 |
| parity:v4-w760:12x12-nightmare:ig-v4/parity/12x12-nightmare:charge | completed | ok, total work 10273954138 |
| parity:v4-w760:12x12-nightmare:ig-v4/parity/12x12-nightmare:record | completed | ok, total work 10273954138 |
| parity:v4-w095:12x12-nightmare:ig-v4/parity/12x12-nightmare:absent | completed | ok, total work 1986828331 |
| parity:v4-w095:12x12-nightmare:ig-v4/parity/12x12-nightmare:charge | completed | ok, total work 1986828331 |
| parity:v4-w095:12x12-nightmare:ig-v4/parity/12x12-nightmare:record | completed | ok, total work 1986828331 |
| parity:v4-w380:12x12-nightmare:ig-v4/parity/12x12-nightmare:absent | completed | ok, total work 7106774359 |
| parity:v4-w380:12x12-nightmare:ig-v4/parity/12x12-nightmare:charge | completed | ok, total work 7106774359 |
| parity:v4-w380:12x12-nightmare:ig-v4/parity/12x12-nightmare:record | completed | ok, total work 7106774359 |

## replay: incomplete

| item | status | detail |
|---|---|---|
| replay:v4:14x14-master:ig-v4/replay/14x14-master:gen | completed | ok, 2 puzzles |
| replay:v4:14x14-master:ig-v4/replay/14x14-master:puzzle-0 | completed | calibration matched |
| replay:v4:14x14-master:ig-v4/replay/14x14-master:puzzle-1 | completed | candidate matched |
| replay:v4:12x12-nightmare:ig-v4/replay/12x12-nightmare:gen | completed | ok, 2 puzzles |
| replay:v4:12x12-nightmare:ig-v4/replay/12x12-nightmare:puzzle-0 | completed | calibration matched |
| replay:v4:12x12-nightmare:ig-v4/replay/12x12-nightmare:puzzle-1 | completed | candidate matched |
| replay:v4:26x26-nightmare:ig-v4/replay/26x26-nightmare:gen | completed | no-set, 0 puzzles |
| replay:v4:26x26-nightmare:ig-v4/replay/26x26-nightmare:puzzle-0 | completed | - no-record |
| replay:v4:26x26-nightmare:ig-v4/replay/26x26-nightmare:puzzle-1 | completed | - no-record |

- no record obtained for 26x26-nightmare (v4) (no-set)

## inputs: pass

| path | sha256 |
|---|---|
| tools/ig-proto/plans/V4-T04.parity.json | 964b381cb497 |
| tools/ig-proto/plans/V4-T04.replay.json | c683ba2a2fac |
| tests/artifacts/ig-proto/frozen/V4-T04/parity/state.json | e4e78369857a |
| tests/artifacts/ig-proto/frozen/V4-T04/parity/items.jsonl | d21d59f459aa |
| tests/artifacts/ig-proto/frozen/V4-T04/replay/state.json | 0c14766f2243 |
| tests/artifacts/ig-proto/frozen/V4-T04/replay/items.jsonl | 307f81742224 |
| docs/improve-generating/evidence/frozen/V4-T04/identity.json | fe1a66408c5e |
| docs/improve-generating/evidence/frozen/IGP-02/pm4.json | 1d3b57c0ae37 |
| tests/artifacts/ig-proto/frozen/IGP-02/main/screens-all-state.json | 62bc4e346a37 |
| tests/artifacts/ig-proto/frozen/V4-T04/self-test/state.json | 37b2a618803f |
| tests/artifacts/ig-proto/frozen/V4-T04v4/self-test/state.json | 1c61506440aa |
| tests/artifacts/ig-proto/frozen/V4-T04f/self-test/state.json | f1d5c299ecfc |
| tests/artifacts/ig-proto/frozen/V4-T04i/self-test/state.json | 9fb0a1c587e7 |
| docs/improve-generating/evidence/frozen/V4-T04/inputs/harness.json | 2330d78013f4 |
| docs/improve-generating/evidence/frozen/V4-T04/inputs/base.ig-tree.json | 75937282c7e8 |
| docs/improve-generating/evidence/frozen/V4-T04/inputs/instr.ig-tree.json | 92b8794bedea |
| docs/improve-generating/evidence/frozen/V4-T04/inputs/v4.ig-tree.json | 333789893e1a |
| docs/improve-generating/evidence/frozen/V4-T04/inputs/v4-w095.ig-tree.json | b95407c8eb3b |
| docs/improve-generating/evidence/frozen/V4-T04/inputs/v4-w380.ig-tree.json | d9d34365dea7 |
| docs/improve-generating/evidence/frozen/V4-T04/inputs/v4-w760.ig-tree.json | 1f0b3cbcb60a |

## Replay findings

None.
