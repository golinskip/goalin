<?php

use Domain\Tools\LongTermGoals\Enums\GoalPeriodType;
use Domain\Tools\LongTermGoals\Enums\GoalStatus;
use Domain\Tools\LongTermGoals\Models\GoalCategory;
use Domain\Tools\LongTermGoals\Models\GoalPeriod;
use Domain\Tools\LongTermGoals\Models\LongTermGoal;
use Domain\User\Models\User;

test('guests are redirected to login', function () {
    $this->get(route('long-term-goals.index'))
        ->assertRedirect(route('login'));
});

test('authenticated users can visit the index page', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $this->get(route('long-term-goals.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('tools/long-term-goals/index')
            ->has('year')
            ->has('month')
            ->has('categories')
            ->has('statuses')
        );
});

test('index page shows goals for the selected year and month', function () {
    $user = User::factory()->create();
    $period = GoalPeriod::factory()->for($user)->create(['type' => GoalPeriodType::Yearly, 'year' => 2026]);
    LongTermGoal::factory()->for($user)->create(['goal_period_id' => $period->id, 'title' => 'My Yearly Goal']);
    $this->actingAs($user);

    $this->get(route('long-term-goals.index', ['year' => 2026]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('yearlyPeriod.goals.0.title', 'My Yearly Goal')
        );
});

// Categories
test('users can create a category', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $this->post(route('goal-categories.store'), [
        'name' => 'Health',
        'color' => '#10b981',
    ])->assertRedirect();

    $this->assertDatabaseHas('goal_categories', [
        'user_id' => $user->id,
        'name' => 'Health',
        'color' => '#10b981',
    ]);
});

test('users can update their category', function () {
    $user = User::factory()->create();
    $category = GoalCategory::factory()->for($user)->create(['name' => 'Old Name']);
    $this->actingAs($user);

    $this->put(route('goal-categories.update', $category), [
        'name' => 'New Name',
        'color' => '#ef4444',
    ])->assertRedirect();

    expect($category->fresh()->name)->toBe('New Name');
});

test('users cannot update another users category', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $category = GoalCategory::factory()->for($other)->create();
    $this->actingAs($user);

    $this->put(route('goal-categories.update', $category), [
        'name' => 'Hijack',
        'color' => '#000000',
    ])->assertForbidden();
});

test('users can delete their category', function () {
    $user = User::factory()->create();
    $category = GoalCategory::factory()->for($user)->create();
    $this->actingAs($user);

    $this->delete(route('goal-categories.destroy', $category))->assertRedirect();
    $this->assertDatabaseMissing('goal_categories', ['id' => $category->id]);
});

// Goals
test('users can create a yearly goal', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $this->post(route('long-term-goals.store'), [
        'period_type' => 'yearly',
        'year' => 2026,
        'month' => null,
        'title' => 'Read 50 books',
    ])->assertRedirect();

    $this->assertDatabaseHas('long_term_goals', [
        'user_id' => $user->id,
        'title' => 'Read 50 books',
    ]);

    $this->assertDatabaseHas('goal_periods', [
        'user_id' => $user->id,
        'type' => 'yearly',
        'year' => 2026,
        'month' => null,
    ]);
});

test('users can create a monthly goal', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $this->post(route('long-term-goals.store'), [
        'period_type' => 'monthly',
        'year' => 2026,
        'month' => 3,
        'title' => 'Run 100km',
    ])->assertRedirect();

    $this->assertDatabaseHas('goal_periods', [
        'user_id' => $user->id,
        'type' => 'monthly',
        'year' => 2026,
        'month' => 3,
    ]);
});

test('users can create a goal with a category', function () {
    $user = User::factory()->create();
    $category = GoalCategory::factory()->for($user)->create(['name' => 'Fitness']);
    $this->actingAs($user);

    $this->post(route('long-term-goals.store'), [
        'period_type' => 'yearly',
        'year' => 2026,
        'title' => 'Lose weight',
        'goal_category_id' => $category->id,
    ])->assertRedirect();

    $this->assertDatabaseHas('long_term_goals', [
        'title' => 'Lose weight',
        'goal_category_id' => $category->id,
    ]);
});

