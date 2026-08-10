param(
    [string]$LocalRoot = 'C:\Users\Owner\Documents\GitHub\AdamMacInfo\GuestGuardInspectorTraining\optimized',
    [string]$PublicBase = 'https://pub-063eb51d973f4bffa47a49524c7dc247.r2.dev',
    [string]$Origin = 'https://inspector-training.guestguard.workers.dev'
)

$ErrorActionPreference = 'Stop'

$keys = @(
    'module1/module1_part1.mp4', 'module1/module1_part2.mp4', 'module1/module1_part3.mp4',
    'module2/module2_part1.mp4', 'module2/module2_part2.mp4', 'module2/module2_part3.mp4',
    'module2/module2_part4.mp4', 'module2/module2_part5.mp4',
    'module3/B1.mp4', 'module3/B2.mp4', 'module3/B3.mp4', 'module3/B4.mp4', 'module3/B5.mp4',
    'module3/B6.mp4', 'module3/B7.mp4', 'module3/B8.mp4', 'module3/B9.mp4', 'module3/B10.mp4',
    'module3/B11.mp4', 'module3/B12.mp4', 'module3/B13.mp4', 'module3/B14.mp4', 'module3/B15.mp4',
    'module4/propertywide.mp4', 'module4/propertywide_ipad.mp4',
    'module4/commonroom.mp4', 'module4/commonroom_ipad.mp4',
    'module4/kitchen.mp4', 'module4/kitchen_ipad.mp4',
    'module4/hallway.mp4', 'module4/hallway_ipad.mp4',
    'module4/bathroom.mp4', 'module4/bathroom_ipad.mp4',
    'module4/bedroom.mp4', 'module4/bedroom_ipad.mp4'
)

if (-not (Test-Path -LiteralPath $LocalRoot -PathType Container)) {
    throw "Local optimized folder not found: $LocalRoot"
}

$results = foreach ($key in $keys) {
    $localPath = Join-Path $LocalRoot ($key.Replace('/', [IO.Path]::DirectorySeparatorChar))
    if (-not (Test-Path -LiteralPath $localPath -PathType Leaf)) {
        [pscustomobject]@{ Key=$key; Status=0; LocalBytes=-1; RemoteBytes=-1; Pass=$false; Problem='local file missing' }
        continue
    }

    $localSize = (Get-Item -LiteralPath $localPath).Length
    $headerFile = [IO.Path]::GetTempFileName()
    try {
        & curl.exe -sS -D $headerFile -o NUL `
            -H "Origin: $Origin" `
            -H 'Range: bytes=0-0' `
            "$PublicBase/$key"

        if ($LASTEXITCODE -ne 0) {
            [pscustomobject]@{ Key=$key; Status=0; LocalBytes=$localSize; RemoteBytes=-1; Pass=$false; Problem='curl failed' }
            continue
        }

        $headers = Get-Content -LiteralPath $headerFile
        $statusLine = @($headers | Where-Object { $_ -match '^HTTP/' })[-1]
        $status = if ($statusLine -match '\s(\d{3})\s') { [int]$Matches[1] } else { 0 }
        $contentType = (($headers | Where-Object { $_ -match '^Content-Type:' }) -replace '^Content-Type:\s*', '').Trim()
        $allowOrigin = (($headers | Where-Object { $_ -match '^Access-Control-Allow-Origin:' }) -replace '^Access-Control-Allow-Origin:\s*', '').Trim()
        $acceptRanges = (($headers | Where-Object { $_ -match '^Accept-Ranges:' }) -replace '^Accept-Ranges:\s*', '').Trim()
        $contentRange = (($headers | Where-Object { $_ -match '^Content-Range:' }) -replace '^Content-Range:\s*', '').Trim()
        $remoteSize = if ($contentRange -match '/(\d+)$') { [int64]$Matches[1] } else { -1 }
        $pass = $status -eq 206 -and
            $contentType -eq 'video/mp4' -and
            $allowOrigin -eq $Origin -and
            $acceptRanges -eq 'bytes' -and
            $remoteSize -eq $localSize

        $problems = @()
        if ($status -ne 206) { $problems += "HTTP $status" }
        if ($contentType -ne 'video/mp4') { $problems += "type=$contentType" }
        if ($allowOrigin -ne $Origin) { $problems += 'CORS mismatch' }
        if ($acceptRanges -ne 'bytes') { $problems += 'range support missing' }
        if ($remoteSize -ne $localSize) { $problems += "size local=$localSize remote=$remoteSize" }

        [pscustomobject]@{
            Key = $key
            Status = $status
            LocalBytes = $localSize
            RemoteBytes = $remoteSize
            Pass = $pass
            Problem = $problems -join '; '
        }
    }
    finally {
        Remove-Item -LiteralPath $headerFile -Force -ErrorAction SilentlyContinue
    }
}

$results | Format-Table Key, Status, LocalBytes, RemoteBytes, Pass, Problem -AutoSize
$failed = @($results | Where-Object { -not $_.Pass })
Write-Host "`nPUBLIC URL AUDIT: $($results.Count - $failed.Count)/$($results.Count) passed; $($failed.Count) failed"
if ($failed.Count -gt 0) { exit 1 }

