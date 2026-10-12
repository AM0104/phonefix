<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            UserSeeder::class,
            ServiceSeeder::class,
            TechnicianSeeder::class,
            SettingSeeder::class,
            ScheduleSeeder::class,
            ArticleSeeder::class,
            DemoDataSeeder::class,
        ]);
    }
}