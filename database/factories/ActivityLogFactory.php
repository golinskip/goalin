<?php

namespace Database\Factories;

use Domain\GoalTracker\Models\Activity;
use Domain\GoalTracker\Models\ActivityLog;
use Domain\User\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ActivityLog>
 */
class ActivityLogFactory extends Factory
{
    protected $model = ActivityLog::class;

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
