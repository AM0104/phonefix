<?php

namespace Tests\Feature;

use App\Models\Article;
use App\Models\Lead;
use App\Models\Review;
use App\Models\Service;
use App\Models\Setting;
use App\Models\Technician;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_настройки_сайта_доступны_без_авторизации(): void
    {
        Setting::query()->create(['key' => 'site_phone', 'value' => '+7 (3522) 45-67-89', 'group' => 'contacts']);

        $this->getJson('/api/public/site')
            ->assertOk()
            ->assertJsonPath('settings.site_phone', '+7 (3522) 45-67-89')
            ->assertJsonStructure(['settings', 'categories']);
    }

    public function test_главная_отдаёт_популярные_услуги_мастеров_и_отзывы(): void
    {
        $service = Service::factory()->create(['is_popular' => true, 'is_active' => true]);
        Technician::factory()->create(['is_active' => true]);
        Review::factory()->published()->create(['service_id' => $service->id]);
        Review::factory()->create(['service_id' => $service->id]); // на модерации — не должна попасть

        $response = $this->getJson('/api/public/home')->assertOk();

        $response->assertJsonStructure([
            'settings',
            'popular_services',
            'technicians',
            'reviews',
            'articles',
            'stats' => ['appointments_done', 'reviews_count', 'avg_rating'],
            'services_count',
        ]);

        $this->assertCount(1, $response->json('reviews'), 'На главной только опубликованные отзывы');
        $this->assertSame(1, $response->json('stats.reviews_count'));
        $this->assertSame(1, $response->json('services_count'));
    }

    public function test_каталог_услуг_фильтруется_по_категории_и_поиску(): void
    {
        Service::factory()->create(['title' => 'Замена аккумулятора', 'category' => 'parts', 'is_active' => true]);
        Service::factory()->create(['title' => 'Замена дисплейного модуля', 'category' => 'screen', 'is_active' => true]);
        Service::factory()->create(['title' => 'Скрытая услуга', 'category' => 'parts', 'is_active' => false]);

        // Скрытые услуги не показываются
        $this->getJson('/api/public/services')->assertOk()->assertJsonCount(2, 'data');

        // Фильтр по категории
        $this->getJson('/api/public/services?category=screen')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Замена дисплейного модуля');

        // Поиск по названию
        $this->getJson('/api/public/services?search=аккумулятор')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Замена аккумулятора');
    }

    public function test_карточка_услуги_открывается_по_чпу_и_отдаёт_связанные_данные(): void
    {
        $service = Service::factory()->create(['slug' => 'zamena-displeya', 'category' => 'screen', 'is_active' => true]);
        Technician::factory()->create(['is_active' => true]);
        Review::factory()->published()->create(['service_id' => $service->id]);

        $this->getJson('/api/public/services/zamena-displeya')
            ->assertOk()
            ->assertJsonPath('data.slug', 'zamena-displeya')
            ->assertJsonStructure(['data', 'technicians', 'reviews', 'related']);
    }

    public function test_скрытая_услуга_недоступна_по_прямой_ссылке(): void
    {
        Service::factory()->inactive()->create(['slug' => 'skrytaya-usluga']);

        $this->getJson('/api/public/services/skrytaya-usluga')->assertNotFound();
    }

    public function test_модальное_окно_заказа_звонка_сохраняет_лид(): void
    {
        $response = $this->postJson('/api/public/leads', [
            'name' => 'Максим',
            'phone' => '+7 (903) 111-22-33',
            'comment' => 'Разбит экран на Honor 90',
            'source' => 'hero',
        ]);

        $response->assertCreated()->assertJsonStructure(['message', 'lead_id']);

        $this->assertDatabaseHas('leads', [
            'name' => 'Максим',
            'phone' => '+7 (903) 111-22-33',
            'status' => 'new',
            'source' => 'hero',
        ]);
    }

    public function test_лид_требует_имя_и_телефон(): void
    {
        $this->postJson('/api/public/leads', ['name' => 'A', 'phone' => ''])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'phone']);

        $this->assertDatabaseCount('leads', 0);
    }

    public function test_статьи_блога_отдаются_только_опубликованные(): void
    {
        Article::factory()->create(['slug' => 'opublikovannaya', 'is_published' => true]);
        Article::factory()->draft()->create(['slug' => 'chernovik', 'is_published' => false]);

        $this->getJson('/api/public/articles')->assertOk()->assertJsonCount(1, 'data');

        $this->getJson('/api/public/articles/opublikovannaya')->assertOk();
        $this->getJson('/api/public/articles/chernovik')->assertNotFound();
    }

    public function test_отзывы_на_сайте_только_опубликованные(): void
    {
        Review::factory()->published()->count(2)->create();
        Review::factory()->create();          // на модерации
        Review::factory()->rejected()->create();

        $this->getJson('/api/public/reviews')
            ->assertOk()
            ->assertJsonPath('total', 2);
    }

    public function test_несуществующий_адрес_api_возвращает_404(): void
    {
        $this->getJson('/api/public/no-such-endpoint')->assertNotFound();
    }
}
