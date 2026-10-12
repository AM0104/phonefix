# =====================================================================
#  PhoneFix — запуск сайта (PowerShell-версия start-site.cmd)
#  Запуск из корня проекта:  .\start-site.ps1
#
#  Почему скрипт переписан:
#   * раньше он сразу открывал http://127.0.0.1:8000, не проверяя порт.
#     На флешке лежат ещё VINPart (E:\никита\avtozap) и CookBook
#     (E:\марина\recipe-site), причём VINPart тоже работал на порту 8000.
#     Если его сервер остался висеть в фоне, PhoneFix порт занять не мог,
#     а браузер показывал ЧУЖОЙ сайт (или белый экран от чужой сборки).
#   * теперь у PhoneFix СВОЙ порт — 4381 (берётся из backend\.env, APP_URL).
#     Он не пересекается с VINPart (:8000), CookBook (:4173) и с портом
#     4371, который занят другим приложением.
#   * чужие серверы скрипт больше НЕ останавливает: если порт вдруг занят,
#     PhoneFix просто переезжает на следующий свободный порт и сообщает об этом.
#   * белый экран: браузер открывается только после того, как сервер ответил,
#     подтвердил, что это PhoneFix, и API отдал данные (то есть MySQL жив).
#     Если база не поднялась — в консоли будет причина, а не пустая страница.
#
#  Ключи:
#     .\start-site.ps1                 обычный запуск (порт из backend\.env)
#     .\start-site.ps1 -CheckOnly      только диагностика порта
#     .\start-site.ps1 -Port 4390      другой порт
#     .\start-site.ps1 -NoFallback     не подбирать свободный порт, а выйти с ошибкой
#     .\start-site.ps1 -NoBrowser      не открывать браузер
#     .\start-site.ps1 -NoMysql        не поднимать MySQL
# =====================================================================

