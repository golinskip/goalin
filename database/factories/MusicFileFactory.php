<?php

namespace Database\Factories;

use Domain\Tools\MusicPlayer\Models\MusicFile;
use Domain\User\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MusicFile>
 */
class MusicFileFactory extends Factory
{
    protected $model = MusicFile::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'title' => fake()->sentence(3),
            'artist' => fake()->name(),
            'original_filename' => fake()->word().'.mp3',
            'disk_path' => 'music/'.fake()->uuid().'.mp3',
            'mime_type' => 'audio/mpeg',
            'duration_seconds' => fake()->numberBetween(60, 600),
            'file_size' => fake()->numberBetween(1000000, 10000000),
        ];
    }
}
