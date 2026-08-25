<?php

namespace Domain\Tools\DailyTodo\Controllers;

use App\Http\Controllers\Controller;
use Carbon\CarbonImmutable;
use Domain\ExternalServices\Enums\ServiceType;
use Domain\ExternalServices\Services\TodoistService;
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
     * Make Todoist match this day as Daily Todo has it: linked tasks get their
     * title, due date and done state pushed across, and tasks that have no
     * Todoist counterpart yet are created there.
     */
    public function day(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $this->isConnected($user)) {
            return response()->json(['message' => 'Todoist is not connected.'], 403);
        }

        $date = CarbonImmutable::createFromFormat(
            'Y-m-d',
            $request->validate(['date' => ['required', 'date_format:Y-m-d']])['date'],
        )->startOfDay();

        $tasks = $user->todoTasks()
            ->whereNull('parent_id')
            ->whereDate('due_date', $date)
            ->get();

        $updated = 0;
        $created = 0;
        $failed = 0;

        foreach ($tasks as $task) {
            if ($task->todoist_id === null) {
                $this->createOnTodoist($user, $task) ? $created++ : $failed++;

                continue;
            }

            $this->pushOntoTodoist($user, $task) ? $updated++ : $failed++;
        }

        return response()->json([
            'updated' => $updated,
            'created' => $created,
            'failed' => $failed,
        ]);
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

    /**
     * Bring an already linked Todoist task back in line with the local one.
     */
    private function pushOntoTodoist(User $user, TodoTask $task): bool
    {
        return $this->todoist->updateTask($user, $task->todoist_id, TodoistTaskMapper::updatePayload($task))
            && ($task->isCompleted()
                ? $this->todoist->closeTask($user, $task->todoist_id)
                : $this->todoist->reopenTask($user, $task->todoist_id));
    }

    private function isConnected(User $user): bool
    {
        return $user->serviceConnection(ServiceType::Todoist) !== null;
    }
}
