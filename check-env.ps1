# =====================================================================
#  PhoneFix — проверка окружения перед запуском
# =====================================================================
#  Проверяет версии PHP/Composer/Node, нужные расширения PHP, соединение
#  с MySQL и наличие обязательных файлов проекта.
#
#  Запуск (из корня проекта):  .\check-env.ps1
# =====================================================================

$ErrorActionPreference = 'Continue'
$root = $PSScriptRoot

$ok = 0
$warn = 0
$fail = 0

# --- Где искать PHP и Composer ------------------------------------------
# В проект положена portable-сборка PHP (tools\php) и composer.phar, поэтому
# PATH для запуска НЕ нужен: сначала берём встроенные инструменты и только
# потом системные. Раньше скрипт смотрел лишь в PATH и на машине без PHP
# в PATH писал «PHP не найден», хотя сайт при этом прекрасно запускался.
$phpExe = Join-Path $root 'tools\php\php.exe'
$composerPhar = Join-Path $root 'tools\composer.phar'
$toolsTmp = Join-Path $root 'tools\tmp'

# PHP: встроенный → системный.
function Resolve-Php {
    param([string]$Bundled)

    if (Test-Path -LiteralPath $Bundled) {
        if (-not (Test-Path -LiteralPath $toolsTmp)) {
            New-Item -ItemType Directory -Path $toolsTmp -Force | Out-Null
        }

        # PsySH и Laravel пишут во временную папку: свою подставляем всегда,
        # чтобы на чужой машине не было отказов доступа к %TEMP%.
        $env:TMP = $toolsTmp
        $env:TEMP = $toolsTmp

        return [pscustomobject]@{ Path = $Bundled; Source = 'встроенный (tools\php)' }
    }

    $system = Get-Command php -ErrorAction SilentlyContinue
    if ($system) { return [pscustomobject]@{ Path = $system.Source; Source = 'системный (PATH)' } }

    return $null
}

$php = Resolve-Php -Bundled $phpExe

function Line($status, $text) {
    switch ($status) {
        'OK'   { Write-Host '  [ OK ]   ' -ForegroundColor Green -NoNewline; $script:ok++ }
        'WARN' { Write-Host '  [ВНИМАНИЕ] ' -ForegroundColor Yellow -NoNewline; $script:warn++ }
        'FAIL' { Write-Host '  [ОШИБКА] ' -ForegroundColor Red -NoNewline; $script:fail++ }
    }
    Write-Host $text
}

Write-Host ''
Write-Host 'PhoneFix — проверка окружения' -ForegroundColor Yellow
Write-Host '=============================' -ForegroundColor Yellow

# --- 1. PHP -------------------------------------------------------------
Write-Host ''
Write-Host '1. PHP' -ForegroundColor White

$phpVersion = $null

if (-not $php) {
    Line 'FAIL' 'PHP не найден: нет tools\php\php.exe и нет php в PATH.'
    Write-Host '           Положите portable-сборку PHP 8.2+ в tools\php или запустите скрипт из консоли OSPanel.' -ForegroundColor Gray
} else {
    Line 'OK' "PHP: $($php.Source) — $($php.Path)"

    $phpVersion = & $php.Path -r "echo PHP_VERSION;" 2>&1 | Select-Object -First 1

    if ($phpVersion -match '^(\d+)\.(\d+)') {
        $major = [int]$Matches[1]
        $minor = [int]$Matches[2]

        if ($major -gt 8 -or ($major -eq 8 -and $minor -ge 2)) {
            Line 'OK' "Версия PHP: $phpVersion (требуется 8.2+)"
        } else {
            Line 'FAIL' "Версия PHP: $phpVersion — Laravel 11 требует 8.2 или новее"
        }
    } else {
        Line 'FAIL' "PHP не отвечает на запрос версии: $phpVersion"
    }

    # Обязательные расширения
    $required = @{
        'pdo_mysql' = 'работа с MySQL';
        'mbstring'  = 'русский текст и строки';
        'openssl'   = 'шифрование и ключ приложения';
        'tokenizer' = 'работа Laravel';
        'ctype'     = 'работа Laravel';
        'json'      = 'API-ответы';
        'curl'      = 'HTTP-запросы';
        'fileinfo'  = 'загрузка файлов';
        'bcmath'    = 'точные расчёты цен';
        'xml'       = 'конфигурация и тесты';
    }

    foreach ($ext in $required.Keys) {
        $has = & $php.Path -r "echo extension_loaded('$ext') ? 'yes' : 'no';" 2>&1 | Select-Object -First 1

        if ($has -eq 'yes') {
            Line 'OK' "Расширение $ext ($($required[$ext]))"
        } else {
            Line 'FAIL' "Расширение $ext отключено — нужно для $($required[$ext]). Включите в php.ini"
        }
    }

    # Дополнительно: sqlite для тестов
    $sqlite = & $php.Path -r "echo extension_loaded('pdo_sqlite') ? 'yes' : 'no';" 2>&1 | Select-Object -First 1
    if ($sqlite -eq 'yes') {
        Line 'OK' 'Расширение pdo_sqlite (тесты на базе в памяти)'
    } else {
        Line 'WARN' 'pdo_sqlite отключено — тесты пойдут на MySQL, а не в памяти'
    }
}

