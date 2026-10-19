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
[Setup]
AppId=GankSoft-Branch-Test
AppName=GankSoft Test RC
AppVersion={#AppVersion}
DefaultDirName={localappdata}\Programs\GankSoft-Test
DefaultGroupName=GankSoft Test RC
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
Name: "{group}\GankSoft Test RC"; Filename: "{app}\GankSoft.exe"
; No user learning directories are removed by uninstall.
