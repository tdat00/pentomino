# P2-13d: The driver: rows, resume and publication

| Item | Value |
|---|---|
| Feature, plan | `improve-generating-phase-2`; plan §7.2, §7.3 (order: equality before interpretation), §7.6 (stops); D-P2-12, D-P2-15; review-1 R1, R3; review-2 R2-01; `contracts.md` C3 to C5, C8, C9, C10 |
| Repository, slot, branch, base | `Q:\git\pentomino`; the slot the orchestrator names (`Q:\git\pentomino-p2-w<n>`, check-list §3.7), branch `p2/P2-13d` from the `gen-v4` head at the start; G-PROTECTED base `97a6326` |
| Lane; starts when merged | T; P2-13a (`p2.mjs`, the plan, the seal and the ledger) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (`claude-sonnet-5.5`) |
| Estimate | developer 3 h; machine: unlocked synthetic tests (no engine) |

## Goal

The locked invocation of a group runs its rows one at a time, each as a one-row bench run of its sealed copy. Each
row has a durable start record before it launches and a terminal record after it. A killed or interrupted run can
therefore never be repeated or mistaken for an unstarted row. Every row keeps its raw evidence and its hashes, and the
stage snapshots are published write-once.

## Authority and fixed points

- **`contracts.md`:**
  - C3: the row line, written by the copies' `log-8`;
  - C4: the row receipt;
  - C5: the status journal, the row line and the resume rules;
  - C8: snapshots;
  - C10: activation.

  This task implements C4, C5, C8 and the reading of C10.
- **R1, A's group 1.** It runs its 8 smoke rows first. Then `smokeGate` decides, in process, before the first
  `require` row; a failed or missing smoke proof stops the group there. The real gate is P2-13b's; this task writes a
  stub that always fails, so nothing can pass before P2-13b exists.
- **R3:**
  - a group keeps its own deferred keys and is invoked again until every active key is terminal or the ledger refuses;
  - a started row without a terminal result is `interrupted`, never generated again;
  - unused allowance slots are not observations;
  - self-tests use an isolated state root.
- **The calibrate command line** (`tools/calibrate.mjs` lines 49-60 and 566-580):
  - `--output <base>` writes `<base>.json`, `<base>.md` and `<base>.checkpoint.jsonl`;
  - exit 0 is complete, 2 is incomplete;
  - the one-row matrix `{ version: 1, profile: 'smoke', cases: [ ... repetitions: 1, seeds: [seed] ] }` is supported
    (R3);
  - `report.runs` holds the run records, and a generation run has `probeKind: 'generation'`.
- **The copies' environment.** `IG_LOG_DIR` (the row's journal folder), `IG_ROW` (its `fileKey`), `IG_SEED` (its seed,
  which `log-8` checks), and `IG_SOURCE_LABEL` (`meta-1`).
