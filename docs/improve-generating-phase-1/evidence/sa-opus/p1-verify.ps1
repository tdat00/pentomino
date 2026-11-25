# SA-Opus, improve-generating phase 1, round-1 analysis: the release candidate's verification gates at the current
# base, through the repository's lock helper (tools\ig-proto\lock\ig-lock.ps1, Invoke-IgNode; a 45-s quiet period,
# no idle declaration). Four locked invocations, each at most 300 s: the full unit suite under the default Node (v26),
# the fixture check, the replay-case check, and the full unit suite under Node 22 (the CI version). Each invocation
# writes its whole output to its own log here (p1-run.mjs); this script then normalizes the logs (CRLF, no trailing
# whitespace) and writes the summary to p1-verify.log. It changes no file outside this folder.
#   pwsh -NoProfile -File docs\improve-generating-phase-1\evidence\sa-opus\p1-verify.ps1
param([string]$Node22 = 'Q:\.tools\.npm\_npx\52027bd8fc0022aa\node_modules\node\bin\node.exe')
$ErrorActionPreference = 'Stop'
Set-Location (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..'))
. .\tools\ig-proto\lock\ig-lock.ps1
$here = 'docs/improve-generating-phase-1/evidence/sa-opus'
$runner = "$here/p1-run.mjs"
$env:IG_NODE22 = $Node22
$runs = @(
  @{ Task = 'P1-SAO full node26'; Log = 'p1-full-node26.log'; Node = 'self'; Args = @('--test', '--test-reporter=tap', 'tests/**/*.test.js') },
  @{ Task = 'P1-SAO fixtures'; Log = 'p1-fixtures.log'; Node = 'self'; Args = @('tools/record-fixtures.mjs', '--check') },
  @{ Task = 'P1-SAO replay case'; Log = 'p1-replay-case.log'; Node = 'self'; Args = @('tools/record-fixtures.mjs', '--replay-case', '--check') },
  @{ Task = 'P1-SAO full node22'; Log = 'p1-full-node22.log'; Node = 'IG_NODE22'; Args = @('--test', '--test-reporter=tap', 'tests/**/*.test.js') }
)
$summary = [Collections.Generic.List[string]]::new()
$summary.Add("p1-verify: base $(git rev-parse --short HEAD), started $((Get-Date).ToString('yyyy-MM-dd HH:mm:ss zzz'))")
foreach ($r in $runs) {
  $log = "$here/$($r.Log)"
  $ig = & { Invoke-IgNode -Repo pentomino -Task $r.Task -NodeArgs (@($runner, $log, $r.Node, '--') + $r.Args) -LimitSeconds 300 -AllowExit1 } 6>&1 | ForEach-Object { "$_" }
  $path = Join-Path (Get-Location) $log
  $text = [IO.File]::ReadAllText($path) -replace '\x1b\[[0-9;]*m', ''
  $lines = $text -split '\r?\n' | ForEach-Object { $_ -replace '[ \t]+$', '' }
  while ($lines.Count -gt 0 -and $lines[-1] -eq '') { $lines = $lines[0..($lines.Count - 2)] }
  [IO.File]::WriteAllText($path, (($lines -join "`r`n") + "`r`n"), [Text.UTF8Encoding]::new($false))
  foreach ($k in $ig) { $summary.Add("$($r.Task): $($k -replace '[ \t]+$', '')") }
  foreach ($k in ($lines | Where-Object { $_ -match '^(p1-run:|# (tests|suites|pass|fail|cancelled|skipped|todo|duration_ms) |record-fixtures)' })) {
    $summary.Add("$($r.Task): $k")
  }
}
$summary.Add("p1-verify: ended $((Get-Date).ToString('yyyy-MM-dd HH:mm:ss zzz'))")
[IO.File]::WriteAllText((Join-Path (Get-Location) "$here/p1-verify.log"), (($summary -join "`r`n") + "`r`n"), [Text.UTF8Encoding]::new($false))
$summary
