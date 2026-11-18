#Requires -Version 7
<#
.SYNOPSIS
  One locked invocation of the phase-1 bench of P6 (V4-T14): the production bench `tools/calibrate.mjs --profile
  landscape` of a detached worktree (the old version 3fc65f4 or the commit under test) on the cells of one group, through
  the lock helper, behind a reservation, with a line in the ledger of the owner's separate allowance of 45 counted minutes.
.EXAMPLE
  pwsh -NoProfile -File tools\ig-proto\phase1\p6-bench.ps1 -Group A -Side old -NewCommit <the full commit> -DryRun
  pwsh -NoProfile -File tools\ig-proto\phase1\p6-bench.ps1 -Group A -Side old -NewCommit <the full commit>
.NOTES
  Exit codes: 0 the bench recorded every row (or the group was already complete); 2 it ended incomplete; 3 it was killed
  at its limit; 1 a worktree check, a lock-helper load, an unreadable or missing terminal report or a failure; 4 the
  allowance; 5 an accounting stop (the reservation pending.json stays) or an existing reservation; 6 a second timeout;
  8 a source, checkpoint or ledger mismatch; 9 an incomplete group (a resume needs the pack author's instruction,
  then -ResumeInstructed). The decisions 4 to 9 are those of `p6-bench.mjs preflight`.
  The two git calls read HEAD and the status of a worktree (read-only), as the task specifies.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory)][ValidateSet('A', 'B')][string]$Group,
  [Parameter(Mandatory)][ValidateSet('old', 'new')][string]$Side,
  [Parameter(Mandatory)][ValidatePattern('^[0-9a-f]{40}$')][string]$NewCommit,
  [switch]$ResumeInstructed,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
Set-Location $root
$invariant = [cultureinfo]::InvariantCulture
$oldCommit = '3fc65f4681a53d3984d9218c15efbf696cc3a1a5'
$cells = @{
  A = @('14x14-master', '26x26-master', '26x26-expert', '26x26-nightmare', '10x10-nightmare')
  B = @('12x12-nightmare', '18x18-nightmare')
}
# The worktrees sit beside the repository, prepared by the orchestrator (T14 step 0).
$parent = Split-Path $root -Parent
$worktree = Join-Path $parent $(if ($Side -eq 'old') { 'pentomino-t14-old' } else { 'pentomino-t14-new' })
$expected = if ($Side -eq 'old') { $oldCommit } else { $NewCommit }
$raw = Join-Path $root 'tests\artifacts\ig-proto\phase1\P6-bench'
$label = "V4-T14 $Group $Side"

$head = @(& git -C $worktree rev-parse HEAD)
if ($LASTEXITCODE -ne 0 -or $head.Count -ne 1 -or $head[0].Trim() -ne $expected) {
  Write-Host "${label}: the worktree is not at $expected"
  exit 1
}
$status = @(& git -C $worktree status --short)
if ($LASTEXITCODE -ne 0 -or $status.Count -gt 0) {
  Write-Host "${label}: the worktree is not clean"
  exit 1
}
if (-not (Test-Path -LiteralPath (Join-Path $worktree 'tools\calibrate.mjs'))) {
  Write-Host "${label}: the worktree has no tools\calibrate.mjs"
  exit 1
}
Write-Host "${label}: worktree $(Split-Path $worktree -Leaf) at $expected, clean"

