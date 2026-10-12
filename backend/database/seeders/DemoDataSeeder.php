<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\Lead;
use App\Models\Review;
use App\Models\Schedule;
use App\Models\Service;
use App\Models\Technician;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;

class DemoDataSeeder extends Seeder
{
    /**
     * Демонстрационные заявки, отзывы и лиды — чтобы админка и история клиента не были пустыми.
     */
    public function run(): void
    {
        $client = User::query()->where('email', 'client@phonefix.ru')->first();
        $client2 = User::query()->where('email', 'olga@example.com')->first();
        $screenService = Service::query()->where('category', 'screen')->first();
        $batteryService = Service::query()->where('category', 'parts')->first();
        $softwareService = Service::query()->where('category', 'software')->first();
        $technician = Technician::query()->orderBy('sort_order')->first();
        $technician2 = Technician::query()->orderBy('sort_order')->skip(1)->first();

        if (! $client || ! $screenService || ! $technician) {
            return;
        }

        // --- Выполненная заявка (по ней можно оставить отзыв) ------------
        $doneAt = CarbonImmutable::now()->subDays(5)->setTime(12, 0);
        $doneSchedule = $this->takenSlot($technician, $doneAt);

        Appointment::query()->updateOrCreate(
            ['client_id' => $client->id, 'scheduled_at' => $doneAt],
            [
                'service_id' => $screenService->id,
                'technician_id' => $technician->id,
                'schedule_id' => $doneSchedule->id,
                'device_model' => 'iPhone 13 Pro',
                'problem_type' => 'screen',
                'problem_description' => 'Разбит дисплей после падения, тачскрин частично не реагирует.',
                'status' => 'done',
                'estimated_price' => $screenService->price_from,
                'final_price' => 8900,
                'admin_comment' => 'Установлен оригинальный OLED-модуль, гарантия 6 месяцев.',
            ]
        );

        // --- Активная заявка на будущее ----------------------------------
        $futureAt = CarbonImmutable::now()->addDays(2)->setTime(15, 0);
        $futureSchedule = $this->takenSlot($technician2 ?? $technician, $futureAt);

        Appointment::query()->updateOrCreate(
            ['client_id' => $client->id, 'scheduled_at' => $futureAt],
            [
                'service_id' => ($batteryService ?? $screenService)->id,
                'technician_id' => ($technician2 ?? $technician)->id,
                'schedule_id' => $futureSchedule->id,
                'device_model' => 'Samsung Galaxy S22',
                'problem_type' => 'parts',
                'problem_description' => 'Быстро садится батарея, выключается на холоде.',
                'status' => 'confirmed',
                'estimated_price' => ($batteryService ?? $screenService)->price_from,
            ]
        );

        // --- Заявка второго клиента в работе -----------------------------
        $workAt = CarbonImmutable::now()->setTime(17, 0);
        $workSchedule = $this->takenSlot($technician, $workAt);

        Appointment::query()->updateOrCreate(
            ['client_id' => $client2->id, 'scheduled_at' => $workAt],
            [
                'service_id' => ($softwareService ?? $screenService)->id,
                'technician_id' => $technician->id,
                'schedule_id' => $workSchedule->id,
                'device_model' => 'Xiaomi Redmi Note 12',
                'problem_type' => 'software',
                'problem_description' => 'Телефон перезагружается сам, всплывает реклама.',
                'status' => 'in_progress',
                'estimated_price' => ($softwareService ?? $screenService)->price_from,
            ]
        );

        // --- Отзывы -------------------------------------------------------
        $reviews = [
            [
                'user' => $client,
                'rating' => 5,
                'text' => 'Поменяли экран на iPhone 13 Pro за час, при мне проверили тачскрин и Face ID. Цена совпала с той, что сказали после диагностики.',
                'status' => 'published',
            ],
            [
                'user' => $client2,
                'rating' => 5,
                'text' => 'Приносила телефон после залития, честно предупредили о рисках. Плату почистили, аппарат работает уже второй месяц.',
                'status' => 'published',
            ],
            [
                'user' => $client,
                'rating' => 4,
                'text' => 'Батарею заменили быстро, но пришлось подождать запчасть один день. В целом доволен.',
                'status' => 'pending',
            ],
        ];

        foreach ($reviews as $item) {
            Review::query()->updateOrCreate(
                ['user_id' => $item['user']->id, 'text' => $item['text']],
                [
                    'service_id' => $screenService->id,
                    'technician_id' => $technician->id,
                    'rating' => $item['rating'],
                    'status' => $item['status'],
                ]
            );
        }

        // --- Лиды из модального окна «Заказать звонок» --------------------
        $leads = [
            ['name' => 'Максим', 'phone' => '+7 (903) 111-22-33', 'comment' => 'Разбит экран на Honor 90, сколько будет стоить?', 'status' => 'new'],
            ['name' => 'Анна', 'phone' => '+7 (905) 444-55-66', 'comment' => 'iPhone не включается после воды.', 'status' => 'in_work'],
            ['name' => 'Пётр', 'phone' => '+7 (926) 777-88-99', 'comment' => 'Нужно обновить прошивку и перенести данные.', 'status' => 'closed'],
        ];

        foreach ($leads as $lead) {
            Lead::query()->updateOrCreate(
                ['phone' => $lead['phone']],
                $lead + ['source' => 'callback-modal']
            );
        }
    }

    /**
     * Занятый слот: создаёт запись в расписании, если её ещё нет.
     */
    private function takenSlot(Technician $technician, CarbonImmutable $startsAt): Schedule
    {
        return Schedule::query()->firstOrCreate(
            ['technician_id' => $technician->id, 'starts_at' => $startsAt],
            ['ends_at' => $startsAt->addHour(), 'is_available' => false]
        );
    }
}