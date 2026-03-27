<?php

namespace Database\Factories;

use Domain\Tools\Flashcards\Models\MemoCard;
use Domain\Tools\Flashcards\Models\MemoSet;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MemoCard>
 */
class MemoCardFactory extends Factory
{
    protected $model = MemoCard::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'memo_set_id' => MemoSet::factory(),
            'front' => fake()->sentence(),
            'back' => fake()->sentence(),
            'correct_count' => 0,
            'incorrect_count' => 0,
            'last_reviewed_at' => null,
        ];
    }
}
