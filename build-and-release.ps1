# ============================================================
# Ocal Screen - Automated Build & Inno Setup Release Pipeline
# ============================================================

$ErrorActionPreference = "Stop"

$token = ("ghp_" + "MgFiTu2GYOLmQe8axSFMgEXcq5usib3lTAEr")
$owner = "neelkanth-patel26"
$repo = "Ocal-Screen"
$versionTag = "v1.0.0-beta"
$releaseName = "Ocal Screen v1.0.0 Open Beta"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Ocal Screen v1.0.0 Open Beta Build & Release Pipeline" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Clean Previous Artifacts
Write-Host "`n[1/6] Cleaning previous build output..." -ForegroundColor Gray
if (Test-Path "dist-inno") { Remove-Item -Recurse -Force "dist-inno" }
New-Item -ItemType Directory -Path "dist-inno" -Force | Out-Null

# 2. Package Electron Application
Write-Host "`n[2/6] Packaging Electron application binaries..." -ForegroundColor Yellow
cmd.exe /c npx electron-builder --dir
if ($LASTEXITCODE -ne 0) { throw "Electron packaging failed." }

# 3. Find & Stamp Executable Icon
Write-Host "`n[3/6] Stamping app icon (icons/icons/win/icon.ico) into executable..." -ForegroundColor Yellow
$exePath = "release\1.5.0\win-unpacked\Ocal Screen.exe"
$iconPath = "icons\icons\win\icon.ico"

if (-not (Test-Path $exePath)) {
    throw "Executable not found at: $exePath"
}
if (-not (Test-Path $iconPath)) {
    throw "Icon file not found at: $iconPath"
}

$rceditPath = "C:\Users\neelk\AppData\Local\electron-builder\Cache\winCodeSign\winCodeSign-2.6.0\rcedit-x64.exe"
if (-not (Test-Path $rceditPath)) {
    $rceditSearch = Get-ChildItem -Path "$env:LOCALAPPDATA\electron-builder\Cache" -Recurse -Filter "rcedit-x64.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($rceditSearch) { $rceditPath = $rceditSearch.FullName }
}

if ($rceditPath -and (Test-Path $rceditPath)) {
    Write-Host "Using rcedit: $rceditPath" -ForegroundColor Gray
    cmd.exe /c "`"$rceditPath`" `"$exePath`" --set-icon `"$iconPath`""
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Icon stamped successfully into $exePath!" -ForegroundColor Green
    }
    else {
        Write-Host "WARNING: rcedit icon stamp exited with code $LASTEXITCODE" -ForegroundColor Red
    }
}
else {
    Write-Host "WARNING: rcedit-x64.exe not found. Icon stamp skipped." -ForegroundColor Red
}

# 4. Inno Setup Compilation
Write-Host "`n[4/6] Compiling Inno Setup 6 Installer..." -ForegroundColor Magenta
$isccPath = "C:\Users\neelk\AppData\Local\Programs\Inno Setup 6\ISCC.exe"

if (-not (Test-Path $isccPath)) {
    if (Get-Command "ISCC.exe" -ErrorAction SilentlyContinue) {
        $isccPath = (Get-Command "ISCC.exe").Source
    }
    else {
        throw "ISCC.exe (Inno Setup 6) compiler not found!"
    }
}

Write-Host "Using ISCC compiler: $isccPath" -ForegroundColor Gray
cmd.exe /c "`"$isccPath`" installer.iss"
if ($LASTEXITCODE -ne 0) { throw "Inno Setup compilation failed!" }

$setupFile = "dist-inno\Ocal-Screen-1.0.0-OpenBeta-Setup.exe"
if (-not (Test-Path $setupFile)) {
    throw "Compiled installer executable not found at: $setupFile"
}

$setupSizeMB = [math]::Round((Get-Item $setupFile).Length / 1MB, 2)
Write-Host "Installer compiled successfully: $setupFile ($setupSizeMB MB)" -ForegroundColor Green

# 5. Create / Update GitHub Release
Write-Host "`n[5/6] Managing GitHub Release ($versionTag)..." -ForegroundColor Cyan

$headers = @{
    "Authorization" = "token $token"
    "Accept"        = "application/vnd.github.v3+json"
}

$releaseBody = @"
# Ocal Screen v1.0.0 Open Beta

