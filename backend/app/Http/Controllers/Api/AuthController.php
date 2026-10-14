<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Rules\PhoneNumber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:120'],
            'email' => ['required', 'string', 'email:rfc', 'max:190', 'unique:users,email'],
            'phone' => ['required', 'string', 'max:30', new PhoneNumber()],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = User::query()->create([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'password' => $data['password'],
            'role' => User::ROLE_CLIENT,
        ]);

        return response()->json([
            'message' => 'Регистрация выполнена.',
            'user' => $user,
            'token' => $user->createToken('spa')->plainTextToken,
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::query()->where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Неверный e-mail или пароль.'],
            ]);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['Учётная запись заблокирована. Обратитесь к администратору.'],
            ]);
        }

        return response()->json([
            'message' => 'Вход выполнен.',
            'user' => $user,
            'token' => $user->createToken('spa')->plainTextToken,
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $request->user()->loadCount('appointments'),
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'min:2', 'max:120'],
            'phone' => ['sometimes', 'required', 'string', 'max:30', new PhoneNumber()],
            'email' => ['sometimes', 'email:rfc', 'max:190', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
            'current_password' => ['nullable', 'string'],
        ]);

        $changingPassword = ! empty($data['password']);
        $changingEmail = isset($data['email']) && mb_strtolower($data['email']) !== mb_strtolower((string) $user->email);

        // Пароль и e-mail меняются только с подтверждением текущего пароля:
        // одного украденного токена недостаточно для захвата аккаунта.
        if (($changingPassword || $changingEmail) && ! Hash::check((string) ($data['current_password'] ?? ''), $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Укажите текущий пароль, чтобы изменить пароль или e-mail.'],
            ]);
        }

        if ($changingPassword) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        unset($data['current_password']);

        $user->update($data);

        // После смены пароля отзываем все остальные токены, оставляя текущий.
        if ($changingPassword) {
            $currentTokenId = $request->user()->currentAccessToken()?->id;

            $user->tokens()
                ->when($currentTokenId, fn ($query) => $query->whereKeyNot($currentTokenId))
                ->delete();
        }

        return response()->json([
            'message' => 'Профиль обновлён.',
            'user' => $user->fresh(),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Вы вышли из аккаунта.']);
    }
}