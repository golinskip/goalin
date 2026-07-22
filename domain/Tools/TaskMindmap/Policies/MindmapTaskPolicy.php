<?php

namespace Domain\Tools\TaskMindmap\Policies;

use Domain\Tools\TaskMindmap\Models\MindmapTask;
use Domain\User\Models\User;

class MindmapTaskPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, MindmapTask $mindmapTask): bool
    {
        return $user->id === $mindmapTask->user_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, MindmapTask $mindmapTask): bool
    {
        return $user->id === $mindmapTask->user_id;
    }

    public function delete(User $user, MindmapTask $mindmapTask): bool
    {
        return $user->id === $mindmapTask->user_id;
    }
}
