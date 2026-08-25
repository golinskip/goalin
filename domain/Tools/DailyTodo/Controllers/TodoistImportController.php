<?php

namespace Domain\Tools\DailyTodo\Controllers;

use App\Http\Controllers\Controller;
use Carbon\CarbonImmutable;
use Domain\ExternalServices\Enums\ServiceType;
use Domain\ExternalServices\Services\TodoistService;
use Domain\Tools\DailyTodo\Requests\ImportTodoistTasksRequest;
use Domain\Tools\DailyTodo\Support\TodoistTaskMapper;
use Domain\User\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class TodoistImportController extends Controller
{
    public function __construct(private readonly TodoistService $todoist) {}

    /**
     * The Todoist tasks due on the requested day, flagged with whether they
     * have already been pulled into Daily Todo.
     */
    public function preview(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $this->isConnected($user)) {
            return response()->json(['message' => 'Todoist is not connected.'], 403);
        }

        $date = CarbonImmutable::createFromFormat(
            'Y-m-d',
            $request->validate(['date' => ['required', 'date_format:Y-m-d']])['date'],
        )->startOfDay();

        $imported = $user->todoTasks()
            ->whereNotNull('todoist_id')
            ->pluck('todoist_id')
            ->all();

        $tasks = collect($this->todoist->tasksDueOn($user, $date))
            ->map(fn (array $task): array => [
                'id' => $task['id'],
                'content' => $task['content'],
                'description' => $task['description'],
                'url' => $task['url'],
                'priority' => $task['priority'],
                'labels' => $task['labels'],
                'already_imported' => in_array($task['id'], $imported, true),
            ])
            ->values()
            ->all();

        return response()->json(['tasks' => $tasks]);
    }

    /**
     * Import the picked Todoist tasks as top-level todos on the given day.
     * Tasks are re-fetched from Todoist so only their real content is stored,
     * and anything already imported is skipped.
     */
    public function store(ImportTodoistTasksRequest $request): RedirectResponse
    {
        $user = $request->user();

        if (! $this->isConnected($user)) {
            return back()->withErrors(['ids' => 'Todoist is not connected.']);
        }

        $data = $request->validated();
        $date = CarbonImmutable::createFromFormat('Y-m-d', $data['date'])->startOfDay();

        $available = collect($this->todoist->tasksDueOn($user, $date))->keyBy('id');

        $selected = collect($data['ids'])
            ->unique()
            ->map(fn (string $id): mixed => $available->get($id))
            ->filter();

        $alreadyImported = $user->todoTasks()
            ->whereIn('todoist_id', $selected->pluck('id'))
            ->pluck('todoist_id')
            ->all();

        $position = $user->todoTasks()->whereNull('parent_id')->max('position') + 1;

        foreach ($selected as $task) {
            if (in_array($task['id'], $alreadyImported, true)) {
                continue;
            }

            $user->todoTasks()->create([
                ...TodoistTaskMapper::attributesFrom($task),
                'todoist_id' => $task['id'],
                'links' => TodoistTaskMapper::linkTo($task),
                'due_date' => $date,
                'position' => $position++,
            ]);
        }

        return back();
    }

    private function isConnected(User $user): bool
    {
        return $user->serviceConnection(ServiceType::Todoist) !== null;
    }
}
