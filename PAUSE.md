# PAUSE: improve-generating v4 (Pentomino), paused 2026-11-17 20:19 +07:00

The owner paused the implementation of `tasks/improve-generating-v4/` on 2026-11-17 at 20:19 +07:00 and asked for
this file so that the work can resume on another computer. It records where everything stands, what does not
travel with git, and how to resume. Sudoku: no improve-generating work until the owner orders it (owner, Discord,
2026-11-16 13:45).

## Tóm tắt (cho owner)

- Xong 29/36 task (T01a đến T11b), mỗi task một commit trên nhánh `improve-generating`, chưa push.
- T11c đang làm dở: code đã xong và gate xanh, nhưng còn câu hỏi QUESTION 1 (chặn) và 2 câu hỏi không chặn
  chưa được SA phán quyết. Code của T11c chưa commit (xem mục 2).
- Hai câu hỏi của anh lúc 20:12 và 20:16 (thời gian chờ, chạy song song trên 16 core, tạm hoãn đo đạc) đang được
  SA-Opus và SA-Astra phân tích thì bị dừng; cần hỏi lại khi resume (mục 3).
- Đã dùng khoảng 2.969 s trên trần 5.520 s (92 phút). Các task còn lại không dùng thời gian máy.
- Khi chuyển máy: phải chép thư mục `tests/artifacts/ig-proto/` (git bỏ qua thư mục này, 44,8 MB) vì receipt
  của stage 1 ràng buộc 9 file trong đó; phải chép lock helper (phụ lục A); và mọi phép đo thời gian chỉ so sánh
  được trên chính máy này (mục 5).

## 1. Where things stand

| Item | Value |
|---|---|
| Repository | `Q:\git\pentomino` (origin `https://github.com/tdat00/pentomino.git`) |
| Branch | `improve-generating`, HEAD `5b67b4a` (T11b), 65 commits ahead of `origin/improve-generating` (`345d29d`); **not pushed** |
| Plan | `docs/improve-generating/plan.md` (v4, final) |
| Task pack | `tasks/improve-generating-v4/`: `check-list.md` (index, shared rules §3, decisions §4, register §5, named items §6, summary §7) and 36 task files |
| Pack author / reviewer | SA-Opus (claude-opus-5.5) / SA-Astra (gpt-6-astra); supervisor SA-Fable through the temporary branch `clarifications` |
| Executor | Dev-Sonnet (claude-sonnet-5.5), one task at a time; the orchestrator verifies, fills each task's Execution log and commits |
| Frozen source | `3fc65f4` (D-V4-01), archived under `tests/artifacts/ig-proto/frozen-source/` |

### Tasks

| Task | State | Commit |
|---|---|---|
| T01a, T01b | done | `0ef440e`, `c7b9d47` |
| T02a, T02b, T02c, T02d | done | `4f14450`, `731338c`, `f55db42`, `ca1b9d5` |
| T03 | done | `4ba6f70` |
| T04a, T04b, T04c, T04d, T04e, T04f | done (stage 1 holds and is bound) | `5158729`, `4622c22`, `107957c`, `a082333`, `2f7a0ed`, `991520a` |
| T05 | done | `cc9f571` |
| T06a, T06b | done | `100bb05`, `9f5fb57` |
| T07a, T07b | done | `e2745bd`, `9caa70f` |
| T08 | done | `c8d2724` |
| T09a, T09b, T09c, T09d, T09e | done | `a27cb29`, `296d15e`, `8207d30`, `3fcf97d`, `61fa9ee` |
| T10a, T10b, T10c | done | `3c3e006`, `2712614`, `2ed2901` |
| T11a, T11b | done | `2838991`, `5b67b4a` |
| **T11c** | **in progress, uncommitted, blocked by QUESTION 1** (section 2) | none |
| T11d, T11e, T11f, T11g | pending; machine time 0; **owner stop at the end of T11g: the frozen-round price (OD-P10)** | none |
| T12, T13 | pending; production changes (docs EN and VI per `AGENTS.md`); independent of the frozen round (D-V4-11) | none |

