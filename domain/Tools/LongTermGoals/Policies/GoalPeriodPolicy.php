<?php

namespace Domain\Tools\LongTermGoals\Policies;

use Domain\Tools\LongTermGoals\Models\GoalPeriod;
use Domain\User\Models\User;

class GoalPeriodPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, GoalPeriod $goalPeriod): bool
    {
        return $user->id === $goalPeriod->user_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, GoalPeriod $goalPeriod): bool
    {
        return $user->id === $goalPeriod->user_id;
    }

    public function delete(User $user, GoalPeriod $goalPeriod): bool
    {
        return $user->id === $goalPeriod->user_id;
    }
}
