<?php

use Domain\GoalTracker\Models\Activity;
use Domain\GoalTracker\Models\ActivityLog;
use Domain\User\Models\User;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('statistics'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the statistics page', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('statistics'));
    $response->assertOk();
});

test('statistics page returns calendar data for the requested month', function () {
    $user = User::factory()->create();
    $activity = Activity::factory()->for($user)->create();

    ActivityLog::factory()->for($user)->create([
        'activity_id' => $activity->id,
        'completed_at' => '2026-03-10',
        'quantity' => 3,
        'points_earned' => 30,
    ]);

    $this->actingAs($user);

    $response = $this->get(route('statistics', ['month' => '2026-03']));
    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('statistics')
        ->has('calendarDays.2026-03-10')
        ->where('calendarDays.2026-03-10.activities', 3)
        ->where('calendarDays.2026-03-10.points', 30)
        ->where('month', '2026-03')
    );
});

test('statistics page returns day logs when a date is selected', function () {
    $user = User::factory()->create();
    $activity = Activity::factory()->for($user)->create(['name' => 'Running']);

    ActivityLog::factory()->for($user)->create([
        'activity_id' => $activity->id,
        'completed_at' => '2026-03-15',
        'quantity' => 1,
        'points_earned' => 10,
    ]);

    $this->actingAs($user);

    $response = $this->get(route('statistics', ['month' => '2026-03', 'date' => '2026-03-15']));
    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('statistics')
        ->where('selectedDate', '2026-03-15')
        ->has('dayLogs', 1)
        ->where('dayLogs.0.activity_name', 'Running')
        ->where('dayLogs.0.points_earned', 10)
    );
});

test('statistics page returns weekday stats', function () {
    $user = User::factory()->create();
    $activity = Activity::factory()->for($user)->create();

    ActivityLog::factory()->for($user)->create([
        'activity_id' => $activity->id,
        'completed_at' => '2026-03-09', // Monday
        'quantity' => 2,
        'points_earned' => 20,
    ]);

    $this->actingAs($user);

    $response = $this->get(route('statistics'));
    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('statistics')
        ->has('weekdayStats')
        ->where('totalActivities', 2)
        ->where('totalPoints', 20)
    );
});

test('statistics page returns streak data', function () {
    $user = User::factory()->create();
    $activity = Activity::factory()->for($user)->create();

    // Create a 3-day streak ending today
    foreach (range(0, 2) as $daysAgo) {
        ActivityLog::factory()->for($user)->create([
            'activity_id' => $activity->id,
            'completed_at' => now()->subDays($daysAgo)->format('Y-m-d'),
            'quantity' => 1,
            'points_earned' => 10,
        ]);
    }

    $this->actingAs($user);

    $response = $this->get(route('statistics'));
    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('statistics')
        ->where('currentStreak', 3)
        ->where('longestStreak', 3)
    );
});
