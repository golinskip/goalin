<?php

namespace Domain\Tools\MusicPlayer\Controllers;

use App\Http\Controllers\Controller;
use Domain\Tools\MusicPlayer\Models\MusicFile;
use Domain\Tools\MusicPlayer\Models\Playlist;
use Domain\Tools\MusicPlayer\Requests\StorePlaylistRequest;
use Domain\Tools\MusicPlayer\Requests\UpdatePlaylistRequest;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PlaylistController extends Controller
{
    use AuthorizesRequests;

    public function show(Request $request, Playlist $playlist): Response
    {
        $this->authorize('view', $playlist);

        $user = $request->user();

        return Inertia::render('tools/music-player/playlist', [
            'playlist' => [
                'id' => $playlist->id,
                'name' => $playlist->name,
                'description' => $playlist->description,
                'color' => $playlist->color,
            ],
            'tracks' => $playlist->musicFiles()->get()->map(fn (MusicFile $file) => [
                'id' => $file->id,
                'title' => $file->title,
                'artist' => $file->artist,
                'duration_seconds' => $file->duration_seconds,
                'file_size' => $file->file_size,
                'position' => $file->pivot->position,
            ]),
            'availableFiles' => $user->musicFiles()
                ->whereNotIn('id', $playlist->musicFiles()->pluck('music_files.id'))
                ->get()
                ->map(fn (MusicFile $file) => [
                    'id' => $file->id,
                    'title' => $file->title,
                    'artist' => $file->artist,
                    'duration_seconds' => $file->duration_seconds,
                ]),
        ]);
    }

    public function store(StorePlaylistRequest $request): RedirectResponse
    {
        $request->user()->playlists()->create($request->validated());

        return to_route('music.index');
    }

    public function update(UpdatePlaylistRequest $request, Playlist $playlist): RedirectResponse
    {
        $this->authorize('update', $playlist);

        $playlist->update($request->validated());

        return to_route('playlists.show', $playlist);
    }

    public function destroy(Playlist $playlist): RedirectResponse
    {
        $this->authorize('delete', $playlist);

        $playlist->delete();

        return to_route('music.index');
    }

    public function addTrack(Request $request, Playlist $playlist): RedirectResponse
    {
        $this->authorize('update', $playlist);

        $validated = $request->validate([
            'music_file_id' => ['required', 'integer', 'exists:music_files,id'],
        ]);

        $maxPosition = $playlist->musicFiles()->max('position') ?? -1;

        $playlist->musicFiles()->attach($validated['music_file_id'], [
            'position' => $maxPosition + 1,
        ]);

        return to_route('playlists.show', $playlist);
    }

    public function removeTrack(Playlist $playlist, MusicFile $musicFile): RedirectResponse
    {
        $this->authorize('update', $playlist);

        $playlist->musicFiles()->detach($musicFile->id);

        return to_route('playlists.show', $playlist);
    }
}
