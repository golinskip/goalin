<?php

namespace Domain\Tools\MusicPlayer\Models;

use Database\Factories\PlaylistFactory;
use Domain\User\Models\User;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

#[Fillable(['name', 'description', 'color'])]
class Playlist extends Model
{
    /** @use HasFactory<PlaylistFactory> */
    use HasFactory;

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function musicFiles(): BelongsToMany
    {
        return $this->belongsToMany(MusicFile::class)->withPivot('position')->withTimestamps()->orderByPivot('position');
    }
}
