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
        Schema::create('sticky_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('content');
            $table->string('color', 16)->default('yellow');
            $table->boolean('is_important')->default(false);
            $table->date('reviewed_on');
            $table->timestamp('applied_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'applied_at', 'reviewed_on']);
        });

        Schema::create('sticky_note_revisions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sticky_note_id')->constrained()->cascadeOnDelete();
            $table->text('content');
            $table->timestamp('created_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sticky_note_revisions');
        Schema::dropIfExists('sticky_notes');
    }
};
