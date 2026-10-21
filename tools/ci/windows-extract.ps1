param([Parameter(Mandatory)][string]$Archive, [Parameter(Mandatory)][string]$Report, [Parameter(Mandatory)][string]$Metadata)
$ErrorActionPreference = 'Stop'
if (-not $IsWindows) { throw 'Actual Windows extraction required' }
if (Test-Path -LiteralPath $Report) { Remove-Item -LiteralPath $Report -Force }
Add-Type -AssemblyName System.IO.Compression.FileSystem
$Archive = (Resolve-Path $Archive).Path
$zip = [IO.Compression.ZipFile]::OpenRead($Archive)
try {
  $names = @($zip.Entries | ForEach-Object { $_.FullName })
  if ($names.Count -eq 0 -or @($names | Sort-Object -Unique).Count -ne $names.Count) { throw 'Empty or duplicate ZIP entries' }
  foreach ($name in $names) {
    if ($name -cnotmatch '^GankSoft/[^\\:]+$' -or $name -match '(^|/)(\.{1,2})(/|$)' -or $name -match '//') { throw 'Unsafe ZIP path/root' }
  }
  $longest = $names | Sort-Object Length -Descending | Select-Object -First 1
} finally { $zip.Dispose() }
$destinations = @()
$root = Join-Path ([IO.Path]::GetTempPath()) ('gz-' + [guid]::NewGuid().ToString('N').Substring(0,8))
try {
  foreach ($length in @(80,100)) {
    $prefix = Join-Path $root ("deep-$length")
    $padding = $length - $prefix.Length - 1
    if ($padding -lt 1) { throw 'Temporary path too deep for controlled extraction test' }
    $destination = Join-Path $prefix ('d' * $padding)
    $maximum = $destination.Length + 1 + $longest.Length
    if ($maximum -ge 260) { throw "ZIP exceeds legacy Windows path budget: $maximum at depth $length; $longest" }
    # PowerShell/.NET real extraction, without extended-path prefixes or long-path opt-in assumptions.
    Expand-Archive -LiteralPath $Archive -DestinationPath $destination
    $app = Join-Path $destination 'GankSoft'
    if ((Get-FileHash -LiteralPath (Join-Path $app 'build-metadata.json')).Hash -ne (Get-FileHash -LiteralPath $Metadata).Hash) { throw 'Extracted build metadata differs from expected source/tool/run identity' }
    $manifest = Get-Content (Join-Path $app 'SHA256SUMS.json') -Raw -Encoding utf8 | ConvertFrom-Json -AsHashtable
    $files = @(Get-ChildItem $app -File -Recurse | Where-Object { $_.FullName -ne (Join-Path $app 'SHA256SUMS.json') })
    if ($files.Count -ne $manifest.Count -or $names.Count -ne $manifest.Count + 1) { throw 'Extracted manifest coverage mismatch' }
    foreach ($file in $files) {
      $relative = [IO.Path]::GetRelativePath($app, $file.FullName).Replace('\','/')
      if (-not $manifest.ContainsKey($relative) -or (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant() -cne $manifest[$relative]) { throw "Extracted hash mismatch: $relative" }
    }
    $destinations += @{ status='PASS'; destinationLength=$destination.Length; maxAbsolutePath=$maximum; filesVerified=$files.Count }
  }
  @{ status='PASS'; platform='win32'; archive=[IO.Path]::GetFileName($Archive); archiveSha256=(Get-FileHash -LiteralPath $Archive -Algorithm SHA256).Hash.ToLowerInvariant(); zipRoot='GankSoft/'; maxEntryPath=$longest.Length; longestEntry=$longest; filesVerified=$manifest.Count; destinations=$destinations } | ConvertTo-Json -Depth 8 | Set-Content -Encoding utf8 $Report
} finally { if (Test-Path $root) { Remove-Item $root -Recurse -Force } }
