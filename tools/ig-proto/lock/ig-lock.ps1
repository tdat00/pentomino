# Low-priority timing wrapper for improve-generating prototypes.
# difficulty-v3 has priority: a run starts only after BOTH difficulty-v3 locks have been free
# continuously for $QuietSeconds (difficulty-v3 sequences use 15 s gaps, so they are never interrupted),
# holds the repository's lock, and is killed at $LimitSeconds (default 300 s) so difficulty-v3 waits little.
# Pentomino copy of the shared helper C:\Users\ledat\.copilot\session-state\c2f29688-8568-4f25-bace-e644d381e5f9\files\ig-lock.ps1,
# with the owner's rules of 2026-11-17 21:33 for -Repo pentomino only: a limit up to 900 s and -IdleQuietSeconds
# (the short quiet while the owner's idle declaration holds, check-list 3.2); lock files, defaults and priority are the shared helper's.
# True only while the owner's idle declaration holds (ISO 8601 times only); every other case, an exception included, is false.
function Test-IgIdle {
  try {
    $idleFile = Join-Path $env:TEMP 'dv3-idle.json'
    $seenFile = Join-Path $env:TEMP 'dv3-sudoku-seen.txt'
    $iso = '\A\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,7})?(?:Z|[+-]\d{2}:\d{2})\z'
    if (-not (Test-Path -LiteralPath $idleFile -PathType Leaf)) { return $false }
    $declaration = Get-Content -LiteralPath $idleFile -Raw | ConvertFrom-Json -AsHashtable -DateKind String
    if ($declaration -isnot [System.Collections.IDictionary]) { return $false }
    $version = $declaration['version']
    if ($declaration['format'] -isnot [string] -or $declaration['format'] -cne 'dv3-idle') { return $false }
    if (($version -isnot [int] -and $version -isnot [long] -and $version -isnot [double] -and $version -isnot [decimal]) -or $version -ne 1) { return $false }
    foreach ($key in 'setAt', 'idleUntil') {
      if ($declaration[$key] -isnot [string] -or $declaration[$key] -cnotmatch $iso) { return $false }
    }
    $setAt = [DateTimeOffset]::Parse($declaration['setAt'], [cultureinfo]::InvariantCulture)
    $idleUntil = [DateTimeOffset]::Parse($declaration['idleUntil'], [cultureinfo]::InvariantCulture)
    $now = [DateTimeOffset]::UtcNow
    if ($setAt -gt $now -or $now -ge $idleUntil -or ($idleUntil - $setAt) -gt [TimeSpan]::FromHours(24)) { return $false }
    if (Test-Path -LiteralPath $seenFile) {
      $seen = Get-Content -LiteralPath $seenFile -Raw
      if ($seen -isnot [string]) { return $false }
      $seen = $seen.Trim()
      if ($seen -cnotmatch $iso -or [DateTimeOffset]::Parse($seen, [cultureinfo]::InvariantCulture) -ge $setAt) { return $false }
    }
    return $true
  } catch {
    return $false
  }
}

function Invoke-IgNode {
  param(
    [Parameter(Mandatory)][ValidateSet('sudoku', 'pentomino')][string]$Repo,
    [Parameter(Mandatory)][string]$Task,
    [Parameter(Mandatory)][string[]]$NodeArgs,
    [int]$LimitSeconds = 300,
    [int]$QuietSeconds = 45,
    [int]$IdleQuietSeconds = 0,
    [int]$WaitHours = 6,
    [switch]$AllowExit1
  )
  if ($LimitSeconds -gt 900) { throw 'a locked invocation is limited to 900 s (owner, 2026-11-17)' }
  if ($LimitSeconds -gt 300 -and $Repo -ne 'pentomino') { throw 'improve-generating runs are limited to 300 s; shard the work' }
  if ($IdleQuietSeconds -lt 0 -or $IdleQuietSeconds -gt $QuietSeconds -or ($IdleQuietSeconds -gt 0 -and $Repo -ne 'pentomino')) { throw '-IdleQuietSeconds is 0 to -QuietSeconds, for -Repo pentomino only' }
  $sudokuLock = Join-Path $env:TEMP 'dv3-sudoku.lock'
  $pentominoLock = Join-Path $env:TEMP 'dv3-timing.lock'
  $mine = if ($Repo -eq 'sudoku') { $sudokuLock } else { $pentominoLock }
  $until = (Get-Date).AddHours($WaitHours)
  $lock = $null
  $p = $null
  $forceFullQuiet = $false
  $quiet = $QuietSeconds
  $markSeen = {
    $text = [DateTime]::UtcNow.ToString('o')
    for ($try = 1; $try -le 5; $try++) {
      try { [IO.File]::WriteAllText((Join-Path $env:TEMP 'dv3-sudoku-seen.txt'), $text); return } catch { Start-Sleep -Milliseconds 200 }
    }
    throw 'cannot record the sight of dv3-sudoku.lock; report to the orchestrator'
  }
  while (-not $lock) {
    $quiet = if ($IdleQuietSeconds -gt 0 -and -not $forceFullQuiet -and (Test-IgIdle)) { $IdleQuietSeconds } else { $QuietSeconds }
    $quietSince = Get-Date
    while ($true) {
      if ($quiet -lt $QuietSeconds -and -not (Test-IgIdle)) { $forceFullQuiet = $true; $quiet = $QuietSeconds }
      if (((Get-Date) - $quietSince).TotalSeconds -ge $quiet) { break }
      if ((Get-Date) -ge $until) { throw "No quiet timing slot within $WaitHours h; report to the orchestrator" }
      if (Test-Path $sudokuLock) {
        & $markSeen
        $forceFullQuiet = $true
        $quiet = $QuietSeconds
        $quietSince = Get-Date
      } elseif (Test-Path $pentominoLock) { $quietSince = Get-Date }
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
      if ($other -eq $sudokuLock) { & $markSeen; $forceFullQuiet = $true }
    } elseif ($quiet -lt $QuietSeconds -and -not (Test-IgIdle)) {
      $forceFullQuiet = $true
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
    Write-Host "IG $Task exit=$($p.ExitCode) seconds=$([math]::Round(((Get-Date)-$start).TotalSeconds,3)) quiet=$quiet"
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
