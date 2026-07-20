<?php

use Domain\Automation\AutomationRunner;
use Domain\Tools\Flashcards\Events\ReviewedFlashcardsEvent;
use Domain\Tools\GoalTracker\Enums\ActivityType;
use Domain\Tools\GoalTracker\Models\Activity;
use Domain\User\Models\User;

function reviewCards(User $user, int $count): void
{
    $set = $user->memoSets()->create(['name' => 'Set', 'color' => '#000000']);

    for ($i = 0; $i < $count; $i++) {
        $set->cards()->create([
            'front' => "Q{$i}",
            'back' => "A{$i}",
            'last_reviewed_at' => now(),
        ]);
    }
}

it('awards a daily automated activity once the review target is met', function () {
    $user = User::factory()->create();
    $activity = Activity::factory()->for($user)->automated(ReviewedFlashcardsEvent::KEY, [
        'count' => 5,
        'mode' => 'daily',
    ])->create(['point_cost' => 10]);

    reviewCards($user, 5);

    app(AutomationRunner::class)->fire(ReviewedFlashcardsEvent::KEY, $user);

    expect($activity->logs()->count())->toBe(1);
    expect((int) $user->activityLogs()->sum('points_earned'))->toBe(10);
});

it('does not award a daily automated activity before the target is met', function () {
    $user = User::factory()->create();
    Activity::factory()->for($user)->automated(ReviewedFlashcardsEvent::KEY, [
        'count' => 5,
        'mode' => 'daily',
    ])->create();

    reviewCards($user, 4);

    app(AutomationRunner::class)->fire(ReviewedFlashcardsEvent::KEY, $user);

    expect($user->activityLogs()->count())->toBe(0);
});

it('never awards a daily automated activity twice in one day', function () {
    $user = User::factory()->create();
    $activity = Activity::factory()->for($user)->automated(ReviewedFlashcardsEvent::KEY, [
        'count' => 3,
        'mode' => 'daily',
    ])->create();

    reviewCards($user, 10);

    $runner = app(AutomationRunner::class);
    $runner->fire(ReviewedFlashcardsEvent::KEY, $user);
    $runner->fire(ReviewedFlashcardsEvent::KEY, $user);

    expect($activity->logs()->count())->toBe(1);
});

it('awards one unit per batch and never pays for the same batch twice', function () {
    $user = User::factory()->create();
    $activity = Activity::factory()->for($user)->automated(ReviewedFlashcardsEvent::KEY, [
        'count' => 5,
        'mode' => 'per_batch',
    ])->create(['point_cost' => 2]);

    reviewCards($user, 12);

    $runner = app(AutomationRunner::class);
    $runner->fire(ReviewedFlashcardsEvent::KEY, $user);

    expect((int) $activity->logs()->sum('quantity'))->toBe(2);

    $runner->fire(ReviewedFlashcardsEvent::KEY, $user);

    expect((int) $activity->logs()->sum('quantity'))->toBe(2)
        ->and((int) $user->activityLogs()->sum('points_earned'))->toBe(4);
});

it('awards additional per-batch units as more cards are reviewed the same day', function () {
    $user = User::factory()->create();
    $activity = Activity::factory()->for($user)->automated(ReviewedFlashcardsEvent::KEY, [
        'count' => 5,
        'mode' => 'per_batch',
    ])->create();

    $set = $user->memoSets()->create(['name' => 'Set', 'color' => '#000000']);
    $runner = app(AutomationRunner::class);

    for ($i = 0; $i < 5; $i++) {
        $set->cards()->create(['front' => "Q{$i}", 'back' => "A{$i}", 'last_reviewed_at' => now()]);
    }
    $runner->fire(ReviewedFlashcardsEvent::KEY, $user);

    for ($i = 5; $i < 10; $i++) {
        $set->cards()->create(['front' => "Q{$i}", 'back' => "A{$i}", 'last_reviewed_at' => now()]);
    }
    $runner->fire(ReviewedFlashcardsEvent::KEY, $user);

    expect((int) $activity->logs()->sum('quantity'))->toBe(2);
});

it('ignores manual activities and other users when firing an event', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();

    Activity::factory()->for($user)->create();
    Activity::factory()->for($other)->automated(ReviewedFlashcardsEvent::KEY, ['count' => 1, 'mode' => 'daily'])->create();

    reviewCards($user, 3);

    app(AutomationRunner::class)->fire(ReviewedFlashcardsEvent::KEY, $user);

    expect($user->activityLogs()->count())->toBe(0);
});

it('does nothing for an unknown event key', function () {
    $user = User::factory()->create();

    $logs = app(AutomationRunner::class)->fire('does.not.exist', $user);

    expect($logs)->toBe([]);
});

it('fires the flashcard event when a card is reviewed through the controller', function () {
    $user = User::factory()->create();
    $activity = Activity::factory()->for($user)->automated(ReviewedFlashcardsEvent::KEY, [
        'count' => 1,
        'mode' => 'daily',
    ])->create(['point_cost' => 7]);

    $set = $user->memoSets()->create(['name' => 'Set', 'color' => '#000000']);
    $card = $set->cards()->create(['front' => 'Q', 'back' => 'A']);

    $this->actingAs($user)
        ->post(route('memo-cards.review', $card), ['correct' => true])
        ->assertRedirect();

    expect($activity->logs()->count())->toBe(1)
        ->and((int) $user->activityLogs()->sum('points_earned'))->toBe(7);
});

it('stores an automated activity with normalized parameters through the form', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('activities.store'), [
            'name' => 'Study reviewer',
            'type' => ActivityType::Automated->value,
            'event_key' => ReviewedFlashcardsEvent::KEY,
            'event_parameters' => ['count' => 20, 'mode' => 'per_batch'],
            'point_cost' => 5,
            'color' => '#3a9a4e',
            'needs_timer' => false,
        ])
        ->assertRedirect(route('activities.index'));

    $activity = $user->activities()->firstOrFail();

    expect($activity->type)->toBe(ActivityType::Automated)
        ->and($activity->event_key)->toBe(ReviewedFlashcardsEvent::KEY)
        ->and($activity->event_parameters)->toBe(['count' => 20, 'mode' => 'per_batch'])
        ->and($activity->needs_timer)->toBeFalse();
});

it('rejects an automated activity without an event key', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('activities.store'), [
            'name' => 'Broken',
            'type' => ActivityType::Automated->value,
            'point_cost' => 5,
            'color' => '#3a9a4e',
            'needs_timer' => false,
        ])
        ->assertSessionHasErrors('event_key');
});

it('clears the event binding when an activity is switched back to manual', function () {
    $user = User::factory()->create();
    $activity = Activity::factory()->for($user)->automated(ReviewedFlashcardsEvent::KEY, [
        'count' => 5,
        'mode' => 'daily',
    ])->create();

    $this->actingAs($user)
        ->put(route('activities.update', $activity), [
            'name' => $activity->name,
            'type' => ActivityType::Manual->value,
            'point_cost' => $activity->point_cost,
            'color' => $activity->color,
            'needs_timer' => false,
        ])
        ->assertRedirect(route('activities.index'));

    $activity->refresh();

    expect($activity->type)->toBe(ActivityType::Manual)
        ->and($activity->event_key)->toBeNull()
        ->and($activity->event_parameters)->toBeNull();
});
