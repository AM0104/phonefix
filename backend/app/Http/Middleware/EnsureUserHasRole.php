<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    /**
     * Пропускает запрос, если роль пользователя входит в список разрешённых.
     * Пример использования в маршруте: ->middleware('role:admin')
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user || ! $user->is_active) {
            return response()->json(['message' => 'Требуется авторизация.'], 401);
        }

        if (! in_array($user->role, $roles, true)) {
            return response()->json([
                'message' => 'Недостаточно прав для этого действия.',
                'required_roles' => $roles,
            ], 403);
        }

        return $next($request);
    }
}