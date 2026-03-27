<?php

namespace Domain\Tools\Diary\Policies;

use Domain\Tools\Diary\Models\DiaryEntry;
use Domain\User\Models\User;

class DiaryEntryPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, DiaryEntry $diaryEntry): bool
    {
        return $user->id === $diaryEntry->user_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, DiaryEntry $diaryEntry): bool
    {
        return $user->id === $diaryEntry->user_id;
    }

    public function delete(User $user, DiaryEntry $diaryEntry): bool
    {
        return $user->id === $diaryEntry->user_id;
    }
}
