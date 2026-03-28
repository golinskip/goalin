<?php

use Domain\Tools\MusicPlayer\Models\MusicFile;
use Domain\Tools\MusicPlayer\Models\Playlist;
use Domain\User\Models\User;

test('users can create a playlist', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->post(route('playlists.store'), [
        'name' => 'My Playlist',
        'description' => 'A great playlist',
        'color' => '#e44d8a',
    ]);

    $response->assertRedirect(route('music.index'));
    $this->assertDatabaseHas('playlists', [
        'user_id' => $user->id,
        'name' => 'My Playlist',
    ]);
});

test('playlist creation requires a name', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->post(route('playlists.store'), [
        'name' => '',
        'color' => '#e44d8a',
    ]);

    $response->assertSessionHasErrors('name');
});

test('users can view their own playlist', function () {
    $user = User::factory()->create();
    $playlist = Playlist::factory()->for($user)->create();
    $this->actingAs($user);

    $response = $this->get(route('playlists.show', $playlist));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('tools/music-player/playlist')
        ->has('playlist')
        ->has('tracks')
        ->has('availableFiles')
    );
});

test('users cannot view another users playlist', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $playlist = Playlist::factory()->for($otherUser)->create();
    $this->actingAs($user);

    $response = $this->get(route('playlists.show', $playlist));

    $response->assertForbidden();
});

test('users can update their own playlist', function () {
    $user = User::factory()->create();
    $playlist = Playlist::factory()->for($user)->create(['name' => 'Old Name']);
    $this->actingAs($user);

    $response = $this->put(route('playlists.update', $playlist), [
        'name' => 'New Name',
        'color' => '#ff0000',
    ]);

    $response->assertRedirect();
    expect($playlist->fresh()->name)->toBe('New Name');
});

test('users cannot update another users playlist', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $playlist = Playlist::factory()->for($otherUser)->create();
    $this->actingAs($user);

    $response = $this->put(route('playlists.update', $playlist), [
        'name' => 'Hacked',
        'color' => '#ff0000',
    ]);

    $response->assertForbidden();
});

test('users can delete their own playlist', function () {
    $user = User::factory()->create();
    $playlist = Playlist::factory()->for($user)->create();
    $this->actingAs($user);

    $response = $this->delete(route('playlists.destroy', $playlist));

    $response->assertRedirect(route('music.index'));
    $this->assertDatabaseMissing('playlists', ['id' => $playlist->id]);
});

test('users cannot delete another users playlist', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $playlist = Playlist::factory()->for($otherUser)->create();
    $this->actingAs($user);

    $response = $this->delete(route('playlists.destroy', $playlist));

    $response->assertForbidden();
});

test('users can add a track to their playlist', function () {
    $user = User::factory()->create();
    $playlist = Playlist::factory()->for($user)->create();
    $file = MusicFile::factory()->for($user)->create();
    $this->actingAs($user);

    $response = $this->post(route('playlists.add-track', $playlist), [
        'music_file_id' => $file->id,
    ]);

    $response->assertRedirect();
    expect($playlist->musicFiles()->count())->toBe(1);
});

test('users can remove a track from their playlist', function () {
    $user = User::factory()->create();
    $playlist = Playlist::factory()->for($user)->create();
    $file = MusicFile::factory()->for($user)->create();
    $playlist->musicFiles()->attach($file->id, ['position' => 0]);
    $this->actingAs($user);

    $response = $this->delete(route('playlists.remove-track', [$playlist, $file]));

    $response->assertRedirect();
    expect($playlist->musicFiles()->count())->toBe(0);
});

test('users cannot add tracks to another users playlist', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $playlist = Playlist::factory()->for($otherUser)->create();
    $file = MusicFile::factory()->for($user)->create();
    $this->actingAs($user);

    $response = $this->post(route('playlists.add-track', $playlist), [
        'music_file_id' => $file->id,
    ]);

    $response->assertForbidden();
});
