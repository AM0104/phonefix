<?php

namespace App\Providers;

use App\Models\Appointment;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\ServiceProvider;
use Throwable;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Заявки с прошедшей датой автоматически закрываются как выполненные
        // для корректной статистики в админ-панели.
        // Обёрнуто в try/catch, чтобы artisan-команды не падали до миграций.
        try {
            Appointment::query()
                ->where('status', 'confirmed')
                ->where('scheduled_at', '<', Date::now()->subDay())
                ->update(['status' => 'done']);
        } catch (Throwable) {
            // Таблицы ещё нет (например, до `php artisan migrate`) — пропускаем.
        }
    }
}