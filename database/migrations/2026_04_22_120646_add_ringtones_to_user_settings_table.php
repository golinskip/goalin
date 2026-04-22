<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_settings', function (Blueprint $table) {
            $table->string('task_ringtone', 32)->default('classic')->after('background');
            $table->string('break_ringtone', 32)->default('classic')->after('task_ringtone');
        });
    }

    public function down(): void
    {
        Schema::table('user_settings', function (Blueprint $table) {
            $table->dropColumn(['task_ringtone', 'break_ringtone']);
        });
    }
};
