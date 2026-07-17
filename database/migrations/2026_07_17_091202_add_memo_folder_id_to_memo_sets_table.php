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
        Schema::table('memo_sets', function (Blueprint $table) {
            $table->foreignId('memo_folder_id')
                ->nullable()
                ->after('user_id')
                ->constrained('memo_folders')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('memo_sets', function (Blueprint $table) {
            $table->dropConstrainedForeignId('memo_folder_id');
        });
    }
};
