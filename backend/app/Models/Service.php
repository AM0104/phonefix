<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Service extends Model
{
    use HasFactory;

    public const CATEGORY_LABELS = [
        'diagnostics' => 'Диагностика',
        'screen' => 'Замена экранов',
        'parts' => 'Замена комплектующих',
        'software' => 'Обновление ПО',
        'other' => 'Прочие услуги',
    ];

    protected $fillable = [
        'title',
        'slug',
        'category',
        'short_description',
        'description',
        'price_from',
        'price_to',
        'duration_minutes',
        'warranty',
        'icon',
        'is_active',
        'is_popular',
        'sort_order',
    ];

    // Вычисляемые подписи отдаём в API вместе с моделью: их использует интерфейс.
    protected $appends = ['category_label', 'price_label'];

    protected function casts(): array
    {
        return [
            'price_from' => 'decimal:2',
            'price_to' => 'decimal:2',
            'is_active' => 'boolean',
            'is_popular' => 'boolean',
            'duration_minutes' => 'integer',
        ];
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeCategory(Builder $query, ?string $category): Builder
    {
        return $category ? $query->where('category', $category) : $query;
    }

    public function getCategoryLabelAttribute(): string
    {
        $category = $this->attributes['category'] ?? null;

        return $category === null ? '' : (self::CATEGORY_LABELS[$category] ?? $category);
    }

    public function getPriceLabelAttribute(): string
    {
        // Модель может быть получена с частью колонок — тогда подпись не строим.
        if (! array_key_exists('price_from', $this->attributes)) {
            return '';
        }

        $from = (float) $this->attributes['price_from'];
        $to = (float) ($this->attributes['price_to'] ?? 0);

        if ($from <= 0 && $to <= 0) {
            return 'Бесплатно';
        }

        if (! $this->attributes['price_to'] || $to <= $from) {
            return $from <= 0
                ? 'до '.number_format($to, 0, ',', ' ').' ₽'
                : 'от '.number_format($from, 0, ',', ' ').' ₽';
        }

        return number_format($from, 0, ',', ' ')
            .' – '.number_format($to, 0, ',', ' ').' ₽';
    }
}