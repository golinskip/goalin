<?php

namespace Domain\Tools\RssFeeds\Alerts;

use Domain\Alerts\Alert;
use Domain\Tools\RssFeeds\Models\RssArticle;
use Domain\User\Models\User;

class UncheckedNewsTodayAlert extends Alert
{
    public function key(): string
    {
        return 'rss-feeds.unchecked-today';
    }

    public function tool(): string
    {
        return 'RSS Feeds';
    }

    public function message(): string
    {
        return 'You haven\'t checked news today.';
    }

    public function href(): string
    {
        return '/rss-feeds';
    }

    public function check(User $user): bool
    {
        $hasFeeds = $user->rssFeeds()->exists();

        if (! $hasFeeds) {
            return false;
        }

        return ! RssArticle::query()
            ->whereIn('rss_feed_id', $user->rssFeeds()->select('id'))
            ->whereDate('read_at', today())
            ->exists();
    }
}
