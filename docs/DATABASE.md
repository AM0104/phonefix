# База данных PhoneFix

СУБД: **MySQL 8 / MariaDB 10.6+**, кодировка `utf8mb4`, сравнение `utf8mb4_unicode_ci`.
Схема создаётся миграциями Laravel: `backend/database/migrations/`.

## Схема и связи

```
users ──1:1── technicians ──1:N── schedules ──1:1── appointments
  │                 │                                   ▲
  │                 └──────────────1:N──────────────────┤
  │                                                     │
  ├──1:N── appointments (client_id) ──N:1── services ────┘
  ├──1:N── reviews ──N:1── services
  │            └─────N:1── technicians
  └── (роль: client / technician / admin)
```

## Таблицы

### 1. `users` — пользователи и роли

| Поле | Тип | Назначение |
| --- | --- | --- |
| id | bigint PK | идентификатор |
| name | varchar | ФИО |
| email | varchar UNIQUE | логин |
| password | varchar | bcrypt-хеш |
| role | enum(client, technician, admin) | **ролевая модель** |
| phone | varchar(30) | телефон |
| is_active | boolean | блокировка доступа |
| email_verified_at, remember_token, timestamps | | служебные |

### 2. `services` — каталог услуг

`title`, `slug` (ЧПУ), `category` (enum: `diagnostics` — диагностика, `screen` — замена экранов, `parts` — замена комплектующих, `software` — обновление ПО, `other`), `short_description`, `description`, `price_from`, `price_to`, `duration_minutes`, `warranty`, `is_active`, `is_popular`, `sort_order`.

### 3. `technicians` — мастера

`user_id` → `users.id` (nullable, `nullOnDelete`) — учётная запись мастера, `full_name`, `position`, `specialization`, `bio`, `experience_years`, `rating`, `photo_url`, `is_active`, `sort_order`.

### 4. `schedules` — слоты расписания

`technician_id` → `technicians.id` (`cascadeOnDelete`), `starts_at`, `ends_at`, `is_available`.
Уникальный ключ `(technician_id, starts_at)` не даёт создать два окна на одно время.

### 5. `appointments` — заявки (основная бизнес-сущность)

| Поле | Тип | Назначение |
| --- | --- | --- |
| client_id | FK → users | клиент |
| service_id | FK → services (`restrictOnDelete`) | выбранная услуга |
| technician_id | FK → technicians (`restrictOnDelete`) | выбранный мастер |
| schedule_id | FK → schedules UNIQUE (`nullOnDelete`) | занятый слот |
| scheduled_at | datetime | дата и время визита |
| device_model | varchar(120) | модель телефона |
| problem_type | enum(diagnostics, screen, parts, software, other) | тип неисправности |
| problem_description | text | описание проблемы |
| status | enum(new, confirmed, in_progress, done, canceled) | статус ремонта |
| estimated_price / final_price | decimal(10,2) | предварительная и итоговая стоимость |
| admin_comment | text | комментарий мастера |

### 6. `reviews` — отзывы

`user_id` → users, `service_id` → services (nullable), `technician_id` → technicians (nullable), `rating` (1–5), `text`, `status` enum(`pending`, `published`, `rejected`).

### 7. `leads` — заявки «Заказать звонок»

`name`, `phone`, `email`, `comment`, `source`, `status` enum(`new`, `in_work`, `closed`).

### 8. `articles` — блог

`title`, `slug`, `category`, `excerpt`, `body`, `cover_url`, `is_published`, `published_at`.

### 9. `settings` — редактируемые тексты сайта

`key` UNIQUE, `value`, `group` (general/home/contacts/schedule/content/stats), `label`.
Именно эта таблица закрывает требование «админка для обновления информации и текстов».

### 10. Служебные таблицы Laravel

`personal_access_tokens` (токены Sanctum), `cache`, `cache_locks`, `jobs`, `job_batches`, `failed_jobs`, `sessions`, `password_reset_tokens`, `migrations`.

## Роли и доступ

| Роль | Возможности |
| --- | --- |
| `client` | регистрация, онлайн-запись, личный кабинет с историей, отмена заявки, отзыв по выполненному ремонту |
| `technician` | учётная запись мастера, участвует в расписании и назначении заявок (доступ к админке — по решению администратора) |
| `admin` | полный доступ: дашборд, заявки, расписание, услуги и цены, мастера, отзывы, лиды, статьи, тексты сайта, пользователи |

Технически доступ к админ-API закрыт двумя слоями: `auth:sanctum` + `role:admin` (`app/Http/Middleware/EnsureUserHasRole.php`).

## Пересоздание базы

```bash
cd backend
php artisan migrate:fresh --seed     # ⚠️ удалит данные и зальёт демо-набор
```