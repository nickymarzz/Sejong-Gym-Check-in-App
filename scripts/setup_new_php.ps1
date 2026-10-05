$ErrorActionPreference = 'Stop'
$phpJunction = 'C:\Users\U S E R\AppData\Local\Programs\PHP\current'
$phpBin = Join-Path $phpJunction 'php.exe'
if (-not (Test-Path $phpBin)) { throw "PHP not found at $phpBin" }

$junc = Get-Item $phpJunction -Force
$phpRoot = if ($junc.LinkType -and $junc.Target) { @($junc.Target)[0] } else { $phpJunction }
Write-Host ('Resolved PHP root: {0}' -f $phpRoot)
$iniPath = Join-Path $phpRoot 'php.ini'
if (-not (Test-Path $iniPath)) { throw "php.ini not found at $iniPath (resolved)" }

$backendRoot = Join-Path $PSScriptRoot '..\backend'
$scanDir = Join-Path $backendRoot 'php-conf.d'
if (-not (Test-Path $scanDir)) { throw "Missing $scanDir. Check project-local php-conf.d missing" }
$env:PHP_INI_SCAN_DIR = if ($env:PHP_INI_SCAN_DIR) { "$scanDir;$env:PHP_INI_SCAN_DIR" } else { $scanDir }
Write-Host ('Project PHP_INI_SCAN_DIR: {0}' -f $env:PHP_INI_SCAN_DIR)

Write-Host "[1/2] Reading php.ini (for extension_dir only)"
$ini = Get-Content -Raw $iniPath
$extDirLine = ($ini -split "`r`n" | Select-String '^extension_dir\s*=') | Select-Object -First 1
if ($extDirLine -match 'extension_dir\s*=\s*"([^"]+)"') { $extDir = $Matches[1] }
elseif ($extDirLine -match 'extension_dir\s*=\s*([^\s;]+)') { $extDir = $Matches[1] }
else { throw "Cannot resolve extension_dir from php.ini" }
Write-Host ('  Extension dir: {0}' -f $extDir)

Write-Host "[2/2] Ensuring ext-mongodb.dll (PECL mongodb) is installed..."
$phpInfo = & $phpBin -i 2>&1 | Out-String
if ($phpInfo -match 'PHP Version\s*=>\s*([0-9]+)\.([0-9]+)') {
    $verMajor = $Matches[1]; $verMinor = $Matches[2]
} else { $verMajor = '8'; $verMinor = '5' }
$threadLabel = if ($phpInfo -match 'Thread Safety\s*=>\s*enabled') { 'ts' } else { 'nts' }
$vcLabel = 'vs17'
if ($phpInfo -match 'Compiler\s*=>\s*Visual C\+\+ (\d+)') {
    $vcYear = [int]$Matches[1]
    if ($vcYear -ge 2022) { $vcLabel = 'vs17' } elseif ($vcYear -ge 2019) { $vcLabel = 'vs16' } elseif ($vcYear -ge 2017) { $vcLabel = 'vs15' }
}
$archLabel = 'x64'
if ($phpInfo -match 'Architecture\s*=>\s*(x86|x64)') { $archLabel = $Matches[1].ToLowerInvariant() }
$verLabel = "$verMajor.$verMinor"
Write-Host ('  Build tags: PHP={0} Thread={1} VC={2} Arch={3}' -f $verLabel,$threadLabel,$vcLabel,$archLabel)
$dllOut = Join-Path $extDir 'php_mongodb.dll'
if (Test-Path $dllOut) {
    $f = Get-Item $dllOut
    Write-Host ('  [OK] php_mongodb.dll already present (size={0})' -f $f.Length)
} else {
    $ProgressPreference = 'SilentlyContinue'
    $versions = @('2.5.3','2.1.10','1.21.10')
    $downloaded = $false
    foreach ($v in $versions) {
        $url = "https://windows.php.net/downloads/pecl/releases/mongodb/$v/php_mongodb-$v-$verLabel-$threadLabel-$vcLabel-$archLabel.zip"
        Write-Host ('  Trying: {0}' -f $url)
        $tmp = Join-Path $env:TEMP "php_mongodb_${v}_${verLabel}_${threadLabel}.zip"
        try {
            Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $tmp -ErrorAction Stop
            Write-Host ('  [OK] Downloaded mongodb driver v{0}' -f $v)
            Add-Type -Assembly System.IO.Compression.FileSystem
            $zip = [System.IO.Compression.ZipFile]::OpenRead($tmp)
            $entry = $zip.Entries | Where-Object Name -eq 'php_mongodb.dll' | Select-Object -First 1
            if (-not $entry) { throw "ZIP has no php_mongodb.dll" }
            [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $dllOut, $true)
            $zip.Dispose()
            Remove-Item $tmp -Force -ErrorAction SilentlyContinue
            $downloaded = $true
            Write-Host ('  [OK] Extracted php_mongodb.dll to {0}' -f $dllOut)
            break
        } catch {
            Remove-Item $tmp -Force -ErrorAction SilentlyContinue
            Write-Host ('  [FAIL] {0}: {1}' -f $v,$_.Exception.Message)
        }
    }
    if (-not $downloaded) { throw "Could not download ext-mongodb for PHP $verLabel $threadLabel $vcLabel $archLabel" }
}

Write-Host ''
Write-Host 'Verifying loaded extensions via project php-conf.d...'
$m = & $phpBin -m 2>&1 | Out-String
$need = @('mongodb','curl','fileinfo','mbstring','openssl','sodium','zip')
$bad = @()
foreach ($e in $need) {
    $linePat = '(?m)^\s*' + [regex]::Escape($e) + '\s*$'
    if ($m -match $linePat) { Write-Host ('  [OK] {0} loaded' -f $e) } else { Write-Host ('  [MISSING] {0}' -f $e); $bad += $e }
}

$note = @"

NOTE: Project ships php-conf.d/sgc-extensions.ini (loaded via PHP_INI_SCAN_DIR in all runner scripts (start_api.ps1, seed_db.ps1, start_workers.ps1, run_tests_e2e.ps1) — no edits to AppData php.ini needed.
"@
Write-Host $note

if ($bad.Count -gt 0) {
    Write-Warning "Missing: $($bad -join ', '). Full php -m output:"
    Write-Host $m
    exit 1
}

Write-Host '=========================================='
Write-Host ' SUCCESS: PHP configured for SGC'
Write-Host (' PHP bin:   {0}' -f $phpBin)
Write-Host (' Scan dir:  {0}' -f $scanDir)
Write-Host (' Ext dir:   {0}' -f $extDir)
Write-Host '=========================================='
exit 0
