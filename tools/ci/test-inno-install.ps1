param([Parameter(Mandatory=$true)][string]$Cases)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'windows-install-validation.ps1')
$validator=Join-Path $PSScriptRoot 'install-identity.mjs'
$entries=@(Get-Content $Cases -Raw | ConvertFrom-Json)
$report=[ordered]@{ fixturePayload=$true; launch='NOT_RUN'; status='IN_PROGRESS'; cases=@(); cleanup=@() }
$active=@()
try {
  foreach ($case in $entries) {
    $target=Join-Path $env:RUNNER_TEMP ('gank-inno-regression-'+[guid]::NewGuid())
    if ((Read-InstallationRegistry $case.installation).exists) { throw 'Fixture identity already installed; refusing to overwrite' }
    $entry=[ordered]@{ version=$case.semver; installation=$case.installation; install='NOT_RUN'; reinstall='NOT_RUN'; 'identity-validation'='NOT_RUN'; 'registry-validation'='NOT_RUN'; coexistence='NOT_RUN'; uninstall='NOT_RUN'; launch='NOT_RUN'; failedStage=$null }
    $report.cases+=,$entry
    $active+=,@{case=$case; target=$target; entry=$entry}
    $stage='install'
    for ($attempt=1; $attempt -le 2; $attempt++) {
      if ($attempt -eq 2) { $stage='reinstall' }
      $p=Start-Process $case.installerPath -ArgumentList @('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/SP-',"/DIR=`"$target`"", "/LOG=`"$PWD/validation-results/ci/inno-$($report.cases.Count)-$attempt.log`"") -Wait -PassThru
      if ($p.ExitCode -ne 0 -or -not (Test-Path "$target/GankSoft.exe")) { throw 'Actual fixture installation failed' }
      $entry[$stage]='PASS'
      $stage='identity-validation'
      if ((Get-FileHash "$target/build-metadata.json").Hash -ne (Get-FileHash $case.metadataPath).Hash) { throw 'Installed metadata mismatch' }
      $entry[$stage]='PASS'
      $stage='registry-validation'
      $entry.registry=Assert-InstallationRegistry $case.metadataPath $case.installation $target "validation-results/ci/inno-registry-$($report.cases.Count).json" $validator
      $entry[$stage]='PASS'
    }
    $stage='coexistence'
    foreach ($other in $active) {
      Assert-InstallationRegistry $other.case.metadataPath $other.case.installation $other.target "validation-results/ci/inno-coexist-$($report.cases.Count).json" $validator | Out-Null
    }
    $entry.coexistence='PASS'
  }
  $report.status='PASS'
} catch {
  if ($null -ne $entry) { $entry[$stage]='FAIL'; $entry.failedStage=$stage; $entry.error=$_.Exception.Message }
  $report.status='FAIL'
  throw
} finally {
  foreach ($item in $active) {
    try {
      if (-not (Test-Path "$($item.target)/unins000.exe")) { continue }
      $p=Start-Process "$($item.target)/unins000.exe" -ArgumentList @('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART',"/LOG=`"$PWD/validation-results/ci/inno-uninstall-$($item.entry.installation.appId).log`"") -Wait -PassThru
      if ($p.ExitCode -ne 0) { throw 'Actual fixture uninstall failed' }
      Assert-InstallationRemoved $item.case.installation $item.target
      $item.entry.uninstall='PASS'
      # Earlier installed cases have been removed; later cases must be untouched.
      $index=[array]::IndexOf($active,$item)
      for ($j=$index+1; $j -lt $active.Count; $j++) {
        $other=$active[$j]
        if ($other.entry.install -eq 'PASS') { Assert-InstallationRegistry $other.case.metadataPath $other.case.installation $other.target "validation-results/ci/inno-uninstall-isolation-$j.json" $validator | Out-Null }
      }
    } catch { $item.entry.uninstall='FAIL'; $report.status='FAIL'; $report.cleanup+=,$_.Exception.Message }
  }
  $report | ConvertTo-Json -Depth 16 | Set-Content -Encoding utf8 validation-results/ci/inno-install.json
}
if ($report.status -ne 'PASS') { throw 'Windows fixture installation regression failed' }
