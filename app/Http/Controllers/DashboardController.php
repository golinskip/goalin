<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use App\Services\PointService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
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

        $todayPoints = (int) $user->activityLogs()
            ->whereDate('completed_at', today())
            ->sum('points_earned');

        $todayActivities = (int) $user->activityLogs()
            ->whereDate('completed_at', today())
            ->sum('quantity');

        $progression = $pointService->getRewardProgression($user);

        return Inertia::render('dashboard', [
            'activities' => $activities,
            'todayPoints' => $todayPoints,
            'todayActivities' => $todayActivities,
            'totalPoints' => $progression['totalEarned'],
            'totalActivities' => (int) $user->activityLogs()->sum('quantity'),
            'rewardProgression' => $progression,
        ]);
    }
}
