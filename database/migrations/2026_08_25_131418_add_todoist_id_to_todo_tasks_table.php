<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('todo_tasks', function (Blueprint $table) {
            $table->string('todoist_id', 64)->nullable()->after('parent_id');

            $table->index(['user_id', 'todoist_id']);
        });
    }

    public function down(): void
    {
        Schema::table('todo_tasks', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'todoist_id']);
            $table->dropColumn('todoist_id');
        });
    }
};
