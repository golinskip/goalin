<?php

namespace App\Models;

use Database\Factories\MemoCardFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['front', 'back', 'correct_count', 'incorrect_count', 'last_reviewed_at'])]
class MemoCard extends Model
{
    /** @use HasFactory<MemoCardFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'correct_count' => 'integer',
            'incorrect_count' => 'integer',
            'last_reviewed_at' => 'datetime',
        ];
    }

    public function memoSet(): BelongsTo
    {
        return $this->belongsTo(MemoSet::class);
    }
}
