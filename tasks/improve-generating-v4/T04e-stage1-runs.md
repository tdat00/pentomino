# T04e: Stage-1 runs: source and identity receipt, certificate re-proof, parity and replay on real calls

| Item | Value |
|---|---|
| Feature, plan | improve-generating, `docs/improve-generating/plan.md` §5.1 stage 1 (the identity receipt and the certificate re-proved on the frozen source, R14's cases), "Observers", "Parity passes", §9; decisions D-V4-01, D-V4-02, D-V4-06; drift DR-O05, DR-O08, DR-O13; review RV1-04, RV1-06, RV1-08, RV2-09, RV2-14, RV2-20 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T04d |
| Depends on | T04d; **the owner's stage-1 allowance, relayed by the orchestrator** (check-list §3.4) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 1.5 h (mostly waiting for the lock), machine 50 min allocated (IGP-02 25, V4-T04 25; guards 1,875 s each) |

## Goal

Run stage 1 on the frozen source: today's search gives MP12b1's puzzles again (the source changed, the search did
not, DR-O13), the screen certificate holds again with full coverage on R14's cases, and every prototype arm keeps its
observer contracts with the detail of its recorded ratings and replays its own records in full. The result is the
stage-1 receipt that the manifest (T11g) prices on.

## Authority and fixed points

- Plan §5.1 stage 1 and its output; check-list D-V4-02 (nothing runs on the frozen label without an approved budget)
  and §3.2 (the lock helper; difficulty-v3 keeps priority).
- The tools, manifests and plans are those of T04a to T04d and are used unchanged. A tool defect found here is reported
  (`QUESTION:`); it is not fixed in this task without the pack author's ruling.
- Review RV1-08: the second plan runs only after the first exited 0 and its certificate passed the PM4 gate; a
  stopped plan is never followed by the next one.

## Scope

- Create (by running the plans): `docs/improve-generating/evidence/frozen/IGP-02/` (PM4's records),
  `docs/improve-generating/evidence/frozen/V4-T04/` (the arms `base` and `log`, `identity.json|md`,
  `stage1.json|md` and `inputs/`, the captured tree and harness metadata of T04d's summary); raw files under
  `tests/artifacts/ig-proto/frozen/` (git-ignored; the namespaces `IGP-02`, `V4-T04`, `V4-T04v4`, `V4-T04f` and
  `V4-T04i` become historical records that no later run reuses, check-list §3.1).
- Change: nothing else.
- Do not change: any file outside the two evidence folders. Guards: `git status --short` lists only files under
  `docs/improve-generating/evidence/frozen/IGP-02/` and `docs/improve-generating/evidence/frozen/V4-T04/`;
  `node tools\ig-proto\firewall.mjs check --task V4-T04 --label frozen` (the plan's last step) prints `files
  unchanged`.

## Steps

1. Confirm the go: the orchestrator's message gives the owner's approved cumulative cap of the frozen round in minutes
   (92 requested for stage 1, check-list §1; the frozen round has spent nothing before it); use that number as
   `<approved>` below. Without it, stop.
2. In one PowerShell session at the repository root (each command runs until the runner prints its last line; the
   lock helper waits for difficulty-v3 whenever it runs):

   ```powershell
   $lock = 'C:\Users\ledat\.copilot\session-state\c2f29688-8568-4f25-bace-e644d381e5f9\files\ig-lock.ps1'
   pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\IGP-02.json -Label frozen -SourceLabel 'frozen 3fc65f4' -LockHelper $lock -ApprovedRoundMinutes <approved>
   if ($LASTEXITCODE -ne 0) { throw ('STOP: IGP-02 run-task exited ' + $LASTEXITCODE) }
   node tools\ig-proto\v4-check.mjs pm4-gate --label frozen --source-label 'frozen 3fc65f4'
   if ($LASTEXITCODE -ne 0) { throw ('STOP: the PM4 gate exited ' + $LASTEXITCODE) }
   pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\V4-T04.json -Label frozen -SourceLabel 'frozen 3fc65f4' -LockHelper $lock -ApprovedRoundMinutes <approved>
   if ($LASTEXITCODE -ne 0) { throw ('STOP: V4-T04 run-task exited ' + $LASTEXITCODE) }
   ```

   A `throw` ends the step: keep the output and the state files as they are, report the runner's last 30 lines and
   the stopped step's `state.json` (and for an item step its `items.jsonl`); never re-run a stopped step, never
   continue with the next plan, never raise a budget. An item step that stops with `items: STOP: interrupted item
   <id> needs a ruling` or `identity mismatch` waits for the pack author's ruling.
3. Read `docs/improve-generating/evidence/frozen/V4-T04/stage1.md` and report its verdict line and blocks, the two
   runners' last lines (task and round counted seconds) and, from `tests/artifacts/ig-proto/frozen/IGP-02/` and
   `.../V4-T04/` `invocations.jsonl`, the counted seconds per step.

## Tests

No new tests. The runs are the gates (next section).

## Documentation

None; the evidence is the record.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| the IGP-02 command of step 2 | root | `Plan IGP-02 finished: task counted <= 1875 s ...`; exit 0 | each invocation ends by its horizon (at most 285 s); the plan within its guard of 1,875 s counted |
| `v4-check.mjs pm4-gate` | root | `pm4-gate: pass`; exit 0 | 1 min |
| the V4-T04 command of step 2 | root | `Plan V4-T04 finished: task counted <= 1875 s ...`; exit 0 | the plan within its guard of 1,875 s counted |
| `stage1.md` verdict and `stage1.json` | evidence | `Stage 1: holds.`; `stage1.json` is an `ig-v4-proof` envelope of kind `stage1` with `verdict: 'pass'` | — |
| `npm run check` | root | exit 0 (the new evidence files pass the conventions) | 2 min |

Diagnosis gates (each is a stop point when it fails or is incomplete):

| Gate | Expected | When it fails |
|---|---|---|
| Source | snapshot verified, digest `FROZEN_DIGEST`, every variant's edits apply | stop; report the block |
| PM4 certificate | `pm4-gate: pass` (0 violations, certified runs > 0, no coverage gap, every certified run equal to its canonical rating) | stop; report the block and `tests/artifacts/ig-proto/frozen/IGP-02/main/screens-<shard>-violations.json` when present |
| Identity | R00 holds; an MP12b1 run on every identity seed (`summary.withoutMp12b1` 0); every `mp12b1~base` pair `different-source` with `sameResult: true` (DR-O13); every `base~log` pair `puzzle-identity` | stop; report the seed, both runs' `describe` blocks and the first difference |
| Self-test | the four groups `done` with every result passing | stop; report the failing case and reason |
| Parity | `pass` (every arm, case and mode present; equal results and skips; complete and equal total work, rating and count work, and equal charge sequences; full detail on recorded ratings, rechecked against `rateDetailed`) | stop; report the group's rows |
| Replay | `pass` (a full candidate replay per generation case, with a measuring step) | `fail`: stop with the rows; `incomplete`: stop with the reasons and the findings (`incomplete` replays with reason, work units and bytes are also evidence for `REPLAY`'s re-derivation, N-V4-07) |

## Stop points and questions

- Stop and report before: step 2 without the orchestrator's go; any re-run of a failed or stopped step; any raise of
  a budget or the approved minutes.
- Stop and report after: each failed or incomplete diagnosis gate (table above), and at the end of the task with the
  stage-1 receipt (the orchestrator relays it; T04f to T11f do not depend on the owner, T11g ends at the owner's price stop).
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code;
  an ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside
  the scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T04e-B01 | The frozen source gives MP12b1's puzzles on the identity seeds (today's search unchanged) | identity gate | `evidence/frozen/V4-T04/identity.md` |
| T04e-B02 | The screen certificate holds on the frozen source with full coverage | PM4 gate | `evidence/frozen/IGP-02/pm4.md` |
| T04e-B03 | Every prototype arm keeps its observer contracts with full recorded detail, and its records replay in full | parity and replay gates | `evidence/frozen/V4-T04/stage1.md` |
| T04e-B04 | Stage 1 stayed within the approved allowance, under the lock | the runners' counted totals | runner output; `invocations.jsonl` |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T04e-T01 | Every record carries the frozen banner and `meta.source.frozenCommit`; `stage1.json` binds the stored arms, coverage and evidence hashes | read `pm4.json`, `identity.json`, `stage1.json` | the files |
| T04e-T02 | The second plan ran only after the first exited 0 and the PM4 gate passed | the session transcript | final report |
| T04e-T03 | Only the two evidence folders changed | guard | `git status --short` |

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
