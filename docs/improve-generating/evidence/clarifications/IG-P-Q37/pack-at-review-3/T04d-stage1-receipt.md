# T04d: Stage-1 receipt: typed proof receipts, the summary, the PM4 gate and the stage-1 plan

| Item | Value |
|---|---|
| Feature, plan | improve-generating, `docs/improve-generating/plan.md` §5.1 (stage 1 "Preparation": the identity receipt and the certificate re-proved on the frozen source), §9; decisions D-V4-01, D-V4-02, D-V4-08, D-V4-14; drift DR-O05, DR-O13, DR-O15; review RV1-01, RV1-06 (R06), RV1-07, RV1-20, RV2-09 (R2-09) |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T04c |
| Depends on | T04c |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 3 h, machine 0 min (pure cases and dry runs; nothing locked runs here) |

## Goal

Stage 1 ends with a receipt that a later verdict can trust: a typed, configuration-bound proof that names the frozen
source, the arms with their tree and parameter identities, the expected and observed evidence and the hashes of its
inputs, built from the identities stored with the observations, never from freshly computed ones. This task writes the
receipt format shared by every producer and consumer of the pack, the stage-1 summary that writes it, the PM4 gate
and the stage-1 plan, and stops with the exact forecast so that the orchestrator can ask the owner for the stage-1
allowance.

## Authority and fixed points

- Review R2-09 (accepted): the envelope `{ format: 'ig-v4-proof', version: 1, kind, verdict, source, harnessHash, arms,
  coverage, evidence }`; every expected binding is checked before a `verdict: 'pass'` is accepted; missing fields,
  wrong kinds, stale trees or parameters, coverage gaps or mismatched artifact hashes never pass; a substantive failure
  is kept apart from missing evidence; the live-deadline kind has its own required fields and a projection can never
  satisfy it; the summary validates each observation's stored identity against its declared manifest.
- Review R06 (accepted): the PM4 block needs the source identity, a complete run, certified runs, no violation and no
  coverage gap; self-test success from `results` and `done`; `Stage 1: holds.` only when every mandatory block is
  complete and passes.
- The identity arms are those of `plans/IGP-00.json` (`base` and `log` on `26x26-nightmare:0-1,14x14-master:0-1`); R14's
  certificate cases are `plans/IGP-02.json`, reused unchanged under `-Label frozen` (records to
  `evidence/frozen/IGP-02/`).
- No production file changes; no locked run in this task.

## Scope

- Create: `tools/ig-proto/lib/proof.mjs` (step 1); `tools/ig-proto/plans/V4-T04.json` (step 5).
- Change: `tools/ig-proto/v4-check.mjs` (subcommands `summary` and `pm4-gate`, steps 2 to 4), `tools/ig-proto/pm4.mjs`
  (one note, step 6), `tools/ig-proto/self-test.mjs` (cases appended to `--items`), `tools/ig-proto/README.md` (T04c's
  section).
- Do not change: everything else. Guards: `node tools\ig-proto\firewall.mjs check --task V4-T04d --label frozen`,
  expected `files unchanged`; `git status --short -- core generator tests tools/ig-proto/variants tools/ig-proto/lib/items.mjs tools/ig-proto/lib/lanes.mjs tools/ig-proto/lib/lane-worker.mjs`,
  expected no output.

## Steps

