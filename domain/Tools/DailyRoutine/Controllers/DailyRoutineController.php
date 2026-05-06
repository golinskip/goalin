<?php

namespace Domain\Tools\DailyRoutine\Controllers;

use App\Http\Controllers\Controller;
use Carbon\CarbonImmutable;
use Domain\Tools\DailyRoutine\Models\RoutineTask;
use Domain\Tools\DailyRoutine\Models\RoutineTaskLog;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DailyRoutineController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $today = CarbonImmutable::today();

        $selectedDate = $this->parseDate($request->input('date'), $today);

        if ($selectedDate->gt($today)) {
            $selectedDate = $today;
        }

        /** @var Collection<int, RoutineTask> $tasks */
        $tasks = $user->routineTasks()->orderBy('created_at')->get();

        $calendarDays = 60;
        $calendarStart = $today->subDays($calendarDays - 1);

        /** @var array<int, array<string, RoutineTaskLog>> $logsByTask */
        $logsByTask = RoutineTaskLog::query()
            ->whereIn('routine_task_id', $tasks->pluck('id'))
            ->whereBetween('log_date', [$calendarStart, $today])
            ->get()
            ->groupBy('routine_task_id')
            ->map(fn ($group) => $group->keyBy(fn (RoutineTaskLog $log) => $log->log_date->format('Y-m-d')))
            ->all();

        $tasksForSelectedDay = $tasks
            ->filter(fn (RoutineTask $task) => $task->isScheduledOn($selectedDate))
            ->values()
            ->map(function (RoutineTask $task) use ($logsByTask, $selectedDate) {
                $log = $logsByTask[$task->id][$selectedDate->format('Y-m-d')] ?? null;

                return [
                    'id' => $task->id,
                    'name' => $task->name,
                    'color' => $task->color,
                    'status' => $log?->status->value,
                ];
            });

        $calendar = [];
        for ($i = 0; $i < $calendarDays; $i++) {
            $date = $calendarStart->addDays($i);
            $dateKey = $date->format('Y-m-d');

            $scheduledCount = 0;
            $doneCount = 0;
            $skippedCount = 0;

            foreach ($tasks as $task) {
                if (! $task->isScheduledOn($date)) {
                    continue;
                }

                $scheduledCount++;
                $status = ($logsByTask[$task->id][$dateKey] ?? null)?->status->value;

                if ($status === 'done') {
                    $doneCount++;
                } elseif ($status === 'skipped') {
                    $skippedCount++;
                }
            }

            $countable = $scheduledCount - $skippedCount;
            $percent = $countable > 0 ? (int) round(($doneCount / $countable) * 100) : null;

            $calendar[] = [
                'date' => $dateKey,
                'scheduled' => $scheduledCount,
                'done' => $doneCount,
                'skipped' => $skippedCount,
                'percent' => $percent,
            ];
        }

        return Inertia::render('tools/daily-routine/index', [
            'selectedDate' => $selectedDate->format('Y-m-d'),
            'today' => $today->format('Y-m-d'),
            'tasks' => $tasks->map(fn (RoutineTask $task) => [
                'id' => $task->id,
                'name' => $task->name,
                'color' => $task->color,
                'weekdays' => $task->weekdays,
                'starts_on' => $task->starts_on->format('Y-m-d'),
                'ends_on' => $task->ends_on->format('Y-m-d'),
            ]),
            'tasksForSelectedDay' => $tasksForSelectedDay,
            'calendar' => $calendar,
        ]);
    }

    private function parseDate(mixed $value, CarbonImmutable $fallback): CarbonImmutable
    {
        if (! is_string($value) || $value === '') {
            return $fallback;
        }

        try {
            return CarbonImmutable::parse($value)->startOfDay();
        } catch (\Throwable) {
            return $fallback;
        }
    }
}
