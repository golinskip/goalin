<?php

namespace Database\Factories;

use Domain\Tools\TaskMindmap\Enums\TaskStatus;
use Domain\Tools\TaskMindmap\Models\MindmapTask;
use Domain\User\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MindmapTask>
 */
class MindmapTaskFactory extends Factory
{
    protected $model = MindmapTask::class;

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
            'description' => null,
            'links' => null,
            'tags' => null,
            'color' => null,
            'icon' => null,
            'priority' => null,
            'deadline' => null,
            'status' => TaskStatus::Todo,
            'progress' => 0,
            'position' => 0,
        ];
    }

    public function done(): static
    {
        return $this->state(fn (): array => ['status' => TaskStatus::Done, 'progress' => 100]);
    }

    public function inProgress(int $progress = 50): static
    {
        return $this->state(fn (): array => ['status' => TaskStatus::InProgress, 'progress' => $progress]);
    }

    public function rejected(): static
    {
        return $this->state(fn (): array => ['status' => TaskStatus::Rejected]);
    }

    public function childOf(MindmapTask $parent): static
    {
        return $this->state(fn (): array => [
            'user_id' => $parent->user_id,
            'parent_id' => $parent->id,
        ]);
    }
}
