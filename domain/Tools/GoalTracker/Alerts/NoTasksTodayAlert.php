<?php

namespace Domain\Tools\GoalTracker\Alerts;

use Domain\Alerts\Alert;
use Domain\User\Models\User;

class NoTasksTodayAlert extends Alert
{
    public function key(): string
    {
        return 'goal-tracker.no-tasks-today';
    }

    public function tool(): string
    {
        return 'Goal Tracker';
    }

    public function message(): string
    {
        return 'You have 0 completed tasks today.';
    }

    public function href(): string
    {
        return '/goal-tracker';
    }

    public function check(User $user): bool
    {
        return $user->activityLogs()
            ->whereDate('completed_at', today())
            ->doesntExist();
    }
}
