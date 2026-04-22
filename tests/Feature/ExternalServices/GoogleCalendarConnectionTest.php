<?php

use Domain\ExternalServices\Enums\ServiceType;
use Domain\ExternalServices\Models\ServiceConnection;
use Domain\User\Models\User;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    config([
        'services.google.client_id' => 'test-client-id',
        'services.google.client_secret' => 'test-client-secret',
        'services.google.redirect' => 'https://example.com/callback',
    ]);
});

test('user is redirected to Google authorization url', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)
        ->get(route('external-services.google-calendar.redirect'));

    $response->assertRedirect();
    expect($response->headers->get('Location'))->toContain('accounts.google.com/o/oauth2');
});

test('redirect fails gracefully when google is not configured', function () {
    config([
        'services.google.client_id' => null,
    ]);

    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('external-services.google-calendar.redirect'))
        ->assertRedirect(route('external-services.edit'))
        ->assertSessionHasErrors('google_calendar');
});

test('callback stores tokens when code is exchanged successfully', function () {
    Http::fake([
        'oauth2.googleapis.com/token' => Http::response([
            'access_token' => 'gcal-access-token',
            'refresh_token' => 'gcal-refresh-token',
            'expires_in' => 3600,
        ], 200),
    ]);

    $user = User::factory()->create();

    $this->actingAs($user)
        ->withSession(['google_calendar_oauth_state' => 'secret-state'])
        ->get(route('external-services.google-calendar.callback', [
            'code' => 'auth-code',
            'state' => 'secret-state',
        ]))
        ->assertRedirect(route('external-services.edit'));

    $connection = ServiceConnection::query()
        ->where('user_id', $user->id)
        ->where('service', ServiceType::GoogleCalendar->value)
        ->first();

    expect($connection)->not->toBeNull()
        ->and($connection->access_token)->toBe('gcal-access-token')
        ->and($connection->refresh_token)->toBe('gcal-refresh-token')
        ->and($connection->expires_at)->not->toBeNull();
});

test('callback rejects mismatched state', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->withSession(['google_calendar_oauth_state' => 'expected-state'])
        ->get(route('external-services.google-calendar.callback', [
            'code' => 'auth-code',
            'state' => 'wrong-state',
        ]))
        ->assertRedirect(route('external-services.edit'))
        ->assertSessionHasErrors('google_calendar');

    expect(ServiceConnection::query()->count())->toBe(0);
});

test('user can disconnect Google Calendar', function () {
    $user = User::factory()->create();

    $user->serviceConnections()->create([
        'service' => ServiceType::GoogleCalendar->value,
        'access_token' => 'some-token',
    ]);

    $this->actingAs($user)
        ->delete(route('external-services.google-calendar.destroy'))
        ->assertRedirect(route('external-services.edit'));

    expect(ServiceConnection::query()->count())->toBe(0);
});
