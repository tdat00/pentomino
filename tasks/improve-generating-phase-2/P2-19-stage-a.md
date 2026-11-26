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

   **After a host restart or crash** (check-list §3.5, ruling on P2-19, 2026-11-26), run this recovery block once,
   after the restart and before any other invocation. It prints the evidence for the execution log, charges the cut
   invocation and releases its reservation, removes its stale lock, and checks the seal, the ledger and the status.
   Then resume the loop at the interrupted group, `foreach ($g in <that group>..23)`: an earlier group would be charged
   a whole invocation for nothing. Its started key without a terminal line becomes `interrupted` on that call (C5).

   ```powershell
   $RAW = Join-Path $root 'tests\artifacts\ig-proto\phase2'
   $inv = [cultureinfo]::InvariantCulture
   $fmt = 'yyyy-MM-ddTHH:mm:ss.fffzzz'
   $pendingText = [IO.File]::ReadAllText((Join-Path $RAW 'pending.json'))
   $pending = $pendingText | ConvertFrom-Json -AsHashtable -DateKind String
   $id = $pending['id']
   $stage = $pending['stage']
   $ids = @([IO.File]::ReadAllLines((Join-Path $E 'ledger\ledger.jsonl')) | Where-Object { $_ } | ForEach-Object { ($_ | ConvertFrom-Json -AsHashtable -DateKind String)['id'] })
   if ($ids -ccontains $id) { throw "STOP: $id already has a ledger line; only its release is left" }
   $at = [DateTimeOffset]::Parse($pending['at'], $inv)
   $lockFile = Join-Path $env:TEMP 'dv3-timing.lock'
   $bootAt = [DateTimeOffset](Get-CimInstance Win32_OperatingSystem).LastBootUpTime
   $lockText = if (Test-Path -LiteralPath $lockFile) { [IO.File]::ReadAllText($lockFile) } else { $null }
   $parts = if ($lockText) { $lockText.Split('|') } else { @() }
   $ours = $parts.Count -eq 3 -and $parts[1] -ceq "IG P2 $id"
   if ($lockText -and -not $ours) { throw "STOP: the lock is not ${id}'s: $lockText" }
   $lockAt = if ($ours) { [DateTimeOffset]::Parse($parts[2], $inv) } else { $null }
   if ($ours -and $lockAt -ge $bootAt) { throw "STOP: ${id}'s lock is newer than the boot" }
   $status = @(Get-Content -LiteralPath (Join-Path $RAW "rows\$stage.status.jsonl") -ErrorAction SilentlyContinue | Where-Object { $_ } | ForEach-Object { $_ | ConvertFrom-Json -AsHashtable -DateKind String })
   $started = @($status | Where-Object { $_['t'] -ceq 'start' -and $_['invocation'] -ceq $id })
   $ended = @($status | Where-Object { $_['t'] -ceq 'done' -or $_['t'] -ceq 'interrupted' } | ForEach-Object { $_['key'] })
   $tNode = if ($ours) { $lockAt } elseif ($started.Count -gt 0) { $at } else { $null }
   $from = ($tNode ?? $at).LocalDateTime
   $kernel = @{ LogName = 'System'; ProviderName = 'Microsoft-Windows-Kernel-General'; StartTime = $from }
   $boot = Get-WinEvent -FilterHashtable ($kernel + @{ Id = 12 }) -ErrorAction SilentlyContinue | Sort-Object TimeCreated | Select-Object -First 1
   if (-not $boot) { throw "STOP: no boot after $from; not a host restart, ask the pack author" }
   $down = Get-WinEvent -FilterHashtable ($kernel + @{ Id = 13 }) -ErrorAction SilentlyContinue | Where-Object { $_.TimeCreated -lt $boot.TimeCreated } | Sort-Object TimeCreated | Select-Object -First 1
   $endAt = [DateTimeOffset]$(if ($down) { $down.TimeCreated } else { $boot.TimeCreated })
   $endAt = $endAt.AddTicks((10000 - $endAt.Ticks % 10000) % 10000)
   $nodeS = if ($tNode) { [math]::Min([double]$pending['limitS'], [math]::Ceiling(($endAt - $tNode).TotalMilliseconds) / 1000) } else { 0.0 }
   $line = [ordered]@{ id = $id; stage = $stage }
   if ($pending.ContainsKey('item')) { $line.item = $pending['item'] } else { $line.group = $pending['group'] }
   $line.start = $at.ToLocalTime().ToString($fmt, $inv)
   $line.end = $endAt.ToLocalTime().ToString($fmt, $inv)
   $line.nodeSeconds = $nodeS
   $line.quietS = 45
   $line.countedSeconds = $nodeS + 45
   $line.limitS = $pending['limitS']
   $line.killed = $true
   $line.exit = -1
   $line.rowsWritten = 0
   $line.cause = 'exit'
   $json = $line | ConvertTo-Json -Compress
   "pending: $($pendingText.Trim() -replace '\s+', ' ')"
   "lock: $lockText; boot $($bootAt.ToString($fmt, $inv))"
   "started by ${id}: $(@($started | ForEach-Object { $_['key'] }) -join ', '); to become interrupted: $(@($started | Where-Object { $ended -cnotcontains $_['key'] } | ForEach-Object { $_['key'] }) -join ', ')"
   Get-WinEvent -FilterHashtable @{ LogName = 'System'; StartTime = $from; EndTime = $boot.TimeCreated.AddMinutes(5); Id = 1074, 6006, 6008, 41, 13, 12 } -ErrorAction SilentlyContinue | Sort-Object TimeCreated | ForEach-Object { "event $($_.Id) $($_.ProviderName) $($_.TimeCreated.ToString('yyyy-MM-ddTHH:mm:ss.fffffff', $inv)): $(($_.Message -split "`r?`n")[0])" }
   "line: $json"
   node $p2 ledger --append --json $json
   if ($LASTEXITCODE -ne 0) { throw 'STOP: ledger --append' }
   node $p2 release --id $id
   if ($LASTEXITCODE -ne 0) { throw 'STOP: release' }
   if ($ours) { Remove-Item -LiteralPath $lockFile }
   node $p2 seal --check
   if ($LASTEXITCODE -ne 0) { throw 'STOP: seal check' }
   node $p2 ledger --status
   if ($LASTEXITCODE -ne 0) { throw 'STOP: ledger status' }
   node $p2 status --stage $stage
   if ($LASTEXITCODE -ne 0) { throw 'STOP: status' }
   foreach ($k in 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired', 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending') {
     if (Test-Path -LiteralPath $k) { throw "STOP: a Windows restart is pending ($k); ask the owner before the next invocation" }
   }
   ```

   The orchestrator copies the printed lines into the execution log. A cut item (steps 2 and 3) is charged by the same
   block; whether it runs again is a pack-author ruling.

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
   - every `interrupted` row with its cause and its invocation, as missing evidence (never zero, never imputed), and
     every host-restart line of the ledger with its evidence (check-list §3.5, INC-P2-19-RESTART);
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
- **A host restart or crash** during an invocation: step 1's recovery block, then the loop resumes at the interrupted
  group. Any `STOP:` of that block, a pending Windows restart included, goes to the pack author or the owner before the
  next invocation.

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
