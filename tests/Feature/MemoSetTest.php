<?php

use Domain\Tools\Flashcards\Models\MemoCard;
use Domain\Tools\Flashcards\Models\MemoSet;
use Domain\User\Models\User;
use Illuminate\Http\UploadedFile;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('memo-sets.index'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the memo sets index', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('memo-sets.index'));
    $response->assertOk();
});

test('users can create a memo set', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->post(route('memo-sets.store'), [
        'name' => 'Spanish Vocabulary',
        'description' => 'Common words',
        'color' => '#3a9a4e',
    ]);

    $response->assertRedirect(route('memo-sets.index'));
    $this->assertDatabaseHas('memo_sets', [
        'user_id' => $user->id,
        'name' => 'Spanish Vocabulary',
    ]);
});

test('users can view their own memo set', function () {
    $user = User::factory()->create();
    $memoSet = MemoSet::factory()->for($user)->create(['name' => 'My Set']);
    $this->actingAs($user);

    $response = $this->get(route('memo-sets.show', $memoSet));
    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('tools/memo-sets/show')
        ->where('memoSet.name', 'My Set')
    );
});

test('users cannot view another users memo set', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $memoSet = MemoSet::factory()->for($otherUser)->create();
    $this->actingAs($user);

    $response = $this->get(route('memo-sets.show', $memoSet));
    $response->assertForbidden();
});

test('users can update their memo set', function () {
    $user = User::factory()->create();
    $memoSet = MemoSet::factory()->for($user)->create();
    $this->actingAs($user);

    $response = $this->put(route('memo-sets.update', $memoSet), [
        'name' => 'Updated Name',
        'description' => 'Updated desc',
        'color' => '#ff0000',
    ]);

    $response->assertRedirect(route('memo-sets.show', $memoSet));
    $this->assertDatabaseHas('memo_sets', [
        'id' => $memoSet->id,
        'name' => 'Updated Name',
    ]);
});

test('users can delete their memo set', function () {
    $user = User::factory()->create();
    $memoSet = MemoSet::factory()->for($user)->create();
    $this->actingAs($user);

    $response = $this->delete(route('memo-sets.destroy', $memoSet));
    $response->assertRedirect(route('memo-sets.index'));
    $this->assertDatabaseMissing('memo_sets', ['id' => $memoSet->id]);
});

test('users can add a card to their memo set', function () {
    $user = User::factory()->create();
    $memoSet = MemoSet::factory()->for($user)->create();
    $this->actingAs($user);

    $response = $this->post(route('memo-cards.store', $memoSet), [
        'front' => 'Hola',
        'back' => 'Hello',
    ]);

    $response->assertRedirect(route('memo-sets.show', $memoSet));
    $this->assertDatabaseHas('memo_cards', [
        'memo_set_id' => $memoSet->id,
        'front' => 'Hola',
        'back' => 'Hello',
    ]);
});

test('users can update a card', function () {
    $user = User::factory()->create();
    $memoSet = MemoSet::factory()->for($user)->create();
    $card = MemoCard::factory()->for($memoSet, 'memoSet')->create(['front' => 'Old']);
    $this->actingAs($user);

    $response = $this->put(route('memo-cards.update', $card), [
        'front' => 'New',
        'back' => 'Updated',
    ]);

    $response->assertRedirect(route('memo-sets.show', $memoSet));
    $this->assertDatabaseHas('memo_cards', [
        'id' => $card->id,
        'front' => 'New',
    ]);
});

test('users can delete a card', function () {
    $user = User::factory()->create();
    $memoSet = MemoSet::factory()->for($user)->create();
    $card = MemoCard::factory()->for($memoSet, 'memoSet')->create();
    $this->actingAs($user);

    $response = $this->delete(route('memo-cards.destroy', $card));
    $response->assertRedirect(route('memo-sets.show', $memoSet));
    $this->assertDatabaseMissing('memo_cards', ['id' => $card->id]);
});

test('users can review a card as correct', function () {
    $user = User::factory()->create();
    $memoSet = MemoSet::factory()->for($user)->create();
    $card = MemoCard::factory()->for($memoSet, 'memoSet')->create([
        'correct_count' => 0,
        'incorrect_count' => 0,
    ]);
    $this->actingAs($user);

    $response = $this->post(route('memo-cards.review', $card), ['correct' => true]);
    $response->assertRedirect();
    $this->assertDatabaseHas('memo_cards', [
        'id' => $card->id,
        'correct_count' => 1,
        'incorrect_count' => 0,
    ]);
});

