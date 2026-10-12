<?php

namespace App\Services;

use App\Models\Schedule;
use App\Models\Technician;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

class SlotService
{
    /**
     * Полный список возможных слотов мастера на дату (по рабочим часам).
     *
     * @return Collection<int, CarbonImmutable>
     */
    public function generateSlots(CarbonImmutable $date, string $start, string $end, int $stepMinutes): Collection
    {
        $step = max(15, $stepMinutes);
        $cursor = $date->setTimeFromTimeString($start);
        $endAt = $date->setTimeFromTimeString($end);

        $slots = collect();

        while ($cursor->lessThan($endAt)) {
            $slots->push($cursor);
            $cursor = $cursor->addMinutes($step);
        }

        return $slots;
    }

    /**
     * Свободные слоты мастера: сгенерированные по сетке минус занятые заявками.
     *
     * @return array<int, array{time: string, starts_at: string, label: string}>
     */
    public function freeSlotsFor(Technician $technician, CarbonImmutable $date): array
    {
        $settings = \App\Models\Setting::map();
        $start = $settings['work_day_start'] ?? '10:00';
        $end = $settings['work_day_end'] ?? '20:00';
        $step = (int) ($settings['slot_step_minutes'] ?? 60);

        $busy = Schedule::query()
            ->where('technician_id', $technician->id)
            ->whereDate('starts_at', $date->toDateString())
            ->pluck('starts_at')
            ->map(fn ($value) => CarbonImmutable::parse($value)->format('H:i'))
            ->all();

        return $this->generateSlots($date, $start, $end, $step)
            ->reject(fn (CarbonImmutable $slot) => in_array($slot->format('H:i'), $busy, true))
            ->reject(fn (CarbonImmutable $slot) => $slot->isPast())
            ->map(fn (CarbonImmutable $slot) => [
                'time' => $slot->format('H:i'),
                'starts_at' => $slot->format('Y-m-d H:i:s'),
                'label' => $slot->format('H:i'),
            ])
            ->values()
            ->all();
    }

    /**
     * Даты, на которые у мастера есть хотя бы один свободный слот.
     *
     * @return array<int, array{date: string, label: string, slots_count: int}>
     */
    public function availableDatesFor(Technician $technician, int $days = 14): array
    {
        $today = CarbonImmutable::now()->startOfDay();

        return collect(range(0, $days - 1))
            ->map(fn (int $offset) => $today->addDays($offset))
            ->map(function (CarbonImmutable $date) use ($technician) {
                $slots = $this->freeSlotsFor($technician, $date);

                return [
                    'date' => $date->format('Y-m-d'),
                    'label' => $this->humanDate($date),
                    'slots_count' => count($slots),
                ];
            })
            ->filter(fn (array $day) => $day['slots_count'] > 0)
            ->values()
            ->all();
    }

    /**
     * Слот превращается в занятый — вызывается при создании заявки.
     */
    public function reserve(Technician $technician, CarbonImmutable $startsAt, int $durationMinutes): Schedule
    {
        return Schedule::query()->create([
            'technician_id' => $technician->id,
            'starts_at' => $startsAt,
            'ends_at' => $startsAt->addMinutes($durationMinutes),
            'is_available' => false,
        ]);
    }

    public function humanDate(CarbonImmutable $date): string
    {
        $months = [
            1 => 'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
            'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
        ];

        $weekdays = [
            1 => 'Пн', 2 => 'Вт', 3 => 'Ср', 4 => 'Чт', 5 => 'Пт', 6 => 'Сб', 7 => 'Вс',
        ];

        return $weekdays[$date->dayOfWeekIso].', '.$date->day.' '.$months[$date->month];
    }
}