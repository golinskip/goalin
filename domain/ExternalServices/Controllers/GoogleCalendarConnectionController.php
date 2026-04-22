<?php

namespace Domain\ExternalServices\Controllers;

use App\Http\Controllers\Controller;
use Domain\ExternalServices\Enums\ServiceType;
use Domain\ExternalServices\Services\GoogleCalendarService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class GoogleCalendarConnectionController extends Controller
{
    public function redirect(Request $request, GoogleCalendarService $service): RedirectResponse
    {
        if (! $service->isConfigured()) {
            return to_route('external-services.edit')
                ->withErrors(['google_calendar' => 'Google Calendar integration is not configured on the server.']);
        }

        $state = Str::random(40);
        $request->session()->put('google_calendar_oauth_state', $state);

        return redirect()->away($service->authorizationUrl($state));
    }

    public function callback(Request $request, GoogleCalendarService $service): RedirectResponse
    {
        $expectedState = $request->session()->pull('google_calendar_oauth_state');

        if ($request->filled('error') || $request->string('state')->toString() !== $expectedState) {
            return to_route('external-services.edit')
                ->withErrors(['google_calendar' => 'Google Calendar authorization was cancelled or invalid.']);
        }

        $code = $request->string('code')->toString();

        if ($code === '') {
            return to_route('external-services.edit')
                ->withErrors(['google_calendar' => 'Missing authorization code from Google.']);
        }

        try {
            $tokens = $service->exchangeCode($code);
        } catch (\Throwable) {
            return to_route('external-services.edit')
                ->withErrors(['google_calendar' => 'Failed to complete Google Calendar connection.']);
        }

        $user = $request->user();

        $existing = $user->serviceConnection(ServiceType::GoogleCalendar);

        $user->serviceConnections()->updateOrCreate(
            ['service' => ServiceType::GoogleCalendar->value],
            [
                'access_token' => $tokens['access_token'],
                'refresh_token' => $tokens['refresh_token'] ?? $existing?->refresh_token,
                'expires_at' => Carbon::now()->addSeconds($tokens['expires_in']),
            ],
        );

        Cache::forget("google_calendar:events:user:{$user->id}");

        return to_route('external-services.edit');
    }

    public function destroy(Request $request): RedirectResponse
    {
        $user = $request->user();

        $user->serviceConnections()
            ->where('service', ServiceType::GoogleCalendar->value)
            ->delete();

        Cache::forget("google_calendar:events:user:{$user->id}");

        return to_route('external-services.edit');
    }
}
