<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rss_articles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rss_feed_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('link');
            $table->text('description')->nullable();
            $table->string('author')->nullable();
            $table->string('guid')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            $table->unique(['rss_feed_id', 'guid']);
            $table->index('published_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rss_articles');
    }
};
