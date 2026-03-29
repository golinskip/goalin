<?php

namespace Domain\Tools\GoalTracker\Controllers;

use App\Http\Controllers\Controller;
use Domain\Tools\GoalTracker\Models\Activity;
use Domain\Tools\GoalTracker\Services\PointService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class GoalTrackerController extends Controller
{
    public function __invoke(Request $request, PointService $pointService): Response
    {
        $user = $request->user();

        $activities = $user->activities()->with('tags')->get()->map(fn (Activity $activity) => [
            'id' => $activity->id,
            'name' => $activity->name,
            'description' => $activity->description,
            'point_cost' => $activity->point_cost,
            'color' => $activity->color,
            'needs_timer' => $activity->needs_timer,
            'duration_minutes' => $activity->duration_minutes,
            'tags' => $activity->tags->pluck('name')->toArray(),
        ]);

        $progression = $pointService->getRewardProgression($user);

        return Inertia::render('tools/goal-tracker/index', [
            'activities' => $activities,
            'rewardProgression' => $progression,
        ]);
    }
}
