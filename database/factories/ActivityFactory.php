<?php

namespace Database\Factories;

use Domain\GoalTracker\Models\Activity;
use Domain\User\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Activity>
 */
class ActivityFactory extends Factory
{
    protected $model = Activity::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $needsTimer = fake()->boolean();

        return [
            'user_id' => User::factory(),
            'name' => fake()->words(3, true),
            'description' => fake()->optional()->sentence(),
            'point_cost' => fake()->numberBetween(1, 100),
            'color' => fake()->hexColor(),
            'needs_timer' => $needsTimer,
            'duration_minutes' => $needsTimer ? fake()->numberBetween(5, 120) : null,
            'sort_order' => fake()->numberBetween(0, 100),
        ];
    }
}
