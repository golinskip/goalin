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

        $twoWeeksAgo = now()->subDays(13)->startOfDay();
        $recentLogs = $user->activityLogs()
            ->where('completed_at', '>=', $twoWeeksAgo)
            ->selectRaw('DATE(completed_at) as date, COUNT(*) as count, SUM(points_earned) as points')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $summary = [
            'totalActivities' => $recentLogs->sum('count'),
            'totalPoints' => $recentLogs->sum('points'),
            'activeDays' => $recentLogs->count(),
            'dailyBreakdown' => collect(range(0, 13))->map(function (int $daysAgo) use ($recentLogs) {
                $date = now()->subDays(13 - $daysAgo)->format('Y-m-d');
                $day = $recentLogs->firstWhere('date', $date);

                return [
                    'date' => $date,
                    'count' => $day ? (int) $day->count : 0,
                    'points' => $day ? (int) $day->points : 0,
                ];
            })->all(),
        ];

        return Inertia::render('tools/goal-tracker/index', [
            'activities' => $activities,
            'rewardProgression' => $progression,
            'summary' => $summary,
        ]);
    }
}
