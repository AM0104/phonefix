<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminServiceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $services = Service::query()
            ->when($request->query('category'), fn ($q, $c) => $q->where('category', $c))
            ->when($request->query('search'), fn ($q, $s) => $q->where('title', 'like', "%{$s}%"))
            ->orderBy('sort_order')
            ->get();

        return response()->json(['data' => $services]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);

        $data['slug'] = $this->uniqueSlug($data['title']);
        $service = Service::query()->create($data);

        return response()->json(['message' => 'Услуга создана.', 'data' => $service], 201);
    }

    public function show(Service $service): JsonResponse
    {
        return response()->json(['data' => $service->loadCount('appointments')]);
    }

    public function update(Request $request, Service $service): JsonResponse
    {
        $data = $this->validated($request, $service);

        if (isset($data['title']) && $data['title'] !== $service->title) {
            $data['slug'] = $this->uniqueSlug($data['title'], $service->id);
        }

        $service->update($data);

        return response()->json(['message' => 'Услуга обновлена.', 'data' => $service->fresh()]);
    }

    public function destroy(Service $service): JsonResponse
    {
        if ($service->appointments()->exists()) {
            return response()->json([
                'message' => 'Нельзя удалить услугу, по ней есть заявки. Снимите признак «активна».',
            ], 422);
        }

        $service->delete();

        return response()->json(['message' => 'Услуга удалена.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?Service $service = null): array
    {
        return $request->validate([
            'title' => [$service ? 'sometimes' : 'required', 'string', 'max:190'],
            'category' => ['required', 'in:diagnostics,screen,parts,software,other'],
            'short_description' => ['required', 'string', 'max:500'],
            'description' => ['nullable', 'string'],
            'price_from' => ['required', 'numeric', 'min:0'],
            'price_to' => ['nullable', 'numeric', 'min:0', 'gte:price_from'],
            'duration_minutes' => ['required', 'integer', 'min:15', 'max:1440'],
            'warranty' => ['nullable', 'string', 'max:100'],
            'icon' => ['nullable', 'string', 'max:50'],
            'is_active' => ['boolean'],
            'is_popular' => ['boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);
    }

    private function uniqueSlug(string $title, ?int $ignoreId = null): string
    {
        $base = Str::slug($title, '-', config('app.locale'));
        $slug = $base;
        $i = 2;

        while (Service::query()->where('slug', $slug)->when($ignoreId, fn ($q) => $q->whereKeyNot($ignoreId))->exists()) {
            $slug = $base.'-'.$i++;
        }

        return $slug;
    }
}