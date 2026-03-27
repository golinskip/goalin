<?php

namespace Database\Factories;

use Domain\Tools\Diary\Models\DiaryEntry;
use Domain\User\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DiaryEntry>
 */
class DiaryEntryFactory extends Factory
{
    protected $model = DiaryEntry::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'entry_date' => fake()->unique()->dateTimeBetween('-30 days', 'now')->format('Y-m-d'),
            'content' => fake()->paragraphs(3, true),
        ];
    }
}
