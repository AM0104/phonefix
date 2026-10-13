#!/usr/bin/env bash
# Сброс пароля администратора PhoneFix на развёрнутом сайте.
# Генерирует новый случайный пароль, включает учётку и отзывает её токены,
# затем печатает доступ в рамке. Данные сайта не затрагиваются.
#
# Запуск:  sudo bash /var/www/phonefix/deploy/reset-admin.sh
set -euo pipefail

APP_DIR="${1:-/var/www/phonefix}"
EMAIL="${2:-admin@phonefix.ru}"
cd "$APP_DIR/backend"

PW="$(LC_ALL=C tr -dc 'A-Za-z0-9!@#%*+=?' < /dev/urandom | head -c 16)"

php artisan tinker --execute="\$u = App\Models\User::where('email', '$EMAIL')->first(); if (! \$u) { echo 'НЕТ_ТАКОГО_ПОЛЬЗОВАТЕЛЯ'; exit(1); } \$u->password = '$PW'; \$u->is_active = true; \$u->role = 'admin'; \$u->save(); \$u->tokens()->delete(); echo 'OK';" | tail -n 2

echo
echo "=== Заблокированные демо-учётки (вход невозможен) ==="
php artisan tinker --execute="foreach (App\Models\User::where('is_active', false)->get() as \$u) { echo \$u->email, '  ', \$u->role, PHP_EOL; }" | tail -n 10

echo
echo "==========================================================="
echo "  ДОСТУП В АДМИНКУ PHONEFIX (сохраните в надёжном месте)"
echo "==========================================================="
echo "  адрес:   https://sweet-planet.vps.ktk-45.ru/admin"
echo "  логин:   $EMAIL"
echo "  пароль:  $PW"
echo "==========================================================="
echo "  Пароль от старой демо-учётки (admin123) больше не работает."
echo "  Сменить пароль потом можно в кабинете: /account -> Профиль."
echo

# копия доступа на диск сервера (только для root)
cat > /root/PHONEFIX-ADMIN.txt <<TXT
PhoneFix — доступ в админку
Адрес:  https://sweet-planet.vps.ktk-45.ru/admin
Логин:  $EMAIL
Пароль: $PW
Дата:   $(date '+%d.%m.%Y %H:%M')
TXT
chmod 600 /root/PHONEFIX-ADMIN.txt
echo "Копия сохранена на сервере: /root/PHONEFIX-ADMIN.txt"