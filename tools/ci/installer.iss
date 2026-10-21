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
#ifndef InstallationAppId
  #error InstallationAppId is required
#endif
#if Len(InstallationAppId) != 57
  #error InstallationAppId must be the canonical 57 character identity
#endif
[Setup]
AppId={#InstallationAppId}
AppName=GankSoft
AppComments={#ArtifactName}
AppVersion={#AppVersion}
VersionInfoVersion={#WindowsVersion}
VersionInfoProductVersion={#WindowsVersion}
VersionInfoTextVersion={#AppVersion}
VersionInfoProductTextVersion={#AppVersion}
DefaultDirName={localappdata}\Programs\{#InstallationAppId}
DefaultGroupName={#InstallationAppId}
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir={#OutputDir}
OutputBaseFilename=GankSoft-v{#AppVersion}-win64-setup
Compression=lzma2
SolidCompression=yes
UninstallDisplayIcon={app}\GankSoft.exe
CloseApplications=no
[Files]
Source: "{#PackageDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
[Icons]
Name: "{group}\GankSoft"; Filename: "{app}\GankSoft.exe"
; No user learning directories are removed by uninstall.
