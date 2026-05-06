<?php

namespace Domain\Tools\DailyRoutine\Controllers;

use App\Http\Controllers\Controller;
use Domain\Tools\DailyRoutine\Models\RoutineTask;
use Domain\Tools\DailyRoutine\Requests\StoreRoutineTaskRequest;
use Domain\Tools\DailyRoutine\Requests\UpdateRoutineTaskRequest;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;

class RoutineTaskController extends Controller
{
    use AuthorizesRequests;

    public function store(StoreRoutineTaskRequest $request): RedirectResponse
    {
        $request->user()->routineTasks()->create($request->validated());

        return back();
    }

    public function update(UpdateRoutineTaskRequest $request, RoutineTask $routineTask): RedirectResponse
    {
        $this->authorize('update', $routineTask);

        $routineTask->update($request->validated());

        return back();
    }

    public function destroy(RoutineTask $routineTask): RedirectResponse
    {
        $this->authorize('delete', $routineTask);

        $routineTask->delete();

        return back();
    }
}
