<?php

namespace Domain\Tools\LongTermGoals\Alerts;

use Domain\Alerts\Alert;
use Domain\Tools\LongTermGoals\Enums\GoalPeriodType;
use Domain\User\Models\User;
use Illuminate\Support\Carbon;

class NoGoalsThisPeriodAlert extends Alert
{
    private string $periodLabel = '';

    public function key(): string
    {
        return 'long-term-goals.no-goals-this-period';
    }

    public function tool(): string
    {
        return 'Long Term Goals';
    }

    public function message(): string
    {
        return "You haven't filled any goals for {$this->periodLabel}.";
    }

    public function href(): string
    {
        return '/long-term-goals';
    }

    public function check(User $user): bool
    {
        $now = Carbon::now();
        $year = $now->year;
        $month = $now->month;

        $hasMonthlyGoals = $user->goalPeriods()
            ->where('type', GoalPeriodType::Monthly)
            ->where('year', $year)
            ->where('month', $month)
            ->whereHas('longTermGoals')
            ->exists();

        if (! $hasMonthlyGoals) {
            $this->periodLabel = $now->format('F Y');

            return true;
        }

        $hasYearlyGoals = $user->goalPeriods()
            ->where('type', GoalPeriodType::Yearly)
            ->where('year', $year)
            ->whereHas('longTermGoals')
            ->exists();

        if (! $hasYearlyGoals) {
            $this->periodLabel = (string) $year;

            return true;
        }

        return false;
    }
}
