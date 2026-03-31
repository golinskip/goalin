<?php

namespace Domain\Tools\LongTermGoals\Enums;

enum GoalPeriodType: string
{
    case Yearly = 'yearly';
    case Monthly = 'monthly';

    public function label(): string
    {
        return match ($this) {
            self::Yearly => 'Yearly',
            self::Monthly => 'Monthly',
        };
    }
}
