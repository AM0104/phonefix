<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Article;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminArticleController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => Article::query()->latest('published_at')->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $data['slug'] = $this->uniqueSlug($data['title']);
        $data['published_at'] = $data['published_at'] ?? now();

        $article = Article::query()->create($data);

        return response()->json(['message' => 'Статья создана.', 'data' => $article], 201);
    }

    public function show(Article $article): JsonResponse
    {
        return response()->json(['data' => $article]);
    }

    public function update(Request $request, Article $article): JsonResponse
    {
        $data = $this->validated($request, $article);

        if (isset($data['title']) && $data['title'] !== $article->title) {
            $data['slug'] = $this->uniqueSlug($data['title'], $article->id);
        }

        $article->update($data);

        return response()->json(['message' => 'Статья обновлена.', 'data' => $article->fresh()]);
    }

    public function destroy(Article $article): JsonResponse
    {
        $article->delete();

        return response()->json(['message' => 'Статья удалена.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?Article $article = null): array
    {
        return $request->validate([
            'title' => [$article ? 'sometimes' : 'required', 'string', 'max:190'],
            'category' => ['required', 'string', 'max:60'],
            'excerpt' => ['nullable', 'string', 'max:500'],
            'body' => ['required', 'string'],
            'cover_url' => ['nullable', 'string', 'max:500'],
            'is_published' => ['boolean'],
            'published_at' => ['nullable', 'date'],
        ]);
    }

    private function uniqueSlug(string $title, ?int $ignoreId = null): string
    {
        $base = Str::slug($title, '-', config('app.locale')) ?: 'article';
        $slug = $base;
        $i = 2;

        while (Article::query()->where('slug', $slug)->when($ignoreId, fn ($q) => $q->whereKeyNot($ignoreId))->exists()) {
            $slug = $base.'-'.$i++;
        }

        return $slug;
    }
}