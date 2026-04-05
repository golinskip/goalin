<?php

namespace Database\Factories;

use Domain\Tools\Games\Models\GameResult;
use Domain\User\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<GameResult>
 */
class GameResultFactory extends Factory
{
    protected $model = GameResult::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'game' => fake()->randomElement(['reflex']),
            'result' => fake()->randomFloat(2, 100, 800),
            'played_at' => fake()->dateTimeBetween('-30 days', 'now'),
        ];
    }
}
