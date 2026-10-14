<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Rules\PhoneNumber;
use App\Models\Lead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeadController extends Controller
{
    /**
     * Модальное окно «Заказать звонок» — лид сохраняется в БД.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:120'],
            'phone' => ['required', 'string', 'max:30', new PhoneNumber()],
            'email' => ['nullable', 'email:rfc', 'max:190'],
            'comment' => ['nullable', 'string', 'max:2000'],
            'source' => ['nullable', 'string', 'max:60'],
        ]);

        $lead = Lead::query()->create([
            'name' => $data['name'],
            'phone' => $data['phone'],
            'email' => $data['email'] ?? null,
            'comment' => $data['comment'] ?? null,
            'source' => $data['source'] ?? 'callback-modal',
            'status' => 'new',
        ]);

        return response()->json([
            'message' => 'Заявка принята. Мастер перезвонит в течение 15 минут.',
            'lead_id' => $lead->id,
        ], 201);
    }
}