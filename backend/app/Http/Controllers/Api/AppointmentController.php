<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Service;
use App\Models\Technician;
use App\Services\SlotService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AppointmentController extends Controller
{
    public function __construct(private readonly SlotService $slots)
    {
    }

    /**
     * История заявок клиента.
     */
    public function index(Request $request): JsonResponse
    {
        $appointments = Appointment::query()
            ->with(['service:id,title,slug,category', 'technician:id,full_name,specialization'])
            ->where('client_id', $request->user()->id)
            ->when($request->query('status'), fn ($q, $status) => $q->where('status', $status))
            ->orderByDesc('scheduled_at')
            ->get();

        return response()->json([
            'data' => $appointments,
            'stats' => [
                'total' => $appointments->count(),
                'active' => $appointments->whereIn('status', ['new', 'confirmed', 'in_progress'])->count(),
                'done' => $appointments->where('status', 'done')->count(),
                'can_review' => $appointments->where('status', 'done')->count(),
            ],
        ]);
    }

    public function show(Request $request, Appointment $appointment): JsonResponse
    {
        abort_unless($appointment->client_id === $request->user()->id, 403, 'Это не ваша заявка.');

        return response()->json([
            'data' => $appointment->load(['service', 'technician', 'schedule']),
        ]);
    }

    /**
     * Онлайн-запись: клиент выбирает услугу, мастера, свободный слот из БД.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'service_id' => ['required', 'exists:services,id'],
            'technician_id' => ['required', 'exists:technicians,id'],
            'starts_at' => ['required', 'date_format:Y-m-d H:i:s'],
            'device_model' => ['required', 'string', 'max:120'],
            'problem_type' => ['required', 'in:diagnostics,screen,parts,software,other'],
            'problem_description' => ['nullable', 'string', 'max:2000'],
        ]);

        $service = Service::query()->whereKey($data['service_id'])->where('is_active', true)->firstOrFail();
        $technician = Technician::query()->whereKey($data['technician_id'])->where('is_active', true)->firstOrFail();
        $startsAt = CarbonImmutable::parse($data['starts_at']);

        if ($startsAt->isPast()) {
            throw ValidationException::withMessages([
                'starts_at' => ['Нельзя записаться на прошедшее время.'],
            ]);
        }

        $appointment = DB::transaction(function () use ($request, $data, $service, $technician, $startsAt) {
            // Блокируем слот, чтобы двое клиентов не заняли одно время.
            $alreadyTaken = \App\Models\Schedule::query()
                ->where('technician_id', $technician->id)
                ->where('starts_at', $startsAt)
                ->lockForUpdate()
                ->exists();

            if ($alreadyTaken) {
                throw ValidationException::withMessages([
                    'starts_at' => ['Это время уже занято. Выберите другой слот.'],
                ]);
            }

            $schedule = $this->slots->reserve($technician, $startsAt, (int) $service->duration_minutes);

            return Appointment::query()->create([
                'client_id' => $request->user()->id,
                'service_id' => $service->id,
                'technician_id' => $technician->id,
                'schedule_id' => $schedule->id,
                'scheduled_at' => $startsAt,
                'device_model' => $data['device_model'],
                'problem_type' => $data['problem_type'],
                'problem_description' => $data['problem_description'] ?? null,
                'status' => 'new',
                'estimated_price' => $service->price_from,
            ]);
        });

        return response()->json([
            'message' => 'Заявка создана. Мы подтвердим запись по телефону.',
            'data' => $appointment->load(['service:id,title', 'technician:id,full_name']),
        ], 201);
    }

    public function cancel(Request $request, Appointment $appointment): JsonResponse
    {
        abort_unless($appointment->client_id === $request->user()->id, 403, 'Это не ваша заявка.');
        abort_unless($appointment->canBeCanceled(), 422, 'Эту заявку уже нельзя отменить.');

        $appointment->update(['status' => 'canceled']);
        $appointment->schedule?->delete();

        return response()->json([
            'message' => 'Заявка отменена, слот снова свободен.',
            'data' => $appointment->fresh(),
        ]);
    }
}