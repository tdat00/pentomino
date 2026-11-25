# P2-18: Seal, proof bundles and stage A's first group (locked)

| Item | Value |
|---|---|
| Feature, plan | `improve-generating-phase-2`; plan §7.1 to §7.3 (proofs and smoke first, equality before interpretation), §7.6 (the stage-A account, the source epoch); D-P2-12, D-P2-15; P2-T01, P2-T03, P2-T14; review-1 R1, R2, R14 |
| Repository, branch, base | `Q:\git\pentomino` (the main worktree), `gen-v4`, every development task merged |
| Starts when | every task of check-list §1 above "After development" is accepted and merged; D-P2-15 |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | the orchestrator; both SAs read the result |
| Estimate | machine: the stage-A account. The four bundles are priced 1,400.916 counted s; group 1 (8 smoke rows, then 3 `require` rows) 806.127 node s plus 45 s of quiet |

## Goal

The sources are sealed, the four proof bundles pass, and the eight smoke rows equal their oracles, all before any timed
row is read. A's group 1 then records its three `require` rows, without interpreting them. A failure stops the
validation as a port defect before the expensive stages.

## Authority and fixed points

- **The ledger:** check-list §3.5. Stage A's authorization, 410 counted minutes (24,600 s), is shared with P2-19, and the
  stage map is sealed. Every invocation goes through `run-group.ps1`, which charges it.
- **R1, verbatim:** "A group 1 executes its eight smoke requests first, verifies their positive port-equality results
  in-process, and only then executes its three REQUIRE rows. A failed/missing smoke proof stops before the first
  REQUIRE row. P2-18 retains those three REQUIRE observations without interpreting or repeating them."
- **R14, verbatim:** "Write and bind the plan/seal before execution; do not commit an intermediate P2-18 state. Their
  digests enter the first reservation/receipt. Commit the task's plan, seal, proofs, observations and log once after
  acceptance."
- **The pre-seal gates:** `E/P2-16a/gates.md`, in its order.
- **Publication:** the first group's snapshot goes to `E/rows-smoke/` (`contracts.md` C8).

## Scope

- The orchestrator writes `E/plan/`, `E/seal/`, `E/proofs/<bundle>/`, `E/ledger/ledger.jsonl`, `E/rows-smoke/` and
  `E/report-smoke/`, fills this task's log, and commits once.
- No source file changes. A needed change is a new source epoch (check-list §3.5).

## Steps

Every block starts with this preamble (the main worktree):

```powershell
$root = 'Q:\git\pentomino'
Set-Location -LiteralPath $root
[Environment]::CurrentDirectory = $root
$ErrorActionPreference = 'Stop'
$E = Join-Path $root 'docs\improve-generating-phase-2\evidence'
$p2 = Join-Path $root 'tools\ig-proto\phase2\p2.mjs'
$rg = Join-Path $root 'tools\ig-proto\phase2\run-group.ps1'
```

1. **Preconditions.**
   - `git --no-pager status --porcelain` prints nothing, and `git --no-pager branch --show-current` prints `gen-v4`.
   - Run gates 1 to 7 of `E/P2-16a/gates.md` in order, locked where they say so, checking each exit. A failing gate
     stops the task.
2. **Plan and seal** (gates 8 and 9; unlocked, no engine). Nothing is committed yet.

   ```powershell
   node $p2 plan --out (Join-Path $E 'plan')
   if ($LASTEXITCODE -ne 0) { throw 'STOP: plan' }
   $head = (git --no-pager rev-parse HEAD).Trim()
   if ($LASTEXITCODE -ne 0) { throw 'STOP: rev-parse' }
   node $p2 seal --commit $head --today-root Q:\git\pentomino-p2-today --plan (Join-Path $E 'plan\plan.json') --out (Join-Path $E 'seal')
   if ($LASTEXITCODE -ne 0) { throw 'STOP: seal' }
   node $p2 seal --check
   if ($LASTEXITCODE -ne 0) { throw 'STOP: seal check' }
   ```

3. **The four proof bundles**, one locked invocation each, in this order:

   ```powershell
   foreach ($b in 'observer', 'certificate', 'prior-replay', 'legacy') {
     & $rg -Stage A -Item "proof-$b" -LimitSeconds 900 -NodeArgs @('tools\ig-proto\phase2\proofs.mjs', $b, '--out', "docs\improve-generating-phase-2\evidence\proofs\$b")
     if ($LASTEXITCODE -ne 0) { throw "STOP: proof $b exited $LASTEXITCODE" }
   }
   ```

   A failing bundle throws its original error from the wrapper, after its ledger line is written. No further bundle or
   row runs.
