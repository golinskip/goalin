<?php

use Domain\GoalTracker\Models\Activity;
use Domain\GoalTracker\Models\Tag;
use Domain\User\Models\User;

test('guests cannot access activities', function () {
    $this->get(route('activities.index'))->assertRedirect(route('login'));
    $this->get(route('activities.create'))->assertRedirect(route('login'));
    $this->post(route('activities.store'))->assertRedirect(route('login'));
});

test('user can view activities index', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('activities.index'))
        ->assertOk();
});

test('user can view create activity form', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('activities.create'))
        ->assertOk();
});

test('user can create an activity', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)
        ->post(route('activities.store'), [
            'name' => 'Morning Run',
            'description' => 'A quick 5km run',
            'point_cost' => 10,
            'color' => '#ff5733',
            'needs_timer' => false,
            'tags' => [],
        ]);

    $response->assertRedirect(route('activities.index'));

    $activity = $user->activities()->first();
    expect($activity)->not->toBeNull();
    expect($activity->name)->toBe('Morning Run');
    expect($activity->description)->toBe('A quick 5km run');
    expect($activity->point_cost)->toBe(10);
    expect($activity->color)->toBe('#ff5733');
    expect($activity->needs_timer)->toBeFalse();
    expect($activity->duration_minutes)->toBeNull();
});

test('user can create an activity with timer', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('activities.store'), [
            'name' => 'Meditation',
            'point_cost' => 5,
            'color' => '#3a9a4e',
            'needs_timer' => true,
            'duration_minutes' => 30,
            'tags' => [],
        ]);

    $activity = $user->activities()->first();
    expect($activity->needs_timer)->toBeTrue();
    expect($activity->duration_minutes)->toBe(30);
});

test('duration is required when needs_timer is true', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('activities.store'), [
            'name' => 'Test',
            'point_cost' => 5,
            'color' => '#aabbcc',
            'needs_timer' => true,
            'duration_minutes' => null,
        ])
        ->assertSessionHasErrors('duration_minutes');
});

test('user can create an activity with tags', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('activities.store'), [
            'name' => 'Reading',
            'point_cost' => 8,
            'color' => '#0000ff',
            'needs_timer' => false,
            'tags' => ['education', 'self-improvement'],
        ]);

    $activity = $user->activities()->with('tags')->first();
    expect($activity->tags)->toHaveCount(2);
    expect($activity->tags->pluck('name')->toArray())->toContain('education', 'self-improvement');

    expect($user->tags()->count())->toBe(2);
});

test('tags are reused when they already exist', function () {
    $user = User::factory()->create();
    Tag::factory()->create(['user_id' => $user->id, 'name' => 'fitness']);

    $this->actingAs($user)
        ->post(route('activities.store'), [
            'name' => 'Running',
            'point_cost' => 10,
            'color' => '#ff0000',
            'needs_timer' => false,
            'tags' => ['fitness', 'cardio'],
        ]);

    expect($user->tags()->count())->toBe(2);
    expect($user->tags()->where('name', 'fitness')->count())->toBe(1);
});

test('activity creation requires valid data', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('activities.store'), [
            'name' => '',
            'point_cost' => -5,
            'color' => 'invalid',
        ])
        ->assertSessionHasErrors(['name', 'point_cost', 'color']);
});

test('user can edit their own activity', function () {
    $user = User::factory()->create();
    $activity = Activity::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)
        ->get(route('activities.edit', $activity))
        ->assertOk();
});

test('user cannot edit another users activity', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $activity = Activity::factory()->create(['user_id' => $other->id]);

    $this->actingAs($user)
        ->get(route('activities.edit', $activity))
        ->assertForbidden();
});

test('user can update their own activity', function () {
    $user = User::factory()->create();
    $activity = Activity::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)
        ->put(route('activities.update', $activity), [
            'name' => 'Updated Activity',
            'point_cost' => 20,
            'color' => '#0000ff',
            'needs_timer' => true,
            'duration_minutes' => 45,
            'tags' => ['updated'],
        ])
        ->assertRedirect(route('activities.index'));

    $activity->refresh();
    expect($activity->name)->toBe('Updated Activity');
    expect($activity->point_cost)->toBe(20);
    expect($activity->needs_timer)->toBeTrue();
    expect($activity->duration_minutes)->toBe(45);
    expect($activity->tags->pluck('name')->toArray())->toBe(['updated']);
});

test('user cannot update another users activity', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $activity = Activity::factory()->create(['user_id' => $other->id]);

    $this->actingAs($user)
        ->put(route('activities.update', $activity), [
            'name' => 'Hacked',
            'point_cost' => 1,
            'color' => '#000000',
            'needs_timer' => false,
        ])
        ->assertForbidden();
});

test('user can delete their own activity', function () {
    $user = User::factory()->create();
    $activity = Activity::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)
        ->delete(route('activities.destroy', $activity))
        ->assertRedirect(route('activities.index'));

    expect($activity->fresh())->toBeNull();
});

test('user cannot delete another users activity', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $activity = Activity::factory()->create(['user_id' => $other->id]);

    $this->actingAs($user)
        ->delete(route('activities.destroy', $activity))
        ->assertForbidden();

    expect($activity->fresh())->not->toBeNull();
});

test('user can reorder activities', function () {
    $user = User::factory()->create();
    $activity1 = Activity::factory()->create(['user_id' => $user->id, 'sort_order' => 0]);
    $activity2 = Activity::factory()->create(['user_id' => $user->id, 'sort_order' => 1]);

    $this->actingAs($user)
        ->patch(route('activities.reorder'), [
            'order' => [
                ['id' => $activity2->id, 'sort_order' => 0],
                ['id' => $activity1->id, 'sort_order' => 1],
            ],
        ])
        ->assertRedirect(route('activities.index'));

    expect($activity1->refresh()->sort_order)->toBe(1);
    expect($activity2->refresh()->sort_order)->toBe(0);
});

test('duration is cleared when needs_timer is set to false', function () {
    $user = User::factory()->create();
    $activity = Activity::factory()->create([
        'user_id' => $user->id,
        'needs_timer' => true,
        'duration_minutes' => 60,
    ]);

    $this->actingAs($user)
        ->put(route('activities.update', $activity), [
            'name' => $activity->name,
            'point_cost' => $activity->point_cost,
            'color' => $activity->color,
            'needs_timer' => false,
            'tags' => [],
        ]);

    $activity->refresh();
    expect($activity->needs_timer)->toBeFalse();
    expect($activity->duration_minutes)->toBeNull();
});

test('description is optional', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('activities.store'), [
            'name' => 'Simple Activity',
            'point_cost' => 5,
            'color' => '#aabbcc',
            'needs_timer' => false,
            'tags' => [],
        ])
        ->assertRedirect(route('activities.index'));

    $activity = $user->activities()->first();
    expect($activity->description)->toBeNull();
});
