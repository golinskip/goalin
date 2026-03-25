<?php

namespace App\Http\Controllers\Manage;

use App\Http\Controllers\Controller;
use App\Http\Requests\Goal\StoreGoalRequest;
use App\Http\Requests\Goal\UpdateGoalRequest;
use App\Models\Goal;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class GoalController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('manage/goals/index', [
            'goals' => $user->goals()->withCount('activities')->get()->map(fn (Goal $goal) => [
                'id' => $goal->id,
                'name' => $goal->name,
                'description' => $goal->description,
                'color' => $goal->color,
                'activities_count' => $goal->activities_count,
                'sort_order' => $goal->sort_order,
                'updated_at' => $goal->updated_at->toISOString(),
            ]),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('manage/goals/create');
    }

    public function store(StoreGoalRequest $request): RedirectResponse
    {
        $user = $request->user();
        $data = $request->validated();
        $data['sort_order'] = ($user->goals()->max('sort_order') ?? 0) + 1;

        $user->goals()->create($data);

        return to_route('goals.index');
    }

    public function edit(Goal $goal): Response
    {
        $this->authorize('update', $goal);

        return Inertia::render('manage/goals/edit', [
            'goal' => [
                'id' => $goal->id,
                'name' => $goal->name,
                'description' => $goal->description,
                'color' => $goal->color,
            ],
        ]);
    }

    public function update(UpdateGoalRequest $request, Goal $goal): RedirectResponse
    {
        $this->authorize('update', $goal);

        $goal->update($request->validated());

        return to_route('goals.index');
    }

    public function destroy(Goal $goal): RedirectResponse
    {
        $this->authorize('delete', $goal);

        $goal->delete();

        return to_route('goals.index');
    }

    public function reorder(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'order' => ['required', 'array'],
            'order.*.id' => ['required', 'integer'],
            'order.*.sort_order' => ['required', 'integer', 'min:0'],
        ]);

        $user = $request->user();

        foreach ($data['order'] as $item) {
            $user->goals()
                ->where('id', $item['id'])
                ->update(['sort_order' => $item['sort_order']]);
        }

        return to_route('goals.index');
    }
}
