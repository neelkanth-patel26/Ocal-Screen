# Script to resize 1024x1024.png master logo into all PNG resolutions and build Windows icon.ico
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$masterPath = "icons\icons\png\1024x1024.png"
if (-not (Test-Path $masterPath)) {
    throw "Master icon not found at: $masterPath"
}

Write-Host "Loading master logo: $masterPath..." -ForegroundColor Cyan
$masterImage = [System.Drawing.Bitmap]::FromFile((Resolve-Path $masterPath).Path)

$sizes = @(16, 24, 32, 48, 64, 128, 256, 512)

function Resize-PNG ($srcBitmap, $targetSize, $outputPath) {
    $destBitmap = New-Object System.Drawing.Bitmap($targetSize, $targetSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($destBitmap)
    
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $graphics.DrawImage($srcBitmap, 0, 0, $targetSize, $targetSize)
    $graphics.Dispose()
    
    $destBitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $destBitmap.Dispose()
    Write-Host "Generated: $outputPath ($targetSize x $targetSize)" -ForegroundColor Green
}

# 1. Generate PNG resolutions
foreach ($s in $sizes) {
    $outPng = "icons\icons\png\${s}x${s}.png"
    Resize-PNG $masterImage $s $outPng
}

# Copy to public/openscreen.png
Copy-Item "icons\icons\png\512x512.png" "public\openscreen.png" -Force
Write-Host "Updated public\openscreen.png" -ForegroundColor Green

# 2. Build multi-resolution Windows ICO file (16, 24, 32, 48, 64, 128, 256)
Write-Host "`nGenerating multi-resolution Windows icon.ico..." -ForegroundColor Cyan
$icoSizes = @(16, 24, 32, 48, 64, 128, 256)

$pngBytesList = @()
foreach ($s in $icoSizes) {
    $pngPath = "icons\icons\png\${s}x${s}.png"
    $pngBytesList += ,(Get-Content $pngPath -Encoding Byte -ReadCount 0)
}

$stream = New-Object System.IO.MemoryStream
$writer = New-Object System.IO.BinaryWriter($stream)

# ICO Header (6 bytes)
$writer.Write([uint16]0) # Reserved
$writer.Write([uint16]1) # Type (1 = ICO)
$writer.Write([uint16]$icoSizes.Count) # Count of images

$dataOffset = 6 + ($icoSizes.Count * 16)

# Directory Entries (16 bytes per image)
for ($i = 0; $i -lt $icoSizes.Count; $i++) {
    $size = $icoSizes[$i]
    $bytes = $pngBytesList[$i]
    
    $w = if ($size -ge 256) { [byte]0 } else { [byte]$size }
    $h = if ($size -ge 256) { [byte]0 } else { [byte]$size }
    
    $writer.Write($w)             # Width
    $writer.Write($h)             # Height
    $writer.Write([byte]0)        # Color palette (0 = no palette)
    $writer.Write([byte]0)        # Reserved
    $writer.Write([uint16]1)      # Color planes (1)
    $writer.Write([uint16]32)     # Bits per pixel (32)
    $writer.Write([uint32]$bytes.Length) # Image size in bytes
    $writer.Write([uint32]$dataOffset)   # Offset of image data
    
    $dataOffset += $bytes.Length
}

# Image Data Streams
for ($i = 0; $i -lt $icoSizes.Count; $i++) {
    $writer.Write($pngBytesList[$i])
}

$writer.Flush()

# Save ICO file to icons/icons/win/icon.ico and public/icon.ico
$icoPath = "icons\icons\win\icon.ico"
[System.IO.File]::WriteAllBytes((Resolve-Path "icons\icons\win").Path + "\icon.ico", $stream.ToArray())
Write-Host "Updated: $icoPath" -ForegroundColor Green

[System.IO.File]::WriteAllBytes((Resolve-Path "public").Path + "\icon.ico", $stream.ToArray())
Write-Host "Updated: public\icon.ico" -ForegroundColor Green

$writer.Close()
$stream.Close()
$masterImage.Dispose()

Write-Host "`nAll icon resolutions and Windows icon.ico updated successfully!" -ForegroundColor Green
