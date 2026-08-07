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

        $mindmapTask->update($this->withResolvedProgress($request->validated(), $mindmapTask));

        return back();
    }

    public function status(Request $request, MindmapTask $mindmapTask): RedirectResponse
    {
        $this->authorize('update', $mindmapTask);

        $data = $request->validate([
            'status' => ['required', Rule::enum(TaskStatus::class)],
            'progress' => ['nullable', 'integer', 'between:0,100'],
        ]);

        $mindmapTask->update($this->withResolvedProgress($data, $mindmapTask));

        return back();
    }

    /**
     * Reconcile the status/progress pair against the task's current state so the
     * two always agree, whichever of them the request supplied.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function withResolvedProgress(array $data, MindmapTask $mindmapTask): array
    {
        $status = isset($data['status']) ? TaskStatus::from($data['status']) : $mindmapTask->status;

        $data['status'] = $status;
        $data['progress'] = $status->normalizeProgress($data['progress'] ?? $mindmapTask->progress);

        return $data;
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
