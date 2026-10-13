# Развёртывание PhoneFix

Меры защиты проекта и порядок действий при инциденте описаны в
[SECURITY.md](SECURITY.md).

Документ описывает два сценария:

1. **Локально на OSPanel (Windows)** — для разработки и защиты проекта «в классе».
2. **На VPS (Linux + nginx + MySQL)** — обязательный этап по заданию (`vps.ktk-45.ru`).

---

## Часть 1. Локальный запуск на OSPanel (Windows)

### 1.0. Быстрый путь (на этой машине уже подготовлено)

Проект уже подключён к OSPanel и работает на MySQL:

- привязка `D:\OSPanel\home\phonefix.local` → `E:\Сайт\backend`;
- настройки проекта — `backend\.osp\project.ini` (PHP **8.3**, `web_root = {base_dir}\public`);
- домен `phonefix.local` прописан в `C:\Windows\System32\drivers\etc\hosts`;
- база — **MySQL 8.0** (модуль OSPanel), база `phonefix`: схема и демо-данные загружены;
- `backend\.env` настроен на MySQL (`DB_HOST=127.0.1.30` — IP модуля MySQL в OSPanel);
- `backend\vendor` и сборка фронтенда `backend\public\app` уже на месте.

Что осталось сделать:

1. Запустить OSPanel **от имени администратора** (правый клик по ярлыку).
2. Включить модули **Apache**, **PHP 8.3** и **MySQL-8.0**.
3. Открыть http://phonefix.local

Если домен не подхватился — в OSPanel откройте проект `phonefix.local` и убедитесь, что
для него выбран PHP 8.3, а корень сайта — `public`.

Альтернатива без OSPanel: запустить `start-site.cmd` в корне проекта → http://127.0.0.1:4381
(свой порт PhoneFix; скрипт сам поднимает MySQL, если он не запущен, и не мешает
другим сайтам на флешке — VINPart :8000 и CookBook :4173).

> Если MySQL не стартует из OSPanel, проверьте в настройках модуля часовой пояс:
> OSPanel подставлял значение `Etc/GMT-5`, которое MySQL 8 не понимает —
> в `D:\OSPanel\config\MySQL-8.0\default\settings.ini` должно быть `time_zone = +05:00`.

Дальше в этом разделе — «длинный» путь для чистой машины с MySQL.

### 1.1. Что нужно установить

- OSPanel 6 с модулями **PHP 8.2+**, **MySQL 8 / MariaDB 10.6+**, **Apache 2.4** (или отдельно Node.js и Composer).
- Composer 2 — https://getcomposer.org/download/
- Node.js 18+ — https://nodejs.org/

### 1.2. База данных

1. Запустите в OSPanel модули **Apache** и **MySQL**.
2. Откройте «Консоль» OSPanel и создайте базу:

```bash
mysql -uroot -e "CREATE DATABASE phonefix CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

3. Проверьте данные подключения в `backend/.env` (обычно `DB_USERNAME=root`, `DB_PASSWORD=` без пароля).

### 1.3. Домен в OSPanel

1. OSPanel → **Настройки → Домены → Создать домен**.
2. Имя домена: `phonefix.local`
3. Папка домена: `E:\Сайт\backend\public`
4. Перезапустите Apache, откройте `http://phonefix.local`.

> Если проект должен открываться по корневому домену, укажите вторым шагом алиасы для SPA-роутов — Laravel сам отдаст `public/app/index.html` (fallback уже настроен в `routes/web.php`).

### 1.4. Бэкенд

```powershell
cd "E:\Сайт\backend"

# зависимости PHP
composer install

# файл окружения
Copy-Item .env.example .env

# ключ приложения
php artisan key:generate

# структура БД + демо-данные
php artisan migrate --seed

# символическая ссылка для файлов из storage
php artisan storage:link
```

Проверьте API: `http://phonefix.local/api/public/site` — должен вернуться JSON с настройками сайта.

### 1.5. Фронтенд (режим разработки)

```powershell
cd "E:\Сайт\frontend"
npm install
npm run dev
```

Откройте `http://127.0.0.1:5273` (у PhoneFix свой dev-порт, 5173 занят CookBook).
Vite проксирует `/api` на `http://127.0.0.1:4381` — порт PhoneFix из `backend/.env`.
Если API поднят на другом порту, задайте его перед запуском: `$env:VITE_API_PROXY='http://127.0.0.1:4390'`.

