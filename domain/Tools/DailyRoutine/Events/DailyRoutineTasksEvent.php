<?php

namespace Domain\Tools\DailyRoutine\Events;

use Domain\Automation\AutomationEvent;
use Domain\Automation\EventParameter;
use Domain\Tools\DailyRoutine\Enums\RoutineTaskStatus;
use Domain\Tools\DailyRoutine\Models\RoutineTaskLog;
use Domain\User\Models\User;
use Illuminate\Support\Facades\Date;

class DailyRoutineTasksEvent extends AutomationEvent
{
    public const KEY = 'daily-routine.tasks_done';

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
        return 'Complete routine tasks';
    }

    public function description(): string
    {
        return 'Earn once a day when you mark a number of today\'s routine tasks as done. Use 0 to require every task scheduled for today.';
    }

    public function parameters(): array
    {
        return [
            EventParameter::integer('count', 'Tasks to complete', 0, 0, 100, 'How many of today\'s routine tasks to complete. 0 means all tasks scheduled for today.'),
        ];
    }

    public function evaluate(User $user, array $parameters): int
    {
        $target = (int) ($parameters['count'] ?? 0);
        $today = Date::today();

        if ($target === 0) {
            $target = $user->routineTasks()
                ->whereJsonContains('weekdays', $today->dayOfWeekIso)
                ->whereDate('starts_on', '<=', $today)
                ->whereDate('ends_on', '>=', $today)
                ->count();
        }

        if ($target === 0) {
            return 0;
        }

        $doneToday = RoutineTaskLog::query()
            ->whereIn('routine_task_id', $user->routineTasks()->select('id'))
            ->whereDate('log_date', $today)
            ->where('status', RoutineTaskStatus::Done)
            ->distinct()
            ->count('routine_task_id');

        return $doneToday >= $target ? 1 : 0;
    }
}
