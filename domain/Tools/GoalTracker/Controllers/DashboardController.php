<?php

namespace Domain\Tools\GoalTracker\Controllers;

use App\Http\Controllers\Controller;
use Domain\ExternalServices\Enums\ServiceType;
use Domain\ExternalServices\Services\GoogleCalendarService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request, GoogleCalendarService $googleCalendar): Response
    {
        $user = $request->user();

        $googleConnected = $user->serviceConnections()
            ->where('service', ServiceType::GoogleCalendar->value)
            ->exists();

        return Inertia::render('dashboard', [
            'integrations' => [
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
