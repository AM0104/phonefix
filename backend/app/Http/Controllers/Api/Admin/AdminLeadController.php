<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminLeadController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(
            Lead::query()
                ->when($request->query('status'), fn ($q, $status) => $q->where('status', $status))
                ->latest()
                ->paginate((int) $request->query('per_page', 15))
        );
    }

    public function update(Request $request, Lead $lead): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:new,in_work,closed'],
        ]);

        $lead->update($data);

        return response()->json(['message' => 'Лид обновлён.', 'data' => $lead->fresh()]);
    }

    public function destroy(Lead $lead): JsonResponse
    {
        $lead->delete();

        return response()->json(['message' => 'Лид удалён.']);
    }
}