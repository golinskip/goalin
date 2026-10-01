<?php

namespace Domain\Tools\StickyNotes\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['content'])]
class StickyNoteRevision extends Model
{
    public const UPDATED_AT = null;

    public function stickyNote(): BelongsTo
    {
        return $this->belongsTo(StickyNote::class);
    }
}
