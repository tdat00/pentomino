# A stand-in for Invoke-IgNode (P2-13a self-tests): it never runs Node. It writes the marker file $env:P2_FAKE_MARKER
# and acts by $env:P2_FAKE_MODE: ok, exit1, deferred, timeout or noslot.
[CmdletBinding()]
param(
  [Parameter(Mandatory)][string]$Task,
  [int]$LimitSeconds = 300,
  [Parameter(Mandatory)][string[]]$NodeArgs
)

$ErrorActionPreference = 'Stop'
if ($env:P2_FAKE_MARKER) { [IO.File]::WriteAllText($env:P2_FAKE_MARKER, ($NodeArgs -join ' ')) }
switch ($env:P2_FAKE_MODE) {
  'ok' { Write-Host "IG $Task exit=0 seconds=12.5 quiet=45" }
  'exit1' {
    Write-Host "IG $Task exit=1 seconds=12.5 quiet=45"
    throw "IG $Task command failed: 1"
  }
  'deferred' {
    Write-Host "IG $Task exit=7 seconds=12.5 quiet=45"
    throw "IG $Task command failed: 7"
  }
  'timeout' { throw "$LimitSeconds-second limit reached; record the timeout and shard the work" }
  'noslot' { throw 'No quiet timing slot within 6 h; report to the orchestrator' }
  default { throw "fake-invoker: unknown mode '$env:P2_FAKE_MODE'" }
}
