<?php

namespace Database\Factories;

use Domain\Tools\Flashcards\Models\MemoFolder;
use Domain\User\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MemoFolder>
 */
class MemoFolderFactory extends Factory
{
    protected $model = MemoFolder::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'parent_id' => null,
            'name' => fake()->words(2, true),
            'color' => fake()->hexColor(),
        ];
    }
}
