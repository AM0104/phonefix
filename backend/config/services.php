<?php

return [
    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'phonefix' => [
        'work_hours_start' => env('WORK_HOURS_START', '10:00'),
        'work_hours_end' => env('WORK_HOURS_END', '20:00'),
        'slot_step_minutes' => (int) env('SLOT_STEP_MINUTES', 60),
    ],
];