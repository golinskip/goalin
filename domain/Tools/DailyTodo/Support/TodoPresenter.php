<?php

namespace Domain\Tools\DailyTodo\Support;

use Carbon\CarbonImmutable;
use Domain\Tools\DailyTodo\Models\TodoTask;
use Domain\User\Models\User;

class TodoPresenter
{
    /**
     * The top-level tasks planned for the given day, each with its subtasks.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function forDay(User $user, CarbonImmutable $date): array
    {
        return $user->todoTasks()
            ->whereNull('parent_id')
            ->whereDate('due_date', $date)
            ->with('subtasks')
            ->orderBy('position')
            ->orderBy('id')
            ->get()
            ->map(self::present(...))
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    public static function present(TodoTask $task): array
    {
        return [
            ...self::details($task),
            'due_date' => $task->due_date?->format('Y-m-d'),
            'subtasks' => $task->subtasks->map(self::details(...))->all(),
        ];
    }

    /**
     * The shared shape carried by both tasks and their subtasks.
     *
     * @return array<string, mixed>
     */
    private static function details(TodoTask $task): array
    {
        return [
            'id' => $task->id,
            'title' => $task->title,
            'completed' => $task->isCompleted(),
            'not_done' => $task->isNotDone(),
            'description' => $task->description,
            'links' => $task->links ?? [],
            'tags' => $task->tags ?? [],
            'estimated_cycles' => $task->estimated_cycles,
            'priority' => $task->priority?->value,
        ];
    }
}
