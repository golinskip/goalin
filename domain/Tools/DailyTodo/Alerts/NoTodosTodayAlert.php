<?php

namespace Domain\Tools\DailyTodo\Alerts;

use Domain\Alerts\Alert;
use Domain\User\Models\User;

class NoTodosTodayAlert extends Alert
{
    public function key(): string
    {
        return 'daily-todo.no-plan-today';
    }

    public function tool(): string
    {
        return 'Daily Todo';
    }

    public function message(): string
    {
        return 'You have no tasks planned for today.';
    }

    public function href(): string
    {
        return '/daily-todo';
    }

    public function check(User $user): bool
    {
        return $user->todoTasks()
            ->whereNull('parent_id')
            ->whereDate('due_date', today())
            ->doesntExist();
    }
}
