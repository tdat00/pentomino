# The locked wrapper of phase 2 (P2-13a): one invocation of a row group, an item or an overflow group, charged to the
# ledger whatever its outcome (check-list 3.5, contracts C7). There is no authorization parameter: the stage map is sealed.
# -State and -InvokerScript are for the self-tests only.
[CmdletBinding(DefaultParameterSetName = 'Rows')]
param(
  [Parameter(Mandatory, ParameterSetName = 'Rows')]
  [Parameter(Mandatory, ParameterSetName = 'Item')]
  [Parameter(Mandatory, ParameterSetName = 'Overflow')]
  [ValidateSet('A', 'B')][string]$Stage,
  [Parameter(Mandatory, ParameterSetName = 'Rows')][ValidateRange(1, 1000)][int]$Group,
  [Parameter(Mandatory, ParameterSetName = 'Item')][ValidateNotNullOrEmpty()][string]$Item,
  [Parameter(Mandatory, ParameterSetName = 'Item')][ValidateRange(1, 900)][int]$LimitSeconds,
  [Parameter(Mandatory, ParameterSetName = 'Item')][string[]]$NodeArgs,
  [Parameter(Mandatory, ParameterSetName = 'Overflow')][ValidateRange(1, 1000)][int]$OverflowGroup,
  [string]$State,
  [string]$InvokerScript
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
Set-Location -LiteralPath $root
[Environment]::CurrentDirectory = $root
$quiet = 45
$kind = $PSCmdlet.ParameterSetName
if ($kind -eq 'Overflow' -and $Stage -ne 'B') { throw 'STOP: an overflow group belongs to stage B' }
$limit = if ($kind -eq 'Item') { $LimitSeconds } else { 900 }

# Runs p2.mjs and returns its exit code and its output text.
function Invoke-P2 {
  param([string[]]$P2Args)
  $all = @('tools\ig-proto\phase2\p2.mjs') + $P2Args
  if ($State) { $all += @('--state', $State) }
  $out = & node @all
  [pscustomobject]@{ Code = $LASTEXITCODE; Text = (@($out | ForEach-Object { "$_" }) -join "`n") }
}

if (-not $State) {
  $r = Invoke-P2 -P2Args @('seal', '--check')
  if ($r.Code -ne 0) { throw "STOP: seal drift $($r.Text)" }
}
$r = Invoke-P2 -P2Args @('ledger', '--check', '--stage', $Stage, '--limit', "$limit")
if ($r.Code -ne 0) { throw "STOP: ledger refused $($r.Text)" }
$which = switch ($kind) {
  'Rows' { @('--group', "$Group") }
  'Item' { @('--item', $Item) }
  'Overflow' { @('--overflow-group', "$OverflowGroup") }
}
$r = Invoke-P2 -P2Args (@('reserve', '--stage', $Stage) + $which + @('--limit', "$limit"))
if ($r.Code -ne 0) { throw "STOP: reservation refused $($r.Text)" }
$id = $r.Text.Trim()

$nodeArgs = if ($kind -eq 'Item') { @($NodeArgs) } else {
  @('tools\ig-proto\phase2\p2.mjs', 'run-group', '--stage', $Stage) + $(if ($kind -eq 'Rows') { @('--group', "$Group") } else { @('--overflow-group', "$OverflowGroup") }) + @('--invocation', $id)
}
if ($State -and $kind -ne 'Item') { $nodeArgs += @('--state', $State) }
if (-not $InvokerScript) { . (Join-Path $root 'tools\ig-proto\lock\ig-lock.ps1') }

$err = $null
$info = $null
$stamp = 'yyyy-MM-ddTHH:mm:ss.fffzzz'
$start = [DateTimeOffset]::Now
try {
  if ($InvokerScript) {
    & $InvokerScript -Task "P2 $id" -LimitSeconds $limit -NodeArgs $nodeArgs -InformationVariable info
  } else {
    Invoke-IgNode -Repo pentomino -Task "P2 $id" -LimitSeconds $limit -QuietSeconds $quiet -NodeArgs $nodeArgs -InformationVariable info
  }
} catch {
  $err = $_
} finally {
  $end = [DateTimeOffset]::Now
  $ig = $null
  foreach ($text in @($info | ForEach-Object { "$_" })) {
    if ($text -match '^IG .* exit=(-?\d+) seconds=([0-9.]+) quiet=(\d+)$') { $ig = @($Matches[1], $Matches[2]) }
  }
  $nodeSeconds = 0.0
  $exitCode = 0
  $killed = $false
  $cause = 'ok'
  if ($ig) {
    $exitCode = [int]$ig[0]
    $nodeSeconds = [double]::Parse($ig[1], [cultureinfo]::InvariantCulture)
    if ($exitCode -ne 0) { $cause = 'exit' }
  } elseif ($err -and $err.Exception.Message -match '^(\d+)-second limit reached') {
    $nodeSeconds = [double]$limit
    $exitCode = -1
    $killed = $true
    $cause = 'timeout'
  } else {
    $why = if ($err) { $err.Exception.Message } else { 'no IG line' }
    Write-Host "STOP: accounting: $why"
    throw "STOP: accounting: $why"
  }
  $line = [ordered]@{ id = $id; stage = $Stage }
  if ($kind -eq 'Item') { $line.item = $Item } elseif ($kind -eq 'Rows') { $line.group = $Group } else { $line.group = "o$OverflowGroup" }
  $line.start = $start.ToString($stamp)
  $line.end = $end.ToString($stamp)
  $line.nodeSeconds = $nodeSeconds
  $line.quietS = $quiet
  $line.countedSeconds = $nodeSeconds + $quiet
  $line.limitS = $limit
  $line.killed = $killed
  $line.exit = $exitCode
  $line.rowsWritten = 0
  $line.cause = $cause
  $r = Invoke-P2 -P2Args @('ledger', '--append', '--json', ($line | ConvertTo-Json -Compress))
  if ($r.Code -ne 0) { throw "STOP: ledger append failed: $($r.Text)" }
  $r = Invoke-P2 -P2Args @('release', '--id', $id)
  if ($r.Code -ne 0) { throw "STOP: ledger release failed: $($r.Text)" }
}

if ($err) {
  if ($kind -ne 'Item' -and $exitCode -eq 7) {
    Write-Host "RG: $id deferred keys remain; run the same group again"
    exit 7
  }
  throw $err
}
Write-Host "RG: $id ok"
exit 0
