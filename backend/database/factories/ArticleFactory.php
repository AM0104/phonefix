<?php

namespace Database\Factories;

use App\Models\Article;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Article>
 */
class ArticleFactory extends Factory
{
    protected $model = Article::class;

    public function definition(): array
    {
        $title = fake()->unique()->sentence(6);

        return [
            'title' => $title,
            'slug' => Str::slug($title).'-'.fake()->unique()->numberBetween(100, 9999),
            'category' => fake()->randomElement(['Советы', 'Ремонт', 'Обновление ПО']),
            'excerpt' => fake()->sentence(12),
            'body' => fake()->paragraph(6),
            'cover_url' => null,
            'is_published' => true,
            'published_at' => now()->subDays(fake()->numberBetween(1, 30)),
        ];
    }

    public function draft(): static
    {
        return $this->state(fn () => ['is_published' => false]);
    }
}
