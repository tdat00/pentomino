#Requires -Version 7
<#
.SYNOPSIS
  The chart image of the phase-1 bench of P6 (V4-T14): renders chart.html to chart.png with headless Edge, bounded to
  60 s, in a unique scratch profile, and cleans up only the processes whose ownership it verified.
.EXAMPLE
  pwsh -NoProfile -File tools\ig-proto\phase1\chart-png.ps1 -SelfTest
  pwsh -NoProfile -File tools\ig-proto\phase1\chart-png.ps1
.NOTES
  -SelfTest runs the synthetic cases of the two ownership functions (no process is started, stopped or awaited) and
  prints "chart-png self-test: <n> cases ok" (exit 0), else the failing case (exit 1).
  The real run writes docs\improve-generating\evidence\phase1\P6-bench\chart.png from chart.html (written by
  p6-bench.mjs compare). The executable name and the creation after the launch are preliminary filters, not proof of
  ownership: a PID can be reused, so a candidate is owned only when the process that holds its PID now has the
  candidate's start time (UTC, at CIM's microsecond precision), through a handle kept until the cleanup ends. Exit 1
  when Edge fails or times out, a verified process survives, ownership cannot be established, the profile folder cannot
  be removed or chart.png is missing or not larger than 10 KB.
#>
[CmdletBinding()]
param(
  [switch]$SelfTest,
  # The folder that holds chart.html and receives chart.png; the default is the evidence folder of the task.
  [string]$EvidenceDir = ''
)

$ErrorActionPreference = 'Stop'

# UTC ticks at CIM's microsecond precision (a tick is 100 ns): compared exactly, with no tolerance.
function ConvertTo-IgMicroTicks {
  param([Parameter(Mandatory)][DateTime]$Time)
  $ticks = [int64]$Time.ToUniversalTime().Ticks
  return [int64]($ticks - ($ticks % 10))
}

function Get-IgTicks {
  param([Parameter(Mandatory)][DateTime]$Time)
  return [int64]$Time.ToUniversalTime().Ticks
}

# The candidates, breadth first: msedge.exe children (and their descendants) of the recorded root, created at or after the
# launch and the parent's start, and not after the parent's exit when it has exited. A preliminary filter only.
function Select-IgOwned {
  param(
    [Parameter(Mandatory)][AllowEmptyCollection()][object[]]$Snapshot,
    [Parameter(Mandatory)]$Root,
    [Parameter(Mandatory)][DateTime]$Launch
  )
  $selected = [System.Collections.Generic.List[object]]::new()
  $queue = [System.Collections.Generic.Queue[object]]::new()
  $seen = [System.Collections.Generic.HashSet[int]]::new()
  [void]$seen.Add([int]$Root.Id)
  $queue.Enqueue([pscustomobject]@{ Id = [int]$Root.Id; StartTime = $Root.StartTime; ExitTime = $Root.ExitTime })
  $launchTicks = Get-IgTicks $Launch
  while ($queue.Count -gt 0) {
    $node = $queue.Dequeue()
    foreach ($record in $Snapshot) {
      if ([int]$record.ParentProcessId -ne $node.Id) { continue }
      if ($record.Name -ine 'msedge.exe') { continue }
      $created = Get-IgTicks $record.CreationDate
      if ($created -lt $launchTicks -or $created -lt (Get-IgTicks $node.StartTime)) { continue }
      if ($null -ne $node.ExitTime -and $created -gt (Get-IgTicks $node.ExitTime)) { continue }
      if (-not $seen.Add([int]$record.ProcessId)) { continue }
      $selected.Add($record)
      $queue.Enqueue([pscustomobject]@{ Id = [int]$record.ProcessId; StartTime = $record.CreationDate; ExitTime = $null })
    }
  }
  return $selected.ToArray()
}

# The candidates that are owned: the process that holds the PID now started when the candidate did. A PID that now
# belongs to another process is skipped (never stopped or awaited); a failing lookup fails the gate rather than guessing.
function Confirm-IgOwned {
  param(
    [Parameter(Mandatory)][AllowEmptyCollection()][object[]]$Candidates,
    [Parameter(Mandatory)][scriptblock]$Lookup
  )
  $owned = [System.Collections.Generic.List[object]]::new()
  foreach ($candidate in $Candidates) {
    $holder = $null
    try {
      $holder = & $Lookup ([int]$candidate.ProcessId)
      if ($null -eq $holder) { continue }
      $same = (ConvertTo-IgMicroTicks $holder.StartTime) -eq (ConvertTo-IgMicroTicks $candidate.CreationDate)
    } catch {
      throw "ownership cannot be established for $($candidate.ProcessId)"
    }
    if ($same) {
      $owned.Add([pscustomobject]@{ ProcessId = [int]$candidate.ProcessId; Record = $candidate; Process = $holder })
    }
  }
  return $owned.ToArray()
}

