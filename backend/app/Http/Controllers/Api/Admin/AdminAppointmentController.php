<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminAppointmentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $appointments = Appointment::query()
            ->with(['client:id,name,email,phone', 'service:id,title,category', 'technician:id,full_name'])
            ->when($request->query('status'), fn ($q, $status) => $q->where('status', $status))
            ->when($request->query('technician_id'), fn ($q, $id) => $q->where('technician_id', $id))
            ->when($request->query('search'), function ($q, $search) {
                $q->where(function ($sub) use ($search) {
                    $sub->where('device_model', 'like', "%{$search}%")
                        ->orWhere('problem_description', 'like', "%{$search}%")
                        ->orWhereHas('client', fn ($c) => $c->where('name', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%"));
                });
            })
            ->orderByDesc('scheduled_at')
            ->paginate((int) $request->query('per_page', 15));

        return response()->json($appointments);
    }

    public function show(Appointment $appointment): JsonResponse
    {
        return response()->json([
            'data' => $appointment->load(['client', 'service', 'technician', 'schedule']),
        ]);
    }

    public function update(Request $request, Appointment $appointment): JsonResponse
    {
        $data = $request->validate([
            'status' => ['sometimes', 'in:new,confirmed,in_progress,done,canceled'],
            'technician_id' => ['sometimes', 'exists:technicians,id'],
            'service_id' => ['sometimes', 'exists:services,id'],
            'scheduled_at' => ['sometimes', 'date'],
            'estimated_price' => ['nullable', 'numeric', 'min:0'],
            'final_price' => ['nullable', 'numeric', 'min:0'],
            'admin_comment' => ['nullable', 'string', 'max:2000'],
        ]);

        if (($data['status'] ?? null) === 'canceled') {
            $appointment->schedule?->delete();
        }

        if (isset($data['scheduled_at'])) {
            $appointment->schedule?->update(['starts_at' => $data['scheduled_at']]);
        }

        $appointment->update($data);

        return response()->json([
            'message' => 'Заявка обновлена.',
            'data' => $appointment->fresh()->load(['client', 'service', 'technician']),
        ]);
    }

    public function destroy(Appointment $appointment): JsonResponse
    {
        $appointment->schedule?->delete();
        $appointment->delete();

        return response()->json(['message' => 'Заявка удалена.']);
    }
}