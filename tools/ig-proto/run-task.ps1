#Requires -Version 7
<#
.SYNOPSIS
  Run-plan runner of the ig-proto harness (check-list section 7): runs the steps of a plan, every locked step through
  Invoke-IgNode of the low-priority lock helper, with a horizon from the budget guard and an accounting line per
  invocation. No git.
.EXAMPLE
  pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\IGP-00.json -Label provisional `
    -SourceLabel 'rating-v3 runtime cd5d17f (worktree 0e1283e)' -LockHelper <path of ig-lock.ps1>
.NOTES
  Exit codes: 0 plan finished; 1 an error, a failed step or an exception of the lock helper (never retried);
  4 a stop: the horizon is below the step's smallest unit of work, an invocation made no progress, or a step did not
  complete.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory)][string]$Plan,
  [Parameter(Mandatory)][ValidateSet('provisional', 'frozen')][string]$Label,
  [Parameter(Mandatory)][string]$SourceLabel,
  [string]$LockHelper,
  [string[]]$Only = @(),
  [switch]$IncludeOptional,
  [int]$ApprovedRoundMinutes = 0,
  [int]$ApprovedTaskMinutes = 0,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$planPath = (Resolve-Path -LiteralPath $Plan).Path
$lockPath = $null
if (-not $DryRun) {
  if (-not $LockHelper) { throw '-LockHelper is required unless -DryRun is given' }
  $lockPath = (Resolve-Path -LiteralPath $LockHelper).Path
}
Set-Location (Join-Path $PSScriptRoot '..\..')
if ($lockPath) { . $lockPath }

$Only = @($Only | ForEach-Object { $_ -split ',' } | Where-Object { $_ })
$planObj = Get-Content -LiteralPath $planPath -Raw | ConvertFrom-Json -AsHashtable
$task = $planObj.task
$invariant = [cultureinfo]::InvariantCulture
$allocation = [double]$planObj.allocationMinutes
if ($IncludeOptional -and $planObj.optionalMinutes) { $allocation += [double]$planObj.optionalMinutes }
$artifacts = Join-Path 'tests\artifacts\ig-proto' $Label
$invocationLog = Join-Path (Join-Path (Get-Location).Path (Join-Path $artifacts $task)) 'invocations.jsonl'
$utf8 = [Text.UTF8Encoding]::new($false)

function Get-Decision($step, [double]$forecastS) {
  $a = @(
    'tools\ig-proto\lib\budget.mjs', 'decide', '--task', $task, '--label', $Label,
    '--allocation-min', $allocation.ToString($invariant), '--min-horizon-s', ([double]$step.minHorizonS).ToString($invariant),
    '--approved-round-min', "$ApprovedRoundMinutes", '--approved-task-min', "$ApprovedTaskMinutes",
    '--forecast-s', $forecastS.ToString($invariant)
  )
  $out = & node @a
  if ($LASTEXITCODE -ne 0) { throw "the budget decision failed (exit $LASTEXITCODE)" }
  return ($out | Select-Object -Last 1 | ConvertFrom-Json)
}

function Read-State($step) {
  $path = Join-Path $artifacts $step.state
  if (Test-Path -LiteralPath $path) { return (Get-Content -LiteralPath $path -Raw | ConvertFrom-Json) }
  return $null
}

function Get-Totals {
  $round = 0.0
  $mine = 0.0
  $files = Get-ChildItem -Path $artifacts -Filter invocations.jsonl -Recurse -ErrorAction SilentlyContinue
  foreach ($file in $files) {
    foreach ($line in (Get-Content -LiteralPath $file.FullName)) {
      if ($line.Trim() -eq '') { continue }
      $row = $line | ConvertFrom-Json
      $round += [double]$row.countedSeconds
      if ($row.task -eq $task) { $mine += [double]$row.countedSeconds }
    }
  }
  return [pscustomobject]@{ Task = $mine; Round = $round }
}

$selected = @($planObj.steps | Where-Object {
    ($Only.Count -eq 0 -or $Only -contains $_.id) -and ($IncludeOptional -or -not $_.optional)
  })
$forecast = 0.0

foreach ($step in $selected) {
  $nodeArgs = @($step.node) + @('--label', $Label, '--source-label', $SourceLabel)

  if (-not $step.locked) {
    if ($DryRun) { Write-Host "[dry run] $($step.id): unlocked"; continue }
    Write-Host "== $($step.id) (unlocked)"
    & node @nodeArgs
    if ($LASTEXITCODE -ne 0) { Write-Host "STOP: step $($step.id) exited with $LASTEXITCODE"; exit 1 }
    continue
  }

  if ($DryRun) {
    $decision = Get-Decision $step $forecast
    $invocations = if ($step.invocations) { [int]$step.invocations } else { 1 }
    Write-Host ("[dry run] {0}: {1}, horizon {2} s, allowance {3} s, forecast so far {4} s" -f $step.id, $decision.decision, $decision.horizonS, [math]::Round($decision.allowanceS), [math]::Round($forecast))
    if ($decision.decision -ne 'go') { Write-Host "          $($decision.reason)" }
    $forecast += [double]$step.projectS + 45 * $invocations
    continue
  }

  do {
    $decision = Get-Decision $step 0
    if ($decision.decision -ne 'go') { Write-Host "STOP (budget): $($decision.reason)"; exit 4 }
    $horizon = [int]$decision.horizonS
    $before = Read-State $step
    $beforeStart = if ($before) { $before.lastInvocation.start } else { $null }
    Write-Host "== $($step.id) (locked, horizon $horizon s)"
    $start = Get-Date
    $failed = $false
    $killed = $false
    $problem = ''
    $helperInfo = $null
    $global:LASTEXITCODE = 0
    try {
      Invoke-IgNode -Repo pentomino -Task "$task $($step.id)" -NodeArgs (@('--max-old-space-size=2048') + $nodeArgs + @('--horizon-s', "$horizon")) -LimitSeconds 900 -IdleQuietSeconds 15 -InformationVariable helperInfo
    } catch {
      $failed = $true
      $problem = $_.Exception.Message
      $killed = $problem -match 'second limit reached'
    }
    $exitCode = if ($killed) { $null } else { $global:LASTEXITCODE }
    $end = Get-Date
    $wall = ($end - $start).TotalSeconds
    $state = Read-State $step
    $fresh = ($null -ne $state) -and ($state.lastInvocation.start -ne $beforeStart)
    # Node seconds: 900 when killed, else the step's state file, else what the lock helper printed ("IG <task>
    # exit=<n> seconds=<s> quiet=<q>"), else 0 (node never started). Never the wall time: the priority wait is not charged.
    $printed = $null
    $quietS = $null
    foreach ($record in @($helperInfo)) {
      if ("$record" -match 'exit=-?\d+ seconds=(?<s>[0-9.]+)') { $printed = [double]::Parse($Matches['s'], $invariant) }
      if ("$record" -match 'quiet=(?<q>\d+)') { $quietS = [int]$Matches['q'] }
    }
    $node = if ($killed) { 900.0 } elseif ($fresh) { [double]$state.lastInvocation.seconds } elseif ($null -ne $printed) { $printed } else { 0.0 }
    $lockWait = [math]::Max(0.0, $wall - $node)
    $counted = $node + [math]::Min($lockWait, 45.0)
    $row = [ordered]@{
      task = $task; step = $step.id; start = $start.ToUniversalTime().ToString('o'); end = $end.ToUniversalTime().ToString('o')
      wallSeconds = [math]::Round($wall, 3); nodeSeconds = [math]::Round($node, 3); lockWaitSeconds = [math]::Round($lockWait, 3)
      quietS = $quietS; countedSeconds = [math]::Round($counted, 3); horizonS = $horizon; killed = $killed; exit = $exitCode
      done = if ($fresh) { [bool]$state.done } else { $false }; budget = $decision
    }
    New-Item -ItemType Directory -Force -Path (Split-Path $invocationLog) | Out-Null
    [IO.File]::AppendAllText($invocationLog, (($row | ConvertTo-Json -Compress -Depth 6) + "`n"), $utf8)
    $totals = Get-Totals
    Write-Host ("   wall {0:N1} s, node {1:N1} s, lock wait {2:N1} s, counted {3:N1} s; task total {4:N0} s of {5:N0}, round total {6:N0} s" -f $wall, $node, $lockWait, $counted, $totals.Task, (1.25 * $allocation * 60), $totals.Round)
    if ($failed) { Write-Host "STOP: $problem"; exit 1 }
    if (-not $fresh) { Write-Host "STOP: the invocation exited 0 but wrote no state ($($step.state))"; exit 1 }
    $progress = 0.0
    foreach ($property in $state.lastInvocation.progress.PSObject.Properties) { $progress += [double]$property.Value }
    if ($progress -eq 0) { Write-Host "STOP: the invocation recorded no progress (exit 4)"; exit 4 }
  } while ($step.repeatUntilDone -and -not $state.done)

  if (-not $state.done) { Write-Host "STOP: step $($step.id) did not complete"; exit 4 }
}

if ($DryRun) {
  Write-Host ("[dry run] forecast of the plan: {0:N0} s counted (allocation {1:N0} s, guard {2:N0} s)" -f $forecast, ($allocation * 60), (1.25 * $allocation * 60))
} else {
  $totals = Get-Totals
  Write-Host ("Plan {0} finished: task counted {1:N0} s, round counted {2:N0} s" -f $task, $totals.Task, $totals.Round)
}
exit 0
