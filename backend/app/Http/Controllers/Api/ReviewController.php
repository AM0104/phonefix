<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $reviews = Review::query()
            ->published()
            ->with(['user:id,name', 'service:id,title,slug', 'technician:id,full_name'])
            ->when($request->query('service_id'), fn ($q, $id) => $q->where('service_id', $id))
            ->when($request->query('technician_id'), fn ($q, $id) => $q->where('technician_id', $id))
            ->latest()
            ->paginate(12);

        return response()->json($reviews);
    }

    /**
     * Отзыв можно оставить только по выполненной заявке — защита от накрутки.
     */
    public function store(Request $request, Appointment $appointment): JsonResponse
    {
        $user = $request->user();

        abort_unless($appointment->client_id === $user->id, 403, 'Это не ваша заявка.');
        abort_unless($appointment->status === 'done', 422, 'Отзыв можно оставить только после выполнения работ.');
        abort_if(
            Review::query()->where('user_id', $user->id)->where('service_id', $appointment->service_id)->exists(),
            422,
            'Вы уже оставляли отзыв по этой услуге.'
        );

        $data = $request->validate([
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'text' => ['required', 'string', 'min:10', 'max:2000'],
        ]);

        $review = Review::query()->create([
            'user_id' => $user->id,
            'service_id' => $appointment->service_id,
            'technician_id' => $appointment->technician_id,
            'rating' => $data['rating'],
            'text' => $data['text'],
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Спасибо! Отзыв отправлен на модерацию.',
            'data' => $review,
        ], 201);
    }
}