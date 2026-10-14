<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\AppointmentMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Ответы администратора в переписке по заявке.
 */
class AdminAppointmentMessageController extends Controller
{
    public function index(Appointment $appointment): JsonResponse
    {
        // Администратор прочитал переписку — сообщения клиента помечаем прочитанными.
        $appointment->messages()
            ->where('is_from_admin', false)
            ->where('is_read_by_admin', false)
            ->update(['is_read_by_admin' => true]);

        return response()->json([
            'data' => AppointmentMessage::toApiPayload(
                $appointment->messages()->with('user:id,name')->get()
            ),
        ]);
    }

    public function store(Request $request, Appointment $appointment): JsonResponse
    {
        $data = $request->validate([
            'body' => ['required', 'string', 'min:2', 'max:2000'],
        ]);

        $message = AppointmentMessage::query()->create([
            'appointment_id' => $appointment->id,
            'user_id' => $request->user()->id,
            'is_from_admin' => true,
            'is_read_by_admin' => true,
            'is_read_by_client' => false,
            'body' => $data['body'],
        ]);

        return response()->json([
            'message' => 'Ответ отправлен.',
            'data' => AppointmentMessage::toApiPayload([$message->load('user:id,name')])[0],
        ], 201);
    }
}