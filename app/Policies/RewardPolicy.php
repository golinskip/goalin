<?php

namespace App\Policies;

use App\Models\Reward;
use App\Models\User;

class RewardPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Reward $reward): bool
    {
        return $user->id === $reward->user_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Reward $reward): bool
    {
        return $user->id === $reward->user_id;
    }

    public function delete(User $user, Reward $reward): bool
    {
        return $user->id === $reward->user_id;
    }
}
