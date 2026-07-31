Add-Type -AssemblyName System.Drawing

$srcPath = (Resolve-Path "icons\icons\png\256x256.png").Path
$bmp = [System.Drawing.Bitmap]::FromFile($srcPath)
$hIcon = $bmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)

$destPath = (Resolve-Path "icons\icons\win").Path + "\icon.ico"
$fs = [System.IO.File]::Create($destPath)
$icon.Save($fs)
$fs.Close()

$icon.Dispose()
$bmp.Dispose()

Write-Host "Native Windows ICO saved to: $destPath" -ForegroundColor Green
