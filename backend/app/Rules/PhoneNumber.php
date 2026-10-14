<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Проверка номера телефона: допускаются форматы
 * +7 (999) 123-45-67, 8 999 123 45 67, 9991234567, +79991234567.
 * Городские номера тоже принимаются (10 цифр), поэтому проверяем только
 * количество цифр и ведущую 7/8, а не код оператора.
 */
class PhoneNumber implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $digits = preg_replace('/\D+/', '', (string) $value) ?? '';

        if ($digits === '') {
            $fail('Укажите номер телефона.');

            return;
        }

        if (strlen($digits) === 11 && in_array($digits[0], ['7', '8'], true)) {
            $digits = substr($digits, 1);
        } elseif (strlen($digits) === 10 && in_array($digits[0], ['7', '8'], true)) {
            // 10 цифр, начинающиеся с 7/8 — это обрезанный номер вида +7 (912) 345-67-8.
            $fail('Телефон должен содержать 10 цифр, например +7 (912) 345-67-89.');

            return;
        }

        if (strlen($digits) !== 10) {
            $fail('Телефон должен содержать 10 цифр, например +7 (912) 345-67-89.');
        }
    }

    /**
     * Приводит номер к виду +7XXXXXXXXXX (для хранения и сравнения).
     */
    public static function normalize(?string $value): ?string
    {
        $digits = preg_replace('/\D+/', '', (string) $value) ?? '';

        if ($digits === '') {
            return null;
        }

        if (strlen($digits) === 11 && in_array($digits[0], ['7', '8'], true)) {
            $digits = substr($digits, 1);
        }

        return strlen($digits) === 10 ? '+7'.$digits : null;
    }
}