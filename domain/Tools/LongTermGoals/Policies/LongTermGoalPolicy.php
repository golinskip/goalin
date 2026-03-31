<?php

namespace Domain\Tools\LongTermGoals\Policies;

use Domain\Tools\LongTermGoals\Models\LongTermGoal;
use Domain\User\Models\User;

class LongTermGoalPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, LongTermGoal $longTermGoal): bool
    {
        return $user->id === $longTermGoal->user_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, LongTermGoal $longTermGoal): bool
    {
        return $user->id === $longTermGoal->user_id;
    }

    public function delete(User $user, LongTermGoal $longTermGoal): bool
    {
        return $user->id === $longTermGoal->user_id;
    }
}
