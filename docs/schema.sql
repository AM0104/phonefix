-- =====================================================================
-- PhoneFix — структура базы данных (MySQL 8 / MariaDB 10.6+)
-- =====================================================================
-- Этот файл — справочный: рабочая схема создаётся миграциями Laravel
-- (backend/database/migrations). Используйте его, если нужно показать
-- структуру БД на защите проекта или залить схему вручную.
--
--   CREATE DATABASE phonefix CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--   mysql -u root phonefix < docs/schema.sql
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- 1. Пользователи и роли (клиент / мастер / администратор)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `email_verified_at` TIMESTAMP NULL DEFAULT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('client','technician','admin') NOT NULL DEFAULT 'client',
  `phone` VARCHAR(30) NULL DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `remember_token` VARCHAR(100) NULL DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`),
  KEY `users_role_index` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 2. Каталог услуг: диагностика, замена экранов, комплектующие, ПО
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `services` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) NOT NULL,
  `category` ENUM('diagnostics','screen','parts','software','other') NOT NULL,
  `short_description` TEXT NOT NULL,
  `description` TEXT NULL DEFAULT NULL,
  `price_from` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `price_to` DECIMAL(10,2) NULL DEFAULT NULL,
  `duration_minutes` SMALLINT UNSIGNED NOT NULL DEFAULT 60,
  `warranty` VARCHAR(100) NULL DEFAULT NULL,
  `icon` VARCHAR(50) NULL DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `is_popular` TINYINT(1) NOT NULL DEFAULT 0,
  `sort_order` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `services_slug_unique` (`slug`),
  KEY `services_category_index` (`category`),
  KEY `services_is_active_index` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 3. Мастера (связь 1:1 с users для входа в систему)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `technicians` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NULL DEFAULT NULL,
  `full_name` VARCHAR(255) NOT NULL,
  `position` VARCHAR(255) NOT NULL DEFAULT 'Мастер по ремонту',
  `specialization` VARCHAR(255) NULL DEFAULT NULL,
  `bio` TEXT NULL DEFAULT NULL,
  `experience_years` TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `rating` DECIMAL(2,1) NOT NULL DEFAULT 5.0,
  `photo_url` VARCHAR(255) NULL DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_order` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `technicians_user_id_foreign` (`user_id`),
  KEY `technicians_is_active_index` (`is_active`),
  CONSTRAINT `technicians_user_id_foreign` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 4. Расписание: слоты мастеров (используются онлайн-записью)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `schedules` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `technician_id` BIGINT UNSIGNED NOT NULL,
  `starts_at` DATETIME NOT NULL,
  `ends_at` DATETIME NOT NULL,
  `is_available` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `schedules_technician_slot_unique` (`technician_id`,`starts_at`),
  KEY `schedules_starts_at_index` (`starts_at`),
  KEY `schedules_is_available_index` (`is_available`),
  CONSTRAINT `schedules_technician_id_foreign` FOREIGN KEY (`technician_id`)
    REFERENCES `technicians` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 5. Заявки (онлайн-запись): клиент + услуга + мастер + слот
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `appointments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `client_id` BIGINT UNSIGNED NOT NULL,
  `service_id` BIGINT UNSIGNED NOT NULL,
  `technician_id` BIGINT UNSIGNED NOT NULL,
  `schedule_id` BIGINT UNSIGNED NULL DEFAULT NULL,
  `scheduled_at` DATETIME NOT NULL,
  `device_model` VARCHAR(120) NOT NULL,
  `problem_type` ENUM('diagnostics','screen','parts','software','other') NOT NULL DEFAULT 'diagnostics',
  `problem_description` TEXT NULL DEFAULT NULL,
  `status` ENUM('new','confirmed','in_progress','done','canceled') NOT NULL DEFAULT 'new',
  `estimated_price` DECIMAL(10,2) NULL DEFAULT NULL,
  `final_price` DECIMAL(10,2) NULL DEFAULT NULL,
  `admin_comment` TEXT NULL DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `appointments_schedule_id_unique` (`schedule_id`),
  KEY `appointments_client_id_foreign` (`client_id`),
  KEY `appointments_service_id_foreign` (`service_id`),
  KEY `appointments_technician_id_foreign` (`technician_id`),
  KEY `appointments_scheduled_at_index` (`scheduled_at`),
  KEY `appointments_status_index` (`status`),
  CONSTRAINT `appointments_client_id_foreign` FOREIGN KEY (`client_id`)
    REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `appointments_service_id_foreign` FOREIGN KEY (`service_id`)
    REFERENCES `services` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `appointments_technician_id_foreign` FOREIGN KEY (`technician_id`)
    REFERENCES `technicians` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `appointments_schedule_id_foreign` FOREIGN KEY (`schedule_id`)
    REFERENCES `schedules` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 6. Отзывы с модерацией
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `reviews` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `service_id` BIGINT UNSIGNED NULL DEFAULT NULL,
  `technician_id` BIGINT UNSIGNED NULL DEFAULT NULL,
  `rating` TINYINT UNSIGNED NOT NULL DEFAULT 5,
  `text` TEXT NOT NULL,
  `status` ENUM('pending','published','rejected') NOT NULL DEFAULT 'pending',
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `reviews_user_id_foreign` (`user_id`),
  KEY `reviews_service_id_foreign` (`service_id`),
  KEY `reviews_technician_id_foreign` (`technician_id`),
  KEY `reviews_status_index` (`status`),
  CONSTRAINT `reviews_user_id_foreign` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `reviews_service_id_foreign` FOREIGN KEY (`service_id`)
    REFERENCES `services` (`id`) ON DELETE SET NULL,
  CONSTRAINT `reviews_technician_id_foreign` FOREIGN KEY (`technician_id`)
    REFERENCES `technicians` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 7. Лиды из модального окна «Заказать звонок»
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `leads` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(120) NOT NULL,
  `phone` VARCHAR(30) NOT NULL,
  `email` VARCHAR(255) NULL DEFAULT NULL,
  `comment` TEXT NULL DEFAULT NULL,
  `source` VARCHAR(60) NOT NULL DEFAULT 'callback-modal',
  `status` ENUM('new','in_work','closed') NOT NULL DEFAULT 'new',
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `leads_status_index` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 8. Статьи блога
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `articles` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) NOT NULL,
  `category` VARCHAR(60) NOT NULL DEFAULT 'Новости',
  `excerpt` TEXT NULL DEFAULT NULL,
  `body` LONGTEXT NOT NULL,
  `cover_url` VARCHAR(255) NULL DEFAULT NULL,
  `is_published` TINYINT(1) NOT NULL DEFAULT 1,
  `published_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `articles_slug_unique` (`slug`),
  KEY `articles_is_published_index` (`is_published`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 9. Настройки сайта (тексты, телефоны, часы работы) — редактируются в админке
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `settings` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `key` VARCHAR(255) NOT NULL,
  `value` TEXT NULL DEFAULT NULL,
  `group` VARCHAR(50) NOT NULL DEFAULT 'general',
  `label` VARCHAR(255) NULL DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `settings_key_unique` (`key`),
  KEY `settings_group_index` (`group`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 10. Служебные таблицы Laravel (токены Sanctum, сессии, очередь, кэш)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `personal_access_tokens` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tokenable_type` VARCHAR(255) NOT NULL,
  `tokenable_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `token` VARCHAR(64) NOT NULL,
  `abilities` TEXT NULL DEFAULT NULL,
  `last_used_at` TIMESTAMP NULL DEFAULT NULL,
  `expires_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `email` VARCHAR(255) NOT NULL,
  `token` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sessions` (
  `id` VARCHAR(255) NOT NULL,
  `user_id` BIGINT UNSIGNED NULL DEFAULT NULL,
  `ip_address` VARCHAR(45) NULL DEFAULT NULL,
  `user_agent` TEXT NULL DEFAULT NULL,
  `payload` LONGTEXT NOT NULL,
  `last_activity` INT NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cache` (
  `key` VARCHAR(255) NOT NULL,
  `value` MEDIUMTEXT NOT NULL,
  `expiration` INT NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cache_locks` (
  `key` VARCHAR(255) NOT NULL,
  `owner` VARCHAR(255) NOT NULL,
  `expiration` INT NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `jobs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `queue` VARCHAR(255) NOT NULL,
  `payload` LONGTEXT NOT NULL,
  `attempts` TINYINT UNSIGNED NOT NULL,
  `reserved_at` INT UNSIGNED NULL DEFAULT NULL,
  `available_at` INT UNSIGNED NOT NULL,
  `created_at` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `job_batches` (
  `id` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `total_jobs` INT NOT NULL,
  `pending_jobs` INT NOT NULL,
  `failed_jobs` INT NOT NULL,
  `failed_job_ids` LONGTEXT NOT NULL,
  `options` MEDIUMTEXT NULL DEFAULT NULL,
  `cancelled_at` INT NULL DEFAULT NULL,
  `created_at` INT NOT NULL,
  `finished_at` INT NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `failed_jobs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `uuid` VARCHAR(255) NOT NULL,
  `connection` TEXT NOT NULL,
  `queue` TEXT NOT NULL,
  `payload` LONGTEXT NOT NULL,
  `exception` LONGTEXT NOT NULL,
  `failed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- Демо-данные (логины/пароли) создаются сидерами Laravel:
--   php artisan migrate --seed
--
--   Администратор: admin@phonefix.ru  / admin123
--   Мастер:        volkov@phonefix.ru / password
--   Клиент:        client@phonefix.ru / password
-- =====================================================================
