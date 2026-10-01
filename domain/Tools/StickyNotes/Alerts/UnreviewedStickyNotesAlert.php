<?php

namespace Domain\Tools\StickyNotes\Alerts;

use Domain\Alerts\Alert;
use Domain\User\Models\User;

class UnreviewedStickyNotesAlert extends Alert
{
    public function key(): string
    {
        return 'sticky-notes.unreviewed';
    }

    public function tool(): string
    {
        return 'Sticky Notes';
    }

    public function message(): string
    {
        return 'You have sticky notes you have not reviewed today.';
    }

    public function href(): string
    {
        return '/sticky-notes';
    }

    public function check(User $user): bool
    {
        return $user->stickyNotes()->needingReview()->exists();
    }
}
