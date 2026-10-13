<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeaders
{
    /**
     * Базовые заголовки безопасности. Дублируются в nginx (docs/DEPLOY.md),
     * но работают и при отдаче приложения без nginx (php artisan serve).
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
        $response->headers->set('X-Permitted-Cross-Domain-Policies', 'none');

        // Внешних ресурсов у SPA нет: только свой бандл, свой favicon и data:-картинки.
        // 'unsafe-inline' нужен для встроенного аварийного экрана в index.html.
        $response->headers->set(
            'Content-Security-Policy',
            "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; "
            ."script-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self'; "
            ."frame-ancestors 'self'; base-uri 'self'; form-action 'self'"
        );

        return $response;
    }
}