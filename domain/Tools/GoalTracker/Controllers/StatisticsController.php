<?php

namespace Domain\Tools\GoalTracker\Controllers;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Domain\Tools\GoalTracker\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class StatisticsController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = $request->user();
        $month = $request->input('month', now()->format('Y-m'));
        $selectedDate = $request->input('date');

        [$year, $monthNum] = explode('-', $month);
        $startOfMonth = Carbon::createFromDate((int) $year, (int) $monthNum, 1)->startOfMonth();
        $endOfMonth = $startOfMonth->copy()->endOfMonth();

        $calendarDays = $user->activityLogs()
            ->whereBetween('completed_at', [$startOfMonth, $endOfMonth])
            ->select('completed_at', DB::raw('SUM(quantity) as total_activities'), DB::raw('SUM(points_earned) as total_points'))
            ->groupBy('completed_at')
            ->get()
            ->keyBy(fn (ActivityLog $log) => $log->completed_at->format('Y-m-d'))
            ->map(fn (ActivityLog $log) => [
                'activities' => (int) $log->total_activities,
                'points' => (int) $log->total_points,
            ])
            ->toArray();

        $weekdayStats = $user->activityLogs()
            ->select('completed_at', DB::raw('SUM(quantity) as total_activities'), DB::raw('SUM(points_earned) as total_points'))
            ->groupBy('completed_at')
            ->get()
            ->groupBy(fn ($row) => Carbon::parse($row->completed_at)->dayOfWeekIso)
            ->map(fn ($rows, $weekday) => [
                'weekday' => (int) $weekday,
                'activities' => (int) $rows->sum('total_activities'),
                'points' => (int) $rows->sum('total_points'),
            ])
            ->sortKeys()
            ->values()
            ->toArray();

        $totalDays = $user->activityLogs()
            ->select('completed_at')
            ->distinct()
            ->count('completed_at');

        $currentStreak = $this->calculateCurrentStreak($user);
        $longestStreak = $this->calculateLongestStreak($user);

        $totalActivities = (int) $user->activityLogs()->sum('quantity');
        $totalPoints = (int) $user->activityLogs()->sum('points_earned');

        $dayLogs = [];
        if ($selectedDate) {
            $dayLogs = $user->activityLogs()
                ->with('activity')
                ->whereDate('completed_at', $selectedDate)
                ->orderByDesc('created_at')
                ->get()
                ->map(fn (ActivityLog $log) => [
                    'id' => $log->id,
                    'activity_name' => $log->activity->name,
                    'activity_color' => $log->activity->color,
                    'quantity' => $log->quantity,
                    'points_earned' => $log->points_earned,
                    'used_timer' => $log->used_timer,
                    'comment' => $log->comment,
                    'created_at' => $log->created_at->format('H:i'),
                ])
                ->toArray();
        }

        return Inertia::render('tools/goal-tracker/statistics', [
            'month' => $month,
            'selectedDate' => $selectedDate,
            'calendarDays' => $calendarDays,
            'weekdayStats' => $weekdayStats,
            'totalDays' => $totalDays,
            'currentStreak' => $currentStreak,
            'longestStreak' => $longestStreak,
            'totalActivities' => $totalActivities,
            'totalPoints' => $totalPoints,
            'dayLogs' => $dayLogs,
        ]);
    }

    private function calculateCurrentStreak($user): int
    {
        $dates = $user->activityLogs()
            ->select('completed_at')
            ->distinct()
            ->orderByDesc('completed_at')
            ->pluck('completed_at')
            ->map(fn ($date) => Carbon::parse($date)->format('Y-m-d'));

        if ($dates->isEmpty()) {
            return 0;
        }

        $streak = 0;
        $expectedDate = today();

        if ($dates->first() !== $expectedDate->format('Y-m-d')) {
            $expectedDate = today()->subDay();
            if ($dates->first() !== $expectedDate->format('Y-m-d')) {
                return 0;
            }
        }

        foreach ($dates as $date) {
            if ($date === $expectedDate->format('Y-m-d')) {
                $streak++;
                $expectedDate = $expectedDate->subDay();
            } else {
                break;
            }
        }

        return $streak;
    }

    private function calculateLongestStreak($user): int
    {
        $dates = $user->activityLogs()
            ->select('completed_at')
            ->distinct()
            ->orderBy('completed_at')
            ->pluck('completed_at')
            ->map(fn ($date) => Carbon::parse($date)->format('Y-m-d'));

        if ($dates->isEmpty()) {
            return 0;
        }

        $longest = 1;
        $current = 1;

        for ($i = 1; $i < $dates->count(); $i++) {
            $prev = Carbon::parse($dates[$i - 1]);
            $curr = Carbon::parse($dates[$i]);

            if ((int) $prev->diffInDays($curr) === 1) {
                $current++;
                $longest = max($longest, $current);
            } else {
                $current = 1;
            }
        }

        return $longest;
    }
}
