<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Lead extends Model
{
    use HasFactory;

    public const STATUS_LABELS = [
        'new' => 'Новая',
        'in_work' => 'В работе',
        'closed' => 'Обработана',
    ];

    protected $fillable = [
        'name',
        'phone',
        'email',
        'comment',
        'source',
        'status',
    ];
}