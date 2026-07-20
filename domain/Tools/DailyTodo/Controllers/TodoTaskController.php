<?php

namespace Domain\Tools\DailyTodo\Controllers;

use App\Http\Controllers\Controller;
use Domain\Automation\AutomationRunner;
use Domain\Tools\DailyTodo\Events\CompletedTodosEvent;
use Domain\Tools\DailyTodo\Models\TodoTask;
use Domain\Tools\DailyTodo\Requests\MarkTodoNotDoneRequest;
use Domain\Tools\DailyTodo\Requests\StoreTodoTaskRequest;
use Domain\Tools\DailyTodo\Requests\UpdateTodoTaskRequest;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;

class TodoTaskController extends Controller
{
    use AuthorizesRequests;

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

    public function toggle(TodoTask $todoTask, AutomationRunner $automation): RedirectResponse
    {
        $this->authorize('update', $todoTask);

        $todoTask->update([
            'completed_at' => $todoTask->isCompleted() ? null : now(),
            'not_done' => false,
        ]);

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