[CmdletBinding()]
param(
    [int]$Port = 0,          # 0 — взять порт из backend\.env (APP_URL)
    [switch]$NoBrowser,
    [switch]$NoMysql,
    [switch]$CheckOnly,
    [switch]$NoFallback
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$php = Join-Path $root 'tools\php\php.exe'
$router = Join-Path $root 'backend\vendor\laravel\framework\src\Illuminate\Foundation\resources\server.php'
$envFile = Join-Path $root 'backend\.env'
$mysqld = 'D:\OSPanel\modules\MySQL-8.0\bin\mysqld.exe'
$myIni = 'D:\OSPanel\modules\MySQL-8.0\my.ini'
$mysqlLog = Join-Path $root 'runtime\mysql.log'
$marker = 'PhoneFix'          # строка, по которой узнаём «свой» сайт на порту
$defaultPort = 4381           # порт PhoneFix, если в .env нет APP_URL
$portSearchLimit = 25         # сколько портов перебрать, если 4381 занят

# ---------------------------------------------------------------- функции

function Get-EnvValue {
    param([string]$Path, [string]$Key)
    if (-not (Test-Path -LiteralPath $Path)) { return $null }
    $pattern = '^\s*' + [regex]::Escape($Key) + '\s*=\s*"?([^"\s]+)"?'
    foreach ($line in Get-Content -LiteralPath $Path) {
        if ($line -match $pattern) { return $Matches[1] }
    }
    return $null
}

function Get-SitePort {
    if ($Port -gt 0) { return $Port }
    $appUrl = Get-EnvValue -Path $envFile -Key 'APP_URL'
    if ($appUrl -and $appUrl -match ':(\d+)') { return [int]$Matches[1] }
    return $defaultPort
}

# Кто слушает порт: PID, имя процесса, командная строка.
function Get-PortOwner {
    param([int]$Port)

    $ownerPid = $null
    if (Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue) {
        $conn = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue |
                Select-Object -First 1
        if ($conn) { $ownerPid = [int]$conn.OwningProcess }
    }
    if (-not $ownerPid) {
        $line = netstat -ano | Select-String ("^\s*TCP\s+\S+:{0}\s+\S+\s+LISTENING\s+(\d+)" -f $Port) |
                Select-Object -First 1
        if ($line) { $ownerPid = [int]$line.Matches[0].Groups[1].Value }
    }
    if (-not $ownerPid) { return $null }

    $proc = $null
    try { $proc = Get-Process -Id $ownerPid -ErrorAction Stop } catch { $proc = $null }

    $exePath = $null
    if ($proc) {
        try { $exePath = $proc.Path } catch { $exePath = $null }
    }

    [pscustomobject]@{
        Port        = $Port
        Id          = $ownerPid
        Name        = if ($proc) { $proc.ProcessName } else { '?' }
        ExePath     = $exePath
        CommandLine = Get-ProcessCommandLine -ProcessId $ownerPid
    }
}

# Командная строка процесса: CIM → WMI → wmic. На машинах с AppLocker
# и в ограниченных сессиях все три источника могут быть недоступны —
# тогда вернётся $null, и скрипт работает по имени процесса.
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

# Из командной строки вытаскиваем папку, которую раздаёт сервер.
function Get-ServedRoot {
    param([string]$CommandLine)
    if (-not $CommandLine) { return '(папка неизвестна)' }
    if ($CommandLine -match '(?i)-t\s+"([^"]+)"') { return $Matches[1] }
    if ($CommandLine -match '(?i)-t\s+(\S+)')      { return $Matches[1] }
    if ($CommandLine -match '(?i)artisan"?\s+serve') { return '(php artisan serve)' }
    return '(папка неизвестна)'
}

# Первый свободный порт начиная с $Start. 0 — свободного не нашлось.
function Find-FreePort {
    param([int]$Start, [int]$Limit = 25)
    for ($p = $Start; $p -lt ($Start + $Limit); $p++) {
        if (-not (Get-PortOwner -Port $p)) { return $p }
    }
    return 0
}

# Похоже ли, что этот процесс — уже запущенный PhoneFix (PHP, раздающий
# папку backend\public или корень проекта)? Тогда второй сервер не нужен:
# сообщаем и открываем браузер. Если командную строку прочитать нельзя,
# возвращаем $false и работаем как раньше (переносим сайт на другой порт).
function Test-IsOwnServer {
    param([string]$CommandLine)

    if (-not $CommandLine) { return $false }
    if ($CommandLine -notmatch '(?i)(php\.exe|php-cgi\.exe|php)\s') { return $false }
    if ($CommandLine -notmatch '(?i)-S\s') { return $false }

    $publicDir = [regex]::Escape((Join-Path $root 'backend\public'))
    $rootDir = [regex]::Escape($root)

    # Кавычка вокруг пути необязательна: -t "путь" и -t путь.
    # ВАЖНО: только одинарные кавычки и конкатенация — в PowerShell 5.1
    # последовательность \" НЕ экранирует кавычку, строка обрывается,
    # и весь скрипт перестаёт запускаться.
    if ($CommandLine -match ('(?i)-t\s+"?(' + $publicDir + '|' + $rootDir + ')')) { return $true }

    return $false
}

# Принимает ли соединения MySQL (проверка базы, а не процесса mysqld).
function Test-DbPort {
    param([string]$DbHost, [string]$DbPort)
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $client.Connect($DbHost, [int]$DbPort)
        $client.Close()
        return $true
    }
    catch {
        return $false
    }
}

# Последние строки лога MySQL — чтобы было понятно, почему база не поднялась.
# MySQL пишет и в stdout (runtime\mysql.log), и в stderr (runtime\mysql.log.err),
# поэтому смотрим оба файла.
function Show-MysqlLogTail {
    param([int]$Lines = 8)
    $shown = $false

    foreach ($path in @($mysqlLog, "$mysqlLog.err")) {
        if (-not (Test-Path -LiteralPath $path)) { continue }
        $tail = Get-Content -LiteralPath $path -Tail $Lines -ErrorAction SilentlyContinue
        if (-not $tail) { continue }

        Write-Host "  Последние строки лога MySQL ($path):" -ForegroundColor DarkGray
        $tail | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
        $shown = $true
    }

    if (-not $shown) {
        Write-Host '  Лог MySQL пуст — посмотрите D:\OSPanel\data\MySQL-8.0\default\*.err' -ForegroundColor DarkGray
    }
}

# ------------------------------------------------------------------ старт

# Чтобы русский текст читался при любом способе запуска: двойной клик по .cmd
# ставит консоли UTF-8 (chcp 65001), но при прямом запуске .ps1 кодировка
# консоли может быть ANSI — тогда вывод превращается в мусор.
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

