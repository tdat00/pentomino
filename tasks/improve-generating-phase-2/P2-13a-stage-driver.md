# P2-13a: The driver: plan, seal, ledger and the locked wrapper

| Item | Value |
|---|---|
| Feature, plan | `improve-generating-phase-2`; plan §7.1 (settings, source binding R2), §7.2 (population), §7.6 (price, schedule, stops, R5); D-P2-12, D-P2-15; P2-T14; review-1 R1, R2, R13; review-2 R2-06; review-3 R3-01; `contracts.md` C7, C12, C13 |
| Repository, slot, branch, base | `Q:\git\pentomino`; the slot the orchestrator names (`Q:\git\pentomino-p2-w<n>`, check-list §3.7), branch `p2/P2-13a` from the `gen-v4` head at the start; G-PROTECTED base `97a6326` |
| Lane; starts when merged | T; P2-13r |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (`claude-sonnet-5.5`) |
| Estimate | developer 3 h; machine: unlocked synthetic tests (no engine, no lock) |

## Goal

The orchestrator runs the approved validation as locked invocations that can never pass the 812-minute ledger. This
task builds the frozen plan of the 1,013 enumerated rows and the seal of every measured source, tool and fixed input.
It also builds the ledger with its admission, reservation and stage-B readout checks, and the PowerShell wrapper that
charges every invocation, failed ones included. P2-13d then runs the rows.

## Authority and fixed points

- **The approved schedule, unchanged (R1).** `docs/improve-generating-phase-2/evidence/sa-astra/round1-cross-audit.json`:
  - `rows`: 1,013 objects with `key`, `component`, `stage`, `arm`, `cell`, `rep`, `seed`, `rowLimitS`, and for
    `require` rows `uniqueness`, `quantity`, `maxActive`, `diagnosticOffer`;
  - `stages.A.schedule` (23 groups) and `stages.B.schedule` (26 groups), each `{ nodeS, quietS, keys }`.

  There is no group 0. A's group 1 is the 8 smoke rows, then 3 `require` rows; P2-13d runs it with the smoke gate
  between them. The five rows `conditional-twin/uncapped/unresolved-trigger-<n>/0` are open slots, resolved by the
  activation receipt (C10), never by editing the plan.
- **The ledger rules:** check-list §3.5 and `contracts.md` C7.
  - An invocation counts its `IG` seconds plus 45; a helper timeout counts its limit plus 45.
  - Admission needs `spent(stage) + limit + 45 <= stageMap[stage] x 60`, with the sealed `stageMap` `{ A: 410, B: 402 }`.
  - A reservation blocks a second invocation.
  - Stage B needs the committed readout (C12).
- **The lock helper** `tools/ig-proto/lock/ig-lock.ps1` `Invoke-IgNode` (lines 39-133):
  - it writes `IG <task> exit=<e> seconds=<s> quiet=<q>` with `Write-Host` after the child exits;
  - a nonzero exit then throws `IG <task> command failed: <e>`;
  - a timeout throws `<limit>-second limit reached; record the timeout and shard the work` before any `IG` line;
  - no slot throws `No quiet timing slot within <h> h; report to the orchestrator`;
  - the child's stdout goes to the console, not to the pipeline (R2), so the tools write their own logs.
- **R13: what the seal binds.**
  - the production `SOURCE_FILES` digest;
  - each copy's `ig-tree.json` and `p2-copy.json` (P2-12b), with each copy digest recomputed;
  - the today worktree's head and cleanliness;
  - every file of `tools/ig-proto/phase2/`;
  - the fixed inputs below, the plan, and the Node version.

  P2-13e hardens this seal (review-2 R2-04: input and runtime digests, the reused tooling, the snapshot, write-once) and
  adds `sealSha256` to every record. `contracts.md` C13 is the seal's format.

## Scope

- **Create:** `tools/ig-proto/phase2/p2.mjs` (the commands below), `tools/ig-proto/phase2/run-group.ps1`,
  `tools/ig-proto/phase2/fixtures/fake-invoker.ps1`, `tools/ig-proto/phase2/p2.test.mjs`.
