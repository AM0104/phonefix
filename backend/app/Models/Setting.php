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
     * Ключи, которые разрешено отдавать в публичный API (GET /api/public/site).
     * Всё, что администратор заведёт сверх этого списка, наружу не попадёт —
     * так в публичный ответ не утекут пароли SMTP, токены карт и прочие секреты.
     */
    public const PUBLIC_KEYS = [
        'site_name', 'site_tagline', 'site_city',
        'site_phone', 'site_email', 'site_address',
        'hero_title', 'hero_subtitle', 'hero_badge', 'advantages_title',
        'work_time_weekdays', 'work_time_weekend',
        'work_day_start', 'work_day_end', 'slot_step_minutes',
        'about_text', 'delivery_text', 'footer_text',
        'privacy_text', 'privacy_policy',
        'stat_years', 'stat_repairs', 'stat_warranty_months', 'stat_masters',
    ];

    /**
     * Все настройки сайта одним ассоциативным массивом: ['site_phone' => '+7 ...'].
     * Используется во внутренних расчётах (сетка слотов) и в админке.
     *
     * @return array<string, string|null>
     */
    public static function map(): array
    {
        return static::query()->pluck('value', 'key')->all();
    }

    /**
     * Только публичные настройки — безопасный набор для открытого API.
     *
     * @return array<string, string|null>
     */
    public static function publicMap(): array
    {
        return static::query()
            ->whereIn('key', self::PUBLIC_KEYS)
            ->pluck('value', 'key')
            ->all();
    }

    public static function get(string $key, ?string $default = null): ?string
    {
        return static::query()->where('key', $key)->value('value') ?? $default;
    }
}