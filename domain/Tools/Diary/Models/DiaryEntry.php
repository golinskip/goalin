<?php

namespace Domain\Tools\Diary\Models;

use Database\Factories\DiaryEntryFactory;
use Domain\User\Models\User;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['entry_date', 'content', 'fields'])]
class DiaryEntry extends Model
{
    /** @use HasFactory<DiaryEntryFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'entry_date' => 'date',
            'fields' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
