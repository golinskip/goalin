<?php

namespace Domain\Tools\GoalTracker\Controllers;

use App\Http\Controllers\Controller;
use Domain\Tools\GoalTracker\Models\Activity;
use Domain\Tools\GoalTracker\Requests\StoreActivityLogRequest;
use Domain\Tools\MusicPlayer\Models\MusicFile;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ActivityLogController extends Controller
{
    public function store(StoreActivityLogRequest $request): RedirectResponse
    {
        $user = $request->user();
        $data = $request->validated();

        $activity = $user->activities()->findOrFail($data['activity_id']);

        $user->activityLogs()->create([
            'activity_id' => $activity->id,
            'completed_at' => $data['completed_at'],
            'quantity' => $data['quantity'],
            'points_earned' => $activity->point_cost * $data['quantity'],
            'used_timer' => $data['used_timer'] ?? false,
            'comment' => $data['comment'] ?? null,
        ]);

        return to_route('goal-tracker.index');
    }

    public function timer(Request $request, Activity $activity): Response
    {
        $user = $request->user();

        if ($activity->user_id !== $user->id || ! $activity->needs_timer) {
            abort(403);
        }

        $timerMusic = $user->musicFiles()
            ->whereHas('tags', fn ($q) => $q->where('name', 'timer'))
            ->get()
            ->map(fn (MusicFile $file) => [
                'id' => $file->id,
                'title' => $file->title,
                'artist' => $file->artist,
                'duration_seconds' => $file->duration_seconds,
            ]);

        return Inertia::render('tools/goal-tracker/activities/timer', [
            'activity' => [
                'id' => $activity->id,
                'name' => $activity->name,
                'description' => $activity->description,
                'color' => $activity->color,
                'duration_minutes' => $activity->duration_minutes,
                'point_cost' => $activity->point_cost,
            ],
            'timerMusic' => $timerMusic,
        ]);
    }
}
