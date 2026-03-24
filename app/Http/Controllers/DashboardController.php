<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
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

        $todayPoints = $user->activityLogs()
            ->whereDate('completed_at', today())
            ->sum('points_earned');

        $totalPoints = $user->activityLogs()->sum('points_earned');

        $todayActivities = $user->activityLogs()
            ->whereDate('completed_at', today())
            ->sum('quantity');

        $totalActivities = $user->activityLogs()->sum('quantity');

        return Inertia::render('dashboard', [
            'activities' => $activities,
            'todayPoints' => (int) $todayPoints,
            'totalPoints' => (int) $totalPoints,
            'todayActivities' => (int) $todayActivities,
            'totalActivities' => (int) $totalActivities,
        ]);
    }
}
