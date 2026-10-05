$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..\backend')
$queue = $args[0] ?? 'notifications'
Write-Host "Starting SGC queue worker: queue=$queue (tries=3)"
php artisan queue:work redis --queue=$queue --tries=3