- **Do not change:** anything else. Guard: G-PROTECTED, and G-WORKTREE with

  ```powershell
  $Allowed = @('tools/ig-proto/phase2/p2.mjs', 'tools/ig-proto/phase2/run-group.ps1',
    'tools/ig-proto/phase2/fixtures/fake-invoker.ps1', 'tools/ig-proto/phase2/p2.test.mjs',
    'tasks/improve-generating-phase-2/P2-13a-stage-driver.md')
  ```

## Steps

1. **Paths and state.** `p2.mjs` resolves its paths from a state root:
   - Without `--state`: `E` is `docs/improve-generating-phase-2/evidence/` and `RAW` is `tests/artifacts/ig-proto/phase2/`,
     under the repository root, which is the folder three levels above `p2.mjs`.
   - With `--state <dir>` (self-tests only): `E` is `<dir>/E/` and `RAW` is `<dir>/RAW/`. The real files are never
     read or written.

   Constants:
   - `STAGE_MAP = Object.freeze({ A: 410, B: 402 })`;
   - `QUIET_S = 45`;
   - `HORIZON_S = 885`;
   - `SEALED_INPUTS`: the audit file above; `tasks/improve-generating-phase-2/contracts.md`; the folders
     `docs/improve-generating/evidence/frozen/V4-S4/`, `docs/improve-generating/evidence/frozen/V4-S4C/` and
     `generator/`; and `tests/fixtures/replay-case.json` and `tests/fixtures/replay-case-v4.json`.
2. **`p2.mjs plan --out <dir>`.** Writes `<dir>/plan.json` and `<dir>/plan.md` (CRLF) and prints
   `plan: <sha256 of plan.json> (<n> rows)`. An existing `plan.json` with other bytes is refused (exit 3).
   - Each row keeps the audit fields and adds:
     - `fileKey`: `key` with each `/` replaced by `~`;
     - `group`: its 1-based position in its stage's schedule;
     - `open`: true for the five `unresolved-trigger` rows;
     - `levelId`: the cell after its board part (`nightmare`, `master` or `hell-1`);
     - `variant`, `source`: see below;
     - `boardRows`: the entry `cases[<cell>].boardRows` of `tools/ig-proto/data/boards-v1.json` when it exists, else
       `rectRows(w, h)` of `tools/bench/calibration-reference.js` from the `<w>x<h>` board part;
     - `maxActive`: the row's, else 676;
     - `uniqueness`: the row's, else `'any'`;
     - `quantity`: 10.

     Open rows have no `levelId`, `boardRows` or `variant`.
   - **Variants.**

     | Arm | Not Hell 1 | Hell 1 | `source` |
     |---|---|---|---|
     | `gen-v4` | `p2-gen4` | `p2-gen4-diag` | `gen-v4` |
     | `today` | `p2-today` | none (no such row) | `today` |
     | `no-screen` | `p2-none` | none | `gen-v4` |
     | `uncapped` | `p2-uncapped` | `p2-uncapped-diag` | `gen-v4` |

   - `groups`: `[{ stage, group, keys, nodeS, quietS }]`, copied from the schedules.
   - `plan.md` lists per stage each group's row count by `component`.
3. **`p2.mjs seal --commit <sha> --today-root <dir> --plan <plan.json> --out <dir>`.** Writes `<dir>/seal.json` and
   prints `seal: <sha256 of seal.json>`.
   - **Refusals** (exit 3, `seal: refused <why>`):
     - `git rev-parse HEAD` of the repository is not `--commit`;
     - `git status --porcelain --untracked-files=no` of the repository is not empty;
     - `git -C <today-root> rev-parse HEAD` does not start with `6b94ffb`;
     - `git -C <today-root> status --porcelain` is not empty;
     - a copy is missing, or its recomputed digest differs from its `ig-tree.json`;
     - a sealed input is missing.

     These are read-only git commands, run with `execFileSync('git', [...])`.
   - **Fields:**
     - `format: 'p2-seal'`, `version: 1`, `commit`, `stageMap`, `node: process.version`, `plan: { path, sha256 }`;
     - `sourceDigest`: `computeSourceDigest` (`tools/bench/report.js:662`) over the repository;
     - `today: { root, head, digest }`;
     - `copies`: for each tree folder `RAW/trees/<source>/<id>/`, the fields of its `p2-copy.json` plus `verified: true`;
     - `tools` and `inputs`: `[{ path, sha256 }]` for every file under `tools/ig-proto/phase2/` and of `SEALED_INPUTS`,
       in path order, each text hashed after `lf`.
   - **`p2.mjs seal --check [--seal <path>]`** (review-3 R3-01, verbatim): "Creation alone requires the production
     repository's HEAD to equal `--commit` and its tracked worktree to be clean. `seal --check` does not repeat those
     two creation-only refusals. It preserves the recorded `commit`, requires the current Node version to equal
     `seal.node`, and recomputes/checks the sealed plan, tools, inputs, production source digest, copy
     identity/input/runtime/files digests and frozen snapshot. Changes to files outside that sealed inventory,
     including ledger lines, published observations, readouts and task logs, and commits containing only such changes
     are allowed. A sealed-file change still fails by digest. The today worktree's fixed HEAD and cleanliness checks
     still apply. Output remains `seal: OK` or `seal: drift <field> <path or id>` (exit 3)."
     - In this task the seal has no runtime or files digests and no snapshot yet: `seal --check` checks the fields
       that this task's seal has (step 3's list), and P2-13e adds the others (`contracts.md` C13).