0. `node tools\ig-proto\firewall.mjs snapshot --task V4-T04d --label frozen`.
1. **`lib/proof.mjs`** (`// @ts-check`):
   - `export function proofEnvelope({ kind, verdict, source, harnessHash, arms, coverage, evidence, fields })` returns
     `{ format: 'ig-v4-proof', version: 1, kind, verdict, source: { frozenCommit, sourceDigest }, harnessHash, arms:
     [{ id, treeId, paramsHash }], coverage: { expected: [...], observed: [...], missing: [...], censored: [...] },
     evidence: [{ path, sha256 }], ...fields }` (`verdict` one of `pass`, `fail`, `incomplete`; `paramsHash` the
     SHA-256 of `JSON.stringify(params)` of the arm's `ig-tree.json`).
   - `export function proofCheck(receipt, expected)` returns `{ status: 'pass' | 'fail' | 'incomplete', reasons }`;
     `expected = { kind, source, arms, coverage, fields }`. In this order: a missing envelope field, a `format` or
     `version` other than `ig-v4-proof` 1, or a `kind` other than `expected.kind`: `incomplete` (`not a <kind>
     receipt`); `verdict: 'fail'`: `fail` (the receipt's own reasons); `verdict` other than `pass`: `incomplete`;
     `source` not equal to `expected.source`: `incomplete` (`stale source`); an expected arm absent, or its `treeId` or
     `paramsHash` different: `incomplete` (`stale arm <id>`); an expected coverage id not in `coverage.observed`, or
     `missing` or `censored` not empty: `incomplete` (`coverage gap <ids>`); an `evidence` path absent or its current
     SHA-256 different: `incomplete` (`evidence changed <path>`); a field of `expected.fields` not equal: `incomplete`
     (`<field> is <value>`); else `pass`.
   - `export const LIVE_DEADLINE_FIELDS = Object.freeze({ live: true, postHoc: false, workCutoffMs: 115000,
     responseBoundMs: 120000, reserveChecked: true })`: the `fields` a `kind: 'live-deadline'` receipt must carry
     (N-V4-13 produces it; T09c consumes it). A `kind: 'deadline-projection'` receipt is refused by the kind check.
2. **Stored identities** (in `v4-check.mjs`): `export function stepEvidence(task, step, manifestPath, isV4)` reads
   `artifactDir('frozen', task, step)`'s `state.json` and `items.jsonl` and returns `{ identity, rows, problems }`:
   `identity` is the state's stored identity (never recomputed); problems for a missing state; `identity.manifestHash`
   different from `manifestHash(expandManifest(<the declared manifest file>, ..., isV4))`; a log line whose
   `identityHash` differs from `identityHash(identity)`; `identity.frozenCommit` or `identity.sourceDigest` different
   from `FROZEN_COMMIT` or `FROZEN_DIGEST`; a stored tree id different from the current tree's (`stale tree <variant>`:
   the receipt reports both ids and fails the arm binding; observations are never relabelled).
3. **`summary`** (`node tools\ig-proto\v4-check.mjs summary --task <T> --label frozen --source-label <SL>`, unlocked;
   reads only): builds the blocks `source` (`verifySnapshot().ok`, `await sourceDigest() === FROZEN_DIGEST`, and
   `planTree(id, { errors, sources: collectSources() })` errors for every `listVariants()` id), `identity`
   (`evidence/frozen/<task>/identity.json`, expected seeds `26x26-nightmare/0`, `26x26-nightmare/1`, `14x14-master/0`,
   `14x14-master/1` in the record's `seed` form), `pm4` (`evidence/frozen/IGP-02/pm4.json`, `artifactDir('frozen',
   'IGP-02', 'main', 'screens-all-state.json')`, `ensureTree('instr')`), `self-test` (the states of `<task>`,
   `<task>v4`, `<task>f`, `<task>i`, each `artifactDir('frozen', <that task>, 'self-test', 'state.json')`), `parity`
   and `replay` (`stepEvidence` of the two steps with `plans/V4-T04.parity.json` and `plans/V4-T04.replay.json`, then
   T04c's `parityVerdict` and `replayVerdict`; a `stepEvidence` problem makes the block `incomplete`). The block
   verdicts (pure exports, `{ verdict, reasons, rows }`):
   - `pm4Verdict(pm4, screensState, instrTreeId)`: `incomplete` when `pm4` is null (`not run`) or `screensState` is not
     `done`; `fail` when `pm4.meta.source.frozenCommit !== FROZEN_COMMIT`, `pm4.meta.source.sourceDigest !==
     FROZEN_DIGEST`, `pm4.run !== 'main'`, `pm4.meta.trees.instr.treeId !== instrTreeId`,
     `pm4.certificate.violations.length > 0`, `pm4.certificate.certifiedRuns === 0`,
     `pm4.certificate.coverage.gaps.length > 0`, or `coverage.equalCanonical.certified.equal !==
     coverage.equalCanonical.certified.of`; the reasons name each failed condition with its numbers.
   - `selfTestVerdict(state)`: `incomplete` when `state` is null; `pass` when `state.done === true`,
     `state.results.length > 0` and every result has `pass: true`; else `fail` with the failing names.
   - `identityVerdict(identity, expectedSeeds)`: `incomplete` when null or when the seeds differ from `expectedSeeds`;
     `fail` when `summary.failures > 0`, a `mp12b1~base` pair lacks `sameResult: true`, or a `base~log` pair's `level`
     is not `puzzle-identity`.
   - `sourceVerdict(source)`: `pass` when `source.snapshotOk`, `source.digestEqual` and no variant has an error; else
     `fail`.
   - `stage1Verdict(blocks)`: `Stage 1: holds.` when every block passes; else `Stage 1: STOP (<block>: <reasons>;
     ...)` when a block fails, else `Stage 1: INCOMPLETE (<block>: <reasons>; ...)`.
   It writes `evidence/frozen/<task>/stage1.json` = `proofEnvelope({ kind: 'stage1', verdict: <pass when holds, fail
   on STOP, incomplete on INCOMPLETE>, source: { frozenCommit: FROZEN_COMMIT, sourceDigest: <the parity step's stored
   identity> }, harnessHash: <the parity step's stored identity>, arms: <every variant of the two steps with its stored
   tree id and the paramsHash of that tree>, coverage: <expected = every item id of the two manifests, the four
   identity seeds, `pm4`, the four self-test groups; observed, missing and censored from the evidence>, evidence: <the
   paths and SHA-256 of every file read>, fields: { meta: buildMeta({ task, label: 'frozen', kind: 'stage1' }),
   blocks, line } })` and `stage1.md` ("Stage 1 receipt (V4-T04)", the banner, the verdict line, one table per block,
   then the replay findings). Exit 0 when the record was written, whatever the verdict.
4. **`pm4-gate`** (`node tools\ig-proto\v4-check.mjs pm4-gate --label frozen --source-label <SL>`): evaluates the `pm4`
   block alone, prints `pm4-gate: pass` or `pm4-gate: <verdict> (<reasons>)` and exits 0 only on `pass`.
5. **Plan** `plans/V4-T04.json` (format of `plans/IGP-00.json`): `"task": "V4-T04"`, `"allocationMinutes": 25`,
   `"optionalMinutes": 0`, steps:

   | id | locked | repeatUntilDone | projectS | minHorizonS | invocations | node | state |
   |---|---|---|---:|---:|---:|---|---|
   | `firewall-snapshot` | false | | | | | `tools\ig-proto\firewall.mjs snapshot --task V4-T04` | |
   | `trees` | false | | | | | `tools\ig-proto\lib\tree.mjs build base instr log v4 v4-w760 v4-w095 v4-w380` | |
   | `self-test-frozen` | false | | | | | `tools\ig-proto\self-test.mjs --frozen --task V4-T04f` | |
   | `self-test-items` | false | | | | | `tools\ig-proto\self-test.mjs --items --task V4-T04i` | |
   | `self-test` | true | false | 75 | 90 | 1 | `tools\ig-proto\self-test.mjs --task V4-T04` | `V4-T04\self-test\state.json` |
   | `self-test-v4` | true | false | 120 | 135 | 1 | `tools\ig-proto\self-test.mjs --v4 --task V4-T04v4` | `V4-T04v4\self-test\state.json` |
   | `identity-base` | true | true | 120 | 110 | 1 | `tools\ig-proto\arm.mjs run --task V4-T04 --arm base --shard s1 --variant base --workers 4 --cases 26x26-nightmare:0-1,14x14-master:0-1 --row-limit-s 90` | `V4-T04\base\s1\state.json` |
   | `identity-log` | true | true | 120 | 110 | 1 | the same with `--arm log --variant log` | `V4-T04\log\s1\state.json` |
   | `publish-base` | false | | | | | `tools\ig-proto\arm.mjs publish --task V4-T04 --arm base` | |
   | `publish-log` | false | | | | | `tools\ig-proto\arm.mjs publish --task V4-T04 --arm log` | |
   | `identity` | false | | | | | `tools\ig-proto\identity.mjs --task V4-T04 --arms base,log` | |
   | `parity` | true | true | 360 | 150 | 2 | `tools\ig-proto\v4-check.mjs run --task V4-T04 --step parity --manifest tools\ig-proto\plans\V4-T04.parity.json` | `V4-T04\parity\state.json` |
   | `replay` | true | true | 300 | 270 | 3 | `tools\ig-proto\v4-check.mjs run --task V4-T04 --step replay --manifest tools\ig-proto\plans\V4-T04.replay.json` | `V4-T04\replay\state.json` |
   | `summary` | false | | | | | `tools\ig-proto\v4-check.mjs summary --task V4-T04` | |
   | `firewall-check` | false | | | | | `tools\ig-proto\firewall.mjs check --task V4-T04` | |

   The forecast: Σ `projectS` (1,095 s) + 45 s quiet per invocation (9 invocations, 405 s) = 1,500 s, the allocation
   of 25 minutes; the guard is 1,875 s. The replay step's `minHorizonS` 270 admits one generation per invocation
   (T04a: `e + 245 <= H - 15`), hence its three invocations.
6. **`pm4.mjs`**: the last entry of the report's `notes` (`pm4.mjs:1296`, the text starting `'Provisional: measured on
   the rating-v3 runtime`) becomes `run.label === 'frozen' ? 'Frozen: measured on the frozen source \`3fc65f4\` (task
   pack v4, V4-T04): the certificate re-proved on the cases of R14; the plan\'s \`W\` list (95, 190, 380 M) is
   unchanged.' : <the existing text>`.
