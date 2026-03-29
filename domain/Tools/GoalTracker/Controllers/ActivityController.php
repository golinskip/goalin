<?php

namespace Domain\Tools\GoalTracker\Controllers;

use App\Http\Controllers\Controller;
use Domain\Tools\GoalTracker\Models\Activity;
use Domain\Tools\GoalTracker\Requests\StoreActivityRequest;
use Domain\Tools\GoalTracker\Requests\UpdateActivityRequest;
use Domain\User\Models\User;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ActivityController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('tools/goal-tracker/activities/index', [
            'activities' => $user->activities()->with(['tags', 'goals'])->get()->map(fn (Activity $activity) => [
                'id' => $activity->id,
                'name' => $activity->name,
                'description' => $activity->description,
                'point_cost' => $activity->point_cost,
                'color' => $activity->color,
                'needs_timer' => $activity->needs_timer,
                'duration_minutes' => $activity->duration_minutes,
                'tags' => $activity->tags->pluck('name')->toArray(),
                'goals' => $activity->goals->map(fn ($g) => ['id' => $g->id, 'name' => $g->name, 'color' => $g->color])->toArray(),
                'sort_order' => $activity->sort_order,
                'updated_at' => $activity->updated_at->toISOString(),
            ]),
        ]);
    }

    public function create(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('tools/goal-tracker/activities/create', [
            'availableTags' => $user->tags()->pluck('name')->toArray(),
            'availableGoals' => $user->goals()->get()->map(fn ($g) => ['id' => $g->id, 'name' => $g->name, 'color' => $g->color])->toArray(),
        ]);
    }

    public function store(StoreActivityRequest $request): RedirectResponse
    {
        $user = $request->user();
        $data = $request->validated();

        $tags = $data['tags'] ?? [];
        $goalIds = $data['goal_ids'] ?? [];
        unset($data['tags'], $data['goal_ids']);

        if (! $data['needs_timer']) {
            $data['duration_minutes'] = null;
        }

        $data['sort_order'] = ($user->activities()->max('sort_order') ?? 0) + 1;

        $activity = $user->activities()->create($data);

        $this->syncTags($user, $activity, $tags);
        $activity->goals()->sync($goalIds);

        return to_route('activities.index');
    }

    public function edit(Request $request, Activity $activity): Response
    {
        $this->authorize('update', $activity);

        $user = $request->user();

        return Inertia::render('tools/goal-tracker/activities/edit', [
            'activity' => [
                'id' => $activity->id,
                'name' => $activity->name,
                'description' => $activity->description,
                'point_cost' => $activity->point_cost,
                'color' => $activity->color,
                'needs_timer' => $activity->needs_timer,
                'duration_minutes' => $activity->duration_minutes,
                'tags' => $activity->tags->pluck('name')->toArray(),
                'goal_ids' => $activity->goals->pluck('id')->toArray(),
            ],
            'availableTags' => $user->tags()->pluck('name')->toArray(),
            'availableGoals' => $user->goals()->get()->map(fn ($g) => ['id' => $g->id, 'name' => $g->name, 'color' => $g->color])->toArray(),
        ]);
    }

    public function update(UpdateActivityRequest $request, Activity $activity): RedirectResponse
    {
        $this->authorize('update', $activity);

        $data = $request->validated();

        $tags = $data['tags'] ?? [];
        $goalIds = $data['goal_ids'] ?? [];
        unset($data['tags'], $data['goal_ids']);

        if (! $data['needs_timer']) {
            $data['duration_minutes'] = null;
        }

        $activity->update($data);

        $this->syncTags($request->user(), $activity, $tags);
        $activity->goals()->sync($goalIds);

        return to_route('activities.index');
    }

    public function destroy(Activity $activity): RedirectResponse
    {
        $this->authorize('delete', $activity);

        $activity->delete();

        return to_route('activities.index');
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
            $user->activities()
                ->where('id', $item['id'])
                ->update(['sort_order' => $item['sort_order']]);
        }

        return to_route('activities.index');
    }

    /**
     * @param  array<int, string>  $tagNames
     */
    private function syncTags(User $user, Activity $activity, array $tagNames): void
    {
        $tagIds = [];

        foreach ($tagNames as $name) {
            $tag = $user->tags()->firstOrCreate(['name' => trim($name)]);
            $tagIds[] = $tag->id;
        }

        $activity->tags()->sync($tagIds);
    }
}
