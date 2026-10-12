<?php

namespace Database\Factories;

use App\Models\Appointment;
use App\Models\Service;
use App\Models\Technician;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Appointment>
 */
class AppointmentFactory extends Factory
{
    protected $model = Appointment::class;

    public function definition(): array
    {
        return [
            'client_id' => User::factory(),
            'service_id' => Service::factory(),
            'technician_id' => Technician::factory(),
            'schedule_id' => null,
            'scheduled_at' => now()->addDays(fake()->numberBetween(1, 10))->setTime(12, 0),
            'device_model' => fake()->randomElement([
                'iPhone 13 Pro',
                'Samsung Galaxy S22',
                'Xiaomi Redmi Note 12',
                'Honor 90',
                'Google Pixel 7',
            ]),
            'problem_type' => fake()->randomElement(array_keys(Appointment::PROBLEM_LABELS)),
            'problem_description' => fake()->sentence(12),
            'status' => 'new',
            'estimated_price' => fake()->numberBetween(1000, 9000),
            'final_price' => null,
            'admin_comment' => null,
        ];
    }

    public function status(string $status): static
    {
        return $this->state(fn () => ['status' => $status]);
    }
}