7. **Self-test** cases appended to `--items` (Tests table).
8. **README.md**: T04c's section gains the receipt envelope and `proofCheck`'s rules, the stored-identity rule, the
   order of the two plans (IGP-02 under `-Label frozen` first, then V4-T04), `summary`, `pm4-gate` and the meaning of
   `INCOMPLETE`.
9. **Dry runs and smoke check** (unlocked): the two dry runs of the gates table; then `node tools\ig-proto\v4-check.mjs
   summary --task V4-T04 --label frozen --source-label "frozen 3fc65f4"` with nothing run yet writes a `stage1.json`
   with `verdict: 'incomplete'` and a `stage1.md` whose line is `Stage 1: INCOMPLETE (...)` and whose `source` block
   passes; then delete `docs/improve-generating/evidence/frozen/V4-T04/` (T04e writes it again).

## Tests

All in `tools/ig-proto/self-test.mjs --items`, on synthetic records (no run). `E` = a complete live-deadline fixture:
`proofEnvelope({ kind: 'live-deadline', verdict: 'pass', source: S, harnessHash: 'h', arms: [{ id: 'fr-frozen', treeId:
't1', paramsHash: 'p1' }], coverage: { expected: ['14x14-nightmare~0'], observed: ['14x14-nightmare~0'], missing: [],
censored: [] }, evidence: [<one temporary file and its hash>], fields: LIVE_DEADLINE_FIELDS })`; `X` = the matching
expectation.

