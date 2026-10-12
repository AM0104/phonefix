<?php

namespace Database\Seeders;

use App\Models\Schedule;
use App\Models\Technician;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;

class ScheduleSeeder extends Seeder
{
    /**
     * Готовые варианты времени, чтобы на сайте сразу работала онлайн-запись.
     */
    public function run(): void
    {
        $technicians = Technician::query()->where('is_active', true)->get();

        foreach ($technicians as $index => $technician) {
            foreach (range(0, 6) as $offset) {
                $date = CarbonImmutable::now()->startOfDay()->addDays($offset);

                // Немного «шума», чтобы расписание мастеров отличалось.
                $times = match ($index % 3) {
                    0 => ['10:00', '12:00', '14:00', '16:00', '18:00'],
                    1 => ['11:00', '13:00', '15:00', '17:00', '19:00'],
                    default => ['10:30', '13:30', '16:30', '18:30'],
                };

                foreach ($times as $time) {
                    $startsAt = $date->setTimeFromTimeString($time);

                    if ($startsAt->isPast()) {
                        continue;
                    }

                    Schedule::query()->firstOrCreate(
                        ['technician_id' => $technician->id, 'starts_at' => $startsAt],
                        ['ends_at' => $startsAt->addHour(), 'is_available' => true]
                    );
                }
            }
        }
    }
}