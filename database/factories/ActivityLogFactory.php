<?php

namespace Database\Factories;

use App\Models\Activity;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ActivityLog>
 */
class ActivityLogFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'activity_id' => Activity::factory(),
            'completed_at' => fake()->dateTimeBetween('-30 days', 'now')->format('Y-m-d'),
            'quantity' => fake()->numberBetween(1, 5),
            'points_earned' => fake()->numberBetween(5, 100),
            'used_timer' => false,
            'comment' => null,
        ];
    }
}
