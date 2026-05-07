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
    private const LOOKBACK_DAYS = 7;

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

        return "You have {$this->unmarkedCount} unmarked routine {$word} from the past week.";
    }

    public function href(): string
    {
        return '/daily-routine';
    }

    public function check(User $user): bool
    {
        $today = CarbonImmutable::today();
        $start = $today->subDays(self::LOOKBACK_DAYS);
        $end = $today->subDay();

        /** @var Collection<int, RoutineTask> $tasks */
        $tasks = $user->routineTasks()
            ->whereDate('starts_on', '<=', $end)
            ->whereDate('ends_on', '>=', $start)
            ->get();

        if ($tasks->isEmpty()) {
            return false;
        }

        $loggedDatesByTask = RoutineTaskLog::query()
            ->whereIn('routine_task_id', $tasks->pluck('id'))
            ->whereBetween('log_date', [$start, $end])
            ->get(['routine_task_id', 'log_date'])
            ->groupBy('routine_task_id')
            ->map(fn (Collection $logs) => $logs->pluck('log_date')->map(fn ($d) => $d->toDateString())->all());

        $unmarked = 0;

        foreach ($tasks as $task) {
            $logged = $loggedDatesByTask[$task->id] ?? [];

            for ($date = $start; $date->lte($end); $date = $date->addDay()) {
                if (! $task->isScheduledOn($date)) {
                    continue;
                }

                if (! in_array($date->toDateString(), $logged, true)) {
                    $unmarked++;
                }
            }
        }

        $this->unmarkedCount = $unmarked;

        return $unmarked > 0;
    }
}
