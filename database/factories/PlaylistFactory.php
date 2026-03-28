<?php

namespace Database\Factories;

use Domain\Tools\MusicPlayer\Models\Playlist;
use Domain\User\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Playlist>
 */
class PlaylistFactory extends Factory
{
    protected $model = Playlist::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name' => fake()->sentence(2),
            'description' => fake()->optional()->sentence(),
            'color' => fake()->hexColor(),
        ];
    }
}
