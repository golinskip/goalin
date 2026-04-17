<?php

namespace Domain\Tools\Flashcards\Alerts;

use Domain\Tools\Alerts\Alert;
use Domain\Tools\Flashcards\Models\MemoCard;
use Domain\User\Models\User;

class NoReviewTodayAlert extends Alert
{
    public function key(): string
    {
        return 'flashcards.no-review-today';
    }

    public function tool(): string
    {
        return 'Memo Cards';
    }

    public function message(): string
    {
        return 'You haven\'t reviewed any flashcards today.';
    }

    public function href(): string
    {
        return '/memo-sets';
    }

    public function check(User $user): bool
    {
        $hasSets = $user->memoSets()->exists();

        if (! $hasSets) {
            return false;
        }

        return ! MemoCard::query()
            ->whereIn('memo_set_id', $user->memoSets()->select('id'))
            ->whereDate('last_reviewed_at', today())
            ->exists();
    }
}
