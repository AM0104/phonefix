<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\AppointmentMessage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Переписка клиента и администратора по заявке.
 */
class AppointmentMessageTest extends TestCase
{
    use RefreshDatabase;

    private function appointmentFor(User $client): Appointment
    {
        return Appointment::factory()->create(['client_id' => $client->id]);
    }

    public function test_клиент_отправляет_сообщение_в_свою_заявку(): void
    {
        $client = User::factory()->create();
        $appointment = $this->appointmentFor($client);

        $this->actingAs($client, 'sanctum')
            ->postJson("/api/appointments/{$appointment->id}/messages", ['body' => 'Когда будет готово?'])
            ->assertCreated()
            ->assertJsonPath('message', 'Сообщение отправлено.')
            ->assertJsonPath('data.is_from_admin', false)
            ->assertJsonPath('data.author_name', $client->name);

        $this->assertDatabaseHas('appointment_messages', [
            'appointment_id' => $appointment->id,
            'user_id' => $client->id,
            'is_from_admin' => false,
            'is_read_by_admin' => false,
            'body' => 'Когда будет готово?',
        ]);
    }

    public function test_чужой_пользователь_не_имеет_доступа_к_переписке(): void
    {
        $client = User::factory()->create();
        $stranger = User::factory()->create();
        $appointment = $this->appointmentFor($client);

        $this->actingAs($stranger, 'sanctum')
            ->getJson("/api/appointments/{$appointment->id}/messages")
            ->assertForbidden();

        $this->actingAs($stranger, 'sanctum')
            ->postJson("/api/appointments/{$appointment->id}/messages", ['body' => 'Привет'])
            ->assertForbidden();

        $this->assertDatabaseCount('appointment_messages', 0);
    }

    public function test_слишком_короткое_сообщение_отклоняется(): void
    {
        $client = User::factory()->create();
        $appointment = $this->appointmentFor($client);

        $this->actingAs($client, 'sanctum')
            ->postJson("/api/appointments/{$appointment->id}/messages", ['body' => 'x'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('body');
    }

    public function test_администратор_отвечает_и_клиент_видит_непрочитанное(): void
    {
        $client = User::factory()->create();
        $admin = User::factory()->admin()->create();
        $appointment = $this->appointmentFor($client);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/appointments/{$appointment->id}/messages", ['body' => 'Диагностика закончена, ждём запчасть.'])
            ->assertCreated()
            ->assertJsonPath('message', 'Ответ отправлен.')
            ->assertJsonPath('data.is_from_admin', true)
            ->assertJsonPath('data.author_name', 'Администратор');

        $this->assertDatabaseHas('appointment_messages', [
            'appointment_id' => $appointment->id,
            'is_from_admin' => true,
            'is_read_by_admin' => true,
            'is_read_by_client' => false,
        ]);

        // Клиент открыл переписку — ответ считается прочитанным.
        $this->actingAs($client, 'sanctum')
            ->getJson("/api/appointments/{$appointment->id}/messages")
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->assertDatabaseHas('appointment_messages', [
            'appointment_id' => $appointment->id,
            'is_from_admin' => true,
            'is_read_by_client' => true,
        ]);
    }

    public function test_админский_список_помечает_сообщения_клиента_прочитанными(): void
    {
        $client = User::factory()->create();
        $admin = User::factory()->admin()->create();
        $appointment = $this->appointmentFor($client);

        AppointmentMessage::query()->create([
            'appointment_id' => $appointment->id,
            'user_id' => $client->id,
            'is_from_admin' => false,
            'is_read_by_admin' => false,
            'is_read_by_client' => true,
            'body' => 'Сколько будет стоить замена экрана?',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->getJson("/api/admin/appointments/{$appointment->id}/messages")
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->assertDatabaseHas('appointment_messages', [
            'appointment_id' => $appointment->id,
            'is_read_by_admin' => true,
        ]);
    }
}