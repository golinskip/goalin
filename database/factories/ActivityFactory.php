<?php

namespace Database\Factories;

use Domain\Tools\GoalTracker\Enums\ActivityType;
use Domain\Tools\GoalTracker\Models\Activity;
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
            'type' => ActivityType::Manual,
            'event_key' => null,
            'event_parameters' => null,
            'point_cost' => fake()->numberBetween(1, 100),
            'color' => fake()->hexColor(),
            'needs_timer' => $needsTimer,
            'duration_minutes' => $needsTimer ? fake()->numberBetween(5, 120) : null,
            'sort_order' => fake()->numberBetween(0, 100),
        ];
    }

    /**
     * @param  array<string, mixed>  $parameters
     */
    public function automated(string $eventKey, array $parameters = []): static
    {
        return $this->state(fn (): array => [
            'type' => ActivityType::Automated,
            'event_key' => $eventKey,
            'event_parameters' => $parameters,
            'needs_timer' => false,
            'duration_minutes' => null,
        ]);
    }
}
