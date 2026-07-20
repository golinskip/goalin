<?php

namespace Domain\Tools\Diary\Events;

use Domain\Automation\AutomationEvent;
use Domain\Automation\EventParameter;
use Domain\User\Models\User;
use Illuminate\Support\Facades\Date;

class NoEmptyDiaryDaysEvent extends AutomationEvent
{
    public const KEY = 'diary.no_empty_days';

    public function key(): string
    {
        return self::KEY;
    }

    public function tool(): string
    {
        return 'Diary';
    }

    public function label(): string
    {
        return 'Keep the diary gap-free';
    }

    public function description(): string
    {
        return 'Earn once a day when every day in a recent window — from the given number of days ago up to today — has a diary entry.';
    }

    public function parameters(): array
    {
        return [
            EventParameter::integer('days', 'Days to cover', 7, 1, 365, 'How many days up to and including today must all have an entry.'),
        ];
    }

    public function evaluate(User $user, array $parameters): int
    {
        $days = max(1, (int) ($parameters['days'] ?? 1));

        $start = Date::today()->subDays($days - 1);
        $end = Date::today();

        $coveredDays = $user->diaryEntries()
            ->whereBetween('entry_date', [$start, $end])
            ->distinct()
            ->count('entry_date');

        return $coveredDays >= $days ? 1 : 0;
    }
}
