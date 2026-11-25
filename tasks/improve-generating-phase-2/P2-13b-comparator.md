# P2-13b: The comparator: cohorts, equality and the stage gates

| Item | Value |
|---|---|
| Feature, plan | `improve-generating-phase-2`; plan §6 (P2-B01 to P2-B07, P2-T01, P2-T12, the phase-2 gate), §7.3 (equality, references, clock-cut rows), §7.4 (gates; (c5)); D-P2-12; review-1 R4; review-2 R2-01, R2-04, R2-05; `contracts.md` C5, C8, C9, C12 to C16 |
| Repository, slot, branch, base | `Q:\git\pentomino`; the slot the orchestrator names (`Q:\git\pentomino-p2-w<n>`, check-list §3.7), branch `p2/P2-13b` from the `gen-v4` head at the start; G-PROTECTED base `97a6326` |
| Lane; starts when merged | T; P2-13e (`loadSnapshot`, the sealed records; with it P2-13d's `p2.mjs`, `gates.mjs` stub and row lines, and P2-13v's `binding.mjs`) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (`claude-sonnet-5.5`) |
| Estimate | developer 3 h; machine: unlocked synthetic tests (no engine) |

## Goal

One command turns a published stage snapshot into the report the SAs read. Equality with the oracle comes first on
every eligible row, and a difference stops the plan as a port defect. Then come the stage's declared gates, computed
with the frozen statistics code. Smoke, `require` and twin rows never mix with the main cohorts. A gate of a later stage
is "not due", never a pass or a veto. The in-process smoke gate of A's group 1 is the same equality.

## Authority and fixed points

- **The statistics**, imported from `tools/ig-proto/verdicts.mjs`, never copied or changed:
  - `ingestRow` (139), `reachedTen` (167), `cappedT10` (179), `completion` (211), `puzzleEvidence` (295);
  - `pairRows` (433), `ratiosOf` (554), `noRegression` (608);
  - `workRule` (914), `classVerdict` (967), `cellGate` (1167), `masterIdentity` (1270), `hell1Report` (1307),
    `population` (1486).

  Options: `quantity` 10, `capMs` 120,000, `responseBoundMs` 120,000, `resamples` 10,000, `resampleSeed` 20261116.
  Reps 20 to 39; Master 20 to 24.
- **The statistical boundary (review-2 R2-01).** A row line keeps the complete C9 `ledger`. Use that ten-field adapter,
  `workLedger(row.ledger)` of P2-13r, at the statistical boundary: it is the `ledger` input of `workRule` and
  `classVerdict`. No frozen function changes.
- **The bindings (review-2 R2-04).** Every snapshot is read with `loadSnapshot` (P2-13e), and a row whose `binding.ok` is
  false is missing evidence for its endpoint: no statistic, population or ratio reads it. S1 also requires each proof
  result's binding, `verifyProof(result, seal)` of `binding.mjs` (P2-13v; `contracts.md` C14).
- **`ingestRow`'s input** is `{ rowKey, caseId, rep, seed, localRep, run }`. A phase-2 row line (C5) gives
  `{ rowKey: fileKey, caseId: cell, rep, seed, localRep: rep, run }`. The frozen oracle files `*.runs.json` are
  `{ meta, shard, rows }`, and their `rows` are already in that shape.
- **Cohorts (R4).** Each row keeps its plan `component`:
  - the main cohorts are `shipped`, `shipped-master`, `baseline-control`, `baseline-master`, `n-mid-no-screen` and
    `non-table`;
  - `smoke` is only a correctness cohort;
  - `require` and `conditional-twin` are cohorts of their own.

  No statistic, population or completion reads a row outside its cohort. For example, 19 main rows plus a smoke row of
  the same cell, arm and rep is an incomplete 20-row cohort.
- **The oracles** (`O` = `docs/improve-generating/evidence/frozen/`):

  | Row | Oracle file |
  |---|---|
  | `gen-v4` arm (`shipped`, `smoke`), cells `14x14-nightmare`, `15x15b10-nightmare`, `16x16-nightmare` | `O/V4-S4/fr-frozen/val-<cell>.runs.json` |
  | `gen-v4` arm, every other Nightmare cell except `26x26-nightmare`, and every Hell 1 cell | `O/V4-S4/fr-frozen-none/val-<cell>.runs.json` |
  | `gen-v4` arm, `26x26-nightmare` (the legacy exception); `today` arm, Nightmare | `O/V4-S4/log-link/val-<cell>.runs.json` |
  | Master, either arm | `O/V4-S4/log-link/master-<cell>.runs.json` |
  | `no-screen` arm | `O/V4-S4/fr-frozen-none/val-<cell>.runs.json` |
  | `conditional-twin`, cells `14x14-nightmare`, `15x15b10-nightmare`, `16x16-nightmare` | `O/V4-S4C/fr-frozen-uncapped/val-<cell>.runs.json` |
  | `conditional-twin`, every other cell | `O/V4-S4C/fr-frozen-none-uncapped/val-<cell>.runs.json` |
  | `non-table`, `require`, or a cell without that file | none |

  The oracle row is the one with the same `rep`.
