$ErrorActionPreference = 'Stop'
function CheckExit([string]$Step) { if ($LASTEXITCODE -ne 0) { throw "$Step failed with exit $LASTEXITCODE" } }
$toolRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
. (Join-Path $toolRoot 'tools/ci/windows-install-validation.ps1')
$validator = Join-Path $toolRoot 'tools/ci/install-identity.mjs'
$meta = Get-Content validation-results/ci/source.json -Raw | ConvertFrom-Json
$report = [ordered]@{ sourceSha=$meta.sha; versionResources=@(); packagingToolchain=$meta.packagingToolchain; windowsVersion=$meta.windowsVersion; compiler=$null; package='NOT_RUN'; compile='NOT_RUN'; installation=$null; registry=$null; failedStage=$null; failure=$null; cleanupError=$null; install='NOT_RUN'; 'identity-validation'='NOT_RUN'; 'registry-validation'='NOT_RUN'; 'portable-zip'='NOT_RUN'; 'windows-extraction'='NOT_RUN'; launch='NOT_RUN'; uninstall='NOT_RUN'; windows10Manual='NOT_RUN'; windows11Manual='NOT_RUN' }
$stage='identity-validation'
try {
$identity = node $validator identity validation-results/ci/source.json | ConvertFrom-Json
CheckExit 'Installation identity'
$report.installation=$identity
$stage='package'
$package = Join-Path $PWD 'out/GankSoft-win32-x64'
$artifacts = Join-Path $PWD 'artifacts'
New-Item -ItemType Directory -Force $artifacts | Out-Null
node (Join-Path $toolRoot 'tools/package-windows.mjs')
CheckExit 'Windows packaging'
Copy-Item validation-results/ci/source.json (Join-Path $package 'build-metadata.json')
node (Join-Path $toolRoot 'tools/ci/windows-smoke.mjs') (Join-Path $package 'resources/app.asar') (Join-Path $package 'GankSoft.exe') portable
CheckExit 'Portable smoke'
$report.package='PASS'
$stage='compile'
$iscc = Join-Path ${env:ProgramFiles(x86)} 'Inno Setup 6/ISCC.exe'
if (-not (Test-Path $iscc)) {
  choco install innosetup --version=6.7.1 --yes --no-progress
  CheckExit 'Inno Setup installation'
}
if (-not (Test-Path $iscc)) { throw 'Inno Setup compiler unavailable' }
$compilerText = (& $iscc '/?' | Out-String)
if ($compilerText -notmatch 'Compiler engine version: Inno Setup (6\.7\.1)(?:\r?\n|$)') { throw 'Inno Setup 6.7.1 required' }
$compilerVersion=$Matches[1]
$mapping = (node (Join-Path $toolRoot 'tools/ci/windows-version.mjs') $meta.version | ConvertFrom-Json)
CheckExit 'Windows version mapping'
if ($mapping.numeric -ne $meta.windowsVersion.numeric -or $mapping.semver -ne $meta.version) { throw 'Windows version metadata mismatch' }
& $iscc "/DPackageDir=$package" "/DOutputDir=$artifacts" "/DArtifactName=$($meta.name)" "/DInstallationAppId=$($identity.appId)" "/DAppVersion=$($meta.version)" "/DWindowsVersion=$($mapping.numeric)" (Join-Path $toolRoot 'tools/ci/installer.iss')
CheckExit 'Installer compile'
$installer = Join-Path $artifacts $meta.delivery.installer
$versionResources = @()
foreach ($binary in @($installer, (Join-Path $package 'GankSoft.exe'))) {
  $info = (Get-Item $binary).VersionInfo
  $fileNumeric = "$($info.FileMajorPart).$($info.FileMinorPart).$($info.FileBuildPart).$($info.FilePrivatePart)"
  $productNumeric = "$($info.ProductMajorPart).$($info.ProductMinorPart).$($info.ProductBuildPart).$($info.ProductPrivatePart)"
  if ($fileNumeric -ne $mapping.numeric -or $productNumeric -ne $mapping.numeric) { throw 'Windows numeric version mismatch' }
  $kind = if ($binary -eq $installer) { 'installer' } else { 'application' }
  $resourceJson = node (Join-Path $toolRoot 'tools/ci/windows-version.mjs') verify $binary $meta.version $kind
  $resourceJson | Write-Host
  CheckExit 'Windows textual SemVer mismatch'
  $versionResources += ($resourceJson | ConvertFrom-Json)
}
if ((Get-Item (Join-Path $package 'GankSoft.exe')).VersionInfo.ProductVersion -ne $meta.version) { throw 'Application product version mismatch' }
$installed = Join-Path $env:RUNNER_TEMP ("gank-install-" + [guid]::NewGuid())
$report.compile='PASS'
$report.versionResources=$versionResources
$report.compiler=@{ version=$compilerVersion; sha256=(Get-FileHash $iscc -Algorithm SHA256).Hash.ToLowerInvariant() }
$stage = 'install'
if ((Read-InstallationRegistry $identity).exists) { throw 'Installation identity already exists; refusing to replace an unrelated installation' }
try {
  $process = Start-Process $installer -ArgumentList @('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/SP-',"/DIR=`"$installed`"",'/TASKS=',"/LOG=`"$PWD/validation-results/ci/install.log`"") -Wait -PassThru
  if ($process.ExitCode -ne 0 -or -not (Test-Path "$installed/GankSoft.exe")) { throw 'Installer failed' }
  $report.install='PASS'
  $stage='identity-validation'
  if ((Get-FileHash "$installed/build-metadata.json" -Algorithm SHA256).Hash -ne (Get-FileHash validation-results/ci/source.json -Algorithm SHA256).Hash) { throw 'Installed complete build metadata mismatch' }
  if ((Get-FileHash "$installed/GankSoft.exe" -Algorithm SHA256).Hash -ne (Get-FileHash (Join-Path $package 'GankSoft.exe') -Algorithm SHA256).Hash) { throw 'Installed executable differs from portable executable' }
  $report['identity-validation']='PASS'
  $stage='registry-validation'
  $report.registry=Read-InstallationRegistry $identity
  Assert-InstallationRegistry validation-results/ci/source.json $identity $installed validation-results/ci/registry.json $validator | Out-Null
  $report['registry-validation']='PASS'
  $report.displayVersion='PASS'
  $stage='launch'
  node (Join-Path $toolRoot 'tools/ci/windows-smoke.mjs') "$installed/resources/app.asar" "$installed/GankSoft.exe" installed
  CheckExit 'Installed application smoke'
  $report.launch='PASS'
} catch {
  $report[$stage]='FAIL'
  $report.failedStage=$stage
  $report.failure=$_.Exception.Message
  throw
} finally {
  if (Test-Path "$installed/unins000.exe") {
    try {
      $uninstall = Start-Process "$installed/unins000.exe" -ArgumentList @('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART',"/LOG=`"$PWD/validation-results/ci/uninstall.log`"") -Wait -PassThru
      if ($uninstall.ExitCode -ne 0) { throw 'Uninstaller failed' }
      Assert-InstallationRemoved $identity $installed
      foreach ($file in (Get-ChildItem $package -File -Recurse)) {
        $relative=[System.IO.Path]::GetRelativePath($package,$file.FullName)
        if (Test-Path (Join-Path $installed $relative)) { throw "Installed payload remains: $relative" }
      }
      $report.uninstall='PASS'
    } catch {
      $report.uninstall='FAIL'
      $report.cleanupError=$_.Exception.Message
      if ($null -eq $report.failedStage) { $report.failedStage='uninstall' }
    }
  }

  $report | ConvertTo-Json -Depth 12 | Set-Content -Encoding utf8 validation-results/ci/installer.json
}
if ($report.uninstall -ne 'PASS') { if ($null -eq $report.failedStage) { $report.failedStage='uninstall' }; throw 'Uninstall test failed' }
try {
  $stage='portable-zip'
python (Join-Path $toolRoot 'tools/build/zip-windows.py') $package "$artifacts/$($meta.delivery.portable)" GankSoft
CheckExit 'Portable ZIP integrity'
$report['portable-zip']='PASS'
$stage='windows-extraction'
& (Join-Path $toolRoot 'tools/ci/windows-extract.ps1') -Archive (Join-Path $artifacts $meta.delivery.portable) -Report validation-results/ci/zip-extraction.json -Metadata validation-results/ci/source.json
$extraction = Get-Content validation-results/ci/zip-extraction.json -Raw | ConvertFrom-Json
if ($extraction.status -ne 'PASS') { throw 'Windows extraction evidence missing' }
Copy-Item validation-results/ci/source.json "$artifacts/$($meta.name)-source.json"
Get-ChildItem $artifacts -File | Sort-Object Name | ForEach-Object { "$((Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant())  $($_.Name)" } | Set-Content -Encoding ascii "$artifacts/SHA256SUMS.txt"

$report['windows-extraction']='PASS'
} catch {
  $report[$stage]='FAIL'
  $report.failedStage=$stage
  $report.failure=$_.Exception.Message
  throw
} finally {
  $report | ConvertTo-Json -Depth 12 | Set-Content -Encoding utf8 validation-results/ci/installer.json
}

} catch {
  if ($null -eq $report.failedStage) { $report[$stage]='FAIL'; $report.failedStage=$stage; $report.failure=$_.Exception.Message }
  throw
} finally {
  $report | ConvertTo-Json -Depth 12 | Set-Content -Encoding utf8 validation-results/ci/installer.json
}
