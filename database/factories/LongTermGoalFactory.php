<?php

namespace Database\Factories;

use Domain\Tools\LongTermGoals\Enums\GoalStatus;
use Domain\Tools\LongTermGoals\Models\GoalPeriod;
use Domain\Tools\LongTermGoals\Models\LongTermGoal;
use Domain\User\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LongTermGoal>
 */
class LongTermGoalFactory extends Factory
{
    protected $model = LongTermGoal::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'goal_period_id' => GoalPeriod::factory(),
            'goal_category_id' => null,
            'title' => fake()->sentence(4),
            'description' => fake()->optional()->paragraph(),
            'status' => GoalStatus::Pending,
            'sort_order' => fake()->numberBetween(0, 100),
        ];
    }
}