| Case name | Input | Expected |
|---|---|---|
| `proof: receipts are typed and bound` | `proofCheck` of: (a) `{ verdict: 'pass' }`; (b) `E` with `kind: 'deadline-projection'` and no `postHoc` field; (c) `E` with the arm's `treeId` `'t2'`; (d) `E` with `fields.reserveChecked: false`; (e) `E` with the temporary file changed after hashing; (f) `E`; (g) `E` with `verdict: 'fail'` | (a) `incomplete`; (b) `incomplete` (`not a live-deadline receipt`); (c) `incomplete` (`stale arm fr-frozen`); (d) `incomplete`; (e) `incomplete` (`evidence changed`); (f) `pass`; (g) `fail` |
| `proof: stored identities` | `stepEvidence` on a synthetic step folder whose state's `manifestHash` differs from the declared manifest's; then one whose log has a line with another `identityHash` | the first problem names the manifest; the second the log line |
| `proof: PM4 block` | (a) null; (b) a record with `violations: []`, `certifiedRuns: 40`, `gaps: []`, `equalCanonical.certified` 40 of 40, the frozen commit and digest, `run: 'main'`, matching tree id, state `done`; (c) the same with `gaps: ['no scap0 run observed']`; (d) with state `done: false` | (a) `incomplete`; (b) `pass`; (c) `fail` naming the gap; (d) `incomplete` |
| `proof: stage-1 line` | blocks all `pass`; one `incomplete`; one `fail` and one `incomplete` | `Stage 1: holds.`; `Stage 1: INCOMPLETE (...)`; `Stage 1: STOP (...)` |

