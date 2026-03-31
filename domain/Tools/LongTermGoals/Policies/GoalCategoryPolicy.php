<?php

namespace Domain\Tools\LongTermGoals\Policies;

use Domain\Tools\LongTermGoals\Models\GoalCategory;
use Domain\User\Models\User;

class GoalCategoryPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, GoalCategory $goalCategory): bool
    {
        return $user->id === $goalCategory->user_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, GoalCategory $goalCategory): bool
    {
        return $user->id === $goalCategory->user_id;
    }

    public function delete(User $user, GoalCategory $goalCategory): bool
    {
        return $user->id === $goalCategory->user_id;
    }
}
