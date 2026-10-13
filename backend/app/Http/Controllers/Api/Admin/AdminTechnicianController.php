<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Technician;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminTechnicianController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => Technician::query()
                ->with('user:id,name,email,role')
                ->withCount('appointments')
                ->orderBy('sort_order')
                ->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);

        $passwordWasGenerated = false;

        $generatedPassword = null;
        $passwordWasGenerated = false;

        // Если указан e-mail — создаём связанную учётную запись мастера.
        // Пароль по умолчанию не должен быть угадываемым: генерируем случайный
        // и показываем его администратору один раз.
        if (! empty($data['email'])) {
            if (empty($data['password'])) {
                $data['password'] = Str::password(16);
                $passwordWasGenerated = true;
            }

            $generatedPassword = $data['password'];

            $user = User::query()->create([
                'name' => $data['full_name'],
                'email' => $data['email'],
                'password' => $data['password'],
                'role' => User::ROLE_TECHNICIAN,
                'phone' => $data['phone'] ?? null,
            ]);
            $data['user_id'] = $user->id;
        }

        unset($data['email'], $data['password'], $data['phone']);

        $technician = Technician::query()->create($data);

        return response()->json([
            'message' => $passwordWasGenerated
                ? 'Мастер добавлен. Пароль для входа: '.$generatedPassword.' — сохраните и передайте мастеру.'
                : 'Мастер добавлен.',
            'generated_password' => $passwordWasGenerated ? $generatedPassword : null,
            'data' => $technician,
        ], 201);
    }

    public function show(Technician $technician): JsonResponse
    {
        return response()->json([
            'data' => $technician->load('user')->loadCount(['appointments', 'schedules']),
        ]);
    }

    public function update(Request $request, Technician $technician): JsonResponse
    {
        $data = $this->validated($request, $technician);

        unset($data['email'], $data['password'], $data['phone']);

        $technician->update($data);

        return response()->json(['message' => 'Данные мастера обновлены.', 'data' => $technician->fresh()]);
    }

    public function destroy(Technician $technician): JsonResponse
    {
        if ($technician->appointments()->exists()) {
            return response()->json([
                'message' => 'У мастера есть заявки. Переведите его в неактивные вместо удаления.',
            ], 422);
        }

        $technician->delete();

        return response()->json(['message' => 'Мастер удалён.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?Technician $technician = null): array
    {
        return $request->validate([
            'full_name' => [$technician ? 'sometimes' : 'required', 'string', 'max:190'],
            'position' => ['nullable', 'string', 'max:120'],
            'specialization' => ['nullable', 'string', 'max:190'],
            'bio' => ['nullable', 'string', 'max:3000'],
            'experience_years' => ['nullable', 'integer', 'min:0', 'max:60'],
            'rating' => ['nullable', 'numeric', 'min:0', 'max:5'],
            'photo_url' => ['nullable', 'string', 'max:500'],
            'is_active' => ['boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'email' => ['nullable', 'email', 'unique:users,email'],
            'password' => ['nullable', 'string', 'min:8'],
            'phone' => ['nullable', 'string', 'max:30'],
        ]);
    }
}