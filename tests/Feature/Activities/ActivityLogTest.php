<?php

use Domain\GoalTracker\Models\Activity;
use Domain\GoalTracker\Models\ActivityLog;
use Domain\User\Models\User;

test('guests cannot log activities', function () {
    $this->post(route('activity-logs.store'))->assertRedirect(route('login'));
});

test('user can log a today activity', function () {
    $user = User::factory()->create();
    $activity = Activity::factory()->create(['user_id' => $user->id, 'point_cost' => 10]);

    $this->actingAs($user)
        ->post(route('activity-logs.store'), [
            'activity_id' => $activity->id,
            'completed_at' => today()->format('Y-m-d'),
            'quantity' => 1,
            'used_timer' => false,
        ])
        ->assertRedirect(route('dashboard'));

    $log = $user->activityLogs()->first();
    expect($log)->not->toBeNull();
    expect($log->activity_id)->toBe($activity->id);
    expect($log->quantity)->toBe(1);
    expect($log->points_earned)->toBe(10);
    expect($log->used_timer)->toBeFalse();
});

test('user can log multiple quantities', function () {
    $user = User::factory()->create();
    $activity = Activity::factory()->create(['user_id' => $user->id, 'point_cost' => 5]);

    $this->actingAs($user)
        ->post(route('activity-logs.store'), [
            'activity_id' => $activity->id,
            'completed_at' => today()->format('Y-m-d'),
            'quantity' => 3,
            'used_timer' => false,
        ]);

    $log = $user->activityLogs()->first();
    expect($log->quantity)->toBe(3);
    expect($log->points_earned)->toBe(15);
});

test('user can log a postponed activity', function () {
    $user = User::factory()->create();
    $activity = Activity::factory()->create(['user_id' => $user->id, 'point_cost' => 8]);
    $pastDate = today()->subDays(3)->format('Y-m-d');

    $this->actingAs($user)
        ->post(route('activity-logs.store'), [
            'activity_id' => $activity->id,
            'completed_at' => $pastDate,
            'quantity' => 2,
            'used_timer' => false,
        ]);

    $log = $user->activityLogs()->first();
    expect($log->completed_at->format('Y-m-d'))->toBe($pastDate);
    expect($log->points_earned)->toBe(16);
});

test('cannot log activity with future date', function () {
    $user = User::factory()->create();
    $activity = Activity::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)
        ->post(route('activity-logs.store'), [
            'activity_id' => $activity->id,
            'completed_at' => today()->addDay()->format('Y-m-d'),
            'quantity' => 1,
        ])
        ->assertSessionHasErrors('completed_at');
});

test('user cannot log another users activity', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $activity = Activity::factory()->create(['user_id' => $other->id]);

    $this->actingAs($user)
        ->post(route('activity-logs.store'), [
            'activity_id' => $activity->id,
            'completed_at' => today()->format('Y-m-d'),
            'quantity' => 1,
        ])
        ->assertNotFound();
});

test('user can log a timer activity', function () {
    $user = User::factory()->create();
    $activity = Activity::factory()->create([
        'user_id' => $user->id,
        'point_cost' => 20,
        'needs_timer' => true,
        'duration_minutes' => 30,
    ]);

    $this->actingAs($user)
        ->post(route('activity-logs.store'), [
            'activity_id' => $activity->id,
            'completed_at' => today()->format('Y-m-d'),
            'quantity' => 1,
            'used_timer' => true,
        ]);

    $log = $user->activityLogs()->first();
    expect($log->used_timer)->toBeTrue();
    expect($log->points_earned)->toBe(20);
});

test('user can view timer page for their timer activity', function () {
    $user = User::factory()->create();
    $activity = Activity::factory()->create([
        'user_id' => $user->id,
        'needs_timer' => true,
        'duration_minutes' => 30,
    ]);

    $this->actingAs($user)
        ->get(route('activities.timer', $activity))
        ->assertOk();
});

test('user cannot view timer page for non-timer activity', function () {
    $user = User::factory()->create();
    $activity = Activity::factory()->create([
        'user_id' => $user->id,
        'needs_timer' => false,
    ]);

    $this->actingAs($user)
        ->get(route('activities.timer', $activity))
        ->assertForbidden();
});

test('user cannot view timer page for another users activity', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $activity = Activity::factory()->create([
        'user_id' => $other->id,
        'needs_timer' => true,
        'duration_minutes' => 30,
    ]);

    $this->actingAs($user)
        ->get(route('activities.timer', $activity))
        ->assertForbidden();
});

test('dashboard shows activity stats', function () {
    $user = User::factory()->create();
    $activity = Activity::factory()->create(['user_id' => $user->id, 'point_cost' => 10]);

    ActivityLog::factory()->create([
        'user_id' => $user->id,
        'activity_id' => $activity->id,
        'completed_at' => today(),
        'quantity' => 2,
        'points_earned' => 20,
    ]);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->has('activities')
            ->has('rewardProgression')
        );
});

test('user can log activity with a comment', function () {
    $user = User::factory()->create();
    $activity = Activity::factory()->create(['user_id' => $user->id, 'point_cost' => 10]);

    $this->actingAs($user)
        ->post(route('activity-logs.store'), [
            'activity_id' => $activity->id,
            'completed_at' => today()->format('Y-m-d'),
            'quantity' => 1,
            'comment' => 'Felt great today!',
        ])
        ->assertRedirect(route('dashboard'));

    $log = $user->activityLogs()->first();
    expect($log->comment)->toBe('Felt great today!');
});

test('activity log comment is optional', function () {
    $user = User::factory()->create();
    $activity = Activity::factory()->create(['user_id' => $user->id, 'point_cost' => 10]);

    $this->actingAs($user)
        ->post(route('activity-logs.store'), [
            'activity_id' => $activity->id,
            'completed_at' => today()->format('Y-m-d'),
            'quantity' => 1,
        ])
        ->assertRedirect(route('dashboard'));

    $log = $user->activityLogs()->first();
    expect($log->comment)->toBeNull();
});

test('activity log requires valid data', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('activity-logs.store'), [
            'activity_id' => 999,
            'completed_at' => '',
            'quantity' => 0,
        ])
        ->assertSessionHasErrors(['activity_id', 'completed_at', 'quantity']);
});
