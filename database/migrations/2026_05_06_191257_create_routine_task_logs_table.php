<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('routine_task_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('routine_task_id')->constrained()->cascadeOnDelete();
            $table->date('log_date');
            $table->string('status', 20);
            $table->timestamps();

            $table->unique(['routine_task_id', 'log_date']);
            $table->index('log_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('routine_task_logs');
    }
};
