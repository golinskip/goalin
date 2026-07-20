<?php

namespace Domain\Tools\LongTermGoals\Events;

use Domain\Automation\AutomationEvent;
use Domain\Automation\EventParameter;
use Domain\Tools\LongTermGoals\Enums\GoalPeriodType;
use Domain\User\Models\User;
use Illuminate\Support\Facades\Date;

class ReviewedLongTermGoalsEvent extends AutomationEvent
{
    public const KEY = 'long-term-goals.reviewed';

    private const PERIOD_ANY = 'any';

    public function key(): string
    {
        return self::KEY;
    }

    public function tool(): string
    {
        return 'Long-Term Goals';
    }

    public function label(): string
    {
        return 'Review long-term goals';
    }

    public function description(): string
    {
        return 'Earn once a day when you complete a long-term goal period review.';
    }

    public function parameters(): array
    {
        return [
            EventParameter::choice('period', 'Period type', [
                ['value' => self::PERIOD_ANY, 'label' => 'Any period'],
                ['value' => GoalPeriodType::Monthly->value, 'label' => GoalPeriodType::Monthly->label()],
                ['value' => GoalPeriodType::Yearly->value, 'label' => GoalPeriodType::Yearly->label()],
            ], self::PERIOD_ANY, 'Which kind of period review counts.'),
        ];
    }

    public function evaluate(User $user, array $parameters): int
    {
        $period = $parameters['period'] ?? self::PERIOD_ANY;

        $reviewedToday = $user->goalPeriods()
            ->whereDate('reviewed_at', Date::today())
            ->when($period !== self::PERIOD_ANY, fn ($query) => $query->where('type', $period))
            ->exists();

        return $reviewedToday ? 1 : 0;
    }
}