# Children first: the reverse of the breadth-first order, so a process is stopped before its parent.
function Get-IgStopOrder {
  param([Parameter(Mandatory)][AllowEmptyCollection()][object[]]$Owned)
  $order = @($Owned)
  [array]::Reverse($order)
  return $order
}

if ($SelfTest) {
  $t0 = [DateTime]::new(2026, 11, 18, 6, 0, 0, [DateTimeKind]::Utc)
  $launch = $t0
  $record = { param($id, $parent, $name, $created) [pscustomobject]@{ ProcessId = $id; ParentProcessId = $parent; Name = $name; CreationDate = $created } }
  $holds = { param($table) { param($id) $table[$id] }.GetNewClosure() }
  $cases = [ordered]@{}
  $cases['owned: the tree'] = {
    $root = [pscustomobject]@{ Id = 100; StartTime = $t0.AddSeconds(0.5); ExitTime = $null }
    $records = @(
      (& $record 103 101 'msedge.exe' $t0.AddSeconds(3)), (& $record 101 100 'msedge.exe' $t0.AddSeconds(1)),
      (& $record 102 100 'msedge.exe' $t0.AddSeconds(2)), (& $record 200 4 'msedge.exe' $t0.AddSeconds(2)))
    $candidates = @(Select-IgOwned -Snapshot $records -Root $root -Launch $launch)
    if (($candidates.ProcessId -join ',') -ne '101,102,103') { throw "selected $($candidates.ProcessId -join ',')" }
    $table = @{}
    foreach ($c in $candidates) { $table[[int]$c.ProcessId] = [pscustomobject]@{ Id = $c.ProcessId; StartTime = $c.CreationDate } }
    $owned = @(Confirm-IgOwned -Candidates $candidates -Lookup (& $holds $table))
    if ($owned.Count -ne 3) { throw "owned $($owned.Count) of 3" }
    $order = @((Get-IgStopOrder -Owned $owned).ProcessId)
    if ($order.IndexOf(103) -ge $order.IndexOf(101) -or ($order -join ',') -ne '103,102,101') { throw "stop order $($order -join ',')" }
  }
  $cases['owned: a child after its parent''s exit'] = {
    $root = [pscustomobject]@{ Id = 100; StartTime = $t0.AddSeconds(0.5); ExitTime = $t0.AddSeconds(10) }
    $records = @((& $record 101 100 'msedge.exe' $t0.AddSeconds(5)), (& $record 102 100 'msedge.exe' $t0.AddSeconds(20)))
    $candidates = @(Select-IgOwned -Snapshot $records -Root $root -Launch $launch)
    if (($candidates.ProcessId -join ',') -ne '101') { throw "selected $($candidates.ProcessId -join ',')" }
  }
  $cases['owned: other processes'] = {
    $root = [pscustomobject]@{ Id = 100; StartTime = $t0.AddSeconds(0.5); ExitTime = $null }
    $records = @((& $record 101 100 'notepad.exe' $t0.AddSeconds(2)), (& $record 102 100 'msedge.exe' $t0.AddSeconds(-5)),
      (& $record 103 100 'MSEDGE.EXE' $t0.AddSeconds(3)))
    $candidates = @(Select-IgOwned -Snapshot $records -Root $root -Launch $launch)
    if (($candidates.ProcessId -join ',') -ne '103') { throw "selected $($candidates.ProcessId -join ',')" }
  }
  $cases['owned: a reused PID'] = {
    $candidate = & $record 101 100 'msedge.exe' $t0.AddSeconds(1)
    $later = @{ 101 = [pscustomobject]@{ Id = 101; StartTime = $t0.AddSeconds(30) } }
    if (@(Confirm-IgOwned -Candidates @($candidate) -Lookup (& $holds $later)).Count -ne 0) { throw 'a process created at another time was owned' }
    $tick = @{ 101 = [pscustomobject]@{ Id = 101; StartTime = $candidate.CreationDate.AddTicks(5000) } }
    if (@(Confirm-IgOwned -Candidates @($candidate) -Lookup (& $holds $tick)).Count -ne 0) { throw 'a process created 0.5 ms later was owned' }
    $exact = @{ 101 = [pscustomobject]@{ Id = 101; StartTime = $candidate.CreationDate } }
    if (@(Confirm-IgOwned -Candidates @($candidate) -Lookup (& $holds $exact)).Count -ne 1) { throw 'the process with the same start time was not owned' }
  }
  $cases['owned: sub-microsecond ticks'] = {
    $base = $t0.AddSeconds(1)
    $candidate = & $record 101 100 'msedge.exe' $base.AddTicks(12)
    $same = @{ 101 = [pscustomobject]@{ Id = 101; StartTime = $base.AddTicks(17) } }
    if (@(Confirm-IgOwned -Candidates @($candidate) -Lookup (& $holds $same)).Count -ne 1) { throw 'ticks 12 and 17 are the same microsecond and were not owned' }
    $next = @{ 101 = [pscustomobject]@{ Id = 101; StartTime = $base.AddTicks(22) } }
    if (@(Confirm-IgOwned -Candidates @($candidate) -Lookup (& $holds $next)).Count -ne 0) { throw 'ticks 12 and 22 are different microseconds and were owned' }
  }
  $cases['owned: gone and unknown'] = {
    $candidate = & $record 101 100 'msedge.exe' $t0.AddSeconds(1)
    if (@(Confirm-IgOwned -Candidates @($candidate) -Lookup { param($id) $null }).Count -ne 0) { throw 'a process that is gone was owned' }
    $message = $null
    try { [void](Confirm-IgOwned -Candidates @($candidate) -Lookup { param($id) throw 'access denied' }) } catch { $message = $_.Exception.Message }
    if ($message -ne 'ownership cannot be established for 101') { throw "message: $message" }
  }
  foreach ($name in $cases.Keys) {
    try { & $cases[$name] } catch {
      Write-Host "FAIL ${name}: $($_.Exception.Message)"
      exit 1
    }
  }
  Write-Host "chart-png self-test: $($cases.Count) cases ok"
  exit 0
}

