<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Technician;
use App\Services\SlotService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TechnicianController extends Controller
{
    public function __construct(private readonly SlotService $slots)
    {
    }

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => Technician::query()
                ->active()
                ->withCount(['reviews' => fn ($q) => $q->where('status', 'published')])
                ->orderBy('sort_order')
                ->get(),
        ]);
    }

    public function show(Technician $technician): JsonResponse
    {
        return response()->json([
            'data' => $technician->loadCount(['appointments', 'reviews']),
            'reviews' => $technician->reviews()->published()->with('user:id,name')->latest()->limit(10)->get(),
            'services' => \App\Models\Service::query()->active()->orderBy('sort_order')->limit(6)->get(),
        ]);
    }

    /**
     * Свободные даты и слоты мастера — «динамический выбор мастера, даты и времени из БД».
     */
    public function slots(Request $request, Technician $technician): JsonResponse
    {
        $validated = $request->validate([
            'date' => ['nullable', 'date_format:Y-m-d'],
            'days' => ['nullable', 'integer', 'min:1', 'max:30'],
        ]);

        $dates = $this->slots->availableDatesFor($technician, (int) ($validated['days'] ?? 14));

        $selected = $validated['date'] ?? ($dates[0]['date'] ?? null);

        $slots = $selected
            ? $this->slots->freeSlotsFor($technician, CarbonImmutable::parse($selected))
            : [];

        return response()->json([
            'technician' => $technician->only(['id', 'full_name', 'specialization', 'rating']),
            'dates' => $dates,
            'selected_date' => $selected,
            'slots' => $slots,
        ]);
    }
}