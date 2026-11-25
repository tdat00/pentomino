# P2-19: Stage A groups 2 to 23, the items and the readout (locked)

| Item | Value |
|---|---|
| Feature, plan | `improve-generating-phase-2`; plan §7.2 (stage A: N-V4-15, sentinels, thin controls, resource replays, browser checks), §7.3 step 2, §7.6; D-P2-12, D-P2-15; P2-B02, P2-B04, P2-B07, P2-T11, P2-T12, P2-T13; review-1 R1, R2, R3, R10; review-2 R2-05 |
| Repository, branch, base | `Q:\git\pentomino` (the main worktree), `gen-v4`, P2-18's commit |
| Starts when | P2-18 is committed with both SAs' "proceed" |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | the orchestrator (runs); both SAs (the readout) |
| Estimate | machine: the rest of stage A's 410 counted minutes. All of stage A is priced at 330.656 counted and 409.195 guard minutes |

## Goal

The riskiest observations come first:

- `require` on the largest boards (N-V4-15);
- the boards without a prior cell (the sentinels);
- the thin controls;
- the replay resources and the browser checks.

The SAs read them, and stage B may start only after their committed readout.

## Authority and fixed points

- **The ledger:** check-list §3.5. This is the one 410-minute account shared with P2-18.
- **R1.** Groups 2 to 23 of the approved schedule, unchanged. The replay probes are **one** invocation of
  `replay-probe.mjs --all` (two lanes, two groups of four items; priced 533 s). The six browser checks are six
  invocations of at most 120 s each (priced 990 s).
- **R10.** A probe without a nonempty sample is "not measured". Its failure or shortfall is kept and goes to the
  readout; it is never retried with another seed and never raised in place.
- **C8.** The complete stage-A snapshot goes to `E/rows/`.
- **C12.** The readout begins with its five binding lines. A failed or incomplete A gate also needs the owner's
  continuation, with its Discord message id, before the verdict line may be `Stage B: PROCEED`.

## Scope

- The orchestrator writes `E/rows/A.*`, `E/replay-probes/`, `E/browser/<check>/`, `E/report-A/` and the ledger lines.
- The SAs write `docs/improve-generating-phase-2/stage-a-readout.md` jointly.
- One commit.

## Steps

Every block starts with P2-18's preamble.

1. **Row groups 2 to 23**, in order, each invoked again while it reports deferred keys:

   ```powershell
   foreach ($g in 2..23) {
     do { & $rg -Stage A -Group $g; $code = $LASTEXITCODE } while ($code -eq 7)
     if ($code -ne 0) { throw "STOP: A group $g exited $code" }
   }
   ```

2. **The replay probes**, one invocation. A nonzero exit (1 a failed item, 3 an item not measured, censored or not
   started) is recorded, and the task goes on to step 3.

   ```powershell
   $replay = 'ok'
   try {
     & $rg -Stage A -Item 'replay-probes' -LimitSeconds 900 -NodeArgs @('tools\ig-proto\phase2\replay-probe.mjs', '--all', '--out', 'docs\improve-generating-phase-2\evidence\replay-probes')
     if ($LASTEXITCODE -ne 0) { $replay = "exit $LASTEXITCODE" }
   } catch {
     if ("$_" -match '^STOP: (accounting|ledger|seal|reservation)') { throw }
     $replay = "$_"
   }
   "replay probes: $replay"
   ```

3. **The six browser checks**, one invocation each. A failing check is recorded the same way.

   ```powershell
   foreach ($c in 'set-bound', 'batch-prefix', 'late-fence', 'fresh-after-pause', 'no-window-texts', 'screen-capped-step') {
     try {
       & $rg -Stage A -Item "browser-$c" -LimitSeconds 120 -NodeArgs @('tools\ig-proto\phase2\browser-run.mjs', '--page', 'tests/browser/deadline.html', '--check', $c, '--out', "docs\improve-generating-phase-2\evidence\browser\$c")
       "browser ${c}: exit $LASTEXITCODE"
     } catch {
       if ("$_" -match '^STOP: (accounting|ledger|seal|reservation)') { throw }
       "browser ${c}: $_"
     }
   }
   ```

   Then, for each receipt whose `cleanup` is not `null` (`contracts.md` C16), the orchestrator runs
   `Get-Process -Id <edgePid> -ErrorAction SilentlyContinue`. A process still found is ended with
   `taskkill /PID <edgePid> /T /F`, its own tree only, before stage B, and the readout lists it.

