<?php

namespace Domain\Tools\TaskMindmap\Enums;

enum TaskStatus: string
{
    case Todo = 'todo';
    case InProgress = 'in_progress';
    case Done = 'done';
    case Rejected = 'rejected';

    public function label(): string
    {
        return match ($this) {
            self::Todo => 'To do',
            self::InProgress => 'In progress',
            self::Done => 'Done',
            self::Rejected => 'Rejected',
        };
    }

    /**
     * Whether the status belongs to the default "open work" view.
     */
    public function isOpen(): bool
    {
        return $this === self::Todo || $this === self::InProgress;
    }

    /**
     * Keep the stored percentage consistent with the status: a finished task is
     * always 100%, a fresh one 0%, and an in-progress one stays strictly below
     * 100% so it never reads as finished.
     */
    public function normalizeProgress(?int $progress): int
    {
        return match ($this) {
            self::Todo => 0,
            self::Done => 100,
            self::InProgress => min(99, max(0, $progress ?? 0)),
            self::Rejected => min(100, max(0, $progress ?? 0)),
        };
    }
}
