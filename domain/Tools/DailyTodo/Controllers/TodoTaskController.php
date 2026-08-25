<?php

namespace Domain\Tools\DailyTodo\Controllers;

use App\Http\Controllers\Controller;
use Domain\Automation\AutomationRunner;
use Domain\ExternalServices\Services\TodoistService;
use Domain\Tools\DailyTodo\Events\CompletedTodosEvent;
use Domain\Tools\DailyTodo\Models\TodoTask;
use Domain\Tools\DailyTodo\Requests\MarkTodoNotDoneRequest;
use Domain\Tools\DailyTodo\Requests\StoreTodoTaskRequest;
use Domain\Tools\DailyTodo\Requests\UpdateTodoTaskRequest;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class TodoTaskController extends Controller
{
    use AuthorizesRequests;

    /**
     * Persist a new ordering for a set of the user's own tasks or the subtasks
     * of a single parent. Positions are applied verbatim from the payload.
     */
    public function reorder(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'order' => ['required', 'array'],
            'order.*.id' => ['required', 'integer'],
            'order.*.position' => ['required', 'integer', 'min:0'],
        ]);

        $user = $request->user();

        foreach ($data['order'] as $item) {
            $user->todoTasks()
                ->where('id', $item['id'])
                ->update(['position' => $item['position']]);
        }

        return back();
    }

    public function store(StoreTodoTaskRequest $request): RedirectResponse
    {
        $data = $request->validated();

        $data['position'] = $request->user()->todoTasks()
            ->where('parent_id', $data['parent_id'] ?? null)
            ->max('position') + 1;

        $request->user()->todoTasks()->create($data);

        return back();
    }

    public function update(UpdateTodoTaskRequest $request, TodoTask $todoTask): RedirectResponse
    {
        $this->authorize('update', $todoTask);

        $data = $request->validated();

        if ($todoTask->isSubtask()) {
            unset($data['due_date']);
        }

        $todoTask->update($data);

        return back();
    }

    /**
     * Toggle a task's completion, mirroring it onto Todoist for tasks that were
     * imported from there.
     */
    public function toggle(TodoTask $todoTask, AutomationRunner $automation, TodoistService $todoist): RedirectResponse
    {
        $this->authorize('update', $todoTask);

        $completing = ! $todoTask->isCompleted();

        $todoTask->update([
            'completed_at' => $completing ? now() : null,
            'not_done' => false,
        ]);

        if ($todoTask->todoist_id !== null) {
            $completing
                ? $todoist->closeTask($todoTask->user, $todoTask->todoist_id)
                : $todoist->reopenTask($todoTask->user, $todoTask->todoist_id);
        }

        $automation->fire(CompletedTodosEvent::KEY, $todoTask->user);

        return back();
    }

    /**
     * Flag a main task as not done. Marking it again clears the flag; passing a
     * date moves the task to that day and gives it a fresh, pending start.
     */
    public function markNotDone(MarkTodoNotDoneRequest $request, TodoTask $todoTask, AutomationRunner $automation): RedirectResponse
    {
        $this->authorize('update', $todoTask);

        if ($todoTask->isSubtask()) {
            abort(403);
        }

        $moveTo = $request->validated()['move_to'] ?? null;

        if ($moveTo !== null) {
            $todoTask->update([
                'due_date' => $moveTo,
                'completed_at' => null,
                'not_done' => false,
            ]);
        } else {
            $todoTask->update([
                'completed_at' => null,
                'not_done' => ! $todoTask->isNotDone(),
            ]);
        }

        $automation->fire(CompletedTodosEvent::KEY, $todoTask->user);

        return back();
    }

    public function destroy(TodoTask $todoTask): RedirectResponse
    {
        $this->authorize('delete', $todoTask);

        $todoTask->delete();

        return back();
    }
}
