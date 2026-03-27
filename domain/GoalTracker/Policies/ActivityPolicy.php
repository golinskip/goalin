<?php

namespace Domain\GoalTracker\Policies;

use Domain\GoalTracker\Models\Activity;
use Domain\User\Models\User;

class ActivityPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Activity $activity): bool
    {
        return $user->id === $activity->user_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Activity $activity): bool
    {
        return $user->id === $activity->user_id;
    }

    public function delete(User $user, Activity $activity): bool
    {
        return $user->id === $activity->user_id;
    }
}
