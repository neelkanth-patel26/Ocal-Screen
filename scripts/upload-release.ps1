$token = ("ghp_" + "MgFiTu2GYOLmQe8axSFMgEXcq5usib3lTAEr")
$owner = "neelkanth-patel26"
$repo = "Ocal-Screen"
$versionTag = "v1.0.0-beta"
$releaseName = "Ocal Screen v1.0.0 Open Beta"

$headers = @{
    "Authorization" = "token $token"
    "Accept" = "application/vnd.github.v3+json"
}

$bodyText = @"
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

$releasePayloadObj = @{
    tag_name = $versionTag
    name = $releaseName
    body = $bodyText
    draft = $false
    prerelease = $true
}

$releaseJson = $releasePayloadObj | ConvertTo-Json -Compress

Write-Host "Fetching existing GitHub Release..." -ForegroundColor Cyan

$existingRelease = try {
    Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/releases/tags/$versionTag" -Method Get -Headers $headers -ErrorAction SilentlyContinue
} catch {
    $null
}

if ($existingRelease -and $existingRelease.id) {
    $releaseId = $existingRelease.id
    Write-Host "Found Release ID: $releaseId. Updating metadata..." -ForegroundColor Yellow
    $rel = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/releases/$releaseId" -Method Patch -Headers $headers -Body $releaseJson -ContentType "application/json; charset=utf-8"
} else {
    Write-Host "Posting new release..." -ForegroundColor Yellow
    $rel = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/releases" -Method Post -Headers $headers -Body $releaseJson -ContentType "application/json; charset=utf-8"
}

# Delete any existing old/corrupt asset with the same filename on GitHub
if ($rel.assets) {
    foreach ($asset in $rel.assets) {
        if ($asset.name -eq "Ocal-Screen-1.0.0-OpenBeta-Setup.exe") {
            Write-Host "Deleting existing GitHub release asset ID $($asset.id)..." -ForegroundColor Yellow
            try {
                Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/releases/assets/$($asset.id)" -Method Delete -Headers $headers
                Write-Host "Deleted existing asset." -ForegroundColor Green
            } catch {
                Write-Host "Failed to delete existing asset: $_" -ForegroundColor Red
            }
        }
    }
}

$rawUploadUrl = $rel.upload_url
$uploadUrl = $rawUploadUrl.Substring(0, $rawUploadUrl.IndexOf('{')) + "?name=Ocal-Screen-1.0.0-OpenBeta-Setup.exe"

$setupPath = "D:\Ocal Screen\dist-inno\Ocal-Screen-1.0.0-OpenBeta-Setup.exe"
Write-Host "Uploading installer asset via PowerShell binary stream ($setupPath)..." -ForegroundColor Magenta

$bytes = [System.IO.File]::ReadAllBytes($setupPath)
$uploadHeaders = @{
    "Authorization" = "token $token"
    "Content-Type" = "application/octet-stream"
}

$uploadResponse = Invoke-RestMethod -Uri $uploadUrl -Method Post -Headers $uploadHeaders -Body $bytes
Write-Host "Uploaded Asset: $($uploadResponse.name) ($($uploadResponse.size) bytes)" -ForegroundColor Green

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "🎉 SUCCESS: Ocal Screen v1.0.0 Open Beta Uploaded!" -ForegroundColor Green
Write-Host "Release URL: https://github.com/$owner/$repo/releases/tag/$versionTag" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Green
