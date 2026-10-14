<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointment_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('appointment_id')->index()->constrained('appointments')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('is_from_admin')->default(false)->index();
            $table->boolean('is_read_by_admin')->default(false);
            $table->boolean('is_read_by_client')->default(true);
            $table->text('body');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointment_messages');
    }
};