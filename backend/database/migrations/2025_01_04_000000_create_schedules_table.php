<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('technician_id')->constrained('technicians')->cascadeOnDelete();
            $table->dateTime('starts_at')->index();
            $table->dateTime('ends_at');
            $table->boolean('is_available')->default(true)->index();
            $table->timestamps();

            $table->unique(['technician_id', 'starts_at'], 'schedules_technician_slot_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('schedules');
    }
};