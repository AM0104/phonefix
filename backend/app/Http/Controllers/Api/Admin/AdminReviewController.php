<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminReviewController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $reviews = Review::query()
            ->with(['user:id,name,email', 'service:id,title', 'technician:id,full_name'])
            ->when($request->query('status'), fn ($q, $status) => $q->where('status', $status))
            ->latest()
            ->paginate(min(100, max(1, (int) $request->query('per_page', 15))));

        return response()->json($reviews);
    }

    public function update(Request $request, Review $review): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:pending,published,rejected'],
            'text' => ['sometimes', 'string', 'min:5', 'max:2000'],
            'rating' => ['sometimes', 'integer', 'min:1', 'max:5'],
        ]);

        $review->update($data);

        return response()->json(['message' => 'Отзыв обновлён.', 'data' => $review->fresh()]);
    }

    public function destroy(Review $review): JsonResponse
    {
        $review->delete();

        return response()->json(['message' => 'Отзыв удалён.']);
    }
}