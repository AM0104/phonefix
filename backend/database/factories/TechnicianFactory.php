<?php

namespace Database\Factories;

use App\Models\Technician;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Technician>
 */
class TechnicianFactory extends Factory
{
    protected $model = Technician::class;

    public function definition(): array
    {
        return [
            'user_id' => null,
            'full_name' => fake()->name(),
            'position' => 'Мастер по ремонту',
            'specialization' => fake()->randomElement([
                'Замена экранов и дисплеев',
                'Микропайка и ремонт плат',
                'Аккумуляторы и разъёмы зарядки',
                'Прошивки Android и iOS',
            ]),
            'bio' => fake()->sentence(10),
            'experience_years' => fake()->numberBetween(1, 15),
            'rating' => fake()->randomElement([4.5, 4.8, 4.9, 5.0]),
            'photo_url' => null,
            'is_active' => true,
            'sort_order' => fake()->numberBetween(0, 10),
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }
}
