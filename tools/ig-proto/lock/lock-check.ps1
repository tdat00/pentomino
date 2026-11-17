#Requires -Version 7
<#
.SYNOPSIS
  Unlocked checks of the pentomino copy of the lock helper (ig-lock.ps1, T11h): the 900-s limit, the idle quiet period and
  its fail-closed rules. Every case runs in a child pwsh whose TEMP is a fresh folder under this run's own scratch root
  tests\artifacts\ig-proto\selftest\lock\<yyyyMMddTHHmmss>-<PID> (removed at the end unless -Keep or a case failed; no run deletes
  another run's folders), so the real TEMP and its lock and idle files are never read or written; node runs `-e 0` only. The quiet
  periods are 6 s and 2 s (45 s and 15 s at about a seventh of the time) and a standard call is limited to 30 s.
  Run it alone, after the other gates and with nothing else running: it asserts wall-clock waits with margins of 0.3 to 1 s.
.EXAMPLE
  pwsh -NoProfile -File tools\ig-proto\lock\lock-check.ps1 [-Detail] [-Keep] [-HarnessCheck]
.NOTES
  Prints `lock-check: <case> ok` per case, then `lock-check: <n> cases ok` (exit 0); the failing case is
  `lock-check: FAIL <case>: <reason>` (exit 1). A child that times out (150 s) or exits nonzero is reported with the last progress
  marker of its progress.txt, the files of its folder (the content of a dv3-*.lock file included) and its process tree, printed before
  the tree is killed, then its partial stdout and stderr; its folder is kept. -Detail adds the measured numbers; -Keep leaves the
  scratch folders; -HarnessCheck runs only z-harness-timeout (a child that sleeps 20 s under a harness timeout of 5 s), which must
  print that report, leave no process of its tree and exit 1 (2 when the harness itself misbehaves).
#>
[CmdletBinding()]
param(
  [switch]$Detail,
  [switch]$Keep,
  [switch]$HarnessCheck
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$helper = Join-Path $PSScriptRoot 'ig-lock.ps1'
$runId = '{0}-{1}' -f (Get-Date).ToString('yyyyMMdd\THHmmss'), $PID
$scratchRoot = Join-Path (Join-Path $root 'tests\artifacts\ig-proto\selftest\lock') $runId
$inv = [cultureinfo]::InvariantCulture

# What every child runs first: the scratch TEMP must be in force, then the helper is dot-sourced.
$prelude = @'
$ErrorActionPreference = 'Stop'
$dir = '@@DIR@@'
if ($env:TEMP -ne $dir -or $env:TMP -ne $dir -or [IO.Path]::GetTempPath().TrimEnd('\') -ne $dir) { throw "the scratch TEMP is not in force: $env:TEMP" }
function Add-Progress([string]$Stage) { [IO.File]::AppendAllText((Join-Path $dir 'progress.txt'), "$([DateTime]::UtcNow.ToString('o')) $Stage`r`n") }
. '@@HELPER@@'
Add-Progress 'prelude'
$inv = [cultureinfo]::InvariantCulture
$std = @{ Repo = 'pentomino'; QuietSeconds = 6; IdleQuietSeconds = 2; LimitSeconds = 30 }
function New-Decl {
  param([hashtable]$Override = @{})
  $now = [DateTime]::UtcNow
  $d = [ordered]@{ format = 'dv3-idle'; version = 1; setAt = $now.AddMinutes(-1).ToString('o'); idleUntil = $now.AddHours(1).ToString('o'); setBy = 'lock-check'; source = 'lock-check' }
  foreach ($key in $Override.Keys) { $d[$key] = $Override[$key] }
  $d
}
function Write-IdleText([string]$Text) { [IO.File]::WriteAllText((Join-Path $env:TEMP 'dv3-idle.json'), $Text) }
function Write-Decl($Decl) { Write-IdleText ($Decl | ConvertTo-Json) }
function Write-SeenText([string]$Text) { [IO.File]::WriteAllText((Join-Path $env:TEMP 'dv3-sudoku-seen.txt'), $Text) }
function Reset-Files { foreach ($n in 'dv3-idle.json', 'dv3-sudoku-seen.txt') { Remove-Item -LiteralPath (Join-Path $env:TEMP $n) -ErrorAction SilentlyContinue } }
function Measure-Call {
  param([hashtable]$Params, [string[]]$NodeArgs = @('-e', '0'))
  $info = $null
  $failure = $null
  Add-Progress 'before-call'
  $watch = [Diagnostics.Stopwatch]::StartNew()
  try { Invoke-IgNode @Params -Task 'lock-check' -NodeArgs $NodeArgs -InformationVariable info } catch { $failure = $_.Exception.Message }
  $watch.Stop()
  Add-Progress 'after-call'
  [ordered]@{ seconds = $watch.Elapsed.TotalSeconds; line = (@($info | ForEach-Object { "$_" }) -join "`n"); error = $failure }
}
$checks = [System.Collections.Generic.List[object]]::new()
function Add-Check([string]$Name, [bool]$Expect) { $checks.Add([ordered]@{ name = $Name; expect = $Expect; got = [bool](Test-IgIdle) }) }
function Write-Result($Result) { Add-Progress 'result'; $Result['checks'] = @($checks); 'RESULT ' + ($Result | ConvertTo-Json -Compress -Depth 8) }
'@

function Assert([bool]$Condition, [string]$Message) {
  if (-not $Condition) { throw $Message }
}

# The text of a file that another process may have open (a lock file, progress.txt); '' when it does not exist.
function Read-Shared([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) { return '' }
  try {
    $stream = [IO.File]::Open($Path, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite)
    try { return [IO.StreamReader]::new($stream).ReadToEnd() } finally { $stream.Dispose() }
  } catch {
    return "(unreadable: $($_.Exception.Message))"
  }
}

# What a stalled or failed child leaves to look at, collected before its tree is killed: its last progress marker, the files of its
# folder with their sizes (a dv3-*.lock file with its content) and its process tree (PID, name and command line, from Win32_Process).
function Get-ChildDiagnostics([Diagnostics.Process]$Child, [string]$Dir) {
  $lines = [System.Collections.Generic.List[string]]::new()
  $marker = @((Read-Shared (Join-Path $Dir 'progress.txt')) -split "`r?`n" | Where-Object { $_ }) | Select-Object -Last 1
  $lines.Add("last progress: $(if ($marker) { $marker } else { 'none (progress.txt is missing or empty)' })")
  $lines.Add("folder: $Dir")
  $lines.Add('files:')
  foreach ($f in [IO.DirectoryInfo]::new($Dir).GetFiles()) {
    $lines.Add("  $($f.Name) $($f.Length) bytes$(if ($f.Name -like 'dv3-*.lock') { ' content: ' + (Read-Shared $f.FullName) })")
  }
  $all = @(Get-CimInstance Win32_Process)
  $ids = [System.Collections.Generic.List[int]]::new()
  $ids.Add($Child.Id)
  for ($i = 0; $i -lt $ids.Count; $i++) {
    foreach ($p in ($all | Where-Object { $_.ParentProcessId -eq $ids[$i] })) {
      if (-not $ids.Contains([int]$p.ProcessId)) { $ids.Add([int]$p.ProcessId) }
    }
  }
  $lines.Add('process tree:')
  foreach ($id in $ids) {
    $p = $all | Where-Object { $_.ProcessId -eq $id } | Select-Object -First 1
    $lines.Add($(if ($p) { "  $id $($p.Name) $($p.CommandLine)" } elseif ($id -eq $Child.Id -and $Child.HasExited) { "  $id (the child; exited with code $($Child.ExitCode))" } else { "  $id (not running)" }))
  }
  return @{ Lines = $lines; Pids = @($ids) }
}

# Runs one case body in its child and returns the RESULT object it printed. A child that times out or exits nonzero is reported here,
# with its diagnostics before its tree is killed and its partial output after; the exception then carries `reported`.
function Invoke-Case([string]$Name, [string]$Body, [int]$TimeoutMs = 150000) {
  $dir = Join-Path $scratchRoot $Name
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  $file = Join-Path $dir 'case.ps1'
  [IO.File]::WriteAllText($file, $prelude.Replace('@@DIR@@', $dir).Replace('@@HELPER@@', $helper) + "`r`n" + $Body, [Text.UTF8Encoding]::new($false))
  $psi = [Diagnostics.ProcessStartInfo]::new([Diagnostics.Process]::GetCurrentProcess().MainModule.FileName)
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.WorkingDirectory = $root
  foreach ($a in '-NoProfile', '-NonInteractive', '-File', $file) { $psi.ArgumentList.Add($a) }
  $psi.Environment['TEMP'] = $dir
  $psi.Environment['TMP'] = $dir
  $child = [Diagnostics.Process]::Start($psi)
  $out = $child.StandardOutput.ReadToEndAsync()
  $err = $child.StandardError.ReadToEndAsync()
  $timedOut = -not $child.WaitForExit($TimeoutMs)
  $closed = $timedOut -or [Threading.Tasks.Task]::WaitAll(@($out, $err), 10000)
  if ($timedOut -or -not $closed -or $child.ExitCode -ne 0) {
    $reason = if ($timedOut) { "the child did not finish within $($TimeoutMs / 1000) s" } elseif (-not $closed) { 'the child exited but a descendant still holds its output pipes' } else { "the child exited $($child.ExitCode)" }
    Write-Host "lock-check: FAIL $($Name): $reason"
    $diag = Get-ChildDiagnostics $child $dir
    foreach ($line in $diag.Lines) { Write-Host "  $line" }
    try { if (-not $child.HasExited) { $child.Kill($true) } } catch { }
    foreach ($id in $diag.Pids) { Stop-Process -Id $id -Force -ErrorAction SilentlyContinue }
    try { [void][Threading.Tasks.Task]::WaitAll(@($out, $err), 5000) } catch { }
    foreach ($stream in @(@('stdout', $out), @('stderr', $err))) {
      $text = if ($stream[1].IsCompleted -and -not $stream[1].IsFaulted) { $stream[1].Result.TrimEnd() } else { '(not closed within 5 s)' }
      $shown = @($text -split "`r?`n")
      Write-Host "  $($stream[0])$(if ($timedOut) { ' (partial)' }):$(if ($shown.Count -gt 40) { " ($($shown.Count - 40) earlier lines omitted)" })"
      foreach ($shownLine in ($shown | Select-Object -Last 40)) { Write-Host "    $shownLine" }
    }
    $script:lastDiag = $diag
    $failure = [Exception]::new($reason)
    $failure.Data['reported'] = $true
    throw $failure
  }
  $stdout = $out.Result
  $stderr = $err.Result
  $line = @($stdout -split "`r?`n" | Where-Object { $_.StartsWith('RESULT ') }) | Select-Object -Last 1
  if (-not $line) { throw "the child printed no RESULT line: $stderr $stdout" }
  return ($line.Substring(7) | ConvertFrom-Json -AsHashtable -DateKind String)
}

function Get-Time([string]$Text) { [DateTimeOffset]::Parse($Text, $inv) }

# One completed call that printed `quiet=<q>` after at least `-MinSeconds` and less than `-MaxSeconds`.
function Assert-Call($Call, [int]$Quiet, [double]$MinSeconds, [double]$MaxSeconds = 40) {
  Assert ($null -eq $Call.error) "the call failed: $($Call.error)"
  Assert ($Call.line -match "^IG lock-check exit=0 seconds=[0-9.]+ quiet=$Quiet`$") "the printed line is `"$($Call.line)`", expected quiet=$Quiet"
  Assert ($Call.line -match 'exit=-?\d+ seconds=(?<s>[0-9.]+)') 'the runner''s pattern does not match the printed line'
  Assert ($Call.seconds -ge $MinSeconds -and $Call.seconds -lt $MaxSeconds) "the call took $([math]::Round($Call.seconds, 2)) s, expected from $MinSeconds s to under $MaxSeconds s"
}

function Assert-Checks($Result, [int]$Minimum) {
  Assert (@($Result.checks).Count -ge $Minimum) "only $(@($Result.checks).Count) direct checks of Test-IgIdle ran, expected $Minimum"
  foreach ($c in $Result.checks) { Assert ($c.got -eq $c.expect) "Test-IgIdle for '$($c.name)' is $($c.got), expected $($c.expect)" }
}

$passed = 0
$failedCase = $null
$failure = $null
$lastDiag = $null
function Test-Case([string]$Name, [string]$Body, [scriptblock]$Verify, [int]$TimeoutMs = 150000) {
  try {
    $result = Invoke-Case $Name $Body $TimeoutMs
    $note = & $Verify $result
  } catch {
    $script:failedCase = $Name
    $script:failure = $_.Exception
    if (-not $_.Exception.Data['reported']) { Write-Host "lock-check: FAIL $($Name): $($_.Exception.Message)" }
    return
  }
  Write-Host "lock-check: $Name ok"
  if ($Detail -and $note) { Write-Host "  $note" }
  $script:passed += 1
}

$fullQuiet = { param($r) Assert-Call $r 6 6; "quiet=6 seconds=$([math]::Round($r.seconds, 2))" }

try {
  $cases = [ordered]@{}

  # (a) no declaration: the full quiet period
  $cases['a-no-declaration'] = @{ Body = @'
Write-Result (Measure-Call $std)
'@; Verify = $fullQuiet }

  # (b) a valid declaration: the short quiet; the shapes that must be accepted are checked directly
  $cases['b-valid-declaration'] = @{ Body = @'
Write-Decl (New-Decl @{})
$pre = Test-IgIdle
$r = Measure-Call $std
$r['pre'] = $pre
$n = [DateTimeOffset]::Now
Reset-Files
Write-Decl (New-Decl @{ setAt = $n.AddMinutes(-1).ToString('o'); idleUntil = $n.AddHours(1).ToString('o') })
Add-Check 'a local offset form' $true
$u = [DateTime]::UtcNow
Reset-Files
Write-Decl (New-Decl @{ setAt = $u.AddMinutes(-1).ToString('yyyy-MM-dd\THH:mm:ss\Z', $inv); idleUntil = $u.AddHours(1).ToString('yyyy-MM-dd\THH:mm:ss\Z', $inv) })
Add-Check 'no fractional seconds' $true
$s = $u.AddMinutes(-1)
Reset-Files
Write-Decl (New-Decl @{ setAt = $s.ToString('o'); idleUntil = $s.AddHours(24).ToString('o') })
Add-Check 'exactly 24 h' $true
Reset-Files
Write-Decl (New-Decl @{ setAt = $s.ToString('o') })
Write-SeenText $u.AddMinutes(-2).ToString('o')
Add-Check 'the Sudoku lock seen before setAt' $true
Write-Result $r
'@; Verify = { param($r)
      Assert ($r.pre -eq $true) 'the declaration was not valid before the call'
      Assert-Call $r 2 2 6
      Assert-Checks $r 4
      "quiet=2 seconds=$([math]::Round($r.seconds, 2))" } }

  # (c) a valid declaration with the Sudoku lock seen after setAt
  $cases['c-sudoku-seen-after-setAt'] = @{ Body = @'
$d = New-Decl @{}
Write-Decl $d
Add-Check 'valid without the seen file' $true
$setAt = [DateTimeOffset]::Parse($d['setAt'], $inv)
Write-SeenText $setAt.AddSeconds(1).UtcDateTime.ToString('o')
$r = Measure-Call $std
Write-SeenText $setAt.AddSeconds(-1).UtcDateTime.ToString('o')
Add-Check 'seen a second before setAt' $true
Write-SeenText $setAt.UtcDateTime.ToString('o')
Add-Check 'seen at setAt' $false
Write-SeenText 'yesterday'
Add-Check 'an unreadable seen file' $false
Write-SeenText ''
Add-Check 'an empty seen file' $false
Write-Result $r
'@; Verify = { param($r) Assert-Checks $r 5; & $fullQuiet $r } }

  # (d) an expired declaration
  $cases['d-expired'] = @{ Body = @'
$u = [DateTime]::UtcNow
Write-Decl (New-Decl @{ setAt = $u.AddHours(-2).ToString('o'); idleUntil = $u.AddHours(-1).ToString('o') })
Write-Result (Measure-Call $std)
'@; Verify = $fullQuiet }

  # (e) an unparseable declaration; the shapes that must be refused are checked directly
  $cases['e-unparseable'] = @{ Body = @'
Write-IdleText '{ this is not json'
$r = Measure-Call $std
Add-Check 'unparseable text' $false
$u = [DateTime]::UtcNow
Reset-Files; Write-Decl (New-Decl @{}); Add-Check 'the control' $true
Reset-Files; Write-IdleText '[1, 2]'; Add-Check 'a top-level array' $false
Reset-Files; Write-IdleText ''; Add-Check 'an empty file' $false
Reset-Files; Write-Decl (New-Decl @{ version = '1' }); Add-Check 'version as text' $false
Reset-Files; Write-Decl (New-Decl @{ version = $true }); Add-Check 'version true' $false
Reset-Files; Write-Decl (New-Decl @{ version = 2 }); Add-Check 'version 2' $false
Reset-Files; Write-Decl (New-Decl @{ format = 'DV3-IDLE' }); Add-Check 'the format in capitals' $false
Reset-Files; Write-Decl (New-Decl @{ setAt = 0 }); Add-Check 'a numeric setAt' $false
Reset-Files; $d = New-Decl @{}; $d.Remove('idleUntil'); Write-Decl $d; Add-Check 'no idleUntil' $false
Reset-Files; Write-Decl (New-Decl @{ setAt = $u.AddMinutes(1).ToString('o') }); Add-Check 'setAt in the future' $false
Reset-Files; Write-Decl (New-Decl @{ setAt = $u.AddMinutes(-1).ToString('o').Replace('T', 't') }); Add-Check 'a lowercase t' $false
Reset-Files; Write-Decl (New-Decl @{ idleUntil = $u.AddHours(1).ToString('o') + ' ' }); Add-Check 'a trailing space' $false
Reset-Files; Write-Decl (New-Decl @{ idleUntil = $u.AddHours(1).ToString('yyyy-MM-dd', $inv) }); Add-Check 'a date only' $false
Write-Result $r
'@; Verify = { param($r) Assert-Checks $r 14; & $fullQuiet $r } }

  # (f) a declaration that spans 25 h
  $cases['f-25-hours'] = @{ Body = @'
$s = [DateTime]::UtcNow.AddMinutes(-1)
Write-Decl (New-Decl @{ setAt = $s.ToString('o'); idleUntil = $s.AddHours(25).ToString('o') })
Write-Result (Measure-Call $std)
'@; Verify = $fullQuiet }

  # (g) another format
  $cases['g-other-format'] = @{ Body = @'
Write-Decl (New-Decl @{ format = 'dv3-idle-x' })
Write-Result (Measure-Call $std)
'@; Verify = $fullQuiet }

  # (h) the Sudoku lock in the wait. h1 is the case as specified (a valid declaration, the lock appears 1 s into the wait and goes 3 s
  # later); with a 2-s short quiet the poll at 3 s ends the loop before it looks, so h1 meets the lock at the collision check after
  # acquiring. h2 (no declaration), h3 (the lock there at the start) and h4 (the lock appears right after the last poll, and goes
  # when the helper releases its own lock) reach each other path of the rule deterministically.
  $cases['h-sudoku-lock'] = @{ Body = @'
$lockFile = Join-Path $env:TEMP 'dv3-sudoku.lock'
$seenFile = Join-Path $env:TEMP 'dv3-sudoku-seen.txt'
function Get-Seen { if (Test-Path -LiteralPath $seenFile) { (Get-Content -LiteralPath $seenFile -Raw).Trim() } else { $null } }
function Measure-Lock {
  param([bool]$Declared, [int]$CreateMs, [int]$RemoveMs)
  Reset-Files
  $d = New-Decl @{}
  if ($Declared) { Write-Decl $d }
  $createdAt = $null
  if ($CreateMs -eq 0) { [IO.File]::WriteAllText($lockFile, 'sudoku'); $createdAt = [DateTime]::UtcNow.ToString('o') }
  $job = Start-ThreadJob -ArgumentList $lockFile, $CreateMs, $RemoveMs -ScriptBlock {
    param($f, $create, $remove)
    if ($create -gt 0) { Start-Sleep -Milliseconds $create; [IO.File]::WriteAllText($f, 'sudoku') }
    Start-Sleep -Milliseconds ($remove - $create)
    Remove-Item -LiteralPath $f
    [DateTime]::UtcNow.ToString('o')
  }
  if ($CreateMs -gt 0) { $createdAt = [DateTime]::UtcNow.AddMilliseconds($CreateMs).ToString('o') }
  $r = Measure-Call $std
  $r['endAt'] = [DateTime]::UtcNow.ToString('o')
  $r['removedAt'] = Receive-Job $job -Wait -AutoRemoveJob
  $r['createdAt'] = $createdAt
  $r['setAt'] = $d['setAt']
  $r['seen'] = Get-Seen
  $r
}
$h1 = Measure-Lock $true 1000 4000
$h2 = Measure-Lock $false 1000 4000
$h3 = Measure-Lock $true 0 2000
Reset-Files
$d4 = New-Decl @{}
Write-Decl $d4
$script:sleeps = 0
$script:collided = $false
function Start-Sleep {
  [CmdletBinding()] param([int]$Seconds, [int]$Milliseconds)
  Microsoft.PowerShell.Utility\Start-Sleep @PSBoundParameters
  $script:sleeps++
  if ($script:sleeps -eq 1) { [IO.File]::WriteAllText($lockFile, 'sudoku') }
}
function Remove-Item {
  [CmdletBinding()] param([string]$LiteralPath)
  if ($LiteralPath -like '*dv3-timing.lock' -and (Test-Path -LiteralPath $lockFile)) {
    $script:collided = $true
    Microsoft.PowerShell.Management\Remove-Item -LiteralPath $lockFile
  }
  Microsoft.PowerShell.Management\Remove-Item @PSBoundParameters
}
$h4 = Measure-Call $std
$h4['sleeps'] = $script:sleeps
$h4['collided'] = $script:collided
$h4['setAt'] = $d4['setAt']
$h4['seen'] = Get-Seen
Write-Result ([ordered]@{ h1 = $h1; h2 = $h2; h3 = $h3; h4 = $h4 })
'@; Verify = { param($r)
      $notes = @()
      foreach ($name in 'h1', 'h2', 'h3') {
        $x = $r[$name]
        Assert-Call $x 6 6
        Assert ($null -ne $x.seen) "${name}: dv3-sudoku-seen.txt was not written"
        $seen = Get-Time $x.seen
        Assert ($seen -gt (Get-Time $x.setAt)) "${name}: the seen time is not after setAt"
        Assert ($seen -ge (Get-Time $x.createdAt).AddSeconds(-0.5) -and $seen -le (Get-Time $x.removedAt)) "${name}: the seen time is outside the life of the Sudoku lock"
        Assert ((Get-Time $x.endAt) -gt (Get-Time $x.removedAt)) "${name}: the call ended before the Sudoku lock was removed"
        $after = ((Get-Time $x.endAt) - $seen).TotalSeconds
        $notes += "$name $([math]::Round($x.seconds, 1)) s, $([math]::Round($after, 1)) s after the sight"
        if ($name -ne 'h3') {
          Assert ($after -ge 5.8) "${name}: the call ended $([math]::Round($after, 2)) s after the sight of the Sudoku lock: the quiet period did not restart"
          Assert ($x.seconds -ge 8.5) "${name}: the call took $([math]::Round($x.seconds, 2)) s, the wait did not restart after the sight"
        }
      }
      $x = $r.h4
      Assert-Call $x 6 8.5
      Assert ($x.collided -eq $true -and $x.sleeps -ge 2) 'h4: the Sudoku lock was not met at the collision check, the case would prove nothing'
      Assert ($null -ne $x.seen -and (Get-Time $x.seen) -gt (Get-Time $x.setAt)) 'h4: the collision check did not record the sight of the Sudoku lock'
      ($notes + "h4 $([math]::Round($x.seconds, 1)) s, collision check") -join '; ' } }

  # (i) the limits and the refusals
  $cases['i-limits'] = @{ Body = @'
$ok = Measure-Call @{ Repo = 'pentomino'; QuietSeconds = 6; LimitSeconds = 900 }
$over = Measure-Call @{ Repo = 'pentomino'; QuietSeconds = 6; LimitSeconds = 901 }
$sudoku = Measure-Call @{ Repo = 'sudoku'; QuietSeconds = 6; LimitSeconds = 301 }
$sudokuIdle = Measure-Call @{ Repo = 'sudoku'; QuietSeconds = 6; IdleQuietSeconds = 2 }
$tooLong = Measure-Call @{ Repo = 'pentomino'; QuietSeconds = 6; IdleQuietSeconds = 7 }
$negative = Measure-Call @{ Repo = 'pentomino'; QuietSeconds = 6; IdleQuietSeconds = -1 }
$locks = @('dv3-sudoku.lock', 'dv3-timing.lock') | Where-Object { Test-Path -LiteralPath (Join-Path $env:TEMP $_) }
Write-Result ([ordered]@{ ok = $ok; over = $over; sudoku = $sudoku; sudokuIdle = $sudokuIdle; tooLong = $tooLong; negative = $negative; locks = @($locks) })
'@; Verify = { param($r)
      Assert-Call $r.ok 6 6
      $refusals = @(
        @('over', 'a locked invocation is limited to 900 s'),
        @('sudoku', 'improve-generating runs are limited to 300 s'),
        @('sudokuIdle', '-IdleQuietSeconds is 0 to -QuietSeconds, for -Repo pentomino only'),
        @('tooLong', '-IdleQuietSeconds is 0 to -QuietSeconds, for -Repo pentomino only'),
        @('negative', '-IdleQuietSeconds is 0 to -QuietSeconds, for -Repo pentomino only'))
      foreach ($pair in $refusals) {
        $call = $r[$pair[0]]
        Assert ("$($call.error)".Contains($pair[1])) "$($pair[0]) did not throw '$($pair[1])': $($call.error)"
        Assert ($call.seconds -lt 2) "$($pair[0]) took $([math]::Round($call.seconds, 2)) s: the refusal must come before any wait"
      }
      Assert (@($r.locks).Count -eq 0) "a refused call left a lock file: $(@($r.locks) -join ', ')"
      'a 900-s limit runs; 901, sudoku 301, sudoku with an idle quiet, an idle quiet above the quiet and a negative one throw at once' } }

  # (j) the limit kills node and removes the lock
  $cases['j-kill-at-the-limit'] = @{ Body = @'
$marker = 'lock-check-j-' + [guid]::NewGuid().ToString('N')
$job = Start-ThreadJob -ArgumentList $marker -ScriptBlock {
  param($m)
  $deadline = [DateTime]::UtcNow.AddSeconds(40)
  while ([DateTime]::UtcNow -lt $deadline) {
    $hit = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.CommandLine -like "*$m*" } | Select-Object -First 1
    if ($hit) { return [int]$hit.ProcessId }
    Start-Sleep -Milliseconds 100
  }
  return 0
}
$r = Measure-Call @{ Repo = 'pentomino'; QuietSeconds = 6; LimitSeconds = 3 } @('-e', "setTimeout(() => {}, 10000) /* $marker */")
$nodePid = [int](Receive-Job $job -Wait -AutoRemoveJob)
Start-Sleep -Milliseconds 500
$r['nodePid'] = $nodePid
$r['alive'] = [bool]($nodePid -gt 0 -and (Get-Process -Id $nodePid -ErrorAction SilentlyContinue))
$r['leftover'] = @(Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.CommandLine -like "*$marker*" }).Count
$r['lockLeft'] = Test-Path -LiteralPath (Join-Path $env:TEMP 'dv3-timing.lock')
Write-Result $r
'@; Verify = { param($r)
      Assert ("$($r.error)".Contains('3-second limit reached')) "the call did not throw '3-second limit reached': $($r.error)"
      Assert ($r.nodePid -gt 0) 'the node process was never seen: the case would prove nothing'
      Assert ($r.alive -eq $false -and $r.leftover -eq 0) "the node process $($r.nodePid) is still running"
      Assert ($r.lockLeft -eq $false) 'dv3-timing.lock was left behind'
      Assert ($r.seconds -ge 8.5 -and $r.seconds -lt 20) "the call took $([math]::Round($r.seconds, 2)) s, expected the 6-s quiet period and the 3-s limit"
      "killed node $($r.nodePid) after the limit; seconds=$([math]::Round($r.seconds, 2))" } }

  # (k) a declaration valid at the start that expires one second into the wait
  $cases['k-expires-in-the-wait'] = @{ Body = @'
$u = [DateTime]::UtcNow
Write-Decl (New-Decl @{ setAt = $u.AddMinutes(-1).ToString('o'); idleUntil = $u.AddSeconds(1).ToString('o') })
$pre = Test-IgIdle
$r = Measure-Call $std
$r['pre'] = $pre
Write-Result $r
'@; Verify = { param($r) Assert ($r.pre -eq $true) 'the declaration was not valid at the start'; & $fullQuiet $r } }

  # (l) a valid declaration deleted one second into the wait
  $cases['l-deleted-in-the-wait'] = @{ Body = @'
Write-Decl (New-Decl @{})
$pre = Test-IgIdle
$file = Join-Path $env:TEMP 'dv3-idle.json'
$job = Start-ThreadJob -ArgumentList $file -ScriptBlock {
  param($f)
  Start-Sleep -Milliseconds 1000
  Remove-Item -LiteralPath $f
  [DateTime]::UtcNow.ToString('o')
}
$r = Measure-Call $std
$r['pre'] = $pre
$r['removedAt'] = Receive-Job $job -Wait -AutoRemoveJob
$r['gone'] = -not (Test-Path -LiteralPath $file)
Write-Result $r
'@; Verify = { param($r)
      Assert ($r.pre -eq $true) 'the declaration was not valid at the start'
      Assert ($r.gone -eq $true -and $r.removedAt) 'the declaration was not deleted during the wait'
      & $fullQuiet $r } }

  # (m) otherwise valid times written as MM/dd/yyyy HH:mm:ss
  $cases['m-not-iso-times'] = @{ Body = @'
$setAt = [DateTime]::Now.AddMinutes(-1).ToString('MM/dd/yyyy HH:mm:ss', $inv)
$until = [DateTime]::Now.AddHours(1).ToString('MM/dd/yyyy HH:mm:ss', $inv)
Write-Decl (New-Decl @{ setAt = $setAt; idleUntil = $until })
$parses = $true
try { [DateTimeOffset]::Parse($setAt, $inv) | Out-Null; [DateTimeOffset]::Parse($until, $inv) | Out-Null } catch { $parses = $false }
$r = Measure-Call $std
$r['parses'] = $parses
Write-Result $r
'@; Verify = { param($r) Assert ($r.parses -eq $true) 'the parser alone must accept these times, or the case proves nothing'; & $fullQuiet $r } }

  if ($HarnessCheck) {
    # A child that sleeps 20 s, with a grandchild node that sleeps 60 s, under a harness timeout of 5 s.
    $harnessBody = @'
$si = [Diagnostics.ProcessStartInfo]::new('node')
$si.UseShellExecute = $false
$si.ArgumentList.Add('-e')
$si.ArgumentList.Add('setTimeout(() => {}, 60000)')
[void][Diagnostics.Process]::Start($si)
Start-Sleep -Seconds 20
Write-Result ([ordered]@{})
'@
    Test-Case 'z-harness-timeout' $harnessBody { param($r) throw 'the harness child finished within its timeout: the timeout was never exercised' } 5000
  } else {
    foreach ($name in $cases.Keys) {
      Test-Case $name $cases[$name].Body $cases[$name].Verify
      if ($failedCase) { break }
    }
  }
} finally {
  if (-not $Keep -and -not $failedCase -and (Test-Path -LiteralPath $scratchRoot)) { Remove-Item -LiteralPath $scratchRoot -Recurse -Force -ErrorAction SilentlyContinue }
}

if ($HarnessCheck) {
  $problems = [System.Collections.Generic.List[string]]::new()
  if ($failedCase -ne 'z-harness-timeout' -or -not $failure.Data['reported'] -or $failure.Message -ne 'the child did not finish within 5 s') {
    $problems.Add('the case did not time out as designed')
  }
  if ($lastDiag) {
    if (-not ($lastDiag.Lines[0] -match '^last progress: \S+ prelude$')) { $problems.Add("the last progress marker is not 'prelude': $($lastDiag.Lines[0])") }
    if (-not ($lastDiag.Lines -match '^  progress\.txt \d+ bytes$')) { $problems.Add('progress.txt is not listed') }
    if (@($lastDiag.Pids).Count -lt 2) { $problems.Add('the process tree has no descendant of the child') }
    Start-Sleep -Milliseconds 500
    $left = @($lastDiag.Pids | Where-Object { Get-Process -Id $_ -ErrorAction SilentlyContinue })
    if ($left.Count -gt 0) { $problems.Add("processes of the tree are left: $($left -join ', ')") }
  } else {
    $problems.Add('no diagnostics were printed')
  }
  if ($problems.Count -gt 0) {
    Write-Host "lock-check: HARNESS CHECK BROKEN: $($problems -join '; ')"
    Write-Host "lock-check: scratch folder kept: $scratchRoot"
    exit 2
  }
  Write-Host "lock-check: harness check as designed: the FAIL line and its diagnostics were printed, no process of the tree ($(@($lastDiag.Pids) -join ', ')) is left"
  Write-Host "lock-check: scratch folder kept: $scratchRoot"
  exit 1
}

if ($failedCase) {
  Write-Host "lock-check: scratch folder kept: $scratchRoot"
  exit 1
}
Write-Host "lock-check: $passed cases ok"
exit 0
