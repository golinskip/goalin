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

        $uploadMaxBytes = min(
            $this->parseSize(ini_get('upload_max_filesize') ?: '2M'),
            $this->parseSize(ini_get('post_max_size') ?: '8M'),
        );

        return Inertia::render('tools/music-player/playlist', [
            'playlist' => [
                'id' => $playlist->id,
                'name' => $playlist->name,
                'description' => $playlist->description,
                'color' => $playlist->color,
            ],
            'tracks' => $playlist->musicFiles()->with('tags')->get()->map(fn (MusicFile $file) => [
                'id' => $file->id,
                'title' => $file->title,
                'artist' => $file->artist,
                'duration_seconds' => $file->duration_seconds,
                'file_size' => $file->file_size,
                'position' => $file->pivot->position,
                'tags' => $file->tags->pluck('name')->toArray(),
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
            'maxFileSize' => $uploadMaxBytes,
            'suggestedTags' => ['timer'],
            'availableTags' => $user->tags()->pluck('name')->toArray(),
        ]);
    }

    private function parseSize(string $size): int
    {
        $unit = strtolower(substr($size, -1));
        $value = (int) $size;

        return match ($unit) {
            'g' => $value * 1024 * 1024 * 1024,
            'm' => $value * 1024 * 1024,
            'k' => $value * 1024,
            default => $value,
        };
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

        if ($playlist->musicFiles()->where('music_files.id', $validated['music_file_id'])->exists()) {
            return back();
        }

        $maxPosition = $playlist->musicFiles()->max('position') ?? -1;

        $playlist->musicFiles()->attach($validated['music_file_id'], [
            'position' => $maxPosition + 1,
        ]);

        return back();
    }

    public function removeTrack(Playlist $playlist, MusicFile $musicFile): RedirectResponse
    {
        $this->authorize('update', $playlist);

        $playlist->musicFiles()->detach($musicFile->id);

        return to_route('playlists.show', $playlist);
    }
}
