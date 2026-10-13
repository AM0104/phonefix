#!/usr/bin/env bash
# Обновление уже развёрнутого PhoneFix на VPS.
# Ничего не удаляет и не сбрасывает: git pull, новые миграции (только добавление),
# пересборка фронтенда и прогрев кэшей.
#
# Запуск:  cd /var/www/phonefix && sudo bash deploy/update-vps.sh
# Можно указать путь и ветку:  sudo bash deploy/update-vps.sh /var/www/phonefix main
set -euo pipefail

APP_DIR="${1:-/var/www/phonefix}"
BRANCH="${2:-main}"

# ---------- 0. Права ----------
# Каталог может принадлежать root/www-data, а вход выполнен под обычным
# пользователем: без этого git отказывается работать («dubious ownership»).
if command -v git >/dev/null 2>&1; then
  git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true
fi

# Для chown/systemctl/apt нужен root — поднимаем права сами.
SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  if command -v sudo >/dev/null 2>&1; then
    echo "== Запускаю с правами root через sudo (может потребоваться пароль) =="
    SUDO="sudo"
  else
    echo "ВНИМАНИЕ: вы не root и sudo недоступен — шаги с правами будут пропущены."
  fi
fi

run_root() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  elif [ -n "$SUDO" ]; then
    $SUDO "$@"
  else
    echo "   пропущено (нужен root): $*"
  fi
}

cd "$APP_DIR"

if [ ! -d .git ]; then
  echo "ОШИБКА: $APP_DIR не является git-репозиторием."
  echo "Разверните заново: git clone https://github.com/AM0104/phonefix.git $APP_DIR"
  exit 1
fi

echo "== 1/9 обновление кода =="
git fetch --all --prune
git status --short
git pull origin "$BRANCH"

echo "== 2/9 зависимости PHP =="
cd "$APP_DIR/backend"
if [ ! -x /usr/local/bin/composer ]; then
  curl -sS https://getcomposer.org/installer | php
  run_root mv composer.phar /usr/local/bin/composer
  run_root chmod +x /usr/local/bin/composer
fi
composer install --no-dev --optimize-autoloader --no-interaction

echo "== 3/9 миграции (только добавление нового) =="
php artisan migrate --force
php artisan config:clear

echo "== 4/9 ссылка на storage =="
if [ -L "$APP_DIR/backend/public/storage" ]; then
  echo "   ссылка уже есть — пропускаю"
else
  php artisan storage:link || echo "   не удалось создать ссылку (не критично)"
fi

echo "== 5/9 сборка фронтенда =="
cd "$APP_DIR/frontend"
if ! command -v npm >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | run_root bash -
  run_root apt-get install -y nodejs
fi
npm install --no-audit --no-fund
npm run build

echo "== 6/9 кэши Laravel =="
cd "$APP_DIR/backend"
php artisan config:cache
php artisan route:cache || true
if [ -d resources/views ] && [ -n "$(ls -A resources/views 2>/dev/null)" ]; then
  php artisan view:cache || true
else
  echo "   Blade-шаблонов в проекте нет — view:cache пропущен"
fi

echo "== 7/9 права на запись =="
if id www-data >/dev/null 2>&1; then
  run_root chown -R www-data:www-data "$APP_DIR/backend"
fi
run_root find "$APP_DIR/backend" -type d -exec chmod 775 {} \;
run_root find "$APP_DIR/backend" -type f -exec chmod 664 {} \;
run_root chmod -R 775 "$APP_DIR/backend/storage" "$APP_DIR/backend/bootstrap/cache"

echo "== 8/9 перезапуск сервисов =="
PHPVER="$(php -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;')"
run_root systemctl restart "php${PHPVER}-fpm" 2>/dev/null || echo "   php-fpm перезапустите вручную"
run_root systemctl reload nginx 2>/dev/null || echo "   nginx перезагрузите вручную"
if ! command -v nginx >/dev/null 2>&1; then
  echo "   nginx не найден: похоже, сайт отдаёт php artisan serve — перезапустите его вручную"
fi

echo "== 9/9 проверка =="
curl -s -o /dev/null -w "API /api/public/site .... HTTP %{http_code}\n" http://127.0.0.1/api/public/site || true
curl -s -o /dev/null -w "SPA / ................... HTTP %{http_code}\n" http://127.0.0.1/ || true
curl -s -o /dev/null -w "Страница /privacy ....... HTTP %{http_code}\n" http://127.0.0.1/privacy || true
echo "--- фрагмент настроек сайта ---"
curl -s http://127.0.0.1/api/public/site | head -c 400 || true
echo
echo "Готово. Проверьте: /privacy, раздел админки «Тексты и настройки сайта», лимит входов и смену пароля."