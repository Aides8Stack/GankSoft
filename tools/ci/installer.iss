#ifndef PackageDir
  #error PackageDir is required
#endif
#ifndef OutputDir
  #error OutputDir is required
#endif
#ifndef ArtifactName
  #error ArtifactName is required
#endif
#ifndef AppVersion
  #error AppVersion is required
#endif
#ifndef WindowsVersion
  #error WindowsVersion is required
#endif
[Setup]
AppId={#ArtifactName}
AppName=GankSoft
AppVersion={#AppVersion}
VersionInfoVersion={#WindowsVersion}
VersionInfoProductVersion={#WindowsVersion}
VersionInfoTextVersion={#AppVersion}
VersionInfoProductTextVersion={#AppVersion}
DefaultDirName={localappdata}\Programs\{#ArtifactName}
DefaultGroupName={#ArtifactName}
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir={#OutputDir}
OutputBaseFilename={#ArtifactName}-setup
Compression=lzma2
SolidCompression=yes
UninstallDisplayIcon={app}\GankSoft.exe
CloseApplications=no
[Files]
Source: "{#PackageDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
[Icons]
Name: "{group}\GankSoft"; Filename: "{app}\GankSoft.exe"
; No user learning directories are removed by uninstall.
