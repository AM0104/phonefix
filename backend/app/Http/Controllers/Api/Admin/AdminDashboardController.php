<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Lead;
use App\Models\Review;
use App\Models\Service;
use App\Models\Technician;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AdminDashboardController extends Controller
{
    public function index(): JsonResponse
    {
        $revenue = Appointment::query()
            ->where('status', 'done')
            ->selectRaw('COALESCE(SUM(COALESCE(final_price, estimated_price, 0)), 0) as total')
            ->value('total');

        $byStatus = Appointment::query()
            ->select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status');

        $byCategory = Appointment::query()
            ->join('services', 'services.id', '=', 'appointments.service_id')
            ->select('services.category', DB::raw('COUNT(*) as total'))
            ->groupBy('services.category')
            ->pluck('total', 'services.category');

        return response()->json([
            'cards' => [
                'appointments_total' => Appointment::query()->count(),
                'appointments_new' => (int) ($byStatus['new'] ?? 0),
                'appointments_today' => Appointment::query()->whereDate('scheduled_at', today())->count(),
                'appointments_done' => (int) ($byStatus['done'] ?? 0),
                'clients' => User::query()->where('role', User::ROLE_CLIENT)->count(),
                'technicians' => Technician::query()->where('is_active', true)->count(),
                'services' => Service::query()->where('is_active', true)->count(),
                'leads_new' => Lead::query()->where('status', 'new')->count(),
                'reviews_pending' => Review::query()->where('status', 'pending')->count(),
                'revenue_done' => (float) $revenue,
            ],
            'appointments_by_status' => $byStatus,
            'appointments_by_category' => $byCategory,
            'latest_appointments' => Appointment::query()
                ->with(['client:id,name,phone', 'service:id,title', 'technician:id,full_name'])
                ->latest()
                ->limit(8)
                ->get(),
            'latest_leads' => Lead::query()->latest()->limit(6)->get(),
            'top_services' => Service::query()
                ->withCount('appointments')
                ->orderByDesc('appointments_count')
                ->limit(5)
                ->get(['id', 'title', 'category', 'price_from', 'price_to']),
        ]);
    }
}