test('users can update their goal', function () {
    $user = User::factory()->create();
    $period = GoalPeriod::factory()->for($user)->create();
    $goal = LongTermGoal::factory()->for($user)->create(['goal_period_id' => $period->id, 'title' => 'Old']);
    $this->actingAs($user);

    $this->put(route('long-term-goals.update', $goal), [
        'title' => 'Updated Goal',
        'status' => 'done',
    ])->assertRedirect();

    $goal->refresh();
    expect($goal->title)->toBe('Updated Goal');
    expect($goal->status)->toBe(GoalStatus::Done);
});

test('users cannot update another users goal', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $period = GoalPeriod::factory()->for($other)->create();
    $goal = LongTermGoal::factory()->for($other)->create(['goal_period_id' => $period->id]);
    $this->actingAs($user);

    $this->put(route('long-term-goals.update', $goal), ['title' => 'Nope'])
        ->assertForbidden();
});

test('users can delete their goal', function () {
    $user = User::factory()->create();
    $period = GoalPeriod::factory()->for($user)->create();
    $goal = LongTermGoal::factory()->for($user)->create(['goal_period_id' => $period->id]);
    $this->actingAs($user);

    $this->delete(route('long-term-goals.destroy', $goal))->assertRedirect();
    $this->assertDatabaseMissing('long_term_goals', ['id' => $goal->id]);
});

// Reviews
test('users can review a period', function () {
    $user = User::factory()->create();
    $period = GoalPeriod::factory()->for($user)->create(['type' => GoalPeriodType::Yearly, 'year' => 2026]);
    $goal1 = LongTermGoal::factory()->for($user)->create(['goal_period_id' => $period->id, 'title' => 'Goal A']);
    $goal2 = LongTermGoal::factory()->for($user)->create(['goal_period_id' => $period->id, 'title' => 'Goal B']);
    $this->actingAs($user);

    $this->put(route('long-term-goals.review', $period), [
        'review_comment' => 'Great year overall!',
        'goals' => [
            ['id' => $goal1->id, 'status' => 'done', 'review_note' => 'Completed early'],
            ['id' => $goal2->id, 'status' => 'not_done', 'review_note' => 'Ran out of time'],
        ],
    ])->assertRedirect();

    $period->refresh();
    expect($period->review_comment)->toBe('Great year overall!');
    expect($period->reviewed_at)->not->toBeNull();

    $goal1->refresh();
    expect($goal1->status)->toBe(GoalStatus::Done);
    expect($goal1->review_note)->toBe('Completed early');

    $goal2->refresh();
    expect($goal2->status)->toBe(GoalStatus::NotDone);
});

test('users cannot review another users period', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $period = GoalPeriod::factory()->for($other)->create();
    $goal = LongTermGoal::factory()->for($other)->create(['goal_period_id' => $period->id]);
    $this->actingAs($user);

    $this->put(route('long-term-goals.review', $period), [
        'review_comment' => 'Sneaky',
        'goals' => [
            ['id' => $goal->id, 'status' => 'done', 'review_note' => ''],
        ],
    ])->assertForbidden();
});

test('creating goals for the same period reuses the existing period', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $this->post(route('long-term-goals.store'), [
        'period_type' => 'yearly',
        'year' => 2026,
        'title' => 'Goal 1',
    ])->assertRedirect();

    $this->post(route('long-term-goals.store'), [
        'period_type' => 'yearly',
        'year' => 2026,
        'title' => 'Goal 2',
    ])->assertRedirect();

    expect(GoalPeriod::where('user_id', $user->id)->where('type', 'yearly')->where('year', 2026)->count())->toBe(1);
    expect(LongTermGoal::where('user_id', $user->id)->count())->toBe(2);
});
