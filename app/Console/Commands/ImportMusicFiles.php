<?php

namespace App\Console\Commands;

use Domain\User\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

#[Signature('app:import-music-files {path : Directory containing audio files} {--user= : User ID (defaults to first user)}')]
#[Description('Import audio files from a local directory into the music library')]
class ImportMusicFiles extends Command
{
    private const SUPPORTED_EXTENSIONS = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'];

    private const MIME_MAP = [
        'mp3' => 'audio/mpeg',
        'wav' => 'audio/wav',
        'ogg' => 'audio/ogg',
        'flac' => 'audio/flac',
        'aac' => 'audio/aac',
        'm4a' => 'audio/mp4',
    ];

    public function handle(): int
    {
        $path = $this->argument('path');

        if (! is_dir($path)) {
            $this->error("Directory not found: {$path}");

            return self::FAILURE;
        }

        $userId = $this->option('user');
        $user = $userId ? User::find($userId) : User::first();

        if (! $user) {
            $this->error('No user found. Create a user first or pass --user=ID.');

            return self::FAILURE;
        }

        $files = $this->getAudioFiles($path);

        if (empty($files)) {
            $this->warn('No supported audio files found in: '.$path);
            $this->line('Supported formats: '.implode(', ', self::SUPPORTED_EXTENSIONS));

            return self::SUCCESS;
        }

        $this->info("Found {$this->count($files)} audio files. Importing for user: {$user->name} (ID: {$user->id})");

        $imported = 0;
        $skipped = 0;

        $bar = $this->output->createProgressBar(count($files));
        $bar->start();

        foreach ($files as $filePath) {
            $filename = basename($filePath);
            $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));

            $existing = $user->musicFiles()->where('original_filename', $filename)->exists();
            if ($existing) {
                $skipped++;
                $bar->advance();

                continue;
            }

            $storagePath = 'music/'.$user->id.'/'.uniqid().'.'.$extension;
            Storage::disk('local')->put($storagePath, file_get_contents($filePath));

            $title = $this->parseTitle(pathinfo($filename, PATHINFO_FILENAME));
            $artist = $this->parseArtist(pathinfo($filename, PATHINFO_FILENAME));

            $user->musicFiles()->create([
                'title' => $title,
                'artist' => $artist,
                'original_filename' => $filename,
                'disk_path' => $storagePath,
                'mime_type' => self::MIME_MAP[$extension] ?? 'audio/mpeg',
                'file_size' => filesize($filePath),
            ]);

            $imported++;
            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);

        $this->info("Imported: {$imported} files");
        if ($skipped > 0) {
            $this->warn("Skipped: {$skipped} files (already exist)");
        }

        return self::SUCCESS;
    }

    /** @return list<string> */
    private function getAudioFiles(string $directory): array
    {
        $files = [];

        foreach (scandir($directory) as $file) {
            if ($file === '.' || $file === '..') {
                continue;
            }

            $fullPath = $directory.DIRECTORY_SEPARATOR.$file;

            if (is_file($fullPath)) {
                $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
                if (in_array($ext, self::SUPPORTED_EXTENSIONS)) {
                    $files[] = $fullPath;
                }
            }
        }

        sort($files);

        return $files;
    }

    /**
     * Parse title from filename, handling "Artist - Title" format.
     */
    private function parseTitle(string $name): string
    {
        $name = str_replace(['_', '  '], [' ', ' '], $name);

        if (str_contains($name, ' - ')) {
            return trim(explode(' - ', $name, 2)[1]);
        }

        return trim($name);
    }

    /**
     * Parse artist from filename if in "Artist - Title" format.
     */
    private function parseArtist(string $name): ?string
    {
        $name = str_replace(['_', '  '], [' ', ' '], $name);

        if (str_contains($name, ' - ')) {
            return trim(explode(' - ', $name, 2)[0]);
        }

        return null;
    }

    private function count(array $items): int
    {
        return count($items);
    }
}
