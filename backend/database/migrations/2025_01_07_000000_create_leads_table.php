<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leads', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120);
            $table->string('phone', 30);
            $table->string('email')->nullable();
            $table->text('comment')->nullable();
            $table->string('source', 60)->default('callback-modal');
            $table->enum('status', ['new', 'in_work', 'closed'])->default('new')->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leads');
    }
};