<?php

namespace Database\Factories;

use App\Models\Reward;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Reward>
 */
class RewardFactory extends Factory
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
            'name' => fake()->words(3, true),
            'picture' => null,
            'cost_in_money' => fake()->randomFloat(2, 1, 500),
            'cost_in_points' => fn (array $attributes) => (int) round($attributes['cost_in_money']),
            'color' => fake()->hexColor(),
            'shop_url' => fake()->optional()->url(),
            'description' => fake()->optional()->sentence(),
            'sort_order' => fake()->numberBetween(0, 100),
        ];
    }
}
