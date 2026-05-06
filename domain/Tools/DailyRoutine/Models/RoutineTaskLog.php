<?php

namespace Domain\Tools\DailyRoutine\Models;

use Database\Factories\RoutineTaskLogFactory;
use Domain\Tools\DailyRoutine\Enums\RoutineTaskStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['log_date', 'status'])]
class RoutineTaskLog extends Model
{
    /** @use HasFactory<RoutineTaskLogFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'log_date' => 'date',
            'status' => RoutineTaskStatus::class,
        ];
    }

    public function routineTask(): BelongsTo
    {
        return $this->belongsTo(RoutineTask::class);
    }
}
