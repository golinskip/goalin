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
     * The fields a todo takes from its Todoist counterpart. Local-only details
     * such as estimated cycles, subtasks and links are left untouched.
     *
     * @param  array{content: string, description: string|null, priority: int, labels: array<int, string>}  $task
     * @return array<string, mixed>
     */
    public static function attributesFrom(array $task): array
    {
        return [
            'title' => mb_substr($task['content'], 0, 255),
            'description' => $task['description'] !== null && trim($task['description']) !== ''
                ? $task['description']
                : null,
            'tags' => $task['labels'],
            'priority' => self::toPriority($task['priority'])?->value,
        ];
    }

    /**
     * The link back to Todoist given to a task when it is first pulled in.
     *
     * @param  array{url: string}  $task
     * @return array<int, array{label: string, url: string}>
     */
    public static function linkTo(array $task): array
    {
        return [['label' => 'Todoist', 'url' => $task['url']]];
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
