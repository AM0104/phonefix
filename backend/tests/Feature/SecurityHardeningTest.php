<?php

namespace Tests\Feature;

use App\Models\Schedule;
use App\Models\Service;
use App\Models\Setting;
use App\Models\Technician;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * Проверки мер безопасности: лимиты, блокировка, сетка записи, смена пароля.
 */
class SecurityHardeningTest extends TestCase
{
    use RefreshDatabase;

    private function client(array $attributes = []): User
    {
        $user = User::factory()->create($attributes);
        $this->actingAs($user, 'sanctum');

        return $user;
    }

    private function technician(): Technician
    {
        return Technician::factory()->create(['is_active' => true]);
    }

    private function service(array $attributes = []): Service
    {
        return Service::factory()->create($attributes + [
            'category' => 'screen',
            'price_from' => 2500,
            'duration_minutes' => 60,
            'is_active' => true,
        ]);
    }

    private function booking(User $user, Technician $technician, Service $service, string $startsAt): TestResponse
    {
        return $this->actingAs($user, 'sanctum')->postJson('/api/appointments', [
            'service_id' => $service->id,
            'technician_id' => $technician->id,
            'starts_at' => $startsAt,
            'device_model' => 'iPhone 13',
            'problem_type' => 'screen',
        ]);
    }

    public function test_заблокированный_пользователь_теряет_доступ_к_api(): void
    {
        $user = User::factory()->create(['is_active' => false]);

        $this->actingAs($user, 'sanctum')->getJson('/api/appointments')->assertForbidden();
    }

    public function test_запись_вне_рабочей_сетки_отклоняется(): void
    {
        $user = $this->client();
        $technician = $this->technician();
        $service = $this->service();

        // Ночь — вне часов приёма.
        $this->booking($user, $technician, $service, now()->addDays(2)->setTime(3, 17)->format('Y-m-d H:i:s'))
            ->assertStatus(422)
            ->assertJsonValidationErrors('starts_at');

        // 10:30 не кратно шагу сетки (60 минут).
        $this->booking($user, $technician, $service, now()->addDays(2)->setTime(10, 30)->format('Y-m-d H:i:s'))
            ->assertStatus(422)
            ->assertJsonValidationErrors('starts_at');
    }

    public function test_пересечение_по_длительности_услуги_блокирует_запись(): void
    {
        $first = $this->client();
        $second = User::factory()->create();
        $technician = $this->technician();
        $long = $this->service(['duration_minutes' => 120]);
        $short = $this->service(['duration_minutes' => 60]);

        $this->booking($first, $technician, $long, now()->addDays(2)->setTime(10, 0)->format('Y-m-d H:i:s'))
            ->assertCreated();

        // 11:00 пересекается с занятым интервалом 10:00–12:00.
        $this->booking($second, $technician, $short, now()->addDays(2)->setTime(11, 0)->format('Y-m-d H:i:s'))
            ->assertStatus(422)
            ->assertJsonValidationErrors('starts_at');
    }

    public function test_заранее_объявленное_окно_занимается_без_ошибки(): void
    {
        $user = $this->client();
        $technician = $this->technician();
        $service = $this->service();
        $startsAt = now()->addDays(2)->setTime(14, 0);

        // Так окна создаёт ScheduleSeeder: строка уже есть, is_available = true.
        Schedule::query()->create([
            'technician_id' => $technician->id,
            'starts_at' => $startsAt,
            'ends_at' => $startsAt->copy()->addHour(),
            'is_available' => true,
        ]);

        $this->booking($user, $technician, $service, $startsAt->format('Y-m-d H:i:s'))->assertCreated();

        $this->assertDatabaseCount('schedules', 1);
        $this->assertDatabaseHas('schedules', [
            'technician_id' => $technician->id,
            'starts_at' => $startsAt->format('Y-m-d H:i:s'),
            'is_available' => false,
        ]);
    }

    public function test_подбор_пароля_ограничен_по_частоте(): void
    {
        User::factory()->create(['email' => 'client@example.com']);

        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $this->postJson('/api/auth/login', [
                'email' => 'client@example.com',
                'password' => 'wrong-password',
            ])->assertStatus(422);
        }

        $this->postJson('/api/auth/login', [
            'email' => 'client@example.com',
            'password' => 'wrong-password',
        ])->assertStatus(429);
    }

    public function test_смена_пароля_требует_текущий_пароль(): void
    {
        $user = User::factory()->create(['password' => 'old-password']);

        $this->actingAs($user, 'sanctum')->patchJson('/api/auth/profile', [
            'password' => 'new-password-123',
            'password_confirmation' => 'new-password-123',
        ])->assertStatus(422)->assertJsonValidationErrors('current_password');

        $this->actingAs($user, 'sanctum')->patchJson('/api/auth/profile', [
            'current_password' => 'wrong-current',
            'password' => 'new-password-123',
            'password_confirmation' => 'new-password-123',
        ])->assertStatus(422)->assertJsonValidationErrors('current_password');

        $this->actingAs($user, 'sanctum')->patchJson('/api/auth/profile', [
            'current_password' => 'old-password',
            'password' => 'new-password-123',
            'password_confirmation' => 'new-password-123',
        ])->assertOk();

        $this->assertTrue(Hash::check('new-password-123', $user->fresh()->password));
    }

    public function test_публичный_api_не_отдаёт_служебные_настройки(): void
    {
        Setting::query()->create(['key' => 'site_phone', 'value' => '+7 000 000-00-00', 'group' => 'contacts']);
        Setting::query()->create(['key' => 'smtp_password', 'value' => 'super-secret', 'group' => 'general']);

        $response = $this->getJson('/api/public/site')->assertOk();

        $this->assertSame('+7 000 000-00-00', $response->json('settings.site_phone'));
        $this->assertNull($response->json('settings.smtp_password'));
    }
}