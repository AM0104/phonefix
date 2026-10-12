# API PhoneFix

Базовый префикс: `/api`. Авторизация — **Laravel Sanctum**, токен передаётся заголовком:

```
Authorization: Bearer <token>
Accept: application/json
```

## Публичные эндпоинты

| Метод | Путь | Назначение |
| --- | --- | --- |
| GET | `/api/public/site` | настройки сайта и категории услуг (используется на всём сайте) |
| GET | `/api/public/home` | данные главной: популярные услуги, мастера, отзывы, статьи, цифры |
| GET | `/api/public/services` | каталог услуг; фильтры `?category=screen&search=аккумулятор&popular=1` |
| GET | `/api/public/services/{slug}` | карточка услуги, мастера направления, отзывы, похожие услуги |
| GET | `/api/public/technicians` | список мастеров |
| GET | `/api/public/technicians/{id}` | карточка мастера |
| GET | `/api/public/technicians/{id}/slots` | **свободные даты и слоты**; параметры `?date=2025-06-01&days=14` |
| GET | `/api/public/reviews` | опубликованные отзывы с пагинацией |
| GET | `/api/public/articles` | список статей |
| GET | `/api/public/articles/{slug}` | статья + похожие материалы |
| POST | `/api/public/leads` | лид из модального окна «Заказать звонок» |

### Пример ответа `GET /api/public/technicians/1/slots?date=2025-06-01`

```json
{
  "technician": { "id": 1, "full_name": "Александр Волков", "specialization": "Микропайка…", "rating": "5.0" },
  "dates": [
    { "date": "2025-06-01", "label": "Вс, 1 июня", "slots_count": 3 }
  ],
  "selected_date": "2025-06-01",
  "slots": [
    { "time": "10:00", "starts_at": "2025-06-01 10:00:00", "label": "10:00" }
  ]
}
```

## Авторизация

| Метод | Путь | Тело запроса |
| --- | --- | --- |
| POST | `/api/auth/register` | `name`, `email`, `phone`, `password`, `password_confirmation` |
| POST | `/api/auth/login` | `email`, `password` |
| GET | `/api/auth/me` | — (нужен токен) |
| PATCH | `/api/auth/profile` | `name`, `phone`, `email`, `password`, `password_confirmation` |
| POST | `/api/auth/logout` | — (удаляет текущий токен) |

## Личный кабинет клиента (нужен токен)

| Метод | Путь | Назначение |
| --- | --- | --- |
| GET | `/api/appointments` | история заявок клиента + статистика |
| POST | `/api/appointments` | **создание онлайн-записи** |
| GET | `/api/appointments/{id}` | одна заявка |
| PATCH | `/api/appointments/{id}/cancel` | отмена (слот освобождается) |
| POST | `/api/appointments/{id}/review` | отзыв по выполненной заявке (уходит на модерацию) |

### Тело `POST /api/appointments`

```json
{
  "service_id": 4,
  "technician_id": 1,
  "starts_at": "2025-06-01 10:00:00",
  "device_model": "iPhone 13 Pro",
  "problem_type": "screen",
  "problem_description": "Разбит дисплей после падения"
}
```

Слот резервируется в транзакции с блокировкой строки (`lockForUpdate`), поэтому два клиента не смогут занять одно время — второй получит `422` с сообщением «Это время уже занято».

## Админ-панель (нужны токен + роль `admin`)

| Метод | Путь | Назначение |
| --- | --- | --- |
| GET | `/api/admin/dashboard` | метрики: заявки по статусам, выручка, топ услуг, последние лиды |
| GET | `/api/admin/appointments` | список заявок; фильтры `status`, `technician_id`, `search`, `page` |
| GET | `/api/admin/appointments/{id}` | карточка заявки |
| PATCH | `/api/admin/appointments/{id}` | статус, мастер, цены, комментарий |
| DELETE | `/api/admin/appointments/{id}` | удаление заявки |
| GET/POST/PUT/DELETE | `/api/admin/services` | CRUD услуг и цен |
| GET/POST/PUT/DELETE | `/api/admin/technicians` | CRUD мастеров (создание учётной записи мастера) |
| GET | `/api/admin/schedule?technician_id=1&date=2025-06-01` | занятые и свободные окна |
| POST | `/api/admin/schedule` | закрыть слот вручную |
| DELETE | `/api/admin/schedule/{id}` | освободить слот |
| GET | `/api/admin/reviews` | отзывы; фильтр `status` |
| PATCH | `/api/admin/reviews/{id}` | модерация (`published` / `rejected`) |
| DELETE | `/api/admin/reviews/{id}` | удаление отзыва |
| GET | `/api/admin/leads` | заявки на звонок; фильтр `status` |
| PATCH | `/api/admin/leads/{id}` | сменить статус лида |
| DELETE | `/api/admin/leads/{id}` | удалить лид |
| GET/POST/PUT/DELETE | `/api/admin/articles` | CRUD статей блога |
| GET/POST/PATCH/DELETE | `/api/admin/users` | пользователи и роли |
| GET | `/api/admin/settings` | все тексты сайта |
| PUT | `/api/admin/settings` | массовое обновление (`{ "settings": [{ "key": "site_phone", "value": "…" }] }`) |

## Коды ответов

| Код | Значение |
| --- | --- |
| 200 / 201 | успех |
| 401 | нет токена или он истёк |
| 403 | роль не подходит (не администратор) |
| 404 | объект не найден |
| 422 | ошибка валидации; в `errors` — сообщения по полям |