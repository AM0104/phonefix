<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'role' => App\Http\Middleware\EnsureUserHasRole::class,
            'active' => App\Http\Middleware\EnsureUserIsActive::class,
        ]);

        // Общий лимит на API (60 запросов в минуту на пользователя/IP).
        $middleware->throttleApi();

        // Сайт работает за прокси панели (sweet-planet.vps.ktk-45.ru), поэтому реальный
        // IP клиента приходит в X-Forwarded-For: без этого все посетители считались бы
        // одним IP, а лимиты стали бы общими на весь интернет.
        $middleware->trustProxies(at: '*');

        $middleware->api(prepend: [
            Illuminate\Http\Middleware\HandleCors::class,
        ]);

        // Заголовки безопасности нужны и без nginx — например, при `php artisan serve`.
        $middleware->append(App\Http\Middleware\SecurityHeaders::class);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (Illuminate\Auth\AuthenticationException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json(['message' => 'Требуется авторизация.'], 401);
            }
        });

        $exceptions->render(function (Illuminate\Auth\Access\AuthorizationException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json(['message' => 'Недостаточно прав для этого действия.'], 403);
            }
        });
    })->create();