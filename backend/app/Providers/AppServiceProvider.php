<?php

namespace App\Providers;

use App\Models\Appointment;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\RateLimiter;
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
        $this->configureRateLimiting();

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

    /**
     * Лимиты частоты: защита от подбора пароля, спама форм и флуда публичным API.
     */
    private function configureRateLimiting(): void
    {
        // Именованный лимитер для группы api (используется throttleApi()).
        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(60)
            ->by($request->user()?->id ?: $request->ip()));

        // Вход: 5 попыток в минуту на пару «e-mail + IP».
        RateLimiter::for('login', fn (Request $request) => Limit::perMinute(5)
            ->by(mb_strtolower((string) $request->input('email')).'|'.$request->ip()));

        // Регистрация: 5 аккаунтов в минуту с одного IP.
        RateLimiter::for('register', fn (Request $request) => Limit::perMinute(5)->by($request->ip()));

        // Заявка на звонок: 5 отправок в минуту с одного IP.
        RateLimiter::for('leads', fn (Request $request) => Limit::perMinute(5)->by($request->ip()));

        // Публичное чтение (услуги, мастера, слоты, отзывы): 60 запросов в минуту.
        RateLimiter::for('public', fn (Request $request) => Limit::perMinute(60)->by($request->ip()));
    }
}