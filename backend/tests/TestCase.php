<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * Все запросы в тестах ожидают JSON: иначе Laravel на ошибке валидации
     * вернёт редирект вместо 422 и тест упадёт по неверной причине.
     */
    protected function setUp(): void
    {
        parent::setUp();

        $this->withHeaders(['Accept' => 'application/json']);
    }
}