`check-list.md` is the source of truth: the index ticks, the summary rows (§7) and each task's Execution log are
filled up to T11b. Pack amendments by the pack author are separate commits (`improve-generating: pack amendment
after <ID> ...`).

## 2. T11c: state and open questions

T11c (Frozen-round plans: the compiler, the isolated P-0 manifest and the prerequisites gate) was dispatched at
19:48:30 from base `5b67b4a` to agent `cdc21a79-c1cb-4d82-ba26-cd199bcf7f27`. The developer finished at about 20:15
and reported three questions. **None has been sent to the pack author yet.**

Uncommitted files of T11c (all inside its Scope):

- Modified: `tools/ig-proto/manifest.mjs` (builders, `compilePlans`, `checkPrerequisites`, the commands `compile`
  and `check-prerequisites`), `tools/ig-proto/self-test.mjs` (11 `compile:` cases, 151 to 161),
  `tools/ig-proto/README.md` (subsection "Plans, the isolated P-0 and the prerequisites gate (V4-T11c)").
- Created by `manifest.mjs compile` (deterministic): `tools/ig-proto/plans/V4-S2.json`, `V4-LIVE.json`,
  `V4-S4.universe.json`, `V4-S4X.template.json`, and `tools/ig-proto/plans/items/` (`V4-S2P.p0-v4.json`, seven
  `V4-S2P.parity-<arm>.json`, four `V4-S4P.parity-<arm>.json`).

Gates re-run by the orchestrator at 20:17 (all green): `--items` 161 passed; `--frozen` 10 passed; `check-edits
--all` 34 `ok`; `manifest.mjs compile --label frozen --source-label 'frozen 3fc65f4'` writes 16 files, byte-identical
on a second run; `check-prerequisites --plan V4-S2` `prerequisites: pass`; `check-prerequisites --plan V4-LIVE`
`blocked (variant fr-frozen missing; missing file docs/improve-generating/evidence/frozen/V4-S3/freeze.json; missing
file tools/ig-proto/live-deadline.mjs; missing binding docs/improve-generating/evidence/frozen/V4-S2P/p0-v4.accepted.json)`
(expected); firewall `check --task V4-T11c` 289 production files unchanged; the guard on `core generator tests
tools/bench tools/ig-proto/variants tools/ig-proto/lib tools/ig-proto/data tasks` empty; stage-1 `evidence-check`
unchanged (20 files); `check-binding` pass; `npm run check` OK.

The developer's questions (summary of its report):

- **QUESTION 1 (blocking): `run-task.ps1` cannot read the compiled plans.** `pwsh -File tools\ig-proto\run-task.ps1
  -Plan tools\ig-proto\plans\V4-S2.json -Label frozen -SourceLabel 'frozen 3fc65f4' -DryRun` stops at line 39:
  PowerShell 7.6 `ConvertFrom-Json` refuses keys that differ only by case (`rows` and `rowS` in a rows step's
  `price`, `{ type: 'rows', rows, rowS, rowLimitS }`, as T11b and T11c specify). It affects 33 steps of `V4-S2.json`
  and 2 of `V4-LIVE.json`, and later `V4-S4.json` (T11e) and `V4-S4C.json` (T11f). A scratch copy of the runner
  with `ConvertFrom-Json -AsHashtable` reads both plans: dry-run forecast 40,085 s for V4-S2 (allocation 40,140 s)
  and 2,389 s for V4-LIVE (2,400 s). Options: (a) a one-line change in `run-task.ps1` (`-AsHashtable` for the plan
  read), adding `run-task.ps1` to T11c's scope; (b) rename `rowS` and let `stepPrice` accept the alias (edits
  T11b, T11c, T11e, T11f, T11g); (c) keep the price input outside the plan. **Default (a).** The developer did not
  touch `run-task.ps1`.
- **QUESTION 2 (default taken): P-1 passes are priced at reserves**, because no earlier task measured an `fr-*`
  variant: the seven passes cost 141.8 counted minutes and V4-S2's allocation is 669 min. Option (b), pricing an
  `fr-*` variant with the `v4` measures (34.6 / 23.6 / 16.3 s), gives 5.3 min per pass and 564 min.
