<?php

namespace Domain\Tools\RssFeeds\Models;

use Database\Factories\RssArticleFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['title', 'link', 'description', 'author', 'guid', 'published_at'])]
class RssArticle extends Model
{
    /** @use HasFactory<RssArticleFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'published_at' => 'datetime',
        ];
    }

    public function feed(): BelongsTo
    {
        return $this->belongsTo(RssFeed::class, 'rss_feed_id');
    }
}
