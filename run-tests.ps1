# =====================================================================
#  PhoneFix — автотесты бэкенда (Laravel)
# =====================================================================
#  Тесты идут на SQLite в памяти: рабочая база MySQL не затрагивается,
#  отдельный сервер БД поднимать не нужно.
#
#  Запуск:  .\run-tests.ps1
# =====================================================================

$ErrorActionPreference = 'Stop'
$backend = Join-Path $PSScriptRoot 'backend'

if (-not (Test-Path $backend)) {
    Write-Host "Не найдена папка backend рядом со скриптом." -ForegroundColor Red
    exit 1
}

Set-Location $backend

Write-Host ''
Write-Host 'PhoneFix — запуск тестов' -ForegroundColor Yellow
Write-Host '========================' -ForegroundColor Yellow
Write-Host ''

# --- Проверка окружения -------------------------------------------------
# Сначала пробуем PHP, встроенный в проект (tools\php), потом — системный.
$phpExe = Join-Path $PSScriptRoot 'tools\php\php.exe'
$php = $null

if (Test-Path $phpExe) {
    $php = $phpExe
    $env:TMP = Join-Path $PSScriptRoot 'tools\tmp'
    $env:TEMP = $env:TMP
} else {
    $systemPhp = Get-Command php -ErrorAction SilentlyContinue

    if ($systemPhp) {
        $php = $systemPhp.Source
    }
}

if (-not $php) {
    Write-Host 'PHP не найден.' -ForegroundColor Red
    Write-Host ''
    Write-Host 'Положите portable-сборку в tools\php или запустите скрипт из консоли OSPanel' -ForegroundColor White
    Write-Host '(там PHP уже прописан в PATH).' -ForegroundColor White
    exit 1
}

Write-Host ("PHP: " + (& $php -r "echo PHP_VERSION;")) -ForegroundColor Green

# --- Проверка расширения pdo_sqlite -------------------------------------
$hasSqlite = & $php -r "echo extension_loaded('pdo_sqlite') ? 'yes' : 'no';"

if ($hasSqlite -ne 'yes') {
    Write-Host ''
    Write-Host 'Расширение pdo_sqlite отключено — тесты не смогут создать базу в памяти.' -ForegroundColor Red
    Write-Host 'Включите в php.ini строку: extension=pdo_sqlite' -ForegroundColor White
    Write-Host ''
    Write-Host 'Либо запустите тесты на MySQL:' -ForegroundColor White
    Write-Host '  php artisan test --env=testing' -ForegroundColor Gray
    exit 1
}

Write-Host 'pdo_sqlite: включено' -ForegroundColor Green

# --- Зависимости --------------------------------------------------------
if (-not (Test-Path 'vendor')) {
    $composerPhar = Join-Path $PSScriptRoot 'tools\composer.phar'

    if (Test-Path $composerPhar) {
        Write-Host ''
        Write-Host 'Устанавливаем зависимости Composer...' -ForegroundColor Yellow
        & $php $composerPhar install --no-interaction
    } else {
        Write-Host 'Нет папки vendor — выполните composer install в папке backend.' -ForegroundColor Red
        exit 1
    }
}

if (-not (Test-Path '.env')) {
    Write-Host 'Создаём .env из .env.example...' -ForegroundColor Yellow
    Copy-Item '.env.example' '.env'
    & $php artisan key:generate --ansi
}

# --- Запуск -------------------------------------------------------------
Write-Host ''
Write-Host 'Запускаем тесты...' -ForegroundColor Yellow
Write-Host ''

& $php vendor\bin\phpunit --colors=always

$code = $LASTEXITCODE

Write-Host ''
if ($code -eq 0) {
    Write-Host 'Все тесты прошли успешно.' -ForegroundColor Green
} else {
    Write-Host "Тесты завершились с ошибкой (код $code)." -ForegroundColor Red
}

exit $code
