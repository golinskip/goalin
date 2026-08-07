<?php

use Domain\Tools\TaskMindmap\Enums\TaskStatus;
use Domain\Tools\TaskMindmap\Models\MindmapTask;
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
        Schema::table('mindmap_tasks', function (Blueprint $table) {
            $table->unsignedTinyInteger('progress')->default(0)->after('status');
        });

        MindmapTask::query()->where('status', TaskStatus::Done->value)->update(['progress' => 100]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('mindmap_tasks', function (Blueprint $table) {
            $table->dropColumn('progress');
        });
    }
};
