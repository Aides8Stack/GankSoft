$ErrorActionPreference = 'Stop'
function CheckExit([string]$Step) { if ($LASTEXITCODE -ne 0) { throw "$Step failed with exit $LASTEXITCODE" } }
$toolRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$meta = Get-Content validation-results/ci/source.json -Raw | ConvertFrom-Json
$package = Join-Path $PWD 'out/GankSoft-win32-x64'
$artifacts = Join-Path $PWD 'artifacts'
New-Item -ItemType Directory -Force $artifacts | Out-Null
node (Join-Path $toolRoot 'tools/package-windows.mjs')
CheckExit 'Windows packaging'
Copy-Item validation-results/ci/source.json (Join-Path $package 'build-metadata.json')
node (Join-Path $toolRoot 'tools/ci/windows-smoke.mjs') (Join-Path $package 'resources/app.asar') (Join-Path $package 'GankSoft.exe') portable
CheckExit 'Portable smoke'
$iscc = Join-Path ${env:ProgramFiles(x86)} 'Inno Setup 6/ISCC.exe'
if (-not (Test-Path $iscc)) {
  choco install innosetup --version=6.7.1 --yes --no-progress
  CheckExit 'Inno Setup installation'
}
if (-not (Test-Path $iscc)) { throw 'Inno Setup compiler unavailable' }
$mapping = (node (Join-Path $toolRoot 'tools/ci/windows-version.mjs') $meta.version | ConvertFrom-Json)
CheckExit 'Windows version mapping'
if ($mapping.numeric -ne $meta.windowsVersion.numeric -or $mapping.semver -ne $meta.version) { throw 'Windows version metadata mismatch' }
& $iscc "/DPackageDir=$package" "/DOutputDir=$artifacts" "/DArtifactName=$($meta.name)" "/DAppVersion=$($meta.version)" "/DWindowsVersion=$($mapping.numeric)" (Join-Path $toolRoot 'tools/ci/installer.iss')
CheckExit 'Installer compile'
$installer = Join-Path $artifacts "$($meta.name)-setup.exe"
foreach ($binary in @($installer, (Join-Path $package 'GankSoft.exe'))) {
  $info = (Get-Item $binary).VersionInfo
  $fileNumeric = "$($info.FileMajorPart).$($info.FileMinorPart).$($info.FileBuildPart).$($info.FilePrivatePart)"
  $productNumeric = "$($info.ProductMajorPart).$($info.ProductMinorPart).$($info.ProductBuildPart).$($info.ProductPrivatePart)"
  if ($fileNumeric -ne $mapping.numeric -or $productNumeric -ne $mapping.numeric) { throw 'Windows numeric version mismatch' }
  if ($info.ProductVersion -ne $meta.version -or $info.FileVersion -ne $meta.version) { throw 'Windows textual SemVer mismatch' }
}
if ((Get-Item (Join-Path $package 'GankSoft.exe')).VersionInfo.ProductVersion -ne $meta.version) { throw 'Application product version mismatch' }
$installed = Join-Path $env:RUNNER_TEMP ("gank-install-" + [guid]::NewGuid())
$report = [ordered]@{ sourceSha=$meta.sha; packagingToolchain=$meta.packagingToolchain; windowsVersion=$meta.windowsVersion; compiler=@{ version=(Get-Item $iscc).VersionInfo.FileVersion; sha256=(Get-FileHash $iscc -Algorithm SHA256).Hash.ToLowerInvariant() }; install='NOT_RUN'; launch='NOT_RUN'; uninstall='NOT_RUN'; windows10Manual='NOT_RUN'; windows11Manual='NOT_RUN' }
$stage = 'install'
try {
  $process = Start-Process $installer -ArgumentList @('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/SP-',"/DIR=`"$installed`"",'/TASKS=',"/LOG=`"$PWD/validation-results/ci/install.log`"") -Wait -PassThru
  if ($process.ExitCode -ne 0 -or -not (Test-Path "$installed/GankSoft.exe")) { throw 'Installer failed' }
  $report.install='PASS'
  $stage='launch'
  $installedMeta = Get-Content "$installed/build-metadata.json" -Raw | ConvertFrom-Json
  if ($installedMeta.sha -ne $meta.sha -or $installedMeta.version -ne $meta.version -or $installedMeta.packagingToolchain.sha -ne $meta.packagingToolchain.sha) { throw 'Installed source/toolchain/version identity mismatch' }
  if ((Get-FileHash "$installed/GankSoft.exe" -Algorithm SHA256).Hash -ne (Get-FileHash (Join-Path $package 'GankSoft.exe') -Algorithm SHA256).Hash) { throw 'Installed executable differs from portable executable' }
  $uninstallKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\$($meta.name)_is1"
  if ((Get-ItemProperty $uninstallKey).DisplayVersion -ne $meta.version) { throw 'Installed display version mismatch' }
  $report.displayVersion='PASS'
  node (Join-Path $toolRoot 'tools/ci/windows-smoke.mjs') "$installed/resources/app.asar" "$installed/GankSoft.exe" installed
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
python (Join-Path $toolRoot 'tools/build/zip-windows.py') $package "$artifacts/$($meta.name)-portable.zip" $meta.name
CheckExit 'Portable ZIP integrity'
Copy-Item validation-results/ci/source.json "$artifacts/$($meta.name)-source.json"
Get-ChildItem $artifacts -File | Sort-Object Name | ForEach-Object { "$((Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant())  $($_.Name)" } | Set-Content -Encoding ascii "$artifacts/SHA256SUMS.txt"
