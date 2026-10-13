<?php

namespace App\Services;

use App\Models\Schedule;
use App\Models\Technician;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

class SlotService
{
    /** @var array<string, string|null>|null */
    private ?array $settingsCache = null;

    /**
     * @return array<string, string|null>
     */
    private function settings(): array
    {
        return $this->settingsCache ??= \App\Models\Setting::map();
    }

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
        $settings = $this->settings();
        $start = $settings['work_day_start'] ?? '10:00';
        $end = $settings['work_day_end'] ?? '20:00';
        $step = max(15, (int) ($settings['slot_step_minutes'] ?? 60));

        // Занятыми считаются только реально забронированные окна (is_available = false).
        // Строки с is_available = true — заранее объявленные окна приёма, они не блокируют запись.
        $busy = Schedule::query()
            ->where('technician_id', $technician->id)
            ->where('is_available', false)
            ->whereDate('starts_at', $date->toDateString())
            ->get(['starts_at', 'ends_at']);

        return $this->generateSlots($date, $start, $end, $step)
            ->reject(fn (CarbonImmutable $slot) => $slot->isPast())
            ->reject(function (CarbonImmutable $slot) use ($busy, $step) {
                $slotEnd = $slot->addMinutes($step);

                return $busy->contains(fn (Schedule $busySlot) => CarbonImmutable::parse($busySlot->starts_at)->lessThan($slotEnd)
                    && CarbonImmutable::parse($busySlot->ends_at)->greaterThan($slot));
            })
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
        // Окно могло быть объявлено заранее (например, сидером расписания) — тогда его
        // нужно не создавать заново, а пометить занятым: иначе сработает
        // UNIQUE(technician_id, starts_at) и клиент получит 500.
        return Schedule::query()->updateOrCreate(
            ['technician_id' => $technician->id, 'starts_at' => $startsAt],
            ['ends_at' => $startsAt->addMinutes($durationMinutes), 'is_available' => false]
        );
    }

    /**
     * Свободен ли указанный интервал у мастера (учитываются только забронированные окна).
     */
    public function hasOverlap(Technician $technician, CarbonImmutable $startsAt, CarbonImmutable $endsAt): bool
    {
        return Schedule::query()
            ->where('technician_id', $technician->id)
            ->where('is_available', false)
            ->where('starts_at', '<', $endsAt)
            ->where('ends_at', '>', $startsAt)
            ->exists();
    }

    /**
     * Попадает ли время в рабочую сетку мастера (часы приёма и шаг слота из настроек).
     */
    public function isWithinWorkingHours(CarbonImmutable $startsAt): bool
    {
        $settings = $this->settings();
        $dayStart = $startsAt->setTimeFromTimeString($settings['work_day_start'] ?? '10:00');
        $dayEnd = $startsAt->setTimeFromTimeString($settings['work_day_end'] ?? '20:00');
        $step = max(15, (int) ($settings['slot_step_minutes'] ?? 60));

        $minutesFromStart = ($startsAt->hour * 60 + $startsAt->minute) - ($dayStart->hour * 60 + $dayStart->minute);

        return $startsAt->second === 0
            && $minutesFromStart >= 0
            && $startsAt->lessThan($dayEnd)
            && $minutesFromStart % $step === 0;
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