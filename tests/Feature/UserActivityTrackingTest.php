<?php

use Domain\Admin\Middleware\TrackUserActivity;
use Domain\Admin\Models\UserActivityLog;
use Domain\User\Models\User;
use Illuminate\Http\Request;
use Illuminate\Session\ArraySessionHandler;
use Illuminate\Session\Store;
use Symfony\Component\HttpFoundation\Response;

function invokeTrackActivity(User $user, string $sessionId, string $ip): void
{
    $request = Request::create('/dashboard', 'GET', server: ['REMOTE_ADDR' => $ip]);
    $request->setUserResolver(fn () => $user);

    $session = new Store('testing', new ArraySessionHandler(60), $sessionId);
    $request->setLaravelSession($session);

    (new TrackUserActivity)->handle($request, fn () => new Response);
}

test('middleware records a new activity log on first authenticated request', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->get('/dashboard')->assertOk();

    $log = UserActivityLog::query()->where('user_id', $user->id)->first();

    expect($log)->not->toBeNull();
    expect($log->request_count)->toBe(1);
    expect($log->ip_address)->not->toBeNull();
    expect($log->session_id)->not->toBeEmpty();
    expect($log->login_at)->not->toBeNull();
    expect($log->last_request_at)->not->toBeNull();
});

test('middleware increments request count for the same session', function () {
    $user = User::factory()->create();
    $sessionId = str_repeat('a', 40);

    invokeTrackActivity($user, $sessionId, '10.0.0.1');
    invokeTrackActivity($user, $sessionId, '10.0.0.1');
    invokeTrackActivity($user, $sessionId, '10.0.0.1');

    $logs = UserActivityLog::query()->where('user_id', $user->id)->get();

    expect($logs)->toHaveCount(1);
    expect($logs->first()->request_count)->toBe(3);
});

test('middleware creates separate rows for different sessions of the same user', function () {
    $user = User::factory()->create();

    invokeTrackActivity($user, str_repeat('a', 40), '10.0.0.1');
    invokeTrackActivity($user, str_repeat('b', 40), '10.0.0.2');

    expect(UserActivityLog::query()->where('user_id', $user->id)->count())->toBe(2);
});

test('middleware does not record logs for guests', function () {
    $this->get('/')->assertOk();

    expect(UserActivityLog::query()->count())->toBe(0);
});

test('admin panel exposes activity sessions for each user', function () {
    $admin = User::factory()->create(['is_super_admin' => true]);
    $other = User::factory()->create();

    UserActivityLog::query()->create([
        'user_id' => $other->id,
        'session_id' => 'sess-abc',
        'ip_address' => '10.0.0.5',
        'user_agent' => 'TestAgent/1.0',
        'login_at' => now()->subHour(),
        'request_count' => 42,
        'last_request_at' => now()->subMinutes(5),
    ]);

    $this->actingAs($admin)
        ->get('/admin')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/index')
            ->has('users')
            ->where('users', function ($users) use ($other) {
                $target = collect($users)->firstWhere('id', $other->id);

                return $target['activity_summary']['session_count'] === 1
                    && $target['activity_summary']['total_requests'] === 42
                    && $target['sessions'][0]['ip_address'] === '10.0.0.5'
                    && $target['sessions'][0]['request_count'] === 42;
            })
        );
});