- **The horizon.** A row is admitted only while `elapsed + rowLimitS + 10 <= 885`, with `elapsed` the seconds since
  the `run-group` process started (P2-13a's `HORIZON_S`).

## Scope

- **Change:** `tools/ig-proto/phase2/p2.mjs` (the commands below) and `tools/ig-proto/phase2/p2.test.mjs` (new cases).
- **Create:** `tools/ig-proto/phase2/gates.mjs`, with only the stub of step 2 (P2-13b replaces it).
- **Do not change:** anything else. Guard: G-PROTECTED, and G-WORKTREE with

  ```powershell
  $Allowed = @('tools/ig-proto/phase2/p2.mjs', 'tools/ig-proto/phase2/p2.test.mjs', 'tools/ig-proto/phase2/gates.mjs',
    'tasks/improve-generating-phase-2/P2-13d-rows-and-publication.md')
  ```

## Steps

1. **`export async function runGroup(opts, deps)`**, used by the command
   `p2.mjs run-group --stage <S> (--group <n> | --overflow-group <n>) --invocation <id> [--state <dir>] [--clock-offset-s <s>]`.
   - **Inputs.** `opts` holds `stage`, `group` or `overflowGroup`, `invocation`, the state paths, and
     `clockOffsetS`, which only `--state` allows and which adds to `elapsed`. `deps` holds `smokeGate` (default: that
     of `gates.mjs`), `spawn` (default: `spawnSync`), and `now` (default: `performance.now`).
   - **Load:**
     - `E/plan/plan.json`;
     - `E/seal/seal.json`, for the copies' `treeId` and `copyDigest` and for `commit`;
     - `E/twins/activation.json` when it exists, after checking that its `planSha256` and `sealSha256` match.
   - **The keys of the group.**
     - Rows: the plan group's `keys` in order.
     - Overflow: the receipt's `overflow.groups[n - 1]`, each a triggered row key; with no receipt, exit 8.
   - **Open slots.** With no receipt, the group exits 8 (`activation receipt required`) before its first open slot.
     Otherwise `slots[key]` decides:
     - `null`: the slot is inactive and skipped. It is not an observation, and it writes no record.
     - a triggered row key: the slot runs that row's twin.
   - **A twin** of a triggered row `t` is `t`'s cell, rep, seed, `uniqueness`, `maxActive` and `boardRows`, with arm
     `uncapped`, variant `p2-uncapped`, or `p2-uncapped-diag` for a Hell 1 cell, `rowLimitS` 260, `component`
     `conditional-twin`, and key `conditional-twin/uncapped/<cell>/<rep>`.
   - **Resume (C5).** Reconcile `RAW/rows/<S>.status.jsonl` first. A key with a `start` and no terminal line is `done`
     when its `report.json` and `receipt.json` both exist and the report holds exactly one generation run, and the row
     line is then written if it is missing. Otherwise the key is `interrupted` with `cause: 'no-report'`. Either way it
     is never launched again.
   - **For each key in order:**
     - Skip it when it is terminal or inactive.
     - When `elapsed + rowLimitS + 10 > 885`, print `deferred <key>` for it and for every later key of the group, and
       stop launching.
     - Otherwise run the row (step 3).
   - **A's group 1.** When its 8 smoke keys are all terminal and `RAW/rows/smoke-gate.json` does not exist, call
     `deps.smokeGate(smokeRowLines, plan)`. Write its result `{ ok, problems, at }` to `RAW/rows/smoke-gate.json`. When
     that file says `ok: false`, exit 6 before the first `require` key, on this call and on every later one.
   - **Exit codes:** 0 when every active key of the group is terminal; 7 when keys were deferred; 6 for the smoke gate;
     8 for a missing activation.
2. **`gates.mjs` (the stub):** `export function smokeGate() { return { ok: false, problems: ['smoke gate not implemented (P2-13b)'] }; }`
3. **Running one row.** Let `raw = RAW/raw/<fileKey>/` and `tree = RAW/trees/<source>/<variant>/`.
   1. Append `{ t: 'start', key, group, invocation, at }` to `RAW/rows/<S>.status.jsonl`, with `fsyncSync`.
   2. Write `raw/matrix.json`: `{ version: 1, profile: 'smoke', cases: [{ id: cell, boardRows, rotation: 0, levelId, maxActive, quantity: 10, uniqueness, seedPrefix, repetitions: 1, seeds: [seed] }] }`.
      `seedPrefix` is the seed up to its second-last `/`.
   3. Run `deps.spawn(process.execPath, ['--max-old-space-size=2048', join(tree, 'tools', 'calibrate.mjs'), '--matrix', <raw>/matrix.json, '--workers', '4', '--fresh-process', '--no-cancel-probe', '--child-limit-s', String(rowLimitS), '--output', join(raw, 'report')], { cwd: tree, env: { ...process.env, IG_LOG_DIR: join(raw, 'journal'), IG_ROW: fileKey, IG_SEED: seed, IG_SOURCE_LABEL: \`${variant} ${seal.commit}\` }, stdio: ['ignore', fd, fd] })`.
      `fd` is `raw/calibrate.log`, opened for appending. Create `raw/journal/` first.
   4. Write `raw/receipt.json` (C4, CRLF, 2-space JSON):
      - `key`, `fileKey`, `stage`, `group`, `invocation`, `variant`;
      - `copy: { treeId, copyDigest }`, from the seal;
      - `report: { path, sha256 }` with `path` `raw/<fileKey>/report.json` (relative to `RAW`, `/`-separated), or
        `null`;
      - `journal`: every file of `raw/journal/` in name order as `{ name, bytes, sha256 }`;
      - `childExit`, `startedAt`, `endedAt`.
   5. When `raw/report.json` holds exactly one run with `probeKind: 'generation'`:
      - (review-2 R2-01, verbatim) Compute `ledger = rowWork(join(raw, 'journal'), { row: fileKey, seed, acceptedCount: run.acceptedCount })`.
        Persist the complete C9 result, including `outcomes` and `rerateStarts`, in C5. Use `workLedger(ledger)` only
        when constructing the input to the frozen statistical functions; never when storing or publishing the row.
      - append the C5 row line `{ key, fileKey, stage, group, component, arm, variant, cell, rep, seed, uniqueness, run, telemetry: run.telemetry ?? null, receipt: <sha256 of receipt.json>, ledger }`
        to `RAW/rows/<S>.jsonl` with `fsyncSync`;
      - then append `{ t: 'done', key, at }` to the status journal.

      Otherwise append `{ t: 'interrupted', key, cause: 'no-report' }`, or `cause: 'child-exit <code>'` when the
      report is missing and the child exit is not 0 or 2.
4. **`p2.mjs status --stage <S>`** prints, per group, the counts of `done`, `interrupted`, `inactive` and `pending` keys.
5. **`p2.mjs publish --stage <S> --out <dir> [--rows <dir>]` (C8).**
   - It writes `<dir>/<S>.jsonl` (the rows file of `--rows`, default `RAW/rows`, with CRLF line ends),
     `<dir>/<S>.md` (row counts per component, arm and cell) and `<dir>/<S>.sha256` (the SHA-256 of the `.jsonl`).
   - When `<dir>/<S>.jsonl` exists with other bytes, it exits 3 and writes nothing.
   - It prints `publish: <S> <rows> rows <sha256>`.
6. **Tests.** Write the cases below. Each builds its own state root: `plan.json`, `seal.json` (copy entries with fixed
   fake ids) and a fake tree. The tree holds `RAW/trees/gen-v4/p2-gen4/tools/calibrate.mjs`, a script written by the
   test that acts by `P2_FAKE_CALIBRATE`:
   - `ok`: writes `<output>.json` with one generation run (`acceptedCount` 10, a `telemetry` object), a complete C1
     journal (a `worker` line and one set call), the C2 link lines and the C3 row line;
   - `noreport`: writes nothing and exits 1.

   It also writes a launch marker. The cases call the exported `runGroup` with injected `deps`, except the publish
   cases.

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `tools/ig-proto/phase2/p2.test.mjs` | `a row starts durably and ends with its receipt and line` | one key; `ok` | status lines `start` then `done`; `receipt.json` with the C4 fields and the journal inventory; one row line whose `ledger.complete` is true, whose `ledger` keeps `outcomes` and `rerateStarts`, and whose `receipt` is the receipt's SHA-256; exit 0 |
| same | `a child without a report is interrupted` | `noreport` | status `interrupted`, `cause: 'child-exit 1'`; no row line; exit 0 |
| same | `resume never launches a started row again` | a status journal with `start` for key `k1`, whose report and receipt exist, and `start` for `k2` with nothing | `k1` `done` with its row line; `k2` `interrupted`, `no-report`; no launch marker |
| same | `a group keeps its deferred keys` | two keys with `rowLimitS` 130; `clockOffsetS` 800 | `deferred` for both; no launch; exit 7. Then without the offset: both run; exit 0 |
| same | `the smoke gate stops before the first require row` | A group 1 with 2 smoke keys and 1 `require` key; `deps.smokeGate` returning `{ ok: false, problems: ['x'] }` | the smoke rows run; `smoke-gate.json` `ok: false`; the `require` key is not started; exit 6; a second call also exits 6 without launching |
| same | `a passing smoke gate lets the require rows run` | the same with `deps.smokeGate` returning `{ ok: true, problems: [] }` | three row lines; exit 0 |
| same | `open slots resolve through the activation receipt` | a group with an open slot: no receipt; then a receipt mapping it to `shipped/gen-v4/20x20-hell-1/23`; then a receipt mapping it to `null` | exit 8; then a row line with key `conditional-twin/uncapped/20x20-hell-1/23` and variant `p2-uncapped-diag`; then no record and exit 0 |
| same | `an activation for another plan is refused` | a receipt whose `planSha256` differs | exit 8 with `activation receipt does not match the plan` |
| same | `overflow groups come from the receipt` | `overflowGroup: 1`; `overflow.groups: [['shipped/gen-v4/10x10-nightmare/21']]` | one twin row line, key `conditional-twin/uncapped/10x10-nightmare/21`, variant `p2-uncapped` |
| same | `publish is write-once` | publish a rows file; publish it again; add a line and publish again to the same folder | `.jsonl`, `.md` and `.sha256` written; the second run writes the same bytes, exit 0; the third exits 3 and changes nothing |

## Documentation

None here; P2-17 writes the README section.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node --test tools/ig-proto/phase2/p2.test.mjs` | slot root, unlocked (no engine) | `# fail 0`, `# cancelled 0` | 5 min |
| G-CHECK, G-PROTECTED, G-WORKTREE, G-FORMAT | §3.4 | OK lines | 2 min |

## Stop points and questions

- **`QUESTION:`** when:
  - calibrate's output naming or exit codes differ from the authority above;
  - a C4 or C5 field cannot be filled from the inputs named here.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-13d-B01 | A measured row is never repeated, never lost and never mistaken for an unstarted one | resume and interrupt cases | test output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-13d-T01 | R3: durable start and terminal records; deferred keys stay in their group; snapshots are write-once | the cases | test output |
| P2-13d-T02 | R1: A's group 1 stops before its `require` rows unless the smoke gate passes | smoke cases | test output |
| P2-13d-T03 | C10: open slots and overflow groups only through a matching activation receipt; inactive slots are not observations | activation cases | test output |
| P2-13d-T04 | Raw evidence bound per row (report and journal hashes, invocation) | the first case | test output |

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
| Slot, base SHA | |
| Start, end, duration | |
| Waiting for rulings | |
| Agent id, model | |
| Calls; input, output and cache-read tokens | |
| AI credits | |
| Questions and rulings | |
| Fix rounds | |
| Gates re-run by the orchestrator (merge gate) | |
| Commit (slot), commit on `gen-v4` | |
| Issues and named items | |