$sitePort = Get-SitePort
$url = "http://127.0.0.1:$sitePort"

Write-Host ''
Write-Host '  PhoneFix — запуск сайта' -ForegroundColor Cyan
Write-Host '  -----------------------' -ForegroundColor DarkGray

if (-not (Test-Path -LiteralPath $php)) {
    Write-Host "Не найден PHP: $php" -ForegroundColor Red
    Write-Host 'Скачайте portable-сборку PHP 8.3 в tools\php или используйте OSPanel.' -ForegroundColor Yellow
    exit 1
}

# --- Временная папка для PHP --------------------------------------------
# Laravel и PsySH пишут во временную папку. Свою (tools\tmp) подставляем
# всегда: на чужой машине в системном %TEMP% может не быть прав.
$bundledTmp = Join-Path $root 'tools\tmp'
try {
    if (-not (Test-Path -LiteralPath $bundledTmp)) {
        New-Item -ItemType Directory -Path $bundledTmp -Force | Out-Null
    }
    $env:TMP = $bundledTmp
    $env:TEMP = $bundledTmp
} catch {
    Write-Host '  Не удалось подготовить tools\tmp — PHP будет использовать системную временную папку.' -ForegroundColor DarkGray
}

# --- Проверяем сам PHP: отвечает ли он и есть ли драйвер MySQL -----------
$phpVersion = & $php -r "echo PHP_VERSION;" 2>&1 | Select-Object -First 1

if ($LASTEXITCODE -ne 0 -or -not $phpVersion) {
    Write-Host 'PHP не запускается.' -ForegroundColor Red
    Write-Host "Файл: $php" -ForegroundColor Gray
    Write-Host 'Проверьте, не блокирует ли его антивирус. Диагностика: .\check-env.cmd' -ForegroundColor Yellow
    exit 1
}

Write-Host "  PHP $phpVersion" -ForegroundColor DarkGray

$phpExts = & $php -r "echo implode(',', get_loaded_extensions());" 2>&1 | Select-Object -First 1
$phpExtList = @($phpExts -split ',')

$mustExt = @{
    'pdo_mysql' = 'подключение к базе MySQL';
    'mbstring'  = 'русский текст';
    'openssl'   = 'шифрование';
    'tokenizer' = 'работа Laravel';
    'curl'      = 'запросы к API';
}
$missingExt = @()
foreach ($ext in $mustExt.Keys) {
    if ($phpExtList -notcontains $ext) { $missingExt += "$ext ($($mustExt[$ext]))" }
}

if ($missingExt.Count -gt 0) {
    Write-Host '  У PHP отключены нужные расширения:' -ForegroundColor Red
    foreach ($m in $missingExt) { Write-Host "    - $m" -ForegroundColor Red }
    Write-Host '  Включите их в tools\php\php.ini и запустите снова. Проверка: .\check-env.cmd' -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path -LiteralPath $envFile)) {
    Write-Host 'Не найден backend\.env — сайт без него не запустится.' -ForegroundColor Red
    exit 1
}

# --- Кэш конфигурации Laravel -------------------------------------------
# Если остался bootstrap\cache\config.php, Laravel игнорирует .env: сайт
# молча идёт на старые DB_*/APP_URL. Убираем кэш перед запуском.
$configCache = Join-Path $root 'backend\bootstrap\cache\config.php'
if (Test-Path -LiteralPath $configCache) {
    try {
        Remove-Item -LiteralPath $configCache -Force
        Write-Host '  Убрал старый кэш конфигурации Laravel (bootstrap\cache\config.php).' -ForegroundColor DarkGray
    } catch {
        Write-Host '  Не удалось убрать bootstrap\cache\config.php — проверьте DB_* вручную.' -ForegroundColor Yellow
    }
}

# --- Порт: у PhoneFix он свой, чужие серверы не трогаем ------------------
Write-Host ''
Write-Host "  Проверяю порт $sitePort..." -ForegroundColor DarkGray

