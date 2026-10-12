<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            // --- Общее ------------------------------------------------------
            ['key' => 'site_name', 'value' => 'PhoneFix', 'group' => 'general', 'label' => 'Название сервиса'],
            ['key' => 'site_tagline', 'value' => 'Диагностика и ремонт телефонов в Кургане', 'group' => 'general', 'label' => 'Подзаголовок'],
            ['key' => 'hero_title', 'value' => 'Ремонт телефонов в Кургане за 1 визит', 'group' => 'home', 'label' => 'Заголовок на главной'],
            ['key' => 'hero_subtitle', 'value' => 'Бесплатная диагностика, замена экранов и комплектующих, обновление ПО в Кургане. Гарантия до 6 месяцев и запись онлайн за 2 минуты.', 'group' => 'home', 'label' => 'Текст под заголовком'],
            ['key' => 'hero_badge', 'value' => 'Более 12 000 отремонтированных аппаратов в Кургане и области', 'group' => 'home', 'label' => 'Плашка на главной'],
            ['key' => 'advantages_title', 'value' => 'Почему выбирают PhoneFix в Кургане', 'group' => 'home', 'label' => 'Заголовок блока преимуществ'],

            // --- Контакты ---------------------------------------------------
            ['key' => 'site_phone', 'value' => '+7 (3522) 45-67-89', 'group' => 'contacts', 'label' => 'Телефон'],
            ['key' => 'site_email', 'value' => 'info@phonefix.ru', 'group' => 'contacts', 'label' => 'E-mail'],
            ['key' => 'site_address', 'value' => 'г. Курган, ул. Коли Мяготина, д. 56, 1 этаж', 'group' => 'contacts', 'label' => 'Адрес'],
            ['key' => 'site_city', 'value' => 'Курган', 'group' => 'contacts', 'label' => 'Город'],

            // --- Режим работы и запись --------------------------------------
            ['key' => 'work_time_weekdays', 'value' => 'Пн–Пт: 10:00 – 20:00', 'group' => 'schedule', 'label' => 'Часы работы (будни)'],
            ['key' => 'work_time_weekend', 'value' => 'Сб–Вс: 11:00 – 18:00', 'group' => 'schedule', 'label' => 'Часы работы (выходные)'],
            ['key' => 'work_day_start', 'value' => '10:00', 'group' => 'schedule', 'label' => 'Начало рабочего дня (для записи)'],
            ['key' => 'work_day_end', 'value' => '20:00', 'group' => 'schedule', 'label' => 'Конец рабочего дня (для записи)'],
            ['key' => 'slot_step_minutes', 'value' => '60', 'group' => 'schedule', 'label' => 'Шаг слота, минут'],

            // --- Тексты страниц ---------------------------------------------
            ['key' => 'about_text', 'value' => 'PhoneFix — сервисный центр по ремонту смартфонов и планшетов в Кургане. Мы работаем с 2014 года, держим собственный склад комплектующих и делаем диагностику бесплатно. Каждый ремонт оформляем договором с гарантией.', 'group' => 'content', 'label' => 'Текст «О сервисе»'],
            ['key' => 'delivery_text', 'value' => 'Курьер заберёт телефон и привезёт обратно в день ремонта. По Кургану — бесплатно при заказе от 3 000 ₽.', 'group' => 'content', 'label' => 'Текст про курьера'],
            ['key' => 'footer_text', 'value' => 'Сервисный центр по ремонту телефонов в Кургане. Диагностика, замена экранов, комплектующие, обновление ПО.', 'group' => 'content', 'label' => 'Текст в подвале'],
            ['key' => 'privacy_text', 'value' => 'Отправляя форму, вы соглашаетесь на обработку персональных данных в соответствии с политикой конфиденциальности сервиса PhoneFix.', 'group' => 'content', 'label' => 'Согласие на обработку данных'],

            // --- Цифры для главной ------------------------------------------
            ['key' => 'stat_years', 'value' => '11', 'group' => 'stats', 'label' => 'Лет на рынке'],
            ['key' => 'stat_repairs', 'value' => '12000', 'group' => 'stats', 'label' => 'Выполненных ремонтов'],
            ['key' => 'stat_warranty_months', 'value' => '6', 'group' => 'stats', 'label' => 'Гарантия, месяцев'],
            ['key' => 'stat_masters', 'value' => '4', 'group' => 'stats', 'label' => 'Мастеров в штате'],
        ];

        foreach ($settings as $setting) {
            Setting::query()->updateOrCreate(['key' => $setting['key']], $setting);
        }
    }
}
