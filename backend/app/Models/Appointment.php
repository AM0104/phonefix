<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Appointment extends Model
{
    use HasFactory;

    public const STATUS_LABELS = [
        'new' => 'Новая',
        'confirmed' => 'Подтверждена',
        'in_progress' => 'В работе',
        'done' => 'Выполнена',
        'canceled' => 'Отменена',
    ];

    public const PROBLEM_LABELS = [
        'diagnostics' => 'Диагностика',
        'screen' => 'Разбит экран / дисплей',
        'parts' => 'Неисправность комплектующих',
        'software' => 'Проблема с ПО',
        'other' => 'Другое',
    ];

    protected $fillable = [
        'client_id',
        'service_id',
        'technician_id',
        'schedule_id',
        'scheduled_at',
        'device_model',
        'problem_type',
        'problem_description',
        'status',
        'estimated_price',
        'final_price',
        'admin_comment',
    ];

    // Подписи статуса и типа неисправности нужны интерфейсу — отдаём их в API.
    protected $appends = ['status_label', 'problem_label'];

    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
            'estimated_price' => 'decimal:2',
            'final_price' => 'decimal:2',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function technician(): BelongsTo
    {
        return $this->belongsTo(Technician::class);
    }

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(Schedule::class);
    }

    public function scopeStatus(Builder $query, ?string $status): Builder
    {
        return $status ? $query->where('status', $status) : $query;
    }

    public function getStatusLabelAttribute(): string
    {
        $status = $this->attributes['status'] ?? null;

        return $status === null ? '' : (self::STATUS_LABELS[$status] ?? $status);
    }

    public function getProblemLabelAttribute(): string
    {
        $problem = $this->attributes['problem_type'] ?? null;

        return $problem === null ? '' : (self::PROBLEM_LABELS[$problem] ?? $problem);
    }

    public function canBeCanceled(): bool
    {
        return in_array($this->status, ['new', 'confirmed'], true);
    }
}