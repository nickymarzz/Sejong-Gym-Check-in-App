$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..\backend')
Write-Host "Seeding SGC MongoDB schema + indexes + demo data..."
php artisan sgc:seed
