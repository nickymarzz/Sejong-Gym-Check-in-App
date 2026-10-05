$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..\backend')
Write-Host "Running full SGC E2E HTTP test (requires API already running on port set in storage/app/e2e_test.php)"
php storage/app/e2e_test.php
