<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Collection;

class AppointmentMessage extends Model
{
    use HasFactory;

    protected $fillable = [
        'appointment_id',
        'user_id',
        'is_from_admin',
        'is_read_by_admin',
        'is_read_by_client',
        'body',
    ];

    protected function casts(): array
    {
        return [
            'is_from_admin' => 'boolean',
            'is_read_by_admin' => 'boolean',
            'is_read_by_client' => 'boolean',
        ];
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Имя автора сообщения для интерфейса.
     */
    public function getAuthorNameAttribute(): string
    {
        if ($this->is_from_admin) {
            return 'Администратор';
        }

        return $this->user?->name ?? 'Клиент';
    }

    /**
     * Компактное представление переписки для API.
     *
     * @param  Collection<int, self>|iterable<self>  $messages
     * @return array<int, array<string, mixed>>
     */
    public static function toApiPayload(iterable $messages): array
    {
        return collect($messages)
            ->map(fn (self $message) => [
                'id' => $message->id,
                'body' => $message->body,
                'is_from_admin' => (bool) $message->is_from_admin,
                'author_name' => $message->author_name,
                'created_at' => optional($message->created_at)->toIso8601String(),
            ])
            ->values()
            ->all();
    }
}