$preflightArgs = @('tools\ig-proto\phase1\p6-bench.mjs', 'preflight', '--group', $Group, '--side', $Side, '--new-commit', $NewCommit)
if ($ResumeInstructed) { $preflightArgs += '--resume-instructed' }
$decision = @(& node @preflightArgs)
$preflightExit = $LASTEXITCODE
$decision | ForEach-Object { Write-Host "$_" }
if ($preflightExit -eq 7) { exit 0 }
if ($preflightExit -ne 0) { exit $preflightExit }
if (("$($decision -join "`n")") -notmatch 'with a limit of (?<limit>\d+) s') {
  Write-Host "${label}: the preflight printed no limit"
  exit 1
}
$limit = [int]$Matches['limit']

$cases = '^(' + ($cells[$Group] -join '|') + ')$'
$output = Join-Path $raw (Join-Path $Side $Group)
$nodeArgs = @('--max-old-space-size=2048', (Join-Path $worktree 'tools\calibrate.mjs'), '--profile', 'landscape', '--workers', '4',
  '--seeds', '5', '--cases', $cases, '--fresh-process', '--output', $output)

if ($DryRun) {
  Write-Host "${label}: [dry run] limit $limit s, quiet 45 s unless the owner's idle declaration holds"
  Write-Host "${label}: [dry run] node $($nodeArgs -join ' ')"
  exit 0
}

try {
  . (Join-Path $PSScriptRoot '..\lock\ig-lock.ps1')
} catch {
  Write-Host "${label}: the lock helper cannot be loaded: $($_.Exception.Message)"
  exit 1
}

New-Item -ItemType Directory -Force -Path $raw | Out-Null
$pendingPath = Join-Path $raw 'pending.json'
$ledgerPath = Join-Path $raw 'ledger.jsonl'
$utf8 = [Text.UTF8Encoding]::new($false)
$id = [guid]::NewGuid().ToString()
$reservation = [ordered]@{
  id = $id; task = 'V4-T14'; group = $Group; side = $Side; commit = $expected; limitS = $limit; reservedS = $limit + 45
  createdAt = [DateTime]::UtcNow.ToString('o')
}
try {
  $stream = [IO.File]::Open($pendingPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
} catch {
  Write-Host "${label}: STOP (accounting): pending.json exists or cannot be created: $($_.Exception.Message)"
  exit 5
}
try {
  $bytes = $utf8.GetBytes((($reservation | ConvertTo-Json -Compress) + "`n"))
  $stream.Write($bytes, 0, $bytes.Length)
  $stream.Flush()
} finally {
  $stream.Dispose()
}

$global:LASTEXITCODE = 0
$start = Get-Date
$failed = $false
$killed = $false
$problem = ''
$helperInfo = $null
try {
  Invoke-IgNode -Repo pentomino -Task $label -NodeArgs $nodeArgs -LimitSeconds $limit -IdleQuietSeconds 15 -InformationVariable helperInfo
} catch {
  $failed = $true
  $problem = $_.Exception.Message
  $killed = $problem -match 'second limit reached'
}
$end = Get-Date

# Duration evidence: the helper's "IG <task> exit=<e> seconds=<s> quiet=<q>" line, printed before it throws on a non-zero
# exit. A timeout has no such line (node seconds = the limit); without evidence nothing is substituted.
$printedExit = $null
$printedSeconds = $null
$quietS = $null
foreach ($record in @($helperInfo)) {
  if ("$record" -match 'exit=(?<e>-?\d+) seconds=(?<s>[0-9.]+)') {
    $printedExit = [int]$Matches['e']
    $printedSeconds = [double]::Parse($Matches['s'], $invariant)
  }
  if ("$record" -match 'quiet=(?<q>\d+)') { $quietS = [int]$Matches['q'] }
}
if ($killed) {
  $node = [double]$limit
  $exitCode = $null
} elseif ($null -ne $printedSeconds) {
  $node = $printedSeconds
  $exitCode = $printedExit
} else {
  Write-Host "${label}: STOP (accounting): $problem; pending.json kept"
  exit 5
}
$helperFault = $failed -and -not $killed -and $exitCode -eq 0
$wall = ($end - $start).TotalSeconds
$lockWait = [math]::Max(0.0, $wall - $node)
$counted = $node + [math]::Min($lockWait, 45.0)

$reportPath = $null
$reportSha = $null
if (-not $killed -and $exitCode -eq 0) {
  $startUtc = $start.ToUniversalTime()
  $found = @(Get-ChildItem -LiteralPath (Join-Path $raw $Side) -Filter "$Group-*.json" -File -ErrorAction SilentlyContinue |
      Where-Object { $_.LastWriteTimeUtc -ge $startUtc })
  if ($found.Count -ne 1) {
    Write-Host "${label}: STOP: the bench exited 0 but $($found.Count) terminal reports were written since the start; pending.json kept"
    exit 1
  }
  $reportPath = ([IO.Path]::GetRelativePath($root, $found[0].FullName)) -replace '\\', '/'
  $reportSha = (Get-FileHash -LiteralPath $found[0].FullName -Algorithm SHA256).Hash.ToLowerInvariant()
}

$row = [ordered]@{
  id = $id; task = 'V4-T14'; group = $Group; side = $Side; commit = $expected; limitS = $limit
  start = $start.ToUniversalTime().ToString('o'); end = $end.ToUniversalTime().ToString('o')
  wallSeconds = [math]::Round($wall, 3); nodeSeconds = [math]::Round($node, 3); lockWaitSeconds = [math]::Round($lockWait, 3)
  quietS = $quietS; countedSeconds = [math]::Round($counted, 3); killed = $killed; exit = $exitCode
  report = $reportPath; reportSha256 = $reportSha
}
[IO.File]::AppendAllText($ledgerPath, (($row | ConvertTo-Json -Compress) + "`n"), $utf8)
Remove-Item -LiteralPath $pendingPath

$total = 0.0
foreach ($line in (Get-Content -LiteralPath $ledgerPath)) {
  if ($line.Trim() -ne '') { $total += [double](($line | ConvertFrom-Json).countedSeconds) }
}
$shownExit = if ($null -eq $exitCode) { 'killed' } else { "$exitCode" }
Write-Host ("${label}: exit {0}, counted {1} s; ledger {2} s of 2700" -f $shownExit, [math]::Round($counted, 3), [math]::Round($total, 3))
if ($helperFault) {
  Write-Host "${label}: STOP: the lock helper threw after a successful bench run: $problem"
  exit 1
}
if ($killed) { exit 3 }
if ($exitCode -eq 0) { exit 0 }
if ($exitCode -eq 2) { exit 2 }
exit 1
