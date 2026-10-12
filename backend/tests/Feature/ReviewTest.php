<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Review;
use App\Models\Service;
use App\Models\Technician;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReviewTest extends TestCase
{
    use RefreshDatabase;

    private function appointment(User $client, string $status = 'done'): Appointment
    {
        return Appointment::factory()->create([
            'client_id' => $client->id,
            'service_id' => Service::factory()->create()->id,
            'technician_id' => Technician::factory()->create()->id,
            'status' => $status,
        ]);
    }

    public function test_отзыв_по_выполненной_заявке_уходит_на_модерацию(): void
    {
        $client = User::factory()->create();
        $appointment = $this->appointment($client, 'done');

        $this->actingAs($client, 'sanctum')
            ->postJson("/api/appointments/{$appointment->id}/review", [
                'rating' => 5,
                'text' => 'Заменили экран за час, всё честно рассказали заранее.',
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending');

        $this->assertDatabaseHas('reviews', [
            'user_id' => $client->id,
            'service_id' => $appointment->service_id,
            'technician_id' => $appointment->technician_id,
            'rating' => 5,
            'status' => 'pending',
        ]);

        // Отзыв на модерации не виден на сайте
        $this->getJson('/api/public/reviews')->assertOk()->assertJsonPath('total', 0);
    }

    public function test_отзыв_нельзя_оставить_по_незавершённой_заявке(): void
    {
        $client = User::factory()->create();
        $appointment = $this->appointment($client, 'in_progress');

        $this->actingAs($client, 'sanctum')
            ->postJson("/api/appointments/{$appointment->id}/review", [
                'rating' => 5,
                'text' => 'Пока рано оценивать, ремонт ещё идёт.',
            ])
            ->assertStatus(422);

        $this->assertDatabaseCount('reviews', 0);
    }

    public function test_чужую_заявку_нельзя_оценить(): void
    {
        $client = User::factory()->create();
        $stranger = User::factory()->create();
        $appointment = $this->appointment($client, 'done');

        $this->actingAs($stranger, 'sanctum')
            ->postJson("/api/appointments/{$appointment->id}/review", [
                'rating' => 1,
                'text' => 'Пишу отзыв на чужую заявку, так делать нельзя.',
            ])
            ->assertForbidden();

        $this->assertDatabaseCount('reviews', 0);
    }

    public function test_повторный_отзыв_по_той_же_услуге_запрещён(): void
    {
        $client = User::factory()->create();
        $appointment = $this->appointment($client, 'done');

        Review::factory()->create([
            'user_id' => $client->id,
            'service_id' => $appointment->service_id,
            'status' => 'pending',
        ]);

        $this->actingAs($client, 'sanctum')
            ->postJson("/api/appointments/{$appointment->id}/review", [
                'rating' => 5,
                'text' => 'Пытаюсь оставить второй отзыв по этой же услуге.',
            ])
            ->assertStatus(422);

        $this->assertDatabaseCount('reviews', 1);
    }

    public function test_оценка_проверяется_по_диапазону_и_текст_по_длине(): void
    {
        $client = User::factory()->create();
        $appointment = $this->appointment($client, 'done');

        $this->actingAs($client, 'sanctum')
            ->postJson("/api/appointments/{$appointment->id}/review", [
                'rating' => 9,
                'text' => 'мало',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['rating', 'text']);
    }

    public function test_оценка_и_текст_сохраняются_без_изменений(): void
    {
        $client = User::factory()->create();
        $appointment = $this->appointment($client, 'done');

        $this->actingAs($client, 'sanctum')
            ->postJson("/api/appointments/{$appointment->id}/review", [
                'rating' => 4,
                'text' => 'Батарею заменили быстро, но запчасть ждал один день.',
            ])
            ->assertCreated();

        $this->assertDatabaseHas('reviews', [
            'rating' => 4,
            'status' => 'pending',
            'text' => 'Батарею заменили быстро, но запчасть ждал один день.',
        ]);
    }
}
