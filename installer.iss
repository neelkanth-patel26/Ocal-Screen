; ============================================================
;  Ocal Screen - Inno Setup 6 Installer Script
;  Version  : 1.0.0 Open Beta
;  Publisher: Gaming Network Studio Media Group & Ocal Software
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
Compression=lzma2/max
SolidCompression=yes
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64
LicenseFile=license.txt
PrivilegesRequired=admin
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

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
; Package all unpacked Electron application files cleanly
Source: "release\1.5.0\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\Ocal Screen";       Filename: "{app}\Ocal Screen.exe"; IconFilename: "{app}\Ocal Screen.exe"; AppUserModelID: "com.ocal.screen.v1"
Name: "{group}\Uninstall Ocal Screen";    Filename: "{uninstallexe}"
Name: "{autodesktop}\Ocal Screen";         Filename: "{app}\Ocal Screen.exe"; Tasks: desktopicon; IconFilename: "{app}\Ocal Screen.exe"; AppUserModelID: "com.ocal.screen.v1"

[Run]
Filename: "{app}\Ocal Screen.exe"; Description: "{cm:LaunchProgram,Ocal Screen}"; Flags: nowait postinstall skipifsilent
Filename: "https://github.com/neelkanth-patel26/Ocal-Screen/releases/tag/v1.0.0-beta"; Description: "View Release Notes on GitHub"; Flags: shellexec postinstall skipifsilent unchecked
