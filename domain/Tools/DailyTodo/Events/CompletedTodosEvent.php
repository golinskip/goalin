<?php

namespace Domain\Tools\DailyTodo\Events;

use Domain\Automation\AutomationEvent;
use Domain\Automation\EventParameter;
use Domain\User\Models\User;
use Illuminate\Support\Facades\Date;

class CompletedTodosEvent extends AutomationEvent
{
    public const KEY = 'daily-todo.tasks_done';

    public function key(): string
    {
        return self::KEY;
    }

    public function tool(): string
    {
        return 'Daily Todo';
    }

    public function label(): string
    {
        return 'Complete todo tasks';
    }

    public function description(): string
    {
        return 'Earn once a day when you finish a number of today\'s todo tasks. Use 0 to require every task planned for today.';
    }

    public function parameters(): array
    {
        return [
            EventParameter::integer('count', 'Tasks to complete', 0, 0, 100, 'How many of today\'s todo tasks to finish. 0 means all tasks planned for today.'),
        ];
    }

    public function evaluate(User $user, array $parameters): int
    {
        $today = Date::today();
        $target = (int) ($parameters['count'] ?? 0);

        if ($target === 0) {
            $target = $user->todoTasks()
                ->whereNull('parent_id')
                ->whereDate('due_date', $today)
                ->count();
        }

        if ($target === 0) {
            return 0;
        }

        $completedToday = $user->todoTasks()
            ->whereNull('parent_id')
            ->whereDate('due_date', $today)
            ->whereNotNull('completed_at')
            ->count();

        return $completedToday >= $target ? 1 : 0;
    }
}
