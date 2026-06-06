$ffmpeg = "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.1-full_build\bin\ffmpeg.exe"

Write-Host "=== Compressing ALL project images to WebP ===" -ForegroundColor Cyan

function Convert-ToWebP {
    param($folder, $label)
    
    $pngs = Get-ChildItem $folder -Recurse -File | Where-Object { 
        $_.Extension -in @('.png', '.jpg', '.jpeg') -and 
        $_.Name -ne 'bg.png' -and
        $_.Length -gt 10KB
    }
    
    if ($pngs.Count -eq 0) { Write-Host "  No images found in $label"; return }
    
    $origTotal = ($pngs | Measure-Object Length -Sum).Sum
    $newTotal = 0; $count = 0
    
    Write-Host ""
    Write-Host "[$label] $($pngs.Count) files | $([math]::Round($origTotal/1MB,1)) MB" -ForegroundColor Yellow
    
    foreach ($png in $pngs) {
        $webpPath = [System.IO.Path]::ChangeExtension($png.FullName, '.webp')
        
        # Skip if webp already exists and is smaller
        if ((Test-Path $webpPath) -and (Get-Item $webpPath).Length -lt $png.Length) {
            $newTotal += (Get-Item $webpPath).Length
            continue
        }
        
        & $ffmpeg -i $png.FullName -vf "scale='min(1200,iw)':'-2'" -quality 75 $webpPath -y 2>$null
        
        if (Test-Path $webpPath) {
            $newSize = (Get-Item $webpPath).Length
            if ($newSize -lt $png.Length) {
                $newTotal += $newSize
                # Remove original PNG
                Remove-Item $png.FullName -Force
                $count++
            } else {
                Remove-Item $webpPath -Force
                $newTotal += $png.Length
            }
        } else {
            $newTotal += $png.Length
        }
    }
    
    $saved = $origTotal - $newTotal
    $pct = if ($origTotal -gt 0) { [math]::Round(($saved/$origTotal)*100,0) } else { 0 }
    Write-Host "  Converted: $count files | $([math]::Round($origTotal/1MB,1)) MB -> $([math]::Round($newTotal/1MB,1)) MB (-$pct%)" -ForegroundColor Green
    
    return $saved
}

$total1 = Convert-ToWebP "public" "public/ (root)"
$total2 = Convert-ToWebP "public\images" "public/images/ (templates)"

$grandTotal = $total1 + $total2
Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host ("TOTAL SAVED: " + [math]::Round($grandTotal/1MB,1) + " MB") -ForegroundColor Green
Write-Host "Done! All images are now WebP" -ForegroundColor Cyan
