<?php

namespace Domain\Tools\DailyRoutine\Policies;

use Domain\Tools\DailyRoutine\Models\RoutineTask;
use Domain\User\Models\User;

class RoutineTaskPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, RoutineTask $routineTask): bool
    {
        return $user->id === $routineTask->user_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, RoutineTask $routineTask): bool
    {
        return $user->id === $routineTask->user_id;
    }

    public function delete(User $user, RoutineTask $routineTask): bool
    {
        return $user->id === $routineTask->user_id;
    }
}
