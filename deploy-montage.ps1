$maxRetries = 15
$attempt = 0
$success = $false

Write-Host "=== Firebase Deploy with Auto-Retry ===" -ForegroundColor Cyan
Write-Host "Target: ai-roadmap-nadeem-montage" -ForegroundColor Yellow
Write-Host ""

while (-not $success -and $attempt -lt $maxRetries) {
    $attempt++
    Write-Host "--- Attempt $attempt of $maxRetries ---" -ForegroundColor Magenta

    $output = firebase deploy --only hosting 2>&1
    $exitCode = $LASTEXITCODE

    $output | ForEach-Object { Write-Host $_ }

    if ($exitCode -eq 0) {
        $success = $true
        Write-Host ""
        Write-Host "SUCCESS! Deployed to ai-roadmap-nadeem-montage" -ForegroundColor Green
        Write-Host "URL: https://montage.ai4roadmap.com" -ForegroundColor Cyan
    } else {
        if ($attempt -lt $maxRetries) {
            $waitSec = 5 + ($attempt * 2)
            Write-Host ""
            Write-Host "Upload failed - waiting $waitSec seconds then retrying..." -ForegroundColor Yellow
            Write-Host "(Each retry uploads more files to cache, progress accumulates)" -ForegroundColor DarkGray
            Start-Sleep -Seconds $waitSec
        } else {
            Write-Host ""
            Write-Host "Max retries reached. Check your internet connection." -ForegroundColor Red
        }
    }
}
