<?php

namespace Domain\Tools\RssFeeds\Policies;

use Domain\Tools\RssFeeds\Models\RssFeed;
use Domain\User\Models\User;

class RssFeedPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, RssFeed $rssFeed): bool
    {
        return $user->id === $rssFeed->user_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, RssFeed $rssFeed): bool
    {
        return $user->id === $rssFeed->user_id;
    }

    public function delete(User $user, RssFeed $rssFeed): bool
    {
        return $user->id === $rssFeed->user_id;
    }
}
