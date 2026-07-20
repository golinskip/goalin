<?php

namespace Domain\Tools\DailyTodo\Controllers;

use App\Http\Controllers\Controller;
use Domain\Tools\DailyTodo\Models\TodoTask;
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

    public function toggle(TodoTask $todoTask): RedirectResponse
    {
        $this->authorize('update', $todoTask);

        $todoTask->update([
            'completed_at' => $todoTask->isCompleted() ? null : now(),
        ]);

        return back();
    }

    public function destroy(TodoTask $todoTask): RedirectResponse
    {
        $this->authorize('delete', $todoTask);

        $todoTask->delete();

        return back();
    }
}
