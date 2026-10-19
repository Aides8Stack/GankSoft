param(
 [Parameter(Mandatory=$true)][string]$ExePath,
 [Parameter(Mandatory=$true)][ValidateSet('win10','win11')][string]$ExpectedOs,
 [Parameter(Mandatory=$true)][string]$ZipPath
)
$ErrorActionPreference='Stop'
$os=Get-CimInstance Win32_OperatingSystem
$build=[int]$os.BuildNumber
if(($ExpectedOs -eq 'win11' -and $build -lt 22000) -or ($ExpectedOs -eq 'win10' -and ($build -lt 19041 -or $build -ge 22000))){throw 'Actual Windows version does not match requested test target'}
if(-not [Environment]::Is64BitOperatingSystem){throw 'x64 Windows required'}
$exe=(Resolve-Path $ExePath).Path
$folder=Split-Path $exe
$asar=Join-Path $folder 'resources\app.asar'
$zipHash=(Get-FileHash (Resolve-Path $ZipPath).Path -Algorithm SHA256).Hash.ToLowerInvariant()
foreach($dll in @('vcruntime140.dll','vcruntime140_1.dll')){
 $signature=Get-AuthenticodeSignature (Join-Path $folder $dll)
 if($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'Microsoft'){throw "Runtime signature check failed: $dll"}
}
node tools/smoke-v060.mjs $asar $exe
if($LASTEXITCODE -ne 0){throw 'Packaged UI smoke failed'}
node tools/smoke-system-v060.mjs $asar $exe
if($LASTEXITCODE -ne 0){throw 'Packaged system smoke failed'}
node tools/smoke-knowledge-picker.mjs $asar $exe
if($LASTEXITCODE -ne 0){throw 'Packaged knowledge picker smoke failed'}
node tools/smoke-knowledge-filter.mjs $asar $exe
if($LASTEXITCODE -ne 0){throw 'Packaged knowledge filter smoke failed'}
node tools/smoke-mind-workspace.mjs $asar $exe
if($LASTEXITCODE -ne 0){throw 'Packaged mind workspace smoke failed'}
node tools/smoke-import-cards.mjs $asar $exe
if($LASTEXITCODE -ne 0){throw 'Packaged import cards smoke failed'}
node tools/smoke-study-pages.mjs $asar $exe
if($LASTEXITCODE -ne 0){throw 'Packaged study pages smoke failed'}
node tools/smoke-v066.mjs $asar $exe
if($LASTEXITCODE -ne 0){throw 'Packaged v066 issues smoke failed'}
node tools/smoke-v070.mjs $asar $exe
if($LASTEXITCODE -ne 0){throw 'Packaged v070 issues smoke failed'}
node tools/smoke-v071.mjs $asar $exe
if($LASTEXITCODE -ne 0){throw 'Packaged v071 issues smoke failed'}
node tools/smoke-v072.mjs $asar $exe
if($LASTEXITCODE -ne 0){throw 'Packaged v072 issues smoke failed'}
New-Item -ItemType Directory -Force validation-results | Out-Null
[ordered]@{target=$ExpectedOs;caption=$os.Caption;build=$build;architecture=$os.OSArchitecture;zipSha256=$zipHash;exeSha256=(Get-FileHash $exe -Algorithm SHA256).Hash.ToLowerInvariant();automated='passed';msvcSignature='passed';version=(Get-Content package.json -Raw | ConvertFrom-Json).version;manualSignoff='pending';manualCases=@{W01='not_run';W02='not_run';W03='not_run';W04='not_run';W05='not_run';W06='not_run';W07='not_run';W08='not_run';W09='not_run';W10='not_run';W11='not_run';W12='not_run';W13='not_run';W14='not_run';W15='not_run';W16='not_run';W17='not_run';W18='not_run';W19='not_run';W20='not_run';W21='not_run';W22='not_run';W23='not_run';W24='not_run';W25='not_run';W26='not_run';W27='not_run';W28='not_run';W29='not_run';W30='not_run';W31='not_run';W32='not_run';W33='not_run';W34='not_run';W35='not_run';W36='not_run';W37='not_run';W38='not_run';W39='not_run';W40='not_run'};testedAt=(Get-Date).ToUniversalTime().ToString('o')} | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 "validation-results/$ExpectedOs-actual.json"
Write-Output 'Automated checks passed. Manual Windows acceptance remains pending; this is not a release approval.'
