<?php

namespace App\Policies;

use App\Models\MemoSet;
use App\Models\User;

class MemoSetPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, MemoSet $memoSet): bool
    {
        return $user->id === $memoSet->user_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, MemoSet $memoSet): bool
    {
        return $user->id === $memoSet->user_id;
    }

    public function delete(User $user, MemoSet $memoSet): bool
    {
        return $user->id === $memoSet->user_id;
    }
}