# --- 2. Composer --------------------------------------------------------
Write-Host ''
Write-Host '2. Composer' -ForegroundColor White

$composerCmd = $null
$composerSource = $null

if (Test-Path -LiteralPath $composerPhar) {
    if ($php) {
        $composerCmd = @($php.Path, $composerPhar)
        $composerSource = "встроенный (tools\composer.phar)"
    } else {
        Line 'WARN' 'есть tools\composer.phar, но запустить его нечем — нужен PHP'
    }
} else {
    $systemComposer = Get-Command composer -ErrorAction SilentlyContinue
    if ($systemComposer) {
        $composerCmd = @($systemComposer.Source)
        $composerSource = 'системный (PATH)'
    }
}

if ($composerCmd) {
    $composerVersion = (& $composerCmd[0] @($composerCmd[1..($composerCmd.Count - 1)]) --version 2>&1) -join ' '
    if ($composerVersion -match 'Composer version') {
        Line 'OK' "Composer: $composerSource"
        Write-Host "           $composerVersion" -ForegroundColor Gray
    } else {
        Line 'WARN' "Composer есть ($composerSource), но не ответил на --version: $composerVersion"
    }
} else {
    Line 'WARN' 'Composer не найден — он нужен только для установки новых пакетов (vendor уже на месте)'
}

# --- 3. Node.js ---------------------------------------------------------
Write-Host ''
Write-Host '3. Node.js (для сборки фронтенда)' -ForegroundColor White

$node = Get-Command node -ErrorAction SilentlyContinue
$npm = Get-Command npm -ErrorAction SilentlyContinue

if ($node) {
    $nodeVersion = node -v
    $major = [int]($nodeVersion.TrimStart('v') -split '\.')[0]

    if ($major -ge 18) {
        Line 'OK' "Node.js $nodeVersion (требуется 18+)"
    } else {
        Line 'FAIL' "Node.js $nodeVersion — Vite 5 требует 18 или новее"
    }
} else {
    Line 'WARN' 'Node.js не найден — фронтенд не собрать, но API будет работать'
}

if ($npm) {
    Line 'OK' 'npm доступен'
} else {
    Line 'WARN' 'npm не найден в PATH (частая причина — политика запуска скриптов PowerShell)'
}

# --- 4. Файлы проекта ---------------------------------------------------
Write-Host ''
Write-Host '4. Файлы проекта' -ForegroundColor White

$files = @(
    'backend\artisan',
    'backend\composer.json',
    'backend\.env.example',
    'backend\routes\api.php',
    'backend\database\migrations',
    'backend\phpunit.xml',
    'frontend\package.json',
    'frontend\vite.config.js',
    'frontend\src\main.jsx',
    'docs\DEPLOY.md'
)

foreach ($file in $files) {
    $full = Join-Path $root $file

    if (Test-Path $full) {
        Line 'OK' $file
    } else {
        Line 'FAIL' "не найден: $file"
    }
}

# --- 5. Состояние backend ------------------------------------------------
Write-Host ''
Write-Host '5. Состояние бэкенда' -ForegroundColor White

$backend = Join-Path $root 'backend'

if (Test-Path (Join-Path $backend 'vendor')) {
    Line 'OK' 'зависимости Composer установлены (vendor есть)'
} else {
    Line 'WARN' 'нет папки vendor — выполните: composer install'
}

if (Test-Path (Join-Path $backend '.env')) {
    Line 'OK' 'файл .env создан'

    $envText = Get-Content (Join-Path $backend '.env') -Raw

    if ($envText -match 'APP_KEY=base64:') {
        Line 'OK' 'APP_KEY сгенерирован'
    } else {
        Line 'FAIL' 'APP_KEY пуст — выполните: php artisan key:generate'
    }

    if ($envText -match 'DB_DATABASE=([^\r\n]+)') {
        $db = $Matches[1].Trim()
        Line 'OK' "база данных из .env: $db"
    }
} else {
    Line 'WARN' 'файла .env нет — скопируйте .env.example в .env'
}

