<?php

use Carbon\Carbon;
use Domain\Alerts\AlertManager;
use Domain\Tools\DailyRoutine\Alerts\UnmarkedRoutineTasksAlert;
use Domain\Tools\DailyRoutine\Enums\RoutineTaskStatus;
use Domain\Tools\DailyRoutine\Models\RoutineTask;
use Domain\Tools\Diary\Alerts\EmptyDiaryDaysAlert;
use Domain\Tools\Flashcards\Alerts\NoReviewTodayAlert;
use Domain\Tools\GoalTracker\Alerts\NoTasksTodayAlert;
use Domain\Tools\LongTermGoals\Alerts\NoGoalsThisPeriodAlert;
use Domain\Tools\RssFeeds\Alerts\UncheckedNewsTodayAlert;
use Domain\User\Models\User;

test('no tasks today alert triggers when no activity logs today', function () {
    $user = User::factory()->create();
    $alert = new NoTasksTodayAlert;

    expect($alert->check($user))->toBeTrue();
});

test('no tasks today alert does not trigger when activity log exists today', function () {
    $user = User::factory()->create();
    $activity = $user->activities()->create([
        'name' => 'Test',
        'point_cost' => 1,
        'color' => '#000000',
        'sort_order' => 0,
    ]);
    $user->activityLogs()->create([
        'activity_id' => $activity->id,
        'completed_at' => today(),
        'quantity' => 1,
        'points_earned' => 1,
    ]);
    $alert = new NoTasksTodayAlert;

    expect($alert->check($user))->toBeFalse();
});

test('empty diary days alert triggers when days are missing', function () {
    $user = User::factory()->create();
    $alert = new EmptyDiaryDaysAlert;

    expect($alert->check($user))->toBeTrue();
    expect($alert->message())->toContain('empty diary');
});

test('no review today alert does not trigger when user has no memo sets', function () {
    $user = User::factory()->create();
    $alert = new NoReviewTodayAlert;

    expect($alert->check($user))->toBeFalse();
});

test('no review today alert triggers when user has memo sets but no reviews today', function () {
    $user = User::factory()->create();
    $set = $user->memoSets()->create(['name' => 'Test', 'color' => '#000000']);
    $set->cards()->create(['front' => 'Q', 'back' => 'A']);
    $alert = new NoReviewTodayAlert;

    expect($alert->check($user))->toBeTrue();
});

test('no review today alert does not trigger when card was reviewed today', function () {
    $user = User::factory()->create();
    $set = $user->memoSets()->create(['name' => 'Test', 'color' => '#000000']);
    $set->cards()->create(['front' => 'Q', 'back' => 'A', 'last_reviewed_at' => now()]);
    $alert = new NoReviewTodayAlert;

    expect($alert->check($user))->toBeFalse();
});

test('no goals this period alert triggers when no goals exist for current month', function () {
    $user = User::factory()->create();
    $alert = new NoGoalsThisPeriodAlert;

    expect($alert->check($user))->toBeTrue();
});

test('unchecked news alert does not trigger when user has no feeds', function () {
    $user = User::factory()->create();
    $alert = new UncheckedNewsTodayAlert;

    expect($alert->check($user))->toBeFalse();
});

test('unchecked news alert triggers when user has feeds but no reads today', function () {
    $user = User::factory()->create();
    $feed = $user->rssFeeds()->create([
        'name' => 'Test',
        'feed_url' => 'https://example.com/feed.xml',
        'color' => '#000000',
    ]);
    $feed->articles()->create([
        'title' => 'Article',
        'link' => 'https://example.com/1',
        'guid' => 'guid-1',
        'published_at' => now(),
    ]);
    $alert = new UncheckedNewsTodayAlert;

    expect($alert->check($user))->toBeTrue();
});

test('unchecked news alert does not trigger when article was read today', function () {
    $user = User::factory()->create();
    $feed = $user->rssFeeds()->create([
        'name' => 'Test',
        'feed_url' => 'https://example.com/feed.xml',
        'color' => '#000000',
    ]);
    $feed->articles()->create([
        'title' => 'Article',
        'link' => 'https://example.com/1',
        'guid' => 'guid-1',
        'published_at' => now(),
        'read_at' => now(),
    ]);
    $alert = new UncheckedNewsTodayAlert;

    expect($alert->check($user))->toBeFalse();
});

test('unmarked routine tasks alert does not trigger when no tasks scheduled today', function () {
    $user = User::factory()->create();
    $alert = new UnmarkedRoutineTasksAlert;

    expect($alert->check($user))->toBeFalse();
});

test('unmarked routine tasks alert triggers when scheduled tasks have no log today', function () {
    $user = User::factory()->create();
    RoutineTask::factory()->for($user)->create([
        'weekdays' => [(int) Carbon::today()->dayOfWeekIso],
        'starts_on' => Carbon::today()->subWeek(),
        'ends_on' => Carbon::today()->addWeek(),
    ]);

    $alert = new UnmarkedRoutineTasksAlert;

    expect($alert->check($user))->toBeTrue();
    expect($alert->message())->toContain('1 unmarked routine task today');
});

test('unmarked routine tasks alert ignores tasks scheduled on other weekdays', function () {
    $user = User::factory()->create();
    $otherDay = ((int) Carbon::today()->dayOfWeekIso % 7) + 1;
    RoutineTask::factory()->for($user)->create([
        'weekdays' => [$otherDay],
        'starts_on' => Carbon::today()->subWeek(),
        'ends_on' => Carbon::today()->addWeek(),
    ]);

    $alert = new UnmarkedRoutineTasksAlert;

    expect($alert->check($user))->toBeFalse();
});

test('unmarked routine tasks alert does not trigger when all scheduled tasks are logged today', function () {
    $user = User::factory()->create();
    $task = RoutineTask::factory()->for($user)->create([
        'weekdays' => [(int) Carbon::today()->dayOfWeekIso],
        'starts_on' => Carbon::today()->subWeek(),
        'ends_on' => Carbon::today()->addWeek(),
    ]);
    $task->logs()->create([
        'log_date' => Carbon::today(),
        'status' => RoutineTaskStatus::Done,
    ]);

    $alert = new UnmarkedRoutineTasksAlert;

    expect($alert->check($user))->toBeFalse();
});

test('alert manager returns only active alerts', function () {
    $user = User::factory()->create();
    $manager = new AlertManager(
        new NoTasksTodayAlert,
        new UncheckedNewsTodayAlert,
    );

    $alerts = $manager->getActiveAlerts($user);

    // NoTasksTodayAlert should be active (no logs), UncheckedNewsTodayAlert should not (no feeds)
    expect($alerts)->toHaveCount(1);
    expect($alerts[0]['key'])->toBe('goal-tracker.no-tasks-today');
});

test('alerts are shared globally with inertia responses', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get(route('dashboard'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->has('alerts')
    );
});