4. **The ledger (C7).**
   - `p2.mjs ledger --status` prints, per stage, `spent`, `authorization` and `remaining`, in seconds and in minutes
     with 3 decimals.
   - `p2.mjs ledger --check --stage <A|B> --limit <s>` prints `ledger: admitted ...` (exit 0) or `ledger: refused <why>`
     (exit 4). It refuses when:
     - a reservation `RAW/pending.json` exists;
     - `spent + limit + QUIET_S > STAGE_MAP[stage] x 60`;
     - the stage is B and `checkReadout` fails (step 5).
   - `p2.mjs reserve --stage <S> (--group <n> | --item <name> | --overflow-group <n>) --limit <s>` creates
     `RAW/pending.json` with `openSync(path, 'wx')` (exit 4 when it exists), and prints the reservation id
     `<S>-<n>.<k>` (rows), `<S>-<name>.<k>` (items) or `<S>-o<n>.<k>` (overflow), with `k` the next ledger line number.
   - `p2.mjs ledger --append --json <text>` validates a C7 line, appends it with `appendFileSync` and `fsyncSync`, and
     exits 0. A missing field, or an `id` already in the ledger, exits 5 and writes nothing.
     - **`rowsWritten`** (review-2 R2-06, verbatim): "Count terminal keys whose unique durable C5 start names this
       invocation, joining by key within the same seal and stage. Never filter terminal records for an undeclared
       invocation field. Recovered terminals retain the original start association; they do not represent another
       engine invocation or change an old duration line."
       - `--append` counts it itself from `RAW/rows/<stage>.status.jsonl`; the caller passes 0.
       - "The same seal" means equal `sealSha256` fields. P2-13e adds them to every record (C5, C7); until then both are
         absent, which counts as equal.
   - `p2.mjs release --id <id>` removes `RAW/pending.json` only when its `id` equals `--id` and the ledger holds a line
     with that `id`; otherwise exit 5.
5. **`export function checkReadout({ text, committed, sealSha256, reportSha256, reportGates })`** (C12), pure. It returns
   `{ ok, why }`, where `ok` is false when:
   - `text` is `null`, or `committed` is false;
   - the first five lines are not exactly the C12 lines (`Seal:`, `Report A:`, the two `Accepted by` lines, and
     `Stage B: PROCEED`);
   - `Seal:` differs from `sealSha256`, or `Report A:` from `reportSha256`;
   - an acceptance time is not `yyyy-mm-dd hh:mm +07:00`;
   - `reportGates` has an entry with `status` `'fail'` or `'incomplete'` and no line `Owner continuation: <digits>`
     follows.

   The CLI reads `docs/improve-generating-phase-2/stage-a-readout.md`. It sets `committed` from
   `git ls-files --error-unmatch <file>` (exit 0) and `git diff --quiet HEAD -- <file>` (exit 0). It hashes `seal.json`
   and `E/report-A/report.json`, and reads `gates` from that report (P2-13b writes it). With `--state <dir>` it reads
   `<dir>/stage-a-readout.md` instead, and `committed` is true when the file `<dir>/stage-a-readout.committed` exists:
   self-tests run no git.
