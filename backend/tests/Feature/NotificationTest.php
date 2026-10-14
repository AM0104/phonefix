<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\AppointmentMessage;
use App\Models\Lead;
use App\Models\Review;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Счётчики для «колокольчика» админки и «Мои отзывы» в профиле.
 */
class NotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_уведомления_отдают_корректные_счётчики(): void
    {
        $admin = User::factory()->admin()->create();
        $client = User::factory()->create();

        $appointment = Appointment::factory()->create(['client_id' => $client->id, 'status' => 'new']);
        Appointment::factory()->create(['client_id' => $client->id, 'status' => 'done']);

        Lead::factory()->create(['status' => 'new']);
        Lead::factory()->create(['status' => 'closed']);

        Review::factory()->create(['user_id' => $client->id, 'status' => 'pending']);
        Review::factory()->published()->create(['user_id' => $client->id]);

        AppointmentMessage::query()->create([
            'appointment_id' => $appointment->id,
            'user_id' => $client->id,
            'is_from_admin' => false,
            'is_read_by_admin' => false,
            'is_read_by_client' => true,
            'body' => 'Есть ли в наличии запчасть?',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/notifications')
            ->assertOk()
            ->assertJsonPath('data.new_appointments', 1)
            ->assertJsonPath('data.unread_messages', 1)
            ->assertJsonPath('data.pending_reviews', 1)
            ->assertJsonPath('data.new_leads', 1)
            ->assertJsonPath('data.total', 4)
            ->assertJsonCount(4, 'data.recent');
    }

    public function test_обычный_пользователь_не_получает_уведомления_админки(): void
    {
        $client = User::factory()->create();

        $this->actingAs($client, 'sanctum')
            ->getJson('/api/admin/notifications')
            ->assertForbidden();
    }

    public function test_мои_отзывы_возвращают_только_свои(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();

        Review::factory()->create(['user_id' => $me->id, 'status' => 'pending']);
        Review::factory()->published()->create(['user_id' => $me->id]);
        Review::factory()->create(['user_id' => $other->id]);

        $this->actingAs($me, 'sanctum')
            ->getJson('/api/reviews/my')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_мои_отзывы_требуют_авторизации(): void
    {
        $this->getJson('/api/reviews/my')->assertUnauthorized();
    }
}