4. **Publish and report:**

   ```powershell
   node $p2 publish --stage A --out (Join-Path $E 'rows')
   if ($LASTEXITCODE -ne 0) { throw 'STOP: publish A' }
   node $p2 report --stage A --out (Join-Path $E 'report-A')
   if ($LASTEXITCODE -ne 0) { throw "STOP: report A exited $LASTEXITCODE (2 = port defect)" }
   node $p2 ledger --status
   if ($LASTEXITCODE -ne 0) { throw 'STOP: ledger status' }
   ```

5. **The readout.** The SAs write `stage-a-readout.md`:
   - the five C12 lines first: `Seal:` (the SHA-256 of `E/seal/seal.json`), `Report A:` (that of
     `E/report-A/report.json`), both acceptance times, and the verdict line;
   - then their reading of equality, the thin controls (A1), the sentinels (A2, P2-B04), `require` (A3, P2-B07), the
     replay margins (A4, P2-T11), the browser checks (A5), memory (A6, P2-T12) and the account;
   - when a gate is `fail` or `incomplete`: the verdict line is `Stage B: STOP`, with an owner question giving the
     options. After the owner's answer, the line `Owner continuation: <message id>` is added and the verdict may become
     `Stage B: PROCEED`.
6. **One commit:**

   ```powershell
   git add -- docs/improve-generating-phase-2/evidence/rows docs/improve-generating-phase-2/evidence/replay-probes docs/improve-generating-phase-2/evidence/browser docs/improve-generating-phase-2/evidence/report-A docs/improve-generating-phase-2/evidence/ledger docs/improve-generating-phase-2/stage-a-readout.md tasks/improve-generating-phase-2/P2-19-stage-a.md
   if ($LASTEXITCODE -ne 0) { throw 'STOP: git add' }
   git commit -m 'improve-generating-phase-2 P2-19: stage A and its readout' -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`nCopilot-Session: 7e6bf34f-be87-427e-9bec-bb2d049b46cc"
   if ($LASTEXITCODE -ne 0) { throw 'STOP: commit' }
   node $p2 ledger --check --stage B --limit 900
   ```

   The last command must print `ledger: admitted ...` before P2-20 starts. Its refusal reason names what is missing.

## Tests

The stage-A gates are computed by `p2.mjs report` (P2-13b).

## Documentation

`stage-a-readout.md` (the SAs).

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| step 1 | main worktree | every key of groups 2 to 23 terminal; ledger lines | 900 s per invocation |
| step 2 | main worktree | `E/replay-probes/receipt.json` with 8 items | 900 s |
| step 3 | main worktree | six receipts under `E/browser/` | 120 s each |
| step 4 | main worktree | the report written; not `port-defect` | 2 min |
| step 6's last command | main worktree | `ledger: admitted` (after a `PROCEED` readout) | 30 s |

## Stop points and questions

- **A gate `fail` or `incomplete`, a replay outside the margin, or an endpoint `incomplete`** goes to the owner, with
  the SAs' options, before stage B. A port defect goes to the pack author first.
- **The ledger refusing an invocation** stops the stage; the rows not run are reported missing.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-19-B01 | P2-B04 and P2-B07 are read before stage B; the thin controls are read first | the readout | `stage-a-readout.md` |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-19-T01 | P2-T11: the replays within the margin, or named "not measured" | the receipt | `E/replay-probes/receipt.json` |
| P2-19-T02 | P2-T12 memory; P2-T13 browser checks within 1 minute | the report; the browser receipts | `E/report-A/`, `E/browser/` |
| P2-19-T03 | The stage-A ledger stays within 410 minutes | `ledger --status` | `E/ledger/ledger.jsonl` |
| P2-19-T04 | C12: the committed readout admits stage B, or B is refused | step 6's last command | its output |

## Checklist

- [ ] Groups 2 to 23, the replay bundle and six browser checks run, or reported missing
- [ ] The report written; the SAs' readout committed
- [ ] `ledger --check --stage B` admits (or the owner question is open)
- [ ] Every AC row has its evidence

## Final report

- the stage-A account (spent, remaining);
- the report's status and gate summary;
- the replay and browser outcomes;
- the readout's verdict, and any owner question.

## Execution log

| Item | Value |
|---|---|
| Start, end, duration | |
| Waiting for rulings | |
| Agent id, model | the orchestrator; the SA agents for the readout |
| Calls; input, output and cache-read tokens | |
| AI credits | |
| Questions and rulings | |
| Fix rounds | |
| Gates re-run by the orchestrator | |
| Commit | |
| Issues and named items | |
