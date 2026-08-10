param(
    [string]$LocalRoot = 'W:\guest gaurd videos\video-work\optimized',
    [string]$Bucket = 'inspector-training-videos-guestguard',
    [string]$EndpointUrl = 'https://80b79e71262a5823d6536012847fc8fc.r2.cloudflarestorage.com'
)

$ErrorActionPreference = 'Stop'

$expectedKeys = @(
    'module1/module1_part1.mp4',
    'module1/module1_part2.mp4',
    'module1/module1_part3.mp4',
    'module2/module2_part1.mp4',
    'module2/module2_part2.mp4',
    'module2/module2_part3.mp4',
    'module2/module2_part4.mp4',
    'module2/module2_part5.mp4',
    'module3/B1.mp4',
    'module3/B2.mp4',
    'module3/B3.mp4',
    'module3/B4.mp4',
    'module3/B5.mp4',
    'module3/B6.mp4',
    'module3/B7.mp4',
    'module3/B8.mp4',
    'module3/B9.mp4',
    'module3/B10.mp4',
    'module3/B11.mp4',
    'module3/B12.mp4',
    'module3/B13.mp4',
    'module3/B14.mp4',
    'module3/B15.mp4',
    'module4/propertywide.mp4',
    'module4/propertywide_ipad.mp4',
    'module4/commonroom.mp4',
    'module4/commonroom_ipad.mp4',
    'module4/kitchen.mp4',
    'module4/kitchen_ipad.mp4',
    'module4/hallway.mp4',
    'module4/hallway_ipad.mp4',
    'module4/bathroom.mp4',
    'module4/bathroom_ipad.mp4',
    'module4/bedroom.mp4',
    'module4/bedroom_ipad.mp4'
)

if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
    throw 'AWS CLI was not found. Install Amazon.AWSCLI, close PowerShell, and open it again.'
}

if (-not $env:AWS_ACCESS_KEY_ID -or -not $env:AWS_SECRET_ACCESS_KEY) {
    throw 'AWS credentials are not loaded in this PowerShell window.'
}

function Get-RemoteObjects {
    $json = & aws s3api list-objects-v2 `
        --bucket $Bucket `
        --endpoint-url $EndpointUrl `
        --output json

    if ($LASTEXITCODE -ne 0) {
        throw 'Unable to list the R2 bucket.'
    }

    $response = $json | ConvertFrom-Json
    $objects = @{}
    foreach ($object in @($response.Contents)) {
        if ($null -ne $object) {
            $objects[[string]$object.Key] = [int64]$object.Size
        }
    }
    return $objects
}

Write-Host "Auditing $($expectedKeys.Count) expected videos..."
$remoteObjects = Get-RemoteObjects
$remoteMissing = @($expectedKeys | Where-Object { -not $remoteObjects.ContainsKey($_) })

Write-Host "R2 expected videos present: $($expectedKeys.Count - $remoteMissing.Count)/$($expectedKeys.Count)"
if ($remoteMissing.Count -gt 0) {
    Write-Host "R2 expected videos missing: $($remoteMissing.Count)" -ForegroundColor Yellow
    $remoteMissing | ForEach-Object { Write-Host "- $_" -ForegroundColor Yellow }
}
else {
    Write-Host 'All 35 expected video keys exist in R2.' -ForegroundColor Green
}

if (-not (Test-Path -LiteralPath $LocalRoot -PathType Container)) {
    if ($remoteMissing.Count -eq 0) {
        Write-Host "Local optimized folder is unavailable, so byte-for-byte local comparison was skipped: $LocalRoot" -ForegroundColor Yellow
        exit 0
    }

    throw "The R2 audit completed, but missing objects cannot be uploaded because this computer cannot see the optimized folder: $LocalRoot. Run this script on the encoding computer or pass its actual path with -LocalRoot."
}

$uploadQueue = @()
$missingLocal = @()

foreach ($key in $expectedKeys) {
    $relativeWindowsPath = $key.Replace('/', [IO.Path]::DirectorySeparatorChar)
    $localPath = Join-Path $LocalRoot $relativeWindowsPath

    if (-not (Test-Path -LiteralPath $localPath -PathType Leaf)) {
        $missingLocal += $key
        Write-Host "LOCAL MISSING  $key" -ForegroundColor Red
        continue
    }

    $localSize = (Get-Item -LiteralPath $localPath).Length
    if (-not $remoteObjects.ContainsKey($key)) {
        $uploadQueue += [pscustomobject]@{ Key=$key; Path=$localPath; Size=$localSize; Reason='missing' }
        Write-Host "R2 MISSING     $key" -ForegroundColor Yellow
    }
    elseif ($remoteObjects[$key] -ne $localSize) {
        $uploadQueue += [pscustomobject]@{ Key=$key; Path=$localPath; Size=$localSize; Reason='size mismatch' }
        Write-Host "SIZE MISMATCH  $key (local $localSize, R2 $($remoteObjects[$key]))" -ForegroundColor Yellow
    }
    else {
        Write-Host "OK             $key ($localSize bytes)" -ForegroundColor Green
    }
}

if ($missingLocal.Count -gt 0) {
    throw "Cannot complete: $($missingLocal.Count) expected optimized file(s) are missing locally."
}

Write-Host "`nObjects requiring upload: $($uploadQueue.Count)"
foreach ($item in $uploadQueue) {
    Write-Host "Uploading $($item.Key) because it is $($item.Reason)..." -ForegroundColor Cyan
    $destination = "s3://$Bucket/$($item.Key)"

    & aws s3 cp $item.Path $destination `
        --endpoint-url $EndpointUrl `
        --content-type 'video/mp4' `
        --cache-control 'public,max-age=3600' `
        --only-show-errors

    if ($LASTEXITCODE -ne 0) {
        throw "Upload failed: $($item.Key)"
    }
}

Write-Host "`nRunning final audit..."
$finalObjects = Get-RemoteObjects
$failures = @()
$totalBytes = [int64]0

foreach ($key in $expectedKeys) {
    $localPath = Join-Path $LocalRoot ($key.Replace('/', [IO.Path]::DirectorySeparatorChar))
    $localSize = (Get-Item -LiteralPath $localPath).Length

    if (-not $finalObjects.ContainsKey($key)) {
        $failures += "$key is absent from R2"
        continue
    }
    if ($finalObjects[$key] -ne $localSize) {
        $failures += "$key size differs: local $localSize, R2 $($finalObjects[$key])"
        continue
    }
    $totalBytes += $finalObjects[$key]
}

$unexpectedMp4 = @($finalObjects.Keys | Where-Object {
    $_.EndsWith('.mp4', [StringComparison]::OrdinalIgnoreCase) -and $_ -notin $expectedKeys
})

if ($failures.Count -gt 0) {
    Write-Host "`nFINAL AUDIT FAILED" -ForegroundColor Red
    $failures | ForEach-Object { Write-Host "- $_" -ForegroundColor Red }
    exit 1
}

Write-Host "`nFINAL AUDIT PASSED" -ForegroundColor Green
Write-Host "Expected videos present with matching sizes: $($expectedKeys.Count)/$($expectedKeys.Count)"
Write-Host "Expected video bytes: $totalBytes"
Write-Host ("Expected video size: {0:N2} GiB" -f ($totalBytes / 1GB))
Write-Host "Unexpected MP4 objects: $($unexpectedMp4.Count)"
if ($unexpectedMp4.Count -gt 0) {
    $unexpectedMp4 | Sort-Object | ForEach-Object { Write-Host "- $_" -ForegroundColor Yellow }
}
