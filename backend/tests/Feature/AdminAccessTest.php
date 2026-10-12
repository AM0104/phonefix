<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Lead;
use App\Models\Review;
use App\Models\Service;
use App\Models\Setting;
use App\Models\Technician;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminAccessTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->admin()->create();
    }

    public function test_гость_не_попадает_в_админку(): void
    {
        $this->getJson('/api/admin/dashboard')->assertUnauthorized();
    }

    public function test_клиент_получает_403_на_всех_разделах_админки(): void
    {
        $client = User::factory()->create(['role' => User::ROLE_CLIENT]);

        $endpoints = [
            ['get', '/api/admin/dashboard'],
            ['get', '/api/admin/appointments'],
            ['get', '/api/admin/services'],
            ['get', '/api/admin/technicians'],
            ['get', '/api/admin/reviews'],
            ['get', '/api/admin/leads'],
            ['get', '/api/admin/articles'],
            ['get', '/api/admin/users'],
            ['get', '/api/admin/settings'],
        ];

        foreach ($endpoints as [$method, $uri]) {
            $this->actingAs($client, 'sanctum')
                ->{$method.'Json'}($uri)
                ->assertForbidden();
        }
    }

    public function test_мастер_без_прав_администратора_не_проходит_в_админку(): void
    {
        $technician = User::factory()->technician()->create();

        $this->actingAs($technician, 'sanctum')->getJson('/api/admin/dashboard')->assertForbidden();
    }

    public function test_администратор_видит_дашборд_со_статистикой(): void
    {
        $admin = $this->admin();
        $service = Service::factory()->create(['is_active' => true]);
        $technician = Technician::factory()->create(['is_active' => true]);

        Appointment::factory()->status('done')->create([
            'service_id' => $service->id,
            'technician_id' => $technician->id,
            'final_price' => 5000,
        ]);
        Appointment::factory()->status('new')->create([
            'service_id' => $service->id,
            'technician_id' => $technician->id,
        ]);
        Lead::factory()->create();
        Review::factory()->create(); // на модерации

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/dashboard')->assertOk();

        $response->assertJsonStructure([
            'cards',
            'appointments_by_status',
            'appointments_by_category',
            'latest_appointments',
            'latest_leads',
            'top_services',
        ]);

        $this->assertSame(2, $response->json('cards.appointments_total'));
        $this->assertSame(1, $response->json('cards.appointments_done'));
        $this->assertSame(1, $response->json('cards.leads_new'));
        $this->assertSame(1, $response->json('cards.reviews_pending'));
        // Сумма приходит числом: MySQL отдаёт «5000.00», SQLite в памяти — «5000».
        $this->assertEqualsWithDelta(5000.0, (float) $response->json('cards.revenue_done'), 0.001);
    }

    public function test_администратор_меняет_статус_и_итоговую_цену_заявки(): void
    {
        $admin = $this->admin();
        $appointment = Appointment::factory()->create([
            'service_id' => Service::factory()->create()->id,
            'technician_id' => Technician::factory()->create()->id,
            'status' => 'new',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/appointments/{$appointment->id}", [
                'status' => 'done',
                'final_price' => 8900,
                'admin_comment' => 'Установлен оригинальный модуль',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'done');

        $this->assertDatabaseHas('appointments', [
            'id' => $appointment->id,
            'status' => 'done',
            'final_price' => 8900,
        ]);
    }

    public function test_администратор_создаёт_и_редактирует_услугу(): void
    {
        $admin = $this->admin();

        $created = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/services', [
            'title' => 'Замена аккумулятора iPhone',
            'category' => 'parts',
            'short_description' => 'Ставим новую батарею с гарантией 6 месяцев.',
            'price_from' => 1200,
            'price_to' => 4900,
            'duration_minutes' => 45,
            'warranty' => '6 месяцев',
        ])->assertCreated();

        $id = $created->json('data.id');
        $this->assertSame('zamena-akkumulyatora-iphone', $created->json('data.slug'), 'ЧПУ генерируется автоматически');

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/services/{$id}", [
                'title' => 'Замена аккумулятора iPhone',
                'category' => 'parts',
                'short_description' => 'Обновлённое описание услуги.',
                'price_from' => 1400,
                'duration_minutes' => 45,
            ])
            ->assertOk()
            ->assertJsonPath('data.price_from', '1400.00');
    }

    public function test_услугу_с_заявками_нельзя_удалить(): void
    {
        $admin = $this->admin();
        $service = Service::factory()->create();

        Appointment::factory()->create([
            'service_id' => $service->id,
            'technician_id' => Technician::factory()->create()->id,
        ]);

        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/admin/services/{$service->id}")
            ->assertStatus(422);

        $this->assertDatabaseHas('services', ['id' => $service->id]);
    }

    public function test_администратор_создаёт_мастера_с_учётной_записью(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin, 'sanctum')->postJson('/api/admin/technicians', [
            'full_name' => 'Сергей Барсуков',
            'position' => 'Мастер по комплектующим',
            'specialization' => 'Аккумуляторы и разъёмы',
            'experience_years' => 7,
            'email' => 'barsukov@phonefix.ru',
            'password' => 'password',
        ])->assertCreated();

        $this->assertDatabaseHas('users', [
            'email' => 'barsukov@phonefix.ru',
            'role' => User::ROLE_TECHNICIAN,
        ]);

        $user = User::query()->where('email', 'barsukov@phonefix.ru')->firstOrFail();

        $this->assertDatabaseHas('technicians', [
            'full_name' => 'Сергей Барсуков',
            'user_id' => $user->id,
        ]);
    }

    public function test_администратор_закрывает_и_освобождает_слот_расписания(): void
    {
        $admin = $this->admin();
        $technician = Technician::factory()->create(['is_active' => true]);
        $date = now()->addDay()->toDateString();

        $this->actingAs($admin, 'sanctum')->postJson('/api/admin/schedule', [
            'technician_id' => $technician->id,
            'date' => $date,
            'slot' => '18:00',
            'is_available' => false,
        ])->assertCreated();

        $this->assertDatabaseHas('schedules', [
            'technician_id' => $technician->id,
            'is_available' => false,
        ]);

        // Закрытое окно исчезает из свободных
        $slots = $this->getJson("/api/public/technicians/{$technician->id}/slots?date={$date}")->json('slots');
        $this->assertNotContains('18:00', array_column($slots, 'time'));

        // А после освобождения — возвращается
        $schedule = \App\Models\Schedule::query()->firstOrFail();
        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/admin/schedule/{$schedule->id}")
            ->assertOk();

        $slots = $this->getJson("/api/public/technicians/{$technician->id}/slots?date={$date}")->json('slots');
        $this->assertContains('18:00', array_column($slots, 'time'));
    }

    public function test_модерация_отзыва_публикует_его_на_сайте(): void
    {
        $admin = $this->admin();
        $review = Review::factory()->create(['status' => 'pending']);
        $service = Service::factory()->create();
        $review->update(['service_id' => $service->id]);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/reviews/{$review->id}", ['status' => 'published'])
            ->assertOk();

        $this->getJson('/api/public/reviews')->assertOk()->assertJsonPath('total', 1);
    }

    public function test_администратор_меняет_статус_лида(): void
    {
        $admin = $this->admin();
        $lead = Lead::factory()->create();

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/leads/{$lead->id}", ['status' => 'closed'])
            ->assertOk()
            ->assertJsonPath('data.status', 'closed');
    }

    public function test_тексты_сайта_обновляются_через_админку(): void
    {
        $admin = $this->admin();
        Setting::query()->create(['key' => 'site_phone', 'value' => '+7 (3522) 000-00-00', 'group' => 'contacts']);

        $this->actingAs($admin, 'sanctum')->putJson('/api/admin/settings', [
            'settings' => [
                ['key' => 'site_phone', 'value' => '+7 (3522) 999-99-99', 'group' => 'contacts', 'label' => 'Телефон'],
                ['key' => 'hero_title', 'value' => 'Ремонт телефонов за 1 визит', 'group' => 'home', 'label' => 'Заголовок'],
            ],
        ])->assertOk();

        $this->assertDatabaseHas('settings', ['key' => 'site_phone', 'value' => '+7 (3522) 999-99-99']);
        $this->assertDatabaseHas('settings', ['key' => 'hero_title', 'value' => 'Ремонт телефонов за 1 визит']);

        // Изменение видно на публичной части
        $this->getJson('/api/public/site')->assertOk()->assertJsonPath('settings.site_phone', '+7 (3522) 999-99-99');
    }

    public function test_администратор_меняет_роль_пользователя_но_не_может_удалить_себя(): void
    {
        $admin = $this->admin();
        $client = User::factory()->create(['role' => User::ROLE_CLIENT]);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/users/{$client->id}", ['role' => User::ROLE_TECHNICIAN])
            ->assertOk();

        $this->assertDatabaseHas('users', ['id' => $client->id, 'role' => User::ROLE_TECHNICIAN]);

        // Нельзя удалить собственную учётную запись
        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/admin/users/{$admin->id}")
            ->assertStatus(422);
    }

    public function test_нельзя_снять_права_с_последнего_администратора(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/users/{$admin->id}", ['role' => User::ROLE_CLIENT])
            ->assertStatus(422);

        $this->assertDatabaseHas('users', ['id' => $admin->id, 'role' => User::ROLE_ADMIN]);
    }

    public function test_администратор_создаёт_статью_блога(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin, 'sanctum')->postJson('/api/admin/articles', [
            'title' => 'Как продлить жизнь аккумулятору',
            'category' => 'Советы',
            'excerpt' => 'Пять правил зарядки, которые сохранят ёмкость батареи.',
            'body' => "Первое правило — не держать телефон на зарядке всю ночь.\nВторое — избегать нагрева.",
            'is_published' => true,
        ])->assertCreated();

        $this->getJson('/api/public/articles')->assertOk()->assertJsonCount(1, 'data');
    }
}
