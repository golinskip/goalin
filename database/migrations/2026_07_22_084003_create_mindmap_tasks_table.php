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
        Schema::create('mindmap_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('mindmap_tasks')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->json('links')->nullable();
            $table->json('tags')->nullable();
            $table->string('color', 32)->nullable();
            $table->string('icon', 48)->nullable();
            $table->string('priority', 16)->nullable();
            $table->date('deadline')->nullable();
            $table->string('status', 16)->default('todo');
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();

            $table->index(['user_id', 'parent_id', 'position']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mindmap_tasks');
    }
};