$owner = Get-PortOwner -Port $sitePort
if ($owner) {
    $served = Get-ServedRoot -CommandLine $owner.CommandLine
    Write-Host "  Порт $sitePort занят: процесс $($owner.Name) (PID $($owner.Id))." -ForegroundColor Yellow
    if ($owner.CommandLine) {
        Write-Host "  Он раздаёт: $served" -ForegroundColor Yellow
    }
    else {
        Write-Host '  Командную строку процесса прочитать не удалось (нет прав).' -ForegroundColor DarkGray
    }
    Write-Host '  Чужие серверы я не останавливаю — это чужие сайты.' -ForegroundColor DarkGray

    if ($CheckOnly) {
        Write-Host '  Режим -CheckOnly: ничего не меняю.' -ForegroundColor DarkGray
        exit 2
    }

    if ($NoFallback) {
        Write-Host "  Освободите порт $sitePort или запустите PhoneFix на другом порту:" -ForegroundColor Yellow
        Write-Host '      .\start-site.ps1 -Port 4390' -ForegroundColor Gray
        exit 1
    }

    $freePort = Find-FreePort -Start ($sitePort + 1) -Limit $portSearchLimit
    if ($freePort -eq 0) {
        Write-Host "  Свободных портов рядом с $sitePort не нашлось." -ForegroundColor Red
        Write-Host '  Запустите с другим портом: .\start-site.ps1 -Port 4500' -ForegroundColor Yellow
        exit 1
    }

    Write-Host "  Переношу PhoneFix на свободный порт $freePort." -ForegroundColor Green
    $sitePort = $freePort
    $url = "http://127.0.0.1:$sitePort"
}
else {
    Write-Host "  Порт $sitePort свободен." -ForegroundColor Green
}

if ($CheckOnly) { exit 0 }

# --- Если PhoneFix уже запущен на этом порту — второй сервер не поднимаем -
if ($owner -and (Test-IsOwnServer -CommandLine $owner.CommandLine)) {
    Write-Host ''
    Write-Host "  PhoneFix уже запущен: $url (PID $($owner.Id))." -ForegroundColor Green
    Write-Host '  Второй сервер не запускаю — просто открываю сайт.' -ForegroundColor DarkGray

    if (-not $NoBrowser) {
        try {
            $probe = Invoke-WebRequest -Uri "$url/api/public/site" -UseBasicParsing -TimeoutSec 30
            if ($probe.StatusCode -eq 200) {
                Write-Host '  Проверил: API отвечает, база данных доступна.' -ForegroundColor DarkGray
            }
        }
        catch {
            Write-Host '  Сайт отвечает, но API молчит — возможно, недоступна база данных.' -ForegroundColor Yellow
            Write-Host '  Диагностика: .\check-env.cmd (раздел «Соединение с базой данных»).' -ForegroundColor Yellow
        }

        Start-Process $url
    }

    Write-Host '  Остановить все запущенные сайты: stop-sites.cmd' -ForegroundColor Gray
    Write-Host ''
    exit 0
}

# --- База данных: запускаем MySQL, если он ещё не работает ---------------
$dbHost = Get-EnvValue -Path $envFile -Key 'DB_HOST'
$dbPort = Get-EnvValue -Path $envFile -Key 'DB_PORT'
$dbName = Get-EnvValue -Path $envFile -Key 'DB_DATABASE'
$dbUser = Get-EnvValue -Path $envFile -Key 'DB_USERNAME'
# Пароль может быть пустым (root без пароля) или содержать пробелы, поэтому
# читаем строку целиком, а не через Get-EnvValue.
$dbPass = ''
foreach ($line in (Get-Content -LiteralPath $envFile)) {
    if ($line -match '^\s*DB_PASSWORD\s*=\s*"?(.*?)"?\s*$') { $dbPass = $Matches[1]; break }
}

if (-not $dbHost) { $dbHost = '127.0.0.1' }
if (-not $dbPort) { $dbPort = '3306' }
if (-not $dbName) { $dbName = 'phonefix' }
if (-not $dbUser) { $dbUser = 'root' }

