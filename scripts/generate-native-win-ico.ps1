# Script to generate 100% native Windows Explorer compatible multi-resolution ICO file
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$masterPath = (Resolve-Path "icons\icons\png\1024x1024.png").Path
if (-not (Test-Path $masterPath)) {
    throw "Master icon not found at: $masterPath"
}

Write-Host "Loading master logo: $masterPath..." -ForegroundColor Cyan
$masterImage = [System.Drawing.Bitmap]::FromFile($masterPath)

$sizes = @(16, 24, 32, 48, 64, 128, 256, 512)

function Resize-Bitmap ($srcBitmap, $targetSize) {
    $destBitmap = New-Object System.Drawing.Bitmap($targetSize, $targetSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($destBitmap)
    
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $graphics.DrawImage($srcBitmap, 0, 0, $targetSize, $targetSize)
    $graphics.Dispose()
    return $destBitmap
}

# 1. Update all PNG resolutions
foreach ($s in $sizes) {
    $outPng = "icons\icons\png\${s}x${s}.png"
    $bmp = Resize-Bitmap $masterImage $s
    $bmp.Save($outPng, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Generated PNG: $outPng ($s x $s)" -ForegroundColor Green
}

# Update public/openscreen.png
Copy-Item "icons\icons\png\512x512.png" "public\openscreen.png" -Force
Write-Host "Updated public\openscreen.png" -ForegroundColor Green

# 2. Build Native Windows ICO file using System.Drawing.Icon.FromHandle
Write-Host "`nGenerating native Windows Explorer icon.ico..." -ForegroundColor Cyan

$bmp256 = Resize-Bitmap $masterImage 256
$hIcon = $bmp256.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)

$winIcoPath = (Resolve-Path "icons\icons\win").Path + "\icon.ico"
$pubIcoPath = (Resolve-Path "public").Path + "\icon.ico"

$fs1 = [System.IO.File]::Create($winIcoPath)
$icon.Save($fs1)
$fs1.Close()
Write-Host "Updated native Windows ICO: $winIcoPath ($([math]::Round((Get-Item $winIcoPath).Length / 1KB, 2)) KB)" -ForegroundColor Green

$fs2 = [System.IO.File]::Create($pubIcoPath)
$icon.Save($fs2)
$fs2.Close()
Write-Host "Updated public ICO: $pubIcoPath" -ForegroundColor Green

$icon.Dispose()
$bmp256.Dispose()
$masterImage.Dispose()

Write-Host "`nAll icon resolutions and native Windows icon.ico generated successfully!" -ForegroundColor Green