Если Laravel у вас обслуживается Apache на `phonefix.local`, а не `php artisan serve`, добавьте в `frontend/.env`:

```
VITE_API_URL=http://phonefix.local/api
```

### 1.6. Фронтенд (production-сборка)

```powershell
cd frontend
npm run build
```

Сборка складывается в `backend/public/app` (так настроено в `vite.config.js`), после чего весь сайт открывается по одному адресу `http://phonefix.local`.

### 1.7. Проверка перед первым запуском

В корне проекта есть два скрипта-помощника:

```powershell
# проверка окружения: версии PHP/Node, расширения, соединение с MySQL, наличие файлов
.\check-env.ps1

# автотесты (61 тест) на SQLite в памяти — рабочая база MySQL не затрагивается
.\run-tests.ps1
```

Что важно знать про тесты:

- они используют **SQLite в памяти**, поэтому поднимать отдельную тестовую базу не нужно;
- требуется расширение `pdo_sqlite` (в OSPanel обычно включено; если выключено — `check-env.ps1` подскажет);
- если `pdo_sqlite` включить нельзя, тесты можно прогнать на MySQL: `php artisan test --env=testing`;
- если PowerShell блокирует запуск скриптов (`running scripts is disabled`), используйте
  обёртки `check-env.cmd` и `run-tests.cmd` — они обходят политику запуска автоматически.

Подробное описание тестов — в [TESTING.md](TESTING.md).

---

## Часть 2. Деплой на VPS (Linux + nginx)

### 2.1. Создание машины

1. Перейдите на `vps.ktk-45.ru` и авторизуйтесь (логин и пароль с выданной карточки).
2. Создайте виртуальную машину (BM), название — любое.
3. Нажмите **«Запустить»** и дождитесь появления IP-адреса.
4. Подключитесь по SSH:

```bash
ssh root@<ваш_IP>
```

> При вводе пароля символы не отображаются — это нормально.

### 2.2. Установка окружения (Ubuntu 22.04 / 24.04)

