<?php

namespace Domain\Tools\MusicPlayer\Controllers;

use App\Http\Controllers\Controller;
use Domain\Tools\MusicPlayer\Models\MusicFile;
use Domain\Tools\MusicPlayer\Requests\StoreMusicFileRequest;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MusicFileController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request): Response
    {
        $user = $request->user();

        $uploadMaxBytes = min(
            $this->parseSize(ini_get('upload_max_filesize') ?: '2M'),
            $this->parseSize(ini_get('post_max_size') ?: '8M'),
        );

        return Inertia::render('tools/music-player/index', [
            'maxFileSize' => $uploadMaxBytes,
            'musicFiles' => $user->musicFiles()->latest()->get()->map(fn (MusicFile $file) => [
                'id' => $file->id,
                'title' => $file->title,
                'artist' => $file->artist,
                'original_filename' => $file->original_filename,
                'duration_seconds' => $file->duration_seconds,
                'file_size' => $file->file_size,
                'created_at' => $file->created_at->toISOString(),
            ]),
            'playlists' => $user->playlists()->withCount('musicFiles')->latest()->get()->map(fn ($playlist) => [
                'id' => $playlist->id,
                'name' => $playlist->name,
                'description' => $playlist->description,
                'color' => $playlist->color,
                'music_files_count' => $playlist->music_files_count,
            ]),
        ]);
    }

    public function store(StoreMusicFileRequest $request): RedirectResponse
    {
        $user = $request->user();

        foreach ($request->file('files') as $file) {
            $path = $file->store('music/'.$user->id, 'local');
            $originalName = $file->getClientOriginalName();
            $title = pathinfo($originalName, PATHINFO_FILENAME);

            $user->musicFiles()->create([
                'title' => $title,
                'original_filename' => $originalName,
                'disk_path' => $path,
                'mime_type' => $file->getMimeType(),
                'file_size' => $file->getSize(),
            ]);
        }

        return to_route('music.index');
    }

    public function update(Request $request, MusicFile $musicFile): RedirectResponse
    {
        $this->authorize('update', $musicFile);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'artist' => ['nullable', 'string', 'max:255'],
        ]);

        $musicFile->update($validated);

        return to_route('music.index');
    }

    public function destroy(MusicFile $musicFile): RedirectResponse
    {
        $this->authorize('delete', $musicFile);

        Storage::disk('local')->delete($musicFile->disk_path);
        $musicFile->delete();

        return to_route('music.index');
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

    public function stream(MusicFile $musicFile): StreamedResponse
    {
        $this->authorize('view', $musicFile);

        $disk = Storage::disk('local');

        return response()->stream(function () use ($disk, $musicFile) {
            $stream = $disk->readStream($musicFile->disk_path);
            fpassthru($stream);
            fclose($stream);
        }, 200, [
            'Content-Type' => $musicFile->mime_type,
            'Content-Length' => $musicFile->file_size,
            'Accept-Ranges' => 'bytes',
        ]);
    }
}
