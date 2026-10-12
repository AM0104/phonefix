<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $accounts = [
            [
                'name' => 'Администратор PhoneFix',
                'email' => 'admin@phonefix.ru',
                'phone' => '+7 (3522) 45-67-89',
                'role' => User::ROLE_ADMIN,
            ],
            [
                'name' => 'Александр Волков',
                'email' => 'volkov@phonefix.ru',
                'phone' => '+7 (495) 123-45-68',
                'role' => User::ROLE_TECHNICIAN,
            ],
            [
                'name' => 'Дмитрий Соколов',
                'email' => 'sokolov@phonefix.ru',
                'phone' => '+7 (495) 123-45-69',
                'role' => User::ROLE_TECHNICIAN,
            ],
            [
                'name' => 'Марина Ковалёва',
                'email' => 'kovaleva@phonefix.ru',
                'phone' => '+7 (495) 123-45-70',
                'role' => User::ROLE_TECHNICIAN,
            ],
            [
                'name' => 'Иван Петров',
                'email' => 'client@phonefix.ru',
                'phone' => '+7 (916) 555-11-22',
                'role' => User::ROLE_CLIENT,
            ],
            [
                'name' => 'Ольга Смирнова',
                'email' => 'olga@example.com',
                'phone' => '+7 (916) 555-33-44',
                'role' => User::ROLE_CLIENT,
            ],
        ];

        foreach ($accounts as $account) {
            User::query()->updateOrCreate(
                ['email' => $account['email']],
                $account + [
                    'password' => Hash::make($account['role'] === User::ROLE_ADMIN ? 'admin123' : 'password'),
                    'email_verified_at' => now(),
                    'is_active' => true,
                ]
            );
        }
    }
}