6. **`run-group.ps1`.**
   - **Parameters**, in three parameter sets:
     - `Rows`: `-Stage A|B` and `-Group <int>`;
     - `Item`: `-Stage`, `-Item <string>`, `-LimitSeconds <1..900>` and `-NodeArgs <string[]>`;
     - `Overflow`: `-Stage B` and `-OverflowGroup <int>`.

     Common to all three: `-State <dir>` and `-InvokerScript <path>`, for self-tests only. There is no
     `-Authorization` parameter.
   - **Setup.** The script sets `$root` to the folder three levels above itself, runs `Set-Location -LiteralPath $root`
     and sets `[Environment]::CurrentDirectory = $root`. It checks every native exit.
   - **Flow:**
     1. `node p2.mjs seal --check`. It is skipped when `-State` is given.
     2. `node p2.mjs ledger --check --stage <S> --limit <limit>`, with `limit` 900 for rows and overflow, else
        `-LimitSeconds`.
     3. `$id = node p2.mjs reserve ...`

        A refusal in 1 to 3 throws, before any invocation and without a ledger line: `STOP: seal drift <output>`,
        `STOP: ledger refused <output>` or `STOP: reservation refused <output>`.
     4. In `try`:
        - the Node arguments are `@('tools\ig-proto\phase2\p2.mjs', 'run-group', '--stage', $Stage, '--group', "$Group", '--invocation', $id)`,
          with `--overflow-group` for an overflow group, or `-NodeArgs` for an item; plus `--state` when given;
        - `$start = Get-Date`;
        - the invocation is `Invoke-IgNode -Repo pentomino -Task "P2 $id" -LimitSeconds $limit -QuietSeconds 45 -NodeArgs $nodeArgs -InformationVariable info`,
          after dot-sourcing `tools\ig-proto\lock\ig-lock.ps1`; with `-InvokerScript`, it is
          `& $InvokerScript -Task "P2 $id" -LimitSeconds $limit -NodeArgs $nodeArgs -InformationVariable info`.
     5. In `catch`, keep the error as `$err`.
     6. In `finally`, classify the invocation:
        - the last information line matching `^IG .* exit=(-?\d+) seconds=([0-9.]+) quiet=(\d+)$` gives
          `nodeSeconds`, `exit`, `killed = $false`, and `cause` `'ok'` (exit 0) or `'exit'`;
        - otherwise, an `$err` whose message matches `^(\d+)-second limit reached` gives `nodeSeconds = $limit`,
          `exit = -1`, `killed = $true`, `cause = 'timeout'`;
        - otherwise it is an accounting stop: write `STOP: accounting: <message>`, append nothing, release nothing,
          and throw.
     7. Append the line
        `{ id, stage, group | item, start, end, nodeSeconds, quietS: 45, countedSeconds: nodeSeconds + 45, limitS, killed, exit, rowsWritten: 0, cause }`
        with `ledger --append`, then `release --id`. Either failing throws `STOP: ledger <what> failed`; the reservation
        then stays.
     8. Afterwards:
        - an `$err` with `exit` 7 on a row group is the "deferred keys remain" outcome (P2-13d): write
          `RG: <id> deferred keys remain; run the same group again` and `exit 7`;
        - any other `$err` is rethrown unchanged;
        - success writes `RG: <id> ok` and exits 0.
7. **`fixtures/fake-invoker.ps1`** (`[CmdletBinding()]`, the same parameters as the call above). It never runs Node.
   It writes the marker file `$env:P2_FAKE_MARKER` and acts by `$env:P2_FAKE_MODE`:

   | Mode | What it does |
   |---|---|
   | `ok` | `Write-Host 'IG <task> exit=0 seconds=12.5 quiet=45'` |
   | `exit1` | the `IG` line with `exit=1`, then `throw 'IG <task> command failed: 1'` |
   | `deferred` | the `IG` line with `exit=7`, then the same throw with `7` |
   | `timeout` | `throw '<limit>-second limit reached; record the timeout and shard the work'` |
   | `noslot` | `throw 'No quiet timing slot within 6 h; report to the orchestrator'` |