4. **A's group 1.** It is invoked again while it reports deferred keys (exit 7). Exit 6 is the smoke gate.

   ```powershell
   do { & $rg -Stage A -Group 1; $code = $LASTEXITCODE } while ($code -eq 7)
   if ($code -ne 0) { throw "STOP: A group 1 exited $code (6 = the smoke gate failed)" }
   node $p2 publish --stage A --out (Join-Path $E 'rows-smoke')
   if ($LASTEXITCODE -ne 0) { throw 'STOP: publish rows-smoke' }
   node $p2 report --stage smoke --out (Join-Path $E 'report-smoke')
   if ($LASTEXITCODE -ne 0) { throw "STOP: smoke report exited $LASTEXITCODE (2 = port defect)" }
   node $p2 ledger --status
   if ($LASTEXITCODE -ne 0) { throw 'STOP: ledger status' }
   ```

5. **The SAs' reading.** Both SAs read `E/proofs/<bundle>/result.md`, `E/report-smoke/report.md` and the three `require`
   row lines. They reply "proceed", or "stop" with findings; the orchestrator relays verbatim. The `require` rows are
   not interpreted here.
6. **One commit**, after both reply "proceed":

   ```powershell
   git add -- docs/improve-generating-phase-2/evidence/plan docs/improve-generating-phase-2/evidence/seal docs/improve-generating-phase-2/evidence/proofs docs/improve-generating-phase-2/evidence/ledger docs/improve-generating-phase-2/evidence/rows-smoke docs/improve-generating-phase-2/evidence/report-smoke tasks/improve-generating-phase-2/P2-18-seal-proofs-smoke.md
   if ($LASTEXITCODE -ne 0) { throw 'STOP: git add' }
   git commit -m "improve-generating-phase-2 P2-18: seal, proofs and stage A's first group" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`nCopilot-Session: 7e6bf34f-be87-427e-9bec-bb2d049b46cc"
   if ($LASTEXITCODE -ne 0) { throw 'STOP: commit' }
   ```

## Tests

The proof bundles and the smoke equality are this task's tests.

## Documentation

None.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| step 1's gates | main worktree | each its expected output | as `gates.md` lists |
| step 2 | main worktree | `plan: <sha256> (1013 rows)`; `seal: <sha256>`; `seal: OK` | 5 min |
| step 3, four locked invocations | main worktree | `status: 'pass'` each; four ledger lines | 900 s each |
| step 4 | main worktree | the smoke gate passed; 11 terminal keys; the smoke report not `port-defect` | 900 s per invocation |

## Stop points and questions

- **Stop** after any failing bundle, a failed smoke gate (exit 6) or a `port-defect` smoke report. The pack author and
  SA-Astra rule. A source change is a new source epoch (check-list §3.5), repriced from the remaining stage-A
  authorization; if it would change scope, the configuration or the allowance, the owner decides.
- **Stop** when the ledger refuses an invocation, or at an accounting stop (`STOP: accounting`): report the ledger
  status and the reservation.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-18-B01 | Nothing timed is read before the port is proved | the order of the steps; the reports | `E/proofs/`, `E/report-smoke/` |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-18-T01 | P2-T02 and P2-T03 on real data; P2-T07's prior and replay identity; the legacy route | the four bundles pass | `E/proofs/<bundle>/result.json` |
| P2-18-T02 | P2-T01 on the smoke rows, before any `require` row | the smoke gate; the smoke report | `RAW/rows/smoke-gate.json`; `E/report-smoke/report.json` |
| P2-18-T03 | P2-T14: sealed sources; every invocation re-checks the seal | `seal --check` in every invocation | `E/ledger/ledger.jsonl` |

## Checklist

- [ ] The gates of `gates.md` passed; the plan and the seal written before any row
- [ ] Four bundles pass; the smoke gate passed; the ledger lines appended
- [ ] The SAs' replies relayed verbatim
- [ ] One commit
- [ ] Every AC row has its evidence

## Final report

- the seal digests;
- each bundle's status, node seconds and counted seconds;
- the smoke equality table;
- the stage-A account after this task (spent, remaining);
- the SAs' replies.

## Execution log

| Item | Value |
|---|---|
| Start, end, duration | |
| Waiting for rulings | |
| Agent id, model | the orchestrator |
| Calls; input, output and cache-read tokens | |
| AI credits | |
| Questions and rulings | |
| Fix rounds | |
| Gates re-run by the orchestrator | |
| Commit | |
| Issues and named items | |
