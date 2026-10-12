<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Schedule;
use App\Models\Technician;
use App\Services\SlotService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminScheduleController extends Controller
{
    public function __construct(private readonly SlotService $slots)
    {
    }

    /**
     * Занятые слоты и полная сетка свободного времени по мастеру и дате.
     */
    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'technician_id' => ['required', 'exists:technicians,id'],
            'date' => ['required', 'date_format:Y-m-d'],
        ]);

        $technician = Technician::query()->findOrFail($data['technician_id']);
        $date = CarbonImmutable::parse($data['date']);

        return response()->json([
            'technician' => $technician->only(['id', 'full_name']),
            'date' => $date->toDateString(),
            'busy' => Schedule::query()
                ->where('technician_id', $technician->id)
                ->whereDate('starts_at', $date->toDateString())
                ->with('appointment.client:id,name,phone')
                ->orderBy('starts_at')
                ->get(),
            'free_slots' => $this->slots->freeSlotsFor($technician, $date),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'technician_id' => ['required', 'exists:technicians,id'],
            'date' => ['required', 'date_format:Y-m-d'],
            'slot' => ['required', 'date_format:H:i'],
            'is_available' => ['boolean'],
        ]);

        $technician = Technician::query()->findOrFail($data['technician_id']);
        $startsAt = CarbonImmutable::parse($data['date'].' '.$data['slot']);

        $schedule = Schedule::query()->firstOrCreate(
            ['technician_id' => $technician->id, 'starts_at' => $startsAt],
            [
                'ends_at' => $startsAt->addHour(),
                'is_available' => (bool) ($data['is_available'] ?? false),
            ]
        );

        return response()->json(['message' => 'Слот сохранён.', 'data' => $schedule], 201);
    }

    public function destroy(Schedule $schedule): JsonResponse
    {
        $schedule->delete();

        return response()->json(['message' => 'Слот освобождён.']);
    }
}