```bash
apt update && apt upgrade -y

# nginx, MySQL, PHP 8.3 и нужные модули
apt install -y nginx mysql-server unzip git curl \
  php8.3-fpm php8.3-cli php8.3-mysql php8.3-mbstring php8.3-xml \
  php8.3-curl php8.3-zip php8.3-bcmath php8.3-gd

# Composer
curl -sS https://getcomposer.org/installer | php
mv composer.phar /usr/local/bin/composer
chmod +x /usr/local/bin/composer

# Node.js 20 (нужен только для сборки фронтенда)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

### 2.3. База данных

```bash
mysql -uroot <<'SQL'
CREATE DATABASE phonefix CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'phonefix'@'localhost' IDENTIFIED BY 'ЗаменитеЭтотПароль';
GRANT ALL PRIVILEGES ON phonefix.* TO 'phonefix'@'localhost';
FLUSH PRIVILEGES;
SQL
```

### 2.4. Загрузка проекта

Вариант А — через git:

```bash
mkdir -p /var/www && cd /var/www
git clone <адрес_репозитория> phonefix
```

Вариант Б — архивом с локальной машины (выполняется на **Windows**):

```powershell
# архивируем проект без vendor и node_modules
cd "E:\Сайт"
tar -czf phonefix.tar.gz --exclude=node_modules --exclude=vendor --exclude=backend/.env --exclude=backend/database/*.sqlite --exclude=backend/storage/logs backend frontend docs README.md
scp phonefix.tar.gz root@<ваш_IP>:/var/www/
```

На сервере:

```bash
cd /var/www && tar -xzf phonefix.tar.gz && mv backend phonefix/ 2>/dev/null || true
```

Итоговая структура: `/var/www/phonefix/backend` и `/var/www/phonefix/frontend`.

### 2.5. Настройка Laravel

```bash
cd /var/www/phonefix/backend

composer install --no-dev --optimize-autoloader

cp .env.example .env
nano .env
```

Содержимое `.env` для продакшена:

```env
APP_NAME="PhoneFix"
APP_ENV=production
APP_DEBUG=false
APP_URL=http://<ваш_IP>
APP_TIMEZONE=Asia/Yekaterinburg

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_DATABASE=phonefix
DB_USERNAME=phonefix
DB_PASSWORD=ЗаменитеЭтотПароль

SESSION_DRIVER=file
# true — только когда настроен HTTPS (см. 2.7.1), иначе cookie не будет отправляться
SESSION_SECURE_COOKIE=false
CACHE_STORE=file
QUEUE_CONNECTION=sync
FRONTEND_URL=http://<ваш_IP>
CORS_ALLOWED_ORIGINS=http://<ваш_IP>
SANCTUM_TOKEN_EXPIRATION=10080
```

Далее:

```bash
php artisan key:generate
php artisan migrate --seed --force
php artisan storage:link

# права на запись
chown -R www-data:www-data /var/www/phonefix/backend
chmod -R 775 /var/www/phonefix/backend/storage /var/www/phonefix/backend/bootstrap/cache
```

### 2.6. Сборка фронтенда

```bash
cd /var/www/phonefix/frontend
npm install
npm run build
```

Готовые файлы автоматически попадут в `/var/www/phonefix/backend/public/app`. Дополнительно настраивать пути не нужно.

### 2.7. Настройка nginx

Создайте `/etc/nginx/sites-available/phonefix`:

```nginx
server {
    listen 80;
    server_name <ваш_IP>;

    root /var/www/phonefix/backend/public;
    index index.php index.html;

    client_max_body_size 20m;

    # Не раскрываем версию сервера
    server_tokens off;

    # Заголовки безопасности (те же добавляет middleware SecurityHeaders)
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
    add_header Content-Security-Policy "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'" always;
    # HSTS включайте только вместе с HTTPS — см. 2.7.1
    # add_header Strict-Transport-Security "max-age=31536000" always;

    # Laravel: сначала статика, затем index.php
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_hide_header X-Powered-By;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

Активируйте конфиг и перезапустите сервисы:

```bash
ln -s /etc/nginx/sites-available/phonefix /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
systemctl restart php8.3-fpm
```

Откройте `http://<ваш_IP>` — должен открыться сайт PhoneFix.

### 2.7.1. HTTPS (рекомендуется, если есть домен)

По заданию сайт должен открываться по IP, поэтому TLS не обязателен. Если домен есть —
включите HTTPS: с Let's Encrypt `certbot --nginx -d ваш-домен.ru` или самоподписанным
сертификатом, затем добавьте в server-блок строку
`add_header Strict-Transport-Security "max-age=31536000" always;` и поставьте
`SESSION_SECURE_COOKIE=true` в `.env` (после правки — `php artisan config:clear`).

### 2.8. Оптимизация после деплоя

```bash
cd /var/www/phonefix/backend
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

> После каждого изменения `.env` выполняйте `php artisan config:clear` (или повторный `config:cache`).

### 2.9. Обновление проекта

```bash
cd /var/www/phonefix
git pull                                    # если используете git
# либо одной командой:  bash deploy/update-vps.sh  (git pull + миграции + сборка + кэши)

cd backend
composer install --no-dev --optimize-autoloader
php artisan migrate --force      # добавит настройку privacy_policy, не затирая ваши тексты
php artisan config:cache && php artisan route:cache

cd ../frontend && npm install && npm run build
chown -R www-data:www-data /var/www/phonefix/backend
```

---

## Часть 3. Диагностика типовых проблем

| Симптом | Причина и решение |
| --- | --- |
| Белый экран, в консоли 404 на `/api/...` | Не собрана SPA или неверный nginx-root. Проверьте, что `backend/public/app/index.html` существует и root указывает на `backend/public`. |
| `SQLSTATE[HY000] [1045] Access denied` | Неверные `DB_USERNAME` / `DB_PASSWORD` в `.env`. После правки — `php artisan config:clear`. |
| `No application encryption key` | Не выполнен `php artisan key:generate`. |
| Стили и JS не обновляются | Сборка не выполнена: `cd frontend && npm run build`, затем жёсткое обновление страницы (Ctrl+F5). |
| Ошибка 500 без деталей | Временно поставьте `APP_DEBUG=true`, посмотрите `backend/storage/logs/laravel.log`, потом верните `false`. |
| Права на запись | `chown -R www-data:www-data backend && chmod -R 775 backend/storage backend/bootstrap/cache`. |
| Онлайн-запись не показывает слоты | Проверьте, что сидер `ScheduleSeeder` отработал: `php artisan migrate --seed` или добавьте окна в админке в разделе «Расписание». |