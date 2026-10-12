<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_клиент_может_зарегистрироваться_и_получает_токен(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Иван Петров',
            'email' => 'ivan@example.com',
            'phone' => '+7 (916) 000-11-22',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ]);

        $response->assertCreated()
            ->assertJsonStructure(['message', 'user' => ['id', 'name', 'email', 'role'], 'token']);

        $this->assertSame('client', $response->json('user.role'), 'Регистрация должна создавать роль client');

        $this->assertDatabaseHas('users', [
            'email' => 'ivan@example.com',
            'role' => User::ROLE_CLIENT,
        ]);

        // Пароль хранится в виде хеша, а не открытым текстом
        $this->assertTrue(Hash::check('secret123', User::query()->where('email', 'ivan@example.com')->value('password')));
    }

    public function test_регистрация_не_позволяет_создать_администратора(): void
    {
        $this->postJson('/api/auth/register', [
            'name' => 'Хакер',
            'email' => 'hacker@example.com',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
            'role' => User::ROLE_ADMIN,
        ])->assertCreated();

        $this->assertSame(
            User::ROLE_CLIENT,
            User::query()->where('email', 'hacker@example.com')->value('role'),
            'Роль из запроса не должна применяться'
        );
    }

    public function test_регистрация_требует_подтверждения_пароля_и_уникального_email(): void
    {
        User::factory()->create(['email' => 'busy@example.com']);

        $this->postJson('/api/auth/register', [
            'name' => 'Пётр',
            'email' => 'busy@example.com',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ])->assertStatus(422)->assertJsonValidationErrors('email');

        $this->postJson('/api/auth/register', [
            'name' => 'Пётр',
            'email' => 'new@example.com',
            'password' => 'secret123',
            'password_confirmation' => 'other123',
        ])->assertStatus(422)->assertJsonValidationErrors('password');
    }

    public function test_вход_с_верным_паролем_выдаёт_токен(): void
    {
        $user = User::factory()->create(['password' => 'password']);

        $response = $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $response->assertOk()->assertJsonStructure(['user', 'token']);
        $this->assertNotEmpty($response->json('token'));
    }

    public function test_вход_с_неверным_паролем_возвращает_ошибку_валидации(): void
    {
        $user = User::factory()->create(['password' => 'password']);

        $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ])->assertStatus(422)->assertJsonValidationErrors('email');
    }

    public function test_заблокированный_пользователь_не_может_войти(): void
    {
        $user = User::factory()->create(['password' => 'password', 'is_active' => false]);

        $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'password',
        ])->assertStatus(422)->assertJsonValidationErrors('email');
    }

    public function test_требуется_токен_для_доступа_к_профилю(): void
    {
        $this->getJson('/api/auth/me')->assertUnauthorized();
    }

    public function test_профиль_доступен_по_токену_и_его_можно_обновить(): void
    {
        $user = User::factory()->create();

        $response = $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $token = $response->json('token');

        $this->withToken($token)->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.email', $user->email);

        $this->withToken($token)->patchJson('/api/auth/profile', [
            'name' => 'Новое Имя',
            'phone' => '+7 (999) 123-45-67',
        ])->assertOk()->assertJsonPath('user.name', 'Новое Имя');

        $this->assertDatabaseHas('users', ['id' => $user->id, 'name' => 'Новое Имя']);
    }

    public function test_выход_удаляет_текущий_токен(): void
    {
        $user = User::factory()->create();

        $token = $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'password',
        ])->json('token');

        $this->withToken($token)->postJson('/api/auth/logout')->assertOk();

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }
}
