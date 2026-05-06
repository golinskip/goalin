<?php

namespace Database\Factories;

use Domain\Tools\DailyRoutine\Models\RoutineTask;
use Domain\User\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<RoutineTask>
 */
class RoutineTaskFactory extends Factory
{
    protected $model = RoutineTask::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name' => fake()->sentence(2),
            'color' => fake()->randomElement(['emerald', 'sky', 'rose', 'amber', 'violet']),
            'weekdays' => [1, 2, 3, 4, 5],
            'starts_on' => now()->startOfYear()->toDateString(),
            'ends_on' => now()->endOfYear()->toDateString(),
        ];
    }
}
