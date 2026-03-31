<?php

namespace Database\Factories;

use Domain\Tools\LongTermGoals\Enums\GoalPeriodType;
use Domain\Tools\LongTermGoals\Models\GoalPeriod;
use Domain\User\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<GoalPeriod>
 */
class GoalPeriodFactory extends Factory
{
    protected $model = GoalPeriod::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'type' => GoalPeriodType::Yearly,
            'year' => now()->year,
            'month' => null,
        ];
    }

    public function monthly(int $month = 1): static
    {
        return $this->state([
            'type' => GoalPeriodType::Monthly,
            'month' => $month,
        ]);
    }

    public function reviewed(): static
    {
        return $this->state([
            'review_comment' => fake()->paragraph(),
            'reviewed_at' => now(),
        ]);
    }
}
