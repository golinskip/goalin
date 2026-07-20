<?php

namespace Domain\Tools\GoalTracker\Controllers;

use App\Http\Controllers\Controller;
use Domain\Automation\EventRegistry;
use Domain\Tools\DailyRoutine\Models\RoutineTask;
use Domain\Tools\GoalTracker\Enums\ActivityType;
use Domain\Tools\GoalTracker\Models\Activity;
use Domain\Tools\GoalTracker\Requests\StoreActivityRequest;
use Domain\Tools\GoalTracker\Requests\UpdateActivityRequest;
use Domain\User\Models\User;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
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
                'type' => $activity->type->value,
                'event_key' => $activity->event_key,
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

    public function create(Request $request, EventRegistry $registry): Response
    {
        $user = $request->user();

        return Inertia::render('tools/goal-tracker/activities/create', [
            'availableTags' => $user->tags()->pluck('name')->toArray(),
            'availableGoals' => $user->goals()->get()->map(fn ($g) => ['id' => $g->id, 'name' => $g->name, 'color' => $g->color])->toArray(),
            'availableRoutineTasks' => $this->routineTaskOptions($user),
            'automationEvents' => $registry->toArray(),
        ]);
    }

    public function store(StoreActivityRequest $request, EventRegistry $registry): RedirectResponse
    {
        $user = $request->user();
        $data = $request->validated();

        $tags = $data['tags'] ?? [];
        $goalIds = $data['goal_ids'] ?? [];
        unset($data['tags'], $data['goal_ids']);

        $data = $this->normalizeAutomation($data, $registry);

        if (! $data['needs_timer']) {
            $data['duration_minutes'] = null;
        }

        $data['sort_order'] = ($user->activities()->max('sort_order') ?? 0) + 1;

        $activity = $user->activities()->create($data);

        $this->syncTags($user, $activity, $tags);
        $activity->goals()->sync($goalIds);

        return to_route('activities.index');
    }

    public function edit(Request $request, Activity $activity, EventRegistry $registry): Response
    {
        $this->authorize('update', $activity);

        $user = $request->user();

        return Inertia::render('tools/goal-tracker/activities/edit', [
            'activity' => [
                'id' => $activity->id,
                'name' => $activity->name,
                'description' => $activity->description,
                'type' => $activity->type->value,
                'event_key' => $activity->event_key,
                'event_parameters' => $activity->event_parameters ?? (object) [],
                'point_cost' => $activity->point_cost,
                'color' => $activity->color,
                'needs_timer' => $activity->needs_timer,
                'duration_minutes' => $activity->duration_minutes,
                'tags' => $activity->tags->pluck('name')->toArray(),
                'goal_ids' => $activity->goals->pluck('id')->toArray(),
            ],
            'availableTags' => $user->tags()->pluck('name')->toArray(),
            'availableGoals' => $user->goals()->get()->map(fn ($g) => ['id' => $g->id, 'name' => $g->name, 'color' => $g->color])->toArray(),
            'availableRoutineTasks' => $this->routineTaskOptions($user),
            'automationEvents' => $registry->toArray(),
        ]);
    }

    public function update(UpdateActivityRequest $request, Activity $activity, EventRegistry $registry): RedirectResponse
    {
        $this->authorize('update', $activity);

        $data = $request->validated();

        $tags = $data['tags'] ?? [];
        $goalIds = $data['goal_ids'] ?? [];
        unset($data['tags'], $data['goal_ids']);

        $data = $this->normalizeAutomation($data, $registry);

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
     * Clean the automation columns so a manual activity never keeps a stale
     * event binding and an automated one stores only declared parameters.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function normalizeAutomation(array $data, EventRegistry $registry): array
    {
        $isAutomated = ($data['type'] ?? ActivityType::Manual->value) === ActivityType::Automated->value;
        $event = $isAutomated && is_string($data['event_key'] ?? null)
            ? $registry->find($data['event_key'])
            : null;

        if ($event === null) {
            $data['type'] = ActivityType::Manual->value;
            $data['event_key'] = null;
            $data['event_parameters'] = null;

            return $data;
        }

        $data['event_parameters'] = $event->normalizeParameters($data['event_parameters'] ?? []);
        $data['needs_timer'] = false;

        return $data;
    }

    /**
     * The user's currently enabled routine tasks that a "specific routine task"
     * event can target. Archived tasks (whose usage period has ended) are left
     * out since they can no longer be completed.
     *
     * @return list<array{id: int, name: string}>
     */
    private function routineTaskOptions(User $user): array
    {
        return $user->routineTasks()
            ->whereDate('ends_on', '>=', Date::today())
            ->orderBy('name')
            ->get()
            ->map(fn (RoutineTask $task): array => ['id' => $task->id, 'name' => $task->name])
            ->values()
            ->all();
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
