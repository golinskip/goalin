<?php

namespace Domain\Tools\GoalTracker\Enums;

enum ActivityType: string
{
    case Manual = 'manual';
    case Automated = 'automated';

    public function label(): string
    {
        return match ($this) {
            self::Manual => 'Manual',
            self::Automated => 'Automated Activity',
        };
    }
}
