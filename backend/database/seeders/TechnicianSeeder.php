<?php

namespace Database\Seeders;

use App\Models\Technician;
use App\Models\User;
use Illuminate\Database\Seeder;

class TechnicianSeeder extends Seeder
{
    public function run(): void
    {
        $technicians = [
            [
                'email' => 'volkov@phonefix.ru',
                'full_name' => 'Александр Волков',
                'position' => 'Ведущий инженер',
                'specialization' => 'Микропайка, ремонт плат, восстановление после залития',
                'bio' => '11 лет в сервисе. Восстанавливает платы под микроскопом, работает с BGA-пайкой и реболлингом. Ведёт самые сложные «безнадёжные» аппараты.',
                'experience_years' => 11,
                'rating' => 5.0,
                'sort_order' => 1,
            ],
            [
                'email' => 'sokolov@phonefix.ru',
                'full_name' => 'Дмитрий Соколов',
                'position' => 'Мастер по дисплеям',
                'specialization' => 'Замена экранов, переклейка стекла, тачскрины',
                'bio' => '8 лет меняет дисплейные модули. Работает на вакуумном прессе — переклейка стекла без пузырей и пыли.',
                'experience_years' => 8,
                'rating' => 4.9,
                'sort_order' => 2,
            ],
            [
                'email' => 'kovaleva@phonefix.ru',
                'full_name' => 'Марина Ковалёва',
                'position' => 'Инженер по программному обеспечению',
                'specialization' => 'Прошивки Android/iOS, перенос данных, восстановление системы',
                'bio' => '6 лет настраивает и восстанавливает системы. Возвращает к жизни телефоны после неудачных прошивок и циклов перезагрузки.',
                'experience_years' => 6,
                'rating' => 5.0,
                'sort_order' => 3,
            ],
            [
                'email' => null,
                'full_name' => 'Сергей Барсуков',
                'position' => 'Мастер по комплектующим',
                'specialization' => 'Аккумуляторы, разъёмы зарядки, камеры, динамики',
                'bio' => '7 лет меняет комплектующие. Быстрые работы выполняет за 30–45 минут при клиенте.',
                'experience_years' => 7,
                'rating' => 4.8,
                'sort_order' => 4,
            ],
        ];

        foreach ($technicians as $item) {
            $email = $item['email'];
            unset($item['email']);

            $user = $email ? User::query()->where('email', $email)->first() : null;

            Technician::query()->updateOrCreate(
                ['full_name' => $item['full_name']],
                $item + ['user_id' => $user?->id, 'is_active' => true]
            );
        }
    }
}