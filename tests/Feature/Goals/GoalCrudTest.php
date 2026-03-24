<?php

use App\Models\Activity;
use App\Models\Goal;
use App\Models\User;

test('guests cannot access goals', function () {
    $this->get(route('goals.index'))->assertRedirect(route('login'));
    $this->get(route('goals.create'))->assertRedirect(route('login'));
    $this->post(route('goals.store'))->assertRedirect(route('login'));
});

test('user can view goals index', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('goals.index'))
        ->assertOk();
});

test('user can view create goal form', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('goals.create'))
        ->assertOk();
});

test('user can create a goal', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('goals.store'), [
            'name' => 'Increasing focus',
            'description' => 'Improve my ability to concentrate',
            'color' => '#ff5733',
        ])
        ->assertRedirect(route('goals.index'));

    $goal = $user->goals()->first();
    expect($goal)->not->toBeNull();
    expect($goal->name)->toBe('Increasing focus');
    expect($goal->description)->toBe('Improve my ability to concentrate');
    expect($goal->color)->toBe('#ff5733');
});

test('goal description is optional', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('goals.store'), [
            'name' => 'Better work',
            'color' => '#aabbcc',
        ])
        ->assertRedirect(route('goals.index'));

    $goal = $user->goals()->first();
    expect($goal->description)->toBeNull();
});

test('goal creation requires valid data', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('goals.store'), [
            'name' => '',
            'color' => 'invalid',
        ])
        ->assertSessionHasErrors(['name', 'color']);
});

test('user can edit their own goal', function () {
    $user = User::factory()->create();
    $goal = Goal::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)
        ->get(route('goals.edit', $goal))
        ->assertOk();
});

test('user cannot edit another users goal', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $goal = Goal::factory()->create(['user_id' => $other->id]);

    $this->actingAs($user)
        ->get(route('goals.edit', $goal))
        ->assertForbidden();
});

test('user can update their own goal', function () {
    $user = User::factory()->create();
    $goal = Goal::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)
        ->put(route('goals.update', $goal), [
            'name' => 'Updated Goal',
            'description' => 'New description',
            'color' => '#0000ff',
        ])
        ->assertRedirect(route('goals.index'));

    $goal->refresh();
    expect($goal->name)->toBe('Updated Goal');
    expect($goal->description)->toBe('New description');
    expect($goal->color)->toBe('#0000ff');
});

test('user cannot update another users goal', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $goal = Goal::factory()->create(['user_id' => $other->id]);

    $this->actingAs($user)
        ->put(route('goals.update', $goal), [
            'name' => 'Hacked',
            'color' => '#000000',
        ])
        ->assertForbidden();
});

test('user can delete their own goal', function () {
    $user = User::factory()->create();
    $goal = Goal::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)
        ->delete(route('goals.destroy', $goal))
        ->assertRedirect(route('goals.index'));

    expect($goal->fresh())->toBeNull();
});

test('user cannot delete another users goal', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $goal = Goal::factory()->create(['user_id' => $other->id]);

    $this->actingAs($user)
        ->delete(route('goals.destroy', $goal))
        ->assertForbidden();

    expect($goal->fresh())->not->toBeNull();
});

test('user can reorder goals', function () {
    $user = User::factory()->create();
    $goal1 = Goal::factory()->create(['user_id' => $user->id, 'sort_order' => 0]);
    $goal2 = Goal::factory()->create(['user_id' => $user->id, 'sort_order' => 1]);

    $this->actingAs($user)
        ->patch(route('goals.reorder'), [
            'order' => [
                ['id' => $goal2->id, 'sort_order' => 0],
                ['id' => $goal1->id, 'sort_order' => 1],
            ],
        ])
        ->assertRedirect(route('goals.index'));

    expect($goal1->refresh()->sort_order)->toBe(1);
    expect($goal2->refresh()->sort_order)->toBe(0);
});

test('goals index shows activity count', function () {
    $user = User::factory()->create();
    $goal = Goal::factory()->create(['user_id' => $user->id]);
    $activity1 = Activity::factory()->create(['user_id' => $user->id]);
    $activity2 = Activity::factory()->create(['user_id' => $user->id]);
    $goal->activities()->attach([$activity1->id, $activity2->id]);

    $this->actingAs($user)
        ->get(route('goals.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('goals/index')
            ->has('goals', 1)
            ->where('goals.0.activities_count', 2)
        );
});

test('user can link goals to activity on create', function () {
    $user = User::factory()->create();
    $goal1 = Goal::factory()->create(['user_id' => $user->id]);
    $goal2 = Goal::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)
        ->post(route('activities.store'), [
            'name' => 'Meditation',
            'point_cost' => 10,
            'color' => '#3a9a4e',
            'needs_timer' => false,
            'tags' => [],
            'goal_ids' => [$goal1->id, $goal2->id],
        ]);

    $activity = $user->activities()->first();
    expect($activity->goals)->toHaveCount(2);
    expect($activity->goals->pluck('id')->toArray())->toContain($goal1->id, $goal2->id);
});

test('user can update activity goals', function () {
    $user = User::factory()->create();
    $goal1 = Goal::factory()->create(['user_id' => $user->id]);
    $goal2 = Goal::factory()->create(['user_id' => $user->id]);
    $activity = Activity::factory()->create(['user_id' => $user->id]);
    $activity->goals()->attach($goal1->id);

    $this->actingAs($user)
        ->put(route('activities.update', $activity), [
            'name' => $activity->name,
            'point_cost' => $activity->point_cost,
            'color' => $activity->color,
            'needs_timer' => false,
            'tags' => [],
            'goal_ids' => [$goal2->id],
        ]);

    $activity->refresh();
    expect($activity->goals)->toHaveCount(1);
    expect($activity->goals->first()->id)->toBe($goal2->id);
});

test('activity can have no goals', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('activities.store'), [
            'name' => 'No goals activity',
            'point_cost' => 5,
            'color' => '#aabbcc',
            'needs_timer' => false,
            'tags' => [],
            'goal_ids' => [],
        ]);

    $activity = $user->activities()->first();
    expect($activity->goals)->toHaveCount(0);
});