- **QUESTION 3 (default taken): a `firewall-snapshot` step was added to `V4-LIVE`**, because `firewall.mjs check`
  exits 1 without a snapshot.

Compiled prices (stderr of `compile`): `V4-S2` allocation 669 min (counted 668.1, guard 836: 33 rows steps 512.5,
7 P-1 passes 141.8, P-0 8.7, 3 probes 5.2); `V4-LIVE` allocation 40 min (not runnable until stage 3); stage-4
universe 3,051.7 min (initial 1,888.3, conditional 347.4, optional 72.1, second 744.0). Rows plus universe equal
T11b's 3,604 min.

Other points of the report for the pack author: the developer's deviations (extra `compilePlans` seams,
`priceOf(input, id)`, result maps keyed by file name, async `checkPrerequisites`, `durationSource` fields, notes on
stderr, two extra cases, README rows, new imports of `manifest.mjs`), its readings (durations lookup
`<kind>/<variant>` then `<kind>/*` then reserve; `--by` is the plan task without the trailing `P`; the step fields
`dependsOn`, `consumes`, `produces`, `expect`; `rowS` is `projectedRowS` unrounded) and its named items (T11d must
print `receipt: <kind> <verdict> -> <path>` and support `accept` for parity and p0-identity; N-V4-13's receipt line
is unknown; T11g section 7 states the P-1 reserve pricing; a firewall snapshot taken at V4-S2 start would flag a
T12 or T13 production edit made while it runs).

## 3. The owner's open questions (analyses interrupted by the pause)

1. 2026-11-17 20:12: "tại sao cần quá nhiều thời gian chờ, và tại sao chạy tuần tự các test? chạy multi được
   không, vì máy tính có đến 16 cores" (why so much waiting, why sequential runs, can they run in parallel on 16
   cores).
2. 2026-11-17 20:16: "nếu tạm hoãn các việc đo đạc thì có ảnh hưởng plan không?" (does postponing the
   measurements affect the plan).

Both were sent to SA-Opus and SA-Astra for independent read-only analyses; both agents were stopped by the pause
before answering. Re-ask them on resume. The orchestrator's preliminary answer, from the code and the plan:

- **Waiting.** Every timed run goes through the lock helper (Appendix A), which waits until both difficulty-v3
  locks have been free for 45 s, then caps the run at 300 s. With `rowLimitS` 260 and the runner's admission rule
  (`tools/ig-proto/arm.mjs:175`, `elapsedS() + limitS + 10 <= 285`) one row fits per invocation, so each row pays
  45 s: about 918 of T11b's 3,604 counted minutes. The quiet period is idle time counted by the accounting rule.
- **Sequential.** Each row already runs four workers (`tools/ig-proto/data/frozen-round-v1.json` `"workers": 4`;
  plan P8: every gate is read at four workers). The rows measure wall-clock time (time to ten puzzles, the 120-s
  deadline, p95); concurrent rows share CPU and memory and inflate those times (T10c: one rating 1.17 times slower
  at four concurrent workers and 1.53 times at eight), which breaks the comparison with the MP12b1 baseline.
- **Options for the SAs to price:** a per-invocation limit above 300 s (the owner's rule that protects Sudoku's
  difficulty-v3); a shorter quiet period when difficulty-v3 is idle; parallel runs of untimed work (correctness,
  parity, Master puzzle identity); parallel timed lanes on disjoint cores after a calibration that proves no
  interference; trimming collections (conditional 347 min, second validation 744 min, optional 72 min) or reps.
- **Postponing.** T11c to T11g and T12, T13 need no measurement (T12 and T13 are independent of the frozen round:
  D-V4-11, plan §6). Postponing the frozen round delays phase 2 (`gen-v4` in production, the fix of the failing
  Nightmare cells), phases 3 and 4, and the named items N-V4-02 to N-V4-04, N-V4-13, N-V4-14, N-V4-16 and N-V4-17.
  Costs of waiting: the raw files bound by receipts must be kept (check-list §3.3), the drift from `3fc65f4` grows
  before phase 2, and a machine or Node change may need the stage-1 factor and the MP12b1 baseline re-measured
  (the SAs to confirm).

