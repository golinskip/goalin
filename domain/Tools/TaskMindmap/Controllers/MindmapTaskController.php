<?php

namespace Domain\Tools\TaskMindmap\Controllers;

use App\Http\Controllers\Controller;
use Domain\Tools\TaskMindmap\Enums\TaskStatus;
use Domain\Tools\TaskMindmap\Models\MindmapTask;
use Domain\Tools\TaskMindmap\Requests\StoreMindmapTaskRequest;
use Domain\Tools\TaskMindmap\Requests\UpdateMindmapTaskRequest;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MindmapTaskController extends Controller
{
    use AuthorizesRequests;

    public function store(StoreMindmapTaskRequest $request): RedirectResponse
    {
        $data = $request->validated();

        $data['position'] = $request->user()->mindmapTasks()
            ->where('parent_id', $data['parent_id'] ?? null)
            ->max('position') + 1;

        $request->user()->mindmapTasks()->create($data);

        return back();
    }

    public function update(UpdateMindmapTaskRequest $request, MindmapTask $mindmapTask): RedirectResponse
    {
        $this->authorize('update', $mindmapTask);

        $mindmapTask->update($request->validated());

        return back();
    }

    public function status(Request $request, MindmapTask $mindmapTask): RedirectResponse
    {
        $this->authorize('update', $mindmapTask);

        $data = $request->validate([
            'status' => ['required', Rule::enum(TaskStatus::class)],
        ]);

        $mindmapTask->update(['status' => $data['status']]);

        return back();
    }

    /**
     * Persist a new ordering for a set of the user's own tasks that share a
     * parent. Positions are applied verbatim from the payload.
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
            $user->mindmapTasks()
                ->where('id', $item['id'])
                ->update(['position' => $item['position']]);
        }

        return back();
    }

    public function destroy(MindmapTask $mindmapTask): RedirectResponse
    {
        $this->authorize('delete', $mindmapTask);

        $mindmapTask->delete();

        return back();
    }
}
