<?php

namespace Domain\Tools\DailyRoutine\Events;

use Domain\Automation\AutomationEvent;
use Domain\Automation\EventParameter;
use Domain\Tools\DailyRoutine\Enums\RoutineTaskStatus;
use Domain\User\Models\User;
use Illuminate\Support\Facades\Date;

class SpecificRoutineTaskEvent extends AutomationEvent
{
    public const KEY = 'daily-routine.specific_task';

    public function key(): string
    {
        return self::KEY;
    }

    public function tool(): string
    {
        return 'Daily Routine';
    }

    public function label(): string
    {
        return 'Complete a specific routine task';
    }

    public function description(): string
    {
        return 'Earn once a day when you mark one particular routine task as done.';
    }

    public function parameters(): array
    {
        return [
            EventParameter::routineTask('routine_task_id', 'Routine task', 'The task whose completion awards this activity.'),
        ];
    }

    public function evaluate(User $user, array $parameters): int
    {
        $routineTaskId = (int) ($parameters['routine_task_id'] ?? 0);

        if ($routineTaskId <= 0) {
            return 0;
        }

        $ownsTask = $user->routineTasks()
            ->whereKey($routineTaskId)
            ->exists();

        if (! $ownsTask) {
            return 0;
        }

        $doneToday = $user->routineTasks()
            ->whereKey($routineTaskId)
            ->whereHas('logs', fn ($query) => $query
                ->whereDate('log_date', Date::today())
                ->where('status', RoutineTaskStatus::Done))
            ->exists();

        return $doneToday ? 1 : 0;
    }
}