8. **Tests.** Write the cases below. The PowerShell cases spawn
   `pwsh -NoProfile -Command "& '<run-group.ps1>' -Stage A -Group 2 -State '<dir>' -InvokerScript '<fake-invoker.ps1>'"`
   with `P2_FAKE_MODE` and `P2_FAKE_MARKER` in the environment. Each case uses a new state folder under
   `tests/artifacts/ig-proto/phase2/self-test/p2-<start ms>/<case>/`, and an `after` hook removes it.

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `tools/ig-proto/phase2/p2.test.mjs` | `the plan keeps the approved schedule` | `plan` into a state folder | 1,013 rows; A 318 rows in groups 1 to 23; B 695 rows in groups 1 to 26; A group 1 is the 8 smoke keys then the 3 `require` keys, as in the audit; 5 `open` rows; no group 0 |
| same | `variants and boards` | the plan rows | `require/gen-v4/22x22-hell-1/0` is `p2-gen4-diag`; `require/uncapped/22x22-hell-1/0` is `p2-uncapped-diag`; a `today` row is `p2-today` with source `today`; a `no-screen` row is `p2-none`; `15x15b10-nightmare` has the catalogue rows; `11x11-nightmare` has `rectRows(11, 11)` |
| same | `the plan is write-once` | `plan` twice into one folder, the second after changing one byte of `plan.json` | the second run exits 3 |
| same | `the ledger refuses what could pass the stage` | ledger lines summing 24,000 counted seconds for A; `--check --stage A --limit 900` | refused (24,000 + 945 > 24,600) |
| same | `nothing is borrowed between stages` | A lines summing 10 s; B lines summing 24,000 s; `--check --stage B --limit 900`, with a passing readout | refused |
| same | `a reservation blocks a second invocation` | `reserve` twice | the second exits 4 |
| same | `the readout gate refuses B` | `checkReadout` with: `text` null; `committed` false; a stale `Seal:`; a stale `Report A:`; one acceptance missing; `Stage B: STOP`; a `fail` gate without the owner line | `ok` false for each, with its reason |
| same | `the readout gate admits B` | the five lines with current hashes; then a `fail` gate with `Owner continuation: 1575100035077771386` | `ok` true for both |
| same | `the wrapper charges a successful invocation` | mode `ok` | one ledger line: `nodeSeconds` 12.5, `countedSeconds` 57.5, `cause` `ok`; no `pending.json`; exit 0 |
| same | `the wrapper charges a failed invocation and rethrows` | mode `exit1` | one ledger line with `exit` 1, `cause` `exit`; no `pending.json`; nonzero exit; stderr holds `command failed: 1` |
| same | `the wrapper charges a timeout at its limit` | mode `timeout` | a ledger line with `nodeSeconds` 900, `killed` true, `cause` `timeout`; nonzero exit |
| same | `an unknown failure is an accounting stop` | mode `noslot` | no ledger line; `pending.json` remains; output holds `STOP: accounting` |
| same | `a duplicate reservation refuses before invoking` | an existing `pending.json`; mode `ok` | refused; the marker file is absent; no new ledger line |
| same | `deferred keys exit 7 after charging` | mode `deferred` | one ledger line with `exit` 7; exit code 7; output holds `deferred keys remain` |
| same | `rowsWritten joins terminals to their start` | status lines `{ t: 'start', key: 'k1', group: 2, invocation: 'A-2.1' }` and `{ t: 'done', key: 'k1' }`, written before the wrapper runs in mode `ok` (its reservation id is `A-2.1`) | the ledger line `A-2.1` has `rowsWritten` 1 |
| same | `a recovered terminal keeps its original invocation` | `start` of `k2` naming `A-2.1` with no terminal, and the ledger line `A-2.1`; then `{ t: 'done', key: 'k2' }` is written, and the wrapper runs again in mode `ok` (id `A-2.2`) | `A-2.2` has `rowsWritten` 0; the line `A-2.1` is unchanged |
| same | `there is no authorization parameter` | `-Authorization 410` added | PowerShell refuses the parameter; the marker file is absent |

## Documentation

None here; P2-17 writes the README section, and P2-18 to P2-20 use the commands.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node --test tools/ig-proto/phase2/p2.test.mjs` | slot root, unlocked (no engine, no lock helper) | `# fail 0`, `# cancelled 0` | 5 min |
| `node tools\ig-proto\phase2\p2.mjs plan --out tests\artifacts\ig-proto\phase2\self-test\plan-check` | slot root | `plan: <sha256> (1013 rows)` | 1 min |
| G-CHECK, G-PROTECTED, G-WORKTREE, G-FORMAT | §3.4 | OK lines | 2 min |

