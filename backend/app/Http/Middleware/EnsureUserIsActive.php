<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsActive
{
    /**
     * Заблокированный администратором пользователь не должен пользоваться API,
     * даже если у него на руках остался действующий токен.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && ! $user->is_active) {
            return response()->json([
                'message' => 'Учётная запись заблокирована. Обратитесь к администратору.',
            ], 403);
        }

        return $next($request);
    }
}