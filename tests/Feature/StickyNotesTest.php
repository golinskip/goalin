<?php

use Domain\Alerts\AlertManager;
use Domain\Tools\StickyNotes\Alerts\UnreviewedStickyNotesAlert;
use Domain\Tools\StickyNotes\Enums\StickyNoteColor;
use Domain\Tools\StickyNotes\Models\StickyNote;
use Domain\User\Models\User;

test('guests are redirected to login', function () {
    $this->get(route('sticky-notes.index'))->assertRedirect(route('login'));
});

test('the tool page lists applied notes and shares open notes for quick access', function () {
    $user = User::factory()->create();
    $open = StickyNote::factory()->for($user)->create();
    $applied = StickyNote::factory()->for($user)->applied()->create();
    StickyNote::factory()->create();

    $this->actingAs($user)->get(route('sticky-notes.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('tools/sticky-notes/index')
            ->has('stickyNotes', 1)
            ->where('stickyNotes.0.id', $open->id)
            ->where('stickyNotes.0.needs_review', false)
            ->has('appliedNotes', 1)
            ->where('appliedNotes.0.id', $applied->id)
            ->where('appliedNotes.0.is_applied', true));
});

test('important notes come first in quick access', function () {
    $user = User::factory()->create();
    StickyNote::factory()->for($user)->create();
    $important = StickyNote::factory()->for($user)->important()->create(['created_at' => now()->subWeek()]);

    $this->actingAs($user)->get(route('sticky-notes.index'))
        ->assertInertia(fn ($page) => $page->where('stickyNotes.0.id', $important->id));
});

test('a user can add a note, yellow by default', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->post(route('sticky-notes.store'), ['content' => 'Buy milk'])->assertRedirect();

    $note = StickyNote::query()->sole();

    expect($note->user_id)->toBe($user->id)
        ->and($note->content)->toBe('Buy milk')
        ->and($note->color)->toBe(StickyNoteColor::Yellow)
        ->and($note->is_important)->toBeFalse()
        ->and($note->isApplied())->toBeFalse()
        ->and($note->reviewed_on->isToday())->toBeTrue();
});

test('a note needs content and a known color', function () {
    $this->actingAs(User::factory()->create())
        ->post(route('sticky-notes.store'), ['content' => '', 'color' => 'black'])
        ->assertSessionHasErrors(['content', 'color']);
});

test('editing the text keeps the previous text as a revision and counts as a review', function () {
    $user = User::factory()->create();
    $note = StickyNote::factory()->for($user)->notReviewedToday()->create(['content' => 'First']);

    $this->actingAs($user)->put(route('sticky-notes.update', $note), ['content' => 'Second'])
        ->assertRedirect()->assertSessionHasNoErrors();
    $this->put(route('sticky-notes.update', $note), ['content' => 'Third']);

    $note->refresh();

    expect($note->content)->toBe('Third')
        ->and($note->needsReview())->toBeFalse()
        ->and($note->revisions->pluck('content')->all())->toBe(['Second', 'First']);
});

test('changing color or importance does not create a revision', function () {
    $user = User::factory()->create();
    $note = StickyNote::factory()->for($user)->create(['content' => 'Same']);

    $this->actingAs($user)->put(route('sticky-notes.update', $note), [
        'content' => 'Same',
        'color' => 'pink',
        'is_important' => true,
    ])->assertSessionHasNoErrors();

    $note->refresh();

    expect($note->color)->toBe(StickyNoteColor::Pink)
        ->and($note->is_important)->toBeTrue()
        ->and($note->revisions)->toBeEmpty();
});

test('a note can be marked as applied and reopened', function () {
    $user = User::factory()->create();
    $note = StickyNote::factory()->for($user)->create();

    $this->actingAs($user)->post(route('sticky-notes.apply', $note))->assertRedirect();
    expect($note->refresh()->isApplied())->toBeTrue();

    $this->get(route('sticky-notes.index'))
        ->assertInertia(fn ($page) => $page->has('stickyNotes', 0)->has('appliedNotes', 1));

    $this->post(route('sticky-notes.apply', $note));
    expect($note->refresh()->isApplied())->toBeFalse();
});

test('stay marks a note as reviewed today without changing it', function () {
    $user = User::factory()->create();
    $note = StickyNote::factory()->for($user)->notReviewedToday()->create(['content' => 'Keep']);

    expect($note->needsReview())->toBeTrue();

    $this->actingAs($user)->post(route('sticky-notes.stay', $note))->assertRedirect();

    $note->refresh();

    expect($note->needsReview())->toBeFalse()
        ->and($note->content)->toBe('Keep')
        ->and($note->revisions)->toBeEmpty();
});

test('a user can remove a note together with its history', function () {
    $user = User::factory()->create();
    $note = StickyNote::factory()->for($user)->create();
    $note->revisions()->create(['content' => 'Old']);

    $this->actingAs($user)->delete(route('sticky-notes.destroy', $note))->assertRedirect();

    $this->assertDatabaseCount('sticky_notes', 0);
    $this->assertDatabaseCount('sticky_note_revisions', 0);
});

test('a user cannot touch someone else note', function (string $method, string $route) {
    $note = StickyNote::factory()->create(['content' => 'Private']);

    $this->actingAs(User::factory()->create())
        ->{$method}(route($route, $note), ['content' => 'Hacked'])
        ->assertForbidden();

    expect($note->refresh()->content)->toBe('Private')
        ->and($note->isApplied())->toBeFalse();
})->with([
    'update' => ['put', 'sticky-notes.update'],
    'apply' => ['post', 'sticky-notes.apply'],
    'stay' => ['post', 'sticky-notes.stay'],
    'destroy' => ['delete', 'sticky-notes.destroy'],
]);

test('the alert triggers for open notes last reviewed on a previous day', function () {
    $user = User::factory()->create();
    $alert = new UnreviewedStickyNotesAlert;

    expect($alert->check($user))->toBeFalse();

    StickyNote::factory()->for($user)->create();
    StickyNote::factory()->for($user)->applied()->notReviewedToday()->create();
    StickyNote::factory()->notReviewedToday()->create();

    expect($alert->check($user))->toBeFalse();

    StickyNote::factory()->for($user)->notReviewedToday()->create();

    expect($alert->check($user))->toBeTrue()
        ->and(collect(app(AlertManager::class)->getActiveAlerts($user))->pluck('key'))
        ->toContain('sticky-notes.unreviewed');
});