No row, no seal of real copies and no locked invocation runs in this task.

## Stop points and questions

- **`QUESTION:`** when:
  - the audit's rows or schedules differ from 1,013 rows and 23 and 26 groups;
  - a cell has neither a catalogue entry nor a `<w>x<h>` name;
  - the helper's messages differ from the authority above.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-13a-B01 | The ledger can never pass the approved 410 or 402 minutes, and every invocation that ran is charged | ledger and wrapper cases | test output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-13a-T01 | R1: the approved schedule unchanged; no group 0 | plan cases | test output |
| P2-13a-T02 | R2: the wrapper's accounting on success, nonzero exit, timeout, unknown failure, duplicate reservation and deferral; no caller-supplied authorization | wrapper cases | test output |
| P2-13a-T03 | R13 and P2-T14 (part): the seal binds the sources, copies, today worktree, tools and fixed inputs; drift exits 3 | the seal code; P2-18's seal run | P2-18's `seal.json` |
| P2-13a-T04 | C12: stage B refused without the committed, current, accepted readout | readout cases | test output |

## Checklist

- [ ] Every step done; nothing outside `$Allowed` changed
- [ ] Tests added and green
- [ ] G-FORMAT, G-CHECK, G-PROTECTED pass
- [ ] Every AC row has its evidence

## Final report

- the start and end times, and the files changed;
- the plan digest and the test pass counts;
- each AC row with its evidence;
- the questions and deviations.

## Execution log

| Item | Value |
|---|---|
| Slot, base SHA | w3, 85f5c46526ed46d59b5b590c0a9a8838dc64f2ad |
| Start, end, duration | dispatched 2026-11-25 22:43 +07:00 (developer 22:43:22 to 22:51:09; fix round to about 23:05); accepted 23:05 |
| Waiting for rulings | about 12 min (eight deviations, then the wrapper smoke, SA-Opus) |
| Agent id, model | a38310e5-dd08-4c39-b257-0c4e54a600fb, claude-sonnet-5.5 |
| Calls; input, output and cache-read tokens | 36; 4,021,431 / 71,451 / 3,751,745 |
| AI credits | 176.39 |
| Questions and rulings | no QUESTION; eight deviations, all accepted by SA-Opus (exit $LASTEXITCODE in the test spawn; overflow ledger group "o<n>" with reservation id B-o<n>.<k>, written into C7 by b9355f7; plan rows drop the audit's source, rowS and proxy; stricter ledger --append, P2-13e adds sealSha256 after validation (b9355f7); today.digest with the today worktree's own report.js, P2-13e sourceDigestOf(root) imports <root>/tools/bench/report.js (b9355f7); the seal needs the six COPIES copies with p2-copy.json's fields plus verified; audit and boards read from the repository root, exit codes 2/3/4/5; no p2.mjs run-group, P2-13d's). Wrapper smoke ruling: (a) fix, --state is appended only in the Rows and Overflow sets, an item's node arguments pass unchanged; (b) accepted, a failed item rethrows the original error after its ledger line and the reservation release (step 6.8) |
| Fix rounds | 1 (--state on items; the fake invoker's marker holds the node arguments; new case "an item's node arguments are passed unchanged") |
| Gates re-run by the orchestrator (merge gate) | locked wrapper smoke by the orchestrator before the fix: -NodeArgs @('-e','0') exit 9 charged once (countedSeconds 45.045, reservation released), with '--' ok (45.061); after the fix (developer, locked): RG ok, exit 0, one ok ledger line (45.07), no pending.json; slot static guards; merge gate with every phase-2 test file and the link-anchor check (results in the bookkeeping); developer: unlocked 24/24, plan digest 8f3834e9...f41c (1013 rows) stable, G-PROTECTED, G-WORKTREE, G-FORMAT (4 files), G-CHECK OK |
| Commit (slot), commit on `gen-v4` | this commit; its SHA on gen-v4 in the bookkeeping |
| Issues and named items | P2-13e adds the seal hash, runtime and files digests and the snapshot; P2-13d implements p2.mjs run-group and the status journal; P2-13b writes report-A gates as an array; tests/fixtures/replay-case-v4.json is created by P2-15 before P2-18 seals; the seal is tested only on a synthetic root (real seal in P2-18) |
