<?php

namespace Database\Factories;

use Domain\Tools\LongTermGoals\Models\GoalCategory;
use Domain\User\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<GoalCategory>
 */
class GoalCategoryFactory extends Factory
{
    protected $model = GoalCategory::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name' => fake()->words(2, true),
            'color' => fake()->hexColor(),
            'sort_order' => fake()->numberBetween(0, 100),
        ];
    }
}
