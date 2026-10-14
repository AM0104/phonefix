<?php

namespace Tests\Unit;

use App\Rules\PhoneNumber;
use PHPUnit\Framework\TestCase;

class PhoneNumberRuleTest extends TestCase
{
    private function passes(string $value): bool
    {
        $failed = false;
        (new PhoneNumber)->validate('phone', $value, function () use (&$failed) {
            $failed = true;
        });

        return ! $failed;
    }

    public function test_допустимые_форматы_телефона(): void
    {
        foreach (['+7 (912) 345-67-89', '8 912 345 67 89', '9123456789', '+79123456789', '8(912)3456789'] as $value) {
            $this->assertTrue($this->passes($value), "Должен приниматься: {$value}");
        }
    }

    public function test_недопустимые_форматы_телефона(): void
    {
        foreach (['', '12345', '+7 (912) 345-67-8', 'телефон', '0000000000000000'] as $value) {
            $this->assertFalse($this->passes($value), "Не должен приниматься: {$value}");
        }
    }

    public function test_нормализация_номера(): void
    {
        $this->assertSame('+79123456789', PhoneNumber::normalize('8 (912) 345-67-89'));
        $this->assertSame('+79123456789', PhoneNumber::normalize('+7 912 345 67 89'));
        $this->assertNull(PhoneNumber::normalize('123'));
    }
}