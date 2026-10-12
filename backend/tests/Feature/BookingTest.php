<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Schedule;
use App\Models\Service;
use App\Models\Technician;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookingTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsClient(): User
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum');

        return $user;
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

    private function technician(array $attributes = []): Technician
    {
        return Technician::factory()->create($attributes + ['is_active' => true]);
    }

    public function test_свободные_слоты_мастера_отдаются_по_api(): void
    {
        $technician = $this->technician();
        $date = now()->addDay()->toDateString();

        // Рабочий день 10:00–20:00 с шагом 60 минут = 10 окон
        $response = $this->getJson("/api/public/technicians/{$technician->id}/slots?date={$date}");

        $response->assertOk()
            ->assertJsonPath('selected_date', $date)
            ->assertJsonStructure(['technician', 'dates', 'slots']);

        $this->assertCount(10, $response->json('slots'), 'Слоты должны генерироваться по рабочим часам');
        $this->assertSame('10:00', $response->json('slots.0.time'));
    }

    public function test_занятый_слот_исчезает_из_свободных(): void
    {
        $technician = $this->technician();
        $date = now()->addDay()->toDateString();
        $busyAt = now()->addDay()->setTime(12, 0);

        Schedule::query()->create([
            'technician_id' => $technician->id,
            'starts_at' => $busyAt,
            'ends_at' => $busyAt->copy()->addHour(),
            'is_available' => false,
        ]);

        $slots = $this->getJson("/api/public/technicians/{$technician->id}/slots?date={$date}")
            ->assertOk()
            ->json('slots');

        $times = array_column($slots, 'time');

        $this->assertNotContains('12:00', $times, 'Занятое время не должно попадать в свободные слоты');
        $this->assertCount(9, $slots);
    }

    public function test_клиент_создаёт_запись_и_слот_становится_занятым(): void
    {
        $user = $this->actingAsClient();
        $technician = $this->technician();
        $service = $this->service(['price_from' => 3200]);
        $startsAt = now()->addDays(2)->setTime(15, 0);

        $response = $this->postJson('/api/appointments', [
            'service_id' => $service->id,
            'technician_id' => $technician->id,
            'starts_at' => $startsAt->format('Y-m-d H:i:s'),
            'device_model' => 'iPhone 13 Pro',
            'problem_type' => 'screen',
            'problem_description' => 'Разбит дисплей после падения',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.status', 'new')
            ->assertJsonPath('data.client_id', $user->id);

        $this->assertDatabaseHas('appointments', [
            'client_id' => $user->id,
            'service_id' => $service->id,
            'technician_id' => $technician->id,
            'device_model' => 'iPhone 13 Pro',
            'status' => 'new',
            'estimated_price' => 3200,
        ]);

        // Слот резервируется и связывается с заявкой
        $appointment = Appointment::query()->firstOrFail();
        $this->assertNotNull($appointment->schedule_id, 'Заявка должна занимать слот расписания');

        $this->assertDatabaseHas('schedules', [
            'id' => $appointment->schedule_id,
            'technician_id' => $technician->id,
            'is_available' => false,
        ]);

        // Средняя цена услуги подставляется в предварительную стоимость
        $this->assertSame('3200.00', (string) $appointment->estimated_price);
    }

    public function test_одно_время_нельзя_занять_дважды(): void
    {
        $technician = $this->technician();
        $service = $this->service();
        $startsAt = now()->addDays(3)->setTime(14, 0)->format('Y-m-d H:i:s');

        $first = User::factory()->create();
        $second = User::factory()->create();

        $this->actingAs($first, 'sanctum')->postJson('/api/appointments', [
            'service_id' => $service->id,
            'technician_id' => $technician->id,
            'starts_at' => $startsAt,
            'device_model' => 'Samsung Galaxy S22',
            'problem_type' => 'parts',
        ])->assertCreated();

        $this->actingAs($second, 'sanctum')->postJson('/api/appointments', [
            'service_id' => $service->id,
            'technician_id' => $technician->id,
            'starts_at' => $startsAt,
            'device_model' => 'Xiaomi Redmi Note 12',
            'problem_type' => 'parts',
        ])->assertStatus(422)->assertJsonValidationErrors('starts_at');

        $this->assertDatabaseCount('appointments', 1);
        $this->assertDatabaseCount('schedules', 1);
    }

    public function test_нельзя_записаться_на_прошедшее_время(): void
    {
        $this->actingAsClient();
        $technician = $this->technician();
        $service = $this->service();

        $this->postJson('/api/appointments', [
            'service_id' => $service->id,
            'technician_id' => $technician->id,
            'starts_at' => now()->subDay()->format('Y-m-d H:i:s'),
            'device_model' => 'iPhone 12',
            'problem_type' => 'screen',
        ])->assertStatus(422)->assertJsonValidationErrors('starts_at');
    }

    public function test_запись_требует_авторизации(): void
    {
        $technician = $this->technician();
        $service = $this->service();

        $this->postJson('/api/appointments', [
            'service_id' => $service->id,
            'technician_id' => $technician->id,
            'starts_at' => now()->addDay()->setTime(11, 0)->format('Y-m-d H:i:s'),
            'device_model' => 'iPhone 12',
            'problem_type' => 'screen',
        ])->assertUnauthorized();
    }

    public function test_запрос_проверяет_модель_устройства_и_тип_неисправности(): void
    {
        $this->actingAsClient();
        $technician = $this->technician();
        $service = $this->service();

        $this->postJson('/api/appointments', [
            'service_id' => $service->id,
            'technician_id' => $technician->id,
            'starts_at' => now()->addDay()->setTime(11, 0)->format('Y-m-d H:i:s'),
            'device_model' => '',
            'problem_type' => 'несуществующий-тип',
        ])->assertStatus(422)->assertJsonValidationErrors(['device_model', 'problem_type']);
    }

    public function test_клиент_видит_только_свои_заявки(): void
    {
        $client = User::factory()->create();
        $other = User::factory()->create();
        $technician = $this->technician();
        $service = $this->service();

        $mine = Appointment::factory()->create([
            'client_id' => $client->id,
            'service_id' => $service->id,
            'technician_id' => $technician->id,
            'status' => 'new',
        ]);

        Appointment::factory()->create([
            'client_id' => $other->id,
            'service_id' => $service->id,
            'technician_id' => $technician->id,
            'status' => 'new',
        ]);

        $this->actingAs($client, 'sanctum')
            ->getJson('/api/appointments')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $mine->id);
    }

    public function test_чужая_заявка_не_открывается_и_не_отменяется(): void
    {
        $client = User::factory()->create();
        $stranger = User::factory()->create();
        $technician = $this->technician();
        $service = $this->service();

        $appointment = Appointment::factory()->create([
            'client_id' => $client->id,
            'service_id' => $service->id,
            'technician_id' => $technician->id,
            'status' => 'new',
        ]);

        $this->actingAs($stranger, 'sanctum')
            ->getJson("/api/appointments/{$appointment->id}")
            ->assertForbidden();

        $this->actingAs($stranger, 'sanctum')
            ->patchJson("/api/appointments/{$appointment->id}/cancel")
            ->assertForbidden();

        $this->assertSame('new', $appointment->fresh()->status);
    }

    public function test_отмена_заявки_освобождает_слот(): void
    {
        $client = User::factory()->create();
        $technician = $this->technician();
        $service = $this->service();
        $startsAt = now()->addDays(4)->setTime(16, 0);

        $schedule = Schedule::query()->create([
            'technician_id' => $technician->id,
            'starts_at' => $startsAt,
            'ends_at' => $startsAt->copy()->addHour(),
            'is_available' => false,
        ]);

        $appointment = Appointment::factory()->create([
            'client_id' => $client->id,
            'service_id' => $service->id,
            'technician_id' => $technician->id,
            'schedule_id' => $schedule->id,
            'scheduled_at' => $startsAt,
            'status' => 'confirmed',
        ]);

        $this->actingAs($client, 'sanctum')
            ->patchJson("/api/appointments/{$appointment->id}/cancel")
            ->assertOk()
            ->assertJsonPath('data.status', 'canceled');

        $this->assertDatabaseMissing('schedules', ['id' => $schedule->id]);

        // Освободившееся время снова доступно для записи
        $slots = $this->getJson("/api/public/technicians/{$technician->id}/slots?date={$startsAt->toDateString()}")
            ->json('slots');

        $this->assertContains('16:00', array_column($slots, 'time'));
    }

    public function test_нельзя_отменить_выполненную_заявку(): void
    {
        $client = User::factory()->create();
        $technician = $this->technician();
        $service = $this->service();

        $appointment = Appointment::factory()->create([
            'client_id' => $client->id,
            'service_id' => $service->id,
            'technician_id' => $technician->id,
            'status' => 'done',
        ]);

        $this->actingAs($client, 'sanctum')
            ->patchJson("/api/appointments/{$appointment->id}/cancel")
            ->assertStatus(422);

        $this->assertSame('done', $appointment->fresh()->status);
    }

    public function test_расписание_отдаёт_даты_со_свободными_окнами(): void
    {
        $technician = $this->technician();

        $dates = $this->getJson("/api/public/technicians/{$technician->id}/slots")
            ->assertOk()
            ->json('dates');

        $this->assertNotEmpty($dates, 'На ближайшие две недели должны быть свободные даты');
        $this->assertArrayHasKey('label', $dates[0]);
        $this->assertGreaterThan(0, $dates[0]['slots_count']);
    }

    public function test_неактивный_мастер_не_попадает_в_публичный_список(): void
    {
        $active = $this->technician(['full_name' => 'Активный Мастер']);
        $this->technician(['full_name' => 'Уволенный Мастер', 'is_active' => false]);

        $response = $this->getJson('/api/public/technicians')->assertOk();

        $names = array_column($response->json('data'), 'full_name');

        $this->assertContains('Активный Мастер', $names);
        $this->assertNotContains('Уволенный Мастер', $names);
    }
}
