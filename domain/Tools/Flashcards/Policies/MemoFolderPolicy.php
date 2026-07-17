<?php

namespace Domain\Tools\Flashcards\Policies;

use Domain\Tools\Flashcards\Models\MemoFolder;
use Domain\User\Models\User;

class MemoFolderPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, MemoFolder $memoFolder): bool
    {
        return $user->id === $memoFolder->user_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, MemoFolder $memoFolder): bool
    {
        return $user->id === $memoFolder->user_id;
    }

    /**
     * Folders are only removable once emptied, so that deleting one can never
     * take sets or subfolders down with it.
     */
    public function delete(User $user, MemoFolder $memoFolder): bool
    {
        return $user->id === $memoFolder->user_id && $memoFolder->isEmpty();
    }
}