## Documentation

`tools/ig-proto/README.md` (step 8).

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task V4-T04d` | root | every `--items` case passes, exit 0 | 3 min |
| `pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\IGP-02.json -Label frozen -SourceLabel 'frozen 3fc65f4' -ApprovedRoundMinutes 92 -DryRun` | root | every locked step `go`; the forecast line with allocation 1,500 s and guard 1,875 s (digits grouped by the culture) | 1 min |
| `pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\V4-T04.json -Label frozen -SourceLabel 'frozen 3fc65f4' -ApprovedRoundMinutes 92 -DryRun` | root | fifteen steps, every locked step `go`; the forecast line with allocation 1,500 s and guard 1,875 s | 1 min |
| step 9's summary | root | `Stage 1: INCOMPLETE (...)`; `source` passes | 2 min |
| `node tools\ig-proto\firewall.mjs check --task V4-T04d --label frozen` | root | `files unchanged` | 1 min |
| `npm run check` | root | exit 0 | 2 min |

## Stop points and questions

- **Stop and report at the end of this task** with both dry-run forecasts and the stage-1 total of check-list §1
  (requested, pending the owner's answer). No locked step runs here: T04e starts only with the owner's stage-1
  allowance (check-list §3.4).
- `QUESTION:` when a dry run lists other steps than the table or a forecast exceeds its guard.
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code;
  an ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside
  the scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T04d-B01 | The stage-1 runs are fully specified and priced before any machine time is asked for | both dry-run forecasts | runner output |
| T04d-B02 | A receipt passes only when typed, complete and bound to the expected source, arms, coverage and evidence; a projection never passes as a live deadline | case 1 | self-test output |
| T04d-B03 | Stage 1 can only hold when every mandatory block is complete and passes, on observations checked against their stored identities | cases 2 to 4 | self-test output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T04d-T01 | `proofCheck`'s order and statuses | case 1 | self-test output |
| T04d-T02 | Stored identities are checked, never recomputed | case 2; review of `stepEvidence` | self-test output; diff |
| T04d-T03 | The PM4 note names the frozen source under `-Label frozen` only | code review | diff |
| T04d-T04 | Nothing else changed; formats | guards; `npm run check` | command output |

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
| Start, end, duration | |
| Waiting for rulings | |
| Agent id, model | |
| Calls; input, output and cache-read tokens | |
| AI credits | |
| Questions and rulings | |
| Fix rounds | |
| Gates re-run by the orchestrator | |
| Commit | |
| Issues and named items | |
