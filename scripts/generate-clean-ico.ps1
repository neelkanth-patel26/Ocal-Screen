# Script to generate 100% transparent, multi-resolution Windows ICO file from PNG master logo
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
    
    # Ensure transparent background fill
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $graphics.DrawImage($srcBitmap, 0, 0, $targetSize, $targetSize)
    $graphics.Dispose()
    return $destBitmap
}

# 1. Save transparent PNG files
foreach ($s in $sizes) {
    $outPng = "icons\icons\png\${s}x${s}.png"
    $bmp = Resize-Bitmap $masterImage $s
    $bmp.Save($outPng, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Saved transparent PNG: $outPng ($s x $s)" -ForegroundColor Green
}

# Update public/openscreen.png
Copy-Item "icons\icons\png\512x512.png" "public\openscreen.png" -Force
Write-Host "Updated public\openscreen.png" -ForegroundColor Green

# 2. Build multi-resolution ICO containing PNG streams with 100% transparent alpha channels
Write-Host "`nBuilding transparent Windows multi-resolution icon.ico..." -ForegroundColor Cyan
$icoSizes = @(16, 24, 32, 48, 64, 128, 256)

$pngBytesList = @()
foreach ($s in $icoSizes) {
    $pngPath = "icons\icons\png\${s}x${s}.png"
    $bytes = [System.IO.File]::ReadAllBytes((Resolve-Path $pngPath).Path)
    $pngBytesList += ,$bytes
}

$ms = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter($ms)

# Header
$bw.Write([uint16]0) # Reserved
$bw.Write([uint16]1) # Type 1 = ICO
$bw.Write([uint16]$icoSizes.Count) # Image count

$offset = 6 + ($icoSizes.Count * 16)

# Directory entries
for ($i = 0; $i -lt $icoSizes.Count; $i++) {
    $size = $icoSizes[$i]
    $bytes = $pngBytesList[$i]
    
    $w = if ($size -ge 256) { [byte]0 } else { [byte]$size }
    $h = if ($size -ge 256) { [byte]0 } else { [byte]$size }
    
    $bw.Write($w)                    # Width
    $bw.Write($h)                    # Height
    $bw.Write([byte]0)               # Color count (0)
    $bw.Write([byte]0)               # Reserved (0)
    $bw.Write([uint16]1)             # Planes (1)
    $bw.Write([uint16]32)            # Bit count (32)
    $bw.Write([uint32]$bytes.Length) # Bytes in resource
    $bw.Write([uint32]$offset)       # Image offset
    
    $offset += $bytes.Length
}

# Image Data
for ($i = 0; $i -lt $icoSizes.Count; $i++) {
    $bw.Write($pngBytesList[$i])
}

$bw.Flush()
$icoData = $ms.ToArray()
$bw.Close()
$ms.Close()

$winIcoPath = (Resolve-Path "icons\icons\win").Path + "\icon.ico"
$pubIcoPath = (Resolve-Path "public").Path + "\icon.ico"

[System.IO.File]::WriteAllBytes($winIcoPath, $icoData)
Write-Host "Saved 100% transparent Windows ICO: $winIcoPath ($([math]::Round($icoData.Length / 1KB, 2)) KB)" -ForegroundColor Green

[System.IO.File]::WriteAllBytes($pubIcoPath, $icoData)
Write-Host "Saved public ICO: $pubIcoPath" -ForegroundColor Green

$masterImage.Dispose()

Write-Host "`nTransparent icons and Windows icon.ico generated successfully!" -ForegroundColor Green