$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$evidence = if ($EvidenceDir -ne '') { (Resolve-Path -LiteralPath $EvidenceDir).Path } else { Join-Path $root 'docs\improve-generating\evidence\phase1\P6-bench' }
$html = Join-Path $evidence 'chart.html'
$png = Join-Path $evidence 'chart.png'
$edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
if (-not (Test-Path -LiteralPath $html)) { Write-Host 'chart-png: chart.html is missing; run p6-bench.mjs compare first'; exit 1 }
if (-not (Test-Path -LiteralPath $edge)) { Write-Host 'chart-png: Edge is not installed at its usual place'; exit 1 }

$profile = Join-Path $root "tests\artifacts\ig-proto\selftest\t14-edge-$([guid]::NewGuid())"
$problems = [System.Collections.Generic.List[string]]::new()
$handles = [System.Collections.Generic.List[object]]::new()
$verified = [System.Collections.Generic.List[object]]::new()
$verifiedIds = [System.Collections.Generic.HashSet[int]]::new()
$started = $null
$identity = $null
$launch = Get-Date

# The real lookup: the process that holds a PID now, through a handle kept until the cleanup ends (so the PID cannot be
# reused meanwhile); $null when no process holds it.
$lookup = {
  param($id)
  try { $holder = [Diagnostics.Process]::GetProcessById($id) } catch [ArgumentException] { return $null }
  $null = $holder.Handle
  $handles.Add($holder)
  return $holder
}

# One snapshot: the owned descendants not yet verified are verified now (a throw fails the gate rather than guessing).
function Update-IgVerified {
  $snapshot = @(Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId, Name, CreationDate)
  $rootIdentity = [pscustomobject]@{ Id = $identity.Id; StartTime = $identity.StartTime; ExitTime = $(if ($started.HasExited) { $started.ExitTime } else { $null }) }
  $fresh = @(Select-IgOwned -Snapshot $snapshot -Root $rootIdentity -Launch $launch | Where-Object { -not $verifiedIds.Contains([int]$_.ProcessId) })
  foreach ($entry in @(Confirm-IgOwned -Candidates $fresh -Lookup $lookup)) {
    [void]$verifiedIds.Add($entry.ProcessId)
    $verified.Add($entry)
  }
}