$dbDown = $false
if (-not $NoMysql) {
    if (Test-DbPort -DbHost $dbHost -DbPort $dbPort) {
        Write-Host "  MySQL уже слушает $dbHost`:$dbPort" -ForegroundColor DarkGray
    }
    else {
        if (Test-Path -LiteralPath $mysqld) {
            Write-Host '  Запускаю MySQL...' -ForegroundColor Yellow

            # Лог пишем в файл: если MySQL не поднимется, будет видно причину,
            # а не белый экран в браузере.
            $runtimeDir = Join-Path $root 'runtime'
            if (-not (Test-Path -LiteralPath $runtimeDir)) {
                New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
            }

            $mysqldProc = $null
            try {
                $mysqldProc = Start-Process -FilePath $mysqld `
                    -ArgumentList "--defaults-file=`"$myIni`"", '--standalone', '--console' `
                    -RedirectStandardOutput $mysqlLog -RedirectStandardError "$mysqlLog.err" `
                    -WindowStyle Hidden -PassThru
            }
            catch {
                Write-Host "  Не удалось запустить MySQL: $($_.Exception.Message)" -ForegroundColor Red
            }

            # Раньше здесь была просто пауза 8 секунд. Если MySQL не успевал
            # подняться, сайт открывался пустым: SPA грузится, а все запросы
            # к API падают — получается белый экран без объяснений.
            for ($i = 1; $i -le 60; $i++) {
                Start-Sleep -Seconds 1
                if (Test-DbPort -DbHost $dbHost -DbPort $dbPort) { break }

                # MySQL упал сразу (например, нет доступа к папке данных):
                # нет смысла ждать оставшуюся минуту.
                if ($mysqldProc -and $mysqldProc.HasExited) {
                    Write-Host '  MySQL завершился с ошибкой — смотрите лог ниже.' -ForegroundColor Red
                    break
                }

                if ($i % 15 -eq 0) { Write-Host "  ... ждём MySQL ($dbHost`:$dbPort): $i с" -ForegroundColor DarkGray }
            }
        }
        else {
            Write-Host '  Внимание: MySQL не найден. Запустите его в OSPanel, иначе сайт не откроет данные.' -ForegroundColor Yellow
        }

        if (Test-DbPort -DbHost $dbHost -DbPort $dbPort) {
            Write-Host "  MySQL готов: $dbHost`:$dbPort" -ForegroundColor Green
        }
        else {
            $dbDown = $true
            Write-Host "  ВНИМАНИЕ: MySQL ($dbHost`:$dbPort) не отвечает — база данных недоступна." -ForegroundColor Red
            if ($mysqldProc -and $mysqldProc.HasExited) {
                Write-Host '  Процесс MySQL завершился — вот почему был бы белый экран.' -ForegroundColor Red
                Show-MysqlLogTail
            }
            Write-Host '  Включите модуль MySQL-8.0 в OSPanel и запустите сайт снова.' -ForegroundColor Yellow
            Write-Host '  Подробная проверка: .\check-env.cmd (раздел «Соединение с базой данных»).' -ForegroundColor Yellow
        }
    }
}

# Проверяем базу глазами самого PHP: открытый порт MySQL ещё не значит, что
# Laravel подключится (не та база, пароль или не выполнен migrate --seed).
# Без этой проверки сайт открывался с пустыми списками без объяснений.
$dbError = $null
$dbOk = $false

Set-Location (Join-Path $root 'backend')

$env:DSH_DBTEST_DSN = "mysql:host=$dbHost;port=$dbPort;dbname=$dbName"
$env:DSH_DBTEST_USER = $dbUser
$env:DSH_DBTEST_PASS = $dbPass

# ВАЖНО: код для php -r должен быть ОДНОЙ строкой — PowerShell 5.1 режет
# многострочный аргумент, и php получает мусор вместо кода.
$dbProbe = "try { " +
    "`$pdo = new PDO(getenv('DSH_DBTEST_DSN'), getenv('DSH_DBTEST_USER'), getenv('DSH_DBTEST_PASS'), array(PDO::ATTR_TIMEOUT => 5)); " +
    "`$n = `$pdo->query('select count(*) from services')->fetchColumn(); " +
    "echo 'OK:' . `$n; " +
    "} catch (Throwable `$e) { echo 'ERR:' . preg_replace('/\s+/', ' ', `$e->getMessage()); }"

$dbProbeOut = & $php -r $dbProbe 2>&1 | Select-Object -First 1

Remove-Item Env:\DSH_DBTEST_DSN -ErrorAction SilentlyContinue
Remove-Item Env:\DSH_DBTEST_USER -ErrorAction SilentlyContinue
Remove-Item Env:\DSH_DBTEST_PASS -ErrorAction SilentlyContinue

