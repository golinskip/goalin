<?php

namespace Domain\Tools\TaskMindmap\Support;

use Domain\Tools\TaskMindmap\Enums\TaskStatus;
use Domain\Tools\TaskMindmap\Models\MindmapTask;
use Domain\User\Models\User;
use Illuminate\Support\Collection;

class MindmapTreePresenter
{
    /**
     * Build the user's full task tree as nested arrays. Each node carries a
     * subtree summary (done vs. total, rejected excluded from the total) so the
     * client can show progress on collapsed branches without loading anything
     * extra.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function forUser(User $user): array
    {
        /** @var Collection<int, MindmapTask> $tasks */
        $tasks = $user->mindmapTasks()
            ->orderBy('position')
            ->orderBy('id')
            ->get();

        /** @var Collection<int|null, Collection<int, MindmapTask>> $byParent */
        $byParent = $tasks->groupBy('parent_id');

        return self::build($byParent, null);
    }

    /**
     * @param  Collection<int|null, Collection<int, MindmapTask>>  $byParent
     * @return array<int, array<string, mixed>>
     */
    private static function build(Collection $byParent, ?int $parentId): array
    {
        /** @var Collection<int, MindmapTask> $children */
        $children = $byParent->get($parentId, collect());

        return $children->map(function (MindmapTask $task) use ($byParent): array {
            $childNodes = self::build($byParent, $task->id);

            $doneDescendants = 0;
            $totalDescendants = 0;

            foreach ($childNodes as $child) {
                $totalDescendants += $child['total_count'] + ($child['status'] === TaskStatus::Rejected->value ? 0 : 1);
                $doneDescendants += $child['done_count'] + ($child['status'] === TaskStatus::Done->value ? 1 : 0);
            }

            return [
                'id' => $task->id,
                'title' => $task->title,
                'status' => $task->status->value,
                'description' => $task->description,
                'links' => $task->links ?? [],
                'tags' => $task->tags ?? [],
                'color' => $task->color,
                'icon' => $task->icon,
                'priority' => $task->priority?->value,
                'deadline' => $task->deadline?->format('Y-m-d'),
                'done_count' => $doneDescendants,
                'total_count' => $totalDescendants,
                'children' => $childNodes,
            ];
        })->all();
    }
}
