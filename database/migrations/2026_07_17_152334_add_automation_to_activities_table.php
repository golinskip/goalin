<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('activities', function (Blueprint $table) {
            $table->string('type')->default('manual')->after('name');
            $table->string('event_key')->nullable()->after('type');
            $table->json('event_parameters')->nullable()->after('event_key');

            $table->index(['user_id', 'type', 'event_key']);
        });
    }

    public function down(): void
    {
        Schema::table('activities', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'type', 'event_key']);
            $table->dropColumn(['type', 'event_key', 'event_parameters']);
        });
    }
};
