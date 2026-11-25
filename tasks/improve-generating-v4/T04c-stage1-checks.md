# T04c: Stage-1 checks: `v4-check run`, the item manifests and the parity and replay verdicts

| Item | Value |
|---|---|
| Feature, plan | improve-generating, `docs/improve-generating/plan.md` §5.1 ("Observers"; "Parity passes": "the puzzles, work units and skip ordinals are equal with observers absent, with `charge` alone and with `record` and `charge`"; "One running version"), §6 ("Replay", "Observers"); decisions D-V4-04, D-V4-06, D-V4-14; review RV1-04, RV1-06 (R06), RV2-14 (R2-14), RV3-02 (manifest addressing, the joined row's `seedText`) |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T04b |
| Depends on | T04b |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 3 h, machine 0 min (pure cases; nothing locked runs here) |

## Goal

The stage-1 receipt needs, for every prototype arm, the proof that observers change nothing: equal results and skips,
equal total work including uniqueness counts in every mode, the observed modes' charge sequences equal to that work,
and the detail of recorded ratings equal to a canonical re-rating; and the proof that its own records replay in full.
This task writes the tool that runs the stage-1 item manifests, the two manifests, and the two verdicts with their
rules; T04d writes the receipt around them.

## Authority and fixed points

- Review R06 (accepted): explicit, hashed item manifests; rows with `item`, `variant`, `caseId`, `mode`, `status`; the
  exact required set first; absent work evidence is incomplete, never equality; a short generation is an outcome, not
  a tool error; "no candidate obtained" differs from a mismatch and leaves the proof incomplete.
- Review R2-14 (accepted): on the new route every mode needs a complete ledger and equal `totalWork`, and the observed
  modes `units === totalWork` with equal charge sequences; on the legacy route the recorded mode, which bypasses the
  journal, is compared through the charged mode with the complete absent ledger; the `base` recorded total is compared
  with the `v4` legacy recorded total; detail: `scored === rated + rejected`, the first `Math.min(2, scored)` scored
  events rechecked; no scored event is insufficient proof (`incomplete`), a missing detail or an unequal recheck a
  failure.
- T04a's runner and T04b's kinds are used unchanged. The bounds of D-V4-04: a `v4`-family call of a Nightmare or Hell 1
  target has subset ordinals below 2,192; every other call below 2,128 (`core/engine/pack.js:53`).
- No production file changes; no locked run in this task.

## Scope

- Create: `tools/ig-proto/v4-check.mjs` (steps 1 to 3); `tools/ig-proto/plans/V4-T04.parity.json` and
  `tools/ig-proto/plans/V4-T04.replay.json` (step 4).
- Change: `tools/ig-proto/self-test.mjs` (cases appended to `--items`; two modules added to the `--frozen` case of
  step 7), `tools/ig-proto/README.md` (a section; the worker-module list of step 7).
- Do not change: everything else. Guards: `node tools\ig-proto\firewall.mjs check --task V4-T04c --label frozen`,
  expected `files unchanged`; `git status --short -- core generator tests tools/ig-proto/variants tools/ig-proto/lib`,
  expected no output.

## Steps

0. `node tools\ig-proto\firewall.mjs snapshot --task V4-T04c --label frozen`.
1. **`v4-check.mjs`** (`// @ts-check`): `node tools\ig-proto\v4-check.mjs run --task <T> --step <S> --manifest <path>
   --label frozen --source-label <SL> [--horizon-s <H>]` (`parseArgs` values `task`, `step`, `manifest`, `label`,
   `source-label`, `horizon-s`; another label: exit 1 with `v4-check: --label frozen only`). `run` reads the manifest;
   when the manifest's `task` differs from `--task` or its `step` from `--step` it writes `v4-check: manifest <path> is
   <task>/<step>, not <T>/<S>` to stderr and exits 1 before any write (RV3-02: the raw folders derive from the
   manifest, so a mismatch would mix observations of two steps); else it calls `expandManifest`, then `runItems` of
   `lib/items.mjs` with `horizonS` (default 285), and exits with its `exitCode`. The module exports `export async
   function main(argv)`, which returns the exit code, and runs it only when it is the entry point (`if
   (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) { process.exitCode = await
   main(process.argv.slice(2)); }`, the guard of `self-test.mjs:994`). T04d adds the subcommands `summary` and
   `pm4-gate`, T04f `accept`.
2. **Manifests** (format `{ "format": "ig-proto-items", "version": 1, "task", "step", "rows": [...] }`) and `export
   function expandManifest(manifest, rawDir, isV4)` (pure apart from `caseBoard`), which returns the ordered `Item[]`;
   `safe(id)` replaces every character outside `[A-Za-z0-9._-]` by `_`; `entry = caseBoard(row.caseId)`; `isV4(variant)`
   is true when the variant's tree chain (`readTreeInfo(variant).chain`, `lib/records.mjs:141`) contains `v4` (the
   self-test passes `(v) => v !== 'base'`):
   - row `{ kind: 'v4-select', variant, caseId, seedText, modes }`: one item per mode, in order: `id =
     '<step>:<variant>:<caseId>:<seedText>:<mode>'`, payload `{ boardRows: entry.boardRows, levelId: entry.levelId,
     seedText, mode, logDir: join(rawDir, 'logs', safe(id)), row: safe(id), route }` with `route` `base` when
     `!isV4(variant)`, `new` when the level is `nightmare` or `hell-1`, `legacy-recorded` for the mode `record`, else
     `legacy`;
   - row `{ kind: 'v4-generate', variant, caseId, seedText, quantity }`: `id = '<step>:<variant>:<caseId>:<seedText>:gen'`,
     payload `{ boardRows, rotation: entry.rotation, levelId, seedText, uniqueness: 'require', maxActive:
     entry.maxActive, quantity, packPath: join(rawDir, 'packs', safe(id) + '.pack.json'), logDir, row }`;
   - row `{ kind: 'v4-replay', variant, caseId, seedText, puzzles, packStep? }`: items
     `'<step>:<variant>:<caseId>:<seedText>:puzzle-<i>'` for `i` from 0 to `puzzles - 1`, payload `{ packPath,
     puzzleIndex: i }` where `packPath` is the pack path of the generation item `'<P>:<variant>:<caseId>:<seedText>:gen'`
     in `artifactDir('frozen', manifest.task, P)`, `P = packStep ?? step`;
   - a row of another kind, a mode outside `absent`, `charge`, `record`, or two items with one id: throw
     `Error('v4-check: <reason>')` (the run exits 1).
   `rawDir = artifactDir('frozen', manifest.task, manifest.step)`.
3. **Verdicts** (pure exports; each returns `{ verdict, reasons, rows }` with `verdict` one of `pass`, `fail`,
   `incomplete`; `fail` wins over `incomplete`). `rows` are the expanded items joined with their `item-end` lines:
   `{ item, variant, caseId, seedText, mode, route, status, result }` (`seedText` from the manifest row; `status`
   `missing` when there is no end line).
   - `parityVerdict(rows)`. For each `(variant, caseId)` group: the required modes of the manifest present (else
     `incomplete`, naming the item); a row `missing` or `censored`: `incomplete`; `error` or an outcome other than `ok`:
     `fail`. Then, by the group's route:
     - `new` (all three modes): every mode's `ledger.complete` (else `incomplete`, `no complete work evidence`); the
       `digest` of every mode equal; `ledger.totalWork` equal in every mode; in `charge` and `record`: `units ===
       ledger.totalWork` and `chargeUnits` deep-equal between the two; the `record` row's `maxSequence` below 2,192
       (`absent` and `charge` record no event: their `maxSequence`, `events`, `eventKinds` and `eventPhases` are `null`
       and are not read; T04b's report).
     - `legacy` (modes `absent`, `charge`; `legacy-recorded` for `record`): `absent` and `charge` ledgers complete
       (else `incomplete`); the `digest` of every mode equal; the two ledgers' `totalWork` equal; `charge`'s `units ===
       ledger.totalWork`; `record`'s `units === charge.units` and its `chargeUnits` deep-equal to `charge`'s;
       the `record` row's `maxSequence` below 2,128.
     - every `record` row: `events > 0`; `detail.scored === detail.rated + detail.rejected`; `detail.missing === 0`
       (else `fail`); `detail.scored === 0`: `incomplete` (`no completed scored event`); else
       `detail.rechecked.length === Math.min(2, detail.scored)` and every `equal` true (else `fail`).
     - `base` (modes `absent`, `record`): its `absent` digest equals the `absent` digest of `v4` on the same case, its
       `record` `eventsDigest` equals `v4`'s `record` `eventsDigest` and its `record` `units` equal `v4`'s `record`
       `units` (the legacy identity case); the `record` detail rules above.
   - `replayVerdict(rows)`. Per generation item: `ok` with `puzzles >= 1`: the case has records; `no-set` or `no-pack`:
     `incomplete` (`no record obtained for <case>`); `censored`: `incomplete`; `error`: `fail`. Per replay item:
     outcome `no-record`: not a proof; `packSha256` different from its generation item's: `fail`; status `matched`:
     a full proof when `detailStep !== null` (else `fail`, R04); `incomplete`: a finding (listed with reason, work,
     bytes; not a proof); `mismatch` or `unavailable`: `fail`. Each generation case needs at least one `candidate`
     replay with a full proof, else `incomplete` (`no matched candidate replay for <case>`). `pass` needs no `fail`
     and every case proven.
   - Ruling of 2026-11-17 (the first execution's readings, accepted): a group of mixed or unknown routes, a `record`
     row whose `maxSequence` is not a number, an unexpected replay status or outcome: `fail`; only complete ledgers are
     compared; a replay item `censored` or `missing`, or one without its generation row (looked up by variant, case and
     `seedText`; with `packStep` the caller passes both steps' rows, as T05 does): `incomplete`, an `error` one `fail`;
     the findings are `reasons` lines `finding <item>: incomplete (reason, work, bytes)`, also on `pass`; generation and
     replay rows are told apart by the id suffix (`:gen`, `:puzzle-<i>`); a matched calibration replay needs its
     integer `detailStep` too (the frozen `measuringStep`, `core/engine/replay.js:743-756`, names one for every matched
     puzzle with a full claim, the calibration puzzle included: `tests/replay.test.js:1095-1117`).
4. **Manifests.**
   - `plans/V4-T04.parity.json` (`task` `V4-T04`, `step` `parity`), rows in this order (`seedText`
     `ig-v4/parity/<caseId>`; modes `["absent", "charge", "record"]` unless stated): `v4` on `14x14-master`,
     `12x12-nightmare`, `26x26-nightmare`, `26x26-hell-1`; `base` on `14x14-master` with modes `["absent", "record"]`;
     `v4-w760`, `v4-w095` and `v4-w380` on `12x12-nightmare`. 23 items.
   - `plans/V4-T04.replay.json` (`task` `V4-T04`, `step` `replay`; `seedText` `ig-v4/replay/<caseId>`): for each of
     `14x14-master`, `12x12-nightmare`, `26x26-nightmare` in that order, a `v4-generate` row of `v4` with `quantity: 2`,
     then a `v4-replay` row with `puzzles: 2`. 9 items. Ruling of 2026-11-17 (T04e's first run): the third case is
     `14x14-nightmare` (seed `ig-v4/replay/14x14-nightmare`); `26x26-nightmare` under `require` with one pool worker
     found no set within the request's 115-s deadline, and 26x26 is generated only with `any` (the frozen round, the
     bench) and never by the Generator (484 cells, DR-O16). The first observation is archived (T04e).
5. **Self-test** cases appended to `--items` (Tests table).
6. **README.md**: a section "## Stage 1 checks (task pack v4)": the manifests, `v4-check run`, the routes and the
   verdict rules of step 3.
7. **Worker-module audit** (ruling of 2026-11-17, T04b's report): the `--frozen` case `frozen: worker modules do not
   read the label` checks also `ledger.mjs` and `packs.mjs` (its list becomes `['lane-worker.mjs', 'calls.mjs',
   'sets.mjs', 'engine.mjs', 'ledger.mjs', 'packs.mjs']`: T04b's lane worker loads both), and the README's list of
   the modules a worker loads (section "### Source-dependent imports (V4-T01b)") gains them.

## Tests

All in `tools/ig-proto/self-test.mjs --items`, on synthetic rows (no run). `ok(mode, over)` builds an `ok` row of the
group with `digest: 'd'`, a complete ledger of `ratingWork` 7, `countWork` 5, `totalWork` 12, and for `charge` and
`record` `chargeUnits: [3, 4, 5]` (`units` 12, `charges` 3), for `record` `events: 9`, `detail: { rated: 1, rejected:
2, scored: 3, missing: 0, rechecked: [{ equal: true }, { equal: true }] }`, `maxSequence: 40`, merged with `over`.

| Case name | Input | Expected |
|---|---|---|
| `checks: manifest expansion` | `expandManifest` of the two plan manifests, then of a manifest with a mode `twice` and of one with a row repeated | 23 and 9 items in manifest order, the routes `legacy` / `legacy` / `legacy-recorded` on `v4 14x14-master`, `new` on the Nightmare and Hell 1 cases, `base` on `base`; the replay items' `packPath` equal to their generation item's; the last two throw (`unknown mode`, `duplicate item id`) |
| `checks: manifest addressing` | a manifest written by the case to `<artifactDir('selftest', 'checks-addressing')>/m.json` with `task` `V4-T04c-selftest`, `step` `a` and one `v4-select` row; `main(['run', '--task', 'V4-T04c-selftest', '--step', 'b', '--manifest', <its path>, '--label', 'frozen', '--source-label', 'x'])` | returns 1; stderr names `V4-T04c-selftest/a`; `artifactDir('frozen', 'V4-T04c-selftest')` does not exist |
| `checks: parity on the new route` | the three `ok` rows of `v4` on `12x12-nightmare` (route `new`); then the same with the `record` row's `maxSequence` 2,192 | `pass`; then `fail` (naming the sequence) |
| `checks: equal rating work, unequal count work` | the same with the `absent` ledger's `countWork` 6 and `totalWork` 13 | `fail` (total work differs) |
| `checks: equal charged modes, unequal absent total` | the same with only the `absent` ledger's `ratingWork` 6 and `totalWork` 11 (charge and record unchanged) | `fail` |
| `checks: incomplete ledger` | the same with the `absent` ledger `complete: false` | `incomplete` (`no complete work evidence`) |
| `checks: detail counts` | `record` with `detail` `{ rated: 1, rejected: 3, scored: 4, missing: 0, rechecked: [two equal] }`; then `scored: 0, rated: 0, rejected: 0, rechecked: []`; then `missing: 1` | `pass`; `incomplete` (`no completed scored event`); `fail` |
| `checks: legacy route and base` | `v4` on `14x14-master`: `absent` and `charge` (route `legacy`, complete ledgers of `totalWork` 12), `record` (route `legacy-recorded`, ledger not complete, `units` 12, `chargeUnits` as `charge`'s); `base` `absent` and `record` with equal digests, `eventsDigest` and `units` 12; then `base` `record` `units` 13 | `pass`; then `fail` naming the base recorded total |
| `checks: replay proofs` | (a) no rows; (b) generation `ok` with 2 puzzles, replays `incomplete` (reason `work`) twice; (c) calibration `matched` and candidate `matched` with `detailStep` 3; (d) the same with candidate `mismatch`; (e) generation `no-pack` | (a) `incomplete`; (b) `incomplete`, two findings listed; (c) `pass`; (d) `fail`; (e) `incomplete` (`no record obtained`) |

## Documentation

`tools/ig-proto/README.md` (step 6).

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task V4-T04c` | root | every `--items` case passes, exit 0 | 3 min |
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --frozen --task V4-T04c` | root | the ten `--frozen` cases pass (step 7) | 2 min |
| `node tools\ig-proto\firewall.mjs check --task V4-T04c --label frozen` | root | `files unchanged` | 1 min |
| `npm run check` | root | exit 0 | 2 min |

## Stop points and questions

- `QUESTION:` when a manifest expands to other counts than 23 and 9.
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code;
  an ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside
  the scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T04c-B01 | Parity can pass only with equal results, equal complete total work and equal charge sequences in every mode, and full, rechecked detail; replay only with a full candidate proof per case | cases 3 to 9 | self-test output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T04c-T01 | Manifest expansion and routes; a manifest runs only under its own task and step | cases 1 and 2 | self-test output |
| T04c-T02 | The verdict rules of step 3 | cases 3 to 9 | self-test output |
| T04c-T03 | Nothing else changed; formats | guards; `npm run check` | command output |
| T04c-T04 | No module a lane worker loads reads the label, T04b's `ledger.mjs` and `packs.mjs` included (step 7) | the `--frozen` case | self-test output |

## Checklist (the developer confirms every item in the final report)

- [ ] Every step done; nothing outside the scope changed (guard command output)
- [ ] Tests added and green; the full gate green
- [ ] Documents updated (each language)
- [ ] File format checks pass
- [ ] Evidence files written
- [ ] Every AC row has its evidence

## Final report (the developer's reply)

The start and end times; the files changed; the gate results with numbers; each AC row with its evidence; the
questions and rulings; the deviations; and the named items for later.

## Execution log (filled by the orchestrator, not by the developer)

| Item | Value |
|---|---|
| Start, end, duration | 2026-11-17 07:32:48 +07:00 (dispatch, base `4622c22`) to 07:51:36 +07:00 (acceptance): 18 min 48 s; the developer's own times 07:33:10-07:46:17 |
| Waiting for rulings | about 5 min (07:46:17 report to 07:51 ruling); no developer wait (no fix round) |
| Agent id, model | `492b3283-f628-4111-9f58-cdfd33f50312`, claude-sonnet-5.5 |
| Calls; input, output and cache-read tokens | 59 calls; 10,609,450 input, 107,225 output, 10,352,833 cache-read |
| AI credits | 274.90 |
| Questions and rulings | No `QUESTION:`. The developer's twelve readings of silent points, three named items and three gaps were relayed to the pack author; all accepted (07:51). The pack author confirmed from the frozen code that a matched calibration replay always carries an integer `detailStep` (`core/engine/replay.js:743-756`, `tests/replay.test.js:1095-1117`); T04d's `stepEvidence` row join and the replay findings in `stage1.md` amended; pack amendment `6194e6e` |
| Fix rounds | 0 |
| Gates re-run by the orchestrator | `--items`: 18 passed, 0 failed; `--frozen`: 10 passed (case 9 audits six modules); the manifests: `V4-T04.parity.json` 8 rows (23 items), `V4-T04.replay.json` 6 rows (9 items); firewall `check`: 289 production files unchanged; the guard `git status -- core generator tests tools/ig-proto/variants tools/ig-proto/lib`: no output; the historical namespace `frozen/V4-T04` absent; `npm run check`: OK. The developer's five mutations were each caught by a case |
| Commit | this task's commit, `improve-generating T04c: Stage-1 checks: v4-check run, the item manifests and the parity and replay verdicts` |
| Issues and named items | None new; real runs, ledgers and replays are T04e's |
