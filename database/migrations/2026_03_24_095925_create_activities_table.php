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
        Schema::create('activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->integer('point_cost');
            $table->string('color', 7)->default('#3a9a4e');
            $table->boolean('needs_timer')->default(false);
            $table->unsignedInteger('duration_minutes')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index(['user_id', 'sort_order']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activities');
    }
};
