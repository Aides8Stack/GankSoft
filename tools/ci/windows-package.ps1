$ErrorActionPreference = 'Stop'
function CheckExit([string]$Step) { if ($LASTEXITCODE -ne 0) { throw "$Step failed with exit $LASTEXITCODE" } }
$meta = Get-Content validation-results/ci/source.json -Raw | ConvertFrom-Json
$package = Join-Path $PWD 'out/GankSoft-win32-x64'
$artifacts = Join-Path $PWD 'artifacts'
New-Item -ItemType Directory -Force $artifacts | Out-Null
node tools/package-windows.mjs
CheckExit 'Windows packaging'
Copy-Item validation-results/ci/source.json (Join-Path $package 'build-metadata.json')
node tools/ci/windows-smoke.mjs (Join-Path $package 'resources/app.asar') (Join-Path $package 'GankSoft.exe') portable
CheckExit 'Portable smoke'
$iscc = Join-Path ${env:ProgramFiles(x86)} 'Inno Setup 6/ISCC.exe'
if (-not (Test-Path $iscc)) {
  choco install innosetup --yes --no-progress
  CheckExit 'Inno Setup installation'
}
if (-not (Test-Path $iscc)) { throw 'Inno Setup compiler unavailable' }
& $iscc "/DPackageDir=$package" "/DOutputDir=$artifacts" "/DArtifactName=$($meta.name)" "/DAppVersion=$($meta.version)" "/DCoreVersion=$(($meta.version -split '[-+]')[0])" tools/ci/installer.iss
CheckExit 'Installer compile'
$installer = Join-Path $artifacts "$($meta.name)-setup.exe"
if ((Get-Item $installer).VersionInfo.ProductVersion -ne $meta.version) { throw 'Installer product version mismatch' }
if ((Get-Item (Join-Path $package 'GankSoft.exe')).VersionInfo.ProductVersion -ne $meta.version) { throw 'Application product version mismatch' }
$installed = Join-Path $env:RUNNER_TEMP ("gank-install-" + [guid]::NewGuid())
$report = [ordered]@{ sourceSha=$meta.sha; install='NOT_RUN'; launch='NOT_RUN'; uninstall='NOT_RUN'; windows10Manual='NOT_RUN'; windows11Manual='NOT_RUN' }
$stage = 'install'
try {
  $process = Start-Process $installer -ArgumentList @('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/SP-',"/DIR=`"$installed`"",'/TASKS=',"/LOG=`"$PWD/validation-results/ci/install.log`"") -Wait -PassThru
  if ($process.ExitCode -ne 0 -or -not (Test-Path "$installed/GankSoft.exe")) { throw 'Installer failed' }
  $report.install='PASS'
  $stage='launch'
  if ((Get-Content "$installed/build-metadata.json" -Raw | ConvertFrom-Json).sha -ne $meta.sha) { throw 'Installed source identity mismatch' }
  node tools/ci/windows-smoke.mjs "$installed/resources/app.asar" "$installed/GankSoft.exe" installed
  CheckExit 'Installed application smoke'
  $report.launch='PASS'
} catch {
  $report[$stage]='FAIL'
  throw
} finally {
  if (Test-Path "$installed/unins000.exe") {
    $uninstall = Start-Process "$installed/unins000.exe" -ArgumentList @('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART',"/LOG=`"$PWD/validation-results/ci/uninstall.log`"") -Wait -PassThru
    if ($uninstall.ExitCode -eq 0 -and -not (Test-Path "$installed/GankSoft.exe")) { $report.uninstall='PASS' } else { $report.uninstall='FAIL' }
  }
  $report | ConvertTo-Json -Depth 8 | Set-Content -Encoding utf8 validation-results/ci/installer.json
}
if ($report.uninstall -ne 'PASS') { throw 'Uninstall test failed' }
python tools/build/zip-windows.py $package "$artifacts/$($meta.name)-portable.zip" $meta.name
CheckExit 'Portable ZIP integrity'
Copy-Item validation-results/ci/source.json "$artifacts/$($meta.name)-source.json"
Get-ChildItem $artifacts -File | Sort-Object Name | ForEach-Object { "$((Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant())  $($_.Name)" } | Set-Content -Encoding ascii "$artifacts/SHA256SUMS.txt"
