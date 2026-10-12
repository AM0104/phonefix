<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ServiceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $services = Service::query()
            ->active()
            ->category($request->query('category'))
            ->when($request->query('search'), function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                        ->orWhere('short_description', 'like', "%{$search}%");
                });
            })
            ->when($request->boolean('popular'), fn ($query) => $query->where('is_popular', true))
            ->orderBy('sort_order')
            ->orderBy('price_from')
            ->get();

        return response()->json([
            'categories' => Service::CATEGORY_LABELS,
            'data' => $services,
            'meta' => ['total' => $services->count()],
        ]);
    }

    public function show(Service $service): JsonResponse
    {
        abort_unless($service->is_active, 404, 'Услуга не найдена.');

        return response()->json([
            'data' => $service,
            'technicians' => \App\Models\Technician::query()->active()->orderBy('sort_order')->get(),
            'reviews' => $service->reviews()->published()->with('user:id,name')->latest()->limit(10)->get(),
            'related' => Service::query()
                ->active()
                ->where('category', $service->category)
                ->whereKeyNot($service->id)
                ->limit(3)
                ->get(),
        ]);
    }
}