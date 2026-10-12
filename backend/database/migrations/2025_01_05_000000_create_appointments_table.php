<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('service_id')->constrained('services')->restrictOnDelete();
            $table->foreignId('technician_id')->constrained('technicians')->restrictOnDelete();
            $table->foreignId('schedule_id')->nullable()->unique()->constrained('schedules')->nullOnDelete();
            $table->dateTime('scheduled_at')->index();
            $table->string('device_model', 120);
            $table->enum('problem_type', ['diagnostics', 'screen', 'parts', 'software', 'other'])->default('diagnostics');
            $table->text('problem_description')->nullable();
            $table->enum('status', ['new', 'confirmed', 'in_progress', 'done', 'canceled'])->default('new')->index();
            $table->decimal('estimated_price', 10, 2)->nullable();
            $table->decimal('final_price', 10, 2)->nullable();
            $table->text('admin_comment')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};