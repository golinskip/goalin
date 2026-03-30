<?php

namespace Domain\Tools\MusicPlayer\Models;

use Database\Factories\MusicFileFactory;
use Domain\Tools\GoalTracker\Models\Tag;
use Domain\User\Models\User;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

#[Fillable(['title', 'artist', 'original_filename', 'disk_path', 'mime_type', 'duration_seconds', 'file_size'])]
class MusicFile extends Model
{
    /** @use HasFactory<MusicFileFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'duration_seconds' => 'integer',
            'file_size' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function playlists(): BelongsToMany
    {
        return $this->belongsToMany(Playlist::class)->withPivot('position')->withTimestamps();
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class);
    }
}
