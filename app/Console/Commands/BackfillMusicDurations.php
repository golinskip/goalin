<?php

namespace App\Console\Commands;

use Domain\Tools\MusicPlayer\Models\MusicFile;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('app:backfill-music-durations')]
#[Description('Backfill duration_seconds for music files that are missing it')]
class BackfillMusicDurations extends Command
{
    public function handle(): int
    {
        $files = MusicFile::query()->whereNull('duration_seconds')->get();

        if ($files->isEmpty()) {
            $this->info('All music files already have durations.');

            return self::SUCCESS;
        }

        $this->info("Found {$files->count()} file(s) missing duration.");

        $updated = 0;

        foreach ($files as $file) {
            $fullPath = storage_path('app/private/'.$file->disk_path);

            if (! file_exists($fullPath)) {
                $this->warn("File not found: {$file->disk_path}");

                continue;
            }

            try {
                $getID3 = new \getID3;
                $info = $getID3->analyze($fullPath);

                if (isset($info['playtime_seconds'])) {
                    $file->update(['duration_seconds' => (int) round($info['playtime_seconds'])]);
                    $updated++;
                    $this->line("  Updated: {$file->title} ({$info['playtime_seconds']}s)");
                } else {
                    $this->warn("  No duration found for: {$file->title}");
                }
            } catch (\Throwable $e) {
                $this->error("  Error analyzing {$file->title}: {$e->getMessage()}");
            }
        }

        $this->info("Done. Updated {$updated} file(s).");

        return self::SUCCESS;
    }
}