if (Test-Path (Join-Path $backend 'public\app\index.html')) {
    Line 'OK' 'SPA собрана (backend/public/app/index.html)'
} else {
    Line 'WARN' 'SPA не собрана — выполните во frontend: npm run build'
}

# --- 6. Подключение к MySQL ---------------------------------------------
Write-Host ''
Write-Host '6. Соединение с базой данных' -ForegroundColor White

if ($php -and (Test-Path (Join-Path $backend '.env')) -and (Test-Path (Join-Path $backend 'vendor'))) {
    Push-Location $backend
    $dbCheck = & $php.Path artisan db:show --json 2>&1 | Out-String
    $dbCode = $LASTEXITCODE
    Pop-Location

    # Вытаскиваем первую содержательную строку ошибки, чтобы было понятно,
    # что именно не так (драйвер, пароль, не запущен MySQL).
    $dbReason = $null
    $dbCheck -split "`r?`n" | Where-Object { $_.Trim() } | ForEach-Object {
        if (-not $dbReason -and $_ -match 'SQLSTATE|Connection refused|Access denied|could not find driver|Unknown database|Base table') {
            $dbReason = $_.Trim()
        }
    }

    if ($dbCode -eq 0 -and -not $dbReason) {
        Line 'OK' 'подключение к базе данных работает'
    } else {
        Line 'FAIL' 'нет соединения с базой. Проверьте, запущен ли MySQL, и данные DB_* в .env'
        if ($dbReason) {
            Write-Host "           Причина: $($dbReason.Substring(0, [Math]::Min(200, $dbReason.Length)))" -ForegroundColor Gray
        }
        Write-Host '           Создать базу: mysql -uroot -e "CREATE DATABASE phonefix CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"' -ForegroundColor Gray
        Write-Host '           Заполнить данными: tools\php\php.exe artisan migrate --seed (из папки backend)' -ForegroundColor Gray
    }
} else {
    if (-not $php) {
        Line 'FAIL' 'пропущено — не найден PHP (без него проверить базу нельзя)'
    } else {
        Line 'WARN' 'пропущено — сначала установите зависимости и создайте .env'
    }
}

# --- 7. Порт PhoneFix ----------------------------------------------------
Write-Host ''
Write-Host '7. Свободен ли порт PhoneFix (свой порт проекта, по умолчанию 4381)' -ForegroundColor White

$sitePort = 4381
$envPath = Join-Path $backend '.env'

if (Test-Path $envPath) {
    $appUrlLine = Get-Content $envPath | Where-Object { $_ -match '^\s*APP_URL\s*=' } | Select-Object -First 1
    if ($appUrlLine -and $appUrlLine -match ':(\d+)') { $sitePort = [int]$Matches[1] }
}

Write-Host ("   Порт проекта: $sitePort (меняется в backend\.env, APP_URL)") -ForegroundColor DarkGray

# Проверка занятости порта: Get-NetTCPConnection (если есть) → netstat.
function Test-PortBusy {
    param([int]$Port)

    if (Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue) {
        $conn = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
        if ($conn) { return $true }
    }

    $line = netstat -ano | Select-String ("^\s*TCP\s+\S+:{0}\s+\S+\s+LISTENING" -f $Port) | Select-Object -First 1
    return [bool]$line
}

$busy = Test-PortBusy -Port $sitePort

if ($busy) {
    Line 'WARN' "порт $sitePort занят — либо это уже запущенный PhoneFix, либо start-site.ps1 сам возьмёт следующий свободный порт"
} else {
    Line 'OK' "порт $sitePort свободен"
}

# --- Итог ---------------------------------------------------------------
Write-Host ''
Write-Host '=============================' -ForegroundColor Yellow
Write-Host ("Успешно: $ok   Предупреждений: $warn   Ошибок: $fail") -ForegroundColor $(if ($fail -gt 0) { 'Red' } elseif ($warn -gt 0) { 'Yellow' } else { 'Green' })
Write-Host ''

if ($fail -gt 0) {
    Write-Host 'Сначала устраните ошибки — с ними проект не запустится.' -ForegroundColor Red
    Write-Host 'Полная инструкция: docs\DEPLOY.md' -ForegroundColor Gray
    Write-Host ''
    exit 1
}

if ($warn -gt 0) {
    Write-Host 'Ошибок нет. Предупреждения не критичны для запуска.' -ForegroundColor Yellow
} else {
    Write-Host ('Всё готово к запуску: start-site.cmd (сайт на http://127.0.0.1:' + $sitePort + ')') -ForegroundColor Green
}

Write-Host 'Проверить ещё раз: check-env.cmd   Запустить сайт: start-site.cmd' -ForegroundColor Gray

Write-Host ''
exit 0
