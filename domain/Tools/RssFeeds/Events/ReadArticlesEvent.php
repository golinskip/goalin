<?php

namespace Domain\Tools\RssFeeds\Events;

use Domain\Automation\AutomationEvent;
use Domain\Automation\EventParameter;
use Domain\Tools\RssFeeds\Models\RssArticle;
use Domain\User\Models\User;
use Illuminate\Support\Facades\Date;

class ReadArticlesEvent extends AutomationEvent
{
    public const KEY = 'rss.read_articles';

    private const MODE_DAILY = 'daily';

    private const MODE_PER_BATCH = 'per_batch';

    public function key(): string
    {
        return self::KEY;
    }

    public function tool(): string
    {
        return 'RSS Feeds';
    }

    public function label(): string
    {
        return 'Read articles';
    }

    public function description(): string
    {
        return 'Earn when you read articles today — once for reaching the target, or repeatedly for every batch read.';
    }

    public function parameters(): array
    {
        return [
            EventParameter::integer('count', 'Articles read', 5, 1, 1000, 'How many articles count as one unit.'),
            EventParameter::choice('mode', 'Earning', [
                ['value' => self::MODE_DAILY, 'label' => 'Once a day when the target is reached'],
                ['value' => self::MODE_PER_BATCH, 'label' => 'Once per that many articles'],
            ], self::MODE_DAILY),
        ];
    }

    public function isRepeatableWithinDay(): bool
    {
        return true;
    }

    public function evaluate(User $user, array $parameters): int
    {
        $count = max(1, (int) ($parameters['count'] ?? 1));
        $mode = $parameters['mode'] ?? self::MODE_DAILY;

        $readToday = RssArticle::query()
            ->whereIn('rss_feed_id', $user->rssFeeds()->select('id'))
            ->whereDate('read_at', Date::today())
            ->count();

        if ($mode === self::MODE_PER_BATCH) {
            return intdiv($readToday, $count);
        }

        return $readToday >= $count ? 1 : 0;
    }
}
