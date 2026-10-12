<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Article;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ArticleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $articles = Article::query()
            ->published()
            ->when($request->query('category'), fn ($q, $category) => $q->where('category', $category))
            ->latest('published_at')
            ->get(['id', 'title', 'slug', 'category', 'excerpt', 'cover_url', 'published_at']);

        return response()->json(['data' => $articles]);
    }

    public function show(Article $article): JsonResponse
    {
        abort_unless($article->is_published, 404, 'Статья не найдена.');

        return response()->json([
            'data' => $article,
            'related' => Article::query()
                ->published()
                ->where('category', $article->category)
                ->whereKeyNot($article->id)
                ->limit(3)
                ->get(['id', 'title', 'slug', 'excerpt']),
        ]);
    }
}