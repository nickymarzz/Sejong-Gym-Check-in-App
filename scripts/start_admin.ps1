$ErrorActionPreference = 'Stop'
$adminRoot = Join-Path $PSScriptRoot '..\admin'
$port = if ($args.Count -gt 0 -and $args[0]) { [string]$args[0] } else { '5500' }

$phpBin = Join-Path $env:LOCALAPPDATA 'Programs\PHP\current\php.exe'
if (-not (Test-Path $phpBin) -and (Get-Command php -ErrorAction SilentlyContinue)) {
    $phpBin = (Get-Command php).Source
}

if (Test-Path $phpBin) {
    Write-Host "Starting SGC Admin Dashboard on http://localhost:$port (PHP=$phpBin)"
    & $phpBin -S "127.0.0.1:$port" -t $adminRoot
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
    Write-Host "Starting SGC Admin Dashboard on http://localhost:$port (python)"
    & python -m http.server $port --bind 127.0.0.1 --directory $adminRoot
} else {
    Write-Error "Neither PHP nor Python was found. Install one of them, or serve the admin/ folder with any static web server."
    exit 1
}
