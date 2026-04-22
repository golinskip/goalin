<?php

namespace Domain\Tools\GoalTracker\Controllers;

use App\Http\Controllers\Controller;
use Domain\ExternalServices\Enums\ServiceType;
use Domain\ExternalServices\Services\GoogleCalendarService;
use Domain\ExternalServices\Services\TodoistService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request, TodoistService $todoist, GoogleCalendarService $googleCalendar): Response
    {
        $user = $request->user();

        $todoistConnected = $user->serviceConnections()
            ->where('service', ServiceType::Todoist->value)
            ->exists();

        $googleConnected = $user->serviceConnections()
            ->where('service', ServiceType::GoogleCalendar->value)
            ->exists();

        return Inertia::render('dashboard', [
            'integrations' => [
                'todoist' => [
                    'connected' => $todoistConnected,
                    'tasks' => Inertia::defer(fn () => $todoistConnected
                        ? $todoist->upcomingTasks($user)
                        : []),
                ],
                'googleCalendar' => [
                    'connected' => $googleConnected,
                    'events' => Inertia::defer(fn () => $googleConnected
                        ? $googleCalendar->upcomingEvents($user)
                        : []),
                ],
            ],
        ]);
    }
}