The frozen-round price itself: T11b priced the real matrix of T11a (151 groups, 1,940 rows, 10 Nightmare
controls) at 1,224 invocations and 3,604 counted minutes (stage 2 512.5, stage 4 3,091.6); SA-Opus accepted it as
real and conservative; the owner approves it at T11g's stop, in stages (T11g sections 7 and 8 explain the causes).
The owner was informed on Discord at 19:44 and 19:49.

## 4. Machine time

| Item | Seconds |
|---|---|
| Owner's cumulative frozen-round cap (grant option A, 2026-11-17 08:12, check-list §5) | 5,520 (92 min) |
| Counted by the runner after T10c | 2,913.910 |
| Register row: T10a's scratch run outside the plan (`3e29586`) | 55.4 |
| **Total counted** | **2,969.31** |
| Allocated to T11c to T13 | 0 |

Every locked plan run passes `-ApprovedRoundMinutes 92`, dry run first, and runs only if every locked step is
`go`. No measurement ever runs outside a plan.

## 5. Moving to another computer: what does not travel with git

1. **`tests/artifacts/ig-proto/` is git-ignored (44.8 MB) and must be copied.** The stage-1 receipt
   `docs/improve-generating/evidence/frozen/V4-T04/stage1.json` binds 20 files by hash; 9 of them are there:
   `tests/artifacts/ig-proto/frozen/V4-T04/parity/state.json`, `.../V4-T04/parity/items.jsonl`,
   `.../V4-T04/replay/state.json`, `.../V4-T04/replay/items.jsonl`, `.../IGP-02/main/screens-all-state.json`,
   `.../V4-T04/self-test/state.json`, `.../V4-T04v4/self-test/state.json`, `.../V4-T04f/self-test/state.json`,
   `.../V4-T04i/self-test/state.json`. Without them `v4-check.mjs evidence-check` fails and stage 1 is no longer
   provable; check-list §3.3 forbids deleting them before phase 0 is decided. The folder also holds the frozen
   source archive (`frozen-source/`), the built trees and the raw runs of T10a to T10c. A copy was written to
   `Q:\git\pentomino-ig-artifacts-2026-11-17.zip`; unzip it at the repository root so that
   `tests/artifacts/ig-proto/` is restored as it was.
2. **The lock helper lives outside the repository**, in a session folder of this machine:
   `C:\Users\ledat\.copilot\session-state\c2f29688-8568-4f25-bace-e644d381e5f9\files\ig-lock.ps1`. Its source is
   Appendix A. Check-list §3.2 hard-codes that path (lines 304, 319 and 334), so on another computer the path must
   change (a pack amendment by the pack author, or the same path recreated). On a computer where Sudoku's
   difficulty-v3 does not run, the helper never waits behind Sudoku, but it still waits 45 s of quiet per
   invocation and caps a run at 300 s.
