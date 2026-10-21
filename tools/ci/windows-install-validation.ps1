# Explicit HKCU/64-bit view; never enumerate unrelated uninstall keys.
function Read-InstallationRegistry($Identity) {
  $base = [Microsoft.Win32.RegistryKey]::OpenBaseKey([Microsoft.Win32.RegistryHive]::CurrentUser, [Microsoft.Win32.RegistryView]::Registry64)
  try {
    $key = $base.OpenSubKey($Identity.registrySubKey)
    $result = [ordered]@{ hive='HKEY_CURRENT_USER'; view='Registry64'; subKey=$Identity.registrySubKey; exists=($null -ne $key) }
    if ($null -ne $key) {
      try { foreach ($name in @('DisplayName','DisplayVersion','InstallLocation','UninstallString')) { $result[$name]=$key.GetValue($name) } } finally { $key.Dispose() }
    }
    return $result
  } finally { $base.Dispose() }
}
function Assert-InstallationRegistry($MetadataPath, $Identity, $Target, $EvidencePath, $Validator) {
  $actual = Read-InstallationRegistry $Identity
  $actual | ConvertTo-Json -Depth 12 | Set-Content -Encoding utf8 $EvidencePath
  node $Validator registry $MetadataPath $EvidencePath $Target | Write-Host
  if ($LASTEXITCODE -ne 0) { throw 'Strict installation registry validation failed' }
  if (-not (Test-Path (Join-Path $Target 'unins000.exe'))) { throw 'Registered uninstaller missing' }
  return $actual
}
function Assert-InstallationRemoved($Identity, $Target) {
  if ((Read-InstallationRegistry $Identity).exists) { throw 'Uninstall registry key remains' }
  foreach ($name in @('GankSoft.exe','build-metadata.json','unins000.exe','unins000.dat','resources/app.asar')) {
    if (Test-Path (Join-Path $Target $name)) { throw "Installed file remains: $name" }
  }
}
