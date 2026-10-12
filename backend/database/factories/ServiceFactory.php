<?php

namespace Database\Factories;

use App\Models\Service;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Service>
 */
class ServiceFactory extends Factory
{
    protected $model = Service::class;

    public function definition(): array
    {
        $title = 'Замена '.fake()->unique()->word();

        return [
            'title' => $title,
            'slug' => Str::slug($title).'-'.fake()->unique()->numberBetween(100, 9999),
            'category' => fake()->randomElement(array_keys(Service::CATEGORY_LABELS)),
            'short_description' => fake()->sentence(8),
            'description' => fake()->paragraph(),
            'price_from' => fake()->numberBetween(500, 5000),
            'price_to' => null,
            'duration_minutes' => fake()->randomElement([30, 45, 60, 90]),
            'warranty' => '3 месяца',
            'icon' => 'screen',
            'is_active' => true,
            'is_popular' => false,
            'sort_order' => fake()->numberBetween(0, 20),
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }

    public function category(string $category): static
    {
        return $this->state(fn () => ['category' => $category]);
    }
}
