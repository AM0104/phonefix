<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Article;
use App\Models\Review;
use App\Models\Service;
use App\Models\Setting;
use App\Models\Technician;
use Illuminate\Http\JsonResponse;

class PublicController extends Controller
{
    public function site(): JsonResponse
    {
        return response()->json([
            'settings' => Setting::publicMap(),
            'categories' => Service::CATEGORY_LABELS,
        ]);
    }

    public function home(): JsonResponse
    {
        return response()->json([
            'settings' => Setting::publicMap(),
            'categories' => Service::CATEGORY_LABELS,
            'popular_services' => Service::query()->active()->orderBy('sort_order')->limit(6)->get(),
            'services_count' => Service::query()->active()->count(),
            'technicians' => Technician::query()->active()->orderBy('sort_order')->limit(4)->get(),
            'reviews' => Review::query()->published()->with('user:id,name')->latest()->limit(6)->get(),
            'articles' => Article::query()->published()->latest('published_at')->limit(3)->get(['id', 'title', 'slug', 'excerpt', 'published_at']),
            'stats' => [
                'appointments_done' => \App\Models\Appointment::query()->where('status', 'done')->count(),
                'reviews_count' => Review::query()->published()->count(),
                'avg_rating' => round((float) Review::query()->published()->avg('rating'), 1) ?: 5.0,
            ],
        ]);
    }
}