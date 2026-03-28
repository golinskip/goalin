<?php

namespace Domain\Tools\MusicPlayer\Policies;

use Domain\Tools\MusicPlayer\Models\Playlist;
use Domain\User\Models\User;

class PlaylistPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Playlist $playlist): bool
    {
        return $user->id === $playlist->user_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Playlist $playlist): bool
    {
        return $user->id === $playlist->user_id;
    }

    public function delete(User $user, Playlist $playlist): bool
    {
        return $user->id === $playlist->user_id;
    }
}
