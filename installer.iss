; ============================================================
;  Ocal Screen - Inno Setup 6 Installer Script
;  Version  : 2.9.00 Stable
;  Publisher: Gaming Network Studio Media Group & Ocal Software
; ============================================================

[Setup]
AppName=Ocal Screen
AppVersion=2.9.00
AppVerName=Ocal Screen 2.9.00 Stable
AppPublisher=Gaming Network Studio Media Group & Ocal Software
AppPublisherURL=https://gamingnetworkstudio.vercel.app
AppSupportURL=https://github.com/neelkanth-patel26/Ocal-Screen/issues
AppUpdatesURL=https://github.com/neelkanth-patel26/Ocal-Screen/releases
AppCopyright=Copyright (C) 2026 Gaming Network Studio Media Group
DefaultDirName={autopf}\Ocal Screen
DefaultGroupName=Ocal Screen
OutputDir=dist-inno
OutputBaseFilename=Ocal-Screen-2.9.00-Setup
SetupIconFile=icons\icons\win\icon.ico
Compression=lzma2/max
SolidCompression=yes
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64
LicenseFile=license.txt
InfoBeforeFile=catalog.txt
PrivilegesRequired=admin
UninstallDisplayIcon={app}\Ocal Screen.exe
UninstallDisplayName=Ocal Screen 2.9.00 Stable
VersionInfoVersion=2.9.0.0
VersionInfoCompany=Gaming Network Studio Media Group
VersionInfoDescription=Ocal Screen Studio Installer
VersionInfoProductName=Ocal Screen
VersionInfoProductVersion=2.9.0.0
WizardStyle=modern
WizardResizable=no
ShowLanguageDialog=no
CloseApplications=yes
CloseApplicationsFilter=Ocal Screen.exe

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
; Package all unpacked Electron application files cleanly
Source: "release\2.9.0\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\Ocal Screen";       Filename: "{app}\Ocal Screen.exe"; IconFilename: "{app}\Ocal Screen.exe"; AppUserModelID: "com.ocal.screen.v2"
Name: "{group}\Uninstall Ocal Screen";    Filename: "{uninstallexe}"
Name: "{autodesktop}\Ocal Screen";         Filename: "{app}\Ocal Screen.exe"; Tasks: desktopicon; IconFilename: "{app}\Ocal Screen.exe"; AppUserModelID: "com.ocal.screen.v2"

[Run]
Filename: "{app}\Ocal Screen.exe"; Description: "{cm:LaunchProgram,Ocal Screen}"; Flags: nowait postinstall skipifsilent
Filename: "https://github.com/neelkanth-patel26/Ocal-Screen/releases/tag/v2.9.00"; Description: "View Detailed Studio Catalog on GitHub"; Flags: shellexec postinstall skipifsilent unchecked

[Code]
var
  UpgradeModePage: TInputOptionWizardPage;
  IsExistingInstall: Boolean;

function CheckIfInstalled(): Boolean;
var
  InstallPath: String;
begin
  Result := False;
  // Check 64-bit and 32-bit registry uninstall keys
  if RegQueryStringValue(HKLM64, 'SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Ocal Screen_is1', 'InstallLocation', InstallPath) or
     RegQueryStringValue(HKLM32, 'SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Ocal Screen_is1', 'InstallLocation', InstallPath) or
     RegQueryStringValue(HKCU64, 'SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Ocal Screen_is1', 'InstallLocation', InstallPath) or
     RegQueryStringValue(HKCU32, 'SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Ocal Screen_is1', 'InstallLocation', InstallPath) then
  begin
    if (InstallPath <> '') and DirExists(InstallPath) then
      Result := True;
  end;

  // Fallback to default path check
  if not Result then
  begin
    if FileExists(ExpandConstant('{autopf}\Ocal Screen\Ocal Screen.exe')) then
      Result := True;
  end;
end;

procedure InitializeWizard();
begin
  IsExistingInstall := CheckIfInstalled();

  if IsExistingInstall then
  begin
    // Create custom upgrade mode page
    UpgradeModePage := CreateInputOptionPage(
      wpInfoBefore,
      'Upgrade Mode Selection',
      'An existing installation of Ocal Screen was detected on this system.',
      'Select how you would like Setup to perform this v2.9.00 upgrade:',
      True, False
    );

    UpgradeModePage.Add(
      'Full Studio Upgrade (Recommended)'#13#10 +
      '   Performs a clean, complete install: Purges previous application binaries'#13#10 +
      '   and cached runtime files before installing v2.9.00 Stable. User projects,'#13#10 +
      '   recordings, and studio preferences remain completely safe and intact.'
    );
    UpgradeModePage.Add(
      'Express Update'#13#10 +
      '   Directly updates and overwrites existing files in place.'
    );
    UpgradeModePage.Add(
      'Clean Fresh Install'#13#10 +
      '   Wipes previous installation folder completely and performs a fresh setup.'
    );

    UpgradeModePage.SelectedValueIndex := 0;

    // Update Welcome labels dynamically
    WizardForm.WelcomeLabel1.Caption := 'Welcome to Ocal Screen v2.9.00 Stable Upgrade';
    WizardForm.WelcomeLabel2.Caption :=
      'Setup detected an existing version of Ocal Screen.'#13#10#13#10 +
      'This wizard will upgrade your installation to Ocal Screen v2.9.00 Stable with all new features, studio layouts, and performance improvements.'#13#10#13#10 +
      'Click Next to review the detailed feature catalog and configure your upgrade.';
  end;
end;

function ShouldSkipPage(PageID: Integer): Boolean;
begin
  Result := False;
  // If not upgrading, skip the upgrade mode choice page
  if (UpgradeModePage <> nil) and (PageID = UpgradeModePage.ID) and (not IsExistingInstall) then
    Result := True;
end;

procedure CleanLegacyApplicationFiles(AppDir: String);
var
  FindRec: TFindRec;
begin
  // Remove files in the root of the app directory to ensure no legacy DLLs or EXEs linger
  if FindFirst(AppDir + '\*.*', FindRec) then
  begin
    try
      repeat
        if (FindRec.Name <> '.') and (FindRec.Name <> '..') and
           (FindRec.Attributes and FILE_ATTRIBUTE_DIRECTORY = 0) then
        begin
          DeleteFile(AppDir + '\' + FindRec.Name);
        end;
      until not FindNext(FindRec);
    finally
      FindClose(FindRec);
    end;
  end;

  // Clean out resources folder (old app.asar, etc.) if it exists
  if DirExists(AppDir + '\resources') then
  begin
    DelTree(AppDir + '\resources', True, True, True);
  end;

  // Clean out locales if it exists
  if DirExists(AppDir + '\locales') then
  begin
    DelTree(AppDir + '\locales', True, True, True);
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  TargetAppDir: String;
begin
  if (CurStep = ssInstall) and IsExistingInstall and (UpgradeModePage <> nil) then
  begin
    TargetAppDir := ExpandConstant('{app}');
    // Mode 0: Full Studio Upgrade (Clean purge of binaries before extraction)
    if (UpgradeModePage.SelectedValueIndex = 0) or (UpgradeModePage.SelectedValueIndex = 2) then
    begin
      WizardForm.StatusLabel.Caption := 'Preparing Full Clean Studio Upgrade... Cleaning legacy files...';
      if DirExists(TargetAppDir) then
      begin
        CleanLegacyApplicationFiles(TargetAppDir);
      end;
    end;
  end;
end;
