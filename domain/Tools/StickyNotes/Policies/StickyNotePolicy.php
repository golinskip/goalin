<?php

namespace Domain\Tools\StickyNotes\Policies;

use Domain\Tools\StickyNotes\Models\StickyNote;
use Domain\User\Models\User;

class StickyNotePolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, StickyNote $stickyNote): bool
    {
        return $user->id === $stickyNote->user_id;
    }

    public function delete(User $user, StickyNote $stickyNote): bool
    {
        return $user->id === $stickyNote->user_id;
    }
}
