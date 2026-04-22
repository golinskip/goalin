<?php

namespace Domain\ExternalServices\Services;

use Domain\ExternalServices\Enums\ServiceType;
use Domain\ExternalServices\Models\ServiceConnection;
use Domain\User\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class GoogleCalendarService
{
    private const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

    private const TOKEN_URL = 'https://oauth2.googleapis.com/token';

    private const EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

    private const SCOPE = 'https://www.googleapis.com/auth/calendar.events.readonly';

    public function isConfigured(): bool
    {
        return ! empty(config('services.google.client_id'))
            && ! empty(config('services.google.client_secret'))
            && ! empty(config('services.google.redirect'));
    }

    public function authorizationUrl(string $state): string
    {
        return self::AUTH_URL.'?'.http_build_query([
            'client_id' => config('services.google.client_id'),
            'redirect_uri' => config('services.google.redirect'),
            'response_type' => 'code',
            'scope' => self::SCOPE,
            'access_type' => 'offline',
            'prompt' => 'consent',
            'state' => $state,
        ]);
    }

    /**
     * @return array{access_token: string, refresh_token: string|null, expires_in: int}
     */
    public function exchangeCode(string $code): array
    {
        $response = Http::asForm()
            ->timeout(10)
            ->post(self::TOKEN_URL, [
                'code' => $code,
                'client_id' => config('services.google.client_id'),
                'client_secret' => config('services.google.client_secret'),
                'redirect_uri' => config('services.google.redirect'),
                'grant_type' => 'authorization_code',
            ]);

        if (! $response->successful()) {
            throw new RuntimeException('Failed to exchange Google authorization code.');
        }

        $data = $response->json();

        return [
            'access_token' => $data['access_token'],
            'refresh_token' => $data['refresh_token'] ?? null,
            'expires_in' => (int) ($data['expires_in'] ?? 3600),
        ];
    }

    /**
     * @return array<int, array{id: string, summary: string, location: string|null, html_link: string, start: string, end: string|null, all_day: bool}>
     */
    public function upcomingEvents(User $user, int $limit = 10): array
    {
        $connection = $user->serviceConnection(ServiceType::GoogleCalendar);

        if ($connection === null) {
            return [];
        }

        return Cache::remember(
            "google_calendar:events:user:{$user->id}",
            now()->addMinutes(5),
            fn () => $this->fetchEvents($connection, $limit),
        );
    }

    /**
     * @return array<int, array{id: string, summary: string, location: string|null, html_link: string, start: string, end: string|null, all_day: bool}>
     */
    private function fetchEvents(ServiceConnection $connection, int $limit): array
    {
        try {
            $this->ensureFreshToken($connection);

            $response = Http::withToken($connection->access_token)
                ->timeout(10)
                ->get(self::EVENTS_URL, [
                    'maxResults' => $limit,
                    'orderBy' => 'startTime',
                    'singleEvents' => 'true',
                    'timeMin' => now()->toRfc3339String(),
                ]);

            if (! $response->successful()) {
                return [];
            }

            return collect($response->json('items', []))
                ->map(function (array $event) {
                    $start = $event['start']['dateTime'] ?? $event['start']['date'] ?? null;
                    $end = $event['end']['dateTime'] ?? $event['end']['date'] ?? null;
                    $allDay = ! isset($event['start']['dateTime']);

                    if ($start === null) {
                        return null;
                    }

                    return [
                        'id' => (string) ($event['id'] ?? ''),
                        'summary' => (string) ($event['summary'] ?? '(No title)'),
                        'location' => $event['location'] ?? null,
                        'html_link' => (string) ($event['htmlLink'] ?? 'https://calendar.google.com/calendar/r'),
                        'start' => $start,
                        'end' => $end,
                        'all_day' => $allDay,
                    ];
                })
                ->filter()
                ->values()
                ->all();
        } catch (\Throwable) {
            return [];
        }
    }

    private function ensureFreshToken(ServiceConnection $connection): void
    {
        if (! $connection->isExpired() || $connection->refresh_token === null) {
            return;
        }

        $response = Http::asForm()
            ->timeout(10)
            ->post(self::TOKEN_URL, [
                'client_id' => config('services.google.client_id'),
                'client_secret' => config('services.google.client_secret'),
                'refresh_token' => $connection->refresh_token,
                'grant_type' => 'refresh_token',
            ]);

        if (! $response->successful()) {
            throw new RuntimeException('Failed to refresh Google access token.');
        }

        $data = $response->json();

        $connection->update([
            'access_token' => $data['access_token'],
            'expires_at' => Carbon::now()->addSeconds((int) ($data['expires_in'] ?? 3600)),
        ]);
    }
}
