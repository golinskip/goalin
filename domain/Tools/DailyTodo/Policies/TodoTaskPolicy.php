<?php

namespace Domain\Tools\DailyTodo\Policies;

use Domain\Tools\DailyTodo\Models\TodoTask;
use Domain\User\Models\User;

class TodoTaskPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, TodoTask $todoTask): bool
    {
        return $user->id === $todoTask->user_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, TodoTask $todoTask): bool
    {
        return $user->id === $todoTask->user_id;
    }

    public function delete(User $user, TodoTask $todoTask): bool
    {
        return $user->id === $todoTask->user_id;
    }
}
