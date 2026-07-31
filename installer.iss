; ============================================================
;  Ocal Screen - Inno Setup 6 Installer
;  Version  : 1.0.0 Open Beta
;  Builder  : Gaming Network Studio Media Group & Ocal Software
;  Compiler : Inno Setup 6
; ============================================================

[Setup]
AppName=Ocal Screen
AppVersion=1.0.0-beta
AppVerName=Ocal Screen 1.0.0 Open Beta
AppPublisher=Gaming Network Studio Media Group & Ocal Software
AppPublisherURL=https://gamingnetworkstudio.vercel.app
AppSupportURL=https://github.com/neelkanth-patel26/Ocal-Screen/issues
AppUpdatesURL=https://github.com/neelkanth-patel26/Ocal-Screen/releases
AppCopyright=Copyright (C) 2026 Gaming Network Studio Media Group
DefaultDirName={autopf}\Ocal Screen
DefaultGroupName=Ocal Screen
OutputDir=dist-inno
OutputBaseFilename=Ocal-Screen-1.0.0-OpenBeta-Setup
SetupIconFile=icons\icons\win\icon.ico
Compression=lzma2/ultra64
SolidCompression=yes
DiskSpanning=no
PrivilegesRequired=admin
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64
LicenseFile=license.txt
MinVersion=10.0.17763
UninstallDisplayIcon={app}\Ocal Screen.exe
UninstallDisplayName=Ocal Screen 1.0.0 Open Beta
VersionInfoVersion=1.0.0.0
VersionInfoCompany=Gaming Network Studio Media Group
VersionInfoDescription=Ocal Screen Studio Installer
VersionInfoProductName=Ocal Screen
VersionInfoProductVersion=1.0.0.0
WizardStyle=modern
WizardResizable=no
ShowLanguageDialog=no
CloseApplications=yes
CloseApplicationsFilter=Ocal Screen.exe

; ── Setup Components ─────────────────────────────────────────
[Types]
Name: "full";    Description: "Full Installation (Recommended)"
Name: "compact"; Description: "Core Screen Recorder & Editor"
Name: "custom";  Description: "Custom Installation"; Flags: iscustom

[Components]
Name: "core"; Description: "Ocal Screen Core Studio Engine"; Types: full compact custom; Flags: fixed

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[CustomMessages]
InstallingCore=Installing Ocal Screen files...
LaunchAfterInstall=Launch Ocal Screen Studio now
ReleaseNotes=View release notes & features on GitHub

; ── Files ───────────────────────────────────────────────────
[InstallDelete]
Type: files; Name: "{app}\Ocal Screen.exe"

[Files]
; Core executable
Source: "release\1.5.0\win-unpacked\Ocal Screen.exe"; DestDir: "{app}"; Flags: ignoreversion; Components: core
; All supporting Electron runtime files
Source: "release\1.5.0\win-unpacked\*"; DestDir: "{app}"; Excludes: "Ocal Screen.exe,LICENSE.electron.txt,LICENSES.chromium.html"; Flags: ignoreversion recursesubdirs createallsubdirs; Components: core

; Icons
Source: "icons\icons\win\icon.ico"; DestDir: "{app}"; Flags: ignoreversion; Components: core

; ── Shortcuts ───────────────────────────────────────────────
[Icons]
Name: "{autoprograms}\Ocal Screen";       Filename: "{app}\Ocal Screen.exe"; IconFilename: "{app}\icon.ico"; AppUserModelID: "com.ocal.screen.v1"
Name: "{group}\Uninstall Ocal Screen";    Filename: "{uninstallexe}"
Name: "{autodesktop}\Ocal Screen";         Filename: "{app}\Ocal Screen.exe"; Tasks: desktopicon; IconFilename: "{app}\icon.ico"; AppUserModelID: "com.ocal.screen.v1"

; ── Registry ────────────────────────────────────────────────
[Registry]
Root: HKLM; Subkey: "Software\OcalScreen"; ValueType: string; ValueName: "Version";      ValueData: "1.0.0-beta"; Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\OcalScreen"; ValueType: string; ValueName: "InstallPath"; ValueData: "{app}";        Flags: uninsdeletekey

; ── Post-Install Run ────────────────────────────────────────
[Run]
Filename: "{app}\Ocal Screen.exe"; Description: "{cm:LaunchAfterInstall}"; Flags: nowait postinstall skipifsilent
Filename: "https://github.com/neelkanth-patel26/Ocal-Screen/releases/tag/v1.0.0-beta"; Description: "{cm:ReleaseNotes}"; Flags: shellexec postinstall skipifsilent unchecked
