<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\AppointmentMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Переписка клиента с сервисом по конкретной заявке.
 */
class AppointmentMessageController extends Controller
{
    public function index(Request $request, Appointment $appointment): JsonResponse
    {
        $this->authorizeClient($request, $appointment);

        // Клиент открыл переписку — ответы администратора считаются прочитанными.
        $appointment->messages()
            ->where('is_from_admin', true)
            ->where('is_read_by_client', false)
            ->update(['is_read_by_client' => true]);

        return response()->json([
            'data' => AppointmentMessage::toApiPayload(
                $appointment->messages()->with('user:id,name')->get()
            ),
        ]);
    }

    public function store(Request $request, Appointment $appointment): JsonResponse
    {
        $this->authorizeClient($request, $appointment);

        $data = $request->validate([
            'body' => ['required', 'string', 'min:2', 'max:2000'],
        ]);

        $message = AppointmentMessage::query()->create([
            'appointment_id' => $appointment->id,
            'user_id' => $request->user()->id,
            'is_from_admin' => false,
            'is_read_by_admin' => false,
            'is_read_by_client' => true,
            'body' => $data['body'],
        ]);

        return response()->json([
            'message' => 'Сообщение отправлено.',
            'data' => AppointmentMessage::toApiPayload([$message->load('user:id,name')])[0],
        ], 201);
    }

    private function authorizeClient(Request $request, Appointment $appointment): void
    {
        abort_unless($appointment->client_id === $request->user()->id, 403, 'Это не ваша заявка.');
    }
}