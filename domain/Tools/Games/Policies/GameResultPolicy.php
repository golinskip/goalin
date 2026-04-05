<?php

namespace Domain\Tools\Games\Policies;

use Domain\Tools\Games\Models\GameResult;
use Domain\User\Models\User;

class GameResultPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, GameResult $gameResult): bool
    {
        return $user->id === $gameResult->user_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function delete(User $user, GameResult $gameResult): bool
    {
        return $user->id === $gameResult->user_id;
    }
}