3. **Timing is machine-specific.** The MP12b1 baseline, the stage-1 factor (`factor()` 1.0236291451740192 from
   `docs/improve-generating/evidence/frozen/V4-T04/identity.json`) and the probes of T10a to T10c were measured on
   this computer (Windows, 16 logical cores, Node v26.13.0). A timed plan run on another computer is not comparable
   with them until the SAs rule how to re-measure; ask before any locked or timed run there. Untimed work (T11c to
   T11g, T12, T13, the self-tests) can run anywhere. Use Node 26 (T10b's profile depends on its inlining flags).
4. **The uncommitted T11c files** (section 2) exist only in this working tree until they are committed or copied.
5. **Personal agent setup:** `~/.copilot/instructions/agent-roles.instructions.md` and the skills `analyze`,
   `break-tasks` and `implement` (`~/.copilot/skills/<name>/SKILL.md`) must exist on the other computer.
6. **Git settings:** `core.autocrlf=true` and `core.safecrlf=true`; files are CRLF, UTF-8 without BOM, no trailing
   whitespace, final newline.
7. **Discord reporting** (optional): the webhook script and the user environment variable `DISCORD_BOT_TOKEN` are
   not in the repository; set them up again if wanted, never commit them. Bot "AI-Agents", channel `ai-agents`
   (1571771698062164038).
8. **The orchestrator's Execution-log helper** `fill-log.ps1` (Appendix B) lives in the session folder
   `C:\Users\ledat\.copilot\session-state\c5fb7efe-1649-4e78-94e5-ef18c16b5f7b\files\`; it is a convenience only.

## 6. How to resume

1. Bring the repository to the other computer with branch `improve-generating` at `5b67b4a` or later, plus the
   uncommitted T11c files, and restore `tests/artifacts/ig-proto/` from the zip (section 5, item 1).
2. Save the lock helper (Appendix A) and settle its path (section 5, item 2).
3. Verify, at the repository root (all unlocked):

   ```powershell
   node tools\ig-proto\v4-check.mjs evidence-check --label frozen --receipt docs\improve-generating\evidence\frozen\V4-T04\stage1.json   # evidence: unchanged (20 files)
   node tools\ig-proto\v4-check.mjs check-binding --label frozen --binding docs\improve-generating\evidence\frozen\V4-T04\accepted-binding.json   # binding: pass
   node tools\ig-proto\lib\tree.mjs check-edits --all --label frozen   # 34 ok lines, no other line
   node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task V4-T11c-resume   # 161 passed (with T11c's files)
   node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --frozen --task V4-T11c-resume-frozen   # 10 passed
   node tools\ig-proto\firewall.mjs check --task V4-T11c --label frozen   # 289 production files unchanged
   npm run check   # check-conventions: OK, check-site: OK
   ```

   Delete the scratch self-test folders `tests/artifacts/ig-proto/frozen/V4-T11c-resume*` afterwards. Never
   delete the other folders under `tests/artifacts/ig-proto/frozen/`. Never run `v4-check.mjs summary --task
   V4-T04` or a `V4-T04` plan, and never write into IGP-02, V4-T04, V4-T04v4, V4-T04f, V4-T04i or V4-S2P
   (check-list §3.1). `check-binding --current v4` reports `stale arm v4` since T07a, by design.
4. Start the pack author again (SA-Opus, claude-opus-5.5, reasoning max, long context) with the plan, the pack and
   this file; relay T11c's three questions verbatim (they are in the T11c developer's report; the summary is
   section 2); then relay the ruling to a developer for T11c, verify, fill T11c's Execution log (dispatch
   2026-11-17 19:48:30, developer 19:48:13 to about 20:15, agent `cdc21a79-c1cb-4d82-ba26-cd199bcf7f27`) and commit.
5. Put the owner's two questions (section 3) to SA-Opus and SA-Astra independently, then to the owner with a
   comparison table.
6. Continue the `implement` skill with T11d, T11e, T11f and T11g, then stop for the owner's price decision (OD-P10),
   then T12 and T13.

## 7. Rules that hold on resume

- The developer never commits, never edits `tasks/` or the plan, and stops with `QUESTION:` on anything that
  changes behaviour, a contract, the scope or a recorded decision; the orchestrator relays verbatim and never rules.
- One commit per accepted task (`improve-generating <ID>: <title>`, with the session trailers); pack amendments are
  pack-only commits by the pack author. Do not push unless the owner asks.
- Evidence written by a plan is written once (check-list §3.3); a decided selection or phase 0 is never
  overwritten (T09e step 3c).
- No measurement outside a plan, no raised budget, guard or approved minutes.
- Sudoku: no improve-generating work until the owner orders it.

## Appendix A: the lock helper `ig-lock.ps1` (verbatim)

Path on the paused computer: `C:\Users\ledat\.copilot\session-state\c2f29688-8568-4f25-bace-e644d381e5f9\files\ig-lock.ps1`. Dot-source it, then call `Invoke-IgNode -Repo pentomino -Task '<label>' -NodeArgs @(...)` (check-list §3.2).

```powershell
# Low-priority timing wrapper for improve-generating prototypes.
# difficulty-v3 has priority: a run starts only after BOTH difficulty-v3 locks have been free
# continuously for $QuietSeconds (difficulty-v3 sequences use 15 s gaps, so they are never interrupted),
# holds the repository's lock, and is killed at $LimitSeconds (default 300 s) so difficulty-v3 waits little.
function Invoke-IgNode {
  param(
    [Parameter(Mandatory)][ValidateSet('sudoku', 'pentomino')][string]$Repo,
    [Parameter(Mandatory)][string]$Task,
    [Parameter(Mandatory)][string[]]$NodeArgs,
    [int]$LimitSeconds = 300,
    [int]$QuietSeconds = 45,
    [int]$WaitHours = 6,
    [switch]$AllowExit1
  )
  if ($LimitSeconds -gt 300) { throw 'improve-generating runs are limited to 300 s; shard the work' }
  $sudokuLock = Join-Path $env:TEMP 'dv3-sudoku.lock'
  $pentominoLock = Join-Path $env:TEMP 'dv3-timing.lock'
  $mine = if ($Repo -eq 'sudoku') { $sudokuLock } else { $pentominoLock }
  $until = (Get-Date).AddHours($WaitHours)
  $lock = $null
  $p = $null
  while (-not $lock) {
    $quietSince = Get-Date
    while (((Get-Date) - $quietSince).TotalSeconds -lt $QuietSeconds) {
      if ((Get-Date) -ge $until) { throw "No quiet timing slot within $WaitHours h; report to the orchestrator" }
      if ((Test-Path $sudokuLock) -or (Test-Path $pentominoLock)) { $quietSince = Get-Date }
      Start-Sleep -Seconds 3
    }
    try {
      $lock = [IO.File]::Open($mine, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
    } catch {
      $lock = $null
      continue
    }
    $other = if ($mine -eq $sudokuLock) { $pentominoLock } else { $sudokuLock }
    if (Test-Path $other) {
      $lock.Dispose(); Remove-Item -LiteralPath $mine -ErrorAction SilentlyContinue; $lock = $null
    }
  }
  try {
    $bytes = [Text.Encoding]::UTF8.GetBytes("$PID|IG $Task|$([DateTime]::UtcNow.ToString('o'))")
    $lock.Write($bytes, 0, $bytes.Length)
    $lock.Flush()
    $si = [Diagnostics.ProcessStartInfo]::new('node')
    $si.UseShellExecute = $false
    $si.WorkingDirectory = (Get-Location).Path
    foreach ($arg in $NodeArgs) { $si.ArgumentList.Add($arg) }
    $start = Get-Date
    $p = [Diagnostics.Process]::Start($si)
    if (-not $p.WaitForExit($LimitSeconds * 1000)) { throw "$LimitSeconds-second limit reached; record the timeout and shard the work" }
    $global:LASTEXITCODE = $p.ExitCode
    Write-Host "IG $Task exit=$($p.ExitCode) seconds=$([math]::Round(((Get-Date)-$start).TotalSeconds,3))"
    if ($p.ExitCode -ne 0 -and -not ($AllowExit1 -and $p.ExitCode -eq 1)) {
      throw "IG $Task command failed: $($p.ExitCode)"
    }
  } finally {
    if ($p -and -not $p.HasExited) {
      $all = Get-CimInstance Win32_Process
      $owned = [Collections.Generic.List[int]]::new()
      $owned.Add($p.Id)
      for ($i = 0; $i -lt $owned.Count; $i++) {
        foreach ($child in ($all | Where-Object ParentProcessId -EQ $owned[$i])) {
          if (-not $owned.Contains([int]$child.ProcessId)) { $owned.Add([int]$child.ProcessId) }
        }
      }
      for ($i = $owned.Count - 1; $i -ge 0; $i--) {
        Stop-Process -Id $owned[$i] -Force -ErrorAction SilentlyContinue
      }
    }
    if ($lock) {
      $lock.Dispose()
      Remove-Item -LiteralPath $mine -ErrorAction Stop
    }
  }
}
```

## Appendix B: the orchestrator's Execution-log helper `fill-log.ps1` (verbatim)

It fills a task's Execution log, ticks the index line, fills the summary row and writes the previous row's commit. Example: `& fill-log.ps1 -Id T11c -TaskFile tasks\improve-generating-v4\T11c-frozen-round-plans.md -Start ... -Commit ... -SumStart ... -SumEnd ... -SumDur ... -PrevId T11b -PrevCommit 5b67b4a`.

```powershell
param(
  [Parameter(Mandatory)][string]$Id,
  [Parameter(Mandatory)][string]$TaskFile,
  [Parameter(Mandatory)][string]$Start, [Parameter(Mandatory)][string]$Waiting, [Parameter(Mandatory)][string]$Agent,
  [Parameter(Mandatory)][string]$Tokens, [Parameter(Mandatory)][string]$Credits, [Parameter(Mandatory)][string]$Questions,
  [Parameter(Mandatory)][string]$FixRounds, [Parameter(Mandatory)][string]$Gates, [Parameter(Mandatory)][string]$Commit,
  [Parameter(Mandatory)][string]$Issues,
  [Parameter(Mandatory)][string]$SumStart, [Parameter(Mandatory)][string]$SumEnd, [Parameter(Mandatory)][string]$SumDur,
  [string]$PrevId, [string]$PrevCommit,
  [string]$Repo = 'Q:\git\pentomino', [string]$Pack = 'tasks\improve-generating-v4'
)
$enc = [Text.UTF8Encoding]::new($false)
function Read-Norm($p) { ([IO.File]::ReadAllText($p, $enc) -replace "`r`n", "`n") }
function Write-Crlf($p, $t) { [IO.File]::WriteAllText($p, ($t -replace "`n", "`r`n"), $enc) }
$tf = Join-Path $Repo $TaskFile
$t = Read-Norm $tf
$rows = [ordered]@{
  'Start, end, duration' = $Start; 'Waiting for rulings' = $Waiting; 'Agent id, model' = $Agent
  'Calls; input, output and cache-read tokens' = $Tokens; 'AI credits' = $Credits; 'Questions and rulings' = $Questions
  'Fix rounds' = $FixRounds; 'Gates re-run by the orchestrator' = $Gates; 'Commit' = $Commit; 'Issues and named items' = $Issues
}
$i = $t.IndexOf('## Execution log')
if ($i -lt 0) { throw "no Execution log in $TaskFile" }
$head = $t.Substring(0, $i); $tail = $t.Substring($i)
foreach ($k in $rows.Keys) {
  $pat = '(?m)^\| ' + [regex]::Escape($k) + ' \| *\|$'
  if (-not [regex]::IsMatch($tail, $pat)) { throw "row '$k' not empty or missing" }
  $val = $rows[$k] -replace '\|', '\|'
  $tail = [regex]::Replace($tail, $pat, [Text.RegularExpressions.MatchEvaluator] { param($m) "| $k | $val |" }, 1)
}
Write-Crlf $tf ($head + $tail)
$cf = Join-Path $Repo (Join-Path $Pack 'check-list.md')
$c = Read-Norm $cf
$pi = '(?m)^- \[ \] ' + [regex]::Escape($Id) + ' '
if (-not [regex]::IsMatch($c, $pi)) { throw "index line for $Id not found unticked" }
$c = [regex]::Replace($c, $pi, "- [x] $Id ", 1)
$ps = '(?m)^\| ' + [regex]::Escape($Id) + ' \| \| \| \| \| \|$'
if (-not [regex]::IsMatch($c, $ps)) { throw "summary row for $Id not empty" }
$c = [regex]::Replace($c, $ps, "| $Id | $SumStart | $SumEnd | $SumDur | $Credits | this task's commit |", 1)
if ($PrevId) {
  $pp = '(?m)^(\| ' + [regex]::Escape($PrevId) + ' \|.*\|) this task''s commit \|$'
  if (-not [regex]::IsMatch($c, $pp)) { throw "previous summary row $PrevId not found" }
  $c = [regex]::Replace($c, $pp, "`$1 ``$PrevCommit`` |", 1)
}
Write-Crlf $cf $c
"filled $Id"
```
