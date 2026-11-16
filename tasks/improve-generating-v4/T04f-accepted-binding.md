# T04f: The accepted stage-1 binding

| Item | Value |
|---|---|
| Feature, plan | improve-generating, `docs/improve-generating/plan.md` §5.1 (stage 1 "Preparation" and its receipt), §5.2 (the prerequisites of the phase-0 verdict), §9; decision D-V4-18; review RV3-06 (R3-06), RV4-03 (R4-03), RV4-08 (the tree-identity wording) |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T04e |
| Depends on | T04e (`docs/improve-generating/evidence/frozen/V4-T04/stage1.json` with `Stage 1: holds.`, and its captured inputs under `.../V4-T04/inputs/`, T04d) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 3 h, machine 0 min (reads and hashes only; no rating, no generation, unlocked) |

## Goal

Later verdicts must trust stage 1 without trusting what the stage-1 receipt says about itself, and without depending
on tree folders, variant files or harness files that later work changes. This task fixes, once, an immutable
accepted binding: the receipt's hash, the frozen source, the producer of the measurement, the arms with the tree and
parameter identities captured with the observations, and the coverage that the manifests and the pack declare. It
also protects the historical observation namespaces of stage 1, so that no later verification overwrites an input
the receipt hashed. Every later consumer (T09e, T11c, T11d) checks that binding.

## Authority and fixed points

- Review R3-06 (accepted): "At acceptance of stage 1, write an immutable accepted binding under
  `docs/improve-generating/evidence/frozen/V4-T04/accepted-binding.json`: the accepted receipt path/hash, source,
  producer hash, observed arm/tree/parameter identities and the independently declared coverage of the versioned
  manifests, identity seeds, certificate and self-test groups. Capture any mutable tree metadata needed later as
  immutable evidence there. Later consumers use that binding, not empty arm expectations or the receipt's own
  coverage as the definition of what was required."
- Review R4-03 (accepted): "The stage-1 auxiliary IDs, including `V4-T04f`, are historical observation namespaces,
  not names reusable by later verification. Verify that their state/result hashes do not change during T04f." "T04f
  captures and checks the independent accepted binding against those immutable inputs. It does not rewrite the
  stage-1 receipt to repair its dependencies later." The stage-1 receipt's evidence is T04d's explicit input index
  (`stage1Inputs`): the manifests, the observation states and logs, the identity, certificate and self-test records,
  and the copies of the tree metadata and harness metadata under `docs/improve-generating/evidence/frozen/V4-T04/inputs/`.
- The historical namespaces of stage 1 (check-list §3.1) are `frozen/IGP-02`, `frozen/V4-T04`, `frozen/V4-T04v4`,
  `frozen/V4-T04f` and `frozen/V4-T04i`. This task's own snapshot and verification use the task id
  `V4-T04f-verify`.
- D-V4-18 (check-list §4): a prerequisite is checked through its accepted binding; the historical producer hash is
  kept, never replaced by today's.
- The binding is written once and never rewritten (`accept` refuses an existing file). It reads no tree folder: the
  arms' tree ids come from the stored identities and their parameters from the captured copies. This task's edits are
  non-variant harness files (`lib/proof.mjs`, `v4-check.mjs`, `self-test.mjs`, `README.md`); a tree is built only
  from the sources of `collectSources` (`tools/ig-proto/lib/tree.mjs:148-157`, which excludes `tools/ig-proto/`) and
  its variant manifests, files and parameter files, so these edits do not move any tree.
- Text hashes are LF-normalised (`sha256Text`, `lib/records.mjs:23`), as T04d's evidence hashes.

## Scope

