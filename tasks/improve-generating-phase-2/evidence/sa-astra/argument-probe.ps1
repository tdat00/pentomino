[CmdletBinding()]
param(
  [string]$Stage,
  [string]$Item,
  [string[]]$NodeArgs
)
@{ stage = $Stage; item = $Item; nodeArgs = $NodeArgs; count = @($NodeArgs).Count } | ConvertTo-Json -Compress
