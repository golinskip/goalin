<?php

namespace Domain\Tools\DailyRoutine\Alerts;

use Carbon\CarbonImmutable;
use Domain\Alerts\Alert;
use Domain\Tools\DailyRoutine\Models\RoutineTask;
use Domain\Tools\DailyRoutine\Models\RoutineTaskLog;
use Domain\User\Models\User;
use Illuminate\Database\Eloquent\Collection;

class UnmarkedRoutineTasksAlert extends Alert
{
    private int $unmarkedCount = 0;

    public function key(): string
    {
        return 'daily-routine.unmarked-tasks';
    }

    public function tool(): string
    {
        return 'Daily Routine';
    }

    public function message(): string
    {
        $word = $this->unmarkedCount === 1 ? 'task' : 'tasks';

        return "You have {$this->unmarkedCount} unmarked routine {$word} today.";
    }

    public function href(): string
    {
        return '/daily-routine';
    }

    public function check(User $user): bool
    {
        $today = CarbonImmutable::today();

        /** @var Collection<int, RoutineTask> $tasks */
        $tasks = $user->routineTasks()
            ->whereDate('starts_on', '<=', $today)
            ->whereDate('ends_on', '>=', $today)
            ->get();

        $scheduledIds = $tasks
            ->filter(fn (RoutineTask $task) => $task->isScheduledOn($today))
            ->pluck('id');

        if ($scheduledIds->isEmpty()) {
            return false;
        }

        $loggedIds = RoutineTaskLog::query()
            ->whereIn('routine_task_id', $scheduledIds)
            ->whereDate('log_date', $today)
            ->pluck('routine_task_id');

        $this->unmarkedCount = $scheduledIds->diff($loggedIds)->count();

        return $this->unmarkedCount > 0;
    }
}
