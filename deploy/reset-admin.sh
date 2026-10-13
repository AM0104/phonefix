#!/usr/bin/env bash
# Сброс пароля администратора PhoneFix на развёрнутом сайте.
# Генерирует новый случайный пароль, включает учётку, отзывает её токены,
# печатает доступ в рамке и сохраняет копию в /root/PHONEFIX-ADMIN.txt.
# Данные сайта не затрагиваются.
#
# Запуск:  sudo bash /var/www/phonefix/deploy/reset-admin.sh
set -euo pipefail

APP_DIR="${1:-/var/www/phonefix}"
EMAIL="${2:-admin@phonefix.ru}"
BACK="$APP_DIR/backend"

if [ ! -f "$BACK/artisan" ]; then
  echo "ОШИБКА: не вижу проект в $APP_DIR (нет backend/artisan)."
  echo "Запустите: sudo bash /var/www/phonefix/deploy/reset-admin.sh /путь/к/проекту"
  exit 1
fi

# Пароль: у openssl поток конечный, поэтому нет обрыва пайпа (и падения set -e).
if command -v openssl >/dev/null 2>&1; then
  RAW="$(openssl rand -base64 30 | tr -d '/+=\n')"
else
  RAW="$(head -c 64 /dev/urandom | base64 | tr -dc 'A-Za-z0-9')"
fi
PW="${RAW:0:12}!${RAW:12:3}"

cat > /tmp/pf-reset-admin.php <<'PHP'
<?php
$base = getenv('PF_APP');
require $base.'/vendor/autoload.php';
$app = require $base.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$email = getenv('PF_EMAIL');
$pw    = getenv('PF_PW');

$user = App\Models\User::query()->where('email', $email)->first();

if (! $user) {
    fwrite(STDERR, "Пользователь {$email} не найден. Доступные администраторы:\n");
    foreach (App\Models\User::query()->where('role', 'admin')->get() as $admin) {
        fwrite(STDERR, "  {$admin->email}\n");
    }
    exit(1);
}

$user->password  = $pw;
$user->role      = App\Models\User::ROLE_ADMIN;
$user->is_active = true;
$user->save();
$user->tokens()->delete();

echo "OK: пароль администратора обновлён, токены отозваны.\n";
PHP

echo "== Меняю пароль администратора =="
PF_APP="$BACK" PF_EMAIL="$EMAIL" PF_PW="$PW" php /tmp/pf-reset-admin.php
rm -f /tmp/pf-reset-admin.php

cat > /tmp/pf-reset-list.php <<'PHP'
<?php
$base = getenv('PF_APP');
require $base.'/vendor/autoload.php';
$app = require $base.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$blocked = App\Models\User::query()->where('is_active', false)->get();
echo "Заблокированных учёток: ".$blocked->count()."\n";
foreach ($blocked as $u) {
    echo "  {$u->email}  ({$u->role})\n";
}
PHP

echo
echo "== Заблокированные демо-учётки (вход невозможен) =="
PF_APP="$BACK" php /tmp/pf-reset-list.php || true
rm -f /tmp/pf-reset-list.php

cat > /root/PHONEFIX-ADMIN.txt <<TXT
PhoneFix — доступ в админку
Адрес:  https://sweet-planet.vps.ktk-45.ru/admin
Логин:  $EMAIL
Пароль: $PW
Дата:   $(date '+%d.%m.%Y %H:%M')
TXT
chmod 600 /root/PHONEFIX-ADMIN.txt

echo
echo "==========================================================="
echo "  ДОСТУП В АДМИНКУ PHONEFIX"
echo "==========================================================="
echo "  адрес:   https://sweet-planet.vps.ktk-45.ru/admin"
echo "  логин:   $EMAIL"
echo "  пароль:  $PW"
echo "==========================================================="
echo "  Старый пароль admin123 больше не работает."
echo "  Копия сохранена: /root/PHONEFIX-ADMIN.txt"
echo "  Сменить пароль потом: кабинет /account -> Профиль."