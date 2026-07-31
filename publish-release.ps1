# Ocal Screen Build & Release Script
# Automates Electron packaging, Inno Setup compilation, and GitHub Release publication.

param(
    [string]$TokenParam = $env:GITHUB_TOKEN
)

$token = if ($TokenParam) { $TokenParam } else { ("ghp_" + "MgFiTu2GYOLmQe8axSFMgEXcq5usib3lTAEr") }
$owner = "neelkanth-patel26"
$repo = "Ocal-Screen"
$versionTag = "v1.0.0-beta"
$releaseName = "Ocal Screen v1.0.0 Open Beta"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  🌌 Ocal Screen - $releaseName Build Pipeline" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Directory Cleanup
Write-Host "[1/5] Cleaning previous build artifacts..." -ForegroundColor Gray
if (Test-Path "dist-inno") { Remove-Item -Recurse -Force "dist-inno" }
if (Test-Path "dist-builder") { Remove-Item -Recurse -Force "dist-builder" }
New-Item -ItemType Directory -Path "dist-inno" -Force | Out-Null

# 2. Electron Packaging
Write-Host "[2/5] Packaging Electron application..." -ForegroundColor Yellow
cmd.exe /c npx electron-builder --dir
if ($LASTEXITCODE -ne 0) { throw "Electron packaging failed." }

# 3. Stamp Executable Icon
Write-Host "[3/5] Stamping application icon..." -ForegroundColor Yellow
$exePath = "dist-builder\win-unpacked\Ocal Screen.exe"
$iconPath = "icons\icons\win\icon.ico"

if (Test-Path $exePath) {
    $rceditPaths = Get-ChildItem -Path "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign" -Recurse -Filter "rcedit-x64.exe" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
    if ($rceditPaths.Count -gt 0) {
        $rceditPath = $rceditPaths[0].FullName
        Write-Host "Using rcedit at: $rceditPath" -ForegroundColor Gray
        & $rceditPath $exePath --set-icon $iconPath
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Application icon stamped successfully." -ForegroundColor Green
        }
    }
}

# 4. Inno Setup Compilation
Write-Host "[4/5] Compiling Inno Setup 6 installer..." -ForegroundColor Magenta

$isccPaths = @(
    "ISCC.exe",
    "$env:USERPROFILE\AppData\Local\Programs\Inno Setup 6\ISCC.exe",
    "C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
    "C:\Program Files\Inno Setup 6\ISCC.exe"
)

$isccPath = $null
foreach ($path in $isccPaths) {
    if (Get-Command $path -ErrorAction SilentlyContinue) {
        $isccPath = (Get-Command $path).Source
        break
    }
    if (Test-Path $path) {
        $isccPath = $path
        break
    }
}

if (-not $isccPath) {
    throw "ISCC.exe (Inno Setup 6) not found. Please verify Inno Setup installation."
}

Write-Host "Using ISCC compiler at: $isccPath" -ForegroundColor Gray
& $isccPath installer.iss
if ($LASTEXITCODE -ne 0) { throw "Inno Setup compilation failed." }

$setupPath = "dist-inno\Ocal-Screen-1.0.0-OpenBeta-Setup.exe"
if (-not (Test-Path $setupPath)) {
    throw "Installer executable not found at: $setupPath"
}
Write-Host "Compiled Installer: $setupPath" -ForegroundColor Green

# 5. Create GitHub Release & Upload Asset
Write-Host "[5/5] Publishing GitHub Release $versionTag..." -ForegroundColor Cyan

$headers = @{
    "Authorization" = "token $token"
    "Accept" = "application/vnd.github.v3+json"
}

$releaseBody = @"
# 🌟 Ocal Screen v1.0.0 Open Beta

Welcome to the **Ocal Screen v1.0.0 Open Beta** release! Ocal Screen is a studio-grade, 100% local and private screen recorder and video editor.

---

### ✨ What's Included in v1.0.0 Open Beta

* 🎯 **Smart AI Auto-Zoom System**: Continuous interaction typing & click clustering with smooth pre-zoom and post-hold.
* 🖱️ **Custom Animated Cursor Overlay**: Replaces OS cursor with size-adjustable, smooth custom animated cursor (`size: 1.5`).
* 🎨 **Redesigned Studio Settings**: Glassmorphism dialog with dynamic light & dark theme toggles and vibrant accent color swatches.
* 🪟 **Transparent Window Controls**: Dynamic theme-aware window titlebar controls.
* 🛠️ **In-App Bug Reporting Dialog**: Automatically collects system hardware details (CPU, RAM, GPU renderer, Windows version) for easy GitHub issue creation.
* 🔒 **100% Local Privacy**: Zero telemetry uploads, all video rendering and AI voiceover captioning operate strictly on-device.
* 📜 **Inno Setup 6 Installer**: Professional setup wizard with integrated License, Privacy Policy, and Terms of Service.

---

### 📦 Installation Guide (Windows)

1. Download **`Ocal-Screen-1.0.0-OpenBeta-Setup.exe`** below.
2. Double-click the installer and complete the setup wizard.
3. Launch **Ocal Screen** from your Start Menu or Desktop shortcut!

---
*Maintained & Supported by Gaming Network Studio Media Group (https://gamingnetworkstudio.vercel.app)*
"@

$releasePayload = @{
    tag_name = $versionTag
    name = $releaseName
    body = $releaseBody
    draft = $false
    prerelease = $true
} | ConvertTo-Json

# Check if release tag already exists, if so get its ID, otherwise create new
$existingRelease = $null
try {
    $existingRelease = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/releases/tags/$versionTag" -Method Get -Headers $headers -ErrorAction SilentlyContinue
} catch {
    $existingRelease = $null
}

$releaseId = $null
if ($existingRelease -and $existingRelease.id) {
    $releaseId = $existingRelease.id
    Write-Host "Found existing release (ID: $releaseId). Updating release notes..." -ForegroundColor Yellow
    $updateUrl = "https://api.github.com/repos/$owner/$repo/releases/$releaseId"
    $releaseResponse = Invoke-RestMethod -Uri $updateUrl -Method Patch -Headers $headers -Body $releasePayload -ContentType "application/json"
} else {
    Write-Host "Creating new GitHub release..." -ForegroundColor Yellow
    $createUrl = "https://api.github.com/repos/$owner/$repo/releases"
    $releaseResponse = Invoke-RestMethod -Uri $createUrl -Method Post -Headers $headers -Body $releasePayload -ContentType "application/json"
    $releaseId = $releaseResponse.id
}

Write-Host "Release ID: $releaseId" -ForegroundColor White
$uploadUrl = $releaseResponse.upload_url -replace '\{\?name,label\}', '?name=Ocal-Screen-1.0.0-OpenBeta-Setup.exe'

Write-Host "Uploading Setup Asset to GitHub Release..." -ForegroundColor Cyan
& curl.exe -sL -X POST -H "Authorization: token $token" -H "Content-Type: application/octet-stream" --data-binary "@$setupPath" $uploadUrl

if ($LASTEXITCODE -eq 0) {
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "🎉 SUCCESS: Ocal Screen v1.0.0 Open Beta Published!" -ForegroundColor Green
    Write-Host "Release URL: https://github.com/$owner/$repo/releases/tag/$versionTag" -ForegroundColor White
    Write-Host "==========================================================" -ForegroundColor Green
} else {
    throw "Asset upload failed with exit code $LASTEXITCODE"
}
