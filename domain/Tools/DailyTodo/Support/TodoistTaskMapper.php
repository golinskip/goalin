<?php

namespace Domain\Tools\DailyTodo\Support;

use Domain\Tools\DailyTodo\Enums\TodoPriority;
use Domain\Tools\DailyTodo\Models\TodoTask;

class TodoistTaskMapper
{
    /**
     * Todoist ranks priorities 4 (p1, highest) down to 1 (p4, none).
     */
    public static function toPriority(int $todoistPriority): ?TodoPriority
    {
        return match ($todoistPriority) {
            4 => TodoPriority::High,
            3 => TodoPriority::Medium,
            2 => TodoPriority::Low,
            default => null,
        };
    }

    public static function fromPriority(?TodoPriority $priority): int
    {
        return match ($priority) {
            TodoPriority::High => 4,
            TodoPriority::Medium => 3,
            TodoPriority::Low => 2,
            default => 1,
        };
    }

    /**
     * Everything a fresh Todoist task is given when a todo is sent over.
     *
     * @return array<string, mixed>
     */
    public static function createPayload(TodoTask $task): array
    {
        return [
            'content' => $task->title,
            'description' => $task->description,
            'due_date' => $task->due_date?->format('Y-m-d'),
            'priority' => self::fromPriority($task->priority),
            'labels' => $task->tags ?? [],
        ];
    }

    /**
     * The fields kept in step once a task is linked. Description, priority and
     * labels are deliberately left alone so edits made inside Todoist survive.
     *
     * @return array<string, mixed>
     */
    public static function updatePayload(TodoTask $task): array
    {
        return [
            'content' => $task->title,
            'due_date' => $task->due_date?->format('Y-m-d'),
        ];
    }
}
