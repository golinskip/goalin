<?php

namespace Database\Factories;

use Domain\Tools\DailyRoutine\Enums\RoutineTaskStatus;
use Domain\Tools\DailyRoutine\Models\RoutineTask;
use Domain\Tools\DailyRoutine\Models\RoutineTaskLog;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<RoutineTaskLog>
 */
class RoutineTaskLogFactory extends Factory
{
    protected $model = RoutineTaskLog::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'routine_task_id' => RoutineTask::factory(),
            'log_date' => now()->toDateString(),
            'status' => RoutineTaskStatus::Done,
        ];
    }
}
