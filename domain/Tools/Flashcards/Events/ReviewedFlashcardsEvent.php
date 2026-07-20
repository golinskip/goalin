<?php

namespace Domain\Tools\Flashcards\Events;

use Domain\Automation\AutomationEvent;
use Domain\Automation\EventParameter;
use Domain\Tools\Flashcards\Models\MemoCard;
use Domain\User\Models\User;
use Illuminate\Support\Facades\Date;

class ReviewedFlashcardsEvent extends AutomationEvent
{
    public const KEY = 'flashcards.reviewed';

    private const MODE_DAILY = 'daily';

    private const MODE_PER_BATCH = 'per_batch';

    public function key(): string
    {
        return self::KEY;
    }

    public function tool(): string
    {
        return 'Memo Cards';
    }

    public function label(): string
    {
        return 'Review flashcards';
    }

    public function description(): string
    {
        return 'Earn when you review flashcards today — once for reaching the target, or repeatedly for every batch reviewed.';
    }

    public function parameters(): array
    {
        return [
            EventParameter::integer('count', 'Flashcards reviewed', 10, 1, 1000, 'How many reviews count as one unit.'),
            EventParameter::choice('mode', 'Earning', [
                ['value' => self::MODE_DAILY, 'label' => 'Once a day when the target is reached'],
                ['value' => self::MODE_PER_BATCH, 'label' => 'Once per that many flashcards'],
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

        $reviewedToday = MemoCard::query()
            ->whereIn('memo_set_id', $user->memoSets()->select('id'))
            ->whereDate('last_reviewed_at', Date::today())
            ->count();

        if ($mode === self::MODE_PER_BATCH) {
            return intdiv($reviewedToday, $count);
        }

        return $reviewedToday >= $count ? 1 : 0;
    }
}
