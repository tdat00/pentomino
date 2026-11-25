# P2-20: Stage B and the conditional twins (locked)

| Item | Value |
|---|---|
| Feature, plan | `improve-generating-phase-2`; plan §7.2 (stage B), §7.5 (the conditional P5 comparator), §7.6; D-P2-12, D-P2-15; P2-B01 to P2-B03, P2-B05, P2-B06; review-1 R1, R3; review-2 R2-06 |
| Repository, branch, base | `Q:\git\pentomino` (the main worktree), `gen-v4`, P2-19's commit |
| Starts when | P2-19's readout is committed with `Stage B: PROCEED`, and `ledger --check --stage B` admits (`contracts.md` C12) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | the orchestrator |
| Estimate | machine: stage B's 402 counted minutes (priced 321.258 counted, 401.572 guard) |

## Goal

The rest of the matrix runs on the sealed source:

- the failing boards and the remaining controls;
- Master identity;
- the `n-mid` no-screen arm for (c5);
- the uncapped twins of every row the predeclared trigger names.

With them, the plan's phase-2 gate can be read.

## Authority and fixed points

- **The ledger:** check-list §3.5, with stage B's authorization of 402 minutes (24,120 s). Nothing is borrowed from A.
- **R1.** Groups 1 to 22 hold every eligible bounded row. Groups 23 to 26 hold 19 Master rows and the 15 twin slots: the
  10 fixed twins and the 5 open slots.
- **R3 and C10.** Before group 23:
  - B's prefix is published to `E/rows-before-twins/`;
  - `p2.mjs twins` writes the immutable activation receipt `E/twins/activation.json`;
  - `run-group` resolves the open slots only through it.

  Unused slots are not observations.
- **More than fifteen required twins** is a costed finding (exit 4 of `twins`). The overflow groups run as
  `run-group.ps1 -Stage B -OverflowGroup <n>`, each only when the ledger admits it. Otherwise the P5 endpoint is
  `incomplete` and the owner is told. A required twin is never dropped.
- **C8.** The final B snapshot goes to `E/rows/`.

## Scope

- The orchestrator writes `E/rows-before-twins/`, `E/twins/`, `E/rows/B.*`, `E/report-B/` and the ledger lines.
- One commit.

## Steps

Every block starts with P2-18's preamble.

1. **The bounded rows:**

   ```powershell
   foreach ($g in 1..22) {
     do { & $rg -Stage B -Group $g; $code = $LASTEXITCODE } while ($code -eq 7)
     if ($code -ne 0) { throw "STOP: B group $g exited $code" }
   }
   node $p2 publish --stage B --out (Join-Path $E 'rows-before-twins')
   if ($LASTEXITCODE -ne 0) { throw 'STOP: publish rows-before-twins' }
   ```

2. **The activation:**

   ```powershell
   node $p2 twins --out (Join-Path $E 'twins')
   $twinExit = $LASTEXITCODE
   if ($twinExit -ne 0 -and $twinExit -ne 4) { throw "STOP: twins exited $twinExit" }
   node $p2 ledger --status
   if ($LASTEXITCODE -ne 0) { throw 'STOP: ledger status' }
   ```

   On exit 4, both SAs record the reprice: the receipt's `overflow.repriceCountedS` and its guard projection
   `overflow.repriceGuardS` (`contracts.md` C10: per overflow group, 2 + 260 x its twins + 45 counted seconds; the guard
   is 1.25 times their sum), plus groups 23 to 26's priced need (the pending fixed groups stay in the continuation
   quote), against the B remainder that `ledger --status` printed. The ledger still admits each invocation at its
   enforced limit, never at the price estimate.
3. **The twin groups, then the overflow groups:**

   ```powershell
   foreach ($g in 23..26) {
     do { & $rg -Stage B -Group $g; $code = $LASTEXITCODE } while ($code -eq 7)
     if ($code -ne 0) { throw "STOP: B group $g exited $code" }
   }
   $act = Get-Content -Raw -LiteralPath (Join-Path $E 'twins\activation.json') | ConvertFrom-Json
   for ($n = 1; $n -le @($act.overflow.groups).Count; $n++) {
     try {
       do { & $rg -Stage B -OverflowGroup $n; $code = $LASTEXITCODE } while ($code -eq 7)
       if ($code -ne 0) { throw "STOP: overflow group $n exited $code" }
     } catch {
       if ("$_" -match '^STOP: ledger refused') { "overflow group ${n}: refused by the ledger; the P5 endpoint is incomplete"; break }
       throw
     }
   }
   ```

4. **Publish and report:**

   ```powershell
   node $p2 publish --stage B --out (Join-Path $E 'rows')
   if ($LASTEXITCODE -ne 0) { throw 'STOP: publish B' }
   node $p2 report --stage B --out (Join-Path $E 'report-B')
   if ($LASTEXITCODE -ne 0) { throw "STOP: report B exited $LASTEXITCODE (2 = port defect)" }
   node $p2 ledger --status
   if ($LASTEXITCODE -ne 0) { throw 'STOP: ledger status' }
   ```

5. **One commit:**

   ```powershell
   git add -- docs/improve-generating-phase-2/evidence/rows-before-twins docs/improve-generating-phase-2/evidence/twins docs/improve-generating-phase-2/evidence/rows docs/improve-generating-phase-2/evidence/report-B docs/improve-generating-phase-2/evidence/ledger tasks/improve-generating-phase-2/P2-20-stage-b.md
   if ($LASTEXITCODE -ne 0) { throw 'STOP: git add' }
   git commit -m 'improve-generating-phase-2 P2-20: stage B and the twins' -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`nCopilot-Session: 7e6bf34f-be87-427e-9bec-bb2d049b46cc"
   if ($LASTEXITCODE -ne 0) { throw 'STOP: commit' }
   ```

## Tests

The stage-B gates are computed by `p2.mjs report` (P2-13b, P2-13c), with the glue and reach readings of P2-13f.

## Documentation

None.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| step 1 | main worktree | every key of groups 1 to 22 terminal; the before-twins snapshot | 900 s per invocation |
| step 2 | main worktree | `activation.json` written; exit 0, or 4 with the reprice recorded | 2 min |
| step 3 | main worktree | every active key of groups 23 to 26 terminal; overflow groups run or refused | 900 s per invocation |
| step 4 | main worktree | the report written; not `port-defect` | 2 min |

## Stop points and questions

- **A port defect** stops before any ratio; the pack author rules.
- **The ledger refusing** a group of 1 to 26 stops the stage. A refused overflow group ends the overflow, with the P5
  endpoint `incomplete`, and the owner is told.
- **(c5) failing or inconclusive:** stop the publication, and present the no-screen fallback and its new table identity
  to the owner before the selected configuration changes (P2-B05, R5). No refit, and no relabelling of measured rows.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-20-B01 | The matrix of stage B is complete, or its missing rows are named | the report | `E/report-B/` |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-20-T01 | The stage-B ledger stays within 402 minutes | `ledger --status` | `E/ledger/ledger.jsonl` |
| P2-20-T02 | Every required twin ran, or is reported unresolved; unused slots are not observations | the receipt; the report | `E/twins/activation.json`, `E/report-B/` |

## Checklist

- [ ] Groups 1 to 22 ran; the before-twins snapshot published; the activation written
- [ ] Groups 23 to 26 and any overflow groups ran or were refused
- [ ] The report written; one commit
- [ ] Every AC row has its evidence

## Final report

- the stage-B account;
- the activation (required, slots used, inactive, overflow);
- the report's status;
- any owner question.

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
