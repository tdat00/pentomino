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
- **One configuration line (ruling on P2-18, 2026-11-26).** The observer's worker journals
  (`E/proofs/observer/journal/<case>/*.jsonl`) are raw trace output with LF line ends. Under `core.autocrlf=true` and
  `core.safecrlf=true`, git refuses to add them. Step 6 therefore appends one line to `.gitattributes` so that git
  stores and checks them out byte for byte. `.gitattributes` is neither a source file nor a sealed input, and changes
  no sealed hash: `seal --check` and every reader see the same bytes.

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
   # The observer's worker journals keep their LF bytes (ruling on P2-18, 2026-11-26); .gitattributes ends in CRLF.
   Add-Content -LiteralPath .gitattributes -Value 'docs/improve-generating-phase-2/evidence/proofs/*/journal/** -text' -Encoding utf8NoBOM
   git check-attr text -- docs/improve-generating-phase-2/evidence/proofs/observer/journal/14x14-nightmare-0/14x14-nightmare-0.97108.0.jsonl
   git add -- .gitattributes docs/improve-generating-phase-2/evidence/plan docs/improve-generating-phase-2/evidence/seal docs/improve-generating-phase-2/evidence/proofs docs/improve-generating-phase-2/evidence/ledger docs/improve-generating-phase-2/evidence/rows-smoke docs/improve-generating-phase-2/evidence/report-smoke tasks/improve-generating-phase-2/P2-18-seal-proofs-smoke.md
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
| Start, end, duration | 2026-11-26 03:09 +07:00 (gates) to 03:54 (both SAs: proceed); about 46 min |
| Waiting for rulings | about 5 min (the SAs' reading, step 5) |
| Agent id, model | the orchestrator (main session); readers SA-Opus a607e081 (claude-opus-5.5) and SA-Astra 56d9faa7 (gpt-6-astra) |
| Calls; input, output and cache-read tokens | orchestrator session; not separated per task |
| AI credits | orchestrator session; not separated per task |
| Questions and rulings | none during the task. SA-Astra, verbatim: "proceed". SA-Opus: "proceed"; verified the seal (bca8cfd2..., commit fa0bda2, plan 8f3834e9..., six copies verified, no rehearsal build; seal --check OK), the four proofs (status pass, quick false, source digest 9bacb125... and tree ids match the seal; observer units equal with complete journals; prior-replay priors 15, 12, 13, 14 dispatched, stored and started equal, 24/24 matched; legacy equal, 4 replays matched), the smoke report (8 rows equal, no prefix rule; S1, S2 pass; smoke gate ok), the three require rows (complete, sealed, retained uninterpreted per R1) and the ledger (5 lines, sum 1,700.617 s, no pending reservation). Readout correction (SA-Opus): certificate screenCapped 0 means only the sub-branch "a screened rating completes with main work above W" had no case (0 of 54); the IncompleteRatingError-at-W branch occurred 28 times (counted capped) and was checked against the canonical rating; the readout must say this |
| Fix rounds | 0 |
| Gates re-run by the orchestrator | pre-seal gates of E/P2-16a/gates.md: 1 full suite `IG P2-18 full exit=0 seconds=140.913 quiet=45`, 1629/1629; 2 phase-2 tests (ten files) `IG P2-18 phase2 exit=0 seconds=60.274 quiet=45`, 182/182; 3 `record-fixtures: OK` (0.575 s), hard `replay case OK` (1.218 s), screen `replay case OK` (16.853 s), `refusal case OK` (0.154 s) (the orchestrator's script misread the captured refusal line and stopped after gate 3; gates 4 to 7 then ran separately); 4 check-conventions OK, check-site OK; 5 G-PROTECTED OK; 6 copies 195 and 32 edits; 7 six copies built. Plan `plan: 8f3834e91c9d61a4c636de599dc3cfb1f4cc6996683f9f5413d25ac09705f41c (1013 rows)`; seal `seal: bca8cfd2db491e686fb37f5ed2bf640e4eac3c93513c005f775f971bf4979f5b` at fa0bda2, `seal: OK`. Proofs (charged, 900 s each): observer pass 322.041 s node / 367.041 counted (15/15); certificate pass 106.436 / 151.436 (9/9; certified 26, screenCapped 0, capped 28); prior-replay pass 427.71 / 472.71 (6/6; 24/24 matched); legacy pass 55.168 / 100.168 (10/10). A group 1 `IG P2 A-1.5 exit=0 seconds=564.262 quiet=45`, 8 smoke rows then 3 require rows; `publish: A 11 rows 5cfd937b...`; `report: smoke complete (S1 pass, S2 pass)`. Ledger after the task: A spent 1,700.617 s (28.344 min) of 24,600 s, remaining 22,899.383 s (381.656 min); B unspent (24,120 s) |
| Commit | this commit |
| Issues and named items | the certificate's "completes above W" sub-branch unexercised in the proof corpus (synthetic tests only; SA-Opus's readout wording); the three require rows are interpreted in P2-19's readout |
