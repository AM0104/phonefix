<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Веб-маршруты
|--------------------------------------------------------------------------
| API живёт в routes/api.php, интерфейс — SPA на React (frontend/).
| Здесь только служебные маршруты и отдача собранного SPA.
*/

Route::get('/', function () {
    $spa = public_path('app/index.html');

    if (file_exists($spa)) {
        return response()->file($spa);
    }

    return response()->json([
        'name' => 'PhoneFix API',
        'status' => 'ok',
        'docs' => '/api/public/site',
        'hint' => 'Соберите frontend (npm run build) — файлы попадут в public/app.',
    ]);
});

// SPA-fallback: любой не-API маршрут отдаёт index.html React-приложения.
Route::get('/{any}', function () {
    $spa = public_path('app/index.html');

    abort_unless(file_exists($spa), 404, 'SPA не собрана. Выполните npm run build во frontend.');

    return response()->file($spa);
})->where('any', '^(?!api|storage|up).*$');