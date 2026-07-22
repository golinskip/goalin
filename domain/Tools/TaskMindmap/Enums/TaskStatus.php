<?php

namespace Domain\Tools\TaskMindmap\Enums;

enum TaskStatus: string
{
    case Todo = 'todo';
    case Done = 'done';
    case Rejected = 'rejected';

    public function label(): string
    {
        return match ($this) {
            self::Todo => 'To do',
            self::Done => 'Done',
            self::Rejected => 'Rejected',
        };
    }
}
