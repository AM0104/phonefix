<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('services', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->enum('category', ['diagnostics', 'screen', 'parts', 'software', 'other'])->index();
            $table->text('short_description');
            $table->text('description')->nullable();
            $table->decimal('price_from', 10, 2)->default(0);
            $table->decimal('price_to', 10, 2)->nullable();
            $table->unsignedSmallInteger('duration_minutes')->default(60);
            $table->string('warranty', 100)->nullable();
            $table->string('icon', 50)->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->boolean('is_popular')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('services');
    }
};