# =====================================================================
#  Флешка с тремя сайтами: PhoneFix (:4381), VINPart (:8000), CookBook (:4173).
#  Раньше PhoneFix и VINPart делили порт 8000, поэтому забытый в фоне
#  PHP-сервер одного сайта заставлял браузер открывать ЧУЖОЙ сайт.
#  Теперь у PhoneFix свой порт, и этот скрипт нужен только для уборки
#  зависших серверов.
#
#  Запуск:
#     .\stop-sites.cmd                 показать и остановить все
#     .\stop-sites.cmd -WhatIfOnly     только показать, ничего не трогать
#     .\stop-sites.cmd -Keep 4381      не трогать сервер на порту 4381
# =====================================================================

[CmdletBinding()]
param(
    [int[]]$Keep = @(),
    [switch]$WhatIfOnly
)

$ErrorActionPreference = 'Stop'

# Командная строка процесса: CIM → WMI → wmic. В ограниченных сессиях и
# на машинах с AppLocker все источники могут быть недоступны.
function Get-ProcessCommandLine {
    param([int]$ProcessId)
    try {
        $r = Get-CimInstance Win32_Process -Filter "ProcessId=$ProcessId" -ErrorAction Stop
        if ($r -and $r.CommandLine) { return $r.CommandLine }
    }
    catch { }
    try {
        $r = Get-WmiObject Win32_Process -Filter "ProcessId=$ProcessId" -ErrorAction Stop
        if ($r -and $r.CommandLine) { return $r.CommandLine }
    }
    catch { }
    try {
        $out = & wmic process where "ProcessId=$ProcessId" get CommandLine /value 2>$null
        if ($out -match 'CommandLine=(.+)') { return $Matches[1].Trim() }
    }
    catch { }
    return $null
}

# PID → список портов, которые процесс слушает (по данным netstat).
function Get-ListenMap {
    $map = @{}
    foreach ($line in (netstat -ano)) {
        if ($line -match '^\s*TCP\s+\S+:(\d+)\s+\S+\s+LISTENING\s+(\d+)\s*$') {
            $port = [int]$Matches[1]
            $procId = [int]$Matches[2]
            if (-not $map.ContainsKey($procId)) { $map[$procId] = @() }
            $map[$procId] += $port
        }
    }
    return $map
}

$listenMap = Get-ListenMap
$servers = @()

foreach ($proc in (Get-Process -Name php, php-cgi, php-win -ErrorAction SilentlyContinue)) {
    $cmd = Get-ProcessCommandLine -ProcessId $proc.Id
    $looksLikeServer = $false
    if ($cmd -and ($cmd -match '(?i)\s-S\s' -or $cmd -match '(?i)artisan"?\s+serve')) { $looksLikeServer = $true }
    if ($listenMap.ContainsKey($proc.Id)) { $looksLikeServer = $true }
    if (-not $looksLikeServer) { continue }

    $ports = @()
    if ($cmd -and $cmd -match '(?i)-S\s+\S+?:(\d+)') { $ports += [int]$Matches[1] }
    if ($listenMap.ContainsKey($proc.Id)) { $ports += $listenMap[$proc.Id] }
    $ports = $ports | Select-Object -Unique

    $root = '(папка неизвестна)'
    if ($cmd) {
        if ($cmd -match '(?i)-t\s+"([^"]+)"') { $root = $Matches[1] }
        elseif ($cmd -match '(?i)-t\s+(\S+)') { $root = $Matches[1] }
        elseif ($cmd -match '(?i)artisan"?\s+serve') { $root = '(php artisan serve)' }
    }

    $servers += [pscustomobject]@{
        Id    = $proc.Id
        Ports = $ports
        Root  = $root
    }
}

if (-not $servers) {
    Write-Host ''
    Write-Host '  Забытых PHP-серверов не найдено — порты свободны.' -ForegroundColor Green
    Write-Host ''
    exit 0
}

Write-Host ''
Write-Host '  Найдены запущенные PHP-серверы:' -ForegroundColor Cyan
Write-Host ''
foreach ($s in $servers) {
    $portText = if ($s.Ports.Count) { ($s.Ports -join ', ') } else { '?' }
    Write-Host ("  порт {0,-10} PID {1,-7} раздаёт: {2}" -f $portText, $s.Id, $s.Root) -ForegroundColor Yellow
}
Write-Host ''

$stopped = 0
foreach ($s in $servers) {
    $keepIt = $false
    foreach ($p in $s.Ports) { if ($Keep -contains $p) { $keepIt = $true } }
    if ($keepIt) {
        Write-Host ("  PID {0}: порт из списка -Keep, оставляю." -f $s.Id) -ForegroundColor DarkGray
        continue
    }
    if ($WhatIfOnly) {
        Write-Host ("  [только показать] остановил бы PID {0}" -f $s.Id) -ForegroundColor DarkGray
        continue
    }
    Stop-Process -Id $s.Id -Force -ErrorAction SilentlyContinue
    Write-Host ("  Остановлен PID {0}" -f $s.Id) -ForegroundColor Green
    $stopped++
}

Write-Host ''
if ($WhatIfOnly) {
    Write-Host '  Режим -WhatIfOnly: ничего не остановлено.' -ForegroundColor Yellow
}
else {
    Write-Host ("  Остановлено серверов: {0}. Теперь start-site.cmd запустит именно PhoneFix." -f $stopped) -ForegroundColor Green
}
Write-Host ''