- Change: `tools/ig-proto/lib/proof.mjs` (step 1), `tools/ig-proto/v4-check.mjs` (`stepEvidence`'s option, the
  subcommands `evidence-check`, `accept` and `check-binding`, step 2), `tools/ig-proto/self-test.mjs` (the reserved
  namespaces, step 3; cases appended to `--items`), `tools/ig-proto/README.md` (T04c's section).
- Create (by running step 5): `docs/improve-generating/evidence/frozen/V4-T04/accepted-binding.json`.
- Do not change: everything else, every stage-1 input included. Guards: `node tools\ig-proto\firewall.mjs check --task
  V4-T04f-verify --label frozen`, expected `files unchanged`; `git status --short -- core generator tests tools/bench
  tools/ig-proto/variants tools/ig-proto/plans tools/ig-proto/lib/items.mjs tools/ig-proto/lib/lanes.mjs
  tools/ig-proto/lib/lane-worker.mjs tools/ig-proto/lib/tree.mjs`, expected no output; `git status --short --
  docs/improve-generating/evidence`, expected exactly `?? docs/improve-generating/evidence/frozen/V4-T04/accepted-binding.json`;
  the stage-1 inputs unchanged: step 0's check before any edit, `evidence-check` (step 2) before step 5, both
  expected to report no change.

## Steps

0. Before any edit, at the root, check the stage-1 inputs (every line must start with `same`; a `CHANGED` line: stop
   with `QUESTION:`), then `node tools\ig-proto\firewall.mjs snapshot --task V4-T04f-verify --label frozen`:

   ```powershell
   node -e "const fs=require('fs'),c=require('crypto');const r=JSON.parse(fs.readFileSync('docs/improve-generating/evidence/frozen/V4-T04/stage1.json','utf8'));for(const e of r.evidence){const t=fs.existsSync(e.path)?fs.readFileSync(e.path,'utf8').replace(/\r\n/g,'\n'):null;console.log((t!==null&&c.createHash('sha256').update(t).digest('hex')===e.sha256?'same ':'CHANGED ')+e.path)}"
   ```
1. **`lib/proof.mjs`** gains (imports `FROZEN_COMMIT`, `FROZEN_DIGEST` from `./paths.mjs` beside `abs`):

   ```js
   export const ACCEPTED_FORMAT = 'ig-v4-accepted';

   /**
    * The accepted binding of a passing receipt (RV3-06): built from an expectation declared apart from the receipt.
    * @param {{ receiptPath: string, harnessHash: string, arms: { id: string, treeId: string, paramsHash: string }[],
    *   params: Record<string, unknown>, coverage: string[], fields: Record<string, unknown>, by: string }} o
    * @param {(path: string) => string | null} [readFile]
    */
   export function acceptedBinding(o, readFile = readRepoFile) {
     const text = readFile(o.receiptPath);
     if (text === null) {
       throw new Error(`accept: missing receipt ${o.receiptPath}`);
     }
     const receipt = JSON.parse(text);
     const expected = {
       kind: receipt.kind, source: { frozenCommit: FROZEN_COMMIT, sourceDigest: FROZEN_DIGEST },
       harnessHash: o.harnessHash, arms: o.arms, coverage: { expected: o.coverage }, fields: o.fields,
     };
     const check = proofCheck(receipt, expected, readFile);
     if (check.status !== 'pass') {
       throw new Error(`accept: ${check.status} (${check.reasons.join('; ')})`);
     }
     return {
       format: ACCEPTED_FORMAT, version: 1, receipt: { path: o.receiptPath, sha256: sha256Text(text) }, expected,
       params: o.params, acceptedAt: new Date().toISOString(), acceptedBy: o.by,
     };
   }

   /**
    * Checks a prerequisite through its accepted binding; `current` lists today's identities of the arms to compare.
    * @param {any} binding
    * @param {{ readFile?: (path: string) => string | null, current: { id: string, treeId: string, paramsHash: string }[] }} o
    * @returns {{ status: 'pass' | 'fail' | 'incomplete', reasons: string[] }}
    */
   export function checkAccepted(binding, { readFile = readRepoFile, current }) {
     if (binding?.format !== ACCEPTED_FORMAT || binding.version !== 1) {
       return { status: 'incomplete', reasons: ['not an accepted binding'] };
     }
     const text = readFile(binding.receipt.path);
     if (text === null) {
       return { status: 'incomplete', reasons: [`missing receipt ${binding.receipt.path}`] };
     }
     if (sha256Text(text) !== binding.receipt.sha256) {
       return { status: 'incomplete', reasons: [`receipt changed ${binding.receipt.path}`] };
     }
     const check = proofCheck(JSON.parse(text), binding.expected, readFile);
     if (check.status !== 'pass') {
       return check;
     }
     for (const c of current) {
       const arm = binding.expected.arms.find((a) => a.id === c.id);
       if (arm === undefined) {
         return { status: 'incomplete', reasons: [`unbound arm ${c.id}`] };
       }
       if (arm.treeId !== c.treeId || arm.paramsHash !== c.paramsHash) {
         return { status: 'incomplete', reasons: [`stale arm ${c.id}`] };
       }
     }
     return { status: 'pass', reasons: [] };
   }
   ```

2. **`v4-check.mjs`**:
   - `stepEvidence(task, step, manifestPath, isV4, { historical = false } = {})` (T04d's function gains the option):
     with `historical: true` the stored tree ids are not compared with today's trees; every other check stays.
   - `export function stage1Expectation(task, evidenceOf = stepEvidence, inputsOf = readInputCopy)` returns `{
     harnessHash, arms, params, coverage, fields }` or throws `Error('accept: <reason>')`. `readInputCopy(task,
     variant)` parses `docs/improve-generating/evidence/frozen/<task>/inputs/<variant>.ig-tree.json` (T04d), `null`
     when absent. For the steps `parity` and `replay` with the manifests `tools/ig-proto/plans/<task>.parity.json`
     and `<task>.replay.json`: `evidenceOf(task, step, manifestPath, (v) => v !== 'base', { historical: true })`; a
     problem: `accept: <step>: <problem>`. `harnessHash` is the parity step's `identity.harnessHash`; the replay
     step's differing: `accept: two producers`. The arms: every variant of the two identities' `treeIds`, in sorted
     order (one variant with two tree ids: `accept: two trees for <variant>`); for each, `copy = inputsOf(task,
     variant)`; `null`: `accept: no captured tree metadata for <variant>`; `copy.treeId` different from the stored id:
     `accept: captured tree <variant> differs from the observation (<stored> vs <copy.treeId>)`; else `{ id: variant,
     treeId: <stored>, paramsHash: sha256(JSON.stringify(copy.params)) }`, and `params[variant] = copy.params`.
     `coverage`: the ids of `expandManifest(<manifest>, artifactDir('frozen', task, <step>), (v) => v !== 'base')` of
     the parity manifest then the replay manifest, then `STAGE1_COVERAGE_EXTRA` (T04d). `fields`: `{ line: 'Stage 1:
     holds.' }`. No tree folder and no variant file is read.
   - `evidence-check --receipt <path> --label frozen --source-label <SL>`: for each `evidence` entry of the receipt,
     `sha256File(abs(path))` (absent: changed); prints `evidence: unchanged (<n> files)` and exits 0, or `evidence:
     changed <paths joined by ', '>` and exits 2.
   - `accept --task <T> --receipt <path> --binding <path> --by <text> --label frozen --source-label <SL>`: `--binding`
     names an existing file: stderr `v4-check: binding <path> exists (an accepted binding is never rewritten)`, exit
     1; the receipt's `kind` other than `stage1`: `v4-check: accept knows the kinds stage1` (T11d adds its kinds),
     exit 1; else `acceptedBinding({ receiptPath, ...stage1Expectation(T), by })` (an error: its message, exit 1),
     `writeJson(abs(<binding>), binding)`, stdout `accepted: <receipt path> sha256 <hash> -> <binding path>`, exit 0.
     Paths are repository-relative with POSIX separators.
   - `check-binding --binding <path> [--current <ids>] --label frozen --source-label <SL>`: `checkAccepted(<the
     binding>, { current })`, `current` built for each comma-separated id as `{ id, treeId: (await
     ensureTree(id)).treeId, paramsHash: sha256(JSON.stringify((await ensureTree(id)).params)) }` (none when the
     option is absent); prints `binding: <status>` and, when not `pass`, ` (<reasons joined by '; '>)`; exit 0 only
     on `pass`, else 2.
3. **Reserved namespaces** in `self-test.mjs`: `export const HISTORICAL_SELFTEST = Object.freeze(['V4-T04', 'V4-T04v4',
   'V4-T04f', 'V4-T04i'])` and `export function reservedTaskProblem(label, task, stateExists)`: `label === 'frozen'
   && HISTORICAL_SELFTEST.includes(task) && stateExists` gives `self-test: <task> is a historical stage-1 record; use
   another --task`, else `null`. `main` calls it with `existsSync(artifactDir(label, task, 'self-test',
   'state.json'))` before any case runs; a problem goes to stderr with exit 3, nothing written.
4. **Self-test** cases appended to `--items` (Tests table); **README.md**: T04c's section gains the accepted binding,
   its file, the rule that it is never rewritten, the historical namespaces, `evidence-check`, `check-binding` and
   `checkAccepted`'s order. Then run the gates of the table, then `evidence-check` (the guard).
5. **Accept stage 1** (unlocked; after the gates of the table are green and `evidence-check` printed `unchanged`):

   ```powershell
   node tools\ig-proto\v4-check.mjs evidence-check --receipt docs/improve-generating/evidence/frozen/V4-T04/stage1.json --label frozen --source-label 'frozen 3fc65f4'
   if ($LASTEXITCODE -ne 0) { throw ('STOP: a stage-1 input changed (' + $LASTEXITCODE + ')') }
   node tools\ig-proto\v4-check.mjs accept --task V4-T04 --receipt docs/improve-generating/evidence/frozen/V4-T04/stage1.json --binding docs/improve-generating/evidence/frozen/V4-T04/accepted-binding.json --by V4-T04f --label frozen --source-label 'frozen 3fc65f4'
   if ($LASTEXITCODE -ne 0) { throw ('STOP: accept exited ' + $LASTEXITCODE) }
   node tools\ig-proto\v4-check.mjs check-binding --binding docs/improve-generating/evidence/frozen/V4-T04/accepted-binding.json --label frozen --source-label 'frozen 3fc65f4'
   if ($LASTEXITCODE -ne 0) { throw ('STOP: check-binding exited ' + $LASTEXITCODE) }
   ```

   A `throw`: stop and report the output (`QUESTION:`); never edit the receipt or a stage-1 input.

## Tests

All in `tools/ig-proto/self-test.mjs --items`, with temporary files under `artifactDir('selftest', 'accept')`. `R` =
a receipt written there: `proofEnvelope({ kind: 'stage1', verdict: 'pass', source: { frozenCommit: FROZEN_COMMIT,
sourceDigest: FROZEN_DIGEST }, harnessHash: 'h', arms: [{ id: 'v4', treeId: 't1', paramsHash: 'p1' }], coverage: {
expected: ['a', 'b'], observed: ['a', 'b'], missing: [], censored: [] }, evidence: [<one temporary input file and its
hash>], fields: { line: 'Stage 1: holds.' } })`; `O` = `{ receiptPath: <R's path>, harnessHash: 'h', arms: <R's arms>,
params: { v4: { W: 1 } }, coverage: ['a', 'b'], fields: { line: 'Stage 1: holds.' }, by: 'selftest' }`.

| Case name | Input | Expected |
|---|---|---|
| `accept: a passing receipt is bound` | `B = acceptedBinding(O)`; `checkAccepted(B, { current: [] })` | `B.receipt.sha256` equals `sha256Text` of R's text; `B.expected.coverage.expected` is `['a', 'b']`; `B.params.v4.W` is 1; the check is `pass` |
| `accept: the receipt's own coverage does not define the requirement` | R rewritten with `coverage.expected` and `observed` `['a']`; `acceptedBinding(O)` | throws `accept: incomplete (coverage gap b)` |
| `accept: another producer is refused` | `acceptedBinding({ ...O, harnessHash: 'h2' })` | throws `accept: incomplete (producer changed)` |
| `accept: a historical binding survives later work` | `B` of case 1; `checkAccepted(B, { current: [], readFile })` with a `readFile` that throws for any path under `tests/artifacts/ig-proto/tree-frozen/`, `tools/ig-proto/variants/` or `tools/ig-proto/lib/` and reads every other path; `harnessInfo().harnessHash` read in the case | today's harness hash differs from `'h'`; the check is `pass` and no forbidden path was read |
| `accept: changes and stale arms` | (a) R's input file changed by one byte after `B` was built; (b) R itself changed by one byte; (c) `current: [{ id: 'v4', treeId: 't9', paramsHash: 'p1' }]`; (d) `current: [{ id: 'x', treeId: 't1', paramsHash: 'p1' }]`; (e) `B` with `format` `'other'` | (a) `incomplete`, `evidence changed <path>`; (b) `incomplete`, `receipt changed <path>`; (c) `incomplete`, `stale arm v4`; (d) `incomplete`, `unbound arm x`; (e) `incomplete`, `not an accepted binding` |
| `accept: the expectation comes from the captured inputs` | `stage1Expectation('V4-T04', evidenceOf, inputsOf)` with `evidenceOf` returning `{ identity: { harnessHash: 'h', treeIds: { v4: 'x' } }, rows: [], problems: [] }` for both steps (and recording that `historical: true` was passed) and `inputsOf` returning `{ treeId: 'y', params: {} }`; then `{ treeId: 'x', params: { W: 2 } }`; then `null` | throws `accept: captured tree v4 differs from the observation (x vs y)`; then `harnessHash` `'h'`, arms `[{ id: 'v4', treeId: 'x', paramsHash: sha256('{"W":2}') }]`, `coverage` the 32 item ids of the two V4-T04 manifests then the nine ids of `STAGE1_COVERAGE_EXTRA`; then throws `accept: no captured tree metadata for v4` |
| `accept: a binding is never rewritten` | `main(['accept', '--task', 'V4-T04', '--receipt', <R's path>, '--binding', <an existing file>, '--by', 'x', '--label', 'frozen', '--source-label', 'x'])` | returns 1; the existing file is byte-equal |
| `accept: the historical namespaces are reserved` | `reservedTaskProblem('frozen', 'V4-T04f', true)`, `('frozen', 'V4-T04f', false)`, `('frozen', 'V4-T04f-verify', true)`, `('provisional', 'V4-T04', true)` | the first gives `self-test: V4-T04f is a historical stage-1 record; use another --task`; the other three `null` |
| `accept: evidence-check` | `main(['evidence-check', '--receipt', <R's path>, '--label', 'frozen', '--source-label', 'x'])`; then the same after R's input file changed | returns 0 and prints `evidence: unchanged (1 files)`; then returns 2 and prints `evidence: changed <path>` |

## Documentation

`tools/ig-proto/README.md` (step 4).

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task V4-T04f-verify` | root | every `--items` case passes, exit 0 | 3 min |
| step 5's commands | root | `evidence: unchanged (<n> files)`; `accepted: docs/improve-generating/evidence/frozen/V4-T04/stage1.json sha256 <hash> -> docs/improve-generating/evidence/frozen/V4-T04/accepted-binding.json`; then `binding: pass`; each exit 0 | 2 min |
| `node tools\ig-proto\firewall.mjs check --task V4-T04f-verify --label frozen` | root | `files unchanged` | 1 min |
| `npm run check` | root | exit 0 | 2 min |

## Stop points and questions

- Stop and report before step 5 when a gate above it is not green or `evidence-check` does not print `unchanged`;
  after step 5 with its output (the orchestrator commits the binding with this task).
- `QUESTION:` when `accept` refuses the stage-1 receipt (a captured tree that differs from the observation, two
  producers, a coverage gap or a changed input): the stage-1 records are never edited or re-run here.
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code;
  an ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside
  the scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T04f-B01 | Stage 1 is bound once, to its producer, its captured arms and a coverage that the receipt cannot shorten; the binding stays valid after later harness, variant and tree changes | cases 1 to 4; step 5 | self-test output; `accepted-binding.json` |
| T04f-B02 | No later verification can overwrite a stage-1 input: the historical namespaces are reserved and the inputs are checked before acceptance | cases 8 and 9; `evidence-check` | self-test output; command output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T04f-T01 | `checkAccepted`'s order: format, receipt hash, `proofCheck` (evidence hashes), current arms | case 5 | self-test output |
| T04f-T02 | The expectation is built from the stored identities and the captured copies, never from a tree folder | cases 4 and 6 | self-test output |
| T04f-T03 | A binding is never rewritten | case 7 | self-test output |
| T04f-T04 | Nothing else changed; formats | guards; `npm run check` | command output |

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
