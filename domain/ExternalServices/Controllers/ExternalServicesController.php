<?php

namespace Domain\ExternalServices\Controllers;

use App\Http\Controllers\Controller;
use Domain\ExternalServices\Enums\ServiceType;
use Domain\ExternalServices\Services\GoogleCalendarService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ExternalServicesController extends Controller
{
    public function edit(Request $request, GoogleCalendarService $googleCalendar): Response
    {
        $user = $request->user();

        $todoist = $user->serviceConnection(ServiceType::Todoist);
        $google = $user->serviceConnection(ServiceType::GoogleCalendar);

        return Inertia::render('settings/external-services', [
            'todoist' => [
                'connected' => $todoist !== null,
                'connected_at' => $todoist?->created_at?->diffForHumans(),
            ],
            'googleCalendar' => [
                'connected' => $google !== null,
                'connected_at' => $google?->created_at?->diffForHumans(),
                'configured' => $googleCalendar->isConfigured(),
            ],
        ]);
    }
}