if ($dbProbeOut -match '^OK:(\d*)') {
    $servicesCount = $Matches[1]
    $dbOk = $true
    Write-Host "  База данных готова: $dbName, услуг в базе — $servicesCount" -ForegroundColor Green
}
else {
    $dbDown = $true
    if ($dbProbeOut -match '^ERR:(.*)$') { $dbError = $Matches[1] } else { $dbError = $dbProbeOut }

    Write-Host "  ВНИМАНИЕ: база данных не готова — $dbError" -ForegroundColor Red
    Write-Host '  Сайт откроется, но без данных. Что проверить:' -ForegroundColor Yellow
    Write-Host "    1) MySQL запущен и DB_* в backend\.env верны (сейчас $dbHost`:$dbPort, база $dbName);" -ForegroundColor Gray
    Write-Host '    2) база заполнена: tools\php\php.exe artisan migrate --seed (из папки backend);' -ForegroundColor Gray
    Write-Host '    3) подробная диагностика: .\check-env.cmd' -ForegroundColor Gray
}

Set-Location (Join-Path $root 'backend\public')

Write-Host ''
Write-Host "  PhoneFix запускается: $url" -ForegroundColor Yellow
Write-Host "  Админка: $url/admin   (admin@phonefix.ru / admin123)" -ForegroundColor Gray
Write-Host '  Остановить сайт — Ctrl+C.' -ForegroundColor Gray
if ($dbDown) {
    Write-Host '  База данных недоступна: сайт откроется, но без данных — браузер я не открою.' -ForegroundColor Red
}
elseif (-not $NoBrowser) {
    Write-Host '  Браузер откроется, когда сервер ответит и подтвердит, что это PhoneFix.' -ForegroundColor DarkGray
}
Write-Host ''

# --- Браузер открываем только после реального ответа сервера -------------
$browserJob = $null
if (-not $NoBrowser -and -not $dbDown) {
    $browserJob = Start-Job -ArgumentList $url, $marker -ScriptBlock {
        param($Url, $Marker)
        # Первый запрос к Laravel с флешки бывает медленным (10+ секунд),
        # поэтому ждём до двух минут.
        $deadline = (Get-Date).AddSeconds(120)
        $apiFailures = 0

        while ((Get-Date) -lt $deadline) {
            try {
                $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 15
                if ($resp.Content -notmatch $Marker) { return 'foreign' }
            }
            catch {
                Start-Sleep -Milliseconds 500
                continue
            }

            # Мало отдать HTML: без базы данных страница отрисуется без данных,
            # поэтому проверяем ещё и API.
            try {
                $api = Invoke-WebRequest -Uri "$Url/api/public/site" -UseBasicParsing -TimeoutSec 30
                if ($api.StatusCode -eq 200) {
                    Start-Process $Url
                    return 'ok'
                }
                $apiFailures++
            }
            catch {
                $apiFailures++
            }

            if ($apiFailures -ge 4) { return 'nodata' }
            Start-Sleep -Seconds 3
        }
        return 'timeout'
    }
}

# Laravel берёт реальный адрес из переменной окружения (она приоритетнее .env):
# если порт пришлось сменить, ссылки внутри сайта останутся правильными.
$env:APP_URL = $url

try {
    & $php -S "127.0.0.1:$sitePort" -t . $router
}
finally {
    if ($browserJob) {
        $browserJob | Wait-Job -Timeout 120 | Out-Null
        $result = Receive-Job -Job $browserJob -ErrorAction SilentlyContinue
        switch ($result) {
            'foreign' {
                Write-Host ''
                Write-Host "  Внимание: на $url ответил НЕ PhoneFix — браузер открывать не стал." -ForegroundColor Red
                Write-Host '  Возможно, порт успел занять другой сайт. Запустите: .\start-site.cmd -CheckOnly' -ForegroundColor Yellow
            }
            'nodata' {
                Write-Host ''
                Write-Host '  Сайт отвечает, но база данных недоступна — страница была бы без данных.' -ForegroundColor Red
                Write-Host '  Браузер не открываю. Включите MySQL-8.0 в OSPanel и запустите сайт снова.' -ForegroundColor Yellow
            }
            'timeout' {
                Write-Host ''
                Write-Host "  Сервер не ответил за 2 минуты — откройте $url вручную." -ForegroundColor Yellow
            }
        }
        Remove-Job -Job $browserJob -Force -ErrorAction SilentlyContinue
    }
}