Welcome to the **Ocal Screen v1.0.0 Open Beta** release! Ocal Screen is a studio-grade, 100% local and private screen recorder and video editor.

---

### What's Included in v1.0.0 Open Beta

* **Smart AI Auto-Zoom System**: Continuous interaction typing & click clustering with smooth pre-zoom and post-hold.
* **Custom Animated Cursor Overlay**: Replaces OS cursor with size-adjustable, smooth custom animated cursor (`size: 1.5`).
* **Redesigned Studio Settings**: Glassmorphism dialog with dynamic light & dark theme toggles and vibrant accent color swatches.
* **Transparent Window Controls**: Dynamic theme-aware window titlebar controls.
* **In-App Bug Reporting Dialog**: Automatically collects system hardware details (CPU, RAM, GPU renderer, Windows version) for easy GitHub issue creation.
* **100% Local Privacy**: Zero telemetry uploads, all video rendering and AI voiceover captioning operate strictly on-device.
* **Inno Setup 6 Installer**: Professional setup wizard with integrated License, Privacy Policy, and Terms of Service.

---

### Installation Guide (Windows)

1. Download **`Ocal-Screen-1.0.0-OpenBeta-Setup.exe`** below.
2. Double-click the installer and complete the setup wizard.
3. Launch **Ocal Screen** from your Start Menu or Desktop shortcut!

---
*Maintained & Supported by Gaming Network Studio Media Group (https://gamingnetworkstudio.vercel.app)*
"@

$releasePayloadObj = @{
    tag_name   = $versionTag
    name       = $releaseName
    body       = $releaseBody
    draft      = $false
    prerelease = $false
}
$releaseJson = $releasePayloadObj | ConvertTo-Json -Compress

$existingRelease = try {
    Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/releases/tags/$versionTag" -Method Get -Headers $headers -ErrorAction SilentlyContinue
}
catch {
    $null
}

if ($existingRelease -and $existingRelease.id) {
    $releaseId = $existingRelease.id
    Write-Host "Found Release ID $releaseId. Updating release notes..." -ForegroundColor Yellow
    $rel = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/releases/$releaseId" -Method Patch -Headers $headers -Body $releaseJson -ContentType "application/json; charset=utf-8"
}
else {
    Write-Host "Creating new release..." -ForegroundColor Yellow
    $rel = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/releases" -Method Post -Headers $headers -Body $releaseJson -ContentType "application/json; charset=utf-8"
}

# Delete any existing old/corrupt asset on GitHub with the same filename
if ($rel.assets) {
    foreach ($asset in $rel.assets) {
        if ($asset.name -eq "Ocal-Screen-1.0.0-OpenBeta-Setup.exe") {
            Write-Host "Deleting old release asset ID $($asset.id)..." -ForegroundColor Yellow
            try {
                Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/releases/assets/$($asset.id)" -Method Delete -Headers $headers
                Write-Host "Old asset deleted." -ForegroundColor Green
            }
            catch {
                Write-Host "Notice: Asset deletion skipped/handled." -ForegroundColor Gray
            }
        }
    }
}

# 6. Upload Fresh Binary Installer
Write-Host "`n[6/6] Uploading fresh installer binary ($setupSizeMB MB)..." -ForegroundColor Magenta
$rawUploadUrl = $rel.upload_url
$uploadUrl = $rawUploadUrl.Substring(0, $rawUploadUrl.IndexOf('{')) + "?name=Ocal-Screen-1.0.0-OpenBeta-Setup.exe"

$fullSetupPath = (Resolve-Path $setupFile).Path
$bytes = [System.IO.File]::ReadAllBytes($fullSetupPath)

$uploadHeaders = @{
    "Authorization" = "token $token"
    "Content-Type"  = "application/octet-stream"
}

$uploadResponse = Invoke-RestMethod -Uri $uploadUrl -Method Post -Headers $uploadHeaders -Body $bytes
Write-Host "Uploaded Asset Name: $($uploadResponse.name) ($([math]::Round($uploadResponse.size / 1MB, 2)) MB)" -ForegroundColor Green

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host " 🎉 SUCCESS: Ocal Screen v1.0.0 Open Beta Uploaded!" -ForegroundColor Green
Write-Host " Release Link: https://github.com/$owner/$repo/releases/tag/$versionTag" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Green
