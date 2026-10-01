<?php

namespace Domain\Tools\StickyNotes\Models;

use Database\Factories\StickyNoteFactory;
use Domain\Tools\StickyNotes\Enums\StickyNoteColor;
use Domain\User\Models\User;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['content', 'color', 'is_important', 'reviewed_on', 'applied_at'])]
class StickyNote extends Model
{
    /** @use HasFactory<StickyNoteFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'color' => StickyNoteColor::class,
            'is_important' => 'boolean',
            'reviewed_on' => 'date',
            'applied_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function revisions(): HasMany
    {
        return $this->hasMany(StickyNoteRevision::class)->latest('created_at')->latest('id');
    }

    /**
     * Notes that are still open, i.e. not yet marked as applied.
     *
     * @param  Builder<self>  $query
     */
    public function scopeActive(Builder $query): void
    {
        $query->whereNull('applied_at');
    }

    /**
     * Open notes that were last added or reviewed before today.
     *
     * @param  Builder<self>  $query
     */
    public function scopeNeedingReview(Builder $query): void
    {
        $query->whereNull('applied_at')->whereDate('reviewed_on', '<', today());
    }

    public function isApplied(): bool
    {
        return $this->applied_at !== null;
    }

    public function needsReview(): bool
    {
        return ! $this->isApplied() && $this->reviewed_on->lt(today());
    }
}
