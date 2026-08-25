<?php

namespace Domain\Tools\DailyTodo\Controllers;

use App\Http\Controllers\Controller;
use Carbon\CarbonImmutable;
use Domain\ExternalServices\Enums\ServiceType;
use Domain\Tools\DailyTodo\Models\TodoTask;
use Domain\Tools\DailyTodo\Support\TodoPresenter;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DailyTodoController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $today = CarbonImmutable::today();

        $selectedDate = $this->parseDate($request->input('date'), $today);
        $month = $this->parseMonth($request->input('month'), $selectedDate);

        $gridStart = $month->startOfMonth()->startOfWeek(CarbonImmutable::MONDAY);
        $gridEnd = $month->endOfMonth()->endOfWeek(CarbonImmutable::SUNDAY);

        return Inertia::render('tools/daily-todo/index', [
            'selectedDate' => $selectedDate->format('Y-m-d'),
            'today' => $today->format('Y-m-d'),
            'month' => $month->format('Y-m'),
            'tasks' => TodoPresenter::forDay($user, $selectedDate),
            'calendar' => $this->buildCalendar($user->id, $gridStart, $gridEnd),
            'todoistConnected' => $user->serviceConnection(ServiceType::Todoist) !== null,
        ]);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function buildCalendar(int $userId, CarbonImmutable $gridStart, CarbonImmutable $gridEnd): array
    {
        $counts = TodoTask::query()
            ->where('user_id', $userId)
            ->whereNull('parent_id')
            ->whereBetween('due_date', [$gridStart, $gridEnd])
            ->get(['due_date', 'completed_at'])
            ->groupBy(fn (TodoTask $task): string => $task->due_date->format('Y-m-d'));

        $days = [];
        for ($date = $gridStart; $date->lte($gridEnd); $date = $date->addDay()) {
            $key = $date->format('Y-m-d');
            /** @var Collection<int, TodoTask> $dayTasks */
            $dayTasks = $counts->get($key, new Collection);

            $days[] = [
                'date' => $key,
                'total' => $dayTasks->count(),
                'completed' => $dayTasks->filter(fn (TodoTask $task): bool => $task->isCompleted())->count(),
            ];
        }

        return $days;
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

    private function parseMonth(mixed $value, CarbonImmutable $fallback): CarbonImmutable
    {
        if (! is_string($value) || $value === '') {
            return $fallback->startOfMonth();
        }

        try {
            return CarbonImmutable::createFromFormat('Y-m', $value)->startOfMonth();
        } catch (\Throwable) {
            return $fallback->startOfMonth();
        }
    }
}
