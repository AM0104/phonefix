<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminSettingController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => Setting::query()->orderBy('group')->orderBy('key')->get(),
            'grouped' => Setting::query()->orderBy('key')->get()->groupBy('group'),
        ]);
    }

    /**
     * Массовое обновление контента сайта: тексты, телефоны, часы работы, цены-заголовки.
     */
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'settings' => ['required', 'array'],
            'settings.*.key' => ['required', 'string', 'max:190'],
            'settings.*.value' => ['nullable', 'string', 'max:20000'],
            'settings.*.group' => ['nullable', 'string', 'max:50'],
            'settings.*.label' => ['nullable', 'string', 'max:190'],
        ]);

        DB::transaction(function () use ($data) {
            foreach ($data['settings'] as $item) {
                Setting::query()->updateOrCreate(
                    ['key' => $item['key']],
                    [
                        'value' => $item['value'] ?? null,
                        'group' => $item['group'] ?? 'general',
                        'label' => $item['label'] ?? null,
                    ]
                );
            }
        });

        return response()->json([
            'message' => 'Настройки сохранены.',
            'data' => Setting::map(),
        ]);
    }
}