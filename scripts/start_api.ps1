$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..\backend')
$port = $args[0] ?? '8000'
Write-Host "Starting SGC API on http://127.0.0.1:$port"
php artisan serve --host=127.0.0.1 --port=$port
