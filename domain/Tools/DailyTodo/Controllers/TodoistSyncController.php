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

        $todoistId = $this->todoist->createTask($user, TodoistTaskMapper::createPayload($todoTask));

        if ($todoistId === null) {
            return back()->withErrors(['todoist' => 'The task could not be sent to Todoist.']);
        }

        $todoTask->update(['todoist_id' => $todoistId]);

        return back();
    }

    /**
     * Push every linked task planned for the given day back onto Todoist: its
     * title, its due date, and whether it is done.
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

        $synced = 0;
        $failed = 0;

        foreach ($tasks->whereNotNull('todoist_id') as $task) {
            $pushed = $this->todoist->updateTask($user, $task->todoist_id, TodoistTaskMapper::updatePayload($task))
                && ($task->isCompleted()
                    ? $this->todoist->closeTask($user, $task->todoist_id)
                    : $this->todoist->reopenTask($user, $task->todoist_id));

            $pushed ? $synced++ : $failed++;
        }

        return response()->json([
            'synced' => $synced,
            'failed' => $failed,
            'unlinked' => $tasks->whereNull('todoist_id')->count(),
        ]);
    }

    private function isConnected(User $user): bool
    {
        return $user->serviceConnection(ServiceType::Todoist) !== null;
    }
}
