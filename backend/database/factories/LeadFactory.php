<?php

namespace Database\Factories;

use App\Models\Lead;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Lead>
 */
class LeadFactory extends Factory
{
    protected $model = Lead::class;

    public function definition(): array
    {
        return [
            'name' => fake()->firstName(),
            'phone' => fake()->unique()->phoneNumber(),
            'email' => null,
            'comment' => fake()->sentence(10),
            'source' => 'callback-modal',
            'status' => 'new',
        ];
    }

    public function inWork(): static
    {
        return $this->state(fn () => ['status' => 'in_work']);
    }

    public function closed(): static
    {
        return $this->state(fn () => ['status' => 'closed']);
    }
}
