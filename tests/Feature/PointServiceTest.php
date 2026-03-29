<?php

use Domain\Tools\GoalTracker\Models\Activity;
use Domain\Tools\GoalTracker\Models\ActivityLog;
use Domain\Tools\GoalTracker\Models\Reward;
use Domain\Tools\GoalTracker\Services\PointService;
use Domain\User\Models\User;

test('returns empty progression when no rewards', function () {
    $user = User::factory()->create();
    $service = new PointService;

    $result = $service->getRewardProgression($user);

    expect($result['totalEarned'])->toBe(0);
    expect($result['totalSpent'])->toBe(0);
    expect($result['availablePoints'])->toBe(0);
    expect($result['achievedRewards'])->toBeEmpty();
    expect($result['currentReward'])->toBeNull();
    expect($result['queuedRewards'])->toBeEmpty();
});

test('marks reward as achieved when enough points', function () {
    $user = User::factory()->create();
    $activity = Activity::factory()->create(['user_id' => $user->id, 'point_cost' => 50]);
    ActivityLog::factory()->create([
        'user_id' => $user->id,
        'activity_id' => $activity->id,
        'points_earned' => 100,
    ]);
    Reward::factory()->create([
        'user_id' => $user->id,
        'cost_in_points' => 80,
        'sort_order' => 0,
    ]);

    $service = new PointService;
    $result = $service->getRewardProgression($user);

    expect($result['totalEarned'])->toBe(100);
    expect($result['achievedRewards'])->toHaveCount(1);
    expect($result['currentReward'])->toBeNull();
    expect($result['availablePoints'])->toBe(20);
});

test('shows current reward with progress', function () {
    $user = User::factory()->create();
    $activity = Activity::factory()->create(['user_id' => $user->id, 'point_cost' => 10]);
    ActivityLog::factory()->create([
        'user_id' => $user->id,
        'activity_id' => $activity->id,
        'points_earned' => 30,
    ]);
    Reward::factory()->create([
        'user_id' => $user->id,
        'cost_in_points' => 100,
        'sort_order' => 0,
    ]);

    $service = new PointService;
    $result = $service->getRewardProgression($user);

    expect($result['achievedRewards'])->toBeEmpty();
    expect($result['currentReward'])->not->toBeNull();
    expect($result['currentReward']['pointsProgress'])->toBe(30);
    expect($result['currentReward']['percentage'])->toBe(30);
    expect($result['currentReward']['cost_in_points'])->toBe(100);
});

test('rolls over points to next reward after achieving first', function () {
    $user = User::factory()->create();
    $activity = Activity::factory()->create(['user_id' => $user->id, 'point_cost' => 10]);
    ActivityLog::factory()->create([
        'user_id' => $user->id,
        'activity_id' => $activity->id,
        'points_earned' => 150,
    ]);
    Reward::factory()->create([
        'user_id' => $user->id,
        'cost_in_points' => 100,
        'sort_order' => 0,
        'name' => 'First Reward',
    ]);
    Reward::factory()->create([
        'user_id' => $user->id,
        'cost_in_points' => 200,
        'sort_order' => 1,
        'name' => 'Second Reward',
    ]);

    $service = new PointService;
    $result = $service->getRewardProgression($user);

    expect($result['achievedRewards'])->toHaveCount(1);
    expect($result['achievedRewards'][0]['name'])->toBe('First Reward');
    expect($result['currentReward'])->not->toBeNull();
    expect($result['currentReward']['name'])->toBe('Second Reward');
    expect($result['currentReward']['pointsProgress'])->toBe(50);
    expect($result['currentReward']['percentage'])->toBe(25);
});

test('queues rewards beyond current', function () {
    $user = User::factory()->create();
    $activity = Activity::factory()->create(['user_id' => $user->id, 'point_cost' => 10]);
    ActivityLog::factory()->create([
        'user_id' => $user->id,
        'activity_id' => $activity->id,
        'points_earned' => 50,
    ]);
    Reward::factory()->create(['user_id' => $user->id, 'cost_in_points' => 100, 'sort_order' => 0]);
    Reward::factory()->create(['user_id' => $user->id, 'cost_in_points' => 200, 'sort_order' => 1]);
    Reward::factory()->create(['user_id' => $user->id, 'cost_in_points' => 300, 'sort_order' => 2]);

    $service = new PointService;
    $result = $service->getRewardProgression($user);

    expect($result['achievedRewards'])->toBeEmpty();
    expect($result['currentReward'])->not->toBeNull();
    expect($result['queuedRewards'])->toHaveCount(2);
});

test('all rewards achieved when enough points for all', function () {
    $user = User::factory()->create();
    $activity = Activity::factory()->create(['user_id' => $user->id, 'point_cost' => 10]);
    ActivityLog::factory()->create([
        'user_id' => $user->id,
        'activity_id' => $activity->id,
        'points_earned' => 1000,
    ]);
    Reward::factory()->create(['user_id' => $user->id, 'cost_in_points' => 100, 'sort_order' => 0]);
    Reward::factory()->create(['user_id' => $user->id, 'cost_in_points' => 200, 'sort_order' => 1]);

    $service = new PointService;
    $result = $service->getRewardProgression($user);

    expect($result['achievedRewards'])->toHaveCount(2);
    expect($result['currentReward'])->toBeNull();
    expect($result['queuedRewards'])->toBeEmpty();
    expect($result['totalSpent'])->toBe(300);
    expect($result['availablePoints'])->toBe(700);
});

test('dashboard includes reward progression data', function () {
    $user = User::factory()->create();
    $activity = Activity::factory()->create(['user_id' => $user->id, 'point_cost' => 10]);
    ActivityLog::factory()->create([
        'user_id' => $user->id,
        'activity_id' => $activity->id,
        'points_earned' => 50,
    ]);
    Reward::factory()->create(['user_id' => $user->id, 'cost_in_points' => 100, 'sort_order' => 0]);

    $this->actingAs($user)
        ->get(route('goal-tracker.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('tools/goal-tracker/index')
            ->has('rewardProgression')
            ->where('rewardProgression.totalEarned', 50)
            ->where('rewardProgression.currentReward.percentage', 50)
        );
});
