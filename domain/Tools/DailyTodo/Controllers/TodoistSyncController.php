<?php

namespace Domain\Tools\DailyTodo\Controllers;

use App\Http\Controllers\Controller;
use Carbon\CarbonImmutable;
use Domain\Automation\AutomationRunner;
use Domain\ExternalServices\Enums\ServiceType;
use Domain\ExternalServices\Services\TodoistService;
use Domain\Tools\DailyTodo\Events\CompletedTodosEvent;
use Domain\Tools\DailyTodo\Models\TodoTask;
use Domain\Tools\DailyTodo\Support\TodoistTaskMapper;
use Domain\User\Models\User;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class TodoistSyncController extends Controller
{
    use AuthorizesRequests;

    public function __construct(private readonly TodoistService $todoist) {}

    /**
     * Send a todo that has no Todoist counterpart over to Todoist and link the
     * two, so later edits and completions keep them in step.
     */
    public function store(Request $request, TodoTask $todoTask): RedirectResponse
    {
        $this->authorize('update', $todoTask);

        if ($todoTask->isSubtask()) {
            abort(403);
        }

        $user = $request->user();

        if (! $this->isConnected($user)) {
            return back()->withErrors(['todoist' => 'Todoist is not connected.']);
        }

        if ($todoTask->todoist_id !== null) {
            return back();
        }

        $this->createOnTodoist($user, $todoTask);

        if ($todoTask->todoist_id === null) {
            return back()->withErrors(['todoist' => 'The task could not be sent to Todoist.']);
        }

        return back();
    }

    /**
     * Bring this day's todos in line with Todoist: every linked task takes its
     * title, details, due date and done state from its Todoist counterpart, and
     * Todoist tasks due that day that are not here yet are pulled in.
     */
    public function day(Request $request, AutomationRunner $automation): JsonResponse
    {
        $user = $request->user();

        if (! $this->isConnected($user)) {
            return response()->json(['message' => 'Todoist is not connected.'], 403);
        }

        $date = CarbonImmutable::createFromFormat(
            'Y-m-d',
            $request->validate(['date' => ['required', 'date_format:Y-m-d']])['date'],
        )->startOfDay();

        $updated = 0;
        $gone = 0;
        $completionChanged = false;

        $linkedTasks = $user->todoTasks()
            ->whereNull('parent_id')
            ->whereDate('due_date', $date)
            ->whereNotNull('todoist_id')
            ->get();

        foreach ($linkedTasks as $task) {
            $remote = $this->todoist->findTask($user, $task->todoist_id);

            if ($remote === null) {
                $gone++;

                continue;
            }

            $wasCompleted = $task->isCompleted();

            $task->update([
                ...TodoistTaskMapper::attributesFrom($remote),
                'due_date' => $remote['due'] ?? $task->due_date,
                'completed_at' => $remote['completed'] ? ($task->completed_at ?? now()) : null,
                'not_done' => $remote['completed'] ? false : $task->not_done,
            ]);

            if ($task->wasChanged()) {
                $updated++;
            }

            $completionChanged = $completionChanged || $wasCompleted !== $task->isCompleted();
        }

        $imported = $this->pullNewTasks($user, $date);

        if ($completionChanged) {
            $automation->fire(CompletedTodosEvent::KEY, $user);
        }

        return response()->json([
            'updated' => $updated,
            'imported' => $imported,
            'gone' => $gone,
        ]);
    }

    /**
     * Add the Todoist tasks due that day that no todo is linked to yet.
     */
    private function pullNewTasks(User $user, CarbonImmutable $date): int
    {
        $alreadyHere = $user->todoTasks()
            ->whereNotNull('todoist_id')
            ->pluck('todoist_id')
            ->all();

        $position = $user->todoTasks()->whereNull('parent_id')->max('position') + 1;
        $imported = 0;

        foreach ($this->todoist->tasksDueOn($user, $date) as $remote) {
            if (in_array($remote['id'], $alreadyHere, true)) {
                continue;
            }

            $user->todoTasks()->create([
                ...TodoistTaskMapper::attributesFrom($remote),
                'todoist_id' => $remote['id'],
                'links' => TodoistTaskMapper::linkTo($remote),
                'due_date' => $date,
                'position' => $position++,
            ]);

            $imported++;
        }

        return $imported;
    }

    /**
     * Create the task on Todoist and link the two. A task that is already done
     * locally is closed straight away.
     */
    private function createOnTodoist(User $user, TodoTask $task): bool
    {
        $todoistId = $this->todoist->createTask($user, TodoistTaskMapper::createPayload($task));

        if ($todoistId === null) {
            return false;
        }

        $task->update(['todoist_id' => $todoistId]);

        return ! $task->isCompleted() || $this->todoist->closeTask($user, $todoistId);
    }

    private function isConnected(User $user): bool
    {
        return $user->serviceConnection(ServiceType::Todoist) !== null;
    }
}
