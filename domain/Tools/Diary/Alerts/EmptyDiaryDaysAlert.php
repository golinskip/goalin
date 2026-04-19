<?php

namespace Domain\Tools\Diary\Alerts;

use Domain\Alerts\Alert;
use Domain\User\Models\User;
use Illuminate\Support\Carbon;

class EmptyDiaryDaysAlert extends Alert
{
    private int $emptyDays = 0;

    public function key(): string
    {
        return 'diary.empty-days';
    }

    public function tool(): string
    {
        return 'Diary';
    }

    public function message(): string
    {
        return "You have {$this->emptyDays} empty diary ".($this->emptyDays === 1 ? 'day' : 'days').' in the last 2 months.';
    }

    public function href(): string
    {
        return '/diary';
    }

    public function check(User $user): bool
    {
        $startDate = Carbon::today()->subMonths(2);
        $endDate = Carbon::yesterday();

        if ($startDate->gt($endDate)) {
            return false;
        }

        $totalDays = $startDate->diffInDays($endDate) + 1;

        $filledDays = $user->diaryEntries()
            ->whereBetween('entry_date', [$startDate, $endDate])
            ->distinct('entry_date')
            ->count('entry_date');

        $this->emptyDays = $totalDays - $filledDays;

        return $this->emptyDays > 0;
    }
}
