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
        Schema::table('rewards', function (Blueprint $table) {
            $table->string('shop_url', 2048)->nullable()->after('color');
            $table->text('description')->nullable()->after('shop_url');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rewards', function (Blueprint $table) {
            $table->dropColumn(['shop_url', 'description']);
        });
    }
};
