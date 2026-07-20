<?php

namespace Database\Factories;

use Domain\Tools\DailyTodo\Models\TodoTask;
use Domain\User\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TodoTask>
 */
class TodoTaskFactory extends Factory
{
    protected $model = TodoTask::class;

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
            'title' => fake()->sentence(3),
            'due_date' => now()->toDateString(),
            'completed_at' => null,
            'position' => 0,
        ];
    }

    public function completed(): static
    {
        return $this->state(fn (): array => ['completed_at' => now()]);
    }

    public function subtaskOf(TodoTask $parent): static
    {
        return $this->state(fn (): array => [
            'user_id' => $parent->user_id,
            'parent_id' => $parent->id,
            'due_date' => null,
        ]);
    }
}