try {
  New-Item -ItemType Directory -Force -Path $profile | Out-Null
  $arguments = @('--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--disable-extensions',
    "--user-data-dir=$profile", '--window-size=1200,720', "--screenshot=$png", ('file:///' + ($html -replace '\\', '/')))
  $started = Start-Process -PassThru -FilePath $edge -ArgumentList $arguments
  $null = $started.Handle
  $identity = [pscustomobject]@{ Id = $started.Id; StartTime = $started.StartTime; ExitTime = $null }
  if (-not $started.WaitForExit(60000)) {
    $problems.Add('Edge did not finish within 60 s')
  } elseif ($started.ExitCode -ne 0) {
    $problems.Add("Edge exited with $($started.ExitCode)")
  } else {
    # This Edge's launcher exits at once while the browser it started (its child) takes the screenshot: wait, within the
    # same 60 s, until every verified descendant has exited by itself.
    Write-Host "chart-png: the launcher exited with 0 after $([math]::Round(((Get-Date) - $launch).TotalSeconds, 2)) s"
    while ($true) {
      Update-IgVerified
      if (@($verified | Where-Object { -not $_.Process.HasExited }).Count -eq 0) { break }
      if (((Get-Date) - $launch).TotalSeconds -ge 60) {
        $problems.Add('Edge did not finish within 60 s')
        break
      }
      Start-Sleep -Milliseconds 300
    }
    Write-Host "chart-png: Edge finished after $([math]::Round(((Get-Date) - $launch).TotalSeconds, 1)) s ($($verified.Count) descendants verified)"
  }
} catch {
  $problems.Add("Edge run: $($_.Exception.Message)")
} finally {
  if ($null -ne $started) {
    try { Update-IgVerified } catch { $problems.Add("cleanup: $($_.Exception.Message)") }
    try {
      $stopOrder = @(Get-IgStopOrder -Owned @($verified) | ForEach-Object { $_.Process }) + @($started)
      foreach ($process in $stopOrder) {
        if (-not $process.HasExited) {
          try { Stop-Process -Id $process.Id -Force } catch { }
        }
      }
      $deadline = [DateTime]::UtcNow.AddSeconds(15)
      foreach ($process in $stopOrder) {
        $left = [int][math]::Max(1, ($deadline - [DateTime]::UtcNow).TotalMilliseconds)
        [void]$process.WaitForExit($left)
      }
      foreach ($process in $stopOrder) {
        if (-not $process.HasExited) { $problems.Add("a verified process survived: $($process.Id)") }
      }
    } catch {
      $problems.Add("cleanup: $($_.Exception.Message)")
    } finally {
      foreach ($handle in $handles) { $handle.Dispose() }
      $started.Dispose()
    }
  }
  $removed = $false
  for ($try = 1; $try -le 5 -and -not $removed; $try++) {
    try {
      if (Test-Path -LiteralPath $profile) { Remove-Item -LiteralPath $profile -Recurse -Force }
      $removed = $true
    } catch {
      Start-Sleep -Seconds 1
    }
  }
  if (-not $removed) { $problems.Add('the scratch profile folder could not be removed') }
}

if ($problems.Count -eq 0) {
  $file = Get-Item -LiteralPath $png -ErrorAction SilentlyContinue
  if ($null -eq $file -or $file.LastWriteTime -lt $launch) {
    $problems.Add('chart.png was not written')
  } elseif ($file.Length -le 10240) {
    $problems.Add("chart.png is only $($file.Length) bytes")
  }
}
if ($problems.Count -gt 0) {
  foreach ($problem in $problems) { Write-Host "chart-png: FAIL: $problem" }
  exit 1
}
$header = [IO.File]::ReadAllBytes($png)[16..23]
$width = ($header[0] * 16777216) + ($header[1] * 65536) + ($header[2] * 256) + $header[3]
$height = ($header[4] * 16777216) + ($header[5] * 65536) + ($header[6] * 256) + $header[7]
Write-Host "chart-png: wrote chart.png ($((Get-Item -LiteralPath $png).Length) bytes, ${width}x${height}); no owned process and no profile folder left"
exit 0
