<?php

use Domain\Tools\GoalTracker\Models\Tag;
use Domain\Tools\MusicPlayer\Models\MusicFile;
use Domain\Tools\MusicPlayer\Models\Playlist;
use Domain\User\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('music.index'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the music index', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('music.index'));
    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('tools/music-player/index')
        ->has('musicFiles')
        ->has('playlists')
    );
});

test('users can upload music files', function () {
    Storage::fake('local');
    $user = User::factory()->create();
    $this->actingAs($user);

    $file = UploadedFile::fake()->create('song.mp3', 1024, 'audio/mpeg');

    $response = $this->post(route('music.store'), [
        'files' => [$file],
    ]);

    $response->assertRedirect(route('music.index'));
    $this->assertDatabaseHas('music_files', [
        'user_id' => $user->id,
        'title' => 'song',
        'original_filename' => 'song.mp3',
    ]);
});

test('users can upload music files and assign them to a playlist', function () {
    Storage::fake('local');
    $user = User::factory()->create();
    $playlist = Playlist::factory()->for($user)->create();
    $this->actingAs($user);

    $files = [
        UploadedFile::fake()->create('track1.mp3', 1024, 'audio/mpeg'),
        UploadedFile::fake()->create('track2.mp3', 1024, 'audio/mpeg'),
    ];

    $response = $this->post(route('music.store'), [
        'files' => $files,
        'playlist_id' => $playlist->id,
    ]);

    $response->assertRedirect(route('music.index'));
    expect($playlist->musicFiles()->count())->toBe(2);
    expect($playlist->musicFiles()->orderByPivot('position')->pluck('title')->toArray())
        ->toBe(['track1', 'track2']);
});

test('upload rejects invalid file types', function () {
    Storage::fake('local');
    $user = User::factory()->create();
    $this->actingAs($user);

    $file = UploadedFile::fake()->create('document.pdf', 1024, 'application/pdf');

    $response = $this->post(route('music.store'), [
        'files' => [$file],
    ]);

    $response->assertSessionHasErrors('files.0');
});

test('users can update their own music file', function () {
    $user = User::factory()->create();
    $file = MusicFile::factory()->for($user)->create(['title' => 'Old Title']);
    $this->actingAs($user);

    $response = $this->put(route('music.update', $file), [
        'title' => 'New Title',
        'artist' => 'New Artist',
    ]);

    $response->assertRedirect(route('music.index'));
    expect($file->fresh()->title)->toBe('New Title');
    expect($file->fresh()->artist)->toBe('New Artist');
});

test('users cannot update another users music file', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $file = MusicFile::factory()->for($otherUser)->create();
    $this->actingAs($user);

    $response = $this->put(route('music.update', $file), [
        'title' => 'Hacked',
    ]);

    $response->assertForbidden();
});

test('users can delete their own music file', function () {
    Storage::fake('local');
    $user = User::factory()->create();
    $file = MusicFile::factory()->for($user)->create(['disk_path' => 'music/test.mp3']);
    Storage::disk('local')->put('music/test.mp3', 'fake content');
    $this->actingAs($user);

    $response = $this->delete(route('music.destroy', $file));

    $response->assertRedirect(route('music.index'));
    $this->assertDatabaseMissing('music_files', ['id' => $file->id]);
    Storage::disk('local')->assertMissing('music/test.mp3');
});

test('users cannot delete another users music file', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $file = MusicFile::factory()->for($otherUser)->create();
    $this->actingAs($user);

    $response = $this->delete(route('music.destroy', $file));

    $response->assertForbidden();
});

test('users can stream their own music file', function () {
    Storage::fake('local');
    $user = User::factory()->create();
    $file = MusicFile::factory()->for($user)->create([
        'disk_path' => 'music/test.mp3',
        'mime_type' => 'audio/mpeg',
    ]);
    Storage::disk('local')->put('music/test.mp3', 'fake audio content');
    $this->actingAs($user);

    $response = $this->get(route('music.stream', $file));

    $response->assertSuccessful();
    $response->assertHeader('Content-Type', 'audio/mpeg');
});

test('users cannot stream another users music file', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $file = MusicFile::factory()->for($otherUser)->create();
    $this->actingAs($user);

    $response = $this->get(route('music.stream', $file));

    $response->assertForbidden();
});

test('users can add tags when updating a music file', function () {
    $user = User::factory()->create();
    $file = MusicFile::factory()->for($user)->create(['title' => 'My Song']);
    $this->actingAs($user);

    $response = $this->put(route('music.update', $file), [
        'title' => 'My Song',
        'artist' => null,
        'tags' => ['timer', 'focus'],
    ]);

    $response->assertRedirect(route('music.index'));
    expect($file->fresh()->tags->pluck('name')->toArray())->toBe(['timer', 'focus']);
    $this->assertDatabaseHas('tags', ['user_id' => $user->id, 'name' => 'timer']);
    $this->assertDatabaseHas('tags', ['user_id' => $user->id, 'name' => 'focus']);
});

test('users can remove tags from a music file', function () {
    $user = User::factory()->create();
    $file = MusicFile::factory()->for($user)->create(['title' => 'My Song']);
    $tag = Tag::factory()->for($user)->create(['name' => 'timer']);
    $file->tags()->attach($tag);
    $this->actingAs($user);

    $response = $this->put(route('music.update', $file), [
        'title' => 'My Song',
        'tags' => [],
    ]);

    $response->assertRedirect(route('music.index'));
    expect($file->fresh()->tags)->toHaveCount(0);
});

test('music index returns tags and suggested tags', function () {
    $user = User::factory()->create();
    $file = MusicFile::factory()->for($user)->create();
    $tag = Tag::factory()->for($user)->create(['name' => 'timer']);
    $file->tags()->attach($tag);
    $this->actingAs($user);

    $response = $this->get(route('music.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('tools/music-player/index')
        ->has('suggestedTags')
        ->has('availableTags')
        ->where('musicFiles.data.0.tags', ['timer'])
    );
});

test('timer page receives music files tagged with timer', function () {
    $user = User::factory()->create();
    $activity = $user->activities()->create([
        'name' => 'Study',
        'point_cost' => 10,
        'color' => '#3a9a4e',
        'needs_timer' => true,
        'duration_minutes' => 25,
        'sort_order' => 1,
    ]);

    $timerFile = MusicFile::factory()->for($user)->create(['title' => 'Timer Music']);
    $otherFile = MusicFile::factory()->for($user)->create(['title' => 'Other Music']);
    $tag = Tag::factory()->for($user)->create(['name' => 'timer']);
    $timerFile->tags()->attach($tag);

    $this->actingAs($user);

    $response = $this->get(route('activities.timer', $activity));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('tools/goal-tracker/activities/timer')
        ->has('timerMusic', 1)
        ->where('timerMusic.0.title', 'Timer Music')
    );
});
