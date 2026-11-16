# T04d: Stage-1 receipt: typed proof receipts, the summary, the PM4 gate and the stage-1 plan

| Item | Value |
|---|---|
| Feature, plan | improve-generating, `docs/improve-generating/plan.md` §5.1 (stage 1 "Preparation": the identity receipt and the certificate re-proved on the frozen source), §9; decisions D-V4-01, D-V4-02, D-V4-08, D-V4-14; drift DR-O05, DR-O13, DR-O15; review RV1-01, RV1-06 (R06), RV1-07, RV1-20, RV2-09 (R2-09), RV3-06, RV3-09, RV4-03 (R4-03), RV5-01 (R5-01) |
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
- Review RV3-06 (accepted): the producer is bound like the source and the arms: `harnessHash` is part of the expected
  binding and compared; a missing producer binding or another producer is incomplete evidence. The expected coverage
  of stage 1 is declared independently of any receipt (`STAGE1_COVERAGE_EXTRA` and the two manifests); T04f fixes it
  with the accepted receipt in an immutable binding that later consumers use.
- Review R4-03 (accepted): the receipt's evidence is an explicit index of immutable inputs, never "every file read":
  the two declared manifests, the observation states and logs of the two steps, the identity, certificate and
  self-test records, and copies of the mutable tree and harness metadata the receipt relies on, written under
  `docs/improve-generating/evidence/frozen/<task>/inputs/` before the receipt. A historical receipt never depends on
  the current contents of a tree folder, a variant file or a harness file; T04f reserves the namespaces it hashes.
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
1. **`lib/proof.mjs`** (`// @ts-check`; imports `existsSync`, `readFileSync` from `node:fs`, `abs` from `./paths.mjs`,
   `sha256Text` from `./records.mjs`, and `isDeepStrictEqual` from `node:util` for the field and source comparisons):
   - `export function proofEnvelope({ kind, verdict, source, harnessHash, arms, coverage, evidence, fields })` returns
     `{ format: 'ig-v4-proof', version: 1, kind, verdict, source: { frozenCommit, sourceDigest }, harnessHash, arms:
     [{ id, treeId, paramsHash }], coverage: { expected: [...], observed: [...], missing: [...], censored: [...] },
     evidence: [{ path, sha256 }], ...fields }` (`verdict` one of `pass`, `fail`, `incomplete`; `paramsHash` the
     SHA-256 of `JSON.stringify(params)` of the arm's `ig-tree.json`).
   - Evidence hashes: an `evidence` entry's `sha256` is `sha256File(abs(path))` (`lib/records.mjs:30`, the text hash
     with LF line ends) at write time; `path` is relative to `ROOT` with POSIX separators. `export function
     readRepoFile(path)` returns the UTF-8 text of `abs(path)` or `null` when the file is absent.
   - `export function proofCheck(receipt, expected, readFile = readRepoFile)` returns `{ status: 'pass' | 'fail' |
     'incomplete', reasons }`; `expected = { kind, source, harnessHash, arms, coverage, fields }`. In this order: a
     missing envelope field, a `format` or
     `version` other than `ig-v4-proof` 1, or a `kind` other than `expected.kind`: `incomplete` (`not a <kind>
     receipt`); `verdict: 'fail'`: `fail` (the receipt's own reasons); `verdict` other than `pass`: `incomplete`;
     `source` not equal to `expected.source`: `incomplete` (`stale source`); `expected.harnessHash` absent or not a
     string: `incomplete` (`no producer binding`); `receipt.harnessHash !== expected.harnessHash`: `incomplete`
     (`producer changed`); an expected arm absent, or its `treeId` or
     `paramsHash` different: `incomplete` (`stale arm <id>`); an expected coverage id not in `coverage.observed`, or
     `missing` or `censored` not empty: `incomplete` (`coverage gap <ids>`); an `evidence` path for which `readFile`
     returns `null`, or whose `sha256Text(<text>)` differs: `incomplete` (`evidence changed <path>`); a field of
     `expected.fields` not deep-equal to the receipt's field of that name (the envelope root): `incomplete`
     (`<field> is <value>`); else `pass`.
   - `export const LIVE_DEADLINE_FIELDS = Object.freeze({ live: true, postHoc: false, workCutoffMs: 115000,
     responseBoundMs: 120000, reserveChecked: true })`: the `fields` a `kind: 'live-deadline'` receipt must carry
     (N-V4-13 produces it; T09e consumes it). A `kind: 'deadline-projection'` receipt is refused by the kind check.
   - `export const STAGE1_COVERAGE_EXTRA = Object.freeze(['identity:landscape/26x26-nightmare/0',
     'identity:landscape/26x26-nightmare/1', 'identity:landscape/14x14-master/0', 'identity:landscape/14x14-master/1',
     'pm4', 'self-test:V4-T04', 'self-test:V4-T04v4', 'self-test:V4-T04f', 'self-test:V4-T04i'])`: the stage-1
     coverage beyond the item ids of `plans/V4-T04.parity.json` and `plans/V4-T04.replay.json`.
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
   'IGP-02', 'main', 'screens-all-state.json')`, the captured `inputs/instr.ig-tree.json`), `self-test` (the states of `<task>`,
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
   - `identityVerdict(identity, expectedSeeds)`: `incomplete` when null, when the seeds differ from `expectedSeeds`, or
     when `summary.withoutMp12b1 > 0` (T01b: under the frozen label a seed without an MP12b1 run is compared among the
     arms only, which proves nothing for DR-O13), with a reason naming the condition (`withoutMp12b1 <n>`); else
     `fail` when `summary.failures > 0`, a seed's `mp12b1~base` pair lacks `sameResult: true`, or a `base~log` pair's
     `level` is not `puzzle-identity`, naming the seed; else `pass`.
   - `sourceVerdict(source)`: `pass` when `source.snapshotOk`, `source.digestEqual` and no variant has an error; else
     `fail`.
   - `stage1Verdict(blocks)`: `Stage 1: holds.` when every block passes; else `Stage 1: STOP (<block>: <reasons>;
     ...)` when a block fails, else `Stage 1: INCOMPLETE (<block>: <reasons>; ...)`.
   - Captured inputs (R4-03), written by `summary` before the blocks are judged: for every variant of the two steps'
     stored identities and for `instr`, `docs/improve-generating/evidence/frozen/<task>/inputs/<variant>.ig-tree.json`
     = the current `readTreeInfo(variant)` (`lib/records.mjs:141`, no build) when its `treeId` equals the stored id
     (for `instr`, `pm4.meta.trees.instr.treeId`), else no copy and the reason `stale tree <variant> (<stored> vs
     <current>)` (`incomplete`); `inputs/harness.json` = `harnessInfo()` (`lib/records.mjs:114`) when its
     `harnessHash` equals the parity step's stored `identity.harnessHash`, else no copy and the reason `producer
     changed since the observation` (`incomplete`).
   - `export function stage1Inputs(task, variants)` returns, in this order, the repository-relative paths of the
     receipt's evidence: `tools/ig-proto/plans/<task>.parity.json` and `<task>.replay.json`;
     `tests/artifacts/ig-proto/frozen/<task>/parity/state.json`, `.../parity/items.jsonl`, `.../replay/state.json`,
     `.../replay/items.jsonl`; `docs/improve-generating/evidence/frozen/<task>/identity.json`;
     `docs/improve-generating/evidence/frozen/IGP-02/pm4.json`, `tests/artifacts/ig-proto/frozen/IGP-02/main/screens-all-state.json`;
     `tests/artifacts/ig-proto/frozen/<t>/self-test/state.json` for `<t>` in `<task>`, `<task>v4`, `<task>f`,
     `<task>i`; `docs/improve-generating/evidence/frozen/<task>/inputs/harness.json`; then
     `docs/improve-generating/evidence/frozen/<task>/inputs/<variant>.ig-tree.json` for each of `variants` in sorted
     order. A path that does not exist is left out of `evidence` and makes the receipt `incomplete` (`missing input
     <path>`).
   It writes `evidence/frozen/<task>/stage1.json` = `proofEnvelope({ kind: 'stage1', verdict: <pass when holds, fail
   on STOP, incomplete on INCOMPLETE>, source: { frozenCommit: FROZEN_COMMIT, sourceDigest: <the parity step's stored
   `identity.sourceDigest`> }, harnessHash: <the parity step's stored `identity.harnessHash`>, arms: <every variant of
   the two steps with its stored tree id (`identity.treeIds[<variant>]`) and `paramsHash` `sha256(JSON.stringify(<its
   captured copy's params>))`>, coverage: <expected = every item id of the two expanded manifests, then
   `STAGE1_COVERAGE_EXTRA`; observed: the item ids with an `item-end` of status `completed`, an identity id when its
   seed's pair is in `identity.json`, `pm4` when the PM4 block is not `incomplete`, a self-test id when its state is
   `done`; missing: expected less observed; censored: the item ids ended `censored`>, evidence: <`stage1Inputs(task,
   <the variants of the two steps and instr>)`, each with its `sha256File`>, fields: { meta: buildMeta({ task, label: 'frozen', kind: 'stage1' }),
   blocks, line } })` and `stage1.md` ("Stage 1 receipt (V4-T04)", the banner, the verdict line, one table per block,
   then the replay findings). Exit 0 when the record was written, whatever the verdict.
4. **`pm4-gate`** (`node tools\ig-proto\v4-check.mjs pm4-gate --label frozen --source-label <SL>`) is the early,
   read-only PM4 check that T04e runs between its two plans (RV5-01); it needs neither the V4-T04 observations nor the
   captured inputs. The export `pm4GateEvidence(instrTreeId, readFile = readRepoFile)` reads and JSON-parses, through
   `readFile`, `docs/improve-generating/evidence/frozen/IGP-02/pm4.json` and
   `tests/artifacts/ig-proto/frozen/IGP-02/main/screens-all-state.json` (a missing file is `null`) and returns
   `pm4Verdict(pm4, screensState, instrTreeId)`. The command first checks `verifySnapshot().ok` and `await
   sourceDigest() === FROZEN_DIGEST`, as the `source` block does; then it takes the independent expected `instr`
   identity from `planTree('instr').treeId` (the frozen sources of T01a's routing under `--label frozen`; no `errors`
   option, so a failed edit throws, `tools/ig-proto/lib/tree.mjs:172-187`) and calls `pm4GateEvidence(<that id>)`. A
   snapshot, digest or plan error prints `pm4-gate: incomplete (<reason>)` and exits 2. The expected id is never
   taken from the PM4 record itself, and the command neither reads nor writes `V4-T04/inputs/` or a stage-1 receipt.
   It prints `pm4-gate: pass` or `pm4-gate: <verdict> (<reasons>)` and exits 0 only on `pass`, else 2. The later
   `summary` still captures and hashes `inputs/instr.ig-tree.json` before the stage-1 receipt and uses that copy for
   its PM4 block; the early gate replaces neither that capture nor the evidence index. T04e's order stays IGP-02, a
   passing PM4 gate, then V4-T04.
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
expectation `{ kind: 'live-deadline', source: S, harnessHash: 'h', arms: [{ id: 'fr-frozen', treeId: 't1', paramsHash:
'p1' }], coverage: { expected: ['14x14-nightmare~0'] }, fields: LIVE_DEADLINE_FIELDS }`.

| Case name | Input | Expected |
|---|---|---|
| `proof: receipts are typed and bound` | `proofCheck` against `X` of: (a) `{ verdict: 'pass' }`; (b) `E` with `kind: 'deadline-projection'` and no `postHoc` field; (c) `E` with the arm's `treeId` `'t2'`; (d) `E` with `reserveChecked: false` at its root (the envelope spreads `fields`); (e) `E` with the temporary file changed after hashing; (f) `E`; (g) `E` with `verdict: 'fail'`; (h) `E` with `harnessHash: 'h2'`; (i) `E` against `X` without `harnessHash` | (a) `incomplete`; (b) `incomplete` (`not a live-deadline receipt`); (c) `incomplete` (`stale arm fr-frozen`); (d) `incomplete` (`reserveChecked is false`); (e) `incomplete` (`evidence changed`); (f) `pass`; (g) `fail`; (h) `incomplete` (`producer changed`); (i) `incomplete` (`no producer binding`) |
| `proof: stored identities` | `stepEvidence` on a synthetic step folder whose state's `manifestHash` differs from the declared manifest's; then one whose log has a line with another `identityHash` | the first problem names the manifest; the second the log line |
| `proof: PM4 block` | (a) null; (b) a record with `violations: []`, `certifiedRuns: 40`, `gaps: []`, `equalCanonical.certified` 40 of 40, the frozen commit and digest, `run: 'main'`, matching tree id, state `done`; (c) the same with `gaps: ['no scap0 run observed']`; (d) with state `done: false` | (a) `incomplete`; (b) `pass`; (c) `fail` naming the gap; (d) `incomplete` |
| `proof: the early PM4 gate needs no stage-1 capture` | the record of case 3 (b) with `meta.trees.instr.treeId` `'t-instr'` and its `done` state; `pm4GateEvidence('t-instr', readFile)` with a `readFile` that returns the fixtures' JSON text for exactly the two paths of step 4, throws for any other path and records the paths it was called with; then `pm4GateEvidence('t-other', readFile)`; then the same with the state's `done: false` | `pass`, and the recorded paths are exactly the two; then `fail` with a reason naming the `instr` tree; then `incomplete`; nothing is written and no real PM4 run starts |
| `proof: the stage-1 inputs are an explicit index` | `stage1Inputs('V4-T04', ['v4', 'base', 'instr'])` | 17 paths in the order of step 3, the copies last as `inputs/base.ig-tree.json`, `inputs/instr.ig-tree.json`, `inputs/v4.ig-tree.json`; none under `tests/artifacts/ig-proto/tree-frozen/`, `tools/ig-proto/variants/` or `tools/ig-proto/lib/` |
| `proof: stage-1 line` | blocks all `pass`; one `incomplete`; one `fail` and one `incomplete` | `Stage 1: holds.`; `Stage 1: INCOMPLETE (...)`; `Stage 1: STOP (...)` |
| `proof: identity block` | `I` = an identity record whose `seeds` are the four expected seeds of step 3, each with an `mp12b1` block, the pairs `mp12b1~base` and `mp12b1~log` = `{ level: 'different-source', sameResult: true, problems: [] }` and `base~log` = `{ level: 'puzzle-identity', problems: [] }`, and whose `summary` is `{ failures: 0, withoutMp12b1: 0 }`; `identityVerdict(<record>, <the four seeds>)` of: (a) null; (b) `I`; (c) `I` with one seed's `mp12b1` block and its two `mp12b1~` pairs removed and `summary.withoutMp12b1: 1`; (d) `I` with one seed's `mp12b1~base` `sameResult: false` | (a) `incomplete`; (b) `pass`; (c) `incomplete` with a reason naming `withoutMp12b1 1`; (d) `fail` naming that seed |

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
| T04d-B02 | A receipt passes only when typed, complete and bound to the expected source, producer, arms, coverage and evidence; a projection never passes as a live deadline | case 1 | self-test output |
| T04d-B03 | Stage 1 can only hold when every mandatory block is complete and passes, on observations checked against their stored identities | cases 2, 3, 6 and 7 | self-test output |
| T04d-B04 | The stage-1 receipt rests only on immutable inputs: an explicit index with captured tree and harness metadata, no tree folder, variant file or harness file (R4-03) | case 5; the captured `inputs/` of T04e | self-test output; files |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T04d-T01 | `proofCheck`'s order and statuses | case 1 | self-test output |
| T04d-T02 | Stored identities are checked, never recomputed | case 2; review of `stepEvidence` | self-test output; diff |
| T04d-T03 | The PM4 note names the frozen source under `-Label frozen` only | code review | diff |
| T04d-T04 | Nothing else changed; formats | guards; `npm run check` | command output |
| T04d-T05 | The early PM4 gate reads only the two PM4 records and takes the expected `instr` identity from the frozen plan, never from the PM4 record (RV5-01) | case 4 | self-test output |

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
