<?php

namespace Domain\Tools\LongTermGoals\Enums;

enum GoalStatus: string
{
    case Pending = 'pending';
    case Done = 'done';
    case PartiallyDone = 'partially_done';
    case NotDone = 'not_done';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Pending',
            self::Done => 'Done',
            self::PartiallyDone => 'Partially Done',
            self::NotDone => 'Not Done',
        };
    }
}
