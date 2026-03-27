<?php

use Domain\Tools\Diary\Models\DiaryEntry;
use Domain\User\Models\User;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('diary.index'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the diary index with today auto-selected', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('diary.index'));
    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('tools/diary/index')
        ->has('month')
        ->has('entryDates')
        ->has('totalEntries')
        ->where('selectedDate', now()->format('Y-m-d'))
    );
});

test('users can create a diary entry', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $date = now()->subDay()->format('Y-m-d');

    $response = $this->post(route('diary.store'), [
        'entry_date' => $date,
        'content' => 'Had a great day today!',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('diary_entries', [
        'user_id' => $user->id,
        'content' => 'Had a great day today!',
    ]);
});

test('users cannot create a diary entry for a future date', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->post(route('diary.store'), [
        'entry_date' => now()->addDay()->format('Y-m-d'),
        'content' => 'Future entry',
    ]);

    $response->assertSessionHasErrors('entry_date');
});

test('users cannot create duplicate entries for the same date', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $date = now()->subDays(2)->format('Y-m-d');

    DiaryEntry::factory()->for($user)->create(['entry_date' => $date]);

    $response = $this->from(route('diary.index'))->post(route('diary.store'), [
        'entry_date' => $date,
        'content' => 'Duplicate entry',
    ]);

    $response->assertSessionHasErrors('entry_date');
});

test('users can update their own diary entry', function () {
    $user = User::factory()->create();
    $entry = DiaryEntry::factory()->for($user)->create(['content' => 'Original']);
    $this->actingAs($user);

    $response = $this->put(route('diary.update', $entry), [
        'content' => 'Updated content',
    ]);

    $response->assertRedirect();
    expect($entry->fresh()->content)->toBe('Updated content');
});

test('users cannot update another users diary entry', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $entry = DiaryEntry::factory()->for($otherUser)->create();
    $this->actingAs($user);

    $response = $this->put(route('diary.update', $entry), [
        'content' => 'Hacked',
    ]);

    $response->assertForbidden();
});

test('users can delete their own diary entry', function () {
    $user = User::factory()->create();
    $entry = DiaryEntry::factory()->for($user)->create();
    $this->actingAs($user);

    $response = $this->delete(route('diary.destroy', $entry));

    $response->assertRedirect();
    $this->assertDatabaseMissing('diary_entries', ['id' => $entry->id]);
});

test('users cannot delete another users diary entry', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $entry = DiaryEntry::factory()->for($otherUser)->create();
    $this->actingAs($user);

    $response = $this->delete(route('diary.destroy', $entry));

    $response->assertForbidden();
});

test('diary index shows entry dates for the selected month', function () {
    $user = User::factory()->create();
    $date = now()->format('Y-m-d');
    DiaryEntry::factory()->for($user)->create(['entry_date' => $date]);
    $this->actingAs($user);

    $response = $this->get(route('diary.index', ['month' => now()->format('Y-m')]));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->where('entryDates', [$date])
    );
});

test('diary index returns selected entry when date is provided', function () {
    $user = User::factory()->create();
    $date = now()->subDay()->format('Y-m-d');
    DiaryEntry::factory()->for($user)->create([
        'entry_date' => $date,
        'content' => 'Test content',
    ]);
    $this->actingAs($user);

    $response = $this->get(route('diary.index', [
        'month' => now()->format('Y-m'),
        'date' => $date,
    ]));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->where('selectedEntry.content', 'Test content')
    );
});