test('users can review a card as incorrect', function () {
    $user = User::factory()->create();
    $memoSet = MemoSet::factory()->for($user)->create();
    $card = MemoCard::factory()->for($memoSet, 'memoSet')->create([
        'correct_count' => 0,
        'incorrect_count' => 0,
    ]);
    $this->actingAs($user);

    $response = $this->post(route('memo-cards.review', $card), ['correct' => false]);
    $response->assertRedirect();
    $this->assertDatabaseHas('memo_cards', [
        'id' => $card->id,
        'correct_count' => 0,
        'incorrect_count' => 1,
    ]);
});

test('users can export cards as csv', function () {
    $user = User::factory()->create();
    $memoSet = MemoSet::factory()->for($user)->create(['name' => 'Spanish']);
    MemoCard::factory()->for($memoSet, 'memoSet')->create(['front' => 'Hola', 'back' => 'Hello']);
    MemoCard::factory()->for($memoSet, 'memoSet')->create(['front' => 'Gracias', 'back' => 'Thank you']);
    $this->actingAs($user);

    $response = $this->get(route('memo-sets.export', $memoSet));
    $response->assertOk();
    $response->assertHeader('content-type', 'text/csv; charset=UTF-8');
    $content = $response->streamedContent();
    expect($content)->toContain('Hola;Hello');
    expect($content)->toContain('Gracias;"Thank you"');
});

test('users can import cards from csv text', function () {
    $user = User::factory()->create();
    $memoSet = MemoSet::factory()->for($user)->create();
    $this->actingAs($user);

    $response = $this->post(route('memo-sets.import', $memoSet), [
        'csv_text' => "front;back\nHola;Hello\nGracias;Thank you",
    ]);

    $response->assertRedirect(route('memo-sets.show', $memoSet));
    $this->assertDatabaseHas('memo_cards', ['memo_set_id' => $memoSet->id, 'front' => 'Hola', 'back' => 'Hello']);
    $this->assertDatabaseHas('memo_cards', ['memo_set_id' => $memoSet->id, 'front' => 'Gracias', 'back' => 'Thank you']);
});

test('users can import cards from csv file', function () {
    $user = User::factory()->create();
    $memoSet = MemoSet::factory()->for($user)->create();
    $this->actingAs($user);

    $file = UploadedFile::fake()->createWithContent('cards.csv', "Hola;Hello\nAdios;Goodbye");

    $response = $this->post(route('memo-sets.import', $memoSet), [
        'csv_file' => $file,
    ]);

    $response->assertRedirect(route('memo-sets.show', $memoSet));
    $this->assertDatabaseHas('memo_cards', ['memo_set_id' => $memoSet->id, 'front' => 'Hola', 'back' => 'Hello']);
    $this->assertDatabaseHas('memo_cards', ['memo_set_id' => $memoSet->id, 'front' => 'Adios', 'back' => 'Goodbye']);
});

test('import skips header row', function () {
    $user = User::factory()->create();
    $memoSet = MemoSet::factory()->for($user)->create();
    $this->actingAs($user);

    $this->post(route('memo-sets.import', $memoSet), [
        'csv_text' => "front;back\nHola;Hello",
    ]);

    expect($memoSet->cards()->count())->toBe(1);
    $this->assertDatabaseMissing('memo_cards', ['front' => 'front']);
});

test('import skips empty lines', function () {
    $user = User::factory()->create();
    $memoSet = MemoSet::factory()->for($user)->create();
    $this->actingAs($user);

    $this->post(route('memo-sets.import', $memoSet), [
        'csv_text' => "Hola;Hello\n\n\nGracias;Thanks",
    ]);

    expect($memoSet->cards()->count())->toBe(2);
});

test('users can access the learn page', function () {
    $user = User::factory()->create();
    $memoSet = MemoSet::factory()->for($user)->create();
    MemoCard::factory()->for($memoSet, 'memoSet')->count(3)->create();
    $this->actingAs($user);

    $response = $this->get(route('memo-sets.learn', $memoSet));
    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('tools/memo-sets/learn')
        ->has('cards', 3)
        ->has('cards.0.weight')
    );
});
