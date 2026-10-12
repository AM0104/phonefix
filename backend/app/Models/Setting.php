<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    use HasFactory;

    protected $fillable = [
        'key',
        'value',
        'group',
        'label',
    ];

    /**
     * Настройки сайта одним ассоциативным массивом: ['site_phone' => '+7 ...'].
     *
     * @return array<string, string|null>
     */
    public static function map(): array
    {
        return static::query()->pluck('value', 'key')->all();
    }

    public static function get(string $key, ?string $default = null): ?string
    {
        return static::query()->where('key', $key)->value('value') ?? $default;
    }
}