- **Equality (R4)** of a row against its oracle row:
  - **Both runs exact.** Neither run's `partialReason` is one of the five wall-clock causes `time-limit`,
    `set:time-limit`, `set:reserve-cut`, `response-bound` and `set:response-bound`. Then the two runs need equal
    `acceptedCount`, `details.igSetKey`, ordered `details.igPuzzleKeys` and `details.resultDigest`. This applies to
    deterministic short outcomes too, such as `10x10-master` rep 24 (four puzzles, `layouts-not-found`), and to a
    budget, no-window or other short reason.
  - **A wall-clock cause on either side.** The set keys must be equal, and the keys equal on the common prefix (the
    shorter list's length).
  - **No evidence.** An empty prefix, a missing key list or a missing oracle row is `no-evidence`, never equality.
- **Gates per report stage (R4).** A gate whose stage has not run is `not-due`. A gate missing an expected input is
  `incomplete`, never `pass`.

  | Stage | Gates |
  |---|---|
  | `smoke` | **S1:** the four proof bundles pass: each `E/proofs/<bundle>/result.json` (P2-12c, P2-12e) has `status: 'pass'`, for `observer`, `certificate`, `prior-replay` and `legacy`, and `verifyProof(result, seal)` is ok (C14: the sealed source digest and copies, `quick` false). **S2:** the eight smoke rows are each `equal` or `prefix-equal` (with a wall-clock cause) against their oracle. |
  | `A` | **A1** controls (P2-B02, part): `cellGate('control', ...)` with `todayRows` on `3x29`, `22x22` and `32x15` Nightmare. **A2** sentinels (P2-B04): `cellGate('control', ...)` on `11x11`, `18x19` and `21x21` Nightmare, and `15x15-nightmare` by completion only (at least 18 of 20 reach ten), declared before the run, with no inherited exemption. **A3** `require` (P2-B07): every one of the 50 keys is terminal with a row line; the report gives, per cell and arm, completion, `unique` certificates, budget stops (from `telemetry`) and deadline stops. An `incorrect` `require` row (`ingestRow`) fails A3, with the problem `A3 <key>: incorrect (<its first problem>)`; a row that is `invalid`, `censored` or `error` leaves A3 `incomplete`, with `A3 <key>: status <status>`; each cell entry also gives `statuses` (`completion`'s). `require` rows have no oracle, so A3 is where their correctness shows (ruling on P2-13b, 2026-11-26). **A4:** Read `E/replay-probes/receipt.json` and verify the eight fixed item identities and their sealed source bindings. Pass only if all eight are `measured`, each has a nonempty replayed ordinary-candidate sample, every replay is matched, and every margin is `ok`. Any `failed` item makes the gate fail. Missing, not-measured, censored or not-started required items make it incomplete. Keep all item details in either case. A declared shortfall is not a successful gate. **A5:** Read `E/browser/<check>/receipt.json` for exactly `set-bound`, `batch-prefix`, `late-fence`, `fresh-after-pause`, `no-window-texts` and `screen-capped-step`. Verify their page/check identities and source hashes against the sealed shipping build. Require `status: 'pass'` and each check's completed `CHECK-END` reading at most 60 seconds. Missing receipts or duration/source evidence make the gate incomplete; an observed fail/timeout/error makes it fail. Do not read or require `E/browser/receipt.json`. C12 therefore requires `Owner continuation:` for either failed or incomplete A4/A5 before stage B. (A4 and A5 are review-2 R2-05's text, verbatim; `resourceGate(receipt, seal)` and `browserGate(receipts, seal)` of `binding.mjs`, P2-13v, compute them.) **A6** memory (P2-T12): every A row has `peakProcessBytes` at most 1,536 MiB and `peakAccountedBytes` at most 1,196 MiB, and no `model-too-large` error. |
  | `B` | **B1** failing cells (P2-B01): `cellGate('failing', ...)` on `12x12`, `14x14`, `15x15b10`, `16x16` and `15x20` Nightmare, with `journals` from each row's journal folder. **B2** controls (P2-B02): `cellGate('control', ...)` on `10x10`, `18x20`, `20x20`, `20x21` and `24x24` Nightmare; `18x18-nightmare` by completion only; `26x26-nightmare` by puzzle identity with `log-link`, with its timing reported. **B3** Master (P2-B03): `masterIdentity` per Master cell (`shipped-master` against `baseline-master`). **B4** `n-mid` (P2-B05): `classVerdict` over `14x14`, `15x15b10` and `16x16` Nightmare, with screen rows `gen-v4` and no-screen rows `no-screen`; `ledger` is `workLedger(row.ledger)`, the ten C9 fields (review-2 R2-01); the class's cell gates are B1's. Its status is `pass` for `admitted`, `fail` for `failed` and `incomplete` for `inconclusive`, with `verdict` and `decidedBy` in the detail; any status other than `pass` is P2-B05's owner stop (P2-20). **B5** population (P2-B06): `population` per cell and arm, paired two-sided only where the plan pairs arms; frozen populations labelled `historical`. The pairs are `shipped`/`gen-v4` with `baseline-control`/`today`, `shipped-master`/`gen-v4` with `baseline-master`/`today`, `shipped`/`gen-v4` with `n-mid-no-screen`/`no-screen`, and `non-table`/`gen-v4` with `non-table`/`today` (the sentinels 11x11, 18x19 and 21x21; plan §7.2). B5 is `pass` when every population has complete evidence, else `incomplete`, never `fail`. **B6** Hell 1: `hell1Report` (18 of 20), reported, never gated: `pass` when every cell has its 20 requests, else `incomplete`, never `fail`. **B7** memory, as A6, over B rows. **B8** the conditional coverage: P2-13c's report section, `not-due` until P2-13c exists. |

- **`journals` for B1.** `journals` maps each row's `fileKey` to the parsed lines of its worker journals. They are read
  from `RAW/raw/<fileKey>/journal/` with `readRowFolder` (P2-13r), after each file's SHA-256 is checked against the
  row's receipt (C4). A mismatch, a missing file or any entry of `readRowFolder`'s `problems` (an unparseable line, a
  foreign file) gives `null`, so the gate is `incomplete`: a lost line can hide a `p2` line.

## Scope

- **Change:**
  - `tools/ig-proto/phase2/gates.mjs`: replace the stub with the functions of step 1;
  - `tools/ig-proto/phase2/p2.mjs`: the `report` command;
  - `tools/ig-proto/phase2/p2.test.mjs`: new cases, keeping P2-13d's smoke cases green.
- **Do not change:** anything else. Guard: G-PROTECTED, and G-WORKTREE with

  ```powershell
  $Allowed = @('tools/ig-proto/phase2/gates.mjs', 'tools/ig-proto/phase2/p2.mjs', 'tools/ig-proto/phase2/p2.test.mjs',
    'tasks/improve-generating-phase-2/P2-13b-comparator.md')
  ```

## Steps

1. **`gates.mjs`** exports:
   - `oracleOf(row)`: `{ path, arm }` by the table above, or `null`;
   - `loadOracle(path)`: the file's rows, keyed by `rep`;
   - `equality(run, oracleRun)`: one of `{ verdict: 'equal' }`, `{ verdict: 'prefix-equal', n }`,
     `{ verdict: 'differ', path }` (the first differing field, for example `details.igPuzzleKeys.4`) or
     `{ verdict: 'no-evidence', why }`;
   - `cohorts(rows)`: rows by `component`, then by `arm` and `cell`;
   - `smokeGate(smokeRows, plan, paths)`: S1 and S2 above, as `{ ok, problems }`. `paths` gives the folder `E`, and
     defaults to the real one. It replaces P2-13d's stub with the same call signature; `run-group` passes `paths` from
     its state. Before the call, `run-group` verifies each smoke line with `verifyRow(line, ctxOf(line))`: a refused
     line is left out of `smokeRows`, its problems lead the verdict's `problems` as
     `S2 <key>: binding <problems joined by '; '>`, and `ok` is false (R1 read with review-2 R2-04: an unbound smoke row
     is a missing smoke proof; ruling on P2-13b, 2026-11-26).
   - `stageGates(stage, input)`: the gate records `{ id, stage, status, rows, detail }`, where `status` is `pass`,
     `fail`, `incomplete` or `not-due`;
   - `memory(rows)`: A6 or B7.
2. **`p2.mjs report --stage <smoke|A|B> --out <dir>`.** The snapshots it reads:

   | Stage | Snapshots |
   |---|---|
   | `smoke` | `E/rows-smoke/A.jsonl` |
   | `A` | `E/rows/A.jsonl` |
   | `B` | `E/rows/A.jsonl` and `E/rows/B.jsonl` |

   Each is read with `loadSnapshot(dir, stage, ctxOf)` (P2-13e), which checks its `.sha256` (C8) and gives each row its
   `binding` (review-2 R2-04). A row whose `binding.ok` is false is listed in `report.json`'s `bindings` and excluded
   from every statistic, so its endpoint is incomplete. A key that occurs more than once across the stage's snapshots
   has every one of its lines refused that way, with the problem `duplicate key`. For A4 and A5, `report` also reads
   `E/replay-probes/receipt.json` and the six `E/browser/<check>/receipt.json` files (an absent file is `null`), never
   `E/browser/receipt.json`. Then:
   - it computes the equality of every row that has an oracle;
   - when any row is `differ`, it writes `report.json` with `status: 'port-defect'` and the equality section only,
     and exits 2;
   - otherwise it computes the gates of the stage, marks the gates of later stages `not-due`, and writes
     `report.json` and `report.md` (CRLF). The gates of an earlier stage are not repeated: they stay in that stage's
     report (C12 reads `E/report-A`; P2-21 reads the three reports). `status` is `'complete'` when every due gate has a
     verdict other than `incomplete`, else `'incomplete'`; exit 0.

   `report.json` holds:
   - `stage`, `status`;
   - `snapshots: [{ path, sha256 }]`;
   - `bindings: [{ key, problems }]`, the rows refused by `verifyRow`;
   - `equality: [{ key, oracle, verdict }]`;
   - `gates` (the records of step 1; C12 reads `status`);
   - `ledger`: the output of `ledger --status`.

   `report.md` gives one table per gate with its rows' keys.
3. **Tests.** Write the cases below. Their rows and oracle files are synthetic, written under a self-test state root;
   their gate inputs are hand-made.

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `tools/ig-proto/phase2/p2.test.mjs` | `oracles follow the table` | rows: `shipped` `gen-v4` `14x14-nightmare`; `shipped` `gen-v4` `15x20-nightmare`; `shipped` `gen-v4` `26x26-nightmare`; `baseline-control` `today` `10x10-nightmare`; `shipped-master` `gen-v4` `10x10-master`; `non-table` `gen-v4` `11x11-nightmare`; `conditional-twin` `14x14-hell-1`; `conditional-twin` `16x16-nightmare` | `fr-frozen`; `fr-frozen-none`; `log-link`; `log-link`; `log-link` master file; `null`; `V4-S4C/fr-frozen-none-uncapped`; `V4-S4C/fr-frozen-uncapped` |
| same | `exact equality without a wall-clock cause` | two runs of 10 equal; one differing at key 4; two runs of 4 with `layouts-not-found` and equal keys; a run of 4 `layouts-not-found` against one of 5 | `equal`; `differ details.igPuzzleKeys.4`; `equal`; `differ acceptedCount` |
| same | `prefix equality only for the five causes` | a run of 7 with `set:reserve-cut` against a full run with the same 7 keys; the same with `set:no-window-below` | `prefix-equal 7`; `differ acceptedCount` |
| same | `an empty prefix is no evidence` | a run of 0 with `time-limit` against a full run | `no-evidence` |
| same | `a smoke row does not complete a main cohort` | 19 `shipped` rows (reps 20 to 38) and 1 `smoke` row (rep 39) of one cell | the cell's main gate is `incomplete` |
| same | `a port defect stops interpretation` | one `differ` row among valid rows | `status: 'port-defect'`; no gate section; exit 2 |
| same | `stage A is not vetoed by B's cells` | an A snapshot with complete A1 to A6 inputs | A gates `pass`; every B gate `not-due`; `status: 'complete'` |
| same | `a missing individual browser receipt is incomplete` | the A snapshot with complete inputs except `E/browser/late-fence/receipt.json` | A5 `incomplete`, naming `late-fence`; `status: 'incomplete'` |
| same | `six individual browser receipts pass without an aggregate` | complete A inputs with six valid `E/browser/<check>/receipt.json` files and no `E/browser/receipt.json` | A5 `pass` |
| same | `a not-measured resource item leaves A4 incomplete, and B is refused without the owner line` | complete A inputs, except that the replay receipt has seven measured items and item 7 `not-measured`; then P2-13a's `checkReadout` with this report's `gates` and the five C12 lines without an owner line | A4 `incomplete`, with all eight items in its detail; `checkReadout` `ok` false (the owner line is missing) |
| same | `a row with a bad binding is missing evidence` | an A snapshot in which one control row's raw receipt changed after publication; then a new world built the same way (no receipt change) in which the line of `shipped/gen-v4/3x29-nightmare/25` is appended to `E/rows/A.jsonl` a second time and `A.sha256` is rewritten | that row in `bindings`; its cell's gate `incomplete`; then `bindings` holds that key twice, each with the problems `['duplicate key']`, A1 is `incomplete` with its `3x29-nightmare` entry `incomplete`, and no gate's `rows` holds the key |
| same | `the 18x18 control is completion only` | 20 rows, 19 reaching ten, slow ratios | B2's 18x18 entry passes on completion; no lower bound reported |
| same | `memory limits` | a row with `peakProcessBytes` 1,700 MiB | A6 `fail`, naming the row |
| same | `the smoke gate` | eight smoke rows equal to their oracles and four passing, bound proof results; then one proof `fail`; then one proof with `quick: true`; then one row `differ` | `ok` true; `ok` false naming the bundle; `ok` false naming the bundle (`quick`); `ok` false naming the row |
| same | `an incorrect require row fails A3` | the A world of `stage A is not vetoed by B's cells`, with `errors: [{ phase: 'validation', code: 'invalid-puzzle', message: 'x' }]` added to the run of `require/gen-v4/22x22-nightmare/0` | A3 `fail`, with the problem `A3 require/gen-v4/22x22-nightmare/0: incorrect (error validation/invalid-puzzle)`; that cell entry's `statuses.incorrect` is 1 |
| same | `B5 pairs the sentinels` (may extend `stage B computes its gates from hand-made rows`) | that case's rows plus, with `stage: 'A'`, `non-table` rows of `gen-v4` and of `today` on 11x11, 18x19 and 21x21 Nightmare and of `gen-v4` on 15x15 Nightmare | B5's `paired` entries with the pair `non-table/gen-v4 vs non-table/today` are exactly the cells `11x11-nightmare`, `18x19-nightmare` and `21x21-nightmare`; B5 and B7 stay `pass` |
| same | `stage B reads the bound journals of the failing cells` | a world (the `world` helper writes each row to `<folder>/<row.stage>.jsonl` with its `.sha256`) with the rows of `aRows()` (`runFor: aRun`) and the 100 plan rows of component `shipped`, arm `gen-v4`, stage `B` on 12x12, 14x14, 15x15b10, 16x16 and 15x20 Nightmare. Each of these 100 rows is fabricated with a second journal file `<fileKey>.101.1.jsonl` holding the line `{"t":"worker","pid":101,"threadId":1}`, listed in its receipt; that of `shipped/gen-v4/12x12-nightmare/20` also holds `{"t":"phase","phase":"p2","call":"shipped~gen-v4~12x12-nightmare~20:101:1:1"}`. Then a second world, the same without that `p2` line, with no worker file for `shipped/gen-v4/14x14-nightmare/20` (its receipt lists the row line only) and with the cut last line `{"t":"phase"` (then LF) in the worker file of `shipped/gen-v4/16x16-nightmare/20` | first world: `report --stage B` exits 0; `snapshots` are `rows/A.jsonl` then `rows/B.jsonl`; `bindings` is empty; B1 `fail`; its `12x12-nightmare` entry has `deadEnds` 1 and the reason `dead-end entry: row shipped~gen-v4~12x12-nightmare~20 has 1 call(s) in phase p2`; the four other entries `pass` with `deadEnds` 0. Second world: B1 `incomplete`; the `14x14-nightmare` and `16x16-nightmare` entries each have the one reason `no journal: row <its fileKey>`; the three others `pass` |
| same | `a smoke row with a bad binding stops the group` | `smokeWorld('smoke-unbound')` run with `go(w, G1, { smokeGate }, 'badlabel')`: the fake calibrate's new mode `badlabel` writes `sourceCommit: 'other'`; the `smokeGate` stub records the length of the rows it is given and returns `{ ok: true, problems: [] }` | exit 6; the stub is called once, with 0 rows; `smoke-gate.json` has `ok: false` and a first problem that begins `S2 smoke/gen-v4/10x10-nightmare/20: binding `; only the two smoke rows were launched; the `require` key has no status line |

## Documentation

None here; P2-17 writes the README section.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node --test tools/ig-proto/phase2/p2.test.mjs` | slot root, unlocked (no engine) | `# fail 0`, `# cancelled 0` | 5 min |
| G-CHECK, G-PROTECTED, G-WORKTREE, G-FORMAT | §3.4 | OK lines | 2 min |

## Stop points and questions

- **`QUESTION:`** when a `verdicts.mjs` function's contract does not fit the rows, for example when `cellGate` needs
  journals in another shape. Never adapt `verdicts.mjs`.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-13b-B01 | The plan's phase-2 gate (P2-B01 to P2-B03, P2-B05 and P2-B06 read with P2-T01) and P2-B04 and P2-B07 are computed as declared, per stage | the tests; P2-19's and P2-20's reports | test output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-13b-T01 | P2-T01 and R4: equality before any ratio; prefix equality only for the five wall-clock causes; an empty prefix is no evidence | equality cases | test output |
| P2-13b-T02 | R4: cohorts kept apart; the uncapped n-mid oracle; stage-aware gates with `not-due` | cohort, oracle and stage cases | test output |
| P2-13b-T03 | P2-T12: memory checks | memory case | test output |
| P2-13b-T04 | The smoke gate of A's group 1 | smoke case; P2-13d's smoke cases still green | test output |
| P2-13b-T05 | Review-2 R2-01, R2-04 and R2-05: the ten-field adapter only at the statistical boundary; bound rows and proofs only; A4 and A5 from the receipts that exist | the binding, browser and resource cases | test output |

## Checklist

- [ ] Every step done; nothing outside `$Allowed` changed
- [ ] Tests added and green
- [ ] G-FORMAT, G-CHECK, G-PROTECTED pass
- [ ] Every AC row has its evidence

## Final report

- the start and end times, and the files changed;
- the test pass counts;
- each AC row with its evidence;
- the questions and deviations.

## Execution log

| Item | Value |
|---|---|
| Slot, base SHA | w3, 953f3b261d1e5fc0b2bb9dd285f7af33b79be0e4 |
| Start, end, duration | dispatched 2026-11-25 23:55 +07:00 (developer 23:55:22 to 00:12:39; fix round 00:40:42 to 00:43:30); accepted 2026-11-26 00:45 |
| Waiting for rulings | about 28 min (D1 to D5 and the named items, SA-Opus; queued behind the P2-15 and P2-12d questions) |
| Agent id, model | 2d9a5a0a-8e0e-4809-b33d-6df188db2747, claude-sonnet-5.5 |
| Calls; input, output and cache-read tokens | 64; 13,913,379 / 167,697 / 13,276,745 |
| AI credits | 459.62 |
| Questions and rulings | no QUESTION; five readings ruled by SA-Opus (pack amendment 703f03f): D1 accept; D2 accept (each report holds its own stage's gates); D3 accept (B2 26x26 by equal or prefix-equal against log-link; timing reported, not gated); D4 B4 mapping accepted (P2-20's stop: any B4 status other than pass is P2-B05's owner stop); D4 A3 fix (an incorrect require row fails A3, invalid/censored/error make it incomplete, cells gain statuses); D4 B5 fix (sentinel pair non-table gen-v4 vs today); D5 accepted except duplicates (every line of a repeated key is refused); run-group verifies each smoke line with verifyRow before the smoke gate (S2 <key>: binding ...); journalLinesOf returns null on any readRowFolder problem; four new tests and one extended |
| Fix rounds | 1 (the five ruled fixes and their tests) |
| Gates re-run by the orchestrator (merge gate) | slot static guards; merge gate with every phase-2 test file and G-COPIES (results in the bookkeeping); developer: unlocked p2.test.mjs 72/72 (48.1 s), binding and trace-reader 28/28, G-PROTECTED, G-WORKTREE, G-FORMAT (3 files), G-CHECK OK |
| Commit (slot), commit on `gen-v4` | this commit; its SHA on gen-v4 in the bookkeeping |
| Issues and named items | B8 stays not-due until P2-13c; P2-17 writes the README section; stage B run end to end only for B1 and its journals (B2 to B7 through stageGates with hand-made rows); no real seal, oracle or engine row (lane T) |
