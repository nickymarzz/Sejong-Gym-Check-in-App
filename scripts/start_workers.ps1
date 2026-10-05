$ErrorActionPreference = 'Stop'
$phpBin = 'C:\Users\U S E R\AppData\Local\Programs\PHP\current\php.exe'
if (-not (Test-Path $phpBin)) {
    if (Get-Command php -ErrorAction SilentlyContinue) {
        $phpBin = (Get-Command php).Source
    } else {
        Write-Error "PHP not found at $phpBin and not on PATH. Install PHP or add it to PATH."
        exit 1
    }
}
$phpDir = Split-Path -Parent $phpBin
if ($phpDir -and ($env:PATH -notlike "*$phpDir*")) {
    $env:PATH = $phpDir + ';' + $env:PATH
}
$backendRoot = Join-Path $PSScriptRoot '..\backend'
$scanDir = Join-Path $backendRoot 'php-conf.d'
if (Test-Path $scanDir) {
    $env:PHP_INI_SCAN_DIR = if ($env:PHP_INI_SCAN_DIR) { "$scanDir;$env:PHP_INI_SCAN_DIR" } else { $scanDir }
}
Set-Location $backendRoot
$queue = if ($args.Count -gt 0 -and $args[0]) { [string]$args[0] } else { 'notifications' }
Write-Host "Starting SGC queue worker: queue=$queue (tries=3) (PHP=$phpBin)"
& $phpBin artisan queue:work redis --queue=$queue --tries=3
