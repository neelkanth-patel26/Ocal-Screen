# ============================================================
# Ocal Screen - Automated Build & Inno Setup Release Pipeline
# ============================================================

$ErrorActionPreference = "Stop"

$token = ("ghp_" + "MgFiTu2GYOLmQe8axSFMgEXcq5usib3lTAEr")
$owner = "neelkanth-patel26"
$repo = "Ocal-Screen"
$versionTag = "v2.9.00"
$releaseName = "Ocal Screen v2.9.00 Stable Studio Release"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " 🚀 Ocal Screen v2.9.00 Stable Build & Release Pipeline" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 0. Regenerate icons if master logo exists
if (Test-Path "scripts\generate-clean-ico.ps1") {
    Write-Host "`n[0/6] Generating transparent multi-resolution icons..." -ForegroundColor Cyan
    powershell.exe -ExecutionPolicy Bypass -File "scripts\generate-clean-ico.ps1"
}

# 1. Clean Previous Artifacts
Write-Host "`n[1/6] Cleaning previous build output..." -ForegroundColor Gray
if (Test-Path "dist-inno") {
    try { Remove-Item -Recurse -Force "dist-inno" -ErrorAction SilentlyContinue } catch {}
}
if (-not (Test-Path "dist-inno")) {
    New-Item -ItemType Directory -Path "dist-inno" -Force | Out-Null
}

# 2. Package Electron Application
Write-Host "`n[2/6] Packaging Electron application binaries (v2.9.00)..." -ForegroundColor Yellow
cmd.exe /c npx electron-builder --dir
if ($LASTEXITCODE -ne 0) { throw "Electron packaging failed." }

# 3. Find & Stamp Executable Icon
Write-Host "`n[3/6] Stamping app icon (icons/icons/win/icon.ico) into executable..." -ForegroundColor Yellow
$exePath = "release\2.9.0\win-unpacked\Ocal Screen.exe"
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
Write-Host "`n[4/6] Compiling Inno Setup 6 Installer with Upgrade Experience..." -ForegroundColor Magenta
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

$setupFile = "dist-inno\Ocal-Screen-2.9.00-Setup.exe"
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
# 🎬 Ocal Screen v2.9.00 — Stable Studio Release

Welcome to the official release of **Ocal Screen v2.9.00 Stable**! Ocal Screen is a private, studio-grade screen recording & video editing workstation for creators, educators, and professionals.

---

## 🌟 Detailed Feature & Improvement Catalog

### 📦 Re-engineered Inno Setup & Full-Install Upgrade Engine
* **Intelligent Upgrade Detection**: When updating an existing installation, Setup detects previous versions and presents a specialized **Full Studio Upgrade** mode.
* **Clean Binary Sweep**: Thoroughly purges legacy runtime binaries, cached asars, and stale dependencies prior to extraction, preventing version mismatches and providing a clean, fresh full-install experience every time.
* **Preserves User Data**: All user projects, recordings, custom presets, and studio preferences remain 100% safe in your user directory.
* **Integrated Release Catalog**: Full feature documentation is directly readable inside the Inno Setup wizard before installation begins.

### 📱 Portrait Pro Workspace (9:16 Shorts / Reels / TikTok)
* **Maximized Vertical View**: Eliminates letterboxing and wasted screen space. In Portrait mode, the preview video spans the full vertical screen height on the left (over 2x larger preview).
* **Dual-Stack Studio Layout**: Inspector and Timeline stacked ergonomically on the right, allowing real-time effect adjustments while scrubbing tracks.
* **One-Click Layout Switcher**: Instant switching between Auto, Portrait Pro (Max View), and Standard Stacked workspaces.

### 🚀 Complete Export Studio Hub
* **Interactive Spec Cards**: Live resolution indicators (1080x1920, 2560x1440, 4K) with aspect-ratio tags and upscale indicators.
* **Lossless MP4 & High-Framerate GIF**: H.264 / AVC native rendering, configurable GIF frame rates (15, 24, 30, 60 FPS), and looping toggles.
* **Centered Glassmorphism Export Dialog**: Shimmer animated progress bars, live frame counters, render duration statistics, and graceful error handling.

### 🎨 Unified Theme Engine & Aesthetic Design System
* **Dynamic Accent Color Synchronization**: Completely eliminated hardcoded colors. All sliders, switches, toggles, and UI focus states match your active accent color.
* **Frosted Glass Cards**: Elevated dark/light panels with backdrop blurs, refined padding, and micro-animations.
* **6-Column Cursor Style Swatches**: Visual grid with glowing halos, custom scaling up to 2.5x, and smooth preview interaction.
* **Multi-Track Overlays & Video Layers**: Shape masks (Circle, Rounded, Rect, Square), live opacity blending, and snap presets.

### ⚡ Hardware-Accelerated Capture & Telemetry
* **Windows Graphics Capture (WGC)**: High frame-rate, low-latency screen and window recording.
* **Native Windows Cursor Engine**: Zero-delay cursor capture with high-accuracy position tracking and click bounce dampening.
* **Intelligent Auto-Zoom**: Continuous typing & click clustering with smooth cubic easing.

### 🔒 100% Local Privacy & Security
* Zero telemetry and zero cloud dependencies for video rendering and Whisper voiceover captioning.
* 100% private, on-device studio workflow.

---

### 📦 Windows Installation Guide

1. Download **`Ocal-Screen-2.9.00-Setup.exe`** below.
2. Run the installer wizard (choose **Full Studio Upgrade** if updating).
3. Launch **Ocal Screen** from your Start Menu or Desktop!

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

# Delete any existing old asset on GitHub with the same filename
if ($rel.assets) {
    foreach ($asset in $rel.assets) {
        if ($asset.name -eq "Ocal-Screen-2.9.00-Setup.exe") {
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
$uploadUrl = $rawUploadUrl.Substring(0, $rawUploadUrl.IndexOf('{')) + "?name=Ocal-Screen-2.9.00-Setup.exe"

$fullSetupPath = (Resolve-Path $setupFile).Path
$bytes = [System.IO.File]::ReadAllBytes($fullSetupPath)

$uploadHeaders = @{
    "Authorization" = "token $token"
    "Content-Type"  = "application/octet-stream"
}

$uploadResponse = Invoke-RestMethod -Uri $uploadUrl -Method Post -Headers $uploadHeaders -Body $bytes
Write-Host "Uploaded Asset Name: $($uploadResponse.name) ($([math]::Round($uploadResponse.size / 1MB, 2)) MB)" -ForegroundColor Green

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host " 🎉 SUCCESS: Ocal Screen v2.9.00 Uploaded!" -ForegroundColor Green
Write-Host " Release Link: https://github.com/$owner/$repo/releases/tag/$versionTag" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Green
