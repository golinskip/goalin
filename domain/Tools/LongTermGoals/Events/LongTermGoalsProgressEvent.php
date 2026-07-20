<?php

namespace Domain\Tools\LongTermGoals\Events;

use Domain\Automation\AutomationEvent;
use Domain\Automation\EventParameter;
use Domain\Tools\LongTermGoals\Enums\GoalPeriodType;
use Domain\Tools\LongTermGoals\Enums\GoalStatus;
use Domain\User\Models\User;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LongTermGoalsProgressEvent extends AutomationEvent
{
    public const KEY = 'long-term-goals.progress';

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
        return 'Reach long-term goal progress';
    }

    public function description(): string
    {
        return 'Earn once a day when at least the given percentage of your long-term goals are marked done.';
    }

    public function parameters(): array
    {
        return [
            EventParameter::integer('percent', 'Percent done', 100, 1, 100, 'Share of long-term goals that must be marked done.'),
            EventParameter::choice('period', 'Period type', [
                ['value' => self::PERIOD_ANY, 'label' => 'Any period'],
                ['value' => GoalPeriodType::Monthly->value, 'label' => GoalPeriodType::Monthly->label()],
                ['value' => GoalPeriodType::Yearly->value, 'label' => GoalPeriodType::Yearly->label()],
            ], self::PERIOD_ANY, 'Restrict the count to goals within this kind of period.'),
        ];
    }

    public function evaluate(User $user, array $parameters): int
    {
        $percent = max(1, (int) ($parameters['percent'] ?? 100));
        $period = $parameters['period'] ?? self::PERIOD_ANY;

        $total = $this->goalsQuery($user, $period)->count();

        if ($total === 0) {
            return 0;
        }

        $done = $this->goalsQuery($user, $period)
            ->where('status', GoalStatus::Done)
            ->count();

        return $done * 100 >= $percent * $total ? 1 : 0;
    }

    private function goalsQuery(User $user, string $period): HasMany
    {
        return $user->longTermGoals()
            ->when($period !== self::PERIOD_ANY, fn ($query) => $query->whereHas(
                'goalPeriod',
                fn ($periodQuery) => $periodQuery->where('type', $period),
            ));
    }
}
