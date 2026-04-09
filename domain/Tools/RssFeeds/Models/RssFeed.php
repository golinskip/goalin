<?php

namespace Domain\Tools\RssFeeds\Models;

use Database\Factories\RssFeedFactory;
use Domain\User\Models\User;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'feed_url', 'site_url', 'description', 'color', 'last_fetched_at'])]
class RssFeed extends Model
{
    /** @use HasFactory<RssFeedFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'last_fetched_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function articles(): HasMany
    {
        return $this->hasMany(RssArticle::class);
    }
}
