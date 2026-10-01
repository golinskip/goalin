<?php

namespace Database\Factories;

use Domain\Tools\StickyNotes\Enums\StickyNoteColor;
use Domain\Tools\StickyNotes\Models\StickyNote;
use Domain\User\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<StickyNote>
 */
class StickyNoteFactory extends Factory
{
    protected $model = StickyNote::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'content' => fake()->sentence(),
            'color' => StickyNoteColor::Yellow,
            'is_important' => false,
            'reviewed_on' => today(),
            'applied_at' => null,
        ];
    }

    public function applied(): static
    {
        return $this->state(fn (): array => ['applied_at' => now()]);
    }

    public function important(): static
    {
        return $this->state(fn (): array => ['is_important' => true]);
    }

    public function notReviewedToday(): static
    {
        return $this->state(fn (): array => ['reviewed_on' => today()->subDay()]);
    }
}
