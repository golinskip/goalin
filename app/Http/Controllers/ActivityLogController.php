<?php

namespace App\Http\Controllers;

use App\Http\Requests\ActivityLog\StoreActivityLogRequest;
use App\Models\Activity;
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

        return to_route('dashboard');
    }

    public function timer(Request $request, Activity $activity): Response
    {
        $user = $request->user();

        if ($activity->user_id !== $user->id || ! $activity->needs_timer) {
            abort(403);
        }

        return Inertia::render('activities/timer', [
            'activity' => [
                'id' => $activity->id,
                'name' => $activity->name,
                'description' => $activity->description,
                'color' => $activity->color,
                'duration_minutes' => $activity->duration_minutes,
                'point_cost' => $activity->point_cost,
            ],
        ]);
    }
}
