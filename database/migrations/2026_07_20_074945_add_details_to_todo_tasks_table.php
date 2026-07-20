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
        Schema::table('todo_tasks', function (Blueprint $table) {
            $table->text('description')->nullable()->after('title');
            $table->json('links')->nullable()->after('description');
            $table->json('tags')->nullable()->after('links');
            $table->unsignedInteger('estimated_cycles')->nullable()->after('tags');
            $table->string('priority', 16)->nullable()->after('estimated_cycles');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('todo_tasks', function (Blueprint $table) {
            $table->dropColumn(['description', 'links', 'tags', 'estimated_cycles', 'priority']);
        });
    }
};
