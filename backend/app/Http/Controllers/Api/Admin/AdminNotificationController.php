<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\AppointmentMessage;
use App\Models\Lead;
use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Collection;

/**
 * Счётчики для «колокольчика» админ-панели: новые заявки, сообщения, отзывы, лиды.
 */
class AdminNotificationController extends Controller
{
    public function index(): JsonResponse
    {
        $newAppointments = Appointment::query()->where('status', 'new')->count();
        $unreadMessages = AppointmentMessage::query()
            ->where('is_from_admin', false)
            ->where('is_read_by_admin', false)
            ->count();
        $pendingReviews = Review::query()->where('status', 'pending')->count();
        $newLeads = Lead::query()->where('status', 'new')->count();

        $recent = collect()
            ->merge($this->recentAppointments())
            ->merge($this->recentMessages())
            ->merge($this->recentReviews())
            ->merge($this->recentLeads())
            ->sortByDesc('at')
            ->take(5)
            ->values()
            ->all();

        return response()->json([
            'data' => [
                'new_appointments' => $newAppointments,
                'unread_messages' => $unreadMessages,
                'pending_reviews' => $pendingReviews,
                'new_leads' => $newLeads,
                'total' => $newAppointments + $unreadMessages + $pendingReviews + $newLeads,
                'recent' => $recent,
            ],
        ]);
    }

    /**
     * @return Collection<int, array{type: string, title: string, at: string|null}>
     */
    private function recentAppointments(): Collection
    {
        return Appointment::query()
            ->where('status', 'new')
            ->latest()
            ->take(5)
            ->get()
            ->map(fn (Appointment $appointment) => [
                'type' => 'appointment',
                'title' => 'Новая заявка №'.$appointment->id.' — '.$appointment->device_model,
                'at' => optional($appointment->created_at)->toIso8601String(),
            ]);
    }

    /**
     * @return Collection<int, array{type: string, title: string, at: string|null}>
     */
    private function recentMessages(): Collection
    {
        return AppointmentMessage::query()
            ->where('is_from_admin', false)
            ->where('is_read_by_admin', false)
            ->latest()
            ->take(5)
            ->get()
            ->map(fn (AppointmentMessage $message) => [
                'type' => 'message',
                'title' => 'Сообщение по заявке №'.$message->appointment_id,
                'at' => optional($message->created_at)->toIso8601String(),
            ]);
    }

    /**
     * @return Collection<int, array{type: string, title: string, at: string|null}>
     */
    private function recentReviews(): Collection
    {
        return Review::query()
            ->where('status', 'pending')
            ->latest()
            ->take(5)
            ->get()
            ->map(fn (Review $review) => [
                'type' => 'review',
                'title' => 'Новый отзыв на модерации'.($review->rating ? ' — оценка '.$review->rating : ''),
                'at' => optional($review->created_at)->toIso8601String(),
            ]);
    }

    /**
     * @return Collection<int, array{type: string, title: string, at: string|null}>
     */
    private function recentLeads(): Collection
    {
        return Lead::query()
            ->where('status', 'new')
            ->latest()
            ->take(5)
            ->get()
            ->map(fn (Lead $lead) => [
                'type' => 'lead',
                'title' => 'Заявка на звонок: '.$lead->name,
                'at' => optional($lead->created_at)->toIso8601String(),
            ]);
    }
}