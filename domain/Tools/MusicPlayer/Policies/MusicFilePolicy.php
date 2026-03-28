<?php

namespace Domain\Tools\MusicPlayer\Policies;

use Domain\Tools\MusicPlayer\Models\MusicFile;
use Domain\User\Models\User;

class MusicFilePolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, MusicFile $musicFile): bool
    {
        return $user->id === $musicFile->user_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, MusicFile $musicFile): bool
    {
        return $user->id === $musicFile->user_id;
    }

    public function delete(User $user, MusicFile $musicFile): bool
    {
        return $user->id === $musicFile->user_id;
    }
}
