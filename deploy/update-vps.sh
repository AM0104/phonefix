#!/usr/bin/env bash
# Обновление уже развёрнутого PhoneFix на VPS.
# Ничего не удаляет и не сбрасывает: только git pull, новые миграции,
# пересборка фронтенда и прогрев кэшей.
#
# Запуск на сервере:  bash /var/www/phonefix/deploy/update-vps.sh
set -euo pipefail

APP_DIR="${1:-/var/www/phonefix}"
BRANCH="${2:-main}"

cd "$APP_DIR"

if [ ! -d .git ]; then
  echo "ОШИБКА: $APP_DIR не является git-репозиторием."
  echo "Склонируйте проект: git clone https://github.com/AM0104/phonefix.git $APP_DIR"
  exit 1
fi

echo "== 1/7 обновление кода =="
git fetch --all --prune
git status --short
git pull origin "$BRANCH"

echo "== 2/9 зависимости PHP =="
cd "$APP_DIR/backend"
if [ ! -f vendor/autoload.php ] || [ ! -x /usr/local/bin/composer ]; then
  curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
fi
composer install --no-dev --optimize-autoloader --no-interaction

echo "== 3/9 миграции (только добавление нового) =="
php artisan migrate --force
php artisan config:clear

echo "== 4/9 права на запись =="
if id www-data >/dev/null 2>&1; then
  chown -R www-data:www-data "$APP_DIR/backend"
fi
find "$APP_DIR/backend" -type d -exec chmod 775 {} \;
find "$APP_DIR/backend" -type f -exec chmod 664 {} \;
chmod -R 775 "$APP_DIR/backend/storage" "$APP_DIR/backend/bootstrap/cache"

echo "== 5/9 ссылка на storage =="
php artisan storage:link 2>/dev/null || true

echo "== 6/9 сборка фронтенда =="
cd "$APP_DIR/frontend"
if ! command -v npm >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
npm install --no-audit --no-fund
npm run build

echo "== 7/9 кэши Laravel =="
cd "$APP_DIR/backend"
php artisan config:cache
php artisan route:cache || true
php artisan view:cache || true

echo "== 8/9 перезапуск сервисов =="
PHPVER="$(php -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;')"
systemctl restart "php${PHPVER}-fpm" 2>/dev/null || echo "php-fpm перезапустите вручную"
systemctl reload nginx 2>/dev/null || true

echo "== 9/9 проверка =="
curl -s -o /dev/null -w "API /api/public/site .... HTTP %{http_code}\n" http://127.0.0.1/api/public/site || true
curl -s -o /dev/null -w "SPA / ................... HTTP %{http_code}\n" http://127.0.0.1/ || true
curl -s -o /dev/null -w "Страница /privacy ....... HTTP %{http_code}\n" http://127.0.0.1/privacy || true
echo "--- фрагмент настроек сайта ---"
curl -s http://127.0.0.1/api/public/site | head -c 400 || true
echo
echo "Готово: обновление применено, данные не тронуты."