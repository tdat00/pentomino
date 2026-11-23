# T09b: The live-deadline receipt (`live-deadline.mjs receipt`)

| Item | Value |
|---|---|
| Feature, plan | improve-generating-stages-2-4, `docs/improve-generating-stages-2-4/plan.md` §4.5 (Receipt and acceptance: "`tools/ig-proto/live-deadline.mjs receipt --task V4-LIVE --require-pass` writes `docs/improve-generating/evidence/frozen/V4-LIVE/live-deadline.json` (kind `live-deadline`, fields `LIVE_DEADLINE_FIELDS` ...), binding the verification records and the ten `V4-LIVE` rows; it exits 2 after writing a receipt that does not pass"), §4.8 (N-V4-13), §6 T4, §8.2 T09; N-V4-13; D-V4-18; this pack's D-P24-06 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T09a |
| Depends on | T09a |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 3 h, machine 0 min (unlocked; synthetic cases in a private namespace) |

## Goal

Stage 4 may run the frozen arms with a 130-s row limit only after a receipt proves the live deadline held on real rows
(`data/frozen-round-v1.json` `rowLimitS.liveDeadline`; `V4-S4`'s prerequisite on `V4-LIVE/live-deadline.accepted.json`).
`plans/V4-LIVE.json` already calls `tools/ig-proto/live-deadline.mjs receipt --task V4-LIVE --require-pass` after its
ten `fr-frozen` rows. This task writes that command: it binds the rows, their raw shard identities and journals, the
verification record of T09a and the trees, and judges them with T09a's checks.

## Authority and fixed points

- The envelope is `lib/proof.mjs` `proofEnvelope` (`ig-v4-proof` version 1); the kind is `live-deadline`; the receipt's
  root carries `LIVE_DEADLINE_FIELDS` (`lib/proof.mjs:26`: `live: true`, `postHoc: false`, `workCutoffMs: 115000`,
  `responseBoundMs: 120000`, `reserveChecked: true`), which `proofCheck` compares with the binding's expectation and
  `checkPrerequisites` requires to be exactly the binding's `expected.fields` (`manifest.mjs` `acceptedProblems`); the
  five fields are kept exactly.
- SA-Astra's review R13: "Both receipt construction and `liveExpectation` independently validate that recorded identity
  against the freeze, the expected derivative composition and the stored identities of the ten row observations.
  Current metadata may be captured only when it matches the observation. Every runs file must have the frozen source and
  agree with its raw shard identity. Missing/stale/malformed identity is incomplete; no current file supplies a missing
  past identity. Bind the verification record, raw row identity records, captured metadata and required input index."
  `arm.mjs publish` builds the runs files' metadata at publication time (`arm.mjs:245-293`), so the raw `shard.json`
  (`treeId`, `copyDigest`, `harnessHash`, `arm.mjs:118`) is the observation's own identity.
- SA-Astra's review R14: the command has a seam for a private layout (`io.layout`), so that its tests never write under
  `V4-LIVE` or a historical namespace; the tests run the command itself, with `--require-pass`, and cover exit 2 on a
  fail and on an incomplete receipt, the refusal of a second passing receipt with no byte changed, and a malformed stored
  receipt.
- Written once (check-list §3.3): an existing receipt whose verdict is `pass`, or that is not a JSON object with a
  string `verdict`, is refused before anything is read, captured or written; a `fail` or `incomplete` one is replaced.

## Scope

- Change: `tools/ig-proto/live-deadline.mjs`: the exported `liveLayout`, `liveEvidencePaths`, `liveReceipt`,
  `receiptCommand` and `main`.
- Change: `tools/ig-proto/self-test.mjs`: two cases appended to `itemCases` (`--items`), with the helper
  `liveFixture(base, task, edit)` (step 6).
- Change: `tools/ig-proto/README.md`: the subsection of T09a gains the receipt; `## Commands` gains the receipt line.
- Guards: G1, G2, G3 (the three files).

## Steps

1. Imports added to `live-deadline.mjs`: `existsSync`, `mkdirSync`, `readdirSync`, `readFileSync` from `node:fs`;
   `dirname`, `join` from `node:path`; `pathToFileURL` from `node:url`; `abs`, `parseArgs`, `rel` from
   `./lib/paths.mjs`; `LIVE_DEADLINE_FIELDS`, `proofEnvelope`, `readRepoFile` from `./lib/proof.mjs`; `harnessInfo`,
   `readTreeInfo`, `sha256`, `sha256File`, `writeJson` from `./lib/records.mjs`; `ensureTree` from `./lib/tree.mjs`;
   `parseLines` from `./verdicts.mjs`.
2. **The layout** (exported, pure):

   ```js
   /**
    * The repository paths of a live-deadline receipt (T09b, T09c). `base` null gives the real layout; a test passes a
    * private folder under tests/artifacts/ig-proto/selftest/ (never V4-LIVE or a historical namespace).
    * @param {string} task
    * @param {string | null} [base]
    */
   export function liveLayout(task, base = null) {
     const evidence = base === null ? `docs/improve-generating/evidence/frozen/${task}` : `${base}/evidence/${task}`;
     const raw = base === null ? `tests/artifacts/ig-proto/frozen/${task}` : `${base}/raw/${task}`;
     const verify = base === null ? `tests/artifacts/ig-proto/frozen/${LIVE_VERIFY_TASK}/self-test` : `${base}/raw/${LIVE_VERIFY_TASK}/self-test`;
     return {
       freeze: base === null ? FREEZE_PATH : `${base}/freeze.json`,
       runsDir: `${evidence}/fr-frozen`,
       rawDir: `${raw}/fr-frozen`,
       verifyState: `${verify}/state.json`,
       verifyIdentity: `${verify}/identity.json`,
       inputs: `${evidence}/inputs/live-deadline`,
       receipt: `${evidence}/live-deadline.json`,
       binding: `${evidence}/live-deadline.accepted.json`,
     };
   }
   ```

3. **The required evidence** (exported, pure): `liveEvidencePaths(layout, { runs, journalFiles })`, `runs` the runs
   files `[{ path, shard }]` (`shard` the runs file's `shard` field) and `journalFiles` the repository paths of the
   declared rows' journal files: returns, in this order, `layout.freeze`, each runs path, `${layout.rawDir}/<shard>/shard.json`
   for each distinct shard, the journal files sorted, and the captured copies `${layout.inputs}/<id>.ig-tree.json` for
   each of `LIVE_ARMS` and `LIVE_TWINS`, `${layout.inputs}/harness.json`, `${layout.inputs}/verify-state.json`,
   `${layout.inputs}/verify-identity.json`.
4. **The verdict** (exported, pure): `liveReceipt({ freezeVariants, trees, twins, runs, rawShards, journals, state,
   identity, harnessNow, evidence })`. `trees`: `Record<id, info & { paramsHash }>` of today's `LIVE_ARMS` (`info` the
   tree's `ig-tree.json`, `lib/tree.mjs:317-329`); `twins`: the captured test derivatives `Record<id, info>` (step 5);
   `runs`: `[{ path, doc }]`; `rawShards`: `Record<shard,
   object | null>` (the parsed raw `shard.json`); `journals` as T09a's `rowChecks` takes them. Incomplete reasons, in
   this order: `no freeze record` (null `freezeVariants`); `stale tree <id>` for each of `LIVE_ARMS` whose `trees[id]`
   differs from `freezeVariants[id]` (`treeId` or `paramsHash`); `no published rows` (empty `runs`); `runs file <path>
   is not of the frozen source` (`doc.meta.source.frozenCommit !== FROZEN_COMMIT || doc.meta.source.sourceDigest !==
   FROZEN_DIGEST`); `rows of another tree <path>` (`doc.meta.trees['fr-frozen'].treeId` or
   `sha256(JSON.stringify(doc.meta.trees['fr-frozen'].params))` differs from `freezeVariants['fr-frozen']`); `no raw
   shard identity <shard>` (null `rawShards[doc.shard]`); `runs file <path> differs from its raw shard` (the raw
   `treeId`, `copyDigest` or `harnessHash` differs from `doc.meta.trees['fr-frozen'].treeId`, `.copyDigest` or
   `doc.meta.harness.harnessHash`); `runs of different producers` (two distinct `doc.meta.harness.harnessHash`);
   `producer changed since the observation` (`harnessNow` differs from it); then `rowChecks(rows of every runs file,
   journals).incomplete` and `verifyChecks({ state, identity, freezeVariants, parents: trees, twins, harnessHash: <the
   runs' hash> }).incomplete` (T09a: the twins' derivation from their frozen parents included, SA-Astra's review
   R2-06). Failures: the two checks' `failures`. `coverage`: `expected` `LIVE_COVERAGE`, `observed` the rows'
   and the verification's observed ids, `missing` the rest, `censored` `[]`. `verdict`: `fail` with a failure; else
   `incomplete` with an incomplete reason or a missing id; else `pass`. The envelope: `proofEnvelope({ kind:
   'live-deadline', verdict, source: { frozenCommit, sourceDigest } of runs[0] (or FROZEN_COMMIT and null without runs),
   harnessHash: <the runs' common hash or null>, arms: LIVE_ARMS.map((id) => ({ id, treeId: trees[id]?.treeId ?? null,
   paramsHash: trees[id]?.paramsHash ?? null })), coverage, evidence, fields: { ...LIVE_DEADLINE_FIELDS, rows: <the
   rowChecks table>, verification: { task: LIVE_VERIFY_TASK, cases: LIVE_CASES.length }, reasons: <the failures, then
   the incomplete reasons, then 'missing <id>' for each missing id; [] on pass> } })` (`proofEnvelope({ kind, verdict,
   source, harnessHash, arms, coverage, evidence, fields })`, `lib/proof.mjs:49`; no field may be named like an envelope
   field).
5. **The command** (exported `async function receiptCommand(argv, io = {})`; `argv` the arguments after `receipt`):
   values `task`, `label`, `source-label`; switch `require-pass`; refusals (`live-deadline: <reason>` on stderr, return
   1, nothing written): `--label frozen only`; `receipt needs --task`; `<task> is a historical namespace` (the list of
   check-list §3.1); `receipt <path> exists (a passing receipt is never rewritten)` or `receipt <path> is unreadable`
   for the existing receipt rules. Then, with `L = io.layout ?? liveLayout(task)`: read `L.freeze` (`variants` or null);
   `ensureTree` each of `LIVE_ARMS` and `LIVE_TWINS` (this builds a missing tree; the plan's `trees` step builds only
   `fr-frozen`) and keep, per id, with `info = readTreeInfo(id)`, `{ ...info, paramsHash: sha256(JSON.stringify(info.params))
   }` (the whole `ig-tree.json`: `variant`, `chain`, `treeId`, `copyDigest`, `edits`, `files`, `params`); read the runs files
   `L.runsDir/*.runs.json` (name order) and, per distinct `doc.shard`, `L.rawDir/<shard>/shard.json` (null when absent
   or unparseable); per declared row key, its journal files in `L.rawDir/<shard>/logs/` (names starting `<rowKey>.` and
   ending `.jsonl`, except the row identity file `<rowKey>.row.jsonl`, which `arm.mjs` checks when the row runs and which
   the v4 readers neither read nor bind, as `verdicts.mjs` `readJournals` and `fit-read.mjs`; ruling R-P24-14):
   the worker files' lines and the `<rowKey>.link.jsonl` lines (null when absent) with `parseLines`, their problems
   kept; read `L.verifyState` and `L.verifyIdentity` (null when absent or unparseable). **Captures** (under
   `L.inputs`, `writeJson`; first, ruling R-P24-14, each of the seven capture paths of step 3 is removed with
   `rmSync(abs(path), { force: true })`, `rmSync` joining the `node:fs` import, so that a receipt binds only its own
   run's captures; a passing receipt was refused before this): `<id>.ig-tree.json` of
   each of `LIVE_ARMS` (`readTreeInfo(id)`); `<id>.ig-tree.json` of
   each of `LIVE_TWINS` only when its `treeId` equals `identity.trees[id].treeId` (then `twins[id]` = that whole record;
   otherwise it is not captured and `twins[id]` is absent); `harness.json` only when `harnessInfo().harnessHash` equals
   the runs' common hash; `verify-state.json` and `verify-identity.json` when they exist. `evidence` is
   `liveEvidencePaths(L, ...)` restricted to the files that exist, each `{ path, sha256: sha256File(abs(path)) }`.
   Build with `liveReceipt`, `writeJson(abs(L.receipt), receipt)`, print `receipt: live-deadline <verdict> ->
   <L.receipt>`, and for another verdict write `live-deadline: the receipt is <verdict> (<reasons joined by '; '>)` to
   stderr; return 2 with `--require-pass` and a verdict other than pass, else 0.
   `export async function main(argv, io = {})`: `receipt` → `receiptCommand(rest, io)`; another command prints the
   usage `node tools\ig-proto\live-deadline.mjs receipt --task V4-LIVE [--require-pass] --label frozen --source-label
   <SL>` and returns 1; guarded by `if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
   process.exitCode = await main(process.argv.slice(2)); }`.
6. **The fixture helper** (`self-test.mjs`): `async function liveFixture(base, task, edit = () => {})` writes, under the
   private folder `base` (`tests/artifacts/ig-proto/selftest/<name>`, removed first), a complete passing input set of
   `liveLayout(task, base)`: `freeze.json` `{ variants }` with today's identities of `fr-frozen` and `fr-frozen-none`
   (`ensureTree`, `paramsHash` as step 5); two runs files `live-14x14-nightmare.runs.json` and
   `live-26x26-hell-1.runs.json` in `runsDir`, each `{ meta: { source: { frozenCommit: FROZEN_COMMIT, sourceDigest:
   FROZEN_DIGEST }, harness: { harnessHash: harnessInfo().harnessHash }, trees: { 'fr-frozen': { treeId, copyDigest,
   params } } }, shard: <the shard name>, rows: <its five rows> }`, the rows as T09a's clean rows (`matrixRun(caseId,
   rep, 10, { igSetMs: 30000 })`, `rowKey` `<caseId>~<rep>`, `seed` `landscape/<caseId>/<rep>`, `localRep` 0); per shard
   `rawDir/<shard>/shard.json` `{ treeId, copyDigest, harnessHash }` of the same identity; per row
   `rawDir/<shard>/logs/<rowKey>.1.2.jsonl` (the closed ledger of T09a's test, call `<rowKey>:1:2:1`),
   `<rowKey>.link.jsonl` (`{ t: 'link', ev: 'set-complete', attempt: 0, outcome: 'ok' }`) and `<rowKey>.row.jsonl` (`{
   t: 'row', row: <rowKey>, seed, caseId, localRep: 0, pid: 1 }`, the row identity line `arm.mjs` writes, so that the
   cases run on the real layout of a logs folder; ruling R-P24-14); the verification's
   `state.json` and `identity.json` at `verifyState`, `verifyIdentity` (task `V4-LIVE-verify`, label `frozen`, group
   `v4`, the fifteen `LIVE_CASES` passing and selected once, today's harness hash, `FROZEN_COMMIT`, `FROZEN_DIGEST`,
   `trees` with today's identities of the two arms and the two test derivatives); then `edit(paths)` may change a
   file before the case runs. JSON files are written with `writeJson`, journal files as JSONL with `writeText`.

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `self-test.mjs` (`--items`) | `live-deadline: the receipt's verdicts` | `liveReceipt` with the parsed contents of `liveFixture('tests/artifacts/ig-proto/selftest/S24-T09b-dev', 'S24-T09b-dev')` (read back into the step-4 arguments, `twins` the two derivatives' identities, `harnessNow` today's, `evidence` `[]`); then one variant at a time: row `14x14-nightmare~3` `responseMs` 130000; `trees['fr-frozen-none'].treeId` `'t3'`; `harnessNow` `'x'`; one runs file's `meta.source.sourceDigest` `'x'`; one raw shard's `copyDigest` `'x'`; one raw shard null; `identity` null; `freezeVariants` null; `twins['fr-frozen-live-test'].chain` with `fr-frozen-none` in place of `fr-frozen` (the recorded tree id unchanged: a consistent identity of the wrong parent); `twins['fr-frozen-none-live-test'].edits` with an extra `{ id: 'x-1' }` before `w8-1` | `kind` `live-deadline`, `verdict` `pass`, the five `LIVE_DEADLINE_FIELDS` at the root exactly, two arms, 25 expected and 25 observed ids; then `fail`; `incomplete` with `stale tree fr-frozen-none`; `producer changed since the observation`; `runs file <path> is not of the frozen source`; `runs file <path> differs from its raw shard`; `no raw shard identity live-26x26-hell-1`; `no verification identity`; `no freeze record`; `the test derivative fr-frozen-live-test is not fr-frozen with w8`; `the test derivative fr-frozen-none-live-test has an edit other than w8-1` |
| same (`--items`) | `live-deadline: CLI receipt` | in fresh private namespaces under `tests/artifacts/ig-proto/selftest/S24-T09b-dev/` (removed at the end): (a) `liveFixture(...)`, then `receiptCommand(['--task', 'S24-T09b-dev', '--require-pass', '--label', 'frozen', '--source-label', 'self-test'], { layout })`; (b) the same command again; (c) a fresh fixture with row `26x26-hell-1~2` `responseMs` 130000; (d) a fresh fixture without `verifyIdentity`; (e) a fresh fixture whose receipt path holds the text `{`; (f) a fresh fixture whose edit removes `verifyState`, writes `{"stale":true}` to `<inputs>/verify-state.json` and to `<inputs>/fr-frozen-live-test.ig-tree.json`, and sets the verification identity's `trees['fr-frozen-live-test'].treeId` to `'d9'` (captures that an earlier run would have left; R-P24-14) | (a) returns 0; the receipt's `verdict` `pass`; its `evidence` paths equal `liveEvidencePaths(layout, ...)` (every file of step 3, each hash equal to the file's; no path ends `.row.jsonl`); the sorted listing of `layout.inputs` is exactly `fr-frozen-live-test.ig-tree.json`, `fr-frozen-none-live-test.ig-tree.json`, `fr-frozen-none.ig-tree.json`, `fr-frozen.ig-tree.json`, `harness.json`, `verify-identity.json`, `verify-state.json` (the seven copies: four trees, the harness, the verification state and identity); (b) returns 1 (`receipt ... exists (a passing receipt is never rewritten)`), and the sha256 of every file under the namespace is unchanged, the captures included; (c) returns 2, the receipt is written with `verdict` `fail`; (d) returns 2, `verdict` `incomplete` with `no verification identity`; (e) returns 1 (`receipt ... is unreadable`), nothing written; (f) returns 2, `verdict` `incomplete` with `no verification state`; neither stale file exists afterwards and no `evidence` entry names either |

## Documentation

README: the subsection `### The live-deadline receipt (T09a to T09c)` gains the receipt: the layout, what it reads and
binds (the freeze, the runs files with their raw shard identities, the rows' journals, the verification record, the
captured trees and harness), the identity rules, the verdicts, the captures (a test derivative only when it matches
the record), "written once", and the command; `## Commands` gains `node tools\ig-proto\live-deadline.mjs receipt --task
V4-LIVE --require-pass --label frozen --source-label "frozen 3fc65f4"` (run by `V4-LIVE`'s plan only).

The subsection's first paragraph, which T09a wrote before the receipt existed, is updated (ruling R-P24-14):
"`live-deadline.mjs` will hold the receipt" becomes "`live-deadline.mjs` holds the receipt", and "T09a adds its
constants and pure checks; T09b adds the receipt." becomes "T09a added its constants and pure checks and T09b the
receipt.". The receipt's text also says that the rows' journal files are the worker files and the link file (the row
identity file `<rowKey>.row.jsonl` is neither read nor bound), and that each run that is not refused first removes the
seven capture paths, so that a receipt binds only its own run's captures.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\firewall.mjs snapshot --task S24-T09b --label frozen` | repository root, first | `firewall: snapshot of S24-T09b` | 1 min |
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task S24-T09b --horizon-s 285` | repository root (unlocked) | every case `PASS`, the two cases above among them; no folder `tests\artifacts\ig-proto\selftest\S24-T09b-dev` left | 5 min |
| `node tools\ig-proto\live-deadline.mjs receipt --label frozen --source-label "frozen 3fc65f4"` | repository root | refused: `live-deadline: receipt needs --task`, exit 1, nothing written (the real receipt is `V4-LIVE`'s step, S04) | 1 min |
| `node tools\ig-proto\firewall.mjs check --task S24-T09b --label frozen` | repository root, last | `firewall: OK, ...` | 1 min |
| `npm run check` | repository root | `check-conventions: OK`, `check-site: OK` | 2 min |
| G1, G2, G3 | repository root | G1, G2 print nothing; G3 lists the three files | 1 min |

Do not run `receipt --task V4-LIVE` here: it would write a record under `V4-LIVE` before the plan ran.

## Stop points and questions

- Stop and report if `plans/V4-LIVE.json`'s `live-receipt` step differs from the Goal's command: the plan file is fixed
  (G2) and the tool follows it.
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code; an ambiguity changes behaviour or a contract; a gate fails for
  a reason not covered here; a change is needed outside the scope; a recorded decision would change. Never decide such a
  point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T09b-B01 | Stage 4's short row limit can only follow a receipt that binds the rows' own identities, their journals and a verification record of the same producer, source and trees, and proves that every declared request answered within 120 s with the reserve held, for both bounded twins | the two cases | the PASS lines |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T09b-T01 | `liveReceipt` gives the Tests table's verdicts, with the five fields exact | `--items` | the PASS line |
| T09b-T02 | The command passes, fails (exit 2) and is incomplete (exit 2) as the Tests table says; it never rewrites a passing receipt, changes no byte when it refuses, and refuses a malformed receipt | the CLI case; the refusal gate | the PASS line; the output |
| T09b-T03 | `npm run check`, the firewall and G1 to G3 pass | the gates | their output |

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
