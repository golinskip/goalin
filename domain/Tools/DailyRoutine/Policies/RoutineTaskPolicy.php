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

    /**
     * Tasks that have been used keep their history and must be archived instead.
     */
    public function delete(User $user, RoutineTask $routineTask): bool
    {
        return $user->id === $routineTask->user_id && ! $routineTask->logs()->exists();
    }

    public function archive(User $user, RoutineTask $routineTask): bool
    {
        return $user->id === $routineTask->user_id && $routineTask->logs()->exists();
    }
}
