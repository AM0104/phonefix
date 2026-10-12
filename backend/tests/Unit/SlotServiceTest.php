<?php

namespace Tests\Unit;

use App\Models\Schedule;
use App\Models\Setting;
use App\Models\Technician;
use App\Services\SlotService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SlotServiceTest extends TestCase
{
    use RefreshDatabase;

    private SlotService $slots;

    protected function setUp(): void
    {
        parent::setUp();

        $this->slots = app(SlotService::class);

        Setting::query()->insert([
            ['key' => 'work_day_start', 'value' => '10:00', 'group' => 'schedule', 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'work_day_end', 'value' => '20:00', 'group' => 'schedule', 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'slot_step_minutes', 'value' => '60', 'group' => 'schedule', 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function test_слоты_генерируются_по_рабочим_часам_с_шагом(): void
    {
        $date = CarbonImmutable::parse('2030-05-13'); // понедельник

        $slots = $this->slots->generateSlots($date, '10:00', '20:00', 60);

        $this->assertCount(10, $slots);
        $this->assertSame('10:00', $slots->first()->format('H:i'));
        $this->assertSame('19:00', $slots->last()->format('H:i'));
    }

    public function test_шаг_слота_влияет_на_количество_окон(): void
    {
        $date = CarbonImmutable::parse('2030-05-13');

        $this->assertCount(4, $this->slots->generateSlots($date, '10:00', '12:00', 30));
        $this->assertCount(20, $this->slots->generateSlots($date, '10:00', '20:00', 30));
    }

    public function test_минимальный_шаг_ограничен_пятнадцатью_минутами(): void
    {
        $date = CarbonImmutable::parse('2030-05-13');

        // Передан шаг 5 минут, но сервис поднимает его до 15
        $this->assertCount(8, $this->slots->generateSlots($date, '10:00', '12:00', 5));
    }

    public function test_свободные_слоты_исключают_занятое_время(): void
    {
        $technician = Technician::factory()->create(['is_active' => true]);
        $date = CarbonImmutable::now()->addDay()->startOfDay();

        $busy = $date->setTime(11, 0);
        Schedule::query()->create([
            'technician_id' => $technician->id,
            'starts_at' => $busy,
            'ends_at' => $busy->addHour(),
            'is_available' => false,
        ]);

        $times = array_column($this->slots->freeSlotsFor($technician, $date), 'time');

        $this->assertNotContains('11:00', $times);
        $this->assertContains('10:00', $times);
        $this->assertContains('12:00', $times);
    }

    public function test_свободные_слоты_исключают_прошедшее_время(): void
    {
        $technician = Technician::factory()->create(['is_active' => true]);
        $today = CarbonImmutable::now()->startOfDay();

        $times = array_column($this->slots->freeSlotsFor($technician, $today), 'time');
        $now = CarbonImmutable::now()->format('H:i');

        foreach ($times as $time) {
            $this->assertGreaterThan($now, $time, "Слот {$time} не должен быть в прошлом");
        }
    }

    public function test_резервирование_слота_создаёт_занятую_запись(): void
    {
        $technician = Technician::factory()->create(['is_active' => true]);
        $startsAt = CarbonImmutable::now()->addDay()->setTime(13, 0);

        $schedule = $this->slots->reserve($technician, $startsAt, 60);

        $this->assertFalse((bool) $schedule->is_available);
        $this->assertSame($startsAt->format('Y-m-d H:i'), $schedule->starts_at->format('Y-m-d H:i'));
        $this->assertSame($startsAt->addHour()->format('Y-m-d H:i'), $schedule->ends_at->format('Y-m-d H:i'));

        $this->assertDatabaseHas('schedules', [
            'technician_id' => $technician->id,
            'is_available' => false,
        ]);
    }

    public function test_доступные_даты_отдают_человекочитаемые_подписи(): void
    {
        $technician = Technician::factory()->create(['is_active' => true]);

        $dates = $this->slots->availableDatesFor($technician, 7);

        $this->assertNotEmpty($dates);
        $this->assertArrayHasKey('date', $dates[0]);
        $this->assertArrayHasKey('label', $dates[0]);
        $this->assertGreaterThan(0, $dates[0]['slots_count']);

        // Подпись вида «Пн, 13 мая»
        $this->assertMatchesRegularExpression('/^(Пн|Вт|Ср|Чт|Пт|Сб|Вс), \d{1,2} [а-я]+$/u', $dates[0]['label']);
    }

    public function test_даты_отсортированы_по_возрастанию(): void
    {
        $technician = Technician::factory()->create(['is_active' => true]);

        $dates = array_column($this->slots->availableDatesFor($technician, 7), 'date');
        $sorted = $dates;
        sort($sorted);

        $this->assertSame($sorted, $dates);
    }
}
