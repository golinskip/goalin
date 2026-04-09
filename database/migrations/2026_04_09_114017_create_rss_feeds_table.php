<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rss_feeds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('feed_url');
            $table->string('site_url')->nullable();
            $table->text('description')->nullable();
            $table->string('color', 7)->default('#6366f1');
            $table->timestamp('last_fetched_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'feed_url']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rss_feeds');
    }
};
